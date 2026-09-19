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
  { id: 'author', name: 'Author', theme: 'Thorns', style: 'thorn', track: 'theme:thorns', music: 'thorns', tint: '#FFFFFF', dim: '#4D4D4D', ground: 'rgba(255,255,255,.04)',
    lede: "The author's own times. The last thing left to beat." },
];

/* ---------- v28 (item 15, build 53): THE EARN MUSIC IS THE CLOCK, AND THE ANIMATION FILLS IT ----------
   THIS AMENDS ITEM 14's "2.5 SECONDS AT MOST", and item 15 is Aiden's own answer to the question build 52 put on the board: the Pro and Author
   animations are NOT too long — "they are too short for their music". What he played was a key that finished and then ~70% of the wait staring
   at it while the music ran on, and the cause was arithmetic: Snd.keyEarn fired on the FLASH, so the music STARTED near the end of the animation
   and rang on for seconds after it. Author was 2.30s of motion against 7.20s of music beginning at 2.00s — a 9.20s moment, 25% of it moving.
   So, as item 15 asks: the music starts the clock (ui/screens/key.js fires Snd.keyEarn on the FIRST step, not the flash), `ms` IS the music's own
   length, and two named steps carry the finale — `rise`, the whole key settling up into its finished state with its glow growing, continuous for
   the whole of the music's back half, and `land`, a last hit on the final note. The assembly is untouched: the Skill key's seven spokes and spin,
   the Pro key's one-by-one spokes with the current running the ring between them, the Author key's drop, slam, cracks and thorns, all exactly as
   Aiden approved them on 2026-09-18. Nothing was trimmed from the MOTION; what was trimmed is the track's TAIL, which is the order item 15 sets.
   LENGTHS, animation = music, against build 52's:
     Skill   1.70s of motion inside a 4.13s moment  →  2.39s, and the moment IS 2.39s  (music 2.80s → 2.39s)
     Pro     2.16s inside 6.35s                     →  4.10s                           (music 4.45s → 4.10s)
     Author  2.30s inside 9.20s                     →  6.70s                           (music 7.20s → 6.70s)
   Skill was not named in item 15; it had the same gap, so it is built the same way and said so in the outcome.
   THE GATE now asks three things instead of a ceiling: `ms` matches that tier's KEY_EARN_FX length within 150ms (the music IS the clock); every
   step but `flash` is movement and the movement span is at least .75 of `ms` (unchanged); and the ASSEMBLY — everything before `rise` — is at
   least a quarter of `ms`, so a finale can never swamp the thing it is a finale to. A TAP STILL SKIPS TO THE END and the screen never locks,
   which is what makes a six-second moment acceptable at all. `finale` is how grand the settle is per tier: `scale` how far the key grows,
   `glow` its halo in px, `halo` how far the ring of light spreads. All (guess).

   v29 (item 3, build 54): AIDEN PLAYED BUILD 53 AND SHORTENED TWO OF THE THREE. Item 15's mechanism is kept exactly — the music still starts
   the clock, `ms` is still the music's own length, and the trim is still at the TRACK'S TAIL and never at the motion — but the Pro and Author
   stings are cut to 3.00s and 4.00s (Skill's 2.39s was already what he asked for and is untouched). The assemblies do not move: Pro still
   assembles for 1900ms and Author for 1996ms, so what shortened is the FINALE — `rise` from 1900ms to 800ms on Pro and from 4300ms to 1600ms
   on Author. Both still clear the assembly floor comfortably (63% and 50% of the whole, against the quarter the gate asks for).
     Skill   2.39s → 2.39s, unchanged      Pro  4.10s → 3.00s (rise 1900 → 800)      Author  6.70s → 4.00s (rise 4300 → 1600)
   AND THE SKIP NOW WAITS 1.5 SECONDS. Build 51's tap-to-skip took a tap at any point, including one landing in the first frames of a moment
   the player has just earned; on all three keys a tap now does nothing for the first EARN_SKIP_AT ms and then jumps straight to the finished
   state (ui/screens/key.js). The screen still never locks — the wait is on the SKIP, not on the player. */
// item 3 (build 54): how long a key-earn ceremony ignores a tap before a tap skips it. One number, all three tiers
export const EARN_SKIP_AT = 1500;

