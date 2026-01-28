// Content script - injects the main spoofing script into Netflix pages
(function() {
  'use strict';

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

  // Re-inject on SPA navigation (Netflix uses History API)
  let lastUrl = location.href;

  const checkNavigation = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      // If navigating to a watch page, signal reinit
      if (location.pathname.startsWith('/watch')) {
        console.log('Netflix 4K Enabler: Watch page detected, signaling reinit');
        window.postMessage({ type: 'NETFLIX_4K_REINIT' }, '*');
      }
    }
  };

  // Monitor for navigation
  setInterval(checkNavigation, 500);

  // Also listen for popstate
  window.addEventListener('popstate', checkNavigation);

  // Intercept history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(checkNavigation, 100);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(checkNavigation, 100);
  };

  console.log('Netflix 4K Enabler: Content script loaded');
})();
