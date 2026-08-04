const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://127.0.0.1:3118/accommodation/';
const outputDir = process.env.OPENBLUES_QA_OUTPUT || '/tmp/openblues-qa';
const firstClaimKey = 'v1_10ca49dd8ff89d1da5aaec6059b0d38e';
const firstSpotId = 'opposite-upstairs-3-spot-d';
const seededRosterKey = 'seed_v1_c005ed454898ef303be887de3771d343';
const seededSpotId = 'castle-downstairs-b1-spot-b';

fs.mkdirSync(outputDir, { recursive: true });

function emptyRoster() {
  return {
    version: '0.6',
    status: 'ok',
    table: { cols: [{ id: 'Col0', label: '', type: 'string' }], rows: [] }
  };
}

function rosterWith(rows, withStatus = false) {
  const cols = [
    { id: 'A', label: 'claim_key', type: 'string' },
    { id: 'B', label: 'spot_id', type: 'string' },
    { id: 'C', label: 'room', type: 'string' },
    { id: 'D', label: 'place', type: 'string' },
    { id: 'E', label: 'Public display name', type: 'string' },
    { id: 'F', label: 'Registration check', type: 'string' },
    { id: 'G', label: 'Registration check confirmation', type: 'boolean' },
    { id: 'H', label: 'Public roster', type: 'string' },
    { id: 'I', label: 'Public roster confirmation', type: 'boolean' }
  ];
  if (withStatus) cols.push({ id: 'J', label: 'claim_status', type: 'string' });
  return {
    version: '0.6',
    status: 'ok',
    table: {
      cols,
      rows: rows.map(([claimKey, spotId, displayName, status]) => ({
        c: [claimKey, spotId, '', '', displayName, '', '', '', '', status]
          .slice(0, withStatus ? 10 : 9)
          .map((value) => ({ v: value }))
      }))
    }
  };
}

