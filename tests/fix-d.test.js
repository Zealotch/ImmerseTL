const test = require('node:test');
const assert = require('node:assert');
const { setImmediate } = require('timers/promises');

// Mock DOM/Browser environment
global.window = {};
global.document = {
  createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
};
global.chrome = {
  runtime: { onMessage: { addListener: () => {} } },
  storage: { local: { get: () => {}, set: () => {} }, onChanged: { addListener: () => {} } }
};

// Load dependencies
require('../content/caption-processor.js');
const { scheduleTranslation, cancelPendingTranslation, invalidateCurrentRequest } = require('../content/translation-trigger.js');
const { process, finalize, cleanup, retranslateCurrentCue, currentState } = require('../content/cue-stabilizer.js');

let fetchCount = 0;
let cachedResult = null;
let currentRenderedHtml = "";
let currentRenderedError = "";

// Fake wait for internal mocks
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Deterministic time advancer for tests
async function advance(t, ms) {
  t.mock.timers.tick(ms);
  await setImmediate();
  await setImmediate(); // let promise chains resolve
}

// Mock Translator
window.ImmerseTL.translator = {
  fetchTranslation: async (text, targetLang) => {
    fetchCount++;
    if (text === "Error") throw new Error("Mock error");
    return { translation: `Translated [${targetLang}]: ${text}`, sourceLang: 'en' };
  },
  getCachedTranslation: (text, targetLang) => {
    return cachedResult;
  },
  highlightSafeText: (tx) => tx
};

window.ImmerseTL.settings = { targetLang: 'id', translateMode: 'default', subtitleTheme: 'default' };

window.ImmerseTL.overlay = {
  updateCustomSubtitle: (text, forceRerender = false, animate = true, bypassSchedule = false) => {
    if (bypassSchedule) return;
    
    let cachedTrans = window.ImmerseTL.translator.getCachedTranslation(text, window.ImmerseTL.settings.targetLang);
    if (cachedTrans) {
      currentRenderedHtml = cachedTrans.translation;
      return;
    }
    
    window.ImmerseTL.translationTrigger.scheduleTranslation({
      text,
      targetLang: window.ImmerseTL.settings.targetLang,
      delay: 0,
      onResult: (transData) => {
        currentRenderedHtml = transData.translation;
      },
      onError: (err) => {
        currentRenderedError = err.message;
      }
    });
  }
};

function changeTargetLang(newLang) {
  window.ImmerseTL.settings.targetLang = newLang;
  window.ImmerseTL.translationTrigger.invalidateCurrentRequest();
  window.ImmerseTL.cueStabilizer.retranslateCurrentCue();
}

