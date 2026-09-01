// The checked-in 2027 signup and price contract used by deploy QA.
//
// A clean checkout must be able to verify the signup handoff without a neighbouring project,
// private workbook or operator laptop. OPENBLUES_SPEC may point at another contract for a local
// experiment; otherwise contracts/signup-2027.json is required and a missing/invalid contract is
// a hard failure.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const contractPath = process.env.OPENBLUES_SPEC
  || path.join(repoRoot, 'contracts', 'signup-2027.json');

function must(condition, message) {
  if (!condition) throw new Error(`SIGNUP CONTRACT: ${message}`);
}

function loadContract() {
  must(fs.existsSync(contractPath), `contract not found at ${contractPath}`);
  try {
    return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    throw new Error(`SIGNUP CONTRACT: ${contractPath} is not valid JSON: ${error.message}`);
  }
}

// Labels are machine values: Google Forms prefill requires byte equality and the sheet extracts
// prices from the euro figure. Accept the spellings historically used by the project, but demand
// exactly one figure and an exact match to the option's numeric price.
const EURO_PATTERN = /(?:€\s?(\d+(?:[.,]\d+)?)|(?:\bEUR\s?(\d+(?:[.,]\d+)?))|(?:\b(\d+(?:[.,]\d+)?)\s?EUR\b))/g;

function euroAmounts(text) {
  const found = [];
  for (const match of String(text).matchAll(EURO_PATTERN)) {
    const raw = match[1] || match[2] || match[3];
    found.push(Number(String(raw).replace(',', '.')));
  }
  return found;
}

function readPrices(contract) {
  const grid = contract.prices || {};
  const required = ['floor', 'shared', 'single', 'sunday_floor', 'sunday_bed', 'reservation'];
  const missing = required.filter((key) => typeof grid[key] !== 'number');
  must(missing.length === 0,
    `prices is missing numeric field(s): ${missing.join(', ')}`);
  must(Array.isArray(grid.donations) && grid.donations.every((amount) => typeof amount === 'number'),
    'prices.donations must be a numeric array');

  const donations = [...new Set(grid.donations)];
  must(donations.length === grid.donations.length, 'prices.donations contains a duplicate');
  must(donations.length === 4, `expected four donation choices, got ${donations.length}`);

  return {
    floor: grid.floor,
    shared: grid.shared,
    single: grid.single,
    // Kept as the bed rung for the browser harness's control discovery; arithmetic uses sundayFor.
    sunday: grid.sunday_bed,
    sundayFloor: grid.sunday_floor,
    sundayFor: { floor: grid.sunday_floor, shared: grid.sunday_bed, single: grid.sunday_bed },
    reservation: grid.reservation,
    donations,
  };
}

function findQuestion(contract, key) {
  return (contract.form && contract.form.questions || []).find((question) => question.key === key);
}

function findOption(contract, questionKey, optionKey) {
  const question = findQuestion(contract, questionKey);
  return question && (question.options || []).find((option) => option.key === optionKey);
}

function assertInternalContract(contract, prices) {
  must(contract.form && typeof contract.form.url === 'string', 'form.url is missing');
  must(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[^/]+\/viewform$/.test(contract.form.url),
    'form.url must be the long Google Forms /viewform URL');

  const questions = contract.form.questions;
  must(Array.isArray(questions), 'form.questions must be an array');
  must(JSON.stringify(questions.map((question) => question.key))
    === JSON.stringify(['accommodation', 'sunday', 'donation']),
  'form.questions must be accommodation, sunday, donation in prefill order');

  const entries = questions.map((question) => String(question.entry || ''));
  must(entries.every((entry) => /^\d+$/.test(entry)), 'every prefill entry id must contain digits only');
  must(new Set(entries).size === entries.length, 'prefill entry ids must be unique');

  const expected = [
    ['accommodation', 'floor', prices.floor],
    ['accommodation', 'shared', prices.shared],
    ['accommodation', 'single', prices.single],
    ['sunday', 'leaving', 0],
    ['sunday', 'tentfloor', prices.sundayFloor],
    ['sunday', 'bed', prices.sunday],
    ['donation', 'd100', 100],
    ['donation', 'd50', 50],
    ['donation', 'd20', 20],
    ['donation', 'none', 0],
  ];
  for (const [questionKey, optionKey, price] of expected) {
    const option = findOption(contract, questionKey, optionKey);
    must(option, `form has no ${questionKey}/${optionKey} option`);
    must(option.price === price,
      `${questionKey}/${optionKey} is €${option.price}; prices grid says €${price}`);
    const amounts = euroAmounts(option.label);
    must(amounts.length === 1 && amounts[0] === option.price,
      `${questionKey}/${optionKey} label ${JSON.stringify(option.label)} must carry exactly €${option.price}`);
  }

  must(contract.form.reservation && contract.form.reservation.price === prices.reservation,
    'form.reservation.price must match prices.reservation');
  const reservationAmounts = euroAmounts(contract.form.reservation.label);
  must(reservationAmounts.length === 1 && reservationAmounts[0] === prices.reservation,
    'form.reservation.label must carry exactly the reservation price');

  must(JSON.stringify(prices.donations) === JSON.stringify([100, 50, 20, 0]),
    `donation order must be [100,50,20,0], got [${prices.donations}]`);
}

// 3 accommodation tiers x 2 Sunday states x 4 donation choices. Cash brought to the venue is
// tier + Sunday + donation; total contribution adds the reservation already transferred.
function canonicalCases(prices) {
  const tiers = [
    { key: 'floor', price: prices.floor },
    { key: 'shared', price: prices.shared },
    { key: 'single', price: prices.single },
  ];
  const cases = [];
  for (const tier of tiers) {
    for (const sunday of [{ key: 'no', price: 0 }, { key: 'yes', price: prices.sundayFor[tier.key] }]) {
      for (const donation of prices.donations) {
        const cash = tier.price + sunday.price + donation;
        cases.push({
          id: `${tier.key}+sunday-${sunday.key}+donation-${donation}`,
          tier: tier.key,
          tierPrice: tier.price,
          sunday: sunday.key === 'yes',
          sundayPrice: sunday.price,
          donation,
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

const spec = loadContract();
const prices = readPrices(spec);
assertInternalContract(spec, prices);

module.exports = {
  contractPath,
  // Compatibility names for the small number of QA modules that call this a spec.
  specPath: contractPath,
  spec,
  hasSpec: true,
  prices,
  labelCount: spec.form.questions.reduce((count, question) => count + question.options.length, 1),
  provenance: `prices and prefill values from ${contractPath}`,
  euroAmounts,
  cases: canonicalCases(prices),
};
