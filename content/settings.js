// content/settings.js - Settings management, persistence, and live sync

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  // Default Settings State (Using shared common.js if available)
  ITL.settings = (typeof window !== 'undefined' && window.ImmerseTL_Common)
    ? Object.assign({}, window.ImmerseTL_Common.DEFAULT_SETTINGS)
    : {
        isSubtitleOverlayEnabled: true,
        fontSize: 28,
        bgOpacity: 60,
        bgBlur: 8,
        fontColor: '#ffffff',
        subtitleTheme: 'default',
        translateMode: 'default',
        showHistory: false,
        dragX: 0,
        dragY: 0,
        historyDragX: 0,
        historyDragY: 0
      };

  function applySettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    try {
      // Use defaults from common.js if available
      const defaultState = (typeof window !== 'undefined' && window.ImmerseTL_Common) 
        ? window.ImmerseTL_Common.DEFAULT_SETTINGS 
        : ITL.settings;
        
      chrome.storage.local.get(defaultState, (items) => {
        // Validate items
        const validItems = (typeof window !== 'undefined' && window.ImmerseTL_Common && typeof window.ImmerseTL_Common.validateSettings === 'function')
          ? window.ImmerseTL_Common.validateSettings(items)
          : items;
          
        ITL.settings = Object.assign({}, ITL.settings, validItems);
        
        if (ITL.overlay && ITL.overlay.element) {
          ITL.overlay.element.style.setProperty('--drag-x', ITL.settings.dragX + 'px');
          ITL.overlay.element.style.setProperty('--drag-y', ITL.settings.dragY + 'px');
        }
        
        if (ITL.overlay && typeof ITL.overlay.applyThemeAndStyles === 'function') {
          ITL.overlay.applyThemeAndStyles();
        }
        if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
          ITL.overlay.updateVisibility();
        }
        
        if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
          ITL.history.ensureOverlay();
          if (ITL.history.overlay) {
            ITL.history.overlay.style.display = ITL.settings.showHistory ? 'flex' : 'none';
            ITL.history.overlay.style.setProperty('--drag-x', ITL.settings.historyDragX + 'px');
            ITL.history.overlay.style.setProperty('--drag-y', ITL.settings.historyDragY + 'px');
            if (typeof ITL.history.render === 'function') {
              ITL.history.render();
            }
          }
        }
      });
    } catch (e) {
      console.warn("[ImmerseTL] applySettings failed:", e);
    }
  }

  // Real-time Storage Listener
  try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.isSubtitleOverlayEnabled !== undefined) {
          ITL.settings.isSubtitleOverlayEnabled = changes.isSubtitleOverlayEnabled.newValue;
          if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
            ITL.overlay.updateVisibility();
          }
        }
        if (changes.fontSize) ITL.settings.fontSize = changes.fontSize.newValue;
        if (changes.bgOpacity) ITL.settings.bgOpacity = changes.bgOpacity.newValue;
        if (changes.bgBlur) ITL.settings.bgBlur = changes.bgBlur.newValue;
        if (changes.fontColor) ITL.settings.fontColor = changes.fontColor.newValue || '#ffffff';
        if (changes.subtitleTheme) ITL.settings.subtitleTheme = changes.subtitleTheme.newValue || 'default';
        if (changes.translateMode) ITL.settings.translateMode = changes.translateMode.newValue || 'default';
        
        if (changes.dragX && ITL.overlay && ITL.overlay.element) {
          ITL.settings.dragX = changes.dragX.newValue;
          ITL.overlay.element.style.setProperty('--drag-x', ITL.settings.dragX + 'px');
        }
        if (changes.dragY && ITL.overlay && ITL.overlay.element) {
          ITL.settings.dragY = changes.dragY.newValue;
          ITL.overlay.element.style.setProperty('--drag-y', ITL.settings.dragY + 'px');
        }
        if (changes.showHistory !== undefined) {
          ITL.settings.showHistory = changes.showHistory.newValue;
          if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
            ITL.history.ensureOverlay();
            if (ITL.history.overlay) {
              ITL.history.overlay.style.display = ITL.settings.showHistory ? 'flex' : 'none';
              ITL.history.render();
            }
          }
        }
        if (changes.historyDragX) {
          ITL.settings.historyDragX = changes.historyDragX.newValue;
          if (ITL.history && ITL.history.overlay) {
            ITL.history.overlay.style.setProperty('--drag-x', ITL.settings.historyDragX + 'px');
          }
        }
        if (changes.historyDragY) {
          ITL.settings.historyDragY = changes.historyDragY.newValue;
          if (ITL.history && ITL.history.overlay) {
            ITL.history.overlay.style.setProperty('--drag-y', ITL.settings.historyDragY + 'px');
          }
        }
        
        if (ITL.overlay && typeof ITL.overlay.applyThemeAndStyles === 'function') {
          ITL.overlay.applyThemeAndStyles(true);
        }
      }
    });
  } catch (e) {
    console.warn("[ImmerseTL] storage.onChanged listener failed:", e);
  }

  // Real-time messages from popup & shortcuts
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if ((request.action === 'updateLiveSettings' || request.action === 'applyPreset') && (request.settings || request.preset)) {
        const s = request.settings || request.preset;
        if (s.isSubtitleOverlayEnabled !== undefined) {
          ITL.settings.isSubtitleOverlayEnabled = s.isSubtitleOverlayEnabled;
          if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
            ITL.overlay.updateVisibility();
          }
        }
        if (s.fontSize !== undefined) ITL.settings.fontSize = s.fontSize;
        if (s.bgOpacity !== undefined) ITL.settings.bgOpacity = s.bgOpacity;
        if (s.bgBlur !== undefined) ITL.settings.bgBlur = s.bgBlur;
        if (s.fontColor !== undefined) ITL.settings.fontColor = s.fontColor;
        if (s.subtitleTheme !== undefined) ITL.settings.subtitleTheme = s.subtitleTheme;
        if (s.translateMode !== undefined) ITL.settings.translateMode = s.translateMode;
        if (s.activePreset !== undefined) ITL.settings.activePreset = s.activePreset;
        if (s.showHistory !== undefined) {
          ITL.settings.showHistory = s.showHistory;
          if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
            ITL.history.ensureOverlay();
            if (ITL.history.overlay) {
              ITL.history.overlay.style.display = ITL.settings.showHistory ? 'flex' : 'none';
              ITL.history.render();
            }
          }
        }
        if (s.resetPos) {
          ITL.settings.dragX = 0;
          ITL.settings.dragY = 0;
          ITL.settings.historyDragX = 0;
          ITL.settings.historyDragY = 0;
          if (ITL.overlay && ITL.overlay.element) {
            ITL.overlay.element.style.setProperty('--drag-x', '0px');
            ITL.overlay.element.style.setProperty('--drag-y', '0px');
          }
          if (ITL.history && ITL.history.overlay) {
            ITL.history.overlay.style.setProperty('--drag-x', '0px');
            ITL.history.overlay.style.setProperty('--drag-y', '0px');
          }
        }
        if (ITL.overlay && typeof ITL.overlay.applyThemeAndStyles === 'function') {
          ITL.overlay.applyThemeAndStyles(true);
        }
        sendResponse({ success: true });
      } else if (request.command === 'toggle_history') {
        chrome.storage.local.get({ showHistory: false }, (items) => {
          const nextState = !items.showHistory;
          chrome.storage.local.set({ showHistory: nextState });
          ITL.settings.showHistory = nextState;
          if (ITL.history && typeof ITL.history.ensureOverlay === 'function') {
            ITL.history.ensureOverlay();
            if (ITL.history.overlay) {
              ITL.history.overlay.style.display = nextState ? 'flex' : 'none';
              ITL.history.render();
            }
          }
        });
      } else if (request.command === 'toggle_subtitle') {
        chrome.storage.local.get({ isSubtitleOverlayEnabled: true }, (items) => {
          const nextState = items.isSubtitleOverlayEnabled === undefined ? false : !items.isSubtitleOverlayEnabled;
          chrome.storage.local.set({ isSubtitleOverlayEnabled: nextState });
          ITL.settings.isSubtitleOverlayEnabled = nextState;
          if (ITL.overlay && typeof ITL.overlay.updateVisibility === 'function') {
            ITL.overlay.updateVisibility();
          }
        });
      }
    });
  } catch (e) {
    console.warn("[ImmerseTL] onMessage listener failed:", e);
  }

  ITL.applySettings = applySettings;
})(window.ImmerseTL);
