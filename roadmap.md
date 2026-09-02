# Open Blues technical register

This file records only decisions that constrain the website repository. Festival planning,
assignments, purchasing and reconciliation are managed by the organizers and are not duplicated
here. Listing submissions have their own status log in [`LISTINGS.md`](LISTINGS.md).

## Locked decisions

| Area | Decision | Repository invariant |
| --- | --- | --- |
| Room Browser identity and privacy | Ask for the same full name used in the signup through one Claim Form; its response sheet is committee-only. The public Room Browser is view-only, shows slot status and Claim links, and treats the latest submission for that name as authoritative. Use Form and Sheet formulas only, with no Apps Script. | Never publish or import participant names into the public workbook or site; only sanitized slot status may cross from the private claims workbook. Do not add a site-side claim runtime or configure private workbook IDs here. |
| Lost edit links | Use the manual email fallback for now. Reconsider self-service recovery at roughly 25 signups. | Keep `recoveryURL` empty and `recoveryOpen = false` in `hugo.toml`; `/change/` must continue to offer the organizer email address. |
| Signup assurance | Keep the current automated checks. | Keep the checked-in signup contract and deploy checks; do not add a live Google Form deployment gate or a scheduled Form-contract check. |

## Open repository work

None currently accepted. Add an item here only when it requires a change to version-controlled
site code, content, configuration or tests.
