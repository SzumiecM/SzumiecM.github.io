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
    shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
};

// --- Configuration ---
const API_BASE = 'https://de1.api.radio-browser.info/json/stations/search';
const DEFAULT_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTFhMWFhIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMiIgeT0iNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEzIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTYgMnY1Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMyIgcj0iMyIvPjxwYXRoIGQ9Ik02IDEzdi4wMSIvPjxwYXRoIGQ9Ik0xOCAxM3YuMDEiLz48L3N2Zz4=';

// --- State ---
const savedVol = localStorage.getItem('flux_volume');
const state = {
    audio: null,
    pauseTimer: null,
    stations: [],
    favorites: loadFavorites(),
    // Changed: Defaults to 0.15 (15%) if nothing saved
    volume: savedVol !== null ? parseFloat(savedVol) : 0.15,
    currentStation: null,
    view: 'search',
    showTech: false,
    httpsOnly: localStorage.getItem('flux_https') === 'true', 
    anonMode: localStorage.getItem('flux_anon') !== 'false', 
    showIcons: localStorage.getItem('flux_icons') === 'true',
    lastSearch: { term: '', type: 'top' }
};

const els = {
    grid: document.getElementById('station-grid'),
    input: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    player: document.getElementById('player-bar'),
    playBtn: document.getElementById('play-pause-btn'),
    volSlider: document.getElementById('volume-slider'),
    volIconWrapper: document.getElementById('vol-icon-wrapper'),
    viewToggle: document.getElementById('view-toggle'),
    techToggle: document.getElementById('tech-toggle'),
    httpsToggle: document.getElementById('https-toggle'),
    anonToggle: document.getElementById('anon-toggle'),
    iconsToggle: document.getElementById('icons-toggle'),
    playerImg: document.getElementById('player-img'),
    playerTitle: document.getElementById('player-title'),
    playerMeta: document.getElementById('player-meta'),
};

// --- Audio Manager ---
function initAudio(isAnon) {
    if (state.audio) {
        state.audio.pause();
        state.audio.removeAttribute('src');
        state.audio = null;
    }

    state.audio = new Audio();
    
    if (isAnon) {
        state.audio.crossOrigin = "anonymous";
    }

    state.audio.onloadstart = () => {
        els.playBtn.classList.add('loading');
        els.playerMeta.textContent = "Buffering...";
        els.playerMeta.style.color = "var(--text-dim)";
    };
    
    state.audio.onplaying = () => {
        els.playBtn.classList.remove('loading');
        updatePlayerUI(true);
    };
    
    state.audio.onpause = () => updatePlayerUI(false);
    
    state.audio.onerror = (e) => {
        if (!state.audio.src) return; 

        els.playBtn.classList.remove('loading');
        showErrorState("Offline / Blocked", "Try External", state.currentStation?.url_resolved);
    };

    state.audio.volume = state.volume;
    return state.audio;
}

// --- Helpers ---
function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem('flux_favorites'));
        return Array.isArray(stored) ? stored : [];
    } catch { return []; }
}

function getStationImage(url) {
    if (!state.showIcons) return DEFAULT_IMG;
    if (!url || (!url.startsWith('http') && !url.startsWith('data:'))) return DEFAULT_IMG;
    return url;
}

function saveState() {
    localStorage.setItem('flux_favorites', JSON.stringify(state.favorites));
    localStorage.setItem('flux_volume', state.volume);
    localStorage.setItem('flux_https', state.httpsOnly);
    localStorage.setItem('flux_anon', state.anonMode);
    localStorage.setItem('flux_icons', state.showIcons);
}

function sanitizeURL(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (e) {
        return null;
    }
    return null;
}

function createExternalLink(text, url) {
    const safeUrl = sanitizeURL(url);
    if (!safeUrl) return null;

    const a = document.createElement('a');
    a.href = safeUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer"; 
    a.style.cssText = "color:var(--accent); text-decoration:none; margin-left:5px; display:inline-flex; align-items:center;";
    a.textContent = text; 
    
    const iconSpan = document.createElement('span');
    iconSpan.style.marginLeft = "4px";
    iconSpan.innerHTML = ICONS.external;
    a.appendChild(iconSpan);
    
    return a;
}

function showErrorState(msg, linkText, linkUrl) {
    els.playerMeta.innerHTML = '';
    const span = document.createElement('span');
    span.style.color = "var(--danger)";
    span.textContent = msg;
    els.playerMeta.appendChild(span);

    if (linkText && linkUrl) {
        const link = createExternalLink(linkText, linkUrl);
        if (link) els.playerMeta.appendChild(link);
    }
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

    if (type !== 'top') query[type] = term;
    if (state.httpsOnly) query.https = 'true'; 

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
        
        const h4 = document.createElement('h4');
        h4.textContent = station.name;
        
        const p = document.createElement('p');
        p.textContent = `${(station.tags || '').split(',')[0] || 'Radio'} • ${station.countrycode || 'WW'}`;
        
        info.append(h4, p);

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
                
                const span = document.createElement('span');
                span.textContent = `${label}: `;
                const text = document.createTextNode(val || 'N/A');
                
                item.appendChild(span);
                item.appendChild(text);
                tech.appendChild(item);
            };

            addTech('Bitrate', `${station.bitrate} kbps`);
            addTech('Codec', station.codec);

            const clicks = station.clickcount ? station.clickcount.toLocaleString() : '0';
            const votes = station.votes ? station.votes.toLocaleString() : '0';
            addTech('Clicks', clicks);
            addTech('Votes', votes);

            addTech('Stream', station.url_resolved, true);
            
            card.appendChild(tech);
        }

        fragment.appendChild(card);
    });

    els.grid.appendChild(fragment);
}

