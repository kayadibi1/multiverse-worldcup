# MULTIVERSE — Implementation Plan (v1)

Derived from `docs/spec.md` v2. Ordered phases; each ends in a **verification gate** that must pass before the next begins. File paths are relative to repo root. Tech: Vite/React/TS + r3f/Three (`web/`), FastAPI (`api/`), Web-Worker sim (`web/src/sim/`).

Legend: 🟩 MVP · 🟦 stretch · ⛏ task · ✅ gate.

---

## P0 · Foundation (DONE)
Repo scaffolded; `web` deps (react, three, r3f, drei, zustand) and `api` deps (fastapi, uvicorn, httpx, rank-bm25, numpy, pypdf) installed on Python 3.14 (cp314 wheels); **Docling 2.97 + docling-ibm-models** import OK; **Granite `granite3.3:2b`** verified; `nomic-embed-text` present; `data/raw/teams.research.json` (real final draw) validated; decision journal + spec live.
✅ `node_modules` present, `python -c "import fastapi,docling"` OK, `ollama list` shows granite3.3:2b. (met)

---

## P1 · Data & ingestion 🟩
**Objective:** turn raw data into a committed KB the app and retriever consume.
- ⛏ `api/multiverse/data.py` — load `data/raw/teams.research.json`; build the canonical **Strength Table** (`data/kb/teams.json`) with `modelParams`, `format`, `groups`, per-team `{code,name,confederation,group,elo,isHost,keyPlayers,style,blurb,modifiers:[]}`.
- ⛏ Author 6–10 `data/raw/dossier_<team>.md` for marquee sides (BRA, ARG, FRA, ESP, ENG, plus a couple of dark horses) — concise, factual, H2H lines.
- ⛏ `api/multiverse/ingest.py` — **Docling** (`DocumentConverter`) parses each dossier → markdown → split into `facts.jsonl` (`{id,teams,text,source,label}`). pypdf fallback behind same interface. Engine name recorded in output.
- ⛏ Build retrieval indexes: BM25 (`rank-bm25` → `data/kb/bm25.json` tokens) **and** embeddings (`nomic-embed-text` via Ollama `/api/embeddings` → `data/kb/embeddings.npy` + id order). Skip embeddings gracefully if Ollama down (BM25 still works).
- ⛏ `scripts/ingest.py` (or `python -m multiverse.ingest`) one-command build; commit `data/kb/*`.
✅ **Gate:** `data/kb/teams.json` has 48 teams; `facts.jsonl` ≥ 20 facts each citing a source file; BM25 index loads; (if Ollama) `embeddings.npy` shape = (n_facts, dim). A retrieval smoke query ("Brazil Nigeria history") returns a relevant fact.

---

## P2 · Simulation core (TS, the engine) 🟩
**Objective:** correct, fast, reproducible Monte-Carlo — pure functions, unit-tested, runnable in Node before any UI.
- ⛏ `web/src/sim/prng.ts` — `mulberry32(seed)`, `hash2(a,b)`; **no Math.random**.
- ⛏ `web/src/sim/poisson.ts` — Knuth Poisson sampler from a PRNG.
- ⛏ `web/src/sim/match.ts` — `strength(elo)`, `simulateMatch(a,b,{modelParams,modifiers,knockout,host})` → `{ga,gb,winner}` incl. ET + penalties.
- ⛏ `web/src/sim/tournament.ts` — group round-robin (3/1/0; tie-break pts→GD→GF→lot), **best-thirds** comparator (top 8 of 12), fixed **R32 slot map** + same-group-avoidance swap, knockout tree to Final. Returns a `Timeline`.
- ⛏ `web/src/sim/montecarlo.ts` — run N tournaments; tally `pChamp` + `pReach`; collect `sampleTimelines` (incl. ≥3 divergent). Calibration helper to auto-pick N under a time budget.
- ⛏ `web/src/sim/types.ts` — `Team, Modifier, ModelParams, SimResult, Timeline` (mirror spec §7/§12).
- ⛏ `web/src/sim/worker.ts` — Web Worker entry: receive `{strengthTable,modelParams,modifiers,N,seed,sampleTimelines}`, fold team modifiers, run, post `{perTeam,seedTimelines,elapsedMs,N}`.
- ⛏ `web/src/sim/__tests__/*.ts` — a tiny Node test runner (no framework needed): single-match monotonicity, Poisson mean≈λ, format invariants (12×4, exactly 8 thirds, 32 R32 slots, no same-group R32 pairing), PRNG reproducibility, **probability invariants** (`ΣpChamp=1±1e-6`, `Σ pReach(r)=slots(r)`, reach monotonic).
✅ **Gate:** `node --experimental-strip-types web/src/sim/__tests__/run.ts` (or tsx) prints ALL PASS; a 10k run logs `elapsedMs` and the champion distribution (sanity: Spain/Argentina/France lead).