/* ---------- v29 Section A (57.6, build 57): THE KEY BEING CREATED — the first time its screen is opened ----------
   Aiden: "the first time a key's screen is opened, play an introduction of that key being created — really cool, with sound effects to match.
   Only completion has an animation today." So each tier gets ONE introduction, once per key per profile (`prefs.keyIntro`, a ladder step at store
   v7 so nobody who has already opened a key gets one handed to them late), skippable exactly the way the earn moment is (EARN_SKIP_AT above).
   It is the KEY_EARN shape — `ms` and NAMED STEPS — so ui/screens/key.js draws a step by its name and nothing else, and every time goes on the
   screen as a custom property. FOUR STEPS, the same four for all three, each drawn in that key's own style (`style` on the KEYS row above), which
   is what makes one set of rules three different animations:
     gather  the material arrives — Lantern's sparks drifting in and pooling, Circuit's grid laying itself out, Thorn's stem climbing from below
     draw    the key's own KEY_ART paths draw on, one after another, `stroke` ms apart: the bow, the shaft, the teeth, then the flourish
     forge   the moment it becomes a key — a strike, and the light goes through it
     settle  it takes its finished tint and glow and the screen is simply the key screen again
   `stroke` is the beat between one path drawing and the next, `bits` how many pieces of material gather, and `flash` how bright the forge is in
   px of halo. Escalating Skill → Pro → Author in length, pieces and glow, the way every other moment in the app does. The sound is
   KEY_INTRO_FX in config/audio.js, one per tier, with each step's own hit from KEY_STEP_FX. All (guess), and heard by nobody (UNVERIFIED.md). */
export const KEY_INTRO = {
  clear: { ms: 2600, bits: 14, stroke: 120, flash: 18,
    steps: [{ name: 'gather', at: 0, ms: 900 }, { name: 'draw', at: 700, ms: 1100 }, { name: 'forge', at: 1800, ms: 320 }, { name: 'settle', at: 2100, ms: 500 }] },
  pro: { ms: 3000, bits: 20, stroke: 110, flash: 26,
    steps: [{ name: 'gather', at: 0, ms: 1050 }, { name: 'draw', at: 800, ms: 1300 }, { name: 'forge', at: 2100, ms: 360 }, { name: 'settle', at: 2440, ms: 560 }] },
  author: { ms: 3400, bits: 26, stroke: 105, flash: 34,
    steps: [{ name: 'gather', at: 0, ms: 1200 }, { name: 'draw', at: 900, ms: 1500 }, { name: 'forge', at: 2400, ms: 400 }, { name: 'settle', at: 2780, ms: 620 }] },
};

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
/* ---------- v29 Section A (57.7, build 57): THE MOTION IS THE CLOCK, AND THE MUSIC'S TAIL CARRIES ACROSS THE CUT ----------
   THIS REVERSES v28 ITEM 15, which Section A's own table lists as reversed. Item 15 made the MUSIC the clock and grew a finale to fill it;
   Aiden played that and found the opposite fault at the other end — "about three seconds between the animation ending and the chest" on the
   Skill key, "about five seconds, then tap to continue" on Pro. His diagnosis is the right one: "music is being counted as animation while
   nothing moves". Measured on build 56 (`node _smoke/measure-earn.mjs`), with the assembly's last frame as the mark:
     Skill   assembly ends 1330ms, the reveal let go at 2390ms  →  1060ms of settling with nothing moving
     Pro     assembly ends 1900ms, let go at 3000ms             →  1100ms
     Author  assembly ends 1996ms, let go at 4000ms             →  2004ms
   So `ms` is the MOTION's own length again — the assembly, the flash, and a settle short enough to be one — and the earn music is NOT
   shortened to meet it: it rings on across the cut into the chest, the way a sting should. NOTHING ABOUT THE ASSEMBLIES MOVED. Every step
   before `flash` is at the exact `at` and `ms` Aiden approved on 2026-09-18 and again in 57.7 ("the animation for this is sick, do not
   change it"): the Skill key's seven spokes and spin, the Pro key's one-by-one spokes with the current running between them, the Author
   key's drop, slam, cracks and thorns. What shortened is item 15's own filler — `rise` from 830/800/1600 to 300/320/384, `land` from
   230/300/404 to 180/200/220 and off the music's final note, which there is no longer any reason to land on.
     Skill   2390 → 1750  (music 2390, 640ms of tail)      Pro  3000 → 2360  (music 3000, 640ms)      Author  4000 → 2500  (music 4000, 1500ms)
   These are within 50–200ms of build 52's approved motion lengths (1700 / 2160 / 2300), which is the last time the animation and the clock
   were the same thing. THE GATE'S RULE IS REVERSED WITH IT: `ms` is no longer within a beat of the music — it must be SHORTER than it by a
   real margin, and the music's own length must not have been trimmed to fit. The movement and assembly rules are untouched. */
