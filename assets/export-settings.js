// Copyright (c) 2026 Lucas Van De Weerd. MIT.
export function exportFilename(value, extension) {
  // Do not derive names from QR content: it may contain private credentials.
  let name = value
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex -- Strip filesystem control characters.
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '-')
    .replace(/\.(png|svg|gif)$/i, '')
    .replace(/^[. ]+|[. ]+$/g, '')
    .trim();
  name = Array.from(name)
    .slice(0, 80)
    .join('')
    .replace(/[. ]+$/g, '');
  if (!name) name = 'qrer';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) name = 'qrer-' + name;
  return name + '.' + extension;
}
export function exportDimensions(style, edge) {
  const height = 720 + (style.frame !== 'none' && style.label.trim() ? 76 : 0);
  return { width: Math.round((720 * edge) / height), height: edge };
}

export function validateExportOptions(type, edge) {
  if (!['png', 'svg', 'gif'].includes(type)) throw new RangeError('Choose PNG, SVG, or GIF.');
  if (![512, 1024, 2048].includes(edge)) throw new RangeError('Choose 512, 1024, or 2048 pixels.');
}
