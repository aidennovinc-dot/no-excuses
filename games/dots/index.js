/* No Excuses — Dots — Blind and Lead
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the timed base. Behaviour is identical to build 11. */

import { CFG } from "../../config/games.js";
import { $ } from "../../core.js";
import { timedEngine } from "../_shared/timed.js";
// a miss holds the dot where it is for half a second (v8); the dot is never hidden on a miss
const DT=Object.assign(timedEngine(),{ id:'dots', lockMs:500, hideOnMiss:false, sz:80, pos:null, nextPos:null, prevPos:null, demoOn:false, preset:false,
  reset(){ this.pos=null; this.nextPos=null; this.prevPos=null; this.demoOn=false; this.preset=false; },
  // v15 (3.10): Lead only. The first dot and its lead ring arrive on "1" of the 3-2-1 — two of the three steps in — so the
  // player is already looking at the right place when the run starts. They cannot be tapped: `armed` is false until
  // start(), so timedEngine.input turns every tap away before it reaches the field. Blind is untouched, by intent
  precount(ctx){ if(ctx.mode!=='lead') return; this.begin(); this.preset=true; ctx.timers.later(()=>this.render(true),CFG.countStep*2); },
  // v14 (6.9): the dots are random. The v9 quadrant pity — three in a row in the same quarter forced the next one elsewhere,
  // and the count carried across runs — was the one thing making the placement predictable, so it is gone. The only rule left
  // is separation (v14 section B.4): a new dot never lands on the one before it. B.4 asks for a floor of one dot RADIUS;
  // GAP is 1.8 dot-widths, well past that, because true randomness clusters and a cluster reads as a bug rather than variety.
  // It is tried a handful of times and then given up on — B.4: place rather than loop — but the fallback takes the farthest of a
  // few samples instead of a free one, because the red lead ring must not land on the white dot (v11). v14 (6.10): while the
  // intro demo plays the dots stay in the lower part of the field, so the ghost finger works BELOW the one-liner
  GAP:1.8,
  rnd(avoid){ const f=$('#field').getBoundingClientRect(); this.sz=parseFloat(getComputedStyle($('#dot')).width)||80; const mx=Math.max(1,f.width-this.sz), my=Math.max(1,f.height-this.sz);
    const top=this.demoOn?my*.45:0, span=Math.max(1,my-top), gap=this.sz*this.GAP;
    for(let i=0;i<24;i++){ const p={x:Math.random()*mx,y:top+Math.random()*span}; if(avoid&&Math.hypot(p.x-avoid.x,p.y-avoid.y)<gap) continue; return p; }
    let best=null,bd=-1; for(let i=0;i<8;i++){ const p={x:Math.random()*mx,y:top+Math.random()*span}; const d=avoid?Math.hypot(p.x-avoid.x,p.y-avoid.y):1e9; if(d>bd){ bd=d; best=p; } } return best; },
  // precount has already dealt the pair the player has been staring at through the countdown — re-dealing here would
  // move the dot out from under them on "go", which is the opposite of what 3.10 asks for
  begin(){ if(this.preset){ this.preset=false; return; } this.demoOn=false; this.pos=this.rnd(null); this.prevPos=null; this.nextPos=this.rnd(this.pos); },
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
  demo(ctx,g){ this.demoOn=true; this.pos=this.rnd(null); this.prevPos=null; this.nextPos=this.rnd(this.pos); this.render(true); const f=()=>$('#field').getBoundingClientRect(); const dot=()=>{ const r=f(); g.at(r.left+this.pos.x+this.sz/2,r.top+this.pos.y+this.sz/2); g.show(); };
    const step=()=>{ g.tap(); this.advance(); this.render(true); this.ring(); };
    g.later(dot,250); g.later(step,850); g.later(dot,1000); g.later(step,1700); g.later(dot,1850); g.later(()=>{ g.tap(); this.render(false); },2550); return 3000; } });

export default DT;
export { DT };
