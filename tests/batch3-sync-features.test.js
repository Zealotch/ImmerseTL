const test = require('node:test');
const assert = require('node:assert');

// Rich minimal DOM mock supporting classList, createTreeWalker, insertBefore, and querySelector
function createMockElement(tag = 'div') {
  const classes = new Set();
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    _innerHTML: '',
    get innerHTML() { return el._innerHTML; },
    set innerHTML(val) { el._innerHTML = val; },
    textContent: '',
    offsetWidth: 100,
    style: {
      setProperty: () => {},
      opacity: '1',
      display: 'flex',
      position: 'absolute',
      transform: '',
      marginLeft: '',
      marginTop: ''
    },
    dataset: {},
    children: [],
    parentElement: null,
    get parentNode() { return el.parentElement; },
    get firstChild() { return el.children[0] || null; },
    classList: {
      add: (...cls) => cls.forEach(c => classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      contains: (c) => classes.has(c)
    },
    querySelector: (sel) => {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return el.children.find(c => c.classList && c.classList.contains(cls)) || null;
      }
      return null;
    },
    querySelectorAll: () => [],
    appendChild: (child) => {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    insertBefore: (child, ref) => {
      child.parentElement = el;
      const idx = ref ? el.children.indexOf(ref) : -1;
      if (idx >= 0) el.children.splice(idx, 0, child);
      else el.children.unshift(child);
      return child;
    },
    removeChild: (child) => {
      el.children = el.children.filter(c => c !== child);
      child.parentElement = null;
      return child;
    },
    remove: () => {
      if (el.parentElement) el.parentElement.removeChild(el);
    }
  };
  return el;
}

const storageChangedListeners = [];
const runtimeMessageListeners = [];
const elementsById = new Map();

const mockDocEl = createMockElement('html');
const mockBody = createMockElement('body');

