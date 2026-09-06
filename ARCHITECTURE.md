# No Excuses — architecture

The shape the code is moving to, and the rules that keep it that way. `CLAUDE.md` holds the batch
loop and the locked design decisions; this file holds the *code* decisions. Written 2026-09-05 from
the build 13 review (`07_Knowledge/research/2026-09-05_no-excuses-code-review-and-ios-pathway.md`).

**The one-line goal:** a change to one game, one screen, one number or one line of copy touches one
file, and the gate proves nothing else moved.

## Why the build 12 split isn't enough

Build 12 cut `index.html` into files, but every file still reaches into every other one: `boot.js`
imports 76 names, one 60-line click handler dispatches every button by id, `prefs`/`sel`/`G` are
written from six files, and eleven "phantom imports" (names imported then shadowed by a local) hold
the module graph in a cycle. Evaluation order matters even though `CLAUDE.md` says it doesn't. So a
feedback line like "Dots Lead's ring should push further" means reading `menu.js`, `app.js`,
`progress.js` and `games/dots.js` to be sure.

## Target layout

```
site/
  index.html          shell: markup + one <link> to styles/app.css + one <script type=module src=boot.js>
  boot.js             creates the app: store → audio → router → menu. Nothing else at top level
  styles/app.css      all CSS, in sections that match the folders below
  config/             DATA ONLY. No functions. Every number, name and string a feedback batch might change
    build.js          export const BUILD = 14        ← the one place; a script writes version.json from it
    games.js          GAMES: name, modes, mode copy, lengths, length names/subtitles, units, versus flag, "lower is better"
    unlocks.js        UNLOCKS + LEN_RULES: key, need copy, where — the L6 table
    achievements.js   ACH: id, game, tier, name, how, at, unlocks
    copy.js           every user-facing string: toasts, verdicts, intro lines, tier blurbs, lock-box text
    theme.js          P1/P2 colours (L4), backgrounds, cosmetic items, wheel rules
  core/
    store.js          versioned storage: one schema, one `ne.v`, migrations ladder, shape-checked load, capped runs
    events.js         emit/on. Screens and engines talk through events, never by importing each other
    dom.js            $, $$, esc(), html`` (escapes every interpolation by default; raw() to opt out)
    timers.js         later()/clearT() keyed by runId — the good idea from app.js, shared by everyone
    audio.js          Snd, Music, unlock/resume handling, per-game music modules
    platform.js       share, haptics, deep link, update check, storage adapter — web now, Capacitor later, same interface
  progress/
    rules.js          the predicates, keyed by id: UNLOCK_TEST[key], LEN_TEST[game][i], ACH_TEST[id], ACH_PROGRESS[id]
    progress.js       unlocked(), got(), checkUnlocks(run), checkAch(run), nextGoal() — pure functions over the store
    scores.js         runs, submit, board queries, in-memory cache invalidated on submit
  ui/
    router.js         show(), back(), the screen stack — the only file that knows screen ids
    actions.js        data-act="…" → handler. Replaces the click dispatcher. A handler returns 'pick' | 'click' for the sound
    screens/          one file per screen, each owning its own DOM: title, menu, pick, board, achievements,
                      customise, about, pass, result, lockbox, toast
  run/
    run.js            start / tick / finish / abort. Owns run state. Calls the engine through the contract below
  games/
    registry.js       imports every engine, exports ENGINES by id. A new game = one folder + one line here + config rows
    _shared/          round.js (Set/Streak loop), shapes.js, hud.js (countdown, rate bar, goal line, PB marker)
    quick-tap/index.js  dots/  estimate/  sequence/  timing/  reaction/  spot/
  _smoke/             the gate (see below) + review/catalogue.mjs + review/progression.mjs
```

## The engine contract

Every game exports one object. `run.js` is the only caller. Engines never touch `prefs`, `sel`,
the store, or another engine.

```js
export default {
  id: 'dots',
  mount(ctx),          // build DOM under ctx.root once per run. ctx = { root, cfg, mode, len, players, emit, timers, audio, rand }
  start(ctx),          // the 3-2-1 has finished
  input(ctx, ev),      // a tap. ev = { x, y, t, player, target }
  tick(ctx, now),      // optional per-frame
  stop(ctx),           // abort or time up — clear timers, stop sounds
  result(ctx),         // → run record, see RUN_SCHEMA
};
```

**Run record** (`RUN_SCHEMA = 2`, in `config/build.js`): `{ v, g, d, s, hits, misses, x, y, rounds, players, t, name, chal }`.
The engine fills `hits/misses/x/y/rounds`; `run.js` fills the rest. A record from a challenge link
carries `chal:1` and is never submitted to a board or tested for achievements.

## Config vs code — the rule

