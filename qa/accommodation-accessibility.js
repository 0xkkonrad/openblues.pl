const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const baseUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://localhost:3118/accommodation/';
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(async () => window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        resultTypes: ['violations']
      }));
      const summary = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target)
      }));
      assert.deepEqual(summary, [], `${width}px accessibility violations:\n${JSON.stringify(summary, null, 2)}`);
      await context.close();
    }
    process.stdout.write('PASS: static accommodation guide passed axe WCAG 2.0 A/AA and 2.1 AA at 4 viewports.\n');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
