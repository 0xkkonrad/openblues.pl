// The /cost/ calculator's arithmetic, driven headlessly over all 24 canonical cases.
//
// qa/cost-calculator.js drives the rendered page in a browser. This drives the same code as a
// module — no build, no browser, no server — so a wrong number is caught in a second rather than
// after a Playwright run, and so the price-label contract is enforced on data/formprefill.json
// itself.
//
// THE EXPECTATIONS BELOW ARE WRITTEN OUT BY HAND, all 24 of them. They are deliberately NOT
// recomputed from the same data the calculator reads: a test that
// derives its expectations from the thing under test proves only that addition is associative.
//   Tent or floor €70 · a place in a double bed €110 pp · a single bed €160 ·
//   Sunday night: one three-way question, €0 leaving / €25 tent or floor / €50 bed (31 Aug 2026) ·
//   donation €100/€50/€20/none · Reservation Payment €50, transferred at signup, not in the cash.
//
// contracts/signup-2027.json independently records the form handoff and price grid. The 24 cases
// it derives must agree with these, case for case, and its prefill values must agree byte-for-byte
// with data/formprefill.json.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'formprefill.json'), 'utf8'));
const cost = require(path.join(repoRoot, 'assets', 'js', 'cost.js'));

// --- the grid, restated by hand ---------------------------------------------------------------

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
    `data/formprefill.json prices ${tier} at €${priceIn('accommodation', TIER[tier])}, 2027 grid says €${expected}`);
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
// The canonical pairing still has to produce the 2027 per-tier Sunday figure.
for (const [tier, expected] of Object.entries(GRID.sundayFor)) {
  const found = cost.priceOf(sundayQuestion.options.find((o) => o.key === sundayKey(tier, 'yes')).label);
  check(found === expected,
    `Sunday night on ${tier} is €${found} in the data file, €${expected} in the 2027 grid`);
}
for (const [key, expected] of Object.entries(GRID.donations)) {
  check(priceIn('donation', key) === expected,
    `donation ${key} is €${priceIn('donation', key)} in the data file, €${expected} in the 2027 grid`);
}
check(cost.priceOf(config.reservationLabel) === GRID.reservation,
  `the Reservation Payment is €${cost.priceOf(config.reservationLabel)} in the data file, €${GRID.reservation} in the 2027 grid`);

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

// The real handoff must be fully wired. A half-wired prefill silently drops a choice.
const wired = Boolean(config.formURL) && config.questions.every((q) => /^\d+$/.test(String(q.entry)));
check(wired, 'data/formprefill.json must have a long form URL and a numeric entry id for every question');
check(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[^/]+\/viewform$/.test(config.formURL),
  `formURL must be the long Google Forms /viewform URL; got ${config.formURL}`);

const actualURL = cost.prefillURL(
  config,
  { accommodation: 'shared', sunday: 'bed', donation: 'd20' },
);
check(actualURL.startsWith(`${config.formURL}?usp=pp_url&`),
  `the real prefill link must start at formURL with usp=pp_url; got ${actualURL}`);
for (const [questionKey, optionKey] of [
  ['accommodation', 'shared'],
  ['sunday', 'bed'],
  ['donation', 'd20'],
]) {
  const question = config.questions.find((candidate) => candidate.key === questionKey);
  const option = question && question.options.find((candidate) => candidate.key === optionKey);
  const wanted = question && option
    ? `entry.${question.entry}=${encodeURIComponent(option.label)}`
    : `missing ${questionKey}/${optionKey}`;
  check(Boolean(question && option && actualURL.includes(wanted)),
    `the real prefill link must carry ${wanted}\n  got: ${actualURL}`);
}

// Exercise the URL builder independently of the live ids as well.
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
// qa/prices.js requires the repository-local contract. Its 24 cases must agree with the 24
// written out above, and all form values must match data/formprefill.json exactly. A prefill label
// that differs by even one character selects nothing in Google Forms.

