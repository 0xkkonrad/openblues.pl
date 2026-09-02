// Shared Hugo parameters, text normalisation and banned-copy patterns for the rendered-site QA.
// Dates and thresholds are read from hugo.toml so the tests do not create a second source of
// truth.
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const hugoConfig = fs.readFileSync(path.join(repoRoot, 'hugo.toml'), 'utf8');

const readParam = (name) =>
  (hugoConfig.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]*?)"?\\s*$`, 'm')) || [])[1] || '';

const signupURL = readParam('signupURL');
// There is no separate change form any more (29 Aug 2026). recoveryURL is the optional
// "email me my link" form; while it is empty, /change/ offers the email path instead.
const recoveryURL = readParam('recoveryURL');
const eventStart = readParam('eventStart');

const params = {
  repoRoot,
  readParam,
  signupURL,
  recoveryURL,
  signupsOpen: readParam('signupsOpen') === 'true' && Boolean(signupURL),
  recoveryOpen: readParam('recoveryOpen') === 'true' && Boolean(recoveryURL),
  threshold: readParam('threshold'),
  goNoGoHuman: readParam('goNoGoHuman'),
  eventDatesHuman: readParam('eventDatesHuman'),
  eventStart,
  eventEnd: readParam('eventEnd'),
  eventYear: eventStart.slice(0, 4),
};

// Curly quotes come from Goldmark's typographer; collapse them and whitespace before comparing
// rendered copy. Stripping inline markup can leave a space before punctuation, so close it too.
params.normalise = (text) =>
  String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

// Wording that must not return to any participant-facing page. This includes the blanket
// reassurance and false signup deadline removed in the September landing-page cleanup.
params.banned = [
  /One form, once/i,
  /Signups close/i,
  /19 August 2027/i,
  /Nothing is final/i,
  /Nothing (?:here|you answered) is locked in/i,
  /Everyone who signs up and pays is in/i,
  /There is no selection/i,
  /nothing to wait for/i,
  /latest answer counts/i,
  /change (?:anything|your details)[^.]{0,80}\bany time\b/i,
  /\b\d+\s+of\s+\d+\s+paid\b/i,
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
  // Added 29 Aug 2026 with the pricing simplification: the drinks question was deleted and its
  // €10 folded into every accommodation tier, so no participant-facing surface may name it.
  /drinks? contribution/i,
  /\bdrinks\b/i,
  /drinks_cost/i,
  /an average amount/i,
  // Added with the Google Forms migration: the refund rule that survived in three artifacts at
  // once, and the wording that promises a decision nobody is making.
  /refunded (?:in full )?if (?:you are )?declined/i,
  /if we cannot offer you a place/i,
  /we read every application/i,
  // No capacity limit exists, so none of these describes a state that can occur.
  /spots? left/i,
  /sold out/i,
  /limited places/i,
  /\bcapacity\b/i,
  // Participants arrive from Thursday. Keep the removed pre-event arrival path out of every
  // rendered page, including equivalent wording that avoids naming the weekday.
  /\bWednesday\b/i,
  /early[-\s]+arriv/i,
  /arriv(?:e|ing|al)[^.]{0,100}\bday before\b/i,
  /\bday before\b[^.]{0,100}arriv/i,
  /arriv(?:e|ing|al)[^.]{0,100}\bbefore Thursday\b/i,
  // POLICY rule 6: say "the link in your confirmation email", never this.
  /fill (?:in )?the form (?:in )?again/i,
];

module.exports = params;
