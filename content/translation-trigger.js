// content/translation-trigger.js - Coordinates debounce and scheduling of translations

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let debounceTimer = null;
  let currentRequestText = "";

  function cancelPendingTranslation() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    currentRequestText = "";
  }

  function scheduleTranslation(params) {
    const { text, targetLang, delay = 400, onResult, onError } = params;
    
    cancelPendingTranslation();
    
    if (!text || !text.trim()) return;

    currentRequestText = text;
    
    debounceTimer = setTimeout(async () => {
      // Check if the request text has changed during the debounce window
      if (text !== currentRequestText) {
        return;
      }
      
      try {
        let transData = null;
        if (ITL.translator && typeof ITL.translator.fetchTranslation === 'function') {
          transData = await ITL.translator.fetchTranslation(text, targetLang);
        }
        
        // Check if the request text changed while we were waiting for the network
        if (text !== currentRequestText) {
           return;
        }

        if (!transData) {
           if (onError) onError();
           return;
        }

        if (onResult) onResult(transData);
      } catch (err) {
        if (text === currentRequestText && onError) {
          onError(err);
        }
      }
    }, delay);
  }

  ITL.translationTrigger = {
    scheduleTranslation: scheduleTranslation,
    cancelPendingTranslation: cancelPendingTranslation,
    get currentRequestText() { return currentRequestText; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { scheduleTranslation, cancelPendingTranslation };
  }
})(window.ImmerseTL);
