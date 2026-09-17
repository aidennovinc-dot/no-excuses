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

## Shape difficulty — the standard (A9, build 50)

**A round's difficulty is its shape's tier plus its setting's tier, and every shape-dealing game keeps it level across runs.**
Aiden, on the build 46 board (FEEDBACK-v26 §B2): *"Figure out a standard and let's stick with it."* This is that standard; a
new game that deals shapes follows it, and changes to it quote A9.

| Part | Rule | Where |
|---|---|---|
| One list | Every shape any game deals is in `SHAPES`, once, tagged `easy`, `medium` or `hard` — whatever game deals it. Its `word` and its `sym` flag live there too | `config/shapes.js` |
| The tiers | **easy** — convex, one outline, nothing to find (circle, square, triangle). **medium** — one thing to read: an elongation, a hole, points, a notch or an unround curve (diamond, bar, plus, ring, star, crescent, heart, cat). **hard** — irregular, dealt differently each time, or an outline that folds back on itself (spiral, blob, tetris, stairs). Weights 1 / 2 / 3 | `SHAPES`, `TIER` |
| One drawing | Each shape is drawn once, in `games/_shared/shapes.js`. Recognition games (Go / No-go, Count, Find, every rule bar) draw its fixed version as an SVG; Estimate deals varied instances. No shape is drawn in CSS | `Shapes.svg()`, `shapeI()` |
| Bands | Each game has a row in `DEALS`, keyed `game:mode`: round bands, each with a `mix` (how many of each tier it deals, summing to the band's rounds) and a `load`. A Streak past the last band keeps dealing the last band | `DEALS` |
| The deck | A band's mix is shuffled into a deck per run, so every run of a Set deals exactly that mix. Only the order and the particular shapes change. A shape is not dealt again until its tier has run out, and never twice running | `games/_shared/deal.js` |
| The pairing | Each game names one **setting** — Grow the target's size, Cut the share asked, Go / No-go time on screen, Count the target count, Find the crowd — with an easy, medium and hard tier. A round's setting tier is `load − shape tier`, kept inside 1–3: **a harder shape gets an easier setting, and the reverse**. Where the clamp bites, the Round formats card says so | `DEALS[key].tiers`, `setTier()` |
| Pass & play | A deal is cached by turn number, so both players' turn N is the same shape and setting | `makeDealer().at(k)` |
| The board | The catalogue's Round formats cards read the bands, mixes, pairings and pools through the dealer's own helpers, so a card cannot show a deal the game does not make | `_review/scripts/catalogue.ref.mjs` |

**Adding a shape:** geometry in `games/_shared/shapes.js`, one row in `SHAPES`, then put it in a pool. **Adding a game:** a `DEALS`
row with a setting that has a real easy-to-hard direction, and an engine that asks `makeDealer(key).at(round)` for its shape.
The gate asserts every pool shape has a tier and a drawing, every mix sums to its band and has shapes of each tier it names,
and the deal is balanced over many runs.

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
| A9 | Every game that deals shapes deals them by the shape difficulty standard above — one tiered list, bands with a mix and a load, a harder shape paired with an easier setting (build 50, v26 §B2). |

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
