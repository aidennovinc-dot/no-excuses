/* No Excuses — the key's clearance bars (build 22, v14 §9.7 / C.6 / C.7). DATA ONLY (A2).

   One row per contributor combination, keyed '<game>:<mode>:<length>' — the same key progress/key.js builds out of
   GAMES + SET_COPY, so a mode added to config/games.js joins the key with a row here and nowhere else. -1 is Streak.

   A bar is a ONE-OFF threshold, not a score to hold: beat it once in a solo run and that combination is cleared for good
   (9.4 — pass & play and versus never count, L10). `dir` is the direction of that combination's own scoring and is read
   from here, never assumed: 'higher' is a floor (that number or more), 'lower' is a ceiling (that number or less).
   C.7's naming stands — CLEARANCE bar, never "minimum bar" — but its count does not: EIGHT of the thirty are
   ceilings, not nineteen. Estimate, Timing, Reaction and Spot score downward in their SET rows only; their Streak rows
   score rounds survived, which is upward like everything else (L5). The gate checks every row against GC(g,d,s).lower.

   THE NUMBERS ARE PROPOSED, NOT MEASURED. Cowork derived them 2026-09-08 off config/unlocks.js and config/games.js —
   AUTHOR_RECORDS is empty and nothing has been played on a phone. `conf` says how far each one sits from evidence:
   high = anchored to a real unlock threshold, med = derived from a ramp constant or a neighbouring bar, low = judgement
   with nothing in the build behind it. Aiden amends them during play-test on the catalogue's clearance-bars section, and
   a corrected number is an edit to this file alone — never a code change. `basis` and `conf` are what that section prints.

   THREE TIERS PER ROW SINCE BUILD 32 (v18 B.27). `bar` is key 1 — the clearance bar. `pro` and `author` are keys 2 and 3
   over the SAME combination, in the same unit and direction. A tier whose column has any null is a SHELL — progress/key.js
   derives that from this file, config/keys.js carries no flag — and the key screen says so instead of drawing a ring over
   numbers nobody has set. A column is complete the day every row carries it, and that is the day the tier starts counting.

   A.2 AMENDED AT BUILD 38 (#426, 2026-09-14 — Aiden asked for it directly, and that is what amends it). A.2 said no build
   may derive a bar and Aiden sets every one by hand. NOW: A BUILD MAY GENERATE A PLACEHOLDER, IF IT IS MARKED AS ONE AND IS
   REPLACEABLE A ROW AT A TIME. IT MAY STILL NEVER SET A REAL BAR OR SILENTLY CORRECT ONE. Every `pro` and `author` below
   came out of site/scripts/placeholders.mjs (npm run placeholders): `bar` × 1.15 / × 1.30 on a floor, × 0.80 / × 0.65 on a
   ceiling, rounded to the row's own precision and clamped where a person could not go. Each carries its marker,
   `placeholder:{ <tier>:{ v, conf:'low', basis } }`, and `v` is the number that was generated — so a marker holds only while
   its cell still says `v`. progress/key.js isPlaceholder() and the generator read it by the same test.
   · To put in Aiden's real number: `npm run placeholders -- --set <id> pro|author <n>` writes it and drops that cell's
     marker. Changing the number by hand works too (the marker stops matching and is ignored) — delete the marker as well.
   · From that moment the cell is MANUAL DATA. No later build regenerates it, rounds it, corrects it or re-derives it from
     `bar`: the generator only ever writes a cell that is empty or still holds its own marker's `v`, and the gate proves it.
   · `bar` is key 1 and nothing here ever writes it. #367 / #371 still want Aiden's real Pro and Author numbers.

   ../_review/key-bars.json is the same table in review shape. The catalogue generator takes its prose from there and its
   NUMBERS out of this file through the running app, and warns when the two disagree — this file is what the game plays. */

