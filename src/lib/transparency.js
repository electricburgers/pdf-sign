// Turns a photo of a signature on white paper into ink on a transparent
// background. Works on RGBA buffers (ImageData.data) so it is testable in Node.

export function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Pixels brighter than `threshold` become transparent; pixels darker than
// `threshold - softness` keep their alpha; in between fades linearly.
export function makeWhiteTransparent(data, { threshold = 200, softness = 40 } = {}) {
  const out = new Uint8ClampedArray(data);
  const low = threshold - softness;
  for (let i = 0; i < out.length; i += 4) {
    const lum = luminance(out[i], out[i + 1], out[i + 2]);
    let factor;
    if (lum >= threshold) factor = 0;
    else if (lum <= low) factor = 1;
    else factor = (threshold - lum) / softness;
    out[i + 3] = Math.round(out[i + 3] * factor);
  }
  return out;
}

// Paper is the bright majority of a signature photo. Take the 75th-percentile
// brightness as the paper tone and cut a little below it, so grayish phone
// photos still lose their background. Never goes above 230 or below 60.
export function estimateThreshold(data, { percentile = 0.75, margin = 25 } = {}) {
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    hist[Math.round(luminance(data[i], data[i + 1], data[i + 2]))] += 1;
    count += 1;
  }
  if (count === 0) return 200;
  const target = count * percentile;
  let seen = 0;
  let paper = 255;
  for (let v = 0; v < 256; v += 1) {
    seen += hist[v];
    if (seen >= target) {
      paper = v;
      break;
    }
  }
  return Math.min(230, Math.max(60, paper - margin));
}

// Scans inward from each edge and stops at the first inked row/column, so it
// only touches the margins around the signature instead of every pixel.
// Worst case is still O(w·h), but a typical cropped signature photo is
// mostly margin and this exits early.
export function findInkBounds(data, width, height, minAlpha = 16) {
  const inked = (x, y) => data[(y * width + x) * 4 + 3] >= minAlpha;
  const rowHasInk = (y) => {
    for (let x = 0; x < width; x += 1) if (inked(x, y)) return true;
    return false;
  };

  let top = 0;
  while (top < height && !rowHasInk(top)) top += 1;
  if (top === height) return null;
  let bottom = height - 1;
  while (bottom > top && !rowHasInk(bottom)) bottom -= 1;

  const colHasInk = (x) => {
    for (let y = top; y <= bottom; y += 1) if (inked(x, y)) return true;
    return false;
  };
  let left = 0;
  while (left < width && !colHasInk(left)) left += 1;
  let right = width - 1;
  while (right > left && !colHasInk(right)) right -= 1;

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
