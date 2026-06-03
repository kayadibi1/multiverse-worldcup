"""Free-text what-if -> typed Modifier[]. Deterministic keyword parser is the PRIMARY,
always-tested path (works with Ollama off). Granite is layered on top with strict
validation + normalization; it upgrades the result when live but is never required.
"""
from __future__ import annotations
import json
import re
import uuid
from functools import lru_cache

from .data import KB
from . import granite

VALID_SCOPE = {"team", "match", "round", "global"}
VALID_FIELD = {"strength", "homeAdv", "result", "variance"}
VALID_OP = {"add", "mul", "set"}


def _id() -> str:
    return "wi-" + uuid.uuid4().hex[:8]


@lru_cache(maxsize=1)
def _teams():
    t = json.loads((KB / "teams.json").read_text(encoding="utf-8"))
    teams = t["teams"]
    n2c: dict[str, str] = {}
    for tm in teams:
        n2c[tm["name"].lower()] = tm["code"]
        n2c[tm["code"].lower()] = tm["code"]
    for k, v in {"usa": "USA", "united states": "USA", "holland": "NED",
                 "netherlands": "NED", "south korea": "KOR"}.items():
        if any(tm["code"] == v for tm in teams):
            n2c[k] = v
    imp = {tm["code"]: max((p.get("importance", 0.5) for p in tm.get("keyPlayers", [])), default=1.0)
           for tm in teams}
    codes = {tm["code"] for tm in teams}
    return teams, n2c, imp, codes


def _resolve_codes(text: str) -> list[str]:
    _, n2c, _, _ = _teams()
    low = text.lower()
    pos: dict[str, int] = {}
    for name in n2c:
        if len(name) < 3:
            continue
        m = re.search(r"\b" + re.escape(name) + r"\b", low)
        if m:
            c = n2c[name]
            if c not in pos or m.start() < pos[c]:
                pos[c] = m.start()
    return [c for c, _ in sorted(pos.items(), key=lambda x: x[1])]


def deterministic_parse(text: str) -> dict:
    _, _, imp, _ = _teams()
    low = text.lower()
    found = _resolve_codes(text)
    mods: list[dict] = []
    expl: list[str] = []

    def add(m: dict, e: str) -> None:
        mods.append(m); expl.append(e)

    if re.search(r"\b(rain|weather|storm|snow|cold|heat|wind|humid|pitch)", low):
        add({"id": _id(), "scope": "round", "target": "*", "field": "variance", "op": "mul",
             "value": 1.4, "label": "Weather chaos (knockouts)", "source": "fallback"},
            "Wild weather widens knockout variance — upsets become likelier.")
    if re.search(r"\b(host|home advantage|home crowd|home soil|home support)\b", low):
        add({"id": _id(), "scope": "global", "target": "*", "field": "homeAdv", "op": "add",
             "value": 0.10, "label": "Amplified host edge", "source": "fallback"},
            "Home advantage for the hosts is amplified.")
    for c in found:
        if re.search(r"\b(injur|ruled out|out for|sidelined|hurt|knock)\b", low):
            v = round(-0.10 * imp.get(c, 1.0), 2)
            add({"id": _id(), "scope": "team", "target": c, "field": "strength", "op": "add",
                 "value": v, "label": f"{c} key player injured", "source": "fallback"},
                f"{c} lose a key player (strength {v}).")
        elif re.search(r"\b(red card|sent off|dismiss)\b", low):
            add({"id": _id(), "scope": "team", "target": c, "field": "strength", "op": "add",
                 "value": -0.12, "label": f"{c} red card", "source": "fallback"}, f"{c} down to ten men.")
        elif re.search(r"\b(in.?form|form surge|on fire|flying|peak|red.?hot)\b", low):
            add({"id": _id(), "scope": "team", "target": c, "field": "strength", "op": "add",
                 "value": 0.10, "label": f"{c} form surge", "source": "fallback"}, f"{c} in red-hot form.")
        elif re.search(r"\b(poor form|slump|tired|fatigue|crisis|struggl|out of form)\b", low):
            add({"id": _id(), "scope": "team", "target": c, "field": "strength", "op": "add",
                 "value": -0.10, "label": f"{c} poor form", "source": "fallback"}, f"{c} in a slump.")
    mscore = re.search(r"(\d)\s*[-–:]\s*(\d)", low)
    if mscore and len(found) >= 2:
        a, b = found[0], found[1]
        ga, gb = int(mscore.group(1)), int(mscore.group(2))
        add({"id": _id(), "scope": "match", "target": f"{a}-{b}", "field": "result", "op": "set",
             "value": {"a": ga, "b": gb}, "label": f"{a} {ga}-{gb} {b} pinned", "source": "fallback"},
            f"Pinned {a} {ga}-{gb} {b} where they meet in the group stage.")
    if not mods and found:
        c = found[0]
        v = round(-0.10 * imp.get(c, 1.0), 2)
        add({"id": _id(), "scope": "team", "target": c, "field": "strength", "op": "add",
             "value": v, "label": f"{c} setback", "source": "fallback"}, f"{c} hit by a setback.")
    return {"modifiers": mods, "explanation": " ".join(expl) or "No clear what-if detected — try naming a team and an event.",
            "source": "fallback"}


