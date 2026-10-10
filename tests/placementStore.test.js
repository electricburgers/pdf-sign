import { describe, it, expect, vi } from 'vitest';
import { createPlacementStore } from '../src/lib/placementStore.js';

const p = (id, page, extra = {}) => ({ id, kind: 'signature', page, x: 0.1, y: 0.1, width: 0.2, height: 0.1, ...extra });

describe('createPlacementStore', () => {
  it('adds and gets placements by id', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    expect(s.get('a').page).toBe(0);
    expect(s.get('missing')).toBeUndefined();
  });
  it('forPage returns only that page, in insertion order', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    s.add(p('b', 1));
    s.add(p('c', 0));
    expect(s.forPage(0).map((x) => x.id)).toEqual(['a', 'c']);
    expect(s.forPage(5)).toEqual([]);
  });
  it('update patches fields without changing the id', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    s.update('a', { x: 0.5, id: 'hijack' });
    expect(s.get('a').x).toBe(0.5);
    expect(s.get('hijack')).toBeUndefined();
  });
  it('moves a placement between page indexes when its page changes', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    s.update('a', { page: 2 });
    expect(s.forPage(0)).toEqual([]);
    expect(s.forPage(2).map((x) => x.id)).toEqual(['a']);
  });
  it('remove deletes from both the id map and the page index', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    s.remove('a');
    expect(s.get('a')).toBeUndefined();
    expect(s.forPage(0)).toEqual([]);
    expect(s.size).toBe(0);
  });
  it('all() returns everything in insertion order and size tracks the count', () => {
    const s = createPlacementStore();
    s.add(p('a', 1));
    s.add(p('b', 0));
    expect(s.all().map((x) => x.id)).toEqual(['a', 'b']);
    expect(s.size).toBe(2);
    expect(s.pagesUsed()).toBe(2);
  });
  it('notifies subscribers on change and stops after unsubscribe', () => {
    const s = createPlacementStore();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.add(p('a', 0));
    s.update('a', { x: 0.3 });
    off();
    s.remove('a');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0]).toMatchObject({ type: 'add', id: 'a' });
  });
  it('replaceAll swaps the contents and rebuilds the page index', () => {
    const s = createPlacementStore();
    s.add(p('a', 0));
    s.replaceAll([p('x', 3), p('y', 3)]);
    expect(s.get('a')).toBeUndefined();
    expect(s.forPage(0)).toEqual([]);
    expect(s.forPage(3).map((x) => x.id)).toEqual(['x', 'y']);
  });
});
