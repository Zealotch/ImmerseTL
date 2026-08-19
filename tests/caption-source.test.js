const test = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

test('caption-source.js Extraction Helper', async (t) => {
  const browser = await puppeteer.launch({ headless: true });
  t.after(async () => {
    await browser.close();
  });
  
  const page = await browser.newPage();
  
  // Inject the script
  const scriptContent = fs.readFileSync(path.join(__dirname, '../content/caption-source.js'), 'utf8');
  await page.evaluate((script) => {
    window.document.body.innerHTML = '<div id="test-container"></div>';
    const scriptEl = document.createElement('script');
    scriptEl.textContent = script;
    document.head.appendChild(scriptEl);
  }, scriptContent);

  await t.test('CASE 1 & 2: Parent + child duplication and Multiple segments', async () => {
    const extractedText = await page.evaluate(() => {
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win">
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">Hello</span>
          </div>
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">world</span>
          </div>
        </div>
      `;
      let text = "";
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { text = t; }
      };
      window.ImmerseTL.captionSource.checkObserver();
      window.ImmerseTL.captionSource.cleanup();
      return text;
    });
    assert.strictEqual(extractedText, 'Hello world');
  });

  await t.test('CASE 3: Legitimate repeated dialogue', async () => {
    const extractedText = await page.evaluate(() => {
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win">
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">Really?</span>
          </div>
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">Really?</span>
          </div>
        </div>
      `;
      let text = "";
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { text = t; }
      };
      window.ImmerseTL.captionSource.checkObserver();
      window.ImmerseTL.captionSource.cleanup();
      return text;
    });
    assert.strictEqual(extractedText, 'Really? Really?');
  });

  await t.test('CASE 5: Existing fallback path', async () => {
    const extractedText = await page.evaluate(() => {
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win">
          <span>
            <span>Nested</span>
            <span>Fallback</span>
          </span>
        </div>
      `;
      let text = "";
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { text = t; }
      };
      window.ImmerseTL.captionSource.checkObserver();
      window.ImmerseTL.captionSource.cleanup();
      return text;
    });
    assert.strictEqual(extractedText, 'Nested Fallback');
  });

  await t.test('CASE 6: Empty caption', async () => {
    const extractedText = await page.evaluate(() => {
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win"></div>
      `;
      let text = "INITIAL_STATE";
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { text = t; },
        clear: () => { text = "CLEARED"; }
      };
      window.ImmerseTL.captionSource.checkObserver();
      window.ImmerseTL.captionSource.cleanup();
      return text;
    });
    // In our logic, if it's empty, updateCustomSubtitle isn't called on initial extraction
    assert.strictEqual(extractedText, 'INITIAL_STATE');
  });

  await t.test('LIFECYCLE CASE 1 & 2: Temporary hidden state and caption returns', async () => {
    const results = await page.evaluate(async () => {
      const log = [];
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win">
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">First</span>
          </div>
        </div>
      `;
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { log.push('UPDATE: ' + t); },
        clear: () => { log.push('CLEAR'); },
        currentTextElement: { style: { opacity: '1' } }
      };
      
      window.ImmerseTL.captionSource.checkObserver();
      
      // Wait for observer to pick up the initial state
      await new Promise(r => setTimeout(r, 50));
      
      // Mutate to hidden state
      const capWin = document.getElementById('cap-win');
      capWin.style.display = 'none';
      
      await new Promise(r => setTimeout(r, 100));
      // 100ms is < 400ms, so it should NOT be cleared yet!
      
      // Mutate back to visible
      capWin.style.display = 'block';
      
      await new Promise(r => setTimeout(r, 500));
      // 500ms > 400ms, but we canceled the timer, so still no clear!
      
      window.ImmerseTL.captionSource.cleanup();
      return log;
    });
    
    assert.deepStrictEqual(results, ['UPDATE: First']);
  });

  await t.test('LIFECYCLE CASE 3: Genuine caption end', async () => {
    const results = await page.evaluate(async () => {
      const log = [];
      document.getElementById('test-container').innerHTML = `
        <video></video>
        <div class="ytp-caption-window-container" id="cap-win">
          <div class="caption-visual-line">
            <span class="ytp-caption-segment">End me</span>
          </div>
        </div>
      `;
      window.ImmerseTL.overlay = {
        updateCustomSubtitle: (t) => { log.push('UPDATE: ' + t); },
        clear: () => { log.push('CLEAR'); },
        currentTextElement: { style: { opacity: '1' } }
      };
      
      window.ImmerseTL.captionSource.checkObserver();
      await new Promise(r => setTimeout(r, 50));
      
      const capWin = document.getElementById('cap-win');
      capWin.style.display = 'none';
      
      // Wait > 400ms (grace) + 400ms (ghost)
      await new Promise(r => setTimeout(r, 1000));
      
      window.ImmerseTL.captionSource.cleanup();
      return log;
    });
    
    assert.deepStrictEqual(results, ['UPDATE: End me', 'CLEAR']);
  });
});
