// common.js - Shared configuration and defaults

const DEFAULT_SETTINGS = Object.freeze({
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
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function validateSettings(settings) {
  return {
    isSubtitleOverlayEnabled: typeof settings.isSubtitleOverlayEnabled === 'boolean' ? settings.isSubtitleOverlayEnabled : DEFAULT_SETTINGS.isSubtitleOverlayEnabled,
    fontSize: typeof settings.fontSize === 'number' ? clamp(settings.fontSize, 10, 72) : DEFAULT_SETTINGS.fontSize,
    bgOpacity: typeof settings.bgOpacity === 'number' ? clamp(settings.bgOpacity, 0, 100) : DEFAULT_SETTINGS.bgOpacity,
    bgBlur: typeof settings.bgBlur === 'number' ? clamp(settings.bgBlur, 0, 50) : DEFAULT_SETTINGS.bgBlur,
    fontColor: typeof settings.fontColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(settings.fontColor) ? settings.fontColor : DEFAULT_SETTINGS.fontColor,
    subtitleTheme: typeof settings.subtitleTheme === 'string' ? settings.subtitleTheme : DEFAULT_SETTINGS.subtitleTheme,
    translateMode: typeof settings.translateMode === 'string' ? settings.translateMode : DEFAULT_SETTINGS.translateMode,
    showHistory: typeof settings.showHistory === 'boolean' ? settings.showHistory : DEFAULT_SETTINGS.showHistory,
    dragX: typeof settings.dragX === 'number' ? settings.dragX : DEFAULT_SETTINGS.dragX,
    dragY: typeof settings.dragY === 'number' ? settings.dragY : DEFAULT_SETTINGS.dragY,
    historyDragX: typeof settings.historyDragX === 'number' ? settings.historyDragX : DEFAULT_SETTINGS.historyDragX,
    historyDragY: typeof settings.historyDragY === 'number' ? settings.historyDragY : DEFAULT_SETTINGS.historyDragY
  };
}

// Support for both ES modules and global script loading
if (typeof window !== 'undefined') {
  window.ImmerseTL_Common = {
    DEFAULT_SETTINGS,
    validateSettings
  };
}
