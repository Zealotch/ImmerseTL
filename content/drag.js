// content/drag.js - Drag and drop functionality for Subtitle and History Overlay

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  function makeDraggable(element, handleElement, storageXKey, storageYKey) {
    if (!element || !handleElement) return;

    let isDragging = false;
    let startX, startY, initialX = 0, initialY = 0;

    handleElement.addEventListener('pointerdown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
      
      isDragging = true;
      handleElement.setPointerCapture(e.pointerId); // Ensure we don't lose drag if moving too fast
      startX = e.clientX;
      startY = e.clientY;
      
      const style = window.getComputedStyle(element);
      initialX = parseFloat(style.getPropertyValue('--drag-x')) || 0;
      initialY = parseFloat(style.getPropertyValue('--drag-y')) || 0;
      
      element.style.transition = 'none';
    });

    handleElement.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newX = initialX + dx;
      const newY = initialY + dy;
      
      // Note: No boundary constraints here! This enables the "Free-Floating Subtitle" roadmap feature!
      element.style.setProperty('--drag-x', newX + 'px');
      element.style.setProperty('--drag-y', newY + 'px');
    });

    handleElement.addEventListener('pointerup', (e) => {
      if (isDragging) {
        isDragging = false;
        handleElement.releasePointerCapture(e.pointerId);
        element.style.transition = '';
        
        const finalX = parseFloat(element.style.getPropertyValue('--drag-x')) || 0;
        const finalY = parseFloat(element.style.getPropertyValue('--drag-y')) || 0;
        
        let storageData = {};
        storageData[storageXKey] = finalX;
        storageData[storageYKey] = finalY;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(storageData);
        }
      }
    });
  }

  ITL.makeDraggable = makeDraggable;
})(window.ImmerseTL);
