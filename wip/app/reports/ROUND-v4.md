# Capydoku v4.0 — local-only review build

Checked 10 November 2026 (EST). No push, publication, account, repository or payment. `/workspace/capydoku/app/` is the working tree; The Producer publishes only after screenshot review.

## STEP 0 — passed

The Producer's `app-v3.1-backup/` existed, its complete file-list/content hashes stayed stable across checks separated by120seconds (plus a third check), and runtime names/bytes matched the current app and shipped v3.1 tar **before app edits**. Gate passed9 November2026,10:42:33pm EST. Evidence: `step0-v4.json`, `../v4-step0/SUCCESS.json`. Frozen v1/v2/v3/v3.1 backups and previous runtime tars remain unchanged. Read-only `bugfix-v3.1/`, `hotfix-v3.1.2/`, `hotfix-v3.1.3/` were not edited. Final hashes/audit: `backups-audit-v4.log` / `backup-integrity-v4.json`.

## Included

- Approved v6 illustrated three-world path and Hot Spring, v6.1 canonical powers/icons/faces/72px button/first-use explanations, v6.2 illustrated **generic** board/counter, v6.3 120px boss locked/next/beaten SVGs, v6.4 Bloom body/face/density exports, v6.5 lilies/local nickname. All design notes were read; source sheets and native PNGs reviewed.
- Bosses10/20/30: dark locked/next, NEXT+gold ring, golden beaten;50px ordinary nodes;29 curves pass exactly through all30 centers. Native360px review caught a right-edge companion label; it now flips left on right-hand stops. Boss-neighbor companion art shifts sideways to keep new lily rows clear.
- Generic board/counter/Peek/rules use one `BOARD_SPRITE`; conflict uses an outline/!, never sprite tint. Starter selection is cosmetic and progress/streak-safe. Bloom v6.4 is centralized everywhere, including chooser, badge/node, HUD, power, first-use, switch, Spring, celebration; approved32/44/51/64@1/2/3 srcsets. Old Bloom bytes are absent from runtime references/precache.
- Hot Spring: “Who's joining you?” switch, three power tags, earned growth/objects and separate persistent golden lilies. Subtitle exactly **Beat a boss to grow your spring**. Next silhouette/line uses real existing upgrade names **Lanterns / Bamboo nook / Mountain pool**, bosses10/20/30; hidden at max tier.
- Original v1 launch survives:1500ms upward flight,100ms stagger,85px arc, splashes/soaking/reaction. Generic launch/swim assets and current companion reaction coexist. No scrolling for normal/boss10/boss30/Daily results at412×915 or360×780; all three actions remain reachable during animation.
- One-time interaction-gated Pond1 tap/double/drag tutorial; skip/completion persists. `?` replay is a sandbox, preserving the real attempt/history/resources/streak. Rules use pictograms and round controls. No Hint and **no Relax/Chill** UI or behavior.

## Priority fixes and retained mechanics

All behavior from `reports-bug-relax/fix.diff` / REPORT was included: preserved zone colors under Peek, untinted generic pieces, actual counts, conflict-first feedback, undoable Clear conflicts, eligible-target Peek hardening and late-control-click suppression. The worker's Relax lock was deliberately superseded by Sebastián's later **remove Relax entirely** instruction. Life loss always applies, except Nap's three protected moves. Game over offers only Try again / Pond Path.

- Jun **Peek**: one eligible random true-solution ghost; never places. No X/rock/fixed/placed/obstructed target. Last hidden capy allowed; zero eligible disabled without spending. Ghost hides under obstruction and returns after repair.
- Bloom **Second chance**: erase latest still-conflicting offender and refund one orange up to3. If already manually repaired, do not erase a legal replacement. Historical mistake count is never refunded. Must use before zero lives (retry/map-only supersedes old fatal rescue).
- Remy **Nap**: three actual new capy/new-X placements, including safe ones. Protected conflicts remain conflicts and historical mistakes. Clear/no-op/rock/Undo spend no charge. Drag can spend three charges but remains one Undo.
- Switch before use →new native power, unused. After use →spent remains spent; active Nap charges survive. Undo restores cells, never oranges/power/charges. First-use explanation is persisted after successful confirmation; Not now consumes nothing and can be explained again, exactly as v6.1 notes specify.
- Drag mark/clear remains board-only pointer events/touch-action:none,10px threshold and≤6px interpolation; native map/page gestures not captured. One drag is one Undo.
- Haptics: resolved single mark/clear/capy-clear **12ms** once after280ms; double-tap has **no tick**, only legal32ms or illegal[45,60,45]. Drag12ms≥70ms throttle. Solve[45,60,70,60,105], landing18ms. Feature detection/catch; persisted toggle controls everything. Behavior matches the read-only v3.1.3 hotfix.
- Music and effects remain independent; effects default off. Daily safe bank before reaching/unlocking21; one-time rock intro anywhere; eligibility cannot double-credit date streaks.

