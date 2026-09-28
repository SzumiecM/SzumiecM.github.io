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
 * Pre-computed cell geometric lookups & 20-peer neighborhoods
 * Enables zero-allocation, ultra-fast peer elimination in logical deduction.
 */
const CELL_ROW = new Uint8Array(81);
const CELL_COL = new Uint8Array(81);
const CELL_BOX = new Uint8Array(81);
const CELL_PEERS = Array.from({ length: 81 }, () => new Uint8Array(20));

// Pre-computed 27 groups (9 rows, 9 columns, 9 boxes) for zero-allocation conflict detection and logical solving
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

(function initCellLookups() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      CELL_ROW[idx] = r;
      CELL_COL[idx] = c;
      CELL_BOX[idx] = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    }
  }

  for (let i = 0; i < 81; i++) {
    const peers = [];
    const r = CELL_ROW[i];
    const c = CELL_COL[i];
    const b = CELL_BOX[i];

    for (let j = 0; j < 81; j++) {
      if (j !== i && (CELL_ROW[j] === r || CELL_COL[j] === c || CELL_BOX[j] === b)) {
        peers.push(j);
      }
    }
    CELL_PEERS[i] = new Uint8Array(peers);
  }
})();

/**
 * Human Logical Deduction Solver (Zero Guessing / Deterministic Path)
 * Simulates human deductive reasoning techniques without recursive backtracking:
 * 1. Naked Singles
 * 2. Hidden Singles (Row, Column, Box)
 * 3. Pointing / Claiming (Box-Line Intersections)
 * 4. Naked Pairs
 * 5. Hidden Pairs
 *
 * @param {Uint8Array|Array} initialBoard - 81-cell board with clues (0 = empty, 1-9 = clues)
 * @returns {{ solvable: boolean, numSolved: number, maxTechniqueUsed: number }}
 */
