// Run with Playwright installed and the application served at BASE_URL.
// Optional: CHROMIUM_EXECUTABLE_PATH for an existing browser installation.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('patrimonio_tutorial_done', 'true'));
  const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
  const routes = ['/', '/market', '/portfolio', '/trade', '/history', '/achievements'];
  try {
    for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720], [1280, 400], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const route of routes) {
        await page.goto(new URL(route, base).href);
        await page.locator('main').waitFor();
        const metrics = await page.evaluate(() => {
          window.scrollTo(0, 10000);
          const main = document.querySelector('main');
          const header = document.querySelector('header');
          const headerTop = header.getBoundingClientRect().top;
          main.scrollTop = 10000;
          return {
            documentHeight: document.documentElement.scrollHeight,
            documentWidth: document.documentElement.scrollWidth,
            height: innerHeight, width: innerWidth, windowY: scrollY,
            contentY: main.scrollTop, contentOverflow: main.scrollHeight - main.clientHeight,
            headerMoved: header.getBoundingClientRect().top !== headerTop,
          };
        });
        assert.equal(metrics.documentHeight, height, `${width}x${height} ${route}: outer height`);
        assert.equal(metrics.documentWidth, width, `${width}x${height} ${route}: outer width`);
        assert.equal(metrics.windowY, 0, `${route}: window must not scroll`);
        assert.equal(metrics.headerMoved, false, `${route}: header must stay fixed`);
        if (metrics.contentOverflow > 0) assert.ok(metrics.contentY > 0, `${route}: content must scroll`);
      }
      console.log(`PASS ${width}x${height}: all six routes, outer scroll and inner scroll`);
    }
    await page.setViewportSize({width: 1280, height: 720});
    await page.goto(base);
    await page.getByRole('button', { name: 'Recolher menu' }).click();
    await page.locator('main').focus();
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => document.querySelector('main').scrollTop > 0);
    await page.locator('aside').first().getByRole('link').filter({has: page.locator('svg.lucide-clock')}).click();
    await page.waitForURL('**/history');
    assert.equal(await page.locator('main').evaluate(e => e.scrollTop), 0);
    await page.getByRole('button', {name: 'Expandir menu'}).click();
    await page.locator('aside').first().getByRole('button', {name:'Configurações'}).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), 720);
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button', {name:'Abrir menu'}).click();
    await page.getByRole('button', {name:'Fechar menu'}).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), 844);
    assert.deepEqual(errors, []);
    console.log('PASS keyboard scrolling, collapsed menu, route reset, dialog, mobile drawer, console');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
