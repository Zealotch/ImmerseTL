const test = require('node:test');
const assert = require('node:assert');

global.window = {};
window.ImmerseTL = {};

require('../content/translation-trigger.js');
const { scheduleTranslation, cancelPendingTranslation, invalidateCurrentRequest } = window.ImmerseTL.translationTrigger;

test('translation-trigger.js Orchestration (Invalidation)', async (t) => {
  let networkHandlers = [];
  
  window.ImmerseTL.translator = {
    fetchTranslation: async (text, targetLang) => {
      return new Promise(resolve => {
        networkHandlers.push({ text, targetLang, resolve });
      });
    }
  };

  t.beforeEach(() => {
    networkHandlers = [];
    cancelPendingTranslation();
  });

  await t.test('CASE 1: Target language changes while request is in-flight', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1);
        
        // Target language changed via popup -> triggers settings.js -> triggers invalidate
        invalidateCurrentRequest();
        
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, [], 'A should be discarded');
          done();
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 2: Target language changes, then NEW request starts', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1);
        
        invalidateCurrentRequest();
        
        // Subtitle arrives
        scheduleTranslation({ text: 'Hello', targetLang: 'ja', delay: 10, onResult: (res) => results.push('B') });
        
        setTimeout(() => {
          assert.strictEqual(networkHandlers.length, 2);
          
          networkHandlers[0].resolve({ translation: 'A_translated' });
          setTimeout(() => {
            assert.deepStrictEqual(results, [], 'A should be discarded');
            
            networkHandlers[1].resolve({ translation: 'B_translated' });
            setTimeout(() => {
              assert.deepStrictEqual(results, ['B'], 'B should be accepted');
              done();
            }, 20);
          }, 20);
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 3: Navigation still invalidates request (via cancelPendingTranslation)', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        cancelPendingTranslation();
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, [], 'A should be discarded');
          done();
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 4: Normal translation remains valid', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, ['A'], 'A should be accepted normally');
          done();
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 5: Repeated target language changes', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });

      setTimeout(() => {
        invalidateCurrentRequest(); // id -> ja
        invalidateCurrentRequest(); // ja -> en
        invalidateCurrentRequest(); // en -> ko
        
        networkHandlers[0].resolve({ translation: 'A_translated' });
        
        setTimeout(() => {
          assert.deepStrictEqual(results, [], 'A should be discarded');
          done();
        }, 20);
      }, 20);
    });
  });
});
