const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const hugoConfig = fs.readFileSync(path.resolve(__dirname, '..', 'hugo.toml'), 'utf8');
const readParam = (name) => (hugoConfig.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]*?)"?\\s*$`, 'm')) || [])[1] || '';
const signupUrl = readParam('signupURL');
const signupsOpen = readParam('signupsOpen') === 'true' && Boolean(signupUrl);
const threshold = readParam('threshold');
const eventDatesHuman = readParam('eventDatesHuman');
const eventStart = readParam('eventStart');
const eventYear = eventStart.slice(0, 4);

const origin = process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118';
const entryPaths = ['/', '/booklet/', '/change/', '/accommodation/', '/2026/', '/404.html'];

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    await check(browser);
  } finally {
    // Without this an assertion failure leaks a headless chromium.
    await browser.close();
  }
}

async function check(browser) {
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

  for (const entryPath of entryPaths) {
    const response = await page.goto(origin + entryPath, { waitUntil: 'networkidle' });
    assert.ok(response && response.ok(), `${entryPath} returned ${response && response.status()}`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.ok((await page.title()).trim(), `${entryPath} has no title`);

    const bodyText = await page.locator('body').textContent();
    assert.doesNotMatch(bodyText, /\bregist(?:er|ration)\b|68Y72P|Open Blues 2026/i, `${entryPath} still carries 2026 registration copy`);
    if (entryPath === '/') {
      assert.equal(await page.locator('nav a[href$="2026/"]').count(), 1, 'nav must link to the 2026 edition page');
      assert.equal(await page.locator(`.counter[data-counter-threshold="${threshold}"]`).count(), 1, 'home must show the signup counter');
    }
    if (signupsOpen) {
      assert.equal(await page.locator(`nav a.btn[href="${signupUrl}"]`).count(), 1, 'nav signup button must link to signupURL');
      assert.equal(await page.locator('nav .btn-closed').count(), 0);
    } else {
      assert.equal(await page.locator('nav a.btn').count(), 0, 'nav must not link anywhere while signups are closed');
      assert.equal(await page.locator('nav .btn-closed').count(), 1);
      assert.match(await page.locator('nav .btn-closed').textContent(), /soon|cancelled/i);
      // Narrow: the signup form must not be linked while signups are closed, but the
      // always-available change form is a different URL and a different gate (changeOpen).
      assert.equal(await page.locator(`a[href="${signupUrl}"]`).count(), 0);
    }
    if (entryPath === '/') {
      assert.match(await page.locator('.hero-dates').textContent(), new RegExp(eventDatesHuman));
      assert.match(bodyText, new RegExp(`Open Blues ${eventYear}`));
      const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      assert.equal(jsonLd.name, `Open Blues ${eventYear}`);
      assert.equal(jsonLd.startDate, eventStart);
      assert.equal(jsonLd.endDate, readParam('eventEnd'));
      const calendarHref = await page.locator('.hero-cal a[href*="calendar.google.com"]').getAttribute('href');
      assert.match(calendarHref, new RegExp(`text=Open\\+Blues\\+${eventYear}&dates=${eventStart.replace(/-/g, '')}/`));
      const icsHref = await page.locator('.hero-cal a[href$=".ics"]').getAttribute('href');
      assert.match(icsHref, new RegExp(`openblues-${eventYear}\\.ics$`));
      const ics = await (await context.request.get(new URL(icsHref, page.url()).href)).text();
      assert.match(ics, new RegExp(`DTSTART;VALUE=DATE:${eventStart.replace(/-/g, '')}`));
      assert.match(ics, new RegExp(`SUMMARY:Open Blues ${eventYear}`));
      assert.equal(await page.locator('.hero-cta .btn').count(), 2);
      assert.match(bodyText, /How signing up works/);
      assert.match(bodyText, /Is there a selection\?/);
      assert.match(bodyText, /What if we don.t reach 40 people\?/);
      assert.match(bodyText, /refunded in full|comes back in full/, 'the front page must state the refund promise');
    }

    // Same-page anchors: the booklet's table of contents pointed at two headings that do not
    // exist, and the link check below strips url.hash, so it could never catch them.
    const anchors = await page.evaluate(() => {
      const ids = new Set(Array.from(document.querySelectorAll('[id]'), (node) => node.id));
      return Array.from(document.querySelectorAll('a[href^="#"]'), (a) => a.getAttribute('href').slice(1))
        .filter((id) => id && !ids.has(decodeURIComponent(id)));
    });
    assert.deepEqual(anchors, [], `${entryPath} has dead same-page anchors: ${anchors.join(', ')}`);

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
  process.stdout.write(`PASS: ${entryPaths.length} pages and ${internalUrls.size} linked local resources loaded without browser or HTTP errors.\n`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
