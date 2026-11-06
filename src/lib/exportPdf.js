// Embeds signature / initials images into a PDF with pdf-lib.
// Everything runs in the browser; nothing is uploaded anywhere.
import { PDFDocument, PDFName, degrees } from 'pdf-lib';
import { placementToDrawParams, displaySize, clampRect } from './geometry.js';

async function embed(doc, asset) {
  const mime = (asset.mime || '').toLowerCase();
  if (mime === 'image/png') return doc.embedPng(asset.bytes);
  if (mime === 'image/jpeg' || mime === 'image/jpg') return doc.embedJpg(asset.bytes);
  throw new Error(`Unsupported image type: ${asset.mime}`);
}

// Real redaction. Drawing a black box leaves the words underneath in the file,
// so redacted pages are rebuilt instead: the page (with form fields baked in) is
// drawn to a picture with the black boxes burned in, and a brand-new document
// is made from that picture plus the untouched pages. Only what is reachable
// from those pages is copied, so the original text, images, form values,
// annotations, bookmarks, tags, attachments and metadata are not in the result.
async function redactPages(doc, redactions, rasterize) {
  if (typeof rasterize !== 'function') throw new Error('Redaction needs the page renderer, which is not available.');
  try {
    doc.getForm().flatten(); // bake form values in so a box can cover them, then drop the fields
  } catch {
    throw new Error("Couldn't prepare this PDF's form fields, so it can't be redacted safely.");
  }
  const count = doc.getPageCount();
  const shapes = [];
  for (let i = 0; i < count; i += 1) {
    const page = doc.getPage(i);
    page.node.delete(PDFName.of('Annots')); // links and comments can point at, or quote, redacted content
    shapes.push({ box: page.getCropBox(), angle: page.getRotation().angle });
  }
  const byPage = new Map();
  for (const r of redactions) {
    if (!byPage.has(r.page)) byPage.set(r.page, []);
    byPage.get(r.page).push({ x: r.x, y: r.y, width: r.width, height: r.height });
  }
  const jobs = [...byPage].map(([page, rects]) => ({ page, rects }));
  const pictures = await rasterize(await doc.save(), jobs);

  const out = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) {
    if (!byPage.has(i)) {
      const [copy] = await out.copyPages(doc, [i]);
      out.addPage(copy);
      continue;
    }
    const bytes = pictures.get(i);
    if (!bytes) throw new Error(`Page ${i + 1} couldn't be redacted.`);
    const { width, height } = displaySize(shapes[i].box, shapes[i].angle, 1);
    const page = out.addPage([width, height]);
    page.drawImage(await out.embedPng(bytes), { x: 0, y: 0, width, height });
  }
  return out;
}

// Options:
//   flatten  bake form fields into the page so they can't be edited afterwards
//   refit    recompute each item's height for this file's page shape (used when
//            the same placements are applied to other PDFs); needs p.imageAspect
//   skipped  array that collects placements on pages this file doesn't have;
//            without it, a missing page is an error
//   rasterize  async (pdfBytes, [{ page, rects }]) -> Map(page -> PNG bytes) with
//            the rects blacked out; needed when there are 'redact' placements
export async function signPdf(pdfBytes, placements, assets, { flatten = false, refit = false, skipped, rasterize } = {}) {
  let doc;
  try {
    doc = await PDFDocument.load(pdfBytes);
  } catch (err) {
    if (/encrypt/i.test(String(err && err.message))) {
      throw new Error('This PDF is password-protected. Remove the password first, then sign it.');
    }
    throw new Error('Could not read this PDF. It may be damaged.');
  }

  const pageCount = doc.getPageCount();
  const usable = [];
  for (const p of placements) {
    if (skipped && Number.isInteger(p.page) && p.page >= pageCount) {
      skipped.push(p);
      continue;
    }
    if (!Number.isInteger(p.page) || p.page < 0 || p.page >= pageCount) {
      throw new Error(`Placement is on page ${p.page + 1}, but the PDF has ${pageCount} page(s).`);
    }
    usable.push(p);
  }

  // Redact first: the pages are rebuilt, and everything else is drawn onto the result.
  const redactions = usable.filter((p) => p.kind === 'redact');
  if (redactions.length) doc = await redactPages(doc, redactions, rasterize);

  const embedded = new Map();
  const geometry = new Map(); // page index -> { page, box, angle }: read once per page, not once per item
  for (const p of usable) {
    if (p.kind === 'redact') continue;
    // Dates carry their own rendered image; signature and initials share one each.
    const asset = p.image || assets[p.kind];
    if (!asset) {
      throw new Error(`No ${p.kind} image has been added yet.`);
    }
    const key = p.image || p.kind;
    if (!embedded.has(key)) embedded.set(key, await embed(doc, asset));

    let g = geometry.get(p.page);
    if (!g) {
      const pg = doc.getPage(p.page);
      geometry.set(p.page, (g = { page: pg, box: pg.getCropBox(), angle: pg.getRotation().angle }));
    }
    const { page, box, angle } = g;
    let rect = p;
    if (refit && p.imageAspect) {
      const size = displaySize(box, angle, 1);
      const pageAspect = size.width / size.height;
      let { width } = p;
      let height = (width * pageAspect) / p.imageAspect;
      if (height > 1) {
        height = 1;
        width = (height * p.imageAspect) / pageAspect;
      }
      rect = clampRect({ x: p.x, y: p.y, width, height });
    }
    const params = placementToDrawParams(rect, box, angle, p.rotation || 0);
    page.drawImage(embedded.get(key), {
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotate: degrees(params.rotate),
    });
  }

  if (flatten) {
    try {
      doc.getForm().flatten();
    } catch {
      throw new Error("Couldn't flatten this PDF's form fields. Turn off flattening and try again.");
    }
  }

  return doc.save();
}
