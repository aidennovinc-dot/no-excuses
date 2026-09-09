/* No Excuses — the run itself (build 17, refactor stage 3): start / tick / finish / abort, and the run state. Was app.js +
   engine-core.js. The engine is called only through the contract in ARCHITECTURE.md — mount / start / input / tick / stop /
   result, plus the optional demo (the first-play ghost) and precount (what plays under the 3-2-1) — and talks back through
   ctx.emit: 'finish' with the run record, 'live' with the run so far. Engines never see sel, prefs, the store or each other.
   Build 18 (refactor stage 4): no screen is imported here. The run tells the screens what happened through core/events.js —
   run:record, run:pass, run:finish, run:abort, lock:ask — and the result, pass and pick screens take it from there (A4).

   ctx = { root, game, cfg, mode, len, players, practice, scale, emit, timers, audio, rand } — the contract's set plus
   practice and scale, which Sequence needs and which used to be read off sel. */

import { Music, Snd } from "../audio.js";
import { RUN_SCHEMA } from "../config/build.js";
import { HUD, INTRO, TOAST } from "../config/copy.js";
import { MODE_NAME, PASS_LEN, RATE_MAX } from "../config/games.js";
import { P1C, P2C } from "../config/theme.js";
import { $, T, pWho } from "../core.js";
import { emit } from "../core/events.js";
import { VS, sel } from "../core/state.js";
import { prefs, save, store } from "../core/store.js";
import { makeTimers, tapTime } from "../core/timers.js";
import * as hud from "../games/_shared/hud.js";
import { ENGINES, GAMES, GC, SHARED2, VERSUS, lenName, versusOf } from "../games/registry.js";
import { Scores, UNLOCKS, chalRun, checkAch, checkUnlocks, goalFor, isOpen, lenOpen, lensOf, pendingAim, pendingGoal, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlocked } from "../progress.js";
import { checkKey } from "../progress/key.js";
import { scoreTxt } from "../ui/format.js";
import { game as showGame } from "../ui/router.js";
import { applyPrefs } from "../ui/theme.js";
import { toast } from "../ui/toast.js";

/* ---------- run state. `id` steps on every start and abort, so anything a dead run left behind can tell it is dead ---------- */
const R={ on:false, live:false, id:0, timed:false, t0:0, end:0, raf:0, goal:null, goalHit:false, fresh:[], tension:0 };
let eng=null, ctx=null;
const isVx=()=>sel.vs===2&&(sel.game==='quick-tap'||sel.game==='dots');
const active=()=>R.on;

// v14 (3.3): every requirement names its game (3.2), which is noise once you are inside that game — the in-run goal line takes
// the name back out, so "30 hits in any Quick Tap run" reads "30 hits in any run" while you are playing Quick Tap. The line
// scrolls between the requirement and what it unlocks (the CSS) rather than trying to fit both at once
const here=need=>{ const n=GAMES[sel.game].name; return String(need).split(n+' · ').join('').split(n+' ').join(''); };

