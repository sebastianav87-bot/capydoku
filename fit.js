// v4.3.1 (iPhone fit): the crate board and the logic board are sized from the visible HEIGHT as well as the width.
// Before, both boards were sized from the width only. On a short screen (an iPhone Safari tab with its toolbars,
// e.g. 390×664) the flex column squeezed the board's frame, so the crate board was clipped (Pond 10 showed ~4 rows)
// and the logic screen's Undo/power buttons slid off the bottom.
// How it works: after every DOM change on a board screen (a MutationObserver callback runs before the next paint, so
// there is no flicker) we measure how much the screen's content would overflow its height with nothing squeezed.
// If it overflows, a compact layout is tried first (smaller header, stats, hint, controls); whatever still
// overflows is taken off the board's side, so cell = min(width-based size, height-based size). Screens that already
// fit (e.g. 360×780 and 412×915 without the Show me row) are left exactly as they were.
const MIN_CELL = 24; // px; never shrink cells below this (tap target is still the whole cell)
const TIGHT_CELL = 34; // px; below this, the tighter control layout (fit-tight) is used first to give the board room
let fitting = false;
function boardOf(screen) {
  return screen.classList.contains("crate-screen") ? screen.querySelector(".crate-wrap") : screen.querySelector(":scope>.pond-wrap");
}
function deficit(screen) {
  screen.classList.add("fit-measure");
  const d = screen.scrollHeight - screen.clientHeight;
  screen.classList.remove("fit-measure");
  return d;
}
export function fitBoard(root = document) {
  const screen = root.querySelector(".screen.crate-screen,.screen.game:not(.solved)");
  if (!screen || fitting) return null;
  const wrap = boardOf(screen);
  if (!wrap) return null;
  fitting = true;
  try {
    wrap.style.removeProperty("width");
    wrap.style.removeProperty("max-width");
    screen.classList.remove("fit-compact", "fit-tight");
    let d = deficit(screen);
    if (d > 0) {
      screen.classList.add("fit-compact");
      d = deficit(screen);
    }
    if (d > 0) {
      const n = Number(wrap.dataset.n || wrap.querySelector("[style*='--n']")?.style.getPropertyValue("--n")) || 8;
      const size = () => {
        const w = wrap.getBoundingClientRect().width,
          cell = (wrap.querySelector(".crate-cell,.cell")?.getBoundingClientRect().width) || w / n;
        return { w, cell, chrome: w - cell * n }; // chrome = frame, padding and gaps
      };
      let m = size();
      if ((m.w - d - m.chrome) / n < TIGHT_CELL) {
        screen.classList.add("fit-tight");
        d = deficit(screen);
        m = size();
      }
      if (d > 0) {
        const side = Math.max(m.chrome + MIN_CELL * n, Math.floor(m.w - d - 1));
        wrap.style.width = side + "px";
        wrap.style.maxWidth = side + "px";
      }
    }
    screen.dataset.fit = d > 0 ? "shrunk" : screen.classList.contains("fit-tight") ? "tight" : screen.classList.contains("fit-compact") ? "compact" : "natural";
    return { deficit: d, fit: screen.dataset.fit };
  } finally {
    fitting = false;
  }
}
export function installFit(root, afterResize = () => {}) {
  const run = () => fitBoard(root);
  const resized = () => { run(); afterResize(); };
  new MutationObserver((list) => {
    if (fitting) return;
    if (list.some((m) => m.type === "childList" || m.attributeName === "hidden")) run();
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  addEventListener("resize", resized);
  addEventListener("orientationchange", resized);
  window.visualViewport?.addEventListener("resize", resized);
  document.fonts?.ready?.then(resized);
}
