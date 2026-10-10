// Caches the result for the most recent argument. Used to decode an asset's
// data URL into bytes once instead of on every export.
export function memoizeLast(fn) {
  let hasValue = false;
  let lastArg;
  let lastResult;
  return (arg) => {
    if (hasValue && arg === lastArg) return lastResult;
    lastArg = arg;
    lastResult = fn(arg);
    hasValue = true;
    return lastResult;
  };
}
