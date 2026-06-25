let state = {
  provider: null,
  providerType: 'anime',
  currentHref: null,
  searchDebounce: null,
  mangaChaptersData: null,
  currentMangaTitle: ''
};

let testerState = {
  selectedDir: null,
  modules: [],
  isTesting: false
};

const moduleInfo = document.getElementById('moduleInfo');
const searchInput = document.getElementById('searchInput');
const searchSubmitBtn = document.getElementById('searchSubmitBtn');
const results = document.getElementById('results');
const searchError = document.getElementById('searchError');
const loadBtn = document.getElementById('loadBtn');
const backBtn = document.getElementById('backBtn');

const emptyState = document.getElementById('emptyState');
const detailView = document.getElementById('detailView');
const posterImg = document.getElementById('posterImg');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const detailDesc = document.getElementById('detailDesc');

const episodesSection = document.getElementById('episodesSection');
const sectionTitle = document.getElementById('sectionTitle');
const loadingText = document.getElementById('loadingText');
const mangaControls = document.getElementById('mangaControls');
const langSelect = document.getElementById('langSelect');
const episodesGrid = document.getElementById('episodesGrid');
const episodesLoading = document.getElementById('episodesLoading');
const streamSection = document.getElementById('streamSection');
const streamInfo = document.getElementById('streamInfo');
const detailError = document.getElementById('detailError');
const streamModal = document.getElementById('streamModal');
const streamModalBody = document.getElementById('streamModalBody');

const groupModal = document.getElementById('groupModal');
const groupModalBody = document.getElementById('groupModalBody');

const readerModal = document.getElementById('readerModal');
const readerTitle = document.getElementById('readerTitle');
const readerSubtitle = document.getElementById('readerSubtitle');
const readerPageIndicator = document.getElementById('readerPageIndicator');
const readerCloseBtn = document.getElementById('readerCloseBtn');
const readerBody = document.getElementById('readerBody');
const readerLoading = document.getElementById('readerLoading');
const readerContent = document.getElementById('readerContent');
const readerScrollTopBtn = document.getElementById('readerScrollTopBtn');

const novelReaderModal = document.getElementById('novelReaderModal');
const novelReaderTitle = document.getElementById('novelReaderTitle');
const novelReaderSubtitle = document.getElementById('novelReaderSubtitle');
const novelReaderCloseBtn = document.getElementById('novelReaderCloseBtn');
const novelReaderBody = document.getElementById('novelReaderBody');
const novelReaderLoading = document.getElementById('novelReaderLoading');
const novelReaderContent = document.getElementById('novelReaderContent');
const novelReaderScrollTopBtn = document.getElementById('novelReaderScrollTopBtn');

const tabContentBtn = document.getElementById('tabContentBtn');
const tabJsonBtn = document.getElementById('tabJsonBtn');
const tabContentArea = document.getElementById('tabContentArea');
const tabJsonArea = document.getElementById('tabJsonArea');
const copyStreamBtn = document.getElementById('copyStreamBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const copyModalStreamBtn = document.getElementById('copyModalStreamBtn');
const openLogsBtn = document.getElementById('openLogsBtn');
const workspaceBtn = document.getElementById('workspaceBtn');
const workspaceView = document.getElementById('workspaceView');
const logsView = document.getElementById('logsView');
const clearInlineLogsBtn = document.getElementById('clearInlineLogsBtn');

const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
}
if (maximizeBtn) {
  maximizeBtn.addEventListener('click', () => window.api.maximizeWindow());
}
if (closeBtn) {
  closeBtn.addEventListener('click', () => window.api.closeWindow());
}

function setStatus(text, statusClass) {
  const statusEl = document.getElementById('moduleStatus');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = 'module-card-value ' + (statusClass || '');
  }
}

function resetTabs() {
  if (tabContentBtn && tabJsonBtn && tabContentArea && tabJsonArea) {
    tabContentBtn.classList.add('active');
    tabJsonBtn.classList.remove('active');
    tabContentArea.classList.add('active');
    tabContentArea.style.display = 'block';
    tabJsonArea.classList.remove('active');
    tabJsonArea.style.display = 'none';
  }
}

if (tabContentBtn && tabJsonBtn && tabContentArea && tabJsonArea) {
  tabContentBtn.addEventListener('click', () => {
    tabContentBtn.classList.add('active');
    tabJsonBtn.classList.remove('active');
    tabContentArea.classList.add('active');
    tabContentArea.style.display = 'block';
    tabJsonArea.classList.remove('active');
    tabJsonArea.style.display = 'none';
  });

  tabJsonBtn.addEventListener('click', () => {
    tabJsonBtn.classList.add('active');
    tabContentBtn.classList.remove('active');
    tabJsonArea.classList.add('active');
    tabJsonArea.style.display = 'block';
    tabContentArea.classList.remove('active');
    tabContentArea.style.display = 'none';
  });
}

if (copyStreamBtn) {
  copyStreamBtn.addEventListener('click', () => {
    const text = streamInfo.getAttribute('data-copy-val') || streamInfo.innerText;
    if (text) {
      navigator.clipboard.writeText(text);
      const originalHTML = copyStreamBtn.innerHTML;
      copyStreamBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyStreamBtn.innerHTML = originalHTML;
      }, 1000);
    }
  });
}

if (copyJsonBtn) {
  copyJsonBtn.addEventListener('click', () => {
    const rawJsonView = document.getElementById('rawJsonView');
    const text = rawJsonView ? rawJsonView.textContent : '';
    if (text) {
      navigator.clipboard.writeText(text);
      const originalHTML = copyJsonBtn.innerHTML;
      copyJsonBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyJsonBtn.innerHTML = originalHTML;
      }, 1000);
    }
  });
}

if (copyModalStreamBtn) {
  copyModalStreamBtn.addEventListener('click', () => {
    const text = streamModalBody.innerText;
    if (text) {
      navigator.clipboard.writeText(text);
      const originalText = copyModalStreamBtn.textContent;
      copyModalStreamBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyModalStreamBtn.textContent = originalText;
      }, 1000);
    }
  });
}

