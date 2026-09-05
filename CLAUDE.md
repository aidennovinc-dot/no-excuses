# No Excuses — repo rules

Web prototype of a phone game: small games of pure skill, no luck, no timers you can't see.
Served from GitHub Pages (`aidennovinc-dot/no-excuses`, `main`, root) at one fixed URL so the
home-screen icon always gets the latest build. Native iOS comes later, once the feel is proven.

**One session per feedback batch.** Implement `../FEEDBACK-vNN.md`, update `../FEATURES.md` with
done / not done / why, bump the build, smoke test, commit `build N — batch NN`, push. Don't explain.

## Bump the build in four places, together

1. `index.html` — the hint line under the title: `build N · <date> · github pages`
2. `index.html` — `<div id="build">build N</div>`
3. `index.html` — `const BUILD="N";` in the update-check script at the bottom
4. `version.json` — `{"build": "N", ...}`

A mismatch between 3 and 4 makes every phone show the green "new build" bar forever.

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
- A new game is one entry in `GAMES` (`games/registry.js`) plus an engine in `games/`.

## Structure

`boot.js` is the entry (`<script type="module">`), and holds every top-level statement in its
original order. Modules hold declarations only — that is what keeps evaluation order irrelevant.

`index.html` shell + CSS · `core.js` helpers · `games/registry.js` the GAMES table ·
`progress.js` unlocks, achievements, scores, storage · `audio.js` sound and music ·
`menu.js` prefs, navigation, pick sheet, board, result · `engine-core.js` shared run state ·
`games/*.js` one per game (plus `round.js`, `shapes.js` shared) · `app.js` the run itself.

Two bindings are written across modules and go through setters, because ESM imports are read-only:
`setPendingAim` (progress.js) and `setLastRun` (menu.js).

## The gate

Headless Chromium at 390×844: intro → menu → every pick sheet opens → one full Quick Tap run →
result screen, with **zero uncaught errors**. Run it before every push. No bundler, no build step —
GitHub Pages serves the modules directly, so every import path stays relative (`./games/dots.js`).
