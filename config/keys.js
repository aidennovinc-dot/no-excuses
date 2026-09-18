/* No Excuses — the three keys (v15 §5.3, build 26; themed at build 30, v17 §B.31; re-themed and un-shelled at build 32,
   v18 §B.22 / §B.27). DATA ONLY (A2).

   A.1 settles what the three are and there is no fourth dimension: key 1 is the normal clearance bars, key 2 a pro tier,
   key 3 the author's own times. They are difficulty tiers over the SAME combinations, not three separate collections —
   so nothing here touches config/key-bars.js, which stays the one place a bar lives. B.27: that file now carries all
   three tiers per row (`bar`, `pro`, `author`), and A SHELL IS DERIVED FROM IT — a tier whose column has any empty row is
   a shell, progress/key.js says so, and no flag lives here any more. The day a column is full the tier simply starts counting.
   A.2 AMENDED AT BUILD 38 (#426, Aiden asked for it directly): A.2 said Aiden sets every bar by hand, so no build may derive
   one. A build MAY now generate a PLACEHOLDER, marked as one and replaceable a row at a time — both columns have been full of
   them since build 38 (site/scripts/placeholders.mjs) — and still may NEVER set a real bar or silently correct one. A
   placeholder Aiden replaces is manual data from then on. The rule and how to replace one are in config/key-bars.js's header.

   B.22 — ONE THEME PER TIER: LANTERN → CIRCUIT → THORN, from the proposal page Aiden reviewed 2026-09-10 ("the design for
   the keys looked fucking amazing"), extracted by Cowork into ../_review/2026-09-10_key-themes-art.js. Visual only: the
   TRACKS were unchanged — key:roots, key:frost, key:thorn in config/audio.js — so the loops still played what build 30 built (until
   build 42's rewrite, below).
   A theme is: `style`, which ui/screens/key.js draws (a lantern's straight glowing spokes and rings, a circuit's
   right-angled traces with corner dots and square nodes, a thorn's curved branches with spikes); `tint`, the light a
   cleared root wears; `dim`, the unlit line; `ground`, behind the ring. Circuit is recoloured — Aiden's one instruction was
   "not gold" — and wears Frost's white-blue as the trace (guess), so the page's copper is nowhere in the app.

   NEITHER CIRCUIT NOR THORN IS SEEN BEFORE ITS CHEST (§A.1, as narrowed by v21 G.1 / G.2: the keys are on the strip, their
   numbers are not). Since build 40 (v23 §L.10) each tier opens with the chest config/chests.js says reveals it — key 1 with the
   Games chest, Pro with the Skill chest, Author with the Pro chest — through tierOpen() (#411: the chest, OR Testing's OPEN
   EVERYTHING, OR Supporter — both dev-only, stripped from release by BUILD_FLAGS.dev).

   KEY_ART is the glyph per tier, and it gets progressively more elaborate as the difficulty rises (5.3): a plain bow
   with roots, a ringed bow with frost spurs, then the Author's rosette with wards and thorns. Same 48x48 box, so the
   three sit in a row and the selected one scales up without redrawing. */

/* v23 (§L.7a / §L.7b, build 42): `track` is the rewritten theme (theme:key / theme:pro / theme:thorns in config/audio.js; the build-30
   key:roots / key:frost / key:thorn are retired). `music` is the CHEST that opens the theme — the chest this key opens when it is whole
   (L.12), so a key's theme is its own reward — and the value prefs.everywhere takes when SET THIS MUSIC is tapped on this key's screen.
   Before that chest opens, the button is not there and the theme does not play on the screen (guess, L.7b). */
export const KEYS = [
  { id: 'clear', name: 'Skill key', theme: 'Lantern', style: 'lantern', track: 'theme:key', music: 'key', tint: '#FFD08A', dim: '#57442C', ground: 'rgba(255,208,138,.12)',
    lede: 'Every clearance bar, once each. Beat one in a solo run and that combination is cleared for good.' },
  { id: 'pro', name: 'Pro', theme: 'Circuit', style: 'circuit', track: 'theme:pro', music: 'pro', tint: '#BFE6FF', dim: '#35506A', ground: 'rgba(191,230,255,.08)',
    lede: 'A harder bar on every combination, for a second pass at a game you already know.' },
  /* v24 (C.4, build 43): Thorn's ground was rgba(0,0,0,.55) under a solid black #key-main, so the live background never showed. Keys 1 and 2
     let it through and keep their own elements; Thorn does now too — a faint white wash, the spikes and white accents drawn over it */
  { id: 'author', name: 'Author', theme: 'Thorn', style: 'thorn', track: 'theme:thorns', music: 'thorns', tint: '#FFFFFF', dim: '#4D4D4D', ground: 'rgba(255,255,255,.04)',
    lede: "The author's own times. The last thing left to beat." },
];

