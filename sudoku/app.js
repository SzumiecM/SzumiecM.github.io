/**
 * Sudoku UI & Interaction Controller - Zero Dependencies
 * Manages grid rendering, keyboard navigation, rotary dial touch gestures,
 * pencil notes, undo history, per-difficulty game state persistence, and game progression.
 */

(function () {
  'use strict';

  // --- State Variables ---
  let difficulty = 'medium';
  let puzzle = new Uint8Array(81);     // Initial fixed clues
  let board = new Uint8Array(81);      // Current working board
  let solution = new Uint8Array(81);   // Complete solution
  let notes = new Uint16Array(81);     // 9-bit bitmask for notes (bits 1..9)

  let selectedIdx = null;
  let pencilMode = false;
  let history = [];
  let isCompleted = false;

  // Timer state
  let timerSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;

  // Long-press & Rotary Dial State
  let longPressTimeout = null;
  let isRotaryOpen = false;
  let rotaryCellIdx = null;
  let activeRotaryHover = null; // null, 0 (clear), or 1..9
  let wheelCenter = { x: 0, y: 0 };

  // Storage key for multi-difficulty sessions
  const SESSIONS_STORAGE_KEY = 'sudoku_saved_sessions_v2';
  const DIFFICULTY_STORAGE_KEY = 'sudoku_active_difficulty_v2';

  // DOM Elements
  const gridEl = document.getElementById('sudoku-grid');
  const timerEl = document.getElementById('timer-text');
  const btnNewGame = document.getElementById('btn-new-game');
  const btnUndo = document.getElementById('btn-undo');
  const btnErase = document.getElementById('btn-erase');
  const btnPencil = document.getElementById('btn-pencil');
  const diffButtons = document.querySelectorAll('.diff-btn');
  const numButtons = document.querySelectorAll('.num-btn');
  const rotaryOverlay = document.getElementById('rotary-overlay');
  const rotaryWheel = document.getElementById('rotary-wheel');
  const rotaryCenter = document.getElementById('rotary-center');
  const victoryModal = document.getElementById('victory-modal');
  const victoryTimeEl = document.getElementById('victory-time');
  const victoryDiffEl = document.getElementById('victory-diff');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // --- Session Storage Helpers ---
  function getStoredSessions() {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCurrentSession() {
    try {
      const sessions = getStoredSessions();
      sessions[difficulty] = {
        puzzle: Array.from(puzzle),
        board: Array.from(board),
        solution: Array.from(solution),
        notes: Array.from(notes),
        timerSeconds,
        history,
        isCompleted
      };
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    } catch (e) {
      console.warn('Could not save session to localStorage', e);
    }
  }

  function loadStoredSession(diff) {
    try {
      const sessions = getStoredSessions();
      const s = sessions[diff];
      if (s && s.puzzle && s.puzzle.length === 81) {
        puzzle = Uint8Array.from(s.puzzle);
        board = Uint8Array.from(s.board);
        solution = Uint8Array.from(s.solution);
        notes = Uint16Array.from(s.notes);
        timerSeconds = s.timerSeconds || 0;
        history = s.history || [];
        isCompleted = !!s.isCompleted;
        return true;
      }
    } catch (e) {
      console.warn('Could not load session from localStorage', e);
    }
    return false;
  }

  function clearSession(diff) {
    try {
      const sessions = getStoredSessions();
      delete sessions[diff];
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {}
  }

  // --- Initialization ---
  function init() {
    createGridCells();
    setupRotaryDial();
    bindEvents();

    // Restore last active difficulty or default to medium
    const savedDiff = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (savedDiff && ['easy', 'medium', 'hard', 'expert'].includes(savedDiff)) {
      difficulty = savedDiff;
    }
    updateDiffButtons();

    // Check if an existing session exists for this difficulty
    if (loadStoredSession(difficulty)) {
      renderFullBoard();
      updateKeypadCounts();
      updateTimerDisplay();
      if (!isCompleted) startTimer();

      let firstEmpty = board.findIndex(v => v === 0);
      selectCell(firstEmpty !== -1 ? firstEmpty : 0);
    } else {
      startNewGame(false);
    }
  }

  // --- Grid Construction ---
  function createGridCells() {
    gridEl.innerHTML = '';
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, Column ${(i % 9) + 1}`);

      // Internal container for 3x3 pencil notes
      const notesGrid = document.createElement('div');
      notesGrid.className = 'notes-grid';
      for (let n = 1; n <= 9; n++) {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.dataset.note = n;
        notesGrid.appendChild(noteItem);
      }
      cell.appendChild(notesGrid);

      // Main value display container (positioned absolute + flex centered)
      const valSpan = document.createElement('span');
      valSpan.className = 'cell-val';
      cell.appendChild(valSpan);

      gridEl.appendChild(cell);
    }
  }

  // --- Setup Rotary Dial Items (Positioned radially) ---
  function setupRotaryDial() {
    const radius = 78;
    const items = rotaryWheel.querySelectorAll('.rotary-item');

    items.forEach((item) => {
      const num = parseInt(item.dataset.num, 10);
      const angleDeg = -90 + (num - 1) * 40;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = 110 + radius * Math.cos(angleRad);
      const y = 110 + radius * Math.sin(angleRad);

      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
    });
  }

  // --- Game Flow: New Game ---
  function startNewGame(askConfirm = true) {
    if (askConfirm && !isCompleted && board.some((v, i) => puzzle[i] === 0 && v !== 0)) {
      if (!confirm(`Start a new ${SudokuAlgo.DIFFICULTY_CONFIG[difficulty].label} puzzle? Current progress on this difficulty will be reset.`)) {
        return;
      }
    }

    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();

    isCompleted = false;
    history = [];
    selectedIdx = null;
    victoryModal.classList.remove('active');

    // Generate fresh puzzle using algo.js
    const generated = SudokuAlgo.generatePuzzle(difficulty);
    puzzle = generated.puzzle;
    solution = generated.solution;
    board = new Uint8Array(puzzle);
    notes = new Uint16Array(81);

    saveCurrentSession();
    renderFullBoard();
    updateKeypadCounts();
    startTimer();

    let firstEmpty = board.findIndex(v => v === 0);
    selectCell(firstEmpty !== -1 ? firstEmpty : 0);
  }

  // --- Switching Difficulty with State Preservation ---
  function switchDifficulty(newDiff) {
    if (newDiff === difficulty) return;

    // 1. Save current game before switching
    saveCurrentSession();
    stopTimer();

    // 2. Switch difficulty
    difficulty = newDiff;
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    updateDiffButtons();
    selectedIdx = null;
    victoryModal.classList.remove('active');

    // 3. Try to resume existing game for the new difficulty
    if (loadStoredSession(difficulty)) {
      renderFullBoard();
      updateKeypadCounts();
      updateTimerDisplay();
      if (!isCompleted) startTimer();

      let firstEmpty = board.findIndex(v => v === 0);
      selectCell(firstEmpty !== -1 ? firstEmpty : 0);
    } else {
      // Otherwise, generate fresh game
      startNewGame(false);
    }
  }

  // --- Board Rendering ---
  function renderFullBoard() {
    const conflicts = SudokuAlgo.findConflicts(board);
    const cells = gridEl.children;

    for (let i = 0; i < 81; i++) {
      const cell = cells[i];
      const val = board[i];
      const isInitial = puzzle[i] !== 0;
      const isUserFilled = !isInitial && val !== 0;
      const valSpan = cell.querySelector('.cell-val');
      const notesGrid = cell.querySelector('.notes-grid');

      // Reset state classes
      cell.className = 'cell';
      if (isInitial) {
        cell.classList.add('initial');
      } else if (isUserFilled) {
        cell.classList.add('user-filled');
      }

      if (conflicts.has(i)) cell.classList.add('conflict');

      if (val !== 0) {
        valSpan.textContent = val;
        valSpan.style.display = 'flex';
        notesGrid.style.display = 'none';
      } else {
        valSpan.textContent = '';
        valSpan.style.display = 'none';
        notesGrid.style.display = 'grid';

        // Render pencil notes
        const mask = notes[i];
        const noteItems = notesGrid.children;
        for (let n = 1; n <= 9; n++) {
          if (mask & (1 << n)) {
            noteItems[n - 1].textContent = n;
            noteItems[n - 1].classList.add('active');
          } else {
            noteItems[n - 1].textContent = '';
            noteItems[n - 1].classList.remove('active');
          }
        }
      }
    }

    applySelectionHighlights();
  }

  function renderSingleCell(idx) {
    const cell = gridEl.children[idx];
    if (!cell) return;

    const val = board[idx];
    const isInitial = puzzle[idx] !== 0;
    const isUserFilled = !isInitial && val !== 0;
    const valSpan = cell.querySelector('.cell-val');
    const notesGrid = cell.querySelector('.notes-grid');

    cell.classList.remove('user-filled', 'initial');
    if (isInitial) cell.classList.add('initial');
    else if (isUserFilled) cell.classList.add('user-filled');

    if (val !== 0) {
      valSpan.textContent = val;
      valSpan.style.display = 'flex';
      notesGrid.style.display = 'none';
    } else {
      valSpan.textContent = '';
      valSpan.style.display = 'none';
      notesGrid.style.display = 'grid';

      const mask = notes[idx];
      const noteItems = notesGrid.children;
      for (let n = 1; n <= 9; n++) {
        if (mask & (1 << n)) {
          noteItems[n - 1].textContent = n;
          noteItems[n - 1].classList.add('active');
        } else {
          noteItems[n - 1].textContent = '';
          noteItems[n - 1].classList.remove('active');
        }
      }
    }

    updateConflictClasses();
    applySelectionHighlights();
    updateKeypadCounts();
  }

  function updateConflictClasses() {
    const conflicts = SudokuAlgo.findConflicts(board);
    const cells = gridEl.children;
    for (let i = 0; i < 81; i++) {
      if (conflicts.has(i)) {
        cells[i].classList.add('conflict');
      } else {
        cells[i].classList.remove('conflict');
      }
    }
  }

  // --- Selection & Crosshair Highlights ---
  function selectCell(idx) {
    if (idx < 0 || idx >= 81) return;
    selectedIdx = idx;
    applySelectionHighlights();
  }

  function applySelectionHighlights() {
    const cells = gridEl.children;
    if (selectedIdx === null) {
      for (let i = 0; i < 81; i++) {
        cells[i].classList.remove('selected', 'related', 'same-number');
      }
      return;
    }

    const selRow = Math.floor(selectedIdx / 9);
    const selCol = selectedIdx % 9;
    const selBox = Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3);
    const selVal = board[selectedIdx];

    for (let i = 0; i < 81; i++) {
      const cell = cells[i];
      const r = Math.floor(i / 9);
      const c = i % 9;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const val = board[i];

      cell.classList.remove('selected', 'related', 'same-number');

      if (i === selectedIdx) {
        cell.classList.add('selected');
      } else {
        if (r === selRow || c === selCol || b === selBox) {
          cell.classList.add('related');
        }
        if (selVal !== 0 && val === selVal) {
          cell.classList.add('same-number');
        }
      }
    }
  }

  // --- Input Handling: Digits & Notes ---
  function placeNumber(num) {
    if (selectedIdx === null || isCompleted) return;
    if (puzzle[selectedIdx] !== 0) return; // Clues cannot be altered

    const prevVal = board[selectedIdx];
    const prevNotes = notes[selectedIdx];

    if (pencilMode) {
      if (num === 0) {
        if (prevNotes !== 0) {
          notes[selectedIdx] = 0;
          history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: prevVal, prevNotes, newNotes: 0 });
          renderSingleCell(selectedIdx);
          saveCurrentSession();
        }
      } else {
        const newNotes = prevNotes ^ (1 << num);
        notes[selectedIdx] = newNotes;
        board[selectedIdx] = 0;
        history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: 0, prevNotes, newNotes });
        renderSingleCell(selectedIdx);
        saveCurrentSession();
      }
    } else {
      if (prevVal === num) return;

      board[selectedIdx] = num;
      notes[selectedIdx] = 0;
      history.push({ type: 'set', index: selectedIdx, prevVal, newVal: num, prevNotes, newNotes: 0 });
      renderSingleCell(selectedIdx);
      saveCurrentSession();

      checkVictoryCondition();
    }
  }

  function eraseSelectedCell() {
    if (selectedIdx === null || isCompleted) return;
    if (puzzle[selectedIdx] !== 0) return;

    const prevVal = board[selectedIdx];
    const prevNotes = notes[selectedIdx];

    if (prevVal === 0 && prevNotes === 0) return;

    board[selectedIdx] = 0;
    notes[selectedIdx] = 0;
    history.push({ type: 'clear', index: selectedIdx, prevVal, newVal: 0, prevNotes, newNotes: 0 });
    renderSingleCell(selectedIdx);
    saveCurrentSession();
  }

  function undoLastMove() {
    if (history.length === 0 || isCompleted) return;
    const action = history.pop();
    board[action.index] = action.prevVal;
    notes[action.index] = action.prevNotes;
    selectedIdx = action.index;
    renderSingleCell(action.index);
    saveCurrentSession();
  }

  // --- Keypad Remaining Counts ---
  function updateKeypadCounts() {
    const counts = new Uint8Array(10);
    for (let i = 0; i < 81; i++) {
      const v = board[i];
      if (v >= 1 && v <= 9) counts[v]++;
    }

    numButtons.forEach((btn) => {
      const num = parseInt(btn.dataset.num, 10);
      const remaining = 9 - (counts[num] || 0);
      const badge = btn.querySelector('.count-badge');
      if (badge) badge.textContent = remaining > 0 ? remaining : '✓';

      if (remaining <= 0) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    });
  }

  // --- Victory Verification ---
  function checkVictoryCondition() {
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) return;
    }

    const conflicts = SudokuAlgo.findConflicts(board);
    if (conflicts.size > 0) return;

    isCompleted = true;
    stopTimer();
    saveCurrentSession();

    victoryTimeEl.textContent = formatTime(timerSeconds);
    victoryDiffEl.textContent = SudokuAlgo.DIFFICULTY_CONFIG[difficulty].label;
    victoryModal.classList.add('active');
  }

  // --- Timer Functions ---
  function startTimer() {
    if (isTimerRunning || isCompleted) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
      // Periodically save timer every 5 seconds
      if (timerSeconds % 5 === 0) saveCurrentSession();
    }, 1000);
  }

  function stopTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    timerEl.textContent = formatTime(timerSeconds);
  }

  // --- Difficulty Buttons Display ---
  function updateDiffButtons() {
    diffButtons.forEach((btn) => {
      if (btn.dataset.diff === difficulty) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // --- Keyboard Navigation (Arrows, WASD, HJKL, 1-9, Notes, Undo) ---
  function handleKeyDown(e) {
    if (victoryModal.classList.contains('active')) return;
    if (isRotaryOpen) {
      if (e.key === 'Escape') closeRotaryDial();
      return;
    }

    const key = e.key;

    // Cell Navigation
    if (selectedIdx !== null) {
      let r = Math.floor(selectedIdx / 9);
      let c = selectedIdx % 9;

      if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'k') {
        r = (r - 1 + 9) % 9;
        selectCell(r * 9 + c);
        e.preventDefault();
        return;
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S' || key === 'j') {
        r = (r + 1) % 9;
        selectCell(r * 9 + c);
        e.preventDefault();
        return;
      }
      if (key === 'ArrowLeft' || key === 'a' || key === 'A' || key === 'h') {
        c = (c - 1 + 9) % 9;
        selectCell(r * 9 + c);
        e.preventDefault();
        return;
      }
      if (key === 'ArrowRight' || key === 'd' || key === 'D' || key === 'l') {
        c = (c + 1) % 9;
        selectCell(r * 9 + c);
        e.preventDefault();
        return;
      }
    }

    // Number Inputs
    if (/^[1-9]$/.test(key)) {
      placeNumber(parseInt(key, 10));
      e.preventDefault();
      return;
    }

    // Erase
    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      eraseSelectedCell();
      e.preventDefault();
      return;
    }

    // Notes Toggle
    if (key === 'n' || key === 'N' || key === 'p' || key === 'P') {
      togglePencilMode();
      e.preventDefault();
      return;
    }

    // Undo
    if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) {
      undoLastMove();
      e.preventDefault();
      return;
    }
    if (key === 'u' || key === 'U') {
      undoLastMove();
      e.preventDefault();
      return;
    }

    // Deselect
    if (key === 'Escape') {
      selectedIdx = null;
      applySelectionHighlights();
    }
  }

  function togglePencilMode() {
    pencilMode = !pencilMode;
    btnPencil.classList.toggle('active', pencilMode);
  }

  // --- Rotary Dial Touch & Hold Controller (Stationary Phone Style) ---
  function openRotaryDial(cellIdx, clientX, clientY) {
    if (isCompleted || puzzle[cellIdx] !== 0) return;

    selectCell(cellIdx);
    rotaryCellIdx = cellIdx;
    isRotaryOpen = true;

    const wheelRadius = 110;
    const padding = 15;
    let x = Math.max(wheelRadius + padding, Math.min(window.innerWidth - wheelRadius - padding, clientX));
    let y = Math.max(wheelRadius + padding, Math.min(window.innerHeight - wheelRadius - padding, clientY));

    wheelCenter = { x, y };
    rotaryWheel.style.left = `${x}px`;
    rotaryWheel.style.top = `${y}px`;

    rotaryOverlay.classList.add('active');

    if (navigator.vibrate) navigator.vibrate(12);
  }

  function updateRotaryTarget(clientX, clientY) {
    if (!isRotaryOpen) return;

    const dx = clientX - wheelCenter.x;
    const dy = clientY - wheelCenter.y;
    const dist = Math.hypot(dx, dy);

    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));

    if (dist < 32) {
      rotaryCenter.classList.add('hovered');
      activeRotaryHover = 0;
      return;
    }

    if (dist >= 45 && dist <= 145) {
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      let relAngle = angle - (-90);
      while (relAngle < 0) relAngle += 360;
      while (relAngle >= 360) relAngle -= 360;

      const digitIndex = Math.round(relAngle / 40) % 9;
      const hoveredNum = digitIndex + 1;

      const targetEl = rotaryWheel.querySelector(`.rotary-item[data-num="${hoveredNum}"]`);
      if (targetEl) {
        targetEl.classList.add('hovered');
        activeRotaryHover = hoveredNum;
      }
      return;
    }

    activeRotaryHover = null;
  }

  function commitRotarySelection() {
    if (!isRotaryOpen) return;

    if (activeRotaryHover !== null && rotaryCellIdx !== null) {
      selectedIdx = rotaryCellIdx;
      if (activeRotaryHover === 0) {
        eraseSelectedCell();
      } else {
        placeNumber(activeRotaryHover);
      }
      if (navigator.vibrate) navigator.vibrate(15);
    }

    closeRotaryDial();
  }

  function closeRotaryDial() {
    isRotaryOpen = false;
    rotaryCellIdx = null;
    activeRotaryHover = null;
    rotaryOverlay.classList.remove('active');
    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));
  }

  // --- Event Bindings ---
  function bindEvents() {
    window.addEventListener('keydown', handleKeyDown);

    // Grid Cell Click & Long-Press Delegation
    gridEl.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;

      const idx = parseInt(cell.dataset.index, 10);
      const isClue = puzzle[idx] !== 0;

      selectCell(idx);

      if (!isClue && !isCompleted) {
        clearTimeout(longPressTimeout);
        longPressTimeout = setTimeout(() => {
          openRotaryDial(idx, e.clientX, e.clientY);
        }, 340);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
      if (isRotaryOpen) {
        updateRotaryTarget(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
      if (isRotaryOpen) {
        commitRotarySelection();
      }
    });

    window.addEventListener('pointercancel', () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
      if (isRotaryOpen) closeRotaryDial();
    });

    // Rotary Overlay Click to close
    rotaryOverlay.addEventListener('click', (e) => {
      if (e.target === rotaryOverlay) closeRotaryDial();
    });

    // Direct clicks on rotary wheel items
    rotaryWheel.addEventListener('click', (e) => {
      const item = e.target.closest('.rotary-item');
      if (item && rotaryCellIdx !== null) {
        selectedIdx = rotaryCellIdx;
        placeNumber(parseInt(item.dataset.num, 10));
        closeRotaryDial();
        return;
      }
      const center = e.target.closest('.rotary-center');
      if (center && rotaryCellIdx !== null) {
        selectedIdx = rotaryCellIdx;
        eraseSelectedCell();
        closeRotaryDial();
      }
    });

    // Difficulty Tab Buttons with session state preservation
    diffButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const newDiff = btn.dataset.diff;
        switchDifficulty(newDiff);
      });
    });

    // Action Bar Buttons
    btnUndo.addEventListener('click', undoLastMove);
    btnErase.addEventListener('click', eraseSelectedCell);
    btnPencil.addEventListener('click', togglePencilMode);

    // Number Keypad Buttons
    numButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num, 10);
        placeNumber(num);
      });
    });

    // Header & Modal New Game Buttons
    btnNewGame.addEventListener('click', () => startNewGame(true));
    btnPlayAgain.addEventListener('click', () => startNewGame(false));

    // Pause timer on tab switch
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimer();
        saveCurrentSession();
      } else if (!isCompleted) {
        startTimer();
      }
    });

    // Save session on page unload
    window.addEventListener('beforeunload', () => {
      saveCurrentSession();
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
