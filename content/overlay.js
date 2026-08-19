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

  // Detect whether incoming subtitle is a brand new sentence/cue or just incremental streaming typing
  function isNewDialogueCue(previousText, newText) {
    if (!previousText || previousText.trim() === "") return true;
    const now = Date.now();
    // If it's been more than 1.5s since the last change, treat as new cue
    if (now - lastCueTime > 1500) return true;

    const prev = previousText.trim().toLowerCase();
    const next = newText.trim().toLowerCase();

    // Incremental streaming typing check: if new text is simply extending the old text
    if (next.startsWith(prev) && (next.length - prev.length) < 15) {
      return false; // incremental update, avoid re-triggering full pop animation
    }

    // Word similarity check for sentence continuity
    if (next.length > 5 && prev.length > 5) {
      const prevWords = prev.split(/\s+/);
      const nextWords = next.split(/\s+/);
      if (prevWords.length >= 2 && nextWords.length >= 2) {
        if (prevWords[0] === nextWords[0] && prevWords[1] === nextWords[1]) {
          return false;
        }
      }
    }

    return true;
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

  async function updateCustomSubtitle(text, forceRerender = false, animate = true) {
    if (!overlayElement) createOverlay();
    if (!overlayElement) return;
    
    const isEnabled = ITL.settings ? ITL.settings.isSubtitleOverlayEnabled : true;
    if (!isEnabled) {
      if (overlayElement) overlayElement.style.display = 'none';
      return;
    }
    if (!text || !text.trim()) return;

    const isNewCue = animate && isNewDialogueCue(lastCueText, text);

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

    // Smart sentence grouping (~25 words)
    let rawSentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
    let sentences = [];
    for (let i = 0; i < rawSentences.length; i++) {
      if (i === 0 || rawSentences[i].trim() !== rawSentences[i-1].trim()) {
        sentences.push(rawSentences[i]);
      }
    }
    
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

    function renderFinalSubtitle(htmlContent, rawText) {
      const theme = ITL.settings ? ITL.settings.subtitleTheme : 'default';
      if (theme === 'comicHeist') {
        return formatP5Dialogue(htmlContent, rawText);
      } else if (theme === 'wuwa') {
        return formatWuwaDialogue(htmlContent);
      } else if (theme === 'metaphor') {
        return formatMetaphorDialogue(htmlContent, rawText);
      } else if (theme === 'medieval') {
        return formatMedievalDialogue(htmlContent, rawText);
      }
      return htmlContent;
    }

    function formatMedievalDialogue(innerHtml, rawText) {
      let speakerName = '';
      let contentHtml = innerHtml;
      
      const rawTextTrimmed = rawText ? rawText.trim() : '';
      const speakerMatch = rawTextTrimmed.match(/^([A-Z][a-zA-Z0-9\s]+):\s*(.*)/) || rawTextTrimmed.match(/^\[(.*?)\]\s*(.*)/);
      
      if (speakerMatch) {
        speakerName = `<div class="itl-medieval-speaker">${speakerMatch[1]}</div>`;
        // Optionally we could strip the name from the html, but it's risky due to spans.
      }
      
      return `
        <div class="itl-medieval-wrapper itl-p5-motion">
          ${speakerName}
          <div class="itl-medieval-box">
            <div class="itl-medieval-corner top-left"></div>
            <div class="itl-medieval-corner top-right"></div>
            <div class="itl-medieval-corner bottom-left"></div>
            <div class="itl-medieval-corner bottom-right"></div>
            <div class="itl-medieval-text">${contentHtml}</div>
          </div>
        </div>
      `;
    }

    function formatMetaphorDialogue(innerHtml, rawText) {
      let speakerName = 'DIALOGUE';
      let contentHtml = innerHtml;
      
      const rawTextTrimmed = rawText ? rawText.trim() : '';
      const speakerMatch = rawTextTrimmed.match(/^([A-Z][a-zA-Z0-9\s]+):\s*(.*)/) || rawTextTrimmed.match(/^\[(.*?)\]\s*(.*)/);
      let speakerClass = 'itl-metaphor-speaker generic-dialogue';
      
      if (speakerMatch) {
        speakerName = speakerMatch[1];
        speakerClass = 'itl-metaphor-speaker';
      }
      
      return `
        <div class="itl-metaphor-wrapper itl-p5-motion">
          <div class="${speakerClass}">${speakerName}</div>
          <div class="itl-metaphor-box">
            <div class="itl-metaphor-bg"></div>
            <div class="itl-metaphor-text">${contentHtml}</div>
            
            <svg class="itl-metaphor-crosshair" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="60" y1="10" x2="40" y2="90" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
              <circle cx="50" cy="50" r="10" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.6"/>
              <circle cx="50" cy="50" r="2" fill="#fff" />
              <line x1="50" y1="50" x2="90" y2="50" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
            </svg>
          </div>
        </div>
      `;
    }

    function formatWuwaDialogue(innerHtml) {
      return `
        <div class="itl-wuwa-container">
          <div class="itl-wuwa-top-dec">
            <svg width="240" height="12" viewBox="0 0 240 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 105 6 L 0 6" stroke="url(#wuwaFadeLeft)" stroke-width="1.5"/>
              <path d="M 135 6 L 240 6" stroke="url(#wuwaFadeRight)" stroke-width="1.5"/>
              <path d="M 120 2 L 125 6 L 120 10 L 115 6 Z" fill="#ffffff" opacity="0.85"/>
              <circle cx="105" cy="6" r="1.5" fill="#ffffff" opacity="0.5"/>
              <circle cx="135" cy="6" r="1.5" fill="#ffffff" opacity="0.5"/>
              <defs>
                <linearGradient id="wuwaFadeLeft" x1="105" y1="6" x2="0" y2="6" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="wuwaFadeRight" x1="135" y1="6" x2="240" y2="6" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div class="itl-wuwa-content">
            ${innerHtml}
          </div>
          
          <div class="itl-wuwa-bottom-dec">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 3 8 L 12 19 L 21 8 L 17 6 L 12 13 L 7 6 Z" fill="#ffffff" opacity="0.8"/>
              <path d="M 12 2 L 15 6 L 12 10 L 9 6 Z" fill="#ffffff" opacity="0.9"/>
            </svg>
          </div>
        </div>
      `;
    }

    function formatP5Dialogue(innerHtml, rawText) {
      let cleanHtml = innerHtml;

      // Detect and strip speaker prefixes (e.g. "Ann: Hello", "[Ann] Hello") so they don't clutter the text
      const speakerMatch = rawText.match(/^\s*(?:\[([^\]]+)\]\s*[\:\-]?|([A-Za-z0-9_\-\s]{2,15})\s*[\:\-])\s*(.*)$/s);
      if (speakerMatch) {
        const detectedSpeaker = (speakerMatch[1] || speakerMatch[2]).trim();
        if (detectedSpeaker && detectedSpeaker.length <= 15) {
          cleanHtml = cleanHtml.replace(/^\s*(?:\[[^\]]+\]\s*[\:\-]?|[A-Za-z0-9_\-\s]{2,15}\s*[\:\-])\s*/s, '');
        }
      }

      return `
        <div class="itl-p5-motion">
          <div class="itl-p5-dialog">
            <!-- Authentic Persona 5 3D Dialogue Frame with unified single-path stroke -->
            <svg class="itl-p5-frame" aria-hidden="true" viewBox="0 0 1000 140" preserveAspectRatio="none">
              <defs>
                <path id="p5-bubble-path" d="M 70,12 L 960,18 L 985,70 L 955,128 L 65,132 L 20,108 L 50,95 L 5,60 L 45,50 L 10,10 Z" />
              </defs>
              
              <!-- 3D Black Extrusion Shadow Block Layers (Offset down-right) -->
              <use href="#p5-bubble-path" fill="#000000" stroke="#000000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="4" transform="translate(3, 3)" />
              <use href="#p5-bubble-path" fill="#000000" stroke="#000000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="4" transform="translate(6, 6)" />
              <use href="#p5-bubble-path" fill="#000000" stroke="#000000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="4" transform="translate(9, 9)" />
              
              <!-- Main Persona 5 Dialogue Body: Crisp uniform 6px white outline + deep black fill -->
              <use href="#p5-bubble-path" fill="#0b0b0e" stroke="#ffffff" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="4" />
            </svg>
            
            <!-- White Shard Accent at Right Corner (Standalone unscaled) -->
            <svg class="itl-p5-shard" aria-hidden="true" viewBox="0 0 96 70" preserveAspectRatio="none">
              <path class="itl-p5-right-shard" fill="#ffffff" d="M 4,64 L 73,7 L 94,23 L 30,60 Z" />
            </svg>
            
            <div class="itl-p5-content">
              <div class="itl-p5-text" style="color: ${fontColor} !important;">${cleanHtml}</div>
            </div>
          </div>
        </div>
      `;
    }

    const targetLang = ITL.settings ? ITL.settings.targetLang : 'id';
    
    // Helper to render dual vs single mode
    const renderModeInitial = (mode, safeRaw, safeTarget) => {
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
      return renderFinalSubtitle(finalHtml, displayText);
    };

    if (ITL.settings && ITL.settings.useNativeTranslation) {
      // Bypass Google Translate completely, use native subtitle text directly
      const initialHtml = renderModeInitial(translateMode, safeRaw, safeRaw);
      currentTextElement.innerHTML = renderFinalSubtitle(initialHtml, displayText);
      if (isNewCue) { triggerCueAnimation(); if (ITL.settings && ITL.settings.typewriterEffect) applyTypewriterEffect(currentTextElement); }
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      if (ITL.history) ITL.history.update(displayText);
      return;
    }

    if (cachedTrans) {
      currentTextElement.innerHTML = renderTransData(cachedTrans);
      if (isNewCue) triggerCueAnimation();
      currentTextElement.style.opacity = '1';
      currentTextElement.style.transform = 'translateY(0)';
      if (ITL.history) ITL.history.update(displayText);
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
    if (ITL.translator && !cachedTrans) {
      if (ITL.translator.debounceTimer) clearTimeout(ITL.translator.debounceTimer);
      ITL.translator.currentRequestText = displayText;
      
      ITL.translator.debounceTimer = setTimeout(async () => {
        if (displayText !== ITL.translator.currentRequestText) return;
        
        let transData = await ITL.translator.fetchTranslation(displayText, targetLang);
        if (!transData) {
          if (text === currentText) {
            currentTextElement.innerHTML = renderFinalSubtitle(renderModeInitial('default', safeRaw, '<span style="color:#ff6b6b; font-size:0.8em;">[Koneksi Terjemahan Gagal/Limit]</span>'), displayText);
          }
          return;
        }
        if (text !== currentText) return;

        currentTextElement.innerHTML = renderTransData(transData);
        if (isNewCue) { triggerCueAnimation(); if (ITL.settings && ITL.settings.typewriterEffect) applyTypewriterEffect(currentTextElement); }
        
        currentTextElement.style.opacity = '1';
        currentTextElement.style.transform = 'translateY(0)';
        
        if (ITL.history) ITL.history.update(displayText, transData);
      }, 400);
    }
  }

  function clearOverlay() {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    if (ITL.overlay && ITL.overlay.ghostTimeoutId) {
      clearTimeout(ITL.overlay.ghostTimeoutId);
      ITL.overlay.ghostTimeoutId = null;
    }
    currentText = "";
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