---

## P3 · Backend API 🟩
**Objective:** FastAPI serving ratings, parsing what-ifs, narrating (SSE), feed, health, anchor — with the provider/retriever abstractions.
- ⛏ `api/multiverse/granite.py` — provider chain: Ollama (`/api/chat`, `think:false`, strip any `<think>`) → watsonx (if `WATSONX_*`) → deterministic template narrator. `health()` reports active provider.
- ⛏ `api/multiverse/retriever.py` — embeddings (Ollama `nomic-embed-text`) cosine top-k via numpy; BM25 fallback; returns `Fact[]` with citations. (This is the "Context-Forge-fronted" retriever.)
- ⛏ `api/multiverse/whatif.py` — Granite prompt: free-text → strict-JSON `Modifier[]` (validated against the taxonomy; reject/repair invalid). Deterministic fallback keyword parser.
- ⛏ `api/multiverse/narrate.py` — build context (retriever) → Granite → stream tokens; final `meta` with `headline, voice, causes[], citations[]`.
- ⛏ `api/main.py` — endpoints per spec §12 (`/api/ratings /intervene /narrate(SSE) /feed /health /anchor`), CORS, static-serve built `web/dist` for one-process demo.
- ⛏ `api/multiverse/format.py` — shared format/anchor helpers (actuals → Force-result modifiers).
✅ **Gate:** `uvicorn` up; `GET /api/health` → `graniteProvider:"ollama"`; `GET /api/ratings` → 48 teams + modelParams; `POST /api/intervene {"text":"star striker injured for Brazil"}` → valid `Modifier[]`; `POST /api/narrate` streams tokens then a `meta` with ≥1 citation. (curl-tested.)

---

## P4 · Frontend shell, state, globe 🟩
**Objective:** the app boots, runs sims in the worker, and renders the Oracle Globe with live probabilities.
- ⛏ `web/src/main.tsx`, `App.tsx`, `index.css` (dark theme); `web/src/state/store.ts` (zustand: ratings, simResult, modifiers, altitude, selectedFixture, baseline-for-trend).
- ⛏ `web/src/api/client.ts` — typed fetch wrappers + SSE reader.
- ⛏ `web/src/sim/useSim.ts` — worker lifecycle; re-run on modifier change; expose `window.__multiverse`.
- ⛏ `web/src/scene/Globe.tsx` — sphere + grid + instanced atmosphere particles; `Pillars.tsx` (instanced bars, height=pChamp); bloom via drei/postprocessing.
- ⛏ `web/src/ui/Hud.tsx` (round scrubber, sims-N counter, ⟳), `Leaderboard.tsx` (P + ▲▼ trend), `FuturesRail.tsx` ("3 wildly different timelines").
- ⛏ `data-testid` + `window.__multiverse` wiring.
✅ **Gate:** `npm run dev` (web) + api; globe renders with pillars; `window.__multiverse.championSum≈1`; leaderboard + futures rail populated; no uncaught errors (allow-list WebGL warnings).

---

