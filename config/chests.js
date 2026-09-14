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
   reads 0% (2026-09-10: "a new profile starts at 0") rather than 1 of 13 = 7%. */
export const METER = { band: 100, modes: true, partial: false, freeStart: true };
