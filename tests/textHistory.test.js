import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId } from './helpers/html.js';
import { addToHistory, removeFromHistory, parseHistory, createTextHistoryStore, TEXT_HISTORY_KEY, TEXT_HISTORY_LIMIT } from '../src/lib/textHistory.js';
import { aspectOpts, imageAspect } from '../src/app/state.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

describe('text history', () => {
  it('puts the newest first and drops repeats', () => {
    let l = addToHistory([], 'Jane Doe', 'a');
    l = addToHistory(l, 'Approved', 'b');
    l = addToHistory(l, 'Jane Doe', 'c');
    expect(l).toEqual([{ text: 'Jane Doe', font: 'c' }, { text: 'Approved', font: 'b' }]);
  });
  it('ignores blank text and caps the list', () => {
    expect(addToHistory([], '   ', 'a')).toEqual([]);
    let l = [];
    for (let i = 0; i < TEXT_HISTORY_LIMIT + 5; i += 1) l = addToHistory(l, `t${i}`, 'a');
    expect(l).toHaveLength(TEXT_HISTORY_LIMIT);
    expect(l[0].text).toBe(`t${TEXT_HISTORY_LIMIT + 4}`);
  });
  it('removes an entry', () => {
    expect(removeFromHistory([{ text: 'a', font: 'x' }, { text: 'b', font: 'x' }], 'a')).toEqual([{ text: 'b', font: 'x' }]);
  });
  it('survives bad stored data and missing storage', () => {
    expect(parseHistory('nope')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    expect(parseHistory(JSON.stringify([{ text: 'ok', font: 'f' }, { text: 5 }, null]))).toEqual([{ text: 'ok', font: 'f' }]);
    const none = createTextHistoryStore(null);
    expect(none.load()).toEqual([]);
    expect(none.save([])).toBe(false);
    const broken = createTextHistoryStore({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
    expect(broken.load()).toEqual([]);
    expect(broken.save([])).toBe(false);
  });
  it('round-trips through storage', () => {
    const s = memory();
    const store = createTextHistoryStore(s);
    store.save([{ text: 'Hi', font: 'f' }]);
    expect(s.getItem(TEXT_HISTORY_KEY)).toContain('Hi');
    expect(store.load()).toEqual([{ text: 'Hi', font: 'f' }]);
  });
  it('has a picker in the free text sheet', () => {
    const page = parseHtml(read('index.html'));
    expect(byId(page, 'textHistoryList')).toBeTruthy();
  });
});

describe('rendered text keeps its proportions', () => {
  it('uses the image given, not the 3:1 fallback', () => {
    expect(imageAspect({ image: { width: 400, height: 100 } })).toBe(4);
    expect(imageAspect({ image: { width: 200, height: 100 } })).toBe(2);
    expect(aspectOpts({ image: { width: 200, height: 100 } }).imageAspect).toBe(2);
  });
  it('addTextItem passes the image wrapped as a placement', () => {
    expect(read('src/app/actions.js')).toMatch(/aspectOpts\(\{ image \}\)/);
  });
});

describe('drag grip', () => {
  it('is part of every placement and shown when selected', () => {
    expect(read('src/ui/placement-layer.js')).toContain('class="grip"');
    expect(read('src/styles/components.css')).toMatch(/\.placement\[aria-pressed='true'\] \.grip/);
  });
});
