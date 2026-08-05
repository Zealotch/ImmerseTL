// content/translator.js - Translation proxy fetcher, cache, and text highlighting

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  const translationCache = new Map();
  let translationDebounceTimer = null;
  let currentTranslationRequestText = "";

  async function fetchTranslation(text, targetLang) {
    if (!text.trim()) return null;
    const cacheKey = `${targetLang}:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { action: 'fetchTranslation', text: text, targetLang: targetLang },
          (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              console.error("[ImmerseTL] Proxy API Translation Error:", chrome.runtime.lastError || response?.error);
              resolve(null);
              return;
            }

            const result = { translation: response.translation, romaji: response.romaji, sourceLang: response.sourceLang };
            
            if (translationCache.size > 150) {
              const firstKey = translationCache.keys().next().value;
              translationCache.delete(firstKey);
            }
            translationCache.set(cacheKey, result);
            resolve(result);
          }
        );
      } catch (e) {
        console.warn("[ImmerseTL] Extension context invalidated or message failed. Please refresh the page.", e);
        resolve(null);
      }
    });
  }

  function highlightSafeText(text) {
    if (!text) return "";
    let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safe = safe.replace(/(\[.*?\]|\(.*?\))/g, '<span class="yt-highlight-bracket">$1</span>');
    safe = safe.replace(/\b(haha+|wkwk+|hehe+|lol|lmao|omg)\b/gi, '<span class="yt-highlight-word">$&</span>');
    safe = safe.replace(/(♪|♥|❤|⭐|✨)/g, '<span class="yt-highlight-word">$1</span>');
    return safe;
  }

  function clearDebounce() {
    if (translationDebounceTimer) {
      clearTimeout(translationDebounceTimer);
      translationDebounceTimer = null;
    }
    currentTranslationRequestText = "";
  }

  ITL.translator = {
    fetchTranslation: fetchTranslation,
    highlightSafeText: highlightSafeText,
    clearDebounce: clearDebounce,
    get debounceTimer() { return translationDebounceTimer; },
    set debounceTimer(t) { translationDebounceTimer = t; },
    get currentRequestText() { return currentTranslationRequestText; },
    set currentRequestText(t) { currentTranslationRequestText = t; }
  };
})(window.ImmerseTL);
