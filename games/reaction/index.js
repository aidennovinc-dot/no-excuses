/* No Excuses — Reaction — Flash and Go/No-go
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { REACTION as CP } from "../../config/copy.js";
import { SHAPE_WORD } from "../../config/games.js";
import { $, $$, T, mean, minMax, pWho, shapeI, vmin, winner } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine, rxBar } from "../_shared/round.js";
import { makeTwo } from "../_shared/two.js";
/* Reaction — Flash: white after a random wait, tap. Go/No-go (v8): shapes cycle past in different spots; tap the rule shape the moment it shows. A wrong shape ends the run. Score is ms, averaged */
// the clock (v8): t0 is taken two frames after the change is queued, i.e. when it has actually been painted; the tap is timed from the event's own timestamp (ev.t, set by the run), not from when the handler ran
// v14 (6.2 / L5): a Go / No-go Streak is a cumulative
// TIME budget like every other Streak, not a count of wrong taps: everything over 150ms is spent and the run ends at 1000ms.
// Score is shapes survived, as L5 says. v14 section C.2 (L5, build 22): the threshold is 150ms and a wrong tap costs 200ms
// — B.2's 300 / 300 is withdrawn. C.4 retires the "three wrong taps ends the run" contract outright rather than restoring
// it: the budget is spent by the reaction-time overspend on legal taps as well as by wrong taps, so mistakes do not have to
// exhaust it on their own. The Streak has no wrong-tap counter and must not gain one. B.3 still stands — the SET keeps its
// own 150ms-added penalty and its own three-wrong-taps ending; the two currencies differ and must not be harmonised.
const RX=Object.assign(roundEngine(),{ id:'reaction', holdResult:true, times:[], faults:0, t0:0, rule:'circle', shown:'', armed:false, over:0, out:false, wrong:0, seen:0, vsN:[0,0], vsDone:false, last1:'', last2:'', two:{on:false}, block:null, blockGo:0,
  // v14 section C.1 (L5, build 22): a Flash Streak spends everything over 150ms of its 500ms budget — the number 6.8 asked for.
  // B.1's 250 was Cowork's reasoning and Aiden overruled it. A good phone tap is ~250–280ms, so nearly every rep spends
  // 100–130ms and a run lasts four or five rounds instead of ten. That is the intended effect, not a regression. Budget unchanged.
  // NOGO_WRONG_SET is the 150ms a wrong tap ADDS to the Set average (v14 A.2); NOGO_WRONG_STREAK is the 200ms it SPENDS from the
  // Streak budget (v14 C.2). Different currencies, deliberately close numbers — B.3 / C.3 say do not harmonise them.
  // v15 section 3.5 (L5, build 24): FLASH_EARLY is a THIRD Flash currency. Tapping before the flash spends 400ms flat —
  // not 400 over the free allowance — and CONSUMES the attempt instead of being a retakeable fault. Flash only:
  // Go / No-go's three numbers below are untouched by it. The note arrived on the Go / No-go card and Aiden says in the
  // note itself that he meant Flash (v15 0.2), which is why it is here and not in nogoTap
  // v15 (#375a, build 26): the rule period, which was the bare 5 inside beat()'s `seen % 5` test. It is named because a
  // pass & play TURN is meant to be exactly one rule period, and the gate now asserts PASS_TURNS['reaction:nogo'][0]
  // against it — change the turn length without changing this and the claim stops being true out loud rather than quietly
  FLASH_FREE:150, FLASH_BUD:500, FLASH_EARLY:400, NOGO_FREE:150, NOGO_BUD:1000, NOGO_WRONG_SET:150, NOGO_WRONG_STREAK:200, RULE_EVERY:5,
  // v15 (3.6): every Flash result reads down the same four lines — the time, the baseline it is measured against, the
  // difference between them, then where the run stands. The running total is BELOW as well as in the HUD above
  rxCard(word,ms,add,bad,note){ const pane=$('#rxpane'); if(!pane) return; pane.classList.remove('lit'); pane.classList.add(bad?'bad':'hit');
    pane.innerHTML=`<div class="rxmsg">${word}<b>${ms}<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b>`
      +`<span class="sub">${T(CP.baseline,{n:this.FLASH_FREE})}</span><span class="sub" id="rxadd">+${add}${CP.ms}</span>`
      +`<span class="sub tot" id="rxtot">${this.totLine(this.streak()?this.over+add:mean(this.times))}</span>`
      +(note?`<span class="sub">${note}</span>`:'')+`</div>`; },
  totLine(v){ return this.streak()?T(CP.runTotal,{n:Math.round(v),bud:this.FLASH_BUD}):T(CP.runAvg,{n:Math.round(v)}); },
  setTot(v){ const el=$('#rxtot'); if(el) el.textContent=this.totLine(v); },
  nogo(){ return this.ctx.mode==='nogo'; }, versus(){ return this.ctx.players===2; },
  // v15 (4.4): pass & play is attempt by attempt, both modes. Flash hands the phone over after every flash; Go / No-go
  // arrives on a beat, so its turn is a block of shapes — one rule period — and the block is scored the way its Set is
  begin(){ this.round=0; this.times=[]; this.faults=0; this.over=0; this.out=false; this.wrong=0; this.seen=0; this.vsN=[0,0]; this.vsDone=false;
    this.two=makeTwo(this.ctx,{lower:true,fmt:v=>Math.round(v)+CP.ms}); hud.score('0');
    if(this.versus()) return this.vsRound(); if(this.two.on) return this.next(); if(this.nogo()) return this.nogoBegin(); this.next(); },
  // Flash (v11 / v14 section 5): Set = 5 attempts, average ms. Streak = every ms above 150 (C.1) adds to a total; the run ends at 500, score attempts
  result(){ const [x,y]=minMax(this.times); if(this.streak()) return {hits:this.times.length,misses:this.faults,x,y,lim:this.FLASH_BUD+'ms'}; return {hits:this.times.length?Math.round(mean(this.times)):0,misses:this.faults,x,y}; },
  // v16 (1.5): Set ramps over the last round; a Streak once its own budget is 80% spent. Music only (A.1)
  fin(){ if(this.two.on||this.versus()) return 0; return this.streak()?this.finBud(this.over,this.nogo()?this.NOGO_BUD:this.FLASH_BUD):this.finSet(); },
  hud(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudStreak,{n:this.round,over:Math.round(this.over)}):T(CP.hudSet,{n:this.round,s:this.ctx.len})); },
  next(){ this.clearT(); this.round++;
    // v15 (4.4): the run is over when both players have had their turns; every turn opens with the hand-over card
    if(this.two.on){ if(this.two.over()) return this.ctx.emit('finish',this.two.record()); return this.two.gate(this,()=>this.turnStart()); }
    if(this.out||(!this.streak()&&this.round>this.ctx.len)) return this.ctx.emit('finish',this.result()); this.hud(); this.again(); },
  // one player's turn: a single flash, or a fresh block of Go / No-go shapes on a fresh rule
  turnStart(){ this.times=[]; this.wrong=0; this.seen=0; if(this.nogo()) return this.nogoBegin(); this.again(); },
  // v15 (4.4): what the attempt was worth goes to the player holding the phone, and the turn ends with it
  twoAdd(ms){ const p=this.two.p, was=this.two.scoreOf(p); this.two.add(ms); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:500, fmt:v=>String(Math.round(v)), set:t=>{ hud.score(t); this.setTot(+t); }, alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.later(()=>this.next(),1400); } }); },
  again(msg){ this.clearT(); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg">${msg||CP.wait}</div></div>`;
    rxBar(null); this.later(()=>this.go(),1200+Math.random()*3300); },
  arm(){ this.armed=false; requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(this.st==='go'){ this.t0=performance.now(); this.armed=true; } })); },
  // v14 (6.22): white is the WHOLE screen. The large square with burst lines was the preview screen's picture of the game, never the game
  go(){ const pane=$('#rxpane'); this.st='go'; pane.classList.add('lit'); const m=$('#rxmsg'); if(m) m.textContent=CP.tap; this.arm();
    // v13 (9.1): in a Streak, sitting on your hands is an attempt worth 600ms — 450 against the 500 budget (C.1) — not a fault you can retake
    // v15 (4.4): in pass & play, sitting on your hands spends the attempt exactly as it does in a Streak — a retake would
    // hand the phone back to the same player and there is somebody waiting for it
    if(!this.versus()) this.later(()=>{ if(this.st==='go'){ if(this.streak()||this.two.on) return this.noTap(); this.faults++; this.fault(CP.slow); } },1500); },
  noTap(){ const ms=600; this.st='show'; this.times.push(ms); const add=Math.max(0,ms-this.FLASH_FREE);
    if(!this.two.on) hud.score(String(this.times.length));
    this.rxCard(CP.noTap,ms,add,false); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(30); this.hud();
    if(this.two.on) return this.twoAdd(ms);
    this.flashAdd(add); },
  // v15 (3.5): an early tap. It used to be a fault — the attempt was thrown away and retaken, which made jumping the gun
  // free. Now it costs FLASH_EARLY and the attempt is spent: a Streak loses 400 of its budget, a Set carries 400ms into
  // its average. Either way `round` moves on, so this is next(), never again()
  early(){ this.clearT(); this.faults++; const ms=this.FLASH_EARLY; this.st='show'; this.times.push(ms);
    this.rxCard(CP.earlyTap,ms,ms,true,CP.earlyCost);
    this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40);
    if(this.two.on){ this.hud(); return this.twoAdd(ms); }
    if(this.streak()){ hud.score(String(this.times.length)); this.hud(); return this.flashAdd(ms); }
    const past=this.times.slice(0,-1), was=past.length?mean(past):0;
    hud.countUp({ audio:this.ctx.audio, from:was, to:mean(this.times), ms:600, fmt:v=>String(Math.round(v)), set:t=>{ hud.score(t); this.setTot(+t); }, alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  // v14 (6.1 / 6.2): a Flash Streak SHOWS its running total, and every attempt visibly walks into it — the ms over the free
  // allowance count down out of the attempt and up into the budget, the same animation Estimate and Timing already use
  flashAdd(add){ hud.addUp({ audio:this.ctx.audio, from:this.over, err:add, ms:700, el:$('#rxadd'), fmt:v=>'+'+Math.round(v)+CP.ms, alive:()=>this.st==='show',
      onFrame:tot=>{ this.over=tot; this.setTot(tot); hud.time(T(CP.hudStreak,{n:this.round,over:Math.round(this.over),bud:this.FLASH_BUD})); },
      done:tot=>{ this.over=tot; if(this.over>=this.FLASH_BUD){ this.out=true; const m=$('#rxadd'); if(m) m.insertAdjacentHTML('afterend',`<span class="sub">${T(CP.reached,{bud:this.FLASH_BUD})}</span>`); }
        this.hud(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  onDown(ev){ if(this.versus()) return this.vsTap(ev); if(this.nogo()) return this.nogoTap(ev);
    if(this.st==='wait') return this.early();
    if(this.st!=='go'||!this.armed) return;
    const ms=Math.max(1,Math.round(ev.t-this.t0)); this.st='show'; this.times.push(ms); const add=Math.max(0,ms-this.FLASH_FREE);
    this.rxCard(ms<200?CP.quick:ms<300?CP.good:CP.slowWord,ms,add,false); this.ctx.audio.hit(); this.hud();
    if(this.two.on) return this.twoAdd(ms);
    if(this.streak()){ hud.score(String(this.times.length)); return this.flashAdd(add); }
    // v14 (6.1 / 6.3): the Set average walks to its new value, then the attempt stays on screen until it is tapped
    const past=this.times.slice(0,-1), was=past.length?mean(past):0;
    hud.countUp({ audio:this.ctx.audio, from:was, to:mean(this.times), ms:600, fmt:v=>String(Math.round(v)), set:t=>{ hud.score(t); this.setTot(+t); }, alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  // a fault (v9) is big and stays 1.7s — "missed it · again" used to be small type gone in under a second
  fault(msg){ this.st='fault'; this.clearT(); const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:30%"><b class="fb">${msg}</b><span class="sub">${T(CP.again,{n:this.round,of:this.streak()?'':T(CP.of,{s:this.ctx.len})})}</span></div>`; this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40); this.wait(()=>this.again()); },
  // Versus (v11): two players, opposite ends. The first to tap after the flash takes the round; an early tap gives it away. Best of 5 / 9 / 15
  vsRound(){ this.clearT(); this.round++; const need=Math.ceil(this.ctx.len/2); if(this.vsN[0]>=need||this.vsN[1]>=need||this.round>this.ctx.len) return this.vsEnd();
    // v16 (1.4): each player's own music stem swells with their share of the best-of. Presentation only (L10)
    this.ctx.emit('live',{vsP:[this.vsN[0]/need,this.vsN[1]/need]});
    hud.time(T(CP.hudVs,{n:this.round,s:this.ctx.len})); this.st='wait'; this.armed=false;
    $('#gen').innerHTML=`<div class="rxpane" id="rxpane"><div class="rxmsg" id="rxmsg" style="top:44%;font-size:11px">${CP.wait}</div></div><div class="vz top p2">${pWho(1)}<b>${this.vsN[1]}</b></div><div class="vz bot p1">${pWho(0)}<b>${this.vsN[0]}</b></div>`;
    this.later(()=>this.go(),1200+Math.random()*3300); },
  vsTap(ev){ if(this.st!=='wait'&&this.st!=='go') return; const r=genRect(); const p=(ev.y-r.top)<r.height/2?1:0; const early=this.st==='wait'; const w=early?1-p:p; this.st='show'; this.clearT(); this.vsN[w]++;
    const ms=!early&&this.armed?Math.max(1,Math.round(ev.t-this.t0)):0; const pane=$('#rxpane'); pane.classList.remove('lit'); pane.classList.toggle('bad',early);
    pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb ${w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${T(CP.takes,{n:w+1})}</b><span class="sub">${early?T(CP.tappedEarly,{n:p+1}):ms+CP.ms}</span></div>`; $$('.vz b')[w?0:1].textContent=this.vsN[w]; early?this.ctx.audio.miss():this.ctx.audio.hit(); this.later(()=>this.vsRound(),1500); },
  vsEnd(){ const [a,b]=this.vsN; const w=winner(a,b); this.st='over'; $('#gen').innerHTML=`<div class="rxpane"><div class="rxmsg" style="top:40%"><b class="fb ${w<0?'':w?'p2':'p1'}" style="font-size:clamp(18px,5vw,30px)">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b><span class="sub">${a} – ${b}</span></div></div>`; this.ctx.audio.end(); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:`${a}–${b}`}}),1600); },
  // Go / No-go (v11): shapes arrive on a fixed beat — the skill is inhibition, not prediction. The rule changes every five
  // shapes, announced top-middle. Set = 5 rounds, average ms on the right taps plus 150ms a wrong tap (v14 A.2), over after
  // three wrong taps. v14 (6.2 / L5 / C.2): a Streak is a cumulative TIME budget like every other Streak — ms over 150 plus 200ms a
  // wrong tap, out at 1000ms — and the score is shapes survived, not a count of what went wrong. The three-wrong-taps ending
  // belongs to the SET only (C.4 retired it for the Streak); the mode line still says it because the Set is what it describes
  nogoBegin(){ this.rule=['circle','square','tri'][rnd(3)]; this.round=1; this.ruleAt=0; this.last1=''; this.last2='';
    // v15 (#375a / #375b, build 26): a pass & play turn deals its whole block up front, against this one rule
    this.block=this.two.on?this.dealBlock(this.blockLen()):null; this.blockGo=this.block?this.block.filter(s=>s===this.rule).length:0;
    this.hudNogo(); this.rulePause(); },
  /* v15 (#375a, build 26): how many shapes a turn is. In pass & play it is PASS_TURNS['reaction:nogo'][0] — the config
     the build-25 review found was never read, because beat() ended a block on `this.seen >= this.ctx.len`, the Set's own
     round count. The two happened to be the same number, so the block was the right length by coincidence and would have
     silently followed SET_COPY the day either moved. Solo is unchanged: ctx.len is the length row the player picked. */
  blockLen(){ return this.two.on?this.two.per:this.ctx.len; },
  /* v15 (#375b, build 26): DEAL the block, do not roll each beat. Rolling shape by shape can hand a player a turn with
     no go-shape in it at all, and then there is nothing to score them on — which is what the deleted 600ms fallback was
     papering over. A dealt block guarantees at least two go-shapes and keeps both of nextShape()'s fairness rules
     (v14 6.25): no shape three times running, and a decoy never repeats. Solo still rolls — a Streak has no block to
     deal, and dealing a solo Set would change a scoring distribution nobody asked to change. */
  dealBlock(n){ const others=['circle','square','tri'].filter(s=>s!==this.rule);
    const go=Math.max(2,Math.min(n,2+rnd(Math.max(1,n-2))));   // at least two, never every shape in a block of 3+
    let mark=null;
    for(let a=0;a<40;a++){ const m=Array.from({length:n},(_,i)=>i<go?1:0);
      for(let i=m.length-1;i>0;i--){ const j=rnd(i+1); [m[i],m[j]]=[m[j],m[i]]; }
      if(!m.some((v,i)=>i>1&&v&&m[i-1]&&m[i-2])){ mark=m; break; } }
    if(!mark) mark=Array.from({length:n},(_,i)=>i%2===0&&i/2<go?1:0);   // spread them out rather than give up
    let prev='', d=rnd(2); return mark.map(v=>{ if(v){ prev=this.rule; return this.rule; }
      if(others[d]===prev) d=1-d; prev=others[d]; d=1-d; return prev; }); },
  // v14 (6.26): a Streak was too fast to react to. It runs on a slower beat than the Set
  beatMs(){ return this.streak()?1150:800; },
  hudNogo(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudNogoStreak,{n:this.seen+1,over:Math.round(this.over),bud:this.NOGO_BUD}):T(CP.hudNogo,{n:Math.min(this.ctx.len,this.seen+1),s:this.ctx.len,w:this.wrong})); },
  nogoScore(){ const [x,y]=minMax(this.times); if(this.streak()) return {hits:this.seen,misses:this.wrong,x,y,lim:this.NOGO_BUD+'ms'}; return {hits:Math.round((this.times.length?mean(this.times):600)+this.NOGO_WRONG_SET*this.wrong),misses:this.wrong,x,y}; },
  /* v15 (#375b, build 26): what a pass & play BLOCK is worth, and the reason the 600ms fallback could be deleted rather
     than retuned. Every go-shape the block dealt is worth either the tap it got or the whole beat window it was given —
     both real numbers the run produced — plus 150ms a wrong tap, which is how the Set scores (v14 A.2). dealBlock
     guarantees at least two go-shapes, so there is always something to average, and a turn that ended early on three
     wrong taps is charged for the shapes it never answered instead of being scored better for giving up. */
  blockScore(){ const pad=Math.max(0,this.blockGo-this.times.length);
    return mean(this.times.concat(Array(pad).fill(this.beatMs())))+this.NOGO_WRONG_SET*this.wrong; },
  // the number under the HUD while a block is being played — the same one it will bank, so it can only improve
  liveNum(){ return this.streak()?this.seen:Math.round(this.two.on?this.blockScore():(this.times.length?mean(this.times):600)+this.NOGO_WRONG_SET*this.wrong); },
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
  /* v15 (4.4): in pass & play the end of a block is the end of a TURN, not the end of the run.
     v15 (#375a, build 26): the block's length comes from PASS_TURNS now, not from the Set's round count — and the rule
     change is SUPPRESSED inside a pass & play block, so a turn is one rule period whatever the turn length is set to.
     Build 25's comment claimed that and the code did not deliver it: the rule flips on RULE_EVERY shapes, so any turn
     longer than five would have spanned a change and put the block's dealt shapes under a rule that no longer applied. */
  beat(){ if(!this.streak()&&this.seen>=this.blockLen()) return this.two.on?this.twoBlockEnd():this.nogoEnd();
    if(this.streak()&&this.over>=this.NOGO_BUD) return this.nogoEnd();
    if(!this.two.on&&this.seen>0&&this.seen%this.RULE_EVERY===0&&this.ruleAt!==this.seen){ this.ruleAt=this.seen; this.st='rule2'; const others=['circle','square','tri'].filter(s=>s!==this.rule); this.rule=others[rnd(2)]; this.last1=''; this.last2=''; const p=$('#rxpane'); if(p) p.innerHTML=''; rxBar([...CP.ruleNow,shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`]); return this.later(()=>this.nogoWait(),2200); }
    const pane=$('#rxpane'); if(!pane) return; this.shown=this.block?this.block[this.seen]:this.nextShape(); this.seen++; this.hudNogo();
    const v=vmin(), dx=(Math.random()-.5)*24*v, dy=(Math.random()-.5)*22*v, sc=.75+Math.random()*.45, rot=this.shown==='tri'?[0,180,90,270][rnd(4)]:this.shown==='square'?[0,45][rnd(2)]:0;
    // v14 (6.24): the next shape replaces the last one where it stands — square to triangle goes straight through, never to black.
    // Every beat moves, turns and resizes it, so a repeat of the same shape still reads as a new one
    pane.classList.remove('bad'); pane.innerHTML=`<div class="rxshape ${this.shown}" style="translate:${dx}px ${dy}px;scale:${sc};rotate:${rot}deg"></div>`;
    this.st=this.shown===this.rule?'go':'nogo'; this.arm(); this.later(()=>this.beat(),this.beatMs()); },
  nogoTap(ev){ if(this.st==='rule'||this.st==='rule2'||this.st==='over') return; const pane=$('#rxpane'); if(!pane) return;
    if(this.st==='go'&&this.armed){ const ms=Math.max(1,Math.round(ev.t-this.t0)); this.times.push(ms); this.st='hit';
      const add=Math.max(0,ms-this.NOGO_FREE); if(this.streak()) this.over+=add;
      pane.innerHTML=`<div class="rxmsg" style="top:40%"><b style="font-size:clamp(28px,9vw,60px)">${ms}<small style="font-size:12px;letter-spacing:.2em">${CP.ms}</small></b>${this.streak()?`<span class="sub">+${add}${CP.ms}</span>`:''}</div>`;
      this.ctx.audio.hit(); hud.score(this.liveNum()); this.hudNogo(); this.ctx.emit('live',this.nogoScore()); return; }
    if(this.st==='hit'||this.st==='go'||this.st==='wrongshow') return; // the rule shape before it has painted, a second tap on a hit, or a tap during the wrong-tap card: nothing
    // a decoy, the wait period, or nothing at all: a wrong tap. It spends 200ms of a Streak's budget (C.2); three end a Set
    this.wrong++; if(this.streak()) this.over+=this.NOGO_WRONG_STREAK;
    this.st='wrongshow'; pane.classList.add('bad'); pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb" style="font-size:clamp(18px,6vw,36px)">${this.streak()?CP.wrongS:T(CP.wrong,{n:this.wrong})}</b>${this.streak()?`<span class="sub">+${this.NOGO_WRONG_STREAK}${CP.ms}</span>`:''}</div>`; this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40); hud.score(this.liveNum()); this.hudNogo();
    if(this.streak()&&this.over>=this.NOGO_BUD){ this.clearT(); this.st='over'; hud.shake(); pane.innerHTML=`<div class="rxmsg" style="top:40%">${T(CP.reached,{bud:this.NOGO_BUD})}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.nogoEnd(),1300); }
    if(!this.streak()&&this.wrong>=3){ this.clearT(); this.st='over'; hud.shake(); pane.innerHTML=`<div class="rxmsg" style="top:40%">${CP.three}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.two.on?this.twoBlockEnd():this.nogoEnd(true),1300); } },
  /* v15 (4.4): a Go / No-go turn is a block of shapes — one rule period — because a single shape on an 800ms beat cannot be
     handed over. The block is scored the way the Set is (v14 A.2): the average of the right taps plus 150ms a wrong one,
     which is why the three-wrong-taps ending closes a turn here instead of the run */
  twoBlockEnd(){ this.clearT(); this.st='over'; rxBar(null); const v=this.blockScore();
    const p=this.two.p, was=this.two.scoreOf(p); this.two.add(v); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:500, fmt:x=>String(Math.round(x)), set:t=>hud.score(t), alive:()=>this.st==='over',
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.later(()=>this.next(),1200); } }); },
  nogoEnd(fail){ this.clearT(); this.st='over'; rxBar(null); const r=this.nogoScore(); if(fail&&!this.streak()) r.fail=1; this.ctx.emit('finish',r); } });

export default RX;
export { RX };
