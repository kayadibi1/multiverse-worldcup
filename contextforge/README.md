# Context Forge (MCP gateway)

**Honesty note:** IBM Context Forge is an **MCP gateway / proxy** — it federates tools over the Model Context Protocol; it is *not* itself a retriever. `gateway.json` declares the MCP contract for our knowledge-base retrieval tool. In the demo the FastAPI backend calls the retriever **directly** (the gateway process is optional), mirroring the same honest framing as the Langflow flows.

## Config → code mapping
| `gateway.json` | Code |
|---|---|
| server `multiverse-retriever`, tool `retrieve` | `api/multiverse/retriever.py: Retriever.retrieve(query, teams, k)` |
| `inputSchema { query, teams, k }` | the `retrieve()` arguments |
| `outputSchema [{ id, teams, text, source, label }]` | the Fact dicts read from `data/kb/facts.jsonl` |
| retrieval engine | embedding cosine via Ollama `nomic-embed-text` (`data/kb/embeddings.npy`), BM25 fallback (`data/kb/bm25.json`) |

This is the retriever that grounds every IBM Granite narrative — the citation chips in the Story panel are exactly the `Fact` objects this tool returns.
