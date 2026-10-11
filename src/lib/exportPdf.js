// Embeds signature / initials images into a PDF with pdf-lib.
// Everything runs in the browser; nothing is uploaded anywhere.
import { PDFDocument, degrees } from 'pdf-lib';
import { placementToDrawParams, displaySize, clampRect } from './geometry.js';

async function embed(doc, asset) {
  const mime = (asset.mime || '').toLowerCase();
  if (mime === 'image/png') return doc.embedPng(asset.bytes);
  if (mime === 'image/jpeg' || mime === 'image/jpg') return doc.embedJpg(asset.bytes);
  throw new Error(`Unsupported image type: ${asset.mime}`);
}

// Options:
//   flatten  bake form fields into the page so they can't be edited afterwards
//   refit    recompute each item's height for this file's page shape (used when
//            the same placements are applied to other PDFs); needs p.imageAspect
//   skipped  array that collects placements on pages this file doesn't have;
//            without it, a missing page is an error
export async function signPdf(pdfBytes, placements, assets, { flatten = false, refit = false, skipped } = {}) {
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
  const embedded = new Map();

  for (const p of placements) {
    if (skipped && Number.isInteger(p.page) && p.page >= pageCount) {
      skipped.push(p);
      continue;
    }
    if (!Number.isInteger(p.page) || p.page < 0 || p.page >= pageCount) {
      throw new Error(`Placement is on page ${p.page + 1}, but the PDF has ${pageCount} page(s).`);
    }
    // Dates carry their own rendered image; signature and initials share one each.
    const asset = p.image || assets[p.kind];
    if (!asset) {
      throw new Error(`No ${p.kind} image has been added yet.`);
    }
    const key = p.image || p.kind;
    if (!embedded.has(key)) embedded.set(key, await embed(doc, asset));

    const page = doc.getPage(p.page);
    const box = page.getCropBox();
    const angle = page.getRotation().angle;
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
