// Export: embed the images and hand the signed PDF to the browser.
import { signedFileName } from '../lib/validate.js';
import { state, placements } from '../app/state.js';
import { buildExportItems, flattenWanted } from './export-items.js';
import { save } from './save.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

export function initDownload() {
  const btn = $('#download');
  btn.addEventListener('click', async () => {
    if (!state.pdfBytes || placements.size === 0) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent;
    btn.textContent = 'Signing…';
    try {
      // pdf-lib is only needed now, so it loads on the first download.
      const { signPdf } = await import('../lib/exportPdf.js');
      const out = await signPdf(state.pdfBytes, await buildExportItems(), {}, { flatten: flattenWanted() });
      const name = signedFileName(state.fileName);
      save(out, name);
      toast(`Downloaded ${name}.`);
    } catch (err) {
      toast(err.message || "The PDF couldn't be signed.", { error: true });
    } finally {
      btn.textContent = label;
      btn.removeAttribute('aria-busy');
      btn.disabled = placements.size === 0;
    }
  });
}
