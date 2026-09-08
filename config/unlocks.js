/* No Excuses — the unlock chain (build 16, refactor stage 2). DATA ONLY (A2).
   L6: this table and LEN_RULES are the one record of the chain — lock boxes, goal lines and the Next-achievement card all
   read from here. The predicate for each row lives in progress/rules.js under the same key (UNLOCK_TEST, LEN_TEST).
   `live:1` = a threshold that fires the moment a run reaches it (green toast mid-run); the rest wait for the end.
   `s:-1` is the Streak length (STREAK in config/games.js). */
export const UNLOCKS = [
  { key:'quick-tap:four',    need:'9 hits, no misses, in a Quick Tap Dash',       where:{g:'quick-tap',d:'two',s:15},      live:1 },
  { key:'dots:blind',        need:'30 hits in any Quick Tap run',                 where:{g:'quick-tap'},                   live:1 },
  { key:'dots:lead',         need:'6 hits, no misses, in a Dots Sprint',          where:{g:'dots',d:'blind',s:5},          live:1 },
  { key:'hold:grow',         need:'Reach 2 hits per second in any Dots mode',     where:{g:'dots'},                        live:1 },
  { key:'hold:cut',          need:'one Estimate · Grow round within 15%',      where:{g:'hold',d:'grow',s:7},           live:1 },
  { key:'sequence:solo',     need:'Finish one Estimate · Cut round within 3.5% of the target', where:{g:'hold',d:'cut'}, live:1 },
  { key:'sequence:practice', need:'8 notes in Sequence · 7 keys',              where:{g:'sequence',s:7},                live:1 },
  { key:'timing:stopwatch',  need:'Reach round 6 in Sequence · 7 keys',           where:{g:'sequence',s:7},                live:1 },
  { key:'timing:hidden',     need:'one Timing · Stopwatch attempt within 0.30s', where:{g:'timing',d:'stopwatch',s:5},  live:1 },
  { key:'reaction:flash',    need:'Reach round 6 in Timing · Stopwatch · Streak', where:{g:'timing',d:'stopwatch',s:-1},   live:1 },
  { key:'reaction:nogo',     need:'Finish a Reaction · Flash Set averaging under 300ms', where:{g:'reaction',d:'flash',s:5} },
  { key:'spot:count',        need:'finish any Reaction run',                      where:{g:'reaction'} },
  { key:'spot:find',         need:'reach round 5 in Spot · Count',              where:{g:'spot',d:'count'},              live:1 },
];
// length locks (v13 section 4): per game, the requirement copy for the length at index i — `{prev}` is the length before it.
// A null / missing rule means one finished run of the length before it (that copy is PROGRESS in copy.js).
// v14 (3.2): every requirement names its game — `{game}` is filled from GAMES[g].name beside `{prev}`.
export const LEN_RULES = {
  'quick-tap':[null,'7 hits, no misses, in a {game} {prev}','20 hits in a {game} {prev}'],
  'dots':     [null,'7 hits, no misses, in a {game} {prev}','35 hits in a {game} {prev}'],
  'sequence': [null,'6 notes in Sequence · 3 keys','6 notes in Sequence · 5 keys'],
};
