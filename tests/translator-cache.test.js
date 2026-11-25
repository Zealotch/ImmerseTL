const test = require('node:test');
const assert = require('node:assert');

// Mock chrome runtime API
let sentMessages = [];
let mockResponse = { success: true, translation: 'Terjemahan', romaji: '', sourceLang: 'en' };

global.window = {};
window.ImmerseTL = window.ImmerseTL || {};

global.chrome = {
  runtime: {
    lastError: null,
    sendMessage: (msg, callback) => {
      sentMessages.push(msg);
      callback(mockResponse);
    }
  }
};

require('../content/translator.js');
const translator = window.ImmerseTL.translator;

test('Translator Cache Management', async (t) => {
  t.beforeEach(() => {
    translator.clearCache();
    sentMessages = [];
    mockResponse = { success: true, translation: 'Terjemahan', romaji: '', sourceLang: 'en' };
  });

  await t.test('CASE 1: Max cache size is configured to 1000', () => {
    assert.strictEqual(translator.maxCacheSize, 1000, 'Max cache size should be 1000');
    assert.strictEqual(translator.cacheSize, 0, 'Initial cache should be empty');
  });

  await t.test('CASE 2: getCachedTranslation returns null on cache miss', () => {
    const cached = translator.getCachedTranslation("Hello world", "id");
    assert.strictEqual(cached, null, 'Cache miss should return null');
  });

  await t.test('CASE 3: fetchTranslation populates cache and avoids network on subsequent call', async () => {
    mockResponse = { success: true, translation: 'Halo dunia', romaji: '', sourceLang: 'en' };
    
    // First call: Cache miss -> triggers sendMessage
    const res1 = await translator.fetchTranslation("Hello world", "id");
    assert.strictEqual(res1.translation, 'Halo dunia');
    assert.strictEqual(sentMessages.length, 1, 'First call should send network message');
    assert.strictEqual(translator.cacheSize, 1, 'Cache size should increase to 1');

    // Second call: Cache hit -> does NOT send message
    const res2 = await translator.fetchTranslation("Hello world", "id");
    assert.strictEqual(res2.translation, 'Halo dunia');
    assert.strictEqual(sentMessages.length, 1, 'Second call should use cache without network message');

    // Synchronous getCachedTranslation check
    const syncRes = translator.getCachedTranslation("Hello world", "id");
    assert.strictEqual(syncRes.translation, 'Halo dunia');
  });

  await t.test('CASE 4: Cache distinguishes between different target languages', async () => {
    mockResponse = { success: true, translation: 'Halo dunia', romaji: '', sourceLang: 'en' };
    await translator.fetchTranslation("Hello world", "id");

    mockResponse = { success: true, translation: 'Bonjour le monde', romaji: '', sourceLang: 'en' };
    await translator.fetchTranslation("Hello world", "fr");

    assert.strictEqual(sentMessages.length, 2, 'Different target languages must send separate requests');
    assert.strictEqual(translator.cacheSize, 2, 'Cache should hold both entries separately');

    assert.strictEqual(translator.getCachedTranslation("Hello world", "id").translation, 'Halo dunia');
    assert.strictEqual(translator.getCachedTranslation("Hello world", "fr").translation, 'Bonjour le monde');
  });

  await t.test('CASE 5: Empty text returns null and does not query network', async () => {
    const res = await translator.fetchTranslation("   ", "id");
    assert.strictEqual(res, null);
    assert.strictEqual(sentMessages.length, 0);
  });
});
