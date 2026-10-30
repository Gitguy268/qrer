// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { exportDimensions } from './export-settings.js?v=2.7.0';
import { encodeMatrix, matrixSvg } from './matrix.js?v=2.7.0';
import { photoCode } from './photo.js?v=2.7.0';
const ns = 'http://www.w3.org/2000/svg';
export function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(ns, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}
// The vendored encoder accepts byte strings. Use UTF-8 bytes for all content.
function bytes(text) {
  return Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');
}
export async function prepareLogo(style) {
  if (!style.logo) return null;
  const image = new Image();
  image.src = style.logo;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const radius = style.logoShape === 'circle' ? 256 : style.logoShape === 'rounded' ? 80 : 0;
  context.beginPath();
  context.roundRect(0, 0, 512, 512, radius);
  context.clip();
  if (style.logoBacking) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 512, 512);
  }
  const padding = style.logoBacking ? 40 : 0;
  const scale = (512 - padding * 2) / Math.max(image.width, image.height);
  const width = image.width * scale,
    height = image.height * scale;
  context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
  return canvas.toDataURL('image/png');
}
export async function makeCode(spec, size = 720) {
  const s = spec.style;
  if (s.mode === 'photo' || s.mode === 'art') return photoCode(spec, size);
  if (s.mode === 'clean' && !s.logo) return matrixSvg(encodeMatrix(spec.payload), s, size);
  const image = await prepareLogo(s);
  const encoder = new window.QRCodeStyling({
    width: size,
    height: size,
    type: 'svg',
    data: bytes(spec.payload),
    margin: Math.round(size * 0.145),
    qrOptions: { errorCorrectionLevel: image ? 'H' : 'Q' },
    dotsOptions: { type: s.modules, color: s.ink },
    cornersSquareOptions: { type: s.corners, color: s.ink },
    cornersDotOptions: { type: s.eyes, color: s.eye },
    backgroundOptions: { color: s.paper },
    ...(image
      ? {
          image,
          imageOptions: {
            imageSize: s.logoScale / 100,
            margin: (s.logoPadding * size) / 360,
            hideBackgroundDots: s.logoClear,
            crossOrigin: 'anonymous',
          },
        }
      : {}),
  });
  const blob = await encoder.getRawData('svg');
  const svg = new DOMParser().parseFromString(await blob.text(), 'image/svg+xml').documentElement;
  if (svg.tagName === 'parsererror') throw new Error('Could not draw this QR code.');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  return svg;
}
export function frameCode(code, style, edge) {
  const label = style.label.trim();
  const framed = style.frame !== 'none';
  const caption = framed && label ? 76 : 0;
  const dimension = 720;
  const inset = framed ? 24 : 0;
  const height = dimension + caption;
  const width = dimension;
  const output = exportDimensions(style, edge);
  const root = svgElement('svg', {
    xmlns: ns,
    viewBox: `0 0 ${width} ${height}`,
    width: output.width,
    height: output.height,
  });
  const card = style.frame === 'card';
  root.append(
    svgElement('rect', {
      width,
      height,
      fill: card ? style.ink : style.paper,
      rx: card ? 28 : 0,
    }),
  );
  if (style.frame === 'tag')
    root.append(
      svgElement('rect', {
        x: 5,
        y: 5,
        width: width - 10,
        height: height - 10,
        rx: 24,
        fill: 'none',
        stroke: style.ink,
        'stroke-width': 8,
      }),
    );
  code.setAttribute('x', inset);
  code.setAttribute('y', inset);
  code.setAttribute('width', dimension - inset * 2);
  code.setAttribute('height', dimension - inset * 2);
  root.append(code);
  if (caption) {
    const text = svgElement('text', {
      x: width / 2,
      y: dimension + 42,
      'text-anchor': 'middle',
      'font-family': 'Figtree, Arial, sans-serif',
      'font-size': Math.min(32, (610 / Math.max(1, label.length)) * 1.45),
      'font-weight': 700,
      fill: card ? style.paper : style.ink,
    });
    text.textContent = label;
    root.append(text);
  }
  return root;
}
export async function renderCode(spec, edge = 720) {
  return frameCode(await makeCode(spec), spec.style, edge);
}
export async function readLogo(file) {
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = async () => {
      try {
        const image = new Image();
        image.src = reader.result;
        await image.decode();
        const canvas = document.createElement('canvas');
        const factor = Math.min(1, 1024 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * factor));
        canvas.height = Math.max(1, Math.round(image.height * factor));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        reject(new Error('Choose a readable PNG, JPEG, WebP, GIF, or SVG image.'));
      }
    };
    reader.readAsDataURL(file);
  });
}
