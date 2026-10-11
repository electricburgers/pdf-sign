import { describe, it, expect } from 'vitest';
import {
  createPlacement,
  addPlacement,
  removePlacement,
  updatePlacement,
  placementsForPage,
  movePlacement,
  resizePlacement,
  defaultPlacement,
  applyToAllPages,
} from '../src/lib/placements.js';

const base = { kind: 'signature', page: 0, x: 0.1, y: 0.1, width: 0.3, height: 0.1 };

describe('createPlacement', () => {
  it('assigns a unique id to each placement', () => {
    const a = createPlacement(base);
    const b = createPlacement(base);
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
  it('rejects unknown kinds and negative page indexes', () => {
    expect(() => createPlacement({ ...base, kind: 'banana' })).toThrow();
    expect(() => createPlacement({ ...base, page: -1 })).toThrow();
  });
});

describe('list operations', () => {
  it('addPlacement returns a new array without mutating the original', () => {
    const list = [];
    const next = addPlacement(list, createPlacement(base));
    expect(list).toHaveLength(0);
    expect(next).toHaveLength(1);
  });
  it('removePlacement removes by id', () => {
    const p = createPlacement(base);
    const q = createPlacement(base);
    expect(removePlacement([p, q], p.id)).toEqual([q]);
  });
  it('updatePlacement patches only the target placement', () => {
    const p = createPlacement(base);
    const q = createPlacement(base);
    const next = updatePlacement([p, q], q.id, { x: 0.5 });
    expect(next[0]).toBe(p);
    expect(next[1].x).toBe(0.5);
    expect(next[1].id).toBe(q.id);
  });
  it('placementsForPage filters by page', () => {
    const p = createPlacement(base);
    const q = createPlacement({ ...base, page: 2 });
    expect(placementsForPage([p, q], 2)).toEqual([q]);
  });
});

describe('movePlacement', () => {
  it('shifts a placement by the given delta', () => {
    const p = createPlacement(base);
    const [moved] = movePlacement([p], p.id, 0.1, 0.2);
    expect(moved.x).toBeCloseTo(0.2);
    expect(moved.y).toBeCloseTo(0.3);
  });
  it('clamps the placement at the page edges', () => {
    const p = createPlacement(base);
    const [moved] = movePlacement([p], p.id, 5, -5);
    expect(moved.x).toBeCloseTo(0.7);
    expect(moved.y).toBe(0);
  });
});

describe('resizePlacement', () => {
  // page displayed 600 wide x 800 tall -> pageAspect 0.75; image twice as wide as tall
  const opts = { imageAspect: 2, pageAspect: 0.75 };

  it('keeps the image aspect ratio when resizing', () => {
    const p = createPlacement(base);
    const [r] = resizePlacement([p], p.id, 0.4, opts);
    expect(r.width).toBeCloseTo(0.4);
    // 0.4 * 600px = 240px wide -> 120px tall -> 120/800 = 0.15
    expect(r.height).toBeCloseTo(0.15);
  });
  it('enforces a minimum width', () => {
    const p = createPlacement(base);
    const [r] = resizePlacement([p], p.id, 0.001, opts);
    expect(r.width).toBeCloseTo(0.03);
  });
  it('caps the width so the placement stays on the page', () => {
    const p = createPlacement({ ...base, x: 0.6 });
    const [r] = resizePlacement([p], p.id, 0.9, opts);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('defaultPlacement', () => {
  it('makes signatures wider than initials and centers them horizontally', () => {
    const sig = defaultPlacement('signature', 0, { imageAspect: 3, pageAspect: 0.77 });
    const ini = defaultPlacement('initials', 0, { imageAspect: 1, pageAspect: 0.77 });
    expect(sig.width).toBeCloseTo(0.35);
    expect(ini.width).toBeCloseTo(0.12);
    expect(sig.x + sig.width / 2).toBeCloseTo(0.5);
    expect(sig.y).toBeGreaterThan(0.5);
  });
  it('derives the height from the image and page aspect ratios', () => {
    const sig = defaultPlacement('signature', 3, { imageAspect: 2, pageAspect: 0.75 });
    expect(sig.page).toBe(3);
    expect(sig.height).toBeCloseTo((0.35 * 0.75) / 2);
  });
});

describe('applyToAllPages', () => {
  it('copies a placement onto every other page with new ids', () => {
    const p = createPlacement({ ...base, kind: 'initials', page: 1 });
    const next = applyToAllPages([p], p.id, 4);
    expect(next).toHaveLength(4);
    expect(next.map((n) => n.page).sort()).toEqual([0, 1, 2, 3]);
    expect(new Set(next.map((n) => n.id)).size).toBe(4);
    expect(next.every((n) => n.kind === 'initials' && n.x === p.x)).toBe(true);
  });
  it('keeps the image undistorted on pages with a different shape', () => {
    // page 0 portrait (aspect 0.75), page 1 landscape (aspect 4/3); image 2:1
    const portrait = 0.75;
    const landscape = 4 / 3;
    const p = createPlacement({ kind: 'initials', page: 0, x: 0.8, y: 0.85, width: 0.1, height: (0.1 * portrait) / 2 });
    const next = applyToAllPages([p], p.id, 2, { imageAspect: 2, pageAspectOf: (i) => (i === 0 ? portrait : landscape) });
    const copy = next.find((n) => n.page === 1);
    // displayed width/height ratio must still be 2:1 on the landscape page
    expect((copy.width * landscape) / copy.height).toBeCloseTo(2);
    expect(copy.y + copy.height).toBeLessThanOrEqual(1);
  });
});

describe('stamps, rotation and color', () => {
  const image = { dataUrl: 'data:image/png;base64,AA==', width: 10, height: 10 };
  const tint = { dataUrl: 'data:image/png;base64,BB==', width: 10, height: 10 };

  it('accepts the stamp kind', () => {
    expect(createPlacement({ ...base, kind: 'stamp', image, text: 'Checkmark' }).kind).toBe('stamp');
  });
  it('keeps rotation, and color only together with its tinted image', () => {
    const a = createPlacement({ ...base, rotation: 30, color: '#c0392b', tint });
    expect(a).toMatchObject({ rotation: 30, color: '#c0392b', tint });
    const b = createPlacement({ ...base, color: '#c0392b' });
    expect(b.color).toBeUndefined();
    expect(createPlacement(base).rotation).toBeUndefined();
  });
  it('copies rotation and color to every page', () => {
    const p = createPlacement({ ...base, rotation: -45, color: '#111111', tint });
    const all = applyToAllPages([p], p.id, 3);
    expect(all).toHaveLength(3);
    for (const copy of all.slice(1)) expect(copy).toMatchObject({ rotation: -45, color: '#111111', tint });
  });
});
