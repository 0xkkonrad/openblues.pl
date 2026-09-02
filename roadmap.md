# Open Blues technical register

This file records only decisions that constrain the website repository. Festival planning,
assignments, purchasing and reconciliation are managed by the organizers and are not duplicated
here. Listing submissions have their own status log in [`LISTINGS.md`](LISTINGS.md).

## Locked decisions

| Area | Decision | Repository invariant |
| --- | --- | --- |
| Room Browser identity | Use a participant-chosen public name, capped at 60 characters, and explain that it is publicly visible. | Never publish a legal/contact name or copy any other registration data into the Room Browser. |
| Lost edit links | Use the manual email fallback for now. Reconsider self-service recovery at roughly 25 signups. | Keep `recoveryURL` empty and `recoveryOpen = false` in `hugo.toml`; `/change/` must continue to offer the organizer email address. |
| Signup assurance | Keep the current automated checks. | Keep the checked-in signup contract and deploy checks; do not add a live Google Form deployment gate or a scheduled Form-contract check. |

## Open repository work

None currently accepted. Add an item here only when it requires a change to version-controlled
site code, content, configuration or tests.
