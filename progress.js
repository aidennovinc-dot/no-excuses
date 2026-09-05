/* No Excuses — unlocks, achievements, scores, storage — everything that persists
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { start } from "./app.js";
import { Snd } from "./audio.js";
import { $, $$, MODE_NAME, STREAK, load, save } from "./core.js";
import { G } from "./engine-core.js";
import { GAMES, GC, N_GAMES, lenName } from "./games/registry.js";
import { F, VS, chips, fillSheet, fillTimes, prefs, sel, setStage, show } from "./menu.js";
// the lengths on offer (v10): the base set, plus the pro length for supporters. v11: per mode, and versus has its own (Reaction best-of)
const lensOf=(g,d,vs)=>{ const c=GC(g,d||sel.diff); if(vs===2&&c.vsLens) return c.vsLens; return c.pro&&prefs.supporter?c.lens.concat([c.pro]):c.lens; };
/* ---------- progression (v6): modes open on easy milestones, each in the mode before it. Quick Tap Blind is open from the start ---------- */
// live (v10): a threshold unlock fires the moment the run reaches it — a green toast mid-run — not at the end. Averages and "finish a run" still wait for the end
const UNLOCKS = [
  { key:'quick-tap:four', need:'7 hits, no misses, in a 5s Quick Tap', where:{g:'quick-tap',d:'two',s:5}, live:1, test:r=>r.g==='quick-tap'&&r.s===5&&r.misses===0&&r.hits>=7 },
  { key:'dots:blind',     need:'12 hits in one Quick Tap run',            where:{g:'quick-tap'},               live:1, test:r=>r.g==='quick-tap'&&r.hits>=12 },
  { key:'dots:lead',      need:'6 hits, no misses, in a 5s Dots',         where:{g:'dots',d:'blind',s:5},      live:1, test:r=>r.g==='dots'&&r.s===5&&r.misses===0&&r.hits>=6 },
  // Estimate (v10): two hits a second, averaged over any Dots run
  { key:'hold:grow',      need:'2 hits a second, averaged, in any Dots mode', where:{g:'dots'},                live:1, test:r=>r.g==='dots'&&r.hits>=2*r.s },
  { key:'hold:cut',       need:'one Grow round within 15%',               where:{g:'hold',d:'grow',s:7},       live:1, test:r=>r.g==='hold'&&r.d==='grow'&&r.x<=15 },
  { key:'sequence:solo',  need:'finish any Estimate run',                 where:{g:'hold'},                    test:r=>r.g==='hold' },
  // v7 chain continues through the four new games. v11: thresholds sit on Set runs where the unit is an average
  { key:'timing:stopwatch', need:'reach round 5 in Sequence',             where:{g:'sequence'},                live:1, test:r=>r.g==='sequence'&&r.hits>=5 },
  { key:'timing:hidden',    need:'one Stopwatch attempt within 0.30s',    where:{g:'timing',d:'stopwatch',s:5}, live:1, test:r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.3 },
  { key:'reaction:flash',   need:'a Stopwatch Set averaging under 0.50s', where:{g:'timing',d:'stopwatch',s:5}, test:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===5&&r.hits<=.5 },
  { key:'reaction:nogo',    need:'a Flash Set averaging under 350ms',     where:{g:'reaction',d:'flash',s:3},  test:r=>r.g==='reaction'&&r.d==='flash'&&r.s===3&&r.hits<=350 },
  { key:'spot:count',       need:'finish any Reaction run',               where:{g:'reaction'},                test:r=>r.g==='reaction' },
  { key:'spot:find',        need:'reach round 5 in Count',                where:{g:'spot',d:'count',s:1},      live:1, test:r=>r.g==='spot'&&r.d==='count'&&r.hits>=5 },
];
const unlocked=()=>load('ne.unlock',{});
// progressive lengths (v11): within a mode, Dash waits for a clean Sprint of 7+, Marathon for 20+ in a Dash; Streak waits for one finished Set; Find's Dash and Marathon for a finished round count before it. The first length is always open
function lenLock(g,d,s){ if(prefs.allOpen) return null; const c=GC(g,d), lens=c.lens, i=lens.indexOf(s); if(i<=0||s===c.pro) return null; const prev=lens[i-1], runs=Scores.runs().filter(r=>r.g===g&&r.d===d&&r.s===prev&&!r.practice);
  if(c.timed){ const ok=i===1?runs.some(r=>r.misses===0&&r.hits>=7):runs.some(r=>r.hits>=20); return ok?null:{g,d,s:prev,need:i===1?`7 clean hits in ${lenName(g,prev,d)} (no misses)`:`20 hits in ${lenName(g,prev,d)}`,name:lenName(g,s,d)}; }
  if(s===STREAK) return runs.length?null:{g,d,s:prev,need:`finish one ${lenName(g,prev,d)}`,name:'Streak'};
  if(g==='spot'&&d==='count') return runs.some(r=>r.hits>=8)?null:{g,d,s:prev,need:'reach round 8 in Normal',name:'Hard'};
  return runs.length?null:{g,d,s:prev,need:`finish a ${lenName(g,prev,d)}`,name:lenName(g,s,d)}; }
