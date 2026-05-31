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
      stream: new Map(),
      chapters: new Map(),
      images: new Map(),
      text: new Map()
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

  getModuleType(provider) {
    const prov = this.providers.providers.get(provider);
    return prov ? (prov.type || 'anime') : 'anime';
  }

  clearModules() {
    this.providers.providers.clear();
    this.cache.search.clear();
    this.cache.details.clear();
    this.cache.episodes.clear();
    this.cache.stream.clear();
    this.cache.chapters.clear();
    this.cache.images.clear();
    this.cache.text.clear();
  }

  async search(provider, keyword) {
    const raw = await this.providers.execute(provider, 'searchResults', keyword);
    const parsed = parseJSON(raw) || [];
    
    const results = Array.isArray(parsed) ? parsed.map(item => ({
      title: item.title || item.name || '',
      image: item.image || item.poster || item.imageURL || '',
      href: item.href || item.url || item.id || ''
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
      aliases: parsed.aliases || (parsed.tags && Array.isArray(parsed.tags) ? parsed.tags.join(', ') : ''),
      airdate: parsed.airdate || '',
      tags: parsed.tags || []
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

  async chapters(provider, url) {
    const type = this.getModuleType(provider);
    const raw = await this.providers.execute(provider, 'extractChapters', url);
    const parsed = parseJSON(raw) || [];
    
    if (type === 'novel') {
      const results = Array.isArray(parsed) ? parsed.map(item => ({
        title: item.title || '',
        href: item.href || item.url || '',
        number: typeof item.number === 'number' ? item.number : parseInt(item.number, 10) || 0
      })) : [];
      return results;
    }

    const results = {};
    for (const [lang, chapterList] of Object.entries(parsed)) {
      if (Array.isArray(chapterList)) {
        results[lang] = chapterList.map(item => {
          if (Array.isArray(item) && item.length >= 2) {
            const chNum = item[0];
            const chArr = Array.isArray(item[1]) ? item[1] : [];
            const normalizedChArr = chArr.map(ch => ({
              id: ch.id || ch.url || '',
              title: ch.title || `Chapter ${chNum}`,
              chapter: typeof ch.chapter === 'number' ? ch.chapter : parseFloat(ch.chapter) || parseFloat(chNum) || 0,
              scanlation_group: ch.scanlation_group || ch.group || ''
            }));
            return [chNum, normalizedChArr];
          }
          return null;
        }).filter(Boolean);
      }
    }
    return results;
  }

  async images(provider, url) {
    const raw = await this.providers.execute(provider, 'extractImages', url);
    const parsed = parseJSON(raw) || [];
    return Array.isArray(parsed) ? parsed : [];
  }

  async text(provider, url) {
    const raw = await this.providers.execute(provider, 'extractText', url);
    return typeof raw === 'string' ? raw : String(raw || '');
  }

  clearCache() {
    Object.values(this.cache).forEach(map => map.clear());
  }
}

export default JSContext;
