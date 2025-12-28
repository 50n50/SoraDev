export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(name, module) {
    const requiredFuncs = ['searchResults', 'extractDetails', 'extractEpisodes', 'extractStreamUrl'];
    const available = requiredFuncs.filter(fn => typeof module[fn] === 'function');
    
    if (available.length === 0) {
      throw new Error(`Module "${name}" has none of the required functions`);
    }
    
    this.providers.set(name, {
      module,
      functions: available
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
