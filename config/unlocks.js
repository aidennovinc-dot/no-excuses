/* No Excuses — the unlock chain (build 16, refactor stage 2). DATA ONLY (A2).
   L6: this table and LEN_RULES are the one record of the chain — lock boxes, goal lines and the Next-achievement card all
   read from here. The predicate for each row lives in progress/rules.js under the same key (UNLOCK_TEST, LEN_TEST).
   `live:1` = a threshold that fires the moment a run reaches it (green toast mid-run); the rest wait for the end.
   `s:-1` is the Streak length (STREAK in config/games.js).

   Build 23 (v15 §1, L6 amended): the values changed and LEN_RULES changed SHAPE — it is keyed 'game:mode' now, the same
   key SET_COPY already uses, because Aiden's numbers differ per mode (Dots · Blind Dash 6, Dots · Lead Dash 9). The
   principle is untouched: this is still the one record of the chain, and there is still no second copy of a requirement
   anywhere. Five of the rows below ask the player to fail on purpose (v15 §0.5) — that is deliberate, not a mistake, and
   tapping a locked row to read its requirement (v15 §2.1) is how anyone would ever find them. */
export const UNLOCKS = [
  { key:'quick-tap:four',    need:'15 hits, no misses, in a Quick Tap Dash',      where:{g:'quick-tap',d:'two',s:15},      live:1 },
  { key:'dots:blind',        need:'35 hits in any Quick Tap run',                 where:{g:'quick-tap'},                   live:1 },
  // v15 (1.2b): a deliberate-failure unlock. Still live — five misses is knowable the moment the fifth one lands
  { key:'dots:lead',         need:'5 misses in any Dots · Blind run',             where:{g:'dots',d:'blind'},              live:1 },
  // v15 (1.3a): a deliberate-failure unlock, and the one that CANNOT be live — "pressed nothing" is only true when the run ends
  { key:'hold:grow',         need:'Press nothing for a whole Dots run',           where:{g:'dots'} },
  { key:'hold:cut',          need:'one Estimate · Grow round within 15%',      where:{g:'hold',d:'grow',s:7},           live:1 },
  { key:'sequence:solo',     need:'Finish one Estimate · Cut round within 3.5% of the target', where:{g:'hold',d:'cut'}, live:1 },
  { key:'sequence:practice', need:'8 notes in Sequence · 7 keys',              where:{g:'sequence',s:7},                live:1 },
  /* v15 (1.4a): a deliberate-failure unlock — get the first note of a Sequence run wrong. v16 (2): LIVE now. The old
     predicate tested a score that could not reach the value it looked for, and the row waited for a finish nobody sits
     through after failing on note one. The engine flags the first answered note itself; the test can only become more
     true, so it belongs on the live path (v15 2.5). */
  { key:'timing:stopwatch',  need:'Get the first note wrong in a Sequence run',   where:{g:'sequence'},                   live:1 },
  { key:'timing:hidden',     need:'one Timing · Stopwatch attempt within 0.30s', where:{g:'timing',d:'stopwatch',s:5},  live:1 },
  { key:'reaction:flash',    need:'Reach round 6 in Timing · Stopwatch · Streak', where:{g:'timing',d:'stopwatch',s:-1},   live:1 },
  { key:'reaction:nogo',     need:'Finish a Reaction · Flash Set averaging under 350ms', where:{g:'reaction',d:'flash',s:5} },
  // v15 (1.4d): built as Aiden wrote it — Flash OR Go / No-go. Cowork's note is that this collapses into reaction:nogo
  // above (one 349ms Flash Set opens both at once) and recommends Go / No-go only. Flagged in FEATURES.md, not decided here
  { key:'spot:count',        need:'Finish a Reaction · Flash or Go / No-go Set averaging under 350ms', where:{g:'reaction',s:5} },
  { key:'spot:find',         need:'reach round 5 in Spot · Count',              where:{g:'spot',d:'count'},              live:1 },
];
/* length locks (v13 section 4) — keyed 'game:mode' since build 23 (v15 1.0a), was keyed by game alone.
   Per key, the requirement copy for the length at index i; `{prev}` is the length before it, `{game}` the game's name and
   `{mode}` its mode name (v14 3.2 named the game in every requirement; the per-mode split makes the mode worth naming too).
   A null / missing rule means one finished run of the length before it — that copy is PROGRESS in copy.js — so a mode with
   nothing to say here still works and still has exactly one record of its requirement.
   v15 (1.0c): `hold:cut` and `reaction:flash` are new. Index 1 is the Streak on a SET_COPY game (GC lays [rounds, STREAK]
   over it), so those two rows give Estimate · Cut and Reaction · Flash a real Streak requirement instead of "finish one Set".
   Every other Set/Streak mode keeps the default and is deliberately absent. */
export const LEN_RULES = {
  'quick-tap:two':  [null,'7 hits, no misses, in a {game} {prev}','24 hits in a {game} {prev}'],
  'quick-tap:four': [null,'7 hits, no misses, in a {game} {prev}','24 hits in a {game} {prev}'],
  'dots:blind':     [null,'6 hits, no misses, in a {game} · {mode} {prev}','24 hits in a {game} · {mode} {prev}'],
  'dots:lead':      [null,'9 hits, no misses, in a {game} · {mode} {prev}','28 hits in a {game} · {mode} {prev}'],
  'sequence:solo':  [null,'6 notes in Sequence · 3 keys','6 notes in Sequence · 5 keys'],
  'hold:cut':       [null,'more than 80% off in a single {game} · {mode} round'],
  'reaction:flash': [null,'a {game} · {mode} Set averaging over 500ms'],
};
