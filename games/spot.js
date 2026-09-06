/* No Excuses — Spot — Count and Find
   Split out of index.html at build 12. Rebuilt for build 13: the ramp is the difficulty, and both modes are Set or Streak. */

import { finish, liveCheck } from "../app.js";
import { Snd } from "../audio.js";
import { $, $$, SHAPE_WORD, STREAK, f2, pWho, shapeI } from "../core.js";
import { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml } from "./round.js";
import { sel } from "../core/state.js";
/* Spot (v8) — Count: shapes flash up, count the ones you were shown; decoys, count and flash length all ramp through the run. Find: one shape is different, tap it.
   v13 (10.1–10.3): Normal / Hard are gone — round number IS the difficulty. Count scores total miscount, Find cumulative seconds; both lower is better.
   Set = 10 rounds. Streak = a budget: 5 miscounts for Count, 10 seconds for Find, and the score is rounds. */
const SP=Object.assign(roundEngine(),{ right:0, wrong:0, answer:0, pts:[], size:40, times:[], pen:0, t0:0, odd:'', target:'circle', flash:0, bestFlash:0, two:false, picks:[null,null], pickT:[0,0], vsN:[0,0], off:0, tot:0,
  streak(){ return sel.secs===STREAK; }, find(){ return sel.diff==='find'; },
  begin(){ this.round=0; this.right=0; this.wrong=0; this.times=[]; this.bestFlash=0; this.off=0; this.tot=0; this.two=sel.vs===1&&sel.diff==='count'; this.vsN=[0,0]; $('#score').textContent=this.find()?'0.00':'0'; $('#score').style.visibility=this.two?'hidden':''; this.next(); },
  // Find's crowd still grows across ten rounds; a Streak holds at the round-10 crowd
  p(){ return Math.min(1,(this.round-1)/9); },
  // v13 (10.1): round r deals 2 + floor(r/2) targets (cap 12) and floor(r/1.5) decoys (cap 10); the flash falls from 1340ms to 350ms;
  // from round 6 the shapes drift, from round 9 they turn as well, and everything shrinks as the count grows
  ramp(r){ return { n:Math.min(12,2+Math.floor(r/2)), decoys:Math.min(10,Math.floor(r/1.5)), flash:Math.max(350,1400-60*r), drift:r>=6?10+(r-6)*5:0, spin:r>=9?18+(r-9)*7:0 }; },
  result(){ const x=this.bestFlash, best=this.times.length?Math.min(...this.times):0, worst=this.times.length?Math.max(...this.times):0;
    if(this.find()) return this.streak()?{hits:this.times.length,misses:this.wrong,x:best,y:worst,lim:'10s'}:{hits:Math.round(this.tot*100)/100,misses:this.wrong,x:best,y:worst};
    const rounds=Math.max(0,this.round-1);
    return this.streak()?{hits:rounds,misses:this.wrong,x,y:this.worstOff||0,rounds,lim:'5 miscounts'}:{hits:this.off,misses:this.wrong,x,y:this.worstOff||0,rounds}; },
  next(){ this.clearT(); this.round++;
    if(this.find()){ if(this.streak()){ if(this.tot>=10) return finish(this.result()); $('#hud-time').textContent=`Round ${this.round} · ${f2(this.tot)}s of 10s`; }
      else { if(this.round>sel.secs) return finish(this.result()); $('#hud-time').textContent=`Round ${this.round} of ${sel.secs} · ${f2(this.tot)}s`; }
      return this.findRound(); }
    if(this.two){ if(this.round>10) return this.twoEnd(); $('#hud-time').textContent=`round ${this.round} / 10`; return this.countRound(); }
    if(this.streak()){ if(this.off>=5) return finish(this.result()); $('#hud-time').textContent=`Round ${this.round} · ${this.off} of 5 off`; }
    else { if(this.round>sel.secs) return finish(this.result()); $('#hud-time').textContent=`Round ${this.round} of ${sel.secs} · ${this.off} off`; }
    this.countRound(); },
  countRound(){ const r=genRect(), R=this.ramp(this.round); const all=['circle','square','tri']; this.target=all[rnd(3)]; const rest=all.filter(s=>s!==this.target);
    const n=R.n, decoys=R.decoys; this.flash=R.flash;
    this.size=Math.max(20,Math.min(r.width,r.height)*.1*Math.min(1,Math.sqrt(6/(n+decoys))));
    const list=Array.from({length:n},()=>this.target).concat(Array.from({length:decoys},()=>rest[rnd(2)])); this.pts=scatter(list.length,[this.target],this.size); this.pts.forEach((q,i)=>q.shape=list[i]||this.target); this.answer=this.pts.filter(q=>q.shape===this.target).length;
    for(let i=this.pts.length-1;i>0;i--){ const j=rnd(i+1); const t=this.pts[i].shape; this.pts[i].shape=this.pts[j].shape; this.pts[j].shape=t; }
    this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*R.drift; q.vy=(Math.random()-.5)*R.drift; q.a=0; q.va=(Math.random()-.5)*R.spin; });
    this.st='wait'; $('#gen').innerHTML=''; rxBar(['count','the',shapeI(this.target),`<b>${SHAPE_WORD[this.target]}s</b>`]);
    this.later(()=>{ this.st='flash'; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); if(R.drift||R.spin) this.move('flash'); this.later(()=>this.ask(),this.flash); },1500); },
  // drift and spin share one loop; it dies the moment the state moves on
  move(state){ const els=$$('#gen .fs'), r=genRect(); let last=performance.now(); const loop=now=>{ if(this.st!==state) return; const dt=(now-last)/1000; last=now;
      this.pts.forEach((q,i)=>{ q.x+=(q.vx||0)*dt; q.y+=(q.vy||0)*dt; q.a=(q.a||0)+(q.va||0)*dt; if(q.x<0||q.x>r.width-this.size) q.vx*=-1; if(q.y<r.height*.08||q.y>r.height-this.size) q.vy*=-1;
        const el=els[i]; if(!el) return; el.style.left=q.x+'px'; el.style.top=q.y+'px'; if(q.va) el.style.rotate=q.a+'deg'; });
      this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  keypad(){ return `<div class="pad-num">${Array.from({length:15},(_,i)=>`<button data-num="${i}">${i}</button>`).join('')}</div>`; },
  ask(){ this.st='ask'; this.t0=performance.now(); cancelAnimationFrame(this.raf); if(this.two){ this.picks=[null,null]; $('#gen').innerHTML=`<div class="vz top p2" id="vz1">${this.keypad()}</div><div class="vmid">how many?<br><b>${pWho(0)} ${this.vsN[0]} · ${this.vsN[1]} ${pWho(1)}</b></div><div class="vz bot p1" id="vz0">${this.keypad()}</div>`; this.later(()=>this.twoJudge(),7000); return; }
    $('#gen').innerHTML=`<div class="glbl top" style="top:14%">how many?</div>${this.keypad()}`; },
  findRound(){ const p=this.p(), r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*(.085-p*.025)); this.pen=0;
    const all=['circle','square','tri']; this.odd=all[rnd(3)]; const rest=all.filter(s=>s!==this.odd); const n=16+Math.round(p*44), drift=p*26;
    this.pts=scatter(n,rest,this.size,this.odd); this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; q.va=0; });
    this.st='wait'; $('#gen').innerHTML=''; rxBar(['find','the',shapeI(this.odd),`<b>${SHAPE_WORD[this.odd]}</b>`]);
    this.later(()=>{ this.st='find'; this.t0=performance.now(); $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); if(drift) this.move('find'); },1400); },
  // Count with a friend (v11): both see the same flash and each picks a count on their own keypad. A right pick scores by speed — but the second player has 0.35s of leeway: a right answer within 0.35s of the first right answer is a tie and both score. 10 rounds
  twoPick(e){ const b=e.target.closest('[data-num]'); if(!b) return; const z=b.closest('.vz'); const p=z&&z.id==='vz1'?1:0; if(this.picks[p]!==null) return; this.picks[p]=+b.dataset.num; this.pickT[p]=performance.now()-this.t0; b.classList.add('sel'); z.classList.add('done'); Snd.select(); if(this.picks[0]!==null&&this.picks[1]!==null){ this.clearT(); this.twoJudge(); } },
  twoJudge(){ this.st='show'; const ok=[this.picks[0]===this.answer,this.picks[1]===this.answer]; let pts=[0,0], line;
    if(ok[0]&&ok[1]){ const d=this.pickT[0]-this.pickT[1]; if(Math.abs(d)<=350){ pts=[1,1]; line='both right · a tie'; } else { const w=d<0?0:1; pts[w]=1; line=`both right · Player ${w+1} was faster`; } }
    else if(ok[0]||ok[1]){ const w=ok[0]?0:1; pts[w]=1; line=`Player ${w+1} had it`; } else line='nobody had it';
    this.vsN[0]+=pts[0]; this.vsN[1]+=pts[1]; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b>${this.answer}</b>${line}<br><span class="p1">${this.picks[0]===null?'—':this.picks[0]}</span> · <span class="p2">${this.picks[1]===null?'—':this.picks[1]}</span></div>`; (pts[0]||pts[1])?Snd.hit():Snd.miss(); this.later(()=>this.next(),1600); },
  twoEnd(){ const [a,b]=this.vsN; const w=a>b?0:b>a?1:-1; $('#gen').innerHTML=`<div class="glbl top" style="top:40%"><b class="${w<0?'':w?'p2':'p1'}">${w<0?'draw':'Player '+(w+1)+' wins'}</b>${a} – ${b}</div>`; Snd.end(); this.later(()=>finish({hits:a,misses:0,vs2:{a,b,w,how:`${a}–${b} over 10 rounds`}}),1600); },
  onDown(e){
    if(this.st==='ask'){ if(this.two) return this.twoPick(e); const b=e.target.closest('[data-num]'); if(!b) return; const k=+b.dataset.num, ok=k===this.answer;
      // v13 (10.2): the score is total miscount — 2 for 4 costs 2, 6 for 4 costs 2. Lower is better
      const off=Math.abs(k-this.answer); this.st='show'; this.off+=off; this.worstOff=Math.max(this.worstOff||0,off); if(ok) this.right++; else this.wrong++;
      if(ok) this.bestFlash=this.bestFlash?Math.min(this.bestFlash,this.flash):this.flash;
      $('#score').textContent=this.streak()?String(Math.max(0,this.round-1)):String(this.off);
      const done=this.streak()?this.off>=5:this.round>=sel.secs;
      $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b class="${ok?'g':'r'}">${this.answer}</b>${ok?'right · 0 off':`you said ${k} · ${off} off`}${this.streak()?` · ${this.off} of 5`:''}${done&&this.streak()?' · run over':''}</div>`;
      ok?Snd.hit():Snd.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30); liveCheck(this.result()); this.later(()=>this.next(),1300); return; }
    if(this.st!=='find') return; const r=genRect(); const x=e.clientX-r.left, y=e.clientY-r.top; let best=null, bd=1e9; this.pts.forEach((q,i)=>{ const d=Math.hypot(x-(q.x+this.size/2),y-(q.y+this.size/2)); if(d<bd){ bd=d; best=i; } }); if(best===null||bd>this.size*.95) return;
    const els=$$('#gen .fs'); if(this.pts[best].shape===this.odd){ this.st='show'; cancelAnimationFrame(this.raf); const t=Math.round(((performance.now()-this.t0)/1000+this.pen)*100)/100; this.times.push(t); this.tot=Math.round((this.tot+t)*100)/100;
      // v13 (10.3): Set totals the seconds over ten rounds; a Streak spends a 10-second budget and scores the rounds it bought
      $('#score').textContent=this.streak()?String(this.times.length):f2(this.tot);
      els[best].classList.add('odd'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); });
      $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${t<2?'g':''}">${f2(t)}s</b>${this.streak()?`${f2(this.tot)}s of 10s`:'total '+f2(this.tot)+'s'}${this.pen?' · incl. +'+this.pen+'s for wrong taps':''}</div>`); Snd.hit(); liveCheck(this.result()); this.later(()=>this.next(),1000); }
    else { this.wrong++; this.pen+=1; els[best].classList.add('bad'); Snd.miss(); if(navigator.vibrate) navigator.vibrate(30); } } });


export { SP };
