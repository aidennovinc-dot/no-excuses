/* No Excuses — the run itself (build 17, refactor stage 3): start / tick / finish / abort, and the run state. Was app.js +
   engine-core.js. The engine is called only through the contract in ARCHITECTURE.md — mount / start / input / tick / stop /
   result, plus the optional demo (the first-play ghost) and precount (what plays under the 3-2-1) — and talks back through
   ctx.emit: 'finish' with the run record, 'live' with the run so far. Engines never see sel, prefs, the store or each other.
   Build 18 (refactor stage 4): no screen is imported here. The run tells the screens what happened through core/events.js —
   run:record, run:pass, run:finish, run:abort, lock:ask — and the result, pass and pick screens take it from there (A4).

   ctx = { root, game, cfg, mode, len, players, practice, scale, emit, timers, audio, rand } — the contract's set plus
   practice and scale, which Sequence needs and which used to be read off sel. */

import { Music, Snd } from "../audio.js";
import { FLOW_AT, FLOW_FALL, FLOW_RISE } from "../config/audio.js";
import { RUN_SCHEMA } from "../config/build.js";
import { HUD, INTRO, INTRO_READY, TOAST } from "../config/copy.js";
import { MODE_NAME, PASS_LEN, PASS_TURNS, RATE_MAX } from "../config/games.js";
import { P1C, P2C } from "../config/theme.js";
import { $, T, pWho } from "../core.js";
import { emit } from "../core/events.js";
import { VS, sel } from "../core/state.js";
import { prefs, save, store } from "../core/store.js";
import { makeTimers, tapTime } from "../core/timers.js";
import * as hud from "../games/_shared/hud.js";
import { ENGINES, GAMES, GC, SHARED2, VERSUS, lenName, versusOf } from "../games/registry.js";
import { Scores, UNLOCKS, bankLen, chalRun, checkAch, checkUnlocks, goalFor, isOpen, lenNextLive, lenNextOf, lenOpen, lensOf, pendingAim, pendingGoal, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlocked } from "../progress.js";
import { checkKey } from "../progress/key.js";
import { scoreTxt } from "../ui/format.js";
import { game as showGame } from "../ui/router.js";
import { applyPrefs } from "../ui/theme.js";
import { toast } from "../ui/toast.js";

/* ---------- run state. `id` steps on every start and abort, so anything a dead run left behind can tell it is dead ---------- */
/* v16 (1.4 / 1.5): `fin` is 0..1, how far into the finish the run is, and `vsP` is each player's proximity to winning.
   Both are read by audio.js and by nothing else — A.1 is explicit that the ramp is music only and no gameplay speeds up. */
/* v17 (B.4): `demo` is true for exactly as long as the first-play ghost is driving the engine, and it is the same shape
   as L10's two-player rule — turned away MID-RUN in liveCheck and again at the finish. It had to exist: Estimate · Grow's
   demo plays a real round on the real engine and emits 'live' out of its reveal, so the ghost's own guess banked Aiden an
   achievement ("On the money" is live:1 and tests one round within 2%). A ghost is not the player. */
/* v17 (B.27) / v18 (B.9): `flow` is 0..1, the flow state — whether this run is at or past FLOW_AT taps a second,
   smoothed here so the hum and the edge glow are reading one number rather than two that drift apart. It is a SWITCH
   with a fade on it since build 31, not a measure of how far past the line you are. `flowOn` is solo Quick Tap and Dots only:
   the glow is light blue, which is Player 2 (L4), so it can never appear in a two-player run. Presentation only (L10). */
const R={ on:false, live:false, id:0, timed:false, t0:0, end:0, raf:0, goal:null, goalHit:false, fresh:[], lenNext:null, lenDone:false, demo:false, tension:0, fin:0, vsP:[0,0], flow:0, flowOn:false, flowT:0 };
let eng=null, ctx=null;
const isVx=()=>sel.vs===2&&(sel.game==='quick-tap'||sel.game==='dots');
const active=()=>R.on;

// v14 (3.3): every requirement names its game (3.2), which is noise once you are inside that game — the in-run goal line takes
// the name back out, so "30 hits in any Quick Tap run" reads "30 hits in any run" while you are playing Quick Tap. The line
// scrolls between the requirement and what it unlocks (the CSS) rather than trying to fit both at once
const here=need=>{ const n=GAMES[sel.game].name; return String(need).split(n+' · ').join('').split(n+' ').join(''); };

