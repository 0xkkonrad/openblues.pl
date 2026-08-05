# Open Blues 2026 registration and accommodation operations

**Status:** cutover completed on 5 August 2026. The shared Google Sheet is the only accommodation read/write system, and the website is a static room and venue guide. The old accommodation Tally is closed, the ordinary registration form uses the new Sheet wording, and anonymous access has been removed from both legacy accommodation workbooks; those files remain restricted recovery records with `RETIRED — DO NOT USE` names.

## Current decision

Open Blues keeps the lightweight registration and payment flow:

- Tally for festival registration and contribution calculations
- external bank transfer for the €50 Reservation Payment
- a payment screenshot uploaded with registration
- one trust-based Google Sheet for accommodation browsing, choosing, moving and cancelling
- a static `/accommodation/` page for sanitized room photos and floor plans

There is no accommodation form, roster feed, availability API, polling script, database or custom backend.

## Canonical accommodation workbook

Workbook:

`https://docs.google.com/spreadsheets/d/1Cu3Cgi5qpbeqUIpy87-dbzBTXIWrYuWIIHS5Jp1RSV8/edit`

Owner: `klaudiapankert@gmail.com`

The three visible tabs have deliberately separate jobs:

1. `START HERE` — rules, live totals and links
2. `ROOM BROWSER` — one row per person-place; participants browse and edit names here
3. `VENUE MAP` — protected orientation map with live room counts

The audited inventory contains 57 person-places across 18 rooms. At migration it contained 31 taken, 20 available and 6 unavailable places. Those numbers are not copied into the website because they change in the Sheet.

## Permission invariants

- The workbook is link-only (`allowFileDiscovery=false`) and anyone with the link is a writer.
- Editors cannot change sharing or add new editors.
- Every sheet is protected.
- On `ROOM BROWSER`, exactly the 51 active name cells in column C are unprotected.
- Four blocked and two organiser-held name cells remain protected.
- Participant names are public display names only. The workbook contains no email, phone, payment evidence, registration answers or private sleeping/accessibility information.

This is a trust model, not a locking model. Google can accept two near-simultaneous edits to the same cell; the last write may win. Live cursors, the “never overwrite” rule and version history are the intended safeguards.

## Participant flow

1. Register and pay for a shared or single sleeping place.
2. Browse photos and the floor plan at `/accommodation/`.
3. Open the live Sheet at `ROOM BROWSER`.
4. Type one public display name into one green empty cell.
5. Two people sharing a double bed or sofa use two person-place rows.
6. To move, take the new empty place first, immediately clear the old name, and confirm that the name appears only once.
7. To cancel, clear only that participant's own name.
8. Never overwrite another name. Resolve a collision in the participant chat or with an organiser.

On desktop, anonymous editors can use the browser. Google sends real phone browsers to a read-only preview, so phone editing requires the Google Sheets app. The website states this before the participant opens the Sheet.

## Website responsibility

The website contains only stable, non-personal reference material:

- 17 room photo sets in 480, 960 and 1440 pixel WebP variants
- one explicit no-photo state for the new Opposite Right upstairs room
- four readable sleeping-building map panels
- a whole-map WebP and downloadable PDF
- static sleeping-surface descriptions
- ordinary links to `START HERE`, `ROOM BROWSER`, `VENUE MAP` and the exact room row spans

Original JPEGs are not published. The WebPs were transcoded with metadata stripped; several originals contained GPS/camera metadata or MPO auxiliary data.

The venue map is exported from a temporary private copy of the workbook with participant names and availability formulas replaced by neutral room labels. The production workbook is never changed for this export, and the temporary copy is moved to trash immediately afterwards. The repeatable admin script lives on Klaudia's server at:

`/opt/klaudiapankert/google-drive-admin/export_static_map.py`

## Recovery and corrections

- For an accidental edit, use Google Sheets version history to restore the affected cell or range.
- Prefer a narrow cell/range restoration over reverting the whole workbook, so later valid participant edits are preserved.
- If an unavailable place must be opened or an active place must be held, Klaudia updates its lock value and protection through the migration/admin tooling; participants never edit inventory IDs or formulas.
- If a room's physical setup changes, update the workbook inventory first, then update only the static description/photo on the website.
- The migration script is idempotent verification after publication. Do not rerun it as a way to overwrite participant changes.

## Retired accommodation stack

The former accommodation mini-application is intentionally deleted from active Hugo inputs:

- custom picker template
- browser-side roster and claim JavaScript
- claim-key/YAML inventory snapshot
- separate accommodation claim-form flow
- public read-only roster polling
- picker-specific adversarial/state-machine tests

The previous public roster should be kept only as a restricted recovery record until cutover is accepted, then deleted according to the participant-data retention promise. The separate accommodation claim form must remain closed and disconnected. The ordinary festival registration form remains in use.

Do not rewrite Git history merely to remove inert old claim identifiers. They no longer authorize anything once the form, feed and runtime code are retired.

## Post-festival retention

Public display names must not remain publicly accessible after 15 September 2026.

1. Remove public access from the live workbook immediately after accommodation coordination is no longer needed.
2. If a structure-only template is useful, create a new clean copy with no participant values or inherited version history.
3. Delete the participant-bearing workbook and the restricted former roster by the promised retention date, after any required operational reconciliation.
4. Remove `/accommodation/` from navigation or replace it with a short “festival finished” notice; static metadata-stripped venue photos may remain.

## Registration and payment model (unchanged)

The payment screenshot is not treated as real-time proof of settlement. A submitted registration that states prepayment is counted as coming. The organiser team performs one batch comparison with the bank record one day before the festival and follows up only on missing, mismatched or apparently false payments.

Cancellations remain participant-initiated. Cash collection, dietary information, transport coordination and the published Sunday/Monday timings remain unchanged.

## Verification

From the site repository:

```sh
hugo --minify
npm test --prefix qa
```

Release QA must also verify the deployed URL, all 17 photo mappings, the four map panels, the exact new workbook/tab links, anonymous desktop Sheet editing, protected-cell rejection and the documented mobile-app limitation.
