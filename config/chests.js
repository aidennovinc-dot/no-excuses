/* No Excuses — the four chests and the meter (build 40, v23 §L.10 / §L.8). DATA ONLY (A2). Beside config/key-bars.js on purpose:
   the bars fill the keys, the keys fill the chests.

   FOUR CHESTS, NAMED BY WHAT OPENS THEM — Games, Key, Pro, Thorns — never by number (L.10), so the move from three chests to four
   cannot leak into a mismatch anywhere. The order of this list IS the order they open in, and it is strictly sequential (L.10e):
   a chest is never ready while the one before it is shut.

   `needs` is what opens it: 'modes' is every game mode in config/unlocks.js — the Games chest REPLACES v21 G.3's gate on the
   connector, because the all-modes condition became a chest of its own — and a tier id is that key whole. `opens` is the key tier
   whose bars it reveals: the Games chest reveals key 1 (and banks the bars a saved best already beats, silently — G.4 extended one
   chest earlier), the Key chest Pro, the Pro chest Author (build 38). `screen` is the key screen tab a tap on the chest lands on.
   What each one GIVES, in words, is CHEST_WORDS in config/copy.js (L.11c). The sprites, idle states and ceremonies are build 41. */
export const CHESTS = [
  { id: 'games', needs: 'modes', opens: 'clear', screen: 0 },
  { id: 'key', needs: 'clear', opens: 'pro', screen: 0 },
  { id: 'pro', needs: 'pro', opens: 'author', screen: 1 },
  { id: 'thorns', needs: 'author', opens: null, screen: 2 },
];

/* THE METER (v23 §L.8a / §L.10b): one number, 0–400, never reset. Band 1 is the modes band (modes unlocked ÷ modes total); bands
   2–4 are the three keys, each counting only once the chest that reveals it is open — so the meter cannot pass 100 before the
   Games chest or 200 before the Key chest, by construction. `band` is one band's width.
   `modes: false` hides band 1 and makes the meter 0–300 — L.10b's "one config flag" if Aiden would rather it start at the Key chest.
   `partial` is §M.1 (unanswered, guess): false counts CLEARED bars ÷ bars, as L.8a and DECISIONS 2026-09-14 write it; true counts
   keyPct()'s partial credit inside each band instead, the way the per-key % worked from build 28 to 39.
   `freeStart` is §M.4 (unanswered, guess): the modes a new profile starts with (Quick Tap · Two) are not counted, so a new profile
   reads 0% (2026-09-10: "a new profile starts at 0") rather than 1 of 13 = 7%.
   v26 (items 7 / 9 / 12, build 48): `modes` IS FALSE — THE METER IS 0–300, THE THREE KEYS AND NOTHING ELSE. Aiden's meter is "the continuous
   0–300% figure", and "the Pro chest opens when the Pro key is earned, which is 200%". With the modes band on, the Pro key landed at 300%, so
   the map said "203% · opens at 300%" on a Pro chest that was one key short, which read as a threshold off by a tier. Key 1 is 0–100 (the Key
   chest opens at 100), Pro 100–200 (the Pro chest at 200), Author 200–300 (the Thorns chest at 300). The Games chest is not on the meter at
   all — it opens on every game mode, which is a count of modes, not a percentage — so its screen shows no percentage (item 7). */
export const METER = { band: 100, modes: false, partial: false, freeStart: true };

/* ---------- v23 (§L.8d / §L.8e, build 41): THE METER'S FOUR BANDS — presentation only (L10) ----------
   One row per band, in meter order: 0–100 the quiet band, 100–200 ink, 200–300 gold, 300–400 Thorns. Since build 48 the meter stops at 300
   (METER.modes false), so the Thorns row is the look of a meter that is full. A band starts AT its lower
   figure, so 100% already reads ink (guess). Effects scale WITHIN a band (L.8e): `glow` and `spike` are [at the band's bottom, at its
   top] in px, `shake` is [px below half-way, px from half-way] — whole pixels, so the number never blurs. GREEN IS NEVER A BAND
   COLOUR (B.22 — green means new); the gate reads every `col` here. The chests wear the same four colours, one band each (L.9a). */