## P5 · Interventions (the what-if loop) 🟩
- ⛏ `web/src/ui/WhatIfDock.tsx` — draggable cards (Injury/Red card/Force result/Form±/Host edge/Weather); structured cards build `Modifier[]` client-side (instant); free-text box calls `/api/intervene` (async pending state).
- ⛏ Apply modifiers → re-run worker → animate leaderboard deltas + globe shockwave; active-modifiers chips; remove/clear.
- ⛏ Anchor UI (minimal): "Set actual result" → Force-result modifier (demonstrates §11b).
✅ **Gate:** dropping Injury on Brazil drops its `pChamp` by ≥2pp (asserted via `window.__multiverse`); free-text "it rains every knockout night" yields a Weather modifier and a re-run; clear restores baseline.

---

## P6 · Stadium, formation-duel, camera rig, cold open 🟩
- ⛏ `web/src/scene/CameraRig.tsx` — named waypoints (space/globe/region/stadium) + eased tween controller.
- ⛏ `web/src/scene/Stadium.tsx` — pitch + two formation constellations (instanced points) advancing/clashing; odds bar; momentum scrubber.
- ⛏ `web/src/scene/ColdOpen.tsx` — 8s on-rails sequence (space→arcs→dive→duel); skip button (`data-testid="skip-cold-open"`); honors `prefers-reduced-motion`.
- ⛏ click fixture (from a timeline/bracket) → fly to stadium with that match's data.
✅ **Gate:** cold open plays & skips; clicking a fixture flies into the stadium and shows the duel for the correct teams/scoreline.

---

## P7 · Narration panel 🟩
- ⛏ `web/src/ui/StoryPanel.tsx` — open on fixture/timeline select; stream Granite tokens (SSE); render headline, body, **causal evidence chips** (each → KB citation), voice switch (Pundit/Poet/Tactician/Kid), regenerate, audio narrate (Web Speech API; stretch).
✅ **Gate:** selecting the marquee upset streams a story ending with ≥1 citation chip traceable to a Docling fact; voice switch re-generates.

---

## P8 · Polish, perf, a11y, debug 🟩
- ⛏ Particle-count auto-step-down on low FPS; quality toggle; reduced-motion paths; loading states; error boundaries (offline narrator / cached feed on failures).
- ⛏ Finalize `window.__multiverse` fields + all `data-testid`s for the e2e.
✅ **Gate:** sustained 60fps target on dev machine or graceful step-down; no hard failures with api/Ollama down (offline fallbacks engage).

---

## P9 · IBM artifacts, README, scripts, seed KB 🟩
- ⛏ `langflow/ratings_flow.json`, `langflow/narrative_flow.json` — real importable flows mirroring P3 logic (authored via langflowai Docker if needed); `langflow/README.md` maps flow↔code.
- ⛏ `contextforge/gateway.json` (+ README) — MCP gateway config exposing the KB-retrieval tool; note demo calls retriever directly.
- ⛏ `scripts/run.ps1` / `scripts/run.sh` — one command: ingest (if needed) → start api → build/serve web. `scripts/dev.*` for dev mode.
- ⛏ Commit `data/kb/*` (self-contained clone).
- ⛏ **`README.md`** (root): Problem / AI Approach (per-IBM-tool role) / Why It Matters in football / Run instructions / **IBM-tool honesty section** / data provenance / known approximations.
✅ **Gate:** fresh-clone simulation — from a clean checkout, the documented command reaches the globe with seeded ratings (Ollama optional). README renders with all required sections.

---

## P10 · Verification & sign-off 🟩
- ⛏ Run P2 unit tests; P3 integration (curl/httpx script `scripts/check_api.py`); **Playwright e2e** `web/e2e/flow.spec.ts` (cold-open-skip → globe → intervene assert pChamp drop → dive → narrate assert citation), launched with SwiftShader; console allow-list policy.
- ⛏ Capture screenshots of each state; write `docs/verification.md` (every MVP checkbox + evidence).
- ⛏ Final journal entry; `git add -A && git commit`; (push to public GitHub if auth available, else document steps).
✅ **Gate:** every §13 MVP checkbox green with captured evidence.

---

