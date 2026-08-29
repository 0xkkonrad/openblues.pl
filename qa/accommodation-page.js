const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const pageUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://localhost:3118/accommodation/';
const origin = new URL(pageUrl).origin;
const outputDir = process.env.OPENBLUES_QA_OUTPUT || '/tmp/openblues-qa';
const hugoConfig = fs.readFileSync(path.resolve(__dirname, '..', 'hugo.toml'), 'utf8');
const readParam = (name) => (hugoConfig.match(new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, 'm')) || [])[1] || '';
const roomBrowserUrl = readParam('roomBrowserURL');
const roomBrowserInstructionsUrl = readParam('roomBrowserInstructionsURL');
const sheetId = roomBrowserUrl ? new URL(roomBrowserUrl).pathname.split('/')[3] : '';
const roomBrowserGid = roomBrowserUrl ? new URLSearchParams(new URL(roomBrowserUrl).hash.slice(1)).get('gid') : '';
const redundantCapacityCopy = /\b(?:person[- ]?)?places?\b/i;
const mutableAvailabilityCopy = /\b(?:free|taken|held|not[- ]open|available|availability|reserved|unavailable)\b/i;

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

const expectedRoomRanges = [
  'A5:E5',
  'A6:E7',
  'A8:E10',
  'A11:E12',
  'A13:E15',
  'A16:E19',
  'A20:E23',
  'A24:E27',
  'A28:E31',
  'A32:E33',
  'A34:E37',
  'A38:E41',
  'A42:E45',
  'A46:E48',
  'A49:E52',
  'A53:E54',
  'A55:E57',
  'A58:E61'
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

const expectedMapPaths = [
  '/images/accommodation/map-castle-downstairs.svg',
  '/images/accommodation/map-castle-upstairs.svg',
  '/images/accommodation/map-opposite-downstairs.svg',
  '/images/accommodation/map-opposite-upstairs.svg'
];

const expectedMapDimensions = [
  [1200, 900],
  [1600, 850],
  [1000, 440],
  [1000, 650]
];

const mappedRooms = [
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
  'opposite-downstairs-1',
  'opposite-downstairs-2',
  'opposite-upstairs-3',
  'opposite-upstairs-2',
  'opposite-upstairs-1'
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
      assert.match(await page.locator('h1').textContent(), /See the rooms.*Choose in the Sheet after acceptance/s);
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

      const roomSummaries = await page.locator('.stay-room-card__body > span').allTextContents();
      assert.equal(roomSummaries.length, 18, 'every room card needs one sleeping-surface summary');
      roomSummaries.forEach((summary) => {
        assert.doesNotMatch(summary, redundantCapacityCopy, `room summary repeats capacity: ${summary}`);
        assert.doesNotMatch(summary, mutableAvailabilityCopy, `room summary leaks mutable availability: ${summary}`);
      });
      assert.match(
        await page.locator('[data-room-id="castle-downstairs-a3"] .stay-room-card__body > span').textContent(),
        /double-size sofa.*single occupancy/i,
        'A3 must preserve its non-obvious single-occupancy sofa exception'
      );

      assert.equal(await page.locator('.stay-map-panel img').count(), 0, 'floor plans must not contain raster placeholders');
      assert.equal(await page.locator('.stay-map-panel__scroll > svg.stay-map-art').count(), 4);
      assert.equal(await page.locator('.stay-map-panel__swipe').count(), 4);
      const inlineMaps = await page.locator('.stay-map-panel__scroll > svg.stay-map-art').evaluateAll((nodes) => nodes.map((node) => {
        const viewBox = node.viewBox.baseVal;
        const box = node.getBoundingClientRect();
        return {
          width: Number(node.getAttribute('width')),
          height: Number(node.getAttribute('height')),
          viewBox: [viewBox.x, viewBox.y, viewBox.width, viewBox.height],
          renderedWidth: box.width,
          renderedHeight: box.height,
          role: node.getAttribute('role'),
          title: node.querySelector(':scope > title')?.textContent?.trim(),
          scopeClasses: [...node.classList].filter((className) => className.startsWith('map-'))
        };
      }));
      assert.deepEqual(inlineMaps.map(({ width: mapWidth, height: mapHeight }) => [mapWidth, mapHeight]), expectedMapDimensions);
      assert.deepEqual(inlineMaps.map(({ viewBox }) => viewBox), expectedMapDimensions.map(([mapWidth, mapHeight]) => [0, 0, mapWidth, mapHeight]));
      assert.equal(inlineMaps.every(({ renderedWidth, renderedHeight, role, title }) => renderedWidth > 0 && renderedHeight > 0 && role === 'group' && title), true, 'floor plans must render as named inline SVG groups');
      assert.equal(new Set(inlineMaps.map(({ title }) => title)).size, 4, 'floor-plan accessible names must be unique');
      assert.equal(new Set(inlineMaps.flatMap(({ scopeClasses }) => scopeClasses)).size, 4, 'floor-plan CSS scope classes must be unique');
      assert.equal(inlineMaps.every(({ scopeClasses }) => scopeClasses.length === 1), true);

      const mapLabelCopy = await page.locator('svg.stay-map-art text').allTextContents();
      assert.doesNotMatch(mapLabelCopy.join(' '), redundantCapacityCopy, 'floor-plan labels must not repeat capacity already conveyed by sleeping-surface types');
      assert.equal(mapLabelCopy.filter((label) => /\bSINGLE OCCUPANCY\b/i.test(label)).length, 1, 'A3 needs exactly one concise single-occupancy exception');

      const mapIntro = await page.locator('.stay-map__intro').textContent();
      assert.match(mapIntro, /colou?rs and symbols.*types?.*(?:not|never).*availability/i, 'map intro must explain that colour and symbols encode type, not live availability');

      const mapRoomLinks = await page.locator('svg.stay-map-art a[data-room]').evaluateAll((nodes) => nodes.map((node) => {
        const href = node.getAttribute('href');
        return {
          roomId: node.getAttribute('data-room'),
          href,
          label: node.getAttribute('aria-label'),
          title: node.querySelector(':scope > title')?.textContent?.trim(),
          targetExists: Boolean(document.getElementById(href.split('#')[1]))
        };
      }));
      assert.deepEqual(mapRoomLinks.map(({ roomId }) => roomId), mappedRooms);
      assert.equal(new Set(mapRoomLinks.map(({ label }) => label)).size, 17);
      mapRoomLinks.forEach(({ roomId, href, label, title, targetExists }) => {
        assert.equal(href, `https://openblues.pl/accommodation/#room-${roomId}`);
        assert.ok(label && label === title);
        assert.equal(targetExists, true, `${roomId} map link has no room-card target`);
      });

      const mapActionNames = await page.locator('.stay-map-panel__actions a').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
      assert.equal(mapActionNames.length, 8);
      assert.equal(new Set(mapActionNames).size, 8, 'map open/download links need unique accessible names');
      const mapActionPaths = await page.locator('.stay-map-panel__actions a').evaluateAll((nodes) => nodes.map((node) => new URL(node.href).pathname));
      assert.deepEqual(mapActionPaths, expectedMapPaths.flatMap((mapPath) => [mapPath, mapPath]));

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

      if (roomBrowserUrl) {
        const primaryHref = await page.locator('.stay-primary').getAttribute('href');
        const finalHref = await page.locator('.stay-final__actions .btn').getAttribute('href');
        assertSheetLink(primaryHref, roomBrowserGid);
        assertSheetLink(finalHref, roomBrowserGid);
        if (roomBrowserInstructionsUrl) {
          const startHref = await page.getByRole('link', { name: /Read the Sheet instructions first/ }).getAttribute('href');
          assert.equal(startHref, roomBrowserInstructionsUrl);
        }
        assert.equal(await page.locator('.stay-actions a').count(), 1);

        const sheetLinks = await page.locator(`a[href*="${sheetId}"]`).evaluateAll((nodes) => nodes.map((node) => node.href));
        assert.equal(sheetLinks.length, roomBrowserInstructionsUrl ? 21 : 20);
        assert.equal(sheetLinks.every((href) => href.includes(sheetId)), true);
        const roomSheetLinks = await page.locator('.stay-room-card__body a').evaluateAll((nodes) => nodes.map((node) => node.href));
        assert.equal(roomSheetLinks.length, 18);
        roomSheetLinks.forEach((href, index) => {
          const fragment = new URLSearchParams(new URL(href).hash.slice(1));
          assert.equal(fragment.get('gid'), roomBrowserGid);
          assert.equal(fragment.get('range'), expectedRoomRanges[index]);
        });
        const roomLinkA11y = await page.locator('.stay-room-card__body a').evaluateAll((nodes) => nodes.map((node) => ({
          label: node.getAttribute('aria-label'),
          height: node.getBoundingClientRect().height
        })));
        assert.equal(new Set(roomLinkA11y.map(({ label }) => label)).size, 18);
        assert.equal(roomLinkA11y.every(({ label }) => /live in the Sheet$/.test(label || '')), true);
        assert.equal(roomLinkA11y.every(({ height }) => height >= 44), true, `room Sheet link shorter than 44px at ${width}px`);
      } else {
        // Closed state: no Sheet link anywhere, a plain statement instead of the CTA, no per-room links.
        assert.equal(await page.locator('a[href*="docs.google.com"]').count(), 0, 'no Sheet link may appear while roomBrowserURL is empty');
        assert.equal(await page.locator('.stay-actions a').count(), 0);
        assert.equal(await page.locator('.stay-room-card__body a').count(), 0);
        assert.equal(await page.locator('[data-room-browser="closed"]').count(), 2);
        assert.equal(await page.locator('.stay-final__actions .stay-closed-note').count(), 1);
        assert.match(await page.locator('.stay-actions .stay-primary').textContent(), /Room Browser is not open yet.*accepted participants/s);
        assert.equal(await page.getByRole('link', { name: /Read the Sheet instructions first/ }).count(), 0);
      }
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
      assert.doesNotMatch(bodyText, /regist(?:er|ration)|68Y72P|Open Blues 2026/i);

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
    assert.equal(await noScriptPage.locator('.stay-map-panel__scroll > svg.stay-map-art').count(), 4);
    const noScriptMapLinks = await noScriptPage.locator('svg.stay-map-art a[data-room]').evaluateAll((nodes) => nodes.map((node) => {
      const href = node.getAttribute('href');
      return {
        roomId: node.getAttribute('data-room'),
        href,
        targetExists: Boolean(document.getElementById(href.split('#')[1]))
      };
    }));
    assert.deepEqual(noScriptMapLinks.map(({ roomId }) => roomId), mappedRooms);
    noScriptMapLinks.forEach(({ roomId, href, targetExists }) => {
      assert.equal(href, `https://openblues.pl/accommodation/#room-${roomId}`);
      assert.equal(targetExists, true);
    });
    if (roomBrowserUrl) {
      assertSheetLink(await noScriptPage.locator('.stay-primary').getAttribute('href'), roomBrowserGid);
    } else {
      assert.equal(await noScriptPage.locator('a[href*="docs.google.com"]').count(), 0);
    }
    await assertNoHorizontalOverflow(noScriptPage, 'no-JavaScript 390px');
    await noScriptContext.close();

    process.stdout.write(`PASS: static accommodation field guide loaded at 5 viewports with exact rooms, maps, photos, Room Browser ${roomBrowserUrl ? 'links' : 'closed state'}, privacy and no legacy runtime.\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
