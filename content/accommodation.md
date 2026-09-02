---
title: "Accommodation"
description: "Browse the Open Blues rooms and floor plans. Participants who selected a bed and paid the €50 Reservation Payment choose their sleeping place in the self-service Sheet."
url: /accommodation/
pageClass: accommodation-page
hideTitle: true
styles:
  - css/accommodation.css
robots: "noindex, nofollow, noarchive, nosnippet"
referrerPolicy: "no-referrer"
sitemap:
  disable: true
---

<section class="stay-hero" aria-labelledby="stay-title">
  <div class="stay-hero__copy">
    <p class="stay-eyebrow">Open Blues {{< event-year >}} · sleeping places</p>
    <h1 id="stay-title">See the rooms.<br>Choose your place in the Sheet.</h1>
    <p class="stay-lede">Photos and floor plans live here. Names, availability and every change live in one shared Google Sheet, the Room Browser. It is for participants who selected a bed and paid the €50 Reservation Payment; the accommodation balance is paid later in cash at the venue.</p>
    <div class="stay-actions">
      {{< room-browser-cta variant="hero" >}}
    </div>
    <a class="stay-skip" href="#room-guide">Browse photos first <span aria-hidden="true">↓</span></a>
    <p class="stay-device-note"><strong>On a computer,</strong> edit in your browser. <strong>On a phone:</strong> Google requires the Sheets app to edit; the phone-browser preview is read-only.</p>
  </div>
  <div class="stay-hero__mosaic" aria-hidden="true">
    <img class="stay-hero__main" src="/images/accommodation/ballroom-960.webp" srcset="/images/accommodation/ballroom-480.webp 480w, /images/accommodation/ballroom-960.webp 960w, /images/accommodation/ballroom-1440.webp 1440w" sizes="(max-width: 760px) 92vw, 42vw" alt="" width="960" height="540" fetchpriority="high">
    <img src="/images/accommodation/castle-downstairs-a1-480.webp" alt="" width="480" height="266">
    <img src="/images/accommodation/opposite-upstairs-2-480.webp" alt="" width="480" height="270">
  </div>
</section>

<section class="stay-authority" aria-label="Where accommodation information lives">
  <div>
    <span class="stay-authority__number" aria-hidden="true">01</span>
    <p class="stay-eyebrow">Browse here</p>
    <h2>Rooms and layout</h2>
    <p>Use this page for photos, bed types and the venue map. Nothing you click here claims a place.</p>
  </div>
  <div>
    <span class="stay-authority__number" aria-hidden="true">02</span>
    <p class="stay-eyebrow">Choose there</p>
    <h2>The shared Sheet</h2>
    <p>The Sheet is the only live record, and places are allocated in signup order. Green name cells are self-service: type, move or clear only your own public name.</p>
  </div>
</section>

<section class="stay-rules" aria-labelledby="rules-title">
  <div class="stay-section-heading">
    <p class="stay-eyebrow">Fully self-service</p>
    <h2 id="rules-title">Three trust rules</h2>
  </div>
  <ol>
    <li><span>1</span><p><strong>Use one green name cell per person.</strong> Two people sharing a double bed or sofa each use their own row.</p></li>
    <li><span>2</span><p><strong>Never overwrite somebody else.</strong> Use only a public display name you are happy for other participants to see.</p></li>
    <li><span>3</span><p><strong>Move or cancel yourself.</strong> For a move, take the new place and then clear your old one. To cancel, clear only your name.</p></li>
  </ol>
  <p class="stay-rules__recovery"><strong>Mistakes are recoverable.</strong> Google version history is the audit log. If a collision happens, stop and resolve it in the participant chat or with an organiser.</p>
</section>

