// content/translation-trigger.js - Coordinates debounce and scheduling of translations

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let debounceTimer = null;
  let currentRequestText = "";
  let currentRequestGeneration = 0;

  function cancelPendingTranslation() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    currentRequestGeneration++;
    currentRequestText = "";
  }

  function invalidateCurrentRequest() {
    currentRequestGeneration++;
  }

  function scheduleTranslation(params) {
    const { text, targetLang, delay = 400, onResult, onError } = params;
    
    cancelPendingTranslation();
    
    if (!text || !text.trim()) return;

    currentRequestText = text;
    const reqGen = currentRequestGeneration;
    
    debounceTimer = setTimeout(async () => {
      // Check if the request identity changed during the debounce window
      if (reqGen !== currentRequestGeneration) {
        return;
      }
      
      try {
        let transData = null;
        if (ITL.translator && typeof ITL.translator.fetchTranslation === 'function') {
          transData = await ITL.translator.fetchTranslation(text, targetLang);
        }
        
        // Check if the request identity changed while we were waiting for the network
        if (reqGen !== currentRequestGeneration) {
           return;
        }

        if (!transData) {
           if (onError) onError();
           return;
        }

        if (onResult) onResult(transData);
      } catch (err) {
        if (reqGen === currentRequestGeneration && onError) {
          onError(err);
        }
      }
    }, delay);
  }

  ITL.translationTrigger = {
    scheduleTranslation: scheduleTranslation,
    cancelPendingTranslation: cancelPendingTranslation,
    invalidateCurrentRequest: invalidateCurrentRequest,
    get currentRequestText() { return currentRequestText; },
    get currentRequestGeneration() { return currentRequestGeneration; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { scheduleTranslation, cancelPendingTranslation };
  }
})(window.ImmerseTL);
