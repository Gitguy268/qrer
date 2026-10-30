// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import qrcodegen from './vendor/nayuki/qrcodegen.js?v=2.7.0';
export function encodeMatrix(payload, high = false) {
  const code = qrcodegen.QrCode.encodeText(
    payload,
    high ? qrcodegen.QrCode.Ecc.HIGH : qrcodegen.QrCode.Ecc.QUARTILE,
  );
  return {
    size: code.size,
    version: code.version,
    mask: code.mask,
    dark: (x, y) => code.getModule(x, y),
    functional: (x, y) => code.isFunction[y][x],
  };
}
export function matrixSvg(matrix, style, size = 720) {
  const ns = 'http://www.w3.org/2000/svg';
  const edge = matrix.size + 8;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('viewBox', `0 0 ${edge} ${edge}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('width', edge);
  background.setAttribute('height', edge);
  background.setAttribute('fill', style.paper);
  svg.append(background);
  const paths = ['', ''];
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.dark(x, y)) continue;
      const eye =
        (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
        (x >= matrix.size - 5 && x <= matrix.size - 3 && y >= 2 && y <= 4) ||
        (x >= 2 && x <= 4 && y >= matrix.size - 5 && y <= matrix.size - 3);
      paths[eye ? 1 : 0] += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
  paths.forEach((data, index) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', data);
    path.setAttribute('fill', index ? style.eye : style.ink);
    svg.append(path);
  });
  return svg;
}