<section class="stay-map" id="venue-map" aria-labelledby="map-title">
  <div class="stay-section-heading stay-section-heading--split">
    <div>
      <p class="stay-eyebrow">Venue atlas</p>
      <h2 id="map-title">Find your bearings</h2>
    </div>
    <div class="stay-map__links">
      <a href="/images/accommodation/venue-map-2026.webp" target="_blank" rel="noopener noreferrer">Compare the supplied map</a>
      <a href="/files/open-blues-2026-venue-map.pdf">Download source PDF</a>
    </div>
  </div>
  <p class="stay-map__intro">Retraced from the supplied Sheet map. Layout is approximate: no scale or confirmed door and furniture positions. Orange marks beds; green marks sofas and shared rooms. Colours and symbols show stable room and sleeping-surface types, never live availability or exact placement. Names and availability stay in the Room Browser. Tower and Barn are orientation only; the new Opposite Right room is not on the supplied plan.</p>
  <p class="stay-map__how" id="map-instructions"><strong>Rooms open their photos.</strong> Tap or click a room to jump to its photo and details. On a narrow screen, swipe sideways; with a keyboard, Tab through rooms and use the arrow keys to pan.</p>
  <ul class="stay-map__legend" aria-label="Map legend">
    <li><span class="legend-room" aria-hidden="true"></span>Sleeping room</li>
    <li><span class="legend-shared" aria-hidden="true"></span>Shared space</li>
    <li><span class="legend-service" aria-hidden="true"></span>Bathroom / service</li>
    <li><span class="legend-single" aria-hidden="true"></span>Single</li>
    <li><span class="legend-double" aria-hidden="true"></span>Double</li>
    <li><span class="legend-sofa" aria-hidden="true"></span>Sofa bed</li>
  </ul>

  <div class="stay-map__atlas">
    <details class="stay-map-panel" id="map-castle-downstairs" open>
      <summary><span>Castle · downstairs</span><small>A1 · A2 · A3 · B1 · B2 · C1</small></summary>
      <p class="stay-map-panel__swipe" aria-hidden="true">Zoomed for readable type · swipe / scroll sideways when needed <span>→</span></p>
      <div class="stay-map-panel__scroll" tabindex="0" role="region" aria-label="Scrollable Castle downstairs floor plan" aria-describedby="map-instructions">
        {{< accommodation-map slug="castle-downstairs" >}}
      </div>
      <p class="stay-map-panel__description">A1 and A2 are in Wing A; A3 sits beside the kitchen and hall. B1 is above B2 beside the courtyard; C1 is below the entrance corridor. WC areas are beside the A-wing hall and at Wing C. A3's double-size sofa is for single occupancy.</p>
      <p class="stay-map-panel__actions"><a href="/images/accommodation/map-castle-downstairs.svg" target="_blank" rel="noopener noreferrer">Open Castle downstairs full-size</a><a href="/images/accommodation/map-castle-downstairs.svg" download>Download Castle downstairs SVG</a></p>
    </details>
    <details class="stay-map-panel" id="map-castle-upstairs" open>
      <summary><span>Castle · upstairs</span><small>Rooms 1–6</small></summary>
      <p class="stay-map-panel__swipe" aria-hidden="true">Zoomed for readable type · swipe / scroll sideways when needed <span>→</span></p>
      <div class="stay-map-panel__scroll" tabindex="0" role="region" aria-label="Scrollable Castle upstairs floor plan" aria-describedby="map-instructions">
        {{< accommodation-map slug="castle-upstairs" >}}
      </div>
      <p class="stay-map-panel__description">Rooms 1–4 run across the upper wing. Beneath Room 4, the recreation area sits above the shower/WC and hall; Rooms 5 and 6 are below those. Storage is not an activity or sleeping room.</p>
      <p class="stay-map-panel__actions"><a href="/images/accommodation/map-castle-upstairs.svg" target="_blank" rel="noopener noreferrer">Open Castle upstairs full-size</a><a href="/images/accommodation/map-castle-upstairs.svg" download>Download Castle upstairs SVG</a></p>
    </details>
    <details class="stay-map-panel" id="map-opposite-downstairs" open>
      <summary><span>Opposite · downstairs</span><small>Rooms 1–2</small></summary>
      <p class="stay-map-panel__swipe" aria-hidden="true">Zoomed for readable type · swipe / scroll sideways when needed <span>→</span></p>
      <div class="stay-map-panel__scroll" tabindex="0" role="region" aria-label="Scrollable Opposite downstairs floor plan" aria-describedby="map-instructions">
        {{< accommodation-map slug="opposite-downstairs" >}}
      </div>
      <p class="stay-map-panel__description">Rooms 1 and 2 sit on opposite sides of the central hall. The supplied plan does not confirm a downstairs bathroom.</p>
      <p class="stay-map-panel__actions"><a href="/images/accommodation/map-opposite-downstairs.svg" target="_blank" rel="noopener noreferrer">Open Opposite downstairs full-size</a><a href="/images/accommodation/map-opposite-downstairs.svg" download>Download Opposite downstairs SVG</a></p>
    </details>
    <details class="stay-map-panel" id="map-opposite-upstairs" open>
      <summary><span>Opposite · upstairs</span><small>Rooms 1–3</small></summary>
      <p class="stay-map-panel__swipe" aria-hidden="true">Zoomed for readable type · swipe / scroll sideways when needed <span>→</span></p>
      <div class="stay-map-panel__scroll" tabindex="0" role="region" aria-label="Scrollable Opposite upstairs floor plan" aria-describedby="map-instructions">
        {{< accommodation-map slug="opposite-upstairs" >}}
      </div>
      <p class="stay-map-panel__description">Rooms run image-left to image-right as 3, 2, 1. Below Room 1, the kitchen is directly above the entrance and stairs; the bathroom is to their right.</p>
      <p class="stay-map-panel__actions"><a href="/images/accommodation/map-opposite-upstairs.svg" target="_blank" rel="noopener noreferrer">Open Opposite upstairs full-size</a><a href="/images/accommodation/map-opposite-upstairs.svg" download>Download Opposite upstairs SVG</a></p>
    </details>
  </div>

  <aside class="stay-unmapped">
    <span aria-hidden="true">⌂</span>
    <div><strong>Opposite Right · upstairs · new room</strong><p>Four single beds. This room was added after the supplied floor plan and has no confirmed map position or photo.</p></div>
  </aside>
