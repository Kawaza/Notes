const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-event', listener);
    return () => ipcRenderer.removeListener('update-event', listener);
  },
  onQuickCapture: (callback) => {
    ipcRenderer.on('quick-capture', () => callback());
  },
});