/* ---------- first play of a mode (v6): a ghost finger plays two or three beats under a one-liner, then the countdown. Tap to skip ---------- */
/* v16 (§5 / A.3) — REBUILT. It was the line, a dimmer sub-line under it, both revealed a word at a time. Aiden's note
   was that a first-play intro carries too much; A.3 settles which half goes. Now: the TITLE LINE ALONE, arriving as one
   line rather than word by word, and on a player's FIRST RUN OF EACH GAME it ends with a "Ready?" the player taps instead
   of being dropped into the 3-2-1. Later modes of that same game keep their one-liner and no Ready.
   `store.intro` keys the per-mode intro on 'game:mode' as it always has; the bare game id beside it is the Ready gate,
   so a v1 record carrying neither reads as a brand-new profile, which is what it is. */
const Intro=(()=>{
  let done=null, timers=null, ready=false; const ghost=$('#ghost');
  function clear(){ ready=false; if(timers) timers.clearT(); ghost.classList.remove('on','hold','tap'); ghost.style.transition='none'; $('#intro').classList.remove('on','ready'); }
  return {
    run(cb){ const key=sel.game+':'+sel.diff, s=store.intro; if(s[key]) return cb(false);
      const firstGame=!s[sel.game]; s[key]=Date.now(); s[sel.game]=s[sel.game]||Date.now(); save();
      const [line]=INTRO[key]||['']; $('#intro-text').innerHTML=line+'<b class="rdy">'+INTRO_READY.ready+'<small>'+INTRO_READY.tap+'</small></b>'; $('#intro').classList.add('on');
      timers=makeTimers(ctx.timers.alive); const g=hud.makeGhost(Snd,timers);
      ghost.style.transition='none'; const c=g.centre($('#game')); g.at(c.x,c.y); void ghost.offsetWidth; ghost.style.transition='';
      // v17 (B.4): from here until the intro hands over, nothing the engine does belongs to the player
      R.demo=true;
      done=()=>{ done=null; R.demo=false; clear(); ctx.timers.clearT(); cb(true); };
      // the first game of all: the demo plays and then the screen WAITS. Everywhere else it runs straight on, as before
      const end=()=>{ if(!done) return; if(!firstGame) return done(); ready=true; $('#intro').classList.add('ready'); };
      // an engine without a demo (the v7 games): the one-liner sits for 1.8s, then the countdown. A demo returns its length, or 0 when it calls done itself
      const ms=eng.demo?eng.demo(ctx,g,end):1800; if(ms) timers.later(end,ms); },
    // the tap that answers "Ready?". run/input.js swallows every tap on the game layer while an intro is up and hands it here
    tap(){ if(!ready||!done) return false; ready=false; Snd.click(); done(); return true; },
    active:()=>!!done, clear:()=>{ done=null; R.demo=false; clear(); } };
})();
// the PB marker (v11): a line on the rate bar at your best pace for this mode and length; on the other games a small "best" ghost under the running figure. Nothing when there is no PB
function pbShow(){ const g=GAMES[sel.game], pb=Scores.best(sel.game,sel.diff,sel.secs); const mk=$('#pbmark'), gh=$('#pbghost'); mk.classList.remove('on'); gh.classList.remove('on'); if(pb===null||VS.on||sel.vs) return;
  if(g.timed){ const k=Math.min(1,(pb/sel.secs)/(RATE_MAX[sel.game]||6)); mk.style.bottom=Math.round(k*100)+'%'; mk.classList.add('on'); }
  else { gh.textContent=T(HUD.best,{score:scoreTxt(sel.game,pb,sel.diff,sel.secs)}); gh.classList.add('on'); } }
