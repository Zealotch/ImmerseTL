// content/cue-stabilizer.js - Coalesces incremental caption updates into stable cues

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  const NATURAL_PAUSE_MS = 700;
  const MAX_BUILD_WAIT_MS = 1200;

  let currentCueId = 0;
  let currentVersion = 0;
  let currentText = "";
  let lastEmittedVersion = 0;
  
  let naturalPauseTimer = null;
  let maxBuildTimer = null;
  let hasFinalized = true;
  let lastCueTime = 0;

  function process(rawText) {
    if (!rawText || !rawText.trim()) return;

    let isNewCue = true;
    const now = Date.now();
    if (!hasFinalized && ITL.captionProcessor && typeof ITL.captionProcessor.isNewDialogueCue === 'function') {
      isNewCue = ITL.captionProcessor.isNewDialogueCue(currentText, rawText, lastCueTime, now);
    }

    // 1. Pass raw text to overlay for immediate display logic (native/cached)
    // bypassSchedule = true ensures it doesn't trigger translation fetch yet
    if (ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
      ITL.overlay.updateCustomSubtitle(rawText, false, isNewCue, true);
    }

    if (isNewCue) {
      finalize(); // Finalize any pending old cue
      
      currentCueId++;
      currentVersion = 1;
      currentText = rawText;
      lastEmittedVersion = 0;
      hasFinalized = false;
      lastCueTime = now;
      
      startTimers();
    } else {
      if (rawText !== currentText) {
        currentText = rawText;
        currentVersion++;
        resetNaturalPauseTimer();
      }
    }
  }

  function startTimers() {
    resetNaturalPauseTimer();
    
    if (maxBuildTimer) clearTimeout(maxBuildTimer);
    maxBuildTimer = setTimeout(() => {
      if (!hasFinalized) {
        emit("FORCE_EMIT");
        startTimers(); // Reset max build for remainder of the same cue
      }
    }, MAX_BUILD_WAIT_MS);
  }

  function resetNaturalPauseTimer() {
    if (naturalPauseTimer) clearTimeout(naturalPauseTimer);
    naturalPauseTimer = setTimeout(() => {
      if (!hasFinalized) {
        emit("STABLE");
      }
    }, NATURAL_PAUSE_MS);
  }

  function emit(reason) {
    if (lastEmittedVersion === currentVersion) return;
    lastEmittedVersion = currentVersion;
    
    // We delegate the actual translation invocation to overlay's existing method
    // but with bypassSchedule = false, so it triggers translation-trigger.js.
    // The reason is passed just conceptually for architecture, but updateCustomSubtitle
    // just treats it as a text update that needs fetching.
    if (ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
      // Force it to not animate again since the cue already animated on entry,
      // but forceRerender = true ensures overlay schedules the translation without being blocked by unchanged check
      ITL.overlay.updateCustomSubtitle(currentText, true, false, false);
    }
  }

  function finalize() {
    if (hasFinalized) return;
    
    if (lastEmittedVersion !== currentVersion) {
      emit("FINAL");
    }
    
    hasFinalized = true;
    clearTimers();
  }

  function clearTimers() {
    if (naturalPauseTimer) {
      clearTimeout(naturalPauseTimer);
      naturalPauseTimer = null;
    }
    if (maxBuildTimer) {
      clearTimeout(maxBuildTimer);
      maxBuildTimer = null;
    }
  }

  function cleanup() {
    clearTimers();
    currentCueId = 0;
    currentVersion = 0;
    currentText = "";
    lastEmittedVersion = 0;
    hasFinalized = true;
    lastCueTime = 0;
  }

  function retranslateCurrentCue() {
    if (!currentText) return;
    if (lastEmittedVersion === 0) return; // Not stabilized/emitted yet. It will use the new targetLang when it naturally emits.
    
    // Force overlay to re-process the current text with the newly updated targetLang,
    // bypassing the unchanged check, but preventing a new entrance animation.
    if (ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
      ITL.overlay.updateCustomSubtitle(currentText, true, false, false);
    }
  }

  ITL.cueStabilizer = {
    process,
    finalize,
    cleanup,
    retranslateCurrentCue,
    get currentCueId() { return currentCueId; },
    get currentVersion() { return currentVersion; },
    get currentText() { return currentText; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
      process, finalize, cleanup, retranslateCurrentCue,
      get currentState() { return { currentCueId, currentVersion, currentText, lastEmittedVersion, hasFinalized }; }
    };
  }
})(window.ImmerseTL);
