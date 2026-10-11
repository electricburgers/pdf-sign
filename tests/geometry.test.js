import { describe, it, expect } from 'vitest';
import {
  normalizeRotation,
  displaySize,
  displayToPdfPoint,
  pdfPointToDisplay,
  placementToDrawParams,
  fitScale,
  clampRect,
} from '../src/lib/geometry.js';

const LETTER = { x: 0, y: 0, width: 612, height: 792 };

describe('normalizeRotation', () => {
  it('keeps 0 as 0', () => {
    expect(normalizeRotation(0)).toBe(0);
  });
  it('wraps values above 360', () => {
    expect(normalizeRotation(450)).toBe(90);
  });
  it('converts negative rotations', () => {
    expect(normalizeRotation(-90)).toBe(270);
  });
  it('rejects angles that are not multiples of 90', () => {
    expect(() => normalizeRotation(45)).toThrow();
  });
});

describe('displaySize', () => {
  it('matches the page box for an unrotated page at scale 1', () => {
    expect(displaySize(LETTER, 0, 1)).toEqual({ width: 612, height: 792 });
  });
  it('swaps width and height for 90 degree rotation', () => {
    expect(displaySize(LETTER, 90, 1)).toEqual({ width: 792, height: 612 });
  });
  it('applies the scale factor', () => {
    expect(displaySize(LETTER, 0, 2)).toEqual({ width: 1224, height: 1584 });
  });
});

describe('displayToPdfPoint', () => {
  const ctx = (rotation, box = LETTER) => ({ box, rotation, scale: 1 });

  it('maps the display top-left of an unrotated page to the PDF top-left', () => {
    expect(displayToPdfPoint(0, 0, ctx(0))).toEqual({ x: 0, y: 792 });
  });
  it('maps the display bottom-right of an unrotated page to the PDF origin corner', () => {
    expect(displayToPdfPoint(612, 792, ctx(0))).toEqual({ x: 612, y: 0 });
  });
  it('honors a crop box offset', () => {
    const box = { x: 10, y: 20, width: 600, height: 780 };
    expect(displayToPdfPoint(0, 780, ctx(0, box))).toEqual({ x: 10, y: 20 });
  });
  it('maps display top-left to PDF origin on a 90 degree page', () => {
    expect(displayToPdfPoint(0, 0, ctx(90))).toEqual({ x: 0, y: 0 });
  });
  it('maps display top-left to PDF bottom-right on a 180 degree page', () => {
    expect(displayToPdfPoint(0, 0, ctx(180))).toEqual({ x: 612, y: 0 });
  });
  it('maps display top-left to PDF top-right on a 270 degree page', () => {
    expect(displayToPdfPoint(0, 0, ctx(270))).toEqual({ x: 612, y: 792 });
  });
  it('round-trips through pdfPointToDisplay for every rotation and scale', () => {
    for (const rotation of [0, 90, 180, 270]) {
      for (const scale of [0.5, 1, 1.75]) {
        const c = { box: { x: 5, y: 7, width: 612, height: 792 }, rotation, scale };
        const pdf = displayToPdfPoint(123, 77, c);
        const back = pdfPointToDisplay(pdf.x, pdf.y, c);
        expect(back.x).toBeCloseTo(123, 6);
        expect(back.y).toBeCloseTo(77, 6);
      }
    }
  });
});

describe('placementToDrawParams', () => {
  it('converts a fractional placement on an unrotated page', () => {
    const p = placementToDrawParams({ x: 0.5, y: 0.5, width: 0.25, height: 0.1 }, LETTER, 0);
    expect(p.x).toBeCloseTo(306);
    expect(p.y).toBeCloseTo(792 - 0.6 * 792);
    expect(p.width).toBeCloseTo(153);
    expect(p.height).toBeCloseTo(79.2);
    expect(p.rotate).toBe(0);
  });
  it('sizes against the rotated display and counter-rotates the image on a 90 degree page', () => {
    const rect = { x: 0.1, y: 0.2, width: 0.25, height: 0.1 };
    const p = placementToDrawParams(rect, LETTER, 90);
    // display is 792 wide x 612 tall
    expect(p.width).toBeCloseTo(0.25 * 792);
    expect(p.height).toBeCloseTo(0.1 * 612);
    expect(p.rotate).toBe(90);
    const anchor = displayToPdfPoint(0.1 * 792, (0.2 + 0.1) * 612, { box: LETTER, rotation: 90, scale: 1 });
    expect(p.x).toBeCloseTo(anchor.x);
    expect(p.y).toBeCloseTo(anchor.y);
  });
});

describe('fitScale', () => {
  it('fits the page width to the container and caps at maxScale', () => {
    expect(fitScale(LETTER, 0, 306, 3)).toBeCloseTo(0.5);
    expect(fitScale(LETTER, 0, 5000, 2)).toBe(2);
  });
});

describe('clampRect', () => {
  it('pushes a rect that overflows back inside the unit page', () => {
    expect(clampRect({ x: 0.9, y: -0.1, width: 0.3, height: 0.2 })).toEqual({
      x: 0.7,
      y: 0,
      width: 0.3,
      height: 0.2,
    });
  });
});

describe('placementToDrawParams with a user rotation', () => {
  const rect = { x: 0.4, y: 0.5, width: 0.2, height: 0.1 };
  const centreOf = ({ x, y, width, height, rotate }) => {
    const a = (rotate * Math.PI) / 180;
    const [hx, hy] = [width / 2, height / 2];
    return { x: x + hx * Math.cos(a) - hy * Math.sin(a), y: y + hx * Math.sin(a) + hy * Math.cos(a) };
  };

  it('is unchanged when there is no tilt', () => {
    expect(placementToDrawParams(rect, LETTER, 0, 0)).toEqual(placementToDrawParams(rect, LETTER, 0));
  });

  it.each([0, 90, 180, 270])('keeps the centre in place on a page rotated %i degrees', (pageRotation) => {
    const upright = placementToDrawParams(rect, LETTER, pageRotation);
    const tilted = placementToDrawParams(rect, LETTER, pageRotation, 30);
    const a = centreOf(upright);
    const b = centreOf(tilted);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
    expect(tilted.rotate).toBe(upright.rotate - 30);
    expect(tilted.width).toBe(upright.width);
  });
});
