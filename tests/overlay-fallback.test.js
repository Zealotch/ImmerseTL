const test = require('node:test');
const assert = require('node:assert');

// Mock DOM
function createMockElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    style: {
      setProperty: function(k, v) { this[k] = v; },
      opacity: '0',
      transform: ''
    },
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    className: '',
    innerHTML: '',
    appendChild: function(child) { this.children = this.children || []; this.children.push(child); },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    remove: function() {}
  };
}

let mockContainer = createMockElement('div');
mockContainer.id = 'yt-smart-translate-overlay';

global.document = {
  getElementById: (id) => {
    if (id === 'yt-smart-translate-overlay') return mockContainer;
    return null;
  },
  createElement: (tag) => createMockElement(tag),
  querySelector: () => mockContainer,
  documentElement: {
    classList: { add: () => {}, remove: () => {} }
  }
};

global.window = {};
window.ImmerseTL = window.ImmerseTL || {};

// Load dependencies
require('../content/caption-processor.js');
require('../content/theme-renderer.js');
require('../content/overlay.js');

test('Overlay Smart Fallback on Error', async (t) => {
  const overlay = window.ImmerseTL.overlay;
  
  await t.test('Fallback displays original text and badge when translation fails', async () => {
    window.ImmerseTL.settings = {
      isSubtitleOverlayEnabled: true,
      targetLang: 'id',
      translateMode: 'default',
      subtitleTheme: 'wuwa',
      fontColor: '#ffffff'
    };

    // Mock translation trigger to simulate network failure (e.g. 429 rate limit)
    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: (params) => {
        // Immediately fire onError to simulate failure
        if (typeof params.onError === 'function') {
          params.onError();
        }
      }
    };

    window.ImmerseTL.translator = {
      getCachedTranslation: () => null,
      highlightSafeText: (t) => t
    };

    // Call updateCustomSubtitle
    await overlay.updateCustomSubtitle("Hello world from live stream", true, false, false);

    const textEl = overlay.currentTextElement;
    assert.ok(textEl, 'currentTextElement should be created');
    assert.strictEqual(textEl.style.opacity, '1', 'Fallback should make subtitle visible (opacity 1)');
    assert.ok(textEl.innerHTML.includes('Hello world from live stream'), 'Fallback must contain original speech text');
    assert.ok(textEl.innerHTML.includes('[Asli]'), 'Fallback must contain [Asli] indicator badge');
    assert.ok(textEl.innerHTML.includes('itl-wuwa-container'), 'Fallback must preserve theme structure');
  });

  await t.test('Fallback in dual subtitle mode preserves both tracks', async () => {
    window.ImmerseTL.settings = {
      isSubtitleOverlayEnabled: true,
      targetLang: 'id',
      translateMode: 'dual',
      subtitleTheme: 'default',
      fontColor: '#ffffff'
    };

    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: (params) => {
        if (typeof params.onError === 'function') {
          params.onError();
        }
      }
    };

    await overlay.updateCustomSubtitle("Konbanwa minna", true, false, false);

    const textEl = overlay.currentTextElement;
    assert.ok(textEl.innerHTML.includes('Konbanwa minna'), 'Must contain speech text in dual mode');
    assert.ok(textEl.innerHTML.includes('[Asli]'), 'Must contain badge in dual mode');
  });

  await t.test('Consecutive cues with forceRerender do not leak old translation to new cue', async () => {
    window.ImmerseTL.settings = {
      isSubtitleOverlayEnabled: true,
      targetLang: 'id',
      translateMode: 'dual',
      subtitleTheme: 'default',
      fontColor: '#ffffff'
    };

    // Cue 1 translates successfully
    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: (params) => {
        if (typeof params.onResult === 'function') {
          params.onResult({ translation: 'Selamat pagi', sourceLang: 'en', romaji: '' });
        }
      }
    };
    await overlay.updateCustomSubtitle("Good morning", true, false, false);
    assert.ok(overlay.currentTextElement.innerHTML.includes('Selamat pagi'), 'Cue 1 translated');

    // Cue 2 arrives and stabilizes, network is still in-flight
    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: () => {} // In-flight, does not return yet
    };
    await overlay.updateCustomSubtitle("How are you?", true, false, false);

    // Verify that Cue 2 does NOT display Cue 1 translation ("Selamat pagi") under "How are you?"
    const html = overlay.currentTextElement.innerHTML;
    const hasOldTranslationUnderNewText = html.includes('How are you?') && html.includes('Selamat pagi');
    assert.strictEqual(hasOldTranslationUnderNewText, false, 'Cue 2 must NOT show Cue 1 translation');
  });

  await t.test('Instant theme change on same cue re-renders translation without network request', async () => {
    window.ImmerseTL.settings = {
      isSubtitleOverlayEnabled: true,
      targetLang: 'id',
      translateMode: 'default',
      subtitleTheme: 'default',
      fontColor: '#ffffff'
    };

    // Cue translates
    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: (params) => {
        params.onResult({ translation: 'Terima kasih', sourceLang: 'en', romaji: '' });
      }
    };
    await overlay.updateCustomSubtitle("Thank you", true, false, false);
    assert.ok(overlay.currentTextElement.innerHTML.includes('Terima kasih'));

    // Switch theme to Persona 5 (comicHeist) - network trigger should NOT be called because it re-renders instantly from lastTransData
    let networkCalled = false;
    window.ImmerseTL.translationTrigger = {
      scheduleTranslation: () => { networkCalled = true; }
    };
    window.ImmerseTL.settings.subtitleTheme = 'comicHeist';
    await overlay.updateCustomSubtitle("Thank you", true, false, false);

    assert.strictEqual(networkCalled, false, 'Instant theme switch must not trigger network');
    assert.ok(overlay.currentTextElement.innerHTML.includes('itl-p5-dialog'), 'Re-rendered with new p5 theme');
    assert.ok(overlay.currentTextElement.innerHTML.includes('Terima kasih'), 'Preserved translation text');
  });
});
