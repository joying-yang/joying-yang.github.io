#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: Python 3 is required. Install it with 'brew install python'." >&2
  exit 1
fi

exec python3 "$SCRIPT_DIR/serve.py" "$@"
