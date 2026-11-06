// Free text: type anything, pick a font (separate from the date's), and place
// it on the page like a signature.
import { DATE_FONTS, DEFAULT_DATE_FONT, MAX_FREE_TEXT_CHARS, fontCss, cleanDateText, defaultDateWidth } from '../lib/dateText.js';
import { state, bus } from '../app/state.js';
import { addTextItem } from '../app/actions.js';
import { renderText, FONT_PX } from './text-render.js';
import { toast } from './announce.js';
import { $ } from './dom.js';
import { safeLocalStorage } from '../lib/storage.js';
import { createTextHistoryStore, addToHistory, removeFromHistory } from '../lib/textHistory.js';

const clean = (text) => cleanDateText(text, MAX_FREE_TEXT_CHARS);

export function initTextTool() {
  const input = $('#freeText');
  const select = $('#textFont');
  const preview = $('#textPreview');
  const button = $('#addText');
  const historyBox = $('#textHistory');
  const historyList = $('#textHistoryList');
  const store = createTextHistoryStore(safeLocalStorage());
  let recent = store.load();
  input.maxLength = MAX_FREE_TEXT_CHARS;
  for (const f of DATE_FONTS) {
    const opt = new Option(f.label, f.id);
    opt.style.fontFamily = f.family;
    select.add(opt);
  }
  select.value = DEFAULT_DATE_FONT;

  const updateButton = () => {
    button.disabled = !state.doc || !clean(input.value);
  };
  const syncPreview = () => {
    preview.textContent = clean(input.value) || 'Preview';
    preview.style.font = fontCss(select.value, 20);
  };

  const renderHistory = () => {
    historyList.replaceChildren();
    historyBox.hidden = recent.length === 0;
    for (const entry of recent) {
      const li = document.createElement('li');
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'history-chip';
      pick.textContent = entry.text;
      pick.style.font = fontCss(entry.font, 16);
      pick.setAttribute('aria-label', `Use "${entry.text}"`);
      pick.addEventListener('click', () => {
        input.value = entry.text;
        if (DATE_FONTS.some((f) => f.id === entry.font)) select.value = entry.font;
        updateButton();
        syncPreview();
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'history-remove';
      del.textContent = '×';
      del.setAttribute('aria-label', `Forget "${entry.text}"`);
      del.addEventListener('click', () => {
        recent = removeFromHistory(recent, entry.text);
        store.save(recent);
        renderHistory();
      });
      li.append(pick, del);
      historyList.append(li);
    }
  };

  input.addEventListener('input', () => {
    updateButton();
    syncPreview();
  });
  select.addEventListener('change', syncPreview);
  button.addEventListener('click', async () => {
    const text = clean(input.value);
    if (!text || !state.doc) return;
    try {
      const image = await renderText(text, select.value);
      addTextItem('text', image, text, select.value, defaultDateWidth(image.width, FONT_PX));
      recent = addToHistory(recent, text, select.value);
      store.save(recent);
      renderHistory();
    } catch {
      toast("Couldn't add that text.", { error: true });
    }
  });

  bus.on('document', updateButton);
  syncPreview();
  updateButton();
  renderHistory();
}
