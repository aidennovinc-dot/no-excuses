/* No Excuses — the games table and every number that tunes them (build 16, refactor stage 2). DATA ONLY (A2).
   A new game is one entry in GAMES plus an engine. What used to sit beside the data as functions moved out under the
   same id: the score formatters (fmt / cols / pic) to ui/format.js, the quality predicate to progress/rules.js. */

// the Streak length (v11): endless until the budget runs out; score = rounds
export const STREAK = -1;
// the feel. Nothing here is user-facing
// v17 (B.12): `swOver` is how far past the target a Stopwatch attempt is allowed to run before it stops itself — 10
// seconds, was 5. Letting one run the whole way is a secret achievement, and the attempt still scores the real difference
// v18 (B.3c / B.7): `hold` is how long a round's own figure sits, readable, before it drains into the running total.
// Aiden could not read either of them — "it adds immediately and I can't see what happened" — and the two Streaks that
// do this now share one number so they beat the same way
export const CFG = { lockout: 750, countStep: 300, holdRate: 38 /* vmin per second */, dotLeeway: 1.18 /* hidden: hit radius × this */, swOver: 10, hold: 800 };
/* v18 (B.4 / B.5) — TIMING · HIDDEN, in milliseconds. `speed` is the ball's pace as a fraction of the travel it has to
   cross, which is what it always was (0.3) — but the SCORE is the time between the ball and the marker now, not the
   pixels, because 100px is a different miss on every phone and 855ms is not. B.5's variation is the Streak's: `band` is
   how far either side of `speed` a round's pace may be drawn from (±25%), `tilt` the off-axis angle the path may take by
   `rampTo`, and `far` how much further behind the wall the marker sits each round. The Set draws none of them — it plays
   exactly as it did, in a new unit. */
export const HIDDEN = { speed: 0.3, band: 0.25, tilt: 22, far: 0.10, spread: 0.05, rampTo: 12, maxAt: 0.94 };
// sequence speed is not a choice any more (v9): it starts at 0.5s a key and tightens 15ms a round, floor 0.28s
export const SEQ_STEP = { start: 500, step: 15, floor: 280 };
// length faces (v11): the name everywhere, the seconds only on the pick sheet. 7 and 10 are the pass & play lengths (PASS_LEN)
export const LEN_NAME = { 5:'Sprint', 7:'Duel', 10:'Duel', 15:'Dash', 30:'Marathon' };
export const MODE_NAME = { two:'Two', blind:'Blind', four:'Four', lead:'Lead', grow:'Grow', cut:'Cut', solo:'', stopwatch:'Stopwatch', hidden:'Hidden', flash:'Flash', nogo:'Go / No-go', count:'Count', find:'Find' };
// v19 (C.3, build 32): FIVE shapes — the pool a Go / No-go Set's five rounds draw their targets from, one each, and the
// pool its decoys come from. games/reaction/index.js reads this list; nothing else names the shapes
export const SHAPE_WORD = { circle:'circle', tri:'triangle', square:'square', diamond:'diamond', hex:'hexagon' };
// two-player lengths (v10): pass & play is a fixed 7s of Quick Tap or 10s of Dots; versus runs until one player leads by VS_LEAD, or VS_CAP seconds
export const PASS_LEN = { 'quick-tap':7, 'dots':10 };
export const VS_LEAD = 10, VS_CAP = 120;
/* v15 (§4, build 25): pass & play for the five games that never had it. PASS_LEN above is SECONDS and stays Quick Tap and
   Dots only — those two pass the phone between two WHOLE runs. The turn-taking games share ONE run instead, so what they
   need is a count of turns, not a length: [attempts per turn, turns each], keyed 'game:mode' like SET_COPY.
   Estimate is turn by turn (4.1 / 4.2) and Timing and Reaction attempt by attempt (4.3 / 4.4), which is one attempt a turn.
   Go / No-go arrives on a beat and a single shape cannot be handed over, so its turn is a five-shape block — one rule period.
   Count is the odd one out and always was: both players answer the SAME flash on their own keypad, so its ten rounds are
   one shared turn. Sequence has no row on purpose — its pass & play grows a note a round and ends when somebody misses. */
