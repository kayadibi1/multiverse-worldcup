#!/usr/bin/env bash
# MULTIVERSE — build everything and serve on http://localhost:8000 (macOS / Linux).
set -e
cd "$(dirname "$0")/.."

echo "[1/4] Python venv + backend deps..."
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/python -m pip install -q -r api/requirements.txt

echo "[2/4] Frontend deps..."
npm --prefix web install

echo "[3/4] Building frontend..."
npm --prefix web run build

echo "[4/4] Starting server -> http://localhost:8000 (Ctrl+C to stop)"
echo "      (Live AI needs Ollama + granite3.3:2b; otherwise offline fallbacks engage.)"
PYTHONPATH=api ./.venv/bin/python -m uvicorn multiverse.main:app --host 127.0.0.1 --port 8000
