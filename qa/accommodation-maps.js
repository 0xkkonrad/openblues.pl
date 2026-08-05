const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const pageUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://localhost:3118/accommodation/';
const siteRoot = path.resolve(__dirname, '..');

const maps = [
  {
    slug: 'castle-downstairs', width: 1200, height: 900, rooms: 6, places: 22,
    roomCodeFont: 30, secondaryFont: 23,
    roomIds: ['castle-downstairs-a1', 'castle-downstairs-a2', 'castle-downstairs-a3', 'castle-downstairs-b1', 'castle-downstairs-b2', 'castle-downstairs-c1'],
    labels: ['Kitchen', 'Hall', 'Courtyard', 'ENTRANCE', 'Wing A', 'Wing B', 'Wing C', 'WC', 'DOUBLE-SIZE SOFA', '1 LISTED PLACE']
  },
  {
    slug: 'castle-upstairs', width: 1600, height: 850, rooms: 6, places: 20,
    roomCodeFont: 32, secondaryFont: 26,
    roomIds: ['castle-upstairs-1', 'castle-upstairs-2', 'castle-upstairs-3', 'castle-upstairs-4', 'castle-upstairs-5', 'castle-upstairs-6'],
    labels: ['Storage', 'Balcony', 'WC +', 'bath', 'shower', 'Kitchen', 'Dining', 'Stairs', 'Open space', 'Ballroom', 'Table football', 'Ping pong', 'Hall', 'POSSIBLE DOUBLE']
  },
  {
    slug: 'opposite-downstairs', width: 1000, height: 440, rooms: 2, places: 5,
    roomCodeFont: 34, secondaryFont: 20,
    roomIds: ['opposite-downstairs-1', 'opposite-downstairs-2'],
    labels: ['Room 1', 'Hall', 'Room 2', 'ENTRANCE']
  },
  {
    slug: 'opposite-upstairs', width: 1000, height: 650, rooms: 3, places: 6,
    roomCodeFont: 34, secondaryFont: 20,
    roomIds: ['opposite-upstairs-3', 'opposite-upstairs-2', 'opposite-upstairs-1'],
    labels: ['Room 3', 'Room 2', 'Room 1', 'Kitchen', 'Stairs', 'Bathroom', 'ENTRANCE', 'SMALL DOUBLE']
  }
];

const retiredPanels = maps.map(({ slug }) => path.join(siteRoot, 'static', 'images', 'accommodation', `map-${slug}.webp`));

function readMap(slug) {
  return fs.readFileSync(path.join(siteRoot, 'static', 'images', 'accommodation', `map-${slug}.svg`), 'utf8');
}

