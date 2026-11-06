// Remembers the free text you've placed (with its font), newest first, so the
// same words can be dropped onto other pages in a tap. Never throws: blocked
// storage just means nothing is remembered.
export const TEXT_HISTORY_KEY = 'pdfsign:textHistory';
export const TEXT_HISTORY_LIMIT = 12;

export function addToHistory(list, text, font, limit = TEXT_HISTORY_LIMIT) {
  const t = String(text ?? '').trim();
  if (!t) return list;
  return [{ text: t, font }, ...list.filter((e) => e.text !== t)].slice(0, limit);
}

export function removeFromHistory(list, text) {
  return list.filter((e) => e.text !== text);
}

export function parseHistory(raw, limit = TEXT_HISTORY_LIMIT) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((e) => e && typeof e.text === 'string' && e.text.trim() && typeof e.font === 'string')
      .map((e) => ({ text: e.text, font: e.font }))
      .slice(0, limit);
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
