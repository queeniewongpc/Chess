import test from 'node:test';
import assert from 'node:assert/strict';
import { fitDesktopBoard } from '../src/boardLayout.js';

test('short laptop windows retain the tall board instead of disabling sticky layout', () => {
  // The reported 1280 × 550 layout had 309.4px of surrounding content.
  for (const viewportHeight of [500, 550, 600, 900]) {
    const fit = fitDesktopBoard({ viewportHeight, chromeHeight: 309.4, naturalWidth: 350, columns: 4, rows: 8 });
    assert.ok(fit);
    assert.ok(fit.width >= 128, 'each tall-board square stays at least 32px');
    assert.equal(fit.height, fit.width * 2);
    assert.ok(fit.top + 309.4 + fit.height <= viewportHeight - 15);
  }
  const short = fitDesktopBoard({ viewportHeight: 550, chromeHeight: 309.4, naturalWidth: 350, columns: 4, rows: 8 });
  assert.ok(short.top < 0, 'an oversized panel anchors after a small natural upward scroll');
});

test('every board shape fits with square cells and never exceeds its available column', () => {
  for (const [columns, rows, naturalWidth] of [[8, 4, 700], [4, 8, 350], [8, 8, 700]]) {
    const fit = fitDesktopBoard({ viewportHeight: 600, chromeHeight: 210, naturalWidth, columns, rows });
    assert.ok(fit.width <= naturalWidth);
    assert.equal(fit.width / columns, fit.height / rows);
    assert.equal(fit.top, 16);
    assert.ok(fit.height + 210 + 32 <= 600);
  }
});

test('very narrow desktop columns never overflow to enforce the preferred square size', () => {
  const fit = fitDesktopBoard({ viewportHeight: 500, chromeHeight: 240, naturalWidth: 230, columns: 8, rows: 8 });
  assert.equal(fit.width, 230);
  assert.equal(fit.height, 230);
  assert.equal(fit.top, 14);
});

test('a hidden or unmeasurable board does not produce invalid CSS dimensions', () => {
  const dimensions = { viewportHeight: 550, chromeHeight: 200, naturalWidth: 350, columns: 4, rows: 8 };
  for (const invalid of [{ naturalWidth: 0 }, { viewportHeight: NaN }, { chromeHeight: -1 }, { rows: 0 }]) {
    assert.equal(fitDesktopBoard({ ...dimensions, ...invalid }), null);
  }
});
