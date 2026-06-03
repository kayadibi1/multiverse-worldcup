# MULTIVERSE — Design Spec (v2)
**A World Cup 2026 Oracle: an explorable counterfactual multiverse.**
IBM SkillsBuild AI Builders Challenge · June (FIFA World Cup) track.

> v2 incorporates a 7-agent adversarial review (2 challenge-fit + 4 technical passes + synthesis). Every contradiction, undefined object, and format gap from that review is resolved here. This document is the buildable source of truth.

---

## 1. Problem & why it matters

Every World Cup spawns a billion arguments — *"What if Brazil's playmaker hadn't pulled up? What if that group had broken differently?"* Fans get a **single** prediction (one bracket, one favorite) with no *why* and no way to interrogate it.

**MULTIVERSE** simulates the entire 48-team tournament thousands of times, renders the space of futures as a living 3D world, lets you **inject what-ifs** and watch probabilities ripple, and uses IBM Granite to **narrate** any timeline — grounded in real data via Docling-ingested facts. It is unmistakably about WC 2026 (real 48 teams, real group draw, North-American hosts) and **anchorable to live results** during the judging window.

---

## 2. The idea in one line

> Not a predictor — a **counterfactual engine** you can fly through, perturb, and ask "why?".

Three verbs: **Explore** · **Intervene** · **Narrate**.

---

## 3. Goals / non-goals

**Goals:** one continuous cinematic world (planet → single match, no page loads); a real visible Monte-Carlo engine; instant what-if re-runs; grounded Granite narration; every IBM tool with a real job; a self-contained public repo a judge can clone and run.

**Non-goals:** not a betting product; not player-level match physics (matches resolve statistically); not multi-user.

---

## 4. Win-condition mapping (rubric → verifiable evidence)

Every claim points to a §13 acceptance checkbox or a committed artifact. (Persuasion copy lives in the README/pitch, not here.)

| Criterion | Evidence in this build |
|---|---|
| **Innovation** | Counterfactual *multiverse* shown at rest as a fan of futures (not one %); teams as colliding **formation-constellations**; what-if ripple. → §5, §6, §13. |
| **Technical Execution** | GPU particles (Three.js), Web-Worker Monte-Carlo (10k full tournaments), 4-tier architecture, real Granite inference, real Docling ingestion, embedding+BM25 RAG. → §7–§12. |
| **Challenge Fit** | Real WC 2026 format (12 groups, 8 best thirds, R32) + real draw/data + **live-result anchoring** (§6, §8b, §11b). |
| **Implementation & Feasibility** | LLM out of the hot loop; client-side sims; graceful fallbacks; machine-verifiable acceptance; MVP/stretch tiers. → §13, §15. |
| **Best Use of Technology** | **Two deep** (Granite reasons+narrates; Docling ingests visible citations) + **two supporting** (Langflow flow artifacts; Context Forge MCP-gateway config) — framed honestly in the README. → §9. |

**Video beat-sheet (acceptance, not post-hoc).** Each beat maps to an MVP checkbox; total ≤ 3:00.
1. **0:00–0:08** Cold open (8s, skippable): space → arcs converge on hosts → dive → formation-duel. [§13: cold-open]
2. **0:08–0:30** Land on the Oracle Globe; drag a **structured** "Injury" card → globe shockwave → leaderboard reorders (no LLM in this path, so the wow never waits). [§13: intervene]
3. **0:30–0:55** Dive into the upset fixture; formation-duel; Granite story streams with a **citation chip** traceable to a Docling-ingested fact by ~0:45. [§13: narrate+citation]
4. **0:55–1:40** Type a **free-text** what-if → Granite parses to modifiers → multiverse re-runs (the "AI actually reasoning" moment). [§13: freetext-whatif]
5. **1:40–2:20** "3 wildly different timelines" rail; Compare A/B (stretch) or anchor a real result. [§13: futures-at-rest]
6. **2:20–3:00** Architecture + IBM-tool honesty card; "fork it, clone runs in 2 commands."

