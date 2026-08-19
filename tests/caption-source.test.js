const test = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

test('caption-source.js Extraction Helper', async (t) => {
  const browser = await puppeteer.launch({ headless: true });
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

  await browser.close();
});
