/* No Excuses — the three keys (v15 §5.3, build 26). DATA ONLY (A2).

   A.1 settles what the three are and there is no fourth dimension: key 1 is the normal clearance bars, key 2 a pro tier,
   key 3 the author's own times. They are difficulty tiers over the SAME thirty-one combinations, not three separate
   collections — so nothing here touches config/key-bars.js, which stays the one place a bar lives (#371, still blocked).

   KEYS 2 AND 3 ARE A SHELL. What actually sits behind them is register #372 and is undecided, and A.2 says Aiden sets
   every bar by hand, so no build may derive one. `shell:true` is what the key screen reads to say "not decided yet"
   instead of inventing a target — remove the flag on the day #372 is answered and the tier has data.

   KEY_ART is the glyph per tier, and it gets progressively more elaborate as the difficulty rises (5.3): a plain bow and
   two teeth, then a ringed bow with three, then the Author's rosette with four and a pair of wards. Same 48x48 box, so
   the three sit in a row and the selected one scales up without redrawing. */

export const KEYS = [
  { id: 'clear', name: 'The key', lede: 'Every clearance bar, once each. Beat one in a solo run and that combination is cleared for good.' },
  { id: 'pro', name: 'Pro', shell: true, lede: 'A harder bar on every combination, for a second pass at a game you already know.' },
  { id: 'author', name: 'Author', shell: true, lede: "The author's own times. The last thing left to beat." },
];

// stroke paths, drawn in a 48x48 box. The bow first, then the shaft, then the teeth
export const KEY_ART = {
  clear: ['M24 10a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M24 24v14', 'M24 30h5', 'M24 34h4'],
  pro: ['M24 8a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M24 13a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M24 26v14', 'M24 30h6', 'M24 34h5', 'M24 38h4'],
  author: ['M24 5l2.7 4.4 5 1-3.5 3.7.6 5-4.8-2.2-4.8 2.2.6-5-3.5-3.7 5-1z', 'M24 21a5 5 0 1 0 0 10 5 5 0 1 0 0-10', 'M24 31v11', 'M24 33h7', 'M24 36h6', 'M24 39h5', 'M17 26h-4', 'M35 26h-4'],
};
