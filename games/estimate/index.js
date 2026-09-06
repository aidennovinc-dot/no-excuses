/* No Excuses — Estimate — Grow and Cut
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { finish, liveCheck } from "../../app.js";
import { Snd } from "../../audio.js";
import { ESTIMATE as CP } from "../../config/copy.js";
import { CFG, ESTIMATE as EST, STREAK } from "../../config/games.js";
import { $, $$, T, f2, mean, vmin } from "../../core.js";
import { G } from "../../engine-core.js";
import { Shapes } from "../_shared/shapes.js";
import { sel } from "../../core/state.js";
/* ---------- Estimate (v9, was Hold). Grow: a shape grows with a wobble and vanishes; tap and hold to grow yours to the same area — the same shape on odd rounds, a different one on even. Cut: a shape appears; drag a line through it that splits off the share asked for. Score is % off, lower is better. Five rounds ---------- */
const HD={ st:'idle', round:0, total:0, errs:[], target:0, rot:0, shape:null, mine:null, t0:0, raf:0, timers:[], p0:null, p1:null, share:50,
  est(){ return sel.diff==='grow'&&this.round%2===0; },
  streak(){ return sel.secs===STREAK; },
  cy(){ const f=$('#hfield').getBoundingClientRect(); return f.height*(sel.diff==='cut'?.6:.5); },
  path(sh,s){ const f=$('#hfield').getBoundingClientRect(); return Shapes.path(sh,s,f.width/2,this.cy()); },
  icon(sh){ const ic=$('#hicon'); ic.classList.remove('big'); ic.innerHTML='<path/><text x="50" y="98" text-anchor="middle"></text>'; if(!sh){ ic.classList.remove('on'); return; } ic.querySelector('path').setAttribute('d',Shapes.path(sh,sh.name==='bar'||sh.name==='line'?84:62,50,46)); ic.querySelector('text').textContent=sh.name; ic.classList.add('on'); },
  // the cut hint: a finger drags a dotted line through a small shape. Big and centred first, then it parks top right for the round
  hint(sh){ const ic=$('#hicon'); ic.innerHTML=`<path d="${Shapes.path(sh,58,50,50)}" fill-rule="evenodd"/><line x1="6" y1="70" x2="94" y2="30"/><circle class="fg" r="7"/>`; ic.classList.add('on','big'); this.later(()=>ic.classList.remove('big'),1500); },
  bg(t){ const b=$('#hbg'); b.textContent=t||''; b.classList.toggle('on',!!t); },
  // the share (v10) counts up from 0 to the number asked for, so the eye lands on it before the shape
  shareUp(n){ const el=$('#hshare'); if(!n){ el.classList.remove('on'); el.innerHTML=''; return; } el.classList.add('on'); const t0=performance.now(); const anim=now=>{ if(!G.on||this.st==='reveal') return; const k=Math.min(1,(now-t0)/900); el.innerHTML=`${Math.round(n*k)}%${CP.shareTarget}`; if(k<1) requestAnimationFrame(anim); }; requestAnimationFrame(anim); },
  set(layer,sh,s,wob){ const p=$(`#${layer} path`); if(!sh||s<=0){ p.setAttribute('d',''); return; } p.setAttribute('d',this.path(sh,s)); const f=$('#hfield').getBoundingClientRect(); p.setAttribute('transform',wob?`translate(${wob.x},${wob.y}) rotate(${wob.a} ${f.width/2} ${this.cy()})`:''); },
  wobble(ms){ return {a:this.rot+Math.sin(ms/90)*4, x:Math.sin(ms/70)*3, y:Math.cos(ms/110)*3}; },
  // a bottom-up fill (v11): the clip rect's top edge climbs from under the shape to above it as k goes 0 → 1
  clipTo(id,k,size){ const r=$('#'+id); if(!r) return; const cy=this.cy(), y1=cy+size*.78, y0=cy-size*.78; r.setAttribute('y',y1-(y1-y0)*k); r.setAttribute('height',99999); },
  clipFull(id){ const r=$('#'+id); if(r){ r.setAttribute('y',-9999); r.setAttribute('height',99999); } },
  clearT(){ this.timers.forEach(clearTimeout); this.timers=[]; cancelAnimationFrame(this.raf); },
  later(f,ms){ const id=G.runId; this.timers.push(setTimeout(()=>{ if(G.on&&G.runId===id) f(); },ms)); },
  reset(){ this.st='idle'; ['ht','hg','hm'].forEach(l=>this.set(l,null,0)); $$('#hcut path').forEach(p=>p.setAttribute('d','')); ['tclipr','hclipr','aclipr','bclipr'].forEach(id=>this.clipFull(id)); $('#hline').style.opacity=0; $('#hcalc').classList.remove('on'); $('#hcalc').innerHTML=''; $('#hfield').classList.remove('show'); this.bg(''); this.shareUp(0); this.icon(null); $('#hlbl').innerHTML=''; },
  begin(){ this.round=0; this.total=0; this.errs=[]; $('#score').textContent=this.streak()?'0':'0.00'; this.next(); },
  pickMine(){ if(!this.est()) return this.shape; const c=this.shape.coef; const ok=Shapes.GROW.filter(n=>n!==this.shape.name).map(n=>Shapes.make(n)).filter(s=>s.coef/c>=.4&&s.coef/c<=2.5); return ok.length?ok[Math.random()*ok.length|0]:Shapes.random(Shapes.GROW); },
  // v11: Set = 7 rounds, score the average % off (lower wins). Streak = the % differences add up; the run ends when the total reaches 100, score rounds
  result(){ const best=this.errs.length?Math.min(...this.errs):0, worst=this.errs.length?Math.max(...this.errs):0; return this.streak()?{hits:this.errs.length,misses:0,x:best,y:worst,lim:'100%'}:{hits:Math.round(mean(this.errs)*100)/100,misses:0,x:best,y:worst}; },
  // v13 (6.2): "Round 2 of 7" in a Set; a Streak says "Round n" with the running total beside it
  hud(){ $('#hud-time').textContent=this.streak()?T(CP.hudStreak,{n:this.round,tot:f2(this.total)}):T(CP.hudSet,{n:this.round,s:sel.secs})+(sel.diff==='grow'?(this.est()?CP.diff:CP.same):''); },
  next(){ this.clearT(); this.round++; if(!this.streak()&&this.round>sel.secs) return finish(this.result()); if(this.streak()&&this.total>=100) return finish(this.result()); this.reset();
    if(sel.diff==='cut') return this.cutRound();
    this.hud(); const v=vmin(); this.shape=Shapes.random(Shapes.GROW); this.target=(16+Math.random()*42)*v; this.mine=this.pickMine(); this.rot=this.est()?0:[35,60,90,120,145,180,225,270][Math.random()*8|0];
    this.icon(this.est()?this.mine:null); $('#hlbl').innerHTML=this.est()?CP.watchDiff:CP.watch; $('#hfield').classList.add('show');
    this.st='show'; const t0=performance.now(), rate=CFG.holdRate*v, dur=this.target/rate*1000;
    const grow=now=>{ if(!G.on) return; const p=Math.min(1,(now-t0)/dur); this.set('ht',this.shape,this.target*p,this.wobble(now-t0)); if(p<1) this.raf=requestAnimationFrame(grow); else this.later(()=>this.ready(),420); };
    this.raf=requestAnimationFrame(grow); },
  // v11: the target stays up as a dashed outline while you grow — turned for same-shape rounds — so you can see what you are comparing to
  ready(){ this.set('ht',null,0); $('#hfield').classList.remove('show'); this.set('hg',this.shape,this.target,{a:this.rot,x:0,y:0}); this.st='wait'; $('#hlbl').innerHTML=this.est()?CP.sameArea:CP.sameShape; this.bg(CP.hold); Snd.click(); },
  down(e){ if(sel.diff==='cut') return this.cutDown(e); if(this.st!=='wait') return; this.st='hold'; this.t0=performance.now(); $('#hlbl').innerHTML=''; this.bg(''); const rate=CFG.holdRate*vmin(), cap=Math.min(this.target*2.8,96*vmin());
    const grow=now=>{ if(this.st!=='hold') return; const el=now-this.t0; this.set('hm',this.mine,Math.min(cap,el/1000*rate)); this.raf=requestAnimationFrame(grow); }; this.raf=requestAnimationFrame(grow); },
  // the reveal (v11): the target fills bottom-up while its px² counts, then yours does the same, then the difference and the %. The two fills and the two numbers are the sum, drawn
  up(){ if(sel.diff==='cut') return this.cutUp(); if(this.st!=='hold') return; this.st='reveal'; cancelAnimationFrame(this.raf); const size=Math.min(Math.min(this.target*2.8,96*vmin()),(performance.now()-this.t0)/1000*CFG.holdRate*vmin());
    this.set('hm',this.mine,size); const mine=Shapes.area(this.mine.loops)*size*size, tgt=this.shape.coef*this.target*this.target; const pct=mine/tgt*100, err=Math.abs(pct-100);
    const word=err<=2?CP.money:err<=8?CP.close:pct>100?CP.much:CP.little;
    // the target comes back filled, from the bottom up, inside its outline; yours fills the same way
    this.set('hg',null,0); this.set('ht',this.shape,this.target,{a:this.rot,x:0,y:0}); $('#hfield').classList.add('show'); this.clipTo('tclipr',0,this.target); this.clipTo('hclipr',0,size);
    this.calc([[CP.target,tgt,'',0,'',k=>this.clipTo('tclipr',k,this.target)],[CP.yours,mine,'m',0,'',k=>this.clipTo('hclipr',k,size)]],Math.max(tgt,mine)*1.15,()=>{ const diff=Math.round(mine-tgt); return `<b class="${err<=2?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b>`; },
      `<b class="${err<=2?'g':err>8?'r':''}">${f2(pct)}%</b>${word} · <i>${f2(err)}</i>${CP.off}`, err); },
  // the panel (v9): rows of bars. v11: both bars share one scale — max × 1.15 — so the bigger sits at ~87% and the smaller shows the real ratio; never both at 100%. Row[5] is a hook that fills the shape as the bar fills
  calc(rowsIn,max,diffHtml,resultHtml,err){ const rows=rowsIn.map((r,i)=>`<div class="hrow ${r[2]}"><span>${r[0]}</span><span class="bar"><i id="hb${i}"></i>${r[3]?`<u style="left:${r[3]}%"></u>`:''}</span><b id="hn${i}">0</b></div>`).join('');
    $('#hcalc').innerHTML=rows+`<div id="hdiff" style="text-align:center;opacity:0;transition:opacity .25s"></div><div id="hres"></div>`; $('#hcalc').classList.add('on');
    const pause=ms=>new Promise(r=>this.later(r,ms));
    // v13 (6.6): a rising whoosh runs for the length of every count, low to high, so the pitch follows the fill
    const fill=(i,val,unit,hook)=>new Promise(res=>{ const t0=performance.now(), bar=$('#hb'+i), n=$('#hn'+i); Snd.whoosh(900,110,700); const anim=now=>{ if(this.st!=='reveal') return res(); const k=Math.min(1,(now-t0)/900); if(bar) bar.style.width=(val/max*100*k)+'%'; if(n) n.textContent=unit?(val*k).toFixed(1)+unit:Math.round(val*k).toLocaleString(); if(hook) hook(k); if(k<1) requestAnimationFrame(anim); else res(); }; requestAnimationFrame(anim); });
    const unit=rowsIn[0][4]||'';
    let chain=fill(0,rowsIn[0][1],unit,rowsIn[0][5]);
    if(rowsIn[1]) chain=chain.then(()=>pause(300)).then(()=>fill(1,rowsIn[1][1],unit,rowsIn[1][5]));
    chain.then(()=>pause(300))
      .then(()=>{ if(this.st!=='reveal') return; const d=$('#hdiff'); if(d&&diffHtml){ d.innerHTML=diffHtml(); d.style.opacity=1; d.classList.add('pop'); } return pause(diffHtml?800:100); })
      .then(()=>{ if(this.st!=='reveal') return; const v=$('#hres'); if(v){ v.innerHTML=resultHtml; v.classList.add('on'); } err<=8?Snd.hit():Snd.miss(); if(err>8&&navigator.vibrate) navigator.vibrate(30);
        this.errs.push(err); const s=$('#score'); s.textContent=this.streak()?String(this.errs.length):f2(mean(this.errs)); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
        if(this.streak()) return this.addUp(err); this.total+=err; this.hud(); liveCheck(this.result()); this.later(()=>this.next(),1900); }); },
  // v13 (6.7): in a Streak the round's % difference visibly walks into the running total — the round figure counts down to 0 while the total counts up by the same amount, together, with the whoosh
  addUp(err){ const from=this.total, to=this.total+err, t0=performance.now(), ms=900, el=$('#hres i'); Snd.whoosh(ms,140,760);
    const step=now=>{ if(this.st!=='reveal') return; const k=Math.min(1,(now-t0)/ms); this.total=from+err*k;
      if(el) el.textContent=f2(err*(1-k)); $('#hud-time').textContent=T(CP.hudStreak,{n:this.round,tot:f2(this.total)});
      if(k<1) requestAnimationFrame(step); else { this.total=to; this.hud(); liveCheck(this.result()); this.later(()=>this.next(),900); } };
    requestAnimationFrame(step); },
  // Cut (v11): rounds 1–2 are simple shapes at 50%; then harder shapes, and shares that move toward 25% and the awkward numbers as the rounds go on. A Streak keeps ramping to round 8 and holds there
  cutRound(){ const lvl=Math.min(8,this.round); const poolRow=EST.CUT_POOLS.find(([max])=>lvl<=max); const pool=poolRow?poolRow[1]:Shapes.CUT; this.shape=Shapes.random(pool);
    // v13 (6.4): a shape with an axis of symmetry never asks for 50% — halving one of those is a ruler job, not an estimate. Rounds 1–2 keep the simple shapes but ask 30–45% (the pools and shares are ESTIMATE in config/games.js)
    let shares=(EST.CUT_SHARES.find(([max])=>lvl<=max)||EST.CUT_SHARES[EST.CUT_SHARES.length-1])[1];
    if(EST.SYM.includes(this.shape.name)) shares=shares.filter(v=>v!==50); if(!shares.length) shares=[35];
    this.share=shares[Math.random()*shares.length|0]; const v=vmin(); this.target=Math.min(54*v,$('#hfield').getBoundingClientRect().width*.7);
    // v13 (6.3): the drag hint plays once, on the first round of the run. After that the screen carries one instruction and one figure
    this.hud(); const first=this.round===1; if(first) this.hint(this.shape); else this.icon(null); this.st='wait';
    this.later(()=>{ $('#hcut path.a').setAttribute('d',this.path(this.shape,this.target)); $('#hcut path.a').classList.remove('b'); if(!first) this.icon(null); this.bg(CP.drag); this.shareUp(this.share); },first?1500:500); },
  fpt(e){ const f=$('#hfield').getBoundingClientRect(); return [e.clientX-f.left,e.clientY-f.top]; },
  cutDown(e){ if(this.st!=='wait'||!$('#hcut path.a').getAttribute('d')) return; this.st='draw'; this.p0=this.fpt(e); this.p1=this.p0; const l=$('#hline'); l.setAttribute('x1',this.p0[0]); l.setAttribute('y1',this.p0[1]); l.setAttribute('x2',this.p0[0]); l.setAttribute('y2',this.p0[1]); l.style.opacity=1; this.bg(''); },
  cutMove(e){ if(this.st!=='draw') return; this.p1=this.fpt(e); const l=$('#hline'); l.setAttribute('x2',this.p1[0]); l.setAttribute('y2',this.p1[1]); },
  cutUp(){ if(this.st!=='draw') return; const d=[this.p1[0]-this.p0[0],this.p1[1]-this.p0[1]], len=Math.hypot(d[0],d[1]); if(len<24){ this.st='wait'; $('#hline').style.opacity=0; this.bg(CP.draw); return; }
    const f=$('#hfield').getBoundingClientRect(), cx=f.width/2, cy=this.cy(); const loops=this.shape.loops.map(L=>L.map(([x,y])=>[cx+x*this.target,cy+y*this.target])); const total=Shapes.area(loops);
    const A=Shapes.clip(loops,this.p0,d,1), B=Shapes.clip(loops,this.p0,d,-1); const aA=Shapes.area(A), aB=Shapes.area(B);
    if(Math.min(aA,aB)/total<.005){ this.st='wait'; $('#hline').style.opacity=0; $('#hlbl').innerHTML=T(CP.missed,{share:this.share}); this.bg(CP.drag); Snd.miss(); return; }
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
    this.calc([[CP.piece,aS,'cutbar',Math.round(want/total*100),'',k=>this.clipTo('aclipr',k,this.target)]],total,()=>{ const diff=Math.round(aS-want); return `<b class="${err<=1.5?'g':err>8?'r':''}" style="font-size:22px">${diff>0?'+':'−'}${Math.abs(diff).toLocaleString()} ${CP.px}</b><br><span style="font-size:10px">${T(CP.targetPx,{n:Math.round(want).toLocaleString()})}</span>`; },`<b class="${err<=1.5?'g':err>8?'r':''}">${f2(share)}%</b>${word} · ${T(CP.targetShare,{n:this.share})} · <i>${f2(err)}</i>${CP.off}`,err); } };


export { HD };
