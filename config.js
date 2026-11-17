// Product switch: A = fixed 52px cells; B = constant reference-width board.
// v5.0 leaderboardApi: the Cloudflare Worker origin (https://…workers.dev). EMPTY = off until Sebastián's account exists.
export const GAME_CONFIG={leaderboardApi:'',boardSizingMode:'B',lilyTargetVersion:1,lilyTargetMs:Object.freeze({5:120000,6:180000,7:270000,8:360000,9:450000,10:570000})};

/* v4.1 haptics: the ONE place every vibration pattern lives (milliseconds; arrays are buzz,pause,buzz…).
 * Android's Vibration API has no amplitude control, so strength = buzz duration.
 * iOS Safari (and every iOS browser, all WebKit) has NO Vibration API: navigator.vibrate is undefined,
 * so on iPhone these patterns are silently skipped; the visual feedback carries the meaning there.
 * v4 → v4.1: tick 12 → markX 30 / clearTap 26 / dragTick 22, legal 32 → correct 70,
 * rule break [45,60,45] → mistake [110,80,110], solve [45,60,70,60,105] → [90,60,120,60,220], landing 18 → 40.
 * Correct = one firm buzz; mistake = two long buzzes (clearly different). Locked bump = one short, light buzz.
 * v4.2 crate bonus reuses this table: cratePush 24 per pushed cell, crateLand [40,50,140], bonus solve = solve.
 * v4.3 ("still not strong enough"): every pattern one clear step longer (~1.5x buzz time), shapes unchanged so they stay distinct:
 * markX 30→50, clearTap 26→42, dragTick 22→34, correct 70→110, mistake [110,80,110]→[170,90,170],
 * solve [90,60,120,60,220]→[130,70,180,70,320], landing 40→65, locked 18→30, cratePush 24→38, crateLand [40,50,140]→[65,60,210]. */
export const HAPTIC_CONFIG=Object.freeze({
 dragThrottleMs:70, // unchanged from v4: at most one drag tick per 70 ms
 patterns:Object.freeze({
  markX:50,        // single tap: empty → X
  clearTap:42,     // single tap: X → empty, or clearing a placed (unlocked) capy
  dragTick:34,     // each newly painted cell while dragging (throttled)
  correct:110,      // a legal capy (double-tap); a double-tap never also ticks
  mistake:Object.freeze([170,90,170]), // v4.3 rev b: a capy on a wrong spot (rejected, costs an orange); v5.0: one that breaks a visible rule
  offSolution:Object.freeze([60,50,60,50,60]), // v5.0: rule-legal but not in the solution (rejected, costs an orange): three short taps, unlike mistake's two long buzzes
  solve:Object.freeze([130,70,180,70,320]),
  landing:65,      // each capy splashing into the hot spring
  locked:30,       // tapping a locked correct capy: light bump, no penalty (v4.2: also a stuck-crate warning)
  cratePush:38,    // v4.2 crate bonus: one short wooden scrape per cell a crate moves
  crateLand:Object.freeze([65,60,210]) // crate lands on a fruit (tap-pause-long; unlike correct 110 or mistake [170,90,170])
 })
});
