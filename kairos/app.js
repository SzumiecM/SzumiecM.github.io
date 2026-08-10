(function () {
  'use strict';

  const PRESETS = {
    classic: {
      id: 'classic',
      name: 'Classic Pomodoro',
      description: '4× 25m Focus sessions with 5m breaks and a 15m long break',
      sequence: [
        { type: 'focus', duration: 25 * 60, label: 'Focus 1' },
        { type: 'shortBreak', duration: 5 * 60, label: 'Break' },
        { type: 'focus', duration: 25 * 60, label: 'Focus 2' },
        { type: 'shortBreak', duration: 5 * 60, label: 'Break' },
        { type: 'focus', duration: 25 * 60, label: 'Focus 3' },
        { type: 'shortBreak', duration: 5 * 60, label: 'Break' },
        { type: 'focus', duration: 25 * 60, label: 'Focus 4' },
        { type: 'longBreak', duration: 15 * 60, label: 'Long Break' }
      ]
    },
    deepWork: {
      id: 'deepWork',
      name: 'Deep Focus (50/10)',
      description: '2× 50m intense deep work blocks with 10m & 20m breaks',
      sequence: [
        { type: 'focus', duration: 50 * 60, label: 'Deep Focus 1' },
        { type: 'shortBreak', duration: 10 * 60, label: 'Rest 10m' },
        { type: 'focus', duration: 50 * 60, label: 'Deep Focus 2' },
        { type: 'longBreak', duration: 20 * 60, label: 'Long Break 20m' }
      ]
    },
    sprint: {
      id: 'sprint',
      name: 'Quick Sprint (15/3)',
      description: '3× 15m quick tasks with 3m short breaks',
      sequence: [
        { type: 'focus', duration: 15 * 60, label: 'Sprint 1' },
        { type: 'shortBreak', duration: 3 * 60, label: 'Break' },
        { type: 'focus', duration: 15 * 60, label: 'Sprint 2' },
        { type: 'shortBreak', duration: 3 * 60, label: 'Break' },
        { type: 'focus', duration: 15 * 60, label: 'Sprint 3' },
        { type: 'longBreak', duration: 10 * 60, label: 'Rest' }
      ]
    },
    test: {
      id: 'test',
      name: 'Test Mode (15s)',
      description: 'Quick 15-second test sessions for instant verification',
      sequence: [
        { type: 'focus', duration: 15, label: 'Focus 15s' },
        { type: 'shortBreak', duration: 15, label: 'Break 15s' },
        { type: 'focus', duration: 15, label: 'Focus 15s' },
        { type: 'longBreak', duration: 15, label: 'Rest 15s' }
      ]
    }
  };

  const TYPE_ICONS = {
    focus: '⏳',
    shortBreak: '☕',
    longBreak: '🌴'
  };

  const CIRCLE_CIRCUMFERENCE = 879.64;

  function getLocalDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let persistSession = localStorage.getItem('kairos_persist_session') !== 'false';

  let savedPresetKey = localStorage.getItem('kairos_active_preset') || 'classic';
  if (!PRESETS[savedPresetKey]) savedPresetKey = 'classic';

  let currentPresetKey = savedPresetKey;
  let activeSequence = PRESETS[savedPresetKey].sequence;

  let savedBlockIdx = parseInt(localStorage.getItem('kairos_active_block') || '0', 10);
  let currentBlockIndex = (isNaN(savedBlockIdx) || savedBlockIdx < 0) ? 0 : Math.min(savedBlockIdx, activeSequence.length - 1);

  let currentBlock = activeSequence[currentBlockIndex];
  let totalTime = currentBlock.duration;

  let savedRemainingStr = localStorage.getItem('kairos_remaining_time');
  let remainingTime = (savedRemainingStr !== null && !isNaN(parseInt(savedRemainingStr, 10)))
    ? parseInt(savedRemainingStr, 10)
    : totalTime;

  let wasRunning = localStorage.getItem('kairos_is_running') === 'true';
  let targetEndTime = parseInt(localStorage.getItem('kairos_target_end_time') || '0', 10);

  let timerInterval = null;
  let isRunning = false;
  let lastTickTime = 0;

  let todayDateStr = getLocalDateString();
  let storedDate = localStorage.getItem('kairos_stats_date');

  if (storedDate !== todayDateStr) {
    localStorage.setItem('kairos_stats_date', todayDateStr);
    localStorage.setItem('kairos_today_focus_secs', '0');
    localStorage.setItem('kairos_today_sessions', '0');
  }

  let totalFocusSecondsToday = parseInt(localStorage.getItem('kairos_today_focus_secs') || '0', 10);
  let totalSessionsToday = parseInt(localStorage.getItem('kairos_today_sessions') || '0', 10);
  let autoStartNext = localStorage.getItem('kairos_auto_start') !== 'false';
  let selectedBell = localStorage.getItem('kairos_bell_sound') || 'chime';
  let audioCtx = null;
  let tabBlinkTimer = null;

  if (persistSession && wasRunning && targetEndTime > 0) {
    const now = Date.now();
    if (now < targetEndTime) {
      remainingTime = Math.max(1, Math.ceil((targetEndTime - now) / 1000));
      isRunning = true;
    } else {
      fastForwardOverdueTimer(now);
    }
  } else if (!persistSession) {
    isRunning = false;
    wasRunning = false;
    targetEndTime = 0;
    remainingTime = totalTime;
  }

  function fastForwardOverdueTimer(now) {
    let overdueMs = now - targetEndTime;

    if (!autoStartNext) {
      if (currentBlock.type === 'focus') {
        totalFocusSecondsToday += Math.min(remainingTime, currentBlock.duration);
        localStorage.setItem('kairos_today_focus_secs', totalFocusSecondsToday.toString());
        incrementFocusSessionsStat();
      }
      currentBlockIndex = (currentBlockIndex + 1) % activeSequence.length;
      currentBlock = activeSequence[currentBlockIndex];
      totalTime = currentBlock.duration;
      remainingTime = totalTime;
      isRunning = false;
      targetEndTime = 0;
      return;
    }

    let iterations = 0;
    const maxIterations = activeSequence.length * 2;

    while (overdueMs >= 0 && iterations < maxIterations) {
      iterations++;
      if (currentBlock.type === 'focus') {
        totalFocusSecondsToday += currentBlock.duration;
        localStorage.setItem('kairos_today_focus_secs', totalFocusSecondsToday.toString());
        incrementFocusSessionsStat();
      }

      currentBlockIndex = (currentBlockIndex + 1) % activeSequence.length;
      currentBlock = activeSequence[currentBlockIndex];
      totalTime = currentBlock.duration;

      const blockMs = totalTime * 1000;
      if (overdueMs < blockMs) {
        remainingTime = Math.max(1, Math.ceil((blockMs - overdueMs) / 1000));
        targetEndTime = now + (blockMs - overdueMs);
        isRunning = true;
        break;
      } else {
        overdueMs -= blockMs;
      }
    }

    if (iterations >= maxIterations) {
      isRunning = false;
      targetEndTime = 0;
      remainingTime = totalTime;
    }
  }

  function incrementFocusSessionsStat() {
    totalSessionsToday++;
    localStorage.setItem('kairos_today_sessions', totalSessionsToday.toString());
  }

  const timeDisplay = document.getElementById('timeDisplay');
  const stateLabel = document.getElementById('stateLabel');
  const progressRing = document.getElementById('progressRing');
  const toggleBtn = document.getElementById('toggleBtn');
  const resetBtn = document.getElementById('resetBtn');
  const skipBtn = document.getElementById('skipBtn');
  const autoStartBtn = document.getElementById('autoStartBtn');
  const persistBtn = document.getElementById('persistBtn');
  const bellSelect = document.getElementById('bellSelect');
  const testBellBtn = document.getElementById('testBellBtn');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const timelineTrack = document.getElementById('timelineTrack');
  const timelineSummary = document.getElementById('timelineSummary');
  const statSessionsEl = document.getElementById('statSessions');
  const statTimeEl = document.getElementById('statTime');

  function init() {
    if (bellSelect) {
      bellSelect.value = selectedBell;
    }
    applyCurrentBlockTheme();
    renderPresetButtons();
    renderTimeline();
    updateDisplay();
    bindEvents();
    updateStatsDisplay();
    updateAutoStartUI();
    updatePersistUI();

    if (isRunning) {
      startTimer(false);
    } else {
      toggleBtn.textContent = 'Start';
      saveState();
    }
  }

  const FAVICON_COLORS = {
    focus: '#f59e0b',
    shortBreak: '#10b981',
    longBreak: '#8b5cf6'
  };

  function updateFavicon(type) {
    const color = FAVICON_COLORS[type] || '#f59e0b';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    let link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = 'data:image/svg+xml;base64,' + btoa(svg);
    }
  }

  function applyCurrentBlockTheme() {
    document.documentElement.className = `state-${currentBlock.type}`;
    document.body.className = `state-${currentBlock.type}`;
    if (stateLabel) {
      stateLabel.textContent = currentBlock.label.toUpperCase();
    }
    updateFavicon(currentBlock.type);
  }

  function updateAutoStartUI() {
    if (autoStartBtn) {
      autoStartBtn.classList.toggle('active', autoStartNext);
    }
  }

  function updatePersistUI() {
    if (persistBtn) {
      persistBtn.classList.toggle('active', persistSession);
      persistBtn.textContent = persistSession ? '🔄 Restore Session: ON' : '🔄 Restore Session: OFF';
    }
  }

  function renderPresetButtons() {
    presetButtons.forEach(btn => {
      const pKey = btn.dataset.preset;
      btn.classList.toggle('active', pKey === currentPresetKey);

      btn.onclick = () => {
        if (pKey && PRESETS[pKey]) {
          selectNewSession(pKey, 0);
        }
      };
    });
  }

  function selectNewSession(presetKey, index) {
    pauseTimer();
    currentPresetKey = presetKey;
    activeSequence = PRESETS[presetKey].sequence;
    currentBlockIndex = index % activeSequence.length;
    currentBlock = activeSequence[currentBlockIndex];
    totalTime = currentBlock.duration;
    remainingTime = totalTime;

    applyCurrentBlockTheme();
    renderPresetButtons();
    renderTimeline();
    updateDisplay();
    saveState();
  }

  function renderTimeline() {
    if (!timelineTrack) return;
    timelineTrack.innerHTML = '';
    const seq = activeSequence;

    const totalSecs = seq.reduce((acc, b) => acc + b.duration, 0);
    const totalMin = Math.round(totalSecs / 60);
    const focusSecs = seq.filter(b => b.type === 'focus').reduce((acc, b) => acc + b.duration, 0);
    const focusMin = Math.round(focusSecs / 60);

    const totalText = totalSecs < 60 ? `${totalSecs}s` : `${totalMin}m`;
    const focusText = focusSecs < 60 ? `${focusSecs}s` : `${focusMin}m`;

    if (timelineSummary) {
      timelineSummary.textContent = `Total: ${totalText} (${focusText} focus)`;
    }

    seq.forEach((block, idx) => {
      const el = document.createElement('div');
      el.className = 'timeline-block';

      if (idx === currentBlockIndex) {
        el.classList.add('active');
      } else if (idx < currentBlockIndex) {
        el.classList.add('completed');
      }

      const mins = Math.round(block.duration / 60);
      const timeStr = block.duration < 60 ? `${block.duration}s` : `${mins}m`;
      const icon = TYPE_ICONS[block.type];

      el.innerHTML = `
        <div class="timeline-block-type">${icon} ${block.label}</div>
        <div class="timeline-block-time">${timeStr}</div>
        ${idx === currentBlockIndex ? '<div id="blockProgressBar" class="timeline-block-progress"></div>' : ''}
      `;

      el.onclick = () => {
        selectNewSession(currentPresetKey, idx);
      };

      timelineTrack.appendChild(el);
    });
  }

  function saveState() {
    localStorage.setItem('kairos_persist_session', persistSession ? 'true' : 'false');
    localStorage.setItem('kairos_active_preset', currentPresetKey);
    localStorage.setItem('kairos_active_block', currentBlockIndex.toString());
    localStorage.setItem('kairos_remaining_time', remainingTime.toString());
    localStorage.setItem('kairos_target_end_time', isRunning ? targetEndTime.toString() : '0');
    localStorage.setItem('kairos_is_running', isRunning ? 'true' : 'false');
  }

  function resumeAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function bindEvents() {
    const handleUserGesture = () => resumeAudioContext();
    document.addEventListener('click', handleUserGesture, { once: false, capture: true });

    toggleBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetCurrentClock);
    skipBtn.addEventListener('click', advanceToNextBlock);

    if (autoStartBtn) {
      autoStartBtn.addEventListener('click', () => {
        autoStartNext = !autoStartNext;
        localStorage.setItem('kairos_auto_start', autoStartNext ? 'true' : 'false');
        updateAutoStartUI();
      });
    }

    if (persistBtn) {
      persistBtn.addEventListener('click', () => {
        persistSession = !persistSession;
        localStorage.setItem('kairos_persist_session', persistSession ? 'true' : 'false');
        updatePersistUI();
        saveState();
      });
    }

    if (bellSelect) {
      bellSelect.addEventListener('change', () => {
        selectedBell = bellSelect.value;
        localStorage.setItem('kairos_bell_sound', selectedBell);
        playBellSound(selectedBell);
      });
    }

    if (testBellBtn) {
      testBellBtn.addEventListener('click', () => {
        playBellSound(selectedBell);
      });
    }

    window.addEventListener('beforeunload', saveState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      } else if (document.visibilityState === 'visible' && isRunning && targetEndTime > 0) {
        const now = Date.now();
        if (now < targetEndTime) {
          remainingTime = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
          updateDisplay();
        } else {
          fastForwardOverdueTimer(now);
          updateDisplay();
          renderTimeline();
          updateStatsDisplay();
          if (isRunning) {
            startTimer(false);
          } else {
            toggleBtn.textContent = 'Start';
          }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.code === 'KeyR') {
        resetCurrentClock();
      } else if (e.code === 'KeyS') {
        advanceToNextBlock();
      }
    });
  }

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer(true);
    }
  }

  function startTimer(isNewStart = true) {
    isRunning = true;
    toggleBtn.textContent = 'Pause';
    const now = Date.now();

    if (isNewStart || targetEndTime <= now) {
      targetEndTime = now + remainingTime * 1000;
    }

    lastTickTime = now;
    saveState();

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      const currentNow = Date.now();
      if (currentNow < targetEndTime) {
        const elapsedMs = currentNow - lastTickTime;
        if (currentBlock.type === 'focus' && elapsedMs >= 1000) {
          const elapsedSecs = Math.floor(elapsedMs / 1000);
          totalFocusSecondsToday += elapsedSecs;
          lastTickTime += elapsedSecs * 1000;
          localStorage.setItem('kairos_today_focus_secs', totalFocusSecondsToday.toString());
          updateStatsDisplay();
        }

        remainingTime = Math.max(0, Math.ceil((targetEndTime - currentNow) / 1000));
        updateDisplay();
        saveState();
      } else {
        if (currentBlock.type === 'focus' && lastTickTime > 0) {
          const finalSecs = Math.max(0, Math.floor((targetEndTime - lastTickTime) / 1000));
          if (finalSecs > 0) {
            totalFocusSecondsToday += finalSecs;
            localStorage.setItem('kairos_today_focus_secs', totalFocusSecondsToday.toString());
          }
        }
        remainingTime = 0;
        updateDisplay();
        onBlockComplete();
      }
    }, 250);
  }

  function pauseTimer() {
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    targetEndTime = 0;
    toggleBtn.textContent = 'Start';
    saveState();
  }

  function resetCurrentClock() {
    pauseTimer();
    remainingTime = totalTime;
    updateDisplay();
    saveState();
  }

  function advanceToNextBlock() {
    pauseTimer();
    const nextIdx = (currentBlockIndex + 1) % activeSequence.length;
    selectNewSession(currentPresetKey, nextIdx);
  }

  function onBlockComplete() {
    pauseTimer();

    const finishedBlock = currentBlock;

    if (finishedBlock.type === 'focus') {
      incrementFocusSessionsStat();
      updateStatsDisplay();
    }

    advanceToNextBlock();

    playBellSound(selectedBell);
    triggerTabBlinkNotification(finishedBlock);

    if (autoStartNext) {
      startTimer(true);
    }
  }

  function playBellSound(type = selectedBell) {
    if (type === 'none') return;

    try {
      resumeAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === 'zen') {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(432, now);
        osc2.frequency.setValueAtTime(864, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.8);
        osc2.stop(now + 2.8);

        osc1.onended = () => {
          osc1.disconnect();
          osc2.disconnect();
          gain.disconnect();
        };
      } else if (type === 'chime') {
        [528, 660].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const start = now + idx * 0.15;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + 1.4);

          osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
          };
        });
      } else if (type === 'marimba') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 1.2);

        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      }
    } catch (e) {
      console.warn('Web Audio playback failed:', e);
    }
  }

  function triggerTabBlinkNotification(completedBlock) {
    clearTabBlinkNotification();

    const isFocus = completedBlock.type === 'focus';
    const msg1 = isFocus ? '✨ FOCUS COMPLETE' : '🚀 BREAK OVER';
    const msg2 = isFocus ? '☕ Time for a Break' : '⚡ Time to Focus';

    document.title = msg1;

    let step = 1;
    tabBlinkTimer = setInterval(() => {
      if (step >= 4) {
        clearTabBlinkNotification();
        updateDisplay();
        return;
      }
      document.title = step % 2 === 0 ? msg1 : msg2;
      step++;
    }, 1000);
  }

  function clearTabBlinkNotification() {
    if (tabBlinkTimer) {
      clearInterval(tabBlinkTimer);
      tabBlinkTimer = null;
    }
  }

  function updateDisplay() {
    const mins = Math.floor(remainingTime / 60);
    const secs = remainingTime % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timeDisplay) {
      timeDisplay.textContent = formatted;
    }

    if (!tabBlinkTimer) {
      document.title = `(${formatted}) Kairos · ${currentBlock.label}`;
    }

    if (progressRing) {
      const progress = totalTime > 0 ? remainingTime / totalTime : 0;
      const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
      progressRing.style.strokeDashoffset = offset;
    }

    const blockBar = document.getElementById('blockProgressBar');
    if (blockBar) {
      const blockPercent = totalTime > 0 ? ((totalTime - remainingTime) / totalTime) * 100 : 0;
      blockBar.style.width = `${blockPercent}%`;
    }
  }

  function updateStatsDisplay() {
    if (statSessionsEl) {
      statSessionsEl.textContent = `${totalSessionsToday} Completed`;
    }

    if (statTimeEl) {
      const mins = Math.floor(totalFocusSecondsToday / 60);
      const hrs = (mins / 60).toFixed(1);
      statTimeEl.textContent = mins < 60 ? `${mins} mins` : `${hrs} hrs`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