/* ---------- first play of a mode (v6): a ghost finger plays two or three beats under a one-liner, then the countdown. Tap to skip ---------- */
const Intro=(()=>{
  let done=null, timers=null; const ghost=$('#ghost');
  function clear(){ if(timers) timers.clearT(); ghost.classList.remove('on','hold','tap'); ghost.style.transition='none'; $('#intro').classList.remove('on'); }
  return {
    run(cb){ const key=sel.game+':'+sel.diff, s=store.intro; if(s[key]) return cb(false); s[key]=Date.now(); save();
      const [line,sub]=INTRO[key]||['','']; const words=line.split(' '); $('#intro-text').innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${i*110}ms">${w}</span>`).join('')+`<small class="w" style="animation-delay:${words.length*110+150}ms">${sub}</small>`; $('#intro').classList.add('on');
      timers=makeTimers(ctx.timers.alive); const g=hud.makeGhost(Snd,timers);
      ghost.style.transition='none'; const c=g.centre($('#game')); g.at(c.x,c.y); void ghost.offsetWidth; ghost.style.transition='';
      done=()=>{ done=null; clear(); ctx.timers.clearT(); cb(true); };
      // an engine without a demo (the v7 games): the one-liner sits for 1.8s, then the countdown. A demo returns its length, or 0 when it calls done itself
      const ms=eng.demo?eng.demo(ctx,g,()=>done&&done()):1800; if(ms) timers.later(()=>done&&done(),ms); },
    active:()=>!!done, clear:()=>{ done=null; clear(); } };
})();
// the PB marker (v11): a line on the rate bar at your best pace for this mode and length; on the other games a small "best" ghost under the running figure. Nothing when there is no PB
function pbShow(){ const g=GAMES[sel.game], pb=Scores.best(sel.game,sel.diff,sel.secs); const mk=$('#pbmark'), gh=$('#pbghost'); mk.classList.remove('on'); gh.classList.remove('on'); if(pb===null||VS.on||sel.vs) return;
  if(g.timed){ const k=Math.min(1,(pb/sel.secs)/(RATE_MAX[sel.game]||6)); mk.style.bottom=Math.round(k*100)+'%'; mk.classList.add('on'); }
  else { gh.textContent=T(HUD.best,{score:scoreTxt(sel.game,pb,sel.diff,sel.secs)}); gh.classList.add('on'); } }
function makeCtx(){ const id=R.id; const timers=makeTimers(()=>R.on&&R.id===id);
  return { root:$('#game'), game:sel.game, cfg:GC(sel.game,sel.diff,sel.secs), mode:sel.diff, len:sel.secs, players:sel.vs, practice:sel.practice||0, scale:sel.scale, rateMode:prefs.rate, timers, audio:Snd, rand:Math.random,
    emit(name,data){ if(R.id!==id) return; if(name==='finish') finish(data); else if(name==='live') liveCheck(data); } }; }
