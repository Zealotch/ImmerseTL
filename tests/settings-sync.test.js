const test = require('node:test');
const assert = require('node:assert');

// Mock Extension Environment
global.window = {};
global.chrome = {
  runtime: { id: 'test-id', onMessage: { addListener: () => {} } },
  storage: {
    local: { get: () => {} },
    onChanged: {
      addListener: (cb) => {
        global.mockStorageListener = cb;
      }
    }
  }
};

require('../content/settings.js');
const ITL = global.window.ImmerseTL;

test('Settings Sync - Target Language', async (t) => {
  await t.test('CASE 1: Storage sync updates ITL.settings.targetLang live', () => {
    assert.strictEqual(ITL.settings.targetLang, 'id', 'Initial targetLang should be id');

    // Simulate storage change event for targetLang
    global.mockStorageListener({
      targetLang: { newValue: 'ja' }
    }, 'local');

    assert.strictEqual(ITL.settings.targetLang, 'ja', 'targetLang should update to ja live');
  });

  await t.test('CASE 2: Storage sync works for other properties without affecting targetLang', () => {
    // Change theme
    global.mockStorageListener({
      subtitleTheme: { newValue: 'persona5' }
    }, 'local');

    assert.strictEqual(ITL.settings.subtitleTheme, 'persona5', 'subtitleTheme should update');
    assert.strictEqual(ITL.settings.targetLang, 'ja', 'targetLang should remain ja');
  });

  await t.test('CASE 3: Storage sync for multiple rapid changes', () => {
    global.mockStorageListener({ targetLang: { newValue: 'en' } }, 'local');
    assert.strictEqual(ITL.settings.targetLang, 'en');

    global.mockStorageListener({ targetLang: { newValue: 'ko' } }, 'local');
    assert.strictEqual(ITL.settings.targetLang, 'ko');
  });
});
