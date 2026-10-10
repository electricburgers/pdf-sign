// Step 1: upload, preview, save and remove the signature and initials images.
import { isImageFile, checkFileSize } from '../lib/validate.js';
import { state, assetStore, bus, KIND_LABEL } from '../app/state.js';
import { refitKind, removeKind } from '../app/actions.js';
import { processSignatureImage, measureDataUrl } from './image.js';
import { toast } from './announce.js';
import { $, $$ } from './dom.js';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const KINDS = ['signature', 'initials'];

function render(kind) {
  const root = $(`.asset[data-kind="${kind}"]`);
  const asset = state.assets[kind];
  const img = $('img', root);
  $('.empty', root).hidden = !!asset;
  img.hidden = !asset;
  if (asset) img.src = asset.dataUrl;
  $('[data-upload-label]', root).textContent = asset ? 'Replace' : 'Upload';
  $(`[data-remove="${kind}"]`, root).hidden = !asset;
}

async function handleUpload(kind, file) {
  if (!isImageFile(file)) {
    toast('Choose an image file, such as PNG, JPEG or HEIC.', { error: true });
    return;
  }
  const size = checkFileSize(file.size, MAX_IMAGE_BYTES);
  if (!size.ok) {
    toast(size.message, { error: true });
    return;
  }
  try {
    const result = await processSignatureImage(file, { removeBackground: $('#removeBg').checked });
    state.assets[kind] = result;
    const saved = assetStore.save(kind, result.dataUrl);
    render(kind);
    refitKind(kind);
    bus.emit('assets', kind);
    toast(saved ? `${KIND_LABEL[kind]} saved on this device.` : `${KIND_LABEL[kind]} added. It couldn't be saved for next time.`);
  } catch (err) {
    toast(err.message || "That image couldn't be processed.", { error: true });
  }
}

export async function initAssetsPanel() {
  $$('[data-upload]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (file) handleUpload(input.dataset.upload, file);
    });
  });

  $$('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.remove;
      state.assets[kind] = null;
      assetStore.clear(kind);
      removeKind(kind);
      render(kind);
      bus.emit('assets', kind);
      toast(`${KIND_LABEL[kind]} removed from this device.`);
    });
  });

  // Load saved images in parallel.
  await Promise.all(
    KINDS.map(async (kind) => {
      const dataUrl = assetStore.load(kind);
      if (!dataUrl) return;
      try {
        state.assets[kind] = { dataUrl, ...(await measureDataUrl(dataUrl)) };
      } catch {
        assetStore.clear(kind);
      }
    }),
  );
  KINDS.forEach(render);
  bus.emit('assets');
}
