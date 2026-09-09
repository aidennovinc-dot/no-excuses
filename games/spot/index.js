/* No Excuses — Spot — Count and Find
   Split out of index.html at build 12. Rebuilt for build 13: the ramp is the difficulty, and both modes are Set or Streak.
   Build 17 (refactor stage 3): the engine contract, on the round base. */

import { SPOT as CP } from "../../config/copy.js";
import { SHAPE_WORD, SPOT_FIND, SPOT_RAMP, VS_TARGET } from "../../config/games.js";
import { $, $$, T, f2, minMax, pWho, shapeI, winner } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml } from "../_shared/round.js";
import { turnsOf } from "../_shared/two.js";
/* Spot (v8) — Count: shapes flash up, count the ones you were shown; decoys, count and flash length all ramp through the run. Find: one shape is different, tap it.
   v13 (10.1–10.3): Normal / Hard are gone — round number IS the difficulty. Count scores total miscount, Find cumulative seconds; both lower is better.
   Set = 10 rounds. Streak = a budget: 5 miscounts for Count, 10 seconds for Find, and the score is rounds. */
const SP=Object.assign(roundEngine(),{ id:'spot', right:0, wrong:0, answer:0, pts:[], size:40, times:[], pen:0, t0:0, odd:'', target:'circle', flash:0, bestFlash:0, two:false, vs:false, o1:'', o2:'', picks:[null,null], pickT:[0,0], vsN:[0,0], off:0, tot:0,
  find(){ return this.ctx.mode==='find'; },
  // Count's two-player is ten shared rounds — both players answer the same flash — and the ten now comes off PASS_TURNS
  // rather than being written into the engine twice (v15 §4)
  twoLen(){ return turnsOf(this.ctx.game,this.ctx.mode)[0]; },
  // v15 (4.6): Find gains versus — two odd shapes in one crowd, one each, first to find theirs takes the round
  begin(){ this.round=0; this.right=0; this.wrong=0; this.times=[]; this.bestFlash=0; this.off=0; this.tot=0; this.two=this.ctx.players===1&&this.ctx.mode==='count'; this.vs=this.ctx.players===2&&this.find(); this.vsN=[0,0]; hud.score(this.find()?'0.00':'0'); hud.scoreVisible(!(this.two||this.vs)); if(this.vs) return this.vsFindRound(); this.next(); },
  // Find's crowd still grows across ten rounds; a Streak holds at the round-10 crowd
  p(){ return Math.min(1,(this.round-1)/9); },
  // v13 (10.1): round r deals 2 + floor(r/2) targets (cap 12) and floor(r/1.5) decoys (cap 10); the flash falls from 1340ms to 350ms;
  // from round 6 the shapes drift, from round 9 they turn as well, and everything shrinks as the count grows
  ramp(r){ const R=SPOT_RAMP; return { n:Math.min(R.nCap,R.nBase+Math.floor(r/R.nPer)), decoys:Math.min(R.decoyCap,Math.floor(r/R.decoyDiv)), flash:Math.max(R.flashMin,R.flashMax-R.flashPer*r), drift:r>=R.driftFrom?R.driftBase+(r-R.driftFrom)*R.driftPer:0, spin:r>=R.spinFrom?R.spinBase+(r-R.spinFrom)*R.spinPer:0 }; },
  result(){ const x=this.bestFlash, [best,worst]=minMax(this.times);
    if(this.find()) return this.streak()?{hits:this.times.length,misses:this.wrong,x:best,y:worst,lim:'10s'}:{hits:Math.round(this.tot*100)/100,misses:this.wrong,x:best,y:worst};
    const rounds=Math.max(0,this.round-1);
    return this.streak()?{hits:rounds,misses:this.wrong,x,y:this.worstOff||0,rounds,lim:'5 miscounts'}:{hits:this.off,misses:this.wrong,x,y:this.worstOff||0,rounds}; },
  next(){ this.clearT(); this.round++;
    if(this.find()){ if(this.streak()){ if(this.tot>=10) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudFindStreak,{n:this.round,tot:f2(this.tot)})); }
      else { if(this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudFind,{n:this.round,s:this.ctx.len,tot:f2(this.tot)})); }
      return this.findRound(); }
    if(this.two){ if(this.round>this.twoLen()) return this.twoEnd(); hud.time(T(CP.hudTwo,{n:this.round,s:this.twoLen()})); return this.countRound(); }
    if(this.streak()){ if(this.off>=5) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudCountStreak,{n:this.round,off:this.off})); }
    else { if(this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudCount,{n:this.round,s:this.ctx.len,off:this.off})); }
    this.countRound(); },
  countRound(){ const r=genRect(), R=this.ramp(this.round); const all=['circle','square','tri']; this.target=all[rnd(3)]; const rest=all.filter(s=>s!==this.target);
    const n=R.n, decoys=R.decoys; this.flash=R.flash;
    this.size=Math.max(20,Math.min(r.width,r.height)*.1*Math.min(1,Math.sqrt(6/(n+decoys))));
    const list=Array.from({length:n},()=>this.target).concat(Array.from({length:decoys},()=>rest[rnd(2)])); this.pts=scatter(list.length,[this.target],this.size); this.pts.forEach((q,i)=>q.shape=list[i]||this.target); this.answer=this.pts.filter(q=>q.shape===this.target).length;
    for(let i=this.pts.length-1;i>0;i--){ const j=rnd(i+1); const t=this.pts[i].shape; this.pts[i].shape=this.pts[j].shape; this.pts[j].shape=t; }
    this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*R.drift; q.vy=(Math.random()-.5)*R.drift; q.a=0; q.va=(Math.random()-.5)*R.spin; });
    this.st='wait'; $('#gen').innerHTML=''; rxBar([...CP.count,shapeI(this.target),`<b>${SHAPE_WORD[this.target]}s</b>`]);
    this.later(()=>{ this.st='flash'; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); if(R.drift||R.spin) this.move('flash'); this.later(()=>this.ask(),this.flash); },1500); },
  // drift and spin share one loop; it dies the moment the state moves on
  move(state){ const els=$$('#gen .fs'), r=genRect(); let last=performance.now(); const loop=now=>{ if(this.st!==state) return; const dt=(now-last)/1000; last=now;
      if(state==='find'){ const c=$('#spclock'); if(c) c.textContent=f2((now-this.t0)/1000); }
      this.pts.forEach((q,i)=>{ q.x+=(q.vx||0)*dt; q.y+=(q.vy||0)*dt; q.a=(q.a||0)+(q.va||0)*dt; if(q.x<0||q.x>r.width-this.size) q.vx*=-1; if(q.y<r.height*.08||q.y>r.height-this.size) q.vy*=-1;
        const el=els[i]; if(!el) return; el.style.left=q.x+'px'; el.style.top=q.y+'px'; if(q.va) el.style.rotate=q.a+'deg'; });
      this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  keypad(){ return `<div class="pad-num">${Array.from({length:15},(_,i)=>`<button data-num="${i}">${i}</button>`).join('')}</div>`; },
  ask(){ this.st='ask'; this.t0=performance.now(); cancelAnimationFrame(this.raf); if(this.two){ this.picks=[null,null]; $('#gen').innerHTML=`<div class="vz top p2" id="vz1">${this.keypad()}</div><div class="vmid">${CP.howMany}<br><b>${pWho(0)} ${this.vsN[0]} · ${this.vsN[1]} ${pWho(1)}</b></div><div class="vz bot p1" id="vz0">${this.keypad()}</div>`; this.later(()=>this.twoJudge(),7000); return; }
    $('#gen').innerHTML=`<div class="glbl top" style="top:14%">${CP.howMany}</div>${this.keypad()}`; },
  findRound(){ const p=this.p(), r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*(.085-p*.025)); this.pen=0;
    const all=['circle','square','tri']; this.odd=all[rnd(3)]; const rest=all.filter(s=>s!==this.odd); const n=SPOT_FIND.nBase+Math.round(p*SPOT_FIND.nSpan), drift=p*SPOT_FIND.drift;
    this.pts=scatter(n,rest,this.size,this.odd); this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; q.va=0; });
    this.st='wait'; $('#gen').innerHTML=''; rxBar([...CP.find,shapeI(this.odd),`<b>${SHAPE_WORD[this.odd]}</b>`]);
    // v14 (6.31): the round's own clock runs in large grey type behind the crowd, so the cost of staring is visible while you stare
    this.later(()=>{ this.st='find'; this.t0=performance.now(); $('#gen').innerHTML=`<div class="spclock" id="spclock">0.00</div>`+this.pts.map(q=>shapeHtml(q,this.size)).join(''); this.move('find'); },1400); },
  // Count with a friend (v11): both see the same flash and each picks a count on their own keypad. A right pick scores by speed — but the second player has 0.35s of leeway: a right answer within 0.35s of the first right answer is a tie and both score. 10 rounds
  twoPick(ev){ const b=ev.el.closest('[data-num]'); if(!b) return; const z=b.closest('.vz'); const p=z&&z.id==='vz1'?1:0; if(this.picks[p]!==null) return; this.picks[p]=+b.dataset.num; this.pickT[p]=performance.now()-this.t0; b.classList.add('sel'); z.classList.add('done'); this.ctx.audio.select(); if(this.picks[0]!==null&&this.picks[1]!==null){ this.clearT(); this.twoJudge(); } },
  twoJudge(){ this.st='show'; const ok=[this.picks[0]===this.answer,this.picks[1]===this.answer]; let pts=[0,0], line;
    if(ok[0]&&ok[1]){ const d=this.pickT[0]-this.pickT[1]; if(Math.abs(d)<=350){ pts=[1,1]; line=CP.tie; } else { const w=d<0?0:1; pts[w]=1; line=T(CP.faster,{n:w+1}); } }
    else if(ok[0]||ok[1]){ const w=ok[0]?0:1; pts[w]=1; line=T(CP.had,{n:w+1}); } else line=CP.nobody;
    this.vsN[0]+=pts[0]; this.vsN[1]+=pts[1]; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b>${this.answer}</b>${line}<br><span class="p1">${this.picks[0]===null?'—':this.picks[0]}</span> · <span class="p2">${this.picks[1]===null?'—':this.picks[1]}</span></div>`; (pts[0]||pts[1])?this.ctx.audio.hit():this.ctx.audio.miss(); this.later(()=>this.next(),1600); },
  twoEnd(){ const [a,b]=this.vsN; const w=winner(a,b); $('#gen').innerHTML=`<div class="glbl top" style="top:40%"><b class="${w<0?'':w?'p2':'p1'}">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b>${a} – ${b}</div>`; this.ctx.audio.end(); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:T(CP.over10,{a,b,s:this.twoLen()})}}),1600); },
  /* v15 (4.6) — Find versus. Two odd shapes sit in one crowd, one for each player. They are the SAME colour as everything
     else, because colouring them would hand both players the answer and end the game — so the rule bar is the only place
     the two are told which shape is theirs, in their own colours (L4). Whoever taps a shape first scores it for its owner,
     the convention Dots versus already uses for a tap on the other player's dot. First to VS_TARGET rounds takes the match. */
  vsTarget(){ return VS_TARGET[this.ctx.game]||5; },
  vsFindRound(){ this.clearT(); this.round++;
    if(this.vsN[0]>=this.vsTarget()||this.vsN[1]>=this.vsTarget()) return this.vsEnd();
    const p=this.p(), r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*(.085-p*.025));
    const all=['circle','square','tri'], i=rnd(3); this.o1=all[i]; this.o2=all[(i+1)%3]; const base=all[(i+2)%3];
    const n=SPOT_FIND.nBase+Math.round(p*SPOT_FIND.nSpan), drift=p*SPOT_FIND.drift;
    this.pts=scatter(n,[base],this.size); this.pts.forEach(q=>{ q.shape=base; q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; q.va=0; });
    const a=rnd(this.pts.length); let b=rnd(this.pts.length); for(let k=0;k<12&&b===a;k++) b=rnd(this.pts.length); if(b===a) b=(a+1)%this.pts.length;
    this.pts[a].shape=this.o1; this.pts[b].shape=this.o2;
    hud.timeHtml(T(CP.vsRound,{n:this.round,t:this.vsTarget()}));
    this.st='wait'; $('#gen').innerHTML=''; rxBar([pWho(0),shapeI(this.o1),`<b>${SHAPE_WORD[this.o1]}</b>`,'·',pWho(1),shapeI(this.o2),`<b>${SHAPE_WORD[this.o2]}</b>`]);
    this.later(()=>{ this.st='vsfind'; this.t0=performance.now();
      $('#gen').innerHTML=`<div class="vz top p2">${pWho(1)}<b>${this.vsN[1]}</b></div><div class="vz bot p1">${pWho(0)}<b>${this.vsN[0]}</b></div>`+this.pts.map(q=>shapeHtml(q,this.size)).join('');
      this.move('vsfind'); },1400); },
  vsTap(ev){ const r=genRect(); const x=ev.x-r.left, y=ev.y-r.top; let best=null, bd=1e9;
    this.pts.forEach((q,i)=>{ const d=Math.hypot(x-(q.x+this.size/2),y-(q.y+this.size/2)); if(d<bd){ bd=d; best=i; } });
    if(best===null||bd>this.size*.95) return; const els=$$('#gen .fs'); const sh=this.pts[best].shape;
    if(sh!==this.o1&&sh!==this.o2){ els[best].classList.add('bad'); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(30); return; }
    const w=sh===this.o1?0:1; this.st='show'; cancelAnimationFrame(this.raf); this.vsN[w]++;
    els[best].classList.add('odd'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); });
    $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${w?'p2':'p1'}">${T(CP.vsTook,{n:w+1})}</b>${f2((performance.now()-this.t0)/1000)}s</div>`);
    this.ctx.audio.hit(); this.later(()=>this.vsFindRound(),1500); },
  vsEnd(){ const [a,b]=this.vsN; const w=winner(a,b); this.st='over'; rxBar(null); cancelAnimationFrame(this.raf);
    $('#gen').innerHTML=`<div class="glbl top" style="top:40%"><b class="${w<0?'':w?'p2':'p1'}">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b>${a} – ${b}</div>`;
    this.ctx.audio.end(); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:T(CP.vsHow,{t:this.vsTarget()})}}),1600); },
  onDown(ev){
    if(this.st==='ask'){ if(this.two) return this.twoPick(ev); const b=ev.el.closest('[data-num]'); if(!b) return; const k=+b.dataset.num, ok=k===this.answer;
      // v13 (10.2): the score is total miscount — 2 for 4 costs 2, 6 for 4 costs 2. Lower is better
      const off=Math.abs(k-this.answer); this.st='show'; this.off+=off; this.worstOff=Math.max(this.worstOff||0,off); if(ok) this.right++; else this.wrong++;
      if(ok) this.bestFlash=this.bestFlash?Math.min(this.bestFlash,this.flash):this.flash;
      hud.score(this.streak()?String(Math.max(0,this.round-1)):String(this.off));
      const done=this.streak()?this.off>=5:this.round>=this.ctx.len;
      // v15 (3.9 answer, build 25): Count does not hold its result — one number is not a complicated result. The correct
      // count is FLASHED so it registers and the round moves on by itself 600ms after the walk, instead of the 900ms
      // every other dropped cue got. `cflash` is the flash; the number is the only thing on the card that has to land
      $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b class="cflash ${ok?'g':'r'}">${this.answer}</b>${ok?CP.right:T(CP.said,{k,off})}${this.streak()?T(CP.of5,{off:this.off}):''}${done&&this.streak()?CP.over:''}</div>`;
      ok?this.ctx.audio.hit():this.ctx.audio.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30);
      // v14 (6.1 / 6.3): the round's miscount walks into the running total — the Set's score, the Streak's budget — and the
      // reveal then stays up until it is tapped
      hud.countUp({ audio:off?this.ctx.audio:null, from:this.off-off, to:this.off, ms:480, fmt:v=>String(Math.round(v)), alive:()=>this.st==='show',
        set:t=>{ if(this.streak()) hud.time(T(CP.hudCountStreak,{n:this.round,off:t})); else hud.score(t); },
        done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next(),600); } }); return; }
    if(this.st==='vsfind') return this.vsTap(ev);
    if(this.st!=='find') return; const r=genRect(); const x=ev.x-r.left, y=ev.y-r.top; let best=null, bd=1e9; this.pts.forEach((q,i)=>{ const d=Math.hypot(x-(q.x+this.size/2),y-(q.y+this.size/2)); if(d<bd){ bd=d; best=i; } }); if(best===null||bd>this.size*.95) return;
    const els=$$('#gen .fs'); if(this.pts[best].shape===this.odd){ this.st='show'; cancelAnimationFrame(this.raf); const t=Math.round(((performance.now()-this.t0)/1000+this.pen)*100)/100; this.times.push(t);
      // v13 (10.3): Set totals the seconds over ten rounds; a Streak spends a 10-second budget and scores the rounds it bought
      // v14 (6.30): the first half-second is free, and anything under it comes OFF the total — a fast find pays you back
      const add=Math.round((t-SPOT_FIND.leeway)*100)/100, was=this.tot; this.tot=Math.round((this.tot+add)*100)/100;
      if(this.streak()) hud.score(String(this.times.length));
      els[best].classList.add('odd'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); });
      const cl=$('#spclock'); if(cl) cl.remove();
      $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${t<2?'g':''}" id="spt">0.00s</b><span id="sptot">${this.streak()?T(CP.of10,{t:f2(was)}):T(CP.total,{t:f2(was)})}</span>${this.pen?T(CP.pen,{pen:this.pen}):''}${add<0?T(CP.fast,{n:f2(-add)}):''}</div>`); this.ctx.audio.hit();
      // v14 (6.32 / 6.1): the time taken runs up incrementally and walks into the total; (6.3) the result then waits for a tap
      hud.countUp({ audio:this.ctx.audio, from:0, to:1, ms:900, fmt:v=>v, alive:()=>this.st==='show',
        set:k=>{ const b=$('#spt'); if(b) b.textContent=f2(t*k)+'s'; const u=$('#sptot'); if(u) u.textContent=this.streak()?T(CP.of10,{t:f2(was+add*k)}):T(CP.total,{t:f2(was+add*k)}); },
        done:()=>{ hud.score(this.streak()?String(this.times.length):f2(this.tot)); hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); }
    else { this.wrong++; this.pen+=1; els[best].classList.add('bad'); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(30); } } });

export default SP;
export { SP };
