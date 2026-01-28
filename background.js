// Background service worker for Netflix 4K Enabler

// Log when extension is loaded
console.log('Netflix 4K Enabler: Background service worker loaded');

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Netflix 4K Enabler installed:', details.reason);

  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    maxBitrate: 16000, // kbps - 4K HDR target
    forceHEVC: true,
    forceVP9: true,
    spoofHDCP: true
  });
});

// Optional: Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(null, (settings) => {
      sendResponse(settings);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'log') {
    console.log('Netflix 4K:', message.data);
  }
});
