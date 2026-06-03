"""Grounded timeline narration. Citations come from the retriever BEFORE generation,
so the offline template narrator cites real Docling facts too.
"""
from __future__ import annotations
import json
from functools import lru_cache
from typing import AsyncIterator

from .data import KB
from .retriever import get_retriever
from . import granite

VOICES = {
    "pundit": "an authoritative TV football pundit",
    "poet": "a lyrical football poet",
    "tactician": "a tactical analyst who talks shape and matchups",
    "kid": "an excited kid explaining the game to a friend",
}


@lru_cache(maxsize=1)
def _names() -> dict:
    t = json.loads((KB / "teams.json").read_text(encoding="utf-8"))
    return {tm["code"]: tm["name"] for tm in t["teams"]}


def _nm(code: str) -> str:
    return _names().get(code, code)


def _cite(f: dict) -> dict:
    return {"id": f["id"], "text": f["text"], "source": f["source"],
            "label": f["label"], "teams": f["teams"]}


def _headline(winner: str, loser: str, sc: dict, upset: bool) -> str:
    w, l = _nm(winner), _nm(loser)
    if upset:
        return f"How {w} stunned {l}"
    return f"{w} see off {l}"


def _offline_story(a: str, b: str, sc: dict, facts: list[dict], upset: bool) -> str:
    ga, gb = sc.get("a", 0), sc.get("b", 0)
    w = _nm(a) if ga >= gb else _nm(b)
    l = _nm(b) if w == _nm(a) else _nm(a)
    lead = (f"In this timeline {w} edged {l} {ga}–{gb}." if not upset
            else f"Against the odds, {w} toppled {l} {ga}–{gb}.")
    body = ""
    if facts:
        body = " " + facts[0]["text"]
        if len(facts) > 1:
            body += " " + facts[1]["text"]
    tail = f" One result, one ripple — and the bracket bends around it."
    return lead + body + tail


def _build_prompt(a: str, b: str, sc: dict, facts: list[dict]) -> str:
    fct = "\n".join(f"- {f['text']}" for f in facts) or "- (no extra facts)"
    return (f"Write a vivid ~80-word story of this World Cup match outcome.\n"
            f"Result: {_nm(a)} {sc.get('a',0)}–{sc.get('b',0)} {_nm(b)}.\n"
            f"Ground it in these facts (do not invent stats):\n{fct}\n"
            f"Start straight into the story, no preamble.")


async def narrate_events(payload: dict) -> AsyncIterator[tuple[str, dict]]:
    voice = (payload.get("voice") or "pundit").lower()
    r = get_retriever()
    kind = payload.get("kind", "fixture")

    if kind == "fixture":
        a, b = payload["teamA"], payload["teamB"]
        sc = payload.get("scoreline") or {"a": 1, "b": 0}
        facts = r.facts_for_fixture(a, b, k=4)
        winner = a if sc.get("a", 0) >= sc.get("b", 0) else b
        loser = b if winner == a else a
        # upset if the loser was the stronger side
        upset = _is_upset(a, b, winner)
        headline = _headline(winner, loser, sc, upset)
        prompt = _build_prompt(a, b, sc, facts)
    else:
        champ = payload.get("champion", "?")
        a, b, sc = champ, "", {"a": 0, "b": 0}
        facts = r.retrieve(f"{_nm(champ)} run to the World Cup title", teams=[champ], k=4)
        headline = f"The {_nm(champ)} timeline"
        prompt = (f"Write a vivid ~80-word story of {_nm(champ)} winning this simulated World Cup. "
                  f"Ground it in:\n" + "\n".join(f"- {f['text']}" for f in facts))
        upset = False

    causes = [{"text": f["text"], "citation": _cite(f)} for f in facts[:3]]
    citations = [_cite(f) for f in facts]

    streamed = False
    if granite.is_live():
        sys = f"You are {VOICES.get(voice, VOICES['pundit'])}. Max 90 words. Ground every claim in the given facts."
        async for delta in granite.stream_text(prompt, system=sys, max_tokens=220, temperature=0.85):
            streamed = True
            yield ("token", {"delta": delta})
    if not streamed:
        story = _offline_story(a, b, sc, facts, upset)
        for word in story.split(" "):
            yield ("token", {"delta": word + " "})
    yield ("meta", {"headline": headline, "voice": voice, "causes": causes, "citations": citations})


@lru_cache(maxsize=1)
def _elo() -> dict:
    t = json.loads((KB / "teams.json").read_text(encoding="utf-8"))
    return {tm["code"]: tm["elo"] for tm in t["teams"]}


def _is_upset(a: str, b: str, winner: str) -> bool:
    e = _elo()
    loser = b if winner == a else a
    return e.get(loser, 0) > e.get(winner, 0) + 30


def feed_items() -> list[dict]:
    """A few grounded 'multiverse feed' storylines (cheap; cached upstream)."""
    r = get_retriever()
    seeds = [("MAR", "Morocco's dream run"), ("ARG", "Argentina's title defense"),
             ("ESP", "Spain's quiet dominance")]
    items = []
    for code, hl in seeds:
        facts = r.retrieve(hl, teams=[code], k=2)
        blurb = facts[0]["text"] if facts else hl
        items.append({"headline": hl, "blurb": blurb, "citations": [_cite(f) for f in facts]})
    return items
