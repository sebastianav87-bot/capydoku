import { nickname, escapeHTML } from "./profile.js";
import {
  AttemptClock,
  awardLilies,
  lilyCount,
  totalLilies,
  lilyRow,
  lilyImg,
  lilyDetails,
  emptyLilies,
  duration,
  targetMs,
} from "./rewards.js";
import { BUILD } from "./build-info.js";
import { createUpdateManager, updateNotice } from "./updates.js";
import {
  mapNodes,
  bossState,
  bossAsset,
  mapBossAsset,
  MAP_HEIGHT,
  ruleCards,
  powerIcon,
  navHTML,
  navIcon,
  springScene,
  switchHTML,
  starterCards,
  firstUseHTML,
  powerToastHTML,
  WORLDS,
} from "./visuals-v4.js";
import { TUTORIAL_COPY, tutorialPlan, tutorialAllows } from "./tutorial.js";
import { colors } from "./theme.js";
import {
  CHARACTERS,
  sprite,
  pieceSprite,
  label as characterName,
  sceneSprite,
  powerIconSrc,
  powerIdentity,
  updateResponsiveCharacters,
} from "./characters.js";
import { sound, warmAudio } from "./audio.js";
import { PondMusic, MUSIC_TRACKS } from "./music.js";
import { boardMaxWidth, boardWidthCSS, boardViewportWidthCSS, sizingMode, landingAt, soakAt, reactionAt } from "./layout.js";
const music = new PondMusic();
let tutorial = null;
import {
  DOUBLE_TAP_MS,
  DRAG_THRESHOLD,
  DRAG_TICK_GAP,
  HAPTICS,
  paintMark,
  vibrate,
  boardSignature,
  rocksUnlocked,
  peers,
  violations,
  solved,
  load,
  save,
  unlocked,
  fresh,
  dailyPuzzle,
  calendarDay,
  dateKey,
  streakAt,
  finishDaily,
  cleanAttempt,
  isLocked,
  withLocks,
  dropWrongCapys,
  solutionCells,
} from "./core.js";
import {
  newAttempt,
  effectivePower,
  POWER_NAMES,
  canUsePower,
  usePower,
  attemptMove,
  undoAttempt,
  undoChanges,
  needsPowerIntro,
  rememberPowerIntro,
  awardPureBoss,
} from "./powers.js";
import { installCopy, isStandalone, isIOS } from "./platform.js";
import { createBonus, crateLilyDetails } from "./bonus-ui.js";
import { isBoss, isCrate, isGate, role, pondLabel, worldOf, GATE_PONDS, FINALE_POND, BREATHER_PONDS } from "./roles.js";
import { claimSpare } from "./crates.js";
const root = document.querySelector("#app"),
  storage = { getItem: (k) => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) };
const clock = new AttemptClock();
// v4.3 crate ponds (5/10/15/20/25/30) are part of the main path; this module plays them.
const bonus = createBonus({
  root,
  shell: (cls, inner) => shell(cls, inner),
  progress: () => progress,
  persist: () => persist(),
  vibrate: (kind) => vibrate(kind, progress.haptics),
  capyName: () => characterName(progress.selected),
  capySprite: () => sprite(progress.selected),
  boardMax: (n) => boardMaxWidth(n),
  boardWidth: () => boardWidthCSS(),
  boardViewport: () => boardViewportWidthCSS(),
  setView: (v) => {
    clock.pause();
    cancelTap();
    tutorial = null;
    roundToken++;
    modal = null;
    view = v;
  },
  getView: () => view,
  setModal: (m) => (modal = m),
  getModal: () => modal,
  leave: () => home(),
  continueTo: (id) => transition(id || null, null),
});
let versionNotice = null,
  nicknameEditing = false,
  lastLilyResult = null;
function syncClock() {
  if (state?.metrics && clock.metrics !== state.metrics) {
    clock.flush();
    state.metrics.elapsedMs = Math.max(state.metrics.elapsedMs, clock.metrics?.elapsedMs || 0);
    clock.bind(state.metrics);
  }
  clock.sync(view === "game" && !modal && !tutorial && !document.hidden);
}
function beginTiming() {
  if (tutorial || modal || view !== "game") return;
  clock.begin();
  syncClock();
}
let updates = null;
new MutationObserver(() => {
  updateResponsiveCharacters(root);
  syncClock();
  updates?.checkSafe();
}).observe(root, { childList: true, subtree: true });
window.addEventListener("resize", () => updateResponsiveCharacters(root));
let loaded = { progress: fresh(), readOnly: false },
  progress = loaded.progress,
  warning = null;
let data,
  puzzle,
  state,
  solveOrder = [],
  history = [],
  view = "home",
  isDaily = false,
  currentHint = null,
  pending = null,
  gesture = null,
  controlTap = null,
  cellTap = null,
  recentTaps = [],
  lastDragPointer = -1,
  lastDragTick = -Infinity,
  modal = null,
  toastTimer,
  roundToken = 0,
  chooserDraft = "Jun",
  installPrompt = null,
  powerNotice = false;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});

function persist() {
  music.configure({ enabled: progress.music });
  const ok = save(storage, progress, loaded.readOnly);
  if (!ok && !warning) warning = "Progress is not saving on this browser. Keep this tab open.";
  return ok;
}
function cancelTap() {
  if (pending) {
    clearTimeout(pending.timer);
    pending = null;
  }
}
function sessionKey() {
  return isDaily ? puzzle.id : `pond-${puzzle.id}`;
}
function saveRound() {
  if (tutorial?.replay) return;
  syncClock();
  clock.flush();
  progress.sessions[sessionKey()] = { ...state, cells: [...state.cells], signature: boardSignature(puzzle) };
  persist();
}
function shell(cls, inner) {
  root.innerHTML = `<section class="screen ${cls}">${inner}<div class="art-tag">AI illustration</div>${warning ? `<div class="persistent-warning" role="status">${warning}</div>` : ""}</section>`;
}
function capyBadge(where = "home") {
  return `<button class="capy-badge ${where === "game" ? "mini" : ""}" data-action="switchCapy" aria-label="Switch capy"><img src="${sprite(progress.selected)}" alt="">${where !== "game" ? `<span><strong>${progress.selected}</strong><small>${where === "collection" ? "Tap to switch" : "Your capy"}</small></span>` : ""}<b aria-hidden="true">⇄</b></button>`;
}
function chooser(first = false) {
  cancelTap();
  if (!first) {
    modal = "switch";
    root.querySelector(".chooser-overlay")?.remove();
    root
      .querySelector(".screen")
      .insertAdjacentHTML(
        "beforeend",
        `<div class="switch-scrim"></div><section class="chooser chooser-overlay switch-sheet" role="dialog" aria-modal="true" aria-label="Choose your capy">${switchHTML(progress.selected, chooserDraft)}</section>`,
      );
    return;
  }
  modal = null;
  view = "choose";
  shell(
    "chooser first-chooser",
    `<h1>Choose your capy</h1><p class="chooser-sub">A friend with a little power</p><div class="starter-cards">${starterCards(chooserDraft, null, true)}</div><p class="switch-anytime">Switch anytime with ⇄ or in the Hot Spring</p><button class="primary chooser-confirm" data-action="confirmCapy">Start with ${chooserDraft}</button>`,
  );
}

