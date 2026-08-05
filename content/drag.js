// content/drag.js - Drag and drop functionality for Subtitle and History Overlay

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  function makeDraggable(element, handleElement, storageXKey, storageYKey) {
    if (!element || !handleElement) return;

    let isDragging = false;
    let startX, startY, initialX = 0, initialY = 0;

    handleElement.addEventListener('mousedown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const style = window.getComputedStyle(element);
      initialX = parseFloat(style.getPropertyValue('--drag-x')) || 0;
      initialY = parseFloat(style.getPropertyValue('--drag-y')) || 0;
      
      element.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newX = initialX + dx;
      const newY = initialY + dy;
      
      element.style.setProperty('--drag-x', newX + 'px');
      element.style.setProperty('--drag-y', newY + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
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
