// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const jsQR = require(process.env.JSQR_MODULE || 'jsqr');
const base = process.env.QRER_URL || 'http://127.0.0.1:4317/';
const out = process.env.QRER_TEST_OUTPUT || '/tmp/qrer-tests';
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const ready = () =>
      page.waitForFunction(
        () =>
          document.getElementById('qr').dataset.state === 'ready' &&
          !document.getElementById('dlPng').disabled,
      );
    await page.goto(base);
    await ready();
    await page.locator('#tab-style').click();
    const undo = page.locator('#panel-style [data-history=undo]'),
      redo = page.locator('#panel-style [data-history=redo]');
    assert.equal(await undo.isDisabled(), true);
    await page.locator('[data-preset=studio]').click();
    await ready();
    await undo.click();
    await ready();
    assert.equal(await page.locator('#codeLook').inputValue(), 'clean');
    await redo.click();
    await ready();
    assert.equal(await page.locator('#modules').inputValue(), 'rounded');
    await page.locator('#resetStyle').click();
    await ready();
    await undo.click();
    await ready();
    assert.equal(await page.locator('#modules').inputValue(), 'rounded', 'Reset is reversible');
    await page.locator('#frame').selectOption('caption');
    await ready();
    await page.locator('#frameLabel').fill('SCAN');
    await page.locator('#frameLabel').fill('SCAN HERE');
    await ready();
    await undo.click();
    await ready();
    assert.equal(
      await page.locator('#frameLabel').inputValue(),
      'SCAN ME',
      'Typing is one undo group',
    );
    await redo.click();
    await ready();
    assert.equal(await page.locator('#frameLabel').inputValue(), 'SCAN HERE');
    await undo.focus();
    await page.keyboard.press('Control+z');
    await ready();
    assert.equal(await page.locator('#frameLabel').inputValue(), 'SCAN ME');
    await page.keyboard.press('Control+Shift+z');
    await ready();
    assert.equal(await page.locator('#frameLabel').inputValue(), 'SCAN HERE');
    await page.locator('#tab-content').click();
    await page.locator('#contentType').selectOption('text');
    const payload = '  Hello, 世界 👋\nKeep these spaces.  \n';
    await page.locator('#data').fill(payload);
    await ready();
    await page.locator('#exportName').fill('../Guest: code.svg');
    await page.locator('#exportSize').selectOption('512');
    assert.equal(await page.locator('#exportDimensions').textContent(), '463 × 512 px');
    const pending = page.waitForEvent('download');
    await page.locator('#dlPng').click();
    const file = await pending;
    assert.equal(file.suggestedFilename(), '-Guest- code.png');
    const target = path.join(out, 'editing-whitespace.png');
    await file.saveAs(target);
    await ready();
    const { data, info } = await sharp(target)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 463);
    assert.equal(info.height, 512);
    assert.equal(
      jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
      payload,
      'Independent decoder preserves whitespace and Unicode',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#copyBtn').click();
    await page.waitForFunction(() =>
      document.getElementById('appStatus').textContent.startsWith('Copied PNG'),
    );
    const copied = await page.evaluate(async () => {
      const item = (await navigator.clipboard.read())[0];
      const blob = await item.getType('image/png');
      const image = await createImageBitmap(blob);
      const dimensions = [image.width, image.height];
      image.close();
      return dimensions;
    });
    assert.deepEqual(copied, [463, 512], 'Copy honors selected size and frame');
    await page.locator('#tab-style').click();
    await undo.click();
    await ready();
    await page.locator('[data-preset=ink]').click();
    await ready();
    assert.equal(await redo.isDisabled(), true, 'New edit clears redo branch');
    await page.screenshot({ path: path.join(out, 'editing-desktop.png') });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.screenshot({ path: path.join(out, 'editing-mobile.png'), fullPage: true });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ready();
    await context.setOffline(true);
    await page.reload();
    await ready();
    assert.equal(await page.locator('#exportName').inputValue(), 'qrer');
    await page.locator('#tab-style').click();
    assert.equal(await undo.isDisabled(), true, 'History clears on reload');
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).sort()), [
      'qrer-glass',
      'qrer-ui-version',
      'qrer-wallpaper',
    ]);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: style undo/redo/reset/grouping/keyboard/branching, Unicode whitespace independently decoded, safe custom filename, exact frame dimensions, clipboard selected size, 320px layout, offline reload and memory-only history.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
