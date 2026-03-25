/**
 * Electron main process — ARK Dino Color Visualizer
 *
 * Starts the Express backend server, then opens a native BrowserWindow.
 * Supports system tray, minimize-to-tray, and auto-launch on startup.
 */

const { app, BrowserWindow, Tray, Menu, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const ROOT  = isDev
  ? path.join(__dirname, '..')
  : path.join(process.resourcesPath, '..');

const BACKEND_ENTRY = isDev
  ? path.join(__dirname, '..', 'backend', 'server.js')
  : path.join(process.resourcesPath, 'backend', 'server.js');

const PORT = 3001;

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow  = null;
let tray        = null;
let serverReady = false;
let serverProc  = null;

// ── Start Express backend in a child process ──────────────────────────────────
function startBackend() {
  return new Promise((resolve) => {
    serverProc = fork(BACKEND_ENTRY, [], {
      env: { ...process.env, PORT: String(PORT), ELECTRON: '1' },
      silent: false,
    });

    serverProc.on('message', (msg) => {
      if (msg === 'ready') resolve();
    });

    // Fallback: assume ready after 3 seconds even without explicit signal
    setTimeout(resolve, 3000);

    serverProc.on('exit', (code) => {
      if (code !== 0 && mainWindow) {
        dialog.showErrorBox(
          'Server Error',
          'The backend server stopped unexpectedly. Please restart the app.'
        );
      }
    });
  });
}

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'ARK Dino Color Visualizer',
    backgroundColor: '#0d0f1a',
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app — retry until server is ready
  async function loadWithRetry(attempts = 10) {
    try {
      await mainWindow.loadURL(`http://localhost:${PORT}`);
    } catch {
      if (attempts > 0) {
        setTimeout(() => loadWithRetry(attempts - 1), 500);
      }
    }
  }
  loadWithRetry();

  // Show once loaded (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      tray?.displayBalloon?.({
        title: 'ARK Dino Visualizer',
        content: 'Still running in the system tray.',
        iconType: 'info',
      });
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── System tray ───────────────────────────────────────────────────────────────
function createTray() {
  // Use a simple colored icon; replace icon.ico with a real one if available
  const iconPath = path.join(__dirname, 'icon.ico');
  const icon = require('fs').existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('ARK Dino Color Visualizer');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open ARK Dino Visualizer',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createWindow();
      },
    },
    {
      label: 'Open in Browser',
      click: () => shell.openExternal(`http://localhost:${PORT}`),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        serverProc?.kill();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createWindow();
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

app.whenReady().then(async () => {
  // Start the Express backend first
  await startBackend();

  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS; on Windows keep running in tray
  if (process.platform !== 'darwin') {
    // Stay in tray — don't call app.quit()
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  serverProc?.kill();
});
