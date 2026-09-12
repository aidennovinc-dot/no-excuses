/* No Excuses — Reaction — Flash and Go/No-go
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { REACTION as CP } from "../../config/copy.js";
import { CFG, SHAPE_WORD } from "../../config/games.js";
import { $, $$, T, mean, minMax, pWho, shapeI, vmin, winner } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine, rxBar } from "../_shared/round.js";
import { roundTier } from "../_shared/tier.js";
import { makeTwo } from "../_shared/two.js";
// v18 (B.3c / B.7): one hold, shared with Timing, so both Streaks add up at the same readable beat
const HOLD_MS=CFG.hold;
/* Reaction — Flash: white after a random wait, tap. Go/No-go (v8): shapes cycle past in different spots; tap the rule shape the moment it shows. A wrong shape ends the run. Score is ms, averaged */
// the clock (v8): t0 is taken two frames after the change is queued, i.e. when it has actually been painted; the tap is timed from the event's own timestamp (ev.t, set by the run), not from when the handler ran
// v14 (6.2 / L5): a Go / No-go Streak is a cumulative
// TIME budget like every other Streak, not a count of wrong taps: everything over 150ms is spent and the run ends at 1000ms.
// Score is shapes survived, as L5 says. v14 section C.2 (L5, build 22): the threshold is 150ms and a wrong tap costs 200ms
// — B.2's 300 / 300 is withdrawn. C.4 retires the "three wrong taps ends the run" contract outright rather than restoring
// it: the budget is spent by the reaction-time overspend on legal taps as well as by wrong taps, so mistakes do not have to
// exhaust it on their own. The Streak has no wrong-tap counter and must not gain one. B.3 still stands — the SET keeps its
// own 150ms-added penalty and its own three-wrong-taps ending; the two currencies differ and must not be harmonised.
const RX=Object.assign(roundEngine(),{ id:'reaction', holdResult:true, times:[], faults:0, t0:0, rule:'circle', shown:'', armed:false, over:0, out:false, wrong:0, seen:0, vsN:[0,0], vsDone:false, last1:'', last2:'', two:{on:false}, block:null, blockGo:0, bi:0, got:0, goDealt:0, skipped:[], pool:[], dwell:0, gotAll:0,
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
  /* v18 (B.6, L5): FLASH_MAX is the ceiling on a Set attempt. A Flash Set used to throw a slow attempt away — "too slow ·
     try again · attempt 2 of 5" — so the only thing being measured was the attempts you happened to be quick on. An
     attempt that runs past this scores it and COUNTS. The Streak is untouched: it still waits 1500ms and a no-tap is the
     600ms v13 9.1 set, because there the cost is the budget and a retake was never on offer.
     v18 (B.1b / B.1d): a Go / No-go ROUND is one target shape and GO_PER correct taps of it — a Set is ctx.len rounds of
     that (five rounds, fifteen correct taps) and a Streak deals a fresh target shape every time a block runs out. A block
     is GO_PER targets among GO_PAD..GO_PAD+GO_SPREAD-1 decoys, the first of which is always a decoy. RULE_EVERY is retired
     with the old "the rule flips every five shapes" reading: the rule changes once per block now, in every mode. */
  /* v19 (§C, L5, build 32): the Go / No-go numbers after Aiden played build 31.
     NOGO_FREE is 180 — THE GATE (C.5). It is a scoring rule, not an input window: every correct tap contributes
     max(0, reaction − 180) ms, so a tap at or under 180 adds nothing and nothing is forgiven, rejected or re-timed. Aiden
     named the rule for the Streak; it is on the Set as well (Cowork's recommendation, flagged in FEATURES.md) so the two
     modes score on one scale. NOGO_BUD is 3000 (C.6): at the Set bar's own pace — 380ms raw, 200 over the gate — fifteen
     targets spend exactly 3000, so a Streak at that pace lasts one Set's worth of targets before its wrong taps.
     GO_GAP_MIN..GO_GAP_MAX is C.2: each target sits behind 1 to 5 decoys, drawn uniformly, so it lands 2nd to 6th in its
     sub-round and a five-deep wait is ordinary — the game is discrimination, not reflex. C.1 follows from the same shape:
     a target is always followed by at least one decoy, so a correct tap is never followed by the target again. GO_PAD and
     GO_SPREAD are retired with the old "GO_PER targets among 2..4 decoys" block. NOGO_DWELL is C.4: how long a shape
     stays on screen, base per length ± spread, uniform per shape. The old fixed beats were 800 (Set) and 1150 (Streak);
     Cowork's (guess) of 620 ± 180 sits BELOW both, which contradicts the note it carries ("stay on screen longer"), so
     the bases here are the old beats + 180: never quicker than build 31, up to 360ms longer, and variable. FEATURES.md
     prints both and Aiden picks. */
  FLASH_FREE:150, FLASH_BUD:500, FLASH_EARLY:400, FLASH_MAX:1000, NOGO_FREE:180, NOGO_BUD:3000, NOGO_WRONG_SET:150, NOGO_WRONG_STREAK:200,
  GO_PER:3, GO_GAP_MIN:1, GO_GAP_MAX:5, NOGO_DWELL:{ set:980, streak:1330, spread:180 },
  // v15 (3.6): every Flash result reads down the same four lines — the time, the baseline it is measured against, the
  // difference between them, then where the run stands. The running total is BELOW as well as in the HUD above
  /* v18 (B.6): a Flash SET shows no baseline and no difference. Both of them are Streak furniture — the baseline is what
     the budget is spent against and the difference is what is spent — and on a Set neither is scored: it is an average of
     milliseconds and the line under the number says exactly that. The Streak keeps all four lines.
     v18 (B.10): the number itself wears its tier colour, judged on this attempt alone against ROUND_AT. Solo only (L4). */
  rxCard(word,ms,add,bad,note){ const pane=$('#rxpane'); if(!pane) return; pane.classList.remove('lit'); pane.classList.add(bad?'bad':'hit');
    const col=this.roundCol('reaction:flash',ms);
    pane.innerHTML=`<div class="rxmsg">${word}<b${col?` style="color:${col}"`:''}>${ms}<small style="font-size:14px;letter-spacing:.2em">${CP.ms}</small></b>`
      +(this.streak()?`<span class="sub">${T(CP.baseline,{n:this.FLASH_FREE})}</span><span class="sub" id="rxadd">+${add}${CP.ms}</span>`:'')
      +`<span class="sub tot" id="rxtot">${this.totLine(this.streak()?this.over+add:mean(this.times))}</span>`
      +(note?`<span class="sub">${note}</span>`:'')+`</div>`; },
  // v18 (B.10): the tier's colour for one round's own figure. Nothing in a two-player run wears it — light blue is P2 (L4)
  roundCol(key,v){ return this.two.on||this.versus()?'':roundTier(key,v); },
  totLine(v){ return this.streak()?T(CP.runTotal,{n:Math.round(v),bud:this.FLASH_BUD}):T(CP.runAvg,{n:Math.round(v)}); },
  setTot(v){ const el=$('#rxtot'); if(el) el.textContent=this.totLine(v); },
  nogo(){ return this.ctx.mode==='nogo'; }, versus(){ return this.ctx.players===2; },
  // v15 (4.4): pass & play is attempt by attempt, both modes. Flash hands the phone over after every flash; Go / No-go
  // arrives on a beat, so its turn is a block of shapes — one rule period — and the block is scored the way its Set is
  begin(){ this.round=0; this.times=[]; this.faults=0; this.over=0; this.out=false; this.wrong=0; this.seen=0; this.got=0; this.goDealt=0; this.bi=0; this.block=null; this.vsN=[0,0]; this.vsDone=false; this.skipped=[]; this.pool=[]; this.dwell=0; this.gotAll=0;
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
  turnStart(){ this.times=[]; this.skipped=[]; this.wrong=0; this.seen=0; this.goDealt=0; if(this.nogo()) return this.nogoBegin(); this.again(); },
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
    /* v18 (B.6): a Set waits FLASH_MAX and then SCORES it. "too slow · try again · attempt 2 of 5" is gone — a retake
       measured only the attempts you were quick on, which is the opposite of what a reaction Set is for. The Streak still
       waits 1500ms for the 600ms no-tap (v13 9.1): there the cost is the budget and there was never a retake to remove. */
    if(!this.versus()) this.later(()=>{ if(this.st==='go'){ if(this.streak()||this.two.on) return this.noTap(); this.noTap(this.FLASH_MAX); } },this.streak()||this.two.on?1500:this.FLASH_MAX); },
  noTap(cap){ const ms=cap||600; this.st='show'; this.times.push(ms); const add=Math.max(0,ms-this.FLASH_FREE);
    if(!this.two.on) hud.score(String(this.times.length));
    this.rxCard(CP.noTap,ms,add,false); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(30); this.hud();
    if(this.two.on) return this.twoAdd(ms);
    if(this.streak()) return this.flashAdd(add);
    // v18 (B.6): a Set's no-tap walks into the average like any other attempt and the round moves on
    this.setAdd(); },
  // v15 (3.5): an early tap. It used to be a fault — the attempt was thrown away and retaken, which made jumping the gun
  // free. Now it costs FLASH_EARLY and the attempt is spent: a Streak loses 400 of its budget, a Set carries 400ms into
  // its average. Either way `round` moves on, so this is next(), never again()
  early(){ this.clearT(); this.faults++; const ms=this.FLASH_EARLY; this.st='show'; this.times.push(ms);
    this.rxCard(CP.earlyTap,ms,ms,true,CP.earlyCost);
    this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40);
    if(this.two.on){ this.hud(); return this.twoAdd(ms); }
    if(this.streak()){ hud.score(String(this.times.length)); this.hud(); return this.flashAdd(ms); }
    this.setAdd(); },
  // v14 (6.1 / 6.3): the Set average walks to its new value, then the attempt stays on screen until it is tapped.
  // v18 (B.6): one place, because a no-tap, an early tap and a real tap all land in the same average now
  setAdd(){ const past=this.times.slice(0,-1), was=past.length?mean(past):0;
    hud.countUp({ audio:this.ctx.audio, from:was, to:mean(this.times), ms:600, fmt:v=>String(Math.round(v)), set:t=>{ hud.score(t); this.setTot(+t); }, alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  // v14 (6.1 / 6.2): a Flash Streak SHOWS its running total, and every attempt visibly walks into it — the ms over the free
  // allowance count down out of the attempt and up into the budget, the same animation Estimate and Timing already use
  /* v18 (B.7): the calculation was right and too fast to watch. The attempt's figure now HOLDS for HOLD_MS before it
     starts draining, and the drain itself runs longer — the same beat B.3c gives Timing's Streak, so the two read the
     same way. Nothing about the arithmetic moved. */
  flashAdd(add){ this.later(()=>{ if(this.st!=='show') return; this.flashDrain(add); },HOLD_MS); },
  flashDrain(add){ hud.addUp({ audio:this.ctx.audio, from:this.over, err:add, ms:900, el:$('#rxadd'), fmt:v=>'+'+Math.round(v)+CP.ms, alive:()=>this.st==='show',
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
    this.setAdd(); },
  /* v18 (B.6): fault() is retired. It was the only caller of "too slow" and of "try again - attempt N of 5", and both
     of them go with the retake - an attempt that runs long is scored at FLASH_MAX and counts. */
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
  /* Go / No-go (v11): shapes arrive on a fixed beat — the skill is inhibition, not prediction.
     v18 (B.1b): the rule changes every ROUND, and a round is GO_PER correct taps of one shape. A Set is ctx.len of them
     — five rounds, fifteen correct taps — scored on the average ms over every target the run DEALT plus 150ms a wrong
     tap (v14 A.2). v14 (6.2 / L5 / C.2): a Streak is a cumulative TIME budget like every other Streak — ms over 150 plus
     200ms a wrong tap, out at 1000ms — and the score is shapes survived.
     v18 (B.1c): NOTHING ends a run early in either length. C.4 retired the three-wrong-taps contract for the Streak at
     build 22; B.1c retires it for the Set and for a pass & play turn, and the mode line no longer promises one. */
  /* v18 (B.1b): a ROUND is one target shape. Every mode deals its round as a block up front — pass & play always did
     (#375b), and solo rolling shape by shape is what made the target's position guessable and the run three seconds long. */
  nogoBegin(){ this.round=0; this.rule=''; this.bi=0; this.block=null; this.blockGo=0; this.pool=[]; this.gotAll=0; this.skipped=[]; this.nextRule(); },
  /* v19 (C.3): the five shapes, and the order the rounds draw on them. SHAPE_WORD in config/games.js is the pool — five
     since build 32 — and a Set's five rounds are one shuffle of it, so every round of a Set has a different target and the
     five together cover the pool. A Streak keeps drawing the same way: a fresh shuffle each time the pool runs out, with
     the one rule the old three-shape draw already kept — the target never repeats twice running. */
  nextTarget(){ if(!this.pool.length){ const all=Object.keys(SHAPE_WORD).slice(); for(let i=all.length-1;i>0;i--){ const j=rnd(i+1); [all[i],all[j]]=[all[j],all[i]]; }
      if(all[0]===this.rule&&all.length>1){ const j=1+rnd(all.length-1); [all[0],all[j]]=[all[j],all[0]]; } this.pool=all; }
    return this.pool.shift(); },
  /* v18 (B.1b): the next target shape, and the block of shapes it is hidden in. A Set stops after ctx.len rounds — five
     rounds of GO_PER correct taps, fifteen in all, where it used to be five SHAPES and over in seconds. A Streak stops
     when the budget is spent and otherwise keeps dealing. The rule never repeats twice running. */
  nextRule(){ this.clearT();
    if(this.streak()?this.over>=this.NOGO_BUD:this.round>=this.ctx.len) return this.nogoEnd();
    this.round++; this.rule=this.nextTarget();
    this.last1=''; this.last2=''; this.bi=0; this.got=0;
    this.block=this.two.on?this.dealBlock(this.two.per):this.dealRound();
    this.blockGo=this.block.filter(sh=>sh===this.rule).length;
    this.hudNogo(); this.rulePause(); },
  /* v15 (#375a, build 26): how many shapes a turn is. In pass & play it is PASS_TURNS['reaction:nogo'][0] — the config
     the build-25 review found was never read, because beat() ended a block on `this.seen >= this.ctx.len`, the Set's own
     round count. The two happened to be the same number, so the block was the right length by coincidence and would have
     silently followed SET_COPY the day either moved. v19 (§C): a solo round is dealRound() and has no fixed length any
     more, so this answers for the pass & play turn alone — the claim #375a protects is unchanged. */
  blockLen(){ return this.two.per; },
  /* v19 (C.1 / C.2 / C.3, L5): THE SOLO DEALER. A round is GO_PER sub-rounds, and a sub-round is a run of decoys and
     then the target: the run is GO_GAP_MIN..GO_GAP_MAX decoys long, drawn uniformly, so the target lands 2nd to 6th in
     its sub-round with the mean near four and a five-deep wait ordinary. That one shape gives every rule the mode has
     asked for: the first shape after the instruction is a decoy (B.1d), a correct tap is never followed by the target
     again because at least one decoy is dealt before the next one (C.1), and the position is spread rather than "always
     second or third" (C.2). It is built, not drawn-and-retried — there is nothing to retry. Decoys come from the other
     four shapes (C.3) and a decoy never repeats, which is #375b's rule and also what keeps any shape from running three
     times. A round is 6 to 18 shapes, 12 on average, where build 31's was 5 to 7. */
  dealRound(){ const others=Object.keys(SHAPE_WORD).filter(s=>s!==this.rule); const out=[]; let prev='';
    for(let t=0;t<this.GO_PER;t++){ const gap=this.GO_GAP_MIN+rnd(this.GO_GAP_MAX-this.GO_GAP_MIN+1);
      for(let k=0;k<gap;k++){ const pick=others.filter(s=>s!==prev); prev=pick[rnd(pick.length)]; out.push(prev); }
      out.push(this.rule); prev=this.rule; }
    return out; },
  /* v15 (#375b, build 26): DEAL the block, do not roll each beat. Rolling shape by shape can hand a player a turn with
     no go-shape in it at all, and then there is nothing to score them on — which is what the deleted 600ms fallback was
     papering over. A dealt block guarantees at least two go-shapes and keeps both of nextShape()'s fairness rules
     (v14 6.25): no shape three times running, and a decoy never repeats.
     v18 (B.1d): the first shape of a block is always a decoy.
     v19 (C.1): PASS & PLAY ONLY now — a turn is a fixed PASS_TURNS[0] shapes, which C.2's gaps cannot fit, so it keeps
     its own draw and gains C.1 the constructive way: the targets are chosen NON-ADJACENT (a combination of `go` slots
     out of n − go, each shifted by its index), never drawn and retried. At five shapes that is exactly two targets, at
     positions {1,3}, {1,4} or {2,4}. */
  dealBlock(n){ const others=Object.keys(SHAPE_WORD).filter(s=>s!==this.rule);
    const maxGo=Math.max(1,Math.floor((n-1)/2)), go=Math.max(1,Math.min(maxGo,2+rnd(Math.max(1,maxGo-1))));
    // `go` slots among n − go, sorted, each pushed right by its index: no two adjacent, none at index 0
    const slots=Array.from({length:n-go},(_,i)=>i); for(let i=slots.length-1;i>0;i--){ const j=rnd(i+1); [slots[i],slots[j]]=[slots[j],slots[i]]; }
    const at=slots.slice(0,go).sort((a,b)=>a-b).map((s,i)=>s+i+1);
    const mark=Array.from({length:n},(_,i)=>at.includes(i)?1:0);
    let prev=''; return mark.map(v=>{ if(v){ prev=this.rule; return this.rule; }
      const pick=others.filter(s=>s!==prev); prev=pick[rnd(pick.length)]; return prev; }); },
  /* v14 (6.26): a Streak was too fast to react to, so it ran on a slower beat than the Set — 1150 against 800.
     v19 (C.4, L5): the dwell is VARIABLE now, drawn per shape, uniform in base ± spread from NOGO_DWELL; the base is
     still per length. The value is drawn once per shape and remembered, because an untapped target is charged the window
     it was actually given (B.1b's padding), not an average of them. */
  dwellMs(){ const d=this.NOGO_DWELL; const base=this.streak()?d.streak:d.set; return Math.round(base+(Math.random()*2-1)*d.spread); },
  beatMs(){ return this.dwell||this.dwellMs(); },
  /* v18 (B.1b / B.1c): the Set line is the ROUND and how far into it you are — "round 2 of 5 · 1 of 3" — where it used
     to count shapes and carry "{w} of 3 wrong", a tally of a run-ender that no longer exists. The Streak line is
     unchanged and already says what it is spending against what budget (B.13). */
  hudNogo(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudNogoStreak,{n:this.round,over:Math.round(this.over),bud:this.NOGO_BUD}):T(CP.hudNogo,{n:Math.min(this.ctx.len,this.round),s:this.ctx.len,h:this.got,p:this.GO_PER})); },
  /* v18 (B.1b): a Set is scored over every target the run DEALT, not only the ones that were tapped. #375b already
     reasoned this out for a pass & play turn — an unanswered target is charged the whole beat window it was given, so
     giving up cannot score better than trying — and fifteen targets a Set instead of two or three is what makes it
     matter here. Wrong taps still add NOGO_WRONG_SET each (L5), and they are the only thing they do now (B.1c).
     v19 (C.5): everything passes THE GATE first — a target is worth max(0, ms − NOGO_FREE), tapped or not, and the
     window an untapped one is charged is the dwell it was actually given (`skipped`), which is variable now (C.4). The
     result is the mean of those gated figures plus 150ms a wrong tap: a Set at the old clearance bar's pace (380ms raw)
     reads 200 now, which is why config/key-bars.js converts that bar rather than keeping it. */
  gated(ms){ return Math.max(0,ms-this.NOGO_FREE); },
  setPad(){ return this.skipped.length; },
  gatedAll(){ return this.times.map(ms=>this.gated(ms)).concat(this.skipped.map(ms=>this.gated(ms))); },
  /* v19 (C.6): a Streak SCORES IN TARGETS — the correct taps it banked — not in shapes seen. C.2 makes the number of
     shapes behind each target a draw of one to five, so "shapes survived" would have paid out on the luck of the deal;
     the targets a player answered are the same number whatever the deal was, which is the only reading a game of pure
     skill can keep. `scoreWord` in config/games.js says targets. */
  nogoScore(){ const [x,y]=minMax(this.times); if(this.streak()) return {hits:this.gotAll,misses:this.wrong,x,y,lim:this.NOGO_BUD+'ms'};
    const all=this.gatedAll();
    return {hits:Math.round((all.length?mean(all):this.gated(this.NOGO_DWELL.set))+this.NOGO_WRONG_SET*this.wrong),misses:this.wrong,x,y}; },
  /* v15 (#375b, build 26): what a pass & play BLOCK is worth, and the reason the 600ms fallback could be deleted rather
     than retuned. Every go-shape the block dealt is worth either the tap it got or the whole beat window it was given —
     both real numbers the run produced — plus 150ms a wrong tap, which is how the Set scores (v14 A.2). dealBlock
     guarantees at least two go-shapes, so there is always something to average, and a turn that ended early on three
     wrong taps is charged for the shapes it never answered instead of being scored better for giving up.
     v19 (C.5): through the gate, like the Set — the two are one currency. */
  blockScore(){ const all=this.gatedAll();
    return (all.length?mean(all):this.gated(this.NOGO_DWELL.set))+this.NOGO_WRONG_SET*this.wrong; },
  // the number under the HUD while a block is being played — the same one it will bank, so it can only improve
  liveNum(){ return this.streak()?this.nogoScore().hits:Math.round(this.two.on?this.blockScore():this.nogoScore().hits); },
  /* v18 (B.1a): the instruction ARRIVES WHOLE. It was revealed a word at a time — "tap … only … the … ▲ … triangle" —
     with the last word landing about 880ms into a 2200ms window, so most of the time you had to read it was spent
     watching it appear. `atOnce` on rxBar already existed for Spot (B.14, build 28); Reaction uses it now too. */
  rulePause(){ this.clearT(); this.st='rule'; $('#gen').innerHTML=`<div class="rxpane" id="rxpane"></div>`;
    rxBar([...(this.round>1?CP.ruleNow:CP.ruleTap),shapeI(this.rule),`<b>${SHAPE_WORD[this.rule]}</b>`],true); this.later(()=>this.nogoWait(),2200); },
  // v14 (6.25): there is ALWAYS a wait period — before the first shape and after every rule change. Tapping through it is a wrong tap
  nogoWait(){ this.clearT(); this.st='wait'; const pane=$('#rxpane'); if(pane) pane.innerHTML=`<div class="rxmsg" id="rxmsg" style="top:40%;font-size:11px">${CP.wait}</div>`; this.later(()=>this.beat(),700+Math.random()*900); },
  /* v14 (6.25) / v18 (B.1b): nextShape() is retired. Rolling a shape per beat is what let the target land first every
     time, and its two fairness rules - no shape three times running, no decoy repeated - live in dealBlock now, where
     B.1d's third rule could be added beside them. Every mode deals its round; nothing rolls. */
  /* v15 (4.4): in pass & play the end of a block is the end of a TURN, not the end of the run.
     v15 (#375a, build 26): the block's length comes from PASS_TURNS now, not from the Set's round count — and the rule
     change is SUPPRESSED inside a pass & play block, so a turn is one rule period whatever the turn length is set to.
     Build 25's comment claimed that and the code did not deliver it: the rule flips on RULE_EVERY shapes, so any turn
     longer than five would have spanned a change and put the block's dealt shapes under a rule that no longer applied. */
  /* v18 (B.1b): the block IS the round. It runs to its end and then the rule changes - for a Set that is the next of
     ctx.len rounds, for a Streak the next target shape, for a pass & play turn the end of the turn. The old
     "flip the rule every RULE_EVERY shapes" branch is retired with RULE_EVERY itself. */
  // v19 (C.5 / B.1b): a target that left the screen untapped is charged the window it was given — remembered here, on the
  // beat that replaces it, so the Set's mean and the pass & play block are over every target dealt
  skipTarget(){ if(this.st==='go') this.skipped.push(this.dwell); },
  beat(){ if(this.streak()&&this.over>=this.NOGO_BUD) return this.nogoEnd();
    this.skipTarget();
    if(!this.block||this.bi>=this.block.length) return this.two.on?this.twoBlockEnd():this.nextRule();
    const pane=$('#rxpane'); if(!pane) return; this.shown=this.block[this.bi++]; this.seen++; if(this.shown===this.rule) this.goDealt++; this.hudNogo();
    // v19 (C.3): the two new shapes turn like the two that already did — a diamond is a square on its point and stays one
    const v=vmin(), dx=(Math.random()-.5)*24*v, dy=(Math.random()-.5)*22*v, sc=.75+Math.random()*.45,
      rot=this.shown==='tri'?[0,180,90,270][rnd(4)]:this.shown==='square'?[0,45][rnd(2)]:this.shown==='hex'?[0,30][rnd(2)]:0;
    // v14 (6.24): the next shape replaces the last one where it stands — square to triangle goes straight through, never to black.
    // Every beat moves, turns and resizes it, so a repeat of the same shape still reads as a new one
    pane.classList.remove('bad'); pane.innerHTML=`<div class="rxshape ${this.shown}" style="translate:${dx}px ${dy}px;scale:${sc};rotate:${rot}deg"></div>`;
    // v19 (C.4): this shape's own dwell, drawn now and kept until the next beat, so a skipped target is charged exactly it
    this.dwell=this.dwellMs();
    this.st=this.shown===this.rule?'go':'nogo'; this.arm(); this.later(()=>this.beat(),this.dwell); },
  nogoTap(ev){ if(this.st==='rule'||this.st==='over') return; const pane=$('#rxpane'); if(!pane) return;
    if(this.st==='go'&&this.armed){ const ms=Math.max(1,Math.round(ev.t-this.t0)); this.times.push(ms); this.got++; this.gotAll++; this.st='hit';
      const add=this.gated(ms); if(this.streak()) this.over+=add;
      // v18 (B.10): the round's own figure wears its tier colour. Solo only (L4)
      const col=this.roundCol('reaction:nogo',ms);
      pane.innerHTML=`<div class="rxmsg" style="top:40%"><b style="font-size:clamp(28px,9vw,60px)${col?';color:'+col:''}">${ms}<small style="font-size:12px;letter-spacing:.2em">${CP.ms}</small></b>${this.streak()?`<span class="sub">+${add}${CP.ms}</span>`:''}</div>`;
      this.ctx.audio.hit(); hud.score(this.liveNum()); hud.scorePop(); this.hudNogo(); this.ctx.emit('live',this.nogoScore()); return; }
    if(this.st==='hit'||this.st==='go'||this.st==='wrongshow') return; // the rule shape before it has painted, a second tap on a hit, or a tap during the wrong-tap card: nothing
    /* v18 (B.1c, L5): a decoy, the wait period, or nothing at all is a wrong tap, and a wrong tap is now ONLY a cost -
       200ms of a Streak's budget (C.2), 150ms on a Set's average (A.2). THE THREE-WRONG-TAPS RUN-ENDER IS GONE, in the
       Set and in a pass & play turn alike. What replaces it is the cost being visible: the card says what it took, the
       score jumps by it, and the screen shakes. Aiden's note was "wrong taps do nothing I can feel", and the ender was
       the reason the cost had never needed to be felt. */
    this.wrong++; if(this.streak()) this.over+=this.NOGO_WRONG_STREAK;
    const cost=this.streak()?this.NOGO_WRONG_STREAK:this.NOGO_WRONG_SET;
    this.st='wrongshow'; pane.classList.add('bad'); hud.shake();
    pane.innerHTML=`<div class="rxmsg" style="top:40%"><b class="fb" style="font-size:clamp(18px,6vw,36px)">${CP.wrongS}</b><span class="sub">+${cost}${CP.ms}</span></div>`;
    this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40); hud.score(this.liveNum()); hud.scorePop(); this.hudNogo(); this.ctx.emit('live',this.nogoScore());
    if(this.streak()&&this.over>=this.NOGO_BUD){ this.clearT(); this.st='over'; pane.innerHTML=`<div class="rxmsg" style="top:40%">${T(CP.reached,{bud:this.NOGO_BUD})}<b style="font-size:28px">${CP.over}</b></div>`; return this.later(()=>this.nogoEnd(),1300); } },
  /* v15 (4.4): a Go / No-go turn is a block of shapes — one rule period — because a single shape on an 800ms beat cannot be
     handed over. The block is scored the way the Set is (v14 A.2): the average of the right taps plus 150ms a wrong one,
     which is why the three-wrong-taps ending closes a turn here instead of the run */
  twoBlockEnd(){ this.clearT(); this.st='over'; rxBar(null); const v=this.blockScore();
    const p=this.two.p, was=this.two.scoreOf(p); this.two.add(v); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:500, fmt:x=>String(Math.round(x)), set:t=>hud.score(t), alive:()=>this.st==='over',
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.later(()=>this.next(),1200); } }); },
  // v18 (B.1c): nothing ends a Go / No-go run early any more, so there is no failed finish to report
  nogoEnd(){ this.clearT(); this.st='over'; rxBar(null); this.ctx.emit('finish',this.nogoScore()); } });

export default RX;
export { RX };
