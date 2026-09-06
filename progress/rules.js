/* No Excuses — the predicates behind the progress tables (build 16, refactor stage 2).
   config/unlocks.js and config/achievements.js hold the data; this file holds the function for each row under the same
   key or id: UNLOCK_TEST[key], LEN_TEST[game][i], ACH_TEST[id], ACH_PROGRESS[id]. QUALITY[game] is the 0..1 that picks
   a verdict and draws the radar, keyed like ui/format.js ('g', 'g:d', 'g:streak', 'g:d:streak'). progress.js joins them. */
import { STREAK } from "../config/games.js";
import { prefs } from "../core/store.js";
import { GAMES, GC, GV, N_GAMES } from "../games/registry.js";

const rate=r=>r.hits/r.s;
const bestRate=(all,g,s,d)=>Math.max(0,...all.filter(r=>r.g===g&&(!s||r.s===s)&&(!d||r.d===d)).map(rate));
const bestRound=(all,keys)=>Math.max(0,...all.filter(r=>r.g==='sequence'&&(!keys||r.s===keys)).map(r=>r.hits));
const lowTotal=(all,d,s)=>{ const v=all.filter(r=>r.g==='hold'&&(!d||r.d===d)&&(!s||r.s===s)).map(r=>r.hits); return v.length?Math.min(...v):null; };
const lowProg=(v,target)=>v===null?0:Math.min(1,target/Math.max(v,target));
const tourProg=all=>{ const cells=Object.entries(GAMES).flatMap(([g,x])=>x.modes.map(d=>all.some(r=>r.g===g&&r.d===d))); return cells.filter(Boolean).length/cells.length; };
const fullsetProg=(all,g)=>{ const G_=GAMES[g]; const cells=G_.modes.flatMap(d=>GC(g,d).lens.map(s=>all.some(x=>x.g===g&&x.d===d&&x.s===s))); return cells.filter(Boolean).length/cells.length; };

/* ---------- the unlock chain (L6): one predicate per UNLOCKS key ---------- */
const UNLOCK_TEST = {
  'quick-tap:four':    r=>r.g==='quick-tap'&&r.s===15&&r.misses===0&&r.hits>=9,
  'dots:blind':        r=>r.g==='quick-tap'&&r.hits>=30,
  'dots:lead':         r=>r.g==='dots'&&r.s===5&&r.misses===0&&r.hits>=6,
  'hold:grow':         r=>r.g==='dots'&&r.hits>=2*r.s,
  'hold:cut':          r=>r.g==='hold'&&r.d==='grow'&&r.x<=15,
  'sequence:solo':     r=>r.g==='hold'&&r.d==='cut'&&r.x<=.5,
  'sequence:practice': r=>r.g==='sequence'&&r.s===7&&r.hits>=8,
  'timing:stopwatch':  r=>r.g==='sequence'&&r.s===7&&r.hits>=6,
  'timing:hidden':     r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.3,
  'reaction:flash':    r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===STREAK&&r.hits>=6,
  'reaction:nogo':     r=>r.g==='reaction'&&r.d==='flash'&&r.s===3&&r.hits<=300,
  'spot:count':        r=>r.g==='reaction',
  'spot:find':         r=>r.g==='spot'&&r.d==='count'&&(r.rounds||0)>=5,
};
// length locks: the test for LEN_RULES[game][i], run over the previous length's runs
const LEN_TEST = {
  'quick-tap':[null, r=>r.misses===0&&r.hits>=7, r=>r.hits>=20],
  'dots':     [null, r=>r.misses===0&&r.hits>=7, r=>r.hits>=35],
  'sequence': [null, r=>r.s===3&&r.hits>=6,      r=>r.s===5&&r.hits>=6],
};

