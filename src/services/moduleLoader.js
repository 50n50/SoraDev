import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripCommentsAndStrings(code) {
  let result = '';
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let stringChar = '';

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (inLineComment) {
      if (char === '\n' || char === '\r') {
        inLineComment = false;
        result += char;
      }
    } else if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // skip '/'
      }
    } else if (inString) {
      if (char === '\\') {
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
    } else {
      if (char === '/' && nextChar === '/') {
        inLineComment = true;
        i++;
      } else if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
      } else if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
      } else {
        result += char;
      }
    }
    i++;
  }
  return result;
}

function analyzeCodeForIosIncompatibilities(code) {
  const clean = stripCommentsAndStrings(code);
  const warnings = [];

  const rules = [
    {
      pattern: /\b(document|window|DOMParser|XMLHttpRequest|localStorage|LocalStorage|location|DOM)\b/g,
      message: "No DOM/Window: absolutely no document, window, DOMParser, XMLHttpRequest, LocalStorage, or location APIs."
    },
    {
      pattern: /\b(require|import)\b/g,
      message: "No Module Imports: No require(), import, or external script loading. Code must be self-contained."
    },
    {
      pattern: /\b(setTimeout|setInterval)\b/g,
      message: "Timing: setTimeout/setInterval is not supported by default in bare iOS JavaScriptCore/QuickJS."
    },
    {
      pattern: /\b(process|Buffer)\b/g,
      message: "No Node Globals: Node.js specific globals are not supported in bare JavaScriptCore/QuickJS."
    },
    {
      pattern: /\b(fs|path|crypto|http|https|net|child_process|worker_threads|stream)\b/g,
      message: "No Node Modules: Node.js modules are not supported in bare JavaScriptCore/QuickJS."
    },
    {
      pattern: /\b(URL|URLSearchParams)\b/g,
      message: "JSCore Limits: URL / URLSearchParams may have limited support depending on iOS version."
    },
    {
      pattern: /\brequest\s*\.\s*response\b/g,
      message: "No Node http/Request Response: request.response is not supported in bare JavaScriptCore/QuickJS."
    },
    {
      pattern: /\btimeout\b/g,
      message: "Timing: timeout is not supported in bare JavaScriptCore/QuickJS."
    }
  ];

  const uniqueMessages = new Set();
  const matchedTokens = new Set();

  for (const rule of rules) {
    let match;
    rule.pattern.lastIndex = 0;
    while ((match = rule.pattern.exec(clean)) !== null) {
      const token = match[0].replace(/\s+/g, '');
      if (!matchedTokens.has(token)) {
        matchedTokens.add(token);
        if (token === 'console' && matchedTokens.has('console.log')) {
          continue;
        }
        uniqueMessages.add(`'${token}' -> ${rule.message}`);
      }
    }
  }

  const finalWarnings = Array.from(uniqueMessages);
  if (matchedTokens.has('console.log')) {
    return finalWarnings.filter(w => !w.startsWith("'console' ->"));
  }

  return finalWarnings;
}

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

    const iosWarnings = analyzeCodeForIosIncompatibilities(moduleCode);
    if (iosWarnings.length > 0) {
      this.logCallback(`[WARNING] Module "${path.basename(filePath)}" might be functional in this app, but it is using functions/APIs that are NOT supported on iOS, therefore it won't work on iOS.`);
      this.logCallback(`Detected unsupported features:`);
      iosWarnings.forEach(warn => {
        this.logCallback(`  - ${warn}`);
      });
    }

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