export const METER_BANDS = [
  { id: 'quiet', col: 'var(--mute)', glow: [0, 0], spike: [0, 0], shake: [0, 0] },
  { id: 'ink', col: 'var(--ink)', glow: [0, 0], spike: [0, 0], shake: [0, 0] },
  { id: 'gold', col: '#E8B84A', glow: [3, 14], spike: [0, 0], shake: [0, 0] },
  { id: 'thorns', col: '#FFFFFF', ground: '#000000', cold: 'rgba(206,232,255,.6)', glow: [5, 16], spike: [3, 6], shake: [1, 2] },
];

/* ---------- v23 (§L.9a / §L.9b / §L.10d, build 41): THE FOUR CHEST SPRITES AND THEIR READY STATES ----------
   Same silhouette family, rising weight (L.9a): Games a thin outline in --mute; Key clean --ink lines; Pro gold fittings and a heavier lid;
   Thorns black with spikes and white accents. Paths are in a 40 × 32 box (drawn with a 2px margin so the spikes fit); `hinge` is where
   the lid turns. `band` is the METER_BANDS row whose colour the chest wears. ui/chest.js draws every chest in the app from this row —
   the map, the key screen's row of chests and the ceremony — so a colour or a path is one edit here.
   LOCKED is crossed out; OPENED is lid up and still; READY runs `idle` and nothing else animates (L.9b). The idle rises with the chest:
   Games the lightest breath, Key a breathing glow, Pro the glow plus a shimmer along its fittings, Thorns flexing spikes in a cold glow.
   `ms` is one cycle, `px` the glow at its peak. All (guess) — Aiden will re-tune on the phone. */
export const CHEST_LOOK = {
  games: { band: 0, stroke: 'var(--mute)', fill: 'none', lock: 'none', sw: 1, lidSw: 1, hinge: [5, 14],
    box: ['M5 14h30v14H5z'], lid: ['M5 14a15 9 0 0 1 30 0z'], lockp: ['M17.5 15.5h5v7h-5z'],
    idle: { kind: 'breath', ms: 3600, px: 4 } },
  key: { band: 1, stroke: 'var(--ink)', fill: 'var(--panel)', lock: 'var(--ink)', sw: 1.4, lidSw: 1.4, hinge: [5, 14],
    box: ['M5 14h30v14H5z', 'M5 20.5h30'], lid: ['M5 14a15 9 0 0 1 30 0z'], lockp: ['M17.5 15.5h5v7h-5z'],
    idle: { kind: 'glow', ms: 2800, px: 8 } },
  pro: { band: 2, stroke: '#E8B84A', fill: 'var(--panel)', lock: '#E8B84A', sw: 1.4, lidSw: 2.6, hinge: [4, 14],
    box: ['M4 14h32v15H4z'], lid: ['M4 14a16 10 0 0 1 32 0z', 'M8 10.6a12.5 6.6 0 0 1 24 0'], lockp: ['M17 15.5h6v8h-6z'],
    fit: ['M4 18.5h4.5v-4.5', 'M36 18.5h-4.5v-4.5', 'M4 24.5h4.5v4.5', 'M36 24.5h-4.5v4.5', 'M12.5 14v15', 'M27.5 14v15'],
    idle: { kind: 'shimmer', ms: 2400, px: 10 } },
  thorns: { band: 3, stroke: '#FFFFFF', fill: '#000000', lock: '#FFFFFF', sw: 1.4, lidSw: 1.8, hinge: [5, 14],
    box: ['M5 14h30v14H5z'], lid: ['M5 14a15 9 0 0 1 30 0z'], lockp: ['M18 16.5l2-2 2 2v6h-4z'],
    spikes: ['M6.5 10.9L3.2 8.2L7.5 8.1z', 'M11.4 7.2L9.7 3.3L13.6 5.2z', 'M18.5 5L20 1L21.5 5z', 'M26.4 5.2L30.3 3.3L28.6 7.2z', 'M32.5 8.1L36.8 8.2L33.5 10.9z'],
    boxSpikes: ['M5 17l-4 1.5 4 1.5z', 'M5 23l-4 1.5 4 1.5z', 'M35 17l4 1.5-4 1.5z', 'M35 23l4 1.5-4 1.5z'],
    accent: ['M9 25h22'],
    idle: { kind: 'spikes', ms: 2200, px: 12 } },
};