export const PASS_TURNS = { 'hold:grow':[1,3], 'hold:cut':[1,3], 'timing:stopwatch':[1,3], 'timing:hidden':[1,3], 'reaction:flash':[1,3], 'reaction:nogo':[5,2], 'spot:count':[10,1] };
// v15 (4.5): Sequence versus is lives-based — the keys come off the length row (3 or 7 since B.9), `opens` is how many
// notes it starts with, and the pattern grows a note a round. Three lives each is Cowork's number, not Aiden's (guess)
// v17 (B.9): `opens` is a NOTE count and has never been indexed by the key row — a 3-key versus opening on 6 notes is six
// notes drawn from three symbols, which is legal and always was. Dropping 5 keys therefore leaves this line alone
export const SEQ_VS = { lives:3, opens:[3,4,5,6] };
// v14 (4.14): versus ends on first to VS_TARGET as well as first to lead by VS_LEAD. 100 is the number Aiden gave on Quick Tap;
// Dots 60 was build 19's guess and Aiden confirmed it 2026-09-08 (v14 section A.4). VS_CAP is the backstop, not a win condition
// v15 (4.6): Spot · Find versus is scored in rounds — two odd shapes, one each, first to find theirs takes the round —
// so five is a match, not a number of taps. Reaction versus keeps its own best-of and Sequence versus is lives (SEQ_VS)
export const VS_TARGET = { 'quick-tap':100, 'dots':60, 'spot':5 };
// the rate bar's top, hits per second, for the timed games. v14 (6.6): Quick Tap tops out at 4/s — 6 put every real run in the
// bottom half of the bar, so the bar never moved where the player actually plays
export const RATE_MAX = { 'quick-tap':4, 'dots':4.5 };
// v11: a Streak length scores rounds survived — higher wins — whatever the mode's Set scores. `streak` on a game is that override
export const STREAK_CFG = { lower:false, suffix:'', scoreWord:'rounds' };

export const GAMES = {
  // v9: every mode line says what to DO, first. Quick Tap lost Lead and gained Four (a 2×2 of pads). v11: Blind is Two
  // v13: pro lengths are gone from every game (0.3) — supporters keep no-ads, cosmetics and the star. The length row is labelled "Mode" everywhere
  'quick-tap': { name:'Quick Tap', modes:['two','four'], lens:[5,15,30], unit:'s', timed:true, versus:true,
    two:'Tap the box when it lights up.', four:'Four squares. Tap the white one.' },
  'dots': { name:'Dots', modes:['blind','lead'], lens:[5,15,30], unit:'s', timed:true, lead:true, versus:true,
    blind:'Tap the dots as they appear.', lead:'The outline leads the way.' },
  // Estimate (v9, was Hold). v11: Set = 7 rounds, score the average % difference (lower wins); Streak = endless, the differences add up, the run ends at 100%, score rounds
  'hold': { name:'Estimate', modes:['grow','cut'], unit:' rounds', timed:false, lower:true, lead:true,
    grow:'Grow your shape to the same area.', cut:'Draw a line that cuts off the share asked.',
    suffix:'%', scoreWord:'% off', streak:{ ...STREAK_CFG } },
  // v15 (4.5): versus keeps the key row instead of hiding it, because the keys are half of what the two players are
  // agreeing to. `vsLens` is what makes the length row show in versus at all
  // v17 (B.9, L6): FIVE KEYS IS GONE — solo, pass & play and versus. Aiden's call: three and seven are the two shapes
  // the game has (a handful you can hold, and a board you cannot), and five was the step nobody had a reason to play.
  // This row is what the key's contributor list walks, so dropping it is what takes the key from 31 combinations to 30
  'sequence': { name:'Sequence', modes:['solo'], lens:[3,7], unit:' keys', timed:false, versus:true, vsLens:[3,7],
    solo:'Watch the notes, then play them back.' },
  // v7 — four new games. v11: Set / Streak per mode; every timing figure is an absolute difference
  'timing': { name:'Timing', modes:['stopwatch','hidden'], unit:' attempts', timed:false, lower:true, lead:true,
    stopwatch:'Tap when you think the time is right.', hidden:'Tap when the ball has reached the marker.',
    suffix:'s', scoreWord:'s total', streak:{ ...STREAK_CFG },
    // v18 (B.4, L5): Hidden is scored in MILLISECONDS off the marker, not pixels — the same miss reads the same on
    // every phone, which 100px never did. v11: Set is 10 runs, and it is still a total
    per:{ hidden:{ suffix:'ms', scoreWord:'ms total', streak:{ ...STREAK_CFG } } } },
  'reaction': { name:'Reaction', modes:['flash','nogo'], lenNames:{5:'Best of 5',9:'Best of 9',15:'Best of 15'}, unit:' attempts', timed:false, lower:true, versus:['flash'], vsLens:[5,9,15],
    // v18 (B.1b / B.1c): the mode line says what a round is, and no longer promises an ender that has been removed
    flash:'Tap the moment it flashes white.', nogo:'Tap only your shape — three times, then it changes. Wait for it.',
    suffix:'ms', scoreWord:'ms', streak:{ ...STREAK_CFG },
    // Go/No-go (v11): Set = 5 rounds (v14 section 5), average ms on right taps + 150ms per wrong tap (v14 A.2); v14 (6.2 / L5): Streak = shapes survived on a 1000ms budget
    // v19 (C.5 / C.6, L5): every tap is scored over the 180ms gate, and the Streak scores in TARGETS answered on a 3000ms budget —
    // shapes seen would pay out on the luck of C.2's deal
    per:{ nogo:{ streak:{ ...STREAK_CFG, scoreWord:'targets' } } } },
  // v8: Count and Find merged into Spot. v13: Normal/Hard are gone — the ramp is the difficulty (10.1). Count scores total miscount, Find cumulative seconds; both lower is better, both Set (10 rounds) or Streak (a budget)
  // v15 (4.6): Find gains versus — the first game to get a two-player mode it never had. Count is pass & play only, because
  // both players answering the same flash IS its two-player mode
  'spot': { name:'Spot', modes:['count','find'], unit:' rounds', timed:false, lower:true, versus:['find'],
    count:'Count the shapes flashed. Ignore the decoys.', find:'Find the shape you were shown.',
    suffix:'', scoreWord:'miscount', streak:{ ...STREAK_CFG },
    per:{ find:{ lower:true, suffix:'s', scoreWord:'s total', streak:{ ...STREAK_CFG } } } },
};

