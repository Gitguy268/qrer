# Qrer

A local QR utility that looks like Windows 98, with liquid glass window chrome and taskbar over a cloud desktop. Qrer 2.7 is MIT licensed.

## Run

Open `start.command` on macOS, or serve this directory:

```sh
python3 serve.py --port 4317
```

Open <http://127.0.0.1:4317/>. There is no build step and the app has no runtime package dependencies. Any static host works, including a project subdirectory. Clipboard and offline features require HTTPS or localhost.

## Editor

- **Content:** links, Unicode text, Wi-Fi credentials, and email drafts. Links without a scheme receive `https://`. Text codes preserve entered spaces and line breaks. **Shorten via ha.mr** (off by default) compresses a link locally with the vendored [ha.mr](https://github.com/p2r3/ha.mr) codec into an upper-case `HTTPS://HA.MR/…` address. That fits QR alphanumeric mode, so the code is smaller; the Content tab shows the QR version before and after. Scanning such a code opens ha.mr, which shows the real link before continuing, so the link reaches ha.mr and the code needs ha.mr to stay online.
- **Style:** Clean (Nayuki), Custom shapes, Photo and Art looks; six presets (named after Qrer's former looks), module/corner/eye shapes, code/eye/background colors, and caption, outline, or card frames. The Classic preset uses square finder patterns for reliable scanning. Photo look blends a picture behind the modules, in colour or black and white, protects every structural QR module, and verifies the composed code locally before enabling exports. Art look draws the picture as Dither, Halftone, Stipple or Strokes marks (square, circle or diamond dots, with contrast and brightness) around the real module centres. In both looks a GIF makes an animated code: up to 30 frames are kept, every frame is scan-checked, and **GIF** saves it (up to 1024 px).
- **Undo / redo:** restore up to 30 style states, including presets, colors, frames, photos, logos, and reset. Buttons are in Style and Logo; Ctrl/⌘ Z and Ctrl/⌘ Shift Z work outside text fields. Text fields retain native undo. History stays in memory and clears on reload.
- **Logo:** a local image with shape, size, padding, white backing, and clear-space controls. Error correction increases automatically when an image is present.
- **Export:** PNG or SVG (GIF for animated codes, where PNG saves the first frame) with a longest edge of exactly 512, 1024, or 2048 px, clipboard image copying at the selected size, and a 1080 × 1440 share card. The export tray shows exact width × height and accepts a custom file name; names are never inferred from content. Frame captions embed the bundled font in SVG exports.

**Read QR…** reads an image or an explicitly started camera stream using Nimiq QR Scanner. Results can be copied or brought into the editor; links are never opened automatically. Camera tracks stop on a successful scan, Stop, dialog close, app hiding, or leaving the page. **Check this code** scans the selected export locally.

The **File** menu offers reading, checking, PNG/SVG/GIF saving, display properties, and About. Win98 uses adapted MIT taskbar/control styling from Windows 98 Web Edition and Unlicense Start-menu/taskbar patterns from WIN98-template. It has a cloud desktop, original pixel icons, a blue titlebar, beveled buttons, native editor tabs, a Start menu, taskbar, clock, and View/Help menus. An original retro `404.html` is served with the correct HTTP status by `serve.py` and used for missing pages offline. Static hosts can use it as their custom 404 page; adjust its home link for a subdirectory deployment if the host does not do so.

**Liquid glass** (status bar, or Display properties) turns the glass title bar, window buttons, taskbar, Start button, Start menu and dialogs on or off. Menus, fields and the preview stay solid grey so they read cleanly; exported codes are never refracted. **Display properties** also picks the wallpaper: Clouds or Teal.

Qrer opens with Clouds and glass on. Later visits remember the wallpaper and the glass switch. Content, credentials, images, and share captions are not persisted and clear on reload. Codes encode their content directly, with no redirect service or service-controlled expiry, unless you tick Shorten via ha.mr. A linked website still needs to remain available. Anyone who receives a Wi-Fi QR can read its credentials.

Always test the exported code on the intended device and at its printed size. Custom colors, shapes, and logos can reduce scanning reliability.

## Win98 desktop

Desktop shortcuts and Start open the editor, scanner, display properties, or About. Minimize hides the window; the taskbar button restores it. Close removes its taskbar entry; Start → QR Editor or the desktop shortcut opens it again. The draft remains in memory during these window actions. Drag the title bar to move the window over the desktop. Maximize (or a double-click on the title bar) expands it; press Restore to return to its normal size.

**View → Float export toolbar** detaches the actual export controls into a tool window. Drag its titlebar or focus it and use arrow keys; Home centers it. Its close button docks the controls again. QR content and export images are unchanged by desktop actions.

Win98 keeps square edges and beveled controls with glass on or off. On small screens the editor and preview stack, desktop shortcuts give way to Start, and the taskbar stays at the bottom. All icons and both wallpapers are original Qrer artwork (the clouds are painted procedurally); no Windows operating-system media is bundled. See [INTEGRATIONS.md](INTEGRATIONS.md) for the assessment of the suggested repositories.

## Liquid glass

Glass only goes on chrome that sits over the wallpaper. Glass bends what is behind it, and over a flat grey panel there is nothing to bend; that is why earlier versions reported glass as on while showing none. The Start and taskbar buttons add inset rim highlights adapted from Kevin Ramirez’s MIT [Liquid Glass Effect](https://github.com/kevinbism/liquid-glass-effect), pinned to `493b710b41d817cbdc3b60808e87ce747d7916f6`.

Actual controls use [kwlck/liquid-glass-web](https://github.com/kwlck/liquid-glass-web), pinned at `a77866771c280eb3edfc108111a01541db6634dc` (MIT). Its unmodified JavaScript and stylesheet are vendored locally. Every surface gets its own generated displacement map and SVG filter. Native HTML semantics, keyboard access, and event handlers are preserved; decorative layers ignore input. Chromium refracts the live backdrop. WebKit/Gecko use the MIT [gentpan/liquidglass](https://github.com/gentpan/liquidglass) optics engine (revision `068ad226f53e1ca62d857f78bdc32f58f3c5fce7`) to refract aligned copies of Qrer’s own locally painted backdrop. Native controls, QR images, and user content stay unfiltered. The portable engine corrects SVG units and filter-cache behavior across engines. CSS glass remains the fallback when SVG filters are unavailable. The backdrop is original procedural artwork; no upstream photos are included.

The component adapter creates and removes surfaces as the Start menu and dialogs open and close. Reduced motion disables pointer highlights. Reduced transparency uses opaque Win98 controls. Disabling glass, hardware fallback, or hiding the document destroys component instances, SVG filters, and observers; showing the app restores enabled surfaces. There is no idle animation loop.

Qrer vendors the WebGL2 renderer and required shaders from [Liquid Glass Studio](https://github.com/iyinchao/liquid-glass-studio) at revision `f7b28c36305a862f5cffed3ddd51511cf1204f56`. Refraction, dispersion, Fresnel highlights, and glare are rendered over an original procedural backdrop. The accessible HTML controls sit above this window renderer, with their own independent component refraction. The QR output stays outside every glass surface.

Glass renders on changes, resizing, scrolling, and pointer interaction with window chrome. There is no idle animation loop. Reduced motion disables pointer-driven glare. Turning glass off disposes its render targets and textures. Missing WebGL2 support, missing floating-point color buffers, initialization errors, and context loss fall back to opaque controls. Context restoration retries the renderer.

Everything loads from this app's origin; there are no third-party requests, accounts, or uploads. After the initial service-worker installation, the editor, glass renderer, font, and exports work offline.

## Development and verification

Application modules separate content encoding, style state, QR rendering, export composition, interface preferences, glass rendering, and DOM interaction. Vendored dependencies are isolated from original application code. Modern browsers with ES modules, native dialogs, and Canvas are required; glass additionally requires WebGL2 and `EXT_color_buffer_float`.

With Node 22.13+ (22 series) or Node 24+, and Python 3.9+, install the test dependencies and Chromium. The test command starts and stops its own local server:

```sh
npm ci
npx playwright install chromium
npm test

# Optional real WebKit component checks
npx playwright install webkit
npm run test:webkit
```

The browser suite exercises the Win98 look with glass on/off, every QR preset, 320/390/768/1280 px layouts, the editor, content modes, logo/frame/card exports, clipboard, keyboard/dialog behavior, storage, hardware failures, context loss/restoration, reduced motion, idle rendering and offline operation. A separate decoder checks 17 exported files for correct content and dimensions. Component tests check that the wallpaper visibly shows through the taskbar, that white title text keeps 4.5:1 contrast over it, generated displacement maps, a pixel comparison against zero refraction, Start menu/dialog surfaces, native keyboard controls, reduced motion, idle behavior, cleanup, and offline reload. Additional tests check photo PNG/SVG exports at all sizes, image scanning and safe content import, offline worker scanning, menus/404 pages, and a synthetic camera QR feed with cancellation and permission failures. No real camera is accessed by the test suite.

Environment overrides:

| Variable                                           | Purpose                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `QRER_URL`                                         | Existing app URL, including a subfolder; otherwise an isolated server is started |
| `QRER_TEST_OUTPUT`                                 | Screenshots and generated files; otherwise a new temporary directory             |
| `CHROMIUM_PATH`, `WEBKIT_PATH`                     | Existing browser executable                                                      |
| `PLAYWRIGHT_MODULE`, `SHARP_MODULE`, `JSQR_MODULE` | Existing test package locations                                                  |

The [integration notes](INTEGRATIONS.md) document the use and licensing decision for all ten suggested repositories. Amazing-QR and Retro-404 are conceptual references only; their source is not distributed. Photo QR uses still images, including the first frame of GIF uploads; animated GIF output is not included.

See [VERIFICATION.md](VERIFICATION.md) for the completed checks.

## License

Copyright (c) 2026 Lucas Van De Weerd. [MIT](LICENSE).

The separately licensed QR libraries and all liquid glass libraries retain their MIT notices; Figtree retains its SIL OFL notice. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Qrer 2 replaces the application code inherited from Ente QR in Qrer 1. The new MIT license does not retroactively relicense historical Ente commits or earlier releases.

## Version 2.4

Adds reversible style editing, custom export names, exact output dimensions, and clipboard sizing. Revisioned module URLs and revalidated offline requests prevent stale imports after an update. Win98 chrome, Start menu, floating export toolbox, and real liquid glass remain available. No new dependencies were added.

## Version 2.5

Refactors the application into controllers with explicit state ownership and frozen preview snapshots. Fixes stale async feedback and clipboard rejection handling, and adds source formatting, linting, pure-function tests, concurrency tests, release-manifest validation, a managed test server and a CI workflow. All new npm dependencies are development-only. See [ARCHITECTURE.md](ARCHITECTURE.md) for module contracts and maintenance commands.

## Version 2.6

Win98 is now the only look; Classic, Studio, LiquidFrame and GlassPaint are removed. Liquid glass moved from controls over grey panels, where it could not be seen, to the title bar, window buttons, taskbar and Start menu over a new procedural cloud wallpaper. The window can be dragged by its title bar. The glass switch moved to the status bar, and filler copy (preview labels, the on-device badge, the storage card) was removed. Tests now check that glass is visible and the title stays readable.

## Version 2.7

Adds three options based on suggested repositories. **Shorten via ha.mr** vendors the MIT ha.mr compressor for smaller link codes. The new **Art** look (Dither, Halftone, Stipple, Strokes) follows the idea of zidankazi/animated-qr-generator, and the Photo look gains animated GIF input and a black-and-white option after x-hw/amazing-qr. Neither of those two repositories' code is used: one has no licence and the other is GPL-3.0. GIFs are read and written with the vendored MIT omggif. A new `pictures` browser suite decodes every exported GIF frame.
