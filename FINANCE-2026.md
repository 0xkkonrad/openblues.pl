# Open Blues 2026 finance working note

**Snapshot:** 18 August 2026  
**Purpose:** preserve the current financing assumptions and calculations. This is a forecast, not a bank-reconciled P&L. Re-read the live registration and accommodation workbooks before using these figures for a payment or purchasing decision.

## Canonical live sources

- Registration workbook: <https://docs.google.com/spreadsheets/d/1jOfW1cwfbfp5aAG4_kGDU9LrcbjpZPmXYPG3VEViak8/edit>
  - Use `All Registrations` for the consolidated roster.
  - Do not trust the raw `Total contribution` sum without correcting tests, duplicates, exemptions, multi-person registrations and legacy cash-entry errors.
- Accommodation workbook: <https://docs.google.com/spreadsheets/d/1Cu3Cgi5qpbeqUIpy87-dbzBTXIWrYuWIIHS5Jp1RSV8/edit>
  - Use `ROOM BROWSER` to find people occupying places without a matching registration.

Payment screenshots show that a proof or exemption image was submitted. They are not a bank reconciliation. The organiser team still needs to compare the €50 Reservation Payments with the bank record.

## Audited 2025 baseline

The 2025 Finance summary understated costs. Its total-cost formula omitted €475 of team-bed costs; the outflow block also omitted some costs. After reconciling the Finance and Payments tabs:

| 2025 actual | Amount | Share of cost |
| --- | ---: | ---: |
| Venue and accommodation | €4,045 | 57.04% |
| Bands | €967 | 13.64% |
| Food | €1,820 | 25.66% |
| Alcohol | €230 | 3.24% |
| Other recorded costs | €30 | 0.42% |
| **Total cost** | **€7,092** | **100%** |
| Actual revenue | €7,020 | — |
| **Result** | **€72 red** | — |

There were 50 attendees, so the all-in historical average was €141.84 per attendee. Food was budgeted for 52 covers, giving a built-in 4% food buffer.

For 2026, bands are a fixed cost and are expected to remain approximately **€967**. Do not scale the band line with attendance. The other lines in the percentage model scale from the 2025 attendee count:

- venue/accommodation: €80.90 per adult-equivalent
- food, including the historical cover buffer: €36.40 per adult-equivalent
- alcohol: €4.60 per adult-equivalent
- other recorded costs: €0.60 per adult-equivalent
- variable total: €122.50 per additional adult-equivalent

The €0.60 “other” line is clearly too small for a real operating buffer. Keep a separate contingency instead of relying on it.

## Registration dedupe and clean income

At this snapshot the live register contained 67 submissions:

- 4 explicit tests/audits removed
- 1 exact duplicate removed
- 1 rejected/non-attending submission removed
- 61 active registration records remain
- 1 additional person is embedded in a two-person response
- **62 registered humans before adding people who are off-register**

The component-based committed income before comp exemptions was:

| Income component | Amount |
| --- | ---: |
| Reservation Payments represented by 61 submitted proofs | €3,050 |
| Main accommodation | €5,270 |
| Sunday accommodation | €1,490 |
| Drinks | €505 |
| Optional donations | €1,000 |
| **Clean committed income before comps** | **€11,315** |

This uses the selected components rather than the raw submitted cash totals. Several legacy cash totals disagree with their selections, including one €999 joke value.

## Comp and cost-only roster

### User-confirmed non-payers

The following are authoritative for the current forecast:

- Konrad — no registration income; add as a cost-only attendee if attending
- Natalia — registered; €250 was present in the clean income
- Stacey — registered; €170 was present in the clean income
- Tomek, registered as Tomasz Gargól — €155 component-corrected contribution was present in the clean income
- Nella — no registration income; add as a cost-only attendee if attending

Removing the three registered non-payers reduces income by €575:

`€11,315 - €575 = €10,740`

### Current candidates requiring confirmation

Do not silently treat these as either paying or comp. Resolve them with the organiser roster:

- Kasia/Katarzyna Wadas — registered, food/chef role; €200 in the component model. A cooking exemption is plausible but is not explicitly recorded on the legacy response.
- Agnieszka Madalska — registered, says “we are a band”; €160 in the component model. Her response also says she transferred €50, so comp status needs confirmation.
- Wojciech W. and Andrzej W. — occupied beds beside Agnieszka, no registration/payment rows; strong cost-only band-member candidates.
- Lea — unregistered infant dependent. **Do not count her as a full adult-equivalent.** Add only an actual baby-specific accommodation charge, if the venue charges one; do not add adult food, alcohol or band allocation.
- Michaela — occupies a bed, but the matching registration has no payment/accommodation and rejects the DIY terms. Confirm whether she is attending.
- Kiryl — occupies a bed with no current registration/payment row. Confirm whether he is attending.

The Tally form supports an “organizer-approved band or cooking exemption,” but no real current Tally response is marked with it. Legacy Google Form rows do not have this status field, so their mechanical €50 assignment is not proof that the person pays.

## Current planning scenarios

The current working income assumption is **€10,380**. It starts from the €11,315 clean component total and provisionally removes:

- €575 for the user-confirmed registered comps: Natalia, Stacey and Tomek
- €200 for Kasia as a provisional cook comp
- €160 for Agnieszka as a provisional band comp

If Kasia or Agnieszka pays, add the corresponding amount back. This €10,380 figure should therefore be treated as a conservative working assumption, not a settled ledger.

Bands remain fixed at €967. Lea is not an adult-equivalent.

| Cost category | 66 adult-equivalents | 68 adult-equivalents |
| --- | ---: | ---: |
| Venue/accommodation | €5,339 | €5,501 |
| Food | €2,402 | €2,475 |
| Bands, fixed | €967 | €967 |
| Alcohol | €304 | €313 |
| Other recorded costs | €40 | €41 |
| **Forecast subtotal** | **€9,052** | **€9,297** |
| 10% contingency | €905 | €930 |
| **Planning total** | **€9,957** | **€10,227** |
| Margin on €10,380 income | **€423 green** | **€153 green** |

Scenario definitions:

- **66 adult-equivalents:** the 62 registered humans, plus Konrad, Nella, Wojciech W. and Andrzej W.; Lea is present but is not treated as an adult-equivalent.
- **68 adult-equivalents:** the 66-person case plus unresolved Michaela and Kiryl attendance.

Without the 10% contingency, the corresponding margins are €1,328 and €1,083 green. The contingency-adjusted result is the safer planning view: the event is approximately break-even, not comfortably profitable.

## Recalculation rules

When the roster changes:

1. Dedupe by person/email and keep only the latest exact duplicate response.
2. Remove test/audit rows and rejected registrations.
3. Expand multi-person registrations into actual humans and their selected costs.
4. Remove all confirmed comp amounts from income while keeping those people in the cost headcount.
5. Add off-register attendees from the accommodation roster as cost-only people.
6. Treat babies and children according to actual marginal food/accommodation costs, not the adult average.
7. Keep bands fixed at €967 unless a new quote changes it.
8. Scale venue, food, alcohol and recorded misc from the audited 2025 adult-equivalent rates above.
9. Add at least 10% contingency.
10. Replace forecasts with invoices, supplier quotes and bank-reconciled receipts as soon as they exist.

