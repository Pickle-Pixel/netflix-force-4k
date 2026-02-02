// Netflix 4K - Main injection script
// Runs in Netflix page context to spoof capabilities
(function() {
  'use strict';

  // ============================================
  // BROWSER DETECTION & LOGGING
  // ============================================

  const realUserAgent = navigator.userAgent;
  const isEdge = realUserAgent.includes('Edg/');
  const isChrome = realUserAgent.includes('Chrome') && !isEdge;
  const isFirefox = realUserAgent.includes('Firefox');
  const browserName = isEdge ? 'Edge' : isFirefox ? 'Firefox' : isChrome ? 'Chrome' : 'Unknown';

  // Extract Edge version
  let edgeVersion = 0;
  if (isEdge) {
    const match = realUserAgent.match(/Edg\/(\d+)/);
    edgeVersion = match ? parseInt(match[1]) : 0;
  }

  // Edge 118+ uses PlayReady 3.0 (hardware DRM), others use Widevine L3 (software)
  const drm = isEdge ? 'PlayReady 3.0' : 'Widevine L3';
  const can4K = isEdge && edgeVersion >= 118;

  console.log('[Netflix 4K] ==========================================');
  console.log('[Netflix 4K] Netflix 4K Optimizer - Initializing...');
  console.log('[Netflix 4K] ==========================================');
  console.log(`[Netflix 4K] Browser: ${browserName}${edgeVersion ? ' ' + edgeVersion : ''}`);
  console.log(`[Netflix 4K] DRM: ${drm} (${can4K ? 'Hardware - 4K capable' : 'Software - 1080p max'})`);

  if (isEdge && edgeVersion < 118) {
    console.log(`[Netflix 4K] NOTE: You need Edge 118+ for 4K. You have Edge ${edgeVersion}.`);
    console.log('[Netflix 4K] Update Edge at edge://settings/help');
  } else if (!isEdge) {
    console.log('[Netflix 4K] NOTE: Your browser uses Widevine L3 (software DRM).');
    console.log('[Netflix 4K] Netflix requires PlayReady 3.0 for 4K, which only Edge has on Windows.');
    console.log('[Netflix 4K] We\'ll still maximize quality within your browser\'s limits.');
  } else {
    console.log('[Netflix 4K] TIP: Make sure you have the HEVC extension from Microsoft Store.');
  }

  // ============================================
  // PLAYBACK STATS TRACKING
  // ============================================

  let currentStats = {
    playbackActive: false,
    currentResolution: null,
    currentBitrate: null,
    currentCodec: null,
    isHDR: false,
    videoId: null
  };

  // Send stats to content script
  const sendStats = () => {
    window.postMessage({
      type: 'NETFLIX_4K_STATS',
      stats: { ...currentStats, timestamp: Date.now() }
    }, '*');
  };

  // Update stats periodically
  setInterval(sendStats, 2000);

  // ============================================
  // 1. SPOOF SCREEN RESOLUTION
  // ============================================

  const realWidth = window.screen.width;
  const realHeight = window.screen.height;

  Object.defineProperty(window.screen, 'width', { get: () => 3840 });
  Object.defineProperty(window.screen, 'height', { get: () => 2160 });
  Object.defineProperty(window.screen, 'availWidth', { get: () => 3840 });
  Object.defineProperty(window.screen, 'availHeight', { get: () => 2160 });
  Object.defineProperty(window.screen, 'colorDepth', { get: () => 48 });
  Object.defineProperty(window.screen, 'pixelDepth', { get: () => 48 });
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 });

  console.log(`[Netflix 4K] Screen: ${realWidth}x${realHeight} -> spoofed to 3840x2160`);

  // ============================================
  // 2. SPOOF MEDIA CAPABILITIES API
  // ============================================

  if (navigator.mediaCapabilities) {
    const originalDecodingInfo = navigator.mediaCapabilities.decodingInfo.bind(navigator.mediaCapabilities);

    navigator.mediaCapabilities.decodingInfo = async function(config) {
      const dominated4KCodecs = [
        'hev1', 'hvc1', 'vp09', 'vp9', 'av01', 'av1', 'dvhe', 'dvh1'
      ];

      let dominated = false;
      if (config.video) {
        const codec = config.video.contentType || '';
        dominated = dominated4KCodecs.some(c => codec.toLowerCase().includes(c));
      }

      try {
        const result = await originalDecodingInfo(config);
        if (dominated || (config.video && config.video.width >= 3840)) {
          return {
            supported: true,
            smooth: true,
            powerEfficient: true,
            keySystemAccess: result.keySystemAccess
          };
        }
        return result;
      } catch (e) {
        if (dominated) {
          return { supported: true, smooth: true, powerEfficient: true };
        }
        throw e;
      }
    };
  }

  // ============================================
  // 3. SPOOF MEDIA SOURCE EXTENSIONS
  // ============================================

  if (window.MediaSource) {
    const originalIsTypeSupported = MediaSource.isTypeSupported.bind(MediaSource);

    MediaSource.isTypeSupported = function(mimeType) {
      const dominated4KTypes = [
        'hev1', 'hvc1', 'dvh1', 'dvhe', 'vp09', 'vp9', 'av01'
      ];

      if (dominated4KTypes.some(t => mimeType.toLowerCase().includes(t))) {
        return true;
      }

      return originalIsTypeSupported(mimeType);
    };
  }

  // ============================================
  // 4. SPOOF EME / DRM CAPABILITIES
  // ============================================

  if (navigator.requestMediaKeySystemAccess) {
    const originalRequestMediaKeySystemAccess = navigator.requestMediaKeySystemAccess.bind(navigator);

    navigator.requestMediaKeySystemAccess = async function(keySystem, configs) {
      console.log('[Netflix 4K] DRM negotiation for:', keySystem);

      // Try with enhanced robustness first
      const enhancedConfigs = configs.map(config => {
        const enhanced = JSON.parse(JSON.stringify(config));
        if (enhanced.videoCapabilities) {
          enhanced.videoCapabilities = enhanced.videoCapabilities.map(vc => ({
            ...vc,
            robustness: 'HW_SECURE_ALL'
          }));
        }
        return enhanced;
      });

      try {
        const result = await originalRequestMediaKeySystemAccess(keySystem, enhancedConfigs);
        console.log('[Netflix 4K] DRM: HW_SECURE_ALL accepted');
        return result;
      } catch (e) {
        // Try SW_SECURE_DECODE (common fallback)
        const swConfigs = configs.map(config => {
          const sw = JSON.parse(JSON.stringify(config));
          if (sw.videoCapabilities) {
            sw.videoCapabilities = sw.videoCapabilities.map(vc => ({
              ...vc,
              robustness: 'SW_SECURE_DECODE'
            }));
          }
          return sw;
        });
        try {
          const result = await originalRequestMediaKeySystemAccess(keySystem, swConfigs);
          console.log('[Netflix 4K] DRM: SW_SECURE_DECODE accepted');
          return result;
        } catch (e2) {
          console.log('[Netflix 4K] DRM: Using original config');
          return originalRequestMediaKeySystemAccess(keySystem, configs);
        }
      }
    };
  }

  // ============================================
  // 5. SPOOF HDCP DETECTION
  // ============================================

  Object.defineProperty(navigator, 'hdcpPolicyCheck', {
    value: () => Promise.resolve({ hdcp: 'hdcp-2.2' }),
    writable: false
  });

  console.log('[Netflix 4K] HDCP: Spoofed to 2.2');

  // ============================================
  // 6. OVERRIDE BROWSER/PLATFORM DETECTION
  // ============================================

  Object.defineProperty(navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    configurable: true
  });

  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
    configurable: true
  });

  Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32',
    configurable: true
  });

  // ============================================
  // 7. WEBGL RENDERER SPOOFING
  // ============================================

  const getParameterProxyHandler = {
    apply: function(target, thisArg, argumentsList) {
      const param = argumentsList[0];
      if (param === 37445) return 'NVIDIA Corporation';
      if (param === 37446) return 'NVIDIA GeForce RTX 4090/PCIe/SSE2';
      return Reflect.apply(target, thisArg, argumentsList);
    }
  };

  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);

  if (window.WebGL2RenderingContext) {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
  }

  // ============================================
  // 8. NETFLIX 4K PROFILES
  // ============================================

  const NETFLIX_4K_PROFILES = [
    // HEVC 4K HDR
    'hevc-main10-L51-dash-cenc-prk',
    'hevc-main10-L51-dash-cenc',
    'hevc-main10-L50-dash-cenc-prk',
    'hevc-main10-L50-dash-cenc',
    'hevc-main-L51-dash-cenc',
    'hevc-main-L50-dash-cenc',
    // VP9 4K HDR
    'vp9-profile2-L51-dash-cenc-prk',
    'vp9-profile2-L50-dash-cenc-prk',
    'vp9-profile0-L51-dash-cenc',
    'vp9-profile0-L50-dash-cenc',
    // AV1 4K
    'av1-main-L51-dash-cbcs-prk',
    'av1-main-L50-dash-cbcs-prk',
    // High bitrate H264 fallback
    'playready-h264hpl40-dash',
    'playready-h264hpl41-dash'
  ];

  // ============================================
  // 9. INTERCEPT OBJECT PROPERTY DEFINITIONS
  // ============================================

  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (typeof prop === 'string') {
      const lowerProp = prop.toLowerCase();

      if (lowerProp.includes('maxbitrate') || lowerProp === 'maxbitrate') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Override: maxBitrate', descriptor.value, '-> 16000');
          descriptor.value = 16000;
        }
      }

      if (lowerProp.includes('maxheight') || lowerProp === 'maxvideoheight') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Override: maxHeight', descriptor.value, '-> 2160');
          descriptor.value = 2160;
        }
      }

      if (lowerProp.includes('maxwidth') || lowerProp === 'maxvideowidth') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Override: maxWidth', descriptor.value, '-> 3840');
          descriptor.value = 3840;
        }
      }

      if (lowerProp === 'hdcp' || lowerProp === 'hdcpversion') {
        if (descriptor.value !== undefined) {
          descriptor.value = '2.2';
        }
      }
    }

    return originalDefineProperty.call(this, obj, prop, descriptor);
  };

  // ============================================
  // 10. CONFIG OBJECT PROXY
  // ============================================

  const createConfigProxy = (target, name) => {
    return new Proxy(target, {
      set(obj, prop, value) {
        const lowerProp = String(prop).toLowerCase();

        if (lowerProp === 'maxbitrate' && typeof value === 'number' && value < 16000) {
          value = 16000;
        }
        if (lowerProp === 'maxvideobitrate' && typeof value === 'number' && value < 16000) {
          value = 16000;
        }
        if (lowerProp.includes('height') && typeof value === 'number' && value < 2160 && value > 720) {
          value = 2160;
        }
        if (lowerProp.includes('width') && typeof value === 'number' && value < 3840 && value > 1280) {
          value = 3840;
        }

        obj[prop] = value;
        return true;
      },
      get(obj, prop) {
        const value = obj[prop];
        const lowerProp = String(prop).toLowerCase();

        if (lowerProp === 'maxbitrate') return 16000;
        if (lowerProp === 'maxvideobitrate') return 16000;
        if (lowerProp === 'maxvideoheight') return 2160;
        if (lowerProp === 'maxvideowidth') return 3840;
        if (lowerProp === 'hdcpversion' || lowerProp === 'hdcp') return '2.2';

        return value;
      }
    });
  };

  // ============================================
  // 11. CADMIUM PLAYER HOOK
  // ============================================

  let cadmiumHooked = false;

  const hookCadmium = () => {
    if (cadmiumHooked) return;

    if (window.netflix) {
      if (window.netflix.player) {
        cadmiumHooked = true;
        console.log('[Netflix 4K] Hooked Netflix Cadmium player');

        const player = window.netflix.player;

        ['create', 'configure', 'getConfiguration', 'getConfig'].forEach(method => {
          if (typeof player[method] === 'function') {
            const original = player[method].bind(player);
            player[method] = function(...args) {
              const result = original(...args);

              if (result && typeof result === 'object') {
                if (result.maxBitrate !== undefined) result.maxBitrate = 16000;
                if (result.maxVideoBitrate !== undefined) result.maxVideoBitrate = 16000;
                if (result.maxVideoHeight !== undefined) result.maxVideoHeight = 2160;
                if (result.maxVideoWidth !== undefined) result.maxVideoWidth = 3840;
                if (result.profiles !== undefined && Array.isArray(result.profiles)) {
                  result.profiles = [...NETFLIX_4K_PROFILES, ...result.profiles];
                }
              }

              return result;
            };
          }
        });
      }
    }
  };

  // ============================================
  // 12. INTERCEPT JSON PARSE
  // ============================================

  const originalJSONParse = JSON.parse;
  JSON.parse = function(text, reviver) {
    const result = originalJSONParse.call(this, text, reviver);

    if (result && typeof result === 'object') {
      // Modify resolution caps if found
      if (result.maxResolution) {
        result.maxResolution = { width: 3840, height: 2160 };
      }
    }

    return result;
  };

  // ============================================
  // 13. VIDEO ELEMENT MONITORING
  // ============================================

  const videoObserver = new MutationObserver((mutations) => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video._netflix4k_monitored) {
        video._netflix4k_monitored = true;

        const updateStats = () => {
          if (video.videoWidth > 0) {
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            const is4K = video.videoWidth >= 3840 || video.videoHeight >= 2160;

            if (currentStats.currentResolution !== resolution) {
              currentStats.currentResolution = resolution;
              currentStats.playbackActive = true;

              const status = is4K ? '4K ACTIVE' : `${resolution}`;
              console.log(`[Netflix 4K] Resolution: ${resolution} ${is4K ? '(4K!)' : ''}`);
            }
          }
        };

        video.addEventListener('loadedmetadata', updateStats);
        video.addEventListener('playing', () => {
          currentStats.playbackActive = true;
          updateStats();
        });
        video.addEventListener('pause', () => {
          currentStats.playbackActive = false;
          sendStats();
        });

        // Check periodically while playing
        setInterval(() => {
          if (!video.paused && video.videoWidth > 0) {
            updateStats();
          }
        }, 3000);
      }
    });
  });

  // ============================================
  // 14. SPA NAVIGATION HANDLING
  // ============================================

  let lastWatchId = null;
  let lastHref = location.href;

  const getWatchId = () => {
    const match = location.pathname.match(/\/watch\/(\d+)/);
    return match ? match[1] : null;
  };

  const forceRehook = (reason) => {
    console.log(`[Netflix 4K] Rehook: ${reason}`);
    cadmiumHooked = false;

    const delays = [100, 300, 500, 1000, 2000];
    delays.forEach(delay => {
      setTimeout(() => {
        if (!cadmiumHooked) hookCadmium();
      }, delay);
    });
  };

  // URL change detection
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      const newWatchId = getWatchId();

      if (location.pathname.startsWith('/watch')) {
        if (newWatchId !== lastWatchId) {
          lastWatchId = newWatchId;
          currentStats.videoId = newWatchId;
          forceRehook('new video');
        }
      } else {
        lastWatchId = null;
        currentStats.playbackActive = false;
      }
    }
  }, 200);

  // Video element detection
  const videoCreationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
          forceRehook('video element added');
          return;
        }
      }
    }
  });

  // History API interception
  const wrapHistoryMethod = (method) => {
    const original = history[method];
    history[method] = function(...args) {
      const result = original.apply(this, args);
      setTimeout(() => {
        const watchId = getWatchId();
        if (watchId && watchId !== lastWatchId) {
          lastWatchId = watchId;
          currentStats.videoId = watchId;
          forceRehook(`history.${method}`);
        }
      }, 50);
      return result;
    };
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  window.addEventListener('popstate', () => {
    setTimeout(() => {
      const watchId = getWatchId();
      if (watchId && watchId !== lastWatchId) {
        lastWatchId = watchId;
        forceRehook('popstate');
      }
    }, 50);
  });

  // Listen for reinit signal
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'NETFLIX_4K_REINIT') {
      forceRehook('content script signal');
    }
  });

  // ============================================
  // 15. INITIALIZATION
  // ============================================

  // Start observing
  if (document.body) {
    videoObserver.observe(document.body, { childList: true, subtree: true });
    videoCreationObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      videoObserver.observe(document.body, { childList: true, subtree: true });
      videoCreationObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Periodic Cadmium hook attempts
  const hookInterval = setInterval(() => {
    hookCadmium();
    if (cadmiumHooked) clearInterval(hookInterval);
  }, 500);

  setTimeout(() => clearInterval(hookInterval), 60000);

  // Initial video ID
  const initialWatchId = getWatchId();
  if (initialWatchId) {
    lastWatchId = initialWatchId;
    currentStats.videoId = initialWatchId;
  }

  // Final status
  console.log('[Netflix 4K] ==========================================');
  console.log('[Netflix 4K] Initialization complete!');
  console.log('[Netflix 4K] ==========================================');
  console.log('[Netflix 4K] Active spoofs:');
  console.log('[Netflix 4K]   - Screen: 3840x2160');
  console.log('[Netflix 4K]   - HDCP: 2.2');
  console.log('[Netflix 4K]   - User-Agent: Edge');
  console.log('[Netflix 4K]   - Codecs: HEVC/VP9/AV1');
  console.log('[Netflix 4K]   - Max bitrate: 16 Mbps');
  console.log('[Netflix 4K]');
  console.log('[Netflix 4K] Press Ctrl+Shift+Alt+D on Netflix to see stream stats');
  if (!can4K) {
    console.log('[Netflix 4K]');
    if (isEdge && edgeVersion < 118) {
      console.log(`[Netflix 4K] Your Edge version (${edgeVersion}) is too old for 4K.`);
      console.log('[Netflix 4K] Update to Edge 118+ at edge://settings/help');
    } else {
      console.log(`[Netflix 4K] ${browserName} uses ${drm} - limited to 1080p.`);
      console.log('[Netflix 4K] For 4K, use Microsoft Edge 118+ on Windows.');
    }
  }
  console.log('[Netflix 4K] ==========================================');

})();
