const test = require('node:test');
const assert = require('node:assert');

global.window = {};
window.ImmerseTL = {};

require('../content/translation-trigger.js');
const { scheduleTranslation, cancelPendingTranslation, invalidateCurrentRequest } = window.ImmerseTL.translationTrigger;

test('translation-trigger.js Orchestration (Fix B.2 Validation)', async (t) => {
  let networkHandlers = [];
  let fetchedLangs = [];
  
  window.ImmerseTL.translator = {
    fetchTranslation: async (text, targetLang) => {
      fetchedLangs.push(targetLang);
      return new Promise(resolve => {
        networkHandlers.push({ text, targetLang, resolve });
      });
    }
  };

  t.beforeEach(() => {
    networkHandlers = [];
    fetchedLangs = [];
    window.ImmerseTL.settings = { targetLang: 'id' };
    cancelPendingTranslation();
  });

  await t.test('CASE A & C: Target changes during debounce, then request succeeds', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 20, onResult: (res) => results.push('A') });

      // Inside debounce window
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 0, 'Should still be debouncing');
        
        // Settings change
        window.ImmerseTL.settings.targetLang = 'ja';
        invalidateCurrentRequest();
      }, 10);
      
      // Wait for debounce to finish and network request to be sent
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1, 'Exactly ONE translation request should be sent');
        assert.strictEqual(fetchedLangs[0], 'ja', 'The request should use the fresh target language (ja)');
        
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, ['A'], 'Result should be accepted');
          done();
        }, 10);
      }, 40);
    });
  });

  await t.test('CASE B: Old in-flight response is still rejected', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 0, onResult: (res) => results.push('A') });

      // Wait for network request to be sent
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1, 'Request is in flight');
        
        // Target changes WHILE IN FLIGHT
        window.ImmerseTL.settings.targetLang = 'ja';
        invalidateCurrentRequest();
        
        // Resolve the in-flight promise
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, [], 'Old in-flight response should be discarded');
          done();
        }, 10);
      }, 10);
    });
  });

  await t.test('CASE D: Multiple target changes during debounce', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 30, onResult: (res) => results.push('A') });

      setTimeout(() => {
        window.ImmerseTL.settings.targetLang = 'ja'; invalidateCurrentRequest();
        window.ImmerseTL.settings.targetLang = 'en'; invalidateCurrentRequest();
        window.ImmerseTL.settings.targetLang = 'ko'; invalidateCurrentRequest();
      }, 10);
      
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1, 'Exactly ONE translation request should be sent');
        assert.strictEqual(fetchedLangs[0], 'ko', 'The request should use the final fresh target language (ko)');
        
        networkHandlers[0].resolve({ translation: 'A_translated' });
        setTimeout(() => {
          assert.deepStrictEqual(results, ['A'], 'Result should be accepted');
          done();
        }, 10);
      }, 50);
    });
  });

  await t.test('CASE E: Normal request unchanged', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1);
        assert.strictEqual(fetchedLangs[0], 'id');
        
        networkHandlers[0].resolve({ translation: 'A_translated' });
        setTimeout(() => {
          assert.deepStrictEqual(results, ['A'], 'Result should be accepted');
          done();
        }, 10);
      }, 20);
    });
  });

  await t.test('CASE F: Navigation during debounce', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 20, onResult: (res) => results.push('A') });

      setTimeout(() => {
        cancelPendingTranslation();
      }, 10);
      
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 0, 'No request should start');
        assert.deepStrictEqual(results, []);
        done();
      }, 40);
    });
  });

  await t.test('CASE G: New request after invalidation', async () => {
    return new Promise((done) => {
      let results = [];
      
      // Invalidate current state randomly
      window.ImmerseTL.settings.targetLang = 'ja';
      invalidateCurrentRequest();
      
      // New subtitle arrives
      scheduleTranslation({ text: 'Hello', targetLang: 'ja', delay: 0, onResult: (res) => results.push('A') });
      
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1);
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, ['A'], 'New request gets valid generation and accepted');
          done();
        }, 10);
      }, 10);
    });
  });
});
