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
  /* v29 Section A (57.10, build 57): TWO ROUNDS, not one — "Gauntlet Mini · Stopwatch is two rounds". The window is
     untouched: each of the two targets is still drawn from 5-6s, and `tot` now scales the bar by 2/5 rather than 1/5.
     v29 Section A (58.1, build 58): the 5-6s window MOVED to GAUNTLET_BANDS below — it was the first band and it is now
     one row of the table with the other six, so no step carries a band of its own. Nothing about it changed. */
  { g: 'timing', d: 'stopwatch', s: 2, ref: 'timing:stopwatch:5', tot: 1, web: 'timing:stopwatch' },
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

/* ---------- build 69 (68.28): GAUNTLET · VERSUS — TEST-ONLY ----------
   Aiden: "The gauntlet mini should actually be versing a computer in the versus mode of the games … simulated like a set number of hits per
   second … put it into the game as like an additional version, just so I can test it." And: "Let's make the threshold slightly easier … than
   the key thresholds for the same thing … because they're doing it in one run."
   A RUN OF DUELS, one opponent per game, in this order; lose one and the run is over, showing how far you got. `vs` is the two-player shape the
   duel plays: 2 is the game's own versus (both ends at once — Quick Tap, Dots, Reaction · Flash, Spot · Find), 1 is the turn-by-turn shared
   run for the games with no versus of their own (Estimate · Grow, Stopwatch, Hidden), the player first. Sequence and Spot · Count are left out
   ("I don't think all the games are good for versus mode"). Estimate plays Grow only: one duel per game, and Cut's drag would be a second
   thing for the computer to fake. Quick Tap and Dots are capped at 30s (VERSUS_AI `cap`), the Marathon length.
   It exists only while BUILD_FLAGS.dev (run/gauntlet.js refuses it otherwise), is reached from the Testing screen, and has NO map tile, NO
   chest, NO message row and gates nothing. Like the other two it keeps its own board rows: `score` is duels won. */
const VERSUS = [
  { g: 'quick-tap', d: 'two', s: 30, vs: 2 },
  { g: 'dots', d: 'blind', s: 30, vs: 2 },
  { g: 'hold', d: 'grow', s: 7, vs: 1 },
  { g: 'reaction', d: 'flash', s: 5, vs: 2 },
  { g: 'timing', d: 'stopwatch', s: 5, vs: 1 },
  { g: 'timing', d: 'hidden', s: 10, vs: 1 },
  { g: 'spot', d: 'find', s: 10, vs: 2 },
];

export const GAUNTLET_RUNS = { g1: MINI, g2: MEGA, g3: VERSUS };
// the one test-only Gauntlet — run/gauntlet.js starts it only while BUILD_FLAGS.dev, and only the Testing screen links to it
export const VERSUS_ID = 'g3';

/* THE OPPONENT (68.28), one row per duel, keyed like the duel. `bar` is the KEY_BARS row the computer is derived from — the Skill bar (key 1,
   the `bar` column), read at RUN TIME by games/_shared/bot.js versusPlays(), never a copied number. `level` .85 is 85% of that bar: "slightly
   easier than the key threshold". `kind` is how the bar becomes the ONE number the computer plays at (`len` is the bar row's own length):
     rate   bar ÷ len × level   hits a second — it acts that often (Quick Tap, Dots)
     mean   bar ÷ level         its figure each round, worse than the bar — a slower reaction, a bigger % off (Flash, Grow)
     total  bar ÷ len ÷ level   a Set total turned into one round's figure, then made worse (Stopwatch, Hidden, Find)
   `wobble` is a ± fraction on every action and `miss` the chance an action is the odd miss: a wrong pad (Quick Tap), a fumbled claim (Dots), a
   false start (Flash), or the figure × `missBy` (every other). The average is FIXED — nothing in the computer reads the player's score, so
   there is no rubber-banding — and each duel draws from its own seeded sequence, so a replay is fair but never the same.
   `best` is a best-of (first to a majority of it); `leadBy` / `cap` close Quick Tap and Dots — first to lead by 10, else whoever leads at
   `cap` seconds; Find is first to VS_TARGET rounds, as its versus always was. `say` prints the number, `win` is how the duel is won
   in a few words (the roster line), `rule` is the row in words. */
