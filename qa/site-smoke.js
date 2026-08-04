const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://127.0.0.1:3118';
const entryPaths = ['/', '/booklet/', '/accommodation/', '/404.html'];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const failures = [];
  const internalUrls = new Set();

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin)) failures.push(`request failed: ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  await page.route('https://docs.google.com/spreadsheets/**', async (route) => {
    const requested = new URL(route.request().url());
    const callback = (requested.searchParams.get('tqx') || '').match(/responseHandler:([A-Za-z0-9_$]+)/)?.[1];
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: `${callback}(${JSON.stringify({
        status: 'ok',
        table: { cols: [{ id: 'Col0', label: '', type: 'string' }], rows: [] }
      })});`
    });
  });

  for (const entryPath of entryPaths) {
    const response = await page.goto(origin + entryPath, { waitUntil: 'networkidle' });
    assert.ok(response && response.ok(), `${entryPath} returned ${response && response.status()}`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.ok((await page.title()).trim(), `${entryPath} has no title`);

    const discovered = await page.locator('a[href], link[href], script[src], img[src], source[srcset]').evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        if (node.hasAttribute('srcset')) {
          return node.getAttribute('srcset').split(',').map((part) => part.trim().split(/\s+/)[0]);
        }
        return [node.getAttribute('href') || node.getAttribute('src')];
      }).filter(Boolean));
    for (const raw of discovered) {
      const url = new URL(raw, page.url());
      if (url.origin === origin) {
        url.hash = '';
        internalUrls.add(url.href);
      }
    }
  }

  for (const url of internalUrls) {
    const response = await context.request.get(url);
    assert.ok(response.ok(), `linked local resource returned ${response.status()}: ${url}`);
  }

  assert.deepEqual(failures, [], failures.join('\n'));
  await context.close();
  await browser.close();
  process.stdout.write(`PASS: ${entryPaths.length} pages and ${internalUrls.size} linked local resources loaded without browser or HTTP errors.\n`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
