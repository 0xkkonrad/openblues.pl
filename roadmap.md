# Open Blues technical register

This file records only decisions that constrain the website repository. Festival planning,
assignments, purchasing and reconciliation are managed by the organizers and are not duplicated
here. Listing submissions have their own status log in [`LISTINGS.md`](LISTINGS.md).

## Locked decisions

| Area | Decision | Repository invariant |
| --- | --- | --- |
| Room Browser identity and privacy | Ask for the same full name used in the signup and an optional public display name through one Claim Form; its response sheet is committee-only. A blank public field resolves to the participant's signup first name; any entered nickname or anonymous label overrides it, and the Form states clearly that the result is visible to everyone. Existing claims are backfilled with first names. The public Room Browser is view-only, shows the resolved display name for each claimed place and Claim links for available places, and treats the latest submission for the private full name as authoritative. Use Form and Sheet formulas only, with no Apps Script. | Publish only the resolved display name, never the full signup name or private response data. Do not add a site-side claim runtime or configure private workbook IDs here. |
| Lost edit links | Use the manual email fallback for now. Reconsider self-service recovery at roughly 25 signups. | Keep `recoveryURL` empty and `recoveryOpen = false` in `hugo.toml`; `/change/` must continue to offer the organizer email address. |
| Signup assurance | Keep the current automated checks. | Keep the checked-in signup contract and deploy checks; do not add a live Google Form deployment gate or a scheduled Form-contract check. |

## Open repository work

None.
