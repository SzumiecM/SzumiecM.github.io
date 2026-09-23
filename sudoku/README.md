<div align="center">
  <br />
  <a href="https://szumiecm.github.io/sudoku/">
    <img src="logo.svg" alt="Sudoku Logo" width="100" height="100">
  </a>

  <h1 align="center">Sudoku — Pure Logic Engine</h1>

  <p align="center">
    <strong>Zero Dependencies • Guaranteed Solvable • Offline-First</strong>
  </p>

  <p align="center">
    <a href="https://szumiecm.github.io/sudoku/">View Live App</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=bug&title=[BUG]%20">Report Bug</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=enhancement&title=[FEATURE]%20">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/status-live-success?style=for-the-badge" alt="Status">
    <img src="https://img.shields.io/badge/dependencies-zero-000000?style=for-the-badge" alt="Zero Dependencies">
    <img src="https://img.shields.io/badge/engine-vanilla--js-6366f1?style=for-the-badge" alt="Vanilla JS">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  </p>
</div>

<br />

## ⚡ Overview

**Sudoku** is a minimalist, high-performance, offline-capable client-side Sudoku web application. It runs 100% in the browser with **zero backend and zero external dependencies**—no bundlers, no npm packages, and no CDNs.

Every puzzle is generated in real-time with a mathematical guarantee of **strictly one unique valid solution**.

---

## 🎯 Key Features

### 1. 🧩 Guaranteed Solvability & Uniqueness
- **Instant Full Grid Generation**: Starts with a canonical solved base grid and applies random Sudoku-preserving isomorphic transformations (permuting digits 1–9, shuffling rows within bands, columns within stacks, swapping bands and stacks, and optional matrix transposition) in $< 1\text{ ms}$.
- **Bitmask MRV Backtracking Solver**: Tracks row, column, and $3\times3$ box occupancies with 16-bit bitmasks and Minimum Remaining Values (MRV) candidate pruning. Halts instantly when finding a 2nd solution (`limit = 2`).
- **Rotational Symmetry Carving**: Carves cell pairs $(r, c)$ and $(8-r, 8-c)$ symmetrically, strictly preserving unique solvability (`solveCount === 1`).

### 2. 📱 Rotary Dial Mobile Gesture (Stationary Phone Style)
- Long-press and hold on any mutable cell to summon a circular rotary wheel centered directly over the touch point.
- Digits $1$ through $9$ are arranged radially around the circle with Clear/Erase in the center.
- Dragging over numbers highlights them with haptic feedback; releasing places the number directly.

### 3. ⌨️ Desktop Power Shortcuts
- **Cell Navigation**:
  - `↑ ↓ ← →` / `WASD` / `HJKL` : Step 1 cell
  - `Ctrl + ↑↓←→` : Jump to adjacent $3\times3$ block (same relative cell position)
  - `Ctrl + Shift + ↑↓←→` : Jump all the way to the edge (row 0/8 or col 0/8)
- **Input & History**:
  - `1`–`9` / Numpad : Place number or toggle pencil candidate
  - `Backspace` / `Del` / `0` : Erase cell
  - `N` : Toggle Pencil / Candidate Notes mode
  - `Ctrl + Z` : Undo
  - `Ctrl + Y` / `Ctrl + Shift + Z` : Redo

### 4. 💾 Multi-Difficulty Game Persistence
- Full game progress, player moves, pencil notes, and timer are automatically saved per difficulty (`Easy`, `Medium`, `Hard`, `Expert`) in local `localStorage`.
- Switching between difficulties preserves each game state seamlessly without losing in-progress puzzles.

---

## 🛠️ Tech Stack & Architecture

- **Structure**: Semantic HTML5 with strict zero-network Content Security Policy (`connect-src 'none'`).
- **Styling**: Pure Vanilla CSS3 with custom properties, glassmorphism, and responsive CSS Grid.
- **Engine**: Pure Vanilla ES6+ (`algo.js` for generation/solving, `app.js` for UI/controls).
- **Icons**: Handcrafted inline SVG vectors.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.

<br />

<div align="center">
  <p>Crafted with ❤️ by <a href="https://github.com/SzumiecM">SzumiecM</a></p>
</div>
