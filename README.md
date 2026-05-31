# Sora Windows Development Port

A Windows development port of the **Sora iOS/macOS streaming application**, built with Electron and vanilla JavaScript. Features a full UI that mirrors the native app's architecture, allowing you to develop and test Sora modules on Windows before deploying to iOS/macOS.

## Setup & Installation

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Windows 10/11**

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

To create a standalone executable:

```bash
# Build for Windows (creates .exe in dist/ folder)
npm run build
```

Or use the alternative packager:

```bash
# Alternative build method
npm run pack
```

The built application will be in the `dist/` folder.

### Available Scripts

- `npm start` - Run in development mode
- `npm run dev` - Run with logging enabled
- `npm run build` - Build production executable
- `npm run pack` - Alternative packaging method

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

## License

MIT
