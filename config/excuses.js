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

/* build 69 (68.44): THE EXCUSE REWARDS, MOCKED. Aiden: "Mock up some funny things so like 3D sprites that pop up everywhere as part of the excuses
   unlock ... just to see how it would look." Testing only: each row is a reward switched on and off on the Testing screen ("Excuse rewards (mock)",
   prefs.rewardMock, which the store refuses outside BUILD_FLAGS.dev), drawn by ui/rewards.js. Never in a run; never over a button or any text — the
   figure's rect is tested against every button and text rect on screen first and a figure that would touch one is not shown. `unlock` is which
   excuse will earn it: null, because the real trigger is not built yet.

   A row: `id`, its `name` on the switch, `fig` (a REWARD_FIG kind), `where` it shows, and the numbers it is drawn with — `n` figures, `h` their
   height in CSS px, `gap` the space kept from what it stands beside, `peek` the share of a peeker that shows past its button's edge, `ms` how long
   a one-off stays up. The scorecard's `score` is the number on the card per verdict tier: presentation only (L10), nothing is stored. */
export const REWARDS = [
  { id: 'dancers-menu', name: 'Menu peekers', fig: 'dancer', where: 'main menu: peeking out from behind three of its buttons', n: 3, h: 44, peek: .62, unlock: null },
  { id: 'dancers-title', name: 'Title row', fig: 'dancer', where: 'main menu: a row standing along the top of NO EXCUSES', n: 5, h: 34, gap: 4, unlock: null },
  { id: 'dancers-map', name: 'Map row', fig: 'dancer', where: 'game select map: across the bottom, below the last row, above the home bar', n: 6, h: 46, gap: 6, unlock: null },
  { id: 'dancers-chest', name: 'Chest dancers', fig: 'dancer', where: 'game select map: out of a chest as it spills, once its words are out', n: 3, h: 40, gap: 1, ms: 5000, unlock: null },
  { id: 'clapper', name: 'Slow clapper', fig: 'clapper', where: 'result screen: beside the number on a bad result (the lowest tier, solo)', h: 62, gap: 8, unlock: null },
  { id: 'scorecard', name: 'Judge’s scorecard', fig: 'scorecard', where: 'result screen: held up beside the number on a solo result', h: 66, gap: 8, score: { ace: 10, good: 8, ok: 6, bad: 2 }, unlock: null },
  { id: 'sweeper', name: 'Sweeper', fig: 'sweeper', where: 'any screen confetti falls on: across the bottom once it settles, sweeping it away', h: 54, ms: 3600, bits: 16, unlock: null },
];
/* The figures: one horizontal sprite sheet per kind, `frames` frames of `w` x `h` CSS px (drawn at 2x), stepped by CSS at `fps` like Tiny Aiden.
   Stand-ins drawn by scripts/reward-sprites.mjs from `paint` — a shaded capsule figure with a lit side and a drop shadow — until Aiden's dance clip
   is cut into a sheet at the same path. `hues` tints each dancer in a row differently (a CSS hue turn, in degrees). The scorecard is an SVG card. */
export const REWARD_FIG = {
  dancer: { sheet: 'assets/rewards/dancer.png', frames: 10, w: 40, h: 60, fps: 10, hues: [0, 70, 150, 215, 290, 40],
    paint: { light: '#FFB8DB', base: '#FF4FA3', dark: '#7A1048', limb: '#E0408E', limbLit: '#FFC7E3', headLight: '#FFE9D2', head: '#F0B088', headDark: '#86502C' } },
  clapper: { sheet: 'assets/rewards/clapper.png', frames: 8, w: 40, h: 60, fps: 4, hues: [0],
    paint: { light: '#DDE2EA', base: '#8C96A8', dark: '#353C4A', limb: '#6E7787', limbLit: '#CBD2DE', headLight: '#FFE9D2', head: '#F0B088', headDark: '#86502C' } },
  sweeper: { sheet: 'assets/rewards/sweeper.png', frames: 12, w: 48, h: 60, fps: 12, hues: [0],
    paint: { light: '#A6D7FF', base: '#2F86D6', dark: '#103A63', limb: '#2A73B8', limbLit: '#AEDAFF', headLight: '#FFE9D2', head: '#F0B088', headDark: '#86502C' } },
  scorecard: { sheet: null, w: 44, h: 66 },
};
// how long after a screen opens its rewards are placed (its own entrance animations have landed by then), and how often a peeker ducks out and back
export const REWARD_SETTLE = 900;
export const REWARD_PEEK_MS = 3200;
/* how often a screen's standing rewards are checked against its layout while it is up: placed again if the layout moved, tried again if one could not
   be placed clear of every button and text (a toast was passing over it) */
export const REWARD_WATCH = 1500;
