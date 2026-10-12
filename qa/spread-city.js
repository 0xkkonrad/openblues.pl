// /spread-the-word/ — the "Bring your city" block.
//
// The page's only conversion is somebody doing one concrete thing in their own city, and the
// thing that makes it concrete is that the words are already written. So this asserts the three
// properties that carry that:
//
//   1. NO DRIFT. Every date, threshold and address inside the paste blocks comes from hugo.toml.
//      A Facebook event created off a stale description is worse than no event, and nobody would
//      ever notice it by looking at the page.
//   2. THE NAME REALLY FILLS IN. Typing a city rewrites every slot, and the clipboard receives
//      the paragraphs joined by blank lines — what somebody expects to land in an event
//      description, not the DOM's whitespace. Clearing the field restores the slot.
//   3. IT DEGRADES HONESTLY. With JavaScript off, the name field and the Copy buttons — both of
//      which would do nothing — are absent, and the blocks still read as fillable templates.
//
// Needs a served build: OPENBLUES_PREVIEW_ORIGIN (default http://localhost:3118).

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const params = require('./site-params');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const url = `${origin}/spread-the-word/`;
const siteURL = params.readParam('baseURL').replace(/\/$/, '');

async function run() {
  const browser = await chromium.launch({ headless: true });
  let assertions = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    assert.equal(await page.locator('[data-city-kit]').count(), 1, 'the city kit must render exactly once');
    assert.equal(await page.locator('.step').count(), 3, 'three steps: print, event, post');
    assert.equal(await page.locator('#city').count(), 1, 'the TOC anchor #city must exist');
    assertions += 3;

    // Every anchor the steps offer has to land somewhere. site-smoke.js checks this for the
    // whole page; naming them here is what makes a renamed socialkit group fail loudly.
    for (const anchor of ['#print', '#event-cover', '#chats']) {
      assert.equal(await page.locator(`.step-links a[href="${anchor}"]`).count(), 1,
        `a step must link to ${anchor}`);
      assert.equal(await page.locator(anchor).count(), 1, `${anchor} must exist on the page`);
    }

    // 1. No drift: the paste blocks quote hugo.toml, never their own copy of a fact.
    const blocks = {};
    for (const handle of await page.locator('[data-city-copy]').all()) {
      blocks[await handle.getAttribute('data-city-copy')] = (await handle.locator('.copy-text').innerText()).trim();
    }
    assert.deepEqual(Object.keys(blocks).sort(),
      ['A message for the group chat', 'Event description', 'Event name'],
      'the three paste blocks are the contract with data/citykit.yaml');

    const description = blocks['Event description'];
    const message = blocks['A message for the group chat'];
    for (const [name, text] of [['event description', description], ['chat message', message]]) {
      assert.ok(text.includes(params.eventDatesHuman), `${name} must carry hugo.toml's dates`);
      assert.ok(text.includes(siteURL), `${name} must carry the site's own address`);
      assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b/, `${name} must not carry a raw ISO date`);
    }
    assert.ok(description.includes(`if ${params.threshold} of us`),
      "the event description's go-ahead number must come from hugo.toml");
    assertions += 8;

    // Nothing on this page may state a rule the counter already states, or any banned wording.
    const bodyText = params.normalise(await page.locator('body').innerText());
    for (const pattern of params.banned) {
      assert.doesNotMatch(bodyText, pattern, `banned wording on /spread-the-word/: ${pattern}`);
    }
    assertions += params.banned.length;

    // 2. The name fills in. It starts as a visible, obviously-fillable slot.
    const slot = await page.locator('[data-city-slot]').first().innerText();
    assert.match(slot, /^\[.+\]$/, 'the empty slot must read as a slot, e.g. "[your city]"');
    const slotCount = await page.locator('[data-city-slot]').count();
    assert.ok(slotCount >= 5, `expected the city name in several places, found ${slotCount}`);

    const field = page.locator('[data-city-input]');
    await assert.doesNotReject(field.waitFor({ state: 'visible', timeout: 2000 }),
      'the name field must be unhidden once the script runs');
    await field.fill('Kraków');

    const filled = await page.locator('[data-city-slot]').allInnerTexts();
    assert.deepEqual([...new Set(filled)], ['Kraków'], 'every slot must take the typed city');
    assert.equal((await page.locator('[data-city-copy="Event name"] .copy-text').innerText()).trim(),
      'Kraków going to Open Blues', 'the event name is the whole idea; it must read exactly');
    assertions += 5;

    // The clipboard gets the paragraphs, joined by blank lines.
    await page.locator('[data-city-copy="Event description"] .copy-btn').click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const paragraphs = clipboard.split('\n\n');
    assert.equal(paragraphs.length, 3, 'the description is three paragraphs, blank-line separated');
    assert.ok(paragraphs.every((part) => part.trim() === part && part.length > 0),
      'no paragraph may carry the markup indentation around it');
    assert.ok(clipboard.includes('Kraków'), 'the copied text carries the typed city, not the slot');
    assert.ok(clipboard.includes('not the festival'),
      'the description must keep saying a city event is not the festival');
    await assert.doesNotReject(
      page.locator('[data-city-copy="Event description"] .copy-status').filter({ hasText: 'Copied' }).waitFor({ timeout: 2000 }),
      'a successful copy must be announced');
    assertions += 5;

    // Clearing it puts the slot back rather than leaving a hole in the sentence.
    await field.fill('');
    assert.deepEqual([...new Set(await page.locator('[data-city-slot]').allInnerTexts())], [slot],
      'clearing the field restores the slot');
    assertions += 1;

    await context.close();

    // 3. Honest degradation: no field, no buttons, still a usable template.
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 1000 } });
    const plain = await noJs.newPage();
    await plain.goto(url, { waitUntil: 'load' });
    assert.equal(await plain.locator('.copy-btn').count(), 0, 'no Copy button may exist without JS');
    assert.equal(await plain.locator('[data-city-input]').isVisible(), false,
      'the name field must stay hidden without JS — it would change nothing');
    const plainText = await plain.locator('[data-city-copy="Event name"] .copy-text').innerText();
    assert.equal(plainText.trim(), `${slot} going to Open Blues`);
    assert.ok((await plain.locator('body').innerText()).includes(params.eventDatesHuman),
      'the paste blocks are server-rendered and readable with no JS at all');
    assertions += 4;
    await noJs.close();

    process.stdout.write(`PASS: the city kit fills in, copies clean text, degrades without JS, and quotes hugo.toml (${assertions} assertions).\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
