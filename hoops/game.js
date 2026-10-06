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
      minStreak: 7,
      top: [88, 28, 135],
      bottom: [30, 27, 75]
    },
    {
      id: 'fire',
      name: 'ON FIRE',
      minStreak: 12,
      top: [124, 45, 18],
      bottom: [69, 10, 10]
    },
    {
      id: 'legend',
      name: 'LEGENDARY',
      minStreak: 18,
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
    bestStreak: 0,
    lifetimeBaskets: 0,
    lifetimeCleanShots: 0,
    equippedSkin: 'classic',
    unlockedSkins: { classic: true },
    achievements: {},
    isMuted: false,
    hoopSide: 'left', // 'left' (Right-to-Left, default for right-handed mobile players) | 'right' (Left-to-Right)

    // Session / Runtime
    streak: 0,
    sessionCleanShots: 0,
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
      zoneColor: '#10b981'
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
          const best = parsed.bestStreak ?? parsed.highScore;
          if (typeof best === 'number' && Number.isFinite(best)) {
            State.bestStreak = Math.max(0, Math.floor(best));
          }
          if (typeof parsed.lifetimeBaskets === 'number' && Number.isFinite(parsed.lifetimeBaskets)) {
            State.lifetimeBaskets = Math.max(0, Math.floor(parsed.lifetimeBaskets));
          }
          const clean = parsed.lifetimeCleanShots ?? parsed.lifetimeSwishes;
          if (typeof clean === 'number' && Number.isFinite(clean)) {
            State.lifetimeCleanShots = Math.max(0, Math.floor(clean));
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
        bestStreak: State.bestStreak,
        lifetimeBaskets: State.lifetimeBaskets,
        lifetimeCleanShots: State.lifetimeCleanShots,
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
    streak: document.getElementById('hudStreak'),
    streakPill: document.getElementById('hudStreakPill'),
    tierBadge: document.getElementById('hudTierBadge'),
    bestStreak: document.getElementById('hudBestStreak'),
    totalBaskets: document.getElementById('hudTotalBaskets'),
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
    zenBtnMenu: document.getElementById('zenBtnMenu'),
    zenBtnExit: document.getElementById('zenBtnExit')
  };

  const ctx = dom.canvas.getContext('2d');

  function updateHUD() {
    const tier = getCurrentTier();

    dom.streak.textContent = State.streak;
    dom.bestStreak.textContent = State.bestStreak;
    dom.totalBaskets.textContent = State.lifetimeBaskets;

    if (dom.zenStreak) {
      dom.zenStreak.textContent = State.streak;
    }
    if (dom.zenPill) {
      dom.zenPill.classList.toggle('hoop-left', State.hoopSide === 'left');
      dom.zenPill.classList.toggle('hoop-right', State.hoopSide === 'right');
    }

    dom.tierBadge.textContent = tier.name;
    dom.tierBadge.className = `tier-badge tier-${tier.id}`;

    if (State.streak >= 3) {
      dom.streakPill.classList.add('streak-active');
      if (State.streak >= 10) {
        dom.streakPill.classList.add('on-fire');
      } else {
        dom.streakPill.classList.remove('on-fire');
      }
    } else {
      dom.streakPill.classList.remove('streak-active', 'on-fire');
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
      dom.zenPill.classList.toggle('hidden', !isFs);
      dom.zenPill.classList.toggle('hoop-left', State.hoopSide === 'left');
      dom.zenPill.classList.toggle('hoop-right', State.hoopSide === 'right');
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

  // Ball physics entity
  const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 24,
    angle: 0,
    angularVelocity: 0,
    originX: 0,
    originY: 0,
    scale: 1,
    opacity: 1,
    flightTime: 0,
    restTime: 0,
    lastBounceTime: 0,
    lastClankTime: 0
  };

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
    ball.radius = Math.max(19, Math.min(26, Math.min(width, height) * 0.040));

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
    hoop.rimRadius = Math.max(2.8, Math.round(ball.radius * 0.14));
    const rimWidth = ball.radius * 2.78;
    // Spaced inner rim from backboard pane for challenging, authentic bank shots
    const bracketLen = Math.max(26, Math.round(ball.radius * 1.2));

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
    hoop.netDepth = ball.radius * 1.85;

    // Initialize procedural net spring mesh
    initNetMesh();

    // If ball not yet placed or out of bounds, spawn it
    if (State.phase === 'IDLE' && (ball.x <= 0 || ball.y <= 0 || ball.x > width || ball.y > height)) {
      spawnBall(false);
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

  function spawnBall(animate = true) {
    State.phase = 'SPAWNING';

    // Generous court spawn bounds ensuring ball NEVER spawns under or behind hoop:
    let minX, maxX;
    if (State.hoopSide === 'left') {
      // Hoop is on the left: ball spawns strictly in front of the front rim tip (never under or behind!)
      minX = hoop.rimFrontX + Math.max(75, ball.radius * 3.8);
      maxX = width - Math.max(50, width * 0.08);
      if (maxX <= minX + 25) {
        minX = hoop.rimFrontX + 35;
        maxX = width - 25;
      }
    } else {
      // Hoop is on the right: ball spawns strictly in front of the front rim tip (never under or behind!)
      maxX = hoop.rimFrontX - Math.max(75, ball.radius * 3.8);
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
    // Strictly below net bottom by at least 45px, leaving plenty of room below for slingshot pull
    const minY = Math.max(hoop.rimY + hoop.netDepth + 45, height * 0.46);
    const maxY = Math.min(height * 0.64, height - 160);

    ball.originX = minX + Math.random() * (maxX - minX);
    ball.originY = minY + Math.random() * Math.max(10, maxY - minY);
    ball.x = ball.originX;
    ball.y = ball.originY;
    ball.vx = 0;
    ball.vy = 0;
    ball.angularVelocity = 0;
    ball.angle = 0;
    ball.flightTime = 0;
    ball.restTime = 0;

    State.currentShot.rimHits = 0;
    State.currentShot.backboardHits = 0;
    State.currentShot.scored = false;
    State.currentShot.isClean = false;
    State.currentShot.enteredFromBelow = false;

    // Shot Distance & Zone Classification
    const hoopCenterX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    const distPx = Math.hypot(ball.originX - hoopCenterX, ball.originY - hoop.rimY);
    // Authentic basketball scale: ~22px per foot (hoop opening ~52px = 2.4ft)
    const feet = Math.max(12, Math.round(distPx / 22) + 4);
    State.currentShot.distanceFeet = feet;

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
    State.currentShot.zoneName = zoneName;
    State.currentShot.zoneColor = zoneColor;

    if (animate) {
      ball.scale = 0.1;
      ball.opacity = 0.1;
    } else {
      ball.scale = 1;
      ball.opacity = 1;
      State.phase = 'IDLE';
    }
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

    if (State.phase !== 'IDLE' && State.phase !== 'AIMING') return;

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
    let vx = -K_LAUNCH_X * dx;
    let vy = -K_LAUNCH_Y * dy;

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

    // Use smoothed aim to prevent finger-release liftoff jitter
    const launch = computeLaunchVelocity(true);

    // Release must have minimum drag distance to shoot (prevents accidental taps)
    if (launch.dragDist >= 6 && launch.speed >= V_MIN) {
      ball.vx = launch.vx;
      ball.vy = launch.vy;
      // Natural backspin on basketball launch (rotates opposite to flight direction)
      ball.angularVelocity = -Math.sign(ball.vx || 1) * 4.5 + (ball.vx * 0.003);
      State.phase = 'IN_FLIGHT';
    } else {
      // Cancelled aim
      ball.x = ball.originX;
      ball.y = ball.originY;
      State.phase = 'IDLE';
    }
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
      ball.x = ball.originX;
      ball.y = ball.originY;
      State.phase = 'IDLE';
      wakeGameLoop();
    }
  }

  // ==========================================
  // 7. PHYSICS SIMULATION ENGINE
  // ==========================================
  let resolutionTimer = null;

  function updatePhysics(dt) {
    // Spawn animation
    if (State.phase === 'SPAWNING') {
      ball.scale += (1 - ball.scale) * 0.2;
      ball.opacity += (1 - ball.opacity) * 0.2;
      if (ball.scale >= 0.98) {
        ball.scale = 1;
        ball.opacity = 1;
        State.phase = 'IDLE';
      }
      return;
    }

    // Aiming state: ball remains anchored
    if (State.phase === 'AIMING') {
      ball.x = ball.originX;
      ball.y = ball.originY;
      return;
    }

    if (State.phase !== 'IN_FLIGHT' && State.phase !== 'RESOLVING') {
      return;
    }

    // Sub-stepping integration: adaptive fixed-duration sub-steps (~3ms per step)
    // Completely eliminates penetration spikes and position snapping on mobile!
    const targetStepDt = 1 / 320;
    const steps = Math.min(12, Math.max(4, Math.round(dt / targetStepDt)));
    const subDt = dt / steps;
    const floorY = height - 12;

    for (let step = 0; step < steps; step++) {
      const prevX = ball.x;
      const prevY = ball.y;

      // Newtonian kinematics integration (ZERO horizontal drag -> 1:1 match with trajectory)
      ball.vy += GRAVITY * subDt;
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;
      ball.angle += ball.angularVelocity * subDt;
      // Gentle midair rotational damping
      ball.angularVelocity *= (1 - 0.12 * subDt);

      // Spin decay when ball is resting or nearly stationary on court surfaces
      if (Math.hypot(ball.vx, ball.vy) < 25 && (ball.y >= floorY - ball.radius - 5 || Math.abs(ball.y - hoop.rimY) < ball.radius * 2)) {
        ball.angularVelocity *= (1 - 10.0 * subDt);
      }

      // When ball drops inside the net (between rimY and rimY + netDepth),
      // apply gentle net funneling & nylon drag so it swishes fluidly without snagging
      if (State.currentShot.scored && ball.y >= hoop.rimY && ball.y <= hoop.rimY + hoop.netDepth) {
        ball.vx *= (1 - 0.45 * subDt);
        ball.vy *= (1 - 0.12 * subDt);
      }

      // Trailing embers for Fire Ball skin
      if (State.equippedSkin === 'fire' && Math.hypot(ball.vx, ball.vy) > 220) {
        if (Math.random() < 0.3) {
          spawnParticle(
            ball.x + (Math.random() * 10 - 5),
            ball.y + (Math.random() * 10 - 5),
            (Math.random() - 0.5) * 50 - ball.vx * 0.1,
            (Math.random() - 0.5) * 50 - ball.vy * 0.1,
            Math.random() * 3 + 2,
            Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
            0.45
          );
        }
      }

      // ------------------------------------------
      // Collision: Hoop Rim (Authentic 2.5D outer edge tips)
      // ------------------------------------------
      checkRimCollisions(subDt);

      // ------------------------------------------
      // Collision: Backboard (Physical oriented face plane & corner pegs)
      // ------------------------------------------
      checkBackboardCollision();

      // Track if ball passes upwards through the rim cylinder from below (illegal shot)
      const minHoopX = Math.min(hoop.rimFrontX, hoop.rimBackX);
      const maxHoopX = Math.max(hoop.rimFrontX, hoop.rimBackX);
      if (prevY >= hoop.rimY && ball.y <= hoop.rimY && ball.x >= minHoopX && ball.x <= maxHoopX && ball.vy < 0) {
        State.currentShot.enteredFromBelow = true;
      }

      // ------------------------------------------
      // Score Trigger Sensor
      // ------------------------------------------
      checkScoreTrigger(prevY, ball.y, prevX, ball.x);

      // ------------------------------------------
      // Wall & Floor Collisions
      // ------------------------------------------
      // Floor
      if (ball.y + ball.radius >= floorY) {
        ball.y = floorY - ball.radius;
        if (ball.vy > 0) {
          const impact = Math.abs(ball.vy) / 600;
          if (ball.vy > 35) {
            ball.vy = -ball.vy * RESTITUTION_FLOOR;
          } else {
            ball.vy = 0;
          }
          ball.angularVelocity *= 0.75;
          ball.vx *= 0.85;

          if (performance.now() - ball.lastBounceTime > 90 && impact > 0.08) {
            Sound.bounce(impact);
            ball.lastBounceTime = performance.now();
          }

          // If ball touched the floor without scoring, shot is officially missed
          if (!State.currentShot.scored && State.phase === 'IN_FLIGHT') {
            resolveShot(false);
          }
        }
      }

      // Left Wall (on-court only, allows launching high into sky)
      if (ball.x - ball.radius <= 0 && ball.y > 0) {
        ball.x = ball.radius;
        if (ball.vx < 0) {
          ball.vx = -ball.vx * 0.5;
        }
      }
      // Right Gym Wall behind backboard (on-court only)
      if (ball.x + ball.radius >= width && ball.y > 0) {
        ball.x = width - ball.radius;
        if (ball.vx > 0) {
          ball.vx = -ball.vx * 0.5;
        }
      }
      // Extreme ceiling safety to prevent runaway numeric overflow
      if (ball.y < -15000) {
        ball.y = -15000;
        ball.vy = 100;
      }

      // Safety clamps on velocity & spin to completely prevent runaway glitches
      const curSpeed = Math.hypot(ball.vx, ball.vy);
      if (curSpeed > 3500) {
        const ratio = 3500 / curSpeed;
        ball.vx *= ratio;
        ball.vy *= ratio;
      }
      if (Math.abs(ball.angularVelocity) > 30) {
        ball.angularVelocity = Math.sign(ball.angularVelocity) * 30;
      }
    }

    // Auto-resolve if ball is resting or out of playable frame
    if (State.phase === 'IN_FLIGHT') {
      const ballSpeed = Math.hypot(ball.vx, ball.vy);

      // Track total flight duration of this shot
      ball.flightTime = (ball.flightTime || 0) + dt;

      // Track if ball is virtually stationary anywhere
      if (ballSpeed < 25) {
        ball.restTime = (ball.restTime || 0) + dt;
      } else {
        ball.restTime = 0;
      }

      // Ball is resting on floor, or stationary/stuck anywhere for > 0.85s, or shot exceeded 5.5s timeout
      if ((ballSpeed < 25 && ball.y >= floorY - ball.radius - 2) || ball.restTime > 0.85 || ball.flightTime > 5.5) {
        if (!State.currentShot.scored) {
          resolveShot(false);
        }
      } else if (ball.y > height + 80 || ball.x < -250 || ball.x > width + 300) {
        if (!State.currentShot.scored) {
          resolveShot(false);
        }
      }
    }
  }

  function triggerRimHitSound(x, y) {
    const now = performance.now();
    if (now - ball.lastClankTime > 115) {
      Sound.rimClank();
      ball.lastClankTime = now;
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

  function collideWithPeg(px, py, isBackRim = false) {
    const dx = ball.x - px;
    const dy = ball.y - py;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + hoop.rimRadius;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const vn = ball.vx * nx + ball.vy * ny;

      // Full penetration resolution (prevents sinking or sticking)
      const penetration = minDist - dist;
      ball.x += nx * penetration;
      ball.y += ny * penetration;

      const minRimX = Math.min(hoop.rimFrontX, hoop.rimBackX);
      const maxRimX = Math.max(hoop.rimFrontX, hoop.rimBackX);
      // If ball is descending cleanly into the hoop opening, funnel it down without upward kickback
      const isEnteringOpening = ball.vy > 0 && ball.y >= hoop.rimY - 6 && ball.x > minRimX + 3 && ball.x < maxRimX - 3;

      if (vn < 0) {
        if (isEnteringOpening) {
          // Ball is plunging downward into the hoop cylinder: guide inward without upward stopping kickback
          ball.vx -= (1 + RESTITUTION_RIM * 0.4) * vn * nx;
          if (ball.vy < 35) ball.vy = 35;
        } else if (vn < -15) {
          // Elastic reflection for genuine impacts
          ball.vx -= (1 + RESTITUTION_RIM) * vn * nx;
          ball.vy -= (1 + RESTITUTION_RIM) * vn * ny;
          State.currentShot.rimHits++;
          triggerRimHitSound(px, py);
        } else {
          // Resting contact: cancel normal velocity to prevent sinking under gravity
          ball.vx -= vn * nx;
          ball.vy -= vn * ny;
        }

        // Tangential friction during contact
        const tx = -ny;
        const ty = nx;
        const vt = ball.vx * tx + ball.vy * ty;
        const surfaceSpeed = ball.angularVelocity * ball.radius;
        const slip = vt - surfaceSpeed;
        const frictionImpulse = Math.min(Math.abs(slip) * 0.15, Math.abs(vn) * 0.12) * Math.sign(slip);

        ball.vx -= frictionImpulse * tx;
        ball.vy -= frictionImpulse * ty;
        ball.angularVelocity += (frictionImpulse * 0.35) / ball.radius;

        return true;
      }
    }
    return false;
  }

  function checkRimCollisions(subDt) {
    // If ball scored and traveling downward in net, bypass rim colliders
    if (State.currentShot.scored && ball.y >= hoop.rimY) return;

    const r = ball.radius;
    const courtDir = State.hoopSide === 'left' ? 1 : -1;

    // Bracket collar connecting back rim to backboard:
    // Acts as an angled deflector flange sloping into the court/hoop so ball never wedges
    const bracketMinX = Math.min(hoop.backboardX, hoop.rimBackX);
    const bracketMaxX = Math.max(hoop.backboardX, hoop.rimBackX);

    if (ball.x >= bracketMinX - 2 && ball.x <= bracketMaxX + 2) {
      if (ball.y + r >= hoop.rimY - 4 && ball.y - r <= hoop.rimY + 4) {
        if (ball.y < hoop.rimY) {
          // Top of bracket: smoothly guide forward towards hoop so it doesn't wedge in the corner
          ball.y = hoop.rimY - 4 - r;
          ball.vx += courtDir * (280 * (subDt || 0.003));
          if (ball.vy > 0) {
            ball.vy = -ball.vy * 0.4;
          }
          if (ball.vy < -25) {
            State.currentShot.rimHits++;
            triggerRimHitSound(ball.x, hoop.rimY);
          }
        } else if (ball.vy < 0 && ball.y > hoop.rimY) {
          // Underside of bracket: bounce downward
          ball.y = hoop.rimY + 4 + r;
          ball.vy = -ball.vy * RESTITUTION_RIM;
          return;
        }
      }
    }

    // Front Rim Peg (outer court-facing peg, full circle)
    collideWithPeg(hoop.rimFrontX, hoop.rimY, false);

    // Back Rim Peg (inner court-facing peg, full circle)
    collideWithPeg(hoop.rimBackX, hoop.rimY, true);
  }

  function checkBackboardCollision() {
    const courtDir = State.hoopSide === 'left' ? 1 : -1;
    const faceX = hoop.backboardX + courtDir * 4.5;
    const topY = hoop.backboardTop;
    const bottomY = hoop.backboardBottom;
    const r = ball.radius;

    // 1. Front face collision (vertical board segment between topY and bottomY)
    if (ball.y >= topY && ball.y <= bottomY) {
      const distToFace = (ball.x - faceX) * courtDir;
      if (distToFace < r && distToFace > -r * 1.5) {
        ball.x = faceX + courtDir * r;
        const vn = ball.vx * courtDir;
        if (vn < -4) {
          ball.vx = -vn * RESTITUTION_BOARD * courtDir;
          ball.vy *= 0.92;
          ball.angularVelocity *= 0.8;
          const MAX_ANGULAR_VEL = 22;
          ball.angularVelocity = Math.max(-MAX_ANGULAR_VEL, Math.min(MAX_ANGULAR_VEL, ball.angularVelocity));

          State.currentShot.backboardHits++;
          if (performance.now() - ball.lastClankTime > 85) {
            Sound.rimClank();
            ball.lastClankTime = performance.now();
          }
        }
        return;
      }
    }

    // 2. Corner peg collisions (rounded corner tips at backboard top and bottom edges)
    collideWithPeg(faceX, topY, false);
    collideWithPeg(faceX, bottomY, false);
  }

  function checkScoreTrigger(prevY, currY, prevX, currX) {
    if (State.currentShot.scored) return;
    if (State.currentShot.enteredFromBelow) return;

    // Rim opening sensor: ball cleanly crosses the horizontal rim plane inside the opening
    const minRimX = Math.min(hoop.rimFrontX, hoop.rimBackX);
    const maxRimX = Math.max(hoop.rimFrontX, hoop.rimBackX);

    const sensorMargin = ball.radius * 0.28;
    const sensorLeft = minRimX + sensorMargin;
    const sensorRight = maxRimX - sensorMargin;

    // Downward descent strictly crossing through the rim plane
    if (prevY <= hoop.rimY && currY >= hoop.rimY && ball.vy > 0) {
      if (ball.x >= sensorLeft && ball.x <= sensorRight) {
        State.currentShot.scored = true;
        handleScoreSuccess();
      }
    }
  }

  function handleScoreSuccess() {
    // Clean shot: pure swish that never touched the rim or backboard
    const isClean = State.currentShot.rimHits === 0 && State.currentShot.backboardHits === 0;
    State.currentShot.isClean = isClean;

    State.streak++;
    if (State.streak > State.bestStreak) {
      State.bestStreak = State.streak;
    }

    State.lifetimeBaskets++;
    if (isClean) {
      State.lifetimeCleanShots++;
      State.sessionCleanShots++;
    }

    State.isDirtyStorage = true;
    updateHUD();

    // Audio effects: Swish + Chime
    Sound.swish();
    setTimeout(() => {
      Sound.chime(isClean ? (State.streak >= 15 ? 4 : State.streak >= 10 ? 3 : State.streak >= 6 ? 2 : 1) : 1);
    }, 45);

    // Dynamic Net Rip - pull net vertices down & outwards
    hoop.netPoints.forEach((p, idx) => {
      p.vy += 320 + Math.random() * 80;
      p.vx += (idx < hoop.netPoints.length / 2 ? -1 : 1) * (45 + Math.random() * 30);
    });

    // Visual Floating Texts
    const midRimX = (hoop.rimFrontX + hoop.rimBackX) / 2;
    if (isClean) {
      addFloatingText('CLEAN SHOT! ✦', midRimX, hoop.rimY - 28, '#38bdf8', 28);
    } else if (State.currentShot.backboardHits > 0) {
      addFloatingText('BANK SHOT! 🎯', midRimX, hoop.rimY - 26, '#f59e0b', 25);
    } else if (State.currentShot.rimHits >= 2) {
      addFloatingText('RATTLE IN! ⚡', midRimX, hoop.rimY - 24, '#fbbf24', 24);
    } else {
      addFloatingText(`STREAK ${State.streak}!`, midRimX, hoop.rimY - 24, '#fbbf24', 24);
    }

    // Milestone notifications
    if (State.streak === 3) {
      setTimeout(() => addFloatingText('HEATING UP! 🔥', midRimX, hoop.rimY - 56, '#10b981', 22), 220);
    } else if (State.streak === 6) {
      setTimeout(() => addFloatingText('SHARP SHOOTER! ⚡', midRimX, hoop.rimY - 56, '#c084fc', 24), 220);
    } else if (State.streak === 10) {
      setTimeout(() => addFloatingText('ON FIRE! 🔥🔥🔥', midRimX, hoop.rimY - 56, '#ef4444', 28), 220);
    } else if (State.streak === 15) {
      setTimeout(() => addFloatingText('LEGENDARY! 👑', midRimX, hoop.rimY - 56, '#f59e0b', 30), 220);
    }

    // Distance bonus celebrations for long-range shots
    if (State.currentShot.distanceFeet >= 38) {
      setTimeout(() => addFloatingText(`FROM DOWNTOWN! 💥 (${State.currentShot.distanceFeet} FT)`, midRimX, hoop.rimY - 50, '#ef4444', 26), 130);
    } else if (State.currentShot.distanceFeet >= 28) {
      setTimeout(() => addFloatingText(`DEEP 3-POINTER! 🎯 (${State.currentShot.distanceFeet} FT)`, midRimX, hoop.rimY - 48, '#f59e0b', 25), 130);
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
    if (State.currentShot.backboardHits > 0) {
      unlockAchievement('bank_shot');
    }
    if (State.currentShot.distanceFeet >= 28) {
      unlockAchievement('downtown_sniper');
    }

    // Smoothly schedule next ball spawn after score
    resolveShot(true);
  }

  function resolveShot(isScored) {
    if (State.phase === 'RESOLVING') return;
    State.phase = 'RESOLVING';

    if (!isScored) {
      // Miss: streak resets
      if (State.streak > 0) {
        addFloatingText('STREAK LOST', ball.x, ball.y - 20, '#ef4444', 20);
      }
      State.streak = 0;
      updateHUD();
    }

    scheduleStorageFlush();

    if (resolutionTimer) clearTimeout(resolutionTimer);
    resolutionTimer = setTimeout(() => {
      spawnBall(true);
    }, isScored ? 750 : 850);
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

    // 4. Ball Entity (with 2.5D layering)
    if (ball.scale > 0.01 && ball.opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = ball.opacity;
      const renderRadius = ball.radius * ball.scale;

      // Soft ground contact shadow when resting or near floor
      if (ball.y > height * 0.5) {
        const groundY = height - 12;
        const distToGround = Math.max(0, groundY - ball.y);
        const shadowScale = Math.max(0.2, 1 - distToGround / 350);
        const shadowAlpha = Math.min(0.4, 0.4 * shadowScale);

        ctx.beginPath();
        ctx.ellipse(ball.x, groundY, renderRadius * shadowScale * 1.2, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fill();
      }

      renderBallSkin(ctx, ball.x, ball.y, renderRadius, ball.angle, State.equippedSkin);

      // Shot Zone & Distance Badge floating above the ball when aiming or idle
      if ((State.phase === 'IDLE' || State.phase === 'AIMING') && State.currentShot.distanceFeet) {
        const badgeY = ball.originY - renderRadius - 20;
        const badgeText = `${State.currentShot.zoneName} • ${State.currentShot.distanceFeet} FT`;
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const padX = 8;
        const bWidth = textWidth + padX * 2;
        const bHeight = 19;
        const bX = ball.originX - bWidth / 2;
        const bY = badgeY - bHeight / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bX, bY, bWidth, bHeight, 9);
        } else {
          ctx.rect(bX, bY, bWidth, bHeight);
        }
        ctx.fill();

        ctx.strokeStyle = State.currentShot.zoneColor || '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = State.currentShot.zoneColor || '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, ball.originX, badgeY);
      }

      ctx.restore();
    }

    // 4b. Space Altitude Indicator: when ball is launched high into space above canvas
    if (ball.y < -ball.radius && State.phase === 'IN_FLIGHT') {
      ctx.save();
      const indicatorX = Math.max(24, Math.min(width - 24, ball.x));
      const altitude = Math.round(Math.abs(ball.y));
      ctx.fillStyle = '#ea580c';
      // Triangle pointer downwards
      ctx.beginPath();
      ctx.moveTo(indicatorX - 9, 8);
      ctx.lineTo(indicatorX + 9, 8);
      ctx.lineTo(indicatorX, 19);
      ctx.closePath();
      ctx.fill();

      // Pulsing miniature ball indicator
      ctx.beginPath();
      ctx.arc(indicatorX, 30, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Altitude text badge
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`${altitude}px`, indicatorX, 48);
      ctx.restore();
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
    ctx.moveTo(ball.originX, ball.originY);
    ctx.lineTo(ball.originX + dragX, ball.originY + dragY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tactile slingshot pull bead at ball
    ctx.beginPath();
    ctx.arc(ball.originX + dragX, ball.originY + dragY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();

    // If touch started away from ball (e.g. thumb on right side), draw subtle tactile reticle at finger
    const touchDistFromBall = Math.hypot(State.aimStart.x - ball.originX, State.aimStart.y - ball.originY);
    if (touchDistFromBall > ball.radius * 2.5) {
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

    let prevPx = ball.originX;
    let prevPy = ball.originY;

    for (let i = 1; i <= totalPoints; i++) {
      const t = i * timeStep;
      const px = ball.originX + launch.vx * t;
      const py = ball.originY + launch.vy * t + 0.5 * GRAVITY * t * t;

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
      ball.x = ball.originX;
      ball.y = ball.originY;
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
