// common.js - Shared configuration, presets, and validator

const PRESETS = Object.freeze({
  cinema: {
    key: 'cinema',
    name: 'Cinema',
    icon: '🎬',
    description: 'High contrast movie experience with solid dark backdrop',
    settings: {
      subtitleTheme: 'cinema',
      fontSize: 28,
      fontColor: '#ffffff',
      bgOpacity: 92,
      bgBlur: 0,
      translateMode: 'default',
      isSubtitleOverlayEnabled: true
    }
  },
  comicHeist: {
    key: 'comicHeist',
    name: 'Comic Heist',
    icon: '🎭',
    description: 'Stylized comic/manga look inspired by Persona 5',
    settings: {
      subtitleTheme: 'retro',
      fontSize: 30,
      fontColor: '#ffffff',
      bgOpacity: 88,
      bgBlur: 0,
      translateMode: 'default',
      isSubtitleOverlayEnabled: true
    }
  },
  focusLearning: {
    key: 'focusLearning',
    name: 'Focus Learn',
    icon: '🎓',
    description: 'Dual subtitle with golden Romaji for language learners',
    settings: {
      subtitleTheme: 'default',
      fontSize: 26,
      fontColor: '#ffd700',
      bgOpacity: 75,
      bgBlur: 10,
      translateMode: 'dual_id',
      isSubtitleOverlayEnabled: true
    }
  },
  neonCity: {
    key: 'neonCity',
    name: 'Neon City',
    icon: '🌆',
    description: 'Vibrant cyberpunk neon glow with electric cyan accents',
    settings: {
      subtitleTheme: 'neon',
      fontSize: 28,
      fontColor: '#00ffff',
      bgOpacity: 85,
      bgBlur: 6,
      translateMode: 'default',
      isSubtitleOverlayEnabled: true
    }
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal Glass',
    icon: '🪟',
    description: 'Sleek frosted glass look that preserves video visibility',
    settings: {
      subtitleTheme: 'default',
      fontSize: 24,
      fontColor: '#ffffff',
      bgOpacity: 35,
      bgBlur: 14,
      translateMode: 'default',
      isSubtitleOverlayEnabled: true
    }
  },
  accessibility: {
    key: 'accessibility',
    name: 'Accessibility',
    icon: '👁️',
    description: 'Large high-visibility text on maximum opacity background',
    settings: {
      subtitleTheme: 'cinema',
      fontSize: 36,
      fontColor: '#ffd700',
      bgOpacity: 100,
      bgBlur: 0,
      translateMode: 'default',
      isSubtitleOverlayEnabled: true
    }
  }
});

const DEFAULT_SETTINGS = Object.freeze({
  isSubtitleOverlayEnabled: true,
  fontSize: 28,
  bgOpacity: 60,
  bgBlur: 8,
  fontColor: '#ffffff',
  subtitleTheme: 'default',
  translateMode: 'default',
  showHistory: false,
  activePreset: 'custom',
  customPresets: {},
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
    activePreset: typeof settings.activePreset === 'string' ? settings.activePreset : DEFAULT_SETTINGS.activePreset,
    customPresets: typeof settings.customPresets === 'object' && settings.customPresets !== null ? settings.customPresets : DEFAULT_SETTINGS.customPresets,
    dragX: typeof settings.dragX === 'number' ? settings.dragX : DEFAULT_SETTINGS.dragX,
    dragY: typeof settings.dragY === 'number' ? settings.dragY : DEFAULT_SETTINGS.dragY,
    historyDragX: typeof settings.historyDragX === 'number' ? settings.historyDragX : DEFAULT_SETTINGS.historyDragX,
    historyDragY: typeof settings.historyDragY === 'number' ? settings.historyDragY : DEFAULT_SETTINGS.historyDragY
  };
}

// Support for both ES modules and global script loading
if (typeof window !== 'undefined') {
  window.ImmerseTL_Common = {
    PRESETS,
    DEFAULT_SETTINGS,
    validateSettings
  };
}
