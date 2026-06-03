# 3-minute demo video — storyboard & capture script

The video is a required deliverable. Every beat below is a **built, verified feature** (no mockups). Capture by screen-recording `./scripts/run.ps1` → http://localhost:8000 and following this script. The committed screenshots (`docs/shot-*.png`) are the fallback storyboard frames.

| Time | Beat | On screen | What to say |
|---|---|---|---|
| 0:00–0:10 | **Cold open** | Title "MULTIVERSE", camera eases from space into the globe (skippable). | "Every World Cup is a billion what-ifs. We simulated all of them." |
| 0:10–0:35 | **The Oracle Globe** | Pillars rise per nation; leaderboard (ESP ~20%, ARG, FRA…); "10,000 timelines simulated" rail with 3 *divergent* champions incl. a dark horse. `shot-p4-globe.png` | "Not one prediction — ten thousand. Spain lead, but Morocco, Croatia, even Canada have real, visible paths." |
| 0:35–1:05 | **Rewrite fate (structured)** | Drag **Injury** onto Brazil + **Host edge**; amber shockwave crosses the globe; leaderboard reorders, BRA ▼ red, others ▲. `shot-p5-intervene.png` | "Injure a key player, boost the hosts — and watch the futures ripple instantly. No AI in this loop, so the wow never waits." |
| 1:05–1:35 | **Rewrite fate (free-text → Granite)** | Type "it rains every knockout night" → IBM Granite parses it into a Weather modifier → multiverse re-runs. | "Type any what-if. IBM Granite turns plain English into a change to the model itself — the one place the AI actually reasons." |
| 1:35–2:15 | **Dive into a match** | Click a timeline → camera dives to the stadium; two **formation-constellations** clash; "Spain 2–1 DR Congo". `shot-p6-stadium.png` | "Dive into any single fixture and watch the two line-ups collide — one simulated match out of millions." |
| 2:15–2:45 | **Granite narrates, grounded** | Story streams ("How Nigeria stunned…" / "Spain see off DR Congo"); **citation chips** trace to Docling-ingested dossiers; switch voice (Pundit→Poet). `shot-p7-story.png` | "And IBM Granite tells that timeline's story — grounded in facts IBM Docling pulled from real dossiers. Switch the voice; regenerate." |
| 2:45–3:00 | **Architecture + honesty** | README architecture diagram / IBM-tool honesty card. | "Granite and Docling do real, verifiable work; Langflow and Context Forge front the pipeline. 25 engine tests, 4 headless e2e — all green. Fork it; it clones and runs in two commands." |

**Capture tips:** pre-warm Ollama (`ollama run granite3.3:2b "ok"`) so first-token latency is low; the offline narrator is the on-camera fallback if Ollama is cold. Run headed (not `?headless=1`) for full bloom.
