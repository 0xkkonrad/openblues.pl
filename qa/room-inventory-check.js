const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const siteRoot = path.resolve(__dirname, '..');
const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const pageUrl = `${origin}/room-inventory-check/`;
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const expected = new Map([
  ['opposite-upstairs-1', ['1 small double bed', 'opposite-upstairs-1']],
  ['opposite-upstairs-2', ['1 single bed', 'opposite-upstairs-2']],
  ['opposite-upstairs-3', ['1 single bed · 1 small double bed', 'opposite-upstairs-3']],
  ['opposite-downstairs-1', ['1 double bed', 'opposite-downstairs-1']],
  ['opposite-downstairs-2', ['1 double bed · 1 single bed', 'opposite-downstairs-2']],
  ['castle-downstairs-a1', ['1 double bed', 'castle-downstairs-a1']],
  ['castle-downstairs-a2', ['1 double bed · 2 single beds', 'castle-downstairs-a2']],
  ['castle-downstairs-a3', ['1 double bed · 1 single sofa · 1 double-size sofa (single occupancy)', 'castle-downstairs-a3']],
  ['castle-downstairs-b1', ['1 double bed', 'castle-downstairs-b1']],
  ['castle-downstairs-b2', ['1 double bed', 'castle-downstairs-b2']],
  ['castle-downstairs-c1', ['1 double bed · 2 single beds', 'castle-downstairs-c']],
  ['castle-upstairs-1', ['1 double bed · 2 single beds', 'castle-upstairs-1']],
  ['castle-upstairs-2', ['1 sofa bed · 1 double bed', 'castle-upstairs-2']],
  ['castle-upstairs-3', ['3 single beds', 'castle-upstairs-3']],
  ['castle-upstairs-4', ['5 single beds', 'castle-upstairs-4']],
  ['castle-upstairs-5', ['1 double bed', 'castle-upstairs-5']],
  ['castle-upstairs-6', ['1 double bed', 'castle-upstairs-6']],
  ['opposite-right-upstairs-1', ['2 single beds', 'opposite-right-upstairs-1']],
  ['opposite-right-upstairs-2', ['2 single beds', 'opposite-right-upstairs-2']],
]);

const expectedMaxWidth = new Map([
  ['opposite-right-upstairs-1', 1344],
  ['opposite-right-upstairs-2', 1344],
]);

function sourceChecks() {
  const page = fs.readFileSync(path.join(siteRoot, 'content', 'room-inventory-check.md'), 'utf8');
  const data = JSON.parse(fs.readFileSync(path.join(siteRoot, 'data', 'room_inventory_check.json'), 'utf8'));
  const allRooms = data.groups.flatMap((group) => group.rooms);
  assert.equal(allRooms.length, 19);
  assert.equal(allRooms.filter((room) => room.slug).length, 19);
  assert.equal(allRooms.filter((room) => !room.slug).length, 0);
  assert.match(page, /robots:\s*"noindex, nofollow, noarchive, nosnippet"/);
  assert.match(page, /sitemap:\s*\n\s+disable: true/);
  assert.match(page, /supplied reference photos used on the Open Blues website/i);
  assert.match(page, /19 supplied room photos/i);
  assert.match(page, /53 sleeping places/i);
  assert.doesNotMatch(page, /openblues-room-bed-check|landlord-room-check|artifacts\//i);

  const publishedSources = [path.join(siteRoot, 'content'), path.join(siteRoot, 'layouts')];
  const pending = [...publishedSources];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (target !== path.join(siteRoot, 'content', 'room-inventory-check.md')) {
        assert.doesNotMatch(fs.readFileSync(target, 'utf8'), /\/room-inventory-check\//, `${target} publishes the direct-only URL`);
      }
    }
  }

  for (const room of allRooms) {
    assert.deepEqual([room.inventory, room.slug || null], expected.get(room.id), `inventory mismatch for ${room.id}`);
    assert.equal(room.maxWidth || 1440, expectedMaxWidth.get(room.id) || 1440, `maximum image width mismatch for ${room.id}`);
    if (!room.slug) continue;
    for (const size of [480, 960, 1440]) {
      assert.ok(
        fs.existsSync(path.join(siteRoot, 'static', 'images', 'accommodation', `${room.slug}-${size}.webp`)),
        `missing canonical image ${room.slug}-${size}.webp`,
      );
    }
  }
}

