/* No Excuses — the scores screen (build 18, refactor stage 4; was renderBoard / renderRadar / rows in menu.js, and the
   name field from boot.js). The profile name and the radar on top, the local top 10 under three rows of chips. The
   filter follows the run just finished (run:finish), and the run just played is marked in its row. */
import { BOARD, RADAR_TXT, RESULT, TOAST } from "../../config/copy.js";
import { KEYS, RADAR } from "../../config/keys.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { on } from "../../core/events.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { ACH, Scores, achToast, got, lensOf, tierOf, unlockHtml } from "../../progress.js";
import { radarAll, radarOf } from "../../progress/key.js";
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
// v29 (item 6, build 55): S1 - A BOARD CELL IS ESCAPED. COLS reads sc / practice / lim / yTxt / misses / x / y straight off
// a stored record and validRun never looked at any of them, so a planted sc of `<img src=x onerror=...>` ran on the Scores
// screen. validRun type-checks them now as well; this is the guard that holds whatever a future formatter reads.
function rows(g,d,s,list){ const cfg=GC(g,d,s), c=colsOf(g,d,s); return list.length ? list.map((r,i)=>{ const tc=r.t===curT?tierOf(r):null;
  return `<tr class="${i===0&&(r.hits>0||cfg.lower)?'best':''} ${r.t===curT?'cur':''}"><td>${i+1}</td><td></td><td${tc?` style="color:${tc.col}"`:''}>${fmtScore(g,r.hits,d,s)}</td><td>${esc(c[0][1](r))}</td><td>${esc(c[1][1](r))}</td><td>${new Date(r.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'2-digit'})}</td></tr>`; }).join('') : `<tr><td colspan="6">${RESULT.noRuns}</td></tr>`; }
/* the profile radar (v9): one axis per game, your best in any mode and length of it.
   v14 (8.6): 1.0 — the outer ring — was the AUTHOR's record, with quality() as the fallback while AUTHOR_RECORDS was empty.
   v18 (B.24, build 32): THE RUNGS ARE THE KEY'S THREE TIERS, read from progress/key.js (radarOf / radarRungs) — rung 1 is
   the clearance bar, rung 2 the Pro bar, rung 3 the Author time — and a score past the Author time pushes the vertex out
   to RADAR_PAST with a little flame on it. Before chest 1 there is ONE rung, key 1 at the outer ring, and nothing beyond
   it (A.1): the web is drawn to a single rung and the flame never appears. A shell tier (its column in key-bars.js not
   yet full) is a DASHED rung at no value — never a number (A.2) — and no axis can climb past it. */
/* build 65 (64.13): THE CHART ON THE KEYS' SCALE, REPLACING B.24's DRAWING. Each game's spoke is its average over the modes and lengths played
   (progress/key.js radarOf), 100 at its Skill bars, 200 Pro, 300 Author, the edge at RADAR.max. The three rings sit at 100 / 200 / 300 in their
   keys' own styles — Lantern's glow, Circuit's traces and nodes, Thorns' spikes (config/keys.js tints). The web grows in from the centre and then
   breathes, gently. Under it the overall figure (the games' average); past a ring it takes that key's style and word (RADAR_TXT, placeholders). */
function renderRadar(){ const ids=Object.keys(GAMES), n=ids.length, C=100, R=88, M=RADAR.max;
  const vals=ids.map(g=>Math.max(0,radarOf(g).v)), f=v=>Math.min(M,v)/M;
  const pt=(i,k)=>{ const a=-Math.PI/2+i/n*2*Math.PI; return [C+Math.cos(a)*R*k,C+Math.sin(a)*R*k]; };
  const P=k=>ids.map((_,i)=>pt(i,k).map(v=>v.toFixed(1)).join(',')).join(' ');
  const rings=RADAR.rings.map((v,j)=>{ const t=KEYS[j]||{}, k=f(v), vs=ids.map((_,i)=>pt(i,k));
    // Circuit: a square node on every corner; Thorns: a spike out of every corner and every edge's middle
    const bits=j===1?vs.map(([x,y])=>`<rect class="rnode" x="${(x-1.8).toFixed(1)}" y="${(y-1.8).toFixed(1)}" width="3.6" height="3.6"/>`).join('')
      :j===2?vs.flatMap(([x,y],i)=>{ const [x2,y2]=vs[(i+1)%n], m=[(x+x2)/2,(y+y2)/2]; return [[x,y],m]; }).map(([x,y])=>{ const dx=x-C, dy=y-C, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
        return `<polygon class="rspike" points="${(x-uy*2).toFixed(1)},${(y+ux*2).toFixed(1)} ${(x+ux*5).toFixed(1)},${(y+uy*5).toFixed(1)} ${(x+uy*2).toFixed(1)},${(y-ux*2).toFixed(1)}"/>`; }).join(''):'';
    return `<g class="rring r${j+1}" data-rung="${t.id||''}" data-at="${v}" style="--kt:${t.tint||'#fff'}"><polygon class="ring" points="${P(k)}"/>${bits}</g>`; }).join('');
  const past=v=>RADAR.rings.filter(r=>v>r).length;
  $('#radar').innerHTML=rings+ids.map((_,i)=>{ const [x,y]=pt(i,1); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')
    +`<g class="meg"><polygon class="me" points="${ids.map((_,i)=>pt(i,Math.max(.02,f(vals[i]))).map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`
    +ids.map((_,i)=>{ const [x,y]=pt(i,Math.max(.02,f(vals[i]))); return `<circle class="${past(vals[i])?'past':''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"/>`; }).join('')+'</g>'
    +ids.map((g,i)=>{ const [x,y]=pt(i,1.19); return `<text class="${past(vals[i])?'past':''}" data-g="${g}" x="${x.toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="middle">${GAMES[g].name} ${Math.round(vals[i])}</text>`; }).join('');
  $('#radar').classList.add('tiers');
  const all=radarAll(), tier=past(all), el=$('#radar-all');
  if(el){ el.className='radar-all'+(tier?' t'+tier:''); el.innerHTML=`<span>${esc(RADAR_TXT.all)}</span> <b>${Math.round(all)}</b>${tier?` <em>${esc(RADAR_TXT.words[tier-1]||'')}</em>`:''}`; } }
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
  if(prefs.name&&!got().named){ got().named=Date.now(); save(); const a=ACH.find(x=>x.id==='named'); toast(achToast(a),a.id,'',true); } });
$('#pname').addEventListener('click',e=>e.stopPropagation());