function start(){
  const g=GAMES[sel.game], c=GC(sel.game,sel.diff,sel.secs); $('#game').dataset.g=sel.game; $('#game').dataset.d=sel.diff;
  // two players (v10): pass & play (sel.vs 1) takes turns at a fixed length; versus (sel.vs 2) is one run at both ends. v11: Sequence and Count run both players on one screen inside their own engine; Reaction and Sequence handle versus themselves
  if(sel.vs===2&&!versusOf(sel.game,sel.diff)) sel.vs=0; const versus=sel.vs===2; const vx=isVx(); const shared=sel.vs===1&&SHARED2(sel.game,sel.diff);
  if(sel.vs===1&&!shared&&!VS.on){ VS.on=true; VS.stage=0; VS.p1=VS.p2=null; } if(VS.on) VS.stage++;
  if(VS.on&&PASS_LEN[sel.game]) sel.secs=PASS_LEN[sel.game];
  if(versus&&c.vsLens&&!c.vsLens.includes(sel.secs)) sel.secs=c.vsLens[0];
  showGame(); $('#game').classList.remove('live','shake');   // the atmosphere fades, the wheel and the lock box close — they listen for screen:change
  $('#game').classList.toggle('versus',vx); $('#game').classList.toggle('bigc',sel.game==='quick-tap'&&!versus);
  // v14 (4.8): whose turn it is is never in doubt — a pass & play run is outlined in that player's colour
  $('#game').classList.toggle('pturn',!!VS.on); if(VS.on) $('#game').style.setProperty('--pc',VS.stage===2?P2C:P1C);
  const who=VS.on?pWho(VS.stage-1)+' · ':''; $('#hud-mode').innerHTML=who+(MODE_NAME[sel.diff]?MODE_NAME[sel.diff]+' · ':'')+(versus?(c.vsLens?lenName(sel.game,sel.secs,sel.diff,true):HUD.versus):shared?HUD.pass:lenName(sel.game,sel.secs,sel.diff)); $('#score').textContent=c.lower?'0.00':'0';
  // the next unlock this run could earn, if any, sits under the HUD (v8). Not for two players. v11: a "Try to unlock" or achievement run keeps its goal up as a reminder even when nothing new can unlock
  // v13 (3.8): a "Try to unlock" run keeps the goal for the thing that was tapped — not whatever the chain would offer next
  R.goal=VS.on||sel.vs?null:((pendingGoal&&UNLOCKS.find(u=>u.key===pendingGoal))||goalFor(sel.game,sel.diff,sel.secs)); const gl=$('#goal'); gl.classList.remove('hit'); gl.classList.toggle('roll',!!R.goal); gl.classList.toggle('on',!!R.goal||(!!pendingAim&&!sel.vs)); if(R.goal){ gl.innerHTML=T(HUD.goal,{need:here(R.goal.need),name:unlockName(R.goal.key)}); } else if(pendingAim&&!sel.vs) gl.innerHTML=T(HUD.aim,{aim:here(pendingAim)}); else gl.innerHTML='';
  // v15 (2.2): the thing being chased sits at the TOP of the screen during a run, so it is visible while playing. The HUD
  // steps down to make room only when there is a goal to show — a run with nothing to chase looks exactly as it did
  $('#game').classList.toggle('goalon',gl.classList.contains('on'));
  $('#bar').style.display=g.timed?'':'none'; $('#bar').style.transform='scaleX(1)';
  $('#hud-time').textContent=g.timed?sel.secs.toFixed(2):'';
  hud.reset(); applyPrefs(sel.game); $('#game').classList.toggle('timed',!!g.timed&&!versus);
  if(ctx) ctx.timers.clearT();
  R.id++; Object.assign(R,{on:true,live:false,timed:!!g.timed&&!vx,t0:0,end:0,goalHit:false,fresh:[],tension:0});
  eng=vx?VERSUS:ENGINES[sel.game]; ctx=makeCtx();
  pbShow(); setPendingAim(''); setPendingGoal(null);
  Music.start(sel.game,R,sel.secs);
  eng.mount(ctx);
  const go=()=>{ R.live=true; $('#game').classList.add('live'); if(R.timed){ R.t0=performance.now(); R.end=R.t0+sel.secs*1000; } eng.start(ctx); if(R.timed||eng.tick){ cancelAnimationFrame(R.raf); R.raf=requestAnimationFrame(tick); } };
  // versus has no first-play demo: straight to the countdown
  if(eng.noIntro){ hud.countdown(ctx.timers,Snd,go); return; }
  // first time in a mode: the ghost demo, then the countdown (v6). Sequence's keys run the scale under the 3-2-1 (v5)
  // v14 (6.4): the demo is over before the countdown starts. It used to leave its own round running — Estimate · Grow's target
  // was still being calculated under the 3-2-1 — so the engine is stopped and re-mounted, fresh, the moment the demo ends
  Intro.run(played=>{ if(played){ eng.stop(ctx); hud.reset(); eng.mount(ctx); } if(eng.precount) eng.precount(ctx); hud.countdown(ctx.timers,Snd,go); });
}
// v11: the stale "shake" class used to replay its animation every time #game was shown again — that was the spurious wrong-answer shake at the start of runs. It comes off on every start, abort and show
/* v15 (2.5): quitting must never cost a player something they already earned. The engine's own result() is the run so far,
   so one last live pass banks the round that has just landed — the one that may not have emitted 'live' yet — before the
   run is torn down. liveCheck writes to the store itself; this is not a toast, it is the save. */
