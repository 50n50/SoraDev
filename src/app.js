/**
 * Frontend app controller for Sora Module Developer
 */

let state = {
  provider: null,
  currentHref: null,
  searchDebounce: null
};

// DOM elements
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
const episodesGrid = document.getElementById('episodesGrid');
const episodesLoading = document.getElementById('episodesLoading');
const streamSection = document.getElementById('streamSection');
const streamInfo = document.getElementById('streamInfo');
const detailError = document.getElementById('detailError');
const streamModal = document.getElementById('streamModal');
const streamModalBody = document.getElementById('streamModalBody');

// Window control buttons
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

// Load module button handler
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
        moduleInfo.classList.add('active');
        moduleInfo.textContent = result.module;
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

// Back button handler
if (backBtn) {
  backBtn.addEventListener('click', () => {
    // Hide detail view
    detailView.classList.remove('active');
    detailView.style.display = 'none';
    
    // Show search section
    searchWrapper.style.display = 'block';
    results.style.display = 'flex';
    
    // If no results, show empty state
    if (results.children.length === 0) {
      emptyState.style.display = 'flex';
    }
  });
}

// Clear search on focus
if (searchInput) {
  searchInput.addEventListener('focus', () => {
    searchInput.value = '';
    results.innerHTML = '';
  });
}

// Perform search
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

// Open detail view
async function openDetail(item) {
  state.currentHref = item.href;

  // Hide search section
  searchWrapper.style.display = 'none';
  emptyState.style.display = 'none';
  results.style.display = 'none';
  
  // Show detail view
  detailView.classList.add('active');
  detailView.style.display = 'block';
  
  episodesSection.style.display = 'none';
  streamSection.classList.remove('active');
  detailError.classList.remove('active');

  // Scroll to top
  document.querySelector('.container').scrollTop = 0;

  posterImg.src = item.image || '';
  detailTitle.textContent = item.title;
  detailMeta.textContent = '';
  detailDesc.textContent = 'Loading...';

  try {
    const details = await window.api.detail(state.provider, state.currentHref);

    if (details.error) {
      detailDesc.textContent = 'Error: ' + details.error;
      detailError.textContent = details.error;
      detailError.classList.add('active');
      return;
    }

    detailDesc.textContent = details.description || 'No description';
    detailMeta.textContent = details.airdate || '';
    episodesSection.style.display = 'block';
    loadEpisodes();
  } catch (error) {
    detailDesc.textContent = 'Failed to load details';
    detailError.textContent = error.message;
    detailError.classList.add('active');
  }
}

// Load episodes
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

    episodes.sort((a, b) => a.number - b.number).forEach(ep => {
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

// Play episode
async function playEpisode(ep) {
  try {
    streamModalBody.textContent = 'Loading stream...';
    streamModal.classList.add('active');

    const stream = await window.api.stream(state.provider, ep.href);

    if (stream.error) {
      streamModalBody.textContent = 'Error: ' + stream.error;
      return;
    }

    // Format the stream response for display
    let html = '';
    
    if (typeof stream === 'string') {
      // Direct URL response
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
      // Raw JSON response
      html = '<strong>Raw Response:</strong><br><code>' + JSON.stringify(stream, null, 2) + '</code>';
    }

    streamModalBody.innerHTML = html;
  } catch (error) {
    streamModalBody.textContent = 'Error: ' + error.message;
  }
}

// Search input with debounce
searchInput.addEventListener('input', () => {
  clearTimeout(state.searchDebounce);
  state.searchDebounce = setTimeout(() => {
    performSearch();
  }, 300);
});

// Initialize
(async () => {
  const modules = await window.api.getModules();
  if (modules.length === 0) {
    moduleInfo.textContent = 'No modules loaded';
  }
})();

