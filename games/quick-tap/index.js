/* No Excuses — Quick Tap — Two and Four
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the timed base. Behaviour is identical to build 11. */

import { $ } from "../../core.js";
import { timedEngine } from "../_shared/timed.js";
const QT=Object.assign(timedEngine(),{ id:'quick-tap', target:-1, streak:0, sq:[], rings:[],
  n(){ return this.ctx.mode==='four'?4:2; },
  reset(){ this.streak=0; this.target=-1; this.sq=[0,1,2,3].map(i=>$('#sq'+i)); this.rings=[0,1,2,3].map(i=>$('#ring'+i)); },
  // pity (v9): random, but a streak of the same pad is cut at three — long runs of "again?" annoy without testing anything
  pickPad(prev){ const n=this.n(); let p=Math.random()*n|0; if(p===prev){ this.streak++; if(this.streak>=3){ p=(p+1+(Math.random()*(n-1)|0))%n; this.streak=0; } } else this.streak=0; return p; },
  begin(){ this.streak=0; this.target=Math.random()*this.n()|0; },
  advance(){ const p=this.target; this.target=this.pickPad(p); if(this.target===p){ const s=this.sq[this.target]; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } },
  render(live){ for(let i=0;i<4;i++) this.sq[i].style.setProperty('--v',(live&&this.target===i)?1:0); },
  ring(){ const r=this.rings[this.target]; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); },
  // a tap lands on a pad: ev.target is the pad's side (boot.js binds the pads; the arrow keys map to the same numbers)
  check(ev){ return ev.target===this.target; },
  // first play (v6): the ghost finger plays three beats under the one-liner, then the countdown
  demo(ctx,g){ const four=ctx.mode==='four'; this.target=0; this.render(true); const pad=i=>$(`#qt .pad[data-side="${i}"]`);
    g.later(()=>g.move(pad(0)),250); g.later(()=>{ g.tap(); this.target=four?3:1; this.render(true); },800); g.later(()=>g.move(pad(four?3:1)),1050); g.later(()=>{ g.tap(); this.target=four?2:0; this.render(true); },1650); g.later(()=>g.move(pad(four?2:0)),1900); g.later(()=>{ g.tap(); this.render(false); },2500); return 3000; } });

export default QT;
export { QT };
