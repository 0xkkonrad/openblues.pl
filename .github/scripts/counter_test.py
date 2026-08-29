#!/usr/bin/env python3
"""Tests for counter.py.  No network, no Hugo, no credentials:  python3 .github/scripts/counter_test.py

Covers the two things the counter must never get wrong:
  1. it must never publish confirmed -> open   (POLICY.md rule 2, confirmation is one-way)
  2. it must fail LOUDLY and write nothing when the workbook's header guard trips, so the site
     keeps serving the last good counter instead of a confident wrong number.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
COUNTER = os.path.join(HERE, "counter.py")

HDR = "paid,threshold,status,updated,,override (Konrad only),check,confirmed at"
FAILURES = []
CHECKS = []


def run(csv_text, previous=None):
    """Run counter.py over csv_text with an optional pre-existing counter.json."""
    d = tempfile.mkdtemp()
    csv_path = os.path.join(d, "public.csv")
    out_path = os.path.join(d, "counter.json")
    with open(csv_path, "w", encoding="utf-8") as fh:
        fh.write(csv_text)
    if previous is not None:
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(previous, fh)
    p = subprocess.run([sys.executable, COUNTER,
                        urllib.request.pathname2url(csv_path).join(["file://", ""]), out_path],
                       capture_output=True, text=True)
    after = None
    if os.path.exists(out_path):
        with open(out_path, encoding="utf-8") as fh:
            try:
                after = json.load(fh)
            except ValueError:
                after = "UNPARSEABLE"
    return p.returncode, after, (p.stdout + p.stderr)


def check(name, ok, detail=""):
    CHECKS.append(name)
    print("  [%s] %-56s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        FAILURES.append(name)


print("== a plain open counter ==")
rc, out, log = run(HDR + "\n3,40,open,2027-01-02 10:00 UTC,,,formulas OK,\n")
check("exit 0", rc == 0, "rc=%d" % rc)
check("publishes 3 / open", out == {"paid": 3, "status": "open", "threshold": 40,
                                    "updated": "2027-01-02 10:00 UTC"}, json.dumps(out))

print("\n== the extra 'confirmed at' latch column is ignored, not fatal ==")
rc, out, log = run(HDR + "\n41,40,confirmed,2027-04-11 19:03 UTC,,,OK,2027-04-11 19:03 UTC\n")
check("exit 0", rc == 0, "rc=%d" % rc)
check("no 'confirmed at' key leaks into counter.json", out is not None and
      set(out) == {"paid", "status", "threshold", "updated"}, json.dumps(out))

print("\n== THE FIX: the workbook says open again after we published confirmed ==")
prev = {"paid": 41, "status": "confirmed", "threshold": 40, "updated": "2027-04-11 19:03 UTC"}
rc, out, log = run(HDR + "\n39,40,open,2027-04-12 08:00 UTC,,,formulas OK,\n", previous=prev)
check("exit 0", rc == 0, "rc=%d" % rc)
check("status stays confirmed", out and out["status"] == "confirmed", json.dumps(out))
check("the real paid number is still published honestly", out and out["paid"] == 39,
      "paid=%s" % (out or {}).get("paid"))
check("it says loudly what it did", "refusing to un-confirm" in log, log.strip()[:90])

print("\n== cancelled must still win over a published confirmed ==")
rc, out, log = run(HDR + "\n39,40,cancelled,2027-08-04 09:00 UTC,,,OVERRIDE,\n", previous=prev)
check("exit 0", rc == 0, "rc=%d" % rc)
check("status becomes cancelled", out and out["status"] == "cancelled", json.dumps(out))

print("\n== open -> confirmed is allowed (the latch is one-way, not frozen) ==")
prev_open = {"paid": 3, "status": "open", "threshold": 40, "updated": "x"}
rc, out, log = run(HDR + "\n40,40,confirmed,2027-04-11 19:03 UTC,,,OK,2027-04-11 19:03 UTC\n",
                   previous=prev_open)
check("status becomes confirmed", out and out["status"] == "confirmed", json.dumps(out))

print("\n== no previous counter.json at all ==")
rc, out, log = run(HDR + "\n0,40,open,2027-01-01 00:00 UTC,,,OK,\n")
check("exit 0 and publishes open", rc == 0 and out and out["status"] == "open", json.dumps(out))

print("\n== FAIL LOUD: the workbook's header guard has tripped ==")
rc, out, log = run(HDR + '\n"HEADER MISMATCH in Signups: Counted",40,open,2027-01-01 00:00 UTC,,,'
                         '"HEADER MISMATCH in Signups: Counted",\n', previous=prev)
check("exit non-zero", rc != 0, "rc=%d" % rc)
check("counter.json is LEFT ALONE (site keeps the last good counter)", out == prev,
      json.dumps(out))
check("the traceback names the offending value", "HEADER MISMATCH" in log, log.strip()[-90:])

print("\n== a corrupt previous counter.json must not crash the run ==")
d = tempfile.mkdtemp()
out_path = os.path.join(d, "counter.json")
csv_path = os.path.join(d, "public.csv")
open(out_path, "w").write("{not json")
open(csv_path, "w").write(HDR + "\n5,40,open,x,,,OK,\n")
p = subprocess.run([sys.executable, COUNTER, "file://" + csv_path, out_path],
                   capture_output=True, text=True)
check("exit 0", p.returncode == 0, "rc=%d %s" % (p.returncode, p.stderr.strip()[:80]))
check("publishes open", json.load(open(out_path))["status"] == "open", open(out_path).read().strip())

print("\n== a status the workbook should never emit is still rejected ==")
rc, out, log = run(HDR + "\n41,40,full,x,,,OK,\n")
check("exit non-zero on 'full'", rc != 0, "rc=%d" % rc)

print("\n%d checks, %d failures%s" % (len(CHECKS), len(FAILURES),
                                     "" if not FAILURES else ": %s" % FAILURES))
sys.exit(1 if FAILURES else 0)