function isLogicallySolvable(initialBoard) {
  const board = new Uint8Array(initialBoard);
  const candidates = new Uint16Array(81);
  candidates.fill(ALL_CANDIDATES);

  let numSolved = 0;

  // Initialize clues and eliminate from peers
  for (let i = 0; i < 81; i++) {
    const val = board[i];
    if (val !== 0) {
      numSolved++;
      candidates[i] = 1 << val;
      const mask = ~(1 << val) & ALL_CANDIDATES;
      const peers = CELL_PEERS[i];
      for (let p = 0; p < 20; p++) {
        candidates[peers[p]] &= mask;
      }
    }
  }

  if (numSolved === 81) {
    return { solvable: true, numSolved: 81, maxTechniqueUsed: 1 };
  }

  let progress = true;
  let maxTechniqueUsed = 1;

  while (progress && numSolved < 81) {
    progress = false;

    // --- Technique 1: Naked Singles (cell has only 1 available candidate) ---
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) {
        const mask = candidates[i];
        if (mask === 0) return { solvable: false, numSolved, maxTechniqueUsed }; // Contradiction
        if ((mask & (mask - 1)) === 0) { // Exactly 1 bit set
          let d = 1;
          while ((1 << d) !== mask) d++;
          board[i] = d;
          numSolved++;
          progress = true;

          const elim = ~mask & ALL_CANDIDATES;
          const peers = CELL_PEERS[i];
          for (let p = 0; p < 20; p++) {
            candidates[peers[p]] &= elim;
          }
        }
      }
    }
    if (progress) continue;

    // --- Technique 2: Hidden Singles (digit appears only once in a row, col, or box) ---
    for (let g = 0; g < 27; g++) {
      const group = SUDOKU_GROUPS[g];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        let count = 0;
        let targetIdx = -1;

        for (let i = 0; i < 9; i++) {
          const idx = group[i];
          if (board[idx] === d) {
            count = 99; // Digit already placed in this group
            break;
          }
          if (board[idx] === 0 && (candidates[idx] & bit)) {
            count++;
            targetIdx = idx;
            if (count > 1) break;
          }
        }

        if (count === 1) {
          board[targetIdx] = d;
          candidates[targetIdx] = bit;
          numSolved++;
          progress = true;

          const elim = ~bit & ALL_CANDIDATES;
          const peers = CELL_PEERS[targetIdx];
          for (let p = 0; p < 20; p++) {
            candidates[peers[p]] &= elim;
          }
        }
      }
    }
    if (progress) continue;

    // --- Technique 3: Locked Candidates / Intersections (Pointing & Claiming) ---
    // 3A. Pointing (Box to Row/Col)
    for (let b = 0; b < 9; b++) {
      const box = SUDOKU_GROUPS[18 + b];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        let count = 0;
        let rSame = -1, cSame = -1;

        for (let i = 0; i < 9; i++) {
          const idx = box[i];
          if (board[idx] === d) {
            count = 0;
            break;
          }
          if (board[idx] === 0 && (candidates[idx] & bit)) {
            count++;
            const r = CELL_ROW[idx];
            const c = CELL_COL[idx];
            if (count === 1) {
              rSame = r;
              cSame = c;
            } else {
              if (r !== rSame) rSame = -1;
              if (c !== cSame) cSame = -1;
            }
          }
        }

        if (count > 1) {
          if (rSame !== -1) {
            const row = SUDOKU_GROUPS[rSame];
            for (let i = 0; i < 9; i++) {
              const idx = row[i];
              if (CELL_BOX[idx] !== b && board[idx] === 0 && (candidates[idx] & bit)) {
                candidates[idx] &= ~bit;
                progress = true;
                maxTechniqueUsed = Math.max(maxTechniqueUsed, 2);
              }
            }
          }
          if (cSame !== -1) {
            const col = SUDOKU_GROUPS[9 + cSame];
            for (let i = 0; i < 9; i++) {
              const idx = col[i];
              if (CELL_BOX[idx] !== b && board[idx] === 0 && (candidates[idx] & bit)) {
                candidates[idx] &= ~bit;
                progress = true;
                maxTechniqueUsed = Math.max(maxTechniqueUsed, 2);
              }
            }
          }
        }
      }
    }
    if (progress) continue;

    // 3B. Claiming (Row to Box)
    for (let r = 0; r < 9; r++) {
      const row = SUDOKU_GROUPS[r];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        let count = 0;
        let bSame = -1;

        for (let i = 0; i < 9; i++) {
          const idx = row[i];
          if (board[idx] === d) {
            count = 0;
            break;
          }
          if (board[idx] === 0 && (candidates[idx] & bit)) {
            count++;
            const b = CELL_BOX[idx];
            if (count === 1) {
              bSame = b;
            } else if (b !== bSame) {
              bSame = -1;
            }
          }
        }

        if (count > 1 && bSame !== -1) {
          const box = SUDOKU_GROUPS[18 + bSame];
          for (let i = 0; i < 9; i++) {
            const idx = box[i];
            if (CELL_ROW[idx] !== r && board[idx] === 0 && (candidates[idx] & bit)) {
              candidates[idx] &= ~bit;
              progress = true;
              maxTechniqueUsed = Math.max(maxTechniqueUsed, 2);
            }
          }
        }
      }
    }
    if (progress) continue;

    // 3C. Claiming (Column to Box)
    for (let c = 0; c < 9; c++) {
      const col = SUDOKU_GROUPS[9 + c];
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        let count = 0;
        let bSame = -1;

        for (let i = 0; i < 9; i++) {
          const idx = col[i];
          if (board[idx] === d) {
            count = 0;
            break;
          }
          if (board[idx] === 0 && (candidates[idx] & bit)) {
            count++;
            const b = CELL_BOX[idx];
            if (count === 1) {
              bSame = b;
            } else if (b !== bSame) {
              bSame = -1;
            }
          }
        }

        if (count > 1 && bSame !== -1) {
          const box = SUDOKU_GROUPS[18 + bSame];
          for (let i = 0; i < 9; i++) {
            const idx = box[i];
            if (CELL_COL[idx] !== c && board[idx] === 0 && (candidates[idx] & bit)) {
              candidates[idx] &= ~bit;
              progress = true;
              maxTechniqueUsed = Math.max(maxTechniqueUsed, 2);
            }
          }
        }
      }
    }
    if (progress) continue;

    // --- Technique 4: Naked Pairs (2 cells in same unit with identical 2 candidates) ---
    for (let g = 0; g < 27; g++) {
      const group = SUDOKU_GROUPS[g];
      for (let i = 0; i < 8; i++) {
        const idx1 = group[i];
        if (board[idx1] === 0 && countBits(candidates[idx1]) === 2) {
          const mask1 = candidates[idx1];
          for (let j = i + 1; j < 9; j++) {
            const idx2 = group[j];
            if (board[idx2] === 0 && candidates[idx2] === mask1) {
              for (let k = 0; k < 9; k++) {
                const idxK = group[k];
                if (idxK !== idx1 && idxK !== idx2 && board[idxK] === 0 && (candidates[idxK] & mask1)) {
                  candidates[idxK] &= ~mask1;
                  progress = true;
                  maxTechniqueUsed = Math.max(maxTechniqueUsed, 3);
                }
              }
            }
          }
        }
      }
    }
    if (progress) continue;

    // --- Technique 5: Hidden Pairs (2 digits appear only in the same 2 cells in a unit) ---
    for (let g = 0; g < 27; g++) {
      const group = SUDOKU_GROUPS[g];
      for (let d1 = 1; d1 <= 8; d1++) {
        const bit1 = 1 << d1;
        let c1_1 = -1, c1_2 = -1, count1 = 0;
        for (let i = 0; i < 9; i++) {
          const idx = group[i];
          if (board[idx] === 0 && (candidates[idx] & bit1)) {
            count1++;
            if (count1 === 1) c1_1 = idx;
            else if (count1 === 2) c1_2 = idx;
            else break;
          }
        }
        if (count1 !== 2) continue;

        for (let d2 = d1 + 1; d2 <= 9; d2++) {
          const bit2 = 1 << d2;
          let c2_1 = -1, c2_2 = -1, count2 = 0;
          for (let i = 0; i < 9; i++) {
            const idx = group[i];
            if (board[idx] === 0 && (candidates[idx] & bit2)) {
              count2++;
              if (count2 === 1) c2_1 = idx;
              else if (count2 === 2) c2_2 = idx;
              else break;
            }
          }
          if (count2 === 2 && c1_1 === c2_1 && c1_2 === c2_2) {
            const pairMask = bit1 | bit2;
            if ((candidates[c1_1] & ~pairMask) !== 0 || (candidates[c1_2] & ~pairMask) !== 0) {
              candidates[c1_1] &= pairMask;
              candidates[c1_2] &= pairMask;
              progress = true;
              maxTechniqueUsed = Math.max(maxTechniqueUsed, 3);
            }
          }
        }
      }
    }
  }

  return {
    solvable: numSolved === 81,
    numSolved,
    maxTechniqueUsed
  };
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
 * Generate a 100% uniquely solvable and deductively human-solvable puzzle.
 * When ensureLogical is true, every hole carved is verified against human logical deduction,
 * guaranteeing a 100% guess-free deterministic solving path.
 *
 * @param {string} difficulty - 'easy', 'medium', 'hard', or 'expert'
 * @param {boolean} ensureLogical - Verify 100% guess-free human logical solvability
 * @returns {{ puzzle: Uint8Array, solution: Uint8Array, clues: number, difficulty: string, isDeductivelySolvable: boolean, techniqueLevel: number }}
 */
