// content/overlay.js - Subtitle overlay UI rendering, theme styling, and visual updates

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let overlayElement = null;
  let currentTextElement = null;
  let clearTimeoutId = null;
  let currentText = "";
  let lastCueText = "";
  let lastCueTime = 0;
  let lastDetectedSourceLang = null;
  let lastTransData = null;

  function updateVisibility() {
    const isEnabled = ITL.settings ? ITL.settings.isSubtitleOverlayEnabled : true;

    if (!overlayElement) {
      overlayElement = document.getElementById('yt-smart-translate-overlay');
    }
    if (overlayElement) {
      overlayElement.style.display = isEnabled ? 'flex' : 'none';
    }

    if (isEnabled) {
      document.documentElement.classList.remove('immerselt-custom-subtitles-disabled');
      document.documentElement.classList.add('immerselt-custom-subtitles-enabled');
    } else {
      document.documentElement.classList.remove('immerselt-custom-subtitles-enabled');
      document.documentElement.classList.add('immerselt-custom-subtitles-disabled');
    }
  }



  function triggerCueAnimation() {
    if (!currentTextElement) return;
    const animLevel = (ITL.settings && ITL.settings.animationLevel) || 'full';
    if (animLevel === 'off') return;

    // The Comic Heist shell has its own visual transforms. Animate its motion
    // wrapper so entering dialogue never distorts the traced frame itself.
    const motionTarget = currentTextElement.querySelector('.itl-p5-motion') || currentTextElement;
    
    // Remove all possible animation classes first
    motionTarget.classList.remove('anim-cue-in', 'anim-cue-in-subtle', 'anim-slide-up', 'anim-expand', 'anim-slice', 'anim-bounce', 'anim-burn', 'anim-ripple', 'anim-flip');
    
    // Force a reflow to ensure the animation can restart
    void motionTarget.offsetWidth;
    
    // Add the appropriate animation class
    const animType = ITL.settings?.animationLevel || 'full';
    
    if (animType === 'off') {
      // Do nothing
    } else if (animType === 'subtle') {
      motionTarget.classList.add('anim-cue-in-subtle');
    } else if (animType === 'slide-up') {
      motionTarget.classList.add('anim-slide-up');
    } else if (animType === 'expand') {
      motionTarget.classList.add('anim-expand');
    } else if (animType === 'slice') {
      motionTarget.classList.add('anim-slice');
    } else if (animType === 'bounce') {
      motionTarget.classList.add('anim-bounce');
    } else if (animType === 'burn') {
      motionTarget.classList.add('anim-burn');
    } else if (animType === 'ripple') {
      motionTarget.classList.add('anim-ripple');
    } else if (animType === 'flip') {
      motionTarget.classList.add('anim-flip');
    } else {
      // default 'full'
      motionTarget.classList.add('anim-cue-in');
    }
  }

  function applyEmotionClasses(text) {
    if (!currentTextElement) return;
    if (!ITL.settings || !ITL.settings.emotionDetection) {
      currentTextElement.classList.remove('emotion-shout', 'emotion-sad', 'emotion-sing', 'emotion-flirt');
      return;
    }
    
    // Clear previous
    currentTextElement.classList.remove('emotion-shout', 'emotion-sad', 'emotion-sing', 'emotion-flirt');
    
    // Re-trigger animation by doing a small reflow hack
    let newClass = '';
    if (/[?!]{2,}|!/.test(text)) {
      newClass = 'emotion-shout';
    } else if (/\.{3,}/.test(text) || text.toLowerCase().includes('sigh')) {
      newClass = 'emotion-sad';
    } else if (/[♪♫♬]/.test(text)) {
      newClass = 'emotion-sing';
    } else if (/~/.test(text)) {
      newClass = 'emotion-flirt';
    }
    
    if (newClass) {
      // Force reflow
      void currentTextElement.offsetWidth;
      currentTextElement.classList.add(newClass);
    }
  }

  function spawnMangaSFX(text) {
    if (!overlayElement) return;
    if (!ITL.settings || !ITL.settings.mangaSfxEnabled) return;
    
    // Create layer if it doesn't exist
    let sfxLayer = document.getElementById('itl-manga-sfx-layer');
    if (!sfxLayer) {
      sfxLayer = document.createElement('div');
      sfxLayer.id = 'itl-manga-sfx-layer';
      // Insert as first child so it sits behind the text
      overlayElement.insertBefore(sfxLayer, overlayElement.firstChild);
    }
    
    // Match text inside brackets [], (), or **
    const regex = /\[([^\]]+)\]|\*([^*]+)\*|\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const sfxText = match[1] || match[2] || match[3];
      if (sfxText && sfxText.length > 1) {
        const sfxEl = document.createElement('div');
        sfxEl.className = 'manga-sfx-text';
        sfxEl.textContent = sfxText.toUpperCase();
        
        // Randomize slight positioning/rotation for variety
        const randomX = (Math.random() - 0.5) * 50;
        const randomY = (Math.random() - 0.5) * 20;
        sfxEl.style.marginLeft = `${randomX}px`;
        sfxEl.style.marginTop = `${randomY}px`;
        
        sfxLayer.appendChild(sfxEl);
        
        // Remove after animation finishes (2.5s)
        setTimeout(() => {
          if (sfxEl.parentNode) sfxEl.parentNode.removeChild(sfxEl);
        }, 2500);
      }
    }
  }

  function applyThemeAndStyles(forceRerender = false, animateRerender = false) {
    if (!overlayElement) {
      overlayElement = document.getElementById('yt-smart-translate-overlay');
    }
    if (overlayElement && !currentTextElement) {
      currentTextElement = overlayElement.querySelector('.yt-smart-translate-text');
    }

    const s = ITL.settings || {};
    const fontSize = s.fontSize || 28;
    const bgOpacity = (s.bgOpacity !== undefined ? s.bgOpacity : 60) / 100;
    const bgBlur = s.bgBlur !== undefined ? s.bgBlur : 8;
    const fontColor = s.fontColor || '#ffffff';
    const subtitleTheme = s.subtitleTheme || 'default';
    const animationLevel = s.animationLevel || 'full';

    if (overlayElement) {
      overlayElement.style.setProperty('--font-size', fontSize + 'px');
      overlayElement.style.setProperty('--bg-opacity', bgOpacity);
      overlayElement.style.setProperty('--bg-blur', bgBlur + 'px');
      overlayElement.style.setProperty('--font-color', fontColor);

      // Set animation level class on overlay wrapper
      overlayElement.classList.remove('anim-level-full', 'anim-level-subtle', 'anim-level-slide-up', 'anim-level-expand', 'anim-level-slice', 'anim-level-bounce', 'anim-level-burn', 'anim-level-ripple', 'anim-level-flip', 'anim-level-off');
      overlayElement.classList.add('anim-level-' + animationLevel);

      if (s.wordGlowEnabled !== false) {
        overlayElement.classList.add('word-glow-active');
      } else {
        overlayElement.classList.remove('word-glow-active');
      }
    }
    
    if (currentTextElement) {
      const themeClass = (subtitleTheme && subtitleTheme !== 'default') ? ' theme-' + subtitleTheme : '';
      const glowClass = (s.wordGlowEnabled !== false) ? ' word-glow-active' : '';
      // Settings updates are not new subtitle cues, so never attach the
      // entrance class here. It is only attached by triggerCueAnimation().
      currentTextElement.className = 'yt-smart-translate-text' + themeClass + glowClass;
      currentTextElement.style.setProperty('color', fontColor, 'important');
      
      const dualTrans = currentTextElement.querySelector('.yt-dual-translation');
      if (dualTrans) {
        dualTrans.style.setProperty('color', fontColor, 'important');
      }
      const p5Text = currentTextElement.querySelector('.itl-p5-text');
      if (p5Text) {
        p5Text.style.setProperty('color', fontColor, 'important');
      }
    }

    if (forceRerender && currentText) {
      updateCustomSubtitle(currentText, true, animateRerender);
    }
  }

  function getTargetContainer() {
    const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
    return isFree ? document.body : (document.querySelector('.html5-video-player') || document.querySelector('#movie_player') || document.body);
  }

  function updatePositioningMode() {
    if (overlayElement) {
      const container = getTargetContainer();
      if (overlayElement.parentElement !== container) {
        container.appendChild(overlayElement);
      }
      const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
      overlayElement.style.position = isFree ? 'fixed' : 'absolute';
    }
  }

  function applyTypewriterEffect(element) {
    if (element._typewriterInterval) clearInterval(element._typewriterInterval);
    if (typeof document.createTreeWalker !== 'function') return;
    
    // Find all text nodes excluding script/style tags
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (node.parentNode.nodeName === 'SCRIPT' || node.parentNode.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    
    const textNodes = [];
    let node;
    while(node = walker.nextNode()) {
      if (node.nodeValue.trim() !== '') textNodes.push(node);
    }
    
    const chars = [];
    textNodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const fragment = document.createDocumentFragment();
      for (const char of text) {
        if (char.trim() === '') {
          fragment.appendChild(document.createTextNode(char));
        } else {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.opacity = '0';
          // Ensure fast transition if user skips
          span.style.transition = 'opacity 0.05s ease'; 
          chars.push(span);
          fragment.appendChild(span);
        }
      }
      textNode.parentNode.replaceChild(fragment, textNode);
    });
    
    if (chars.length === 0) return;
    
    let i = 0;
    element._typewriterInterval = setInterval(() => {
      if (i < chars.length) {
        // Reveal 1 char at a time for a more relaxed reading pace (half speed)
        chars[i].style.opacity = '1';
        i += 1;
      } else {
        clearInterval(element._typewriterInterval);
      }
    }, 15);
  }

  function createOverlay() {
    let container = getTargetContainer();
    if (!container) return;

    let existingOverlay = document.getElementById('yt-smart-translate-overlay');
    if (existingOverlay) {
      overlayElement = existingOverlay;
      currentTextElement = overlayElement.querySelector('.yt-smart-translate-text');
    } else {
      overlayElement = document.createElement('div');
      overlayElement.id = 'yt-smart-translate-overlay';
      container.appendChild(overlayElement);
      if (ITL.makeDraggable) {
        ITL.makeDraggable(overlayElement, overlayElement, 'dragX', 'dragY');
      }
    }

    updatePositioningMode();

    if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
      ITL.history.ensureOverlay(container);
    }
    if (ITL.applySettings) {
      ITL.applySettings();
    }
    updateVisibility();
  }

  async function updateCustomSubtitle(text, forceRerender = false, animate = true, bypassSchedule = false) {
    if (!overlayElement) createOverlay();
    if (!overlayElement) return;
    
    const isEnabled = ITL.settings ? ITL.settings.isSubtitleOverlayEnabled : true;
    if (!isEnabled) {
      if (overlayElement) overlayElement.style.display = 'none';
      return;
    }
    if (!text || !text.trim()) return;

    let isNewCue = animate;
    if (animate && ITL.captionProcessor && typeof ITL.captionProcessor.isNewDialogueCue === 'function') {
      isNewCue = ITL.captionProcessor.isNewDialogueCue(lastCueText, text, lastCueTime, Date.now());
    }

    // If text is unchanged and not forcing rerender, ensure visibility and return
    if (!forceRerender && currentTextElement && currentText === text) {
      currentTextElement.style.opacity = '1';
      return;
    }

    currentText = text;
    if (isNewCue) {
      lastCueTime = Date.now();
    }
    lastCueText = text;

    if (!currentTextElement) {
      overlayElement.innerHTML = '';
      currentTextElement = document.createElement('div');
      overlayElement.appendChild(currentTextElement);
      applyThemeAndStyles();
    }
    
    if (isEnabled) {
      overlayElement.style.display = 'flex';
    }

    let displayText = text;
    if (ITL.captionProcessor && typeof ITL.captionProcessor.chunkCaptionText === 'function') {
      displayText = ITL.captionProcessor.chunkCaptionText(text);
    }
    
    const translateMode = ITL.settings ? ITL.settings.translateMode : 'default';
    const fontColor = ITL.settings ? ITL.settings.fontColor : '#ffffff';
    const highlightFn = (ITL.translator && ITL.translator.highlightSafeText) ? ITL.translator.highlightSafeText : (t => t);

    const theme = ITL.settings ? ITL.settings.subtitleTheme : 'default';

    const targetLang = ITL.settings ? ITL.settings.targetLang : 'id';
    
    // Helper to render dual vs single mode
    const renderModeInitial = (mode, safeRaw, safeTarget) => {
      if (ITL.themeRenderer && typeof ITL.themeRenderer.renderModeInitial === 'function') {
        return ITL.themeRenderer.renderModeInitial(mode, safeRaw, safeTarget, fontColor);
      }
      if (mode === 'dual') {
        return `<div class="yt-dual-romaji" style="font-size: 0.7em; color: #aaa;">${safeRaw}</div><div class="yt-dual-translation" style="color: ${fontColor} !important;">${safeTarget}</div>`;
      }
      return `<div class="yt-single-translation" style="color: ${fontColor} !important;">${safeTarget}</div>`;
    };

    const safeRaw = highlightFn(displayText);
    
    // Synchronous cache check to eliminate pause flicker
    let cachedTrans = null;
    if (ITL.translator && typeof ITL.translator.getCachedTranslation === 'function') {
      cachedTrans = ITL.translator.getCachedTranslation(displayText, targetLang);
    }
    
    const renderTransData = (transData) => {
      let finalHtml = "";
      const safeTrans = highlightFn(transData.translation);
      if (translateMode === 'dual') {
        let safeRomaji = "";
        if (transData.sourceLang === 'ja' && transData.romaji) safeRomaji = highlightFn(transData.romaji);
        else safeRomaji = `<span style="color: #aaa; font-size: 0.85em;">${safeRaw}</span>`;
        finalHtml = renderModeInitial('dual', safeRomaji, safeTrans);
      } else {
        finalHtml = renderModeInitial('default', safeRaw, safeTrans);
      }
      
      if (ITL.themeRenderer && typeof ITL.themeRenderer.renderFinalSubtitle === 'function') {
        return ITL.themeRenderer.renderFinalSubtitle(finalHtml, displayText, theme, { fontColor });
      }
      return finalHtml;
    };

    if (ITL.settings && ITL.settings.useNativeTranslation) {
      // Bypass Google Translate completely, use native subtitle text directly
      const initialHtml = renderModeInitial(translateMode, safeRaw, safeRaw);
      
      if (ITL.themeRenderer && typeof ITL.themeRenderer.renderFinalSubtitle === 'function') {
        currentTextElement.innerHTML = ITL.themeRenderer.renderFinalSubtitle(initialHtml, displayText, theme, { fontColor });
      } else {
        currentTextElement.innerHTML = initialHtml;
      }
      
      applyEmotionClasses(displayText);
      if (isNewCue) {
        triggerCueAnimation();
        spawnMangaSFX(displayText);
        if (ITL.settings && ITL.settings.typewriterEffect) applyTypewriterEffect(currentTextElement);
      }
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      if (ITL.history) ITL.history.update(displayText);
      return;
    }

    const hasValidLastTrans = !!(lastTransData && lastTransData.text === displayText && lastTransData.targetLang === targetLang);

    if (cachedTrans) {
      lastTransData = { ...cachedTrans, text: displayText, targetLang: targetLang };
      currentTextElement.innerHTML = renderTransData(cachedTrans);
      const renderedText = cachedTrans.translation || displayText;
      applyEmotionClasses(renderedText);
      if (isNewCue) {
        triggerCueAnimation();
        spawnMangaSFX(renderedText);
        if (ITL.settings && ITL.settings.typewriterEffect) applyTypewriterEffect(currentTextElement);
      }
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      if (ITL.history) ITL.history.update(displayText, cachedTrans);
    } else if (hasValidLastTrans && forceRerender) {
      currentTextElement.innerHTML = renderTransData(lastTransData);
      applyEmotionClasses(lastTransData.translation || displayText);
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
    } else {
      // If we don't have it cached, wait silently.
      // This leaves the OLD translated text on screen during the 400ms debounce
      // and subsequent API fetch, keeping the experience seamless.
      // However, if the screen is completely empty (no old text), we must ensure the container exists but remains hidden.
      if (!currentTextElement.innerHTML) {
         currentTextElement.innerHTML = "";
         currentTextElement.style.opacity = '0';
      }
    }

    // 2. Debounce the translation fetch (400ms)
    if (!bypassSchedule && ITL.translationTrigger && !cachedTrans && !hasValidLastTrans) {
      ITL.translationTrigger.scheduleTranslation({
        text: displayText,
        targetLang: targetLang,
        delay: 0,
        onResult: (transData) => {
          if (text !== currentText) return;
          lastTransData = { ...transData, text: displayText, targetLang: targetLang };
          currentTextElement.innerHTML = renderTransData(transData);
          const renderedText = transData.translation || displayText;
          applyEmotionClasses(renderedText);
          if (isNewCue) triggerCueAnimation();
          spawnMangaSFX(renderedText);
          if (ITL.settings && ITL.settings.typewriterEffect) applyTypewriterEffect(currentTextElement);
          
          currentTextElement.style.opacity = '1';
          currentTextElement.style.transform = 'translateY(0)';
          
          if (ITL.history) ITL.history.update(displayText, transData);
        },
        onError: () => {
          if (text === currentText) {
            // Smart Fallback: Render original dialogue text with subtle badge so subtitles never disappear
            const fallbackBadge = '<span class="itl-fallback-badge" style="display:inline-block; margin-left:6px; font-size:0.75em; opacity:0.65; vertical-align:middle;" title="Koneksi terjemahan sedang limit/rehat, menampilkan teks asli">[Asli]</span>';
            const fallbackTarget = `${safeRaw} ${fallbackBadge}`;
            const initialHtml = renderModeInitial(translateMode, safeRaw, fallbackTarget);
            if (ITL.themeRenderer && typeof ITL.themeRenderer.renderFinalSubtitle === 'function') {
              currentTextElement.innerHTML = ITL.themeRenderer.renderFinalSubtitle(initialHtml, displayText, theme, { fontColor });
            } else {
              currentTextElement.innerHTML = initialHtml;
            }
            lastTransData = { translation: fallbackTarget, sourceLang: 'auto', romaji: '', text: displayText, targetLang: targetLang };
            if (isNewCue) triggerCueAnimation();
            currentTextElement.style.opacity = '1';
            currentTextElement.style.transform = 'translateY(0)';
            if (ITL.history) ITL.history.update(displayText);
          }
        }
      });
    }
  }

  function clearOverlay() {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    if (ITL.overlay && ITL.overlay.hideGraceTimeoutId) {
      clearTimeout(ITL.overlay.hideGraceTimeoutId);
      ITL.overlay.hideGraceTimeoutId = null;
    }
    if (ITL.overlay && ITL.overlay.ghostTimeoutId) {
      clearTimeout(ITL.overlay.ghostTimeoutId);
      ITL.overlay.ghostTimeoutId = null;
    }
    if (currentTextElement && currentTextElement._typewriterInterval) {
      clearInterval(currentTextElement._typewriterInterval);
      currentTextElement._typewriterInterval = null;
    }
    currentText = "";
    lastCueText = "";
    lastCueTime = 0;
    lastTransData = null;
    let existingOverlay = document.getElementById('yt-smart-translate-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    overlayElement = null;
    currentTextElement = null;
  }

  ITL.overlay = {
    create: createOverlay,
    updateVisibility: updateVisibility,
    updatePositioningMode: updatePositioningMode,
    applyThemeAndStyles: applyThemeAndStyles,
    updateCustomSubtitle: updateCustomSubtitle,
    clear: clearOverlay,
    get element() { return overlayElement; },
    get currentTextElement() { return currentTextElement; },
    get clearTimeoutId() { return clearTimeoutId; },
    set clearTimeoutId(t) { clearTimeoutId = t; }
  };
})(window.ImmerseTL);
