// Copy ownership and regression checks for participant-facing pages.
//
// The homepage sells the gathering and speaks about people. Payment mechanics live on the
// cost/booklet surfaces; /change/ describes only the fields its personal edit link exposes.
// The rejected blanket reassurance and false 19 August closing date are banned everywhere.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const params = require('./site-params');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const counter = JSON.parse(fs.readFileSync(path.join(params.repoRoot, 'data/counter.json'), 'utf8'));

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

const paths = [
  '/', '/cost/', '/booklet/', '/change/', '/accommodation/', '/spread-the-word/', '/2026/', '/404.html',
];
const textAssets = ['/openblues-2027.ics', '/sitemap.xml', '/robots.txt'];

async function get(pagePath) {
  const response = await fetch(origin + pagePath);
  assert.ok(response.ok, `${pagePath} returned HTTP ${response.status}`);
  return response.text();
}

async function run() {
  const rendered = new Map();

  for (const pagePath of [...paths, ...textAssets]) {
    const raw = await get(pagePath);
    const text = params.normalise(textAssets.includes(pagePath) ? raw : textOf(raw));
    rendered.set(pagePath, { raw, text });

    for (const pattern of params.banned) {
      assert.doesNotMatch(text, pattern, `${pagePath} carries rejected or stale wording ${pattern}`);
    }
    assert.doesNotMatch(text, /\bfull\b(?=[^.]*\bplaces?\b)/i, `${pagePath} still talks about a full venue`);
  }

  const home = rendered.get('/');
  assert.doesNotMatch(home.raw, /class="quotes"|What people say/i,
    'unsourced attributed testimonials must not be published');
  const heroMatch = home.raw.match(/<section class="hero home-hero"[\s\S]*?<\/section>/i);
  assert.ok(heroMatch, 'homepage must render the redesigned first fold');
  const heroText = textOf(heroMatch[0]);
  assert.match(heroText, /Blues & fusion\. Live music\. Five DIY days in a Polish palace/);
  assert.ok(heroText.includes(params.eventDatesHuman), 'first fold must show the configured event dates');
  assert.match(heroText, /Piotrowice Nyskie Palace, Poland/);
  assert.match(heroText, /Sign up now/);
  assert.match(heroText, /See what it's like/);
  assert.doesNotMatch(heroText, /Reservation Payment|\bpaid\b/i,
    'the first fold must talk about people, not payment mechanics');

  const paid = Number(counter.paid || 0);
  const threshold = Number(params.threshold);
  const status = counter.status === 'open' && paid >= threshold ? 'confirmed' : counter.status;
  if (status === 'open') {
    const remaining = Math.max(0, threshold - paid);
    assert.match(heroText, new RegExp(`${paid} ${paid === 1 ? 'person is' : 'people are'} in\\.`));
    assert.match(heroText, new RegExp(`${remaining === 1 ? 'One' : remaining} more and Open Blues happens\\.`));
    assert.match(heroText, new RegExp(`You could be number ${paid + 1}\\.`));
  } else if (status === 'confirmed') {
    assert.match(heroText, /Open Blues is happening/);
  } else if (status === 'cancelled') {
    assert.match(heroText, /isn't happening/);
  }

  const costText = rendered.get('/cost/').text;
  assert.match(costText, /The €50 Reservation Payment is part of your total and is transferred when you sign up/);
  assert.match(costText, /otherwise it is non-refundable/);

  const bookletText = rendered.get('/booklet/').text;
  assert.match(bookletText, new RegExp(`${params.threshold} Reservation Payments have arrived by ${params.goNoGoHuman}`));
  assert.match(bookletText, /The transfer details are inside the form/);

  const changeText = rendered.get('/change/').text;
  assert.match(changeText, /the (?:personal )?edit link in your confirmation email/i);
  assert.match(changeText, /The form shows which fields remain editable/i);
  assert.match(changeText, /lost (?:your|the) link/i);
  assert.match(changeText, /(?:ask for it|email me my link|send (?:it|the link|your link) again)/i);
  assert.match(changeText, /so it only ever reaches you/i);
  assert.doesNotMatch(changeText, /(?:prove (?:who you are|your identity)|verify your identity|security question)/i);

  const changePage = rendered.get('/change/').raw;
  if (params.recoveryOpen) {
    assert.ok(changePage.includes(params.recoveryURL), '/change/ must link to recoveryURL while recovery is open');
  } else {
    assert.match(changePage, /mailto:openbluespoland@gmail\.com/,
      '/change/ must offer the email recovery path while recovery is closed');
  }

  for (const pagePath of paths) {
    assert.ok(rendered.get(pagePath).raw.includes('change/'), `${pagePath} must keep the durable /change/ route`);
  }

  const hugoConfig = fs.readFileSync(path.join(params.repoRoot, 'hugo.toml'), 'utf8');
  assert.doesNotMatch(hugoConfig, /^\s*close(?:Date|Human)\s*=/m,
    'the removed signup closing date must not remain as a Hugo parameter');

  process.stdout.write(
    `PASS: people-first hero, focused cost/change copy and ${params.banned.length} rejected patterns ` +
    `checked across ${paths.length} pages and ${textAssets.length} text assets.\n`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
