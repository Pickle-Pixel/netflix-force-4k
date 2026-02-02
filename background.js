// Netflix 4K - Background Service Worker
// Handles settings and stats storage for popup

console.log('[Netflix 4K] Background service worker loaded');

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Netflix 4K] Extension installed:', details.reason);

  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    maxBitrate: 16000,
    forceHEVC: true,
    forceVP9: true,
    spoofHDCP: true,
    // Stats (will be updated by content script)
    playbackActive: false,
    currentResolution: null,
    currentBitrate: null,
    currentCodec: null,
    isHDR: false,
    videoId: null,
    lastUpdated: null
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(null, (settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (message.type === 'updateStats') {
    // Update stats from content script
    chrome.storage.local.set({
      playbackActive: message.stats.playbackActive,
      currentResolution: message.stats.currentResolution,
      currentBitrate: message.stats.currentBitrate,
      currentCodec: message.stats.currentCodec,
      isHDR: message.stats.isHDR,
      videoId: message.stats.videoId,
      lastUpdated: Date.now()
    });
    return false;
  }

  if (message.type === 'log') {
    console.log('[Netflix 4K]', message.data);
  }
});

// Clear stats when tab is closed or navigates away from Netflix
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.set({
    playbackActive: false,
    currentResolution: null,
    lastUpdated: null
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.includes('netflix.com')) {
    chrome.storage.local.set({
      playbackActive: false,
      currentResolution: null,
      lastUpdated: null
    });
  }
});