const lenOpen=(g,d,s)=>!lenLock(g,d,s);
// the next mode this run could open, if the game, mode and length line up — shown while you play (v8). v11: a length unlock counts too
function goalFor(g,d,s){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]&&x.where.g===g&&(!x.where.d||x.where.d===d)&&(!x.where.s||x.where.s===s)); if(x) return x;
  const c=GC(g,d), i=c.lens.indexOf(s); if(i>=0&&i<c.lens.length-1){ const L=lenLock(g,d,c.lens[i+1]); if(L) return { key:g+':'+d+':'+c.lens[i+1], need:L.need, where:{g,d,s}, live:1, len:L, test:r=>r.g===g&&r.d===d&&r.s===s&&(c.timed?(i===0?r.misses===0&&r.hits>=7:r.hits>=20):g==='spot'&&d==='count'?r.hits>=8:true) }; } return null; }
const isOpen=(g,d)=>!!prefs.allOpen||g==='quick-tap'&&d==='two'||!!unlocked()[g+':'+d]||!UNLOCKS.some(u=>u.key===g+':'+d);
const gameOpen=g=>GAMES[g].modes.some(d=>isOpen(g,d));
const needFor=(g,d)=>{ const u=UNLOCKS.find(u=>u.key===g+':'+d); return u?u.need:''; };
const unlockName=key=>{ const [g,d,s]=key.split(':'); if(s!==undefined) return lenName(g,+s,d); return GAMES[g].name+(MODE_NAME[d]?' · '+MODE_NAME[d]:''); };
// toast wording (v11): "Unlock game: Dots" for a game, "Unlock: Dash" for a mode or length
function unlockToast(key){ const [g,d,s]=key.split(':'); if(s!==undefined) return 'Unlock: '+lenName(g,+s,d); const first=!GAMES[g].modes.some(m=>m!==d&&unlocked()[g+':'+m])&&!(g==='quick-tap'); return (first?'Unlock game: '+GAMES[g].name:'Unlock: '+(MODE_NAME[d]||GAMES[g].name)); }
function checkUnlocks(run){ const u=unlocked(); const fresh=[]; for(const x of UNLOCKS){ if(!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); fresh.push(x); } } save('ne.unlock',u); return fresh; }
// everything is open (v11): no game, mode or length left to earn — the Next-up card hides
function nextGoal(){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]); if(x) return { text:`Next: ${x.need} unlocks ${unlockName(x.key)}`, where:x.where, need:x.need };
  for(const g in GAMES) for(const d of GAMES[g].modes){ if(!isOpen(g,d)) continue; for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(L) return { text:`Next: ${L.need} unlocks ${L.name} in ${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''}`, where:{g,d,s:L.s}, need:L.need }; } } return null; }
// mid-run (v10): engines call this with the run so far. Any live unlock that now passes lands at once, with a green toast; the goal line ticks
function liveCheck(part){ if(!G.on||VS.on||sel.vs===2) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0},part); const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; G.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save('ne.unlock',u);
  if(G.goal&&!G.goalHit&&(u[G.goal.key]||G.goal.test(run))){ G.goalHit=true; if(G.goal.len) toast(unlockToast(G.goal.key),'','ok'); $('#goal').classList.add('hit'); $('#goal').innerHTML='✓ '+$('#goal').innerHTML; } }
