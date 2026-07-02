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

const target = `${platform || process.platform}-${arch || process.arch}`;
console.log(`→ Загрузка ffmpeg-static для ${target}…`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['rebuild', 'ffmpeg-static'], { stdio: 'inherit', env });

// Проверяем, что бинарник на месте.
const expected = path.join(pkgDir, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
if (!fs.existsSync(expected)) {
  console.error(`✗ Ожидался бинарник ${expected}, но его нет.`);
  process.exit(1);
}
console.log(`✓ Готово: ${path.relative(process.cwd(), expected)}`);
