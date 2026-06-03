# Verification — MULTIVERSE

Evidence that every MVP acceptance criterion (spec §13) is met. All automated checks are reproducible from the repo.

## Automated test suites

**Engine unit tests** (`web/src/sim/__tests__/run.ts`, run via `tsx`): **25/25 PASS.**
Covers: WC2026 format (12×4 groups, 32 R32 slots), single-match strength monotonicity, Poisson mean ≈ λ, **PRNG reproducibility** (same seed → identical results), and the probability invariants:
- `Σ P(champion) = 1 ± 1e-6`
- `Σ P(reach r) = {R32:32, R16:16, QF:8, SF:4, F:2}`
- per-team `R32 ≥ R16 ≥ QF ≥ SF ≥ F ≥ champion`
- divergence rail: 3 timelines, ≥2 distinct champions
- data sanity: leader ∈ {ESP, FRA, ARG}, each > 5%
Run: `web/node_modules/.bin/tsx web/src/sim/__tests__/run.ts`

**End-to-end browser tests** (`web/e2e/*.spec.ts`, Playwright + SwiftShader headless WebGL): **4/4 PASS** (~19s).
- `smoke` — globe boots headless, worker runs sims, `championSum = 1 ± 1e-6`, leaderboard + futures rail visible, no uncaught console errors, bloom off in headless.
- `intervene` — Injury on BRA **deterministically drops its P(champion)**, shockwave fires (`lastShockwaveAt`), modifier chip shows.
- `dive` — clicking a future flies the camera to the stadium (`cameraWaypoint === 'stadium'`), HUD shows, Back returns to globe.
- `narrate` — dive streams a **Granite story** whose **citation chip's source ends in a real `*.md` dossier** (Docling provenance).
Run: `cd web && npx playwright test`

**Backend endpoints** (curl, server on :8000):
- `GET /api/health` → `{"graniteProvider":"ollama","model":"granite3.3:2b","kbFacts":63,"embeddings":true}`
- `GET /api/ratings` → 48 teams, `k=0.22`, 12 groups
- `POST /api/intervene {"text":"Spain star striker is injured"}` → valid Granite `Modifier` (`op:add`, `target:ESP`)
- `POST /api/narrate` → SSE token stream then a `meta` event with citations sourced from `dossier_*.md`

## MVP acceptance checklist (spec §13)

| # | Criterion | Evidence |
|---|---|---|
| 1 | Docling ingests ≥1 dossier → committed KB (facts + BM25 + embeddings) | `data/kb/*` committed; ingest: `engine=docling facts=63 embeddings=yes(768d)` |
| 2 | 48 teams; sims run; `championSum=1±1e-6`; reach sums; reach monotonic | engine tests + `smoke` e2e |
| 3 | Re-run < 1.5s | 2000 sims = 47ms → 10k ≈ 235ms; headless 4000 sims = ~120ms (HUD counter) |
| 4 | Cold open plays, skippable, reduced-motion | `ColdOpen` + `skip-cold-open` testid |
| 5 | Structured what-if drops target P(champion) ≥ noise | `intervene` e2e (deterministic, same seed) |
| 6 | Free-text what-if → Granite → modifier → re-run | `/api/intervene` (Granite) + deterministic fallback verified |
| 7 | Dive → formation duel + Granite story + citation traceable to Docling | `narrate` e2e + `docs/shot-p7-story.png` |
| 8 | Counterfactual-at-rest: 3 divergent futures | divergence test + screenshots (ESP / BRA / CAN·CRO) |
| 9 | `/api/health` shows `graniteProvider: ollama` | curl above |
| 10 | README with 7 sections + IBM honesty | `README.md` |
| 11 | Fresh clone runs to the globe (Ollama optional) | fresh-clone test (below) |
| 12 | Repo is public | ✅ https://github.com/kayadibi1/multiverse-worldcup |

## Fresh-clone test — PASS ✅
A clean `git clone` into a separate directory (committed files only) was built (`npm run build` ✓) and served on port 8001 with the same interpreter; a headless check reached the globe: `GET /api/health` → `ollama` + 63 KB facts + embeddings, and `window.__multiverse` → `ready=true, championSum=1.0000, simN=4000, bloom=false`. Confirms the repo is self-contained (committed `data/kb/` + all sources; only env deps installed).

## Screenshots
- `docs/shot-p4-globe.png` — Oracle Globe + probability pillars + leaderboard + futures rail
- `docs/shot-p5-intervene.png` — what-if dock, active chips, trend arrows (BRA ▼)
- `docs/shot-p6-stadium.png` — formation-constellation duel on the pitch
- `docs/shot-p7-story.png` — Granite story streaming + Docling citation chips

## Known limitations
- No dynamic FPS step-down (static headless particle reduction only); fine on a normal GPU at 6k particles.
- Pillars at the globe's limb can visually overlap (geographic clustering of strong European sides).
- Free-text Force-result orientation is best-effort; structured cards are exact.
