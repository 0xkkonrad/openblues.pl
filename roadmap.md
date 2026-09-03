# Open Blues technical register

This file records only decisions that constrain the website repository. Festival planning,
assignments, purchasing and reconciliation are managed by the organizers and are not duplicated
here. Listing submissions have their own status log in [`LISTINGS.md`](LISTINGS.md).

## Locked decisions

| Area | Decision | Repository invariant |
| --- | --- | --- |
| Room Browser identity, privacy and paired beds | Single places use one Claim Form with the signup full name and an optional public display name; its response sheet is committee-only. A blank display name resolves to the signup first name, while a nickname or anonymous label overrides it. Double and small-double rows never expose that Form: one Request email link appears only when both places are free, and the committee reserves the whole bed only after both named people are signed up. Post-safeguard Form responses for pair-bed rows are filtered out; older claims are grandfathered. The latest valid single-place submission for a normalized full name remains authoritative. Use Form and Sheet formulas only, with no Apps Script. | Publish only resolved display names, never signup full names or private response data. Keep pair validation committee-side; do not add a site-side claim runtime or configure private workbook IDs here. |
| Lost edit links | Use the manual email fallback for now. Reconsider self-service recovery at roughly 25 signups. | Keep `recoveryURL` empty and `recoveryOpen = false` in `hugo.toml`; `/change/` must continue to offer the organizer email address. |
| Signup assurance | Keep the current automated checks. | Keep the checked-in signup contract and deploy checks; do not add a live Google Form deployment gate or a scheduled Form-contract check. |

## Open repository work

None.