---

## 5. UX — the layers

One continuous zoomable world. Persistent HUD: round scrubber, **sims-N counter**, ⟳ re-run, active what-ifs. Overlays summonable at any altitude.

**Cold open (≈8s, on-rails, skippable, respects `prefers-reduced-motion`):** space → Earth → 48 nations light → arcs converge on hosts → dive through stadium roof → two formation-constellations collide. Resolves to MACRO.

**MACRO — Oracle Globe (home):** glowing **probability pillars** per nation (height = P(win)). **Counterfactual-at-rest signal (required):** a persistent "**N timelines simulated — here are 3 wildly different ones**" rail showing three sampled champions/paths, so the home state reads as a *space of futures*, not a single prediction. Left: Contenders leaderboard (P + ▲▼ trend = `new.pChamp − old.pChamp`). Right: Granite Multiverse Feed + grounded Spotlight. Bottom: What-If dock.

**MESO — Bracket/Region (stretch):** a nation's path; probability rivers. May reduce to a fast camera pass in MVP.

**MICRO — Stadium:** two XIs as light-constellations advancing/clashing; odds bar; momentum scrubber (goal markers, replay); **Granite Story** panel (headline, body, **causal evidence chips** linking to KB facts + sim deltas, voice switch, regenerate, audio narrate).

---

## 6. Signature interactions

1. **Explore** — drag-rotate / scroll-zoom; click nation → region; click fixture → stadium. Shared 3D scene graph, eased camera rig.
2. **Intervene** — drag a card (Injury / Red card / Force result / Form± / Host edge / Weather) onto a team/match (structured → instant), OR type free text (Granite → modifiers, applied async). The worker re-runs; leaderboard deltas animate; globe shockwave. See §6b for exact math.
3. **Narrate** — selecting a timeline/fixture streams a grounded Granite story (Context-Forge-retrieved facts as citations).
4. **Anchor (live)** — "Set actual result" pins a real completed fixture (a `match`-scoped Force-result modifier) and re-runs the *remaining* multiverse conditioned on reality. This is the timeliness story; the mechanism is MVP, a live auto-feed is stretch.

### 6b. Modifier taxonomy & application math

```ts
interface Modifier {
  id: string
  scope: 'team' | 'match' | 'round' | 'global'
  target: string            // team code | matchId | round name | '*'
  field: 'strength' | 'homeAdv' | 'result' | 'variance'
  op: 'add' | 'mul' | 'set'
  value: number | { a: number; b: number }  // 'result' uses a scoreline
  label: string             // human text for the chip
}
```
| Card | scope | field/op/value | applied |
|---|---|---|---|
| Injury (key player) | team | strength · add · −0.10·importance | to team strength before sims |
| Red card | match | strength · add · −0.20 (that team, that match) | during the pinned match |
| Force result / Anchor | match | result · set · `{a,b}` | match outcome pinned, goals fixed |
| Form surge ± | team | strength · add · ±0.10 | to team strength |
| Host edge | global | homeAdv · add · +0.10 | to model param |
| Weather (knockouts) | round | variance · mul · 1.4 | widens goal variance / compresses favoritism that round |
**Stacking:** team-scoped modifiers on the same team **sum**, then `strength` is clamped to `[−1.5, 2.5]`. The Strength Table is therefore **ratings + a typed modifier list** (not ratings-only): team mods fold into the served table; match/round/global mods are applied inside the worker at simulation time.

---

## 7. Architecture (4 tiers)

```
CLIENT     React + r3f/Three.js · GPU particles · Monte-Carlo Web Worker · zustand
   ↑ HTTP/SSE ↓
API+ORCH   FastAPI (/ratings /intervene /narrate /feed /health /anchor) · Langflow flow artifacts
   ↕
AI         IBM Granite (Ollama granite3.3:2b) · Context Forge (MCP gateway) → local retriever (embeddings+BM25)
   ↕
DATA       Docling ingestion → KB (structured + facts + embeddings) · seed teams.research.json · (opt) live results
```

