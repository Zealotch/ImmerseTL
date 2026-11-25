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
  const renamePresetBtn = document.getElementById('renamePresetBtn');
  const deletePresetBtn = document.getElementById('deletePresetBtn');
  let customPresets = {};

  const PRESET_ICONS = ['🔥', '✨', '💎', '🚀', '🔮', '🧩', '⚡', '🌙', '🌊', '🎨', '🌟', '❄️'];

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
  const animationLevelSelect = document.getElementById('animationLevel');
  const themePreview = document.getElementById('themePreview');

  // Modes & Toggles
  const enableSubtitleCheckbox = document.getElementById('enableSubtitle');
  const useNativeTranslationCheckbox = document.getElementById('useNativeTranslation');
  const showHistoryCheckbox = document.getElementById('showHistory');
  const isFreeFloatingCheckbox = document.getElementById('isFreeFloating');
  const wordGlowEnabledCheckbox = document.getElementById('wordGlowEnabled');
  const autoEmojiEnabledCheckbox = document.getElementById('autoEmojiEnabled');
  const typewriterEffectCheckbox = document.getElementById('typewriterEffect');
  const emotionDetectionCheckbox = document.getElementById('emotionDetection');
  const mangaSfxEnabledCheckbox = document.getElementById('mangaSfxEnabled');
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
      option.textContent = `${preset.icon || '⭐'} ${preset.name}`;
      myPresetsGroup.appendChild(option);
    }
  }

  // Helper: Update Preset UI Active State
  function updatePresetUI(presetKey) {
    if (presetDropdown) {
      presetDropdown.value = presetKey || 'custom';
    }
    if (deletePresetBtn && renamePresetBtn) {
      if (presetKey && presetKey !== 'custom' && customPresets[presetKey]) {
        deletePresetBtn.style.display = 'inline-flex';
        renamePresetBtn.style.display = 'inline-flex';
      } else {
        deletePresetBtn.style.display = 'none';
        renamePresetBtn.style.display = 'none';
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
    if (animationLevelSelect) animationLevelSelect.value = items.animationLevel || 'full';
    if (document.getElementById('target-lang')) document.getElementById('target-lang').value = items.targetLang || 'id';
    if (document.getElementById('translate-mode')) document.getElementById('translate-mode').value = items.translateMode || 'default';
    setColorState(items.fontColor);
    
    if (enableSubtitleCheckbox) enableSubtitleCheckbox.checked = items.isSubtitleOverlayEnabled;
    if (useNativeTranslationCheckbox) useNativeTranslationCheckbox.checked = items.useNativeTranslation === true;
    if (showHistoryCheckbox) showHistoryCheckbox.checked = items.showHistory;
    if (isFreeFloatingCheckbox) isFreeFloatingCheckbox.checked = items.isFreeFloating === true;
    if (wordGlowEnabledCheckbox) wordGlowEnabledCheckbox.checked = items.wordGlowEnabled !== false;
    if (autoEmojiEnabledCheckbox) autoEmojiEnabledCheckbox.checked = items.autoEmojiEnabled === true;
    if (typewriterEffectCheckbox) typewriterEffectCheckbox.checked = items.typewriterEffect === true;
    if (emotionDetectionCheckbox) emotionDetectionCheckbox.checked = items.emotionDetection === true;
    if (mangaSfxEnabledCheckbox) mangaSfxEnabledCheckbox.checked = items.mangaSfxEnabled === true;

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

  if (emotionDetectionCheckbox) {
    emotionDetectionCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ emotionDetection: checked });
      notifyActiveTab({ emotionDetection: checked });
    });
  }

  if (mangaSfxEnabledCheckbox) {
    mangaSfxEnabledCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ mangaSfxEnabled: checked });
      notifyActiveTab({ mangaSfxEnabled: checked });
    });
  }

  // --- TAB SWITCHING LOGIC ---
  const modalOverlay = document.getElementById('customModalOverlay');
  const modalMessage = document.getElementById('modalMessage');
  const modalInput = document.getElementById('modalInput');
  const modalBtnCancel = document.getElementById('modalBtnCancel');
  const modalBtnConfirm = document.getElementById('modalBtnConfirm');
  
  function showCustomModal(options, callback) {
    modalMessage.textContent = options.message;
    
    if (options.type === 'prompt') {
      modalInput.style.display = 'block';
      modalInput.value = options.defaultValue || '';
      modalInput.placeholder = "Ketik di sini...";
    } else {
      modalInput.style.display = 'none';
      modalInput.value = '';
    }
    
    modalOverlay.classList.add('show');
    if (options.type === 'prompt') {
      modalInput.focus();
    }
    
    // Cleanup listeners
    const cleanup = () => {
      modalOverlay.classList.remove('show');
      modalBtnConfirm.removeEventListener('click', onConfirm);
      modalBtnCancel.removeEventListener('click', onCancel);
    };
    
    const onConfirm = () => {
      cleanup();
      if (options.type === 'prompt') {
        callback(modalInput.value);
      } else {
        callback(true);
      }
    };
    
    const onCancel = () => {
      cleanup();
      if (options.type === 'prompt') {
        callback(null);
      } else {
        callback(false);
      }
    };
    
    modalBtnConfirm.addEventListener('click', onConfirm);
    modalBtnCancel.addEventListener('click', onCancel);
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      showCustomModal({
        type: 'prompt',
        message: chrome.i18n.getMessage("promptPresetName") || "Masukkan nama preset baru:"
      }, (name) => {
        if (!name || !name.trim()) return;
        
        const key = 'custom_' + Date.now();
        const randomIcon = PRESET_ICONS[Math.floor(Math.random() * PRESET_ICONS.length)];
        const newPreset = {
          key: key,
          name: name.trim(),
          icon: randomIcon,
          settings: {
            subtitleTheme: subtitleThemeSelect.value,
            fontColor: fontColorSelect.value === 'custom' ? customColorPicker.value : fontColorSelect.value,
            bgOpacity: parseInt(bgOpacitySlider.value, 10),
            bgBlur: parseInt(bgBlurSlider.value, 10),
            animationLevel: animationLevelSelect ? animationLevelSelect.value : 'full',
            isSubtitleOverlayEnabled: enableSubtitleCheckbox.checked
          }
        };
        
        customPresets[key] = newPreset;
        chrome.storage.local.set({ customPresets: customPresets }, () => {
          populateCustomPresetsUI();
          applyPreset(key);
        });
      });
    });
  }

  if (renamePresetBtn) {
    renamePresetBtn.addEventListener('click', () => {
      const key = presetDropdown.value;
      if (key && customPresets[key]) {
        showCustomModal({
          type: 'prompt',
          message: "Ubah nama preset ini:",
          defaultValue: customPresets[key].name
        }, (newName) => {
          if (newName && newName.trim()) {
            customPresets[key].name = newName.trim();
            chrome.storage.local.set({ customPresets: customPresets }, () => {
              populateCustomPresetsUI();
              updatePresetUI(key);
            });
          }
        });
      }
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const key = presetDropdown.value;
      if (key && customPresets[key]) {
        showCustomModal({
          type: 'confirm',
          message: `Hapus preset "${customPresets[key].name}"?`
        }, (confirmed) => {
          if (confirmed) {
            delete customPresets[key];
            chrome.storage.local.set({ customPresets: customPresets }, () => {
              populateCustomPresetsUI();
              markAsCustomPreset();
            });
          }
        });
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
  if (useNativeTranslationCheckbox) {
    useNativeTranslationCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ useNativeTranslation: checked });
      notifyActiveTab({ useNativeTranslation: checked });
    });
  }

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

  if (isFreeFloatingCheckbox) {
    isFreeFloatingCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ isFreeFloating: checked });
      notifyActiveTab({ isFreeFloating: checked });
    });
  }

  if (wordGlowEnabledCheckbox) {
    wordGlowEnabledCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ wordGlowEnabled: checked });
      notifyActiveTab({ wordGlowEnabled: checked });
    });
  }

  if (autoEmojiEnabledCheckbox) {
    autoEmojiEnabledCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ autoEmojiEnabled: checked });
      notifyActiveTab({ autoEmojiEnabled: checked });
    });
  }

  if (typewriterEffectCheckbox) {
    typewriterEffectCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ typewriterEffect: checked });
      notifyActiveTab({ typewriterEffect: checked });
    });
  }

  // --- GLOBAL TRANSLATION SETTINGS ---
  const targetLangSelect = document.getElementById('target-lang');
  const translateModeSelect = document.getElementById('translate-mode');

  if (targetLangSelect) {
    targetLangSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ targetLang: e.target.value });
      notifyActiveTab({ targetLang: e.target.value });
    });
  }

  if (translateModeSelect) {
    translateModeSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ translateMode: e.target.value });
      notifyActiveTab({ translateMode: e.target.value });
    });
  }



  if (animationLevelSelect) {
    animationLevelSelect.addEventListener('change', (e) => {
      const lvl = e.target.value;
      chrome.storage.local.set({ animationLevel: lvl });
      notifyActiveTab({ animationLevel: lvl });
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

  // --- TAB NAVIGATION SYSTEM ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    try {
      chrome.storage.local.set({ lastActivePopupTab: tabId });
    } catch(e) {}
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) switchTab(targetTab);
    });
  });

  // Restore last active tab if remembered
  try {
    chrome.storage.local.get({ lastActivePopupTab: 'tab-general' }, (res) => {
      if (res && res.lastActivePopupTab) {
        // Fallback for old 'tab-display'
        if (res.lastActivePopupTab === 'tab-display') res.lastActivePopupTab = 'tab-general';
        switchTab(res.lastActivePopupTab);
      }
    });
  } catch (e) {}
});
