# OpenBlues.pl

Static site for [Open Blues](https://openblues.pl) — a non-profit, 100% DIY blues & fusion dance
festival at Piotrowice Nyskie Palace, Poland.

Migrated from Google Sites (landing page) + a Google Doc ("Info Booklet") to a
Hugo site deployed on GitHub Pages.

## Structure

- `content/_index.md` — landing page (about, venue, food, financials, FAQ)
- `content/booklet.md` — the Info Booklet as a web page (`/booklet/`)
- `layouts/` — minimal custom theme (no external theme dependency)
- `static/images/` — logo, favicons, palace aerial (og image)
- `static/CNAME` — custom domain for GitHub Pages
- `archive/` — raw pull of the original Google Sites page and Google Doc booklet (not published)

## Develop

```sh
hugo server
```

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages
(`.github/workflows/hugo.yml`).

Until DNS for `openblues.pl` is pointed at GitHub Pages, the site is
previewable at <http://kkonrad.com/OpenBlues.pl/> (the 0xkkonrad user site maps
to kkonrad.com; relative URLs make both hosts work).

### DNS cut-over (when ready)

1. In the domain registrar: apex `A` records → `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` (and optionally `www` CNAME → `0xkkonrad.github.io`).
2. Repo Settings → Pages → custom domain `openblues.pl`, enforce HTTPS.

## License

[Unlicense](LICENSE) — feel free to use anything found here.
