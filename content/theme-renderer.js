// content/theme-renderer.js - Theme-specific HTML rendering structures

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {

  function renderModeInitial(mode, safeRaw, safeTarget, fontColor = '#ffffff') {
    if (mode === 'dual') {
      return `<div class="yt-dual-romaji" style="font-size: 0.7em; color: #aaa;">${safeRaw}</div><div class="yt-dual-translation" style="color: ${fontColor} !important;">${safeTarget}</div>`;
    }
    return `<div class="yt-single-translation" style="color: ${fontColor} !important;">${safeTarget}</div>`;
  }

  function formatMedievalDialogue(innerHtml, rawText) {
    let speakerName = '';
    let contentHtml = innerHtml;
    
    const rawTextTrimmed = rawText ? rawText.trim() : '';
    const speakerMatch = rawTextTrimmed.match(/^([A-Z][a-zA-Z0-9\s]+):\s*(.*)/) || rawTextTrimmed.match(/^\[(.*?)\]\s*(.*)/);
    
    if (speakerMatch) {
      speakerName = `<div class="itl-medieval-speaker">${speakerMatch[1]}</div>`;
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

  function formatP5Dialogue(innerHtml, rawText, fontColor = '#ffffff') {
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

  function renderFinalSubtitle(htmlContent, rawText, theme = 'default', options = {}) {
    if (theme === 'comicHeist') {
      return formatP5Dialogue(htmlContent, rawText, options.fontColor);
    } else if (theme === 'wuwa') {
      return formatWuwaDialogue(htmlContent);
    } else if (theme === 'metaphor') {
      return formatMetaphorDialogue(htmlContent, rawText);
    } else if (theme === 'medieval') {
      return formatMedievalDialogue(htmlContent, rawText);
    }
    return htmlContent;
  }

  ITL.themeRenderer = {
    renderModeInitial: renderModeInitial,
    renderFinalSubtitle: renderFinalSubtitle,
    formatMedievalDialogue: formatMedievalDialogue,
    formatMetaphorDialogue: formatMetaphorDialogue,
    formatWuwaDialogue: formatWuwaDialogue,
    formatP5Dialogue: formatP5Dialogue
  };

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      renderModeInitial,
      renderFinalSubtitle,
      formatMedievalDialogue,
      formatMetaphorDialogue,
      formatWuwaDialogue,
      formatP5Dialogue
    };
  }
})(window.ImmerseTL);
