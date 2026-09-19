/* No Excuses — the two Gauntlets, as runs (v29 items 11 / 18, build 56). DATA ONLY (A2).

   WHAT A GAUNTLET IS. One tap, then every game back to back, first to last, and one score at the end. Quitting means
   starting from the first game again — there are no mid-run retries (item 11, Aiden). A Gauntlet advances NOTHING: no key,
   no clearance bar, no unlock, no achievement, and nothing of it reaches a game's board. It keeps its own board, which is
   the L10 principle applied to a thing that is not a mode (Cowork's call where item 18 is silent; FEEDBACK-v29 says so).

   THE ROSTERS ARE AIDEN'S OWN (v28 item 18, typed 2026-09-18, superseding the mode lists in item 11). His words are on the
   left, the ids they map to on the right, and where his word could mean two things the choice is stated:

     Quick Tap · Two         → quick-tap:two      Sprint = 5, Marathon = 30 (L2's own length names)
     Dots · Blind            → dots:blind         same two lengths
     Estimate Grow AND Cut   → hold:grow + hold:cut   ONE step of the run with two plays, in that order, and ONE spoke on
                                                  the web (their average), which is what "score Estimate as one game" asks
     Reaction · Flash        → reaction:flash
     Go / No-go              → reaction:nogo      Go / No-go is Reaction's second mode, not a game of its own
     Stopwatch               → timing:stopwatch   Timing's first mode
     Hidden                  → timing:hidden      Timing's second mode (register #450 names it "Timing – Hidden")
     Find                    → spot:find          Spot's second mode
     Sequence                → NOT IN EITHER      ("no sequence required", written under both lists)

   "FULL SET" is each mode's own Set length — the round count in SET_COPY, which is the only Set a mode has. "2 rounds" and
   "1 round" are NOT lengths the pick sheet offers, and nothing here invents a mode: a Gauntlet step carries its own round
   count, `s`, and the engine reads it as `ctx.len` the way it reads any Set. Mega is Mini at full length, same roster,
   same order — not a different list.

   SCORING (item 11, Aiden's shape). Every game already has a bar in its own unit, so each step is scored as a PERCENTAGE
   of that bar: "more is better" is the player over the bar, "lower is better" is the bar over the player. 100 = matched it.
   The Gauntlet's score is the average across the web's spokes, UNCAPPED, so beating the bar cumulatively reads over 100.
     · `ref` is the combination whose bar the step is scored against — the same mode at a length that HAS a bar.
     · `tot` marks a mode scored as a TOTAL rather than a mean (Stopwatch's seconds, Hidden's milliseconds, Find's
       seconds): its reference is scaled by this step's rounds over the reference's, because two rounds of a ten-round
       total is not the same number. A mean does not scale, so it carries no flag.
     · `web` is the spoke this step draws on; two steps sharing one are averaged into it (Estimate).
   THE TIER IS A SWITCH. `SCORE.tier` is which column of config/key-bars.js the bars come from. Item 11's design says the
   AUTHOR bars — but every Author cell is a #426 placeholder the Key Unlocks Desk proposed, never a time Aiden has played,
   so a score against them means nothing until #349 sets real ones. Until then the switch reads the KEY 1 column, which is
   Aiden's own number on all thirty rows (`conf:'set'`, build 44), so the run plays and scores sensibly today. One line
   moves it: `tier: 'author'`. */

const MINI = [
  { g: 'quick-tap', d: 'two', s: 5, ref: 'quick-tap:two:5', web: 'quick-tap:two' },
  { g: 'dots', d: 'blind', s: 5, ref: 'dots:blind:5', web: 'dots:blind' },
  { g: 'hold', d: 'grow', s: 2, ref: 'hold:grow:7', web: 'hold' },
  { g: 'hold', d: 'cut', s: 2, ref: 'hold:cut:10', web: 'hold' },
  { g: 'reaction', d: 'flash', s: 2, ref: 'reaction:flash:5', web: 'reaction:flash' },
  { g: 'reaction', d: 'nogo', s: 2, ref: 'reaction:nogo:5', web: 'reaction:nogo' },
  // "1 round, 5-6 seconds" — the WINDOW the round's own target is drawn from, not a fixed 5.0 (item 18)
  { g: 'timing', d: 'stopwatch', s: 1, ref: 'timing:stopwatch:5', tot: 1, web: 'timing:stopwatch', target: [5, 6] },
  { g: 'timing', d: 'hidden', s: 2, ref: 'timing:hidden:10', tot: 1, web: 'timing:hidden' },
  { g: 'spot', d: 'find', s: 2, ref: 'spot:find:10', tot: 1, web: 'spot:find' },
];

const MEGA = [
  { g: 'quick-tap', d: 'two', s: 30, ref: 'quick-tap:two:30', web: 'quick-tap:two' },
  { g: 'dots', d: 'blind', s: 30, ref: 'dots:blind:30', web: 'dots:blind' },
  { g: 'hold', d: 'grow', s: 7, ref: 'hold:grow:7', web: 'hold' },
  { g: 'hold', d: 'cut', s: 10, ref: 'hold:cut:10', web: 'hold' },
  { g: 'reaction', d: 'flash', s: 5, ref: 'reaction:flash:5', web: 'reaction:flash' },
  { g: 'reaction', d: 'nogo', s: 5, ref: 'reaction:nogo:5', web: 'reaction:nogo' },
  { g: 'timing', d: 'stopwatch', s: 5, ref: 'timing:stopwatch:5', tot: 1, web: 'timing:stopwatch' },
  { g: 'timing', d: 'hidden', s: 10, ref: 'timing:hidden:10', tot: 1, web: 'timing:hidden' },
  { g: 'spot', d: 'find', s: 10, ref: 'spot:find:10', tot: 1, web: 'spot:find' },
];

export const GAUNTLET_RUNS = { g1: MINI, g2: MEGA };

/* `tier` is the switch. `perfect` is what a lower-is-better step scores when the player's total is 0 — a real result on
   Estimate and Find, and a division by nothing — stated rather than left as Infinity. `cap` caps ONE step's contribution
   so a freak result cannot carry a bad run; 0 is uncapped, which is what item 11 asks for, and Cowork's 150 is the open
   recommendation beside it. `keep` is how many Gauntlet runs the board holds. */
export const GAUNTLET_SCORE = { tier: 'clear', perfect: 200, cap: 0, keep: 50 };

/* how long the run holds between one game and the next. There is no card naming what is coming — nine games back to back
   would read better with one, and it is the first thing to add here, but it is DOM and timing rather than the run itself. */
export const GAUNTLET_STEP = { gap: 420 };