window.playStreamInMpv = (url, headersJsonStr) => {
  let headers = null;
  if (headersJsonStr) {
    try {
      headers = JSON.parse(decodeURIComponent(headersJsonStr));
    } catch (e) {}
  }
  window.api.playWithMpv(url, headers);
};

const massTesterBtn = document.getElementById('massTesterBtn');
const massTesterView = document.getElementById('massTesterView');

function selectView(viewName) {
  if (workspaceBtn) workspaceBtn.classList.remove('active');
  if (openLogsBtn) openLogsBtn.classList.remove('active');
  if (massTesterBtn) massTesterBtn.classList.remove('active');

  if (workspaceView) workspaceView.style.display = 'none';
  if (logsView) logsView.style.display = 'none';
  if (massTesterView) massTesterView.style.display = 'none';

  if (viewName === 'workspace') {
    if (workspaceBtn) workspaceBtn.classList.add('active');
    if (workspaceView) workspaceView.style.display = 'flex';
  } else if (viewName === 'logs') {
    if (openLogsBtn) openLogsBtn.classList.add('active');
    if (logsView) logsView.style.display = 'flex';
  } else if (viewName === 'tester') {
    if (massTesterBtn) massTesterBtn.classList.add('active');
    if (massTesterView) massTesterView.style.display = 'flex';
  }
}

if (workspaceBtn) {
  workspaceBtn.addEventListener('click', () => selectView('workspace'));
}
if (openLogsBtn) {
  openLogsBtn.addEventListener('click', () => selectView('logs'));
}
if (massTesterBtn) {
  massTesterBtn.addEventListener('click', () => selectView('tester'));
}

if (clearInlineLogsBtn) {
  clearInlineLogsBtn.addEventListener('click', () => {
    const inlineLogsContent = document.getElementById('inlineLogsContent');
    if (inlineLogsContent) {
      inlineLogsContent.innerHTML = '';
    }
  });
}

if (loadBtn) {
  loadBtn.addEventListener('click', async () => {
    try {
      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading...';
      setStatus('Loading Module...', 'active');
      
      const result = await window.api.pickFile();
      
      if (result.error) {
        searchError.textContent = 'Error: ' + result.error;
        searchError.classList.add('active');
        moduleInfo.classList.remove('active');
        moduleInfo.textContent = 'No module';
        state.provider = null;
        setStatus('Load Failed', 'error');
      } else if (result.success) {
        state.provider = result.module;
        state.providerType = result.type || 'anime';
        moduleInfo.classList.add('active');
        moduleInfo.textContent = `${result.module}`;
        
        emptyState.style.display = 'flex';
        detailView.classList.remove('active');
        results.innerHTML = '';
        searchInput.value = '';
        searchError.classList.remove('active');
        setStatus('Idle', '');
      } else {
        setStatus('Idle', '');
      }
    } catch (error) {
      console.error('Load error:', error);
      searchError.textContent = 'Error: ' + error.message;
      searchError.classList.add('active');
      setStatus('Load Error', 'error');
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = 'Load JS Module';
    }
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    detailView.classList.remove('active');
    emptyState.style.display = 'flex';
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected'));
  });
}

