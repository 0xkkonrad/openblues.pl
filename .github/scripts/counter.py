#!/usr/bin/env python3
"""Fetch the published "Public" tab of the signups workbook as CSV and write data/counter.json.

CSV contract: a header row and one value row with the columns paid, threshold, status, updated.
status must be one of open, confirmed, full, cancelled ("full" and "cancelled" are only ever set
by hand in the workbook's override cell). Usage: counter.py <csv-url> <out-json>
"""
import csv
import io
import json
import sys
import urllib.request

url, out = sys.argv[1], sys.argv[2]
req = urllib.request.Request(url, headers={"User-Agent": "openblues-counter/1.0"})
raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8-sig")
rows = list(csv.DictReader(io.StringIO(raw)))
if not rows:
    sys.exit("counter: the CSV has no value row")
row = {k.strip().lower(): (v or "").strip() for k, v in rows[0].items() if k}
paid = int(row["paid"])
threshold = int(row.get("threshold") or 40)
status = (row.get("status") or "open").lower()
if paid < 0 or threshold <= 0 or status not in {"open", "confirmed", "full", "cancelled"}:
    sys.exit(f"counter: invalid row {row}")
data = {"paid": paid, "status": status, "threshold": threshold, "updated": row.get("updated", "")}
with open(out, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2, sort_keys=True)
    fh.write("\n")
print(data)
