/* No Excuses — Reaction — Flash and Go/No-go
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { finish, liveCheck } from "../../app.js";
import { Snd } from "../../audio.js";
import { REACTION as CP } from "../../config/copy.js";
import { SHAPE_WORD, STREAK } from "../../config/games.js";
import { $, $$, T, mean, pWho, shapeI, vmin } from "../../core.js";
import { genRect, rnd, roundEngine, rxBar, rxBox } from "../_shared/round.js";
import { sel } from "../../core/state.js";
/* Reaction — Flash: white after a random wait, tap. Go/No-go (v8): shapes cycle past in different spots; tap the rule shape the moment it shows. A wrong shape ends the run. Score is ms, averaged */
// the clock (v8): t0 is taken two frames after the change is queued, i.e. when it has actually been painted; the tap is timed from the event's own timestamp, not from when the handler ran
const tapTime=e=>{ const n=performance.now(); const ts=e&&e.timeStamp; return ts&&ts<=n+1&&ts>n-5000?ts:n; };
const RX=Object.assign(roundEngine(),{ times:[], faults:0, t0:0, rule:'circle', shown:'', armed:false, dry:0, over:0, out:false, wrong:0, seen:0, vsN:[0,0], vsDone:false,
  streak(){ return sel.secs===STREAK; }, nogo(){ return sel.diff==='nogo'; }, versus(){ return sel.vs===2; },
  begin(){ this.round=0; this.times=[]; this.faults=0; this.over=0; this.out=false; this.wrong=0; this.seen=0; this.vsN=[0,0]; this.vsDone=false; $('#score').textContent='0'; if(this.versus()) return this.vsRound(); if(this.nogo()) return this.nogoBegin(); this.next(); },
  // Flash (v11): Set = 3 attempts, average ms. Streak = every ms above 200 adds to a total; the run ends when it reaches 500, score attempts
  result(){ const x=this.times.length?Math.min(...this.times):0, y=this.times.length?Math.max(...this.times):0; if(this.streak()) return {hits:this.times.length,misses:this.faults,x,y,lim:'500ms'}; return {hits:this.times.length?Math.round(mean(this.times)):0,misses:this.faults,x,y}; },
  hud(){ $('#hud-time').textContent=this.streak()?T(CP.hudStreak,{n:this.round,over:Math.round(this.over)}):T(CP.hudSet,{n:this.round,s:sel.secs}); },
  next(){ this.clearT(); this.round++; if(this.out||(!this.streak()&&this.round>sel.secs)) return finish(this.result()); this.hud(); this.again(); },
  again(msg){ this.clearT(); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg">${msg||CP.wait}</div></div>`;
    rxBar(null); this.later(()=>this.go(),1200+Math.random()*3300); },
  arm(){ this.armed=false; requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(this.st==='go'){ this.t0=performance.now(); this.armed=true; } })); },
  go(){ const pane=$('#rxpane'); this.st='go'; pane.classList.add('lit'); pane.insertAdjacentHTML('beforeend',rxBox()); const m=$('#rxmsg'); if(m) m.textContent=CP.tap; this.arm();
    // v13 (9.1): in a Streak, sitting on your hands is an attempt worth 600ms — 400 against the 500 budget — not a fault you can retake
    if(!this.versus()) this.later(()=>{ if(this.st==='go'){ if(this.streak()) return this.noTap(); this.faults++; this.fault(CP.slow); } },1500); },
  noTap(){ const ms=600; this.st='show'; this.times.push(ms); this.over+=Math.max(0,ms-200); if(this.over>=500) this.out=true;
    $('#score').textContent=String(this.times.length); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('hit');
    pane.innerHTML=rxBox()+`<div class="rxmsg">${CP.noTap}${this.out?CP.reached:''}<b>600<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b></div>`; Snd.miss(); if(navigator.vibrate) navigator.vibrate(30); this.hud(); liveCheck(this.result()); this.later(()=>this.next(),1400); },
  onDown(e){ if(this.versus()) return this.vsTap(e); if(this.nogo()) return this.nogoTap(e);
    if(this.st==='wait'){ this.faults++; this.fault(CP.early); return; }
    if(this.st!=='go'||!this.armed) return;
    const ms=Math.max(1,Math.round(tapTime(e)-this.t0)); this.st='show'; this.times.push(ms); if(this.streak()){ this.over+=Math.max(0,ms-200); if(this.over>=500) this.out=true; }
    $('#score').textContent=this.streak()?String(this.times.length):Math.round(mean(this.times)); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('hit'); pane.innerHTML=rxBox()+`<div class="rxmsg">${ms<200?CP.quick:ms<300?CP.good:CP.slowWord}${this.out?CP.reached:''}<b>${ms}<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b></div>`; Snd.hit(); this.hud(); liveCheck(this.result()); this.later(()=>this.next(),1200); },
  // a fault (v9) is big and stays 1.7s — "missed it · again" used to be small type gone in under a second
  fault(msg){ this.st='fault'; this.clearT(); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:30%"><b class="fb">${msg}</b><span class="sub">${T(CP.again,{n:this.round,of:this.streak()?'':T(CP.of,{s:sel.secs})})}</span></div>`; Snd.miss(); if(navigator.vibrate) navigator.vibrate(40); this.later(()=>this.again(),1700); },
  // Versus (v11): two players, opposite ends. The first to tap after the flash takes the round; an early tap gives it away. Best of 5 / 9 / 15
  vsRound(){ this.clearT(); this.round++; const need=Math.ceil(sel.secs/2); if(this.vsN[0]>=need||this.vsN[1]>=need||this.round>sel.secs) return this.vsEnd();
    $('#hud-time').textContent=T(CP.hudVs,{n:this.round,s:sel.secs}); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg" style="top:44%;font-size:11px">${CP.wait}</div></div><div class="vz top p2">${pWho(1)}<b>${this.vsN[1]}</b></div><div class="vz bot p1">${pWho(0)}<b>${this.vsN[0]}</b></div>`;
    this.later(()=>this.go(),1200+Math.random()*3300); },
  vsTap(e){ if(this.st!=='wait'&&this.st!=='go') return; const r=genRect(); const p=(e.clientY-r.top)<r.height/2?1:0; const early=this.st==='wait'; const w=early?1-p:p; this.st='show'; this.clearT(); this.vsN[w]++;
    const ms=!early&&this.armed?Math.max(1,Math.round(tapTime(e)-this.t0)):0; const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.toggle('bad',early);
    pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb ${w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${T(CP.takes,{n:w+1})}</b><span class="sub">${early?T(CP.tappedEarly,{n:p+1}):ms+CP.ms}</span></div>`; $$('.vz b')[w?0:1].textContent=this.vsN[w]; early?Snd.miss():Snd.hit(); this.later(()=>this.vsRound(),1500); },
  vsEnd(){ const [a,b]=this.vsN; const w=a>b?0:b>a?1:-1; this.st='over'; $('#gen').innerHTML=`<div class="rxpane"><div class="rxmsg" style="top:40%"><b class="fb ${w<0?'':w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b><span class="sub">${a} – ${b}</span></div></div>`; Snd.end(); this.later(()=>finish({hits:a,misses:0,vs2:{a,b,w,how:`${a}–${b}`}}),1600); },
  // Go / No-go (v11): shapes arrive on a fixed 0.8s beat — the skill is inhibition, not prediction. About 70% are the rule shape; the rule changes every five shapes, announced top-middle; the run ends after three wrong taps. Set = 20 shapes, score average ms on right taps + 150 per wrong tap; Streak = shapes survived
  nogoBegin(){ this.rule=['circle','square','tri'][rnd(3)]; this.round=1; this.ruleAt=0; this.dry=0; this.hudNogo(); this.rulePause(); },
  hudNogo(){ $('#hud-time').textContent=this.streak()?T(CP.hudNogoStreak,{n:this.seen+1,w:this.wrong}):T(CP.hudNogo,{n:Math.min(sel.secs,this.seen+1),s:sel.secs,w:this.wrong}); },
  nogoScore(){ const x=this.times.length?Math.min(...this.times):0, y=this.times.length?Math.max(...this.times):0; if(this.streak()) return {hits:this.seen,misses:this.wrong,x,y,lim:'3 wrong'}; return {hits:Math.round((this.times.length?mean(this.times):600)+150*this.wrong),misses:this.wrong,x,y}; },
  rulePause(){ this.clearT(); this.st='rule'; $('#gen').innerHTML=`<div class="rxpane" id="rxpane"></div>`; rxBar([...CP.ruleTap,shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`]); this.later(()=>this.beat(),2200); },
  beat(){ if(!this.streak()&&this.seen>=sel.secs) return this.nogoEnd(); if(this.seen>0&&this.seen%5===0&&this.ruleAt!==this.seen){ this.ruleAt=this.seen; this.st='rule2'; const others=['circle','square','tri'].filter(s=>s!==this.rule); this.rule=others[rnd(2)]; $('#rxpane').innerHTML=''; rxBar([...CP.ruleNow,shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`]); return this.later(()=>{ this.st='gap'; this.beat(); },2200); }
    const pane=$('#rxpane'); if(!pane) return; this.shown=(Math.random()<.7||this.dry>=3)?this.rule:['circle','square','tri'].filter(s=>s!==this.rule)[rnd(2)]; this.dry=this.shown===this.rule?0:this.dry+1; this.seen++; this.hudNogo();
    const v=vmin(), dx=(Math.random()-.5)*24*v, dy=(Math.random()-.5)*22*v, sc=.75+Math.random()*.45, rot=this.shown==='tri'?[0,180,90,270][rnd(4)]:this.shown==='square'?[0,45][rnd(2)]:0;
    pane.classList.remove('bad'); pane.innerHTML=`<div class="rxshape ${this.shown}" style="translate:${dx}px ${dy}px;scale:${sc};rotate:${rot}deg"></div>`;
    this.st=this.shown===this.rule?'go':'nogo'; this.arm(); this.later(()=>{ if(this.st==='go'||this.st==='nogo'){ this.st='gap'; pane.innerHTML=''; } },620); this.later(()=>this.beat(),800); },
  nogoTap(e){ if(this.st==='rule'||this.st==='rule2'||this.st==='over') return; const pane=$('#rxpane');
    if(this.st==='go'&&this.armed){ const ms=Math.max(1,Math.round(tapTime(e)-this.t0)); this.times.push(ms); this.st='hit'; pane.innerHTML=`<div class="rxmsg" style="top:40%"><b style="font-size:clamp(28px,9vw,60px)">${ms}<small style="font-size:12px;letter-spacing:.2em">${CP.ms}</small></b></div>`; Snd.hit(); $('#score').textContent=this.streak()?this.seen:Math.round(mean(this.times)+150*this.wrong); liveCheck(this.nogoScore()); return; }
    if(this.st==='hit'||this.st==='go'||this.st==='wrongshow') return; // the rule shape before it has painted, a second tap on a hit, or a tap during the wrong-tap card: nothing
    // a decoy, or nothing at all: a wrong tap. Three end the run
    this.wrong++; this.st='wrongshow'; pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb" style="font-size:clamp(18px,6vw,36px)">${T(CP.wrong,{n:this.wrong})}</b></div>`; Snd.miss(); if(navigator.vibrate) navigator.vibrate(40); $('#score').textContent=this.streak()?this.seen:Math.round((this.times.length?mean(this.times):600)+150*this.wrong); this.hudNogo();
    if(this.wrong>=3){ this.clearT(); this.st='over'; const g=$('#game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); pane.innerHTML=`<div class="rxmsg" style="top:40%">${CP.three}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.nogoEnd(true),1300); } },
  nogoEnd(fail){ this.clearT(); this.st='over'; rxBar(null); const r=this.nogoScore(); if(fail&&!this.streak()) r.fail=1; finish(r); } });


export { RX, tapTime };
