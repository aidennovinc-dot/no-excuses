/* No Excuses — every shape, how hard it is, and how each game deals them (build 50, FEEDBACK-v26 §B2). DATA ONLY (A2).
   THE STANDARD is written up in ARCHITECTURE.md → "Shape difficulty — the standard". In one breath:
   · every shape any game deals is in SHAPES, ONCE, with one tier — easy, medium or hard — whatever game deals it;
   · every shape-dealing game has a row in DEALS: its round BANDS, each with the MIX of tiers it deals (a deck, shuffled per run,
     so every run gets exactly that mix and only the order and the particular shapes change) and a LOAD;
   · a round's difficulty is its shape's tier plus its SETTING's tier (TIER weights), and the setting is dealt at LOAD minus the
     shape, kept inside easy..hard — so a harder shape takes an easier cut %, count, crowd, size or time on screen, and the reverse.
   The geometry is games/_shared/shapes.js under the same ids; games/_shared/deal.js is the one dealer. */

/* `word` is what a rule bar says, `many` its plural where adding an s is wrong. `sym` marks a shape with an axis of symmetry:
   Estimate never turns one (v14 6.13) and Cut never asks one for 50% (v13 6.4) — the old ESTIMATE.SYM list, now on the shape.
   Tiers, by what the eye has to do to read the shape's extent:
   easy — convex, one outline, nothing to find;  medium — one thing to read: an elongation, a hole, points, a notch, a curve that
   is not round;  hard — irregular, dealt differently every time, or an outline that folds back on itself. */
export const SHAPES = {
  circle:   { word:'circle',   tier:'easy',   sym:1 },
  square:   { word:'square',   tier:'easy',   sym:1 },
  triangle: { word:'triangle', tier:'easy',   sym:1 },
  // v26 §B2 (#444): pointier top and bottom, more obtuse at the sides — a tall rhombus, so it can never be read as a square
  diamond:  { word:'diamond',  tier:'medium', sym:1 },
  bar:      { word:'bar',      tier:'medium', sym:1 },
  plus:     { word:'plus',     tier:'medium', sym:1, many:'pluses' },
  ring:     { word:'ring',     tier:'medium', sym:1 },
  star:     { word:'star',     tier:'medium', sym:1 },
  crescent: { word:'crescent', tier:'medium' },
  // v26 §B2: Grow's "two more fun shapes" — Claude's choice, for Aiden to judge on the board
  heart:    { word:'heart',    tier:'medium', sym:1 },
  cat:      { word:'cat',      tier:'medium', sym:1 },
  spiral:   { word:'spiral',   tier:'hard' },
  blob:     { word:'blob',     tier:'hard' },
  tetris:   { word:'tetris',   tier:'hard' },
  stairs:   { word:'stairs',   tier:'hard' },
};

/* v31 (60.16, build 60): WHAT EACH SHAPE IS EASILY MISTAKEN FOR, at a glance and at speed. Aiden asked for "look-alike decoys
   later" in Spot · Count: from `LOOK_FROM` a share of a round's decoys is drawn from the TARGET'S own look-alikes rather than
   uniformly from the pool, so a late round is hard because the crowd resembles what you are counting, not because there is more
   of it. The pairs are by silhouette at a crowd's size, which is the only thing the eye has: a bar reads as a thin diamond, a
   ring as a circle with the hole lost behind a neighbour, a plus as a star with blunt points, a crescent as a ring half hidden.
   Symmetric both ways on purpose — if A is mistakable for B then B is for A — and a shape not in a round's pool is simply
   skipped, so this never widens a band's deck (A9). `LOOK_SHARE` is how much of the crowd they take.
   Every entry reaches the pools the games actually deal from, so the rule fires on EVERY target rather than only on the ones
   whose neighbours happen to be in the round's deck — at a crowd's size a circle and a square are both a compact blob, which is
   the pair that covers Spot · Count's six shapes.
   Cowork's pairs and Cowork's numbers; listed in the build 60 outcome for Aiden to overrule. */
export const LOOKALIKE = {
  circle:   ['ring','heart','blob','square'],
  square:   ['diamond','tetris','stairs','circle','plus'],
  triangle: ['diamond','star','heart'],
  diamond:  ['square','triangle','bar'],
  bar:      ['diamond','plus','stairs','crescent'],
  plus:     ['star','square','tetris'],
  ring:     ['circle','crescent','spiral'],
  star:     ['plus','triangle','blob','cat'],
  crescent: ['ring','circle','spiral','bar'],
  heart:    ['circle','cat','blob','triangle'],
  cat:      ['heart','blob','star'],
  spiral:   ['ring','crescent','blob'],
  blob:     ['circle','heart','cat','star'],
  tetris:   ['stairs','square','plus'],
  stairs:   ['tetris','square','bar'],
};
export const LOOK_FROM = 6, LOOK_SHARE = 0.55;
// what a tier weighs when a round adds its shape to its setting
export const TIER = { easy:1, medium:2, hard:3 };

