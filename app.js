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
  pondTargetMs,
} from "./rewards.js";
import { bossPhase, bossBoard, freshBossAttempt, phaseTwoAttempt, restoreBoss } from "./bosses.js";
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
import { installFit } from "./fit.js";
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
import { isBoss, isCrate, isGate, isWorldGate, role, pondLabel, worldOf, worldPonds, GATE_PONDS, WORLD_GATES, FINALE_POND, NEW_WORLD_PONDS, POND_COUNT, WORLD_COUNT, BOSS_PONDS } from "./roles.js";
import { logicScore, recordScore, worldScore, worldScores } from "./score.js";
import { createLeaderboard, pickAdapter, DEFAULT_NAME, lastCleared } from "./leaderboard.js";
import { claimSpare } from "./crates.js";
import { explainCapy, neighbours8, solvedZones, zoneMarkCells, OFF_SOLUTION_HINT } from "./explain.js";
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
  continueTo: (id) => afterWorldGate(id ? id - 1 : FINALE_POND, () => proceed(id || null)),
  afterScore: () => queueScores(),
});
// v5.0 optional leaderboard (opt-in; adapter "none" unless the test hook picks the local mock). Nothing is sent
// unless the player joins; local scores always stay in the save.
const leaderboard = createLeaderboard({ storage: localStorage, adapter: pickAdapter(localStorage, location.search) });
let tintWorld = 0;
// v5.0 bigger board: explicit tool (null = classic tap × / double-tap capy; "x" or "capy" = a single tap acts at once),
// the last move (outlined) and the last explanation (rule-break bands / not-in-solution flash).
let tool = null,
  lastMove = -1,
  lastWhy = null;
/** v5.0 compact chrome (one-line header + thumb bar + rules behind "?") everywhere except pond 1 (it keeps the
 * full header and rule cards for the tutorial). */
const v5Chrome = () => !tutorial && (isDaily || puzzle?.id > 1);
/** v5.0 transitions: the transition screen only before a boss or when entering a new world (and on app launch / hub);
 * every other "Next pond" goes straight to the board (crate ponds open their crate board directly; still mandatory). */
function needsTransition(id) {
  return !id || id > POND_COUNT || id === 1 || NEW_WORLD_PONDS.includes(id) || isBoss(id);
}
function proceed(id) {
  if (needsTransition(id)) transition(id);
  else start(id);
}
function queueScores() {
  if (leaderboard.enqueueProgress(progress)) return leaderboard.flush();
  return Promise.resolve({ sent:0 });
}
addEventListener("online", () => { leaderboard.flush(true).then(() => { if(modal === 'leaderboard') refreshLeaderboard(); }); });
let versionNotice = null,
  nicknameEditing = false,
  lastLilyResult = null,
  lastScore = null;
