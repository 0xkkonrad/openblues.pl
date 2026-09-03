// No trackers, analytics or third-party beacons. Ever, on any page.
//
// Two independent checks, because either one alone is escapable:
//
//   1. NETWORK. Load every page in a real browser and assert that every single request — of any
//      resource type, including ones fired after load, on interaction, and by service workers —
//      goes to the preview origin. A tracker that loads is caught here whatever it is called.
//
//   2. SOURCE. Grep the rendered HTML/JS/CSS for the shapes a tracker takes even when it is
//      switched off in the checked-in build: known hostnames, the global names their snippets
//      install (gtag, dataLayer, fbq, _paq, plausible, posthog...), navigator.sendBeacon, and
//      <img> pixels. A snippet that is present but dormant today is a tracker tomorrow.
//
// Outbound <a href> links to other sites are fine and are not requests — the footer links to
// United24, savelife.in.ua, unlicense.org and peanut.me, and the YouTube shortcode is
// click-to-load. Nothing may be *fetched* from a third party.
//
// Needs a served build: OPENBLUES_PREVIEW_ORIGIN (default http://localhost:3118).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');

// The site's own baseURL is not a third party. It has to be allowed explicitly because
// layouts/404.html is emitted with absolute URLs — Hugo cannot make a 404 page's asset paths
// relative, since the page is served from whatever depth the missing URL had. On the real site
// those requests are same-origin; against a local preview they point at openblues.pl.
const hugoConfig = fs.readFileSync(path.resolve(__dirname, '..', 'hugo.toml'), 'utf8');
const baseURL = (hugoConfig.match(/^\s*baseURL\s*=\s*"([^"]+)"/m) || [])[1] || '';
const siteOrigin = baseURL ? new URL(baseURL).origin : null;

const isOwn = (url) =>
  url.startsWith(origin) || url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:') ||
  Boolean(siteOrigin && url.startsWith(siteOrigin));

const pages = ['/', '/cost/', '/change/', '/booklet/', '/accommodation/', '/spread-the-word/', '/404.html'];
const textAssets = ['/sitemap.xml', '/robots.txt', '/openblues-2027.ics'];

// Hostnames and snippet fingerprints. Matched against the raw served bytes of every page and
// every same-origin script/stylesheet it pulls in.
const trackerPatterns = [
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /\bgtag\s*\(/,
  /\bdataLayer\b/,
  /connect\.facebook\.net/i,
  /\bfbq\s*\(/i,
  /doubleclick\.net/i,
  /hotjar\.com/i,
  /\bhj\s*\(/,
  /matomo|piwik|\b_paq\b/i,
  /plausible\.io/i,
  /posthog/i,
  /segment\.(com|io)/i,
  /mixpanel/i,
  /amplitude\.com/i,
  /clarity\.ms/i,
  /sentry\.io/i,
  /cloudflareinsights\.com/i,
  /statcounter/i,
  /quantserve|scorecardresearch/i,
  /navigator\.sendBeacon/i,
  /sendBeacon\s*\(/,
  /\bnew\s+Image\s*\(\s*\)[\s\S]{0,80}\.src\s*=/,
  [/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i, (m) => !siteOrigin || !m[1].startsWith(siteOrigin)],
  /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
  /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/i,
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const offOrigin = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    page.on('request', (request) => {
      const url = request.url();
      if (isOwn(url)) return;
      offOrigin.push(`${request.resourceType()} ${request.method()} ${url} (from ${page.url()})`);
    });

    for (const path of pages) {
      const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
      assert.ok(response && response.ok(), `${path} returned ${response && response.status()}`);
      // Give anything deferred, lazy or idle-scheduled a chance to fire before we judge.
      await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));

      const workers = await page.evaluate(async () =>
        (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0));
      assert.equal(workers, 0, `${path} registered a service worker`);
    }

    assert.deepEqual(offOrigin, [],
      `third-party requests are never allowed on any page:\n${offOrigin.join('\n')}`);

    // Source scan. Every served page, plus every same-origin script/style it references.
    const scanned = new Set();
    const violations = [];
    const scan = async (url) => {
      if (scanned.has(url)) return;
      scanned.add(url);
      const response = await context.request.get(url);
      assert.ok(response.ok(), `${url} returned ${response.status()}`);
      const body = await response.text();
      for (const entry of trackerPatterns) {
        const [pattern, accept] = Array.isArray(entry) ? entry : [entry, null];
        for (const match of body.matchAll(new RegExp(pattern, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))) {
          if (accept && !accept(match)) continue;
          const line = body.slice(0, match.index).split('\n').length;
          violations.push(`${url}:${line}: tracker fingerprint ${pattern} — "${match[0].slice(0, 80)}"`);
          break;
        }
      }
      return body;
    };

    for (const path of [...pages, ...textAssets]) {
      const body = await scan(origin + path);
      if (!body || !path.endsWith('/') && !path.endsWith('.html')) continue;
      for (const match of body.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/gi)) {
        const url = new URL(match[1], origin + path);
        if (url.origin === origin) await scan(url.href);
      }
    }

    assert.deepEqual(violations, [], `tracker fingerprints in the built site:\n${violations.join('\n')}`);

    await context.close();
    process.stdout.write(
      `PASS: ${pages.length} pages loaded with zero off-origin requests; ` +
      `${scanned.size} served files clear of ${trackerPatterns.length} tracker fingerprints.\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
