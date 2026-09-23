/**
 * Sudoku Core Engine - Zero Dependencies
 * Mathematical generation, bitmask solver, uniqueness verification, and hole carving.
 */

// Bitmask helpers: digits 1..9 correspond to bits 1..9 (masks: 1 << 1 ... 1 << 9)
const ALL_CANDIDATES = 0x3FE; // (1<<1) | (1<<2) | ... | (1<<9)

/**
 * Counts set bits in a 16-bit integer (Hamming weight).
 */
function countBits(n) {
  let count = 0;
  while (n > 0) {
    n &= n - 1;
    count++;
  }
  return count;
}

/**
 * Bitmask Solver & Uniqueness Checker
 * Uses MRV (Minimum Remaining Values) heuristic over empty cells for ultra-fast search.
 * Returns number of solutions found, aborting early if limit is reached.
 * Guaranteed zero side-effects on input board.
 * @param {Uint8Array|Array} board - 81-length array (0 = empty, 1-9 = clues)
 * @param {number} limit - Maximum number of solutions to search for (default 2)
 * @returns {number} Number of solutions found (0, 1, or limit)
 */
function solveCount(board, limit = 2) {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  const workingBoard = new Uint8Array(board);
  const emptyCells = [];

  // Initialize bitmasks and empty cell list
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const val = workingBoard[idx];
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (val !== 0) {
        const mask = 1 << val;
        if ((rows[r] & mask) || (cols[c] & mask) || (boxes[b] & mask)) {
          return 0; // Board has an inherent contradiction
        }
        rows[r] |= mask;
        cols[c] |= mask;
        boxes[b] |= mask;
      } else {
        emptyCells.push({ r, c, b, idx });
      }
    }
  }

  let solutions = 0;
  const numEmpty = emptyCells.length;

  function backtrack(index) {
    if (index === numEmpty) {
      solutions++;
      return solutions >= limit;
    }

    // MRV heuristic: find empty cell with fewest available candidates
    let bestPos = index;
    let minCandidates = 10;
    let bestMask = 0;

    for (let i = index; i < numEmpty; i++) {
      const cell = emptyCells[i];
      const occupied = rows[cell.r] | cols[cell.c] | boxes[cell.b];
      const available = ALL_CANDIDATES & ~occupied;
      const cCount = countBits(available);

      if (cCount === 0) {
        return false; // Dead end
      }

      if (cCount < minCandidates) {
        minCandidates = cCount;
        bestPos = i;
        bestMask = available;
        if (cCount === 1) break; // Cannot beat 1 candidate
      }
    }

    // Swap best cell into current position
    const cell = emptyCells[bestPos];
    emptyCells[bestPos] = emptyCells[index];
    emptyCells[index] = cell;

    const { r, c, b, idx } = cell;

    for (let num = 1; num <= 9; num++) {
      const mask = 1 << num;
      if (bestMask & mask) {
        workingBoard[idx] = num;
        rows[r] |= mask;
        cols[c] |= mask;
        boxes[b] |= mask;

        const stop = backtrack(index + 1);

        workingBoard[idx] = 0;
        rows[r] &= ~mask;
        cols[c] &= ~mask;
        boxes[b] &= ~mask;

        if (stop) {
          // Restore emptyCells order before returning
          emptyCells[index] = emptyCells[bestPos];
          emptyCells[bestPos] = cell;
          return true;
        }
      }
    }

    // Restore emptyCells order
    emptyCells[index] = emptyCells[bestPos];
    emptyCells[bestPos] = cell;
    return false;
  }

  backtrack(0);
  return solutions;
}

/**
 * Solve a board completely, returning the completed Uint8Array solution.
 * @param {Uint8Array|Array} board - 81-length board
 * @returns {Uint8Array|null} Solution board, or null if unsolvable
 */
