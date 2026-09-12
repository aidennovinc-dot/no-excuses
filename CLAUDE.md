# No Excuses — repo rules

Web prototype of a phone game: small games of pure skill, no luck, no timers you can't see.
Served from GitHub Pages (`aidennovinc-dot/no-excuses`, `main`, root) at one fixed URL so the
home-screen icon always gets the latest build. Native iOS comes later, once the feel is proven.

**One session per feedback batch.** Implement `../FEEDBACK-vNN.md`, update `../FEATURES.md` with
done / not done / why, bump the build, smoke test, commit `build N — batch NN`, push. Don't explain.

## Read on demand — not every session

| File | Read it when |
|---|---|
| `docs/RULES-HISTORY.md` | A feedback line quotes a lock (L1–L10), or you need a standing rule's full text and history, the store's `prefs` changelog, the engine contract or the `config/` inventory |
| `docs/MUSIC.md` | Touching `audio.js`, `config/audio.js`, `_smoke/loudness.mjs` or any `Snd.*` call |
| `docs/PROGRESSION.md` | Touching `progress.js`, `progress/`, `config/unlocks.js`, `config/key-bars.js`, `config/keys.js`, the key or Progress screens, or `liveCheck` |
| `_smoke/GATE.md` | Extending the gate, or an assertion fails and you need the feedback line it stands for |

Trimmed 2026-09-12 (batch 14 S.1) from 58KB; every sentence moved, none deleted. A build that amends a rule changes
its one line here and its full text there, in the same commit.

## Bump the build: one command (A6, build 16 · `v0.N` on screen since batch 14 S.2)

```
npm run bump -- N
```

