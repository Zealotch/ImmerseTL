// content/content.js - Entry point & bootstrap for ImmerseTL content scripts

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  console.log("[ImmerseTL] Multi-module Content Script initialized.");

  function cleanupPage() {
    // 1. Disconnect observers & reset observing flags
    if (ITL.captionSource && typeof ITL.captionSource.cleanup === 'function') {
      ITL.captionSource.cleanup();
    }

    // 2. Clear translation debounce & queue
    if (ITL.translator && typeof ITL.translator.clearDebounce === 'function') {
      ITL.translator.clearDebounce();
    }

    // 3. Clear subtitle overlay DOM & fade-out timeouts
    if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
      ITL.overlay.clear();
    }

    // 4. Clear history transcript
    if (ITL.history && typeof ITL.history.clear === 'function') {
      ITL.history.clear();
    }
  }

  function initPage() {
    if (ITL.overlay && typeof ITL.overlay.create === 'function') {
      ITL.overlay.create();
    }
    if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
      ITL.history.ensureOverlay();
    }
    if (ITL.captionSource && typeof ITL.captionSource.checkObserver === 'function') {
      ITL.captionSource.checkObserver();
    }
  }

  // SPA Navigation Listener
  document.addEventListener('yt-navigate-finish', () => {
    console.log("[ImmerseTL] SPA Navigation detected, cleaning up & re-initializing...");
    cleanupPage();
    setTimeout(initPage, 1200);
  });

  // Start periodic check loop & initial bootstrap
  if (ITL.captionSource && typeof ITL.captionSource.startObserverLoop === 'function') {
    ITL.captionSource.startObserverLoop();
  }

  setTimeout(initPage, 1500);

  ITL.cleanupPage = cleanupPage;
  ITL.initPage = initPage;
})(window.ImmerseTL);
