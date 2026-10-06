<div align="center">
  <br />
  <a href="https://szumiecm.github.io/hoops/">
    <img src="logo.svg" alt="Hoops Logo" width="100" height="100">
  </a>

  <h1 align="center">Hoops — 2D Arcade Basketball</h1>

  <p align="center">
    <strong>Zero Dependencies • Predictive Slingshot • Battery-Efficient • Offline-First</strong>
  </p>

  <p align="center">
    <a href="https://szumiecm.github.io/hoops/">Play Live Game</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=bug&title=[BUG]%20">Report Bug</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=enhancement&title=[FEATURE]%20">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/status-live-success?style=for-the-badge" alt="Status">
    <img src="https://img.shields.io/badge/dependencies-zero-000000?style=for-the-badge" alt="Zero Dependencies">
    <img src="https://img.shields.io/badge/engine-HTML5%20Canvas%202D-ea580c?style=for-the-badge" alt="HTML5 Canvas">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  </p>
</div>

<br />

## ⚡ Overview

**Hoops** is a minimalist, battery-efficient, offline-capable 2D arcade basketball game inspired by classic 2010s hoop-flick titles. It runs 100% client-side in the browser with **zero external libraries, zero build steps, and zero network calls**.

Featuring predictive trajectory arcs, sub-stepped 2D collision kinematics, dynamic net springs, procedural ball skins, and an inline Web Audio synthesizer.

---

## 🎯 Key Systems & Features

### 1. 🏀 Pure Streak Progression (Zero Point Noise)
- **Streak is King**: Gameplay is focused purely on consecutive baskets streak and beating your personal best record.
- **Progressive Difficulty Tiers**:
  - **Rookie (Streak 0–2)**: Full 36-point predictive guide arc.
  - **Heating Up (Streak 3–5)**: 22-point guide past the apex.
  - **Sharp Shooter (Streak 6–9)**: 14-point guide showing launch angle and peak.
  - **On Fire (Streak 10–14)**: 8-point short launch indicator.
  - **Legendary (Streak 15+)**: 4-point minimal guide for true arcade mastery.
- **Dynamic Atmosphere**: Theme palette smoothly transitions per streak tier.

### 2. 🪐 True Newtonian Parabolic Flight (1:1 Trajectory)
- **100% Deterministic Trajectory**: Zero artificial horizontal drag ensures the in-flight ball tracks the predictive dotted arc **1:1 with sub-pixel precision**.
- **Authentic Arc & Apex Deceleration**: Calibrated gravity ($g = 1380\text{ px/s}^2$) and vertical lift provide natural deceleration at the flight apex and acceleration on descent.

### 3. 🎯 Clean Shots & Fluid Net Dynamics
- **Clean Shot Recognition**: Widen rim ($2.75\times$ ball radius) enables satisfying clean swishes without clipping the rim.
- **Zero-Snag Net Glide**: Unilateral rim collision prevents top rim corners from snagging descending balls, while dynamic spring netting funnels clean shots fluidly without stutter.
- **Visual & Audio Accents**: Triggers glowing "CLEAN SHOT! ✦" announcements and harmonic bell chimes.

### 4. 🎨 5 Procedural Ball Skins (Zero Bitmap Assets)
Rendered purely via Canvas 2D routines:
1. **Classic**: Traditional orange leather with black seams and curved arcs.
2. **Watermelon**: Emerald green sphere with dark wavy longitudinal stripes and seeds.
3. **Beach Ball**: Alternating primary-color wedges radiating from a center cap.
4. **Fire Ball**: Molten yellow-red core emitting trailing flame embers at high velocities.
5. **8-Ball**: Glossy deep black pool ball with a crisp white circle and bold number `8`.

### 5. 🔊 Procedural Web Audio API Synthesizer
- **Bounce**: Short damped sine wave frequency chirp (120 Hz $\to$ 55 Hz).
- **Rim Clank**: Bandpass-filtered metallic square wave burst (520 Hz).
- **Swish**: Filtered procedural white noise puff through a swept bandpass filter.
- **Chime**: Ascending harmonic dual-tone chime modulated by streak tier.
- Persistent mute toggle.

### 6. 🏆 Achievements Engine
- **First Blood**: Score your first basket $\to$ Classic Skin.
- **Nothing But Net**: Score 3 Clean Shots in a single session $\to$ Watermelon Skin.
- **Heating Up**: Reach a 5-basket streak $\to$ Beach Ball Skin.
- **On Fire**: Reach a 10-basket streak $\to$ Fire Ball Skin.
- **Unstoppable Legend**: Reach a 20-basket streak $\to$ Crown Badge.
- **Veteran Shooter**: Reach 50 lifetime baskets $\to$ 8-Ball Skin.
- **Off the Glass**: Score off the backboard $\to$ Trickshot Badge.

### 7. 🔋 Battery & Resource Preservation
- **CPU Suspension**: Halts animation loop and suspends audio context when tab is hidden (`visibilitychange`).
- **Storage Throttling**: Memory-buffered stats flushed only on achievement unlock or page exit (`pagehide`/`beforeunload`).
- **Object Pooling**: Pre-allocated particle pool for zero GC allocation during simulation.

---

## 🛠️ Tech Stack & Architecture

- **Markup**: Semantic HTML5 with strict zero-network Content Security Policy (`connect-src 'none'`).
- **Styles**: Pure Vanilla CSS3 with glassmorphic HUD and custom property color transitions.
- **Engine**: Pure Vanilla ES6+ Canvas 2D (`game.js`).
- **Icons & Graphics**: Handcrafted inline SVG vectors.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.

<br />

<div align="center">
  <p>Crafted with ❤️ by <a href="https://github.com/SzumiecM">SzumiecM</a></p>
</div>
