// The Content-Security-Policy the app is served with. nginx sends it as a
// header (see nginx.conf); static hosts that can't set headers, such as GitHub
// Pages, get the same rules in a <meta> tag added at build time. A meta tag
// can't set frame-ancestors, so that one directive is header-only.
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
];

export const cspForMeta = () => CSP_DIRECTIVES.filter((d) => !d.startsWith('frame-ancestors')).join('; ');