test('Fix D: Target Language Change Validation', async (parentT) => {
  parentT.mock.timers.enable({ apis: ['setTimeout', 'Date'] });

  parentT.beforeEach(() => {
    cleanup();
    cancelPendingTranslation(); // clear leftover trigger timers
    window.ImmerseTL.settings.targetLang = 'id';
    fetchCount = 0;
    cachedResult = null;
    currentRenderedHtml = "";
  });

  await parentT.test('1. Stable cue + targetLang change -> same cue retranslated', async () => {
    process("Stable text");
    await advance(parentT, 750); // Stabilize
    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(currentRenderedHtml, "Translated [id]: Stable text");
    
    const cueIdBefore = currentState.currentCueId;
    
    changeTargetLang("ja");
    await advance(parentT, 50); // Wait for fetch
    
    assert.strictEqual(fetchCount, 2, "Should fetch again for new language");
    assert.strictEqual(currentRenderedHtml, "Translated [ja]: Stable text");
    assert.strictEqual(currentState.currentCueId, cueIdBefore, "Must not create a new logical cueId");
  });

  await parentT.test('2. No active cue + targetLang change -> no request', async () => {
    changeTargetLang("ja");
    await advance(parentT, 50);
    assert.strictEqual(fetchCount, 0, "No request if no active cue");
  });

  await parentT.test('3. In-flight old translation + targetLang change', async () => {
    let resolveFirstFetch, resolveSecondFetch;
    let fetchCall = 0;
    
    const originalFetch = window.ImmerseTL.translator.fetchTranslation;
    window.ImmerseTL.translator.fetchTranslation = async (text, targetLang) => {
      fetchCount++;
      fetchCall++;
      if (fetchCall === 1) {
        await new Promise(r => resolveFirstFetch = r);
      } else if (fetchCall === 2) {
        await new Promise(r => resolveSecondFetch = r);
      }
      return { translation: `Translated [${targetLang}]: ${text}`, sourceLang: 'en' };
    };

    try {
      process("In-flight text");
      await advance(parentT, 750); // Emits cue. 0ms debounce triggers fetch 1.
      await advance(parentT, 0); // flush
      
      changeTargetLang("ko"); // Language changes, invalidates previous request.
      await advance(parentT, 50); // let debounce trigger fetch 2.
      
      // Now both fetches are pending (but fetch 1 is invalidated by translation-trigger)
      // Resolve fetch 1
      resolveFirstFetch();
      await advance(parentT, 50); // let promises settle
      
      assert.strictEqual(currentRenderedHtml, "", "Old translation should not be rendered");
      
      // Resolve fetch 2
      resolveSecondFetch();
      await advance(parentT, 50); // let promises settle
      
      assert.strictEqual(fetchCount, 2);
      assert.strictEqual(currentRenderedHtml, "Translated [ko]: In-flight text", "Only latest translation applied");
    } finally {
      window.ImmerseTL.translator.fetchTranslation = originalFetch;
    }
  });

  await parentT.test('4. Cached new-language translation -> zero network request', async () => {
    process("Cached text");
    await advance(parentT, 750); 
    assert.strictEqual(fetchCount, 1);
    
    cachedResult = { translation: "Translated [ja]: Cached text from cache", sourceLang: "en" };
    
    changeTargetLang("ja");
    await advance(parentT, 50);
    
    assert.strictEqual(fetchCount, 1, "Should be zero NEW network requests");
    assert.strictEqual(currentRenderedHtml, "Translated [ja]: Cached text from cache");
  });

  await parentT.test('5. Uncached new-language translation -> exactly one request', async () => {
    process("Uncached text");
    await advance(parentT, 750); 
    assert.strictEqual(fetchCount, 1);
    
    changeTargetLang("fr");
    await advance(parentT, 50);
    
    assert.strictEqual(fetchCount, 2, "Should make exactly 1 new request");
    assert.strictEqual(currentRenderedHtml, "Translated [fr]: Uncached text");
  });

  await parentT.test('6. Multiple targetLang changes -> only latest wins', async () => {
    process("Spam text");
    await advance(parentT, 750);
    assert.strictEqual(fetchCount, 1);
    
    // Changing targetLang sync. Each cancels the previous `delay:0` timeout.
    changeTargetLang("es");
    changeTargetLang("ru");
    changeTargetLang("de");
    
    await advance(parentT, 100);
    
    assert.strictEqual(currentRenderedHtml, "Translated [de]: Spam text");
    assert.strictEqual(fetchCount, 2, "Only one additional fetch should occur after spam");
  });

  await parentT.test('7. Partial cue + targetLang change -> cue remains intact', async () => {
    process("Partial");
    await advance(parentT, 300); // Partial, not yet stable
    
    changeTargetLang("zh"); // should not trigger fetch because lastEmittedVersion is 0
    
    assert.strictEqual(fetchCount, 0, "Should not emit yet");
    
    await advance(parentT, 500); // Total 800ms > 700ms threshold -> emits STABLE
    
    assert.strictEqual(fetchCount, 1, "Emits normally after natural pause");
    assert.strictEqual(currentRenderedHtml, "Translated [zh]: Partial", "Uses the new language immediately");
  });
});
