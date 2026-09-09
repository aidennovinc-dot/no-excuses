# No Excuses — repo rules

Web prototype of a phone game: small games of pure skill, no luck, no timers you can't see.
Served from GitHub Pages (`aidennovinc-dot/no-excuses`, `main`, root) at one fixed URL so the
home-screen icon always gets the latest build. Native iOS comes later, once the feel is proven.

**One session per feedback batch.** Implement `../FEEDBACK-vNN.md`, update `../FEATURES.md` with
done / not done / why, bump the build, smoke test, commit `build N — batch NN`, push. Don't explain.

## Bump the build: one command (A6, build 16)

```
npm run bump -- N
```

Sets `BUILD` in `config/build.js`, then writes the three places in `index.html` (the hint line under the title,
`<div id="build">`, the update-check constant) and `version.json` from it. The hint line reads
`build N · <LABEL> · <date>` — `LABEL` is in `config/build.js` too (`refactor 0.K` during the refactor). Never
hand-edit the four places: a mismatch between the constant and `version.json` pins the green "new build" bar on
every phone forever. The gate's static check asserts all five agree. `RUN_SCHEMA` (the `v` on every run record)
lives beside `BUILD` and does **not** move with it — see the comment there for why it is still 13.

## Standing design rules — don't relitigate these each batch

- **Player 1 is red (`#E0453B`), Player 2 is light blue (`#6EC6FF`)**, everywhere two people share
  the phone. Never swap them per game.
- **Every mode offers Set and Streak.** Set = a fixed number of rounds. Streak = until you fail.
- **Two-player is picked in two steps**: *Solo* / *With a friend*, then *Pass & play* / *Versus*.
- **One pick-sheet layout for every game** — mode row, then length row. No per-game special cases.
- **Seconds live on the pick sheet, not the result screen.** Lengths are named (Sprint, Dash,
  Marathon, Set, Streak); the raw seconds are a subtitle on the sheet only.
- **Unlock toasts are green**: `Unlock game: X` for a game, `Unlock: X` for a mode or a length.
- **Where lower is better, say so** — the board and result screen carry the indicator; never leave
  the player to work out which direction wins.
- A new game is one entry in `GAMES` (`config/games.js`) plus an engine in `games/`, its formatters in
  `ui/format.js` and its quality predicate in `progress/rules.js`, all under the same id.
- **There are TWO progression systems and they share nothing but a screen** (v14 9.2, build 22). The **unlock chain**
  (`config/unlocks.js`, L6) is sequential and gates which games are playable. **The key** (`progress/key.js`,
  `config/key-bars.js`) is concurrent, gates nothing, and every unlocked game feeds it independently. Never describe
  one in terms of the other — that mistake is what sank mock-up option C.
- **A clearance bar is a one-off threshold, not a score to hold.** Beat it once in a solo run and that combination is
  cleared for good; re-clearing does nothing and plays nothing. Pass & play, versus, practice and challenge-link runs
  never contribute (9.4, consistent with L10). **Call them clearance bars, never "minimum bars"** (C.7) — eight of the
  thirty-one are ceilings, so "minimum" is wrong for a quarter of them.
- **The key's contributor list is built from the config, never listed.** `GAMES` × modes × `GC(g,d).lens` — a game with
  a `SET_COPY` row contributes Set and Streak per mode, a timed game contributes its lengths, Sequence its key counts.
  31 today; a new mode joins the key with one row in `config/key-bars.js` and no code change. The gate fails on a
  literal `31` in `progress/key.js`, and on any combination without a bar or any bar without a combination.

