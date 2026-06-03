"""Offline KB build: Docling parses team dossiers -> facts -> BM25 + embedding indexes.

Run once to (re)build data/kb:
    PYTHONPATH=api python -m multiverse.ingest

Outputs (all committed so a fresh clone is self-contained):
    data/kb/teams.json       canonical Strength Table (via data.py)
    data/kb/facts.jsonl      retrievable facts {id,teams,text,source,label}
    data/kb/bm25.json        tokenized corpus for lexical retrieval (always works)
    data/kb/embeddings.npy   L2-normalized nomic-embed-text vectors (if Ollama up)
    data/kb/kb_meta.json     engine, counts, embed dim, demo fixture
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

import numpy as np

from .data import ROOT, RAW, KB, write_strength_table, build_strength_table, name_to_code

OLLAMA = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"
# The guaranteed-citable demo fixture (both sides have dossiers + a real H2H fact).
DEMO_FIXTURE = {"a": "ESP", "b": "MAR", "round": "R16", "label": "Spain vs Morocco"}


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:48]


def docling_to_markdown(path: Path) -> tuple[str, str]:
    """Parse a document to markdown via Docling; raw-read fallback."""
    try:
        from docling.document_converter import DocumentConverter
        md = DocumentConverter().convert(str(path)).document.export_to_markdown()
        return md, "docling"
    except Exception as e:  # pragma: no cover - emergency fallback
        print(f"[ingest] docling failed on {path.name} ({e}); raw read", file=sys.stderr)
        return path.read_text(encoding="utf-8"), "raw"


def _detect_codes(text: str, names: list[tuple[str, str]], home: str) -> list[str]:
    codes = {home}
    low = text.lower()
    for name, code in names:
        if re.search(r"\b" + re.escape(name) + r"\b", low):
            codes.add(code)
    # keep home first
    rest = sorted(c for c in codes if c != home)
    return [home] + rest


def extract_facts(md: str, source: str, home_code: str,
                  names: list[tuple[str, str]]) -> list[dict]:
    facts = []
    heading = ""
    idx = 0
    for raw_line in md.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
            # drop the H1 title; it's the team name, not a fact
            continue
        text = re.sub(r"^[-*]\s+", "", line).strip()
        if len(text) < 18:  # skip stubs
            continue
        idx += 1
        teams = _detect_codes(text, names, home_code)
        label = f"{home_code} · {heading}" if heading else home_code
        facts.append({
            "id": f"{_slug(source)}-{idx:02d}",
            "teams": teams,
            "text": text,
            "source": source,
            "label": label[:48],
        })
    return facts


def embed_texts(texts: list[str]) -> np.ndarray | None:
    """Embed via Ollama /api/embed; L2-normalize. None if Ollama unavailable."""
    try:
        import requests
        r = requests.post(f"{OLLAMA}/api/embed",
                          json={"model": EMBED_MODEL, "input": texts}, timeout=120)
        r.raise_for_status()
        vecs = np.asarray(r.json()["embeddings"], dtype=np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms
    except Exception as e:
        print(f"[ingest] embeddings skipped (Ollama unavailable: {e})", file=sys.stderr)
        return None


def main() -> None:
    KB.mkdir(parents=True, exist_ok=True)
    table = write_strength_table()
    teams = table["teams"]
    codes = {t["code"] for t in teams}
    # name->code pairs sorted longest-first for greedy matching
    n2c = name_to_code(teams)
    names = sorted(((name, code) for name, code in n2c.items() if len(name) > 3),
                   key=lambda x: -len(x[0]))
    code_by_name = {t["name"].lower(): t["code"] for t in teams}

    dossiers = sorted(RAW.glob("dossier_*.md"))
    all_facts: list[dict] = []
    engine_used = "raw"
    for path in dossiers:
        md, engine = docling_to_markdown(path)
        engine_used = engine if engine == "docling" else engine_used
        # home team from H1 title
        m = re.search(r"^#\s+([^—\-\n(]+)", md.strip())
        home_name = (m.group(1).strip().lower() if m else path.stem.replace("dossier_", ""))
        home_code = code_by_name.get(home_name) or n2c.get(home_name) or path.stem.replace("dossier_", "").upper()[:3]
        all_facts.extend(extract_facts(md, path.name, home_code, names))

    # write facts.jsonl
    with (KB / "facts.jsonl").open("w", encoding="utf-8") as f:
        for fact in all_facts:
            f.write(json.dumps(fact, ensure_ascii=False) + "\n")

    # BM25 tokenized corpus
    def tok(s: str) -> list[str]:
        return [w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) >= 2]
    bm25 = {"ids": [x["id"] for x in all_facts],
            "tokens": [tok(x["text"] + " " + x["label"]) for x in all_facts]}
    (KB / "bm25.json").write_text(json.dumps(bm25, ensure_ascii=False), encoding="utf-8")

    # embeddings (optional)
    emb = embed_texts([x["text"] for x in all_facts])
    has_emb = emb is not None
    dim = 0
    if has_emb:
        np.save(KB / "embeddings.npy", emb)
        dim = int(emb.shape[1])

    # demo-fixture coverage: a fact naming BOTH sides (ideal H2H), or at least one each
    a, b = DEMO_FIXTURE["a"], DEMO_FIXTURE["b"]
    demo_covered = any(a in fx["teams"] and b in fx["teams"] for fx in all_facts) or (
        any(a in fx["teams"] for fx in all_facts) and any(b in fx["teams"] for fx in all_facts)
    )

    meta = {
        "engine": engine_used,
        "nFacts": len(all_facts),
        "nDossiers": len(dossiers),
        "embedModel": EMBED_MODEL,
        "embedDim": dim,
        "hasEmbeddings": has_emb,
        "demoFixture": DEMO_FIXTURE,
        "demoFixtureCovered": demo_covered,
    }
    (KB / "kb_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                                     encoding="utf-8")

    print(f"[ingest] engine={engine_used} dossiers={len(dossiers)} facts={len(all_facts)} "
          f"embeddings={'yes('+str(dim)+'d)' if has_emb else 'no(BM25 only)'} "
          f"demoCovered={demo_covered}")


if __name__ == "__main__":
    main()
