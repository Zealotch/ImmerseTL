const test = require('node:test');
const assert = require('node:assert');

// Mock ITL context
global.window = {};
window.ImmerseTL = {};

require('../content/theme-renderer.js');
const { renderFinalSubtitle, renderModeInitial } = window.ImmerseTL.themeRenderer;

test('theme-renderer.js HTML Formatting', async (t) => {
  const dummyHtml = "<div>Test Translation</div>";
  const rawText = "[Ryuji] For real?!";
  
  await t.test('CASE 1 & 2 & 3: Default Theme', () => {
    const result = renderFinalSubtitle(dummyHtml, rawText, 'default');
    assert.strictEqual(result, dummyHtml, 'Default theme should return raw HTML');
  });

  await t.test('CASE 1 & 2 & 3: Persona 5 Theme', () => {
    const result = renderFinalSubtitle(dummyHtml, rawText, 'comicHeist', { fontColor: '#ff0000' });
    
    // Check classes
    assert.ok(result.includes('itl-p5-motion'), 'Should contain motion wrapper');
    assert.ok(result.includes('itl-p5-dialog'), 'Should contain dialog box');
    
    // Check speaker strip
    assert.ok(!result.includes('[Ryuji]'), 'Speaker bracket should be stripped from inner P5 rendering text');
    
    // Check font color
    assert.ok(result.includes('color: #ff0000 !important;'), 'Should inject correct font color inline');
  });

  await t.test('CASE 1 & 2 & 3: Wuthering Waves Theme', () => {
    const result = renderFinalSubtitle(dummyHtml, rawText, 'wuwa');
    assert.ok(result.includes('itl-wuwa-container'), 'Should contain wuwa container');
    assert.ok(result.includes('Test Translation'), 'Should preserve inner translation text');
  });

  await t.test('CASE 1 & 2 & 3: Metaphor Theme', () => {
    const result = renderFinalSubtitle(dummyHtml, rawText, 'metaphor');
    assert.ok(result.includes('itl-metaphor-wrapper'), 'Should contain metaphor wrapper');
    assert.ok(result.includes('Ryuji'), 'Should extract speaker name for Metaphor theme');
  });

  await t.test('CASE 1 & 2 & 3: Medieval Theme', () => {
    const result = renderFinalSubtitle(dummyHtml, rawText, 'medieval');
    assert.ok(result.includes('itl-medieval-wrapper'), 'Should contain medieval wrapper');
    assert.ok(result.includes('Ryuji'), 'Should extract speaker name for Medieval theme');
  });

  await t.test('CASE 4: Formatter does not access DOM', () => {
    // If it accessed the DOM, it would crash here in Node.js since there's no JSDOM or browser window mock with document.
    const result = renderModeInitial('dual', 'RawText', 'TargetText', '#fff');
    assert.ok(result.includes('yt-dual-romaji'), 'Dual mode initial render worked without DOM');
  });
});
