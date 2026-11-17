#!/usr/bin/env python3
"""v4.3: writes crate-levels.json (schema 2) = the 6-pond crate ramp. Source: the Designer's reviewed ramp
mockup/boxworld-concept/v4.3-review/crate-ramp-edited.json (read-only; C1/C3/C5 edited, C6 replaced, C2/C4 = live
Crate Cove 3/5 layouts). Each level is keyed by its main-path pond (5/10/15/20/25/30).
Par rule (one rule everywhere): optimal moves × 1.45 rounded to the nearest 5 = floor((moves*29+50)/100)*5."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path("/workspace/capydoku/mockup/boxworld-concept/v4.3-review/crate-ramp-edited.json")
draft = json.loads(SRC.read_text())
def par_rule(moves): return (moves * 29 + 50) // 100 * 5
LIVE = json.loads((root / "reports/v4.3/crate-ramp-draft.json").read_text())["levels"]
NAMES = {5: "Reed Crates", 10: "Reedwater Gate", 15: "Bamboo Crates", 20: "Bamboo Gate", 25: "Summit Crates", 30: "Cloudwater Finale"}
levels = []
for k, d in enumerate(draft["levels"], 1):
    rows = d["rows"]; n = len(rows) - 2
    goals = sum(r.count(".") + r.count("*") + r.count("+") for r in rows)
    crates = sum(r.count("$") + r.count("*") for r in rows)
    assert goals == crates == 3, (d["slot"], goals, crates)
    assert d["status"] == "solver-verified", d["slot"]
    assert len(d["solution"]) == d["optimal_moves"]
    assert d["par"] == par_rule(d["optimal_moves"]), (d["slot"], d["par"], par_rule(d["optimal_moves"]))
    if d["slot"] in ("C2", "C4"): assert rows == LIVE[k - 1]["rows"], d["slot"] + " must keep the live layout (migration)"
    levels.append({"id": k, "slot": d["slot"], "pond": d["pond"], "name": NAMES[d["pond"]], "n": n, "rows": rows,
                   "fruit": ["watermelon", "banana", "pear"], "optimalMoves": d["optimal_moves"], "optimalPushes": d["optimal_pushes"],
                   "pushesInMoveOptimal": d["pushes_in_move_optimal"], "par": d["par"], "solution": d["solution"], "source": d["source"], "review": "Designer v4.3 review (crate-ramp-edited.json)"})
out = {"schema": 2, "layout": 2, "solver": draft["solver"], "solver_sha256": draft["solver_sha256"], "levels": levels}
(root / "crate-levels.json").write_text(json.dumps(out, indent=1) + "\n")
(root / "reports/v4.3/crate-ramp-final.json").write_text(json.dumps(draft, indent=1) + "\n")
print("wrote", len(levels), "crate ponds:", [(l["pond"], l["n"], l["optimalMoves"], l["par"]) for l in levels])
