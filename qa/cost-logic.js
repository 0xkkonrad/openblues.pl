// The /cost/ calculator's arithmetic, driven headlessly over all 24 canonical cases.
//
// qa/cost-calculator.js drives the rendered page in a browser. This drives the same code as a
// module — no build, no browser, no server — so a wrong number is caught in a second rather than
// after a Playwright run, and so the price-label contract is enforced on data/formprefill.json
// itself.
//
// THE EXPECTATIONS BELOW ARE WRITTEN OUT BY HAND, all 24 of them, from POLICY.md's "Fixed values"
// grid. They are deliberately NOT recomputed from the same data the calculator reads: a test that
// derives its expectations from the thing under test proves only that addition is associative.
//   Floor €70 · Shared €110 pp · Single €160 · Sunday €50 flat · donation €100/€50/€20/none ·
//   Reservation Payment €50, transferred at signup and not part of the cash.
//
// When projects/openblues-2027/spec/2027-spec.json exists, qa/spec.js is loaded as well and the
// 24 cases it derives must agree with these, case for case. The spec is the contract; this file
// is a second, independent statement of it, and two independent statements agreeing is the only
// reason to trust either.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'formprefill.json'), 'utf8'));
const cost = require(path.join(repoRoot, 'assets', 'js', 'cost.js'));

// --- the grid, restated by hand from POLICY.md ------------------------------------------------

const GRID = {
  floor: 70,
  shared: 110,
  single: 160,
  sunday: 50,
  donations: { d100: 100, d50: 50, d20: 20, none: 0 },
  reservation: 50,
};

// tier key -> option key in data/formprefill.json, and the Sunday pair.
const TIER = { floor: 'floor', shared: 'shared', single: 'single' };
const SUNDAY = { no: 'leaving', yes: 'staying' };

// [tier, sunday, donation, cash to bring, total contribution] — 3 x 2 x 4 = 24, written out.
const CASES = [
  ['floor', 'no', 'd100', 170, 220],
  ['floor', 'no', 'd50', 120, 170],
  ['floor', 'no', 'd20', 90, 140],
  ['floor', 'no', 'none', 70, 120],
  ['floor', 'yes', 'd100', 220, 270],
  ['floor', 'yes', 'd50', 170, 220],
  ['floor', 'yes', 'd20', 140, 190],
  ['floor', 'yes', 'none', 120, 170],
  ['shared', 'no', 'd100', 210, 260],
  ['shared', 'no', 'd50', 160, 210],
  ['shared', 'no', 'd20', 130, 180],
  ['shared', 'no', 'none', 110, 160],
  ['shared', 'yes', 'd100', 260, 310],
  ['shared', 'yes', 'd50', 210, 260],
  ['shared', 'yes', 'd20', 180, 230],
  ['shared', 'yes', 'none', 160, 210],
  ['single', 'no', 'd100', 260, 310],
  ['single', 'no', 'd50', 210, 260],
  ['single', 'no', 'd20', 180, 230],
  ['single', 'no', 'none', 160, 210],
  ['single', 'yes', 'd100', 310, 360],
  ['single', 'yes', 'd50', 260, 310],
  ['single', 'yes', 'd20', 230, 280],
  ['single', 'yes', 'none', 210, 260],
];

const fail = [];
const check = (ok, message) => { if (!ok) fail.push(message); };

// --- 1. the price-label contract, on the data file itself -------------------------------------
//
// "Every priced option label carries exactly one euro amount, and it is that option's price."
// The sheet re-derives money by extracting that amount, so a second figure mis-prices silently.

let labelCount = 0;
for (const question of config.questions) {
  for (const option of question.options) {
    labelCount += 1;
    const amounts = String(option.label).match(/€\s?\d+/g) || [];
    check(amounts.length === 1,
      `price-label contract: ${question.key}/${option.key} label "${option.label}" carries ` +
      `${amounts.length} euro amounts; it must carry exactly one.`);
  }
}
check((String(config.reservationLabel).match(/€\s?\d+/g) || []).length === 1,
  `reservationLabel "${config.reservationLabel}" must carry exactly one euro amount.`);

