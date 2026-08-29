// The strict door onto the 2027 contract.
//
// require('./spec') resolves ONLY when projects/openblues-2027/spec/2027-spec.json exists, and
// throws "spec not found at <path>" otherwise. Checks that are meaningless without the contract
// — byte-identical option labels, question order, the entry.NNNN prefill ids — require this and
// let the throw skip them. Checks that POLICY.md alone can answer require './prices' instead,
// which always resolves and reports its provenance.
//
// Everything else, including the price-label contract and the 24 canonical cases, lives in
// qa/prices.js; this file only decides whether a missing contract is fatal.
const prices = require('./prices');

if (!prices.hasSpec) {
  throw new Error(
    `SPEC CONTRACT: spec not found at ${prices.specPath}. Set OPENBLUES_SPEC, or wait for the ` +
    'contract wave to write it. Checks that need byte-exact labels cannot run without it.');
}

module.exports = prices;