function makeCtx(){ const id=R.id; const timers=makeTimers(()=>R.on&&R.id===id);
  // v15 (4.5): `opens` joins practice and scale as a Sequence-only extra on the contract's set — how many notes a versus starts on
  return { root:$('#game'), game:sel.game, cfg:GC(sel.game,sel.diff,sel.secs), mode:sel.diff, len:sel.secs, players:sel.vs, practice:sel.practice||0, opens:sel.opens||3, scale:sel.scale, rateMode:prefs.rate, timers, audio:Snd, rand:Math.random,
    /* v16 (1.5): a round-based engine says how far into its finish it is — the final round of a Set, a Streak budget past
       80% — and the music reads it. A timed run needs nothing here: the clock already tells audio.js. MUSIC ONLY (A.1). */
    emit(name,data){ if(R.id!==id) return; if(name==='finish') finish(data); else if(name==='live'){ if(eng&&eng.fin) R.fin=Math.max(0,Math.min(1,eng.fin()||0)); liveCheck(data); } } }; }
function start(){
  const g=GAMES[sel.game]; let c=GC(sel.game,sel.diff,sel.secs); $('#game').dataset.g=sel.game; $('#game').dataset.d=sel.diff;
  // two players (v10): pass & play (sel.vs 1) takes turns at a fixed length; versus (sel.vs 2) is one run at both ends. v11: Sequence and Count run both players on one screen inside their own engine; Reaction and Sequence handle versus themselves
  if(sel.vs===2&&!versusOf(sel.game,sel.diff)) sel.vs=0; const versus=sel.vs===2; const vx=isVx(); const shared=sel.vs===1&&SHARED2(sel.game,sel.diff);
  if(sel.vs===1&&!shared&&!VS.on){ VS.on=true; VS.stage=0; VS.p1=VS.p2=null; } if(VS.on) VS.stage++;
  if(VS.on&&PASS_LEN[sel.game]) sel.secs=PASS_LEN[sel.game];
  if(versus&&c.vsLens&&!c.vsLens.includes(sel.secs)) sel.secs=c.vsLens[0];
  /* v15 (§4, build 25): a turn-taking pass & play run is a fixed number of turns each (PASS_TURNS), so whatever Set or
     Streak the sheet was left on is not what it plays — and a Streak's budget would end the run in the middle of one
     player's turn. The Set length is what a turn is measured in, so that is what the run gets. Sequence has no row: its
     pass & play grows a note a round and ends when somebody misses, and its length is the key count, not a round count */
  if(shared&&PASS_TURNS[sel.game+':'+sel.diff]) sel.secs=GC(sel.game,sel.diff).lens[0];
  c=GC(sel.game,sel.diff,sel.secs);
  showGame(); $('#game').classList.remove('live','shake');   // the atmosphere fades, the wheel and the lock box close — they listen for screen:change
  $('#game').classList.toggle('versus',vx); $('#game').classList.toggle('bigc',sel.game==='quick-tap'&&!versus);
  // v14 (4.8): whose turn it is is never in doubt — a pass & play run is outlined in that player's colour
  $('#game').classList.toggle('pturn',!!VS.on); if(VS.on) $('#game').style.setProperty('--pc',VS.stage===2?P2C:P1C);
  const who=VS.on?pWho(VS.stage-1)+' · ':''; $('#hud-mode').innerHTML=who+(MODE_NAME[sel.diff]?MODE_NAME[sel.diff]+' · ':'')+(versus?(c.vsLens?lenName(sel.game,sel.secs,sel.diff,true):HUD.versus):shared?HUD.pass:lenName(sel.game,sel.secs,sel.diff)); $('#score').textContent=c.lower?'0.00':'0';
  // the next unlock this run could earn, if any, sits under the HUD (v8). Not for two players. v11: a "Try to unlock" or achievement run keeps its goal up as a reminder even when nothing new can unlock
  // v13 (3.8): a "Try to unlock" run keeps the goal for the thing that was tapped — not whatever the chain would offer next
  /* v15 (5.2, build 26): an aim the player ASKED for outranks the chain's automatic offer. goalFor() is what the game
     would have suggested on its own; pendingAim is a row somebody tapped to come here — a clearance bar from the key
     screen, or the achievement the Next card carried (2.2). It used to lose to goalFor whenever that combination also
     had an unearned unlock sitting on it, so "pin it as a running goal" quietly showed something else. An explicit
     pendingGoal still wins over both, because that is a tapped unlock with a live test behind it. */
  R.goal=VS.on||sel.vs?null:((pendingGoal&&UNLOCKS.find(u=>u.key===pendingGoal))||(pendingAim?null:goalFor(sel.game,sel.diff,sel.secs))); const gl=$('#goal'); gl.classList.remove('hit'); gl.classList.toggle('roll',!!R.goal); gl.classList.toggle('on',!!R.goal||(!!pendingAim&&!sel.vs)); if(R.goal){ gl.innerHTML=T(HUD.goal,{need:here(R.goal.need),name:unlockName(R.goal.key)}); } else if(pendingAim&&!sel.vs) gl.innerHTML=T(HUD.aim,{aim:here(pendingAim)}); else gl.innerHTML='';
  // v15 (2.2): the thing being chased sits at the TOP of the screen during a run, so it is visible while playing. The HUD
  // steps down to make room only when there is a goal to show — a run with nothing to chase looks exactly as it did
  $('#game').classList.toggle('goalon',gl.classList.contains('on'));
  $('#bar').style.display=g.timed?'':'none'; $('#bar').style.transform='scaleX(1)';
  $('#hud-time').textContent=g.timed?sel.secs.toFixed(2):'';
  hud.reset(); applyPrefs(sel.game); $('#game').classList.toggle('timed',!!g.timed&&!versus);
  if(ctx) ctx.timers.clearT();
  R.id++; Object.assign(R,{on:true,live:false,timed:!!g.timed&&!vx,t0:0,end:0,goalHit:false,fresh:[],lenNext:null,lenDone:false,demo:false,tension:0,fin:0,vsP:[0,0],flow:0,flowT:0,
    flowOn:!VS.on&&!sel.vs&&(sel.game==='quick-tap'||sel.game==='dots')});
  $('#game').classList.remove('flowon'); $('#game').style.setProperty('--flow','0');
  /* v17 (B.5, L6): the next length this run could open, and the test that says so. It is computed ONCE per run because a
     length unlock has no store entry to read back — the state is derived from run history (L6 / 1.0b) — so mid-run there
     is nothing to ask except "does this run pass the rung". Null for two-player, a practice or challenge run, and for the
     rows whose rule is the default "finish one run of the length before", which cannot be true until the run has ended. */
  R.lenNext=(VS.on||sel.vs)?null:lenNextLive(sel.game,sel.diff,sel.secs);
  eng=vx?VERSUS:ENGINES[sel.game]; ctx=makeCtx();
  pbShow(); setPendingAim(''); setPendingGoal(null);
  Music.start(sel.game,R,sel.secs,sel.diff);
  eng.mount(ctx);
  const go=()=>{ R.live=true; $('#game').classList.add('live'); if(R.timed){ R.t0=performance.now(); R.end=R.t0+sel.secs*1000; } eng.start(ctx); if(R.timed||eng.tick){ cancelAnimationFrame(R.raf); R.raf=requestAnimationFrame(tick); } };
  // versus has no first-play demo: straight to the countdown
  if(eng.noIntro){ hud.countdown(ctx.timers,Snd,go); return; }
  /* v15 (§4, build 25): NO two-player run gets the ghost demo either. It is a first-play teaching moment for one player,
     and it actively breaks a shared pass & play: Estimate's demo drives its own round and waits for the engine to reach
     `wait`, which never happens when the first thing the run does is put up a hand-over card and wait for a tap — the run
     would sit there forever. The mode stays unseen, so the demo plays the first time somebody meets it on their own. */
  if(sel.vs){ if(eng.precount) eng.precount(ctx); hud.countdown(ctx.timers,Snd,go); return; }
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
  if(R.live&&eng&&ctx&&!VS.on&&!sel.vs){ try{ liveCheck(eng.result(ctx)); }catch(e){} }
  R.on=false; R.id++; VS.reset(); Intro.clear(); cancelAnimationFrame(R.raf); ctx.timers.clearT(); Music.stop(); eng.stop(ctx); $('#count').classList.remove('on'); $('#vwin').classList.remove('on'); $('#game').classList.remove('shake','live','flowon'); $('#seqdone')?.classList.remove('on'); $('#rxbar').innerHTML=''; emit('run:abort'); }
