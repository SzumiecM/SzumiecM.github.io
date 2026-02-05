// Configuration
const API_BASE = 'https://de1.api.radio-browser.info/json/stations/search';
const DEFAULT_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTUyMjIyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMiIvPjxwYXRoIGQ9Ik0xNi4yNCA3Ljc2YTYgNiAwIDAgMSAwIDguNDlNMjEuMTkgMi44MWExMCAxMCAwIDAgMSAwIDE4LjM4Ii8+PC9zdmc+';

// Helper: Safely load favorites
function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem('flux_favorites'));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        console.warn('Corrupted favorites data reset.');
        return [];
    }
}

// State
let state = {
    audio: new Audio(),
    stations: [],
    favorites: loadFavorites(),
    volume: parseFloat(localStorage.getItem('flux_volume')) || 1.0,
    currentStation: null,
    isPlaying: false,
    httpsOnly: false, // Default to false so Radio Zet works
    showTech: false,
    view: 'search'
};

// DOM Elements
const els = {
    grid: document.getElementById('station-grid'),
    input: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    player: document.getElementById('player-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    volSlider: document.getElementById('volume-slider'),
    volIcon: document.getElementById('vol-icon'),
    httpsToggle: document.getElementById('https-toggle'),
    viewToggle: document.getElementById('view-toggle'),
    techToggle: document.getElementById('tech-toggle'),
    playerImg: document.getElementById('player-img'),
    playerTitle: document.getElementById('player-title'),
    playerMeta: document.getElementById('player-meta'),
};

// --- Initialization ---
function init() {
    if (window.lucide) lucide.createIcons();

    // Set initial volume
    state.audio.volume = state.volume;
    els.volSlider.value = state.volume;
    updateVolumeIcon(state.volume);

    // Sync toggle UI with state (Fix for the crash)
    updateHttpsButtonUI();

    // Event Listeners
    els.searchBtn.addEventListener('click', () => searchStations(els.input.value, 'name'));
    els.input.addEventListener('keydown', (e) => e.key === 'Enter' && searchStations(els.input.value, 'name'));
    
    document.querySelectorAll('.tags button').forEach(btn => {
        btn.addEventListener('click', () => {
            searchStations(btn.dataset.search, btn.dataset.type);
        });
    });

    els.playBtn.addEventListener('click', togglePlay);
    els.volSlider.addEventListener('input', handleVolumeChange);
    
    // Toggles
    els.httpsToggle.addEventListener('click', () => {
        state.httpsOnly = !state.httpsOnly;
        
        // Update UI
        updateHttpsButtonUI();
        
        // Refresh the search if we are currently searching
        if (state.view === 'search') {
             if(state.stations.length > 0) {
                 const status = document.createElement('div');
                 status.className = 'status-msg';
                 status.textContent = 'Filter changed. Search again to apply.';
                 els.grid.innerHTML = '';
                 els.grid.appendChild(status);
             }
        }
    });

    els.viewToggle.addEventListener('click', () => {
        state.view = state.view === 'search' ? 'favorites' : 'search';
        els.viewToggle.classList.toggle('active', state.view === 'favorites');
        renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
    });

    els.techToggle.addEventListener('click', () => {
        state.showTech = !state.showTech;
        els.techToggle.classList.toggle('active', state.showTech);
        renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
    });

    // Audio Events
    state.audio.addEventListener('loadstart', () => {
        els.playBtn.classList.add('loading');
        els.playerMeta.textContent = "Buffering...";
        els.playerMeta.style.color = "var(--text-dim)";
    });
    
    state.audio.addEventListener('playing', () => {
        els.playBtn.classList.remove('loading');
        updatePlayerState();
    });

    state.audio.addEventListener('pause', updatePlayerState);
    
    state.audio.addEventListener('error', (e) => {
        els.playBtn.classList.remove('loading');
        console.error("Audio Error:", e);
        
        if (state.audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
             els.playerMeta.textContent = "Stream Offline / Blocked";
        } else {
             els.playerMeta.textContent = "Connection Lost";
        }
        els.playerMeta.style.color = "var(--danger)";
    });

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => state.audio.play());
        navigator.mediaSession.setActionHandler('pause', () => state.audio.pause());
    }
    
    // Start with a default search
    searchStations('', 'top');
}

// --- Logic ---

function updateHttpsButtonUI() {
    els.httpsToggle.classList.toggle('active', state.httpsOnly);
    // FIX: Don't look for a span. Rebuild innerHTML safely.
    const text = state.httpsOnly ? ' Secure' : ' All';
    els.httpsToggle.innerHTML = `<i data-lucide="zap"></i>${text}`;
    // Re-render the icon inside the button
    if (window.lucide) lucide.createIcons({ root: els.httpsToggle });
}

function getStationImage(url) {
    if (!url || url === "null" || url === "undefined" || url.trim() === "") {
        return DEFAULT_IMG;
    }
    return url;
}

