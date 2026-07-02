'use strict';

/**
 * Проверка ядра конвертации без графического интерфейса.
 * Генерирует тестовое видео и прогоняет его через несколько форматов.
 *   node scripts/smoke-test.js
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ffmpegPath = require('ffmpeg-static');
const { convertVideo, probeVideo } = require('../src/main/converter');

function generateSource(dest) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24:duration=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      dest,
    ];
    execFile(ffmpegPath, args, (err) => (err ? reject(err) : resolve()));
  });
}

function sizeStr(file) {
  const bytes = fs.statSync(file).size;
  return `${(bytes / 1024).toFixed(1)} КБ`;
}

function assertFile(file, label) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`✗ ${label}: файл не создан или пустой (${file})`);
  }
}

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-smoke-'));
  console.log('Рабочая папка:', tmp, '\n');

  const src = path.join(tmp, 'source.mp4');
  await generateSource(src);
  console.log('✓ Тестовое видео создано:', sizeStr(src));

  const info = await probeVideo(src);
  console.log(
    `✓ probe: ${info.width}×${info.height}, ${info.durationSec.toFixed(2)}с, ` +
      `видео=${info.videoCodec}, звук=${info.audioCodec}\n`
  );

  const common = { input: src, sourceHeight: info.height, durationSec: info.durationSec };

  const cases = [
    { format: 'webm', quality: 'low', resolution: '480', out: 'out.webm' },
    { format: 'mkv', quality: 'medium', resolution: 'original', out: 'out.mkv' },
    { format: 'avi', quality: 'low', resolution: '360', out: 'out.avi' },
    { format: 'mp3', quality: 'medium', resolution: 'original', out: 'out.mp3' },
    { format: 'm4a', quality: 'high', resolution: 'original', out: 'out.m4a' },
    { format: 'wav', quality: 'medium', resolution: 'original', out: 'out.wav' },
    { format: 'gif', quality: 'medium', resolution: 'original', out: 'out.gif' },
  ];

  for (const c of cases) {
    const output = path.join(tmp, c.out);
    let last = 0;
    await convertVideo({ ...common, output, format: c.format, quality: c.quality, resolution: c.resolution }, (p) => {
      last = p.percent;
    });
    assertFile(output, c.format);
    console.log(`✓ MP4 → ${c.format.toUpperCase().padEnd(4)}  ${sizeStr(output).padStart(9)}  (прогресс дошёл до ${Math.round(last)}%)`);
  }

  // Проверяем, что результат читается обратно.
  const back = await probeVideo(path.join(tmp, 'out.mkv'));
  console.log(`\n✓ Обратная проверка MKV: ${back.width}×${back.height}, ${back.videoCodec}`);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n✅ Все проверки ядра пройдены.');
}

run().catch((err) => {
  console.error('\n❌ Тест провален:', err.message);
  process.exit(1);
});
