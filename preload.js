const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getModules: () => ipcRenderer.invoke('get-modules'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  search: (provider, keyword) => ipcRenderer.invoke('search', provider, keyword),
  detail: (provider, url) => ipcRenderer.invoke('detail', provider, url),
  episodes: (provider, url) => ipcRenderer.invoke('episodes', provider, url),
  stream: (provider, url) => ipcRenderer.invoke('stream', provider, url),
  onLog: (callback) => ipcRenderer.on('log', (event, message) => callback(message)),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window')
});
