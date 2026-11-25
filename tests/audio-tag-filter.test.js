// tests/audio-tag-filter.test.js
// Unit tests for Audio Tag Filtering in caption-processor.js and caption-source.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const captionProcessor = require('../content/caption-processor.js');

describe('caption-processor.js - filterAudioTags', () => {

  it('CASE 1: Single pure English audio tags are filtered out completely', () => {
    assert.equal(captionProcessor.filterAudioTags('[Music]'), '');
    assert.equal(captionProcessor.filterAudioTags('[music]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Applause]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Laughter]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Cheering]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Sigh]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Cough]'), '');
    assert.equal(captionProcessor.filterAudioTags('(Applause)'), '');
    assert.equal(captionProcessor.filterAudioTags('(Music)'), '');
  });

  it('CASE 2: Musical notes (♪ ♫ ♬ ♩) are filtered out completely', () => {
    assert.equal(captionProcessor.filterAudioTags('♪'), '');
    assert.equal(captionProcessor.filterAudioTags('♪♪♪'), '');
    assert.equal(captionProcessor.filterAudioTags('♫ ♬ ♩'), '');
    assert.equal(captionProcessor.filterAudioTags('♪ [Music] ♪'), '');
  });

  it('CASE 3: Japanese full-width audio tags are filtered out completely', () => {
    assert.equal(captionProcessor.filterAudioTags('（拍手）'), '');
    assert.equal(captionProcessor.filterAudioTags('（笑い）'), '');
    assert.equal(captionProcessor.filterAudioTags('（笑）'), '');
    assert.equal(captionProcessor.filterAudioTags('（音楽）'), '');
    assert.equal(captionProcessor.filterAudioTags('[音楽]'), '');
    assert.equal(captionProcessor.filterAudioTags('（歓声）'), '');
    assert.equal(captionProcessor.filterAudioTags('（ため息）'), '');
  });

  it('CASE 4: Multi-word audio tags are filtered out completely', () => {
    assert.equal(captionProcessor.filterAudioTags('[Laughter and applause]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Applause and cheers]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Music playing]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Upbeat music]'), '');
    assert.equal(captionProcessor.filterAudioTags('[Dramatic music]'), '');
    assert.equal(captionProcessor.filterAudioTags('（拍手と歓声）'), '');
  });

  it('CASE 5: Audio tags mixed into speech dialogue are stripped while speech is preserved', () => {
    assert.equal(
      captionProcessor.filterAudioTags('[Music] Hello everyone! [Applause]'),
      'Hello everyone!'
    );
    assert.equal(
      captionProcessor.filterAudioTags('♪ Good evening, welcome to the stream ♪'),
      'Good evening, welcome to the stream'
    );
    assert.equal(
      captionProcessor.filterAudioTags('Thank you very much! [Applause]'),
      'Thank you very much!'
    );
    assert.equal(
      captionProcessor.filterAudioTags('（笑い）みなさん、こんにちは（拍手）'),
      'みなさん、こんにちは'
    );
  });

  it('CASE 6: Speaker names and ordinary dialogue must NOT be stripped', () => {
    assert.equal(
      captionProcessor.filterAudioTags('[John]: Welcome to the show'),
      '[John]: Welcome to the show'
    );
    assert.equal(
      captionProcessor.filterAudioTags('[Host] Let us begin'),
      '[Host] Let us begin'
    );
    assert.equal(
      captionProcessor.filterAudioTags('【Fubuki】Konnichiwa!'),
      '【Fubuki】Konnichiwa!'
    );
    assert.equal(
      captionProcessor.filterAudioTags('I really love listening to music'),
      'I really love listening to music'
    );
    assert.equal(
      captionProcessor.filterAudioTags('The applause was very loud tonight'),
      'The applause was very loud tonight'
    );
    assert.equal(
      captionProcessor.filterAudioTags('Musicians play instruments'),
      'Musicians play instruments'
    );
  });

  it('CASE 7: Empty or whitespace-only captions return empty string', () => {
    assert.equal(captionProcessor.filterAudioTags(''), '');
    assert.equal(captionProcessor.filterAudioTags('   '), '');
    assert.equal(captionProcessor.filterAudioTags(null), '');
    assert.equal(captionProcessor.filterAudioTags(undefined), '');
  });
});

describe('caption-source.js - Audio Tag Filter DOM Integration', () => {
  global.MutationObserver = class {
    constructor() {}
    observe() {}
    disconnect() {}
  };

  function createMockElement(tag, textContent = '') {
    return {
      tagName: tag.toUpperCase(),
      textContent: textContent,
      dataset: {},
      offsetWidth: 100,
      offsetHeight: 30,
      style: {},
      classList: { contains: () => false },
      querySelectorAll: function(sel) {
        if (sel.includes('.ytp-caption-segment') && this._segments) {
          return this._segments;
        }
        return [];
      },
      querySelector: () => null,
      contains: () => false
    };
  }

  it('CASE 8: DOM caption with pure [Music] is ignored and triggers 0 calls to stabilizer/overlay', () => {
    // Setup environment
    global.window = {};
    window.ImmerseTL = {
      captionProcessor: captionProcessor
    };

    const targetNode = createMockElement('div');
    const seg = createMockElement('span', '[Music]');
    targetNode._segments = [seg];

    global.document = {
      querySelector: (sel) => sel === 'video' ? {} : null,
      querySelectorAll: (sel) => [targetNode]
    };
    global.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' });

    let stabilizerCalled = false;
    let overlayCalled = false;
    window.ImmerseTL.cueStabilizer = {
      process: () => { stabilizerCalled = true; }
    };
    window.ImmerseTL.overlay = {
      updateCustomSubtitle: () => { overlayCalled = true; },
      updateVisibility: () => {}
    };

    delete require.cache[require.resolve('../content/caption-source.js')];
    require('../content/caption-source.js');

    window.ImmerseTL.captionSource.checkObserver();

    assert.equal(stabilizerCalled, false, 'Stabilizer must NOT be called for pure audio tags');
    assert.equal(overlayCalled, false, 'Overlay must NOT be called for pure audio tags');

    window.ImmerseTL.captionSource.cleanup();
  });

  it('CASE 9: DOM caption with [Music] Hello world is stripped to Hello world before reaching stabilizer', () => {
    global.window = {};
    window.ImmerseTL = {
      captionProcessor: captionProcessor
    };

    const targetNode = createMockElement('div');
    const seg1 = createMockElement('span', '[Music]');
    const seg2 = createMockElement('span', 'Hello world');
    targetNode._segments = [seg1, seg2];

    global.document = {
      querySelector: (sel) => sel === 'video' ? {} : null,
      querySelectorAll: (sel) => [targetNode]
    };
    global.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' });

    let processedText = null;
    window.ImmerseTL.cueStabilizer = {
      process: (text) => { processedText = text; }
    };
    window.ImmerseTL.overlay = {
      updateCustomSubtitle: () => {},
      updateVisibility: () => {}
    };

    delete require.cache[require.resolve('../content/caption-source.js')];
    require('../content/caption-source.js');

    window.ImmerseTL.captionSource.checkObserver();

    assert.equal(processedText, 'Hello world', 'Stabilizer should receive clean dialogue without [Music]');

    window.ImmerseTL.captionSource.cleanup();
  });
});
