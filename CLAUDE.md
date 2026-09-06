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

**Where the code is going: `ARCHITECTURE.md`** — the target layout, the engine contract, the security
rules S1–S7 and the code decisions A1–A8. The refactor runs one stage per build (14–18); the stage
plan is `../2026-09-05_personal_handover_no-excuses-refactor.md`. Until a stage moves a file, the
build-12 layout below still holds.

`boot.js` is the entry (`<script type="module">`) and holds the top-level statements that start the
app. Since build 15 the module graph is a DAG — `core → core/store → core/state → audio → progress
→ menu → app → ui/actions → boot` — so evaluation order follows the imports and no module reaches
back up the chain. The one cycle left is `app.js ↔ games/*` (engines call `finish`, `tapAt`,
`liveCheck`); Stage 3's run contract removes it.

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

`index.html` shell + CSS · `core.js` helpers (`$`, `esc`, `T`, `pWho`, `seqStep`) · `core/store.js`
load/save, `prefs` and its migrations · `core/state.js` `sel`, `VS`, `F` · `core/platform.js` the
challenge link · `games/registry.js` `GC`/`GV` and the length names over the config table ·
`progress.js` unlocks, achievements, scores — pure functions over the store, no DOM · `audio.js` sound
and music · `menu.js` customise, navigation, pick sheet, board, result, lock box, achievements screen ·
`ui/toast.js` · `ui/actions.js` every button's handler, keyed by `data-act` · `engine-core.js` shared
run state · `games/*.js` one per game (plus `round.js`, `shapes.js`) · `app.js` the run itself, plus
`liveCheck` and `goWhere` · `scripts/bump.mjs` the build bump.

**Every button carries `data-act`.** `ACTIONS[act](btn, ev)` in `ui/actions.js` does the work and
returns `'pick'` or `'click'` for the sound; a button with no act plays its old sound and does nothing.
A new button = one attribute in the markup + one entry in `ACTIONS`.

Bindings written across modules go through setters, because ESM imports are read-only:
`setPendingAim` / `setPendingGoal` (progress.js), `setLastRun` / `setMenuWasFirst` (menu.js), `setCur`.

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
390×844 with **zero uncaught errors**. First two static checks (build 16): the build number in
`config/build.js` is the one in `index.html` ×3 and `version.json` (A6), and `config/` has no imports
and no functions (A2). Then: intro → menu → every pick sheet → one Set run and one Streak
run per game, driven to the result the way that engine is played → a pass & play Quick Tap → boot on
three storage fixtures (empty, build-13 layout with runs intact, corrupt) → challenge links with a
hostile `score`, a bad `s`, and a locked mode the link opened (that run never reaches a board). It
also asserts the testable locks on a fresh profile — title sequence before the menu (L1), Quick Tap's
length row is exactly Sprint / Dash / Marathon (L2), Solo shows no Pass & play / Versus (L3), the
Quick Tap tile is white before any run (L7), the length row is labelled Mode (L9). **A failing
assertion blocks the push.** Run it before every push; ~4 minutes. `CHROME_PATH` overrides the
Windows default Chrome. **`npm run review`** regenerates `../_review/catalogue.html` and
`progression.html` for Cowork to publish — it never publishes.

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots.js`).