async function searchStations(term, type) {
    if (type === 'top') els.input.value = '';
    
    els.grid.innerHTML = '<div class="status-msg">Scanning frequencies...</div>';
    state.view = 'search';
    els.viewToggle.classList.remove('active');

    const limit = 50;
    const protocol = state.httpsOnly ? '&protocol=https' : '';
    let url = '';

    if (type === 'top') {
        url = `${API_BASE}?limit=${limit}&order=clickcount&reverse=true${protocol}`;
    } else {
        url = `${API_BASE}?${type}=${encodeURIComponent(term)}&limit=${limit}&order=clickcount&reverse=true${protocol}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        state.stations = data;
        renderGrid(data);
    } catch (e) {
        console.error(e);
        els.grid.innerHTML = '<div class="status-msg" style="color:var(--danger)">Network Error</div>';
    }
}

function renderGrid(stations) {
    els.grid.innerHTML = '';
    
    if (!stations || stations.length === 0) {
        els.grid.innerHTML = '<div class="status-msg">No stations found.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    stations.forEach(station => {
        const isFav = state.favorites.some(f => f.stationuuid === station.stationuuid);
        const isActive = state.currentStation?.stationuuid === station.stationuuid;

        const card = document.createElement('div');
        card.className = `station-card ${isActive ? 'playing' : ''} ${state.showTech ? 'expanded' : ''}`;
        card.onclick = () => playStation(station);

        const headerRow = document.createElement('div');
        headerRow.className = 'card-header';

        const img = document.createElement('img');
        img.className = 'card-img';
        img.src = getStationImage(station.favicon);
        img.onerror = () => img.src = DEFAULT_IMG;

        const info = document.createElement('div');
        info.className = 'card-info';

        const title = document.createElement('h4');
        title.textContent = station.name;

        const meta = document.createElement('p');
        const tagText = (station.tags || '').split(',')[0] || 'Radio'; 
        meta.textContent = `${tagText} • ${station.countrycode || 'WW'}`;

        info.appendChild(title);
        info.appendChild(meta);

        const btn = document.createElement('button');
        btn.className = `fav-btn ${isFav ? 'active' : ''}`;
        btn.title = 'Favorite';
        btn.innerHTML = `<i data-lucide="heart" class="${isFav ? 'fill-current' : ''}"></i>`;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(station);
        });

        headerRow.appendChild(img);
        headerRow.appendChild(info);
        headerRow.appendChild(btn);
        card.appendChild(headerRow);

        if (state.showTech) {
            const techRow = document.createElement('div');
            techRow.className = 'tech-details';

            const createItem = (label, value) => {
                const div = document.createElement('div');
                div.className = 'tech-item';
                const span = document.createElement('span');
                span.textContent = label + ': ';
                div.appendChild(span);
                div.append(value || 'N/A'); 
                return div;
            };

            techRow.appendChild(createItem('Bitrate', `${station.bitrate} kbps`));
            techRow.appendChild(createItem('Codec', station.codec));
            techRow.appendChild(createItem('Clicks', station.clickcount));

            const streamDiv = document.createElement('div');
            streamDiv.className = 'tech-item full';
            const streamLabel = document.createElement('span');
            streamLabel.textContent = 'Stream: ';
            const urlText = document.createTextNode(station.url_resolved || 'Unknown URL');

            streamDiv.appendChild(streamLabel);
            streamDiv.appendChild(urlText);
            techRow.appendChild(streamDiv);
            card.appendChild(techRow);
        }

        fragment.appendChild(card);
    });

    els.grid.appendChild(fragment);
    if (window.lucide) lucide.createIcons({ root: els.grid });
}

function playStation(station) {
    if(state.currentStation?.stationuuid === station.stationuuid && !state.audio.paused) {
        togglePlay();
        return;
    }

    state.currentStation = station;
    els.player.classList.remove('hidden');
    
    els.playerTitle.textContent = station.name;
    els.playerMeta.textContent = "Connecting...";
    els.playerMeta.style.color = "var(--text-dim)";
    
    els.playerImg.src = getStationImage(station.favicon);
    els.playerImg.onerror = () => els.playerImg.src = DEFAULT_IMG;

    renderGrid(state.view === 'favorites' ? state.favorites : state.stations);

    state.audio.src = station.url_resolved; 
    state.audio.load();
    
    const playPromise = state.audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("Playback failed:", error);
            if (error.name === 'NotAllowedError') {
                els.playerMeta.textContent = "Click Play to Start";
            } else if (error.name === 'NotSupportedError') {
                els.playerMeta.textContent = "Format Not Supported";
            } else {
                els.playerMeta.textContent = "Connecting...";
            }
        });
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: station.tags || 'Live Radio',
            artwork: [{ src: getStationImage(station.favicon) }]
        });
    }
}

function togglePlay() {
    if (state.audio.paused) {
        if (!state.audio.src) return;
        state.audio.play();
    } else {
        state.audio.pause();
    }
}

function updatePlayerState() {
    const isPaused = state.audio.paused;
    els.playBtn.innerHTML = isPaused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
    
    if (!isPaused) {
        els.playerMeta.textContent = "Live";
        els.playerMeta.style.color = "var(--accent)";
    } else {
        els.playerMeta.textContent = "Paused";
        els.playerMeta.style.color = "var(--text-dim)";
    }
    if (window.lucide) lucide.createIcons({ root: els.player });
}

function toggleFavorite(station) {
    const idx = state.favorites.findIndex(f => f.stationuuid === station.stationuuid);
    if (idx > -1) {
        state.favorites.splice(idx, 1);
    } else {
        state.favorites.push(station);
    }
    localStorage.setItem('flux_favorites', JSON.stringify(state.favorites));
    renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
}

function handleVolumeChange(e) {
    const val = e.target.value;
    state.audio.volume = val;
    state.volume = val;
    localStorage.setItem('flux_volume', val);
    updateVolumeIcon(val);
}

function updateVolumeIcon(val) {
    if (val == 0) els.volIcon.setAttribute('data-lucide', 'volume-x');
    else if (val < 0.5) els.volIcon.setAttribute('data-lucide', 'volume-1');
    else els.volIcon.setAttribute('data-lucide', 'volume-2');
    if (window.lucide) lucide.createIcons({ root: els.player });
}

init();