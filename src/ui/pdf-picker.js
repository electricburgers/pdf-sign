// Step 2: choose a PDF (tap or drag-and-drop), validate it and load it.
import { isPdfFile, isPdfBytes, checkFileSize } from '../lib/validate.js';
import { state, placements, history, bus, select } from '../app/state.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

const MAX_PDF_BYTES = 100 * 1024 * 1024;

async function open(file) {
  if (!isPdfFile(file)) return toast('Choose a PDF file.', { error: true });
  const size = checkFileSize(file.size, MAX_PDF_BYTES);
  if (!size.ok) return toast(size.message, { error: true });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfBytes(bytes)) return toast("That file isn't a PDF.", { error: true });

  try {
    // pdf.js is loaded on first use so the page itself starts faster.
    const { loadDocument } = await import('./pdf-engine.js');
    const { doc, aspects } = await loadDocument(bytes);
    if (state.doc) state.doc.destroy();
    Object.assign(state, {
      doc,
      pdfBytes: bytes,
      fileName: file.name || 'document.pdf',
      pageCount: doc.numPages,
      pageIndex: 0,
      pageAspects: aspects,
    });
    placements.replaceAll([]);
    history.clear();
    select(null);
    $('#pdfLabel').textContent = `${state.fileName} (tap to change)`;
    $('#app').dataset.hasPdf = 'true';
    bus.emit('document');
  } catch (err) {
    const message =
      err && err.name === 'PasswordException'
        ? 'This PDF is password-protected. Remove the password, then try again.'
        : "This PDF couldn't be opened. It may be damaged.";
    toast(message, { error: true });
  }
}

export function initPdfPicker() {
  const input = $('#pdfInput');
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (file) open(file);
  });

  const zone = $('#dropzone');
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) open(file);
  });
}
