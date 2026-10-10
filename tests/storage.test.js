import { describe, it, expect } from 'vitest';
import { createAssetStore, storageKey } from '../src/lib/storage.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const throwing = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

describe('createAssetStore', () => {
  it('saves and loads an asset', () => {
    const s = createAssetStore(memoryStorage());
    expect(s.save('signature', 'data:image/png;base64,AAA')).toBe(true);
    expect(s.load('signature')).toBe('data:image/png;base64,AAA');
  });
  it('returns null for a missing asset', () => {
    expect(createAssetStore(memoryStorage()).load('initials')).toBeNull();
  });
  it('clears an asset', () => {
    const s = createAssetStore(memoryStorage());
    s.save('initials', 'x');
    s.clear('initials');
    expect(s.load('initials')).toBeNull();
  });
  it('rejects unknown asset kinds', () => {
    expect(() => createAssetStore(memoryStorage()).save('photo', 'x')).toThrow();
  });
  it('returns false instead of throwing when the quota is exceeded', () => {
    expect(createAssetStore(throwing).save('signature', 'x')).toBe(false);
  });
  it('returns null instead of throwing when storage is blocked', () => {
    expect(createAssetStore(throwing).load('signature')).toBeNull();
  });
  it('degrades gracefully when no storage is available', () => {
    const s = createAssetStore(null);
    expect(s.save('signature', 'x')).toBe(false);
    expect(s.load('signature')).toBeNull();
    expect(() => s.clear('signature')).not.toThrow();
  });
  it('namespaces its keys', () => {
    expect(storageKey('signature')).toBe('pdfsign:signature');
  });
});
