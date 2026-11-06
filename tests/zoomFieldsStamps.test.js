import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId } from './helpers/html.js';
import { clampView, clampZoom, zoomAbout, pinchView, panView, viewTransform, MAX_ZOOM, MIN_ZOOM } from '../src/lib/zoom.js';
import { fieldFractions, guessKind, fitInto } from '../src/lib/fields.js';
import { STAMP_SHAPES, stampWidth, stampLabel } from '../src/ui/stamp-render.js';

const page = { width: 600, height: 800 };
const home = { zoom: 1, x: 0, y: 0 };

describe('zoom math', () => {
  it('keeps zoom between fit and the maximum', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(NaN)).toBe(1);
  });
  it('never lets the page slide away from its box', () => {
    expect(clampView({ zoom: 2, x: 50, y: 50 }, page)).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(clampView({ zoom: 2, x: -9999, y: -9999 }, page)).toEqual({ zoom: 2, x: -600, y: -800 });
    expect(clampView({ zoom: 1, x: -40, y: -40 }, page)).toEqual(home);
  });
  it('zooms about a point so that point stays put', () => {
    const anchor = { x: 300, y: 400 };
    const v = zoomAbout(home, 2, anchor, page);
    expect(v.zoom).toBe(2);
    expect((anchor.x - v.x) / v.zoom).toBeCloseTo(300);
    expect((anchor.y - v.y) / v.zoom).toBeCloseTo(400);
  });
  it('pinching apart zooms in, together zooms out, and fingers drag the page', () => {
    const start = { view: home, a: { x: 250, y: 400 }, b: { x: 350, y: 400 } };
    expect(pinchView(start, { a: { x: 200, y: 400 }, b: { x: 400, y: 400 } }, page).zoom).toBe(2);
    const zoomed = { zoom: 2, x: -300, y: -400 };
    expect(pinchView({ ...start, view: zoomed }, { a: { x: 275, y: 400 }, b: { x: 325, y: 400 } }, page).zoom).toBe(1);
    const moved = pinchView(start, { a: { x: 250, y: 400 }, b: { x: 350, y: 400 } }, page);
    expect(moved).toEqual(home); // same finger spread, same place: no change
  });
  it('pans and builds a transform', () => {
    const z = { zoom: 2, x: -100, y: -100 };
    expect(panView(z, 30, -900, page)).toEqual({ zoom: 2, x: -70, y: -800 });
    expect(viewTransform(home)).toBe('');
    expect(viewTransform(z)).toBe('translate(-100px, -100px) scale(2)');
  });
});

describe('page zoom wiring', () => {
  it('has zoom buttons and drag math that divides by the zoom', () => {
    const doc = parseHtml(read('index.html'));
    for (const id of ['zoomIn', 'zoomOut', 'zoomFit']) expect(byId(doc, id)).toBeTruthy();
    expect(read('src/ui/placement-layer.js')).toContain('state.zoom');
    expect(read('src/ui/page-view.js')).toContain('state.zoom');
  });
});

describe('form fields', () => {
  it('turns any corner order into fractions of the page', () => {
    expect(fieldFractions([300, 200, 100, 100], 600, 800)).toEqual({ x: 100 / 600, y: 100 / 800, width: 200 / 600, height: 100 / 800 });
  });
  it('guesses what goes in a field', () => {
    expect(guessKind({ type: 'Sig', name: 'x' })).toBe('signature');
    expect(guessKind({ type: 'Tx', name: 'Initials_1' })).toBe('initials');
    expect(guessKind({ type: 'Tx', name: 'Date signed' })).toBe('date');
    expect(guessKind({ type: 'Tx', name: 'Name' })).toBe('signature');
    expect(guessKind()).toBe('signature');
  });
  it('fits an image inside a field without stretching it', () => {
    const field = { x: 0.1, y: 0.7, width: 0.4, height: 0.05 };
    const pageAspect = 0.75;
    const r = fitInto(field, 3, pageAspect);
    expect((r.width * pageAspect) / r.height).toBeCloseTo(3); // same shape as the image
    expect(r.x).toBeGreaterThanOrEqual(field.x);
    expect(r.y).toBeGreaterThanOrEqual(field.y);
    expect(r.x + r.width).toBeLessThanOrEqual(field.x + field.width + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(field.y + field.height + 1e-9);
    const tall = fitInto({ x: 0, y: 0, width: 0.5, height: 0.5 }, 1, 1);
    expect(tall.width).toBeCloseTo(tall.height);
  });
  it('has a toggle button and a layer on the page', () => {
    const doc = parseHtml(read('index.html'));
    expect(byId(doc, 'toggleFields')).toBeTruthy();
    expect(byId(doc, 'fieldLayer')).toBeTruthy();
    expect(read('src/ui/pdf-engine.js')).toContain('getAnnotations');
  });
});

describe('more stamps', () => {
  it('offers the original and four new shapes with buttons for each', () => {
    expect(STAMP_SHAPES).toEqual(expect.arrayContaining(['check', 'cross', 'dot', 'circle', 'line', 'arrow']));
    const html = read('index.html');
    for (const s of STAMP_SHAPES) expect(html, s).toContain(`data-stamp="${s}"`);
    for (const s of STAMP_SHAPES) expect(stampLabel(s)).toBeTruthy();
  });
  it('makes lines and arrows wider than a tick box', () => {
    expect(stampWidth('check')).toBe(0.04);
    expect(stampWidth('line')).toBeGreaterThan(stampWidth('check'));
    expect(stampWidth('arrow')).toBeGreaterThan(stampWidth('check'));
  });
});
