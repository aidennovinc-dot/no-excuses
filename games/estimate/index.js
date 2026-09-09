/* No Excuses — Estimate — Grow and Cut
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract. Behaviour is identical to build 11. */

import { ESTIMATE as CP } from "../../config/copy.js";
import { CFG, ESTIMATE as EST, STREAK } from "../../config/games.js";
import { $, $$, T, f2, mean, minMax, vmin } from "../../core.js";
import * as hud from "../_shared/hud.js";
import { Shapes } from "../_shared/shapes.js";
import { makeTwo } from "../_shared/two.js";
/* ---------- Estimate (v9, was Hold). Grow: a shape grows with a wobble and vanishes; tap and hold to grow yours to the same area — the same shape on odd rounds, a different one on even. Cut: a shape appears; drag a line through it that splits off the share asked for. Score is % off, lower is better. Five rounds ---------- */
const HD={ id:'hold', ctx:null, st:'idle', round:0, total:0, errs:[], target:0, rot:0, shape:null, mine:null, t0:0, raf:0, p0:null, p1:null, share:50, pending:null, maxed:false, two:{on:false},
  est(){ return this.ctx.mode==='grow'&&this.round%2===0; },
  // the hold's ceiling, in one place — down() and up() used to carry the same expression twice and could drift apart
  capOf(){ return Math.min(this.target*2.8,96*vmin()); },
  // v15 (3.1): the target's AREA is what has a floor, so the linear size it needs depends on the shape. A shape whose
  // widest instance still cannot reach the floor inside the range is re-dealt — clamping it instead would push the
  // shape off the screen. Bounded: after 12 goes take what came, so a small viewport can never hang the round
  pickTarget(){ const min=EST.MIN_AREA/(EST.TMAX*EST.TMAX); let sh=null;
    for(let i=0;i<12;i++){ sh=Shapes.random(Shapes.GROW); if(sh.coef>=min) return sh; } return sh; },
  growTarget(){ const lo=Math.max(EST.TMIN,Math.min(EST.TMAX,Math.sqrt(EST.MIN_AREA/this.shape.coef))); return lo+Math.random()*(EST.TMAX-lo); },
  streak(){ return this.ctx.len===STREAK; },
  cut(){ return this.ctx.mode==='cut'; },
  live(){ return this.ctx.timers.alive(); },
  cy(){ const f=$('#hfield').getBoundingClientRect(); return f.height*(this.cut()?.6:.5); },
  path(sh,s){ const f=$('#hfield').getBoundingClientRect(); return Shapes.path(sh,s,f.width/2,this.cy()); },
  icon(sh){ const ic=$('#hicon'); ic.classList.remove('big'); ic.innerHTML='<path/><text x="50" y="98" text-anchor="middle"></text>'; if(!sh){ ic.classList.remove('on'); return; } ic.querySelector('path').setAttribute('d',Shapes.path(sh,sh.name==='bar'||sh.name==='line'?84:62,50,46)); ic.querySelector('text').textContent=sh.name; ic.classList.add('on'); },
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
  begin(){ this.round=0; this.total=0; this.errs=[]; this.maxed=false; this.two=makeTwo(this.ctx,{lower:true,fmt:v=>f2(v)+'%'}); hud.score(this.streak()?'0':'0.00%'); this.next(); },
  pickMine(){ if(!this.est()) return this.shape; const c=this.shape.coef; const ok=Shapes.GROW.filter(n=>n!==this.shape.name).map(n=>Shapes.make(n)).filter(s=>s.coef/c>=.4&&s.coef/c<=2.5); return ok.length?ok[Math.random()*ok.length|0]:Shapes.random(Shapes.GROW); },
  // v11: Set = 7 rounds, score the average % off (lower wins). Streak = the % differences add up; the run ends when the total reaches 100, score rounds
  // v15 (answer 2, build 24): `mx` says a hold ran all the way to its ceiling. It is what the Greedy achievement asks for
  // in words, and unlike a % threshold it is true at EVERY target size — see the note on capOf and FEATURES.md
  result(){ const [best,worst]=minMax(this.errs); const r=this.streak()?{hits:this.errs.length,misses:0,x:best,y:worst,lim:'100%'}:{hits:Math.round(mean(this.errs)*100)/100,misses:0,x:best,y:worst}; if(this.maxed) r.mx=1; return r; },
  // v13 (6.2): "Round 2 of 7" in a Set; a Streak says "Round n" with the running total beside it
  hud(){ if(this.two.on) return hud.timeHtml(this.two.hudLine());
    hud.time(this.streak()?T(CP.hudStreak,{n:this.round,tot:f2(this.total)}):T(CP.hudSet,{n:this.round,s:this.ctx.len})+(this.ctx.mode==='grow'?(this.est()?CP.diff:CP.same):'')); },
  next(){ this.clearT(); this.round++;
    // v15 (4.1 / 4.2): a pass & play run ends when both players have had their turns, not on a length — and every hand-over
    // waits for a tap, which is the one place §3.9 kept the cue for
    if(this.two.on){ if(this.two.over()) return this.ctx.emit('finish',this.two.record()); this.reset(); return this.two.gate(this,()=>this.play()); }
    if(!this.streak()&&this.round>this.ctx.len) return this.ctx.emit('finish',this.result()); if(this.streak()&&this.total>=100) return this.ctx.emit('finish',this.result()); this.reset(); this.play(); },
  play(){ if(this.cut()) return this.cutRound();
    this.hud(); const v=vmin(); this.shape=this.pickTarget(); this.target=this.growTarget()*v; this.mine=this.pickMine();
    // v14 (6.13): rotating a circle does nothing and rotating a square barely more — a shape with an obvious axis of symmetry is never turned
    this.rot=(this.est()||EST.SYM.includes(this.shape.name))?0:[35,60,90,120,145,180,225,270][Math.random()*8|0];
    // v14 (6.11): the shape you are about to grow is always drawn, centre-top, whether or not it is the target's shape
    this.icon(this.mine); $('#hlbl').innerHTML=this.est()?CP.watchDiff:CP.watch; $('#hfield').classList.add('show');
    this.st='show'; const t0=performance.now(), rate=CFG.holdRate*v, dur=this.target/rate*1000;
    const grow=now=>{ if(!this.live()) return; const p=Math.min(1,(now-t0)/dur); this.set('ht',this.shape,this.target*p,this.wobble(now-t0)); if(p<1) this.raf=requestAnimationFrame(grow); else this.later(()=>this.ready(),420); };
    this.raf=requestAnimationFrame(grow); },
  // v11: the target stays up as a dashed outline while you grow — turned for same-shape rounds — so you can see what you are comparing to
  ready(){ this.set('ht',null,0); $('#hfield').classList.remove('show'); this.set('hg',this.shape,this.target,{a:this.rot,x:0,y:0}); this.st='wait'; $('#hlbl').innerHTML=this.est()||!this.rot?CP.sameArea:CP.sameShape; this.bg(CP.hold); this.ctx.audio.click(); },
  down(ev){ if(this.cut()) return this.cutDown(ev); if(this.st!=='wait') return; this.st='hold'; this.t0=performance.now(); $('#hlbl').innerHTML=''; this.bg(''); const rate=CFG.holdRate*vmin(), cap=this.capOf();
    const grow=now=>{ if(this.st!=='hold') return; const el=now-this.t0; this.set('hm',this.mine,Math.min(cap,el/1000*rate)); this.raf=requestAnimationFrame(grow); }; this.raf=requestAnimationFrame(grow); },
  // the reveal (v11): the target fills bottom-up while its px² counts, then yours does the same, then the difference and the %. The two fills and the two numbers are the sum, drawn
  up(){ if(this.cut()) return this.cutUp(); if(this.st!=='hold') return; this.st='reveal'; cancelAnimationFrame(this.raf); const cap=this.capOf(); const size=Math.min(cap,(performance.now()-this.t0)/1000*CFG.holdRate*vmin());
    // the hold ran to its ceiling — what Greedy actually asks for, and true at every target size
    if(size>=cap-.5) this.maxed=true;
    this.set('hm',this.mine,size); const mine=Shapes.area(this.mine.loops)*size*size, tgt=this.shape.coef*this.target*this.target; const pct=mine/tgt*100, err=Math.abs(pct-100);
    const word=err<=2?CP.money:err<=8?CP.close:pct>100?CP.much:CP.little;
    // the target comes back filled, from the bottom up, inside its outline; yours fills the same way
    // v15 (3.3): the dashed target outline STAYS, over your shape, for the whole reveal — .rev lifts it above the fill.
    // Readable without motion and it needs no dismiss, which is why it beat flashing between the two
    this.set('hg',this.shape,this.target,{a:this.rot,x:0,y:0}); this.set('ht',this.shape,this.target,{a:this.rot,x:0,y:0}); $('#hfield').classList.add('show','rev'); this.clipTo('tclipr',0,this.target); this.clipTo('hclipr',0,size);
    this.calc([[CP.target,tgt,'',0,'',k=>this.clipTo('tclipr',k,this.target)],[CP.yours,mine,'m',0,'',k=>this.clipTo('hclipr',k,size)]],Math.max(tgt,mine)*1.15,()=>{ const diff=Math.round(mine-tgt); return `<b class="${err<=2?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b>`; },
      `<b class="${err<=2?'g':err>8?'r':''}" id="hpct">${f2(pct)}%</b>${word}`, err, {from:pct,to:100}); },
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
    chain.then(()=>pause(300))
      .then(()=>{ if(this.st!=='reveal') return; const d=$('#hdiff'); if(d&&diffHtml){ d.innerHTML=diffHtml(); d.style.opacity=1; d.classList.add('pop'); } return pause(diffHtml?800:100); })
      .then(()=>{ if(this.st!=='reveal') return; const v=$('#hres'); if(v){ v.innerHTML=resultHtml; v.classList.add('on'); } err<=8?this.ctx.audio.hit():this.ctx.audio.miss(); if(err>8&&navigator.vibrate) navigator.vibrate(30);
        const was=this.errs.length?mean(this.errs):0; this.errs.push(err);
        const w=walk?{el:$('#hpct'),from:walk.from,to:walk.to,fmt:v=>f2(v)+'%'}:null;
        if(this.two.on) return this.twoAdd(err,w);
        if(this.streak()){ hud.score(String(this.errs.length)); hud.scorePop(); return this.addUp(err,w); }
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
  addUp(err,walk){ hud.addUp({ audio:this.ctx.audio, from:this.total, err, ms:900, el:null, walk, fmt:v=>'+'+f2(v)+'%', alive:()=>this.st==='reveal',
      onFrame:tot=>{ this.total=tot; hud.time(T(CP.hudStreak,{n:this.round,tot:f2(this.total)})); },
      done:tot=>{ this.total=tot; this.hud(); this.ctx.emit('live',this.result()); this.wait(()=>this.next()); } }); },
  // Cut (v11): rounds 1–2 are simple shapes at 50%; then harder shapes, and shares that move toward 25% and the awkward numbers as the rounds go on. A Streak keeps ramping to round 8 and holds there
  cutRound(){ const lvl=Math.min(10,this.round); const poolRow=EST.CUT_POOLS.find(([max])=>lvl<=max); const pool=poolRow?poolRow[1]:Shapes.CUT; this.shape=Shapes.random(pool);
    // v13 (6.4): a shape with an axis of symmetry never asks for 50% — halving one of those is a ruler job, not an estimate. Rounds 1–2 keep the simple shapes but ask 30–45% (the pools and shares are ESTIMATE in config/games.js)
    let shares=(EST.CUT_SHARES.find(([max])=>lvl<=max)||EST.CUT_SHARES[EST.CUT_SHARES.length-1])[1];
    if(EST.SYM.includes(this.shape.name)) shares=shares.filter(v=>v!==50); if(!shares.length) shares=[35];
    this.share=shares[Math.random()*shares.length|0]; const v=vmin(); this.target=Math.min(54*v,$('#hfield').getBoundingClientRect().width*.7);
    // v13 (6.3): the drag hint plays once, on the first round of the run. After that the screen carries one instruction and one figure
    this.hud(); const first=this.round===1; if(first) this.hint(this.shape); else this.icon(null); this.st='wait';
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
    const word=err<=1.5?CP.money:err<=5?CP.closeCut:share>this.share?CP.much:CP.little; const want=total*this.share/100;
    // v13 (6.5): ONE bar. It is the whole shape; the cut piece's share fills it from the left while the px² count, and the red target line stays put.
    // The two pieces wear the customisable pair — the piece in --cutp, the rest at 40% of it — and the bar wears the same two colours
    this.clipFull('bclipr');
    this.calc([[CP.piece,aS,'cutbar',Math.round(want/total*100),'',k=>this.clipTo('aclipr',k,this.target)]],total,()=>{ const diff=Math.round(aS-want); return `<b class="${err<=1.5?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b><br><span style="font-size:10px">${T(CP.targetPx,{n:Math.round(want).toLocaleString()})}</span>`; },`<b class="${err<=1.5?'g':err>8?'r':''}" id="hpct">${f2(share)}%</b>${word} · ${T(CP.targetShare,{n:this.share})}`,err,{from:share,to:this.share}); } };

export default HD;
export { HD };
