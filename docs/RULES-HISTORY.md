# No Excuses — rules history

**Moved out of `CLAUDE.md` 2026-09-12 (batch 14, S.1), text verbatim as of build 30.** `CLAUDE.md` keeps one line per
rule and the locked-decisions table at its current values; this file keeps the full text of each rule — what it says,
the build and the FEEDBACK section that set or amended it, and why. **Read it when a feedback line quotes a lock (L1–L10)
or you need the reason behind a standing rule.** Edit in place: a build that amends a rule appends the amendment here
under the same heading and rewrites the one line in `CLAUDE.md`.

The music rules' full text is in `MUSIC.md`; the progression rules' (the chain, the key, the earn path) in
`PROGRESSION.md`; the gate's per-build list in `../_smoke/GATE.md`.

## Standing design rules — don't relitigate these each batch — full text

The rules as `CLAUDE.md` carried them at build 30, in the same order. The one-liners in `CLAUDE.md` are the rule; the
text here is the rule with its history.

- **Player 1 is red (`#E0453B`), Player 2 is light blue (`#6EC6FF`)**, everywhere two people share
  the phone. Never swap them per game.
- **Every mode offers Set and Streak.** Set = a fixed number of rounds. Streak = until you fail.
- **Two-player is picked in two steps**: *Solo* / *With a friend*, then *Pass & play* / *Versus*. **Two kinds of pass & play
  since build 25 (v15 §4)** — Quick Tap and Dots play two whole runs with the hand-over screen between them, because their
  pass & play *is* a whole timed run each; everything else alternates **inside one run** and the engine owns the hand-over
  (`SHARED2` in `games/registry.js` is the list, `PASS_TURNS` in `config/games.js` the turns each). The player row is drawn
  on the *mode* stage, before a mode is chosen, so it offers Versus if **any** mode of the game has it (`versusAny`) and
  narrows when the mode is picked — without that, Spot · Find's versus would be unreachable behind Count.
- **One pick-sheet layout for every game** — mode row, then length row. No per-game special cases.
- **Seconds live on the pick sheet, not the result screen.** Lengths are named (Sprint, Dash,
  Marathon, Set, Streak); the raw seconds are a subtitle on the sheet only.
- **Unlock toasts are green**: `Unlock game: X` for a game, `Unlock: X` for a mode or a length.
- **Where lower is better, say so** — the board and result screen carry the indicator; never leave
  the player to work out which direction wins.
- A new game is one entry in `GAMES` (`config/games.js`) plus an engine in `games/`, its formatters in
  `ui/format.js` and its quality predicate in `progress/rules.js`, all under the same id.

- **A RUNNING TOTAL SAYS WHAT IT IS MEASURING (v17 B.1, build 28).** Three modes carried three different definitions of
  "the total" and none of them said so on screen: Estimate · Cut's Set figure is an average while its own sheet line
  called it a difference; Timing · Stopwatch's Streak shows the seconds SPENT beside the seconds of targets ASKED, both
  climbing, both in seconds; Spot · Find's was the total minus a free half-second a find, with no floor, so it went
  negative and its Streak could not end. The arithmetic was right in two of the three and `hud.countUp` / `hud.addUp`
  were right in all of them — what was missing was the label. **A number that accumulates carries its own unit and its
  own meaning, and where a mode has a budget, the line says what is spent and what the budget is.**

- **A VERDICT IS A TIER, AND THE TIER IS SOLO ONLY (v17 B.25, build 29).** Four tiers — almost perfect, good, alright,
  bad — five lines each per game, drawn so the same line never shows twice running. **Thresholds and lines are one table,
  `config/verdicts.js`**: a game's row carries its own three cut-offs against its own quality (0..1, `QUALITY` in
  `progress/rules.js`) and its own twenty lines, and `verdict()` in `progress.js` only reads it. It returns
  `{tier, col, line}`, never a bare string — the result screen needs the tier to colour the line and to play
  `Snd.verdict(id)`. **Almost perfect is light blue and bad is red, which ARE P2 and P1 (L4)** — that is the whole reason
  the colour and the sound are solo only, and `ui/screens/result.js` leaves both off a two-player or practice result.
  The sound plays when the result is READ, not at the finish: `Snd.end()` owns the finish, the ad break can stand
  between them, and a run that earned something pushes its toasts back so the unlock sound gets clear air.
- **THE GAME-SELECT GRID IS A SNAKE, AND THE ORDER IS NOT WRITTEN IN IT (v17 B.23, build 29).** The tiles are placed by
  `grid-row` / `grid-column` from `Object.keys(GAMES)` — chain order, straight out of `config/games.js` — running left to
  right, then right to left, so every step of the order is one cell and the line between two of them is always straight.
  The markup stays in chain order for focus and for the reveal's stagger. The lines in `#gridlines` are measured off each
  tile's own picture through `offsetLeft` / `offsetTop`, **never a bounding rect**: the first-visit reveal animates
  `scale`, and a rect taken mid-animation draws the path through where the tiles momentarily are. Green where the game a
  segment leads to is open, grey where it is locked. **The chest is the last stop** — key 1, `prefs.chest1`, and §A.1
  forbids anything about the pro or author tiers appearing on that screen until it is opened.
