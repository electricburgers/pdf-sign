// Sign other PDFs with the same placements. Several files come back as one ZIP.
import { isPdfFile, isPdfBytes, checkFileSize, signedFileName } from '../lib/validate.js';
import { createZip, uniqueNames } from '../lib/zip.js';
import { state, placements, bus } from '../app/state.js';
import { buildExportItems, flattenWanted } from './export-items.js';
import { save } from './save.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

const MAX_PDF_BYTES = 100 * 1024 * 1024;

async function readPdf(file) {
  if (!isPdfFile(file)) throw new Error('not a PDF');
  const size = checkFileSize(file.size, MAX_PDF_BYTES);
  if (!size.ok) throw new Error('too large');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfBytes(bytes)) throw new Error('not a PDF');
  return bytes;
}

async function run(files, button) {
  const label = button.textContent;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const results = [];
  const failed = [];
  let skippedCount = 0;
  try {
    const { signPdf } = await import('../lib/exportPdf.js');
    const items = await buildExportItems();
    const flatten = flattenWanted();
    for (const [i, file] of files.entries()) {
      button.textContent = `Signing ${i + 1} of ${files.length}…`;
      try {
        const skipped = [];
        const bytes = await signPdf(await readPdf(file), items, {}, { flatten, refit: true, skipped });
        skippedCount += skipped.length;
        results.push({ name: signedFileName(file.name), bytes });
      } catch (err) {
        failed.push(`${file.name} (${err.message})`);
      }
    }
    if (results.length === 1) {
      save(results[0].bytes, results[0].name);
    } else if (results.length > 1) {
      const names = uniqueNames(results.map((r) => r.name));
      save(createZip(results.map((r, i) => ({ name: names[i], bytes: r.bytes }))), 'signed-pdfs.zip', 'application/zip');
    }
    const parts = [];
    if (results.length) parts.push(`Signed ${results.length} of ${files.length} PDFs.`);
    if (skippedCount) parts.push(`${skippedCount} item${skippedCount === 1 ? '' : 's'} skipped on pages that file doesn't have.`);
    if (failed.length) parts.push(`Couldn't sign: ${failed.join(', ')}.`);
    toast(parts.join(' '), { error: results.length === 0 });
  } catch (err) {
    toast(err.message || "The PDFs couldn't be signed.", { error: true });
  } finally {
    button.textContent = label;
    button.removeAttribute('aria-busy');
    button.disabled = placements.size === 0;
  }
}

export function initBatch() {
  const button = $('#batch');
  const input = $('#batchInput');
  const update = () => {
    button.disabled = !state.doc || placements.size === 0;
  };
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const files = [...(input.files || [])];
    input.value = '';
    if (files.length) run(files, button);
  });
  placements.subscribe((e) => e.type !== 'update' && update());
  bus.on('document', update);
  update();
}