## Structure

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
`pick`, `board`, `unlocks`, `achievements`, `key`, `customise`, `about`, `testing`, `pass`, `result`, `lockbox`; `index.js`
imports them all. **`unlocks.js` is new at build 23 (v15 2.4)** — the menu splits Unlocks from Achievements, Unlocks above
because unlocks outrank achievements everywhere the next thing is surfaced (2.2). Every line on it is read from `UNLOCKS`
and `lenNeed` (L6); nothing about a requirement is written in that file or in its markup. It is a **shell** on purpose:
what sits behind keys 2 and 3 is register #372 and is undecided, so its key section says only what is true today. **`key.js` is new at build 22 (v14 §9.2–9.7)** — the second progression system, its own menu item
below Achievements. It is the one screen with two ways in: from the menu, and from a result screen that just cleared a
bar, which passes `{advance, from:'s-over'}` so the root animates and Back returns to the run rather than the menu. **`testing.js` is new at build 21 (v14 8.10):** the dev switches are their own menu item
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
unlock, intro, seen, bars }` (`core/store.js`). **`bars` is new at build 22** — the key's cleared combinations, a map of
`'<game>:<mode>:<length>'` → when it first cleared, written only by `progress/key.js`. It needed no ladder step: a v1
record without one shape-checks to `{}`, which is the right answer for a profile that has never met the key. On load the migration ladder runs forward (v0 = the seven
build-13 keys, folded in once with the v8–v11 reshapes and then removed), then every field is
shape-checked against its default and falls back on its own — a bad colour costs the colour, never the
boot. `runs` is capped at 600. `save()` writes the whole record; `reset()` is Fresh game. `unlocked()`,
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
on a beat and 6.24 forbids a gap), `timed.js` (the Quick Tap / Dots base: hits, misses, lockout, rate), `round.js` (the
Timing / Reaction / Spot base), `versus.js`, `shapes.js`. The game markup stays static in `index.html`;
`mount` resets an engine's own nodes rather than building them.

**`config/` is data only (A2) — since build 16.** Every number, name and string a feedback batch might
change: `build.js` (BUILD, LABEL, RUN_SCHEMA, PUB_URL) · `games.js` (GAMES, the lengths, mode names,
CFG, **`SET_COPY` — the one Set round count and both description lines per mode, L5**, the Estimate and Spot tuning —
`ESTIMATE`, `SPOT_RAMP` and `SPOT_FIND`) · `unlocks.js` (UNLOCKS + LEN_RULES — L6) · `achievements.js` (ACH — every secret row carries a `hint`, the description
shown in place of its name since build 21 / v14 8.5 — and AUTHOR_RECORDS) · **`key-bars.js` (KEY_BARS + KEY_NOTE — the
key's 31 clearance bars, build 22, keyed `'<game>:<mode>:<length>'` exactly as `progress/key.js` builds them; each row
carries its `bar`, its `dir`, and the `conf` / `basis` the catalogue prints. Aiden amends these during play-test and a
corrected number is an edit to that file alone)** · `copy.js` (every banner, HUD, verdict, intro and screen string, grouped by where it
shows; `{name}` placeholders are filled by `T()` in `core.js`) · `theme.js` (P1/P2 colours, DESIGNS,
ITEMS, VS_ART) · `audio.js` (SCALES, TRACKS). Nothing in `config/` imports anything; the gate asserts
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
DOM · `progress/key.js` the key: the contributor list, the clearance test and each game's root fraction · `audio.js` sound and music (the run hands `Music.start` its state object; audio never imports the
run) · `ui/router.js` show/back · `ui/actions.js` the click dispatcher and the `define()` registry ·
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

**An earn is written the moment it fires, never when a screen gets round to it (build 23, v15 2.5).** This was silent data
loss: `checkUnlocks` and `checkAch` used to run inside the result screen's ad-break callback, so an achievement earned on a
run the player left — quit mid-run, or walked away on the ad — was never in the store. Now `run/run.js` banks all three
(`checkUnlocks`, `checkAch`, `checkKey`) before it emits `run:finish`, and hands the lists down on the event; the result
screen only shows them. Mid-run, **`live:1` means the same thing on an achievement as it does on an unlock** — the row's
test can only become more true as the run goes on, so `liveCheck` banks and toasts it at once. Rows without the flag are
totals, averages and "no wrong taps" claims about a whole run, and still wait for the finish. `abort()` runs one last
`liveCheck` over the engine's own `result()` so the round that just landed is banked before the quit. The gate asserts all
of it, statically and by quitting a run mid-flight and reading storage back.

## Locked decisions

**A change that touches a locked item is built only when the FEEDBACK line quotes its ID (e.g. `L2:`).
Otherwise skip it and list it under "Skipped — locked" in FEATURES.md. Anything not in the FEEDBACK
file that changes a rule, threshold, name, unlock or screen layout is not built — list it under
"Proposed" in FEATURES.md instead.**

| ID | Decision |
|---|---|
| L1 | The title sequence plays for every new profile and after Fresh game. Never removed or shortened. **Re-staged (v14 1.1):** "games of pure skill" arrives first at the top, **NO EXCUSES second, between the two lines in time and in position**, "the only thing to blame is yourself" third, below the title. **NO EXCUSES never moves or re-renders between the title sequence and the menu (v14 1.2)** — same element, same position, no reload, no re-animation; the menu builds around it. |
| L2 | Quick Tap lengths are Sprint / Dash / Marathon. Nothing added. |
| L3 | Solo shows nothing about friends. With a friend → Pass & play / Versus, every game that has them. |
| L4 | Player 1 red `#E0453B`, Player 2 light blue `#6EC6FF`, everywhere. |
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget** (Estimate 100%, **Stopwatch 25s, and 30s once round 10 is passed — v15 3.8, build 24**, Hidden 100px, **Flash 500ms over 150, and an early tap spends 400ms flat and consumes the attempt — v14 C.1 / v15 3.5, build 24**, **Go / No-go 1000ms over 150 with a wrong tap costing 200ms — v14 C.2, build 22**, Count 5 miscounts, Find 10s); score = rounds completed, and every sheet reads "Highest round wins!". Set = a fixed number of rounds, scored by the line on the sheet. **Go / No-go's Set is a different currency and keeps its own number: a wrong tap ADDS 150ms to the average (v14 A.2), and three wrong taps end a Set. B.3 / C.3 forbid harmonising the two even though the numbers now sit close.** **A Streak has no wrong-tap run-ender at all — C.4 retired the three-wrong-taps contract rather than restoring it, because the budget is spent by the overspend on legal taps as well as by mistakes. The budget is the only limit.** **The round count and both description lines come from one table — `SET_COPY` in `config/games.js` (v14 §5, 2026-09-08)** — which the pick sheets, lock boxes and result screens all read through `GC` / `lenName` / `lenSub`. No game carries its own Set or Streak copy. |
| L6 | The unlock chain and thresholds are the §1 table in the latest FEEDBACK file that names L6 (§4 before v15). **Sequence unlocks at one Cut round within 3.5% of the target (v14 9.1; was 0.5%).** Lock boxes, goal lines, the Next card and the Unlocks screen all read from one table (`UNLOCKS` + `LEN_RULES` — in `config/unlocks.js` since build 16, with the predicates beside it in `progress/rules.js`), and every requirement names its game (v14 3.2). **`LEN_RULES` and `LEN_TEST` are keyed `'game:mode'` since build 23 (v15 1.0a)** — the same key shape `SET_COPY` uses — because Dots · Blind Dash asks 6 and Dots · Lead Dash asks 9, which one array per game could not express. Length-unlock **state** is derived from run history and has always been per mode (`lenLock` filters on `r.d`), so the re-key stored nothing and migrated nothing (1.0b). **One place builds a length requirement's sentence: `lenNeed(g,d,s)` in `progress.js`** — `lenLock` calls it too. `lenLock` answers "is this locked for you" and returns null once you have it, so anything printing a requirement (the catalogue's Unlock requirements section) must call `lenNeed`, not `lenLock` (v15 1.1c / 7.2). **Five rows now ask the player to fail on purpose and that is deliberate (v15 0.5)** — Dots · Lead on five misses, Estimate · Grow on a Dots run with nothing pressed, Timing · Stopwatch on a Sequence run that scored nothing, Estimate · Cut's Streak on a round more than 80% off, Reaction · Flash's Streak on a Set over 500ms. Do not soften them; **tapping a locked row to read its requirement (v15 2.1) is the only way anyone finds them**, so that behaviour is part of L6 now, not a nicety. |
| L7 | A game tile is white until that game has been played once. |
| L8 | Anything newly unlocked gets the green first-seen highlight once, then is marked seen. |
| L9 | The length row is labelled "Mode" in every game. One pick-sheet layout, no per-game special cases. |
| L10 | Two-player runs never go on a board. |

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

