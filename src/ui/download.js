// Export: embed the images and hand the signed PDF to the browser.
import { signPdf } from '../lib/exportPdf.js';
import { parseDataUrl, signedFileName } from '../lib/validate.js';
import { memoizeLast } from '../lib/memo.js';
import { state, placements } from '../app/state.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

// Decode each image's data URL once, not on every download.
const decoders = { signature: memoizeLast(parseDataUrl), initials: memoizeLast(parseDataUrl) };

// Each date image is decoded once per download; identical dates share one embed.
const dateImages = new Map();
function decodeImage(image) {
  if (!dateImages.has(image.dataUrl)) dateImages.set(image.dataUrl, parseDataUrl(image.dataUrl));
  return dateImages.get(image.dataUrl);
}

function save(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function initDownload() {
  const btn = $('#download');
  btn.addEventListener('click', async () => {
    if (!state.pdfBytes || placements.size === 0) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent;
    btn.textContent = 'Signing…';
    try {
      const assets = {};
      for (const kind of Object.keys(decoders)) {
        if (state.assets[kind]) assets[kind] = decoders[kind](state.assets[kind].dataUrl);
      }
      const list = placements.all().map((p) => (p.image ? { ...p, image: decodeImage(p.image) } : p));
      const out = await signPdf(state.pdfBytes, list, assets);
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
