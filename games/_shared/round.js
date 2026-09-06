/* No Excuses — the round-based engine base shared by Timing, Reaction and Spot
   Split out of index.html at build 12. Build 17 (refactor stage 3): on the engine contract — mount / start / stop / input are
   here, the engine supplies begin / onDown / result; timers are the run's (ctx.timers), the length is ctx.len.
   Behaviour is identical to build 11. */

import { $ } from "../../core.js";
import { G } from "../../engine-core.js";
import { sel } from "../../core/state.js";
/* ---------- v7 engines. All four share #gen, a round counter, and `later` timers that die with the run ---------- */
// the rule bar (v10): what to look for, top-middle, a word at a time, staying up for the whole attempt. null clears it
function rxBar(words){ const b=$('#rxbar'); if(!words){ b.innerHTML=''; return; } b.innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${i*220}ms">${w}</span>`).join(''); }
// the flash (v10): a large square with burst lines, not a white screen
const rxBox=()=>`<svg class="rxbox" viewBox="-100 -100 200 200"><rect x="-52" y="-52" width="104" height="104"/>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="0" y1="-70" x2="0" y2="-88" transform="rotate(${a})"/>`).join('')}</svg>`;
const genRect=()=>$('#gen').getBoundingClientRect();
const rnd=n=>Math.random()*n|0;
// build 17 transition: an engine not yet ported has no ctx and keeps the old G-keyed timers; both paths go when the last round engine ports
const roundEngine=()=>({ ctx:null, timers:[], raf:0, round:0, st:'idle',
  mount(ctx){ this.ctx=ctx; },
  start(){ this.begin(); },
  stop(){ this.clearT(); },
  input(ctx,ev){ this.onDown(ev); },
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); this.timers.forEach(clearTimeout); this.timers=[]; cancelAnimationFrame(this.raf); },
  later(f,ms){ if(this.ctx) return this.ctx.timers.later(f,ms); const id=G.runId; this.timers.push(setTimeout(()=>{ if(G.on&&G.runId===id) f(); },ms)); },
  len(){ return this.ctx?this.ctx.len:sel.secs; },
  hud(){ $('#hud-time').textContent=`${this.round} / ${this.len()}`; } });
// place n shapes on a jittered grid so none overlap. Returns [{x,y,shape}] in px inside #gen, size in px
function scatter(n,shapes,size,odd){ const r=genRect(); const cell=size*1.45, cols=Math.max(1,Math.floor(r.width/cell)), rows=Math.max(1,Math.floor((r.height*.86)/cell)); const cells=[]; for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) cells.push({x,y}); for(let i=cells.length-1;i>0;i--){ const j=rnd(i+1); [cells[i],cells[j]]=[cells[j],cells[i]]; }
  const ox=(r.width-cols*cell)/2, oy=r.height*.08+(r.height*.86-rows*cell)/2, jit=cell-size; return cells.slice(0,Math.min(n,cells.length)).map((c,i)=>({ x:ox+c.x*cell+Math.random()*jit, y:oy+c.y*cell+Math.random()*jit, shape:i===0&&odd?odd:shapes[rnd(shapes.length)] })); }
const shapeHtml=(p,size,extra='')=>`<i class="fs ${p.shape} ${extra}" style="left:${p.x}px;top:${p.y}px;--fsz:${size}px"></i>`;


export { genRect, rnd, roundEngine, rxBar, rxBox, scatter, shapeHtml };