**Code decisions A1–A8 in `ARCHITECTURE.md` — same quote-the-ID rule.** A feedback line changes one
only when it names the ID (e.g. `A6:`); otherwise it goes under "Proposed" in FEATURES.md.

## The gate

**`npm test`** (build 14) spawns its own static server — no Python — and drives headless Chromium at
390×844 with **zero uncaught errors**. First three static checks: the build number in
`config/build.js` is the one in `index.html` ×3 and `version.json` (A6), `config/` has no imports
and no functions (A2), and every engine imports only `_shared` / `core` / `config` (A3, build 17), no screen imports a screen or an
engine and the run imports no screen (A4, build 18). Then: intro → menu → every pick sheet → one Set run and one Streak
run per game, driven to the result the way that engine is played → a pass & play Quick Tap → boot on
five storage fixtures (empty · build-13 layout, which must migrate to the one key `ne` v1 with runs, unlocks,
achievements and name intact and the old keys removed · corrupt build-13 keys · a corrupt `ne` v1 that falls back
field by field · 650 runs, capped at 600) → challenge links with a
hostile `score`, a bad `s`, and a locked mode the link opened (that run never reaches a board). It
also asserts that every mode’s Set and Streak lines come from `SET_COPY` (L5), that the title element is the same node
in the same place before and after the menu builds (v14 1.2), that **every round-based game holds its result until it is
tapped (v14 6.3 — a game that never raises `#game.tapon` auto-advanced)** and that **five Stopwatch rounds averaging 7s
ask for exactly 35.00s (v14 6.18)**, **the side screens (v14 §8, build 21)** — a first-seen Customise swatch still shows its own colour (8.7), the
achievements list has no sideways axis to be left panned on (8.2), the game name leads the achievement title (8.3), a
secret row is described (8.5), "every game" names the games left (8.1), and Testing is its own item below About with
nothing left in About (8.10), **the key (v14 §9, build 22)** — the contributor list is exactly `GAMES` × modes ×
`GC(g,d).lens` and `progress/key.js` contains no literal 31 (C.5), every combination has a clearance bar and every bar
has a combination (C.6), all 31 directions agree with `GC(g,d,s).lower` (C.7), a bar clears once and only from a solo
run (9.3 / 9.4), and the ring draws seven games and 31 root segments (9.6) — **and the two Reaction Streak currencies L5 names**: Flash 500/150, Go / No-go 1000/150
with a wrong tap costing 200ms in a Streak and 150ms in a Set, held apart as separate constants, and every
`wrong >= 3` test behind a `!streak()` guard so the retired run-ender cannot come back (v14 C.1–C.4);
plus the testable locks on a fresh profile — title sequence before the menu (L1), Quick Tap's
length row is exactly Sprint / Dash / Marathon (L2), Solo shows no Pass & play / Versus (L3), the
Quick Tap tile is white before any run (L7), the length row is labelled Mode (L9). **The chain and its screens (v15 §1–§2,
build 23)** — `LEN_RULES` is keyed `'game:mode'` and every key names a real game and mode (1.0a), each of the seventeen new
values passes one step over the line and fails one step under it (1.1–1.4), one record builds every length requirement
(1.0d) and nothing on the Unlocks screen is a second copy (2.4), the new Estimate secret row is described (1.5), no Next
card on a fresh profile's first menu open (2.2), tapping a locked length on the result screen shows its requirement and
stays put (2.1), and **an unlock that fires mid-run is in localStorage after the run is quit (2.5)** — plus the static
assert that the run banks before `run:finish` and the result screen no longer earns anything. **A failing
assertion blocks the push.** Run it before every push; ~4 minutes. `CHROME_PATH` overrides the
Windows default Chrome. **`npm run review` is live again — build 21 (#368 closed).** It drives
`../_review/scripts/` (54+ cards, data-driven), ported from Playwright to the same puppeteer-core the gate uses and
spawning its own server, so it takes no arguments: capture → `build-catalogue.mjs`. **The progression map is retired,
not repaired — #370 closed at build 22.** `progression.mjs`, `build-progression.mjs`, `progression.template.html`,
`build-progression.py` and the last `progression.html` moved to `../_review/_retired/` (a README there says why); the
catalogue's own Unlock requirements section is the replacement and, unlike that page, it cannot drift from the build.
**The catalogue gained "The key · clearance bars" (`#keybars`) at build 22 (v14 C.6)** — 31 rows with a bar and a
"best seen" input each, saving to the artifact's db doc `bars/current` as `{bars, best, free, defaults, build, updated}`.
The rows come out of the running app like every other reference section, so the page always shows the numbers the build
is actually playing; a mismatch between `config/key-bars.js` and the config prints a red strip on the page and a warning
in the console rather than dropping a row. **The older 29-card copy under `_smoke/review/` is deleted** — there is one generator now, and
a build that changes a screen changes it in one place. Cowork still publishes the page; nothing here publishes.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
