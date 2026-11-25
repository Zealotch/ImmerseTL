const test = require('node:test');
const assert = require('node:assert');

// Minimal DOM mocks
function createMockElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    style: {
      setProperty: () => {},
      opacity: '1',
      display: 'flex',
      position: 'absolute',
      transform: ''
    },
    dataset: {},
    children: [],
    parentElement: null,
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (child) => {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    remove: () => {
      if (el.parentElement) {
        el.parentElement.children = el.parentElement.children.filter(c => c !== el);
        el.parentElement = null;
      }
    }
  };
  return el;
}

const mockDocEl = createMockElement('html');
const mockBody = createMockElement('body');
const listeners = {};

global.window = {
  ImmerseTL: {},
  addEventListener: () => {}
};
global.document = {
  documentElement: mockDocEl,
  body: mockBody,
  fullscreenElement: null,
  createElement: (tag) => createMockElement(tag),
  getElementById: () => null,
  querySelector: () => mockBody,
  querySelectorAll: () => [],
  addEventListener: (evt, fn) => {
    listeners[evt] = listeners[evt] || [];
    listeners[evt].push(fn);
  }
};
global.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' });
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};

require('../content/caption-processor.js');
const cueStabilizer = require('../content/cue-stabilizer.js');
require('../content/overlay.js');
require('../content/caption-source.js');
const contentModule = require('../content/content.js');

test('Lifecycle Cleanup across SPA Navigation & Timers', async (t) => {
  await t.test('CASE 1: cueStabilizer.cleanup() clears pending timers without emitting phantom FINAL cue', async () => {
    let emitted = [];
    const origUpdate = window.ImmerseTL.overlay.updateCustomSubtitle;
    window.ImmerseTL.overlay.updateCustomSubtitle = (text, force, animate, bypass) => {
      if (!bypass) emitted.push(text);
    };

    cueStabilizer.process('Old video unfinished line');
    assert.strictEqual(cueStabilizer.currentState.currentText, 'Old video unfinished line');

    cueStabilizer.cleanup();
    assert.strictEqual(cueStabilizer.currentState.currentText, '');
    assert.strictEqual(cueStabilizer.currentState.currentCueId, 0);
    assert.strictEqual(cueStabilizer.currentState.hasFinalized, true);

    // Wait past NATURAL_PAUSE_MS (700ms) to ensure no timer fires
    await new Promise(r => setTimeout(r, 750));
    assert.strictEqual(emitted.length, 0, 'No phantom emission should occur after cleanup()');

    window.ImmerseTL.overlay.updateCustomSubtitle = origUpdate;
  });

  await t.test('CASE 2: content.js cleanupPage() invokes cueStabilizer.cleanup() and all other module cleanups', () => {
    const calls = [];
    const orig = {
      captionSource: window.ImmerseTL.captionSource,
      cueStabilizer: window.ImmerseTL.cueStabilizer,
      translationTrigger: window.ImmerseTL.translationTrigger,
      overlay: window.ImmerseTL.overlay,
      history: window.ImmerseTL.history
    };

    window.ImmerseTL.captionSource = { cleanup: () => calls.push('captionSource') };
    window.ImmerseTL.cueStabilizer = { cleanup: () => calls.push('cueStabilizer') };
    window.ImmerseTL.translationTrigger = { cancelPendingTranslation: () => calls.push('translationTrigger') };
    window.ImmerseTL.overlay = { clear: () => calls.push('overlay') };
    window.ImmerseTL.history = { clear: () => calls.push('history') };

    contentModule.cleanupPage();

    assert.ok(calls.includes('captionSource'), 'captionSource.cleanup called');
    assert.ok(calls.includes('cueStabilizer'), 'cueStabilizer.cleanup called');
    assert.ok(calls.includes('translationTrigger'), 'translationTrigger.cancelPendingTranslation called');
    assert.ok(calls.includes('overlay'), 'overlay.clear called');
    assert.ok(calls.includes('history'), 'history.clear called');

    Object.assign(window.ImmerseTL, orig);
  });

  await t.test('CASE 3: overlay.clear() cancels hideGraceTimeoutId, clearTimeoutId, and ghostTimeoutId', async () => {
    let fired = false;
    window.ImmerseTL.overlay.hideGraceTimeoutId = setTimeout(() => { fired = true; }, 50);
    window.ImmerseTL.overlay.clearTimeoutId = setTimeout(() => { fired = true; }, 50);
    window.ImmerseTL.overlay.ghostTimeoutId = setTimeout(() => { fired = true; }, 50);

    window.ImmerseTL.overlay.clear();

    assert.strictEqual(window.ImmerseTL.overlay.hideGraceTimeoutId, null);
    assert.strictEqual(window.ImmerseTL.overlay.clearTimeoutId, null);
    assert.strictEqual(window.ImmerseTL.overlay.ghostTimeoutId, null);

    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(fired, false, 'None of the cleared overlay timers should fire');
  });

  await t.test('CASE 4: captionSource.cleanup() clears hideGraceTimeoutId on overlay', async () => {
    let fired = false;
    window.ImmerseTL.overlay.hideGraceTimeoutId = setTimeout(() => { fired = true; }, 50);

    window.ImmerseTL.captionSource.cleanup();
    assert.strictEqual(window.ImmerseTL.overlay.hideGraceTimeoutId, null);

    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(fired, false, 'Cleared hideGraceTimeoutId should not fire');
  });
});
