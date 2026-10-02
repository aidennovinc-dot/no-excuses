# No Excuses — repo rules

Web prototype of a phone game: small games of pure skill, no luck, no timers you can't see.
Served from GitHub Pages (`aidennovinc-dot/no-excuses`, `main`, root) at one fixed URL so the
home-screen icon always gets the latest build. Native iOS comes later, once the feel is proven.

**One session per feedback batch.** Implement `../FEEDBACK-vNN.md`, update `../FEATURES.md` with
done / not done / why, bump the build, smoke test, commit `build N — batch NN`, push. Don't explain.

## Read on demand — not every session

| File | Read it when |
|---|---|
| `docs/RULES-HISTORY.md` | A feedback line quotes a lock (L1–L20), or you need a rule's full text: **"Build 61 … before the gate-speed trim" holds every line below in full, as of v0.60**; older sections hold the `prefs` changelog, the engine contract, the `config/` inventory |
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

## Data-only fast lane: `npm run data` (61.28, build 62) — full text in `docs/RULES-HISTORY.md` → Build 62

A diff that touches ONLY the data files — `config/key-bars.js`, `config/achievements.js`, `config/copy.js`, `config/verdicts.js` (`DATA` in
`scripts/data.mjs` is the list) — goes through `npm run data`: it validates (each file loads; every bar harder bar → pro → author in its own
direction; every achievement that unlocks something is named; no two names alike), runs only the gate sections whose source names a changed
file plus the static checks, bumps, commits, pushes and appends three lines to the newest FEEDBACK file. No full gate, no screenshots, no
catalogue, no board. **Anything outside those files is a normal build.** A data build that fails validation stops and says why in one line,
having written nothing. Gate checks read bars and names from `config/`, never a copy; the pins kept on purpose are **L1** (the title's words),
**L2** (Quick Tap's lengths) and **L9** ("Mode"), and a data edit that breaks one fails like any other. `--dry` stops before the bump.

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
- **A newly unlocked MODE or LENGTH is green until a run of it is on record** (`newPlay(g,d,s)`), on the sheet and the result screen's chips alike (62.13); selected beats green (D.1 / D.2).
- **No player colour is ever written where customisation lives** — only Customise's swatch and wheel write `prefs.col`; a game is white until coloured (F.4, L4).
- **A new game is one entry in `GAMES`** (`config/games.js`), an engine in `games/`, formatters in `ui/format.js` and a quality predicate in `progress/rules.js`, all under one id.

**Runs, rounds and scoring**
- **Where lower is better, the board and the result screen say so.**
- **A running total says what it measures** — unit, meaning, spent and budget — ONCE per screen (B.1 / B.13 / B.3d).
- **A round's own figure holds before it drains into the total** (`CFG.hold`). **Every live score ticks** (`hud.tick`, `TICK.ms` 90, G.7).
- **The run's header is a column** (60.19), **under the ✕ row** (67.16): ONE goal line with its pips or bar (`goalHtml`), a Streak's labelled allowance bar (`hud.allowance`), game · mode and "Round N" (never "attempt"), the score, "best"; a Flash Set's top reads "AVG 413 ms" (67.17).
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
- **One mechanism pins a goal**: `goWhere` → `pendingAim` → `#goal`; the next-unlock card's own pick first (`pickGoal`, 67.40), then `goalFor`, then `keyGoal` (D.1).
- **The next-unlock card is ONE pick** (67.40, `progress/next.js` `nextPick()`): the next mode on the chain (Dash first, `NEXT_CARD_ORDER`), "Open the Games chest", the nearest key bar with "x of 30", each chest after it; gone once the Author chest is open; eyebrow / name / requirement / best on a bar (`UNLOCK_BEST` / `LEN_BEST`).

**Unlocks, the key and progression**
- **TWO progression systems and ONE crossing** (G.3): the unlock chain (`config/unlocks.js`, L6) gates play; the key (`progress/key.js`, `config/key-bars.js`) gates nothing; they touch only at the Games chest (`modesOpen()` beside `tierOpen()`).
- **An earn is written the moment it fires, lengths included** — `bankLen` / `lenLock` in `progress.js`; `run/run.js` banks `checkUnlocks` / `checkAch` / `checkKey` before `run:finish`, `liveCheck` mid-run, `abort()` once more.
- **A `live:1` test must only ever become more true**; totals, averages and `misses === 0` never carry it; "N hits, no misses" is N IN A ROW (`row`).
- **A scoring unit that changes retires the old records** — bump `RUN_SCHEMA`, add a ladder step (B.2 / B.4). **The 600-run cap never drops a top-ten row** (`trimRuns`, B.14).
- **Unlock toasts are green and QUEUE** (60.25): `Unlock game: X` / `Unlock: X` (`ui/toast.js`), `TOAST_MS` in `config/copy.js`, the sound goes with the toast; on the RESULT screen a toast goes where it points (B.12). **L14: a toast waits for a first-time box or moment (`setToastGate`); one whose news a box says is dropped (`tutTells`, 67.3).**
- **A clearance bar is a one-off threshold**, cleared once by a solo run; two-player, practice and challenge runs never count (L10). Say clearance bars, never "minimum bars".
- **The key's contributor list AND count come from the config** — `GAMES` × modes × `GC(g,d).lens`, thirty, never a literal.
- **THREE keys are difficulty tiers and the tier is an argument** (B.27): `bar` / `pro` / `author` per row, `barOf(c, tier)`; a column with a `null` is a shell. A build may generate a PLACEHOLDER bar (A.2 amended, #426) — `npm run placeholders` is the only writer, `isPlaceholder()` tells it apart — and never set or correct a real one; `--set` ports Aiden's number (#371).
- **ONE METER, 0–300, never reset, one saved value, no override** (L.8a / L.10b; the 0–300 figure restored at build 55): `meter()` / `meterPct()` in `progress/key.js`, `METER` flags in `config/chests.js`; the home menu is the one place the total is printed. **L11 (67.37, build 68): what a surface PRINTS (`meterPct`) is the Skill band × `METER.before` (95) until the Skill chest opens — which lands on exactly 100 — then the meter itself, counting past 100; nothing beside it (65.14's `meterTail` withdrawn).**
- **The Scores web chart is on the keys' scale** (64.13, superseding B.24): per game 100 / 200 / 300 = Skill / Pro / Author bars, piecewise linear, past Author on the Pro → Author step (`keyScale`, `RADAR` in `config/keys.js`); a spoke is the average of the combinations played (`radarOf`); rings in the keys' styles; the overall figure (`radarAll`) wears a key's style past its ring (`RADAR_TXT`).
- **Three achievement sets are tied to the keys** — `keyAch()` generates them, 90 named in `KEY_ROSTER`; none `live:1`; the key banks before they are asked (B.25, D.2).
- **v17 §A.1 hides NUMBERS, not existence** (G.1 / G.2): every chest and key is on screen from the first visit; a shut tier is crossed out; `tierOpen()` is the one line; key 1 is quiet before the Games chest (§M.2).
- **A chest opening credits the tier it reveals SILENTLY** (`retroBank()`, `prefs.retro`); a column that ARRIVES for an open tier is credited once (`retroArrived()`, `prefs.retroCol`, #426).
- **Every progression gate honours `allOpen` and `supporter`** through ONE function, `opened(id)` in `core/store.js` (= `chestOpen(id)`); never `prefs.chests` alone (#411).
- **Testing: a switch and a reset per chest, plus "set meter to N%", and each leaves the game where PLAY would** (G.8 / L.8f, S5): `devReach` / `devOpen` / `devBack` / `devMeterTo`, `devModesAll`; no snapshot, no override.
- **Testing is on the menu from the first load; `TARGET` in `config/build.js` strips it from the native build** (`npm run native`, `[data-dev]` cut, A.3, S5).
- **Customise and Keys are LOCKED until the Games chest opens** (L.11a, v24 A.1): crossed out, defaults apply meanwhile (`look()` / `lookCol()` / `opened()`).
- **Scores, Progress and About each open at their own moment** (64.7, `MENU_UNLOCK` in `config/unlocks.js`, `progress/menu.js`): About when the Welcome clip finishes (the player stays put, 67.15), Progress with the first Estimate run, Scores with the first Reaction run; each is said by its tour's first box, "Congratulations, you unlocked …", never a toast (67.15); `prefs.menuUnl`; a pre-build-65 profile with its walkthrough behind it keeps all three; Off the Rails opens nothing. Crossed out until then, each with a green line of what opens it, from `MENU_UNLOCK` (65.3).
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
- **Earning a key is ONE animation per tier** (v28 item 15): `KEY_EARN` named steps, ≥ .75 movement, assembly ≥ a quarter; `Snd.keyEarn` on the FIRST step. **L13 (67.31, build 68): the motion sets the length; no tap, no skip, no prompt — `EARN_NEXT.hold` (0.5s at most) after it ends the next screen opens by itself (`earnNext`: its chest, else the run's result), and the earn music fades there (`fade()`).** Skill is approved as built; Pro fires spokes one by one with a current between; Author cracks and thorns one at a time.
- **Each key's creation intro plays once per key per profile** (57.6, `prefs.keyIntro`, store v7); the earn animation ends on its own last movement (57.7).
- **A finished key is bigger, brighter and breathes; an unfinished one has no glow** (`kdone`, `KEY_FINISH`). **The key screen fits the phone** (`kpanel`, item 16). **A game's name and count on the key are one text placed clear of every line** (`placeLabels()`, item 12).
- **A whole key taps through to its chest** (`keyChest(tier)`, L.12). **A key unlock interrupts the result screen** — `show('s-key', {advance, auto})` under `lock()`, answered by `key:done` (A4).
- **Each key screen draws its own background over the live one, and replaces the base there** (`LAYER` in `ui/atmosphere.js`, `KEY_LAYER`, item 15); each is a Customise background once that key is finished.
- **The wheel is LOCKED to one size** (57.5); **all seven backgrounds draw, the starfield is the default's alone, and the colour wheel is a second setting on the background layer** (57.11); **no background's brightest pixel passes `BG_LAYER.peak` × `--ink`'s luminance** (68.39).
- **The Gauntlets are GAUNTLET MINI and GAUNTLET MEGA** (`GAUNTLET.name`, ids `g1` / `g2`): hidden until their chest opens (R1) and arrive on its spill; **a finished Gauntlet opens the next chest** (58.2 — Pro wants Mini, Author wants Mega; `chestMet()`, `gauntDone()`, `chestNeeds()`; the CHEST is gated, never the key; nobody is locked back out); **a Gauntlet deals evenly** (`GAUNTLET_BANDS`, `gauntBand()`, 58.1).

**Screens and presentation**
- **Customise is its own screen; Progress is ONE TAB PER CHEST** (58.3): Games · Skill · Pro · Author chest, Customise unlocks, Achievements; each chest tab opens with what it needs (`chestNeeds()`); one partition, `tabFor()` in `ui/screens/progress.js`; `prefs.progTab` `c-<chest>` / `cul` / `ach`.
- **R3: a list appears the moment it is asked for** — no entry animation on any Progress tab or filter (v28 item 1). No secrets (61.14): every row shows its name and what earns it; Achievements is one flat list (61.13); a score-target row has no name (61.12).
- **Each Progress tab says `N of M unlocked`** (v28 item 4); the Games chest's line is its 13 modes, "Streak not counted" (A1). **Every Customise-unlock row shows the thing it unlocks** (`unlockArt()`, v28 item 6). **A Progress label is white until earned, green once, never red** (L.2).
- **A locked cosmetic says what opens it UNDER its own row** (one `.lockline` per `.cgroup`, B.30).
- **The version label shows on the HOME MENU only; the build stamp is drawn behind every screen** (`#build` at `z-index:0`, every scroller ends with a `--stampclear` `::after`).
- **No background draws in the status-bar strip (A2); body wears the layer's ground (`--underlay`), the bottom (inset + 40px) is painted flat in it (`floorStrip`, 65.10), and html wears `--strip` — whatever is drawn on top at the bottom edge, composited every frame (`stripOf`, L23).**
- **Nothing scrolls under the phone's clock, nothing in a run sits flush on the safe area** (`clip-path:inset(env(safe-area-inset-top) …)`, items 8 / 19). **The map is the phone's width and never scrolls sideways** (item 10).
- **The game-select grid is a snake placed from `Object.keys(GAMES)`**; lines measured by `offsetLeft` / `offsetTop`; the Games chest is the last stop and the key chests sit under it in one column (L.10c).
- **A sound tied to an animation reads the animation** (`getComputedTiming().delay`, items 1 / 2): the title's four beats (`TITLE_FX`, one impact each) and the map's first open, drawn out to ~3.5s once (`MAP_INTRO`, `introAt()`, halved at 62.1), its sounds × `MAP_INTRO_GAIN` (62.2).
- **ONE first-time system; every tutorial is data for it** (A1, build 65, `ui/tutorial.js`): armed when its thing opens; **L14 (build 68): a tour runs on its ROOM's first visit by any route (`room` / `door` steps), leaving spends the room (`prefs.rooms`) and drops the rest; a reload resumes it**; never over a ceremony, reveal, key intro or the player (`busy()`); owns every tap while its box is up (must-tap boxes let only their target through), none when not; numbers from config; step stored (`prefs.tuts`; the walkthrough keeps `prefs.tut` / `prefs.tutRun`, 62.10); Testing has Replay and Reset all. **L15 (build 68): the box takes the free spot nearest its target, clear of EVERYTHING that takes a tap (`taps()`), above a pick sheet with its tail down, gliding between spots; it never scrolls — an off-screen target gets an arrow and the step waits (`far`); the game's UI never moves for it (67.1); a tutorial never changes screen — the box before rings the way and is must-tap (65.9); copy carries `[green]` / `[yellow]` / `[red]` marks (`marks()`, 65.19); the gate walks every tutorial with real taps and fails a soft lock.**
- **The About screen carries eight message slots, as data** (`config/messages.js`, `msgOpen()`, `msgShown()`): five kinds of lock — `run`, `chest`, `gauntlet`, `support` (`prefs.paid`, nothing writes it), `game` (Welcome waits for Dots, 62.12); a Gauntlet's row is absent until its Gauntlet is out (R1); an unwatched real clip pulses.
- **Every message plays in ONE shared player that switches on like a television** (`ui/video.js`, `PLAYER`): 16:9, inset `PLAYER.inset`%, glow in the unlocking chest's colour, captions below off a hidden track, nothing over the picture; power-on / power-off are named steps (`VIDEO_FX`); a clip that finishes closes itself (60.32); every slot points at `video/test-card.mp4` until a real clip exists. **A chest's clip is OWED once its card is continued: the next tap plays it, unskippable the first time (`prefs.mustWatch`, 65.18).**
- **The Welcome video gets a ceremony of its own** (60.33, `ui/welcome.js`): **on the result that opens Dots, as it opens, ahead of its toasts (67.13); due until its clip closes and About opens (`welcomeSeen` written then), so the main menu's calm-moment replay (65.2) is only the reload / crash net (67.22).**

**Sound and music**
- **Music is an arrangement, not seven numbers**: `voices` + `beats` / `per` / `form` / `vol` in `config/audio.js`; ONE game-wide list (`MUSIC_LIST`, default `MUSIC_PICK`, 64.20 — the per-game three are retired), no two alike; Held is the build-26 loop; no percussion; a level is measured by `_smoke/loudness.mjs`.
- **Customise's music is ONE row and the WHOLE game's choice** (v28 items 2 / 3, v29 item 4, 64.20 — above the game tabs): the list plus one per key, titled by theme (Lantern / Circuit / Thorns), a key track locked until that KEY is earned; whatever is picked plays on the MENU too (`prefs.menuTrack`, `prefs.everywhere`, `menuTrack()`) and carries on through every run at `RUN_MUSIC.vol` (61.19).
- **A key theme is in its motif from the first beat** (L.7a): the KEY-THEME RULE — nothing under 700ms above 300 Hz, nothing above C5 under 1200ms; Key < Pro < Thorns (all gated).
- **No two tracks ever overlap** (`cut()` in `audio.js`, B.29). **Music is arranged to the length of the run**; an open-ended form holds 180s before an exact repeat; the finish ramp is music only (`R.fin`).
- **Flow state is one number with two consumers** — `tps()` → `R.flow` / `--flow` → the hum; a switch at `FLOW_AT` 2.7 taps/s (B.9); solo Quick Tap and Dots only. **Versus stems are presentation** (`STEMS`, L10).
- **An unlock has its own sound (`Snd.unlockFx()`); the achievement sound (`Snd.click()`) is not to be changed**; a chest is `Snd.chest()`, a key `Snd.keyEarn()`.
- **Excuses** (67.38): rows in `config/excuses.js`, tests in `EXCUSE_TEST` on the engines' raw `ctx.xs` facts; never in the walkthrough or the first ten minutes; quiet beside an unlock; no effect on % or keys. **Tiny Aiden**'s sheet `assets/tiny-aiden.png` is a drop-in.
- **A chest's Continue goes straight into its video** (67.28 / #496): full screen and must-watch the first time, then the map; About replays inset.
- **A new screen's first tutorial box waits one tick and never glides from another screen** (67.41); **the Welcome waits for the walkthrough to end**.
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
screen layout is not built — list it under "Proposed" in FEATURES.md instead.** **A regression of a locked item is a gate failure, not a
judgement call: every L-ID has a gate check labelled with it (static checks fail an ID with none), and anything Aiden settles goes on this
list, with its check, in the build that implements it (67.37b, build 68).**

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
| L11 | **The key meter is ONE continuous 0–300%, never reset** (2026-09-14, 2026-09-19, 67.37): the Skill key with its chest reads 100, the Pro key 200, the Author key 300; past 100 it keeps counting ("153%"), its colour and effects changing past 100 and 200 (`METER_BANDS`); before the Skill chest it is the Skill band × `METER.before` (95) and the Skill chest lands on exactly 100. No second figure beside it. |
| L12 | **The key keeps its intro size after the first tap** (2026-09-29, 67.23): one size, before and after. |
| L13 | **A key's earned animation: the motion plays, holds 0.5s at most, then the next screen opens by itself** (67.31): no tap, no skip, no "tap to open the chest"; the motion sets the length and nothing else holds it (`EARN_NEXT.late`, 68.36); the earn music carries on into the next screen and fades there. |
| L14 | **A first-time moment (tour, intro animation, mandatory video, ceremony) runs on the FIRST visit, before anything else on that screen** (67.22 / 67.3): tutorial boxes before toasts, a toast whose news the box gives is dropped; a visit that has passed drops its moment for good — a later replay is only the reload / crash net. |
| L15 | **A tutorial box never covers its own target or the thing the player must tap at that step; it may sit over other tiles. It holds a home spot around the middle, leaves it only to clear its target (just far enough to sit beside it), and each new box nudges a little from the last. A tutorial never scrolls the screen and never navigates** (68.4, 2026-10-02, amending 67.2 / 67.9 / 65.9): an off-screen target is scrolled to by the game as the box appears (68.12). |
| L16 | **Music is ONE game-wide choice** (2026-09-29, 64.20): one row in Customise above the game tabs, playing on the menus and through every run. |
| L17 | **The Pro chest's opening is not to be changed** (2026-09-18): its ceremony, look, cover, gifts, confetti, cheer and sound as approved — pinned by the gate. |
| L18 | **No secret achievements**: every achievement shows its name and its requirement (2026-09-28, 61.14). |
| L19 | **Streak modes sit outside the Games chest count** (2026-09-29): the Games chest is its 13 modes, "Streak not counted". |
| L20 | **The Welcome is mandatory** (67.7): no Later; it plays on the result screen of the run that opens Dots; the other seven messages keep Later. |
| L21 | **No Restart in a run** (67.5): ✕ → the Abandoned screen → Retry, in every mode, Pass & play and Versus included; the run's top row is ✕ alone (67.16). |
| L22 | **Tap sound is ONE game-wide choice** (67.35): one row in Customise above the game tabs, beside Music (Off its last choice, 67.34) and Background. |
| L23 | **The background runs to the physical bottom edge** on every screen, every theme and under every overlay: the bottom safe-area strip is the colour of whatever is drawn directly above it; buttons and text stay above the home bar (68.27, 2026-10-02; first logged 2026-09-20). |
| L24 | **Every intro and ceremony draws its first animation frame before anything else of that screen**: the finished screen is never on frame one (68.29, 2026-10-02; the same fault as 2026-09-20). |
| L25 | **On Progress and the key cards, green means done and nothing else**: white for not yet earned, green once earned; a locked row's name, requirement and "To unlock" line are plain white (68.21, 2026-10-02; settled 2026-09-14). |
| L26 | **The video frame takes the shape of the clip**: a portrait clip plays in a tall frame, a landscape clip in a wide one, never letterboxed inside the other shape, on first viewing and from About; thumbnails follow the clip (68.11, 2026-10-02, supersedes 67.6b). |
| L27 | **The title sequence ignores every tap until "Tap to begin" has appeared**, on every launch (68.13, 2026-10-02). |

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
- **The new-player journey** (`41-new-player-journey.mjs`, 67.41) plays a wiped profile through every first-time moment it can earn; its frames are the board's Tutorials.
- **`npm run review`** drives `../_review/scripts/` (capture → `build-catalogue.mjs`); Cowork publishes the page. Its Every sound and Round formats sections come from `_review/scripts/catalogue.ref.mjs`, which the gate runs too.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
