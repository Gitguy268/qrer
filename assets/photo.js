// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Original photo QR composition, inspired by the idea of Amazing-QR, including
// its animated GIF and black-and-white variants. No GPL implementation code is used.
import { encodeMatrix } from './matrix.js?v=2.7.0';
import { loadFrames } from './gif.js?v=2.7.0';
import { artFrame } from './art.js?v=2.7.0';

const UNIT = 18,
  BORDER = 4;

function monochrome(context, left, top, area) {
  const image = context.getImageData(left, top, area, area);
  const data = image.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const light = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    data[offset] =
      data[offset + 1] =
      data[offset + 2] =
        Math.min(255, Math.max(0, (light - 128) * 1.25 + 128));
  }
  context.putImageData(image, left, top);
}

export function photoFrame(matrix, image, style) {
  const dimension = (matrix.size + BORDER * 2) * UNIT;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = dimension;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, dimension, dimension);
  const area = matrix.size * UNIT,
    scale = Math.max(area / image.width, area / image.height);
  c.save();
  c.beginPath();
  c.rect(BORDER * UNIT, BORDER * UNIT, area, area);
  c.clip();
  c.drawImage(
    image,
    (dimension - image.width * scale) / 2,
    (dimension - image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
  if (style.photoColor === 'mono') monochrome(c, BORDER * UNIT, BORDER * UNIT, area);
  c.fillStyle = `rgba(255,255,255,${1 - style.photoStrength / 100})`;
  c.fillRect(BORDER * UNIT, BORDER * UNIT, area, area);
  c.restore();
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++) {
      const left = (x + BORDER) * UNIT,
        top = (y + BORDER) * UNIT,
        dark = matrix.dark(x, y);
      c.fillStyle = dark ? '#111111' : '#ffffff';
      if (matrix.functional(x, y)) c.fillRect(left, top, UNIT, UNIT);
      else {
        const core = 12,
          offset = (UNIT - core) / 2;
        c.fillRect(left + offset, top + offset, core, core);
      }
    }
  return canvas;
}

const rendered = new WeakMap();

/** Every frame of a Photo or Art code, cached per frozen snapshot. */
export function pictureFrames(spec) {
  if (!rendered.has(spec)) {
    const work = (async () => {
      if (!spec.style.photo)
        throw new Error(
          spec.style.mode === 'art'
            ? 'Choose a picture in the Style tab.'
            : 'Choose a photo in the Style tab.',
        );
      if (new TextEncoder().encode(spec.payload).length > 300)
        throw new Error('Use a shorter link or message for a picture code (up to 300 bytes).');
      const matrix = encodeMatrix(spec.payload, true);
      const frames = await loadFrames(spec.style.photo);
      const draw = spec.style.mode === 'art' ? artFrame : photoFrame;
      return {
        canvases: frames.map((frame) => draw(matrix, frame.canvas, spec.style)),
        delays: frames.map((frame) => frame.delay),
      };
    })();
    work.catch(() => rendered.delete(spec));
    rendered.set(spec, work);
  }
  return rendered.get(spec);
}

export function canvasSvg(canvas, size = 720, href = canvas.toDataURL('image/png')) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  const raster = document.createElementNS(ns, 'image');
  raster.setAttribute('href', href);
  raster.setAttribute('width', canvas.width);
  raster.setAttribute('height', canvas.height);
  svg.append(raster);
  return svg;
}

export async function photoCode(spec, size = 720) {
  return canvasSvg((await pictureFrames(spec)).canvases[0], size);
}
