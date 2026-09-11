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
- **There are TWO progression systems and they share nothing but a screen** (v14 9.2, build 22). The **unlock chain**
  (`config/unlocks.js`, L6) is sequential and gates which games are playable. **The key** (`progress/key.js`,
  `config/key-bars.js`) is concurrent, gates nothing, and every unlocked game feeds it independently. Never describe
  one in terms of the other — that mistake is what sank mock-up option C.
- **A clearance bar is a one-off threshold, not a score to hold.** Beat it once in a solo run and that combination is
  cleared for good; re-clearing does nothing and plays nothing. Pass & play, versus, practice and challenge-link runs
  never contribute (9.4, consistent with L10). **Call them clearance bars, never "minimum bars"** (C.7) — eight of them
  are ceilings, so "minimum" is wrong for a quarter of them.
- **The key's contributor list is built from the config, never listed — AND SO IS ITS COUNT (v17 B.9, build 28).**
  `GAMES` × modes × `GC(g,d).lens` — a game with a `SET_COPY` row contributes Set and Streak per mode, a timed game
  contributes its lengths, Sequence its key counts. **Thirty since build 28**, and the number is never written down:
  B.9 dropped Sequence · 5 keys and found the old 31 spelled out in the gate, in the Unlocks screen's prose and in the
  review catalogue's mock-up. A new mode joins the key with one row in `config/key-bars.js` and no code change. The gate
  fails on a literal count in `progress/key.js`, `ui/screens/key.js`, `ui/screens/unlocks.js` or `ui/screens/menu.js`,
  and on any combination without a bar or any bar without a combination.
- **A RUNNING TOTAL SAYS WHAT IT IS MEASURING (v17 B.1, build 28).** Three modes carried three different definitions of
  "the total" and none of them said so on screen: Estimate · Cut's Set figure is an average while its own sheet line
  called it a difference; Timing · Stopwatch's Streak shows the seconds SPENT beside the seconds of targets ASKED, both
  climbing, both in seconds; Spot · Find's was the total minus a free half-second a find, with no floor, so it went
  negative and its Streak could not end. The arithmetic was right in two of the three and `hud.countUp` / `hud.addUp`
  were right in all of them — what was missing was the label. **A number that accumulates carries its own unit and its
  own meaning, and where a mode has a budget, the line says what is spent and what the budget is.**
- **A `live:1` TEST MUST ONLY EVER BECOME MORE TRUE (build 23 v15 2.5, enforced v17 B.6 at build 28).** The rule was
  already written down; nine achievements were not obeying it. `misses === 0` and `hits === 0` are claims about a WHOLE
  run and both go false on the next tap, so the flag banked them from a partial run that had not earned them. The same
  error in the chain is what made "7 hits, no misses" announce and then quietly un-announce. **Every "N hits, no misses"
  rung is N IN A ROW** — `row` on the timed record, a miss resets it — because that is the only reading a live test can
  make honestly halfway through a run.
- **There are THREE keys and they are difficulty TIERS over the same combinations** (v15 5.3 / A.1, build 26):
  key 1 the clearance bars, key 2 a pro tier, key 3 the author's times. No fourth dimension, no per-bar stacking.
  **Keys 2 and 3 are a shell** — `shell:true` in `config/keys.js` — because register #372 has not decided what is behind
  them and **A.2 forbids any build deriving a bar**. **Key 1 carries a PERCENTAGE since build 28 (§A.6)** — `keyPct()` in
  `progress/key.js`, `floor(100 × Σ credit / N)` over the same walk, cleared = 1, never played = 0, anything else capped
  at 0.9 of its share. It reads best scores, so it only ever goes up, and it is on the keys screen and the menu as
  `19 of 30 · 74%`. Keys 2 and 3 get their own from the same function the day #372 is answered, and show nothing before
  chest 1 (A.1) — they say so on screen rather than showing an invented target. The three glyphs get more elaborate as
  the tier gets harder, and that is the whole of "progressively more intense" — there is no second scale to keep in step
  with it.
- **A key unlock interrupts the result screen (v15 5.1, build 26)** and is not a toast any more. `ui/screens/result.js`
  fades, takes the input lock, and asks with `show('s-key', {advance, auto})`; `ui/screens/key.js` plays the segment with
  the game's whole root lit behind it and answers with a `key:done` event. Neither screen imports the other (A4). The
  lock is `lock()` in `ui/actions.js` and it has to be there: `pointer-events:none` would still leave the bare-ground
  tap reaching `onClick` and going Back.
