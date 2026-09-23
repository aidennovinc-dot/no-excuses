/* No Excuses — Spot — Count and Find
   Split out of index.html at build 12. Rebuilt for build 13: the ramp is the difficulty, and both modes are Set or Streak.
   Build 17 (refactor stage 3): the engine contract, on the round base. */

import { SPOT as CP } from "../../config/copy.js";
import { CFG, COUNT_ADD, COUNT_BUDGET, COUNT_SHOW, SPOT_FIND, SPOT_RAMP, VS_TARGET } from "../../config/games.js";
import { DEALS, LOOKALIKE, LOOK_FROM, LOOK_SHARE, SHAPES } from "../../config/shapes.js";
import { $, $$, T, f2, minMax, pWho, winner } from "../../core.js";
import { haptic } from "../../core/platform.js";
import { bandPick, gauntBand, gauntDealt, gauntRound, makeDealer, within } from "../_shared/deal.js";
import { Shapes, shapeI } from "../_shared/shapes.js";
import * as hud from "../_shared/hud.js";
import { roundShow } from "../_shared/tier.js";
import { genRect, rnd, roundEngine, rxBar, scatter, shapeHtml } from "../_shared/round.js";
import { turnsOf } from "../_shared/two.js";
/* Spot (v8) — Count: shapes flash up, count the ones you were shown; decoys, count and flash length all ramp through the run. Find: one shape is different, tap it.
   v13 (10.1–10.3): Normal / Hard are gone — round number IS the difficulty. Count scores total miscount, Find cumulative seconds; both lower is better.
   Set = 10 rounds. Streak = a budget: 5 miscounts for Count, 10 seconds for Find, and the score is rounds. */
