import { describe, it, expect } from 'vitest';
import { createPlacementStore } from '../src/lib/placementStore.js';
import { createHistory } from '../src/lib/history.js';
import { createPlacement } from '../src/lib/placements.js';

const make = (x = 0.1) => createPlacement({ kind: 'signature', page: 0, x, y: 0.1, width: 0.2, height: 0.1 });

function setup(opts) {
  const store = createPlacementStore();
  let t = 0;
  const history = createHistory(store, { now: () => t, ...opts });
  return { store, history, tick: (ms) => (t += ms) };
}

describe('history', () => {
  it('undoes and redoes an add', () => {
    const { store, history } = setup();
    history.record();
    store.add(make());
    expect(store.size).toBe(1);
    expect(history.undo()).toBe(true);
    expect(store.size).toBe(0);
    expect(history.canRedo).toBe(true);
    expect(history.redo()).toBe(true);
    expect(store.size).toBe(1);
  });

  it('does nothing when there is nothing to undo or redo', () => {
    const { history } = setup();
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
  });

  it('a new change clears the redo stack', () => {
    const { store, history } = setup();
    history.record();
    store.add(make());
    history.undo();
    history.record();
    store.add(make(0.5));
    expect(history.canRedo).toBe(false);
  });

  it('merges quick repeats with the same key into one step', () => {
    const { store, history, tick } = setup();
    const p = store.add(make());
    for (let i = 1; i <= 5; i += 1) {
      history.record('move:a');
      store.update(p.id, { x: 0.1 + i * 0.01 });
      tick(100);
    }
    history.undo();
    expect(store.get(p.id).x).toBe(0.1);
    expect(history.canUndo).toBe(false);
  });

  it('starts a new step once the merge window has passed or the key changes', () => {
    const { store, history, tick } = setup({ coalesceMs: 500 });
    const p = store.add(make());
    history.record('move:a');
    store.update(p.id, { x: 0.2 });
    tick(600);
    history.record('move:a');
    store.update(p.id, { x: 0.3 });
    history.record('size:a');
    store.update(p.id, { width: 0.4 });
    history.undo();
    expect(store.get(p.id).width).toBe(0.2);
    history.undo();
    expect(store.get(p.id).x).toBe(0.2);
    history.undo();
    expect(store.get(p.id).x).toBe(0.1);
  });

  it('drop() forgets a step that changed nothing', () => {
    const { history } = setup();
    history.record();
    history.drop();
    expect(history.canUndo).toBe(false);
  });

  it('keeps at most `limit` steps', () => {
    const { store, history } = setup({ limit: 3 });
    for (let i = 0; i < 10; i += 1) {
      history.record();
      store.add(make(i / 20));
    }
    let steps = 0;
    while (history.undo()) steps += 1;
    expect(steps).toBe(3);
  });

  it('clear() empties both stacks and notifies listeners', () => {
    const { store, history } = setup();
    let calls = 0;
    history.subscribe(() => (calls += 1));
    history.record();
    store.add(make());
    history.undo();
    history.clear();
    expect(history.canUndo || history.canRedo).toBe(false);
    expect(calls).toBeGreaterThan(2);
  });
});