// v14 section A (2026-09-08, build 20): Count's Set line is scored in miscounts, not time, and Go / No-go's names the 150ms
// wrong-tap penalty the engine has always applied — both are copy corrections to the section 5 table, no scoring change.
// Set and Streak, in one table (L5 / v14 section 5, 2026-09-08). `rounds` is the Set length and `set` / `streak` are the
// lines under the length name on the pick sheet. This is the ONE place either lives: GC lays [rounds, STREAK] over a game's
// config and lenName / lenSub read the two lines, so no game carries its own Set or Streak copy any more.
// A game with no row here is timed (Quick Tap, Dots) or has its own length family (Sequence) and is unchanged.
/* v17 (B.1, build 28): TWO LINES CORRECTED, no scoring change — the same kind of fix v14 section A made at build 20 and
   for the same reason. Estimate · Cut said "lowest % difference wins" and the engine has always scored, shown and banked
   the AVERAGE % off across its ten rounds (every other reader agrees: the clearance bar's unit is "% off", Good eye asks
   for "a Set averaging under 4% off", QUALITY divides by 12). Measured 2026-09-11: ten rounds summing to 170.4% displayed
   and recorded as 17.04%. Cut's own line was the only thing in the build calling it a difference.
   Spot · Find said "lowest total time wins" and it is not a raw total: 0.5s of every find is free (v14 6.30). */
export const SET_COPY = {
  'hold:grow':        { rounds:7,  set:'7 rounds, lowest average % off wins',            streak:'Highest round wins!' },
  'hold:cut':         { rounds:10, set:'10 rounds, lowest average % off wins',           streak:'Highest round wins!' },
  // v18 (B.2, L5): Stopwatch's Set is the SUM of the differences, not their average — Aiden withdrew the average
  'timing:stopwatch': { rounds:5,  set:'5 rounds, lowest total time difference wins',    streak:'Highest round wins!' },
  // v18 (B.4, L5): the same total, in milliseconds — pixels do not travel across screen sizes
  'timing:hidden':    { rounds:10, set:'10 rounds, lowest total milliseconds off wins',  streak:'Highest round wins!' },
  // v18 (B.6): a slow attempt is scored at 1000ms and counts; there is no retake to hide it
  'reaction:flash':   { rounds:5,  set:'5 rounds, lowest average time wins — over 1000ms scores 1000ms', streak:'Highest round wins!' },
  // v18 (B.1b): a round is three correct taps of one shape, so a Set is fifteen; the 150ms is the whole of a wrong tap now (B.1c)
  'reaction:nogo':    { rounds:5,  set:'5 rounds of 3 taps, lowest average over the 180ms gate wins — wrong taps add 150ms', streak:'Most targets wins!' },
  'spot:count':       { rounds:10, set:'10 rounds, lowest total miscount wins',          streak:'Highest round wins!' },
  'spot:find':        { rounds:10, set:'10 rounds, lowest total time wins — 0.5s free each find', streak:'Highest round wins!' },
};

