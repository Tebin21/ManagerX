const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let localServer = null;
let serverPort = null;

// Determine if running in local development mode
const isDev = process.env.NODE_ENV === 'development';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

/**
 * Spawns an internal, offline-only HTTP static server on 127.0.0.1.
 * This guarantees that root-relative bundle paths (/_expo/..., /assets/...)
 * resolve cleanly without 404 or file:// protocol security restrictions.
 */
function startLocalServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let cleanUrl = req.url.split('?')[0];
        let reqPath = decodeURIComponent(cleanUrl);

        if (reqPath === '/' || reqPath === '') {
          reqPath = '/index.html';
        }

        let filePath = path.join(distDir, reqPath);
        const ext = path.extname(reqPath).toLowerCase();
        const isAsset = Boolean(ext && ext !== '.html');

        // If file doesn't exist directly, check for .html extension or fallback to index.html for SPA
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          if (isAsset) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found: ' + reqPath);
            return;
          }
          const potentialHtml = filePath + '.html';
          if (fs.existsSync(potentialHtml) && fs.statSync(potentialHtml).isFile()) {
            filePath = potentialHtml;
          } else {
            filePath = path.join(distDir, 'index.html');
          }
        }

        const fileExt = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[fileExt] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found: ' + reqPath);
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(data);
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error: ' + err.message);
      }
    });

    server.on('error', (err) => {
      console.error('[Server Error]', err);
      reject(err);
    });

    // Bind strictly to 127.0.0.1 (local loopback) on an ephemeral port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ port, server });
    });
  });
}

async function createWindow() {
  const bundledDist = path.join(__dirname, 'dist');
  const parentDist = path.join(__dirname, '../dist');
  const distDir = fs.existsSync(bundledDist) ? bundledDist : parentDist;

  // Start internal loopback server
  try {
    const s = await startLocalServer(distDir);
    localServer = s.server;
    serverPort = s.port;
  } catch (err) {
    console.error('Failed to start local server, fallback to file:', err);
  }

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
      webSecurity: false, // Allows cross-origin for fonts and local wasm
    },
    backgroundColor: '#0F172A',
    show: false,
  });

  // Load via internal loopback server if available, or fallback
  if (serverPort) {
    mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);
  } else {
    mainWindow.loadFile(path.join(distDir, 'index.html'));
  }

  let shown = false;
  mainWindow.once('ready-to-show', () => {
    if (!shown) {
      shown = true;
      mainWindow.show();
    }
  });

  // Safety fallback: if ready-to-show doesn't fire within 2.5 seconds, force show
  setTimeout(() => {
    if (mainWindow && !shown) {
      shown = true;
      mainWindow.show();
    }
  }, 2500);

  // Capture load failures for debugging
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[MainWindow] Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.log(`[Renderer ${level === 3 ? 'ERROR' : 'WARN'}] ${message} (${sourceId}:${line})`);
    }
  });

  // Keyboard shortcuts: F11 toggles fullscreen, Escape exits fullscreen, F12 toggles DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'Escape' && input.type === 'keyDown' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      event.preventDefault();
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (localServer) {
    try {
      localServer.close();
    } catch {}
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