function abort(){ if(!R.on) return;
  if(R.live&&eng&&ctx&&!VS.on&&sel.vs!==2){ try{ liveCheck(eng.result(ctx)); }catch(e){} }
  R.on=false; R.id++; VS.reset(); Intro.clear(); cancelAnimationFrame(R.raf); ctx.timers.clearT(); Music.stop(); eng.stop(ctx); $('#count').classList.remove('on'); $('#vwin').classList.remove('on'); $('#game').classList.remove('shake','live'); $('#seqdone')?.classList.remove('on'); $('#rxbar').innerHTML=''; emit('run:abort'); }
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
  const run=Object.assign({ t:Date.now(), g:sel.game, d:sel.diff, s:sel.secs, n:prefs.name||'', v:RUN_SCHEMA },res||eng.result(ctx)); if(chalRun(run.g,run.d,run.s)) run.chal=1; emit('run:record',{run}); if(!prefs.played){ prefs.played=1; save(); }
  // pass & play (v10): neither run is recorded — the board is solo. Player 1 plays, the phone is passed, the two are compared. v11: Player 1 red, Player 2 blue
  if(VS.on&&VS.stage===1){ VS.p1=run; emit('run:pass',{run}); return; }
  if(VS.on&&VS.stage===2) VS.p2=run;
  const two=!!run.vs2||VS.on;
  const isBest = run.practice||(run.fail&&!run.hits)||two ? false : Scores.submit(run);
  /* v15 (2.5): every earn is banked HERE, the moment the record exists. It used to happen inside the result screen's
     ad-break callback — so a player who closed the app on the ad, or never got that far, lost the lot. The result screen
     still SHOWS the toasts and still animates the key; it no longer decides whether any of it was written down.
     Two-player earns nothing (L10); practice and challenge runs are turned away inside the three functions themselves. */
  const fresh=two?[]:checkUnlocks(run), ach=two?[]:checkAch(run), adv=checkKey(run,two);
  // the result screen takes it from here: the header, the ad break, the unlock and achievement toasts (ui/screens/result.js)
  emit('run:finish',{run,isBest,two,fresh,ach,adv});
}
/* mid-run (v10): engines emit 'live' with the run so far. Any live unlock that now passes lands at once, with a green toast; the goal line ticks.
   v15 (2.5): ACHIEVEMENTS ride the same path now. Every row flagged live:1 in config/achievements.js is one whose test can
   only become more true as a run goes on, so checkAch(run, true) banks it to the store the instant it fires — the toast is
   the consequence, not the record. What is left for the finish is the rows a partial run cannot honestly satisfy: totals,
   averages, "no wrong taps". This is also the first pass that turns a practice or challenge-link run away mid-run rather
   than only at the end, which it should always have done. */
function liveCheck(part){ if(!R.on) return;
  // v14 (4.15): versus hands its closeness up as part of the live payload; audio.js reads it off the run state and swaps bed
  if(part&&part.vsTension!==undefined) R.tension=part.vsTension;
  if(VS.on||sel.vs===2) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0,practice:sel.practice||0},part);
  if(chalRun(run.g,run.d,run.s)) run.chal=1;
  const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!run.chal&&!run.practice&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; R.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save();
  for(const a of checkAch(run,true)) toast(T(TOAST.achievement,{name:a.name})+(a.unlocks?' · '+unlockHtml(a):''),a.id,'',true);
  if(R.goal&&!R.goalHit&&(u[R.goal.key]||R.goal.test(run))){ R.goalHit=true; if(R.goal.len) toast(unlockToast(R.goal.key),'','ok'); $('#goal').classList.add('hit'); } }
// a locked game or mode (v10): the lock box's Try to unlock — straight into the game, with the goal line up
function goWhere(w){ if(!w) return; const G_=GAMES[w.g]; sel.game=w.g; prefs.lastGame=w.g; save();
  sel.diff=w.d&&isOpen(w.g,w.d)?w.d:(G_.modes.find(d=>isOpen(w.g,d))||G_.modes[0]); if(!isOpen(sel.game,sel.diff)) return emit('lock:ask',{g:sel.game,d:sel.diff});
  const lens=lensOf(w.g,sel.diff); sel.secs=w.s||(lens.includes(sel.secs)&&lenOpen(w.g,sel.diff,sel.secs)?sel.secs:lens.find(s=>lenOpen(w.g,sel.diff,s))); if(!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens[0]; sel.vs=0; sel.practice=0; VS.reset(); setPendingAim(w.need||''); setPendingGoal(w.aim||null); start(); }

const introActive=()=>Intro.active();
export { R, abort, active, goWhere, input, introActive, liveCheck, start };
