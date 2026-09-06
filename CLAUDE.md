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

**Screens — since build 18.** One file per screen under `ui/screens/`, each owning its DOM: `title`,
`menu`, `pick`, `board`, `achievements`, `customise`, `about`, `pass`, `result`, `lockbox`; `index.js`
imports them all. A screen calls `register(id, { onShow(opts), onBack() })` on `ui/router.js` and
`define({ act: handler })` on `ui/actions.js`. `show(id, opts)` puts the screen on and hands it opts —
`show('s-pick', {g, d, s})` opens a game's sheet at its mode or length row, `show('s-ach', {ach})`
scrolls to a row, `show('s-custom', {unlocks})` flashes an item. `back()` asks the screen first (`onBack`
returning true means it moved within itself — the pick sheet's stages), then follows the screen's
`data-back` in the markup: the parent map is the stack, fixed so Back never lands on the game layer.
Every change emits `screen:change {id}` (`'game'` for the game layer) — the atmosphere fades and pauses
its frame loop, the theme re-applies the game's colours, the wheel and the lock box close.

**The store (A5, S3) — since build 18.** One localStorage key, `ne`, holding `{ v, prefs, runs, ach,
unlock, intro, seen }` (`core/store.js`). On load the migration ladder runs forward (v0 = the seven
build-13 keys, folded in once with the v8–v11 reshapes and then removed), then every field is
shape-checked against its default and falls back on its own — a bad colour costs the colour, never the
boot. `runs` is capped at 600. `save()` writes the whole record; `reset()` is Fresh game. `unlocked()`,
`got()`, `Scores.runs()` in `progress.js` return the live record's own maps and array. The store reads
`allOpen` / `supporter` only while `BUILD_FLAGS.dev` is true (S5), and the About screen removes the
testing row (`[data-dev]`) when it is false. `RUN_SCHEMA` is 2; the legacy migration stamps every
surviving run with it.

**The engine contract (A3) — since build 17.** `run/run.js` owns start / tick / finish / abort and the
run state; `games/registry.js` exports `ENGINES` by id (and `VERSUS`, the one-phone-two-ends engine
Quick Tap and Dots share). Every engine is `games/<id>/index.js` exporting one object: `mount(ctx)`,
`start(ctx)`, `input(ctx, ev)`, optional `tick(ctx, now)`, `stop(ctx)`, `result(ctx)`, plus the optional
`demo(ctx, ghost, done)` (the first-play ghost finger) and `precount(ctx)` (what plays under the 3-2-1).
`ctx = { root, game, cfg, mode, len, players, practice, scale, emit, timers, audio, rand }`; the engine
talks back only through `ctx.emit('finish', record)` and `ctx.emit('live', partial)`. Every tap reaches the
engine through `run.input(ev)` as `{ type: 'down' | 'move' | 'up' | 'act', x, y, el, target, player, raw, t }`
— `boot.js` binds the shell's pointer and key events to it and never names an engine. `core/timers.js`
gives each run its own `later` / `frame` / `clearT`, keyed to the run; a callback from a dead run never
fires. `games/_shared/`: `hud.js` (countdown, rate bar, score and clock slots, shake, flash, ghost, the
add-up animation), `timed.js` (the Quick Tap / Dots base: hits, misses, lockout, rate), `round.js` (the
Timing / Reaction / Spot base), `versus.js`, `shapes.js`. The game markup stays static in `index.html`;
`mount` resets an engine's own nodes rather than building them.

**`config/` is data only (A2) — since build 16.** Every number, name and string a feedback batch might
change: `build.js` (BUILD, LABEL, RUN_SCHEMA, PUB_URL) · `games.js` (GAMES, the lengths, mode names,
CFG, the Estimate and Spot tuning) · `unlocks.js` (UNLOCKS + LEN_RULES — L6) · `achievements.js` (ACH,
AUTHOR_RECORDS) · `copy.js` (every toast, HUD, verdict, intro and screen string, grouped by where it
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
DOM · `audio.js` sound and music (the run hands `Music.start` its state object; audio never imports the
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

## Locked decisions

**A change that touches a locked item is built only when the FEEDBACK line quotes its ID (e.g. `L2:`).
Otherwise skip it and list it under "Skipped — locked" in FEATURES.md. Anything not in the FEEDBACK
file that changes a rule, threshold, name, unlock or screen layout is not built — list it under
"Proposed" in FEATURES.md instead.**

| ID | Decision |
|---|---|
| L1 | The title sequence (three lines → NO EXCUSES → tap to begin) plays for every new profile and after Fresh game. Never removed or shortened. |
| L2 | Quick Tap lengths are Sprint / Dash / Marathon. Nothing added. |
| L3 | Solo shows nothing about friends. With a friend → Pass & play / Versus, every game that has them. |
| L4 | Player 1 red `#E0453B`, Player 2 light blue `#6EC6FF`, everywhere. |
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget** (Estimate 100%, Stopwatch 2.0s, Hidden 100px, Flash 500ms over 200, Count 5 miscounts, Find 10s); score = rounds completed. Set = fixed rounds, score = the total or average stated on the sheet. |
| L6 | The unlock chain and thresholds are the §4 table in the latest FEEDBACK file that names L6. Lock boxes, goal lines and the Next-achievement card all read from one table (`UNLOCKS` + `LEN_RULES` — in `config/unlocks.js` since build 16, with the predicates beside it in `progress/rules.js`). |
| L7 | A game tile is white until that game has been played once. |
| L8 | Anything newly unlocked gets the green first-seen highlight once, then is marked seen. |
| L9 | The length row is labelled "Mode" in every game. One pick-sheet layout, no per-game special cases. |
| L10 | Two-player runs never go on a board. |

Locked as of build 13 (FEEDBACK-v13 §L, 2026-09-05).

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
also asserts the testable locks on a fresh profile — title sequence before the menu (L1), Quick Tap's
length row is exactly Sprint / Dash / Marathon (L2), Solo shows no Pass & play / Versus (L3), the
Quick Tap tile is white before any run (L7), the length row is labelled Mode (L9). **A failing
assertion blocks the push.** Run it before every push; ~4 minutes. `CHROME_PATH` overrides the
Windows default Chrome. **`npm run review`** regenerates `../_review/catalogue.html` and
`progression.html` for Cowork to publish — it never publishes.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
