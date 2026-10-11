# PDF Sign

**Version 1.9.0 — 2026-10-11 07:04 (UTC-4)** · see [CHANGELOG.md](CHANGELOG.md)

A small self-hosted web app that does one thing: put your **signature** and **initials** images on a PDF.

- Upload your signature and initials once (photo or image); they're saved in that browser only.
- Paper background is removed automatically (adaptive, so grayish phone photos work).
- Place by dragging, by tapping the move and size buttons, or with the keyboard. "Copy to all pages" handles initials.
- Add a typed date (native date picker, five formats, live preview) or free text, each with its own font choice; Open Sans and Noto Serif are bundled.
- Checkmark/X stamps, color and rotation, undo/redo, optional form flattening, and "Sign other PDFs the same way" (several files download as one ZIP).
- A settings dialog (gear in the top bar) holds the theme, version, release notes and disclaimer.
- Works offline once opened: a service worker saves the app (HTTPS or localhost needed on iPhone).
- Handles rotated pages and crop boxes correctly.
- Separate phone, tablet and desktop layouts (a quick bar for Sign, Initials, Date, Text and More: at the bottom on phones, a side bar or horizontal bar on tablets and desktops, with a toggle); light, dark and auto themes.
- Meets WCAG 2.2 AA (automated contrast tests plus axe-core scans at all three sizes in both themes).
- No double-tap zoom on iPhone/iPad; pinch-zoom still works.
- 100% client-side: the PDF and images never leave your device. Served by nginx; no backend.

Built on the same libraries PDFCraft uses (pdf.js for preview, pdf-lib for writing), without PDFCraft's code.

> This adds a visible signature image, not a certificate-based digital signature.
> Built with Claude, an AI model made by Anthropic. Review every signed PDF before you send it.

## Run with Docker (port 8296)

```bash
docker compose up -d --build
```

Open `http://<host>:8296`. The image build runs the full test suite first and fails if any test fails.

On ServerYes (OrbStack):

```bash
mkdir -p ~/containers && tar -xzf pdf-sign.tar.gz -C ~/containers
cd ~/containers/pdf-sign
docker compose up -d --build
# → http://192.168.0.13:8296
```

Health check: `curl http://localhost:8296/healthz`.

## Develop

```bash
npm install
npm test        # 105 tests (vitest)
npm run dev     # http://localhost:8296
npm run build   # static site in dist/
```

## Structure

Pure, tested logic is kept apart from DOM code, and each screen component lives in its own file.

```
src/
  main.js            entry point: wires components together, no logic
  app/
    state.js         shared state, placement store, event bus
    actions.js       add / move / resize / remove / copy, used by drag, keys and buttons alike
  lib/               pure functions, all unit-tested
    geometry.js      screen ↔ PDF coordinates, rotation, crop box
    placements.js    placement model in page fractions
    placementStore.js indexed store: O(1) updates, O(k) per-page reads
    exportPdf.js     embeds images with pdf-lib
    transparency.js  background removal, early-exit ink cropping
    lru.js           page-render cache
    schedule.js      requestAnimationFrame throttle, debounce
    keyboard.js      key → action mapping
    contrast.js      WCAG contrast math + token parser
    layout.js        breakpoints (640 / 1024)
    memo.js, storage.js, validate.js, theme.js
  ui/                one module per component
    assets-panel.js  step 1: signature + initials
    pdf-picker.js    step 2: choose / drop a PDF
    pdf-engine.js    pdf.js loading, cancellable cached rendering
    page-view.js     page preview + paging
    placement-layer.js placements on the page: pointer + keyboard
    toolbar.js       add buttons, move/size buttons, summary
    download.js      export
    theme-toggle.js, announce.js, about.js, image.js, dom.js
  styles/
    tokens.css       colors (AA-tested), type, radii
    base.css         reset, focus, skip link, touch-action, reduced motion
    components.css   panels, buttons, assets, desk, placements, toast
    layout.css       mobile / tablet / desktop grids
tests/               105 vitest tests
```

## Host it on GitHub Pages

The app is a static site, so Pages can serve it. The included workflow
(`.github/workflows/pages.yml`) runs the tests, builds, and publishes on every
push to `main`. The build uses relative URLs, so the same files work in both setups below.

1. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
2. Push to `main` (or run the workflow by hand from the **Actions** tab).

**As a project site.** The app appears at `https://<user>.github.io/<repo>/`. Nothing else to configure.

**On a custom domain.** In **Settings > Pages > Custom domain**, enter your domain (for example `sign.example.com`) and tick **Enforce HTTPS**.
At your DNS provider, add a `CNAME` record from that name to `<user>.github.io` (for a bare domain such as `example.com`, add the four `A` records GitHub lists instead).
The app then lives at the root of your domain.

Pages serves HTTPS, which iPhone needs to install the app and keep it working offline. Pages can't set response headers, so the build adds the Content-Security-Policy as a meta tag instead.
Public repositories get Pages free; private ones need a paid GitHub plan.
