const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const pageUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://localhost:3118/accommodation/';
const origin = new URL(pageUrl).origin;
const outputDir = process.env.OPENBLUES_QA_OUTPUT || '/tmp/openblues-qa';
const sheetId = '1Cu3Cgi5qpbeqUIpy87-dbzBTXIWrYuWIIHS5Jp1RSV8';

const expectedRooms = [
  'opposite-upstairs-1',
  'opposite-upstairs-2',
  'opposite-upstairs-3',
  'opposite-downstairs-1',
  'opposite-downstairs-2',
  'castle-downstairs-a1',
  'castle-downstairs-a2',
  'castle-downstairs-a3',
  'castle-downstairs-b1',
  'castle-downstairs-b2',
  'castle-downstairs-c1',
  'castle-upstairs-1',
  'castle-upstairs-2',
  'castle-upstairs-3',
  'castle-upstairs-4',
  'castle-upstairs-5',
  'castle-upstairs-6',
  'opposite-right-upstairs-new'
];

const expectedPhotoSlugs = [
  'opposite-upstairs-1',
  'opposite-upstairs-2',
  'opposite-upstairs-3',
  'opposite-downstairs-1',
  'opposite-downstairs-2',
  'castle-downstairs-a1',
  'castle-downstairs-a2',
  'castle-downstairs-a3',
  'castle-downstairs-b1',
  'castle-downstairs-b2',
  'castle-downstairs-c',
  'castle-upstairs-1',
  'castle-upstairs-2',
  'castle-upstairs-3',
  'castle-upstairs-4',
  'castle-upstairs-5',
  'castle-upstairs-6'
];

