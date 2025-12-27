/**
 * JSContext - Central hub for module execution
 * Mirrors the Swift JSController from Sora
 * 
 * Module functions:
 * - searchResults(keyword) -> JSON string of [{title, image, href}, ...]
 * - extractDetails(url) -> JSON string of {description, aliases, airdate}
 * - extractEpisodes(url) -> JSON string of [{href, number}, ...]
 * - extractStreamUrl(url) -> JSON string or direct URL or {streamUrl?, streams?, subtitle?}
 */

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
  constructor() {
    const baseDir = path.resolve(__dirname, '../../..');
    this.loader = new ModuleLoader(baseDir);
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

  /**
   * Execute searchResults(keyword)
   * Returns normalized array: [{title, image, href}, ...]
   */
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

  /**
   * Execute extractDetails(url)
   * Returns normalized object: {description, aliases, airdate}
   */
  /**
   * Execute extractDetails(url)
   * Returns normalized object: {description, aliases, airdate}
   */
  async detail(provider, url) {
    const raw = await this.providers.execute(provider, 'extractDetails', url);
    let parsed = parseJSON(raw) || {};

    // Handle if module returns an array (take first element)
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

  /**
   * Execute extractEpisodes(url)
   * Returns normalized array: [{href, number}, ...]
   */
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

  /**
   * Execute extractStreamUrl(url)
   * Supports multiple return formats:
   * - Direct string URL
   * - {streamUrl, subtitle?}
   * - {streams: [{title, streamUrl, headers}], subtitle?}
   */
  async stream(provider, url) {
    const raw = await this.providers.execute(provider, 'extractStreamUrl', url);
    let parsed = parseJSON(raw);

    // Fallback: if raw is a plain string and didn't parse as JSON, use it as URL
    if (typeof raw === 'string' && typeof parsed === 'string' && !parsed.includes('{')) {
      parsed = raw;
    }

    let result;
    if (typeof parsed === 'string') {
      // Direct URL
      result = {
        type: 'direct',
        url: parsed
      };
    } else if (parsed && Array.isArray(parsed.streams)) {
      // Multi-server format
      result = {
        type: 'servers',
        streams: parsed.streams || [],
        subtitle: parsed.subtitle || null
      };
    } else if (parsed && parsed.streamUrl) {
      // Single stream with subtitle support
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
