// Main injection script - runs in Netflix page context
(function() {
  'use strict';

  console.log('[Netflix 4K] Initializing...');

  // ============================================
  // 1. SPOOF SCREEN RESOLUTION
  // ============================================
  Object.defineProperty(window.screen, 'width', { get: () => 3840 });
  Object.defineProperty(window.screen, 'height', { get: () => 2160 });
  Object.defineProperty(window.screen, 'availWidth', { get: () => 3840 });
  Object.defineProperty(window.screen, 'availHeight', { get: () => 2160 });
  Object.defineProperty(window.screen, 'colorDepth', { get: () => 48 });
  Object.defineProperty(window.screen, 'pixelDepth', { get: () => 48 });
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 });

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
        console.log('[Netflix 4K] Forcing MSE support for:', mimeType);
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
      console.log('[Netflix 4K] MediaKeySystemAccess requested for:', keySystem);

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
        return await originalRequestMediaKeySystemAccess(keySystem, enhancedConfigs);
      } catch (e) {
        console.log('[Netflix 4K] HW_SECURE_ALL failed, trying SW_SECURE_DECODE');
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
          return await originalRequestMediaKeySystemAccess(keySystem, swConfigs);
        } catch (e2) {
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
  // 8. HOOK NETFLIX INTERNAL OBJECTS
  // ============================================

  // Netflix 4K profiles we want to request
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

  // Deep hook into Netflix's react/redux state
  const hookNetflixState = () => {
    // Try to find Netflix's player app
    const reactRoot = document.getElementById('appMountPoint');
    if (!reactRoot) return false;

    // Look for React fiber
    const key = Object.keys(reactRoot).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    if (!key) return false;

    console.log('[Netflix 4K] Found React root, attempting deep hook...');
    return true;
  };

  // ============================================
  // 9. INTERCEPT OBJECT PROPERTY DEFINITIONS
  // ============================================

  // Intercept any capability/config objects Netflix creates
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    // Intercept resolution/bitrate related properties
    if (typeof prop === 'string') {
      const lowerProp = prop.toLowerCase();

      if (lowerProp.includes('maxbitrate') || lowerProp === 'maxbitrate') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Overriding maxBitrate:', descriptor.value, '-> 16000');
          descriptor.value = 16000;
        }
      }

      if (lowerProp.includes('maxheight') || lowerProp === 'maxvideoheight') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Overriding maxHeight:', descriptor.value, '-> 2160');
          descriptor.value = 2160;
        }
      }

      if (lowerProp.includes('maxwidth') || lowerProp === 'maxvideowidth') {
        if (descriptor.value !== undefined && typeof descriptor.value === 'number') {
          console.log('[Netflix 4K] Overriding maxWidth:', descriptor.value, '-> 3840');
          descriptor.value = 3840;
        }
      }

      if (lowerProp === 'hdcp' || lowerProp === 'hdcpversion') {
        if (descriptor.value !== undefined) {
          console.log('[Netflix 4K] Overriding HDCP version:', descriptor.value, '-> 2.2');
          descriptor.value = '2.2';
        }
      }
    }

    return originalDefineProperty.call(this, obj, prop, descriptor);
  };

  // ============================================
  // 10. INTERCEPT OBJECT CREATION
  // ============================================

  // Monitor object assignments for player config
  const configPatterns = ['profiles', 'maxBitrate', 'videoQuality', 'hdcp'];

  // Proxy handler for config objects
  const createConfigProxy = (target, name) => {
    return new Proxy(target, {
      set(obj, prop, value) {
        const lowerProp = String(prop).toLowerCase();

        if (lowerProp === 'maxbitrate' && typeof value === 'number' && value < 16000) {
          console.log(`[Netflix 4K] ${name}.maxBitrate: ${value} -> 16000`);
          value = 16000;
        }
        if (lowerProp === 'maxvideobitrate' && typeof value === 'number' && value < 16000) {
          console.log(`[Netflix 4K] ${name}.maxVideoBitrate: ${value} -> 16000`);
          value = 16000;
        }
        if (lowerProp.includes('height') && typeof value === 'number' && value < 2160 && value > 720) {
          console.log(`[Netflix 4K] ${name}.${prop}: ${value} -> 2160`);
          value = 2160;
        }
        if (lowerProp.includes('width') && typeof value === 'number' && value < 3840 && value > 1280) {
          console.log(`[Netflix 4K] ${name}.${prop}: ${value} -> 3840`);
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
  // 11. CADMIUM PLAYER DEEP HOOK
  // ============================================

  let cadmiumHooked = false;

  const hookCadmium = () => {
    if (cadmiumHooked) return;

    // Netflix stores player in window.netflix
    if (window.netflix) {
      console.log('[Netflix 4K] Netflix object found');

      // Hook into the player factory
      if (window.netflix.player) {
        cadmiumHooked = true;
        console.log('[Netflix 4K] Cadmium player factory found');

        const player = window.netflix.player;

        // Try to override create/configure methods
        ['create', 'configure', 'getConfiguration', 'getConfig'].forEach(method => {
          if (typeof player[method] === 'function') {
            const original = player[method].bind(player);
            player[method] = function(...args) {
              console.log(`[Netflix 4K] player.${method} called`);
              const result = original(...args);

              // If result is an object, try to modify it
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

      // Hook into appContext if available
      if (window.netflix.appContext) {
        const ctx = window.netflix.appContext;

        // Try to find player state/config
        ['getState', 'getPlayerConfig', 'getVideoConfig'].forEach(method => {
          if (ctx[method] && typeof ctx[method] === 'function') {
            const original = ctx[method].bind(ctx);
            ctx[method] = function(...args) {
              const result = original(...args);
              console.log(`[Netflix 4K] appContext.${method} called`);
              return result;
            };
          }
        });
      }
    }
  };

  // ============================================
  // 12. INTERCEPT JSON PARSE FOR RESPONSES
  // ============================================

  const originalJSONParse = JSON.parse;
  JSON.parse = function(text, reviver) {
    const result = originalJSONParse.call(this, text, reviver);

    // Check if this looks like a Netflix manifest response
    if (result && typeof result === 'object') {
      // Look for video tracks info
      if (result.video_tracks || result.videoTracks) {
        console.log('[Netflix 4K] Video tracks found in JSON response');
        console.log('[Netflix 4K] Available tracks:', JSON.stringify(result.video_tracks || result.videoTracks, null, 2).substring(0, 500));
      }

      // Look for playback config
      if (result.playbackContextId || result.movieId) {
        console.log('[Netflix 4K] Playback context found');
      }

      // Modify resolution caps if found
      if (result.maxResolution) {
        console.log('[Netflix 4K] Overriding maxResolution:', result.maxResolution);
        result.maxResolution = { width: 3840, height: 2160 };
      }
    }

    return result;
  };

  // ============================================
  // 13. PERIODIC CHECKS
  // ============================================

  const checkInterval = setInterval(() => {
    hookCadmium();
    hookNetflixState();

    if (cadmiumHooked) {
      clearInterval(checkInterval);
    }
  }, 500);

  setTimeout(() => clearInterval(checkInterval), 60000);

  // ============================================
  // 14. MONITOR VIDEO ELEMENT
  // ============================================

  // Watch for video elements and log their resolution
  const videoObserver = new MutationObserver((mutations) => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video._netflix4k_monitored) {
        video._netflix4k_monitored = true;

        video.addEventListener('loadedmetadata', () => {
          console.log(`[Netflix 4K] Video loaded: ${video.videoWidth}x${video.videoHeight}`);
        });

        video.addEventListener('playing', () => {
          console.log(`[Netflix 4K] Playing at: ${video.videoWidth}x${video.videoHeight}`);
        });

        // Check resolution periodically while playing
        setInterval(() => {
          if (!video.paused && video.videoWidth > 0) {
            // Only log if resolution changes
            if (video._lastRes !== `${video.videoWidth}x${video.videoHeight}`) {
              video._lastRes = `${video.videoWidth}x${video.videoHeight}`;
              console.log(`[Netflix 4K] Current resolution: ${video._lastRes}`);
            }
          }
        }, 5000);
      }
    });
  });

  videoObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // ============================================
  // 15. HANDLE SPA NAVIGATION
  // ============================================

  // Listen for reinit signal from content script
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'NETFLIX_4K_REINIT') {
      console.log('[Netflix 4K] Reinitializing for new page...');

      // Reset Cadmium hook state so we re-hook on new player
      cadmiumHooked = false;

      // Restart the hook interval
      const reinitInterval = setInterval(() => {
        hookCadmium();
        hookNetflixState();
        if (cadmiumHooked) {
          clearInterval(reinitInterval);
        }
      }, 200);

      setTimeout(() => clearInterval(reinitInterval), 30000);
    }
  });

  // Also detect /watch URL ourselves as backup
  let lastPath = location.pathname;
  const pathObserver = setInterval(() => {
    if (location.pathname !== lastPath) {
      const wasWatch = lastPath.startsWith('/watch');
      const isWatch = location.pathname.startsWith('/watch');
      lastPath = location.pathname;

      if (isWatch && !wasWatch) {
        console.log('[Netflix 4K] Navigated to watch page');
        cadmiumHooked = false;

        // Give Netflix time to create player, then hook
        setTimeout(() => {
          hookCadmium();
          hookNetflixState();
        }, 1000);
      }
    }
  }, 300);

  console.log('[Netflix 4K] All spoofs initialized successfully!');
  console.log('[Netflix 4K] Screen: 3840x2160, HDCP: 2.2, Profiles: 4K HEVC/VP9/AV1');
  console.log('[Netflix 4K] Press Ctrl+Shift+Alt+D on Netflix to see stream stats');

})();
