/* v4.3 crate ponds; v5.0: every 5th pond of 150 (every 10th is a gate, every 30th a world gate, 150 the finale).
 * Three lilies: Packed / Clean run (no Undo, no Restart) / Par. After 3 Restarts "Show me" replays the
 * solution and gives the Packed lily only. Par earns +1 orange for the next pond (not on the finale).
 * Rules live in crates.js; this file renders and routes input. Owned by app.js through a small context. */
import { parseLevel, newCrateState, stepCrate, walkPath, deadlocks, packedCount, isCrateSolved, awardCrate, FRUITS, SHOW_ME_AFTER } from "./crates.js";
import { lilyImg, lilyCount } from "./rewards.js";
import { isGate, isWorldGate, pondLabel, FINALE_POND, POND_COUNT } from "./roles.js";
import { crateScore, recordScore } from "./score.js";
const DIRS = { U: "up", D: "down", L: "left", R: "right" };
export function crateLilyDetails(record, par, newly = null, shown = false) {
  return `<div class="lily-details crate-lilies">${["Packed", "Clean run", `Par · ${par} moves`].map((t, i) => {
    const k = ["cleared", "noMistakes", "underTarget"][i],
      sub = ["Every fruit in a crate", "No Undo, no Restart", "Earns +1 orange"][i];
    return `<div class="lily-condition" data-lily="${k}" data-earned="${record?.[k] === true}">${lilyImg(record?.[k])}<strong>${t}</strong><small>${newly?.[i] ? "Collected" : record?.[k] ? "Already yours" : shown && i ? "Solve it yourself for this lily" : sub}</small></div>`;
  }).join("")}</div>`;
}
const FRUIT_SRC = (k) => `assets/crates/${k}.svg`;
const STEP_MS = 85;
export function createBonus(ctx) {
  let levels = null,
    L = null,
    def = null,
    afterPond = null,
    s = null,
    history = [],
    walkTimer = null,
    swipe = null,
    finished = false,
    stuckShown = "",
    solveTimer = null,
    pond = null,
    restarts = 0,
    dirty = false,
    shown = false,
    replaying = false,
    startedAt = null,
    pausedAt = null,
    lastWin = null;
  const P = () => ctx.progress();
  async function ensureLevels() {
    if (!levels) {
      const res = await fetch("./crate-levels.json");
      if (!res.ok) throw Error("crate levels");
      levels = (await res.json()).levels;
    }
    return levels;
  }
  const levelFor = (id) => levels?.find((l) => l.pond === id) || null;
  const xy = (i) => [Math.floor(i / L.n), i % L.n];
  const thumbFor = (id) => {
    const lv = levelFor(id);
    return lv ? thumbHTML(parseLevel(lv)) : "";
  };
  const levelInfo = (id) => levelFor(id);
  function thumbHTML(T) {
    const cell = (i) =>
      T.rocks.includes(i)
        ? '<i class="t-rock"></i>'
        : T.start.crates.includes(i)
          ? '<i class="t-crate"></i>'
          : T.goals.includes(i)
            ? `<i class="t-fruit" style="background-image:url(${FRUIT_SRC(T.fruit[i])})"></i>`
            : T.start.player === i
              ? `<i class="t-capy" style="background-image:url(${ctx.capySprite()})"></i>`
              : "<i></i>";
    return `<div class="bonus-thumb" style="--n:${T.n}" aria-hidden="true">${Array.from({ length: T.n * T.n }, (_, i) => cell(i)).join("")}</div>`;
  }
  async function open(id) {
    await ensureLevels();
    def = levelFor(id);
    if (!def) return false;
    pond = id;
    afterPond = id;
    restarts = 0;
    dirty = false;
    shown = false;
    replaying = false;
    startedAt = null; pausedAt = null;
    lastWin = null;
    L = parseLevel(def);
    s = newCrateState(L);
    history = [];
    finished = false;
    stuckShown = "";
    clearTimeout(walkTimer);
    clearTimeout(solveTimer);
    ctx.setView("bonus");
    render();
    if (!P().bonus.controlsSeen) controlsCard(true);
    return true;
  }
  function spriteStyle(i) {
    const [r, c] = xy(i);
    return `--r:${r};--c:${c}`;
  }
  function render() {
    const next = pond + 1,
      dpad = P().bonus.dpad,
      gate = isGate(pond),
      rec = P().lilies[pond];
    ctx.shell(
      `crate-screen ${dpad ? "with-dpad" : ""}`,
      `<header class="bonus-header"><button class="bonus-round leave" data-action="bonusLeave" aria-label="Leave crate pond"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button><div class="bonus-title"><h2>${pondLabel(pond)}</h2><span class="bonus-tag ${gate ? "gate-tag" : ""}">${pond === FINALE_POND ? "Finale" : isWorldGate(pond) ? "World gate" : gate ? "Spring gate" : "Crate pond"}</span></div><button class="bonus-round" data-action="pause" aria-label="Pause">Ⅱ</button><button class="bonus-round" data-action="bonusRestart" aria-label="Restart crate pond"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4v4h-4"/></svg></button></header><div class="bonus-stats"><span><small>Moves</small><b data-stat="moves">0</b></span><span><small>Pushes</small><b data-stat="pushes">0</b></span><span><small>Par</small><b>${def.par}</b></span></div><div class="pond-wrap crate-wrap" style="--board-max:${ctx.boardMax(L.n)}px;--board-width:${ctx.boardWidth()};--board-viewport-width:${ctx.boardViewport()}"><div class="crate-board" role="group" aria-label="${L.n} by ${L.n} crate pond" style="--n:${L.n}">${Array.from({ length: L.n * L.n }, (_, i) => {
        const rock = L.rocks.includes(i),
          goal = L.goals.includes(i);
        return `<button class="crate-cell ${rock ? "is-rock" : ""} ${goal ? "goal" : ""}" data-action="crateTap" data-ci="${i}" aria-label="Row ${Math.floor(i / L.n) + 1}, column ${(i % L.n) + 1}${rock ? ", rock" : goal ? `, ${L.fruit[i]}` : ""}" ${rock ? 'aria-disabled="true"' : ""}>${rock ? '<img class="rock-art" src="assets/rock.png" alt="">' : goal ? `<img class="fruit-target" src="assets/crates/${L.fruit[i]}-target.svg" alt="">` : ""}</button>`;
      }).join("")}<div class="crate-layer" aria-hidden="true">${s.crates.map((c, k) => `<span class="crate-sprite" data-k="${k}" style="${spriteStyle(c)}"><img class="crate-img" src="assets/crates/crate.svg" alt=""><img class="crate-packed-img" src="assets/crates/crate-packed.svg" alt=""><img class="crate-fruit" src="assets/crates/watermelon.svg" alt=""></span>`).join("")}<span class="crate-player" style="${spriteStyle(s.player)}"><img src="${ctx.capySprite()}" alt=""></span></div></div></div><div class="crate-packed-pill" role="status" aria-live="polite"><span class="pill-fruits">${L.goals.map((g) => `<img data-fruit="${g}" src="${FRUIT_SRC(L.fruit[g])}" alt="${L.fruit[g]}">`).join("")}</span><strong data-stat="packed">0/3 packed</strong></div><p class="bonus-hint">Push crates onto fruit · swipe to walk</p><div class="bonus-stuck" role="alert" hidden><span><strong>That crate is stuck</strong><small>It can't reach a fruit from there.</small></span><button data-action="bonusUndo">Undo?</button></div><div class="crate-showme" hidden><span><strong>Want a hand?</strong><small>Watch the solution · gives the Packed lily only</small></span><button data-action="bonusShowMe">Show me</button></div><div class="bonus-controls"><button class="undo-round" data-action="bonusUndo" aria-label="Undo"><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24H11m0 0 12-12M11 24l12 12"/></svg></span><strong>Undo</strong></button>${dpad ? dpadHTML() : `<div class="bonus-capy-chip"><img src="${ctx.capySprite()}" alt=""><span>Your capy · ${ctx.capyName()}</span></div>`}<button class="undo-round" data-action="bonusRestart" aria-label="Restart"><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M36 24a12 12 0 1 1-3.5-8.5"/><path d="M34 9v7h-7"/></svg></span><strong>Restart</strong></button></div><div class="bonus-leave-card"><span><strong>Lilies · ${lilyCount(rec)}/3</strong><small>Packed · Clean run · Par ${def.par}</small></span><em>${pond === FINALE_POND ? "The finale" : `Par → +1 orange for Pond ${next}`}</em></div>`,
    );
    update();
  }
  const dpadHTML = () =>
    `<div class="bonus-dpad" role="group" aria-label="D-pad">${[["up", "M6 15l6-6 6 6"], ["left", "M15 6l-6 6 6 6"], ["right", "M9 6l6 6-6 6"], ["down", "M6 9l6 6 6-6"]].map(([d, p]) => `<button class="dpad-${d}" data-action="bonusDir" data-dir="${d}" aria-label="Step ${d}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg></button>`).join("")}</div>`;
  function update(landedAt = null) {
    const root = ctx.root;
    root.querySelector('[data-stat="moves"]').textContent = s.moves;
    root.querySelector('[data-stat="pushes"]').textContent = s.pushes;
    const packed = packedCount(L, s);
    root.querySelector('[data-stat="packed"]').textContent = `${packed}/3 packed`;
    const stuck = new Set(deadlocks(L, s));
    s.crates.forEach((c, k) => {
      const el = root.querySelector(`.crate-sprite[data-k="${k}"]`),
        on = L.goals.includes(c);
      el.setAttribute("style", spriteStyle(c));
      el.classList.toggle("packed", on);
      el.classList.toggle("stuck", stuck.has(c));
      const f = el.querySelector(".crate-fruit");
      if (on) f.src = FRUIT_SRC(L.fruit[c]);
      if (landedAt === c) {
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
        setTimeout(() => el.classList.remove("pop"), 650);
      }
    });
    root.querySelectorAll(".crate-cell.goal").forEach((cell) => cell.classList.toggle("filled", s.crates.includes(Number(cell.dataset.ci))));
    root.querySelectorAll(".pill-fruits img").forEach((img) => img.classList.toggle("got", s.crates.includes(Number(img.dataset.fruit))));
    const player = root.querySelector(".crate-player");
    player.setAttribute("style", spriteStyle(s.player));
    player.classList.toggle("face-left", s.face === "left");
    const banner = root.querySelector(".bonus-stuck"),
      key = [...stuck].join(",");
    banner.hidden = !stuck.size;
    if (stuck.size && key !== stuckShown) ctx.vibrate("locked");
    stuckShown = key;
    root.querySelectorAll('[data-action="bonusUndo"]').forEach((b) => (b.disabled = !history.length || replaying));
    const pauseButton = root.querySelector('[data-action="pause"]');
    if(pauseButton) pauseButton.disabled = replaying || finished;
    const help = root.querySelector(".crate-showme");
    if (help) help.hidden = !(restarts >= SHOW_ME_AFTER) || replaying || finished;
    root.querySelector(".crate-screen")?.classList.toggle("replaying", replaying);
  }
  function commit(dir, record = true) {
    if (finished) return false;
    startedAt ??= performance.now(); // v5.0 score clock: from the first move (or Show me) to the solve
    const r = stepCrate(L, s, dir);
    if (!r.moved) {
      const p = ctx.root.querySelector(".crate-player");
      p?.classList.remove("nudge");
      void p?.offsetWidth;
      p?.classList.add("nudge");
      return false;
    }
    if (record) history.push(s);
    s = { ...r.state, face: dir === "left" ? "left" : dir === "right" ? "right" : s.face };
    if (r.pushed) ctx.vibrate(r.landed ? "crateLand" : "cratePush");
    update(r.landed ? r.crate : null);
    if (isCrateSolved(L, s)) win();
    return true;
  }
  function stopWalk() {
    clearTimeout(walkTimer);
    walkTimer = null;
  }
  function step(dir) {
    if (replaying) return;
    stopWalk();
    commit(dir);
  }
  function walkTo(i) {
    if (replaying) return;
    stopWalk();
    const path = walkPath(L, s, i);
    if (!path) {
      const cell = ctx.root.querySelector(`[data-ci="${i}"]`);
      cell?.classList.remove("nope");
      void cell?.offsetWidth;
      cell?.classList.add("nope");
      return;
    }
    if (!path.length) return;
    history.push(s); // one undo step for the whole walk
    const run = (k) => {
      if (k >= path.length || view() !== "bonus") return stopWalk();
      commit(path[k], false);
      walkTimer = setTimeout(() => run(k + 1), STEP_MS);
    };
    run(0);
  }
  const view = () => ctx.getView();
  function undo() {
    stopWalk();
    if (!history.length || finished || replaying) return;
    dirty = true;
    s = history.pop();
    update();
  }
  function restart() {
    stopWalk();
    if (finished || replaying) return;
    if (s.moves) {
      history.push(s);
      restarts++;
      dirty = true;
    }
    s = newCrateState(L);
    update();
  }
  // "Show me": replays the stored optimal solution from the start. Only the Packed lily can be earned.
  function showMe() {
    if (finished || replaying || restarts < SHOW_ME_AFTER) return;
    stopWalk();
    shown = true;
    replaying = true;
    history = [];
    s = newCrateState(L);
    update();
    const moves = [...def.solution].map((c) => DIRS[c.toUpperCase()]);
    const run = (k) => {
      if (view() !== "bonus") return stopWalk();
      if (k >= moves.length || finished) return;
      commit(moves[k], false);
      walkTimer = setTimeout(() => run(k + 1), STEP_MS * 2);
    };
    walkTimer = setTimeout(() => run(0), 400);
  }
  function win() {
    finished = true;
    replaying = false;
    stopWalk();
    lastWin = { moves: s.moves, shown, ...awardCrate(P(), pond, def.par, { moves: s.moves, clean: !dirty, shown }) };
    const seconds = startedAt === null ? 0 : (performance.now() - startedAt) / 1000;
    lastWin.score = recordScore(P(), pond, crateScore({ id: pond, moves: s.moves, par: def.par, seconds, shown }));
    ctx.afterScore?.(pond);
    ctx.persist();
    ctx.vibrate("solve");
    ctx.root.querySelector(".crate-board")?.classList.add("all-packed");
    update();
    solveTimer = setTimeout(() => view() === "bonus" && reward(), 900);
  }
  function reward() {
    const next = pond + 1,
      w = lastWin,
      finale = pond === FINALE_POND,
      gate = isGate(pond),
      r = P().lilies[pond],
      orange = w.par && !finale;
    ctx.setView("bonusReward");
    ctx.shell(
      `bonus-reward crate-pond-reward ${finale ? "finale-reward" : gate ? "gate-reward" : ""}`,
      `<span class="bonus-tag reward-tag">${pondLabel(pond)}</span><h1>${finale ? "The Hot Spring is complete!" : isWorldGate(pond) ? "World gate open!" : gate ? "Spring gate open!" : "Fruit packed!"}</h1><p class="reward-sub">${finale ? `${ctx.capyName()} packed the last crate of all ${POND_COUNT} ponds` : isWorldGate(pond) ? "A new world opens · your Hot Spring grew" : gate ? "Your Hot Spring grew" : w.shown ? "Watched the solution · Packed lily" : `${ctx.capyName()} packed every fruit`}</p><div class="reward-scene"><img class="reward-bg" src="assets/v6/celebration-pool.jpg" alt=""><img class="reward-capy" src="${ctx.capySprite()}" alt=""><div class="reward-crates">${FRUITS.map((f) => `<span><img src="assets/crates/crate-packed.svg" alt=""><img class="reward-fruit" src="${FRUIT_SRC(f)}" alt="${f}"></span>`).join("")}</div></div><section class="solve-lilies crate-reward-lilies" aria-label="Lilies for this crate pond"><strong>Lilies for this pond · ${lilyCount(r)}/3</strong>${crateLilyDetails(r, def.par, w.newly, w.shown)}</section>${orange ? `<section class="reward-orange"><i class="orange spare big" aria-hidden="true"></i><span><strong>+1 orange</strong><small>for Pond ${next}</small><em>${w.granted ? "Saves you once." : "Already waiting · no stacking"}</em><small class="reward-fine">Next pond only · no stacking</small></span></section>` : ""}<p class="pond-score" data-score="${w.score.score}"><span>Pond score</span><strong>${w.score.score.toLocaleString("en-US")}</strong><small>${w.score.newBest ? (w.score.previous === null ? "First score" : "New best!") : `Best ${w.score.best.toLocaleString("en-US")}`}${w.shown ? " · Show me halves it" : ""}</small></p><p class="reward-moves"><strong>${w.shown ? "Solution shown" : `${w.moves} moves · par ${def.par}`}</strong><br><small>${w.shown ? "Solve it yourself for Clean run and Par" : `Best path ${def.optimalMoves} moves`}</small></p><button class="primary" data-action="bonusContinue" data-level="${finale ? 0 : next}">${finale ? "Finish" : `Continue → Pond ${next}`}</button>`,
    );
  }
  function controlsCard(first = false) {
    const dpad = P().bonus.dpad;
    ctx.setModal("bonusControls");
    ctx.root.querySelector(".bonus-controls-sheet")?.remove();
    ctx.root
      .querySelector(".screen")
      .insertAdjacentHTML(
        "beforeend",
        `<div class="shade bonus-controls-sheet"><section class="dialog bonus-controls-dialog" role="dialog" aria-modal="true" aria-labelledby="move-title"><div class="move-head"><h2 id="move-title">Move your way</h2><small>Goal: crates onto fruit</small></div><div class="move-toggle" role="radiogroup" aria-label="Controls"><button data-action="bonusSetDpad" data-on="false" role="radio" aria-checked="${!dpad}">Swipe</button><button data-action="bonusSetDpad" data-on="true" role="radio" aria-checked="${dpad}">D-pad</button></div><ol class="move-steps"><li><strong>Swipe the board</strong><small>One step per swipe${dpad ? " (or use the D-pad)" : ""}</small></li><li><strong>Tap a tile</strong><small>Your capy walks there, never pushes</small></li><li><strong>Undo anytime</strong><small>No penalty, ever</small></li></ol><p class="move-note">Your capy pushes one crate at a time. A fruit jumps into its crate when it lands.</p><button class="primary" data-action="bonusControlsDone">Got it</button></section></div>`,
      );
  }
  function handle(b) {
    const a = b.dataset.action;
    if (!a?.startsWith("bonus") && a !== "crateTap") return false;
    if (ctx.getModal() === "bonusControls" && !["bonusSetDpad", "bonusControlsDone"].includes(a)) return true;
    switch (a) {
      case "bonusLeave":
        stopWalk();
        replaying = false;
        clearTimeout(solveTimer);
        ctx.leave(pond);
        break;
      case "bonusContinue":
        ctx.continueTo(Number(b.dataset.level), pond);
        break;
      case "bonusShowMe":
        showMe();
        break;
      case "bonusUndo":
        undo();
        break;
      case "bonusRestart":
        restart();
        break;
      case "bonusDir":
        step(b.dataset.dir);
        break;
      case "crateTap":
        if (view() === "bonus" && !ctx.getModal()) walkTo(Number(b.dataset.ci));
        break;
      case "bonusSetDpad":
        P().bonus.dpad = b.dataset.on === "true";
        ctx.persist();
        controlsCard();
        break;
      case "bonusControlsDone":
        P().bonus.controlsSeen = true;
        ctx.persist();
        ctx.setModal(null);
        render();
        break;
      case "bonusHelp":
        controlsCard();
        break;
    }
    return true;
  }
  // Swipes anywhere on the board (one step per swipe). Taps fall through to the cell buttons (walk).
  function pointerDown(e) {
    if (view() !== "bonus" || ctx.getModal() || !e.isPrimary || !e.target.closest(".crate-wrap")) return;
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }
  function pointerUp(e) {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x,
      dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }
  function keydown(e) {
    if (view() !== "bonus" || ctx.getModal()) return false;
    const d = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" }[e.key];
    if (d) {
      e.preventDefault();
      step(d);
      return true;
    }
    if (replaying) return true;
    if (e.key === "z" || e.key === "Backspace") {
      e.preventDefault();
      undo();
      return true;
    }
    return false;
  }
  return {
    ensureLevels,
    thumbFor,
    levelInfo,
    open,
    handle,
    keydown,
    pointerDown,
    pointerUp,
    pointerCancel: () => (swipe = null),
    pause: () => { stopWalk(); if(pausedAt===null) pausedAt=performance.now(); },
    resume: () => { if(pausedAt!==null&&startedAt!==null) startedAt+=performance.now()-pausedAt;pausedAt=null; },
    debug: () => ({ level: def?.id, pond, restarts, dirty, shown, replaying, par: def?.par, solution: def?.solution, afterPond, state: s && { ...s, crates: [...s.crates] }, history: history.length, finished, stuck: L && s ? deadlocks(L, s) : [] }),
    stop: () => {
      stopWalk();
      clearTimeout(solveTimer);
    },
  };
}