function solveBoard(board) {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  const workingBoard = new Uint8Array(board);
  const emptyCells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const val = workingBoard[idx];
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (val !== 0) {
        const mask = 1 << val;
        rows[r] |= mask;
        cols[c] |= mask;
        boxes[b] |= mask;
      } else {
        emptyCells.push({ r, c, b, idx });
      }
    }
  }

  const result = new Uint8Array(81);
  let solved = false;
  const numEmpty = emptyCells.length;

  function backtrack(index) {
    if (index === numEmpty) {
      solved = true;
      result.set(workingBoard);
      return true;
    }

    let bestPos = index;
    let minCandidates = 10;
    let bestMask = 0;

    for (let i = index; i < numEmpty; i++) {
      const cell = emptyCells[i];
      const occupied = rows[cell.r] | cols[cell.c] | boxes[cell.b];
      const available = ALL_CANDIDATES & ~occupied;
      const cCount = countBits(available);

      if (cCount === 0) return false;

      if (cCount < minCandidates) {
        minCandidates = cCount;
        bestPos = i;
        bestMask = available;
        if (cCount === 1) break;
      }
    }

    const cell = emptyCells[bestPos];
    emptyCells[bestPos] = emptyCells[index];
    emptyCells[index] = cell;

    const { r, c, b, idx } = cell;

    for (let num = 1; num <= 9; num++) {
      const mask = 1 << num;
      if (bestMask & mask) {
        workingBoard[idx] = num;
        rows[r] |= mask;
        cols[c] |= mask;
        boxes[b] |= mask;

        if (backtrack(index + 1)) {
          emptyCells[index] = emptyCells[bestPos];
          emptyCells[bestPos] = cell;
          return true;
        }

        workingBoard[idx] = 0;
        rows[r] &= ~mask;
        cols[c] &= ~mask;
        boxes[b] &= ~mask;
      }
    }

    emptyCells[index] = emptyCells[bestPos];
    emptyCells[bestPos] = cell;
    return false;
  }

  backtrack(0);
  return solved ? result : null;
}

/**
 * Generate a complete, mathematically valid 9x9 board in < 1ms
 * using isomorphic Sudoku transformations on a canonical board.
 * @returns {Uint8Array} Fully solved valid Sudoku board (81 cells)
 */
function generateFullBoard() {
  const board = new Uint8Array(81);

  // 1. Canonical solved base grid
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board[r * 9 + c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
    }
  }

  // 2. Permute numbers 1..9 randomly
  const mapping = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 81; i++) {
    board[i] = mapping[board[i] - 1];
  }

  // Helper row swap
  function swapRows(r1, r2) {
    if (r1 === r2) return;
    for (let c = 0; c < 9; c++) {
      const tmp = board[r1 * 9 + c];
      board[r1 * 9 + c] = board[r2 * 9 + c];
      board[r2 * 9 + c] = tmp;
    }
  }

  // Helper col swap
  function swapCols(c1, c2) {
    if (c1 === c2) return;
    for (let r = 0; r < 9; r++) {
      const tmp = board[r * 9 + c1];
      board[r * 9 + c1] = board[r * 9 + c2];
      board[r * 9 + c2] = tmp;
    }
  }

  // 3. Shuffle rows within each 3-row band
  for (let band = 0; band < 3; band++) {
    for (let i = 0; i < 3; i++) {
      const r1 = band * 3 + i;
      const r2 = band * 3 + Math.floor(Math.random() * 3);
      swapRows(r1, r2);
    }
  }

  // 4. Shuffle columns within each 3-col stack
  for (let stack = 0; stack < 3; stack++) {
    for (let i = 0; i < 3; i++) {
      const c1 = stack * 3 + i;
      const c2 = stack * 3 + Math.floor(Math.random() * 3);
      swapCols(c1, c2);
    }
  }

  // 5. Swap bands randomly
  for (let b = 0; b < 3; b++) {
    const target = Math.floor(Math.random() * 3);
    if (b !== target) {
      for (let i = 0; i < 3; i++) {
        swapRows(b * 3 + i, target * 3 + i);
      }
    }
  }

  // 6. Swap stacks randomly
  for (let s = 0; s < 3; s++) {
    const target = Math.floor(Math.random() * 3);
    if (s !== target) {
      for (let i = 0; i < 3; i++) {
        swapCols(s * 3 + i, target * 3 + i);
      }
    }
  }

  // 7. Optional matrix transpose
  if (Math.random() > 0.5) {
    for (let r = 0; r < 9; r++) {
      for (let c = r + 1; c < 9; c++) {
        const tmp = board[r * 9 + c];
        board[r * 9 + c] = board[c * 9 + r];
        board[c * 9 + r] = tmp;
      }
    }
  }

  return board;
}

/**
 * Difficulty target settings
 */
const DIFFICULTY_CONFIG = {
  easy: { minClues: 38, maxClues: 42, label: 'Easy' },
  medium: { minClues: 30, maxClues: 34, label: 'Medium' },
  hard: { minClues: 26, maxClues: 29, label: 'Hard' },
  expert: { minClues: 22, maxClues: 25, label: 'Expert' }
};

/**
 * Generate a unique solvable puzzle of the requested difficulty.
 * Employs rotational symmetry hole-carving with single-cell refinement.
 * Guaranteed 100% unique solution.
 * @param {string} difficulty - 'easy', 'medium', 'hard', or 'expert'
 * @returns {{ puzzle: Uint8Array, solution: Uint8Array, clues: number, difficulty: string }}
 */
