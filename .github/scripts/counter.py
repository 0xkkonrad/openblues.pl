#!/usr/bin/env python3
"""Fetch the published "Public" tab of the signups workbook as CSV and write data/counter.json.

CSV contract: a header row and one value row with the columns paid, threshold, status, updated.
Any other column in the CSV is ignored, so the workbook can carry working columns (the override
cell, the check cell, the confirmed-at latch) in the same published tab. status must be one of
open, confirmed, cancelled — the only three states there are; there is no capacity limit and no
"full" state (POLICY.md, Fixed values, 29 Aug 2026). "cancelled" is only ever set by hand in the
workbook's override cell. Usage: counter.py <csv-url> <out-json>

CONFIRMATION IS ONE-WAY.  POLICY.md rule 2: "It is confirmed the moment the 40th payment
arrives... Confirmation is one-way: later drop-outs never un-confirm it."  Once this file has
published "confirmed", it will not publish "open" again — see latch_status() below.  The
workbook has its own latch (Public!H2, written by the Apps Script latchConfirmed()); this one is
independent of it and of any Google credential, so the public page never retracts a confirmation
even if that trigger is missing, broken or not yet installed.

FAIL LOUD, NEVER GUESS.  If paid is not an integer — which is what the workbook publishes when
its header guard trips, e.g. "HEADER MISMATCH in Signups: Counted" — int() raises here and the
job goes red WITHOUT writing data/counter.json.  The site then keeps serving the last good
counter.  A red "Update signup counter" job means "the workbook shape changed", not "the site is
down": fix the header in the workbook, never the formula, and never this script.
"""
import csv
import io
import json
import sys
import urllib.request

STATES = {"open", "confirmed", "cancelled"}


def latch_status(new_status, out_path):
    """Never publish confirmed -> open.  POLICY.md rule 2: confirmation is one-way.

    "cancelled" is deliberately NOT blocked: it is set by hand in the workbook's override cell and
    is the one state that must always be able to win, because it is the state in which every
    Reservation Payment is refunded in full.
    """
    try:
        with open(out_path, encoding="utf-8") as fh:
            previous = (json.load(fh).get("status") or "").strip().lower()
    except (OSError, ValueError, AttributeError):
        return new_status          # no previous counter to compare against
    if previous == "confirmed" and new_status == "open":
        print("counter: refusing to un-confirm. The workbook says 'open' but this counter has "
              "already published 'confirmed', and POLICY.md rule 2 makes confirmation one-way "
              "('later drop-outs never un-confirm it'). Publishing 'confirmed'. If the gathering "
              "really is off, set the workbook override cell to 'cancelled' — that still wins.",
              file=sys.stderr)
        return "confirmed"
    return new_status


def main(url, out):
    req = urllib.request.Request(url, headers={"User-Agent": "openblues-counter/1.0"})
    raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(raw)))
    if not rows:
        sys.exit("counter: the CSV has no value row")
    row = {k.strip().lower(): (v or "").strip() for k, v in rows[0].items() if k}
    paid = int(row["paid"])
    threshold = int(row.get("threshold") or 40)
    status = (row.get("status") or "open").lower()
    if paid < 0 or threshold <= 0 or status not in STATES:
        sys.exit(f"counter: invalid row {row}")
    status = latch_status(status, out)
    data = {"paid": paid, "status": status, "threshold": threshold,
            "updated": row.get("updated", "")}
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print(data)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