function tick(now){
  if(!R.on) return;
  if(R.flowOn) flowTick(now);
  if(R.timed){ const left=Math.max(0,R.end-now); $('#hud-time').textContent=(left/1000).toFixed(2); $('#bar').style.transform=`scaleX(${left/(ctx.len*1000)})`; if(now>=R.end) return finish(eng.result(ctx)); }
  if(eng.tick) eng.tick(ctx,now);
  R.raf=requestAnimationFrame(tick);
}
/* v17 (B.27): FLOW STATE. The engine answers `tps()` — its own taps a second over the last moment — the same way a
   round-based engine answers `fin()`, and this is the only place that number is smoothed: it rises over FLOW_RISE and
   falls over FLOW_FALL, so it arrives and leaves at the pace Aiden asked for rather than flickering on every tap. Two
   things read the result and nothing else does — audio.js swells the hum with it, and the stylesheet draws the edge
   glow from `--flow`. Nothing about the run changes: L10 is untouched, and a demo never reaches here because `flowOn`
   is off in the two-player cases and the ghost cannot tap fast enough to matter in the one it is not. */
function flowTick(now){ const tps=eng&&eng.tps?eng.tps(now):0;
  // v18 (B.9): ONE sound, on or off. `want` is a switch now, not a slope — FLOW_RISE and FLOW_FALL below turn it into
  // a fade rather than a cut, and nothing about the hum changes with how far past the line the player is
  const want=tps>=FLOW_AT?1:0;
  const dt=R.flowT?Math.min(.25,(now-R.flowT)/1000):0; R.flowT=now;
  R.flow+=(want-R.flow)*(1-Math.exp(-dt/(want>R.flow?FLOW_RISE:FLOW_FALL)));
  const g=$('#game'); g.style.setProperty('--flow',R.flow.toFixed(3)); g.classList.toggle('flowon',R.flow>.02); }