function closeChooser() {
  modal = null;
  root.querySelector(".chooser-overlay")?.remove();
  root.querySelector(".switch-scrim")?.remove();
}
function confirmCapy() {
  progress.selected = chooserDraft;
  progress.starterChosen = true;
  persist();
  const first = view === "choose";
  closeChooser();
  if (first || view === "home") home();
  else if (view === "collection") collection();
  else {
    renderGame();
    if (view === "solved") {
      roundToken++;
      animateJump();
    } else if (state.lives === 0) gameOver();
  }
}
// v4.3 rev b: there is no pond grid any more. "Home" IS the current pond's "Next pond" screen (the hub):
// level, world, grid size and Start, with Daily as a secondary button and Hot Spring / Settings as header icons.
// Replaying cleared ponds lives only in Settings › Progress.
const HUB_KEY = "capydoku.hub";
function rememberHub(on) {
  try {
    if (on) sessionStorage.setItem(HUB_KEY, "1");
    else sessionStorage.removeItem(HUB_KEY);
  } catch {}
}
function inProgress(id) {
  if (!id || isCrate(id)) return false;
  const q = data.levels[id - 1],
    saved = progress.sessions[`pond-${id}`];
  return !!(q && saved?.cells?.some(Boolean) && saved.signature === boardSignature(q) && saved.cells.length === q.n * q.n && !solved(q, saved.cells) && saved.lives > 0);
}
function currentPond() {
  return progress.completed.length >= 30 ? null : unlocked(progress);
}
// App launch: straight back into a pond that is in progress, otherwise the current pond's transition screen.
// (A reload while on the hub — e.g. an auto-update — stays on the hub.)
function launch() {
  let onHub = false;
  try {
    onHub = sessionStorage.getItem(HUB_KEY) === "1";
  } catch {}
  const next = currentPond();
  if (!onHub && inProgress(next)) start(next);
  else home();
}
function home() {
  bonus.stop();
  if (view === "game" && state && puzzle && !tutorial?.replay) saveRound();
  transition(currentPond());
}
function hubBar() {
  const n = totalLilies(progress), g = progress.goldenLilies.length;
  return `<header class="hub-bar"><div class="hub-brand"><strong>Capydoku</strong><span class="map-lily-total lily-chip" aria-label="${n} of 90 lilies, ${g} golden">${lilyImg(true)}${n}/90</span></div><div class="hub-icons">${navHTML(null, ["settings"])}</div></header>`;
}
// Designer home-start-A: Daily and Hot Spring as two tiles under the primary button.
function dailyButton() {
  const streak = streakAt(progress, calendarDay());
  return `<button class="hub-tile hub-daily" data-action="daily" aria-label="Daily Pond · ${streak}-day streak">${navIcon("daily")}<span><strong>Daily</strong><small>◕ ${streak}-day streak</small></span></button>`;
}
function hubTiles() {
  return `<div class="hub-tiles">${dailyButton()}<button class="hub-tile hub-spring" data-action="collection" aria-label="Hot Spring">${navIcon("collection")}<span><strong>Hot Spring</strong><small>${Object.keys(CHARACTERS).length} capys</small></span></button></div>`;
}
function hubCapy() {
  return `<div class="capy-wrap"><img class="transition-capy" src="${sprite(progress.selected, "portrait")}" alt=""><button class="capy-swap" data-action="switchCapy" aria-label="Switch capy">⇄</button></div>`;
}
// The "Next pond" transition (= the hub). Variants: normal, boss, new-world breather, crate, gate, finale and all-clear.
function transition(id) {
  bonus.stop();
  clock.pause();
  cancelTap();
  tutorial = null;
  roundToken++;
  modal = null;
  view = "home";
  rememberHub(true);
  if (!id || id > 30) {
    shell(
      "transition hub all-clear",
      `${hubBar()}<div class="transition-card"><small class="transition-kicker">Every pond cleared</small><h1>All 30 ponds ✓</h1><p>${totalLilies(progress)}/90 lilies · ${progress.goldenLilies.length}/3 golden</p><p class="transition-note">Replay any pond for more lilies in<br>Settings › Your pond collection.</p>${hubTiles()}</div>`,
    );
    showVersionNotice();
    return;
  }
  const q = data.levels[id - 1],
    boss = isBoss(id),
    k = worldOf(id),
    newWorld = BREATHER_PONDS.includes(id),
    r = progress.lilies[id] || emptyLilies(),
    bs = boss ? bossState(progress, id) : "",
    spare = progress.bonus.spare?.forPond === id,
    resume = inProgress(id);
  if (isCrate(id)) {
    crateTransition(id, k, r);
    showVersionNotice();
    return;
  }
  shell(
    `transition hub ${boss ? "boss-transition" : ""}`,
    `${hubBar()}<div class="transition-card" data-level="${id}" data-role="${role(id)}"><small class="transition-kicker">${resume ? "In progress" : newWorld ? "New world" : boss ? "Boss pond" : "Next pond"}</small><h1>${boss ? "Boss " : ""}Pond ${id}</h1><p class="transition-world">${WORLDS[k]} · ${q.n}×${q.n}${q.rocks.length ? ` · ${q.rocks.length} rock${q.rocks.length > 1 ? "s" : ""}` : ""}</p>${boss ? `<img class="transition-boss" src="${bossAsset(id, bs)}" alt=""><div class="boss-info"><strong>The world's toughest pond</strong><small>The crate gate after it grows your Hot Spring.<br>Clear it without your power for a golden lily.</small></div>` : hubCapy()}${newWorld ? '<p class="transition-note">A gentler pond to warm up in the new world.</p>' : ""}${spare ? `<p class="transition-spare"><i class="orange spare" aria-hidden="true"></i>Spare orange ready · from the crate pond</p>` : ""}<section class="solve-lilies transition-lilies" aria-label="Lilies for this pond"><strong>Lilies · ${lilyCount(r)}/3</strong>${lilyDetails(r, q.n)}</section><button class="primary" data-action="enterPond" data-level="${id}" data-entry-primary>${resume ? "Continue" : "Start"} ${boss ? "boss " : ""}pond ${id}</button>${hubTiles()}</div>`,
  );
  showVersionNotice();
}
// v4.3 crate pond / gate transition: a thumbnail of the crate board and its three lilies.
function crateTransition(id, k, r) {
  const lv = bonus.levelInfo(id),
    gate = isGate(id),
    finale = id === FINALE_POND;
  shell(
    `transition hub crate-transition ${gate ? "gate-transition" : ""}`,
    `${hubBar()}<div class="transition-card" data-level="${id}" data-role="${role(id)}"><small class="transition-kicker">${finale ? "The finale" : gate ? "World gate" : "Crate pond"}</small><h1>${pondLabel(id)}</h1><p class="transition-world">${WORLDS[k]} · ${lv ? `${lv.n}×${lv.n} · par ${lv.par}` : "crates"}</p><div class="crate-transition-art">${bonus.thumbFor(id)}</div><div class="boss-info crate-info"><strong>${finale ? "Pack the last crates of the pond" : gate ? "Pack the fruit to open the next world" : "Push every crate onto a fruit"}</strong><small>${gate ? "Clearing it grows your Hot Spring.<br>" : ""}${finale ? "No orange here · just the big finish." : "Make par for +1 orange on the next pond."}</small></div><section class="solve-lilies transition-lilies" aria-label="Lilies for this pond"><strong>Lilies · ${lilyCount(r)}/3</strong>${crateLilyDetails(r, lv?.par ?? "—")}</section><button class="primary" data-action="enterPond" data-level="${id}" data-entry-primary>Start crate pond ${id}</button>${hubTiles()}</div>`,
  );
}
function collection() {
  clock.pause();
  cancelTap();
  tutorial = null;
  roundToken++;
  view = "collection";
  modal = null;
  const tier = 1 + GATE_PONDS.filter((i) => progress.completed.includes(i)).length,
    friends = Object.keys(CHARACTERS).filter((n) => n !== progress.selected);
  shell(
    "collection",
    `<div class="pool crew-pool" data-tier="${tier}">${springScene(progress)}</div><div class="collection-title"><h1>Hot Spring</h1><p>Open a world gate to grow your spring</p><span class="tier-pill sr-only">Tier ${tier}</span></div><p class="friend-names sr-only" aria-label="Your Hot Spring friends">Friends · ${friends.join(" & ")}</p><div class="spring-invite"><strong>Tap a capy to switch</strong><small>Each friend brings one power</small></div><header class="spring-bar"><button class="spring-back" data-action="home" aria-label="Back to pond">‹ Pond</button><div class="hub-icons">${navHTML("collection", ["settings"])}</div></header>`,
  );
}
function start(id, daily = false, retry = false) {
  rememberHub(false);
  clock.pause();
  lastLilyResult = null;
  cancelTap();
  powerNotice = false;
  roundToken++;
  if (!daily && isCrate(id)) {
    // v4.3: crate ponds are played by the crate module, not the logic board.
    isDaily = false;
    bonus.open(id);
    return;
  }
  isDaily = daily;
  puzzle = daily ? dailyPuzzle(data, new Date(), rocksUnlocked(progress)) : data.levels[id - 1];
  if (!puzzle) return;
  if (!daily && id >= 21) {
    progress.rocksReached = true;
    persist();
  }
  const k = sessionKey(),
    saved = progress.sessions[k];
  state =
    !retry && saved && saved.signature === boardSignature(puzzle) && saved.cells.length === puzzle.n * puzzle.n
      ? dropWrongCapys(puzzle, { cells: [...saved.cells], lives: saved.lives, ...cleanAttempt(saved, saved.cells.length) })
      : newAttempt(puzzle.n);
  // v4.2: a spare orange earned in the crate bonus joins the first attempt on the pond it was earned for.
  if (!daily && claimSpare(progress.bonus, puzzle.id)) state = { ...state, spare: 1 };
  state = withLocks(puzzle, state);
  clock.bind(state.metrics);
  view = "game";
  saveRound();
  solveOrder = state.cells.flatMap((v, i) => (v === 2 ? [i] : []));
  history = [];
  currentHint = null;
  modal = null;
  view = "game";
  renderGame();
  if (solved(puzzle, state.cells)) {
    view = "solved";
    renderGame();
    animateJump();
  } else if (state.lives === 0) gameOver();
  if (!modal) maybeRockIntro();
  if (!daily && id === 1 && !progress.tutorialSeen && view === "game") startTutorial(false);
}
function pattern(z) {
  const stroke = "rgba(255,255,255,.40)";
  let body = "";
  if (z === 0)
    body = `<circle cx="15" cy="15" r="2.2" fill="${stroke}"/><circle cx="45" cy="18" r="2.2" fill="${stroke}"/><circle cx="28" cy="42" r="2.2" fill="${stroke}"/>`;
  if (z === 1) body = `<path d="M10 18h16M34 18h16M12 40h14M36 40h14" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (z === 2)
    body = `<ellipse cx="18" cy="22" rx="7" ry="3.5" fill="${stroke}" transform="rotate(-20 18 22)"/><ellipse cx="42" cy="40" rx="6" ry="3" fill="${stroke}" transform="rotate(25 42 40)"/>`;
  if (z === 3) body = `<path d="M14 46l12-12M30 48l14-14M12 28l10-10" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (z === 4)
    body = `<circle cx="20" cy="22" r="6" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="42" cy="40" r="5" fill="none" stroke="${stroke}" stroke-width="2"/>`;
  if (z === 5) body = `<path d="M18 10v16M18 34v16M42 12v14M42 36v14" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (z === 6) body = `<path d="M12 16l5 7-5 7M34 34l5 7-5 7" fill="none" stroke="${stroke}" stroke-width="2.2"/>`;
  // v4.3: patterns for zones 8-10 (9×9 and 10×10 boards).
  // Designer v4.3 check: open squares (the old small crosses read like player × marks).
  if (z === 7) body = `<rect x="13" y="13" width="10" height="10" rx="1.5" fill="none" stroke="${stroke}" stroke-width="2.2"/><rect x="37" y="35" width="10" height="10" rx="1.5" fill="none" stroke="${stroke}" stroke-width="2.2"/>`;
  if (z === 8) body = `<path d="M18 12l6 10H12zM42 34l6 10H36z" fill="${stroke}"/>`;
  if (z === 9) body = `<path d="M18 12l6 7-6 7-6-7zM42 34l6 7-6 7-6-7z" fill="none" stroke="${stroke}" stroke-width="2.2"/>`;
  return `<svg class="pat" viewBox="0 0 60 60" aria-hidden="true">${body}</svg>`;
}
function peekVisible() {
  const i = state.power.peekCell;
  return i !== null && state.cells[i] === 0 && !puzzle.rocks.includes(i) && !state.cells.some((v, j) => v === 2 && peers(puzzle, i, j));
}
function boardHTML() {
  const bad = violations(puzzle, state.cells);
  return `<div class="pond-wrap" data-sizing-mode="${sizingMode()}" data-n="${puzzle.n}" data-level="${isDaily ? "daily" : puzzle.id}" style="--board-max:${boardMaxWidth(puzzle.n)}px;--board-width:${boardWidthCSS()};--board-viewport-width:${boardViewportWidthCSS()}"><div class="zone-grid" role="group" aria-label="${puzzle.n} by ${puzzle.n} pond" style="--n:${puzzle.n}">${state.cells
    .map((v, i) => {
      const rock = puzzle.rocks.includes(i),
        locked = isLocked(puzzle, state, i),
        isbad = bad.has(i),
        hi = state.power.peekCell === i && peekVisible();
      return `<button class="cell ${locked ? "capy-locked" : ""} ${isbad ? "bad" : ""} ${hi ? "peeked" : ""}" data-cell="${i}" data-value="${v}" aria-label="Row ${Math.floor(i / puzzle.n) + 1}, column ${(i % puzzle.n) + 1}, zone ${puzzle.zones[i] + 1}, ${rock ? "rock" : v === 2 ? (isbad ? "capy, conflict" : "capy") : v === 1 ? "X" : "empty"}${locked ? ", locked correct capy" : ""}${hi ? ", Peek glow" : ""}" ${view === "solved" ? "disabled" : ""} ${rock ? 'aria-disabled="true" data-rock="true"' : ""} style="--zone-gradient:linear-gradient(145deg,${colors[puzzle.zones[i]][0]},${colors[puzzle.zones[i]][1]});background:var(--zone-gradient)">${pattern(puzzle.zones[i])}${rock ? '<img class="rock-art" src="assets/rock.png" alt="">' : v === 1 ? '<span class="xmark">×</span>' : v === 2 ? `<img class="capy" alt="" src="${pieceSprite()}">${locked ? '<span class="lock-badge" aria-hidden="true"><svg viewBox="0 0 12 12"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg></span>' : ""}` : hi ? `<img class="peek-ghost" src="${pieceSprite()}" alt="Peek ghost">` : ""}</button>`;
    })
    .join("")}</div></div>`;
}
function renderGame() {
  const focusedCell = document.activeElement?.closest("[data-cell]")?.dataset.cell;
  const clear = view === "solved",
    bad = violations(puzzle, state.cells),
    count = state.cells.filter((v) => v === 2).length,
    label = isDaily ? "Daily Pond" : pondLabel(puzzle.id),
    reward = !isDaily && isBoss(puzzle.id),
    peeked = peekVisible(),
    kind = effectivePower(progress.selected),
    pureReward = reward && !state.power.used && progress.goldenLilies.includes(puzzle.id);
  shell(
    `game ${clear ? "solved" : ""}`,
    `<header class="topbar"><button class="level-pill" data-action="home" aria-label="Back to home">‹ ${clear ? label : ""}</button>${clear ? "" : '<button class="help-btn" data-action="rules" aria-label="Rules">?</button>'}${clear ? `<div class="solved-counter" aria-label="${count} of ${puzzle.n} capys"><img src="${pieceSprite()}" alt=""><strong>${count}/${puzzle.n}</strong></div>` : `<h2>${label}${isDaily ? ` · ${puzzle.date.slice(5)}` : ""}</h2><div class="top-counter"><img src="${pieceSprite()}" alt=""><strong class="capy-counter-total">${count}/${puzzle.n}</strong></div>`}${clear ? "" : `<div class="life-area"><div class="lives" data-lives="${state.lives}" data-spare="${state.spare ? 1 : 0}" aria-label="${state.lives} oranges left${state.spare ? " plus 1 spare orange" : ""}">${[0, 1, 2].map((i) => `<span class="orange ${i >= state.lives ? "used" : ""}"></span>`).join("")}${state.spare ? '<span class="orange spare" title="Spare orange · this pond only"></span>' : ""}</div>${state.power.napRemaining ? `<span class="nap-badge">Nap · ${state.power.napRemaining}</span>` : ""}</div>`}</header>${clear ? '<div class="banner" role="status">Pond cleared</div>' : ruleCards()}${boardHTML()}<section class="lower">${clear ? `<div class="spring celebration" data-phase="gather"><div class="steam"></div><div class="dock"></div>${progress.completed.includes(10) ? '<div class="lantern l1"></div><div class="lantern l2"></div>' : ""}<div class="ripples">${Array.from({ length: puzzle.n }, (_, i) => `<i class="splash-ring" style="--i:${i};--land:${landingAt(i)}ms;left:${((i + 0.5) * 100) / puzzle.n}%"></i>`).join("")}</div><div class="steam-puffs"><i></i><i></i><i></i></div><div class="jumpers" style="--count:${puzzle.n}">${Array.from({ length: puzzle.n }, (_, i) => `<img class="soaking-capy" src="${pieceSprite("swim")}" alt="" style="--i:${i};--land:${landingAt(i)}ms;--soak-x:${[18, 65, 34, 80, 17, 59, 45, 28, 74, 50][i]}%;--soak-y:${[42, 46, 65, 66, 82, 83, 56, 54, 58, 72][i]}%">`).join("")}</div>${pureReward ? `<span class="reward-lily golden-lily" role="img" aria-label="Golden lily pad reward" style="--reaction:${reactionAt(puzzle.n)}ms">✦<small>${puzzle.id}</small></span>` : ""}<div class="reaction" style="--reaction:${reactionAt(puzzle.n)}ms"><img src="${sprite(progress.selected, "portrait")}" alt=""><span>Ahh…</span></div>${state.lives ? `<div class="orange-saved" style="--reaction:${reactionAt(puzzle.n)}ms">🍊 ${state.lives} kept</div>` : ""}</div>${lilyResultsHTML()}<p class="sub">${reward ? `${pureReward ? "Pure solve · Golden lily pad" : "Boss cleared · the crate gate is next!"}` : isDaily ? `Splash! ${streakAt(progress, puzzle.day)} day streak` : "Splash! Into the hot spring"}</p><div class="chips"><button class="chip" data-action="collection">♨ Hot Spring</button><button class="chip primary" data-action="next">Next pond →</button></div>` : `${state.spare ? '<p class="tap-hint spare-hint"><i class="orange spare mini" aria-hidden="true"></i><span><strong>Spare orange · this pond only</strong> · used first if you slip; mistakes still count</span></p>' : '<p class="tap-hint">Tap × · Double-tap capy · Drag ×</p>'}${messageCardHTML()}<div class="controls"><button class="undo-round" data-action="undo" aria-label="Undo" ${history.some((h) => undoChanges(state, h.cells, puzzle)) ? "" : "disabled"}><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24H11m0 0 12-12M11 24l12 12"/></svg></span><strong>Undo</strong></button>${powerButton()}</div>`}</section>`,
  );
  if (focusedCell !== undefined) root.querySelector(`[data-cell="${focusedCell}"]`)?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    drawOutlines();
    if (tutorial) renderTutorial();
  });
}
function powerButton() {
  const kind = effectivePower(progress.selected),
    used = state.power.used,
    id = powerIdentity(progress.selected, kind);
  return `<button class="power-btn" data-action="power" data-power-kind="${kind}" data-used="${used}" aria-label="${id.name}" style="--identity:${id.color};--identity-light:${id.light}" ${canUsePower(puzzle, state, progress.selected) ? "" : "disabled"}><i class="round-icon">${powerIcon(kind)}<img class="power-face" src="${id.face}" alt="${progress.selected}"><b class="power-use-badge" aria-label="${used ? "Power used" : "Power unused"}">${used ? "0" : "1"}</b></i><span><strong>${id.name}</strong><small>${used ? (state.power.napRemaining && kind === "nap" ? `Active · ${state.power.napRemaining}` : "✓ Used") : kind === "secondChance" && !state.lastMistake ? "No mistake yet" : "Ready"}</small></span></button>`;
}
// Exactly one message surface for every power: the compact status card.
function pondMessage() {
  if (peekVisible()) return { title: "Peek · a friend is near", detail: "Place the glowing spot" };
  if (state.power.napRemaining)
    return { title: `Nap · ${state.power.napRemaining} safe moves left`, detail: "Each new capy or × spends a charge · no orange lost" };
  if (powerNotice) return { title: "Second chance · orange restored", detail: "The mistake still counts · the wrong spot stays empty" };
  return null;
}
function messageCardInner(m = pondMessage()) {
  const id = powerIdentity(progress.selected, effectivePower(progress.selected));
  return `${capyBadge("game")}<div class="message-copy" role="status"><strong>${progress.selected} · ${id.name}</strong><small class="identity-phrase">${id.phrase}</small>${m ? `<span class="power-feedback"><strong>${m.title}</strong><small>${m.detail}</small></span>` : ""}</div>${powerIcon(id.kind)}`;
}
function messageCardHTML() {
  const m = pondMessage(),
    id = powerIdentity(progress.selected, effectivePower(progress.selected));
  return `<div class="strip companion-line ${peekVisible() ? "peek-box" : ""}" style="--identity:${id.color};--identity-light:${id.light}">${messageCardInner(m)}</div>`;
}
let powerIntroOrigin = null;
function requestPower() {
  if (tutorial || !canUsePower(puzzle, state, progress.selected) || (modal && modal !== "gameover")) return;
  const kind = effectivePower(progress.selected);
  if (!needsPowerIntro(progress, progress.selected, kind)) {
    activatePower();
    return;
  }
  cancelTap();
  powerIntroOrigin = modal;
  root.querySelector(".shade")?.remove();
  modal = "powerIntro";
  const screen = root.querySelector(".screen"),
    room = Math.max(
      230,
      Math.floor(screen.getBoundingClientRect().bottom - root.querySelector(".pond-wrap").getBoundingClientRect().bottom - 32),
    );
  screen.insertAdjacentHTML(
    "beforeend",
    `<div class="power-intro-shade"><section class="power-first-use" role="dialog" aria-modal="true" aria-labelledby="power-intro-title" style="--intro-room:${room}px">${firstUseHTML(progress.selected, kind, true)}</section></div>`,
  );
  root.querySelector('[data-action="confirmPower"]').focus();
}
function closePowerIntro(use = false) {
  if (modal !== "powerIntro") return;
  root.querySelector(".power-intro-shade")?.remove();
  modal = null;
  if (use) {
    powerIntroOrigin = null;
    activatePower();
  } else if (powerIntroOrigin === "gameover") {
    powerIntroOrigin = null;
    gameOver();
  } else powerIntroOrigin = null;
}

function activatePower() {
  const next = usePower(puzzle, state, progress.selected);
  if (next === state) return;
  state = next;
  rememberPowerIntro(progress, progress.selected, state.power.kind);
  powerNotice = state.power.kind === "secondChance";
  solveOrder = solveOrder.filter((i) => state.cells[i] === 2);
  modal = null;
  saveRound();
  renderGame();
}
function updatePowerUI() {
  const b = root.querySelector('[data-action="power"]'),
    kind = effectivePower(progress.selected);
  if (b) {
    b.disabled = !canUsePower(puzzle, state, progress.selected);
    b.dataset.used = String(state.power.used);
    b.querySelector("small").textContent = state.power.used
      ? state.power.napRemaining && kind === "nap"
        ? `Active · ${state.power.napRemaining}`
        : "✓ Used"
      : kind === "secondChance" && !state.lastMistake
        ? "No mistake yet"
        : "Ready";
  }
  const badge = root.querySelector(".nap-badge");
  if (badge) badge.textContent = `Nap · ${state.power.napRemaining}`;
  const strip = root.querySelector(".strip"),
    m = pondMessage();
  if (strip) {
    strip.classList.toggle("peek-box", peekVisible());
    strip.innerHTML = messageCardInner(m);
  }
}

function drawOutlines() {
  const grid = root.querySelector(".zone-grid");
  if (!grid) return;
  grid.querySelector(".zone-outline")?.remove();
  const n = puzzle.n,
    rect = grid.getBoundingClientRect();
  if (!rect.width) return;
  const cells = [...grid.querySelectorAll(".cell")],
    first = cells[0].getBoundingClientRect(),
    next = cells[1].getBoundingClientRect(),
    gap = next.left - first.right,
    w = first.width,
    x = first.left - rect.left;
  const pts = Array.from({ length: n + 1 }, (_, i) => Math.min(rect.width - 2.5, Math.max(2.5, x + i * (w + gap) - gap / 2)));
  let lines = `<rect x="${pts[0]}" y="${pts[0]}" width="${pts[n] - pts[0]}" height="${pts[n] - pts[0]}" rx="11"/>`;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const z = puzzle.zones[r * n + c];
      if (c < n - 1 && z !== puzzle.zones[r * n + c + 1])
        lines += `<path d="M${pts[c + 1]},${pts[r] + (r === 0 ? 2.5 : 0)}V${pts[r + 1] - (r === n - 1 ? 2.5 : 0)}"/>`;
      if (r < n - 1 && z !== puzzle.zones[(r + 1) * n + c])
        lines += `<path d="M${pts[c] + (c === 0 ? 2.5 : 0)},${pts[r + 1]}H${pts[c + 1] - (c === n - 1 ? 2.5 : 0)}"/>`;
    }
  grid.insertAdjacentHTML(
    "beforeend",
    `<svg class="zone-outline" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}" aria-hidden="true"><g fill="none" stroke="#3F513E" stroke-width="5" stroke-linejoin="round" stroke-linecap="butt">${lines}</g></svg>`,
  );
}
function play(i, value, singleTap = false) {
  if (view !== "game" || modal) return;
  if (isLocked(puzzle, state, i) && !tutorial) {
    bumpLocked(i);
    return;
  }
  beginTiming();
  clock.flush();
  if (tutorial && !tutorialAllows(tutorial, i, value)) return;
  const before = { cells: [...state.cells], lives: state.lives, order: [...solveOrder] },
    after = tutorial ? { ...state, cells: state.cells.map((v, k) => (k === i ? value : v)) } : attemptMove(puzzle, state, i, value);
  if (after === state) return;
  powerNotice = false;
  // v4.3 rev b: a capy on a cell outside the unique solution is rejected at once (mistake buzz, orange, red shake).
  const rejected = after.rejected !== undefined;
  if (!rejected) {
    solveOrder = solveOrder.filter((c) => c !== i);
    if (value === 2) solveOrder.push(i);
    history.push(before);
    if (history.length > 100) history.shift();
  }
  if (value === 2) vibrate(rejected || violations(puzzle, after.cells).has(i) ? "mistake" : "correct", progress.haptics);
  else if (singleTap) vibrate(value === 1 ? "markX" : "clearTap", progress.haptics);
  const spareJustUsed = !tutorial && after.spareUsed;
  state = withLocks(puzzle, after);
  delete state.rejected;
  if (spareJustUsed) delete state.spareUsed;
  currentHint = null;
  saveRound();
  if (solved(puzzle, state.cells)) {
    complete();
    return;
  }
  renderGame();
  if (rejected) rejectCapy(i);
  if (spareJustUsed) toast("Spare orange used · the mistake still counts");
  if (tutorial) advanceTutorial();
  if (state.lives === 0) gameOver();
}
// The rejected capy appears for a moment with a red ring, shakes and hops out; the cell keeps its old content.
function rejectCapy(i) {
  const cell = root.querySelector(`[data-cell="${i}"]`);
  if (!cell) return;
  cell.classList.add("reject-shake");
  cell.insertAdjacentHTML("beforeend", `<img class="capy reject-capy" alt="" src="${pieceSprite()}">`);
  const label = cell.getAttribute("aria-label");
  cell.setAttribute("aria-label", `${label}, wrong spot: capy hopped out`);
  setTimeout(() => {
    if (!cell.isConnected) return;
    cell.classList.remove("reject-shake");
    cell.querySelector(".reject-capy")?.remove();
    cell.setAttribute("aria-label", label);
  }, 480);
}
let lastBump = { i: -1, at: -Infinity };
function bumpLocked(i) {
  // A double-tap on a locked capy is one bump, not two.
  const now = performance.now();
  if (lastBump.i === i && now - lastBump.at < DOUBLE_TAP_MS) return;
  lastBump = { i, at: now };
  const cell = root.querySelector(`[data-cell="${i}"]`);
  if (cell) {
    cell.classList.remove("locked-bump");
    void cell.offsetWidth;
    cell.classList.add("locked-bump");
    setTimeout(() => cell.isConnected && cell.classList.remove("locked-bump"), 300);
  }
  vibrate("locked", progress.haptics);
}
function tap(i) {
  if (view !== "game" || modal || puzzle.rocks.includes(i)) return;
  beginTiming();
  // A locked (correct) capy answers immediately with a bump; a pending tap elsewhere still resolves once.
  if (!tutorial && isLocked(puzzle, state, i)) {
    if (pending && pending.i !== i) {
      const prev = pending;
      cancelTap();
      play(prev.i, prev.value === 0 ? 1 : 0, true);
      if (modal || view !== "game") return;
    } else cancelTap();
    bumpLocked(i);
    return;
  }
  if (pending && pending.i === i) {
    const old = pending.value;
    cancelTap();
    play(i, old === 2 ? 0 : 2);
    return;
  }
  if (pending) {
    const prev = pending;
    cancelTap();
    play(prev.i, prev.value === 0 ? 1 : 0, true);
    if (modal || view !== "game") return;
  }
  const value = state.cells[i];
  pending = {
    i,
    value,
    at: performance.now(),
    timer: setTimeout(() => {
      pending = null;
      play(i, value === 0 ? 1 : 0, true);
    }, DOUBLE_TAP_MS),
  };
}
function complete() {
  clock.pause();
  lastLilyResult = awardLilies(progress, puzzle, state.metrics, isDaily);
  cancelTap();
  vibrate("solve", progress.haptics);
  view = "solved";
  if (isDaily) finishDaily(progress, puzzle.day);
  else if (!progress.completed.includes(puzzle.id)) progress.completed.push(puzzle.id);
  awardPureBoss(progress, puzzle, state, isDaily);
  saveRound();
  persist();
  renderGame();
  animateJump();
}
function animateJump() {
  const token = roundToken;
  warmAudio(progress.audio);
  requestAnimationFrame(() => {
    if (token !== roundToken || view !== "solved") return;
    const spring = root.querySelector(".spring"),
      grid = root.querySelector(".zone-grid"),
      soakers = [...root.querySelectorAll(".soaking-capy")],
      reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const capys = solveOrder.map((i) => root.querySelector(`[data-cell="${i}"] .capy`)).filter(Boolean);
    spring.classList.toggle("reduced", reduced);
    const later = (ms, fn) =>
      setTimeout(() => {
        if (token === roundToken && view === "solved") fn();
      }, ms);
    capys.forEach((img, k) => {
      img.closest(".cell").classList.add("vacated");
      if (!reduced) {
        const raw = img.getBoundingClientRect(),
          s = spring.getBoundingClientRect(),
          r = raw.width
            ? raw
            : { left: s.left + 12 + (k % 2) * 32, top: s.top + s.height * 0.6 + Math.floor(k / 2) * 28, width: 54, height: 54 },
          target = soakers[k].getBoundingClientRect(),
          fly = document.createElement("img");
        fly.src = pieceSprite("jump");
        fly.alt = "";
        fly.className = "flyer";
        fly.dataset.solveOrder = String(k);
        fly.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--dx:${target.left - r.left}px;--dy:${target.top - r.top}px;--i:${k};`;
        root.querySelector(".screen").append(fly);
        later(landingAt(k) + 150, () => fly.remove());
        later(landingAt(k), () => {
          spring.dataset.phase = "splash";
          vibrate("landing", progress.haptics);
          sound("splash", progress.audio);
        });
      }
      img.style.opacity = "0";
    });
    if (reduced) {
      spring.dataset.phase = "soak";
      return;
    }
    later(0, () => (spring.dataset.phase = "jump"));
    later(soakAt(puzzle.n), () => {
      spring.dataset.phase = "soak";
      sound("chirp", progress.audio);
    });
    later(reactionAt(puzzle.n), () => (spring.dataset.phase = "reaction"));
  });
}
function gameOver() {
  cancelTap();
  modal = "gameover";
  root
    .querySelector(".screen")
    .insertAdjacentHTML(
      "beforeend",
      `<div class="shade"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="over-title"><img src="${sceneSprite("sleep")}" alt=""><h2 id="over-title">Out of oranges</h2><p>The pond can wait.<br>Try a fresh start.</p><button class="primary" data-action="retry">Try again</button><button data-action="home">Home</button></section></div>`,
    );
  root.querySelector('[data-action="retry"]').focus();
}
async function showInstall() {
  if (installPrompt && !isIOS() && !isStandalone()) {
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {}
    return;
  }
  toast(installCopy());
}
function settings() {
  cancelTap();
  modal = "settings";
  root
    .querySelector(".screen")
    .insertAdjacentHTML(
      "beforeend",
      `<div class="shade"><section class="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 id="settings-title">Make yourself cozy</h2><div class="settings-row"><span>Haptics · gentle buzz</span><button data-action="settingsHaptics" aria-label="Haptics" aria-pressed="${progress.haptics}">${progress.haptics ? "On" : "Off"}</button></div><div class="settings-row"><span>Sound effects · splashes</span><button data-action="settingsAudio" aria-label="Sound" aria-pressed="${progress.audio}">${progress.audio ? "On" : "Off"}</button></div><div class="settings-row"><span>Music · pastoral pond</span><button data-action="settingsMusic" aria-label="Music" aria-pressed="${progress.music}">${progress.music ? "On" : "Off"}</button></div><div class="settings-row"><span>Crate ponds · D-pad</span><button data-action="settingsDpad" aria-label="Crate ponds D-pad" aria-pressed="${progress.bonus.dpad}">${progress.bonus.dpad ? "On" : "Off"}</button></div><button class="nickname-setting" data-action="editNickname">Nickname · ${escapeHTML(progress.nickname)} · Edit</button><button data-action="progress">Your pond collection · ${totalLilies(progress)}/90</button><button class="music-credit-link" data-action="musicCredits">Music credits · CC0</button><button data-action="install" aria-label="Install app">${installCopy()}</button><p class="small-text">One capy per row, column & zone.<br>No touching — diagonals too.</p><p class="build-label" data-build="${BUILD.build}" aria-label="Running version">v${BUILD.version} · build ${BUILD.build}</p><button class="primary" data-action="closeSettings">Done</button></section></div>`,
    );
}
function toast(text, power = null) {
  clearTimeout(toastTimer);
  root.querySelector(".toast")?.remove();
  root
    .querySelector(".screen")
    .insertAdjacentHTML(
      "beforeend",
      `<div class="toast ${power ? "power-toast" : ""}" role="status">${power ? powerToastHTML(text, power) : text}</div>`,
    );
  toastTimer = setTimeout(() => root.querySelector(".toast")?.remove(), 2500);
}
// Pointer gestures are scoped to the board. Rendering is deferred until gesture end,
// so pointer capture and cell geometry cannot disappear underneath a finger.
function beginGesture(e) {
  const cell = e.target.closest("[data-cell]");
  if (!cell || cell.disabled || view !== "game" || modal || gesture || !e.isPrimary || e.button > 0) return;
  beginTiming();
  lastDragPointer = -1; // pointer IDs may be reused by mouse/OS between gestures
  if (pending) clearTimeout(pending.timer); // suspend a possible first tap, never flash X during the second contact
  gesture = {
    pointer: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    x: e.clientX,
    y: e.clientY,
    i: Number(cell.dataset.cell),
    mode: state.cells[Number(cell.dataset.cell)] === 1 ? 0 : 1,
    before: { cells: [...state.cells], lives: state.lives, order: [...solveOrder] },
    dragging: false,
    visited: new Set(),
    changed: 0,
    grid: cell.closest(".zone-grid"),
  };
  // Native taps keep their cell target; explicit capture starts only after crossing the drag threshold.
}
function paintAt(x, y) {
  const cell = document.elementFromPoint(x, y)?.closest("[data-cell]");
  if (!cell || !gesture || !gesture.grid.contains(cell)) return;
  const i = Number(cell.dataset.cell);
  if (gesture.visited.has(i)) return;
  gesture.visited.add(i);
  if (tutorial && !tutorialAllows(tutorial, i, gesture.mode, true)) return;
  const next = paintMark(puzzle, state.cells, i, gesture.mode);
  if (next === state.cells) return;
  powerNotice = false;
  state = tutorial ? { ...state, cells: next } : attemptMove(puzzle, state, i, gesture.mode);
  gesture.changed++;
  if (state.power.peekCell !== i) {
    cell.classList.remove("peeked");
    cell.querySelector(".peek-ghost")?.remove();
  }
  updatePowerUI();
  cell.dataset.value = String(next[i]);
  cell.querySelector(".xmark")?.remove();
  if (next[i] === 1) cell.insertAdjacentHTML("beforeend", '<span class="xmark">×</span>');
  cell.setAttribute(
    "aria-label",
    `Row ${Math.floor(i / puzzle.n) + 1}, column ${(i % puzzle.n) + 1}, zone ${puzzle.zones[i] + 1}, ${next[i] === 1 ? "X" : "empty"}`,
  );
  const now = performance.now();
  if (progress.haptics && now - lastDragTick >= DRAG_TICK_GAP) {
    lastDragTick = now;
    vibrate("dragTick", true);
  }
}
function moveGesture(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer || view !== "game") return;
  if (!g.dragging && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD) return;
  if (!g.dragging) {
    g.dragging = true;
    g.grid.setPointerCapture(g.pointer);
    cancelTap();
    currentHint = null;
    g.grid.classList.add("dragging");
    root
      .querySelectorAll(".hinted,.reason,.hint-source,.hint-excluded")
      .forEach((el) => el.classList.remove("hinted", "reason", "hint-source", "hint-excluded"));
    paintAt(g.startX, g.startY);
  }
  e.preventDefault();
  const dx = e.clientX - g.x,
    dy = e.clientY - g.y,
    steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  for (let k = 1; k <= steps; k++) paintAt(g.x + (dx * k) / steps, g.y + (dy * k) / steps);
  g.x = e.clientX;
  g.y = e.clientY;
}
function endGesture(e, cancelled = false) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  if (g.dragging && !cancelled) {
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y,
      steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
    for (let k = 1; k <= steps; k++) paintAt(g.x + (dx * k) / steps, g.y + (dy * k) / steps);
  }
  gesture = null;
  if (g.grid.hasPointerCapture(g.pointer)) g.grid.releasePointerCapture(g.pointer);
  if (g.dragging) {
    lastDragPointer = g.pointer;
    cancelTap();
    g.grid.classList.remove("dragging");
    if (g.changed) {
      history.push(g.before);
      if (history.length > 100) history.shift();
      saveRound();
    }
    const undo = root.querySelector('[data-action="undo"]');
    if (undo) undo.disabled = !history.some((h) => undoChanges(state, h.cells, puzzle));
    const strip = root.querySelector(".strip");
    if (strip?.classList.contains("hint-box")) {
      strip.classList.remove("hint-box");
      strip.querySelector("strong").textContent = "Keep finding cozy spots…";
      strip.querySelector("small").textContent = "Tap × · double-tap place · drag to mark";
    }
  }
  if (tutorial && g.dragging) advanceTutorial();
  else if (cancelled) cancelTap(); // A tap is handled by its native click AFTER touchend, never by pointerup.
  else if (!g.dragging) {
    // v4.1: touch Chromium can drop the click of the first tap after a drag (the "lost first tap" behind a
    // double-tap turning into a single tap). If no native click arrives by the next frame, deliver the tap once.
    // v4.3 fix: every non-drag contact is ONE tap, delivered exactly once by whichever comes first (native click or
    // this fallback). The v4.1 code only remembered the LAST contact, so a late native click of tap A arriving after
    // tap B's pointerup no longer matched and was delivered a second time, so "tap A, tap B" became a double-tap on A
    // and a capy was placed where the player only meant to mark × (usually right next to another capy).
    const t = (cellTap = { pointer: g.pointer, i: g.i, handled: false, clicked: false, at: performance.now() });
    recentTaps.push(t);
    if (recentTaps.length > 8) recentTaps.shift();
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (!t.handled && view === "game") {
          t.handled = true;
          tap(t.i);
        }
      }, 0),
    );
  }
}
root.addEventListener("pointerdown", beginGesture);
root.addEventListener("pointermove", moveGesture, { passive: false });
root.addEventListener("pointerup", (e) => endGesture(e));
root.addEventListener("pointercancel", (e) => endGesture(e, true));

