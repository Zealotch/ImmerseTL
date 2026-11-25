const test = require('node:test');
const assert = require('node:assert');

const common = require('../common.js');

test('common.js Configuration, Presets, and Theme Tokens', async (t) => {
  await t.test('CASE 1: focusLearning preset uses valid translateMode "dual"', () => {
    assert.strictEqual(common.PRESETS.focusLearning.settings.translateMode, 'dual');
  });

  await t.test('CASE 2: THEME_TOKENS includes all selectable themes including metaphor and medieval', () => {
    const expectedThemes = [
      'default', 'cinema', 'comicHeist', 'wuwa', 'metaphor',
      'medieval', 'neon', 'retro', 'sakura', 'nature', 'invisible', 'gaming'
    ];
    for (const theme of expectedThemes) {
      assert.ok(common.THEME_TOKENS[theme], `THEME_TOKENS should include "${theme}"`);
      assert.ok(common.THEME_TOKENS[theme].label, `THEME_TOKENS["${theme}"] should have a label`);
    }
  });

  await t.test('CASE 3: validateSettings clamps numeric values and preserves valid translateMode', () => {
    const validated = common.validateSettings({
      fontSize: 999,
      bgOpacity: -10,
      bgBlur: 100,
      fontColor: 'not-a-hex',
      translateMode: 'dual',
      targetLang: 'ja',
      animationLevel: 'invalid-anim'
    });

    assert.strictEqual(validated.fontSize, 72);
    assert.strictEqual(validated.bgOpacity, 0);
    assert.strictEqual(validated.bgBlur, 50);
    assert.strictEqual(validated.fontColor, common.DEFAULT_SETTINGS.fontColor);
    assert.strictEqual(validated.translateMode, 'dual');
    assert.strictEqual(validated.targetLang, 'ja');
    assert.strictEqual(validated.animationLevel, common.DEFAULT_SETTINGS.animationLevel);
  });
});
