/* No Excuses — the round-based engine base shared by Timing, Reaction and Spot
   Split out of index.html at build 12. Build 17 (refactor stage 3): on the engine contract — mount / start / stop / input are
   here, the engine supplies begin / onDown / result; timers are the run's (ctx.timers), the length is ctx.len.
   Behaviour is identical to build 11. */

import { STREAK } from "../../config/games.js";
import { $ } from "../../core.js";
import * as hud from "./hud.js";
/* ---------- v7 engines. All four share #gen, a round counter, and `later` timers that die with the run ---------- */
// the rule bar (v10): what to look for, top-middle, a word at a time, staying up for the whole attempt. null clears it
function rxBar(words){ const b=$('#rxbar'); if(!words){ b.innerHTML=''; return; } b.innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${i*220}ms">${w}</span>`).join(''); }
const genRect=()=>$('#gen').getBoundingClientRect();
const rnd=n=>Math.random()*n|0;
const roundEngine=()=>({ ctx:null, raf:0, round:0, st:'idle', pending:null,
  mount(ctx){ this.ctx=ctx; this.pending=null; hud.hold(false); },
  streak(){ return this.ctx.len===STREAK; },
  start(){ this.begin(); },
  stop(){ this.clearT(); this.pending=null; hud.hold(false); },
  // v14 (6.3): a result card waits for a tap. The tap that clears it is consumed here and never reaches the round underneath
  input(ctx,ev){ if(this.pending){ if(ev.type&&ev.type!=='down') return; const f=this.pending; this.pending=null; hud.hold(false); ctx.audio.click(); return f(); } this.onDown(ev); },
  // hold the card up until it is tapped, then run f. Replaces `this.later(()=>this.next(), ms)` after every reveal
  wait(f){ this.pending=f; hud.hold(true); },
  // v15 (3.9): only a result with something to read waits for a tap — Estimate · Grow, Estimate · Cut, Reaction · Flash
  // and Reaction · Go / No-go. Everywhere else the round moves on by itself; an engine opts in with holdResult
  holdResult:false,
  after(f,ms){ return this.holdResult?this.wait(f):this.later(f,ms||900); },
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); cancelAnimationFrame(this.raf); },
  later(f,ms){ this.ctx.timers.later(f,ms); },
  hud(){ $('#hud-time').textContent=`${this.round} / ${this.ctx.len}`; } });
// place n shapes on a jittered grid so none overlap. Returns [{x,y,shape}] in px inside #gen, size in px
function scatter(n,shapes,size,odd){ const r=genRect(); const cell=size*1.45, cols=Math.max(1,Math.floor(r.width/cell)), rows=Math.max(1,Math.floor((r.height*.86)/cell)); const cells=[]; for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) cells.push({x,y}); for(let i=cells.length-1;i>0;i--){ const j=rnd(i+1); [cells[i],cells[j]]=[cells[j],cells[i]]; }
  const ox=(r.width-cols*cell)/2, oy=r.height*.08+(r.height*.86-rows*cell)/2, jit=cell-size; return cells.slice(0,Math.min(n,cells.length)).map((c,i)=>({ x:ox+c.x*cell+Math.random()*jit, y:oy+c.y*cell+Math.random()*jit, shape:i===0&&odd?odd:shapes[rnd(shapes.length)] })); }
const shapeHtml=(p,size,extra='')=>`<i class="fs ${p.shape} ${extra}" style="left:${p.x}px;top:${p.y}px;--fsz:${size}px"></i>`;


export { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml };
