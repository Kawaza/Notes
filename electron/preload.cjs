const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  hasDataFile: () => ipcRenderer.invoke('has-data-file'),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-event', listener);
    return () => ipcRenderer.removeListener('update-event', listener);
  },
  onFlushSave: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('flush-save', listener);
    return () => ipcRenderer.removeListener('flush-save', listener);
  },
  notifyFlushSaveDone: () => ipcRenderer.send('flush-save-done'),
  onQuickCapture: (callback) => {
    ipcRenderer.on('quick-capture', () => callback());
  },
});
