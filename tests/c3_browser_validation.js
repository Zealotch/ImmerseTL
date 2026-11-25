const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../');
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--mute-audio'
    ]
  });

  try {
    const page = await browser.newPage();
    let translationRequests = 0;
    
    page.on('request', request => {
      if (request.url().includes('translate.googleapis.com')) {
        translationRequests++;
      }
    });

    console.log("Navigating to YouTube...");
    await page.goto('https://www.youtube.com/watch?v=1A_CAkYt3GY', { waitUntil: 'domcontentloaded' });
    
    // Wait for extension to initialize
    await new Promise(r => setTimeout(r, 2000));
    
    // Inject mock captions directly into the caption-source observer target!
    console.log("Injecting mock DOM mutations...");
    await page.evaluate(async () => {
      // Create fake YouTube caption container
      const player = document.querySelector('#movie_player') || document.body;
      let captionContainer = document.querySelector('.ytp-caption-window-container');
      if (!captionContainer) {
        captionContainer = document.createElement('div');
        captionContainer.className = 'ytp-caption-window-container';
        player.appendChild(captionContainer);
      }
      
      const simulateCaption = async (text, delayMs) => {
        captionContainer.innerHTML = `<div class="caption-visual-line"><span class="ytp-caption-segment">${text}</span></div>`;
        return new Promise(r => setTimeout(r, delayMs));
      };
      
      // TEST 1: Incremental
      await simulateCaption("I think", 400);
      await simulateCaption("I think we", 400);
      await simulateCaption("I think we should go.", 1500); // Wait for STABLE + fetch
      
      // TEST 2: Long continuous
      await simulateCaption("A", 400);
      await simulateCaption("A B", 400);
      await simulateCaption("A B C", 400);
      await simulateCaption("A B C D", 1500); // Wait for FORCE EMIT
      
      // TEST 3: Hide
      captionContainer.innerHTML = '';
      await new Promise(r => setTimeout(r, 600)); // Hide grace
    });
    
    console.log(`Total translation requests: ${translationRequests}`);
    if (translationRequests <= 3) {
      console.log("SUCCESS: Request storm prevented.");
    } else {
      console.log("FAILURE: Too many requests.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
