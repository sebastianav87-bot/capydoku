# Proof effort: v1 → v2

Metric: weighted = n + 2 × shared-conflict eliminations. Technique H = house-single, S = shared-conflict. First = number of logical eliminations before first capy is forced. Deterministic house scan; no guessing. These metrics are not a human playtest.

|Pond|Hardest v1→v2|Deductions v1→v2|Before first v1→v2|Weighted v1→v2|
|--|--|--|--|--|
|1|shared-conflict → house-single|6 → 5|1 → 0|7 → 5|
|2|shared-conflict → house-single|7 → 5|1 → 0|9 → 5|
|3|shared-conflict → house-single|10 → 5|5 → 0|15 → 5|
|4|shared-conflict → house-single|9 → 5|4 → 0|13 → 5|
|5|shared-conflict → house-single|10 → 5|5 → 0|15 → 5|
|6|shared-conflict → house-single|11 → 5|6 → 0|17 → 5|
|7|shared-conflict → house-single|11 → 5|6 → 0|17 → 5|
|8|shared-conflict → shared-conflict|8 → 7|3 → 0|11 → 9|
|9|shared-conflict → house-single|7 → 6|1 → 0|8 → 6|
|10|shared-conflict → house-single|7 → 6|1 → 0|8 → 6|
|11|shared-conflict → house-single|9 → 6|2 → 0|12 → 6|
|12|shared-conflict → shared-conflict|10 → 7|3 → 0|14 → 8|
|13|shared-conflict → shared-conflict|10 → 8|3 → 0|14 → 10|
|14|shared-conflict → shared-conflict|10 → 8|4 → 0|14 → 10|
|15|shared-conflict → shared-conflict|12 → 8|5 → 0|18 → 10|
|16|shared-conflict → shared-conflict|11 → 8|3 → 0|16 → 10|
|17|shared-conflict → shared-conflict|8 → 9|2 → 1|10 → 12|
|18|shared-conflict → shared-conflict|13 → 9|5 → 2|20 → 12|
|19|shared-conflict → shared-conflict|15 → 10|6 → 2|24 → 14|
|20|shared-conflict → shared-conflict|14 → 12|7 → 2|22 → 18|
|21|shared-conflict → shared-conflict|9 → 9|2 → 2|11 → 11|
|22|shared-conflict → shared-conflict|11 → 11|4 → 4|15 → 15|
|23|shared-conflict → shared-conflict|12 → 12|1 → 1|17 → 17|
|24|shared-conflict → shared-conflict|9 → 9|0 → 0|11 → 11|
|25|shared-conflict → shared-conflict|11 → 11|3 → 3|15 → 15|
|26|shared-conflict → shared-conflict|11 → 11|3 → 3|15 → 15|
|27|shared-conflict → shared-conflict|12 → 12|2 → 2|17 → 17|
|28|shared-conflict → shared-conflict|13 → 13|6 → 6|19 → 19|
|29|shared-conflict → shared-conflict|19 → 19|12 → 12|31 → 31|
|30|shared-conflict → shared-conflict|15 → 15|8 → 8|23 → 23|

Levels 1–5 each have a one-cell zone and force their first capy with **0** preceding eliminations; their entire proof uses house-singles only. 6–16 keep an immediate foothold; later stages introduce shared-conflict gradually. 21–30 retain their original board, rocks and solution. Bosses remain 10/20/30.
