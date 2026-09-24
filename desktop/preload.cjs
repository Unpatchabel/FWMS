const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fwms', {
  start: () => ipcRenderer.invoke('fwms:start'),
  openDocuments: () => ipcRenderer.invoke('fwms:documents'),
});