- **A first-play intro is ONE LINE (v16 §5 / A.3, build 27).** The title line, arriving as a line rather than word by
  word; the dimmer sub-line is gone from `INTRO` in `config/copy.js` entirely. **On a player's first run of each GAME**
  — not each mode — the intro ends on a "Ready?" they tap. Cowork's idea of moving the rule into the 3-2-1 top strip is
  superseded and must not be built.

## Structure — the full text as of build 30

`CLAUDE.md` keeps the module map. This is the paragraph-by-paragraph description it carried at build 30: the DAG, the
screens, the store and its per-build `prefs` changelog, the engine contract, the `config/` inventory, the file map, the
click dispatcher and the cross-module setters. **Read it before touching `core/store.js`, `run/run.js`, a screen's
registration or the engine contract.** The earn path (`liveCheck`, banking before `run:finish`) is in `PROGRESSION.md`.

**The shape is `ARCHITECTURE.md`** — the target layout, the engine contract, the security rules S1–S7
and the code decisions A1–A8. The refactor ran one stage per build (14–18, plan in
`../2026-09-05_personal_handover_no-excuses-refactor.md`); build 18 completed stage 4 and the layout
below is the live one. Deviations from `ARCHITECTURE.md` are listed per stage in `../FEATURES.md`.

`boot.js` is the entry (`<script type="module">`), 23 lines: everything else registers itself on import
(the store loads and migrates, the screens register with the router and define their buttons, the theme
applies itself) and boot only fixes the order of the first paint. The module graph is a DAG with no
cycle: `config → core.js → games/registry → core/store → core/state → ui/theme → audio → progress →
ui/router → ui/actions → run/run → ui/screens/* → boot`. **Screens and the run never import each other
(A4, asserted by the gate):** the run emits `run:record` / `run:pass` / `run:finish` / `run:abort` /
`lock:ask` through `core/events.js` and the result, pass, pick and lock-box screens listen; screens
navigate with `show(id, opts)` and never import another screen. The engines import only
`games/_shared/`, `core/`, `config/` and `core.js` (A3) and never see `sel`, `prefs`, the store, audio,
the run or each other.

