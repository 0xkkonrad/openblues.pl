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
  { path: '/accommodation/', once: [], atMostOnce: Object.values(P) },
  { path: '/2026/', once: [], atMostOnce: Object.values(P) },
  { path: '/404.html', once: [], atMostOnce: Object.values(P) },
];

// Every rendered file, not only the pages: the clause hid in a counter state and in a test
// fixture last time, so scan the feeds too.
const scannedPaths = [
  '/', '/booklet/', '/change/', '/accommodation/', '/2026/', '/404.html',
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

  // The change form is gated on one parameter: while changeOpen is false nothing may link to a
  // Tally form that is still a draft and answers 404.
  const changePage = await get('/change/');
  const changeLinks = (changePage.match(new RegExp(params.changeURL, 'g')) || []).length;
  if (params.changeOpen) {
    assert.ok(changeLinks >= 1, '/change/ must link to changeURL once changeOpen is true');
  } else {
    assert.equal(changeLinks, 0, '/change/ must not link to an unpublished change form');
    assert.match(changePage, /· soon/, '/change/ must show the "· soon" state while changeOpen is false');
  }
  for (const path of ['/', '/booklet/', '/accommodation/', '/2026/', '/404.html']) {
    const html = await get(path);
    assert.ok(html.includes('change/'), `${path} must keep the durable /change/ route in the nav`);
    if (!params.changeOpen) {
      assert.ok(!html.includes(params.changeURL), `${path} must not link to the unpublished change form`);
    }
  }

  const sentences = Object.keys(P).length;
  process.stdout.write(
    `PASS: ${sentences} POLICY sentences asserted on ${expectations.length} pages, ` +
      `${params.banned.length} banned patterns clear on ${scannedPaths.length} rendered files, ` +
      `change gate ${params.changeOpen ? 'open' : 'closed'}.\n`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
