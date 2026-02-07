// --- Icons (Zero Dependency) ---
const ICONS = {
    heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    heartFilled: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="filled"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    volHigh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    volLow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volMute: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    radio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="13" rx="2" ry="2"/><path d="M16 2v5"/><circle cx="12" cy="13" r="3"/><path d="M6 13v.01"/><path d="M18 13v.01"/></svg>`,
    external: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
};

// --- Configuration ---
const API_BASE = 'https://de1.api.radio-browser.info/json/stations/search';
const DEFAULT_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTUyMjIyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMiIvPjxwYXRoIGQ9Ik0xNi4yNCA3Ljc2YTYgNiAwIDAgMSAwIDguNDlNMjEuMTkgMi44MWExMCAxMCAwIDAgMSAwIDE4LjM4Ii8+PC9zdmc+';

// --- State ---
const state = {
    audio: null,
    stations: [],
    favorites: loadFavorites(),
    volume: parseFloat(localStorage.getItem('flux_volume')) || 1.0,
    currentStation: null,
    view: 'search',
    showTech: false,
    httpsOnly: localStorage.getItem('flux_https') === 'true', 
    anonMode: localStorage.getItem('flux_anon') !== 'false', // Default TRUE
    lastSearch: { term: '', type: 'top' }
};

const els = {
    grid: document.getElementById('station-grid'),
    input: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    player: document.getElementById('player-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    volSlider: document.getElementById('volume-slider'),
    volIconWrapper: document.querySelector('.player-volume'),
    volIcon: document.getElementById('vol-icon'),
    viewToggle: document.getElementById('view-toggle'),
    techToggle: document.getElementById('tech-toggle'),
    httpsToggle: document.getElementById('https-toggle'),
    anonToggle: document.getElementById('anon-toggle'),
    playerImg: document.getElementById('player-img'),
    playerTitle: document.getElementById('player-title'),
    playerMeta: document.getElementById('player-meta'),
};

// --- Audio Sandbox ---
const AudioSandbox = {
    iframe: null,
    audio: null,
    
    destroy() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = "";
            this.audio.load();
            this.audio = null;
        }
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
    },

    init(isAnon) {
        this.destroy();

        this.iframe = document.createElement('iframe');
        this.iframe.style.display = 'none';
        this.iframe.sandbox = 'allow-same-origin allow-scripts'; 
        document.body.appendChild(this.iframe);

        this.audio = this.iframe.contentDocument.createElement('audio');
        if (isAnon) {
            this.audio.crossOrigin = "anonymous";
        }
        
        this.iframe.contentDocument.body.appendChild(this.audio);
        this.attachEvents();
        
        return this.audio;
    },

    attachEvents() {
        const audio = this.audio;
        if (!audio) return;

        audio.onloadstart = () => {
            els.playBtn.classList.add('loading');
            els.playerMeta.textContent = "Buffering...";
            els.playerMeta.style.color = "var(--text-dim)";
        };
        audio.onplaying = () => {
            els.playBtn.classList.remove('loading');
            updatePlayerUI(true);
        };
        audio.onpause = () => updatePlayerUI(false);
        audio.onerror = (e) => {
            els.playBtn.classList.remove('loading');
            els.playerMeta.innerHTML = `<span style="color:var(--danger)">Offline / Blocked</span> <a href="${state.currentStation?.url_resolved}" target="_blank" style="color:var(--accent);text-decoration:none;">${ICONS.external}</a>`;
        };
    }
};

// --- Helpers ---
function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem('flux_favorites'));
        return Array.isArray(stored) ? stored : [];
    } catch { return []; }
}

function getStationImage(url) {
    return (url && url !== "null" && url.trim() !== "") ? url : DEFAULT_IMG;
}

function saveState() {
    localStorage.setItem('flux_favorites', JSON.stringify(state.favorites));
    localStorage.setItem('flux_volume', state.volume);
    localStorage.setItem('flux_https', state.httpsOnly);
    localStorage.setItem('flux_anon', state.anonMode);
}

// --- Logic ---
async function searchStations(term, type) {
    state.lastSearch = { term, type };

    if (type === 'top') els.input.value = '';
    
    els.grid.innerHTML = '<div class="status-msg">Scanning frequencies...</div>';
    state.view = 'search';
    els.viewToggle.classList.remove('active');

    const limit = state.httpsOnly ? 75 : 50;
    
    const query = {
        limit: limit,
        order: 'clickcount',
        reverse: true
    };

    if (type !== 'top') {
        query[type] = term;
    }

    if (state.httpsOnly) {
        query.https = 'true'; 
    }

    const params = new URLSearchParams(query);

    try {
        const res = await fetch(`${API_BASE}?${params}`);
        let data = await res.json();

        if (state.httpsOnly) {
            data = data.filter(s => s.url_resolved && s.url_resolved.startsWith('https://'));
        }

        state.stations = data;
        renderGrid(state.stations);
    } catch (e) {
        els.grid.innerHTML = '<div class="status-msg" style="color:var(--danger)">Network Error</div>';
    }
}

function renderGrid(stations) {
    els.grid.innerHTML = '';
    
    if (!stations?.length) {
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

        const header = document.createElement('div');
        header.className = 'card-header';

        const img = document.createElement('img');
        img.className = 'card-img';
        img.src = getStationImage(station.favicon);
        img.onerror = () => img.src = DEFAULT_IMG;
        img.referrerPolicy = "no-referrer";

        const info = document.createElement('div');
        info.className = 'card-info';
        info.innerHTML = `<h4>${station.name}</h4><p>${(station.tags || '').split(',')[0] || 'Radio'} • ${station.countrycode || 'WW'}</p>`;

        const btn = document.createElement('button');
        btn.className = `fav-btn ${isFav ? 'active' : ''}`;
        btn.innerHTML = isFav ? ICONS.heartFilled : ICONS.heart;
        btn.onclick = (e) => { e.stopPropagation(); toggleFavorite(station); };

        header.append(img, info, btn);
        card.appendChild(header);

        if (state.showTech) {
            const tech = document.createElement('div');
            tech.className = 'tech-details';
            
            const addTech = (label, val, full = false) => {
                const item = document.createElement('div');
                item.className = `tech-item ${full ? 'full' : ''}`;
                item.innerHTML = `<span>${label}: </span>${val || 'N/A'}`;
                tech.appendChild(item);
            };

            addTech('Bitrate', `${station.bitrate} kbps`);
            addTech('Codec', station.codec);
            addTech('Stream', station.url_resolved, true);
            card.appendChild(tech);
        }

        fragment.appendChild(card);
    });

    els.grid.appendChild(fragment);
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
    els.playerMeta.className = ""; 
    els.playerImg.src = getStationImage(station.favicon);
    els.playerImg.onerror = () => els.playerImg.src = DEFAULT_IMG;

    renderGrid(state.view === 'favorites' ? state.favorites : state.stations);

    const streamUrl = station.url_resolved;

    if (window.location.protocol === 'https:' && streamUrl.startsWith('http:')) {
        els.playerMeta.innerHTML = `<span style="color:var(--danger)">Mixed Content.</span> <a href="${streamUrl}" target="_blank" style="color:var(--accent);text-decoration:none;">Open External ${ICONS.external}</a>`;
    }

    if (streamUrl.includes('.m3u') || streamUrl.includes('.pls')) {
        els.playerMeta.innerHTML = `<span style="color:var(--text-dim)">Format Unsupported.</span> <a href="${streamUrl}" target="_blank" style="color:var(--accent);text-decoration:none;">Download Playlist ${ICONS.external}</a>`;
        return;
    }

    state.audio.pause();
    state.audio.src = "";
    state.audio.load();

    state.audio.src = streamUrl;
    const p = state.audio.play();
    if(p) {
        p.catch(error => {
            console.error("Playback failed:", error);
            if (error.name === 'NotAllowedError') {
                els.playerMeta.textContent = "Autoplay Blocked. Click Play.";
            } else {
                 els.playerMeta.innerHTML = `<span style="color:var(--danger)">Connection Failed.</span> <a href="${streamUrl}" target="_blank" style="color:var(--accent);text-decoration:none;">Try Direct Link ${ICONS.external}</a>`;
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
    if (!state.audio.src) return;
    state.audio.paused ? state.audio.play() : state.audio.pause();
}

function toggleFavorite(station) {
    const idx = state.favorites.findIndex(f => f.stationuuid === station.stationuuid);
    idx > -1 ? state.favorites.splice(idx, 1) : state.favorites.push(station);
    saveState();
    renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
}

// --- Events ---
function setupEvents() {
    els.searchBtn.onclick = () => searchStations(els.input.value, 'name');
    els.input.onkeydown = (e) => e.key === 'Enter' && searchStations(els.input.value, 'name');
    
    document.querySelectorAll('.tags button').forEach(btn => {
        btn.onclick = () => searchStations(btn.dataset.search, btn.dataset.type);
    });

    els.playBtn.onclick = togglePlay;
    els.volSlider.oninput = (e) => {
        state.audio.volume = state.volume = e.target.value;
        saveState();
        updateVolumeIcon();
    };

    const toggleView = (isTech) => {
        if (isTech) state.showTech = !state.showTech;
        else state.view = state.view === 'search' ? 'favorites' : 'search';

        els.techToggle.classList.toggle('active', state.showTech);
        els.viewToggle.classList.toggle('active', state.view === 'favorites');
        renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
    };

    els.viewToggle.onclick = () => toggleView(false);
    els.techToggle.onclick = () => toggleView(true);

    els.httpsToggle.onclick = () => {
        state.httpsOnly = !state.httpsOnly;
        els.httpsToggle.classList.toggle('active', state.httpsOnly);
        saveState();
        if (state.view === 'search') {
             searchStations(state.lastSearch.term, state.lastSearch.type); 
        }
    };
    if(state.httpsOnly) els.httpsToggle.classList.add('active');

    els.anonToggle.onclick = () => {
        state.anonMode = !state.anonMode;
        els.anonToggle.classList.toggle('active', state.anonMode);
        saveState();
        
        const currentSrc = state.currentStation ? state.currentStation.url_resolved : null;
        const wasPlaying = !state.audio.paused; 

        AudioSandbox.destroy();
        
        setTimeout(() => {
            state.audio = AudioSandbox.init(state.anonMode);
            state.audio.volume = state.volume;

            if (currentSrc) {
                state.audio.src = currentSrc;
                state.audio.load();
                
                if(wasPlaying) {
                    const p = state.audio.play();
                    if(p) p.catch(e => console.log("Resume failed:", e));
                }
            }
        }, 100);
    };
    if(state.anonMode) els.anonToggle.classList.add('active');
}

function updatePlayerUI(isPlaying) {
    els.playBtn.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    if (!els.playerMeta.innerHTML.includes('Error') && !els.playerMeta.innerHTML.includes('Failed') && !els.playerMeta.innerHTML.includes('Offline')) {
         els.playerMeta.textContent = isPlaying ? "Live" : "Paused";
         els.playerMeta.style.color = isPlaying ? "var(--accent)" : "var(--text-dim)";
    }
}

function updateVolumeIcon() {
    const v = state.volume;
    let icon = ICONS.volHigh;
    if (v == 0) icon = ICONS.volMute;
    else if (v < 0.5) icon = ICONS.volLow;
    
    if(els.volIconWrapper) {
        const existing = els.volIconWrapper.querySelector('svg');
        if(existing) existing.remove();
        const temp = document.createElement('div');
        temp.innerHTML = icon;
        els.volIconWrapper.insertBefore(temp.firstChild, els.volSlider);
    }
}

function injectStaticIcons() {
    const logo = document.querySelector('.logo');
    if(logo && !logo.querySelector('svg')) logo.insertAdjacentHTML('afterbegin', ICONS.radio);
    
    if(els.viewToggle) els.viewToggle.innerHTML = ICONS.heart + " Favs"; 
    if(els.techToggle) els.techToggle.innerHTML = ICONS.info + " Info";
    if(els.httpsToggle) els.httpsToggle.innerHTML = ICONS.lock + " HTTPS";
    if(els.anonToggle) els.anonToggle.innerHTML = ICONS.shield + " Anon";
}

// --- Boot ---
(function boot() {
    state.audio = AudioSandbox.init(state.anonMode);
    state.audio.volume = state.volume;
    
    injectStaticIcons();
    
    els.volSlider.value = state.volume;
    updateVolumeIcon();

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => state.audio.play());
        navigator.mediaSession.setActionHandler('pause', () => state.audio.pause());
    }

    setupEvents();
    searchStations('', 'top');
})();