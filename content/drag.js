// content/drag.js - Drag and drop functionality for Subtitle and History Overlay

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  const DRAG_MARGIN_PX = 8;

  function calculateClampBounds(containerRect, elementRect, margin = DRAG_MARGIN_PX) {
    const startLeft = elementRect.left;
    const startTop = elementRect.top;
    const startWidth = elementRect.width;
    const startHeight = elementRect.height;

    let minDx = (containerRect.left + margin) - startLeft;
    let maxDx = (containerRect.width - margin - startWidth) - (startLeft - containerRect.left);
    let minDy = (containerRect.top + margin) - startTop;
    let maxDy = (containerRect.height - margin - startHeight) - (startTop - containerRect.top);

    // If element is wider or taller than container, clamp safely to left/top margin without inversion
    if (minDx > maxDx) {
      const clampedX = (containerRect.left + margin) - startLeft;
      minDx = clampedX;
      maxDx = clampedX;
    }
    if (minDy > maxDy) {
      const clampedY = (containerRect.top + margin) - startTop;
      minDy = clampedY;
      maxDy = clampedY;
    }

    return { minDx, maxDx, minDy, maxDy };
  }

  function makeDraggable(element, handleElement, storageXKey, storageYKey) {
    if (!element || !handleElement) return;

    let isDragging = false;
    let startX, startY, initialX = 0, initialY = 0;
    let startLeft = 0, startTop = 0, startWidth = 0, startHeight = 0;

    handleElement.addEventListener('pointerdown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
      
      isDragging = true;
      e.target.setPointerCapture(e.pointerId); // Fix: use e.target instead of handleElement
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      startWidth = rect.width || element.offsetWidth;
      startHeight = rect.height || element.offsetHeight;
      
      const style = window.getComputedStyle(element);
      initialX = parseFloat(style.getPropertyValue('--drag-x')) || 0;
      initialY = parseFloat(style.getPropertyValue('--drag-y')) || 0;
      
      element.style.transition = 'none';
    });

    handleElement.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Boundary Constraints: Check if Free-Floating or Player-Locked
      const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
      
      let containerRect;
      if (isFree) {
        containerRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      } else {
        const player = (typeof document !== 'undefined') ? (document.querySelector('.html5-video-player') || document.querySelector('#movie_player') || document.body) : null;
        containerRect = player ? player.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth || 854, height: window.innerHeight || 480 };
      }
      
      const bounds = calculateClampBounds(containerRect, {
        left: startLeft,
        top: startTop,
        width: startWidth,
        height: startHeight
      }, DRAG_MARGIN_PX);
      
      const boundedDx = Math.max(bounds.minDx, Math.min(bounds.maxDx, dx));
      const boundedDy = Math.max(bounds.minDy, Math.min(bounds.maxDy, dy));
      
      const newX = initialX + boundedDx;
      const newY = initialY + boundedDy;
      
      element.style.setProperty('--drag-x', newX + 'px');
      element.style.setProperty('--drag-y', newY + 'px');
    });

    handleElement.addEventListener('pointerup', (e) => {
      if (isDragging) {
        isDragging = false;
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
        element.style.transition = '';
        
        const finalX = parseFloat(element.style.getPropertyValue('--drag-x')) || 0;
        const finalY = parseFloat(element.style.getPropertyValue('--drag-y')) || 0;
        
        let storageData = {};
        storageData[storageXKey] = finalX;
        storageData[storageYKey] = finalY;
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
          try {
            chrome.storage.local.set(storageData);
          } catch (err) {}
        }
      }
    });
  }

  ITL.makeDraggable = makeDraggable;
  ITL.calculateClampBounds = calculateClampBounds;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      makeDraggable,
      calculateClampBounds
    };
  }
})(window.ImmerseTL);
