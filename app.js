/* No Excuses — the run itself: countdown, tick, hit/miss, finish, versus, atmosphere
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { Music, Snd } from "./audio.js";
import { $, $$, CFG, MODE_NAME, PASS_LEN, VS_CAP, VS_LEAD, pWho, vmin } from "./core.js";
import { F, VS, sel } from "./core/state.js";
import { load, prefs, save } from "./core/store.js";
import { G, cur, setCur } from "./engine-core.js";
import { DT } from "./games/dots.js";
import { HD } from "./games/estimate.js";
import { QT } from "./games/quick-tap.js";
import { RX } from "./games/reaction.js";
import { GAMES, GC, SHARED2, lenName, scoreTxt, versusOf } from "./games/registry.js";
import { rxBar } from "./games/round.js";
import { SQ } from "./games/sequence.js";
import { SP } from "./games/spot.js";
import { TM } from "./games/timing.js";
import { applyPrefs, askUnlock, renderOver, renderOverChips, setLastRun, show } from "./menu.js";
import { INTRO, Scores, UNLOCKS, chalRun, checkAch, checkUnlocks, goalFor, isOpen, lenOpen, lensOf, pendingAim, pendingGoal, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlocked, verdict } from "./progress.js";
import { toast } from "./ui/toast.js";
const ENGINE={ 'quick-tap':QT, 'dots':DT, 'hold':HD, 'sequence':SQ, 'timing':TM, 'reaction':RX, 'spot':SP };

/* ---------- first play of a mode (v6): a ghost finger plays two or three beats under a one-liner, then the countdown. Tap to skip ---------- */
const Intro=(()=>{
  let timers=[], done=null; const ghost=$('#ghost');
  const later=(f,ms)=>{ const id=G.runId; timers.push(setTimeout(()=>{ if(G.on&&G.runId===id) f(); },ms)); };
  const at=(x,y)=>{ ghost.style.transform=`translate(${x}px,${y}px)`; };
  const centre=el=>{ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; };
  const tap=()=>{ ghost.classList.remove('tap'); void ghost.offsetWidth; ghost.classList.add('tap'); Snd.hit(); };
  const move=el=>{ const c=centre(el); at(c.x,c.y); ghost.classList.add('on'); };
  function clear(){ timers.forEach(clearTimeout); timers=[]; ghost.classList.remove('on','hold','tap'); ghost.style.transition='none'; $('#intro').classList.remove('on'); }
  const SCRIPT={
    'quick-tap'(){ const four=sel.diff==='four'; G.target=0; QT.render(true); const pad=i=>$(`#qt .pad[data-side="${i}"]`);
      later(()=>move(pad(0)),250); later(()=>{ tap(); G.target=four?3:1; QT.render(true); },800); later(()=>move(pad(four?3:1)),1050); later(()=>{ tap(); G.target=four?2:0; QT.render(true); },1650); later(()=>move(pad(four?2:0)),1900); later(()=>{ tap(); QT.render(false); },2500); return 3000; },
    'dots'(){ G.pos=DT.rnd(null); G.prevPos=null; G.nextPos=DT.rnd(G.pos); DT.render(true); const f=()=>$('#field').getBoundingClientRect(); const dot=()=>{ const r=f(); at(r.left+G.pos.x+DT.sz/2,r.top+G.pos.y+DT.sz/2); ghost.classList.add('on'); };
      const step=()=>{ tap(); DT.advance(); DT.render(true); DT.ring(); };
      later(dot,250); later(step,850); later(dot,1000); later(step,1700); later(dot,1850); later(()=>{ tap(); DT.render(false); },2550); return 3000; },
    'hold'(){ HD.begin(); const c=()=>centre($('#hfield')); let t=0;
      const poll=()=>{ if(HD.st==='wait'){ const p=c(); at(p.x,p.y+40); ghost.classList.add('on'); later(()=>{ ghost.classList.add('hold'); HD.down(); const dur=HD.target/(CFG.holdRate*vmin())*1000; later(()=>{ HD.up(); ghost.classList.remove('hold'); HD.clearT(); later(()=>done&&done(),1300); },dur); },400); } else if(t++<60) later(poll,100); };
      later(poll,200); return 0; },
    'sequence'(){ const k=i=>$(`.key[data-k="${i}"]`); later(()=>SQ.light(0,500,300),300); later(()=>SQ.light(2,500,300),800);
      later(()=>move(k(0)),1300); later(()=>{ tap(); SQ.light(0,700,180); },1650); later(()=>move(k(2)),1850); later(()=>{ tap(); SQ.light(2,700,180); },2200); return 2900; },
  };
  return {
    run(cb){ const key=sel.game+':'+sel.diff, s=load('ne.intro',{}); if(s[key]) return cb(); s[key]=Date.now(); save('ne.intro',s);
      const [line,sub]=INTRO[key]||['','']; const words=line.split(' '); $('#intro-text').innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${i*110}ms">${w}</span>`).join('')+`<small class="w" style="animation-delay:${words.length*110+150}ms">${sub}</small>`; $('#intro').classList.add('on');
      ghost.style.transition='none'; const c=centre($('#game')); at(c.x,c.y); void ghost.offsetWidth; ghost.style.transition='';
      done=()=>{ done=null; clear(); if(sel.game==='hold') HD.clearT(); cb(); };
      // v7 games have no ghost demo yet — the one-liner sits for 1.8s, then the countdown
      const T=SCRIPT[sel.game]&&!(sel.game==='hold'&&sel.diff==='cut')?SCRIPT[sel.game]():1800; if(T) later(()=>done&&done(),T); },
    skip(){ if(done) done(); }, active:()=>!!done, clear:()=>{ done=null; clear(); } };
})();
function countdown(cb){ const c=$('#count'); let n=3; c.classList.add('on');
  const step=()=>{ if(!G.on) return; if(n>0){ c.innerHTML=`<span>${n}</span>`; Snd.tick(); n--; G.timers.push(setTimeout(step,CFG.countStep)); } else { c.classList.remove('on'); c.innerHTML=''; Snd.go(); G.live=true; $('#game').classList.add('live'); cb(); } };
  step(); }
