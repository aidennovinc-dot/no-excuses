/* No Excuses — the games table and every number that tunes them (build 16, refactor stage 2). DATA ONLY (A2).
   A new game is one entry in GAMES plus an engine. What used to sit beside the data as functions moved out under the
   same id: the score formatters (fmt / cols / pic) to ui/format.js, the quality predicate to progress/rules.js. */

// the Streak length (v11): endless until the budget runs out; score = rounds
export const STREAK = -1;
// the feel. Nothing here is user-facing
export const CFG = { lockout: 750, countStep: 300, holdRate: 38 /* vmin per second */, dotLeeway: 1.18 /* hidden: hit radius × this */ };
// sequence speed is not a choice any more (v9): it starts at 0.5s a key and tightens 15ms a round, floor 0.28s
export const SEQ_STEP = { start: 500, step: 15, floor: 280 };
// length faces (v11): the name everywhere, the seconds only on the pick sheet. 7 and 10 are the pass & play lengths (PASS_LEN)
export const LEN_NAME = { 5:'Sprint', 7:'Duel', 10:'Duel', 15:'Dash', 30:'Marathon' };
export const MODE_NAME = { two:'Two', blind:'Blind', four:'Four', lead:'Lead', grow:'Grow', cut:'Cut', solo:'', stopwatch:'Stopwatch', hidden:'Hidden', flash:'Flash', nogo:'Go / No-go', count:'Count', find:'Find' };
export const SHAPE_WORD = { circle:'circle', tri:'triangle', square:'square' };
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
// v15 (4.5): Sequence versus is lives-based — the keys come off the length row (3/5/7), `opens` is how many notes it starts
// with, and the pattern grows a note a round. Three lives each is Cowork's number, not Aiden's (guess)
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
  // v15 (4.5): versus keeps the key row — 3, 5 or 7 — instead of hiding it, because the keys are half of what the two
  // players are agreeing to. `vsLens` is what makes the length row show in versus at all
  'sequence': { name:'Sequence', modes:['solo'], lens:[3,5,7], unit:' keys', timed:false, versus:true, vsLens:[3,5,7],
    solo:'Watch the notes, then play them back.' },
  // v7 — four new games. v11: Set / Streak per mode; every timing figure is an absolute difference
  'timing': { name:'Timing', modes:['stopwatch','hidden'], unit:' attempts', timed:false, lower:true, lead:true,
    stopwatch:'Tap when you think the time is right.', hidden:'Tap when the ball has reached the marker.',
    suffix:'s', scoreWord:'s off', streak:{ ...STREAK_CFG },
    // hidden (v10) is scored in pixels off the marker, not seconds. v11: Set is 10 runs, total px
    per:{ hidden:{ suffix:'px', scoreWord:'px off', streak:{ ...STREAK_CFG } } } },
  'reaction': { name:'Reaction', modes:['flash','nogo'], lenNames:{5:'Best of 5',9:'Best of 9',15:'Best of 15'}, unit:' attempts', timed:false, lower:true, versus:['flash'], vsLens:[5,9,15],
    flash:'Tap the moment it flashes white.', nogo:'Tap only your shape. Three wrong taps end it.',
    suffix:'ms', scoreWord:'ms', streak:{ ...STREAK_CFG },
    // Go/No-go (v11): Set = 5 rounds (v14 section 5), average ms on right taps + 150ms per wrong tap (v14 A.2); v14 (6.2 / L5): Streak = shapes survived on a 1000ms budget
    per:{ nogo:{ streak:{ ...STREAK_CFG, scoreWord:'shapes' } } } },
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
export const SET_COPY = {
  'hold:grow':        { rounds:7,  set:'7 rounds, lowest average % off wins',            streak:'Highest round wins!' },
  'hold:cut':         { rounds:10, set:'10 rounds, lowest % difference wins',            streak:'Highest round wins!' },
  'timing:stopwatch': { rounds:5,  set:'5 rounds, lowest average time difference wins',  streak:'Highest round wins!' },
  'timing:hidden':    { rounds:10, set:'10 rounds, lowest total pixels off wins',        streak:'Highest round wins!' },
  'reaction:flash':   { rounds:5,  set:'5 rounds, lowest time wins',                     streak:'Highest round wins!' },
  'reaction:nogo':    { rounds:5,  set:'5 rounds, lowest average reaction time wins — wrong taps add 150ms', streak:'Highest round wins!' },
  'spot:count':       { rounds:10, set:'10 rounds, lowest total miscount wins',          streak:'Highest round wins!' },
  'spot:find':        { rounds:10, set:'10 rounds, lowest total time wins',              streak:'Highest round wins!' },
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
// Spot · Count (v13 10.1): round r deals nBase + floor(r/nPer) targets (cap nCap) and floor(r/decoyDiv) decoys (cap decoyCap);
// the flash falls flashPer ms a round from flashMax to flashMin; from driftFrom the shapes drift, from spinFrom they turn as well
// v14 (6.27): round 1 used to be two shapes for 1.34s, which nobody gets wrong. It opens on five targets and a decoy, adds one
// target and one decoy every round, and the flash is shorter throughout — the score is total miscount, so it should feel like a
// judgement call, not something you always get right. The full difficulty review Aiden asked for is section 12.1 / #366
export const SPOT_RAMP = { nBase:4, nPer:1, nCap:16, decoyDiv:1, decoyCap:12, flashMax:1200, flashPer:70, flashMin:320, driftFrom:4, driftBase:10, driftPer:5, spinFrom:7, spinBase:18, spinPer:7 };
// Spot · Find. v14 (6.30): the first half-second of a find is free — anything faster SUBTRACTS from the total, so a fast find
// is rewarded rather than merely cheap. v14 (6.29): the crowd and the movement both ramp harder than they did; the opening is unchanged
export const SPOT_FIND = { leeway:0.5, nBase:16, nSpan:54, drift:34 };