**Screens — since build 18.** One file per screen under `ui/screens/`, each owning its DOM: `menu`,
`pick`, `board`, `progress`, `key`, `customise`, `about`, `testing`, `pass`, `result`, `lockbox`; `index.js`
imports them all. **`progress.js` is new at build 29 (v17 B.21)** — the merge of `unlocks.js` (build 23, v15 2.4) and
`achievements.js` into ONE screen with two tabs, Unlocks first because unlocks outrank achievements everywhere the next
thing is surfaced (2.2). It is one file and not a host importing the other two **because A4 forbids a screen importing a
screen**, and the gate fails on it. Only the tab that is up is rendered; `prefs.progTab` remembers which. Every line on
the Unlocks tab is read from `UNLOCKS` and `lenNeed` (L6); nothing about a requirement is written in that file or in its
markup. Its key row is a **shell** on purpose: what sits behind keys 2 and 3 is register #372 and is undecided, so it
says only what is true today. `show('s-prog', {ach:id})` opens the achievements tab at a row — the toast and Customise
both do it. **`key.js` is new at build 22 (v14 §9.2–9.7)** — the second progression system, its own menu item
below Progress (below Achievements until build 29 merged the two). **Rebuilt at build 26 (v15 §5) as KEYS, plural:** a row of three tiers on top, the ring and its panel
under whichever is selected, and a shell screen for keys 2 and 3. Three ways in now: from the menu; from a result screen
that just cleared a bar with `{advance, from:'s-over'}` (Back returns to the run); and from the same screen with
`{advance, auto:'s-over'}`, which is 5.1's input-locked interlude and hands itself back. Its rows are controls —
tapping one starts that combination with the bar pinned (5.2). **`testing.js` is new at build 21 (v14 8.10):** the dev switches are their own menu item
directly below About, not a block at the bottom of it, and that file owns the one `[data-dev]` sweep. **`title.js` is gone since build 19 (L1 / v14 1.2):** the title sequence is the `story`
class on the menu screen, not a screen of its own, so NO EXCUSES is one node that never moves or
re-renders — `show('s-menu', {story: true})` plays it. A screen calls `register(id, { onShow(opts), onBack() })` on `ui/router.js` and
`define({ act: handler })` on `ui/actions.js`. `show(id, opts)` puts the screen on and hands it opts —
`show('s-pick', {g, d, s})` opens a game's sheet at its mode or length row, `show('s-ach', {ach})`
scrolls to a row, `show('s-custom', {unlocks})` flashes an item. `back()` asks the screen first (`onBack`
returning true means it moved within itself — the pick sheet's stages), then follows the screen's
`data-back` in the markup: the parent map is the stack, fixed so Back never lands on the game layer.
Every change emits `screen:change {id}` (`'game'` for the game layer) — the atmosphere fades and pauses
its frame loop, the theme re-applies the game's colours, the wheel and the lock box close.

**The store (A5, S3) — since build 18.** One localStorage key, `ne`, holding `{ v, prefs, runs, ach,
unlock, intro, seen, bars }` (`core/store.js`). **`prefs.keySeen` is new at build 26** — the once-per-profile arrival of
the keys screen (5.4), reset by Fresh game beside `gridSeen` and `menuSeen`, **and added to `cleanPrefs` at build 28**:
it had no default and no shape check for two builds, so `reset()` was clearing a field `load()` never created.
**Fresh game clears `supporter` as well as `allOpen` since build 28 (v17 B.10)** — it did not, and `lockedBy()` in
Customise treats a supporter exactly like unlock-all, so switching Supporter on and then taking a fresh profile showed
all twenty-seven locked cosmetics open. **`seedSeen()` covers the cosmetics now too**, or every item that was open from
the start wore L8's green on a brand-new profile. **`prefs.chest1` and `prefs.progTab` are new at build 29** — chest 1 opened (v17 B.24) and which Progress tab was last
open (B.21). **`prefs.chest2` and `prefs.track` are new at build 30 (B.32)** — chest 2 opened, which is PROGRESS and
Fresh game clears it, and which music option each game plays, which is a PREFERENCE and Fresh game keeps it. A `track`
value that is not one of that game's own `TRACK_OPTS` is dropped, so renaming an option costs a player their choice and
never their boot. **`musicG` takes the key `menu` as well as a game id since build 30** — the menu loop has its own off
switch and it is shape-checked with the rest. **Both went into `cleanPrefs` in the commit that added them**, which is build 28's `keySeen` lesson applied
rather than repeated; Fresh game clears `chest1` because it is progress and keeps `progTab` because it is a preference,
like `lastGame`. **`bars` is new at build 22** — the key's cleared combinations, a map of
`'<game>:<mode>:<length>'` → when it first cleared, written only by `progress/key.js`. It needed no ladder step: a v1
record without one shape-checks to `{}`, which is the right answer for a profile that has never met the key. On load the migration ladder runs forward (v0 = the seven
build-13 keys, folded in once with the v8–v11 reshapes and then removed), then every field is
shape-checked against its default and falls back on its own — a bad colour costs the colour, never the
boot. **`store.intro` carries a bare game id beside its `'game:mode'` keys since build 27** — the once-per-game "Ready?" gate
(A.3). It needed no ladder step: a record without one reads as a profile that has not met that game, which is true.
`runs` is capped at 600. `save()` writes the whole record; `reset()` is Fresh game. `unlocked()`,
`got()`, `Scores.runs()` in `progress.js` return the live record's own maps and array. The store reads
`allOpen` / `supporter` only while `BUILD_FLAGS.dev` is true (S5), and **`ui/screens/testing.js` removes
every `[data-dev]` node in the document** — the Testing screen and its menu item — when it is false (build 21;
it was an About-only sweep before, and the selector must never name one screen again). `RUN_SCHEMA` is 2; the legacy migration stamps every
surviving run with it.

**The engine contract (A3) — since build 17.** `run/run.js` owns start / tick / finish / abort and the
run state; `games/registry.js` exports `ENGINES` by id (and `VERSUS`, the one-phone-two-ends engine
Quick Tap and Dots share). Every engine is `games/<id>/index.js` exporting one object: `mount(ctx)`,
`start(ctx)`, `input(ctx, ev)`, optional `tick(ctx, now)`, `stop(ctx)`, `result(ctx)`, plus the optional
`demo(ctx, ghost, done)` (the first-play ghost finger) and `precount(ctx)` (what plays under the 3-2-1).
`ctx = { root, game, cfg, mode, len, players, practice, scale, rateMode, emit, timers, audio, rand }`; the engine
talks back only through `ctx.emit('finish', record)` and `ctx.emit('live', partial)`. Every tap reaches the
engine through `run.input(ev)` as `{ type: 'down' | 'move' | 'up' | 'act', x, y, el, target, player, raw, t }`
— `boot.js` binds the shell's pointer and key events to it and never names an engine. `core/timers.js`
gives each run its own `later` / `frame` / `clearT`, keyed to the run; a callback from a dead run never
fires. `games/_shared/`: `hud.js` (countdown, rate bar, score and clock slots, shake, flash, ghost, the
add-up animation, and since build 20 `countUp` — **every addition to a running total is animated, in a Set as well as a
Streak (v14 6.1)** — and `hold()`, which raises `#game.tapon`: **a result with something to read stays on screen until it is tapped (v14 6.3,
narrowed by v15 3.9 at build 24)**. `roundEngine.wait(fn)` and Estimate's own `wait(fn)` are how an engine asks for that tap;
the tap is consumed by `input` and never reaches the round underneath. **Only Estimate · Grow, Estimate · Cut and
Reaction · Flash ask for it** — an engine opts in with `holdResult`, and `roundEngine.after(fn, ms)` is what everything else
calls: it holds if the engine opted in and otherwise moves on by itself. Timing and Spot lost the cue at build 24 and the
gate asserts both directions, so "removed it" and "broke it" cannot look the same. Go / No-go never had it — its shapes run
on a beat and 6.24 forbids a gap. **The hand-over card between two players' turns is the other thing that asks for a tap
(v15 §4, build 25) and it is the case §3.9 named**), `timed.js` (the Quick Tap / Dots base: hits, misses, lockout, rate, **and `row` since build 28 — the longest run of
hits with no miss between them, which is what every "N hits, no misses" rung reads (L6 / B.6); it also emits `live` on a
MISS now, so a row that asks for misses fires the moment the miss lands**),
`round.js` (the Timing / Reaction / Spot base), `versus.js`, `shapes.js`, **`two.js` — pass & play inside one run (v15 §4,
build 25): whose turn it is, what each player has done, the hand-over gate, and the `vs2` payload the result screen reads.
Estimate, Timing and Reaction hold one; `makeTwo(ctx, {lower, agg, fmt})` is the whole surface, and `turnsOf(g, d)` reads
`PASS_TURNS`. Sequence and Spot answer §4 in their own engines, because their two-player modes are not turn-taking at all —
Sequence versus is lives over a shared growing pattern, Spot · Find versus is two odd shapes in one crowd**. The game markup stays static in `index.html`;
`mount` resets an engine's own nodes rather than building them.

**`config/` is data only (A2) — since build 16.** Every number, name and string a feedback batch might
change: `build.js` (BUILD, LABEL, RUN_SCHEMA, PUB_URL) · `games.js` (GAMES, the lengths, mode names,
CFG, **`SET_COPY` — the one Set round count and both description lines per mode, L5**, the Estimate and Spot tuning —
`ESTIMATE`, `SPOT_RAMP` and `SPOT_FIND` — **`SPOT_RAMP` was rebuilt at build 28 (v17 B.15): the target count is DEALT
from a rising band rather than derived from the round, `dipFrom` / `dipEvery` are the rounds that hand out fewer targets
among many more decoys, decoys and size variation carry the difficulty, and the flash falls 22ms a round instead of 70.
`nCap` is the keypad's highest button and `games/spot/index.js` builds the keypad from it, so the band can never deal a
count the player cannot answer** — and **since build 25 `PASS_TURNS` — `[attempts per turn, turns each]` keyed
`'game:mode'` for the games that alternate inside one run — plus `SEQ_VS`, the Sequence versus lives and opening lengths.
`PASS_LEN` is seconds and stays Quick Tap and Dots only: those two pass the phone between two whole runs, and a turn count
is not a length**) · `unlocks.js` (UNLOCKS + LEN_RULES — L6) · `achievements.js` (ACH — every secret row carries a `hint`, the description
shown in place of its name since build 21 / v14 8.5 — and AUTHOR_RECORDS) · **`key-bars.js` (KEY_BARS + KEY_NOTE — the
key's 31 clearance bars, build 22, keyed `'<game>:<mode>:<length>'` exactly as `progress/key.js` builds them; each row
carries its `bar`, its `dir`, and the `conf` / `basis` the catalogue prints. Aiden amends these during play-test and a
corrected number is an edit to that file alone)** · **`keys.js` (KEYS + KEY_ART — the three key tiers, their glyph
paths and, since build 30 (B.31), their THEMES: `theme` `track` `tint` `ground`, Roots → Frost → Thorn. Three rows,
`shell:true` on the two #372 has not decided. A separate file from `key-bars.js` on purpose: a tier is not a bar, and
the bars file is the one #371 edits)** · `copy.js` (every banner, HUD, verdict, intro and screen string, grouped by where it
shows; `{name}` placeholders are filled by `T()` in `core.js`) · `theme.js` (P1/P2 colours, DESIGNS,
ITEMS, VS_ART, **and `PRESS` since build 29 — the amber the pressed game tile's outline wears, named here so the
stylesheet never picks a colour; `ui/theme.js` publishes it as `--press`**) · **`verdicts.js` (VERDICT_TIERS +
VERDICTS + VERDICT_FAIL_TIER — build 29, v17 B.25: four tiers with a colour and a sound id each, and a row per game
carrying its own three thresholds and its own twenty lines. The old five-line table is OUT of `copy.js`)** · **`audio.js` (SCALES · TRACKS — 25 of them: three per game, the menu and the three key themes, each an
arrangement · TRACK_OPTS, one list per game · TRACK_PICK · STEMS, the versus pair · **since build 30: SET_SECS, how
long a Set is expected to take so B.29 can size its arc; DUCK / DUCK_TAIL, Sequence's; FLOW_STEM and FLOW_AT / FLOW_SPAN
/ FLOW_RISE / FLOW_FALL, B.27's** · **VERDICT_FX since build 29 — one event list per verdict tier,
`[at, f0, f1, ms, wave, gain, attackMs]`, the same plan shape `Music.plan` hands the review page, so the page and the
app cannot drift**).** Nothing in `config/` imports anything; the gate asserts
it. **The functions that used to sit in those tables live under the same id elsewhere:** predicates in
`progress/rules.js` (`UNLOCK_TEST[key]`, `LEN_TEST[game][i]`, `ACH_TEST[id]`, `ACH_PROGRESS[id]`,
`QUALITY`) and formatters in `ui/format.js` (`FMT`, `COLS`, `PIC` → `scoreTxt`, `colsOf`, `picOf`),
both keyed `'g'`, `'g:d'`, `'g:streak'`, `'g:d:streak'` and resolved by `GV()` in `games/registry.js`.
`progress.js` joins data and predicate: `UNLOCKS` and `ACH` leave it with `test` / `progress` attached.
A feedback line that changes a number touches `config/` only; if it also needs a rule, the id links them.

`index.html` the shell: markup, one `<link>` to `styles/app.css`, one module script · `styles/app.css`
all CSS, in sections that match the folders (shell · atmosphere · one per screen · toast · ads · run ·
one per game · versus) · `core.js` helpers (`$`, `esc`, `T`, `pWho`, `seqStep`) · `core/events.js`
on/emit · `core/store.js` the one-key store · `core/state.js` `sel`, `VS` · `core/platform.js` the
challenge link · `core/timers.js` run-scoped timers · `games/registry.js` `GC`/`GV` and the length names
over the config table · `progress.js` unlocks, achievements, scores — pure functions over the store, no
DOM · `progress/key.js` the key: the contributor list, the clearance test and each game's root fraction · `audio.js` sound and music — the arrangement player (`bars()` turns one bar of a track into tone
events as fractions of that bar; `Music.plan(id)` hands one whole loop to the review catalogue so the page never carries
a second copy of the synth). The run hands `Music.start` its state object and audio never imports the run; it listens
for `screen:change` for the menu loop · `ui/router.js` show/back · `ui/actions.js` the click dispatcher and the `define()` registry ·
`ui/theme.js` the game's colours as CSS variables · `ui/chips.js`, `ui/format.js` shared by the screens ·
`ui/toast.js` · `ui/ads.js` · `ui/atmosphere.js` the menu canvas · `ui/screens/*` · `run/run.js` the run
itself, plus `liveCheck` and `goWhere` · `run/input.js` the shell's pointer and key events into the run ·
`games/<id>/index.js` one engine per game, `games/_shared/` what they share · `scripts/bump.mjs` the
build bump · `_smoke/cssdiff.mjs` a tool: computed-style diff between two stylesheets, for the next CSS move.

