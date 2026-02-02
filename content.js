// Netflix 4K - Content Script
// Handles script injection and message relay
(function() {
  'use strict';

  // Inject the main spoofing script
  const injectScript = () => {
    if (document.getElementById('netflix-4k-inject')) return;

    const script = document.createElement('script');
    script.id = 'netflix-4k-inject';
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  };

  // Inject immediately
  injectScript();

  // ============================================
  // MESSAGE RELAY: inject.js -> background.js
  // ============================================

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    // Relay stats from inject.js to background
    if (event.data?.type === 'NETFLIX_4K_STATS') {
      chrome.runtime.sendMessage({
        type: 'updateStats',
        stats: event.data.stats
      }).catch(() => {
        // Extension context may be invalidated, ignore
      });
    }
  });

  // ============================================
  // SPA NAVIGATION HANDLING
  // ============================================

  let lastUrl = location.href;
  let lastVideoId = null;
  let isInitialLoad = true;

  setTimeout(() => { isInitialLoad = false; }, 2000);

  const getVideoId = () => {
    const match = location.pathname.match(/\/watch\/(\d+)/);
    return match ? match[1] : null;
  };

  const signalReinit = (reason) => {
    window.postMessage({ type: 'NETFLIX_4K_REINIT', reason }, '*');
  };

  const checkNavigation = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const videoId = getVideoId();
      const isWatch = location.pathname.startsWith('/watch');

      if (isWatch && videoId && videoId !== lastVideoId) {
        // New video via SPA navigation - force refresh for DRM renegotiation
        if (!isInitialLoad) {
          console.log('[Netflix 4K] New video via SPA, refreshing...');
          location.reload();
          return;
        }
        lastVideoId = videoId;
      } else if (!isWatch) {
        lastVideoId = null;
      }
    }
  };

  // Poll for URL changes
  setInterval(checkNavigation, 200);

  // Listen for popstate
  window.addEventListener('popstate', () => {
    setTimeout(checkNavigation, 50);
  });

  // Intercept history methods
  const wrapHistory = (method) => {
    const original = history[method];
    history[method] = function(...args) {
      const result = original.apply(this, args);
      setTimeout(checkNavigation, 50);
      return result;
    };
  };

  wrapHistory('pushState');
  wrapHistory('replaceState');

  // Watch for player container
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList && (
            node.classList.contains('watch-video') ||
            node.classList.contains('VideoContainer') ||
            node.classList.contains('nf-player-container') ||
            node.id === 'appMountPoint'
          )) {
            signalReinit('player container');
          }
          if (node.tagName === 'VIDEO' || node.querySelector?.('video')) {
            signalReinit('video element');
          }
        }
      }
    }
  });

  const startObserver = () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      setTimeout(startObserver, 50);
    }
  };
  startObserver();

  // Initial video ID
  lastVideoId = getVideoId();

  console.log('[Netflix 4K] Content script loaded');
})();
