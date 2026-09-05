/* No Excuses — Timing — Stopwatch and Hidden
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { finish, size } from "../app.js";
import { Snd } from "../audio.js";
import { $, STREAK, f2, mean, sum } from "../core.js";
import { genRect, rnd, roundEngine } from "./round.js";
import { sel } from "../menu.js";
import { liveCheck } from "../progress.js";
/* Timing — Stopwatch: a clock counts up and fades at 1.5s, tap on the target. Hidden: a ball rolls behind a wall, tap when it is at the marker. Score is seconds off, averaged */
const TM=Object.assign(roundEngine(),{ errs:[], target:0, t0:0, ball:null, targets:[], out:false,
  streak(){ return sel.secs===STREAK; }, hid(){ return sel.diff==='hidden'; }, lim(){ return this.hid()?150:2; },
  // targets are dealt in pairs either side of 7s so every run averages about 7 (v8) — a run of long targets used to be an easy win. A Streak deals as it goes
  deal(n){ const mid=this.hid()?1.2:7, sp=this.hid()?[.15,.5]:[.6,2.6]; const t=[]; for(let i=0;i<Math.floor(n/2);i++){ const d=sp[0]+Math.random()*sp[1]; t.push(mid-d,mid+d); } if(n%2) t.push(mid-.25+Math.random()*.5); for(let i=t.length-1;i>0;i--){ const j=rnd(i+1); [t[i],t[j]]=[t[j],t[i]]; } return t; },
  begin(){ this.round=0; this.errs=[]; this.out=false; this.targets=this.deal(this.streak()?40:sel.secs); $('#score').textContent=this.streak()?'0':'0.00'; this.next(); },
  // v11: Stopwatch Set = 5 attempts, average absolute s off. Hidden Set = 10 runs, total px off. Streak = attempts until one is more than 2.0s (150px) off, score attempts completed. Every figure is an absolute difference — early never cancels late
  result(){ const done=this.out?this.errs.slice(0,-1):this.errs; const x=this.errs.length?Math.min(...this.errs):0, y=this.errs.length?Math.max(...this.errs):0;
    if(this.streak()) return {hits:done.length,misses:0,x,y,lim:this.hid()?'150px':'2.0s'}; return {hits:this.hid()?Math.round(sum(this.errs)):Math.round(mean(this.errs)*100)/100,misses:0,x,y}; },
  hud(){ $('#hud-time').textContent=this.streak()?`attempt ${this.round} · until one is over ${this.hid()?'150px':'2.0s'}`:`${this.round} / ${sel.secs}`; },
  next(){ this.clearT(); this.round++; if(this.out||(!this.streak()&&this.round>sel.secs)) return finish(this.result()); if(this.round>this.targets.length) this.targets=this.targets.concat(this.deal(20)); this.hud(); this.st='arm'; this.hid()?this.hidden():this.watch(); },
  watch(){ this.target=Math.round((this.targets[this.round-1]||7)*100)/100;
    $('#gen').innerHTML=`<div class="tmtarget">target<b>${f2(this.target)}</b></div><div class="tmclock" id="tmclock">0.00</div><div class="glbl bot" id="tmhint">tap to stop the timer</div>`;
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmclock'); const loop=now=>{ if(this.st!=='run') return; const e=(now-this.t0)/1000; el.textContent=f2(e); el.style.opacity=e<1.5?1:Math.max(0,1-(e-1.5)/.5); if(e>this.target+5) return this.onDown(); this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },700); },
  // hidden (v8): the ball comes in from any of the four sides, the wall covers 55–85% of the way and is squared to the direction of travel, the marker sits somewhere inside it
  // hidden (v9): the time the ball spends behind the wall before the marker is dealt around 1.3s, in pairs, the same for everyone — and never under 0.6s, so the wall's edge is no help
  hidden(){ const r=genRect(); const size=Math.max(28,Math.min(r.width,r.height)*.11); const dir=rnd(4), horiz=dir<2; const L=horiz?r.width:r.height;
    const cross=horiz?r.height*(.18+Math.random()*.55):r.width*(.12+Math.random()*.7); const v=L*.3, behind=Math.max(.6,this.targets[this.round-1]||1.2); const need=v*behind+size*1.5; const cover=Math.min(.86,Math.max(.6,need/L+.06)), wallStart=L*(1-cover);
    const markT=wallStart+v*behind;
    const pos=t=>dir===0?{x:t-size,y:cross}:dir===1?{x:r.width-t,y:cross}:dir===2?{x:cross,y:t-size}:{x:cross,y:r.height-t};
    const wall=dir===0?`left:${wallStart}px;right:0;top:0;bottom:0;border-left:1px solid var(--line)`:dir===1?`left:0;width:${r.width-wallStart}px;top:0;bottom:0;border-right:1px solid var(--line)`:dir===2?`top:${wallStart}px;bottom:0;left:0;right:0;border-top:1px solid var(--line)`:`top:0;height:${r.height-wallStart}px;left:0;right:0;border-bottom:1px solid var(--line)`;
    const m=pos(markT), p0=pos(0);
    $('#gen').innerHTML=`<div class="glbl top" style="z-index:3">tap when the ball has reached the marker</div><div id="tmball" style="--fsz:${size}px;transform:translate(${p0.x}px,${p0.y}px)"></div><div id="tmghost" style="--fsz:${size}px"></div><div id="tmwall" style="${wall}"></div><div id="tmmark" style="--fsz:${size}px;left:${m.x}px;top:${m.y}px"></div>`;
    this.ball={t:0,v,markT,size,pos};
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmball'); const loop=now=>{ if(this.st!=='run') return; const t=(now-this.t0)/1000*v; this.ball.t=t; const p=pos(t); el.style.transform=`translate(${p.x}px,${p.y}px)`; if(t>L+size*2) return this.onDown(); this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },600); },
  onDown(){ if(this.st!=='run') return; this.st='show'; cancelAnimationFrame(this.raf); const now=performance.now(); let err, note;
    // hidden (v10): scored in pixels between the ball and the marker — dead on within 10px, close within 35px
    const hid=this.hid();
    if(hid){ const b=this.ball; const off=b.t-b.markT; err=Math.round(Math.abs(off)); note=off>0?'late':'early'; $('#tmwall').style.opacity=.12; const g=$('#tmghost'), p=b.pos(b.t); g.style.left=p.x+'px'; g.style.top=p.y+'px'; g.style.opacity=1; }
    else { const e=(now-this.t0)/1000; err=Math.abs(e-this.target); note=e>this.target?'late':'early'; const el=$('#tmclock'); el.style.opacity=1; el.textContent=f2(e); err=Math.round(err*100)/100; }
    this.errs.push(err); if(this.streak()&&err>this.lim()) this.out=true;
    $('#score').textContent=this.streak()?String(this.out?this.errs.length-1:this.errs.length):hid?Math.round(sum(this.errs)):f2(mean(this.errs));
    const good=hid?err<=10:err<=.1, ok=hid?err<=35:err<=.3; $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${good?'g':ok?'':'r'}">${hid?err+'px':f2(err)+'s'}</b>${this.out?'over the limit · run over':good?'dead on':ok?'close':note}</div>`); const h=$('#tmhint'); if(h) h.remove();
    liveCheck(this.result());
    ok?Snd.hit():Snd.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30); this.later(()=>this.next(),this.out?1900:1500); } });


export { TM };
