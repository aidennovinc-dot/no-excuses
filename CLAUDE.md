# No Excuses — repo rules

Web prototype of a phone game: small games of pure skill, no luck, no timers you can't see.
Served from GitHub Pages (`aidennovinc-dot/no-excuses`, `main`, root) at one fixed URL so the
home-screen icon always gets the latest build. Native iOS comes later, once the feel is proven.

**One session per feedback batch.** Implement `../FEEDBACK-vNN.md`, update `../FEATURES.md` with
done / not done / why, bump the build, smoke test, commit `build N — batch NN`, push. Don't explain.

## Read on demand — not every session

| File | Read it when |
|---|---|
| `docs/RULES-HISTORY.md` | A feedback line quotes a lock (L1–L10), or you need a rule's full text: **"Build 61 … before the gate-speed trim" holds every line below in full, as of v0.60**; older sections hold the `prefs` changelog, the engine contract, the `config/` inventory |
| `docs/MUSIC.md` | Touching `audio.js`, `config/audio.js`, `_smoke/loudness.mjs` or any `Snd.*` call |
| `docs/PROGRESSION.md` | Touching `progress.js`, `progress/`, `config/unlocks.js`, `config/key-bars.js`, `config/keys.js`, the key or Progress screens, or `liveCheck` |
| `_smoke/GATE.md` | Adding a check, or a section fails: one line per section — the feedback lines it stands for and the name `--only` takes |
| `docs/GATE-HISTORY.md` | You need the paragraph a build-14–46 assertion was written with (frozen at build 46, never appended) |

**This file is held under 40KB and the gate fails over it (A10, build 61).** Trimmed 2026-09-12 from 58KB and again at build 61
from 86KB; both times every sentence moved to `docs/RULES-HISTORY.md`, none deleted. A build that amends a rule changes its ONE
line here and puts the full text and its history there, in the same commit. A rule grows there, never here.

## Bump the build: one command (A6)

`npm run bump -- N` sets `BUILD` in `config/build.js` — the one place the count lives — and writes the two places in `index.html`
(the About hint line and `#build`, both `v0.N` on screen) and `version.json` (the bare integer). Never hand-edit them: a mismatch
pins the green "new build" bar on every phone; the gate asserts all agree and no other copy exists. `RUN_SCHEMA` (4) sits beside
`BUILD` and moves only when a scoring unit changes, with a store ladder step the same day.

## Standing design rules — one line each; full text in `docs/RULES-HISTORY.md`

**Players, modes and the pick sheet**
- **P1 red `#E0453B`, P2 light blue `#6EC6FF`**, everywhere two people share the phone; never swapped (L4, `config/theme.js`).
- **Every mode offers Set and Streak** (L5, `SET_COPY` in `config/games.js`); a mode line is one short line, `SET_LIMIT` 40 characters (60.22).
- **Two-player is two steps**: Solo / With a friend, then Pass & play / Versus; Quick Tap and Dots pass between whole runs, every other game alternates inside one (`SHARED2`, `PASS_TURNS`, `games/_shared/two.js`); Versus offered if any mode has it (`versusAny`).
- **The player picker is ONE component** (60.23): `ui/players.js` `playersHtml()` / `playersMark()` on the pick sheet and the result screen, words in `PLAYERS` (`config/copy.js`); equal widths, row two slides in, selected is `--press` orange.
- **One pick-sheet layout for every game** — mode row, then length row (L9). **The mode picker is a bottom sheet**, `fixed` to the screen (v28 item 14); opening it scrolls the tapped tile `SHEET_GAP` above it and dims the map (`#mapdim`); a tap on the dim or Back **steps back one level** (`stepBack()` in `ui/screens/pick.js`, 60.24). With nothing selected the sheet is `hidden` (F.1).
- **Seconds live on the pick sheet as a subtitle, never on the result screen**; lengths are named (Sprint, Dash, Marathon, Set, Streak).
- **Every Go button says Go**, versus too (`goLabel`). **Try to unlock lands on the highest open mode and length** (`whereOf` in `run/run.js`).
- **One colour for "this is what you chose"** — `--press` (v22 §K); the pressed tile keeps its amber until a mode is chosen (`.grid.chosen`); `.picked` keeps `--ok`.
- **A newly unlocked MODE is green until a run of it is on record** (`newPlay`); selected beats green (D.1 / D.2).
- **No player colour is ever written where customisation lives** — only Customise's swatch and wheel write `prefs.col`; a game is white until coloured (F.4, L4).
- **A new game is one entry in `GAMES`** (`config/games.js`), an engine in `games/`, formatters in `ui/format.js` and a quality predicate in `progress/rules.js`, all under one id.

