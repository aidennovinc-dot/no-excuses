# No Excuses — the gate, build by build

**Moved out of `CLAUDE.md` 2026-09-12 (batch 14, S.1), text verbatim as of build 30.** What `npm test` asserts, listed
per build beside the test itself (`smoke.mjs`), and what `npm run review` produces. **Read it before extending the gate
for a build, or when an assertion fails and you need to know which feedback line it stands for.** Edit in place: every
build appends its own paragraph here, and `CLAUDE.md` keeps five lines.

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

**Batch 14 S.2 (v18, 2026-09-12, no build number change)** — statically: the hint line on About and `<div id="build">` wear the `v0.N` form and no `build N` form survives in either; the update bar names the build it found (`v0.N is ready — tap to reload`, read from `version.json`); the update-check constant and `version.json` stay the bare integer and all five still agree (A6). `npm run bump` writes the new form and still accepts the old one, so the first run after S.2 converts it.


**Build 31 (v18, batch 14 · §B.1–§B.14)** — statically: every `LEN_RULES` row declares which of its rungs may be judged
mid-run and **Reaction · Flash's Streak is not one of them**, `lenNextLive` reads that flag, and `run/run.js` banks a
length on the announcement as well as at the finish (B.8 / L6); a Go / No-go round is `GO_PER` correct taps with
`RULE_EVERY` retired, **no `wrong >= 3` test survives anywhere and no `nogoEnd(true)`**, and the mode line no longer
promises an ender (B.1b / B.1c / L5); the rule bar is drawn `atOnce` (B.1a); `CFG.hold` is one number and both Timing
and Reaction hold on it before draining (B.3c / B.7); `FLOW_AT` is 2.7, `FLOW_SPAN` is gone and the run's `want` is a
switch (B.9); Hidden scores `(t − markT) / v × 1000` and `HIDDEN`'s band, tilt and distance are all non-zero and read
only on a solo Streak (B.4 / B.5); **no pixel unit is left on Hidden anywhere**, and the two converted clearance bars are
1200ms and 1.40s (B.2 / B.4); `VERDICT_FX` holds exactly the four tier ids and `audio.js` keys it by tier alone with
nothing per game (B.11); `ROUND_AT` carries all eight round-based combinations, each three ascending ceilings (B.10);
the result screen passes an unlock's key to the toast and **the mid-run toast does not** (B.12). In the browser:
`lenNextLive` offers nothing for a Flash Set and still offers Quick Tap's and Estimate · Cut's rungs, and `bankLen`
makes `lenLock` answer open with no run on record (B.8); **400 dealt Go / No-go rounds — the target is never the first
shape, always exactly three of them, no shape three times running, no decoy repeated** (B.1d / #375b); a driven Go /
No-go Set reaches round 5 with fifteen targets dealt and its HUD reads `round N of 5 · H of 3` (B.1b); five Stopwatch
rounds of 0.10–0.50 score **1.50, not 0.30** (B.2); the budget is 5s and 7.5s past round 10 and the targets climb past
14s by round 14 (B.3a / B.3b); Hidden's budget reads 700ms (B.4); a Flash Set driven without a single tap scores
**1000ms** (B.6); **the result's score, that run's row on the board and each round's own figure all wear the same tier
colour** (B.10 / L4); tapping an unlock toast lands on the pick sheet (B.12); a store of 601 runs takes 25 more submits
and **the one Estimate run — the oldest row in the store and its mode's whole top ten — survives** (B.14); and a v1
record carrying pre-build-31 Timing runs retires exactly the Stopwatch Set and the Hidden run, with their bar and their
achievement, and keeps the Stopwatch Streak, the Quick Tap run and everything else (B.2 / B.4).

Two earlier assertions were **amended rather than added to**, and both are worth knowing about. **§3's baseline check now
runs the other way**: v16 §3 asserted that the Stopwatch Set showed no baseline total and that the Streak kept one;
B.3d reverses both, because B.2 makes the Set a total and a total needs the thing it is measured against. **C.4's
three-wrong-taps check is now "there is no such test anywhere"** — it used to allow one behind `!this.streak()`, which
after B.1c would pass vacuously and prove nothing.

**Build 32 (v19 §C, v18 §B.15–§B.27)** — statically: the Go / No-go gate is 180 and the Streak budget 3000 while the two
wrong-tap costs stand (C.5 / C.6 / L5); each target sits behind 1–5 decoys and `GO_PAD` / `GO_SPREAD` are gone (C.2); the
dwell is 980 ± 180 on a Set and 1330 ± 180 on a Streak, never under build 31's 800 / 1150 (C.4); `SHAPE_WORD` has five
shapes and every one is drawn on the pane, the rule bar and the rule line (C.3); `gated()` is the one function both lengths
score through and no skipped target is charged a constant (C.5); a Streak's `hits` is `gotAll`, the sheet says targets, the
Set line names the gate, and the three-shape list is gone (C.6); `RUN_SCHEMA` is 4 with `up3` retiring only Go / No-go runs
and the Streak bar's cleared flag; the two bars are 200 (converted) and 15 targets; every `KEY_BARS` row carries `pro` and
`author`, both null, and `config/keys.js` has no shell flag (B.27); the catalogue emits three tiers a row and the template
saves `{bars:{clear,pro,author}}` (B.27); Lantern / Circuit / Thorn are drawn by style with every segment a path of length
1 (B.22); the whole-key moment exists (B.20); `run/run.js` banks the key before the achievements and asks the key sets (B.25);
six Testing buttons sit under `[data-dev]` (B.26). In the browser: **400 dealt rounds — first shape always a decoy, exactly
three targets, NO TWO ADJACENT, no shape three running, no decoy repeated, 6–18 shapes a round** and each of the five gaps
holds at least 12% of 1200 targets (C.1 / C.2); decoys come from the other four shapes, a Set's five targets are five
different shapes, a Streak never repeats a target twice running (C.3); 300 dwell draws stay inside each length's range and
vary (C.4); **three 380ms taps read 200, a wrong tap makes it 350, a skipped 980ms target is charged 800, taps at or under
180 read 0, and a Streak reads 7 targets where it saw 40 shapes** (C.5 / C.6); a v2 record retires exactly the two Go / No-go
runs and the Streak bar's flag, keeping the Set bar, the Flash run, the Quick Tap run and Disciplined; the shell is derived
(key 1 live, Pro and Author shells, a Pro bar null) and a run past every bar clears key 1 only (B.27); key 1 whole reads 100
and "the key is whole", stepped into Pro it reads **30**, Author the same, never back to zero (B.17); the warning says it
cannot be undone (B.16); **driven end to end: every bar cleared → "Open the chest?" → yes → opened, the Pro and Author chests
appear under it, "progress to Pro?" → yes → `prefs.pro` 1 and the menu "30% complete"** (B.16 / B.19 / B.20); the three chests
share a column, the locked ones name their key and no number, the screen scrolls (B.19); Quick Tap with 3 of 6 cleared wears
an outline drawn half way round in `KEYFILL`, not green, not white; all six closes it and washes the tile; a locked tile has
none (B.18); **a first-ever visit that arrives as a clear during a run plays the arrival, then the segment, then hands back,
and the Keys item does not play it again** (B.21); with the Pro and Author columns filled in memory the ring redraws per
tier — Lantern glowing segments, Circuit corner dots and square nodes in Frost's white-blue, Thorn thorns in white — and a
reload discards it (B.22); a tap on the ring's ground stays put and a tap on Dots' bar selects Dots (B.23); the radar has one
rung before chest 1 and reads "Quick Tap 50" for 6 of 12, three rungs after with Pro and Author dashed and no climb past
rung 1, and with the columns filled a score past the Author time wears the flame (B.24); 24 key achievements, none live, The
key shown before chest 1 and the other two sets only after, clearing every Quick Tap bar earns "Quick Tap · The key" once
(B.25); a whole key plays its moment on the keys screen once and not on the next open (B.20); "key complete" plays it from
Testing and Back returns there, "chest 2 opening" shows the chest, plays the opening and puts it away with nothing stored,
"key arrival" plays the arrival again (B.26).

Six earlier assertions were **amended, both ways**: the L5 Reaction budgets (180 / 3000), the store record (v3, runs
stamped 4) in the build-13 fixture and the B.2 / B.4 ladder test, `#375a`'s `blockLen` shape, B.1b's constants and B.1d's
dealer (`dealRound`), B.31's theme names (Lantern → Circuit → Thorn, tracks unchanged), B.33's interlude wait (`3900 +
arrive`), A.6.7's menu line (`N% complete`), build 29's chest opening (it asks first, and runs 1.6s), and 8.10's Testing
count (ten controls). The B.1b Set drive loop was lengthened to outlast a round of up to eighteen shapes.

**Build 33 (v18, batch 14 · §B.28–§B.32)** — statically: `ui/screens/customise.js` is deleted, `index.js` no longer
imports it, `#s-custom` and its menu row are gone from the markup and `#p-cus` is a tab of `s-prog`; the three tabs read
*Game unlocks · Customise · Achievements* in that order and Keys is still its own menu item; `cleanPrefs` shape-checks
all three values of `progTab` (B.31). Driven: each tab renders and only the one that is up is shown — unlock rows,
customise groups and achievement rows all non-empty — the tab last open is stored, and an earned achievement's payout
opens the **Customise tab** without navigating anywhere, because it is the same screen now (B.31). The on / off row,
both Preview buttons and the per-game row labels are gone from markup and screen alike; the Music row is the three
tracks by name with exactly one selected and no button reading Preview, On or Off (B.28) — and the build-30 locked-row
assertion was **amended both ways**: it counts ONE button now, not a track plus a preview, and asserts the label is
`Music`. `cut()` exists in `audio.js` and both `run()` and `stop()` call it, so no bar of an outgoing track can ring
over the incoming one, and menu loop → preview → loop again runs clean end to end (B.29). A locked target colour on a
fresh profile writes its requirement into `#lk-sq` — inside the same `.cgroup`, positioned below the swatch row, the
only filled line on the screen, with the toast **not** on — and tapping that line opens the achievement that earns it
(B.30). No request to `fonts.googleapis.com` or `fonts.gstatic.com` is made anywhere in the whole run (every URL the
page asks for is logged from the first navigation); five `@font-face` rules point at three files that exist in
`fonts/`, every one `font-display:swap`; the Google `<link>` is gone; the title's two are preloaded with `crossorigin`;
and `document.fonts` resolves with the page's own faces (B.32). `IGNORED_REQUEST` no longer forgives the font hosts —
S4's "Stage 5 bundles them" is done, so a request to either is a regression rather than a tolerated failure.

**Build 35 (batch 15 · FEEDBACK-v21 §F.1–§F.5, §G.7; FEEDBACK-v20 §D.1–§D.3, §D.8–§D.10; #415; the Verdict Desk)** —
**F.2** statically: `statechange`, `revive()` with its `REVIVE_MS` timeout, `rebuild()` walking `rebinds`, foreground and
`pageshow` and the capture-phase tap all going through `revive`, the music's rebind dropping its nodes and re-anchoring
`next`, and `#dev-audio` inside the dev-only Testing section. Driven, with the context forced: a context that suspends and
resumes is kept (no rebuild); one that had run and whose `resume()` never settles is closed and rebuilt; straight after a
rebuild the music's bed is gone and `next` sits on the NEW clock, and one tick later the bed is back on the live context;
a never-run context is marked dead rather than rebuilt, and the next tap rebuilds it; Testing reads `audio · … · context N
· rebuilt · tap`. **Nothing here proves the phone is no longer silent** — that is Aiden's check. **F.1**: the sheet is
`hidden` in the markup and `hideSheet()` hides and empties it; a cold load with Estimate as the last game has no sheet,
no title, no modes, and the screen scrolls no further than the grid and its hint; a picked game slides it up, Back takes
it away again. **F.4**: exactly two writers of `prefs.col[g][k]` in the app, both in `ui/screens/progress.js`, and no player
colour near one; the store is v4 with `up4` on the ladder and `mig35` shape-checked; a v3 record holding light blue and
lime loads white with `mig35` 2 and white tiles; a locked swatch tried on Quick Tap is not painted on Dots' preview; a
colour chosen for Quick Tap shows on its tile only; a versus run leaves neither player colour in the store. **F.3 / F.5 /
G.7**, driven in a Quick Tap versus: Go reads "Go"; each player's correct tap pulses the pad they hit; each count ticks for
90ms with that player's colour in its keyframe; two ticks on one number leave one animation and the newer value. **D.3a**
driven in a whole-run Dash: every reading before 2.0s is `0.0/s` with taps on the board and the average arrives after;
the solo big count ticks for 90ms. **D.3b**: `peakRate` reads 0, 0, 1, 3, 0, 2 for six fixed tap lists. **D.1 / D.2**:
Four unlocked and unplayed is green on its tile and its row and Two is not, `markSeen` still records it, the pressed tile is
amber with no green, a selected first-seen-and-unplayed mode wears the ink line, and one recorded run of Four clears the
green. **D.8**: every `UNLOCKS` row's destination is open on a fresh profile and with everything open, and the nine that
name no mode or length land on the highest (the list is printed). **D.9 / D.10 / #415 / Verdict Desk**: tier names, Aiden's
five `at` triples, his lines for Quick Tap, Dots, Grow and Cut line for line with the two half-typed lines absent and the
four unedited Grow lines kept, Sequence untouched, the thirteen intro lines, the four per-mode Timing and Reaction rows
seeded from their parents with no parent left; Two and Four read 0.5 at 3/s; Estimate's scale is 40; the thresholds played
back through `tierOf` (2.90/s Amazing!, 2.80 not; Grow 5% / 30% / 31%; Sequence 11 notes); Blind Marathon at 22 and not 21.

Four earlier assertions were **amended, both ways**: the build-13 fixture and the B.2 / B.4 ladder test expect a v4 record;
the build-13 fixture's carried Quick Tap colour now comes out white with `mig35` counted (F.4); and 1.2d's Blind Marathon
pair is 22 / 21, was 24 / 23 (#415). The first gate run failed three new checks and nothing old: the F.2 readout lost its
"rebuilt" note to the new context's own `statechange` a moment later — kept separately now, because Aiden reads that line —
and the sheet's markup still carried a placeholder title.

**Build 36 (FEEDBACK-v22 §J.1; the Verdict Desk export, version 658)** — **§J.1** statically: no `state !== 'running'` gate
left on the visibilitychange or pageshow call sites or at the top of `revive()`; `LIVE_MS` is 150 and `live()` is the timed
check; the tap's branch of `revive()` starts no timer and calls no `live()`; a resume that ends `running` goes to `live()`;
Testing samples `audioClock()`. Driven, with `currentTime` frozen by hand while `state` still reads `running` — which is
exactly what iOS did: a healthy context is checked ONCE on foreground and kept; a frozen one is rebuilt on foreground and on
pageshow, and the music bed comes back on the live context; a resume that ends `running` on a frozen clock is rebuilt; fifty
taps on a healthy context start no check and rebuild nothing (the §J.1 trap); a hidden page marks the context suspect and
the next tap on a frozen clock rebuilds it synchronously, inside the gesture, with no timer; a suspect context whose clock is
moving is cleared by a tap. Testing's line carries `clock +N.NNNs in N.Ns` and, with the clock held still,
`+0.000s … · STOPPED`. **Nothing here proves the phone is no longer silent** — that is Aiden's check. **The export**: every
line it carries across all eleven verdict rows, the blanks keeping theirs, no stray whitespace; Reaction's two `at` triples
and the per-round ceilings for Cut, Flash and Go / No-go; Timing's `at`, per-round ceilings and QUALITY scales unmoved (DO
NOT BUILD Timing); Flash 230 / 231 / 295 / 296ms and Go / No-go 320 / 321 played back through `tierOf`. **Four build 35
assertions amended, both ways:** the F.2 readout regex takes the clock between the state and the context; **the F.2 shape
check matched the foreground and tap listeners by the very `state!=='running'` gate §J.1 removes — it was asserting the bug,
and it was the one failure on build 36's first gate run**; the 09-13 Verdict Desk line check now holds only Dots and Cut (the
export moved the rest) and Sequence's first ace line is the export's; D.10's four rows are asserted per mode with Timing's
numbers unmoved, no longer as identical seeded copies. The lesson worth keeping: **a check written to prove a fix exists can
pin the fix's blind spot in place** — grep the gate for the condition a bug report says is wrong.

**Build 37 (keys and chests · FEEDBACK-v21 §G.1–§G.4, §G.8; FEEDBACK-v20 §D.4, §D.7; FEEDBACK-v22 §K; Aiden's data
fixes)** — **the data**: Go / No-go's two corrected lines and no `!.` or "be own with" anywhere; Timing's `at` and
per-round ceilings are Aiden's and its QUALITY scales still 5 and 5400; no "DO NOT BUILD Timing" left in the config, the
rules or either Verdict Desk file; Stopwatch 0.50 / 0.51 / 2.19 / 2.30s and Hidden 400 / 401 / 949 / 951ms played back
through `tierOf` as the four tiers (Aiden's 0.8241 is 949.9ms on the curve, so "950" sits a hair past Good.). **§K**: the rules (`.choice.sel` on `--press`, the demoted tile, `.newthing` /
`.newplay` on `--press`, `.picked` still `--ok`); driven — `.grid.dim` is on for Quick Tap's MODE sheet and for Sequence's
length sheet (check 1), with the mode sheet up nothing is amber and the pressed tile's outline is the line colour, a chosen
mode is the one amber thing and flashes `--ok` for the tap's 170ms, and `--press` measures past 3:1 on the plain and the pass
& play sheet (check 3). **G.8**: six buttons under `[data-dev]`; key 1's switch clears all thirty and snapshots the two it
held, off restores exactly those two; reset backs out bars, chest, the step into Pro and the key achievements. **G.1 / G.2 /
D.7** on a profile with no flags: three chests stacked in one column, Pro and Author locked with "open the previous chest";
an early tap says so and stores nothing; after chest 1 the Pro chest names its key and the Author chest still points back;
three keys, the two locked ones crossed out with "To unlock: open the previous chest" and no percentage, a tap on one says
what opens it and opens nothing, and with chest 1 open none is crossed. **G.3**: VERIFIED statically that every key-1 bar's
mode is in the chain or open from the start and nothing in the chain reads a chest; `modesOpen()` sits beside `mapOpen()`
and reads `modeCount()`, and neither the key nor the grid reads `store.unlock`; driven at 1 of 13 modes — gated chest, gate on
the connector, the count on the chest and in the early-tap toast, no trip to the keys — then with every mode open the gate
animates off once and chest 1 shows key 1's bar progress, and OPEN EVERYTHING takes the escape. **G.4**, with the Pro and
Author columns filled in memory: opening chest 1 banks the Pro and Author bars a saved best beats, with exactly one unlock
sound and one toast (the chest's); a live clear still hands `checkKey` a fresh Pro clear for the result screen's interlude;
the keys screen wears green on the Pro key and on the retro rows the first time, then spends the mark. **D.4**: the menu and
`hud.js` share `core/count.js` and the menu runs no loop of its own; 0% → 20% since last shown pulses and counts up with a
900ms whoosh and stores 20 on paint; the same figure again plays nothing and a lower one never counts down.

**The first gate run failed four checks and one was the app.** G.4's "one chest-open sound" found that opening a chest had
played the unlock sound twice since build 29 — once with the lid and again with its green toast 1.6s later; the toast is
`quiet` now. The other three measured the wrong thing: B.17 read the menu line while D.4's count-up was still walking it,
Hidden's Good. edge is 949.9ms not 950, and §K's reference line colour was taken off a mode choice that was first-seen green.

**Eighteen earlier assertions amended, both ways** (B.17's read now waits for the count-up to land). 8.10 counts seventeen Testing controls; B.22 reads the amber outline
with the grid undimmed and the demoted colour beside it; B.24, B.31 and both #411 checks expect all three chests and all
three keys before chest 1, the second and third locked with no number — **A.1 was narrowed, so a test that proved "nothing
about pro or author is on screen" had to become one that proves "nothing about their numbers is"**; build 35's D.2 reads the
selected line and the demoted tile as §K draws them; build 35's G.7 finds the walk through `core/count.js`; build 35's D.10
and build 36's export checks carry Timing's new numbers, the two corrected lines and labels that no longer say DO NOT BUILD.

**Build 38 (Aiden's two answers to build 37)** — **the tile keeps its amber until a mode is chosen**: the demote rule is
`.grid.chosen`, not `.grid.dim`, and `setStage()` sets it only for a game with more than one mode and a mode selected; driven —
Quick Tap's mode row with nothing tapped has the tile as the one amber thing, choosing Two moves the amber to Two and demotes
the tile, going back to the mode row with Two still selected keeps it that way, and Sequence (one mode) keeps the tile amber on
its length row. **Author waits for the Pro chest**: `tierOpen()` is chest n for tier n+1 with the dev escapes, `radarRungs()`
is one rung per open tier and the Achievements tab asks per tier; driven with the columns filled in memory and chest 1 open —
Pro open, Author crossed out on the strip, two radar rungs, no Author set, a run past every bar clears key 1 and Pro and banks
nothing on Author — then opening the Pro chest credits Author's already-beaten bar silently, opens all three keys and rungs,
and shows the Author set. **Five build 37 and earlier assertions amended back or on:** B.22 and build 35's D.2 expect the
tile's amber with no mode chosen; §K counts the tile as one amber thing and expects it on the mode row; build 37's G.2 expects
Author still crossed out after chest 1; build 37's G.4 expects chest 1 to credit Pro only; B.25 expects the Author set to wait
for the Pro chest.

**Build 38 (#426, A.2 amended: Pro and Author placeholders)** — **the file is the generator's output**: regenerating
`config/key-bars.js` with `scripts/placeholders.mjs` changes nothing, `--clear` takes all sixty cells back to null with no marker
left and filling that gives the file back byte for byte, and `../_review/key-bars.json` is what it writes. **The scheme, every
cell**: the multiplier for the row's own direction, the row's own precision, each tier strictly harder than the one below, none
past its floor, each marked `conf:'low'` with a basis naming its multiplier — and Flash · Set's Author clamped to 180, saying so.
**NEVER OVERWRITE**: a number put in through `--set` (its marker dropped) and a number typed over a placeholder (its stale marker
left) survive two generator runs byte for byte, reported kept, with every other cell and every key-1 `bar` untouched; `--set`
refuses `bar`. **The app reads the marker by the same test**: thirty Pro and thirty Author placeholders, none on key 1, a number
changed in place is no longer one, and the key screen counts them per tier. **A — parity**: Lantern, Circuit and Thorn each run
the advance (`krootgrow` under the `khaloglow` halo), the whole-key moment and the staged first open with the same animations,
and lit segments, halos and the count line wear that tier's tint; statically the last `krootgrow` reads `--ktint` and no
`[data-style]` rule touches an animation. **B — retroactive credit has something to bank**: a profile whose bests beat every
other Pro bar opens chest 1 and banks exactly those, silently (one chest sound, one toast); a profile with no runs banks none.
**Retro on arrival** (Aiden: "yes, silently, once"): a profile with chest 1 already open boots and banks the Pro bars its bests
beat, with no toast and `retroCol.pro` written; a banked bar removed by hand is not re-banked on the next boot; a changed column
credits once more. **Six earlier assertions amended:** 5.3 expects no shell and the Author ring with its placeholder line; #371's
fill finds nothing on a full table and fills exactly one emptied cell; B.27 checks the full columns, makes its shells by emptying
a cell, and proves a full column clears like a real tier; B.17's message; B.24 makes its dashed rungs by emptying both columns
and expects solid rungs and the flame on the file's numbers; the build-32 Go / No-go migration check reads key-1 bars only,
because boot now credits Pro.

**Build 39 (batch 16, the surface — FEEDBACK-v23 §L.2–§L.5)** — **L.4a**: statically, all twenty-three Customise controls
(preview, finger, game chips, every group, every locked line) are inside `s-custom` and none is left on `s-prog`,
`renderCustom` / `Wheel` / `pvStep` live in `ui/screens/customise.js` and nowhere in `progress.js`, the file imports no
screen (A4), and the menu reads Play · Scores · Progress · Keys · Customise · About; live, the menu row opens it with its nine
groups and the screen itself scrolls. **L.4b**: the three tab labels, uppercase, at the chip's own font size, none past the
edge at 390px, the row count printed; a stored `cus` lands on Customise unlocks and is rewritten `cul`. **L.4c — THE
PARTITION**: with everything open, the ids rendered on Customise unlocks and on Achievements (filter All) are disjoint,
their union is exactly `ACH` + `keyAch()`, Game unlocks renders no achievement, the middle tab is exactly the rows with
`unlocks` and agrees with `achTab()`, no key row pays out, and `show('s-prog', {ach})` lands on the tab `achTab()` names with
the row flashed. **L.2**: statically no `em.u` rule and no `.ach` / `.unl` label rule reading `--cue` or `--miss`; live, on a
profile with some of each tab earned, every label is `--ink` until earned and `--ok` once, and none is red. **L.4d**: an earned
middle-tab row opens Customise with its swatch ringed and NOT applied, previews the row's own game (Pinpoint → Dots), a lead
colour from an all-games row is shown on a game that has a lead row, and an unearned row still goes to play it (the sheet or
the lock box). **L.5**: statically every `overflow-y:auto` selector but `.otwrap` carries the `::after` spacer and `#build`
reads the tokens; live, fourteen scrollers (Customise on five games, the three tabs, Scores, the key list, game select with a
sheet up, About, Testing) are scrolled to the bottom and their last control — the Go button on game select — must end above
the stamp's top; the line printed says which ones actually scroll at 390×844. **Amended back or on:** 6b (8.3 reads Clean ·
Sprint · Two and 8.1 reads Every game on Customise unlocks); the side-screen walk opens `s-custom`; section 7 opens Customise
off the menu and taps the new tab; B.21 expects the Customise row and `unl,cul,ach`; B.31 reversed both ways (customise.js
back, `s-custom` and its row present, no `#p-cus`, the middle tab `cul`, the store's mapping, an earned row opening the SCREEN);
B.28, B.30 (the locked line lands on the flashed Customise-unlocks row), B.32 and F.4 open `s-custom`; the build-33 and
build-35 source reads include `customise.js`; F.1's clamp lets Game select scroll past the map by one flex gap and the stamp
spacer and requires the spacer to be there; F.4's two `prefs.col` writers are in `customise.js`; section 7's jump row is
Clean · Sprint · Two.

**Build 40 (batch 16, four chests and the 0–400 meter — FEEDBACK-v23 §L.8 a–c f, §L.10 a–c e, §L.11 a c, §L.12, G.8 extended)** —
**L.10**: `config/chests.js` holds exactly games · key · pro · thorns with what each needs and reveals, data only (A2); nothing in the
app's code, markup, copy or stylesheet names a chest by number, and G.3's gate (`glgate`, `gateOff`, "unlock all games first"), both
asks, `frontPct`, `prefs.pro` and `mapOpen` are gone. **L.10e — STRICTLY SEQUENTIAL**: across 256 states of opened chests × modes open ×
whole keys no chest is ready while the chest before it is shut, and one behind a shut chest always reads `before`; opening the Games chest
on a profile whose bests beat every bar on every tier banks exactly the key-1 bars — nothing on Pro or Author, the retro marks bare —
takes the meter 100 → 200, leaves the Key chest ready, and a second open does nothing. **L.8a / L.10b — ONE METER**: `meter()` in
`progress/key.js`, read by the menu, the map and the key screen, none of which reads `keyPct` or `frontPct`; a new profile 0, one mode past
the start 8 (§M.4), every mode 100; with every bar on every key banked underneath it still reads 100 before the Games chest and 200 before
the Key chest, 300 before the Pro chest and 400 after it; half of key 1 reads 150. **L.8b**: with every mode unlocked the Games chest is
ready on the map and there is no ask box in the page; its tap opens the key screen and the chest opens there by itself — stored, its
already-beaten key-1 bars credited, the meter counted up to `meter()` and written as `meterSeen`, one chest sound, no toast; the next
visit opens nothing; back on the map it is open with CUSTOMISE · THE KEY beside it in its own row and the Key chest reads
`N% · opens at 200%`. **Both drivers**: a live clear that makes key 1 whole interrupts the result as always, the Key chest opens inside
the interlude (Pro revealed) and the result is back on time. **L.11a**: Customise crossed out with "open the Games chest" and a tap stays
on the menu; the defaults apply (white target, stock background, default tap sound) while the stored choices are kept; the Customise
unlocks tab is not gated, says "open the Games chest to use them", and its earned row does not open a locked screen; once the chest is
open the strike wipes, the row is green until Customise first opens, the stored choices apply, and a colour earned while it was locked is
first-seen green there. **L.12**: `keyChest()` is exported and the key screen reads no chest flag of its own; a whole key 1 with its chest
open carries `key-chest` on the hub, which lands on the map with the Key chest flashed and open; a key in progress carries none.
**L.8f / G.8 extended**: eight per-chest Testing buttons; the Games switch takes the meter to 100 and the chest to ready, the Key switch
to 200, and each switch off restores what the profile held; each reset backs its chest out; "set meter to N%" reads 250 and off reads the
profile again. **Store v5**: `up5` on the ladder and `chests` shape-checked; a v4 record with chest 1 and chest 2 open loads with the
Games, Key and Pro chests open and the retired fields dropped. **§M.2**: before the Games chest a run past a key-1 bar banks nothing and
hands back no interlude, the tile outline stays at 0, no key set is listed and the key screen shows only the modes count.

**Amended back or on, both ways:** 8.7's brand-new profile has the Games chest open (Customise waits for it); 8.10 counts 22 Testing
controls; A.6's count line reads the meter (100% under OPEN EVERYTHING); B.21 reads each menu row's label alone; B.23 counts the chests
by name; B.24 — the locked chest is the Games chest with the chain's count and all four are on the map, and the openable chest is the Key
chest, opening on its key screen with no ask; B.31 / #411 — before the Games chest all three keys are crossed out, key 1 with "open the
Games chest", and four chests either way; B.32, B.30 and F.4 open the Games chest before visiting Customise, and F.4 reads store v5; B.27
opens Games and Key where it opened chest 1; B.15–B.17 reversed into the retirement check, the meter on the menu and the four-chest
column; B.25 — no key set before the Games chest, The key after it, Pro after the Key chest; B.26 — seven animation buttons named by chest,
the demo resting as the chest's own state; G.8 per chest; G.1 / G.2 — four chests, all three keys crossed out before Games, the Key chest
reading the meter after it; G.3 reversed — no gate and no `gated`, the Games chest ready once every mode is open; G.4 and #426 B open the
Key chest on its key screen, with no toast any more; D.4 counts the meter up from `meterSeen`; 38.2's tier, rung and set lines and its
chests by name; L.4a's menu regex takes `data-act="custom"`; L.2 / L.4d's profile has the Games chest open.
