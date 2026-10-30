// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const ready = () => page.waitForFunction(() => !document.getElementById('dlPng').disabled);
    async function menu(id, action) {
      await page.locator('#' + id + ' summary').click();
      await page.locator('#' + id + ' [data-retro-action="' + action + '"]').click();
    }
    await page.goto(base);
    await ready();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'win97');
    assert.equal(await page.locator('#appearance').count(), 0, 'Win98 is the only look');
    assert.equal(await page.locator('.retro-taskbar').isVisible(), true);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
      true,
    );
    assert.equal(
      await page
        .locator('.retro-desktop button')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    for (const glass of [false, true]) {
      await page.locator('#glassToggle').setChecked(glass);
      await page.waitForFunction(
        (on) => document.documentElement.dataset.glassState === (on ? 'active' : 'off'),
        glass,
      );
      assert.equal(
        await page.locator('.app-window').evaluate((e) => getComputedStyle(e).borderRadius),
        '0px',
      );
      assert.equal(
        await page.locator('#dlPng').evaluate((e) => getComputedStyle(e).borderRadius),
        '0px',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({
        path: path.join(out, 'win98-' + (glass ? 'glass' : 'opaque') + '.png'),
      });
    }
    await page.locator('#data').fill('Retro draft — stays here');
    await page.locator('#contentType').selectOption('text');
    await page.locator('#data').fill('Retro draft — stays here');
    await ready();
    await page.locator('#windowMinimize').click();
    assert.equal(await page.locator('#appWindow').isVisible(), false);
    await page.locator('#taskbarQrer').click();
    assert.equal(await page.locator('#data').inputValue(), 'Retro draft — stays here');
    await page.locator('#windowMaximize').click();
    assert.equal(await page.locator('#appWindow').getAttribute('data-maximized'), 'true');
    assert.ok((await page.locator('#appWindow').boundingBox()).width > 1200);
    await page.locator('#windowMaximize').click();
    await page.locator('#windowClose').click();
    assert.equal(await page.locator('#taskbarQrer').isVisible(), false);
    await menu('startMenu', 'editor');
    assert.equal(await page.locator('#appWindow').isVisible(), true);
    assert.equal(await page.locator('#data').inputValue(), 'Retro draft — stays here');
    await menu('retroViewMenu', 'style');
    assert.equal(await page.locator('#tab-style').getAttribute('aria-selected'), 'true');
    await menu('retroViewMenu', 'float');
    assert.equal(await page.locator('#floatingExport #dlPng').count(), 1);
    const before = await page.locator('#floatingExport').boundingBox();
    await page.locator('#floatingDrag').focus();
    await page.keyboard.press('ArrowLeft');
    const after = await page.locator('#floatingExport').boundingBox();
    assert.equal(Math.round(before.x - after.x), 10);
    const handle = await page.locator('#floatingDrag').boundingBox();
    await page.mouse.move(handle.x + 50, handle.y + 10);
    await page.mouse.down();
    await page.mouse.move(handle.x + 90, handle.y + 30);
    await page.mouse.up();
    assert.ok(
      (await page.locator('#floatingExport').boundingBox()).x > after.x,
      'Pointer drag moves toolbar',
    );
    const pending = page.waitForEvent('download');
    await page.locator('#dlPng').click();
    await (await pending).saveAs(path.join(out, 'retro-floating-export.png'));
    await ready();
    await page.screenshot({ path: path.join(out, 'win98-floating.png') });
    await menu('retroHelpMenu', 'shortcuts');
    assert.equal(await page.locator('#shortcutsDialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(
      await page.locator('#floatingExport').isVisible(),
      true,
      'Dismissing a dialog preserves the floating toolbar',
    );
    await page.locator('#dockExport').click();
    assert.equal(await page.locator('.output #dlPng').count(), 1);
    await page.locator('#startMenu summary').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    assert.equal(
      await page
        .locator('#startMenu [data-retro-action="editor"]')
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.screenshot({ path: path.join(out, 'win98-start.png') });
    await page.keyboard.press('Escape');
    await menu('startMenu', 'scan');
    assert.equal(await page.locator('#scanDialog').isVisible(), true);
    await page.keyboard.press('Escape');
    await menu('startMenu', 'display');
    assert.equal(await page.locator('#displayDialog').isVisible(), true);
    await page.keyboard.press('Escape');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const glass of [false, true]) {
        await page.locator('#glassToggle').setChecked(glass);
        for (const panel of ['content', 'style', 'logo']) {
          await page.locator('#tab-' + panel).click();
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
            `${width}/${panel}/${glass}`,
          );
        }
      }
      await page.locator('#tab-content').click();
      for (const [id, popup] of [
        ['toolsMenu', '.tools-popup'],
        ['retroViewMenu', '.retro-popup'],
        ['retroHelpMenu', '.retro-popup'],
        ['startMenu', '.retro-start-popup'],
      ]) {
        await page.locator('#' + id + ' summary').click();
        const box = await page.locator('#' + id + ' ' + popup).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width, `${id} stays inside ${width}px`);
        await page.keyboard.press('Escape');
      }
      await page.screenshot({
        path: path.join(out, 'win98-mobile-' + width + '.png'),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await menu('retroViewMenu', 'float');
    await menu('retroViewMenu', 'float');
    assert.equal(await page.locator('#floatingExport').isVisible(), false);
    assert.equal(await page.locator('.output #dlPng').count(), 1);
    // Title-bar drag moves the window; buttons on the bar still click normally.
    const start = await page.locator('#appWindow').boundingBox();
    await page.mouse.move(start.x + 300, start.y + 15);
    await page.mouse.down();
    await page.mouse.move(start.x + 200, start.y + 55, { steps: 5 });
    await page.mouse.up();
    const moved = await page.locator('#appWindow').boundingBox();
    assert.deepEqual([moved.x - start.x, moved.y - start.y], [-100, 40]);
    await page.locator('.titlebar').dblclick({ position: { x: 300, y: 15 } });
    assert.equal(await page.locator('#appWindow').getAttribute('data-maximized'), 'true');
    assert.equal((await page.locator('#appWindow').boundingBox()).x < 10, true);
    await page.locator('#windowMaximize').click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ready();
    await context.setOffline(true);
    await page.reload();
    await ready();
    assert.equal(await page.locator('.retro-taskbar').isVisible(), true);
    await menu('startMenu', 'about');
    assert.equal(await page.locator('#aboutDialog').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => document.querySelector('#startMenu summary') === document.activeElement,
    );
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      'PASS: Win98 chrome/glass modes, cloud desktop, pixel icons, Start/View/Help, taskbar, title-bar drag, minimize/close/restore/maximize with draft preservation, keyboard menus, draggable/dockable export and PNG download, 320/390/768 layouts and offline reload.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
