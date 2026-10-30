# Qrer 2.7 verification

## Version 2.7 ha.mr, Art and animated GIFs — 25 October 2026

- `npm test` (lint, format, 11 unit tests, release sync, 8 Chromium suites) passes. One earlier full run timed out in the retro suite; it passed alone and on the next full run.
- Unit: GIF export options and names, ha.mr round trip within the QR alphanumeric set and rejection of credentials, binary dithering, deterministic stipple seed, GIF palette.
- `pictures` suite: a ha.mr code drops the QR version, decodes with jsQR to `HTTPS://HA.MR/…`, and decompresses to the original link with no request to ha.mr. All four Art drawings decode from saved PNGs. A three-frame GIF made in the test gives three-frame Art and Photo GIFs; jsQR decodes every frame, and the first-frame PNG. In the app, Check this code decodes every frame of the saved GIF, after its palette is applied. GIF export is capped at 1024 px. SVG hides for animated codes and returns for still ones. No horizontal overflow at 320 and 390 px. No external requests or page errors.
- Not done: scanning an animated code with a phone camera.

## Version 2.6 Win98 and visible glass — 18 October 2026

- `npm test` (lint, format, unit, release sync, 7 Chromium suites) passes.
- The glass suite checks that the wallpaper shows through the taskbar (pixel spread), that white title text keeps at least 4.5:1 over the lightest point behind it, and that refraction changes 781 taskbar pixels against a diagonal-stripe backdrop.
- Title-bar drag, double-click maximize, the Start menu, and phone layouts at 320/390/768 px are covered. The glass switch is hit-tested above the phone taskbar.
- WebKit (`npm run test:webkit`, Playwright 1.62 with WebKit 26.5): taskbar refraction, title contrast, glass on/off, dialogs, PNG export and the 320 px layout pass. The final offline reload fails with "WebKit encountered an internal error"; the unchanged 2.5 tree fails at the same step.

The notes below describe the 2.5 checks; the five themes they mention were removed in 2.6.

Completed on 17 October 2026 using Chromium on macOS.

## Browser integration — passed

- Main editor fits 1280 × 800 without page scrolling; all five themes were inspected with glass on and off.
- No horizontal overflow at 320, 390, 768, and 1280 px. Every editor tab was checked with glass both enabled and disabled. The Glass switch remains visible on phones.
- Actual WebGL2 renderer initializes and draws the Liquid Glass Studio multipass shaders. The frame counter stops while idle; reduced motion prevents pointer-driven glare.
- Context loss falls back to opaque controls; restoration initializes the renderer again. Simulated missing WebGL2, missing floating-point color buffers, and shader initialization failure preserve the functional editor.
- Switching glass off disposes the renderer and shrinks the canvas to 1 × 1. The rendering adapter also cancels scheduled frames when the document becomes hidden (code inspection).
- Link normalization, blank/invalid links, excessive-content handling, Unicode text, escaped Wi-Fi credentials, open networks, email subject/body encoding, and disabled exports for invalid content.
- All PNG/SVG controls, embedded frame captions, clipboard image write/read, local logo upload, shape/backing controls, image removal, and share-card save.
- Keyboard editor tabs, native modal focus containment, Escape dismissal, and return focus. About dialog displays the correct copyright and license links.
- Classic/glass defaults and preference restoration; only three interface preference keys are stored. Content and logo state reset after reload.
- Offline reload retains the editor, glass renderer, and PNG export. Tested at the domain root during the initial suite and under `/qrer/` in the release suite.
- No third-party network requests, HTTP error responses, or uncaught page errors in the integration suite.

## Export verification — passed

An independent jsQR decoder read 17 saved PNGs with exact expected content: all five appearance-matched presets, a normalized link, Unicode text, escaped Wi-Fi credentials, email, a logo, all three frame styles, a share card, and an offline export. Decoder checks use the source resolution and typical camera sampling sizes.

All image dimensions matched the selected longest edge: 512, 1024, or 2048 px. The share card is exactly 1080 × 1440. SVG checks verify frame text, embedded font CSS, and requested dimensions. Classic uses square finder patterns; custom shapes remain available.

## Source and license audit — passed

- New root MIT license: Copyright (c) 2026 Lucas Van De Weerd.
- Inherited Ente application HTML, CSS, JavaScript, and service worker were replaced. No meaningful long application lines matched the original application during the comparison audit. Earlier application files exist only in scratch work and historical Git commits, outside the release archive.
- Separately MIT-licensed QR dependency remains byte-identical to the original dependency distribution.
- Liquid Glass Studio renderer/shader source and MIT notice pinned to `f7b28c36305a862f5cffed3ddd51511cf1204f56`. No upstream media or React interface is included.
- Figtree font and SIL OFL notice preserved. Root notices document the limits of applying the new license to historical versions.
- JavaScript, launcher, JSON, and Git whitespace checks passed.

