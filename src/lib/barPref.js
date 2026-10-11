// Where the quick bar stands on tablets and desktops: on the side of the page
// ('vertical', the default) or above the tools ('horizontal').
export const BAR_KEY = 'pdfsign:bar';

export function normalizeBarPref(value) {
  return value === 'horizontal' ? 'horizontal' : 'vertical';
}

export function nextBarPref(value) {
  return normalizeBarPref(value) === 'vertical' ? 'horizontal' : 'vertical';
}
