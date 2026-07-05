#!/bin/zsh

set -e

cd "$(dirname "$0")"

CODEX_NODE_DIR="/Users/bastianwilde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
CODEX_PNPM="/Users/bastianwilde/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm"

if command -v pnpm >/dev/null 2>&1; then
  PNPM="pnpm"
elif [ -x "$CODEX_PNPM" ]; then
  PNPM="$CODEX_PNPM"
else
  echo "pnpm wurde nicht gefunden."
  echo "Bitte installiere pnpm oder starte die App aus Codex heraus."
  exit 1
fi

if ! command -v node >/dev/null 2>&1 && [ -d "$CODEX_NODE_DIR" ]; then
  export PATH="$CODEX_NODE_DIR:$PATH"
fi

echo "Sports & Fueling Coach"
echo "Projekt: $(pwd)"
echo

if [ ! -d "node_modules" ]; then
  echo "Installiere Abhängigkeiten..."
  "$PNPM" install
  echo
fi

echo "Starte lokale App..."
echo "Öffne danach im Browser:"
echo "http://127.0.0.1:3000"
echo

(sleep 3 && open "http://127.0.0.1:3000" >/dev/null 2>&1) &

"$PNPM" dev --hostname 127.0.0.1 --port 3000
