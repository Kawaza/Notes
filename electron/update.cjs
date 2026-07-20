const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let manualCheckPending = false;
let isInstallingUpdate = false;
let pendingFlushResolve = null;

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
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    if (manualCheckPending) {
      sendStatus({ type: 'checking' });
    }
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
    if (manualCheckPending) {
      sendStatus({ type: 'not-available' });
    }
    manualCheckPending = false;
  });

  autoUpdater.on('error', (err) => {
    if (manualCheckPending) {
      sendStatus({ type: 'error', message: err?.message ?? 'Update failed' });
    }
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

  // Standard practice: check silently in the background, notify when an update exists.
  // User still chooses when to download and restart — no auto-install.
  const INITIAL_CHECK_DELAY_MS = 60_000;
  const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

  setTimeout(() => {
    void checkForUpdates(false);
  }, INITIAL_CHECK_DELAY_MS);

  setInterval(() => {
    void checkForUpdates(false);
  }, PERIODIC_CHECK_MS);
}

async function checkForUpdates(manual = true) {
  const { app } = require('electron');
  if (!app.isPackaged) {
    sendStatus({ type: 'dev-mode' });
    return { skipped: true, reason: 'dev' };
  }
  manualCheckPending = manual;
  try {
    return await autoUpdater.checkForUpdates();
  } catch (err) {
    sendStatus({ type: 'error', message: err?.message ?? 'Update check failed' });
    manualCheckPending = false;
    return { error: err };
  }
}

async function downloadUpdate() {
  sendStatus({ type: 'downloading' });
  try {
    return await autoUpdater.downloadUpdate();
  } catch (err) {
    sendStatus({ type: 'error', message: err?.message ?? 'Download failed' });
    throw err;
  }
}

function waitForRendererFlush(timeoutMs = 2500) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    pendingFlushResolve = () => {
      clearTimeout(timeout);
      pendingFlushResolve = null;
      resolve();
    };
    mainWindow.webContents.send('flush-save');
  });
}

function resolvePendingFlush() {
  if (pendingFlushResolve) {
    const resolve = pendingFlushResolve;
    pendingFlushResolve = null;
    resolve();
    return true;
  }
  return false;
}

function installUpdate() {
  const { app, BrowserWindow } = require('electron');
  if (isInstallingUpdate) return;

  isInstallingUpdate = true;
  app.isQuitting = true;

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.removeAllListeners('close');
      win.destroy();
    }
  }

  // Let Windows release file locks before the NSIS installer runs.
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (err) {
      isInstallingUpdate = false;
      app.isQuitting = false;
      sendStatus({ type: 'error', message: err?.message ?? 'Install failed' });
    }
  }, 1000);
}

function getIsInstallingUpdate() {
  return isInstallingUpdate;
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  waitForRendererFlush,
  resolvePendingFlush,
  getIsInstallingUpdate,
  sendStatus,
};