- **Music is an ARRANGEMENT, not seven numbers (v16 §1, build 27).** A track in `config/audio.js` carries `voices` —
  each with its own wave, its own step pattern across one bar, and a role (`pad` `stab` `arp` `lead` `bass` `sub`
  `drone`) — plus `beats`, the bar length, and since build 30 `per` `form` `vol` on the track and `lv` `lpv` `lp` `q`
  `hold` `ct` on a voice. `audio.js` schedules exactly what the data says and knows nothing else about any track.
  **Three options per game, keyed `'<game>:<name>'` — the ids are NAMES since build 30 (v17 B.30)**, because B.32 puts
  them on a row in Customise and "Tide / Glass / Breath" is the only version of that row worth reading. `TRACK_OPTS` is
  one list per game, `TRACK_PICK` is what a fresh profile plays, and `prefs.track[game]` is what this player chose.
  **Quick Tap · Held is the build-26 loop note for note** — it is the quality bar Aiden named, so it is in the running
  rather than replaced, and the gate asserts it. Two options of one game may not share a wave set and a pattern set:
  "three options" that differ only in speed or pitch is the complaint batch 12 answered.
  **Still no percussion.** A drum is indistinguishable from a tap on a game where the tap is the whole interaction —
  rhythm comes from plucks, stabs, rests and odd bar lengths. There is no `noise` role and the gate says so.
  **A TRACK'S LEVEL IS MEASURED, NEVER JUDGED BY EAR (build 30).** No Claude Code session has an audio device, so
  `vol` on Waltz, on Quick Tap's two alternates and on the flow layer all came out of `_smoke/loudness.mjs` — an offline
  render, 220 Hz high-passed, loudest 4-second window, reported in dBFS. Re-run it when a gain changes; every track now
  sits inside about 3 dB of every other.
- **MUSIC IS ARRANGED TO THE LENGTH OF THE RUN (v17 B.29, build 30).** `form` is one written pass. A run whose length
  is known — a timed length, or a Set through `SET_SECS` — plays that pass **once across the run**, its level strings
  mapped onto it and a run-shaped envelope under it (55% at the start, full by two thirds through). An open-ended run —
  a Streak, Sequence — plays the long form instead: the same pass with the level strings walking **out of phase** with
  it, which is how three minutes of music comes out of sixteen bars of data. **The chord progression is never stretched
  or skipped** to fit — compressing a four-chord loop into five seconds plays chords 0, 1 and 3, which is a mangled
  progression, not a short arrangement. The gate holds every open-ended form to 180 seconds before an exact repeat.
- **The front of the app has music too, and the finish ramp is MUSIC ONLY.** One `menu` loop, played on every screen
  that is not the game layer; one loop per key tier — **`key:roots` / `key:frost` / `key:thorn` since build 30 (B.31),
  named for the theme, never by number** — asked for by `ui/screens/key.js` as the tier changes.
  **A run with a CLOCK lands its cadence on the finish (v17 B.28, build 30):** from the first bar line inside the last
  five seconds the bars shrink geometrically, scaled so the final bar ENDS exactly on the clock. A round-based run keeps
  build 27's `R.fin`, 0..1 — a Set over its final round, a Streak once its own budget is 80% spent — and **`audio.js` is
  its only reader; A.1 is explicit that no gameplay speeds up**. **Sequence gets no ramp: it has neither a clock nor a
  budget**, and it answers no `fin()` at all rather than a special case being written for it. A round-based engine
  overrides `fin()`; `roundEngine` gives the default and the two helpers, and **Estimate spells both out because it is
  the one engine not built on `roundEngine`**.
  **The end cadence is in the track's key (B.30)** — it was always in A whatever was playing. The track leaves its root
  and its quality in `endTune` and `Snd.end()` transposes to it, minor third where the first chord is minor, tonic
  chord under the last note; with no track it is the sound it always was.
- **FLOW STATE IS ONE NUMBER WITH TWO CONSUMERS (v17 B.27, build 30).** The engine answers `tps()` — its own taps a
  second over the last 1.5s, deliberately not the rate bar's reading, which has two modes (v14 6.7) — `run/run.js`
  smooths it (rise 0.8s, fall 1.6s) into `R.flow` and `--flow`, and audio.js swells the hum with the same number. The
  light and the sound therefore arrive together by construction rather than by two timers agreeing. **Solo Quick Tap
  and Dots only: the glow is light blue, which is Player 2 (L4)**, and it is presentation only (L10).
  **Sequence ducks its bed to 40% while a key rings (B.30)** — both halves, the pattern and the copy, because both go
  through `Snd.note`. The pitch half of that complaint is fixed in the data: the three Sequence tracks use only C and G
  and stay under the keys' own C4.