/* One row per shape-dealing game, keyed 'game:mode' like SET_COPY. `pool` is every shape the game may deal; a band's own
   `add` puts more in from that band on (Count and Find grow as the run goes). `bands` run in order: `to` is the band's last
   round, and a Streak past the last band keeps dealing the last band. `set` names the setting and `tiers` says what each of
   its tiers deals — all (guess) at build 50, and every figure is on the catalogue's Round formats cards.

   Estimate · Grow — the setting is the TARGET'S SIZE, as the share of the size range that shape can be dealt at: a big target
   forgives a slip in letting go that a small one does not (build 24). Removed at v26 §B2: line and rects, too like tetris and
   stairs. Added: spiral, heart, cat. */
/* Estimate · Cut — the setting is the SHARE ASKED. About a half is easy, a third to a quarter medium, a sliver hard — the
   direction the build-14 ramp already walked. v26 §B2: 50% is back, and only ever asked of a shape with no axis of symmetry. */
/* Reaction · Go / No-go — the setting is TIME ON SCREEN, a third of NOGO_DWELL's ± spread: easy the long third, hard the short
   one. The average over a round stays at the base, so the scoring is unmoved. v26 §B2 (#444): hexagon and the square turned
   45° are gone; spiral, crescent, plus, bar and ring are in. The no-go shapes are the rest of the pool. */
/* Spot · Count — the setting is the TARGET COUNT, a third of the round's band (SPOT_RAMP): low third easy. A dip round keeps
   its own rule and deals the floor. v26 §B2: bar, plus and star arrive from round 3. The decoys are the rest of the pool. */
/* Spot · Find — the setting is the CROWD, SPOT_FIND's shape count for that round × the tier's factor. v26 §B2: more shapes as
   the game goes — two more every two rounds. The crowd is the rest of the pool. Find versus keeps its own three shapes. */
export const DEALS = {
  'hold:grow': { set:'size', tiers:{ easy:[0.67,1], medium:[0.33,0.67], hard:[0,0.33] },
    pool:['circle','square','triangle','bar','plus','ring','star','crescent','heart','cat','spiral','blob','tetris','stairs'],
    bands:[ { to:2, mix:{ easy:1, medium:1 }, load:3 },
            { to:4, mix:{ medium:1, hard:1 }, load:4 },
            { to:7, mix:{ easy:1, medium:1, hard:1 }, load:4 } ] },
  'hold:cut': { set:'share', tiers:{ easy:[50,45,40], medium:[35,30,25], hard:[20,15,10] },
    pool:['circle','square','triangle','bar','plus','ring','star','crescent','heart','cat','spiral','blob','tetris','stairs'],
    bands:[ { to:2, mix:{ easy:1, hard:1 }, load:3 },
            { to:4, mix:{ easy:1, medium:1 }, load:4 },
            { to:6, mix:{ medium:1, hard:1 }, load:4 },
            { to:8, mix:{ easy:1, hard:1 }, load:5 },
            { to:10, mix:{ medium:1, hard:1 }, load:5 } ] },
  'reaction:nogo': { set:'dwell', tiers:{ easy:[0.33,1], medium:[-0.33,0.33], hard:[-1,-0.33] },
    pool:['circle','square','triangle','diamond','bar','plus','ring','crescent','spiral'],
    bands:[ { to:2, mix:{ easy:1, medium:1 }, load:3 },
            { to:5, mix:{ easy:1, medium:1, hard:1 }, load:4 } ] },
  'spot:count': { set:'count', tiers:{ easy:[0,0.33], medium:[0.33,0.67], hard:[0.67,1] },
    pool:['circle','square','triangle'],
    bands:[ { to:2, mix:{ easy:2 }, load:3 },
            { to:4, add:['bar','plus','star'], mix:{ easy:1, medium:1 }, load:3 },
            { to:10, mix:{ easy:3, medium:3 }, load:4 } ] },
  'spot:find': { set:'crowd', tiers:{ easy:0.85, medium:1, hard:1.15 },
    pool:['circle','square','triangle'],
    bands:[ { to:2, mix:{ easy:2 }, load:3 },
            { to:4, add:['bar','plus'], mix:{ easy:1, medium:1 }, load:3 },
            { to:6, add:['star','ring'], mix:{ easy:1, medium:1 }, load:4 },
            { to:8, add:['crescent','diamond'], mix:{ easy:1, medium:1 }, load:4 },
            { to:10, add:['spiral'], mix:{ medium:1, hard:1 }, load:4 } ] },
};

/* How each Go / No-go shape may be turned on its beat, degrees (v25 item 21 named the list; v26 §B2 moves it here beside the
   shapes). The square is never turned any more — at 45° it WAS the diamond (#444). A shape with no row is never turned. */
export const NOGO_TURNS = { triangle:[0,180,90,270], bar:[0,90], crescent:[0,90,180,270], spiral:[0,90,180,270] };
