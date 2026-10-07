/**
 * Hoops — 2D Arcade Basketball Game
 * Zero External Dependencies • Client-Side • Battery-Efficient
 * SzumiecM.github.io/hoops
 */

'use strict';

(function () {
  // ==========================================
  // 1. CONFIGURATION & GAME CONSTANTS
  // ==========================================
  const STORAGE_KEY = 'szumiecm_hoops_save_v1';

  const ACHIEVEMENTS_CATALOG = [
    {
      id: 'first_basket',
      title: 'First Blood',
      desc: 'Score your first basket',
      reward: 'Classic Skin Unlocked',
      skinReward: 'classic'
    },
    {
      id: 'clean_master',
      title: 'Nothing But Net',
      desc: 'Score 3 Clean Shots in a single session',
      reward: 'Watermelon Skin Unlocked',
      skinReward: 'watermelon'
    },
    {
      id: 'streak_5',
      title: 'Heating Up',
      desc: 'Reach a 5-basket streak',
      reward: 'Beach Ball Skin Unlocked',
      skinReward: 'beachball'
    },
    {
      id: 'streak_10',
      title: 'On Fire',
      desc: 'Reach a 10-basket streak',
      reward: 'Fire Ball Skin Unlocked',
      skinReward: 'fire'
    },
    {
      id: 'streak_20',
      title: 'Unstoppable Legend',
      desc: 'Reach a 20-basket streak',
      reward: 'Crown Badge',
      skinReward: null
    },
    {
      id: 'total_50',
      title: 'Veteran Shooter',
      desc: 'Score 50 lifetime baskets',
      reward: '8-Ball Skin Unlocked',
      skinReward: 'eightball'
    },
    {
      id: 'bank_shot',
      title: 'Off the Glass',
      desc: 'Score a basket after bouncing off the backboard',
      reward: 'Trickshot Badge',
      skinReward: null
    },
    {
      id: 'downtown_sniper',
      title: 'From Downtown',
      desc: 'Drain a long bomb basket from 28+ feet away',
      reward: 'Sniper Badge',
      skinReward: null
    }
  ];

  const BALL_SKINS = [
    { id: 'classic', name: 'Classic', desc: 'Standard orange leather' },
    { id: 'watermelon', name: 'Watermelon', desc: 'Crisp green & summer stripes' },
    { id: 'beachball', name: 'Beach Ball', desc: 'Multi-color carnival stripes' },
    { id: 'fire', name: 'Fire Ball', desc: 'Molten core with ember trail' },
    { id: 'eightball', name: '8-Ball', desc: 'Deep glossy pool hall black' }
  ];

  // Progressive Streak Difficulty Tiers (gradual shortening of trajectory arc & static atmosphere colors)
  const STREAK_TIERS = [
    {
      id: 'rookie',
      name: 'ROOKIE',
      minStreak: 0,
      top: [30, 41, 59],
      bottom: [15, 23, 42]
    },
    {
      id: 'heating',
      name: 'HEATING UP',
      minStreak: 3,
      top: [6, 95, 70],
      bottom: [2, 44, 34]
    },
    {
      id: 'sharp',
      name: 'SHARP SHOOTER',
      minStreak: 6,
      top: [88, 28, 135],
      bottom: [30, 27, 75]
    },
    {
      id: 'fire',
      name: 'ON FIRE',
      minStreak: 10,
      top: [124, 45, 18],
      bottom: [69, 10, 10]
    },
    {
      id: 'legend',
      name: 'LEGENDARY',
      minStreak: 15,
      top: [120, 53, 15],
      bottom: [28, 25, 23]
    }
  ];

  // Fine-tuned gradual trajectory shortening across exact streaks
  // Rookie level (streak 0) gives a long full guide (75 dots) clearly dropping through the hoop.
  // Second diff level (streak 3) has 62 dots (smoothly enters hoop), shortening gently dot-by-dot.
  function getTrajectoryDotCount(streak) {
    if (streak <= 0) return 75;
    if (streak === 1) return 71;
    if (streak === 2) return 67;
    if (streak === 3) return 62;
    if (streak === 4) return 58;
    if (streak === 5) return 54;
    if (streak === 6) return 50;
    if (streak === 7) return 46;
    if (streak === 8) return 43;
    if (streak === 9) return 40;
    if (streak <= 11) return 36;
    if (streak <= 14) return 30;
    if (streak <= 17) return 25;
    if (streak <= 21) return 21;
    return Math.max(16, 21 - Math.floor((streak - 21) * 0.5));
  }

  // ==========================================
  // 2. STATE PERSISTENCE & MEMORY BUFFER
  // ==========================================
  const State = {
    // Persistent (buffered in-memory, flushed on events)
    highScore: 0,
    bestStreak: 0,
    lifetimeBaskets: 0,
    lifetimeCleanShots: 0,
    lifetimeBankShots: 0,
    longestShot: 0,
    maxHeight: 0,
    equippedSkin: 'classic',
    unlockedSkins: { classic: true },
    achievements: {},
    isMuted: false,
    hoopSide: 'left', // 'left' (Right-to-Left, default for right-handed mobile players) | 'right' (Left-to-Right)

    // Active Run State (resets on miss)
    score: 0,
    streak: 0,
    sessionCleanShots: 0,
    announcedHighScore: false,
    isDirtyStorage: false,
    isPseudoFullscreen: false,

    // Game lifecycle states: 'SPAWNING' | 'IDLE' | 'AIMING' | 'IN_FLIGHT' | 'RESOLVING'
    phase: 'IDLE',

    // Aiming state
    isAiming: false,
    aimStart: { x: 0, y: 0 },
    aimCurrent: { x: 0, y: 0 },
    aimSmooth: { x: 0, y: 0 },
    pointerId: null,

    // Active shot statistics
    currentShot: {
      rimHits: 0,
      backboardHits: 0,
      scored: false,
      isClean: false,
      enteredFromBelow: false,
      distanceFeet: 22,
      zoneName: '3-POINTER',
      zoneColor: '#10b981',
      minY: 999999,
      apexFeet: 0
    }
  };

  function getCurrentTier() {
    for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
      if (State.streak >= STREAK_TIERS[i].minStreak) {
        return STREAK_TIERS[i];
      }
    }
    return STREAK_TIERS[0];
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.highScore === 'number' && Number.isFinite(parsed.highScore)) {
            State.highScore = Math.max(0, Math.floor(parsed.highScore));
          }
          if (typeof parsed.bestStreak === 'number' && Number.isFinite(parsed.bestStreak)) {
            State.bestStreak = Math.max(0, Math.floor(parsed.bestStreak));
          }
          if (typeof parsed.lifetimeBaskets === 'number' && Number.isFinite(parsed.lifetimeBaskets)) {
            State.lifetimeBaskets = Math.max(0, Math.floor(parsed.lifetimeBaskets));
          }
          const clean = parsed.lifetimeCleanShots ?? parsed.lifetimeSwishes;
          if (typeof clean === 'number' && Number.isFinite(clean)) {
            State.lifetimeCleanShots = Math.max(0, Math.floor(clean));
          }
          if (typeof parsed.lifetimeBankShots === 'number' && Number.isFinite(parsed.lifetimeBankShots)) {
            State.lifetimeBankShots = Math.max(0, Math.floor(parsed.lifetimeBankShots));
          }
          if (typeof parsed.longestShot === 'number' && Number.isFinite(parsed.longestShot)) {
            State.longestShot = Math.max(0, Math.floor(parsed.longestShot));
          }
          if (typeof parsed.maxHeight === 'number' && Number.isFinite(parsed.maxHeight)) {
            State.maxHeight = parsed.maxHeight >= 25 ? Math.floor(parsed.maxHeight) : 0;
          }
          if (typeof parsed.equippedSkin === 'string' && BALL_SKINS.some(s => s.id === parsed.equippedSkin)) {
            State.equippedSkin = parsed.equippedSkin;
          }
          if (parsed.unlockedSkins && typeof parsed.unlockedSkins === 'object' && !Array.isArray(parsed.unlockedSkins)) {
            BALL_SKINS.forEach(skin => {
              if (parsed.unlockedSkins[skin.id] === true) {
                State.unlockedSkins[skin.id] = true;
              }
            });
          }
          if (parsed.achievements && typeof parsed.achievements === 'object' && !Array.isArray(parsed.achievements)) {
            ACHIEVEMENTS_CATALOG.forEach(ach => {
              if (parsed.achievements[ach.id]) {
                State.achievements[ach.id] = parsed.achievements[ach.id];
                if (ach.skinReward) {
                  State.unlockedSkins[ach.skinReward] = true;
                }
              }
            });
          }
          State.isMuted = !!parsed.isMuted;
          State.hoopSide = parsed.hoopSide === 'right' ? 'right' : 'left';
        }
      }
    } catch (e) {
      // Storage unavailable or disabled; keep defaults
    }
    // Always guarantee classic skin is unlocked and valid
    State.unlockedSkins.classic = true;
    if (!State.unlockedSkins[State.equippedSkin]) {
      State.equippedSkin = 'classic';
    }
  }

  let storageFlushTimer = null;
  function scheduleStorageFlush() {
    State.isDirtyStorage = true;
    if (storageFlushTimer) return;
    storageFlushTimer = setTimeout(() => {
      storageFlushTimer = null;
      flushStateToStorage();
    }, 800);
  }

  function flushStateToStorage() {
    if (!State.isDirtyStorage) return;
    try {
      const payload = {
        highScore: State.highScore,
        bestStreak: State.bestStreak,
        lifetimeBaskets: State.lifetimeBaskets,
        lifetimeCleanShots: State.lifetimeCleanShots,
        lifetimeBankShots: State.lifetimeBankShots,
        longestShot: State.longestShot,
        maxHeight: State.maxHeight || 0,
        equippedSkin: State.equippedSkin,
        unlockedSkins: State.unlockedSkins,
        achievements: State.achievements,
        isMuted: State.isMuted,
        hoopSide: State.hoopSide
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      State.isDirtyStorage = false;
    } catch (e) {
      // Ignore quota errors
    }
  }

  // ==========================================
  // 3. MICRO WEB AUDIO API SYNTHESIZER
  // ==========================================
  let audioCtx = null;
  let precomputedSwishBuffer = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    // Pre-allocate white noise buffer once to prevent audio thread GC pauses on mobile
    if (audioCtx && !precomputedSwishBuffer) {
      try {
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.13);
        precomputedSwishBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = precomputedSwishBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
      } catch (e) { }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  const Sound = {
    bounce(strength = 1) {
      if (State.isMuted || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

        const vol = Math.min(0.35 * Math.max(0.2, strength), 0.4);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) { }
        };

        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) { }
    },

    ballHit(strength = 1) {
      if (State.isMuted || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.06);

        const vol = Math.min(0.38, Math.max(0.06, strength * 0.26));
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) { }
        };

        osc.start(now);
        osc.stop(now + 0.075);
      } catch (e) { }
    },

    rimClank() {
      if (State.isMuted || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(550, now);
        filter.Q.setValueAtTime(7.0, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.onended = () => {
          try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) { }
        };

        osc.start(now);
        osc.stop(now + 0.13);
      } catch (e) { }
    },

    swish() {
      if (State.isMuted || !audioCtx || !precomputedSwishBuffer) return;
      try {
        const now = audioCtx.currentTime;
        const noise = audioCtx.createBufferSource();
        noise.buffer = precomputedSwishBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        filter.Q.setValueAtTime(2.2, now);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noise.onended = () => {
          try { noise.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) { }
        };

        noise.start(now);
      } catch (e) { }
    },

    chime(streakTier = 0) {
      if (State.isMuted || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const baseFreq = streakTier >= 2 ? 659.25 : 587.33; // E5 or D5
        const harmonyFreq = streakTier >= 2 ? 987.77 : 880.00; // B5 or A5

        [
          { f: baseFreq, delay: 0 },
          { f: harmonyFreq, delay: 0.055 }
        ].forEach(note => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.delay);

          gain.gain.setValueAtTime(0.001, now + note.delay);
          gain.gain.linearRampToValueAtTime(0.28, now + note.delay + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.38);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.onended = () => {
            try { osc.disconnect(); gain.disconnect(); } catch (e) { }
          };

          osc.start(now + note.delay);
          osc.stop(now + note.delay + 0.4);
        });
      } catch (e) { }
    }
  };

  // ==========================================
  // 4. DOM REFERENCES & UI BINDINGS
  // ==========================================
  const dom = {
    wrapper: document.getElementById('gameWrapper'),
    canvas: document.getElementById('gameCanvas'),
    statsBar: document.getElementById('hudStatsBar'),
    streak: document.getElementById('hudStreak'),
    streakWrap: document.getElementById('hudStreakWrap'),
    streakFlame: document.getElementById('streakFlame'),
    hudMultiplier: document.getElementById('hudMultiplier'),
    score: document.getElementById('hudScore'),
    highScore: document.getElementById('hudHighScore'),
    bestStreak: document.getElementById('hudBestStreak'),
    totalBaskets: document.getElementById('hudTotalBaskets'),
    tierBadge: document.getElementById('hudTierBadge'),
    statHighScore: document.getElementById('statHighScore'),
    statBestStreak: document.getElementById('statBestStreak'),
    statTotalBaskets: document.getElementById('statTotalBaskets'),
    statCleanSwishes: document.getElementById('statCleanSwishes'),
    statMaxHeight: document.getElementById('statMaxHeight'),
    statLongestShot: document.getElementById('statLongestShot'),
    aimHint: document.getElementById('aimHint'),
    btnSettings: document.getElementById('btnSettings'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnLayoutLeft: document.getElementById('btnLayoutLeft'),
    btnLayoutRight: document.getElementById('btnLayoutRight'),
    toggleSound: document.getElementById('toggleSound'),
    btnFullscreen: document.getElementById('btnFullscreen'),
    iconFsEnter: document.getElementById('iconFsEnter'),
    iconFsExit: document.getElementById('iconFsExit'),
    toggleFullscreen: document.getElementById('toggleFullscreen'),
    btnSkins: document.getElementById('btnSkins'),
    skinsModal: document.getElementById('skinsModal'),
    skinsGrid: document.getElementById('skinsGrid'),
    closeSkinsBtn: document.getElementById('closeSkinsBtn'),
    btnEquipSkin: document.getElementById('btnEquipSkin'),
    btnAchievements: document.getElementById('btnAchievements'),
    achievementsModal: document.getElementById('achievementsModal'),
    achievementsList: document.getElementById('achievementsList'),
    closeAchievementsBtn: document.getElementById('closeAchievementsBtn'),
    btnCloseAchievements: document.getElementById('btnCloseAchievements'),
    toast: document.getElementById('achievementToast'),
    toastTitle: document.getElementById('toastTitle'),
    toastReward: document.getElementById('toastReward'),
    hudHeader: document.querySelector('.hud-header'),
    zenPill: document.getElementById('zenPill'),
    zenStreak: document.getElementById('zenStreak'),
    zenStreakWrap: document.getElementById('zenStreakWrap'),
    zenMultiplier: document.getElementById('zenMultiplier'),
    zenScore: document.getElementById('zenScore'),
    zenBtnMenu: document.getElementById('zenBtnMenu'),
    zenBtnExit: document.getElementById('zenBtnExit')
  };

  const ctx = dom.canvas.getContext('2d');

  function updateHUD() {
    const tier = getCurrentTier();

    // 1. Live Streak & Flame Animation in normal HUD
    if (dom.streak) {
      dom.streak.textContent = State.streak;
    }
    if (dom.streakWrap) {
      dom.streakWrap.classList.toggle('streak-active', State.streak >= 3);
      dom.streakWrap.classList.toggle('on-fire', State.streak >= 10);
    }

    // 2. Score & High Score in normal HUD
    if (dom.score) {
      dom.score.textContent = State.score.toLocaleString();
    }
    if (dom.highScore) {
      dom.highScore.textContent = State.highScore.toLocaleString();
    }

    // 3. Streak Multiplier Influence (×1.2, ×1.5, ×2, ×3, ×4+)
    let multiplier = 1.0;
    if (State.streak >= 15) multiplier = 4.0 + (State.streak - 15) * 0.2;
    else if (State.streak >= 10) multiplier = 3.0;
    else if (State.streak >= 6) multiplier = 2.0;
    else if (State.streak >= 3) multiplier = 1.5;
    else if (State.streak >= 2) multiplier = 1.2;

    const multText = `×${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}`;
    const tierClass = multiplier >= 4.0 ? 'tier-4' : (multiplier >= 3.0 ? 'tier-3' : (multiplier >= 2.0 ? 'tier-2' : ''));

    // Apply multiplier badge to normal HUD streak item
    if (dom.hudMultiplier) {
      if (multiplier > 1.0) {
        dom.hudMultiplier.textContent = multText;
        dom.hudMultiplier.className = `combo-badge ${tierClass}`.trim();
      } else {
        dom.hudMultiplier.className = 'combo-badge hidden';
      }
    }

    // Apply reactive milestone border to the normal HUD stats bar capsule
    if (dom.statsBar) {
      dom.statsBar.className = `stats-bar tier-${tier.id}`;
    }

    // 4. Zen Mode Floating Pill: Streak, Multiplier, and Live Score
    if (dom.zenStreak) {
      dom.zenStreak.textContent = State.streak;
    }
    if (dom.zenStreakWrap) {
      dom.zenStreakWrap.classList.toggle('has-streak', State.streak >= 3);
      dom.zenStreakWrap.classList.toggle('on-fire', State.streak >= 10);
    }
    if (dom.zenMultiplier) {
      if (multiplier > 1.0) {
        dom.zenMultiplier.textContent = multText;
        dom.zenMultiplier.className = `zen-combo ${tierClass}`.trim();
      } else {
        dom.zenMultiplier.className = 'zen-combo hidden';
      }
    }
    if (dom.zenScore) {
      dom.zenScore.textContent = State.score.toLocaleString();
    }

    // Career Statistics in Options Modal
    if (dom.statHighScore) dom.statHighScore.textContent = State.highScore.toLocaleString();
    if (dom.statBestStreak) dom.statBestStreak.textContent = State.bestStreak.toLocaleString();
    if (dom.statTotalBaskets) dom.statTotalBaskets.textContent = State.lifetimeBaskets.toLocaleString();
    if (dom.statCleanSwishes) dom.statCleanSwishes.textContent = (State.lifetimeCleanShots || 0).toLocaleString();
    if (dom.statMaxHeight) dom.statMaxHeight.textContent = (State.maxHeight && State.maxHeight > 0) ? `${State.maxHeight} FT` : '--';
    if (dom.statLongestShot) dom.statLongestShot.textContent = `${State.longestShot || 0} FT`;

    // Legacy fallback elements update
    if (dom.bestStreak) dom.bestStreak.textContent = State.bestStreak;
    if (dom.totalBaskets) dom.totalBaskets.textContent = State.lifetimeBaskets;
    if (dom.tierBadge) {
      dom.tierBadge.textContent = tier.name;
      dom.tierBadge.className = `tier-badge tier-${tier.id}`;
    }

    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || State.isPseudoFullscreen);
    if (dom.wrapper) {
      dom.wrapper.className = `game-wrapper tier-${tier.id}${isFs ? ' fullscreen-mode' : ''}`;
    }

    if (dom.iconFsEnter && dom.iconFsExit) {
      dom.iconFsEnter.classList.toggle('hidden', isFs);
      dom.iconFsExit.classList.toggle('hidden', !isFs);
    }
    if (dom.toggleFullscreen) {
      dom.toggleFullscreen.checked = isFs;
    }
    if (dom.zenPill) {
      dom.zenPill.className = `zen-pill tier-${tier.id}${!isFs ? ' hidden' : ''}${State.hoopSide === 'left' ? ' hoop-left' : ' hoop-right'}`;
    }

    if (dom.toggleSound) {
      dom.toggleSound.checked = !State.isMuted;
    }
    if (dom.btnLayoutLeft && dom.btnLayoutRight) {
      dom.btnLayoutLeft.classList.toggle('active', State.hoopSide === 'left');
      dom.btnLayoutRight.classList.toggle('active', State.hoopSide === 'right');
    }
  }

  // Toast Queue for Achievements
  let toastTimer = null;
  function showAchievementToast(ach) {
    dom.toastTitle.textContent = ach.title;
    dom.toastReward.textContent = ach.reward;
    dom.toast.classList.add('toast-show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('toast-show');
    }, 3800);
  }

  function unlockAchievement(id) {
    if (State.achievements[id]) return;
    const ach = ACHIEVEMENTS_CATALOG.find(a => a.id === id);
    if (!ach) return;

    State.achievements[id] = Date.now();
    State.isDirtyStorage = true;

    if (ach.skinReward) {
      State.unlockedSkins[ach.skinReward] = true;
    }

    showAchievementToast(ach);
    scheduleStorageFlush();
  }

  // ==========================================
  // 5. PHYSICS & SIMULATION WORLD
  // ==========================================
  let width = 800;
  let height = 600;
  let dpr = 1;

  // Multi-Ball Physics System
  let ballRadius = 24;
  let nextBallId = 1;
  const balls = [];
  let activeBall = null;

  // Hoop entity (Hoop mounted on upper right)
  const hoop = {
    x: 0,
    y: 0,
    backboardX: 0,
    backboardTop: 0,
    backboardBottom: 0,
    rimBackX: 0,
    rimFrontX: 0,
    rimY: 0,
    rimRadius: 4.5,
    netDepth: 42,
    netPoints: [] // Dynamic spring vertices
  };

  // Playable Court Arena bounds (adapts to widescreen and narrow viewports)
  const court = {
    left: 0,
    width: 800,
    height: 600
  };

  const GRAVITY = 1380; // Newtonian gravity: authentic climb, apex deceleration & plunge
  const SUB_STEPS = 8;
  const K_LAUNCH_X = 4.0; // Calibrated horizontal pull scale for surgical micro-aiming precision
  const K_LAUNCH_Y = 5.4; // Calibrated vertical arc pull scale (generous travel, zero deadband)
  const V_MIN = 25; // Responsive minimum velocity for immediate micro-adjustment tracking
  const V_MAX = 1450; // High ceiling for deep arching shots
  const RESTITUTION_RIM = 0.52; // Authentic steel rim restitution: natural rattles and authentic misses
  const RESTITUTION_BOARD = 0.60; // Glass backboard rebound: requires proper touch/arc, not guaranteed
  const RESTITUTION_FLOOR = 0.58;

  // Object pooling for particles
  const MAX_PARTICLES = 70;
  const particlePool = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 3,
      color: '#fff',
      life: 0,
      maxLife: 1
    });
  }

  function spawnParticle(x, y, vx, vy, radius, color, maxLife) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particlePool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.radius = radius;
        p.color = color;
        p.life = 0;
        p.maxLife = maxLife;
        return p;
      }
    }
  }

  // Floating score text announcements (Canvas-rendered for 0 DOM overhead)
  const floatingTexts = [];
  function addFloatingText(text, x, y, color = '#f59e0b', fontSize = 26) {
    floatingTexts.push({
      text,
      x,
      y,
      startY: y,
      color,
      fontSize,
      alpha: 1,
      scale: 0.6,
      age: 0,
      maxAge: 1.1
    });
  }

  // Responsive Court Recomputation
  function resizeViewport(force = false) {
    const rect = dom.canvas.parentElement.getBoundingClientRect();
    const newWidth = Math.floor(rect.width);
    const newHeight = Math.floor(rect.height);
    const newDpr = Math.min(window.devicePixelRatio || 1, 2.0);

    // Prevent redundant canvas blanking, buffer rebuilds, and hoop jitter
    if (!force && newWidth === width && newHeight === height && Math.abs(newDpr - dpr) < 0.001) {
      updateCanvasRect();
      return;
    }

    width = newWidth;
    height = newHeight;
    dpr = newDpr;

    dom.canvas.width = Math.floor(width * dpr);
    dom.canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    updateCanvasRect();

    // Dynamic Court Measurements
    ballRadius = Math.max(19, Math.min(26, Math.min(width, height) * 0.040));
    balls.forEach(b => {
      b.radius = ballRadius;
    });

    // Dynamic Court Bounds:
    // Full court spanning 100% of viewport on both mobile and widescreen
    court.left = 0;
    court.width = width;
    court.height = height;

    const isWidescreen = width > height * 1.15;
    // Position the Hoop at upper section near screen edge
    const hoopMargin = isWidescreen
      ? Math.max(40, Math.min(95, width * 0.05))
      : Math.max(20, Math.min(38, width * 0.08));

    // Rim dimensions: authentic classic arcade proportion (~2.78x ball radius)
    // Provides healthy clearance for clean swishes on mobile as well as desktop
    hoop.rimRadius = Math.max(2.8, Math.round(ballRadius * 0.14));
    const rimWidth = ballRadius * 2.78;
    // Spaced inner rim from backboard pane for challenging, authentic bank shots
    const bracketLen = Math.max(26, Math.round(ballRadius * 1.2));

    if (State.hoopSide === 'left') {
      hoop.backboardX = hoopMargin;
      hoop.rimBackX = hoop.backboardX + bracketLen;
      hoop.rimFrontX = hoop.rimBackX + rimWidth;
    } else {
      hoop.backboardX = width - hoopMargin;
      hoop.rimBackX = hoop.backboardX - bracketLen;
      hoop.rimFrontX = hoop.rimBackX - rimWidth;
    }

    hoop.y = Math.max(115, Math.min(height * 0.28, height * 0.22 + 40));

    const boardHeight = Math.max(85, Math.min(130, height * 0.17));
    hoop.backboardTop = hoop.y - boardHeight * 0.65;
    hoop.backboardBottom = hoop.y + boardHeight * 0.35;
    hoop.rimY = hoop.y;
    hoop.netDepth = ballRadius * 1.85;

    // Initialize procedural net spring mesh
    initNetMesh();

    // If active ball not yet placed or out of bounds, spawn it
    if (!activeBall || (activeBall.x <= 0 || activeBall.y <= 0 || activeBall.x > width || activeBall.y > height)) {
      spawnBall(false);
    }
  }

  function getBallAltitudeFeet(y) {
    const floorY = height - 12;
    if (y >= 0) {
      // On-screen: authentic scale from 0 FT (floor) to ~10 FT (rim) to ~38 FT (ceiling)
      const ratio = Math.max(0, (floorY - y) / Math.max(10, floorY));
      return Math.max(0, Math.round(38 * ratio));
    } else {
      // Off-screen sky: normalized by screen height so every device scales fairly!
      // Cleared ceiling starts at ~40-45 FT (Sky-Hook)
      // High arc reaches ~80-119 FT (Moonshot)
      // Deep orbit reaches 120+ FT (Stratosphere)
      const skyRatio = -y / Math.max(320, height);
      return Math.round(38 + skyRatio * 58);
    }
  }

  function initNetMesh() {
    hoop.netPoints = [];
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const topX = hoop.rimFrontX + t * (hoop.rimBackX - hoop.rimFrontX);
      const topY = hoop.rimY;
      // Net tapers inwards at the bottom
      const bottomTaper = 0.25;
      const bottomX = hoop.rimFrontX + (t * (1 - bottomTaper * 2) + bottomTaper) * (hoop.rimBackX - hoop.rimFrontX);
      const bottomY = hoop.rimY + hoop.netDepth;

      hoop.netPoints.push({
        topX,
        topY,
        x: bottomX,
        y: bottomY,
        restX: bottomX,
        restY: bottomY,
        vx: 0,
        vy: 0
      });
    }
  }

  function createBall(x, y, animate = true) {
    return {
      id: nextBallId++,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      radius: ballRadius,
      angle: 0,
      angularVelocity: 0,
      originX: x,
      originY: y,
      scale: animate ? 0.15 : 1,
      opacity: animate ? 0.15 : 1,
      isLaunched: false,
      flightTime: 0,
      restTime: 0,
      lastBounceTime: 0,
      lastClankTime: 0,
      lastBallHitTime: 0,
      lifeAfterResolve: 0,
      shotData: {
        rimHits: 0,
        backboardHits: 0,
        scored: false,
        isClean: false,
        enteredFromBelow: false,
        distanceFeet: 20,
        zoneName: 'MID-RANGE',
        zoneColor: '#38bdf8',
        minY: y,
        apexFeet: 0,
        resolved: false
      }
    };
  }

  function spawnBall(animate = true) {
    // If activeBall exists and hasn't launched yet, ensure it is visible and ready
    if (activeBall && !activeBall.isLaunched) {
      if (!animate) {
        activeBall.scale = 1;
        activeBall.opacity = 1;
      }
      return activeBall;
    }

    // Generous court spawn bounds ensuring ball NEVER spawns under or behind hoop:
    let minX, maxX;
    if (State.hoopSide === 'left') {
      minX = hoop.rimFrontX + Math.max(75, ballRadius * 3.8);
      maxX = width - Math.max(50, width * 0.08);
      if (maxX <= minX + 25) {
        minX = hoop.rimFrontX + 35;
        maxX = width - 25;
      }
    } else {
      maxX = hoop.rimFrontX - Math.max(75, ballRadius * 3.8);
      minX = Math.max(50, width * 0.08);
      if (maxX <= minX + 25) {
        maxX = hoop.rimFrontX - 35;
        minX = 25;
      }
    }
    if (maxX <= minX) {
      maxX = minX + 20;
    }

    // Vertical placement: between 46% and 64% of screen height
    const minY = Math.max(hoop.rimY + hoop.netDepth + 45, height * 0.46);
    const maxY = Math.min(height * 0.64, height - 160);

    const originX = minX + Math.random() * (maxX - minX);
    const originY = minY + Math.random() * Math.max(10, maxY - minY);

    const newBall = createBall(originX, originY, animate);

    // Shot Distance & Zone Classification
    const hoopCenterX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const distPx = Math.hypot(originX - hoopCenterX, originY - hoop.rimY);
    const feet = Math.max(12, Math.round(distPx / 22) + 4);
    newBall.shotData.distanceFeet = feet;

    let zoneName = 'MID-RANGE';
    let zoneColor = '#38bdf8';
    if (feet >= 38) {
      zoneName = 'DOWNTOWN';
      zoneColor = '#ef4444';
    } else if (feet >= 28) {
      zoneName = 'DEEP 3PT';
      zoneColor = '#f59e0b';
    } else if (feet >= 22) {
      zoneName = '3-POINTER';
      zoneColor = '#10b981';
    }
    newBall.shotData.zoneName = zoneName;
    newBall.shotData.zoneColor = zoneColor;

    State.currentShot = newBall.shotData;
    activeBall = newBall;
    balls.push(newBall);
    State.phase = 'IDLE';

    return newBall;
  }

  // ==========================================
  // 6. INPUT HANDLING (POINTER EVENTS API)
  // ==========================================
  let cachedCanvasRect = null;
  function updateCanvasRect() {
    cachedCanvasRect = dom.canvas.getBoundingClientRect();
  }

  function getCanvasPointer(e) {
    if (!cachedCanvasRect) updateCanvasRect();
    return {
      x: e.clientX - cachedCanvasRect.left,
      y: e.clientY - cachedCanvasRect.top
    };
  }

  function onPointerDown(e) {
    initAudio();
    wakeGameLoop();

    // Player can shoot whenever active ball is available and not yet launched
    if (!activeBall || activeBall.isLaunched) return;
    if (State.isAiming) return;

    // Close fullscreen menu dropdown if tapping canvas
    if (dom.hudHeader && dom.hudHeader.classList.contains('menu-open')) {
      dom.hudHeader.classList.remove('menu-open');
    }

    // Ignore clicks on header action buttons, modals, modal overlays, or zen pill
    if (e.target && e.target.closest && e.target.closest('button, .modal, .modal-overlay, .stat-pill, .icon-btn, .zen-pill, .hud-header')) {
      return;
    }

    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || State.isPseudoFullscreen);

    // In normal (non-fullscreen) view, leave the top HUD/header region (clientY < 70)
    // completely untouched so Android Chrome native pull-to-refresh executes cleanly
    if (!isFullscreen && e.clientY < 70) {
      return;
    }

    updateCanvasRect();
    const p = getCanvasPointer(e);

    if (e.cancelable) {
      e.preventDefault();
    }

    // Snap activeBall to full scale/opacity immediately if it was scaling in
    activeBall.scale = 1;
    activeBall.opacity = 1;

    // Grab ANYWHERE on the screen to begin aiming!
    State.isAiming = true;
    State.phase = 'AIMING';
    State.pointerId = e.pointerId;
    State.aimStart = { x: p.x, y: p.y };
    State.aimCurrent = { x: p.x, y: p.y };
    State.aimSmooth = { x: p.x, y: p.y };

    try {
      dom.canvas.setPointerCapture(e.pointerId);
    } catch (err) { }

    // Fade out tutorial hint
    if (dom.aimHint) {
      dom.aimHint.classList.add('fade-out');
    }
  }

  function onPointerMove(e) {
    if (!State.isAiming || e.pointerId !== State.pointerId) return;
    wakeGameLoop();

    if (e.cancelable) {
      e.preventDefault();
    }

    // Use latest coalesced event for high-refresh rate mobile displays
    const events = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : [e];
    const latestEvent = events[events.length - 1] || e;
    const p = getCanvasPointer(latestEvent);

    State.aimCurrent.x = p.x;
    State.aimCurrent.y = p.y;
  }

  function computeLaunchVelocity(useSmooth = true) {
    // Relative slingshot vector starting from touch-down point
    const pt = (useSmooth && State.aimSmooth) ? State.aimSmooth : State.aimCurrent;
    const dx = pt.x - State.aimStart.x;
    const dy = pt.y - State.aimStart.y;

    // Launch velocity: v = -k * (Δx, Δy) with calibrated ergonomic travel
    // Responsive vertical pull scaling:
    // Ensures mobile devices with shorter vertical screen space have the ergonomic pull
    // needed to achieve high sky-hooks and 120ft+ Stratosphere shots fairly.
    const screenScaleY = Math.max(1.0, 850 / Math.max(380, height));
    let vx = -K_LAUNCH_X * dx;
    let vy = -K_LAUNCH_Y * dy * (dy > 0 ? screenScaleY : 1.0);

    const speed = Math.hypot(vx, vy);
    // Uncapped strength: you can pull as hard as you want and launch it into space!
    if (speed > 25000) {
      const ratio = 25000 / speed;
      vx *= ratio;
      vy *= ratio;
    }
    return { vx, vy, speed, dragDist: Math.hypot(dx, dy) };
  }

  function onPointerUp(e) {
    if (!State.isAiming || e.pointerId !== State.pointerId) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    try {
      if (dom.canvas.hasPointerCapture && dom.canvas.hasPointerCapture(e.pointerId)) {
        dom.canvas.releasePointerCapture(e.pointerId);
      }
    } catch (err) { }

    State.isAiming = false;
    State.pointerId = null;

    if (activeBall && !activeBall.isLaunched) {
      // Use smoothed aim to prevent finger-release liftoff jitter
      const launch = computeLaunchVelocity(true);

      // Release must have minimum drag distance to shoot (prevents accidental taps)
      if (launch.dragDist >= 6 && launch.speed >= V_MIN) {
        activeBall.vx = launch.vx;
        activeBall.vy = launch.vy;
        // Natural backspin on basketball launch (rotates opposite to flight direction)
        activeBall.angularVelocity = -Math.sign(activeBall.vx || 1) * 4.5 + (activeBall.vx * 0.003);
        activeBall.isLaunched = true;
        activeBall.shotData.minY = activeBall.y;

        // Disengage activeBall so next ball can spawn almost immediately!
        activeBall = null;
        State.spawnCooldown = 0.16; // Snappy 160ms delay (ALMOST instant)
      } else {
        // Cancelled aim
        activeBall.x = activeBall.originX;
        activeBall.y = activeBall.originY;
      }
    }

    State.phase = 'IDLE';
    wakeGameLoop();
  }

  function onPointerCancel(e) {
    if (State.isAiming && e.pointerId === State.pointerId) {
      try {
        if (dom.canvas.hasPointerCapture && dom.canvas.hasPointerCapture(e.pointerId)) {
          dom.canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) { }

      State.isAiming = false;
      State.pointerId = null;
      if (activeBall && !activeBall.isLaunched) {
        activeBall.x = activeBall.originX;
        activeBall.y = activeBall.originY;
      }
      State.phase = 'IDLE';
      wakeGameLoop();
    }
  }

  // ==========================================
  // 7. PHYSICS SIMULATION ENGINE
  // ==========================================

  function updatePhysics(dt) {
    // 1. Spawning countdown for next ball
    if (!activeBall) {
      State.spawnCooldown = (State.spawnCooldown || 0) - dt;
      if (State.spawnCooldown <= 0) {
        spawnBall(true);
      }
    }

    // 2. Active ball scaling pop-in animation
    if (activeBall && !activeBall.isLaunched) {
      if (activeBall.scale < 1) {
        activeBall.scale += (1 - activeBall.scale) * 0.35;
        activeBall.opacity += (1 - activeBall.opacity) * 0.35;
        if (activeBall.scale >= 0.98) {
          activeBall.scale = 1;
          activeBall.opacity = 1;
        }
      }
      activeBall.x = activeBall.originX;
      activeBall.y = activeBall.originY;
    }

    // Sub-stepping integration: adaptive fixed-duration sub-steps (~3ms per step)
    // Completely eliminates penetration spikes and position snapping on mobile!
    const targetStepDt = 1 / 320;
    const steps = Math.min(12, Math.max(4, Math.round(dt / targetStepDt)));
    const subDt = dt / steps;
    const floorY = height - 12;

    for (let step = 0; step < steps; step++) {
      // Step A: Newtonian Kinematics & Court Collisions for each launched ball
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (!b.isLaunched) {
          b.x = b.originX;
          b.y = b.originY;
          continue;
        }

        const prevX = b.x;
        const prevY = b.y;

        // Newtonian kinematics integration (ZERO horizontal drag -> 1:1 match with trajectory)
        b.vy += GRAVITY * subDt;
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;
        if (b.y < b.shotData.minY) {
          b.shotData.minY = b.y;
        }
        b.angle += b.angularVelocity * subDt;
        // Gentle midair rotational damping
        b.angularVelocity *= (1 - 0.12 * subDt);

        // Spin decay when ball is resting or nearly stationary on court surfaces
        if (Math.hypot(b.vx, b.vy) < 25 && (b.y >= floorY - b.radius - 5 || Math.abs(b.y - hoop.rimY) < b.radius * 2)) {
          b.angularVelocity *= (1 - 10.0 * subDt);
        }

        // When ball drops inside the net (between rimY and rimY + netDepth),
        // apply gentle net funneling & nylon drag so it swishes fluidly without snagging
        if (b.shotData.scored && b.y >= hoop.rimY && b.y <= hoop.rimY + hoop.netDepth) {
          b.vx *= (1 - 0.45 * subDt);
          b.vy *= (1 - 0.12 * subDt);
        }

        // Trailing embers for Fire Ball skin
        if (State.equippedSkin === 'fire' && Math.hypot(b.vx, b.vy) > 220) {
          if (Math.random() < 0.3) {
            spawnParticle(
              b.x + (Math.random() * 10 - 5),
              b.y + (Math.random() * 10 - 5),
              (Math.random() - 0.5) * 50 - b.vx * 0.1,
              (Math.random() - 0.5) * 50 - b.vy * 0.1,
              Math.random() * 3 + 2,
              Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
              0.45
            );
          }
        }

        // Collision: Hoop Rim
        checkRimCollisions(b, subDt);

        // Collision: Backboard
        checkBackboardCollision(b);

        // Track if ball passes upwards through the rim cylinder from below (illegal shot)
        const minHoopX = Math.min(hoop.rimFrontX, hoop.rimBackX);
        const maxHoopX = Math.max(hoop.rimFrontX, hoop.rimBackX);
        if (prevY >= hoop.rimY && b.y <= hoop.rimY && b.x >= minHoopX && b.x <= maxHoopX && b.vy < 0) {
          b.shotData.enteredFromBelow = true;
        }

        // Score Trigger Sensor
        checkScoreTrigger(b, prevY, b.y, prevX, b.x);

        // Wall & Floor Collisions
        if (b.y + b.radius >= floorY) {
          b.y = floorY - b.radius;
          if (b.vy > 0) {
            const impact = Math.abs(b.vy) / 600;
            if (b.vy > 35) {
              b.vy = -b.vy * RESTITUTION_FLOOR;
            } else {
              b.vy = 0;
            }
            b.angularVelocity *= 0.75;
            b.vx *= 0.85;

            const now = performance.now();
            if (now - (b.lastBounceTime || 0) > 90 && impact > 0.08) {
              Sound.bounce(impact);
              b.lastBounceTime = now;
            }

            // If ball touched the floor without scoring, shot is officially missed
            if (!b.shotData.scored && !b.shotData.resolved) {
              handleShotMiss(b);
            }
          }
        }

        // Left Wall
        if (b.x - b.radius <= 0 && b.y > 0) {
          b.x = b.radius;
          if (b.vx < 0) b.vx = -b.vx * 0.5;
        }
        // Right Gym Wall
        if (b.x + b.radius >= width && b.y > 0) {
          b.x = width - b.radius;
          if (b.vx > 0) b.vx = -b.vx * 0.5;
        }
        // Extreme ceiling safety
        if (b.y < -15000) {
          b.y = -15000;
          b.vy = 100;
        }

        const curSpeed = Math.hypot(b.vx, b.vy);
        if (curSpeed > 3500) {
          const ratio = 3500 / curSpeed;
          b.vx *= ratio;
          b.vy *= ratio;
        }
        if (Math.abs(b.angularVelocity) > 30) {
          b.angularVelocity = Math.sign(b.angularVelocity) * 30;
        }
      }

      // Step B: Ball-to-Ball Elastic Circle Collision Pass
      for (let i = 0; i < balls.length; i++) {
        const b1 = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          checkBallBallCollision(b1, b2, subDt);
        }
      }
    }

    // Step C: Ball Lifecycle, Timeout & Cleanup
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b === activeBall && !b.isLaunched) continue;

      const ballSpeed = Math.hypot(b.vx, b.vy);
      b.flightTime = (b.flightTime || 0) + dt;

      if (ballSpeed < 25) {
        b.restTime = (b.restTime || 0) + dt;
      } else {
        b.restTime = 0;
      }

      // Unresolved shot resting or timeout check
      if (!b.shotData.resolved) {
        if ((ballSpeed < 25 && b.y >= floorY - b.radius - 2) || b.restTime > 0.85 || b.flightTime > 5.5) {
          if (!b.shotData.scored) {
            handleShotMiss(b);
          }
        } else if (b.y > height + 80 || b.x < -250 || b.x > width + 300) {
          if (!b.shotData.scored) {
            handleShotMiss(b);
          }
        }
      }

      // Once resolved, handle smooth fade-out and removal
      if (b.shotData.resolved) {
        b.lifeAfterResolve = (b.lifeAfterResolve || 0) + dt;
        const isResting = ballSpeed < 35 && b.y >= floorY - b.radius - 5;
        const isCrowded = balls.length > 7;
        if (b.lifeAfterResolve > (isCrowded ? 0.6 : 1.2) || isResting || b.y > height + 60 || b.x < -200 || b.x > width + 250) {
          b.opacity -= dt * (isCrowded ? 2.5 : 1.6);
          if (b.opacity <= 0) {
            balls.splice(i, 1);
          }
        }
      }
    }
  }

  // Realistic elastic circle-circle collision between two balls
  function checkBallBallCollision(b1, b2, subDt) {
    if (b1.opacity < 0.2 || b2.opacity < 0.2 || b1.scale < 0.5 || b2.scale < 0.5) return;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const distSq = dx * dx + dy * dy;
    const r1 = b1.radius * b1.scale;
    const r2 = b2.radius * b2.scale;
    const minDist = r1 + r2;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      const b1Movable = b1.isLaunched;
      const b2Movable = b2.isLaunched;

      // Position separation to prevent overlap/penetration
      if (b1Movable && b2Movable) {
        b1.x -= nx * overlap * 0.5;
        b1.y -= ny * overlap * 0.5;
        b2.x += nx * overlap * 0.5;
        b2.y += ny * overlap * 0.5;
      } else if (b1Movable && !b2Movable) {
        // b2 is anchored at spawn/aim, displace flying b1
        b1.x -= nx * overlap;
        b1.y -= ny * overlap;
      } else if (!b1Movable && b2Movable) {
        // b1 is anchored at spawn/aim, displace flying b2
        b2.x += nx * overlap;
        b2.y += ny * overlap;
      } else {
        return;
      }

      // Velocities along collision normal
      const v1x = b1Movable ? b1.vx : 0;
      const v1y = b1Movable ? b1.vy : 0;
      const v2x = b2Movable ? b2.vx : 0;
      const v2y = b2Movable ? b2.vy : 0;

      const rvx = v1x - v2x;
      const rvy = v1y - v2y;
      const vn = rvx * nx + rvy * ny;

      // vn > 0 means moving toward each other along normal
      if (vn > 0) {
        const RESTITUTION_BALL = 0.83; // Real basketball-on-basketball bounce elasticity
        const impulse = (1 + RESTITUTION_BALL) * vn * 0.5;

        if (b1Movable && b2Movable) {
          b1.vx -= impulse * nx;
          b1.vy -= impulse * ny;
          b2.vx += impulse * nx;
          b2.vy += impulse * ny;
        } else if (b1Movable && !b2Movable) {
          b1.vx -= impulse * 2 * nx;
          b1.vy -= impulse * 2 * ny;
        } else if (!b1Movable && b2Movable) {
          b2.vx += impulse * 2 * nx;
          b2.vy += impulse * 2 * ny;
        }

        // Tangential friction and rotational spin exchange
        const tx = -ny;
        const ty = nx;
        const w1r = b1Movable ? b1.angularVelocity * b1.radius : 0;
        const w2r = b2Movable ? b2.angularVelocity * b2.radius : 0;
        const vt = rvx * tx + rvy * ty + (w1r + w2r);
        const frictionImpulse = Math.min(Math.abs(vt) * 0.16, impulse * 0.28) * Math.sign(vt);

        if (b1Movable) {
          b1.vx -= frictionImpulse * 0.5 * tx;
          b1.vy -= frictionImpulse * 0.5 * ty;
          b1.angularVelocity -= (frictionImpulse * 0.5) / b1.radius;
        }
        if (b2Movable) {
          b2.vx += frictionImpulse * 0.5 * tx;
          b2.vy += frictionImpulse * 0.5 * ty;
          b2.angularVelocity -= (frictionImpulse * 0.5) / b2.radius;
        }

        // Audio and particle sparks
        const now = performance.now();
        if (now - (b1.lastBallHitTime || 0) > 65 && now - (b2.lastBallHitTime || 0) > 65) {
          b1.lastBallHitTime = now;
          b2.lastBallHitTime = now;
          const impact = Math.abs(vn);
          if (impact > 35) {
            Sound.ballHit(Math.min(1.4, impact / 420));
            const contactX = b1.x + nx * r1;
            const contactY = b1.y + ny * r1;
            for (let k = 0; k < 3; k++) {
              spawnParticle(
                contactX,
                contactY,
                (Math.random() - 0.5) * 70,
                (Math.random() - 0.5) * 70,
                2.2,
                '#f97316',
                0.22
              );
            }
          }
        }
      }
    }
  }

  function triggerRimHitSound(b, x, y) {
    const now = performance.now();
    if (now - (b.lastClankTime || 0) > 115) {
      Sound.rimClank();
      b.lastClankTime = now;
      for (let k = 0; k < 2; k++) {
        spawnParticle(
          x,
          y,
          (Math.random() - 0.5) * 80,
          -40 - Math.random() * 50,
          2,
          '#fb923c',
          0.2
        );
      }
    }
  }

  function collideWithPeg(b, px, py, isBackRim = false) {
    const dx = b.x - px;
    const dy = b.y - py;
    const dist = Math.hypot(dx, dy);
    const minDist = b.radius + hoop.rimRadius;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const vn = b.vx * nx + b.vy * ny;

      // Full penetration resolution (prevents sinking or sticking)
      const penetration = minDist - dist;
      b.x += nx * penetration;
      b.y += ny * penetration;

      const minRimX = Math.min(hoop.rimFrontX, hoop.rimBackX);
      const maxRimX = Math.max(hoop.rimFrontX, hoop.rimBackX);
      // If ball is descending cleanly into the hoop opening, funnel it down without upward kickback
      const isEnteringOpening = b.vy > 0 && b.y >= hoop.rimY - 6 && b.x > minRimX + 3 && b.x < maxRimX - 3;

      if (vn < 0) {
        if (isEnteringOpening) {
          // Ball is plunging downward into the hoop cylinder: guide inward without upward stopping kickback
          b.vx -= (1 + RESTITUTION_RIM * 0.4) * vn * nx;
          if (b.vy < 35) b.vy = 35;
        } else if (vn < -15) {
          // Elastic reflection for genuine impacts
          b.vx -= (1 + RESTITUTION_RIM) * vn * nx;
          b.vy -= (1 + RESTITUTION_RIM) * vn * ny;
          b.shotData.rimHits++;
          triggerRimHitSound(b, px, py);
        } else {
          // Resting contact: cancel normal velocity to prevent sinking under gravity
          b.vx -= vn * nx;
          b.vy -= vn * ny;
        }

        // Tangential friction during contact
        const tx = -ny;
        const ty = nx;
        const vt = b.vx * tx + b.vy * ty;
        const surfaceSpeed = b.angularVelocity * b.radius;
        const slip = vt - surfaceSpeed;
        const frictionImpulse = Math.min(Math.abs(slip) * 0.15, Math.abs(vn) * 0.12) * Math.sign(slip);

        b.vx -= frictionImpulse * tx;
        b.vy -= frictionImpulse * ty;
        b.angularVelocity += (frictionImpulse * 0.35) / b.radius;

        return true;
      }
    }
    return false;
  }

  function checkRimCollisions(b, subDt) {
    // If ball scored and traveling downward in net, bypass rim colliders
    if (b.shotData.scored && b.y >= hoop.rimY) return;

    const r = b.radius;
    const courtDir = State.hoopSide === 'left' ? 1 : -1;

    // Bracket collar connecting back rim to backboard:
    // Acts as an angled deflector flange sloping into the court/hoop so ball never wedges
    const bracketMinX = Math.min(hoop.backboardX, hoop.rimBackX);
    const bracketMaxX = Math.max(hoop.backboardX, hoop.rimBackX);

    if (b.x >= bracketMinX - 2 && b.x <= bracketMaxX + 2) {
      if (b.y + r >= hoop.rimY - 4 && b.y - r <= hoop.rimY + 4) {
        if (b.y < hoop.rimY) {
          // Top of bracket: smoothly guide forward towards hoop so it doesn't wedge in the corner
          b.y = hoop.rimY - 4 - r;
          b.vx += courtDir * (280 * (subDt || 0.003));
          if (b.vy > 0) {
            b.vy = -b.vy * 0.4;
          }
          if (b.vy < -25) {
            b.shotData.rimHits++;
            triggerRimHitSound(b, b.x, hoop.rimY);
          }
        } else if (b.vy < 0 && b.y > hoop.rimY) {
          // Underside of bracket: bounce downward
          b.y = hoop.rimY + 4 + r;
          b.vy = -b.vy * RESTITUTION_RIM;
          return;
        }
      }
    }

    // Front Rim Peg (outer court-facing peg, full circle)
    collideWithPeg(b, hoop.rimFrontX, hoop.rimY, false);

    // Back Rim Peg (inner court-facing peg, full circle)
    collideWithPeg(b, hoop.rimBackX, hoop.rimY, true);
  }

  function checkBackboardCollision(b) {
    const courtDir = State.hoopSide === 'left' ? 1 : -1;
    const faceX = hoop.backboardX + courtDir * 4.5;
    const topY = hoop.backboardTop;
    const bottomY = hoop.backboardBottom;
    const r = b.radius;

    // 1. Front face collision (vertical board segment between topY and bottomY)
    if (b.y >= topY && b.y <= bottomY) {
      const distToFace = (b.x - faceX) * courtDir;
      if (distToFace < r && distToFace > -r * 1.5) {
        b.x = faceX + courtDir * r;
        const vn = b.vx * courtDir;
        if (vn < -4) {
          b.vx = -vn * RESTITUTION_BOARD * courtDir;
          b.vy *= 0.92;
          b.angularVelocity *= 0.8;
          const MAX_ANGULAR_VEL = 22;
          b.angularVelocity = Math.max(-MAX_ANGULAR_VEL, Math.min(MAX_ANGULAR_VEL, b.angularVelocity));

          b.shotData.backboardHits++;
          if (performance.now() - (b.lastClankTime || 0) > 85) {
            Sound.rimClank();
            b.lastClankTime = performance.now();
          }
        }
        return;
      }
    }

    // 2. Corner peg collisions (rounded corner tips at backboard top and bottom edges)
    collideWithPeg(b, faceX, topY, false);
    collideWithPeg(b, faceX, bottomY, false);
  }

  function checkScoreTrigger(b, prevY, currY, prevX, currX) {
    if (b.shotData.scored) return;
    if (b.shotData.enteredFromBelow) return;

    // Rim opening sensor: ball cleanly crosses the horizontal rim plane inside the opening
    const minRimX = Math.min(hoop.rimFrontX, hoop.rimBackX);
    const maxRimX = Math.max(hoop.rimFrontX, hoop.rimBackX);

    const sensorMargin = b.radius * 0.28;
    const sensorLeft = minRimX + sensorMargin;
    const sensorRight = maxRimX - sensorMargin;

    // Downward descent strictly crossing through the rim plane
    if (prevY <= hoop.rimY && currY >= hoop.rimY && b.vy > 0) {
      if (b.x >= sensorLeft && b.x <= sensorRight) {
        b.shotData.scored = true;
        handleScoreSuccess(b);
      }
    }
  }

  function handleScoreSuccess(b) {
    const shot = b.shotData;
    // Clean shot: pure swish that never touched the rim or backboard
    const isClean = shot.rimHits === 0 && shot.backboardHits === 0;
    const isBank = shot.backboardHits > 0;
    const isRattle = shot.rimHits >= 2;
    shot.isClean = isClean;

    State.streak++;
    if (State.streak > State.bestStreak) {
      State.bestStreak = State.streak;
    }

    State.lifetimeBaskets++;
    if (isClean) {
      State.lifetimeCleanShots++;
      State.sessionCleanShots++;
    }
    if (isBank) {
      State.lifetimeBankShots = (State.lifetimeBankShots || 0) + 1;
    }
    const distFeet = shot.distanceFeet || 20;
    if (distFeet > (State.longestShot || 0)) {
      State.longestShot = distFeet;
    }

    // Apex Height calculation: strictly scarce — only shots that actively went outside the top of the screen
    const isOffscreen = shot.minY < -b.radius;
    let apexFeet = 0;
    if (isOffscreen) {
      apexFeet = getBallAltitudeFeet(shot.minY);
      shot.apexFeet = apexFeet;
      if (apexFeet > (State.maxHeight || 0)) {
        State.maxHeight = apexFeet;
      }
    } else {
      shot.apexFeet = 0;
    }

    // ==========================================
    // EXCITING DEEP SCORING CALCULATION
    // ==========================================
    // 1. Base Score
    const basePoints = 100;

    // 2. Style Bonus
    let styleBonus = 0;
    let styleLabel = '';
    if (isClean) {
      styleBonus = 150;
      styleLabel = 'SWISH';
    } else if (isBank) {
      styleBonus = 80;
      styleLabel = 'BANK SHOT';
    } else if (isRattle) {
      styleBonus = 40;
      styleLabel = 'RATTLE';
    }

    // 3. Distance Bonus
    let distBonus = 25;
    let distLabel = `${distFeet}FT`;
    if (distFeet >= 38) {
      distBonus = 250;
      distLabel = 'DOWNTOWN';
    } else if (distFeet >= 28) {
      distBonus = 120;
      distLabel = 'DEEP 3';
    } else if (distFeet >= 22) {
      distBonus = 60;
    }

    // 4. Moonshot / Stratosphere Bonus (Strictly scarce: exclusively for off-screen shots!)
    // Balanced: standard off-screen (Sky-Hook, Moonshot), Stratosphere (120ft+), and Deep Space (160ft+).
    // Hard-capped at 1,000 pts max so single-shot tricks cannot rival dedicated streak building!
    let heightBonus = 0;
    let heightLabel = '';
    if (isOffscreen) {
      if (apexFeet >= 160) {
        heightLabel = 'DEEP SPACE! 🌌';
        const excess = apexFeet - 160;
        heightBonus = Math.min(1000, Math.round(700 + excess * 5));
      } else if (apexFeet >= 120) {
        heightLabel = 'STRATOSPHERE! 🛰️';
        const excess = apexFeet - 120;
        heightBonus = Math.min(650, Math.round(400 + excess * 6.5));
      } else if (apexFeet >= 80) {
        heightLabel = 'MOONSHOT! 🌙';
        const excess = apexFeet - 80;
        heightBonus = Math.round(160 + excess * 5);
      } else {
        heightLabel = 'SKY-HOOK! 🚀';
        const excess = Math.max(0, apexFeet - 38);
        heightBonus = Math.round(50 + excess * 2.5);
      }
    }

    // 5. Streak Combo Multiplier
    let multiplier = 1.0;
    if (State.streak >= 15) {
      multiplier = 4.0 + (State.streak - 15) * 0.2;
    } else if (State.streak >= 10) {
      multiplier = 3.0;
    } else if (State.streak >= 6) {
      multiplier = 2.0;
    } else if (State.streak >= 3) {
      multiplier = 1.5;
    } else if (State.streak >= 2) {
      multiplier = 1.2;
    }

    // Total points for this shot
    const shotPoints = Math.round((basePoints + styleBonus + distBonus + heightBonus) * multiplier);
    State.score += shotPoints;

    let isNewBestRun = false;
    if (State.score > State.highScore) {
      if (State.highScore > 0 && !State.announcedHighScore) {
        isNewBestRun = true;
        State.announcedHighScore = true;
      }
      State.highScore = State.score;
    }

    State.isDirtyStorage = true;
    updateHUD();

    // Audio effects: Swish + Chime
    Sound.swish();
    setTimeout(() => {
      const chimeTone = isClean
        ? (State.streak >= 15 ? 4 : State.streak >= 10 ? 3 : State.streak >= 6 ? 2 : 1)
        : (multiplier >= 2 ? 2 : 1);
      Sound.chime(chimeTone);
    }, 45);

    // Dynamic Net Rip - pull net vertices down & outwards
    hoop.netPoints.forEach((p, idx) => {
      p.vy += 320 + Math.random() * 80;
      p.vx += (idx < hoop.netPoints.length / 2 ? -1 : 1) * (45 + Math.random() * 30);
    });

    // Visual Floating Announcements
    const midRimX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const scoreColor = isClean ? '#38bdf8' : (multiplier >= 2 ? '#fbbf24' : '#f59e0b');

    // 1. Primary Points popup
    addFloatingText(`+${shotPoints.toLocaleString()} PTS!`, midRimX, hoop.rimY - 26, scoreColor, 28);

    // 2. Style, Distance, Sky & Multiplier Breakdown
    const parts = [];
    if (styleLabel) parts.push(styleLabel);
    parts.push(distLabel);
    if (isOffscreen && apexFeet > 0) parts.push(`${apexFeet}FT SKY`);
    if (multiplier > 1) {
      parts.push(`×${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}`);
    }
    const breakdown = parts.join(' • ');
    setTimeout(() => {
      addFloatingText(breakdown, midRimX, hoop.rimY - 50, '#e2e8f0', 19);
    }, 90);

    // Scarce Moonshot / Sky-Hook / Stratosphere callout
    if (isOffscreen && heightLabel) {
      setTimeout(() => {
        let labelColor = '#c084fc';
        if (apexFeet >= 160) labelColor = '#f43f5e';
        else if (apexFeet >= 120) labelColor = '#a855f7';
        addFloatingText(`${heightLabel} (${apexFeet} FT)`, midRimX, hoop.rimY - 96, labelColor, 24);
      }, 230);
    }

    // 3. Streak Milestones
    if (State.streak >= 2) {
      setTimeout(() => {
        let streakMsg = `STREAK ${State.streak}! 🔥`;
        let streakColor = '#fbbf24';
        if (State.streak === 3) {
          streakMsg = 'HEATING UP! 🔥 (STREAK 3)';
          streakColor = '#10b981';
        } else if (State.streak === 6) {
          streakMsg = 'SHARP SHOOTER! ⚡ (STREAK 6)';
          streakColor = '#c084fc';
        } else if (State.streak === 10) {
          streakMsg = 'ON FIRE! 🔥🔥🔥 (STREAK 10)';
          streakColor = '#ef4444';
        } else if (State.streak === 15) {
          streakMsg = 'LEGENDARY! 👑 (STREAK 15)';
          streakColor = '#f59e0b';
        }
        addFloatingText(streakMsg, midRimX, hoop.rimY - 74, streakColor, 22);
      }, 190);
    }

    // 4. New High Score celebration!
    if (isNewBestRun) {
      setTimeout(() => {
        addFloatingText('★ NEW HIGH SCORE! ★', midRimX, hoop.rimY - 96, '#f59e0b', 25);
      }, 300);
    }

    // Confetti / Sparks celebration
    const sparkColor = isClean ? '#38bdf8' : '#f59e0b';
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22;
      const spd = 60 + Math.random() * 140;
      spawnParticle(
        midRimX,
        hoop.rimY + 10,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd - 50,
        Math.random() * 3 + 1.5,
        Math.random() > 0.5 ? sparkColor : '#ffffff',
        0.8
      );
    }

    // Achievements Evaluation
    unlockAchievement('first_basket');
    if (State.sessionCleanShots >= 3) {
      unlockAchievement('clean_master');
    }
    if (State.streak >= 5) {
      unlockAchievement('streak_5');
    }
    if (State.streak >= 10) {
      unlockAchievement('streak_10');
    }
    if (State.streak >= 20) {
      unlockAchievement('streak_20');
    }
    if (State.lifetimeBaskets >= 50) {
      unlockAchievement('total_50');
    }
    if (isBank) {
      unlockAchievement('bank_shot');
    }
    if (distFeet >= 28) {
      unlockAchievement('downtown_sniper');
    }

    b.shotData.resolved = true;
    b.lifeAfterResolve = 0;
    scheduleStorageFlush();
  }

  function handleShotMiss(b) {
    if (b.shotData.resolved) return;
    b.shotData.resolved = true;
    b.lifeAfterResolve = 0;

    // Miss: Run ends, streak and current score reset!
    if (State.score > 0) {
      const finalScore = State.score;
      if (finalScore >= State.highScore && State.highScore > 0) {
        addFloatingText(`RUN OVER: ${finalScore.toLocaleString()} (NEW BEST!)`, b.x, b.y - 24, '#fbbf24', 23);
      } else {
        addFloatingText(`RUN OVER: ${finalScore.toLocaleString()} PTS`, b.x, b.y - 24, '#ef4444', 21);
      }
    } else if (State.streak > 0) {
      addFloatingText('STREAK LOST', b.x, b.y - 20, '#ef4444', 20);
    }
    State.score = 0;
    State.streak = 0;
    State.announcedHighScore = false;
    updateHUD();
    scheduleStorageFlush();
  }

  // Net Spring simulation & Damping
  function updateNet(dt) {
    const k = 140; // spring tension
    const damping = 0.88; // friction

    hoop.netPoints.forEach(p => {
      const dx = p.restX - p.x;
      const dy = p.restY - p.y;
      p.vx += dx * k * dt;
      p.vy += dy * k * dt;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
  }



  // ==========================================
  // 8. PROCEDURAL RENDERING ROUTINES
  // ==========================================

  // Procedural Ball Skins (No bitmap images required)
  function renderBallSkin(targetCtx, x, y, r, angle, skinId) {
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(angle);

    switch (skinId) {
      case 'watermelon':
        renderWatermelonSkin(targetCtx, r);
        break;
      case 'beachball':
        renderBeachBallSkin(targetCtx, r);
        break;
      case 'fire':
        renderFireSkin(targetCtx, r);
        break;
      case 'eightball':
        renderEightBallSkin(targetCtx, r);
        break;
      case 'classic':
      default:
        renderClassicSkin(targetCtx, r);
        break;
    }

    // Outer subtle ambient shadow and rim light
    targetCtx.beginPath();
    targetCtx.arc(0, 0, r, 0, Math.PI * 2);
    targetCtx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    targetCtx.lineWidth = 1.2;
    targetCtx.stroke();

    targetCtx.restore();
  }

  function renderClassicSkin(c, r) {
    // Orange radial gradient
    const grad = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#fb923c');
    grad.addColorStop(0.65, '#ea580c');
    grad.addColorStop(1, '#9a3412');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    // Seams
    c.strokeStyle = '#431407';
    c.lineWidth = Math.max(1.5, r * 0.08);
    c.lineCap = 'round';

    // Horizontal & Vertical seams
    c.beginPath();
    c.moveTo(-r, 0);
    c.lineTo(r, 0);
    c.moveTo(0, -r);
    c.lineTo(0, r);
    c.stroke();

    // Symmetrical side curved arcs
    c.beginPath();
    c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
    c.stroke();

    c.beginPath();
    c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
    c.stroke();

    // Specular highlight
    const spec = c.createRadialGradient(-r * 0.35, -r * 0.35, 0, -r * 0.35, -r * 0.35, r * 0.65);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    spec.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = spec;
    c.fill();
  }

  function renderWatermelonSkin(c, r) {
    // Jade / Emerald exterior
    const grad = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#34d399');
    grad.addColorStop(0.7, '#059669');
    grad.addColorStop(1, '#064e3b');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    // Dark wavy green longitudinal stripes
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    c.strokeStyle = '#022c22';
    c.lineWidth = r * 0.18;
    [-0.55, 0, 0.55].forEach(offset => {
      c.beginPath();
      c.moveTo(offset * r, -r);
      for (let y = -r; y <= r; y += 8) {
        const wave = Math.sin(y * 0.2) * (r * 0.12);
        c.lineTo(offset * r + wave, y);
      }
      c.stroke();
    });

    c.restore();

    // Specular gloss
    const spec = c.createRadialGradient(-r * 0.35, -r * 0.35, 0, -r * 0.35, -r * 0.35, r * 0.6);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = spec;
    c.fill();
  }

  function renderBeachBallSkin(c, r) {
    // 6 Alternating colored wedges
    const colors = ['#ef4444', '#ffffff', '#3b82f6', '#ffffff', '#eab308', '#ffffff'];
    const wedgeAngle = (Math.PI * 2) / 6;

    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r, i * wedgeAngle, (i + 1) * wedgeAngle);
      c.closePath();
      c.fillStyle = colors[i];
      c.fill();
      c.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      c.lineWidth = 1;
      c.stroke();
    }

    // Top circular cap
    c.beginPath();
    c.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    c.stroke();

    // Specular gloss
    const spec = c.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    spec.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    spec.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = spec;
    c.fill();
  }

  function renderFireSkin(c, r) {
    // Molten Core gradient
    const grad = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.35, '#f59e0b');
    grad.addColorStop(0.75, '#ef4444');
    grad.addColorStop(1, '#7f1d1d');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    // Swirling flame accents
    c.strokeStyle = '#fee2e2';
    c.lineWidth = r * 0.07;
    c.beginPath();
    c.arc(0, 0, r * 0.55, 0.2, Math.PI * 0.9);
    c.stroke();

    c.strokeStyle = '#fde047';
    c.beginPath();
    c.arc(0, 0, r * 0.72, Math.PI * 1.1, Math.PI * 1.85);
    c.stroke();

    // Inner fiery bloom
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.35, 0, Math.PI * 2);
    c.fillStyle = 'rgba(254, 240, 138, 0.5)';
    c.fill();
  }

  function renderEightBallSkin(c, r) {
    // Deep black sphere with glossy shading
    const grad = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.4, '#1e293b');
    grad.addColorStop(0.85, '#0f172a');
    grad.addColorStop(1, '#020617');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    // Crisp white center circle
    c.beginPath();
    c.arc(0, 0, r * 0.44, 0, Math.PI * 2);
    c.fillStyle = '#f8fafc';
    c.fill();

    // Sharp black number 8
    c.fillStyle = '#0f172a';
    c.font = `bold ${Math.round(r * 0.54)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('8', 0, 1);

    // Specular gloss
    const spec = c.createRadialGradient(-r * 0.4, -r * 0.4, 0, -r * 0.4, -r * 0.4, r * 0.5);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = spec;
    c.fill();
  }

  function renderCourtFloor() {
    // Clean seamless court floor without decorative background lines
  }

  // ------------------------------------------
  // Main Render Loop
  // ------------------------------------------
  function renderScene() {
    // Transparent canvas: clearRect is ultra-fast
    ctx.clearRect(0, 0, width, height);

    // 0. Hardwood Floor Baseline & 3-Point Boundary
    renderCourtFloor();

    // 1. Backboard Pole & Mounting Brackets (Background)
    renderBackboard();

    // 2. Net Back Strands
    renderNetStrands(false);

    // 3. Predictive Dotted Trajectory Arc (when Aiming)
    if (State.isAiming && State.phase === 'AIMING') {
      renderPredictiveTrajectory();
    }

    // 4. Ball Entities (with 2.5D layering)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.scale <= 0.01 || b.opacity <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = b.opacity;
      const renderRadius = b.radius * b.scale;

      // Soft ground contact shadow when resting or near floor
      if (b.y > height * 0.45) {
        const groundY = height - 12;
        const distToGround = Math.max(0, groundY - b.y);
        const shadowScale = Math.max(0.2, 1 - distToGround / 350);
        const shadowAlpha = Math.min(0.35, 0.35 * shadowScale);

        ctx.beginPath();
        ctx.ellipse(b.x, groundY, renderRadius * shadowScale * 1.2, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fill();
      }

      renderBallSkin(ctx, b.x, b.y, renderRadius, b.angle, State.equippedSkin);
      ctx.restore();
    }

    // 4a. Shot Zone & Distance Badge floating above active ball when aiming or idle
    if (activeBall && !activeBall.isLaunched && activeBall.shotData.distanceFeet && activeBall.scale >= 0.5) {
      ctx.save();
      ctx.globalAlpha = activeBall.opacity;
      const renderRadius = activeBall.radius * activeBall.scale;
      const badgeY = activeBall.originY - renderRadius - 20;
      const badgeText = `${activeBall.shotData.zoneName} • ${activeBall.shotData.distanceFeet} FT`;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const padX = 8;
      const bWidth = textWidth + padX * 2;
      const bHeight = 19;
      const bX = activeBall.originX - bWidth / 2;
      const bY = badgeY - bHeight / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bX, bY, bWidth, bHeight, 9);
      } else {
        ctx.rect(bX, bY, bWidth, bHeight);
      }
      ctx.fill();

      ctx.strokeStyle = activeBall.shotData.zoneColor || '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = activeBall.shotData.zoneColor || '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, activeBall.originX, badgeY);
      ctx.restore();
    }

    // 4b. Space Altitude Indicators: for any launched balls in high flight above canvas
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.isLaunched && b.y < -b.radius && !b.shotData.resolved) {
        ctx.save();
        const indicatorX = Math.max(24, Math.min(width - 24, b.x));
        const heightFt = getBallAltitudeFeet(b.y);
        const altText = `${heightFt} FT`;

        // Triangle pointer downwards
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(indicatorX - 9, 8);
        ctx.lineTo(indicatorX + 9, 8);
        ctx.lineTo(indicatorX, 19);
        ctx.closePath();
        ctx.fill();

        // Pulsing miniature ball indicator
        ctx.beginPath();
        ctx.arc(indicatorX, 29, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Altitude text badge in FT
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(altText).width;
        const bW = textWidth + 12;
        const bH = 17;
        const bX = indicatorX - bW / 2;
        const bY = 47 - bH / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bX, bY, bW, bH, 8);
        } else {
          ctx.rect(bX, bY, bW, bH);
        }
        ctx.fill();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(altText, indicatorX, 47);
        ctx.restore();
      }
    }

    // 5. Hoop Front Rim & Net Front Strands (Layered in front of ball!)
    renderFrontRimAndNet();

    // 6. Particles (Pooled embers & sparks)
    renderParticles();

    // 7. Floating Canvas Texts
    renderFloatingTexts();
  }

  function renderBackboard() {
    ctx.save();

    // Support pole extending to outer edge
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hoop.backboardX, hoop.y);
    ctx.lineTo(State.hoopSide === 'left' ? 0 : width, hoop.y);
    ctx.stroke();

    // Mounting bracket to back rim
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hoop.backboardX, hoop.y);
    ctx.lineTo(hoop.rimBackX, hoop.rimY);
    ctx.stroke();

    // Acrylic / Glass Backboard
    const bbWidth = 9;
    const bbX = hoop.backboardX - bbWidth / 2;
    const bbY = hoop.backboardTop;
    const bbH = hoop.backboardBottom - hoop.backboardTop;

    // Glass glow fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(bbX, bbY, bbWidth, bbH);

    // Border frame
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bbX, bbY, bbWidth, bbH);

    // Inner target square on backboard (on court-facing edge of glass)
    const targetH = bbH * 0.35;
    const targetTop = hoop.rimY - targetH + 4;
    const targetX = State.hoopSide === 'left' ? bbX + bbWidth - 1 : bbX + 1;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetX, targetTop);
    ctx.lineTo(targetX, targetTop + targetH);
    ctx.stroke();

    // Back rim ellipse line
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(
      (hoop.rimFrontX + hoop.rimBackX) / 2,
      hoop.rimY,
      Math.abs(hoop.rimBackX - hoop.rimFrontX) / 2,
      3.2,
      0,
      Math.PI,
      0,
      true
    );
    ctx.stroke();

    ctx.restore();
  }

  function renderNetStrands(frontOnly = false) {
    if (hoop.netPoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = frontOnly ? 'rgba(241, 245, 249, 0.92)' : 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = frontOnly ? 1.6 : 1.2;

    const count = hoop.netPoints.length;

    // Vertical strands
    for (let i = 0; i < count; i++) {
      const p = hoop.netPoints[i];
      ctx.beginPath();
      ctx.moveTo(p.topX, p.topY);
      // Gentle curve to bottom displaced vertex
      const ctrlX = (p.topX + p.x) / 2;
      const ctrlY = (p.topY + p.y) / 2;
      ctx.quadraticCurveTo(ctrlX, ctrlY, p.x, p.y);
      ctx.stroke();
    }

    // Horizontal diamond cross-ribs
    [0.35, 0.7, 1.0].forEach(fraction => {
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const p = hoop.netPoints[i];
        const rx = p.topX + (p.x - p.topX) * fraction;
        const ry = p.topY + (p.y - p.topY) * fraction;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    });

    ctx.restore();
  }

  function renderFrontRimAndNet() {
    ctx.save();

    // Front net overlay (draws on top of ball as it falls through!)
    renderNetStrands(true);

    // Front Rim Arc
    const rimMidX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const rimRadiusX = Math.abs(hoop.rimBackX - hoop.rimFrontX) / 2;

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(rimMidX, hoop.rimY, rimRadiusX, 3.8, 0, 0, Math.PI, false);
    ctx.stroke();

    // Front and Back Rim Solid Point Colliders
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.arc(hoop.rimFrontX, hoop.rimY, hoop.rimRadius, 0, Math.PI * 2);
    ctx.arc(hoop.rimBackX, hoop.rimY, hoop.rimRadius, 0, Math.PI * 2);
    ctx.fill();

    // Front Rim Highlights
    const highlightOffsetX = State.hoopSide === 'left' ? 1 : -1;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(hoop.rimFrontX + highlightOffsetX, hoop.rimY - 1, hoop.rimRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function renderPredictiveTrajectory() {
    if (!activeBall || !State.isAiming) return;
    const launch = computeLaunchVelocity(true);
    if (launch.dragDist < 2 || launch.speed < V_MIN) return;

    ctx.save();

    // Smoothed drag offset from touch-down
    const dragX = State.aimSmooth.x - State.aimStart.x;
    const dragY = State.aimSmooth.y - State.aimStart.y;

    // Tactical Slingshot Pull Guideline from Ball to Touch Vector
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(activeBall.originX, activeBall.originY);
    ctx.lineTo(activeBall.originX + dragX, activeBall.originY + dragY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tactile slingshot pull bead at ball
    ctx.beginPath();
    ctx.arc(activeBall.originX + dragX, activeBall.originY + dragY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();

    // If touch started away from ball (e.g. thumb on right side), draw subtle tactile reticle at finger
    const touchDistFromBall = Math.hypot(State.aimStart.x - activeBall.originX, State.aimStart.y - activeBall.originY);
    if (touchDistFromBall > activeBall.radius * 2.5) {
      // Touch anchor ring
      ctx.beginPath();
      ctx.arc(State.aimStart.x, State.aimStart.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dashed connector to thumb position
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(State.aimStart.x, State.aimStart.y);
      ctx.lineTo(State.aimSmooth.x, State.aimSmooth.y);
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);

      // Current thumb bead
      ctx.beginPath();
      ctx.arc(State.aimSmooth.x, State.aimSmooth.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.65)';
      ctx.fill();
    }

    // Predictive Forward Kinematic Simulation Points
    // Smooth gradual trajectory shortening based on exact streak, always 1:1 with flight
    const totalPoints = getTrajectoryDotCount(State.streak);
    const timeStep = 0.038;

    let prevPx = activeBall.originX;
    let prevPy = activeBall.originY;

    for (let i = 1; i <= totalPoints; i++) {
      const t = i * timeStep;
      const px = activeBall.originX + launch.vx * t;
      const py = activeBall.originY + launch.vy * t + 0.5 * GRAVITY * t * t;

      // Stop trajectory if below floor
      if (py > height - 12) break;

      // Stop trajectory ONLY if it collides with the physical backboard face
      // Continuous line segment intersection with backboard plane to prevent discrete sampling flicker!
      const bx = hoop.backboardX;
      const crossedX = (prevPx - bx) * (px - bx) <= 0;
      if (crossedX) {
        const denom = (px - prevPx) || 0.0001;
        const frac = (bx - prevPx) / denom;
        const crossY = prevPy + frac * (py - prevPy);
        if (crossY >= hoop.backboardTop - 4 && crossY <= hoop.backboardBottom + 4) {
          break;
        }
      }

      // Stop trajectory if far out of bounds horizontally
      if (px < -150 || px > width + 250) break;

      prevPx = px;
      prevPy = py;

      const alpha = Math.max(0.18, 1 - (i / totalPoints) * 0.82);
      const dotRadius = Math.max(2.2, 4.4 - (i / totalPoints) * 2.0);

      // Trajectory dot glow
      ctx.beginPath();
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
      ctx.fill();

      // Outer soft ring for leading dots
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(px, py, dotRadius + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function renderParticles() {
    ctx.save();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particlePool[i];
      if (p.active) {
        const progress = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function renderFloatingTexts() {
    if (floatingTexts.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const item = floatingTexts[i];
      ctx.font = `800 ${Math.round(item.fontSize * item.scale)}px system-ui, sans-serif`;
      ctx.globalAlpha = Math.max(0, item.alpha);

      // Stroke border for crisp readability
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(item.text, item.x, item.y);

      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  // ==========================================
  // 9. ANIMATION & GAME LOOP (RAF)
  // ==========================================
  let lastTimestamp = 0;
  let isRunning = true;
  let rafId = null;

  function wakeGameLoop() {
    if (!isRunning) {
      isRunning = true;
      lastTimestamp = performance.now();
      if (!rafId) {
        rafId = requestAnimationFrame(gameLoop);
      }
    }
  }

  function gameLoop(timestamp) {
    if (!isRunning) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaMs = Math.min(timestamp - lastTimestamp, 50); // clamp for tab-switches
    const dt = deltaMs / 1000;
    lastTimestamp = timestamp;

    // 0. Silky-smooth Dual-Mode Aim Tracking (Zero lag for active micro-adjustments, jitter filter when still)
    if (State.isAiming && State.aimSmooth) {
      const dAimX = State.aimCurrent.x - State.aimSmooth.x;
      const dAimY = State.aimCurrent.y - State.aimSmooth.y;
      const aimDist = Math.hypot(dAimX, dAimY);

      if (aimDist > 0.8) {
        // Active motion: follow immediately with 0 lag so micro-adjustments reflect on the exact frame
        State.aimSmooth.x = State.aimCurrent.x;
        State.aimSmooth.y = State.aimCurrent.y;
      } else if (aimDist > 0.05) {
        // Sub-pixel jitter filter: smooth convergence without deadband
        State.aimSmooth.x += dAimX * 0.75;
        State.aimSmooth.y += dAimY * 0.75;
      }
    }

    // 1. Physics & Ball Lifecycle
    updatePhysics(dt);

    // 2. Procedural Net Dynamics
    updateNet(dt);

    // 3. Update Particle Pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particlePool[i];
      if (p.active) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += GRAVITY * 0.4 * dt;
        if (p.life >= p.maxLife) {
          p.active = false;
        }
      }
    }

    // 4. Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const item = floatingTexts[i];
      item.age += dt;
      item.y = item.startY - 45 * Math.sin((item.age / item.maxAge) * (Math.PI / 2));
      item.scale = Math.min(1.15, 0.6 + (item.age / 0.15) * 0.5);
      if (item.age > item.maxAge * 0.65) {
        item.alpha = 1 - (item.age - item.maxAge * 0.65) / (item.maxAge * 0.35);
      }
      if (item.age >= item.maxAge) {
        floatingTexts.splice(i, 1);
      }
    }

    // 5. Draw Canvas Scene
    renderScene();

    rafId = requestAnimationFrame(gameLoop);
  }

  // ==========================================
  // 10. MODAL DIALOGS & SKIN PREVIEWS
  // ==========================================
  function renderSkinsGrid() {
    dom.skinsGrid.innerHTML = '';

    BALL_SKINS.forEach(skin => {
      const isUnlocked = !!State.unlockedSkins[skin.id];
      const isEquipped = State.equippedSkin === skin.id;

      const card = document.createElement('div');
      card.className = `skin-card ${isEquipped ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;

      // Canvas ball preview
      const previewWrap = document.createElement('div');
      previewWrap.className = 'skin-canvas-wrap';

      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 54;
      previewCanvas.height = 54;
      const prevCtx = previewCanvas.getContext('2d');
      renderBallSkin(prevCtx, 27, 27, 23, 0.2, skin.id);

      previewWrap.appendChild(previewCanvas);

      const nameEl = document.createElement('div');
      nameEl.className = 'skin-name';
      nameEl.textContent = skin.name;

      const badgeEl = document.createElement('div');
      badgeEl.className = 'skin-badge';
      badgeEl.textContent = isEquipped ? 'Equipped' : (isUnlocked ? 'Equip' : 'Locked 🔒');

      card.appendChild(previewWrap);
      card.appendChild(nameEl);
      card.appendChild(badgeEl);

      if (isUnlocked) {
        card.addEventListener('click', () => {
          State.equippedSkin = skin.id;
          State.isDirtyStorage = true;
          flushStateToStorage();
          renderSkinsGrid();
        });
      }

      dom.skinsGrid.appendChild(card);
    });
  }

  function renderAchievementsList() {
    dom.achievementsList.textContent = '';

    ACHIEVEMENTS_CATALOG.forEach(ach => {
      const isUnlocked = !!State.achievements[ach.id];

      const item = document.createElement('div');
      item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;

      const iconBox = document.createElement('div');
      iconBox.className = 'ach-icon-box';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');

      const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p1.setAttribute('d', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6');
      const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18');
      const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p3.setAttribute('d', 'M4 22h16');
      const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p4.setAttribute('d', 'M18 2H6v7a6 6 0 0 0 12 0V2Z');
      svg.append(p1, p2, p3, p4);
      iconBox.appendChild(svg);

      const infoBox = document.createElement('div');
      infoBox.className = 'ach-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'ach-title';
      titleEl.textContent = ach.title;

      const descEl = document.createElement('div');
      descEl.className = 'ach-desc';
      descEl.textContent = ach.desc;

      const rewardEl = document.createElement('div');
      rewardEl.className = 'ach-reward';
      rewardEl.textContent = ach.reward;

      infoBox.append(titleEl, descEl, rewardEl);

      const statusEl = document.createElement('div');
      statusEl.className = 'ach-status';
      statusEl.textContent = isUnlocked ? '✓ Done' : 'Locked';

      item.append(iconBox, infoBox, statusEl);
      dom.achievementsList.appendChild(item);
    });
  }

  function toggleFullscreen() {
    const doc = document;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || State.isPseudoFullscreen);
    if (!isFs) {
      const root = doc.documentElement;
      if (root.requestFullscreen) {
        root.requestFullscreen().catch(() => {
          State.isPseudoFullscreen = true;
          updateFullscreenUI();
        });
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      } else {
        State.isPseudoFullscreen = true;
        updateFullscreenUI();
      }
    } else {
      if (State.isPseudoFullscreen) {
        State.isPseudoFullscreen = false;
        updateFullscreenUI();
      } else if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {
          State.isPseudoFullscreen = false;
          updateFullscreenUI();
        });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  }

  let lastFullscreenState = null;
  function updateFullscreenUI() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || State.isPseudoFullscreen);
    if (dom.iconFsEnter && dom.iconFsExit) {
      dom.iconFsEnter.classList.toggle('hidden', isFs);
      dom.iconFsExit.classList.toggle('hidden', !isFs);
    }
    if (dom.toggleFullscreen) {
      dom.toggleFullscreen.checked = isFs;
    }
    if (dom.wrapper) {
      const tier = getCurrentTier();
      dom.wrapper.className = `game-wrapper tier-${tier.id}${isFs ? ' fullscreen-mode' : ''}`;
    }
    if (dom.zenPill) {
      dom.zenPill.classList.toggle('hidden', !isFs);
      dom.zenPill.classList.toggle('hoop-left', State.hoopSide === 'left');
      dom.zenPill.classList.toggle('hoop-right', State.hoopSide === 'right');
    }
    if (!isFs && dom.hudHeader) {
      dom.hudHeader.classList.remove('menu-open');
    }
    if (lastFullscreenState !== isFs) {
      lastFullscreenState = isFs;
      setTimeout(() => resizeViewport(true), 150);
    }
  }

  function cancelAiming() {
    if (State.isAiming) {
      if (State.pointerId !== null) {
        try {
          if (dom.canvas.hasPointerCapture && dom.canvas.hasPointerCapture(State.pointerId)) {
            dom.canvas.releasePointerCapture(State.pointerId);
          }
        } catch (err) { }
      }
      State.isAiming = false;
      State.pointerId = null;
      if (activeBall && !activeBall.isLaunched) {
        activeBall.x = activeBall.originX;
        activeBall.y = activeBall.originY;
      }
      State.phase = 'IDLE';
      wakeGameLoop();
    }
  }

  // ==========================================
  // 11. LIFECYCLE, POWER & BATTERY EFFICIENCY
  // ==========================================
  function setupBatteryAndLifecycle() {
    // 1. Visibility change: pause completely when tab in background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAiming();
        isRunning = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        flushStateToStorage();
        if (audioCtx && audioCtx.state === 'running') {
          audioCtx.suspend();
        }
      } else {
        if (!isRunning) {
          isRunning = true;
          lastTimestamp = performance.now();
          if (!rafId) {
            rafId = requestAnimationFrame(gameLoop);
          }
        }
      }
    });

    // 2. Window blur & pointer recovery when switching apps/windows
    window.addEventListener('blur', cancelAiming);

    // 3. Storage write flush before unload
    window.addEventListener('beforeunload', flushStateToStorage);
    window.addEventListener('pagehide', flushStateToStorage);
  }

  // ==========================================
  // 12. INITIALIZATION
  // ==========================================
  function init() {
    loadSavedState();
    updateHUD();

    // Event Listeners for Canvas Pointer API
    dom.canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    dom.canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    try {
      dom.canvas.addEventListener('pointerrawupdate', onPointerMove, { passive: false });
    } catch (err) { }
    dom.canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    dom.canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
    dom.canvas.addEventListener('lostpointercapture', cancelAiming);
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    window.addEventListener('scroll', updateCanvasRect, { passive: true });

    // Native Modal Dialog backdrop click dismissals
    [dom.settingsModal, dom.skinsModal, dom.achievementsModal].forEach(dialog => {
      if (dialog) {
        dialog.addEventListener('click', (e) => {
          const rect = dialog.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            dialog.close();
            wakeGameLoop();
          }
        });
      }
    });

    // Settings modal interactions
    dom.btnSettings.addEventListener('click', () => {
      initAudio();
      updateHUD();
      if (typeof dom.settingsModal.showModal === 'function') {
        dom.settingsModal.showModal();
      } else {
        dom.settingsModal.setAttribute('open', '');
      }
    });

    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.close());
    dom.btnCloseSettings.addEventListener('click', () => dom.settingsModal.close());

    // Layout switch handlers
    dom.btnLayoutLeft.addEventListener('click', () => {
      if (State.hoopSide !== 'left') {
        State.hoopSide = 'left';
        State.isDirtyStorage = true;
        flushStateToStorage();
        updateHUD();
        resizeViewport();
        balls.length = 0;
        activeBall = null;
        spawnBall(true);
        wakeGameLoop();
      }
    });

    dom.btnLayoutRight.addEventListener('click', () => {
      if (State.hoopSide !== 'right') {
        State.hoopSide = 'right';
        State.isDirtyStorage = true;
        flushStateToStorage();
        updateHUD();
        resizeViewport();
        balls.length = 0;
        activeBall = null;
        spawnBall(true);
        wakeGameLoop();
      }
    });

    // Sound toggle in settings
    dom.toggleSound.addEventListener('change', (e) => {
      initAudio();
      State.isMuted = !e.target.checked;
      State.isDirtyStorage = true;
      flushStateToStorage();
      if (!State.isMuted) {
        Sound.bounce(0.8);
      }
    });

    // Fullscreen controls
    if (dom.btnFullscreen) {
      dom.btnFullscreen.addEventListener('click', toggleFullscreen);
    }
    if (dom.toggleFullscreen) {
      dom.toggleFullscreen.addEventListener('change', toggleFullscreen);
    }
    if (dom.zenBtnMenu) {
      dom.zenBtnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dom.hudHeader) dom.hudHeader.classList.toggle('menu-open');
      });
    }
    if (dom.zenBtnExit) {
      dom.zenBtnExit.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
      });
    }
    document.addEventListener('fullscreenchange', updateFullscreenUI);
    document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

    dom.btnSkins.addEventListener('click', () => {
      renderSkinsGrid();
      if (typeof dom.skinsModal.showModal === 'function') {
        dom.skinsModal.showModal();
      } else {
        dom.skinsModal.setAttribute('open', '');
      }
    });

    dom.closeSkinsBtn.addEventListener('click', () => dom.skinsModal.close());
    dom.btnEquipSkin.addEventListener('click', () => {
      dom.skinsModal.close();
      wakeGameLoop();
    });

    dom.btnAchievements.addEventListener('click', () => {
      renderAchievementsList();
      if (typeof dom.achievementsModal.showModal === 'function') {
        dom.achievementsModal.showModal();
      } else {
        dom.achievementsModal.setAttribute('open', '');
      }
    });

    dom.closeAchievementsBtn.addEventListener('click', () => dom.achievementsModal.close());
    dom.btnCloseAchievements.addEventListener('click', () => dom.achievementsModal.close());

    // Shortcuts from inside Settings Modal to Locker & Achievements
    const btnSettingsOpenSkins = document.getElementById('btnSettingsOpenSkins');
    if (btnSettingsOpenSkins) {
      btnSettingsOpenSkins.addEventListener('click', () => {
        dom.settingsModal.close();
        renderSkinsGrid();
        if (typeof dom.skinsModal.showModal === 'function') dom.skinsModal.showModal();
        else dom.skinsModal.setAttribute('open', '');
      });
    }

    const btnSettingsOpenAch = document.getElementById('btnSettingsOpenAch');
    if (btnSettingsOpenAch) {
      btnSettingsOpenAch.addEventListener('click', () => {
        dom.settingsModal.close();
        renderAchievementsList();
        if (typeof dom.achievementsModal.showModal === 'function') dom.achievementsModal.showModal();
        else dom.achievementsModal.setAttribute('open', '');
      });
    }

    // Window Resize Observer
    window.addEventListener('resize', () => {
      resizeViewport();
      wakeGameLoop();
    });

    // Initial setup
    setupBatteryAndLifecycle();
    resizeViewport();

    // Start Main Loop
    isRunning = true;
    lastTimestamp = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  }

  // Boot on DOMContentLoaded or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
