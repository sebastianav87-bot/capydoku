# Capydoku verification

30 campaign boards + 365 daily source boards. Every board has exactly **1** solution and a complete monotone, no-guessing proof.

## Deduction set
- **house-single**: The sole candidate in a row, column or zone is forced; remove all its row/column/zone/king-neighbor peers.
- **shared-conflict**: A house must contain one capy. A cell conflicting with EVERY remaining candidate of that house is impossible. Includes locked row/zone intersections and common adjacency exclusion. No branching, no search, no solution lookup.

The independent oracle enumerates all n! column permutations, not the generator seed or logical proof. The supplied mockup agrees with our oracle (1 solution). Its original colorblind script contains a stale earlier palette; the application uses notes.md/assets/palette.json, not that script.

Daily mapping: calendar day number modulo 365 selects a generated source board, followed by a year-cycle dihedral transform. 2026-01-01 through 2026-12-31 are independently verified here; runtime JS tests verify the actual transformed daily output on those 365 consecutive dates. Dates use local year/month/day, never UTC date slicing. Bank is finite (365 sources), not an infinite random-puzzle claim.

Difficulty is a heuristic, not playtested: 5×5 ponds 1–8; 6×6 ponds 9–20; 7×7 ponds 21–30. Each size band is sorted by logical proof effort; rocks start at 21. Boss ponds 10/20/30 use the same rules and grant Beanie/Orange/Duck.

|Pond|Size|Rocks|Solutions|Logic|Deductions|Techniques|
|--|--|--|--|--|--|--|
|pond-01|5×5|0|1|yes|7|house-single, shared-conflict|
|pond-02|5×5|0|1|yes|7|house-single, shared-conflict|
|pond-03|5×5|0|1|yes|10|house-single, shared-conflict|
|pond-04|5×5|0|1|yes|11|house-single, shared-conflict|
|pond-05|5×5|0|1|yes|11|house-single, shared-conflict|
|pond-06|5×5|0|1|yes|11|house-single, shared-conflict|
|pond-07|5×5|0|1|yes|12|house-single, shared-conflict|
|pond-08|5×5|0|1|yes|12|house-single, shared-conflict|
|pond-09|6×6|0|1|yes|9|house-single, shared-conflict|
|pond-10|6×6|0|1|yes|9|house-single, shared-conflict|
|pond-11|6×6|0|1|yes|10|house-single, shared-conflict|
|pond-12|6×6|0|1|yes|10|house-single, shared-conflict|
|pond-13|6×6|0|1|yes|11|house-single, shared-conflict|
|pond-14|6×6|0|1|yes|12|house-single, shared-conflict|
|pond-15|6×6|0|1|yes|12|house-single, shared-conflict|
|pond-16|6×6|0|1|yes|12|house-single, shared-conflict|
|pond-17|6×6|0|1|yes|12|house-single, shared-conflict|
|pond-18|6×6|0|1|yes|15|house-single, shared-conflict|
|pond-19|6×6|0|1|yes|15|house-single, shared-conflict|
|pond-20|6×6|0|1|yes|15|house-single, shared-conflict|
|pond-21|7×7|1|1|yes|10|house-single, shared-conflict|
|pond-22|7×7|3|1|yes|12|house-single, shared-conflict|
|pond-23|7×7|1|1|yes|13|house-single, shared-conflict|
|pond-24|7×7|2|1|yes|13|house-single, shared-conflict|
|pond-25|7×7|2|1|yes|13|house-single, shared-conflict|
|pond-26|7×7|1|1|yes|14|house-single, shared-conflict|
|pond-27|7×7|2|1|yes|15|house-single, shared-conflict|
|pond-28|7×7|1|1|yes|16|house-single, shared-conflict|
|pond-29|7×7|2|1|yes|19|house-single, shared-conflict|
|pond-30|7×7|3|1|yes|19|house-single, shared-conflict|

Daily: all 365 per-date rows (size, rock cells/count, count=1, logic flag, techniques, deductions, SHA-256) are in verification.json.

Generation + exhaustive verification: 138.83 seconds.
