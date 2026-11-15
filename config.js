// Product switch: A = fixed 52px cells; B = constant reference-width board.
export const GAME_CONFIG={boardSizingMode:'B',lilyTargetVersion:1,lilyTargetMs:Object.freeze({5:120000,6:180000,7:270000})};

/* v4.1 haptics: the ONE place every vibration pattern lives (milliseconds; arrays are buzz,pause,buzz…).
 * Android's Vibration API has no amplitude control, so strength = buzz duration.
 * iOS Safari (and every iOS browser, all WebKit) has NO Vibration API: navigator.vibrate is undefined,
 * so on iPhone these patterns are silently skipped; the visual feedback carries the meaning there.
 * v4 → v4.1: tick 12 → markX 30 / clearTap 26 / dragTick 22, legal 32 → correct 70,
 * rule break [45,60,45] → mistake [110,80,110], solve [45,60,70,60,105] → [90,60,120,60,220], landing 18 → 40.
 * Correct = one firm buzz; mistake = two long buzzes (clearly different). Locked bump = one short, light buzz. */
export const HAPTIC_CONFIG=Object.freeze({
 dragThrottleMs:70, // unchanged from v4: at most one drag tick per 70 ms
 patterns:Object.freeze({
  markX:30,        // single tap: empty → X
  clearTap:26,     // single tap: X → empty, or clearing a placed (unlocked) capy
  dragTick:22,     // each newly painted cell while dragging (throttled)
  correct:70,      // a legal capy (double-tap); a double-tap never also ticks
  mistake:Object.freeze([110,80,110]), // a capy that breaks a rule (costs an orange)
  solve:Object.freeze([90,60,120,60,220]),
  landing:40,      // each capy splashing into the hot spring
  locked:18        // tapping a locked correct capy: light bump, no penalty
 })
});