function staticChecks() {
  retiredPanels.forEach((file) => assert.equal(fs.existsSync(file), false, `retired Sheet panel remains: ${file}`));

  const allRoomIds = [];
  for (const map of maps) {
    const source = readMap(map.slug);
    assert.match(source, new RegExp(`<svg[^>]+width="${map.width}"[^>]+height="${map.height}"[^>]+viewBox="0 0 ${map.width} ${map.height}"`));
    assert.match(source, /<title id="title">[^<]+<\/title>/);
    assert.match(source, /<desc id="desc">[^<]+<\/desc>/);
    assert.doesNotMatch(source, /<(?:image|script|foreignObject)\b/i, `${map.slug} must remain a self-contained vector`);
    assert.doesNotMatch(source, /(?:href|src)="https?:\/\//i, `${map.slug} contains an external resource`);
    assert.doesNotMatch(source, /north|compass/i, `${map.slug} must not invent orientation`);
    map.labels.forEach((label) => assert.ok(source.includes(label), `${map.slug} is missing confirmed label: ${label}`));

    const roomIds = [...source.matchAll(/data-room="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(roomIds, map.roomIds, `${map.slug} room order changed`);
    assert.equal(new Set(roomIds).size, map.rooms, `${map.slug} duplicates a mapped room`);
    allRoomIds.push(...roomIds);
  }

  assert.equal(allRoomIds.length, 17);
  assert.equal(new Set(allRoomIds).size, 17);
  assert.equal(allRoomIds.includes('opposite-right-upstairs-new'), false, 'unconfirmed new room must stay unmapped');
  assert.equal(maps.reduce((sum, map) => sum + map.places, 0), 53);
  assert.equal(53 + 4, 57, 'mapped plus explicitly unmapped capacity changed');

  const manifest = JSON.parse(fs.readFileSync(path.join(siteRoot, 'static', 'images', 'accommodation', 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 3);
  assert.deepEqual(manifest.venueMap.panels, maps.map(({ slug, width, height, rooms, places }) => ({
    src: `/images/accommodation/map-${slug}.svg`, width, height, rooms, places
  })));
  assert.match(manifest.venueMap.redraw, /Door positions, scale and exact furniture placement are intentionally omitted/);

  const content = fs.readFileSync(path.join(siteRoot, 'content', 'accommodation.md'), 'utf8');
  assert.equal((content.match(/map-[a-z-]+\.svg/g) || []).length, 12, 'each SVG should appear once as art and twice as open/download links');
  assert.doesNotMatch(content, /map-(?:castle|opposite)-[a-z-]+\.webp/);
  assert.match(content, /not to scale and intentionally omit door positions/i);
  assert.match(content, /symbols summarize each room’s current inventory/i);
  assert.match(content, /does not confirm a downstairs bathroom/i);
  assert.match(content, /kitchen is directly above the entrance and stairs in the image-left column/i);
  assert.match(content, /recreation area sits above the shower\/WC and hall/i);
}

async function assertSvgGeometry(browser, map) {
  const page = await browser.newPage({ viewport: { width: map.width, height: map.height } });
  try {
    await page.goto(new URL(`/images/accommodation/map-${map.slug}.svg`, pageUrl).href);
    const findings = await page.locator('g:has(> rect.pill), g:has(> rect.pill-sofa), g:has(> rect.pill-mattress)').evaluateAll((groups) => groups.flatMap((group, groupIndex) => {
      const pill = group.querySelector(':scope > rect').getBoundingClientRect();
      const content = [...group.children].slice(1).map((node) => ({ node, box: node.getBoundingClientRect() }));
      const problems = [];
      for (const { node, box } of content) {
        const margin = {
          left: box.left - pill.left,
          right: pill.right - box.right,
          top: box.top - pill.top,
          bottom: pill.bottom - box.bottom
        };
        if (Math.min(...Object.values(margin)) < -0.1) {
          problems.push({ groupIndex, text: node.textContent, margin });
        }
      }
      const textBoxes = content.filter(({ node }) => node.tagName.toLowerCase() === 'text');
      for (let first = 0; first < textBoxes.length; first += 1) {
        for (let second = first + 1; second < textBoxes.length; second += 1) {
          const a = textBoxes[first].box;
          const b = textBoxes[second].box;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 0.5 && overlapY > 0.5) {
            problems.push({ groupIndex, overlap: [textBoxes[first].node.textContent, textBoxes[second].node.textContent], overlapX, overlapY });
          }
        }
      }
      return problems;
    }));
    assert.deepEqual(findings, [], `${map.slug} has clipped or overlapping inventory content`);

    if (map.slug === 'opposite-upstairs') {
      const layout = await page.evaluate(() => Object.fromEntries([
        'kitchen', 'entrance-stairs', 'bathroom'
      ].map((name) => {
        const box = document.querySelector(`[data-space="opposite-upstairs-${name}"]`).getBoundingClientRect();
        return [name, { left: box.left, right: box.right, top: box.top, bottom: box.bottom }];
      })));
      assert.ok(layout.kitchen.bottom <= layout['entrance-stairs'].top + 0.1, 'Opposite upstairs Kitchen must sit above Entrance/Stairs');
      assert.ok(layout.kitchen.right <= layout.bathroom.left + 0.1, 'Opposite upstairs Kitchen must be image-left of Bathroom');
      assert.ok(layout['entrance-stairs'].right <= layout.bathroom.left + 0.1, 'Opposite upstairs Entrance/Stairs must be image-left of Bathroom');
      assert.ok(layout.bathroom.top <= layout.kitchen.top + 0.1 && layout.bathroom.bottom >= layout['entrance-stairs'].bottom - 0.1, 'Opposite upstairs Bathroom must span the right column');
    }

    if (map.slug === 'castle-upstairs') {
      const layout = await page.evaluate(() => Object.fromEntries([
        'recreation', 'shower-wc', 'hall', 'room5-area', 'room6-area'
      ].map((name) => {
        const box = document.querySelector(`[data-space="castle-upstairs-${name}"]`).getBoundingClientRect();
        return [name, { left: box.left, right: box.right, top: box.top, bottom: box.bottom }];
      })));
      assert.ok(layout.recreation.bottom <= layout['shower-wc'].top + 0.1, 'Castle upstairs recreation must sit above Shower/WC');
      assert.ok(layout.recreation.bottom <= layout.hall.top + 0.1, 'Castle upstairs recreation must sit above Hall');
      assert.ok(layout['shower-wc'].right <= layout.hall.left + 0.1, 'Castle upstairs Shower/WC must be image-left of Hall');
      assert.ok(layout['shower-wc'].bottom <= layout['room5-area'].top + 0.1 && layout.hall.bottom <= layout['room5-area'].top + 0.1, 'Castle upstairs Room 5 must sit below Shower/WC and Hall');
      assert.ok(layout['room5-area'].bottom <= layout['room6-area'].top + 0.1, 'Castle upstairs Room 5 must sit above Room 6');
    }
  } finally {
    await page.close();
  }
}

async function browserChecks() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const map of maps) await assertSvgGeometry(browser, map);

    for (const width of [320, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
        const images = page.locator('.stay-map-art');
        await images.evaluateAll((nodes) => Promise.all(nodes.map((node) => node.decode())));
        const rendered = await page.locator('.stay-map-panel').evaluateAll((panels) => panels.map((panel) => {
          const scroller = panel.querySelector('.stay-map-panel__scroll');
          const image = panel.querySelector('.stay-map-art');
          return {
            clientWidth: scroller.clientWidth,
            scrollWidth: scroller.scrollWidth,
            imageWidth: image.getBoundingClientRect().width,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            loading: image.getAttribute('loading')
          };
        }));

        assert.deepEqual(rendered.map(({ naturalWidth, naturalHeight }) => [naturalWidth, naturalHeight]), maps.map(({ width: w, height }) => [w, height]));
        assert.equal(rendered.every(({ loading }) => loading !== 'lazy'), true);

        if (width === 320) {
          rendered.forEach((item, index) => {
            const map = maps[index];
            const ratio = item.imageWidth / item.clientWidth;
            const maxRatio = map.slug === 'castle-upstairs' ? 3 : 2.5;
            assert.ok(ratio <= maxRatio + 0.01, `${map.slug} scroll ratio ${ratio.toFixed(2)} exceeds ${maxRatio}`);
            const scale = item.imageWidth / map.width;
            assert.ok(map.roomCodeFont * scale >= 15.9, `${map.slug} room code renders under 16px`);
            assert.ok(map.secondaryFont * scale >= 12.9, `${map.slug} secondary type renders under 13px`);
            assert.ok(5 * scale >= 1.49, `${map.slug} structural linework renders under 1.5px`);
          });
        }
        if (width === 768) {
          rendered.slice(2).forEach((item, index) => assert.ok(
            item.scrollWidth <= item.clientWidth + 1,
            `${maps[index + 2].slug} should fully fit at 768px`
          ));
        }
        if (width >= 1024) {
          assert.ok(rendered[0].scrollWidth <= rendered[0].clientWidth + 1, 'Castle downstairs should fully fit from 1024px');
        }

        for (let index = 0; index < rendered.length; index += 1) {
          if (rendered[index].scrollWidth <= rendered[index].clientWidth + 1) continue;
          const scroller = page.locator('.stay-map-panel__scroll').nth(index);
          await scroller.focus();
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(150);
          assert.ok(await scroller.evaluate((node) => node.scrollLeft > 0), `${maps[index].slug} is not keyboard-scrollable`);
        }
      } finally {
        await page.close();
      }
    }

    const printPage = await browser.newPage({ viewport: { width: 1120, height: 794 } });
    try {
      await printPage.emulateMedia({ media: 'print' });
      await printPage.goto(pageUrl, { waitUntil: 'networkidle' });
      await printPage.locator('.stay-map-art').evaluateAll((nodes) => Promise.all(nodes.map((node) => node.decode())));
      const boxes = await printPage.locator('.stay-map-art').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height, complete: node.complete, naturalWidth: node.naturalWidth };
      }));
      assert.equal(boxes.every(({ width, height, complete, naturalWidth }) => width > 300 && height > 100 && complete && naturalWidth > 0), true, `blank or tiny print map: ${JSON.stringify(boxes)}`);
    } finally {
      await printPage.close();
    }
  } finally {
    await browser.close();
  }
}

async function run() {
  staticChecks();
  await browserChecks();
  process.stdout.write('PASS: redrawn accommodation maps passed source, geometry, responsive, keyboard and print checks.\n');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
