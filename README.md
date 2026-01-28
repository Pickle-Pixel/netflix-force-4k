# Netflix 4K Enabler

A Chrome/Edge extension that forces Netflix to serve 4K Ultra HD content on devices and browsers that Netflix artificially restricts.

## The Problem

Netflix charges for a Premium plan that includes 4K streaming, but then restricts 4K playback to specific browsers and devices:
- Only Edge on Windows, Safari on Mac, or the Netflix app
- Requires HDCP 2.2 compliant display chain
- Requires hardware DRM (Widevine L1)

If you're paying for 4K but using Chrome, Firefox, or a setup Netflix doesn't "approve," you're stuck at 1080p or lower. This extension helps bypass those arbitrary restrictions.

## What This Extension Does

- **Spoofs screen resolution** to 3840x2160 (4K)
- **Spoofs User-Agent** to appear as Microsoft Edge (which Netflix allows 4K on)
- **Overrides Media Capabilities API** to report HEVC/VP9/AV1 codec support
- **Spoofs HDCP 2.2** compliance checks
- **Hooks Netflix's Cadmium player** to inject 4K profile requests
- **Intercepts capability checks** and forces 4K-compatible responses
- **Handles SPA navigation** so it works when clicking between titles without refresh

## Requirements

- **Netflix Premium subscription** (4K requires Premium tier)
- **4K display** (or you'll get upscaled content)
- **Good internet** (25+ Mbps recommended for 4K streaming)
- **Chromium-based browser** (Chrome, Edge, Brave, etc.)

> **Best Results**: Use Microsoft Edge on Windows. Edge has proper Widevine L1 hardware DRM support, which combined with this extension's spoofs gives the best chance of 4K playback.

## Installation

### Step 1: Download the Extension

```bash
git clone https://github.com/YOUR_USERNAME/netflix-force-4k.git
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

1. **Find 4K content** - Not all Netflix titles have 4K. Look for the "Ultra HD 4K" badge on the title's detail page. Netflix Originals almost always have 4K.

2. **Play the title** - The extension automatically activates on Netflix pages.

3. **Check the stream quality** - Press `Ctrl+Shift+Alt+D` while watching to show Netflix's hidden stats overlay. Look for:
   - Resolution: `3840x2160`
   - Playing bitrate: `15000+ kbps` (high bitrate = 4K)

4. **Monitor in console** - The extension logs the actual video resolution:
   ```
   [Netflix 4K] Video loaded: 3840x2160
   [Netflix 4K] Current resolution: 3840x2160
   ```

## 4K Content to Test With

These titles are guaranteed to have 4K:
- **Our Planet** (nature doc - great for testing, obvious quality difference)
- **Stranger Things**
- **Wednesday**
- **The Crown**
- **Breaking Bad**
- **The Witcher**
- Any title with "Netflix Original" or "Ultra HD 4K" badge

## How It Works

Netflix uses multiple layers of checks to determine if your device supports 4K:

### 1. Browser Detection
Netflix checks your User-Agent to see if you're using an "approved" browser. We spoof this to appear as Edge.

### 2. Screen Resolution
Netflix checks `window.screen` dimensions. We override these to report 3840x2160.

### 3. Media Capabilities API
Netflix uses `navigator.mediaCapabilities.decodingInfo()` to check codec support. We intercept this and report that HEVC, VP9, and AV1 are all supported and smooth.

### 4. Media Source Extensions
Netflix checks `MediaSource.isTypeSupported()` for codec support. We force `true` for 4K codecs.

### 5. DRM (EME) Capabilities
Netflix requests specific Widevine/PlayReady robustness levels via `navigator.requestMediaKeySystemAccess()`. We try to request the highest levels (HW_SECURE_ALL) with fallbacks.

### 6. HDCP Detection
Netflix checks for HDCP 2.2 compliance. We spoof the `hdcpPolicyCheck` API.

### 7. Cadmium Player Config
Netflix's internal player (Cadmium) has configuration that sets max resolution and bitrate. We hook into this and override the limits.

## Limitations

### Hardware DRM (Widevine L1)
The main limitation is hardware-level DRM. Netflix requires Widevine L1 for 4K, which is enforced at the browser's CDM (Content Decryption Module) level - not something JavaScript can spoof.

- **Chrome**: Widevine L3 (software) = typically max 720p-1080p
- **Edge**: Widevine L1 (hardware) = can do 4K ✓
- **Firefox**: Widevine L3 = limited
- **Brave**: Widevine L3 = limited

**Recommendation**: Use Edge for best results.

### HDCP Hardware Check
True HDCP 2.2 compliance requires hardware support in your GPU, cable, and monitor. We can spoof the JavaScript API check, but not the actual HDCP handshake that happens at the hardware level.

### Netflix Updates
Netflix may update their detection methods, which could require updates to this extension.

## Troubleshooting

### Still not getting 4K?

1. **Verify your plan**: You need Netflix Premium (not Standard or Basic with ads)

2. **Verify the content**: Not all titles have 4K - look for the "Ultra HD 4K" badge

3. **Try Edge browser**: Edge has the best Widevine support on Windows

4. **Check your bandwidth**: Netflix downgrades quality on slow connections. Test at [fast.com](https://fast.com)

5. **Clear Netflix cookies**: Sometimes Netflix caches device capabilities
   - Go to Netflix → Settings → Sign out of all devices
   - Clear browser cookies for netflix.com
   - Sign back in

6. **Check the stats overlay**: Press `Ctrl+Shift+Alt+D` - if it shows a max resolution cap, that's likely a DRM limitation

### Extension not loading?

1. Make sure Developer mode is enabled
2. Check for errors in `chrome://extensions/`
3. Try disabling other Netflix-related extensions that might conflict

### Console errors?

The `notifications.netflix.com` error is normal (Netflix notification service, unrelated to playback).

## Files

```
netflix-force-4k/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Service worker for settings
├── content.js         # Content script - handles injection & navigation
├── inject.js          # Main spoofing logic (runs in page context)
├── rules.json         # Declarative net request rules (User-Agent spoofing)
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `storage`, `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`
- **Host Permissions**: `*://*.netflix.com/*`

The extension uses:
- `declarativeNetRequest` for header modification (User-Agent)
- Content script injection at `document_start`
- Page context script injection for API overrides
- `MutationObserver` for video element monitoring
- History API interception for SPA navigation detection

## Disclaimer

This extension is for personal use to access content you're already paying for. It doesn't bypass any payment systems, doesn't enable piracy, and doesn't download or save any content. It simply removes artificial device restrictions on a service you're paying for.

## License

MIT License - do whatever you want with it.

## Contributing

Found a bug or Netflix changed something? Open an issue or PR.
