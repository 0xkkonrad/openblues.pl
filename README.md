# OpenBlues.pl

Static site for [Open Blues](https://openblues.pl) — a non-profit, 100% DIY blues & fusion dance
festival at Piotrowice Nyskie Palace, Poland.

Migrated from Google Sites (landing page) + a Google Doc ("Info Booklet") to a
Hugo site deployed on GitHub Pages.

## Structure

- `hugo.toml` — **the only place that knows the edition**: `eventStart`, `eventEnd`, `eventDatesHuman`
  (hero, at-a-glance, JSON-LD, Google Calendar link and the generated `openblues-<year>.ics`),
  the application switch (`applyURL` + `applicationsOpen`) and the Room Browser switch
  (`roomBrowserURL`, `roomBrowserInstructionsURL`). Empty/false = every CTA renders as a
  non-link "open soon" state; set them and every button links.
- `content/_index.md` — landing page (about, cost, how applying works, venue, FAQ)
- `content/booklet.md` — the Info Booklet as a web page (`/booklet/`)
- `content/accommodation.md` — room photos and floor plans; Sheet links come from `roomBrowserURL`
- `LISTINGS.md` — festival listings tracker and submission data pack
- `qa/` — static accommodation, deprecation, accessibility and link smoke tests (`npm install --prefix qa && npm exec --prefix qa playwright install chromium && npm test --prefix qa`; the browser tests expect a build served at `http://localhost:3118`, e.g. `hugo --minify --gc && python3 -m http.server 3118 -d public`)
- `layouts/` — minimal custom theme (no external theme dependency)
- `static/images/` — logo, favicons, palace aerial, sanitized room photos and name-free venue maps
- `static/CNAME` — custom domain for GitHub Pages
- `archive/` — raw pull of the original Google Sites page and Google Doc booklet (not published)

## Opening applications

Applications are closed until the form exists. To open them, edit `hugo.toml` only:
`applyURL = "https://tally.so/r/<form>"` and `applicationsOpen = true`, then push to `main`.
The same pattern applies to the Room Browser (`roomBrowserURL`, optional `roomBrowserInstructionsURL`).

## Develop

```sh
hugo server
```

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages
(`.github/workflows/hugo.yml`).

The deployed site is <https://openblues.pl/>. GitHub Pages uses the custom
domain from `static/CNAME`, and HTTPS is enforced.

## License

[Unlicense](LICENSE) — feel free to use anything found here.
