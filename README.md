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
   git clone https://github.com/yourusername/SoraDev.git
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

### 1. **Search**
- Enter a query in the search box
- Selected module's `searchResults(keyword)` function executes
- Results displayed as an image grid

### 2. **Detail**
- Click on a search result
- Module's `extractDetails(url)` fetches title, description, airdate
- Displayed in detail view

### 3. **Episodes**
- Click "View Episodes" button
- Module's `extractEpisodes(url)` returns episode list
- Episodes displayed as numbered cards

### 4. **Stream**
- Click an episode
- Module's `extractStreamUrl(url)` fetches streaming URL(s)
- URL shown and ready to play

## Creating Modules

Place `.js` files in the `modules/` directory. Each module must export four async functions:

### Function Signatures

```javascript
/**
 * Search for content by keyword
 * @param {string} keyword - User search query
 * @returns {Promise<string>} - JSON stringified array: [{title, image, href}, ...]
 */
export async function searchResults(keyword) {
  // Fetch and return search results
  return JSON.stringify([
    { title: "Result 1", image: "url", href: "identifier" }
  ]);
}

/**
 * Get details about an item
 * @param {string} url - The href from search results
 * @returns {Promise<string>} - JSON stringified object: {description, aliases, airdate}
 */
export async function extractDetails(url) {
  // Fetch and return details
  return JSON.stringify({
    description: "Long description...",
    aliases: "Other info",
    airdate: "2024"
  });
}

/**
 * Get episodes for a show
 * @param {string} url - The href from search results
 * @returns {Promise<string>} - JSON stringified array: [{href, number}, ...]
 */
export async function extractEpisodes(url) {
  // Fetch and return episodes
  return JSON.stringify([
    { href: "episode-1-url", number: 1 },
    { href: "episode-2-url", number: 2 }
  ]);
}

/**
 * Get stream URL(s) for an episode
 * @param {string} url - The episode href from extractEpisodes
 * @returns {Promise<string>} - JSON stringified object or direct URL
 * 
 * Return formats:
 * - Direct URL: "https://example.com/stream.m3u8"
 * - Single stream: {streamUrl: "...", subtitle?: "..."}
 * - Multi-server: {streams: [{title, streamUrl, headers}], subtitle?: "..."}
 */
export async function extractStreamUrl(url) {
  // Fetch and return stream
  return JSON.stringify({
    streams: [
      { title: "Server 1", streamUrl: "https://...", headers: {} }
    ]
  });
}
```

## Module Response Formats

### searchResults() Output
```json
[
  {
    "title": "Show Title",
    "image": "https://...",
    "href": "unique-identifier"
  }
]
```

### extractDetails() Output
```json
{
  "description": "Description text",
  "aliases": "Alternative info",
  "airdate": "2024-01-01"
}
```

### extractEpisodes() Output
```json
[
  {
    "href": "episode-url",
    "number": 1
  }
]
```

### extractStreamUrl() Output (Multi-server - Recommended)
```json
{
  "streams": [
    {
      "title": "Server Name",
      "streamUrl": "https://stream.url",
      "headers": {
        "User-Agent": "Mozilla/5.0"
      }
    }
  ],
  "subtitle": "https://subtitles.url"
}
```

Or single stream with subtitle:
```json
{
  "streamUrl": "https://stream.url",
  "subtitle": "https://subtitles.url"
}
```

Or direct string URL:
```
"https://stream.url"
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
