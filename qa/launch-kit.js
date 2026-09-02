// The launch kit is operational input for listing agents, so stale dates or totals are a
// production defect even though Markdown files are not rendered into the public site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { prices } = require('./prices');

const root = path.resolve(__dirname, '..');
const kit = fs.readFileSync(path.join(root, 'LAUNCH-KIT.md'), 'utf8');
const listings = fs.readFileSync(path.join(root, 'LISTINGS.md'), 'utf8');
const hugo = fs.readFileSync(path.join(root, 'hugo.toml'), 'utf8');
const param = (name) => (hugo.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]+?)"?\\s*$`, 'm')) || [])[1] || '';

const floorFullStay = prices.reservation + prices.floor + prices.sundayFloor;
const sharedFullStay = prices.reservation + prices.shared + prices.sunday;

assert.ok(kit.includes(param('eventDatesHuman')), 'launch kit must carry the canonical human date');
assert.ok(kit.includes(param('goNoGoHuman')), 'launch kit must carry the canonical go/no-go date');
assert.match(kit, new RegExp(`when ${param('threshold')} Reservation Payments`));
assert.match(kit, new RegExp(`€${floorFullStay}[\\s\\S]{0,80}tent or on the floor`));
assert.match(kit, new RegExp(`€${sharedFullStay}[\\s\\S]{0,80}place in a double bed`));
assert.doesNotMatch(kit, /€\s*170|170\s*€|materac|mattress|\bassumed\b|\btentative\b/i);

for (const relative of [
  'static/images/social/listing/poster.jpg',
  'static/images/og-palace.jpg',
  'static/files/printkit/open-blues-2027-poster-a4.pdf',
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `launch-kit asset is missing: ${relative}`);
}

assert.match(listings, /\[`LAUNCH-KIT\.md`\]\(LAUNCH-KIT\.md\)/);
const currentBoard = listings.split('## Archived 2026 log')[0];
const currentRows = currentBoard.split('\n').filter((line) => /^\|\s*\d+\s*\|/.test(line));
assert.equal(currentRows.length, 18, 'current tracker must contain all 18 listing targets');
assert.equal(currentRows.every((line) => /\| (?:TODO|BLOCKED) \|/.test(line)), true,
  'no inherited 2026 SUBMITTED or LIVE state may remain on the 2027 board');

process.stdout.write(`PASS: launch kit matches ${param('eventDatesHuman')}, €${floorFullStay}/€${sharedFullStay} totals, public assets and 18 honestly reset listing states.\n`);
