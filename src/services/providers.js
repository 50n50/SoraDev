export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(name, module) {
    const animeFuncs = ['searchResults', 'extractDetails', 'extractEpisodes', 'extractStreamUrl'];
    const mangaFuncs = ['searchResults', 'extractDetails', 'extractChapters', 'extractImages'];
    const novelFuncs = ['searchResults', 'extractDetails', 'extractChapters', 'extractText'];

    const hasAnime = animeFuncs.some(fn => typeof module[fn] === 'function');
    const hasManga = mangaFuncs.some(fn => typeof module[fn] === 'function');
    const hasNovel = novelFuncs.some(fn => typeof module[fn] === 'function');

    if (!hasAnime && !hasManga && !hasNovel) {
      throw new Error(`Module "${name}" has none of the required functions`);
    }

    let type = 'anime';
    if (typeof module.extractText === 'function') {
      type = 'novel';
    } else if (typeof module.extractChapters === 'function' || typeof module.extractImages === 'function') {
      type = 'manga';
    }

    const requiredFuncs = type === 'novel' ? novelFuncs : (type === 'manga' ? mangaFuncs : animeFuncs);
    const available = requiredFuncs.filter(fn => typeof module[fn] === 'function');

    this.providers.set(name, {
      module,
      functions: available,
      type: type
    });
  }

  list() {
    return Array.from(this.providers.keys());
  }

  has(name) {
    return this.providers.has(name);
  }

  async execute(name, functionName, ...args) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not loaded`);
    }

    const provider = this.providers.get(name);
    const func = provider.module[functionName];

    if (typeof func !== 'function') {
      throw new Error(`Function "${functionName}" not found in provider "${name}"`);
    }

    return await func(...args);
  }
}

export default ProviderRegistry;
