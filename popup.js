// popup.js - ImmerseTL Advanced Settings Controller & Quick Presets

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

  const PRESETS = (typeof window !== 'undefined' && window.ImmerseTL_Common) ? window.ImmerseTL_Common.PRESETS : {};

  // Quick Presets Elements
  const presetDropdown = document.getElementById('presetDropdown');
  const myPresetsGroup = document.getElementById('myPresetsGroup');
  const savePresetBtn = document.getElementById('savePresetBtn');
  const deletePresetBtn = document.getElementById('deletePresetBtn');
  let customPresets = {};

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
  function notifyActiveTab(payload, isPreset = false) {
    try {
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        if (tabs && tabs.length > 0) {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: isPreset ? 'applyPreset' : 'updateLiveSettings',
                settings: payload
              }, () => {
                if (chrome.runtime.lastError) { /* ignore error when not on YouTube */ }
              });
            }
          });
        }
      });
    } catch (e) {}
  }

  // Helper: Populate custom presets in dropdown
  function populateCustomPresetsUI() {
    if (!myPresetsGroup) return;
    myPresetsGroup.innerHTML = '';
    for (const [key, preset] of Object.entries(customPresets)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `⭐ ${preset.name}`;
      myPresetsGroup.appendChild(option);
    }
  }

  // Helper: Update Preset UI Active State
  function updatePresetUI(presetKey) {
    if (presetDropdown) {
      presetDropdown.value = presetKey || 'custom';
    }
    if (deletePresetBtn) {
      if (presetKey && presetKey !== 'custom' && customPresets[presetKey]) {
        deletePresetBtn.style.display = 'inline-flex';
      } else {
        deletePresetBtn.style.display = 'none';
      }
    }
  }

  // Flag user manual changes as 'custom' preset
  function markAsCustomPreset() {
    updatePresetUI('custom');
    chrome.storage.local.set({ activePreset: 'custom' });
    notifyActiveTab({ activePreset: 'custom' });
  }

  // Apply full preset batch in 1 single payload
  function applyPreset(presetKey) {
    let preset = (PRESETS && PRESETS[presetKey]) ? PRESETS[presetKey] : null;
    if (!preset && customPresets && customPresets[presetKey]) {
      preset = customPresets[presetKey];
    }
    if (!preset) return;
    
    // Copy settings so we can safely remove fontSize
    const s = Object.assign({}, preset.settings);
    
    // User requested font size to be preserved across theme/preset changes
    delete s.fontSize;

    // 1. Update UI controls simultaneously without triggering manual change hooks
    if (bgOpacitySlider) bgOpacitySlider.value = s.bgOpacity;
    if (bgOpacityInput) bgOpacityInput.value = s.bgOpacity;

    if (bgBlurSlider) bgBlurSlider.value = s.bgBlur;
    if (bgBlurInput) bgBlurInput.value = s.bgBlur;

    if (subtitleThemeSelect) subtitleThemeSelect.value = s.subtitleTheme;
    setColorState(s.fontColor);

    if (translateModeSelect) translateModeSelect.value = s.translateMode;
    if (enableSubtitleCheckbox) enableSubtitleCheckbox.checked = s.isSubtitleOverlayEnabled;

    updateThemePreview(s.subtitleTheme, s.fontColor);
    updatePresetUI(presetKey);

    // 2. Atomically save entire preset payload to storage
    const batchPayload = Object.assign({}, s, { activePreset: presetKey });
    chrome.storage.local.set(batchPayload, () => {
      // 3. Atomically notify tab in 1 message
      notifyActiveTab(batchPayload, true);
    });
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
        subtitleTheme: 'default',
        activePreset: 'custom'
      };

  // Load initial settings
  chrome.storage.local.get(window.ImmerseTL_Common.DEFAULT_SETTINGS, (items) => {
    customPresets = items.customPresets || {};
    populateCustomPresetsUI();

    if (fontSizeSlider) fontSizeSlider.value = items.fontSize;
    if (fontSizeInput) fontSizeInput.value = items.fontSize;

    if (bgOpacitySlider) bgOpacitySlider.value = items.bgOpacity;
    if (bgOpacityInput) bgOpacityInput.value = items.bgOpacity;

    if (bgBlurSlider) bgBlurSlider.value = items.bgBlur;
    if (bgBlurInput) bgBlurInput.value = items.bgBlur;

    if (subtitleThemeSelect) subtitleThemeSelect.value = items.subtitleTheme;
    setColorState(items.fontColor);
    
    if (translateModeSelect) translateModeSelect.value = items.translateMode;
    if (enableSubtitleCheckbox) enableSubtitleCheckbox.checked = items.isSubtitleOverlayEnabled;
    if (showHistoryCheckbox) showHistoryCheckbox.checked = items.showHistory;

    updateThemePreview(items.subtitleTheme, items.fontColor);
    updatePresetUI(items.activePreset);
  });

  // Attach event listeners for preset logic
  if (presetDropdown) {
    presetDropdown.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (presetKey !== 'custom') {
        applyPreset(presetKey);
      }
    });
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const name = prompt(chrome.i18n.getMessage("promptPresetName") || "Masukkan nama preset baru:");
      if (!name || !name.trim()) return;
      
      const key = 'custom_' + Date.now();
      const newPreset = {
        key: key,
        name: name.trim(),
        icon: '⭐',
        settings: {
          subtitleTheme: subtitleThemeSelect.value,
          fontColor: fontColorSelect.value === 'custom' ? customColorPicker.value : fontColorSelect.value,
          bgOpacity: parseInt(bgOpacitySlider.value, 10),
          bgBlur: parseInt(bgBlurSlider.value, 10),
          translateMode: translateModeSelect.value,
          isSubtitleOverlayEnabled: enableSubtitleCheckbox.checked
        }
      };
      
      customPresets[key] = newPreset;
      chrome.storage.local.set({ customPresets: customPresets }, () => {
        populateCustomPresetsUI();
        applyPreset(key);
      });
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const key = presetDropdown.value;
      if (key && customPresets[key]) {
        if (confirm(`Hapus preset "${customPresets[key].name}"?`)) {
          delete customPresets[key];
          chrome.storage.local.set({ customPresets: customPresets }, () => {
            populateCustomPresetsUI();
            markAsCustomPreset();
          });
        }
      }
    });
  }

  // --- BIDIRECTIONAL CONTROLS SYNC ---

  // Helper function to bind slider + number input
  function bindNumericControl(slider, input, min, max, storageKey) {
    if (!slider || !input) return;

    // Slider -> Input
    slider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      input.value = val;
      markAsCustomPreset();
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
      markAsCustomPreset();
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
      markAsCustomPreset();
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
        if (customColorPicker) {
          customColorPicker.click();
          color = customColorPicker.value;
        }
      } else {
        setColorState(color);
        markAsCustomPreset();
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
      markAsCustomPreset();
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
      markAsCustomPreset();
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
      markAsCustomPreset();
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