function maybeRockIntro() {
  if (!puzzle?.rocks.length || progress.rockIntroSeen || modal) return;
  cancelTap();
  modal = "rockIntro";
  const screen = root.querySelector(".screen"),
    first = root.querySelector(`[data-cell="${puzzle.rocks[0]}"]`),
    r = first.getBoundingClientRect(),
    s = screen.getBoundingClientRect();
  const top = r.top - s.top,
    below = top + r.height + 20,
    room = 236,
    placeTop = below + room <= s.height - 12 ? below : Math.max(12, top - room - 14),
    above = placeTop < top,
    left = Math.max(14, Math.min(s.width - 262, r.left - s.left - 55));
  screen.insertAdjacentHTML(
    "beforeend",
    `<div class="rock-intro-layer"><div class="rock-hole" style="left:${r.left - s.left - 4}px;top:${top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px"></div><section class="rock-callout ${above ? "above" : ""}" role="dialog" aria-modal="true" aria-label="Rock introduction" style="left:${left}px;top:${placeTop}px"><span class="rock-arrow" aria-hidden="true" style="left:${Math.max(16, Math.min(220, r.left - s.left + r.width / 2 - left - 7))}px"></span><strong>Rocks: no capy can sit on a rock</strong><p>A rock is not a capy. Its row, column and zone each still needs one capy somewhere else. No × needed on rocks.</p><button class="primary" data-action="rockIntroDone">Got it</button></section></div>`,
  );
  root.querySelector('[data-action="rockIntroDone"]').focus();
}
function startTutorial(replay = false) {
  clock.pause();
  cancelTap();
  let original = null;
  if (replay) {
    original = { puzzle, state, history, solveOrder, isDaily, view };
    puzzle = data.levels[0];
    state = newAttempt(puzzle.n);
    history = [];
    solveOrder = [];
    isDaily = false;
    view = "game";
  }
  const plan = tutorialPlan(puzzle, state.cells);
  if (plan.mark < 0 || plan.place === undefined || plan.drag.length !== 3) {
    if (!replay) {
      progress.tutorialSeen = true;
      persist();
      return;
    }
  }
  modal = null;
  tutorial = { step: 0, plan, replay, original };
  renderGame();
}
function renderTutorial() {
  if (!tutorial) return;
  const t = tutorial,
    screen = root.querySelector(".screen"),
    lower = root.querySelector(".lower");
  screen.classList.add("tutorial-active");
  root.querySelectorAll(".tutorial-instruction,.tutorial-skip,.tutorial-dots,.tutorial-guide,.tutorial-play").forEach((e) => e.remove());
  screen.insertAdjacentHTML(
    "beforeend",
    '<button class="tutorial-skip" data-action="tutorialSkip" aria-label="Skip tutorial">Skip</button>',
  );
  lower.insertAdjacentHTML(
    "beforeend",
    `<div class="tutorial-instruction" role="status">${TUTORIAL_COPY[t.step]}</div><div class="tutorial-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= t.step ? "on" : ""}"></i>`).join("")}</div>${t.step === 3 ? '<p class="tutorial-note">A capy in the wrong spot hops back out and costs an orange.</p><button class="primary tutorial-play" data-action="tutorialPlay">Let’s play</button>' : ""}`,
  );
  root.querySelectorAll(".controls button,.capy-badge").forEach((e) => (e.disabled = true));
  const target = t.step === 0 ? t.plan.mark : t.step === 1 ? t.plan.place : t.plan.drag[0];
  if (t.step < 3) {
    const r = root.querySelector(`[data-cell="${target}"]`).getBoundingClientRect(),
      s = screen.getBoundingClientRect(),
      last = root.querySelector(`[data-cell="${t.plan.drag.at(-1)}"]`).getBoundingClientRect();
    screen.insertAdjacentHTML(
      "beforeend",
      `<div class="tutorial-guide" data-step="${t.step}" style="left:${r.left - s.left + r.width / 2}px;top:${r.top - s.top + r.height / 2}px;--drag-x:${last.left - r.left}px"><span class="guide-ring"></span><span class="guide-demo">${t.step === 1 ? `<img src="${pieceSprite()}" alt="">` : "×"}</span><img src="assets/v6/tutorial-hand.svg" alt="Animated gesture demonstration"></div>`,
    );
  }
}
function advanceTutorial() {
  if (!tutorial) return;
  const t = tutorial,
    ready =
      t.step === 0
        ? state.cells[t.plan.mark] === 1
        : t.step === 1
          ? state.cells[t.plan.place] === 2
          : t.step === 2
            ? t.plan.drag.every((i) => state.cells[i] === 1)
            : false;
  if (!ready) return;
  t.step++;
  if (t.step === 3) {
    progress.tutorialSeen = true;
    persist();
  }
  renderGame();
}
function finishTutorial() {
  cancelTap();
  const t = tutorial;
  if (!t) return;
  progress.tutorialSeen = true;
  tutorial = null;
  if (t.replay) {
    ({ puzzle, state, history, solveOrder, isDaily, view } = t.original);
    clock.bind(state.metrics);
  } else saveRound();
  persist();
  renderGame();
}
function rulesSheet() {
  cancelTap();
  modal = "rules";
  root.querySelector(".screen").insertAdjacentHTML(
    "beforeend",
    `<div class="sheet-scrim" data-action="closeRules"></div><section class="sheet rules-v4" role="dialog" aria-modal="true" aria-label="How to play"><button class="rules-close" data-action="closeRules" aria-label="Close rules">×</button><h2>How to play</h2><div class="rules-summary"><div class="one-capy"><img src="${pieceSprite()}" alt=""><div><strong>One capy in each</strong><small>row, column and zone</small></div></div><hr><strong>No touching</strong><small>Not even diagonally</small><p class="rock-rule"><strong>Rocks</strong> · no capy can sit there. Rocks don’t count as a capy: their row, column and zone still need one. No × needed.</p></div><ol class="gesture-lessons">${[
      ["Tap", "Mark an X"],
      ["Double-tap", "Place a capy"],
      ["Drag", "Mark several X"],
    ]
      .map(([a, b], i) => `<li><span>${i + 1}</span><div><strong>${a}</strong><small>${b}</small></div></li>`)
      .join(
        "",
      )}</ol><p class="mistake-rule"><strong>Wrong spot?</strong> The capy hops right back out and costs an orange. Right spots lock in place.</p><p class="power-brief">Same puzzle rules for every buddy.<br>One power per attempt · Three oranges.<br>Lily time target: ${duration(targetMs(puzzle.n))}. No countdown.</p><button class="primary replay-tutorial" data-action="replayTutorial">↻ Replay tutorial</button><small class="replay-sub">A quick, hands-on reminder</small><button class="sheet-done" data-action="closeRules">Back to pond</button></section>`,
  );
  root.querySelector(".sheet-done").focus();
}
function activateControl(b) {
  clock.flush();
  cancelTap();
  if (b.dataset.choice) {
    chooserDraft = b.dataset.choice;
    chooser(view === "choose");
    return;
  }
  const action = b.dataset.action;
  if (!tutorial && bonus.handle(b)) return;
  if (tutorial && !["tutorialSkip", "tutorialPlay"].includes(action)) return;
  switch (action) {
    case "saveNickname":
      saveNickname();
      break;
    case "cancelNickname":
      home();
      settings();
      break;
    case "editNickname":
      nicknameScreen(true);
      break;
    case "progress":
      progressLedger();
      break;
    case "backProgress":
      root.querySelector(".progress-ledger")?.remove();
      settings();
      break;
    case "enterPond":
      start(Number(b.dataset.level), false, b.dataset.retry === "true");
      break;
    case "replayPond":
      // v4.3 rev b: the only replay entry point (Settings › Progress). Resumes a board in progress, else a fresh attempt.
      modal = null;
      root.querySelector(".progress-ledger")?.remove();
      start(Number(b.dataset.level), false, !inProgress(Number(b.dataset.level)));
      break;
    case "tutorialSkip":
      finishTutorial();
      break;
    case "tutorialPlay":
      finishTutorial();
      break;
    case "replayTutorial":
      startTutorial(true);
      break;
    case "switchCapy":
      chooserDraft = b.dataset.friend || progress.selected;
      chooser();
      break;
    case "closeChooser":
      closeChooser();
      break;
    case "confirmCapy":
      confirmCapy();
      break;
    case "power":
      requestPower();
      break;
    case "confirmPower":
      closePowerIntro(true);
      break;
    case "dismissPower":
      closePowerIntro(false);
      break;
    case "install":
      showInstall();
      break;
    case "rules":
      rulesSheet();
      break;
    case "closeRules":
      modal = null;
      root.querySelector(".sheet")?.remove();
      root.querySelector(".sheet-scrim")?.remove();
      break;
    case "home":
      home();
      break;
    case "collection":
      collection();
      break;
    case "daily":
      start(null, true);
      break;
    case "next":
      // v4.1: solved summary → "Next pond" transition screen → next pond (no map in between).
      if (isDaily) transition(progress.completed.length >= 30 ? null : unlocked(progress));
      else transition(puzzle.id === 30 ? (progress.completed.length >= 30 ? null : unlocked(progress)) : puzzle.id + 1, puzzle.id);
      break;
    case "undo":
      while (history.length) {
        const prev = history.pop();
        if (!undoChanges(state, prev.cells, puzzle)) continue;
        powerNotice = false;
        state = undoAttempt(state, prev.cells, puzzle);
        solveOrder = state.cells.flatMap((v, i) => (v === 2 ? [i] : []));
        currentHint = null;
        saveRound();
        renderGame();
        break;
      }
      break;
    case "retry":
      start(isDaily ? null : puzzle.id, isDaily, true);
      saveRound();
      break;
    case "settings":
      settings();
      break;
    case "settingsHaptics":
      progress.haptics = !progress.haptics;
      persist();
      root.querySelector(".shade")?.remove();
      settings();
      break;
    case "settingsDpad":
      progress.bonus.dpad = !progress.bonus.dpad;
      persist();
      root.querySelector(".shade")?.remove();
      settings();
      break;
    case "settingsMusic":
      progress.music = !progress.music;
      persist();
      root.querySelector(".shade")?.remove();
      settings();
      break;
    case "musicCredits":
      root.querySelector(".shade")?.remove();
      root
        .querySelector(".screen")
        .insertAdjacentHTML(
          "beforeend",
          `<div class="shade"><section class="dialog music-credits" role="dialog" aria-modal="true" aria-label="Music credits"><h2>Music by pond friends</h2>${MUSIC_TRACKS.map((t) => `<p><strong>${t.title}</strong><br>${t.author}<br><small>CC0 1.0 · traditional arrangement</small></p>`).join("")}<p class="small-text">Free to use, including commercial games.<br>Sources & licenses: assets/music/LICENSES.md</p><button class="primary" data-action="backMusicCredits">Back</button></section></div>`,
        );
      break;
    case "backMusicCredits":
      root.querySelector(".shade")?.remove();
      settings();
      break;
    case "settingsAudio":
      progress.audio = !progress.audio;
      warmAudio(progress.audio);
      persist();
      root.querySelector(".shade")?.remove();
      settings();
      break;
    case "rockIntroDone":
      progress.rockIntroSeen = true;
      persist();
      modal = null;
      root.querySelector(".rock-intro-layer")?.remove();
      if (state.lives === 0 && view === "game") gameOver();
      break;
    case "closeSettings":
      modal = null;
      root.querySelector(".shade")?.remove();
      if (view === "home") home();
      break;
  }
}
root.addEventListener("pointerdown", (e) => {
  const b = e.target.closest("button");
  controlTap =
    b && !b.disabled && b.dataset.cell === undefined && e.isPrimary
      ? { b, pointer: e.pointerId, x: e.clientX, y: e.clientY, handled: false, cancelled: false }
      : null;
});
root.addEventListener("pointermove", (e) => {
  if (controlTap?.pointer === e.pointerId && Math.hypot(e.clientX - controlTap.x, e.clientY - controlTap.y) > 10)
    controlTap.cancelled = true;
});
root.addEventListener("pointercancel", () => {
  if (controlTap) controlTap.cancelled = true;
});
root.addEventListener("pointerup", (e) => {
  const t = controlTap;
  if (t?.pointer === e.pointerId)
    requestAnimationFrame(() => {
      if (controlTap === t && !t.handled && !t.cancelled && t.b.isConnected) {
        t.handled = true;
        activateControl(t.b);
      }
    });
});
// v4.3: match a native click to the contact that produced it: by pointerId (Chromium gives touch clicks the touch's
// own, ever-increasing id), else (engines whose click has no pointerId) the oldest recent contact on the same cell
// that has not had its click yet. One click consumes one contact.
function tapForClick(e, i) {
  const now = performance.now();
  if (Number.isInteger(e.pointerId) && e.pointerId > 0) {
    const byId = recentTaps.findLast((t) => t.pointer === e.pointerId && !t.clicked);
    if (byId) return byId;
    if (recentTaps.some((t) => t.pointer === e.pointerId)) return { handled: true }; // duplicate click of a consumed contact
    return null;
  }
  return recentTaps.find((t) => t.i === i && !t.clicked && now - t.at < 1000) ?? null;
}
// Consume a control fallback's late native click before routing into replacement board DOM.
root.addEventListener("click", (e) => {
  // v4.3: guard null (a click without pointerId, e.g. a plain MouseEvent, used to throw here when no control tap was pending).
  if (controlTap && controlTap.pointer === e.pointerId && (controlTap.handled || controlTap.cancelled)) return;
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.cell !== undefined) {
    const t = e.detail !== 0 ? tapForClick(e, Number(b.dataset.cell)) : null;
    if (t) {
      t.clicked = true;
      if (t.handled) return; // fallback already delivered this tap
      t.handled = true;
      tap(t.i);
      return;
    }
    if (e.detail === 0 || e.pointerId !== lastDragPointer) tap(Number(b.dataset.cell));
    return;
  }
  if (controlTap?.b === b && controlTap.pointer === e.pointerId) {
    if (controlTap.handled || controlTap.cancelled) return;
    controlTap.handled = true;
  }
  activateControl(b);
});
root.addEventListener("dblclick", (e) => e.preventDefault());
window.addEventListener("resize", () => {
  if (view === "game" || view === "solved") drawOutlines();

});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && view === "home" && !modal) home();
});
try {
  const res = await fetch("./levels.json");
  if (!res.ok) throw Error("content");
  data = await res.json();
  loaded = load(storage, data);
  await bonus.ensureLevels().catch(() => {}); // rev b: the hub can open on a crate pond, so its par/thumbnail must be ready before the first render.
  progress = loaded.progress;
  music.configure({ enabled: progress.music });
  warning = loaded.readOnly ? "Newer progress found. Playing without overwriting it." : loaded.error;
  enterOnboarding();
  if (loaded.contentMigration?.dropped.length) toast("Ponds refreshed. Your progress & lilies are safe.");
  else if (loaded.migrated) toast("Your pond path & streak are safe.");
} catch {
  shell(
    "",
    `<div class="content"><h1>The pond is resting</h1><p>Please reload once online to keep the puzzles offline.</p><button onclick="location.reload()">Try again</button></div>`,
  );
}
versionNotice = updateNotice(storage, BUILD, progress.starterChosen);
showVersionNotice();
updates = createUpdateManager({
  serviceWorker: navigator.serviceWorker,
  build: BUILD,
  canReload: () => ["home", "solved", "transition", "bonusReward"].includes(view) && !modal && !tutorial,
  beforeReload: () => {
    if (state && puzzle) saveRound();
    const ok = persist();
    if (!ok) toast("Progress could not save. Keep this tab open.");
    return ok;
  },
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((reg) => updates.watch(reg))
    .catch(() => {});

function showVersionNotice() {
  if (versionNotice && view === "home" && !modal) {
    toast(versionNotice);
    versionNotice = null;
    root.querySelector(".toast")?.classList.add("version-toast");
  }
}
function enterOnboarding() {
  if (!progress.nickname) nicknameScreen();
  else if (!progress.starterChosen) {
    chooserDraft = "Jun";
    chooser(true);
  } else launch();
}
function nicknameScreen(edit = false) {
  clock.pause();
  cancelTap();
  modal = null;
  view = "nickname";
  nicknameEditing = edit;
  shell(
    "nickname-screen",
    `<header><h1>Capydoku</h1><p>A little pond adventure</p></header><div class="nickname-companions">${Object.keys(CHARACTERS)
      .map((n) => `<img class="nickname-${n.toLowerCase()}" src="${sprite(n)}" alt="${n}">`)
      .join(
        "",
      )}</div><div class="nickname-question"><h2>What should we call you?</h2><p>Any nickname feels at home.</p></div><div class="nickname-form"><label for="nickname-input">Nickname</label><input id="nickname-input" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="e.g. Lily" value="${escapeHTML(progress.nickname)}" aria-describedby="nickname-validation"><div class="nickname-validation" id="nickname-validation"><span>2–16 characters · Emoji welcome</span><b>0/16</b></div><div class="local-name-note"><span aria-hidden="true">♧</span><div><strong>Stored only on this phone.</strong><small>No email. No real name. No account.</small></div></div><button class="primary" data-action="saveNickname" disabled>${edit ? "Save nickname" : "Let’s begin →"}</button>${edit ? '<button data-action="cancelNickname">Cancel</button>' : '<p class="nickname-edit-note">You can change it in Settings.</p>'}</div>`,
  );
  validateNicknameInput();
}
function validateNicknameInput() {
  const input = root.querySelector("#nickname-input");
  if (!input) return;
  const r = nickname(input.value),
    message = root.querySelector("#nickname-validation");
  input.classList.toggle("valid", r.valid);
  input.setAttribute("aria-invalid", String(input.value.length > 0 && !r.valid));
  message.querySelector("span").textContent = r.valid
    ? "Looks good · Emoji welcome"
    : input.value
      ? "Use 2–16 characters."
      : "2–16 characters · Emoji welcome";
  message.querySelector("b").textContent = `${r.count}/16`;
  root.querySelector('[data-action="saveNickname"]').disabled = !r.valid;
}
function saveNickname() {
  const r = nickname(root.querySelector("#nickname-input")?.value);
  if (!r.valid) return;
  progress.nickname = r.text;
  persist();
  if (nicknameEditing) {
    home();
    settings();
  } else enterOnboarding();
}
function replayListHTML() {
  const ids = [...progress.completed].filter((id) => id >= 1 && id <= 30).sort((x, y) => x - y);
  if (!ids.length) return '<p class="replay-empty">Clear a pond and it shows up here to replay for lilies.</p>';
  return `<ol class="replay-list" aria-label="Cleared ponds">${ids
    .map((id) => {
      const crate = isCrate(id),
        n = crate ? bonus.levelInfo(id)?.n : data.levels[id - 1]?.n,
        resume = inProgress(id),
        label = pondLabel(id);
      return `<li class="replay-row" data-row="${id}"><span class="replay-name"><strong>${label}</strong><small>${n ? `${n}×${n}` : ""}${crate ? " · crates" : ""}</small></span>${lilyRow(progress.lilies[id], "replay-lilies")}${progress.goldenLilies.includes(id) ? '<img class="ledger-gold" src="assets/v65/lily-golden.svg" alt="Golden lily earned">' : ""}<button class="replay-btn" data-action="replayPond" data-level="${id}" aria-label="${resume ? "Continue" : "Replay"} ${label}">${resume ? "Continue" : "Replay"}</button></li>`;
    })
    .join("")}</ol>`;
}
function progressLedger() {
  modal = "progress";
  root.querySelector(".shade")?.remove();
  root.querySelector(".screen").insertAdjacentHTML(
    "beforeend",
    `<section class="progress-ledger" role="dialog" aria-modal="true" aria-label="Your pond collection"><header><div><h2>Your pond collection</h2><small>Settings · Progress</small></div><button data-action="backProgress" aria-label="Back to Settings">‹</button></header><div class="ledger-scroll"><div class="collection-total">${lilyImg(true)}<strong>${totalLilies(progress)}/90</strong><span>water lilies collected</span><small><img src="assets/v65/lily-golden.svg" alt="">${progress.goldenLilies.length}/3 golden · earned separately</small></div><h3>Replay a pond for lilies</h3>${replayListHTML()}<div class="ledger-encouragement"><img src="${sprite(progress.selected)}" alt=""><div><strong>Every clear is progress</strong><p>Replay a pond for another lily.<br>Earned lilies always stay yours.</p></div></div><p class="small-text">Nickname · ${escapeHTML(progress.nickname)}<br>Stored only on this phone. Nothing is sent.</p></div><button class="primary" data-action="backProgress">Back to Settings</button></section>`,
  );
}
function lilyResultsHTML() {
  const r = (isDaily ? progress.dailyLilies[puzzle.date] : progress.lilies[puzzle.id]) || emptyLilies();
  return `<div class="solve-time">${state.metrics.known ? `${duration(state.metrics.elapsedMs)} · ${state.metrics.mistakes} mistake${state.metrics.mistakes === 1 ? "" : "s"}` : "Earlier attempt · time and mistakes not recorded"}</div><section class="solve-lilies" aria-label="Lilies for this pond"><strong>Lilies for this pond · ${lilyCount(r)}/3</strong>${lilyDetails(r, puzzle.n, lastLilyResult?.newly)}</section>`;
}

root.addEventListener("input", (e) => {
  if (e.target.id === "nickname-input") validateNicknameInput();
});
root.addEventListener("pointerdown", (e) => bonus.pointerDown(e));
root.addEventListener("pointerup", (e) => bonus.pointerUp(e));
root.addEventListener("pointercancel", () => bonus.pointerCancel());
document.addEventListener("keydown", (e) => bonus.keydown(e));
root.addEventListener("keydown", (e) => {
  if (e.target.id === "nickname-input" && e.key === "Enter" && nickname(e.target.value).valid) {
    e.preventDefault();
    saveNickname();
  }
});
document.addEventListener("visibilitychange", () => {
  syncClock();
  if (state && puzzle && view === "game") saveRound();
});
window.addEventListener("pagehide", () => {
  clock.pause();
  if (state && puzzle && view === "game") saveRound();
});
setInterval(() => {
  if (clock.at !== null && state && view === "game") saveRound();
}, 1000);
