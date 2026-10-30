// Copyright (c) 2026 Lucas Van De Weerd. MIT.
export const presets = {
  classic: {
    name: 'Classic',
    modules: 'square',
    corners: 'square',
    eyes: 'square',
    ink: '#252d32',
    eye: '#252d32',
    paper: '#f8faef',
  },
  studio: {
    name: 'Studio',
    modules: 'rounded',
    corners: 'extra-rounded',
    eyes: 'dot',
    ink: '#183e35',
    eye: '#087367',
    paper: '#ffffff',
  },
  liquid: {
    name: 'LiquidFrame',
    modules: 'rounded',
    corners: 'extra-rounded',
    eyes: 'dot',
    ink: '#163c67',
    eye: '#0a5bb5',
    paper: '#ffffff',
  },
  glass: {
    name: 'GlassPaint',
    modules: 'dots',
    corners: 'extra-rounded',
    eyes: 'dot',
    ink: '#342451',
    eye: '#55348a',
    paper: '#faf8ff',
  },
  win97: {
    name: 'Win98',
    modules: 'square',
    corners: 'square',
    eyes: 'square',
    ink: '#000080',
    eye: '#000080',
    paper: '#ffffff',
  },
  ink: {
    name: 'Ink',
    modules: 'square',
    corners: 'square',
    eyes: 'square',
    ink: '#000000',
    eye: '#000000',
    paper: '#ffffff',
  },
};
export function initialStyle() {
  return {
    ...presets.classic,
    preset: 'classic',
    mode: 'clean',
    photo: null,
    photoStrength: 45,
    photoColor: 'color',
    artRender: 'dither',
    artDot: 'square',
    artContrast: 0,
    artBrightness: 0,
    frame: 'none',
    label: 'SCAN ME',
    logo: null,
    logoShape: 'rounded',
    logoScale: 28,
    logoPadding: 6,
    logoBacking: false,
    logoClear: true,
  };
}
export function snapshot(payload, style) {
  return Object.freeze({ payload, style: Object.freeze({ ...style }) });
}
export function contrast(style) {
  function light(hex) {
    const channels = hex.match(/[a-f\d]{2}/gi).map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const background = light(style.paper),
    foreground = Math.max(light(style.ink), light(style.eye));
  return background > foreground && (background + 0.05) / (foreground + 0.05) >= 4.5;
}
