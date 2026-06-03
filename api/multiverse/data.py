"""Build the canonical Strength Table (data/kb/teams.json) from the researched seed.

All file I/O is UTF-8 with ensure_ascii=False (Windows/3.14 defaults to cp1252,
which would mojibake accented player names and em-dashes in citation chips).
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]   # api/multiverse/data.py -> repo root
RAW = ROOT / "data" / "raw"
KB = ROOT / "data" / "kb"

# Pinned model parameters (spec v2 §7/§8). The worker derives strength s=(elo-eloCenter)/eloScale.
MODEL_PARAMS = {
    "base": 1.30, "k": 0.55, "homeAdv": 0.25, "etBump": 0.30,
    "penaltyK": 0.60, "eloCenter": 1800.0, "eloScale": 200.0, "variance": 1.0,
}
FORMAT = {"groups": 12, "perGroup": 4, "thirdsAdvancing": 8}
PROVENANCE = {
    "eloSnapshot": "2026-06-01",
    "fifaRankAsOf": "2026-04",
    "drawDate": "2025-12-05",
    "note": ("Elo from the World Football Elo ratings; FIFA ranks April 2026; "
             "final draw 2025-12-05. Aggregated from public sources for a "
             "non-commercial demo."),
}
# Descending default importance for the first few listed key players.
_IMPORTANCE = [1.0, 0.7, 0.55]


def _with_importance(key_players: list | None) -> list:
    out = []
    for i, kp in enumerate(key_players or []):
        imp = kp.get("importance")
        if imp is None:
            imp = _IMPORTANCE[i] if i < len(_IMPORTANCE) else 0.4
        out.append({
            "name": kp.get("name", "Unknown"),
            "role": kp.get("role", "MF"),
            "importance": round(float(imp), 2),
        })
    if not out:
        out = [{"name": "Key Player", "role": "FW", "importance": 1.0}]
    # Guarantee at least one player with importance >= 0.8 so the Injury
    # modifier (-0.10 * importance) is always well-defined and non-trivial.
    if not any(p["importance"] >= 0.8 for p in out):
        out[0]["importance"] = 1.0
    return out


def build_strength_table() -> dict:
    raw = json.loads((RAW / "teams.research.json").read_text(encoding="utf-8"))
    teams = []
    for t in raw["teams"]:
        teams.append({
            "code": t["code"],
            "name": t["name"],
            "confederation": t.get("confederation", "?"),
            "group": t.get("group", "?"),
            "elo": float(t.get("elo", 1700)),
            "fifaRank": t.get("fifaRank"),
            "isHost": bool(t.get("isHost", False)),
            "keyPlayers": _with_importance(t.get("keyPlayers")),
            "style": t.get("style", ""),
            "blurb": t.get("blurb", t.get("style", "")),
            "modifiers": [],
        })
    return {
        "tournament": raw.get("tournament", "FIFA World Cup 2026"),
        "drawStatus": raw.get("drawStatus", "final"),
        "provenance": {**PROVENANCE, "sources": raw.get("sources", [])},
        "modelParams": MODEL_PARAMS,
        "format": FORMAT,
        "groups": raw["groups"],
        "teams": teams,
    }


def write_strength_table() -> dict:
    KB.mkdir(parents=True, exist_ok=True)
    table = build_strength_table()
    (KB / "teams.json").write_text(
        json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return table


def name_to_code(teams: list) -> dict:
    """Map full names / codes / common aliases -> FIFA code, for fact tagging."""
    m: dict[str, str] = {}
    for t in teams:
        m[t["name"].lower()] = t["code"]
        m[t["code"].lower()] = t["code"]
    aliases = {
        "usa": "USA", "united states": "USA", "us": "USA",
        "holland": "NED", "the netherlands": "NED",
        "south korea": "KOR", "korea republic": "KOR",
        "ivory coast": "CIV", "cote d'ivoire": "CIV",
        "iran": "IRN", "ir iran": "IRN",
    }
    for k, v in aliases.items():
        if v in {t["code"] for t in teams}:
            m[k] = v
    return m


if __name__ == "__main__":
    t = write_strength_table()
    print(f"wrote data/kb/teams.json: {len(t['teams'])} teams, {len(t['groups'])} groups")
    bad = [x["code"] for x in t["teams"]
           if not any(p["importance"] >= 0.8 for p in x["keyPlayers"])]
    print("teams missing importance>=0.8:", bad or "none")
    print("provenance:", t["provenance"]["eloSnapshot"], t["provenance"]["fifaRankAsOf"])