// every tap reaches the engine through here. ev = { type: 'down' | 'move' | 'up' | 'act', x, y, el, target, player, raw }; t is the tap's own time
function input(ev){ if(!R.on) return; ev.t=tapTime(ev.raw); eng.input(ctx,ev); }
function finish(res){
  R.on=false; R.live=false; R.flow=0; cancelAnimationFrame(R.raf); ctx.timers.clearT(); Music.stop(); eng.stop(ctx); Snd.end(); $('#seqdone')?.classList.remove('on'); $('#game').classList.remove('flowon');
  const run=Object.assign({ t:Date.now(), g:sel.game, d:sel.diff, s:sel.secs, n:prefs.name||'', v:RUN_SCHEMA },res||eng.result(ctx)); if(chalRun(run.g,run.d,run.s)) run.chal=1; emit('run:record',{run}); if(!prefs.played){ prefs.played=1; save(); }
  // pass & play (v10): neither run is recorded — the board is solo. Player 1 plays, the phone is passed, the two are compared. v11: Player 1 red, Player 2 blue
  if(VS.on&&VS.stage===1){ VS.p1=run; emit('run:pass',{run}); return; }
  if(VS.on&&VS.stage===2) VS.p2=run;
  const two=!!run.vs2||VS.on;
  // v17 (B.4): a demo run is not a run. It never reaches a board, a key, an unlock, an achievement or the record itself
  if(R.demo) run.demo=1;
  /* v17 (B.5, L6): which length this combination could open, asked BEFORE the record goes in. Length state is derived from
     run history, so the only honest test of "it opened" is locked here and open again four lines down */
  const lenWas = two||run.demo ? null : lenNextOf(run.g,run.d,run.s);
  const isBest = run.practice||run.demo||(run.fail&&!run.hits)||two ? false : Scores.submit(run);
  // v18 (B.8): banked the same way, so the finish agrees with the store as well as with the derivation
  const freshLen = lenWas && lenOpen(run.g,run.d,lenWas.s) ? [{ key:lenWas.key, len:1 }] : [];
  for(const f of freshLen) bankLen(f.key);
  /* v15 (2.5): every earn is banked HERE, the moment the record exists. It used to happen inside the result screen's
     ad-break callback — so a player who closed the app on the ad, or never got that far, lost the lot. The result screen
     still SHOWS the toasts and still animates the key; it no longer decides whether any of it was written down.
     Two-player earns nothing (L10); practice and challenge runs are turned away inside the three functions themselves. */
  const fresh=(two?[]:checkUnlocks(run)).concat(freshLen), ach=two?[]:checkAch(run), adv=checkKey(run,two);
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
  // v16 (1.4): each player's own proximity to the win condition, for their music stem. It is read ABOVE the two-player
  // return below on purpose — it is the one thing about a versus run that has to cross that line, and it is presentation
  if(part&&part.vsP) R.vsP=part.vsP;
  /* v15 (A.3, build 25): ANY two-player run, not only versus. It used to test sel.vs===2, which was right while the only
     shared pass & play runs were Sequence and Count and neither emitted 'live' — §4 gives five more games a shared run,
     and A.3 is explicit that no two-player run of any kind advances an unlock or an achievement. The finish already
     turned them away (`two`); this is the mid-run half of the same rule */
  /* v17 (B.4): the first-play ghost drives the real engine through the real ctx, so every emit it makes lands here.
     Estimate · Grow's demo plays a whole round and its reveal emits 'live' — which is how a ghost's guess earned Aiden
     "On the money". Same shape as the two-player return above: nothing the player did not do reaches the store. */
  if(VS.on||sel.vs||R.demo) return; const run=Object.assign({g:sel.game,d:sel.diff,s:sel.secs,hits:0,misses:0,x:999,y:0,practice:sel.practice||0},part);
  if(chalRun(run.g,run.d,run.s)) run.chal=1;
  const u=unlocked(); let ch=false;
  for(const x of UNLOCKS){ if(x.live&&!run.chal&&!run.practice&&!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); ch=true; R.fresh.push(x.key); toast(unlockToast(x.key),'','ok'); } }
  if(ch) save();
  /* v17 (B.5, L6): a LENGTH unlock announces the moment it is met, in every game, whether or not it is this run's goal
     line — that accident was the only announcement it ever had. There is nothing to bank: length state is derived from run
     history and lands when the record does (1.0b). R.lenDone is what keeps it to one toast a run. */
  /* v18 (B.8): and it is BANKED, not merely announced. It used to be an announcement with nothing behind it — length
     state is derived from run history, and a quit run is never submitted, so a player who was told "Unlock: Streak" and
     then quit found it locked. bankLen writes the three-part key the toast names; lenLock reads it back. */
  if(R.lenNext&&!R.lenDone&&!run.chal&&!run.practice&&R.lenNext.test(run)){ R.lenDone=true; R.fresh.push(R.lenNext.key); bankLen(R.lenNext.key); toast(unlockToast(R.lenNext.key),'','ok'); }
  for(const a of checkAch(run,true)) toast(T(TOAST.achievement,{name:a.name})+(a.unlocks?' · '+unlockHtml(a):''),a.id,'',true);
  /* v17 (B.5): the goal line no longer raises its own toast. It used to be the ONLY place a length unlock announced, and
     it announced two different wrong things: a duplicate whenever the pass above had already said it, and — on a length
     whose rule is the default "finish one run of the length before" — an immediate "Unlock: Marathon" on the first live
     tick of the run, because goalFor's test for a rule-less rung is a bare `true`. A default rung has no mid-run answer,
     so the line ticks green only when R.lenDone says a real test passed. The announcement is one pass, above. */
  if(R.goal&&!R.goalHit&&(R.goal.len?R.lenDone:(u[R.goal.key]||R.goal.test(run)))){ R.goalHit=true; $('#goal').classList.add('hit'); } }
// a locked game or mode (v10): the lock box's Try to unlock — straight into the game, with the goal line up
function goWhere(w){ if(!w) return; const G_=GAMES[w.g]; sel.game=w.g; prefs.lastGame=w.g; save();
  sel.diff=w.d&&isOpen(w.g,w.d)?w.d:(G_.modes.find(d=>isOpen(w.g,d))||G_.modes[0]); if(!isOpen(sel.game,sel.diff)) return emit('lock:ask',{g:sel.game,d:sel.diff});
  const lens=lensOf(w.g,sel.diff); sel.secs=w.s||(lens.includes(sel.secs)&&lenOpen(w.g,sel.diff,sel.secs)?sel.secs:lens.find(s=>lenOpen(w.g,sel.diff,s))); if(!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens[0]; sel.vs=0; sel.practice=0; VS.reset(); setPendingAim(w.need||''); setPendingGoal(w.aim||null); start(); }

const introActive=()=>Intro.active();
const introTap=()=>Intro.tap();
export { R, abort, active, goWhere, input, introActive, introTap, liveCheck, start };
