let state = {
  provider: null,
  providerType: 'anime',
  currentHref: null,
  searchDebounce: null,
  mangaChaptersData: null,
  currentMangaTitle: ''
};

const moduleInfo = document.getElementById('moduleInfo');
const searchInput = document.getElementById('searchInput');
const searchWrapper = document.querySelector('.search-wrapper');
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

if (loadBtn) {
  loadBtn.addEventListener('click', async () => {
    try {
      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading...';
      
      const result = await window.api.pickFile();
      
      if (result.error) {
        searchError.textContent = 'Error: ' + result.error;
        searchError.classList.add('active');
        moduleInfo.classList.remove('active');
        moduleInfo.textContent = 'No module';
        state.provider = null;
      } else if (result.success) {
        state.provider = result.module;
        state.providerType = result.type || 'anime';
        moduleInfo.classList.add('active');
        moduleInfo.textContent = `${result.module} (${state.providerType === 'manga' ? 'Manga' : (state.providerType === 'novel' ? 'Novel' : 'Anime')})`;
        emptyState.style.display = 'flex';
        detailView.classList.remove('active');
        results.innerHTML = '';
        searchInput.value = '';
        searchError.classList.remove('active');
      }
    } catch (error) {
      console.error('Load error:', error);
      searchError.textContent = 'Error: ' + error.message;
      searchError.classList.add('active');
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = 'Load Module';
    }
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    detailView.classList.remove('active');
    detailView.style.display = 'none';
    
    searchWrapper.style.display = 'block';
    results.style.display = 'flex';
    
    if (results.children.length === 0) {
      emptyState.style.display = 'flex';
    }
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
  results.style.display = 'flex';

  try {
    const searchResults = await window.api.search(state.provider, keyword);

    if (searchResults.error) {
      searchError.textContent = searchResults.error;
      searchError.classList.add('active');
      return;
    }

    if (searchResults.length === 0) {
      results.innerHTML = '<div style="text-align:center;color:#666;padding:20px">No results found</div>';
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
      row.addEventListener('click', () => openDetail(item));
      results.appendChild(row);
    });
  } catch (error) {
    searchError.textContent = error.message || 'Search failed';
    searchError.classList.add('active');
  }
}

async function openDetail(item) {
  state.currentHref = item.href;
  state.currentMangaTitle = item.title;

  searchWrapper.style.display = 'none';
  emptyState.style.display = 'none';
  results.style.display = 'none';
  
  detailView.classList.add('active');
  detailView.style.display = 'block';
  
  episodesSection.style.display = 'none';
  mangaControls.style.display = 'none';
  streamSection.classList.remove('active');
  detailError.classList.remove('active');

  document.querySelector('.container').scrollTop = 0;

  posterImg.src = item.image || '';
  detailTitle.textContent = item.title;
  detailMeta.textContent = '';
  detailDesc.textContent = 'Loading...';

  if (state.provider && typeof window.api.getModuleType === 'function') {
    try {
      state.providerType = await window.api.getModuleType(state.provider) || 'anime';
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
      return;
    }

    detailDesc.textContent = details.description || 'No description';
    
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
  }
}

async function loadEpisodes() {
  episodesLoading.classList.add('active');
  episodesGrid.innerHTML = '';

  try {
    const episodes = await window.api.episodes(state.provider, state.currentHref);

    if (episodes.error) {
      episodesLoading.classList.remove('active');
      detailError.textContent = episodes.error;
      detailError.classList.add('active');
      return;
    }

    episodes.forEach(ep => {
      const btn = document.createElement('button');
      btn.className = 'episode-btn';
      btn.textContent = ep.number;
      btn.addEventListener('click', () => playEpisode(ep));
      episodesGrid.appendChild(btn);
    });

    episodesLoading.classList.remove('active');
  } catch (error) {
    episodesLoading.classList.remove('active');
    detailError.textContent = error.message;
    detailError.classList.add('active');
  }
}

async function playEpisode(ep) {
  try {
    streamModalBody.textContent = 'Loading stream...';
    streamModal.classList.add('active');

    const stream = await window.api.stream(state.provider, ep.href);

    if (stream.error) {
      streamModalBody.textContent = 'Error: ' + stream.error;
      return;
    }

    let html = '';
    
    if (typeof stream === 'string') {
      html = `<strong>Stream URL:</strong><br><code>${stream}</code>`;
    } else if (stream.type === 'direct') {
      html = `<strong>Direct Stream:</strong><br><code>${stream.url}</code>`;
      if (stream.subtitle) html += `<br><br><strong>Subtitle:</strong><br><code>${stream.subtitle}</code>`;
    } else if (stream.type === 'servers' || stream.streams) {
      const streams = stream.streams || stream;
      if (Array.isArray(streams) && streams.length > 0) {
        html = '<strong>Available Streams:</strong>';
        streams.forEach((s, i) => {
          const title = typeof s === 'object' ? s.title : s;
          const url = typeof s === 'object' ? s.streamUrl : s;
          html += `<br><br>[Server ${i + 1}] ${title}<br><code>${url}</code>`;
        });
      } else {
        html = '<strong>Raw Response:</strong><br><code>' + JSON.stringify(stream, null, 2) + '</code>';
      }
      if (stream.subtitle || stream.subtitles) {
        html += `<br><br><strong>Subtitle:</strong><br><code>${stream.subtitle || stream.subtitles}</code>`;
      }
    } else {
      html = '<strong>Raw Response:</strong><br><code>' + JSON.stringify(stream, null, 2) + '</code>';
    }

    streamModalBody.innerHTML = html;
  } catch (error) {
    streamModalBody.textContent = 'Error: ' + error.message;
  }
}

async function loadChapters() {
  episodesLoading.classList.add('active');
  episodesGrid.innerHTML = '';
  mangaControls.style.display = 'none';

  episodesGrid.style.display = 'grid';
  episodesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
  episodesGrid.style.gap = '8px';

  try {
    const chaptersData = await window.api.chapters(state.provider, state.currentHref);

    if (chaptersData.error) {
      episodesLoading.classList.remove('active');
      detailError.textContent = chaptersData.error;
      detailError.classList.add('active');
      return;
    }

    if (state.providerType === 'novel') {
      if (!Array.isArray(chaptersData) || chaptersData.length === 0) {
        episodesLoading.classList.remove('active');
        episodesGrid.innerHTML = '<div style="text-align:center;color:#666;padding:20px;grid-column:1/-1">No chapters found</div>';
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
      return;
    }

    state.mangaChaptersData = chaptersData;

    const languages = Object.keys(chaptersData);
    if (languages.length === 0) {
      episodesLoading.classList.remove('active');
      episodesGrid.innerHTML = '<div style="text-align:center;color:#666;padding:20px;grid-column:1/-1">No chapters found</div>';
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
  } catch (error) {
    episodesLoading.classList.remove('active');
    detailError.textContent = error.message;
    detailError.classList.add('active');
  }
}

function renderChapters(lang) {
  episodesGrid.innerHTML = '';
  const chapters = state.mangaChaptersData[lang] || [];

  if (chapters.length === 0) {
    episodesGrid.innerHTML = '<div style="text-align:center;color:#666;padding:20px;grid-column:1/-1">No chapters in this language</div>';
    return;
  }

  chapters.forEach(([chNum, releases]) => {
    const btn = document.createElement('button');
    btn.className = 'episode-btn';
    btn.textContent = `Ch. ${chNum}`;
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
        ${rel.title ? `<div style="font-size:11px;color:#888;margin-top:2px;">${rel.title}</div>` : ''}
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

  try {
    const images = await window.api.images(state.provider, chapterId);

    readerLoading.classList.remove('active');

    if (images.error) {
      readerContent.innerHTML = `<div style="color:#ff6b6b;padding:40px;text-align:center;">Error: ${images.error}</div>`;
      return;
    }

    if (!images || images.length === 0) {
      readerContent.innerHTML = `<div style="color:#888;padding:40px;text-align:center;">No pages found for this chapter</div>`;
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
        img.style.opacity = '0.5';
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
        accumulatedHeight += imgHeight + 10;

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

  } catch (error) {
    readerLoading.classList.remove('active');
    readerContent.innerHTML = `<div style="color:#ff6b6b;padding:40px;text-align:center;">Failed to load chapter pages: ${error.message}</div>`;
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

  try {
    const textHtml = await window.api.text(state.provider, ch.href);

    novelReaderLoading.classList.remove('active');

    if (textHtml.error) {
      novelReaderContent.innerHTML = `<div style="color:#ff6b6b;padding:40px;text-align:center;">Error: ${textHtml.error}</div>`;
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

  } catch (error) {
    novelReaderLoading.classList.remove('active');
    novelReaderContent.innerHTML = `<div style="color:#ff6b6b;padding:40px;text-align:center;">Failed to load chapter text: ${error.message}</div>`;
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
      moduleInfo.textContent = `${data.module} (${state.providerType === 'manga' ? 'Manga' : (state.providerType === 'novel' ? 'Novel' : 'Anime')})`;
    }
  });
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

(async () => {
  const modules = await window.api.getModules();
  if (modules.length === 0) {
    moduleInfo.textContent = 'No modules loaded';
  }
})();

