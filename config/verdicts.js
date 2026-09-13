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

/* BUILD 35 — two changes to this table, and the file they came from.
   v20 (D.10): Timing and Reaction are keyed PER MODE. Stopwatch (seconds off) and Hidden (ms off the marker) shared one `at`
   triple, and so did Flash (raw ms) and Go / No-go (ms over the 180ms gate) — Aiden: "hidden and stopwatch should be
   separated". Each of the four is seeded with its parent's lines and numbers, the `hold` / `hold:cut` pattern already here,
   and the two parent rows are gone rather than left as a second copy nothing reads. verdictKey() and GV() take 'g:d' first,
   so nothing that looks a verdict up changed. Timing was Aiden's call; Reaction is Cowork's by the same argument.
   The Verdict Desk (Aiden, 2026-09-13; `_review/2026-09-13_personal_verdict-desk-edits.md`): his `at` triples for Quick
   Tap, Dots, both Estimate modes and Sequence, and his lines for Quick Tap, Dots and both Estimate modes. Not built, and
   each still build 34's: Quick Tap `ok/4` and Estimate · Grow `bad/0` (both half-typed — the file says confirm first),
   Estimate · Grow `ace/0`, `ace/2`, `good/0`, `good/4` (not edited), every line for Sequence, Timing, Reaction and Spot,
   and Timing's thresholds (#414 — the 24000 scale was an artefact of the page, not a decision). The `at` values are his
   thresholds in each game's own unit against QUALITY's scale: Quick Tap 2.90 / 2.20 / 1.50 a second over 6, Dots 2.50 /
   2.00 / 1.40 over 4.5, Grow 5 / 10 / 30% off over 40, Cut 4.5 / 8 / 15% off over 40, Sequence 11 / 8 / 5 notes over 16. */
