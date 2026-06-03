# Langflow flows

Two pipelines are authored here as importable Langflow flow JSON. **Honesty note:** Langflow `1.x` does not pip-install on Python 3.14 (its dependency tree lacks cp314 wheels and the sdist build fails), so these flows were **authored offline against the Langflow schema** and are **not** imported by the runtime. The runtime mirrors them **1:1 in FastAPI code** — that's what actually executes. To open/run them, import into a Langflow instance (e.g. the `langflowai/langflow` Docker image) on Python 3.11/3.12.

## `ratings_flow.json` → mirrored in code
| Flow node | Code |
|---|---|
| Load `teams.research.json` | `api/multiverse/data.py: build_strength_table()` |
| Docling: dossiers → facts | `api/multiverse/ingest.py: docling_to_markdown() + extract_facts()` |
| Elo → strength + importance | `api/multiverse/data.py: _with_importance(), MODEL_PARAMS` |
| Strength Table output | `data/kb/teams.json` (served by `GET /api/ratings`) |

## `narrative_flow.json` → mirrored in code
| Flow node | Code |
|---|---|
| Fixture / Timeline input | `POST /api/narrate` body (`api/multiverse/main.py`) |
| Retrieve facts (Context Forge) | `api/multiverse/retriever.py: Retriever.retrieve()` |
| Voice + facts prompt | `api/multiverse/narrate.py: _build_prompt()` |
| IBM Granite model | `api/multiverse/granite.py: stream_text()` (Ollama `granite3.3:2b`, `think=false`) |
| Story + citations (SSE) | `api/multiverse/narrate.py: narrate_events()` |
