"""IBM Granite provider chain: Ollama (verified primary) -> watsonx (if creds) -> offline.

granite3.3:2b is a *thinking* model: we ALWAYS send think=False (think=True HTTP-errors)
and never rely on stripping <think> tags. JSON endpoints use Ollama's format=json.
Granite is never called inside the 10k-sim hot loop.
"""
from __future__ import annotations
import json
import os
from typing import AsyncIterator

import httpx

OLLAMA = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL = os.environ.get("GRANITE_MODEL", "granite3.3:2b")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")


def provider_status() -> dict:
    """Which provider is live right now. Ollama preferred; watsonx if creds; else offline."""
    try:
        r = httpx.get(f"{OLLAMA}/api/tags", timeout=2.0)
        names = [m.get("name", "") for m in r.json().get("models", [])]
        base = MODEL.split(":")[0]
        if any(base in n for n in names):
            return {"provider": "ollama", "model": MODEL}
    except Exception:
        pass
    if os.environ.get("WATSONX_API_KEY") and os.environ.get("WATSONX_PROJECT_ID"):
        return {"provider": "watsonx", "model": os.environ.get("WATSONX_MODEL", "ibm/granite-3-3-8b-instruct")}
    return {"provider": "offline", "model": "template"}


def is_live() -> bool:
    return provider_status()["provider"] in ("ollama", "watsonx")


def _messages(prompt: str, system: str | None) -> list[dict]:
    m = []
    if system:
        m.append({"role": "system", "content": system})
    m.append({"role": "user", "content": prompt})
    return m


def chat(prompt: str, system: str | None = None, json_mode: bool = False,
         max_tokens: int = 400, temperature: float = 0.7) -> str | None:
    """Synchronous completion. Returns None if no live provider / on error."""
    status = provider_status()
    if status["provider"] == "ollama":
        try:
            body = {
                "model": MODEL, "messages": _messages(prompt, system), "stream": False,
                "think": False, "options": {"temperature": temperature, "num_predict": max_tokens},
            }
            if json_mode:
                body["format"] = "json"
            r = httpx.post(f"{OLLAMA}/api/chat", json=body, timeout=90.0)
            r.raise_for_status()
            return (r.json().get("message", {}).get("content") or "").strip()
        except Exception:
            return None
    if status["provider"] == "watsonx":
        return _watsonx_chat(prompt, system, json_mode, max_tokens, temperature)
    return None


async def stream_text(prompt: str, system: str | None = None,
                      max_tokens: int = 400, temperature: float = 0.7) -> AsyncIterator[str]:
    """Async token stream from Ollama. Yields nothing if not live (caller falls back)."""
    if provider_status()["provider"] != "ollama":
        return
    body = {
        "model": MODEL, "messages": _messages(prompt, system), "stream": True,
        "think": False, "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{OLLAMA}/api/chat", json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                delta = obj.get("message", {}).get("content", "")
                if delta:
                    yield delta
                if obj.get("done"):
                    break


def _watsonx_chat(prompt, system, json_mode, max_tokens, temperature) -> str | None:
    """Lazy watsonx path — only imported when creds are present, so a missing SDK can't crash."""
    try:
        from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore
        from ibm_watsonx_ai import Credentials  # type: ignore
        creds = Credentials(url=os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
                            api_key=os.environ["WATSONX_API_KEY"])
        model = ModelInference(model_id=os.environ.get("WATSONX_MODEL", "ibm/granite-3-3-8b-instruct"),
                              credentials=creds, project_id=os.environ["WATSONX_PROJECT_ID"])
        full = (system + "\n\n" if system else "") + prompt
        return model.generate_text(prompt=full, params={"max_new_tokens": max_tokens, "temperature": temperature})
    except Exception:
        return None


def embed(texts: list[str]) -> list[list[float]] | None:
    try:
        r = httpx.post(f"{OLLAMA}/api/embed", json={"model": EMBED_MODEL, "input": texts}, timeout=30.0)
        r.raise_for_status()
        return r.json()["embeddings"]
    except Exception:
        return None


def warm() -> None:
    """Pre-warm Ollama so the first narration isn't a cold load (lifespan startup)."""
    try:
        httpx.post(f"{OLLAMA}/api/chat", json={
            "model": MODEL, "messages": [{"role": "user", "content": "ok"}],
            "stream": False, "think": False, "keep_alive": "30m", "options": {"num_predict": 1},
        }, timeout=60.0)
        httpx.post(f"{OLLAMA}/api/embed",
                  json={"model": EMBED_MODEL, "input": ["warm"], "keep_alive": "30m"}, timeout=30.0)
    except Exception:
        pass
