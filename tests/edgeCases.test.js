// Edge cases for the small pure helpers: zoom, fields, zip, lru, memo, geometry, csp.
import { describe, it, expect, vi } from 'vitest';
import { clampZoom, clampView, zoomAbout, pinchView, panView, viewTransform, distance, midpoint, MIN_ZOOM, MAX_ZOOM } from '../src/lib/zoom.js';
import { fieldFractions, guessKind, fitInto } from '../src/lib/fields.js';
import { crc32, uniqueNames, createZip } from '../src/lib/zip.js';
import { createLru } from '../src/lib/lru.js';
import { memoizeLast } from '../src/lib/memo.js';
import { normalizeRotation, displaySize, displayToPdfPoint, pdfPointToDisplay, clampRect, fitScale } from '../src/lib/geometry.js';
import { makeWhiteTransparent, estimateThreshold, findInkBounds } from '../src/lib/transparency.js';
import { CSP_DIRECTIVES, cspForMeta } from '../src/lib/csp.js';

const page = { width: 400, height: 600 };

describe('zoom edge cases', () => {
  it('clamps NaN, Infinity and negatives to a sane zoom', () => {
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(1);
    expect(clampZoom(-5)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
  });

  it('keeps a 1x view pinned to the origin whatever the offset', () => {
    expect(clampView({ zoom: 1, x: -50, y: 30 }, page)).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it('never lets a zoomed view slide past the page edges', () => {
    expect(clampView({ zoom: 2, x: -9999, y: -9999 }, page)).toEqual({ zoom: 2, x: -400, y: -600 });
    expect(clampView({ zoom: 2, x: 500, y: 500 }, page)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it('keeps the anchor point still while zooming about it', () => {
    const v = zoomAbout({ zoom: 1, x: 0, y: 0 }, 2, { x: 200, y: 300 }, page);
    expect(v).toEqual({ zoom: 2, x: -200, y: -300 });
  });

  it('zooming back to 1x returns to the origin', () => {
    const zoomed = zoomAbout({ zoom: 1, x: 0, y: 0 }, 3, { x: 100, y: 100 }, page);
    expect(zoomAbout(zoomed, 1, { x: 100, y: 100 }, page)).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it('pinch does not divide by zero when both fingers start on one point', () => {
    const start = { a: { x: 10, y: 10 }, b: { x: 10, y: 10 }, view: { zoom: 1, x: 0, y: 0 } };
    const v = pinchView(start, { a: { x: 10, y: 10 }, b: { x: 20, y: 10 } }, page);
    expect(Number.isFinite(v.zoom) && Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
  });

  it('pinch zoom is capped at the maximum', () => {
    const start = { a: { x: 100, y: 100 }, b: { x: 110, y: 100 }, view: { zoom: 1, x: 0, y: 0 } };
    expect(pinchView(start, { a: { x: 0, y: 100 }, b: { x: 400, y: 100 } }, page).zoom).toBe(MAX_ZOOM);
  });

  it('panning is a no-op at 1x and clamped when zoomed', () => {
    expect(panView({ zoom: 1, x: 0, y: 0 }, 40, 40, page)).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(panView({ zoom: 2, x: -390, y: 0 }, -50, 0, page).x).toBe(-400);
  });

  it('measures distance and midpoint, and emits no transform at 1x', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    expect(viewTransform({ zoom: 1, x: 0, y: 0 })).toBe('');
    expect(viewTransform({ zoom: 2, x: -10, y: -20 })).toBe('translate(-10px, -20px) scale(2)');
  });
});

describe('form field edge cases', () => {
  it('handles a field rect given with its corners swapped', () => {
    expect(fieldFractions([200, 300, 100, 100], 400, 400)).toEqual({ x: 0.25, y: 0.25, width: 0.25, height: 0.5 });
  });

  it('guesses the kind from the field name, with signature as the fallback', () => {
    expect(guessKind({ name: 'Applicant_Initials' })).toBe('initials');
    expect(guessKind({ name: 'DOB' })).toBe('date');
    expect(guessKind({ name: 'Date signed' })).toBe('date');
    expect(guessKind({ name: 'Employee Signature' })).toBe('signature');
    expect(guessKind({ name: 'Notes' })).toBe('signature');
    expect(guessKind()).toBe('signature');
  });

  it('treats a signature-type field as a signature even if named like a date', () => {
    expect(guessKind({ name: 'date', type: 'Sig' })).toBe('signature');
  });

  it('fits a wide image by width and a tall image by height, centred, inside the field', () => {
    const field = { x: 0.2, y: 0.4, width: 0.4, height: 0.1 };
    for (const aspect of [8, 1, 0.2]) {
      const r = fitInto(field, aspect, 0.75);
      expect(r.x).toBeGreaterThanOrEqual(field.x);
      expect(r.y).toBeGreaterThanOrEqual(field.y);
      expect(r.x + r.width).toBeLessThanOrEqual(field.x + field.width + 1e-9);
      expect(r.y + r.height).toBeLessThanOrEqual(field.y + field.height + 1e-9);
      expect(r.x + r.width / 2).toBeCloseTo(field.x + field.width / 2);
      expect(r.y + r.height / 2).toBeCloseTo(field.y + field.height / 2);
    }
  });
});

describe('zip edge cases', () => {
  it('matches the known CRC-32 of "123456789" and of nothing', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('numbers duplicate names, keeping extensions and dotfiles intact', () => {
    expect(uniqueNames(['a.pdf', 'a.pdf', 'a.pdf', 'b.pdf'])).toEqual(['a.pdf', 'a (2).pdf', 'a (3).pdf', 'b.pdf']);
    expect(uniqueNames(['.env', '.env'])).toEqual(['.env', '.env (2)']);
    expect(uniqueNames(['noext', 'noext'])).toEqual(['noext', 'noext (2)']);
  });

  it('writes an empty archive as just the end-of-central-directory record', () => {
    const zip = createZip([]);
    expect(zip.length).toBe(22);
    expect(new DataView(zip.buffer).getUint32(0, true)).toBe(0x06054b50);
  });

  it('records the right entry count, and stores UTF-8 names and bytes verbatim', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const zip = createZip([{ name: 'é.pdf', bytes }, { name: 'b.pdf', bytes }], new Date(2026, 10, 6, 10, 0, 0));
    const view = new DataView(zip.buffer);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
    const nameLen = view.getUint16(26, true);
    expect([...zip.slice(30 + nameLen, 30 + nameLen + 4)]).toEqual([1, 2, 3, 4]);
  });
});

describe('lru and memo edge cases', () => {
  it('evicts the least recently used entry, not the oldest inserted', () => {
    const evicted = [];
    const lru = createLru(2, (v, k) => evicted.push(k));
    lru.set('a', 1);
    lru.set('b', 2);
    lru.get('a');
    lru.set('c', 3);
    expect(evicted).toEqual(['b']);
    expect(lru.has('a') && lru.has('c')).toBe(true);
  });

  it('re-setting a key does not evict anything or grow the cache', () => {
    const onEvict = vi.fn();
    const lru = createLru(2, onEvict);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('a', 9);
    expect(lru.size).toBe(2);
    expect(onEvict).not.toHaveBeenCalled();
    expect(lru.get('a')).toBe(9);
  });

  it('clear and delete both release entries through onEvict', () => {
    const onEvict = vi.fn();
    const lru = createLru(5, onEvict);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.delete('a');
    lru.delete('missing');
    expect(onEvict).toHaveBeenCalledTimes(1);
    lru.clear();
    expect(onEvict).toHaveBeenCalledTimes(2);
    expect(lru.size).toBe(0);
  });

  it('memoizeLast remembers undefined results and recomputes on a new argument', () => {
    const fn = vi.fn(() => undefined);
    const memo = memoizeLast(fn);
    memo(1);
    memo(1);
    expect(fn).toHaveBeenCalledTimes(1);
    memo(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('geometry and csp edge cases', () => {
  it('normalizes negative and large rotations and rejects odd ones', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(720)).toBe(0);
    expect(() => normalizeRotation(45)).toThrow();
    expect(() => normalizeRotation(NaN)).toThrow();
  });

  it('round-trips a point through display and PDF space at every rotation and scale', () => {
    const box = { x: 10, y: 20, width: 300, height: 500 };
    for (const rotation of [0, 90, 180, 270]) {
      const pdf = displayToPdfPoint(37, 91, { box, rotation, scale: 1.5 });
      const back = pdfPointToDisplay(pdf.x, pdf.y, { box, rotation, scale: 1.5 });
      expect(back.x).toBeCloseTo(37);
      expect(back.y).toBeCloseTo(91);
    }
  });

  it('swaps display width and height for 90 and 270 only', () => {
    const box = { x: 0, y: 0, width: 100, height: 200 };
    expect(displaySize(box, 90, 2)).toEqual({ width: 400, height: 200 });
    expect(displaySize(box, 180, 2)).toEqual({ width: 200, height: 400 });
  });

  it('clamps a rect that is too big, negative or off the page', () => {
    expect(clampRect({ x: 0.9, y: -1, width: 0.5, height: 2 })).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
    expect(clampRect({ x: 0.5, y: 0.5, width: -1, height: 0.2 })).toEqual({ x: 0.5, y: 0.5, width: 0, height: 0.2 });
  });

  it('fits pages to the container but never past the max scale', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    expect(fitScale(box, 0, 1000)).toBe(2);
    expect(fitScale(box, 0, 50)).toBe(0.5);
  });

  it('keeps frame-ancestors out of the meta CSP, where browsers ignore it', () => {
    expect(CSP_DIRECTIVES.some((d) => d.startsWith('frame-ancestors'))).toBe(true);
    expect(cspForMeta()).not.toContain('frame-ancestors');
    expect(cspForMeta()).toContain("default-src");
  });
});

describe('signature image edge cases', () => {
  it('fades a mid-grey pixel halfway and leaves the input buffer untouched', () => {
    const input = new Uint8ClampedArray([180, 180, 180, 255, 255, 255, 255, 255, 0, 0, 0, 255]);
    const out = makeWhiteTransparent(input, { threshold: 200, softness: 40 });
    expect(out[3]).toBe(Math.round(255 * (20 / 40)));
    expect(out[7]).toBe(0);
    expect(out[11]).toBe(255);
    expect(input[3]).toBe(255);
  });

  it('estimates 200 for a fully transparent image and stays within 60..230', () => {
    expect(estimateThreshold(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0]))).toBe(200);
    expect(estimateThreshold(new Uint8ClampedArray([255, 255, 255, 255]))).toBe(230);
    expect(estimateThreshold(new Uint8ClampedArray([0, 0, 0, 255]))).toBe(60);
  });

  it('finds the tight bounds of the ink, or null for a blank image', () => {
    const w = 6;
    const h = 5;
    const data = new Uint8ClampedArray(w * h * 4);
    for (const [x, y] of [[2, 1], [4, 3]]) data[(y * w + x) * 4 + 3] = 255;
    expect(findInkBounds(data, w, h)).toEqual({ x: 2, y: 1, width: 3, height: 3 });
    expect(findInkBounds(new Uint8ClampedArray(w * h * 4), w, h)).toBeNull();
  });
});
