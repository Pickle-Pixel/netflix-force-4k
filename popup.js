// Netflix 4K Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Detect browser
  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) {
      // Extract Edge version
      const match = ua.match(/Edg\/(\d+)/);
      const version = match ? parseInt(match[1]) : 0;
      const can4K = version >= 118;
      return {
        name: 'Edge',
        version,
        drm: 'PlayReady 3.0',
        can4K,
        reason: can4K ? 'Hardware DRM via Windows' : `Need Edge 118+, you have ${version}`
      };
    }
    if (ua.includes('Firefox')) return {
      name: 'Firefox',
      version: 0,
      drm: 'Widevine L3',
      can4K: false,
      reason: 'No PlayReady access'
    };
    if (ua.includes('Brave')) return {
      name: 'Brave',
      version: 0,
      drm: 'Widevine L3',
      can4K: false,
      reason: 'No PlayReady access'
    };
    if (ua.includes('Chrome')) return {
      name: 'Chrome',
      version: 0,
      drm: 'Widevine L3',
      can4K: false,
      reason: 'No PlayReady access'
    };
    if (ua.includes('Safari') && !ua.includes('Chrome')) return {
      name: 'Safari',
      version: 0,
      drm: 'FairPlay',
      can4K: true,
      reason: 'macOS hardware DRM'
    };
    return {
      name: 'Unknown',
      version: 0,
      drm: 'Unknown',
      can4K: false,
      reason: 'Unknown browser'
    };
  };

  // Get display info
  const getDisplayInfo = () => {
    const realWidth = window.screen.width;
    const realHeight = window.screen.height;
    const is4K = realWidth >= 3840 || realHeight >= 2160;
    return {
      resolution: `${realWidth}x${realHeight}`,
      is4K,
      spoofed: '3840x2160'
    };
  };

  // Update UI elements
  const browser = detectBrowser();
  const display = getDisplayInfo();

  // Browser
  const browserEl = document.getElementById('browser');
  const browserText = browser.version ? `${browser.name} ${browser.version}` : browser.name;
  browserEl.textContent = browserText;
  browserEl.className = 'capability-value ' + (browser.can4K ? 'good' : 'warning');

  // DRM (updated to show PlayReady vs Widevine)
  const widevineEl = document.getElementById('widevine');
  widevineEl.textContent = browser.drm;
  widevineEl.className = 'capability-value ' + (browser.can4K ? 'good' : 'warning');

  // Display
  const displayEl = document.getElementById('display');
  displayEl.textContent = display.resolution + (display.is4K ? '' : ' (spoofed)');
  displayEl.className = 'capability-value ' + (display.is4K ? 'good' : 'warning');

  // HDCP
  document.getElementById('hdcp').className = 'capability-value good';

  // Update verdict
  const verdictCard = document.getElementById('verdictCard');
  const verdictIcon = document.getElementById('verdictIcon');
  const verdictText = document.getElementById('verdictText');

  if (browser.can4K) {
    verdictCard.className = 'verdict-card can-4k';
    verdictIcon.textContent = '✓';
    verdictIcon.style.color = '#46d369';
    verdictText.innerHTML = '<strong>Your setup supports 4K!</strong><br>' +
      browser.name + ' uses ' + browser.drm + ' (hardware DRM). ' +
      'Make sure you have the HEVC extension from Microsoft Store installed.';
  } else {
    verdictCard.className = 'verdict-card no-4k';
    verdictIcon.textContent = '!';
    verdictIcon.style.color = '#f5c518';

    if (browser.name === 'Edge' && browser.version < 118) {
      verdictText.innerHTML = '<strong>Update Edge Required</strong><br>' +
        'You need Edge 118 or later for 4K. You have version ' + browser.version + '. ' +
        'Update at <code>edge://settings/help</code>';
    } else {
      verdictText.innerHTML = '<strong>Browser limited to 1080p</strong><br>' +
        browser.name + ' uses ' + browser.drm + ' (software DRM). Netflix requires PlayReady 3.0 for 4K. ' +
        'Use Microsoft Edge 118+ on Windows for 4K.';
    }
  }

  // Check if we're on Netflix and get playback stats
  const updateStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url?.includes('netflix.com')) {
        setStatus('yellow', 'Extension Ready', 'Open Netflix to start watching');
        document.getElementById('statsCard').style.display = 'none';
        return;
      }

      const stats = await chrome.storage.local.get([
        'playbackActive',
        'currentResolution',
        'currentBitrate',
        'currentCodec',
        'isHDR',
        'lastUpdated'
      ]);

      const isRecent = stats.lastUpdated && (Date.now() - stats.lastUpdated) < 10000;

      if (stats.playbackActive && isRecent) {
        const is4K = stats.currentResolution?.includes('3840') || stats.currentResolution?.includes('2160');

        if (is4K) {
          setStatus('green', '4K Active', 'Streaming in Ultra HD');
        } else {
          setStatus('yellow', 'Playing', stats.currentResolution || 'Detecting...');
        }

        document.getElementById('statsCard').style.display = 'block';
        document.getElementById('resolution').textContent = stats.currentResolution || '--';
        document.getElementById('resolution').className = 'stat-value' + (is4K ? '' : ' warning');

        const bitrateNum = stats.currentBitrate ? (stats.currentBitrate / 1000).toFixed(1) : '--';
        document.getElementById('bitrate').textContent = bitrateNum !== '--' ? bitrateNum + ' Mbps' : '--';

        document.getElementById('codec').textContent = stats.currentCodec?.toUpperCase() || '--';
        document.getElementById('hdr').textContent = stats.isHDR ? 'Yes' : 'No';
      } else {
        setStatus('green', 'Ready on Netflix', 'Play something to see stats');
        document.getElementById('statsCard').style.display = 'none';
      }
    } catch (e) {
      console.error('Error updating status:', e);
      setStatus('gray', 'Unable to detect', 'Reload Netflix and try again');
    }
  };

  const setStatus = (color, label, detail) => {
    document.getElementById('statusIndicator').className = 'status-indicator ' + color;
    document.getElementById('statusLabel').textContent = label;
    document.getElementById('statusDetail').textContent = detail;
  };

  await updateStatus();
  setInterval(updateStatus, 2000);
});
