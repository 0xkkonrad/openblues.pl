# OpenBlues.pl

Static site for [Open Blues](https://openblues.pl) — a non-profit, 100% DIY blues & fusion dance
festival at Piotrowice Nyskie Palace, Poland.

Migrated from Google Sites (landing page) + a Google Doc ("Info Booklet") to a
Hugo site deployed on GitHub Pages.

## Structure

- `hugo.toml` — **the only place that knows the edition**: `eventStart`, `eventEnd`, `eventDatesHuman`
  (hero, at-a-glance, JSON-LD, Google Calendar link and the generated `openblues-<year>.ics`),
  the signup switch (`signupURL` + `signupsOpen`) and the Room Browser switch
  (`roomBrowserURL`, `roomBrowserInstructionsURL`). Empty/false = every CTA renders as a
  non-link "open soon" state; set them and every button links.
- `content/_index.md` — landing page (about, cost, how applying works, venue, FAQ)
- `content/booklet.md` — the Info Booklet as a web page (`/booklet/`)
- `content/accommodation.md` — room photos and floor plans; Sheet links come from `roomBrowserURL`
- `LISTINGS.md` — festival listings tracker and submission data pack
- `contracts/signup-2027.json` — deploy-time contract for the live form URL, prefill ids, exact
  option labels and price grid
- `qa/` — static, browser and signup-plumbing checks (`cd qa && npm ci && npx playwright install chromium`,
  then `cd .. && qa/run.sh`; the runner builds and serves an isolated preview itself)
- `layouts/` — minimal custom theme (no external theme dependency)
- `static/images/` — logo, favicons, palace aerial, sanitized room photos and name-free venue maps
- `static/CNAME` — custom domain for GitHub Pages
- `archive/` — raw pull of the original Google Sites page and Google Doc booklet (not published)

## Opening signups and the counter

`signupURL` is already wired to the 2027 Google Form and `data/formprefill.json` already carries
that form's `entry.NNNN` prefill ids, so `/cost/` can deep-link into it. `signupsOpen` in
`hugo.toml` is the one site-wide switch: `true` opens every signup button and `false` closes them.
If the form changes, update `signupURL`, `data/formprefill.json` and
`contracts/signup-2027.json` together. The URL must be the form's long `/viewform` URL; a
`forms.gle` short link drops the query string the prefill depends on.

The front page shows a live counter of paid signups from `data/counter.json`
(`paid`, `threshold`, `status`, `updated`). `.github/workflows/counter.yml` refreshes it hourly
from the published "Public" tab of the signups workbook once the repository variable
`COUNTER_CSV_URL` is set (Settings → Secrets and variables → Actions → Variables); until then the
file is edited by hand. `status` is `open`, `confirmed` or `cancelled`. Confirmation happens
automatically and is one-way; only the operator-set `cancelled` state turns signup buttons into
non-links.
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
