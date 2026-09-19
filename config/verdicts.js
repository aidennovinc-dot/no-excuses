/* No Excuses — the result verdicts (build 29, v17 §B.25). DATA ONLY (A2): no imports, no functions.

   Four tiers, five lines each, per game — and the THRESHOLDS live here beside the lines rather than in the code that
   picks one. Until build 29 the split was five hard-coded steps (`q>=1?4:q>=.75?3:…`) in progress.js against five-line
   arrays in copy.js, so changing where "good" starts meant editing a ternary. One table now: a game's row carries its
   own cut-offs and its own twenty lines, and `verdict()` in progress.js only reads it.

   `at` is [ace, good, ok] against the game's own quality (0..1, `QUALITY` in progress/rules.js) — at or above the first
   is almost perfect, above the second good, above the third alright, below it bad. They are the same three numbers for
   every game today because quality is already normalised per game; they are written out per game anyway, so one game
   can be retuned from a review note without touching the others.

   The keys are the `GV()` shape ('g' or 'g:d'), so a mode with its own feel — Estimate · Cut, Spot · Find — carries its
   own lines and everything else inherits its game's. TIER COLOUR AND SOUND ARE SOLO ONLY (L4): light blue is Player 2
   and red is Player 1, so a two-player result keeps the player colours and the tiers stay out of it. The colours are
   here rather than in styles/app.css because the review catalogue prints them beside the lines (§B.26) and a second
   copy would drift. The sound of each tier is `VERDICT_FX` in config/audio.js, keyed by the same id. */

/* Best first, which is the order they are tested in. `of` is the index into THAT GAME'S `at` — so a tier's threshold is
   never written here, only which of the game's three numbers it reads. `of:null` is the floor: below all three. */
// The Verdict Desk (Aiden, 2026-09-13, built at build 35): the four names are his — they were almost perfect / good / alright / bad
export const VERDICT_TIERS = [
  { id:'ace',  name:'Amazing!', col:'#6EC6FF', of:0 },
  { id:'good', name:'Great!',   col:'#3DD68C', of:1 },
  { id:'ok',   name:'Good.',    col:'#E8C547', of:2 },
  { id:'bad',  name:'Meh.',     col:'#E0453B', of:null },
];

/* A run that ends badly enough to have no tier of its own — a timed run with nothing on it, more misses than hits — is
   `bad`. It has a line already and it is unambiguously the bottom, so it wears the bad tier’s colour and sound rather
   than being the one result on the screen with neither. Go / No-go’s three-wrong-taps ending used to be the third case
   and is retired at build 31 (v18 B.1c): nothing ends that mode early now. */
export const VERDICT_FAIL_TIER = 'bad';

/* BUILD 35 — v20 (D.10): Timing and Reaction are keyed PER MODE. Stopwatch (seconds off) and Hidden (ms off the marker)
   shared one `at` triple, and so did Flash (raw ms) and Go / No-go (ms over the 180ms gate) — Aiden: "hidden and stopwatch
   should be separated". The parent rows are gone rather than left as a second copy nothing reads; verdictKey() and GV()
   take 'g:d' first, so nothing that looks a verdict up changed.

   BUILD 36 — THE VERDICT DESK EXPORT, version 658, 269 entries (`_review/2026-09-14_personal_verdict-desk-export.md`),
   superseding the 2026-09-13 snapshot. Every line it carries, for all eleven rows, Reaction's two `at` triples and the
   per-round ceilings below for Cut, Flash and Go / No-go. A line the export leaves blank keeps what it had. Trailing
   spaces trimmed.

   BUILD 37 — Aiden, 2026-09-14. #414 is closed and TIMING'S THRESHOLDS BUILD; its QUALITY scales do not move (Stopwatch 5s,
   Hidden 5400ms). Stopwatch's `at` is 0.90 / 0.74 / 0.56 — a 0.50s / 1.30s / 2.20s total over five attempts — where 0.90 is
   Claude's number on his instruction, five of his own 0.10s per-round ceilings; Hidden's is his 0.9259 / 0.8796 / 0.8241,
   400 / 650 / 950ms. Two of Go / No-go's lines were his typing and are corrected ("You got it!", "one with the shapes").
   The `at` values are thresholds in each game's own unit against QUALITY's scale: Quick Tap 2.90 / 2.20 / 1.50 a second
   over 6, Dots 2.50 / 2.00 / 1.40 over 4.5, Grow 5 / 10 / 30% off over 40, Cut 4.5 / 8 / 15% off over 40, Sequence 11 /
   8 / 5 notes over 16, Stopwatch 0.50 / 1.30 / 2.20s over 5, Hidden 400 / 650 / 950ms over 5400, Flash 230 / 265 / 295ms,
   Go / No-go 320 / 350 / 405 on its 70ms-offset curve. */
