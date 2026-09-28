/**
 * Sudoku Background Puzzle Generator Worker
 * Precomputes 100% deductively solvable puzzles off the main UI thread.
 * Guarantees zero UI frame drops and instant puzzle delivery.
 */

'use strict';

// Load the logic engine into worker scope
importScripts('algo.js');

// Precomputed cache of validated, guess-free puzzles per difficulty
const puzzleCache = {
  easy: [],
  medium: [],
  hard: [],
  expert: []
};

const MAX_CACHE_SIZE = 2;
let replenishmentTimer = null;

/**
 * Generate a single validated puzzle
 */
function generateOne(difficulty) {
  try {
    return SudokuAlgo.generatePuzzle(difficulty, true);
  } catch (err) {
    console.error('Worker error generating puzzle:', err);
    return null;
  }
}

/**
 * Fill cache incrementally (one puzzle at a time) to keep the message loop responsive.
 */
function scheduleReplenish(priorityDiff = null, delay = 0) {
  if (replenishmentTimer !== null) return;

  replenishmentTimer = setTimeout(() => {
    replenishmentTimer = null;

    const diffs = priorityDiff
      ? [priorityDiff, ...['medium', 'easy', 'hard', 'expert'].filter(d => d !== priorityDiff)]
      : ['medium', 'easy', 'hard', 'expert'];

    for (const diff of diffs) {
      if (puzzleCache[diff].length < MAX_CACHE_SIZE) {
        const item = generateOne(diff);
        if (item) {
          puzzleCache[diff].push(item);
        }
        // Yield to allow any incoming messages to be processed, then continue
        scheduleReplenish(diff, 30);
        return;
      }
    }
  }, delay);
}

/**
 * Worker message dispatcher
 */
self.onmessage = function (e) {
  const data = e.data || {};
  const { type, difficulty = 'medium', requestId } = data;

  if (type === 'GET_PUZZLE') {
    const queue = puzzleCache[difficulty] || [];
    let puzzle = null;

    if (queue.length > 0) {
      // Instant cache hit (<1ms)
      puzzle = queue.shift();
    } else {
      // Cache miss: generate on demand
      puzzle = generateOne(difficulty);
    }

    self.postMessage({
      type: 'PUZZLE_READY',
      requestId,
      difficulty,
      puzzle
    });

    // Replenish cache incrementally
    scheduleReplenish(difficulty, 10);
  } else if (type === 'PREFETCH') {
    scheduleReplenish(difficulty, 0);
  }
};

// Initial background population with cooperative scheduling
scheduleReplenish('medium', 50);
