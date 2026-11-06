// Free text: type anything, pick a font, size and weight (separate from the
// date's), and place it on the page like a signature. Recent and pinned text is
// kept as chips so the same words can go on other pages in a tap.
import { DATE_FONTS, DEFAULT_DATE_FONT, DEFAULT_TEXT_SIZE, MAX_FREE_TEXT_CHARS, fontCss, cleanDateText, defaultDateWidth, sizeScale } from '../lib/dateText.js';
import { state, bus } from '../app/state.js';
import { addTextItem } from '../app/actions.js';
import { renderText, FONT_PX } from './text-render.js';
import { toast } from './announce.js';
import { $, $$ } from './dom.js';
import { safeLocalStorage } from '../lib/storage.js';
import { createTextHistoryStore, addToHistory, removeFromHistory, togglePin } from '../lib/textHistory.js';

const clean = (text) => cleanDateText(text, MAX_FREE_TEXT_CHARS);

export function initTextTool() {
  const input = $('#freeText');
  const select = $('#textFont');
  const preview = $('#textPreview');
  const button = $('#addText');
  const bold = $('#textBold');
  const sizes = $$('input[name="textSize"]');
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

  const size = () => sizes.find((r) => r.checked)?.value || DEFAULT_TEXT_SIZE;
  const setSize = (id) => sizes.forEach((r) => (r.checked = r.value === id));
  const updateButton = () => {
    button.disabled = !state.doc || !clean(input.value);
  };
  const syncPreview = () => {
    preview.textContent = clean(input.value) || 'Preview';
    preview.style.font = fontCss(select.value, Math.round(20 * Math.min(sizeScale(size()), 1.5)), bold.checked);
  };

  const persist = () => {
    store.save(recent);
    renderHistory();
  };
  function renderHistory() {
    historyList.replaceChildren();
    historyBox.hidden = recent.length === 0;
    for (const entry of recent) {
      const li = document.createElement('li');
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'history-chip';
      pick.textContent = entry.text;
      pick.style.font = fontCss(entry.font, 16, entry.bold);
      pick.setAttribute('aria-label', `Use "${entry.text}"`);
      pick.addEventListener('click', () => {
        input.value = entry.text;
        if (DATE_FONTS.some((f) => f.id === entry.font)) select.value = entry.font;
        setSize(entry.size);
        bold.checked = entry.bold;
        updateButton();
        syncPreview();
      });
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'history-pin';
      pin.textContent = entry.pinned ? '★' : '☆';
      pin.setAttribute('aria-pressed', String(entry.pinned));
      pin.setAttribute('aria-label', `${entry.pinned ? 'Unpin' : 'Pin'} "${entry.text}"`);
      pin.addEventListener('click', () => {
        recent = togglePin(recent, entry.text);
        persist();
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'history-remove';
      del.textContent = '×';
      del.setAttribute('aria-label', `Forget "${entry.text}"`);
      del.addEventListener('click', () => {
        recent = removeFromHistory(recent, entry.text);
        persist();
      });
      li.append(pick, pin, del);
      historyList.append(li);
    }
  }

  input.addEventListener('input', () => {
    updateButton();
    syncPreview();
  });
  select.addEventListener('change', syncPreview);
  bold.addEventListener('change', syncPreview);
  sizes.forEach((r) => r.addEventListener('change', syncPreview));
  button.addEventListener('click', async () => {
    const text = clean(input.value);
    if (!text || !state.doc) return;
    try {
      const image = await renderText(text, select.value, bold.checked);
      const width = Math.min(defaultDateWidth(image.width, FONT_PX) * sizeScale(size()), 1);
      addTextItem('text', image, text, select.value, width);
      recent = addToHistory(recent, text, select.value, { size: size(), bold: bold.checked });
      persist();
    } catch {
      toast("Couldn't add that text.", { error: true });
    }
  });

  bus.on('document', updateButton);
  syncPreview();
  updateButton();
  renderHistory();
}
