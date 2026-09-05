/* No Excuses — Spot — Count and Find
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { finish, pts } from "../app.js";
import { Snd } from "../audio.js";
import { $, $$, SHAPE_WORD, f2, mean, pWho, shapeI } from "../core.js";
import { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml } from "./round.js";
import { sel } from "../menu.js";
import { liveCheck } from "../progress.js";
/* Spot (v8) — Count: shapes flash up, count the ones you were shown; decoys, count and flash length all ramp through the run. Find: one shape is different, tap it; the crowd grows and drifts more each round. Count scores rounds right; Find scores seconds per find */
const SP=Object.assign(roundEngine(),{ right:0, wrong:0, answer:0, pts:[], size:40, times:[], pen:0, t0:0, odd:'', target:'circle', flash:0, bestFlash:0, two:false, picks:[null,null], pickT:[0,0], vsN:[0,0],
  begin(){ this.round=0; this.right=0; this.wrong=0; this.times=[]; this.bestFlash=0; this.two=sel.vs===1&&sel.diff==='count'; this.vsN=[0,0]; $('#score').textContent=sel.diff==='find'?'0.00':'0'; $('#score').style.visibility=this.two?'hidden':''; this.next(); },
  p(){ return sel.secs>1?(this.round-1)/(sel.secs-1):1; },
  // Count (v11): a human model of the flash. 500ms + 220ms a target + 70ms a decoy to start; difficulty ramps by shrinking those multipliers first (to 120 / 40), and only then by adding shapes — never both in one step. Normal starts at 2–4 targets and 0–2 decoys; Hard starts where Normal's round 8 sits. Three mistakes end the run; score is rounds right
  level(){ return this.round-1+(sel.secs===2&&!this.two?7:0); },
  result(){ return {hits:this.right,misses:this.wrong,x:this.bestFlash,y:0}; },
  next(){ this.clearT(); this.round++;
    if(sel.diff==='find'){ if(this.round>sel.secs) return finish({hits:Math.round(mean(this.times)*100)/100,misses:this.wrong,x:Math.min(...this.times),y:Math.max(...this.times)}); this.hud(); return this.findRound(); }
    if(this.two){ if(this.round>10) return this.twoEnd(); $('#hud-time').textContent=`round ${this.round} / 10`; return this.countRound(); }
    if(this.wrong>=3) return finish(this.result()); $('#hud-time').textContent=`round ${this.round} · ${this.wrong} of 3 wrong`; this.countRound(); },
  countRound(){ const k=this.level(), r=genRect(); const all=['circle','square','tri']; this.target=all[rnd(3)]; const rest=all.filter(s=>s!==this.target);
    const tm=Math.max(120,220-20*k), dm=Math.max(40,70-6*k), add=Math.max(0,k-5); const n=2+rnd(3)+Math.ceil(add/2), decoys=rnd(3)+Math.floor(add/2); this.answer=n; this.flash=Math.round(500+tm*n+dm*decoys);
    this.size=Math.max(22,Math.min(r.width,r.height)*.1*Math.min(1,Math.sqrt(6/(n+decoys))));
    const list=Array.from({length:n},()=>this.target).concat(Array.from({length:decoys},()=>rest[rnd(2)])); this.pts=scatter(list.length,[this.target],this.size); this.pts.forEach((q,i)=>q.shape=list[i]||this.target); this.answer=this.pts.filter(q=>q.shape===this.target).length; for(let i=this.pts.length-1;i>0;i--){ const j=rnd(i+1); const t=this.pts[i].shape; this.pts[i].shape=this.pts[j].shape; this.pts[j].shape=t; }
    this.st='wait'; $('#gen').innerHTML=''; rxBar(['count','the',shapeI(this.target),`<b>${SHAPE_WORD[this.target]}s</b>`]);
    this.later(()=>{ this.st='flash'; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); this.later(()=>this.ask(),this.flash); },1500); },
  keypad(){ return `<div class="pad-num">${Array.from({length:15},(_,i)=>`<button data-num="${i}">${i}</button>`).join('')}</div>`; },
  ask(){ this.st='ask'; this.t0=performance.now(); if(this.two){ this.picks=[null,null]; $('#gen').innerHTML=`<div class="vz top p2" id="vz1">${this.keypad()}</div><div class="vmid">how many?<br><b>${pWho(0)} ${this.vsN[0]} · ${this.vsN[1]} ${pWho(1)}</b></div><div class="vz bot p1" id="vz0">${this.keypad()}</div>`; this.later(()=>this.twoJudge(),7000); return; }
    $('#gen').innerHTML=`<div class="glbl top" style="top:14%">how many?</div>${this.keypad()}`; },
  findRound(){ const p=this.p(), r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*(.085-p*.025)); this.pen=0;
    const all=['circle','square','tri']; this.odd=all[rnd(3)]; const rest=all.filter(s=>s!==this.odd); const n=16+Math.round(p*44), drift=p*26;
    this.pts=scatter(n,rest,this.size,this.odd); this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; });
    this.st='wait'; $('#gen').innerHTML=''; rxBar(['find','the',shapeI(this.odd),`<b>${SHAPE_WORD[this.odd]}</b>`]);
    this.later(()=>{ this.st='find'; this.t0=performance.now(); $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); if(drift) this.drift(); },1400); },
  drift(){ const els=$$('#gen .fs'), r=genRect(); let last=performance.now(); const loop=now=>{ if(this.st!=='find') return; const dt=(now-last)/1000; last=now; this.pts.forEach((q,i)=>{ q.x+=q.vx*dt; q.y+=q.vy*dt; if(q.x<0||q.x>r.width-this.size) q.vx*=-1; if(q.y<r.height*.08||q.y>r.height-this.size) q.vy*=-1; els[i].style.left=q.x+'px'; els[i].style.top=q.y+'px'; }); this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  // Count with a friend (v11): both see the same flash and each picks a count on their own keypad. A right pick scores by speed — but the second player has 0.35s of leeway: a right answer within 0.35s of the first right answer is a tie and both score. 10 rounds
  twoPick(e){ const b=e.target.closest('[data-num]'); if(!b) return; const z=b.closest('.vz'); const p=z&&z.id==='vz1'?1:0; if(this.picks[p]!==null) return; this.picks[p]=+b.dataset.num; this.pickT[p]=performance.now()-this.t0; b.classList.add('sel'); z.classList.add('done'); Snd.select(); if(this.picks[0]!==null&&this.picks[1]!==null){ this.clearT(); this.twoJudge(); } },
  twoJudge(){ this.st='show'; const ok=[this.picks[0]===this.answer,this.picks[1]===this.answer]; let pts=[0,0], line;
    if(ok[0]&&ok[1]){ const d=this.pickT[0]-this.pickT[1]; if(Math.abs(d)<=350){ pts=[1,1]; line='both right · a tie'; } else { const w=d<0?0:1; pts[w]=1; line=`both right · Player ${w+1} was faster`; } }
    else if(ok[0]||ok[1]){ const w=ok[0]?0:1; pts[w]=1; line=`Player ${w+1} had it`; } else line='nobody had it';
    this.vsN[0]+=pts[0]; this.vsN[1]+=pts[1]; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b>${this.answer}</b>${line}<br><span class="p1">${this.picks[0]===null?'—':this.picks[0]}</span> · <span class="p2">${this.picks[1]===null?'—':this.picks[1]}</span></div>`; (pts[0]||pts[1])?Snd.hit():Snd.miss(); this.later(()=>this.next(),1600); },
  twoEnd(){ const [a,b]=this.vsN; const w=a>b?0:b>a?1:-1; $('#gen').innerHTML=`<div class="glbl top" style="top:40%"><b class="${w<0?'':w?'p2':'p1'}">${w<0?'draw':'Player '+(w+1)+' wins'}</b>${a} – ${b}</div>`; Snd.end(); this.later(()=>finish({hits:a,misses:0,vs2:{a,b,w,how:`${a}–${b} over 10 rounds`}}),1600); },
  onDown(e){
    if(this.st==='ask'){ if(this.two) return this.twoPick(e); const b=e.target.closest('[data-num]'); if(!b) return; const k=+b.dataset.num, ok=k===this.answer; this.st='show'; ok?this.right++:this.wrong++; if(ok) this.bestFlash=this.bestFlash?Math.min(this.bestFlash,this.flash):this.flash; $('#score').textContent=this.right; if(ok) liveCheck(this.result());
      $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b class="${ok?'g':'r'}">${this.answer}</b>${ok?'right':'you said '+k+(this.wrong>=3?' · three wrong · run over':` · ${this.wrong} of 3 wrong`)}</div>`; ok?Snd.hit():Snd.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30); this.later(()=>this.next(),1300); return; }
    if(this.st!=='find') return; const r=genRect(); const x=e.clientX-r.left, y=e.clientY-r.top; let best=null, bd=1e9; this.pts.forEach((q,i)=>{ const d=Math.hypot(x-(q.x+this.size/2),y-(q.y+this.size/2)); if(d<bd){ bd=d; best=i; } }); if(best===null||bd>this.size*.95) return;
    const els=$$('#gen .fs'); if(this.pts[best].shape===this.odd){ this.st='show'; cancelAnimationFrame(this.raf); const t=Math.round(((performance.now()-this.t0)/1000+this.pen)*100)/100; this.times.push(t); $('#score').textContent=f2(mean(this.times)); els[best].classList.add('odd'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); }); $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${t<2?'g':''}">${f2(t)}s</b>${this.pen?'incl. +'+this.pen+'s for wrong taps':''}</div>`); Snd.hit(); this.later(()=>this.next(),1000); }
    else { this.wrong++; this.pen+=1; els[best].classList.add('bad'); Snd.miss(); if(navigator.vibrate) navigator.vibrate(30); } } });


export { SP };
