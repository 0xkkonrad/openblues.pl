# OpenBlues.pl

Static site for [Open Blues](https://openblues.pl) — a non-profit, 100% DIY blues & fusion dance
festival at Piotrowice Nyskie Palace, Poland.

Migrated from Google Sites (landing page) + a Google Doc ("Info Booklet") to a
Hugo site deployed on GitHub Pages.

## Structure

- `content/_index.md` — landing page (about, venue, food, financials, FAQ)
- `content/booklet.md` — the Info Booklet as a web page (`/booklet/`)
- `REGISTRATION-OPERATIONS.md` — current registration and self-service accommodation operating decision
- `qa/` — static accommodation, deprecation, accessibility and link smoke tests (`npm install --prefix qa && npm exec --prefix qa playwright install chromium && npm test --prefix qa`)
- `layouts/` — minimal custom theme (no external theme dependency)
- `static/images/` — logo, favicons, palace aerial, sanitized room photos and name-free venue maps
- `static/CNAME` — custom domain for GitHub Pages
- `archive/` — raw pull of the original Google Sites page and Google Doc booklet (not published)

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
