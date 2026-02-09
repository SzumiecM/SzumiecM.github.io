<div align="center">
  <br />
  <a href="https://szumiecm.github.io/flux/">
    <img src="logo.svg" alt="Flux Radio Logo" width="120" height="120">
  </a>

  <h1 align="center">Flux Radio</h1>

  <p align="center">
    <strong>Zero Dependency • Privacy Focused • Statically Hosted</strong>
  </p>

  <p align="center">
    <a href="https://szumiecm.github.io/flux/">View Live Demo</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=bug&title=[BUG]%20">Report Bug</a>
    ·
    <a href="https://github.com/SzumiecM/SzumiecM.github.io/issues/new?labels=enhancement&title=[FEATURE]%20">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/status-live-success?style=for-the-badge" alt="Status">
    <img src="https://img.shields.io/badge/dependencies-zero-000000?style=for-the-badge" alt="Zero Dependencies">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  </p>
</div>

<br />

## 🚀 About The Project

**Flux Radio** is a lightweight, high-performance web radio player built with a strict focus on privacy and security. Unlike modern web apps bloated with frameworks and trackers, Flux is built on **Vanilla JavaScript** and hosted statically.

It leverages the **Radio-Browser API** to access over 30,000 stations worldwide while employing advanced browser security features to keep the user safe.

### Key Features

* **🛡️ Anon Mode:** Toggles `crossOrigin="anonymous"` on audio requests to strip cookies and credentials, working alongside the global `no-referrer` policy.
* **⚡ Zero Dependencies:** No React, No Vue, No jQuery. Just pure, fast DOM manipulation.
* **🔒 Security First:** Enforced via strict Content Security Policy (CSP) and HTTPS-only toggles.
* **💾 Local & Private:** Favorites and settings are stored in `localStorage`. No database, no cloud sync, no tracking.

---

## 🛠️ Tech Stack

* **Core:** HTML5, CSS3 (Variables), ES6+ JavaScript.
* **API:** [Radio-Browser.info](https://www.radio-browser.info/) (Community driven radio directory).
* **Hosting:** GitHub Pages (Static).

---

## ⚙️ Configuration & Usage

The application is designed to be usable immediately. However, several "Power User" toggles are available in the top bar:

| Toggle | Icon | Description |
| :--- | :---: | :--- |
| **Icons** | 🖼️ | **Station Logos.** Toggles loading of external station images. |
| **HTTPS** | 🔒 | **Secure Mode.** Filters search results to only show stations broadcasting over SSL. Prevents "Mixed Content" warnings. |
| **Anon** | 🛡️ | **Anonymous Mode.** Strips credentials from the audio request stream. |
| **Favs** | ❤️ | **Favorites.** Toggles between search results and your locally saved stations. |
| **Info** | ℹ️ | **Tech Details.** Expands station cards to show Bitrate, Codec, and Stream URLs. |

---

## 🔒 Security Architecture

Flux Radio implements a defense-in-depth strategy:

1. **Content Security Policy (CSP):**
    Restricts script execution to `self` only. No external analytics or tracking scripts are permitted.

    ```http
    Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://*.api.radio-browser.info; img-src 'self' data: https:; media-src *;
    ```

2. **Referrer Trimming:**
    The meta tag `<meta name="referrer" content="no-referrer">` ensures that when you connect to a radio stream, the station administrator cannot see that the request originated from this application.

3. **DOM Isolation:**
    The audio element is dynamically managed to ensure strict control over playback events and cross-origin policies.

---

## 🔧 Installation (Local)

To run this project locally, you need a web server (opening the file directly will fail due to CORS policies).

1. **Clone the repo**

    ```sh
    git clone [https://github.com/SzumiecM/SzumiecM.github.io.git](https://github.com/SzumiecM/SzumiecM.github.io.git)
    ```

2. **Navigate to the folder**

    ```sh
    cd SzumiecM.github.io/flux
    ```

3. **Serve the directory**
    Using Python 3:

    ```sh
    python3 -m http.server 8000
    ```

    Then open `http://localhost:8000` in your browser.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>built with ❤️ by <a href="https://github.com/SzumiecM">SzumiecM</a></p>
</div>