**Bridge artifact — the Strength Table** (served by `/api/ratings`). One canonical schema (= the §10 Team object plus `modifiers`):
```json
{
  "format": { "groups": 12, "perGroup": 4, "thirdsAdvancing": 8, "homeAdv": 0.25 },
  "modelParams": { "base": 1.30, "k": 0.55, "homeAdv": 0.25, "etBump": 0.30, "penaltyK": 0.60, "eloCenter": 1800, "eloScale": 200 },
  "teams": [
    { "code": "BRA", "name": "Brazil", "confederation": "CONMEBOL", "group": "F",
      "elo": 1988, "isHost": false,
      "keyPlayers": [{ "name": "Vinícius Júnior", "role": "FW", "importance": 1.0 }],
      "style": "high-tempo attacking", "blurb": "five-time champions...",
      "modifiers": [] }
  ],
  "groups": { "A": ["MEX","..."], "...": [], "L": ["..."] }
}
```
The worker derives strength `s = (elo − eloCenter)/eloScale` and simulates *from* the table, so one rating change ripples through every matchup. (Single scalar `strength` replaces the earlier ambiguous attack/defense pair.)

---

## 8. Simulation model (concrete & reproducible)

**Strength:** `s_i = (elo_i − 1800) / 200`.
**Match (independent Poisson goals model — *not* Dixon-Coles; no low-score correlation term, stated deliberately):**
- `λ_A = clamp(base · exp(k·(s_A − s_B) + homeAdv·(host_A − host_B)) · variance, 0.15, 6)`, symmetric for B.
- Defaults: `base=1.30, k=0.55, homeAdv=0.25, variance=1.0` (Weather sets variance=1.4 for the round).
- Goals `g ~ Poisson(λ)` via Knuth's algorithm, drawing from the seeded PRNG.

**Group stage:** round-robin, 3/1/0. Tie-break: **pts → GD → GF → seeded lot**. *Official FIFA head-to-head criteria are intentionally simplified to GD/GF/lot — documented as a known deviation in §14 and the README.*

**Knockout:** if level after 90', extra time = each team draws `Poisson(λ·etBump)` more goals; if still level, penalties: `P(A) = sigmoid(penaltyK·(s_A − s_B))`, resolved by one PRNG draw.

**PRNG:** `mulberry32`, seeded per simulation as `subseed = hash(masterSeed, simIndex)`. **No `Math.random` in the hot loop** — Compare A/B reproducibility depends on this.

