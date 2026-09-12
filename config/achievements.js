/* No Excuses — achievements (build 16, refactor stage 2). DATA ONLY (A2).
   Per game, three tiers plus secrets. `unlocks` is [customise group, value]; `at` is where tapping the row takes you;
   `hint` is the description a SECRET row shows in place of its name (v14 8.5) — it says what kind of thing earns it, never the number.
   (`s:-1` is the Streak length). The predicate (ACH_TEST) and the 0..1 progress bar (ACH_PROGRESS) live in
   progress/rules.js under the same id.

   `live:1` (build 23, v15 §2.5) is the same flag UNLOCKS carries and it means the same thing: this row's test can only
   become MORE true as a run goes on, so it is checked on every live tick and banked to the store the moment it fires —
   a player who quits mid-run keeps it. Rows without it are totals, averages or "no wrong taps" claims about a WHOLE run,
   which a partial run cannot honestly satisfy; those still wait for the finish. Every earn is written the instant it
   happens either way: run/run.js now banks at finish before the ad break, not after it.

   v17 (B.6, build 28): NINE rows lost `live:1` — every "clean run" row (qt_clean5, qt_bclean5, qt_clean15, qt_clean30,
   qt_eyes, dt_pin, dt_bpin, dt_land) and Committed (qt_sab). Each tests `misses===0` or `hits===0` about the WHOLE run,
   and both can go FALSE on the next tap, so the flag was banking them from a partial run that had not earned them:
   seven clean hits into a Sprint took Clean · Sprint · Two, and the eight misses that followed could not take it back.
   That is the same class of error B.6 reports against the chain, found in the same pass. The rule the header states was
   right; nine rows simply were not obeying it. */
