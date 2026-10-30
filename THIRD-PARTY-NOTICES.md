# Third-party notices

Qrer 2's original application code is Copyright (c) 2026 Lucas Van De Weerd and is provided under the MIT license in `LICENSE`. Third-party files retain their respective licenses.

## Liquid Glass Studio

- Author: Charles Yin; Copyright (c) 2024 Charles Yin.
- Source: https://github.com/iyinchao/liquid-glass-studio
- Pinned revision: `f7b28c36305a862f5cffed3ddd51511cf1204f56`.
- License: MIT; full notice in `assets/vendor/liquid-glass-studio/LICENSE`.
- Included: WebGL2 renderer and the GLSL passes and helpers it requires. Original source is retained in the vendor directory. The browser renderer has TypeScript syntax removed; the shader module resolves local includes. Qrer's integration is original application code.
- Upstream credits Inigo Quilez for signed-distance and smooth-merge techniques (https://iquilezles.org/). Those credits and source comments are retained in the vendored source.
- No upstream photos, videos, Apple artwork, React interface, or WebGPU backend is distributed.

## qr-code-styling

- Author: Denys Kozak; Copyright (c) 2019 Denys Kozak.
- Source: https://github.com/kozakdenys/qr-code-styling
- License: MIT; full notice in `assets/vendor/LICENSE`.
- The vendored browser library is retained byte-for-byte from the dependency distributed at Ente QR revision `c7a32c9768da19c66a6553f60f8e05563dbc5807`. It is a separately licensed dependency, not Ente application code.

## ha.mr

- Author: p2r3; Copyright (c) 2026 p2r3.
- Source: https://github.com/p2r3/ha.mr
- Pinned revision: `e1241f25f3e193b070acc0485288961ec11ce34f`.
- License: MIT; full notice in `assets/vendor/ha-mr/LICENSE`.
- Included: `compress.js` and `alphabets.js`, unchanged. Loaded only when Shorten via ha.mr is ticked.

## omggif

- Author: Dean McNamee; (c) 2013.
- Source: https://github.com/deanm/omggif (npm `omggif` 1.0.10).
- License: MIT; notice in the file header and `assets/vendor/omggif/LICENSE`.
- Included: `omggif.js`, unchanged.

## Figtree

- Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree).
- License: SIL Open Font License 1.1; full notice in `assets/fonts/Figtree-OFL.txt`.
- The unmodified WOFF2 font was extracted from its embedded upstream distribution. It is used for portable export captions.

## Earlier Ente-based versions

Qrer 1 was a modification of https://github.com/ente-toys/qr. The Qrer 2 release replaces the inherited application HTML, CSS, JavaScript, and service worker with newly authored implementations. No Ente application code is included in the release tree. This MIT license does not retroactively apply to Ente source in historical commits or earlier releases.

## Development dependencies

Playwright (Apache-2.0), sharp (Apache-2.0), and jsQR (Apache-2.0) are used only for development and verification. Their packages and transitive dependencies retain their bundled notices. They are not loaded by the application. See the pinned versions in `package-lock.json`.

## Project Nayuki QR Code generator

- Author: Project Nayuki.
- Source: https://github.com/nayuki/QR-Code-generator
- Pinned revision: `3c6d0b3cefb4e049dc337e82237c9644399716a8`.
- MIT notice is embedded in the original TypeScript source and reproduced in `assets/vendor/nayuki/LICENSE`.
- TypeScript 5.8.3 compilation adds an ES module export. Qrer retains the function-module mask for protected photo rendering; symbol encoding is unchanged.

## Nimiq QR Scanner and jsQR

- Copyright (c) 2017 Nimiq, danimoh.
- Source: https://github.com/nimiq/qr-scanner
- Pinned revision: `abcfe1bce2703721408d8ce7ebde94a359998506`.
- MIT; full notice in `assets/vendor/qr-scanner/LICENSE`.
- The worker includes jsqr-es6 (the jsQR fork by Cosmo Wolfe, Jefff Nelson, danimoh and contributors), based on Google's ZXing. Its Apache License 2.0 is retained in `assets/vendor/qr-scanner/JSQR-LICENSE`. Runtime files and source maps are included without alteration.