/* ---------- v23 (§L.6 / §L.10d, build 41): THE FOUR OPENING CEREMONIES, as named steps ----------
   Each is `ms` long and a list of named steps, each starting `at` ms in and lasting `ms`. ui/ceremony.js knows how to DRAW a step by its
   name and nothing else — every time here is a number edit, and the gate holds the names to the ones L.6 / L.10d wrote. The step list is
   ordered; steps may overlap. Presentation only (L10): the chest was opened and credited BEFORE the first step (progress/key.js openChest).
   Not skippable; the reveal holds on "tap to continue" from `ms` (L.6). The run's music is hushed for the whole of it (L.6).
     Games  ~3s  the locked tiles un-cross one by one, the path draws down to the chest, the lid lifts, one bright chord
     Key    ~4s  the thirty cleared bars assemble into the key, it click-turns in the lock, the lid lifts, light spills up
     Pro    ~5s  the chest shakes, cracks of light open across it, it bursts, the cosmetics scatter and slide off toward Customise
     Thorns ~6s  black, spikes grow in from the edges, one white line splits the middle and widens into the reveal, the spikes recede
   `meterMs` is the D.4 count-up in the reveal's last beat (L.8b); `swatch` the scattered cosmetics on the Pro chest — decoration, and no
   player colour among them (L4). */
export const CEREMONY = {
  games: { ms: 3000, steps: [{ name: 'uncross', at: 0, ms: 1200 }, { name: 'path', at: 1100, ms: 700 }, { name: 'lid', at: 1800, ms: 500 }, { name: 'chord', at: 2100, ms: 900 }] },
  key: { ms: 4000, steps: [{ name: 'assemble', at: 0, ms: 1800 }, { name: 'turn', at: 1800, ms: 600 }, { name: 'lid', at: 2400, ms: 500 }, { name: 'spill', at: 2700, ms: 1300 }] },
  pro: { ms: 5000, steps: [{ name: 'shake', at: 0, ms: 1600 }, { name: 'cracks', at: 1200, ms: 1600 }, { name: 'burst', at: 2800, ms: 500 }, { name: 'scatter', at: 3200, ms: 1800 }] },
  thorns: { ms: 6000, steps: [{ name: 'black', at: 0, ms: 700 }, { name: 'spikes', at: 500, ms: 2200 }, { name: 'split', at: 2700, ms: 400 }, { name: 'widen', at: 3100, ms: 1600 }, { name: 'recede', at: 4500, ms: 1500 }] },
};
export const CEREMONY_FX = { meterMs: 900, swatch: ['#FFB020', '#FFD1DC', '#E8B84A', '#B39DDB', '#8AB4F8', '#FF8A65'] };

/* ---------- v23 (§L.11b / §L.11d, build 41): THE SPILL ----------
   After a chest opens, the map shows its words shooting out to the right, one per line, `stagger` ms apart, each taking `ms`, starting
   `delay` ms after the map paints (so the scroll to the chest lands first), with `particles` dots bursting from the lid in the chest's band
   colour over `burstMs`. It plays ONCE per chest (`prefs.spill`); after that the column simply stands there (L.11b). All (guess). */
export const SPILL = { stagger: 120, ms: 520, delay: 450, particles: 10, burstMs: 700 };

/* ---------- v25 (items 6 / 7 / 22, build 46): THE SYMBOLS AN UNLOCK POPS OUT AS, AND THE REVEAL THAT ENDS EVERY UNLOCK ----------
   SYMBOLS is one drawing per thing a chest gives, in a 24 × 24 box, as stroke paths (`p`) and optional filled paths (`f`). ui/chest.js
   symSvg() draws one and nothing else knows a path: the SAME symbol pops out of the chest (item 6), stands beside that word on the map
   (item 7) and sits in the congratulations card's row (item 22), which is the whole point of the item — the player connects the three.
   Each word in CHEST_WORDS (config/copy.js) names its symbol by id. All (guess): Aiden re-draws one by editing its paths here. */
