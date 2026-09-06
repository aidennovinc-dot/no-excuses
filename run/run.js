/* No Excuses — the run itself (build 17, refactor stage 3): start / tick / finish / abort, and the run state. Was app.js +
   engine-core.js. The engine is called only through the contract in ARCHITECTURE.md — mount / start / input / tick / stop /
   result, plus the optional demo (the first-play ghost) and precount (what plays under the 3-2-1) — and talks back through
   ctx.emit: 'finish' with the run record, 'live' with the run so far. Engines never see sel, prefs, the store or each other.

   ctx = { root, game, cfg, mode, len, players, practice, scale, emit, timers, audio, rand } — the contract's set plus
   practice and scale, which Sequence needs and which used to be read off sel. */

import { Music, Snd } from "../audio.js";
import { RUN_SCHEMA } from "../config/build.js";
import { HUD, INTRO, PASS, RESULT, TOAST, VERDICT } from "../config/copy.js";
import { MODE_NAME, PASS_LEN, RATE_MAX } from "../config/games.js";
import { $, $$, T, pWho } from "../core.js";
import { F, VS, sel } from "../core/state.js";
import { load, prefs, save } from "../core/store.js";
import { makeTimers, tapTime } from "../core/timers.js";
import * as hud from "../games/_shared/hud.js";
import { ENGINES, GAMES, GC, SHARED2, VERSUS, lenName, versusOf } from "../games/registry.js";
import { applyPrefs, askUnlock, renderOver, renderOverChips, setLastRun, show } from "../menu.js";
import { Scores, UNLOCKS, chalRun, checkAch, checkUnlocks, goalFor, isOpen, lenOpen, lensOf, pendingAim, pendingGoal, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlocked, verdict } from "../progress.js";
import { Ads } from "../ui/ads.js";
import { scoreTxt } from "../ui/format.js";
import { toast } from "../ui/toast.js";

/* ---------- run state. `id` steps on every start and abort, so anything a dead run left behind can tell it is dead ---------- */
const R={ on:false, live:false, id:0, timed:false, t0:0, end:0, raf:0, goal:null, goalHit:false, fresh:[] };
let eng=null, ctx=null;
const isVx=()=>sel.vs===2&&(sel.game==='quick-tap'||sel.game==='dots');
// build 17 transition: which runs this module owns — every game once its engine is in ENGINES. app.js keeps the rest
const handles=()=>isVx()?!!VERSUS:!!ENGINES[sel.game];
const active=()=>R.on;

/* ---------- first play of a mode (v6): a ghost finger plays two or three beats under a one-liner, then the countdown. Tap to skip ---------- */
const Intro=(()=>{
  let done=null, timers=null; const ghost=$('#ghost');
  function clear(){ if(timers) timers.clearT(); ghost.classList.remove('on','hold','tap'); ghost.style.transition='none'; $('#intro').classList.remove('on'); }
  return {
    run(cb){ const key=sel.game+':'+sel.diff, s=load('ne.intro',{}); if(s[key]) return cb(); s[key]=Date.now(); save('ne.intro',s);
      const [line,sub]=INTRO[key]||['','']; const words=line.split(' '); $('#intro-text').innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${i*110}ms">${w}</span>`).join('')+`<small class="w" style="animation-delay:${words.length*110+150}ms">${sub}</small>`; $('#intro').classList.add('on');
      timers=makeTimers(ctx.timers.alive); const g=hud.makeGhost(Snd,timers);
      ghost.style.transition='none'; const c=g.centre($('#game')); g.at(c.x,c.y); void ghost.offsetWidth; ghost.style.transition='';
      done=()=>{ done=null; clear(); ctx.timers.clearT(); cb(); };
      // an engine without a demo (the v7 games): the one-liner sits for 1.8s, then the countdown. A demo returns its length, or 0 when it calls done itself
      const ms=eng.demo?eng.demo(ctx,g,()=>done&&done()):1800; if(ms) timers.later(()=>done&&done(),ms); },
    active:()=>!!done, clear:()=>{ done=null; clear(); } };
})();
// the PB marker (v11): a line on the rate bar at your best pace for this mode and length; on the other games a small "best" ghost under the running figure. Nothing when there is no PB
function pbShow(){ const g=GAMES[sel.game], pb=Scores.best(sel.game,sel.diff,sel.secs); const mk=$('#pbmark'), gh=$('#pbghost'); mk.classList.remove('on'); gh.classList.remove('on'); if(pb===null||VS.on||sel.vs) return;
  if(g.timed){ const k=Math.min(1,(pb/sel.secs)/(RATE_MAX[sel.game]||6)); mk.style.bottom=Math.round(k*100)+'%'; mk.classList.add('on'); }
  else { gh.textContent=T(HUD.best,{score:scoreTxt(sel.game,pb,sel.diff,sel.secs)}); gh.classList.add('on'); } }
