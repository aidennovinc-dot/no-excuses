/* No Excuses — the scores screen (build 18, refactor stage 4; was renderBoard / renderRadar / rows in menu.js, and the
   name field from boot.js). The profile name and the radar on top, the local top 10 under three rows of chips. The
   filter follows the run just finished (run:finish), and the run just played is marked in its row. */
import { BOARD, RESULT, TOAST } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T } from "../../core.js";
import { on } from "../../core/events.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { ACH, Scores, got, lensOf, tierOf, unlockHtml } from "../../progress.js";
import { RADAR_PAST, radarOf, radarRungs } from "../../progress/key.js";
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { colsOf, fmtScore } from "../format.js";
import { register } from "../router.js";
import { toast } from "../toast.js";

const F={ g:prefs.lastGame, d:GAMES[prefs.lastGame].modes[0], s:5 };
let curT=null;   // the run just played, marked in its row
// v18 (B.10): the run just played wears its tier colour on its score here too, so the number Aiden watched turn blue on
// the result screen is the same colour on the board he lands on next. Solo only by construction — L10 keeps every
// two-player run off a board, and a practice run is never submitted
function rows(g,d,s,list){ const cfg=GC(g,d,s), c=colsOf(g,d,s); return list.length ? list.map((r,i)=>{ const tc=r.t===curT?tierOf(r):null;
  return `<tr class="${i===0&&(r.hits>0||cfg.lower)?'best':''} ${r.t===curT?'cur':''}"><td>${i+1}</td><td></td><td${tc?` style="color:${tc.col}"`:''}>${fmtScore(g,r.hits,d,s)}</td><td>${c[0][1](r)}</td><td>${c[1][1](r)}</td><td>${new Date(r.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'2-digit'})}</td></tr>`; }).join('') : `<tr><td colspan="6">${RESULT.noRuns}</td></tr>`; }
/* the profile radar (v9): one axis per game, your best in any mode and length of it.
   v14 (8.6): 1.0 — the outer ring — was the AUTHOR's record, with quality() as the fallback while AUTHOR_RECORDS was empty.
   v18 (B.24, build 32): THE RUNGS ARE THE KEY'S THREE TIERS, read from progress/key.js (radarOf / radarRungs) — rung 1 is
   the clearance bar, rung 2 the Pro bar, rung 3 the Author time — and a score past the Author time pushes the vertex out
   to RADAR_PAST with a little flame on it. Before chest 1 there is ONE rung, key 1 at the outer ring, and nothing beyond
   it (A.1): the web is drawn to a single rung and the flame never appears. A shell tier (its column in key-bars.js not
   yet full) is a DASHED rung at no value — never a number (A.2) — and no axis can climb past it. */
function renderRadar(){ const ids=Object.keys(GAMES), n=ids.length, C=100, R=88;
  const rungs=radarRungs(); const one=rungs.length===1;
  const axes=ids.map(g=>radarOf(g)); const vals=axes.map(a=>Math.min(RADAR_PAST,Math.max(0,a.v)));
  const pt=(i,k)=>{ const a=-Math.PI/2+i/n*2*Math.PI; return [C+Math.cos(a)*R*k,C+Math.sin(a)*R*k]; }; const P=k=>ids.map((_,i)=>pt(i,k).map(v=>v.toFixed(1)).join(',')).join(' ');
  // the web: before chest 1 the quarter rings under one rung, as v9 drew them; after it, one polygon per rung, dashed where the tier is a shell
  const web=one?[.25,.5,.75,1].map(k=>`<polygon class="web" points="${P(k)}"/>`).join('')
    :rungs.map(r=>`<polygon class="web rung${r.shell?' shell':''}" data-rung="${r.tier}" points="${P(r.at)}"/>`).join('');
  const flame=(i)=>{ const [x,y]=pt(i,vals[i]); return `<g class="flame" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M0 2c-3-3-2-7 0-9 0 3 3 3 3 6a3 3 0 0 1-6 0c0-1 1-2 3-3z"/></g>`; };
  $('#radar').innerHTML=web+ids.map((_,i)=>{ const [x,y]=pt(i,1); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')
    +`<polygon class="me${vals.some(v=>v>1)?' past':''}" points="${ids.map((_,i)=>pt(i,Math.max(.03,vals[i])).map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`+ids.map((_,i)=>{ const [x,y]=pt(i,Math.max(.03,vals[i])); return `<circle class="${vals[i]>1?'past':''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"/>`; }).join('')
    +ids.map((_,i)=>vals[i]>1?flame(i):'').join('')
    +ids.map((g,i)=>{ const [x,y]=pt(i,1.19); return `<text class="${vals[i]>1?'past':''}" x="${x.toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="middle">${GAMES[g].name} ${Math.round(vals[i]*100)}</text>`; }).join('');
  $('#radar').classList.toggle('tiers',!one); }
function renderBoard(){ $('#pstar').textContent=prefs.supporter?'★':''; const g=F.g; if(!GAMES[g].modes.includes(F.d)) F.d=GAMES[g].modes[0]; const lens=lensOf(g,F.d); if(!lens.includes(F.s)) F.s=lens[0];
  $('#bd-g').innerHTML=Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-bd" data-chip="bd-g" data-v="${id}">${x.name}</button>`).join('');
  $('#bd-d').innerHTML=GAMES[g].modes.length>1?GAMES[g].modes.map(d=>`<button class="chip" data-act="chip-bd" data-chip="bd-d" data-v="${d}">${MODE_NAME[d]}</button>`).join(''):'';
  $('#bd-s').innerHTML=lens.length>1?lens.map(s=>`<button class="chip" data-act="chip-bd" data-chip="bd-s" data-v="${s}">${lenName(g,s,F.d)}</button>`).join(''):'';
  chips('bd','g',g); chips('bd','d',F.d); chips('bd','s',F.s);
  const cfg=GC(g,F.d,F.s), c=colsOf(g,F.d,F.s); $('#runs-h').innerHTML=`<tr><th>${BOARD.rank}</th><th></th><th>${cfg.scoreWord||BOARD.score}${cfg.lower?BOARD.lowerMark:''}</th><th>${c[0][0]}</th><th>${c[1][0]}</th><th>${BOARD.date}</th></tr>`;
  $('#runs').innerHTML=rows(g,F.d,F.s,Scores.of(g,F.d,F.s).slice(0,10)); }

register('s-board',{ onShow(){ renderBoard(); renderRadar(); } });
define({ 'chip-bd'(b){ const key=b.dataset.chip.split('-')[1]; const v=isNaN(b.dataset.v)?b.dataset.v:+b.dataset.v; F[key]=v;
  if(key==='g'){ F.d=GAMES[v].modes[0]; F.s=GC(v,F.d).lens[0]; } if(key==='d'){ F.s=GC(F.g,v).lens[0]; } renderBoard(); return 'pick'; } });
on('run:record',({run})=>{ curT=run.t; });
on('run:finish',({run})=>{ F.g=run.g; F.d=run.d; F.s=run.s; });
on('store:reset',()=>{ curT=null; });
// the name: typed on the board, kept upper-case, ten characters. Signed in is earned the moment a name goes in (v8)
$('#pname').value=prefs.name;
$('#pname').addEventListener('input',e=>{ prefs.name=e.target.value.trim().toUpperCase().slice(0,10); save();
  if(prefs.name&&!got().named){ got().named=Date.now(); save(); const a=ACH.find(x=>x.id==='named'); toast(T(TOAST.achievement,{name:a.name})+' · '+unlockHtml(a),a.id,'',true); } });
$('#pname').addEventListener('click',e=>e.stopPropagation());
