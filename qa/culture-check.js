// End-to-end contract for the private, client-side homepage culture check.
//
// The quiz is intentionally not a form submission: answers stay in memory for this page view,
// breakfast A and D are both aligned, and every result remains a gentle explanation rather than
// an admission gate. This test exercises all twelve replies plus JS-off progressive enhancement.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const scenarios = [
  {
    name: 'culture-mug',
    legend: 'culture-mug-legend',
    answers: {
      a: 'That’s the spirit. At Open Blues, whoever notices the mug is the volunteer.',
      b: 'Reasonable hotel logic. Here, the palace stays lovely only when all of us pitch in.',
      c: 'Plot twist: you are the volunteer team.',
      d: 'The mug knows. If you spot the tiny job, that’s your cue to help.',
    },
  },
  {
    name: 'culture-carrots',
    legend: 'culture-carrots-legend',
    answers: {
      a: 'Dinner arrives faster when that question comes with rolled-up sleeves.',
      b: 'The carrot emergency has found another member of the volunteer team: you.',
      c: 'Exactly. Dinner is something we make, not something we wait for.',
      d: 'The carrots appreciate the emotional support. They’d appreciate a peeler even more.',
    },
  },
  {
    name: 'culture-breakfast',
    legend: 'culture-breakfast-legend',
    answers: {
      a: 'Exactly. Tiny invitations are how a gathering becomes a community.',
      b: 'The official welcome committee is whoever notices. Today, that’s you.',
      c: 'Your tote bag can handle the floor. A tiny hello goes a long way.',
      d: 'Also good. Shy hospitality is still hospitality. If telepathy fails, deploy the tiny wave.',
    },
  },
];

async function choose(page, questionIndex, value) {
  const question = page.locator('[data-culture-question]').nth(questionIndex);
  await question.locator(`input[value="${value}"]`).check();
}

async function finish(page, choices) {
  for (let index = 0; index < choices.length; index += 1) {
    await choose(page, index, choices[index]);
    await page.locator('[data-culture-next]').click();
  }
}

