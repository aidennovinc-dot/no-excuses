/* No Excuses — the three keys (v15 §5.3, build 26; themed at build 30, v17 §B.31). DATA ONLY (A2).

   A.1 settles what the three are and there is no fourth dimension: key 1 is the normal clearance bars, key 2 a pro tier,
   key 3 the author's own times. They are difficulty tiers over the SAME combinations, not three separate collections —
   so nothing here touches config/key-bars.js, which stays the one place a bar lives (#371, still blocked).

   KEYS 2 AND 3 ARE A SHELL. What actually sits behind them is register #372 and is undecided, and A.2 says Aiden sets
   every bar by hand, so no build may derive one. `shell:true` is what the key screen reads to say "not decided yet"
   instead of inventing a target — remove the flag on the day #372 is answered and the tier has data.

   B.31 — ONE THEME PER TIER: ROOTS → FROST → THORN, one tree across three keys. Aiden's brief was "a cool theme per
   key… black with spikes and white accents for author", and his answer on which set to build was "implement whatever
   you think is best". A theme is three things and no more: a `tint` the tier's glyph, ring and root wear, a `ground`
   behind it, and its own loop in config/audio.js. They escalate the way the glyphs do — a living green, then a cold
   white-blue, then black with white accents.

   NEITHER FROST NOR THORN IS SEEN BEFORE CHEST 1 (§A.1). The key screen shows one tier until `prefs.chest1`, so a
   first-timer meets one target per game rather than three, and neither of these loops can even be asked for.

   KEY_ART is the glyph per tier, and it gets progressively more elaborate as the difficulty rises (5.3): a plain bow
   with roots, a ringed bow with frost spurs, then the Author's rosette with wards and thorns. Same 48x48 box, so the
   three sit in a row and the selected one scales up without redrawing. */

export const KEYS = [
  { id: 'clear', name: 'The key', theme: 'Roots', track: 'key:roots', tint: '#7FC98B', ground: 'rgba(127,201,139,.10)',
    lede: 'Every clearance bar, once each. Beat one in a solo run and that combination is cleared for good.' },
  { id: 'pro', name: 'Pro', shell: true, theme: 'Frost', track: 'key:frost', tint: '#BFE6FF', ground: 'rgba(191,230,255,.10)',
    lede: 'A harder bar on every combination, for a second pass at a game you already know.' },
  { id: 'author', name: 'Author', shell: true, theme: 'Thorn', track: 'key:thorn', tint: '#FFFFFF', ground: 'rgba(0,0,0,.55)',
    lede: "The author's own times. The last thing left to beat." },
];

// stroke paths, drawn in a 48x48 box. The bow first, then the shaft, then the teeth, then the theme's own flourish
export const KEY_ART = {
  clear: ['M24 10a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M24 24v14', 'M24 30h5', 'M24 34h4', 'M24 38c-3 2-5 3-6 6', 'M24 38c3 2 5 3 6 6'],
  pro: ['M24 8a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M24 13a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M24 26v14', 'M24 30h6', 'M24 34h5', 'M24 38h4', 'M15 12l-4-3', 'M33 12l4-3', 'M24 44l-3 3', 'M24 44l3 3'],
  author: ['M24 5l2.7 4.4 5 1-3.5 3.7.6 5-4.8-2.2-4.8 2.2.6-5-3.5-3.7 5-1z', 'M24 21a5 5 0 1 0 0 10 5 5 0 1 0 0-10', 'M24 31v11', 'M24 33h7', 'M24 36h6', 'M24 39h5', 'M17 26h-4', 'M35 26h-4', 'M24 42l-4 5', 'M24 42l4 5', 'M13 26l-3-4', 'M35 26l3-4'],
};