**Every control carries `data-act`.** `ACTIONS[act](el, ev)` in `ui/actions.js` does the work and
returns `'pick'` or `'click'` for the sound (undefined for silence); the nearest `data-act` ancestor of
the tap decides, so the overlays (toast, ad break, lock box, Next card, the full stop) are ordinary acts.
A button with no act plays its old sound and does nothing. A new button = one attribute in the markup +
one entry in its screen's `define({...})`. The one exception is the title sequence: while it is on, a tap
anywhere advances it (`capture()` in `ui/actions.js`).

Bindings written across modules go through setters, because ESM imports are read-only:
`setPendingAim` / `setPendingGoal` (progress.js).

## Locked decisions — full text and amendment history

The table as `CLAUDE.md` carried it at build 30, with every amendment inline, followed by the amendment notes. The table
in `CLAUDE.md` is the same ten locks at their current values only.

| ID | Decision |
|---|---|
| L1 | The title sequence plays for every new profile and after Fresh game. Never removed or shortened. **Re-staged (v14 1.1):** "games of pure skill" arrives first at the top, **NO EXCUSES second, between the two lines in time and in position**, "the only thing to blame is yourself" third, below the title. **NO EXCUSES never moves or re-renders between the title sequence and the menu (v14 1.2)** — same element, same position, no reload, no re-animation; the menu builds around it. **"Tap to begin" re-placed at build 29 (v17 B.19, quoting L1): 1.2s instead of .8s and 30vh from the bottom instead of the home-indicator margin. Placement and pace only** — it is still the fourth beat at 4.6s, both story lines and the title are untouched, and nothing is removed or shortened. |
| L2 | Quick Tap lengths are Sprint / Dash / Marathon. Nothing added. |
| L3 | Solo shows nothing about friends. With a friend → Pass & play / Versus, every game that has them. |
| L4 | Player 1 red `#E0453B`, Player 2 light blue `#6EC6FF`, everywhere. |
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget** (Estimate 100%, **Stopwatch 25s, and 30s once round 10 is passed — v15 3.8, build 24**, Hidden 100px, **Flash 500ms over 150, and an early tap spends 400ms flat and consumes the attempt — v14 C.1 / v15 3.5, build 24**, **Go / No-go 1000ms over 150 with a wrong tap costing 200ms — v14 C.2, build 22**, Count 5 miscounts, Find 10s); score = rounds completed, and every sheet reads "Highest round wins!". Set = a fixed number of rounds, scored by the line on the sheet. **Go / No-go's Set is a different currency and keeps its own number: a wrong tap ADDS 150ms to the average (v14 A.2), and three wrong taps end a Set. B.3 / C.3 forbid harmonising the two even though the numbers now sit close.** **A Streak has no wrong-tap run-ender at all — C.4 retired the three-wrong-taps contract rather than restoring it, because the budget is spent by the overspend on legal taps as well as by mistakes. The budget is the only limit.** **The round count and both description lines come from one table — `SET_COPY` in `config/games.js` (v14 §5, 2026-09-08)** — which the pick sheets, lock boxes and result screens all read through `GC` / `lenName` / `lenSub`. No game carries its own Set or Streak copy. |
| L6 | The unlock chain and thresholds are the §1 table in the latest FEEDBACK file that names L6 (§4 before v15). **Sequence unlocks at one Cut round within 3.5% of the target (v14 9.1; was 0.5%).** Lock boxes, goal lines, the Next card and the Unlocks screen all read from one table (`UNLOCKS` + `LEN_RULES` — in `config/unlocks.js` since build 16, with the predicates beside it in `progress/rules.js`), and every requirement names its game (v14 3.2). **`LEN_RULES` and `LEN_TEST` are keyed `'game:mode'` since build 23 (v15 1.0a)** — the same key shape `SET_COPY` uses — because Dots · Blind Dash asks 6 and Dots · Lead Dash asks 9, which one array per game could not express. Length-unlock **state** is derived from run history and has always been per mode (`lenLock` filters on `r.d`), so the re-key stored nothing and migrated nothing (1.0b). **One place builds a length requirement's sentence: `lenNeed(g,d,s)` in `progress.js`** — `lenLock` calls it too. `lenLock` answers "is this locked for you" and returns null once you have it, so anything printing a requirement (the catalogue's Unlock requirements section) must call `lenNeed`, not `lenLock` (v15 1.1c / 7.2). **Five rows now ask the player to fail on purpose and that is deliberate (v15 0.5)** — Dots · Lead on five misses, Estimate · Grow on a Dots run with nothing pressed, Timing · Stopwatch on a Sequence run whose first answered note is wrong, Estimate · Cut's Streak on a round more than 10% off, Reaction · Flash's Streak on a Set over 500ms. Do not soften them; **tapping a locked row to read its requirement (v15 2.1) is the only way anyone finds them**, so that behaviour is part of L6 now, not a nicety. **L6 amended again at build 28 (FEEDBACK-v17 §B.5–§B.9, all quoting it).** Five changes. **(B.6) Every "N hits, no misses" rung is N IN A ROW** — `row` on the timed record, a miss resets it, and a record from before build 28 carrying no `row` is judged the old way. `misses === 0` over a whole run is exact at the finish and a lie mid-run, which is how a green "Unlock: Dash" appeared at the seventh clean hit and was taken back by the eighth miss. **(B.7) Quick Tap · Four opens from ANY Quick Tap · Two run** — `s` came off `where`, so a Sprint counts and Four can open before Dash. **(B.8) Estimate · Cut's Streak asks for more than 10% off, not 80%** — 80 was unreachable: a Cut round scores `|share − target|` where `share` is the smaller piece, so it lives in (0.5, 50] and the most any target can be missed by is `max(t − 0.5, 50 − t)`, a measured ceiling of 44.5% and a floor across the pool of 25%. **(B.9) Sequence is 3 and 7 keys** — five is gone from solo, pass & play and versus, `sequence:solo:5` was REMOVED from `config/key-bars.js` (a removal, never a generated bar), and 7 keys opens at 8 notes in 3. **(B.5) A LENGTH UNLOCK ANNOUNCES.** It never did: a length is not in `UNLOCKS`, so `liveCheck`'s table walk could not see one and the only announcement was the accident of it being that run's goal line. `lenNextOf` / `lenNextLive` in `progress.js` are the two halves — the finish compares locked-before against open-after either side of `Scores.submit`, which covers the default "finish one run of the length before" rule as well as every `LEN_RULES` row; mid-run only a rung with a `LEN_TEST` can answer, and a rule-less rung correctly answers nothing rather than guessing. **The goal line no longer raises its own toast** — it used to fire an immediate "Unlock: Marathon" on the first live tick of a rule-less rung, because `goalFor`'s test for one is a bare `true`. **L6 amended again at build 29 (v17 B.21, quoting it): "the Unlocks screen" is the Unlocks TAB of the Progress screen.** Nothing else about the rule moved — the same one table, the same `lenNeed`, the same lock box from a locked row. |
| L7 | A game tile is white until that game has been played once. |
| L8 | Anything newly unlocked gets the green first-seen highlight once, then is marked seen. |
| L9 | The length row is labelled "Mode" in every game. One pick-sheet layout, no per-game special cases. |
| L10 | Two-player runs never go on a board — and **that is the narrow half of a wider rule since v15 A.3 (2026-09-09): no two-player run of any kind advances a key, a clearance bar, an unlock or an achievement.** **A DEMO IS THE SAME SHAPE (v17 B.4, build 28)** — no first-play ghost, demo or scripted run advances any of them either, enforced at the same two points. It had to be: Estimate · Grow's demo plays a whole round on the real engine and its reveal emits `live`, so the ghost's own guess earned an achievement. `R.demo` in `run/run.js` is the flag, `run.demo` on the record is the belt, and the gate drives a whole first-play demo and reads storage back. Aiden's reason, in his words: *"I don't want anyone to have to rely on someone else in order to beat this game."* Enforced at the finish (`two` in `run/run.js`, since build 22's 9.4) **and mid-run since build 25** — `liveCheck` turns away every `sel.vs`, not only versus, which it had to once §4 gave five more games a run both players share. The five two-player modes §4 added are pure play, by intent, and the gate reads storage back after each of them. |

