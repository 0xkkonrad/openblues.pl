// The 2027 price grid, resolved for the QA suite.
//
// Two entry points, on purpose:
//   require('./prices')  — always resolves. Uses spec/2027-spec.json when it exists and falls
//                          back to POLICY.md's grid when it does not, reporting which in
//                          `provenance`. Use this when a missing contract should not stop a
//                          check that POLICY alone can already answer.
//   require('./spec')    — the strict door. Throws "spec not found at <path>" when the contract
//                          file is absent, for checks that are only meaningful against it
//                          (byte-identical option labels, question order, prefill ids).
//
// SOURCE OF TRUTH is projects/openblues-2027/spec/2027-spec.json (written by W1). Nothing in
// this file may invent a price: every number below is read out of that file and then
// CROSS-CHECKED against the price grid in POLICY.md's "Fixed values" table. Two independent
// documents agreeing is the only reason to trust either — divergence between artifacts is this
// project's most common bug, and this loader is where it gets caught instead of shipped.
//
// Resolution order for the spec file:
//   1. $OPENBLUES_SPEC                                     (explicit, wins)
//   2. ../../../projects/openblues-2027/spec/2027-spec.json (the dev worktree layout)
// Same for POLICY.md via $OPENBLUES_POLICY.
//
// If the spec exists but its shape is one this loader cannot read, it throws with the path it
// tried and what it found. If the spec does not exist yet, it degrades to POLICY.md's grid alone
// and every consumer prints `provenance` saying so — a green run must never be mistaken for a
// spec-checked run. What it never does is fall back to a grid hard-coded in this file: a QA suite
// that invents the numbers it is checking proves nothing.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultProjectDir = path.resolve(repoRoot, '..', '..', 'projects', 'openblues-2027');

const specPath = process.env.OPENBLUES_SPEC || path.join(defaultProjectDir, 'spec', '2027-spec.json');
const policyPath = process.env.OPENBLUES_POLICY || path.join(defaultProjectDir, 'POLICY.md');

function must(condition, message) {
  if (!condition) throw new Error(`SPEC CONTRACT: ${message}`);
}

// ---------------------------------------------------------------------------------------------
// Reading the spec
// ---------------------------------------------------------------------------------------------