**Runs, rounds and scoring**
- **Where lower is better, the board and the result screen say so.**
- **A running total says what it measures** — unit, meaning, spent and budget — ONCE per screen (B.1 / B.13 / B.3d).
- **A round's own figure holds before it drains into the total** (`CFG.hold`). **Every live score ticks** (`hud.tick`, `TICK.ms` 90, G.7).
- **The run's header is a column** (60.19): `#top` holds badge, mode-and-count row, big score alone on its line, "best" under it; B.13's fixed HUD slots are retired.
- **A goal badge that does not fit scans, and freezes while a round is live** (60.20): `goalScan()` in `run/run.js`, `GOAL_SCAN`; moves only in the 3-2-1 and between rounds.
- **A verdict tier goes on the NUMBER, everywhere** — result, board row, each round's figure (`ROUND_AT`, `games/_shared/tier.js`); one sound set keyed by tier (`VERDICT_FX`); solo only (L4), presentation only (L10).
- **A round that shows a tier names it and sounds it from one call** — `roundShow()` in `games/_shared/tier.js` plays `Snd.roundVerdict` (`ROUND_FX`, one note shorter than the result's); the tier's name replaces the old judgement word, direction beside it.
- **A verdict is a tier, solo only**: four tiers in `config/verdicts.js`; the sound plays when the result is read and waits `Snd.endLeft()` (§B1); the four climb (Meh. < Good. < Great! < Amazing!). A verdict row is per mode where units differ (D.10); Quick Tap's two modes share one curve (D.9).
- **The whole-run rate holds until `RATE_RUN_FLOOR` (2.0s); `peak` is the intervals in a trailing second** (D.3).
- **A Stopwatch attempt ignores taps for its first second** (`CFG.swLock` 1000ms from the clock starting, 60.10); Hidden keeps v14 6.19's own rule.
- **A Hidden Streak ramps over twenty rounds** (`HIDDEN`, `hiddenRamp()`, 60.11); the Set is untouched.
- **Every Quick Tap and Dots mode shows its first target during the countdown** (`precount()`, `preset`, v28 item 7) — no exceptions.
- **Every shape is tagged once and dealt by one standard (A9)** — `config/shapes.js`, `games/_shared/deal.js` `makeDealer`, `games/_shared/shapes.js` draws every shape; full text ARCHITECTURE.md → Shape difficulty.
- **A shape a player must find is never overlapped, and a shape id is never a bare CSS class** (60.2 / 60.3): `keep` on the Spot engine, `pile()`, `space(dt)`, `SPOT_FIND`; a rule for anything else is scoped.
- **The count-up whoosh is for a measured amount, never a whole-number tally** (60.26).
- **The only ad is the interstitial after a result, and the app never explains its ad policy** (60.28): `ADS` in `config/games.js`, `Ads.show(run)` in `ui/ads.js` — one per `everyN` (5), never after a Streak, never in the first `graceMs`, never for a supporter.
- **Leaving the app pauses the run and it resumes on return** (60.27): `core/timers.js` keeps what is left, `#game.paused`, a 3-2-1 on its own clock, the attempt in flight replayed fresh (`replay(ctx)`); a Streak's or Gauntlet's progress saved each round in `store.resume`, offered back on the menu (`resumeAt`); pass & play and versus save nothing (L10).
- **A first-play intro is ONE line** (`INTRO` in `config/copy.js`); a player's first run of each game ends on a "Ready?" tap.
- **One mechanism pins a goal**: `goWhere` → `pendingAim` → `#goal`; `goalFor` offers the next unlock this run can fairly earn, then `keyGoal` (D.1).

**Unlocks, the key and progression**
- **TWO progression systems and ONE crossing** (G.3): the unlock chain (`config/unlocks.js`, L6) gates play; the key (`progress/key.js`, `config/key-bars.js`) gates nothing; they touch only at the Games chest (`modesOpen()` beside `tierOpen()`).
- **An earn is written the moment it fires, lengths included** — `bankLen` / `lenLock` in `progress.js`; `run/run.js` banks `checkUnlocks` / `checkAch` / `checkKey` before `run:finish`, `liveCheck` mid-run, `abort()` once more.
- **A `live:1` test must only ever become more true**; totals, averages and `misses === 0` never carry it; "N hits, no misses" is N IN A ROW (`row`).
- **A scoring unit that changes retires the old records** — bump `RUN_SCHEMA`, add a ladder step (B.2 / B.4). **The 600-run cap never drops a top-ten row** (`trimRuns`, B.14).
- **Unlock toasts are green and QUEUE** (60.25): `Unlock game: X` / `Unlock: X` (`ui/toast.js`), `TOAST_MS` in `config/copy.js`, the sound goes with the toast; on the RESULT screen a toast goes where it points (B.12).
- **A clearance bar is a one-off threshold**, cleared once by a solo run; two-player, practice and challenge runs never count (L10). Say clearance bars, never "minimum bars".
- **The key's contributor list AND count come from the config** — `GAMES` × modes × `GC(g,d).lens`, thirty, never a literal.
- **THREE keys are difficulty tiers and the tier is an argument** (B.27): `bar` / `pro` / `author` per row, `barOf(c, tier)`; a column with a `null` is a shell. A build may generate a PLACEHOLDER bar (A.2 amended, #426) — `npm run placeholders` is the only writer, `isPlaceholder()` tells it apart — and never set or correct a real one; `--set` ports Aiden's number (#371).
- **ONE METER, 0–300, never reset, one saved value, no override** (L.8a / L.10b; the 0–300 figure restored at build 55): `meter()` / `meterPct()` in `progress/key.js`, `METER` flags in `config/chests.js`; the home menu is the one place the total is printed. The build-53 "a percentage that runs to 300" complaint is an open decision in FEEDBACK-v29.md.
- **The Scores radar's rungs are the key's three tiers** (`radarOf(g)`, B.24).
- **Three achievement sets are tied to the keys** — `keyAch()` generates them, 90 named in `KEY_ROSTER`; none `live:1`; the key banks before they are asked (B.25, D.2).
- **v17 §A.1 hides NUMBERS, not existence** (G.1 / G.2): every chest and key is on screen from the first visit; a shut tier is crossed out; `tierOpen()` is the one line; key 1 is quiet before the Games chest (§M.2).
- **A chest opening credits the tier it reveals SILENTLY** (`retroBank()`, `prefs.retro`); a column that ARRIVES for an open tier is credited once (`retroArrived()`, `prefs.retroCol`, #426).
- **Every progression gate honours `allOpen` and `supporter`** through ONE function, `opened(id)` in `core/store.js` (= `chestOpen(id)`); never `prefs.chests` alone (#411).
- **Testing: a switch and a reset per chest, plus "set meter to N%", and each leaves the game where PLAY would** (G.8 / L.8f, S5): `devReach` / `devOpen` / `devBack` / `devMeterTo`, `devModesAll`; no snapshot, no override.
- **Testing is on the menu from the first load; `TARGET` in `config/build.js` strips it from the native build** (`npm run native`, `[data-dev]` cut, A.3, S5).
- **Customise and Keys are LOCKED until the Games chest opens** (L.11a, v24 A.1): crossed out, defaults apply meanwhile (`look()` / `lookCol()` / `opened()`).
- **Every home menu item is green from available until opened once** (`prefs.menuOpened`, D.5); Fresh game clears it; Testing never green.
- **The front % counts up when it has risen** (`prefs.meterSeen`, `core/count.js`, one of seven whooshes, D.4 / L.8e).

**Chests, keys and reveals**
- **FOUR chests named by what opens them — Games / Skill / Pro / Author — never numbered** (L.10, renamed v27 items 3 / 4): `GRID.chest` in `config/copy.js` is the one spelling, ids `key` / `thorns` stay; `chestState()` strictly sequential; a shut key chest says "Earn the … key" (`GRID.chestEarn`); a READY chest opens at once from the map, a key's tap ASKS first (C.1); `readyring`; `CHEST_WORDS` beside an opened chest; `KEYFILL` lilac tile fill.
- **A chest opens as its CEREMONY** (L.6 / L.10d): named steps in `CEREMONY` (`config/chests.js`) drawn by `ui/ceremony.js`; sound `Snd.chest()` — the sting is its key's theme (`stingOf()`, C.7); music hushed, not skippable.
- **A chest matches the key that opens it** (R2): `chestCol()` in `ui/chest.js`; Skill gold, Pro Circuit blue `#BFE6FF`, Author black and spikes, Games plain grey.
- **A chest opened by a key UNLOCKS, never breaks; the Games chest is the one that breaks** (v28 items 13 / 16): `assemble` · `turn` · `lid` · `spill` in the key's colour and glyph; Author's own `black` / `spikes` / `split` / `widen` / `recede` laid over it (v29 item 5); Games cracks = finished games (`crackCount()`), the seventh bursts it.
- **A chest a key opens is TWO beats** — cover, uncover, then the turn (57.2); the Games chest is clean until opened and its cracks are hidden on frame one (`pathLength="1"`, 59.1).
- **The congratulations screen is staged and celebrated** (v28 items 12 / 17): blocks land `REVEAL.cardStep` apart, Continue last; the message row is the powered-off player (`msgPreview()`); `CONFETTI` and `CHEER_FX` per chest; the word lands letter by letter (57.3); a NEXT UP block on every chest's card (60.31).
- **Every chest is drawn by `ui/chest.js` from `CHEST_LOOK`** (L.9a–c): LOCKED crossed out, READY the only one that moves, OPEN still; `Snd.chestReady()` once (`prefs.readySeen`). **The meter figure wears its BAND** (`meterBand()`, `METER_BANDS`, never green).
- **An opened chest's words SPILL once, then stand, every word a tap target** (`wordsHtml()` / `burstHtml()`, `SPILL`, `prefs.spill`, `CHEST_WORDS[].to`); every chest also gives the About video it opens (`HIDE_UNRECORDED`).
- **UNLOCKING IS ONE EVENT, ONE ROUTINE** (v25 items 6 / 11 / 22): `ui/reveal.js` — STAGE, GIFTS, "tap to continue", CARD; `chestStage()` / `keyStage()`; first time only (`prefs.revealed`); taps before the hold are swallowed; Reduce Motion collapses it; a key's reveal is `auto` and never cut off (`hold()`).
- **What an unlock gives is a SYMBOL, the same everywhere** — `SYMBOLS` in `config/chests.js`, `symSvg()`; rewards fly out of the lid (`rgiftfly`, `REVEAL.giftGap`, `Snd.pop(i)`), in colour; the card is "Congratulations", one `CARD.you` and one `CARD.next` line.
- **The key screen draws the tier's own style** (Lantern → Circuit → Thorn, `config/keys.js`, B.22); every segment `pathLength="1"`; the arrival plays the first time seen; a tap inside the ring never goes Back.
- **Earning a key is ONE animation per tier, and its own earn music is the clock** (v28 item 15, v29 item 3): `KEY_EARN` named steps, Skill 2.39s / Pro 3.00s / Author 4.00s, `ms` within 150ms of `KEY_EARN_FX`, ≥ .75 movement, assembly ≥ a quarter; `Snd.keyEarn` on the FIRST step; a tap in the first `EARN_SKIP_AT` (1500ms) does nothing, after it skips to the end; the chest prompt waits for it. Skill is approved as built; Pro fires spokes one by one with a current between; Author cracks and thorns one at a time.
- **Each key's creation intro plays once per key per profile** (57.6, `prefs.keyIntro`, store v7); the earn animation ends on its own last movement (57.7).
- **A finished key is bigger, brighter and breathes; an unfinished one has no glow** (`kdone`, `KEY_FINISH`). **The key screen fits the phone** (`kpanel`, item 16). **A game's name and count on the key are one text placed clear of every line** (`placeLabels()`, item 12).
- **A whole key taps through to its chest** (`keyChest(tier)`, L.12). **A key unlock interrupts the result screen** — `show('s-key', {advance, auto})` under `lock()`, answered by `key:done` (A4).
- **Each key screen draws its own background over the live one, and replaces the base there** (`LAYER` in `ui/atmosphere.js`, `KEY_LAYER`, item 15); each is a Customise background once that key is finished.
- **The wheel is LOCKED to one size** (57.5); **all seven backgrounds draw, the starfield is the default's alone, and the colour wheel is a second setting on the background layer** (57.11).
- **The Gauntlets are GAUNTLET MINI and GAUNTLET MEGA** (`GAUNTLET.name`, ids `g1` / `g2`): hidden until their chest opens (R1) and arrive on its spill; **a finished Gauntlet opens the next chest** (58.2 — Pro wants Mini, Author wants Mega; `chestMet()`, `gauntDone()`, `chestNeeds()`; the CHEST is gated, never the key; nobody is locked back out); **a Gauntlet deals evenly** (`GAUNTLET_BANDS`, `gauntBand()`, 58.1).

**Screens and presentation**
- **Customise is its own screen; Progress is ONE TAB PER CHEST** (58.3): Games · Skill · Pro · Author chest, Customise unlocks, Achievements; each chest tab opens with what it needs (`chestNeeds()`); one partition, `tabFor()` in `ui/screens/progress.js`; `prefs.progTab` `c-<chest>` / `cul` / `ach`.
- **R3: a list appears the moment it is asked for** — no entry animation on any Progress tab or filter (v28 item 1). Secret sits last, drawn like a locked row, and says NOTHING until earned (58.3).
- **Each Progress tab says `N of M unlocked`** (v28 item 4). **Every Customise-unlock row shows the thing it unlocks** (`unlockArt()`, v28 item 6). **A Progress label is white until earned, green once, never red** (L.2).
- **A locked cosmetic says what opens it UNDER its own row** (one `.lockline` per `.cgroup`, B.30).
- **The version label shows on the HOME MENU only; the build stamp is drawn behind every screen** (`#build` at `z-index:0`, every scroller ends with a `--stampclear` `::after`).
- **Nothing scrolls under the phone's clock, nothing in a run sits flush on the safe area** (`clip-path:inset(env(safe-area-inset-top) …)`, items 8 / 19). **The map is the phone's width and never scrolls sideways** (item 10).
- **The game-select grid is a snake placed from `Object.keys(GAMES)`**; lines measured by `offsetLeft` / `offsetTop`; the Games chest is the last stop and the key chests sit under it in one column (L.10c).
- **A sound tied to an animation reads the animation** (`getComputedTiming().delay`, items 1 / 2): the title's four beats (`TITLE_FX`, one impact each) and the map's first open, drawn out to ~7s once (`MAP_INTRO`, `introAt()`).
- **The About screen carries eight message slots, as data** (`config/messages.js`, `msgOpen()`, `msgShown()`): four kinds of lock — `run`, `chest`, `gauntlet`, `support` (`prefs.paid`, nothing writes it); a Gauntlet's row is absent until its Gauntlet is out (R1); an unwatched real clip pulses.
- **Every message plays in ONE shared player that switches on like a television** (`ui/video.js`, `PLAYER`): 16:9, inset `PLAYER.inset`%, glow in the unlocking chest's colour, captions below off a hidden track, nothing over the picture; power-on / power-off are named steps (`VIDEO_FX`); a clip that finishes closes itself (60.32); every slot points at `video/test-card.mp4` until a real clip exists.
- **The Welcome video gets a ceremony of its own** (60.33, `ui/welcome.js`, `wplay` / `wlater` / `wclose`).

**Sound and music**
- **Music is an arrangement, not seven numbers**: `voices` + `beats` / `per` / `form` / `vol` in `config/audio.js`; three named options per game (`TRACK_OPTS`, `TRACK_PICK`), no two alike; Quick Tap · Held is the build-26 loop; no percussion; a level is measured by `_smoke/loudness.mjs`.
- **Customise's music is ONE row and the WHOLE music choice** (v28 items 2 / 3, v29 item 4): the game's three tracks plus one per key, titled by theme (Lantern / Circuit / Thorns), a key track locked until that KEY is earned; whatever is picked plays on the MENU too (`prefs.menuTrack`, `prefs.everywhere`, `menuTrack()`), while a game screen plays its own.
- **A key theme is in its motif from the first beat** (L.7a): the KEY-THEME RULE — nothing under 700ms above 300 Hz, nothing above C5 under 1200ms; Key < Pro < Thorns (all gated).
- **No two tracks ever overlap** (`cut()` in `audio.js`, B.29). **Music is arranged to the length of the run**; an open-ended form holds 180s before an exact repeat; the finish ramp is music only (`R.fin`).
- **Flow state is one number with two consumers** — `tps()` → `R.flow` / `--flow` → the hum; a switch at `FLOW_AT` 2.7 taps/s (B.9); solo Quick Tap and Dots only. **Versus stems are presentation** (`STEMS`, L10).
- **An unlock has its own sound (`Snd.unlockFx()`); the achievement sound (`Snd.click()`) is not to be changed**; a chest is `Snd.chest()`, a key `Snd.keyEarn()`.
- **Sigh is HELD** (`held` on its `ITEMS.snd` row, §B1). **The fonts are ours** — three woff2 in `fonts/`, nothing from a font host (B.32).
- **An AudioContext that will not resume is rebuilt, never retried; `running` is never trusted** (F.2 / J.1): every resume goes through `revive()`; `currentTime` must move over `LIVE_MS` (150ms); the tap never waits; holders register in `rebinds`.

## Structure — the module map; full text in `docs/RULES-HISTORY.md` → Structure

**The shape is `ARCHITECTURE.md`** — layout, engine contract, S1–S7, A1–A10. Deviations per stage in `../FEATURES.md`.

`boot.js` is the entry; everything else registers itself on import. The graph is a DAG: `config → core.js → games/registry →
core/store → core/state → ui/theme → audio → progress → ui/router → ui/actions → run/run → ui/screens/* → boot`. **Screens and
the run never import each other (A4):** the run emits `run:record` / `run:pass` / `run:finish` / `run:abort` / `lock:ask` through
`core/events.js`; screens navigate with `show(id, opts)`. Engines import only `games/_shared/`, `core/`, `config/`, `core.js` (A3).

**Screens** — one file each under `ui/screens/` (`menu`, `pick`, `gauntlet`, `board`, `progress`, `customise`, `key`, `about`,
`testing`, `pass`, `result`, `lockbox`); `register(id, {onShow, onBack})` on `ui/router.js`, `define({act})` on `ui/actions.js`.
`ui/reveal.js`, `ui/video.js`, `ui/players.js`, `ui/welcome.js` are modules any screen may open, not screens.

**The store (A5, S3)** — one key `ne`, `{v, prefs, runs, ach, unlock, intro, seen, bars, gaunt, resume}` in `core/store.js`,
`v` 7 (ladder `up2`–`up7`; `up7` build 57, `keyIntro`). A new `prefs` field goes into `cleanPrefs` in the commit that adds it; an
absent field that means "none" needs no ladder step. Fresh game clears progress and keeps preferences; `runs` capped at 600; dev
switches exist only while `BUILD_FLAGS.dev`. The field-by-field changelog is in `docs/RULES-HISTORY.md`.

**The engine contract (A3)** — `run/run.js` owns the run; `games/<id>/index.js` exports `mount` `start` `input` `tick` `stop`
`result` (plus `demo`, `precount`, `replay`, `resumeAt`) and talks back only through `ctx.emit`. Shared: `games/_shared/`.
Estimate is NOT built on `roundEngine`.

**`config/` is data only (A2)** — every number, name and string a batch might change; predicates in `progress/rules.js`,
formatters in `ui/format.js`, same ids, resolved by `GV()`. **Every control carries `data-act`** (`ACTIONS[act]` in
`ui/actions.js`). Cross-module bindings go through setters, because ESM imports are read-only.

## Locked decisions — current values; amendment history in `docs/RULES-HISTORY.md`

**A change that touches a locked item is built only when the FEEDBACK line quotes its ID (e.g. `L2:`). Otherwise skip it and list
it under "Skipped — locked" in FEATURES.md. Anything not in the FEEDBACK file that changes a rule, threshold, name, unlock or
screen layout is not built — list it under "Proposed" in FEATURES.md instead.**

| ID | Decision |
|---|---|
| L1 | The title sequence plays for every new profile and after Fresh game; never removed or shortened. "games of pure skill", NO EXCUSES, "the only thing to blame is yourself"; NO EXCUSES is one node that never moves; "Tap to begin" is the fourth beat at 4.6s, fading over 1.2s, 30vh from the bottom, glowing green with its own sound (`TITLE_FX.begin`, 57.1). The menu subtitle "unlock them all" is gone (v28 item 8). |
| L2 | Quick Tap lengths are Sprint / Dash / Marathon. Nothing added. |
| L3 | Solo shows nothing about friends. With a friend → Pass & play / Versus, every game that has them. |
| L4 | Player 1 red `#E0453B`, Player 2 light blue `#6EC6FF`, everywhere. |
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget**: Estimate 100% (a GROW round spends `max(0, err − 4)`%, `ESTIMATE.GROW_FREE`; CUT its whole error), Stopwatch 5s (7.5s past round 10), Hidden 700ms (a round spends `max(0, ms − 50)`, `HIDDEN.free`), Flash 1000ms over 150 (an early tap 400ms and the attempt), Go / No-go 3000ms over the 180ms gate (a correct tap `max(0, reaction − 180)`, a wrong tap 200ms, scored in targets answered), Count 20 miscounts (`COUNT_BUDGET`, ramp `SPOT_RAMP` to ~round 18), Find 10s; score = rounds completed, "Highest round wins!", no wrong-tap run-ender. **Set = a fixed number of rounds, scored by the line on the sheet**: Stopwatch and Hidden are totals, Hidden in ms; a Flash attempt over 1000ms scores 1000ms; Go / No-go is 5 rounds of 3 targets, the mean of `max(0, ms − 180)`, a skipped target charged its dwell, +150ms per wrong tap, no run-ender; each target behind 1–5 decoys on the nine shapes of `DEALS 'reaction:nogo'`, dwelling 980 ± 180ms (Set) / 1330 ± 180 (Streak). Currencies are never harmonised. Counts and lines from `SET_COPY`. |
| L6 | The unlock chain and thresholds are the §1 table in the latest FEEDBACK file that names L6 — `UNLOCKS` + `LEN_RULES` + `LEN_LIVE` in `config/unlocks.js`, predicates in `progress/rules.js`, keyed `'game:mode'`; it feeds lock boxes, goal lines, the Next card and the Games chest tab; every requirement names its game; `lenNeed(g,d,s)` builds every sentence; a length rung announces mid-run only where `LEN_LIVE` flags it and is banked by `bankLen`. Sequence is 3 and 7 keys, opened by one Cut round within 3.5%; Flash's slow-run rung asks for a tap in every round (`noTap`, 60.7); Quick Tap · Four opens from any Two run; Cut's Streak asks for more than 15% off (60.5); "N hits, no misses" is N in a row; five rows ask the player to fail on purpose; a length unlock announces. A chest may also need a finished Gauntlet (`gaunt` on a `CHESTS` row — Pro wants Mini, Author wants Mega, 58.2), which gates the chest and never the key; the unlock screen is one tab per chest (58.3). |
| L7 | A game tile is white until that game has been played once. |
| L8 | Anything newly unlocked gets the green first-seen highlight once, then is marked seen. |
| L9 | The length row is labelled "Mode" in every game. One pick-sheet layout, no per-game special cases. |
| L10 | No two-player run of any kind, and no demo, ghost or scripted run, goes on a board or advances a key, a clearance bar, an unlock or an achievement — enforced at the finish (`two` in `run/run.js`) and mid-run (`liveCheck` turns away every `sel.vs`; `R.demo`, `run.demo`). Aiden: *"I don't want anyone to have to rely on someone else in order to beat this game."* |

**Code decisions A1–A10 in `ARCHITECTURE.md` — same quote-the-ID rule.** A feedback line changes one only when it names the ID.

## The gate — the rules; one line per section in `_smoke/GATE.md`

- **`npm test` runs every section in its own worker, four at a time, on a test clock five times the wall — 7.3 minutes (measured, build 61: 719 checks, 437s, with a game holding ~45% of the CPU; build 60 was 47m 39s one section at a time).** It spawns its own static server and drives headless Chrome at 390×844 with zero uncaught errors; `CHROME_PATH` overrides the default. It prints one line per section with its seconds, each failure, the ten slowest sections and the verdict.
- **The layout (build 61)**: `_smoke/smoke.mjs` only decides how to run; each section is `_smoke/sections/NN-name.mjs`, listed in order in `_smoke/sections/index.mjs`; everything they share is `_smoke/lib/gate.mjs`. **Open the one section a change touches**, never the lot.
- **The test clock** (`_smoke/lib/clock.mjs`, test only) scales the page's timers, clocks and animations and the driver's own `sleep`. A section that cannot run fast carries `clock: N` on its `index.mjs` row with the reason. **A driver's wait is a poll on a state signal, not a number** — `until()`, `revealReady`, `keySettle`, `#s-key.kearning`, or the page recording its own beats. A section that fails fast is rerun once at ×1; passing there prints it as a **CLOCK FLAKE**, which the next build fixes.
- **A10 — two budgets fail the gate so it cannot regrow**: a full run over **12 minutes** (the ten slowest print), and **this file over 40KB**.
- **The verdict always prints** (build 55): a crash, in any worker, is a named FAILURE and the exit code is 1.
- **The gate runs on a site-only checkout** — the sections that read `../_review/` skip those checks BY NAME (build 55).
- **Static checks first**: A6 one build number, the S4 CSP and no inline script, S7's gates on the poll, A8's one `haptic()`, A2 `config/` has no imports or functions, A3 / A4 the import boundaries, A10 this file's size.
- **A failing assertion blocks the push. The full `npm test`, no flags, runs ONCE — the last thing before the push.** While fixing: `npm test -- --only <section> --bail` (a comma list; `--from 44`). A partial run prints PARTIAL RUN and never stands in for the gate.
- **A new assertion goes into the section for the feature it tests** — `chests`, `keys`, `music`, `runs`, `storage fixtures`, the surface — **never a new "build N" section**. Use the shared `boot()`, `read()` and `strip()` from `lib/gate.mjs`; a section that needs one before it goes in `LEADS` (`lib/args.mjs`).
- **A check reads a tuning value from `config/`, never a hand-typed copy of it** — 13 of build 60's gate failures were old checks with Aiden's old numbers typed in.
- **No new check tests the source text** (`/…/.test(read(…))`) — drive the page or import the config; A2–A4's import boundaries are the one exception. When an old source-text check fails on a refactor, delete it and name it in the outcome.
- **`_smoke/GATE.md` gets one index line per new section**; `docs/GATE-HISTORY.md` is frozen.
- **`npm run review`** drives `../_review/scripts/` (capture → `build-catalogue.mjs`); Cowork publishes the page. Its Every sound and Round formats sections come from `_review/scripts/catalogue.ref.mjs`, which the gate runs too.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