- **The versus stems are presentation (v16 §1.4).** `STEMS` is one pair for every game — they take the round's own
  root, tempo, bar and chords so they line up, and only the voicing is theirs. Each rides its own gain node and the gain
  follows `R.vsP[p]`, that player's proximity to the win condition. **L10 is untouched by it:** nothing in a two-player
  run advances a key, a bar, an unlock or an achievement, and `vsP` is read in `liveCheck` *above* the two-player return
  precisely because it is the one thing about a versus run that has to cross that line.
- **An unlock has its own sound; the achievement sound is not to be changed.** `Snd.unlockFx()` on an `'ok'` toast,
  `Snd.click()` on an achievement — Aiden's line was that achievements already sound right. The gate asserts both, so
  "made the unlock bigger" and "moved the achievement" cannot look the same.
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
- **One mechanism pins a goal at the top of a run, not two.** A clearance-bar row (5.2), the Next card's achievement
  (2.2) and the lock box's Try to unlock all go through `goWhere` -> `pendingAim` -> the `#goal` line. **An aim the player
  asked for outranks `goalFor`'s automatic offer** (build 26) — it used to lose whenever that combination also carried an
  unearned unlock, which made "pin it as a running goal" quietly show something else.

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
assert that the run banks before `run:finish` and the result screen no longer earns anything. **The keys, the surface and the two-player defects (v15 §5-§6 and register #375,
build 26)** — a Go / No-go turn is `PASS_TURNS[0]` shapes on one rule with the flip suppressed inside a block (#375a),
`twoBlockEnd` contains no constant and 400 dealt blocks each carry at least two go-shapes with no shape three running and
no decoy repeated (#375b), Sequence versus deals two patterns and grows both while `SEQ_VS.lives` stays 3 (#375c); the
menu item reads "Keys", the three glyphs get strictly more elaborate, a key under 100% wears its %, keys 2 and 3 are
flagged shell and open a screen with no ring and no invented bar (5.3), a clearance-bar row starts its run with the bar
on the goal line (5.2), a fresh clear fades the result, refuses a tap on Go, grows the segment with the root lit and
hands itself back (5.1), the arrival plays once per profile (5.4), "tap to begin" is display type and centred (6.1), a
newly unlocked tile arrives and is marked green (6.3), Game select does not move as the top 10 fills (6.4) and a pass &
play Go says just "Go" (6.5). **`driveToResult` waits the 5.1 interlude out** — the fade is already on by the time any
poll can see `s-over`, so a test that starts tapping immediately is tapping a screen that is deliberately not listening.
**Two-player (v15 §4,
build 25)** — every turn-taking mode has a `PASS_TURNS` row and every row names a real mode; a pass & play Estimate,
Timing, Flash and Go / No-go each play to a result **without ever reaching the hand-over screen**, show the pair, hide the
board (L10) and leave the store empty (A.3 — no run, no unlock, no achievement, no bar, read back from localStorage after
each); Sequence versus keeps its key row, gains its opening-length row and no longer mentions Compose; and Spot offers
Versus on the player row despite its first mode having none, keeps it when Find is picked, and plays out to a pair. **A failing
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

**Build 27 (v16, batch 12)** — statically: three playable options for every game with no two sharing a wave set and a
pattern set, Quick Tap · A identical to the build-26 loop, the menu and the three key loops present, no `noise` role,
`ui/toast.js` picking `unlockFx` for an unlock and leaving `click` on an achievement, and every `INTRO` row a single
line. In the browser: all 25 tracks schedule cleanly with no bad event; **a Sequence run whose first answered note is
wrong opens Timing · Stopwatch at 3, 5 and 7 keys, mid-run and after the run is quit, and a correct first note does
not**; the Stopwatch Set deals five targets totalling exactly 35.00s (6.18, read off the engine now that §3 removed the
display) while the Set shows no baseline and the Streak keeps its; Find versus deals both shapes once and keeps them for
the match, has no `.vz` band on the field, lights the round in the owner's colour, starts static and gains motion; the
intro renders no word spans and no sub-line, ends the first run of a game on "Ready?" and the second mode of that game
without one. **`driveToResult` answers the Ready gate** — nothing else in a run is listening while it is up, and the
seven answers it gives are themselves the assertion that it appears.

**Build 28 (v17, batch 13 · §B.1–§B.18)** — statically: five keys is gone from `GAMES.sequence.lens`, `vsLens`,
`KEY_BARS`, `LEN_RULES` and every achievement (B.9); no literal count survives in the four files that print one; the
keypad is built from `SPOT_RAMP.nCap`; the flash falls no faster than half the old rate (B.15); `CFG.swOver` is 10 and
`tm_s10` is a described, live secret row (B.12); no achievement tier calls itself an unlock and every `UNLOCKS` row
opens a game, a mode or a length (B.11); Find's total is floored and both corrected Set lines say what is scored (B.1);
the Estimate reveal shows `#hres` before `#hdiff` and the four retired strings are gone from `config/copy.js` (B.2 /
B.3). **The count is derived here as well as in the app** — it was a literal 31 in this file, so the gate would have
gone red on the build that legitimately changed it. In the browser: a profile carrying 5-key runs boots clean and they
open nothing; a whole first-play demo writes nothing to the store while the same record earns the instant the player has
the engine (B.4); every length rung raises a green toast the moment it is met (B.5); Fresh game clears both dev switches
and `seedSeen` covers the cosmetics (B.10); the Sequence HUD's score does not move between "watch" and "your turn" and
"best" clears it (B.13); 120 shape-frames of Count, Find and Find versus with every shape fully inside the field,
rotation's swept box included (B.16); Spot shows "Ready?" on a genuinely first run and skips it on the second mode of
the same game (B.17); and §A.6's percentage is 0 unplayed, 0.9-capped uncleared, 1 cleared, 100% whole, on the keys
screen and on the menu. **The chain fixtures moved with the rules** — the "N in a row" rungs pass a run with nine misses
and fail one with fifteen non-consecutive hits, and a pre-build-28 record with no `row` is still judged the old way.

**Build 29 (v17, batch 13 · §B.19–§B.26)** — statically: `menu-note` is gone from the markup, the copy and the
stylesheet (B.20); `ui/screens/` holds `progress.js` and neither of the two files it replaces (B.21); every game's
verdict row has three descending thresholds and four tiers of five distinct lines, every tier a `#rrggbb` and a
`VERDICT_FX` entry, and `config/copy.js` no longer exports `VERDICTS` at all (B.25); the review generator reads
`config/verdicts.js` and the template has the section that prints it (B.26). In the browser: one menu item called
Progress with two tabs, Unlocks first, both rendering and the last one remembered across a Back (B.21); "tap to begin"
fades over 1.2s at 4.6s and sits between half and three quarters of the way down with both story lines and the title
still there (B.19 / L1); the pressed tile's outline is `PRESS` from `config/theme.js` and is neither `--ok` nor white
(B.22 / L7 / L8); Sequence sits directly under Estimate, every step of the chain order is one cell of the snake, there
is a line per step and each one is green exactly when the game it leads to is open (B.23); the chest is locked with
key 1's own count on it and **nothing on that screen says "pro" or "author"** (B.24 / A.1), and with every bar cleared
it opens once, stores it and survives a reload; forty draws of one record give all five lines of one tier and never the
same line twice running, a solo result wears its tier class and colour, and **a pass & play result wears neither**
(B.25 / L4).

**Build 30 (v17, batch 13 · §B.27–§B.33)** — statically: every game has three named options and plays one of its own
(`quick-tap:held` is still the build-26 loop note for note), the menu and `key:roots` / `key:frost` / `key:thorn` all
exist, no two options of a game share a wave set and a pattern set, and `SET_SECS` and `FLOW_STEM` are present (B.30);
Roots → Frost → Thorn each carry a tint and a track that exists, and `ui/screens/key.js` asks for the tier's loop by
name with no `key:1` left in it (B.31); `krootgrow` is .93s, `khaloglow` 2.85s and the 5.1 interlude waits past the
halo (B.33); the review generator reads the arc, the long form and the flow layer, and the template plays the filter
and the hold (B.29 / B.27). In the browser: every track plans to ten-field events; **every open-ended run's form runs at
least three minutes before an exact repeat and every known length plays one arc that ends with the run** (B.29); a
timed run plays through its own finish ramp to a result and Sequence answers no `fin()` (B.28); both tap games answer
`tps()`, the flow layer plans over both, the glow rises with the taps and falls when they stop, and **a two-player run
never raises it** (B.27 / L4); every Sequence track is C and G only and tops out under the keys' own C4, the duck is
Sequence-only and the cadence transposes (B.30); **the keys screen shows ONE tier before chest 1 and says neither "pro"
nor "author" anywhere**, three after (B.31 / A.1); and Customise's track row is a padlock with no requirement text on a
normal profile, three options under unlock-all, stored in `prefs.track`, kept across Fresh game while `chest2` is
cleared (B.32 / A.3).

No bundler, no build step — GitHub Pages serves the modules directly, so every import path stays
relative (`./games/dots/index.js`).
