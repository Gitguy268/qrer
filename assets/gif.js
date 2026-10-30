// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Picture frames for the Photo and Art looks. GIF reading and writing use the
// vendored omggif (MIT), loaded as a classic script in index.html.
const MAX_FRAMES = 30,
  MAX_EDGE = 512,
  MIN_DELAY = 40;
let cached = { source: null, frames: null };

function scaled(source, width, height) {
  const factor = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * factor));
  canvas.height = Math.max(1, Math.round(height * factor));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function gifBytes(source) {
  const text = atob(source.slice(source.indexOf(',') + 1));
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function gifFrames(bytes) {
  const reader = new window.GifReader(bytes);
  const { width, height } = reader;
  if (width * height > 4096 * 4096) throw new Error('Choose a smaller GIF.');
  const count = reader.numFrames();
  if (!count) throw new Error('This GIF has no frames.');
  // Every frame is composited in order because disposal depends on the previous one.
  // Only evenly spaced frames are kept; skipped frames add their time to the kept one.
  const kept = Math.min(count, MAX_FRAMES);
  const keep = new Set(
    Array.from({ length: kept }, (_, index) => Math.floor((index * count) / kept)),
  );
  const pixels = new Uint8ClampedArray(width * height * 4);
  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = height;
  const context = scratch.getContext('2d');
  const frames = [];
  let previous = null,
    saved = null;
  for (let index = 0; index < count; index++) {
    if (previous?.disposal === 2)
      for (let y = previous.y; y < previous.y + previous.height; y++)
        pixels.fill(0, (y * width + previous.x) * 4, (y * width + previous.x + previous.width) * 4);
    else if (previous?.disposal === 3 && saved) pixels.set(saved);
    const info = reader.frameInfo(index);
    saved = info.disposal === 3 ? pixels.slice() : null;
    reader.decodeAndBlitFrameRGBA(index, pixels);
    const delay = info.delay * 10;
    if (keep.has(index)) {
      context.putImageData(new ImageData(pixels.slice(), width, height), 0, 0);
      frames.push({ canvas: scaled(scratch, width, height), delay });
    } else frames[frames.length - 1].delay += delay;
    previous = info;
  }
  frames.forEach((frame) => (frame.delay = Math.max(MIN_DELAY, frame.delay)));
  return frames;
}

async function stillFrame(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return [{ canvas: scaled(image, image.width, image.height), delay: 0 }];
}

/** Frames of a picture data URL. Only the latest picture is kept in memory. */
export async function loadFrames(source) {
  if (cached.source === source) return cached.frames;
  const frames = source.startsWith('data:image/gif')
    ? gifFrames(gifBytes(source))
    : await stillFrame(source);
  cached = { source, frames };
  return frames;
}

/** Frames of a GIF blob, such as an export, for checking each one. */
export async function blobFrames(blob) {
  return gifFrames(new Uint8Array(await blob.arrayBuffer()));
}

/** Reads a chosen picture. GIFs keep every frame; other images become a PNG. */
export async function readPicture(file, readStill) {
  if (file.type !== 'image/gif') return readStill(file);
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  try {
    await loadFrames(source);
  } catch {
    throw new Error('Choose a readable GIF.');
  }
  return source;
}

function hexColor(hex) {
  return parseInt(hex.slice(1), 16);
}

/** A 256-colour palette: the exact code colours, a 6×6×6 cube, then greys. */
export function gifPalette(exact = []) {
  const palette = [...new Set(exact.map(hexColor))];
  const levels = [0, 0x33, 0x66, 0x99, 0xcc, 0xff];
  for (const r of levels)
    for (const g of levels) for (const b of levels) palette.push((r << 16) | (g << 8) | b);
  for (let step = 1; palette.length < 256; step++) {
    const grey = Math.round((step * 255) / 41);
    palette.push((grey << 16) | (grey << 8) | grey);
  }
  return palette.slice(0, 256);
}

function lookupTable(palette) {
  // 5 bits per channel; nearest colour without dithering keeps modules crisp.
  const table = new Uint8Array(32768);
  for (let key = 0; key < 32768; key++) {
    const r = ((key >> 10) << 3) | 4,
      g = (((key >> 5) & 31) << 3) | 4,
      b = ((key & 31) << 3) | 4;
    let best = 0,
      distance = Infinity;
    palette.forEach((color, index) => {
      const dr = r - (color >> 16),
        dg = g - ((color >> 8) & 255),
        db = b - (color & 255);
      const next = dr * dr * 3 + dg * dg * 4 + db * db * 2;
      if (next < distance) {
        distance = next;
        best = index;
      }
    });
    table[key] = best;
  }
  return table;
}

function shrink(canvas, maxEdge) {
  const factor = maxEdge / Math.max(canvas.width, canvas.height);
  if (factor >= 1) return canvas;
  const small = document.createElement('canvas');
  small.width = Math.round(canvas.width * factor);
  small.height = Math.round(canvas.height * factor);
  const context = small.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(canvas, 0, 0, small.width, small.height);
  return small;
}

/** Writes same-sized canvases as a looping GIF. Delays are in milliseconds. */
export function writeGif(canvases, delays, exact = [], maxEdge = Infinity) {
  canvases = canvases.map((canvas) => shrink(canvas, maxEdge));
  const { width, height } = canvases[0];
  const palette = gifPalette(exact);
  const table = lookupTable(palette);
  const buffer = new Uint8Array(Math.ceil(width * height * canvases.length * 1.6) + 4096);
  const writer = new window.GifWriter(buffer, width, height, { loop: 0, palette });
  const indexed = new Uint8Array(width * height);
  canvases.forEach((canvas, frame) => {
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    for (let pixel = 0, offset = 0; pixel < indexed.length; pixel++, offset += 4)
      indexed[pixel] =
        table[
          ((data[offset] >> 3) << 10) | ((data[offset + 1] >> 3) << 5) | (data[offset + 2] >> 3)
        ];
    writer.addFrame(0, 0, width, height, indexed, {
      delay: Math.max(4, Math.round(delays[frame] / 10)),
    });
  });
  return new Blob([buffer.subarray(0, writer.end())], { type: 'image/gif' });
}
