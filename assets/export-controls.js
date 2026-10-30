// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $ } from './dom.js?v=2.7.0';
import { exportDimensions, exportFilename } from './export-settings.js?v=2.7.0';
import { exportCode, download, GIF_EDGE } from './export.js?v=2.7.0';
import { decodeImage } from './scanner.js?v=2.7.0';
import { blobFrames } from './gif.js?v=2.7.0';

/** Download/copy/check share an operation lock and capture immutable inputs. */
export function createExportControls({ getSpec, isAnimated }) {
  let busy = false;
  const actionIds = ['dlPng', 'dlSvg', 'dlGif', 'copyBtn', 'shareBtn', 'verifyBtn'];
  const edge = () => Number($('exportSize').value);
  const dimensionsLabel = (spec, size) => {
    const dimensions = exportDimensions(spec.style, size);
    return `${dimensions.width} × ${dimensions.height} px`;
  };

  function update() {
    const spec = getSpec();
    $('exportDimensions').textContent = spec ? dimensionsLabel(spec, edge()) : 'No code to export';
    $('exportName').title = exportFilename($('exportName').value, 'png');
    actionIds.forEach((id) => {
      $(id).disabled = !spec || busy;
    });
    // An animated code saves as GIF; SVG would hold only its first frame.
    const animated = !!spec && isAnimated();
    $('dlGif').hidden = document.querySelector('[data-action="gif"]').hidden = !animated;
    $('dlSvg').hidden = document.querySelector('[data-action="svg"]').hidden = animated;
    if (animated && edge() > GIF_EDGE)
      $('exportDimensions').textContent += ` · GIF up to ${GIF_EDGE} px`;
  }

  function begin() {
    const spec = getSpec();
    if (!spec || busy) return null;
    const size = edge();
    const filename = $('exportName').value;
    busy = true;
    update();
    return {
      spec,
      size,
      filename,
      report(message) {
        // A completed operation must not overwrite a newer draft's status.
        if (getSpec() === spec) $('appStatus').textContent = message;
      },
      finish() {
        busy = false;
        update();
      },
    };
  }

  async function save(type) {
    const operation = begin();
    if (!operation) return;
    const { spec, size, filename } = operation;
    operation.report('Exporting…');
    try {
      download(await exportCode(spec, type, size), exportFilename(filename, type));
      operation.report('Saved ' + type.toUpperCase());
    } catch (error) {
      operation.report(error.message || 'Export failed. Try a smaller size.');
    } finally {
      operation.finish();
    }
  }

  function copy() {
    const operation = begin();
    if (!operation) return;
    const { spec, size } = operation;
    operation.report('Copying PNG…');
    try {
      // Safari requires the write to begin synchronously in this user gesture.
      const image = exportCode(spec, 'png', size);
      // ClipboardItem construction or write can throw before consuming this promise.
      image.catch(() => {});
      const write = navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
      // Observe both promises even if the clipboard rejects before reading the image.
      Promise.all([image, write])
        .then(() => operation.report('Copied PNG · ' + dimensionsLabel(spec, size)))
        .catch(() => operation.report('Clipboard unavailable. Download PNG instead.'))
        .finally(() => operation.finish());
    } catch {
      operation.report('Clipboard unavailable. Download PNG instead.');
      operation.finish();
    }
  }

  async function verify() {
    const operation = begin();
    if (!operation) return;
    const { spec, size } = operation;
    operation.report('Checking code…');
    try {
      let decoded;
      if (isAnimated()) {
        // Check the saved GIF itself, after its palette is applied, frame by frame.
        const frames = await blobFrames(await exportCode(spec, 'gif', size));
        for (const [index, frame] of frames.entries()) {
          operation.report(`Checking frame ${index + 1} of ${frames.length}…`);
          decoded = await decodeImage(frame.canvas);
          if (decoded !== spec.payload) break;
        }
      } else decoded = await decodeImage(await exportCode(spec, 'png', size));
      operation.report(
        size !== edge()
          ? 'Size changed. Check this code again.'
          : decoded === spec.payload
            ? 'Scan check passed'
            : 'The code decoded to different content. Check its style.',
      );
    } catch {
      operation.report(
        size !== edge()
          ? 'Size changed. Check this code again.'
          : 'This code could not be read. Try stronger contrast or square shapes.',
      );
    } finally {
      operation.finish();
    }
  }

  $('dlPng').addEventListener('click', () => save('png'));
  $('dlSvg').addEventListener('click', () => save('svg'));
  $('dlGif').addEventListener('click', () => save('gif'));
  $('copyBtn').hidden = !navigator.clipboard || !window.ClipboardItem;
  $('copyBtn').addEventListener('click', copy);
  $('verifyBtn').addEventListener('click', verify);
  $('exportSize').addEventListener('change', update);
  $('exportName').addEventListener('input', update);
  update();
  return { update };
}
