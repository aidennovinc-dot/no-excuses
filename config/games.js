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
// v14 (4.14): versus ends on first to VS_TARGET as well as first to lead by VS_LEAD. 100 is the number Aiden gave on Quick Tap;
// every other game's figure is set from its own scale (a guess Aiden corrects next batch). VS_CAP is the backstop, not a win condition
export const VS_TARGET = { 'quick-tap':100, 'dots':60 };
// the rate bar's top, hits per second, for the timed games
export const RATE_MAX = { 'quick-tap':6, 'dots':4.5 };
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
  'sequence': { name:'Sequence', modes:['solo'], lens:[3,5,7], unit:' keys', timed:false, versus:true,
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
    // Go/No-go (v11): Set = 20 shapes, average ms on right taps + 150ms per wrong tap; Streak = shapes survived until three wrong taps
    per:{ nogo:{ streak:{ ...STREAK_CFG, scoreWord:'shapes' } } } },
  // v8: Count and Find merged into Spot. v13: Normal/Hard are gone — the ramp is the difficulty (10.1). Count scores total miscount, Find cumulative seconds; both lower is better, both Set (10 rounds) or Streak (a budget)
  'spot': { name:'Spot', modes:['count','find'], unit:' rounds', timed:false, lower:true,
    count:'Count the shapes flashed. Ignore the decoys.', find:'Find the shape you were shown.',
    suffix:'', scoreWord:'miscount', streak:{ ...STREAK_CFG },
    per:{ find:{ lower:true, suffix:'s', scoreWord:'s total', streak:{ ...STREAK_CFG } } } },
};

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
  'reaction:nogo':    { rounds:5,  set:'5 rounds, lowest average reaction time wins',    streak:'Highest round wins!' },
  'spot:count':       { rounds:10, set:'10 rounds, lowest time wins',                    streak:'Highest round wins!' },
  'spot:find':        { rounds:10, set:'10 rounds, lowest total time wins',              streak:'Highest round wins!' },
};

// Estimate · Cut (v11 / v13 6.4): the shapes with an axis of symmetry never ask for 50%; the pools and the shares asked, by
// level (min(8, round)) — the first entry whose level is >= the round applies. No pool past level 4 = every Cut shape
export const ESTIMATE = {
  SYM: ['square','circle','triangle','bar','ring','plus','star'],
  CUT_POOLS: [[2,['square','circle','triangle','bar']],[4,['ring','star','plus','stairs','tetris','crescent','blob']]],
  CUT_SHARES: [[2,[30,35,40,45]],[4,[40,35,45,30,40]],[6,[30,25,35,20,25]],[8,[25,20,15,10,25,30]]],
};
// Spot · Count (v13 10.1): round r deals nBase + floor(r/nPer) targets (cap nCap) and floor(r/decoyDiv) decoys (cap decoyCap);
// the flash falls flashPer ms a round from flashMax to flashMin; from driftFrom the shapes drift, from spinFrom they turn as well
export const SPOT_RAMP = { nBase:2, nPer:2, nCap:12, decoyDiv:1.5, decoyCap:10, flashMax:1400, flashPer:60, flashMin:350, driftFrom:6, driftBase:10, driftPer:5, spinFrom:9, spinBase:18, spinPer:7 };
