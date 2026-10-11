// Undo/redo for the placement store. Placements are replaced (never mutated)
// on every change, so a snapshot is just a copy of the list: cheap to take and
// safe to restore.
export function createHistory(store, { limit = 50, coalesceMs = 800, now = () => Date.now() } = {}) {
  let undoStack = [];
  let redoStack = [];
  let lastKey = null;
  let lastTime = 0;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  return {
    // Call just before a change. Repeats with the same `key` inside the
    // coalescing window (holding an arrow key, tapping "bigger") count as one step.
    record(key = null) {
      const t = now();
      if (key && key === lastKey && t - lastTime < coalesceMs) {
        lastTime = t;
        return;
      }
      undoStack.push(store.all());
      if (undoStack.length > limit) undoStack.shift();
      redoStack = [];
      lastKey = key;
      lastTime = t;
      emit();
    },
    // Forget the most recent record (a drag that ended where it started).
    drop() {
      if (undoStack.pop()) {
        lastKey = null;
        emit();
      }
    },
    undo() {
      if (!undoStack.length) return false;
      redoStack.push(store.all());
      store.replaceAll(undoStack.pop());
      lastKey = null;
      emit();
      return true;
    },
    redo() {
      if (!redoStack.length) return false;
      undoStack.push(store.all());
      store.replaceAll(redoStack.pop());
      lastKey = null;
      emit();
      return true;
    },
    clear() {
      undoStack = [];
      redoStack = [];
      lastKey = null;
      emit();
    },
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
