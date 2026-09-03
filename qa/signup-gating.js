// Every route into the external signup form must share the same open/closed/cancelled gate.
// This is deliberately a source-level contract: a normal build has only one counter state, so
// rendered smoke tests alone cannot exercise the cancelled branch without mutating production data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const predicate = read('layouts/partials/signup-is-open.html');

assert.match(predicate, /site\.Params\.signupsOpen/);
assert.match(predicate, /site\.Params\.signupURL/);
assert.match(predicate, /site\.Data\.counter\.status/);
assert.match(predicate, /ne \$status "cancelled"/);

for (const relative of [
  'layouts/partials/signup-cta.html',
  'layouts/shortcodes/signup-link.html',
  'layouts/shortcodes/cost-calculator.html',
]) {
  assert.match(read(relative), /partial "signup-is-open\.html"/,
    `${relative} must use the shared signup predicate`);
}

const signupActions = read('layouts/partials/signup-actions.html');
assert.match(signupActions, /partial "signup-cta\.html"/,
  'the paired signup action must delegate its primary state to signup-cta');
assert.match(signupActions, /href=.*change\//,
  'Change details must remain available beside signup even when new signups close');
assert.doesNotMatch(signupActions, /signup-is-open\.html/,
  'the existing-participant Change details link must not inherit the signup-open gate');

const layouts = [
  'layouts/partials/signup-cta.html',
  'layouts/partials/signup-actions.html',
  'layouts/shortcodes/signup-link.html',
  'layouts/shortcodes/cost-calculator.html',
].map((relative) => `${relative}\n${read(relative)}`).join('\n');
assert.equal((layouts.match(/site\.Params\.signupsOpen/g) || []).length, 0,
  'signup surfaces must not reimplement the open flag outside the shared predicate');

process.stdout.write('PASS: buttons, inline links and calculator prefill share one open/closed/cancelled signup predicate.\n');
