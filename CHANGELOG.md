# Changelog

All notable changes to PDF Sign are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.9.0] - 2026-10-11

### Added
- GitHub Pages hosting. A workflow (`.github/workflows/pages.yml`) runs the tests, builds and publishes on every push to `main`. The same build works as a project site (`https://<user>.github.io/<repo>/`) and on a custom domain; the README explains the one-time setup for both.
- The Content-Security-Policy is now also added to the page as a meta tag at build time, for hosts like Pages that can't send headers. A test keeps it in step with `nginx.conf`.
- 56 new tests (316 in total): 38 for tablet and desktop layout differences (grid, panel states, sticky editor, tools panel, side bar, sheets, preview sizing), 3 for the service worker in a sub-folder, plus checks for the Pages setup and the settings gear.

### Changed
- The build uses relative URLs. The web app manifest, the service worker's file list and its registration are relative too, so the app works at the site root or in a sub-folder. Docker and nginx hosting are unchanged.
- New settings gear: a clean outlined eight-tooth gear with a round hub, replacing the uneven one.

## [1.8.0] - 2026-10-11

### Added
- The quick bar (Sign, Initials, Date, Text, More), the Setup chip and the Fine-tune row now work on tablets and desktops too, not just phones. The old Add buttons, the inline Date and Free text boxes and the footer clutter are gone from the page.
- Side bar on tablets and desktops: the quick bar stands in a column beside the page by default. A "Side bar" toggle next to Undo switches it back to a horizontal bar under the page, and the choice is remembered. Phones always keep the bottom bar.
- Redesigned Date dialog: a large live preview, a date field with a Today button, format chips that show your date written five ways (long, medium, numbers, year first, day first), and font chips set in their own fonts. It remembers your last format and font. The second text box that repeated the date is gone; Free text covers anything custom.
- 62 new tests (258 in total): bar and sheet layout at phone, tablet and desktop widths, the side bar and its toggle, the date dialog and date formats, and a check that `main.js` only imports things that exist.

### Changed
- On tablets and desktops the sidebar folds to just the bar and the page once a PDF is open, and Date, Text and More open as centered cards instead of bottom sheets.

### Fixed
- On tablets and desktops the Date and Free text options appeared under the darkened page and couldn't be tapped. Their panels sat inside the sticky page area, which hid them behind the dimming layer. All three sheets now sit at the top level of the page. A new test checks this at every screen size.

## [1.7.0] - 2026-10-11

### Added
- Settings: a gear button in the top bar opens a settings dialog. The theme switch (Auto, Light, Dark), the About details, the "What's new" notes and the Claude disclaimer now live there instead of in the page footer. The dialog closes with Done, Escape, or a tap outside it.
- 53 new tests (196 in total): layout and settings structure checks, accessibility checks on the page (unique ids, labels, button names, ids the scripts look up), release checks (the version, changelog and README date must agree), manifest and icon checks, more file-validation and date-text cases, and more service worker cases.

### Fixed
- On the installed iPhone app, tapping an option in the "More" sheet (checkmark, X, Flatten, Sign other PDFs) only dimmed and closed the sheet. The sheet sat inside the pinned bottom panel, which hid it behind the dimmed backdrop, so taps hit the backdrop. The sheet now sits at the top level of the page, above the backdrop.

## [1.6.0] - 2026-10-11

### Changed
- New phone layout (screens under 640 px wide) that puts the page first and the tools at your thumb:
  - A bottom toolbar with Sign, Initials, Date, Text and More. Tapping Sign or Initials before you've uploaded one opens Setup and says what's missing.
  - Date and Free text open as bottom sheets over a dimmed page, and close when you add the item. More holds the checkmark and X stamps, Flatten, and "Sign other PDFs the same way".
  - Signature, initials and PDF choice fold into one "Setup" chip once a PDF is open.
  - A selected item shows one short row (Fine-tune and Delete). Move, size, rotate, color and Copy to all pages open under Fine-tune.
  - The pinned tools take about 190 px instead of up to 450 px, and the page preview is sized to fit the screen height.
  - Sheets work with the keyboard: Escape closes, Tab stays inside, and focus returns to the button that opened it.
- Tablet and desktop layouts are unchanged.

## [1.5.0] - 2026-10-10