</section>

<section class="stay-room-guide" id="room-guide" aria-labelledby="room-guide-title">
  <div class="stay-section-heading stay-section-heading--split">
    <div>
      <p class="stay-eyebrow">Static room field guide</p>
      <h2 id="room-guide-title">Browse all 18 rooms</h2>
    </div>
    <p>Photos are references and setups may change. Live free/taken status is shown only in the Sheet.</p>
  </div>
  <nav class="stay-jumps" aria-label="Jump to a room group">
    <a href="#opposite-upstairs">Opposite upstairs</a>
    <a href="#opposite-downstairs">Opposite downstairs</a>
    <a href="#castle-downstairs">Castle downstairs</a>
    <a href="#castle-upstairs">Castle upstairs</a>
    <a href="#opposite-right">New room</a>
  </nav>

  <section class="stay-room-group" id="opposite-upstairs" aria-labelledby="opposite-upstairs-title">
    <header><p>Opposite building</p><h3 id="opposite-upstairs-title">Upstairs</h3></header>
    <div class="stay-room-grid">
      <article class="stay-room-card" id="room-opposite-upstairs-1" data-room-id="opposite-upstairs-1">
        <a class="stay-room-card__photo" href="/images/accommodation/opposite-upstairs-1-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Opposite upstairs Room 1">
          <picture><source srcset="/images/accommodation/opposite-upstairs-1-480.webp 480w, /images/accommodation/opposite-upstairs-1-960.webp 960w, /images/accommodation/opposite-upstairs-1-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/opposite-upstairs-1-960.webp" alt="Reference photo of Opposite upstairs Room 1, listed with one single bed." width="960" height="540" loading="lazy"></picture>
        </a>
        <div class="stay-room-card__body"><p>Opposite · upstairs</p><h4>Room 1</h4><span>1 single bed</span>{{< room-link range="A5:E5" label="See Opposite upstairs Room 1 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-opposite-upstairs-2" data-room-id="opposite-upstairs-2">
        <a class="stay-room-card__photo" href="/images/accommodation/opposite-upstairs-2-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Opposite upstairs Room 2">
          <picture><source srcset="/images/accommodation/opposite-upstairs-2-480.webp 480w, /images/accommodation/opposite-upstairs-2-960.webp 960w, /images/accommodation/opposite-upstairs-2-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/opposite-upstairs-2-960.webp" alt="Reference photo of Opposite upstairs Room 2, listed with two single beds." width="960" height="540" loading="lazy"></picture>
        </a>
        <div class="stay-room-card__body"><p>Opposite · upstairs</p><h4>Room 2</h4><span>2 single beds</span>{{< room-link range="A6:E7" label="See Opposite upstairs Room 2 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-opposite-upstairs-3" data-room-id="opposite-upstairs-3">
        <a class="stay-room-card__photo" href="/images/accommodation/opposite-upstairs-3-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Opposite upstairs Room 3">
          <picture><source srcset="/images/accommodation/opposite-upstairs-3-480.webp 480w, /images/accommodation/opposite-upstairs-3-960.webp 960w, /images/accommodation/opposite-upstairs-3-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/opposite-upstairs-3-960.webp" alt="Reference photo of Opposite upstairs Room 3, listed with a single bed and a small double bed." width="960" height="540" loading="lazy"></picture>
        </a>
        <div class="stay-room-card__body"><p>Opposite · upstairs</p><h4>Room 3</h4><span>1 single · 1 small double</span>{{< room-link range="A8:E10" label="See Opposite upstairs Room 3 live in the Sheet" >}}</div>
      </article>
    </div>
  </section>

  <section class="stay-room-group" id="opposite-downstairs" aria-labelledby="opposite-downstairs-title">
    <header><p>Opposite building</p><h3 id="opposite-downstairs-title">Downstairs</h3></header>
    <div class="stay-room-grid">
      <article class="stay-room-card" id="room-opposite-downstairs-1" data-room-id="opposite-downstairs-1">
        <a class="stay-room-card__photo" href="/images/accommodation/opposite-downstairs-1-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Opposite downstairs Room 1">
          <picture><source srcset="/images/accommodation/opposite-downstairs-1-480.webp 480w, /images/accommodation/opposite-downstairs-1-960.webp 960w, /images/accommodation/opposite-downstairs-1-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/opposite-downstairs-1-960.webp" alt="Reference photo of Opposite downstairs Room 1, listed with one double bed." width="960" height="540" loading="lazy"></picture>
        </a>
        <div class="stay-room-card__body"><p>Opposite · downstairs</p><h4>Room 1</h4><span>1 double bed</span>{{< room-link range="A11:E12" label="See Opposite downstairs Room 1 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-opposite-downstairs-2" data-room-id="opposite-downstairs-2">
        <a class="stay-room-card__photo" href="/images/accommodation/opposite-downstairs-2-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Opposite downstairs Room 2">
          <picture><source srcset="/images/accommodation/opposite-downstairs-2-480.webp 480w, /images/accommodation/opposite-downstairs-2-960.webp 960w, /images/accommodation/opposite-downstairs-2-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/opposite-downstairs-2-960.webp" alt="Reference photo of Opposite downstairs Room 2, listed with a double bed and a single bed." width="960" height="540" loading="lazy"></picture>
        </a>
        <div class="stay-room-card__body"><p>Opposite · downstairs</p><h4>Room 2</h4><span>1 double · 1 single</span>{{< room-link range="A13:E15" label="See Opposite downstairs Room 2 live in the Sheet" >}}</div>
      </article>
    </div>
  </section>

  <section class="stay-room-group" id="castle-downstairs" aria-labelledby="castle-downstairs-title">
    <header><p>Castle</p><h3 id="castle-downstairs-title">Downstairs</h3></header>
    <div class="stay-room-grid">
      <article class="stay-room-card" id="room-castle-downstairs-a1" data-room-id="castle-downstairs-a1">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-a1-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs A1"><picture><source srcset="/images/accommodation/castle-downstairs-a1-480.webp 480w, /images/accommodation/castle-downstairs-a1-960.webp 960w, /images/accommodation/castle-downstairs-a1-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-a1-960.webp" alt="Reference photo of Castle downstairs A1, listed with one double bed." width="960" height="532" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>A1</h4><span>1 double bed</span>{{< room-link range="A16:E17" label="See Castle downstairs A1 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-downstairs-a2" data-room-id="castle-downstairs-a2">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-a2-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs A2"><picture><source srcset="/images/accommodation/castle-downstairs-a2-480.webp 480w, /images/accommodation/castle-downstairs-a2-960.webp 960w, /images/accommodation/castle-downstairs-a2-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-a2-960.webp" alt="Reference photo of Castle downstairs A2, listed with one double bed and one single bed." width="960" height="540" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>A2</h4><span>1 double · 1 single</span>{{< room-link range="A20:E22" label="See Castle downstairs A2 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-downstairs-a3" data-room-id="castle-downstairs-a3">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-a3-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs A3"><picture><source srcset="/images/accommodation/castle-downstairs-a3-480.webp 480w, /images/accommodation/castle-downstairs-a3-960.webp 960w, /images/accommodation/castle-downstairs-a3-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-a3-960.webp" alt="Reference photo of Castle downstairs A3, listed with a double bed, single sofa and double-size sofa." width="960" height="500" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>A3</h4><span>1 double · 1 single sofa · 1 double-size sofa (single occupancy)</span>{{< room-link range="A24:E27" label="See Castle downstairs A3 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-downstairs-b1" data-room-id="castle-downstairs-b1">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-b1-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs B1"><picture><source srcset="/images/accommodation/castle-downstairs-b1-480.webp 480w, /images/accommodation/castle-downstairs-b1-960.webp 960w, /images/accommodation/castle-downstairs-b1-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-b1-960.webp" alt="Reference photo of Castle downstairs B1, listed with one double bed." width="960" height="540" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>B1</h4><span>1 double bed</span>{{< room-link range="A28:E31" label="See Castle downstairs B1 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-downstairs-b2" data-room-id="castle-downstairs-b2">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-b2-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs B2"><picture><source srcset="/images/accommodation/castle-downstairs-b2-480.webp 480w, /images/accommodation/castle-downstairs-b2-960.webp 960w, /images/accommodation/castle-downstairs-b2-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-b2-960.webp" alt="Reference photo of Castle downstairs B2, listed with one double bed." width="960" height="540" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>B2</h4><span>1 double bed</span>{{< room-link range="A32:E33" label="See Castle downstairs B2 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-downstairs-c1" data-room-id="castle-downstairs-c1">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-downstairs-c-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle downstairs C1"><picture><source srcset="/images/accommodation/castle-downstairs-c-480.webp 480w, /images/accommodation/castle-downstairs-c-960.webp 960w, /images/accommodation/castle-downstairs-c-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-downstairs-c-960.webp" alt="Reference photo of Castle downstairs C1, listed with a double bed and two single beds." width="960" height="448" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · downstairs</p><h4>C1</h4><span>1 double · 2 singles</span>{{< room-link range="A34:E37" label="See Castle downstairs C1 live in the Sheet" >}}</div>
      </article>
    </div>
  </section>

  <section class="stay-room-group" id="castle-upstairs" aria-labelledby="castle-upstairs-title">
    <header><p>Castle</p><h3 id="castle-upstairs-title">Upstairs</h3></header>
    <div class="stay-room-grid">
      <article class="stay-room-card" id="room-castle-upstairs-1" data-room-id="castle-upstairs-1">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-1-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 1"><picture><source srcset="/images/accommodation/castle-upstairs-1-480.webp 480w, /images/accommodation/castle-upstairs-1-960.webp 960w, /images/accommodation/castle-upstairs-1-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-upstairs-1-960.webp" alt="Reference photo of Castle upstairs Room 1, listed with a double bed and two single beds." width="960" height="572" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 1</h4><span>1 double · 2 singles</span>{{< room-link range="A38:E41" label="See Castle upstairs Room 1 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-upstairs-2" data-room-id="castle-upstairs-2">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-2-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 2"><picture><source srcset="/images/accommodation/castle-upstairs-2-480.webp 480w, /images/accommodation/castle-upstairs-2-960.webp 960w, /images/accommodation/castle-upstairs-2-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-upstairs-2-960.webp" alt="Reference photo of Castle upstairs Room 2, listed with a sofa bed and a double bed." width="960" height="564" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 2</h4><span>1 sofa bed · 1 double bed</span>{{< room-link range="A42:E45" label="See Castle upstairs Room 2 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-upstairs-3" data-room-id="castle-upstairs-3">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-3-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 3"><picture><source srcset="/images/accommodation/castle-upstairs-3-480.webp 480w, /images/accommodation/castle-upstairs-3-960.webp 960w, /images/accommodation/castle-upstairs-3-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-upstairs-3-960.webp" alt="Reference photo of Castle upstairs Room 3, listed with three single beds." width="960" height="392" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 3</h4><span>3 single beds</span>{{< room-link range="A46:E48" label="See Castle upstairs Room 3 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-upstairs-4" data-room-id="castle-upstairs-4">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-4-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 4"><picture><source srcset="/images/accommodation/castle-upstairs-4-480.webp 480w, /images/accommodation/castle-upstairs-4-960.webp 960w, /images/accommodation/castle-upstairs-4-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img src="/images/accommodation/castle-upstairs-4-960.webp" alt="Reference photo of Castle upstairs Room 4, listed with four single beds." width="960" height="486" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 4</h4><span>4 single beds</span>{{< room-link range="A49:E52" label="See Castle upstairs Room 4 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-upstairs-5" data-room-id="castle-upstairs-5">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-5-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 5"><picture><source srcset="/images/accommodation/castle-upstairs-5-480.webp 480w, /images/accommodation/castle-upstairs-5-960.webp 960w, /images/accommodation/castle-upstairs-5-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img class="stay-room-card__portrait" src="/images/accommodation/castle-upstairs-5-960.webp" alt="Reference photo of Castle upstairs Room 5, listed with one double bed." width="960" height="1706" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 5</h4><span>1 double bed</span>{{< room-link range="A53:E54" label="See Castle upstairs Room 5 live in the Sheet" >}}</div>
      </article>
      <article class="stay-room-card" id="room-castle-upstairs-6" data-room-id="castle-upstairs-6">
        <a class="stay-room-card__photo" href="/images/accommodation/castle-upstairs-6-1440.webp" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size photo of Castle upstairs Room 6"><picture><source srcset="/images/accommodation/castle-upstairs-6-480.webp 480w, /images/accommodation/castle-upstairs-6-960.webp 960w, /images/accommodation/castle-upstairs-6-1440.webp 1440w" sizes="(max-width: 700px) 92vw, 30vw"><img class="stay-room-card__portrait" src="/images/accommodation/castle-upstairs-6-960.webp" alt="Reference photo of Castle upstairs Room 6, listed with a double bed and a single bed." width="960" height="1706" loading="lazy"></picture></a>
        <div class="stay-room-card__body"><p>Castle · upstairs</p><h4>Room 6</h4><span>1 double · 1 single</span>{{< room-link range="A55:E57" label="See Castle upstairs Room 6 live in the Sheet" >}}</div>
      </article>
    </div>
  </section>

  <section class="stay-room-group" id="opposite-right" aria-labelledby="opposite-right-title">
    <header><p>Opposite Right</p><h3 id="opposite-right-title">Upstairs · new room</h3></header>
    <div class="stay-room-grid">
      <article class="stay-room-card stay-room-card--missing" id="room-opposite-right-upstairs-new" data-room-id="opposite-right-upstairs-new">
        <div class="stay-room-card__missing" role="img" aria-label="No supplied photo or confirmed map position is available for the new Opposite Right upstairs room"><span aria-hidden="true">⌂</span><strong>No supplied photo</strong><small>Added after the floor plan</small></div>
        <div class="stay-room-card__body"><p>Opposite Right · upstairs</p><h4>New room</h4><span>4 single beds</span>{{< room-link range="A58:E61" label="See the Opposite Right upstairs new room live in the Sheet" >}}</div>
      </article>
    </div>
  </section>
</section>

<section class="stay-common" aria-labelledby="common-title">
  <div class="stay-section-heading">
    <p class="stay-eyebrow">Not selectable rooms</p>
    <h2 id="common-title">Around the venue</h2>
    <p>The ballroom and barn are shared festival spaces. They appear here for orientation, not as fixed sleeping-place choices.</p>
  </div>
  <div class="stay-common__grid">
    <figure><img src="/images/accommodation/ballroom-960.webp" srcset="/images/accommodation/ballroom-480.webp 480w, /images/accommodation/ballroom-960.webp 960w" sizes="(max-width: 700px) 92vw, 31vw" alt="The historic Castle ballroom with wooden floor, piano, stage and tall windows." width="960" height="540" loading="lazy"><figcaption>Castle ballroom</figcaption></figure>
    <figure><img src="/images/accommodation/barn-960.webp" srcset="/images/accommodation/barn-480.webp 480w, /images/accommodation/barn-960.webp 960w" sizes="(max-width: 700px) 92vw, 31vw" alt="The interior of the venue barn used as a shared festival space." width="960" height="540" loading="lazy"><figcaption>Barn</figcaption></figure>
    <figure><img src="/images/accommodation/barn-entrance-960.webp" srcset="/images/accommodation/barn-entrance-480.webp 480w, /images/accommodation/barn-entrance-960.webp 960w" sizes="(max-width: 700px) 92vw, 31vw" alt="The exterior entrance to the venue barn." width="960" height="540" loading="lazy"><figcaption>Barn entrance</figcaption></figure>
  </div>
</section>

<section class="stay-final" aria-labelledby="final-title">
  <div>
    <p class="stay-eyebrow">Ready?</p>
    <h2 id="final-title">Choose your place in the Sheet.</h2>
    <p>If you selected a bed and paid the €50 Reservation Payment, pick your row or change your own existing choice. The accommodation balance is paid later in cash at the venue. To change the category itself, use <a href="/change/">openblues.pl/change</a>.</p>
  </div>
  <div class="stay-final__actions">
    {{< room-browser-cta variant="final" >}}
  </div>
</section>