export const ACH = [
  // everywhere
  { id:'first',   g:'all', tier:'earned', name:'Showed up',   how:'Finish any run', unlocks:['sq','#FFE9C4'] },
  { id:'named',   g:'all', tier:'earned', name:'Signed in',   how:'Put a name on your profile, top of the Scores screen', unlocks:['bg','grid'] },
  { id:'every',   g:'all', tier:'earned', name:'Every game',  how:'Finish a run in every game', unlocks:['lead','#FFB020'] },
  { id:'fullset', g:'all', tier:'pro',    name:'Full set',    how:'In one game, every mode at every length', unlocks:['wheel'] },
  // v8: the first "big" unlock — a sound pack that is mostly a joke
  { id:'tour',    g:'all', tier:'pro',    name:'Grand tour',  how:'Finish a run in every mode of every game', unlocks:['snd','sigh'] },
  // v11: the easter egg. Three taps on the full stop under the top 10. Never earned by a run
  { id:'egg',     g:'all', tier:'secret', name:'Excuses',     how:'Found the full stop', hint:"Not something you can play for. Something on the result screen is punctuation and something is not.", unlocks:['sq','#FF7A59'] },
  // quick tap — every one is Two or Four, never "any mode" (v6). Four (v9) took Lead's slots; its pads are further apart, so its numbers sit under Two's
  { id:'qt_clean5',  g:'quick-tap', tier:'earned', name:'Clean · Sprint · Four', how:'Four · Sprint, no misses, at least 7 hits', unlocks:['sq','#9BE8FF'], at:{d:'four',s:5} },
  { id:'qt_bclean5', g:'quick-tap', tier:'earned', name:'Clean · Sprint · Two',  how:'Two · Sprint, no misses, at least 8 hits', at:{d:'two',s:5} },
  { id:'qt_r4',      g:'quick-tap', tier:'earned', name:'Quick',                how:'Four · 3 hits a second, any length', unlocks:['snd','click'], at:{d:'four'}, live:1 },
  { id:'qt_clean15', g:'quick-tap', tier:'earned', name:'Clean · Dash',         how:'Four · Dash, no misses, at least 24 hits', unlocks:['bg','rain'], at:{d:'four',s:15} },
  { id:'qt_clean30', g:'quick-tap', tier:'pro',    name:'Clean · Marathon',     how:'Four · Marathon, no misses, at least 50 hits', unlocks:['sq','#C6FF7A'], at:{d:'four',s:30} },
  { id:'qt_r5',      g:'quick-tap', tier:'pro',    name:'Quicker',              how:'Four · 4 hits a second across a Dash', unlocks:['lead','#4FD9FF'], at:{d:'four',s:15}, live:1 },
  { id:'qt_br4',     g:'quick-tap', tier:'pro',    name:'Two quick',            how:'Two · 4 hits a second across a Dash', at:{d:'two',s:15}, live:1 },
  { id:'qt_eyes',    g:'quick-tap', tier:'pro',    name:'Eyes shut',            how:'Two · clean Marathon, at least 60 hits', unlocks:['lead','#FF4FD8'], at:{d:'two',s:30} },
  { id:'qt_sab',     g:'quick-tap', tier:'pro',    name:'Committed',            how:'Two · a run of nothing but misses, at least five', at:{d:'two'} },
  { id:'qt_s5',      g:'quick-tap', tier:'secret', name:'No excuses',           how:'Four · 5 hits a second on a Sprint', hint:"Four pads, the shortest length, and a rate no Pro row asks for.", at:{d:'four',s:5}, live:1 },
  { id:'qt_s15',     g:'quick-tap', tier:'secret', name:'Still no excuses',     how:'Four · 5 hits a second, held for a Dash', hint:"That same rate, held for a whole Dash.", at:{d:'four',s:15}, live:1 },
  { id:'qt_s30',     g:'quick-tap', tier:'secret', name:'Not normal',           how:'Four · 5 hits a second, held for a Marathon', hint:"That same rate again, held for a whole Marathon.", at:{d:'four',s:30}, live:1 },
  { id:'qt_bs5',     g:'quick-tap', tier:'secret', name:'Two faith',            how:'Two · 5 hits a second on a Sprint', hint:"Two pads, a Sprint, and a rate that belongs on Four.", at:{d:'two',s:5}, live:1 },
  // dots
  { id:'dt_pin',   g:'dots', tier:'earned', name:'Pinpoint',         how:'Lead · a clean Sprint with at least 8 hits', unlocks:['sq','#FFD1DC'], at:{d:'lead',s:5} },
  { id:'dt_bpin',  g:'dots', tier:'earned', name:'Pinpoint · Blind', how:'Blind · a clean Sprint with at least 6 hits', at:{d:'blind',s:5} },
  { id:'dt_sweep', g:'dots', tier:'earned', name:'Sweep',            how:'Lead · 3 hits a second over a Dash', unlocks:['lead','#7CFFB2'], at:{d:'lead',s:15}, live:1 },
  { id:'dt_land',  g:'dots', tier:'pro',    name:'Landing',          how:'Lead · a clean Marathon with at least 45 hits', unlocks:['bg','orbs'], at:{d:'lead',s:30} },
  { id:'dt_blind', g:'dots', tier:'pro',    name:'Homing',           how:'Blind · 3 a second over a Dash', at:{d:'blind',s:15}, live:1 },
  { id:'dt_s',     g:'dots', tier:'secret', name:'Radar',            how:'Lead · 4.5 a second held for a Marathon', hint:"Lead, a Marathon, faster than every Pro row on the board.", at:{d:'lead',s:30}, live:1 },
  { id:'dt_bs',    g:'dots', tier:'secret', name:'Sonar',            how:'Blind · 3.5 a second held for a Marathon', hint:"The same, Blind — with no ring showing you where next.", at:{d:'blind',s:30}, live:1 },
  // hold (v11: a Set scores the average % off across 7 rounds — lower is better; a Streak scores rounds)
  { id:'hd_money',  g:'hold', tier:'earned', name:'On the money', how:'One round within 2.00%', unlocks:['snd','wood'], live:1 },
  { id:'hd_steady', g:'hold', tier:'earned', name:'Steady hand',  how:'Grow · a Set averaging under 3% off', unlocks:['sq','#F3D9FF'], at:{d:'grow',s:7} },
  { id:'hd_est',    g:'hold', tier:'pro',    name:'Good eye',     how:'Cut · a Set averaging under 4% off', unlocks:['lead','#FFFFFF'], at:{d:'cut',s:10} },
  { id:'hd_run',    g:'hold', tier:'pro',    name:'Long haul',    how:'A Streak of 15 rounds, either mode', at:{s:-1}, live:1 },
  { id:'hd_s',      g:'hold', tier:'secret', name:'Machine',      how:'Every round of a Set within 4.00%', hint:"Not the average. Every single round of a Set inside a very small margin.", at:{s:7} },
  // v15 (1.5): the deliberate-fail joke, Estimate's answer to Quick Tap's "Committed". Secret, because Aiden's secret tier
  // is explicitly the deliberate fails and the hidden finds (#350) — a Pro row would put it in a list of things to aim at
  { id:'hd_max',    g:'hold', tier:'secret', name:'Greedy',       how:'Grow · let the shape run all the way to its limit', hint:"Accuracy has nothing to do with this one. You were shown a size. Ask for very much more than that, and do not let go.", at:{d:'grow'}, live:1 },
  // sequence
  { id:'sq_7',    g:'sequence', tier:'earned', name:'Seven',        how:'Reach round 7 on any keys', unlocks:['bg','stars'], live:1 },
  { id:'sq_12',   g:'sequence', tier:'pro',    name:'Twelve',       how:'Reach round 12 on any keys', unlocks:['sq','#FFF3A0'], live:1 },
  { id:'sq_7x8',  g:'sequence', tier:'pro',    name:'Wide open',    how:'Round 8 on seven keys', at:{s:7}, live:1 },
  // v17 (B.9): was 'Ten on five'. Five keys is gone, so the row could never be earned again and would have sat on the
  // Achievements screen forever asking for a length that is not on the sheet. Moved to three keys — the easy board, so it
  // sits below Wide open exactly as it did (guess: Aiden may prefer it retired outright rather than re-pointed)
  { id:'sq_5x10', g:'sequence', tier:'pro',    name:'Ten on three', how:'Round 10 on three keys', at:{s:3}, live:1 },
  { id:'sq_s20',  g:'sequence', tier:'secret', name:'Twenty',       how:'Round 20 on any keys', hint:"Twice as far as the Pro row goes. Say them out loud.", live:1 },
  { id:'sq_s15',  g:'sequence', tier:'secret', name:'The long one', how:'Round 15 on seven keys', hint:"The long one, on the widest board.", at:{s:7}, live:1 },
  // v7 games — a starter set, no cosmetics attached yet. v11 units: Stopwatch Set = average s, Hidden Set = total px over 10, Flash Set = average ms, Go/No-go Set = ms + penalties
  { id:'tm_close', g:'timing',   tier:'earned', name:'Dead on',       how:'Stopwatch · one attempt within 0.10s', at:{d:'stopwatch'}, live:1 },
  // v18 (B.4): 300px converted at the ball's measured pace (6.71ms a pixel) is 2013ms — the row asks for 2000ms
  { id:'tm_wall',  g:'timing',   tier:'pro',    name:'X-ray',         how:'Hidden · a Set under 2000ms off in total', at:{d:'hidden',s:10} },
  { id:'tm_run',   g:'timing',   tier:'pro',    name:'Keeps going',   how:'Stopwatch · a Streak of 10 attempts', at:{d:'stopwatch',s:-1}, live:1 },
  // v18 (B.2): the Set is a total, so the same standard is 0.12s a round across five — 0.60s, not a new number
  { id:'tm_s',     g:'timing',   tier:'secret', name:'Metronome',     how:'Stopwatch · a Set under 0.60s off in total', hint:"A whole Set closer, round for round, than the Pro row asks for one attempt.", at:{d:'stopwatch',s:5} },
  /* v17 (B.12): the new secret row — let one Stopwatch attempt run the full CFG.swOver seconds past its target instead of
     tapping. NAME IS A PLACEHOLDER: Aiden names the secret rows himself, and this one is flagged in FEATURES.md for him.
     `live:1` is honest here — `ov` is set the moment the clock runs out and nothing later in the run can take it back. */
  { id:'tm_s10',   g:'timing',   tier:'secret', name:'The long wait', how:'Stopwatch · let one attempt run the full 10 seconds past its target', hint:"Nothing to do with accuracy. There is a point at which the game gives up waiting for you. Find it.", at:{d:'stopwatch'}, live:1 },
  { id:'rx_200',   g:'reaction', tier:'earned', name:'Under 200',     how:'Flash · one tap under 200ms', at:{d:'flash'}, live:1 },
  { id:'rx_clean', g:'reaction', tier:'pro',    name:'Disciplined',   how:'Go / No-go · a Set with no wrong taps', at:{d:'nogo',s:5} },
  { id:'rx_run',   g:'reaction', tier:'pro',    name:'Steady',        how:'Flash · a Streak of 8 attempts', at:{d:'flash',s:-1}, live:1 },
  { id:'rx_s',     g:'reaction', tier:'secret', name:'Twitch',        how:'Flash · a Set averaging under 180ms', hint:"A Set average under what most people manage once.", at:{d:'flash',s:5} },
  { id:'sp_5',     g:'spot',     tier:'earned', name:'Eight',         how:'Count · reach round 8 in a Streak', at:{d:'count',s:-1}, live:1 },
  { id:'sp_15',    g:'spot',     tier:'pro',    name:'Dead count',    how:'Count · a Set with 2 or less miscount in total', at:{d:'count',s:10} },
  { id:'sp_fast',  g:'spot',     tier:'earned', name:'Spotter',       how:'Find · a Set under 20.00s in total', at:{d:'find',s:10} },
  { id:'sp_clean', g:'spot',     tier:'pro',    name:'No wrong taps', how:'Find · a Set with not one wrong tap', at:{d:'find',s:10} },
];
// Author (v13, 11.3): one row per game, mode and length is generated in progress.js; `rec` is null until Aiden fills it in — a null record can never be beaten
export const AUTHOR_RECORDS = {};
