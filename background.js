// background.js
console.log("[ImmerseTL] Background Service Worker Loaded");

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { command: command }).catch(() => {});
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchTranslation') {
    const { text, targetLang } = request;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    fetch(url, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(json => {
        let translation = "";
        if (json[0]) {
          for (let i = 0; i < json[0].length; i++) {
            if (json[0][i][0]) {
              translation += json[0][i][0];
            }
          }
        }
        
        let romaji = "";
        let sourceLang = json[2] || "";
        
        // Only attempt to extract Romanization if source language is Japanese
        if (json[0] && sourceLang === 'ja') {
          const lastElement = json[0][json[0].length - 1];
          if (lastElement && lastElement[3]) {
            romaji = lastElement[3];
          }
        }
        sendResponse({ success: true, translation: translation.trim(), romaji: romaji.trim(), sourceLang: sourceLang });
      })
      .finally(() => clearTimeout(timeoutId))
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      
    return true; // Indicates async response
  }
});
