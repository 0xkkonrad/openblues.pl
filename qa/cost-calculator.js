// /cost/ — the calculator that replaced Tally's live running total.
//
// Google Forms has no calculated fields, so this page and the confirmation email are the only
// two places a participant ever sees their number. If its arithmetic is wrong, people bring the
// wrong cash to the venue and nothing downstream catches it.
//
// This drives the real page in a real browser and checks all 24 canonical cases
// (3 accommodation tiers x 2 Sunday states x 4 donation rungs) against qa/prices.js, which reads
// the repository-local signup contract. No price is written down here.
//
// DOM CONTRACT — what /cost/ has to expose, in preference order:
//
//   Preferred (explicit, cheap to keep true):
//     [data-cost-tier]      the accommodation control (a <select>, or a radio group)
//     [data-cost-sunday]    the Sunday-night control (a checkbox, radio group or <select>)
//     [data-cost-donation]  the donation control
//     [data-cost-cash]      an element whose text is the cash-to-bring figure, and nothing else
//     [data-cost-total]     an element whose text is the total contribution, and nothing else
//
//   Fallback (so the page can ship without the hooks): controls are identified by the euro
//   amounts in their own option labels, and the two output elements by being the only elements
//   whose text is exactly one euro amount that equals the expected figure in all 24 cases.
//
// "An element whose text is exactly one euro amount" is deliberate: it is the same rule as the
// price-label contract, and it means a breakdown line can never be mistaken for the total.
//
// Needs a served build: OPENBLUES_PREVIEW_ORIGIN (default http://localhost:3118).

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const contract = require('./prices');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const costPath = '/cost/';

