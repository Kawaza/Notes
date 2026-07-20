const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let manualCheckPending = false;
let isInstallingUpdate = false;

function sendStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-event', payload);
  }
}

function setupAutoUpdater(win) {
  mainWindow = win;
  if (!require('electron').app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    manualCheckPending = false;
    sendStatus({
      type: 'available',
      version: info.version,
      currentVersion: require('electron').app.getVersion(),
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendStatus({ type: 'not-available' });
    manualCheckPending = false;
  });

  autoUpdater.on('error', (err) => {
    sendStatus({ type: 'error', message: err.message });
    manualCheckPending = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({
      type: 'progress',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ type: 'downloaded', version: info.version });
  });

  setTimeout(() => checkForUpdates(false), 8000);
}

function checkForUpdates(manual = true) {
  const { app } = require('electron');
  if (!app.isPackaged) {
    sendStatus({ type: 'dev-mode' });
    return { skipped: true, reason: 'dev' };
  }
  manualCheckPending = manual;
  return autoUpdater.checkForUpdates();
}

function downloadUpdate() {
  sendStatus({ type: 'downloading' });
  return autoUpdater.downloadUpdate();
}

function installUpdate() {
  const { app } = require('electron');
  isInstallingUpdate = true;
  app.isQuitting = true;
  autoUpdater.quitAndInstall(true, true);
}

function getIsInstallingUpdate() {
  return isInstallingUpdate;
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getIsInstallingUpdate,
};