// the PB marker (v11): a line on the rate bar at your best pace for this mode and length; on the other games a small "best" ghost under the running figure. Nothing when there is no PB
function pbShow(){ const g=GAMES[sel.game], pb=Scores.best(sel.game,sel.diff,sel.secs); const mk=$('#pbmark'), gh=$('#pbghost'); mk.classList.remove('on'); gh.classList.remove('on'); if(pb===null||VS.on||sel.vs) return;
  if(g.timed){ const k=Math.min(1,(pb/sel.secs)/(RATE_MAX[sel.game]||6)); mk.style.bottom=Math.round(k*100)+'%'; mk.classList.add('on'); }
  else { gh.textContent=`best ${scoreTxt(sel.game,pb,sel.diff,sel.secs)}`; gh.classList.add('on'); } }
function start(){
  const g=GAMES[sel.game], c=GC(sel.game,sel.diff,sel.secs); $('#game').dataset.g=sel.game; $('#game').dataset.d=sel.diff; HD.reset(); rxBar(null);
  // two players (v10): pass & play (sel.vs 1) takes turns at a fixed length; versus (sel.vs 2) is one run at both ends. v11: Sequence and Count run both players on one screen inside their own engine; Reaction and Sequence handle versus themselves
  if(sel.vs===2&&!versusOf(sel.game,sel.diff)) sel.vs=0; const versus=sel.vs===2; const vx=versus&&(sel.game==='quick-tap'||sel.game==='dots'); const shared=sel.vs===1&&SHARED2(sel.game,sel.diff);
  setCur(vx?VX:ENGINE[sel.game]);
  if(sel.vs===1&&!shared&&!VS.on){ VS.on=true; VS.stage=0; VS.p1=VS.p2=null; } if(VS.on) VS.stage++;
  if(VS.on&&PASS_LEN[sel.game]) sel.secs=PASS_LEN[sel.game];
  if(versus&&c.vsLens&&!c.vsLens.includes(sel.secs)) sel.secs=c.vsLens[0];
  $$('.screen').forEach(s=>s.classList.remove('on')); $('#game').classList.add('on'); $('#game').classList.remove('live','shake'); $('#stars').style.opacity=0; $('#wheelwrap').classList.remove('on'); $('#lockwrap').classList.remove('on');
  $('#game').classList.toggle('versus',vx); $('#game').classList.toggle('bigc',sel.game==='quick-tap'&&!versus); $('#bigcount').textContent='0';
  const who=VS.on?pWho(VS.stage-1)+' · ':''; $('#hud-mode').innerHTML=who+(MODE_NAME[sel.diff]?MODE_NAME[sel.diff]+' · ':'')+(versus?(c.vsLens?lenName(sel.game,sel.secs,sel.diff):'versus'):shared?'pass & play':lenName(sel.game,sel.secs,sel.diff)); $('#score').textContent=c.lower?'0.00':'0';
  // the next unlock this run could earn, if any, sits under the HUD (v8). Not for two players. v11: a "Try to unlock" or achievement run keeps its goal up as a reminder even when nothing new can unlock
  // v13 (3.8): a "Try to unlock" run keeps the goal for the thing that was tapped — not whatever the chain would offer next
  G.goal=VS.on||sel.vs?null:((pendingGoal&&UNLOCKS.find(u=>u.key===pendingGoal))||goalFor(sel.game,sel.diff,sel.secs)); const gl=$('#goal'); gl.classList.remove('hit'); gl.classList.toggle('on',!!G.goal||(!!pendingAim&&!sel.vs)); if(G.goal){ gl.innerHTML=`goal · <b>${G.goal.need}</b> · unlocks ${unlockName(G.goal.key)}`; } else if(pendingAim&&!sel.vs) gl.innerHTML=`goal · <b>${pendingAim}</b>`; else gl.innerHTML=''; $('#bar').style.display=g.timed?'':'none'; $('#bar').style.transform='scaleX(1)';
  $('#hud-time').textContent=g.timed?sel.secs.toFixed(2):''; $('#hlbl').innerHTML=''; ['ht','hg','hm'].forEach(l=>$(`#${l} path`).setAttribute('d',''));
  G.timers.forEach(clearTimeout); G.timers=[]; $('#score').style.visibility=''; applyPrefs(sel.game); $('#gen').innerHTML=''; $('#hud-time').classList.remove('you'); $('#seq').classList.remove('watch','input'); $('#turn').classList.remove('on','stay','p1','p2'); $('#game').classList.toggle('timed',!!g.timed&&!versus); $('#rate i').style.height='0'; $('#rate b').textContent='0.0/s'; $('#edge').style.opacity=0; HD.icon(null);
  G.runId=(G.runId||0)+1; Object.assign(G,{on:true,live:false,end:0,hits:0,misses:0,armed:false,lockUntil:0,target:-1,next:-1,pos:null,nextPos:null,prevPos:null,hitT:[],goalHit:false,fresh:[]});
  pbShow(); setPendingAim(''); setPendingGoal(null);
  Music.start(sel.game);
  if(vx){ VX.setup(); countdown(()=>VX.begin()); return; }
  if(g.timed) cur.render(false);
  if(sel.game==='sequence') SQ.build();
  // first time in a mode: the ghost demo, then the countdown (v6). The keys run the scale under the 3-2-1 (v5)
  Intro.run(()=>{ if(sel.game==='sequence') SQ.demo();
    countdown(()=>{
      if(!g.timed){ cur.begin(); return; }
      G.t0=performance.now(); G.end=G.t0+sel.secs*1000; cur.begin(); G.armed=true; arm();
      cancelAnimationFrame(G.raf); G.raf=requestAnimationFrame(tick); }); });
}
// v11: the stale "shake" class used to replay its animation every time #game was shown again — that was the spurious wrong-answer shake at the start of runs. It comes off on every start, abort and show
function abort(){ if(!G.on) return; G.on=false; G.runId++; HD.st='idle'; VS.reset(); Intro.clear(); cancelAnimationFrame(G.raf); G.timers.forEach(clearTimeout); G.timers=[]; Music.stop(); if(cur&&cur.clearT) cur.clearT(); $('#count').classList.remove('on'); $('#vwin').classList.remove('on'); $('#game').classList.remove('shake','live'); $('#seqdone')?.classList.remove('on'); rxBar(null); show('s-pick'); }

