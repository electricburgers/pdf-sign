// Least-recently-used cache on top of Map's insertion order. O(1) get/set.
// Used to keep a few rendered pages so flipping back and forth is instant,
// while onEvict frees canvas memory (important on iOS Safari).

export function createLru(capacity, onEvict = () => {}) {
  const map = new Map();

  const evict = (key) => {
    const value = map.get(key);
    map.delete(key);
    onEvict(value, key);
  };

  return {
    get(key) {
      if (!map.has(key)) return undefined;
      const value = map.get(key);
      map.delete(key);
      map.set(key, value); // mark as most recently used
      return value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      while (map.size > capacity) evict(map.keys().next().value);
    },
    has: (key) => map.has(key),
    delete(key) {
      if (map.has(key)) evict(key);
    },
    clear() {
      [...map.keys()].forEach(evict);
    },
    get size() {
      return map.size;
    },
  };
}