function makeCtx(){ const id=R.id; const timers=makeTimers(()=>R.on&&R.id===id);
  return { root:$('#game'), game:sel.game, cfg:GC(sel.game,sel.diff,sel.secs), mode:sel.diff, len:sel.secs, players:sel.vs, practice:sel.practice||0, scale:sel.scale, timers, audio:Snd, rand:Math.random,
    emit(name,data){ if(R.id!==id) return; if(name==='finish') finish(data); else if(name==='live') liveCheck(data); } }; }
function start(){
  const g=GAMES[sel.game], c=GC(sel.game,sel.diff,sel.secs); $('#game').dataset.g=sel.game; $('#game').dataset.d=sel.diff;
  // two players (v10): pass & play (sel.vs 1) takes turns at a fixed length; versus (sel.vs 2) is one run at both ends. v11: Sequence and Count run both players on one screen inside their own engine; Reaction and Sequence handle versus themselves
  if(sel.vs===2&&!versusOf(sel.game,sel.diff)) sel.vs=0; const versus=sel.vs===2; const vx=isVx(); const shared=sel.vs===1&&SHARED2(sel.game,sel.diff);
  if(sel.vs===1&&!shared&&!VS.on){ VS.on=true; VS.stage=0; VS.p1=VS.p2=null; } if(VS.on) VS.stage++;
  if(VS.on&&PASS_LEN[sel.game]) sel.secs=PASS_LEN[sel.game];
  if(versus&&c.vsLens&&!c.vsLens.includes(sel.secs)) sel.secs=c.vsLens[0];
  $$('.screen').forEach(s=>s.classList.remove('on')); $('#game').classList.add('on'); $('#game').classList.remove('live','shake'); $('#stars').style.opacity=0; $('#wheelwrap').classList.remove('on'); $('#lockwrap').classList.remove('on');
  $('#game').classList.toggle('versus',vx); $('#game').classList.toggle('bigc',sel.game==='quick-tap'&&!versus);
  const who=VS.on?pWho(VS.stage-1)+' · ':''; $('#hud-mode').innerHTML=who+(MODE_NAME[sel.diff]?MODE_NAME[sel.diff]+' · ':'')+(versus?(c.vsLens?lenName(sel.game,sel.secs,sel.diff):HUD.versus):shared?HUD.pass:lenName(sel.game,sel.secs,sel.diff)); $('#score').textContent=c.lower?'0.00':'0';
  // the next unlock this run could earn, if any, sits under the HUD (v8). Not for two players. v11: a "Try to unlock" or achievement run keeps its goal up as a reminder even when nothing new can unlock
  // v13 (3.8): a "Try to unlock" run keeps the goal for the thing that was tapped — not whatever the chain would offer next
  R.goal=VS.on||sel.vs?null:((pendingGoal&&UNLOCKS.find(u=>u.key===pendingGoal))||goalFor(sel.game,sel.diff,sel.secs)); const gl=$('#goal'); gl.classList.remove('hit'); gl.classList.toggle('on',!!R.goal||(!!pendingAim&&!sel.vs)); if(R.goal){ gl.innerHTML=T(HUD.goal,{need:R.goal.need,name:unlockName(R.goal.key)}); } else if(pendingAim&&!sel.vs) gl.innerHTML=T(HUD.aim,{aim:pendingAim}); else gl.innerHTML=''; $('#bar').style.display=g.timed?'':'none'; $('#bar').style.transform='scaleX(1)';
  $('#hud-time').textContent=g.timed?sel.secs.toFixed(2):'';
  hud.reset(); applyPrefs(sel.game); $('#game').classList.toggle('timed',!!g.timed&&!versus);
  if(ctx) ctx.timers.clearT();
  R.id++; Object.assign(R,{on:true,live:false,timed:!!g.timed&&!vx,t0:0,end:0,goalHit:false,fresh:[]});
  eng=vx?VERSUS:ENGINES[sel.game]; ctx=makeCtx();
  pbShow(); setPendingAim(''); setPendingGoal(null);
  Music.start(sel.game,R,sel.secs);
  eng.mount(ctx);
  const go=()=>{ R.live=true; $('#game').classList.add('live'); if(R.timed){ R.t0=performance.now(); R.end=R.t0+sel.secs*1000; } eng.start(ctx); if(R.timed||eng.tick){ cancelAnimationFrame(R.raf); R.raf=requestAnimationFrame(tick); } };
  // versus has no first-play demo: straight to the countdown
  if(eng.noIntro){ hud.countdown(ctx.timers,Snd,go); return; }
  // first time in a mode: the ghost demo, then the countdown (v6). Sequence's keys run the scale under the 3-2-1 (v5)
  Intro.run(()=>{ if(eng.precount) eng.precount(ctx); hud.countdown(ctx.timers,Snd,go); });
}
// v11: the stale "shake" class used to replay its animation every time #game was shown again — that was the spurious wrong-answer shake at the start of runs. It comes off on every start, abort and show
function abort(){ if(!R.on) return; R.on=false; R.id++; VS.reset(); Intro.clear(); cancelAnimationFrame(R.raf); ctx.timers.clearT(); Music.stop(); eng.stop(ctx); $('#count').classList.remove('on'); $('#vwin').classList.remove('on'); $('#game').classList.remove('shake','live'); $('#seqdone')?.classList.remove('on'); $('#rxbar').innerHTML=''; show('s-pick'); }
function tick(now){
  if(!R.on) return;
  if(R.timed){ const left=Math.max(0,R.end-now); $('#hud-time').textContent=(left/1000).toFixed(2); $('#bar').style.transform=`scaleX(${left/(ctx.len*1000)})`; if(now>=R.end) return finish(eng.result(ctx)); }
  if(eng.tick) eng.tick(ctx,now);
  R.raf=requestAnimationFrame(tick);
}
// every tap reaches the engine through here. ev = { type: 'down' | 'move' | 'up' | 'act', x, y, el, target, player, raw }; t is the tap's own time
function input(ev){ if(!R.on) return; ev.t=tapTime(ev.raw); eng.input(ctx,ev); }
function finish(res){
  R.on=false; R.live=false; cancelAnimationFrame(R.raf); ctx.timers.clearT(); Music.stop(); eng.stop(ctx); Snd.end(); $('#seqdone')?.classList.remove('on');
  const run=Object.assign({ t:Date.now(), g:sel.game, d:sel.diff, s:sel.secs, n:prefs.name||'', v:RUN_SCHEMA },res||eng.result(ctx)); if(chalRun(run.g,run.d,run.s)) run.chal=1; setLastRun(run); if(!prefs.played){ prefs.played=1; save('ne.prefs',prefs); }
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
// mid-run (v10): engines emit 'live' with the run so far. Any live unlock that now passes lands at once, with a green toast; the goal line ticks
function liveCheck(part){ if(!R.on||VS.on||sel.vs===2) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0},part); const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; R.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save('ne.unlock',u);
  if(R.goal&&!R.goalHit&&(u[R.goal.key]||R.goal.test(run))){ R.goalHit=true; if(R.goal.len) toast(unlockToast(R.goal.key),'','ok'); $('#goal').classList.add('hit'); $('#goal').innerHTML=HUD.goalHit+$('#goal').innerHTML; } }
// a locked game or mode (v10): the lock box's Try to unlock — straight into the game, with the goal line up
function goWhere(w,startRun=start){ $('#lockwrap').classList.remove('on'); if(!w) return; const G_=GAMES[w.g]; sel.game=w.g; prefs.lastGame=w.g; save('ne.prefs',prefs);
  sel.diff=w.d&&isOpen(w.g,w.d)?w.d:(G_.modes.find(d=>isOpen(w.g,d))||G_.modes[0]); if(!isOpen(sel.game,sel.diff)) return askUnlock(sel.game,sel.diff);
  const lens=lensOf(w.g,sel.diff); sel.secs=w.s||(lens.includes(sel.secs)&&lenOpen(w.g,sel.diff,sel.secs)?sel.secs:lens.find(s=>lenOpen(w.g,sel.diff,s))); if(!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens[0]; sel.vs=0; sel.practice=0; VS.reset(); setPendingAim(w.need||''); setPendingGoal(w.aim||null); startRun(); }

const introActive=()=>Intro.active();
export { R, abort, active, finish, goWhere, handles, input, introActive, liveCheck, start };
