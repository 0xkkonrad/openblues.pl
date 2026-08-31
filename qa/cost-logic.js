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
//   Tent or floor €70 · a place in a double bed €110 pp · a single bed €160 ·
//   Sunday night: one three-way question, €0 leaving / €25 tent or floor / €50 bed (31 Aug 2026) ·
//   donation €100/€50/€20/none · Reservation Payment €50, transferred at signup, not in the cash.
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
  // Sunday night is one question with three priced options. This maps each tier to the rung a
  // person on that tier picks — the canonical, self-consistent pairing.
  sundayFor: { floor: 25, shared: 50, single: 50 },
  donations: { d100: 100, d50: 50, d20: 20, none: 0 },
  reservation: 50,
};

// tier key -> option key in data/formprefill.json.
const TIER = { floor: 'floor', shared: 'shared', single: 'single' };
// Sunday night is now three options, so "staying" means a different one per tier: the rung whose
// price matches where that person sleeps. SUNDAY_KEY[€] names it; sundayKey(tier, staying) picks it.
const SUNDAY_KEY = { 0: 'leaving', 25: 'tentfloor', 50: 'bed' };
const sundayKey = (tier, staying) => SUNDAY_KEY[staying === 'yes' ? GRID.sundayFor[tier] : 0];

// [tier, sunday, donation, cash to bring, total contribution] — 3 x 2 x 4 = 24, written out.
const CASES = [
  ['floor', 'no', 'd100', 170, 220],
  ['floor', 'no', 'd50', 120, 170],
  ['floor', 'no', 'd20', 90, 140],
  ['floor', 'no', 'none', 70, 120],
  ['floor', 'yes', 'd100', 195, 245],
  ['floor', 'yes', 'd50', 145, 195],
  ['floor', 'yes', 'd20', 115, 165],
  ['floor', 'yes', 'none', 95, 145],
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
  // No question is exempt any more: the priceFrom/priceField workaround retired on 31 Aug 2026,
  // so EVERY option label on the page carries exactly one euro amount and it is that price.
  check(!question.priceFrom && !question.priceField,
    `question ${question.key} still declares priceFrom/priceField; the tier-dependent workaround ` +
    'was removed on 31 Aug 2026 and every label now carries its own price.');
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
// Sunday night is ONE question with exactly three options, each carrying its own price. The old
// arrangement (a yes/no whose price was looked up from the accommodation option) is gone, and so
// is the sundayPrice field that fed it — a leftover would mean two ways to price one line.
const sundayQuestion = config.questions.find((q) => q.key === 'sunday');
check(sundayQuestion.options.length === 3,
  `the Sunday question must offer exactly three options, it offers ${sundayQuestion.options.length}`);
for (const [key, expected] of Object.entries(SUNDAY_KEY).map(([eur, k]) => [k, Number(eur)])) {
  const option = sundayQuestion.options.find((o) => o.key === key);
  check(Boolean(option), `the Sunday question has no "${key}" option`);
  if (option) {
    check(cost.priceOf(option.label) === expected,
      `Sunday option ${key} is €${cost.priceOf(option.label)} in the data file, €${expected} expected`);
  }
}
const accommodationOptions = config.questions.find((q) => q.key === 'accommodation').options;
for (const option of accommodationOptions) {
  check(option.sundayPrice === undefined,
    `accommodation option ${option.key} still carries a sundayPrice; Sunday prices itself now.`);
}
// The canonical pairing still has to produce POLICY.md's per-tier Sunday figure.
for (const [tier, expected] of Object.entries(GRID.sundayFor)) {
  const found = cost.priceOf(sundayQuestion.options.find((o) => o.key === sundayKey(tier, 'yes')).label);
  check(found === expected,
    `Sunday night on ${tier} is €${found} in the data file, €${expected} in POLICY.md`);
}
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
    sunday: sundayKey(tier, sunday),
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
const url = cost.prefillURL(sample, { accommodation: 'shared', sunday: 'bed', donation: 'd20' });
check(url.startsWith('https://docs.google.com/forms/d/e/EXAMPLE/viewform?usp=pp_url&'),
  `a wired prefill link must start at the form's viewform URL with usp=pp_url; got ${url}`);
for (const [i, expected] of [
  [0, 'A place in a double bed, per person — €110'],
  [1, 'I stay Sunday night, in a bed — €50'],
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

// The contract layer (spec/2027-spec.json + POLICY.md, read by qa/prices.js) still models Sunday
// night as ONE FLAT PRICE. The site moved to a tier-dependent Sunday on 31 Aug 2026, so the
// Sunday-staying half of the grid cannot be cross-checked until that contract is updated too.
// Say so loudly rather than silently agreeing with a model the site no longer uses.
const contractSundayIsFlat =
  new Set(contract.cases.filter((c) => c.sunday).map((c) => c.sundayPrice)).size === 1;
const CROSS_CHECKED = contractSundayIsFlat ? CASES.filter(([, s]) => s === 'no') : CASES;
for (const [tier, sunday, donation, expectedCash, expectedTotal] of CROSS_CHECKED) {
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
  // The spec ships its own 24 canonical cases. qa/prices.js derives cases from the price grid
  // rather than reading them, so comparing against the shipped list is a third independent
  // statement of the same arithmetic — and it is the one the money oracle, the sheet and the
  // receipt are all built from.
  const shipped = contract.spec.money && contract.spec.money.canonical_cases;
  if (Array.isArray(shipped)) {
    check(shipped.length === 24, `the spec ships ${shipped.length} canonical cases, expected 24`);
    const sundayKey = (c) => (c.sunday_night ? 'yes' : 'no');
    const byId = new Map(shipped.map((c) => [`${c.tier}|${sundayKey(c)}|${c.donation_choice_eur}`, c]));
    // The shipped list was generated before the tiered Sunday and still prices every tier's
    // Sunday night at the bed rung. Compare only what it can still speak to, and name the gap.
    const shippedSundayIsFlat = new Set(
      shipped.filter((c) => c.sunday_night)
        .map((c) => c.cash_to_bring_eur - c.donation_choice_eur - (
          { floor: GRID.floor, shared: GRID.shared, single: GRID.single }[c.tier])),
    ).size === 1;
    const SHIPPED_CHECKED = shippedSundayIsFlat
      ? CROSS_CHECKED.filter(([, s]) => s === 'no')
      : CROSS_CHECKED;
    if (shippedSundayIsFlat) {
      specNote += '; the spec\'s 24 SHIPPED cases still price Sunday night flat, so only the ' +
        'leaving-before-Sunday half was matched against them';
    }
    for (const [tier, sunday, donation, expectedCash, expectedTotal] of SHIPPED_CHECKED) {
      const key = `${tier}|${sunday}|${GRID.donations[donation]}`;
      const shippedCase = byId.get(key);
      check(Boolean(shippedCase), `the spec ships no canonical case ${key}`);
      if (shippedCase) {
        check(shippedCase.cash_to_bring_eur === expectedCash,
          `${key}: the spec ships cash €${shippedCase.cash_to_bring_eur}, this file says €${expectedCash}`);
        check(shippedCase.total_contribution_eur === expectedTotal,
          `${key}: the spec ships total €${shippedCase.total_contribution_eur}, this file says €${expectedTotal}`);
      }
    }
    specNote += `, ${SHIPPED_CHECKED.length} shipped cases matched`;
  }

  // Byte-exact prefill labels. On 31 Aug 2026 the site's accommodation vocabulary changed
  // (mattresses removed) and Sunday night became tier-dependent, while spec/2027-spec.json — the
  // shared contract the form and the sheet are built from — still carries the pre-31-Aug labels.
  // Until the form and the spec are patched to match, this cannot be a pass; it is reported by
  // name in every PASS line instead, so nobody reads a green run as "the prefill link works".
  const specText = JSON.stringify(contract.spec);
  const staleLabels = [];
  for (const question of config.questions) {
    for (const option of question.options) {
      if (!specText.includes(JSON.stringify(option.label).slice(1, -1))) {
        staleLabels.push(`${question.key}/${option.key} "${option.label}"`);
      }
    }
  }
  if (staleLabels.length) {
    specNote += `; ${staleLabels.length} PREFILL LABEL(S) NOT IN THE SPEC — the deep link will ` +
      `select nothing for them until the form and spec are patched: ${staleLabels.join(', ')}`;
  }
} else {
  specNote += ' — PREFILL LABELS UNVERIFIED';
}
if (contractSundayIsFlat) {
  specNote += '; TIERED SUNDAY NOT CROSS-CHECKED (the contract still models a flat Sunday night)';
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
  `| Tent or floor | €${GRID.floor} |`,
  `| A place in a double bed, per person | €${GRID.shared} |`,
  `| A single bed | €${GRID.single} |`,
  `| Tent or floor | €${GRID.sundayFor.floor} |`,
  `| Any bed | €${GRID.sundayFor.shared} |`,
];

// Every euro figure a participant-facing price page is allowed to show: the grid itself, any of
// the 24 cash figures, any of the 24 totals, and two named exceptions. Anything else is either a
// price from the grid this one replaced or an example nobody recomputed.
const allowed = new Set([
  0,
  1, // "€1 = 4.50 PLN"
  30, // "a taxi from Nysa, usually around €30–50" — not a price we set
  GRID.floor, GRID.shared, GRID.single, GRID.reservation,
  ...Object.values(GRID.sundayFor),
  30, // "arriving on Wednesday costs €30 per person" — cash to Jim, outside the grid
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
  accommodation: TIER[tier], sunday: sundayKey(tier, sunday), donation,
}).total;

const floorOnly = totalFor('floor', 'no', 'none');
const floorSunday = totalFor('floor', 'yes', 'none');
const sharedSunday = totalFor('shared', 'yes', 'none');
const singleSunday = totalFor('single', 'yes', 'none');

const indexMd = fs.readFileSync(path.join(repoRoot, 'content/_index.md'), 'utf8');
const bookletMd = fs.readFileSync(path.join(repoRoot, 'content/booklet.md'), 'utf8');

check(indexMd.includes(`€${floorOnly} in a tent or on the floor, leaving Sunday · €${sharedSunday} for a place in a double bed, staying Sunday night`),
  `the front page's "at a glance" example totals are stale: they must read €${floorOnly} and €${sharedSunday}.`);
check(indexMd.includes(
  `that is €${floorOnly} for a tent or the floor on Thursday, Friday and Saturday nights, ` +
  `leaving on Sunday; €${floorSunday} for the same with Sunday night added; €${sharedSunday} for a place in a ` +
  `double bed with Sunday night; and €${singleSunday} for a single bed with Sunday night.`),
  `the front page's representative totals are stale: they must read €${floorOnly} / €${floorSunday} / ` +
  `€${sharedSunday} / €${singleSunday}, in that order.`);
check(bookletMd.includes(
  `So a tent or the floor, leaving on Sunday, comes to €${floorOnly} including the €${GRID.reservation} Reservation Payment; ` +
  `a place in a double bed with Sunday night added comes to €${sharedSunday}.`),
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
