// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QRER_URL || 'http://127.0.0.1:4317/';
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.testExports = { paused: false, callbacks: [] };
      const original = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
        original.call(
          this,
          (blob) => {
            if (window.testExports.paused) window.testExports.callbacks.push(() => callback(blob));
            else callback(blob);
          },
          ...args,
        );
      };
    });
    const ready = () =>
      page.waitForFunction(() => document.getElementById('qr').dataset.state === 'ready');
    const pause = () =>
      page.evaluate(() => {
        window.testExports.paused = true;
      });
    const pending = () => page.waitForFunction(() => window.testExports.callbacks.length > 0);
    const release = () =>
      page.evaluate(() => {
        window.testExports.paused = false;
        window.testExports.callbacks.splice(0).forEach((callback) => callback());
      });
    await page.goto(base);
    await ready();
    // Finish an old download only after another draft has rendered.
    await pause();
    const download = page.waitForEvent('download');
    await page.locator('#dlPng').click();
    await pending();
    await page.locator('#data').fill('example.org/new-draft');
    await ready();
    await release();
    await download;
    await page.waitForFunction(() => !document.getElementById('dlPng').disabled);
    assert.equal(
      await page.locator('#appStatus').textContent(),
      'Ready',
      'Old download cannot overwrite the newer preview status',
    );
    // A size change while checking should neither claim success nor stay stuck.
    await pause();
    await page.locator('#verifyBtn').click();
    await pending();
    await page.locator('#exportSize').selectOption('512');
    await release();
    await page.waitForFunction(() => !document.getElementById('verifyBtn').disabled);
    assert.equal(
      await page.locator('#appStatus').textContent(),
      'Size changed. Check this code again.',
    );
    // Closing a card while its image is drawing must not resurrect its URL/UI.
    await pause();
    await page.locator('#shareBtn').click();
    await pending();
    await page.keyboard.press('Escape');
    await release();
    await page.waitForFunction(() => !document.getElementById('shareDialog').open);
    assert.equal(await page.locator('#storyPreview').getAttribute('src'), null);
    await page.locator('#shareBtn').click();
    await page.waitForFunction(() => !document.getElementById('storySave').disabled);
    await page.keyboard.press('Escape');
    // Reject clipboard access before encoding fails: both failures are observed.
    await page.evaluate(() => {
      navigator.clipboard.write = () => Promise.reject(new Error('Denied for test'));
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        setTimeout(() => callback(null), 50);
      };
    });
    await page.locator('#copyBtn').click();
    await page.waitForFunction(() => !document.getElementById('copyBtn').disabled);
    assert.equal(
      await page.locator('#appStatus').textContent(),
      'Clipboard unavailable. Download PNG instead.',
    );
    // An ordered page task waits past the intentionally delayed encoder failure.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    await page.evaluate(() => {
      navigator.clipboard.write = () => {
        throw new Error('Synchronous denial');
      };
    });
    await page.locator('#copyBtn').click();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    assert.equal(await page.locator('#copyBtn').isDisabled(), false);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: stale download status, size-change scan check, cancelled/reopened share card, clipboard denial plus delayed encoding failure without unhandled rejection.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