export const VERDICTS = {
  /* v29 (items 11 / 18, build 56): THE GAUNTLET'S OWN VERDICT SET, a row like any game's. Its score is a percentage of the bar, so
     the thresholds are read straight off it: 100 matched the bar, 80 close, 55 a finish. run/gauntlet.js reads it through the same
     VERDICT_TIERS as every other result, because progress.js's verdict() asks GAMES[r.g] and a Gauntlet is not a game. */
  gauntlet: { at:[100, 80, 55], lines:{
    bad: ['A finish is a finish.','Every game, start to end — now do it faster.','The bar is still ahead of you.','That is the shape of it. Again.','Nine games is nine chances. Go again.'],
    ok:  ['Solid all the way through.','No weak game in there.','Getting close to the bar.','Respectable across the board.','That will do. It will not beat the bar.'],
    good:['That is a serious run.','Almost the whole bar.','Very few people get that far.','Strong, game after game.','One or two games off it.'],
    ace: ['You beat the bar.','Past 100 — the whole way through.','Nothing left to prove here.','That is the Gauntlet answered.','Nine games, and the bar behind you.'] } },
  'quick-tap': { at:[.4833,.3667,.25], lines:{
    bad: ['Warming up, try again!','A few mistakes?',"Alright let's go again.",'Could be quicker...','Do you need a coffee?'],
    ok:  ['Good work!','Steady pace!','Keep pushing!','Decent speed.','Almost a Great!'],
    good:['Great job!','Proper fast.','Solid run!',"You're switched on today.",'Well done!'],
    ace: ['Look at you go!',"You're flying!","You're a Quick Tap master!",'Do those thumbs come with a warning?','Quick.  Damn quick.'] } },
  'dots': { at:[.5556,.4444,.3111], lines:{
    bad: ['Maybe try fingers instead of thumbs?','The dots might be winning...','Have another crack.','Can we pick up the speed?','You need to be one with the dots'],
    ok:  ['You own the dots.','Decent speed, can you go faster?',"In the 20's!","That's worthy of the first key.",'Solid, but could you improve?'],
    good:['Quick work!','Great job!','That was some serious speed.','Very good run!','Be one with the dots.'],
    ace: ['Are you cheating?','Quickest hands in the West.','That will be hard to top.','You are the Dots master!','Wow, what a run!'] } },
  // build 36: ace/2 is not in the export and keeps build 34's line
  'hold': { at:[.875,.75,.25], lines:{
    bad: ['Ooft, maybe try another round.','Make sure you match the total area','A bit off but not the worst','Were you just guessing or...','Back to the drawing board.'],
    ok:  ['Decent estimation skills!','In the ball park for sure.','Not a bad run at all.','Reasonable, but could you do better?',"You're getting there!"],
    good:['Great eye!','Tight. Nearly there!','You were on the ball for that one!','Close to being an amazing run!','One step off perfect.'],
    ace: ['Machine-like!','That was not a normal run.','Dead on, round after round.','Nothing to correct, perfection.','Your estimation skills are unmatched!'] } },
  'hold:cut': { at:[.8875,.8,.625], lines:{
    bad: ["I wouldn't let you cut my birthday cake...",'Hmmmm, maybe we work on this one.','Give me back that knife please.','Do you understand the game or...?','Measure twice, cut once'],
    ok:  ['Getting there, solid run!','Close enough, good enough.','Good run, could we improve?','Taking your time, nice to see!','You know your percentages!'],
    good:["You've got the eye!",'Clean cutting.','Certified birthday cake cutter!','See the cut, be the cut.','Sliced and diced!'],
    ace: ['Surgical!','Wow, excellent cutting!','Are you a doctor?',"Surely there's cheating involved...","You're a pro!"] } },
  'sequence': { at:[.6875,.5,.3125], lines:{
    bad: ['Was that a mistaken tap?','Lost it early!','I know you can do better than that.','Go on, have another crack!','Whoops!'],
    ok:  ['Decent performance.','Not half bad!','Can you get to 8?','Taxing the memory.','You’ve got more in you!'],
    good:['Great memory!','A long chain!','An ear for music!','Very good run!','Nicely done!'],
    ace: ['Photographic!','Far above average!','A modern day Mozart.','Sequence master!','Amazing!'] } },
  // build 37: Aiden's thresholds — 0.50 / 1.30 / 2.20s total error over the Set (0.90 is five of his 0.10s per-round ceilings). ok/0 kept from build 34
  'timing:stopwatch': { at:[.9,.74,.56], lines:{
    bad: ['I’ll keep my watch.','Maybe try this one again.','Maybe tap in time?','Have another crack.','Appreciate the attempt.'],
    ok:  ['Getting the rhythm.','In the ballpark!','Learn to trust your gut.','Not bad at all.','Close, but I think you could do better!'],
    good:['Great intuition.','Tight.  Tight tight tight tight!','On a roll!','Very close timing.','Very very good.'],
    ace: ['The human-stopwatch hybrid!','Who needs clocks when we have you?','The stopwatch master!','More accurate than my Casio!','Uncanny performance!'] } },
  // build 37: Aiden's thresholds — 400 / 650 / 950ms total over the Set
  'timing:hidden': { at:[.9259,.8796,.8241], lines:{
    bad: ['Was there an accidental tap in there?','The wall won that one.','It really was hidden…','Maybe another attempt?','Have another go!'],
    ok:  ['Feel the ball, be the ball.','In the ball park.','A touch early or late, but solid!','Decent read.','Getting there!'],
    good:['Great tracking!','Very close!','Nice run!','Well judged.','You’re a natural!'],
    ace: ['You can see through walls!','Right on the marker.','How did you track that?','Perfect judgement.','X-ray vision!'] } },
  // build 36: Aiden's thresholds and lines; bad/1 is not in the export and keeps its line
  'reaction:flash': { at:[.7714,.6714,.5857], lines:{
    bad: ['Did you nod off?','Slow off the mark.','You blinked!','Late every time.','Do you need a coffee?'],
    ok:  ['Consistent but not that quick','Decent but could be better','Bang on average!','Not the worst.','Try again but focus this time!'],
    good:['Quick hands!','Great reflexes.','Very sharp.','Nicely quick.','Great reactions!'],
    ace: ['Lightning quick!','Faster than a blink.','Like a cat!','That is elite.','Reaction master!'] } },
  // build 37: ok/1 and bad/2 corrected — Aiden confirmed both were his typing
  'reaction:nogo': { at:[.5,.44,.33], lines:{
    bad: ['Don’t let them trick you.','Make sure to focus.','You need to be one with the shapes.','Make a stronger coffee?','Have another go, try again.'],
    ok:  ['Decent reactions.','You got it!','Good run.','Decent discipline.','Keep at it!'],
    good:['Great control!','We couldn’t fool you.','Quick and careful.','Very good run!','You know your shapes.'],
    ace: ['Perfect discipline!','Very very very quick.','Nothing fooled you.','Sharp and patient.','You nailed it!'] } },
  // build 36: lines from the export; `at` was not in it and stays
  'spot:count': { at:[.85,.6,.35], lines:{
    bad: ['Blinked and you missed it.','Back to pre-school perhaps?','Counting the wrong shapes?','Don’t count them one by one.','Have another crack.'],
    ok:  ['Decent guesses!','Good intuition.','Stop counting one by one.','Not bad, not bad at all','Good stuff.'],
    good:['Great eye!','Nearly spot on.','Tight counting.','Very close!','You have the knack for counting.'],
    ace: ['Your subconscious mind is strong!','This game is too easy for you.','Brilliant performance!','The counting savant!','The shape detective!'] } },
  // build 36: lines from the export; ace/4 and ok/0, ok/1, ok/3 are not in it and keep theirs; `at` stays
  'spot:find': { at:[.85,.6,.35], lines:{
    bad: ['It was there the whole time!','Too long on each one.','Lost in the crowd.','Scan, do not stare.','Look wider and go again.'],
    ok:  ['Finding them.','Decent search.','Let the odd one come to you.','Mid pace.','Nearly quick!'],
    good:['Quick eye!','Great scanning.','Straight to it, mostly.','Low times, nice.','Very good run!'],
    ace: ['You did not search, you saw!','Straight to it, every time.','Nothing wasted.','Very quick eye.','That will be hard to beat.'] } },
};