// a locked game or mode (v10): say what it takes and offer to go straight there — into the game, with the goal line up
let lockGo=null, pendingAim='';
function askUnlock(g,d,s){ if(s!==undefined){ const L=lenLock(g,d,s); if(!L) return; $('#lock-text').innerHTML=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${L.name}<b>To unlock: ${L.need}</b>`; lockGo=Object.assign({need:L.need},L); $('#lockwrap').classList.add('on'); return; }
  const u=UNLOCKS.find(u=>u.key===g+':'+d); if(!u) return; $('#lock-text').innerHTML=`${unlockName(u.key)}<b>To unlock: ${u.need}</b>`; lockGo=Object.assign({need:u.need},u.where); $('#lockwrap').classList.add('on'); }
function goWhere(w){ $('#lockwrap').classList.remove('on'); if(!w) return; const G_=GAMES[w.g]; sel.game=w.g; prefs.lastGame=w.g; save('ne.prefs',prefs);
  sel.diff=w.d&&isOpen(w.g,w.d)?w.d:(G_.modes.find(d=>isOpen(w.g,d))||G_.modes[0]); if(!isOpen(sel.game,sel.diff)) return askUnlock(sel.game,sel.diff);
  const lens=lensOf(w.g,sel.diff); sel.secs=w.s||(lens.includes(sel.secs)&&lenOpen(w.g,sel.diff,sel.secs)?sel.secs:lens.find(s=>lenOpen(w.g,sel.diff,s))); if(!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens[0]; sel.vs=0; sel.practice=0; VS.reset(); pendingAim=w.need||''; start(); }
// the one-liner under the ghost demo, the first time a mode is played
const INTRO = {
  'quick-tap:two':  ['Tap the white square when it appears.','nothing tells you where the next one is'],
  'quick-tap:four': ['Tap the white pad.','four of them now'],
  'dots:blind':     ['Tap the dot where it lands.','anywhere on the screen'],
  'dots:lead':      ['Tap the dot where it lands.','the red ring shows the next spot'],
  'hold:grow':      ['Watch it grow. Tap and hold until yours matches.','the outline stays — match its area'],
  'hold:cut':       ['Draw a line through the shape.','cut off the share it asks for'],
  'sequence:solo':  ['Copy the notes.','then it is your turn · one more each round'],
  'timing:stopwatch':['Tap to stop the timer.','on the target · the clock fades at 1.5s'],
  'timing:hidden':  ['Tap when the ball reaches the marker.','it goes behind the wall first'],
  'reaction:flash': ['Tap the moment it goes white.','tap early and you start that one again'],
  'reaction:nogo':  ['Tap only the shape you were told.','three wrong taps end the run · the rule changes'],
  'spot:count':     ['Count the shape you were shown.','the rest are decoys · three mistakes end it'],
  'spot:find':      ['One shape is different. Tap it.','the crowd grows every round'],
};
const SCALES={ penta:{name:'Pentatonic',n:[0,2,4,7,9,12,14]}, chinese:{name:'Chinese',n:[0,2,5,7,9,12,14]}, hijaz:{name:'Hijaz',n:[0,1,4,5,7,8,10]}, blues:{name:'Blues',n:[0,3,5,6,7,10,12]} };

/* ---------- score store: the interface a Game Center adapter implements later ---------- */
const Scores = {
  runs(){ return load('ne.runs',[]); },
  of(g,d,s){ const lo=GC(g,d,s).lower; return this.runs().filter(r=>r.g===g&&r.d===d&&r.s===s).sort((a,b)=>lo?(a.hits-b.hits||a.t-b.t):(b.hits-a.hits||a.misses-b.misses||a.t-b.t)); },
  best(g,d,s){ const r=this.of(g,d,s)[0]; return r?r.hits:null; },
  submit(run){ const prev=this.best(run.g,run.d,run.s); const runs=this.runs(); runs.unshift(run); save('ne.runs',runs.slice(0,600)); const lo=GC(run.g,run.d,run.s).lower; return prev===null ? run.hits>0||lo : (lo ? run.hits<prev : run.hits>prev); },
  rank(run){ return this.of(run.g,run.d,run.s).findIndex(r=>r.t===run.t)+1; }
};

/* ---------- achievements: per game, three tiers. progress() gives 0..1 for the bar; at{} is where tapping the row takes you ---------- */
const rate=r=>r.hits/r.s;
const bestRate=(all,g,s,d)=>Math.max(0,...all.filter(r=>r.g===g&&(!s||r.s===s)&&(!d||r.d===d)).map(rate));
const bestRound=(all,keys)=>Math.max(0,...all.filter(r=>r.g==='sequence'&&(!keys||r.s===keys)).map(r=>r.hits));
const lowTotal=(all,d,s)=>{ const v=all.filter(r=>r.g==='hold'&&(!d||r.d===d)&&(!s||r.s===s)).map(r=>r.hits); return v.length?Math.min(...v):null; };
const lowProg=(v,target)=>v===null?0:Math.min(1,target/Math.max(v,target));
const tourProg=all=>{ const cells=Object.entries(GAMES).flatMap(([g,x])=>x.modes.map(d=>all.some(r=>r.g===g&&r.d===d))); return cells.filter(Boolean).length/cells.length; };
const fullsetProg=(all,g)=>{ const G_=GAMES[g]; const cells=G_.modes.flatMap(d=>GC(g,d).lens.map(s=>all.some(x=>x.g===g&&x.d===d&&x.s===s))); return cells.filter(Boolean).length/cells.length; };
const ACH = [
  // everywhere
  { id:'first',   g:'all', tier:'unlock', name:'Showed up',   how:'Finish any run', unlocks:['sq','#FFE9C4'], test:()=>true },
  { id:'named',   g:'all', tier:'unlock', name:'Signed in',   how:'Put a name on your profile, top of the Scores screen', unlocks:['bg','grid'], test:()=>!!prefs.name },
  { id:'every',   g:'all', tier:'unlock', name:'Every game',  how:'Finish a run in every game', unlocks:['lead','#FFB020'],
      progress:all=>Object.keys(GAMES).filter(g=>all.some(x=>x.g===g)).length/N_GAMES, test:(r,all)=>Object.keys(GAMES).every(g=>all.some(x=>x.g===g)) },
  { id:'fullset', g:'all', tier:'stretch', name:'Full set',   how:'In one game, every mode at every length', unlocks:['wheel'],
      progress:(all,g)=>fullsetProg(all,g), test:(r,all)=>fullsetProg(all,r.g)===1 },
  // v8: the first "big" unlock — a sound pack that is mostly a joke
  { id:'tour',    g:'all', tier:'stretch', name:'Grand tour',  how:'Finish a run in every mode of every game', unlocks:['snd','sigh'],
      progress:all=>tourProg(all), test:(r,all)=>tourProg(all)===1 },
  // v11: the easter egg. Three taps on the full stop under the top 10. Never earned by a run
  { id:'egg',     g:'all', tier:'secret',  name:'Excuses',     how:'Found the full stop', unlocks:['sq','#FF7A59'], test:()=>false },
  // quick tap — every one is Two or Four, never "any mode" (v6). Four (v9) took Lead's slots; its pads are further apart, so its numbers sit under Two's
  { id:'qt_clean5',  g:'quick-tap', tier:'unlock',  name:'Clean · Sprint · Four', how:'Four · Sprint, no misses, at least 7 hits', unlocks:['sq','#9BE8FF'], at:{d:'four',s:5}, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&r.misses===0&&r.hits>=7 },
  { id:'qt_bclean5', g:'quick-tap', tier:'unlock',  name:'Clean · Sprint · Two',   how:'Two · Sprint, no misses, at least 8 hits', at:{d:'two',s:5}, test:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&r.misses===0&&r.hits>=8 },
  { id:'qt_r4',      g:'quick-tap', tier:'unlock',  name:'Quick',                how:'Four · 3 hits a second, any length', unlocks:['snd','click'], at:{d:'four'}, progress:all=>bestRate(all,'quick-tap',0,'four')/3, test:r=>r.g==='quick-tap'&&r.d==='four'&&rate(r)>=3 },
  { id:'qt_clean15', g:'quick-tap', tier:'unlock',  name:'Clean · Dash',         how:'Four · Dash, no misses, at least 24 hits', unlocks:['bg','rain'], at:{d:'four',s:15}, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&r.misses===0&&r.hits>=24 },
  { id:'qt_clean30', g:'quick-tap', tier:'stretch', name:'Clean · Marathon',     how:'Four · Marathon, no misses, at least 50 hits', unlocks:['sq','#C6FF7A'], at:{d:'four',s:30}, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&r.misses===0&&r.hits>=50 },
  { id:'qt_r5',      g:'quick-tap', tier:'stretch', name:'Quicker',              how:'Four · 4 hits a second across a Dash', unlocks:['lead','#4FD9FF'], at:{d:'four',s:15}, progress:all=>bestRate(all,'quick-tap',15,'four')/4, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=4 },
  { id:'qt_br4',     g:'quick-tap', tier:'stretch', name:'Two quick',            how:'Two · 4 hits a second across a Dash', at:{d:'two',s:15}, progress:all=>bestRate(all,'quick-tap',15,'two')/4, test:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===15&&rate(r)>=4 },
  { id:'qt_eyes',    g:'quick-tap', tier:'stretch', name:'Eyes shut',            how:'Two · clean Marathon, at least 60 hits', unlocks:['lead','#FF4FD8'], at:{d:'two',s:30}, test:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===30&&r.misses===0&&r.hits>=60 },
  { id:'qt_sab',     g:'quick-tap', tier:'stretch', name:'Committed',            how:'Two · a run of nothing but misses, at least five', at:{d:'two'}, test:r=>r.g==='quick-tap'&&r.d==='two'&&r.hits===0&&r.misses>=5 },
  { id:'qt_s5',      g:'quick-tap', tier:'secret',  name:'No excuses',           how:'Four · 5 hits a second on a Sprint', at:{d:'four',s:5}, progress:all=>bestRate(all,'quick-tap',5,'four')/5, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&rate(r)>=5 },
  { id:'qt_s15',     g:'quick-tap', tier:'secret',  name:'Still no excuses',     how:'Four · 5 hits a second, held for a Dash', at:{d:'four',s:15}, progress:all=>bestRate(all,'quick-tap',15,'four')/5, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=5 },
  { id:'qt_s30',     g:'quick-tap', tier:'secret',  name:'Not normal',           how:'Four · 5 hits a second, held for a Marathon', at:{d:'four',s:30}, progress:all=>bestRate(all,'quick-tap',30,'four')/5, test:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&rate(r)>=5 },
  { id:'qt_bs5',     g:'quick-tap', tier:'secret',  name:'Two faith',            how:'Two · 5 hits a second on a Sprint', at:{d:'two',s:5}, progress:all=>bestRate(all,'quick-tap',5,'two')/5, test:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&rate(r)>=5 },
  // dots
  { id:'dt_pin',   g:'dots', tier:'unlock',  name:'Pinpoint',        how:'Lead · a clean Sprint with at least 8 hits', unlocks:['sq','#FFD1DC'], at:{d:'lead',s:5}, test:r=>r.g==='dots'&&r.d==='lead'&&r.s===5&&r.misses===0&&r.hits>=8 },
  { id:'dt_bpin',  g:'dots', tier:'unlock',  name:'Pinpoint · Blind', how:'Blind · a clean Sprint with at least 6 hits', at:{d:'blind',s:5}, test:r=>r.g==='dots'&&r.d==='blind'&&r.s===5&&r.misses===0&&r.hits>=6 },
  { id:'dt_sweep', g:'dots', tier:'unlock',  name:'Sweep',           how:'Lead · 3 hits a second over a Dash', unlocks:['lead','#7CFFB2'], at:{d:'lead',s:15}, progress:all=>bestRate(all,'dots',15,'lead')/3, test:r=>r.g==='dots'&&r.d==='lead'&&r.s===15&&rate(r)>=3 },
  { id:'dt_land',  g:'dots', tier:'stretch', name:'Landing',         how:'Lead · a clean Marathon with at least 45 hits', unlocks:['bg','orbs'], at:{d:'lead',s:30}, test:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&r.misses===0&&r.hits>=45 },
  { id:'dt_blind', g:'dots', tier:'stretch', name:'Homing',          how:'Blind · 3 a second over a Dash', at:{d:'blind',s:15}, progress:all=>bestRate(all,'dots',15,'blind')/3, test:r=>r.g==='dots'&&r.d==='blind'&&r.s===15&&rate(r)>=3 },
  { id:'dt_s',     g:'dots', tier:'secret',  name:'Radar',           how:'Lead · 4.5 a second held for a Marathon', at:{d:'lead',s:30}, progress:all=>bestRate(all,'dots',30,'lead')/4.5, test:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&rate(r)>=4.5 },
  { id:'dt_bs',    g:'dots', tier:'secret',  name:'Sonar',           how:'Blind · 3.5 a second held for a Marathon', at:{d:'blind',s:30}, progress:all=>bestRate(all,'dots',30,'blind')/3.5, test:r=>r.g==='dots'&&r.d==='blind'&&r.s===30&&rate(r)>=3.5 },
  // hold (v11: a Set scores the average % off across 7 rounds — lower is better; a Streak scores rounds)
  { id:'hd_money', g:'hold', tier:'unlock',  name:'On the money', how:'One round within 2.00%', unlocks:['snd','wood'], test:r=>r.g==='hold'&&r.x<=2 },
  { id:'hd_steady',g:'hold', tier:'unlock',  name:'Steady hand',  how:'Grow · a Set averaging under 3% off', unlocks:['sq','#F3D9FF'], at:{d:'grow',s:7}, progress:all=>lowProg(lowTotal(all,'grow',7),3), test:r=>r.g==='hold'&&r.d==='grow'&&r.s===7&&r.hits<=3 },
  { id:'hd_est',   g:'hold', tier:'stretch', name:'Good eye',     how:'Cut · a Set averaging under 4% off', unlocks:['lead','#FFFFFF'], at:{d:'cut',s:7}, progress:all=>lowProg(lowTotal(all,'cut',7),4), test:r=>r.g==='hold'&&r.d==='cut'&&r.s===7&&r.hits<=4 },
  { id:'hd_run',   g:'hold', tier:'stretch', name:'Long haul',    how:'A Streak of 15 rounds, either mode', at:{s:STREAK}, progress:all=>Math.max(0,...all.filter(r=>r.g==='hold'&&r.s===STREAK).map(r=>r.hits))/15, test:r=>r.g==='hold'&&r.s===STREAK&&r.hits>=15 },
  { id:'hd_s',     g:'hold', tier:'secret',  name:'Machine',      how:'Every round of a Set within 4.00%', at:{s:7}, test:r=>r.g==='hold'&&r.s===7&&r.y<=4 },
  // sequence
  { id:'sq_7',   g:'sequence', tier:'unlock',  name:'Seven',      how:'Reach round 7 on any keys', unlocks:['bg','stars'], progress:all=>bestRound(all)/7, test:r=>r.g==='sequence'&&r.hits>=7 },
  { id:'sq_12',  g:'sequence', tier:'stretch', name:'Twelve',     how:'Reach round 12 on any keys', unlocks:['sq','#FFF3A0'], progress:all=>bestRound(all)/12, test:r=>r.g==='sequence'&&r.hits>=12 },
  { id:'sq_7x8', g:'sequence', tier:'stretch', name:'Wide open',  how:'Round 8 on seven keys', at:{s:7}, progress:all=>bestRound(all,7)/8, test:r=>r.g==='sequence'&&r.s===7&&r.hits>=8 },
  { id:'sq_5x10',g:'sequence', tier:'stretch', name:'Ten on five', how:'Round 10 on five keys', at:{s:5}, progress:all=>bestRound(all,5)/10, test:r=>r.g==='sequence'&&r.s===5&&r.hits>=10 },
  { id:'sq_s20', g:'sequence', tier:'secret',  name:'Twenty',     how:'Round 20 on any keys', progress:all=>bestRound(all)/20, test:r=>r.g==='sequence'&&r.hits>=20 },
  { id:'sq_s15', g:'sequence', tier:'secret',  name:'The long one', how:'Round 15 on seven keys', at:{s:7}, progress:all=>bestRound(all,7)/15, test:r=>r.g==='sequence'&&r.s===7&&r.hits>=15 },
  // v7 games — a starter set, no cosmetics attached yet. v11 units: Stopwatch Set = average s, Hidden Set = total px over 10, Flash Set = average ms, Go/No-go Set = ms + penalties
  { id:'tm_close', g:'timing',   tier:'unlock',  name:'Dead on',      how:'Stopwatch · one attempt within 0.10s', at:{d:'stopwatch'}, test:r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.1 },
  { id:'tm_wall',  g:'timing',   tier:'stretch', name:'X-ray',        how:'Hidden · a Set under 300px off in total', at:{d:'hidden',s:10}, test:r=>r.g==='timing'&&r.d==='hidden'&&r.s===10&&r.hits<=300 },
  { id:'tm_run',   g:'timing',   tier:'stretch', name:'Keeps going',  how:'Stopwatch · a Streak of 10 attempts', at:{d:'stopwatch',s:STREAK}, test:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===STREAK&&r.hits>=10 },
  { id:'tm_s',     g:'timing',   tier:'secret',  name:'Metronome',    how:'Stopwatch · a Set averaging under 0.12s', at:{d:'stopwatch',s:5}, test:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===5&&r.hits<=.12 },
  { id:'rx_200',   g:'reaction', tier:'unlock',  name:'Under 200',    how:'Flash · one tap under 200ms', at:{d:'flash'}, test:r=>r.g==='reaction'&&r.d==='flash'&&r.x<200 },
  { id:'rx_clean', g:'reaction', tier:'stretch', name:'Disciplined',  how:'Go / No-go · a Set with no wrong taps', at:{d:'nogo',s:20}, test:r=>r.g==='reaction'&&r.d==='nogo'&&r.s===20&&r.misses===0 },
  { id:'rx_run',   g:'reaction', tier:'stretch', name:'Steady',       how:'Flash · a Streak of 8 attempts', at:{d:'flash',s:STREAK}, test:r=>r.g==='reaction'&&r.d==='flash'&&r.s===STREAK&&r.hits>=8 },
  { id:'rx_s',     g:'reaction', tier:'secret',  name:'Twitch',       how:'Flash · a Set averaging under 180ms', at:{d:'flash',s:3}, test:r=>r.g==='reaction'&&r.d==='flash'&&r.s===3&&r.hits<180 },
  { id:'sp_5',     g:'spot',     tier:'unlock',  name:'Eight',        how:'Count · reach round 8 on Normal', at:{d:'count',s:1}, test:r=>r.g==='spot'&&r.d==='count'&&r.s===1&&r.hits>=8 },
  { id:'sp_15',    g:'spot',     tier:'stretch', name:'Hard twelve',  how:'Count · reach round 12 on Hard', at:{d:'count',s:2}, test:r=>r.g==='spot'&&r.d==='count'&&r.s===2&&r.hits>=12 },
  { id:'sp_fast',  g:'spot',     tier:'unlock',  name:'Spotter',      how:'Find · average under 2.00s', at:{d:'find'}, test:r=>r.g==='spot'&&r.d==='find'&&r.hits<2 },
  { id:'sp_clean', g:'spot',     tier:'stretch', name:'No wrong taps', how:'Find · Marathon, not one wrong tap', at:{d:'find',s:15}, test:r=>r.g==='spot'&&r.d==='find'&&r.s===15&&r.misses===0 },
];
const TIERS = { unlock:['Unlocks','barely a challenge — each opens a customisation'], stretch:['Stretch','harder. bragging rights, a few unlock things'], secret:['Secret','they exist. what earns them is not written down'] };
const got=()=>load('ne.ach',{});
function checkAch(run){ const g=got(); const all=Scores.runs(); const fresh=[]; for(const a of ACH){ if(!g[a.id]&&a.test(run,all)){ g[a.id]=Date.now(); fresh.push(a); } } save('ne.ach',g); return fresh; }
const ITEM_WORD={sq:'target colour',lead:'lead colour',bg:'background',snd:'sound pack',wheel:'colour wheel'};
const BG_NAME={stars:'stars',grid:'grid',rain:'rain',orbs:'orbs'};
function unlockWord(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; if(k==='wheel') return 'unlocks the colour wheel'; if(k==='bg') return 'unlocks '+BG_NAME[v]+' background'; if(k==='snd') return 'unlocks '+v+' sounds'; return 'unlocks '+ITEM_WORD[k]; }
// the same, with the actual colour as a swatch (v8) — "unlocks lead colour" on its own said nothing
function unlockHtml(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; return unlockWord(a)+((k==='sq'||k==='lead')&&v!=='wheel'?`<i class="sw" style="background:${v}"></i>`:''); }
function gotoAch(id){ const a=ACH.find(x=>x.id===id); if(!a) return; F.ach.g=a.g==='all'?'all':a.g; show('s-ach'); const row=$('#ach-'+a.id); if(row){ row.scrollIntoView({block:'center'}); row.classList.add('flash'); } }
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=F.ach.g, seen=load('ne.achseen',0); let k=0;
  $('#ach-g').innerHTML=`<button class="chip" data-chip="ach-g" data-v="all">All</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  const list=ACH.filter(a=>gsel==='all'||a.g===gsel||a.g==='all');
  const fsGame=gsel==='all'?sel.game:gsel;
  $('#achlist').innerHTML = Object.keys(TIERS).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>{
      const isDone=!!g[a.id], secret=a.tier==='secret'&&!isDone;
      const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
      const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
      const bar=p!==null?`<div class="pbar ${secret?'s':''}"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
      const jump=a.g!=='all'||a.id==='fullset';
      const where=jump&&!secret?`<small class="go">→ ${GAMES[a.g==='all'?fsGame:a.g].name}${a.at?.d?' · '+MODE_NAME[a.at.d]:''}${a.at?.s!==undefined?' · '+lenName(a.g,a.at.s,a.at?.d||GAMES[a.g].modes[0]):''}</small>`:'';
      const fresh=isDone&&g[a.id]>seen; const dl=isDone?` style="animation-delay:${Math.min(k++,14)*70}ms"`:'';
      return `<button class="a ${isDone?'done':'lock'} ${fresh?'new':''} ${jump?'jump':''}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${isDone?'✓ ':''}${secret?'???':a.name}${gname}</span><em class="${a.unlocks&&!isDone?'u':''}">${isDone?'done'+(a.unlocks?' · '+unlockHtml(a):''):a.unlocks?unlockHtml(a):secret?'secret':''}</em><small>${secret?(p!==null?'You are '+Math.round(p*100)+'% of the way to something.':'A stretch past the stretch. You will know.'):a.how+(a.id==='fullset'?` · in ${GAMES[fsGame].name}`:'')}</small>${where}${bar}</button>`; }).join(''); }).join('');
  save('ne.achseen',Date.now());
}
function jumpTo(a){ const g=a.g==='all'?(F.ach.g==='all'?sel.game:F.ach.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return askUnlock(g,d); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return askUnlock(g,d,a.at.s); pendingAim=a.how; openSheet(g,a.at?.d,a.at?.s); }
// open the pick sheet on a game (v11), at the mode row or straight at the length row. Used by achievements and the result screen's Back
function openSheet(g,d,s){ const G_=GAMES[g]; sel.game=g; prefs.lastGame=g; save('ne.prefs',prefs); show('s-pick');
  $$('.tile').forEach(t=>t.classList.toggle('keep',t.dataset.game===g)); fillSheet();
  if(!G_.modes.includes(sel.diff)) sel.diff=G_.modes[0]; if(s!==undefined) sel.secs=s;
  if(d||G_.modes.length===1){ sel.diff=d||G_.modes[0]; $$('.choice').forEach(c=>c.classList.toggle('sel',c.dataset.diff===sel.diff)); setStage('len'); fillTimes(); }
  else setStage('mode'); }
let toastT=0;
// toast(msg, achId): an achievement toast is tappable and goes to that row; on the result screen every toast sits low, clear of the score (v8)
function toast(msg,ach,cls){ const t=$('#toast'); clearTimeout(toastT); t.innerHTML=msg; t.dataset.ach=ach||''; t.classList.toggle('tap',!!ach); t.classList.toggle('ok',cls==='ok'); t.classList.add('on'); cls==='ok'?Snd.go():Snd.click(); toastT=setTimeout(()=>t.classList.remove('on'),ach?3200:cls==='ok'?2600:2000); }

/* ---------- verdicts: tiered by a per-game quality 0..1 ---------- */
const VERDICTS={
  'quick-tap':['Warming up. Go again.','Solid. Now stop looking, start moving.','Quick. The next tier is close.','Sharp. Very sharp.','That is not normal. Keep it.'],
  'dots':['Finding the screen. Go again.','Landing them. Faster now.','Quick hands.','Sharp. Very sharp.','Radar. That is not normal.'],
  'hold':['Nowhere near. Feel the rate, not the shape.','Close-ish. Trust the count.','Good eye.','Machine-adjacent.','That is not normal. Keep it.'],
  'hold:cut':['Way off. Look at the whole shape first.','Getting there. Think in halves.','Good eye.','Surgical.','That is not normal. Keep it.'],
  'sequence':['Short memory. Go again.','Building. Say it out loud.','Long memory.','Very long memory.','That is not normal. Keep it.'],
  'timing':['Way off. Count it out loud.','Getting the rhythm.','Good clock.','Very good clock.','That is not normal. Keep it.'],
  'reaction':['Asleep. Go again.','Awake.','Quick.','Very quick.','That is not normal. Keep it.'],
  'spot:count':['Guessing. Slow down.','Half of them. Look at the whole screen.','Good eye.','Nearly all of them.','That is not normal. Keep it.'],
  'spot:find':['Slow. Scan, do not stare.','Finding them.','Quick eye.','Very quick eye.','That is not normal. Keep it.'],
};
function verdict(r){
  if(r.fail) return r.g==='reaction'&&r.d==='nogo'?'Three wrong taps. Run over — go again.':'Run over — go again.';
  if(GAMES[r.g].timed){ if(r.hits===0) return 'Nothing landed. That was a choice.'; if(r.misses>r.hits) return 'More misses than hits. You know what you did.'; }
  const q=GC(r.g,r.d,r.s).quality(r); const i=q>=1?4:q>=.75?3:q>=.5?2:q>=.25?1:0; return (VERDICTS[r.g+':'+r.d]||VERDICTS[r.g])[i];
}

function setPendingAim(v){ pendingAim=v; }


export { ACH, BG_NAME, INTRO, ITEM_WORD, SCALES, Scores, TIERS, UNLOCKS, VERDICTS, askUnlock, bestRate, bestRound, checkAch, checkUnlocks, fullsetProg, gameOpen, goWhere, goalFor, got, gotoAch, isOpen, jumpTo, lenLock, lenOpen, lensOf, liveCheck, lockGo, lowProg, lowTotal, needFor, nextGoal, openSheet, pendingAim, rate, renderAch, setPendingAim, toast, toastT, tourProg, unlockHtml, unlockName, unlockToast, unlockWord, unlocked, verdict };
