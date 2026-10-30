// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Original art QR renderer, inspired by the idea of zidankazi/animated-qr-generator.
// That repository has no licence, so none of its code is used.
const UNIT = 18,
  BORDER = 4,
  SPLIT = 3,
  // The real module colour covers the middle half of each module, over the picture.
  CORE = 9;

/** Darkness (0–1) of a picture sampled on a square grid, covering it like photo.js. */
export function darknessGrid(image, cells, brightness = 0, contrast = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cells;
  const context = canvas.getContext('2d');
  const scale = Math.max(cells / image.width, cells / image.height);
  context.drawImage(
    image,
    (cells - image.width * scale) / 2,
    (cells - image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
  return toDarkness(context.getImageData(0, 0, cells, cells).data, brightness, contrast);
}

export function toDarkness(data, brightness = 0, contrast = 0) {
  const gain = 1 + contrast / 50,
    lift = brightness / 100;
  const grid = new Float32Array(data.length / 4);
  for (let index = 0; index < grid.length; index++) {
    const offset = index * 4,
      alpha = data[offset + 3] / 255;
    const light =
      (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
    // Transparent areas read as paper.
    const value = (1 - alpha * (1 - light) - 0.5) * gain + 0.5 + lift;
    grid[index] = 1 - Math.min(1, Math.max(0, value));
  }
  return grid;
}

/** Floyd–Steinberg error diffusion to a binary grid (1 = mark). */
export function dither(darkness, cells) {
  const error = Float32Array.from(darkness),
    marks = new Uint8Array(darkness.length);
  for (let y = 0; y < cells; y++)
    for (let x = 0; x < cells; x++) {
      const index = y * cells + x,
        mark = error[index] >= 0.5 ? 1 : 0,
        rest = error[index] - mark;
      marks[index] = mark;
      if (x + 1 < cells) error[index + 1] += (rest * 7) / 16;
      if (y + 1 < cells) {
        if (x > 0) error[index + cells - 1] += (rest * 3) / 16;
        error[index + cells] += (rest * 5) / 16;
        if (x + 1 < cells) error[index + cells + 1] += rest / 16;
      }
    }
  return marks;
}

/** mulberry32: the same seed gives the same sequence, so frames don't flicker. */
export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function mark(context, shape, x, y, radius) {
  context.beginPath();
  if (shape === 'circle') context.arc(x, y, radius, 0, Math.PI * 2);
  else if (shape === 'diamond') {
    context.moveTo(x, y - radius);
    context.lineTo(x + radius, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius, y);
  } else context.rect(x - radius, y - radius, radius * 2, radius * 2);
  context.fill();
}

/** Draws one frame. The centre of every module keeps its real colour. */
export function artFrame(matrix, image, style) {
  const cells = matrix.size * SPLIT,
    sub = UNIT / SPLIT,
    dimension = (matrix.size + BORDER * 2) * UNIT;
  const darkness = darknessGrid(image, cells, style.artBrightness, style.artContrast);
  const marks = style.artRender === 'dither' ? dither(darkness, cells) : null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = dimension;
  const c = canvas.getContext('2d');
  c.fillStyle = style.paper;
  c.fillRect(0, 0, dimension, dimension);
  c.fillStyle = c.strokeStyle = style.ink;
  c.lineCap = 'round';
  c.lineWidth = 1.6;
  for (let gy = 0; gy < cells; gy++)
    for (let gx = 0; gx < cells; gx++) {
      const x = Math.floor(gx / SPLIT),
        y = Math.floor(gy / SPLIT);
      if (matrix.functional(x, y) || (gx % SPLIT === 1 && gy % SPLIT === 1)) continue;
      const index = gy * cells + gx,
        tone = darkness[index],
        cx = (gx + BORDER * SPLIT + 0.5) * sub,
        cy = (gy + BORDER * SPLIT + 0.5) * sub;
      if (style.artRender === 'dither') {
        if (marks[index]) c.fillRect(cx - sub / 2, cy - sub / 2, sub, sub);
      } else if (style.artRender === 'strokes') {
        if (tone < 0.15) continue;
        const half = (sub * (0.35 + tone * 0.75)) / 2,
          slope = (gx + gy) % 2 ? 1 : -1;
        c.beginPath();
        c.moveTo(cx - half, cy - half * slope);
        c.lineTo(cx + half, cy + half * slope);
        c.stroke();
      } else if (style.artRender === 'stipple') {
        const random = seeded(index + 1);
        if (random() > tone * 1.2) continue;
        mark(
          c,
          style.artDot,
          cx + (random() - 0.5) * sub * 0.5,
          cy + (random() - 0.5) * sub * 0.5,
          sub * 0.3,
        );
      } else if (tone >= 0.1) mark(c, style.artDot, cx, cy, (sub / 2) * (0.25 + tone * 0.75));
    }
  // Module centres and the structural patterns carry the code.
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++) {
      const dark = matrix.dark(x, y),
        left = (x + BORDER) * UNIT,
        top = (y + BORDER) * UNIT;
      c.fillStyle = dark ? (matrix.functional(x, y) ? style.eye : style.ink) : style.paper;
      if (matrix.functional(x, y)) c.fillRect(left, top, UNIT, UNIT);
      else c.fillRect(left + (UNIT - CORE) / 2, top + (UNIT - CORE) / 2, CORE, CORE);
    }
  return canvas;
}
