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
  '1yOjUmU7gq6kY8cAurrMCKs9XVa86Ov-_uOTrTgAw8Bc'
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
assert.match(accommodation, /1Cu3Cgi5qpbeqUIpy87-dbzBTXIWrYuWIIHS5Jp1RSV8/);
assert.match(accommodation, /gid=2026080501/);
assert.match(accommodation, /gid=2026080404/);
assert.equal((accommodation.match(/gid=2026080501/g) || []).length, 20);

process.stdout.write('PASS: legacy picker runtime, roster protocol, claim form and YAML inventory are absent from active site sources.\n');
