// content/caption-source.js - YouTube caption DOM observer, fade-out handler, and lifecycle cleanup

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let subtitleObservers = [];
  let isObserverHooked = false;
  let observerIntervalId = null;

  function checkObserver() {
    if (!document.querySelector('video')) return;

    const targetNodes = document.querySelectorAll('.ytp-caption-window-container');
    let anyVisible = false;
    
    targetNodes.forEach(targetNode => {
      if (!targetNode.dataset.isObservedByImmerseTL) {
        targetNode.dataset.isObservedByImmerseTL = "true";
        isObserverHooked = true;
        if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
          ITL.overlay.updateVisibility();
        }
        
        const obs = new MutationObserver(() => {
          if (targetNode.offsetWidth === 0 || targetNode.offsetHeight === 0) return;
          if (getComputedStyle(targetNode).display === 'none') return;

          const captionWindow = targetNode.querySelector('.ytp-caption-window');
          const isHidden = captionWindow && getComputedStyle(captionWindow).display === 'none';
          
          const segments = targetNode.querySelectorAll('.ytp-caption-segment');
          if (segments.length > 0 && !isHidden) {
            let fullText = Array.from(segments).map(seg => seg.textContent).join(' ');
            if (ITL.overlay && typeof ITL.overlay.updateCustomSubtitle === 'function') {
              ITL.overlay.updateCustomSubtitle(fullText);
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
      
      if (targetNode.offsetWidth > 0 && targetNode.offsetHeight > 0 && getComputedStyle(targetNode).display !== 'none') {
        const captionWindow = targetNode.querySelector('.ytp-caption-window');
        const isHidden = captionWindow && getComputedStyle(captionWindow).display === 'none';
        const segments = targetNode.querySelectorAll('.ytp-caption-segment');
        
        if (segments.length > 0 && !isHidden) {
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
            }
            if (ITL.overlay) ITL.overlay.clearTimeoutId = null;
          }, 3000);
        }
      } else {
        if (ITL.overlay.clearTimeoutId) {
          clearTimeout(ITL.overlay.clearTimeoutId);
          ITL.overlay.clearTimeoutId = null;
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
    const targetNodes = document.querySelectorAll('.ytp-caption-window-container');
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