/* ---------- versus (v10): one phone, two ends. Quick Tap — each player has two pads and their own white square; Dots — squares for the bottom player, circles for the top, each mostly in its own 70% of the screen, and a tap on the other player's shape gives them the point. First to lead by VS_LEAD wins; at VS_CAP seconds whoever leads wins ---------- */
const VX={ n:[0,0], tgt:[0,0], lock:[0,0], streak:[0,0], pos:[null,null], next:[null,null], raf:0, t0:0, done:false,
  qt(){ return sel.game==='quick-tap'; },
  sz(){ return Math.max(64,Math.min(110,18*vmin())); },
  clearT(){ cancelAnimationFrame(this.raf); },
  setup(){ this.n=[0,0]; this.lock=[0,0]; this.streak=[0,0]; this.done=false; $('#vn0').textContent='0'; $('#vn1').textContent='0';  $('#vsdiff').textContent=`first to lead by ${VS_LEAD}`; $('#vsnote').textContent=this.qt()?'tap your white square':'squares vs circles · wrong shape gives them the point'; $('#vslead').style.left='50%'; $('#vslead').style.width='0'; $('#vwin').classList.remove('on');
    $('#vfield').style.setProperty('--dsz',this.sz()+'px'); $('#vfield').innerHTML=this.qt()?'':`<div class="vlead" id="vl0"></div><div class="vlead c" id="vl1"></div><div class="vshape" id="vs0"></div><div class="vshape c" id="vs1"></div>`; for(let p=0;p<2;p++) for(let i=0;i<2;i++) $(`#vsq${p}${i}`).style.setProperty('--v',0); },
  begin(){ this.t0=performance.now(); if(this.qt()){ this.tgt=[Math.random()*2|0,Math.random()*2|0]; this.renderQT(); } else { this.pos=[this.spot(0,null),this.spot(1,null)]; this.next=[this.spot(0,this.pos[0]),this.spot(1,this.pos[1])]; this.renderDT(); }
    const loop=now=>{ if(!G.on||this.done) return; if(now-this.t0>VS_CAP*1000) return this.end(); for(let p=0;p<2;p++) if(this.lock[p]&&now>=this.lock[p]){ this.lock[p]=0; this.qt()?this.renderQT():0; } this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  // the bottom player's shapes land in the bottom 70%, the top player's in the top 70% — the middle 40% is shared
  spot(p,avoid){ const f=$('#vfield').getBoundingClientRect(), sz=this.sz(); const mx=Math.max(1,f.width-sz), top=f.height*.16, bot=f.height*.84-sz; const y0=p===0?top+(bot-top)*.3:top, y1=p===0?bot:top+(bot-top)*.7;
    for(let i=0;i<20;i++){ const q={x:Math.random()*mx,y:y0+Math.random()*(y1-y0)}; if(avoid&&Math.hypot(q.x-avoid.x,q.y-avoid.y)<=sz*1.3) continue; const o=this.pos[1-p]; if(o&&Math.hypot(q.x-o.x,q.y-o.y)<=sz*1.2) continue; return q; } return {x:Math.random()*mx,y:y0}; },
  renderQT(){ for(let p=0;p<2;p++) for(let i=0;i<2;i++) $(`#vsq${p}${i}`).style.setProperty('--v',!this.lock[p]&&this.tgt[p]===i?1:0); },
  renderDT(){ const lead=sel.diff==='lead'; for(let p=0;p<2;p++){ const s=$('#vs'+p), l=$('#vl'+p); s.style.transform=`translate(${this.pos[p].x}px,${this.pos[p].y}px)`; s.classList.add('on'); if(lead){ l.style.transform=`translate(${this.next[p].x}px,${this.next[p].y}px)`; l.classList.add('on'); } } },
  score(p){ this.n[p]++; const el=$('#vn'+p); el.textContent=this.n[p]; Snd.hit(); const d=this.n[0]-this.n[1]; const k=Math.min(1,Math.abs(d)/VS_LEAD)*50; const bar=$('#vslead'); bar.style.width=k+'%'; bar.style.left=d>=0?'50%':(50-k)+'%'; $('#vsdiff').innerHTML=d===0?'level':`${pWho(d>0?0:1)} +${Math.abs(d)}`;
    if(Math.abs(d)>=VS_LEAD) this.end(); },
  padTap(p,i){ if(!G.on||this.done||this.lock[p]) return; if(this.tgt[p]===i){ this.score(p); const prev=this.tgt[p]; let t=Math.random()*2|0; if(t===prev){ this.streak[p]++; if(this.streak[p]>=3){ t=1-prev; this.streak[p]=0; } } else this.streak[p]=0; this.tgt[p]=t; this.renderQT(); } else { this.lock[p]=performance.now()+CFG.lockout; Snd.miss(); this.renderQT(); if(navigator.vibrate) navigator.vibrate(30); } },
  fieldTap(e){ if(!G.on||this.done||this.qt()) return; const f=$('#vfield').getBoundingClientRect(); const x=e.clientX-f.left, y=e.clientY-f.top, sz=this.sz(), c=sz/2; let hitP=-1;
    for(let p=0;p<2;p++){ const q=this.pos[p]; if(Math.hypot(x-(q.x+c),y-(q.y+c))<=c*CFG.dotLeeway+8) hitP=p; } if(hitP<0) return;
    // whose finger? the bottom 50% is the bottom player's reach, the top the top player's. A tap on the other player's shape hands them the point
    this.score(hitP); const lead=sel.diff==='lead'; this.pos[hitP]=lead?this.next[hitP]:this.spot(hitP,this.pos[hitP]); this.next[hitP]=this.spot(hitP,this.pos[hitP]); this.renderDT(); },
  end(){ if(this.done) return; this.done=true; cancelAnimationFrame(this.raf); const a=this.n[0], b=this.n[1]; const w=a>b?0:b>a?1:-1; const win=$('#vwin'); win.innerHTML=w<0?'<div>draw</div>':`<div class="${w?'top p2':'p1'}">Player ${w+1} wins</div>`; win.classList.add('on'); Snd.end();
    G.timers.push(setTimeout(()=>finish({hits:a,misses:0,vs2:{a,b,w,how:Math.abs(a-b)>=VS_LEAD?'by '+VS_LEAD:'on the clock'}}),1900)); } };
/* ---------- ads (v10): a placeholder slot on the result screen, and a placeholder break every fourth result. Never during a run, never for supporters. The real SDK goes in the app build ---------- */
const Ads={ after(cb){ if(prefs.supporter){ cb(); return; } prefs.adRuns=(prefs.adRuns||0)+1; save('ne.prefs',prefs); if(prefs.adRuns%4){ cb(); return; }
    const a=$('#adbreak'), b=$('#adskip'); b.disabled=true; b.textContent='skip in 2'; a.classList.add('on'); this.cb=cb; let n=2; const t=setInterval(()=>{ n--; if(n>0) b.textContent='skip in '+n; else { clearInterval(t); b.disabled=false; b.textContent='skip'; } },1000); },
  close(){ $('#adbreak').classList.remove('on'); const cb=this.cb; this.cb=null; if(cb) cb(); } };
const RATE_MAX={'quick-tap':6,'dots':4.5};
// live hits per second (v9): from the gaps between the last six taps, so it moves in tenths — counting hits over two seconds could only ever show halves. It sags when you stop
function rateMeter(now){ const t=G.hitT; let r=0; if(t.length>=2){ const k=Math.min(t.length-1,6); const avg=(t[t.length-1]-t[t.length-1-k])/k; const since=now-t[t.length-1]; r=1000/Math.max(avg,since>avg?since:avg); } else if(t.length===1){ r=Math.min(1,1000/Math.max(1,now-t[0])); } const k=Math.min(1,r/(RATE_MAX[sel.game]||6));
  $('#rate i').style.height=Math.round(k*100)+'%'; $('#rate b').textContent=r.toFixed(1)+'/s'; $('#edge').style.opacity=k>.4?((k-.4)/.6*.4).toFixed(2):0; }
function arm(){ cur.render(true); cur.ring(); }
function tick(now){
  if(!G.on) return;
  const left=Math.max(0,G.end-now); $('#hud-time').textContent=(left/1000).toFixed(2); $('#bar').style.transform=`scaleX(${left/(sel.secs*1000)})`;
  if(now>=G.end) return finish({hits:G.hits,misses:G.misses,peak:peakRate()});
  if(now-(G.meterAt||0)>100){ G.meterAt=now; rateMeter(now); }
  if(G.lockUntil && now>=G.lockUntil){ G.lockUntil=0; if(sel.game==='dots') cur.render(true); else arm(); }
  G.raf=requestAnimationFrame(tick);
}
function tapAt(ok){ if(!G.on) return; const now=performance.now(); if(!G.armed||now<G.lockUntil) return; ok ? hit() : miss(now); }
function hit(){ G.hits++; G.hitT.push(performance.now()); $('#score').textContent=G.hits; Snd.hit(); cur.advance(); arm();
  // the big centred count (v10) — Quick Tap solo — pops on every hit so you never look up to the HUD
  const bc=$('#bigcount'); bc.textContent=G.hits; bc.classList.remove('pop'); void bc.offsetWidth; bc.classList.add('pop');
  liveCheck({hits:G.hits,misses:G.misses}); }
// best hits in any rolling second — a test readout for setting the Blind thresholds (v5)
function peakRate(){ const t=G.hitT||[]; let best=0; for(let i=0,j=0;i<t.length;i++){ while(t[i]-t[j]>1000) j++; best=Math.max(best,i-j+1); } return best; }
function miss(now){
  // dots (v8): a miss holds the dot where it is for half a second, then play goes on — it no longer vanishes
  const dots=sel.game==='dots'; G.misses++; G.lockUntil=now+(dots?500:CFG.lockout); Snd.miss(); if(!dots) cur.render(false);
  const g=$('#game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
  const f=$('#flash'); f.style.transition='none'; f.style.opacity=.28; requestAnimationFrame(()=>{ f.style.transition=`opacity ${CFG.lockout}ms ease-out`; f.style.opacity=0; });
  if(navigator.vibrate) navigator.vibrate(40);
}
function finish(res){
  G.on=false; G.live=false; cancelAnimationFrame(G.raf); G.timers.forEach(clearTimeout); G.timers=[]; Music.stop(); if(cur.clearT) cur.clearT(); Snd.end(); $('#seqdone')?.classList.remove('on');
  const run=Object.assign({ t:Date.now(), g:sel.game, d:sel.diff, s:sel.secs, n:prefs.name||'', v:13 },res); if(chalRun(run.g,run.d,run.s)) run.chal=1; setLastRun(run); if(!prefs.played){ prefs.played=1; save('ne.prefs',prefs); }
  // pass & play (v10): neither run is recorded — the board is solo. Player 1 plays, the phone is passed, the two are compared. v11: Player 1 red, Player 2 blue
  if(VS.on&&VS.stage===1){ VS.p1=run; $('#pass-eyebrow').textContent=`${GAMES[sel.game].name}${MODE_NAME[sel.diff]?' · '+MODE_NAME[sel.diff]:''} · pass & play`; $('#pass-who').innerHTML=`${pWho(1)} · you're up`; $('#pass-text').innerHTML=`${pWho(0)} scored <b>${scoreTxt(sel.game,run.hits,sel.diff,run.s)}</b>.<br>Hand the phone over.`; setTimeout(()=>show('s-pass'),250); return; }
  if(VS.on&&VS.stage===2) VS.p2=run;
  const two=!!run.vs2||VS.on;
  const isBest = run.practice||(run.fail&&!run.hits)||two ? false : Scores.submit(run);
  const g=GC(sel.game,sel.diff,run.s);
  // the header (v11) carries only a status — the board title under the top 10 names the game, mode and length
  $('#over-eyebrow').textContent=run.practice?'practice':run.fail?'run over':isBest?'new best':run.vs2?(sel.vs===1?'pass & play':'versus'):VS.on?'pass & play':'';
  // practice shows no score at all (v5). Versus shows the pair of counts. Lower-is-better scores wear a ▼ (v11)
  $('#over-score').innerHTML=run.vs2?`${run.vs2.txt?run.vs2.txt[0]:run.vs2.a}–${run.vs2.txt?run.vs2.txt[1]:run.vs2.b}`:run.practice||(run.fail&&!run.hits)?'—':scoreTxt(sel.game,run.hits,sel.diff,run.s)+(g.lower?'<span class="dn">▼</span>':''); $('#over-score').classList.toggle('sm',!!g.suffix||!!run.vs2);
  $('#verdict').textContent=run.vs2?(run.vs2.w<0?'A draw. Nobody gets to blame anybody.':`Player ${run.vs2.w+1} took it${run.vs2.how?' '+run.vs2.how:''}. No excuses.`):run.practice?'Practice. Nothing counted — go for real when it feels right.':verdict(run);
  F.bd={g:sel.game,d:sel.diff,s:sel.secs}; renderOver(run);
  // the ad break (v10) comes between the run and the result, every fourth result, never for supporters
  setTimeout(()=>Ads.after(()=>{ show('s-over'); if(run.practice||two) return;
    const msgs=checkUnlocks(run).map(u=>[unlockToast(u.key),'','ok'])
      .concat(checkAch(run).map(a=>['Achievement · '+a.name+(a.unlocks?' · '+unlockHtml(a):''),a.id,'']));
    msgs.forEach(([m,id,cls],i)=>setTimeout(()=>toast(m,id,cls,!!id),i*(id?3400:2600))); renderOverChips(); }),250);
}
// build 15 (stage 1): the two run-time functions that were in progress.js — they need G, sel, VS and start(), which progress.js no longer imports
// mid-run (v10): engines call this with the run so far. Any live unlock that now passes lands at once, with a green toast; the goal line ticks
function liveCheck(part){ if(!G.on||VS.on||sel.vs===2) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0},part); const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; G.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save('ne.unlock',u);
  if(G.goal&&!G.goalHit&&(u[G.goal.key]||G.goal.test(run))){ G.goalHit=true; if(G.goal.len) toast(unlockToast(G.goal.key),'','ok'); $('#goal').classList.add('hit'); $('#goal').innerHTML='✓ '+$('#goal').innerHTML; } }
// a locked game or mode (v10): the lock box's Try to unlock — straight into the game, with the goal line up
function goWhere(w){ $('#lockwrap').classList.remove('on'); if(!w) return; const G_=GAMES[w.g]; sel.game=w.g; prefs.lastGame=w.g; save('ne.prefs',prefs);
  sel.diff=w.d&&isOpen(w.g,w.d)?w.d:(G_.modes.find(d=>isOpen(w.g,d))||G_.modes[0]); if(!isOpen(sel.game,sel.diff)) return askUnlock(sel.game,sel.diff);
  const lens=lensOf(w.g,sel.diff); sel.secs=w.s||(lens.includes(sel.secs)&&lenOpen(w.g,sel.diff,sel.secs)?sel.secs:lens.find(s=>lenOpen(w.g,sel.diff,s))); if(!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens[0]; sel.vs=0; sel.practice=0; VS.reset(); setPendingAim(w.need||''); setPendingGoal(w.aim||null); start(); }
/* ---------- menu atmosphere: four designs, all quiet ---------- */
const cv=$('#stars'), cx=cv.getContext('2d'); let W,H,pts=[],dpr=1;
function size(){ dpr=devicePixelRatio||1; W=cv.width=innerWidth*dpr; H=cv.height=innerHeight*dpr;
  pts=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.4+.4)*dpr,s:(Math.random()*.15+.05)*dpr,a:Math.random()*.5+.15,ph:Math.random()*6.28,l:(30+Math.random()*60)*dpr,v:(.6+Math.random()*1.2)*dpr,R:(120+Math.random()*160)*dpr})); }
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const DRAW={
  stars(t){ for(const p of pts){ if(!reduce){ p.y-=p.s; if(p.y<-4) p.y=H+4; } cx.globalAlpha=p.a*(.6+.4*Math.sin(t/1400+p.ph)); cx.fillStyle='#E8E6E1'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.28); cx.fill(); } },
  // grid (v8): the spacing breathes — lines drift apart and back together around the centre, and being evenly spaced they can never cross
  grid(t){ const g=56*dpr*(1+(reduce?0:.22*Math.sin(t/2800))); const ox=(W/2)%g, oy=(H/2)%g; cx.globalAlpha=.07; cx.strokeStyle='#E8E6E1'; cx.lineWidth=dpr; cx.beginPath(); for(let x=ox-g;x<W+g;x+=g){ cx.moveTo(x,0); cx.lineTo(x,H); } for(let y=oy-g;y<H+g;y+=g){ cx.moveTo(0,y); cx.lineTo(W,y); } cx.stroke();
    cx.globalAlpha=.16; for(let i=0;i<12;i++){ const p=pts[i]; const gx=Math.round((p.x-ox)/g)*g+ox, gy=Math.round((p.y-oy)/g)*g+oy; cx.fillStyle='#E8E6E1'; cx.fillRect(gx-1.5*dpr,gy-1.5*dpr,3*dpr,3*dpr); } },
  rain(t){ cx.strokeStyle='#E8E6E1'; cx.lineWidth=dpr; for(const p of pts.slice(0,40)){ if(!reduce){ p.y+=p.v; if(p.y>H+p.l) p.y=-p.l; } cx.globalAlpha=p.a*.28; cx.beginPath(); cx.moveTo(p.x,p.y-p.l); cx.lineTo(p.x,p.y); cx.stroke(); } },
  orbs(t){ for(const p of pts.slice(0,6)){ const x=p.x+(reduce?0:Math.sin(t/4000+p.ph)*40*dpr), y=p.y+(reduce?0:Math.cos(t/5200+p.ph)*30*dpr); const gr=cx.createRadialGradient(x,y,0,x,y,p.R); gr.addColorStop(0,'rgba(232,230,225,.09)'); gr.addColorStop(1,'rgba(232,230,225,0)'); cx.globalAlpha=1; cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,p.R,0,6.28); cx.fill(); } },
};

export { Ads, DRAW, ENGINE, H, Intro, RATE_MAX, VX, W, abort, arm, countdown, cv, cx, dpr, finish, goWhere, hit, liveCheck, miss, pbShow, peakRate, pts, rateMeter, reduce, size, start, tapAt, tick };
