/**
 * Fiszki — Pure Vanilla JS Spaced Repetition Flashcards Engine
 * Minimalist • High-Performance • Zero Dependencies
 * Part of SzumiecM.github.io web apps portfolio
 */

(function () {
  'use strict';

  /* ==========================================================================
     STORAGE KEYS & CONSTANTS
     ========================================================================== */
  const STORAGE_KEY_SETTINGS = 'fiszki_settings_v1';
  const STORAGE_KEY_CUSTOM_DECKS = 'fiszki_custom_decks_v1';

  const GROUP_NAMES = {
    all: 'Wszystkie grupy',
    work: '💼 Praca i biznes',
    cooking: '🍳 Kuchnia i kulinaria',
    daily: '☕ Życie codzienne',
    travel: '✈️ Podróże i transport',
    tech: '💻 Technologia i IT',
    phrasals: '⚡ Phrasal Verbs',
    idioms: '🎯 Idiomy',
    advanced: '💎 Zaawansowane C1',
    health: '🩺 Zdrowie i ciało',
    nature: '🌿 Natura i środowisko'
  };

  /* ==========================================================================
     APPLICATION STATE
     ========================================================================== */
  const state = {
    allWords: [], // Combined library: built-in + custom
    customDecks: [],
    cardProgress: {}, // cardId: { b: box (1..5), l: lapses, r: reviews, t: timestamp, lastRating: 1..3 }
    sessionQueue: [], // Array of card objects currently in review
    sessionDifficultCards: [], // Cards rated 1 or 2 during current session for repeat
    currentIndex: 0,
    isFlipped: false,
    streak: 0,
    sessionStats: { reviewed: 0, known: 0, medium: 0, lapsed: 0 },
    settings: {
      voiceAccent: 'en-US', // 'en-US' (default) or 'en-GB'
      speechRate: 0.95,
      autoSpeak: true,
      direction: 'en-pl', // 'en-pl' or 'pl-en'
      activeGroup: 'all',
      activeLevel: 'all',
      scope: 'all', // 'all' or 'due'
      sessionSize: 20
    }
  };

  let availableVoices = [];
  let toastTimeout = null;
  let lastTouchTime = 0;

  /* ==========================================================================
     INDEXEDDB ASYNC STORAGE ENGINE (HIGH PERFORMANCE & ZERO MAIN-THREAD JANK)
     ========================================================================== */
  const DB_NAME = 'fiszki_idb_v1';
  const DB_VERSION = 1;

  const FiszkiDB = {
    dbPromise: null,

    async getDB() {
      if (this.dbPromise) return this.dbPromise;
      if (!('indexedDB' in window)) return null;

      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);

          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('progress')) {
              db.createObjectStore('progress', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('vocabulary')) {
              const vocabStore = db.createObjectStore('vocabulary', { keyPath: 'id' });
              vocabStore.createIndex('by_group', 'group', { unique: false });
              vocabStore.createIndex('by_level', 'level', { unique: false });
            }
            if (!db.objectStoreNames.contains('meta')) {
              db.createObjectStore('meta', { keyPath: 'key' });
            }
          };

          req.onsuccess = (e) => {
            resolve(e.target.result);
          };

          req.onerror = (e) => {
            console.warn('IndexedDB unavailable, falling back to in-memory/localStorage', e);
            resolve(null);
          };
        } catch (err) {
          console.warn('IndexedDB open threw error', err);
          resolve(null);
        }
      });

      return this.dbPromise;
    },

    async getAllProgress() {
      const db = await this.getDB();
      if (!db) return null;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction('progress', 'readonly');
          const store = tx.objectStore('progress');
          const req = store.getAll();
          req.onsuccess = () => {
            const res = {};
            (req.result || []).forEach(item => {
              if (item && item.id) {
                const { id, ...data } = item;
                res[id] = data;
              }
            });
            resolve(res);
          };
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    },

    async saveProgressBatch(itemsMap) {
      const db = await this.getDB();
      if (!db || itemsMap.size === 0) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction('progress', 'readwrite');
          const store = tx.objectStore('progress');
          itemsMap.forEach((prog, id) => {
            store.put({ id, ...prog });
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    },

    async clearAndReplaceProgress(allProgress) {
      const db = await this.getDB();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction('progress', 'readwrite');
          const store = tx.objectStore('progress');
          store.clear();
          Object.entries(allProgress).forEach(([id, prog]) => {
            store.put({ id, ...prog });
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    },

    async getCachedVocabulary() {
      const db = await this.getDB();
      if (!db) return null;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction('vocabulary', 'readonly');
          const store = tx.objectStore('vocabulary');
          const req = store.getAll();
          req.onsuccess = () => {
            resolve(req.result && req.result.length > 0 ? req.result : null);
          };
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    },

    async cacheVocabulary(wordsArray) {
      const db = await this.getDB();
      if (!db || !Array.isArray(wordsArray) || wordsArray.length === 0) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction('vocabulary', 'readwrite');
          const store = tx.objectStore('vocabulary');
          store.clear();
          wordsArray.forEach(w => store.put(w));
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    }
  };

  /* ==========================================================================
     DEBOUNCED BATCH PERSISTENCE & LIFECYCLE MANAGEMENT
     ========================================================================== */
  const pendingProgressUpdates = new Map();
  let progressDebounceTimer = null;

  function queueSaveProgress(cardId = null) {
    if (cardId && state.cardProgress[cardId]) {
      pendingProgressUpdates.set(cardId, state.cardProgress[cardId]);
    }

    if (progressDebounceTimer) {
      clearTimeout(progressDebounceTimer);
    }

    // Debounce to batch multiple ratings into a single off-main-thread write (1200ms)
    progressDebounceTimer = setTimeout(() => {
      flushPendingProgress();
    }, 1200);
  }

  async function flushPendingProgress() {
    if (progressDebounceTimer) {
      clearTimeout(progressDebounceTimer);
      progressDebounceTimer = null;
    }

    if (pendingProgressUpdates.size === 0) return;

    const toSave = new Map(pendingProgressUpdates);
    pendingProgressUpdates.clear();

    // Pure asynchronous write to IndexedDB (off-main-thread, zero jank)
    await FiszkiDB.saveProgressBatch(toSave);
  }

  function saveProgressNow() {
    if (progressDebounceTimer) {
      clearTimeout(progressDebounceTimer);
      progressDebounceTimer = null;
    }

    // If current card has progress, ensure it's in pending map
    if (state.sessionQueue && state.sessionQueue[state.currentIndex]) {
      const cId = state.sessionQueue[state.currentIndex].id;
      if (state.cardProgress[cId]) {
        pendingProgressUpdates.set(cId, state.cardProgress[cId]);
      }
    }

    if (pendingProgressUpdates.size > 0) {
      flushPendingProgress();
    } else {
      FiszkiDB.clearAndReplaceProgress(state.cardProgress);
    }
  }

  // Mobile battery & state protection: Flush writes whenever app is hidden or backgrounded
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingProgress();
    }
  });
  window.addEventListener('pagehide', () => {
    flushPendingProgress();
  });

  /* ==========================================================================
     PRECOMPUTED VOCABULARY INDEX & LOOKUPS (O(1) SCALABILITY)
     ========================================================================== */
  const vocabIndex = {
    byGroup: {},
    byLevel: {},
    cardsById: new Map()
  };

  function mergeAndIndexWords(baseWords) {
    const customCards = [];
    state.customDecks.forEach(deck => {
      if (deck.cards && Array.isArray(deck.cards)) {
        customCards.push(...deck.cards);
      }
    });

    state.allWords = [...baseWords, ...customCards];

    // Rebuild index
    vocabIndex.byGroup = {};
    vocabIndex.byLevel = {};
    vocabIndex.cardsById.clear();

    state.allWords.forEach(card => {
      vocabIndex.cardsById.set(card.id, card);

      if (!vocabIndex.byGroup[card.group]) vocabIndex.byGroup[card.group] = [];
      vocabIndex.byGroup[card.group].push(card);

      if (!vocabIndex.byLevel[card.level]) vocabIndex.byLevel[card.level] = [];
      vocabIndex.byLevel[card.level].push(card);
    });
  }

  /* ==========================================================================
     INITIALIZATION & DATA LOADING
     ========================================================================== */
  async function init() {
    loadSettings();
    await loadProgress();
    loadCustomDecks();
    await loadVocabularyLibrary();
    initSpeechSynthesis();
    setupTouchGestures();
    attachEventListeners();
    applySettingsToUI();
    // Fresh session on page load/reload
    buildSessionQueue();
    renderCurrentCard();

    // Register Service Worker for offline PWA & asset caching
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service Worker registration skipped/failed', err);
      });
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        state.settings = Object.assign(state.settings, JSON.parse(saved));
        if (!state.settings.voiceAccent) {
          state.settings.voiceAccent = 'en-US';
        }
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  async function loadProgress() {
    try {
      const idbProgress = await FiszkiDB.getAllProgress();
      if (idbProgress && typeof idbProgress === 'object') {
        state.cardProgress = idbProgress;
      } else {
        state.cardProgress = {};
      }
    } catch (err) {
      console.warn('IDB progress load error', err);
      state.cardProgress = {};
    }
  }

  function loadCustomDecks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_DECKS);
      if (saved) {
        state.customDecks = JSON.parse(saved);
      }
    } catch (e) {
      state.customDecks = [];
    }
  }

  function saveCustomDecks() {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_DECKS, JSON.stringify(state.customDecks));
    } catch (e) {
      console.warn('Failed saving custom decks', e);
    }
  }

  // Load words from IndexedDB cache immediately (0ms), revalidate via words.json in background
  async function loadVocabularyLibrary() {
    let baseWords = [];

    // Step 1: 0ms Instant startup from IndexedDB cache
    try {
      const cached = await FiszkiDB.getCachedVocabulary();
      if (cached && Array.isArray(cached) && cached.length > 0) {
        baseWords = cached;
        mergeAndIndexWords(baseWords);
      }
    } catch (e) {
      console.warn('Failed reading cached vocabulary from IDB', e);
    }

    // Step 2: Fetch words.json (served via Service Worker or HTTP)
    try {
      const res = await fetch('words.json');
      if (res.ok) {
        const jsonWords = await res.json();
        if (Array.isArray(jsonWords) && jsonWords.length > 0) {
          // If fresh load or word count changed, update memory & IDB
          if (baseWords.length === 0 || jsonWords.length !== baseWords.length) {
            baseWords = jsonWords;
            mergeAndIndexWords(baseWords);
            FiszkiDB.cacheVocabulary(jsonWords);
            buildSessionQueue();
            renderCurrentCard();
          }
        }
      } else {
        console.error('Failed to load words.json: HTTP ' + res.status);
      }
    } catch (err) {
      console.warn('Network fetch words.json failed, relying on offline cache', err);
    }

    if (state.allWords.length === 0) {
      mergeAndIndexWords(baseWords);
    }
  }

  /* ==========================================================================
     AUDIO / WEB SPEECH SYNTHESIS & US/UK ACCENTS
     ========================================================================== */
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      markTTSUnsupported();
      return;
    }

    const cacheVoices = () => {
      try {
        availableVoices = window.speechSynthesis.getVoices() || [];
      } catch (e) {
        availableVoices = [];
      }
    };

    window.speechSynthesis.onvoiceschanged = cacheVoices;
    cacheVoices();
  }

  function markTTSUnsupported() {
    const speakBtn = document.getElementById('btn-speak-front');
    if (speakBtn) {
      speakBtn.classList.add('tts-unsupported');
      speakBtn.setAttribute('title', 'Wymowa audio (TTS) nie jest wspierana w tej przeglądarce');
      speakBtn.setAttribute('aria-label', 'Wymowa audio niedostępna');
      // Visual indicator: Muted speaker with an X
      speakBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      `;
    }

    const voiceSelect = document.getElementById('select-tts-voice');
    if (voiceSelect) {
      voiceSelect.disabled = true;
      voiceSelect.innerHTML = '<option value="">Wymowa audio niedostępna w tej przeglądarce</option>';
    }

    const autoSpeak = document.getElementById('check-auto-speak');
    if (autoSpeak) {
      autoSpeak.disabled = true;
      autoSpeak.checked = false;
    }
  }

  function getBestVoiceForAccent(accent) {
    if (!availableVoices || availableVoices.length === 0) return null;
    const target = accent.toLowerCase().replace('_', '-'); // 'en-us' or 'en-gb'
    const langVoices = availableVoices.filter(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(target);
    });

    if (langVoices.length === 0) {
      const anyEn = availableVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
      return anyEn[0] || null;
    }

    // Prioritize natural/Google voices, then Siri / Natural
    const preferred = langVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Siri'));
    return preferred || langVoices[0];
  }

  function speakEnglishWord(textToSpeak, force = false) {
    if (!textToSpeak) return;

    if (!('speechSynthesis' in window)) {
      if (force) {
        showToast('Wymowa audio (Web Speech API) nie jest wspierana w Twojej przeglądarce.');
      }
      return;
    }

    if (!force && !state.settings.autoSpeak) return;

    const accent = state.settings.voiceAccent || 'en-US';

    try {
      window.speechSynthesis.cancel(); // Stop previous utterance

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = accent;
      utterance.rate = parseFloat(state.settings.speechRate) || 0.95;

      const voice = getBestVoiceForAccent(accent);
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  }

  /* ==========================================================================
     SPACED REPETITION (LEITNER 5-BOX) ALGORITHM & QUEUE
     ========================================================================== */
  function buildSessionQueue(isDueOnly = false) {
    let pool = [...state.allWords];

    // Filter by group
    if (state.settings.activeGroup !== 'all') {
      pool = pool.filter(c => c.group === state.settings.activeGroup);
    }

    // Filter by level
    if (state.settings.activeLevel !== 'all') {
      pool = pool.filter(c => c.level === state.settings.activeLevel);
    }

    // Filter by scope (due/lapsed review only)
    if (isDueOnly || state.settings.scope === 'due') {
      const now = Date.now();
      const intervals = [0, 0, 12 * 3600000, 48 * 3600000, 7 * 86400000, 21 * 86400000];

      pool = pool.filter(c => {
        const p = state.cardProgress[c.id];
        if (!p || !p.r) return false;
        if (p.lastRating === 1 || p.lastRating === 2 || p.b <= 1) return true;
        const interval = intervals[p.b] || (24 * 3600000);
        return (now - (p.t || 0)) >= interval;
      });
    } else {
      // Leitner Priority Score for large decks (1,000+ words):
      // 1. Lapsed / Failed cards (lastRating === 1) -> Score 100+
      // 2. Overdue SRS review cards (Box 2-5 due by interval) -> Score 60-95
      // 3. Fresh unseen cards (never studied) -> Score 40-50
      // 4. Recently reviewed / mastered cards -> Score 10-30
      const now = Date.now();
      const intervals = [0, 0, 12 * 3600000, 48 * 3600000, 7 * 86400000, 21 * 86400000];

      pool.sort((a, b) => {
        const pA = state.cardProgress[a.id];
        const pB = state.cardProgress[b.id];

        const scoreA = getPriorityScore(pA, now, intervals);
        const scoreB = getPriorityScore(pB, now, intervals);

        return scoreB - scoreA;
      });

      // Enforce fixed session length
      const limit = parseInt(state.settings.sessionSize, 10);
      if (limit > 0 && pool.length > limit) {
        pool = pool.slice(0, limit);
      }

      // Slightly shuffle the selected batch so cards don't appear in strict deterministic sequence
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    state.sessionQueue = pool;
    state.sessionDifficultCards = []; // Reset per-session repeat queue
    state.currentIndex = 0;
    state.streak = 0;
    state.sessionStats = { reviewed: 0, known: 0, medium: 0, lapsed: 0 };
    setCardFlipped(false);
  }

  function startRepeatDifficultSession() {
    if (!state.sessionDifficultCards || state.sessionDifficultCards.length === 0) {
      showToast('Brak trudnych słówek do powtórki! 🎉');
      return;
    }

    // Queue ONLY the difficult cards from this session
    state.sessionQueue = [...state.sessionDifficultCards];
    state.sessionDifficultCards = []; // Reset for the retry session
    state.currentIndex = 0;
    state.streak = 0;
    state.sessionStats = { reviewed: 0, known: 0, medium: 0, lapsed: 0 };
    setCardFlipped(false);

    document.getElementById('modal-session-complete').classList.add('hidden');
    renderCurrentCard();
    showToast(`Powtórka: ${state.sessionQueue.length} trudnych słówek`);
  }

  function getPriorityScore(p, now, intervals) {
    if (!p || !p.r) {
      // New / unseen word: steady stream of fresh cards
      return 45 + Math.random() * 5;
    }
    if (p.lastRating === 1 || p.b <= 1) {
      // Lapsed / failed word: top review priority
      return 100 + (p.l || 0) * 10 + Math.random() * 5;
    }
    // Check Leitner interval
    const interval = intervals[p.b] || (24 * 3600000);
    const elapsed = now - (p.t || 0);
    if (elapsed >= interval) {
      // Due for review according to spaced repetition!
      const overdueRatio = elapsed / interval;
      return 65 + Math.min(30, overdueRatio * 5) + Math.random() * 5;
    }
    // Recently mastered / not yet due
    return 10 + (5 - p.b) * 5 + Math.random() * 5;
  }

  /* ==========================================================================
     UI RENDERING
     ========================================================================== */
  function setCardFlipped(flipped) {
    state.isFlipped = flipped;
    const inner = document.getElementById('flashcard-inner');
    if (!inner) return;

    if (flipped) {
      inner.classList.add('flipped');
    } else {
      inner.classList.remove('flipped');
    }
  }

  function toggleFlip() {
    if (state.sessionQueue.length === 0) return;
    setCardFlipped(!state.isFlipped);

    // If learning direction is PL -> EN and card is now flipped to English back, speak English!
    if (state.isFlipped && state.settings.direction === 'pl-en' && state.settings.autoSpeak) {
      const card = state.sessionQueue[state.currentIndex];
      if (card) speakEnglishWord(card.en);
    }
  }

  function renderCurrentCard() {
    const emptyCard = document.getElementById('card-empty-state');
    const completeCard = document.getElementById('card-complete-state');
    const perspectiveBox = document.getElementById('perspective-box');
    const rateButtons = [
      document.getElementById('btn-rate-1'),
      document.getElementById('btn-rate-2'),
      document.getElementById('btn-rate-3')
    ];

    // Case 1: Empty Queue (No matching words for this filter combination)
    if (state.sessionQueue.length === 0) {
      document.getElementById('modal-session-complete').classList.add('hidden');

      if (emptyCard) emptyCard.classList.remove('hidden');
      if (completeCard) completeCard.classList.add('hidden');
      if (perspectiveBox) perspectiveBox.classList.add('hidden');

      rateButtons.forEach(btn => {
        if (btn) btn.classList.add('disabled');
      });

      const groupName = GROUP_NAMES[state.settings.activeGroup] || 'Wybrana grupa';
      const levelName = state.settings.activeLevel === 'all' ? 'Wszystkie poziomy' : state.settings.activeLevel;
      const desc = document.getElementById('empty-state-desc');
      if (desc) {
        if (state.settings.scope === 'due') {
          desc.textContent = 'Brak słówek do powtórki w wybranej grupie. Wszystko powtórzone na czas! 🎉';
        } else {
          const groupName = GROUP_NAMES[state.settings.activeGroup] || 'Wybrana grupa';
          const levelName = state.settings.activeLevel === 'all' ? 'Wszystkie poziomy' : state.settings.activeLevel;
          desc.textContent = `Brak słówek w kombinacji: ${groupName} · Poziom ${levelName}.`;
        }
      }

      document.getElementById('queue-remaining-count').textContent = '0';
      document.getElementById('progress-bar-fill').style.width = '0%';
      document.getElementById('progress-percent').textContent = '0%';
      updateMasterySummary();
      return;
    }

    // Case 2: Session Completed (User reviewed cards and finished queue)
    if (state.currentIndex >= state.sessionQueue.length) {
      document.getElementById('queue-remaining-count').textContent = '0';
      document.getElementById('progress-bar-fill').style.width = '100%';
      document.getElementById('progress-percent').textContent = '100%';

      if (emptyCard) emptyCard.classList.add('hidden');
      if (perspectiveBox) perspectiveBox.classList.add('hidden');
      if (completeCard) completeCard.classList.remove('hidden');

      rateButtons.forEach(btn => {
        if (btn) btn.classList.add('disabled');
      });

      // Update in-stage repeat difficult button
      const btnStageReviewLapsed = document.getElementById('btn-stage-review-lapsed');
      if (btnStageReviewLapsed) {
        const diffCount = (state.sessionDifficultCards || []).length;
        if (diffCount > 0) {
          btnStageReviewLapsed.textContent = `Powtórz trudne (${diffCount})`;
          btnStageReviewLapsed.style.display = 'inline-flex';
        } else {
          btnStageReviewLapsed.style.display = 'none';
        }
      }

      updateMasterySummary();

      if (state.sessionStats.reviewed > 0) {
        showSessionCompleteModal();
      }
      return;
    }

    // Case 3: Active Card
    if (emptyCard) emptyCard.classList.add('hidden');
    if (completeCard) completeCard.classList.add('hidden');
    if (perspectiveBox) perspectiveBox.classList.remove('hidden');
    rateButtons.forEach(btn => {
      if (btn) btn.classList.remove('disabled');
    });

    const card = state.sessionQueue[state.currentIndex];
    const prog = state.cardProgress[card.id] || { b: 1, l: 0, r: 0 };

    const isEnToPl = state.settings.direction === 'en-pl';

    // Group & Level meta
    const groupName = GROUP_NAMES[card.group] || card.group;
    document.getElementById('card-group-badge').textContent = groupName;
    document.getElementById('card-back-group-badge').textContent = groupName;
    document.getElementById('card-level-badge').textContent = card.level || 'A1';
    document.getElementById('card-pos-badge').textContent = card.pos || '';

    // Leitner dots update
    renderLeitnerDots('card-leitner-dots', prog.b);
    renderLeitnerDots('card-back-leitner-dots', prog.b);

    // Front & Back text based on Direction
    if (isEnToPl) {
      // FRONT: English
      document.getElementById('card-front-word').textContent = card.en;
      document.getElementById('card-front-ipa').textContent = card.ipa || '';
      document.getElementById('card-front-example').textContent = card.exEn ? `„${card.exEn}”` : '';

      // BACK: Polish primary + other meanings
      document.getElementById('card-back-primary').textContent = card.pl;
      document.getElementById('card-back-example').textContent = card.exPl ? `„${card.exPl}”` : '';
      renderOtherMeaningsChips(card.otherPl);
    } else {
      // FRONT: Polish
      document.getElementById('card-front-word').textContent = card.pl;
      document.getElementById('card-front-ipa').textContent = card.pos ? `[${card.pos}]` : '';
      document.getElementById('card-front-example').textContent = card.exPl ? `„${card.exPl}”` : '';

      // BACK: English primary + IPA
      document.getElementById('card-back-primary').textContent = card.en;
      document.getElementById('card-back-example').textContent = card.exEn ? `„${card.exEn}”` : '';
      // On back in PL->EN, show IPA and other PL meanings
      renderOtherMeaningsChips(card.otherPl);
    }

    // Session progress numbers
    const remaining = state.sessionQueue.length - state.currentIndex;
    document.getElementById('queue-remaining-count').textContent = remaining;
    document.getElementById('streak-counter').textContent = state.streak;

    const total = state.sessionStats.reviewed + remaining;
    const percent = total > 0 ? Math.round((state.sessionStats.reviewed / total) * 100) : 0;
    document.getElementById('progress-bar-fill').style.width = `${percent}%`;
    document.getElementById('progress-percent').textContent = `${percent}%`;

    // Update bottom mastery totals
    updateMasterySummary();

    // Auto-speak front word if in EN->PL mode
    if (isEnToPl && state.settings.autoSpeak) {
      speakEnglishWord(card.en);
    }
  }

  function renderLeitnerDots(containerId, activeBox) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const boxNum = activeBox || 1;
    for (let i = 1; i <= 5; i++) {
      const dot = document.createElement('span');
      dot.className = `dot ${i <= boxNum ? 'active' : ''}`;
      container.appendChild(dot);
    }
  }

  function renderOtherMeaningsChips(otherPl) {
    const container = document.getElementById('other-meanings-container');
    const list = document.getElementById('card-other-meanings-list');
    if (!list || !container) return;

    list.innerHTML = '';
    if (!otherPl || !Array.isArray(otherPl) || otherPl.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    otherPl.forEach(meaning => {
      const chip = document.createElement('span');
      chip.className = 'meaning-chip';
      chip.textContent = meaning;
      list.appendChild(chip);
    });
  }

  function updateMasterySummary() {
    let known = 0;
    let learning = 0;
    let lapsed = 0;
    let newCards = 0;

    let targetCards = state.allWords;
    if (state.settings.activeGroup !== 'all') {
      targetCards = targetCards.filter(c => c.group === state.settings.activeGroup);
    }
    if (state.settings.activeLevel !== 'all') {
      targetCards = targetCards.filter(c => c.level === state.settings.activeLevel);
    }

    targetCards.forEach(c => {
      const p = state.cardProgress[c.id];
      if (!p || !p.r) {
        newCards++;
      } else if (p.lastRating === 1) {
        lapsed++;
      } else if (p.lastRating === 2) {
        learning++;
      } else {
        known++;
      }
    });

    const elKnown = document.getElementById('stat-known');
    if (elKnown) elKnown.textContent = known;
    const elLearning = document.getElementById('stat-learning');
    if (elLearning) elLearning.textContent = learning;
    const elLapsed = document.getElementById('stat-lapsed');
    if (elLapsed) elLapsed.textContent = lapsed;
    const elNew = document.getElementById('stat-new');
    if (elNew) elNew.textContent = newCards;
  }

  /* ==========================================================================
     RATING ACTIONS (1: NIE ZNAM, 2: ŚREDNIO, 3: ZNAM!)
     ========================================================================== */
  let isRatingInProgress = false;

  function handleRating(level) {
    if (isRatingInProgress) return;
    if (state.sessionQueue.length === 0 || state.currentIndex >= state.sessionQueue.length) return;

    isRatingInProgress = true;
    const currentCard = state.sessionQueue[state.currentIndex];
    if (!currentCard) {
      isRatingInProgress = false;
      return;
    }

    // Visual button pulse feedback for user
    const activeBtn = document.getElementById(`btn-rate-${level}`);
    if (activeBtn) {
      activeBtn.classList.add('btn-rated-active');
      setTimeout(() => activeBtn.classList.remove('btn-rated-active'), 250);
    }

    const prog = state.cardProgress[currentCard.id] || { b: 1, l: 0, r: 0 };
    prog.r = (prog.r || 0) + 1;
    prog.t = Date.now();
    state.sessionStats.reviewed += 1;

    if (level === 1) {
      // 'NIE ZNAM': Reset to Box 1, increment lapses, reset streak
      prog.b = 1;
      prog.l = (prog.l || 0) + 1;
      prog.lastRating = 1;
      state.streak = 0;
      state.sessionStats.lapsed += 1;

      // Track as difficult for per-session repetition
      if (!state.sessionDifficultCards.some(c => c.id === currentCard.id)) {
        state.sessionDifficultCards.push(currentCard);
      }
    } else if (level === 2) {
      // 'ŚREDNIO': Box 2 (in learning), keep streak
      prog.b = 2;
      prog.lastRating = 2;
      state.sessionStats.medium += 1;

      // Track as difficult for per-session repetition
      if (!state.sessionDifficultCards.some(c => c.id === currentCard.id)) {
        state.sessionDifficultCards.push(currentCard);
      }
    } else if (level === 3) {
      // 'ZNAM!': Advance Leitner Box (up to 5), increment streak
      prog.b = Math.min(5, Math.max(2, (prog.b || 1) + 1));
      prog.lastRating = 3;
      state.streak += 1;
      state.sessionStats.known += 1;

      // If mastered, remove from repeat queue
      state.sessionDifficultCards = state.sessionDifficultCards.filter(c => c.id !== currentCard.id);
    }

    state.cardProgress[currentCard.id] = prog;
    queueSaveProgress(currentCard.id);

    // Advance to next card (fixed session length - no reinserting)
    setCardFlipped(false);
    state.currentIndex += 1;

    // Instantly update the bottom mastery summary counters
    updateMasterySummary();

    // Smooth transition to next card or complete state
    setTimeout(() => {
      renderCurrentCard();
      isRatingInProgress = false;
    }, 120);
  }

  /* ==========================================================================
     SESSION SUMMARY MODAL
     ========================================================================== */
  function showSessionCompleteModal() {
    const modal = document.getElementById('modal-session-complete');
    document.getElementById('stat-reviewed-total').textContent = state.sessionStats.reviewed;
    document.getElementById('stat-known-total').textContent = state.sessionStats.known;

    const rate = state.sessionStats.reviewed > 0
      ? Math.round((state.sessionStats.known / state.sessionStats.reviewed) * 100)
      : 100;
    document.getElementById('stat-accuracy-rate').textContent = `${rate}%`;

    // Dynamic lapsed count for repeat buttons in modal
    const diffCount = (state.sessionDifficultCards || []).length;
    const btnReviewLapsed = document.getElementById('btn-review-lapsed-only');
    const btnStageReviewLapsed = document.getElementById('btn-stage-review-lapsed');

    if (diffCount > 0) {
      const text = `Powtórz trudne słówka (${diffCount})`;
      if (btnReviewLapsed) {
        btnReviewLapsed.textContent = text;
        btnReviewLapsed.style.display = 'block';
      }
      if (btnStageReviewLapsed) {
        btnStageReviewLapsed.textContent = text;
        btnStageReviewLapsed.style.display = 'inline-flex';
      }
    } else {
      if (btnReviewLapsed) btnReviewLapsed.style.display = 'none';
      if (btnStageReviewLapsed) btnStageReviewLapsed.style.display = 'none';
    }

    modal.classList.remove('hidden');
  }


  /* ==========================================================================
     DECKS & IMPORT / EXPORT MODAL
     ========================================================================== */
  function renderDecksModal() {
    const grid = document.getElementById('decks-group-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Single-pass O(N) accumulation across all groups
    const stats = {
      all: { count: state.allWords.length, mastered: 0 }
    };
    Object.keys(GROUP_NAMES).forEach(g => {
      if (g !== 'all') stats[g] = { count: 0, mastered: 0 };
    });

    state.allWords.forEach(card => {
      const p = state.cardProgress[card.id];
      const isMastered = p && (p.lastRating === 3 || p.b >= 3);
      if (isMastered) stats.all.mastered++;

      if (stats[card.group]) {
        stats[card.group].count++;
        if (isMastered) stats[card.group].mastered++;
      }
    });

    const groups = Object.keys(GROUP_NAMES);
    groups.forEach(groupKey => {
      const isCurrent = state.settings.activeGroup === groupKey;
      const groupStat = stats[groupKey] || { count: 0, mastered: 0 };
      const count = groupStat.count;
      const mastered = groupStat.mastered;
      const percent = count > 0 ? Math.round((mastered / count) * 100) : 0;

      const cardEl = document.createElement('div');
      cardEl.className = `group-deck-card ${isCurrent ? 'active' : ''}`;
      cardEl.innerHTML = `
        <div class="deck-card-title">
          <span>${GROUP_NAMES[groupKey]}</span>
          ${isCurrent ? '<span style="font-size:0.65rem; color:#34d399;">Aktywna</span>' : ''}
        </div>
        <div class="deck-card-meta">${count} fiszek · ${percent}% opanowane</div>
        <div class="deck-card-progress">
          <div class="deck-card-progress-bar" style="width: ${percent}%"></div>
        </div>
      `;

      cardEl.addEventListener('click', () => {
        state.settings.activeGroup = groupKey;
        saveSettings();
        document.getElementById('select-group-filter').value = groupKey;
        buildSessionQueue();
        renderCurrentCard();
        document.getElementById('modal-decks').classList.add('hidden');
        showToast(`Wybrano: ${GROUP_NAMES[groupKey]}`);
      });

      grid.appendChild(cardEl);
    });
  }

  // CSV / TSV Import: format: en; pl; otherPl; level; group; exEn; exPl
  function importCustomCsv() {
    const textarea = document.getElementById('import-csv-textarea');
    const deckNameInput = document.getElementById('import-deck-name');
    const rawText = (textarea.value || '').trim();

    if (!rawText) {
      showToast('Wklej tekst z fiszkami do zaimportowania.');
      return;
    }

    const lines = rawText.split('\n');
    const newCards = [];
    const deckTitle = deckNameInput.value.trim() || 'Własna talia';
    const deckGroup = 'custom';

    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (!clean) return;

      const delimiter = clean.includes(';') ? ';' : (clean.includes('\t') ? '\t' : '|');
      const parts = clean.split(delimiter).map(p => p.trim());

      if (parts.length >= 2) {
        const otherPl = parts[2] ? parts[2].split(',').map(s => s.trim()).filter(Boolean) : [];
        newCards.push({
          id: `custom_${Date.now()}_${idx}`,
          en: parts[0],
          pl: parts[1],
          otherPl: otherPl,
          level: parts[3] || 'B1',
          group: parts[4] || deckGroup,
          pos: 'custom',
          exEn: parts[5] || '',
          exPl: parts[6] || ''
        });
      }
    });

    if (newCards.length === 0) {
      showToast('Nie rozpoznano formatu. Użyj formatu: en; pl; inne znaczenia');
      return;
    }

    const newDeck = {
      id: `deck_${Date.now()}`,
      title: deckTitle,
      cards: newCards
    };

    state.customDecks.push(newDeck);
    saveCustomDecks();

    // Rebuild library & active queue
    state.allWords.push(...newCards);
    state.settings.activeGroup = 'all';
    saveSettings();
    document.getElementById('select-group-filter').value = 'all';
    buildSessionQueue();
    renderCurrentCard();

    textarea.value = '';
    deckNameInput.value = '';
    document.getElementById('modal-decks').classList.add('hidden');
    showToast(`Zaimportowano pomyślnie ${newCards.length} nowych fiszek!`);
  }

  function exportBackupJson() {
    const backup = {
      app: 'Fiszki_SzumiecM',
      version: 1,
      exportedAt: new Date().toISOString(),
      customDecks: state.customDecks,
      cardProgress: state.cardProgress,
      settings: state.settings
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiszki-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Kopia zapasowa pobrana na dysk!');
  }

  function restoreBackupJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.customDecks && Array.isArray(parsed.customDecks)) {
          state.customDecks = parsed.customDecks;
          saveCustomDecks();
        }
        if (parsed.cardProgress) {
          state.cardProgress = parsed.cardProgress;
          queueSaveProgress();
        }
        if (parsed.settings) {
          state.settings = Object.assign(state.settings, parsed.settings);
          saveSettings();
          applySettingsToUI();
        }

        await loadVocabularyLibrary();
        buildSessionQueue();
        renderCurrentCard();
        document.getElementById('modal-decks').classList.add('hidden');
        showToast('Kopia zapasowa przywrócona pomyślnie!');
      } catch (err) {
        showToast('Błąd parsowania pliku JSON!');
      }
    };
    reader.readAsText(file);
  }

  /* ==========================================================================
     TOUCH & MOBILE SWIPE GESTURES
     ========================================================================== */
  function setupTouchGestures() {
    const cardInner = document.getElementById('flashcard-inner');
    if (!cardInner) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isSwiping = false;

    cardInner.addEventListener('touchstart', (e) => {
      // Don't capture swipe if tapping sound or action button
      if (e.target.closest('button')) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
      isSwiping = true;
    }, { passive: true });

    cardInner.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // If horizontal drag is clearly dominant: provide tilt feedback
      if (absX > absY * 1.2 && absX > 15) {
        const rotate = (diffX / 25).toFixed(2);
        cardInner.style.transform = `translate3d(${diffX}px, 0, 0) rotateZ(${rotate}deg) ${state.isFlipped ? 'rotateY(180deg)' : ''}`;
      }
      // If vertical drag downward on the card is clearly dominant: pull card down with visual feedback for "Średnio"
      else if (diffY > 15 && diffY > absX * 1.2) {
        const scale = Math.max(0.92, 1 - (diffY / 900));
        cardInner.style.transform = `translate3d(0, ${diffY}px, 0) scale(${scale}) ${state.isFlipped ? 'rotateY(180deg)' : ''}`;
      }
    }, { passive: true });

    cardInner.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      lastTouchTime = Date.now();
      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // Reset inline transform to allow clean CSS transitions
      cardInner.style.transform = '';

      // Check if it was a tap (< 15px travel in both dimensions)
      if (absX < 15 && absY < 15) {
        toggleFlip();
        return;
      }

      // Check gestures with strict axis dominance (1.3x) to prevent diagonal misfires
      if (absX >= 60 && absX > absY * 1.3) {
        if (diffX > 0) {
          // Swipe Right -> Znam! (3)
          handleRating(3);
        } else {
          // Swipe Left -> Nie znam (1)
          handleRating(1);
        }
      } else if (diffY >= 60 && diffY > absX * 1.3) {
        // Swipe Down on the card -> Średnio (2)
        handleRating(2);
      }
    }, { passive: true });
  }

  function updateFilterOptions() {
    const levelSelect = document.getElementById('select-level-filter');
    if (!levelSelect) return;

    const levels = ['all', 'A1', 'A2', 'B1', 'B2', 'C1'];
    const levelLabels = {
      all: 'Wszystkie poziomy',
      A1: 'A1 — Początkujący',
      A2: 'A2 — Podstawowy',
      B1: 'B1 — Średni',
      B2: 'B2 — Wyższy średni',
      C1: 'C1 — Zaawansowany'
    };

    const currentGroup = state.settings.activeGroup;

    levelSelect.innerHTML = '';
    levels.forEach(lvl => {
      let count = 0;
      if (currentGroup === 'all') {
        count = lvl === 'all' ? state.allWords.length : (vocabIndex.byLevel[lvl]?.length || 0);
      } else {
        const inGroup = vocabIndex.byGroup[currentGroup] || [];
        count = lvl === 'all' ? inGroup.length : inGroup.filter(c => c.level === lvl).length;
      }

      const opt = document.createElement('option');
      opt.value = lvl;
      opt.textContent = `${levelLabels[lvl]} (${count})`;
      if (lvl === state.settings.activeLevel) opt.selected = true;
      levelSelect.appendChild(opt);
    });
  }

  /* ==========================================================================
     SETTINGS UI & CONTROLS SYNC
     ========================================================================== */
  function applySettingsToUI() {
    // Group dropdown
    const groupSelect = document.getElementById('select-group-filter');
    if (groupSelect) groupSelect.value = state.settings.activeGroup;

    // Update level options with live counts
    updateFilterOptions();

    // Direction button label
    const dirLabel = document.getElementById('direction-label');
    if (dirLabel) {
      dirLabel.textContent = state.settings.direction === 'en-pl' ? 'EN ➔ PL' : 'PL ➔ EN';
    }

    // Scope button
    const scopeBtn = document.getElementById('btn-toggle-scope');
    const scopeText = document.getElementById('scope-pill-text');
    if (scopeBtn && scopeText) {
      if (state.settings.scope === 'due') {
        scopeBtn.classList.add('active');
        scopeText.textContent = 'Do powtórki';
      } else {
        scopeBtn.classList.remove('active');
        scopeText.textContent = 'Wszystkie';
      }
    }

    // Modal settings inputs
    const rateInput = document.getElementById('range-speech-rate');
    const rateLabel = document.getElementById('label-speech-rate');
    if (rateInput && rateLabel) {
      rateInput.value = state.settings.speechRate;
      rateLabel.textContent = `${state.settings.speechRate}x`;
    }

    const autoCheck = document.getElementById('check-auto-speak');
    if (autoCheck) autoCheck.checked = state.settings.autoSpeak;

    const sizeSelect = document.getElementById('select-session-size');
    if (sizeSelect) sizeSelect.value = state.settings.sessionSize;

    const voiceSelect = document.getElementById('select-tts-voice');
    if (voiceSelect) voiceSelect.value = state.settings.voiceAccent || 'en-US';
  }

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  /* ==========================================================================
     EVENT LISTENERS & KEYBOARD SHORTCUTS
     ========================================================================== */
  function attachEventListeners() {
    // 1. Flashcard Flip on Click (Desktop click)
    const cardInner = document.getElementById('flashcard-inner');
    if (cardInner) {
      cardInner.addEventListener('click', (e) => {
        // Prevent touch double-flip
        if (Date.now() - lastTouchTime < 450) return;
        // Prevent flip if clicking top action buttons (sound/flip)
        if (e.target.closest('#btn-speak-front') || e.target.closest('#btn-flip-back')) return;
        toggleFlip();
      });
    }

    document.getElementById('btn-flip-back').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlip();
    });

    document.getElementById('btn-speak-front').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!('speechSynthesis' in window)) {
        showToast('Wymowa audio (Web Speech API) nie jest wspierana w Twojej przeglądarce.');
        return;
      }
      const card = state.sessionQueue[state.currentIndex];
      if (card) speakEnglishWord(card.en, true);
    });

    // 2. Rating buttons (1, 2, 3)
    document.getElementById('btn-rate-1').addEventListener('click', () => handleRating(1));
    document.getElementById('btn-rate-2').addEventListener('click', () => handleRating(2));
    document.getElementById('btn-rate-3').addEventListener('click', () => handleRating(3));

    // 3. Direction Toggle
    document.getElementById('btn-toggle-direction').addEventListener('click', () => {
      state.settings.direction = state.settings.direction === 'en-pl' ? 'pl-en' : 'en-pl';
      saveSettings();
      applySettingsToUI();
      renderCurrentCard();
      showToast(`Kierunek: ${state.settings.direction === 'en-pl' ? 'Angielski ➔ Polski' : 'Polski ➔ Angielski'}`);
    });

    // 4. Group & Level filters
    document.getElementById('select-group-filter').addEventListener('change', (e) => {
      state.settings.activeGroup = e.target.value;
      saveSettings();
      updateFilterOptions();
      buildSessionQueue();
      renderCurrentCard();
    });

    document.getElementById('select-level-filter').addEventListener('change', (e) => {
      state.settings.activeLevel = e.target.value;
      saveSettings();
      buildSessionQueue();
      renderCurrentCard();
    });

    // 5. Scope toggle (All vs Due)
    document.getElementById('btn-toggle-scope').addEventListener('click', () => {
      state.settings.scope = state.settings.scope === 'all' ? 'due' : 'all';
      saveSettings();
      applySettingsToUI();
      buildSessionQueue();
      renderCurrentCard();
    });

    // 6. Decks Modal Open / Close / Import / Export
    document.getElementById('btn-open-decks').addEventListener('click', () => {
      renderDecksModal();
      document.getElementById('modal-decks').classList.remove('hidden');
    });

    document.getElementById('btn-close-decks').addEventListener('click', () => {
      document.getElementById('modal-decks').classList.add('hidden');
    });

    document.getElementById('btn-submit-csv-import').addEventListener('click', importCustomCsv);
    document.getElementById('btn-export-backup').addEventListener('click', exportBackupJson);
    document.getElementById('file-restore-input').addEventListener('change', restoreBackupJson);

    // 7. Settings Modal Controls
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.remove('hidden');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.add('hidden');
    });

    document.getElementById('select-tts-voice').addEventListener('change', (e) => {
      state.settings.voiceAccent = e.target.value;
      saveSettings();
      const card = state.sessionQueue[state.currentIndex];
      if (card) speakEnglishWord(card.en, true);
      showToast(state.settings.voiceAccent === 'en-GB' ? 'Ustawiono akcent brytyjski 🇬🇧' : 'Ustawiono akcent amerykański 🇺🇸');
    });

    document.getElementById('range-speech-rate').addEventListener('input', (e) => {
      state.settings.speechRate = parseFloat(e.target.value);
      document.getElementById('label-speech-rate').textContent = `${state.settings.speechRate}x`;
      saveSettings();
    });

    document.getElementById('check-auto-speak').addEventListener('change', (e) => {
      state.settings.autoSpeak = e.target.checked;
      saveSettings();
    });

    document.getElementById('select-session-size').addEventListener('change', (e) => {
      state.settings.sessionSize = parseInt(e.target.value, 10);
      saveSettings();
      buildSessionQueue();
      renderCurrentCard();
    });

    document.getElementById('btn-reset-current-progress').addEventListener('click', () => {
      let resetCount = 0;
      state.allWords.forEach(card => {
        const matchGroup = state.settings.activeGroup === 'all' || card.group === state.settings.activeGroup;
        const matchLevel = state.settings.activeLevel === 'all' || card.level === state.settings.activeLevel;
        if (matchGroup && matchLevel) {
          delete state.cardProgress[card.id];
          resetCount++;
        }
      });
      saveProgressNow();
      buildSessionQueue();
      renderCurrentCard();
      document.getElementById('modal-settings').classList.add('hidden');
      showToast(`Zresetowano postęp dla ${resetCount} fiszek.`);
    });

    // 8. Session Complete Modal controls
    const btnCloseComplete = document.getElementById('btn-close-complete');
    if (btnCloseComplete) {
      btnCloseComplete.addEventListener('click', () => {
        document.getElementById('modal-session-complete').classList.add('hidden');
      });
    }

    document.getElementById('btn-restart-session').addEventListener('click', () => {
      document.getElementById('modal-session-complete').classList.add('hidden');
      buildSessionQueue(false);
      renderCurrentCard();
    });

    document.getElementById('btn-review-lapsed-only').addEventListener('click', () => {
      startRepeatDifficultSession();
    });

    // 9. Empty State Action Buttons
    const btnEmptyResetLevel = document.getElementById('btn-empty-reset-level');
    if (btnEmptyResetLevel) {
      btnEmptyResetLevel.addEventListener('click', () => {
        state.settings.activeLevel = 'all';
        saveSettings();
        document.getElementById('select-level-filter').value = 'all';
        buildSessionQueue();
        renderCurrentCard();
        showToast('Zresetowano filtr poziomu na: Wszystkie.');
      });
    }

    const btnEmptyResetGroup = document.getElementById('btn-empty-reset-group');
    if (btnEmptyResetGroup) {
      btnEmptyResetGroup.addEventListener('click', () => {
        state.settings.activeGroup = 'all';
        saveSettings();
        document.getElementById('select-group-filter').value = 'all';
        buildSessionQueue();
        renderCurrentCard();
        showToast('Zresetowano filtr grupy na: Wszystkie.');
      });
    }

    // In-stage complete state action buttons
    const btnStageRestart = document.getElementById('btn-stage-restart-session');
    if (btnStageRestart) {
      btnStageRestart.addEventListener('click', () => {
        buildSessionQueue(false);
        renderCurrentCard();
      });
    }

    const btnStageReviewLapsed = document.getElementById('btn-stage-review-lapsed');
    if (btnStageReviewLapsed) {
      btnStageReviewLapsed.addEventListener('click', () => {
        startRepeatDifficultSession();
      });
    }

    // 10. Click backdrop to close any modal
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    // 11. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Never intercept browser shortcuts with modifiers (Ctrl, Cmd, Alt) like Ctrl+R, Ctrl+Shift+R, Ctrl+W, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === '1' || e.code === 'ArrowLeft') {
        e.preventDefault();
        handleRating(1);
      } else if (e.key === '2' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleRating(2);
      } else if (e.key === '3' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleRating(3);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (state.sessionQueue.length > 0 && state.sessionQueue[state.currentIndex]) {
          speakEnglishWord(state.sessionQueue[state.currentIndex].en, true);
        }
      }
    });
  }

  /* ==========================================================================
     STARTUP & LIFECYCLE
     ========================================================================== */
  window.addEventListener('beforeunload', () => {
    saveProgressNow();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
