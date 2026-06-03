# Decision Journal — MULTIVERSE (A World Cup 2026 Oracle)

> A running log of **why** each significant decision was made and **how it impacts the project** — technically and creatively. Maintained autonomously during the build. Newest entries appended at the bottom of each section.

---

## 0 · The mandate & method

**Decision:** Execute a fully autonomous pipeline: spec → (2 challenge-fit + 4 technical review passes) → implementation plan → (5 + 5 review passes) → end-to-end implementation → exhaustive verification, with no user prompts until done.

**Why:** The user explicitly requested maximum rigor and creativity under an "ultracode" mandate, framing it as win-or-lose for the IBM SkillsBuild AI Builders Challenge (June / FIFA World Cup theme).

**Impact:** Review passes are run as *parallel adversarial subagent workflows* (independent perspectives beat me re-reading my own work). Durable state (spec, plan, journal, code) lives on disk so progress survives context summarization across the long run.

---

## 1 · Environment recon → constraints that shaped the stack

**Findings:** Windows 11 / MINGW; Node 24.14 + npm 11; **Python 3.14** (only); git; Docker; **Ollama installed** (not running); no GitHub auth assumed.

**Decisions & why:**
- **Granite runs locally via Ollama.** Ollama being present means we can demonstrate *real* IBM Granite inference (not a stub) with zero cloud credentials. Creative impact: the narration ("How Nigeria stunned Brazil") is genuinely AI-authored. Technical impact: removes the single biggest external dependency/risk.
- **Python 3.14 is bleeding-edge** → Docling (which pulls heavy ML wheels: torch et al.) may not have 3.14 wheels yet. **Mitigation:** attempt the real Docling install in an isolated step; if it fails, fall back to a lightweight parser (pypdf) behind the *same* ingestion interface, so the Docling code path is real and swappable. We never fake the *output* (structured KB) — only the parser engine may differ. Documented transparently.
- **Provider abstraction for the LLM**: `ollama` (local Granite) → `watsonx` (if creds) → deterministic offline narrator. Guarantees the app *always works* in a demo, which is the verification bar the user set.

---

## 2 · Stack selection

**Frontend:** Vite + React + TypeScript + three + @react-three/fiber + @react-three/drei + zustand.
**Why:** r3f gives React state for UI/HUD while Three handles the 3D globe/stadium/particles — highest wow ceiling with manageable code. zustand keeps cross-layer state (current altitude, active what-ifs, selected fixture) simple. Vite = fast dev + trivial static build for submission.

**Backend:** Python FastAPI + uvicorn.
**Why:** The IBM tools (Docling, Langflow) are Python-native, so a Python API server keeps the AI tier in one language. FastAPI installs cleanly on 3.14 (no native-wheel risk like torch).

**Simulation:** Monte-Carlo runs **client-side in a Web Worker** (TypeScript), sampling a Probability Matrix served by the backend.
**Why:** A 48-team bracket × 10k runs is cheap math; doing it client-side makes every what-if re-run *instant* with no round-trip — the core interactive wow. Keeps the LLM out of the hot loop.

---

## 3 · IBM tool integration strategy (each gets a real, defensible job)

- **Granite** — match-probability adjustment + natural-language what-if parsing + timeline narration. Real inference via Ollama.
- **Docling** — offline ingestion of football PDFs/reports → structured KB (with pypdf fallback if 3.14 blocks it).
- **Langflow** — the Ratings→Matrix and Narrative pipelines authored as importable flow JSON; equivalent orchestration mirrored in Python so the app runs without the Langflow server. (Honest framing in README.)
- **Context Forge** — MCP-gateway config + a lightweight local retriever (BM25/TF-IDF over the KB) that grounds Granite's narratives with citations. Avoids multi-GB embedding model downloads while still being real RAG.

**Why this split:** Judges score "effective use of IBM technologies" and "feasibility." Using each tool where it genuinely adds value — and being transparent where a heavyweight service is represented by an artifact + mirrored logic — is stronger and more honest than a hollow checkbox integration.

---

## 4 · Naming / brand

**Decision:** Product wordmark **"MULTIVERSE"**, descriptor *"A World Cup 2026 Oracle."* Repo: `multiverse-worldcup`.
**Why:** Matches the concept locked in brainstorming and the wireframes; "Oracle" signals the predictive/counterfactual core without overclaiming. Creative impact: a single strong word that works on a title card and in a 3-minute video.

---

## 5 · Build-tier strategy

**Decision:** Build the MVP tier to a *verified-working* state first (Docling→KB, Probability Matrix, client Monte-Carlo, Oracle Globe + Stadium formation-duel, structured what-ifs, Granite narration), then layer stretch items (free-text what-ifs, Compare A/B, live anchoring) as time allows — verifying after each.
**Why:** The user's bar is "everything works." A working vertical slice that covers the whole system beats a broad but broken build. Each tier is independently demoable for the video.

