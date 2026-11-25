// tests/drag-clamp.test.js
// Unit tests for Strict Drag Boundary Clamping in content/drag.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Minimal mock setup
global.window = {};
window.ImmerseTL = window.ImmerseTL || {};

const dragModule = require('../content/drag.js');
const { calculateClampBounds } = dragModule;

describe('content/drag.js - calculateClampBounds', () => {

  // Typical YouTube player: 854x480 at position (100, 50)
  const container = {
    left: 100,
    top: 50,
    width: 854,
    height: 480
  };

  // Subtitle element: 400x60 positioned initially at (300, 400)
  const element = {
    left: 300,
    top: 400,
    width: 400,
    height: 60
  };

  const margin = 8;

  it('CASE 1: Drag left beyond boundary is clamped to left margin of container', () => {
    const bounds = calculateClampBounds(container, element, margin);
    // element.left = 300, target minLeft = 100 + 8 = 108. minDx should be 108 - 300 = -192
    assert.equal(bounds.minDx, -192);

    // If user attempts to drag -500px to the left:
    const attemptedDx = -500;
    const clampedDx = Math.max(bounds.minDx, Math.min(bounds.maxDx, attemptedDx));
    assert.equal(clampedDx, -192, 'Should clamp to -192');
    
    // Resulting element left: 300 + (-192) = 108 (exactly container.left + margin)
    assert.equal(element.left + clampedDx, container.left + margin);
  });

  it('CASE 2: Drag right beyond boundary is clamped to right margin of container', () => {
    const bounds = calculateClampBounds(container, element, margin);
    // container right = 100 + 854 = 954. Max element right = 954 - 8 = 946
    // element right is 300 + 400 = 700. Max dx should be 946 - 700 = 246
    assert.equal(bounds.maxDx, 246);

    // If user attempts to drag +600px to the right:
    const attemptedDx = 600;
    const clampedDx = Math.max(bounds.minDx, Math.min(bounds.maxDx, attemptedDx));
    assert.equal(clampedDx, 246, 'Should clamp to 246');

    // Resulting element right: 300 + 400 + 246 = 946 (exactly container.right - margin)
    assert.equal(element.left + element.width + clampedDx, container.left + container.width - margin);
  });

  it('CASE 3: Drag top beyond boundary is clamped to top margin of container', () => {
    const bounds = calculateClampBounds(container, element, margin);
    // container top = 50. Min element top = 50 + 8 = 58
    // element top is 400. Min dy should be 58 - 400 = -342
    assert.equal(bounds.minDy, -342);

    // If user attempts to drag -600px upwards:
    const attemptedDy = -600;
    const clampedDy = Math.max(bounds.minDy, Math.min(bounds.maxDy, attemptedDy));
    assert.equal(clampedDy, -342);

    // Resulting element top: 400 + (-342) = 58 (exactly container.top + margin)
    assert.equal(element.top + clampedDy, container.top + margin);
  });

  it('CASE 4: Drag bottom beyond boundary is clamped to bottom margin of container', () => {
    const bounds = calculateClampBounds(container, element, margin);
    // container bottom = 50 + 480 = 530. Max element bottom = 530 - 8 = 522
    // element bottom is 400 + 60 = 460. Max dy should be 522 - 460 = 62
    assert.equal(bounds.maxDy, 62);

    // If user attempts to drag +200px downwards:
    const attemptedDy = 200;
    const clampedDy = Math.max(bounds.minDy, Math.min(bounds.maxDy, attemptedDy));
    assert.equal(clampedDy, 62);

    // Resulting element bottom: 400 + 60 + 62 = 522 (exactly container.bottom - margin)
    assert.equal(element.top + element.height + clampedDy, container.top + container.height - margin);
  });

  it('CASE 5: Movement within boundaries is completely unrestricted', () => {
    const bounds = calculateClampBounds(container, element, margin);
    
    // Move 50px right, 20px up (both within bounds)
    const dx = 50;
    const dy = -20;
    const clampedDx = Math.max(bounds.minDx, Math.min(bounds.maxDx, dx));
    const clampedDy = Math.max(bounds.minDy, Math.min(bounds.maxDy, dy));

    assert.equal(clampedDx, 50, 'Within-bounds dx is unchanged');
    assert.equal(clampedDy, -20, 'Within-bounds dy is unchanged');
  });

  it('CASE 6: Free-Floating mode using viewport coordinates (left=0, top=0)', () => {
    const viewport = { left: 0, top: 0, width: 1920, height: 1080 };
    const el = { left: 500, top: 500, width: 300, height: 100 };

    const bounds = calculateClampBounds(viewport, el, 10);
    assert.equal(bounds.minDx, 10 - 500); // -490
    assert.equal(bounds.maxDx, (1920 - 10 - 300) - 500); // 1110
    assert.equal(bounds.minDy, 10 - 500); // -490
    assert.equal(bounds.maxDy, (1080 - 10 - 100) - 500); // 470
  });

  it('CASE 7: Edge case - element wider than container is safely clamped without inversion', () => {
    const narrowContainer = { left: 0, top: 0, width: 300, height: 400 };
    const wideElement = { left: 50, top: 50, width: 350, height: 50 }; // 350px > 300px

    const bounds = calculateClampBounds(narrowContainer, wideElement, margin);
    // minDx must not be greater than maxDx
    assert.ok(bounds.minDx <= bounds.maxDx, 'minDx must never exceed maxDx');
    
    const attemptedDx = 100;
    const clampedDx = Math.max(bounds.minDx, Math.min(bounds.maxDx, attemptedDx));
    assert.ok(Number.isFinite(clampedDx));
  });
});
