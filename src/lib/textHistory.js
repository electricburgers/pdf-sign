// Remembers the free text you've placed (with its look), newest first, so the
// same words can be dropped onto other pages in a tap. Pinned entries stay at
// the top and are never pushed out by newer ones. Never throws: blocked storage
// just means nothing is remembered.
import { DEFAULT_TEXT_SIZE, TEXT_SIZES } from './dateText.js';

export const TEXT_HISTORY_KEY = 'pdfsign:textHistory';
export const TEXT_HISTORY_LIMIT = 12; // recent (unpinned) entries
export const MAX_PINNED = 12;

const sizeOk = (id) => TEXT_SIZES.some((s) => s.id === id);

export function addToHistory(list, text, font, { size = DEFAULT_TEXT_SIZE, bold = false } = {}, limit = TEXT_HISTORY_LIMIT) {
  const t = String(text ?? '').trim();
  if (!t) return list;
  const existing = list.find((e) => e.text === t);
  const entry = { text: t, font, size, bold: !!bold, pinned: !!existing?.pinned };
  if (existing?.pinned) return list.map((e) => (e === existing ? entry : e));
  const pinned = list.filter((e) => e.pinned);
  const recent = [entry, ...list.filter((e) => !e.pinned && e.text !== t)].slice(0, limit);
  return [...pinned, ...recent];
}

export function removeFromHistory(list, text) {
  return list.filter((e) => e.text !== text);
}

// Pins or unpins `text`. Pinned entries sort first; at most MAX_PINNED.
export function togglePin(list, text) {
  const target = list.find((e) => e.text === text);
  if (!target) return list;
  if (!target.pinned && list.filter((e) => e.pinned).length >= MAX_PINNED) return list;
  const flipped = list.map((e) => (e === target ? { ...e, pinned: !e.pinned } : e));
  return [...flipped.filter((e) => e.pinned), ...flipped.filter((e) => !e.pinned)];
}

export function parseHistory(raw, limit = TEXT_HISTORY_LIMIT) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const clean = data
      .filter((e) => e && typeof e.text === 'string' && e.text.trim() && typeof e.font === 'string')
      .map((e) => ({
        text: e.text,
        font: e.font,
        size: sizeOk(e.size) ? e.size : DEFAULT_TEXT_SIZE,
        bold: e.bold === true,
        pinned: e.pinned === true,
      }));
    const pinned = clean.filter((e) => e.pinned).slice(0, MAX_PINNED);
    return [...pinned, ...clean.filter((e) => !e.pinned).slice(0, limit)];
  } catch {
    return [];
  }
}

export function createTextHistoryStore(storage) {
  return {
    load() {
      if (!storage) return [];
      try {
        return parseHistory(storage.getItem(TEXT_HISTORY_KEY));
      } catch {
        return [];
      }
    },
    save(list) {
      if (!storage) return false;
      try {
        storage.setItem(TEXT_HISTORY_KEY, JSON.stringify(list));
        return true;
      } catch {
        return false;
      }
    },
  };
}
