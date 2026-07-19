const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let manualCheckPending = false;

function sendStatus(payload) {
  mainWindow?.webContents?.send('update-event', payload);
}

function setupAutoUpdater(win) {
  mainWindow = win;
  if (!require('electron').app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus({ type: 'available', version: info.version });
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Notes ${info.version} is available.`,
        detail: `You are on ${require('electron').app.getVersion()}. Download and install the update?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          sendStatus({ type: 'downloading' });
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-not-available', () => {
    sendStatus({ type: 'not-available' });
    if (manualCheckPending) {
      manualCheckPending = false;
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You have the latest version of Notes.',
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('error', (err) => {
    sendStatus({ type: 'error', message: err.message });
    if (manualCheckPending) {
      manualCheckPending = false;
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Could not check for updates.',
        detail: err.message,
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({ type: 'progress', percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ type: 'downloaded', version: info.version });
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Notes ${info.version} has been downloaded.`,
        detail: 'Restart the app to install the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  setTimeout(() => checkForUpdates(false), 5000);
}

function checkForUpdates(manual = true) {
  const { app } = require('electron');
  if (!app.isPackaged) {
    if (manual && mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Development Mode',
        message: 'Updates are only available in the installed app.',
        buttons: ['OK'],
      });
    }
    return { skipped: true, reason: 'dev' };
  }
  manualCheckPending = manual;
  return autoUpdater.checkForUpdates();
}

module.exports = { setupAutoUpdater, checkForUpdates };