## Limits

Physical phones and printed output, native Safari/Firefox releases, native OS share sheets, and installation through each browser's PWA interface were not tested. WebKit automation checks are recorded below; the installed Firefox automation browser could not launch its test profile. The app uses the verified WebGL2 integration, not the upstream WebGPU backend. Custom colors, shapes, or large logos can still reduce scanning reliability; a real scan at the intended size is recommended.

## Version 2.1 additions — passed

- Nayuki Clean mode and structural-module protection for the original Photo compositor. Existing 17-image export decoding suite passed again after the encoder integration.
- Nimiq local scan-check action, image import, blank-image handling, Unicode/literal text safety, explicit editor import, and no automatic URL opening.
- Photo PNG exports at 512, 1024, and 2048 px independently decoded with exact content and dimensions. Photo SVG embeds its raster image without external references. Strength extremes and missing-photo/over-300-byte guards were exercised.
- New controls, scanner dialog, and photo interface checked at 320, 390, 768, and 1280 px without horizontal overflow.
- File menu and display properties apply the selected appearance and glass preference. Original 404 page returns HTTP 404 with a correct subfolder home link, and missing pages work offline.
- Scanner WebWorker fallback tested by removing native BarcodeDetector support. Image scanning works after offline reload.
- A generated Y4M QR video drives Chromium’s fake camera: live QR decoding succeeds and releases camera tracks. Closing during pending camera acquisition also releases tracks. Permission denial leaves image scanning and camera retry available. These tests do not use real camera hardware.
- Version 2.0 browser regression suite passed, including all themes/glass modes, content forms, logos/frames/cards, clipboard, focus, graphics failures, context restoration, and offline exports.
- Vendor source revisions and notices recorded in `INTEGRATIONS.md` and `THIRD-PARTY-NOTICES.md`; GPL/share-alike/unlicensed reference source was not bundled. Nimiq’s Apache-2.0 jsQR worker dependency retains its license.

## Version 2.2 glass components — passed

- kwlck/liquid-glass-web MIT runtime and license verified byte-for-byte against pinned revision `a77866771c280eb3edfc108111a01541db6634dc`. No demo photographs or other upstream assets included.
- Eight independent native-HTML glass surfaces initialize in the main editor: titlebar, Read QR, selected tab, export toolbar, Copy, Share, Download PNG, and SVG. Each generates an SVG displacement map. Menus and dialogs attach and remove their own surfaces as they open and close.
- A controlled striped backdrop under the actual Download PNG button produces 426 changed pixels when refraction is switched from the configured value to zero, with sheen hidden. This verifies actual pixel displacement rather than an effect label or blur-only appearance.
- Native button keyboard focus remains intact; decorative layers are hidden from accessibility and ignore pointer input. QR preview and export content have no glass layers.
- Glass-off removes all component instances, SVG filters, event handlers, and observers. Component maps remain unchanged while idle; reduced motion prevents pointer highlights. Code inspection confirms component destruction while the document is hidden and opaque controls under reduced transparency.
- Component tests pass at the domain root and under `/qrer/`, including offline reload, 320 px width, resizing, tab/menu/dialog changes, and the library’s CSS fallback path.
- All five appearances with glass on/off passed the full browser suite again, including 320/390/768/1280 layouts, graphics failures, context loss, clipboard, keyboard/modal focus, preferences, and offline exports. Desktop and mobile screenshots were inspected.
- All 17 QR export fixtures independently decoded with exact content and dimensions. Photo export, scanner/image import, fake-camera success and cleanup, permission denial, menus, and offline 404 regression tests also passed.
- WebKit automation: actual component refraction over aligned original-backdrop copies passes a zero-displacement comparison (142 changed button pixels), with the gentpan MIT engine handling SVG units and filter caching. All appearances, 320 px layout, native focus, dialogs, PNG export, idle behavior, cleanup and offline reload are checked under `/qrer/`. Chromium refracts live DOM; the portable path refracts Qrer’s locally painted background only. Firefox automation could not launch because its installed browser could not open its temporary profile; the filter-unavailable CSS fallback branch was exercised in Chromium with a non-Blink user agent.
- New modules pass syntax checks; Git whitespace checks pass. Runtime assets are cached in the new `qrer-static-v2.2.0` offline cache.