/* ---------- achievements: test(run, allRuns) per id; progress(allRuns, game) 0..1 for the bar where one exists ---------- */
const ACH_TEST = {
  first:()=>true, named:()=>!!prefs.name, every:(r,all)=>Object.keys(GAMES).every(g=>all.some(x=>x.g===g)), fullset:(r,all)=>fullsetProg(all,r.g)===1, tour:(r,all)=>tourProg(all)===1, egg:()=>false,
  qt_clean5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&r.misses===0&&r.hits>=7,
  qt_bclean5:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&r.misses===0&&r.hits>=8,
  qt_r4:r=>r.g==='quick-tap'&&r.d==='four'&&rate(r)>=3,
  qt_clean15:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&r.misses===0&&r.hits>=24,
  qt_clean30:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&r.misses===0&&r.hits>=50,
  qt_r5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=4,
  qt_br4:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===15&&rate(r)>=4,
  qt_eyes:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===30&&r.misses===0&&r.hits>=60,
  qt_sab:r=>r.g==='quick-tap'&&r.d==='two'&&r.hits===0&&r.misses>=5,
  qt_s5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&rate(r)>=5,
  qt_s15:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=5,
  qt_s30:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&rate(r)>=5,
  qt_bs5:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&rate(r)>=5,
  dt_pin:r=>r.g==='dots'&&r.d==='lead'&&r.s===5&&r.misses===0&&r.hits>=8,
  dt_bpin:r=>r.g==='dots'&&r.d==='blind'&&r.s===5&&r.misses===0&&r.hits>=6,
  dt_sweep:r=>r.g==='dots'&&r.d==='lead'&&r.s===15&&rate(r)>=3,
  dt_land:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&r.misses===0&&r.hits>=45,
  dt_blind:r=>r.g==='dots'&&r.d==='blind'&&r.s===15&&rate(r)>=3,
  dt_s:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&rate(r)>=4.5,
  dt_bs:r=>r.g==='dots'&&r.d==='blind'&&r.s===30&&rate(r)>=3.5,
  hd_money:r=>r.g==='hold'&&r.x<=2,
  hd_steady:r=>r.g==='hold'&&r.d==='grow'&&r.s===7&&r.hits<=3,
  hd_est:r=>r.g==='hold'&&r.d==='cut'&&r.s===7&&r.hits<=4,
  hd_run:r=>r.g==='hold'&&r.s===STREAK&&r.hits>=15,
  hd_s:r=>r.g==='hold'&&r.s===7&&r.y<=4,
  sq_7:r=>r.g==='sequence'&&r.hits>=7, sq_12:r=>r.g==='sequence'&&r.hits>=12, sq_7x8:r=>r.g==='sequence'&&r.s===7&&r.hits>=8, sq_5x10:r=>r.g==='sequence'&&r.s===5&&r.hits>=10,
  sq_s20:r=>r.g==='sequence'&&r.hits>=20, sq_s15:r=>r.g==='sequence'&&r.s===7&&r.hits>=15,
  tm_close:r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.1, tm_wall:r=>r.g==='timing'&&r.d==='hidden'&&r.s===10&&r.hits<=300,
  tm_run:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===STREAK&&r.hits>=10, tm_s:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===5&&r.hits<=.12,
  rx_200:r=>r.g==='reaction'&&r.d==='flash'&&r.x<200, rx_clean:r=>r.g==='reaction'&&r.d==='nogo'&&r.s===20&&r.misses===0,
  rx_run:r=>r.g==='reaction'&&r.d==='flash'&&r.s===STREAK&&r.hits>=8, rx_s:r=>r.g==='reaction'&&r.d==='flash'&&r.s===3&&r.hits<180,
  sp_5:r=>r.g==='spot'&&r.d==='count'&&r.s===STREAK&&r.hits>=8, sp_15:r=>r.g==='spot'&&r.d==='count'&&r.s===10&&r.hits<=2,
  sp_fast:r=>r.g==='spot'&&r.d==='find'&&r.s===10&&r.hits<20, sp_clean:r=>r.g==='spot'&&r.d==='find'&&r.s===10&&r.misses===0,
};
const ACH_PROGRESS = {
  every:all=>Object.keys(GAMES).filter(g=>all.some(x=>x.g===g)).length/N_GAMES, fullset:(all,g)=>fullsetProg(all,g), tour:all=>tourProg(all),
  qt_r4:all=>bestRate(all,'quick-tap',0,'four')/3, qt_r5:all=>bestRate(all,'quick-tap',15,'four')/4, qt_br4:all=>bestRate(all,'quick-tap',15,'two')/4,
  qt_s5:all=>bestRate(all,'quick-tap',5,'four')/5, qt_s15:all=>bestRate(all,'quick-tap',15,'four')/5, qt_s30:all=>bestRate(all,'quick-tap',30,'four')/5, qt_bs5:all=>bestRate(all,'quick-tap',5,'two')/5,
  dt_sweep:all=>bestRate(all,'dots',15,'lead')/3, dt_blind:all=>bestRate(all,'dots',15,'blind')/3, dt_s:all=>bestRate(all,'dots',30,'lead')/4.5, dt_bs:all=>bestRate(all,'dots',30,'blind')/3.5,
  hd_steady:all=>lowProg(lowTotal(all,'grow',7),3), hd_est:all=>lowProg(lowTotal(all,'cut',7),4), hd_run:all=>Math.max(0,...all.filter(r=>r.g==='hold'&&r.s===STREAK).map(r=>r.hits))/15,
  sq_7:all=>bestRound(all)/7, sq_12:all=>bestRound(all)/12, sq_7x8:all=>bestRound(all,7)/8, sq_5x10:all=>bestRound(all,5)/10, sq_s20:all=>bestRound(all)/20, sq_s15:all=>bestRound(all,7)/15,
  sp_5:all=>Math.max(0,...all.filter(r=>r.g==='spot'&&r.d==='count'&&r.s===STREAK).map(r=>r.hits))/8,
};

/* ---------- quality 0..1 per game, mode and length: picks the verdict tier and draws the radar. Every lower-is-better one runs 1 − score/limit ---------- */
const QUALITY = {
  'quick-tap':r=>r.hits/r.s/(r.d==='four'?5:6), 'dots':r=>r.hits/r.s/4.5, 'hold':r=>1-Math.min(1,r.hits/12), 'sequence':r=>r.hits/16,
  'timing':r=>1-Math.min(1,r.hits/1), 'timing:hidden':r=>1-Math.min(1,r.hits/800),
  'reaction':r=>1-Math.min(1,Math.max(0,r.hits-150)/350), 'reaction:nogo':r=>1-Math.min(1,Math.max(0,r.hits-250)/500),
  'spot':r=>1-Math.min(1,r.hits/12), 'spot:find':r=>1-Math.min(1,Math.max(0,r.hits-8)/22),
  'streak':r=>Math.min(1,r.hits/12), 'reaction:nogo:streak':r=>Math.min(1,r.hits/40),
};
const quality=(g,d,s,r)=>GV(QUALITY,g,d,s,()=>0)(r);

export { ACH_PROGRESS, ACH_TEST, LEN_TEST, QUALITY, UNLOCK_TEST, bestRate, bestRound, fullsetProg, lowProg, lowTotal, quality, rate, tourProg };
