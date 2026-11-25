const test = require('node:test');
const assert = require('node:assert');

let elementsById = {};

function createMockElement(tag) {
  let _id = '';
  return {
    tagName: tag.toUpperCase(),
    style: {
      setProperty: function(k, v) { this[k] = v; },
      display: 'none',
      position: ''
    },
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    className: '',
    innerHTML: '',
    children: [],
    scrollHeight: 100,
    scrollTop: 0,
    clientHeight: 100,
    dataset: {},
    set id(val) {
      _id = val;
      elementsById[val] = this;
    },
    get id() {
      return _id;
    },
    appendChild: function(child) { this.children.push(child); child.parentElement = this; },
    removeChild: function(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
    },
    querySelector: function(sel) { return null; },
    querySelectorAll: function() { return []; },
    remove: function() {
      if (_id) delete elementsById[_id];
    }
  };
}

let mockBody = createMockElement('body');

global.document = {
  body: mockBody,
  getElementById: (id) => elementsById[id] || null,
  createElement: (tag) => createMockElement(tag),
  querySelector: () => mockBody
};

global.window = {};
window.ImmerseTL = window.ImmerseTL || {};

require('../content/history.js');
const history = window.ImmerseTL.history;

test('History Lazy Render Management', async (t) => {
  t.beforeEach(() => {
    history.clear();
    elementsById = {};
    mockBody.children = [];
  });

  await t.test('CASE 1: When showHistory is false, items accumulate in memory without rendering DOM', () => {
    window.ImmerseTL.settings = { showHistory: false };

    history.update("Sentence 1", { translation: "Kalimat 1" });
    history.update("Sentence 2", { translation: "Kalimat 2" });
    history.update("Sentence 3", { translation: "Kalimat 3" });

    // In-memory array must have 3 items
    assert.strictEqual(history.list.length, 3, 'Memory array must contain 3 items');

    // DOM content element should not have children rendered
    if (history.content) {
      assert.strictEqual(history.content.children.length, 0, 'No DOM children should be rendered when panel is closed');
    }
  });

  await t.test('CASE 2: When showHistory becomes true, render() populates DOM elements', () => {
    window.ImmerseTL.settings = { showHistory: false };

    history.update("Sentence 1", { translation: "Kalimat 1" });
    history.update("Sentence 2", { translation: "Kalimat 2" });

    // Open history panel
    window.ImmerseTL.settings.showHistory = true;
    history.render();

    assert.ok(history.content, 'history.content must exist after render');
    assert.strictEqual(history.content.children.length, 2, 'All 2 items should now be rendered to DOM');
    assert.ok(history.content.children[0].innerHTML.includes('Kalimat 1'));
    assert.ok(history.content.children[1].innerHTML.includes('Kalimat 2'));
  });

  await t.test('CASE 3: When showHistory is active, real-time updates render to DOM', () => {
    window.ImmerseTL.settings = { showHistory: true };

    history.update("Sentence 1", { translation: "Kalimat 1" });
    assert.strictEqual(history.content.children.length, 1);

    history.update("Sentence 2", { translation: "Kalimat 2" });
    assert.strictEqual(history.content.children.length, 2);
  });

  await t.test('CASE 4: Closing panel stops DOM mutations while continuing memory storage', () => {
    window.ImmerseTL.settings = { showHistory: true };
    history.update("Sentence 1", { translation: "Kalimat 1" });
    assert.strictEqual(history.content.children.length, 1);

    // Close panel
    window.ImmerseTL.settings.showHistory = false;
    history.update("Sentence 2", { translation: "Kalimat 2" });

    // Memory has 2, but DOM children stays at 1
    assert.strictEqual(history.list.length, 2, 'Memory array still receives new sentence');
    assert.strictEqual(history.content.children.length, 1, 'DOM children does not update when closed');
  });
});
