# Campaign difficulty: v4 → v4.1

Scorer: `difficulty.js` (deterministic deduction-technique audit; never reads a stored solution, never guesses).
Every board is solved by a monotone proof: contradiction/branching depth is **0** on all 30 ponds (no guessing anywhere).
Techniques: rank 1 = basic single (only spot left in a row/column/zone); rank 2 = confinement / pointing / claiming (a zone confined to one row or column, or a row/column confined to one zone, removes cells elsewhere); rank 3 = common conflict (every remaining option of a house touches or shares with the same cell, including the no-touching adjacency).
Score = 20×beyond-basic steps + 12×row/region interaction steps + 28×common-conflict steps + 3×steps before the first forced capy + 10×deepest rank. Structural measure, not calibrated human solve times.

## Ramp shape per world (v4.1 score)

**World 1 · Reedwater shore** (ponds 1–10, boss 10)
```
 1 5x5 █                      10  (v4  10)
 2 5x5 █                      10  (v4  10)
 3 5x5 █                      10  (v4  10)
 4 5x5 █                      10  (v4  10)
 5 5x5 █                      10  (v4  10)
 6 5x5 ██                     52  (v4  10)
 7 5x5 ████                  110  (v4  10)
 8 5x5 ██████                190  (v4 110)
 9 6x6 ████████              230  (v4  10)
10 6x6 █████████             279  (v4  10) ← boss
```
Nondecreasing: yes · boss is the world maximum: yes

**World 2 · Bamboo hush** (ponds 11–20, boss 20)
```
11 6x6 ██                     52  (v4  10) ← breather after boss
12 6x6 ████                  110  (v4  52)
13 6x6 █████                 141  (v4 138)
14 6x6 ██████                176  (v4 126)
15 6x6 ███████               211  (v4 110)
16 6x6 ████████              244  (v4 126)
17 6x6 █████████             281  (v4 173)
18 6x6 ██████████            314  (v4 164)
19 6x6 ████████████          355  (v4 236)
20 6x6 █████████████         399  (v4 320) ← boss
```
Nondecreasing: yes · boss is the world maximum: yes

**World 3 · Cloudwater summit** (ponds 21–30, boss 30)
```
21 7x7 █████                 156  (v4 156) ← breather after boss
22 7x7 ███████               205  (v4 214)
23 7x7 ████████              252  (v4 281)
24 7x7 ██████████            299  (v4 138)
25 7x7 ████████████          350  (v4 215)
26 7x7 █████████████         403  (v4 255)
27 7x7 ███████████████       450  (v4 256)
28 7x7 █████████████████     501  (v4 316)
29 7x7 ███████████████████   556  (v4 602)
30 7x7 ████████████████████  600  (v4 406) ← boss
```
Nondecreasing: yes · boss is the world maximum: yes

Breathers: pond 11 scores **52** right after Boss 10 (**279**); pond 21 scores **156** right after Boss 20 (**399**). Pond 21 also introduces rocks (1 rock), so it was kept as the v4 board on purpose. Ponds 1–5 stay the gentle all-basic tutorial plateau (pond 1 is the tutorial board, unchanged).

## Every level, before → after