**Monte-Carlo:** N=10,000 full tournaments. Tally per team: champion count and reach-count per round → probabilities. Persist a small set of **seed timelines** (specific seeds' full brackets, incl. ≥3 deliberately divergent ones for the "wildly different" rail) for narration/replay.

**Matches per sim:** 72 group + 31 knockout (R32 16 + R16 8 + QF 4 + SF 2 + Final 1) = **103** counted for stats (third-place playoff omitted — irrelevant to champion/reach probabilities; noted). ⇒ ~1.03M match samples per 10k run.

**Performance:** treated as a **measured benchmark, not an assertion**. Target: 10k in < 1.5s in a Worker on the dev machine. **Graceful degradation:** a calibration run on boot measures per-sim cost; if projected 10k exceeds 1.5s, N auto-drops (10k → 5k → 2.5k) and the on-screen **"sims: N"** counter reflects the real number — results stay honest.

### 8b. Qualification & bracket seeding (the hard part, pinned)

- **Advancement:** top 2 of each of 12 groups (24) + **8 best third-placed** of 12.
- **Best-thirds comparator:** rank all 12 third-placed teams by **pts → GD → GF → seeded lot**; take the top 8.
- **R32 bracket:** a **fixed 32-slot map** encodes the official 2026 layout (`W_A`, `RU_B`, … and 8 designated *third-slots*). Group winners/runners-up fill their fixed slots. The 8 qualified thirds are assigned to the 8 third-slots **in rank order**, with a **same-group-avoidance swap** (if an assignment would create a same-group R32 pairing, swap with the next third). This is a faithful **documented approximation** of FIFA's official thirds-combination lookup table (exact combinatorial table not fully replicated) — stated in §14 and the README.
- Knockout proceeds by the fixed bracket tree to the Final.

---

## 9. IBM tools (two deep, two supporting — honest)

- **Granite `granite3.3:2b` (Ollama) — DEEP.** (a) **free-text what-if → structured `Modifier[]`** (the one place AI changes the simulation — *in MVP*); (b) timeline narration in selectable voices, returning **structured causes** (each cause cites a KB fact id) rendered as evidence chips; (c) Multiverse-Feed headlines. Thinking-mode output is suppressed/stripped. Provider chain: **Ollama (verified primary)** → watsonx (only if `WATSONX_*` env present) → deterministic template narrator (always-on offline guarantee). `/api/health` reports the active provider (`ollama` in the demo). Granite is **never** in the 10k-sim loop.
- **Docling — DEEP & VISIBLE.** Offline ingestion of team-dossier docs (markdown/HTML primary — fast, no model download; PDF supported) → structured facts. The chain **Docling → KB → Granite citation chip** is shown on screen (an extracted dossier fact appears as a citation in a narrative). `pypdf` is emergency-only fallback behind the same interface; identical KB output. (Verified: docling 2.97 + docling-ibm-models import on Python 3.14; markdown convert = 0.0s, offline.)
- **Langflow — SUPPORTING.** The Ratings→StrengthTable and Narrative pipelines authored as importable **flow JSON** in `/langflow` (authored in a 3.11/3.12 venv or the langflowai Docker image — Langflow does **not** pip-install on Python 3.14). Runtime is FastAPI-only and never imports langflow; the README documents the 1:1 mapping. The flow is shown running once in the video.
- **Context Forge — SUPPORTING.** It is an **MCP gateway/proxy**, not a retriever. `/contextforge` holds the gateway config exposing our KB-retrieval tool over MCP. In the demo, FastAPI calls the retriever **directly** (gateway optional), framed honestly like the Langflow mirroring.

**Retriever (Context-Forge-fronted):** real **embedding RAG via Ollama `nomic-embed-text`** (already local — called over the Ollama HTTP API, no extra Python ML dep), cosine top-k with **numpy**; **BM25 (`rank-bm25`) fallback** when Ollama embeddings are unavailable. Ingestion commits both the BM25 index and `embeddings.npy` so a fresh clone has working retrieval offline.

---

## 10. Data & schema

- **Seed:** `data/raw/teams.research.json` — the real 48 teams, final group draw (held 2025-12-05), confederation allocation (UEFA 16 / CAF 10 / AFC 9 / CONMEBOL 6 / CONCACAF 6 / OFC 1), **Elo** (World Football Elo, snapshot **2026-06-01**) and FIFA rank (April 2026). Every team rating traces to this cited source. (Provenance also recorded in README.)
- **Source docs:** `data/raw/dossier_*.md` (team dossiers) for Docling.
- **KB (committed):** `data/kb/teams.json` (structured Strength Table), `data/kb/facts.jsonl` (retrievable snippets), `data/kb/bm25.json` + `data/kb/embeddings.npy` (indexes).
- **Team schema:** see §7 example. **Fact/citation schema:** `{ id, teams:[code], text, source, label }` (e.g. `{id:"h2h-bra-nga", text:"BRA–NGA last met 1–1", source:"dossier_brazil.md", label:"H2H 1–1"}`).

---

## 11. Visual / technical design

- **Render:** Three.js + r3f. Globe = sphere + grid + additive instanced-Points atmosphere. Pillars = instanced bars. Stadium = pitch mesh + two formation constellations (instanced points) with advance/clash. Bloom. Dark-navy palette, amber/cyan/green accents.
- **Camera rig:** one rig interpolating named waypoints (space, globe, region, stadium) with eased tweens → the continuous world.
- **GPU draws, Worker computes** — never the reverse.
- **Perf/a11y:** particle-count auto-step-down; quality toggle; `prefers-reduced-motion` skips the cold open; skip button always present.

### 11b. Live anchoring (timeliness)
`data/raw/actuals.json` (optional, hand- or feed-populated) lists completed fixtures `{matchId, a, b, ga, gb}`. `/api/anchor` converts them to `match`-scope Force-result modifiers; the worker pins those fixtures and simulates the rest. Demonstrated with a sample in MVP; a live source connector is stretch.

---

## 12. API & contracts (FastAPI)

- `GET /api/ratings` → `{ teams: Team[], modelParams, format, groups }` (modelParams cached client-side so Host-edge re-runs locally).
- `POST /api/intervene` `{ text }` → `{ modifiers: Modifier[], explanation }`. **Does NOT compute probabilities.** Structured cards skip this endpoint entirely; free-text calls it (Granite) and applies the returned modifiers async (UI shows pending; sims re-run on arrival).
- `POST /api/narrate` `{ kind:"fixture"|"timeline", payload }` → **SSE**: `event:token {delta}` … then `event:meta {headline, voice, causes:[{text, citation}], citations:[Fact]}`. Payloads: fixture `{teamA,teamB,round,scoreline,seed}`, timeline `{seed}`. Budgets: first token < 3s, full < 20s (Ollama pre-warmed).
- `GET /api/feed` → `{ items:[{headline, blurb, citations:[Fact]}] }` (async/cached).
- `POST /api/anchor` `{ actuals:[{matchId,a,b,ga,gb}] }` → `{ modifiers: Modifier[] }`.
- `GET /api/health` → `{ graniteProvider, model, kbFacts, embeddings:boolean }`.

**Client ↔ Worker protocol:**
```ts
// request
{ type:'simulate', strengthTable: Team[], modelParams, modifiers: Modifier[], N: number, seed: number, sampleTimelines: number }
// response
{ type:'result', perTeam: Record<code,{pChamp:number, pReach:{R32,R16,QF,SF,F}}>,
  seedTimelines: Timeline[], elapsedMs: number, N: number }
```
All endpoints degrade gracefully (offline narrator, cached feed) so the UI never hard-fails.

---

## 13. Build tiers & acceptance (machine-verifiable where possible)

A debug hook `window.__multiverse = { ready, simCount, championSum, leaderboard:[{code,pChamp}], activeModifiers, cameraWaypoint }` and `data-testid` attributes (skip button, leaderboard rows, stadium canvas, intervene cards) make the below checkable by a headless driver.

**MVP (must verify):**
- [ ] Ingestion: Docling parses ≥1 real dossier → `data/kb` with `facts.jsonl` + BM25 index + (if Ollama) `embeddings.npy`. Committed to repo.
- [ ] `GET /api/ratings` returns 48 teams; worker runs N sims; **`championSum == 1.0 ± 1e-6`**; per round `Σ pReach(r) == slots(r)` (32/16/8/4/2); per team `pReach(R32) ≥ … ≥ pChamp`.
- [ ] Re-run after an intervention completes **< 1.5s** on the dev machine (or N auto-reduced with visible counter).
- [ ] Cold open plays, is skippable (`data-testid="skip-cold-open"`), respects reduced-motion.
- [ ] Structured what-if (Injury) re-runs sims and **drops the injured team's pChamp by ≥ 2pp** (asserted via `window.__multiverse`).
- [ ] **Free-text what-if** → Granite returns ≥1 valid Modifier → multiverse re-runs.
- [ ] Click a fixture → stadium with formation-duel + Granite-narrated story containing **≥1 citation chip traceable to a Docling fact** (real Granite if model present, else offline narrator still cites).
- [ ] Counterfactual-at-rest: MACRO shows the "3 wildly different timelines" rail by default.
- [ ] `GET /api/health` shows `graniteProvider:"ollama"` in the demo.
- [ ] **README.md** at repo root: Problem / AI Approach (per-IBM-tool role) / Why It Matters / Run instructions / **IBM-tool honesty section** (Langflow-mirroring, embeddings-via-Ollama-with-BM25-fallback, Docling primary, Context-Forge-is-a-gateway).
- [ ] **Fresh-clone runs** via documented steps / one `/scripts` command and reaches the globe with seeded ratings (Ollama optional — offline narrator covers absence). Committed seed KB makes the repo self-contained.
- [ ] Repo is **public** on GitHub.

**Stretch:** Compare A/B; live-results auto-feed; full MESO layer; streaming audio narration; richer formation animation.

---

## 14. Risks & mitigations (refreshed against the verified environment)

| Risk | Status / mitigation |
|---|---|
| Docling on Python 3.14 | **Resolved** — docling 2.97 + docling-ibm-models installed & import OK. Real risk = HF model download on first PDF convert + heavy torch stack → favor markdown/HTML dossiers (0.0s, offline); ingestion is a **one-time offline build** (`data/raw → data/kb`), so torch never ships in demo runtime. pypdf = emergency-only. Docling is **primary**. |
| Granite availability | **Resolved** — `granite3.3:2b` pulled, replied READY (thinking model → suppress/strip thinking). Residual: cold first-token latency → **pre-warm** Ollama before demo; offline narrator is the on-camera fallback. |
| Langflow install | Langflow does **not** pip-install on Python 3.14 → author flow JSON in a 3.11/3.12 venv or langflowai Docker; runtime is FastAPI-only (never imports langflow). |
| Context Forge framing | It's an MCP **gateway**, not a retriever → config artifact only; FastAPI calls the retriever directly in demo. Stated honestly. |
| Perf on weak GPU | Particle auto-step-down + quality toggle. |
| Sim correctness | Unit tests: single-match monotonicity (P(A>B) ↑ in s_A), Poisson mean sanity, format invariants (group sizes, exactly 8 thirds, 32 R32 slots), PRNG reproducibility, probability invariants (§15). |
| Format approximations | Best-thirds→slot assignment is rank-order + same-group swap (documented approximation of FIFA's table); group tie-break omits H2H (GD/GF/lot). Both stated in README. |
| Scope overrun | Strict MVP-first; each tier independently demoable. |

---

## 15. Verification plan

- **Unit (Python + TS):** match-model single-match monotonicity (directional, not tournament-level); Poisson mean ≈ λ; format: 12×4 groups, exactly 8 thirds selected, 32 R32 slots, no same-group R32 pairing after swap; PRNG: same seed → identical tournament; **probability invariants:** `Σ pChamp = 1 ± 1e-6`, `Σ_team pReach(r) = slots(r)` per round, per-team reach monotonic.
- **Integration:** each endpoint returns the contracted shape; `/api/intervene` returns valid `Modifier[]` and does not compute probabilities; `/api/narrate` SSE yields tokens then a `meta` with ≥1 citation.
- **End-to-end (headless browser — Playwright):** launch web+api; drive cold-open-skip → globe → structured intervene (assert injured team pChamp drops ≥2pp via `window.__multiverse`) → dive → narrate (assert a citation chip in DOM). **Console policy:** fail on uncaught exceptions / error-level logs **except** an allow-list of benign WebGL/r3f/postprocessing warnings. Headless WebGL: launch with ANGLE/SwiftShader (`--use-gl=angle --use-angle=swiftshader`); if the FBO/particle path can't render headless, e2e asserts **logic + DOM** and a separate manual screenshot covers visuals.
- **Definition of done:** every MVP checkbox green, captured with screenshots/logs in `docs/verification.md`; the decision journal current.
