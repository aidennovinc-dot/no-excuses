/* No Excuses — the round-based engine base shared by Timing, Reaction and Spot
   Split out of index.html at build 12. Build 17 (refactor stage 3): on the engine contract — mount / start / stop / input are
   here, the engine supplies begin / onDown / result; timers are the run's (ctx.timers), the length is ctx.len.
   Behaviour is identical to build 11. */

import { STREAK } from "../../config/games.js";
import { $ } from "../../core.js";
import * as hud from "./hud.js";
/* ---------- v7 engines. All four share #gen, a round counter, and `later` timers that die with the run ---------- */
/* the rule bar (v10): what to look for, top-middle, a word at a time, staying up for the whole attempt. null clears it.
   v17 (B.14): `atOnce` drops the stagger. Spot · Count puts the bar up for 1500ms and the last of its five words used to
   land at ~880ms of that, so the player had 600ms to take in the shape they were about to count. Reaction keeps the
   staggered reveal — its bar IS the beat it arrives on. */
function rxBar(words,atOnce){ const b=$('#rxbar'); if(!words){ b.innerHTML=''; return; } b.innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${atOnce?0:i*220}ms">${w}</span>`).join(''); }
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
  /* v16 (1.5, A.1): how far into its finish this run is, 0..1 — the final round of a Set, a Streak budget past 80%.
     ONLY audio.js reads it; nothing about the gameplay changes with it. A round-based engine overrides this; the default
     is 0, which is the right answer for a game with neither a clock nor a budget (Sequence). */
  fin(){ return 0; },
  finBud(spent,bud){ return Math.max(0,Math.min(1,(spent/bud-.8)/.2)); },
  finSet(){ return !this.streak()&&this.round>=this.ctx.len?1:0; },
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); cancelAnimationFrame(this.raf); },
  later(f,ms){ this.ctx.timers.later(f,ms); },
  hud(){ $('#hud-time').textContent=`${this.round} / ${this.ctx.len}`; } });
// place n shapes on a jittered grid so none overlap. Returns [{x,y,shape}] in px inside #gen, size in px
// v16 (§4): `top` is the fraction of #gen the crowd keeps clear of, 0.08 as it always was. Spot's Find versus asks for
// more so its rule bar and its score line are never underneath a shape — "everything gets in the way of itself"
function scatter(n,shapes,size,odd,top){ const r=genRect(); const t=top||.08, h=1-t-.06; const cell=size*1.45, cols=Math.max(1,Math.floor(r.width/cell)), rows=Math.max(1,Math.floor((r.height*h)/cell)); const cells=[]; for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) cells.push({x,y}); for(let i=cells.length-1;i>0;i--){ const j=rnd(i+1); [cells[i],cells[j]]=[cells[j],cells[i]]; }
  const ox=(r.width-cols*cell)/2, oy=r.height*t+(r.height*h-rows*cell)/2, jit=cell-size; return cells.slice(0,Math.min(n,cells.length)).map((c,i)=>({ x:ox+c.x*cell+Math.random()*jit, y:oy+c.y*cell+Math.random()*jit, shape:i===0&&odd?odd:shapes[rnd(shapes.length)] })); }
// v17 (B.15): a point may carry its OWN size (`sz`). A crowd of identical marks is the thing the eye scans fastest, and
// Spot's difficulty now comes from the crowd rather than from how long you get to look at it
const shapeHtml=(p,size,extra='')=>`<i class="fs ${p.shape} ${extra}" style="left:${p.x}px;top:${p.y}px;--fsz:${p.sz||size}px"></i>`;


export { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml };
