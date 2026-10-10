import { describe, it, expect } from 'vitest';
import { luminance, makeWhiteTransparent, findInkBounds, estimateThreshold } from '../src/lib/transparency.js';

const px = (...rgba) => new Uint8ClampedArray(rgba);

describe('luminance', () => {
  it('is 255 for white', () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(255);
  });
  it('is 0 for black', () => {
    expect(luminance(0, 0, 0)).toBe(0);
  });
  it('estimateThreshold sits just below the paper brightness of a grayish photo', () => {
    // 90 "paper" pixels at 170 and 10 "ink" pixels at 20
    const data = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < 100; i += 1) {
      const v = i < 10 ? 20 : 170;
      data.set([v, v, v, 255], i * 4);
    }
    const t = estimateThreshold(data);
    expect(t).toBeLessThan(170);
    expect(t).toBeGreaterThan(100);
  });
});

describe('makeWhiteTransparent', () => {
  const opts = { threshold: 200, softness: 40 };

  it('makes white pixels fully transparent', () => {
    expect(makeWhiteTransparent(px(255, 255, 255, 255), opts)[3]).toBe(0);
  });
  it('keeps dark ink fully opaque', () => {
    expect(makeWhiteTransparent(px(10, 10, 10, 255), opts)[3]).toBe(255);
  });
  it('gives mid-gray pixels in the soft band partial alpha', () => {
    const a = makeWhiteTransparent(px(180, 180, 180, 255), opts)[3];
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });
  it('does not mutate the input buffer', () => {
    const input = px(255, 255, 255, 255);
    makeWhiteTransparent(input, opts);
    expect(input[3]).toBe(255);
  });
  it('never increases existing transparency', () => {
    const out = makeWhiteTransparent(px(0, 0, 0, 0, 0, 0, 0, 100), opts);
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(100);
  });
});

describe('findInkBounds', () => {
  it('returns the bounding box of visible pixels', () => {
    // 4x3 image, one opaque pixel at (1,1) and one at (2,2)
    const data = new Uint8ClampedArray(4 * 3 * 4);
    data[(1 * 4 + 1) * 4 + 3] = 255;
    data[(2 * 4 + 2) * 4 + 3] = 255;
    expect(findInkBounds(data, 4, 3)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });
  it('finds ink that touches every edge of the image', () => {
    const w = 5;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    const set = (x, y) => (data[(y * w + x) * 4 + 3] = 255);
    set(2, 0); // top edge
    set(0, 2); // left edge
    set(4, 1); // right edge
    set(3, 3); // bottom edge
    expect(findInkBounds(data, w, h)).toEqual({ x: 0, y: 0, width: 5, height: 4 });
  });
  it('returns null when nothing is visible', () => {
    expect(findInkBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});
