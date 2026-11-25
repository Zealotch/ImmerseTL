// content/content.js - Entry point & bootstrap for ImmerseTL content scripts

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  console.log("[ImmerseTL] Multi-module Content Script initialized.");

  function cleanupPage() {
    // 1. Disconnect observers & reset observing flags
    if (ITL.captionSource && typeof ITL.captionSource.cleanup === 'function') {
      ITL.captionSource.cleanup();
    }

    // 2. Discard pending cue stabilizer timers & state without emitting stale cues
    if (ITL.cueStabilizer && typeof ITL.cueStabilizer.cleanup === 'function') {
      ITL.cueStabilizer.cleanup();
    }

    // 3. Clear translation debounce & queue
    if (ITL.translationTrigger && typeof ITL.translationTrigger.cancelPendingTranslation === 'function') {
      ITL.translationTrigger.cancelPendingTranslation();
    }

    // 4. Clear subtitle overlay DOM & fade-out timeouts
    if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
      ITL.overlay.clear();
    }

    // 5. Clear history transcript
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

  // Fullscreen Management for Free-Floating Overlays
  document.addEventListener('fullscreenchange', () => {
    // Only reparent if free-floating mode is explicitly enabled
    const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
    if (!isFree) return; // If locked to player, no need to move out to body

    const overlay = document.getElementById('yt-smart-translate-overlay');
    const history = document.getElementById('yt-smart-translate-history');
    
    if (document.fullscreenElement) {
      if (overlay) document.fullscreenElement.appendChild(overlay);
      if (history) document.fullscreenElement.appendChild(history);
    } else {
      if (overlay) document.body.appendChild(overlay);
      if (history) document.body.appendChild(history);
    }
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Prevent triggering if typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.altKey && e.code === 'KeyS') {
      e.preventDefault();
      if (ITL.settings) {
        ITL.settings.isSubtitleOverlayEnabled = !ITL.settings.isSubtitleOverlayEnabled;
        if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
          ITL.overlay.updateVisibility();
        }
        try { chrome.storage.local.set({ isSubtitleOverlayEnabled: ITL.settings.isSubtitleOverlayEnabled }); } catch(err) {}
      }
    } else if (e.altKey && e.code === 'KeyH') {
      e.preventDefault();
      if (ITL.settings) {
        ITL.settings.showHistory = !ITL.settings.showHistory;
        if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
          ITL.history.ensureOverlay();
          if (ITL.history.overlay) {
            ITL.history.overlay.style.display = ITL.settings.showHistory ? 'flex' : 'none';
          }
        }
        try { chrome.storage.local.set({ showHistory: ITL.settings.showHistory }); } catch(err) {}
      }
    } else if (e.altKey && e.code === 'KeyR') {
      e.preventDefault();
      if (ITL.settings) {
        ITL.settings.dragX = 0;
        ITL.settings.dragY = 0;
        ITL.settings.historyDragX = 0;
        ITL.settings.historyDragY = 0;
        const overlay = document.getElementById('yt-smart-translate-overlay');
        const history = document.getElementById('yt-smart-translate-history');
        if (overlay) {
          overlay.style.setProperty('--drag-x', '0px');
          overlay.style.setProperty('--drag-y', '0px');
        }
        if (history) {
          history.style.setProperty('--drag-x', '0px');
          history.style.setProperty('--drag-y', '0px');
        }
        try {
          chrome.storage.local.set({
            dragX: 0, dragY: 0, historyDragX: 0, historyDragY: 0
          });
        } catch(err) {}
      }
    }
  });

  // Start periodic check loop & initial bootstrap (skip auto-timers when required in unit tests)
  if (typeof module === 'undefined') {
    if (ITL.captionSource && typeof ITL.captionSource.startObserverLoop === 'function') {
      ITL.captionSource.startObserverLoop();
    }

    setTimeout(initPage, 1500);
  }

  ITL.cleanupPage = cleanupPage;
  ITL.initPage = initPage;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { cleanupPage, initPage };
  }
})(window.ImmerseTL);
