import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { JSContext } from './src/services/jsContext.js';
import { MassTester } from './src/services/massTester.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let logsWindow;
let jsContext;
let moduleWatcher = null;
let currentModulePath = null;
let currentModuleName = null;
let activeMassTester = null;

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
          
          const providerType = jsContext.getModuleType(moduleName);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('module-reloaded', { module: moduleName, type: providerType });
          }
        } catch (e) {
          log(`[ERROR] Hot reload failed: ${e.message}`);
        }
      }
    });
    
    const providerType = jsContext.getModuleType(moduleName);
    log(`[SUCCESS] Module loaded: ${moduleName} (Type: ${providerType})`);
    return { success: true, module: moduleName, path: filePath, type: providerType };
  } catch (e) {
    log(`[ERROR] Failed to load module: ${e.message}`);
    return { error: e.message };
  }
});

ipcMain.handle('pick-directory', async () => {
  const settings = loadSettings();
  const dialogOptions = {
    properties: ['openDirectory']
  };
  
  if (settings.lastModuleDirectory) {
    dialogOptions.defaultPath = settings.lastModuleDirectory;
  }
  
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  
  const dirPath = result.filePaths[0];
  settings.lastModuleDirectory = dirPath;
  saveSettings(settings);
  
  log(`[INFO] Directory selected: ${dirPath}`);
  
  try {
    const tester = new MassTester(__dirname);
    const modules = await tester.scanDirectory(dirPath);
    return { success: true, path: dirPath, modules };
  } catch (err) {
    return { success: true, path: dirPath, modules: [], error: err.message };
  }
});

ipcMain.handle('run-mass-tester', async (event, dirPath, options) => {
  if (activeMassTester) {
    activeMassTester.cancel();
  }
  
  log(`[INFO] Starting mass module testing on directory: ${dirPath}`);
  activeMassTester = new MassTester(__dirname);
  
  try {
    const results = await activeMassTester.runAllTests(
      dirPath,
      options,
      (progressResults) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mass-tester-update', { type: 'progress', results: progressResults });
        }
      },
      (err, finalResults) => {
        activeMassTester = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (err) {
            log(`[ERROR] Mass tester failed: ${err.message}`);
            mainWindow.webContents.send('mass-tester-update', { type: 'error', error: err.message });
          } else {
            log(`[SUCCESS] Mass testing completed!`);
            mainWindow.webContents.send('mass-tester-update', { type: 'done', results: finalResults });
          }
        }
      }
    );
    return { success: true, results };
  } catch (err) {
    activeMassTester = null;
    log(`[ERROR] Mass tester runner exception: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('cancel-mass-tester', () => {
  if (activeMassTester) {
    log(`[INFO] Cancelling active mass tester...`);
    activeMassTester.cancel();
    activeMassTester = null;
    return { success: true };
  }
  return { success: false, message: 'No active testing running' };
});

ipcMain.handle('run-single-module-test', async (event, dirPath, folderName, customKeyword) => {
  log(`[INFO] Running single module test: ${folderName} (keyword: ${customKeyword})`);
  const tester = new MassTester(__dirname);
  try {
    const modules = await tester.scanDirectory(dirPath);
    const targetMeta = modules.find(m => m.folderName === folderName);
    if (!targetMeta) {
      throw new Error(`Module folder not found: ${folderName}`);
    }
    const result = await tester.testModule(targetMeta, null, customKeyword);
    return { success: true, result };
  } catch (err) {
    log(`[ERROR] Single module test failed for ${folderName}: ${err.message}`);
    return { error: err.message };
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

ipcMain.handle('get-module-type', (event, provider) => {
  return jsContext.getModuleType(provider);
});

ipcMain.handle('chapters', async (event, provider, url) => {
  try {
    log(`[INFO] Chapters: ${url}`);
    const result = await jsContext.chapters(provider, url);
    log(`[SUCCESS] Chapters returned successfully`);
    return result;
  } catch (e) { 
    log(`[ERROR] Chapters error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.handle('images', async (event, provider, url) => {
  try {
    log(`[INFO] Images: ${url}`);
    const result = await jsContext.images(provider, url);
    log(`[SUCCESS] Images returned ${result.length} items`);
    return result;
  } catch (e) { 
    log(`[ERROR] Images error: ${e.message}`);
    console.error(e);
    return { error: e.message }; 
  }
});

ipcMain.handle('text', async (event, provider, url) => {
  try {
    log(`[INFO] Text: ${url}`);
    const result = await jsContext.text(provider, url);
    log(`[SUCCESS] Text returned ${result.length} characters`);
    return result;
  } catch (e) { 
    log(`[ERROR] Text error: ${e.message}`);
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

ipcMain.on('open-logs', () => {
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.focus();
  } else {
    createLogsWindow();
  }
});

ipcMain.handle('play-with-mpv', (event, url, headers) => {
  try {
    log(`[INFO] Launching MPV for: ${url}`);
    const args = [url];
    if (headers && typeof headers === 'object') {
      const headerList = [];
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'user-agent') {
          args.push(`--user-agent=${value}`);
        } else if (lowerKey === 'referer' || lowerKey === 'referrer') {
          args.push(`--referrer=${value}`);
        } else {
          headerList.push(`${key}: ${value}`);
        }
      }
      if (headerList.length > 0) {
        args.push(`--http-header-fields=${headerList.join('\r\n')}`);
      }
    }
    const mpvProcess = spawn('mpv', args);
    mpvProcess.stdout.on('data', (data) => {
      log(`[MPV] ${data.toString().trim()}`);
    });
    mpvProcess.stderr.on('data', (data) => {
      log(`[MPV ERROR] ${data.toString().trim()}`);
    });
    mpvProcess.on('close', (code) => {
      log(`[INFO] MPV process exited with code ${code}`);
    });
    mpvProcess.on('error', (err) => {
      log(`[ERROR] Failed to start MPV: ${err.message}. Make sure MPV is installed and added to your system PATH.`);
    });
    return { success: true };
  } catch (e) {
    log(`[ERROR] MPV spawn error: ${e.message}`);
    return { error: e.message };
  }
});