function playStation(station) {
    if (state.currentStation?.stationuuid === station.stationuuid) {
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

    // Force play via our new togglePlay logic
    state.audio.pause(); 
    state.audio.removeAttribute('src'); // Clean up any prior station buffer
    togglePlay(); 

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: station.tags || 'Live Radio',
            artwork: [{ src: getStationImage(station.favicon) }]
        });
    }
}

function togglePlay() {
    if (!state.currentStation) return;

    if (state.audio.paused || !state.audio.src) {
        // --- PLAY / RESUME ---
        if (state.pauseTimer) {
            clearTimeout(state.pauseTimer);
            state.pauseTimer = null;
        }

        if (!state.audio.src) {
            const streamUrl = sanitizeURL(state.currentStation.url_resolved);
            if (!streamUrl) {
                showErrorState("Invalid Stream URL", null, null);
                return;
            }
            state.audio.src = streamUrl;
            state.audio.load();
        }

        const p = state.audio.play();
        if (p) {
            p.catch(error => {
                console.error("Playback failed:", error);
                showErrorState("Connection Failed.", "Try Direct Link", state.audio.src);
            });
        }
    } else {
        // --- PAUSE ---
        state.audio.pause();
        updatePlayerUI(false);

        state.pauseTimer = setTimeout(() => {
            state.audio.removeAttribute('src'); 
            state.audio.load();                 
            state.pauseTimer = null;
            console.log("Grace period expired: Connection safely closed.");
        }, 15000); 
    }
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
    els.input.onkeydown = (e) => {
        if (e.key === 'Enter') searchStations(els.input.value, 'name');
    };
    
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
        if (state.view === 'search') searchStations(state.lastSearch.term, state.lastSearch.type); 
    };
    if(state.httpsOnly) els.httpsToggle.classList.add('active');

    els.iconsToggle.onclick = () => {
        state.showIcons = !state.showIcons;
        els.iconsToggle.classList.toggle('active', state.showIcons);
        saveState();
        renderGrid(state.view === 'favorites' ? state.favorites : state.stations);
        if(state.currentStation) {
            els.playerImg.src = getStationImage(state.currentStation.favicon);
        }
    };
    if(state.showIcons) els.iconsToggle.classList.add('active');

    els.anonToggle.onclick = () => {
        state.anonMode = !state.anonMode;
        els.anonToggle.classList.toggle('active', state.anonMode);
        saveState();
        
        const currentSrc = state.currentStation ? state.currentStation.url_resolved : null;
        const wasPlaying = !state.audio.paused; 

        initAudio(state.anonMode);

        if (currentSrc) {
            state.audio.src = currentSrc;
            if(wasPlaying) {
                const p = state.audio.play();
                if(p) p.catch(e => console.log("Resume failed:", e));
            }
        }
    };
    if(state.anonMode) els.anonToggle.classList.add('active');
}

function updatePlayerUI(isPlaying) {
    els.playBtn.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    if (!els.playerMeta.querySelector('a') && !els.playerMeta.textContent.includes('Failed')) {
         els.playerMeta.textContent = isPlaying ? "Live" : "Paused";
         els.playerMeta.style.color = isPlaying ? "var(--accent)" : "var(--text-dim)";
    }
}

function updateVolumeIcon() {
    const v = state.volume;
    let icon = ICONS.volHigh;
    if (v < 0.01) icon = ICONS.volMute;
    else if (v < 0.5) icon = ICONS.volLow;
    
    if(els.volIconWrapper) {
        els.volIconWrapper.innerHTML = ''; 
        const temp = document.createElement('div');
        temp.innerHTML = icon;
        els.volIconWrapper.appendChild(temp.firstChild);
    }
}

function injectStaticIcons() {
    const logo = document.querySelector('.logo');
    if(logo && !logo.querySelector('svg')) logo.insertAdjacentHTML('afterbegin', ICONS.radio);
    
    if(els.viewToggle) els.viewToggle.innerHTML = ICONS.heart + " Favs"; 
    if(els.techToggle) els.techToggle.innerHTML = ICONS.info + " Info";
    if(els.httpsToggle) els.httpsToggle.innerHTML = ICONS.lock + " HTTPS";
    if(els.anonToggle) els.anonToggle.innerHTML = ICONS.shield + " Anon";
    if(els.iconsToggle) els.iconsToggle.innerHTML = ICONS.image + " Icons";
}

// --- Boot ---
(function boot() {
    initAudio(state.anonMode);
    injectStaticIcons();
    
    els.volSlider.value = state.volume;
    updateVolumeIcon();

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    }

    setupEvents();
    searchStations('', 'top');
})();