function generatePuzzle(difficulty = 'medium', ensureLogical = true) {
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

  // Validation function: deductive logical solvability if requested, otherwise uniqueness check
  const isCandidateValid = ensureLogical
    ? (p) => isLogicallySolvable(p).solvable
    : (p) => solveCount(p, 2) === 1;

  // Phase 1: Symmetric Carving
  for (const [idx1, idx2] of pairs) {
    if (cluesRemaining <= targetClues) break;

    const val1 = puzzle[idx1];
    const val2 = puzzle[idx2];

    puzzle[idx1] = 0;
    puzzle[idx2] = 0;

    if (isCandidateValid(puzzle)) {
      cluesRemaining -= (idx1 === idx2 ? 1 : 2);
    } else {
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

      if (isCandidateValid(puzzle)) {
        cluesRemaining--;
      } else {
        puzzle[idx] = backup;
      }
    }
  }

  const analysis = isLogicallySolvable(puzzle);

  return {
    puzzle,
    solution: fullSolution,
    clues: cluesRemaining,
    difficulty,
    isDeductivelySolvable: analysis.solvable,
    techniqueLevel: analysis.maxTechniqueUsed
  };
}

/**
 * Backward compatibility alias for candidate puzzle generator
 */
function generateCandidatePuzzle(difficulty = 'medium') {
  return generatePuzzle(difficulty, false);
}

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

// Universal export: works in Web Workers (self), main browser (window), and Node.js (module.exports)
const apiExports = {
  solveCount,
  solveBoard,
  generateFullBoard,
  generateCandidatePuzzle,
  generatePuzzle,
  isLogicallySolvable,
  findConflicts,
  DIFFICULTY_CONFIG
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiExports;
}

const rootScope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
rootScope.SudokuAlgo = apiExports;

