// Breakpoints shared by CSS (see styles/layout.css) and JS.
export const BREAKPOINTS = { tablet: 640, desktop: 1024 };

export function layoutFor(width) {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}