// Estimate · Cut (v11 / v13 6.4): the shapes with an axis of symmetry never ask for 50%; the pools and the shares asked, by
// level (min(8, round)) — the first entry whose level is >= the round applies. No pool past level 4 = every Cut shape
// v14 (6.14): Cut is 10 rounds now, so the ramp runs to 10 — it starts easy on three plain shapes at gentle shares and the
// pool widens every two rounds, which is the "more shape variation as it goes" Aiden asked for. No pool past level 8 = every Cut shape
// v15 (3.1): Grow's target never lands under MIN_AREA. It is a vmin² fraction, not raw pixels — the same mistake already
// logged against Timing · Hidden's bars, which do not travel across screen sizes. 460 vmin² is 7,000 px² on a 390-wide
// phone (Aiden's number, measured there) and stays the same share of the screen everywhere else. TMIN/TMAX are the
// linear range in vmin; a shape too thin to reach the floor even at TMAX is re-dealt rather than shrunk to a reaction test.
export const ESTIMATE = {
  MIN_AREA: 460, TMIN: 16, TMAX: 58,
  SYM: ['square','circle','triangle','bar','ring','plus','star'],
  CUT_POOLS: [[2,['square','circle','bar']],[4,['square','circle','triangle','bar','ring']],[6,['triangle','ring','star','plus','crescent']],[8,['ring','star','plus','stairs','tetris','crescent','blob']]],
  CUT_SHARES: [[2,[40,45,35]],[4,[30,35,40,45]],[6,[25,30,35,45]],[8,[20,25,30,35,40]],[10,[10,15,20,25,30,35]]],
};
/* Spot · Count — REWORKED for v17 (B.15), and this is the difficulty review #366 asked for.
   Aiden's three complaints: it starts too easy (lots of time, few shapes), it ends too hard because the TIME is cut, and
   the target count climbs so predictably you can count the rounds instead of the shapes — 8, 9, 10, 11.
   All three have one cause: viewing time was carrying the difficulty and the target count was a straight line off the
   round number. Now the difficulty comes from MORE DECOYS, MOTION and SIZE VARIATION, and the target count is DEALT from
   a band rather than derived — so it can go down as well as up and there is nothing to count but shapes.

   · the band: lo and hi both rise, hi faster, so the band widens as the run goes on. `nCap` is the keypad's highest
     button and the band may never pass it — games/spot/index.js builds the keypad from this number for that reason.
   · the dip: from `dipFrom`, every `dipEvery`-th round deals the FLOOR of the band among `dipDecoy` times the decoys.
     That is B.15's "later rounds sometimes have FEWER targets among many more decoys", and it is the round that breaks
     the pattern — round 8 deals eight targets in twenty-eight decoys where round 7 dealt up to thirteen in sixteen.
   · the flash falls a THIRD as fast as it did and stops far higher: 1100ms to 902ms over ten rounds, where it used to run
     1130ms to 500ms. Time is no longer the lever.
   · size variation is new (`sizeFrom` on): every shape is drawn at ± that fraction of the base size, so a crowd is not a
     grid of identical marks any more. Find gets its own below. */
export const SPOT_RAMP = { loBase:5, loPer:0.45, hiBase:7, hiPer:1.0, nCap:14,
  decoyBase:3, decoyPer:2.2, decoyCap:34,
  flashMax:1100, flashPer:22, flashMin:820,
  dipFrom:5, dipEvery:3, dipDecoy:1.5,
  driftFrom:2, driftBase:8, driftPer:6, spinFrom:4, spinBase:14, spinPer:6,
  sizeFrom:3, sizeBase:0.12, sizePer:0.045, sizeCap:0.5, sizeMin:16 };
// Spot · Find. v14 (6.30): the first half-second of a find is free — anything faster SUBTRACTS from the total, so a fast find
// is rewarded rather than merely cheap. v17 (B.1) floors the running total at zero: the rebate was unbounded and the Streak
// could not end. v14 (6.29): the crowd and the movement both ramp harder than they did; the opening is unchanged
// v17 (B.15): `sizeVar` — Find gets the same size variation Count gained, because a crowd of identical marks is the thing
// the eye scans fastest and that is exactly what Find is testing
export const SPOT_FIND = { leeway:0.5, nBase:16, nSpan:54, drift:34, sizeVar:0.3, sizeMin:14 };
