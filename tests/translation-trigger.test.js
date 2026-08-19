const test = require('node:test');
const assert = require('node:assert');

global.window = {};
window.ImmerseTL = {};

require('../content/translation-trigger.js');
const { scheduleTranslation, cancelPendingTranslation } = window.ImmerseTL.translationTrigger;

test('translation-trigger.js Orchestration', async (t) => {
  let fetchCallCount = 0;
  let networkHandlers = [];
  
  window.ImmerseTL.translator = {
    fetchTranslation: async (text, targetLang) => {
      fetchCallCount++;
      return new Promise(resolve => {
        networkHandlers.push({ text, targetLang, resolve });
      });
    }
  };

  t.beforeEach(() => {
    fetchCallCount = 0;
    networkHandlers = [];
    cancelPendingTranslation();
  });

  await t.test('CASE 1: Request A in-flight. Request B in-flight. A resolves AFTER B. A is discarded.', async () => {
    return new Promise((done) => {
      let results = [];

      // 1. Schedule A
      scheduleTranslation({
        text: 'Hello', targetLang: 'id', delay: 10,
        onResult: (res) => results.push('A')
      });

      setTimeout(() => {
        // A is now in-flight
        assert.strictEqual(networkHandlers.length, 1);
        
        // 2. Schedule B
        scheduleTranslation({
          text: 'Hello', targetLang: 'ja', delay: 10,
          onResult: (res) => results.push('B')
        });

        setTimeout(() => {
          // B is now in-flight too
          assert.strictEqual(networkHandlers.length, 2);
          
          // 3. Resolve B FIRST
          networkHandlers[1].resolve({ translation: 'B_translated' });
          
          setTimeout(() => {
            assert.deepStrictEqual(results, ['B']);
            
            // 4. Resolve A SECOND (the stale one)
            networkHandlers[0].resolve({ translation: 'A_translated' });
            
            setTimeout(() => {
              // A should be discarded
              assert.deepStrictEqual(results, ['B']);
              done();
            }, 20);
          }, 20);
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 2: Request A starts. Cancel is called. A resolves. A is discarded.', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'Hello', targetLang: 'id', delay: 10, onResult: (res) => results.push('A') });
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1);
        cancelPendingTranslation();
        networkHandlers[0].resolve({ translation: 'A_translated' });
        setTimeout(() => {
          assert.deepStrictEqual(results, []);
          done();
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 3 & 4: Multiple requests, only the latest generation is valid', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'text1', targetLang: 'id', delay: 10, onResult: (res) => results.push('1') });
      setTimeout(() => {
        scheduleTranslation({ text: 'text2', targetLang: 'id', delay: 10, onResult: (res) => results.push('2') });
        setTimeout(() => {
          // Both are in-flight. 
          // Resolve 1 first (should be ignored)
          networkHandlers[0].resolve({ translation: '1_translated' });
          setTimeout(() => {
            assert.deepStrictEqual(results, []);
            // Resolve 2 (should be accepted)
            networkHandlers[1].resolve({ translation: '2_translated' });
            setTimeout(() => {
              assert.deepStrictEqual(results, ['2']);
              done();
            }, 20);
          }, 20);
        }, 20);
      }, 20);
    });
  });

  await t.test('CASE 5 & 6: Debounce behavior remains unchanged', async () => {
    return new Promise((done) => {
      let results = [];
      scheduleTranslation({ text: 'A', delay: 10, onResult: () => results.push('A') });
      scheduleTranslation({ text: 'B', delay: 10, onResult: () => results.push('B') });
      
      setTimeout(() => {
        assert.strictEqual(networkHandlers.length, 1); // Debounce collapsed them
        assert.strictEqual(networkHandlers[0].text, 'B');
        
        networkHandlers[0].resolve({ translation: 'B_translated' });
        setTimeout(() => {
          assert.deepStrictEqual(results, ['B']);
          done();
        }, 20);
      }, 20);
    });
  });

});