Names, thresholds, copy, colours, lengths → `config/`. Predicates and formatters → `progress/rules.js`
or the engine, keyed by the same id. A feedback line that changes a number touches `config/` only;
if it also needs `rules.js`, the id links them. Nothing in `config/` imports anything.

## Storage

One key `ne` holding `{ v, prefs, runs, ach, unlock, seen, intro }` — not seven keys. `store.load()`
checks `v`, runs migrations in order, shape-checks every field (arrays are arrays, colours match
`#RRGGBB`, scale is a known key) and falls back to defaults per field, never for the whole store.
Tampered or corrupt storage can cost a player their progress; it can never crash boot. `runs` is
capped at 600 (oldest first out). Under Capacitor the same interface writes through
`@capacitor/preferences` as well as localStorage, and `platform.export()` hands the player a backup.

## Security rules — build 14 onward

| # | Rule | Why |
|---|---|---|
| S1 | **No `innerHTML` with anything that isn't from `config/`.** Player name, URL params, run data go through `esc()` or `textContent`. The `html\`\`` helper escapes by default. | build 13 reflects `?score=` from a share link into the page unescaped; `prefs.name` is inserted raw in two places |
| S2 | **One `parseChallenge(url)`** validates `g` against GAMES, `d` against modes, `s` against the mode's lengths (integers only), `score` as a number. Anything else → no challenge. A challenge opens the sheet once, tags the run `chal:1`, never opens a locked mode for scoring. | `s:+q.get('s')` currently accepts NaN, 1e308, −5; a challenge leaves a locked mode open for the whole session and submits to the board |
| S3 | **Storage never crashes boot** — see Storage. | `ne.runs = {}` throws in `forEach`; `prefs.scale = "foo"` throws in sequence.js |
| S4 | **No `eval`, `Function`, remote scripts, or runtime CDN.** Fonts ship in the bundle. `index.html` carries `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'">`. | Capacitor runs the page beside a native bridge; a script injection there is worse than on the web. Google Fonts also fails the gate offline |
| S5 | **Dev switches** (Everything open, Supporter, Fresh game) exist only when `BUILD_FLAGS.dev` is true; the release build strips them. | a supporter flag in localStorage is free no-ads the day ads exist |
| S6 | **Money and ads never trust the client.** Supporter status comes from the store's entitlement (RevenueCat), ads from the native plugin. No shared leaderboard without a server that validates runs — not planned. | nothing leaves the phone today, so the stakes are the player's own scoreboard; that changes with the first purchase |
| S7 | The update poll (`version.json`) runs only on `https:` and never inside the native shell. | in Capacitor it compares the bundle to itself, or pins the green bar on forever |

## Code decisions — locked like the design ones

Change one only when the FEEDBACK line quotes its ID.

| ID | Decision |
|---|---|
| A1 | ES modules, no bundler, relative imports — GitHub Pages serves the tree as-is and Capacitor copies it as-is. |
| A2 | `config/` is data only. A function in `config/` is a bug. |
| A3 | Engines implement the contract above and import only from `games/_shared/` and `core/`. |
| A4 | Screens and engines communicate by events (`core/events.js`), never by importing each other. |
| A5 | One storage key, one schema version, migrations forward only. |
| A6 | The build number lives in `config/build.js`; `npm run bump` writes it everywhere else. Hand-editing four places is over. |
| A7 | The gate runs before every push and covers every engine, every screen, a tampered-storage fixture and the security rules S1–S3 as assertions. |
| A8 | Native shell = Capacitor 8. The web tree is the app; `platform.js` is the only file that knows which shell it's in. |

## The gate (A7) — what "passes" means

Headless Chromium at 390×844, `npm test` spawns its own server. Zero uncaught errors across: title →
menu → every pick sheet → one Set run and one Streak run per game → result → board → achievements →
customise; a pass & play and a versus run of Quick Tap; boot on three storage fixtures (empty, build
13 layout, deliberately corrupt); a challenge URL with a hostile `score`; the L-asserts from
`CLAUDE.md`. Then `_smoke/review/*.mjs` regenerate the screen catalogue and the progression map into
`../_review/` for Cowork to publish.

## What a feedback line costs after the refactor

| Feedback says | Files touched |
|---|---|
| "Dots Marathon needs 40 hits, not 35" | `config/unlocks.js` |
| "Rename Sprint to Dash everywhere" | `config/games.js` |
| "Lead ring should push further along the travel" | `games/dots/index.js` |
| "Result screen: back button top-left" | `ui/screens/result.js` (+ one CSS section) |
| "New game: Balance" | `games/balance/index.js`, one line in `registry.js`, rows in `config/games.js` `unlocks.js` `achievements.js` |
| "The 3-2-1 sound is wrong" | `core/audio.js` |
