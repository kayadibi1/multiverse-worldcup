# MULTIVERSE — build everything and serve on http://localhost:8000 (one process).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[1/4] Python venv + backend deps..." -ForegroundColor Cyan
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python -m pip install -q -r api\requirements.txt

Write-Host "[2/4] Frontend deps..." -ForegroundColor Cyan
npm --prefix web install

Write-Host "[3/4] Building frontend..." -ForegroundColor Cyan
npm --prefix web run build

Write-Host "[4/4] Starting server -> http://localhost:8000  (Ctrl+C to stop)" -ForegroundColor Green
Write-Host "      (Live AI needs Ollama + granite3.3:2b; otherwise offline fallbacks engage.)" -ForegroundColor DarkGray
$env:PYTHONPATH = "api"
& .\.venv\Scripts\python -m uvicorn multiverse.main:app --host 127.0.0.1 --port 8000