- Portable engine source and MIT notice verified against revision `068ad226f53e1ca62d857f78bdc32f58f3c5fce7`. No upstream media, site components, or skill is distributed.
- Mobile icon-button rules target only the text label, preserving the renderer’s decorative layers and actual refraction at 320 px.

## Version 2.3 retro restoration

- Full browser regression passed after the retro restoration: all five appearances with glass on/off, desktop fit, 320/390/768 mobile panels, graphics failure/context recovery, content modes, clipboard, modal/tab keyboard use, preference privacy, and offline QR export.
- All 17 exported fixtures independently decoded with exact expected content and dimensions after the retro restoration. Photo exports, scanner/image import, synthetic camera decoding/cleanup, display properties, and HTTP/offline 404 checks also passed.
- Retro-specific checks passed for square chrome with glass on/off, transparent desktop shortcuts, Start/View/Help commands, taskbar clock, minimize/close/restore/maximize, draft preservation, draggable and keyboard-movable export toolbox, PNG download while detached, docking, switching appearances, 320/390/768 layouts, and offline Start-menu use. Later checks also verified popup bounds at each width.
- Desktop, Start menu, floating toolbox, and phone screenshots were inspected. The Win98 layout fits 1280 × 800. Its glass treatment retains square corners, hard bevels, grey faces and blue titlebars.
- Actual WebKit component refraction, all appearance switches including the restored Win98 design, idle cleanup, 320 px layout, PNG export, dialogs and offline reload passed under `/qrer/`.
- The previously pending dialog-focus refinement and Kevin Ramirez rim-highlight adaptation passed the full retro, Chromium glass and WebKit suites during the 2.4 verification.
- Root/package MIT metadata, source revision references, original pixel SVG, local resource paths, cache entries, JavaScript syntax and Git whitespace checks passed. Win98 Web’s MIT notice and WIN98-template’s Unlicense are retained alongside the relevant source excerpts. All new reference/reuse decisions are documented in `INTEGRATIONS.md`.
- Offline cache is `qrer-static-v2.3.0`. The release ZIP excludes Git history, scratch work, OS media, installed dependencies and test output.

## Version 2.4 editing and exports — passed

- Undo and redo restore presets, frames, captions and resets; successive typing forms one history entry. Keyboard undo/redo works outside editable fields. A new edit discards the redo branch. History resets on reload and adds no storage keys. Image references are retained only in the bounded in-memory history.
- A Unicode text code with leading/trailing spaces and a final newline independently decoded with the exact original payload. Its captioned PNG measured exactly 463 × 512 pixels, matching the visible dimensions. Custom filenames are sanitized; reserved filename characters are excluded.
- Clipboard image dimensions matched the selected 512-pixel export and caption frame. The interface remains within 320 pixels, including the filename field and style-history buttons. Desktop and mobile screenshots were inspected.
- Full browser regression passed across all five appearances and glass states, mobile layouts, content modes, graphics failures, keyboard/modal focus, clipboard, privacy and offline reload. All 17 existing export fixtures independently decoded with exact dimensions, in addition to the whitespace fixture.
- Win98 desktop/window/menu/floating-toolbar and offline checks passed, including return focus from About. Chromium glass refraction produced 381 changed pixels against zero displacement; WebKit produced 106. Both engines passed cleanup, idle, native controls, mobile and subfolder offline checks.
- Revisioned JavaScript/CSS URLs are precached alongside existing asset paths. Runtime revalidation avoids stale HTTP responses. The live in-app browser was refreshed and the new 2.4 interface verified.

- Photo PNG/SVG, local scanner/image import, synthetic camera decoding and cleanup, denial recovery, and offline worker scanning also passed after the module-revision update. Release cache: `qrer-static-v2.4.0-r2`.

## Version 2.5 quality refactor — passed

- ESLint recommended checks, consistent formatting, 8 pure-function tests and release-manifest synchronization passed. Vendor runtime files were excluded from formatting and linting.
- The single `npm test` command passed with a managed ephemeral localhost server: all five appearances/glass modes, desktop/mobile layout, content/scanning/photo/logo/frame/card behavior, clipboard, modal/keyboard focus, privacy, offline exports and graphics fallback/context recovery.
- Independent decoding passed for the 17 established PNG fixtures plus the Unicode/whitespace export. Exact output dimensions remained correct.
- New concurrency checks passed for late download completion after a newer draft, size changes during verification, share-dialog close/reopen during rendering, and clipboard denial together with delayed encoding failure.
- WebKit glass rendering (106 changed pixels in the refraction comparison), theme switching, 320px layout, focus, cleanup and subfolder offline reload passed.
- The GitHub Actions workflow is included for future runs; no remote CI run or deployment was performed. Physical-device limitations listed above still apply.
