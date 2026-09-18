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

### Added at build 35 (batch 15: FEEDBACK-v20 §D.1–§D.3, §D.8–§D.10; FEEDBACK-v21 §F.1–§F.5, §G.7; #415), 2026-09-14

- **Try to unlock lands on the highest open mode and length (v20 D.8).** Most requirements name no length — "35 hits in any
  Quick Tap run" — and the jump took whatever length the sheet was last left on, or the shortest open one, so Dots · Blind
  landed in a Sprint where 35 hits is seven a second. It was never a Dots case: nine of the thirteen `UNLOCKS` rows name no
  mode or no length. `whereOf(w)` in `run/run.js` resolves the highest open one — the last in the config's own order — at
  jump time, a named one that is locked falls back the same way, and the gate walks every row on a fresh profile and with
  everything open. The nine destinations that changed are listed in `../FEATURES.md` (build 35).
- **An AudioContext that will not resume is rebuilt (v21 F.2).** What v10 §7.5 built was three bare `resume()` calls with
  nothing checking whether they worked, no `statechange` listener and no way back from a context iOS leaves `interrupted`
  — total silence until the app is killed. `revive()` is the one resume: foreground, `pageshow`, `statechange`, and the
  next tap. A context that had been running and has not come back inside `REVIVE_MS` is closed and rebuilt, and everything
  holding something of the old one registers in `rebinds` — the music drops its bed, stems and flow node and re-anchors
  its clock; the end sound forgets the old clock's time. A context that never ran is rebuilt only inside a tap, the one
  moment iOS lets a new one start. Testing reads out the state, the rebuild count, the last rebuild and the last event.
  **It cannot be reproduced on a desktop**; the gate forces each path, the phone is the check.
- **With nothing selected the pick sheet is `hidden` (v21 F.1).** It was only ever `translateY(100%)` inside a scrolling
  screen, and a transformed box still counts towards its container's overflow — so the map could be dragged up to show a
  whole sheet drawn for the last game. Opacity or a transform cannot take a box out of the layout; `hidden` does, and
  `hideSheet()` empties it once the slide down has run.
- **No player colour is written where customisation lives (v21 F.4, L4).** Investigated before anything was changed: no
  code writes `P1C` / `P2C` into prefs, and the only two writers of `prefs.col` are Customise's swatch tap and its wheel
  (the gate counts them). The stray colours Aiden saw were target swatches, not Player 2. The game-select tile and
  Customise's selected ring read the same stored value, so a colour on a tile is in storage — `up4` clears every game's
  colours once (store v4, `mig35`), and a game is white until a colour is chosen for it. The one real leak found — a
  locked swatch's preview surviving the Customise game chip — is fixed.
- **Every Go button says Go (v21 F.5).** `SHEET.goVersus` is retired the way `goEach` and `goPass` were at build 26.
- **A newly unlocked mode is green until it has been played; selected beats green (v20 D.1 / D.2).** Seen and played are
  two facts. `newMark` / `markSeen` still answer "has this been on screen" — L8's first-seen mark, and D.5's question —
  and clear on sight. `newPlay(g,d)` answers "has a run of it been recorded", off the run store, and wears the same green
  line on the mode's row and its game's tile. An earned unlock is what makes a mode "newly unlocked"; Quick Tap · Two and
  OPEN EVERYTHING have nothing to announce. D.2 was the cascade, not the class order: `.newthing` carries
  `border-color:…!important`, so the selected line lost to it however the classes were written.
- **The whole-run rate waits for 2.0s; `peak` counts gaps (v20 D.3, L5 quoted on the 2.0).** The whole-run reading divided
  taps by time from the first frame — one tap at 0.16s printed 6.3/s — and now holds until `RATE_RUN_FLOOR`. `peakRate`
  was a true trailing second all along, but counted taps, and N taps spanning a second are N−1 gaps. `peak` is shown on
  the result of the run that made it and read by nothing else, so the unit change retired nothing.
- **A verdict row is per mode wherever the modes score in different units (v20 D.10).** Stopwatch (seconds off) and Hidden
  (ms off the marker) shared one `at` triple, as did Flash (raw ms) and Go / No-go (ms over the gate). Four rows now, each
  seeded from its parent, and the parent rows are gone. Quick Tap's Two and Four share one ÷6 curve (D.9), as Dots' two
  modes always have.
- **Every live score ticks (v21 G.7).** `hud.tick` walks the number to its new value over `TICK.ms` (90, guess) and pulses
  it; a newer tick ends an older one, so nothing smears above three taps a second. Versus pulses in the scorer's colour
  (L4). A countUp or addUp already walking `#score` frame by frame writes straight through. The big count's .18s pop went
  with it. A correct versus pad pulses too (F.3) — the lit square often moved on to the same pad and nothing on screen
  changed. Presentation only (L10).

### Amended at build 36 (FEEDBACK-v22 §J.1; the Verdict Desk export), 2026-09-14

- **`running` is never taken on trust (v22 §J.1).** Build 35's F.2 shipped and the music still did not come back after
  backgrounding. Aiden read the Testing screen after the failure: `audio · running`, no sound. WebKit can leave
  `AudioContext.state` at `running` after an interruption while `currentTime` has stopped, and every entry into F.2's
  recovery — the tap, visibilitychange and pageshow call sites, and `revive()` itself — was gated on `state !== 'running'`,
  so none fired. **F.2's ladder is unchanged; the gates came off the foreground paths.** Off a tap, a context reading
  `running` goes to `live()`: sample `currentTime`, wait `LIVE_MS` (150ms), sample again, rebuild if it has not moved. A
  resume that ends `running` is checked the same way. **The tap never waits** — it runs on every tap of every game — so it
  keeps a gate (not running, or `_suspect`) and compares the clock against the sample already taken, synchronously; a
  stuck clock is rebuilt inside the gesture, which is the one moment iOS lets a new context start. Going hidden, `pagehide`,
  a foreground check in flight and a freshly rebuilt context all mark `_suspect`. **The Testing line reports the clock**
  (`clock +N.NNNs in N.Ns`, `STOPPED` when it has not moved) because `state` is the value that lied.
- **The Verdict Desk export replaces the 2026-09-13 snapshot as the source of the verdict data.** Version 658, 269 entries:
  every line it carries for all eleven rows, Reaction's thresholds, and the per-round ceilings for Cut, Flash and Go /
  No-go. Timing's thresholds were held at build 36 while #414 was open (its lines were built); **#414 closed and they built
  at build 37**, below.

### Amended at build 37 (FEEDBACK-v21 §G.1–§G.4, §G.8; FEEDBACK-v20 §D.4, §D.7; FEEDBACK-v22 §K; Aiden's data fixes), 2026-09-14

- **v17 §A.1 NARROWED (G.1, G.2, D.7 — all quoting it).** The 2026-09-10 decision was "nothing about pro or author is
  visible before chest 1". It now covers only the per-game Pro and Author NUMBERS. Chests 2 and 3 sit on the map from the
  start, stacked under chest 1, locked, each saying "open the previous chest"; all three keys sit on the keys screen, Pro
  and Author crossed out (crossed, not greyed) with "To unlock: open the previous chest" underneath and no percentage, and
  a tap on one says what opens it and opens nothing. **The reveal itself did not move** — both tiers still open with chest 1
  through `mapOpen()`; a chest after chest 1 now also waits for the chest before it. **The Achievements tab's Pro and
  Author sets and the radar's extra rungs stay hidden before chest 1** — G.1 and G.2 named the chests and the keys, not
  those, and the handover said not to widen it.