const SP=Object.assign(roundEngine(),{ id:'spot', right:0, wrong:0, answer:0, pts:[], size:40, times:[], pen:0, t0:0, odd:'', target:'circle', flash:0, bestFlash:0, two:false, vs:false, o1:'', o2:'', vsBase:'', topF:.08, picks:[null,null], pickT:[0,0], vsN:[0,0], off:0, tot:0,
  find(){ return this.ctx.mode==='find'; },
  // Count's two-player is ten shared rounds — both players answer the same flash — and the ten now comes off PASS_TURNS
  // rather than being written into the engine twice (v15 §4)
  twoLen(){ return turnsOf(this.ctx.game,this.ctx.mode)[0]; },
  // v15 (4.6): Find gains versus — two odd shapes in one crowd, one each, first to find theirs takes the round
  /* v18 (B.10): the tier's colour for one round's own figure, as a ready-made style attribute. Solo only (L4) — a
     pass & play Count and a Find versus keep the player colours, so neither gets one. */
  /* v25 (item 21, build 45) kept the three shapes a solo Count and Find dealt from here. v26 §B2 (build 50): a solo Count and Find deal from the
     dealer (config/shapes.js DEALS 'spot:count' / 'spot:find'), whose pools grow as the run goes; only Find versus keeps these three */
  VS_SHAPES:['circle','square','triangle'],
  // v26 §B2 (build 50): a shape's plural, for Count's "count the pluses"
  many(s){ return SHAPES[s].many||SHAPES[s].word+'s'; },
  // v25 (item 17, build 45): the round's tier colour AND its short sound, in one call through games/_shared/tier.js — each caller builds its card once a round
  rcol(key,v){ const t=roundShow(this.ctx.audio,key,v,!(this.two||this.vs)); return t?` style="color:${t.col}"`:''; },
  begin(){ this.round=0; this.right=0; this.wrong=0; this.times=[]; this.bestFlash=0; this.off=0; this.tot=0; this.two=this.ctx.players===1&&this.ctx.mode==='count'; this.vs=this.ctx.players===2&&this.find(); this.vsN=[0,0]; this.topF=.08; this.dealer=makeDealer(this.find()?'spot:find':'spot:count'); this.spec=null; hud.score(this.find()?'0.00':'0'); hud.scoreVisible(!(this.two||this.vs)); if(this.vs) return this.vsDeal(); this.next(); },
  // v16 (1.5): a Set ramps over its last round, a Streak once its budget is 80% spent — 5 miscounts on Count, 10s on
  // Find (L5). Music only (A.1); a two-player run ramps on nothing, it has no budget of its own
  fin(){ if(this.two||this.vs) return 0; return this.streak()?this.finBud(this.find()?this.tot:this.off,this.find()?10:COUNT_BUDGET):this.finSet(); },
  /* Find's crowd still grows across ten rounds; a Streak holds at the round-10 crowd.
     v30 (59.12b, build 59): inside a GAUNTLET the round the ramp reads is the middle of the reference set, not the opening — Mini
     plays 2 of the 10 and was playing the two easiest of them while `tot` scaled the bar as though they were average. This is the
     ONLY ramp in the app that grows with the round number; Timing · Hidden's variance comes from its deal, which 58.1 already bands. */
  p(){ return Math.min(1,(gauntRound(this.ctx,this.round)-1)/9); },
  /* v17 (B.15) — the difficulty is the CROWD, not the clock. The target count is dealt from a band whose two edges rise
     at different rates, so it can fall as well as climb and there is no 8-9-10-11 to count; every dipEvery-th round from
     dipFrom deals the band's floor among half again as many decoys, which is the round that has FEWER targets in a much
     bigger crowd. Decoys, motion, rotation and size variation carry the rest. The old shape is in FEATURES.md as a table. */
  // v25 (item 21, build 45): `nIn` pins the dealt target count inside the band, so the review catalogue can ask what the flash is at each edge of it
  /* v26 §B2 (build 50): `S` is the round's deal — the target count is the SETTING its shape pairs with, a third of the band (the low third easy),
     so a harder shape is counted in a smaller group. A dip round keeps its own rule and deals the floor. And later rounds stay up longer:
     `flashRound` ms a round from `flashRoundFrom`, on top of the crowd's own time */
  ramp(r,nIn,S){ const R=SPOT_RAMP;
    // v31 (60.16, build 60): the ORDINARY band is held at `bandCap`, which is lower than `nCap` — the spike is the only thing
    // that ever goes above it, and nCap is still the highest button and the spike's own ceiling (B.15)
    const cap=R.bandCap||R.nCap;
    const lo=Math.min(cap,Math.round(R.loBase+R.loPer*(r-1)));
    const hi=Math.min(cap,Math.max(lo,Math.round(R.hiBase+R.hiPer*(r-1))));
    const dip=r>=R.dipFrom&&(r-R.dipFrom)%R.dipEvery===0;
    /* v31 (60.16, build 60): the SPIKE. A round from `spikeFrom` on may, with probability `spikeP`, ask for `spikeLo`-`spikeHi`
       targets instead of the band's — rare, later rounds only, and never on a dip round, which is the opposite kind of round.
       `nIn` is the catalogue's and the gate's way of asking for a named count and still outranks everything. */
    const spike=!dip&&nIn===undefined&&r>=R.spikeFrom&&Math.random()<R.spikeP;
    const n=dip?lo:nIn!==undefined?Math.max(lo,Math.min(hi,nIn)):spike?R.spikeLo+rnd(R.spikeHi-R.spikeLo+1):S?lo+Math.round(within(DEALS['spot:count'].tiers[S.set],S.u)*(hi-lo)):lo+rnd(hi-lo+1), decoys=Math.min(R.decoyCap,Math.round((R.decoyBase+R.decoyPer*(r-1))*(dip?R.dipDecoy:1)));
    // v24 (F.4, build 44): the flash is read off the crowd this round actually deals — more shapes, more time (config/games.js)
    return { lo, hi, dip, spike, n, decoys,
      flash:Math.min(R.flashCap,R.flashBase+R.flashShape*Math.max(0,n+decoys-R.flashFree)+R.flashRound*Math.max(0,r-R.flashRoundFrom+1)),
      drift:r>=R.driftFrom?R.driftBase+(r-R.driftFrom)*R.driftPer:0,
      spin:r>=R.spinFrom?R.spinBase+(r-R.spinFrom)*R.spinPer:0,
      sizeVar:r>=R.sizeFrom?Math.min(R.sizeCap,R.sizeBase+(r-R.sizeFrom)*R.sizePer):0 }; },
  /* v17 (B.15 / B.16): one place deals a shape's own size and one place keeps a shape inside the field. `vary` spreads the
     crowd around the base size with a floor, so nothing is ever too small to count; `clamp` is what B.16 needs — reflecting
     the velocity was never enough, because a shape that has already crossed the edge stays across it, and a shape that is
     TURNING sweeps a box √2 wider than itself. The margin covers the rotation and the pulse, and the position is clamped
     rather than merely bounced, so every shape's full bounds are inside the safe area at every moment. */
  vary(size,v,min){ return v?Math.max(min||16,Math.round(size*(1+(Math.random()*2-1)*v))):size; },
  clamp(q,r){ const sz=q.sz||this.size; const m=Math.ceil((q.va?sz*(Math.SQRT2-1)/2:0)+(q.puls?sz*.09:0));
    const x0=m, x1=Math.max(x0,r.width-sz-m), y0=r.height*(this.topF||.08)+m, y1=Math.max(y0,r.height-sz-m);
    if(q.x<x0){ q.x=x0; q.vx=Math.abs(q.vx||0); } else if(q.x>x1){ q.x=x1; q.vx=-Math.abs(q.vx||0); }
    if(q.y<y0){ q.y=y0; q.vy=Math.abs(q.vy||0); } else if(q.y>y1){ q.y=y1; q.vy=-Math.abs(q.vy||0); } },
  result(){ const x=this.bestFlash, [best,worst]=minMax(this.times);
    if(this.find()) return this.streak()?{hits:this.times.length,misses:this.wrong,x:best,y:worst,lim:'10s'}:{hits:Math.round(this.tot*100)/100,misses:this.wrong,x:best,y:worst};
    const rounds=Math.max(0,this.round-1);
    return this.streak()?{hits:rounds,misses:this.wrong,x,y:this.worstOff||0,rounds,lim:COUNT_BUDGET+' miscounts'}:{hits:this.off,misses:this.wrong,x,y:this.worstOff||0,rounds}; },
  next(){ this.clearT(); this.round++;
    if(this.find()){ if(this.streak()){ if(this.tot>=10) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudFindStreak,{n:this.round,tot:f2(this.tot)})); }
      else { if(this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudFind,{n:this.round,s:this.ctx.len,tot:f2(this.tot)})); }
      return this.findRound(); }
    if(this.two){ if(this.round>this.twoLen()) return this.twoEnd(); hud.time(T(CP.hudTwo,{n:this.round,s:this.twoLen()})); return this.countRound(); }
    if(this.streak()){ if(this.off>=COUNT_BUDGET) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudCountStreak,{n:this.round,off:this.off,bud:COUNT_BUDGET})); }
    else { if(this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); hud.time(T(CP.hudCount,{n:this.round,s:this.ctx.len,off:this.off})); }
    this.countRound(); },
  countRound(){ const r=genRect(), S=this.spec=this.dealer.at(this.round), R=this.ramp(this.round,undefined,S); this.target=S.shape; const rest=S.pool.filter(s=>s!==this.target);
    const n=R.n, decoys=R.decoys; this.flash=R.flash;
    this.size=Math.max(20,Math.min(r.width,r.height)*.1*Math.min(1,Math.sqrt(6/(n+decoys))));
    // the cells are laid out for the BIGGEST a shape can be dealt, or a large one would overlap its neighbour
    /* v31 (60.16, build 60): LOOK-ALIKE DECOYS LATER. From LOOK_FROM a share of the decoy slots are drawn from the shapes this
       target is most easily mistaken for (config/shapes.js LOOKALIKE), intersected with THIS round's pool so the band's deck is
       never widened (A9); the rest are uniform, as they always were. Before LOOK_FROM, and where no look-alike is in the pool,
       nothing changes. */
    const look=this.round>=LOOK_FROM?(LOOKALIKE[this.target]||[]).filter(x=>rest.includes(x)):[];
    const decoy=()=>look.length&&Math.random()<LOOK_SHARE?look[rnd(look.length)]:rest[rnd(rest.length)];
    const list=Array.from({length:n},()=>this.target).concat(Array.from({length:decoys},decoy)); this.pts=scatter(list.length,[this.target],Math.round(this.size*(1+R.sizeVar)));
    this.pts.forEach((q,i)=>{ q.shape=list[i]||this.target; q.sz=this.vary(this.size,R.sizeVar,SPOT_RAMP.sizeMin); }); this.answer=this.pts.filter(q=>q.shape===this.target).length;
    for(let i=this.pts.length-1;i>0;i--){ const j=rnd(i+1); const t=this.pts[i].shape; this.pts[i].shape=this.pts[j].shape; this.pts[j].shape=t; }
    // v31 (60.3, build 60): Count has no ONE target — every target shape is countable and they may overlap as they always have
    this.keep=null;
    this.pts.forEach(q=>{ q.vx=(Math.random()-.5)*R.drift; q.vy=(Math.random()-.5)*R.drift; q.a=0; q.va=(Math.random()-.5)*R.spin; this.clamp(q,r); });
    /* v17 (B.14): the whole rule arrives at once, so the 1500ms it sits there is 1500ms of looking at the shape.
       v31 (60.17, build 60): AND THE SHAPE IS SHOWN BIG AND CENTRED BEFORE ANY OF IT. Aiden: "it is too easy to miss which shape
       to count." The round opens on the shape alone, large, with the instruction under it; it holds for COUNT_SHOW.hold, then
       shrinks and slides into the rule bar's own position over COUNT_SHOW.slide; COUNT_SHOW.gap later the crowd appears. The
       rule bar is drawn UNDER the card from the start and is simply uncovered, so the shape the player has been looking at and
       the shape in the line are the same drawing in the same place. The flash timer is set when the CROWD is drawn, so none of
       this comes out of the looking time. */
    this.st='wait'; $('#gen').innerHTML=''; rxBar([...CP.count,shapeI(this.target),`<b>${this.many(this.target)}</b>`],true);
    this.countIntro(()=>{ this.st='flash'; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size)).join(''); if(R.drift||R.spin) this.move('flash'); this.later(()=>this.ask(),this.flash); }); },
  /* the opening card. It is drawn into #gen, so it is cleared with everything else when the crowd is dealt, and it carries the
     rule bar's own words under the big shape — one string, from the same CP.count that the bar uses. The shrink is a CSS
     transition onto the bar's measured box, so the card really does land where the line is rather than near it. */
  countIntro(then){ const bar=$('#rxbar i.shp'), g=$('#gen');
    if(!bar||!g){ return this.later(then,1500); }
    const words=[...CP.count,'<b>'+this.many(this.target)+'</b>'].join(' ');
    g.innerHTML=`<div class="cshow" id="cshow"><i class="cshape">${Shapes.svg(this.target)}</i><span class="cword">${words}</span></div>`;
    const card=$('#cshow');
    // the two numbers the stylesheet needs come from the config, not from it (A2) — the defaults there are only a fallback
    card.style.setProperty('--cslide',COUNT_SHOW.slide+'ms'); card.style.setProperty('--cbig',COUNT_SHOW.size+'vmin');
    this.later(()=>{ if(this.st!=='wait'||!card) return;
      const a=card.getBoundingClientRect(), s=$('#cshow .cshape').getBoundingClientRect(), b=bar.getBoundingClientRect();
      const k=b.width/Math.max(1,s.width);
      card.style.setProperty('--cdx',(b.left+b.width/2-(s.left+s.width/2))+'px');
      card.style.setProperty('--cdy',(b.top+b.height/2-(s.top+s.height/2))+'px');
      card.style.setProperty('--ck',k); card.classList.add('go');
      this.later(()=>{ if(this.st==='wait') then(); },COUNT_SHOW.slide+COUNT_SHOW.gap); },COUNT_SHOW.hold); },
  // drift and spin share one loop; it dies the moment the state moves on
  move(state){ const els=$$('#gen .fs'), r=genRect(); let last=performance.now(); const loop=now=>{ if(this.st!==state) return; const dt=(now-last)/1000; last=now;
      if(state==='find'){ const c=$('#spclock'); if(c) c.textContent=f2((now-this.t0)/1000); }
      // v17 (B.16): CLAMP, not just reflect. Flipping the velocity leaves a shape that has already crossed the edge across
      // it — and a turning shape sweeps wider than its own box, which is how one drifted off screen and could not be tapped
      this.pts.forEach((q,i)=>{ q.x+=(q.vx||0)*dt; q.y+=(q.vy||0)*dt; q.a=(q.a||0)+(q.va||0)*dt; });
      // v31 (60.3, build 60): the crowd keeps its distance BEFORE it is clamped into the field, so a shape pushed off an edge is put back
      this.space(dt); this.pts.forEach(q=>this.clamp(q,r));
      this.pts.forEach((q,i)=>{ const el=els[i]; if(!el) return; el.style.left=q.x+'px'; el.style.top=q.y+'px'; if(q.va) el.style.rotate=q.a+'deg'; });
      this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },

  /* ---------- v31 (60.3, build 60): THE TARGET IS NEVER OVERLAPPED ----------
     Aiden was asked to find a shape that was not on screen. Measured over 57 dealt rounds before this: 28 targets were under 90%
     visible and several were 0% — completely buried. Two things did it. `pile()` (F.7, build 44) shuffles a share of the crowd
     onto a random neighbour, and nothing stopped it moving the TARGET or dropping a decoy on it; and the target is dealt at index
     0, so it is the first element in `#gen` and every shape that touches it paints OVER it.
     Build 44's ask stands — decoy-on-decoy piles are the whole of "start overlapped" and are untouched. It is only the target
     that is kept clear, at deal and while the crowd drifts.

     `keep` is the indices that must stay clear: Find's odd shape, and BOTH players' shapes in versus. It is set where the round
     is dealt, so a mode that has no target (Count) simply has none and nothing here does anything.

     THE MOTION. A hard wall round the target would be a tell: a player would find it by watching what the crowd bounces off. So
     every shape carries the same soft personal space (`SPOT_FIND.space`), and a pair only pushes apart while it is CLOSING —
     which is what keeps a pile that was DEALT overlapping exactly where it was dealt, because a pile sitting still is not
     closing. Round a target that soft zone is wider (`soften` × the hard edge) and the push is the same shape of push, so a
     decoy gliding round the target looks like a decoy gliding round any big neighbour. The hard edge (`keepOut`) is the backstop
     underneath it, and because the soft push starts 70% further out it is almost never the thing that acts.
     A protected shape is never itself pushed — its partner takes the whole of the push — so the target's own drift is the same
     drift every other shape has, and nothing about how it moves says which one it is. */
  keepSet(){ const k=this.keep; return Array.isArray(k)&&k.length?k:null; },
  /* the deal's own settle: the same hard edge, applied a few times with no velocity in it, so the opening frame already honours
     the keep-out. Six passes is enough for a decoy pushed out of one target to clear the other in versus. */
  settle(r){ if(!this.keepSet()) return; for(let n=0;n<6;n++){ this.space(1/60); this.pts.forEach(q=>this.clamp(q,r)); } },
  space(dt){ const P=this.pts; if(!P||P.length<2) return; const keep=this.keepSet(), K=SPOT_FIND;
    const prot=keep?new Set(keep):null;
    const cx=q=>q.x+(q.sz||this.size)/2, cy=q=>q.y+(q.sz||this.size)/2;
    for(let i=0;i<P.length;i++) for(let j=i+1;j<P.length;j++){
      const a=P[i], b=P[j], sa=a.sz||this.size, sb=b.sz||this.size, mean=(sa+sb)/2;
      const pa=prot&&prot.has(i), pb=prot&&prot.has(j); if(pa&&pb) continue;
      // the pair's own edges: the hard one only exists where one of the two is a target
      const hard=(pa||pb)?mean*K.keepOut:0, soft=hard?hard*K.soften:mean*K.space;
      let dx=cx(b)-cx(a), dy=cy(b)-cy(a); let d=Math.hypot(dx,dy);
      if(d>=soft) continue;
      if(d<1e-3){ dx=Math.cos(i*2.399); dy=Math.sin(i*2.399); d=1e-3; }
      const ux=dx/d, uy=dy/d;
      // closing speed along the line of centres; a pile that is not closing is left alone (build 44's piles survive)
      const rel=((b.vx||0)-(a.vx||0))*ux+((b.vy||0)-(a.vy||0))*uy;
      if(!hard&&rel>=0) continue;
      const gap=(soft-d)/soft, step=K.push*gap*gap*mean*dt;
      const put=(p,s)=>{ p.x+=ux*s; p.y+=uy*s; };
      if(pa) put(b,step); else if(pb) put(a,-step); else { put(a,-step/2); put(b,step/2); }
      // the backstop: nothing sits inside a target's keep-out, whatever the push did
      if(hard&&d<hard){ const need=hard-d; if(pa) put(b,need); else put(a,-need); }
    } },
  // v17 (B.15): the highest button IS SPOT_RAMP.nCap. The band may never deal more targets than the player can answer,
  // and writing 15 here is how that guarantee gets lost the next time the ramp is retuned
  keypad(){ return `<div class="pad-num">${Array.from({length:SPOT_RAMP.nCap+1},(_,i)=>`<button data-num="${i}">${i}</button>`).join('')}</div>`; },
  ask(){ this.st='ask'; this.t0=performance.now(); cancelAnimationFrame(this.raf); if(this.two){ this.picks=[null,null]; $('#gen').innerHTML=`<div class="vz top p2" id="vz1">${this.keypad()}</div><div class="vmid">${CP.howMany}<br><b>${pWho(0)} ${this.vsN[0]} · ${this.vsN[1]} ${pWho(1)}</b></div><div class="vz bot p1" id="vz0">${this.keypad()}</div>`; this.later(()=>this.twoJudge(),7000); return; }
    $('#gen').innerHTML=`<div class="glbl top" style="top:14%">${CP.howMany}</div>${this.keypad()}`; },
  /* v25 (item 21, build 45): a Find round's crowd as numbers — the expressions findRound() deals from, so the review catalogue's Round formats table
     prints what the game plays. `p` runs 0 → 1 over rounds 1 → 10 and holds there; `sizeK` is the base size as a share of the field's short side */
  // v26 §B2 (build 50): `S` is the round's deal — the crowd is the SETTING its odd shape pairs with, this round's count × its tier's factor
  /* v29 Section A (58.1, build 58): `crowd` overrides the dealer's tier factor with one drawn from the Gauntlet's band.
     The ramp itself is a function of the round number and is already identical run to run, so the factor (.85 / 1 / 1.15)
     is the only thing that makes one Gauntlet's field harder than another's. The third argument is what findRound hands
     in; every other caller passes two and gets exactly what it got before. */
  findSpec(r,S,crowd){ const p=Math.min(1,(r-1)/9); const f=crowd!==undefined?crowd:(S?DEALS['spot:find'].tiers[S.set]:1);
    return { p, n:Math.round((SPOT_FIND.nBase+Math.round(p*SPOT_FIND.nSpan))*f), drift:p*SPOT_FIND.drift, sizeVar:p*SPOT_FIND.sizeVar, overlap:SPOT_FIND.overlap+p*SPOT_FIND.overlapPer, sizeK:.085-p*.025 }; },
  findRound(){ const S=this.spec=this.dealer.at(this.round), gb=gauntBand(this.ctx,'crowd');
    const F=this.findSpec(this.round,S,gb?gauntDealt(this.ctx,'crowd',Math.round(bandPick(gb)*100)/100):undefined), p=F.p, r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*F.sizeK); this.pen=0;
    this.odd=S.shape; const rest=S.pool.filter(s=>s!==this.odd); const n=F.n, drift=F.drift;
    // v17 (B.15): Find's crowd varies in size too, arriving with the motion. v17 (B.16): and every shape is clamped inside
    // the field from the moment it is dealt, not only once it has drifted out of it
    const sv=F.sizeVar;
    this.pts=scatter(n,rest,Math.round(this.size*(1+sv)),this.odd); this.pts.forEach(q=>{ q.sz=this.vary(this.size,sv,SPOT_FIND.sizeMin); q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; q.va=0; });
    /* v24 (F.7, build 44): some of the crowd starts ON a neighbour, and only then is everything clamped in.
       v31 (60.3, build 60): THE TARGET IS NOT ONE OF THEM. `scatter` deals the odd shape at index 0, so that one index is the
       whole of `keep`; `space(0)` then settles the crowd off it once, after the clamp, in case a clamp slid a decoy in. */
    this.keep=[0];
    this.pile(this.pts,SPOT_FIND.overlap+p*SPOT_FIND.overlapPer,this.keep); this.pts.forEach(q=>this.clamp(q,r));
    this.settle(r);
    this.st='wait'; $('#gen').innerHTML=''; rxBar([...CP.find,shapeI(this.odd),`<b>${SHAPES[this.odd].word}</b>`]);
    // v14 (6.31): the round's own clock runs in large grey type behind the crowd, so the cost of staring is visible while you stare
    this.later(()=>{ this.st='find'; this.t0=performance.now(); $('#gen').innerHTML=`<div class="spclock" id="spclock">0.00</div>`+this.pts.map(q=>shapeHtml(q,this.size)).join(''); this.move('find'); },1400); },
  /* v24 (F.7, build 44): SHAPES MAY START OVERLAPPED. scatter() deals one shape to a grid cell so nothing touches, and only drift ever pushed
     two together, so Aiden found the opening frame too easy to read. `share` of the crowd is dealt on a random neighbour instead, a third to
     two thirds of that shape's own size off its corner, in any direction — the target can land under a decoy as easily as over one. */
  /* v31 (60.3, build 60): AND NEVER ON THE TARGET. `keep` is the indices that must stay clear. A protected shape is never one of
     the shapes MOVED, and is never the neighbour a shape is moved ONTO — those were the two ways the target ended up buried, and
     they are the same two lines. Everything else is build 44's: the same share of the crowd, the same random neighbour, the same
     third-to-two-thirds offset. Decoy-on-decoy piles are untouched. */
  pile(pts,share,keep){ const k=Math.round(pts.length*share); if(pts.length<2||k<1) return;
    const prot=new Set(keep||[]); const free=pts.map((_,i)=>i).filter(i=>!prot.has(i));
    if(free.length<2) return;
    const idx=free.slice(); for(let i=idx.length-1;i>0;i--){ const j=rnd(i+1); [idx[i],idx[j]]=[idx[j],idx[i]]; }
    for(const i of idx.slice(0,Math.min(k,idx.length))){ let j=free[rnd(free.length)]; for(let t=0;t<8&&j===i;t++) j=free[rnd(free.length)]; if(j===i) continue;
      const o=pts[j], sz=o.sz||this.size, ang=Math.random()*Math.PI*2, far=sz*(.33+Math.random()*.33);
      pts[i].x=o.x+Math.cos(ang)*far; pts[i].y=o.y+Math.sin(ang)*far; } },
  /* v24 (F.7, build 44): A TAP ON THE SHAPE YOU ARE LOOKING FOR ALWAYS COUNTS. The hit test took the NEAREST centre, so with two shapes
     overlapping, a tap squarely on the target could sit nearer a decoy's centre and be charged as a wrong tap — which reads as the game
     cheating. Now a tap inside a wanted shape's own box (`want`, with a 10% margin) wins outright, the nearest such shape first; only when
     the tap is on no wanted shape does the nearest centre decide, exactly as before. Find solo wants the odd shape; Find versus both players'. */
  hitAt(ev,want){ const r=genRect(); const x=ev.x-r.left, y=ev.y-r.top; let best=null, bd=1e9, own=null, od=1e9;
    this.pts.forEach((q,i)=>{ const sz=q.sz||this.size, dx=x-(q.x+sz/2), dy=y-(q.y+sz/2), d=Math.hypot(dx,dy)/sz;
      if(want(q)&&Math.abs(dx)<=sz*.6&&Math.abs(dy)<=sz*.6&&d<od){ od=d; own=i; }
      if(d<bd){ bd=d; best=i; } });
    return own!==null?own:(best===null||bd>.95?null:best); },
  // Count with a friend (v11): both see the same flash and each picks a count on their own keypad. A right pick scores by speed — but the second player has 0.35s of leeway: a right answer within 0.35s of the first right answer is a tie and both score. 10 rounds
  twoPick(ev){ const b=ev.el.closest('[data-num]'); if(!b) return; const z=b.closest('.vz'); const p=z&&z.id==='vz1'?1:0; if(this.picks[p]!==null) return; this.picks[p]=+b.dataset.num; this.pickT[p]=performance.now()-this.t0; b.classList.add('sel'); z.classList.add('done'); this.ctx.audio.select(); if(this.picks[0]!==null&&this.picks[1]!==null){ this.clearT(); this.twoJudge(); } },
  twoJudge(){ this.st='show'; const ok=[this.picks[0]===this.answer,this.picks[1]===this.answer]; let pts=[0,0], line;
    if(ok[0]&&ok[1]){ const d=this.pickT[0]-this.pickT[1]; if(Math.abs(d)<=350){ pts=[1,1]; line=CP.tie; } else { const w=d<0?0:1; pts[w]=1; line=T(CP.faster,{n:w+1}); } }
    else if(ok[0]||ok[1]){ const w=ok[0]?0:1; pts[w]=1; line=T(CP.had,{n:w+1}); } else line=CP.nobody;
    this.vsN[0]+=pts[0]; this.vsN[1]+=pts[1]; $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b>${this.answer}</b>${line}<br><span class="p1">${this.picks[0]===null?'—':this.picks[0]}</span> · <span class="p2">${this.picks[1]===null?'—':this.picks[1]}</span></div>`; (pts[0]||pts[1])?this.ctx.audio.hit():this.ctx.audio.miss(); this.later(()=>this.next(),1600); },
  twoEnd(){ const [a,b]=this.vsN; const w=winner(a,b); $('#gen').innerHTML=`<div class="glbl top" style="top:40%"><b class="${w<0?'':w?'p2':'p1'}">${w<0?CP.draw:T(CP.wins,{n:w+1})}</b>${a} – ${b}</div>`; this.ctx.audio.end(); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:T(CP.over10,{a,b,s:this.twoLen()})}}),1600); },
  /* v15 (4.6), REBUILT for v16 (§4). Find versus: two odd shapes in one shared crowd, one belonging to each player.
     What build 26 got wrong, in Aiden's words: "the intro should be slower and the UI better · the run has a mid line and
     there shouldn't be one · their shape should be able to be anywhere · players should get their shapes at the start and
     look for that same shape for all rounds moving forward · when a shape is chosen it should light up red or blue".

     Four things changed. (1) THE SHAPES ARE DEALT ONCE, at the start of the match, and both players hunt the same shape
     every round — build 26 re-dealt them each round, which is why the rule bar had to be re-read every round. (2) The two
     `.vz` bands are GONE. They were 42% of the screen each with a border between them: that border is the "mid line", and
     their big centred scores sat exactly where the crowd is. The score is one line in the HUD now and the field is the
     whole field. (3) The crowd keeps clear of the top strip (`topF`) so nothing lands under the rule bar. (4) The round's
     winner lights in their own colour (L4) and the intro is more than twice as long.

     THE OWNERSHIP RULE (v16 §4 / A.2, approved by Aiden 2026-09-10): either player may tap anywhere; a tap on YOUR shape
     scores you the round, a tap on the OPPONENT'S is a wrong tap and costs you the round, a tap on anything else is a
     wrong tap and the round continues. Note what that means in code on a shared phone with one field: the round always
     goes to the OWNER of the shape that was tapped, because "costs you the round" and "scores them the round" are the
     same event when a round has one winner. The engine cannot tell which pair of hands tapped and does not need to.
     Nothing here reaches a board, a key, an unlock or an achievement (L10). */
  vsTarget(){ return VS_TARGET[this.ctx.game]||5; },
  // 0..1 across a match that can run to 2*target-1 rounds. Motion arrives at round 2, rotation at 3, pulsing at 4
  vp(){ return Math.min(1,(this.round-1)/Math.max(1,this.vsTarget()*2-2)); },
  vsDeal(){ const all=this.VS_SHAPES, i=rnd(3); this.o1=all[i]; this.o2=all[(i+1)%3]; this.vsBase=all[(i+2)%3]; this.round=0; this.topF=.24; this.vsFindRound(); },
  vsLine(){ return `<span class="spvs"><b class="p1">${this.vsN[0]}</b> – <b class="p2">${this.vsN[1]}</b><small>${T(CP.vsRound,{n:this.round,t:this.vsTarget()})}</small></span>`; },
  // the rule bar says whose shape is whose and stays up for the whole match — the shapes never change now
  vsBar(){ rxBar([pWho(0),shapeI(this.o1),`<b>${SHAPES[this.o1].word}</b>`,'·',pWho(1),shapeI(this.o2),`<b>${SHAPES[this.o2].word}</b>`]); },
  vsFindRound(){ this.clearT(); this.round++;
    if(this.vsN[0]>=this.vsTarget()||this.vsN[1]>=this.vsTarget()) return this.vsEnd();
    const v=this.vp(), r=genRect(); this.size=Math.max(18,Math.min(r.width,r.height)*(.085-v*.02));
    const n=SPOT_FIND.nBase+Math.round(v*SPOT_FIND.nSpan);
    // v16 (§4): static in round 1, then drift, then spin, then a pulse. Each arrives on its own round and grows with v
    const drift=this.round>=2?SPOT_FIND.drift*(.35+v*.65):0, spin=this.round>=3?18+v*46:0, puls=this.round>=4;
    const sv=v*SPOT_FIND.sizeVar;
    this.pts=scatter(n,[this.vsBase],Math.round(this.size*(1+sv)),undefined,this.topF);
    // v17 (B.16): `puls` is carried on the point as well as on the class, because the clamp has to know the shape breathes
    this.pts.forEach(q=>{ q.shape=this.vsBase; q.sz=this.vary(this.size,sv,SPOT_FIND.sizeMin); q.vx=(Math.random()-.5)*drift; q.vy=(Math.random()-.5)*drift; q.a=0; q.va=(Math.random()-.5)*spin; q.puls=puls; this.clamp(q,r); });
    const a=rnd(this.pts.length); let b=rnd(this.pts.length); for(let k=0;k<12&&b===a;k++) b=rnd(this.pts.length); if(b===a) b=(a+1)%this.pts.length;
    this.pts[a].shape=this.o1; this.pts[b].shape=this.o2;
    // v31 (60.3, build 60): BOTH players' shapes are targets, and each keeps its own clear space (L4 — neither player is favoured)
    this.keep=[a,b]; this.settle(r);
    hud.timeHtml(this.vsLine()); this.vsBar();
    // v16 (1.4): each player's stem swells with their share of the match. Presentation only (L10)
    this.ctx.emit('live',{vsP:[this.vsN[0]/this.vsTarget(),this.vsN[1]/this.vsTarget()]});
    this.st='wait'; $('#gen').innerHTML='';
    // v16 (§4): the intro is 3.0s, was 1.4s. Two players have to find their own shape in the rule bar before they look
    this.later(()=>{ this.st='vsfind'; this.t0=performance.now();
      $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,puls?'puls':'')).join('');
      if(drift||spin) this.move('vsfind'); },3000); },
  // v17 (B.15): the hit test measures against the shape's OWN size now that a crowd is not all one size
  vsTap(ev){ const best=this.hitAt(ev,q=>q.shape===this.o1||q.shape===this.o2);
    if(best===null) return; const els=$$('#gen .fs'); const sh=this.pts[best].shape;
    // neither player's shape: a wrong tap, and the round carries on
    if(sh!==this.o1&&sh!==this.o2){ els[best].classList.add('bad'); this.ctx.audio.miss(); haptic(30); return; }
    const w=sh===this.o1?0:1; this.st='show'; cancelAnimationFrame(this.raf); this.vsN[w]++;
    // A.2: the round goes to the owner, and it lights in the owner's colour (L4)
    els[best].classList.remove('puls'); els[best].classList.add('odd',w?'p2':'p1'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); });
    // v21 (G.7, build 35): the line is redrawn with the new count in it, so the scorer's number pulses in their colour (L4)
    hud.timeHtml(this.vsLine()); hud.pulse($('#hud-time .spvs b.'+(w?'p2':'p1')),w);
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
      // v24 (F.5, build 44): a Set's number stays on the OLD total until the walk below carries the miscount into it
      hud.score(this.streak()?String(Math.max(0,this.round-1)):String(this.off-off));
      const done=this.streak()?this.off>=COUNT_BUDGET:this.round>=this.ctx.len;
      // v15 (3.9 answer, build 25): Count does not hold its result — one number is not a complicated result. The correct
      // count is FLASHED so it registers and the round moves on by itself 600ms after the walk, instead of the 900ms
      // every other dropped cue got. `cflash` is the flash; the number is the only thing on the card that has to land
      // v18 (B.10): the round's own answer wears its tier colour — how far out this count was, not how the run is going
      $('#gen').innerHTML=this.pts.map(q=>shapeHtml(q,this.size,q.shape!==this.target?'dim':'')).join('')+`<div class="glbl bot"><b class="cflash ${ok?'g':'r'}"${this.rcol('spot:count',off)}>${this.answer}</b>${ok?CP.right:T(CP.said,{k,off})}${this.streak()?T(CP.of5,{off:this.off,bud:COUNT_BUDGET}):''}${done&&this.streak()?CP.over:''}</div>`;
      ok?this.ctx.audio.hit():this.ctx.audio.miss(); if(!ok) haptic(30);
      // v14 (6.1 / 6.3): the round's miscount walks into the running total — the Set's score, the Streak's budget — and the
      // reveal then stays up until it is tapped
      /* v24 (F.5, build 44): "the score is added far too quickly". It was a 480ms walk straight after the answer, then the round moved on —
         about a second in all, measured. The miscount now HOLDS on the card for CFG.hold, the beat Timing and Reaction already use before a
         figure drains, and then walks into the total over COUNT_ADD.ms. A right answer adds nothing and does not wait. */
      this.later(()=>{ if(this.st!=='show') return;
        hud.countUp({ audio:off?this.ctx.audio:null, from:this.off-off, to:this.off, ms:off?COUNT_ADD.ms:0, fmt:v=>String(Math.round(v)), alive:()=>this.st==='show',
          set:t=>{ if(this.streak()) hud.time(T(CP.hudCountStreak,{n:this.round,off:t,bud:COUNT_BUDGET})); else hud.score(t); },
          done:()=>{ hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next(),600); } }); },off?CFG.hold:0); return; }
    if(this.st==='vsfind') return this.vsTap(ev);
    if(this.st!=='find') return; const best=this.hitAt(ev,q=>q.shape===this.odd); if(best===null) return;
    const els=$$('#gen .fs'); if(this.pts[best].shape===this.odd){ this.st='show'; cancelAnimationFrame(this.raf); const t=Math.round(((performance.now()-this.t0)/1000+this.pen)*100)/100; this.times.push(t);
      // v13 (10.3): Set totals the seconds over ten rounds; a Streak spends a 10-second budget and scores the rounds it bought
      // v14 (6.30): the first half-second is free, and anything under it comes OFF the total — a fast find pays you back
      /* v17 (B.1): THE TOTAL IS FLOORED AT ZERO. v14 6.30 made the first half-second of a find free and let anything faster
         SUBTRACT — a rebate, so a fast find pays you back against your slower rounds. It had no floor, so it was not a
         rebate, it was a negative price: measured 2026-09-11, ten finds at 0.03s each ran the Set to −4.71s and the result
         screen printed "−4.71s" as a total time. Worse, the Streak ends on `tot >= 10` and `tot` was marching DOWNWARD, so
         a fast player's Find Streak could not end at all — the probe reached round 21 and was still going.
         The rebate survives where 6.30 wanted it (a fast round still cancels a slow one); the total simply cannot go under
         zero, which is what makes "total time" a true total again and what gives the Streak somewhere to spend from. */
      const add=Math.round((t-SPOT_FIND.leeway)*100)/100, was=this.tot; this.tot=Math.max(0,Math.round((this.tot+add)*100)/100);
      if(this.streak()) hud.score(String(this.times.length));
      els[best].classList.add('odd'); els.forEach((el,i)=>{ if(i!==best) el.classList.add('dim'); });
      const cl=$('#spclock'); if(cl) cl.remove();
      $('#gen').insertAdjacentHTML('beforeend',`<div class="glbl bot"><b class="${t<2?'g':''}" id="spt"${this.rcol('spot:find',t)}>0.00s</b><span id="sptot">${this.streak()?T(CP.of10,{t:f2(was)}):T(CP.total,{t:f2(was)})}</span>${this.pen?T(CP.pen,{pen:this.pen}):''}${add<0?T(CP.fast,{n:f2(-add)}):''}</div>`); this.ctx.audio.hit();
      // v14 (6.32 / 6.1): the time taken runs up incrementally and walks into the total; (6.3) the result then waits for a tap
      hud.countUp({ audio:this.ctx.audio, from:0, to:1, ms:900, fmt:v=>v, alive:()=>this.st==='show',
        // the walk is floored the same way the total is, or the number would dip under zero on the way to a zero it lands on
        set:k=>{ const b=$('#spt'); if(b) b.textContent=f2(t*k)+'s'; const u=$('#sptot'); if(u){ const v=Math.max(0,was+add*k); u.textContent=this.streak()?T(CP.of10,{t:f2(v)}):T(CP.total,{t:f2(v)}); } },
        done:()=>{ hud.score(this.streak()?String(this.times.length):f2(this.tot)); hud.scorePop(); this.ctx.emit('live',this.result()); this.after(()=>this.next()); } }); }
    else { this.wrong++; this.pen+=1; els[best].classList.add('bad'); this.ctx.audio.miss(); haptic(30); } } });

export default SP;
export { SP };
