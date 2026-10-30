// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const jsQR = require(process.env.JSQR_MODULE || 'jsqr');
const base = process.env.QRER_URL || 'http://127.0.0.1:4317/';
const out = path.resolve(process.env.QRER_TEST_OUTPUT || '/tmp/qrer-tests');
const executablePath = process.env.CHROMIUM_PATH;
const root = path.resolve(__dirname, '..');

async function decoded(file, expected, page = 0) {
  const metadata = await sharp(file, { page }).metadata();
  let actual;
  for (const width of [metadata.width, 512, 400, 320]) {
    const { data, info } = await sharp(file, { page })
      .resize({ width })
      .flatten({ background: '#fff' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    actual = jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
    if (actual) break;
  }
  assert.equal(actual, expected, `${path.basename(file)} page ${page} scan`);
  return metadata;
}

// A three-frame GIF made with the vendored omggif, so the fixture needs no binary file.
async function gifFixture() {
  const exports = {};
  new Function(
    'exports',
    await fs.readFile(path.join(root, 'assets/vendor/omggif/omggif.js'), 'utf8'),
  )(exports);
  const size = 120;
  const buffer = Buffer.alloc(size * size * 3 + 4096);
  const writer = new exports.GifWriter(buffer, size, size, {
    loop: 0,
    palette: [0x78c3df, 0xffb343, 0x246b5b, 0xffffff],
  });
  for (const shift of [0, 30, 60]) {
    const pixels = new Uint8Array(size * size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const sun = (x - 30 - shift) ** 2 + (y - 35) ** 2 < 400;
        pixels[y * size + x] = sun ? 1 : y > 80 - x / 4 ? 2 : 0;
      }
    writer.addFrame(0, 0, size, size, pixels, { delay: 20 });
  }
  return buffer.subarray(0, writer.end());
}

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-unsafe-swiftshader'],
  });
  const errors = [],
    external = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (!/^(data|blob):/.test(request.url()) && !request.url().startsWith(new URL(base).origin))
        external.push(request.url());
    });
    const settled = () =>
      page.waitForFunction(() => document.getElementById('qr').dataset.loading === 'false', null, {
        timeout: 60000,
      });
    async function ready(label) {
      await page.waitForFunction(
        () =>
          document.getElementById('qr').dataset.loading === 'false' &&
          ['ready', 'error'].includes(document.getElementById('qr').dataset.state),
        null,
        { timeout: 60000 },
      );
      assert.equal(
        await page.locator('#qr').getAttribute('data-state'),
        'ready',
        `${label}: ${await page.locator('#qr').innerText()}`,
      );
    }
    async function save(id, name) {
      const promise = page.waitForEvent('download', { timeout: 60000 });
      await page.locator('#' + id).click();
      await (await promise).saveAs(path.join(out, name));
      await settled();
      return path.join(out, name);
    }
    await page.goto(base);
    await ready('start');

    // ha.mr: the vendored compressor runs locally and the code uses alphanumeric mode.
    const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef';
    await page.locator('#data').fill(link);
    await ready('plain link');
    const plain = await sharp(await save('dlPng', 'link-plain.png')).metadata();
    assert.equal(plain.width, 1024);
    await page.locator('#shortenLink').check();
    await ready('short link');
    assert.match(await page.locator('#contentCount').textContent(), /QR version \d+ → \d+/);
    const [before, after] = (await page.locator('#contentCount').textContent())
      .match(/(\d+) → (\d+)/)
      .slice(1)
      .map(Number);
    assert.ok(after < before, `ha.mr version ${before} → ${after}`);
    const shortFile = await save('dlPng', 'link-short.png');
    const { decompress } = await import(path.join(root, 'assets/vendor/ha-mr/compress.js'));
    const { outputAlphabetQR } = await import(path.join(root, 'assets/vendor/ha-mr/alphabets.js'));
    const short = jsQR(
      ...(await sharp(shortFile)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => [new Uint8ClampedArray(data), info.width, info.height])),
    ).data;
    assert.match(short, /^HTTPS:\/\/HA\.MR\/[0-9A-Z$*+\-./:]+$/);
    assert.equal(decompress(short.slice(14), outputAlphabetQR), link);
    await page.locator('#contentType').selectOption('text');
    assert.equal(await page.locator('#shortenFields').isHidden(), true);
    await page.locator('#contentType').selectOption('url');
    await page.locator('#shortenLink').uncheck();
    await page.locator('#data').fill('https://example.org/art');
    await ready('art link');

    // Art: every drawing decodes from a still picture.
    await page.locator('#tab-style').click();
    await page.locator('#codeLook').selectOption('art');
    await settled();
    assert.match(await page.locator('#qr').innerText(), /Choose a picture/);
    assert.equal(await page.locator('#artRender').isVisible(), true);
    assert.equal(await page.locator('#photoStrength').isVisible(), false);
    assert.equal(await page.locator('#inkColor').isVisible(), true);
    await page.locator('#photoFile').setInputFiles({
      name: 'landscape.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#78c3df"/><circle cx="440" cy="130" r="80" fill="#ffb343"/><path d="M0 600V360L180 220 400 470 600 290V600" fill="#246b5b"/><path d="M0 600L300 350 600 500V600" fill="#58a66b"/></svg>',
      ),
    });
    for (const drawing of ['dither', 'halftone', 'stipple', 'strokes']) {
      await page.locator('#artRender').selectOption(drawing);
      await ready('art ' + drawing);
      assert.match(await page.locator('#quality').textContent(), /Art code checked/);
      assert.equal(await page.locator('#dlGif').isHidden(), true);
      await decoded(await save('dlPng', `art-${drawing}.png`), 'https://example.org/art');
      await page.screenshot({ path: path.join(out, `screen-art-${drawing}.png`) });
    }
    await page.locator('#artDot').selectOption('circle');
    await page.locator('#artRender').selectOption('halftone');
    await ready('art circle halftone');

    // Animated: a GIF gives a GIF, and every exported frame decodes.
    const gif = { name: 'sun.gif', mimeType: 'image/gif', buffer: await gifFixture() };
    for (const look of ['art', 'photo']) {
      await page.locator('#codeLook').selectOption(look);
      await page.locator('#photoFile').setInputFiles(gif);
      await ready(look + ' gif');
      assert.match(await page.locator('#quality').textContent(), /every frame/);
      assert.equal(await page.locator('#dlGif').isVisible(), true);
      assert.equal(await page.locator('#dlSvg').isHidden(), true);
      assert.match(await page.locator('#qr image').getAttribute('href'), /^blob:/);
      const file = await save('dlGif', `${look}-animated.gif`);
      const metadata = await sharp(file).metadata();
      assert.equal(metadata.format, 'gif');
      assert.equal(metadata.pages, 3);
      for (let frame = 0; frame < 3; frame++) await decoded(file, 'https://example.org/art', frame);
      await decoded(await save('dlPng', `${look}-first-frame.png`), 'https://example.org/art');
      await page.locator('#verifyBtn').click();
      await page.waitForFunction(
        () => document.getElementById('appStatus').textContent === 'Scan check passed',
        null,
        { timeout: 60000 },
      );
      await page.screenshot({ path: path.join(out, `screen-${look}-animated.png`) });
    }
    await page.locator('#photoColor').selectOption('mono');
    await ready('photo black and white');
    await page.locator('#exportSize').selectOption('2048');
    assert.match(await page.locator('#exportDimensions').textContent(), /GIF up to 1024 px/);
    const capped = await sharp(await save('dlGif', 'photo-mono.gif')).metadata();
    assert.equal(capped.width, 1024);

    // Back to a still look: SVG returns and GIF hides.
    await page.locator('#photoRemove').click();
    await page.locator('#codeLook').selectOption('clean');
    await ready('clean again');
    assert.equal(await page.locator('#dlSvg').isVisible(), true);
    assert.equal(await page.locator('#dlGif').isHidden(), true);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator('#codeLook').selectOption('art');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({ path: path.join(out, `art-options-${width}.png`) });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
  } finally {
    await browser.close();
  }
  console.log(
    'PASS: ha.mr short links (local, smaller version, round trip), four Art drawings, animated Art and Photo GIFs with every frame decoded and checked in the app, GIF size cap, black-and-white photo, SVG/GIF switching and mobile width.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
