# Open Blues roadmap

## Registration and accommodation follow-ups

These items came from the end-to-end UX and clarity review. They do not change the agreed operating model: prepaid participants are considered registered without an approval step, payment screenshots remain subject to a manual check, and the accommodation balance is paid later in cash.

### Participant-facing fixes

- [ ] **Correct the accommodation payment wording.** Replace “paid for the accommodation category” with “selected the matching category and paid the €50 Reservation Payment.” Make it explicit that accommodation itself is paid later in cash.
  - **Done when:** the website, registration form, and accommodation claim flow use the same wording and do not imply that the full accommodation price was prepaid.

- [ ] **Fix the initial contribution summary.** Tally currently shows “Reservation Payment €50” while initially showing “Total contribution €0.” Prefer initializing the total to €50; otherwise, hide the summary until the participant has made the choices needed to calculate it.
  - **Done when:** the initial and calculated amounts never contradict each other.

- [ ] **Match the final-review instruction to the button.** Replace “Select Continue” with “Select Submit” on the final review step.
  - **Done when:** the instruction names the button the participant can actually see.

- [ ] **Enforce the public display-name limit.** Apply the stated maximum of 60 characters in the form, not only in the explanatory text.
  - **Done when:** values longer than 60 characters cannot be submitted and the limit is communicated accessibly.

- [ ] **Block incomplete accommodation claim links.** When the required room or place parameters are missing, prevent the claim form from continuing instead of showing only a warning.
  - **Done when:** an incomplete link cannot produce an ambiguous claim, and the participant receives a clear route back to the bed chooser.

- [ ] **Enable Tally’s progress bar.** Show that registration contains four steps so participants can understand their progress and the remaining effort.
  - **Done when:** the progress indicator is visible and accurately represents all four registration steps.

### Organizer-facing data fix

- [ ] **Format `All Registrations` timestamps as dates.** Convert spreadsheet serial values such as `46238.79766` into clear human-readable date and time values.
  - **Done when:** new and existing registration timestamps display consistently as dates and times for organizers.

### Third-party accessibility follow-up

- [ ] **Track Tally’s unlabeled uploaded-file removal button.** Tally’s file-upload control does not provide a screen-reader label for its removal button. This is a third-party limitation; the first-party Open Blues pages passed Axe checks.
  - **Done when:** the issue has been reported to or checked with Tally, the limitation remains documented for future QA, and any available upstream fix is enabled. This item does not require changing registration platforms.
