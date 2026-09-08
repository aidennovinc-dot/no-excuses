/* No Excuses — achievements (build 16, refactor stage 2). DATA ONLY (A2).
   Per game, three tiers plus secrets. `unlocks` is [customise group, value]; `at` is where tapping the row takes you;
   `hint` is the description a SECRET row shows in place of its name (v14 8.5) — it says what kind of thing earns it, never the number.
   (`s:-1` is the Streak length). The predicate (ACH_TEST) and the 0..1 progress bar (ACH_PROGRESS) live in
   progress/rules.js under the same id. */
export const ACH = [
  // everywhere
  { id:'first',   g:'all', tier:'unlock', name:'Showed up',   how:'Finish any run', unlocks:['sq','#FFE9C4'] },
  { id:'named',   g:'all', tier:'unlock', name:'Signed in',   how:'Put a name on your profile, top of the Scores screen', unlocks:['bg','grid'] },
  { id:'every',   g:'all', tier:'unlock', name:'Every game',  how:'Finish a run in every game', unlocks:['lead','#FFB020'] },
  { id:'fullset', g:'all', tier:'pro',    name:'Full set',    how:'In one game, every mode at every length', unlocks:['wheel'] },
  // v8: the first "big" unlock — a sound pack that is mostly a joke
  { id:'tour',    g:'all', tier:'pro',    name:'Grand tour',  how:'Finish a run in every mode of every game', unlocks:['snd','sigh'] },
  // v11: the easter egg. Three taps on the full stop under the top 10. Never earned by a run
  { id:'egg',     g:'all', tier:'secret', name:'Excuses',     how:'Found the full stop', hint:"Not something you can play for. Something on the result screen is punctuation and something is not.", unlocks:['sq','#FF7A59'] },
  // quick tap — every one is Two or Four, never "any mode" (v6). Four (v9) took Lead's slots; its pads are further apart, so its numbers sit under Two's
  { id:'qt_clean5',  g:'quick-tap', tier:'unlock', name:'Clean · Sprint · Four', how:'Four · Sprint, no misses, at least 7 hits', unlocks:['sq','#9BE8FF'], at:{d:'four',s:5} },
  { id:'qt_bclean5', g:'quick-tap', tier:'unlock', name:'Clean · Sprint · Two',  how:'Two · Sprint, no misses, at least 8 hits', at:{d:'two',s:5} },
  { id:'qt_r4',      g:'quick-tap', tier:'unlock', name:'Quick',                how:'Four · 3 hits a second, any length', unlocks:['snd','click'], at:{d:'four'} },
  { id:'qt_clean15', g:'quick-tap', tier:'unlock', name:'Clean · Dash',         how:'Four · Dash, no misses, at least 24 hits', unlocks:['bg','rain'], at:{d:'four',s:15} },
  { id:'qt_clean30', g:'quick-tap', tier:'pro',    name:'Clean · Marathon',     how:'Four · Marathon, no misses, at least 50 hits', unlocks:['sq','#C6FF7A'], at:{d:'four',s:30} },
  { id:'qt_r5',      g:'quick-tap', tier:'pro',    name:'Quicker',              how:'Four · 4 hits a second across a Dash', unlocks:['lead','#4FD9FF'], at:{d:'four',s:15} },
  { id:'qt_br4',     g:'quick-tap', tier:'pro',    name:'Two quick',            how:'Two · 4 hits a second across a Dash', at:{d:'two',s:15} },
  { id:'qt_eyes',    g:'quick-tap', tier:'pro',    name:'Eyes shut',            how:'Two · clean Marathon, at least 60 hits', unlocks:['lead','#FF4FD8'], at:{d:'two',s:30} },
  { id:'qt_sab',     g:'quick-tap', tier:'pro',    name:'Committed',            how:'Two · a run of nothing but misses, at least five', at:{d:'two'} },
  { id:'qt_s5',      g:'quick-tap', tier:'secret', name:'No excuses',           how:'Four · 5 hits a second on a Sprint', hint:"Four pads, the shortest length, and a rate no Pro row asks for.", at:{d:'four',s:5} },
  { id:'qt_s15',     g:'quick-tap', tier:'secret', name:'Still no excuses',     how:'Four · 5 hits a second, held for a Dash', hint:"That same rate, held for a whole Dash.", at:{d:'four',s:15} },
  { id:'qt_s30',     g:'quick-tap', tier:'secret', name:'Not normal',           how:'Four · 5 hits a second, held for a Marathon', hint:"That same rate again, held for a whole Marathon.", at:{d:'four',s:30} },
  { id:'qt_bs5',     g:'quick-tap', tier:'secret', name:'Two faith',            how:'Two · 5 hits a second on a Sprint', hint:"Two pads, a Sprint, and a rate that belongs on Four.", at:{d:'two',s:5} },
  // dots
  { id:'dt_pin',   g:'dots', tier:'unlock', name:'Pinpoint',         how:'Lead · a clean Sprint with at least 8 hits', unlocks:['sq','#FFD1DC'], at:{d:'lead',s:5} },
  { id:'dt_bpin',  g:'dots', tier:'unlock', name:'Pinpoint · Blind', how:'Blind · a clean Sprint with at least 6 hits', at:{d:'blind',s:5} },
  { id:'dt_sweep', g:'dots', tier:'unlock', name:'Sweep',            how:'Lead · 3 hits a second over a Dash', unlocks:['lead','#7CFFB2'], at:{d:'lead',s:15} },
  { id:'dt_land',  g:'dots', tier:'pro',    name:'Landing',          how:'Lead · a clean Marathon with at least 45 hits', unlocks:['bg','orbs'], at:{d:'lead',s:30} },
  { id:'dt_blind', g:'dots', tier:'pro',    name:'Homing',           how:'Blind · 3 a second over a Dash', at:{d:'blind',s:15} },
  { id:'dt_s',     g:'dots', tier:'secret', name:'Radar',            how:'Lead · 4.5 a second held for a Marathon', hint:"Lead, a Marathon, faster than every Pro row on the board.", at:{d:'lead',s:30} },
  { id:'dt_bs',    g:'dots', tier:'secret', name:'Sonar',            how:'Blind · 3.5 a second held for a Marathon', hint:"The same, Blind — with no ring showing you where next.", at:{d:'blind',s:30} },
  // hold (v11: a Set scores the average % off across 7 rounds — lower is better; a Streak scores rounds)
  { id:'hd_money',  g:'hold', tier:'unlock', name:'On the money', how:'One round within 2.00%', unlocks:['snd','wood'] },
  { id:'hd_steady', g:'hold', tier:'unlock', name:'Steady hand',  how:'Grow · a Set averaging under 3% off', unlocks:['sq','#F3D9FF'], at:{d:'grow',s:7} },
  { id:'hd_est',    g:'hold', tier:'pro',    name:'Good eye',     how:'Cut · a Set averaging under 4% off', unlocks:['lead','#FFFFFF'], at:{d:'cut',s:10} },
  { id:'hd_run',    g:'hold', tier:'pro',    name:'Long haul',    how:'A Streak of 15 rounds, either mode', at:{s:-1} },
  { id:'hd_s',      g:'hold', tier:'secret', name:'Machine',      how:'Every round of a Set within 4.00%', hint:"Not the average. Every single round of a Set inside a very small margin.", at:{s:7} },
  // sequence
  { id:'sq_7',    g:'sequence', tier:'unlock', name:'Seven',        how:'Reach round 7 on any keys', unlocks:['bg','stars'] },
  { id:'sq_12',   g:'sequence', tier:'pro',    name:'Twelve',       how:'Reach round 12 on any keys', unlocks:['sq','#FFF3A0'] },
  { id:'sq_7x8',  g:'sequence', tier:'pro',    name:'Wide open',    how:'Round 8 on seven keys', at:{s:7} },
  { id:'sq_5x10', g:'sequence', tier:'pro',    name:'Ten on five',  how:'Round 10 on five keys', at:{s:5} },
  { id:'sq_s20',  g:'sequence', tier:'secret', name:'Twenty',       how:'Round 20 on any keys', hint:"Twice as far as the Pro row goes. Say them out loud." },
  { id:'sq_s15',  g:'sequence', tier:'secret', name:'The long one', how:'Round 15 on seven keys', hint:"The long one, on the widest board.", at:{s:7} },
  // v7 games — a starter set, no cosmetics attached yet. v11 units: Stopwatch Set = average s, Hidden Set = total px over 10, Flash Set = average ms, Go/No-go Set = ms + penalties
  { id:'tm_close', g:'timing',   tier:'unlock', name:'Dead on',       how:'Stopwatch · one attempt within 0.10s', at:{d:'stopwatch'} },
  { id:'tm_wall',  g:'timing',   tier:'pro',    name:'X-ray',         how:'Hidden · a Set under 300px off in total', at:{d:'hidden',s:10} },
  { id:'tm_run',   g:'timing',   tier:'pro',    name:'Keeps going',   how:'Stopwatch · a Streak of 10 attempts', at:{d:'stopwatch',s:-1} },
  { id:'tm_s',     g:'timing',   tier:'secret', name:'Metronome',     how:'Stopwatch · a Set averaging under 0.12s', hint:"A whole Set averaging closer than the Pro row asks for one attempt.", at:{d:'stopwatch',s:5} },
  { id:'rx_200',   g:'reaction', tier:'unlock', name:'Under 200',     how:'Flash · one tap under 200ms', at:{d:'flash'} },
  { id:'rx_clean', g:'reaction', tier:'pro',    name:'Disciplined',   how:'Go / No-go · a Set with no wrong taps', at:{d:'nogo',s:5} },
  { id:'rx_run',   g:'reaction', tier:'pro',    name:'Steady',        how:'Flash · a Streak of 8 attempts', at:{d:'flash',s:-1} },
  { id:'rx_s',     g:'reaction', tier:'secret', name:'Twitch',        how:'Flash · a Set averaging under 180ms', hint:"A Set average under what most people manage once.", at:{d:'flash',s:5} },
  { id:'sp_5',     g:'spot',     tier:'unlock', name:'Eight',         how:'Count · reach round 8 in a Streak', at:{d:'count',s:-1} },
  { id:'sp_15',    g:'spot',     tier:'pro',    name:'Dead count',    how:'Count · a Set with 2 or less miscount in total', at:{d:'count',s:10} },
  { id:'sp_fast',  g:'spot',     tier:'unlock', name:'Spotter',       how:'Find · a Set under 20.00s in total', at:{d:'find',s:10} },
  { id:'sp_clean', g:'spot',     tier:'pro',    name:'No wrong taps', how:'Find · a Set with not one wrong tap', at:{d:'find',s:10} },
];
// Author (v13, 11.3): one row per game, mode and length is generated in progress.js; `rec` is null until Aiden fills it in — a null record can never be beaten
export const AUTHOR_RECORDS = {};