function syncClock() {
  if (state?.metrics && clock.metrics !== state.metrics) {
    clock.flush();
    state.metrics.elapsedMs = Math.max(state.metrics.elapsedMs, clock.metrics?.elapsedMs || 0);
    clock.bind(state.metrics);
  }
  clock.sync(view === "game" && state?.lives > 0 && !modal && !tutorial && !document.hidden);
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
// v4.3.1: size the crate/logic board from the visible height too (iPhone Safari tab with toolbars, safe areas).
installFit(root, () => { if (view === "game" && !tutorial) drawOutlines(); });
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
  recentControlTaps = [],
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
  if (state.boss) state.boss.updatedAt = Date.now();
  progress.sessions[sessionKey()] = { ...state, cells: [...state.cells], signature: boardSignature(puzzle) };
  persist();
}
function shell(cls, inner) {
  root.innerHTML = `<section class="screen ${cls}" data-world="${tintWorld + 1}">${inner}<div class="art-tag">AI illustration</div>${warning ? `<div class="persistent-warning" role="status">${warning}</div>` : ""}</section>`;
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
  const saved = progress.sessions[`pond-${id}`],
    q = isBoss(id) ? bossBoard(data, id, bossPhase(saved)) : data.levels[id - 1];
  return !!(q && saved?.cells?.some(Boolean) && saved.signature === boardSignature(q) && saved.cells.length === q.n * q.n &&
    (saved.boss?.phase === 2 && !saved.boss.rewarded || !solved(q, saved.cells) && saved.lives > 0));
}
function currentPond() {
  return progress.completed.length >= POND_COUNT ? null : unlocked(progress);
}
// App launch: straight back into a pond that is in progress, otherwise the current pond's transition screen.
// (A reload while on the hub — e.g. an auto-update — stays on the hub.)
function launch() {
  let onHub = false;
  try {
    onHub = sessionStorage.getItem(HUB_KEY) === "1";
  } catch {}
  const checkpoint = Object.entries(progress.sessions)
    .filter(([key, s]) => /^pond-/.test(key) && s.boss?.phase === 2 && !s.boss.rewarded)
    .sort((a, b) => (b[1].boss.updatedAt || 0) - (a[1].boss.updatedAt || 0))
    .map(([key]) => Number(key.slice(5))).find((id) => inProgress(id));
  const next = checkpoint || currentPond();
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
  return `<header class="hub-bar"><div class="hub-brand"><strong>Capybara Calm</strong><span class="map-lily-total lily-chip" aria-label="${n} of ${POND_COUNT * 3} lilies, ${g} golden">${lilyImg(true)}${n}/${POND_COUNT * 3}</span></div><div class="hub-icons">${navHTML(null, ["settings"])}</div></header>`;
}
// Designer home-start-A: Daily and Hot Spring as two tiles under the primary button.
function dailyButton() {
  const streak = streakAt(progress, calendarDay());
  return `<button class="hub-tile hub-daily" data-action="daily" aria-label="Daily Pond · ${streak}-day streak">${navIcon("daily")}<span><strong>Daily</strong><small>◕ ${streak}-day streak</small></span></button>`;
}
function hubTiles() {
  return `<div class="hub-tiles"><button class="hub-tile hub-leaderboard" data-action="leaderboard">🏆 Leaderboard</button>${dailyButton()}<button class="hub-tile hub-spring" data-action="collection" aria-label="Hot Spring">${navIcon("collection")}<span><strong>Hot Spring</strong><small>${Object.keys(CHARACTERS).length} capys</small></span></button></div>`;
}
function hubCapy() {
  return `<div class="capy-wrap"><img class="transition-capy" src="${sprite(progress.selected, "portrait")}" alt=""><button class="capy-swap" data-action="switchCapy" aria-label="Switch capy">⇄</button></div>`;
}
// The "Next pond" transition (= the hub). Variants: normal, boss, new-world breather, crate, gate, finale and all-clear.
function transition(id) {
  tintWorld = id ? worldOf(id) : WORLD_COUNT - 1;
  bonus.stop();
  clock.pause();
  cancelTap();
  tutorial = null;
  roundToken++;
  modal = null;
  view = "home";
  rememberHub(true);
  if (!id || id > POND_COUNT) {
    shell(
      "transition hub all-clear",
      `${hubBar()}<div class="transition-card"><small class="transition-kicker">Every pond cleared</small><h1>All ${POND_COUNT} ponds ✓</h1><p>${totalLilies(progress)}/${POND_COUNT * 3} lilies · ${progress.goldenLilies.length}/${BOSS_PONDS.length} golden</p><p class="transition-note">Replay any pond for more lilies in<br>Settings › Your pond collection.</p>${hubTiles()}</div>`,
    );
    showVersionNotice();
    return;
  }
  const q = data.levels[id - 1],
    boss = isBoss(id),
    k = worldOf(id),
    newWorld = NEW_WORLD_PONDS.includes(id),
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
    `${hubBar()}<div class="transition-card" data-level="${id}" data-role="${role(id)}"><small class="transition-kicker">${resume ? "In progress" : newWorld ? "New world" : boss ? "Boss pond" : "Next pond"}</small><h1>${boss ? "Boss " : ""}Pond ${id}</h1><p class="transition-world">World ${k + 1} · ${WORLDS[k]} · ${q.n}×${q.n}${q.rocks.length ? ` · ${q.rocks.length} rock${q.rocks.length > 1 ? "s" : ""}` : ""}</p>${boss ? `<img class="transition-boss" src="${bossAsset(id, bs)}" alt=""><div class="boss-info"><strong>Two phases · one boss pond</strong><small>The crate gate after it grows your Hot Spring.<br>Clear both phases without your power for a golden lily.</small></div>` : hubCapy()}${newWorld ? '<p class="transition-note">A gentler pond to warm up in the new world.</p>' : ""}${spare ? `<p class="transition-spare"><i class="orange spare" aria-hidden="true"></i>Spare orange ready · from the crate pond</p>` : ""}<section class="solve-lilies transition-lilies" aria-label="Lilies for this pond"><strong>Lilies · ${lilyCount(r)}/3</strong>${lilyDetails(r, q.n, null, boss ? 2 : 1)}</section><button class="primary" data-action="enterPond" data-level="${id}" data-entry-primary>${resume ? "Continue" : "Start"} ${boss ? "boss " : ""}pond ${id}</button>${hubTiles()}</div>`,
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
    `${hubBar()}<div class="transition-card" data-level="${id}" data-role="${role(id)}"><small class="transition-kicker">${finale ? "The finale" : isWorldGate(id) ? "World gate" : gate ? "Spring gate" : "Crate pond"}</small><h1>${pondLabel(id)}</h1><p class="transition-world">World ${k + 1} · ${WORLDS[k]} · ${lv ? `${lv.n}×${lv.n} · par ${lv.par}` : "crates"}</p><div class="crate-transition-art">${bonus.thumbFor(id)}</div><div class="boss-info crate-info"><strong>${finale ? "Pack the last crates of the pond" : isWorldGate(id) ? "Pack the fruit to open the next world" : gate ? "Pack the fruit to grow your Hot Spring" : "Push every crate onto a fruit"}</strong><small>${gate ? "Clearing it grows your Hot Spring.<br>" : ""}${finale ? "No orange here · just the big finish." : "Make par for +1 orange on the next pond."}</small></div><section class="solve-lilies transition-lilies" aria-label="Lilies for this pond"><strong>Lilies · ${lilyCount(r)}/3</strong>${crateLilyDetails(r, lv?.par ?? "—")}</section><button class="primary" data-action="enterPond" data-level="${id}" data-entry-primary>Start crate pond ${id}</button>${hubTiles()}</div>`,
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
    `<div class="pool crew-pool" data-tier="${tier}">${springScene(progress)}${worldBadgesHTML()}</div><div class="collection-title"><h1>Hot Spring</h1><p>Open crate gates to grow your spring · ${GATE_PONDS.filter((i) => progress.completed.includes(i)).length}/${GATE_PONDS.length}</p><span class="tier-pill sr-only">Tier ${tier}</span></div><p class="friend-names sr-only" aria-label="Your Hot Spring friends">Friends · ${friends.join(" & ")}</p><div class="spring-invite"><strong>Tap a capy to switch</strong><small>Each friend brings one power</small></div><header class="spring-bar"><button class="spring-back" data-action="home" aria-label="Back to pond">‹ Pond</button><div class="hub-icons">${navHTML("collection", ["settings"])}</div></header>`,
  );
}
function start(id, daily = false, retry = false) {
  rememberHub(false);
  clock.pause();
  lastLilyResult = null;
  cancelTap();
  powerNotice = false;
  lastMove = -1;
  lastWhy = null;
  roundToken++;
  tintWorld = daily ? 0 : worldOf(id);
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
    saved = progress.sessions[k],
    boss = !daily && isBoss(id),
    resumeSecond = boss && saved?.boss?.phase === 2 && (!retry || !saved.boss.rewarded);
  if (boss) puzzle = bossBoard(data, id, resumeSecond ? 2 : 1);
  state =
    !retry && saved && saved.signature === boardSignature(puzzle) && saved.cells.length === puzzle.n * puzzle.n
      ? dropWrongCapys(puzzle, { cells: [...saved.cells], lives: saved.lives, ...cleanAttempt(saved, saved.cells.length) })
      : resumeSecond && retry ? phaseTwoAttempt(puzzle, saved)
      : boss ? freshBossAttempt(puzzle) : newAttempt(puzzle.n);
  if (boss) state = restoreBoss(puzzle, state);
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
    if (state.boss && !state.boss.rewarded) complete();
    else { view = "solved"; renderGame(); animateJump(); }
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
  const bad = violations(puzzle, state.cells),
    doneZones = solvedZones(puzzle, state.cells),
    marks = zoneMarkCells(puzzle, doneZones);
  return `<div class="pond-wrap" data-sizing-mode="${sizingMode()}" data-n="${puzzle.n}" data-level="${isDaily ? "daily" : puzzle.id}" style="--board-max:${boardMaxWidth(puzzle.n)}px;--board-width:${boardWidthCSS()};--board-viewport-width:${boardViewportWidthCSS()}"><div class="zone-grid" role="group" aria-label="${puzzle.n} by ${puzzle.n} pond" style="--n:${puzzle.n}">${state.cells
    .map((v, i) => {
      const rock = puzzle.rocks.includes(i),
        locked = isLocked(puzzle, state, i),
        isbad = bad.has(i),
        hi = state.power.peekCell === i && peekVisible(),
        zoneDone = doneZones.has(puzzle.zones[i]);
      return `<button class="cell ${locked ? "capy-locked" : ""} ${isbad ? "bad" : ""} ${hi ? "peeked" : ""} ${zoneDone ? "zone-solved" : ""} ${i === lastMove ? "last-move" : ""} ${puzzle.fixed?.includes(i) ? "boss-survivor" : ""}" data-cell="${i}" data-value="${v}" aria-label="Row ${Math.floor(i / puzzle.n) + 1}, column ${(i % puzzle.n) + 1}, zone ${puzzle.zones[i] + 1}, ${rock ? "rock" : v === 2 ? (isbad ? "capy, conflict" : "capy") : v === 1 ? "X" : "empty"}${locked ? ", locked correct capy" : ""}${puzzle.fixed?.includes(i) ? ", fixed friend from phase 1" : ""}${zoneDone ? ", zone done" : ""}${i === lastMove ? ", last move" : ""}${hi ? ", Peek glow" : ""}" ${view === "solved" ? "disabled" : ""} ${rock ? 'aria-disabled="true" data-rock="true"' : ""} style="--zone-gradient:linear-gradient(145deg,${colors[puzzle.zones[i]][0]},${colors[puzzle.zones[i]][1]});background:var(--zone-gradient)">${pattern(puzzle.zones[i])}${marks.has(i) ? '<span class="zone-mark" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.5 5 9l4.5-6"/></svg></span>' : ""}${rock ? '<img class="rock-art" src="assets/rock.png" alt="">' : v === 1 ? '<span class="xmark">×</span>' : v === 2 ? `<img class="capy" alt="" src="${pieceSprite()}">${locked ? '<span class="lock-badge" aria-hidden="true"><svg viewBox="0 0 12 12"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg></span>' : ""}` : hi ? `<img class="peek-ghost" src="${pieceSprite()}" alt="Peek ghost">` : ""}</button>`;
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
    pureReward = reward && !state.power.used && progress.goldenLilies.includes(puzzle.id),
    compact = v5Chrome();
  shell(
    `game ${clear ? "solved" : ""} ${compact && !clear ? "chrome-v5" : ""}`,
    `${compact && !clear ? compactHeaderHTML(label, count) : `<header class="topbar"><button class="level-pill" data-action="home" aria-label="Back to home">‹ ${clear ? label : ""}</button>${clear ? "" : '<button class="help-btn" data-action="rules" aria-label="Rules">?</button>'}${clear ? `<div class="solved-counter" aria-label="${count} of ${puzzle.n} capys"><img src="${pieceSprite()}" alt=""><strong>${count}/${puzzle.n}</strong></div>` : `<h2>${label}${isDaily ? ` · ${puzzle.date.slice(5)}` : ""}</h2><div class="top-counter"><img src="${pieceSprite()}" alt=""><strong class="capy-counter-total">${count}/${puzzle.n}</strong></div>`}${clear ? "" : `<div class="life-area"><div class="lives" data-lives="${state.lives}" data-spare="${state.spare ? 1 : 0}" aria-label="${state.lives} oranges left${state.spare ? " plus 1 spare orange" : ""}">${[0, 1, 2].map((i) => `<span class="orange ${i >= state.lives ? "used" : ""}"></span>`).join("")}${state.spare ? '<span class="orange spare" title="Spare orange · this pond only"></span>' : ""}</div>${state.power.napRemaining ? `<span class="nap-badge">Nap · ${state.power.napRemaining}</span>` : ""}</div>`}</header>`}${!isDaily && state.boss && !clear ? bossBadgeHTML() : ""}${clear ? '<div class="banner" role="status">Pond cleared</div>' : compact ? "" : ruleCards()}${boardHTML()}<section class="lower">${clear ? `<div class="spring celebration" data-phase="gather"><div class="steam"></div><div class="dock"></div>${progress.completed.includes(10) ? '<div class="lantern l1"></div><div class="lantern l2"></div>' : ""}<div class="ripples">${Array.from({ length: puzzle.n }, (_, i) => `<i class="splash-ring" style="--i:${i};--land:${landingAt(i)}ms;left:${((i + 0.5) * 100) / puzzle.n}%"></i>`).join("")}</div><div class="steam-puffs"><i></i><i></i><i></i></div><div class="jumpers" style="--count:${puzzle.n}">${Array.from({ length: puzzle.n }, (_, i) => `<img class="soaking-capy" src="${pieceSprite("swim")}" alt="" style="--i:${i};--land:${landingAt(i)}ms;--soak-x:${[18, 65, 34, 80, 17, 59, 45, 28, 74, 50][i]}%;--soak-y:${[42, 46, 65, 66, 82, 83, 56, 54, 58, 72][i]}%">`).join("")}</div>${pureReward ? `<span class="reward-lily golden-lily" role="img" aria-label="Golden lily pad reward" style="--reaction:${reactionAt(puzzle.n)}ms">✦<small>${puzzle.id}</small></span>` : ""}<div class="reaction" style="--reaction:${reactionAt(puzzle.n)}ms"><img src="${sprite(progress.selected, "portrait")}" alt=""><span>Ahh…</span></div>${state.lives ? `<div class="orange-saved" style="--reaction:${reactionAt(puzzle.n)}ms">🍊 ${state.lives} kept</div>` : ""}</div>${lilyResultsHTML()}<p class="sub">${reward ? `${pureReward ? "Pure solve · Golden lily pad" : "Boss cleared · the crate gate is next!"}` : isDaily ? `Splash! ${streakAt(progress, puzzle.day)} day streak` : "Splash! Into the hot spring"}</p><div class="chips"><button class="chip" data-action="collection">♨ Hot Spring</button><button class="chip primary" data-action="next">Next pond →</button></div>` : (compact ? thumbLowerHTML() : `${state.spare ? '<p class="tap-hint spare-hint"><i class="orange spare mini" aria-hidden="true"></i><span><strong>Spare orange · this pond only</strong> · used first if you slip; mistakes still count</span></p>' : '<div class="play-menu"><p class="tap-hint">Tap × · Double-tap capy · Drag ×</p><button class="pause-btn" data-action="pause">Ⅱ Pause</button></div>'}${messageCardHTML()}<div class="controls"><button class="undo-round" data-action="undo" aria-label="Undo" ${history.some((h) => undoChanges(state, h.cells, puzzle)) ? "" : "disabled"}><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24H11m0 0 12-12M11 24l12 12"/></svg></span><strong>Undo</strong></button>${powerButton()}</div>`)}</section>`,
  );
  if (state.boss) root.querySelector(".screen").dataset.bossPhase = String(bossPhase(state));
  if (focusedCell !== undefined) root.querySelector(`[data-cell="${focusedCell}"]`)?.focus({ preventScroll: true });
  const renderedPuzzle = puzzle;
  requestAnimationFrame(() => {
    if (puzzle !== renderedPuzzle || view === "bossTransform") return;
    drawOutlines();
    if (tutorial) renderTutorial();
  });
}
/** v5.0: the companion power's short status. In the compact chrome the power button carries the power's feedback
 * (the companion card is gone): Peek glow, Nap charges, Second chance's restored orange. */
function powerStatus(compact = v5Chrome()) {
  const kind = effectivePower(progress.selected);
  if (compact) {
    if (peekVisible()) return "Peek · place the glow";
    if (state.power.napRemaining && kind === "nap") return `Nap · ${state.power.napRemaining} safe`;
    if (powerNotice) return "Orange restored";
  }
  return state.power.used
    ? state.power.napRemaining && kind === "nap"
      ? `Active · ${state.power.napRemaining}`
      : "✓ Used"
    : kind === "secondChance" && !state.lastMistake
      ? "No mistake yet"
      : "Ready";
}
function compactHeaderHTML(label, count) {
  return `<header class="topbar topline"><button class="level-pill" data-action="home" aria-label="Back to home">‹</button><h2>${label}${isDaily ? ` · ${puzzle.date.slice(5)}` : ""}</h2><div class="top-counter"><img src="${pieceSprite()}" alt=""><strong class="capy-counter-total">${count}/${puzzle.n}</strong></div><div class="life-area"><div class="lives" data-lives="${state.lives}" data-spare="${state.spare ? 1 : 0}" aria-label="${state.lives} oranges left${state.spare ? " plus 1 spare orange" : ""}">${[0, 1, 2].map((i) => `<span class="orange ${i >= state.lives ? "used" : ""}"></span>`).join("")}${state.spare ? '<span class="orange spare" title="Spare orange · this pond only"></span>' : ""}</div></div><button class="help-btn" data-action="rules" aria-label="Rules">?</button></header>`;
}
const TOOL_HINT = { x: "× tool · one tap marks ×", capy: "Capy tool · one tap places a capy", none: "Tap × · double-tap capy · drag ×" };
function thumbLowerHTML() {
  const undoOk = history.some((h) => undoChanges(state, h.cells, puzzle));
  return `${state.spare ? '<p class="tap-hint spare-hint"><i class="orange spare mini" aria-hidden="true"></i><span><strong>Spare orange</strong> · used first if you slip</span></p>' : ""}<div class="play-menu"><p class="tool-hint" data-tool="${tool || "none"}">${TOOL_HINT[tool || "none"]}</p><button class="pause-btn" data-action="pause">Ⅱ Pause</button></div><div class="controls thumbbar" role="toolbar" aria-label="Pond tools"><button class="tool-btn" data-action="tool" data-tool="x" aria-pressed="${tool === "x"}" aria-label="× tool"><span class="tool-icon x-icon" aria-hidden="true">×</span><strong>Mark</strong></button><button class="tool-btn" data-action="tool" data-tool="capy" aria-pressed="${tool === "capy"}" aria-label="Capy tool"><img class="tool-icon" src="${pieceSprite()}" alt=""><strong>Capy</strong></button><button class="undo-round tool-btn" data-action="undo" aria-label="Undo" ${undoOk ? "" : "disabled"}><span class="round-icon neutral-undo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24H11m0 0 12-12M11 24l12 12"/></svg></span><strong>Undo</strong></button>${powerButton()}</div>`;
}
function powerButton() {
  const kind = effectivePower(progress.selected),
    used = state.power.used,
    id = powerIdentity(progress.selected, kind);
  return `<button class="power-btn ${v5Chrome() ? "tool-btn power-tool" : ""} ${v5Chrome() && (peekVisible() || state.power.napRemaining || powerNotice) ? "power-feedback-on" : ""}" data-action="power" data-power-kind="${kind}" data-used="${used}" aria-label="${id.name}" style="--identity:${id.color};--identity-light:${id.light}" ${canUsePower(puzzle, state, progress.selected) ? "" : "disabled"}><i class="round-icon">${powerIcon(kind)}<img class="power-face" src="${id.face}" alt="${progress.selected}"><b class="power-use-badge" aria-label="${used ? "Power used" : "Power unused"}">${used ? "0" : "1"}</b></i><span><strong>${v5Chrome() ? progress.selected : id.name}</strong><small>${powerStatus()}</small></span></button>`;
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
    b.querySelector("small").textContent = powerStatus();
    b.classList.toggle("power-feedback-on", v5Chrome() && (peekVisible() || !!state.power.napRemaining || powerNotice));
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
    `<svg class="zone-outline" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}" aria-hidden="true"><g fill="none" stroke="${v5Chrome() ? "#2E3D2D" : "#3F513E"}" stroke-width="${v5Chrome() ? 6 : 5}" stroke-linejoin="round" stroke-linecap="butt">${lines}</g></svg>`,
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
  const rejected = after.rejected !== undefined,
    why = rejected ? explainCapy(puzzle, before.cells, i) : null,
    correctCapy = value === 2 && !rejected && !violations(puzzle, after.cells).has(i);
  lastWhy = why;
  if (!rejected) lastMove = i;
  if (!rejected) {
    solveOrder = solveOrder.filter((c) => c !== i);
    if (value === 2) solveOrder.push(i);
    history.push(before);
    if (history.length > 100) history.shift();
  }
  if (value === 2) vibrate(why?.kind === "offSolution" ? "offSolution" : rejected || !correctCapy ? "mistake" : "correct", progress.haptics);
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
  if (rejected) rejectCapy(i, why);
  else if (correctCapy) rippleFrom(i);
  if (spareJustUsed) toast("Spare orange used · the mistake still counts");
  if (tutorial) advanceTutorial();
  if (state.lives === 0) gameOver();
}
// The rejected capy appears for a moment with a red ring, shakes and hops out; the cell keeps its old content.
/** v5.0: a correct capy sends a brief ripple through its 8 neighbours (CSS animation; none with reduced motion). */
function rippleFrom(i) {
  const grid = root.querySelector(".zone-grid");
  if (!grid) return;
  grid.dataset.rippleFrom = String(i);
  for (const j of neighbours8(puzzle.n, i)) {
    const c = grid.querySelector(`[data-cell="${j}"]`);
    if (!c) continue;
    const d = Math.abs(Math.floor(j / puzzle.n) - Math.floor(i / puzzle.n)) + Math.abs((j % puzzle.n) - (i % puzzle.n));
    c.style.setProperty("--ripple-delay", `${(d - 1) * 60}ms`);
    c.classList.add("ripple");
  }
  setTimeout(() => grid.isConnected && grid.querySelectorAll(".ripple").forEach((c) => c.classList.remove("ripple")), 700);
}
/** v5.0 explanatory errors: show what the rejected capy broke (row/column/zone band + ring on the touching capy) or,
 * when it broke no visible rule, a distinct dashed amber flash with "Doesn't fit the solution". */
