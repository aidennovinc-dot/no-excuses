/* No Excuses — Timing — Stopwatch and Hidden
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { TIMING as CP } from "../../config/copy.js";
import { $, T, f2, mean, minMax, sum } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine } from "../_shared/round.js";
/* Timing — Stopwatch: a clock counts up and fades at 1.5s, tap on the target. Hidden: a ball rolls behind a wall, tap when it is at the marker. Score is seconds off, averaged */
const TM=Object.assign(roundEngine(),{ id:'timing', errs:[], target:0, t0:0, ball:null, targets:[], out:false, tot:0,
  hid(){ return this.ctx.mode==='hidden'; },
  // v13 (8.2 / 8.3 / L5): a Streak is a cumulative budget, not one bad attempt — Stopwatch adds up the seconds off to 2.0s, Hidden the pixels off to 100px. Score is attempts completed
  budget(){ return this.hid()?100:2; }, budTxt(){ return this.hid()?CP.budPx:CP.budS; }, totTxt(){ return this.hid()?Math.round(this.tot)+'px':f2(this.tot)+'s'; },
  // targets are dealt in pairs either side of 7s so every run averages about 7 (v8) — a run of long targets used to be an easy win. A Streak deals as it goes
  deal(n){ const mid=this.hid()?1.2:7, sp=this.hid()?[.15,.5]:[.6,2.6]; const t=[]; for(let i=0;i<Math.floor(n/2);i++){ const d=sp[0]+Math.random()*sp[1]; t.push(mid-d,mid+d); } if(n%2) t.push(mid-.25+Math.random()*.5); for(let i=t.length-1;i>0;i--){ const j=rnd(i+1); [t[i],t[j]]=[t[j],t[i]]; } return t; },
  begin(){ this.round=0; this.errs=[]; this.out=false; this.tot=0; this.targets=this.deal(this.streak()?40:this.ctx.len); hud.score(this.streak()?'0':'0.00'); this.next(); },
  // v11: Stopwatch Set = 5 attempts, average absolute s off. Hidden Set = 10 runs, total px off. Streak = attempts until one is more than 2.0s (150px) off, score attempts completed. Every figure is an absolute difference — early never cancels late
  result(){ const [x,y]=minMax(this.errs);
    if(this.streak()) return {hits:this.errs.length,misses:0,x,y,lim:this.budTxt()}; return {hits:this.hid()?Math.round(sum(this.errs)):Math.round(mean(this.errs)*100)/100,misses:0,x,y}; },
  hud(){ hud.time(this.streak()?T(CP.hudStreak,{n:this.round,tot:this.totTxt(),bud:this.budTxt()}):T(CP.hudSet,{n:this.round,s:this.ctx.len})); },
  next(){ this.clearT(); this.round++; if(this.out||(!this.streak()&&this.round>this.ctx.len)) return this.ctx.emit('finish',this.result()); if(this.round>this.targets.length) this.targets=this.targets.concat(this.deal(20)); this.hud(); this.st='arm'; this.hid()?this.hidden():this.watch(); },
  watch(){ this.target=Math.round((this.targets[this.round-1]||7)*100)/100;
    $('#gen').innerHTML=`<div class="tmtarget">${CP.target}<b>${f2(this.target)}</b></div><div class="tmclock" id="tmclock">0.00</div><div class="glbl bot" id="tmhint">${CP.stop}</div>`;
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmclock'); const loop=now=>{ if(this.st!=='run') return; const e=(now-this.t0)/1000; el.textContent=f2(e); el.style.opacity=e<1.5?1:Math.max(0,1-(e-1.5)/.5); if(e>this.target+5) return this.onDown(); this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },700); },
  // hidden (v8): the ball comes in from any of the four sides, the wall covers 55–85% of the way and is squared to the direction of travel, the marker sits somewhere inside it
  // hidden (v9): the time the ball spends behind the wall before the marker is dealt around 1.3s, in pairs, the same for everyone — and never under 0.6s, so the wall's edge is no help
  hidden(){ const r=genRect(); const size=Math.max(28,Math.min(r.width,r.height)*.11); const dir=rnd(4), horiz=dir<2; const L=horiz?r.width:r.height;
        // v13 (8.5): the marker sits a little further behind the wall each round — about +6% of the travel, held from round 10 on
    const ramp=1+.06*(Math.min(10,this.round)-1);
    const cross=horiz?r.height*(.18+Math.random()*.55):r.width*(.12+Math.random()*.7); const v=L*.3, behind=Math.max(.6,(this.targets[this.round-1]||1.2)*ramp); const need=v*behind+size*1.5; const cover=Math.min(.86,Math.max(.6,need/L+.06)), wallStart=L*(1-cover);
    const markT=wallStart+v*behind;
    const pos=t=>dir===0?{x:t-size,y:cross}:dir===1?{x:r.width-t,y:cross}:dir===2?{x:cross,y:t-size}:{x:cross,y:r.height-t};
    const wall=dir===0?`left:${wallStart}px;right:0;top:0;bottom:0;border-left:1px solid var(--line)`:dir===1?`left:0;width:${r.width-wallStart}px;top:0;bottom:0;border-right:1px solid var(--line)`:dir===2?`top:${wallStart}px;bottom:0;left:0;right:0;border-top:1px solid var(--line)`:`top:0;height:${r.height-wallStart}px;left:0;right:0;border-bottom:1px solid var(--line)`;
    const m=pos(markT), p0=pos(0);
    $('#gen').innerHTML=`<div class="glbl top" style="z-index:3">${CP.marker}</div><div id="tmball" style="--fsz:${size}px;transform:translate(${p0.x}px,${p0.y}px)"></div><div id="tmghost" style="--fsz:${size}px"></div><div id="tmwall" style="${wall}"></div><div id="tmmark" style="--fsz:${size}px;left:${m.x}px;top:${m.y}px"></div>`;
    this.ball={t:0,v,markT,size,pos};
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmball'); const loop=now=>{ if(this.st!=='run') return; const t=(now-this.t0)/1000*v; this.ball.t=t; const p=pos(t); el.style.transform=`translate(${p.x}px,${p.y}px)`; if(t>L+size*2) return this.onDown(); this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },600); },
  onDown(){ if(this.st!=='run') return; this.st='show'; cancelAnimationFrame(this.raf); const now=performance.now(); let err, note;
    // hidden (v10): scored in pixels between the ball and the marker — dead on within 10px, close within 35px
    const hid=this.hid();
    if(hid){ const b=this.ball; const off=b.t-b.markT; err=Math.round(Math.abs(off)); note=off>0?CP.late:CP.early; $('#tmwall').style.opacity=.12; const g=$('#tmghost'), p=b.pos(b.t); g.style.left=p.x+'px'; g.style.top=p.y+'px'; g.style.opacity=1; }
    else { const e=(now-this.t0)/1000; err=Math.abs(e-this.target); note=e>this.target?CP.late:CP.early; const el=$('#tmclock'); el.style.opacity=1; el.textContent=f2(e); err=Math.round(err*100)/100; }
    this.errs.push(err);
    hud.score(this.streak()?String(this.errs.length):hid?Math.round(sum(this.errs)):f2(mean(this.errs)));
    // v13 (8.4): Hidden shows every round's result — px off, dead on / early / late — then moves on
    const good=hid?err<=10:err<=.1, ok=hid?err<=35:err<=.3;
    $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot" id="tmres"><b class="${good?'g':ok?'':'r'}" id="tmerr">${hid?err+'px':f2(err)+'s'}</b>${good?CP.dead:ok?CP.close:note}</div>`); const h=$('#tmhint'); if(h) h.remove();
    ok?this.ctx.audio.hit():this.ctx.audio.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30);
    if(this.streak()) return this.addUp(err,hid);
    this.ctx.emit('live',this.result()); this.later(()=>this.next(),hid?700:1500); },
  // v13 (8.2 / 8.3): the attempt's figure counts down to 0 while the running total counts up by the same amount, together, with the whoosh (6.7)
  addUp(err,hid){ hud.addUp({ audio:this.ctx.audio, from:this.tot, err, ms:800, el:$('#tmerr'), fmt:v=>hid?Math.round(v)+'px':f2(v)+'s', alive:()=>this.st==='show',
      onFrame:tot=>{ this.tot=tot; hud.time(T(CP.hudStreak,{n:this.round,tot:this.totTxt(),bud:this.budTxt()})); },
      done:tot=>{ this.tot=tot; if(this.tot>=this.budget()) this.out=true; this.hud();
        if(this.out){ const r=$('#tmres'); if(r) r.insertAdjacentHTML('beforeend',`<br>${T(CP.over,{bud:this.budTxt()})}`); }
        this.ctx.emit('live',this.result()); this.later(()=>this.next(),this.out?1600:hid?700:900); } }); } });

export default TM;
export { TM };