export const KEY_EARN = {
  clear: { ms: 1750, spokes: { gap: 130, each: 300 }, cracks: 0, crackGap: 0, thorns: 0, thornGap: 0, shake: 0, finale: { scale: 1.05, glow: 16, halo: 1.35 },
    steps: [{ name: 'spokes', at: 0, ms: 1080 }, { name: 'spin', at: 820, ms: 510 }, { name: 'flash', at: 1330, ms: 240 }, { name: 'rise', at: 1330, ms: 300 }, { name: 'land', at: 1570, ms: 180 }] },
  pro: { ms: 2360, spokes: { gap: 120, each: 280, trace: 85 }, cracks: 0, crackGap: 0, thorns: 0, thornGap: 0, shake: 0, finale: { scale: 1.07, glow: 24, halo: 1.5 },
    steps: [{ name: 'spokes', at: 0, ms: 1000 }, { name: 'trace', at: 40, ms: 685 }, { name: 'snap', at: 980, ms: 480 }, { name: 'ring', at: 1420, ms: 480 }, { name: 'flash', at: 1900, ms: 260 }, { name: 'rise', at: 1900, ms: 320 }, { name: 'land', at: 2160, ms: 200 }] },
  author: { ms: 2500, spokes: null, cracks: 10, crackGap: 48, thorns: 12, thornGap: 46, shake: 5, finale: { scale: 1.09, glow: 34, halo: 1.7 },
    steps: [{ name: 'drop', at: 0, ms: 430 }, { name: 'slam', at: 410, ms: 250 }, { name: 'crack', at: 620, ms: 712 }, { name: 'thorns', at: 1290, ms: 706 }, { name: 'flash', at: 1996, ms: 280 }, { name: 'rise', at: 1996, ms: 384 }, { name: 'land', at: 2280, ms: 220 }] },
};
// the one step that is not movement — the closing flash. The gate measures every tier's movement against it, so there is no second list of names
export const EARN_GLOW = 'flash';

/* ---------- v24 (C.6, build 43): THE THREE KEY-SCREEN BACKGROUNDS, drawn in code ----------
   One per key, drawn by ui/atmosphere.js while that key's screen is up, and a Customise background once that key is finished (config/theme.js
   ITEMS.bg, `key`). No image assets. Each moves gently and keeps its key's tempo — the drawer reads the bpm of the key's own theme (`track`
   above), so the motion and the music cannot drift apart. `alpha` is the strongest any element gets, so each stays under the screen's own content.
   Build 43 drew each one OVER the live background (C.4); build 46 (item 15) made it REPLACE the base on a key screen; build 57 (57.11a) finishes
   the thought — a layer is the whole picture and the starfield belongs to the default background alone. The build-43 fields `blobs`, `motes`,
   `drift` and `breathe` are retired with the drawings that read them, and the rows below are what each layer takes now. */
/* v29 SECTION A (57.11 a / d / e / f, build 57): ALL THREE REWORKED, AND NONE OF THEM SITS ON THE STARFIELD ANY MORE.
     lantern  57.11d: "just some yellow blobs over the same background. Rework it completely." It is a SCENE now: a dusk gradient from indigo at the
              top to amber at the horizon, and small PAPER LANTERNS drifting upward at `lanterns` at a time, each at its own size, depth and speed,
              each with a soft flicker of its own. `far` / `near` are how big a lantern is at the back and at the front, `rise` how many bars one
              takes to cross the screen, `flick` how deep its flicker goes, and `sky` / `glow` the two ends of the gradient.
     circuit  57.11e: he likes it; the lines must COVER THE SCREEN and run off all four edges. `traces` is up and `edge` is how far past each edge a
              trace is allowed to start and end, in cells — a trace now begins outside the canvas and leaves it on the other side.
     thorn    57.11f: he likes it, but "it looks like it goes back and forth". The branches GROW rather than sway, and every one of them is
              randomised: `grow` is the span of how long one takes, `reach` the span of how far it goes, `branch` how many side branches it may
              throw, `wide` the span of stem thickness and `spike` the span of thorn size. They keep growing until the screen is covered and then
              the oldest fades and is re-seeded, so it never plays backwards.
   Every one is still DIM (`alpha`) and still on its own key's tempo. All (guess). */
export const KEY_LAYER = {
  /* v30 (59.7, build 59): THE LANTERNS STAY, THE BRIGHT GROUND GOES. Aiden: "I really like the core of what you've done with the
     lantern theme, except I think it's far too bright because the words themselves are very difficult to read. So we should be
     keeping with this game's dark theme, but in general this is very, very good." This is his answer to build 57's question 2.
     `sky` was indigo 38,24,66 running to a .5 amber at the horizon, which put the whole bottom third of the Keys screen - the
     Sequence description, the two requirement lines, both NOT YET tags and TAP A ROW TO GO AND TRY IT - as dim grey on orange.
     It is the app's own near-black now, and the amber survives as `warm` (how much of the glow colour tints the foot) and `hz`
     (the horizon's radial), both a fraction of what they were. The lanterns themselves are untouched: their own glow reads
     BETTER against dark, which is the whole reason the scene works. */
  lantern: { lanterns: 14, alpha: .5, rise: 10, far: .5, near: 1.5, flick: .35, sky: '5,5,6', glow: '255,176,90', col: '255,208,138', warm: .1, hz: .07 },
  circuit: { cell: 44, traces: 16, pulse: 1, alpha: .12, head: .5, edge: 3, col: '191,230,255' },
  thorn: { branches: 10, thorns: 7, edge: .6, alpha: .5, grow: [6, 16], reach: [.24, .62], branch: [0, 3], wide: [.8, 2.4], spike: [5, 13], col: '255,255,255' },
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
