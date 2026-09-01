#!/usr/bin/env bash
# Build the site, serve it, run the whole QA suite against it, tear the server down.
#
# The suite needs a *served* build (the tests hit an origin, not the filesystem), and the box
# this runs on has several sessions competing for ports — 3118/3119/3120 have all been taken by
# other sessions before now, and a suite that silently tested a stale server on a busy port has
# already produced one invalid QA run in this project. So: pick a free port, verify it is our
# build being served, and always kill the server on exit.
#
#   qa/run.sh                 # everything
#   qa/run.sh test:cost       # one target
#
# Env:
#   HUGO           path to the hugo binary (default: hugo on PATH)
#   OPENBLUES_SPEC path to an alternate signup contract (default: contracts/signup-2027.json)
set -euo pipefail

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(dirname "$QA_DIR")"
HUGO="${HUGO:-hugo}"

if ! command -v "$HUGO" >/dev/null 2>&1; then
  echo "hugo not found. Set HUGO=/path/to/hugo (0.163.3 static build is what this project uses)." >&2
  exit 2
fi

BUILD_DIR="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "== hugo build =="
"$HUGO" --minify --gc -s "$SITE_DIR" -d "$BUILD_DIR" --logLevel warn

# A free port, ours, verified. Never assume 3118.
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
python3 -m http.server "$PORT" --bind 127.0.0.1 -d "$BUILD_DIR" >/dev/null 2>&1 &
SERVER_PID=$!

ORIGIN="http://127.0.0.1:$PORT"
# curl is not installed on this box; python3 is the one HTTP client we can rely on.
fetch() { python3 -c 'import sys,urllib.request;sys.stdout.write(urllib.request.urlopen(sys.argv[1],timeout=5).read().decode())' "$1" 2>/dev/null; }
for _ in $(seq 1 50); do
  if fetch "$ORIGIN/" >/dev/null 2>&1; then break; fi
  sleep 0.1
done
MARKER="qa-run-$$"
echo "$MARKER" > "$BUILD_DIR/.qa-marker"
SERVED="$(fetch "$ORIGIN/.qa-marker" | tr -d '\n' || true)"
if [ "$SERVED" != "$MARKER" ]; then
  echo "port $PORT is not serving this build (got '$SERVED') — refusing to run against someone else's server." >&2
  exit 3
fi
echo "serving $BUILD_DIR on $ORIGIN"

export OPENBLUES_PREVIEW_ORIGIN="$ORIGIN"
export OPENBLUES_PREVIEW_URL="$ORIGIN/accommodation/"

TARGET="${1:-test}"
echo "== npm run $TARGET =="
npm run --silent --prefix "$QA_DIR" "$TARGET"
