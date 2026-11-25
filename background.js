// background.js
console.log("[ImmerseTL] Background Service Worker Loaded");

/**
 * Parses Google Translate single endpoint JSON response into clean translation,
 * romaji (for Japanese), and detected source language without leaking trailing
 * romanization-only segments into the translation text.
 */
function parseGoogleTranslateResponse(json) {
  if (!Array.isArray(json)) {
    return { translation: "", romaji: "", sourceLang: "" };
  }

  let translation = "";
  const segments = Array.isArray(json[0]) ? json[0] : null;
  if (segments) {
    const len = segments.length;
    for (let i = 0; i < len; i++) {
      const seg = segments[i];
      if (!seg) continue;
      // Skip the trailing element if it's a romanization-only segment
      // (has romanization at [3] or [2] without a source text chunk at [1])
      if (i === len - 1 && !seg[1] && (seg[3] || seg[2])) {
        break;
      }
      if (seg[0]) {
        translation += seg[0];
      }
    }
  }

  let romaji = "";
  const sourceLang = json[2] || "";

  // Only attempt to extract Romanization if source language is Japanese
  if (segments && segments.length > 0 && sourceLang === 'ja') {
    const lastElement = segments[segments.length - 1];
    if (lastElement && lastElement[3]) {
      romaji = lastElement[3];
    }
  }

  return {
    translation: translation.trim(),
    romaji: romaji.trim(),
    sourceLang: sourceLang
  };
}

if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { command: command }).catch(() => {});
      }
    });
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchTranslation') {
      const { text, targetLang } = request;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      fetch(url, { signal: controller.signal })
        .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(json => {
          const parsed = parseGoogleTranslateResponse(json);
          sendResponse({ success: true, ...parsed });
        })
        .finally(() => clearTimeout(timeoutId))
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        
      return true; // Indicates async response
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseGoogleTranslateResponse };
}
