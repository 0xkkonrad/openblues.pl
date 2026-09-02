const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const removedFiles = [
  'assets/js/accommodation.js',
  'data/accommodation.yaml',
  'layouts/accommodation/single.html',
  'qa/accommodation-browser.js'
];
const activeRoots = ['assets', 'content', 'data', 'layouts', 'static'];
const forbidden = [
  'data-accommodation-picker',
  'data-roster-',
  'data-tally-',
  'openBluesAccommodationRosterV1',
  'gviz/tq',
  'rjQKYM',
  '1yOjUmU7gq6kY8cAurrMCKs9XVa86Ov-_uOTrTgAw8Bc',
  // 2026 edition leftovers: the 2026 Room Browser workbook, the 2026 Tally form and the old param.
  '1Cu3Cgi5qpbeqUIpy87-dbzBTXIWrYuWIIHS5Jp1RSV8',
  'tally.so/r/68Y72P',
  'registerURL'
];

function filesBelow(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(absolute) : [absolute];
  });
}

for (const relative of removedFiles) {
  assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must remain deleted`);
}

const activeText = activeRoots
  .flatMap((relative) => filesBelow(path.join(root, relative)))
  .filter((filename) => !/\.(webp|png|jpg|jpeg|pdf|woff2?)$/i.test(filename))
  .map((filename) => `${path.relative(root, filename)}\n${fs.readFileSync(filename, 'utf8')}`)
  .join('\n');

for (const needle of forbidden) {
  assert.equal(activeText.includes(needle), false, `legacy runtime marker remains: ${needle}`);
}

const accommodation = fs.readFileSync(path.join(root, 'content/accommodation.md'), 'utf8');
assert.doesNotMatch(accommodation, /docs\.google\.com\/spreadsheets/, 'Room Browser links must come from hugo.toml roomBrowserURL, never be hard-coded');
assert.equal((accommodation.match(/\{\{<\s*room-browser-cta\s+variant="hero"\s*>\}\}/g) || []).length, 1);
assert.equal((accommodation.match(/\{\{<\s*room-browser-cta\s+variant="final"\s*>\}\}/g) || []).length, 1);
assert.equal((accommodation.match(/\{\{<\s*room-link\s+range="[A-Z]\d+:[A-Z]\d+"\s+label="[^"]+"\s*>\}\}/g) || []).length, 18, 'every room card needs one room-link shortcode');

const hugoConfig = fs.readFileSync(path.join(root, 'hugo.toml'), 'utf8');
for (const param of ['signupURL', 'signupsOpen', 'threshold', 'goNoGoHuman', 'roomBrowserURL', 'roomBrowserInstructionsURL', 'eventStart', 'eventEnd', 'eventDatesHuman']) {
  assert.match(hugoConfig, new RegExp(`^\\s*${param}\\s*=`, 'm'), `hugo.toml must define params.${param}`);
}
assert.doesNotMatch(hugoConfig, /^\s*close(?:Date|Human)\s*=/m,
  'the removed signup closing date must not remain in hugo.toml');
const participantSources = ['content', 'layouts']
  .flatMap((relative) => filesBelow(path.join(root, relative)))
  .filter((filename) => /\.(md|html|ics)$/i.test(filename))
  .map((filename) => `${path.relative(root, filename)}\n${fs.readFileSync(filename, 'utf8')}`)
  .join('\n');
assert.doesNotMatch(participantSources, /\b20[2-9]\d-\d\d-\d\d\b|\b20[2-9]\d[01]\d[0-3]\d\b/, 'event dates must come from hugo.toml params, not be hard-coded in content or layouts');
assert.doesNotMatch(participantSources, /\bregist(?:er|ration)\b/i, 'participant-facing copy says sign up/signup, not register/registration');
assert.doesNotMatch(participantSources, /Open Blues 20\d\d/, 'the edition year must come from the event-year partial/shortcode');

process.stdout.write('PASS: legacy picker runtime, roster protocol, claim form, YAML inventory, 2026 Sheet/Tally links and hard-coded dates are absent from active site sources.\n');
