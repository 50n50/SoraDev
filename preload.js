const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getModules: () => ipcRenderer.invoke('get-modules'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  search: (provider, keyword) => ipcRenderer.invoke('search', provider, keyword),
  detail: (provider, url) => ipcRenderer.invoke('detail', provider, url),
  episodes: (provider, url) => ipcRenderer.invoke('episodes', provider, url),
  stream: (provider, url) => ipcRenderer.invoke('stream', provider, url),
  getModuleType: (provider) => ipcRenderer.invoke('get-module-type', provider),
  chapters: (provider, url) => ipcRenderer.invoke('chapters', provider, url),
  images: (provider, url) => ipcRenderer.invoke('images', provider, url),
  text: (provider, url) => ipcRenderer.invoke('text', provider, url),
  onLog: (callback) => ipcRenderer.on('log', (event, message) => callback(message)),
  onModuleReloaded: (callback) => ipcRenderer.on('module-reloaded', (event, data) => callback(data)),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window')
});
