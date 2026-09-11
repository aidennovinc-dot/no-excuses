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
export const VERDICT_TIERS = [
  { id:'ace',  name:'almost perfect', col:'#6EC6FF', of:0 },
  { id:'good', name:'good',           col:'#3DD68C', of:1 },
  { id:'ok',   name:'alright',        col:'#E8C547', of:2 },
  { id:'bad',  name:'bad',            col:'#E0453B', of:null },
];

/* A run that ends badly enough to have no tier of its own — Go / No-go's three wrong taps, a timed run with nothing on
   it, more misses than hits — is `bad`. It has a line already and it is unambiguously the bottom, so it wears the bad
   tier's colour and sound rather than being the one result on the screen with neither. */
export const VERDICT_FAIL_TIER = 'bad';

export const VERDICTS = {
  'quick-tap': { at:[.85,.6,.35], lines:{
    bad: ['Warming up. Go again.','Slow hands. They get faster.','That was a stretch, not a run.','Barely moving. Again.','Your thumbs were somewhere else.'],
    ok:  ['Landing them. Now stop looking.','Solid enough. Push it.','Steady. Speed is the next problem.','Fine. Faster.','Halfway to quick.'],
    good:['Quick. The next tier is close.','Good hands.','That is a proper run.','Fast, and it held.','Close to sharp.'],
    ace: ['Sharp. Very sharp.','That is not normal. Keep it.','Nothing left on the table.','Thumbs like that are a warning.','Do that again and I will believe it.'] } },
  'dots': { at:[.85,.6,.35], lines:{
    bad: ['Finding the screen. Go again.','The dot was winning.','Chasing, not catching.','Late every time. Again.','You looked for it. Stop looking.'],
    ok:  ['Landing them. Faster now.','Getting there. Cut the travel.','Decent. Move sooner.','You are catching most of them.','Good enough to beat next time.'],
    good:['Quick hands.','Straight lines. Good.','That is real speed.','Barely a wasted move.','Close to radar.'],
    ace: ['Radar. That is not normal.','You were there before it was.','Nothing wasted.','That run will be hard to repeat.','Keep it. Frame it.'] } },
  'hold': { at:[.85,.6,.35], lines:{
    bad: ['Nowhere near. Feel the rate, not the shape.','Wild. Slow the hold down.','Miles off. Count it.','That was a guess.','The shape is not the point. The rate is.'],
    ok:  ['Close-ish. Trust the count.','In the area. Tighten it.','Better. Stop early, not late.','Reasonable. Not right.','You are reading it, roughly.'],
    good:['Good eye.','Tight. Nearly there.','You felt that one.','Small errors, every round.','One step off machine.'],
    ace: ['Machine-adjacent.','That is not normal. Keep it.','Dead on, round after round.','Nothing to correct.','You have the rate memorised.'] } },
  'hold:cut': { at:[.85,.6,.35], lines:{
    bad: ['Way off. Look at the whole shape first.','That cut was hopeful.','Halves are not where you think.','Wild line. Again.','You cut before you looked.'],
    ok:  ['Getting there. Think in halves.','Near enough to annoy you.','Better. Slow the line down.','Rough, but reading it.','The eye is coming.'],
    good:['Good eye.','Clean lines.','Nearly surgical.','You saw the split.','Tight cutting.'],
    ace: ['Surgical.','That is not normal. Keep it.','Every line where it should be.','Nothing to take off that.','You cut it before you drew it.'] } },
  'sequence': { at:[.85,.6,.35], lines:{
    bad: ['Short memory. Go again.','Lost it early.','Three notes and gone.','Watch it, then play it.','That went fast.'],
    ok:  ['Building. Say it out loud.','Middling memory.','Better. Stop rushing the reply.','You are holding some of it.','Halfway to long.'],
    good:['Long memory.','That is a real chain.','You held it together.','Nearly very long.','Good hold on it.'],
    ace: ['Very long memory.','That is not normal. Keep it.','You are storing these somewhere.','Nothing dropped.','Hard to beat that.'] } },
  'timing': { at:[.85,.6,.35], lines:{
    bad: ['Way off. Count it out loud.','The clock won.','Seconds are longer than that.','Not close. Again.','You guessed. It showed.'],
    ok:  ['Getting the rhythm.','In the region.','Better. Trust the first count.','Nearly honest timing.','You are close to the beat.'],
    good:['Good clock.','Tight timing.','You felt the second.','Nearly very good.','That is a steady internal beat.'],
    ace: ['Very good clock.','That is not normal. Keep it.','Dead on, repeatedly.','You do not need the timer.','Nothing to correct.'] } },
  'reaction': { at:[.85,.6,.35], lines:{
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
