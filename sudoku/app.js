/**
 * Sudoku UI & Interaction Controller - Zero Dependencies
 * Manages grid rendering, keyboard navigation (step, 3x3 jump, edge jump, undo, redo),
 * rotary dial touch gestures, pencil notes, per-difficulty game persistence, and game progression.
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
  let redoStack = [];
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
  let touchStartX = 0;
  let touchStartY = 0;
  let hasDraggedOut = false;
  let overlayOpenTime = 0;

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
  const assistSegButtons = document.querySelectorAll('.assist-seg-btn');
  const assistControl = document.getElementById('assist-control');
  const assistBubble = document.getElementById('assist-bubble');
  const bubbleTitle = document.getElementById('bubble-title');
  const bubbleDesc = document.getElementById('bubble-desc');

  // Assist Level: 0 = Pure/Clean, 1 = Errors Only, 2 = Full Guide
  const ASSIST_STORAGE_KEY = 'sudoku_assist_level_v1';
  let assistLevel = 2;
  let bubbleFadeTimeout = null;

  const ASSIST_LEVEL_INFO = [
    {
      title: 'Level 0: Clean (Hardcore)',
      desc: 'No highlights, no collision warnings'
    },
    {
      title: 'Level 1: Rule Collisions',
      desc: 'Red highlight on duplicate digits'
    },
    {
      title: 'Level 2: Full Guide',
      desc: 'Same-number & row/col highlights + collision warnings'
    }
  ];

  function setAssistLevel(level, showBubble = false) {
    assistLevel = Math.max(0, Math.min(2, level));
    if (assistControl) assistControl.dataset.level = assistLevel;
    if (assistSegButtons) {
      assistSegButtons.forEach((btn) => {
        const btnLvl = parseInt(btn.dataset.level, 10);
        const isActive = btnLvl === assistLevel;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });
    }

    if (showBubble && assistBubble) {
      const info = ASSIST_LEVEL_INFO[assistLevel];
      if (bubbleTitle) bubbleTitle.textContent = info.title;
      if (bubbleDesc) bubbleDesc.textContent = info.desc;
      assistBubble.classList.add('active');
      clearTimeout(bubbleFadeTimeout);
      hideAssistBubble(1800);
    }

    try {
      localStorage.setItem(ASSIST_STORAGE_KEY, assistLevel);
    } catch (e) {
      // quota
    }

    updateConflictClasses();
    applySelectionHighlights();
    updateKeypadCounts();
  }

  function hideAssistBubble(delay = 650) {
    clearTimeout(bubbleFadeTimeout);
    bubbleFadeTimeout = setTimeout(() => {
      if (assistBubble) assistBubble.classList.remove('active');
    }, delay);
  }

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
        redoStack,
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
        redoStack = s.redoStack || [];
        isCompleted = !!s.isCompleted;
        return true;
      }
    } catch (e) {
      console.warn('Could not load session from localStorage', e);
    }
    return false;
  }

  // --- Initialization ---
  function init() {
    createGridCells();
    setupRotaryDial();
    bindEvents();

    const savedAssist = localStorage.getItem(ASSIST_STORAGE_KEY);
    if (savedAssist !== null) {
      const parsed = parseInt(savedAssist, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) {
        assistLevel = parsed;
      }
    }
    setAssistLevel(assistLevel, false);

    const savedDiff = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (savedDiff && ['easy', 'medium', 'hard', 'expert'].includes(savedDiff)) {
      difficulty = savedDiff;
    }
    updateDiffButtons();

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

  // --- Setup Rotary Dial Items ---
  function setupRotaryDial() {
    const radius = 80;
    const items = rotaryWheel.querySelectorAll('.rotary-item');

    items.forEach((item) => {
      const num = parseInt(item.dataset.num, 10);
      const angleDeg = -90 + (num - 1) * 40;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = 115 + radius * Math.cos(angleRad);
      const y = 115 + radius * Math.sin(angleRad);

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
    redoStack = [];
    selectedIdx = null;
    victoryModal.classList.remove('active');

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

    saveCurrentSession();
    stopTimer();

    difficulty = newDiff;
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    updateDiffButtons();
    selectedIdx = null;
    redoStack = [];
    victoryModal.classList.remove('active');

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

      cell.className = 'cell';
      if (isInitial) {
        cell.classList.add('initial');
      } else if (isUserFilled) {
        cell.classList.add('user-filled');
      }

      if (assistLevel > 0 && conflicts.has(i)) cell.classList.add('conflict');

      if (val !== 0) {
        valSpan.textContent = val;
        valSpan.style.display = 'flex';
        notesGrid.style.display = 'none';
      } else {
        valSpan.textContent = '';
        valSpan.style.display = 'none';
        notesGrid.style.display = 'grid';

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
    const cells = gridEl.children;
    if (assistLevel === 0) {
      for (let i = 0; i < 81; i++) {
        cells[i].classList.remove('conflict');
      }
      return;
    }

    const conflicts = SudokuAlgo.findConflicts(board);
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
      } else if (assistLevel === 2) {
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
    if (puzzle[selectedIdx] !== 0) return;

    const prevVal = board[selectedIdx];
    const prevNotes = notes[selectedIdx];

    if (pencilMode) {
      if (num === 0) {
        if (prevNotes !== 0) {
          notes[selectedIdx] = 0;
          history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: prevVal, prevNotes, newNotes: 0 });
          redoStack = [];
          renderSingleCell(selectedIdx);
          saveCurrentSession();
        }
      } else {
        const newNotes = prevNotes ^ (1 << num);
        notes[selectedIdx] = newNotes;
        board[selectedIdx] = 0;
        history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: 0, prevNotes, newNotes });
        redoStack = [];
        renderSingleCell(selectedIdx);
        saveCurrentSession();
      }
    } else {
      if (prevVal === num) return;

      board[selectedIdx] = num;
      notes[selectedIdx] = 0;
      history.push({ type: 'set', index: selectedIdx, prevVal, newVal: num, prevNotes, newNotes: 0 });
      redoStack = [];
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
    redoStack = [];
    renderSingleCell(selectedIdx);
    saveCurrentSession();
  }

  function undoLastMove() {
    if (history.length === 0 || isCompleted) return;
    const action = history.pop();
    board[action.index] = action.prevVal;
    notes[action.index] = action.prevNotes;
    redoStack.push(action);
    selectedIdx = action.index;
    renderSingleCell(action.index);
    saveCurrentSession();
  }

  function redoLastMove() {
    if (redoStack.length === 0 || isCompleted) return;
    const action = redoStack.pop();
    board[action.index] = action.newVal;
    notes[action.index] = action.newNotes;
    history.push(action);
    selectedIdx = action.index;
    renderSingleCell(action.index);
    saveCurrentSession();
    checkVictoryCondition();
  }

  // --- Keypad Remaining Counts ---
  function updateKeypadCounts() {
    const isHardcore = assistLevel === 0;
    const keypadEl = document.querySelector('.keypad');
    if (keypadEl) {
      keypadEl.classList.toggle('hide-counts', isHardcore);
    }

    if (isHardcore) {
      numButtons.forEach((btn) => {
        btn.classList.remove('completed');
      });
      return;
    }

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

  // --- Keyboard Navigation (Custom Step, 3x3 Jump, Edge Jump, Undo, Redo) ---
  function handleKeyDown(e) {
    if (victoryModal.classList.contains('active')) return;
    if (isRotaryOpen) {
      if (e.key === 'Escape') closeRotaryDial();
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key;

    // --- Undo (Ctrl+Z or U) ---
    if ((isCtrl && !isShift && (key === 'z' || key === 'Z')) || (!isCtrl && (key === 'u' || key === 'U'))) {
      undoLastMove();
      e.preventDefault();
      return;
    }

    // --- Redo (Ctrl+Y or Ctrl+Shift+Z) ---
    if ((isCtrl && (key === 'y' || key === 'Y')) || (isCtrl && isShift && (key === 'z' || key === 'Z'))) {
      redoLastMove();
      e.preventDefault();
      return;
    }

    // --- Grid Navigation ---
    if (selectedIdx !== null) {
      let r = Math.floor(selectedIdx / 9);
      let c = selectedIdx % 9;
      let handled = false;

      const isUp = key === 'ArrowUp' || (!isCtrl && (key === 'w' || key === 'W' || key === 'k'));
      const isDown = key === 'ArrowDown' || (!isCtrl && (key === 's' || key === 'S' || key === 'j'));
      const isLeft = key === 'ArrowLeft' || (!isCtrl && (key === 'a' || key === 'A' || key === 'h'));
      const isRight = key === 'ArrowRight' || (!isCtrl && (key === 'd' || key === 'D' || key === 'l'));

      if (isUp || isDown || isLeft || isRight) {
        if (isCtrl && isShift) {
          // Jump all the way to the edge
          if (isUp) r = 0;
          if (isDown) r = 8;
          if (isLeft) c = 0;
          if (isRight) c = 8;
          handled = true;
        } else if (isCtrl) {
          // Jump to adjacent 3x3 square (same relative cell position)
          if (isUp) r = (r - 3 + 9) % 9;
          if (isDown) r = (r + 3) % 9;
          if (isLeft) c = (c - 3 + 9) % 9;
          if (isRight) c = (c + 3) % 9;
          handled = true;
        } else {
          // Single cell step
          if (isUp) r = (r - 1 + 9) % 9;
          if (isDown) r = (r + 1) % 9;
          if (isLeft) c = (c - 1 + 9) % 9;
          if (isRight) c = (c + 1) % 9;
          handled = true;
        }

        if (handled) {
          selectCell(r * 9 + c);
          e.preventDefault();
          return;
        }
      }
    }

    // Number Inputs
    if (/^[1-9]$/.test(key) && !isCtrl) {
      placeNumber(parseInt(key, 10));
      e.preventDefault();
      return;
    }

    // Erase
    if ((key === 'Backspace' || key === 'Delete' || key === '0') && !isCtrl) {
      eraseSelectedCell();
      e.preventDefault();
      return;
    }

    // Notes Toggle
    if ((key === 'n' || key === 'N' || key === 'p' || key === 'P') && !isCtrl) {
      togglePencilMode();
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
  function openRotaryDial(cellIdx, cellEl) {
    if (isCompleted || puzzle[cellIdx] !== 0) return;

    selectCell(cellIdx);
    rotaryCellIdx = cellIdx;
    isRotaryOpen = true;
    overlayOpenTime = Date.now();
    hasDraggedOut = false;
    activeRotaryHover = null;

    // Center wheel exactly over target cell bounding box
    const cellRect = cellEl.getBoundingClientRect();
    const centerX = cellRect.left + cellRect.width / 2;
    const centerY = cellRect.top + cellRect.height / 2;

    const wheelRadius = 115;
    const padding = 10;
    let x = Math.max(wheelRadius + padding, Math.min(window.innerWidth - wheelRadius - padding, centerX));
    let y = Math.max(wheelRadius + padding, Math.min(window.innerHeight - wheelRadius - padding, centerY));

    wheelCenter = { x, y };
    rotaryWheel.style.left = `${x}px`;
    rotaryWheel.style.top = `${y}px`;

    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));

    rotaryOverlay.classList.add('active');

    if (navigator.vibrate) navigator.vibrate(20);
  }

  function updateRotaryTarget(clientX, clientY) {
    if (!isRotaryOpen) return;

    const dx = clientX - wheelCenter.x;
    const dy = clientY - wheelCenter.y;
    const dist = Math.hypot(dx, dy);

    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));

    if (dist > 35) {
      hasDraggedOut = true;
    }

    if (!hasDraggedOut) {
      activeRotaryHover = null;
      return;
    }

    if (dist < 28) {
      rotaryCenter.classList.add('hovered');
      activeRotaryHover = 0;
      return;
    }

    if (dist >= 35 && dist <= 145) {
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      let relAngle = angle - (-90);
      while (relAngle < 0) relAngle += 360;
      while (relAngle >= 360) relAngle -= 360;

      const digitIndex = Math.round(relAngle / 40) % 9;
      const hoveredNum = digitIndex + 1;

      const targetEl = rotaryWheel.querySelector(`.rotary-item[data-num="${hoveredNum}"]`);
      if (targetEl) {
        targetEl.classList.add('hovered');
        if (activeRotaryHover !== hoveredNum && navigator.vibrate) {
          navigator.vibrate(8);
        }
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
    hasDraggedOut = false;
    rotaryOverlay.classList.remove('active');
    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));
  }

  // --- Event Bindings ---
  function bindEvents() {
    window.addEventListener('keydown', handleKeyDown);

    // Suppress system context menu on mobile hold
    window.addEventListener('contextmenu', (e) => {
      if (isRotaryOpen || longPressTimeout) {
        e.preventDefault();
      }
    });

    // Helper for pointer & touch release
    function handleRotaryRelease() {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
      if (isRotaryOpen) {
        if (hasDraggedOut && activeRotaryHover !== null) {
          commitRotarySelection();
        } else if (hasDraggedOut && activeRotaryHover === null) {
          closeRotaryDial();
        }
      }
    }

    // Grid Cell Pointer & Touch Press
    gridEl.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;

      const idx = parseInt(cell.dataset.index, 10);
      const isClue = puzzle[idx] !== 0;

      selectCell(idx);

      if (!isClue && !isCompleted) {
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        clearTimeout(longPressTimeout);
        longPressTimeout = setTimeout(() => {
          openRotaryDial(idx, cell);
        }, 240);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (longPressTimeout) {
        const moveDist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY);
        if (moveDist > 14) {
          clearTimeout(longPressTimeout);
          longPressTimeout = null;
        }
      }
      if (isRotaryOpen) {
        updateRotaryTarget(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', handleRotaryRelease);

    window.addEventListener('pointercancel', () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
    });

    // Touch events for ultra-reliable mobile tracking and scroll prevention
    window.addEventListener('touchmove', (e) => {
      if (longPressTimeout && e.touches.length > 0) {
        const t = e.touches[0];
        const moveDist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        if (moveDist > 14) {
          clearTimeout(longPressTimeout);
          longPressTimeout = null;
        }
      }
      if (isRotaryOpen && e.touches.length > 0) {
        const t = e.touches[0];
        updateRotaryTarget(t.clientX, t.clientY);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchend', handleRotaryRelease);

    // Rotary Overlay Click / Backdrop dismiss
    rotaryOverlay.addEventListener('click', (e) => {
      if (Date.now() - overlayOpenTime < 250) return;
      if (e.target === rotaryOverlay) {
        closeRotaryDial();
      }
    });

    // Direct clicks on rotary wheel items (Tap-to-select support)
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
        return;
      }
      if (Date.now() - overlayOpenTime >= 250) {
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
    // Assist Mode Segmented Button Events
    if (assistSegButtons && assistSegButtons.length > 0) {
      assistSegButtons.forEach((btn) => {
        const lvl = parseInt(btn.dataset.level, 10);
        btn.addEventListener('click', () => {
          setAssistLevel(lvl, true);
        });
        btn.addEventListener('mouseenter', () => {
          const info = ASSIST_LEVEL_INFO[lvl];
          if (bubbleTitle) bubbleTitle.textContent = info.title;
          if (bubbleDesc) bubbleDesc.textContent = info.desc;
          if (assistBubble) assistBubble.classList.add('active');
        });
        btn.addEventListener('mouseleave', () => {
          hideAssistBubble(300);
        });
      });

      // Drag / slide gestures across the segmented buttons
      if (assistControl) {
        let isTouchingControl = false;

        const handleTouchLevel = (e) => {
          const touch = e.touches[0];
          if (!touch) return;
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          const segBtn = target ? target.closest('.assist-seg-btn') : null;
          if (segBtn) {
            const lvl = parseInt(segBtn.dataset.level, 10);
            if (lvl !== assistLevel) {
              setAssistLevel(lvl, true);
              if (navigator.vibrate) navigator.vibrate(10);
            }
          }
        };

        assistControl.addEventListener('touchstart', (e) => {
          isTouchingControl = true;
          handleTouchLevel(e);
        }, { passive: true });

        assistControl.addEventListener('touchmove', (e) => {
          if (!isTouchingControl) return;
          handleTouchLevel(e);
        }, { passive: true });

        assistControl.addEventListener('touchend', () => {
          isTouchingControl = false;
          hideAssistBubble(1500);
        }, { passive: true });

        assistControl.addEventListener('touchcancel', () => {
          isTouchingControl = false;
          hideAssistBubble(500);
        }, { passive: true });
      }
    }

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