|Pond|Grid|Rocks|Score v4 → v4.1|Beyond-basic steps|Row/region interactions|Common-conflict steps|Deepest technique v4 → v4.1|Guess depth|Board|
|---|---|---|---|---|---|---|---|---|---|
|1|5×5|0|10 → **10**|0 → 0|0 → 0|0 → 0|basic → basic|0|kept|
|2|5×5|0|10 → **10**|0 → 0|0 → 0|0 → 0|basic → basic|0|kept|
|3|5×5|0|10 → **10**|0 → 0|0 → 0|0 → 0|basic → basic|0|kept|
|4|5×5|0|10 → **10**|0 → 0|0 → 0|0 → 0|basic → basic|0|kept|
|5|5×5|0|10 → **10**|0 → 0|0 → 0|0 → 0|basic → basic|0|kept|
|6|5×5|0|10 → **52**|0 → 1|0 → 1|0 → 0|basic → confinement|0|new|
|7|5×5|0|10 → **110**|0 → 2|0 → 1|0 → 1|basic → common conflict|0|new|
|8|5×5|0|110 → **190**|2 → 4|1 → 2|1 → 2|common conflict → common conflict|0|new|
|9|6×6|0|10 → **230**|0 → 4|0 → 2|0 → 3|basic → common conflict|0|new|
|10 (boss)|6×6|0|10 → **279**|0 → 6|0 → 3|0 → 3|basic → common conflict|0|new|
|11|6×6|0|10 → **52**|0 → 1|0 → 1|0 → 0|basic → confinement|0|new|
|12|6×6|0|52 → **110**|1 → 2|1 → 1|0 → 1|confinement → common conflict|0|new|
|13|6×6|0|138 → **141**|2 → 2|1 → 1|2 → 2|common conflict → common conflict|0|new|
|14|6×6|0|126 → **176**|2 → 3|0 → 2|2 → 2|common conflict → common conflict|0|new|
|15|6×6|0|110 → **211**|2 → 4|1 → 3|1 → 2|common conflict → common conflict|0|new|
|16|6×6|0|126 → **244**|2 → 5|0 → 2|2 → 3|common conflict → common conflict|0|new|
|17|6×6|0|173 → **281**|3 → 5|2 → 2|2 → 4|common conflict → common conflict|0|new|
|18|6×6|0|164 → **314**|3 → 6|1 → 1|2 → 5|common conflict → common conflict|0|new|
|19|6×6|0|236 → **355**|4 → 7|3 → 3|3 → 5|common conflict → common conflict|0|new|
|20 (boss)|6×6|0|320 → **399**|6 → 7|2 → 1|5 → 7|common conflict → common conflict|0|new|
|21|7×7|1|156 → **156**|2 → 2|2 → 2|2 → 2|common conflict → common conflict|0|kept|
|22|7×7|3|214 → **205**|4 → 4|3 → 3|2 → 2|common conflict → common conflict|0|new|
|23|7×7|1|281 → **252**|5 → 4|3 → 2|4 → 4|common conflict → common conflict|0|new|
|24|7×7|2|138 → **299**|2 → 5|1 → 4|2 → 4|common conflict → common conflict|0|new|
|25|7×7|2|215 → **350**|4 → 7|1 → 1|3 → 6|common conflict → common conflict|0|new|
|26|7×7|1|255 → **403**|4 → 8|2 → 2|4 → 6|common conflict → common conflict|0|new|
|27|7×7|2|256 → **450**|5 → 8|3 → 1|3 → 8|common conflict → common conflict|0|new|
|28|7×7|1|316 → **501**|6 → 9|3 → 1|4 → 9|common conflict → common conflict|0|new|
|29|7×7|2|602 → **556**|12 → 11|6 → 3|8 → 9|common conflict → common conflict|0|new|
|30 (boss)|7×7|3|406 → **600**|8 → 12|2 → 4|6 → 9|common conflict → common conflict|0|new|

## What was kept fixed

- Grid progression (5×5 ponds 1–8, 6×6 ponds 9–20, 7×7 ponds 21–30) and per-pond rock counts are identical to v4.
- Pond 1 (tutorial board) and pond 21 (rock intro) are unchanged; Daily banks are byte-identical, and no rocks appear in Daily before pond 21 is reached.
- 760 source boards (30 campaign + 730 Daily) and 5,840 real Daily date/variant outputs re-verified: exactly one solution, complete no-guess proof, connected zones (see `verification-v4.1.md`).
- Saves migrate by level number: completion, lilies, golden lilies, Hot Spring tier, nickname and starter are untouched; an in-progress board for a pond whose board changed is dropped (toast: "Ponds refreshed. Your progress & lilies are safe.").

