// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Decode the real exported files with a QR implementation independent of the generator.
const assert = require('node:assert/strict');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const jsQR = require(process.env.JSQR_MODULE || 'jsqr');
const folder = process.env.QRER_TEST_OUTPUT || '/tmp/qrer-tests';
const cases = {
  classic: ['https://example.com', 1024],
  studio: ['https://example.com', 1024],
  liquid: ['https://example.com', 1024],
  glass: ['https://example.com', 1024],
  win97: ['https://example.com', 1024],
  link: ['https://example.org/hello?q=world', 1024],
  unicode: ['Hello, 世界 👋 — café', 1024],
  wifi: ['WIFI:T:WPA;S:Qrer\\;Studio\\:Guest;P:hello\\;world\\:42;H:false;;', 1024],
  email: [
    'mailto:hello@example.com?subject=Hello%20%26%20welcome&body=A%20message%20from%20Qrer.',
    1024,
  ],
  logo: ['Qrer export check', 2048],
  story: ['Qrer export check', 1440],
  'frame-512': ['Qrer export check', 512],
  'frame-1024': ['Qrer export check', 1024],
  'frame-2048': ['Qrer export check', 2048],
  caption: ['Qrer export check', 2048],
  tag: ['Qrer export check', 2048],
  offline: ['https://example.com', 1024],
};
(async () => {
  for (const [name, [expected, edge]] of Object.entries(cases)) {
    const file = path.join(folder, name + '.png');
    const metadata = await sharp(file).metadata();
    assert.equal(Math.max(metadata.width, metadata.height), edge, name + ' output size');
    if (name === 'story') {
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1440);
    }
    let payload;
    // Scan at the original raster size and typical camera sampling sizes.
    for (const width of [metadata.width, 512, 400, 320]) {
      const { data, info } = await sharp(file)
        .resize({ width })
        .flatten({ background: '#fff' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      payload = jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
      if (payload) break;
    }
    assert.equal(payload, expected, name + ' decoded content');
  }
  console.log(
    'PASS: 17 exported images independently decoded with exact content and dimensions, including all presets, Unicode, Wi-Fi, email, logo, every frame style, share card and offline export.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