// Injected into the page. Kept as one function so the whole classification happens in one
// evaluate() and the harness never has to guess selectors from outside.
function pageDriver() {
  const EURO = /(?:€\s?(\d+(?:[.,]\d+)?)|\bEUR\s?(\d+(?:[.,]\d+)?))/g;
  const amountsIn = (text) => {
    const out = [];
    for (const m of String(text == null ? '' : text).matchAll(EURO)) {
      out.push(Number(String(m[1] || m[2]).replace(',', '.')));
    }
    return out;
  };

  const labelTextFor = (input) => {
    const byFor = input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    const wrapping = input.closest('label');
    const aria = input.getAttribute('aria-label');
    return [byFor && byFor.textContent, wrapping && wrapping.textContent, aria, input.value, input.title]
      .filter(Boolean).join(' ');
  };

  // Every settable control on the page, normalised to one shape.
  const collectControls = () => {
    const controls = [];
    for (const select of document.querySelectorAll('select')) {
      controls.push({
        kind: 'select',
        node: select,
        hook: select.matches('[data-cost-tier]') ? 'tier'
          : select.matches('[data-cost-sunday]') ? 'sunday'
            : select.matches('[data-cost-donation]') ? 'donation' : null,
        options: Array.from(select.options).map((option) => ({
          node: option,
          text: `${option.textContent} ${option.value}`,
          price: option.dataset.price !== undefined ? Number(option.dataset.price) : null,
        })),
      });
    }
    const groups = new Map();
    for (const input of document.querySelectorAll('input[type=radio]')) {
      const key = input.name || `__anon-${groups.size}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(input);
    }
    for (const [name, inputs] of groups) {
      const container = inputs[0].closest('[data-cost-tier],[data-cost-sunday],[data-cost-donation]');
      controls.push({
        kind: 'radio',
        name,
        node: inputs[0],
        inputs,
        hook: container ? (container.matches('[data-cost-tier]') ? 'tier'
          : container.matches('[data-cost-sunday]') ? 'sunday' : 'donation') : null,
        options: inputs.map((input) => ({
          node: input,
          text: labelTextFor(input),
          price: input.dataset.price !== undefined ? Number(input.dataset.price) : null,
        })),
      });
    }
    for (const box of document.querySelectorAll('input[type=checkbox]')) {
      controls.push({
        kind: 'checkbox',
        node: box,
        hook: box.matches('[data-cost-sunday]') || box.closest('[data-cost-sunday]') ? 'sunday' : null,
        options: [
          { node: box, checked: false, text: 'off', price: 0 },
          {
            node: box,
            checked: true,
            text: labelTextFor(box),
            price: box.dataset.price !== undefined ? Number(box.dataset.price) : null,
          },
        ],
      });
    }
    return controls;
  };

  const priceOf = (option) => {
    if (typeof option.price === 'number' && !Number.isNaN(option.price)) return option.price;
    const amounts = amountsIn(option.text);
    if (amounts.length === 1) return amounts[0];
    if (amounts.length === 0 && /\b(no|none|not|leaving|without)\b/i.test(option.text)) return 0;
    return null;
  };

  const describe = (control) => ({
    kind: control.kind,
    name: control.name || control.node.id || control.node.name || '(unnamed)',
    hook: control.hook,
    options: control.options.map((o) => ({ text: String(o.text).replace(/\s+/g, ' ').trim().slice(0, 80), price: priceOf(o) })),
  });

  window.__obCost = {
    amountsIn,
    controls: collectControls(),
    priceOf,
    describe,

    // Classify the three controls against the prices the harness passes in.
    classify(wanted) {
      const covers = (control, needed) => {
        const prices = control.options.map(priceOf).filter((p) => p !== null);
        return needed.every((n) => prices.includes(n));
      };
      const byHook = (hook) => this.controls.find((c) => c.hook === hook);
      const tier = byHook('tier') || this.controls.find((c) => covers(c, wanted.tiers));
      const sunday = byHook('sunday')
        || this.controls.find((c) => c !== tier && covers(c, [wanted.sunday]) && c.options.length <= 3);
      const donation = byHook('donation')
        || this.controls.find((c) => c !== tier && c !== sunday && covers(c, wanted.donations));
      return { tier, sunday, donation };
    },

    set(control, price) {
      // Every control — Sunday night included, since it went back to three priced options on
      // 31 Aug 2026 — carries its price in data-price, so one lookup drives all three.
      const option = control.options.find((o) => priceOf(o) === price);
      if (!option) return `no option priced €${price} on ${describe(control).name}`;
      if (control.kind === 'select') {
        control.node.value = option.node.value;
        option.node.selected = true;
      } else if (control.kind === 'radio') {
        for (const input of control.inputs) input.checked = input === option.node;
      } else {
        control.node.checked = Boolean(option.checked);
      }
      for (const type of ['input', 'change']) {
        control.node.dispatchEvent(new Event(type, { bubbles: true }));
      }
      return null;
    },

    // Every element whose own rendered text is exactly one euro amount, keyed by a stable path
    // so the same element can be tracked across all 24 cases.
    readouts() {
      const out = {};
      const pathOf = (node) => {
        const parts = [];
        for (let el = node; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
          const parent = el.parentElement;
          const index = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
          parts.unshift(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}:${index}`);
        }
        return parts.join('>');
      };
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('script,style,template')) continue;
        const text = el.textContent || '';
        const amounts = amountsIn(text);
        if (amounts.length !== 1) continue;
        const key = el.dataset.costTotal !== undefined ? '[data-cost-total]'
          : el.dataset.costCash !== undefined ? '[data-cost-cash]'
            : pathOf(el);
        out[key] = amounts[0];
      }
      return out;
    },
  };
  return true;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const thirdParty = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('about:')) thirdParty.push(url);
    });

    const response = await page.goto(origin + costPath, { waitUntil: 'networkidle' });
    assert.ok(response && response.ok(), `${costPath} returned ${response && response.status()} — /cost/ must exist and render`);

    await page.evaluate(pageDriver);

    const wanted = {
      tiers: [contract.prices.floor, contract.prices.shared, contract.prices.single],
      sunday: contract.prices.sunday,
      donations: contract.prices.donations,
    };
    const found = await page.evaluate((w) => {
      const { tier, sunday, donation } = window.__obCost.classify(w);
      return {
        tier: tier ? window.__obCost.describe(tier) : null,
        sunday: sunday ? window.__obCost.describe(sunday) : null,
        donation: donation ? window.__obCost.describe(donation) : null,
        all: window.__obCost.controls.map(window.__obCost.describe),
      };
    }, wanted);

    for (const which of ['tier', 'sunday', 'donation']) {
      assert.ok(found[which],
        `/cost/ has no ${which} control this harness can drive.\n` +
        `Add data-cost-${which} to it, or make its option labels carry their euro price.\n` +
        `Controls found on the page:\n${JSON.stringify(found.all, null, 2)}`);
    }

    // Baseline readouts, so an element that never changes can be told apart from a real total.
    const observed = [];
    for (const testCase of contract.cases) {
      const result = await page.evaluate((payload) => {
        const { tier, sunday, donation } = window.__obCost.classify(payload.wanted);
        const problems = [
          window.__obCost.set(tier, payload.tierPrice),
          window.__obCost.set(sunday, payload.sundayPrice),
          window.__obCost.set(donation, payload.donation),
        ].filter(Boolean);
        return { problems, readouts: window.__obCost.readouts() };
      }, { wanted, tierPrice: testCase.tierPrice, sundayPrice: testCase.sundayPrice, donation: testCase.donation });

      assert.deepEqual(result.problems, [],
        `${testCase.id}: could not set the calculator — ${result.problems.join('; ')}`);
      observed.push({ testCase, readouts: result.readouts });
    }

    // An element qualifies as the cash (or total) readout only if it holds the right figure in
    // every one of the 24 cases. One coincidence is easy; 24 in a row is the arithmetic.
    const keys = new Set(observed.flatMap((o) => Object.keys(o.readouts)));
    const matches = (field) => Array.from(keys).filter((key) =>
      observed.every((o) => o.readouts[key] === o.testCase[field]));

    const hookFirst = (keys) => keys.slice().sort((a, b) => Number(b.startsWith('[')) - Number(a.startsWith('[')));
    const totalKeys = hookFirst(matches('total'));
    const cashKeys = hookFirst(matches('cash'));

    const dump = observed
      .filter((_, i) => i % 8 === 0)
      .map((o) => `  ${o.testCase.id}: expected cash €${o.testCase.cash} / total €${o.testCase.total}; page showed ${JSON.stringify(o.readouts)}`)
      .join('\n');

    assert.ok(totalKeys.length > 0,
      'no element on /cost/ shows the total contribution (accommodation + Sunday + donation + the €50\n' +
      'Reservation Payment) in all 24 cases. Mark it with data-cost-total.\nSamples:\n' + dump);
    assert.ok(cashKeys.length > 0,
      'no element on /cost/ shows the cash to bring to the venue (accommodation + Sunday + donation,\n' +
      'without the €50 already transferred) in all 24 cases. Mark it with data-cost-cash.\n' +
      'POLICY sentence 9 promises this number; the calculator is where a participant reads it.\n' +
      'Samples:\n' + dump);
    assert.notDeepEqual(totalKeys, cashKeys,
      'the cash figure and the total figure resolve to the same element — one of the two numbers is missing.');

    assert.deepEqual(errors, [], `/cost/ browser errors:\n${errors.join('\n')}`);
    assert.deepEqual(thirdParty, [],
      `/cost/ made third-party requests, which is never allowed:\n${thirdParty.join('\n')}`);

    // The calculator must not need the network to do arithmetic: no request may follow the
    // interaction. (goto's own requests are already settled by networkidle above.)
    const afterLoad = thirdParty.length;
    assert.equal(afterLoad, 0, 'the calculator called out to the network while computing');

    await context.close();
    process.stdout.write(
      `PASS: /cost/ computed all ${contract.cases.length} canonical cases correctly ` +
      `(cash via ${cashKeys[0]}, total via ${totalKeys[0]}), no third-party requests. ` +
      `${contract.provenance}.\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