## Sizing

Mode B remains the single-config default in config.js (A retained for comparison). Reference ratio460/473≈97.25%; implemented35/36≈97.222% constant width. Actual minimum cell widths include borders/gaps:

|Viewport|Board5/6/7 (B)|5×5 cell|6×6 cell|7×7 cell|
|---|---:|---:|---:|---:|
|412×915|400.55px each|73.30|60.58|51.50|
|360×780|350.00px each|63.19|52.16|44.28|

All touch cells≥44px; at412px7×7≥48px. This consciously prioritizes constant board width over the earlier52px-small-grid proposal.

## v6.5 lilies, metrics and local nickname

Three independent permanent OR-flags per pond: **cleared /zero mistakes /strictly below target**. `config.js` target version1:5×5=120000ms,6×6=180000ms,7×7=270000ms. No countdown. Best active milliseconds and minimum historical mistakes retained; slower/errorful replay never removes awards. Powers are allowed for normal lilies. Boss power-free golden lily remains a separate reward, max3. Campaign total90; Daily date-keyed collection is separate and never alters streak math.

Active time uses a monotonic clock, beginning on the first genuine board gesture and ending on final placement. Tutorial, rules/sheets, Map, hidden app and closed/reloading time are excluded. Resume carries elapsed time; Replay resets attempt time/mistakes/resources only. Actual conflicting capy placements are mistakes even under Nap or after Bloom refunds/Undo; X/clear/no-op and inaccessible rock input are not. Rocks reject input before a capy attempt. Time targets are hypotheses for playtesting, not calibrated human-difficulty claims.

All unlocked map nodes open a replay sheet with three readable conditions, best results and target. A pending normal attempt can continue; completed boards replay fresh.12px flowers in normal nodes /16px boss rows, separate ~24px golden badge (26px bordered envelope). Settings→Progress offers world summaries and expandable complete30-pond detail. Results show collected/already-yours/try-again gently, without blocking action buttons.

Nickname order: **local nickname →capy chooser →first Pond1 tutorial**; existing chosen players see nickname once, then keep their capy/path/streak.2–16 grapheme clusters, emoji/ZWJ/flags/skin-tone supported, trim+NFC, controls/newlines/bidi overrides rejected. `Intl.Segmenter` plus tested fallback. Editable in Settings. Saved only in localStorage, no uniqueness lookup, account/email, network validation, consent screen, telemetry, SDK, endpoint or event queue. Request audit permits only same-origin static GETs/SW checks.

Migration keeps active key/schema `capydoku.progress.v3` /3 with safe optional fields:
- v1: completed IDs/streak retained; retuned1–20 and old-Daily partials discarded, unchanged21–30 retained.
- v2: compatible boards retained; Classic→Jun, Beanie→Remy, Orange→Bloom, Duck→Jun; existing chosen state mapped safely.
- v3/v3.1/v3.1.1/.2/.3: normal boards/resources/progress/streak/settings/golden rewards retained. Drop stored chill/relax preferences. Explicit old Relax attempts (or mode-less under Relax preference) restart empty/full3oranges/native unused power; explicit normal attempts survive.
- Previously completed ponds receive **cleared only**. Normal pre-metric partials keep their board but unknown historical time/mistakes cannot earn timed/perfect lilies until fresh Replay. No invented retrospective awards. Existing lily flags are never removed.
- Old archival keys/backups stay untouched. Future schemas read-only, malformed/unavailable storage caught;40partial sessions /400Daily award records bounded. Clearing browser data can erase local progress/nickname.

## Music — only Northumberland

**Northumberland**, arranged by **Spring Spring / Spring Enterprises** from the traditional “The Fair Flower of Northumberland”. Source https://opengameart.org/content/northumberland independently read10 November2026 EST; source explicitly CC0 and links https://creativecommons.org/publicdomain/zero/1.0/. Evidence saved under `music-source-pages/`; WebFetch403 was followed by a normal public curl fetch. No account/payment. CC0 permits commercial/in-app/offline use and modifications. Voluntary Settings credits included. No Timberborn material.

