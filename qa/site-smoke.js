const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const hugoConfig = fs.readFileSync(path.resolve(__dirname, '..', 'hugo.toml'), 'utf8');
const readParam = (name) => (hugoConfig.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]*?)"?\\s*$`, 'm')) || [])[1] || '';
const signupUrl = readParam('signupURL');
const counterData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data/counter.json'), 'utf8'));
const signupsOpen = readParam('signupsOpen') === 'true' && Boolean(signupUrl) && counterData.status !== 'cancelled';
const threshold = readParam('threshold');
const eventDatesHuman = readParam('eventDatesHuman');
const eventStart = readParam('eventStart');
const eventYear = eventStart.slice(0, 4);

const origin = process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118';
// /cost/ is the calculator that replaced Tally's live running total, and /spread-the-word/
// is where the print kit's QR codes land people. Both are participant-facing entry points
// and both were outside this smoke test before the Google Forms migration.
const entryPaths = ['/', '/cost/', '/booklet/', '/change/', '/accommodation/', '/spread-the-word/', '/2026/', '/404.html'];

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
    if (message.type() !== 'error') return;
    // layouts/404.html is emitted with absolute openblues.pl URLs (Hugo cannot make a 404
    // page's asset paths relative — it is served from whatever depth the missing URL had), so
    // against a local preview on a box with no internet those subresources fail and Chromium
    // logs one console error each. That says nothing about the build. Whether any off-origin
    // request happens at all is qa/no-trackers.js's job, and it asserts it properly.
    const from = (message.location() || {}).url || '';
    if (from && !from.startsWith(origin) && /Failed to load resource/i.test(message.text())) return;
    failures.push(`console: ${message.text()}`);
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
      assert.equal(await page.locator('header nav a[href$="spread-the-word/"]').count(), 1, 'primary nav must keep Spread the word');
      assert.equal(await page.locator('header nav a[href$="change/"]').count(), 0, 'Change details must be secondary navigation');
      assert.equal(await page.locator('header nav a[href$="2026/"]').count(), 0, 'past editions must be secondary navigation');
      assert.equal(await page.locator('footer nav a[href$="change/"]').count(), 1, 'footer must retain Change details');
      assert.equal(await page.locator('footer nav a[href$="2026/"]').count(), 1, 'footer must retain the 2026 archive');
      assert.equal(await page.locator(`.counter[data-counter-threshold="${threshold}"]`).count(), 1, 'home must show the signup counter');
    }
    if (signupsOpen) {
      assert.equal(await page.locator(`nav a.btn[href="${signupUrl}"]`).count(), 1, 'nav signup button must link to signupURL');
      assert.equal(await page.locator('nav .btn-closed').count(), 0);
    } else {
      assert.equal(await page.locator('nav a.btn').count(), 0, 'nav must not link anywhere while signups are closed');
      assert.equal(await page.locator('nav .btn-closed').count(), 1);
      assert.match(await page.locator('nav .btn-closed').textContent(), /soon|cancelled/i);
      // Narrow: the signup form must not be linked while signups are closed. /change/ is a
      // different thing entirely — it is a page on this site, not a form, and it stays reachable
      // for people who already signed up, including after signups close.
      assert.equal(await page.locator(`a[href="${signupUrl}"]`).count(), 0);
    }
    if (entryPath === '/') {
      assert.match(await page.locator('.hero-dates').textContent(), new RegExp(eventDatesHuman));
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
      assert.equal((await page.locator('.home-hero h1').textContent()).trim(),
        'Blues & fusion. Live music. Five DIY days in a Polish palace');
      const heroCtaText = (await page.locator('.hero-cta').textContent()).replace(/\s+/g, ' ');
      assert.match(heroCtaText, /Sign up now/);
      assert.match(heroCtaText, /See what it.s like/);
      assert.doesNotMatch(bodyText, /One form, once|Nothing is final|Signups close|There is no selection/i);

      const paid = Number(counterData.paid || 0);
      const remaining = Math.max(0, Number(threshold) - paid);
      const status = counterData.status === 'open' && paid >= Number(threshold) ? 'confirmed' : counterData.status;
      if (status === 'open') {
        const counterText = await page.locator('.home-hero .counter').textContent();
        assert.match(counterText, new RegExp(`${paid} ${paid === 1 ? 'person is' : 'people are'} in`));
        assert.match(counterText, new RegExp(`${remaining === 1 ? 'One' : remaining} more and Open Blues happens`));
        assert.match(counterText, new RegExp(`You could be number ${paid + 1}`));
      }
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

  // The approved first fold has to use wide screens and keep its actions in reach on small
  // ones. These are geometry checks, not screenshots, so they remain stable in CI.
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
      };
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hero: rect('.home-hero'),
        inner: rect('.home-hero__inner'),
        copy: rect('.home-hero__copy'),
        photo: rect('.home-hero__photo'),
        cta: rect('.hero-cta'),
      };
    });
    assert.ok(geometry.scrollWidth <= geometry.innerWidth,
      `homepage overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    if (viewport.width >= 1000) {
      assert.ok(geometry.photo.left > geometry.copy.right,
        `wide hero must be two columns at ${viewport.width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.inner.width >= viewport.width * 0.67,
        `wide hero wastes too much width at ${viewport.width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.hero.bottom <= viewport.height,
        `wide first fold must fit its viewport at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    } else {
      assert.ok(geometry.photo.top >= geometry.copy.bottom,
        `narrow hero must stack without overlap at ${viewport.width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.cta.bottom <= viewport.height,
        `signup actions must remain in the first viewport at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    }
  }

  assert.deepEqual(failures, [], failures.join('\n'));
  await context.close();
  process.stdout.write(`PASS: ${entryPaths.length} pages and ${internalUrls.size} linked local resources loaded without browser or HTTP errors.\n`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
