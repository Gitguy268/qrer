// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
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
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [],
      external = [],
      badResponses = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        !request.url().startsWith(new URL(base).origin) &&
        !request.url().startsWith('data:') &&
        !request.url().startsWith('blob:')
      )
        external.push(request.url());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push(response.url());
    });
    const state = () => page.locator('html').getAttribute('data-glass-state');
    const settled = () =>
      page.waitForFunction(() => document.getElementById('qr').dataset.loading === 'false');
    async function tab(name) {
      await page.locator('#tab-' + name).click();
    }
    async function ready() {
      await page.waitForFunction(
        () =>
          document.getElementById('qr').dataset.state === 'ready' &&
          !document.getElementById('dlPng').disabled,
      );
    }
    async function save(button, filename) {
      const promise = page.waitForEvent('download');
      await page.locator(button).click();
      const file = await promise;
      assert.match(file.suggestedFilename(), /^qrer/);
      await file.saveAs(path.join(out, filename));
      await page.waitForFunction(() => !document.getElementById('dlPng').disabled);
      return path.join(out, filename);
    }
    await page.goto(base);
    await ready();
    await page.waitForFunction(() =>
      ['active', 'fallback'].includes(document.documentElement.dataset.glassState),
    );
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'win97');
    assert.equal(await page.locator('html').getAttribute('data-wallpaper'), 'clouds');
    assert.equal(await page.locator('#glassToggle').isChecked(), true);
    assert.equal(await state(), 'active', 'Real WebGL2 glass renderer initializes');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
      true,
      'Main workflow fits 1280 × 800',
    );
    assert.equal(await page.locator('#shareDialog').isVisible(), false);
    for (const glass of [true, false]) {
      await page.locator('#glassToggle').setChecked(glass);
      await page.waitForFunction(
        (value) => document.documentElement.dataset.glassState === value,
        glass ? 'active' : 'off',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({
        path: path.join(out, `win98-${glass ? 'glass' : 'opaque'}-desktop.png`),
      });
    }
    // Every QR style preset exports a code that decodes (checked in decode.cjs).
    for (const preset of ['classic', 'studio', 'liquid', 'glass', 'win97']) {
      await tab('style');
      await page.locator(`[data-preset=${preset}]`).click();
      await ready();
      await save('#dlPng', preset + '.png');
    }
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const enabled of [true, false]) {
        await page.locator('#glassToggle').setChecked(enabled);
        await page.waitForFunction(
          (value) => document.documentElement.dataset.glassState === value,
          enabled ? 'active' : 'off',
        );
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        assert.equal(
          await page.evaluate(() => {
            const box = document.getElementById('glassToggle').getBoundingClientRect();
            return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.id;
          }),
          'glassToggle',
          'Glass switch stays reachable above the phone taskbar',
        );
        for (const panel of ['content', 'style', 'logo']) {
          await tab(panel);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
            `${panel}/${width}/${enabled} overflow`,
          );
        }
        if (width === 390 && enabled) {
          await tab('content');
          await page.screenshot({ path: path.join(out, 'win98-mobile.png'), fullPage: true });
        }
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('#glassToggle').check();
    await page.reload();
    await ready();
    assert.equal(await page.locator('#glassToggle').isChecked(), true);
    // Idle rendering stops, including pointer changes under reduced motion.
    await page.waitForTimeout(300);
    const frames = await page.locator('#glassCanvas').getAttribute('data-frames');
    await page.waitForTimeout(350);
    assert.equal(
      await page.locator('#glassCanvas').getAttribute('data-frames'),
      frames,
      'No idle animation loop',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(250);
    const reducedFrames = await page.locator('#glassCanvas').getAttribute('data-frames');
    await page.locator('.titlebar').hover();
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator('#glassCanvas').getAttribute('data-frames'),
      reducedFrames,
      'Reduced motion ignores pointer glare',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Context loss stays usable and restoration reinitializes the renderer.
    await page.evaluate(() => {
      const gl = document.getElementById('glassCanvas').getContext('webgl2');
      window.testLoss = gl.getExtension('WEBGL_lose_context');
      window.testLoss.loseContext();
    });
    await page.waitForFunction(() => document.documentElement.dataset.glassState === 'fallback');
    await ready();
    await page.evaluate(() => window.testLoss.restoreContext());
    await page.waitForFunction(() => document.documentElement.dataset.glassState === 'active');
    await tab('content');
    await page.locator('#data').fill('example.org/hello?q=world');
    await ready();
    assert.equal(await page.locator('#documentName').textContent(), 'Link QR');
    await save('#dlPng', 'link.png');
    await page.locator('#data').fill('javascript:alert(1)');
    await settled();
    assert.equal(await page.locator('#dlPng').isDisabled(), true);
    await page.locator('#clearContent').click();
    await settled();
    assert.equal(await page.locator('#dlSvg').isDisabled(), true);
    await page.locator('#contentType').selectOption('wifi');
    await page.locator('#wifiName').fill('Qrer;Studio:Guest');
    await page.locator('#wifiPassword').fill('hello;world:42');
    await ready();
    await save('#dlPng', 'wifi.png');
    await page.locator('#wifiSecurity').selectOption('nopass');
    await ready();
    assert.equal(await page.locator('#wifiPassword').isDisabled(), true);
    await save('#dlSvg', 'wifi-open.svg');
    await page.locator('#contentType').selectOption('email');
    await page.locator('#emailAddress').fill('hello@example.com');
    await page.locator('#emailSubject').fill('Hello & welcome');
    await page.locator('#emailBody').fill('A message from Qrer.');
    await ready();
    await save('#dlPng', 'email.png');
    await page.locator('#contentType').selectOption('text');
    await page.locator('#data').fill('Hello, 世界 👋 — café');
    await ready();
    await save('#dlPng', 'unicode.png');
    await page.locator('#data').fill('x'.repeat(5000));
    await settled();
    assert.equal(await page.locator('#dlPng').isDisabled(), true);
    assert.match(await page.locator('#qr').innerText(), /will not fit/);
    await page.locator('#data').fill('Qrer export check');
    await ready();
    await tab('style');
    await page.locator('#frame').selectOption('card');
    await page.locator('#frameLabel').fill('HELLO QRER');
    await ready();
    const svg = await fs.readFile(await save('#dlSvg', 'framed.svg'), 'utf8');
    assert.match(svg, /HELLO QRER/);
    assert.match(svg, /height="1024"/);
    assert.match(svg, /@font-face/);
    for (const size of ['512', '1024', '2048']) {
      await page.locator('#exportSize').selectOption(size);
      await save('#dlPng', 'frame-' + size + '.png');
    }
    for (const [frame, label] of [
      ['caption', 'Caption'],
      ['tag', 'Outline'],
    ]) {
      await page.locator('#frame').selectOption(frame);
      await page.locator('#frameLabel').fill(label);
      await ready();
      await save('#dlPng', frame + '.png');
    }
    await page.locator('#inkHex').fill('#ffffff');
    await ready();
    assert.match(await page.locator('#quality').textContent(), /Low contrast/);
    await page.locator('#resetStyle').click();
    await ready();
    // Accessible editor tabs use arrow keys without moving into hidden panels.
    await page.locator('#tab-content').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-style').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-logo').getAttribute('aria-selected'), 'true');
    const image = {
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#354d3f"/><circle cx="40" cy="40" r="20" fill="white"/></svg>',
      ),
    };
    await page.locator('#logoFile').setInputFiles(image);
    await page.waitForFunction(() => !document.getElementById('logoClear').disabled);
    await ready();
    await page.locator('#logoShape').selectOption('circle');
    await page.locator('#logoBacking').check();
    await ready();
    await save('#dlPng', 'logo.png');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#copyBtn').click();
    await page.waitForFunction(() =>
      document.getElementById('appStatus').textContent.startsWith('Copied PNG'),
    );
    assert.equal(
      await page.evaluate(async () => {
        const items = await navigator.clipboard.read();
        return items.some((item) => item.types.includes('image/png'));
      }),
      true,
    );
    await page.locator('#shareBtn').click();
    await page.waitForFunction(() => !document.getElementById('storySave').disabled);
    assert.equal(
      await page.locator('#shareClose').evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(
      await page.locator('#storyShare').evaluate((el) => el === document.activeElement),
      true,
    );
    await page.locator('#storyCaption').fill('Made with Qrer');
    await page.waitForFunction(() => !document.getElementById('storySave').disabled);
    await save('#storySave', 'story.png');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#shareDialog').isVisible(), false);
    assert.equal(
      await page.locator('#shareBtn').evaluate((el) => el === document.activeElement),
      true,
    );
    await page.locator('#aboutBtn').click();
    assert.match(
      await page.locator('#aboutDialog').innerText(),
      /Copyright © 2026 Lucas Van De Weerd/,
    );
    await page.keyboard.press('Escape');
    await page.locator('#logoClear').click();
    await tab('content');
    await page.locator('#data').fill('Private session content');
    await ready();
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).sort()), [
      'qrer-glass',
      'qrer-ui-version',
      'qrer-wallpaper',
    ]);
    await page.reload();
    await ready();
    assert.equal(await page.locator('#data').inputValue(), 'https://example.com');
    assert.equal(await page.locator('#logoThumb').getAttribute('src'), null);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ready();
    await context.setOffline(true);
    await page.reload();
    await ready();
    await page.waitForFunction(() => document.documentElement.dataset.glassState === 'active');
    await save('#dlPng', 'offline.png');
    await context.setOffline(false);
    await page.locator('#glassToggle').uncheck();
    assert.equal(
      await page.locator('#glassCanvas').evaluate((canvas) => canvas.width),
      1,
      'Disabling glass releases render targets',
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(badResponses, []);
    // Unsupported hardware and failures use opaque controls without affecting QR output.
    for (const failure of ['context', 'extension', 'shader']) {
      const fallback = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await fallback.addInitScript((mode) => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type === 'webgl2' && mode === 'context') return null;
          const gl = original.call(this, type, ...args);
          if (type === 'webgl2' && gl) {
            if (mode === 'extension') {
              const get = gl.getExtension.bind(gl);
              gl.getExtension = (name) => (name === 'EXT_color_buffer_float' ? null : get(name));
            }
            if (mode === 'shader')
              gl.compileShader = () => {
                throw new Error('Simulated shader initialization failure');
              };
          }
          return gl;
        };
      }, failure);
      const testPage = await fallback.newPage();
      await testPage.goto(base);
      await testPage.waitForFunction(() => document.getElementById('qr').dataset.state === 'ready');
      await testPage.waitForTimeout(400);
      assert.equal(await testPage.locator('html').getAttribute('data-glass-state'), 'fallback');
      assert.equal(await testPage.locator('#dlPng').isDisabled(), false);
      await fallback.close();
    }
    await context.close();
    console.log(
      'PASS: Win98 × glass on/off; desktop fit; mobile panels; idle/reduced-motion; context loss/restoration; missing WebGL/extension/shader fallback; all content modes; PNG/SVG/frame/logo/card/clipboard; keyboard/dialogs; content reset; preferences; offline glass and QR export; no external requests or uncaught errors.',
    );
    console.log('Artifacts:', out);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
