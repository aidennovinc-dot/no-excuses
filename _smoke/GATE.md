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