global.window = { ImmerseTL: {} };
global.NodeFilter = { SHOW_TEXT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
global.document = {
  documentElement: mockDocEl,
  body: mockBody,
  createElement: (tag) => {
    const el = createMockElement(tag);
    const origSetId = Object.getOwnPropertyDescriptor(el, 'id');
    let _id = '';
    Object.defineProperty(el, 'id', {
      get: () => _id,
      set: (v) => {
        if (_id) elementsById.delete(_id);
        _id = v;
        if (v) elementsById.set(v, el);
      }
    });
    return el;
  },
  getElementById: (id) => elementsById.get(id) || null,
  querySelector: (sel) => (sel === '.html5-video-player' || sel === '#movie_player') ? mockBody : null,
  querySelectorAll: () => [],
  createTreeWalker: () => ({ nextNode: () => null })
};

global.chrome = {
  runtime: {
    id: 'test-ext-id',
    lastError: null,
    onMessage: { addListener: (fn) => runtimeMessageListeners.push(fn) }
  },
  storage: {
    local: {
      get: (defaults, cb) => cb(Object.assign({}, defaults, (global.window.ImmerseTL && global.window.ImmerseTL.settings) || {})),
      set: () => {}
    },
    onChanged: { addListener: (fn) => storageChangedListeners.push(fn) }
  }
};

require('../common.js');
require('../content/settings.js');
require('../content/theme-renderer.js');
require('../content/overlay.js');

const ITL = global.window.ImmerseTL;

test('Batch 3: Settings Live-Sync & Overlay Feature Wiring', async (t) => {
  t.beforeEach(() => {
    ITL.overlay.clear();
    elementsById.clear();
    ITL.settings = Object.assign({}, global.window.ImmerseTL_Common.DEFAULT_SETTINGS);
  });

  await t.test('CASE 1: storage.onChanged live-syncs useNativeTranslation, typewriterEffect, emotionDetection, mangaSfxEnabled', () => {
    assert.ok(storageChangedListeners.length > 0, 'storage.onChanged listener registered');
    const listener = storageChangedListeners[0];

    listener({
      useNativeTranslation: { newValue: true },
      typewriterEffect: { newValue: true },
      emotionDetection: { newValue: true },
      mangaSfxEnabled: { newValue: true }
    }, 'local');

    assert.strictEqual(ITL.settings.useNativeTranslation, true);
    assert.strictEqual(ITL.settings.typewriterEffect, true);
    assert.strictEqual(ITL.settings.emotionDetection, true);
    assert.strictEqual(ITL.settings.mangaSfxEnabled, true);
  });

  await t.test('CASE 2: runtime.onMessage updateLiveSettings live-syncs all 4 feature toggles', () => {
    assert.ok(runtimeMessageListeners.length > 0, 'runtime.onMessage listener registered');
    const listener = runtimeMessageListeners[0];
    let resp = null;

    listener(
      {
        action: 'updateLiveSettings',
        settings: {
          useNativeTranslation: true,
          typewriterEffect: true,
          emotionDetection: true,
          mangaSfxEnabled: true
        }
      },
      {},
      (r) => { resp = r; }
    );

    assert.deepStrictEqual(resp, { success: true });
    assert.strictEqual(ITL.settings.useNativeTranslation, true);
    assert.strictEqual(ITL.settings.typewriterEffect, true);
    assert.strictEqual(ITL.settings.emotionDetection, true);
    assert.strictEqual(ITL.settings.mangaSfxEnabled, true);
  });

  await t.test('CASE 3: applyEmotionClasses attaches emotion-shout on "!" when emotionDetection is enabled', async () => {
    ITL.settings.emotionDetection = true;
    ITL.settings.useNativeTranslation = true;

    await ITL.overlay.updateCustomSubtitle('Watch out!', false, true, false);
    assert.ok(ITL.overlay.currentTextElement.classList.contains('emotion-shout'), 'emotion-shout class should be applied');

    ITL.settings.emotionDetection = false;
    await ITL.overlay.updateCustomSubtitle('Watch out!', true, false, false);
    assert.strictEqual(ITL.overlay.currentTextElement.classList.contains('emotion-shout'), false, 'emotion-shout class should be removed when disabled');
  });

  await t.test('CASE 4: spawnMangaSFX creates SFX elements inside #itl-manga-sfx-layer when enabled', async () => {
    ITL.settings.mangaSfxEnabled = true;
    ITL.settings.useNativeTranslation = true;

    await ITL.overlay.updateCustomSubtitle('[CRASH] Watch out!', false, true, false);

    const sfxLayer = elementsById.get('itl-manga-sfx-layer');
    assert.ok(sfxLayer, '#itl-manga-sfx-layer should be created');
    assert.strictEqual(sfxLayer.children.length, 1);
    assert.strictEqual(sfxLayer.children[0].textContent, 'CRASH');
  });

  await t.test('CASE 5: typewriterEffect runs on translation onResult even when animate=false (cueStabilizer.emit path)', async () => {
    ITL.settings.typewriterEffect = true;
    ITL.settings.useNativeTranslation = false;

    let treeWalkerCalled = false;
    const origCreateTreeWalker = global.document.createTreeWalker;
    global.document.createTreeWalker = () => {
      treeWalkerCalled = true;
      return { nextNode: () => null };
    };

    ITL.translator = {
      getCachedTranslation: () => null,
      highlightSafeText: (s) => s
    };
    ITL.translationTrigger = {
      scheduleTranslation: (params) => {
        params.onResult({ translation: 'Halo dunia', sourceLang: 'en', romaji: '' });
      }
    };

    // animate = false (exact call signature used by cueStabilizer.emit)
    await ITL.overlay.updateCustomSubtitle('Hello world', true, false, false);

    assert.strictEqual(treeWalkerCalled, true, 'applyTypewriterEffect should run on translated result even with animate=false');
    global.document.createTreeWalker = origCreateTreeWalker;
  });

  await t.test('CASE 6: cache-hit passes cachedTrans to ITL.history.update()', async () => {
    const historyCalls = [];
    const cachedObj = { translation: 'Selamat pagi', sourceLang: 'ja', romaji: 'Ohayou' };

    ITL.settings.useNativeTranslation = false;
    ITL.history = {
      ensureOverlay: () => {},
      update: (raw, transData) => historyCalls.push({ raw, transData })
    };
    ITL.translator = {
      getCachedTranslation: () => cachedObj,
      highlightSafeText: (s) => s
    };

    await ITL.overlay.updateCustomSubtitle('おはよう', false, true, false);

    assert.strictEqual(historyCalls.length, 1);
    assert.strictEqual(historyCalls[0].raw, 'おはよう');
    assert.deepStrictEqual(historyCalls[0].transData, cachedObj);
  });
});
