const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const pageUrl = process.env.OPENBLUES_PREVIEW_URL || 'http://localhost:3118/accommodation/';
const siteRoot = path.resolve(__dirname, '..');
const canonicalAccommodationUrl = 'https://openblues.pl/accommodation/';
const redundantCapacityCopy = /\b(?:person[- ]?)?places?\b/i;

const maps = [
  {
    slug: 'castle-downstairs', width: 1200, height: 900, rooms: 6, places: 22,
    roomCodeFont: 30, secondaryFont: 23,
    roomIds: ['castle-downstairs-a1', 'castle-downstairs-a2', 'castle-downstairs-a3', 'castle-downstairs-b1', 'castle-downstairs-b2', 'castle-downstairs-c1'],
    labels: ['Kitchen', 'Hall', 'Courtyard', 'ENTRANCE', 'Wing A', 'Wing B', 'Wing C', 'WC', 'DOUBLE-SIZE SOFA', 'SINGLE OCCUPANCY']
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

function readAttribute(markup, name) {
  const match = markup.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match && match[1];
}

function roomLinkTarget(roomId) {
  return `${canonicalAccommodationUrl}#room-${roomId}`;
}

function staticChecks() {
  retiredPanels.forEach((file) => assert.equal(fs.existsSync(file), false, `retired Sheet panel remains: ${file}`));

  const allRoomIds = [];
  const allDocumentIds = [];
  const allAccessibleLabels = [];
  const allScopeClasses = [];
  for (const map of maps) {
    const source = readMap(map.slug);
    const root = source.match(/<svg\b[^>]*>/i)?.[0];
    assert.ok(root, `${map.slug} is missing an SVG root`);
    assert.equal(readAttribute(root, 'width'), String(map.width));
    assert.equal(readAttribute(root, 'height'), String(map.height));
    assert.equal(readAttribute(root, 'viewBox'), `0 0 ${map.width} ${map.height}`);
    assert.equal(readAttribute(root, 'role'), 'group', `${map.slug} root must expose one named group`);

    const rootClasses = (readAttribute(root, 'class') || '').split(/\s+/).filter(Boolean);
    assert.ok(rootClasses.includes('stay-map-art'), `${map.slug} is missing the shared inline-map class`);
    const scopeClasses = rootClasses.filter((className) => className.startsWith('map-'));
    assert.equal(scopeClasses.length, 1, `${map.slug} needs exactly one map-specific CSS scope class`);
    allScopeClasses.push(scopeClasses[0]);

    const labelId = readAttribute(root, 'aria-labelledby');
    const descriptionId = readAttribute(root, 'aria-describedby');
    assert.ok(labelId && descriptionId && labelId !== descriptionId, `${map.slug} needs unique title and description references`);
    assert.match(source, new RegExp(`<title\\s+id=["']${labelId}["'][^>]*>[^<]+<\\/title>`));
    assert.match(source, new RegExp(`<desc\\s+id=["']${descriptionId}["'][^>]*>[^<]+<\\/desc>`));

    const ids = [...source.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${map.slug} contains duplicate IDs`);
    allDocumentIds.push(...ids);

    assert.match(source, /<g\b[^>]*aria-hidden=["']true["'][^>]*>/i, `${map.slug} visual drawing must be hidden from assistive technology`);
    assert.doesNotMatch(source, /<(?:image|script|foreignObject|iframe|object|link)\b/i, `${map.slug} must remain a self-contained vector without script or raster content`);
    assert.doesNotMatch(source, /\son[a-z]+\s*=/i, `${map.slug} contains an inline event handler`);
    assert.doesNotMatch(source, /@import|url\(\s*["']?(?:https?:)?\/\//i, `${map.slug} contains an external font or stylesheet fetch`);
    assert.doesNotMatch(source, /__[A-Z][A-Z0-9_-]*__|\b(?:TODO|FIXME|placeholder)\b/i, `${map.slug} contains an unfinished placeholder`);
    assert.doesNotMatch(source, /north|compass/i, `${map.slug} must not invent orientation`);
    map.labels.forEach((label) => assert.ok(source.includes(label), `${map.slug} is missing confirmed label: ${label}`));

    const publicCopy = [
      ...[...source.matchAll(/<(title|desc|text)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2].replace(/<[^>]+>/g, ' ')),
      ...[...source.matchAll(/\baria-label=["']([^"']+)["']/gi)].map((match) => match[1])
    ].join(' ');
    assert.doesNotMatch(publicCopy, redundantCapacityCopy, `${map.slug} repeats sleeping-surface capacity in public map copy`);

    const anchors = [...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
      attributes: match[1],
      body: match[2]
    }));
    assert.equal(anchors.length, map.rooms, `${map.slug} must contain one link per mapped room and no unrelated links`);
    const roomIds = anchors.map(({ attributes }) => readAttribute(attributes, 'data-room'));
    assert.deepEqual(roomIds, map.roomIds, `${map.slug} room order changed`);
    assert.equal(new Set(roomIds).size, map.rooms, `${map.slug} duplicates a mapped room`);
    anchors.forEach(({ attributes, body }, index) => {
      const roomId = roomIds[index];
      const label = readAttribute(attributes, 'aria-label');
      assert.equal(readAttribute(attributes, 'href'), roomLinkTarget(roomId), `${map.slug} ${roomId} has the wrong canonical card target`);
      assert.ok(label && /photo and details$/i.test(label), `${map.slug} ${roomId} needs a useful accessible label`);
      assert.equal((body.match(/<title\b[^>]*>([^<]+)<\/title>/i) || [])[1], label, `${map.slug} ${roomId} title must match its accessible label`);
      assert.equal((body.match(/class=["'][^"']*\broom-hit\b[^"']*["']/gi) || []).length, 1, `${map.slug} ${roomId} needs one hit region`);
      assert.equal((body.match(/class=["'][^"']*\broom-focus\b[^"']*["']/gi) || []).length, 1, `${map.slug} ${roomId} needs one visible focus region`);
      allAccessibleLabels.push(label);
    });

    const externalReferences = [...source.matchAll(/\b(?:href|src)=["'](https?:\/\/[^"']+)["']/gi)].map((match) => match[1]);
    assert.deepEqual(externalReferences, roomIds.map(roomLinkTarget), `${map.slug} contains an unapproved external reference`);
    allRoomIds.push(...roomIds);
  }

  assert.equal(allRoomIds.length, 17);
  assert.equal(new Set(allRoomIds).size, 17);
  assert.equal(new Set(allDocumentIds).size, allDocumentIds.length, 'inline maps would introduce duplicate document IDs');
  assert.equal(new Set(allAccessibleLabels).size, 17, 'room-map links need unique accessible labels');
  assert.equal(new Set(allScopeClasses).size, maps.length, 'each inline map needs a unique CSS scope class');
  assert.equal(allRoomIds.includes('opposite-right-upstairs-new'), false, 'unconfirmed new room must stay unmapped');
  assert.equal(maps.reduce((sum, map) => sum + map.places, 0), 53);
  assert.equal(53 + 4, 57, 'mapped plus explicitly unmapped capacity changed');

  const manifest = JSON.parse(fs.readFileSync(path.join(siteRoot, 'static', 'images', 'accommodation', 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 4);
  assert.deepEqual(manifest.venueMap.panels, maps.map(({ slug, width, height, rooms, places }) => ({
    src: `/images/accommodation/map-${slug}.svg`, width, height, rooms, places
  })));
  assert.match(manifest.venueMap.redraw, /Door positions, scale and exact furniture placement are intentionally omitted/);
  assert.match(manifest.venueMap.interaction, /17 mapped room regions links? to (?:its|their) matching photo card/i);

  const content = fs.readFileSync(path.join(siteRoot, 'content', 'accommodation.md'), 'utf8');
  const inlineMapSlugs = [...content.matchAll(/\{\{<\s*accommodation-map\s+slug=["']([^"']+)["']\s*>\}\}/g)].map((match) => match[1]);
  assert.deepEqual(inlineMapSlugs, maps.map(({ slug }) => slug), 'content must inline each map exactly once through the allowlisted shortcode');
  assert.equal((content.match(/map-[a-z-]+\.svg/g) || []).length, 8, 'each standalone SVG should remain linked for open and download');
  assert.doesNotMatch(content, /map-(?:castle|opposite)-[a-z-]+\.webp/);
  assert.match(content, /Tap or click a room to jump to its photo and details/i);
  assert.equal((content.match(/id=["']room-[^"']+["']\s+data-room-id=/g) || []).length, 18, 'every room card needs a stable map target ID');
  assert.match(content, /Layout is approximate: no scale or confirmed door and furniture positions/i);
  assert.match(content, /colou?rs and symbols[^<]*types?[^<]*(?:not|never)[^<]*availability/i, 'map copy must explain that colour and symbols encode type, not live availability');

  const roomSummaries = [...content.matchAll(/<div class=["']stay-room-card__body["']>[\s\S]*?<span>([^<]+)<\/span>/g)].map((match) => match[1].trim());
  assert.equal(roomSummaries.length, 18, 'every room card needs one plain sleeping-surface summary');
  roomSummaries.forEach((summary) => {
    assert.doesNotMatch(summary, redundantCapacityCopy, `room summary repeats capacity: ${summary}`);
    assert.doesNotMatch(summary, /\b(?:free|taken|held|not[- ]open|available|availability|reserved|unavailable)\b/i, `room summary leaks mutable availability: ${summary}`);
  });
  const a3Article = content.match(/<article\b[^>]*data-room-id=["']castle-downstairs-a3["'][^>]*>[\s\S]*?<\/article>/i)?.[0] || '';
  const a3Summary = a3Article.match(/<div class=["']stay-room-card__body["']>[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] || '';
  assert.match(a3Summary, /double-size sofa[^<]*single occupancy/i, 'A3 must preserve its non-obvious single-occupancy sofa exception');
  assert.match(content, /does not confirm a downstairs bathroom/i);
  assert.match(content, /kitchen[^<]*above (?:the )?entrance and stairs[^<]*bathroom[^<]*(?:right|image-right)/i);
  assert.match(content, /recreation(?: area)? sits above (?:the )?shower\/WC and hall/i);
}

async function assertSvgGeometry(browser, map) {
  const page = await browser.newPage({ viewport: { width: map.width, height: map.height } });
  try {
    const directUrl = new URL(`/images/accommodation/map-${map.slug}.svg`, pageUrl).href;
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    const response = await page.goto(directUrl, { waitUntil: 'networkidle' });
    assert.ok(response && response.ok(), `${map.slug} standalone SVG did not load`);

    const root = page.locator('svg.stay-map-art');
    assert.equal(await root.count(), 1, `${map.slug} standalone file needs exactly one SVG root`);
    const rootFacts = await root.evaluate((svg) => ({
      role: svg.getAttribute('role'),
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
      scopeClasses: [...svg.classList].filter((className) => className.startsWith('map-')),
      title: svg.querySelector(':scope > title')?.textContent?.trim(),
      description: svg.querySelector(':scope > desc')?.textContent?.trim()
    }));
    assert.equal(rootFacts.role, 'group');
    assert.equal(rootFacts.viewBox, `0 0 ${map.width} ${map.height}`);
    assert.deepEqual([rootFacts.width, rootFacts.height], [String(map.width), String(map.height)]);
    assert.equal(rootFacts.scopeClasses.length, 1);
    assert.ok(rootFacts.title && rootFacts.description, `${map.slug} standalone root needs a title and description`);

    const unscopedSelectors = await root.evaluate((svg, scopeClass) => {
      const findings = [];
      const visit = (rules) => {
        for (const rule of rules || []) {
          if (rule.selectorText) {
            for (const selector of rule.selectorText.split(',')) {
              if (!selector.trim().includes(`.${scopeClass}`)) findings.push(selector.trim());
            }
          }
          if (rule.cssRules) visit(rule.cssRules);
        }
      };
      for (const style of svg.querySelectorAll(':scope > style')) visit(style.sheet?.cssRules);
      return findings;
    }, rootFacts.scopeClasses[0]);
    assert.deepEqual(unscopedSelectors, [], `${map.slug} contains CSS selectors that can leak when inlined`);

    const roomLinks = page.locator('svg.stay-map-art a[data-room]');
    const linkFacts = await roomLinks.evaluateAll((links) => links.map((link) => ({
      roomId: link.getAttribute('data-room'),
      href: link.getAttribute('href'),
      label: link.getAttribute('aria-label'),
      title: link.querySelector(':scope > title')?.textContent?.trim(),
      hiddenByAncestor: Boolean(link.closest('[aria-hidden="true"]')),
      hitRegions: link.querySelectorAll('.room-hit').length,
      focusRegions: link.querySelectorAll('.room-focus').length,
      tabIndex: link.tabIndex
    })));
    assert.deepEqual(linkFacts.map(({ roomId }) => roomId), map.roomIds, `${map.slug} standalone room links changed`);
    linkFacts.forEach((link) => {
      assert.equal(link.href, roomLinkTarget(link.roomId));
      assert.ok(link.label && link.label === link.title, `${map.slug} ${link.roomId} needs one matching accessible label and title`);
      assert.equal(link.hiddenByAncestor, false, `${map.slug} ${link.roomId} is hidden from assistive technology`);
      assert.deepEqual([link.hitRegions, link.focusRegions, link.tabIndex], [1, 1, 0]);
    });

    const exposedDrawingText = await root.locator('text').evaluateAll((nodes) => nodes
      .filter((node) => !node.closest('[aria-hidden="true"]'))
      .map((node) => node.textContent.trim()));
    assert.deepEqual(exposedDrawingText, [], `${map.slug} exposes decorative drawing text to assistive technology`);

    const accessibilitySnapshot = (await root.ariaSnapshot()).trim();
    const expectedSnapshot = [
      `- group "${rootFacts.title}":`,
      ...linkFacts.flatMap(({ label, href }) => [
        `  - link "${label}":`,
        `    - /url: ${href}`
      ])
    ].join('\n');
    assert.equal(accessibilitySnapshot, expectedSnapshot, `${map.slug} accessibility tree must contain only one map group and its room links`);

    assert.deepEqual(requests, [directUrl], `${map.slug} standalone SVG fetched an external font, script or image`);

    const findings = await page.locator('g:has(> rect.pill), g:has(> rect.pill-sofa)').evaluateAll((groups) => groups.flatMap((group, groupIndex) => {
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

    const firstLink = roomLinks.first();
    const focusShape = firstLink.locator('.room-focus');
    const visibleOutline = (state) => {
      assert.ok(Number(state.strokeOpacity) >= 0.9, `${map.slug} room ${state.mode} outline is transparent`);
      assert.ok(parseFloat(state.strokeWidth) >= 3, `${map.slug} room ${state.mode} outline is thinner than 3px`);
      assert.notEqual(state.stroke, 'none', `${map.slug} room ${state.mode} outline has no stroke`);
    };
    await firstLink.hover();
    await page.waitForTimeout(200);
    visibleOutline({
      mode: 'hover',
      ...await focusShape.evaluate((node) => {
        const style = getComputedStyle(node);
        return { stroke: style.stroke, strokeOpacity: style.strokeOpacity, strokeWidth: style.strokeWidth };
      })
    });
    await page.mouse.move(map.width - 2, 2);
    await firstLink.focus();
    await page.waitForTimeout(200);
    visibleOutline({
      mode: 'focus',
      ...await focusShape.evaluate((node) => {
        const style = getComputedStyle(node);
        return { stroke: style.stroke, strokeOpacity: style.strokeOpacity, strokeWidth: style.strokeWidth };
      })
    });
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
        const inlineMaps = page.locator('.stay-map-panel__scroll > svg.stay-map-art');
        assert.equal(await inlineMaps.count(), maps.length, 'the page must contain four direct-child inline map roots');
        const rendered = await page.locator('.stay-map-panel').evaluateAll((panels) => panels.map((panel) => {
          const scroller = panel.querySelector('.stay-map-panel__scroll');
          const svg = scroller.querySelector(':scope > svg.stay-map-art');
          const box = svg.getBoundingClientRect();
          const viewBox = svg.viewBox.baseVal;
          return {
            clientWidth: scroller.clientWidth,
            scrollWidth: scroller.scrollWidth,
            imageWidth: box.width,
            imageHeight: box.height,
            sourceWidth: Number(svg.getAttribute('width')),
            sourceHeight: Number(svg.getAttribute('height')),
            viewBox: [viewBox.x, viewBox.y, viewBox.width, viewBox.height],
            role: svg.getAttribute('role'),
            scopeClasses: [...svg.classList].filter((className) => className.startsWith('map-')),
            titleId: svg.getAttribute('aria-labelledby'),
            descriptionId: svg.getAttribute('aria-describedby')
          };
        }));

        assert.deepEqual(rendered.map(({ sourceWidth, sourceHeight }) => [sourceWidth, sourceHeight]), maps.map(({ width: w, height }) => [w, height]));
        assert.deepEqual(rendered.map(({ viewBox }) => viewBox), maps.map(({ width: w, height }) => [0, 0, w, height]));
        assert.equal(rendered.every(({ imageWidth, imageHeight, role }) => imageWidth > 0 && imageHeight > 0 && role === 'group'), true, `blank or unnamed inline map at ${width}px`);
        assert.equal(new Set(rendered.flatMap(({ scopeClasses }) => scopeClasses)).size, maps.length, 'inline map root scope classes must be unique');
        assert.equal(rendered.every(({ scopeClasses }) => scopeClasses.length === 1), true, 'each inline map must have exactly one CSS scope class');
        assert.equal(new Set(rendered.map(({ titleId }) => titleId)).size, maps.length, 'inline map title IDs must be unique');
        assert.equal(new Set(rendered.map(({ descriptionId }) => descriptionId)).size, maps.length, 'inline map description IDs must be unique');

        const duplicateIds = await page.locator('[id]').evaluateAll((nodes) => {
          const counts = new Map();
          for (const node of nodes) counts.set(node.id, (counts.get(node.id) || 0) + 1);
          return [...counts].filter(([, count]) => count > 1);
        });
        assert.deepEqual(duplicateIds, [], `duplicate IDs after inlining maps at ${width}px`);

        const typography = await inlineMaps.evaluateAll((svgs) => svgs.map((svg) => ({
          roomCode: parseFloat(getComputedStyle(svg.querySelector('.room-code')).fontSize),
          secondary: parseFloat(getComputedStyle(svg.querySelector('.pill-text')).fontSize)
        })));
        assert.deepEqual(typography, maps.map(({ roomCodeFont, secondaryFont }) => ({ roomCode: roomCodeFont, secondary: secondaryFont })), `inline SVG style cascade changed map typography at ${width}px`);

        const allRoomIds = maps.flatMap(({ roomIds }) => roomIds);
        const mapLinkFacts = await page.locator('svg.stay-map-art a[data-room]').evaluateAll((links) => links.map((link) => {
          const href = link.getAttribute('href');
          const target = document.getElementById(href.split('#')[1]);
          return {
            roomId: link.getAttribute('data-room'),
            href,
            label: link.getAttribute('aria-label'),
            title: link.querySelector(':scope > title')?.textContent?.trim(),
            targetExists: Boolean(target),
            targetRoomId: target?.getAttribute('data-room-id'),
            hiddenByAncestor: Boolean(link.closest('[aria-hidden="true"]'))
          };
        }));
        assert.deepEqual(mapLinkFacts.map(({ roomId }) => roomId), allRoomIds, 'the inline maps need exactly the 17 confirmed room links in floor-plan order');
        assert.equal(new Set(mapLinkFacts.map(({ label }) => label)).size, 17, 'inline room links need unique accessible labels');
        mapLinkFacts.forEach((link) => {
          assert.equal(link.href, roomLinkTarget(link.roomId));
          assert.ok(link.label && link.label === link.title, `${link.roomId} needs one matching accessible label and title`);
          assert.equal(link.targetExists, true, `${link.roomId} map link has no room-card target`);
          assert.equal(link.targetRoomId, link.roomId, `${link.roomId} map link targets the wrong room card`);
          assert.equal(link.hiddenByAncestor, false, `${link.roomId} map link is hidden from assistive technology`);
        });

        const exposedDrawingText = await inlineMaps.locator('text').evaluateAll((nodes) => nodes
          .filter((node) => !node.closest('[aria-hidden="true"]'))
          .map((node) => node.textContent.trim()));
        assert.deepEqual(exposedDrawingText, [], 'inlined decorative map text leaked into the accessibility tree');

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

          const hitTargets = await page.locator('svg.stay-map-art a[data-room] .room-hit').evaluateAll((nodes) => nodes.map((node) => {
            const box = node.getBoundingClientRect();
            return {
              roomId: node.closest('a[data-room]').getAttribute('data-room'),
              width: box.width,
              height: box.height,
              pointerEvents: getComputedStyle(node).pointerEvents
            };
          }));
          assert.equal(hitTargets.length, 17);
          for (const hit of hitTargets) {
            assert.ok(hit.width >= 44 && hit.height >= 44, `${hit.roomId} effective hit region is ${hit.width.toFixed(1)}x${hit.height.toFixed(1)}px at 320px`);
            assert.notEqual(hit.pointerEvents, 'none', `${hit.roomId} hit region ignores pointer input`);
          }

          const firstMapScroller = page.locator('.stay-map-panel__scroll').first();
          await firstMapScroller.focus();
          const keyboardVisits = [];
          for (let step = 0; step < 80 && keyboardVisits.length < 17; step += 1) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(30);
            const visit = await page.evaluate(() => {
              const active = document.activeElement;
              const roomId = active?.getAttribute?.('data-room');
              if (!roomId) return null;
              const scroller = active.closest('.stay-map-panel__scroll');
              const scrollerBox = scroller.getBoundingClientRect();
              const hitBox = active.querySelector('.room-hit').getBoundingClientRect();
              return {
                roomId,
                panelId: active.closest('.stay-map-panel').id,
                scrollLeft: scroller.scrollLeft,
                visibleHitWidth: Math.max(0, Math.min(hitBox.right, scrollerBox.right) - Math.max(hitBox.left, scrollerBox.left))
              };
            });
            if (visit) keyboardVisits.push(visit);
          }
          assert.deepEqual(keyboardVisits.map(({ roomId }) => roomId), allRoomIds, 'Tab must reach every inline room link once in floor-plan order');
          assert.equal(keyboardVisits.every(({ visibleHitWidth }) => visibleHitWidth > 0), true, 'every focused room needs a visible focus region inside its scroller');
          maps.forEach((map) => assert.ok(
            keyboardVisits.some(({ panelId, scrollLeft }) => panelId === `map-${map.slug}` && scrollLeft > 0),
            `${map.slug} did not pan to an off-screen room during the 17-link keyboard sequence`
          ));

          const firstMapLink = page.locator('svg.stay-map-art a[data-room]').first();
          await firstMapLink.focus();
          await page.waitForTimeout(200);
          const inlineFocus = await firstMapLink.locator('.room-focus').evaluate((node) => {
            const style = getComputedStyle(node);
            return { stroke: style.stroke, strokeOpacity: Number(style.strokeOpacity), strokeWidth: parseFloat(style.strokeWidth) };
          });
          assert.ok(inlineFocus.stroke !== 'none' && inlineFocus.strokeOpacity >= 0.9 && inlineFocus.strokeWidth >= 3, 'inline room focus outline is not visibly rendered');
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
      const boxes = await printPage.locator('.stay-map-art').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const viewBox = node.viewBox.baseVal;
        return {
          width: box.width,
          height: box.height,
          viewBox: [viewBox.x, viewBox.y, viewBox.width, viewBox.height],
          visibleRoomLinks: node.querySelectorAll('a[data-room]').length
        };
      }));
      assert.deepEqual(boxes.map(({ viewBox }) => viewBox), maps.map(({ width, height }) => [0, 0, width, height]));
      assert.deepEqual(boxes.map(({ visibleRoomLinks }) => visibleRoomLinks), maps.map(({ rooms }) => rooms));
      assert.equal(boxes.every(({ width, height }) => width > 300 && height > 100), true, `blank or tiny print map: ${JSON.stringify(boxes)}`);
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
  process.stdout.write('PASS: inline interactive accommodation maps passed source, accessibility, standalone, geometry, responsive, keyboard and print checks.\n');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
