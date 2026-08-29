// The canonical POLICY sentences and the [params] they are built from, read straight out of
// hugo.toml so a date or a threshold is asserted from one place only (the same rule the site
// itself follows). Consumed by qa/site-policy.js, which asserts these sentences against the
// rendered pages — this file must never be the only place a sentence lives.
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const hugoConfig = fs.readFileSync(path.join(repoRoot, 'hugo.toml'), 'utf8');

const readParam = (name) =>
  (hugoConfig.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]*?)"?\\s*$`, 'm')) || [])[1] || '';

const signupURL = readParam('signupURL');
const changeURL = readParam('changeURL');
const eventStart = readParam('eventStart');

const params = {
  repoRoot,
  readParam,
  signupURL,
  changeURL,
  signupsOpen: readParam('signupsOpen') === 'true' && Boolean(signupURL),
  changeOpen: readParam('changeOpen') === 'true' && Boolean(changeURL),
  threshold: readParam('threshold'),
  goNoGoHuman: readParam('goNoGoHuman'),
  closeHuman: readParam('closeHuman'),
  eventDatesHuman: readParam('eventDatesHuman'),
  eventStart,
  eventEnd: readParam('eventEnd'),
  eventYear: eventStart.slice(0, 4),
};

// Curly quotes come from Goldmark's typographer; collapse them and whitespace so a sentence
// written once in POLICY.md can be matched against rendered text. Stripping inline markup
// (<strong>, <a>) leaves a space before the following punctuation, so close that up too.
params.normalise = (text) =>
  String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

// The canonical participant-facing sentences (projects/openblues-2027/POLICY.md). Fixed values
// come from hugo.toml so this file never becomes a second source of truth for a date.
params.policy = {
  threshold: `Open Blues ${params.eventYear} happens if ${params.threshold} people have signed up and paid the €50 Reservation Payment by ${params.goNoGoHuman}.`,
  confirmation: `It is confirmed the moment the 40th payment arrives — that can be any time before ${params.goNoGoHuman}.`,
  cancellation: `If we do not reach ${params.threshold} by ${params.goNoGoHuman}, Open Blues ${params.eventYear} does not happen and every Reservation Payment is refunded in full.`,
  noOtherRefund:
    'The Reservation Payment is not refunded for any other reason. If you cannot come, you may pass your place to someone else — email openbluespoland@gmail.com.',
  noSelection: 'Everyone who signs up and pays is in. There is no selection, no application, and nothing to wait for.',
  change:
    "You can change your details yourself, any time, at openblues.pl/change — accommodation, Sunday night, drinks, donation, whether you'll DJ, jam or run a workshop, your travel and lift offer, and the spelling of your name. The latest answer counts.",
  notSelfService:
    'The €50 Reservation Payment, your email address and passing your place to someone else are handled by email: openbluespoland@gmail.com.',
  // POLICY sentence 8 is exactly this, with nothing appended. There is no capacity limit, so
  // "or earlier if the venue is full" is not merely redundant, it is untrue: site-policy.js
  // asserts that clause appears on no page at all.
  closing: `Signups close on ${params.closeHuman}.`,
  cash: 'Everything except the €50 Reservation Payment is brought in cash to the venue.',
  beds:
    'If you paid for a shared or single sleeping place, you choose your exact place in the shared Sheet once the gathering is confirmed. Places are allocated in signup order.',
};

// Wording POLICY bans outright, plus the capacity clause Konrad removed on 29 Aug 2026. Tested
// against the rendered text of every page. `noSelection` is stripped before the scan because it
// is the one permitted use of the word "application".
params.banned = [
  /or earlier if the venue is full/i,
  /venue is full/i,
  /places are taken/i,
  /places left/i,
  /\bapplicants?\b/i,
  /\bapplications?\b/i,
  /\bapply\b/i,
  /\baccepted\b/i,
  /\bacceptance\b/i,
  /\bdeclined\b/i,
  /wait ?list/i,
  /black ?list/i,
  /ignore list/i,
  /you will hear back/i,
  /offer you a place/i,
  /Why do you want to join/i,
  /once you are accepted/i,
];

module.exports = params;
