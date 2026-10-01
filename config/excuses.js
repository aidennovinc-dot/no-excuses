/* No Excuses — EXCUSES (build 68, 67.38). DATA ONLY (A2).
   A running tally of deliberate failures — Cowork's names; Aiden asked for ten "made up" and wants personality and "recurring secrets". Nothing is
   secret: every row shows its name and a hint that alludes. The predicate for each row is progress/rules.js EXCUSE_TEST under the same id, reading
   this row's numbers; #10 is not a run at all but the map's hidden exit (ui/excuse.js). Repeats count. No effect on % complete or the keys.
   Never in the walkthrough or a profile's first EXCUSE_GRACE ms, and the thresholds are absurd on purpose, so a struggling beginner is never mocked.
   They are not the five deliberate-failure unlocks (L6): the triggers differ, and where one run does both, the unlock keeps the toast and the excuse
   is a quiet tick. Aiden renames them on the review board. */
export const EXCUSES = [
  { id: 1, name: 'The phone was upside down', hint: 'Tap everything except the thing.', how: 'Quick Tap run, 0 hits and 10+ misses', misses: 10 },
  { id: 2, name: 'Sun in my eyes', hint: 'The dots are a suggestion.', how: 'Dots run, 0 hits and 15+ misses', misses: 15 },
  { id: 3, name: 'I was measuring something else', hint: 'Think smaller. Much smaller.', how: 'Estimate Grow round under 5% or over 300% of target', under: 5, over: 300 },
  { id: 4, name: 'The knife slipped', hint: 'Just trim the crust.', how: 'Cut taking off under 1% of the shape', share: 1 },
  { id: 5, name: 'I blinked', hint: 'Anticipation is everything.', how: '3 false starts in a row, Reaction Flash', row: 3 },
  { id: 6, name: 'Thought it said go', hint: 'Rules are for other people.', how: 'Tapping every no-go shape in a Go / No-go run', minNo: 5 },
  { id: 7, name: 'My watch is slow', hint: 'Time is a construct.', how: 'Stopwatch stopped 3s+ off target', off: 3 },
  { id: 8, name: "I'm more of a drummer", hint: 'Pick a favourite note.', how: 'Same key for every note of a Sequence round (2+ notes)', notes: 2 },
  { id: 9, name: "Can't count, won't count", hint: 'None. Definitely none.', how: 'Answer 0 in Spot Count with 10+ circles', circles: 10 },
  { id: 10, name: 'Looking for the exit', hint: 'Up is also a direction.', how: 'Overscroll past the top of the game select map; tap the tiny button that shows', pull: 70, showMs: 3500 },
];
// a profile's first ten minutes, from its first run on record
export const EXCUSE_GRACE = 600000;
/* build 68 (67.39): TINY AIDEN, the Excuses reward. At `at` excuses (repeats count) a small cut-out of Aiden dances, popping up in `spots` places over
   `ms`; after that Customise's "Tiny Aiden" switch lets him turn up on the menus now and then (`menuChance`, after `menuDelay` ms). `sheet` is a
   horizontal sprite sheet of `frames` frames, each `w` × `h`, played at `fps` — a placeholder stick figure until Cowork cuts the real one out of
   Aiden's clip, which drops in at the same path with no code change */
export const TINY_AIDEN = { at: 10, sheet: 'assets/tiny-aiden.png', frames: 10, fps: 10, w: 64, h: 96, ms: 4000, spots: 3, menuChance: .25, menuDelay: [2500, 9000] };
