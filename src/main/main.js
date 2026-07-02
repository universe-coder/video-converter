'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const { probeVideo, convertVideo, cancelConversion } = require('./converter');

let mainWindow = null;

const INPUT_EXTENSIONS = [
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv', 'm4v',
  'mpg', 'mpeg', '3gp', 'ts', 'mts', 'm2ts', 'ogv', 'vob', 'gif',
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 940,
    height: 760,
    minWidth: 720,
    minHeight: 620,
    title: 'Video Converter',
    backgroundColor: '#0f1115',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Минимальное меню (в основном ради стандартных Cmd+C/V/Q на macOS).
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Одно окно на приложение: повторный запуск активирует уже открытое,
// а не плодит второй процесс (который потом «зависает» для установщика).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Завершаем дочерний процесс ffmpeg вместе с приложением, чтобы не оставлять
// «висящие» процессы — именно из-за них установщик ругается при переустановке.
app.on('before-quit', () => {
  try {
    cancelConversion();
  } catch (_) {
    /* ignore */
  }
});

/* ------------------------------- IPC ------------------------------- */

ipcMain.handle('select-files', async (_e, labels = {}) => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: labels.title || 'Select videos to convert',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: labels.media || 'Video and audio', extensions: INPUT_EXTENSIONS },
      { name: labels.all || 'All files', extensions: ['*'] },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('probe', async (_e, filePath) => {
  try {
    return { ok: true, info: await probeVideo(filePath) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('select-output-dir', async (_e, labels = {}) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: labels.title || 'Destination folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('set-native-theme', (_e, value) => {
  nativeTheme.themeSource = ['light', 'dark', 'system'].includes(value) ? value : 'system';
});

ipcMain.handle('convert', async (_e, options) => {
  try {
    const { output } = await convertVideo(options, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('convert-progress', progress);
      }
    });
    return { ok: true, output };
  } catch (err) {
    if (err.message === 'CANCELED') return { ok: false, canceled: true };
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('cancel', () => cancelConversion());

ipcMain.handle('show-in-folder', (_e, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle('open-file', (_e, filePath) => {
  if (filePath) shell.openPath(filePath);
});
