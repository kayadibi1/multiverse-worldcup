# MULTIVERSE — Project State (resume point after context compaction)

**What:** MULTIVERSE — *A World Cup 2026 Oracle*. An explorable counterfactual multiverse for the IBM SkillsBuild AI Builders Challenge (FIFA WC 2026).
**Repo (public, pushed):** https://github.com/kayadibi1/multiverse-worldcup · **Local:** `C:\Users\Sidar\Desktop\ibm`
**Status:** Built + verified end-to-end (spec→plan→P0–P10; 25/25 engine tests, 4/4 headless e2e). Currently iterating the **cold-open cinematic** per the user's live visual feedback. Everything committed + pushed.

## Run / resume
- App served at **http://localhost:8000** by uvicorn (serves built `web/dist` + `/api`). Restart (background):
  `PYTHONPATH=/c/Users/Sidar/Desktop/ibm/api /c/Users/Sidar/Desktop/ibm/.venv/Scripts/python.exe -m uvicorn multiverse.main:app --host 127.0.0.1 --port 8000` (or `./scripts/run.ps1`).
- **Ollama** running (bg) with `granite3.3:2b` + `nomic-embed-text` (real Granite + embeddings). Restart: `ollama serve` (bg).
- Rebuild FE after edits: `npm run build --prefix /c/Users/Sidar/Desktop/ibm/web` — uvicorn serves the fresh `dist` **without restart** (StaticFiles reads per request).
- **Screenshot the real app (bloom ON):** `node web/e2e/shot.mjs "http://localhost:8000/?hq=1" "<absOut.png>" [mode] [coldMs]`. modes: *(none)*=settled globe, `inject`, `dive`, `story`, `cold`. `?hq=1` forces full quality (bloom + 10k sims) under automation.
  - **TIMING GOTCHA:** `cold <ms>` waits `<ms>` **after** `window.__multiverse.ready` (~1.5s after load); the cold-open clock starts at page LOAD. So scene-time ≈ `ms + ~1500`. Cold open total ≈ **9.7s scene → stadium**. To capture scene-time T, pass `coldMs ≈ T−1500`.
- **e2e (4 specs, serial):** `cd web && npx playwright test` (SwiftShader; `?headless=1` disables bloom). **Engine tests:** `web/node_modules/.bin/tsx web/src/sim/__tests__/run.ts`.

## Architecture (key files)
- **FE** `web/` (Vite+React+TS, @react-three/fiber@8, @react-three/postprocessing@2, three, zustand).
  - Sim (Web Worker): `web/src/sim/{prng,poisson,match,bracket2026,tournament,montecarlo,worker,types}.ts` (+ `__tests__/`).
  - 3D: `web/src/scene/{Globe,Traces,Flags,Pillars,Stadium,ShockRing,CameraRig,Scene,constants}.tsx`.
  - UI: `web/src/ui/{Hud,Leaderboard,FuturesRail,WhatIfDock,StoryPanel,StadiumHud,ColdOpen,FadeTransition,Hints}.tsx`.
  - `web/src/state/{store,debug}.ts`, `web/src/api/client.ts`, `web/src/sim/useSim.ts`, `web/src/quality.ts`.
  - Assets: `web/public/earth_day8k.jpg`, `earth_night8k.jpg`, `flags/<CODE>.png` (48).
- **BE** `api/multiverse/{data,ingest,granite,retriever,whatif,narrate,format,main}.py`. Runtime deps `api/requirements.txt` (no torch); ingestion `api/requirements-ingest.txt` (docling+torch). venv `.venv`.
- **Data**: `data/raw/teams.research.json` (real final draw + Elo) + `dossier_*.md`; committed KB `data/kb/*`.
- **IBM artifacts**: `langflow/*.json`, `contextforge/gateway.json` (+ READMEs). **Docs**: `docs/{spec.md,implementation-plan.md,verification.md,video-storyboard.md,PROJECT-STATE.md}`, `docs/shot-*.png`. **Decision log**: `DECISION-JOURNAL.md` (read for full rationale).

## Product flow (current)
**Cold open (~9.7s, skippable):** deep space → globe **spins slowly** (starts beside North America, lands on the host) while **pixel-art neon flags pop** at countries as they rotate into view and **colored traces (by confederation) sweep the long way (spin direction, NOT shortest)** toward the host (MetLife/NJ), **all arriving simultaneously** in a white **convergence flare** → traces/flags/flare fade → camera **dives down onto the host city** (8K night lights, zoom levels) → fade → **Stadium** (most-likely final): formation-constellation duel + streamed Granite story w/ Docling citation. **"⤺ Back to globe" / Skip** → **Oracle Globe** hub (3D night-Earth + hovering win-prob markers, leaderboard, futures rail, What-If dock; double-click globe or click a future to dive).

## Cold-open tuning constants (where to adjust)
- `web/src/scene/constants.ts`: `GLOBE_R=2.5`, `HOST_LATLON=[40.81,-74.07]` (convergence + dive target + spin landing).
- `web/src/scene/Globe.tsx`: `COLD_DUR=7`, `SPIN=Math.PI*1.8`, `RHO1` (landing); Pillars only in 'globe'; Traces/Flags inside the spinning group during 'cold'.
- `web/src/scene/Traces.tsx`: `ARRIVE=7.0` (simultaneous arrival), `FORCE_START=4.8`, spiral +azimuth path, bow `rr=R+0.55*sin(πs)`, white beacon sprite at host, `fadeOut` after 7.4s.
- `web/src/scene/Flags.tsx`: pixel grid `PW=30,PH=20`, `SIZE=0.2`, NearestFilter, fadeOut after 7.4s.
- `web/src/scene/CameraRig.tsx`: ColdCam two-phase down host axis (converge 0–7s dist 13→3.6, dive 7–9.6s dist 3.6→0.14).
- `web/src/ui/ColdOpen.tsx`: timer **9700ms** → land in stadium (top seedTimeline final); skip→globe; CSS `cocard` 7s in `index.css`.

## Next / open
- User is iterating the cold open (all recent asks addressed): possible tweaks = dive depth/speed/linger, flag pixel resolution, land-in-final-vs-globe, flare size/timing, spin amount/start.
- **Not blocking:** the 3-min submission **video** must be recorded by the user (storyboard `docs/video-storyboard.md`; run headed `?hq=1`). Stretch backlog (Compare A/B, live-results feed, MESO) untouched.

**Workflow rule learned:** "verified" = the artifact the user actually sees → always rebuild + capture **bloom-on (`?hq=1`) at the correct scene-time** + run e2e before claiming done.
