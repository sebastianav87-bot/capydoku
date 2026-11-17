"""Read-only exact minimum-push BFS, collapsing free walks into reachable regions.

A state is (sorted crate cells, least reachable player cell). Each edge is one
legal push. Reverse-pull reachability prunes only provably dead crate squares.
The stored move-optimal path is checked separately; it need not minimize pushes.
"""
from collections import deque
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def minimum_pushes(rows):
    width = len(rows[0])
    floor, goals, boxes, player = set(), set(), [], None
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            i = r * width + c
            if ch != '#':
                floor.add(i)
            if ch in '.+*':
                goals.add(i)
            if ch in '$*':
                boxes.append(i)
            if ch in '@+':
                player = i
    dirs = (-width, width, -1, 1)
    live = set(goals)
    q = deque(goals)
    while q:
        i = q.popleft()
        for d in dirs:
            if i - d in floor and i - 2 * d in floor and i - d not in live:
                live.add(i - d)
                q.append(i - d)

    def reachable(p, crates):
        seen = {p}
        todo = [p]
        for i in todo:
            for d in dirs:
                j = i + d
                if j in floor and j not in crates and j not in seen:
                    seen.add(j)
                    todo.append(j)
        return seen

    boxes = tuple(sorted(boxes))
    region = reachable(player, boxes)
    q = deque([(boxes, region, 0)])
    seen = {(boxes, min(region))}
    while q:
        crates, region, depth = q.popleft()
        if set(crates) == goals:
            return depth, len(seen)
        for b in crates:
            for d in dirs:
                to = b + d
                if b - d not in region or to not in live or to in crates:
                    continue
                new_crates = tuple(sorted((set(crates) - {b}) | {to}))
                new_region = reachable(b, new_crates)
                key = (new_crates, min(new_region))
                if key not in seen:
                    seen.add(key)
                    q.append((new_crates, new_region, depth + 1))
    raise AssertionError('unsolvable')


if __name__ == '__main__':
    results = []
    for level in json.loads((ROOT / 'crate-levels.json').read_text())['levels']:
        if level['pond'] <= 30:
            continue
        pushes, states = minimum_pushes(level['rows'])
        assert pushes == level['optimalPushes'], (level['pond'], pushes, level['optimalPushes'])
        result = {'pond': level['pond'], 'optimalPushes': pushes, 'pushStates': states}
        results.append(result)
        print(json.dumps(result), flush=True)
    print(json.dumps({'verified': len(results), 'method': 'exact push BFS with free-walk region collapse'}))