export const VERDICTS = {
  'quick-tap': { at:[.4833,.3667,.25], lines:{
    bad: ['Warming up, try again!','A few mistakes?',"Alright let's go again.",'Could be quicker...','Do you need a coffee?'],
    ok:  ['Good work!','Steady pace!','Keep pushing!','Decent speed.','Halfway to quick.'],
    good:['Great job!','Proper fast.','Solid run!',"You're switched on today.",'Well done!'],
    ace: ['Look at you go!',"You're flying!","You're a Quick Tap master!",'Do those thumbs come with a warning?','Quick.  Damn quick.'] } },
  'dots': { at:[.5556,.4444,.3111], lines:{
    bad: ['Maybe try fingers instead of thumbs?','The dots might be winning...','Have another crack.','Can we pick up the speed?','You need to be one with the dots'],
    ok:  ['You own the dots.','Decent speed, can you go faster?',"In the 20's!","That's worthy of the first key.",'Solid, but could you improve?'],
    good:['Quick work!','Great job!','That was some serious speed.','Very good run!','Be one with the dots.'],
    ace: ['Are you cheating?','Quickest hands in the West.','That will be hard to top.','You are the Dots master!','Wow, what a run!'] } },
  'hold': { at:[.875,.75,.25], lines:{
    bad: ['Nowhere near. Feel the rate, not the shape.','Make sure you match the total area','A bit off but not the worst','Were you just guessing or...','Back to the drawing board.'],
    ok:  ['Decent estimation skills!','In the ball park for sure.','Not a bad run at all.','Reasonable, but could you do better?',"You're getting there!"],
    good:['Good eye.','Tight. Nearly there!','You were on the ball for that one!','Close to being an amazing run!','One step off machine.'],
    ace: ['Machine-adjacent.','That was not a normal run.','Dead on, round after round.','Nothing to correct, perfection.','Your estimation skills are unmatched!'] } },
  'hold:cut': { at:[.8875,.8,.625], lines:{
    bad: ["I wouldn't let you cut my birthday cake...",'Hmmmm, maybe we work on this one.','Give me back that knife please.','Do you understand the game or...?','Measure twice, cut once'],
    ok:  ['Getting there, solid run!','Close enough, good enough.','Good run, could we improve?','Taking your time, nice to see!','You know your percentages!'],
    good:["You've got the eye!",'Clean cutting.','Certified birthday cake cutter!','See the cut, be the cut.','Sliced and diced!'],
    ace: ['Surgical!','Wow, excellent cutting!','Are you a doctor?',"Surely there's cheating involved...","You're a pro!"] } },
  'sequence': { at:[.6875,.5,.3125], lines:{
    bad: ['Short memory. Go again.','Lost it early.','Three notes and gone.','Watch it, then play it.','That went fast.'],
    ok:  ['Building. Say it out loud.','Middling memory.','Better. Stop rushing the reply.','You are holding some of it.','Halfway to long.'],
    good:['Long memory.','That is a real chain.','You held it together.','Nearly very long.','Good hold on it.'],
    ace: ['Very long memory.','That is not normal. Keep it.','You are storing these somewhere.','Nothing dropped.','Hard to beat that.'] } },
  // v20 (D.10): was one 'timing' row. Seeded from it, identical until Aiden writes them apart (#413 / #414)
  'timing:stopwatch': { at:[.85,.6,.35], lines:{
    bad: ['Way off. Count it out loud.','The clock won.','Seconds are longer than that.','Not close. Again.','You guessed. It showed.'],
    ok:  ['Getting the rhythm.','In the region.','Better. Trust the first count.','Nearly honest timing.','You are close to the beat.'],
    good:['Good clock.','Tight timing.','You felt the second.','Nearly very good.','That is a steady internal beat.'],
    ace: ['Very good clock.','That is not normal. Keep it.','Dead on, repeatedly.','You do not need the timer.','Nothing to correct.'] } },
  'timing:hidden': { at:[.85,.6,.35], lines:{
    bad: ['Way off. Count it out loud.','The clock won.','Seconds are longer than that.','Not close. Again.','You guessed. It showed.'],
    ok:  ['Getting the rhythm.','In the region.','Better. Trust the first count.','Nearly honest timing.','You are close to the beat.'],
    good:['Good clock.','Tight timing.','You felt the second.','Nearly very good.','That is a steady internal beat.'],
    ace: ['Very good clock.','That is not normal. Keep it.','Dead on, repeatedly.','You do not need the timer.','Nothing to correct.'] } },
  // v20 (D.10): was one 'reaction' row — raw ms and ms over the 180ms gate shared one triple. Seeded from it
  'reaction:flash': { at:[.85,.6,.35], lines:{
    bad: ['Asleep. Go again.','Slow off the mark.','You blinked.','Late. Every time.','Wake up and run it again.'],
    ok:  ['Awake.','Respectable. Not quick.','Better. Stop guessing the flash.','Mid. Push it down.','You are nearly fast.'],
    good:['Quick.','Good reflexes.','That is a fast hand.','Nearly very quick.','Low numbers. Good.'],
    ace: ['Very quick.','That is not normal. Keep it.','Faster than most people can blink.','Nothing between seeing and tapping.','Do that twice and I will worry.'] } },
  'reaction:nogo': { at:[.85,.6,.35], lines:{
    bad: ['Asleep. Go again.','Slow off the mark.','You blinked.','Late. Every time.','Wake up and run it again.'],
    ok:  ['Awake.','Respectable. Not quick.','Better. Stop guessing the flash.','Mid. Push it down.','You are nearly fast.'],
    good:['Quick.','Good reflexes.','That is a fast hand.','Nearly very quick.','Low numbers. Good.'],
    ace: ['Very quick.','That is not normal. Keep it.','Faster than most people can blink.','Nothing between seeing and tapping.','Do that twice and I will worry.'] } },
  'spot:count': { at:[.85,.6,.35], lines:{
    bad: ['Guessing. Slow down.','That was a number, not a count.','Miles out.','Look at the whole screen.','You counted the wrong things.'],
    ok:  ['Half of them. Look wider.','Getting closer.','Better. Stop counting one by one.','Roughly right.','The eye is coming.'],
    good:['Good eye.','Nearly all of them.','You are seeing the group.','Tight counting.','Close to exact.'],
    ace: ['That is not normal. Keep it.','Exact, round after round.','You see the number, not the shapes.','Nothing missed.','Hard to do better.'] } },
  'spot:find': { at:[.85,.6,.35], lines:{
    bad: ['Slow. Scan, do not stare.','It was there the whole time.','Too long on each one.','Lost in the crowd.','Again, and look wider.'],
    ok:  ['Finding them.','Decent search.','Better. Let the odd one come to you.','Mid pace.','You are nearly quick.'],
    good:['Quick eye.','Straight to it, mostly.','Good scanning.','Nearly very quick.','Low times. Good.'],
    ace: ['Very quick eye.','That is not normal. Keep it.','You did not search. You saw.','Nothing wasted.','That will be hard to beat.'] } },
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
   is the whole range that mode has. Judgement, marked (guess) in FEEDBACK-v18, and one line each to retune. */
export const ROUND_AT = {
  'timing:stopwatch': [0.06, 0.10, 0.30],
  'timing:hidden':    [40, 70, 240],
  'reaction:flash':   [200, 260, 330],
  'reaction:nogo':    [280, 360, 470],
  'hold:grow':        [2, 5, 10],
  'hold:cut':         [2, 4, 8],
  'spot:count':       [0, 1, 2],
  'spot:find':        [1, 2, 4],
};
