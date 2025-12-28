import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { JSContext } from './src/services/jsContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let logsWindow;
let jsContext;
let moduleWatcher = null;
let currentModulePath = null;
let currentModuleName = null;

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {};
}

function saveSettings(settings) {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => {
    if (logsWindow && !logsWindow.isDestroyed()) {
      logsWindow.close();
    }
    mainWindow = null;
  });
}

function createLogsWindow() {
  logsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    x: 100,
    y: 100,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  logsWindow.loadFile(path.join(__dirname, 'logs.html'));
  logsWindow.on('closed', () => { logsWindow = null; });
}

async function initJSContext() {
  jsContext = new JSContext(log);
  const modulesDir = path.join(__dirname, 'modules');
  await jsContext.loadModulesFromDirectory(modulesDir);
}

app.on('ready', async () => {
  await initJSContext();
  createWindow();
  createLogsWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(logMsg);
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.webContents.send('log', logMsg);
  }
}

ipcMain.handle('get-modules', () => jsContext.getLoadedModules());

ipcMain.handle('pick-file', async () => {
  const settings = loadSettings();
  const dialogOptions = {
    properties: ['openFile'],
    filters: [
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  
  if (settings.lastModuleDirectory) {
    dialogOptions.defaultPath = settings.lastModuleDirectory;
  }
  
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  log(`[INFO] File selected: ${filePath}`);
  
  settings.lastModuleDirectory = path.dirname(filePath);
  saveSettings(settings);
  
  try {
    if (moduleWatcher) {
      moduleWatcher.close();
      moduleWatcher = null;
    }

    jsContext.clearModules();
    jsContext.clearCache();
    const moduleName = path.basename(filePath, '.js');
    const loadedModule = await jsContext.loader.loadModule(filePath);
    jsContext.providers.register(moduleName, loadedModule);
    
    currentModulePath = filePath;
    currentModuleName = moduleName;
    
    moduleWatcher = fs.watch(filePath, async (eventType) => {
      if (eventType === 'change') {
        log(`[INFO] Module file changed, reloading: ${moduleName}`);
        try {
          jsContext.clearCache();
          const reloadedModule = await jsContext.loader.loadModule(filePath);
          jsContext.providers.providers.delete(moduleName);
          jsContext.providers.register(moduleName, reloadedModule);
          log(`[SUCCESS] Module hot-reloaded: ${moduleName}`);
        } catch (e) {
          log(`[ERROR] Hot reload failed: ${e.message}`);
        }
      }
    });
    
    log(`[SUCCESS] Module loaded: ${moduleName}`);
    return { success: true, module: moduleName, path: filePath };
  } catch (e) {
    log(`[ERROR] Failed to load module: ${e.message}`);
    return { error: e.message };
  }
});

ipcMain.handle('search', async (event, provider, keyword) => {
  try {
    log(`[INFO] Search: "${keyword}" in ${provider}`);
    const result = await jsContext.search(provider, keyword);
    log(`[SUCCESS] Search returned: ${JSON.stringify(result)}`);
    return result;
  } catch (e) { 
    log(`[ERROR] Search error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.handle('detail', async (event, provider, url) => {
  try {
    log(`[INFO] Detail: ${url}`);
    const result = await jsContext.detail(provider, url);
    log(`[SUCCESS] Detail returned: ${JSON.stringify(result)}`);
    return result;
  } catch (e) { 
    log(`[ERROR] Detail error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.handle('episodes', async (event, provider, url) => {
  try {
    log(`[INFO] Episodes: ${url}`);
    const result = await jsContext.episodes(provider, url);
    log(`[SUCCESS] Episodes returned: ${JSON.stringify(result)}`);
    return result;
  } catch (e) { 
    log(`[ERROR] Episodes error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.handle('stream', async (event, provider, url) => {
  try {
    log(`[INFO] Stream: ${url}`);
    const result = await jsContext.stream(provider, url);
    log(`[SUCCESS] Stream returned: ${JSON.stringify(result)}`);
    return result;
  } catch (e) { 
    log(`[ERROR] Stream error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});
