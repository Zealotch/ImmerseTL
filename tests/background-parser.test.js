const test = require('node:test');
const assert = require('node:assert');

// Mock chrome APIs minimally before requiring background.js
global.chrome = {
  commands: { onCommand: { addListener: () => {} } },
  runtime: { onMessage: { addListener: () => {} } },
  tabs: { query: () => {}, sendMessage: () => Promise.resolve() }
};

const { parseGoogleTranslateResponse } = require('../background.js');

test('background.js parseGoogleTranslateResponse', async (t) => {
  await t.test('CASE 1: Japanese response where trailing romaji appears in both [0] and [3] does NOT leak into translation', () => {
    const mockJson = [
      [
        ['Terumbu karang di senja hari, ', '夕闇の珊瑚礁', null, null, 10],
        ['kotak musik dari puing-puing.', '瓦礫のオルゴール', null, null, 10],
        ['yoiyami no sangoshou gareki no orugoru', null, null, 'yoiyami no sangoshou gareki no orugoru']
      ],
      null,
      'ja'
    ];

    const res = parseGoogleTranslateResponse(mockJson);
    assert.strictEqual(res.translation, 'Terumbu karang di senja hari, kotak musik dari puing-puing.');
    assert.strictEqual(res.romaji, 'yoiyami no sangoshou gareki no orugoru');
    assert.strictEqual(res.sourceLang, 'ja');
  });

  await t.test('CASE 2: Japanese response where trailing romaji has [0]=null and [3]=romaji', () => {
    const mockJson = [
      [
        ['Halo dunia', 'こんにちは世界', null, null, 10],
        [null, null, null, 'Konnichiwa sekai']
      ],
      null,
      'ja'
    ];

    const res = parseGoogleTranslateResponse(mockJson);
    assert.strictEqual(res.translation, 'Halo dunia');
    assert.strictEqual(res.romaji, 'Konnichiwa sekai');
    assert.strictEqual(res.sourceLang, 'ja');
  });

  await t.test('CASE 3: Single-segment Japanese translation is preserved', () => {
    const mockJson = [
      [
        ['Selamat pagi', 'おはようございます', null, null, 10]
      ],
      null,
      'ja'
    ];

    const res = parseGoogleTranslateResponse(mockJson);
    assert.strictEqual(res.translation, 'Selamat pagi');
    assert.strictEqual(res.romaji, '');
    assert.strictEqual(res.sourceLang, 'ja');
  });

  await t.test('CASE 4: English to Indonesian translation works normally with empty romaji', () => {
    const mockJson = [
      [
        ['Halo semuanya, ', 'Hello everyone, ', null, null, 10],
        ['apa kabar?', 'how are you?', null, null, 10]
      ],
      null,
      'en'
    ];

    const res = parseGoogleTranslateResponse(mockJson);
    assert.strictEqual(res.translation, 'Halo semuanya, apa kabar?');
    assert.strictEqual(res.romaji, '');
    assert.strictEqual(res.sourceLang, 'en');
  });

  await t.test('CASE 5: Non-Japanese trailing transliteration segment is also excluded from translation', () => {
    const mockJson = [
      [
        ['Terima kasih', '감사합니다', null, null, 10],
        ['gamsahabnida', null, null, 'gamsahabnida']
      ],
      null,
      'ko'
    ];

    const res = parseGoogleTranslateResponse(mockJson);
    assert.strictEqual(res.translation, 'Terima kasih');
    assert.strictEqual(res.romaji, '');
    assert.strictEqual(res.sourceLang, 'ko');
  });

  await t.test('CASE 6: Handles malformed or empty JSON gracefully', () => {
    assert.deepStrictEqual(parseGoogleTranslateResponse(null), { translation: '', romaji: '', sourceLang: '' });
    assert.deepStrictEqual(parseGoogleTranslateResponse([]), { translation: '', romaji: '', sourceLang: '' });
    assert.deepStrictEqual(parseGoogleTranslateResponse([null, null, 'ja']), { translation: '', romaji: '', sourceLang: 'ja' });
  });
});
