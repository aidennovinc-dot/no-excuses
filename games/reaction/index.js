/* No Excuses — Reaction — Flash and Go/No-go
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { REACTION as CP } from "../../config/copy.js";
import { SHAPE_WORD } from "../../config/games.js";
import { $, $$, T, mean, minMax, pWho, shapeI, vmin, winner } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine, rxBar } from "../_shared/round.js";
/* Reaction — Flash: white after a random wait, tap. Go/No-go (v8): shapes cycle past in different spots; tap the rule shape the moment it shows. A wrong shape ends the run. Score is ms, averaged */
// the clock (v8): t0 is taken two frames after the change is queued, i.e. when it has actually been painted; the tap is timed from the event's own timestamp (ev.t, set by the run), not from when the handler ran
// v14 (6.2 / L5): a Go / No-go Streak is a cumulative
// TIME budget like every other Streak, not a count of wrong taps: everything over 300ms is spent, a wrong tap costs 150ms
// (the same 150ms the Set adds, v14 section A.2), and the run ends at 1000ms. Score is shapes survived, as L5 says
const RX=Object.assign(roundEngine(),{ id:'reaction', times:[], faults:0, t0:0, rule:'circle', shown:'', armed:false, dry:0, over:0, out:false, wrong:0, seen:0, vsN:[0,0], vsDone:false, last1:'', last2:'',
  // Flash's 200/500 is L5's own number and v14 6.8 did not quote L5, so it stands (see FEATURES, Skipped — locked)
  FLASH_FREE:200, FLASH_BUD:500, NOGO_FREE:300, NOGO_BUD:1000, NOGO_WRONG:150,
  nogo(){ return this.ctx.mode==='nogo'; }, versus(){ return this.ctx.players===2; },
  begin(){ this.round=0; this.times=[]; this.faults=0; this.over=0; this.out=false; this.wrong=0; this.seen=0; this.vsN=[0,0]; this.vsDone=false; hud.score('0'); if(this.versus()) return this.vsRound(); if(this.nogo()) return this.nogoBegin(); this.next(); },
  // Flash (v11): Set = 3 attempts, average ms. Streak = every ms above 200 adds to a total; the run ends when it reaches 500, score attempts
  result(){ const [x,y]=minMax(this.times); if(this.streak()) return {hits:this.times.length,misses:this.faults,x,y,lim:this.FLASH_BUD+'ms'}; return {hits:this.times.length?Math.round(mean(this.times)):0,misses:this.faults,x,y}; },
  hud(){ hud.time(this.streak()?T(CP.hudStreak,{n:this.round,over:Math.round(this.over)}):T(CP.hudSet,{n:this.round,s:this.ctx.len})); },
  next(){ this.clearT(); this.round++; if(this.out||(!this.streak()&&this.round>this.ctx.len)) return this.ctx.emit('finish',this.result()); this.hud(); this.again(); },
  again(msg){ this.clearT(); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg">${msg||CP.wait}</div></div>`;
    rxBar(null); this.later(()=>this.go(),1200+Math.random()*3300); },
  arm(){ this.armed=false; requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(this.st==='go'){ this.t0=performance.now(); this.armed=true; } })); },
  // v14 (6.22): white is the WHOLE screen. The large square with burst lines was the preview screen's picture of the game, never the game
  go(){ const pane=$('#rxpane'); this.st='go'; pane.classList.add('lit'); const m=$('#rxmsg'); if(m) m.textContent=CP.tap; this.arm();
    // v13 (9.1): in a Streak, sitting on your hands is an attempt worth 600ms — 400 against the 500 budget — not a fault you can retake
    if(!this.versus()) this.later(()=>{ if(this.st==='go'){ if(this.streak()) return this.noTap(); this.faults++; this.fault(CP.slow); } },1500); },
  noTap(){ const ms=600; this.st='show'; this.times.push(ms); const add=Math.max(0,ms-this.FLASH_FREE);
    hud.score(String(this.times.length)); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('hit');
    pane.innerHTML=`<div class="rxmsg">${CP.noTap}<b>600<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b><span class="sub" id="rxadd">+${add}${CP.ms}</span></div>`; this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(30); this.hud(); this.flashAdd(add); },
  // v14 (6.1 / 6.2): a Flash Streak SHOWS its running total, and every attempt visibly walks into it — the ms over 150 count
  // down out of the attempt and up into the budget, the same animation Estimate and Timing already use
  flashAdd(add){ hud.addUp({ audio:this.ctx.audio, from:this.over, err:add, ms:700, el:$('#rxadd'), fmt:v=>'+'+Math.round(v)+CP.ms, alive:()=>this.st==='show',
      onFrame:tot=>{ this.over=tot; hud.time(T(CP.hudStreak,{n:this.round,over:Math.round(this.over),bud:this.FLASH_BUD})); },
      done:tot=>{ this.over=tot; if(this.over>=this.FLASH_BUD){ this.out=true; const m=$('#rxadd'); if(m) m.insertAdjacentHTML('afterend',`<span class="sub">${T(CP.reached,{bud:this.FLASH_BUD})}</span>`); }
        this.hud(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  onDown(ev){ if(this.versus()) return this.vsTap(ev); if(this.nogo()) return this.nogoTap(ev);
    if(this.st==='wait'){ this.faults++; this.fault(CP.early); return; }
    if(this.st!=='go'||!this.armed) return;
    const ms=Math.max(1,Math.round(ev.t-this.t0)); this.st='show'; this.times.push(ms); const add=Math.max(0,ms-this.FLASH_FREE);
    const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('hit');
    pane.innerHTML=`<div class="rxmsg">${ms<200?CP.quick:ms<300?CP.good:CP.slowWord}<b>${ms}<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b>${this.streak()?`<span class="sub" id="rxadd">+${add}${CP.ms}</span>`:''}</div>`; this.ctx.audio.hit(); this.hud();
    if(this.streak()){ hud.score(String(this.times.length)); return this.flashAdd(add); }
    // v14 (6.1 / 6.3): the Set average walks to its new value, then the attempt stays on screen until it is tapped
    const past=this.times.slice(0,-1), was=past.length?mean(past):0;
    hud.countUp({ audio:this.ctx.audio, from:was, to:mean(this.times), ms:600, fmt:v=>String(Math.round(v)), set:t=>hud.score(t), alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  // a fault (v9) is big and stays 1.7s — "missed it · again" used to be small type gone in under a second
  fault(msg){ this.st='fault'; this.clearT(); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:30%"><b class="fb">${msg}</b><span class="sub">${T(CP.again,{n:this.round,of:this.streak()?'':T(CP.of,{s:this.ctx.len})})}</span></div>`; this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40); this.wait(()=>this.again()); },
  // Versus (v11): two players, opposite ends. The first to tap after the flash takes the round; an early tap gives it away. Best of 5 / 9 / 15
  vsRound(){ this.clearT(); this.round++; const need=Math.ceil(this.ctx.len/2); if(this.vsN[0]>=need||this.vsN[1]>=need||this.round>this.ctx.len) return this.vsEnd();
    hud.time(T(CP.hudVs,{n:this.round,s:this.ctx.len})); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg" style="top:44%;font-size:11px">${CP.wait}</div></div><div class="vz top p2">${pWho(1)}<b>${this.vsN[1]}</b></div><div class="vz bot p1">${pWho(0)}<b>${this.vsN[0]}</b></div>`;
    this.later(()=>this.go(),1200+Math.random()*3300); },
  vsTap(ev){ if(this.st!=='wait'&&this.st!=='go') return; const r=genRect(); const p=(ev.y-r.top)<r.height/2?1:0; const early=this.st==='wait'; const w=early?1-p:p; this.st='show'; this.clearT(); this.vsN[w]++;
    const ms=!early&&this.armed?Math.max(1,Math.round(ev.t-this.t0)):0; const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.toggle('bad',early);
    pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb ${w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${T(CP.takes,{n:w+1})}</b><span class="sub">${early?T(CP.tappedEarly,{n:p+1}):ms+CP.ms}</span></div>`; $$('.vz b')[w?0:1].textContent=this.vsN[w]; early?this.ctx.audio.miss():this.ctx.audio.hit(); this.later(()=>this.vsRound(),1500); },
  vsEnd(){ const [a,b]=this.vsN; const w=winner(a,b); this.st='over'; $('#gen').innerHTML=`<div class="rxpane"><div class="rxmsg" style="top:40%"><b class="fb ${w<0?'':w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b><span class="sub">${a} – ${b}</span></div></div>`; this.ctx.audio.end(); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:`${a}–${b}`}}),1600); },
  // Go / No-go (v11): shapes arrive on a fixed beat — the skill is inhibition, not prediction. The rule changes every five
  // shapes, announced top-middle. Set = 5 rounds, average ms on the right taps plus 150ms a wrong tap (v14 A.2), over after
  // three wrong taps. v14 (6.2 / L5): a Streak is a cumulative TIME budget like every other Streak — ms over 300 plus 150ms a
  // wrong tap, out at 1000ms — and the score is shapes survived, not a count of what went wrong
  nogoBegin(){ this.rule=['circle','square','tri'][rnd(3)]; this.round=1; this.ruleAt=0; this.dry=0; this.last1=''; this.last2=''; this.hudNogo(); this.rulePause(); },
  // v14 (6.26): a Streak was too fast to react to. It runs on a slower beat than the Set
  beatMs(){ return this.streak()?1150:800; },
  hudNogo(){ hud.time(this.streak()?T(CP.hudNogoStreak,{n:this.seen+1,over:Math.round(this.over),bud:this.NOGO_BUD}):T(CP.hudNogo,{n:Math.min(this.ctx.len,this.seen+1),s:this.ctx.len,w:this.wrong})); },
  nogoScore(){ const [x,y]=minMax(this.times); if(this.streak()) return {hits:this.seen,misses:this.wrong,x,y,lim:this.NOGO_BUD+'ms'}; return {hits:Math.round((this.times.length?mean(this.times):600)+this.NOGO_WRONG*this.wrong),misses:this.wrong,x,y}; },
  rulePause(){ this.clearT(); this.st='rule'; $('#gen').innerHTML=`<div class="rxpane" id="rxpane"></div>`; rxBar([...CP.ruleTap,shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`]); this.later(()=>this.nogoWait(),2200); },
  // v14 (6.25): there is ALWAYS a wait period — before the first shape and after every rule change. Tapping through it is a wrong tap
  nogoWait(){ this.clearT(); this.st='wait'; const pane=$('#rxpane'); if(pane) pane.innerHTML=`<div class="rxmsg" id="rxmsg" style="top:40%;font-size:11px">${CP.wait}</div>`; this.later(()=>this.beat(),700+Math.random()*900); },
  // v14 (6.25): pseudo-random, not random. A shape never comes up three times running and a decoy never repeats, so three
  // triangles in a row on a "tap the triangle" round cannot happen and no streak of luck decides a run
  nextShape(){ const others=['circle','square','tri'].filter(s=>s!==this.rule); let sh=this.rule;
    for(let i=0;i<12;i++){ sh=Math.random()<.6?this.rule:others[rnd(2)];
      if(sh===this.last1&&sh===this.last2) continue;
      if(sh!==this.rule&&sh===this.last1) continue;
      break; }
    this.last2=this.last1; this.last1=sh; return sh; },
  beat(){ if(!this.streak()&&this.seen>=this.ctx.len) return this.nogoEnd();
    if(this.streak()&&this.over>=this.NOGO_BUD) return this.nogoEnd();
    if(this.seen>0&&this.seen%5===0&&this.ruleAt!==this.seen){ this.ruleAt=this.seen; this.st='rule2'; const others=['circle','square','tri'].filter(s=>s!==this.rule); this.rule=others[rnd(2)]; this.last1=''; this.last2=''; const p=$('#rxpane'); if(p) p.innerHTML=''; rxBar([...CP.ruleNow,shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`]); return this.later(()=>this.nogoWait(),2200); }
    const pane=$('#rxpane'); if(!pane) return; this.shown=this.nextShape(); this.seen++; this.hudNogo();
    const v=vmin(), dx=(Math.random()-.5)*24*v, dy=(Math.random()-.5)*22*v, sc=.75+Math.random()*.45, rot=this.shown==='tri'?[0,180,90,270][rnd(4)]:this.shown==='square'?[0,45][rnd(2)]:0;
    // v14 (6.24): the next shape replaces the last one where it stands — square to triangle goes straight through, never to black.
    // Every beat moves, turns and resizes it, so a repeat of the same shape still reads as a new one
    pane.classList.remove('bad'); pane.innerHTML=`<div class="rxshape ${this.shown}" style="translate:${dx}px ${dy}px;scale:${sc};rotate:${rot}deg"></div>`;
    this.st=this.shown===this.rule?'go':'nogo'; this.arm(); this.later(()=>this.beat(),this.beatMs()); },
  nogoTap(ev){ if(this.st==='rule'||this.st==='rule2'||this.st==='over') return; const pane=$('#rxpane'); if(!pane) return;
    if(this.st==='go'&&this.armed){ const ms=Math.max(1,Math.round(ev.t-this.t0)); this.times.push(ms); this.st='hit';
      const add=Math.max(0,ms-this.NOGO_FREE); if(this.streak()) this.over+=add;
      pane.innerHTML=`<div class="rxmsg" style="top:40%"><b style="font-size:clamp(28px,9vw,60px)">${ms}<small style="font-size:12px;letter-spacing:.2em">${CP.ms}</small></b>${this.streak()?`<span class="sub">+${add}${CP.ms}</span>`:''}</div>`;
      this.ctx.audio.hit(); hud.score(this.streak()?this.seen:Math.round(mean(this.times)+this.NOGO_WRONG*this.wrong)); this.hudNogo(); this.ctx.emit('live',this.nogoScore()); return; }
    if(this.st==='hit'||this.st==='go'||this.st==='wrongshow') return; // the rule shape before it has painted, a second tap on a hit, or a tap during the wrong-tap card: nothing
    // a decoy, the wait period, or nothing at all: a wrong tap. It costs a Streak 150ms of its budget; three end a Set
    this.wrong++; if(this.streak()) this.over+=this.NOGO_WRONG;
    this.st='wrongshow'; pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb" style="font-size:clamp(18px,6vw,36px)">${this.streak()?CP.wrongS:T(CP.wrong,{n:this.wrong})}</b>${this.streak()?`<span class="sub">+${this.NOGO_WRONG}${CP.ms}</span>`:''}</div>`; this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40); hud.score(this.streak()?this.seen:Math.round((this.times.length?mean(this.times):600)+this.NOGO_WRONG*this.wrong)); this.hudNogo();
    if(this.streak()&&this.over>=this.NOGO_BUD){ this.clearT(); this.st='over'; hud.shake(); pane.innerHTML=`<div class="rxmsg" style="top:40%">${T(CP.reached,{bud:this.NOGO_BUD})}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.nogoEnd(),1300); }
    if(!this.streak()&&this.wrong>=3){ this.clearT(); this.st='over'; hud.shake(); pane.innerHTML=`<div class="rxmsg" style="top:40%">${CP.three}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.nogoEnd(true),1300); } },
  nogoEnd(fail){ this.clearT(); this.st='over'; rxBar(null); const r=this.nogoScore(); if(fail&&!this.streak()) r.fail=1; this.ctx.emit('finish',r); } });

export default RX;
export { RX };
