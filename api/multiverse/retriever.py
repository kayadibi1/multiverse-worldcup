"""Context-Forge-fronted retriever: embedding cosine (Ollama nomic-embed-text) with a
BM25 lexical fallback, over the Docling-built KB. Returns Fact dicts with citations.
"""
from __future__ import annotations
import json
import re
from functools import lru_cache

import numpy as np
from rank_bm25 import BM25Okapi

from .data import KB
from . import granite


def _tok(s: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) >= 2]


class Retriever:
    def __init__(self) -> None:
        self.facts = [json.loads(l) for l in (KB / "facts.jsonl").read_text(encoding="utf-8").splitlines()]
        meta = json.loads((KB / "kb_meta.json").read_text(encoding="utf-8"))
        self.emb = None
        if meta.get("hasEmbeddings") and (KB / "embeddings.npy").exists():
            self.emb = np.load(KB / "embeddings.npy")
        bm = json.loads((KB / "bm25.json").read_text(encoding="utf-8"))
        self.bm25 = BM25Okapi(bm["tokens"]) if bm["tokens"] else None

    @property
    def n(self) -> int:
        return len(self.facts)

    def _scores(self, query: str) -> np.ndarray:
        if self.emb is not None:
            qv = granite.embed([query])
            if qv:
                v = np.asarray(qv[0], dtype=np.float32)
                nrm = float(np.linalg.norm(v)) or 1.0
                return self.emb @ (v / nrm)
        if self.bm25 is not None:
            return np.asarray(self.bm25.get_scores(_tok(query)), dtype=np.float32)
        return np.zeros(len(self.facts), dtype=np.float32)

    def retrieve(self, query: str, teams: list[str] | None = None, k: int = 4) -> list[dict]:
        if not self.facts:
            return []
        scores = self._scores(query)
        tset = set(teams or [])
        # rank by (mentions a requested team, semantic/lexical score)
        order = sorted(
            range(len(self.facts)),
            key=lambda i: (1 if tset & set(self.facts[i]["teams"]) else 0, float(scores[i])),
            reverse=True,
        )
        return [self.facts[i] for i in order[:k]]

    def facts_for_fixture(self, a: str, b: str, k: int = 4) -> list[dict]:
        """Always returns >=1 fact touching the fixture if any exists (citation never empty)."""
        both = [f for f in self.facts if a in f["teams"] and b in f["teams"]]
        either = [f for f in self.facts if a in f["teams"] or b in f["teams"]]
        seed = both + [f for f in either if f not in both]
        ranked = self.retrieve(f"{a} {b} history form key players", teams=[a, b], k=k)
        out: list[dict] = []
        seen: set[str] = set()
        for f in seed + ranked:
            if f["id"] not in seen:
                out.append(f)
                seen.add(f["id"])
            if len(out) >= k:
                break
        return out


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    return Retriever()
