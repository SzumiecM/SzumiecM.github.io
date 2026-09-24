<div align="center">
  <br />
  <a href="https://szumiecm.github.io/fiszki/">
    <img src="logo.svg" alt="Fiszki Logo" width="100" height="100">
  </a>

  <h1 align="center">Fiszki — Spaced Repetition Flashcards Engine</h1>

  <p align="center">
    <strong>Zero Dependencies • Pure Vanilla JS • Spaced Repetition (SRS) • Offline-First</strong>
  </p>

  <p align="center">
    <a href="https://szumiecm.github.io/fiszki/">View Live App</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=bug&title=[BUG]%20">Report Bug</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=enhancement&title=[FEATURE]%20">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/status-live-success?style=for-the-badge" alt="Status">
    <img src="https://img.shields.io/badge/dependencies-zero-000000?style=for-the-badge" alt="Zero Dependencies">
    <img src="https://img.shields.io/badge/engine-vanilla--js-10b981?style=for-the-badge" alt="Vanilla JS">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  </p>
</div>

<br />

## ⚡ Overview

**Fiszki** is a minimalist, high-performance, offline-capable Spaced Repetition Flashcards (SRS) web application for language acquisition (English ⇄ Polish). Built strictly to native web standards—pure HTML5, CSS3 3D transforms, and vanilla JavaScript—with **zero external runtime dependencies, no CSS frameworks, and no npm build steps**.

The application implements the classic **Leitner 5-Box Spaced Repetition System**, features Web Speech API pronunciation with Google voice prioritization, supports bi-directional study (`EN ➔ PL` and `PL ➔ EN`), provides multi-level CEFR and category filtering, and includes full custom deck CSV/JSON import and backup capabilities.

---

## 🎯 Key Features

### 1. 🧠 Leitner 5-Box Spaced Repetition (SRS)
- **Active Review Queue**: Cards are scheduled based on memory strength:
  - **1: Nie znam** (Lapse): Resets to Box 1, logs lapse, resets streak, and reinserts the card +2..3 slots ahead in the current session so you encounter it again until retained.
  - **2: Średnio** (Hard): Retains current box, reinserts card towards the tail of the session.
  - **3: Znam!** (Good): Promotes the card to the next Leitner Box (up to Box 5), increments streak 🔥, and completes the card for the session.
- **Visual Leitner Progress**: 5-dot memory strength indicator on both sides of every flashcard.

### 2. 📚 Rich Vocabulary Structure (`words.json`)
Every flashcard contains:
- English term / phrase (`en`)
- Primary Polish translation (`pl`)
- **Alternative Polish translations (`otherPl`)** displayed as interactive chip tags
- CEFR level (`A1`, `A2`, `B1`, `B2`, `C1`)
- Thematic group (`work`, `cooking`, `daily`, `travel`, `tech`, `phrasals`, `idioms`, `advanced`, `health`, `nature`)
- Part of speech (`pos`)
- International Phonetic Alphabet (`ipa`) transcription
- Context sentence in English (`exEn`) and Polish translation (`exPl`)

### 3. 🔊 Native Audio Pronunciation & Voice Customization
- **Web Speech API (`window.speechSynthesis`)**: 0-latency, 100% offline audio using the device's native voice engines.
- **Google Voice Prioritization**: Automatically surfaces and prioritizes Google English and natural neural voices on Chrome, Android, macOS, and Linux.
- **Speech Speed Control**: Configurable playback rate (0.6x to 1.3x).
- **Auto-speak toggle**: Automatically pronounce the English word upon reveal.

### 4. 🔄 Bi-Directional Study
- **EN ➔ PL**: Recognition practice — see the English word, verify IPA, and flip to reveal Polish translations.
- **PL ➔ EN**: Active recall & production practice — see the Polish meaning, recall the English word, and flip to verify spelling and pronunciation.

### 5. 📱 Touch & Mobile Gestures
- **Fixed viewport layout**: `100dvh` container with zero unwanted page bouncing or accidental scrolling.
- **Tap to Flip**: Tap card body to flip between front and back.
- **Swipe Gestures**:
  - Swipe Right (>75px) ➔ Rate **Znam! (3)**
  - Swipe Left (<-75px) ➔ Rate **Nie znam (1)**
  - Dynamic 3D tilt feedback during touch drag.

### 6. ⌨️ Desktop Keyboard Shortcuts
- `Space` / `Enter` : Flip flashcard
- `1` / `ArrowLeft` : Nie znam (Lapse)
- `2` / `ArrowDown` : Średnio (Hard)
- `3` / `ArrowRight` : Znam! (Good)
- `R` : Repeat audio pronunciation
- `Escape` : Close modals

### 7. 💾 Efficient Local Storage & Data Privacy
- Zero tracking, 100% private. All study progress and custom decks persist in `localStorage`.
- Throttled / debounced I/O commits to minimize disk and CPU wakeups, maximizing mobile battery life.
- One-click JSON backup export and restore.
- Quick CSV / TSV text importer for adding personal vocabulary lists.

---

## 🚀 Running Locally

No installation or node modules required!
Open `fiszki/index.html` directly in any web browser, or serve via any static HTTP server:

```bash
# Optional static web server:
npx serve .
# Or Python (if available):
python3 -m http.server 8080
```

Navigate to `http://localhost:8080/fiszki/`.

---

## 📝 License

Distributed under the MIT License. Part of [SzumiecM.github.io](https://szumiecm.github.io/).
