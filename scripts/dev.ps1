# MULTIVERSE — dev mode: API (:8000, reload) in a new window + Vite (:5173, proxied).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path ".venv")) { python -m venv .venv ; & .\.venv\Scripts\python -m pip install -q -r api\requirements.txt }
npm --prefix web install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; `$env:PYTHONPATH='api'; .\.venv\Scripts\python -m uvicorn multiverse.main:app --reload --port 8000"
Write-Host "API starting on :8000 (separate window). Vite dev on http://localhost:5173" -ForegroundColor Green
npm --prefix web run dev
