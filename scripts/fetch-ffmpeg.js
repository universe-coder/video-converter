'use strict';

/**
 * Загружает бинарник ffmpeg-static под конкретную платформу/архитектуру.
 * Нужно перед сборкой установщика под НЕ-нативную платформу, т.к. ffmpeg-static
 * хранит только один бинарник — для той машины, где выполнялся npm install.
 *
 *   node scripts/fetch-ffmpeg.js win32 x64     # ffmpeg.exe для 64-бит Windows
 *   node scripts/fetch-ffmpeg.js win32 ia32    # ffmpeg.exe для 32-бит Windows
 *   node scripts/fetch-ffmpeg.js               # нативный для текущей машины (restore)
 *
 * (ffprobe-static трогать не нужно — он уже содержит бинарники всех платформ.)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [, , platform, arch] = process.argv;

// Чистим оба возможных имени, чтобы rebuild гарантированно перекачал нужный бинарник
// (иначе при переключении x64 <-> ia32 файл ffmpeg.exe может не обновиться).
const pkgDir = path.dirname(require.resolve('ffmpeg-static'));
for (const name of ['ffmpeg', 'ffmpeg.exe']) {
  try {
    fs.rmSync(path.join(pkgDir, name), { force: true });
  } catch (_) {
    /* ignore */
  }
}

const env = { ...process.env };
if (platform) env.npm_config_platform = platform;
if (arch) env.npm_config_arch = arch;

// При запуске без аргументов (ff:restore) ориентируемся на текущую платформу.
const effPlatform = platform || process.platform;
const effArch = arch || process.arch;
const target = `${effPlatform}-${effArch}`;
console.log(`→ Загрузка ffmpeg-static для ${target}…`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// На Windows запуск .cmd-файла (npm.cmd) без shell бросает EINVAL начиная с
// Node 18.20.2 / 20.12.2 (фикс CVE-2024-27980), поэтому включаем shell.
execFileSync(npm, ['rebuild', 'ffmpeg-static'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

// Проверяем, что бинарник на месте.
const expected = path.join(pkgDir, effPlatform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
if (!fs.existsSync(expected)) {
  console.error(`✗ Ожидался бинарник ${expected}, но его нет.`);
  process.exit(1);
}
console.log(`✓ Готово: ${path.relative(process.cwd(), expected)}`);
