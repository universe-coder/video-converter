'use strict';

/**
 * Собирает УНИВЕРСАЛЬНЫЙ бинарник ffmpeg (x86_64 + arm64) для macOS.
 *
 * ffmpeg-static кладёт бинарник только одной архитектуры, поэтому для
 * universal-сборки (Intel + Apple Silicon одним .app) недостаточно
 * `electron-builder --universal`: он лишь склеит то, что есть. Скачиваем обе
 * darwin-архитектуры ffmpeg и объединяем их в один fat-бинарник через `lipo`.
 *
 * (ffprobe-static уже содержит бинарники обеих архитектур и выбирает нужный по
 * process.arch в рантайме — его трогать не нужно.)
 *
 * Вызывается из npm-скрипта `dist:mac` перед `electron-builder --universal`.
 * Работает только на macOS (нужен lipo).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (process.platform !== 'darwin') {
  console.error('make-universal-ffmpeg: доступно только на macOS (нужен lipo).');
  process.exit(1);
}

const pkgDir = path.dirname(require.resolve('ffmpeg-static'));
const bin = path.join(pkgDir, 'ffmpeg');

/** Скачивает ffmpeg-static под конкретную darwin-архитектуру и возвращает путь к копии. */
function fetchArch(arch) {
  fs.rmSync(bin, { force: true });
  console.log(`→ Загрузка ffmpeg-static для darwin-${arch}…`);
  execFileSync('npm', ['rebuild', 'ffmpeg-static'], {
    stdio: 'inherit',
    env: { ...process.env, npm_config_platform: 'darwin', npm_config_arch: arch },
  });
  if (!fs.existsSync(bin)) {
    console.error(`✗ Не удалось получить ffmpeg для darwin-${arch}.`);
    process.exit(1);
  }
  const copy = path.join(pkgDir, `ffmpeg.${arch}`);
  fs.copyFileSync(bin, copy);
  return copy;
}

const x64 = fetchArch('x64');
const arm64 = fetchArch('arm64');

console.log('→ Склейка в универсальный бинарник (lipo)…');
execFileSync('lipo', ['-create', x64, arm64, '-output', bin], { stdio: 'inherit' });
execFileSync('chmod', ['755', bin]);
fs.rmSync(x64, { force: true });
fs.rmSync(arm64, { force: true });

// Проверяем, что бинарник действительно fat (обе архитектуры).
const info = execFileSync('lipo', ['-info', bin], { encoding: 'utf8' }).trim();
console.log(info);
if (!/x86_64/.test(info) || !/arm64/.test(info)) {
  console.error('✗ Ожидался универсальный бинарник (x86_64 + arm64).');
  process.exit(1);
}
console.log(`✓ Универсальный ffmpeg готов: ${path.relative(process.cwd(), bin)}`);
