// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Apply i18n translations
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const message = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
    if (message) {
      if (el.tagName === 'OPTION') {
        el.textContent = message;
      } else {
        el.innerHTML = message;
      }
    }
  });

  // Numeric Controls & Sliders
  const fontSizeSlider = document.getElementById('fontSize');
  const fontSizeInput = document.getElementById('fontSizeInput');

  const bgOpacitySlider = document.getElementById('bgOpacity');
  const bgOpacityInput = document.getElementById('bgOpacityInput');

  const bgBlurSlider = document.getElementById('bgBlur');
  const bgBlurInput = document.getElementById('bgBlurInput');

  // Colors & Themes
  const fontColorSelect = document.getElementById('fontColor');
  const customColorPicker = document.getElementById('customColorPicker');
  const colorPreviewDot = document.getElementById('colorPreviewDot');
  const subtitleThemeSelect = document.getElementById('subtitleTheme');
  const themePreview = document.getElementById('themePreview');

  // Modes & Toggles
  const enableSubtitleCheckbox = document.getElementById('enableSubtitle');
  const translateModeSelect = document.getElementById('translateMode');
  const showHistoryCheckbox = document.getElementById('showHistory');
  const openShortcutsBtn = document.getElementById('openShortcutsBtn');
  const resetPosBtn = document.getElementById('resetPosBtn');

  // Helper: Update theme preview appearance & text color
  function updateThemePreview(themeName, color) {
    if (!themePreview) return;
    themePreview.className = 'theme-preview-box';
    if (themeName && themeName !== 'default') {
      themePreview.classList.add('preview-' + themeName);
    }
    const previewText = themePreview.querySelector('.theme-preview-text');
    if (previewText) {
      previewText.style.color = color || (customColorPicker ? customColorPicker.value : '#ffffff');
    }
  }

  // Helper: Update color controls (dropdown, swatch, preview)
  function setColorState(color) {
    if (!color) return;
    if (customColorPicker) customColorPicker.value = color;
    if (colorPreviewDot) colorPreviewDot.style.backgroundColor = color;

    // Check if matches an existing dropdown option
    let matched = false;
    if (fontColorSelect) {
      for (let i = 0; i < fontColorSelect.options.length; i++) {
        if (fontColorSelect.options[i].value.toLowerCase() === color.toLowerCase()) {
          fontColorSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        fontColorSelect.value = 'custom';
      }
    }

    const currentTheme = subtitleThemeSelect ? subtitleThemeSelect.value : 'default';
    updateThemePreview(currentTheme, color);
  }

  // Helper: Notify active YouTube tab directly for 0ms latency updates
  function notifyActiveTab(payload) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateLiveSettings',
            settings: payload
          }, () => {
            if (chrome.runtime.lastError) { /* ignore error when not on YouTube */ }
          });
        }
      });
    } catch (e) {}
  }

  // Load saved settings or use defaults
  const defaultState = (typeof window !== 'undefined' && window.ImmerseTL_Common) 
    ? window.ImmerseTL_Common.DEFAULT_SETTINGS 
    : {
        isSubtitleOverlayEnabled: true,
        fontSize: 28,
        bgOpacity: 60,
        bgBlur: 8,
        fontColor: '#ffffff',
        showHistory: false,
        translateMode: 'default',
        subtitleTheme: 'default'
      };

  chrome.storage.local.get(defaultState, (rawItems) => {
    const items = (typeof window !== 'undefined' && window.ImmerseTL_Common && typeof window.ImmerseTL_Common.validateSettings === 'function')
      ? window.ImmerseTL_Common.validateSettings(rawItems)
      : rawItems;

    // Subtitle Enabled Toggle
    if (enableSubtitleCheckbox) enableSubtitleCheckbox.checked = items.isSubtitleOverlayEnabled !== undefined ? items.isSubtitleOverlayEnabled : true;

    // Font Size
    if (fontSizeSlider) fontSizeSlider.value = items.fontSize;
    if (fontSizeInput) fontSizeInput.value = items.fontSize;

    // Background Opacity
    if (bgOpacitySlider) bgOpacitySlider.value = items.bgOpacity;
    if (bgOpacityInput) bgOpacityInput.value = items.bgOpacity;

    // Blur
    if (bgBlurSlider) bgBlurSlider.value = items.bgBlur;
    if (bgBlurInput) bgBlurInput.value = items.bgBlur;

    // Color & Theme
    setColorState(items.fontColor);
    if (subtitleThemeSelect) subtitleThemeSelect.value = items.subtitleTheme;
    updateThemePreview(items.subtitleTheme, items.fontColor);

    // Toggles & Modes
    if (showHistoryCheckbox) showHistoryCheckbox.checked = items.showHistory;
    if (translateModeSelect) translateModeSelect.value = items.translateMode;
  });

  // --- BIDIRECTIONAL CONTROLS SYNC ---

  // Helper function to bind slider + number input
  function bindNumericControl(slider, input, min, max, storageKey) {
    if (!slider || !input) return;

    // Slider -> Input
    slider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      input.value = val;
      chrome.storage.local.set({ [storageKey]: val });
      notifyActiveTab({ [storageKey]: val });
    });

    // Input -> Slider
    const handleInputChange = (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) return;
      if (val < min) val = min;
      if (val > max) val = max;
      
      slider.value = val;
      chrome.storage.local.set({ [storageKey]: val });
      notifyActiveTab({ [storageKey]: val });
    };

    input.addEventListener('input', handleInputChange);
    input.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < min) val = min;
      if (val > max) val = max;
      input.value = val;
      slider.value = val;
      chrome.storage.local.set({ [storageKey]: val });
      notifyActiveTab({ [storageKey]: val });
    });
  }

  // Bind Font Size (10px - 64px)
  bindNumericControl(fontSizeSlider, fontSizeInput, 10, 64, 'fontSize');

  // Bind Opacity (0% - 100%)
  bindNumericControl(bgOpacitySlider, bgOpacityInput, 0, 100, 'bgOpacity');

  // Bind Blur (0px - 30px)
  bindNumericControl(bgBlurSlider, bgBlurInput, 0, 30, 'bgBlur');

  // --- COLOR CONTROLS ---

  // Dropdown select change
  if (fontColorSelect) {
    fontColorSelect.addEventListener('change', (e) => {
      let color = e.target.value;
      if (color === 'custom') {
        // Open native color picker dialog
        if (customColorPicker) {
          customColorPicker.click();
          color = customColorPicker.value;
        }
      } else {
        setColorState(color);
        chrome.storage.local.set({ fontColor: color });
        notifyActiveTab({ fontColor: color });
      }
    });
  }

  // Custom Color Picker input / change
  if (customColorPicker) {
    const handleCustomColor = (e) => {
      const color = e.target.value;
      setColorState(color);
      chrome.storage.local.set({ fontColor: color });
      notifyActiveTab({ fontColor: color });
    };
    customColorPicker.addEventListener('input', handleCustomColor);
    customColorPicker.addEventListener('change', handleCustomColor);
  }

  // --- THEME SELECT ---
  if (subtitleThemeSelect) {
    subtitleThemeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      chrome.storage.local.set({ subtitleTheme: theme });
      updateThemePreview(theme, customColorPicker ? customColorPicker.value : '#ffffff');
      notifyActiveTab({ subtitleTheme: theme });
    });
  }

  // --- TOGGLES & MODES ---
  if (enableSubtitleCheckbox) {
    enableSubtitleCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ isSubtitleOverlayEnabled: checked });
      notifyActiveTab({ isSubtitleOverlayEnabled: checked });
    });
  }

  if (showHistoryCheckbox) {
    showHistoryCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ showHistory: checked });
      notifyActiveTab({ showHistory: checked });
    });
  }


  if (translateModeSelect) {
    translateModeSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      chrome.storage.local.set({ translateMode: mode });
      notifyActiveTab({ translateMode: mode });
    });
  }

  // --- ACTION BUTTONS ---
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  if (resetPosBtn) {
    resetPosBtn.addEventListener('click', () => {
      chrome.storage.local.set({ dragX: 0, dragY: 0, historyDragX: 0, historyDragY: 0 }, () => {
        notifyActiveTab({ resetPos: true });
        const originalText = resetPosBtn.innerHTML;
        resetPosBtn.textContent = chrome.i18n.getMessage('btnResetPosDone') || "Posisi Direset!";
        setTimeout(() => resetPosBtn.innerHTML = originalText, 2000);
      });
    });
  }
});
