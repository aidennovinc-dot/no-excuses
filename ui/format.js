/* No Excuses — how a score is shown (build 16, refactor stage 2). The formatters that used to sit inside the GAMES table:
   the score's number format (FMT), the two board columns (COLS) and the mode picture (PIC), keyed by game id with the
   same overlays the data has — 'g', 'g:d', 'g:streak', 'g:d:streak' (GV in games/registry.js resolves them). No DOM. */
import { SHEET } from "../config/copy.js";
import { GC, GV } from "../games/registry.js";
import { f2 } from "../core.js";

const same=v=>v, int=v=>String(Math.round(v)), str=v=>String(v);
// the score's number: a Set's unit per game and mode; every Streak is a count of rounds
const FMT = { streak:str, 'hold':f2, 'timing':f2, 'timing:hidden':int, 'reaction':int, 'spot':int, 'spot:find':f2 };
// the two extra columns on a board and the result screen: [heading, cell(run)]
const COLS = {
  'quick-tap':[['misses',r=>r.misses],['hits / sec',r=>(r.hits/r.s).toFixed(1)]],
  'dots':[['misses',r=>r.misses],['hits / sec',r=>(r.hits/r.s).toFixed(1)]],
  'hold':[['best round',r=>f2(r.x)+'%'],['worst round',r=>f2(r.y)+'%']], 'hold:streak':[['best round',r=>f2(r.x)+'%'],['worst round',r=>f2(r.y)+'%']],
  'sequence':[['scale',r=>r.sc||'penta'],['practice',r=>r.practice?'from '+r.practice:'—']],
  'timing':[['best try',r=>f2(r.x)+'s'],['worst try',r=>f2(r.y)+'s']], 'timing:streak':[['best try',r=>f2(r.x)+'s'],['worst try',r=>f2(r.y)+'s']],
  // v18 (B.4): Hidden's columns are milliseconds, like its score
  'timing:hidden':[['best try',r=>Math.round(r.x)+'ms'],['worst try',r=>Math.round(r.y)+'ms']], 'timing:hidden:streak':[['best try',r=>Math.round(r.x)+'ms'],['worst try',r=>Math.round(r.y)+'ms']],
  'reaction':[['false starts',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']], 'reaction:streak':[['false starts',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']],
  'reaction:nogo':[['wrong taps',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']], 'reaction:nogo:streak':[['wrong taps',r=>r.misses],['best try',r=>Math.round(r.x)+'ms']],
  'spot':[['worst round',r=>r.y!==undefined?r.y:'—'],['best flash',r=>r.x?Math.round(r.x)+'ms':'—']], 'spot:streak':[['limit',r=>r.lim||'5 miscounts'],['best flash',r=>r.x?Math.round(r.x)+'ms':'—']],
  'spot:find':[['wrong taps',r=>r.misses],['best find',r=>f2(r.x)+'s']], 'spot:find:streak':[['limit',r=>r.lim||'10s'],['best find',r=>f2(r.x)+'s']],
  // the Streak default, if a game ever has a Streak without its own columns
  streak:[['limit',r=>r.lim||''],['worst',r=>r.yTxt||'']],
};
// the little picture on a mode button, by game and mode
const PIC = {
  'quick-tap':d=>d==='four'?`<span class="mini four"><i></i><i class="w"></i><i></i><i></i></span>`:`<span class="mini"><i class="w"></i><i></i></span>`,
  'dots':d=>`<span class="mini dots"><i class="w"></i><i class="${d==='lead'?'r':''}"></i></span>`,
  'hold':d=>d==='cut'?`<span class="mini cut"><i></i><i class="ln"></i><b>53.5% · close!</b></span>`:`<span class="mini hold"><i></i><i class="w"></i></span>`,
  'sequence':()=>`<span class="mini seq"><i></i><i></i><i></i></span>`,
  'timing':d=>d==='hidden'?`<span class="mini tmh"><i class="b"></i><i class="wall"></i><i class="m"></i></span>`:`<span class="mini tmw"><i>7.00</i><i class="u">you <b>7.14</b></i></span>`,
  'reaction':d=>d==='nogo'?`<span class="mini nogo"><i class="c" style="border-radius:50%"></i><i class="x" style="clip-path:none"></i></span>`:`<span class="mini rx"></span>`,
  'spot':d=>d==='count'?`<span class="mini ct"><i class="w c"></i><i class="t"></i><i class="w c"></i><i class="w c"></i></span>`:`<span class="mini fd"><i></i><i class="t"></i><i></i><i class="w c"></i><i class="t"></i><i></i></span>`,
};

const fmtOf=(g,d,s)=>GV(FMT,g,d,s,same);
const fmtScore=(g,v,d,s)=>fmtOf(g,d,s)(v);
const scoreTxt=(g,v,d,s)=>fmtScore(g,v,d,s)+(GC(g,d,s).suffix||'');
const colsOf=(g,d,s)=>GV(COLS,g,d,s,COLS.streak);
const picOf=(g,d)=>(PIC[g]||(()=>''))(d);
/* the Go button's face (v10): versus, or plain Go — the same on the pick sheet and the result screen (build 18: shared here).
   v15 (6.5, build 26): pass & play says just "Go", for every game. It used to read "Go · 10s each" on Quick Tap and Dots
   and "Go · pass & play" on the five that share a run — a length on a button whose own length row is hidden, and a label
   naming the mode the player had just picked two chips ago. SHEET.goEach and SHEET.goPass are retired with it. */
const goLabel=(g,d,versus)=>versus?SHEET.goVersus:SHEET.go;

export { COLS, FMT, PIC, colsOf, fmtOf, fmtScore, goLabel, picOf, scoreTxt };