// A broken label must throw, not guess. This is the failure mode that would ship silently.
assert.throws(() => cost.priceOf('Floor — normally €120, now €70'), /PRICE LABEL CONTRACT/,
  'a label with two euro amounts must throw, not pick one');
assert.throws(() => cost.priceOf('Floor'), /PRICE LABEL CONTRACT/,
  'a priced label with no euro amount must throw');

// --- 2. the data file agrees with the hand-written grid ---------------------------------------

const priceIn = (questionKey, optionKey) => {
  const question = config.questions.find((q) => q.key === questionKey);
  const option = question.options.find((o) => o.key === optionKey);
  return cost.priceOf(option.label);
};

for (const [tier, expected] of [['floor', GRID.floor], ['shared', GRID.shared], ['single', GRID.single]]) {
  check(priceIn('accommodation', TIER[tier]) === expected,
    `data/formprefill.json prices ${tier} at €${priceIn('accommodation', TIER[tier])}, POLICY.md says €${expected}`);
}
check(priceIn('sunday', SUNDAY.no) === 0, 'the "leaving before Sunday night" option must cost €0');
check(priceIn('sunday', SUNDAY.yes) === GRID.sunday,
  `Sunday night is €${priceIn('sunday', SUNDAY.yes)} in the data file, €${GRID.sunday} in POLICY.md`);
for (const [key, expected] of Object.entries(GRID.donations)) {
  check(priceIn('donation', key) === expected,
    `donation ${key} is €${priceIn('donation', key)} in the data file, €${expected} in POLICY.md`);
}
check(cost.priceOf(config.reservationLabel) === GRID.reservation,
  `the Reservation Payment is €${cost.priceOf(config.reservationLabel)} in the data file, €${GRID.reservation} in POLICY.md`);

// The donation rungs must be offered high-first: the ordering is the anchoring decision
// (29 Aug 2026), not a cosmetic one.
const donationOrder = config.questions.find((q) => q.key === 'donation').options.map((o) => cost.priceOf(o.label));
assert.deepEqual(donationOrder, [100, 50, 20, 0],
  'the donation menu must be offered €100 / €50 / €20 / no donation, in that order (high first).');

// --- 3. all 24 cases --------------------------------------------------------------------------

check(CASES.length === 24, `expected 24 canonical cases, this file lists ${CASES.length}`);
for (const [tier, sunday, donation, expectedCash, expectedTotal] of CASES) {
  const result = cost.calculate(config, {
    accommodation: TIER[tier],
    sunday: SUNDAY[sunday],
    donation,
  });
  const id = `${tier} + sunday-${sunday} + donation-${donation}`;
  check(result.cash === expectedCash, `${id}: cash is €${result.cash}, expected €${expectedCash}`);
  check(result.total === expectedTotal, `${id}: total is €${result.total}, expected €${expectedTotal}`);
  check(result.total === result.cash + GRID.reservation,
    `${id}: total (€${result.total}) must be the cash (€${result.cash}) plus the €${GRID.reservation} Reservation Payment`);
  check(result.lines.length === 3, `${id}: there is no fifth number — expected 3 cash lines, got ${result.lines.length}`);
}

// --- 4. the prefill deep link -----------------------------------------------------------------

const anyChoice = { accommodation: 'floor', sunday: 'leaving', donation: 'none' };

// Today: no form exists, so no link may be built. A half-wired prefill silently drops a choice.
const wired = Boolean(config.formURL) && config.questions.every((q) => /^\d+$/.test(String(q.entry)));
if (!wired) {
  check(cost.prefillURL(config, anyChoice) === '',
    'data/formprefill.json is not fully wired, so prefillURL() must return "" — never a partial link');
}