|Format|Bitrate|Bytes|Decoded duration|
|---|---:|---:|---:|
|MP3 (iOS fallback)|112kbps stereo|2,500,797|178.566s|
|Opus/Ogg (feature-detected)|64kbps nominal stereo|1,685,211|178.566s|
|Total||**4,186,008**||

Only this track loops; old3tracks/6files absent from assets/precache/runtime/licenses (historical development evidence only under reports). Native loop,40ms head/500ms tail fade. Decoded boundary discontinuity peak9.87e-6 MP3 /7.29e-7 Opus full-scale; first/last10ms peaks<0.00045. Chromium offline seek-to-end crosses the loop without ended/gap/restart events; real-device subjective seam remains unverified. Gain0.14,800ms fade-in/240ms toggle fade-out, genuine-gesture gating, persisted own toggle and immediate hidden pause retained.

## Automatic updates and running version

Settings **v4.0 · build <12hex>** is imported from the page's own generated BUILD, derived with the cache digest, not read from a possibly newer controlling worker. Launch/visible/focus checks share a≥60000ms update throttle. New SW precaches every URL200, skipWaiting(), clients.claim(). Controllerchange saves immediately, reloads **once** at a safe Map/results boundary, or defers through play/tutorial/modals until finish/return. State saved again before reload; failed storage blocks it. One “Updated to v4.0” toast after changed-code reload, never repeated. No waiting/manual-refresh CTA or second reload listener.

Old client→cache affinity is persisted inside CacheStorage, gated through activation races, survives worker restart and offline. While an old pond defers, every static request uses that old cache, never new fallback. Previous caches are retained until no live clients need them; navigation/new BUILD announcement binds the new client. This avoids mixed Bloom/music/module bytes after claim(). Tests also cover unchanged/offline/rejected checks with no loop.

**Exact FIRST live3.1.3→v4 behavior:** shipped3.1.3's already-running JavaScript has only the passive “A fresh pond is ready. Reload when you like.” controllerchange handler, no auto-reload code. V4 cannot safely retrofit it without forced navigation of an unknown active pond. It remains on old bytes (tested offline), with progress/board saved. Finish/return to Map, then one manual reload or close/relaunch is needed. After that v4 automatically handles later updates. Actual read-only3.1.3 handoff and real v4→fixture4.1 tests distinguish this one-time limit honestly; old3.1.3 is NOT claimed to auto-reload on Map.

## Mockup deviations / superseded conflicts

1. No Hint anywhere; Undo+native power only. No Relax, Chill retry, mode indicator/config/attempt mode; later explicit removal wins all earlier designs/ROUND-v3.1 suggestions.
2. ModeB400.55/350px boards supersede374px mock board and earlier fixed52px-small-grid direction.
3. Tutorial uses unchanged verified5×5 Pond1, not static4×4 illustration. Real interaction-gated pacing rather than a forced30s wait; sandbox replay protects attempt state.
4. The six exact v6 zone colors are used; existing seventh zone retains its neutral gradient, since the mockup defines only six.
5. Retained v1 motion timing/poses and in-scene selected reaction rather than a duplicate companion congratulations card; preserves clear launch and no-scroll awards/buttons. Results hide the repeated board.
6. V6.3 boss artwork is static supplied raster-in-SVG; no costly fog/eyes/reward sequence. Node/path geometry preserved. Generic v6.2 uses its self-contained51px@3x PNG-in-SVG wrapper, not all density variants or a true vector redesign.
7. V6.4's stale “pending approval” note was overridden by explicit approval. Old preview aliases are excluded from precache; active body/face/srcsets all point to v6.4. No unapproved Bloom art used.
8. Flattened Spring scenery contains ambient painted lantern/hut before earned overlays; earned plaques/extra lanterns/nook/pool/golden pads remain state-controlled. Reuse supplied scenery/landmarks rather than repainting it.
9. First-use Not now can explain again until confirmed, as v6.1 notes specify; once successfully used, explanation stays seen across ponds. Gameover's latest retry/map-only direction supersedes earlier fatal Bloom rescue.
10. V6.5 collection uses expandable world/pond rows (all30) rather than summaries alone. Nickname's full local trio scene reuses current approved background; no draft consent/privacy-sharing screen built. Replay is also offered for unlocked unplayed nodes (Enter/Continue wording).
11. Northumberland replaces the old approved3-track rotation by later explicit choice. It is a CC0 traditional arrangement, not a newly composed claim or Timberborn music.
12. Automatic updates replace the earlier tap-to-refresh proposal. Live3.1.3 first-handoff exception above cannot be fixed inside already-running old JS without violating no-mid-pond-reload.

