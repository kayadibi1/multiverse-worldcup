"""MULTIVERSE FastAPI app. /api/* routes are registered BEFORE the static SPA mount."""
from __future__ import annotations
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .data import KB, ROOT
from . import granite, whatif, narrate
from . import format as fmt
from .retriever import get_retriever


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_retriever()  # load KB into memory
    except Exception:
        pass
    granite.warm()       # avoid a cold first-token
    yield


app = FastAPI(title="MULTIVERSE API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _table() -> dict:
    return json.loads((KB / "teams.json").read_text(encoding="utf-8"))


@app.get("/api/health")
def health() -> dict:
    st = granite.provider_status()
    kb_facts, emb = 0, False
    try:
        meta = json.loads((KB / "kb_meta.json").read_text(encoding="utf-8"))
        kb_facts, emb = meta.get("nFacts", 0), bool(meta.get("hasEmbeddings"))
    except Exception:
        pass
    return {"graniteProvider": st["provider"], "model": st["model"], "kbFacts": kb_facts, "embeddings": emb}


@app.get("/api/ratings")
def ratings() -> dict:
    t = _table()
    return {"teams": t["teams"], "modelParams": t["modelParams"], "format": t["format"],
            "groups": t["groups"], "provenance": t.get("provenance", {})}


@app.post("/api/intervene")
async def intervene(req: Request) -> dict:
    body = await req.json()
    return whatif.parse(body.get("text", ""))


@app.post("/api/anchor")
async def anchor(req: Request) -> dict:
    body = await req.json()
    return {"modifiers": fmt.actuals_to_modifiers(body.get("actuals", []))}


@app.get("/api/feed")
def feed() -> dict:
    return {"items": narrate.feed_items()}


@app.post("/api/narrate")
async def narrate_ep(req: Request) -> StreamingResponse:
    payload = await req.json()

    async def gen():
        async for event, data in narrate.narrate_events(payload):
            yield f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# Serve the built SPA if present (mounted last so /api wins).
DIST = ROOT / "web" / "dist"
if DIST.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="static")
