/* No Excuses — Timing — Stopwatch and Hidden
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { TIMING as CP } from "../../config/copy.js";
import { $, T, f2, mean, minMax, sum } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine } from "../_shared/round.js";
import { makeTwo } from "../_shared/two.js";
/* Timing — Stopwatch: a clock counts up and fades at 1.5s, tap on the target. Hidden: a ball rolls behind a wall, tap when it is at the marker. Score is seconds off, averaged */
const TM=Object.assign(roundEngine(),{ id:'timing', errs:[], target:0, t0:0, ball:null, targets:[], out:false, tot:0, asked:0, stopAt:0, two:{on:false},
  hid(){ return this.ctx.mode==='hidden'; },
  // v13 (8.2 / 8.3 / L5): a Streak is a cumulative budget, not one bad attempt — Stopwatch adds up the seconds off to 2.0s, Hidden the pixels off to 100px. Score is attempts completed
  // v15 (3.8, L5): the Stopwatch Streak's budget is 25 seconds, and passing round 10 grants five more. It WAS 2.0s —
  // Aiden read it as "about 2s" and he was exactly right, which is the whole bug: two ordinary attempts against a 7s
  // target spent it, so the Streak was over before it started. Hidden's 100px is untouched. The budget text is derived
  // from the number rather than the old CP.budS literal, so a retune can never leave the screen saying something else
  budget(){ return this.hid()?100:(this.round>10?30:25); }, budTxt(){ return this.hid()?CP.budPx:f2(this.budget())+'s'; }, totTxt(){ return this.hid()?Math.round(this.tot)+'px':f2(this.tot)+'s'; },
  // v15 (3.8): a Stopwatch Streak's targets start low and climb — 2.5s at round 1, about half a second more each round,
  // held at 9s — instead of being drawn flat around 7s. The SET keeps v14 6.18's exact-mean deal untouched: that one is
  // a promise printed on the sheet ("5 rounds averaging 7s ask for 35.00s") and a ramp would make it a lie
  rampAt(r){ const mid=Math.min(9,2.5+.45*(r-1)); return Math.round((mid+(rnd(2)?1:-1)*Math.random()*.4)*100)/100; },
  // v14 (6.18): the targets are generated so their mean is EXACTLY the stated average — five rounds averaging 7s ask for 35.00s,
  // never 34.6 or 35.4. Random offsets either side, then the mean offset is taken back out of every one, so no player is ever
  // dealt a harder set of targets than another. Aiden's reasoning, and the whole theme: no excuses. A Streak deals as it goes
  deal(n){ const mid=this.hid()?1.2:7, sp=this.hid()?[.15,.5]:[.6,2.6]; if(n<1) return [];
    const off=Array.from({length:n},()=>(rnd(2)?1:-1)*(sp[0]+Math.random()*sp[1]));
    const m=off.reduce((a,b)=>a+b,0)/n;
    const t=off.map(d=>Math.round((mid+d-m)*100)/100);
    // rounding each target to a hundredth leaves the total a hundredth or two off the exact average — the drift goes back into
    // the last one, so what is displayed adds up to what is promised rather than merely being close to it
    const want=Math.round(mid*n*100)/100, have=Math.round(t.reduce((a,b)=>a+b,0)*100)/100;
    t[n-1]=Math.round((t[n-1]+want-have)*100)/100;
    return t; },
  // what the run has asked for so far, and what it will have asked for by the end (Stopwatch · Set only — a Streak has no end)
  askTot(){ return Math.round(this.targets.slice(0,this.ctx.len).reduce((a,b)=>a+b,0)*100)/100; },
  // v15 (4.3): pass & play is attempt by attempt, both modes — one go each, the phone over, and the same scoring the Set
  // uses (Stopwatch the average seconds off, Hidden the total pixels). Lower wins at both ends
  begin(){ this.round=0; this.errs=[]; this.out=false; this.tot=0; this.asked=0; this.two=makeTwo(this.ctx,{lower:true,agg:this.hid()?'sum':'mean',fmt:v=>this.hid()?Math.round(v)+'px':f2(v)+'s'});
    this.targets=this.deal(this.streak()?40:this.ctx.len); hud.score(this.streak()?'0':(this.hid()?'0px':'0.00s')); this.next(); },
  // v11: Stopwatch Set = 5 attempts, average absolute s off. Hidden Set = 10 runs, total px off. Streak = attempts until one is more than 2.0s (150px) off, score attempts completed. Every figure is an absolute difference — early never cancels late
  result(){ const [x,y]=minMax(this.errs);
    if(this.streak()) return {hits:this.errs.length,misses:0,x,y,lim:this.budTxt()}; return {hits:this.hid()?Math.round(sum(this.errs)):Math.round(mean(this.errs)*100)/100,misses:0,x,y}; },
  hud(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudStreak,{n:this.round,tot:this.totTxt(),bud:this.budTxt()}):T(CP.hudSet,{n:this.round,s:this.ctx.len})); },
  next(){ this.clearT(); this.round++; if(this.round>this.targets.length) this.targets=this.targets.concat(this.deal(20));
    // v15 (4.3): the run is over when both players have taken their attempts, and every hand-over waits for a tap
    if(this.two.on){ if(this.two.over()) return this.ctx.emit('finish',this.two.record()); return this.two.gate(this,()=>{ this.st='arm'; this.hid()?this.hidden():this.watch(); }); }
    if(this.out||(!this.streak()&&this.round>this.ctx.len)) return this.ctx.emit('finish',this.result()); this.hud(); this.st='arm'; this.hid()?this.hidden():this.watch(); },
  watch(){ this.target=this.streak()?this.rampAt(this.round):Math.round((this.targets[this.round-1]||7)*100)/100;
    // v14 (6.18): every target adds to a visible running total of the time the game has asked for, and it lands exactly on the
    // stated average — the player can see the run was never given a harder deal than anybody else's
    const was=this.asked; this.asked=Math.round((this.asked+this.target)*100)/100;
    $('#gen').innerHTML=`<div class="tmtarget">${CP.target}<b>${f2(this.target)}</b><u id="tmasked"></u></div><div class="tmclock" id="tmclock">0.00</div><div class="glbl bot" id="tmhint">${CP.stop}</div>`;
    // a pass & play run has no stated total to measure against — the two players do not share one — so it reads the plain line
    hud.countUp({ from:was, to:this.asked, ms:600, fmt:v=>this.streak()||this.two.on?T(CP.asked,{tot:f2(v)}):T(CP.askedSet,{tot:f2(v),all:f2(this.askTot())}), set:t=>{ const el=$('#tmasked'); if(el) el.textContent=t; }, alive:()=>this.st==='arm'||this.st==='run' });
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
    $('#gen').innerHTML=`<div class="glbl top" id="tmsay" style="z-index:3">${CP.marker}</div><div id="tmball" style="--fsz:${size}px;transform:translate(${p0.x}px,${p0.y}px)"></div><div id="tmghost" style="--fsz:${size}px"></div><div id="tmwall" style="${wall}"></div><div id="tmmark" style="--fsz:${size}px;left:${m.x}px;top:${m.y}px"></div>`;
    this.ball={t:0,v,markT,size,pos,wall:wallStart}; this.stopAt=0;
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmball');
      const loop=now=>{ if(this.st!=='run') return; let t=(now-this.t0)/1000*v;
        // v14 (6.20): the ball stops at the far edge of the screen. It used to keep going until it was well off it, which read as a bug
        if(t>=L){ t=L; if(!this.stopAt) this.stopAt=now; }
        this.ball.t=t; const p=pos(t); el.style.transform=`translate(${p.x}px,${p.y}px)`;
        // v14 (6.21): the prompt says its piece and goes the moment the ball is behind the wall — it does not sit there all round
        if(t>=wallStart){ const say=$('#tmsay'); if(say) say.remove(); }
        if(this.stopAt&&now-this.stopAt>700) return this.onDown(true);
        this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },600); },
  onDown(ev){ if(this.st!=='run') return;
    // v14 (6.19): nothing to judge until the ball is behind the wall, so a tap before that is ignored rather than scored
    if(this.hid()&&this.ball&&ev!==true&&this.ball.t<this.ball.wall) return;
    this.st='show'; cancelAnimationFrame(this.raf); const now=performance.now(); let err, note;
    // hidden (v10): scored in pixels between the ball and the marker — dead on within 10px, close within 35px
    const hid=this.hid();
    if(hid){ const b=this.ball; const off=b.t-b.markT; err=Math.round(Math.abs(off)); note=off>0?CP.late:CP.early; $('#tmwall').style.opacity=.12; const g=$('#tmghost'), p=b.pos(b.t); g.style.left=p.x+'px'; g.style.top=p.y+'px'; g.style.opacity=1; }
    else { const e=(now-this.t0)/1000; err=Math.abs(e-this.target); note=e>this.target?CP.late:CP.early; const el=$('#tmclock'); el.style.opacity=1; el.textContent=f2(e); err=Math.round(err*100)/100; }
    this.errs.push(err);
    if(this.streak()) hud.score(String(this.errs.length));
    // v13 (8.4): Hidden shows every round's result — px off, dead on / early / late — then moves on
    const good=hid?err<=10:err<=.1, ok=hid?err<=35:err<=.3;
    $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot" id="tmres"><b class="${good?'g':ok?'':'r'}" id="tmerr">${hid?err+'px':f2(err)+'s'}</b>${good?CP.dead:ok?CP.close:note}</div>`); const h=$('#tmhint'); if(h) h.remove();
    ok?this.ctx.audio.hit():this.ctx.audio.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30);
    if(this.two.on) return this.twoAdd(err,hid);
    if(this.streak()) return this.addUp(err,hid);
    // v14 (6.1 / 6.3): the Set figure walks to its new value — total px on Hidden, average seconds off on Stopwatch — and then
    // the result stays up until it is tapped
    const past=this.errs.slice(0,-1); const was=past.length?(hid?sum(past):mean(past)):0, to=hid?sum(this.errs):mean(this.errs);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:600, fmt:v=>hid?Math.round(v)+'px':f2(v)+'s', set:t=>hud.score(t), alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); },
  // v15 (4.3): the attempt belongs to whoever is holding the phone — their own figure walks, and the turn ends with it
  twoAdd(err,hid){ const p=this.two.p, was=this.two.scoreOf(p); this.two.add(err); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:600, fmt:v=>hid?Math.round(v)+'px':f2(v)+'s', set:t=>hud.score(t), alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.after(()=>this.next()); } }); },
  // v13 (8.2 / 8.3): the attempt's figure counts down to 0 while the running total counts up by the same amount, together, with the whoosh (6.7)
  addUp(err,hid){ hud.addUp({ audio:this.ctx.audio, from:this.tot, err, ms:800, el:$('#tmerr'), fmt:v=>hid?Math.round(v)+'px':f2(v)+'s', alive:()=>this.st==='show',
      onFrame:tot=>{ this.tot=tot; hud.time(T(CP.hudStreak,{n:this.round,tot:this.totTxt(),bud:this.budTxt()})); },
      done:tot=>{ this.tot=tot; if(this.tot>=this.budget()) this.out=true; this.hud();
        if(this.out){ const r=$('#tmres'); if(r) r.insertAdjacentHTML('beforeend',`<br>${T(CP.over,{bud:this.budTxt()})}`); }
        this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); } });

export default TM;
export { TM };
