/* No Excuses — the three keys (v15 §5.3, build 26; themed at build 30, v17 §B.31; re-themed and un-shelled at build 32,
   v18 §B.22 / §B.27). DATA ONLY (A2).

   A.1 settles what the three are and there is no fourth dimension: key 1 is the normal clearance bars, key 2 a pro tier,
   key 3 the author's own times. They are difficulty tiers over the SAME combinations, not three separate collections —
   so nothing here touches config/key-bars.js, which stays the one place a bar lives. B.27: that file now carries all
   three tiers per row (`bar`, `pro`, `author`), and A SHELL IS DERIVED FROM IT — a tier whose column has any empty row is
   a shell, progress/key.js says so, and no flag lives here any more. Pro and Author start empty; A.2 says Aiden sets
   every bar by hand, so no build may derive one. The day a column is full the tier simply starts counting.

   B.22 — ONE THEME PER TIER: LANTERN → CIRCUIT → THORN, from the proposal page Aiden reviewed 2026-09-10 ("the design for
   the keys looked fucking amazing"), extracted by Cowork into ../_review/2026-09-10_key-themes-art.js. Visual only: the
   TRACKS are unchanged — key:roots, key:frost, key:thorn in config/audio.js — so the loops still play what build 30 built.
   A theme is: `style`, which ui/screens/key.js draws (a lantern's straight glowing spokes and rings, a circuit's
   right-angled traces with corner dots and square nodes, a thorn's curved branches with spikes); `tint`, the light a
   cleared root wears; `dim`, the unlit line; `ground`, behind the ring. Circuit is recoloured — Aiden's one instruction was
   "not gold" — and wears Frost's white-blue as the trace (guess), so the page's copper is nowhere in the app.

   NEITHER CIRCUIT NOR THORN IS SEEN BEFORE CHEST 1 (§A.1). The key screen shows one tier until mapOpen() (#411: the
   chest, OR Testing's OPEN EVERYTHING, OR Supporter — both dev-only, stripped from release by BUILD_FLAGS.dev), so a
   first-timer meets one target per game rather than three, and neither of these loops can even be asked for.

   KEY_ART is the glyph per tier, and it gets progressively more elaborate as the difficulty rises (5.3): a plain bow
   with roots, a ringed bow with frost spurs, then the Author's rosette with wards and thorns. Same 48x48 box, so the
   three sit in a row and the selected one scales up without redrawing. */

export const KEYS = [
  { id: 'clear', name: 'The key', theme: 'Lantern', style: 'lantern', track: 'key:roots', tint: '#FFD08A', dim: '#57442C', ground: 'rgba(255,208,138,.12)',
    lede: 'Every clearance bar, once each. Beat one in a solo run and that combination is cleared for good.' },
  { id: 'pro', name: 'Pro', theme: 'Circuit', style: 'circuit', track: 'key:frost', tint: '#BFE6FF', dim: '#35506A', ground: 'rgba(191,230,255,.08)',
    lede: 'A harder bar on every combination, for a second pass at a game you already know.' },
  { id: 'author', name: 'Author', theme: 'Thorn', style: 'thorn', track: 'key:thorn', tint: '#FFFFFF', dim: '#4D4D4D', ground: 'rgba(0,0,0,.55)',
    lede: "The author's own times. The last thing left to beat." },
];

// stroke paths, drawn in a 48x48 box. The bow first, then the shaft, then the teeth, then the theme's own flourish
export const KEY_ART = {
  clear: ['M24 10a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M24 24v14', 'M24 30h5', 'M24 34h4', 'M24 38c-3 2-5 3-6 6', 'M24 38c3 2 5 3 6 6'],
  pro: ['M24 8a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M24 13a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M24 26v14', 'M24 30h6', 'M24 34h5', 'M24 38h4', 'M15 12l-4-3', 'M33 12l4-3', 'M24 44l-3 3', 'M24 44l3 3'],
  author: ['M24 5l2.7 4.4 5 1-3.5 3.7.6 5-4.8-2.2-4.8 2.2.6-5-3.5-3.7 5-1z', 'M24 21a5 5 0 1 0 0 10 5 5 0 1 0 0-10', 'M24 31v11', 'M24 33h7', 'M24 36h6', 'M24 39h5', 'M17 26h-4', 'M35 26h-4', 'M24 42l-4 5', 'M24 42l4 5', 'M13 26l-3-4', 'M35 26l3-4'],
};