### Added
- Checkmark and X stamps for ticking boxes on forms.
- Color and rotation for anything you place: Original, Black, Blue or Red, and tilt in 15-degree steps with a Straighten button. Tilted items are saved to the PDF around their center.
- Flatten option: bakes form fields into the page so they can't be edited after you download.
- Undo and Redo (buttons, Ctrl/Cmd+Z, and Shift+Ctrl/Cmd+Z or Ctrl+Y). Drags and held-down arrow keys count as one step.
- "Sign other PDFs the same way": choose several PDFs and they all get the same placements. Several files download as one ZIP. Items on pages a file doesn't have are skipped, and heights are adjusted for each file's page shape.
- Tests for undo/redo, the ZIP writer, tilted placement, flattening, other-file signing, service worker upgrades and date and text edge cases.

### Changed
- The PDF viewer and the PDF writer now load only when needed. The first load is much smaller (the main script went from about 934 kB to 38 kB).
- Typed dates and text are drawn at a quarter of the memory they used before, and signature images are shrunk to what a PDF needs before they are embedded, so downloads are smaller.
- Free text is trimmed by whole characters, so an emoji at the limit is never cut in half.
- On phones the pinned tools scroll instead of covering the page.

## [1.4.0] - 2026-10-10

### Added
- Offline support: a service worker saves the app on the first visit, so the installed iPhone app opens even when the server is down. Pages load from the server when it is reachable, so updates still arrive.
- Tests for the service worker's offline, online and cache-cleanup behavior.

### Changed
- Each build gets its own cache version, and caches from older versions are removed automatically.

## [1.3.0] - 2026-10-10

### Added
- Date tool: type a date or pick one with your device's native date picker, choose a font and place it on the page like a signature.
- Free text tool with its own font picker, for adding a name, a note or anything else you need to type.
- Open Sans (sans serif) and Noto Serif (serif), both open source (SIL OFL) and bundled with the app so typed text looks the same on every device.
- New app icon (a document being signed with a pen) for the Safari favicon, the iOS home screen and the installable app, plus a web app manifest with maskable icons.
- "Built" date and time in the About section, set each time the app is built.
- "What's new" in the About section, taken from this changelog.

### Changed
- Typed dates and text are drawn to an image with the browser's own font rendering, so what you see on the page is what ends up in the downloaded PDF.
- The release date in the About section now shows the time as well as the day.

## [1.1.0] - 2026-10-10

### Added
- Separate layouts for phone, tablet and desktop. On desktop the tools sit in a sticky sidebar next to a large page preview; on phones the move, size and download controls stay pinned to the bottom of the screen.
- Tap buttons to move and resize the selected signature or initials, so dragging is never required (WCAG 2.5.7).
- Keyboard control for placed images: arrow keys move (Shift for larger steps), plus and minus resize, Delete removes, Escape deselects.
- Skip link, a page heading, screen-reader announcements for adds, removals and errors, and visible focus rings on every control.
- About section with the version, release date and a disclaimer that the app was built with Claude, an AI model made by Anthropic.
- This changelog.
- 30 new tests (105 in total), including automated WCAG AA contrast checks for both themes.

### Changed
- Double-tap no longer zooms the page on iPhone and iPad. Pinch-to-zoom still works.
- Split the app into small modules: pure logic in `src/lib`, shared state and actions in `src/app`, one file per screen component in `src/ui`, and styles in `src/styles` (tokens, base, components, layout).
- New cool-gray color palette with ink-blue accent; every text and control color meets WCAG AA contrast in light and dark mode.
- Upload buttons can now be reached with the keyboard.

### Performance
- Placements are stored in an indexed store: lookups and updates are O(1) and showing a page touches only that page's placements, instead of filtering the whole list.
- Dragging updates at most once per animation frame and only redraws the item being dragged.
- The last 3 rendered pages are cached, so flipping back is instant; evicted pages free their canvas memory immediately.
- Page renders that are no longer needed are cancelled instead of queueing up.
- Page sizes are measured in parallel when a PDF opens.
- Signature and initials images are decoded once instead of on every download.
- Ink cropping scans inward from the edges and stops early instead of reading every pixel.

## [1.0.0] - 2026-10-10

### Added
- Sign PDFs with an uploaded signature image, plus initials.
- Automatic paper-background removal and cropping for photos of signatures.
- Drag to place, corner handle to resize, copy initials to every page.
- Correct placement on rotated pages and pages with crop boxes.
- Signature and initials saved on the device; files never leave the browser.
- Light, dark and automatic themes.
- Docker image (nginx) with `compose.yml` on port 8296.
- 75 tests.
