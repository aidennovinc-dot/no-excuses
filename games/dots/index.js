/* No Excuses — Dots — Blind and Lead
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { tapAt } from "../../app.js";
import { CFG } from "../../config/games.js";
import { $ } from "../../core.js";
import { G } from "../../engine-core.js";
import { rnd } from "../_shared/round.js";
import { sel } from "../../core/state.js";
const DT={ sz:80,
  // pity (v9): three dots in a row in the same quarter of the screen and the next one is forced elsewhere
  q:-1, qn:0,
  rnd(avoid){ const f=$('#field').getBoundingClientRect(); this.sz=parseFloat(getComputedStyle($('#dot')).width)||80; const mx=Math.max(1,f.width-this.sz), my=Math.max(1,f.height-this.sz); const quad=p=>(p.x>mx/2?1:0)+(p.y>my/2?2:0);
    for(let i=0;i<60;i++){ const p={x:Math.random()*mx,y:Math.random()*my}; if(avoid&&Math.hypot(p.x-avoid.x,p.y-avoid.y)<this.sz*1.5) continue; const q=quad(p); if(q===this.q&&this.qn>=3) continue; if(q===this.q) this.qn++; else { this.q=q; this.qn=1; } return p; }
    // v11: never fall back to an unchecked spot — the red ring must not sit on the white dot. Take the farthest of a few samples
    let best=null,bd=-1; for(let i=0;i<8;i++){ const p={x:Math.random()*mx,y:Math.random()*my}; const d=avoid?Math.hypot(p.x-avoid.x,p.y-avoid.y):1e9; if(d>bd){ bd=d; best=p; } } return best; },
  begin(){ G.pos=this.rnd(null); G.prevPos=null; G.nextPos=this.rnd(G.pos); },
  advance(){ G.prevPos=G.pos; G.pos = sel.diff==='lead'?G.nextPos:this.rnd(G.pos); G.nextPos=this.rnd(G.pos); },
  render(live){ const d=$('#dot'), l=$('#lead'); if(G.pos){ d.style.transform=`translate(${G.pos.x}px,${G.pos.y}px)`; } d.classList.toggle('on',live);
    // the lead ring just appears where the next dot will be — no push, no effect (v5)
    const on=live&&sel.diff==='lead'; if(G.nextPos&&on){ l.style.transform=`translate(${G.nextPos.x}px,${G.nextPos.y}px)`; l.classList.add('on'); } else l.classList.remove('on'); },
  // the landing ring carries the direction of travel: it starts pushed on past the dot, further when the dot came from further, and settles back onto it as it fades (v5)
  // the landing ring (v9) grows out from the dot and fades — no push to the side
  ring(){ const r=$('#dring'); if(!G.pos) return; r.classList.remove('go'); r.style.transition='none'; r.style.opacity=.9; r.style.transform=`translate(${G.pos.x}px,${G.pos.y}px) scale(1)`; void r.offsetWidth; r.classList.add('go');
    requestAnimationFrame(()=>{ r.style.transition=''; r.style.opacity=0; r.style.transform=`translate(${G.pos.x}px,${G.pos.y}px) scale(1.7)`; }); },
  onDown(e){ const f=$('#field').getBoundingClientRect(); const x=e.clientX-f.left, y=e.clientY-f.top, c=this.sz/2; tapAt(!!G.pos && Math.hypot(x-(G.pos.x+c), y-(G.pos.y+c)) <= c*CFG.dotLeeway+8); } };


export { DT };
