/* No Excuses — the OLD run loop, build 17 transition: still drives the engines not yet ported to run/run.js (the engine contract).
   Every ported game goes through run/run.js instead; start() and abort() dispatch. Deleted when the last engine is ported. */

import { Music, Snd } from "./audio.js";
import { RUN_SCHEMA } from "./config/build.js";
import { HUD, INTRO, PASS, RESULT, TOAST, VERDICT } from "./config/copy.js";
import { CFG, MODE_NAME, PASS_LEN, RATE_MAX, VS_CAP, VS_LEAD } from "./config/games.js";
import { $, $$, T, pWho, vmin } from "./core.js";
import * as Run from "./run/run.js";
import { Ads } from "./ui/ads.js";
import { F, VS, sel } from "./core/state.js";
import { load, prefs, save } from "./core/store.js";
import { G, cur, setCur } from "./engine-core.js";
import { HD } from "./games/estimate/index.js";
import { GAMES, GC, SHARED2, lenName, versusOf } from "./games/registry.js";
import { rxBar } from "./games/_shared/round.js";
import { applyPrefs, askUnlock, renderOver, renderOverChips, setLastRun, show } from "./menu.js";
import { Scores, UNLOCKS, chalRun, checkAch, checkUnlocks, goalFor, isOpen, lenOpen, lensOf, pendingAim, pendingGoal, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlocked, verdict } from "./progress.js";
import { scoreTxt } from "./ui/format.js";
import { toast } from "./ui/toast.js";
// build 17 transition: the engines not yet ported to run/run.js. Each port removes one; the last removes this file
const ENGINE={ 'hold':HD };

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
    'hold'(){ HD.begin(); const c=()=>centre($('#hfield')); let t=0;
      const poll=()=>{ if(HD.st==='wait'){ const p=c(); at(p.x,p.y+40); ghost.classList.add('on'); later(()=>{ ghost.classList.add('hold'); HD.down(); const dur=HD.target/(CFG.holdRate*vmin())*1000; later(()=>{ HD.up(); ghost.classList.remove('hold'); HD.clearT(); later(()=>done&&done(),1300); },dur); },400); } else if(t++<60) later(poll,100); };
      later(poll,200); return 0; },
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
  else { gh.textContent=T(HUD.best,{score:scoreTxt(sel.game,pb,sel.diff,sel.secs)}); gh.classList.add('on'); } }
