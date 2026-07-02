'use strict';

/*
 * Список форматов вывода. Ключи value должны совпадать с FORMATS в converter.js.
 * tech — технический ярлык (кодеки, язык-нейтральный).
 * descKey — ключ i18n для переводимого описания (добавляется через « · »).
 */
const OUTPUT_FORMATS = [
  { value: 'mp4', tech: 'MP4 · H.264 + AAC', kind: 'video' },
  { value: 'mkv', tech: 'MKV · H.264 + AAC', kind: 'video' },
  { value: 'mov', tech: 'MOV · H.264 + AAC', kind: 'video' },
  { value: 'webm', tech: 'WebM · VP9 + Opus', kind: 'video' },
  { value: 'avi', tech: 'AVI · MPEG-4 + MP3', kind: 'video' },
  { value: 'gif', tech: 'GIF', descKey: 'format_gif_desc', kind: 'gif' },
  { value: 'mp3', tech: 'MP3', descKey: 'format_mp3_desc', kind: 'audio' },
  { value: 'm4a', tech: 'M4A', descKey: 'format_m4a_desc', kind: 'audio' },
  { value: 'wav', tech: 'WAV', descKey: 'format_wav_desc', kind: 'audio' },
];

/** Собирает подпись формата с учётом текущего языка. */
function formatLabel(f) {
  return f.descKey ? `${f.tech} · ${i18n.t(f.descKey)}` : f.tech;
}

const state = {
  files: [], // { id, path, name, info, status, progress, outputPath, error, _probing }
  format: 'mp4',
  quality: 'medium',
  resolution: 'original',
  outputDir: null, // null = рядом с оригиналом
  converting: false,
  cancelRequested: false,
};

let idSeq = 0;
const nextId = () => `f${++idSeq}`;

