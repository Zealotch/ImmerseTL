// content/drag.js - Drag and drop functionality for Subtitle and History Overlay

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
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
      const minVisible = 50;
      
      let containerRect;
      if (isFree) {
        containerRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      } else {
        const player = document.querySelector('.html5-video-player') || document.querySelector('#movie_player') || document.body;
        containerRect = player.getBoundingClientRect();
      }
      
      const maxDx = (containerRect.width - minVisible) - (startLeft - containerRect.left);
      const minDx = (minVisible - startWidth) - (startLeft - containerRect.left);
      const maxDy = (containerRect.height - minVisible) - (startTop - containerRect.top);
      const minDy = (minVisible - startHeight) - (startTop - containerRect.top);
      
      const boundedDx = Math.max(minDx, Math.min(maxDx, dx));
      const boundedDy = Math.max(minDy, Math.min(maxDy, dy));
      
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
})(window.ImmerseTL);