- **v18 B.19 / B.20 AMENDED (G.3, quoting both): chest 1 also waits for every game MODE to be unlocked.** A gate sits on
  the connector into it; an early tap says "Unlock all games first" with the mode count underneath; once the last mode
  opens the gate animates away once (`prefs.gateOff`) and the chest switches to key 1's bar progress. **This is the one
  crossing between the two progression systems**, and it is one predicate — `modesOpen()` in `progress/key.js` beside
  `mapOpen()`, reading `modeCount()` in `progress.js` without the challenge-link exception, honouring the dev escapes.
  **Checked before it was built, and asserted:** every key-1 bar belongs to one of the thirteen modes, every one of them is
  reached by the chain or open from the start, and nothing in the chain reads a chest — so the chest can always be opened,
  and a Gauntlet (#382) put behind it can never be handed a key-1 bar without the gate going red.
- **Retroactive credit is silent (G.4).** A chest opening judges the tiers it reveals against saved bests and banks every
  bar already beaten — no toast, no unlock sound; the chest's own sound and opening are the one of each. `prefs.retro`
  carries L8's green to those rows and the key button the first time they are on screen. A live clear still interrupts the
  result screen as it always has.
- **The front percentage counts up when it has risen (D.4).** One last-painted figure per key (`prefs.pctSeen`), written
  when the menu paints it. The count-up is the runs' own — moved to `core/count.js` so a screen can use it without breaking
  A4 — and the sound is its whoosh, which already existed (the v16 §1.5 check).
- **Testing: a switch and a reset per key (G.8, S5).** The switch clears every bar of that key and snapshots what it held,
  so switching off restores it; the reset backs the key out — bars, chest, the step into the next tier, retroactive marks,
  last-seen %, and its key achievements.
- **One colour for "this is what you chose" (v22 §K).** A selected mode takes `--press`; while the sheet is up the pressed
  tile demotes to the line colour, so exactly one amber thing is on screen. `.grid.dim` is on for the mode sheet too
  (checked, asserted); a first-seen or unplayed mode that is selected takes `--press`; `.picked` keeps `--ok` — it is the
  tap's own 170ms confirmation; `--press` measures past 3:1 against the sheet's ground. **Consequence worth knowing:** the
  tile's amber outline is now never on screen in practice, because the sheet opens on the same tap.
- **Timing's thresholds (Aiden, #414 closed).** Stopwatch `at` 0.90 / 0.74 / 0.56 (0.50 / 1.30 / 2.20s over the Set; 0.90
  is five of his 0.10s per-round ceilings, Claude's number on his instruction), `ROUND_AT` 0.1 / 0.3 / 0.55; Hidden `at`
  0.9259 / 0.8796 / 0.8241 (400 / 650 / 950ms), `ROUND_AT` 40 / 70 / 95; scales unchanged. A round's ceiling is deliberately
  more forgiving than a fifth of the Set's. Two Go / No-go lines corrected, both his typing.
- **Not touched, on purpose: `config/unlocks.js`.** Aiden decided 2026-09-14 that modes are siblings, not a ladder (#424):
  Dots · Blind stays "any Quick Tap run" and Estimate · Grow "any Dots run".

### Amended at build 38 (Aiden's answers to build 37's two open questions), 2026-09-14

- **§K amended: the pressed tile keeps its amber until a mode is CHOSEN.** Build 37 demoted it the moment the sheet was up,
  and since the sheet opens on the same tap the tile's amber was never on screen. It now demotes on `.grid.chosen` — set in
  `setStage()` when the game has more than one mode and a mode is selected. A one-mode game (Sequence) has no mode row to tap,
  so its tile keeps the amber on its length row. Still exactly one amber thing on screen.
- **The reveal narrowed further: Author waits for the Pro chest.** Build 37 kept chest 1 opening both tiers. Each tier now
  opens with its own chest — `tierOpen()` in `progress/key.js` — so Author's key, its clears, its retroactive credit, its
  achievement set and its radar rung all wait for chest 2. Pro is unchanged.
- **A.2 amended (#426 — Aiden asked for it directly): a build MAY generate a PLACEHOLDER bar, marked as one and replaceable a
  row at a time; it may still never set a real bar or silently correct one.** Before: "no build may derive a bar; Aiden sets
  every one by hand" — which kept Pro and Author shells from build 32 to build 37 and left Circuit and Thorn reviewable only
  through Testing's in-memory fill. The amendment is written where the old absolute was — `config/key-bars.js`'s header,
  `config/keys.js`'s header, `site/CLAUDE.md` — and enforced in `scripts/placeholders.mjs`, which only ever writes a cell that
  is empty or still holds its own marker's `v`, and never `bar`. Mechanics in `docs/PROGRESSION.md` → Build 38 (#426).
- **G.4 widened: retroactive credit also runs when a column ARRIVES for a tier that is already open** (Aiden: "yes, silently,
  once") — `retroArrived()` at boot, once per column, keyed by `prefs.retroCol`.

### Amended at build 39 (batch 16, the surface: FEEDBACK-v23 §L.2–§L.5), 2026-09-14

- **v18 B.31 amended (v21 G.6, restated as v23 L.4a): Customise is its own menu item and its own screen again.** Build 33 made
  it the middle tab of Progress, reading the 2026-09-11 "merge into two tabs" instruction as covering it. G.6 called that a
  misread on 2026-09-14 and was scheduled for build 37 (#418), then moved to 38 and to 39 without being built, so build 38
  still showed build 33's layout. `ui/screens/customise.js` is the build-38 tab's code, moved; the menu row sits between
  Keys and About, where it was at build 32. A4 unchanged: Progress sends a player there with `show('s-custom', …)`.
- **Progress is GAME UNLOCKS · CUSTOMISE UNLOCKS · ACHIEVEMENTS, and the three are a partition (v23 L.4b / L.4c).** One test,
  `achTab()` in `progress.js`: an `ACH` row with `unlocks` is on Customise unlocks and nowhere else; everything else, key
  rows included, is on Achievements; Game unlocks is the chain (L6) and holds no achievement. **L6's parenthetical moves
  with it** — "a cosmetic's requirement stays on the Achievements tab" becomes "is on the Customise unlocks tab" (L.4c
  names L6). `prefs.progTab` is `unl` / `cul` / `ach`; a stored `cus` lands on `cul` with no store step (a preference, not
  progress). The label CUSTOMISE UNLOCKS is a guess ("Rewards" retired because it does not say unlock); at 390px the three
  wrap the tab row to two rows rather than shrinking the 11px chip type.
- **A Progress label is white until earned, green once, never red (v23 L.2; v21 G.6's last sentence).** The red was
  `.ach .lock em.u{color:var(--cue)}`, written at build 8 and carried into `styles/app.css` at build 18: every unearned
  row with `unlocks` wore the cue red on its "unlocks …" label. G.6 was never built, so the rule was not scoped to one tab
  — it did not exist. Now one rule on all three tabs.
- **An earned Customise-unlocks row opens Customise with that item ringed (v23 L.4d; the 2026-09-05 rule).** Picked out,
  not applied (guess). Unearned rows still go to play it; an earned Achievements row with no payout goes to play it too
  (guess — build 38 sent it to the Customise tab with nothing to show). A payout into a group the previewed game hides
  (Every game's lead colour) previews the first game that shows it.
- **New: the build stamp never covers a control (v23 L.5).** `#build` is fixed to the viewport and screens scroll under
  it; on Customise it sat on the Menu music label. Every `overflow-y:auto` scroller ends with a `::after` spacer of
  `--stampclear` = the stamp's offset + its 11px + a 16px line (guess). A pseudo-element rather than padding because
  bottom padding inside a scrolling flex column is not honoured by every engine (unverified on iOS — UNVERIFIED.md).
  `.otwrap`, the result's top-10 box mid-screen, is exempt.

### Amended at build 40 (batch 16, four chests and the 0–400 meter: FEEDBACK-v23 §L.8 a–c f, §L.10 a–c e, §L.11 a c, §L.12, G.8 extended), 2026-09-14

- **v18 B.19 / B.20 and v21 G.1–G.4 AMENDED (L.10, quoting all six): FOUR chests, named by what opens them — Games, Key, Pro, Thorns —
  never numbered.** Was: three chests, chest n needing key n whole, chest 1 also waiting for every game mode behind a gate on the
  connector (G.3). Now the all-modes condition IS the Games chest, and the gate symbol, "unlock all games first" and `prefs.gateOff` are
  gone. The chests after it keep "open the previous chest" (G.1). Strictly sequential, asserted (L.10e). Aiden's reason (17:5x): the
  100%-but-locked state was awkward, and the first hour of play had no chest it could open. `00_Control/DECISIONS.md`'s 2026-09-10 chest
  entry carries a dated "narrowed by batch 16" line.
- **L6 quoted (L.10a): the chain is untouched, and opens a chest.** `config/unlocks.js` and `progress/rules.js` still read no chest
  (asserted, as G.3 asserted it); `modeCount()` gained `free`, the modes a new profile starts with, for the meter's first band.
- **v17 §A.1, as G.1 / G.2 narrowed it — key 1 joins Pro and Author behind a chest (L.10a).** Before the Games chest key 1 is crossed out
  with "open the Games chest", counts nothing, interrupts nothing, fills no outline and lists no achievement set; its already-beaten bars
  bank silently when the chest opens (G.4, extended one chest earlier). §M.2 went unanswered and L.10a was built as written.
- **v18 B.15 / B.16 / B.17 RETIRED (L.8a / L.8b).** "67% complete" re-based to 30 when the player stepped into Pro, and the step was asked
  for and warned. Now there is one meter, 0–400, never reset: modes, then key 1, Pro and Author, each band counting only once its chest
  is open. `frontPct()`, `prefs.pro` and both asks are gone. The menu line keeps its `N% complete` (guess); A.6.5 as amended by B.15 —
  "the percentage alone" — still holds.
- **v20 D.4 amended (L.8e): one last-painted figure, `prefs.meterSeen`, not one per key** — the count-up fires on every rise, in any band.
- **New (L.8b): a ready chest opens on its key screen by itself** — plain in this build (lid up, its words, the meter counting up); the
  ceremony is build 41's.
- **v21 G.6 / v23 L.4a narrowed (L.11a): Customise is locked until the Games chest opens.** Crossed out (v17: crossed, not greyed) with
  "open the Games chest" under it; green until first opened (L8, v20 D.5); defaults apply meanwhile and every stored choice is kept. The
  Customise unlocks tab is not gated.
- **New (L.12): a whole key taps through to its chest** — `keyChest()` on `progress/key.js`, one predicate, no chest read on the key
  screen (A4).
- **v21 G.8 extended (L.8f, S5): Testing's switches and resets are per chest, four of each, plus "set meter to N%".**
- **v17 §A.3 unchanged in substance:** free music choice was "chest 2's"; it is the Pro chest's, by name.
- **The store is v5** — `up5`: `chest1` → Key and Games, `chest2` → Pro, `chest3` → Thorns; `pro`, `gateOff`, `pctSeen` dropped. `RUN_SCHEMA`
  unchanged (4).

### Amended at build 41 (batch 16, the moments: FEEDBACK-v23 §L.6, §L.8 d–e, §L.9 a–d, §L.10 d, §L.11 b d e), 2026-09-14

**L10 quoted throughout: nothing in this build changes what clears a bar, opens a chest or banks anything.** The chest is stored and
credited (`openChest`) before a frame of its ceremony plays, and `ui/ceremony.js` / `ui/chest.js` write nothing (gated).

- **v23 L.8b amended (L.6 / L.10d): the plain lid-up open becomes a CEREMONY.** Was (build 40): a banner on the key screen — lid up, the
  name, the meter counting up, the words — and `Snd.unlockFx`. Now four ceremonies as named steps (`CEREMONY`, `config/chests.js`), drawn by
  step name in `ui/ceremony.js`, each with its own effects and sting (`CHEST_FX` / `CHEST_NOISE` / `CHEST_STING`, `config/audio.js`) through
  `Snd.chest()`. Not skippable; the music hushed; the meter's D.4 count-up in the last beat; held on "tap to continue". The banner,
  `CHEST_ART` and the `.keyopen` styles are gone.
- **Where the ceremony ends (guess — the build-40 §M note left it to this build's prompt, which does not say).** L.8b opens the chest on the
  key screen and L.11b ends it on the map: the tap goes to the map with the chest in view and the spill plays there; inside a result-screen
  interlude it goes back to the result, and the spill waits for the next paint of the map (`prefs.spill`).
- **The interlude's hand-back (v15 5.1 / v17 B.33) waits for a ceremony.** A ceremony started inside it releases the input lock at "tap to
  continue" — the one tap it must let through — and owns the hand-back; the 3.9s timer stands down. Both drivers answer the tap
  (`_smoke/smoke.mjs`, `_review/scripts/catalogue.mjs cereTap`). Build 40's gate line "nothing waits for a tap" is reversed.
- **v18 B.26 amended: Testing's four chest buttons are "replay <chest> chest opening"** — the ceremony on the key screen with nothing
  stored, then the spill replayed on the map (`spillDemo`, replacing build 32's lid swing `chestDemo`).
- **v18 B.19 / v23 L.10c amended (L.9a / L.9b / L.10d): four sprites, not one.** One renderer, `ui/chest.js chestSvg()`, from `CHEST_LOOK`;
  locked crossed out (was greyed to 40%), ready runs that chest's idle (was a green pulse and a key over the lock), open lid up and still.
  The static SVGs are out of `index.html`.
- **New (L.9c): one quiet sound the first time the map paints a chest ready** — `Snd.chestReady()`, `prefs.readySeen` (guess).
- **v23 L.8a amended (L.8d / L.8e): the meter figure wears its band.** `meterBand()`, `meterLook()`, `METER_BANDS`; the D.4 pulse's colour
  was `--ok` green and is the band's now (B.22). A band starts at its lower figure (100% is ink — guess). The map's locked key chest line
  takes the band colour only; the menu card, the key screen's count line and the ceremony's figure take the whole look.
- **v23 L.11c amended (L.11b / L.11d): the words spill once and are tap targets** (were a plain, untappable column). `CHEST_WORDS[].to`;
  `CHEST_SOON` for a reward not built yet. `tba` moved under its word so nothing wraps at 390px (gated).
- **The Pro colour is gold (L.8d / L.9a) while Circuit stays "not gold" (B.22).** B.22's recolour of the Pro KEY's art stands; the Pro
  CHEST and the meter's third band are gold because L.8d and L.9a say so. Flagged in FEATURES.md.
- **The store is unchanged at v5.** Two new `prefs` fields, `readySeen` and `spill`, per chest by name, progress (Fresh game and the
  per-chest reset clear them); no ladder step — an absent field means every chest unseen. `RUN_SCHEMA` unchanged (4).
- **`config/` inventory:** `chests.js` gained `METER_BANDS`, `CHEST_LOOK`, `CEREMONY`, `CEREMONY_FX`, `SPILL`; `audio.js` gained `CHEST_FX`,
  `CHEST_NOISE`, `CHEST_STING`, `CHEST_READY_FX`, `HUSH`; `copy.js` gained `CHEST_WORDS[].to`, `CHEST_SOON` and `KEY.tapOn`.

### Amended at build 42 (batch 16, the key themes: FEEDBACK-v23 §L.7 a–e), 2026-09-15

**L10 quoted: music and one preference — nothing in this build clears a bar, opens a chest or banks anything. A4: the key screen and
Customise write one field through `core/store.js` and neither imports the other.**

- **v17 §B.31 / v16 1.3 amended (L.7a): the three key themes are rewritten** as `theme:key` / `theme:pro` / `theme:thorns` — each in its motif
  from the first beat with every voice in bar 1 (no intro, no fade-up, no build), escalating Key → Pro → Thorns, on the same roots and chords.
  Supersedes batch 13's "really likes the key music" and 2026-09-10's "Still is cool background music for the key" (L.7: the later note wins).
  The build-30 `key:roots` / `key:frost` / `key:thorn` are kept ONE build as `retired:42`, played only by the review board; `CHEST_STING` points
  at the new ids with no note moved. Was: Roots' melody 1.4s in, bass silent 4 bars; Frost's melody silent 38s; Thorn's filters shut for 32s.
- **v16 1.3 amended (L.7b): a key's screen plays its theme only once the chest that key opens is open** — the menu loop until then (guess:
  "a locked key has no theme to hear"). `audio.js`'s screen-change timer no longer chooses the key screen's loop: the router emits
  `screen:change` before `onShow`, so since build 30 it asked for Roots 900ms after `key.js` asked for the Pro or Author tab's own.
- **New (L.7b / L.7c): ONE music setting for every run, `prefs.everywhere`** ('game' | 'key' | 'pro' | 'thorns'). SET THIS MUSIC at the foot of a
  key screen, visible only once its chest is open, writes it and reads PLAYING EVERYWHERE in green; Customise's **Everywhere** row (Per game /
  Key / Pro / Thorns) sits above the tracks and writes it too. Both read `everywhere()`, which reads a theme whose chest is shut as 'game', so a
  locked theme is never applied by any route. A shut theme is crossed out with its chest under it and a tap chooses nothing. While a theme plays
  everywhere the tracks grey with one note under them — a `.cnote`, not a `.lockline`, so B.30's "at most one filled" is unchanged — and a track
  tap goes back to Per game with that track chosen. A second tap on PLAYING EVERYWHERE changes nothing (guess).
- **v18 B.28 extended, not amended:** the Music row is still the track, one row, padlocked until the Pro chest; the Everywhere row is above it.
- **New (L.7d): a theme as run music takes the one path a game's track takes** — `pickRun(g)` in `Music.start`, before `shapeFor` — so the
  finish ramp (B.28), the arc (B.29), the versus stems (1.4), the flow hum (B.27), Sequence's duck (B.30, keyed on the game) and the end
  cadence apply unchanged. The menu loop does not follow the setting (guess). `FLOW_AT` stays 2.7 (v18 B.9, Aiden's words): L.7d's "above
  3.0 taps/s" restates the rule without quoting it.
- **The store is v6** — `up6` adds `everywhere: 'game'` where it is absent and never replaces one (the build-40 lesson). `RUN_SCHEMA` unchanged (4).
  `everywhere` is a preference: Fresh game keeps it.
- **`config/` inventory:** `audio.js` gained `theme:key`, `theme:pro`, `theme:thorns`, `KEY_THEMES`, `KEY_THEMES_RETIRED` and a `retired` field on
  three tracks; `keys.js` gained `music` per key and its `track`s moved; `copy.js` gained `CUSTOM.perGame` / `openChest` / `themeOn` and
  `KEY.setMusic` / `musicOn`. `Music.probe()` reports `track`, `arc`, `arcBars`, `stems`, `flow`, `fin`.

### Amended at build 43 (batch 17, chests and keys: FEEDBACK-v24 §A, §B.1–§B.3, §B.5, §C), 2026-09-15

**L10 quoted: presentation, one menu lock and one build flag — no bar clears, no chest opens by itself, nothing new banks. A4: the map asks
the key screen to open a chest with `show('s-key', {open})` and neither imports the other. S5: the dev switches reach the first load of the
web build and no native build.**

- **v23 L.8b RETIRED (v24 C.1): a chest no longer opens on the key screen by itself**, on arrival or inside a result interlude. The key screen's
  key — a whole key's hub, or the quiet screen's key while the Games chest waits — or a ready chest in its row ASKS ("Open the Key chest?",
  Open / Not yet), then opens. Batch 16's retired "proceed to Pro" stays retired: that was a step in the middle of a flow; this is a trigger.
- **New (B.2 / B.3): a READY chest tapped on the map opens straight away** — its ceremony covers the key screen from the frame it is shown —
  unless the key screen's arrival or that key's earn moment has not been seen, in which case that plays in full, input held, and then the chest
  opens. The map's "tap to open" is the ask there (guess).
- **New (B.1): a chest that can be opened wears a pulsing green outline**, map and key screen, all four.
- **v18 B.20 amended (C.5): the whole-key moment is each key's own earn moment** — Lantern, Circuit, Thorn — escalating, with a sound from its
  key's theme; `KEY_EARN` / `KEY_EARN_FX`. A result interlude waits for it.
- **v23 L.7b amended (C.2 / C.3): a key's screen plays its theme once its TIER is open**, not once the chest the key opens is. The build-42 rule
  was the whole of "the Pro and Thorns keys lost their music".
- **v23 L.6's sting amended (C.7): `CHEST_STING` is cut from its key's theme** by `stingOf()` through `bars()`, held to the theme rule rather than
  "every note 700ms", escalating Games → Key → Pro → Thorns.
- **New (C.4 / C.6): each key screen draws its own background over the live one**, and each is a Customise background (`ITEMS.bg` `key`) once
  that key is finished (`keyFinished`). Thorn's solid black is gone.
- **v23 L.11a extended (A.1): Keys is locked until the Games chest** exactly as Customise is — the menu row, the meter line and Progress's key
  row. `prefs.keysSeen`, no ladder step (an absent field takes `keySeen`).
- **v10 first-run dimming narrowed (A.3): a `[data-dev]` row is never dimmed**; `TARGET` in `config/build.js` sets `BUILD_FLAGS.dev`, and `npm run
  native` writes a tree with TARGET native and no `[data-dev]` element.
- **New (A.2 / B.5): a brand new game opens the map at the top; the chests join the first-visit reveal.**
- **`config/` inventory:** `build.js` gained `TARGET`; `keys.js` gained `KEY_EARN` and `KEY_LAYER`, and Thorn's `ground` is a faint white; `theme.js`
  gained `lantern` / `circuit` / `thorn` in `DESIGNS` and `ITEMS.bg` with a `key` field; `audio.js` gained `STING_RING` and `KEY_EARN_FX`, and
  `CHEST_STING` is `{track, voices?, cut, tail}`; `copy.js` gained `MENU.keysNeed`, `TOAST.keysLocked`, `KEY.ask` / `askYes` / `askNo` /
  `completeReady` / `quietReady`, three `BG_NAME`s, and `TOAST.cusLocked` now points at the map.

### Amended at build 44 (batch 17, the key roster: FEEDBACK-v24 §D, §E, §F.1, §F.3–§F.7), 2026-09-15

**L5 amended at Aiden's direct request (the build 44 prompt, FEEDBACK-v24 §F) — the same way A.2 was at #426: two Streak budgets. L10 quoted:
the goal line, the counter and the add-up are presentation; the roster rows are earned only by a bar a solo run clears.**

- **L5: Flash's Streak budget 500ms → 1000ms (F.1)** — "the total max", typed on the Flash Streak row; `FLASH_MAX` already capped a Set attempt.
- **L5: Spot · Count's Streak budget 5 → 8 miscounts (F.6)** — `COUNT_BUDGET` in `config/games.js`; Aiden named no figure, so 8 is a placeholder.
- **A.2 as amended at #426, narrowed (§E):** a placeholder may come from somewhere other than the generator. The desk's 48 carry `by:'desk'`;
  the generator keeps them. Key 1 and the twelve Quick Tap / Dots Pro bars are Aiden's, `conf:'set'`.
- **#426's retroactive credit extended to key 1 (guess).**
- **v18 B.25 extended (D.2, narrowing #435):** the key sets open with one row per combination per tier — 90 — named in `KEY_ROSTER`. Twenty-three
  ACH rows moved into it with their ids and rewards; their `ACH_TEST` / `ACH_PROGRESS` entries are gone. Everywhere, Secret and Desk v5.2's
  "Customise only" rows stay in ACH and feed no key.
- **v15 5.2 / build 26's goal rule extended (D.1):** the automatic offer is ordered by what the run can fairly earn, then falls back to
  `keyGoal`; an aim the player asked for still outranks it.
- **v18 B.1c narrowed (F.3):** with `NOGO_COUNTER` 'targets' (guess) a Go / No-go Set's big number counts targets answered ("7/15"), so a wrong
  tap no longer moves that number; the card's cost and the shake stay.
- **v17 B.15 amended (F.4):** the Count flash grows with the crowd a round deals (`flashBase` + `flashShape` a shape past `flashFree`, to
  `flashCap`), where B.15 only slowed its fall. `flashMax` / `flashPer` / `flashMin` are retired.
- **v14 6.1 amended (F.5):** a Count miscount holds `CFG.hold` before it walks into the total, over `COUNT_ADD.ms` (1400, guess) — was 480ms.
- **New (F.7):** Find deals `SPOT_FIND.overlap` (+ `overlapPer` by round 10) of its crowd on a neighbour; a tap inside a wanted shape's own box
  wins over a nearer decoy centre (`hitAt`, solo and versus).
- **`config/` inventory:** `key-bars.js` rows carry `conf:'set'` and `by:'desk'` markers; `achievements.js` gained `KEY_ROSTER` and lost 23 rows;
  `games.js` gained `COUNT_BUDGET`, `COUNT_ADD`, `NOGO_COUNTER`, `SPOT_FIND.overlap` / `overlapPer` and the four new `SPOT_RAMP` flash fields;
  `copy.js` gained `HUD.keyGoal`, `KEY_ACH.shut`, `KEY.conf.set`, `REACTION.nogoCount`, and `SPOT.of5` / `hudCountStreak` take `{bud}`;
  `build.js` LABEL is `batch 17 · the key roster`.

### Amended at build 45 (batch 18, fixes, state and the catalogue: FEEDBACK-v25 items 3, 4, 5, 8, 9, 10, 12, 14, 16–21), 2026-09-16

**One standing rule amended, one extended; L10 quoted throughout — every item in this build is presentation. Nothing clears, opens or banks
anything new.**

- **v23 L.5 amended: "the build stamp never covers a control" becomes THE STAMP IS DRAWN BEHIND EVERY SCREEN (item 4).** Build 39 pinned `#build`
  to the viewport at `z-index:50` and gave every scroller a `--stampclear` spacer so its last control cleared the stamp *when scrolled to the
  bottom*. A fixed element over scrolling content is over something at every other scroll position, which is what Aiden saw: v0.44 on the Four
  card and the Go button with a sheet up, on the Pro chest card mid-map, and on the Sequence panel's second line. The element now comes before
  the screens in `index.html` with no z-index of its own, so every screen paints over it. The spacer stays — it is what keeps the last control
  off the stamp where nothing opaque covers it. Aiden's alternative (hide it while a sheet is up) is not built: it would have left the map and
  the key screen as they were.
- **v18 B.10 extended: a round's tier is its colour, its NAME and its SOUND, from one call (items 17 / 18).** Build 31 put the tier's colour on
  each round's figure and build 29 gave the result screen the tier's sound; a round played nothing, and Flash's card carried its own 200 / 300ms
  word steps, so 234ms read GOOD in grey beside a green Great! figure. `roundShow(audio, key, v, solo)` in `games/_shared/tier.js` is the one
  call: it returns the id, the name and the colour and plays `Snd.roundVerdict(id)` — `VERDICT_FX` at `ROUND_VERDICT.time` of its length and
  `ROUND_VERDICT.gain` of its loudness (0.6 and 0.5, guesses). Where a round carried a judgement word the tier's name replaces it, the direction
  (early / late, too much / too little) staying beside it except on the top tier. Solo only (L4), and the board's rows stay silent on purpose:
  a list is not a moment.
- **v24 A.1 / #428 superseded on the key screen (item 14).** The red "N of the 30 numbers on this key are PLACEHOLDERS" line is deleted.
  `isPlaceholder()` and `placeholderCount()` are untouched — the generator and the review catalogue still ask them — but the key screen is
  written for the player, and the note covered the requirements under it.
- **New: one chest state, and the menu's first-run rule no longer outranks it (item 9).** `firstRun()` in `ui/screens/menu.js` now also asks
  `chestOpen('games')`. The map and the key screen never disagreed with the store; the menu did, because a profile with no runs on it crosses
  out every row but Play and Testing's chest switches open a chest without a run. Proved both ways in the gate: the Testing switch, and one
  Quick Tap run that opens the last mode and earns the chest.
- **New: a tap that moves the sheet on goes at once (item 3).** v14 4.6's 170ms hold, which lit the picked mode green before the length row came
  up, is retired with its `.picked` rule. It was the only picker in the app that waited on its own highlight.
- **New: the safe area at the top (items 8 / 19).** The five screen-level scrollers are clipped at `env(safe-area-inset-top)`, so content
  disappears at the status bar rather than sliding behind the clock; `#goal` and the HUD under it sit 11px and 44px *below* the inset instead of
  flush on it. Zero change where there is no inset — which is every environment the gate can drive, so this one waits on the phone.
- **New: the map is the phone's width (item 10), and the sheet is above it (item 5).** The grid was `min(94vw, 520px)` inside a screen padded
  24px a side: 366px of grid in 342px of room, hanging 12px out of each side, and `#s-pick` could be dragged sideways by exactly that — the whole
  map, Back included. It is padded 12px a side with `overflow-x:hidden` and the grid fills it. The sheet takes `z-index:5`, above the map's lines
  (1), key fill (1), padlocks (2) and a chest's words (2), which is what was drawing through it.
- **New: the key's labels are placed, not offset (item 12).** Each game's name and count are one text in a `.klabels` layer drawn after
  everything else, and `placeLabels()` takes the first of a short list of spots round each node whose box no drawn line, node or the ring itself
  reaches. The ring is counted whether or not its arcs are drawn, so a label does not move the day its game comes home.
- **New: the key screen fits (item 16).** `#s-key` never overflows the phone, `#key-main` takes the room left and a game's panel shrinks and
  scrolls inside itself; opening one adds `kpanel` and steps the ring down to 30vh.
- **New: the review catalogue's two sections are built from the app (items 20 / 21).** `_review/scripts/catalogue.ref.mjs` holds both builders as
  plain functions handed to `page.evaluate`, so `npm run review` and the gate run the same code: every sound the app makes as the events
  `audio.js` schedules (`Snd.plan()` records a sound's own code where there is no plan function), and every round-based game's bands read from
  its own config and engine. `SP.ramp(r, n)`, `SP.findSpec(r)`, `SP.SHAPES`, `TM.hiddenRamp(r, vary)`, `TM.DEAL`, `RX.NOGO_TURNS`,
  `RX.NOGO_JITTER` and `HD.TURNS` exist so those figures are read rather than typed; none of them moved a value.

### Build 46 — v25 items 6, 7, 11, 13, 15, 22, 1, 2, 23 (the unlock experience, sound and About)

- **AMENDED: v23 L.6 and v24 C.5 become ONE ROUTINE (items 6 / 11 / 22).** L.6 (build 41) gave a chest opening its own ceremony — its own clock,
  its own "tap to continue", its own hand-over — and C.5 (build 43) gave a key its own earn moment beside it. Item 11's last line settles it:
  *"'Unlocking is an event' is the rule for chests and keys alike, so build them from one shared reveal routine rather than two."* `ui/reveal.js`
  is that routine and it runs four beats, always in this order: **the stage**, **the gifts**, **"tap to continue"**, **the congratulations card**.
  It owns the clock, swallows every tap before the hold, hushes the music, and hands over on the card's Continue.
  The two callers hand it a STAGE and nothing else. `chestStage(id, o)` in `ui/ceremony.js` is build 41's drawing, unchanged, with its times still
  in `config/chests.js CEREMONY` and the meter's D.4 count-up still its own last beat. `keyStage(tier)` in `ui/screens/key.js` drives the ring:
  `KEY_REVEAL` in `config/keys.js` says how long, when the first game lands and the beat between them, when the key lights and when it settles.
  Neither file holds a timer for the hold, the tap or the hand-over any more, and the gate fails if `playCeremony` / `ceremonyTap` /
  `stopCeremony` / `ceremonyOn` come back.
  **First time only** is `prefs.revealed` — `'chest:<id>'` and `'key:<tier>'`, written the moment the reveal starts, so a reload mid-reveal never
  replays it. Testing's per-chest reset clears that chest's flag AND the flag of the key that chest is the reward for, which is Aiden's own
  exception: *"resetting the chest from Testing, which on this phone counts as a first time again."*
  **Reduce Motion** collapses the stage, the gifts and the settle into one `REVEAL.fadeMs` fade and still ends on the card. Nothing is skipped,
  only shortened — Apple expects it and the App Store review looks for it.
  **A moment that waits for a tap owns the hand-back.** Build 41 learned this when a chest ceremony landed inside a result interlude; a key
  becoming whole mid-run now plays a reveal that waits for a tap too, so the interlude's timer stands down and the reveal's Continue returns the
  result screen. Build 40's "the result comes back by itself once the moment has played" is reversed a second time.
- **New: what an unlock GIVES is a symbol, and it is the same symbol in three places (items 6 / 7 / 22).** `SYMBOLS` in `config/chests.js` is
  nine drawings in a 24 × 24 box; `symSvg()` in `ui/chest.js` is the only thing that turns one into markup. It rises out of the chest as it
  opens, stands beside that word on the map, and sits in the card's row — so the player connects the three by construction rather than by
  anyone remembering to keep them in step. `sym` on each `CHEST_WORDS` entry names it, and `giftsOf(id)` is the one list both the reveal and the
  card read. Each gift lands with `Snd.gift(i)`, `GIFT_FX` a step higher for each one after the first, so two or three arriving in turn read as
  a rising figure. "Tap to continue" is held back until the last one has landed (item 6's own line).
- **New: item 22's congratulations card.** Title in that chest's or key's colour; at most three lines of WHAT YOU DID (a chest: the modes count
  and the meter, or the key it needed; a key: its bars, the solo runs it took and the days since the first one); WHAT YOU GOT as the same
  symbols; one line of WHAT'S NEXT; and Continue, which is dead for `REVEAL.cardGo` so a tap left over from the animation cannot close it
  unseen. No sound of its own — the reveal's last chord is still ringing. The card is never drawn over the animation: it is the beat after it.
- **AMENDED: the two key states (item 13).** Both wore the tier's golden glow, so a key 3% of the way along looked earned. `kdone` on `#s-key`
  is the whole of the difference. Without it: no radial ground, no drop shadow anywhere, the hub glyph in the tier's own `dim`, the spokes
  faint, a node lit only once its game is HOME, and no outer ring. With it: `KEY_FINISH` in `config/keys.js` — a scale, the tier's full tint and
  glow, a slow breathing pulse on the key and on its card at the top of the screen, and the ring drawn — each tier a step grander. The
  first-open reveal ENDS by settling into it, which is item 13's last line and the join between the two items.
- **AMENDED: v24 C.4 / C.6 — a key's background REPLACES the base (item 15).** Build 43 already drew a code layer per key, already matched it to
  that key's tempo and already unlocked it in Customise once the key was finished. What was wrong is what item 15 actually reports: the layer was
  drawn OVER the chosen design, so the Circuit's traces sat on the app's grid and two backgrounds moved against each other. `ui/atmosphere.js`
  now draws the stars and that key's layer and NOT the chosen design while a key layer is over — which is also exactly what a key background
  chosen in Customise already is, so the screen and the choice look the same. New art for Lantern and Thorn was **not** written; they have had
  their own layers since build 43. Each key's background is also one of the symbols its own chest pops out (item 15's last line).
- **New: a sound tied to an animation READS the animation (items 1 / 2).** `getComputedTiming().delay` off the element itself, never a second
  list of times — so the stylesheet keeps the only copy of every timing and a re-tune cannot leave a sound behind. The title plays `TITLE_FX`
  under each of its four beats, the title line heavier; the map's first open plays `MAP_FX`, one soft sound per game so the first look previews
  what the seven sound like, with a locked tile the same sound down `MAP_LOCKED.semi` semitones and quieter, and the chests their own note at
  the end. First open only; after that the map comes in silent. The same family lands each game's node on a key reveal, which is what keeps the
  two items one family rather than two.
  **The build catch, accepted as item 1 writes it:** a phone browser blocks audio until the player has tapped once, so the very first title of a
  web session is silent. It works the second time the title is seen and in the App Store build, and it is not faked with a hidden tap.
- **New: the About screen's eight message slots (item 23).** `config/messages.js` — id, title, what opens it, file, captions — in unlock order:
  the intro, then the Games chest, the Lantern, the Key chest, the Circuit, the Pro chest, the Thorn, the Thorns chest. `by` is ONE of
  `{chest:'…'}` or `{key:'…'}`, never both, so `msgOpen()` in `progress/key.js` is the whole rule; it lives there and not on the screen because
  the congratulations card asks it too and a screen may not import a screen (A4). A locked row says what opens it and nothing about what is in
  it; an open row with no clip shows the "video coming soon" frame; an open row with a clip is tap-to-play, built in place, `playsinline`, with
  a captions track, and never full screen or autoplaying. A clip arrives by filling in a file name — no code change. `prefs.msgSeen` takes L8's
  green dot off the About row. Aiden records the eight clips himself (his decision, 2026-09-16).

### Build 48 — v26 items 1, 3, 7, 9, 10, 11 and item 12's three fixes (make the flow work and every screen agree)

- **AMENDED: the meter is 0–300 (items 7 / 9 / 12).** Aiden's meter is "the continuous 0–300% figure" and the Pro key is 200% on it. With build
  40's modes band the Pro key landed on 300%, so the map said "203% · opens at 300%" on a Pro chest that was one key short — which read as a
  threshold off by a tier. `METER.modes` is false (L.10b's one flag): key 1 is 0–100 (the Key chest at 100), Pro 100–200 (the Pro chest at 200),
  Author 200–300 (the Thorns chest at 300). The Games chest is not on the meter at all; it opens on every game mode, a count and not a percentage.
- **AMENDED: one saved value, no override (items 7 / 12).** Chest state, key state and the meter are the bars and the chests in the store, and
  every screen reads them through `progress/key.js`. `prefs.devMeter` is retired and dropped on load: it let the meter read a figure nothing had
  earned. `meter()` is `meterReal()`.
- **AMENDED: Testing plays the game forward (items 7 / 12, v21 G.8 and v23 L.8f).** A chest's switch plays forward until THAT chest is ready —
  every chest before it filled the way play fills it and opened the way a tap opens it (`devReach`, `devOpen`) — and never opens the chest itself.
  Taking a switch off is its reset. A reset backs that chest out with every chest after it and the key that opens it (`devBack`), so no chest is
  ever open behind a shut one. "Set meter to N%" backs the keys out and plays forward to N (`devMeterTo`), 0–300. A bar is cleared with
  `checkKey`'s own write and the key achievements it completes are banked (`checkKeyAch`). Build 37's snapshot-and-restore and build 40's
  override are gone, and so is "meter · as earned". OPEN EVERYTHING and SUPPORTER are unchanged: two flags every gate honours (#411) that store
  no progress.
- **AMENDED: a key's reveal is never cut off, ends by itself, and has no card (items 10 / 11; amends build 46's four beats for keys).** What cut it
  was the reveal's own settle: the key lit at `hubAt` and the stage settled at `settleAt` — 600ms into a 2.9s earn moment on key 1, 800ms of 3.8s
  on Pro, 900ms of 4.8s on Author — and the settle takes `kwhole` off. `keyStage` now reads every animation `kwhole` starts and hands the reveal a
  `hold()` on their finished promises; `ui/reveal.js` waits for it before the settle, and `settleAt` / `ms` can only move later. A key's reveal is
  `auto`: no "tap to continue", no congratulations card; it ends by itself and the screen under it says only "tap the key to open the Key chest"
  (hidden while the reveal plays, `kdue` / `krev`). The chest's card is the only card in the flow. Taps and Back are swallowed until it ends.
- **AMENDED: the key opens its chest (item 11; amends v24 C.1 for the key).** Tapping a whole key's hub — or the quiet screen's key — opens its
  ready chest at once. A ready chest in the quiet screen's row of chests still asks. Inside a run's key interlude the key waits for its tap (or
  Back, which hands back); the chest's card then hands back to that run's result screen. A chest tapped on the map while its key's reveal is unseen
  still opens after the reveal, with no tap between: the player already asked.
- **AMENDED: locked chests say what opens them in words (item 12).** "Earn the key", "Earn the Pro key", "Earn the Author key" (`GRID.chestEarn`)
  whether the chest ahead is shut or not; no percentage on the map. The Games chest keeps its count of modes. `GRID.chestMeter` is retired.
- **AMENDED: one figure per thing (items 7 / 9).** The Keys screen's line is "1 of 30"; each key card keeps its own share; the home menu carries the
  0–300 total and is the one place it is printed. The Games chest's stage and card show no percentage. The key cards lose the italic theme name —
  Lantern, Circuit and Thorn name backgrounds and music, not keys.
- **AMENDED: every home menu item is green until opened once (item 3, v20 D.5 finally applied).** `prefs.menuOpened`, by screen, written when the
  item's screen is opened FROM THE MENU (the row, or the meter line for Keys); available means not dimmed by the first run and not locked behind
  the Games chest. Fresh game clears it; an older profile takes the map from `gridSeen`, Keys from `keysSeen`, Customise from `cusSeen`. Only
  Customise and Keys had ever had the green, each through a flag its screen set on any show. Testing's row is never green.
- **AMENDED: the version label is on the home menu only (item 12; supersedes v25 item 4's and item 10's per-screen fixes).** `#build` is hidden on
  every other screen. The About screen's own line (build, label, date) is A6's and stays; A6 was not quoted.
- **AMENDED: Go / No-go · Set's HUD (item 1).** A solo Set shows the big counter and the goal box only: no "round 1 of 5 · 0 of 3", no mode label.
  A Streak keeps its budget line; pass & play keeps whose turn it is.

### Aiden's answers to build 48's questions — 2026-09-17, held uncommitted and shipped with build 49

- **REVERSED: tapping a finished key asks again (amends build 48's item 11 amendment; v24 C.1 as it was).** Aiden: "Tapping a completed key must ask
  whether to open its chest." The whole key's hub and the quiet screen's key both call `askOpen`; `data-direct` is gone. The reveal still ends by
  itself on "tap the key to open the Key chest", and that tap now leads to the ask.
- **REMOVED: the quiet key screen's row of four chests (L.10a's row).** Aiden: it "can go if it's now redundant". It was: its one button was the
  ready Games chest, which the key asks for, and the map shows all four chests. `chestRow()` and the `.kch` rules are deleted.
- **RENAMED: the first key is the Skill key (item 12's wording, then its card).** Aiden: not "Earn the key" — "Starter key" first, then "Let's
  make it the skill key" when asked whether the card should match. `name` in `config/keys.js` ("The key" → "Skill key") carries the card, the key
  screen title and the key achievement names; `GRID.chestEarn.key` is "Earn the Skill key", the Games chest's word SKILL KEY, and the Progress
  headers `TIERS.key1` / `UNLOCKS_SCREEN.keys` "Skill key". Pro and Author wording unchanged; the Key chest keeps its name.

### Build 49 — v26 items 2, 4, 5, 6, 8, 12 (the reward symbols), 13 and §B1 (the unlock experience, and the sound notes)

- **AMENDED: the gifts come OUT of the chest (item 6, amending v25 item 6).** `ui/reveal.js` lays the row of rewards out once, close under the chest
  (`REVEAL.under`), off the stage's `anchor()` — where `chestStage()` in `ui/ceremony.js` says the chest's middle, lid, top and foot are on the host — and
  draws each reward's flight backwards from where it rests: out of the lid, up and to the right, down past its place and round into it, a cubic curve
  sampled into eleven custom properties (`--x0`–`--x10`, `--y0`–`--y10`) that one keyframe list, `rgiftfly`, walks. They leave `REVEAL.giftGap` (400ms)
  apart, at 64px (twice build 46's 34). `GIFT_LOOK` in `config/chests.js` makes each chest grander than the one before: how far the flight swings,
  how big it swells, a turn on the way, its glow, and the rings and sparks it lands with in the chest's colour. The chest's own line ("Key chest opened",
  and a key chest's count-up) waits for the last reward to land (`textAt`), and "tap to continue" waits for both (`textMs`). A small pop leaves with each
  reward (`Snd.pop(i)`, `POP_FX`) and "an unlock lands" lands it (`Snd.gift(i)`, unchanged) — both read off that reward's own animation.
- **AMENDED: the congratulations card (item 8, amending v25 item 22).** `CARD` in `config/copy.js`: `title` "Congratulations" in the chest's own colour,
  one `you` line per chest ("You unlocked all {total} game modes!"), one `next` line ("Next: can you open the {chest}?", or `nDone`), the video
  button and Continue. No what you did, no what you got, no headings, no percentage. It sits BELOW the rewards; on a phone too short for it the chest
  and its rewards lift by exactly what the card needs (`--lift`), never past the top of the chest.
- **ADDED: every chest gives the About video it opens (item 5).** Not listed in `CHEST_WORDS`: `ui/chest.js` reads the slot whose `by.chest` is that
  chest out of `config/messages.js` and adds it last, `MSG.reward` over its title, symbol `video`, `to` `msg:<slot>`. It flies out of the chest,
  stands in the map's list and is the card's "A message from Aiden"; each goes to that slot on About, which plays it or, while it is a placeholder,
  picks the row out. `HIDE_UNRECORDED` in `config/build.js` is the before-release switch that drops all three while a slot has no clip. Keys that open
  a slot do not show it: a key's reveal has had no card or gifts since build 48 (item 11).
- **AMENDED: the symbols take colour, and a key is its real shape (item 12).** `SYMBOLS.key` / `keypro` / `keyauthor` name a tier (`key`) and `symSvg()`
  draws that key's own `KEY_ART` glyph in its tint; a symbol with `col` wears it; every other symbol wears the colour of the chest it came from (its
  band's). The map's list draws them at 18px, and a long video title may take two lines.
- **ADDED: two Gauntlet tiles (item 13, replacing the 2026-09-10 plan).** `GAUNTLETS` in `config/chests.js`: Gauntlet with the Key chest, Gauntlet II
  with the Pro chest. Each is a game tile in its chest's row, to the LEFT of it (the 4-column layout, with no cell on the left, takes the one past the
  chest's words), joined to it by a connector of its own; not on the chain's snake. Locked it is crossed out (`.gx`) with the padlock and `GAUNTLET.need`,
  and a tap says so; open it goes to `s-gauntlet` (`ui/screens/gauntlet.js`) — its title, "Coming soon" and Back, nothing else. A newly open Gauntlet
  arrives with L8's green and its own sound (`MAP_FX.gauntlet`). Drafted symbols: `gauntlet` a plain armoured glove, `gauntlet2` the same with spikes
  in the Pro key's theme colour. The Key chest's GAUNTLET and the Pro chest's GAUNTLET II go to the tile; the Thorns chest's HARD GAUNTLET is gone,
  so its reward is open again.
- **AMENDED: the map's first open, ever (item 2).** `MAP_INTRO` in `config/chests.js`: the seven games one at a time top to bottom, the two Gauntlets,
  then the four chests last — about 7s. Each tile's delay is `introAt()` in `ui/screens/pick.js`, its arrival `--tin`, and its sound is still read off
  its animation (`mapSounds`). No skip; once (`prefs.gridSeen`); Fresh game replays it. A game or Gauntlet newly open ARRIVES with its own sound too
  (`arrivalSounds`), and a result toast that unlocks a whole game is followed by that game's sound (`MAP_ON_UNLOCK_MS`). The catalogue's Key & unlock
  animations section replays the sequence with its sounds and the speed buttons (`REF.mapIntro`).
- **ADDED: an unwatched clip pulses (item 4).** `unwatched` on a row in `ui/screens/about.js` that is unlocked, has a `file` and is not in `prefs.msgSeen`:
  `msgpulse` in the "not seen yet" green until play is tapped. Placeholders and locked slots never pulse. The About menu row's green while one waits was
  already `msgDot()`; there is no separate dot.
- **§B1 — the sounds.** Title whooshes longer with a slowly beating high pair; seven count-up whoosh versions at random (`WHOOSH_VARIANTS`); Sigh held —
  `held` on its `ITEMS.snd` row, off Customise and out of `cleanPrefs`' list, and Grand tour no longer unlocks it (the achievement is Aiden's to
  choose); the Sigh miss raised to 520 Hz; the Key chest's effects rebuilt from key 1's theme (its first two chords, its opening chord held) and its
  sting cut 0.3s later; the Pro chest's effects doubled in weight and its sting cut 0.3s later onto a wider chord; Thorn earned with more layers; the
  four result sounds climbing (Meh. unchanged, Good. a rising third, Great! build 45's Amazing!, Amazing! four notes ending highest), each with bass;
  a round's sound its own list, `ROUND_FX`, one note shorter than the result's with bass under it; and the result's tier waits until End of run has
  landed (`Snd.endLeft()`) — it had been playing 250ms into it. Full text in `docs/MUSIC.md`.

### Build 50 — v26 §B2 (the round formats: one shape difficulty standard)

- **ADDED: A9, the shape difficulty standard (ARCHITECTURE.md).** Aiden: *"figure out a standard and let's stick with it."* `config/shapes.js`:
  `SHAPES` is every shape any game deals, once, with its `word` (and `many` where an s is wrong), its tier (`easy` / `medium` / `hard`) and `sym` (the
  old `ESTIMATE.SYM`, now on the shape). `TIER` weighs them 1 / 2 / 3. `DEALS`, keyed `game:mode`, gives each shape-dealing game its `pool`, its
  round `bands` (`to`, a `mix` of tiers that fills the band's rounds, a `load`, and `add` for shapes that join the pool from that band on) and its
  SETTING with a value per tier: Grow the target's size (a third of that shape's size range), Cut the share asked (50/45/40 · 35/30/25 · 20/15/10),
  Go / No-go time on screen (a third of `NOGO_DWELL`'s ± spread, the long third easy), Count the target count (a third of the round's band, the
  low third easy), Find the crowd (× 0.85 / 1 / 1.15). `games/_shared/deal.js` is the one dealer: a band's mix is a deck shuffled per run, so
  every run of a Set deals exactly that mix; a shape is not dealt again until its tier has run out and never twice running (a tier whose only
  shape was just dealt swaps with a later card); the setting's tier is `load − shape tier`, clamped to 1–3; a Streak past the last band deals
  the last band again; and `at(k)` is cached, so both players of a pass & play run get the same deal for their turn N.
- **ADDED: one drawing per shape.** `games/_shared/shapes.js` gained `svg(name)` — the FIXED version of a shape (a five-point star, a set ring and
  spiral) as a 100-unit `evenodd` svg, made once — and `shapeI(name)`, the rule bar's mark, which replaces core.js's class-name `shapeI`. Go /
  No-go's pane, Count's and Find's crowds (`shapeHtml` in `round.js`) and every rule bar draw it; Estimate still deals varied instances.
  `styles/app.css` has no shape clip paths left; a found shape's ring is a stroke round its own outline, not a square box-shadow.
- **AMENDED: Estimate · Grow.** Line and rects are gone ("too like tetris and stairs"); spiral, heart and cat are in (heart and cat are Claude's
  "two more fun shapes", for Aiden to judge). The target's shape and size come from the dealer. An even round's own shape is a different one of
  similar fill and the same tier where the pool has one, and can no longer fall back to the target's own shape. **Pass & play counts each
  player's own turns** (`turn()`): it read the shared round counter, so Player 1 always grew the same shape and Player 2 always a different one.
  Rounds 1, 3 and 5 were already the same-shape rounds of a solo run — the note is kept, nothing moved.
- **AMENDED: Estimate · Cut.** `ESTIMATE.CUT_POOLS` and `CUT_SHARES` are retired into `DEALS 'hold:cut'`: five two-round bands, rounds 1–2 an
  easy and a hard shape, the hard one asked about a half. 50% is asked again, and still never of a shape with an axis of symmetry (v13 6.4).
- **AMENDED: Reaction · Go / No-go (#444), L5 amended at Aiden's direct request (his own board note, the way build 44 took F.1 / F.6).** L5's "on
  five shapes (C.3)" is now the nine of `DEALS 'reaction:nogo'`: circle, square, triangle, diamond, bar, plus, ring, crescent, spiral. The hexagon
  is gone; the square is never turned (at 45° it WAS the diamond), and `NOGO_TURNS` lives in `config/shapes.js`; the diamond is drawn 60% as wide
  as it is tall. Rounds 1–2 deal an easy and a medium go shape, rounds 3–5 one of each tier; the dwell stays inside 980 ± 180 (Set) and
  1330 ± 180 (Streak), in the third the deal pairs with the go shape. `SHAPE_WORD` is retired. In pass & play the dealer lives for the run.
- **AMENDED: Spot · Count.** Rounds 1–2 deal circle, square and triangle; bar, plus and star join from round 3 (`add`); decoys are the rest of the
  pool. The target count is dealt in the third of the band the shape pairs with; a dip round still deals the floor. Later rounds stay up longer:
  `SPOT_RAMP.flashRound` (25ms) a round from `flashRoundFrom` (3), inside `flashCap` (guesses).
- **AMENDED: Spot · Find.** The pool grows every two rounds — bar and plus, star and ring, crescent and diamond, then spiral — and the crowd is the
  round's count × the odd shape's setting factor. Find versus keeps its own three shapes (`VS_SHAPES`). The triangle's id is `triangle` everywhere.
- **ADDED: Timing · Hidden's 45° wall (part of #450).** A solo Streak deals `HIDDEN.diag` (0.5) of its rounds from `hiddenDiag()`: the wall is square
  to one of the field's four diagonals and the ball travels that diagonal turned off it by no more than `HIDDEN.diagTilt` (10°), along a chord of
  the field in its turned direction so it cannot leave the screen. The pace, the time behind the wall, the marker and the millisecond score are
  `hidden()`'s own; both share `hiddenGo()`. A Set draws none of it (B.5).

### Amended at build 51 (batch 20, names, chests, keys and sounds: FEEDBACK-v27 items 1, 2, 3, 4, 5, 6, 12, 13, 14), 2026-09-18

Nothing before this entry is rewritten: the earlier entries keep the names they were written with, and "Key chest" and
"Thorns chest" in them mean what are now the Skill and Author chests.

- **AMENDED (v23 L.10's "Games, Key, Pro, Thorns"): THE FOUR CHESTS ARE GAMES / SKILL / PRO / AUTHOR (v27 items 3 / 4).** The Skill key opens the
  Skill chest and the Author key the Author chest, which is R2 below in copy. `GRID.chest` in `config/copy.js` is now the ONE place any of the four
  is spelled: `index.html` carries no label (`ui/screens/pick.js` fills every `.name` from it), a locked Messages row composes its line from its own
  `by` (`needOf()` in `ui/screens/about.js`, through `GRID.chestNeed` and `MSG.keyNeed`), and the Gauntlet toast fills `GRID.chestOpenIt`. The ids
  `key` and `thorns` do NOT move — they are store keys (`core/store.js` v4 → v5) and config ids, and renaming them would retire every saved
  profile's chests for a copy change. Three Messages titles that still called the backgrounds keys ("The Lantern is whole") name their key instead;
  item 8 drops those three rows at build 52 regardless.
- **R2, ADDED (v27 items 4 / 13), amending L.9a's one-METER_BANDS-row-per-chest: A CHEST MATCHES THE KEY THAT OPENS IT — name, colour and design
  language.** `col` on a `CHEST_LOOK` row is the chest's colour, read through `chestCol()` in `ui/chest.js` by the sprite, the ceremony's `--cc`,
  the spill's particles, a reward symbol with no colour of its own and the congratulations card; the meter keeps its own bands and is not
  recoloured. The gold banded chest — heavier lid, six fittings, the shimmer along them — moves from Pro to **Skill**, because the Skill key is
  gold; the **Pro** chest is redrawn from the Pro key: its `tint` `#BFE6FF`, the key's ring and its two antennae on the lid, right-angled traces
  with square nodes across the box, and a current running the traces as its idle (`circuit`, new). A look's `shim` is the colour a shimmer or a
  current runs in, so the stylesheet no longer names a gold. Author already matched its key; Games has no key and keeps its plain grey outline.
- **R1, ADDED (v27 item 2), narrowing 2026-09-16's "the tiles are on the map from the start, locked": A SECRET MAY BE KNOWN TO EXIST, NEVER WHAT IT
  IS.** A hidden thing shows nothing at all — no row, no tile, no lock, no "???", no connector and no gap — while a total that includes it still
  says so. Applied to the two Gauntlets: until its chest is opened a tile is `hidden`, `layoutGrid` reserves it no cell, `drawLines` draws it no
  connector, and `introAt` counts only the Gauntlets actually drawn, so the map's first open has no silent beat where one would have been (eleven
  tiles on a new profile, not thirteen). Each ARRIVES as part of its chest's own reward moment: the paint that finds the chest open is the paint
  that spills its words, so the tile comes in on the spill's beat (`gauntarrive`, `--gin` = `SPILL.delay`) rather than the .1s every other arrival
  uses. `GAUNTLET.need` is retired with the padlock it was written for.
- **AMENDED (B.20 → v24 C.5 → v25 item 11): EARNING A KEY IS ONE ANIMATION PER TIER, TWO SECONDS AT MOST (v27 item 14).** Build 43's earn moment
  (2.9 / 3.8 / 4.8s) and build 46's first-open reveal around it (4 / 5 / 6.6s) nested to 6.3s, 8.0s and 10.5s with nothing tappable; `KEY_REVEAL` is
  retired and `KEY_EARN` replaces both. It is `ms` and a list of NAMED STEPS in the ceremony's shape — `spokes` / `spin` / `snap` / `ring` / `drop`
  / `slam` / `crack` / `thorns` / `flash` — `keyStage()` in `ui/screens/key.js` draws a step by its name and nothing else, and every time goes on
  the screen as `--st-<name>-at` / `--st-<name>-ms`. **At least three quarters of it is movement**: `flash` (`EARN_GLOW`) is the only step that is
  not, it is 240–280ms, and the gate fails a tier over 2000ms or under .75. **A tap skips to the end** — the stage offers `skip()`, `ui/reveal.js`
  takes it on a tap before the hold (a chest's ceremony offers none and is still unskippable), and every animation the start beat registered is run
  to its last frame at once, so the key finishes upright and lit. **The screen never locks**: `keyReveal()` drops the input lock as the animation
  starts, and Back is still refused by `onBack` while a reveal is on. **The chest prompt waits for it**, which is the whole of the 2026-09-15
  complaint. Each step lands its own sound (`KEY_STEP_FX`, `Snd.keyStep`) except a spoke firing alone, which takes its own game's `MAP_FX`; the
  key's own `Snd.keyEarn` lands on the flash. Skill: the seven spokes fire inward one at a time, then the key spins and clicks upright. Pro: all
  seven at once, then a quarter-turn snap with a hard stop and a little overshoot, and the ring flashes. Author: the key drops and slams into the
  centre, the ring cracks outward with a screen shake, thorns flick out round the rim. A key's reveal also ends the frame its animation does —
  `REVEAL.giftAt`'s beat was for rewards a key hands over none of.
- **AMENDED (v25 item 1): EACH TITLE LINE IS ONE IMPACT, ON THE FRAME IT STARTS (v27 item 1).** The low swelling whoosh builds 46–50 played had a
  400–600ms attack, so its loudest moment arrived half a second after it was fired and read late however it was triggered. `TITLE_FX` is now an
  impact per beat — every layer opens in 1–4ms and falls away, a low body with one quiet high tick, the title line heavier with a sub under it —
  and `titleSounds()` in `ui/screens/menu.js` schedules off the animation's own `startTime` on the document timeline rather than off a timer taken
  after the style recalc.
- **AMENDED (v23 L.6's chest sounds): the Games chest's seven squares tick a step higher each (v27 item 5), and its rewards pop clear of its own
  chord (v27 item 6).** The ticks were never removed and never missing — all seven have fired since build 41, on the `uncross` step's own beat, and
  all seven were the same short note at one pitch, which under the sting read as one texture. They climb the Roots scale now and the seventh is a
  finish. The pops were firing too (the gate has asserted one per reward since build 49) and were masked: 170 Hz for 80ms, landing under that
  chest's closing chord and its sting's tail. `POP_FX.by` lifts one chest's pops and `POP_FX.bright` brightens a KEY reward's, and **only `games`
  has a row** — v27 item 12 approved the Pro chest's sounds exactly as they are, so a shared-code change is scoped to the chest item 6 names.

### Amended at build 53 (batch 21, the bugs, the screens and the reward moments: FEEDBACK-v28 items 1–10 and 12–17), 2026-09-18

Items 11 and 18 — the Gauntlets as real runs — are build 54 and nothing here touches them beyond the rename.

- **AMENDED (v23 L.8a / L.10b's "ONE METER, 0–300"): WHAT A PLAYER IS SHOWN IS 0–100, AND IT CANNOT PASS 100 (v28 item 9).** The meter itself is
  untouched — three bands of 100, one per key, and every chest threshold, band colour and Testing figure still reads it. What was wrong is what was
  PRINTED. `meterPct()` beside `meter()` in `progress/key.js` is the meter over the top of the meter, rounded and clamped, and it is the one thing
  any surface prints; `meter()` is what the app reasons with. WHERE THE 300 CAME FROM: not real play. `devReach('thorns')` — Testing's Author-chest
  switch — fills every bar of all three keys and opens the three chests before it, which is 300 by construction, and it leaves the Author chest
  READY rather than open, so the old figure could read its own maximum with a chest still shut. Build 46's 103% / 203% are the same arithmetic
  three bars into the next band. 100 shown now means every bar on every key is cleared; the last chest is a reward for that, not more of it. The
  LOOK still reads the raw figure, so the bands and their glows are unchanged. Testing is the one screen working in the raw meter and says so
  ("250 of 300 raw · 83% shown").

- **AMENDED (v18 B.28's "Customise's music is ONE row, and it is the track"): THE ROW IS THE WHOLE MUSIC CHOICE, AND THE EVERYWHERE ROW IS RETIRED
  (v28 items 2 / 3).** Build 42 put an EVERYWHERE row above the tracks for the same decision said a second way; Aiden's line was "I don't know why
  they're separate". One row now: this game's three tracks, then one track per key. Picking a game track is per game exactly as before; picking a
  key track is that theme for every run AND for the MENU LOOP — `menuTrack()` in `audio.js`, which retires build 42's "the menu loop ignores it
  (guess)". It is the SAME field build 42 wrote, `prefs.everywhere`, so the key screen's SET THIS MUSIC and this row still cannot disagree.
  WHAT OPENS A KEY TRACK IS THE KEY, NOT ITS CHEST: `keyFinished()`, strictly earlier than the chest that key opens, and `everywhere()` in
  `core/store.js` asks it through a setter bound from `progress/key.js` (`setKeyDone`), because core/ sits below progress/ in the graph and ESM
  imports are read-only. A locked key track says what opens it UNDER its row (B.30) — which it may now do, because v21 G.1 put all three keys on
  screen from the first visit, so naming one hides nothing (A.1). ITEM 3: the KEY is named Skill key / Pro / Author from `config/keys.js` and the
  TRACK is titled Lantern / Circuit / Thorns from that key's `theme`. Before this build the Everywhere row printed the TRACK'S OWN NAME for the key
  and those names were Key / Pro / Thorns, which is exactly what Aiden read on that screen. `CUSTOM.perGame`, `openChest` and `themeOn` are retired.

- **NEW — R3: A LIST APPEARS THE MOMENT IT IS ASKED FOR (v28 item 1).** No entry animation on any tab or filter of Progress. `achin`'s slide and its
  70ms stagger are gone, the shared `rise` came off `.ach .a.lock` and `.ach h4`, and L8's green first-seen mark keeps its fade but no longer
  travels — the green is a FACT, not an entrance. Motion belongs to rewards, not to menus. **SECRET SITS BELOW EVERY OTHER TIER in every filter**
  (the key order of `TIERS` in `config/copy.js` IS the render order, so there is no second list) **and is drawn like a locked ordinary row, never in
  the cue red** — L.2's rule finally applied to the one group that broke it. **A tier heading STACKS its description under its title:** it was
  `display:flex; justify-content:space-between`, so on a phone the title sat left and a long description was pushed hard against the right edge and
  clipped by the list's own `overflow-x:hidden`. Aiden photographed it mid-list and asked whether it was a mid-slide artefact; it is not — it
  settles like that every time.

- **NEW: EACH PROGRESS TAB SAYS HOW MUCH OF ITSELF IS DONE (v28 item 4).** One `N of M unlocked` line where four lines of grey helper text were —
  `unlHint`, `culHint`, `achHint`, `culLocked` and `UNLOCKS_SCREEN.lede`, all retired, because none of them said anything a row does not say by
  being a row. Customise unlocks already counted per section ("Target colours · 1/3") and its tab line is the sum. On Achievements the total
  LEAVES SECRET OUT until one has been found (R1 — the line may never say how many secrets exist) and the count follows the filter, because it
  sits under the filter row.

- **NEW: EVERY CUSTOMISE-UNLOCK ROW SHOWS THE THING IT UNLOCKS (v28 item 6).** `unlockArt()` in `progress.js`: a colour its swatch (the cut-piece
  colour joins them — it is a colour and had none), a background the SAME `bg-<v>` tile the Customise screen's Background row draws (no new art),
  a sound pack or a scale a speaker, the colour wheel its wheel. **Tapping an earned sound row plays THAT pack or THAT scale once** — `Snd.hit(pack)`
  and `Snd.scaleHear(which)` take an id now — before it opens Customise with the item ringed. A locked row is silent: the sound is the reward. The
  rule generalises — anything that unlocks a usable thing shows it, Gauntlets and cosmetic sets included when they exist.

- **AMENDED (v15 3.10's "Lead only, Blind untouched by intent"): EVERY QUICK TAP AND DOTS MODE SHOWS ITS FIRST TARGET DURING THE COUNTDOWN
  (v28 item 7).** `precount()` on both engines deals and shows it on "1" of the 3-2-1, and `begin()` honours a `preset` flag so `start()` never
  re-deals it out from under the player. Every length. THERE ARE NO EXCEPTIONS and the two the feedback guessed at are both wrong: Blind hides the
  lead RING, not the dot ("Tap the dots as they appear" is its own line), and Quick Tap's "eyes shut" is the achievement `qt_eyes`, not a mode.
  Nothing can be tapped early — `armed` is false until `start()`.

- **NEW: THE SUBTITLE UNDER NO EXCUSES IS GONE (v28 item 8).** `#menu-tag` ("unlock them all") on the MENU, with its `menufade`. It was never part
  of the title SEQUENCE, so L1 is untouched by it; the title line keeps its build-51 impact.

- **AMENDED (v26 item 13's GAUNTLET / GAUNTLET II): THE TWO ARE GAUNTLET MINI AND GAUNTLET MEGA (v28 item 10).** Aiden dictated "from Gauntlet Mini
  and Gauntlet Mega" and it is read as "to". `GAUNTLET.name` in `config/copy.js` is the ONE spelling: the map tiles, the chest word that brings each
  one in (`gaunt` on its `CHEST_WORDS` row, composed in `ui/chest.js` in capitals like every other word), the Messages rows and their video titles
  (`gaunt` on the slot, composed by `msgTitle()` in `progress/key.js`), the placeholder screen, Testing and the catalogue all read it. **The ids
  `g1` / `g2` do not move** — they are store keys (`prefs.gauntSeen`) and a saved profile must not reset. One consequence: two reward words are two
  words wide, so a chest word may WRAP to a second line; L.11d's one-line requirement goes and its real constraint stays — every word fits its cell,
  stays on the phone, and takes at most two lines (three where a `tba` row carries its own "not built yet").

- **NEW, extending R2: A CHEST OPENED BY A KEY UNLOCKS; IT NEVER BREAKS — AND THE GAMES CHEST IS THE ONE THAT BREAKS (v28 items 13 / 16).** Aiden
  played build 51 and saw the PRO chest open on jagged crack symbols and a scatter of coloured swatches: the wrong metaphor twice over, because the
  Pro KEY is what opens it. R2 already says a chest matches the key that opens it; item 13 extends it to the OPENING itself. Skill, Pro and Author
  now run ONE ceremony — `assemble` · `turn` · `lid` · `spill`, the cleared bars flying in to become that key, the key turning in the lock, the lid
  lifting, light rising — each in its own key's colour (`chestCol`) and its own key's glyph (`KEY_ART`, read off `CHESTS.needs` so nothing is named
  twice), 4.0 / 5.0 / 6.0s. `shake` / `cracks` / `burst` / `scatter` and `black` / `spikes` / `split` / `widen` / `recede` are RETIRED, and
  `CEREMONY_FX.swatch` with them: item 16's "a bunch of colours that don't need to be there" — no chest opens in any colour but the page's ink and
  its key's. THE BREAKING MOVED TO THE CHEST NO KEY OPENS: `CHEST_LOOK.games.cracks` is seven crack paths in the sprite's own 40 × 32 box,
  `crackCount()` in `progress/key.js` is how many GAMES are finished (every mode of that game unlocked — the same count the chest itself waits for,
  so seven games finished and the chest ready are the same moment by construction), and `ui/chest.js` draws the first N on every surface the sprite
  appears on, so **the map keeps them between sessions without storing them**. A crack that has just ARRIVED draws itself on with the chest's own
  tick (`prefs.cracked` exists only so one never arrives twice; an OPEN chest records and never replays them — L.9b says nothing on a settled map
  animates but a READY chest's idle). The seventh bursts it, and the Games chest's own ceremony draws the seventh in and bursts it the same way.
  WHAT WAS REUSED, as item 13 asks: the crack ART is the Pro chest's own jagged hand, re-placed rather than redrawn; the crack SOUND is
  `CHEST_FX.games`'s first event — the tick that already ticks off its seven squares — with a low thump under it, a tone higher each crack
  (`CRACK_FX`); the BURST is that chest's own 1.8s pop and 2.1s triad played together (`CRACK_BURST`). Nothing new was written for either.

- **NEW: THE CONGRATULATIONS SCREEN IS STAGED AND CELEBRATED (v28 items 12 / 17).** The card arrived all at once. Every block carries its own index
  and lands `REVEAL.cardStep` (170ms) after the one before — title, each line, the message, **Continue LAST** so it cannot be tapped before the
  message is on screen, five blocks and 940ms from the card arriving, inside item 12's "under a second". Item 22's dead second on Continue is
  unchanged and now starts after the blocks. **THE MESSAGE IS THE BUILD-52 PLAYER, POWERED OFF**: `msgPreview()` in `ui/chest.js` — the same 16:9
  picture in the same thin white rounded frame at the same 1px weight, glowing in the colour of the chest that unlocked the slot (`msgCol`), with a
  play mark in the middle and the slot's own title under it. It lives beside `chestCol()` because the card (`ui/reveal.js`) and the Messages list
  (`ui/screens/about.js`) are a module and a screen and neither may import the other (A4). It reached the congratulations card after all four chests
  and every row of the Messages list, placeholders included; the reward that FLIES out of the chest and the word beside the chest on the map are
  unchanged — those are one symbol in a row of symbols, not a moment carrying a message. **CONFETTI AND ONE CELEBRATION SOUND** fire on the title's
  beat, before the message row: `CONFETTI` in `config/chests.js` and `CHEER_FX` in `config/audio.js`, different per chest and escalating Games →
  Skill → Pro → Author. Monochrome geometric pieces in that chest's own colour — the seven game squares for Games, shards of the key for the other
  three, 7 / 16 / 26 / 36, falling longer and spinning further each tier — never rainbow paper, which would put back the colour item 16 has just
  taken out. The four sounds are built from the tick, the reward pop and the gift landing already in the app, each over that key's own root, and the
  gate holds them apart from the unlock sound, the achievement click and a key's earn.

- **AMENDED (v27 item 14's 2.0s, raised to 2.5s at build 52): THE CEILING IS GONE AND THE EARN MUSIC IS THE CLOCK (v28 item 15).** Item 15 is Aiden's
  own answer to the question build 52 put on the board: the Pro and Author animations are NOT too long — "they are too short for their music". The
  cause was arithmetic. `Snd.keyEarn` was fired on the closing FLASH, so the music STARTED near the end of the animation and rang on for seconds
  after it: Author was 2.30s of motion inside a 9.20s moment, 25% of it moving, which is the "roughly 30% of the wait" he played. Now the music is
  fired on the FIRST step, each tier's `ms` IS its own earn music's length, and two named steps carry the finale — `rise`, the whole key settling up
  into its finished state with its glow growing, continuous for the back half, and `land`, one hit on the final note (`KEY_STEP_FX.land`; `rise` has
  no row on purpose — a sound held under three seconds of settling would only fight the track). The ASSEMBLY is untouched: the Skill key's seven
  spokes and spin, the Pro key's one-by-one spokes with the current running the ring, the Author key's drop, slam, cracks and thorns, all exactly as
  Aiden approved them on 2026-09-18. Nothing was cut from the MOTION; what was trimmed is the track's TAIL, which is the order item 15 sets.
  LENGTHS, animation = music, against build 52's: Skill 1.70s of motion inside a 4.13s moment → **2.39s and the moment IS 2.39s** (music 2.80 →
  2.39); Pro 2.16s inside 6.35s → **4.10s** (4.45 → 4.10); Author 2.30s inside 9.20s → **6.70s** (7.20 → 6.70). Skill was not named in item 15; it
  had the same gap, so it is built the same way and said so in the outcome. THE GATE now asks three things instead of a ceiling: `ms` matches that
  tier's `KEY_EARN_FX` length within 150ms, every step but `flash` is movement and the movement span is at least .75 of `ms`, and the ASSEMBLY —
  everything before `rise` — is at least a quarter of `ms`, so a finale can never swamp the thing it is a finale to. A TAP STILL SKIPS TO THE END
  and the screen never locks, which is what makes a six-second moment acceptable at all.

- **NEW: THE MODE PICKER IS A BOTTOM SHEET, ANCHORED TO THE SCREEN (v28 item 14).** It was `position:absolute; bottom:0` inside `#s-pick`, WHICH IS A
  SCROLLER — so "the bottom" was the bottom of the map's CONTENT, not of the phone, and the sheet landed wherever the map happened to be scrolled
  to. That is what Aiden photographed: Spot tapped with the map scrolled to the chests, and the sheet sitting mid-screen with map above and below
  it. `fixed` now: the same place every time, in thumb reach, and a taller sheet (Sequence has more rows) does not move the anchor. `#s-pick` carries
  a `clip-path`, which clips a fixed descendant but does not reposition one, and the screen is `inset:0` anyway. Opening it scrolls the map so the
  tapped tile sits `SHEET_GAP` above the sheet with its amber outline showing (`tileAboveSheet()`, measured off the sheet's own box one frame after
  it is laid out), dims the map behind (`#mapdim`, `data-act="sheetclose"` — a tap closes the sheet OUTRIGHT rather than one stage back, which is
  what Back still does), and "tap empty space to go back" is gone with the hint that had to say it. One short slide-up, no per-row animation (R3).

- **NEW: ONE FULL NAME FOR THE SEQUENCE PRACTICE-FROM UNLOCK (v28 item 5).** It was not truncated by a layout — "Practice from" WAS the whole name
  in the code, in four places. `PROGRESS.practiceFrom` is the one spelling now and the Game unlocks row, the title screen's Next unlock box, the
  toast and the sheet's locked chip all compose off it. The words chosen, Cowork's and one line to change: **"Practice from a later note"** — the
  sheet offers off / 5 / 10 / 15, so that is what the unlock gives.

### Amended at build 54 (batch 21, the five decided items from the foot of FEEDBACK-v28), 2026-09-18

Aiden's answers to the build 53 outcome's "what you have to do" list. Two of the five were **no change** and are recorded
here so they are not reopened: **"Practice from a later note"** is the name of the Sequence unlock, kept as built; and
**"YOU'VE SEEN THEM ALL!"** stays the Games chest's reward caption, because it is his own message title and reads the way
he meant it. Items 11 and 18 — the Gauntlets as real runs — are still unbuilt and move to build 55.

- **AMENDED (v28 item 15's "the earn music is the clock"): THE PRO AND AUTHOR STINGS ARE SHORTER, AND THE SKIP WAITS 1.5
  SECONDS (v29 item 3).** The mechanism is untouched: the music still starts the clock, `ms` is still the music's own
  length, and the trim is still at the TRACK'S TAIL and never at the motion. What changed is the target — Aiden played
  build 53's 2.39 / 4.10 / 6.70s and asked for roughly 2.4 / 3.0 / 4.0. Skill was already there. Pro and Author are cut by
  moving their closing gestures earlier rather than shortening them, because **L.7a's key-theme rule sets a floor** —
  nothing under 700ms above 300 Hz, nothing above C5 under 1200ms — so a high voice cannot be trimmed to fit and has to
  arrive sooner. The assemblies do not move (Pro 1900ms, Author 1996ms), so the whole of the shortening lands on `rise`:
  1900 → 800 and 4300 → 1600. Both still clear the gate's assembly floor at 63% and 50% against the quarter it asks for.
  **AND THE SKIP NOW HAS A WINDOW.** Build 51's tap-to-skip took a tap at any point, including one landing in the first
  frames of a moment the player has just earned. `EARN_SKIP_AT` (1500ms, `config/keys.js`) is how long `earnSkip` answers
  false for; `ui/reveal.js` then swallows that tap the way it swallows every tap before a stage is done — it is not
  queued and it does not end the moment — and a tap after the window jumps straight to the finished state. The screen
  still never locks, and the longest anyone is now held by is 1.5s on any of the three.

- **AMENDED (v28 item 2's "a key track is the menu's music too"): ONE RULE FOR BOTH KINDS OF TRACK (v29 item 4).** Build 53
  read item 2 as being about key themes and left the menu on its own loop for a game's track, reasoning that a game's
  track belongs to that game and the menu is not a game. Aiden's item 4 overrules the reasoning: **the track picked in
  Customise, or by a key screen's SET THIS MUSIC, plays on the menu whether it is a key theme or one of a game's three.**
  A GAME SCREEN IS UNCHANGED and still plays its own — that is `pickRun` in `audio.js`, which reads `everywhere` and
  never this. Two fields, one writer each time: `everywhere` is still what every RUN plays and still gates a key theme on
  its key; **`prefs.menuTrack`** (`core/store.js`) is the resolved TRACKS id of whatever was last picked, written in the
  same breath by the same two controls, so the Music row and the front of the app cannot disagree. It is a preference, so
  Fresh game keeps it, and it took **no ladder step** — an absent field means "nothing picked yet" and `menuTrack()` falls
  back to the menu's own loop, which is what every existing profile plays today. A stored key theme is still read through
  `everywhere()`, so a key that is no longer earned can never play there either.

- **AMENDED (v28 item 13's "a chest opened by a key unlocks; it never breaks"): THE AUTHOR CHEST WEARS ITS OWN LANGUAGE
  OVER THAT MECHANISM (v29 item 5).** Item 13 was right about the Pro chest — the Pro key opens it, so jagged cracks were
  the wrong metaphor — but it also took the Author chest's black wash, spikes, split and widen out, and with them the one
  thing that made that chest match the Thorns key the way the other two match theirs. Item 5 puts them back **as a theme
  on top of the shared four steps, not instead of them**. `thorns` is now the one nine-step ceremony: `assemble` · `turn`
  · `lid` · `spill` first and in order, then `black` (the wash, on the assembly), `spikes` (growing in from both edges),
  `split` (the white line, on the lid) and `widen` / `recede` (carrying the spill). Every rule and path is build 52's,
  restored verbatim from git (`18a0858`), with **two deliberate differences**: `.cere[data-chest="thorns"] .cchestg
  {opacity:0}` and its late fade are NOT restored, because the chest has to be on screen for the bars to assemble onto it
  and the lid to lift; and `cwiden`'s middle keyframe is .55 rather than .9, because the panel now widens BEHIND a chest
  instead of replacing the scene and .9 white washed it out. `recede` came back with the spikes because it is the back
  half of the same animation. **Skill and Pro draw none of it** and are untouched, which is what item 5 asks for. The
  breaking (`shake` / `cracks` / `scatter` / `burst`) stays the Games chest's alone.


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
`pick`, `board`, `progress`, `key`, `about`, `testing`, `pass`, `result`, `lockbox`; `index.js`
imports them all. **`progress.js` is new at build 29 (v17 B.21)** — the merge of `unlocks.js` (build 23, v15 2.4) and
`achievements.js` into ONE screen with two tabs, Unlocks first because unlocks outrank achievements everywhere the next
thing is surfaced (2.2). **`customise.js` joined it at build 33 (v18 B.31)** and the screen is three tabs: *Game
unlocks · Customise · Achievements*. Aiden's reason — "anything that opens customisation goes under customise;
achievements is just extra" — is that nearly every cosmetic is paid for by an achievement one tab across, so the two
belong on one screen. Unlocks became **Game** unlocks in the same move: it holds the games, modes and lengths that gate
PLAY, and a cosmetic's requirement stays on the Achievements tab, so no requirement is written twice on a screen that
now shows all three. It is one file and not a host importing the other three **because A4 forbids a screen importing a
screen**, and the gate fails on it. Only the tab that is up is rendered; `prefs.progTab` remembers which, and takes
three values since build 33. Every line on the Game unlocks tab is read from `UNLOCKS` and `lenNeed` (L6); nothing about
a requirement is written in that file or in its markup. Its key row is a **shell** on purpose: what sits behind keys 2
and 3 is register #372 and is undecided, so it says only what is true today. `show('s-prog', {ach:id})` opens the
Achievements tab at a row — the toast does it; an earned achievement's payout is a tab change inside the screen now,
not a navigation. **The menu row and the screen id did not move**: B.31 names the tab titles, not the row, and Progress
covers unlocks and achievements outright while Customise is what they pay out. Keys stays its own menu item — it is the
second progression system and nothing about it is a picture of the first. **`key.js` is new at build 22 (v14 §9.2–9.7)** — the second progression system, its own menu item
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
| L5 | Every mode offers Set and Streak. **Streak = a cumulative budget** (Estimate 100%, **Stopwatch 25s, and 30s once round 10 is passed — v15 3.8, build 24**, Hidden 100px, **Flash 500ms over 150 (1000ms since v24 F.1, build 44), and an early tap spends 400ms flat and consumes the attempt — v14 C.1 / v15 3.5, build 24**, **Go / No-go 1000ms over 150 with a wrong tap costing 200ms — v14 C.2, build 22**, Count 5 miscounts (8 since v24 F.6, build 44, a placeholder), Find 10s); score = rounds completed, and every sheet reads "Highest round wins!". Set = a fixed number of rounds, scored by the line on the sheet. **Go / No-go's Set is a different currency and keeps its own number: a wrong tap ADDS 150ms to the average (v14 A.2), and three wrong taps end a Set. B.3 / C.3 forbid harmonising the two even though the numbers now sit close.** **A Streak has no wrong-tap run-ender at all — C.4 retired the three-wrong-taps contract rather than restoring it, because the budget is spent by the overspend on legal taps as well as by mistakes. The budget is the only limit.** **The round count and both description lines come from one table — `SET_COPY` in `config/games.js` (v14 §5, 2026-09-08)** — which the pick sheets, lock boxes and result screens all read through `GC` / `lenName` / `lenSub`. No game carries its own Set or Streak copy. |
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

**L5 amended at build 32 (FEEDBACK-v19 §C.1–§C.6, 2026-09-12, every line quoting it): Go / No-go's dealing and scoring, from
Aiden's play of build 31.** The Set's shape (five rounds of three) was right; what was wrong was inside a round.

- **(C.1 / C.2) A round is dealt as three SUB-ROUNDS — 1 to 5 decoys, drawn uniformly, then the target.** The target lands
  2nd to 6th in its sub-round with the mean near four, a five-deep wait is ordinary, and a correct tap is never followed by
  the target again because at least one decoy is dealt before the next one. Aiden: "it seems to only be appearing on like
  the second or third… it should be identifying when it IS their shape and seeing when it's not." The dealer is
  `dealRound()` in `games/reaction/index.js`, built rather than drawn-and-retried; `GO_PAD` and `GO_SPREAD` are retired. A
  pass & play turn keeps its fixed `PASS_TURNS[0]` shapes and gains C.1 constructively (targets non-adjacent).
- **(C.3) Five shapes.** `SHAPE_WORD` in `config/games.js` gained diamond and hexagon; a Set's five rounds are one shuffle
  of the five, so every round has a different target, and decoys come from the other four.
- **(C.4) The dwell is variable — base ± 180ms, uniform per shape — and NEVER QUICKER THAN BUILD 31.** Cowork's (guess)
  was 620 ± 180; build 31's fixed beats were 800 (Set) and 1150 (Streak), so the guess sat under both and contradicted
  the note it carried ("stay on screen longer"). Built as 980 ± 180 and 1330 ± 180 — the old beat is the floor, the range
  runs 360ms above it. FEATURES.md prints both; Aiden picks.
- **(C.5) THE 180ms GATE is a scoring rule, not an input window.** Every correct tap contributes max(0, reaction − 180)
  to the run's total; a tap at or under 180 adds nothing; nothing is forgiven, rejected or re-timed. Aiden named it for
  the Streak; it is on the Set as well (Cowork's recommendation) so the two modes score on one scale — the Set is the mean
  of every target's gated figure, an untapped target charged the dwell it was actually given, plus 150 a wrong tap. A
  scoring unit changed, so `RUN_SCHEMA` is 4 and `up3` retires the Go / No-go records; the Set bar is CONVERTED (380 → 200).
- **(C.6) The Streak budget is 3000ms and the Streak SCORES IN TARGETS answered, not shapes seen.** At the Set bar's own
  pace (380 raw, 200 over the gate) fifteen targets spend exactly 3000, so a Streak at that pace lasts one Set's worth.
  Shapes seen would have paid out on the luck of C.2's deal — one to five decoys a target — which a game of pure skill
  cannot keep; targets answered is the same number whatever the deal was. The Streak bar is set fresh at 15 targets.

**A.6.5 amended at build 32 (FEEDBACK-v18 §B.15): the FRONT of the app says `67% complete`, not `17 of 30 · 67%`.** The
cleared count stays on the keys screen, which is the screen a player acts on it from. B.17 re-bases the number once the
player steps into Pro (`frontPct()` in `progress/key.js`).

**The ring's cleared segment wears the TIER'S TINT since build 32 (FEEDBACK-v18 §B.22).** Build 30's stylesheet said a
cleared segment stays green because cleared is `--ok` everywhere (L8); the page Aiden approved lights Lantern warm,
Circuit white-blue and Thorn white, and B.22 asks for that page. Withdrawn for the ring only — green is still L8's
first-seen mark everywhere else, and the key screen's `.newthing` row flash is still green.

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

**Build 35 (batch 15, 2026-09-14) — one amendment and four quotes that change no value.**

- **L6 amended (register #415, quoted in FEEDBACK-v21 "Also carried"): Dots · Blind Marathon opens at 22 hits in a Blind
  Dash, down from 24.** `LEN_TEST['dots:blind'][2]` and its `LEN_RULES` sentence; Lead's 28 is untouched. The rung stays
  `LEN_LIVE` 1 — a hit count only grows.
- **L5 quoted (v20 D.3a) on the rate bar's 2.0s whole-run floor (`RATE_RUN_FLOOR`).** No value in the L5 row moved; the
  quote is recorded here so the number has a home. The live (rolling) reading is untouched.
- **L4 quoted (v21 F.4, G.7), applied not amended.** F.4: no player colour is ever written where customisation lives — none
  ever was (the stray colours were target swatches). G.7: the versus score pulse wears the scorer's own colour.
- **L10 quoted (v21 F.3, G.7), applied not amended.** The versus pad pulse and the score tick are presentation; nothing in
  them reaches a board, a key, a bar, an unlock or an achievement.
- **L8 NOT amended by v20 D.1, and why.** D.1 did not quote L8 and did not need to: the first-seen highlight still fires
  once and is still marked seen (`newMark` / `markSeen` are untouched, and D.5 still reads them). "Green until played" is a
  second, separate fact read off the run store, drawn with the same green line.

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
