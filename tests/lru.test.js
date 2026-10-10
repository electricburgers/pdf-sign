import { describe, it, expect, vi } from 'vitest';
import { createLru } from '../src/lib/lru.js';

describe('createLru', () => {
  it('stores and returns values', () => {
    const c = createLru(2);
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
    expect(c.has('b')).toBe(false);
  });
  it('evicts the least recently used entry when over capacity', () => {
    const c = createLru(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.has('a')).toBe(false);
    expect(c.size).toBe(2);
  });
  it('treats get as a use, protecting that entry from eviction', () => {
    const c = createLru(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a');
    c.set('c', 3);
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
  });
  it('calls onEvict for evicted entries and for everything on clear', () => {
    const onEvict = vi.fn();
    const c = createLru(1, onEvict);
    c.set('a', 1);
    c.set('b', 2);
    expect(onEvict).toHaveBeenCalledWith(1, 'a');
    c.clear();
    expect(onEvict).toHaveBeenCalledWith(2, 'b');
    expect(c.size).toBe(0);
  });
});
