const test = require('node:test');
const assert = require('node:assert');

// Mock DOM/Browser environment
global.window = {};
global.document = {
  createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
};

// Load dependencies
require('../content/caption-processor.js');
const { process, finalize, cleanup, currentState } = require('../content/cue-stabilizer.js');

let emitHistory = [];

window.ImmerseTL.overlay = {
  updateCustomSubtitle: (text, force, isNew, bypass) => {
    if (bypass === false) {
      // This is considered an EMIT for translation
      emitHistory.push({ text });
    }
  }
};

window.ImmerseTL.settings = { targetLang: 'en' };

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('cue-stabilizer.js Stabilization Tests', async (t) => {
  t.beforeEach(() => {
    cleanup();
    emitHistory = [];
  });

  await t.test('CASE 1: Incremental updates coalesce into ONE STABLE emission', async () => {
    process("I think");
    await wait(200);
    process("I think we");
    await wait(200);
    process("I think we should go.");
    
    assert.strictEqual(emitHistory.length, 0, "Should not emit during incremental updates");
    
    // Wait for natural pause (> 700ms)
    await wait(750);
    assert.strictEqual(emitHistory.length, 1, "Should emit exactly once after natural pause");
    assert.strictEqual(emitHistory[0].text, "I think we should go.");
  });

  await t.test('CASE 2: No update for 700ms emits STABLE', async () => {
    process("Hello");
    await wait(750);
    assert.strictEqual(emitHistory.length, 1);
    assert.strictEqual(emitHistory[0].text, "Hello");
  });

  await t.test('CASE 3: Continuous updates >1200ms trigger FORCE_EMIT', async () => {
    process("A");
    await wait(400);
    process("A B");
    await wait(400);
    process("A B C");
    await wait(400);
    // 1200ms elapsed
    process("A B C D");
    await wait(100);
    // Max build timer is 1200ms. It should have fired.
    assert.strictEqual(emitHistory.length, 1);
    assert.strictEqual(emitHistory[0].text, "A B C");
  });

  await t.test('CASE 4: Same text does not emit twice', async () => {
    process("Hello");
    await wait(750); // Emits once
    assert.strictEqual(emitHistory.length, 1);
    
    finalize(); // Trying to finalize after emitting
    assert.strictEqual(emitHistory.length, 1, "Should not emit again");
  });

  await t.test('CASE 5: Genuinely new cue arrives', async () => {
    process("Cue 1");
    // New cue arrives before 700ms expires!
    await wait(100);
    process("Completely different text");
    
    assert.strictEqual(emitHistory.length, 1, "Cue 1 should be FINALIZED immediately");
    assert.strictEqual(emitHistory[0].text, "Cue 1");
    
    await wait(750);
    assert.strictEqual(emitHistory.length, 2, "Cue 2 should emit STABLE");
    assert.strictEqual(emitHistory[1].text, "Completely different text");
  });

  await t.test('CASE 6: Repeated dialogue', async () => {
    process("Really?");
    await wait(750);
    assert.strictEqual(emitHistory.length, 1);
    
    finalize();
    
    process("Really?");
    await wait(750);
    assert.strictEqual(emitHistory.length, 2, "Should emit second time as it is a new cue");
  });

  await t.test('CASE 7: FINAL after already emitted STABLE', async () => {
    process("Stable text");
    await wait(750); // emits STABLE
    assert.strictEqual(emitHistory.length, 1);
    
    finalize(); // emits FINAL? No, already emitted.
    assert.strictEqual(emitHistory.length, 1);
  });

  await t.test('CASE 8: FINAL before any STABLE emission', async () => {
    process("Quick text");
    finalize();
    assert.strictEqual(emitHistory.length, 1, "Emits exactly once on finalize");
  });

  await t.test('CASE 9: Multiple FORCE_EMIT cycles', async () => {
    process("Word 1");
    await wait(600);
    process("Word 1 Word 2");
    await wait(650); // 1250ms total -> FORCE_EMIT
    assert.strictEqual(emitHistory.length, 1);
    
    process("Word 1 Word 2 Word 3");
    await wait(600);
    process("Word 1 Word 2 Word 3 Word 4");
    await wait(650); // another 1250ms -> 2nd FORCE_EMIT
    assert.strictEqual(emitHistory.length, 2);
    assert.strictEqual(emitHistory[1].text, "Word 1 Word 2 Word 3");
  });

  await t.test('CASE 10: No text / empty input', async () => {
    process("");
    process("   ");
    await wait(800);
    assert.strictEqual(emitHistory.length, 0);
  });
});