Sets `BUILD` in `config/build.js` — **the integer, the one place the count lives (A6)** — then writes the three places in
`index.html` (the hint line on About, `<div id="build">`, the update-check constant) and `version.json` from it. **On
screen the build reads `v0.N`** (S.2 — "more obvious it's a beta"; v1.0 is the release): hint line `v0.N · <LABEL> ·
<date>`, `#build` `v0.N`, and the update bar names the build it found. The constant and `version.json` stay the bare
integer — compared to each other, never read by a person. Never hand-edit the four places: a mismatch pins the green
"new build" bar on every phone forever; the gate asserts all five agree and the visible two wear `v0.`. `RUN_SCHEMA`
lives beside `BUILD` and does **not** move with it (it is 4; the comment there says why — it moves only when a scoring
unit changes, and the store's ladder gains a step the same day).

## Standing design rules — one line each; full text in `docs/RULES-HISTORY.md`

- **Player 1 is red `#E0453B`, Player 2 light blue `#6EC6FF`**, everywhere two people share the phone; never swapped per game (L4, `config/theme.js`).
- **Every mode offers Set and Streak** — Set a fixed number of rounds, Streak until the budget is spent (L5, `SET_COPY` in `config/games.js`).
- **Two-player is picked in two steps**: Solo / With a friend, then Pass & play / Versus. Quick Tap and Dots pass the phone between two whole runs; every other game alternates inside one run (`SHARED2` in `games/registry.js`, `PASS_TURNS` in `config/games.js`, `games/_shared/two.js`). The player row sits on the mode stage and offers Versus if any mode has it (`versusAny`).
- **One pick-sheet layout for every game** — mode row, then length row; no per-game special cases (L9).
- **Seconds live on the pick sheet as a subtitle, never on the result screen**; lengths are named (Sprint, Dash, Marathon, Set, Streak).
- **Unlock toasts are green**: `Unlock game: X` for a game, `Unlock: X` for a mode or a length (`ui/toast.js`).
- **Where lower is better, the board and the result screen say so.**
- **A new game is one entry in `GAMES`** (`config/games.js`), an engine in `games/`, formatters in `ui/format.js` and a quality predicate in `progress/rules.js`, all under one id.
- **TWO progression systems, sharing nothing but a screen**: the unlock chain (`config/unlocks.js`, L6) is sequential and gates play; the key (`progress/key.js`, `config/key-bars.js`) is concurrent and gates nothing. Never describe one in terms of the other.
- **A clearance bar is a one-off threshold**, cleared once by a solo run, for good; two-player, practice and challenge runs never count (L10). Say clearance bars, never "minimum bars".
- **The key's contributor list AND its count come from the config** — `GAMES` × modes × `GC(g,d).lens`, thirty since build 28, never a literal; the gate fails on one wherever the count is printed, and on a combination without a bar or a bar without a combination.
- **A running total says what it is measuring** — unit, meaning, and where there is a budget, what is spent and what the budget is (v17 B.1, v18 B.13). It is said ONCE on a screen, not twice: whichever of the HUD line or the big number carries it, the other does not repeat it (v18 B.3d).
- **A round's own figure holds before it drains into the total** — `CFG.hold` in `config/games.js`, one number, Timing and Reaction on the same beat (v18 B.3c / B.7).
- **A test that runs mid-run must only ever become MORE true** — `live:1` in `config/unlocks.js` for an unlock or an achievement, `LEN_LIVE` for a length rung; an average or a total is a whole-run claim and never carries it (v18 B.8).
- **An earn is written the moment it fires, lengths included** — `bankLen` in `progress.js` writes `'game:mode:length'` to `store.unlock` and `lenLock` reads it back, so an announcement can never disagree with the store (v18 B.8).
- **A scoring unit that changes retires the records in the old one** — bump `RUN_SCHEMA` and add a ladder step in `core/store.js`; a stale record on a lower-is-better board never leaves the top ten (v18 B.2 / B.4).
- **The 600-run cap never drops a row that is in a top ten** — `trimRuns` in `core/store.js` is the one trim, at load and on every submit; it keeps each combination's top ten and then the newest of the rest (v18 B.14).
- **A verdict tier goes on the NUMBER, everywhere it appears** — the result's score, that run's row on the board, and each round's own figure as it lands (`ROUND_AT` in `config/verdicts.js`, `games/_shared/tier.js`). One sound set for every game (`VERDICT_FX`, keyed by tier alone). Solo only (L4), presentation only (L10) (v18 B.10 / B.11).
- **An unlock toast on the RESULT screen goes where it points** — the pick sheet at that mode or length; mid-run a toast stays a toast (`ui/toast.js`, v18 B.12).
- **A `live:1` test must only ever become more true**; totals, averages and `misses === 0` are whole-run claims and never carry it; every "N hits, no misses" rung is N IN A ROW (`row` on the timed record).
- **THREE keys are difficulty tiers over the same combinations, and the TIER IS AN ARGUMENT** (v18 B.27, build 32): every row of `config/key-bars.js` carries `bar` (key 1), `pro` and `author`; `progress/key.js` reads `barOf(c, tier)`, banks `'g:d:s|pro'` / `'g:d:s|author'` beside the bare key, and a tier whose column has any `null` is a SHELL — derived from the data, never a flag in `config/keys.js` — that counts, shows and clears nothing. A.2 still forbids deriving a bar: Pro and Author start empty and Aiden fills them on the catalogue (#371, three columns). Tiers 2 and 3 count nothing before chest 1 (A.1 / A.2).
- **The front of the app says the percentage alone — `67% complete` (v18 B.15, amending A.6.5); the keys screen keeps `19 of 30 · 74%`.** Stepping into Pro at chest 1 RE-BASES it (B.17): key 1 done is 30, Pro fills the other 70, Author the same step again — `frontPct()` in `progress/key.js`, `prefs.pro` the step, irreversible and warned (B.16). It never goes back to zero.
- **The Scores radar's rungs are the key's three tiers** (v18 B.24): one rung before chest 1, three after, a shell tier a dashed rung at no value (A.2), a score past the Author time a flame. `radarOf(g)` in `progress/key.js`; `AUTHOR_RECORDS` is retired — the `author` column is where his times live (A.5 now applies to it).
- **Three achievement sets are tied to the keys** (v18 B.25): `keyAch()` in `progress/key.js` generates 24 rows — one per game per key plus one per key — none `live:1`; `run/run.js` banks the key BEFORE it asks them; the Pro and Author sets are not shown before chest 1 (A.1).
- **Three chests in a column on game select** (v18 B.19 / B.20 / B.16): chest n needs key n whole; a ready chest ASKS ("Open the chest?") and the build-29 opening is extended, not replaced; an opened chest 1 or 2 offers the step into the next tier; chests 2 and 3 are hidden before chest 1 (A.1). Each game tile's outline fills with its key-1 progress in `KEYFILL` lilac (B.18), complete is a wash as well as a closed line.
- **The key screen draws the tier's own style** (v18 B.22): Lantern → Circuit → Thorn from `config/keys.js` (`style`, `tint`, `dim`, `ground`), every segment a `<path pathLength="1">`, a lit segment in the tier's tint; the tracks are unchanged. The arrival plays the first time the screen is seen whichever way it is seen (B.21); a tap inside the ring never goes Back (B.23); a whole key plays its moment once per tier (B.20). Testing has a button per animation (B.26, S5).
- **A key unlock interrupts the result screen**: `show('s-key', {advance, auto})` under `lock()` from `ui/actions.js`, answered by `key:done`; neither screen imports the other (A4).
- **Music is an arrangement, not seven numbers**: a track in `config/audio.js` is `voices` (wave, step pattern, role) plus `beats`, `per`, `form`, `vol`, and `audio.js` plays what the data says. Three NAMED options per game (`TRACK_OPTS`, `TRACK_PICK`, `prefs.track`), no two sharing a wave set and a pattern set; Quick Tap · Held is the build-26 loop note for note; no percussion, no `noise` role; a level is measured by `_smoke/loudness.mjs`, never judged by ear.
- **Music is arranged to the length of the run**: a known length plays `form` once across the run, an open-ended run plays the long form; the chord progression is never stretched or skipped; every open-ended form holds 180s before an exact repeat.
- **The front of the app has music (`menu`; `key:roots` / `key:frost` / `key:thorn`, by theme name) and the finish ramp is MUSIC ONLY**: a clocked run's bars shrink to end on the clock, a round run exposes `R.fin`, `audio.js` is its only reader, Sequence gets no ramp; the end cadence transposes to the track's key (`endTune`).
- **Flow state is one number with two consumers**: the engine's `tps()` → `R.flow` / `--flow` in `run/run.js` → the hum in `audio.js`. It is a SWITCH at `FLOW_AT` (2.7 taps a second) with `FLOW_RISE` / `FLOW_FALL` fading it, never a swell (v18 B.9). Solo Quick Tap and Dots only, light blue (L4), presentation only (L10). Sequence ducks its bed to 40% while a key rings.
- **The versus stems are presentation**: `STEMS` is one pair per game, gain following `R.vsP[p]`; nothing in a two-player run advances anything (L10).
- **An unlock has its own sound (`Snd.unlockFx()`); the achievement sound (`Snd.click()`) is not to be changed.** The gate asserts both.
- **A verdict is a tier, and the tier is solo only**: four tiers, thresholds and lines in `config/verdicts.js`, `verdict()` returns `{tier, col, line}`; light blue and red ARE P2 and P1 (L4), so colour and sound stay off two-player and practice results; the sound plays when the result is read, not at the finish.
- **The game-select grid is a snake placed from `Object.keys(GAMES)`** by `grid-row` / `grid-column`; its lines are measured by `offsetLeft` / `offsetTop`, never a bounding rect; the chest is the last stop and nothing about pro or author shows there before it is opened (A.1).
- **A first-play intro is ONE line** (`INTRO` in `config/copy.js`); a player's first run of each GAME ends on a "Ready?" tap.
- **One mechanism pins a goal**: `goWhere` → `pendingAim` → `#goal`; an aim the player asked for outranks `goalFor`'s automatic offer.

## Structure — the module map; full text in `docs/RULES-HISTORY.md` → Structure

**The shape is `ARCHITECTURE.md`** — the layout, the engine contract, S1–S7 and A1–A8. Build 18 completed the refactor;
deviations are listed per stage in `../FEATURES.md`.

`boot.js` is the entry; everything else registers itself on import. The module graph is a DAG: `config → core.js →
games/registry → core/store → core/state → ui/theme → audio → progress → ui/router → ui/actions → run/run →
ui/screens/* → boot`. **Screens and the run never import each other (A4, asserted):** the run emits `run:record` /
`run:pass` / `run:finish` / `run:abort` / `lock:ask` through `core/events.js`; screens navigate with `show(id, opts)` and
never import another screen. Engines import only `games/_shared/`, `core/`, `config/` and `core.js` (A3).

**Screens** — one file each under `ui/screens/`: `menu`, `pick`, `board`, `progress` (Unlocks and Achievements tabs),
`key`, `customise`, `about`, `testing`, `pass`, `result`, `lockbox`. A screen calls `register(id, {onShow, onBack})` on
`ui/router.js` and `define({act})` on `ui/actions.js`; `data-back` in the markup is the stack.

**The store (A5, S3)** — one localStorage key `ne`, `{v, prefs, runs, ach, unlock, intro, seen, bars}` in
`core/store.js`, `v` 3 since build 32 (two ladder steps: `up2` build 31, `up3` build 32). A new `prefs` field goes into
`cleanPrefs` in the commit that adds it; Fresh game clears progress and keeps preferences; `runs` is capped at 600; dev
switches exist only while `BUILD_FLAGS.dev` is true (S5). `bars` holds all three tiers (`'g:d:s'`, `'g:d:s|pro'`, `'g:d:s|author'`).

**The engine contract (A3)** — `run/run.js` owns the run; `games/<id>/index.js` exports `mount` `start` `input` `tick`
`stop` `result` (plus `demo`, `precount`) and talks back only through `ctx.emit`. Shared: `games/_shared/` — `hud.js`,
`timed.js`, `round.js`, `versus.js`, `shapes.js`, `two.js`. Estimate is NOT built on `roundEngine`.

**`config/` is data only (A2)** — every number, name and string a batch might change; predicates in `progress/rules.js`,
formatters in `ui/format.js`, same ids, resolved by `GV()`. A feedback line that changes a number touches `config/` only.

**Every control carries `data-act`.** `ACTIONS[act](el, ev)` in `ui/actions.js` does the work and returns `'pick'` or
`'click'` for the sound; a new button is one attribute plus one `define({...})` entry. Cross-module bindings go through
setters, because ESM imports are read-only.

**An earn is written the moment it fires, never when a screen gets round to it.** `run/run.js` banks `checkUnlocks`,
`checkAch` and `checkKey` before `run:finish`; `liveCheck` banks `live:1` rows mid-run; `abort()` runs one last
`liveCheck`. The gate asserts it, statically and by quitting a run mid-flight.

## Locked decisions — current values; amendment history in `docs/RULES-HISTORY.md`

**A change that touches a locked item is built only when the FEEDBACK line quotes its ID (e.g. `L2:`).
Otherwise skip it and list it under "Skipped — locked" in FEATURES.md. Anything not in the FEEDBACK
file that changes a rule, threshold, name, unlock or screen layout is not built — list it under
"Proposed" in FEATURES.md instead.**

| ID | Decision |
|---|---|
| L1 | The title sequence plays for every new profile and after Fresh game; never removed or shortened. "games of pure skill" first, NO EXCUSES second, "the only thing to blame is yourself" third; NO EXCUSES is one node that never moves or re-renders into the menu; "Tap to begin" is the fourth beat at 4.6s, fading over 1.2s, 30vh from the bottom. |
| L2 | Quick Tap lengths are Sprint / Dash / Marathon. Nothing added. |
| L3 | Solo shows nothing about friends. With a friend → Pass & play / Versus, every game that has them. |
| L4 | Player 1 red `#E0453B`, Player 2 light blue `#6EC6FF`, everywhere. |
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget** — Estimate 100%, Stopwatch **5s (7.5s past round 10)**, Hidden **700ms**, Flash 500ms over 150 (an early tap spends 400ms flat and the attempt), **Go / No-go 3000ms over THE 180ms GATE (v19 C.5 / C.6, build 32) — every correct tap spends max(0, reaction − 180), a wrong tap 200ms — scored in TARGETS answered**, Count 5 miscounts, Find 10s; score = rounds completed, "Highest round wins!", no wrong-tap run-ender. **Set = a fixed number of rounds, scored by the line on the sheet** — Stopwatch and Hidden are **totals**, Hidden in **milliseconds**; a Flash attempt over **1000ms** scores 1000ms and counts; Go / No-go's Set is **5 rounds of 3 correct taps, the mean of every target's max(0, ms − 180)** and adds 150ms per wrong tap, **with no run-ender at all**; **a Go / No-go round deals each of its 3 targets behind 1–5 decoys drawn uniformly (C.1 / C.2), on five shapes (C.3), each shape dwelling 980 ± 180ms on a Set and 1330 ± 180 on a Streak (C.4)**; the currencies are never harmonised. Counts and lines come from `SET_COPY` in `config/games.js`. |
| L6 | The unlock chain and thresholds are the §1 table in the latest FEEDBACK file that names L6. One table — `UNLOCKS` + `LEN_RULES` + **`LEN_LIVE`** in `config/unlocks.js`, predicates in `progress/rules.js`, keyed `'game:mode'` — feeds lock boxes, goal lines, the Next card and the Unlocks tab; every requirement names its game; `lenNeed(g,d,s)` in `progress.js` builds every requirement sentence; **a length rung announces mid-run only where `LEN_LIVE` flags it, and an announced length is banked by `bankLen` so the toast and the store can never disagree (v18 B.8)**. Sequence is 3 and 7 keys, opened by one Cut round within 3.5%; Quick Tap · Four opens from any Two run; Cut's Streak asks for more than 10% off; "N hits, no misses" is N in a row; five rows ask the player to fail on purpose, and tapping a locked row to read its requirement is part of the rule; a length unlock announces. |
| L7 | A game tile is white until that game has been played once. |
| L8 | Anything newly unlocked gets the green first-seen highlight once, then is marked seen. |
| L9 | The length row is labelled "Mode" in every game. One pick-sheet layout, no per-game special cases. |
| L10 | No two-player run of any kind, and no demo, ghost or scripted run, goes on a board or advances a key, a clearance bar, an unlock or an achievement — enforced at the finish (`two` in `run/run.js`) and mid-run (`liveCheck` turns away every `sel.vs`; `R.demo` the flag, `run.demo` the belt). Aiden's reason: *"I don't want anyone to have to rely on someone else in order to beat this game."* |

**Code decisions A1–A8 in `ARCHITECTURE.md` — same quote-the-ID rule.** A feedback line changes one
only when it names the ID (e.g. `A6:`); otherwise it goes under "Proposed" in FEATURES.md.

## The gate — five lines; the full list is `_smoke/GATE.md`

- **`npm test`** spawns its own static server and drives headless Chromium at 390×844 with zero uncaught errors; ~4 minutes; `CHROME_PATH` overrides the Windows default Chrome.
- **Static checks first:** A6 one build number (`config/build.js` = `index.html` ×3 = `version.json`, the visible two as `v0.N`), A2 `config/` has no imports and no functions, A3 engines import only `_shared` / `core` / `config`, A4 no screen imports a screen or an engine and the run imports no screen — then the L-asserts and every per-build assertion.
- **A failing assertion blocks the push.** Run it before every push.
- **`npm run review`** drives `../_review/scripts/` (capture → `build-catalogue.mjs`); Cowork publishes the page. After a template change, headless-load `../_review/catalogue.html` once and read the page errors.
- **A build that extends the gate appends its paragraph to `_smoke/GATE.md`** — what each assertion stands for, by feedback line.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
