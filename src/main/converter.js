'use strict';

/**
 * Ядро конвертации: обёртка над FFmpeg (через fluent-ffmpeg).
 * Бинарники ffmpeg/ffprobe поставляются вместе с приложением
 * (пакеты ffmpeg-static и ffprobe-static), поэтому пользователю
 * ничего устанавливать не нужно.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Когда приложение запаковано в asar-архив, исполняемые бинарники
// лежат в распакованной папке app.asar.unpacked (см. asarUnpack в package.json).
function unpacked(p) {
  return p ? p.replace('app.asar', 'app.asar.unpacked') : p;
}

const ffmpegPath = unpacked(require('ffmpeg-static'));
const ffprobePath = unpacked(require('ffprobe-static').path);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Поддерживаемые форматы вывода.
 * kind: 'video' | 'audio' | 'gif'
 * ВАЖНО: ключи должны совпадать со списком в renderer.js (OUTPUT_FORMATS).
 */
const FORMATS = {
  mp4: { label: 'MP4 · H.264 + AAC', ext: 'mp4', container: 'mp4', kind: 'video', vcodec: 'libx264', acodec: 'aac' },
  mkv: { label: 'MKV · H.264 + AAC', ext: 'mkv', container: 'matroska', kind: 'video', vcodec: 'libx264', acodec: 'aac' },
  mov: { label: 'MOV · H.264 + AAC', ext: 'mov', container: 'mov', kind: 'video', vcodec: 'libx264', acodec: 'aac' },
  webm: { label: 'WebM · VP9 + Opus', ext: 'webm', container: 'webm', kind: 'video', vcodec: 'libvpx-vp9', acodec: 'libopus' },
  avi: { label: 'AVI · MPEG-4 + MP3', ext: 'avi', container: 'avi', kind: 'video', vcodec: 'mpeg4', acodec: 'libmp3lame' },
  gif: { label: 'GIF · анимация', ext: 'gif', container: 'gif', kind: 'gif' },
  mp3: { label: 'MP3 · только звук', ext: 'mp3', container: 'mp3', kind: 'audio', acodec: 'libmp3lame' },
  m4a: { label: 'M4A · звук AAC', ext: 'm4a', container: 'ipod', kind: 'audio', acodec: 'aac' },
  wav: { label: 'WAV · звук без сжатия', ext: 'wav', container: 'wav', kind: 'audio', acodec: 'pcm_s16le' },
};

// Пресеты качества. crf — для x264/x265/vp9, qscale — для mpeg4, audioBitrate — для звука.
const QUALITY = {
  high: { crf: 18, qscale: 3, audioBitrate: '256k' },
  medium: { crf: 23, qscale: 6, audioBitrate: '192k' },
  low: { crf: 28, qscale: 12, audioBitrate: '128k' },
};

// Целевая высота кадра (ширина считается автоматически с сохранением пропорций).
const RESOLUTIONS = {
  original: null,
  '2160': 2160,
  '1440': 1440,
  '1080': 1080,
  '720': 720,
  '480': 480,
  '360': 360,
};

let currentCommand = null;
let canceled = false;

/** "00:01:23.45" -> 83.45 (секунды). */
function timemarkToSeconds(tm) {
  if (!tm || typeof tm !== 'string') return 0;
  const parts = tm.split(':');
  if (parts.length !== 3) return 0;
  const h = parseFloat(parts[0]) || 0;
  const m = parseFloat(parts[1]) || 0;
  const s = parseFloat(parts[2]) || 0;
  return h * 3600 + m * 60 + s;
}

/** "30000/1001" -> 29.97 */
function parseFps(rate) {
  if (!rate || typeof rate !== 'string') return null;
  const [num, den] = rate.split('/').map(Number);
  if (!den) return num || null;
  const fps = num / den;
  return Number.isFinite(fps) ? Math.round(fps * 100) / 100 : null;
}

/** Достаёт короткое человекочитаемое сообщение об ошибке из вывода ffmpeg. */
function friendlyError(err, stderr) {
  const raw = (stderr || err.message || '').trim();
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || err.message || 'Неизвестная ошибка FFmpeg';
  return last.slice(0, 300);
}

/**
 * Подбирает имя выходного файла, не затирая исходник и уже существующие файлы.
 */