async function performSearch() {
  if (!state.provider) {
    searchError.textContent = 'Load a module first';
    searchError.classList.add('active');
    return;
  }

  const keyword = searchInput.value.trim();
  if (!keyword) {
    results.innerHTML = '';
    return;
  }

  searchError.classList.remove('active');
  results.innerHTML = '';
  setStatus('Searching...', 'active');

  try {
    const searchResults = await window.api.search(state.provider, keyword);

    if (searchResults.error) {
      searchError.textContent = searchResults.error;
      searchError.classList.add('active');
      setStatus('Search Error', 'error');
      return;
    }

    if (searchResults.length === 0) {
      results.innerHTML = '<div style="text-align:center;color:#71717a;padding:20px;font-size:13px">No results found</div>';
      setStatus('Idle', '');
      return;
    }

    searchResults.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-image">
          <img src="${item.image || ''}" alt="${item.title}" onerror="this.style.display='none'">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${item.href}</div>
        </div>
      `;
      row.addEventListener('click', () => {
        document.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        openDetail(item);
      });
      results.appendChild(row);
    });
    setStatus('Idle', '');
  } catch (error) {
    searchError.textContent = error.message || 'Search failed';
    searchError.classList.add('active');
    setStatus('Search Failed', 'error');
  }
}

if (searchSubmitBtn) {
  searchSubmitBtn.addEventListener('click', performSearch);
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

async function openDetail(item) {
  state.currentHref = item.href;
  state.currentMangaTitle = item.title;

  emptyState.style.display = 'none';
  detailView.classList.add('active');
  
  episodesSection.style.display = 'none';
  mangaControls.style.display = 'none';
  streamSection.classList.remove('active');
  detailError.classList.remove('active');
  resetTabs();

  const paneContainer = document.querySelector('.inspector-pane .container');
  if (paneContainer) {
    paneContainer.scrollTop = 0;
  }

  posterImg.src = item.image || '';
  detailTitle.textContent = item.title;
  detailMeta.textContent = '';
  detailDesc.textContent = 'Loading item details...';

  const moduleTypeBadge = document.getElementById('moduleTypeBadge');
  if (moduleTypeBadge) {
    moduleTypeBadge.className = `badge ${state.providerType}`;
    moduleTypeBadge.textContent = state.providerType === 'manga' ? 'Manga' : (state.providerType === 'novel' ? 'Novel' : 'Anime');
  }

  setStatus('Fetching Details...', 'active');

  if (state.provider && typeof window.api.getModuleType === 'function') {
    try {
      state.providerType = await window.api.getModuleType(state.provider) || 'anime';
      if (moduleTypeBadge) {
        moduleTypeBadge.className = `badge ${state.providerType}`;
        moduleTypeBadge.textContent = state.providerType === 'manga' ? 'Manga' : (state.providerType === 'novel' ? 'Novel' : 'Anime');
      }
    } catch (e) {
      console.warn('Failed to fetch provider type, defaulting to current:', e);
    }
  }

  try {
    const details = await window.api.detail(state.provider, state.currentHref);

    if (details.error) {
      detailDesc.textContent = 'Error: ' + details.error;
      detailError.textContent = details.error;
      detailError.classList.add('active');
      setStatus('Detail Fetch Error', 'error');
      return;
    }

    const rawJsonView = document.getElementById('rawJsonView');
    if (rawJsonView) {
      rawJsonView.textContent = JSON.stringify(details, null, 2);
    }

    detailDesc.textContent = details.description || 'No description available';
    
    if (state.providerType === 'manga' || state.providerType === 'novel') {
      detailMeta.textContent = details.aliases || 'No tags';
    } else {
      detailMeta.textContent = details.airdate || '';
    }
    
    episodesSection.style.display = 'block';
    
    if (state.providerType === 'manga' || state.providerType === 'novel') {
      sectionTitle.textContent = 'Chapters';
      loadingText.textContent = 'Loading chapters...';
      loadChapters();
    } else {
      sectionTitle.textContent = 'Episodes';
      loadingText.textContent = 'Loading episodes...';
      loadEpisodes();
    }
  } catch (error) {
    detailDesc.textContent = 'Failed to load details';
    detailError.textContent = error.message;
    detailError.classList.add('active');
    setStatus('Detail Load Failed', 'error');
  }
}

async function loadEpisodes() {
  episodesLoading.classList.add('active');
  episodesGrid.innerHTML = '';
  setStatus('Loading Episodes...', 'active');

  try {
    const episodes = await window.api.episodes(state.provider, state.currentHref);

    if (episodes.error) {
      episodesLoading.classList.remove('active');
      detailError.textContent = episodes.error;
      detailError.classList.add('active');
      setStatus('Episodes Error', 'error');
      return;
    }

    episodes.forEach(ep => {
      const btn = document.createElement('button');
      btn.className = 'episode-btn';
      btn.textContent = ep.number;
      btn.title = `Episode ${ep.number}`;
      btn.addEventListener('click', () => playEpisode(ep));
      episodesGrid.appendChild(btn);
    });

    episodesLoading.classList.remove('active');
    setStatus('Idle', '');
  } catch (error) {
    episodesLoading.classList.remove('active');
    detailError.textContent = error.message;
    detailError.classList.add('active');
    setStatus('Episodes Load Failed', 'error');
  }
}

async function playEpisode(ep) {
  try {
    setStatus('Fetching Stream URL...', 'active');
    streamSection.classList.add('active');
    streamInfo.innerHTML = 'Loading stream URL details...';
    
    streamModalBody.textContent = 'Loading stream...';
    streamModal.classList.add('active');

    const stream = await window.api.stream(state.provider, ep.href);

    if (stream.error) {
      const errMsg = 'Error: ' + stream.error;
      streamInfo.innerHTML = errMsg;
      streamModalBody.textContent = errMsg;
      setStatus('Stream Fetch Failed', 'error');
      return;
    }

    const noteHtml = '<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">Note: Playing streams in MPV requires MPV to be installed and in your system PATH.</div>';
    let html = noteHtml;
    let plainText = '';
    
    if (typeof stream === 'string') {
      html += `<strong>Stream URL:</strong><br><code>${stream}</code><br><button class="copy-btn" onclick="window.playStreamInMpv('${stream.replace(/'/g, "\\'")}', '')" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Play in MPV</button>`;
      plainText = stream;
    } else if (stream.type === 'direct' || stream.streamUrl || stream.url) {
      const url = stream.url || stream.streamUrl;
      const headers = stream.headers || null;
      const escHeaders = headers ? encodeURIComponent(JSON.stringify(headers)) : '';
      html += `<strong>Direct Stream:</strong><br><code>${url}</code><br><button class="copy-btn" onclick="window.playStreamInMpv('${url.replace(/'/g, "\\'")}', '${escHeaders}')" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Play in MPV</button>`;
      plainText = url;
      if (stream.subtitle) {
        html += `<br><br><strong>Subtitle:</strong><br><code>${stream.subtitle}</code>`;
        plainText += `\nSubtitle: ${stream.subtitle}`;
      }
    } else if (stream.type === 'servers' || stream.streams) {
      const streams = stream.streams || stream;
      if (Array.isArray(streams) && streams.length > 0) {
        html += '<strong>Available Streams:</strong>';
        streams.forEach((s, i) => {
          const title = typeof s === 'object' ? s.title : s;
          const url = typeof s === 'object' ? (s.streamUrl || s.url) : s;
          const headers = typeof s === 'object' ? s.headers : null;
          const escHeaders = headers ? encodeURIComponent(JSON.stringify(headers)) : '';
          html += `<br><br>[Server ${i + 1}] ${title}<br><code>${url}</code><br><button class="copy-btn" onclick="window.playStreamInMpv('${url.replace(/'/g, "\\'")}', '${escHeaders}')" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Play in MPV</button>`;
          plainText += `[Server ${i + 1}] ${title}: ${url}\n`;
        });
      } else {
        html += '<strong>Raw Response:</strong><br><code>' + JSON.stringify(stream, null, 2) + '</code>';
        plainText = JSON.stringify(stream, null, 2);
      }
      if (stream.subtitle || stream.subtitles) {
        html += `<br><br><strong>Subtitle:</strong><br><code>${stream.subtitle || stream.subtitles}</code>`;
        plainText += `\nSubtitle: ${stream.subtitle || stream.subtitles}`;
      }
    } else {
      html += '<strong>Raw Response:</strong><br><code>' + JSON.stringify(stream, null, 2) + '</code>';
      plainText = JSON.stringify(stream, null, 2);
    }

    streamInfo.innerHTML = html;
    streamModalBody.innerHTML = html;
    streamInfo.setAttribute('data-copy-val', plainText);
    
    setStatus('Idle', '');
  } catch (error) {
    const errMsg = 'Error: ' + error.message;
    streamInfo.textContent = errMsg;
    streamModalBody.textContent = errMsg;
    setStatus('Stream Load Error', 'error');
  }
}

