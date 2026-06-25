import fs from 'fs';
import path from 'path';
import ModuleLoader from './moduleLoader.js';

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

export class MassTester {
  constructor(baseDir) {
    this.baseDir = baseDir || process.cwd();
    this.isCancelled = false;
  }

  cancel() {
    this.isCancelled = true;
  }

  async scanDirectory(dirPath) {
    const resolved = path.resolve(this.baseDir, dirPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory does not exist: ${resolved}`);
    }

    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolved}`);
    }

    const subdirs = fs.readdirSync(resolved).filter(file => {
      const fullPath = path.join(resolved, file);
      return fs.statSync(fullPath).isDirectory() && !file.startsWith('.');
    });

    const modules = [];

    for (const subdir of subdirs) {
      const folderPath = path.join(resolved, subdir);
      const files = fs.readdirSync(folderPath);

      const jsFile = files.find(f => f.endsWith('.js'));
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (jsFile && jsonFile) {
        const jsonPath = path.join(folderPath, jsonFile);
        const jsPath = path.join(folderPath, jsFile);

        try {
          const manifestContent = fs.readFileSync(jsonPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          modules.push({
            name: manifest.sourceName || subdir,
            folderName: subdir,
            jsPath,
            jsonPath,
            manifest,
            type: (manifest.type || 'anime').toLowerCase().trim()
          });
        } catch (err) {
          modules.push({
            name: subdir,
            folderName: subdir,
            jsPath,
            jsonPath,
            manifest: null,
            type: 'unknown',
            error: `Failed to load/parse manifest: ${err.message}`
          });
        }
      } else {
        modules.push({
          name: subdir,
          folderName: subdir,
          jsPath: jsFile ? path.join(folderPath, jsFile) : null,
          jsonPath: jsonFile ? path.join(folderPath, jsonFile) : null,
          manifest: null,
          type: 'unknown',
          error: `Missing ${!jsFile ? '.js' : ''}${!jsFile && !jsonFile ? ' and ' : ''}${!jsonFile ? '.json' : ''} file`
        });
      }
    }

    return modules;
  }