## Stretch backlog (post-MVP, time permitting) 🟦
Compare A/B split multiverse · live-results auto-feed connector · full MESO bracket/region layer · streaming audio narration · richer formation choreography (per-player paths) · MICRO momentum simulation.

---

## Build approach notes
- **Order respects dependencies:** data → engine → API → UI shell → interactions → cinematics → narration → polish → artifacts → verify. Each gate is a real check, not a vibe.
- **Parallelizable clusters** (can be built by independent agents then integrated): P2 (sim) ⟂ P3 (api) ⟂ P1 (data) early; P4–P7 are mostly sequential on the scene graph but UI panels (Leaderboard, StoryPanel, WhatIfDock) are independent components.
- **Verification is continuous:** never advance a gate red. The headless e2e is the final proof for the "everything works" bar.

---

# REVISIONS v2 — binding directives (post 5+5 plan review, 81 findings)

These override/extend the phases above. Build order: **P0 → P1 → P2 → P3 → P4 → P4.5 → P5 → P6 → P7 → P8 → P9 → P10/P11.** Commit after **every green gate** so a working snapshot always exists. Sequence riskiest-cheapest-to-prove first (engine+tests are the first judge-credible artifact).

## P0 · Dependency lock + headless render smoke (NEW — run first)
- `web/`: add `@react-three/postprocessing@^2.16` + `postprocessing@^6.36` (v2 line — **v3 needs r3f v9 and black-screens our r3f ^8.17/three 0.171**), `@playwright/test`, `tsx` (dev); then `npx playwright install chromium`.
- `api/`: keep `requirements.txt` runtime-only; add **`api/requirements-ingest.txt`** pinning `docling==2.97.0`, `docling-ibm-models`, `pypdf==6.12.2`, `requests` (ingestion deps live only in the current .venv; a fresh runtime install must not need torch).
- `web/playwright.config.ts`: `launchOptions.args = ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']`; `webServer` boots api+web; console-error listener with a committed allow-list regex (THREE/r3f/postprocessing warnings).
- Quality flag NOW: `?headless=1` / `navigator.webdriver` → disable bloom + reduce particles (keeps GL context valid headless). Bloom params explicit constants; expose `window.__multiverse.bloom`.
- **Gate:** postprocessing installed; chromium installed; clean-venv install of `requirements-ingest.txt` then `import docling,pypdf` OK; a trivial smoke spec mounts a blank r3f canvas and asserts `window.__multiverse.ready` headless.

## P1 deltas
- `data.py`: synthesize `keyPlayers[].importance` (1.0, then 0.7) so **every team has ≥1 player importance ≥0.8** (else Injury → `-0.10×undefined = NaN`). Carry provenance: `eloSnapshot:"2026-06-01"`, `fifaRankAsOf:"2026-04"`. **All file I/O `encoding="utf-8"`, `json.dump(..., ensure_ascii=False)`** (Windows cp1252 → mojibake in citation chips).
- Pin a **guaranteed-citable demo fixture** among the 9 dossiered sides (use **Brazil vs Nigeria? → no Nigeria dossier; use BRA vs FRA or ESP vs MAR**). Choose **Spain vs Morocco** (both dossiered, real H2H) as the demo upset; ensure ≥1 H2H fact covering it; offline narrator always emits ≥1 citation from it.
- **Gates:** every team ≥1 importance≥0.8; provenance dates in teams.json; non-ASCII (em-dash, accents) round-trips through facts.jsonl; demo-fixture retrieval smoke returns a covering fact.

