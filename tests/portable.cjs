// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Optional actual WebKit verification: npm run test:webkit (install Playwright WebKit).
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const base = process.env.QRER_URL || 'http://127.0.0.1:4317/';
const out = process.env.QRER_TEST_OUTPUT || '/tmp/qrer-tests';
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await webkit.launch({
    headless: true,
    ...(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const ready = () => page.waitForFunction(() => !document.getElementById('dlPng').disabled);
    const optics = async () => {
      try {
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('.lg-local-scene')].length === 7 &&
            // Phones hide Maximize; a hidden control has nothing to filter.
            [...document.querySelectorAll('.lg-local-scene')].every(
              (e) => !e.getClientRects().length || e.style.filter.includes('url('),
            ),
          {},
          { timeout: 10000 },
        );
      } catch (e) {
        console.log(
          await page.evaluate(() => ({
            state: document.documentElement.dataset.glassState,
            visibility: document.visibilityState,
            count: document.querySelectorAll('.lg-local-scene').length,
            scenes: [...document.querySelectorAll('.lg-local-scene')].map((e) => [
              e.parentElement.parentElement.id,
              e.style.filter,
              e.getBoundingClientRect().toJSON(),
            ]),
          })),
        );
        throw e;
      }
    };
    await page.goto(base);
    await ready();
    await optics();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'portable-desktop.png') });
    // The refracted wallpaper copy must not wash out the caption: white text keeps 4.5:1.
    await page.addStyleTag({
      content: '.app-title h1,.retro-caption{color:transparent!important}',
    });
    let darkest = Infinity;
    for (const selector of ['.app-title h1', '.retro-caption']) {
      const area = await sharp(
        await page.screenshot({ clip: await page.locator(selector).boundingBox() }),
      )
        .removeAlpha()
        .raw()
        .toBuffer();
      for (let i = 0; i < area.length; i += 3) {
        const [r, g, b] = [area[i], area[i + 1], area[i + 2]].map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        darkest = Math.min(darkest, 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05));
      }
    }
    assert.ok(darkest >= 4.5, `WebKit title text contrast ${darkest.toFixed(2)}:1`);
    await page.addStyleTag({ content: '.app-title h1,.retro-caption{color:#fff!important}' });
    // A controlled background reveals displacement. Reset filter IDs because
    // WebKit intentionally caches SVG filter output until its reference changes.
    await page.addStyleTag({ content: '.lg-sheen{visibility:hidden!important}' });
    await page.evaluate(() => {
      const desktop = document.getElementById('desktop'),
        c = desktop.getContext('2d');
      for (let x = -desktop.height; x < desktop.width; x += 8) {
        c.fillStyle = (x / 8) % 2 ? '#126158' : '#faf3d5';
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 4, 0);
        c.lineTo(x + 4 + desktop.height, desktop.height);
        c.lineTo(x + desktop.height, desktop.height);
        c.fill();
      }
      // Re-sync the glass copies with the striped wallpaper.
      document.documentElement.dataset.wallpaper = 'clouds';
    });
    await page.waitForTimeout(600);
    const bar = await page.locator('.retro-taskbar').boundingBox();
    const strip = { x: 300, y: bar.y + 4, width: 700, height: bar.height - 8 };
    const a = await sharp(await page.screenshot({ clip: strip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    await page.locator('feDisplacementMap').evaluateAll((nodes) => {
      nodes.forEach((e) => e.setAttribute('scale', '0'));
      for (const scene of document.querySelectorAll('.lg-local-scene')) {
        const match = scene.style.filter.match(/#[^"')]+/);
        if (!match) continue;
        const filter = document.getElementById(match[0].slice(1));
        const id = filter.id + '-zero';
        filter.id = id;
        scene.style.filter = 'url(#' + id + ')';
      }
    });
    const b = await sharp(await page.screenshot({ clip: strip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    let changed = 0;
    for (let i = 0; i < a.length; i += 3)
      if (
        Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) >
        15
      )
        changed++;
    assert.ok(changed > 50, `Portable pixel refraction: ${changed}`);
    await page.reload();
    await ready();
    await optics();
    for (const glass of [false, true]) {
      await page.locator('#glassToggle').setChecked(glass);
      await page.waitForFunction((on) => !!document.querySelector('.lg-local-scene') === on, glass);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
    }
    await optics();
    await page.waitForTimeout(400);
    const filters = await page
      .locator('.lg-local-scene')
      .evaluateAll((nodes) => nodes.map((e) => e.style.filter));
    await page.waitForTimeout(350);
    assert.deepEqual(
      await page
        .locator('.lg-local-scene')
        .evaluateAll((nodes) => nodes.map((e) => e.style.filter)),
      filters,
      'No idle filter updates',
    );
    await page.locator('#dlPng').focus();
    assert.equal(await page.locator('#dlPng').evaluate((e) => e === document.activeElement), true);
    const pending = page.waitForEvent('download');
    await page.locator('#dlPng').click();
    await (await pending).saveAs(path.join(out, 'portable-export.png'));
    await page.locator('#aboutBtn').click();
    await page.waitForSelector('#aboutDialog[data-lg-scene="local"]');
    await page.keyboard.press('Escape');
    await page.locator('#glassToggle').uncheck();
    await page.waitForFunction(
      () => !document.querySelector('.lg-host,.lg-local-scene,feDisplacementMap'),
    );
    await page.locator('#glassToggle').check();
    await optics();
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(400);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.screenshot({ path: path.join(out, 'portable-mobile.png'), fullPage: true });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ready();
    await optics();
    await context.setOffline(true);
    await page.reload();
    await ready();
    await optics();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `PASS: WebKit actual taskbar refraction (${changed} changed pixels), glass on/off, idle, cleanup, dialog, focus, PNG export, 320px layout and offline. Artifacts: ${out}`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
