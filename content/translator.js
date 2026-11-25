// content/translator.js - Translation proxy fetcher, cache, and text highlighting

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  const MAX_CACHE_SIZE = 1000;
  const translationCache = new Map();

  function getCachedTranslation(text, targetLang) {
    if (!text.trim()) return null;
    const cacheKey = `${targetLang}:${text}`;
    return translationCache.get(cacheKey) || null;
  }

  let globalRequestCount = 0;

  async function fetchTranslation(text, targetLang) {
    if (!text.trim()) return null;
    const cacheKey = `${targetLang}:${text}`;
    
    globalRequestCount++;
    const reqId = globalRequestCount;
    const timestamp = Date.now();
    
    if (translationCache.has(cacheKey)) {
      console.log(`[ImmerseTL-DEBUG] CACHE HIT - reqId: ${reqId}, textLen: ${text.length}`);
      return translationCache.get(cacheKey);
    }

    console.log(`[ImmerseTL-DEBUG] CACHE MISS - reqId: ${reqId}, textLen: ${text.length}`);
    console.log(`[ImmerseTL-DEBUG] Translation request START - reqId: ${reqId}, target: ${targetLang}, ts: ${timestamp}`);

    return new Promise((resolve) => {
      try {
        let isResolved = false;
        const fallbackTimeout = setTimeout(() => { 
          if (!isResolved) { 
            console.error(`[ImmerseTL-DEBUG] sendMessage 6000ms timeout - reqId: ${reqId}`); 
            isResolved = true; 
            resolve(null); 
          } 
        }, 6000);
        
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
          throw new Error("Extension context invalidated");
        }

        chrome.runtime.sendMessage(
          { action: 'fetchTranslation', text: text, targetLang: targetLang },
          (response) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(fallbackTimeout);
            
            const finishTs = Date.now();
            console.log(`[ImmerseTL-DEBUG] Translation request FINISH - reqId: ${reqId}, duration: ${finishTs - timestamp}ms`);
            
            if (chrome.runtime.lastError || !response || !response.success) {
              console.error(`[ImmerseTL-DEBUG] Proxy API Translation Error - reqId: ${reqId}, msg: ${chrome.runtime.lastError?.message || response?.error}`);
              resolve(null);
              return;
            }

            const result = { translation: response.translation, romaji: response.romaji, sourceLang: response.sourceLang };
            
            if (translationCache.size >= MAX_CACHE_SIZE) {
              const firstKey = translationCache.keys().next().value;
              translationCache.delete(firstKey);
            }
            // Note: We only cache SUCCESSFUL responses
            translationCache.set(cacheKey, result);
            resolve(result);
          }
        );
      } catch (e) {
        if (e.message && e.message.includes("Extension context invalidated")) {
           console.warn(`[ImmerseTL] Extension context disconnected. Shutting down UI to prevent error flood. Please refresh the page.`);
           if (ITL.captionSource && typeof ITL.captionSource.cleanup === 'function') {
             ITL.captionSource.cleanup();
           }
           if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
             ITL.overlay.clear();
           }
        } else {
           console.warn(`[ImmerseTL-DEBUG] Error in fetchTranslation - reqId: ${reqId}`, e);
        }
        resolve(null);
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightSafeText(text, glowEnabled = true) {
    if (!text) return "";
    
    // 1. Initial Strict HTML Entity Sanitization
    let safe = escapeHtml(text);

    const tags = [];
    function pushTag(html) {
      const placeholder = `\x01TAG_${tags.length}\x02`;
      tags.push(html);
      return placeholder;
    }

    // 2. Quoted Dialogue & Expressions FIRST (before quotes are added by any span class)
    // Removed single quotes to prevent matching apostrophes like "Chat's"
    safe = safe.replace(/(["“][^"“”]+["”])/g, (m) => {
      return pushTag(`<span class="yt-highlight-quote">${m}</span>`);
    });

    // 3. Brackets, SFX & Stage Directions (e.g. [Applause], (laughter), 【Notice】)
    safe = safe.replace(/(\[.*?\]|\(.*?\)|【.*?】|（.*?）)/g, (m) => {
      return pushTag(`<span class="yt-highlight-bracket">${m}</span>`);
    });

    // 4. Musical & Special Aesthetic Symbols (♪, ♬, ♥, ✨, etc.)
    safe = safe.replace(/([♪♬♥❤⭐✨✦★]+)/g, (m) => {
      return pushTag(`<span class="yt-highlight-symbol">${m}</span>`);
    });

    // 5. Japanese Honorifics & Name Suffixes (-san, -kun, -chan, -sama, -senpai, -sensei)
    safe = safe.replace(/(-san|-kun|-chan|-sama|-senpai|-sensei|-dono|-tan)\b/gi, (m) => {
      return pushTag(`<span class="yt-highlight-proper">${m}</span>`);
    });

    // 6. Numbers, Percentages & Quantities (e.g., 100%, 50px, 2026, 4.5km, 500円)
    safe = safe.replace(/\b(\d+(?:[\.,]\d+)*(?:\s*(?:%|px|kg|km|m|cm|mm|s|min|h|fps|k|m|b|円|¥|\$|€|£))?)\b/gi, (m) => {
      return pushTag(`<span class="yt-highlight-number">${m}</span>`);
    });

    // 7. Auto Emoji (CapCut Style) & Reaction Expressions
    const autoEmoji = ITL.settings ? ITL.settings.autoEmojiEnabled : false;
    
    const emojiDict = [
      { regex: /\b(wkwk+|haha+|hehe+|lol+|lmao|rofl|xixi+)\b/gi, emoji: '🤣' },
      { regex: /\b(sugoi|keren|mantap|gila|wow|omg|astaga)\b/gi, emoji: '✨' },
      { regex: /\b(sedih|nangis|sad|hiks)\b/gi, emoji: '😭' },
      { regex: /\b(marah|kesel|angry|baka|yamete|stop)\b/gi, emoji: '💢' },
      { regex: /\b(kawaii|cute|lucu|gemes)\b/gi, emoji: '🥰' },
      { regex: /\b(terima kasih|makasih|arigatou|thanks|maaf|sorry|gomen)\b/gi, emoji: '🙏' },
      { regex: /\b(capek|lelah|tired)\b/gi, emoji: '😩' },
      { regex: /\b(lapar|makan|food|hungry)\b/gi, emoji: '🤤' },
      { regex: /\b(gg|menang|yatta|hore|win)\b/gi, emoji: '🎉' },
      { regex: /\b(anjir+|anjay+|bjir+|jir+|njir+)\b/gi, emoji: '💀' },
      { regex: /\b(bro|bang|cuy|bg|ges)\b/gi, emoji: '🗿' },
      { regex: /\b(uang|money|duit|pay|bayar|beli)\b/gi, emoji: '💸' },
      // Fallback for general expressions that don't need a specific emoji but still highlight
      { regex: /\b(nani|arara|oops)\b/gi, emoji: '' }
    ];

    emojiDict.forEach(mapping => {
      safe = safe.replace(mapping.regex, (m) => {
        let replacement = `<span class="yt-highlight-word">${m}</span>`;
        if (autoEmoji && mapping.emoji) {
          replacement += ` <span class="yt-auto-emoji">${mapping.emoji}</span>`;
        }
        return pushTag(replacement);
      });
    });

    // 8. Restore all tags safely
    safe = safe.replace(/\x01TAG_(\d+)\x02/g, (_, index) => {
      return tags[parseInt(index, 10)];
    });

    return safe;
  }

  ITL.translator = {
    getCachedTranslation: getCachedTranslation,
    fetchTranslation: fetchTranslation,
    highlightSafeText: highlightSafeText,
    get cacheSize() { return translationCache.size; },
    get maxCacheSize() { return MAX_CACHE_SIZE; },
    clearCache: () => translationCache.clear()
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getCachedTranslation,
      fetchTranslation,
      highlightSafeText,
      get cacheSize() { return translationCache.size; },
      get maxCacheSize() { return MAX_CACHE_SIZE; },
      clearCache: () => translationCache.clear()
    };
  }
})(window.ImmerseTL);