## P2 deltas
- Author **`web/src/sim/bracket2026.ts`** as a reviewed constant BEFORE tournament.ts: 24 W/RU into fixed slots keyed by the **actual A..L groups** in teams.research.json + 8 best-thirds (pts→GD→GF→seeded-lot) into the 8 third-slots with a **bounded** same-group-avoidance swap; derive third-slot eligibility from a cited source (header comment), don't hardcode from memory. `ROUND_SLOTS = {R32:32,R16:16,QF:8,SF:4,F:2}`.
- Restate exact math in code: `λ=clamp(base·exp(k·(sA−sB)+homeAdv·(hostA−hostB))·variance,0.15,6)`; ET `Poisson(λ·etBump)`; penalty `sigmoid(penaltyK·(sA−sB))`; `strength` uses `modelParams.eloCenter/eloScale`. **Host-edge rule:** apply `homeAdv` only to a host team **and only in group stage** (0 in knockouts) — stated approximation.
- Worker: SUM same-team strength mods → clamp [−1.5,2.5] → fold into table; match/round/global applied at sim time; **match `result.set` pins a scoreline and SKIPS Poisson** (Anchor path). Lot tiebreak draws from seeded PRNG.
- **`pChamp` is a DISTINCT tally** (Final winner) vs `pReach(F)`=2 finalists. Assert per team `R32≥R16≥QF≥SF≥F≥pChamp`.
- TS for `sim/*.ts`: erasable-only (no enum/namespace/param-props), `as const`/string-union Round names; **standardize the runner on `npx tsx`** (verify with a one-line smoke). Add a Node unit test of the worker entrypoint asserting §12 response shape + `seedTimelines.length==sampleTimelines`.
- Sanity as machine assertion: `argmax pChamp ∈ {ESP,FRA,ARG}` and each `>0.05`.
- **Divergence rail algorithm** in montecarlo.ts: reservoir of brackets keyed by champion; pick (1) modal favorite, (2) most-probable champion OUTSIDE top-4, (3) max edit-distance from #1. Gate: ≥2 distinct champions among the 3.

## P3 deltas
- **Deterministic keyword fallback FIRST** (primary tested path) for `whatif.py`; Granite layered with few-shot (exact enums + team codes), ask for wrapper `{modifiers:[...]}` (NOT bare array), strict Pydantic + normalization map + team-name→code resolver + ONE repair retry. The pinned demo sentence must yield a valid Modifier from the **fallback alone (Ollama off)**.
- `granite.py`: **NEVER `think:true`** (granite3.3:2b HTTP-errors); hardcode `think:false`; use `format:json` for JSON endpoints; trim leading preamble for narration.
- `narrate.py`: retriever runs and returns Facts **before** generation; `meta.citations`/`causes[].citation` populated from retriever **regardless of provider** (offline narrator cites too). SSE wire: `event:token\ndata {delta}\n\n` … `event:meta\ndata {headline,voice,causes,citations}\n\n`; httpx `AsyncClient.stream`; headers `Cache-Control:no-cache`, `X-Accel-Buffering:no`.
- Embeddings: use Ollama **`/api/embed`** (batchable), L2-normalize at write; store unit-norm rows; dim 768. FastAPI **lifespan warm-up** (1-token chat + tiny embed, `keep_alive:30m`). Mount `/api/*` (router prefix `/api`) **before** StaticFiles SPA catch-all (exclude `/api`). `health()` returns all four fields. Lazy-import watsonx only if `WATSONX_*`; unit-test the selector (Ollama-up→ollama; Ollama-down→template).
- **Hard gate:** narrate streams tokens + ≥1 citation whose `source` ends in a real `*.md`, **with Ollama OFF**.

## P4 deltas
- Build **`web/src/state/debug.ts`** NOW (full `window.__multiverse` contract + canonical `data-testid` list) — P4/P5/P6 gates assert against it. `ready=true` only after first worker result; every result writes `championSum/leaderboard/simCount` synchronously + bumps a monotonic `generation` the e2e polls.
- Worker: `new Worker(new URL('./worker.ts',import.meta.url),{type:'module'})` (NOT `?worker`). Instancing: pre-allocate max instances, `setMatrixAt`+`instanceMatrix.needsUpdate`, `frustumCulled=false`, additive Points `AdditiveBlending`+`depthWrite=false`; pillar height = update instance scale-Y, never recreate geometry.
- P4 gate runs the **full `npm run build`** (tsc -b + vite build), re-checked at end of P6 and P8.

