// content/caption-source.js - YouTube caption DOM observer, fade-out handler, and lifecycle cleanup

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let subtitleObservers = [];
  let isObserverHooked = false;
  let observerIntervalId = null;

  function checkObserver() {
    if (!document.querySelector('video')) return;

    const targetNodes = document.querySelectorAll('.ytp-caption-window-container, #ytp-caption-window-container, .caption-window');
    let anyVisible = false;
    
    targetNodes.forEach(targetNode => {
      if (!targetNode.dataset.isObservedByImmerseTL) {
        targetNode.dataset.isObservedByImmerseTL = "true";
        isObserverHooked = true;
        if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
          ITL.overlay.updateVisibility();
        }
        
        let initialSegments = targetNode.querySelectorAll('.ytp-caption-segment, .caption-visual-line');
        if (initialSegments.length === 0) initialSegments = targetNode.querySelectorAll('span');
        
        let initialText = "";
        if (initialSegments.length > 0) {
          initialText = Array.from(initialSegments).map(seg => seg.textContent).join(' ');
        } else {
          initialText = targetNode.textContent;
        }
        
        if (initialText && initialText.trim() && ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
          ITL.overlay.updateCustomSubtitle(initialText);
        }

        const obs = new MutationObserver(() => {
          const compStyle = getComputedStyle(targetNode);
          if (targetNode.offsetWidth === 0 || targetNode.offsetHeight === 0 || compStyle.display === 'none' || compStyle.visibility === 'hidden' || compStyle.opacity === '0') {
            if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
              ITL.overlay.clear();
            }
            return;
          }

          const captionWindow = targetNode.querySelector('.ytp-caption-window') || (targetNode.classList.contains('ytp-caption-window') ? targetNode : null);
          const cwStyle = captionWindow ? getComputedStyle(captionWindow) : null;
          const isHidden = cwStyle && (cwStyle.display === 'none' || cwStyle.visibility === 'hidden' || cwStyle.opacity === '0');
          
          let segments = targetNode.querySelectorAll('.ytp-caption-segment, .caption-visual-line');
          if (segments.length === 0) segments = targetNode.querySelectorAll('span');
          
          let fullText = "";
          if (segments.length > 0) {
            fullText = Array.from(segments).map(seg => seg.textContent).join(' ');
          } else {
            fullText = targetNode.textContent;
          }

          if (fullText && fullText.trim() && !isHidden) {
            if (ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
              ITL.overlay.updateCustomSubtitle(fullText);
            }
          } else {
            // When CC is disabled or empty, clear the custom subtitle overlay
            if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
              ITL.overlay.clear();
            }
          }
        });

        obs.observe(targetNode, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        subtitleObservers.push(obs);
      }
      
      const compStyle = getComputedStyle(targetNode);
      if (targetNode.offsetWidth > 0 && targetNode.offsetHeight > 0 && compStyle.display !== 'none' && compStyle.visibility !== 'hidden' && compStyle.opacity !== '0') {
        const captionWindow = targetNode.querySelector('.ytp-caption-window') || (targetNode.classList.contains('ytp-caption-window') ? targetNode : null);
        const cwStyle = captionWindow ? getComputedStyle(captionWindow) : null;
        const isHidden = cwStyle && (cwStyle.display === 'none' || cwStyle.visibility === 'hidden' || cwStyle.opacity === '0');
        
        let segments = targetNode.querySelectorAll('.ytp-caption-segment, .caption-visual-line');
        if (segments.length === 0) segments = targetNode.querySelectorAll('span');
        
        let fullText = "";
        if (segments.length > 0) {
          fullText = Array.from(segments).map(seg => seg.textContent).join(' ');
        } else {
          fullText = targetNode.textContent;
        }
        
        if (fullText && fullText.trim() && !isHidden) {
          anyVisible = true;
        }
      }
    });

    // If no captions are currently active, fade out after 3 seconds
    if (ITL.overlay && ITL.overlay.currentTextElement) {
      if (!anyVisible) {
        if (!ITL.overlay.clearTimeoutId) {
          ITL.overlay.clearTimeoutId = setTimeout(() => {
            if (ITL.overlay && ITL.overlay.currentTextElement) {
              ITL.overlay.currentTextElement.style.opacity = '0';
              // Actually clear the DOM after transition finishes to prevent ghost UI
              ITL.overlay.ghostTimeoutId = setTimeout(() => {
                if (ITL.overlay && typeof ITL.overlay.clear === 'function') {
                  ITL.overlay.clear();
                }
                if (ITL.overlay) ITL.overlay.ghostTimeoutId = null;
              }, 400);
            }
            if (ITL.overlay) ITL.overlay.clearTimeoutId = null;
          }, 3000);
        }
      } else {
        if (ITL.overlay.clearTimeoutId) {
          clearTimeout(ITL.overlay.clearTimeoutId);
          ITL.overlay.clearTimeoutId = null;
        }
        if (ITL.overlay.ghostTimeoutId) {
          clearTimeout(ITL.overlay.ghostTimeoutId);
          ITL.overlay.ghostTimeoutId = null;
        }
        ITL.overlay.currentTextElement.style.opacity = '1';
      }
    }
  }

  function cleanup() {
    // Disconnect all observers to prevent memory leaks and ghosts
    if (subtitleObservers && subtitleObservers.length > 0) {
      subtitleObservers.forEach(obs => obs.disconnect());
      subtitleObservers = [];
    }

    // Reset observing flags on existing DOM nodes
    const targetNodes = document.querySelectorAll('.ytp-caption-window-container, #ytp-caption-window-container, .caption-window');
    targetNodes.forEach(node => {
      delete node.dataset.isObservedByImmerseTL;
    });

    isObserverHooked = false;
    if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
      ITL.overlay.updateVisibility();
    }
  }

  function startObserverLoop() {
    if (observerIntervalId) clearInterval(observerIntervalId);
    observerIntervalId = setInterval(checkObserver, 1000);
  }

  ITL.captionSource = {
    checkObserver: checkObserver,
    cleanup: cleanup,
    startObserverLoop: startObserverLoop,
    get isHooked() { return isObserverHooked; },
    get observers() { return subtitleObservers; }
  };
})(window.ImmerseTL);