**L5 amended at build 24 (FEEDBACK-v15 §3.5 and §3.8, 2026-09-09), both quoting it.** Stopwatch's Streak budget was **2.0s**
against 7s targets — two ordinary attempts spent it, which is why Aiden called it far too punishing and why he read the number
as "about 2s". It is 25s now, 30s once round 10 is passed, and the Streak's targets **climb** (2.5s at round 1, about half a
second a round, held at 9s) instead of being drawn flat around 7s. The Stopwatch **Set** is untouched: v14 6.18's exact-mean
deal is a promise printed on the sheet and a ramp would make it a lie. Flash gained a **third** currency — an early tap spends
400ms *flat*, not 400 over the free allowance, and consumes the attempt instead of being a retakeable fault. Go / No-go's three
numbers are untouched by it; C.3's rule that the currencies are not to be harmonised now covers four numbers, not three.

**L6 amended again at build 23 (FEEDBACK-v15 §1, 2026-09-09): the key shape of `LEN_RULES`, seventeen values, and the deliberate-failure rows.** Locked as of build 13 (FEEDBACK-v13 §L, 2026-09-05). **L1, L5 and L6 amended at build 19 (FEEDBACK-v14 §L, 2026-09-08);
L5 gained Go / No-go's Streak budget at build 20 (v14 6.2), its two thresholds at build 21 (v14 B.1 / B.2) and the numbers
it carries now at build 22 (v14 C.1–C.4, all of which quote L5).** Build 20 skipped 6.8 because it asked for 150ms, named
no lock and was filed under Quick Tap, which has no Streak at all (L2); **B.1 read it as Reaction · Flash and set 250.
Aiden overruled that at build 22: C.1 puts Flash back to the 150 that 6.8 asked for and C.2 does the same to Go / No-go,
with a 200ms wrong tap. Both budgets are unchanged. The runs are deliberately shorter — four or five rounds, not ten —
and that is the intended effect, not a regression.**