function start(){
  if(Run.handles()) return Run.start();
  const g=GAMES[sel.game], c=GC(sel.game,sel.diff,sel.secs); $('#game').dataset.g=sel.game; $('#game').dataset.d=sel.diff; HD.reset(); rxBar(null);
  // two players (v10): pass & play (sel.vs 1) takes turns at a fixed length; versus (sel.vs 2) is one run at both ends. v11: Sequence and Count run both players on one screen inside their own engine; Reaction and Sequence handle versus themselves
  if(sel.vs===2&&!versusOf(sel.game,sel.diff)) sel.vs=0; const versus=sel.vs===2; const vx=versus&&(sel.game==='quick-tap'||sel.game==='dots'); const shared=sel.vs===1&&SHARED2(sel.game,sel.diff);
  setCur(ENGINE[sel.game]);
  if(sel.vs===1&&!shared&&!VS.on){ VS.on=true; VS.stage=0; VS.p1=VS.p2=null; } if(VS.on) VS.stage++;
  if(VS.on&&PASS_LEN[sel.game]) sel.secs=PASS_LEN[sel.game];
  if(versus&&c.vsLens&&!c.vsLens.includes(sel.secs)) sel.secs=c.vsLens[0];
  $$('.screen').forEach(s=>s.classList.remove('on')); $('#game').classList.add('on'); $('#game').classList.remove('live','shake'); $('#stars').style.opacity=0; $('#wheelwrap').classList.remove('on'); $('#lockwrap').classList.remove('on');
  $('#game').classList.toggle('versus',vx); $('#game').classList.toggle('bigc',sel.game==='quick-tap'&&!versus); $('#bigcount').textContent='0';
  const who=VS.on?pWho(VS.stage-1)+' · ':''; $('#hud-mode').innerHTML=who+(MODE_NAME[sel.diff]?MODE_NAME[sel.diff]+' · ':'')+(versus?(c.vsLens?lenName(sel.game,sel.secs,sel.diff):HUD.versus):shared?HUD.pass:lenName(sel.game,sel.secs,sel.diff)); $('#score').textContent=c.lower?'0.00':'0';
  // the next unlock this run could earn, if any, sits under the HUD (v8). Not for two players. v11: a "Try to unlock" or achievement run keeps its goal up as a reminder even when nothing new can unlock
  // v13 (3.8): a "Try to unlock" run keeps the goal for the thing that was tapped — not whatever the chain would offer next
  G.goal=VS.on||sel.vs?null:((pendingGoal&&UNLOCKS.find(u=>u.key===pendingGoal))||goalFor(sel.game,sel.diff,sel.secs)); const gl=$('#goal'); gl.classList.remove('hit'); gl.classList.toggle('on',!!G.goal||(!!pendingAim&&!sel.vs)); if(G.goal){ gl.innerHTML=T(HUD.goal,{need:G.goal.need,name:unlockName(G.goal.key)}); } else if(pendingAim&&!sel.vs) gl.innerHTML=T(HUD.aim,{aim:pendingAim}); else gl.innerHTML=''; $('#bar').style.display=g.timed?'':'none'; $('#bar').style.transform='scaleX(1)';
  $('#hud-time').textContent=g.timed?sel.secs.toFixed(2):''; $('#hlbl').innerHTML=''; ['ht','hg','hm'].forEach(l=>$(`#${l} path`).setAttribute('d',''));
  G.timers.forEach(clearTimeout); G.timers=[]; $('#score').style.visibility=''; applyPrefs(sel.game); $('#gen').innerHTML=''; $('#hud-time').classList.remove('you'); $('#seq').classList.remove('watch','input'); $('#turn').classList.remove('on','stay','p1','p2'); $('#game').classList.toggle('timed',!!g.timed&&!versus); $('#rate i').style.height='0'; $('#rate b').textContent='0.0/s'; $('#edge').style.opacity=0; HD.icon(null);
  G.runId=(G.runId||0)+1; Object.assign(G,{on:true,live:false,end:0,hits:0,misses:0,armed:false,lockUntil:0,target:-1,next:-1,pos:null,nextPos:null,prevPos:null,hitT:[],goalHit:false,fresh:[]});
  pbShow(); setPendingAim(''); setPendingGoal(null);
  Music.start(sel.game,G,sel.secs);
  if(g.timed) cur.render(false);
  // first time in a mode: the ghost demo, then the countdown (v6). The keys run the scale under the 3-2-1 (v5)
  Intro.run(()=>{
    countdown(()=>{
      if(!g.timed){ cur.begin(); return; }
      G.t0=performance.now(); G.end=G.t0+sel.secs*1000; cur.begin(); G.armed=true; arm();
      cancelAnimationFrame(G.raf); G.raf=requestAnimationFrame(tick); }); });
}
// v11: the stale "shake" class used to replay its animation every time #game was shown again — that was the spurious wrong-answer shake at the start of runs. It comes off on every start, abort and show
function abort(){ if(Run.active()) return Run.abort(); if(!G.on) return; G.on=false; G.runId++; HD.st='idle'; VS.reset(); Intro.clear(); cancelAnimationFrame(G.raf); G.timers.forEach(clearTimeout); G.timers=[]; Music.stop(); if(cur&&cur.clearT) cur.clearT(); $('#count').classList.remove('on'); $('#vwin').classList.remove('on'); $('#game').classList.remove('shake','live'); $('#seqdone')?.classList.remove('on'); rxBar(null); show('s-pick'); }

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
  const run=Object.assign({ t:Date.now(), g:sel.game, d:sel.diff, s:sel.secs, n:prefs.name||'', v:RUN_SCHEMA },res); if(chalRun(run.g,run.d,run.s)) run.chal=1; setLastRun(run); if(!prefs.played){ prefs.played=1; save('ne.prefs',prefs); }
  // pass & play (v10): neither run is recorded — the board is solo. Player 1 plays, the phone is passed, the two are compared. v11: Player 1 red, Player 2 blue
  if(VS.on&&VS.stage===1){ VS.p1=run; $('#pass-eyebrow').textContent=T(PASS.eyebrow,{game:`${GAMES[sel.game].name}${MODE_NAME[sel.diff]?' · '+MODE_NAME[sel.diff]:''}`}); $('#pass-who').innerHTML=T(PASS.up,{who:pWho(1)}); $('#pass-text').innerHTML=T(PASS.text,{who:pWho(0),score:scoreTxt(sel.game,run.hits,sel.diff,run.s)}); setTimeout(()=>show('s-pass'),250); return; }
  if(VS.on&&VS.stage===2) VS.p2=run;
  const two=!!run.vs2||VS.on;
  const isBest = run.practice||(run.fail&&!run.hits)||two ? false : Scores.submit(run);
  const g=GC(sel.game,sel.diff,run.s);
  // the header (v11) carries only a status — the board title under the top 10 names the game, mode and length
  $('#over-eyebrow').textContent=run.practice?RESULT.practice:run.fail?RESULT.fail:isBest?RESULT.best:run.vs2?(sel.vs===1?RESULT.pass:RESULT.versus):VS.on?RESULT.pass:'';
  // practice shows no score at all (v5). Versus shows the pair of counts. Lower-is-better scores wear a ▼ (v11)
  $('#over-score').innerHTML=run.vs2?`${run.vs2.txt?run.vs2.txt[0]:run.vs2.a}–${run.vs2.txt?run.vs2.txt[1]:run.vs2.b}`:run.practice||(run.fail&&!run.hits)?RESULT.dash:scoreTxt(sel.game,run.hits,sel.diff,run.s)+(g.lower?RESULT.lowerMark:''); $('#over-score').classList.toggle('sm',!!g.suffix||!!run.vs2);
  $('#verdict').textContent=run.vs2?(run.vs2.w<0?VERDICT.draw:T(VERDICT.took,{n:run.vs2.w+1,how:run.vs2.how?' '+run.vs2.how:''})):run.practice?VERDICT.practice:verdict(run);
  F.bd={g:sel.game,d:sel.diff,s:sel.secs}; renderOver(run);
  // the ad break (v10) comes between the run and the result, every fourth result, never for supporters
  setTimeout(()=>Ads.after(()=>{ show('s-over'); if(run.practice||two) return;
    const msgs=checkUnlocks(run).map(u=>[unlockToast(u.key),'','ok'])
      .concat(checkAch(run).map(a=>[T(TOAST.achievement,{name:a.name})+(a.unlocks?' · '+unlockHtml(a):''),a.id,'']));
    msgs.forEach(([m,id,cls],i)=>setTimeout(()=>toast(m,id,cls,!!id),i*(id?3400:2600))); renderOverChips(); }),250);
}
// build 15 (stage 1): the two run-time functions that were in progress.js — they need G, sel, VS and start(), which progress.js no longer imports
// mid-run (v10): engines call this with the run so far. Any live unlock that now passes lands at once, with a green toast; the goal line ticks
function liveCheck(part){ if(!G.on||VS.on||sel.vs===2) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0},part); const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; G.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save('ne.unlock',u);
  if(G.goal&&!G.goalHit&&(u[G.goal.key]||G.goal.test(run))){ G.goalHit=true; if(G.goal.len) toast(unlockToast(G.goal.key),'','ok'); $('#goal').classList.add('hit'); $('#goal').innerHTML=HUD.goalHit+$('#goal').innerHTML; } }
// a locked game or mode (v10): the lock box's Try to unlock — run/run.js has it; it starts through this file's dispatching start() until every engine is ported
const goWhere=w=>Run.goWhere(w,start);

export { ENGINE, Intro, abort, arm, countdown, finish, goWhere, hit, liveCheck, miss, pbShow, peakRate, rateMeter, start, tapAt, tick };
