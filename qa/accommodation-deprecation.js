const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const removedFiles = [
  'assets/js/accommodation.js',
  'data/accommodation.yaml',
  'layouts/accommodation/single.html',
  'qa/accommodation-browser.js',
  'static/images/accommodation/venue-map-2026.webp',
  'static/files/open-blues-2026-venue-map.pdf',
  'static/images/social/facebook-event-cover/sharing-mattress.jpg',
  'static/images/social/facebook-post/sharing-mattress.jpg',
  'static/images/social/instagram-square/sharing-mattress.jpg',
  'static/images/social/listing/sharing-mattress.jpg',
  'static/images/social/story/sharing-mattress.jpg',
  'static/images/social/thumbs/facebook-event-cover-sharing-mattress.jpg',
  'static/images/social/thumbs/facebook-post-sharing-mattress.jpg',
  'static/images/social/thumbs/instagram-square-sharing-mattress.jpg',
  'static/images/social/thumbs/listing-sharing-mattress.jpg',
  'static/images/social/thumbs/story-sharing-mattress.jpg',
  'static/images/social/thumbs/whatsapp-sharing-mattress.jpg',
  'static/images/social/whatsapp/sharing-mattress.jpg'
];
const activeRoots = ['assets', 'content', 'data', 'layouts', 'static'];
const forbidden = [
  'data-accommodation-picker',
  'data-roster-',
  'data-tally-',
  'openBluesAccommodationRosterV1',
  'gviz/tq',
  'rjQKYM',
  // Retired registration providers and the old config param.
  'tally.so/r/',
  'registerURL',
  'venue-map-2026',
  'open-blues-2026-venue-map'
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
assert.doesNotMatch(accommodation, /docs\.google\.com\/forms|forms\.gle/, 'Claim Form links belong in the Room Browser, never in site content');
assert.match(accommodation, /view-only list of free and taken places/i);
assert.match(accommodation, /same full name you used to sign up/i);
assert.match(accommodation, /Only the committee can see names/i);
assert.match(accommodation, /latest submission wins/i);
assert.doesNotMatch(accommodation, /public display name|green name cells?|Sheets app|signup order|edit in your browser|type, move or clear|clear only your name/i,
  'the retired directly editable public-name flow must stay absent');
assert.equal((accommodation.match(/\{\{<\s*room-browser-cta\s+variant="hero"\s*>\}\}/g) || []).length, 1);
assert.equal((accommodation.match(/\{\{<\s*room-browser-cta\s+variant="final"\s*>\}\}/g) || []).length, 1);
assert.equal((accommodation.match(/\{\{<\s*room-link\s+range="[A-Z]\d+:[A-Z]\d+"\s+label="[^"]+"\s*>\}\}/g) || []).length, 18, 'every room card needs one room-link shortcode');

assert.equal(fs.existsSync(path.join(root, 'content/2026.md')), false,
  'the retired edition page must stay deleted');

const hugoConfig = fs.readFileSync(path.join(root, 'hugo.toml'), 'utf8');
for (const param of ['signupURL', 'signupsOpen', 'threshold', 'goNoGoHuman', 'roomBrowserURL', 'roomBrowserInstructionsURL', 'eventStart', 'eventEnd', 'eventDatesHuman']) {
  assert.match(hugoConfig, new RegExp(`^\\s*${param}\\s*=`, 'm'), `hugo.toml must define params.${param}`);
}
assert.doesNotMatch(hugoConfig, /^\s*close(?:Date|Human)\s*=/m,
  'the removed signup closing date must not remain in hugo.toml');
const roomBrowserUrls = ['roomBrowserURL', 'roomBrowserInstructionsURL'].map((param) =>
  (hugoConfig.match(new RegExp(`^\\s*${param}\\s*=\\s*"([^"]+)"`, 'm')) || [])[1] || ''
);
assert.equal(roomBrowserUrls.every((url) => /docs\.google\.com\/spreadsheets\/d\/[^/]+\/edit#gid=\d+$/.test(url)), true,
  'both live Room Browser URLs must be full, configured spreadsheet-tab URLs');
const roomBrowserIds = roomBrowserUrls.map((url) => url.match(/\/spreadsheets\/d\/([^/]+)/)[1]);
assert.equal(new Set(roomBrowserIds).size, 1, 'Room Browser and START HERE must use the same live workbook');
const participantSources = ['content', 'layouts']
  .flatMap((relative) => filesBelow(path.join(root, relative)))
  .filter((filename) => /\.(md|html|ics)$/i.test(filename))
  .map((filename) => `${path.relative(root, filename)}\n${fs.readFileSync(filename, 'utf8')}`)
  .join('\n');
assert.doesNotMatch(participantSources, /\b20[2-9]\d-\d\d-\d\d\b|\b20[2-9]\d[01]\d[0-3]\d\b/, 'event dates must come from hugo.toml params, not be hard-coded in content or layouts');
assert.doesNotMatch(participantSources, /\bregist(?:er|ration)\b/i, 'participant-facing copy says sign up/signup, not register/registration');
assert.doesNotMatch(participantSources, /Open Blues 20\d\d/, 'the edition year must come from the event-year partial/shortcode');

process.stdout.write('PASS: view-only Room Browser copy keeps claims private, while legacy picker/runtime, editable public names, retired links and hard-coded dates remain absent.\n');
