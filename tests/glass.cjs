// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.waitForSelector('#taskbarQrer[data-lg-renderer="svg"]');
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('feImage')].filter((e) =>
          e.getAttribute('href')?.startsWith('data:image/png'),
        ).length === 7,
    );
    // Title bar, its 3 buttons, taskbar, Start button and task button: chrome over the wallpaper.
    assert.equal(await page.locator('.lg-host').count(), 7);
    assert.equal(
      await page.locator('.work-area .lg-layer').count(),
      0,
      'Editor and QR stay outside glass surfaces',
    );
    const task = page.locator('#taskbarQrer');
    assert.equal(await task.locator('> .lg-layer').getAttribute('aria-hidden'), 'true');
    assert.equal(
      await task.locator('> .lg-layer').evaluate((e) => getComputedStyle(e).pointerEvents),
      'none',
    );
    await task.focus();
    assert.equal(await task.evaluate((e) => e === document.activeElement), true);
    await page.locator('#startMenu summary').click();
    await page.waitForSelector('.retro-start-popup.lg-host');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.retro-start-popup.lg-host'));
    await page.locator('#aboutBtn').click();
    await page.waitForSelector('#aboutDialog.lg-host');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#aboutDialog.lg-host'));
    // Maps stay stable while idle, and pointer highlights stop under reduced motion.
    const maps = await page
      .locator('feImage')
      .evaluateAll((nodes) => nodes.map((e) => e.getAttribute('href')));
    await page.waitForTimeout(400);
    assert.deepEqual(
      await page
        .locator('feImage')
        .evaluateAll((nodes) => nodes.map((e) => e.getAttribute('href'))),
      maps,
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    const pointer = await task.evaluate((e) => e.style.getPropertyValue('--lg-pointer-x'));
    await task.hover({ position: { x: 15, y: 12 } });
    await page.waitForTimeout(100);
    assert.equal(await task.evaluate((e) => e.style.getPropertyValue('--lg-pointer-x')), pointer);
    await page.mouse.move(640, 300);
    await page.screenshot({ path: path.join(out, 'components-desktop.png') });

    const pixels = async (clip) =>
      sharp(await page.screenshot({ clip }))
        .removeAlpha()
        .raw()
        .toBuffer();
    const bar = await page.locator('.retro-taskbar').boundingBox();
    const strip = { x: 300, y: bar.y + 4, width: 700, height: bar.height - 8 };
    // Glass is visible: the clouds show through the taskbar, unlike the opaque grey bar.
    const clear = await pixels(strip);
    let mean = 0,
      sumSquares = 0;
    for (let i = 0; i < clear.length; i += 3) {
      const value = (clear[i] + clear[i + 1] + clear[i + 2]) / 3;
      mean += value;
      sumSquares += value * value;
    }
    const count = clear.length / 3;
    mean /= count;
    const spread = Math.sqrt(sumSquares / count - mean * mean);
    assert.ok(spread > 6, `Wallpaper detail shows through the taskbar (spread ${spread})`);

    // Title text is readable: white on the lightest point behind it is at least 4.5:1.
    await page.addStyleTag({
      content: '.app-title h1,.retro-caption{color:transparent!important}',
    });
    let darkest = Infinity;
    for (const selector of ['.app-title h1', '.retro-caption']) {
      const box = await page.locator(selector).boundingBox();
      const area = await pixels(box);
      for (let i = 0; i < area.length; i += 3) {
        const [r, g, b] = [area[i], area[i + 1], area[i + 2]].map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        darkest = Math.min(darkest, 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05));
      }
    }
    assert.ok(darkest >= 4.5, `White title text contrast ${darkest.toFixed(2)}:1`);
    await page.addStyleTag({
      content: '.app-title h1,.retro-caption{color:#fff!important}',
    });

    // Prove pixel refraction with a controlled striped backdrop under the real taskbar.
    await page.addStyleTag({
      content:
        '#desktop,#glassCanvas{visibility:hidden!important} body{background:repeating-linear-gradient(45deg,#126158 0 4px,#faf3d5 4px 8px)!important} .lg-sheen{visibility:hidden!important}',
    });
    await page.waitForTimeout(100);
    const refracted = await pixels(strip);
    await page
      .locator('feDisplacementMap')
      .evaluateAll((nodes) => nodes.forEach((e) => e.setAttribute('scale', '0')));
    const flat = await pixels(strip);
    let changed = 0;
    for (let i = 0; i < refracted.length; i += 3)
      if (
        Math.abs(refracted[i] - flat[i]) +
          Math.abs(refracted[i + 1] - flat[i + 1]) +
          Math.abs(refracted[i + 2] - flat[i + 2]) >
        15
      )
        changed++;
    assert.ok(changed > 500, `Refraction bends the taskbar backdrop (${changed} pixels)`);
    await page.reload();
    await page.waitForSelector('#taskbarQrer.lg-host');
    await page.locator('#glassToggle').uncheck();
    await page.waitForFunction(
      () => document.querySelectorAll('.lg-host,feDisplacementMap').length === 0,
    );
    await page.locator('#glassToggle').check();
    await page.waitForSelector('#taskbarQrer.lg-host');
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(
      await page.locator('#startMenu>summary>.lg-layer').isVisible(),
      true,
      'The Start button keeps its glass surface on phones',
    );
    await page.reload();
    await page.waitForSelector('#taskbarQrer.lg-host');
    await page.screenshot({ path: path.join(out, 'components-mobile.png'), fullPage: true });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForSelector('#taskbarQrer.lg-host');
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#taskbarQrer[data-lg-renderer="svg"]');
    await page.waitForFunction(() => !document.getElementById('dlPng').disabled);
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await context.close();
    // Exercise the conservative CSS path used outside Blink without assuming support.
    const fallback = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/156.0',
    });
    await fallback.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => (args[0] === 'filter' ? false : supports(...args));
    });
    const fp = await fallback.newPage();
    await fp.goto(base);
    await fp.waitForSelector('#taskbarQrer[data-lg-renderer="css"]');
    await fp.waitForFunction(() => !document.getElementById('dlPng').disabled);
    await fp.locator('#glassToggle').uncheck();
    await fp.waitForFunction(() => !document.querySelector('.lg-host'));
    await fallback.close();
    console.log(
      `PASS: glass chrome over the wallpaper; visible clouds; title contrast; pixel refraction (${changed} changed taskbar pixels); Start menu/dialogs; keyboard; reduced motion; idle; cleanup; resize; offline; CSS fallback. Artifacts: ${out}`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