export const KEY_BARS = {
  'quick-tap:two:5':      { id:'qt-two-5', bar:12, dir:'higher', pro:14, author:16, unit:'hits', conf:'med', basis:'Marathon opens at 20 hits in a Dash (1.33/s); a player who got there runs nearer 2.4/s.',
    placeholder:{ pro:{ v:14, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (12) × 1.15 = 13.8, rounded to 14. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:16, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (12) × 1.30 = 15.6, rounded to 16. Not Aiden’s number, awaiting his (#371).' } } },
  'quick-tap:two:15':     { id:'qt-two-15', bar:34, dir:'higher', pro:39, author:44, unit:'hits', conf:'med', basis:'2.3/s — past the 20-hit gate that opens Marathon, short of a clean run.',
    placeholder:{ pro:{ v:39, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (34) × 1.15 = 39.1, rounded to 39. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:44, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (34) × 1.30 = 44.2, rounded to 44. Not Aiden’s number, awaiting his (#371).' } } },
  'quick-tap:two:30':     { id:'qt-two-30', bar:64, dir:'higher', pro:74, author:83, unit:'hits', conf:'med', basis:'2.1/s. Same player as the Dash bar, thirty seconds in.',
    placeholder:{ pro:{ v:74, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (64) × 1.15 = 73.6, rounded to 74. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:83, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (64) × 1.30 = 83.2, rounded to 83. Not Aiden’s number, awaiting his (#371).' } } },
  'quick-tap:four:5':     { id:'qt-four-5', bar:9, dir:'higher', pro:10, author:12, unit:'hits', conf:'low', basis:'Four adds a visual search to every tap. Set at ~75% of the Two rate — that ratio is the guess.',
    placeholder:{ pro:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.15 = 10.35, rounded to 10. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:12, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.30 = 11.7, rounded to 12. Not Aiden’s number, awaiting his (#371).' } } },
  'quick-tap:four:15':    { id:'qt-four-15', bar:26, dir:'higher', pro:30, author:34, unit:'hits', conf:'low', basis:'Same 75% ratio against Two · Dash.',
    placeholder:{ pro:{ v:30, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (26) × 1.15 = 29.9, rounded to 30. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:34, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (26) × 1.30 = 33.8, rounded to 34. Not Aiden’s number, awaiting his (#371).' } } },
  'quick-tap:four:30':    { id:'qt-four-30', bar:48, dir:'higher', pro:55, author:62, unit:'hits', conf:'low', basis:'Same 75% ratio against Two · Marathon.',
    placeholder:{ pro:{ v:55, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (48) × 1.15 = 55.2, rounded to 55. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:62, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (48) × 1.30 = 62.4, rounded to 62. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:blind:5':         { id:'dt-blind-5', bar:13, dir:'higher', pro:15, author:17, unit:'hits', conf:'med', basis:'2.6/s. The Sprint gate is 6 hits with no misses, which tests accuracy not speed.',
    placeholder:{ pro:{ v:15, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (13) × 1.15 = 14.95, rounded to 15. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:17, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (13) × 1.30 = 16.9, rounded to 17. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:blind:15':        { id:'dt-blind-15', bar:38, dir:'higher', pro:44, author:49, unit:'hits', conf:'high', basis:'Marathon opens at 35 hits in a Dash (2.33/s). The bar sits just above the gate that lets you reach it.',
    placeholder:{ pro:{ v:44, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (38) × 1.15 = 43.7, rounded to 44. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:49, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (38) × 1.30 = 49.4, rounded to 49. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:blind:30':        { id:'dt-blind-30', bar:72, dir:'higher', pro:83, author:94, unit:'hits', conf:'med', basis:'2.4/s held for thirty seconds.',
    placeholder:{ pro:{ v:83, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (72) × 1.15 = 82.8, rounded to 83. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:94, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (72) × 1.30 = 93.6, rounded to 94. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:lead:5':          { id:'dt-lead-5', bar:15, dir:'higher', pro:17, author:20, unit:'hits', conf:'low', basis:'The outline removes the search, so Lead should beat Blind. The 15% lift is the assumption to test.',
    placeholder:{ pro:{ v:17, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (15) × 1.15 = 17.25, rounded to 17. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:20, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (15) × 1.30 = 19.5, rounded to 20. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:lead:15':         { id:'dt-lead-15', bar:44, dir:'higher', pro:51, author:57, unit:'hits', conf:'low', basis:'Same 15% lift over Blind · Dash.',
    placeholder:{ pro:{ v:51, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (44) × 1.15 = 50.6, rounded to 51. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:57, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (44) × 1.30 = 57.2, rounded to 57. Not Aiden’s number, awaiting his (#371).' } } },
  'dots:lead:30':         { id:'dt-lead-30', bar:84, dir:'higher', pro:97, author:109, unit:'hits', conf:'low', basis:'Same 15% lift over Blind · Marathon.',
    placeholder:{ pro:{ v:97, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (84) × 1.15 = 96.6, rounded to 97. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:109, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (84) × 1.30 = 109.2, rounded to 109. Not Aiden’s number, awaiting his (#371).' } } },
  'hold:grow:7':          { id:'es-grow-set', bar:9, dir:'lower', pro:7.2, author:5.9, unit:'% off', conf:'med', basis:'Cut opens on a single Grow round within 15%. An average held over seven rounds should sit well under a one-round gate.',
    placeholder:{ pro:{ v:7.2, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 0.80 = 7.2, rounded to 7.2. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:5.9, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 0.65 = 5.85, rounded to 5.9. Not Aiden’s number, awaiting his (#371).' } } },
  'hold:grow:-1':         { id:'es-grow-streak', bar:12, dir:'higher', pro:14, author:16, unit:'rounds', conf:'med', basis:'The budget is 100% cumulative — at a 9% average round the run lasts about eleven.',
    placeholder:{ pro:{ v:14, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (12) × 1.15 = 13.8, rounded to 14. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:16, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (12) × 1.30 = 15.6, rounded to 16. Not Aiden’s number, awaiting his (#371).' } } },
  'hold:cut:10':          { id:'es-cut-set', bar:6.5, dir:'lower', pro:5.2, author:4.2, unit:'% off', conf:'med', basis:'Sequence opens on one Cut round within 3.5%. 6.5% is that standard sustained over ten, against a widening shape pool.',
    placeholder:{ pro:{ v:5.2, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (6.5) × 0.80 = 5.2, rounded to 5.2. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:4.2, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (6.5) × 0.65 = 4.225, rounded to 4.2. Not Aiden’s number, awaiting his (#371).' } } },
  'hold:cut:-1':          { id:'es-cut-streak', bar:14, dir:'higher', pro:16, author:18, unit:'rounds', conf:'med', basis:'100% budget at a 6.5% average round is about fifteen; the bar sits one under.',
    placeholder:{ pro:{ v:16, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (14) × 1.15 = 16.1, rounded to 16. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:18, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (14) × 1.30 = 18.2, rounded to 18. Not Aiden’s number, awaiting his (#371).' } } },
  'sequence:solo:3':      { id:'sq-3', bar:11, dir:'higher', pro:13, author:14, unit:'rounds', conf:'med', basis:'5 keys opens at 6 notes in 3 keys. Eleven rounds is an eleven-note sequence, but only three symbols to hold.',
    placeholder:{ pro:{ v:13, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (11) × 1.15 = 12.65, rounded to 13. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:14, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (11) × 1.30 = 14.3, rounded to 14. Not Aiden’s number, awaiting his (#371).' } } },
  // v17 (B.9): 'sequence:solo:5' was REMOVED here, not retuned — five keys stopped being a combination the config makes,
  // so its row became an orphan the gate would have failed on. A removal, never a generated bar: A2 stands and #371 is
  // still the only thing that may set one
  'sequence:solo:7':      { id:'sq-7', bar:9, dir:'higher', pro:10, author:12, unit:'rounds', conf:'high', basis:'Two unlocks read this exact run — Practice at 8 notes, Timing at round 6. The bar sits one above the higher.',
    placeholder:{ pro:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.15 = 10.35, rounded to 10. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:12, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.30 = 11.7, rounded to 12. Not Aiden’s number, awaiting his (#371).' } } },
  // v18 (B.2): the Set is a TOTAL now, so the same standard is the old five-round average times five. Not a retune —
  // a unit conversion, which is the only kind of edit a bar may take from a build rather than from Aiden (A.2)
  'timing:stopwatch:5':   { id:'tm-sw-set', bar:1.4, dir:'lower', pro:1.1, author:0.9, unit:'s total', conf:'high', basis:'Timing · Hidden opens on one attempt within 0.30s. This is that standard held across all five rounds — 0.28s a round, 1.40s in total.',
    placeholder:{ pro:{ v:1.1, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (1.4) × 0.80 = 1.12, rounded to 1.1. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:0.9, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (1.4) × 0.65 = 0.91, rounded to 0.9. Not Aiden’s number, awaiting his (#371).' } } },
  'timing:stopwatch:-1':  { id:'tm-sw-streak', bar:9, dir:'higher', pro:10, author:12, unit:'rounds', conf:'high', basis:'Reaction · Flash opens at round 6 of this exact run, so round 9 is a real step past a threshold the build already trusts.',
    placeholder:{ pro:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.15 = 10.35, rounded to 10. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:12, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.30 = 11.7, rounded to 12. Not Aiden’s number, awaiting his (#371).' } } },
  /* v18 (B.4): converted from 180px, not retuned. Measured headless at 390x844: #gen is 390 x 683.66, the ball crosses
     it at 117px/s one way and 205px/s the other, so a pixel is 8.55ms across and 4.88ms down — 6.71ms averaged. 180px is
     1208ms; the bar is 1200. The basis's own complaint is what B.4 fixed: pixels do not travel across screen sizes. */
  'timing:hidden:10':     { id:'tm-hid-set', bar:1200, dir:'lower', pro:960, author:780, unit:'ms total', conf:'low', basis:'Nothing in the unlock chain touches Hidden. 120ms a round is my judgement — converted from the 180px bar at the ball’s measured pace.',
    placeholder:{ pro:{ v:960, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (1200) × 0.80 = 960, rounded to 960. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:780, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (1200) × 0.65 = 780, rounded to 780. Not Aiden’s number, awaiting his (#371).' } } },
  'timing:hidden:-1':     { id:'tm-hid-streak', bar:9, dir:'higher', pro:10, author:12, unit:'rounds', conf:'low', basis:'Matched to Stopwatch · Streak for want of an anchor. Hidden’s budget is not in the config.',
    placeholder:{ pro:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.15 = 10.35, rounded to 10. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:12, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (9) × 1.30 = 11.7, rounded to 12. Not Aiden’s number, awaiting his (#371).' } } },
  'reaction:flash:5':     { id:'rx-fl-set', bar:255, dir:'lower', pro:200, author:180, unit:'ms avg', conf:'high', basis:'Go / No-go opens on a Flash Set under 300ms. 255ms is a good phone average — faster, still reachable.',
    placeholder:{ pro:{ v:200, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (255) × 0.80 = 204, rounded to 200. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:180, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (255) × 0.65 = 165.75, rounded to 170; CLAMPED to 180: no faster than 180ms of genuine reaction on a touchscreen. Not Aiden’s number, awaiting his (#371).' } } },
  'reaction:flash:-1':    { id:'rx-fl-streak', bar:5, dir:'higher', pro:6, author:7, unit:'rounds', conf:'med', basis:'500ms budget spending anything over 150ms. At a 255ms average each rep costs ~105ms.',
    placeholder:{ pro:{ v:6, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (5) × 1.15 = 5.75, rounded to 6. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:7, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (5) × 1.30 = 6.5, rounded to 7. Not Aiden’s number, awaiting his (#371).' } } },
  /* v19 (C.5 / C.6, build 32): the Set bar is CONVERTED through the 180ms gate, not retuned — 380ms raw was the standard and
     380 − 180 is 200, so a player who cleared the old number clears this one at the same pace. The Streak bar is NOT a
     conversion: the old 5 was five SHAPES on a 1000ms budget and the unit is targets on 3000 now, so it is set fresh at one
     Set's worth — fifteen targets is what the 3000ms budget buys at exactly the Set bar's pace — and the cleared flag for it
     is dropped by the store's ladder step (core/store.js up3). #402 still asks whether 200 fits a fifteen-tap Set. */
  'reaction:nogo:5':      { id:'rx-ng-set', bar:200, dir:'lower', pro:160, author:130, unit:'ms avg over 180', conf:'med', basis:'Converted through the 180ms gate from 380ms raw (C.5). A go/no-go tap runs ~100ms behind a simple one; the 150ms wrong-tap penalty is inside this average, so it caps mistakes too.',
    placeholder:{ pro:{ v:160, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (200) × 0.80 = 160, rounded to 160. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:130, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (200) × 0.65 = 130, rounded to 130. Not Aiden’s number, awaiting his (#371).' } } },
  'reaction:nogo:-1':     { id:'rx-ng-streak', bar:15, dir:'higher', pro:17, author:20, unit:'targets', conf:'med', basis:'3000ms budget spending over the 180ms gate, 200ms a wrong tap (C.6). At the Set bar’s pace — 200ms over the gate a target — the budget buys exactly one Set’s worth, fifteen targets.',
    placeholder:{ pro:{ v:17, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (15) × 1.15 = 17.25, rounded to 17. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:20, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (15) × 1.30 = 19.5, rounded to 20. Not Aiden’s number, awaiting his (#371).' } } },
  'spot:count:10':        { id:'sp-ct-set', bar:10, dir:'lower', pro:8, author:7, unit:'miscount', conf:'med', basis:'The ramp opens at five targets and one decoy, adds one of each a round, and the flash falls 70ms a round. By round 10 it is fourteen targets in 570ms.',
    placeholder:{ pro:{ v:8, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (10) × 0.80 = 8, rounded to 8. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:7, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (10) × 0.65 = 6.5, rounded to 7. Not Aiden’s number, awaiting his (#371).' } } },
  'spot:count:-1':        { id:'sp-ct-streak', bar:8, dir:'higher', pro:9, author:10, unit:'rounds', conf:'med', basis:'Spot · Find opens at round 5 of Count, so eight is a clear step past.',
    placeholder:{ pro:{ v:9, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (8) × 1.15 = 9.2, rounded to 9. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (8) × 1.30 = 10.4, rounded to 10. Not Aiden’s number, awaiting his (#371).' } } },
  'spot:find:10':         { id:'sp-fd-set', bar:18, dir:'lower', pro:14.4, author:11.7, unit:'s total', conf:'low', basis:'1.8s a find against the 0.5s free window, over a crowd growing from 16 to 70 shapes. No unlock anchors this.',
    placeholder:{ pro:{ v:14.4, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (18) × 0.80 = 14.4, rounded to 14.4. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:11.7, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (18) × 0.65 = 11.7, rounded to 11.7. Not Aiden’s number, awaiting his (#371).' } } },
  'spot:find:-1':         { id:'sp-fd-streak', bar:8, dir:'higher', pro:9, author:10, unit:'rounds', conf:'low', basis:'Matched to Count · Streak. Find has no threshold of its own.',
    placeholder:{ pro:{ v:9, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (8) × 1.15 = 9.2, rounded to 9. Not Aiden’s number, awaiting his (#371).' },
                  author:{ v:10, conf:'low', basis:'PLACEHOLDER generated for #426: key 1 (8) × 1.30 = 10.4, rounded to 10. Not Aiden’s number, awaiting his (#371).' } } },
};

// the line under a game's name on the key screen and in the catalogue's clearance-bars section
export const KEY_NOTE = {
  'quick-tap': 'Timed — score is hits. No Set or Streak; the three lengths are the combinations.',
  'dots': 'Timed — score is hits. No lockout between dots, so the ceiling sits above Quick Tap.',
  'hold': 'Set is an average across its rounds. Streak is endless on a 100% cumulative budget, scored in rounds.',
  'sequence': 'One mode, two key counts. Score is rounds. Speed tightens 15ms a round to a 280ms floor.',
  'timing': 'Stopwatch scores seconds off, Hidden milliseconds off the marker (B.4). Both Sets are totals (B.2); both have a Streak.',
  'reaction': 'Flash is a simple reaction; Go / No-go adds the decision — five rounds of three correct taps (B.1b), every tap scored over the 180ms gate (v19 C.5), the Streak in targets on 3000ms (C.6).',
  'spot': 'Count scores total miscount, Find scores total seconds. Both lower is better.',
};
