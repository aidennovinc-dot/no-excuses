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
   Games chest, Pro with the Key chest, Author with the Pro chest — through tierOpen() (#411: the chest, OR Testing's OPEN
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

/* ---------- v24 (C.5, build 43): EARNING A KEY — its own moment per tier, apart from opening a chest ----------
   Build 32's whole-key moment was one glyph flare for all three. Earning a key and opening a chest are two different moments (C.5), so each
   tier's earn is its own: Lantern a warm bloom behind the flare; Circuit square pulses running out from the hub, a current down every trace
   and the corner dots blinking; Thorn a dark closing-in, the thorns flexing and a white spiked burst while the glyph turns slowly. `ms` is
   the whole moment; the counts are how many of each drawn element (ui/screens/key.js earnHtml). The sound is KEY_EARN_FX in
   config/audio.js, from the key's own theme. Escalating in length and in what is drawn (gated). All (guess). */
export const KEY_EARN = {
  clear: { ms: 2900, bloom: 1, rings: 0, pulses: 0, spikes: 0 },
  pro: { ms: 3800, bloom: 0, rings: 3, pulses: 2, spikes: 0 },
  author: { ms: 4800, bloom: 0, rings: 0, pulses: 0, spikes: 14 },
};

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

/* ---------- v25 (item 11, build 46): THE FIRST-OPEN REVEAL OF A KEY ----------
   Build 43's KEY_EARN was a moment over a ring already lit. Item 11 asks for an EVENT: the games introduced one by one AROUND the key,
   clockwise like a clock face from Quick Tap at 12 — which is the order ui/screens/key.js already draws them in, so the index IS the
   hour — each landing with a soft version of its own game's sound (MAP_FX in config/audio.js, the same family the map's first open
   plays, item 2), finishing on the key settling into its finished state (item 13). It plays ONCE, the first time that key is whole
   (`prefs.revealed`), it cannot be tapped out of, and Testing's per-chest reset makes it a first time again.
     `ms`       the whole reveal, before "tap to continue" — about 4s / 5s / 6–7s, escalating (item 11)
     `dim`      how long the ring holds unlit before the first game arrives
     `nodeAt`   when the first game lands, `nodeGap` the beat between them — seven games, so nodeAt + 6 × nodeGap is the last
     `hubAt`    when the key itself lights: KEY_EARN's own layers and Snd.keyEarn(tier) (build 43's moment, inside the reveal now)
     `settleAt` when it settles into the finished state — the 120% bright pulsing key item 13 asks for
   The escalation is in what is drawn as well as in length (item 11): `motes` sparks rising round the ring, `ripple` rings running out
   from the hub as each game lands. All (guess), and heard by nobody (UNVERIFIED.md). */
export const KEY_REVEAL = {
  clear: { ms: 4000, dim: 280, nodeAt: 520, nodeGap: 330, hubAt: 2700, settleAt: 3300, motes: 0, ripple: 1 },
  pro: { ms: 5000, dim: 340, nodeAt: 600, nodeGap: 420, hubAt: 3400, settleAt: 4200, motes: 10, ripple: 2 },
  author: { ms: 6600, dim: 420, nodeAt: 700, nodeGap: 560, hubAt: 4900, settleAt: 5800, motes: 18, ripple: 3 },
};

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