function loadSpec() {
  // The spec is the contract and is preferred. When it does not exist yet, fall back to the
  // OTHER authoritative document — POLICY.md's Fixed values grid — rather than to a hard-coded
  // table, and say so in every PASS line so nobody reads a green run as more than it is. The
  // one thing this must never do is invent a price of its own.
  if (!fs.existsSync(specPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (error) {
    throw new Error(`SPEC CONTRACT: ${specPath} is not valid JSON: ${error.message}`);
  }
  return parsed;
}

// Walk every string in the spec, remembering where it came from, so a label can be reported
// with its JSON path when it breaks the price-label contract.
function walkStrings(node, at, out) {
  if (typeof node === 'string') {
    out.push({ at, value: node });
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => walkStrings(child, `${at}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) walkStrings(child, at ? `${at}.${key}` : key, out);
  }
  return out;
}

// Euro amounts in a string. Accepts "€70", "€ 70", "EUR 70" and "70 EUR" — the spec, the .gs
// builder and the sheet regex have each used a different one of those at some point.
const EURO_PATTERN = /(?:€\s?(\d+(?:[.,]\d+)?)|(?:\bEUR\s?(\d+(?:[.,]\d+)?))|(?:\b(\d+(?:[.,]\d+)?)\s?EUR\b))/g;

function euroAmounts(text) {
  const found = [];
  for (const match of String(text).matchAll(EURO_PATTERN)) {
    const raw = match[1] || match[2] || match[3];
    found.push(Number(String(raw).replace(',', '.')));
  }
  return found;
}

// Known key paths first; a keyword scan second. Whichever fires, the result is cross-checked
// against POLICY.md below, so a wrong guess cannot pass silently.
function readPrices(spec) {
  const buckets = [spec.prices, spec.pricing, spec.priceGrid, spec.grid, spec.money].filter(Boolean);
  const pick = (...names) => {
    for (const bucket of buckets) {
      for (const name of names) {
        const value = bucket[name];
        if (typeof value === 'number') return value;
        if (value && typeof value === 'object' && typeof value.price === 'number') return value.price;
        if (typeof value === 'string' && euroAmounts(value).length === 1) return euroAmounts(value)[0];
      }
    }
    return undefined;
  };

  const prices = {
    floor: pick('floor', 'floorTier', 'floor_eur', 'tent'),
    shared: pick('shared', 'sharedPerPerson', 'shared_eur', 'sharedPerson'),
    single: pick('single', 'single_eur'),
    sunday: pick('sunday', 'sundayNight', 'sunday_eur'),
    reservation: pick('reservation', 'reservationPayment', 'reservation_eur'),
  };

  let donations = buckets.map((b) => b.donations || b.donation || b.donationRungs).find(Array.isArray);
  if (donations) {
    donations = donations.map((entry) => {
      if (typeof entry === 'number') return entry;
      if (entry && typeof entry === 'object') {
        if (typeof entry.price === 'number') return entry.price;
        if (typeof entry.amount === 'number') return entry.amount;
        if (typeof entry.label === 'string') {
          const amounts = euroAmounts(entry.label);
          return amounts.length === 1 ? amounts[0] : 0;
        }
      }
      if (typeof entry === 'string') {
        const amounts = euroAmounts(entry);
        return amounts.length === 1 ? amounts[0] : 0;
      }
      return undefined;
    });
  }

  // Keyword fallback over every string in the document, for a spec shape this loader has not
  // seen. Only strings carrying exactly one euro amount are eligible — anything else would be
  // prose, and prose is allowed as many numbers as it likes.
  if (Object.values(prices).some((v) => v === undefined) || !donations) {
    const singles = walkStrings(spec, '', []).filter((s) => euroAmounts(s.value).length === 1);
    const findBy = (test) => {
      const hit = singles.find((s) => test(s.value));
      return hit ? euroAmounts(hit.value)[0] : undefined;
    };
    prices.floor ??= findBy((v) => /\bfloor\b/i.test(v) || /\btent\b/i.test(v));
    prices.shared ??= findBy((v) => /\bshared\b/i.test(v));
    prices.single ??= findBy((v) => /\bsingle\b/i.test(v));
    prices.sunday ??= findBy((v) => /\bsunday\b/i.test(v));
    prices.reservation ??= findBy((v) => /reservation payment/i.test(v));
    if (!donations) {
      const rungs = singles.filter((s) => /donat/i.test(s.value)).map((s) => euroAmounts(s.value)[0]);
      if (rungs.length) donations = [...new Set(rungs)].sort((a, b) => b - a).concat(0);
    }
  }

  const missing = Object.entries(prices).filter(([, v]) => typeof v !== 'number').map(([k]) => k);
  must(missing.length === 0,
    `could not read ${missing.join(', ')} out of ${specPath}. ` +
    'Add them under a top-level "prices" object, or set OPENBLUES_SPEC to a spec that has them.');
  must(Array.isArray(donations) && donations.every((d) => typeof d === 'number'),
    `could not read the donation rungs out of ${specPath} (expected prices.donations: [100, 50, 20, 0]).`);

  prices.donations = [...new Set(donations)].sort((a, b) => b - a);
  return prices;
}

// ---------------------------------------------------------------------------------------------
// Cross-check: POLICY.md's "Fixed values" price table
// ---------------------------------------------------------------------------------------------

function policyGrid() {
  must(fs.existsSync(policyPath), `POLICY.md not found at ${policyPath} (set OPENBLUES_POLICY).`);
  const policy = fs.readFileSync(policyPath, 'utf8');
  const rowFor = (test) => {
    const row = policy.split('\n').find((line) => line.trim().startsWith('|') && test(line));
    if (!row) return undefined;
    // The price lives in the last cell; the label cell may carry a date range or a "for two".
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    const amounts = euroAmounts(cells[cells.length - 1]);
    return amounts.length ? amounts : undefined;
  };
  const one = (test) => {
    const amounts = rowFor(test);
    return amounts && amounts.length === 1 ? amounts[0] : undefined;
  };
  const grid = {
    floor: one((l) => /\bfloor\b/i.test(l)),
    shared: one((l) => /\bshared\b/i.test(l)),
    single: one((l) => /\bsingle\b/i.test(l)),
    sunday: one((l) => /sunday night/i.test(l)),
    reservation: one((l) => /reservation payment/i.test(l)),
    donations: rowFor((l) => /donation/i.test(l)),
  };
  const missing = Object.entries(grid).filter(([, v]) => v === undefined).map(([k]) => k);
  must(missing.length === 0,
    `POLICY.md's Fixed values price table no longer parses (missing: ${missing.join(', ')}). ` +
    'Either the table changed shape or a row was dropped; fix POLICY.md or this parser, ' +
    'but do not delete the cross-check.');
  grid.donations = [...new Set(grid.donations)].sort((a, b) => b - a);
  return grid;
}

function crossCheck(prices, grid) {
  for (const key of ['floor', 'shared', 'single', 'sunday', 'reservation']) {
    must(prices[key] === grid[key],
      `${key}: spec says €${prices[key]}, POLICY.md says €${grid[key]}. ` +
      'One of them is wrong and no downstream artifact can be trusted until they agree.');
  }
  const specRungs = prices.donations.filter((d) => d > 0);
  must(JSON.stringify(specRungs) === JSON.stringify(grid.donations),
    `donation rungs: spec says [${specRungs}], POLICY.md says [${grid.donations}].`);
}

// ---------------------------------------------------------------------------------------------
// The price-label contract
// ---------------------------------------------------------------------------------------------

// "Every priced option label carries exactly one euro amount, and it is that option's price."
// Enforced here over every option label the spec carries, whatever shape it is stored in: the
// sheet re-derives money by regex-extracting that amount, so a second figure mis-prices silently.
function optionLabels(spec) {
  const labels = [];
  const visit = (node, at) => {
    if (Array.isArray(node)) return node.forEach((child, i) => visit(child, `${at}[${i}]`));
    if (!node || typeof node !== 'object') return;
    // An "option-shaped" object: has a label/text/title AND a numeric price/amount.
    const label = node.label ?? node.text ?? node.option ?? node.value;
    const price = node.price ?? node.amount ?? node.eur;
    if (typeof label === 'string' && typeof price === 'number') labels.push({ at, label, price });
    for (const [key, child] of Object.entries(node)) visit(child, at ? `${at}.${key}` : key);
  };
  visit(spec, '');
  return labels;
}

function assertPriceLabelContract(spec) {
  const labels = optionLabels(spec);
  const violations = [];
  for (const { at, label, price } of labels) {
    const amounts = euroAmounts(label);
    if (price === 0) {
      // A free option may carry "€0" or no figure at all, but never a second number.
      if (amounts.length > 1 || (amounts.length === 1 && amounts[0] !== 0)) {
        violations.push(`${at}: free option "${label}" carries ${amounts.join(', ')}`);
      }
      continue;
    }
    if (amounts.length !== 1) {
      violations.push(`${at}: "${label}" carries ${amounts.length} euro amounts (${amounts.join(', ')}), must carry exactly 1`);
    } else if (amounts[0] !== price) {
      violations.push(`${at}: "${label}" says €${amounts[0]} but its price is €${price}`);
    }
  }
  must(violations.length === 0, `price-label contract broken:\n  ${violations.join('\n  ')}`);
  return labels.length;
}

// ---------------------------------------------------------------------------------------------
// The 24 canonical cases
// ---------------------------------------------------------------------------------------------

// 3 accommodation tiers x 2 Sunday states x 4 donation rungs. Cash brought to the venue is
// tier + Sunday + donation; the total contribution adds the €50 already transferred. There is
// no fifth number (POLICY, Fixed values).
function canonicalCases(prices) {
  const tiers = [
    { key: 'floor', price: prices.floor },
    { key: 'shared', price: prices.shared },
    { key: 'single', price: prices.single },
  ];
  const sundays = [
    { key: 'no', price: 0 },
    { key: 'yes', price: prices.sunday },
  ];
  const donations = prices.donations.map((amount) => ({ key: String(amount), price: amount }));
  must(donations.length === 4, `expected 4 donation rungs (100/50/20/none), got ${donations.length}`);

  const cases = [];
  for (const tier of tiers) {
    for (const sunday of sundays) {
      for (const donation of donations) {
        const cash = tier.price + sunday.price + donation.price;
        cases.push({
          id: `${tier.key}+sunday-${sunday.key}+donation-${donation.key}`,
          tier: tier.key,
          tierPrice: tier.price,
          sunday: sunday.key === 'yes',
          sundayPrice: sunday.price,
          donation: donation.price,
          cash,
          reservation: prices.reservation,
          total: cash + prices.reservation,
        });
      }
    }
  }
  must(cases.length === 24, `expected 24 canonical cases, built ${cases.length}`);
  return cases;
}

const spec = loadSpec();
const grid = policyGrid();
const prices = spec ? readPrices(spec) : { ...grid, donations: [...grid.donations, 0] };
if (spec) crossCheck(prices, grid);
const labelCount = spec ? assertPriceLabelContract(spec) : 0;

// One line every consumer prints, so a PASS can never be mistaken for more than it proves.
const provenance = spec
  ? `prices from ${specPath}, cross-checked against POLICY.md (${labelCount} priced labels)`
  : `prices from POLICY.md only — ${specPath} does not exist yet, so no spec labels were checked`;

module.exports = {
  specPath,
  policyPath,
  spec,
  hasSpec: Boolean(spec),
  prices,
  labelCount,
  provenance,
  euroAmounts,
  cases: canonicalCases(prices),
};
