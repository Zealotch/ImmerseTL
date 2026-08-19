const test = require('node:test');
const assert = require('node:assert');
const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..');

test('ImmerseTL E2E Tests', async (t) => {
  let browser;
  let page;

  // Setup Browser with Extension
  t.before(async () => {
    browser = await puppeteer.launch({
      headless: false, // Set to false to see it visually
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`
      ]
    });
    page = await browser.newPage();
  });

  t.after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  await t.test('Should inject overlay into YouTube', async () => {
    // 1. Navigate to a YouTube video
    // "Me at the zoo" - short, has CC available usually, fast to load
    await page.goto('https://www.youtube.com/watch?v=jNQXAC9IVRw', { waitUntil: 'networkidle2' });

    // 2. Wait for the YouTube video player to load
    await page.waitForSelector('.html5-video-player', { timeout: 10000 });

    // 3. Play the video if it's not auto-playing
    await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play();
      }
    });

    // 4. Wait for ImmerseTL overlay to be injected
    const overlayExists = await page.waitForSelector('#yt-smart-translate-overlay', { timeout: 10000 }).then(() => true).catch(() => false);
    assert.strictEqual(overlayExists, true, 'ImmerseTL Overlay was not injected into the DOM');
  });
});
