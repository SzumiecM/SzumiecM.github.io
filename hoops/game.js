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
      id: 'streak_10',
      title: 'On a Roll',
      desc: 'Reach an uninterrupted 10-basket streak',
      reward: 'Beach Ball Skin Unlocked',
      skinReward: 'beachball',
      hidden: false
    },
    {
      id: 'clean_run_5',
      title: 'Pure Silk',
      desc: 'Score 5 Clean Shots in a single run',
      reward: 'Watermelon Skin Unlocked',
      skinReward: 'watermelon',
      hidden: false
    },
    {
      id: 'total_100',
      title: 'Century Club',
      desc: 'Score 100 total lifetime baskets',
      reward: '8-Ball Skin Unlocked',
      skinReward: 'eightball',
      hidden: false
    },
    {
      id: 'wall_ricochet',
      title: 'Sugar Rebound',
      desc: 'Score a basket after bouncing off the opposite gym wall',
      reward: 'Pink Donut Skin Unlocked',
      skinReward: 'donut',
      hidden: true
    },
    {
      id: 'downtown_sniper',
      title: 'From Downtown',
      desc: 'Drain a long bomb basket from 28+ feet away',
      reward: 'Tactical Sniper Skin Unlocked',
      skinReward: 'sniper',
      hidden: false
    },
    {
      id: 'bank_shot',
      title: 'Off the Glass',
      desc: 'Score a basket after bouncing off the backboard',
      reward: 'Prism Crystal Skin Unlocked',
      skinReward: 'crystal',
      hidden: false
    },
    {
      id: 'floor_bounce',
      title: 'Hardwood Bounce',
      desc: 'Score a basket after bouncing off the court floor',
      reward: 'Neon Synthwave Skin Unlocked',
      skinReward: 'synthwave',
      hidden: true
    },
    {
      id: 'midas_streak_20',
      title: 'The Midas Touch',
      desc: 'Reach a legendary 20-basket streak',
      reward: '24K Midas Skin Unlocked',
      skinReward: 'gold',
      hidden: false
    },
    {
      id: 'stratosphere_swish',
      title: 'Orbital Swish',
      desc: 'Drain a clean swish from the Stratosphere (80+ ft arc)',
      reward: 'Blue Plasma Skin Unlocked',
      skinReward: 'fire_blue',
      hidden: true
    },
    {
      id: 'total_500',
      title: 'Volcanic Master',
      desc: 'Score 500 total lifetime baskets',
      reward: 'Magma Blaze Skin Unlocked',
      skinReward: 'fire',
      hidden: false
    },
    {
      id: 'speed_demon_5',
      title: 'Speed Demon',
      desc: 'Score 5 baskets within 5 seconds',
      reward: 'Hot-Rod Fire Skin Unlocked',
      skinReward: 'fire_hotrod',
      hidden: false
    }
  ];

  const BALL_SKINS = [
    { id: 'classic', name: 'Classic', desc: 'Standard orange leather' },
    { id: 'beachball', name: 'Beach Ball', desc: 'Multi-color carnival stripes' },
    { id: 'watermelon', name: 'Watermelon', desc: 'Crisp green & summer stripes' },
    { id: 'eightball', name: '8-Ball', desc: 'Deep glossy pool hall black' },
    { id: 'donut', name: 'Pink Donut', desc: 'Strawberry frosting with rainbow sprinkles' },
    { id: 'sniper', name: 'Tactical Sniper', desc: 'Matte carbon stealth & neon laser crosshair' },
    { id: 'crystal', name: 'Prism Crystal', desc: 'Faceted diamond glass & prismatic refractions' },
    { id: 'synthwave', name: 'Neon Synthwave', desc: 'Cyberpunk midnight violet & laser neon grid seams' },
    { id: 'gold', name: '24K Midas', desc: 'Championship polished gold & white seams' },
    { id: 'fire_blue', name: 'Blue Plasma', desc: 'Ghost blue electric fire & cyan trail' },
    { id: 'fire', name: 'Magma Blaze', desc: 'Molten glowing lava seams & ember trail' },
    { id: 'fire_hotrod', name: 'Hot-Rod Fire', desc: 'Comic flame wrap & long yellow-black trail' }
  ];

  // Progressive Streak Difficulty Tiers (gradual shortening of trajectory arc & static atmosphere colors)
  const STREAK_TIERS = [
    {
      id: 'rookie',
      name: 'ROOKIE',
      minStreak: 0,
      top: [22, 30, 46],
      bottom: [11, 16, 28]
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
    lastScoredBallId: 0,
    announcedHighScore: false,
    isDirtyStorage: false,
    isPseudoFullscreen: false,

    // Aiming state
    isAiming: false,
    aimStart: { x: 0, y: 0 },
    aimCurrent: { x: 0, y: 0 },
    aimSmooth: { x: 0, y: 0 },
    pointerId: null
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
    // Classic skin is always unlocked
    State.unlockedSkins = { classic: true };

    // Synchronize skin unlocks strictly with completed achievements
    ACHIEVEMENTS_CATALOG.forEach(ach => {
      if (ach.skinReward && State.achievements[ach.id]) {
        State.unlockedSkins[ach.skinReward] = true;
      }
    });

    // Retroactively award milestone achievements if player already reached stats
    if (State.lifetimeBaskets >= 500) {
      State.achievements['total_500'] = Date.now();
      State.unlockedSkins['fire'] = true;
    }
    if (State.lifetimeBaskets >= 100) {
      State.achievements['total_100'] = Date.now();
      State.unlockedSkins['eightball'] = true;
    }
    if (State.bestStreak >= 20) {
      State.achievements['midas_streak_20'] = Date.now();
      State.unlockedSkins['gold'] = true;
    }
    if (State.bestStreak >= 10) {
      State.achievements['streak_10'] = Date.now();
      State.unlockedSkins['beachball'] = true;
    }
    if (State.longestShot >= 28) {
      State.achievements['downtown_sniper'] = Date.now();
      State.unlockedSkins['sniper'] = true;
    }
    if (State.lifetimeBankShots >= 1) {
      State.achievements['bank_shot'] = Date.now();
      State.unlockedSkins['crystal'] = true;
    }

    if (!State.unlockedSkins[State.equippedSkin]) {
      State.equippedSkin = 'classic';
    }
  }

  // Rapid basket tracker for "Speed Demon" achievement (5 baskets in 5 seconds)
  let recentBasketTimes = [];

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

  const GRAVITY = 1380; // Newtonian gravity: authentic climb, apex deceleration & plunge
  const K_LAUNCH_X = 4.0; // Calibrated horizontal pull scale for surgical micro-aiming precision
  const K_LAUNCH_Y = 5.4; // Calibrated vertical arc pull scale (generous travel, zero deadband)
  const V_MIN = 25; // Responsive minimum velocity for immediate micro-adjustment tracking
  const RESTITUTION_RIM = 0.52; // Authentic steel rim restitution: natural rattles and authentic misses
  const RESTITUTION_BOARD = 0.60; // Glass backboard rebound: requires proper touch/arc, not guaranteed
  const RESTITUTION_FLOOR = 0.64; // Tuned floor restitution: enough pop to reach net on intentional floor bounce, without bouncing wild

  // Object pooling for particles
  const MAX_PARTICLES = 160;
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
  function addFloatingText(text, x, y, color = '#f59e0b', fontSize = 26, opts = {}) {
    const vx = opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * 16;
    const vy = opts.vy !== undefined ? opts.vy : -28 - Math.random() * 10;
    const rotation = opts.rotation !== undefined ? opts.rotation : (Math.random() - 0.5) * 0.12;
    const maxAge = opts.maxAge || 1.35;

    floatingTexts.push({
      text,
      x,
      y,
      startX: x,
      startY: y,
      vx,
      vy,
      color,
      fontSize,
      rotation,
      alpha: 1,
      scale: 0.35,
      age: 0,
      maxAge
    });
  }

  let cachedHoopSpotGradient = null;
  let cachedHoopSpotRadius = 0;
  function updateHoopSpotGradient() {
    cachedHoopSpotRadius = Math.max(280, width * 0.45);
    cachedHoopSpotGradient = ctx.createRadialGradient(hoop.rimFrontX, hoop.rimY, 15, hoop.rimFrontX, hoop.rimY, cachedHoopSpotRadius);
    cachedHoopSpotGradient.addColorStop(0, 'rgba(56, 189, 248, 0.09)');
    cachedHoopSpotGradient.addColorStop(0.6, 'rgba(30, 41, 59, 0.04)');
    cachedHoopSpotGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
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

    // Backboard pane height: strictly proportional to ballRadius (~4.75x ball radius)
    // Guarantees consistent physical dimensions and bank-shot rebounds across portrait and landscape rotations
    const boardHeight = Math.round(ballRadius * 4.75);
    hoop.backboardTop = hoop.y - boardHeight * 0.65;
    hoop.backboardBottom = hoop.y + boardHeight * 0.35;
    hoop.rimY = hoop.y;
    hoop.netDepth = ballRadius * 1.85;

    // Cache ambient hoop spot gradient
    updateHoopSpotGradient();

    // Initialize procedural net spring mesh
    initNetMesh();

    // Cancel active aiming if viewport rotated/resized mid-drag to avoid distorted vectors
    if (State.isAiming) {
      cancelAiming();
    }

    // Ensure active ball is placed in a strictly valid position for the new perspective/orientation
    if (!activeBall) {
      spawnBall(false);
    } else if (!activeBall.isLaunched) {
      repositionActiveBall();
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

  function calculateValidSpawnPosition() {
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

    // Vertical placement: strictly below net bottom by at least 45px!
    // Never above the hoop or inside the net, and leaves room below for slingshot pull
    const minY = Math.max(hoop.rimY + hoop.netDepth + 45, height * 0.46);
    let maxY = Math.min(height * 0.66, height - Math.max(90, ballRadius * 3.5));
    if (maxY <= minY) {
      maxY = minY + 20;
    }

    const originX = minX + Math.random() * (maxX - minX);
    const originY = minY + Math.random() * (maxY - minY);

    return { originX, originY };
  }

  function repositionActiveBall() {
    if (!activeBall || activeBall.isLaunched) return;

    // Boundary & perspective checks:
    // 1. Must be strictly below net bottom by at least 35px (never above hoop or inside net)
    const minNetDistY = hoop.rimY + hoop.netDepth + 35;
    const isAboveOrTooCloseToHoop = activeBall.originY < minNetDistY;
    // 2. Must be within canvas vertical bounds with pull room below (never outside of screen)
    const isOutOfBoundsY = activeBall.originY > height - ballRadius * 2.2 || activeBall.originY < minNetDistY;
    // 3. Must be within canvas horizontal bounds
    const isOutOfBoundsX = activeBall.originX < ballRadius || activeBall.originX > width - ballRadius;
    // 4. Must be on the correct court side in front of rim tip (never behind backboard or under hoop)
    const isWrongSideOfHoop = State.hoopSide === 'left'
      ? activeBall.originX < hoop.rimFrontX + 40
      : activeBall.originX > hoop.rimFrontX - 40;

    if (isAboveOrTooCloseToHoop || isOutOfBoundsY || isOutOfBoundsX || isWrongSideOfHoop) {
      const pos = calculateValidSpawnPosition();
      activeBall.originX = pos.originX;
      activeBall.originY = pos.originY;
      activeBall.x = pos.originX;
      activeBall.y = pos.originY;
      activeBall.vx = 0;
      activeBall.vy = 0;
    }

    // Always recalculate distance and zone info to match the updated perspective and viewport
    const hoopCenterX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const distPx = Math.hypot(activeBall.originX - hoopCenterX, activeBall.originY - hoop.rimY);
    const feet = Math.max(12, Math.round(distPx / 22) + 4);
    activeBall.shotData.distanceFeet = feet;

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
    activeBall.shotData.zoneName = zoneName;
    activeBall.shotData.zoneColor = zoneColor;
  }

  function createBall(x, y, animate = true) {
    return {
      id: nextBallId++,
      missHandled: false,
      floorStreakBroken: false,
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
    // If activeBall exists and hasn't launched yet, validate/reposition it for current viewport
    if (activeBall && !activeBall.isLaunched) {
      repositionActiveBall();
      if (!animate) {
        activeBall.scale = 1;
        activeBall.opacity = 1;
      }
      return activeBall;
    }

    const pos = calculateValidSpawnPosition();
    const newBall = createBall(pos.originX, pos.originY, animate);

    // Shot Distance & Zone Classification
    const hoopCenterX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const distPx = Math.hypot(pos.originX - hoopCenterX, pos.originY - hoop.rimY);
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

    activeBall = newBall;
    balls.push(newBall);

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
    // needed to achieve high sky-hooks, stratosphere shots, and powerful floor bounces symmetrically.
    const screenScaleY = Math.max(1.0, 850 / Math.max(380, height));
    let vx = -K_LAUNCH_X * dx;
    let vy = -K_LAUNCH_Y * dy * screenScaleY;

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

    wakeGameLoop();
  }

  function onPointerCancel(e) {
    if (State.isAiming && e.pointerId === State.pointerId) {
      cancelAiming();
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

        // Trailing embers for Fire Ball skins (active during flight throughout full arc, eliminating apex dead zones)
        const ballSpeed = Math.hypot(b.vx, b.vy);
        const isAirborne = b.isLaunched && !b.shotData.resolved && (ballSpeed > 55 || b.y < floorY - b.radius - 15);

        if (typeof State.equippedSkin === 'string' && State.equippedSkin.startsWith('fire') && isAirborne) {
          b.trailTimer = (b.trailTimer || 0) + subDt;
          const isHotRod = State.equippedSkin === 'fire_hotrod';
          const isBlue = State.equippedSkin === 'fire_blue';

          if (isHotRod) {
            // Whacky stuttering hot-rod exhaust:
            // Fast playful cycles (~95ms total: 60ms active puffing, 35ms quick whacky gap)
            const cycle = 0.095;
            const cycleTime = b.trailTimer % cycle;
            const inBurst = cycleTime < 0.060; // 60ms burst, 35ms micro-break

            if (inBurst) {
              // Throttle to 1 particle per ~12ms during the burst phase for dense comic clusters
              if (!b.lastParticleTime || (b.trailTimer - b.lastParticleTime) >= 0.012) {
                b.lastParticleTime = b.trailTimer;

                const isDark = Math.random() < 0.45;
                const color = isDark
                  ? (Math.random() > 0.5 ? '#18181b' : '#0a0f1d') // Comic charcoal/smoke
                  : (Math.random() > 0.5 ? '#fde047' : '#fef08a'); // Electric canary yellow

                // Whacky variation: 15% chance of chunky comic puff!
                const isChunky = Math.random() < 0.15;
                const pRadius = isChunky ? (Math.random() * 2.2 + 4.5) : (Math.random() * 2.5 + 2.0);

                // Slight lateral sputtering pop perpendicular to ball velocity
                const normalX = -b.vy / (ballSpeed || 1);
                const normalY = b.vx / (ballSpeed || 1);
                const popSide = (Math.random() - 0.5) * 45;

                spawnParticle(
                  b.x + (Math.random() * 10 - 5),
                  b.y + (Math.random() * 10 - 5),
                  normalX * popSide - b.vx * 0.06 + (Math.random() - 0.5) * 20,
                  normalY * popSide - b.vy * 0.06 + (Math.random() - 0.5) * 20,
                  pRadius,
                  color,
                  1.35 // 3x longer lingering tail than standard 0.45s
                );
              }
            }
          } else {
            // Magma Blaze / Blue Plasma: lively continuous embers with rhythmic micro-pulses
            const cycle = 0.080;
            const cycleTime = b.trailTimer % cycle;
            const inBurst = cycleTime < 0.055; // 55ms emission, 25ms micro-break

            if (inBurst) {
              if (!b.lastParticleTime || (b.trailTimer - b.lastParticleTime) >= 0.016) {
                b.lastParticleTime = b.trailTimer;
                const emberColor = isBlue
                  ? (Math.random() > 0.4 ? '#38bdf8' : '#06b6d4')
                  : (Math.random() > 0.4 ? '#f59e0b' : '#ef4444');
                spawnParticle(
                  b.x + (Math.random() * 8 - 4),
                  b.y + (Math.random() * 8 - 4),
                  (Math.random() - 0.5) * 40 - b.vx * 0.08,
                  (Math.random() - 0.5) * 40 - b.vy * 0.08,
                  Math.random() * 2.8 + 1.8,
                  emberColor,
                  0.45
                );
              }
            }
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
            // Adaptive Floor Restitution:
            // On short/widescreen viewports (mobile landscape), slightly elevate restitution
            // and forward momentum retention so floor-bounce shots can reach the basket naturally.
            const isShortLandscape = height < 520 && width > height * 1.3;
            const floorRestitution = isShortLandscape ? 0.72 : RESTITUTION_FLOOR;
            const forwardRetain = isShortLandscape ? 0.90 : 0.84;

            if (b.vy > 35) {
              b.vy = -b.vy * floorRestitution;
            } else {
              b.vy = 0;
            }
            b.angularVelocity *= 0.76;
            b.vx *= forwardRetain;

            const now = performance.now();
            if (now - (b.lastBounceTime || 0) > 90 && impact > 0.08) {
              Sound.bounce(impact);
              b.lastBounceTime = now;
            }

            // Track floor bounce
            b.shotData.hitFloor = true;
            b.floorBounces = (b.floorBounces || 0) + 1;

            // Instantly break active streak on floor contact (playground rules: floor bounce doesn't continue streak)
            // A previous ball superseded by a newer scoring ball cannot cancel the active streak!
            const isSuperseded = (State.lastScoredBallId && b.id <= State.lastScoredBallId);
            if (!isSuperseded && !b.floorStreakBroken && State.streak > 0 && !b.shotData.scored && !b.shotData.resolved) {
              b.floorStreakBroken = true;
              State.streak = 0;
              State.sessionCleanShots = 0;
              updateHUD();
            }

            // A floor-bounce trickshot is 1 bounce -> basket. On a 2nd floor bounce, resolve shot immediately!
            if (b.floorBounces >= 2 && !b.shotData.scored && !b.shotData.resolved) {
              handleShotMiss(b);
            }
          }
        }

        // Left Wall
        if (b.x - b.radius <= 0 && b.y > 0) {
          b.x = b.radius;
          if (b.vx < 0) {
            b.vx = -b.vx * 0.5;
            if (State.hoopSide === 'right') {
              b.shotData.hitOppositeWall = true;
            }
          }
        }
        // Right Gym Wall
        if (b.x + b.radius >= width && b.y > 0) {
          b.x = width - b.radius;
          if (b.vx > 0) {
            b.vx = -b.vx * 0.5;
            if (State.hoopSide === 'left') {
              b.shotData.hitOppositeWall = true;
            }
          }
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
        // Floor-bounced balls get a calibrated ~2.0s window (~2.5x normal) to reach the hoop, then promptly resolve
        if (b.shotData.hitFloor) {
          b.timeSinceFloor = (b.timeSinceFloor || 0) + dt;
          if (b.timeSinceFloor > 2.0 || (ballSpeed < 28 && b.y >= floorY - b.radius - 3)) {
            if (!b.shotData.scored) {
              handleShotMiss(b);
            }
          }
        } else if ((ballSpeed < 25 && b.y >= floorY - b.radius - 2) || b.restTime > 0.85 || b.flightTime > 8.0 || (b.flightTime > 4.5 && b.y >= floorY - b.radius - 10)) {
          if (!b.shotData.scored) {
            handleShotMiss(b);
          }
        } else if (b.y > height + 80 || b.x < -250 || b.x > width + 300) {
          if (!b.shotData.scored) {
            handleShotMiss(b);
          }
        }
      }

      // Smooth fade-out and removal once resolved (no lingering until stopped)
      if (b.shotData.resolved) {
        b.lifeAfterResolve = (b.lifeAfterResolve || 0) + dt;
        const isCrowded = balls.length > 5;
        if (b.lifeAfterResolve > (isCrowded ? 0.35 : 0.75) || b.y > height + 60 || b.x < -200 || b.x > width + 250) {
          b.opacity -= dt * (isCrowded ? 3.0 : 1.8);
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

    // Do not let balls that have hit the floor or are resolved deflect fresh in-flight shots
    const b1Dead = b1.shotData.resolved || b1.shotData.hitFloor;
    const b2Dead = b2.shotData.resolved || b2.shotData.hitFloor;
    if (b1Dead && !b2Dead) return;
    if (!b1Dead && b2Dead) return;

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

  function collideWithPeg(b, px, py, isBackRim = false, isRimPeg = true) {
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
      const isEnteringOpening = isRimPeg && b.vy > 0 && b.y >= hoop.rimY - 6 && b.x > minRimX + 3 && b.x < maxRimX - 3;

      if (vn < 0) {
        if (isEnteringOpening) {
          // Ball is plunging downward into the hoop cylinder: guide inward without upward stopping kickback
          b.vx -= (1 + RESTITUTION_RIM * 0.4) * vn * nx;
          if (b.vy < 35) b.vy = 35;
        } else if (vn < -15) {
          // Elastic reflection for genuine impacts
          const rest = isRimPeg ? RESTITUTION_RIM : RESTITUTION_BOARD;
          b.vx -= (1 + rest) * vn * nx;
          b.vy -= (1 + rest) * vn * ny;
          if (isRimPeg) {
            b.shotData.rimHits++;
            triggerRimHitSound(b, px, py);
          } else {
            b.shotData.backboardHits++;
            if (performance.now() - (b.lastClankTime || 0) > 85) {
              Sound.rimClank();
              b.lastClankTime = performance.now();
            }
          }
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
    collideWithPeg(b, hoop.rimFrontX, hoop.rimY, false, true);

    // Back Rim Peg (inner court-facing peg, full circle)
    collideWithPeg(b, hoop.rimBackX, hoop.rimY, true, true);
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
    collideWithPeg(b, faceX, topY, false, false);
    collideWithPeg(b, faceX, bottomY, false, false);
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

    State.lastScoredBallId = b.id;
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

    // Visual Floating Announcements (Comic Pop-Art feedback)
    const midRimX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const isHoopLeft = (State.hoopSide === 'left');
    const inwardDir = isHoopLeft ? 1 : -1;
    const scoreColor = isClean ? '#38bdf8' : (multiplier >= 2 ? '#fbbf24' : '#f59e0b');

    // 1. Primary Points popup - directly at rim with punchy comic pop
    addFloatingText(`+${shotPoints.toLocaleString()} PTS!`, midRimX, hoop.rimY - 26, scoreColor, 28, {
      vx: (Math.random() - 0.5) * 8,
      vy: -24,
      rotation: (Math.random() - 0.5) * 0.08
    });

    // 2. Style, Distance & Multiplier Breakdown
    const parts = [];
    if (styleLabel) parts.push(styleLabel);
    parts.push(distLabel);
    if (isOffscreen && apexFeet >= 38) parts.push(`${apexFeet}FT SKY`);
    if (multiplier > 1) {
      parts.push(`×${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}`);
    }
    const breakdown = parts.join(' • ');

    // Spawn breakdown cleanly below net so it drifts like the swishing net
    setTimeout(() => {
      addFloatingText(breakdown, midRimX, hoop.rimY + hoop.netDepth * 0.55 + 6, '#e2e8f0', 17, {
        vx: (Math.random() - 0.5) * 8,
        vy: 16,
        rotation: (Math.random() - 0.5) * 0.06
      });
    }, 70);

    // 3. Streak Milestones (prominent size 28 matching points, bursting into open court with whacky comic tilt)
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

        // Burst into open court space where clearance is huge on both landscape & portrait
        const courtCenterX = width * 0.5 + (Math.random() - 0.5) * 30;
        const courtCenterY = Math.max(48, Math.min(78, height * 0.20));

        addFloatingText(streakMsg, courtCenterX, courtCenterY, streakColor, 28, {
          vx: (Math.random() - 0.5) * 12,
          vy: -22 - Math.random() * 6,
          rotation: (Math.random() - 0.5) * 0.08
        });
      }, 150);
    }

    // 4. Epic Stratosphere / Moonshot callout (ONLY for true mega-high arcs >= 80 FT)
    if (isOffscreen && apexFeet >= 80 && heightLabel) {
      setTimeout(() => {
        let labelColor = '#c084fc';
        if (apexFeet >= 160) labelColor = '#f43f5e';
        else if (apexFeet >= 120) labelColor = '#a855f7';

        // High in open court sky!
        const skyX = width * 0.5 + (Math.random() - 0.5) * 50;
        const skyY = Math.max(38, Math.min(65, height * 0.18));

        addFloatingText(`${heightLabel} (${apexFeet} FT)`, skyX, skyY, labelColor, 25, {
          vx: (Math.random() - 0.5) * 10,
          vy: -16,
          rotation: (Math.random() - 0.5) * 0.10
        });
      }, 220);
    }

    // 4b. Floor Bounce Callout
    if (b.shotData.hitFloor) {
      setTimeout(() => {
        addFloatingText('FLOOR BOUNCE! 🏓', midRimX, hoop.rimY - 45, '#38bdf8', 26, {
          vx: (Math.random() - 0.5) * 8,
          vy: -22,
          rotation: (Math.random() - 0.5) * 0.08
        });
      }, 120);
    }

    // 5. New High Score celebration! Center court banner
    if (isNewBestRun) {
      setTimeout(() => {
        const centerScoreX = width * 0.5;
        const centerScoreY = Math.max(48, Math.min(80, height * 0.22));
        addFloatingText('★ NEW HIGH SCORE! ★', centerScoreX, centerScoreY, '#f59e0b', 27, {
          vx: 0,
          vy: -20,
          rotation: 0
        });
      }, 280);
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
    // 1. Hot-Rod Fire: 5 baskets within 5 seconds
    const nowMs = performance.now();
    recentBasketTimes.push(nowMs);
    recentBasketTimes = recentBasketTimes.filter(t => nowMs - t <= 5000);
    if (recentBasketTimes.length >= 5) {
      unlockAchievement('speed_demon_5');
    }

    // 2. Beach Ball: 10 Streak
    if (State.streak >= 10) {
      unlockAchievement('streak_10');
    }

    // 3. 24K Midas: 20 Streak
    if (State.streak >= 20) {
      unlockAchievement('midas_streak_20');
    }

    // 4. Watermelon: 5 Clean Shots in single run
    if (State.sessionCleanShots >= 5) {
      unlockAchievement('clean_run_5');
    }

    // 5. 8-Ball: 100 Lifetime Baskets
    if (State.lifetimeBaskets >= 100) {
      unlockAchievement('total_100');
    }

    // 6. Magma Blaze: 500 Lifetime Baskets
    if (State.lifetimeBaskets >= 500) {
      unlockAchievement('total_500');
    }

    // 7. Blue Plasma (Hidden): Stratosphere Swish (apex >= 80 FT + clean swish)
    if (isClean && isOffscreen && apexFeet >= 80) {
      unlockAchievement('stratosphere_swish');
    }

    // 8. Pink Donut (Hidden): Score after bouncing off opposite gym wall
    if (b.shotData.hitOppositeWall) {
      unlockAchievement('wall_ricochet');
    }

    // Badges
    if (isBank) {
      unlockAchievement('bank_shot');
    }
    if (distFeet >= 28) {
      unlockAchievement('downtown_sniper');
    }

    // 9. Floor Bounce Trickshot
    if (b.shotData.hitFloor) {
      unlockAchievement('floor_bounce');
    }

    b.shotData.resolved = true;
    b.lifeAfterResolve = 0;
    scheduleStorageFlush();
  }

  function handleShotMiss(b) {
    if (b.shotData.resolved) return;
    b.shotData.resolved = true;
    b.lifeAfterResolve = 0;

    // If a newer ball has ALREADY scored since this ball was launched,
    // this previous ball is obsolete and MUST NOT cancel the active streak or score!
    if (State.lastScoredBallId && b.id <= State.lastScoredBallId) {
      return;
    }

    // Prevent a single ball from triggering miss / streak reset multiple times
    if (b.missHandled) return;
    b.missHandled = true;

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
    State.sessionCleanShots = 0;
    State.announcedHighScore = false;
    updateHUD();
    scheduleStorageFlush();
  }

  // Net Spring simulation & Damping
  function updateNet(dt) {
    const k = 140; // spring tension
    const damping = 0.88; // friction

    for (let i = 0; i < hoop.netPoints.length; i++) {
      const p = hoop.netPoints[i];
      const dx = p.restX - p.x;
      const dy = p.restY - p.y;
      p.vx += dx * k * dt;
      p.vy += dy * k * dt;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }



  // ==========================================
  // 8. PROCEDURAL RENDERING ROUTINES
  // ==========================================
  // Procedural Pop-Art Ball Skins
  // ==========================================
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
      case 'fire_hotrod':
        renderHotRodSkin(targetCtx, r);
        break;
      case 'fire_blue':
        renderBlueFireSkin(targetCtx, r);
        break;
      case 'donut':
        renderDonutSkin(targetCtx, r);
        break;
      case 'synthwave':
        renderSynthwaveSkin(targetCtx, r);
        break;
      case 'sniper':
        renderSniperSkin(targetCtx, r);
        break;
      case 'crystal':
        renderCrystalSkin(targetCtx, r);
        break;
      case 'gold':
        renderGoldSkin(targetCtx, r);
        break;
      case 'eightball':
        renderEightBallSkin(targetCtx, r);
        break;
      case 'classic':
      default:
        renderClassicSkin(targetCtx, r);
        break;
    }

    // 1. Dual Comic Contour: Outer white rim light (ensures 100% contrast on dark backgrounds)
    targetCtx.beginPath();
    targetCtx.arc(0, 0, r + 0.8, 0, Math.PI * 2);
    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    targetCtx.lineWidth = 1.4;
    targetCtx.stroke();

    // 2. Bold Comic Pop-Art Midnight Ink Outline
    targetCtx.beginPath();
    targetCtx.arc(0, 0, r, 0, Math.PI * 2);
    targetCtx.strokeStyle = '#0a0f1d';
    targetCtx.lineWidth = Math.max(2.8, r * 0.088);
    targetCtx.stroke();

    targetCtx.restore();
  }

  function renderClassicSkin(c, r) {
    // 1. Saturated Pop-Art Orange base
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#f97316';
    c.fill();

    // 2. Comic Cel-Shaded Shadow Crescent (bottom-right)
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, '#c2410c');
    shadowGrad.addColorStop(0.55, '#9a3412');
    shadowGrad.addColorStop(1, 'rgba(154, 52, 18, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 3. Bold Comic Ink Seams
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(2.4, r * 0.088);
    c.lineCap = 'round';

    // Horizontal & Vertical cross-seams
    c.beginPath();
    c.moveTo(-r, 0);
    c.lineTo(r, 0);
    c.moveTo(0, -r);
    c.lineTo(0, r);
    c.stroke();

    // Symmetrical curved comic arcs
    c.beginPath();
    c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
    c.stroke();

    c.beginPath();
    c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
    c.stroke();

    // 4. Iconic Comic Pop Specular Shine (upper-left glint arc + dot)
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    c.lineWidth = Math.max(2.5, r * 0.095);
    c.lineCap = 'round';
    c.stroke();

    // Glint dot
    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderWatermelonSkin(c, r) {
    // 1. Pop Emerald Green base
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#10b981';
    c.fill();

    // 2. Cel-shaded shadow crescent
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, '#047857');
    shadowGrad.addColorStop(0.6, '#064e3b');
    shadowGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 3. Bold comic wavy longitudinal stripes
    c.strokeStyle = '#022c22';
    c.lineWidth = r * 0.2;
    [-0.55, 0, 0.55].forEach(offset => {
      c.beginPath();
      c.moveTo(offset * r, -r);
      for (let y = -r; y <= r; y += 8) {
        const wave = Math.sin(y * 0.22) * (r * 0.14);
        c.lineTo(offset * r + wave, y);
      }
      c.stroke();
    });

    // 4. Comic glint shine arc + dot
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    c.lineWidth = Math.max(2.4, r * 0.09);
    c.lineCap = 'round';
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderBeachBallSkin(c, r) {
    // 6 Alternating bold pop-art wedges
    const colors = ['#ef4444', '#ffffff', '#06b6d4', '#ffffff', '#eab308', '#ffffff'];
    const wedgeAngle = (Math.PI * 2) / 6;

    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r, i * wedgeAngle, (i + 1) * wedgeAngle);
      c.closePath();
      c.fillStyle = colors[i];
      c.fill();

      // Comic wedge ink dividers
      c.strokeStyle = '#0a0f1d';
      c.lineWidth = 1.8;
      c.stroke();
    }

    // Top circular cap button with black ink ring
    c.beginPath();
    c.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = 2.2;
    c.stroke();

    // Cel-shaded shadow overlay
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, 'rgba(10, 15, 29, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(10, 15, 29, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // Comic specular shine arc + dot
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = Math.max(2.4, r * 0.09);
    c.lineCap = 'round';
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderFireSkin(c, r) {
    // 1. Saturated Molten Lava Base (incandescent lemon to volcanic ruby)
    const grad = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.05, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f97316');
    grad.addColorStop(0.7, '#dc2626');
    grad.addColorStop(1, '#7f1d1d');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Volcanic Cel-Shaded Shadow Crescent
    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, 'rgba(69, 10, 10, 0.7)');
    shadowGrad.addColorStop(1, 'rgba(69, 10, 10, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 3. Crackling Molten Lava Basketball Seams
    function drawSeams() {
      c.beginPath();
      c.moveTo(-r, 0); c.lineTo(r, 0);
      c.moveTo(0, -r); c.lineTo(0, r);
      c.stroke();
      c.beginPath();
      c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
      c.stroke();
      c.beginPath();
      c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
      c.stroke();
    }

    // Layer 1: Dark Obsidian Midnight Ink Fissures
    c.lineCap = 'round';
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(3.2, r * 0.13);
    drawSeams();

    // Layer 2: Electric Blazing Flame Orange Glow
    c.strokeStyle = '#ea580c';
    c.lineWidth = Math.max(2.0, r * 0.08);
    drawSeams();

    // Layer 3: White-Hot Incandescent Lava Center
    c.strokeStyle = '#fffbeb';
    c.lineWidth = Math.max(1.1, r * 0.038);
    drawSeams();

    // 4. Iconic Pop Specular Shine (upper-left arc + dot)
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    c.lineWidth = Math.max(2.5, r * 0.095);
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderHotRodSkin(c, r) {
    // 1. Sleek Midnight Slate Sphere
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#0f172a';
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // Cel shadow
    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 2. Connected Classic Comic Flame Wrap (rising from bottom across the sphere)
    c.beginPath();
    c.moveTo(-r, r * 0.2);
    c.quadraticCurveTo(-r * 0.8, -r * 0.1, -r * 0.5, -r * 0.55); // Left Flame Tip
    c.quadraticCurveTo(-r * 0.25, -r * 0.1, -r * 0.1, -r * 0.25); // Left Notch
    c.quadraticCurveTo(0, -r * 0.75, r * 0.15, -r * 0.8); // Center High Flame Tip
    c.quadraticCurveTo(r * 0.2, -r * 0.15, r * 0.35, -r * 0.2); // Right Notch
    c.quadraticCurveTo(r * 0.6, -r * 0.5, r * 0.75, -r * 0.35); // Right Flame Tip
    c.quadraticCurveTo(r * 0.85, 0, r, r * 0.2);
    c.lineTo(r, r);
    c.lineTo(-r, r);
    c.closePath();
    c.fillStyle = '#ea580c';
    c.fill();
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(2.4, r * 0.09);
    c.stroke();

    // Inner Flame: Bright Canary Yellow
    c.beginPath();
    c.moveTo(-r * 0.9, r * 0.35);
    c.quadraticCurveTo(-r * 0.7, 0, -r * 0.48, -r * 0.42); // Left Inner Tip
    c.quadraticCurveTo(-r * 0.25, 0, -r * 0.1, -r * 0.12);
    c.quadraticCurveTo(0, -r * 0.6, r * 0.14, -r * 0.65); // Center Inner Tip
    c.quadraticCurveTo(r * 0.18, -r * 0.05, r * 0.32, -r * 0.1);
    c.quadraticCurveTo(r * 0.55, -r * 0.35, r * 0.68, -r * 0.22); // Right Inner Tip
    c.quadraticCurveTo(r * 0.75, 0.1, r * 0.9, r * 0.35);
    c.lineTo(r * 0.9, r);
    c.lineTo(-r * 0.9, r);
    c.closePath();
    c.fillStyle = '#fde047';
    c.fill();

    // White-hot center lick
    c.beginPath();
    c.arc(0.05 * r, 0.1 * r, r * 0.22, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    // Specular shine arc + dot
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = Math.max(2.4, r * 0.09);
    c.lineCap = 'round';
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderBlueFireSkin(c, r) {
    // 1. Cool Electric Plasma Base
    const grad = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.05, 0, 0, r);
    grad.addColorStop(0, '#ecfeff');
    grad.addColorStop(0.3, '#38bdf8');
    grad.addColorStop(0.7, '#0284c7');
    grad.addColorStop(1, '#0f172a');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // Cel Shadow
    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 2. Crackling Electric Blue Basketball Seams
    function drawSeams() {
      c.beginPath();
      c.moveTo(-r, 0); c.lineTo(r, 0);
      c.moveTo(0, -r); c.lineTo(0, r);
      c.stroke();
      c.beginPath();
      c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
      c.stroke();
      c.beginPath();
      c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
      c.stroke();
    }

    c.lineCap = 'round';
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(3.2, r * 0.13);
    drawSeams();

    c.strokeStyle = '#0284c7';
    c.lineWidth = Math.max(2.0, r * 0.08);
    drawSeams();

    c.strokeStyle = '#cffafe';
    c.lineWidth = Math.max(1.1, r * 0.038);
    drawSeams();

    // Pop shine
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    c.lineWidth = Math.max(2.5, r * 0.095);
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.6, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderDonutSkin(c, r) {
    // 1. Golden-baked Dough Base
    const doughGrad = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    doughGrad.addColorStop(0, '#fef3c7');
    doughGrad.addColorStop(0.5, '#f59e0b');
    doughGrad.addColorStop(1, '#b45309');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = doughGrad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Glossy Pop-Art Strawberry Frosting with undulating comic drips
    c.beginPath();
    const drips = [
      [0.82, -0.2], [0.72, 0.35], [0.45, 0.72], [0.0, 0.78],
      [-0.45, 0.7], [-0.72, 0.35], [-0.82, -0.2], [-0.5, -0.7],
      [0.0, -0.82], [0.5, -0.7]
    ];
    c.moveTo(drips[0][0] * r, drips[0][1] * r);
    for (let i = 0; i < drips.length; i++) {
      const next = drips[(i + 1) % drips.length];
      const midX = (drips[i][0] + next[0]) * 0.5 * r;
      const midY = (drips[i][1] + next[1]) * 0.5 * r;
      c.quadraticCurveTo(drips[i][0] * r, drips[i][1] * r, midX, midY);
    }
    c.closePath();

    const frostGrad = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 0.85);
    frostGrad.addColorStop(0, '#fda4af');
    frostGrad.addColorStop(0.4, '#fb7185');
    frostGrad.addColorStop(1, '#e11d48');
    c.fillStyle = frostGrad;
    c.fill();
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(2.2, r * 0.088);
    c.stroke();

    // 3. Center Donut Hole with baked inner depth
    c.beginPath();
    c.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    c.fillStyle = '#78350f';
    c.fill();
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(2.2, r * 0.088);
    c.stroke();

    c.beginPath();
    c.arc(r * 0.04, r * 0.04, r * 0.26, 0, Math.PI * 2);
    c.fillStyle = '#451a03';
    c.fill();

    // 4. Colorful Rainbow Comic Sprinkles (Jimmies)
    const sprinkles = [
      { x: -0.45, y: -0.42, a: 0.6, col: '#fde047' },  // Yellow
      { x: 0.38,  y: -0.45, a: -0.5, col: '#38bdf8' }, // Cyan
      { x: -0.52, y: 0.12,  a: 0.2, col: '#4ade80' },  // Lime
      { x: 0.48,  y: 0.15,  a: 0.8, col: '#ffffff' },  // White
      { x: -0.22, y: 0.52,  a: -0.4, col: '#fde047' }, // Yellow
      { x: 0.25,  y: 0.52,  a: 0.3, col: '#c084fc' },  // Purple
      { x: -0.05, y: -0.55, a: 1.2, col: '#ffffff' },  // White
      { x: 0.52,  y: -0.15, a: -0.8, col: '#4ade80' }  // Lime
    ];

    sprinkles.forEach(s => {
      c.save();
      c.translate(s.x * r, s.y * r);
      c.rotate(s.a);
      c.beginPath();
      const sw = Math.max(1.8, r * 0.075);
      const sl = Math.max(4.2, r * 0.22);
      if (typeof c.roundRect === 'function') {
        c.roundRect(-sl / 2, -sw / 2, sl, sw, sw / 2);
      } else {
        c.rect(-sl / 2, -sw / 2, sl, sw);
      }
      c.fillStyle = s.col;
      c.fill();
      c.strokeStyle = '#0a0f1d';
      c.lineWidth = 1.1;
      c.stroke();
      c.restore();
    });

    // 5. Glossy Specular Shine Arc on Frosting
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = Math.max(2.4, r * 0.09);
    c.lineCap = 'round';
    c.stroke();

    c.restore();
  }

  function renderSynthwaveSkin(c, r) {
    // 1. Deep Midnight Cyberpunk Violet Base
    const synthGrad = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    synthGrad.addColorStop(0, '#581c87');    // Electric violet core
    synthGrad.addColorStop(0.35, '#3b0764'); // Deep purple abyss
    synthGrad.addColorStop(0.75, '#1e0842'); // Midnight synthwave
    synthGrad.addColorStop(1, '#0b0217');    // Pitch black rim

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = synthGrad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Retro 80s Wireframe Horizon Perspective Grid (Lower Hemisphere)
    c.strokeStyle = 'rgba(6, 182, 212, 0.45)'; // Neon cyan grid
    c.lineWidth = 1.0;

    // Horizon line
    c.beginPath();
    c.moveTo(-r, r * 0.1);
    c.lineTo(r, r * 0.1);
    c.stroke();

    // Horizontal perspective lines getting closer to horizon
    const gridYs = [r * 0.28, r * 0.48, r * 0.70, r * 0.88];
    gridYs.forEach(gy => {
      c.beginPath();
      c.moveTo(-r, gy);
      c.lineTo(r, gy);
      c.stroke();
    });

    // Converging perspective lines towards horizon center
    const vpX = 0;
    const vpY = r * 0.1;
    const bottomOffsets = [-r * 0.85, -r * 0.55, -r * 0.25, 0, r * 0.25, r * 0.55, r * 0.85];
    bottomOffsets.forEach(bx => {
      c.beginPath();
      c.moveTo(vpX, vpY);
      c.lineTo(bx, r);
      c.stroke();
    });

    // 3. Neon Laser Seams (Dual-glow: Hot Pink & Laser Cyan)
    function drawSynthSeam(drawPath) {
      c.save();
      c.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      c.lineWidth = 3.8;
      c.beginPath();
      drawPath();
      c.stroke();

      c.strokeStyle = '#67e8f9';
      c.lineWidth = 1.6;
      c.beginPath();
      drawPath();
      c.stroke();
      c.restore();
    }

    drawSynthSeam(() => {
      c.moveTo(-r, 0);
      c.lineTo(r, 0);
    });
    drawSynthSeam(() => {
      c.moveTo(0, -r);
      c.lineTo(0, r);
    });
    drawSynthSeam(() => {
      c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
    });
    drawSynthSeam(() => {
      c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
    });

    // 4. Hot Neon Pink Rim Glow (Lower-Right)
    const glowGrad = c.createRadialGradient(r * 0.5, r * 0.5, r * 0.1, r * 0.5, r * 0.5, r * 0.95);
    glowGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
    glowGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    c.beginPath();
    c.arc(r * 0.4, r * 0.4, r * 0.85, 0, Math.PI * 2);
    c.fillStyle = glowGrad;
    c.fill();

    // 5. Electric Cyan Specular Arc
    c.beginPath();
    c.arc(-r * 0.18, -r * 0.18, r * 0.65, -Math.PI * 0.85, -Math.PI * 0.42);
    c.strokeStyle = '#cffafe';
    c.lineWidth = Math.max(2.2, r * 0.08);
    c.lineCap = 'round';
    c.stroke();

    c.restore();
  }

  function renderCrystalSkin(c, r) {
    // 1. Prismatic Icy Crystal Glass Base Gradient
    const glassGrad = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    glassGrad.addColorStop(0, '#f0fdfa');    // Bright mint-white diamond core
    glassGrad.addColorStop(0.25, '#cffafe'); // Translucent ice cyan
    glassGrad.addColorStop(0.58, '#67e8f9'); // Electric cyan
    glassGrad.addColorStop(0.85, '#06b6d4'); // Aquatic cyan depth
    glassGrad.addColorStop(1, '#0e7490');    // Deep teal crystalline rim

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = glassGrad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Crystalline Internal Refraction Shadow (Bottom-Right Crescent)
    const refGrad = c.createRadialGradient(r * 0.4, r * 0.4, r * 0.1, r * 0.4, r * 0.4, r * 0.95);
    refGrad.addColorStop(0, 'rgba(8, 51, 68, 0.7)');
    refGrad.addColorStop(0.7, 'rgba(14, 116, 144, 0.3)');
    refGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    c.beginPath();
    c.arc(r * 0.3, r * 0.3, r * 0.9, 0, Math.PI * 2);
    c.fillStyle = refGrad;
    c.fill();

    // 3. Faceted Diamond Geometry (Central Octagonal Table & Radiant Facet Triangles)
    const sides = 8;
    const innerR = r * 0.48;
    const innerPts = [];
    for (let i = 0; i < sides; i++) {
      const theta = (i * Math.PI * 2) / sides - Math.PI / 8;
      innerPts.push({ x: Math.cos(theta) * innerR, y: Math.sin(theta) * innerR });
    }

    const outerPts = [];
    for (let i = 0; i < sides; i++) {
      const theta = (i * Math.PI * 2) / sides - Math.PI / 8;
      outerPts.push({ x: Math.cos(theta) * (r * 0.98), y: Math.sin(theta) * (r * 0.98) });
    }

    // Triangular bevel facets between inner polygon and outer rim
    const facetTints = [
      'rgba(244, 114, 182, 0.14)', // Soft pink
      'rgba(165, 243, 252, 0.28)', // Ice cyan
      'rgba(192, 132, 252, 0.16)', // Violet
      'rgba(255, 255, 255, 0.22)', // Pure light
      'rgba(56, 189, 248, 0.18)',  // Sky blue
      'rgba(253, 224, 71, 0.12)',  // Prism gold
      'rgba(165, 243, 252, 0.25)', // Ice cyan
      'rgba(255, 255, 255, 0.15)'
    ];

    for (let i = 0; i < sides; i++) {
      const nextI = (i + 1) % sides;
      c.beginPath();
      c.moveTo(innerPts[i].x, innerPts[i].y);
      c.lineTo(innerPts[nextI].x, innerPts[nextI].y);
      c.lineTo(outerPts[nextI].x, outerPts[nextI].y);
      c.lineTo(outerPts[i].x, outerPts[i].y);
      c.closePath();

      c.fillStyle = facetTints[i % facetTints.length];
      c.fill();
      c.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      c.lineWidth = 1.2;
      c.stroke();
    }

    // Central Table Facet (Inner Octagon)
    c.beginPath();
    c.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < sides; i++) {
      c.lineTo(innerPts[i].x, innerPts[i].y);
    }
    c.closePath();
    c.fillStyle = 'rgba(255, 255, 255, 0.22)';
    c.fill();
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = 1.5;
    c.stroke();

    // Dark comic ink accents along key facet bevels for pop-art definition
    c.strokeStyle = 'rgba(10, 15, 29, 0.42)';
    c.lineWidth = 1.1;
    for (let i = 0; i < sides; i += 2) {
      c.beginPath();
      c.moveTo(innerPts[i].x, innerPts[i].y);
      c.lineTo(outerPts[i].x, outerPts[i].y);
      c.stroke();
    }

    // 4. Brilliant 4-Point Specular Star Glint (Diamond Sparkle)
    const sparkleX = -r * 0.36;
    const sparkleY = -r * 0.36;
    const sparkleSize = Math.max(5.5, r * 0.32);

    c.save();
    c.translate(sparkleX, sparkleY);

    const starHalo = c.createRadialGradient(0, 0, 1, 0, 0, sparkleSize * 1.4);
    starHalo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    starHalo.addColorStop(0.35, 'rgba(165, 243, 252, 0.5)');
    starHalo.addColorStop(1, 'rgba(165, 243, 252, 0)');
    c.beginPath();
    c.arc(0, 0, sparkleSize * 1.4, 0, Math.PI * 2);
    c.fillStyle = starHalo;
    c.fill();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -sparkleSize);
    c.quadraticCurveTo(0, 0, sparkleSize, 0);
    c.quadraticCurveTo(0, 0, 0, sparkleSize);
    c.quadraticCurveTo(0, 0, -sparkleSize, 0);
    c.quadraticCurveTo(0, 0, 0, -sparkleSize);
    c.fill();

    c.beginPath();
    c.arc(r * 0.28, -r * 0.22, Math.max(1.5, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
    c.restore();
  }

  function renderSniperSkin(c, r) {
    // 1. Matte Stealth Carbon Black Base Gradient
    const carbonGrad = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
    carbonGrad.addColorStop(0, '#334155');    // Slate stealth highlight
    carbonGrad.addColorStop(0.35, '#1e293b'); // Dark ballistic slate
    carbonGrad.addColorStop(0.75, '#0f172a'); // Midnight carbon
    carbonGrad.addColorStop(1, '#020617');    // Pitch black rim

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = carbonGrad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Ballistic Carbon Texture / Range Rings
    c.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    c.lineWidth = 1.0;
    c.beginPath();
    c.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    c.arc(0, 0, r * 0.44, 0, Math.PI * 2);
    c.stroke();

    // 3. Neon Red Tactical Targeting Reticle
    const reticleCol = '#ef4444';
    const laserCoreCol = '#fecdd3';

    // Outer Target Scope Ring
    c.beginPath();
    c.arc(0, 0, r * 0.64, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    c.lineWidth = 3.5;
    c.stroke();
    c.strokeStyle = reticleCol;
    c.lineWidth = 1.6;
    c.stroke();

    // Inner Target Aperture
    c.beginPath();
    c.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    c.strokeStyle = reticleCol;
    c.lineWidth = 1.6;
    c.stroke();

    // Crosshairs with Center Aperture Break (horizontal & vertical)
    const gap = r * 0.24;
    const len = r * 0.88;

    function drawLaserLine(x1, y1, x2, y2) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      c.lineWidth = 3.0;
      c.stroke();

      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = reticleCol;
      c.lineWidth = 1.5;
      c.stroke();
    }

    drawLaserLine(0, -len, 0, -gap);
    drawLaserLine(0, gap, 0, len);
    drawLaserLine(-len, 0, -gap, 0);
    drawLaserLine(gap, 0, len, 0);

    // Mil-Dot / Rangefinder Ticks along crosshair axes
    const tickOffsets = [r * 0.42, r * 0.64, r * 0.78];
    const tickHalf = Math.max(1.8, r * 0.08);
    c.strokeStyle = laserCoreCol;
    c.lineWidth = 1.3;
    c.beginPath();
    tickOffsets.forEach(d => {
      c.moveTo(d, -tickHalf); c.lineTo(d, tickHalf);
      c.moveTo(-d, -tickHalf); c.lineTo(-d, tickHalf);
      c.moveTo(-tickHalf, d); c.lineTo(tickHalf, d);
      c.moveTo(-tickHalf, -d); c.lineTo(tickHalf, -d);
    });
    c.stroke();

    // 4 Corner Quadrant Chevron Marks (tactical brackets)
    const bRad = r * 0.48;
    const bAngle = Math.PI / 4;
    for (let i = 0; i < 4; i++) {
      const angle = bAngle + (i * Math.PI) / 2;
      const bx = Math.cos(angle) * bRad;
      const by = Math.sin(angle) * bRad;
      c.beginPath();
      c.arc(bx, by, Math.max(1.6, r * 0.05), 0, Math.PI * 2);
      c.fillStyle = reticleCol;
      c.fill();
    }

    // Center Laser Bullseye Dot
    c.beginPath();
    c.arc(0, 0, Math.max(2.2, r * 0.09), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = reticleCol;
    c.lineWidth = 1.2;
    c.stroke();

    // 4. Optic Glass Lens Reflection Streak
    c.beginPath();
    c.arc(-r * 0.18, -r * 0.18, r * 0.68, -Math.PI * 0.85, -Math.PI * 0.42);
    c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    c.lineWidth = Math.max(2.0, r * 0.07);
    c.lineCap = 'round';
    c.stroke();

    c.restore();
  }

  function renderGoldSkin(c, r) {
    // 1. Saturated 24K Metallic Gold Base
    const goldGrad = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
    goldGrad.addColorStop(0, '#fef9c3');
    goldGrad.addColorStop(0.25, '#fde047');
    goldGrad.addColorStop(0.55, '#eab308');
    goldGrad.addColorStop(0.85, '#ca8a04');
    goldGrad.addColorStop(1, '#854d0e');

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = goldGrad;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // 2. Rich Bronze Cel-Shaded Shadow Crescent
    const shadowGrad = c.createRadialGradient(r * 0.45, r * 0.45, r * 0.1, r * 0.45, r * 0.45, r * 1.05);
    shadowGrad.addColorStop(0, 'rgba(113, 63, 18, 0.75)');
    shadowGrad.addColorStop(1, 'rgba(113, 63, 18, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 3. Championship Pure White Enamel Seams
    function drawSeams() {
      c.beginPath();
      c.moveTo(-r, 0); c.lineTo(r, 0);
      c.moveTo(0, -r); c.lineTo(0, r);
      c.stroke();
      c.beginPath();
      c.arc(-r * 0.95, 0, r * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
      c.stroke();
      c.beginPath();
      c.arc(r * 0.95, 0, r * 0.75, Math.PI * 0.65, Math.PI * 1.35);
      c.stroke();
    }

    // Outer Midnight Ink Border
    c.lineCap = 'round';
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = Math.max(3.4, r * 0.14);
    drawSeams();

    // Inner White Enamel Ribs
    c.strokeStyle = '#ffffff';
    c.lineWidth = Math.max(2.2, r * 0.088);
    drawSeams();

    // 4. Comic 4-Point Starburst Glint (✦) at Upper Highlight
    const sx = -r * 0.38, sy = -r * 0.38;
    c.beginPath();
    c.moveTo(sx, sy - r * 0.32);
    c.quadraticCurveTo(sx, sy, sx + r * 0.32, sy);
    c.quadraticCurveTo(sx, sy, sx, sy + r * 0.32);
    c.quadraticCurveTo(sx, sy, sx - r * 0.32, sy);
    c.quadraticCurveTo(sx, sy, sx, sy - r * 0.32);
    c.closePath();
    c.fillStyle = '#ffffff';
    c.fill();

    c.beginPath();
    c.arc(sx, sy, Math.max(2, r * 0.08), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    // Specular shine arc
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    c.lineWidth = Math.max(2.5, r * 0.095);
    c.stroke();

    // Small sparkle on right
    const sx2 = r * 0.45, sy2 = -r * 0.25;
    c.beginPath();
    c.moveTo(sx2, sy2 - r * 0.18);
    c.quadraticCurveTo(sx2, sy2, sx2 + r * 0.18, sy2);
    c.quadraticCurveTo(sx2, sy2, sx2, sy2 + r * 0.18);
    c.quadraticCurveTo(sx2, sy2, sx2 - r * 0.18, sy2);
    c.quadraticCurveTo(sx2, sy2, sx2, sy2 - r * 0.18);
    c.closePath();
    c.fillStyle = '#ffffff';
    c.fill();

    c.restore();
  }

  function renderEightBallSkin(c, r) {
    // 1. Sleek comic sphere body: rich midnight-slate tone that detaches from dark backgrounds
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#1e293b';
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();

    // Deep cel-shaded black shadow crescent
    const shadowGrad = c.createRadialGradient(r * 0.35, r * 0.35, r * 0.1, r * 0.35, r * 0.35, r * 1.05);
    shadowGrad.addColorStop(0, '#090d16');
    shadowGrad.addColorStop(0.7, '#020617');
    shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    c.beginPath();
    c.arc(r * 0.35, r * 0.35, r * 0.95, 0, Math.PI * 2);
    c.fillStyle = shadowGrad;
    c.fill();

    // 2. Comic Bounce Light / Rim Light Crescent on the shadow side!
    // Cyan/white reflected court light outlining the dark edge against dark backgrounds!
    c.beginPath();
    c.arc(r * 0.08, r * 0.08, r * 0.88, Math.PI * 0.12, Math.PI * 0.68);
    c.strokeStyle = '#38bdf8'; // electric cyan bounce light!
    c.lineWidth = Math.max(2.2, r * 0.08);
    c.lineCap = 'round';
    c.stroke();

    // 3. Crisp white center disc with comic ink outline
    c.beginPath();
    c.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = '#0a0f1d';
    c.lineWidth = 2.4;
    c.stroke();

    // 4. Heavy black comic numeral '8'
    c.fillStyle = '#0a0f1d';
    c.font = `900 ${Math.round(r * 0.58)}px system-ui, -apple-system, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('8', 0, 1);

    // 5. High-contrast comic specular shine arc + glint dot on upper-left
    c.beginPath();
    c.arc(-r * 0.15, -r * 0.15, r * 0.62, -Math.PI * 0.88, -Math.PI * 0.38);
    c.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    c.lineWidth = Math.max(2.6, r * 0.098);
    c.lineCap = 'round';
    c.stroke();

    c.beginPath();
    c.arc(-r * 0.52, -r * 0.52, Math.max(1.8, r * 0.085), 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();

    // 6. Perimeter Comic Silhouette Rim Light (Electric edge light)
    c.beginPath();
    c.arc(0, 0, r - 1, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    c.lineWidth = 1.6;
    c.stroke();

    c.restore();
  }

  function renderCourtFloor() {
    // Graphic Comic Pop-Art Baseline
    const floorY = height - 12;
    ctx.save();
    // Solid midnight ink floor line
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(width, floorY);
    ctx.stroke();

    // Graphic pop accent line above baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY - 3);
    ctx.lineTo(width, floorY - 3);
    ctx.stroke();

    ctx.restore();
  }

  // ------------------------------------------
  // Main Render Loop
  // ------------------------------------------
  function renderScene() {
    // Transparent canvas: clearRect is ultra-fast
    ctx.clearRect(0, 0, width, height);

    // 0. Hardwood Floor Baseline & 3-Point Boundary
    renderCourtFloor();

    // Subtle ambient stadium court halo behind hoop & play zone for rich contrast
    if (cachedHoopSpotGradient) {
      ctx.save();
      ctx.fillStyle = cachedHoopSpotGradient;
      ctx.beginPath();
      ctx.arc(hoop.rimFrontX, hoop.rimY, cachedHoopSpotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 1. Backboard Pole & Mounting Brackets (Background)
    renderBackboard();

    // 2. Net Back Strands
    renderNetStrands(false);

    // 3. Predictive Dotted Trajectory Arc (when Aiming)
    if (State.isAiming) {
      renderPredictiveTrajectory();
    }

    // 4. Ball Entities (with 2.5D layering)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.scale <= 0.01 || b.opacity <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = b.opacity;
      const renderRadius = b.radius * b.scale;

      // Comic Pop-Art cel-shaded contact shadow when near floor
      if (b.y > height * 0.45) {
        const groundY = height - 12;
        const distToGround = Math.max(0, groundY - b.y);
        const shadowScale = Math.max(0.2, 1 - distToGround / 350);
        const shadowAlpha = Math.min(0.45, 0.45 * shadowScale);

        ctx.beginPath();
        ctx.ellipse(b.x, groundY, renderRadius * shadowScale * 1.15, 4.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10, 15, 29, ${shadowAlpha})`;
        ctx.fill();
      }

      renderBallSkin(ctx, b.x, b.y, renderRadius, b.angle, State.equippedSkin);
      ctx.restore();
    }

    // 4a. Shot Zone & Distance Badge floating above active ball when aiming or idle (Comic Pop-Art Badge)
    if (activeBall && !activeBall.isLaunched && activeBall.shotData.distanceFeet && activeBall.scale >= 0.5) {
      ctx.save();
      ctx.globalAlpha = activeBall.opacity;
      const renderRadius = activeBall.radius * activeBall.scale;
      const badgeY = activeBall.originY - renderRadius - 20;
      const badgeText = `${activeBall.shotData.zoneName} • ${activeBall.shotData.distanceFeet} FT`;
      ctx.font = '900 11px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const padX = 9;
      const bWidth = textWidth + padX * 2;
      const bHeight = 20;
      const bX = activeBall.originX - bWidth / 2;
      const bY = badgeY - bHeight / 2;

      // Comic badge background & midnight ink outline
      ctx.fillStyle = 'rgba(10, 15, 29, 0.92)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bX, bY, bWidth, bHeight, 10);
      } else {
        ctx.rect(bX, bY, bWidth, bHeight);
      }
      ctx.fill();

      ctx.strokeStyle = activeBall.shotData.zoneColor || '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, activeBall.originX, badgeY + 0.5);
      ctx.restore();
    }

    // 4b. Space Altitude Indicators: for any launched balls in high flight above canvas (Comic Pop Indicator)
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.isLaunched && b.y < -b.radius && !b.shotData.resolved) {
        ctx.save();
        const indicatorX = Math.max(24, Math.min(width - 24, b.x));
        const heightFt = getBallAltitudeFeet(b.y);
        const altText = `${heightFt} FT`;

        // Triangle pointer downwards with midnight ink border
        ctx.beginPath();
        ctx.moveTo(indicatorX - 10, 7);
        ctx.lineTo(indicatorX + 10, 7);
        ctx.lineTo(indicatorX, 20);
        ctx.closePath();
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#0a0f1d';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Pulsing miniature comic ball indicator
        ctx.beginPath();
        ctx.arc(indicatorX, 31, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#0a0f1d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // White comic glint on mini ball
        ctx.beginPath();
        ctx.arc(indicatorX - 2.5, 28.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Altitude text badge in FT
        ctx.font = '900 11px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(altText).width;
        const bW = textWidth + 12;
        const bH = 18;
        const bX = indicatorX - bW / 2;
        const bY = 50 - bH / 2;

        ctx.fillStyle = 'rgba(10, 15, 29, 0.92)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bX, bY, bW, bH, 9);
        } else {
          ctx.rect(bX, bY, bW, bH);
        }
        ctx.fill();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(altText, indicatorX, 50.5);
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

    const isLeft = (State.hoopSide === 'left');
    const wallX = isLeft ? 0 : width;

    // 1. Support pole extending to outer edge (Bold comic steel)
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hoop.backboardX, hoop.y);
    ctx.lineTo(wallX, hoop.y);
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // 2. Mounting bracket to back rim (Bold comic fiery bracket)
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hoop.backboardX, hoop.y);
    ctx.lineTo(hoop.rimBackX, hoop.rimY);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 3. Comic Pop-Art Acrylic / Glass Backboard
    // Wider, authentic tempered glass board
    const bbWidth = 12;
    const bbX = hoop.backboardX - bbWidth / 2;
    const bbY = hoop.backboardTop;
    const bbH = hoop.backboardBottom - hoop.backboardTop;

    // Luminous frosted acrylic pane with high-contrast comic glow
    ctx.fillStyle = 'rgba(224, 242, 254, 0.42)'; // luminous frosted glass!
    ctx.fillRect(bbX, bbY, bbWidth, bbH);

    // Inner bright glass highlight fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(bbX + 2, bbY + 2, bbWidth - 4, bbH - 4);

    // Iconic Comic Glass Reflection Slashes (bright white reflective shine)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bbX + 1.5, bbY + bbH * 0.20);
    ctx.lineTo(bbX + bbWidth - 1.5, bbY + bbH * 0.20 + bbWidth * 0.9);
    ctx.moveTo(bbX + 1.5, bbY + bbH * 0.32);
    ctx.lineTo(bbX + bbWidth - 1.5, bbY + bbH * 0.32 + bbWidth * 0.9);
    ctx.stroke();

    // Solid outer midnight ink contour
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 4.0;
    ctx.strokeRect(bbX, bbY, bbWidth, bbH);

    // Solid, radiant white enamel perimeter frame (authentic tempered glass backboard frame!)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(bbX + 1, bbY + 1, bbWidth - 2, bbH - 2);

    // Inner target square on backboard (on court-facing edge of glass)
    const targetH = bbH * 0.35;
    const targetTop = hoop.rimY - targetH + 4;
    const targetX = isLeft ? bbX + bbWidth - 2 : bbX + 2;

    // Target rectangle: white backing keyline + pop red/magenta comic line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(targetX, targetTop);
    ctx.lineTo(targetX, targetTop + targetH);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Back rim ellipse line (heavy ink under-stroke, fiery orange core)
    const rimMidX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const rimRadiusX = Math.abs(hoop.rimBackX - hoop.rimFrontX) / 2;

    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.ellipse(rimMidX, hoop.rimY, rimRadiusX, 3.2, 0, Math.PI, 0, true);
    ctx.stroke();

    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.restore();
  }

  function renderNetStrands(frontOnly = false) {
    if (hoop.netPoints.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const count = hoop.netPoints.length;

    if (frontOnly) {
      // Front net: Graphic comic white rope strands
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.4;
    } else {
      // Back net: Stylized dark slate comic ropes
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.65)';
      ctx.lineWidth = 1.8;
    }

    // Vertical strands
    for (let i = 0; i < count; i++) {
      const p = hoop.netPoints[i];
      ctx.beginPath();
      ctx.moveTo(p.topX, p.topY);
      const ctrlX = (p.topX + p.x) / 2;
      const ctrlY = (p.topY + p.y) / 2;
      ctx.quadraticCurveTo(ctrlX, ctrlY, p.x, p.y);
      ctx.stroke();
    }

    // Horizontal diamond cross-ribs
    if (frontOnly) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.0;
    } else {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
      ctx.lineWidth = 1.5;
    }

    const netFractions = [0.35, 0.7, 1.0];
    for (let f = 0; f < 3; f++) {
      const fraction = netFractions[f];
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const p = hoop.netPoints[i];
        const rx = p.topX + (p.x - p.topX) * fraction;
        const ry = p.topY + (p.y - p.topY) * fraction;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function renderFrontRimAndNet() {
    ctx.save();

    // Front net overlay (draws on top of ball as it falls through!)
    renderNetStrands(true);

    const rimMidX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const rimRadiusX = Math.abs(hoop.rimBackX - hoop.rimFrontX) / 2;

    // Front Rim Arc: Heavy comic ink outline + electric pop orange core
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.ellipse(rimMidX, hoop.rimY, rimRadiusX, 3.8, 0, 0, Math.PI, false);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4.0;
    ctx.stroke();

    // Bright yellow comic glint line along the rim top
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(rimMidX, hoop.rimY - 0.5, rimRadiusX * 0.85, 2.5, 0, 0.15, Math.PI - 0.15, false);
    ctx.stroke();

    // Front and Back Rim Solid Point Colliders (Rivets with comic shine)
    [hoop.rimFrontX, hoop.rimBackX].forEach(rx => {
      ctx.beginPath();
      ctx.arc(rx, hoop.rimY, hoop.rimRadius + 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0f1d';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(rx, hoop.rimY, hoop.rimRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();

      // Comic rivet shine dot
      ctx.beginPath();
      ctx.arc(rx - 0.8, hoop.rimY - 1, hoop.rimRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    });

    ctx.restore();
  }

  function renderPredictiveTrajectory() {
    if (!activeBall || !State.isAiming) return;
    const launch = computeLaunchVelocity(true);
    if (launch.dragDist < 6 || launch.speed < V_MIN) return;

    ctx.save();

    // Smoothed drag offset from touch-down scaled to match true velocity vector
    const dragX = State.aimSmooth.x - State.aimStart.x;
    const dragY = State.aimSmooth.y - State.aimStart.y;
    const screenScaleY = Math.max(1.0, 850 / Math.max(380, height));
    const pullX = dragX;
    const pullY = dragY * screenScaleY;

    // Tactical Slingshot Pull Guideline from Ball (perfect 1:1 angular match with trajectory)
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(activeBall.originX, activeBall.originY);
    ctx.lineTo(activeBall.originX + pullX, activeBall.originY + pullY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tactile slingshot pull bead at ball
    ctx.beginPath();
    ctx.arc(activeBall.originX + pullX, activeBall.originY + pullY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();

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

      // Comic Pop-Art Trajectory Dots
      const alpha = Math.max(0.2, 1 - (i / totalPoints) * 0.8);
      const dotRadius = Math.max(2.5, 4.8 - (i / totalPoints) * 2.2);

      ctx.globalAlpha = alpha;

      // Dark comic ink ring
      ctx.beginPath();
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#0a0f1d';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Electric pop yellow-orange fill
      ctx.fillStyle = (i % 3 === 0) ? '#fde047' : '#fb923c';
      ctx.fill();

      // Energetic white comic glint core for leading dots
      if (i <= totalPoints * 0.4 && i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(px - 0.6, py - 0.6, dotRadius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
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
        const rad = p.radius * (1 - progress * 0.35);

        ctx.globalAlpha = alpha;

        const isDarkSmoke = p.color === '#18181b' || p.color === '#0a0f1d';
        const outlineColor = isDarkSmoke ? 'rgba(255, 255, 255, 0.45)' : '#0a0f1d';

        // Alternate between comic 4-point starburst glints and comic action dots!
        if (i % 2 === 0 && rad > 2.5) {
          // 4-point comic sparkle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          const s = rad * 1.6;
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(0, 0, s, 0);
          ctx.quadraticCurveTo(0, 0, 0, s);
          ctx.quadraticCurveTo(0, 0, -s, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.closePath();

          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
        } else {
          // Comic pop action dot with ink outline (direct without save/translate)
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);

          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function renderFloatingTexts() {
    if (floatingTexts.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const paddingX = 14;
    const screenWidth = width;

    for (let i = 0; i < floatingTexts.length; i++) {
      const item = floatingTexts[i];
      if (item.alpha <= 0.01) continue;

      let fontSize = Math.round(item.fontSize * item.scale);
      if (fontSize < 8) continue;
      // Bold comic pop-art typography
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;

      let textWidth = ctx.measureText(item.text).width;
      const maxAllowedWidth = screenWidth - paddingX * 2;

      // Auto-shrink font if text exceeds screen bounds on very narrow viewports
      if (textWidth > maxAllowedWidth && maxAllowedWidth > 40) {
        const shrinkFactor = maxAllowedWidth / textWidth;
        fontSize = Math.max(12, Math.floor(fontSize * shrinkFactor));
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        textWidth = ctx.measureText(item.text).width;
      }

      // Clamp X position dynamically so text is NEVER cut off by screen edges
      const halfWidth = textWidth / 2;
      let drawX = item.x;
      if (drawX - halfWidth < paddingX) {
        drawX = halfWidth + paddingX;
      } else if (drawX + halfWidth > screenWidth - paddingX) {
        drawX = screenWidth - halfWidth - paddingX;
      }

      let drawY = item.y;

      ctx.save();
      ctx.translate(drawX, drawY);
      if (item.rotation) {
        ctx.rotate(item.rotation);
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, item.alpha));

      // Comic Pop-Art Ink Outline (thick, round, comic-book punch)
      ctx.strokeStyle = 'rgba(10, 15, 29, 0.96)';
      ctx.lineWidth = Math.max(3.8, Math.round(fontSize / 5.2));
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeText(item.text, 0, 0);

      // Vibrant Pop-Art Color Fill
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, 0, 0);

      ctx.restore();
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

    // 4. Update Floating Texts (Smooth deceleration drift & spring animations)
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const item = floatingTexts[i];
      item.age += dt;
      const progress = item.age / item.maxAge;

      // Smooth deceleration drift
      item.x += item.vx * dt * (1 - progress * 0.45);
      item.y += item.vy * dt * (1 - progress * 0.55);

      // Punchy arcade spring pop: 0.35 -> 1.15 in 120ms -> settles to 1.0
      if (item.age < 0.12) {
        item.scale = 0.35 + (item.age / 0.12) * 0.8;
      } else if (item.age < 0.24) {
        item.scale = 1.15 - ((item.age - 0.12) / 0.12) * 0.15;
      } else {
        item.scale = 1.0;
      }

      // Smooth fade-out in final 35% of lifetime
      if (progress > 0.65) {
        item.alpha = 1 - (progress - 0.65) / 0.35;
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
      const ach = ACHIEVEMENTS_CATALOG.find(a => a.skinReward === skin.id);
      const isUnlocked = skin.id === 'classic' || !!State.unlockedSkins[skin.id];
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

      const descEl = document.createElement('div');
      descEl.className = 'skin-condition';
      if (isUnlocked) {
        descEl.textContent = skin.desc;
      } else if (ach) {
        descEl.textContent = ach.hidden ? 'Secret Mystery 🔒' : `Unlock: ${ach.desc}`;
      } else {
        descEl.textContent = skin.desc;
      }

      const badgeEl = document.createElement('div');
      badgeEl.className = 'skin-badge';
      badgeEl.textContent = isEquipped ? 'Equipped' : (isUnlocked ? 'Equip' : 'Locked 🔒');

      card.appendChild(previewWrap);
      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(badgeEl);

      if (isUnlocked) {
        card.addEventListener('click', () => {
          State.equippedSkin = skin.id;
          State.isDirtyStorage = true;
          flushStateToStorage();
          const allCards = dom.skinsGrid.querySelectorAll('.skin-card');
          allCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const allBadges = dom.skinsGrid.querySelectorAll('.skin-badge');
          BALL_SKINS.forEach((s, idx) => {
            const badge = allBadges[idx];
            if (badge) {
              const unlocked = s.id === 'classic' || !!State.unlockedSkins[s.id];
              badge.textContent = (s.id === State.equippedSkin) ? 'Equipped' : (unlocked ? 'Equip' : 'Locked 🔒');
            }
          });
        });
      }

      dom.skinsGrid.appendChild(card);
    });
  }

  function renderAchievementsList() {
    dom.achievementsList.textContent = '';

    // Steam-Style Partition: Visible/unlocked achievements stay in catalog order;
    // locked hidden achievements are pushed to the bottom.
    const standardList = [];
    const hiddenLockedList = [];

    ACHIEVEMENTS_CATALOG.forEach(ach => {
      const isUnlocked = !!State.achievements[ach.id];
      if (ach.hidden && !isUnlocked) {
        hiddenLockedList.push({ ach, isUnlocked: false });
      } else {
        standardList.push({ ach, isUnlocked });
      }
    });

    function createAchievementItem(ach, isUnlocked) {
      const item = document.createElement('div');
      item.className = `achievement-item ${isUnlocked ? 'unlocked' : (ach.hidden ? 'hidden-locked' : '')}`;

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

      if (ach.hidden && !isUnlocked) {
        // Subtle lock padlock icon for secret locked achievements
        const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        p1.setAttribute('x', '3');
        p1.setAttribute('y', '11');
        p1.setAttribute('width', '18');
        p1.setAttribute('height', '11');
        p1.setAttribute('rx', '2');
        p1.setAttribute('ry', '2');
        const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p2.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
        svg.append(p1, p2);
      } else {
        // Trophy icon
        const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p1.setAttribute('d', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6');
        const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p2.setAttribute('d', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18');
        const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p3.setAttribute('d', 'M4 22h16');
        const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p4.setAttribute('d', 'M18 2H6v7a6 6 0 0 0 12 0V2Z');
        svg.append(p1, p2, p3, p4);
      }
      iconBox.appendChild(svg);

      const infoBox = document.createElement('div');
      infoBox.className = 'ach-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'ach-title';

      const descEl = document.createElement('div');
      descEl.className = 'ach-desc';

      const rewardEl = document.createElement('div');
      rewardEl.className = 'ach-reward';

      const statusEl = document.createElement('div');
      statusEl.className = 'ach-status';

      if (ach.hidden && !isUnlocked) {
        titleEl.textContent = 'Secret Achievement 🔒';
        descEl.textContent = 'Keep shooting to discover this hidden trickshot feat';
        rewardEl.textContent = '??? Mystery Ball Skin';
        statusEl.textContent = 'Hidden';
      } else {
        titleEl.textContent = ach.title;
        descEl.textContent = ach.desc;
        rewardEl.textContent = ach.reward;
        statusEl.textContent = isUnlocked ? '✓ Done' : 'Locked';
      }

      infoBox.append(titleEl, descEl, rewardEl);
      item.append(iconBox, infoBox, statusEl);
      return item;
    }

    // 1. Render visible or already-unlocked achievements in their natural catalog position
    standardList.forEach(({ ach, isUnlocked }) => {
      dom.achievementsList.appendChild(createAchievementItem(ach, isUnlocked));
    });

    // 2. Render remaining locked hidden achievements at the bottom (Steam style)
    if (hiddenLockedList.length > 0) {
      const groupEl = document.createElement('div');
      groupEl.className = 'ach-hidden-group';

      const headerEl = document.createElement('div');
      headerEl.className = 'ach-hidden-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'ach-hidden-title';
      titleSpan.textContent = `${hiddenLockedList.length} Hidden Achievement${hiddenLockedList.length > 1 ? 's' : ''} Remaining 🔒`;

      const subSpan = document.createElement('small');
      subSpan.className = 'ach-hidden-sub';
      subSpan.textContent = 'Revealed once unlocked';

      headerEl.append(titleSpan, subSpan);
      groupEl.appendChild(headerEl);

      hiddenLockedList.forEach(({ ach, isUnlocked }) => {
        groupEl.appendChild(createAchievementItem(ach, isUnlocked));
      });

      dom.achievementsList.appendChild(groupEl);
    }
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
    function setHoopSide(side) {
      if (State.hoopSide !== side) {
        State.hoopSide = side;
        State.isDirtyStorage = true;
        flushStateToStorage();
        updateHUD();
        resizeViewport(true);
        balls.length = 0;
        activeBall = null;
        spawnBall(true);
      }
    }

    dom.btnLayoutLeft.addEventListener('click', () => setHoopSide('left'));
    dom.btnLayoutRight.addEventListener('click', () => setHoopSide('right'));

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

    // Window Resize & Orientation Observers
    window.addEventListener('resize', () => {
      resizeViewport();
      wakeGameLoop();
    });

    window.addEventListener('orientationchange', () => {
      cancelAiming();
      setTimeout(() => {
        resizeViewport(true);
        wakeGameLoop();
      }, 80);
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
