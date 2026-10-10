// Saves the signature and initials images (as data URLs) in the browser so
// they only need to be uploaded once. Never throws: private browsing, blocked
// storage and quota errors all degrade to "not saved".
import { KINDS } from './placements.js';

export function storageKey(kind) {
  return `pdfsign:${kind}`;
}

function assertKind(kind) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown asset kind: ${kind}`);
}

export function createAssetStore(storage) {
  return {
    save(kind, dataUrl) {
      assertKind(kind);
      if (!storage) return false;
      try {
        storage.setItem(storageKey(kind), dataUrl);
        return true;
      } catch {
        return false;
      }
    },
    load(kind) {
      assertKind(kind);
      if (!storage) return null;
      try {
        return storage.getItem(storageKey(kind));
      } catch {
        return null;
      }
    },
    clear(kind) {
      assertKind(kind);
      if (!storage) return;
      try {
        storage.removeItem(storageKey(kind));
      } catch {
        /* ignore */
      }
    },
  };
}

export function safeLocalStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__pdfsign_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