function explainReject(i, why) {
  const grid = root.querySelector(".zone-grid");
  if (!grid || !why) return;
  grid.dataset.explain = why.kind;
  const at = (j) => grid.querySelector(`[data-cell="${j}"]`);
  if (why.kind === "rule") {
    for (const b of why.breaks) {
      if (b.rule !== "touch") for (const j of b.cells) at(j)?.classList.add("break-band", `break-${b.rule}`);
      for (const j of b.capys) at(j)?.classList.add("break-capy");
    }
  } else at(i)?.classList.add("off-solution");
  at(i)?.classList.add(why.kind === "rule" ? "break-origin" : "off-origin");
  showMoveNote(why);
  setTimeout(() => {
    if (!grid.isConnected) return;
    delete grid.dataset.explain;
    grid.querySelectorAll(".break-band,.break-capy,.off-solution,.break-origin,.off-origin").forEach((c) => c.classList.remove("break-band", "break-row", "break-column", "break-zone", "break-capy", "off-solution", "break-origin", "off-origin"));
  }, 1800);
}
let moveNoteTimer = 0;
function showMoveNote(why) {
  clearTimeout(moveNoteTimer);
  root.querySelector(".move-note")?.remove();
  const wrap = root.querySelector(".pond-wrap");
  if (!wrap) return;
  wrap.insertAdjacentHTML("beforeend", `<p class="move-note ${why.kind === "rule" ? "rule-note" : "off-note"}" role="status" data-kind="${why.kind}"><strong>${why.kind === "rule" ? "Breaks a rule" : OFF_SOLUTION_HINT}</strong>${why.kind === "rule" ? `<small>${escapeHTML(why.message)}</small>` : "<small>No rule broken · it's just not this pond's answer</small>"}</p>`);
  moveNoteTimer = setTimeout(() => root.querySelector(".move-note")?.remove(), 2200);
}
function rejectCapy(i, why = null) {
  const cell = root.querySelector(`[data-cell="${i}"]`);
  if (!cell) return;
  explainReject(i, why);
  cell.classList.add("reject-shake");
  cell.insertAdjacentHTML("beforeend", `<img class="capy reject-capy" alt="" src="${pieceSprite()}">`);
  const label = cell.getAttribute("aria-label");
  cell.setAttribute("aria-label", `${label}, wrong spot: capy hopped out${why ? ` · ${why.message}` : ""}`);
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
  // v5.0 tool mode: with × or Capy picked, one tap acts at once (no double-tap wait). No tool = the classic scheme.
  if (tool && !tutorial && v5Chrome()) {
    cancelTap();
    const v = state.cells[i];
    play(i, tool === "x" ? (v === 1 ? 0 : 1) : v === 2 ? 0 : 2, true);
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
function bossBadgeHTML() {
  return `<p class="boss-phase" tabindex="-1" role="status" aria-live="polite">Phase ${bossPhase(state)} of 2${bossPhase(state) === 2 ? '<span>One friend stayed · new regions</span>' : ''}</p>`;
}
function transformBoss() {
  clock.pause();
  cancelTap();
  const previousPuzzle = puzzle, previousState = state,
    nextPuzzle = bossBoard(data, puzzle.id, 2),
    nextState = withLocks(nextPuzzle, phaseTwoAttempt(nextPuzzle, state)),
    token = ++roundToken,
    survivor = nextPuzzle.fixed[0],
    reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
  // Persist the playable next phase first. A reload at ANY animation frame resumes it.
  puzzle = nextPuzzle; state = nextState; view = "bossTransform";
  clock.bind(state.metrics);
  history = []; currentHint = null;
  saveRound();
  puzzle = previousPuzzle; state = previousState;
  renderGame(); drawOutlines();
  const screen = root.querySelector('.screen'), grid = root.querySelector('.zone-grid');
  screen.classList.add('boss-shifting');
  screen.dataset.reduced = String(reduced);
  root.querySelector('.boss-phase').textContent = 'Phase 1 complete · one friend is staying…';
  grid.setAttribute('aria-label', 'The ground opens. One capy stays for phase 2.');
  root.querySelectorAll('button').forEach((b) => b.disabled = true);
  let order = 0;
  for (const i of solutionCells(previousPuzzle)) {
    const cell = grid.querySelector(`[data-cell="${i}"]`);
    cell.classList.add(i === survivor ? 'boss-staying' : 'boss-sinking');
    if (i !== survivor) cell.style.setProperty('--sink-delay', `${300 + order++ * 90}ms`);
  }
  puzzle = nextPuzzle; state = nextState;
  solveOrder = [survivor];
  setTimeout(() => {
    if (token !== roundToken || view !== 'bossTransform') return;
    view = 'game'; modal = null; lastMove = survivor; lastWhy = null;
    renderGame();
    root.querySelector('.screen').classList.add('boss-revealed');
    root.querySelector('.boss-phase')?.focus({ preventScroll: true });
    saveRound();
  }, reduced ? 200 : 900 + order * 90);
}

function complete() {
  if (!isDaily && state.boss?.phase === 1) { transformBoss(); return; }
  if (state.boss?.rewarded) return;
  clock.pause();
  if (state.boss) state.boss.rewarded = true;
  lastLilyResult = awardLilies(progress, puzzle, state.metrics, isDaily);
  // v5.0: pond score (not for the Daily). Unknown time (an attempt from an older version) earns no time bonus.
  lastScore = isDaily
    ? null
    : recordScore(
        progress,
        puzzle.id,
        logicScore({
          id: puzzle.id,
          n: puzzle.n,
          oranges: state.lives,
          seconds: state.metrics.known && state.metrics.started ? state.metrics.elapsedMs / 1000 : Infinity,
          helped: state.power.used && state.power.kind === "secondChance",
          phases: state.boss ? 2 : 1,
        }),
      );
  cancelTap();
  vibrate("solve", progress.haptics);
  view = "solved";
  if (isDaily) finishDaily(progress, puzzle.day);
  else if (!progress.completed.includes(puzzle.id)) progress.completed.push(puzzle.id);
  awardPureBoss(progress, puzzle, state, isDaily);
  saveRound();
  persist();
  if (lastScore) queueScores();
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
      `<div class="shade"><section class="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 id="settings-title">Make yourself cozy</h2><div class="settings-row"><span>Haptics · gentle buzz</span><button data-action="settingsHaptics" aria-label="Haptics" aria-pressed="${progress.haptics}">${progress.haptics ? "On" : "Off"}</button></div><div class="settings-row"><span>Sound effects · splashes</span><button data-action="settingsAudio" aria-label="Sound" aria-pressed="${progress.audio}">${progress.audio ? "On" : "Off"}</button></div><div class="settings-row"><span>Music · pastoral pond</span><button data-action="settingsMusic" aria-label="Music" aria-pressed="${progress.music}">${progress.music ? "On" : "Off"}</button></div><div class="settings-row"><span>Crate ponds · D-pad</span><button data-action="settingsDpad" aria-label="Crate ponds D-pad" aria-pressed="${progress.bonus.dpad}">${progress.bonus.dpad ? "On" : "Off"}</button></div><button class="nickname-setting" data-action="editNickname">Nickname · ${escapeHTML(progress.nickname)} · Edit</button><button data-action="progress">Your pond collection · ${totalLilies(progress)}/${POND_COUNT * 3}</button><button class="leaderboard-setting" data-action="leaderboard">Leaderboard · ${leaderboard.state().optIn ? `joined as ${escapeHTML(leaderboard.displayName())}` : "view rankings"}</button><button class="music-credit-link" data-action="musicCredits">Music credits · CC0</button><button data-action="install" aria-label="Install app">${installCopy()}</button><p class="small-text">One capy per row, column & zone.<br>No touching — diagonals too.</p><p class="build-label" data-build="${BUILD.build}" aria-label="Running version">v${BUILD.version} · build ${BUILD.build}</p><button class="primary" data-action="closeSettings">Done</button></section></div>`,
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
  if (!g.dragging && tool === "capy" && v5Chrome()) return; // the Capy tool never paints ×
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
    `<div class="tutorial-instruction" role="status">${TUTORIAL_COPY[t.step]}</div><div class="tutorial-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= t.step ? "on" : ""}"></i>`).join("")}</div>${t.step === 3 ? '<p class="tutorial-note">A capy in the wrong spot hops back out and costs an orange.</p><p class="tutorial-note tutorial-tools">From pond 2: the bottom bar holds <strong>×</strong>, <strong>Capy</strong>, Undo and your buddy. Pick × or Capy and one tap acts at once · rules live behind <strong>?</strong></p><button class="primary tutorial-play" data-action="tutorialPlay">Let’s play</button>' : ""}`,
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
      ["× / Capy tool", "Pick one in the bottom bar: one tap acts at once"],
    ]
      .map(([a, b], i) => `<li><span>${i + 1}</span><div><strong>${a}</strong><small>${b}</small></div></li>`)
      .join(
        "",
      )}</ol><p class="mistake-rule"><strong>Wrong spot?</strong> The capy hops right back out and costs an orange. If it breaks a rule, the row, column, zone or touching capy lights up; if it breaks none, it just <em>doesn't fit the solution</em>. Right spots lock in place.</p><p class="power-brief">Same puzzle rules for every buddy.<br>One power per attempt · Three oranges.<br>Lily time target: ${duration(pondTargetMs(puzzle))}. No countdown.</p><button class="primary replay-tutorial" data-action="replayTutorial">↻ Replay tutorial</button><small class="replay-sub">A quick, hands-on reminder</small><button class="sheet-done" data-action="closeRules">Back to pond</button></section>`,
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
    case 'pause': pauseMenu(); break;
    case 'resume': root.querySelector('.shade')?.remove();modal=null;bonus.resume?.();syncClock();break;
    case 'leaderboard': openLeaderboard(); break;
    case 'lbEdit':leaderboardDialog('',true);break;
    case 'lbCancelName':leaderboardDialog();break;
    case 'lbOverall':lbMode='overall';refreshLeaderboard();break;
    case 'lbByWorld':lbMode='world';refreshLeaderboard();break;
    case 'lbRefresh':leaderboard.flush(true).then(refreshLeaderboard);break;
    case 'lbJoin': {
      const name=root.querySelector('#lb-name')?.value||'';
      if(!leaderboard.join(name)){leaderboardDialog('Use 2–16 characters, or leave the name empty.',true);break;}
      queueScores().then(()=>{if(modal==='leaderboard'){leaderboardDialog(leaderboard.pending()?'Your entry is queued. It will sync when connected.':'Your entry is synced.');refreshLeaderboard();}});
      leaderboardDialog('Syncing your existing scores and progress…');
      break;
    }
    case 'lbLeave':
      leaderboard.leave().then(({removed})=>{if(modal==='leaderboard'){leaderboardDialog(removed?'Your shared entry was deleted.':'Deletion queued. Reconnect to remove your shared entry.');refreshLeaderboard();}});break;
    case 'lbClose':closeLeaderboard();break;
    case "worldTop":
      root.querySelector(".progress-ledger")?.remove();
      worldTop(Number(b.dataset.world), () => home());
      break;
    case "worldContinue": {
      const next = worldNext;
      worldNext = null;
      next ? next() : home();
      break;
    }
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
    case "tool":
      tool = tool === b.dataset.tool ? null : b.dataset.tool;
      cancelTap();
      renderGame();
      root.querySelector(`[data-action="tool"][data-tool="${b.dataset.tool}"]`)?.focus({ preventScroll: true });
      break;
    case "rules":
      root.querySelector('.shade')?.remove();rulesSheet();
      break;
    case "closeRules":
      bonus.resume?.();modal = null;
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
      if (isDaily) transition(progress.completed.length >= POND_COUNT ? null : unlocked(progress));
      else proceed(puzzle.id === POND_COUNT ? (progress.completed.length >= POND_COUNT ? null : unlocked(progress)) : puzzle.id + 1);
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
      root.querySelector('.shade')?.remove();settings();
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
      bonus.resume?.();modal = null;
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
  if (t?.pointer === e.pointerId) {
    t.at = performance.now();
    t.clicked = false;
    recentControlTaps.push(t);
    if (recentControlTaps.length > 8) recentControlTaps.shift();
    requestAnimationFrame(() => {
      if (controlTap === t && !t.handled && !t.cancelled && t.b.isConnected) {
        t.handled = true;
        activateControl(t.b);
      }
    });
  }
});
// v4.3: match a native click to the contact that produced it: by pointerId (Chromium gives touch clicks the touch's
// own, ever-increasing id), else (engines whose click has no pointerId) the oldest recent contact on the same cell
// that has not had its click yet. One click consumes one contact.
function tapForClick(e, i) {
  const now = performance.now();
  // WebKit turns touch contact 2 into a compatibility mouse click with id 1.
  // That mouse id cannot identify the original touch; match its cell instead.
  if (Number.isInteger(e.pointerId) && e.pointerId > 0 && e.pointerType !== "mouse") {
    const byId = recentTaps.findLast((t) => t.pointer === e.pointerId && !t.clicked);
    if (byId) return byId;
    if (recentTaps.some((t) => t.pointer === e.pointerId)) return { handled: true }; // duplicate click of a consumed contact
    return null;
  }
  return recentTaps.find((t) => t.i === i && !t.clicked && now - t.at < 1000) ?? null;
}
// Consume a control fallback's late native click before routing into replacement board DOM.
root.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  // Controls need the same contact accounting as cells. WebKit's compatibility
  // mouse click may arrive after the fallback changed the DOM or opened a dialog.
  // Keyboard / assistive activation (detail 0) remains a separate action.
  if (e.detail !== 0) {
    const reliableId = Number.isInteger(e.pointerId) && e.pointerId > 0 && e.pointerType !== "mouse";
    const t = reliableId
      ? recentControlTaps.findLast((t) => t.pointer === e.pointerId && !t.clicked)
      : recentControlTaps.find((t) => !t.clicked && performance.now() - t.at < 1000 &&
          (t.b === b || (!t.b.isConnected && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10)));
    if (t) {
      t.clicked = true;
      if (t.handled || t.cancelled) return;
      t.handled = true;
      if (!t.b.disabled && t.b.isConnected) activateControl(t.b);
      return;
    }
  }
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
  const bossResponse = await fetch("./boss-levels.json");
  if (!bossResponse.ok) throw Error("boss content");
  data.bosses = (await bossResponse.json()).levels;
  loaded = load(storage, data);
  await bonus.ensureLevels().catch(() => {}); // rev b: the hub can open on a crate pond, so its par/thumbnail must be ready before the first render.
  progress = loaded.progress;
  queueScores();
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
    `<header><h1>Capybara Calm</h1><p>A little pond adventure</p></header><div class="nickname-companions">${Object.keys(CHARACTERS)
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
// ---------- v5.0 scores, world-complete top 10, optional leaderboard ----------
// v5.0 Hot Spring: one season badge per world; each lights up when that world's gate (30/60/90/120/150) is open,
// and shows how many of the world's 3 crate gates are open.
function worldBadgesHTML() {
  const icons = ["🌱", "🎋", "🍁", "❄", "☁"];
  return `<ol class="world-badges" aria-label="Worlds">${Array.from({ length: WORLD_COUNT }, (_, w) => {
    const gates = GATE_PONDS.filter((g) => worldOf(g) === w),
      open = gates.filter((g) => progress.completed.includes(g)).length,
      done = progress.completed.includes(WORLD_GATES[w]);
    return `<li class="world-badge ${done ? "earned" : ""}" data-world="${w + 1}" aria-label="World ${w + 1} ${WORLDS[w]}: ${open} of 3 gates open"><span aria-hidden="true">${icons[w]}</span><small>${open}/3</small></li>`;
  }).join("")}</ol>`;
}
function scoreLine() {
  if (isDaily || !lastScore) return "";
  const sc = lastScore;
  return `<p class="pond-score" data-score="${sc.score}"><span>Pond score</span><strong>${sc.score.toLocaleString("en-US")}</strong><small>${sc.newBest ? (sc.previous === null ? "First score" : "New best!") : `Best ${sc.best.toLocaleString("en-US")}`}${state.power.used && state.power.kind === "secondChance" ? " · Second chance halves it" : ""}</small></p>`;
}
let worldNext = null;
/** After a world gate (30/60/90/120/150) is cleared for the first time, show that world's top 10 before moving on. */
function afterWorldGate(gateId, next) {
  if (!isWorldGate(gateId) || !progress.completed.includes(gateId)) return next();
  const w = worldOf(gateId);
  if (progress.worldsShown.includes(w)) return next();
  progress.worldsShown = [...progress.worldsShown, w].sort();
  persist();
  worldTop(w, next, true);
}
const LOCAL_REASON = {
  "not-joined": "Local only · join the leaderboard in Settings to compare scores with other players.",
  "no-backend": "Local only · the shared leaderboard isn't connected yet. Your scores wait safely on this phone.",
  offline: "Local only · you're offline. Your scores are queued and upload when you're back online.",
  error: "Local only · couldn't reach the leaderboard. Your scores are queued and will retry.",
};
function top10HTML(b) {
  if (b.mode === 'local') return `<h2>Top 10</h2><p class="top10-local" data-reason="${b.reason}">${LOCAL_REASON[b.reason] || LOCAL_REASON.error}</p>`;
  const row=(e)=>`<tr class="top10-row ${e.me?'me':''}"><td>#${e.rank}</td><th scope="row">${escapeHTML(e.nickname)}${e.me?' (you)':''}</th><td>${Number(e.score).toLocaleString('en-US')} pts</td><td>Pond ${e.last_cleared||0}</td></tr>`;
  const stamp=b.mode==='cached'?`<p class="last-synced">Last synced · ${escapeHTML(new Date(b.syncedAt).toLocaleString('en-US'))}${navigator.onLine?' · could not refresh':' · offline'}</p>`:'';
  return `<h2>Top 10</h2>${stamp}<div class="lb-table-wrap"><table class="top10-list shared"><thead><tr><th>Rank</th><th>Name</th><th>Score</th><th>Last cleared</th></tr></thead><tbody>${b.entries.map(row).join('')}</tbody></table></div>${!b.entries.length?'<p>No entries yet. You can be the first.</p>':''}${leaderboard.state().optIn?`<p class="top10-rank">${b.me.rank?`Your rank: <strong>#${b.me.rank}</strong>${b.me.of?` of ${b.me.of}`:''} · ${Number(b.me.score).toLocaleString('en-US')} pts · Pond ${b.me.last_cleared||0}`:leaderboard.pending()?'Your entry is queued · reconnect to sync':'Not ranked yet'}</p>`:''}`;
}
function worldTop(w, next, complete = false) {
  bonus.stop();
  clock.pause();
  cancelTap();
  tutorial = null;
  roundToken++;
  modal = null;
  view = "worldTop";
  tintWorld = w;
  worldNext = next;
  const ws = worldScore(progress, w),
    last = w + 1 >= WORLD_COUNT;
  shell(
    "world-top",
    `<div class="world-top-card" data-world-top="${w + 1}"><small class="transition-kicker">${complete ? `World ${w + 1} complete` : "Leaderboard"}</small><h1>World ${w + 1} · ${WORLDS[w]}</h1><div class="world-top-score"><span>Your world score</span><strong>${ws.total.toLocaleString("en-US")}</strong><small>${ws.scored}/30 ponds scored${ws.scored < 30 ? " · unscored ponds count once replayed" : ""}</small></div><section class="top10" aria-live="polite"><h2>Top 10</h2><p class="top10-loading">Loading…</p></section><button class="primary" data-action="worldContinue">${complete ? (last ? "Finish" : `Continue → World ${w + 2}`) : "Back"}</button></div>`,
  );
  const token = roundToken;
  leaderboard
    .flush()
    .catch(() => {})
    .then(() => leaderboard.board(w, ws))
    .then((b) => {
      const box = root.querySelector(".top10");
      if (token === roundToken && box) box.innerHTML = top10HTML(b);
    });
}
let lbMode='overall',lbWorld=0,lbRequest=0,lbTimer=null;
function pauseMenu() {
  if(view==='game') saveRound();
  clock.pause();bonus.pause?.();cancelTap();modal='pause';
  root.querySelector('.shade')?.remove();
  root.querySelector('.screen').insertAdjacentHTML('beforeend',`<div class="shade"><section class="dialog pause-dialog" role="dialog" aria-label="Paused"><h2>Paused</h2><button class="primary" data-action="resume">Resume pond</button><button data-action="leaderboard">🏆 Leaderboard</button>${view==='bonus'?'':'<button data-action="rules">Rules</button>'}<button data-action="settings">Settings</button><button data-action="home">Back to home</button></section></div>`);
}
function openLeaderboard() {
  if(view==='game') saveRound();
  clock.pause();bonus.pause?.();cancelTap();
  root.querySelector('.shade')?.remove();root.querySelector('.sheet')?.remove();root.querySelector('.sheet-scrim')?.remove();
  modal='leaderboard';lbMode='overall';lbWorld=worldOf(puzzle?.id||currentPond()||1);
  root.querySelector('.screen').insertAdjacentHTML('beforeend',`<div class="shade leaderboard-layer"><section class="dialog leaderboard-dialog" role="dialog" aria-label="Leaderboard"><header><h2>🏆 Leaderboard</h2><button data-action="lbClose" aria-label="Close leaderboard">×</button></header><div class="lb-tabs"><button data-action="lbOverall" aria-pressed="true">Overall</button><button data-action="lbByWorld" aria-pressed="false">By world</button><select class="lb-world" aria-label="World" hidden>${WORLDS.map((name,i)=>`<option value="${i}" ${i===lbWorld?'selected':''}>World ${i+1} · ${name}</option>`).join('')}</select></div><section class="top10" aria-live="polite"><p>Loading…</p></section><div class="lb-membership"></div><button data-action="lbRefresh">Refresh</button></section></div>`);
  leaderboardDialog();refreshLeaderboard();clearInterval(lbTimer);lbTimer=setInterval(()=>{if(modal==='leaderboard')refreshLeaderboard();else clearInterval(lbTimer);},20000);
}
function leaderboardDialog(note='',editing=false) {
  if(modal!=='leaderboard'){openLeaderboard();return;}
  const st=leaderboard.state(),form=editing;
  root.querySelector('.lb-membership').innerHTML=`<p class="small-text lb-note" role="status">${escapeHTML(note)}</p>${form?`<p class="lb-privacy">If you join, others can see your chosen name, best campaign scores and last cleared pond. No account is needed.</p><label class="lb-label" for="lb-name">Display name (optional)</label><input id="lb-name" autocomplete="off" maxlength="64" value="${escapeHTML(st.optIn?st.nickname:progress.nickname||'')}"><p class="lb-preview" aria-live="polite"></p><button class="primary" data-action="lbJoin">${st.optIn?'Save name':'Join leaderboard'}</button><button data-action="lbCancelName">Cancel</button>`:`<button data-action="lbEdit">${st.optIn?'Edit name':'Join leaderboard'}</button>`}${st.optIn?'<button class="lb-leave" data-action="lbLeave">Leave and delete my entry</button>':''}`;
  if(form)updateLeaderboardPreview();
}
function updateLeaderboardPreview() {
  const input=root.querySelector('#lb-name'),preview=root.querySelector('.lb-preview');
  if(preview&&input)preview.textContent=`Preview: #— · ${input.value.trim()||DEFAULT_NAME} · ${worldScores(progress).reduce((sum,w)=>sum+w.total,0).toLocaleString('en-US')} pts · Pond ${lastCleared(progress.completed)}`;
}
async function refreshLeaderboard() {
  if(modal!=='leaderboard')return;
  const token=++lbRequest,mode=lbMode,w=lbWorld;
  root.querySelector('[data-action="lbOverall"]').setAttribute('aria-pressed',String(mode==='overall'));
  root.querySelector('[data-action="lbByWorld"]').setAttribute('aria-pressed',String(mode!=='overall'));
  root.querySelector('.lb-world').hidden=mode==='overall';
  const local=mode==='overall'?{total:worldScores(progress).reduce((sum,x)=>sum+x.total,0),last_cleared:lastCleared(progress.completed)}:worldScore(progress,w);
  const board=await leaderboard.board(mode==='overall'?'overall':w,local);
  if(token===lbRequest&&modal==='leaderboard')root.querySelector('.leaderboard-layer .top10').innerHTML=top10HTML(board);
}
function closeLeaderboard() {
  lbRequest++;clearInterval(lbTimer);root.querySelector('.leaderboard-layer')?.remove();modal=null;bonus.resume?.();syncClock();
}
function replayRow(id) {
  const crate = isCrate(id),
    n = crate ? bonus.levelInfo(id)?.n : data.levels[id - 1]?.n,
    resume = inProgress(id),
    label = pondLabel(id),
    best = progress.scores?.[id]?.best;
  return `<li class="replay-row" data-row="${id}"><span class="replay-name"><strong>${label}</strong><small>${n ? `${n}×${n}` : ""}${crate ? " · crates" : ""} · ${Number.isInteger(best) ? `best ${best.toLocaleString("en-US")}` : '<span class="unscored">unscored · replay to score</span>'}</small></span>${lilyRow(progress.lilies[id], "replay-lilies")}${progress.goldenLilies.includes(id) ? '<img class="ledger-gold" src="assets/v65/lily-golden.svg" alt="Golden lily earned">' : ""}<button class="replay-btn" data-action="replayPond" data-level="${id}" aria-label="${resume ? "Continue" : "Replay"} ${label}">${resume ? "Continue" : "Replay"}</button></li>`;
}
// v5.0: Settings › Progress groups the cleared ponds by world (one <details> per world, the current world open).
function replayListHTML() {
  const ids = [...progress.completed].filter((id) => id >= 1 && id <= POND_COUNT).sort((x, y) => x - y);
  if (!ids.length) return '<p class="replay-empty">Clear a pond and it shows up here to replay for lilies.</p>';
  const current = worldOf(Math.min(unlocked(progress), POND_COUNT));
  return `<div class="replay-worlds">${Array.from({ length: WORLD_COUNT }, (_, w) => {
    const mine = ids.filter((id) => worldOf(id) === w);
    if (!mine.length) return "";
    const ws = worldScore(progress, w),
      lilies = worldPonds(w).reduce((a, id) => a + lilyCount(progress.lilies[id]), 0);
    return `<details class="replay-world" data-world="${w + 1}" ${w === current ? "open" : ""}><summary><span><strong>World ${w + 1} · ${WORLDS[w]}</strong><small>${mine.length}/30 cleared · ${lilies}/90 lilies</small></span><span class="world-score" aria-label="World ${w + 1} score ${ws.total}"><b>${ws.total.toLocaleString("en-US")}</b><small>${ws.scored}/30 scored</small></span></summary><button class="world-top-btn" data-action="worldTop" data-world="${w}">World ${w + 1} top 10</button><ol class="replay-list" aria-label="Cleared ponds in world ${w + 1}">${mine.map(replayRow).join("")}</ol></details>`;
  }).join("")}</div>`;
}
function progressLedger() {
  modal = "progress";
  root.querySelector(".shade")?.remove();
  root.querySelector(".screen").insertAdjacentHTML(
    "beforeend",
    `<section class="progress-ledger" role="dialog" aria-modal="true" aria-label="Your pond collection"><header><div><h2>Your pond collection</h2><small>Settings · Progress</small></div><button data-action="backProgress" aria-label="Back to Settings">‹</button></header><div class="ledger-scroll"><div class="collection-total">${lilyImg(true)}<strong>${totalLilies(progress)}/${POND_COUNT * 3}</strong><span>water lilies collected</span><small><img src="assets/v65/lily-golden.svg" alt="">${progress.goldenLilies.length}/${BOSS_PONDS.length} golden · earned separately</small></div><h3>World scores</h3><p class="small-text score-note">Best pond scores add up per world. Ponds cleared before v5.0 are unscored until replayed.</p><h3>Replay a pond for lilies</h3>${replayListHTML()}<div class="ledger-encouragement"><img src="${sprite(progress.selected)}" alt=""><div><strong>Every clear is progress</strong><p>Replay a pond for another lily.<br>Earned lilies always stay yours.</p></div></div><p class="small-text">Nickname · ${escapeHTML(progress.nickname)}<br>Stored only on this phone. ${leaderboard.state().optIn ? "Your leaderboard name and world scores are shared only because you joined." : "Nothing is sent."}</p></div><button class="primary" data-action="backProgress">Back to Settings</button></section>`,
  );
}
function lilyResultsHTML() {
  const r = (isDaily ? progress.dailyLilies[puzzle.date] : progress.lilies[puzzle.id]) || emptyLilies();
  return `<div class="solve-time">${state.metrics.known ? `${duration(state.metrics.elapsedMs)} · ${state.metrics.mistakes} mistake${state.metrics.mistakes === 1 ? "" : "s"}` : "Earlier attempt · time and mistakes not recorded"}</div><section class="solve-lilies" aria-label="Lilies for this pond"><strong>Lilies for this pond · ${lilyCount(r)}/3</strong>${lilyDetails(r, puzzle.n, lastLilyResult?.newly, state.boss ? 2 : 1)}</section>${scoreLine()}`;
}

root.addEventListener("input", (e) => {
  if (e.target.id === "nickname-input") validateNicknameInput();
  if (e.target.id === 'lb-name') updateLeaderboardPreview();
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

root.addEventListener('change',e=>{if(e.target.matches('.lb-world')){lbWorld=Number(e.target.value);refreshLeaderboard();}});
