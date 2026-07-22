const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let manualCheckPending = false;
let isInstallingUpdate = false;
let pendingFlushResolve = null;
let cachedStatus = null;
let lastBackgroundCheckAt = 0;
let retryTimer = null;
let manualRetryAttempts = 0;

const MAX_MANUAL_RETRIES = 2;
const TRANSIENT_RETRY_MS = 30_000;

function isTransientNetworkError(message) {
  const msg = String(message ?? '').toLowerCase();
  return (
    msg.includes('err_network_io_suspended') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network_changed') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('enetunreach') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('network request failed') ||
    msg.includes('getaddrinfo')
  );
}

function sendStatus(payload) {
  if (
    payload.type === 'available' ||
    payload.type === 'downloaded' ||
    payload.type === 'downloading' ||
    payload.type === 'progress'
  ) {
    cachedStatus = payload;
  } else if (payload.type === 'not-available' && manualCheckPending) {
    cachedStatus = null;
  }

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
    manualRetryAttempts = 0;
    sendStatus({
      type: 'available',
      version: info.version,
      currentVersion: require('electron').app.getVersion(),
    });
  });

  autoUpdater.on('update-not-available', () => {
    manualRetryAttempts = 0;
    if (manualCheckPending) {
      sendStatus({ type: 'not-available' });
    }
    manualCheckPending = false;
  });

  autoUpdater.on('error', (err) => {
    handleUpdateError(err, manualCheckPending);
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

  const INITIAL_CHECK_DELAY_MS = 15_000;
  const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

  setTimeout(() => {
    void runBackgroundCheck('initial-delay');
  }, INITIAL_CHECK_DELAY_MS);

  setInterval(() => {
    void runBackgroundCheck('periodic');
  }, PERIODIC_CHECK_MS);

  const { powerMonitor } = require('electron');
  powerMonitor.on('resume', () => {
    setTimeout(() => {
      void runBackgroundCheck('system-resume');
    }, 5000);
  });
}

function scheduleRetryCheck(reason, delayMs, manual = false) {
  if (retryTimer) clearTimeout(retryTimer);
  console.log(`[updater] retry scheduled (${reason}) in ${delayMs}ms`);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    lastBackgroundCheckAt = 0;
    void checkForUpdates(manual);
  }, delayMs);
}

function handleUpdateError(err, manual) {
  const message = err?.message ?? String(err);
  console.error('[updater]', message);

  if (isTransientNetworkError(message)) {
    if (manual && manualRetryAttempts < MAX_MANUAL_RETRIES) {
      manualRetryAttempts += 1;
      scheduleRetryCheck('manual-network-retry', 3000, true);
      return;
    }

    manualCheckPending = false;
    manualRetryAttempts = 0;

    if (manual) {
      sendStatus({
        type: 'error',
        message: 'Could not reach the update server. Check your internet connection and try again.',
      });
      return;
    }

    scheduleRetryCheck('background-network-retry', TRANSIENT_RETRY_MS, false);
    return;
  }

  manualRetryAttempts = 0;
  if (manual) {
    sendStatus({ type: 'error', message: message || 'Update failed' });
  }
  manualCheckPending = false;
}

async function runBackgroundCheck(reason) {
  const { app } = require('electron');
  if (!app.isPackaged) return;

  const now = Date.now();
  if (now - lastBackgroundCheckAt < 30_000) return;
  lastBackgroundCheckAt = now;

  console.log('[updater] background check:', reason);
  await checkForUpdates(false);
}

function onRendererReady() {
  if (cachedStatus) {
    sendStatus(cachedStatus);
  }
  void runBackgroundCheck('renderer-ready');
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
    handleUpdateError(err, manual);
    return { error: err };
  }
}

async function downloadUpdate() {
  sendStatus({ type: 'downloading' });
  try {
    return await autoUpdater.downloadUpdate();
  } catch (err) {
    const message = err?.message ?? 'Download failed';
    if (isTransientNetworkError(message)) {
      sendStatus({
        type: 'error',
        message: 'Download interrupted. Check your internet connection and try again.',
      });
    } else {
      sendStatus({ type: 'error', message });
    }
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
  const { app } = require('electron');
  if (isInstallingUpdate) return;

  isInstallingUpdate = true;
  app.isQuitting = true;

  // Let quitAndInstall close windows normally. Do not destroy windows or call
  // app.quit() here — that races with the NSIS installer and aborts the update.
  setImmediate(() => {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (err) {
      isInstallingUpdate = false;
      app.isQuitting = false;
      sendStatus({ type: 'error', message: err?.message ?? 'Install failed' });
    }
  });
}

function getIsInstallingUpdate() {
  return isInstallingUpdate;
}

module.exports = {
  setupAutoUpdater,
  onRendererReady,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  waitForRendererFlush,
  resolvePendingFlush,
  getIsInstallingUpdate,
  sendStatus,
};