/* v18 (§B.10) — THE TIER ON ONE ROUND'S OWN FIGURE. B.10 puts the verdict colour on the NUMBER everywhere it appears,
   and in a round-based game that includes each round's result as it lands. A whole run's tier comes from `QUALITY` in
   progress/rules.js, which an engine may not import (A3) — so the per-round thresholds live here, as data, and
   `games/_shared/tier.js` is the one function that reads them.

   `at` is [ace, good, ok] in that combination's OWN unit and is a CEILING at every step: every round-based game scores
   downward (seconds off, milliseconds, % off, miscount), so a round is `ace` at or under the first number, `good` at or
   under the second, `ok` at or under the third and `bad` above it. Keyed 'game:mode' — the round is always inside one
   mode, so there is no 'g' fallback to build.

   THE NUMBERS ARE THE ENGINES' OWN dead-on / close cut-offs where they had a pair (Timing 0.10s and 0.30s, Hidden's
   10px and 35px converted to milliseconds by B.4, Reaction's quick/good at 200 and 300, Estimate's money/close), with a
   third step added under each so there are four tiers rather than three. Spot · Count is exact / one out / two out, which
   is the whole range that mode has. Judgement, marked (guess) in FEEDBACK-v18, and one line each to retune.
   BUILD 36 (the Verdict Desk export): Cut, Flash and Go / No-go are Aiden's numbers. BUILD 37: so are Timing's. A round's
   ceiling is DELIBERATELY MORE FORGIVING than a fifth of the Set's — Stopwatch 0.10s a round against a 0.50s Set, Hidden
   95ms a round against 400ms over the Set — and that is the intent, not a slip to "correct". */
export const ROUND_AT = {
  'timing:stopwatch': [0.1, 0.3, 0.55],
  'timing:hidden':    [40, 70, 95],
  'reaction:flash':   [225, 255, 285],
  'reaction:nogo':    [299, 330, 400],
  'hold:grow':        [2, 5, 10],
  'hold:cut':         [3.5, 5.5, 9],
  'spot:count':       [0, 1, 2],
  'spot:find':        [1, 2, 4],
};
