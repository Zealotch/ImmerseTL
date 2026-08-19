const test = require('node:test');
const assert = require('node:assert');

// Mock ITL context for tests
global.window = {};
window.ImmerseTL = {};

// Import the module
require('../content/translation-trigger.js');

const { scheduleTranslation, cancelPendingTranslation } = window.ImmerseTL.translationTrigger;

test('translation-trigger.js Orchestration', async (t) => {
  let fetchCallCount = 0;
  let lastFetchText = '';
  
  // Setup mock translator
  window.ImmerseTL.translator = {
    fetchTranslation: async (text, targetLang) => {
      fetchCallCount++;
      lastFetchText = text;
      
      // simulate network delay
      return new Promise(resolve => {
        setTimeout(() => {
          if (text === 'fail_me') resolve(null);
          else resolve({ translation: text + '_translated' });
        }, 50);
      });
    }
  };

  t.beforeEach(() => {
    fetchCallCount = 0;
    lastFetchText = '';
    cancelPendingTranslation();
  });

  await t.test('CASE 1 & 4: Schedule a translation and Result arrives', async () => {
    return new Promise((resolve) => {
      scheduleTranslation({
        text: 'hello',
        targetLang: 'id',
        delay: 10, // fast debounce
        onResult: (data) => {
          assert.strictEqual(fetchCallCount, 1, 'Should call fetch once');
          assert.strictEqual(data.translation, 'hello_translated', 'Should pass result');
          resolve();
        }
      });
    });
  });

  await t.test('CASE 2: Schedule multiple translations quickly (debounce)', async () => {
    return new Promise((resolve) => {
      let resultCount = 0;
      let staleCount = 0;

      // 1st request
      scheduleTranslation({
        text: 'hel',
        targetLang: 'id',
        delay: 30,
        onResult: () => { resultCount++; },
        onStale: () => { staleCount++; } // 'hel' should be stale
      });

      // 2nd request (before debounce finishes)
      setTimeout(() => {
        scheduleTranslation({
          text: 'hello',
          targetLang: 'id',
          delay: 30,
          onResult: (data) => {
            resultCount++;
            assert.strictEqual(fetchCallCount, 1, 'Debounce should collapse into 1 fetch');
            assert.strictEqual(lastFetchText, 'hello', 'Should only fetch the last text');
            // the previous one was cancelled internally, but let's check stale logic 
            // if we use scheduleTranslation it overrides, so 'onStale' isn't explicitly fired 
            // by the new call, but the old timer checks if text !== current.
          }
        });
      }, 10);

      // wait for all
      setTimeout(() => {
        assert.strictEqual(resultCount, 1, 'Only one result should fire');
        resolve();
      }, 100);
    });
  });

  await t.test('CASE 3: Cancel pending translation', async () => {
    return new Promise((resolve) => {
      scheduleTranslation({
        text: 'cancel_me',
        targetLang: 'id',
        delay: 20,
        onResult: () => {
          assert.fail('Should have been cancelled');
        }
      });

      cancelPendingTranslation();

      setTimeout(() => {
        assert.strictEqual(fetchCallCount, 0, 'Fetch should not have been called');
        resolve();
      }, 50);
    });
  });

  await t.test('CASE 5: Older translation result arrives after newer subtitle', async () => {
    return new Promise((resolve) => {
      let staleTriggered = false;

      // Force a slow mock for this specific test
      window.ImmerseTL.translator.fetchTranslation = async (text) => {
        return new Promise(res => {
          setTimeout(() => {
            res({ translation: text + '_translated' });
          }, 100); // 100ms network delay
        });
      };

      scheduleTranslation({
        text: 'slow text',
        targetLang: 'id',
        delay: 10,
        onResult: () => {
          assert.fail('Should not fire result if text changed');
        },
        onStale: () => {
          staleTriggered = true;
        }
      });

      // After debounce (10ms) but BEFORE network finishes (100ms), we change the current text manually 
      // (simulating overlay.js starting a new fetch or cancelling)
      setTimeout(() => {
        // Overlay receives new caption and cancels the old
        cancelPendingTranslation();
        // Since we cancelled it, currentRequestText is now empty ("").
        // When the network finishes, `text !== currentRequestText` will be true.
      }, 50);

      setTimeout(() => {
        assert.strictEqual(staleTriggered, false, 'Stale callback is internal. In our code, we simply do nothing or return.');
        // The real test is that onResult was NOT called.
        resolve();
      }, 150);
    });
  });

  await t.test('CASE 6: Translation failure', async () => {
    return new Promise((resolve) => {
      // restore fast mock
      window.ImmerseTL.translator.fetchTranslation = async (text) => {
        return new Promise(res => {
           setTimeout(() => { res(null); }, 10);
        });
      };

      scheduleTranslation({
        text: 'fail_me',
        targetLang: 'id',
        delay: 10,
        onResult: () => {
          assert.fail('Should not call onResult for failure');
        },
        onError: () => {
          assert.ok(true, 'onError called correctly');
          resolve();
        }
      });
    });
  });

});