// And the shape it produces once it is wired, on a stand-in config.
const sample = JSON.parse(JSON.stringify(config));
sample.formURL = 'https://docs.google.com/forms/d/e/EXAMPLE/viewform';
sample.questions.forEach((question, i) => { question.entry = String(1000 + i); });
const url = cost.prefillURL(sample, { accommodation: 'shared', sunday: 'staying', donation: 'd20' });
check(url.startsWith('https://docs.google.com/forms/d/e/EXAMPLE/viewform?usp=pp_url&'),
  `a wired prefill link must start at the form's viewform URL with usp=pp_url; got ${url}`);
for (const [i, expected] of [
  [0, 'Shared sleeping place for two — bed or large mattress, per person — €110'],
  [1, 'Staying Sunday night — €50'],
  [2, '€20'],
]) {
  const wanted = `entry.${1000 + i}=${encodeURIComponent(expected)}`;
  check(url.includes(wanted), `the prefill link must carry ${wanted}\n  got: ${url}`);
}
// One missing id must disable the whole link, not three quarters of it.
const partial = JSON.parse(JSON.stringify(sample));
partial.questions[1].entry = '';
check(cost.prefillURL(partial, anyChoice) === '',
  'one missing entry id must disable the prefill link entirely');

// --- 5. agreement with the contract ----------------------------------------------------------
//
// qa/prices.js always resolves: it reads spec/2027-spec.json when that exists and falls back to
// POLICY.md's Fixed values grid when it does not, reporting which in `provenance`. Its 24 cases
// must agree with the 24 written out above, case for case — two independent statements of the
// same contract agreeing is the only reason to trust either.
//
// qa/spec.js is the strict door: it throws while the contract file is missing. The byte-exact
// label check needs it, because POLICY carries prices, not option labels, and a prefill value
// that is not byte-identical to the form's option label selects nothing at all.

const contract = require('./prices');
let specNote = contract.provenance;

const fromContract = new Map(contract.cases.map((c) => [`${c.tier}|${c.sunday ? 'yes' : 'no'}|${c.donation}`, c]));
check(fromContract.size === 24, `the contract derived ${fromContract.size} cases, expected 24`);
for (const [tier, sunday, donation, expectedCash, expectedTotal] of CASES) {
  const key = `${tier}|${sunday}|${GRID.donations[donation]}`;
  const contractCase = fromContract.get(key);
  check(Boolean(contractCase), `the contract has no case ${key}`);
  if (contractCase) {
    check(contractCase.cash === expectedCash,
      `${key}: the contract says cash €${contractCase.cash}, this file says €${expectedCash}`);
    check(contractCase.total === expectedTotal,
      `${key}: the contract says total €${contractCase.total}, this file says €${expectedTotal}`);
  }
}

if (contract.hasSpec) {
  const specText = JSON.stringify(contract.spec);
  for (const question of config.questions) {
    for (const option of question.options) {
      check(specText.includes(JSON.stringify(option.label).slice(1, -1)),
        `data/formprefill.json's label "${option.label}" (${question.key}/${option.key}) does not appear ` +
        'in the spec. Google Forms matches a prefill value against the option string, so a near-miss ' +
        'selects nothing and the participant lands on an empty question.');
    }
  }
} else {
  specNote += ' — PREFILL LABELS UNVERIFIED';
}

// --- 6. the three participant-facing price tables agree, and every example total is right ----
//
// Divergence between artifacts is this project's most common bug — POLICY.md's own header says
// so, and the "refunded if declined" sentence survived in three places at once. The grid is
// quoted on /cost/, on the front page and in the booklet, so all three are parsed here and must
// carry identical rows. Every worked example is RECOMPUTED through the calculator rather than
// trusted: after a price change every example is stale, and a stale example sends somebody to
// Poland with the wrong cash in their pocket.

const PRICED_PAGES = ['content/_index.md', 'content/booklet.md', 'content/cost.md'];

const expectedRows = [
  `| Floor — tent, your own mattress, or a barn mattress | €${GRID.floor} |`,
  `| Shared sleeping place for two — bed or large mattress, per person | €${GRID.shared} |`,
  `| Single sleeping place — bed or large mattress | €0 |`.replace('€0', '€' + GRID.single),
  '| Leaving before Sunday night | €0 |',
  `| Staying Sunday night, whatever you sleep on | €${GRID.sunday} |`,
];

