# Repository integrations

Reviewed on 17 October 2026. Qrer application code remains MIT. Third-party license notices are retained in their vendor folders.

| Repository                                                                    | Use in Qrer                                               | License / decision                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs)               | Evaluated; no runtime copy                                | MIT. Its basic generator overlaps the selected Nayuki encoder and existing styling library.                           |
| [x-hw/amazing-qr](https://github.com/x-hw/amazing-qr)                         | Photo-QR, animated-GIF and black-and-white concepts only  | GPL-3.0. No source copied or bundled. Photo composition and GIF handling are original browser code (2.7 adds GIFs).   |
| [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator)       | Vendored encoder for Clean and Photo looks                | MIT embedded in the TypeScript source. A retained function-module mask protects QR structural patterns in Photo look. |
| [mebjas/html5-qrcode](https://github.com/mebjas/html5-qrcode)                 | Evaluated; no runtime copy                                | Apache-2.0. Broader barcode scanning overlaps Nimiq; Qrer needs QR reading only.                                      |
| [nimiq/qr-scanner](https://github.com/nimiq/qr-scanner)                       | Vendored image/camera reader and local scan checks        | MIT. Its bundled jsQR worker dependency retains its Apache-2.0 license.                                               |
| [schmich/instascan](https://github.com/schmich/instascan)                     | Evaluated; no runtime copy                                | MIT. Camera scanning overlaps the selected image-and-camera reader.                                                   |
| [gaoryrt/retro-404](https://github.com/gaoryrt/retro-404)                     | Visual concept only                                       | CC BY-SA 4.0 per upstream README. Qrer’s 404 page is newly authored without copying source or artwork.                |
| [azayrahmad/win98-web](https://github.com/azayrahmad/win98-web)               | Adapted scoped bevel/control styling                      | MIT. Source control stylesheet, copyright, and license retained. No fonts, Windows artwork, or OS shell bundled.      |
| [pollygon-dev/WIN98-template](https://github.com/pollygon-dev/WIN98-template) | Adapted Start-menu/taskbar CSS patterns; desktop concepts | Unlicense. Pinned source excerpt and notice included. Qrer’s window/menu/controller logic is newly authored.          |
| [zabdalimov/win98](https://github.com/zabdalimov/win98)                       | Reviewed as a visual reference                            | No root source license found. No code or assets copied.                                                               |

## Implementation boundaries

Nayuki’s TypeScript source is pinned at `3c6d0b3cefb4e049dc337e82237c9644399716a8`; Nimiq QR Scanner at `abcfe1bce2703721408d8ce7ebde94a359998506`; Win98 Web Edition at `e7ddf164cf982d160b4fe52ea073fbe04f6c9372`.

Camera access begins only after Start camera. Images and frames stay on the device. Closing the scanner, hiding the app, or leaving the page stops camera tracks. Decoded links are never opened automatically; Use in editor is an explicit action.

Clean look uses Nayuki for square codes without a center logo. Custom shapes and center logos use qr-code-styling. Photo look uses Nayuki with high error correction, protected function modules, an original photo compositor and a local scan check before enabling export. PNG and self-contained SVG exports are supported; GIF animation is not included.

## Version 2.2 glass components

[kwlck/liquid-glass-web](https://github.com/kwlck/liquid-glass-web) supplies native-HTML glass surfaces, not a screenshot or decorative blur simulation. Its MIT-licensed source is pinned to `a77866771c280eb3edfc108111a01541db6634dc`; each control generates an independent displacement map. Qrer retains the original Liquid Glass Studio WebGL shell and adds actual per-component refraction. Both libraries are MIT and self-hosted. No upstream demonstration media is distributed. Chromium refracts the live DOM backdrop. WebKit/Gecko use the additional MIT gentpan/liquidglass engine at `068ad226f53e1ca62d857f78bdc32f58f3c5fce7` on aligned original-backdrop copies; it handles engine-specific SVG units and cached-filter repainting. CSS glass is retained if SVG filters are unavailable.

## Version 2.3 retro restoration

Reviewed all twelve retro/QR repositories suggested for this update. The release remains MIT with permissive dependency notices. The existing Win98 Web source is pinned at `e7ddf164cf982d160b4fe52ea073fbe04f6c9372`; the additional taskbar source section is retained. WIN98-template CSS is pinned at `84b03812910d86bb7de48b0eda85b8a53aa80959`; its Unlicense and original taskbar/menu CSS excerpt are included. No upstream desktop scripts, OS images, or media are included.

| Additional repository                                                           | Assessment and use                                                                                                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MrRar/win98theme](https://github.com/MrRar/win98theme)                         | Android theme; no root source license found in this review. Pixel-density/90s palette reference only. No icons copied.                                     |
| [spitfirex86/FloatingToolbars](https://github.com/spitfirex86/FloatingToolbars) | Native C# toolbars; no root license/README grant found. Concept for Qrer’s original draggable/dockable export toolbox only. No source copied.              |
| [nestoris/win98wallpapers](https://github.com/nestoris/win98wallpapers)         | Unlicense, but the imagery remakes Windows artwork. No images bundled; Qrer paints its own teal/pixel pattern.                                             |
| [xero/windows98.website](https://github.com/xero/windows98.website)             | CC0-1.0 source, with upstream noting Microsoft/other groups designed the historic visuals. Desktop/Start-menu reference only; no original OS media copied. |
| [moeleak/win98](https://github.com/moeleak/win98)                               | Hexo theme, no root license/README grant found. No source or assets bundled.                                                                               |
| [rtts/win98](https://github.com/rtts/win98)                                     | Virtual-machine project with a disk image, no root source license found. Not a browser UI dependency; no disk image or system files downloaded or bundled. |
| [retronas/retronas](https://github.com/retronas/retronas)                       | MIT retro network-storage software. Different purpose; no runtime integration needed for a local QR utility.                                               |
| [Gitguy268/QRcodeforeveryone](https://github.com/Gitguy268/QRcodeforeveryone)   | Root MIT license. Its direct, non-expiring QR concept is already covered by Qrer’s local encoder. No generator replaced or source copied.                  |

Retro-404 remains a visual concept only (its README grants CC BY-SA 4.0). The existing original MIT 404 page stays in the release. Zabdalimov’s unlicensed source is not copied. The stronger Win98 appearance, native menu keyboard handling, minimize/restore/close/maximize, draft preservation, taskbar clock, original icons, and floating-toolbox interaction are Qrer application code.

## Additional glass references for version 2.3

All eight supplied glass repositories were reviewed. The existing real refraction engines remain in place. Only Kevin Ramirez’s small MIT edge-highlight pattern is added, on the glass Start and taskbar buttons. In 2.6 the glass moved onto chrome over a procedural cloud wallpaper; the clouds idea follows nestoris/win98wallpapers (Unlicense), but no files from it are used, since those are remakes of Microsoft artwork.

| Repository                                                                                | License / use                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [kevinbism/liquid-glass-effect](https://github.com/kevinbism/liquid-glass-effect)         | MIT, Copyright 2025 Kevin Ramirez. Inset rim-shadow pattern adapted at revision `493b710b41d817cbdc3b60808e87ce747d7916f6`; source excerpt and full notice retained. No sample photos, page layout, or music UI included. |
| [kayozxo/ulauncher-liquid-glass](https://github.com/kayozxo/ulauncher-liquid-glass)       | MIT GTK/Ulauncher theme. Evaluated as a compact control reference; no theme installed, no GNOME extensions, no source bundled.                                                                                            |
| [xenitV1/liquid-glass-skill](https://github.com/xenitV1/liquid-glass-skill)               | MIT design/agent reference. Its controls-only placement and accessibility goals agree with Qrer’s current architecture. No agent skill installed and no additional refraction engine bundled.                             |
| [chyinan/liquid-glass-music-player](https://github.com/chyinan/liquid-glass-music-player) | No root license or README reuse grant found in this review. No code, album art, backend, or music UI copied.                                                                                                              |
| [archisvaze/liquid-glass](https://github.com/archisvaze/liquid-glass)                     | MIT SVG/WebGL demo; photos explicitly excluded from the source license. Evaluated; existing Qrer engines already cover the needed refraction. No duplicate renderer or media bundled.                                     |
| [u7663394/LGGC-liquid-glass](https://github.com/u7663394/LGGC-liquid-glass)               | MIT CSS library. Evaluated; its CSS surface treatment overlaps existing controls. No global class/reset or second styling library added.                                                                                  |
| [ShengzhiWu/liquid-glass](https://github.com/ShengzhiWu/liquid-glass)                     | MIT Three.js/particle/metaball demo. Evaluated; continuous fluid simulation is unnecessary for this compact utility. No runtime, images, or simulation copied.                                                            |
| [Weiqin-Mo/Liquid-Glass-HTML](https://github.com/Weiqin-Mo/Liquid-Glass-HTML)             | MIT HTML component demo. Evaluated for control shapes and edge refraction; existing native controls and portable optics retained. No demo page, animations, or image dependencies added.                                  |

## Version 2.7 options

Reviewed on 25 October 2026.

| Repository                                                                            | Use in Qrer                                               | License / decision                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [p2r3/ha.mr](https://github.com/p2r3/ha.mr)                                           | Vendored link compressor for the opt-in Shorten via ha.mr | MIT, Copyright (c) 2026 p2r3. `docs/compress.js` and `docs/alphabets.js` pinned at `e1241f25f3e193b070acc0485288961ec11ce34f`, unchanged. Its lean-qr copy is not bundled. |
| [zidankazi/animated-qr-generator](https://github.com/zidankazi/animated-qr-generator) | Concept for the Art look: dither/halftone/stipple/strokes | No licence found (all rights reserved). Ideas only; Qrer's renderer, dithering, seeded stipple and GIF handling are newly written. No code copied.                         |
| [deanm/omggif](https://github.com/deanm/omggif)                                       | Vendored GIF reader and writer                            | MIT, (c) Dean McNamee 2013. npm 1.0.10, unchanged; notice in its header and `assets/vendor/omggif/LICENSE`.                                                                |

ha.mr codes put the compressed link in the URL path, so the link reaches ha.mr when scanned, and ha.mr shows it before continuing. The option is off by default, kept in memory only, and says so next to the checkbox. Compression runs locally; Qrer never contacts ha.mr. Each short link is decompressed again before use and rejected if it does not give back the original link.

Photo and Art codes from a GIF keep up to 30 evenly spaced frames. Every frame must decode locally before export is enabled. The preview animation is a smaller GIF shown by the browser, with no timers to clean up. Frames are kept for the latest picture only and never stored.
