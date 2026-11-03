const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Determine if running in local development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: true, // Starts in Fullscreen Kiosk mode as requested
    autoHideMenuBar: true,
    title: 'فرۆشیار - Froshiar POS',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#0F172A', // Froshiar dark background
    show: false,
  });

  // Load the web app
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:8081');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keyboard shortcut: F11 toggles fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─── IPC Handlers: Window Controls ───────────────────────────────────────────

ipcMain.handle('desktop:toggleFullscreen', () => {
  if (!mainWindow) return false;
  const isFull = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(isFull);
  return isFull;
});

ipcMain.handle('desktop:isFullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('desktop:exitFullscreen', () => {
  if (mainWindow && mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
  }
  return true;
});

ipcMain.handle('desktop:minimize', () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle('desktop:close', () => {
  if (mainWindow) mainWindow.close();
  return true;
});

// ─── IPC Handlers: Thermal & Receipt Printing (4 Types) ─────────────────────

ipcMain.handle('desktop:getPrinters', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('desktop:printReceipt', async (event, { html, pageSize = '80mm', silent = true, printerName }) => {
  return new Promise((resolve) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Wrap HTML with thermal / print CSS reset
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {
                margin: 0;
                size: ${pageSize === '80mm' ? '80mm auto' : pageSize === '58mm' ? '58mm auto' : pageSize};
              }
              body {
                margin: 0;
                padding: 4px;
                font-family: 'Bahij Janna', -apple-system, sans-serif;
                direction: rtl;
                -webkit-print-color-adjust: exact;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

      printWindow.webContents.on('did-finish-load', () => {
        let printOptions = {
          silent: Boolean(silent),
          printBackground: true,
          deviceName: printerName || '',
        };

        // Configure page dimensions based on the 4 supported formats
        if (pageSize === '80mm') {
          printOptions.pageSize = { width: 80000, height: 297000 };
          printOptions.margins = { marginType: 'none' };
        } else if (pageSize === '58mm') {
          printOptions.pageSize = { width: 58000, height: 297000 };
          printOptions.margins = { marginType: 'none' };
        } else if (pageSize === 'A4') {
          printOptions.pageSize = 'A4';
          printOptions.margins = { marginType: 'default' };
        } else if (pageSize === 'A5') {
          printOptions.pageSize = 'A5';
          printOptions.margins = { marginType: 'default' };
        }

        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          resolve({ success, failureReason });
        });
      });
    } catch (err) {
      resolve({ success: false, failureReason: err.message });
    }
  });
});

// ─── IPC Handlers: Storage & Google Drive Integration ────────────────────────

ipcMain.handle('desktop:getAppDataPath', () => {
  return app.getPath('userData');
});

ipcMain.handle('desktop:openExternal', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('desktop:pickLocalBackupFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'فۆڵدەری باکەپ (یان فۆڵدەری Google Drive) هەڵبژێرە',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('desktop:saveLocalBackupFile', async (event, { data, filename }) => {
  if (!mainWindow) return { success: false };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'پاشەکەوتکردنی باکەپی فرۆشیار',
    defaultPath: filename || `Froshiar_Backup_${Date.now()}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  try {
    fs.writeFileSync(result.filePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

