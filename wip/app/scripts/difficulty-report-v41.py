"""Regenerates reports/DIFFICULTY-v4.1.md from reports/difficulty-v4.1.json (scorer: difficulty.js)."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'reports/difficulty-v4.1.json').read_text())
L=d['levels']
W=['Reedwater shore','Bamboo hush','Cloudwater summit']
def bar(v,mx=600): return '█'*max(1,round(v/mx*20))
out=['# Campaign difficulty: v4 → v4.1','',
'Scorer: `difficulty.js` (deterministic deduction-technique audit; never reads a stored solution, never guesses).',
'Every board is solved by a monotone proof: contradiction/branching depth is **0** on all 30 ponds (no guessing anywhere).',
'Techniques: rank 1 = basic single (only spot left in a row/column/zone); rank 2 = confinement / pointing / claiming (a zone confined to one row or column, or a row/column confined to one zone, removes cells elsewhere); rank 3 = common conflict (every remaining option of a house touches or shares with the same cell, including the no-touching adjacency).',
'Score = 20×beyond-basic steps + 12×row/region interaction steps + 28×common-conflict steps + 3×steps before the first forced capy + 10×deepest rank. Structural measure, not calibrated human solve times.','',
'## Ramp shape per world (v4.1 score)','']
for k in range(3):
    ids=range(k*10+1,k*10+11)
    out.append(f'**World {k+1} · {W[k]}** (ponds {k*10+1}–{k*10+10}, boss {k*10+10})')
    out.append('```')
    for i in ids:
        r=L[i-1]; a=r['after']['score']; b=r['before']['score']
        tag=' ← boss' if i%10==0 else (' ← breather after boss' if i in (11,21) else '')
        out.append(f'{i:>2} {r["n"]}x{r["n"]} {bar(a):<21} {a:>3}  (v4 {b:>3}){tag}')
    out.append('```')
    s=[L[i-1]['after']['score'] for i in ids]
    out.append(f'Nondecreasing: {"yes" if all(s[j]<=s[j+1] for j in range(9)) else "NO"} · boss is the world maximum: {"yes" if s[-1]==max(s) else "NO"}')
    out.append('')
out+=['Breathers: pond 11 scores **52** right after Boss 10 (**279**); pond 21 scores **156** right after Boss 20 (**399**). '
'Pond 21 also introduces rocks (1 rock), so it was kept as the v4 board on purpose. Ponds 1–5 stay the gentle all-basic tutorial plateau (pond 1 is the tutorial board, unchanged).','',
'## Every level, before → after','',
'|Pond|Grid|Rocks|Score v4 → v4.1|Beyond-basic steps|Row/region interactions|Common-conflict steps|Deepest technique v4 → v4.1|Guess depth|Board|',
'|---|---|---|---|---|---|---|---|---|---|']
names={1:'basic',2:'confinement',3:'common conflict'}
for r in L:
    b,a=r['before'],r['after']
    out.append(f"|{r['level']}{' (boss)' if r['level']%10==0 else ''}|{r['n']}×{r['n']}|{r['rocks']}|{b['score']} → **{a['score']}**|{b['beyondBasicSteps']} → {a['beyondBasicSteps']}|{b['interactionSteps']} → {a['interactionSteps']}|{b['commonConflictSteps']} → {a['commonConflictSteps']}|{names[b['deepestRank']]} → {names[a['deepestRank']]}|{a['branchingDepth']}|{'new' if r['boardChanged'] else 'kept'}|")
out+=['','## What was kept fixed','',
'- Grid progression (5×5 ponds 1–8, 6×6 ponds 9–20, 7×7 ponds 21–30) and per-pond rock counts are identical to v4.',
'- Pond 1 (tutorial board) and pond 21 (rock intro) are unchanged; Daily banks are byte-identical, and no rocks appear in Daily before pond 21 is reached.',
'- 760 source boards (30 campaign + 730 Daily) and 5,840 real Daily date/variant outputs re-verified: exactly one solution, complete no-guess proof, connected zones (see `verification-v4.1.md`).',
'- Saves migrate by level number: completion, lilies, golden lilies, Hot Spring tier, nickname and starter are untouched; an in-progress board for a pond whose board changed is dropped (toast: "Ponds refreshed. Your progress & lilies are safe.").','']
(root/'reports/DIFFICULTY-v4.1.md').write_text('\n'.join(out)+'\n')
print('ok')
