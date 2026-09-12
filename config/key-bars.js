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

   THREE TIERS PER ROW SINCE BUILD 32 (v18 B.27). `bar` is key 1 — the clearance bar, the only one that has ever had a
   number. `pro` and `author` are keys 2 and 3 over the SAME combination, in the same unit and direction, and both start
   EMPTY (null): A.2 forbids a build deriving a bar, so nothing here is generated — Aiden fills the two columns on the review
   catalogue's key section (#371, three columns now) and Cowork ports them here, one number at a time. A tier whose column
   has any null is a SHELL — progress/key.js derives that from this file, config/keys.js carries no flag — and the key
   screen says so instead of drawing a ring over numbers nobody has set. A tier's column is complete the day every row
   carries it, and that is the day the tier starts counting: no code change.

   ../_review/key-bars.json is the same table in review shape. The catalogue generator takes its prose from there and its
   NUMBERS out of this file through the running app, and warns when the two disagree — this file is what the game plays. */

export const KEY_BARS = {
  'quick-tap:two:5':      { id:'qt-two-5', bar:12, dir:'higher', pro:null, author:null, unit:'hits', conf:'med', basis:'Marathon opens at 20 hits in a Dash (1.33/s); a player who got there runs nearer 2.4/s.' },
  'quick-tap:two:15':     { id:'qt-two-15', bar:34, dir:'higher', pro:null, author:null, unit:'hits', conf:'med', basis:'2.3/s — past the 20-hit gate that opens Marathon, short of a clean run.' },
  'quick-tap:two:30':     { id:'qt-two-30', bar:64, dir:'higher', pro:null, author:null, unit:'hits', conf:'med', basis:'2.1/s. Same player as the Dash bar, thirty seconds in.' },
  'quick-tap:four:5':     { id:'qt-four-5', bar:9, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'Four adds a visual search to every tap. Set at ~75% of the Two rate — that ratio is the guess.' },
  'quick-tap:four:15':    { id:'qt-four-15', bar:26, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'Same 75% ratio against Two · Dash.' },
  'quick-tap:four:30':    { id:'qt-four-30', bar:48, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'Same 75% ratio against Two · Marathon.' },
  'dots:blind:5':         { id:'dt-blind-5', bar:13, dir:'higher', pro:null, author:null, unit:'hits', conf:'med', basis:'2.6/s. The Sprint gate is 6 hits with no misses, which tests accuracy not speed.' },
  'dots:blind:15':        { id:'dt-blind-15', bar:38, dir:'higher', pro:null, author:null, unit:'hits', conf:'high', basis:'Marathon opens at 35 hits in a Dash (2.33/s). The bar sits just above the gate that lets you reach it.' },
  'dots:blind:30':        { id:'dt-blind-30', bar:72, dir:'higher', pro:null, author:null, unit:'hits', conf:'med', basis:'2.4/s held for thirty seconds.' },
  'dots:lead:5':          { id:'dt-lead-5', bar:15, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'The outline removes the search, so Lead should beat Blind. The 15% lift is the assumption to test.' },
  'dots:lead:15':         { id:'dt-lead-15', bar:44, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'Same 15% lift over Blind · Dash.' },
  'dots:lead:30':         { id:'dt-lead-30', bar:84, dir:'higher', pro:null, author:null, unit:'hits', conf:'low', basis:'Same 15% lift over Blind · Marathon.' },
  'hold:grow:7':          { id:'es-grow-set', bar:9, dir:'lower', pro:null, author:null, unit:'% off', conf:'med', basis:'Cut opens on a single Grow round within 15%. An average held over seven rounds should sit well under a one-round gate.' },
  'hold:grow:-1':         { id:'es-grow-streak', bar:12, dir:'higher', pro:null, author:null, unit:'rounds', conf:'med', basis:'The budget is 100% cumulative — at a 9% average round the run lasts about eleven.' },
  'hold:cut:10':          { id:'es-cut-set', bar:6.5, dir:'lower', pro:null, author:null, unit:'% off', conf:'med', basis:'Sequence opens on one Cut round within 3.5%. 6.5% is that standard sustained over ten, against a widening shape pool.' },
  'hold:cut:-1':          { id:'es-cut-streak', bar:14, dir:'higher', pro:null, author:null, unit:'rounds', conf:'med', basis:'100% budget at a 6.5% average round is about fifteen; the bar sits one under.' },
  'sequence:solo:3':      { id:'sq-3', bar:11, dir:'higher', pro:null, author:null, unit:'rounds', conf:'med', basis:'5 keys opens at 6 notes in 3 keys. Eleven rounds is an eleven-note sequence, but only three symbols to hold.' },
  // v17 (B.9): 'sequence:solo:5' was REMOVED here, not retuned — five keys stopped being a combination the config makes,
  // so its row became an orphan the gate would have failed on. A removal, never a generated bar: A2 stands and #371 is
  // still the only thing that may set one
  'sequence:solo:7':      { id:'sq-7', bar:9, dir:'higher', pro:null, author:null, unit:'rounds', conf:'high', basis:'Two unlocks read this exact run — Practice at 8 notes, Timing at round 6. The bar sits one above the higher.' },
  // v18 (B.2): the Set is a TOTAL now, so the same standard is the old five-round average times five. Not a retune —
  // a unit conversion, which is the only kind of edit a bar may take from a build rather than from Aiden (A.2)
  'timing:stopwatch:5':   { id:'tm-sw-set', bar:1.4, dir:'lower', pro:null, author:null, unit:'s total', conf:'high', basis:'Timing · Hidden opens on one attempt within 0.30s. This is that standard held across all five rounds — 0.28s a round, 1.40s in total.' },
  'timing:stopwatch:-1':  { id:'tm-sw-streak', bar:9, dir:'higher', pro:null, author:null, unit:'rounds', conf:'high', basis:'Reaction · Flash opens at round 6 of this exact run, so round 9 is a real step past a threshold the build already trusts.' },
  /* v18 (B.4): converted from 180px, not retuned. Measured headless at 390x844: #gen is 390 x 683.66, the ball crosses
     it at 117px/s one way and 205px/s the other, so a pixel is 8.55ms across and 4.88ms down — 6.71ms averaged. 180px is
     1208ms; the bar is 1200. The basis's own complaint is what B.4 fixed: pixels do not travel across screen sizes. */
  'timing:hidden:10':     { id:'tm-hid-set', bar:1200, dir:'lower', pro:null, author:null, unit:'ms total', conf:'low', basis:'Nothing in the unlock chain touches Hidden. 120ms a round is my judgement — converted from the 180px bar at the ball’s measured pace.' },
  'timing:hidden:-1':     { id:'tm-hid-streak', bar:9, dir:'higher', pro:null, author:null, unit:'rounds', conf:'low', basis:'Matched to Stopwatch · Streak for want of an anchor. Hidden’s budget is not in the config.' },
  'reaction:flash:5':     { id:'rx-fl-set', bar:255, dir:'lower', pro:null, author:null, unit:'ms avg', conf:'high', basis:'Go / No-go opens on a Flash Set under 300ms. 255ms is a good phone average — faster, still reachable.' },
  'reaction:flash:-1':    { id:'rx-fl-streak', bar:5, dir:'higher', pro:null, author:null, unit:'rounds', conf:'med', basis:'500ms budget spending anything over 150ms. At a 255ms average each rep costs ~105ms.' },
  /* v19 (C.5 / C.6, build 32): the Set bar is CONVERTED through the 180ms gate, not retuned — 380ms raw was the standard and
     380 − 180 is 200, so a player who cleared the old number clears this one at the same pace. The Streak bar is NOT a
     conversion: the old 5 was five SHAPES on a 1000ms budget and the unit is targets on 3000 now, so it is set fresh at one
     Set's worth — fifteen targets is what the 3000ms budget buys at exactly the Set bar's pace — and the cleared flag for it
     is dropped by the store's ladder step (core/store.js up3). #402 still asks whether 200 fits a fifteen-tap Set. */
  'reaction:nogo:5':      { id:'rx-ng-set', bar:200, dir:'lower', pro:null, author:null, unit:'ms avg over 180', conf:'med', basis:'Converted through the 180ms gate from 380ms raw (C.5). A go/no-go tap runs ~100ms behind a simple one; the 150ms wrong-tap penalty is inside this average, so it caps mistakes too.' },
  'reaction:nogo:-1':     { id:'rx-ng-streak', bar:15, dir:'higher', pro:null, author:null, unit:'targets', conf:'med', basis:'3000ms budget spending over the 180ms gate, 200ms a wrong tap (C.6). At the Set bar’s pace — 200ms over the gate a target — the budget buys exactly one Set’s worth, fifteen targets.' },
  'spot:count:10':        { id:'sp-ct-set', bar:10, dir:'lower', pro:null, author:null, unit:'miscount', conf:'med', basis:'The ramp opens at five targets and one decoy, adds one of each a round, and the flash falls 70ms a round. By round 10 it is fourteen targets in 570ms.' },
  'spot:count:-1':        { id:'sp-ct-streak', bar:8, dir:'higher', pro:null, author:null, unit:'rounds', conf:'med', basis:'Spot · Find opens at round 5 of Count, so eight is a clear step past.' },
  'spot:find:10':         { id:'sp-fd-set', bar:18, dir:'lower', pro:null, author:null, unit:'s total', conf:'low', basis:'1.8s a find against the 0.5s free window, over a crowd growing from 16 to 70 shapes. No unlock anchors this.' },
  'spot:find:-1':         { id:'sp-fd-streak', bar:8, dir:'higher', pro:null, author:null, unit:'rounds', conf:'low', basis:'Matched to Count · Streak. Find has no threshold of its own.' },
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