def _coerce(m: dict) -> dict | None:
    _, n2c, imp, codes = _teams()
    scope = str(m.get("scope", "")).lower()
    field = m.get("field", "")
    op = m.get("op", "")
    target = str(m.get("target", "*"))
    value = m.get("value")
    label = m.get("label") or "what-if"
    # normalize common Granite drift (e.g. scope:player / field:condition / injury)
    blob = json.dumps(m).lower()
    if scope not in VALID_SCOPE or field not in VALID_FIELD:
        if "injur" in blob or scope in ("player", "individual"):
            scope, field, op = "team", "strength", "add"
            if not isinstance(value, (int, float)):
                value = -0.10
        elif "weather" in blob or "rain" in blob:
            scope, field, op, target, value = "round", "variance", "mul", "*", 1.4
        elif "host" in blob or "home" in blob:
            scope, field, op, target, value = "global", "homeAdv", "add", "*", 0.10
    if scope not in VALID_SCOPE or field not in VALID_FIELD or op not in VALID_OP:
        return None
    if scope == "team":
        if target not in codes:
            target = n2c.get(target.lower(), target.upper()[:3])
        if target not in codes:
            return None
    if field in ("strength", "homeAdv", "variance") and not isinstance(value, (int, float)):
        return None
    if field == "result" and not (isinstance(value, dict) and "a" in value and "b" in value):
        return None
    # The worker treats team-strength modifiers as additive deltas — normalize op + clamp
    # so a Granite "set"/extreme value can't be silently ignored or break calibration.
    if field == "strength":
        op = "add"
        value = max(-0.6, min(0.4, float(value)))
    elif field == "homeAdv":
        op = "add"
        value = max(-0.3, min(0.3, float(value)))
    elif field == "variance":
        op = "mul"
        value = max(0.5, min(2.5, float(value)))
    return {"id": _id(), "scope": scope, "target": target, "field": field, "op": op,
            "value": value, "label": label[:48], "source": "granite"}


_SYS = (
    "You convert a football what-if into JSON modifiers for a World Cup simulator. "
    "Reply ONLY with JSON: {\"modifiers\":[{\"scope\",\"target\",\"field\",\"op\",\"value\",\"label\"}]}. "
    "scope in [team,match,round,global]; field in [strength,homeAdv,result,variance]; op in [add,mul,set]. "
    "Use FIFA 3-letter team codes for team targets. Examples: injury -> "
    "{scope:team,target:BRA,field:strength,op:add,value:-0.1,label:'BRA key injury'}; "
    "rain in knockouts -> {scope:round,target:'*',field:variance,op:mul,value:1.4,label:'Weather'}; "
    "host boost -> {scope:global,target:'*',field:homeAdv,op:add,value:0.1,label:'Host edge'}."
)


def granite_parse(text: str) -> dict | None:
    for attempt in range(2):
        raw = granite.chat(text if attempt == 0 else f"{text}\nReturn STRICT JSON with a 'modifiers' array only.",
                          system=_SYS, json_mode=True, max_tokens=300, temperature=0.2)
        if not raw:
            return None
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            continue
        arr = obj.get("modifiers") if isinstance(obj, dict) else (obj if isinstance(obj, list) else None)
        if not isinstance(arr, list):
            arr = [obj] if isinstance(obj, dict) else []
        cleaned = [c for c in (_coerce(m) for m in arr if isinstance(m, dict)) if c]
        if cleaned:
            return {"modifiers": cleaned, "explanation": "Parsed by IBM Granite.", "source": "granite"}
    return None


def parse(text: str) -> dict:
    if granite.is_live():
        g = granite_parse(text)
        if g and g["modifiers"]:
            return g
    return deterministic_parse(text)