function generatePuzzle(difficulty = 'medium') {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const targetClues = Math.floor(
    Math.random() * (config.maxClues - config.minClues + 1)
  ) + config.minClues;

  const fullSolution = generateFullBoard();
  const puzzle = new Uint8Array(fullSolution);

  // Generate symmetrical pairs: (r, c) and (8 - r, 8 - c)
  const pairs = [];
  const visited = new Uint8Array(81);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx1 = r * 9 + c;
      if (!visited[idx1]) {
        const idx2 = (8 - r) * 9 + (8 - c);
        visited[idx1] = 1;
        visited[idx2] = 1;
        pairs.push([idx1, idx2]);
      }
    }
  }

  // Shuffle pairs
  pairs.sort(() => Math.random() - 0.5);

  let cluesRemaining = 81;

  // Phase 1: Symmetric Carving
  for (const [idx1, idx2] of pairs) {
    if (cluesRemaining <= targetClues) break;

    const val1 = puzzle[idx1];
    const val2 = puzzle[idx2];

    puzzle[idx1] = 0;
    puzzle[idx2] = 0;

    // Check if puzzle still has strictly 1 unique solution
    if (solveCount(puzzle, 2) === 1) {
      cluesRemaining -= (idx1 === idx2 ? 1 : 2);
    } else {
      // Ambiguity introduced; restore pair
      puzzle[idx1] = val1;
      puzzle[idx2] = val2;
    }
  }

  // Phase 2: Asymmetric refinement if needed to reach target clues
  if (cluesRemaining > targetClues) {
    const singleIndices = Array.from({ length: 81 }, (_, i) => i)
      .filter(i => puzzle[i] !== 0)
      .sort(() => Math.random() - 0.5);

    for (const idx of singleIndices) {
      if (cluesRemaining <= targetClues) break;

      const backup = puzzle[idx];
      puzzle[idx] = 0;

      if (solveCount(puzzle, 2) === 1) {
        cluesRemaining--;
      } else {
        puzzle[idx] = backup;
      }
    }
  }

  return {
    puzzle,
    solution: fullSolution,
    clues: cluesRemaining,
    difficulty
  };
}

/**
 * Scan board and detect all current conflicts.
 * An index is in conflict if its value duplicates another cell in the same row, col, or box.
 * @param {Uint8Array|Array} board - 81-cell board
 * @returns {Set<number>} Set of conflicting cell indices
 */
// Pre-computed 27 groups (9 rows, 9 columns, 9 boxes) for zero-allocation conflict detection
const SUDOKU_GROUPS = (function () {
  const groups = [];
  // 9 rows
  for (let r = 0; r < 9; r++) {
    const row = new Uint8Array(9);
    for (let c = 0; c < 9; c++) row[c] = r * 9 + c;
    groups.push(row);
  }
  // 9 columns
  for (let c = 0; c < 9; c++) {
    const col = new Uint8Array(9);
    for (let r = 0; r < 9; r++) col[r] = r * 9 + c;
    groups.push(col);
  }
  // 9 boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = new Uint8Array(9);
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          box[idx++] = (br * 3 + r) * 9 + (bc * 3 + c);
        }
      }
      groups.push(box);
    }
  }
  return groups;
})();

const SEEN_LOOKUP = new Int8Array(10);

/**
 * Identify all cell indices currently violating Sudoku rules.
 * An index is in conflict if its value duplicates another cell in the same row, col, or box.
 * High-performance zero-allocation scan.
 * @param {Uint8Array|Array} board - 81-cell board
 * @returns {Set<number>} Set of conflicting cell indices
 */
function findConflicts(board) {
  const conflicts = new Set();

  for (let g = 0; g < 27; g++) {
    const group = SUDOKU_GROUPS[g];
    SEEN_LOOKUP.fill(-1);

    for (let i = 0; i < 9; i++) {
      const cellIdx = group[i];
      const val = board[cellIdx];
      if (val !== 0) {
        const prevIdx = SEEN_LOOKUP[val];
        if (prevIdx !== -1) {
          conflicts.add(cellIdx);
          conflicts.add(prevIdx);
        } else {
          SEEN_LOOKUP[val] = cellIdx;
        }
      }
    }
  }

  return conflicts;
}

// Export for module or global browser scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    solveCount,
    solveBoard,
    generateFullBoard,
    generatePuzzle,
    findConflicts,
    DIFFICULTY_CONFIG
  };
} else {
  window.SudokuAlgo = {
    solveCount,
    solveBoard,
    generateFullBoard,
    generatePuzzle,
    findConflicts,
    DIFFICULTY_CONFIG
  };
}
