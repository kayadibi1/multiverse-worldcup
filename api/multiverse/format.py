"""Live-result anchoring: real completed fixtures -> match-scope Force-result modifiers."""
from __future__ import annotations


def actuals_to_modifiers(actuals: list[dict]) -> list[dict]:
    mods = []
    for x in actuals:
        a, b = x["a"], x["b"]
        ga, gb = int(x.get("ga", 0)), int(x.get("gb", 0))
        mods.append({
            "id": f"anchor-{a}-{b}", "scope": "match", "target": f"{a}-{b}",
            "field": "result", "op": "set", "value": {"a": ga, "b": gb},
            "label": f"Actual: {a} {ga}-{gb} {b}", "source": "anchor",
        })
    return mods
