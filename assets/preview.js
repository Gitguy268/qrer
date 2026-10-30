// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $ } from './dom.js?v=2.7.0';
import { snapshot, contrast } from './model.js?v=2.7.0';
import { renderCode } from './qr.js?v=2.7.0';
import { rasterize } from './export.js?v=2.7.0';
import { decodeImage } from './scanner.js?v=2.7.0';
import { createRevision } from './tasks.js?v=2.7.0';
import { pictureFrames } from './photo.js?v=2.7.0';
import { writeGif } from './gif.js?v=2.7.0';

const PREVIEW_DELAY_MS = 80;
// The on-screen animation is smaller than exports; the frames were checked at full size.
const PREVIEW_GIF_EDGE = 480;

/** Owns the validated snapshot. Only the most recent render may publish it. */
export function createPreview({ onChange }) {
  const revision = createRevision();
  let timer = 0;
  let readySpec = null,
    animated = false,
    gifURL = null;

  function clearGif() {
    if (gifURL) URL.revokeObjectURL(gifURL);
    gifURL = null;
    animated = false;
  }

  function showEmpty(message) {
    const text = document.createElement('p');
    text.className = 'empty-message';
    text.textContent = message;
    $('qr').replaceChildren(text);
  }

  async function draw(spec, isCurrent) {
    try {
      const svg = await renderCode(spec);
      if (!isCurrent()) return;
      const picture = spec.style.mode === 'photo' || spec.style.mode === 'art';
      let gif = null;
      if (picture) {
        $('qr').dataset.state = 'checking';
        const source = new Blob([new XMLSerializer().serializeToString(svg)], {
          type: 'image/svg+xml',
        });
        let decoded;
        try {
          decoded = await decodeImage(
            await rasterize(
              source,
              Number(svg.getAttribute('width')),
              Number(svg.getAttribute('height')),
            ),
          );
        } catch {
          /* Decode failure is handled by the same readable error below. */
        }
        if (!isCurrent()) return;
        const advice =
          spec.style.mode === 'art'
            ? 'Try another drawing, raise the contrast or shorten the content.'
            : 'Lower the photo strength or shorten the content.';
        if (decoded !== spec.payload)
          throw new Error(`This ${spec.style.mode} code could not be read. ${advice}`);
        const { canvases, delays } = await pictureFrames(spec);
        for (let index = 1; index < canvases.length; index++) {
          if (!isCurrent()) return;
          $('quality').textContent = `Checking frame ${index + 1} of ${canvases.length}…`;
          let frame;
          try {
            frame = await decodeImage(canvases[index]);
          } catch {}
          if (frame !== spec.payload)
            throw new Error(`Frame ${index + 1} could not be read. ${advice}`);
        }
        if (canvases.length > 1)
          gif = writeGif(
            canvases,
            delays,
            [spec.style.ink, spec.style.eye, spec.style.paper],
            PREVIEW_GIF_EDGE,
          );
      }
      if (!isCurrent()) return;
      clearGif();
      if (gif) {
        // The browser animates the GIF itself; no timers or animation frames to clean up.
        gifURL = URL.createObjectURL(gif);
        animated = true;
        svg.querySelector('image').setAttribute('href', gifURL);
      }
      readySpec = spec;
      $('qr').replaceChildren(svg);
      $('qr').dataset.state = 'ready';
      const good = contrast(spec.style);
      $('quality').classList.toggle('warning', !good);
      $('quality').textContent = picture
        ? `${spec.style.mode === 'art' ? 'Art' : 'Photo'} code checked${animated ? ' (every frame)' : ''}. Test again before printing.`
        : good
          ? ''
          : 'Low contrast. Use dark ink on a light background.';
      $('appStatus').textContent = 'Ready';
    } catch (error) {
      if (!isCurrent()) return;
      clearGif();
      const photo = spec.style.mode === 'photo' || spec.style.mode === 'art';
      showEmpty(
        photo
          ? error.message || 'The photo code could not be created.'
          : 'This content will not fit in a QR code. Shorten it and try again.',
      );
      $('qr').dataset.state = 'error';
      $('quality').textContent = photo
        ? 'Choose or adjust your photo to continue.'
        : 'Shorten the content to export.';
      $('quality').classList.add('warning');
      $('appStatus').textContent = 'QR could not be generated';
    } finally {
      if (isCurrent()) {
        $('qr').dataset.loading = 'false';
        onChange();
      }
    }
  }

  return {
    getSpec: () => readySpec,
    isAnimated: () => !!readySpec && animated,
    update(content, style) {
      const isCurrent = revision.begin();
      clearTimeout(timer);
      readySpec = null;
      animated = false;
      onChange();
      $('contentError').textContent = content.error || '';
      $('contentCount').textContent =
        new TextEncoder().encode(content.payload || '').length +
        ' bytes' +
        (content.note ? ' · ' + content.note : '');
      $('documentName').textContent = content.title;
      $('quality').classList.remove('warning');
      if (content.error) {
        $('qr').dataset.state = 'empty';
        $('qr').dataset.loading = 'false';
        showEmpty('Add content to generate a QR code.');
        $('quality').textContent = 'Complete the content fields.';
        $('appStatus').textContent = 'Waiting for content';
        return;
      }
      $('qr').dataset.state = 'drawing';
      $('qr').dataset.loading = 'true';
      $('quality').textContent = '';
      const spec = snapshot(content.payload, style);
      timer = setTimeout(() => draw(spec, isCurrent), PREVIEW_DELAY_MS);
    },
    cancel() {
      revision.invalidate();
      clearTimeout(timer);
      readySpec = null;
      clearGif();
    },
  };
}
