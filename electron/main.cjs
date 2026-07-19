const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { setupAutoUpdater, checkForUpdates } = require('./update.cjs');

const isDev = !app.isPackaged;
let mainWindow;
let tray;

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

function createTrayIcon() {
  const size = 16;
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
      <rect width="16" height="16" rx="3" fill="#6366f1"/>
      <path d="M4 4h8v1.5H4V4zm0 3h8v1.5H4V7zm0 3h5v1.5H4V10z" fill="white"/>
    </svg>
  `;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`
  );
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

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
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
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
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
    return null;
  } catch {
    return null;
  }
});

ipcMain.handle('save-data', (_event, data) => {
  try {
    const dataPath = getDataPath();
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('check-for-updates', () => checkForUpdates(true));
ipcMain.handle('get-app-version', () => app.getVersion());

if (gotTheLock) {
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });

  app.on('window-all-closed', () => {
    // Keep running in tray on Windows
  });

  app.on('activate', () => {
    showMainWindow();
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
}