async function browserChecks() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      const response = await page.goto(pageUrl, { waitUntil: 'networkidle' });
      assert.ok(response && response.ok(), `${pageUrl} returned ${response && response.status()}`);
      assert.equal(await page.title(), 'Room inventory check — Open Blues');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive, nosnippet');
      assert.equal(await page.locator('[data-inventory-room]').count(), 19);
      assert.equal(await page.locator('[data-inventory-room] img').count(), 19);
      assert.equal(await page.locator('.inventory-photo-missing').count(), 0);
      assert.match(await page.locator('main').innerText(), /No mattresses/);
      const groupLabels = await page.locator('section.inventory-group').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
      assert.deepEqual(groupLabels, [
        'Opposite Left · Upstairs',
        'Opposite · Downstairs',
        'Castle · Downstairs',
        'Castle · Upstairs',
        'Opposite Right · Upstairs',
      ]);
      assert.equal(new Set(groupLabels).size, groupLabels.length, 'room-group accessible names must be unique');

      const cards = await page.locator('[data-inventory-room]').evaluateAll((nodes) => nodes.map((node) => ({
        id: node.dataset.inventoryRoom,
        label: node.dataset.inventoryLabel,
        src: node.querySelector('img') ? new URL(node.querySelector('img').getAttribute('src'), document.baseURI).pathname : null,
        srcset: node.querySelector('source') ? node.querySelector('source').getAttribute('srcset') : null,
        loaded: node.querySelector('img') ? node.querySelector('img').complete && node.querySelector('img').naturalWidth > 0 : true,
      })));
      for (const card of cards) {
        const [label, slug] = expected.get(card.id);
        assert.equal(card.label, label, `rendered inventory mismatch for ${card.id}`);
        assert.equal(card.src, slug ? `/images/accommodation/${slug}-960.webp` : null, `non-canonical source for ${card.id}`);
        const maxWidth = expectedMaxWidth.get(card.id) || 1440;
        assert.match(card.srcset, new RegExp(`${slug}-1440\\.webp ${maxWidth}w$`), `incorrect maximum-width descriptor for ${card.id}`);
        assert.equal(card.loaded, true, `image did not load for ${card.id}`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `horizontal overflow at ${viewport.width}px`);
      await page.addScriptTag({ content: axeSource });
      const axe = await page.evaluate(async () => window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        resultTypes: ['violations'],
      }));
      assert.deepEqual(axe.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })), [], `accessibility violations at ${viewport.width}px`);
      assert.deepEqual(errors, []);
      await page.close();
    }

    const publicPaths = ['/', '/accommodation/', '/booklet/', '/change/', '/cost/', '/spread-the-word/'];
    for (const publicPath of publicPaths) {
      const page = await browser.newPage();
      const response = await page.goto(`${origin}${publicPath}`, { waitUntil: 'domcontentloaded' });
      assert.ok(response && response.ok(), `${publicPath} did not load`);
      assert.equal(await page.locator('a[href*="room-inventory-check"]').count(), 0, `${publicPath} publishes the private-check URL`);
      await page.close();
    }

    const sitemap = await fetch(`${origin}/sitemap.xml`).then((response) => response.text());
    assert.doesNotMatch(sitemap, /room-inventory-check/);
  } finally {
    await browser.close();
  }
}

async function run() {
  sourceChecks();
  await browserChecks();
  process.stdout.write('PASS: unlinked room inventory check reuses 19 canonical room photos, preserves all corrected labels, and stays out of navigation and sitemap.\n');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