## Windows 98 Web Edition controls

- Copyright (c) 2025 Aziz Rahmad.
- Source: https://github.com/azayrahmad/win98-web
- Pinned revision: `e7ddf164cf982d160b4fe52ea073fbe04f6c9372`.
- MIT; full notice in `assets/vendor/win98-web/LICENSE`.
- Qrer adapts address-bar control styling and taskbar/divider patterns and scopes it to Win98 (stored theme key `win97`). The original control and taskbar source stylesheets are preserved for reference. No upstream icons, fonts, sounds, artwork, or OS shell is included.

Amazing-QR and Retro-404 supplied feature concepts only; no source or artwork from those projects is distributed. Other evaluated repositories and their disposition are documented in `INTEGRATIONS.md`. Qrer's photo composition, scanner interface, File menu, display properties, and 404 page are original MIT application code.

## Liquid Glass for Web components

- Copyright (c) 2026 kwlck.
- Source: https://github.com/kwlck/liquid-glass-web
- Pinned revision: `a77866771c280eb3edfc108111a01541db6634dc`.
- License: MIT; full notice in `assets/vendor/liquid-glass-web/LICENSE`.
- `liquid-glass.js`, `geometry.js`, and `liquid-glass.css` are copied without modification. Qrer’s component lifecycle adapter and visual styling are original MIT application code.
- No upstream demo, photographs, Apple assets, or dependencies are included. This is a permissive, non-copyleft component library.

## Portable Liquid Glass optics

- Copyright (c) 2026 gentpan.
- Source: https://github.com/gentpan/liquidglass
- Pinned revision: `068ad226f53e1ca62d857f78bdc32f58f3c5fce7`.
- License: MIT; full notice in `assets/vendor/portable-glass/LICENSE`.
- Only the unmodified `lib/liquid-glass.js` engine is included. It handles cross-engine SVG units, image decoding, filter cache invalidation, chromatic dispersion, and cleanup.
- Qrer uses it on aligned copies of its own procedural backdrop for WebKit/Gecko, preserving unfiltered native controls and QR previews. No demo wallpapers, icons, site code, components, or skill are bundled.

## WIN98-template layout patterns

- Source: https://github.com/pollygon-dev/WIN98-template
- Pinned revision: `84b03812910d86bb7de48b0eda85b8a53aa80959`.
- License: Unlicense (public-domain dedication); full notice in `assets/vendor/win98-template/LICENSE`.
- Start-menu/taskbar CSS layout patterns adapted in `assets/retro.css`; the original relevant stylesheet section is preserved as `taskbar-source.css`.
- Upstream describes its template as based on HTML5-Templates.com’s Windows template. No upstream JavaScript, artwork, icons, fonts, third-party runtime dependencies, or OS media are included. Qrer’s desktop controller, floating toolbox, clock, icons, and wallpaper are newly authored MIT code.

All newly suggested repositories and the boundaries of their use are documented in `INTEGRATIONS.md`. No GPL/share-alike/unlicensed application source was added to this release.

## Liquid Glass Effect edge highlights

- Copyright (c) 2025 Kevin Ramirez.
- Source: https://github.com/kevinbism/liquid-glass-effect
- Pinned revision: `493b710b41d817cbdc3b60808e87ce747d7916f6`.
- License: MIT; full notice in `assets/vendor/liquid-glass-effect/LICENSE`.
- The two inset edge-shadow patterns are adapted in `rim.css`, scoped to the glass Start and taskbar buttons. An original source excerpt is retained in `rim-source.css`. This adds surface highlights to the existing real refraction; it does not replace the renderer with a blur effect.
- No global resets, page layouts, demo photos, music-player UI, or remote resources are included. Win98 styling is unaffected.
