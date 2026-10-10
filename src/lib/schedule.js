// Frame-aligned and time-based rate limiting.

const defaultRaf = {
  raf: (cb) => globalThis.requestAnimationFrame(cb),
  caf: (id) => globalThis.cancelAnimationFrame(id),
};

// Runs fn at most once per animation frame, with the most recent arguments.
// Pointer events can fire several times per frame; only the last one matters.
export function rafThrottle(fn, { raf, caf } = defaultRaf) {
  let frame = null;
  let lastArgs = null;
  const throttled = (...args) => {
    lastArgs = args;
    if (frame !== null) return;
    frame = raf(() => {
      frame = null;
      fn(...lastArgs);
    });
  };
  throttled.cancel = () => {
    if (frame !== null) caf(frame);
    frame = null;
  };
  return throttled;
}

export function debounce(fn, wait) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