**L5 amended at build 31 (FEEDBACK-v18 §B.1c, §B.2, §B.3, §B.4, §B.6, 2026-09-12), all quoting it.** Five changes, and
four of them are the same complaint: a run was over before it had started, or a number moved before it could be read.

- **(B.1c) Go / No-go loses its three-wrong-taps run-ender, in the Set and in a pass & play turn alike.** C.4 retired it for
  the Streak at build 22 on the reasoning that the budget is spent by legal taps as well as by mistakes; B.1c finishes the
  job for the same reason in reverse — Aiden's note is "wrong taps do nothing I can feel", and an ender is what let the
  *cost* stay invisible. A wrong tap is now only what L5 already said it was: 150ms on a Set's average, 200ms out of a
  Streak's budget. It is shown on the card, the score jumps by it, and the screen shakes. The two currencies still are not
  harmonised (B.3 / C.3).
- **(B.1b) A Go / No-go ROUND is one target shape and three correct taps of it**, so a Set is five rounds and fifteen taps
  where it used to be five *shapes* and over in seconds. Every mode deals its round as a block up front — pass & play
  always did (#375b) and solo rolling shape by shape is what made the target's position guessable. **(B.1d) The first shape
  after the instruction is always a decoy**, which is the third rule in `dealBlock` beside #375b's two: no shape three
  times running, no decoy repeated. `RULE_EVERY` and `nextShape()` are retired with the old shape-counting.
- **(B.2) Timing · Stopwatch · Set is the SUM of its rounds' differences, not their mean.** Aiden: "I might have said
  average before; I don't want that any more." v14 6.18's exact-mean *deal* is untouched — five rounds averaging 7s still
  ask for exactly 35.00s — and the baseline line it is measured against moves back onto the Set (B.3d), where v16 §3 had
  taken it off on the reasoning that a mean has no use for a total.
- **(B.3) The Stopwatch Streak, four ways.** The budget is **5s, 7.5s past round 10**, where v15 3.8 had set 25 / 30; the
  targets climb **a whole second a round and are never held**, where they climbed 0.45s and stopped at 9s, which is why
  "at attempt 14 the target was only 8 seconds"; the difference **holds `CFG.hold` (800ms) before it drains** into the
  total; and the big number is **the time spent out of the budget** rather than the round "attempt N" already named.
  The 25s budget existed because two ordinary attempts against a flat 7s target spent a 2s one — with the targets
  climbing properly the run no longer needs twenty-five seconds of slack to reach round ten.
- **(B.4) Timing · Hidden is measured in MILLISECONDS.** It was pixels off the marker, and 100px is a different miss on
  every phone: measured headless at 390×844, `#gen` is 390 × 683.66 and the ball crosses it at 117px/s across and 205px/s
  down, so a pixel is 8.55ms one way and 4.88ms the other. The budget converts to 671ms and is set at **700**, rounded to
  a hundred as B.4 asks. Both clearance bars and both achievement rows are **converted at the measured pace, not retuned**
  — Hidden 180px → 1200ms, Stopwatch 0.28s average → 1.40s total, X-ray 300px → 2000ms, Metronome 0.12s → 0.60s.
- **(B.6) A Flash Set attempt over 1000ms scores 1000ms and COUNTS.** It used to be thrown away — "too slow · try again ·
  attempt 2 of 5" — so a Set measured only the attempts the player happened to be quick on, which is the opposite of what
  a reaction Set is for. `fault()` is retired with it. The Streak is untouched: there the cost is the budget and a retake
  was never on offer.

**L6 amended at build 31 (FEEDBACK-v18 §B.8, quoting it): `LEN_LIVE`, and a length earn that is written down.**
B.8 reported two faults in the Reaction · Flash Streak unlock and **both halves of the note were right**, though one of
them named a mechanism the build does not have.

- The rung is `LEN_RULES['reaction:flash'][1]` — "a Set averaging over 500ms" — and Reaction emits its **running average**
  as `hits` after every attempt, so one 600ms no-tap made `r.hits > 500` true on attempt one and the toast fired. Aiden
  called this "the predicate is being met by a single attempt instead of the finished run's average", which is exactly
  what was happening. The second half of his diagnosis was "it must not carry `live:1`" — and there was **no flag to
  remove**: a length is not in `UNLOCKS` and has never had one. Build 28's B.5 gave lengths a mid-run announcement and
  `lenNextLive` handed *every* `LEN_TEST` to it, monotone or not. So the missing thing was the flag itself. `LEN_LIVE` is
  it, one entry per rung, and the only 0 in the table is Flash's.
- The other half: "the toast said unlocked, he quit, and Streak was locked." Also right, and **worse than reported** — it
  was true of every length in the game, not only this one. Length state is derived from run history (1.0b), `abort()`
  never submits a record, so a quit run left the derivation nothing to read. `bankLen` writes the three-part key the toast
  already names, on the live path and again at the finish, and `lenLock` reads it back first. That is the standing rule
  build 23 set for unlocks and achievements — an earn is written the moment it fires — finally applied to the one kind of
  unlock that had no store entry to write.

## Bump the build: one command (A6, build 16) — as of build 30, before S.2 put `v0.N` on screen

```
npm run bump -- N
```

Sets `BUILD` in `config/build.js`, then writes the three places in `index.html` (the hint line under the title,
`<div id="build">`, the update-check constant) and `version.json` from it. The hint line reads
`build N · <LABEL> · <date>` — `LABEL` is in `config/build.js` too (`refactor 0.K` during the refactor). Never
hand-edit the four places: a mismatch between the constant and `version.json` pins the green "new build" bar on
every phone forever. The gate's static check asserts all five agree. `RUN_SCHEMA` (the `v` on every run record)
lives beside `BUILD` and does **not** move with it — see the comment there for why it is still 13.
