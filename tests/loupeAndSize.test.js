import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId } from './helpers/html.js';
import { loupeRegion, loupeCorner, LOUPE_MIN_SIDE } from '../src/lib/loupe.js';
import { TEXT_SIZES, sizeScale, fontCss } from '../src/lib/dateText.js';

const page = { width: 600, height: 800 };

describe('magnifier geometry', () => {
  it('centres on the item and is bigger than it', () => {
    const r = loupeRegion({ x: 200, y: 300, width: 100, height: 40 }, page);
    expect(r.side).toBeCloseTo(180);
    expect(r.sx + r.side / 2).toBeCloseTo(250);
    expect(r.sy + r.side / 2).toBeCloseTo(320);
  });
  it('stays inside the page, also at the corners', () => {
    for (const rect of [{ x: 0, y: 0, width: 50, height: 20 }, { x: 560, y: 780, width: 40, height: 20 }]) {
      const r = loupeRegion(rect, page);
      expect(r.sx).toBeGreaterThanOrEqual(0);
      expect(r.sy).toBeGreaterThanOrEqual(0);
      expect(r.sx + r.side).toBeLessThanOrEqual(page.width);
      expect(r.sy + r.side).toBeLessThanOrEqual(page.height);
    }
  });
  it('never gets tiny or larger than the page', () => {
    expect(loupeRegion({ x: 10, y: 10, width: 5, height: 5 }, page).side).toBe(LOUPE_MIN_SIDE);
    expect(loupeRegion({ x: 0, y: 0, width: 5000, height: 5000 }, page).side).toBe(600);
  });
  it('sits in the corner away from the item', () => {
    expect(loupeCorner({ x: 10, y: 0, width: 50, height: 10 }, page)).toBe('right');
    expect(loupeCorner({ x: 500, y: 0, width: 50, height: 10 }, page)).toBe('left');
  });
  it('has a hidden magnifier on the page', () => {
    const el = byId(parseHtml(read('index.html')), 'loupe');
    expect(el).toBeTruthy();
    expect(el.attrs.hidden).not.toBeUndefined();
  });
  it('shows it while dragging and hides it afterwards', () => {
    const src = read('src/ui/placement-layer.js');
    expect(src).toContain('showLoupe(');
    expect(src).toContain('hideLoupe()');
  });
});

describe('text size and bold', () => {
  it('has growing sizes with Normal as 1x', () => {
    const scales = TEXT_SIZES.map((s) => s.scale);
    expect([...scales].sort((a, b) => a - b)).toEqual(scales);
    expect(sizeScale('m')).toBe(1);
    expect(sizeScale('nope')).toBe(1);
  });
  it('adds bold to the font only when asked', () => {
    expect(fontCss('verdana', 20)).not.toContain('bold');
    expect(fontCss('verdana', 20, true).startsWith('bold 20px')).toBe(true);
  });
  it('offers every size and a bold box in the Free text sheet', () => {
    const html = read('index.html');
    for (const s of TEXT_SIZES) expect(html).toContain(`name="textSize" value="${s.id}"`);
    expect(html).toContain('id="textBold"');
  });
});
