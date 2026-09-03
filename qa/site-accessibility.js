// axe-core over every participant-facing page at four viewports.
//
// qa/accommodation-accessibility.js already does this for /accommodation/ alone. This is the
// same check widened to the pages the 2027 signup flow actually runs through — /cost/ and
// /change/ above all, because those two are new or rewritten and carry the only interactive
// controls on the site.
//
// /cost/ is additionally checked in its interacted state: a calculator that is accessible at
// rest and broken after you touch it is not accessible. axe runs again after every control has
// been exercised.
//
// Needs a served build: OPENBLUES_PREVIEW_ORIGIN (default http://localhost:3118).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const origin = (process.env.OPENBLUES_PREVIEW_ORIGIN || 'http://localhost:3118').replace(/\/$/, '');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const paths = ['/', '/cost/', '/change/', '/booklet/', '/spread-the-word/', '/404.html'];
const viewports = [320, 390, 768, 1440];

const runAxe = (page) => page.evaluate(async () => window.axe.run(document, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  resultTypes: ['violations'],
}));

const summarise = (results) => results.violations.map((violation) => ({
  id: violation.id,
  impact: violation.impact,
  help: violation.help,
  targets: violation.nodes.map((node) => node.target),
}));

async function run() {
  const browser = await chromium.launch({ headless: true });
  let checks = 0;
  try {
    for (const width of viewports) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
      const page = await context.newPage();
      for (const path of paths) {
        const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
        assert.ok(response && response.ok(), `${path} returned ${response && response.status()}`);
        await page.addScriptTag({ content: axeSource });

        const summary = summarise(await runAxe(page));
        assert.deepEqual(summary, [],
          `${path} at ${width}px — accessibility violations:\n${JSON.stringify(summary, null, 2)}`);
        checks += 1;

        if (path === '/cost/') {
          // Exercise every control, then re-run: a live region that announces the new total, or
          // an error state, only exists after interaction.
          await page.evaluate(() => {
            const fire = (node) => {
              for (const type of ['input', 'change']) node.dispatchEvent(new Event(type, { bubbles: true }));
            };
            for (const select of document.querySelectorAll('select')) {
              if (select.options.length > 1) { select.selectedIndex = select.options.length - 1; fire(select); }
            }
            for (const box of document.querySelectorAll('input[type=checkbox]')) { box.checked = !box.checked; fire(box); }
            const radios = document.querySelectorAll('input[type=radio]');
            if (radios.length) { radios[radios.length - 1].checked = true; fire(radios[radios.length - 1]); }
          });
          const after = summarise(await runAxe(page));
          assert.deepEqual(after, [],
            `/cost/ at ${width}px after interacting with the calculator — accessibility violations:\n` +
            JSON.stringify(after, null, 2));
          checks += 1;
        }
      }
      await context.close();
    }
    process.stdout.write(
      `PASS: ${checks} axe runs (WCAG 2.0 A/AA + 2.1 AA) across ${paths.length} pages ` +
      `at ${viewports.length} viewports, including /cost/ after interaction.\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