/* ---------- v27 (item 14, build 51): EARNING A KEY — ONE ANIMATION PER TIER, TWO SECONDS AT MOST ----------
   THIS REPLACES BOTH build 43's KEY_EARN (the moment over the ring: 2.9 / 3.8 / 4.8s) AND build 46's KEY_REVEAL (the first-open reveal that
   wrapped it: 4 / 5 / 6.6s). Nested, they ran 6.3s, 8.0s and 10.5s, none of it skippable — which is what Aiden played on build 50 and described
   as "a weak movement, then ~5s of pulsing with the player unable to move on". What he asked for on 2026-09-15 was only that the chest must not
   open midway through the key's animation; the fix for that is the chest PROMPT WAITING, not a longer animation.

   Item 14's four rules, and where each one lives:
     · the whole thing is 2.0s at most            — `ms`, and the gate fails a tier over 2000
     · movement is at least three quarters of it  — every step but `flash` is movement; the gate measures the span and fails under .75
     · the closing glow is a FLASH, not a hold    — `flash` is the last step, 240–280ms, and the screen is free the moment `ms` is up
     · a tap skips to the end, the screen never locks — ui/screens/key.js `skipEarn()`, on the same capture the title sequence uses
   And the chest prompt waits for it to finish, which is the original complaint's actual fix.

   EACH KEY IS ITS OWN ANIMATION, escalating. Item 14 was Claude's proposal; AIDEN PLAYED BUILD 51 AND ANSWERED ON 2026-09-18, and build 52
   rebuilds two of the three to what he said:
     clear   APPROVED AS BUILT, unchanged ("the skill key is good"): the seven spokes fire INWARD one after another; the key spins once and
             clicks upright as the last lands
     pro     REBUILT. "The pro key should be one by one around like a clock, but have a circuitry type animation between each one." So the
             seven no longer fire together — they go round the ring one at a time like the Skill key, and BETWEEN each spoke and the next a
             CURRENT RUNS THE ARC OF THE RING from the one that just fired to the one about to, which is the Pro chest's own idle and the
             Circuit key's own language. `spokes.trace` is how long one current takes; it is timed to ARRIVE as the next spoke fires, so the
             sequence reads spoke → current → spoke and never as two things at once. The quarter-turn snap and the ring flash are KEPT — he
             did not rule on them and they do not fight the sequence; they are now what the completed circuit turns.
     author  KEPT IN STYLE, SEQUENCED. "The author key should also go one by one, but I like the animation style." The drop, the slam, the
             crack and the thorns all stay; what changes is that the ten cracks and the twelve thorns were a 26–28ms stagger, which at that
             speed is a burst and not a sequence. `crackGap` and `thornGap` are their own beats now (48ms and 46ms), the thorns wait until the
             cracks are done rather than overlapping them, and each arrives on its own. (Cowork's reading of "one by one" for this key, not a
             quote — flagged on the build 52 board.)
   LENGTH. One-by-one pushes Pro and Author past item 14's 2.0s: they are 2.16s and 2.30s. Aiden's answer did not mention length, and Cowork's
   note with it says to keep tap-to-skip and FLAG the length rather than cut the sequence if either runs past ~2.5s. So the gate's ceiling moves
   from 2000ms to 2500ms for build 52 and the length goes on the board as a question. The movement rule is unchanged and both are well over it
   (88% and 87%). Skill stays 1.70s.

   The shape is the CEREMONY shape (config/chests.js) on purpose: `ms` and a list of NAMED steps, each with its own `at` and `ms`. ui/screens/key.js
   knows how to draw a step by its name and nothing else, and every time is a custom property the stylesheet reads — so a re-tune is a number edit
   here. `spokes.gap` is the beat between spokes and `spokes.each` one spoke's own flight; `spokes.trace` (build 52) is how long the current takes
   to run the ring between two of them. `cracks` / `crackGap` and `thorns` / `thornGap` are how many of each are drawn and the beat between them —
   build 51 held those beats in the stylesheet, which is exactly the second list of times this table exists to prevent — and `shake` is how far the
   screen moves; together they are the escalation that is drawn rather than timed.
   The sound is KEY_EARN_FX in config/audio.js, fired on the FLASH so it lands on the last beat (item 14); each step has its own sound as well —
   KEY_STEP_FX, except a spoke that fires alone, which lands with its own game's sound the way the map's tiles do. All (guess), and heard by nobody
   (UNVERIFIED.md). */
export const KEY_EARN = {
  clear: { ms: 1700, spokes: { gap: 130, each: 300 }, cracks: 0, crackGap: 0, thorns: 0, thornGap: 0, shake: 0,
    steps: [{ name: 'spokes', at: 0, ms: 1080 }, { name: 'spin', at: 820, ms: 510 }, { name: 'flash', at: 1330, ms: 240 }] },
  pro: { ms: 2160, spokes: { gap: 120, each: 280, trace: 85 }, cracks: 0, crackGap: 0, thorns: 0, thornGap: 0, shake: 0,
    steps: [{ name: 'spokes', at: 0, ms: 1000 }, { name: 'trace', at: 40, ms: 685 }, { name: 'snap', at: 980, ms: 480 }, { name: 'ring', at: 1420, ms: 480 }, { name: 'flash', at: 1900, ms: 260 }] },
  author: { ms: 2300, spokes: null, cracks: 10, crackGap: 48, thorns: 12, thornGap: 46, shake: 5,
    steps: [{ name: 'drop', at: 0, ms: 430 }, { name: 'slam', at: 410, ms: 250 }, { name: 'crack', at: 620, ms: 712 }, { name: 'thorns', at: 1290, ms: 706 }, { name: 'flash', at: 1996, ms: 280 }] },
};
// the one step that is not movement — the closing flash. The gate measures every tier's movement against it, so there is no second list of names
export const EARN_GLOW = 'flash';

