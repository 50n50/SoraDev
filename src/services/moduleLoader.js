import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModuleLoader {
  constructor(baseDir, logCallback) {
    this.baseDir = baseDir || process.cwd();
    this.cache = new Map();
    this.logCallback = logCallback || console.log;
  }

  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) return filePath;
    const cwdPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(cwdPath)) return cwdPath;
    return path.resolve(this.baseDir, filePath);
  }

  async loadModule(filePath) {
    const resolved = this.resolvePath(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Module not found: ${resolved}`);
    }
    
    const stats = fs.statSync(resolved);
    const moduleCode = fs.readFileSync(resolved, 'utf-8');
    console.log(`[ModuleLoader] Loading ${filePath} (modified: ${stats.mtime.toISOString()}, size: ${moduleCode.length} bytes)`);
    
    const cleanCode = moduleCode
      .replace(/export\s*\{[^}]*\}/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+(async\s+)?function/g, 'async function')
      .replace(/export\s+const/g, 'const');

    const fetchv2 = async (url, headers = {}, method = 'GET', body = null) => {
      const options = {
        method: method,
        headers: headers
      };
      if (body) {
        options.body = body;
        if (!headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }
      return fetch(url, options);
    };

    const customConsole = {
      log: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        this.logCallback(`[MODULE] ${message}`);
      },
      error: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        this.logCallback(`[MODULE ERROR] ${message}`);
      },
      warn: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        this.logCallback(`[MODULE WARN] ${message}`);
      },
      info: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        this.logCallback(`[MODULE INFO] ${message}`);
      }
    };

    const context = {
      fetch: fetch,
      fetchv2: fetchv2,
      console: customConsole,
      JSON: JSON,
      Map: Map,
      Set: Set,
      Array: Array,
      String: String,
      Number: Number,
      Promise: Promise,
      Math: Math,
      encodeURIComponent: encodeURIComponent,
      decodeURIComponent: decodeURIComponent,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval
    };

    try {
      vm.runInNewContext(cleanCode, context);

      const module = {};
      for (const key in context) {
        if (typeof context[key] === 'function' && !['fetch', 'fetchv2', 'console', 'JSON', 'Map', 'Set', 'Array', 'String', 'Number', 'Promise', 'Math', 'encodeURIComponent', 'decodeURIComponent'].includes(key)) {
          module[key] = context[key];
        }
      }

      return module;
    } catch (error) {
      throw new Error(`Failed to load module ${resolved}: ${error.message}`);
    }
  }

  async loadModulesFromDirectory(dirPath) {
    const resolved = this.resolvePath(dirPath);
    if (!fs.existsSync(resolved)) {
      console.warn(`Modules directory not found: ${resolved}`);
      return {};
    }
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
    const modules = {};
    for (const file of files) {
      try {
        const fullPath = path.join(resolved, file);
        const name = file.replace(/\.module\.js$/i, '').replace(/\.js$/i, '');
        const mod = await this.loadModule(fullPath);
        modules[name] = mod;
      } catch (error) {
        console.warn(`Failed to load module ${file}:`, error.message);
      }
    }
    return modules;
  }
}

export default ModuleLoader;