  async testModule(moduleMeta, onStepUpdate, customKeyword) {
    const result = {
      name: moduleMeta.name,
      folderName: moduleMeta.folderName,
      type: moduleMeta.type,
      status: 'running',
      errorStep: null,
      errorMessage: null,
      durationMs: 0,
      logs: [],
      streamData: null,
      steps: {
        load: { status: 'pending' },
        search: { status: 'pending' },
        detail: { status: 'pending' },
        episodes: { status: 'pending' },
        stream: { status: 'pending' }
      }
    };

    const startTime = Date.now();
    const addLog = (msg) => {
      const timestamp = new Date().toLocaleTimeString();
      result.logs.push(`[${timestamp}] ${msg}`);
    };

    const updateStepStatus = (stepName, status, extra = {}) => {
      result.steps[stepName] = { status, ...extra };
      if (onStepUpdate) {
        onStepUpdate(result);
      }
    };

    try {
      updateStepStatus('load', 'running');
      if (moduleMeta.error) {
        throw { step: 'load', message: moduleMeta.error };
      }

      addLog(`Loading module from: ${moduleMeta.jsPath}`);
      const loader = new ModuleLoader(this.baseDir, (msg) => addLog(msg));
      let moduleInstance;
      try {
        moduleInstance = await loader.loadModule(moduleMeta.jsPath);
      } catch (err) {
        throw { step: 'load', message: `Load Compilation Error: ${err.message}` };
      }

      const mType = moduleMeta.type;
      const required = [];
      if (['anime', 'movies', 'tv shows', 'movie', 'tv show'].includes(mType)) {
        required.push('searchResults', 'extractDetails', 'extractEpisodes', 'extractStreamUrl');
      } else if (['manga', 'mangas'].includes(mType)) {
        required.push('searchResults', 'extractDetails', 'extractChapters', 'extractImages');
      } else if (['novel', 'novels'].includes(mType)) {
        required.push('searchResults', 'extractDetails', 'extractChapters', 'extractText');
      } else {
        throw { step: 'load', message: `Unknown module type in manifest: "${mType}"` };
      }

      const missing = required.filter(fn => typeof moduleInstance[fn] !== 'function');
      if (missing.length > 0) {
        throw { step: 'load', message: `Missing required interface functions: ${missing.join(', ')}` };
      }

      updateStepStatus('load', 'passed');
      addLog(`Load check passed. Interface matches "${mType}" type.`);

      updateStepStatus('search', 'running');
      let searchKeyword = customKeyword;
      if (!searchKeyword) {
        searchKeyword = 'one piece';
        if (['manga', 'mangas'].includes(mType)) searchKeyword = 'frieren';
        else if (['novel', 'novels'].includes(mType)) searchKeyword = 'the';
        else if (['movies', 'movie'].includes(mType)) searchKeyword = 'interstellar';
        else if (['tv shows', 'tv show'].includes(mType)) searchKeyword = 'breaking bad';
      }

      addLog(`Running search for keyword: "${searchKeyword}"`);
      let searchRaw;
      try {
        searchRaw = await moduleInstance.searchResults(searchKeyword);
      } catch (err) {
        throw { step: 'search', message: `searchResults runtime exception: ${err.message}` };
      }

      let searchResults = parseJSON(searchRaw);
      if (!Array.isArray(searchResults)) {
        throw { step: 'search', message: `searchResults returned invalid format (expected array, got ${typeof searchResults})` };
      }
      if (searchResults.length === 0) {
        throw { step: 'search', message: `searchResults returned an empty list of results` };
      }

      const firstItem = searchResults[0];
      addLog(`Search check passed. Found ${searchResults.length} items. First item: "${firstItem.title || firstItem.name || 'No Title'}"`);

      const hasHref = firstItem.href || firstItem.url || firstItem.id;
      if (!hasHref) {
        throw { step: 'search', message: `First search result is missing link/identifier (href, url or id)` };
      }

      updateStepStatus('search', 'passed', { query: searchKeyword, resultCount: searchResults.length });

      updateStepStatus('detail', 'running');
      const targetId = firstItem.href || firstItem.url || firstItem.id;
      addLog(`Fetching details for target: "${targetId}"`);

      let detailRaw;
      try {
        detailRaw = await moduleInstance.extractDetails(targetId);
      } catch (err) {
        throw { step: 'detail', message: `extractDetails runtime exception: ${err.message}` };
      }

      let detailParsed = parseJSON(detailRaw);
      if (Array.isArray(detailParsed)) {
        detailParsed = detailParsed[0];
      }

      if (!detailParsed || typeof detailParsed !== 'object') {
        throw { step: 'detail', message: `extractDetails returned invalid format (expected object)` };
      }

      addLog(`Details check passed. Description length: ${detailParsed.description ? detailParsed.description.length : 0} chars.`);
      updateStepStatus('detail', 'passed');

      updateStepStatus('episodes', 'running');
      let firstEpOrCh = null;

      if (['anime', 'movies', 'tv shows', 'movie', 'tv show'].includes(mType)) {
        addLog(`Fetching episodes for: "${targetId}"`);
        let epRaw;
        try {
          epRaw = await moduleInstance.extractEpisodes(targetId);
        } catch (err) {
          throw { step: 'episodes', message: `extractEpisodes runtime exception: ${err.message}` };
        }

        const episodesList = parseJSON(epRaw);
        if (!Array.isArray(episodesList)) {
          throw { step: 'episodes', message: `extractEpisodes returned invalid format (expected array)` };
        }
        if (episodesList.length === 0) {
          throw { step: 'episodes', message: `extractEpisodes returned empty episodes list` };
        }

        firstEpOrCh = episodesList[0];
        const epHref = firstEpOrCh.href || firstEpOrCh.url;
        if (!epHref) {
          throw { step: 'episodes', message: `First episode is missing link (href or url)` };
        }
        addLog(`Episodes check passed. Found ${episodesList.length} episodes. First episode: ep ${firstEpOrCh.number || 'unknown'}`);
        updateStepStatus('episodes', 'passed', { resultCount: episodesList.length });

      } else if (['manga', 'mangas'].includes(mType)) {
        addLog(`Fetching chapters for: "${targetId}"`);
        let chaptersData;
        try {
          chaptersData = await moduleInstance.extractChapters(targetId);
        } catch (err) {
          throw { step: 'episodes', message: `extractChapters runtime exception: ${err.message}` };
        }

        const parsedCh = parseJSON(chaptersData);
        if (!parsedCh || typeof parsedCh !== 'object') {
          throw { step: 'episodes', message: `extractChapters returned invalid format (expected languages object)` };
        }

        const languages = Object.keys(parsedCh);
        if (languages.length === 0) {
          throw { step: 'episodes', message: `extractChapters returned object with no languages` };
        }

        let chapterRelease = null;
        for (const lang of languages) {
          const list = parsedCh[lang];
          if (Array.isArray(list) && list.length > 0) {
            const firstChGroup = list[0];
            if (Array.isArray(firstChGroup) && firstChGroup.length >= 2) {
              const releases = firstChGroup[1];
              if (Array.isArray(releases) && releases.length > 0) {
                chapterRelease = releases[0];
                break;
              }
            }
          }
        }

        if (!chapterRelease || (!chapterRelease.id && !chapterRelease.url)) {
          throw { step: 'episodes', message: `Failed to find a valid chapter release with an ID/URL` };
        }

        firstEpOrCh = chapterRelease;
        addLog(`Chapters check passed. Found languages: [${languages.join(', ')}]. First chapter ID: "${firstEpOrCh.id || firstEpOrCh.url}"`);
        updateStepStatus('episodes', 'passed', { resultCount: languages.length });

      } else if (['novel', 'novels'].includes(mType)) {
        addLog(`Fetching chapters for: "${targetId}"`);
        let chRaw;
        try {
          chRaw = await moduleInstance.extractChapters(targetId);
        } catch (err) {
          throw { step: 'episodes', message: `extractChapters runtime exception: ${err.message}` };
        }

        const chaptersList = parseJSON(chRaw);
        if (!Array.isArray(chaptersList)) {
          throw { step: 'episodes', message: `extractChapters returned invalid format (expected array)` };
        }
        if (chaptersList.length === 0) {
          throw { step: 'episodes', message: `extractChapters returned empty chapters list` };
        }

        firstEpOrCh = chaptersList[0];
        const chHref = firstEpOrCh.href || firstEpOrCh.url;
        if (!chHref) {
          throw { step: 'episodes', message: `First chapter is missing link (href or url)` };
        }
        addLog(`Chapters check passed. Found ${chaptersList.length} chapters. First chapter: "${firstEpOrCh.title || 'No Title'}"`);
        updateStepStatus('episodes', 'passed', { resultCount: chaptersList.length });
      }

      updateStepStatus('stream', 'running');
      if (['anime', 'movies', 'tv shows', 'movie', 'tv show'].includes(mType)) {
        const epHref = firstEpOrCh.href || firstEpOrCh.url;
        addLog(`Extracting stream URL for episode href: "${epHref}"`);
        let streamRaw;
        try {
          streamRaw = await moduleInstance.extractStreamUrl(epHref);
        } catch (err) {
          throw { step: 'stream', message: `extractStreamUrl runtime exception: ${err.message}` };
        }

        const streamParsed = parseJSON(streamRaw);
        let streamUrl = null;
        let headers = null;

        if (typeof streamParsed === 'string') {
          streamUrl = streamParsed;
        } else if (streamParsed && streamParsed.streamUrl) {
          streamUrl = streamParsed.streamUrl;
          headers = streamParsed.headers || null;
        } else if (streamParsed && Array.isArray(streamParsed.streams)) {
          const firstStream = streamParsed.streams[0];
          if (firstStream) {
            streamUrl = typeof firstStream === 'object' ? (firstStream.streamUrl || firstStream.url) : firstStream;
            headers = typeof firstStream === 'object' ? firstStream.headers : null;
          }
        } else if (streamParsed && (streamParsed.url || streamParsed.streamUrl)) {
          streamUrl = streamParsed.url || streamParsed.streamUrl;
          headers = streamParsed.headers || null;
        }

        if (!streamUrl || !streamUrl.startsWith('http')) {
          throw { step: 'stream', message: `extractStreamUrl failed to return a valid HTTP stream URL: ${JSON.stringify(streamParsed)}` };
        }

        result.streamData = { streamUrl, headers };
        addLog(`Stream extraction passed. Stream URL: "${streamUrl}"`);
        updateStepStatus('stream', 'passed', { streamUrl });

      } else if (['manga', 'mangas'].includes(mType)) {
        const chapterId = firstEpOrCh.id || firstEpOrCh.url;
        addLog(`Extracting images for chapter ID: "${chapterId}"`);
        let imagesRaw;
        try {
          imagesRaw = await moduleInstance.extractImages(chapterId);
        } catch (err) {
          throw { step: 'stream', message: `extractImages runtime exception: ${err.message}` };
        }

        const imagesList = parseJSON(imagesRaw);
        if (!Array.isArray(imagesList)) {
          throw { step: 'stream', message: `extractImages returned invalid format (expected array)` };
        }
        if (imagesList.length === 0) {
          throw { step: 'stream', message: `extractImages returned empty images array` };
        }
        if (typeof imagesList[0] !== 'string') {
          throw { step: 'stream', message: `extractImages returned non-string items` };
        }

        addLog(`Images extraction passed. Found ${imagesList.length} pages. First page: "${imagesList[0]}"`);
        updateStepStatus('stream', 'passed');

      } else if (['novel', 'novels'].includes(mType)) {
        const chHref = firstEpOrCh.href || firstEpOrCh.url;
        addLog(`Extracting chapter text content for href: "${chHref}"`);
        let textRaw;
        try {
          textRaw = await moduleInstance.extractText(chHref);
        } catch (err) {
          throw { step: 'stream', message: `extractText runtime exception: ${err.message}` };
        }

        if (typeof textRaw !== 'string' || textRaw.trim().length === 0) {
          throw { step: 'stream', message: `extractText returned empty or non-string response` };
        }

        addLog(`Text content extraction passed. Content length: ${textRaw.trim().length} chars.`);
        updateStepStatus('stream', 'passed');
      }

      result.status = 'passed';
      addLog(`Module verification fully passed!`);
    } catch (err) {
      addLog(`Verification failed at step [${err.step || 'unknown'}]: ${err.message}`);
      result.status = 'failed';
      result.errorStep = err.step || 'unknown';
      result.errorMessage = err.message || 'Unknown error occurred';

      let foundFailed = false;
      const order = ['load', 'search', 'detail', 'episodes', 'stream'];
      for (const step of order) {
        if (step === err.step) {
          updateStepStatus(step, 'failed', { error: err.message });
          foundFailed = true;
        } else if (foundFailed) {
          updateStepStatus(step, 'skipped');
        }
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  async runAllTests(dirPath, options = 4, onProgress, onDone) {
    let concurrencyLimit = 4;
    let keywords = {};
    if (typeof options === 'object') {
      concurrencyLimit = options.concurrencyLimit || 4;
      keywords = options.keywords || {};
    } else if (typeof options === 'number') {
      concurrencyLimit = options;
    }

    this.isCancelled = false;
    let modulesList = [];
    try {
      modulesList = await this.scanDirectory(dirPath);
    } catch (err) {
      if (onDone) onDone(err, []);
      return;
    }

    const results = modulesList.map(mod => ({
      name: mod.name,
      folderName: mod.folderName,
      type: mod.type,
      status: mod.error ? 'failed' : 'idle',
      errorStep: mod.error ? 'load' : null,
      errorMessage: mod.error || null,
      durationMs: 0,
      logs: mod.error ? [mod.error] : [],
      streamData: null,
      steps: {
        load: mod.error ? { status: 'failed', error: mod.error } : { status: 'pending' },
        search: mod.error ? { status: 'skipped' } : { status: 'pending' },
        detail: mod.error ? { status: 'skipped' } : { status: 'pending' },
        episodes: mod.error ? { status: 'skipped' } : { status: 'pending' },
        stream: mod.error ? { status: 'skipped' } : { status: 'pending' }
      }
    }));

    if (onProgress) {
      onProgress(results);
    }

    const testTasks = [];
    for (let i = 0; i < modulesList.length; i++) {
      const meta = modulesList[i];
      if (meta.error) continue;

      testTasks.push(async () => {
        if (this.isCancelled) {
          results[i].status = 'idle';
          results[i].logs.push('Test execution cancelled by user.');
          const order = ['load', 'search', 'detail', 'episodes', 'stream'];
          for (const st of order) {
            if (results[i].steps[st].status === 'pending') {
              results[i].steps[st].status = 'skipped';
            }
          }
          if (onProgress) onProgress([...results]);
          return;
        }

        const updateCallback = (updatedModuleResult) => {
          results[i] = { ...results[i], ...updatedModuleResult };
          if (onProgress) {
            onProgress([...results]);
          }
        };

        const mType = (meta.type || 'anime').toLowerCase().trim();
        let keyword = keywords[mType];
        if (!keyword) {
          if (mType.startsWith('manga')) keyword = keywords.manga;
          else if (mType.startsWith('novel')) keyword = keywords.novel;
          else if (mType === 'movies' || mType === 'movie') keyword = keywords.movie || keywords.movies;
          else if (mType === 'tv shows' || mType === 'tv show') keyword = keywords.tv || keywords['tv shows'];
          else keyword = keywords.anime;
        }

        const res = await this.testModule(meta, updateCallback, keyword);
        results[i] = res;
        if (onProgress) {
          onProgress([...results]);
        }
      });
    }

    const executing = [];
    for (const task of testTasks) {
      if (this.isCancelled) break;
      const p = task();
      executing.push(p);

      const clean = p.then(() => executing.splice(executing.indexOf(clean), 1));
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    if (onDone) {
      onDone(null, results);
    }
    return results;
  }
}

export default MassTester;
