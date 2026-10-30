# Qrer architecture

Qrer is a static application with native browser modules. No bundler, framework, backend, or runtime package installation is required. Development tools and tests are separate from the shipped browser dependencies.

## Ownership

| Module                            | Owns                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| `main.js`                         | Startup and connections between controllers; no editing logic     |
| `shell.js`                        | Appearance, editor tabs, menus and ordinary dialogs               |
| `editor-content.js`               | Content type, per-type drafts and field events                    |
| `editor-style.js`                 | Current style, history and image-loading revisions                |
| `preview.js`                      | Debounced rendering and the currently validated QR snapshot       |
| `export-controls.js`              | Export operation lock, captured size/name and completion feedback |
| `share-dialog.js`                 | Card rendering, dialog lifetime and object URLs                   |
| `scanner.js`                      | Scanner imports, camera tracks and result import                  |
| `retro.js`                        | Desktop/window behavior and the detachable export tray            |
| `glass.js`, `glass-components.js` | Window rendering and decorative control surfaces                  |

Pure functions live in `content.js`, `model.js`, `history.js`, `tasks.js`, and `export-settings.js`. QR drawing/composition stays in `matrix.js`, `qr.js`, `photo.js`, `art.js`, and `export.js`. `gif.js` reads picture frames and writes GIFs through the vendored omggif; `short-link.js` adapts the vendored ha.mr compressor and loads it only when chosen. `dom.js` gives missing required elements a useful startup error.

## Data flow

1. An editor changes its own state and calls `onChange`.
2. The composition root reads content and a copy of the style.
3. Preview clears the previous export snapshot immediately, validates the content, and starts a delayed render.
4. Only the latest render may publish a frozen snapshot. Photo mode must also pass its local decode check.
5. Export captures that snapshot, size and filename before starting work. Later edits cannot alter the export in progress. Completion messages apply only while the same snapshot is still current.

A style edit supplies its own undo group. Content editing and page-wide event capture cannot accidentally create style history. Text fields retain native browser undo. History stores at most 30 shallow states; large image strings are shared and never serialized to storage.

## Asynchronous work and resources

`createRevision` invalidates earlier work without pretending that browser image decoding or QR generation can be cancelled. Preview and card completion handlers check ownership before changing the DOM. Image loads use separate logo/photo revisions, invalidated by removal, reset or history navigation.

Card object URLs are revoked when replaced or closed; late renders cannot reopen the card. Camera tracks stop on close, success, Stop, page exit and hiding the document. Glass rendering is event-driven and has its existing disable/fallback cleanup. Preview timers are cancelled on page exit and refreshed after a back-forward-cache restore.

Clipboard writes begin in the click handler for Safari compatibility. Both the encoding promise and clipboard promise are observed, including synchronous permission errors. Export format/size validation is shared with its tests.

Controllers are initialized once per document. There is no client router or repeated mounting. Do not call the controller factories twice against the same DOM; if that lifecycle is added, listener disposal must be added with it.

## Privacy and dependencies

Only interface preferences enter localStorage. Drafts, filenames, images, scanner results and history remain in memory. Do not derive filenames from QR content, which can contain Wi-Fi credentials. Never include payloads in logs or telemetry.

Vendored runtimes are excluded from formatting and linting. Preserve their pinned source and notices; edit the Qrer adapters instead. Their license decisions remain in `INTEGRATIONS.md` and `THIRD-PARTY-NOTICES.md`.

## Development checks

Use Node 22.13+ on the 22 series, or Node 24+, and Python 3.9+.

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` checks lint, formatting, pure-function tests and synchronized release assets, then starts an isolated localhost server on an available port. It runs all browser suites and stops the server even on failure. `QRER_URL` can target an existing server instead. Test artifacts use a fresh temporary directory unless `QRER_TEST_OUTPUT` is supplied.

- `npm run check`: fast source, unit and manifest checks without a browser.
- `npm run format`: format authored source, styles, markup and tests.
- `npm run test:browser`: full Chromium integration/decoder/concurrency suite.
- `npm run test:webkit`: optional WebKit glass checks; install Playwright WebKit first.
- `npm run release:sync`: synchronize module revisions and precache resources after a version change or module addition.
- `npm run package`: make the source archive, excluding dependencies, Git history and test output.

The CI workflow runs the same `npm test` command. It does not deploy the app. The workflow is included but has not been executed on GitHub as part of this local refactor.

## Release discipline

Update the version with `npm version <version> --no-git-tag-version`, run `npm run release:sync`, update the visible release notes, then run `npm test`. The release script discovers authored modules and styles and combines them with the explicit vendor/static resource list. Its check mode fails when URLs or the offline manifest drift from the package version.

The browser tests cover visible behavior, decoded output, dimensions, accessibility, glass fallbacks, mobile overflow, offline use and concurrent operations. Unit tests focus on encoding boundaries, immutable snapshots, bounded undo/redo, latest-result ownership and export validation. Physical phones, printed output and native OS share sheets still require manual checks.