async function runInteractive(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  const offOrigin = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) {
      offOrigin.push(request.url());
    }
  });

  const response = await page.goto(origin + '/', { waitUntil: 'networkidle' });
  assert.ok(response && response.ok(), `homepage returned ${response && response.status()}`);

  const quiz = page.locator('[data-culture-check]');
  assert.equal(await quiz.count(), 1, 'homepage must carry one culture check');
  assert.equal(await quiz.locator('[data-culture-question]').count(), 3, 'culture check must carry three scenarios');
  assert.equal(await quiz.locator('input[type="radio"]').count(), 12, 'each scenario must carry four answers');
  const alignedOptions = await quiz.locator('input[data-aligned]').evaluateAll((inputs) =>
    inputs.map((input) => `${input.name}:${input.value}`).sort());
  assert.deepEqual(alignedOptions, [
    'culture-breakfast:a',
    'culture-breakfast:d',
    'culture-carrots:c',
    'culture-mug:a',
  ], 'only mug A, carrots C, and breakfast A/D may be culture-aligned');
  assert.equal(await quiz.locator('picture source[srcset]').count(), 3, 'each scenario needs a responsive image');
  assert.equal(await quiz.locator('img[width][height][loading="lazy"]').count(), 3, 'quiz images need dimensions and lazy loading');
  assert.equal(await quiz.locator('[data-culture-question]:visible').count(), 1, 'enhanced quiz shows one question at a time');
  assert.equal(await quiz.locator('[data-culture-next]').isDisabled(), true, 'Next starts disabled');

  // Native radio controls must work from the keyboard, not only by clicking their labels.
  const firstRadio = quiz.locator('input[name="culture-mug"][value="a"]');
  await firstRadio.focus();
  await page.keyboard.press('Space');
  assert.equal(await firstRadio.isChecked(), true, 'Space must choose the focused answer');

  // Every one of the twelve options gets its own visible, exact response.
  for (let questionIndex = 0; questionIndex < scenarios.length; questionIndex += 1) {
    const scenario = scenarios[questionIndex];
    const question = quiz.locator('[data-culture-question]').nth(questionIndex);
    for (const [value, feedback] of Object.entries(scenario.answers)) {
      await choose(page, questionIndex, value);
      assert.equal(await question.locator('[data-culture-feedback]').textContent(), feedback);
      assert.equal(await question.locator('[data-culture-feedback]').isVisible(), true);
    }

    // Leave the aligned D choice selected on breakfast; A and D are verified separately below.
    const finalChoice = questionIndex === 0 ? 'a' : questionIndex === 1 ? 'c' : 'd';
    await choose(page, questionIndex, finalChoice);

    if (questionIndex < scenarios.length - 1) {
      await quiz.locator('[data-culture-next]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), scenarios[questionIndex + 1].legend,
        'Next must focus the new question legend');
    }
  }

  // Back preserves both the selected answer and its feedback.
  await quiz.locator('[data-culture-back]').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), scenarios[1].legend);
  assert.equal(await quiz.locator('input[name="culture-carrots"][value="c"]').isChecked(), true);
  assert.equal(await quiz.locator('[data-culture-question]').nth(1).locator('[data-culture-feedback]').textContent(),
    scenarios[1].answers.c);
  await quiz.locator('[data-culture-next]').click();
  assert.equal(await quiz.locator('input[name="culture-breakfast"][value="d"]').isChecked(), true);

  // Mug A + carrots C + breakfast D is the high path. D is explicitly a good breakfast answer.
  await quiz.locator('[data-culture-next]').click();
  assert.equal(await quiz.locator('[data-result-tier="high"]').isVisible(), true);
  assert.equal(await quiz.locator('[data-result-tier="high"] h4').textContent(), 'You already speak Open Blues.');
  assert.match(await quiz.locator('[data-result-tier="high"] a').getAttribute('href'), /\/cost\/$/);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'You already speak Open Blues.');

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    resultTypes: ['violations'],
  }));
  assert.deepEqual(axe.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target),
  })), [], `quiz result has accessibility violations:\n${JSON.stringify(axe.violations, null, 2)}`);

  // Replay fully clears state. Then prove low and each breakfast-positive route independently.
  await quiz.locator('[data-culture-reset]').click();
  assert.equal(await quiz.locator('input:checked').count(), 0);
  assert.equal(await quiz.locator('[data-culture-question]').first().isVisible(), true);
  assert.equal(await quiz.locator('[data-culture-next]').isDisabled(), true);

  await finish(page, ['b', 'b', 'c']);
  assert.equal(await quiz.locator('[data-result-tier="low"]').isVisible(), true);
  assert.match(await quiz.locator('[data-result-tier="low"] a').getAttribute('href'), /\/booklet\/#diy-tasks-chores$/);

  await quiz.locator('[data-culture-reset]').click();
  await finish(page, ['b', 'b', 'd']);
  assert.equal(await quiz.locator('[data-result-tier="middle"]').isVisible(), true,
    'breakfast D alone must move the result above the low tier');

  await quiz.locator('[data-culture-reset]').click();
  await finish(page, ['b', 'b', 'a']);
  assert.equal(await quiz.locator('[data-result-tier="middle"]').isVisible(), true,
    'breakfast A alone must move the result above the low tier');

  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  assert.ok(width.scroll <= width.inner, `homepage overflows at 390px: ${JSON.stringify(width)}`);
  assert.equal((await context.cookies()).length, 0, 'quiz must not set cookies');
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
    { local: 0, session: 0 }, 'quiz must not persist answers');
  assert.deepEqual(offOrigin, [], `quiz made off-origin requests:\n${offOrigin.join('\n')}`);
  assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`);

  await context.close();
}

async function runWithoutJavaScript(browser) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  const page = await context.newPage();
  const response = await page.goto(origin + '/');
  assert.ok(response && response.ok(), `JS-off homepage returned ${response && response.status()}`);

  const quiz = page.locator('[data-culture-check]');
  assert.equal(await quiz.locator('[data-culture-question]:visible').count(), 3,
    'all three questions must remain readable without JavaScript');
  assert.equal(await quiz.locator('[data-culture-nav]').isVisible(), false);
  assert.equal(await quiz.locator('[data-culture-result]').isVisible(), false);
  assert.match(await quiz.locator('noscript').textContent(), /Open Blues works because everyone helps with small jobs/);

  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  assert.ok(width.scroll <= width.inner, `JS-off homepage overflows at 320px: ${JSON.stringify(width)}`);
  await context.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    await runInteractive(browser);
    await runWithoutJavaScript(browser);
    process.stdout.write('PASS: all 12 culture-check replies, every result path, breakfast A/D, keyboard, replay, axe, privacy and JS-off fallback.\n');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
