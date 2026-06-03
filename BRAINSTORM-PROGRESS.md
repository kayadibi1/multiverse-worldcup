# IBM SkillsBuild AI Builders Challenge — Brainstorm Progress

> Portable snapshot so this work can continue on another machine (e.g. Mac).
> Paste this into a new Claude Code session to pick up where we left off.

## Context
- **Challenge:** IBM SkillsBuild "AI Builders Challenge" — **June challenge (FIFA World Cup themed)**. WC 2026 runs June 11 – July 19 (48 teams, 3 hosts: USA/Canada/Mexico). Matches happen *during* build/judging.
- **Team:** Full team (4–5), strong across full-stack/backend, AI/ML/data, frontend/visual, and design/storytelling.
- **Goal:** A *truly original, wow-factor, visual + interactive* project that scores on Innovation, Technical Execution, Challenge Fit, Feasibility.
- **Required:** ≥1 IBM AI tech, public GitHub repo, working prototype, README (problem / approach / why it matters), ≤3-min video.

## Chosen concept: "THE MULTIVERSE" 🌌
An **explorable counterfactual World Cup engine** — NOT a single-outcome predictor. Monte-Carlo simulate the whole 48-team tournament thousands of times; let the user *inject "what-ifs"* (injuries, forced matchups, form changes) and watch probabilities **ripple** across the bracket. Granite generates the narrative for each timeline.

Deliberately avoiding the crowded/boring lanes: match-outcome predictor, stats chatbot, fantasy optimizer, tweet sentiment.

## Visual direction: EARTH / GLOBE (parked as frontrunner) 🌍
Exploring approaches **within** the globe (by where the multiverse lives spatially):
- **A · Probability Pillars** — glowing bars rise from each nation; height = win %. Clearest for judges.
- **B · Atmosphere of Futures** — 100k timeline-particles swirl as an atmosphere, gathering/glowing over the likely winner. (Most wow.)
- **C · Arc Storms** — every simulated match fires a lightning arc between the two nations; globe "crackles" as the engine runs live.
- **D · Orbital Rounds** — earth at core; orbital rings = rounds; 48 nations spiral inward as they survive.
- They **layer** (e.g. Pillars for clarity + Atmosphere for wow + Arc Storms on "run 10,000 sims").
- **OPEN DECISION:** which globe approach is the hero / what combo.

## Tech direction
- **Three.js + react-three-fiber**, with a **GPU/GPGPU particle system** (FBO ping-pong) for 10k–100k+ particles at 60fps. (Considered: PixiJS for 2D, D3 for charts layer only.)
- **Engine architecture = Hybrid (C):** **Granite** computes match-win probabilities + explains upsets in natural language → a **Web Worker** runs the authoritative Monte-Carlo for real numbers → **GPU particles sample those same probabilities live**, so the on-screen distribution provably matches the engine.

## IBM tool mapping
- **Granite** — match probabilities + timeline narratives/explanations.
- **Docling** — ingest team form/results/scouting data (PDFs → structured).
- **Langflow** — orchestrate the sim → narrate pipeline.
- **Context Forge** — retrieval / grounding.

## Other concepts considered (for reference)
Multiverse visual metaphors explored: Tree of Futures, Probability River, Multiverse Galaxy, Tournament Orrery, Metro Map, Living Bracket, The Forecast (weather map), World Globe ✅, Plinko of Fate, Stadium of Futures, Loom of Fate, Mission Control. GPU particle behaviors: Possibility Nebula, Swarm→Reveal, Gravity Wells, Flow-Field Aurora.

## Open decisions before writing the spec
1. Hero globe approach (A/B/C/D) + layering plan.
2. Confirm Hybrid engine architecture.
3. Data source for team strengths / fixtures (e.g. an open football data API + Elo/ratings).
4. Scope of prototype (full 48-team bracket vs slice).

## Process state
- Using the `superpowers:brainstorming` skill. Visual companion mockups saved under `.superpowers/brainstorm/`.
- **Next steps:** converge on hero globe approach → present full design → write spec to `docs/superpowers/specs/` → `writing-plans` skill for implementation plan.
