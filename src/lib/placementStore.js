// Indexed placement store.
//   get / add / update / remove: O(1)
//   forPage(page): O(k) for the k placements on that page (was O(n) filter)
// Map keeps insertion order, so all() and forPage() are stable.

export function createPlacementStore() {
  const byId = new Map();
  const byPage = new Map(); // page -> Set(ids)
  const listeners = new Set();

  const index = (p) => {
    let set = byPage.get(p.page);
    if (!set) byPage.set(p.page, (set = new Set()));
    set.add(p.id);
  };
  const unindex = (p) => {
    const set = byPage.get(p.page);
    if (!set) return;
    set.delete(p.id);
    if (set.size === 0) byPage.delete(p.page);
  };
  const emit = (event) => listeners.forEach((fn) => fn(event));

  return {
    add(p) {
      byId.set(p.id, p);
      index(p);
      emit({ type: 'add', id: p.id });
      return p;
    },
    get: (id) => byId.get(id),
    update(id, patch) {
      const prev = byId.get(id);
      if (!prev) return undefined;
      const next = { ...prev, ...patch, id };
      if (next.page !== prev.page) {
        unindex(prev);
        index(next);
      }
      byId.set(id, next);
      emit({ type: 'update', id });
      return next;
    },
    remove(id) {
      const prev = byId.get(id);
      if (!prev) return false;
      byId.delete(id);
      unindex(prev);
      emit({ type: 'remove', id });
      return true;
    },
    forPage(page) {
      const set = byPage.get(page);
      return set ? [...set].map((id) => byId.get(id)) : [];
    },
    all: () => [...byId.values()],
    get size() {
      return byId.size;
    },
    pagesUsed: () => byPage.size,
    replaceAll(list) {
      byId.clear();
      byPage.clear();
      list.forEach((p) => {
        byId.set(p.id, p);
        index(p);
      });
      emit({ type: 'reset' });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