async function loadChapters() {
  episodesLoading.classList.add('active');
  episodesGrid.innerHTML = '';
  mangaControls.style.display = 'none';
  setStatus('Loading Chapters...', 'active');

  episodesGrid.style.display = 'grid';
  episodesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(64px, 1fr))';
  episodesGrid.style.gap = '8px';

  try {
    const chaptersData = await window.api.chapters(state.provider, state.currentHref);

    if (chaptersData.error) {
      episodesLoading.classList.remove('active');
      detailError.textContent = chaptersData.error;
      detailError.classList.add('active');
      setStatus('Chapters Error', 'error');
      return;
    }

    if (state.providerType === 'novel') {
      if (!Array.isArray(chaptersData) || chaptersData.length === 0) {
        episodesLoading.classList.remove('active');
        episodesGrid.innerHTML = '<div style="text-align:center;color:#71717a;padding:20px;grid-column:1/-1;font-size:13px">No chapters found</div>';
        setStatus('Idle', '');
        return;
      }

      episodesGrid.style.display = 'flex';
      episodesGrid.style.flexDirection = 'column';
      episodesGrid.style.gap = '8px';

      chaptersData.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'episode-btn';
        btn.textContent = ch.title || `Ch. ${ch.number}`;
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.style.padding = '12px';
        btn.addEventListener('click', () => openNovelChapter(ch));
        episodesGrid.appendChild(btn);
      });

      episodesLoading.classList.remove('active');
      setStatus('Idle', '');
      return;
    }

    state.mangaChaptersData = chaptersData;

    const languages = Object.keys(chaptersData);
    if (languages.length === 0) {
      episodesLoading.classList.remove('active');
      episodesGrid.innerHTML = '<div style="text-align:center;color:#71717a;padding:20px;grid-column:1/-1;font-size:13px">No chapters found</div>';
      setStatus('Idle', '');
      return;
    }

    langSelect.innerHTML = '';
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang.toUpperCase();
      langSelect.appendChild(option);
    });

    if (languages.length > 1) {
      mangaControls.style.display = 'block';
    } else {
      mangaControls.style.display = 'none';
    }

    const defaultLang = languages.includes('en') ? 'en' : languages[0];
    langSelect.value = defaultLang;

    renderChapters(defaultLang);
    episodesLoading.classList.remove('active');
    setStatus('Idle', '');
  } catch (error) {
    episodesLoading.classList.remove('active');
    detailError.textContent = error.message;
    detailError.classList.add('active');
    setStatus('Chapters Load Failed', 'error');
  }
}

function renderChapters(lang) {
  episodesGrid.innerHTML = '';
  const chapters = state.mangaChaptersData[lang] || [];

  if (chapters.length === 0) {
    episodesGrid.innerHTML = '<div style="text-align:center;color:#71717a;padding:20px;grid-column:1/-1;font-size:13px">No chapters in this language</div>';
    return;
  }

  chapters.forEach(([chNum, releases]) => {
    const btn = document.createElement('button');
    btn.className = 'episode-btn';
    btn.textContent = `Ch. ${chNum}`;
    btn.title = `Chapter ${chNum}`;
    btn.addEventListener('click', () => openChapter(chNum, releases));
    episodesGrid.appendChild(btn);
  });
}