/* ------------------------------ DOM ------------------------------ */
const dom = {
  dropzone: document.getElementById('dropzone'),
  fileList: document.getElementById('fileList'),
  format: document.getElementById('format'),
  quality: document.getElementById('quality'),
  resolution: document.getElementById('resolution'),
  outputDir: document.getElementById('outputDir'),
  chooseDir: document.getElementById('chooseDir'),
  resetDir: document.getElementById('resetDir'),
  status: document.getElementById('status'),
  convertBtn: document.getElementById('convertBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  clearBtn: document.getElementById('clearBtn'),
};

const qualitySetting = dom.quality.closest('.setting');
const resolutionSetting = dom.resolution.closest('.setting');

/* ------------------------------ Helpers ------------------------------ */
function baseName(p) {
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  const units = i18n.tRaw('size_units') || ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

function formatDuration(sec) {
  if (!sec || sec <= 0) return '';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fileMeta(file) {
  if (file.info === null) return i18n.t('meta_reading');
  if (file.info.error) return i18n.t('meta_read_error');
  const info = file.info;
  const parts = [];
  if (info.width && info.height) parts.push(`${info.width}×${info.height}`);
  const dur = formatDuration(info.durationSec);
  if (dur) parts.push(dur);
  if (info.videoCodec) parts.push(info.videoCodec.toUpperCase());
  else if (info.audioCodec) parts.push(info.audioCodec.toUpperCase());
  const size = formatBytes(info.sizeBytes);
  if (size) parts.push(size);
  return parts.join(' · ') || i18n.t('meta_media');
}

function statusLabel(file) {
  switch (file.status) {
    case 'pending':
      return i18n.t('status_pending');
    case 'converting':
      return `${Math.round(file.progress || 0)}%`;
    case 'done':
      return i18n.t('status_done');
    case 'error':
      return i18n.t('status_error');
    case 'canceled':
      return i18n.t('status_canceled');
    default:
      return '';
  }
}

/* ------------------------------ Render ------------------------------ */
function render() {
  dom.fileList.hidden = state.files.length === 0;
  dom.dropzone.classList.toggle('compact', state.files.length > 0);

  dom.fileList.innerHTML = state.files
    .map((file) => {
      const cls = ['file-card'];
      if (file.status === 'converting') cls.push('active');
      if (file.status === 'done') cls.push('done');
      if (file.status === 'error') cls.push('error');

      const statusCls = ['file-status'];
      if (file.status === 'done') statusCls.push('done');
      if (file.status === 'error') statusCls.push('error');
      if (file.status === 'converting') statusCls.push('converting');

      const openBtn =
        file.status === 'done'
          ? `<button class="link-btn" data-action="open" data-id="${file.id}">${escapeHtml(i18n.t('action_show'))}</button>`
          : '';

      const removeBtn = state.converting
        ? ''
        : `<button class="icon-btn" data-action="remove" data-id="${file.id}" title="${escapeHtml(i18n.t('action_remove'))}">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
           </button>`;

      const errorAttr = file.status === 'error' && file.error ? ` title="${escapeHtml(file.error)}"` : '';

      return `
        <div class="${cls.join(' ')}" data-id="${file.id}">
          <div class="file-main">
            <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-meta">${escapeHtml(fileMeta(file))}</div>
          </div>
          <div class="file-actions">
            ${openBtn}
            <span class="${statusCls.join(' ')}"${errorAttr}>${statusLabel(file)}</span>
            ${removeBtn}
          </div>
          <div class="progress"><div class="progress-bar" style="width:${file.progress || 0}%"></div></div>
        </div>`;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/** Быстрое обновление прогресса без полной перерисовки. */
function setProgress(id, percent) {
  const card = dom.fileList.querySelector(`.file-card[data-id="${id}"]`);
  if (!card) return;
  const bar = card.querySelector('.progress-bar');
  const status = card.querySelector('.file-status');
  if (bar) bar.style.width = `${percent}%`;
  if (status) status.textContent = `${Math.round(percent)}%`;
}

function convertibleCount() {
  return state.files.filter((f) => ['pending', 'error', 'canceled'].includes(f.status)).length;
}

function updateControls() {
  const hasFiles = state.files.length > 0;
  dom.clearBtn.hidden = !hasFiles || state.converting;
  dom.cancelBtn.hidden = !state.converting;
  dom.convertBtn.hidden = state.converting;
  dom.convertBtn.disabled = state.converting || convertibleCount() === 0;
  [dom.format, dom.quality, dom.resolution, dom.chooseDir, dom.resetDir].forEach((el) => {
    if (el) el.disabled = state.converting;
  });
}

// Текущий статус храним ключом i18n, чтобы перерисовать его при смене языка.
let statusState = null; // { key, kind, params } | null

function setStatus(key, kind, params) {
  statusState = key ? { key, kind: kind || '', params: params || null } : null;
  renderStatus();
}

function renderStatus() {
  if (!statusState) {
    dom.status.textContent = '';
    dom.status.className = 'status';
    return;
  }
  dom.status.textContent = i18n.t(statusState.key, statusState.params || undefined);
  dom.status.className = 'status' + (statusState.kind ? ` ${statusState.kind}` : '');
}

/** Обновляет подпись пути вывода (перевод или реальный путь). */
function updateOutputDirLabel() {
  if (state.outputDir) {
    dom.outputDir.textContent = state.outputDir;
    dom.outputDir.classList.add('is-path');
    dom.resetDir.hidden = false;
  } else {
    dom.outputDir.textContent = i18n.t('output_default');
    dom.outputDir.classList.remove('is-path');
    dom.resetDir.hidden = true;
  }
}

function updateSettingsVisibility() {
  const fmt = OUTPUT_FORMATS.find((f) => f.value === state.format);
  const kind = fmt ? fmt.kind : 'video';
  const showRes = kind === 'video' || kind === 'gif';
  const showQ = (kind === 'video' || kind === 'audio') && state.format !== 'wav';
  resolutionSetting.classList.toggle('hidden', !showRes);
  qualitySetting.classList.toggle('hidden', !showQ);
}

/* ------------------------------ Files ------------------------------ */
function addFiles(paths) {
  let added = 0;
  for (const p of paths) {
    if (!p || state.files.some((f) => f.path === p)) continue;
    state.files.push({ id: nextId(), path: p, name: baseName(p), info: null, status: 'pending', progress: 0 });
    added += 1;
  }
  if (added) {
    setStatus(null);
    render();
    updateControls();
  }
  // Асинхронно читаем метаданные новых файлов.
  for (const file of state.files) {
    if (file.info === null && !file._probing) {
      file._probing = true;
      window.api
        .probe(file.path)
        .then((res) => {
          file.info = res.ok ? res.info : { error: res.error };
        })
        .catch((err) => {
          file.info = { error: err.message };
        })
        .finally(() => render());
    }
  }
}

/* ------------------------------ Convert ------------------------------ */
async function startConversion() {
  const queue = state.files.filter((f) => ['pending', 'error', 'canceled'].includes(f.status));
  if (!queue.length || state.converting) return;

  state.converting = true;
  state.cancelRequested = false;
  setStatus('status_converting');
  updateControls();

  let done = 0;
  let failed = 0;

  for (const file of queue) {
    if (state.cancelRequested) {
      file.status = 'canceled';
      continue;
    }
    file.status = 'converting';
    file.progress = 0;
    render();

    const res = await window.api.convert({
      input: file.path,
      outputDir: state.outputDir,
      format: state.format,
      quality: state.quality,
      resolution: state.resolution,
      sourceHeight: file.info && !file.info.error ? file.info.height : null,
      durationSec: file.info && !file.info.error ? file.info.durationSec : 0,
    });

    if (res.ok) {
      file.status = 'done';
      file.outputPath = res.output;
      file.progress = 100;
      done += 1;
    } else if (res.canceled) {
      file.status = 'canceled';
    } else {
      file.status = 'error';
      file.error = res.error || i18n.t('error_unknown');
      failed += 1;
    }
    render();
  }

  state.converting = false;
  updateControls();

  if (state.cancelRequested) {
    setStatus('status_canceled_msg', 'error');
  } else if (failed > 0) {
    setStatus('status_result_mixed', done > 0 ? 'success' : 'error', { done, failed });
  } else if (done > 0) {
    setStatus('status_result_success', 'success', { done });
  } else {
    setStatus(null);
  }
}

async function requestCancel() {
  if (!state.converting) return;
  state.cancelRequested = true;
  setStatus('status_cancel_pending');
  await window.api.cancel();
}

/* ------------------------------ Events ------------------------------ */
function initFormatSelect() {
  dom.format.innerHTML = OUTPUT_FORMATS.map(
    (f) => `<option value="${f.value}">${escapeHtml(formatLabel(f))}</option>`
  ).join('');
  dom.format.value = state.format;
  updateSettingsVisibility();
}

dom.format.addEventListener('change', () => {
  state.format = dom.format.value;
  updateSettingsVisibility();
});
dom.quality.addEventListener('change', () => {
  state.quality = dom.quality.value;
});
dom.resolution.addEventListener('change', () => {
  state.resolution = dom.resolution.value;
});

dom.chooseDir.addEventListener('click', async () => {
  const dir = await window.api.selectOutputDir({ title: i18n.t('dialog_output_title') });
  if (dir) {
    state.outputDir = dir;
    updateOutputDirLabel();
  }
});
dom.resetDir.addEventListener('click', () => {
  state.outputDir = null;
  updateOutputDirLabel();
});

dom.convertBtn.addEventListener('click', startConversion);
dom.cancelBtn.addEventListener('click', requestCancel);
dom.clearBtn.addEventListener('click', () => {
  if (state.converting) return;
  state.files = [];
  render();
  updateControls();
  setStatus(null);
});

// Клик по списку файлов (делегирование: удалить / показать в папке).
dom.fileList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const file = state.files.find((f) => f.id === id);
  if (!file) return;
  if (action === 'remove') {
    state.files = state.files.filter((f) => f.id !== id);
    render();
    updateControls();
  } else if (action === 'open' && file.outputPath) {
    window.api.showInFolder(file.outputPath);
  }
});

// Выбор файлов через диалог.
async function openFileDialog() {
  const paths = await window.api.selectFiles({
    title: i18n.t('dialog_select_title'),
    media: i18n.t('dialog_filter_media'),
    all: i18n.t('dialog_filter_all'),
  });
  if (paths && paths.length) addFiles(paths);
}
dom.dropzone.addEventListener('click', openFileDialog);
dom.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openFileDialog();
  }
});

// Drag & drop.
['dragenter', 'dragover'].forEach((evt) =>
  dom.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dom.dropzone.classList.add('dragover');
  })
);
['dragleave', 'dragend'].forEach((evt) =>
  dom.dropzone.addEventListener(evt, () => dom.dropzone.classList.remove('dragover'))
);
dom.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.dropzone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files || []);
  const paths = files.map((f) => window.api.getPathForFile(f)).filter(Boolean);
  if (paths.length) addFiles(paths);
});

// Не даём окну открыть файл, бросив его мимо зоны.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Прогресс из основного процесса.
window.api.onProgress((data) => {
  const file = state.files.find((f) => f.path === data.input);
  if (!file || file.status !== 'converting') return;
  file.progress = data.percent;
  setProgress(file.id, data.percent);
});

/* ------------------------------ Language ------------------------------ */
function initLangSelect() {
  const sel = document.getElementById('langSelect');
  if (!sel) return;
  sel.innerHTML = i18n.langs
    .map((l) => `<option value="${l.code}">${escapeHtml(l.name)}</option>`)
    .join('');
  sel.value = i18n.getLang();
  sel.addEventListener('change', () => {
    i18n.setLang(sel.value);
    applyLanguage();
  });
}

/** Применяет текущий язык ко всем частям интерфейса (статике и динамике). */
function applyLanguage() {
  i18n.apply(); // статические строки по data-i18n
  initFormatSelect(); // подписи форматов + сохранение выбора
  render(); // карточки файлов
  updateOutputDirLabel(); // путь вывода
  renderStatus(); // текущий статус
}

/* ------------------------------ Init ------------------------------ */
i18n.init();
initLangSelect();
applyLanguage();
updateControls();
