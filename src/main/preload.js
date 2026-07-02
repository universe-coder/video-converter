'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

/**
 * Безопасный мост между рендерером и основным процессом.
 * Рендерер не имеет прямого доступа к Node/Electron API.
 */
contextBridge.exposeInMainWorld('api', {
  selectFiles: (labels) => ipcRenderer.invoke('select-files', labels),
  probe: (filePath) => ipcRenderer.invoke('probe', filePath),
  selectOutputDir: (labels) => ipcRenderer.invoke('select-output-dir', labels),
  convert: (options) => ipcRenderer.invoke('convert', options),
  cancel: () => ipcRenderer.invoke('cancel'),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Тема для нативных диалогов и оформления окна: 'system' | 'light' | 'dark'.
  setNativeTheme: (value) => ipcRenderer.invoke('set-native-theme', value),

  // Абсолютный путь перетащенного файла (File.path удалён в новых версиях Electron).
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (_) {
      /* fallthrough */
    }
    return file && file.path ? file.path : null;
  },

  onProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('convert-progress', listener);
    return () => ipcRenderer.removeListener('convert-progress', listener);
  },
});
