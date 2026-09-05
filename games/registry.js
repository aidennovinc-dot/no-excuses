/* No Excuses — the GAMES registry and its config accessors — a new game is one entry here plus an engine
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { LEN_NAME, STREAK, STREAK_CFG, f2 } from "../core.js";
const GAMES = {
  // v9: every mode line says what to DO, first. Quick Tap lost Lead and gained Four (a 2×2 of pads). v11: Blind is Two
  // pro (v10): one extra length per game for supporters — its own board, never part of an achievement
  'quick-tap': { name:'Quick Tap', modes:['two','four'], lens:[5,15,30], pro:60, unit:'s', lenWord:'how long', timed:true, versus:true,
    two:'Tap the white square when it appears.', four:'Four squares. Tap the white one.',
    pic:d=>d==='four'?`<span class="mini four"><i></i><i class="w"></i><i></i><i></i></span>`:`<span class="mini"><i class="w"></i><i></i></span>`,
    cols:[['misses',r=>r.misses],['hits / sec',r=>(r.hits/r.s).toFixed(1)]], quality:r=>r.hits/r.s/(r.d==='four'?5:6) },
  'dots': { name:'Dots', modes:['blind','lead'], lens:[5,15,30], pro:60, unit:'s', lenWord:'how long', timed:true, lead:true, versus:true,
    blind:'Tap the dots where they land.', lead:'Tap the dots. Red shows the next one.',
    pic:d=>`<span class="mini dots"><i class="w"></i><i class="${d==='lead'?'r':''}"></i></span>`,
    cols:[['misses',r=>r.misses],['hits / sec',r=>(r.hits/r.s).toFixed(1)]], quality:r=>r.hits/r.s/4.5 },
  // Estimate (v9, was Hold). v11: Set = 7 rounds, score the average % difference (lower wins); Streak = endless, the differences add up, the run ends at 100%, score rounds
  'hold': { name:'Estimate', modes:['grow','cut'], lens:[7,STREAK], lenNames:{7:'Set',[STREAK]:'Streak'}, lenSubs:{7:'7 rounds · average % off',[STREAK]:'until the total reaches 100%'}, unit:' rounds', lenWord:'how', timed:false, lower:true, lead:true,
    grow:'Hold to grow your shape to the same area.', cut:'Draw a line that cuts off the share asked.',
    pic:d=>d==='cut'?`<span class="mini cut"><i></i><i class="ln"></i><b>53.5% · close!</b></span>`:`<span class="mini hold"><i></i><i class="w"></i></span>`,
    fmt:v=>f2(v), suffix:'%', scoreWord:'% off', cols:[['best round',r=>f2(r.x)+'%'],['worst round',r=>f2(r.y)+'%']], quality:r=>1-Math.min(1,r.hits/12),
    streak:Object.assign({},STREAK_CFG,{cols:[['best round',r=>f2(r.x)+'%'],['worst round',r=>f2(r.y)+'%']]}) },
  'sequence': { name:'Sequence', modes:['solo'], lens:[3,5,7], unit:' keys', lenWord:'how many keys', timed:false, versus:true,
    solo:'Watch the notes, then play them back.', pic:()=>`<span class="mini seq"><i></i><i></i><i></i></span>`,
    cols:[['scale',r=>r.sc||'penta'],['practice',r=>r.practice?'from '+r.practice:'—']], quality:r=>r.hits/16 },
  // v7 — four new games. v11: Set / Streak per mode; every timing figure is an absolute difference
  'timing': { name:'Timing', modes:['stopwatch','hidden'], lens:[5,STREAK], lenNames:{5:'Set',10:'Set',[STREAK]:'Streak'}, lenSubs:{5:'5 attempts · average s off',10:'10 runs · total px off',[STREAK]:'until one is more than 2.0s off'}, unit:' attempts', lenWord:'how', timed:false, lower:true, lead:true,
    stopwatch:'Tap when you think the time is right.', hidden:'Tap when the ball has reached the marker.',
    pic:d=>d==='hidden'?`<span class="mini tmh"><i class="b"></i><i class="wall"></i><i class="m"></i></span>`:`<span class="mini tmw"><i>7.00</i><i class="u">you <b>7.14</b></i></span>`,
    fmt:v=>f2(v), suffix:'s', scoreWord:'s off', cols:[['best try',r=>f2(r.x)+'s'],['worst try',r=>f2(r.y)+'s']], quality:r=>1-Math.min(1,r.hits/1),
    streak:Object.assign({},STREAK_CFG,{cols:[['best try',r=>f2(r.x)+'s'],['worst try',r=>f2(r.y)+'s']]}),
    // hidden (v10) is scored in pixels off the marker, not seconds. v11: Set is 10 runs, total px
    per:{ hidden:{ lens:[10,STREAK], lenSubs:{10:'10 runs · total px off',[STREAK]:'until one is more than 150px off'}, fmt:v=>String(Math.round(v)), suffix:'px', scoreWord:'px off', cols:[['best try',r=>Math.round(r.x)+'px'],['worst try',r=>Math.round(r.y)+'px']], quality:r=>1-Math.min(1,r.hits/800),
      streak:Object.assign({},STREAK_CFG,{cols:[['best try',r=>Math.round(r.x)+'px'],['worst try',r=>Math.round(r.y)+'px']]}) } } },
  'reaction': { name:'Reaction', modes:['flash','nogo'], lens:[3,STREAK], lenNames:{3:'Set',20:'Set',[STREAK]:'Streak',5:'Best of 5',9:'Best of 9',15:'Best of 15'}, lenSubs:{3:'3 attempts · average ms',20:'20 shapes · ms + 150 per wrong tap',[STREAK]:'ms over 200 add up · ends at 500'}, unit:' attempts', lenWord:'how', timed:false, lower:true, versus:['flash'], vsLens:[5,9,15],
    flash:'Tap the moment it flashes white.', nogo:'Tap only your shape. Three wrong taps end it.',
    pic:d=>d==='nogo'?`<span class="mini nogo"><i class="c" style="border-radius:50%"></i><i class="x" style="clip-path:none"></i></span>`:`<span class="mini rx"></span>`,
    fmt:v=>String(Math.round(v)), suffix:'ms', scoreWord:'ms', cols:[['false starts',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']], quality:r=>1-Math.min(1,Math.max(0,r.hits-150)/350),
    streak:Object.assign({},STREAK_CFG,{cols:[['false starts',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']]}),
    // Go/No-go (v11): Set = 20 shapes, average ms on right taps + 150ms per wrong tap; Streak = shapes survived until three wrong taps
    per:{ nogo:{ lens:[20,STREAK], lenSubs:{20:'20 shapes · ms + 150 per wrong tap',[STREAK]:'shapes until three wrong taps'}, cols:[['wrong taps',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']], quality:r=>1-Math.min(1,Math.max(0,r.hits-250)/500),
      streak:Object.assign({},STREAK_CFG,{scoreWord:'shapes',cols:[['wrong taps',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']],quality:r=>Math.min(1,r.hits/40)}) } } },
  // v8: Count and Find merged into Spot. v11: Count is Normal/Hard, rounds until three mistakes; Find keeps its round counts as Sprint/Dash/Marathon
  'spot': { name:'Spot', modes:['count','find'], lens:[1,2], lenNames:{1:'Normal',2:'Hard',5:'Sprint',10:'Dash',15:'Marathon'}, lenSubs:{1:'2–4 shapes to start · until 3 mistakes',2:'starts where Normal’s round 8 sits',5:'5 rounds',10:'10 rounds',15:'15 rounds'}, unit:' rounds', lenWord:'difficulty', timed:false,
    count:'Count the shapes flashed. Ignore the decoys.', find:'Tap the odd one out.',
    pic:d=>d==='count'?`<span class="mini ct"><i class="w c"></i><i class="t"></i><i class="w c"></i><i class="w c"></i></span>`:`<span class="mini fd"><i></i><i class="t"></i><i></i><i class="w c"></i><i class="t"></i><i></i></span>`,
    suffix:'', scoreWord:'rounds', cols:[['wrong',r=>r.misses],['best flash',r=>r.x?Math.round(r.x)+'ms':'—']], quality:r=>Math.min(1,r.hits/(r.s===2?10:16)),
    per:{ find:{ lens:[5,10,15], lenWord:'how many rounds', lower:true, fmt:v=>f2(v), suffix:'s', scoreWord:'s per find', cols:[['wrong taps',r=>r.misses],['best try',r=>f2(r.x)+'s']], quality:r=>1-Math.min(1,Math.max(0,r.hits-1)/5) } } },
};
const N_GAMES=Object.keys(GAMES).length;
// a game's config for one mode and length (v11): `per` overrides by mode, `streak` overrides by length. GC(g,d) without a length is the Set config
const GC=(g,d,s)=>{ const G_=GAMES[g]; let c=G_.per&&G_.per[d]?Object.assign({},G_,G_.per[d]):G_; if(s===STREAK&&c.streak) c=Object.assign({},c,c.streak); return c; };
const scoreTxt=(g,v,d,s)=>{ const c=GC(g,d,s); return (c.fmt?c.fmt(v):v)+(c.suffix||''); };
// length faces (v11): the name everywhere, the seconds only on the pick sheet
const lenName=(g,s,d)=>{ const c=GC(g,d); if(g==='sequence') return s+' keys'; if(c.timed) return LEN_NAME[s]||s+'s'; if(c.lenNames&&c.lenNames[s]) return c.lenNames[s]; return s+c.unit; };
const lenSub=(g,s,d)=>{ const c=GC(g,d); if(c.timed) return s+'s'; if(c.lenSubs&&c.lenSubs[s]) return c.lenSubs[s]; return ''; };
const lenLabel=(g,s,d)=>lenName(g,s,d);
const lenFull=(g,s,d)=>{ const n=lenName(g,s,d), sub=lenSub(g,s,d); return sub&&GC(g,d).timed?`${n} · ${sub}`:n; };
// versus exists for a game, or for some of its modes (v11)
const versusOf=(g,d)=>{ const v=GAMES[g].versus; return v===true||(Array.isArray(v)&&v.includes(d)); };
// two-player runs the engine handles on one screen (v11): Sequence and Count. Everything else passes the phone through VS
const SHARED2=(g,d)=>g==='sequence'||(g==='spot'&&d==='count');

export { GAMES, GC, N_GAMES, SHARED2, lenFull, lenLabel, lenName, lenSub, scoreTxt, versusOf };