---

## 6 · Python 3.14 dependency resolution (a real, instructive snag)

**Symptom:** pinned `pydantic==2.10.4` failed to install — its `pydantic-core` builds via PyO3 0.22, which refuses Python 3.14 ("interpreter newer than PyO3's max supported 3.13"). numpy 2.2.1 *did* build from source.

**Decision:** Unpin the backend deps to latest and drop `uvicorn[standard]`. Result: pip pulled prebuilt **cp314** wheels (`pydantic-core-2.46.4-cp314`, `fastapi 0.136.3`, `numpy 2.4.6`, `uvicorn 0.48.0`) — zero native builds.

**Why it matters:** On a bleeding-edge interpreter, *unpinning to latest* is safer than pinning to known-good-old, because only the newest releases ship wheels for the new ABI. Pinning would have forced fragile source builds. Logged as a lesson: prefer wheels over pins on new Python.

**Granite confirmed working** via `granite3.3:2b` (replied "READY"). It's a *thinking* model, so the provider will call the Ollama HTTP API with thinking suppressed and strip any reasoning trace for clean narration.

**Docling:** ✅ **the real install succeeded on Python 3.14** — `docling 2.97`, `docling-ibm-models 3.13`, `torch 2.12`, `transformers 5.10`, and `DocumentConverter` imports cleanly. So Docling is the **primary** ingestion engine (genuine IBM document AI), with `pypdf` demoted to emergency-only fallback. Creative/technical impact: the "Best Use of Technology" claim is now backed by real IBM Granite *and* real IBM Docling models running locally — not stubs. (Note for build: Docling's PDF layout models download from HuggingFace on first conversion; ingestion will favor lightweight document types and/or pre-warm to stay demo-safe.)

---

## 7 · Spec review (7-agent adversarial pass) outcome & the decisions it forced

A workflow ran 2 challenge-fit + 4 technical review passes + synthesis (48 raw findings, 9 must-fix). Verdict: "REVISE — strong concept, not yet a buildable source of truth." Applied all must-fixes into spec **v2**. The decisions worth recording:

- **RAG: embeddings via Ollama `nomic-embed-text`, BM25 fallback** — the review (correctly, given the shipped deps) flagged an "embedding RAG" claim with no embedding library installed, and recommended going BM25-only. I went **further/better**: `nomic-embed-text` is *already* in Ollama, so I call it over the Ollama HTTP API (httpx, no new Python ML dep) for *real* vector retrieval, with `rank-bm25` as the offline fallback. Both indexes are committed so a fresh clone has working retrieval. *Impact:* keeps genuine semantic grounding without the multi-GB download the journal originally rejected — resolves the contradiction by making both the spec and deps consistent.
- **Single `strength` scalar from `elo`** (not an undefined attack/defense pair): `s=(elo−1800)/200`. *Impact:* removes a load-bearing-but-undefined term; the whole match model, penalty sigmoid, and modifiers now reference one well-defined quantity, so two implementers reproduce identical probabilities.
- **Pinned match-model numbers + `mulberry32` PRNG, no `Math.random` in the hot loop.** Renamed the model from "Dixon-Coles-lite" to honest "independent Poisson goals model" (the low-score correlation term is absent). *Impact:* reproducibility — the precondition for Compare A/B — and intellectual honesty a technical judge will respect.
- **Format correctness:** added the 8-best-thirds comparator (pts→GD→GF→seeded lot) and a fixed R32 slot map with a same-group-avoidance swap, explicitly **documented as an approximation** of FIFA's official thirds-combination table. *Impact:* the tournament loop and format tests are now writable; honesty about the approximation pre-empts a "that's not the real bracket" ding.
- **Corrected the hot-loop constant 64 → 103 matches/sim** and reframed the 1.5s budget as a *measured benchmark with N auto-reduction* + a visible "sims: N" counter. *Impact:* the signature performance claim is now empirical and self-correcting, not a fragile assertion.
- **Promoted two things into MVP for win-impact:** (1) **free-text what-if → Granite → modifiers** (the one moment "AI actually reasons" and changes the sim — the demo's differentiator); (2) the **live-result anchor mechanism** (it's just the Force-result modifier on real fixtures — the strongest Challenge-Fit/timeliness lever). *Impact:* moves Granite from "writes flavor text" (commodity) to load-bearing, and makes the timeliness pitch real rather than aspirational.
- **IBM story reframed "two deep, two supporting" and made honest + visible:** Granite (reasons+narrates) and Docling (ingests a dossier whose fact appears on-screen as a citation chip) are deep; Langflow (flow JSON, can't pip on 3.14 → authored in 3.11/Docker) and Context Forge (an MCP *gateway*, not a retriever) are supporting, stated plainly. *Impact:* "Best Use of Technology" rests on verifiable, real integrations rather than four hedged checkboxes — and the honesty itself reads as senior engineering.
- **Counterfactual-at-rest signal** (a "3 wildly different timelines" rail on the home screen) so the product doesn't look like every other P(win) dashboard before you touch it. *Impact:* defends the "not a predictor" identity visually, which is the core Innovation claim.
- **Machine-verifiable acceptance:** `window.__multiverse` debug state + `data-testid` hooks + hard invariants (`Σ pChamp = 1 ± 1e-6`, reach monotonicity, injured-team pChamp drop ≥ 2pp). *Impact:* "everything works" becomes something a headless driver can *prove*, satisfying the user's verification bar.
- **README promoted to a hard, tracked deliverable** (it's a submission requirement and didn't exist). The IBM-tool honesty section lives there, where judges read it.

---

## 8 · Plan review (11-agent, 5+5 passes) outcome & the decisions it forced

81 findings → ~30 issues; verdict "REVISE — sound plan, ~12 load-bearing gaps that would silently fail an autonomous headless-verified build." Several were *live-verified by the reviewers*, which is why they're trustworthy. Folded all 14 must-fixes into the plan as binding directives. The decisions worth recording:

- **Added a P0 hardening phase (run first).** Pin `@react-three/postprocessing@^2.16` + `postprocessing@^6.36` — **v3 silently black-screens on our installed r3f v8/three 0.171** (caught before it cost a day). Install Playwright+Chromium and `tsx` up front; split `requirements-ingest.txt` (docling/pypdf/torch) from runtime `requirements.txt` so a fresh clone's *runtime* never needs torch. Prove the headless WebGL path (SwiftShader) with a smoke spec BEFORE building UI, plus a `?headless=1` quality flag that disables bloom so the GL context stays valid in CI. *Impact:* the single biggest source of "works on my machine, dies in headless verification" is eliminated on day one.
- **The `importance` NaN bug.** Reviewers verified **0 of 48 teams carry `keyPlayers[].importance`**, so the Injury modifier would compute `−0.10 × undefined = NaN`, poison `championSum`, and fail the core invariant. `data.py` now synthesizes it (1.0 / 0.7). *Impact:* prevented the flagship interaction from silently breaking the whole probability model.
- **Granite reality, not assumption.** Live-tested: `granite3.3:2b` HTTP-errors on `think:true`, and `format:json` emits a single object with *invented* keys, not a valid `Modifier[]`. So: **deterministic keyword fallback is the PRIMARY tested path**; Granite is layered with few-shot + a `{modifiers:[...]}` wrapper + strict Pydantic + normalization + one repair retry. *Impact:* the "AI reasons" demo beat works **even with Ollama off**, and Granite genuinely upgrades it when on — robustness over fragility.
- **Every proof decoupled from the LLM and from bloom.** Citations come from the retriever *before* generation (offline narrator cites too); e2e primary assertions are logic+DOM (no pixels); a separate headed SwiftShader pass captures screenshots as required evidence. *Impact:* "everything works" is provable in a headless box regardless of GPU/LLM availability.
- **Shipped the missing engine data as reviewed constants:** `bracket2026.ts` (literal R32 slot map derived from a cited source, not memory; bounded same-group swap) and pinned exact match math + `mulberry32` lot draws. The **divergence algorithm** for the "3 wildly different timelines" rail (reservoir keyed by champion; favorite + dark-horse + max-edit-distance) — naive sampling would show the favorite 3× and *kill* the counterfactual identity. *Impact:* correctness + the Innovation signal both become testable.
- **Added P4.5 — a thinnest vertical slice** (one team, one fixture, one citation, minimal cold-open) so the **first recordable demo exists early** instead of being back-loaded into the riskiest final phases. *Impact:* protects the video deliverable against any late-phase stall — there's always something compelling to capture.
- **Added the two REQUIRED deliverables the plan forgot:** the **3-minute video** (a red gate, scripted from the e2e path) and a **LICENSE** (a public repo with none is all-rights-reserved, contradicting "fork it"). Fresh-clone gate is now a *real* `git clone` to tmp, and GitHub-auth absence surfaces a loud manual-step flag rather than silently passing. *Impact:* closes the gap between "runnable app" and "valid submission."
- **Perf de-risked empirically:** a reviewer benchmarked 2.06M Poisson draws in 26ms → 10k sims × 103 matches is comfortably sub-1.5s. *Impact:* the signature performance claim is now evidence-backed before a line of engine code.
