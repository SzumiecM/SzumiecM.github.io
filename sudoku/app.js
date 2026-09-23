/**
 * Sudoku UI & Interaction Controller - Zero Dependencies
 * Manages grid rendering, keyboard navigation, rotary dial touch gestures,
 * pencil notes, undo history, and game progression.
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

  // --- Initialization ---
  function init() {
    createGridCells();
    setupRotaryDial();
    bindEvents();

    // Load preferred difficulty from storage or default to medium
    const savedDiff = localStorage.getItem('sudoku_difficulty');
    if (savedDiff && ['easy', 'medium', 'hard', 'expert'].includes(savedDiff)) {
      difficulty = savedDiff;
    }
    updateDiffButtons();

    startNewGame();
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

      // Main value display container
      const valSpan = document.createElement('span');
      valSpan.className = 'cell-val';
      cell.appendChild(valSpan);

      gridEl.appendChild(cell);
    }
  }

  // --- Setup Rotary Dial Items (Positioned radially) ---
  function setupRotaryDial() {
    // Digits 1 to 9 arranged around a circle of radius 78px
    // Starting angle at -90deg (top) and stepping by 40deg (360 / 9)
    const radius = 78;
    const items = rotaryWheel.querySelectorAll('.rotary-item');

    items.forEach((item) => {
      const num = parseInt(item.dataset.num, 10);
      // Angle: 1 at top-ish, clockwise
      const angleDeg = -90 + (num - 1) * 40;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = 110 + radius * Math.cos(angleRad);
      const y = 110 + radius * Math.sin(angleRad);

      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
    });
  }

  // --- Game Flow: New Game ---
  function startNewGame() {
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

    renderFullBoard();
    updateKeypadCounts();
    startTimer();

    // Select first empty cell or cell 0
    let firstEmpty = board.findIndex(v => v === 0);
    selectCell(firstEmpty !== -1 ? firstEmpty : 0);
  }

  function restartCurrentPuzzle() {
    if (confirm('Restart current puzzle from the beginning?')) {
      board = new Uint8Array(puzzle);
      notes = new Uint16Array(81);
      history = [];
      isCompleted = false;
      renderFullBoard();
      updateKeypadCounts();
      if (selectedIdx !== null) selectCell(selectedIdx);
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
      const valSpan = cell.querySelector('.cell-val');
      const notesGrid = cell.querySelector('.notes-grid');

      // Reset state classes
      cell.className = 'cell';
      if (isInitial) cell.classList.add('initial');
      else if (val !== 0) cell.classList.add('user-filled');

      if (conflicts.has(i)) cell.classList.add('conflict');

      if (val !== 0) {
        valSpan.textContent = val;
        valSpan.style.display = 'block';
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
    const valSpan = cell.querySelector('.cell-val');
    const notesGrid = cell.querySelector('.notes-grid');

    cell.classList.remove('user-filled', 'initial');
    if (isInitial) cell.classList.add('initial');
    else if (val !== 0) cell.classList.add('user-filled');

    if (val !== 0) {
      valSpan.textContent = val;
      valSpan.style.display = 'block';
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

    // Refresh conflicts on all cells
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

    // Fixed clues cannot be altered
    if (puzzle[selectedIdx] !== 0) return;

    const prevVal = board[selectedIdx];
    const prevNotes = notes[selectedIdx];

    if (pencilMode) {
      if (num === 0) {
        // Clear all notes for this cell
        if (prevNotes !== 0) {
          notes[selectedIdx] = 0;
          history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: prevVal, prevNotes, newNotes: 0 });
          renderSingleCell(selectedIdx);
        }
      } else {
        // Toggle candidate note
        const newNotes = prevNotes ^ (1 << num);
        notes[selectedIdx] = newNotes;
        board[selectedIdx] = 0; // Clear value if taking notes
        history.push({ type: 'notes', index: selectedIdx, prevVal, newVal: 0, prevNotes, newNotes });
        renderSingleCell(selectedIdx);
      }
    } else {
      if (prevVal === num) return; // No change

      board[selectedIdx] = num;
      notes[selectedIdx] = 0; // Clear notes when number is placed
      history.push({ type: 'set', index: selectedIdx, prevVal, newVal: num, prevNotes, newNotes: 0 });
      renderSingleCell(selectedIdx);

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
  }

  function undoLastMove() {
    if (history.length === 0 || isCompleted) return;
    const action = history.pop();
    board[action.index] = action.prevVal;
    notes[action.index] = action.prevNotes;
    selectedIdx = action.index;
    renderSingleCell(action.index);
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
    // 1. All cells must be non-zero
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) return;
    }

    // 2. No conflicts on board
    const conflicts = SudokuAlgo.findConflicts(board);
    if (conflicts.size > 0) return;

    // Victory achieved!
    isCompleted = true;
    stopTimer();

    victoryTimeEl.textContent = formatTime(timerSeconds);
    victoryDiffEl.textContent = SudokuAlgo.DIFFICULTY_CONFIG[difficulty].label;
    victoryModal.classList.add('active');
  }

  // --- Timer Functions ---
  function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
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

  // --- Difficulty Buttons ---
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
    // Ignore keyboard input if modal or overlay is active
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

    // Position wheel centered at touch point, bounded inside viewport
    const wheelRadius = 110;
    const padding = 15;
    let x = Math.max(wheelRadius + padding, Math.min(window.innerWidth - wheelRadius - padding, clientX));
    let y = Math.max(wheelRadius + padding, Math.min(window.innerHeight - wheelRadius - padding, clientY));

    wheelCenter = { x, y };
    rotaryWheel.style.left = `${x}px`;
    rotaryWheel.style.top = `${y}px`;

    rotaryOverlay.classList.add('active');

    // Subtle haptic tick if supported
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function updateRotaryTarget(clientX, clientY) {
    if (!isRotaryOpen) return;

    const dx = clientX - wheelCenter.x;
    const dy = clientY - wheelCenter.y;
    const dist = Math.hypot(dx, dy);

    // Reset hover classes
    rotaryCenter.classList.remove('hovered');
    rotaryWheel.querySelectorAll('.rotary-item').forEach(el => el.classList.remove('hovered'));

    if (dist < 32) {
      // Hovering center Erase
      rotaryCenter.classList.add('hovered');
      activeRotaryHover = 0;
      return;
    }

    if (dist >= 45 && dist <= 145) {
      // Calculate angle (-180 to 180 deg)
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Normalize angle to match digit positions (digit 1 is at -90 deg)
      // angle relative to digit 1:
      let relAngle = angle - (-90);
      while (relAngle < 0) relAngle += 360;
      while (relAngle >= 360) relAngle -= 360;

      // Each spoke covers 40 degrees
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
    // Window Keyboard Listener
    window.addEventListener('keydown', handleKeyDown);

    // Grid Cell Click & Long-Press Delegation
    gridEl.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;

      const idx = parseInt(cell.dataset.index, 10);
      const isClue = puzzle[idx] !== 0;

      // Select cell immediately
      selectCell(idx);

      // Start long-press timer for rotary dial on mutable cells
      if (!isClue && !isCompleted) {
        clearTimeout(longPressTimeout);
        longPressTimeout = setTimeout(() => {
          openRotaryDial(idx, e.clientX, e.clientY);
        }, 340);
      }
    });

    // Cancel long press if finger moves or lifts early
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

    // Difficulty Buttons
    diffButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const newDiff = btn.dataset.diff;
        if (newDiff === difficulty) return;
        difficulty = newDiff;
        localStorage.setItem('sudoku_difficulty', difficulty);
        updateDiffButtons();
        startNewGame();
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

    // Header / Modal Buttons
    btnNewGame.addEventListener('click', () => {
      if (confirm('Start a new puzzle?')) startNewGame();
    });
    btnPlayAgain.addEventListener('click', startNewGame);

    // Pause timer on tab switch
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimer();
      } else if (!isCompleted) {
        startTimer();
      }
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