## Tests, verification, screenshots and package

Final machine-readable counts: `TEST-SUMMARY-v4.json`; full unit log `unit-v4-final.log`; full E2E log `e2e-v4-full.log`, `playwright-v4.json`/HTML. Every configured test runs at412×915 and360×780, mobile touch, scale1, EST, retries0, console/page errors rejected. Historical mechanics tests explicitly pass through new nickname/replay UI; dedicated v6.5 specs exercise it without convenience handlers.

Unchanged puzzle verification: **760source boards (30campaign+365safeDaily+365rockDaily)**, exactly one solution and complete no-guess proof, independent Python full-permutation oracle vs JS row DFS. **5,840actual Daily date/state outputs** across8transforms checked independently. The separate legacy mockup-illustration proof flag is outside these760 runtime boards; static example boards were not substituted for the verified campaign/Daily dataset. First1–5 each5single deductions,0steps before first forced capy; old weighted efforts7/9/15/13/15→5each. Full30level before/after table `proof-effort-v1-v2-v3-v4.md`; content unchanged since v2, rocks21, bosses10/20/30.

Native key screenshots: `screenshots-v4/` (412×915); small variants `screenshots-v4/360x780/`; final `contact-sheet-v4.png`. Captured chooser/nickname/edit,3worlds/all9bossstates, maps/lilies/replay/ledger, all Bloom surfaces, native powers/first-use, rules/tutorial, rock intro, Daily bothgates,4Springstages, Music/settings/iOS, normal/boss/Daily no-scroll results and live launch frame sequence. Every main image inspected against mockups, contact sheet plus native changed screens; right-edge label, current-node flower positioning, ledger bar appearance and small result-caption readability fixed from that review. A stale last-child selector had hidden the solved Pond pill; the visible pill and central generic capy completion counter were restored in the existing header row, with no height increase. Replay sheets now use the source’s 12px inset and left-aligned title. Screenshot names/counts/times use fictional seeded UI states, not observed human play or a claim about Sebastián’s times.

Runtime `/workspace/capydoku/capydoku-v4-runtime.tar.gz`, extracted-file hashes verified and minimal-archive offline smoke run. Archive contains precached runtime+SW+runtime docs, no test dependencies or retired art/audio. All precached URLs200 online/offline; audio ranges206. Final cache/build, weight, archive SHA and authoritative test counts are in TEST-SUMMARY-v4.json.

## Honest limits

No physical S24/iPhone, Safari/WebKit, vibration feel, speaker/audio-seam listening, iOS install prompt/notch/keyboard/IME or full accessibility/CVD/large-text audit. Chromium mobile touch, emulated iOS UA/standalone/no-vibrate and density3 exports are tested, not real hardware. Optional time targets need playtesting. Local storage can be evicted; no cloud recovery. Below360px/landscape are not comprehensively covered. Source CC0 declarations are verified, not independent uploader-provenance legal certification. Localhost is not a public phone link; nothing was published.

## Final frozen build / handoff

- Cache **`capydoku-v4-9d6ebe4d0481`**; Settings v4.0 uses the same running build digest.
- **98/98 unit + 224/224 E2E passed**,112 per mobile/touch viewport, retries0; no failures/skips/flakes or console/page errors. Full final E2E runtime 8.60 minutes.
- **91 precached URLs**, all200 online/offline;13,689,567 bytes in90 unique precached files. Music4,186,008bytes. Extracted-runtime smoke and audio ranges passed.
- **139 final native screenshots** (90 at412×915;49 at360×780), all exact dimensions and no document overflow.139 captures reviewed through18 readable sheets, with native inspection of changed screens; final expanded-ledger captures wait for the browser’s transient tap highlight to fade. Contact sheet1372×7086.
- Archive **12,780,974 bytes /94 files**, all bytes independently match the current tree. SHA256 **`ac12261b2c0dfb086f612b92f380fc508f60c37857e99abe3b33c61d81444f0b`**. `final-archive-byte-audit-v4.json` confirms no old music, dependencies or reports inside.
- Final review also corrected the nickname’s top safe-area inset; real notches remain unverified. No runtime edits occurred after the freeze used by this complete passing suite.
