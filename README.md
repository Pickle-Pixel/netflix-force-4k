# Netflix 4K Enabler

A Chrome/Edge extension that forces Netflix to serve 4K Ultra HD content on devices and browsers that Netflix artificially restricts.

## The Problem

Netflix charges for a Premium plan that includes 4K streaming, but then restricts 4K playback to specific browsers and devices:
- Only Edge on Windows, Safari on Mac, or the Netflix app
- Requires HDCP 2.2 compliant display chain
- Requires hardware DRM (Widevine L1)

If you're paying for 4K but using Chrome, Firefox, or a setup Netflix doesn't "approve," you're stuck at 1080p or lower. This extension fixes that.

## What This Extension Does

- **Spoofs screen resolution** to 3840x2160 (4K)
- **Spoofs User-Agent** to appear as Microsoft Edge
- **Overrides Media Capabilities API** to report HEVC/VP9/AV1 codec support
- **Spoofs HDCP 2.2** compliance checks
- **Hooks Netflix's Cadmium player** to inject 4K profile requests
- **Intercepts DRM negotiation** to request higher security levels
- **Auto-refreshes on navigation** to ensure 4K works every time

## Requirements

- **Netflix Premium subscription** (4K requires Premium tier)
- **4K display** (or content will be upscaled)
- **Good internet** (25+ Mbps recommended for 4K streaming)
- **Chromium-based browser** (Chrome, Edge, Brave, etc.)

> **Best Results**: Use Microsoft Edge on Windows. Edge has Widevine L1 hardware DRM support, which combined with this extension gives the most reliable 4K playback.

## Installation

### Step 1: Download the Extension

```bash
git clone https://github.com/Pickle-Pixel/netflix-force-4k.git
```

Or download as ZIP and extract.

### Step 2: Load in Browser

1. Open your browser and go to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer mode** (toggle in top right corner)

3. Click **"Load unpacked"**

4. Select the `netflix-force-4k` folder

5. The extension should now appear in your extensions list

### Step 3: Verify Installation

1. Go to [Netflix](https://www.netflix.com)
2. Open DevTools (`F12` or `Ctrl+Shift+I`)
3. Check the Console tab - you should see:
   ```
   [Netflix 4K] Initializing...
   [Netflix 4K] All spoofs initialized successfully!
   [Netflix 4K] Screen: 3840x2160, HDCP: 2.2, Profiles: 4K HEVC/VP9/AV1
   ```

## Usage

1. **Browse Netflix normally** - Find something to watch

2. **Click on a title** - The extension will auto-refresh the page to ensure 4K

3. **Check stream quality** - Press `Ctrl+Shift+Alt+D` while watching to show Netflix's hidden stats overlay:
   - Resolution: `3840x2160`
   - Playing bitrate: `15000+ kbps`

4. **Console logging** - The extension logs resolution changes:
   ```
   [Netflix 4K] Video loaded: 3840x2160
   [Netflix 4K] Current resolution: 3840x2160
   ```

## How It Works

Netflix negotiates DRM capabilities when a page loads. The extension intercepts these checks:

| Check | What We Spoof |
|-------|---------------|
| User-Agent | Microsoft Edge |
| Screen resolution | 3840x2160 |
| `mediaCapabilities.decodingInfo()` | HEVC/VP9/AV1 supported |
| `MediaSource.isTypeSupported()` | 4K codecs supported |
| `requestMediaKeySystemAccess()` | HW_SECURE_ALL robustness |
| `hdcpPolicyCheck` | HDCP 2.2 compliant |
| Cadmium player config | maxBitrate: 16000, maxHeight: 2160 |

### Why Auto-Refresh?

Netflix is a Single Page Application (SPA). When you click on a movie, it doesn't do a full page reload - it just updates the URL. The problem: DRM capabilities are negotiated once when the page first loads.

If you navigate to a video via SPA, Netflix uses the DRM level from the original page load (before our spoofs were in place for that context). The only reliable fix is forcing a page refresh when you click on a new video, ensuring our spoofs are active during DRM negotiation.

You'll notice a quick refresh when clicking on a title - that's intentional and ensures 4K works.

## 4K Content to Test With

These titles have 4K:
- **Our Planet** (nature doc - great for testing, obvious quality difference)
- **Stranger Things**
- **Wednesday**
- **The Crown**
- **Breaking Bad**
- **The Witcher**
- Any title with "Ultra HD 4K" badge

## Limitations

### Hardware DRM (Widevine L1)
Netflix requires Widevine L1 for 4K. This is enforced at the browser level:

| Browser | Widevine Level | Max Quality |
|---------|----------------|-------------|
| Edge (Windows) | L1 (hardware) | 4K ✓ |
| Chrome | L3 (software) | 720p-1080p |
| Firefox | L3 (software) | 720p-1080p |
| Brave | L3 (software) | 720p-1080p |

The extension spoofs the JavaScript checks, but can't change the browser's actual Widevine level. **Edge on Windows is recommended** because it has L1 support.

### Netflix Updates
Netflix could update their detection methods at any time.

## Troubleshooting

### Not getting 4K?

1. **Check your plan** - Need Netflix Premium
2. **Check the content** - Not all titles have 4K (look for "Ultra HD 4K" badge)
3. **Use Edge** - Best Widevine support on Windows
4. **Check bandwidth** - Need 25+ Mbps ([test here](https://fast.com))
5. **Check stats overlay** - Press `Ctrl+Shift+Alt+D` to see actual resolution

### Extension not loading?

1. Enable Developer mode in extensions page
2. Check for errors in the extensions page
3. Disable other Netflix extensions that might conflict

## Files

```
netflix-force-4k/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Service worker
├── content.js         # Injection & navigation handling
├── inject.js          # Main spoofing logic
├── rules.json         # Header modification rules
└── README.md
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `storage`, `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`
- **Host Permissions**: `*://*.netflix.com/*`

Key techniques:
- Content script injection at `document_start`
- Page context script for API overrides
- `Object.defineProperty` interception for config values
- `MutationObserver` for video element detection
- History API interception + auto-refresh for SPA navigation

## Disclaimer

This extension is for accessing content you're already paying for. It doesn't bypass payments, enable piracy, or download content. It removes artificial device restrictions on a paid service.

## License

MIT - do whatever you want with it.
