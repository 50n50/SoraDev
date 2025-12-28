import path from 'path';
import { fileURLToPath } from 'url';
import ModuleLoader from './moduleLoader.js';
import ProviderRegistry from './providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseJSON(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

export class JSContext {
  constructor(logCallback) {
    const baseDir = path.resolve(__dirname, '../../..');
    this.loader = new ModuleLoader(baseDir, logCallback);
    this.providers = new ProviderRegistry();
    this.cache = {
      search: new Map(),
      details: new Map(),
      episodes: new Map(),
      stream: new Map()
    };
  }

  async loadModulesFromDirectory(dirPath) {
    const modules = await this.loader.loadModulesFromDirectory(dirPath);
    Object.entries(modules).forEach(([name, module]) => {
      this.providers.register(name, module);
    });
    return this.getLoadedModules();
  }

  getLoadedModules() {
    return this.providers.list();
  }

  clearModules() {
    this.providers.providers.clear();
    this.cache.search.clear();
    this.cache.details.clear();
    this.cache.episodes.clear();
    this.cache.stream.clear();
  }

  async search(provider, keyword) {
    const raw = await this.providers.execute(provider, 'searchResults', keyword);
    const parsed = parseJSON(raw) || [];
    
    const results = Array.isArray(parsed) ? parsed.map(item => ({
      title: item.title || item.name || '',
      image: item.image || item.poster || '',
      href: item.href || item.url || ''
    })) : [];

    return results;
  }

  async detail(provider, url) {
    const raw = await this.providers.execute(provider, 'extractDetails', url);
    let parsed = parseJSON(raw) || {};

    if (Array.isArray(parsed)) {
      parsed = parsed[0] || {};
    }

    const details = {
      description: parsed.description || '',
      aliases: parsed.aliases || '',
      airdate: parsed.airdate || ''
    };

    return details;
  }

  async episodes(provider, url) {
    const raw = await this.providers.execute(provider, 'extractEpisodes', url);
    const parsed = parseJSON(raw) || [];

    const episodes = Array.isArray(parsed)
      ? parsed
          .map(ep => ({
            href: ep.href || ep.url || '',
            number: typeof ep.number === 'number' ? ep.number : parseInt(ep.number, 10)
          }))
          .filter(ep => ep.href && !Number.isNaN(ep.number))
      : [];

    return episodes;
  }

  async stream(provider, url) {
    const raw = await this.providers.execute(provider, 'extractStreamUrl', url);
    let parsed = parseJSON(raw);

    if (typeof raw === 'string' && typeof parsed === 'string' && !parsed.includes('{')) {
      parsed = raw;
    }

    let result;
    if (typeof parsed === 'string') {
      result = {
        type: 'direct',
        url: parsed
      };
    } else if (parsed && Array.isArray(parsed.streams)) {
      result = {
        type: 'servers',
        streams: parsed.streams || [],
        subtitle: parsed.subtitle || null
      };
    } else if (parsed && parsed.streamUrl) {
      result = {
        type: 'direct',
        url: parsed.streamUrl,
        subtitle: parsed.subtitle || null
      };
    } else {
      result = {
        type: 'none'
      };
    }

    return result;
  }

  clearCache() {
    Object.values(this.cache).forEach(map => map.clear());
  }
}

export default JSContext;