// Every euro figure a participant-facing price page is allowed to show: the grid itself, any of
// the 24 cash figures, any of the 24 totals, and two named exceptions. Anything else is either a
// price from the grid this one replaced or an example nobody recomputed.
const allowed = new Set([
  0,
  1, // "€1 = 4.50 PLN"
  30, // "a taxi from Nysa, usually around €30–50" — not a price we set
  GRID.floor, GRID.shared, GRID.single, GRID.sunday, GRID.reservation,
  ...Object.values(GRID.donations),
  ...CASES.map(([, , , cash]) => cash),
  ...CASES.map(([, , , , total]) => total),
]);

for (const relative of PRICED_PAGES) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');

  const rows = text.split('\n').filter((line) => /^\|.*€/.test(line)).map((line) => line.trim());
  assert.deepEqual(rows, expectedRows,
    `${relative}'s price table does not match POLICY.md's grid. All three participant-facing ` +
    'surfaces must quote the same rows and no others.');

  check(text.includes('€100, €50 or €20'),
    `${relative} must offer the donation menu as "€100, €50 or €20" — high first, and no other rungs.`);
  check(text.includes('€1 = 4.50 PLN'),
    `${relative} must carry the PLN conversion rate next to its prices.`);

  for (const figure of text.match(/€\d+/g) || []) {
    const amount = Number(figure.slice(1));
    check(allowed.has(amount),
      `${relative} shows ${figure}, which is neither a 2027 price nor a total any of the 24 ` +
      'combinations produces. It is almost certainly a figure from the pre-29-Aug-2026 grid.');
  }
}

// The worked examples, recomputed here rather than copied out of the page.
const totalFor = (tier, sunday, donation) => cost.calculate(config, {
  accommodation: TIER[tier], sunday: SUNDAY[sunday], donation,
}).total;

const floorOnly = totalFor('floor', 'no', 'none');
const floorSunday = totalFor('floor', 'yes', 'none');
const sharedSunday = totalFor('shared', 'yes', 'none');
const singleSunday = totalFor('single', 'yes', 'none');

const indexMd = fs.readFileSync(path.join(repoRoot, 'content/_index.md'), 'utf8');
const bookletMd = fs.readFileSync(path.join(repoRoot, 'content/booklet.md'), 'utf8');

check(indexMd.includes(`€${floorOnly} on the floor, leaving Sunday · €${sharedSunday} in a shared bed, staying Sunday night`),
  `the front page's "at a glance" example totals are stale: they must read €${floorOnly} and €${sharedSunday}.`);
check(indexMd.includes(
  `that is €${floorOnly} for a tent, your own mattress or a barn mattress on Thursday, Friday and Saturday nights, ` +
  `leaving on Sunday; €${floorSunday} for the same with Sunday night added; €${sharedSunday} for a shared sleeping ` +
  `place with Sunday night; and €${singleSunday} for a single sleeping place with Sunday night.`),
  `the front page's representative totals are stale: they must read €${floorOnly} / €${floorSunday} / ` +
  `€${sharedSunday} / €${singleSunday}, in that order.`);
check(bookletMd.includes(
  `So the floor, leaving on Sunday, comes to €${floorOnly} including the €${GRID.reservation} Reservation Payment; ` +
  `a shared sleeping place with Sunday night added comes to €${sharedSunday}.`),
  `the booklet's worked example is stale: it must read €${floorOnly} and €${sharedSunday}.`);

// --- report -----------------------------------------------------------------------------------

if (fail.length) {
  console.error(`FAIL: ${fail.length} problem(s) in the /cost/ calculator:\n  - ${fail.join('\n  - ')}`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS: ${CASES.length} canonical cases, ${labelCount} option labels against the price-label contract, ` +
    `donation order high-first, prefill link gated. ${specNote}.\n`);
}
