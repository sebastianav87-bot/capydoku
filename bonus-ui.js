/* v4.2 crate bonus screens: offer card (on the "Next pond" transition), play, controls card, reward.
 * Rules live in crates.js; this file only renders and routes input. Owned by app.js through a small context. */
import { parseLevel, newCrateState, stepCrate, walkPath, deadlocks, packedCount, isCrateSolved, BONUS_AFTER, grantSpare, FRUITS } from "./crates.js";
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
    solveTimer = null;
  const P = () => ctx.progress();
  async function ensureLevels() {
    if (!levels) {
      const res = await fetch("./crate-levels.json");
      if (!res.ok) throw Error("crate levels");
      levels = (await res.json()).levels;
    }
    return levels;
  }
  const levelFor = (pond) => levels?.find((l) => l.afterPond === pond) || null;
  const xy = (i) => [Math.floor(i / L.n), i % L.n];
  function offerHTML(fromPond, nextId) {
    const lv = BONUS_AFTER[fromPond] ? levelFor(fromPond) : null;
    if (!lv) return "";
    const b = P().bonus,
      name = ctx.capyName(),
      done = b.solved.includes(lv.id),
      ready = b.spare?.forPond === nextId;
    return `<section class="bonus-offer" aria-label="Optional bonus pond"><div class="bonus-offer-top"><span class="bonus-tag">Bonus pond</span><small>Optional</small></div><div class="bonus-offer-body">${thumbHTML(parseLevel(lv))}<div class="bonus-offer-copy"><strong>Pack the fruit<br>with ${name}</strong><small>Uses your current capy</small><span class="bonus-orange-line"><i class="orange spare" aria-hidden="true"></i><span>${ready ? `Spare orange ready<small>for Pond ${nextId} · no stacking</small>` : `+1 orange<small>for Pond ${nextId}</small>`}</span></span>${done ? `<small class="bonus-done">Packed ✓ · best ${b.best[lv.id] ?? lv.optimalMoves} moves</small>` : ""}</div></div><button class="bonus-play" data-action="bonusPlay" data-after="${fromPond}">Play bonus</button></section><p class="bonus-skip"><strong>Skipping costs nothing.</strong><br><small>Bonus ponds never block your progress.</small></p>`;
  }
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
  async function open(fromPond) {
    await ensureLevels();
    def = levelFor(fromPond);
    if (!def) return false;
    afterPond = fromPond;
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
    const next = afterPond + 1,
      dpad = P().bonus.dpad;
    ctx.shell(
      `crate-screen ${dpad ? "with-dpad" : ""}`,
      `<header class="bonus-header"><button class="bonus-round leave" data-action="bonusLeave" aria-label="Leave bonus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button><div class="bonus-title"><h2>Bonus pond</h2><span class="bonus-tag">Optional</span></div><button class="bonus-round" data-action="bonusRestart" aria-label="Restart bonus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4v4h-4"/></svg></button></header><div class="bonus-stats"><span><small>Moves</small><b data-stat="moves">0</b></span><span><small>Pushes</small><b data-stat="pushes">0</b></span><span><small>Par</small><b>${def.par}</b></span></div><div class="pond-wrap crate-wrap" style="--board-max:${ctx.boardMax(L.n)}px;--board-width:${ctx.boardWidth()};--board-viewport-width:${ctx.boardViewport()}"><div class="crate-board" role="group" aria-label="${L.n} by ${L.n} crate pond" style="--n:${L.n}">${Array.from({ length: L.n * L.n }, (_, i) => {
        const rock = L.rocks.includes(i),
          goal = L.goals.includes(i);
        return `<button class="crate-cell ${rock ? "is-rock" : ""} ${goal ? "goal" : ""}" data-action="crateTap" data-ci="${i}" aria-label="Row ${Math.floor(i / L.n) + 1}, column ${(i % L.n) + 1}${rock ? ", rock" : goal ? `, ${L.fruit[i]}` : ""}" ${rock ? 'aria-disabled="true"' : ""}>${rock ? '<img class="rock-art" src="assets/rock.png" alt="">' : goal ? `<img class="fruit-target" src="assets/crates/${L.fruit[i]}-target.svg" alt="">` : ""}</button>`;
      }).join("")}<div class="crate-layer" aria-hidden="true">${s.crates.map((c, k) => `<span class="crate-sprite" data-k="${k}" style="${spriteStyle(c)}"><img class="crate-img" src="assets/crates/crate.svg" alt=""><img class="crate-packed-img" src="assets/crates/crate-packed.svg" alt=""><img class="crate-fruit" src="assets/crates/watermelon.svg" alt=""></span>`).join("")}<span class="crate-player" style="${spriteStyle(s.player)}"><img src="${ctx.capySprite()}" alt=""></span></div></div></div><div class="crate-packed-pill" role="status" aria-live="polite"><span class="pill-fruits">${L.goals.map((g) => `<img data-fruit="${g}" src="${FRUIT_SRC(L.fruit[g])}" alt="${L.fruit[g]}">`).join("")}</span><strong data-stat="packed">0/3 packed</strong></div><p class="bonus-hint">Push crates onto fruit · swipe to walk</p><div class="bonus-stuck" role="alert" hidden><span><strong>That crate is stuck</strong><small>It can't reach a fruit from there.</small></span><button data-action="bonusUndo">Undo?</button></div><div class="bonus-controls"><button class="undo-round" data-action="bonusUndo" aria-label="Undo"><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24H11m0 0 12-12M11 24l12 12"/></svg></span><strong>Undo</strong></button>${dpad ? dpadHTML() : `<div class="bonus-capy-chip"><img src="${ctx.capySprite()}" alt=""><span>Your capy · ${ctx.capyName()}</span></div>`}<button class="undo-round" data-action="bonusRestart" aria-label="Restart"><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M36 24a12 12 0 1 1-3.5-8.5"/><path d="M34 9v7h-7"/></svg></span><strong>Restart</strong></button></div><div class="bonus-leave-card"><span><strong>Leave anytime</strong><small>Back to Pond ${next}, nothing lost</small></span><em>+1 orange if solved</em></div>`,
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
    root.querySelectorAll('[data-action="bonusUndo"]').forEach((b) => (b.disabled = !history.length));
  }
  function commit(dir, record = true) {
    if (finished) return false;
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
    stopWalk();
    commit(dir);
  }
  function walkTo(i) {
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
    if (!history.length || finished) return;
    s = history.pop();
    update();
  }
  function restart() {
    stopWalk();
    if (finished) return;
    if (s.moves) history.push(s);
    s = newCrateState(L);
    update();
  }
  function win() {
    finished = true;
    stopWalk();
    const b = P().bonus,
      first = !b.solved.includes(def.id);
    if (first) b.solved.push(def.id);
    b.solved.sort();
    b.best[def.id] = Math.min(b.best[def.id] ?? Infinity, s.moves);
    const already = b.spare?.forPond === afterPond + 1,
      granted = grantSpare(b, afterPond);
    ctx.persist();
    ctx.vibrate("solve");
    ctx.root.querySelector(".crate-board")?.classList.add("all-packed");
    solveTimer = setTimeout(() => view() === "bonus" && reward(granted, already), 900);
  }
  function reward(granted, already) {
    const next = afterPond + 1;
    ctx.setView("bonusReward");
    ctx.shell(
      "bonus-reward",
      `<span class="bonus-tag reward-tag">Bonus pond</span><h1>Fruit packed!</h1><p class="reward-sub">${ctx.capyName()} earned you a spare orange</p><div class="reward-scene"><img class="reward-bg" src="assets/v6/celebration-pool.jpg" alt=""><img class="reward-capy" src="${ctx.capySprite()}" alt=""><div class="reward-crates">${FRUITS.map((f) => `<span><img src="assets/crates/crate-packed.svg" alt=""><img class="reward-fruit" src="${FRUIT_SRC(f)}" alt="${f}"></span>`).join("")}</div></div><section class="reward-orange"><i class="orange spare big" aria-hidden="true"></i><span><strong>+1 orange</strong><small>for Pond ${next}</small><em>${granted ? "Saves you once." : already ? "Already waiting · no stacking" : "Saves you once."}</em><small class="reward-fine">Next pond only · no stacking</small></span></section><p class="reward-moves"><strong>${s.moves} moves · best path ${def.optimalMoves}</strong><br><small>Extra fun · not part of 100%</small></p><button class="primary" data-action="bonusContinue" data-level="${next}">Continue → Pond ${next}</button><button data-action="bonusReplay" data-after="${afterPond}">Replay bonus</button>`,
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
      case "bonusPlay":
      case "bonusReplay":
        open(Number(b.dataset.after));
        break;
      case "bonusLeave":
        stopWalk();
        clearTimeout(solveTimer);
        ctx.leave(afterPond + 1, afterPond);
        break;
      case "bonusContinue":
        ctx.continueTo(Number(b.dataset.level));
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
    if (e.key === "z" || e.key === "Backspace") {
      e.preventDefault();
      undo();
      return true;
    }
    return false;
  }
  return {
    ensureLevels,
    offerHTML,
    open,
    handle,
    keydown,
    pointerDown,
    pointerUp,
    pointerCancel: () => (swipe = null),
    debug: () => ({ level: def?.id, afterPond, state: s && { ...s, crates: [...s.crates] }, history: history.length, finished, stuck: L && s ? deadlocks(L, s) : [] }),
    stop: () => {
      stopWalk();
      clearTimeout(solveTimer);
    },
  };
}
