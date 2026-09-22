/* No Excuses — Estimate — Grow and Cut
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract. Behaviour is identical to build 11. */

import { ESTIMATE as CP } from "../../config/copy.js";
import { CFG, ESTIMATE as EST, STREAK } from "../../config/games.js";
import { $, $$, T, f2, mean, minMax, vmin } from "../../core.js";
import { haptic } from "../../core/platform.js";
import * as hud from "../_shared/hud.js";
import { roundShow, tierWord } from "../_shared/tier.js";
import { Shapes } from "../_shared/shapes.js";
import { bandPick, gauntBand, gauntDealt, makeDealer, within } from "../_shared/deal.js";
import { makeTwo } from "../_shared/two.js";
import { DEALS, SHAPES } from "../../config/shapes.js";
/* ---------- Estimate (v9, was Hold). Grow: a shape grows with a wobble and vanishes; tap and hold to grow yours to the same area — the same shape on odd rounds, a different one on even. Cut: a shape appears; drag a line through it that splits off the share asked for. Score is % off, lower is better. Five rounds ---------- */
const HD={ id:'hold', ctx:null, st:'idle', round:0, total:0, errs:[], target:0, rot:0, shape:null, mine:null, t0:0, raf:0, p0:null, p1:null, share:50, pending:null, maxed:false, two:{on:false},
  // v25 (item 21, build 45): the angles a Grow target may be turned by — the list play() drew inline, named so the review catalogue can print it. Unmoved
  TURNS:[35,60,90,120,145,180,225,270],
  /* v26 §B2 (build 50): "the same shape only 3 times in the first 6 rounds — rounds 1, 3, 5". A solo run always did that: odd rounds grow
     the same shape, even rounds a different one. PASS & PLAY DID NOT — it read the shared round counter, so Player 1 grew the same shape
     every turn and Player 2 a different one every turn. Both now count their OWN turns, which is also what the dealer is keyed by */
  turn(){ return this.two&&this.two.on?this.two.taken[this.two.p]+1:this.round; },
  est(){ return this.ctx.mode==='grow'&&this.turn()%2===0; },
  // the hold's ceiling, in one place — down() and up() used to carry the same expression twice and could drift apart
  capOf(){ return Math.min(this.target*2.8,96*vmin()); },
  // v15 (3.1): the target's AREA is what has a floor, so the linear size it needs depends on the shape. A shape whose
  // widest instance still cannot reach the floor inside the range is re-dealt — clamping it instead would push the
  // shape off the screen. Bounded: after 12 goes take what came, so a small viewport can never hang the round
  /* v26 §B2 (build 50): the SHAPE comes from the dealer (config/shapes.js DEALS 'hold:grow') — its tier from the band's deck — and a thin
     instance is re-drawn as the same shape rather than swapped for another, so the deal's tier holds */
  pickTarget(){ const min=EST.MIN_AREA/(EST.TMAX*EST.TMAX); this.spec=this.dealer.at(this.turn()); let sh=null;
    for(let i=0;i<12;i++){ sh=Shapes.make(this.spec.shape); if(sh.coef>=min) return sh; } return sh; },
  /* v26 §B2 (build 50): the target's SIZE is the setting a Grow round pairs with its shape — a third of the range this shape can be dealt
     at, the biggest third easy — so a hard shape is dealt big and an easy one small (DEALS 'hold:grow' tiers) */
  /* v29 Section A (58.1, build 58): INSIDE A GAUNTLET THE SIZE COMES FROM THE BAND, not from the deal's tier. Aiden's own
     example of an uneven Gauntlet was this line: the tier spans the whole 0-1 of the range, so one run could be handed a
     shape at its floor and the next the same shape at TMAX, and the Gauntlet's single score cannot tell the two apart.
     The band is the same UNIT the tier is (a fraction of lo..TMAX), so nothing else on this path changes. */
  growTarget(){ const lo=Math.max(EST.TMIN,Math.min(EST.TMAX,Math.sqrt(EST.MIN_AREA/this.shape.coef))), S=this.spec;
    const gb=gauntBand(this.ctx,'size');
    const f=gb?gauntDealt(this.ctx,'size',bandPick(gb)):within(DEALS['hold:grow'].tiers[S.set],S.u);
    return lo+f*(EST.TMAX-lo); },
  streak(){ return this.ctx.len===STREAK; },
  cut(){ return this.ctx.mode==='cut'; },
  live(){ return this.ctx.timers.alive(); },
  cy(){ const f=$('#hfield').getBoundingClientRect(); return f.height*(this.cut()?.6:.5); },
  path(sh,s){ const f=$('#hfield').getBoundingClientRect(); return Shapes.path(sh,s,f.width/2,this.cy()); },
  icon(sh){ const ic=$('#hicon'); ic.classList.remove('big'); ic.innerHTML='<path/><text x="50" y="98" text-anchor="middle"></text>'; if(!sh){ ic.classList.remove('on'); return; } ic.querySelector('path').setAttribute('d',Shapes.path(sh,sh.name==='bar'?84:62,50,46)); ic.querySelector('text').textContent=SHAPES[sh.name].word; ic.classList.add('on'); },
  // the cut hint: a finger drags a dotted line through a small shape. Big and centred first, then it parks top right for the round
  hint(sh){ const ic=$('#hicon'); ic.innerHTML=`<path d="${Shapes.path(sh,58,50,50)}" fill-rule="evenodd"/><line x1="6" y1="70" x2="94" y2="30"/><circle class="fg" r="7"/>`; ic.classList.add('on','big'); this.later(()=>ic.classList.remove('big'),1500); },
  bg(t){ const b=$('#hbg'); b.textContent=t||''; b.classList.toggle('on',!!t); },
  // the share (v10) counts up from 0 to the number asked for, so the eye lands on it before the shape
  shareUp(n){ const el=$('#hshare'); if(!n){ el.classList.remove('on'); el.innerHTML=''; return; } el.classList.add('on'); const t0=performance.now(); const anim=now=>{ if(!this.live()||this.st==='reveal') return; const k=Math.min(1,(now-t0)/900); el.innerHTML=`${Math.round(n*k)}%${CP.shareTarget}`; if(k<1) requestAnimationFrame(anim); }; requestAnimationFrame(anim); },
  set(layer,sh,s,wob){ const p=$(`#${layer} path`); if(!sh||s<=0){ p.setAttribute('d',''); return; } p.setAttribute('d',this.path(sh,s)); const f=$('#hfield').getBoundingClientRect(); p.setAttribute('transform',wob?`translate(${wob.x},${wob.y}) rotate(${wob.a} ${f.width/2} ${this.cy()})`:''); },
  wobble(ms){ return {a:this.rot+Math.sin(ms/90)*4, x:Math.sin(ms/70)*3, y:Math.cos(ms/110)*3}; },
  // a bottom-up fill (v11): the clip rect's top edge climbs from under the shape to above it as k goes 0 → 1
  clipTo(id,k,size){ const r=$('#'+id); if(!r) return; const cy=this.cy(), y1=cy+size*.78, y0=cy-size*.78; r.setAttribute('y',y1-(y1-y0)*k); r.setAttribute('height',99999); },
  clipFull(id){ const r=$('#'+id); if(r){ r.setAttribute('y',-9999); r.setAttribute('height',99999); } },
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); cancelAnimationFrame(this.raf); },
  later(f,ms){ this.ctx.timers.later(f,ms); },
  reset(){ this.st='idle'; ['ht','hg','hm'].forEach(l=>this.set(l,null,0)); $$('#hcut path').forEach(p=>p.setAttribute('d','')); ['tclipr','hclipr','aclipr','bclipr'].forEach(id=>this.clipFull(id)); $('#hline').style.opacity=0; $('#hcalc').classList.remove('on'); $('#hcalc').innerHTML=''; $('#hfield').classList.remove('show','rev'); this.bg(''); this.shareUp(0); this.icon(null); $('#hlbl').innerHTML=''; },
  // the contract: a fresh field before the countdown; the round starts after it; a stop only cancels — the last reveal stays up under the result
  mount(ctx){ this.ctx=ctx; this.pending=null; hud.hold(false); this.reset(); },
  start(){ this.begin(); },
  stop(){ this.st='idle'; this.clearT(); this.pending=null; hud.hold(false); },
  // v14 (6.3): the reveal stays up until it is tapped. That tap is consumed here — it must not start the next round's hold
  input(ctx,ev){ if(this.pending){ if(ev.type!=='down') return; const f=this.pending; this.pending=null; hud.hold(false); ctx.audio.click(); return f(); }
    if(ev.type==='down') this.down(ev); else if(ev.type==='move') this.cutMove(ev); else if(ev.type==='up') this.up(); },
  wait(f){ this.pending=f; hud.hold(true); },
  // first play (v6): Grow — the ghost waits for the target, holds for the right length, lets go, and the reveal plays; Cut has no demo, the one-liner sits for 1.8s
  // v15 (3.2): the demo's own reveal used to be cut off — done fired on a flat 1300ms while the count-and-fill panel needs
  // about three seconds, so the 3-2-1 started over the top of it. It waits for the reveal to park in `pending` (the state
  // the engine reaches when it has finished showing and is waiting for a tap) and only then hands over. Bounded at ~9s
  demo(ctx,g,done){ if(this.cut()) return 1800; this.begin(); const c=()=>g.centre($('#hfield')); let t=0;
    const shown=()=>{ let n=0; const poll=()=>{ if(this.pending||n++>90) return g.later(done,600); g.later(poll,100); }; g.later(poll,300); };
    const poll=()=>{ if(this.st==='wait'){ const p=c(); g.at(p.x,p.y+40); g.show(); g.later(()=>{ g.hold(true); this.down({type:'down',x:0,y:0}); const dur=this.target/(CFG.holdRate*vmin())*1000; g.later(()=>{ this.up(); g.hold(false); shown(); },dur); },400); } else if(t++<60) g.later(poll,100); };
    g.later(poll,200); return 0; },
  // v15 (4.1 / 4.2): pass & play is turn by turn — a round each, the phone over, lowest average % off wins
  begin(){ this.round=0; this.total=0; this.errs=[]; this.maxed=false; this.two=makeTwo(this.ctx,{lower:true,fmt:v=>f2(v)+'%'}); this.dealer=makeDealer(this.cut()?'hold:cut':'hold:grow'); hud.score(this.streak()?'0':'0.00%'); this.next(); },
  /* v26 §B2 (build 50): an even round's own shape is a different one of similar fill AND of the target's tier where the pool has one, so the
     deal's difficulty is the difficulty played. The last fallback could hand back the target's own shape on a "different shape" round;
     it cannot now */
  pickMine(){ if(!this.est()) return this.shape; const c=this.shape.coef, pool=this.spec.pool.filter(n=>n!==this.shape.name);
    const fill=list=>list.map(n=>Shapes.make(n)).filter(s=>s.coef/c>=.4&&s.coef/c<=2.5);
    const ok=fill(pool.filter(n=>SHAPES[n].tier===this.spec.tier)), any=ok.length?ok:fill(pool);
    return any.length?any[Math.random()*any.length|0]:Shapes.random(pool); },
  // v11: Set = 7 rounds, score the average % off (lower wins). Streak = the % differences add up; the run ends when the total reaches 100, score rounds
  // v15 (answer 2, build 24): `mx` says a hold ran all the way to its ceiling. It is what the Greedy achievement asks for
  // in words, and unlike a % threshold it is true at EVERY target size — see the note on capOf and FEATURES.md
  /* v29 (item 2, build 55): NO ROUND MEANS NO BEST ROUND. minMax on an empty list answers [0,0] (core.js) - a display
     convenience, never a best - and `x:0` satisfies every lower-is-better live test there is. Quitting a Grow run during
     the 3-2-1, before the first reveal, therefore banked 'Unlock: Cut' (hold:cut is x<=15), and the same abort on Cut
     banked Sequence (x<=3.5). x and y are left OUT while no round has landed, so a predicate reading them is false, and
     run.js's abort() no longer runs liveCheck at all on a run with nothing on it - both halves, because either alone
     leaves the other route open. */
  result(){ const [best,worst]=minMax(this.errs); const none=!this.errs.length;
    const r=this.streak()?{hits:this.errs.length,misses:0,x:best,y:worst,lim:'100%'}:{hits:Math.round(mean(this.errs)*100)/100,misses:0,x:best,y:worst};
    if(none){ delete r.x; delete r.y; } if(this.maxed) r.mx=1; return r; },
  // v13 (6.2): "Round 2 of 7" in a Set; a Streak says "Round n" with the running total beside it
  hud(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudStreak,{n:this.round,tot:f2(this.total)}):T(CP.hudSet,{n:this.round,s:this.ctx.len})+(this.ctx.mode==='grow'?(this.est()?CP.diff:CP.same):'')); },
  /* v16 (1.5): the Streak budget is 100% (L5), so the ramp starts at 80 spent; a Set ramps over its last round. Music
     only (A.1). Estimate is the one engine that is NOT built on roundEngine — it owns its own wait() and its own round
     loop — so it cannot borrow finBud / finSet from there and spells both out. */
  fin(){ if(this.two.on) return 0; return this.streak()?Math.max(0,Math.min(1,(this.total/100-.8)/.2)):(this.round>=this.ctx.len?1:0); },
  next(){ this.clearT(); this.round++;
    // v15 (4.1 / 4.2): a pass & play run ends when both players have had their turns, not on a length — and every hand-over
    // waits for a tap, which is the one place §3.9 kept the cue for
    if(this.two.on){ if(this.two.over()) return this.ctx.emit('finish',this.two.record()); this.reset(); return this.two.gate(this,()=>this.play()); }
    if(!this.streak()&&this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); if(this.streak()&&this.total>=100) return this.ctx.emit('finish',this.result()); this.reset(); this.play(); },
  play(){ if(this.cut()) return this.cutRound();
    this.hud(); const v=vmin(); this.shape=this.pickTarget(); this.target=this.growTarget()*v; this.mine=this.pickMine();
    // v14 (6.13): rotating a circle does nothing and rotating a square barely more — a shape with an obvious axis of symmetry is never turned
    this.rot=(this.est()||SHAPES[this.shape.name].sym)?0:this.TURNS[Math.random()*this.TURNS.length|0];
    // v14 (6.11): the shape you are about to grow is always drawn, centre-top, whether or not it is the target's shape
    // v17 (B.3): no footer line. #hbg carries the one instruction that matters and the HUD carries the round
    this.icon(this.mine); $('#hfield').classList.add('show');
    this.st='show'; const t0=performance.now(), rate=CFG.holdRate*v, dur=this.target/rate*1000;
    const grow=now=>{ if(!this.live()) return; const p=Math.min(1,(now-t0)/dur); this.set('ht',this.shape,this.target*p,this.wobble(now-t0)); if(p<1) this.raf=requestAnimationFrame(grow); else this.later(()=>this.ready(),420); };
    this.raf=requestAnimationFrame(grow); },
  // v11: the target stays up as a dashed outline while you grow — turned for same-shape rounds — so you can see what you are comparing to
  /* v17 (B.3): "same shape · it has been turned" and "same area" are GONE, and so is the watch-phase line above. They were
     the footer on every single round of a game that is ten rounds long, saying something the dashed outline already says. */
  ready(){ this.set('ht',null,0); $('#hfield').classList.remove('show'); this.set('hg',this.shape,this.target,{a:this.rot,x:0,y:0}); this.st='wait'; $('#hlbl').innerHTML=''; this.bg(CP.hold); this.ctx.audio.click(); },
  down(ev){ if(this.cut()) return this.cutDown(ev); if(this.st!=='wait') return; this.st='hold'; this.t0=performance.now(); $('#hlbl').innerHTML=''; this.bg(''); const rate=CFG.holdRate*vmin(), cap=this.capOf();
    const grow=now=>{ if(this.st!=='hold') return; const el=now-this.t0; this.set('hm',this.mine,Math.min(cap,el/1000*rate)); this.raf=requestAnimationFrame(grow); }; this.raf=requestAnimationFrame(grow); },
  // the reveal (v11): the target fills bottom-up while its px² counts, then yours does the same, then the difference and the %. The two fills and the two numbers are the sum, drawn
  up(){ if(this.cut()) return this.cutUp(); if(this.st!=='hold') return; this.st='reveal'; cancelAnimationFrame(this.raf); const cap=this.capOf(); const size=Math.min(cap,(performance.now()-this.t0)/1000*CFG.holdRate*vmin());
    // the hold ran to its ceiling — what Greedy actually asks for, and true at every target size
    if(size>=cap-.5) this.maxed=true;
    this.set('hm',this.mine,size); const mine=Shapes.area(this.mine.loops)*size*size, tgt=this.shape.coef*this.target*this.target; const pct=mine/tgt*100, err=Math.abs(pct-100);
    /* v30 (59.4, build 59): NO DIRECTION WORD AFTER A ROUND, in this game as in every other. Aiden: "we don't need late or early after a
       user finishes a round ... it doesn't need to be told whether it's early or late. This should apply to all games." Estimate's siblings
       of early / late are "too much" and "too little", and they go the same way: the reveal already draws your shape against the dashed
       target, so which side you missed on is visible, and the word only repeated it. A shared run has no tier (L4), so below "close" it now
       shows the percentage alone — the word it had there WAS the direction. */
    const word=err<=2?CP.money:err<=8?CP.close:'';
    // the target comes back filled, from the bottom up, inside its outline; yours fills the same way
    // v15 (3.3): the dashed target outline STAYS, over your shape, for the whole reveal — .rev lifts it above the fill.
    // Readable without motion and it needs no dismiss, which is why it beat flashing between the two
    this.set('hg',this.shape,this.target,{a:this.rot,x:0,y:0}); this.set('ht',this.shape,this.target,{a:this.rot,x:0,y:0}); $('#hfield').classList.add('show','rev'); this.clipTo('tclipr',0,this.target); this.clipTo('hclipr',0,size);
    this.calc([[CP.target,tgt,'',0,'',k=>this.clipTo('tclipr',k,this.target)],[CP.yours,mine,'m',0,'',k=>this.clipTo('hclipr',k,size)]],Math.max(tgt,mine)*1.15,()=>{ const diff=Math.round(mine-tgt); return `<b class="${err<=2?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b>`; },
      ()=>{ const t=this.tierOf('hold:grow',err); return `<b class="${err<=2?'g':err>8?'r':''}" id="hpct"${t?` style="color:${t.col}"`:''}>${f2(pct)}%</b>${t?tierWord(t):word}`; }, err, {from:pct,to:100}); },
  /* v18 (B.10): the tier's colour on the round's own figure, as a ready-made style attribute. The class beside it stays:
     `g` / `r` are the engine's own dead-on / way-off marks and the tier is the four-step reading of the same number.
     Solo only (L4) — light blue is Player 2 and red is Player 1, so a shared run keeps the player colours. */
  /* v25 (items 17 / 18, build 45): the round's tier — colour, Aiden's name and its short sound — through games/_shared/tier.js. It is asked for
     when the % line LANDS (calc() builds that line lazily), so the sound plays with the figure it describes, not at the release two seconds before */
  tierOf(key,v){ return roundShow(this.ctx.audio,key,v,!(this.two&&this.two.on)); },
  // the panel (v9): rows of bars. v11: both bars share one scale — max × 1.15 — so the bigger sits at ~87% and the smaller shows the real ratio; never both at 100%. Row[5] is a hook that fills the shape as the bar fills
  // v15 (3.7): `walk` is the round's ONE number and where it has to end up — 120% walking down to 100% on Grow, the share
  // you cut walking to the share you were asked for on Cut. It moves while the running figure gains the same overspend,
  // so the player watches the difference leave the round and arrive in the total. Lower is better at both ends
  calc(rowsIn,max,diffHtml,resultHtml,err,walk){ const rows=rowsIn.map((r,i)=>`<div class="hrow ${r[2]}"><span>${r[0]}</span><span class="bar"><i id="hb${i}"></i>${r[3]?`<u style="left:${r[3]}%"></u>`:''}</span><b id="hn${i}">0</b></div>`).join('');
    $('#hcalc').innerHTML=rows+`<div id="hdiff" style="text-align:center;opacity:0;transition:opacity .25s"></div><div id="hres"></div>`; $('#hcalc').classList.add('on');
    const pause=ms=>new Promise(r=>this.later(r,ms));
    // v13 (6.6): a rising whoosh runs for the length of every count, low to high, so the pitch follows the fill
    const fill=(i,val,unit,hook)=>new Promise(res=>{ const t0=performance.now(), bar=$('#hb'+i), n=$('#hn'+i); this.ctx.audio.whoosh(900,110,700); const anim=now=>{ if(this.st!=='reveal') return res(); const k=Math.min(1,(now-t0)/900); if(bar) bar.style.width=(val/max*100*k)+'%'; if(n) n.textContent=unit?(val*k).toFixed(1)+unit:Math.round(val*k).toLocaleString(); if(hook) hook(k); if(k<1) requestAnimationFrame(anim); else res(); }; requestAnimationFrame(anim); });
    const unit=rowsIn[0][4]||'';
    let chain=fill(0,rowsIn[0][1],unit,rowsIn[0][5]);
    if(rowsIn[1]) chain=chain.then(()=>pause(300)).then(()=>fill(1,rowsIn[1][1],unit,rowsIn[1][5]));
    /* v17 (B.2): the order is HIS NUMBER FIRST. It used to be difference, pause, then the % — and the % arrived already
       walking, so the shape he actually made was on screen for one frame before it slid to 100%. Aiden: "it jumps to 100%".
       Now: the shape fills and the % lands on what he made and HOLDS there; the difference appears under it; 800ms; and only
       then does the difference drain into the running total (the total counts up, the difference counts down). Grow and Cut
       take the same path, because calc() is the one path both reveals go through. */
    chain.then(()=>pause(300))
      .then(()=>{ if(this.st!=='reveal') return; const v=$('#hres'); if(v){ v.innerHTML=typeof resultHtml==='function'?resultHtml():resultHtml; v.classList.add('on'); } err<=8?this.ctx.audio.hit():this.ctx.audio.miss(); if(err>8) haptic(30); return pause(450); })
      .then(()=>{ if(this.st!=='reveal') return; const d=$('#hdiff'); if(d&&diffHtml){ d.innerHTML=diffHtml(); d.style.opacity=1; d.classList.add('pop'); } return pause(diffHtml?800:100); })
      .then(()=>{ if(this.st!=='reveal') return;
        const was=this.errs.length?mean(this.errs):0; this.errs.push(err);
        const w=walk?{el:$('#hpct'),from:walk.from,to:walk.to,fmt:v=>f2(v)+'%'}:null;
        if(this.two.on) return this.twoAdd(err,w);
        /* v31 (60.4, build 60, L5): a GROW Streak spends max(0, err − GROW_FREE) of the 100% budget; Cut spends its error whole.
           The tier above and the figure walking to 100% both read the raw error — only the cost is reduced — and the allowance
           block (60.18's shared layout) is what says so on the screen. */
        if(this.streak()){ hud.score(String(this.errs.length)); hud.scorePop(); return this.addUp(this.spendOf(err),w,err); }
        // v14 (6.1 / 6.16): the Set figure is the running average % difference — the line the sheet promises — and it WALKS to its
        // new value instead of jumping, the same as a Streak's total. Then the reveal waits for a tap (6.3)
        hud.countUp({ audio:this.ctx.audio, from:was, to:mean(this.errs), ms:700, fmt:v=>f2(v)+'%', set:t=>hud.score(t), alive:()=>this.st==='reveal', walk:w,
          done:()=>{ hud.scorePop(); this.total+=err; this.hud(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); }); },
  // v15 (4.1 / 4.2): the round belongs to whoever is holding the phone, so THEIR average walks — there is no shared total
  // in a pass & play run, and nothing about it is recorded (L10 / A.3)
  twoAdd(err,walk){ const p=this.two.p, was=this.two.scoreOf(p); this.two.add(err); const to=this.two.scoreOf(p);
    hud.countUp({ audio:this.ctx.audio, from:was, to, ms:700, fmt:v=>f2(v)+'%', set:t=>hud.score(t), alive:()=>this.st==='reveal', walk,
      done:()=>{ hud.scorePop(); this.two.turnDone(); this.later(()=>this.next(),1400); } }); },
  // v13 (6.7): in a Streak the round's % difference visibly walks into the running total — the round figure counts down to 0 while the total counts up by the same amount, together, with the whoosh
  // v14 (6.15): what the round contributes is written as what it is — "+1%" walking out of the round figure and into the total
  /* v31 (60.4, build 60): `spend` is what this round costs the budget and `raw` is the round's own error. On Grow they differ by
     the allowance; on Cut they are the same number. The allowance block is drawn before the drain starts and its bar is moved by
     the same frames that move the total, so the figure draining and the bar filling are one animation (60.18). */
  spendOf(err){ return this.cut()?err:Math.max(0,err-EST.GROW_FREE); },
  addUp(err,walk,raw){ const free=raw!==undefined&&!this.cut(), bud=EST.STREAK_BUD, spent=this.total;
    if(free){ const c=$('#hcalc'); if(c) c.insertAdjacentHTML('beforeend',hud.allowHtml({ id:'hallow', add:f2(err), unit:'%', spent, budget:bud, free:EST.GROW_FREE, freeText:CP.freeEach })); }
    hud.addUp({ audio:this.ctx.audio, from:this.total, err, ms:900, el:free?$('#hallow-add'):null, walk, fmt:v=>'+'+f2(v)+'%', alive:()=>this.st==='reveal',
      onFrame:tot=>{ this.total=tot; if(free) hud.allowBar('hallow',spent,tot-spent,bud); hud.time(T(CP.hudStreak,{n:this.round,tot:f2(this.total)})); },
      done:tot=>{ this.total=tot; this.hud(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  /* Cut (v11) — REDEALT at v26 §B2 (build 50). The shape comes from the dealer (config/shapes.js DEALS 'hold:cut'): each two-round band deals
     its mix of easy, medium and hard shapes, and the SHARE is the setting it pairs with — about a half easy, a third to a quarter medium, a
     sliver hard — so "an easy % can take a harder shape", in Aiden's words. A Streak past round 10 keeps dealing the last band.
     v13 (6.4) stands: a shape with an axis of symmetry never asks for 50% — halving one of those is a ruler job, not an estimate */
  cutRound(){ const S=this.spec=this.dealer.at(this.turn()); this.shape=Shapes.make(S.shape);
    let shares=DEALS['hold:cut'].tiers[S.set]; if(SHAPES[S.shape].sym) shares=shares.filter(v=>v!==50);
    /* v29 Section A (58.1, build 58): inside a Gauntlet the share is drawn from the band and snapped to the nearest 5 —
       every share this game has ever asked for is a multiple of 5, and a 33% ask would read as a different game. The band
       never reaches 50, so v13 6.4's "a symmetric shape is never halved" holds without the filter above having to fire. */
    const gs=gauntBand(this.ctx,'share');
    this.share=gs?gauntDealt(this.ctx,'share',Math.min(gs[1],Math.max(gs[0],Math.round(bandPick(gs)/5)*5)))
                 :shares[Math.min(shares.length-1,S.u*shares.length|0)];
    const v=vmin(); this.target=Math.min(54*v,$('#hfield').getBoundingClientRect().width*.7);
    // v13 (6.3): the drag hint plays once, on the first round of the run. After that the screen carries one instruction and one figure
    // build 55 (in passing): `round` is the SHARED counter, so in pass & play only Player 1 ever saw the drag hint
    this.hud(); const first=this.turn()===1; if(first) this.hint(this.shape); else this.icon(null); this.st='wait';
    this.later(()=>{ $('#hcut path.a').setAttribute('d',this.path(this.shape,this.target)); $('#hcut path.a').classList.remove('b'); if(!first) this.icon(null); this.bg(CP.drag); this.shareUp(this.share); },first?1500:500); },
  fpt(ev){ const f=$('#hfield').getBoundingClientRect(); return [ev.x-f.left,ev.y-f.top]; },
  cutDown(ev){ if(this.st!=='wait'||!$('#hcut path.a').getAttribute('d')) return; this.st='draw'; this.p0=this.fpt(ev); this.p1=this.p0; const l=$('#hline'); l.setAttribute('x1',this.p0[0]); l.setAttribute('y1',this.p0[1]); l.setAttribute('x2',this.p0[0]); l.setAttribute('y2',this.p0[1]); l.style.opacity=1; this.bg(''); },
  cutMove(ev){ if(this.st!=='draw') return; this.p1=this.fpt(ev); const l=$('#hline'); l.setAttribute('x2',this.p1[0]); l.setAttribute('y2',this.p1[1]); },
  cutUp(){ if(this.st!=='draw') return; const d=[this.p1[0]-this.p0[0],this.p1[1]-this.p0[1]], len=Math.hypot(d[0],d[1]); if(len<24){ this.st='wait'; $('#hline').style.opacity=0; this.bg(CP.draw); return; }
    const f=$('#hfield').getBoundingClientRect(), cx=f.width/2, cy=this.cy(); const loops=this.shape.loops.map(L=>L.map(([x,y])=>[cx+x*this.target,cy+y*this.target])); const total=Shapes.area(loops);
    const A=Shapes.clip(loops,this.p0,d,1), B=Shapes.clip(loops,this.p0,d,-1); const aA=Shapes.area(A), aB=Shapes.area(B);
    if(Math.min(aA,aB)/total<.005){ this.st='wait'; $('#hline').style.opacity=0; $('#hlbl').innerHTML=T(CP.missed,{share:this.share}); this.bg(CP.drag); this.ctx.audio.miss(); return; }
    this.st='reveal'; const small=aA<=aB?A:B, big=aA<=aB?B:A, aS=Math.min(aA,aB), aL=Math.max(aA,aB); const share=aS/total*100, err=Math.abs(share-this.share);
    // the line runs on across the whole field, and the two pieces take two tones
    const ext=Math.max(f.width,f.height)*2, ux=d[0]/len, uy=d[1]/len, l=$('#hline'); l.setAttribute('x1',this.p0[0]-ux*ext); l.setAttribute('y1',this.p0[1]-uy*ext); l.setAttribute('x2',this.p0[0]+ux*ext); l.setAttribute('y2',this.p0[1]+uy*ext);
    const P=Ls=>Ls.map(L=>'M'+L.map(([x,y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join('L')+'z').join(''); $('#hcut path.a').setAttribute('d',P(small)); $('#hcut path.b').setAttribute('d',P(big)); $('#hlbl').innerHTML='';
    // the reveal (v11): each piece fills bottom-up while its px² counts, the cut-off piece first, then the rest; then the share against the target and the difference
    this.clipTo('aclipr',0,this.target); this.clipTo('bclipr',0,this.target);
    const word=err<=1.5?CP.money:err<=5?CP.closeCut:''; const want=total*this.share/100;
    // v13 (6.5): ONE bar. It is the whole shape; the cut piece's share fills it from the left while the px² count, and the red target line stays put.
    // The two pieces wear the customisable pair — the piece in --cutp, the rest at 40% of it — and the bar wears the same two colours
    this.clipFull('bclipr');
    this.calc([[CP.piece,aS,'cutbar',Math.round(want/total*100),'',k=>this.clipTo('aclipr',k,this.target)]],total,()=>{ const diff=Math.round(aS-want); return `<b class="${err<=1.5?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b><br><span style="font-size:10px">${T(CP.targetPx,{n:Math.round(want).toLocaleString()})}</span>`; },()=>{ const t=this.tierOf('hold:cut',err); const v=t?tierWord(t):word;
      /* v30 (59.4, build 59): the verdict may now be EMPTY on a shared run's worst band, because the only word it had there was the
         direction. The target share still follows it, so the separator is put on with the word rather than typed before the share —
         59.4 asks for the " · " gone too, "not left dangling". */
      return `<b class="${err<=1.5?'g':err>8?'r':''}" id="hpct"${t?` style="color:${t.col}"`:''}>${f2(share)}%</b>${v?v+' · ':''}${T(CP.targetShare,{n:this.share})}`; },err,{from:share,to:this.share}); } };

export default HD;
export { HD };