export const SYMBOLS = {
  // a key — the three tiers, each the plainer half of its own KEY_ART glyph so the pop-out and the key screen read as one thing
  key: { p: ['M12 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M12 12v8', 'M12 15h3', 'M12 18h2.5'] },
  keypro: { p: ['M12 3a5 5 0 1 0 0 10 5 5 0 1 0 0-10', 'M12 6a2 2 0 1 0 0 4 2 2 0 1 0 0-4', 'M12 13v8', 'M12 16h3.5', 'M12 19h2.5', 'M7 6L5 4', 'M17 6l2-2'] },
  keyauthor: { p: ['M12 2l1.5 2.6 3 .6-2.1 2.2.4 3-2.8-1.3-2.8 1.3.4-3L7.5 5.2l3-.6z', 'M12 11a3 3 0 1 0 0 6 3 3 0 1 0 0-6', 'M12 17v5', 'M12 19h4', 'M8 14H5', 'M16 14h3'] },
  // customisation — a palette with three wells
  palette: { p: ['M12 3a9 9 0 1 0 2 17.8c1.2-.2 1.6-1.6.8-2.5-.9-1-.2-2.5 1.1-2.5H18a3.9 3.9 0 0 0 3.9-4.4A9 9 0 0 0 12 3z'], f: ['M8 8.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6', 'M12.4 6.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6', 'M16.6 9.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6'] },
  // a gauntlet — a cuffed glove, the harder run
  gauntlet: { p: ['M7 21v-6.5a2 2 0 0 1 4 0V9a1.6 1.6 0 0 1 3.2 0v4', 'M14.2 12.4a1.5 1.5 0 0 1 3 0V16', 'M17.2 14.6a1.4 1.4 0 0 1 2.8 0v3.2A4 4 0 0 1 16 21H7', 'M5.4 6.4l3-1.6', 'M18.6 6.4l-3-1.6'] },
  // a cosmetic set — three swatches stacked
  cosmetic: { p: ['M4 6h10v5H4z', 'M7 11h10v5H7z', 'M10 16h10v5H10z'] },
  // the three key backgrounds (item 15), each a shorthand of the layer ui/atmosphere.js draws
  'bg-lantern': { p: ['M3 5h18v14H3z', 'M8 15.5a3.2 3.2 0 1 1 6.4 0', 'M6 9.5a2.2 2.2 0 1 1 4.4 0', 'M15 11.5a2.6 2.6 0 1 1 5.2 0'], f: ['M16.4 16.6a.9.9 0 1 0 0 1.8.9.9 0 1 0 0-1.8', 'M6.6 17a.7.7 0 1 0 0 1.4.7.7 0 1 0 0-1.4'] },
  'bg-circuit': { p: ['M3 5h18v14H3z', 'M6 8h5v4h6', 'M6 16h4v-4', 'M14 16h4'], f: ['M10.2 7.2h1.6v1.6h-1.6', 'M16.2 11.2h1.6v1.6h-1.6', 'M13.2 15.2h1.6v1.6h-1.6'] },
  'bg-thorn': { p: ['M3 5h18v14H3z', 'M3 19c4-1.5 6.5-4.5 7.5-8.5', 'M21 19c-4-1.5-6.5-4.5-7.5-8.5'], f: ['M7.4 15.4l2.4-.6-1 2.2z', 'M16.6 15.4l-2.4-.6 1 2.2z', 'M11.4 10.4l2.2-1-.6 2.4z'] },
};

/* v25 (items 6 / 11 / 22, build 46): THE ONE SHARED REVEAL. ui/reveal.js runs it for a chest and for a key alike — the stage, then the gifts,
   then "tap to continue", then the congratulations card — so "unlocking is an event" is one routine and not two (item 11's last line).
   `giftAt` is when the first symbol starts rising after the stage's own length, `giftGap` the beat between them, `giftMs` how long one takes;
   `hold` is the beat between the last one landing and "tap to continue" appearing (item 6: hold it back until the last one has landed).
   `cardAt` is how long after the tap the card fades in, `cardGo` how long before its Continue button becomes tappable (item 22: "about a
   second", so a tap left over from the animation cannot close it unseen). `fadeMs` is the WHOLE reveal under Reduce Motion — the stage, the
   gifts and the settle collapse into one short fade and the card follows (item 11, and Apple expects it). All (guess). */
export const REVEAL = { giftAt: 260, giftGap: 520, giftMs: 900, hold: 420, cardAt: 240, cardGo: 1000, fadeMs: 700 };