const contract = require('./prices');
const specNote = contract.provenance;

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

const contractForm = contract.spec.form;
check(config.formURL === contractForm.url,
  `formURL differs from the contract:\n  site: ${config.formURL}\n  contract: ${contractForm.url}`);
const hugoConfig = fs.readFileSync(path.join(repoRoot, 'hugo.toml'), 'utf8');
const signupURL = (hugoConfig.match(/^\s*signupURL\s*=\s*"([^"]+)"\s*$/m) || [])[1] || '';
check(signupURL === contractForm.url,
  `hugo.toml signupURL differs from the contract:\n  site: ${signupURL}\n  contract: ${contractForm.url}`);
check(config.reservationLabel === contractForm.reservation.label,
  `reservationLabel differs from the contract: ${config.reservationLabel} vs ${contractForm.reservation.label}`);
check(JSON.stringify(config.defaults) === JSON.stringify(contractForm.defaults),
  `calculator defaults differ from the contract: ${JSON.stringify(config.defaults)} vs ${JSON.stringify(contractForm.defaults)}`);
check(config.questions.length === contractForm.questions.length,
  `site has ${config.questions.length} prefill questions; contract has ${contractForm.questions.length}`);

for (let i = 0; i < contractForm.questions.length; i += 1) {
  const expectedQuestion = contractForm.questions[i];
  const actualQuestion = config.questions[i];
  check(Boolean(actualQuestion), `site has no prefill question at position ${i + 1}`);
  if (!actualQuestion) continue;
  check(actualQuestion.key === expectedQuestion.key,
    `prefill question ${i + 1} key is ${actualQuestion.key}, contract says ${expectedQuestion.key}`);
  check(String(actualQuestion.entry) === String(expectedQuestion.entry),
    `${expectedQuestion.key} entry id is ${actualQuestion.entry}, contract says ${expectedQuestion.entry}`);
  check(actualQuestion.options.length === expectedQuestion.options.length,
    `${expectedQuestion.key} has ${actualQuestion.options.length} options, contract has ${expectedQuestion.options.length}`);
  for (let j = 0; j < expectedQuestion.options.length; j += 1) {
    const expectedOption = expectedQuestion.options[j];
    const actualOption = actualQuestion.options[j];
    check(Boolean(actualOption), `${expectedQuestion.key} has no option at position ${j + 1}`);
    if (!actualOption) continue;
    check(actualOption.key === expectedOption.key,
      `${expectedQuestion.key} option ${j + 1} key is ${actualOption.key}, contract says ${expectedOption.key}`);
    check(actualOption.label === expectedOption.label,
      `${expectedQuestion.key}/${expectedOption.key} prefill label differs byte-for-byte:\n` +
      `  site: ${JSON.stringify(actualOption.label)}\n  contract: ${JSON.stringify(expectedOption.label)}`);
    check(cost.priceOf(actualOption.label) === expectedOption.price,
      `${expectedQuestion.key}/${expectedOption.key} label prices at €${cost.priceOf(actualOption.label)}, ` +
      `contract says €${expectedOption.price}`);
  }
}

// --- 6. the three participant-facing price tables agree, and every example total is right ----
//
// Divergence between artifacts is this project's most common bug. The grid is
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
  ...Object.values(GRID.donations),
  ...CASES.map(([, , , cash]) => cash),
  ...CASES.map(([, , , , total]) => total),
]);

for (const relative of PRICED_PAGES) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');

  check(!/\bwednesday\b|early arrivals?/i.test(text),
    `${relative} must not advertise Wednesday or early arrival; reception starts on Thursday.`);

  const rows = text.split('\n').filter((line) => /^\|.*€/.test(line)).map((line) => line.trim());
  assert.deepEqual(rows, expectedRows,
    `${relative}'s price table does not match the 2027 grid. All three participant-facing ` +
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
    `donation order high-first, real prefill URL and byte-exact handoff verified. ${specNote}.\n`);
}