function buildOutputPath(input, outputDir, ext) {
  const dir = outputDir || path.dirname(input);
  const base = path.basename(input, path.extname(input));
  let candidate = path.join(dir, `${base}.${ext}`);
  let i = 1;
  while (candidate.toLowerCase() === input.toLowerCase() || fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${i}).${ext}`);
    i += 1;
  }
  return candidate;
}

/**
 * Читает метаданные файла (длительность, разрешение, кодеки и т.д.).
 * @returns {Promise<object>}
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const streams = metadata.streams || [];
      const v = streams.find((s) => s.codec_type === 'video');
      const a = streams.find((s) => s.codec_type === 'audio');
      const format = metadata.format || {};
      resolve({
        durationSec: Number(format.duration) || (v && Number(v.duration)) || 0,
        sizeBytes: Number(format.size) || 0,
        width: v ? v.width : null,
        height: v ? v.height : null,
        videoCodec: v ? v.codec_name : null,
        audioCodec: a ? a.codec_name : null,
        fps: v ? parseFps(v.r_frame_rate) : null,
        formatName: format.format_name || null,
        hasVideo: !!v,
        hasAudio: !!a,
      });
    });
  });
}

/**
 * Конвертирует один файл.
 * @param {object} options { input, outputDir, format, quality, resolution, sourceHeight, durationSec, fps }
 * @param {(p:object)=>void} onProgress колбэк прогресса
 * @returns {Promise<{output:string}>}
 */
function convertVideo(options, onProgress) {
  return new Promise((resolve, reject) => {
    const fmt = FORMATS[options.format];
    if (!fmt) return reject(new Error('Неизвестный формат: ' + options.format));

    const output = options.output || buildOutputPath(options.input, options.outputDir, fmt.ext);
    const quality = QUALITY[options.quality] || QUALITY.medium;
    const durationSec = Number(options.durationSec) || 0;

    canceled = false;
    const command = ffmpeg(options.input);

    if (fmt.kind === 'audio') {
      command.noVideo().audioCodec(fmt.acodec);
      if (fmt.acodec !== 'pcm_s16le') command.audioBitrate(quality.audioBitrate);
      command.format(fmt.container);
    } else if (fmt.kind === 'gif') {
      const fps = Number(options.fps) || 12;
      const target = RESOLUTIONS[options.resolution] || 480;
      const height = options.sourceHeight && options.sourceHeight < target ? options.sourceHeight : target;
      command
        .noAudio()
        .outputOptions(['-vf', `fps=${fps},scale=-2:${height}:flags=lanczos`])
        .format('gif');
    } else {
      command.videoCodec(fmt.vcodec).audioCodec(fmt.acodec).audioBitrate(quality.audioBitrate);

      const target = RESOLUTIONS[options.resolution];
      if (target && options.sourceHeight && options.sourceHeight > target) {
        // -2 сохраняет пропорции и делает ширину кратной 2 (требование кодеков).
        command.videoFilters(`scale=-2:${target}`);
      }

      if (fmt.vcodec === 'libx264' || fmt.vcodec === 'libx265') {
        command.outputOptions(['-crf', String(quality.crf), '-preset', 'medium', '-pix_fmt', 'yuv420p']);
      } else if (fmt.vcodec === 'libvpx-vp9') {
        command.outputOptions(['-crf', String(quality.crf), '-b:v', '0', '-row-mt', '1']);
      } else if (fmt.vcodec === 'mpeg4') {
        command.outputOptions(['-q:v', String(quality.qscale)]);
      }

      if (fmt.container === 'mp4' || fmt.container === 'mov') {
        command.outputOptions(['-movflags', '+faststart']);
      }
      command.format(fmt.container);
    }

    command
      .on('progress', (p) => {
        let percent = 0;
        if (durationSec > 0 && p.timemark) {
          percent = (timemarkToSeconds(p.timemark) / durationSec) * 100;
        } else if (typeof p.percent === 'number' && !Number.isNaN(p.percent)) {
          percent = p.percent;
        }
        percent = Math.max(0, Math.min(99.5, percent));
        if (typeof onProgress === 'function') {
          onProgress({
            input: options.input,
            percent,
            timemark: p.timemark || null,
            fps: p.currentFps || null,
          });
        }
      })
      .on('end', () => {
        currentCommand = null;
        resolve({ output });
      })
      .on('error', (err, _stdout, stderr) => {
        const wasCanceled = canceled;
        currentCommand = null;
        // Частично записанный файл бесполезен — удаляем.
        fs.promises.unlink(output).catch(() => {});
        if (wasCanceled) return reject(new Error('CANCELED'));
        return reject(new Error(friendlyError(err, stderr)));
      })
      .save(output);

    currentCommand = command;
  });
}

/** Прерывает текущую конвертацию. */
function cancelConversion() {
  if (currentCommand) {
    canceled = true;
    try {
      currentCommand.kill('SIGKILL');
    } catch (_) {
      /* ignore */
    }
    currentCommand = null;
    return true;
  }
  return false;
}

module.exports = {
  FORMATS,
  QUALITY,
  RESOLUTIONS,
  probeVideo,
  convertVideo,
  cancelConversion,
  buildOutputPath,
};