async function routePicker(page, { integrationReady = false, roster = emptyRoster(), failRoster = false } = {}) {
  await page.route('**/accommodation/', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(
      /data-roster-integration-ready=(?:"(?:true|false)"|true|false)/,
      `data-roster-integration-ready="${integrationReady}"`
    );
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  await page.route('https://docs.google.com/spreadsheets/**', async (route) => {
    if (failRoster) return route.abort('failed');
    const requested = new URL(route.request().url());
    const tqx = requested.searchParams.get('tqx') || '';
    const callback = tqx.match(/responseHandler:([A-Za-z0-9_$]+)/)?.[1] || 'openBluesAccommodationRosterV1';
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: `${callback}(${JSON.stringify(roster)});`
    });
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} overflows horizontally: ${JSON.stringify(dimensions)}`);
}

async function assertLaunchGate(page) {
  const actions = page.locator('[data-claim-action]');
  assert.equal(await actions.count(), 20);
  for (let index = 0; index < 20; index += 1) {
    const action = actions.nth(index);
    assert.equal(await action.getAttribute('href'), null);
    assert.equal(await action.getAttribute('aria-disabled'), 'true');
    assert.equal(await action.getAttribute('tabindex'), '-1');
  }
}

async function openPicker(page, options) {
  await routePicker(page, options);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
      const page = await context.newPage();
      await openPicker(page);
      assert.equal(await page.locator('[data-room]').count(), 18);
      assert.equal(await page.locator('[data-slot]').count(), 57);
      assert.equal(await page.locator('[data-slot][data-initial-status="occupied"]').count(), 31);
      assert.equal(await page.locator('[data-slot][data-initial-status="blocked"]').count(), 4);
      assert.equal(await page.locator('[data-slot][data-initial-status="reserved-unknown"]').count(), 2);
      assert.equal(await page.locator('[data-slot][data-initial-status="occupied"] [data-occupant]').evaluateAll(
        (nodes) => nodes.every((node) => node.textContent.trim() === 'Claimed')), true);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive, nosnippet');
      assert.equal(await page.locator('meta[name="referrer"]').getAttribute('content'), 'no-referrer');
      await assertLaunchGate(page);
      assert.match(await page.locator('[data-live-message]').textContent(), /Claiming opens after the roster connection is verified/);
      const photos = page.locator('[data-room-photo] img');
      assert.equal(await photos.count(), 17);
      for (let index = 0; index < await photos.count(); index += 1) {
        const photo = photos.nth(index);
        await photo.scrollIntoViewIfNeeded();
        await photo.evaluate((image) => image.decode ? image.decode() : new Promise((resolve, reject) => {
          if (image.complete && image.naturalWidth > 0) return resolve();
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', reject, { once: true });
        }));
      }
      const badImages = await photos.evaluateAll((images) =>
        images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc));
      assert.deepEqual(badImages, []);
      await assertNoHorizontalOverflow(page, `${width}px`);
      await page.screenshot({ path: path.join(outputDir, `picker-${width}.png`), fullPage: true });
      await context.close();
    }

    const filterContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const filterPage = await filterContext.newPage();
    await openPicker(filterPage, {
      integrationReady: true,
      roster: rosterWith([[seededRosterKey, seededSpotId, 'Kásîa']])
    });
    const search = filterPage.locator('[data-friend-search]');
    await search.fill('kásîa');
    assert.equal(await filterPage.locator('[data-room]:visible').count(), 1);
    assert.equal(await filterPage.locator('[data-room]:visible').getAttribute('data-room-id'), 'castle-downstairs-b1');
    await search.fill('Марія');
    assert.equal(await filterPage.locator('[data-room]:visible').count(), 0);
    assert.equal(await filterPage.locator('[data-no-results]').isVisible(), true);
    await filterPage.locator('[data-filters]').evaluate((form) => form.reset());
    await filterPage.locator('[data-available-filter]').check();
    const availableRooms = await filterPage.locator('[data-room]:visible').count();
    assert.ok(availableRooms > 0 && availableRooms < 18);
    await filterContext.close();

    const failureContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const failurePage = await failureContext.newPage();
    await openPicker(failurePage, { failRoster: true });
    await failurePage.locator('[data-roster-retry]:visible').waitFor();
    assert.match(await failurePage.locator('[data-live-message]').textContent(), /claiming is paused/i);
    await assertLaunchGate(failurePage);
    await failureContext.close();

    const enabledContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const enabledPage = await enabledContext.newPage();
    await openPicker(enabledPage, { integrationReady: true, roster: rosterWith([]) });
    const enabledActions = enabledPage.locator('[data-claim-action][href]');
    assert.equal(await enabledActions.count(), 20);
    const firstUrl = new URL(await enabledActions.first().getAttribute('href'));
    assert.equal(firstUrl.origin, 'https://tally.so');
    assert.equal(firstUrl.pathname, '/r/rjQKYM');
    assert.equal(firstUrl.searchParams.get('claim_key'), firstClaimKey);
    assert.equal(firstUrl.searchParams.get('spot_id'), firstSpotId);
    assert.ok(firstUrl.searchParams.get('room'));
    assert.ok(firstUrl.searchParams.get('place'));
    await enabledContext.close();

    const emptySchemaContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const emptySchemaPage = await emptySchemaContext.newPage();
    await openPicker(emptySchemaPage, { integrationReady: true });
    await emptySchemaPage.locator('[data-roster-retry]:visible').waitFor();
    assert.match(await emptySchemaPage.locator('[data-live-message]').textContent(), /unexpected data/i);
    await assertLaunchGate(emptySchemaPage);
    await emptySchemaContext.close();

    const hostileName = '<img src=x onerror="window.__openBluesXss=true">';
    const claimContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const claimPage = await claimContext.newPage();
    await openPicker(claimPage, {
      integrationReady: true,
      roster: rosterWith([
        ['stale_v0_key', 'irrelevant-spot', 'Old QA'],
        [firstClaimKey, 'tampered-other-spot', hostileName],
        [firstClaimKey, firstSpotId, 'Duplicate ignored']
      ])
    });
    const claimedSlot = claimPage.locator(`[data-claim-key="${firstClaimKey}"]`);
    assert.equal(await claimedSlot.getAttribute('data-status'), 'occupied');
    assert.equal(await claimedSlot.locator('[data-occupant]').textContent(), hostileName);
    assert.equal(await claimedSlot.locator('img').count(), 0);
    assert.equal(await claimPage.evaluate(() => window.__openBluesXss), undefined);
    assert.equal(await claimPage.locator('[data-claim-action][href]').count(), 19);
    await claimContext.close();

    const cancelContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const cancelPage = await cancelContext.newPage();
    await openPicker(cancelPage, {
      integrationReady: true,
      roster: rosterWith([
        [firstClaimKey, firstSpotId, 'Temporary claim', ''],
        [firstClaimKey, firstSpotId, 'Temporary claim', 'cancelled']
      ], true)
    });
    assert.equal(await cancelPage.locator(`[data-claim-key="${firstClaimKey}"]`).getAttribute('data-status'), 'available');
    assert.equal(await cancelPage.locator('[data-claim-action][href]').count(), 20);
    await cancelContext.close();

    const invalidContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const invalidPage = await invalidContext.newPage();
    await openPicker(invalidPage, {
      integrationReady: true,
      roster: { version: '0.6', status: 'ok', table: { cols: [{ id: 'A', label: 'wrong' }], rows: [{ c: [{ v: 'bad' }] }] } }
    });
    await invalidPage.locator('[data-roster-retry]:visible').waitFor();
    assert.match(await invalidPage.locator('[data-live-message]').textContent(), /unexpected data/i);
    await assertLaunchGate(invalidPage);
    await invalidContext.close();

    // A previously successful page must fail closed while a returning tab
    // refreshes. Hold the second roster response to inspect the in-flight state.
    const staleContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const stalePage = await staleContext.newPage();
    let rosterRequests = 0;
    let releaseSecondRequest;
    const secondRequestReleased = new Promise((resolve) => { releaseSecondRequest = resolve; });
    let signalSecondRequest;
    const secondRequestStarted = new Promise((resolve) => { signalSecondRequest = resolve; });
    await stalePage.route('**/accommodation/', async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      body = body
        .replace(/data-roster-integration-ready=(?:"(?:true|false)"|true|false)/, 'data-roster-integration-ready="true"')
        .replace(/data-roster-poll=(?:"30000"|30000)/, 'data-roster-poll="150"');
      await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
    await stalePage.route('https://docs.google.com/spreadsheets/**', async (route) => {
      rosterRequests += 1;
      if (rosterRequests === 2) {
        signalSecondRequest();
        await secondRequestReleased;
      }
      const requested = new URL(route.request().url());
      const callback = (requested.searchParams.get('tqx') || '').match(/responseHandler:([A-Za-z0-9_$]+)/)?.[1];
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: `${callback}(${JSON.stringify(rosterWith([]))});`
      });
    });
    await stalePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await stalePage.locator('[data-claim-action][href]').first().waitFor();
    assert.equal(await stalePage.locator('[data-claim-action][href]').count(), 20);
    await secondRequestStarted;
    assert.equal(await stalePage.locator('[data-claim-action][href]').count(), 0);
    assert.match(await stalePage.locator('[data-live-message]').textContent(), /Checking the latest claims/);
    releaseSecondRequest();
    await stalePage.locator('[data-claim-action][href]').first().waitFor();
    assert.equal(await stalePage.locator('[data-claim-action][href]').count(), 20);
    await staleContext.close();

    const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noScriptPage = await noScriptContext.newPage();
    await noScriptPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    assert.equal(await noScriptPage.locator('.ac-noscript').isVisible(), true);
    assert.match(await noScriptPage.locator('.ac-noscript').textContent(), /Live claiming needs JavaScript/);
    await assertNoHorizontalOverflow(noScriptPage, 'no-JavaScript 390px');
    await noScriptContext.close();

    process.stdout.write('PASS: accommodation picker browser QA completed across 5 viewports and live/failure/adversarial/stale-refresh states.\n');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
