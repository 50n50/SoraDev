# Sora Windows Development Port

<p align="center">
  <img src="icon.png" alt="Sora Dev Icon" width="250" height="250" style="border-radius: 8px;" />
</p>

A Windows development port of the native **Sora iOS/macOS streaming application**, built with Electron and vanilla JavaScript. Features a full UI that mirrors the native app's architecture, allowing you to develop, scan, and test Sora modules on Windows before deploying to iOS/macOS.

---

## Features

- **Hot Module Reloading**: Real-time hot-reloading when modifying your Javascript provider files.
- **Native-Like Architecture**: Implements standard `JSContext` and provider registry structures.
- **Live Playback with MPV**: Play extracted video streams directly from the app using MPV.
- **iOS Compatibility Guard**: Scans module code for unsupported iOS JSCore/QuickJS APIs on load/reload.
- **GitHub Actions Integration**: Automated release pipeline for packaging Windows, macOS, and Linux binaries.

---

## Setup & Installation

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Windows 10/11**
- **MPV Player** (Required for live stream playback) - [Download here](https://mpv.io/). Install and ensure the directory containing `mpv.exe` is added to your system **PATH**.

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/50n50/SoraDev.git
   cd SoraDev
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This will install all required packages including Electron, Electron Builder, and other dependencies.

3. **Run in development mode**
   ```bash
   npm start
   ```
   This opens the app in development mode with DevTools enabled.

### Building for Production

To create a standalone executable for your local platform:
```bash
npm run build
```

Or package the Windows build manually:
```bash
npm run pack
```
The built application will be outputted to the `dist/` folder.

---

## Available Scripts

- `npm start` - Run developer workspace.
- `npm run dev` - Run with console logging enabled.
- `npm run build` - Compile production executable.
- `npm run pack` - Package Windows build manually.

---

## Live Stream Playback (MPV)

The developer workspace supports playing extracted stream URLs directly in your system's video player:
1. Install [MPV Player](https://mpv.io/) on your PC.
2. Add the directory containing `mpv.exe` to your system's environment variable **PATH**.
3. Open a module, click an episode, and click **Play in MPV**.
4. Custom HTTP headers (such as Referer or User-Agent) returned by your module will automatically be injected into the MPV launch arguments.

---

## iOS Compatibility Guard

Bare mobile JS runtimes (JavaScriptCore/QuickJS) have strict constraints compared to desktop browser engines:
- **No DOM/Window**: Absolutely no `document`, `window`, `DOMParser`, `XMLHttpRequest`, `localStorage`, or `location`.
- **No Module Imports**: No `require()` or `import`. All code must be self-contained in a single file.
- **Timing Restrictions**: Bare JSCore has no `setTimeout` or `setInterval` by default.
- **Node Globals**: No `Buffer` or `process`.
- **Node Modules**: No `fs`, `path`, `crypto`, `http`, etc.

The Sora Dev Suite automatically performs a static analysis scan on your JS code on load/reload. If any unsupported features are detected, a warning log is generated to notify you of potential incompatibilities before you deploy to iOS.

---

## Architecture

- **Electron** - Cross-platform desktop app framework
- **JSContext** - Module execution hub (ported from Swift)
- **Module System** - Load and execute JavaScript module providers
- **UI** - Search → Detail → Episodes → Stream workflow

## How It Works

The runtime automatically detects the module type based on the functions exported:
1. **Anime/Video Modules**: Triggered if the module implements `extractEpisodes` or `extractStreamUrl`.
2. **Manga Modules**: Triggered if the module implements `extractChapters` and `extractImages`.
3. **Novel Modules**: Triggered if the module implements `extractChapters` and `extractText`.

---

## Creating Modules

Place your `.js` files in the `modules/` directory. Depending on the module type (Anime, Manga, or Novel), you must export the following async functions:

### 1. Anime / Video Modules
Expected exports: `searchResults`, `extractDetails`, `extractEpisodes`, `extractStreamUrl`.

```javascript
/**
 * Search content
 * @returns {Promise<string>} - JSON: [{title, image, href}, ...]
 */
export async function searchResults(keyword) {}

/**
 * Extract item details
 * @returns {Promise<string>} - JSON: {description, aliases, airdate}
 */
export async function extractDetails(url) {}

/**
 * Extract episodes
 * @returns {Promise<string>} - JSON: [{href, number}, ...]
 */
export async function extractEpisodes(url) {}

/**
 * Get stream URL
 * @returns {Promise<string|object>} - Direct URL string, or:
 *   - Single stream: {streamUrl, subtitle?}
 *   - Multi-server: {streams: [{title, streamUrl, headers}], subtitle?}
 */
export async function extractStreamUrl(url) {}
```

### 2. Manga Modules
Expected exports: `searchResults`, `extractDetails`, `extractChapters`, `extractImages`.

```javascript
/**
 * Search content (accepts optional page parameter)
 * @returns {Promise<array>} - [{id, title, imageURL}, ...] (can return array directly or stringified JSON)
 */
export async function searchResults(keyword, page = 0) {}

/**
 * Extract details & genres/tags
 * @returns {Promise<object>} - {description, tags: ["Action", ...]}
 */
export async function extractDetails(id) {}

/**
 * Extract chapters grouped by language code
 * @returns {Promise<object>} - Format:
 * {
 *   "en": [
 *     ["1", [{ id: "ch-1-id", title: "RYOMEN SUKUNA", chapter: 1, scanlation_group: "MangaPlus" }]]
 *   ]
 * }
 */
export async function extractChapters(url) {}

/**
 * Extract pages (image stack URLs)
 * @returns {Promise<array>} - Array of image URL strings: ["https://...", "https://...", ...]
 */
export async function extractImages(chapterId) {}
```

### 3. Novel Modules
Expected exports: `searchResults`, `extractDetails`, `extractChapters`, `extractText`.

```javascript
/**
 * Search novels
 * @returns {Promise<string>} - JSON: [{title, href, image}, ...]
 */
export async function searchResults(keyword) {}

/**
 * Extract novel details
 * @returns {Promise<string>} - JSON: [{description, aliases, airdate}]
 */
export async function extractDetails(url) {}

/**
 * Extract novel chapters in a flat array
 * @returns {Promise<string>} - JSON: [{title, href, number}, ...]
 */
export async function extractChapters(url) {}

/**
 * Extract raw chapter text (HTML format)
 * @returns {Promise<string>} - Raw HTML string to be rendered (e.g. "<p>Text...</p>")
 */
export async function extractText(url) {}
```

---

## Project Structure

```
├── main.js                 # Electron main process
├── preload.js             # IPC bridge
├── index.html             # UI
├── src/
│   ├── app.js             # UI controller
│   └── services/
│       ├── jsContext.js   # Module execution
│       ├── moduleLoader.js # Load JS modules
│       └── providers.js    # Provider registry
├── modules/               # User modules directory
│   └── example.js         # Example module
└── package.json
```

## Testing Your Module

1. Create a `.js` file in `modules/`
2. Implement the four required functions
3. Run the app: `npm start`
4. Select your module from the dropdown
5. Test search, detail, episodes, and stream

## Example Module

See `modules/example.js` for a complete working example with mock data.

## Debugging

- DevTools opens automatically (Ctrl+Shift+I)
- Check console for errors
- Module loads are logged

## Important Notes

- All functions must be **async**
- All functions (except direct URL) return **stringified JSON**
- `searchResults()` receives only `keyword` (string)
- Other functions receive `url` (string) - the href value
- Episodes' `number` must be a number, not string
- Return valid JSON or your module will error

---

## GitHub Actions Releases

This repository includes a multi-platform release workflow using GitHub Actions:
- **Trigger**: Push a version tag matching `v*` (e.g. `v1.0.0`) to trigger the compilation.
- **Platforms**: Packages Windows (`.exe`/`.zip`), macOS (`.dmg`/`.zip`), and Linux (`.AppImage`/`.tar.gz`).
- **Release**: Automatically drafts a GitHub Release containing all target compiled binaries.

```bash
git tag v1.0.0
git push origin main --tags
```

---

## License

MIT