function openChapter(chapterNum, releases) {
  if (!releases || releases.length === 0) {
    alert('No releases found for this chapter');
    return;
  }

  const chapterTitle = `Chapter ${chapterNum}`;

  if (releases.length === 1) {
    loadMangaReader(releases[0].id, chapterTitle);
  } else {
    groupModalBody.innerHTML = '';
    
    releases.forEach(rel => {
      const btn = document.createElement('button');
      btn.className = 'modal-btn';
      btn.style.textAlign = 'left';
      btn.style.width = '100%';
      btn.style.padding = '12px';
      btn.style.marginBottom = '4px';
      btn.innerHTML = `
        <strong>${rel.scanlation_group || 'Unknown Group'}</strong>
        ${rel.title ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${rel.title}</div>` : ''}
      `;
      btn.addEventListener('click', () => {
        groupModal.classList.remove('active');
        loadMangaReader(rel.id, chapterTitle);
      });
      groupModalBody.appendChild(btn);
    });

    groupModal.classList.add('active');
  }
}

async function loadMangaReader(chapterId, chapterTitle) {
  readerTitle.textContent = state.currentMangaTitle;
  readerSubtitle.textContent = chapterTitle;
  readerPageIndicator.textContent = 'Page 1 / 1';
  readerContent.innerHTML = '';
  readerScrollTopBtn.style.display = 'none';

  readerModal.classList.add('active');
  readerLoading.classList.add('active');
  setStatus('Fetching Manga Images...', 'active');

  try {
    const images = await window.api.images(state.provider, chapterId);

    readerLoading.classList.remove('active');

    if (images.error) {
      readerContent.innerHTML = `<div style="color:#f87171;padding:40px;text-align:center;font-size:13px">Error: ${images.error}</div>`;
      setStatus('Reader Error', 'error');
      return;
    }

    if (!images || images.length === 0) {
      readerContent.innerHTML = `<div style="color:var(--text-muted);padding:40px;text-align:center;font-size:13px">No pages found for this chapter</div>`;
      setStatus('Idle', '');
      return;
    }

    readerPageIndicator.textContent = `Page 1 / ${images.length}`;

    const imgElements = [];
    images.forEach((imgUrl, idx) => {
      const img = document.createElement('img');
      img.alt = `Page ${idx + 1}`;
      img.src = imgUrl;
      img.loading = 'lazy';
      
      img.style.opacity = '0';
      img.addEventListener('load', () => {
        img.style.opacity = '1';
      });
      img.addEventListener('error', () => {
        img.style.opacity = '0.4';
        img.alt = `Failed to load Page ${idx + 1}`;
      });

      readerContent.appendChild(img);
      imgElements.push(img);
    });

    const handleScroll = () => {
      const scrollTop = readerBody.scrollTop;
      
      if (scrollTop > 800) {
        readerScrollTopBtn.style.display = 'flex';
      } else {
        readerScrollTopBtn.style.display = 'none';
      }

      const bodyHeight = readerBody.clientHeight;
      const bodyMiddle = scrollTop + bodyHeight / 2;

      let currentActivePage = 1;
      let accumulatedHeight = 0;

      for (let i = 0; i < imgElements.length; i++) {
        const img = imgElements[i];
        const imgHeight = img.clientHeight || 1000;
        accumulatedHeight += imgHeight + 12;

        if (bodyMiddle < accumulatedHeight) {
          currentActivePage = i + 1;
          break;
        }
      }

      readerPageIndicator.textContent = `Page ${currentActivePage} / ${images.length}`;
    };

    readerBody.addEventListener('scroll', handleScroll);
    readerModal._scrollListener = handleScroll;
    readerModal._scrollTarget = readerBody;
    setStatus('Idle', '');
  } catch (error) {
    readerLoading.classList.remove('active');
    readerContent.innerHTML = `<div style="color:#f87171;padding:40px;text-align:center;font-size:13px">Failed to load chapter pages: ${error.message}</div>`;
    setStatus('Reader Load Failed', 'error');
  }
}

function closeMangaReader() {
  readerModal.classList.remove('active');
  
  if (readerModal._scrollListener && readerModal._scrollTarget) {
    readerModal._scrollTarget.removeEventListener('scroll', readerModal._scrollListener);
    readerModal._scrollListener = null;
    readerModal._scrollTarget = null;
  }
  
  readerContent.innerHTML = '';
}

async function openNovelChapter(ch) {
  novelReaderTitle.textContent = state.currentMangaTitle;
  novelReaderSubtitle.textContent = ch.title;
  novelReaderContent.innerHTML = '';
  novelReaderScrollTopBtn.style.display = 'none';

  novelReaderModal.classList.add('active');
  novelReaderLoading.classList.add('active');
  setStatus('Fetching Novel Text...', 'active');

  try {
    const textHtml = await window.api.text(state.provider, ch.href);

    novelReaderLoading.classList.remove('active');

    if (textHtml.error) {
      novelReaderContent.innerHTML = `<div style="color:#f87171;padding:40px;text-align:center;font-size:13px">Error: ${textHtml.error}</div>`;
      setStatus('Reader Error', 'error');
      return;
    }

    novelReaderContent.innerHTML = textHtml || '<p>No content found</p>';

    const handleScroll = () => {
      if (novelReaderBody.scrollTop > 800) {
        novelReaderScrollTopBtn.style.display = 'flex';
      } else {
        novelReaderScrollTopBtn.style.display = 'none';
      }
    };

    novelReaderBody.addEventListener('scroll', handleScroll);
    novelReaderModal._scrollListener = handleScroll;
    novelReaderModal._scrollTarget = novelReaderBody;
    setStatus('Idle', '');
  } catch (error) {
    novelReaderLoading.classList.remove('active');
    novelReaderContent.innerHTML = `<div style="color:#f87171;padding:40px;text-align:center;font-size:13px">Failed to load chapter text: ${error.message}</div>`;
    setStatus('Reader Load Failed', 'error');
  }
}

function closeNovelReader() {
  novelReaderModal.classList.remove('active');
  
  if (novelReaderModal._scrollListener && novelReaderModal._scrollTarget) {
    novelReaderModal._scrollTarget.removeEventListener('scroll', novelReaderModal._scrollListener);
    novelReaderModal._scrollListener = null;
    novelReaderModal._scrollTarget = null;
  }
  
  novelReaderContent.innerHTML = '';
}

if (langSelect) {
  langSelect.addEventListener('change', () => {
    if (state.mangaChaptersData) {
      renderChapters(langSelect.value);
    }
  });
}

if (readerCloseBtn) {
  readerCloseBtn.addEventListener('click', closeMangaReader);
}

if (readerScrollTopBtn) {
  readerScrollTopBtn.addEventListener('click', () => {
    readerBody.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (novelReaderCloseBtn) {
  novelReaderCloseBtn.addEventListener('click', closeNovelReader);
}

if (novelReaderScrollTopBtn) {
  novelReaderScrollTopBtn.addEventListener('click', () => {
    novelReaderBody.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (window.api.onModuleReloaded) {
  window.api.onModuleReloaded((data) => {
    if (state.provider === data.module) {
      state.providerType = data.type;
      moduleInfo.textContent = `${data.module}`;
      
      const moduleTypeBadge = document.getElementById('moduleTypeBadge');
      if (moduleTypeBadge) {
        moduleTypeBadge.className = `badge ${state.providerType}`;
        moduleTypeBadge.textContent = state.providerType === 'manga' ? 'Manga' : (state.providerType === 'novel' ? 'Novel' : 'Anime');
      }
    }
  });
}

window.api.onLog((message) => {
  const inlineLogsContent = document.getElementById('inlineLogsContent');
  if (inlineLogsContent) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (message.includes('[SUCCESS]') || message.includes('loaded')) {
      entry.classList.add('success');
    } else if (message.includes('[MODULE ERROR]')) {
      entry.classList.add('module-error');
    } else if (message.includes('[MODULE WARN]')) {
      entry.classList.add('module-warn');
    } else if (message.includes('[MODULE')) {
      entry.classList.add('module');
    } else if (message.includes('[WARNING]') || message.includes('[WARN]')) {
      entry.classList.add('warning');
    } else if (message.includes('[ERROR]') || message.includes('error') || message.includes('Error')) {
      entry.classList.add('error');
    } else if (message.includes('[INFO]')) {
      entry.classList.add('info');
    }
    entry.textContent = message;
    inlineLogsContent.appendChild(entry);
    inlineLogsContent.scrollTop = inlineLogsContent.scrollHeight;
  }
});

// --- Mass Module Tester Integration ---
const pickTesterDirBtn = document.getElementById('pickTesterDirBtn');
const runTesterBtn = document.getElementById('runTesterBtn');
const cancelTesterBtn = document.getElementById('cancelTesterBtn');
const selectedDirLabel = document.getElementById('selectedDirLabel');
const testerDashboard = document.getElementById('testerDashboard');
const testerSettings = document.getElementById('testerSettings');
const statTotal = document.getElementById('statTotal');
const statPassed = document.getElementById('statPassed');
const statFailed = document.getElementById('statFailed');
const statPending = document.getElementById('statPending');
const testerProgressText = document.getElementById('testerProgressText');
const testerProgressBar = document.getElementById('testerProgressBar');
const testerSearchInput = document.getElementById('testerSearchInput');
const testerTypeFilter = document.getElementById('testerTypeFilter');
const testerStatusFilter = document.getElementById('testerStatusFilter');
const testerEmptyState = document.getElementById('testerEmptyState');
const testerTableContainer = document.getElementById('testerTableContainer');
const testerTbody = document.getElementById('testerTbody');

function renderTesterTable() {
  if (!testerTbody) return;
  testerTbody.innerHTML = '';

  const searchText = testerSearchInput ? testerSearchInput.value.trim().toLowerCase() : '';
  const typeFilter = testerTypeFilter ? testerTypeFilter.value : 'all';
  const statusFilter = testerStatusFilter ? testerStatusFilter.value : 'all';

  const filtered = testerState.modules.filter(mod => {
    if (searchText && !mod.name.toLowerCase().includes(searchText) && !mod.folderName.toLowerCase().includes(searchText)) {
      return false;
    }
    if (typeFilter !== 'all') {
      const typeNorm = (mod.type || '').toLowerCase();
      if (typeFilter === 'manga' && !typeNorm.startsWith('manga')) return false;
      if (typeFilter === 'novel' && !typeNorm.startsWith('novel')) return false;
      if (typeFilter === 'anime' && (typeNorm.startsWith('manga') || typeNorm.startsWith('novel'))) return false;
    }
    if (statusFilter !== 'all') {
      if (mod.status !== statusFilter) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    testerTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;font-size:12px;">No modules match the filters</td></tr>`;
    return;
  }

  filtered.forEach((mod) => {
    const mainRow = document.createElement('tr');
    mainRow.className = 'tester-row';
    mainRow.id = `tester-row-${mod.folderName}`;
    
    let statusClass = 'idle';
    if (mod.status === 'passed') statusClass = 'passed';
    else if (mod.status === 'failed') statusClass = 'failed';
    else if (mod.status === 'running') statusClass = 'running';
    
    const statusText = mod.status === 'idle' ? 'Pending' : mod.status;
    const statusBadge = `<span class="status-pill ${statusClass}">${statusText}</span>`;

    const stepsOrder = ['load', 'search', 'detail', 'episodes', 'stream'];
    const stepLabels = { load: 'LD', search: 'SH', detail: 'DT', episodes: 'EP', stream: 'ST' };
    
    const isManga = (mod.type || '').toLowerCase().startsWith('manga');
    const isNovel = (mod.type || '').toLowerCase().startsWith('novel');
    if (isManga || isNovel) {
      stepLabels.episodes = 'CH';
      stepLabels.stream = isManga ? 'IM' : 'TX';
    }

    let stepsHtml = '';
    stepsOrder.forEach(step => {
      const stepData = mod.steps[step] || { status: 'pending' };
      let stepClass = 'pending';
      if (stepData.status === 'passed') stepClass = 'passed';
      else if (stepData.status === 'failed') stepClass = 'failed';
      else if (stepData.status === 'running') stepClass = 'running';
      else if (stepData.status === 'skipped') stepClass = 'skipped';
      
      let titleAttr = '';
      if (stepData.error) titleAttr = `title="Error: ${stepData.error.replace(/"/g, '&quot;')}"`;
      else if (stepData.query) titleAttr = `title="Search query: ${stepData.query}"`;
      else if (stepData.resultCount) titleAttr = `title="Found: ${stepData.resultCount}"`;
      else if (stepData.streamUrl) titleAttr = `title="Stream URL: ${stepData.streamUrl}"`;

      stepsHtml += `<span class="tester-step-badge ${stepClass}" ${titleAttr}>${stepLabels[step]}</span>`;
    });

    let actionsHtml = '';
    if (mod.status === 'passed' && mod.streamData && mod.streamData.streamUrl) {
      const escUrl = mod.streamData.streamUrl.replace(/'/g, "\\'");
      const escHeaders = mod.streamData.headers ? encodeURIComponent(JSON.stringify(mod.streamData.headers)) : '';
      actionsHtml += `<button class="copy-btn" onclick="event.stopPropagation(); window.playStreamInMpv('${escUrl}', '${escHeaders}')" style="display:inline-flex; align-items:center; gap:4px; margin-right:8px; background:var(--primary-muted); border-color:var(--primary); color:var(--primary); font-size:10px; padding:3px 6px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Play Stream</button>`;
    }
    
    actionsHtml += `<button class="copy-btn" onclick="event.stopPropagation(); window.runSingleTesterModule('${mod.folderName}')" style="display:inline-flex; font-size:10px; padding:3px 6px;">Run Test</button>`;

    let typeClass = 'anime';
    let typeLabel = 'Anime';
    if (isManga) {
      typeClass = 'manga';
      typeLabel = 'Manga';
    } else if (isNovel) {
      typeClass = 'novel';
      typeLabel = 'Novel';
    } else if (mod.type === 'movies' || mod.type === 'movie') {
      typeClass = 'anime';
      typeLabel = 'Movie';
    } else if (mod.type === 'tv shows' || mod.type === 'tv show') {
      typeClass = 'anime';
      typeLabel = 'TV Show';
    }

    mainRow.innerHTML = `
      <td style="padding: 10px; font-weight: 600; border-bottom: 1px solid var(--border-color);">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span>${mod.name}</span>
          <span style="font-size:10px; font-weight:normal; color:var(--text-muted); font-family:var(--font-mono);">${mod.folderName}</span>
        </div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid var(--border-color);"><span class="badge ${typeClass}">${typeLabel}</span></td>
      <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${statusBadge}</td>
      <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${stepsHtml}</td>
      <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: right;">${actionsHtml}</td>
    `;

    const detailsRow = document.createElement('tr');
    detailsRow.className = 'tester-details-row';
    detailsRow.id = `tester-details-${mod.folderName}`;
    
    let logLines = '';
    if (mod.logs && mod.logs.length > 0) {
      logLines = mod.logs.map(line => {
        let entryClass = '';
        if (line.includes('[SUCCESS]') || line.includes('passed')) entryClass = 'success';
        else if (line.includes('failed') || line.includes('Error')) entryClass = 'error';
        else if (line.includes('[WARNING]') || line.includes('warn')) entryClass = 'warning';
        else if (line.includes('Loading')) entryClass = 'info';
        return `<div class="log-entry ${entryClass}" style="margin-bottom:2px; font-family:var(--font-mono); font-size:11px; white-space:pre-wrap; word-break:break-all;">${line}</div>`;
      }).join('');
    } else {
      logLines = '<div style="color:var(--text-muted); font-size:11px;">No logs available yet. Run a test to begin.</div>';
    }

    let errorBlock = '';
    if (mod.errorMessage) {
      errorBlock = `
        <div style="margin-bottom: 12px; padding: 10px; border-radius: 4px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); color: #f87171; font-weight: 600; font-size:11px;">
          Failed at step [${mod.errorStep}]: ${mod.errorMessage}
        </div>
      `;
    }

    detailsRow.innerHTML = `
      <td colspan="5" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
        <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
          ${errorBlock}
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Execution Terminal Log</div>
            <div style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">Duration: ${mod.durationMs}ms</div>
          </div>
          <div class="console-box" style="margin:0; padding:12px; border:1px solid var(--border-color); background:#040508; max-height:220px; width:100%; overflow-y:auto;">
            <code>${logLines}</code>
          </div>
        </div>
      </td>
    `;

    mainRow.addEventListener('click', () => {
      const isActive = detailsRow.classList.contains('active');
      if (isActive) {
        mainRow.classList.remove('expanded');
        detailsRow.classList.remove('active');
      } else {
        mainRow.classList.add('expanded');
        detailsRow.classList.add('active');
      }
    });

    testerTbody.appendChild(mainRow);
    testerTbody.appendChild(detailsRow);
  });
}

function updateStatsDashboard() {
  if (!testerState.modules.length) return;
  const total = testerState.modules.length;
  const passed = testerState.modules.filter(m => m.status === 'passed').length;
  const failed = testerState.modules.filter(m => m.status === 'failed').length;
  const running = testerState.modules.filter(m => m.status === 'running').length;
  const completed = passed + failed;
  const pending = total - completed - running;

  if (statTotal) statTotal.textContent = total;
  if (statPassed) statPassed.textContent = passed;
  if (statFailed) statFailed.textContent = failed;
  if (statPending) statPending.textContent = pending + running;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (testerProgressText) testerProgressText.textContent = `${percent}%`;
  if (testerProgressBar) testerProgressBar.style.width = `${percent}%`;
}

async function pickTesterDir() {
  try {
    const result = await window.api.pickDirectory();
    if (result.canceled) return;
    
    testerState.selectedDir = result.path;
    testerState.modules = (result.modules || [])
      .filter(mod => mod.folderName && !mod.folderName.startsWith('.'))
      .map(mod => ({
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
    testerState.isTesting = false;

    if (selectedDirLabel) {
      selectedDirLabel.textContent = result.path;
      selectedDirLabel.title = result.path;
    }
    
    if (testerState.modules.length > 0) {
      if (runTesterBtn) runTesterBtn.disabled = false;
      if (testerEmptyState) testerEmptyState.style.display = 'none';
      if (testerTableContainer) testerTableContainer.style.display = 'block';
      if (testerDashboard) testerDashboard.style.display = 'flex';
      if (testerSettings) testerSettings.style.display = 'flex';
      updateStatsDashboard();
    } else {
      if (runTesterBtn) runTesterBtn.disabled = true;
      if (testerEmptyState) {
        testerEmptyState.style.display = 'block';
        testerEmptyState.innerHTML = `
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; color: #ef4444;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p>No valid modules (JS + JSON folders) found in the selected directory.</p>
        `;
      }
      if (testerTableContainer) testerTableContainer.style.display = 'none';
      if (testerDashboard) testerDashboard.style.display = 'none';
      if (testerSettings) testerSettings.style.display = 'none';
    }
    
    renderTesterTable();
  } catch (err) {
    console.error('Directory picking failed:', err);
    alert('Failed to read directory: ' + err.message);
  }
}

async function runTester() {
  if (!testerState.selectedDir || testerState.isTesting) return;

  testerState.isTesting = true;
  if (runTesterBtn) runTesterBtn.disabled = true;
  if (pickTesterDirBtn) pickTesterDirBtn.disabled = true;
  if (cancelTesterBtn) cancelTesterBtn.style.display = 'block';

  testerState.modules.forEach(mod => {
    if (mod.status !== 'failed' || !mod.errorMessage || !mod.errorMessage.includes('Manifest')) {
      mod.status = 'idle';
      mod.steps = {
        load: { status: 'pending' },
        search: { status: 'pending' },
        detail: { status: 'pending' },
        episodes: { status: 'pending' },
        stream: { status: 'pending' }
      };
      mod.logs = [];
      mod.streamData = null;
    }
  });

  updateStatsDashboard();
  renderTesterTable();

  const kwAnime = document.getElementById('keywordAnime');
  const kwManga = document.getElementById('keywordManga');
  const kwNovel = document.getElementById('keywordNovel');
  const kwMovie = document.getElementById('keywordMovie');
  const kwTv = document.getElementById('keywordTv');

  const keywords = {
    anime: kwAnime ? kwAnime.value.trim() : 'one piece',
    manga: kwManga ? kwManga.value.trim() : 'frieren',
    novel: kwNovel ? kwNovel.value.trim() : 'the',
    movie: kwMovie ? kwMovie.value.trim() : 'interstellar',
    tv: kwTv ? kwTv.value.trim() : 'breaking bad'
  };

  try {
    await window.api.runMassTester(testerState.selectedDir, {
      concurrencyLimit: 4,
      keywords: keywords
    });
  } catch (err) {
    console.error('Failed to run mass tester:', err);
    testerState.isTesting = false;
    if (runTesterBtn) runTesterBtn.disabled = false;
    if (pickTesterDirBtn) pickTesterDirBtn.disabled = false;
    if (cancelTesterBtn) cancelTesterBtn.style.display = 'none';
    updateStatsDashboard();
  }
}

async function cancelTester() {
  try {
    await window.api.cancelMassTester();
  } catch (e) {}
  
  testerState.isTesting = false;
  if (runTesterBtn) runTesterBtn.disabled = false;
  if (pickTesterDirBtn) pickTesterDirBtn.disabled = false;
  if (cancelTesterBtn) cancelTesterBtn.style.display = 'none';
  
  testerState.modules.forEach(mod => {
    if (mod.status === 'running' || mod.status === 'idle') {
      mod.status = 'idle';
      const order = ['load', 'search', 'detail', 'episodes', 'stream'];
      order.forEach(st => {
        if (mod.steps[st].status === 'running' || mod.steps[st].status === 'pending') {
          mod.steps[st].status = 'skipped';
        }
      });
    }
  });
  
  updateStatsDashboard();
  renderTesterTable();
}

window.runSingleTesterModule = async (folderName) => {
  const modIdx = testerState.modules.findIndex(m => m.folderName === folderName);
  if (modIdx === -1) return;

  const originalMod = testerState.modules[modIdx];
  originalMod.status = 'running';
  originalMod.steps = {
    load: { status: 'running' },
    search: { status: 'pending' },
    detail: { status: 'pending' },
    episodes: { status: 'pending' },
    stream: { status: 'pending' }
  };
  originalMod.logs = ['[INFO] Manually started single test run.'];
  originalMod.streamData = null;

  updateStatsDashboard();
  renderTesterTable();

  // Determine customized keyword based on module type
  const mType = (originalMod.type || 'anime').toLowerCase().trim();
  let customKeyword = '';
  if (mType.startsWith('manga')) {
    const el = document.getElementById('keywordManga');
    customKeyword = el ? el.value.trim() : 'frieren';
  } else if (mType.startsWith('novel')) {
    const el = document.getElementById('keywordNovel');
    customKeyword = el ? el.value.trim() : 'the';
  } else if (mType === 'movies' || mType === 'movie') {
    const el = document.getElementById('keywordMovie');
    customKeyword = el ? el.value.trim() : 'interstellar';
  } else if (mType === 'tv shows' || mType === 'tv show') {
    const el = document.getElementById('keywordTv');
    customKeyword = el ? el.value.trim() : 'breaking bad';
  } else {
    const el = document.getElementById('keywordAnime');
    customKeyword = el ? el.value.trim() : 'one piece';
  }

  setTimeout(() => {
    const mainRow = document.getElementById(`tester-row-${folderName}`);
    const detailsRow = document.getElementById(`tester-details-${folderName}`);
    if (mainRow && detailsRow && !detailsRow.classList.contains('active')) {
      mainRow.classList.add('expanded');
      detailsRow.classList.add('active');
      detailsRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 50);

  try {
    const res = await window.api.runSingleModuleTest(testerState.selectedDir, folderName, customKeyword);
    if (res.success && res.result) {
      testerState.modules[modIdx] = res.result;
    } else if (res.error) {
      testerState.modules[modIdx].status = 'failed';
      testerState.modules[modIdx].errorMessage = res.error;
      testerState.modules[modIdx].steps.load.status = 'failed';
      testerState.modules[modIdx].steps.load.error = res.error;
    }
  } catch (err) {
    testerState.modules[modIdx].status = 'failed';
    testerState.modules[modIdx].errorMessage = err.message;
    testerState.modules[modIdx].steps.load.status = 'failed';
    testerState.modules[modIdx].steps.load.error = err.message;
  }

  updateStatsDashboard();
  renderTesterTable();
};

if (pickTesterDirBtn) pickTesterDirBtn.addEventListener('click', pickTesterDir);
if (runTesterBtn) runTesterBtn.addEventListener('click', runTester);
if (cancelTesterBtn) cancelTesterBtn.addEventListener('click', cancelTester);

if (testerSearchInput) testerSearchInput.addEventListener('input', renderTesterTable);
if (testerTypeFilter) testerTypeFilter.addEventListener('change', renderTesterTable);
if (testerStatusFilter) testerStatusFilter.addEventListener('change', renderTesterTable);

if (window.api.onMassTesterUpdate) {
  window.api.onMassTesterUpdate((update) => {
    if (update.type === 'progress') {
      update.results.forEach(res => {
        const idx = testerState.modules.findIndex(m => m.folderName === res.folderName);
        if (idx !== -1) {
          testerState.modules[idx] = { ...testerState.modules[idx], ...res };
        }
      });
      updateStatsDashboard();
      renderTesterTable();
    } else if (update.type === 'done') {
      update.results.forEach(res => {
        const idx = testerState.modules.findIndex(m => m.folderName === res.folderName);
        if (idx !== -1) {
          testerState.modules[idx] = res;
        }
      });
      testerState.isTesting = false;
      if (runTesterBtn) runTesterBtn.disabled = false;
      if (pickTesterDirBtn) pickTesterDirBtn.disabled = false;
      if (cancelTesterBtn) cancelTesterBtn.style.display = 'none';
      updateStatsDashboard();
      renderTesterTable();
    } else if (update.type === 'error') {
      testerState.isTesting = false;
      if (runTesterBtn) runTesterBtn.disabled = false;
      if (pickTesterDirBtn) pickTesterDirBtn.disabled = false;
      if (cancelTesterBtn) cancelTesterBtn.style.display = 'none';
      alert('Testing failed: ' + update.error);
      updateStatsDashboard();
      renderTesterTable();
    }
  });
}

(async () => {
  setStatus('Idle', '');
  const modules = await window.api.getModules();
  if (modules.length === 0) {
    moduleInfo.textContent = 'No modules loaded';
  }
})();
