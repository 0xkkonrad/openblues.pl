# Open Blues 2026 registration operations decision

**Status:** picker built and the Tally → Google Sheets sync verified on 4 August 2026.

## Decision

Open Blues will keep its current lightweight stack:

- Tally for registration and contribution calculations
- external bank transfer for the €50 Reservation Payment
- a payment screenshot uploaded with the registration
- a separate Tally form for conflict-resistant sleeping-place claims
- a read-only public Google Sheet feed and the static picker at `/accommodation/`

There will be **no migration to Pretix, Stripe, Ticket Tailor or a custom checkout** for this festival.

## Payment-checking model

The screenshot is intentionally not treated as real-time, automated proof of a settled transfer. This is an accepted trade-off, not a launch blocker.

- A participant who submits the form and states that they prepaid is considered to be coming. There is no approval state, verification queue or second confirmation step.
- The organizer team performs one batch comparison against the bank record one day before the festival.
- The team follows up only where a payment is missing, mismatched or the uploaded evidence appears false.
- The check is an exception audit; it does not delay or gate ordinary registrations.
- Cancellations remain manual: the participant tells Klaudia.

At this festival's scale, one batch check is simpler than introducing and maintaining a payment-platform workflow.

## Bed-chooser model

The website is the room directory. Tally is the claim lock. Google Sheets is the sanitized public read model. There is no custom backend.

- The checked-in inventory contains 51 person-level places across 18 rooms, but **no participant names**. Existing occupied places have deterministic `seed_v1_...` roster keys; their names live only in the deletable public roster feed. New participants claim one person-level place at a time.
- Every currently open place has a random, versioned `claim_key`. The website also sends descriptive `spot_id`, `room` and `place` fields, but only `claim_key` determines which place is locked.
- The claim form is `https://tally.so/r/rjQKYM`. Tally's duplicate-prevention setting uses the hidden `claim_key`, so two respondents cannot ordinarily submit the same place.
- The form collects only a public display name, a registration/payment self-attestation and public-roster consent. It does not collect email, payment evidence or private registration data.
- Tally appends accepted claims to the `Claims` tab of `Open Blues 2026 — Public Accommodation Roster`. The same tab contains the seeded occupants. The browser reads it through Google Visualization JSONP and joins rows to the trusted checked-in inventory by its known roster key (`claim_key` for new claims, `seed_v1_...` for existing occupants).
- Claim links stay disabled whenever the feed is missing, stale, malformed or not activated. A successful empty feed means no new claims; it never means the checked-in occupied places are free.
- Paid accommodation category remains guaranteed. Exact places are first-come, first-served.

This model prevents two ordinary submissions for the same place. It does not prove payment or prevent one person from claiming several different keys; the required self-attestation and organizer exception audit are accepted at this festival's scale.

## Picker operations

### Activate claiming

1. In Tally form `rjQKYM`, open **Integrations → Google Sheets**.
2. Connect spreadsheet `Open Blues 2026 — Public Accommodation Roster`, tab `Claims`, and export existing submissions.
3. Confirm that the public JSONP contains separate `claim_key`, `spot_id` and `Public display name` columns. Tally currently writes the display name in column E after the descriptive `room` and `place` fields; the picker resolves fields by header, not by a fixed column letter.
4. Keep Tally's nine-column integration schema intact. Tally restores deleted integration columns on the next submission. The browser query projects only A, B and E (`claim_key`, `spot_id`, `Public display name`), and the parser accepts those exact headers only. The source's additional columns contain only the same public room/place context, self-attestation and consent shown in the claim form.
5. Verify the 31 existing `seed_v1_...` occupant rows remain in `Claims` and the `public_display_name` cells in `Inventory` remain empty. This migration was completed on 4 August 2026; do not let the connection overwrite it.
6. Submit one disposable test claim, verify the sync in a signed-out JSONP request, and remove its row.
7. Set `roster.integration_ready: true` in `data/accommodation.yaml`, deploy, and verify a real claim in a signed-out browser.
8. Only then update the live registration form confirmation link and retire/protect the legacy editable chooser.

### Move or cancel a claim

Do not depend on deleting a Tally response to release its duplicate lock.

1. Give the affected place a fresh random `v2_...` claim key in `data/accommodation.yaml` and the public `Inventory` tab.
2. Update the seeded status/name as agreed with the participant.
3. Deploy and verify the old key is ignored and the new key is claimable.

### After the festival

- Remove every populated Claims row and all nine integration columns no later than **15 September 2026**, matching the consent shown in the claim form. Participant names are deliberately absent from the Git repository, so clearing this feed removes them from the public picker without leaving them in commit history.
- For an earlier public-name removal request, blank only that row's `Public display name` cell in column E and retain its roster key row. Deleting a current claimant's whole row would make the picker treat the place as available again.
- Remove the picker from navigation and delete or archive the accommodation page.
- Tally's free plan does not provide automatic submission retention for this form, so deletion is a manual organizer task.

## Deliberately unchanged

- Payment-confirmation screenshots remain part of the flow.
- Prepayment means the participant is counted as coming; there is no organizer verification step.
- Cash is collected and stored using the existing organizer process.
- Dietary and allergy information remains in its existing, low-prominence location.
- WhatsApp remains the transport coordination channel.
- Sunday is described as **Sunday-night sleeping**, not a Sunday party.
- The programme finishes at **12:00 noon on Monday**.
- Participants with an earlier confirmed Sunday-night price keep the amount in their original confirmation.

## Revisit only if the operating facts change

This decision can be reconsidered for a later festival if attendance grows materially, duplicate bed claims become a recurring problem, payment discrepancies become common, or the current tools stop working. Those possibilities are not reasons to migrate the 2026 flow.
