/* No Excuses — Dots — Blind and Lead
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the timed base. Behaviour is identical to build 11. */

import { CFG } from "../../config/games.js";
import { $ } from "../../core.js";
import { timedEngine } from "../_shared/timed.js";
// a miss holds the dot where it is for half a second (v8); the dot is never hidden on a miss
const DT=Object.assign(timedEngine(),{ id:'dots', lockMs:500, hideOnMiss:false, sz:80, pos:null, nextPos:null, prevPos:null,
  // pity (v9): three dots in a row in the same quarter of the screen and the next one is forced elsewhere. Carried across runs, as it always was
  q:-1, qn:0,
  reset(){ this.pos=null; this.nextPos=null; this.prevPos=null; },
  rnd(avoid){ const f=$('#field').getBoundingClientRect(); this.sz=parseFloat(getComputedStyle($('#dot')).width)||80; const mx=Math.max(1,f.width-this.sz), my=Math.max(1,f.height-this.sz); const quad=p=>(p.x>mx/2?1:0)+(p.y>my/2?2:0);
    for(let i=0;i<60;i++){ const p={x:Math.random()*mx,y:Math.random()*my}; if(avoid&&Math.hypot(p.x-avoid.x,p.y-avoid.y)<this.sz*1.5) continue; const q=quad(p); if(q===this.q&&this.qn>=3) continue; if(q===this.q) this.qn++; else { this.q=q; this.qn=1; } return p; }
    // v11: never fall back to an unchecked spot — the red ring must not sit on the white dot. Take the farthest of a few samples
    let best=null,bd=-1; for(let i=0;i<8;i++){ const p={x:Math.random()*mx,y:Math.random()*my}; const d=avoid?Math.hypot(p.x-avoid.x,p.y-avoid.y):1e9; if(d>bd){ bd=d; best=p; } } return best; },
  begin(){ this.pos=this.rnd(null); this.prevPos=null; this.nextPos=this.rnd(this.pos); },
  advance(){ this.prevPos=this.pos; this.pos = this.ctx.mode==='lead'?this.nextPos:this.rnd(this.pos); this.nextPos=this.rnd(this.pos); },
  render(live){ const d=$('#dot'), l=$('#lead'); if(this.pos){ d.style.transform=`translate(${this.pos.x}px,${this.pos.y}px)`; } d.classList.toggle('on',live);
    // the lead ring just appears where the next dot will be — no push, no effect (v5)
    const on=live&&this.ctx.mode==='lead'; if(this.nextPos&&on){ l.style.transform=`translate(${this.nextPos.x}px,${this.nextPos.y}px)`; l.classList.add('on'); } else l.classList.remove('on'); },
  // the landing ring carries the direction of travel: it starts pushed on past the dot, further when the dot came from further, and settles back onto it as it fades (v5)
  // the landing ring (v9) grows out from the dot and fades — no push to the side
  ring(){ const r=$('#dring'); if(!this.pos) return; r.classList.remove('go'); r.style.transition='none'; r.style.opacity=.9; r.style.transform=`translate(${this.pos.x}px,${this.pos.y}px) scale(1)`; void r.offsetWidth; r.classList.add('go');
    requestAnimationFrame(()=>{ r.style.transition=''; r.style.opacity=0; r.style.transform=`translate(${this.pos.x}px,${this.pos.y}px) scale(1.7)`; }); },
  // after the half-second the dot simply shows again where it was
  unlock(){ this.render(true); },
  check(ev){ const f=$('#field').getBoundingClientRect(); const x=ev.x-f.left, y=ev.y-f.top, c=this.sz/2; return !!this.pos && Math.hypot(x-(this.pos.x+c), y-(this.pos.y+c)) <= c*CFG.dotLeeway+8; },
  // first play (v6): the ghost lands on three dots in a row, then the countdown
  demo(ctx,g){ this.pos=this.rnd(null); this.prevPos=null; this.nextPos=this.rnd(this.pos); this.render(true); const f=()=>$('#field').getBoundingClientRect(); const dot=()=>{ const r=f(); g.at(r.left+this.pos.x+this.sz/2,r.top+this.pos.y+this.sz/2); g.show(); };
    const step=()=>{ g.tap(); this.advance(); this.render(true); this.ring(); };
    g.later(dot,250); g.later(step,850); g.later(dot,1000); g.later(step,1700); g.later(dot,1850); g.later(()=>{ g.tap(); this.render(false); },2550); return 3000; } });

export default DT;
export { DT };
