const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { setupAutoUpdater, onRendererReady, checkForUpdates, downloadUpdate, installUpdate, waitForRendererFlush, resolvePendingFlush, getIsInstallingUpdate } = require('./update.cjs');
const { getTrayIcon, getWindowIcon } = require('./icon-utils.cjs');

app.setName('Notes');

const isDev = !app.isPackaged;
let mainWindow;
let tray;
let brandPalette = 'default';
let brandTheme = 'light';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

function getDataPath() {
  return path.join(app.getPath('userData'), 'notes-data.json');
}

function getBackupPath() {
  return path.join(app.getPath('userData'), 'notes-data.json.bak');
}

function saveDataToDisk(data) {
  const dataPath = getDataPath();
  const tmpPath = `${dataPath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  if (fs.existsSync(dataPath)) {
    fs.copyFileSync(dataPath, getBackupPath());
  }
  fs.writeFileSync(tmpPath, json, 'utf-8');
  fs.renameSync(tmpPath, dataPath);
  return true;
}

let quitAfterFlush = false;

function requestQuitAfterFlush() {
  if (getIsInstallingUpdate()) return;
  quitAfterFlush = true;
  app.isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('flush-save');
    setTimeout(() => {
      if (quitAfterFlush && !getIsInstallingUpdate()) {
        quitAfterFlush = false;
        app.exit(0);
      }
    }, 2000);
    return;
  }
  app.exit(0);
}

function applyBrandIcons() {
  const trayIcon = getTrayIcon(brandPalette, brandTheme);
  if (tray && !trayIcon.isEmpty()) {
    tray.setImage(trayIcon);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    const windowIcon = getWindowIcon(brandPalette, brandTheme);
    if (!windowIcon.isEmpty()) {
      mainWindow.setIcon(windowIcon);
    }
  }
}

function createTrayIcon() {
  return getTrayIcon(brandPalette, brandTheme);
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function triggerQuickCapture() {
  showMainWindow();
  mainWindow?.webContents.send('quick-capture');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Notes',
    icon: getWindowIcon(brandPalette, brandTheme),
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    setupAutoUpdater(mainWindow);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith('http://localhost:')) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on('close', (e) => {
    if (getIsInstallingUpdate()) return;
    if (!app.isQuitting) {
      e.preventDefault();
      requestQuitAfterFlush();
    }
  });

  // Allow NSIS installer / auto-updater to replace the app (Squirrel.Windows / electron-updater)
  if (process.platform === 'win32') {
    process.on('message', (message) => {
      if (message === 'squirrel-firstrun') {
        app.isQuitting = true;
      }
    });
  }
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Notes');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quick Capture',
      click: triggerQuickCapture,
    },
    {
      label: 'Open Notes',
      click: showMainWindow,
    },
    {
      label: 'Check for Updates',
      click: () => checkForUpdates(true),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => requestQuitAfterFlush(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', showMainWindow);
}

ipcMain.handle('load-data', () => {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
    const backupPath = getBackupPath();
    if (fs.existsSync(backupPath)) {
      return JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    }
    return null;
  } catch (err) {
    console.error('Failed to load notes data:', err);
    return null;
  }
});

ipcMain.handle('save-data', (_event, data) => {
  try {
    return saveDataToDisk(data);
  } catch (err) {
    console.error('Failed to save notes data:', err);
    return false;
  }
});

ipcMain.on('save-data-sync', (event, data) => {
  try {
    event.returnValue = saveDataToDisk(data);
  } catch (err) {
    console.error('Failed to save notes data (sync):', err);
    event.returnValue = false;
  }
});

ipcMain.handle('has-data-file', () => {
  return fs.existsSync(getDataPath()) || fs.existsSync(getBackupPath());
});

ipcMain.handle('get-data-path', () => getDataPath());

ipcMain.on('flush-save-done', () => {
  if (resolvePendingFlush()) return;
  if (getIsInstallingUpdate()) return;
  quitAfterFlush = false;
  app.exit(0);
});

ipcMain.handle('check-for-updates', () => checkForUpdates(true));
ipcMain.handle('updater-ready', () => {
  onRendererReady();
  return { ok: true };
});
ipcMain.handle('download-update', () => downloadUpdate());
ipcMain.handle('install-update', async () => {
  if (getIsInstallingUpdate()) return { ok: false, reason: 'already-installing' };
  quitAfterFlush = false;
  await waitForRendererFlush();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  installUpdate();
  return { ok: true };
});
ipcMain.handle('set-brand-icons', (_event, { palette, theme }) => {
  if (typeof palette === 'string') brandPalette = palette;
  if (theme === 'light' || theme === 'dark') brandTheme = theme;
  applyBrandIcons();
});
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return shell.openExternal(url);
  }
  return false;
});

if (gotTheLock) {
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });

  app.on('window-all-closed', () => {
    if (getIsInstallingUpdate()) {
      // quitAndInstall owns shutdown — do not call app.quit() here.
      return;
    }
    // Keep running in tray on Windows
  });

  app.on('activate', () => {
    showMainWindow();
  });

  app.on('before-quit', (e) => {
    if (getIsInstallingUpdate()) return;
    if (app.isQuitting && !quitAfterFlush) return;
    if (quitAfterFlush) return;
    e.preventDefault();
    requestQuitAfterFlush();
  });
}
