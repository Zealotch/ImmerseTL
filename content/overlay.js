// content/overlay.js - Subtitle overlay UI rendering, theme styling, and visual updates

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let overlayElement = null;
  let currentTextElement = null;
  let clearTimeoutId = null;
  let currentText = "";

  function updateVisibility() {
    const isEnabled = ITL.settings ? ITL.settings.isSubtitleOverlayEnabled : true;
    const isHooked = ITL.captionSource ? ITL.captionSource.isHooked : false;

    if (overlayElement) {
      overlayElement.style.display = isEnabled ? 'flex' : 'none';
    }
    if (isEnabled && isHooked) {
      document.documentElement.classList.remove('immerselt-custom-subtitles-disabled');
      document.documentElement.classList.add('immerselt-custom-subtitles-enabled');
    } else {
      document.documentElement.classList.remove('immerselt-custom-subtitles-enabled');
      document.documentElement.classList.add('immerselt-custom-subtitles-disabled');
    }
  }

  function applyThemeAndStyles() {
    const s = ITL.settings || {};
    const fontSize = s.fontSize || 28;
    const bgOpacity = (s.bgOpacity !== undefined ? s.bgOpacity : 60) / 100;
    const bgBlur = s.bgBlur !== undefined ? s.bgBlur : 8;
    const fontColor = s.fontColor || '#ffffff';
    const subtitleTheme = s.subtitleTheme || 'default';

    if (overlayElement) {
      overlayElement.style.setProperty('--font-size', fontSize + 'px');
      overlayElement.style.setProperty('--bg-opacity', bgOpacity);
      overlayElement.style.setProperty('--bg-blur', bgBlur + 'px');
      overlayElement.style.setProperty('--font-color', fontColor);
    }
    
    if (currentTextElement) {
      currentTextElement.className = 'yt-smart-translate-text' + (subtitleTheme && subtitleTheme !== 'default' ? ' theme-' + subtitleTheme : '');
      currentTextElement.style.setProperty('color', fontColor, 'important');
      
      const dualTrans = currentTextElement.querySelector('.yt-dual-translation');
      if (dualTrans) {
        dualTrans.style.setProperty('color', fontColor, 'important');
      }
    }
  }

  function createOverlay() {
    let container = document.querySelector('.html5-video-player') || document.querySelector('#movie_player');
    if (!container) return;

    let existingOverlay = document.getElementById('yt-smart-translate-overlay');
    if (existingOverlay) {
      overlayElement = existingOverlay;
    } else {
      overlayElement = document.createElement('div');
      overlayElement.id = 'yt-smart-translate-overlay';
      container.appendChild(overlayElement);
      if (ITL.makeDraggable) {
        ITL.makeDraggable(overlayElement, overlayElement, 'dragX', 'dragY');
      }
    }

    if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
      ITL.history.ensureOverlay(container);
    }
    if (ITL.applySettings) {
      ITL.applySettings();
    }
    updateVisibility();
  }

  async function updateCustomSubtitle(text) {
    if (!overlayElement) createOverlay();
    if (!overlayElement) return;
    
    const isEnabled = ITL.settings ? ITL.settings.isSubtitleOverlayEnabled : true;
    if (!isEnabled) {
      if (overlayElement) overlayElement.style.display = 'none';
      return;
    }
    if (!text || !text.trim()) return;

    // If text is unchanged, ensure visibility and return
    if (currentTextElement && currentText === text) {
      currentTextElement.style.opacity = '1';
      applyThemeAndStyles();
      return;
    }

    currentText = text;

    if (!currentTextElement) {
      overlayElement.innerHTML = '';
      currentTextElement = document.createElement('div');
      overlayElement.appendChild(currentTextElement);
    }
    
    applyThemeAndStyles();
    if (isEnabled) {
      overlayElement.style.display = 'flex';
    }
    
    // Smart sentence grouping (~25 words)
    let sentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
    let displayText = "";
    let wordCount = 0;
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      let sentence = sentences[i];
      let sentenceWordCount = sentence.trim().split(/\s+/).length;
      if (wordCount + sentenceWordCount > 25 && displayText !== "") {
        break;
      }
      displayText = sentence + displayText;
      wordCount += sentenceWordCount;
    }
    
    displayText = displayText.trim();
    let finalWords = displayText.split(/\s+/);
    if (finalWords.length > 30) {
      displayText = finalWords.slice(-30).join(' ');
    }
    
    const translateMode = ITL.settings ? ITL.settings.translateMode : 'default';
    const fontColor = ITL.settings ? ITL.settings.fontColor : '#ffffff';
    const highlightFn = (ITL.translator && ITL.translator.highlightSafeText) ? ITL.translator.highlightSafeText : (t => t);

    if (translateMode === 'default') {
      let safeText = highlightFn(displayText);
      currentTextElement.innerHTML = safeText;
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      
      // Save to history log
      if (ITL.history) ITL.history.update(displayText);
    } else {
      const targetLang = translateMode === 'dual_en' ? 'en' : 'id';
      
      // 1. Immediately render raw text first (Responsive fallback)
      const safeRaw = highlightFn(displayText);
      currentTextElement.innerHTML = `<div class="yt-dual-romaji" style="font-size: 0.7em; color: #aaa;">${safeRaw}</div><div class="yt-dual-translation" style="color: ${fontColor} !important;">...</div>`;
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      
      if (ITL.history) ITL.history.update(displayText);
      
      // 2. Debounce the translation fetch (400ms)
      if (ITL.translator) {
        if (ITL.translator.debounceTimer) clearTimeout(ITL.translator.debounceTimer);
        ITL.translator.currentRequestText = displayText;
        
        ITL.translator.debounceTimer = setTimeout(async () => {
          if (displayText !== ITL.translator.currentRequestText) return;
          
          const transData = await ITL.translator.fetchTranslation(displayText, targetLang);
          if (text !== currentText) return;

          if (transData) {
            const isJapanese = transData.sourceLang === 'ja';
            let safeRomaji = "";
            
            if (isJapanese && transData.romaji) {
              safeRomaji = highlightFn(transData.romaji);
            } else {
              safeRomaji = `<span style="color: #aaa; font-size: 0.85em;">${highlightFn(displayText)}</span>`;
            }
            
            const safeTrans = highlightFn(transData.translation);
            currentTextElement.innerHTML = `<div class="yt-dual-romaji">${safeRomaji}</div><div class="yt-dual-translation" style="color: ${fontColor} !important;">${safeTrans}</div>`;
            
            if (ITL.history) ITL.history.update(displayText, transData);
          } else {
            let errMsg = "⚠️ Translation Failed";
            try { errMsg = chrome.i18n.getMessage("errServerBusy") || errMsg; } catch(e) {}
            currentTextElement.innerHTML = `<div class="yt-dual-romaji" style="color: #ffaa00; font-size: 0.7em;">${errMsg}</div><div class="yt-dual-translation" style="color: ${fontColor} !important;">${highlightFn(displayText)}</div>`;
          }
        }, 400);
      }
    }
  }

  function clearOverlay() {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    currentText = "";
    let existingOverlay = document.getElementById('yt-smart-translate-overlay');
    if (existingOverlay) existingOverlay.innerHTML = '';
    overlayElement = null;
    currentTextElement = null;
  }

  ITL.overlay = {
    create: createOverlay,
    updateVisibility: updateVisibility,
    applyThemeAndStyles: applyThemeAndStyles,
    updateCustomSubtitle: updateCustomSubtitle,
    clear: clearOverlay,
    get element() { return overlayElement; },
    get currentTextElement() { return currentTextElement; },
    get clearTimeoutId() { return clearTimeoutId; },
    set clearTimeoutId(t) { clearTimeoutId = t; }
  };
})(window.ImmerseTL);