export const VERSUS_AI = {
  'quick-tap:two': { win: 'lead by 10 · 30s', bar: 'quick-tap:two:30', kind: 'rate', level: 0.85, wobble: 0.08, miss: 0.04, leadBy: 10, cap: 30, dp: 2,
    say: '{v} taps a second', rule: 'taps at a set rate · first to lead by 10 · else whoever leads at 30s' },
  'dots:blind': { win: 'lead by 10 · 30s', bar: 'dots:blind:30', kind: 'rate', level: 0.85, wobble: 0.08, miss: 0.04, leadBy: 10, cap: 30, dp: 2,
    say: '{v} dots a second', rule: 'claims its shapes at a set rate · first to lead by 10 · else whoever leads at 30s' },
  'hold:grow': { win: 'best of 5', bar: 'hold:grow:7', kind: 'mean', level: 0.85, wobble: 0.08, miss: 0.04, missBy: 2.5, best: 5, dp: 1,
    say: '{v}% off', rule: 'grows its own shape off by a set %, a round each, you first · closest wins the round · best of 5' },
  'reaction:flash': { win: 'best of 5', bar: 'reaction:flash:5', kind: 'mean', level: 0.85, wobble: 0.08, miss: 0.04, best: 5, dp: 0,
    say: '{v}ms', rule: 'taps a set time after the flash · the odd false start · best of 5' },
  'timing:stopwatch': { win: 'best of 5', bar: 'timing:stopwatch:5', kind: 'total', level: 0.85, wobble: 0.08, miss: 0.04, missBy: 2.5, best: 5, dp: 2,
    say: '{v}s off', rule: 'its own guess, off by a set time, a round each, you first · closest wins the round · best of 5' },
  'timing:hidden': { win: 'best of 5', bar: 'timing:hidden:10', kind: 'total', level: 0.85, wobble: 0.08, miss: 0.04, missBy: 2.5, best: 5, dp: 0,
    say: '{v}ms off', rule: 'its own guess, off by a set time, a round each, you first · closest wins the round · best of 5' },
  'spot:find': { win: 'first to 5', bar: 'spot:find:10', kind: 'total', level: 0.85, wobble: 0.08, miss: 0.04, missBy: 2.5, dp: 2,
    say: 'finds in {v}s', rule: 'finds its shape after a set time · first to 5 rounds' },
};
/* how long the computer's turn card stays up before it plays (a shared duel), and how long it "looks" before it acts on a Grow round */
export const VERSUS_BOT = { card: 1100, think: 450 };

/* ---------- v29 Section A (58.1, build 58): A GAUNTLET DEALS EVENLY ----------
   Aiden, of Estimate · Grow: "the gauntlet should be really standardised… a very tight range as to what the games can offer…
   so it's always relatively even across different gauntlet runs." A Gauntlet is ONE number against a bar, so a run that
   happens to deal a 16vmin target and a run that deals a 55vmin one are not the same test, and the score cannot tell them
   apart. Every step that deals a RANDOM QUANTITY draws it from a tight band here instead of from its game's own spread.

   A BAND, NOT A FIXED RUN. Cowork's reading, and the reason: a fixed deal can be memorised, which rewards remembering the
   run instead of playing it. The band is narrow enough that one run is about as hard as the next and wide enough that no
   two are the same. This is what Stopwatch's 5-6s window already did (item 18); 58.1 is that extended to every step.

   IT ONLY EVER FIRES INSIDE A GAUNTLET. An ordinary Set or Streak is untouched — every game's own spread, ramp, dealer
   and tier factor is exactly what it was. The engines read `ctx.gaunt.band`, which run/gauntlet.js fills from here.

   THE UNIT IS NAMED PER QUANTITY, because they are not all absolute:
     size    Grow's target, as a FRACTION of the range this shape may be dealt at (0 = the smallest it may be, 1 = TMAX).
             Fraction and not vmin, because the floor moves with the shape's fill — it is the same unit as the tier band
             it replaces (`DEALS['hold:grow'].tiers`, which spans 0-1 across easy/medium/hard).
     share   Cut's percentage to cut off, SNAPPED to the nearest 5 inside the band, because every share the game has ever
             dealt is a multiple of 5 and a 33% ask would read as a different game.
     wait    the milliseconds before the signal — Flash's blank screen, Go / No-go's wait period before each beat.
     target  seconds: Stopwatch's target, Hidden's time behind the wall.
     crowd   Find's field, as a MULTIPLIER on the round's own ramp. The ramp is a function of the round number, so it is
             already identical run to run; what varies is the dealer's tier factor (.85 / 1 / 1.15), and that is what the
             band replaces. The field still grows across a Mega run, which is the game.
   Quick Tap · Two and Dots · Blind deal no quantity at all — a tap target is a tap target — so neither has a row.
   Mini and Mega share every band but Stopwatch's, which keeps Aiden's own 5-6s on Mini and sits around its own mid on
   Mega, where the step is a full five-round Set scored against the five-round bar. */