fs.mkdirSync(outputDir, { recursive: true });

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} overflows horizontally: ${JSON.stringify(dimensions)}`
  );
}

async function loadEveryImage(page) {
  const images = page.locator('img');
  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index);
    await image.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(30);
    await image.evaluate((node) => node.decode ? node.decode() : new Promise((resolve, reject) => {
      if (node.complete && node.naturalWidth > 0) return resolve();
      node.addEventListener('load', resolve, { once: true });
      node.addEventListener('error', reject, { once: true });
    }));
  }
  const broken = await images.evaluateAll((nodes) => nodes
    .filter((node) => !node.complete || node.naturalWidth === 0)
    .map((node) => node.currentSrc || node.src));
  assert.deepEqual(broken, [], `broken images: ${JSON.stringify(broken)}`);
}

function assertSheetLink(rawHref, expectedGid) {
  const href = new URL(rawHref);
  assert.equal(href.hostname, 'docs.google.com');
  assert.equal(href.pathname, `/spreadsheets/d/${sheetId}/edit`);
  assert.equal(new URLSearchParams(href.hash.slice(1)).get('gid'), expectedGid);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
      const page = await context.newPage();
      const errors = [];
      const thirdPartyRequests = [];

      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('request', (request) => {
        const requested = new URL(request.url());
        if (requested.origin !== origin && !['data:', 'blob:'].includes(requested.protocol)) {
          thirdPartyRequests.push(request.url());
        }
      });
      page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));

      const response = await page.goto(pageUrl, { waitUntil: 'networkidle' });
      assert.ok(response && response.ok(), `${pageUrl} returned ${response && response.status()}`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('h1').textContent(), /See the rooms.*Choose in the live Sheet/s);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive, nosnippet');
      assert.equal(await page.locator('meta[name="referrer"]').getAttribute('content'), 'no-referrer');
      assert.equal(await page.locator('script[src*="accommodation"]').count(), 0);
      assert.equal(await page.locator('[data-accommodation-picker]').count(), 0);

      const roomIds = await page.locator('[data-room-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.roomId));
      assert.deepEqual(roomIds, expectedRooms);
      assert.equal(new Set(roomIds).size, 18);
      assert.equal(await page.locator('.stay-room-card__photo img').count(), 17);
      assert.equal(await page.locator('.stay-room-card--missing').count(), 1);
      assert.match(await page.locator('.stay-room-card--missing').textContent(), /No supplied photo/);
      assert.equal(await page.locator('.stay-map-panel img').count(), 4);
      assert.equal(await page.locator('.stay-map-panel__swipe').count(), 4);

      const mapAffordances = await page.locator('.stay-map-panel').evaluateAll((panels) => panels.map((panel) => {
        const scroller = panel.querySelector('.stay-map-panel__scroll');
        const hint = panel.querySelector('.stay-map-panel__swipe');
        const hintStyle = getComputedStyle(hint);
        return {
          horizontallyScrollable: scroller.scrollWidth > scroller.clientWidth + 1,
          hintVisible: hintStyle.display !== 'none' && hintStyle.visibility !== 'hidden' && hint.getBoundingClientRect().height > 0,
          hintText: hint.textContent.trim()
        };
      }));
      for (const affordance of mapAffordances) {
        if (affordance.horizontallyScrollable) {
          assert.equal(affordance.hintVisible, true, `scrollable map lacks visible affordance at ${width}px`);
          assert.match(affordance.hintText, /swipe.*scroll sideways/i);
        }
      }

      const fullPhotoLinks = await page.locator('.stay-room-card__photo').evaluateAll((nodes) => nodes.map((node) => node.pathname));
      assert.deepEqual(
        fullPhotoLinks,
        expectedPhotoSlugs.map((slug) => `/images/accommodation/${slug}-1440.webp`)
      );

      const chooseHref = await page.locator('.stay-primary').getAttribute('href');
      const browserHref = await page.locator('.stay-secondary').getAttribute('href');
      const mapHref = await page.getByRole('link', { name: /Open the live map tab/ }).getAttribute('href');
      const startHref = await page.getByRole('link', { name: /Read the Sheet instructions first/ }).getAttribute('href');
      assertSheetLink(chooseHref, '2026080502');
      assertSheetLink(browserHref, '2026080501');
      assertSheetLink(mapHref, '0');
      assertSheetLink(startHref, '2026080404');

      const sheetLinks = await page.locator(`a[href*="${sheetId}"]`).evaluateAll((nodes) => nodes.map((node) => node.href));
      assert.equal(sheetLinks.length, 23);
      assert.equal(sheetLinks.every((href) => href.includes(sheetId)), true);
      const roomSheetLinks = await page.locator('.stay-room-card__body a').evaluateAll((nodes) => nodes.map((node) => node.href));
      assert.equal(roomSheetLinks.length, 18);
      roomSheetLinks.forEach((href, index) => {
        const fragment = new URLSearchParams(new URL(href).hash.slice(1));
        assert.equal(fragment.get('gid'), '2026080501');
        assert.equal(fragment.get('range'), `B${index + 5}:G${index + 5}`);
      });
      const roomLinkA11y = await page.locator('.stay-room-card__body a').evaluateAll((nodes) => nodes.map((node) => ({
        label: node.getAttribute('aria-label'),
        height: node.getBoundingClientRect().height
      })));
      assert.equal(new Set(roomLinkA11y.map(({ label }) => label)).size, 18);
      assert.equal(roomLinkA11y.every(({ label }) => /live in the Sheet$/.test(label || '')), true);
      assert.equal(roomLinkA11y.every(({ height }) => height >= 44), true, `room Sheet link shorter than 44px at ${width}px`);
      const targetBlankWithoutSafety = await page.locator('a[target="_blank"]').evaluateAll((nodes) => nodes
        .filter((node) => {
          const tokens = (node.getAttribute('rel') || '').split(/\s+/);
          return !tokens.includes('noopener') || !tokens.includes('noreferrer');
        })
        .map((node) => node.href));
      assert.deepEqual(targetBlankWithoutSafety, []);

      const bodyText = await page.locator('body').textContent();
      const bodyHtml = await page.locator('body').innerHTML();
      assert.doesNotMatch(bodyText, /accommodation picker|Tally gives the final confirmation/i);
      assert.doesNotMatch(bodyHtml, /claim_key|data-roster-|gviz\/tq|rjQKYM|1yOjUmU7/);
      assert.match(bodyText, /phone.*Sheets app.*read-only/is);

      const primaryBox = await page.locator('.stay-primary').boundingBox();
      assert.ok(primaryBox && primaryBox.height >= 44, `primary CTA is shorter than 44px at ${width}px`);
      const authorityOverlaps = await page.locator('.stay-authority > div').evaluateAll((cards) => cards.map((card) => {
        const heading = card.querySelector('h2');
        const numberNode = card.querySelector('.stay-authority__number');
        const numberStyle = getComputedStyle(numberNode);
        if (numberStyle.display === 'none' || numberStyle.visibility === 'hidden') return false;
        const number = numberNode.getBoundingClientRect();
        const headingRange = document.createRange();
        headingRange.selectNodeContents(heading);
        return [...headingRange.getClientRects()].some((line) => (
          line.left < number.right && line.right > number.left && line.top < number.bottom && line.bottom > number.top
        ));
      }));
      assert.deepEqual(authorityOverlaps, [false, false], `authority heading/number overlap at ${width}px`);
      await assertNoHorizontalOverflow(page, `${width}px`);
      await loadEveryImage(page);
      await page.screenshot({ path: path.join(outputDir, `accommodation-${width}.png`), fullPage: true });

      assert.deepEqual(thirdPartyRequests, [], `third-party requests before click: ${thirdPartyRequests.join('\n')}`);
      assert.deepEqual(errors, [], errors.join('\n'));
      await context.close();
    }

    const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noScriptPage = await noScriptContext.newPage();
    const response = await noScriptPage.goto(pageUrl, { waitUntil: 'networkidle' });
    assert.ok(response && response.ok());
    assert.equal(await noScriptPage.locator('[data-room-id]').count(), 18);
    assertSheetLink(await noScriptPage.locator('.stay-primary').getAttribute('href'), '2026080502');
    await assertNoHorizontalOverflow(noScriptPage, 'no-JavaScript 390px');
    await noScriptContext.close();

    process.stdout.write('PASS: static accommodation field guide loaded at 5 viewports with exact rooms, maps, photos, Sheet tabs, privacy and no legacy runtime.\n');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
