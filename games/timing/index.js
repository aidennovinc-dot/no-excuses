/* No Excuses — Timing — Stopwatch and Hidden
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract, on the round base. Behaviour is identical to build 11. */

import { TIMING as CP } from "../../config/copy.js";
import { CFG, HIDDEN } from "../../config/games.js";
import { $, T, f2, minMax, sum } from "../../core.js";
import { ROUND_AT } from "../../config/verdicts.js";
import * as hud from "../_shared/hud.js";
import { genRect, rnd, roundEngine } from "../_shared/round.js";
import { roundTier } from "../_shared/tier.js";
import { makeTwo } from "../_shared/two.js";
/* Timing — Stopwatch: a clock counts up and fades at 1.5s, tap on the target. Hidden: a ball rolls behind a wall, tap when it is at the marker. Both Sets are a TOTAL since build 31 (B.2), and Hidden is scored in milliseconds (B.4) */
const TM=Object.assign(roundEngine(),{ id:'timing', errs:[], target:0, t0:0, ball:null, targets:[], out:false, tot:0, asked:0, stopAt:0, ranOut:0, two:{on:false}, held:0,
  hid(){ return this.ctx.mode==='hidden'; },
  // v13 (8.2 / 8.3 / L5): a Streak is a cumulative budget, not one bad attempt — both modes add up what they are off by. Score is attempts completed
  // v15 (3.8, L5): the Stopwatch Streak's budget is 25 seconds, and passing round 10 grants five more. It WAS 2.0s —
  // Aiden read it as "about 2s" and he was exactly right, which is the whole bug: two ordinary attempts against a 7s
  // target spent it, so the Streak was over before it started. Hidden's 100px is untouched. The budget text is derived
  // from the number rather than the old CP.budS literal, so a retune can never leave the screen saying something else
  /* v18 (B.3a, L5): the Stopwatch Streak's budget is 5s, 7.5s once round 10 is passed - it was 25 / 30. v15 3.8 set 25s
     because two ordinary attempts against a 7s target spent a 2s budget; B.3b's targets climb a whole second a round
     instead of half, so the run no longer needs twenty-five seconds of slack to reach round ten.
     v18 (B.4, L5): HIDDEN IS MEASURED IN MILLISECONDS. Its budget was 100 pixels, and a pixel is a different miss on
     every phone - the ball crosses #gen in the same TIME everywhere and in a very different number of pixels. Measured
     headless at 390x844: #gen is 390 x 683.66, so the ball runs 117px/s across and 205px/s down and 100px is 855ms one
     way and 488ms the other. 700ms is those two averaged (671ms) rounded to a hundred, as B.4 asks. */
  budget(){ return this.hid()?700:(this.round>10?7.5:5); },
  budTxt(){ return this.hid()?Math.round(this.budget())+CP.msU:f2(this.budget())+'s'; },
  totTxt(){ return this.hid()?Math.round(this.tot)+CP.msU:f2(this.tot)+'s'; },
  // v15 (3.8): a Stopwatch Streak's targets start low and climb — 2.5s at round 1, about half a second more each round,
  // held at 9s — instead of being drawn flat around 7s. The SET keeps v14 6.18's exact-mean deal untouched: that one is
  // a promise printed on the sheet ("5 rounds averaging 7s ask for 35.00s") and a ramp would make it a lie
  /* v18 (B.3b, L5): the targets climb A WHOLE SECOND a round and are not held. 2.5s at round 1, 3.5s at round 2, 12.5s
     at round 11 - where the old +0.45s held at 9s meant "at attempt 14 the target was only 8 seconds", which is Aiden's
     note word for word. The Set's exact-mean deal below is untouched: that one is a promise printed on the sheet. */
  rampAt(r){ const mid=2.5+1*(r-1); return Math.round((mid+(rnd(2)?1:-1)*Math.random()*.4)*100)/100; },
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
  begin(){ this.round=0; this.errs=[]; this.out=false; this.tot=0; this.asked=0; this.ranOut=0; this.held=0; this.two=makeTwo(this.ctx,{lower:true,agg:'sum',fmt:v=>this.hid()?Math.round(v)+CP.msU:f2(v)+'s'});
    this.targets=this.deal(this.streak()?40:this.ctx.len);
    hud.score(this.streak()?this.streakScore():(this.hid()?'0'+CP.msU:'0.00s')); this.next(); },
  // v11 / v18 (B.2 / B.4): Stopwatch Set = 5 attempts, TOTAL absolute s off. Hidden Set = 10 runs, total ms off. Streak = attempts until the budget is spent, score attempts completed. Every figure is an absolute difference — early never cancels late
  // v17 (B.12): `ov` says an attempt ran the full CFG.swOver seconds past its target. It is the only thing on the record
  // that a partial run can claim honestly the moment it happens, which is why the row that reads it is live:1
  /* v18 (B.2, L5): THE STOPWATCH SET IS CUMULATIVE. It was the mean of the absolute differences; it is their SUM now -
     Aiden: "I might have said average before; I don't want that any more." Hidden already summed and still does, in
     milliseconds (B.4). Both Sets are therefore a total, which is also what SET_COPY's line says. */
  result(){ const [x,y]=minMax(this.errs); const r=this.streak()?{hits:this.errs.length,misses:0,x,y,lim:this.budTxt()}:{hits:this.hid()?Math.round(sum(this.errs)):Math.round(sum(this.errs)*100)/100,misses:0,x,y};
    if(this.ranOut) r.ov=1; return r; },
  // v16 (1.5): a Set ramps over its last round, a Streak once the budget is 80% spent. Music only (A.1)
  fin(){ if(this.two.on) return 0; return this.streak()?this.finBud(this.tot,this.budget()):this.finSet(); },
  /* v18 (B.3d): a Stopwatch Streak's HUD line is "attempt N" and nothing else, because the big number above it now says
     what is spent out of the budget (spentLine below). It used to say both, and the score said the round a third time.
     Hidden's line keeps the whole sentence - it is the one that states its budget (B.13). */
  hud(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    if(!this.streak()) return hud.time(T(CP.hudSet,{n:this.round,s:this.ctx.len}));
    hud.time(this.hid()?T(CP.hudStreak,{n:this.round,tot:this.totTxt(),bud:this.budTxt()}):T(CP.hudAttempt,{n:this.round})); },
  /* v18 (B.3d): what the big white number reads in a Stopwatch Streak - "2.3 / 5.0s", the time spent out of the budget.
     It was the count of attempts completed, which "attempt N" underneath already said. Hidden keeps the count. */
  spentLine(){ return T(CP.spentOf,{tot:this.tot.toFixed(1),bud:this.budget().toFixed(1)}); },
  streakScore(){ return this.hid()?String(this.errs.length):this.spentLine(); },
  next(){ this.clearT(); this.round++; if(this.round>this.targets.length) this.targets=this.targets.concat(this.deal(20));
    // v15 (4.3): the run is over when both players have taken their attempts, and every hand-over waits for a tap
    if(this.two.on){ if(this.two.over()) return this.ctx.emit('finish',this.two.record()); return this.two.gate(this,()=>{ this.st='arm'; this.hid()?this.hidden():this.watch(); }); }
    if(this.out||(!this.streak()&&this.round>this.ctx.len)) return this.ctx.emit('finish',this.result()); this.hud(); this.st='arm'; this.hid()?this.hidden():this.watch(); },
  watch(){ this.target=this.streak()?this.rampAt(this.round):Math.round((this.targets[this.round-1]||7)*100)/100;
    // v14 (6.18): every target adds to a visible running total of the time the game has asked for, and it lands exactly on the
    // stated average — the player can see the run was never given a harder deal than anybody else's
    /* v16 (§3): the running total of what the game has ASKED FOR is a Streak line now. Aiden: "Timing doesn't need a
       baseline target for Set, only for Streak. Streak adds the difference; Set is just the average." He is right about
       what it is for — a Streak spends a budget of accumulated error, so the total it has asked for is the thing the
       budget is measured against; a Set is scored on the mean of the absolute differences and the total is decoration.
       v14 6.18's exact-mean DEAL is untouched — five rounds averaging 7s still ask for exactly 35.00s, nobody is dealt a
       harder set of targets than anybody else, and the gate still checks it. It is the display that goes, not the deal. */
    /* v18 (B.3d / B.2): the running total of what the game has ASKED FOR goes back to being a SET line. v16 3 moved it to
       the Streak on the reasoning that a Set was scored on a mean and the total was decoration - B.2 makes the Set a
       total, so the baseline it is measured against belongs beside it, and Aiden's note is that a Streak's own HUD
       already carries two climbing second-figures and the third was noise. */
    const was=this.asked; this.asked=Math.round((this.asked+this.target)*100)/100; const showAsked=!this.streak();
    $('#gen').innerHTML=`<div class="tmtarget">${CP.target}<b>${f2(this.target)}</b>${showAsked?'<u id="tmasked"></u>':''}</div><div class="tmclock" id="tmclock">0.00</div><div class="glbl bot" id="tmhint">${CP.stop}</div>`;
    if(showAsked) hud.countUp({ from:was, to:this.asked, ms:600, fmt:v=>T(CP.askedSet,{tot:f2(v),all:f2(this.askTot())}), set:t=>{ const el=$('#tmasked'); if(el) el.textContent=t; }, alive:()=>this.st==='arm'||this.st==='run' });
    this.later(()=>{ this.st='run'; this.t0=performance.now(); const el=$('#tmclock'); const loop=now=>{ if(this.st!=='run') return; const e=(now-this.t0)/1000; el.textContent=f2(e); el.style.opacity=e<1.5?1:Math.max(0,1-(e-1.5)/.5);
      /* v17 (B.12): an attempt keeps running to TEN seconds past its target before it stops itself, not five, and it scores
         the real difference either way. Going the whole distance is a thing you can only do on purpose, so it is a secret
         row (`ov` on the record). Solo only, because no two-player run earns anything (L10); the Streak spends the ten
         seconds out of its budget exactly as it spends any other overshoot (L5 untouched). */
      if(e>this.target+CFG.swOver){ this.ranOut=1; return this.onDown(true); } this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },700); },
  // hidden (v8): the ball comes in from any of the four sides, the wall covers 55–85% of the way and is squared to the direction of travel, the marker sits somewhere inside it
  // hidden (v9): the time the ball spends behind the wall before the marker is dealt around 1.3s, in pairs, the same for everyone — and never under 0.6s, so the wall's edge is no help
  /* v18 (B.5): a Hidden STREAK varies as it goes and a Hidden SET plays exactly as it did. Three things move, all off
     HIDDEN in config/games.js: the ball's PACE is drawn from a band either side of the old fixed 0.3 (+/-25%, from round
     one); the path gains an off-axis TILT that widens with the round, so the ball no longer travels dead along an axis;
     and the marker sits further BEHIND the wall each round, on a spread that widens too, instead of the old fixed +6%
     held from round ten. `maxAt` keeps the marker on screen whatever the ramp asks for. */
  hidden(){ const r=genRect(); const size=Math.max(28,Math.min(r.width,r.height)*.11); const dir=rnd(4), horiz=dir<2; const L=horiz?r.width:r.height;
    const vary=this.streak()&&!this.two.on;
    const k=vary?Math.min(HIDDEN.rampTo,this.round)-1:0;
    const jit=(a)=>1+(Math.random()*2-1)*a;
    const v=L*HIDDEN.speed*(vary?jit(HIDDEN.band):1);
    const ramp=vary?1+HIDDEN.far*k:1+.06*(Math.min(10,this.round)-1);
    const spread=vary?jit(HIDDEN.spread*k):1;
    const tilt=vary?(Math.random()*2-1)*HIDDEN.tilt*(k/Math.max(1,HIDDEN.rampTo-1))*Math.PI/180:0;
    const cross=horiz?r.height*(.18+Math.random()*.55):r.width*(.12+Math.random()*.7);
    let behind=Math.max(.6,(this.targets[this.round-1]||1.2)*ramp*spread);
    const need=v*behind+size*1.5; const cover=Math.min(.86,Math.max(.6,need/L+.06)), wallStart=L*(1-cover);
    if(wallStart+v*behind>L*HIDDEN.maxAt) behind=Math.max(.3,(L*HIDDEN.maxAt-wallStart)/v);
    const markT=wallStart+v*behind;
    // the tilt moves the ball across its own axis as it travels; the wall stays square to the direction of travel
    const sk=Math.tan(tilt), lim=(c,m)=>Math.max(0,Math.min(m-size,c));
    const pos=t=>dir===0?{x:t-size,y:lim(cross+t*sk,r.height)}:dir===1?{x:r.width-t,y:lim(cross+t*sk,r.height)}:dir===2?{x:lim(cross+t*sk,r.width),y:t-size}:{x:lim(cross+t*sk,r.width),y:r.height-t};
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
    // v18 (B.4): the error is the TIME between the ball and the marker - the pixels divided by this round's own pace -
    // so the same miss reads the same on every phone and at every speed B.5 deals
    if(hid){ const b=this.ball; const off=(b.t-b.markT)/b.v*1000; err=Math.round(Math.abs(off)); note=off>0?CP.late:CP.early; $('#tmwall').style.opacity=.12; const g=$('#tmghost'), p=b.pos(b.t); g.style.left=p.x+'px'; g.style.top=p.y+'px'; g.style.opacity=1; }
    else { const e=(now-this.t0)/1000; err=Math.abs(e-this.target); note=e>this.target?CP.late:CP.early; const el=$('#tmclock'); el.style.opacity=1; el.textContent=f2(e); err=Math.round(err*100)/100; }
    this.errs.push(err);
    if(this.streak()) hud.score(this.streakScore());
    /* v13 (8.4): Hidden shows every round's result — the miss, dead on / early / late — then moves on.
       v18 (B.10): the round's own figure wears its tier colour, judged against ROUND_AT for this mode. Solo only (L4). */
    const key='timing:'+this.ctx.mode; const at=ROUND_AT[key]||[]; const good=err<=at[0], ok=err<=at[2];
    const col=this.two.on?'':roundTier(key,err);
    $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot" id="tmres"><b class="${good?'g':ok?'':'r'}" id="tmerr"${col?` style="color:${col}"`:''}>${hid?err+CP.msU:f2(err)+'s'}</b>${good?CP.dead:ok?CP.close:note}</div>`); const h=$('#tmhint'); if(h) h.remove();
    ok?this.ctx.audio.hit():this.ctx.audio.miss(); if(!ok&&navigator.vibrate) navigator.vibrate(30);
    if(this.two.on) return this.twoAdd(err,hid);
    if(this.streak()) return this.addUp(err,hid);
    // v14 (6.1 / 6.3) / v18 (B.2): BOTH Sets walk a running TOTAL now - Hidden's milliseconds and Stopwatch's seconds off
    const past=this.errs.slice(0,-1); const was=sum(past), to=sum(this.errs);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:600, fmt:v=>hid?Math.round(v)+CP.msU:f2(v)+'s', set:t=>hud.score(t), alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); },
  // v15 (4.3): the attempt belongs to whoever is holding the phone — their own figure walks, and the turn ends with it
  twoAdd(err,hid){ const p=this.two.p, was=this.two.scoreOf(p); this.two.add(err); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:600, fmt:v=>hid?Math.round(v)+CP.msU:f2(v)+'s', set:t=>hud.score(t), alive:()=>this.st==='show',
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.after(()=>this.next()); } }); },
  // v13 (8.2 / 8.3): the attempt's figure counts down to 0 while the running total counts up by the same amount, together, with the whoosh (6.7)
  /* v18 (B.3c): the difference HOLDS for CFG.hold before it drains into the total. It used to start draining the moment
     the result was drawn, so the number Aiden was meant to read had already begun moving - "it adds immediately and I
     can't see what happened". Reaction's Flash Streak holds on the same number (B.7), so the two beat alike. */
  addUp(err,hid){ this.later(()=>{ if(this.st!=='show') return; this.drainUp(err,hid); },CFG.hold); },
  drainUp(err,hid){ hud.addUp({ audio:this.ctx.audio, from:this.tot, err, ms:800, el:$('#tmerr'), fmt:v=>hid?Math.round(v)+CP.msU:f2(v)+'s', alive:()=>this.st==='show',
      onFrame:tot=>{ this.tot=tot; hud.score(this.streakScore()); this.hud(); },
      done:tot=>{ this.tot=tot; if(this.tot>=this.budget()) this.out=true; hud.score(this.streakScore()); this.hud();
        if(this.out){ const r=$('#tmres'); if(r) r.insertAdjacentHTML('beforeend',`<br>${T(CP.over,{bud:this.budTxt()})}`); }
        this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); } });

export default TM;
export { TM };