export const GAUNTLET_BANDS = {
  'hold:grow': { size: [0.40, 0.60] },
  'hold:cut': { share: [25, 40] },
  'reaction:flash': { wait: [1600, 2400] },
  'reaction:nogo': { wait: [900, 1300] },
  'timing:stopwatch': { target: [5, 6] },
  'timing:hidden': { target: [1.05, 1.35] },
  'spot:find': { crowd: [0.95, 1.05] },
};
/* the one band that is not the same on both: Mega's Stopwatch step is a full five-round Set scored against the five-round
   bar, so it sits around that bar's own mid rather than on Mini's 5-6s. A Gauntlet id here overrides the table above for
   that step and nothing else — run/gauntlet.js is where the two are put together. */
export const GAUNTLET_BAND_OVERRIDE = { g2: { 'timing:stopwatch': { target: [6.4, 7.6] } } };
/* what each quantity IS, for the outcome's table and the catalogue's Gauntlet scoring section — so the unit is written
   once, beside the numbers, rather than in two documents that can drift apart. `[what it is, the unit, the note]`. */
export const BAND_WORDS = {
  size: ['Target size', '', 'as a fraction of the range this shape may be dealt at'],
  share: ['Share to cut off', '%', 'snapped to the nearest 5'],
  wait: ['Wait before the signal', 'ms', ''],
  target: ['Target', 's', ''],
  crowd: ['The field', '×', "a multiplier on the round's own ramp"],
};

/* `tier` is the switch. `perfect` is what a lower-is-better step scores when the player's total is 0 — a real result on
   Estimate and Find, and a division by nothing — stated rather than left as Infinity. `cap` caps ONE step's contribution
   so a freak result cannot carry a bad run; 0 is uncapped, which is what item 11 asks for, and Cowork's 150 is the open
   recommendation beside it. `keep` is how many Gauntlet runs the board holds. */
/* ---------- v30 (59.12, build 59): THE SCORING, AS ONE PACKAGE ----------
   Aiden, on a Gauntlet Mini result reading 310.8%: "I like how the games play, except I don't know how I got 310%. 100% is supposed
   to be relative to author times, and anything above that is over 100%. So however you're doing the calculations, it seems to be
   wrong." The arithmetic was right — the eight rows do average to 310.8 — and the DESIGN was wrong in four places.
   (a) IT WAS NOT SCORING AGAINST AUTHOR. `tier` was 'clear', the KEY 1 column and the easiest bar, because the Author cells are #426
       placeholders Aiden has never played. Every row was therefore "how far past the beginner bar", which is why a decent run read
       130–260 everywhere. It is 'author' NOW, placeholders and all: a provisional HARD bar gives saner numbers than a real EASY one,
       a Gauntlet advances nothing so a wrong bar harms nothing, and every stored run already records its own tier — so the board
       shows only runs at the current tier and today's 'clear' runs drop off it rather than sitting on top forever. Say "provisional
       bars" until Aiden has played real Author numbers in (#371).
   (c) NOTHING LIMITED ONE STEP. `cap` was 0 and lower-is-better uses bar / player, which has no ceiling — halve your error and the
       score doubles, approach zero and it explodes. Spot · Find's 1241% was one step adding 155 points to the headline; without it
       that run averages 177.9. Each step is capped at 150 now, and `perfect` — what a lower-is-better step scores on a total of zero,
       a real result and a division by nothing — comes down to the same 150 so the cap cannot be beaten by a perfect round. Over 100
       still means past the Author, which is what he wants; 150 against an Author bar is already half the Author's error.
   (b) and (d) are not here: (b) is the mid-set ramp, which lives on the step in run/gauntlet.js and is read through
   games/_shared/deal.js, and (d) is the working on the result rows, which is ui/screens/gauntlet.js. */
export const GAUNTLET_SCORE = { tier: 'author', perfect: 150, cap: 150, keep: 50 };

/* how long the run holds between one game and the next. There is no card naming what is coming — nine games back to back
   would read better with one, and it is the first thing to add here, but it is DOM and timing rather than the run itself. */
export const GAUNTLET_STEP = { gap: 420 };