## P4.5 · Thinnest vertical slice (NEW — first recordable demo before breadth)
Thread ONE team / ONE fixture / ONE citation end-to-end: minimal Injury card-drop, hard-coded dive to the pinned demo fixture, minimal StoryPanel streaming `/api/narrate` with one citation chip; a minimal on-rails cold-open (globe+arcs+zoom, skip button + reduced-motion) regardless of the rich duel; `scripts/run.ps1` (+`dev.*`) and a README stub with all 7 headers. **Target: video Beats 1+2+3 capturable here.**

## P5 deltas
- Specify the ripple: expanding additive ring from the target nation, pillar heights tweened ~700ms, leaderboard FLIP reorder with colored deltas. Non-numeric gate: `window.__multiverse.lastShockwaveAt` + assert pillars mid-tween shortly after drop.
- 2pp robust to MC noise: assert pChamp decreases by `>2·stderr` (or use a larger modifier), not a brittle hard 2pp. Pin demo free-text sentence into the fallback map; show modifier-pending UI. Wire minimal Anchor UI + commit sample `data/raw/actuals.json`.

## P6 deltas (split, de-risk)
- **P6a CameraRig** via drei `CameraControls.setLookAt(...,true)` (built-in easing + completion promise); disable user input during on-rails, re-enable on resolve; `cameraWaypoint` per arrival; reduced-motion → `setLookAt(...,false)` instant. Gate: intermediate camera positions are continuous (not teleport).
- **P6b Stadium duel**; gate: instanced-point positions change frame-to-frame, scrubber advances. **MVP gate = eased rig + fly globe→stadium on fixture-click with correct teams/scoreline.** On-rails space-arcs-dive + advance/clash = **degradable stretch** (MVP cold-open = the P4.5 flythrough). Don't silently drop the rig.

## P8/P10 deltas
- Split perf: FPS sampler + named quality tiers; expose `quality`+`particleCount` on `__multiverse`; safe InstancedBufferAttribute realloc. Confirm sim-N auto-drop fires (assert in P2 calibration). 
- e2e PRIMARY assertions are **logic+DOM** (invariants, testids, citation text) — no pixels needed; `?headless=1` skips bloom. A separate **headed/SwiftShader screenshot pass** captures globe-with-bloom, intervene-shockwave mid-frame, stadium duel → written into `docs/verification.md` as REQUIRED gate evidence. Logic-level cold-open gate (waypoint progression) so skip isn't the only proof.

## P9 deltas
- **Langflow:** decide Docker reachability up front. If unreachable: author flow JSON against the documented schema, label `authored-offline, import-tested-on-env` in `langflow/README.md`, do NOT claim "shown running"; downgrade README framing honestly.
- **Context Forge:** `contextforge/gateway.json` references the actual retriever tool (name/description/input-schema for `retrieve(query)->Fact[]`, transport, server name); `contextforge/README.md` maps config→code line-by-line. Gate: non-empty schema-valid JSON + mapping.
- **README** = literal 7-section checklist; enumerate the **four approximations** (independent Poisson not Dixon-Coles; tie-break GD/GF/lot omits H2H; rank-order thirds+swap not FIFA exact table; omitted 3rd-place playoff). Run-instructions match `scripts/run.ps1` exactly. **`LICENSE`** (MIT) at root + provenance note (Elo/draw aggregated from cited public sources, non-commercial demo; dossier prose original).
- **Multiverse Feed UI** (`MultiverseFeed.tsx` + Spotlight consuming `/api/feed`) — build it, or explicitly mark stretch. Citation chip renders `label` and links via `id/source`.

## P10/P11 · Deliverables (NEW gates)
- **3-minute video** is a REQUIRED artifact (per submission rules). Script the on-rails capture the e2e drives; at minimum produce captured screenshots/GIFs storyboard as fallback; link at top of README.
- **Fresh-clone gate = a REAL `git clone` into a tmp path then run** (catches .gitignore mistakes + uncommitted `data/kb/*`). 
- **GitHub auth:** resolve up front; if no auth, emit a loud unmissable `PUBLIC-REPO-NOT-CREATED — MANUAL STEP REQUIRED` in final output rather than silently passing.
