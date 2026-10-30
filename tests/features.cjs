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
const launch = (extra) =>
  chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-unsafe-swiftshader', ...extra],
  });
async function decoded(file, expected) {
  const metadata = await sharp(file).metadata();
  let actual;
  for (const width of [metadata.width, 512, 400, 320]) {
    const { data, info } = await sharp(file)
      .resize({ width })
      .flatten({ background: '#fff' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    actual = jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
    if (actual) break;
  }
  assert.equal(actual, expected, path.basename(file) + ' scan');
  return metadata;
}
async function videoFixture(png, target) {
  const width = 640,
    height = 480;
  const { data } = await sharp(png)
    .resize(320, 320)
    .extend({ top: 80, bottom: 80, left: 160, right: 160, background: '#fff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const y = Buffer.alloc(width * height),
    u = Buffer.alloc((width * height) / 4),
    v = Buffer.alloc((width * height) / 4);
  const clip = (n) => Math.max(0, Math.min(255, Math.round(n)));
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 3;
      y[row * width + col] = clip(16 + 0.257 * data[i] + 0.504 * data[i + 1] + 0.098 * data[i + 2]);
    }
  for (let row = 0; row < height; row += 2)
    for (let col = 0; col < width; col += 2) {
      let r = 0,
        g = 0,
        b = 0;
      for (const dy of [0, 1])
        for (const dx of [0, 1]) {
          const i = ((row + dy) * width + col + dx) * 3;
          r += data[i] / 4;
          g += data[i + 1] / 4;
          b += data[i + 2] / 4;
        }
      const i = (row / 2) * (width / 2) + col / 2;
      u[i] = clip(128 - 0.148 * r - 0.291 * g + 0.439 * b);
      v[i] = clip(128 + 0.439 * r - 0.368 * g - 0.071 * b);
    }
  await fs.writeFile(
    target,
    Buffer.concat([
      Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`),
      ...Array.from({ length: 20 }, () => Buffer.concat([Buffer.from('FRAME\n'), y, u, v])),
    ]),
  );
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await launch([]);
  const errors = [],
    external = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      acceptDownloads: true,
    });
    await context.addInitScript(() => {
      delete window.BarcodeDetector;
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        !request.url().startsWith(new URL(base).origin) &&
        !request.url().startsWith('data:') &&
        !request.url().startsWith('blob:')
      )
        external.push(request.url());
    });
    const ready = () =>
      page.waitForFunction(
        () =>
          document.getElementById('qr').dataset.state === 'ready' &&
          !document.getElementById('dlPng').disabled,
      );
    const settled = () =>
      page.waitForFunction(() => document.getElementById('qr').dataset.loading === 'false');
    async function save(id, name) {
      const promise = page.waitForEvent('download');
      await page.locator('#' + id).click();
      await (await promise).saveAs(path.join(out, name));
      await ready();
      return path.join(out, name);
    }
    async function scan(file, expected) {
      await page.locator('#scanFile').setInputFiles(file);
      await page.waitForFunction(() => !document.getElementById('scanUse').disabled);
      assert.equal(await page.locator('#scanResult').inputValue(), expected);
    }
    await page.goto(base);
    await ready();
    await page.locator('#data').fill('https://example.org/read');
    await ready();
    const clean = await save('dlPng', 'clean-scan.png');
    await decoded(clean, 'https://example.org/read');
    await page.locator('#verifyBtn').click();
    await page.waitForFunction(
      () => document.getElementById('appStatus').textContent === 'Scan check passed',
    );
    await page.locator('#scanBtn').click();
    assert.equal(
      await page.locator('#scanFileBtn').evaluate((el) => el === document.activeElement),
      true,
    );
    const url = page.url();
    await scan(clean, 'https://example.org/read');
    assert.equal(page.url(), url);
    await page.locator('#scanUse').click();
    await ready();
    assert.equal(await page.locator('#contentType').inputValue(), 'url');
    assert.equal(await page.locator('#data').inputValue(), 'https://example.org/read');
    await page.locator('#scanBtn').click();
    await page.locator('#scanFile').setInputFiles({
      name: 'blank.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="white"/></svg>',
      ),
    });
    await page.waitForFunction(() =>
      document.getElementById('scanStatus').textContent.startsWith('No readable QR'),
    );
    assert.equal(await page.locator('#scanUse').isDisabled(), true);
    await page.keyboard.press('Escape');
    const hostile = '<img src=x onerror=alert(1)>';
    await page.locator('#contentType').selectOption('text');
    await page.locator('#data').fill(hostile);
    await ready();
    const text = await save('dlPng', 'literal-text.png');
    await page.locator('#scanBtn').click();
    await scan(text, hostile);
    assert.equal(await page.locator('#scanResultBox img').count(), 0);
    await page.locator('#scanUse').click();
    await ready();
    assert.equal(await page.locator('#contentType').inputValue(), 'text');
    assert.equal(await page.locator('#data').inputValue(), hostile);
    await page.locator('#data').fill('https://example.org/photo');
    await ready();
    await page.locator('#tab-style').click();
    await page.locator('#codeLook').selectOption('photo');
    await settled();
    assert.equal(await page.locator('#dlPng').isDisabled(), true);
    assert.match(await page.locator('#qr').innerText(), /Choose a photo/);
    const photo = {
      name: 'landscape.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#78c3df"/><circle cx="440" cy="130" r="80" fill="#ffb343"/><path d="M0 600V360L180 220 400 470 600 290V600" fill="#246b5b"/><path d="M0 600L300 350 600 500V600" fill="#58a66b"/></svg>',
      ),
    };
    await page.locator('#photoFile').setInputFiles(photo);
    await ready();
    assert.match(await page.locator('#quality').textContent(), /Photo code checked/);
    for (const size of ['512', '1024', '2048']) {
      await page.locator('#exportSize').selectOption(size);
      const file = await save('dlPng', 'photo-' + size + '.png');
      const metadata = await decoded(file, 'https://example.org/photo');
      assert.equal(metadata.width, Number(size));
      assert.equal(metadata.height, Number(size));
    }
    const svg = await fs.readFile(await save('dlSvg', 'photo.svg'), 'utf8');
    assert.match(svg, /data:image\/png;base64/);
    assert.doesNotMatch(svg, /href="https?:/);
    for (const strength of [20, 75]) {
      await page.locator('#photoStrength').fill(String(strength));
      await ready();
      await page.locator('#verifyBtn').click();
      await page.waitForFunction(
        () => document.getElementById('appStatus').textContent === 'Scan check passed',
      );
    }
    await page.screenshot({ path: path.join(out, 'photo-desktop.png') });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.locator('#scanBtn').click();
      assert.equal(
        await page.evaluate(
          () => document.getElementById('scanDialog').getBoundingClientRect().width <= innerWidth,
        ),
        true,
      );
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('#tab-content').click();
    await page.locator('#data').fill('x'.repeat(301));
    await settled();
    assert.equal(await page.locator('#dlPng').isDisabled(), true);
    assert.match(await page.locator('#qr').innerText(), /300 bytes/);
    await page.locator('#data').fill('https://example.org/photo');
    await ready();
    await page.locator('#tab-style').click();
    await page.locator('#resetStyle').click();
    await ready();
    assert.equal(await page.locator('#photoThumb').getAttribute('src'), null);
    await page.locator('#toolsMenu summary').click();
    await page.locator('[data-action="appearance"]').click();
    await page.locator('#displayWallpaper').selectOption('teal');
    await page.locator('#displayGlass').uncheck();
    await page.locator('#displayApply').click();
    assert.equal(await page.locator('html').getAttribute('data-wallpaper'), 'teal');
    assert.equal(await page.locator('#glassToggle').isChecked(), false);
    await page.screenshot({ path: path.join(out, 'win97-menu.png') });
    const response = await context.request.get(base + 'missing/deep/page');
    assert.equal(response.status(), 404);
    const notfound = await response.text();
    assert.match(notfound, /Page not found/);
    assert.match(notfound, new RegExp('href="' + new URL(base).pathname + '" id="homeLink"'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ready();
    await context.setOffline(true);
    await page.reload();
    await ready();
    await page.locator('#scanBtn').click();
    await scan(clean, 'https://example.org/read');
    await page.keyboard.press('Escape');
    await page.goto(base + 'offline-missing');
    assert.match(await page.title(), /not found/);
    await page.locator('#homeLink').click();
    await ready();
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await videoFixture(clean, path.join(out, 'camera.y4m'));
    await context.close();
  } finally {
    await browser.close();
  }
  // A synthetic QR video exercises camera decoding without accessing real hardware.
  const cameraBrowser = await launch([
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--use-file-for-fake-video-capture=' + path.join(out, 'camera.y4m'),
  ]);
  try {
    const page = await cameraBrowser.newPage();
    await page.goto(base);
    await page.locator('#scanBtn').click();
    await page.locator('#cameraStart').click();
    await page.waitForFunction(
      () => document.getElementById('scanResult').value === 'https://example.org/read',
      { timeout: 15000 },
    );
    assert.equal(
      await page.locator('#scanVideo').evaluate((video) => video.srcObject === null),
      true,
      'A successful scan stops camera tracks',
    );
    await page.evaluate(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      window.cameraTracks = [];
      navigator.mediaDevices.getUserMedia = async (...args) => {
        const stream = await original(...args);
        window.cameraTracks.push(...stream.getTracks());
        await new Promise((resolve) => setTimeout(resolve, 350));
        return stream;
      };
    });
    await page.locator('#cameraStart').click();
    await page.locator('#scanClose').click();
    await page.waitForFunction(
      () =>
        window.cameraTracks.length > 0 &&
        window.cameraTracks.every((track) => track.readyState === 'ended'),
    );
    await page.locator('#scanBtn').click();
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      };
    });
    await page.locator('#cameraStart').click();
    await page.waitForFunction(() =>
      document.getElementById('scanStatus').textContent.startsWith('The camera could not start'),
    );
    assert.equal(await page.locator('#cameraStart').isDisabled(), false);
    await page.keyboard.press('Escape');
  } finally {
    await cameraBrowser.close();
  }
  console.log(
    'PASS: Nayuki Clean codes, scan-check action, Nimiq worker/image import, literal text safety, photo PNG/SVG/strength/limits, mobile controls, display properties, real HTTP/offline 404, offline worker scanning, synthetic camera QR decoding, track cleanup and denied-camera recovery.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