/* ---------- v24 (C.6, build 43): THE THREE KEY-SCREEN BACKGROUNDS, drawn in code ----------
   One per key, drawn by ui/atmosphere.js OVER the live background (C.4) while that key's screen is up, and a Customise background once that
   key is finished (config/theme.js ITEMS.bg, `key`). No image assets. Each moves gently and keeps its key's tempo — the drawer reads the bpm
   of the key's own theme (`track` above), so the motion and the music cannot drift apart.
     lantern  slow-drifting light, soft and warm, low contrast — `blobs` warm glows swaying over `drift` bars, `motes` rising sparks
     circuit  sharper, cooler, geometric, moving with intent — `traces` right-angled lines on a `cell` grid, a pulse `pulse` cells a beat
     thorn    black at the edges with white spiked branches, high contrast, slow and menacing — `branches` creep in and back over `breathe` bars
   `alpha` is the strongest any element gets, so each stays under the screen's own content. All (guess). */
export const KEY_LAYER = {
  lantern: { blobs: 6, motes: 16, alpha: .085, drift: 4, col: '255,208,138' },
  circuit: { cell: 44, traces: 9, pulse: 1, alpha: .1, head: .45, col: '191,230,255' },
  thorn: { branches: 8, thorns: 7, edge: .6, breathe: 4, alpha: .5, col: '255,255,255' },
};

// stroke paths, drawn in a 48x48 box. The bow first, then the shaft, then the teeth, then the theme's own flourish
export const KEY_ART = {
  clear: ['M24 10a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M24 24v14', 'M24 30h5', 'M24 34h4', 'M24 38c-3 2-5 3-6 6', 'M24 38c3 2 5 3 6 6'],
  pro: ['M24 8a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M24 13a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M24 26v14', 'M24 30h6', 'M24 34h5', 'M24 38h4', 'M15 12l-4-3', 'M33 12l4-3', 'M24 44l-3 3', 'M24 44l3 3'],
  author: ['M24 5l2.7 4.4 5 1-3.5 3.7.6 5-4.8-2.2-4.8 2.2.6-5-3.5-3.7 5-1z', 'M24 21a5 5 0 1 0 0 10 5 5 0 1 0 0-10', 'M24 31v11', 'M24 33h7', 'M24 36h6', 'M24 39h5', 'M17 26h-4', 'M35 26h-4', 'M24 42l-4 5', 'M24 42l4 5', 'M13 26l-3-4', 'M35 26l3-4'],
};

/* ---------- v25 (item 11, build 46): THE FIRST-OPEN REVEAL OF A KEY — RETIRED AT BUILD 51 ----------
   KEY_REVEAL was the four-to-seven-second reveal that introduced the seven games one at a time round the ring and then lit the key with build 43's
   earn moment inside it. v27 item 14 replaces the pair with ONE animation of two seconds at most (KEY_EARN above), so there is nothing left for a
   second table to time: the seven spokes are the `spokes` step, and the key lighting is `spin` / `snap` / `slam`. The row is gone rather than left
   unread — a config table nothing reads is the kind of thing that gets re-wired by accident. `prefs.revealed` is unchanged and still means "this
   key's earn has played", so no profile replays one it has already seen. */

/* ---------- v25 (item 13, build 46): WHAT AN UNFINISHED KEY LOOKS LIKE, AND WHAT A FINISHED ONE LOOKS LIKE ----------
   Both states were the same golden glow, so a key that was 3% done looked like a key that was earned. They are pushed apart from both
   ends. UNFINISHED: no glow at all — no radial ground, no drop shadow, the centre key drawn in the tier's own `dim`, the spokes faint,
   and the outer ring not drawn. A game's spoke lights segment by segment as its bars clear (9.6, unchanged) and its NODE lights only
   when that game is home, so the key fills in piece by piece. FINISHED: the key scales to `scale`, takes the tier's full tint and glow,
   breathes on a `pulse` cycle slow enough not to pull the eye off the rest of the screen, and the outer ring is drawn. The key's card at
   the top of the screen takes the same pulse. Each tier is a step grander — `glow` and `ringW` rise Lantern → Circuit → Thorn (gated).
   The reveal above ENDS in this state, which is the whole of item 13's last line. All (guess). */
export const KEY_FINISH = {
  clear: { scale: 1.18, pulse: 3000, glow: 10, ringW: 1.2, ringOp: .5 },
  pro: { scale: 1.2, pulse: 3000, glow: 13, ringW: 1.6, ringOp: .6 },
  author: { scale: 1.22, pulse: 3000, glow: 16, ringW: 2, ringOp: .7 },
};
