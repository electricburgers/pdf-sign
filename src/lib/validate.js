const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|heic|heif)$/i;

export function isPdfFile(file) {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return !file.type && /\.pdf$/i.test(file.name || '');
}

export function isImageFile(file) {
  if (!file) return false;
  if (file.type) return IMAGE_TYPES.includes(file.type.toLowerCase());
  return IMAGE_EXT.test(file.name || '');
}

// The PDF spec allows junk before the header; readers search the first 1 KB.
export function isPdfBytes(bytes) {
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i < limit; i += 1) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46) {
      return true;
    }
  }
  return false;
}

export function signedFileName(name) {
  const base = (name || 'document').replace(/\.pdf$/i, '');
  return `${base}-signed.pdf`;
}

export function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!match) throw new Error('Not a data URL');
  const [, mime, isBase64, payload] = match;
  let bytes;
  if (isBase64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  return { mime, bytes };
}

export function checkFileSize(size, max) {
  if (size <= max) return { ok: true };
  const mb = Math.round(max / (1024 * 1024));
  return { ok: false, message: `That file is too large. The limit is ${mb} MB.` };
}
