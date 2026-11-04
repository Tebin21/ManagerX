const { contextBridge, ipcRenderer } = require('electron');

/**
 * Froshiar Desktop Secure Context Bridge
 * Exposes native desktop & hardware capabilities to the React Native Web frontend.
 */
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,

  // Window & Screen Controls
  toggleFullscreen: () => ipcRenderer.invoke('desktop:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('desktop:isFullscreen'),
  exitFullscreen: () => ipcRenderer.invoke('desktop:exitFullscreen'),
  minimize: () => ipcRenderer.invoke('desktop:minimize'),
  close: () => ipcRenderer.invoke('desktop:close'),

  // Thermal & Invoice Printing (Supports all 4 formats: 80mm, 58mm, A4, A5)
  printReceipt: (options) => ipcRenderer.invoke('desktop:printReceipt', options),
  exportPdf: (options) => ipcRenderer.invoke('desktop:exportPdf', options),
  getPrinters: () => ipcRenderer.invoke('desktop:getPrinters'),

  // Storage & Google Drive
  getAppDataPath: () => ipcRenderer.invoke('desktop:getAppDataPath'),
  openExternal: (url) => ipcRenderer.invoke('desktop:openExternal', url),
  pickLocalBackupFolder: () => ipcRenderer.invoke('desktop:pickLocalBackupFolder'),
  saveLocalBackupFile: (data, filename) => ipcRenderer.invoke('desktop:saveLocalBackupFile', { data, filename }),

  // Google Authentication on Desktop
  signInWithGoogle: () => ipcRenderer.invoke('desktop:signInWithGoogle'),
});

