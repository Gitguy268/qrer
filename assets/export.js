// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { validateExportOptions } from './export-settings.js?v=2.7.0';
import { frameCode, makeCode, renderCode, svgElement } from './qr.js?v=2.7.0';
import { canvasSvg, pictureFrames } from './photo.js?v=2.7.0';
import { writeGif } from './gif.js?v=2.7.0';
let fontPromise;
async function fontStyle() {
  if (!fontPromise)
    fontPromise = fetch(new URL('./fonts/figtree.woff2', import.meta.url))
      .then((response) => {
        if (!response.ok) throw new Error('The export font could not be loaded.');
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(
                `@font-face{font-family:Figtree;src:url("${reader.result}") format("woff2");font-weight:300 900;}`,
              );
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      )
      .catch((error) => {
        fontPromise = null;
        throw error;
      });
  return fontPromise;
}
async function svgBlob(root, embedFont) {
  if (embedFont) {
    const style = svgElement('style');
    style.textContent = await fontStyle();
    root.prepend(style);
  }
  return new Blob([new XMLSerializer().serializeToString(root)], {
    type: 'image/svg+xml',
  });
}
async function rasterCanvas(blob, width, height) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function rasterize(blob, width, height) {
  const canvas = await rasterCanvas(blob, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image export failed.'))),
      'image/png',
    ),
  );
}
// GIFs are capped at 1024 px: every frame is a full image.
export const GIF_EDGE = 1024;
async function exportGif(spec, edge) {
  const { canvases, delays } = await pictureFrames(spec);
  const embedFont = spec.style.frame !== 'none' && !!spec.style.label.trim();
  const frames = [];
  for (const canvas of canvases) {
    const root = frameCode(canvasSvg(canvas), spec.style, Math.min(edge, GIF_EDGE));
    frames.push(
      await rasterCanvas(
        await svgBlob(root, embedFont),
        Number(root.getAttribute('width')),
        Number(root.getAttribute('height')),
      ),
    );
  }
  return writeGif(frames, delays, [spec.style.ink, spec.style.eye, spec.style.paper, '#111111']);
}
export async function exportCode(spec, type, edge) {
  validateExportOptions(type, edge);
  if (type === 'gif') return exportGif(spec, edge);
  const root = await renderCode(spec, edge);
  const blob = await svgBlob(root, spec.style.frame !== 'none' && !!spec.style.label.trim());
  return type === 'svg'
    ? blob
    : rasterize(blob, Number(root.getAttribute('width')), Number(root.getAttribute('height')));
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function shareCard(spec, caption) {
  const code = await makeCode(spec);
  const png = await rasterize(await svgBlob(code, false), 840, 840);
  const url = URL.createObjectURL(png);
  try {
    await document.fonts.load('600 48px Figtree');
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    const c = canvas.getContext('2d');
    c.fillStyle = '#e4e6e7';
    c.fillRect(0, 0, 1080, 1440);
    const metal = c.createLinearGradient(0, 0, 1080, 1080);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.5, '#e4e6e8');
    metal.addColorStop(1, '#b7bdc1');
    c.fillStyle = metal;
    c.fillRect(35, 35, 1010, 1370);
    c.strokeStyle = '#9da4a8';
    c.lineWidth = 2;
    c.strokeRect(35, 35, 1010, 1370);
    c.fillStyle = '#cbd4b9';
    c.fillRect(90, 110, 900, 930);
    c.strokeStyle = '#646b61';
    c.lineWidth = 8;
    c.strokeRect(90, 110, 900, 930);
    c.drawImage(image, 120, 155, 840, 840);
    c.fillStyle = '#303731';
    c.textAlign = 'center';
    c.font = '600 52px Figtree, sans-serif';
    const text = caption.trim().slice(0, 80);
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (c.measureText(candidate).width > 860 && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    for (const [index, text] of lines.slice(0, 2).entries())
      c.fillText(text, 540, 1140 + index * 66, 860);
    c.font = '600 30px Figtree, sans-serif';
    c.fillStyle = '#62686d';
    c.fillText('qrer', 540, 1330);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Share card export failed.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
