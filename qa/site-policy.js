// Asserts the rendered site against the canonical participant-facing sentences in
// projects/openblues-2027/POLICY.md, which qa/site-params.js holds. Two jobs:
//
//   1. every load-bearing rule is actually on the surface that owns it, word for word;
//   2. no rule is stated twice on one page (POLICY, "How much of this to actually say":
//      "Never state the same rule twice on one page"), and no banned wording survives
//      anywhere — including the regression that started this: "or earlier if the venue is
//      full", a clause describing a state that cannot occur, since there is no capacity limit.
//
// Needs a served build: OPENBLUES_PREVIEW_ORIGIN (default http://localhost:3118).
const assert = require('node:assert/strict');
const params = require('./site-params');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const P = params.policy;

const entities = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#34;': '"', '&#39;': "'", '&apos;': "'",
  '&lsquo;': "'", '&rsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&mdash;': '—',
  '&ndash;': '–', '&hellip;': '…', '&euro;': '€', '&lt;': '<', '&gt;': '>',
};

const textOf = (html) =>
  params.normalise(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, (m) => (m in entities ? entities[m] : ' ')),
  );

const count = (haystack, needle) => haystack.split(needle).length - 1;

// Which surface owns which sentence. `once` = exactly one occurrence, `atMostOnce` = the
// counter can swap it out with its state, so 0 or 1 but never a duplicate.
const expectations = [
  {
    path: '/',
    // Hero: rules 5 and 6, at the point of signup. "Your cost": rules 4 and 9.
    // "Food and accommodation": rule 10. "How signing up works": rule 8.
    // The counter owns rules 1 and 3, and only shows them in the open state.
    once: [P.noSelection, P.change, P.noOtherRefund, P.cash, P.beds, P.closing],
    atMostOnce: [P.threshold, P.cancellation, P.confirmation, P.notSelfService],
  },
  {
    path: '/booklet/',
    once: [P.threshold, P.confirmation, P.cancellation, P.cash, P.beds, P.closing],
    atMostOnce: [P.noSelection, P.change, P.noOtherRefund, P.notSelfService],
  },
  {
    path: '/change/',
    once: [P.change, P.cancellation, P.noOtherRefund, P.notSelfService, P.noSelection, P.closing],
    atMostOnce: [P.threshold, P.confirmation, P.cash, P.beds],
  },
  // /cost/ has one job: the number. It may repeat no rule, and it owns none of them — the
  // reader is working out what the week costs, not reading terms.
  { path: '/cost/', once: [], atMostOnce: Object.values(P) },
  { path: '/accommodation/', once: [], atMostOnce: Object.values(P) },
  { path: '/spread-the-word/', once: [], atMostOnce: Object.values(P) },
  { path: '/2026/', once: [], atMostOnce: Object.values(P) },
  { path: '/404.html', once: [], atMostOnce: Object.values(P) },
];

// Every rendered file, not only the pages: the clause hid in a counter state and in a test
// fixture last time, so scan the feeds too.
const scannedPaths = [
  '/', '/cost/', '/booklet/', '/change/', '/accommodation/', '/spread-the-word/', '/2026/', '/404.html',
  '/openblues-2027.ics', '/sitemap.xml', '/robots.txt',
];

async function get(path) {
  const response = await fetch(origin + path);
  assert.ok(response.ok, `${path} returned HTTP ${response.status}`);
  return response.text();
}

async function run() {
  const label = (path, sentence) => `${path}: "${sentence.slice(0, 60)}…"`;

  for (const { path, once, atMostOnce } of expectations) {
    const text = textOf(await get(path));
    for (const sentence of once) {
      assert.equal(count(text, sentence), 1, `${label(path, sentence)} must appear exactly once`);
    }
    for (const sentence of atMostOnce) {
      assert.ok(count(text, sentence) <= 1, `${label(path, sentence)} is stated more than once`);
    }
  }

  for (const path of scannedPaths) {
    const raw = await get(path);
    const text = params.normalise(path.endsWith('.ics') || path.endsWith('.xml') || path.endsWith('.txt') ? raw : textOf(raw));
    // The one permitted use of the word "application" is POLICY sentence 5's negation.
    const scanned = text.split(P.noSelection).join(' ');
    for (const pattern of params.banned) {
      assert.doesNotMatch(scanned, pattern, `${path} carries banned wording ${pattern}`);
    }
    assert.doesNotMatch(text, /\bfull\b(?=[^.]*\bplaces?\b)/i, `${path} still talks about a full venue`);
  }

  // POLICY rule 6, as rewritten for the Google Forms migration: the way you change your answers
  // is the per-response edit link in your confirmation email. Saying "fill the form in again" is
  // banned outright (params.banned), and the page has to carry the recovery path from rule 7,
  // because the link lives only in an email and POLICY forbids showing it on a web page.
  const changeText = textOf(await get('/change/'));
  assert.match(changeText, /the link in your confirmation email/i,
    '/change/ must name the mechanism: "the link in your confirmation email" (POLICY rule 6)');
  assert.match(changeText, /lost (?:your|the) link/i,
    '/change/ must name the case: "Lost the link?" — the edit link exists in exactly one email (POLICY rule 7)');
  assert.match(changeText, /(?:ask for it|email me my link|send (?:it|the link|your link) again)/i,
    '/change/ must offer the recovery itself, not only acknowledge the problem (POLICY rule 7)');
  assert.match(changeText, /(?:we send (?:it|the link) to the address you signed up with|it only ever reaches you)/i,
    '/change/ must say the link goes to the address you signed up with — that sentence is the ' +
    'whole authentication story, and POLICY forbids asking anyone to prove who they are');
  assert.doesNotMatch(changeText, /(?:prove (?:who you are|your identity)|verify your identity|security question)/i,
    '/change/ must never ask anybody to prove who they are (POLICY rule 7)');

  // The recovery path has two states and one parameter. While recoveryURL is empty the page
  // offers the email path, which needs no infrastructure and is already true; once the
  // "email me my link" form exists, recoveryURL + recoveryOpen switch the page over with no
  // edit to the page itself. Either way the edit link is NEVER shown on the page, and nobody is
  // ever asked to prove who they are — mailbox access is the authentication (POLICY rule 7).
  const changePage = await get('/change/');
  if (params.recoveryOpen) {
    const escaped = params.recoveryURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.ok((changePage.match(new RegExp(escaped, 'g')) || []).length >= 1,
      '/change/ must link to recoveryURL once recoveryOpen is true');
  } else {
    assert.match(changePage, /mailto:openbluespoland@gmail\.com/,
      '/change/ must offer the email recovery path while recoveryOpen is false: a lost link may ' +
      'never be a dead end, which is why this page ships WITH the migration and not after it');
  }
  assert.match(changeText, /so it only ever reaches you/,
    '/change/ must say the link is sent to the address the person signed up with (POLICY rule 7)');
  for (const path of ['/', '/cost/', '/booklet/', '/accommodation/', '/spread-the-word/', '/2026/', '/404.html']) {
    const html = await get(path);
    assert.ok(html.includes('change/'), `${path} must keep the durable /change/ route in the nav`);
  }

  const sentences = Object.keys(P).length;
  process.stdout.write(
    `PASS: ${sentences} POLICY sentences asserted on ${expectations.length} pages, ` +
      `${params.banned.length} banned patterns clear on ${scannedPaths.length} rendered files, ` +
      `link recovery ${params.recoveryOpen ? 'self-service' : 'by email'}.\n`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
