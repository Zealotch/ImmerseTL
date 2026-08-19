const test = require('node:test');
const assert = require('node:assert');

// We exported the functions directly in node environments
const { isNewDialogueCue, chunkCaptionText } = require('../content/caption-processor.js');

test('caption-processor.js Pure Functions', async (t) => {

  await t.test('CASE 1: First caption', () => {
    // previousText is empty
    const result = isNewDialogueCue("", "Hello world", 0, 1000);
    assert.strictEqual(result, true, 'First caption should be a new cue');
  });

  await t.test('CASE 2: Same caption repeated', () => {
    // Both are the same, elapsed time < 1.5s
    const result = isNewDialogueCue("Hello world", "Hello world", 1000, 1100);
    assert.strictEqual(result, false, 'Same caption quickly should not be a new cue');
  });

  await t.test('CASE 3: Incremental caption update', () => {
    const result1 = isNewDialogueCue("I think", "I think we", 1000, 1100);
    assert.strictEqual(result1, false, 'Incremental addition should not be new cue');
    
    const result2 = isNewDialogueCue("I think we", "I think we should", 1100, 1200);
    assert.strictEqual(result2, false, 'Further incremental addition should not be new cue');
  });

  await t.test('CASE 4: New sentence', () => {
    const result = isNewDialogueCue("I think we should", "What about you?", 1200, 1300);
    assert.strictEqual(result, true, 'Completely different text should be new cue');
  });

  await t.test('CASE 5: Caption longer than existing word limit', () => {
    const longText = "This is a very long sentence that keeps going and going and going and going and going and going and going and going and going and going and going.";
    const result = chunkCaptionText(longText);
    
    const words = result.split(/\s+/);
    assert.ok(words.length <= 30, 'Should truncate to max 30 words');
  });

  await t.test('CASE 6: Empty or invalid caption', () => {
    const chunkResult = chunkCaptionText("   ");
    assert.strictEqual(chunkResult, "", 'Empty text chunks to empty string');
  });

});
