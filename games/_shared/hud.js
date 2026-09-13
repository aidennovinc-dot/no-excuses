/* No Excuses — the run's shared HUD (build 17, refactor stage 3): the countdown, the rate bar, the score and clock
   slots, the shake and flash on a miss, and the ghost finger the first-play demos move about. The engines write to the
   shell's HUD only through here; the goal line and the PB marker stay in run/run.js because they read progress. */
import { CFG, RATE_MAX, RATE_RUN_FLOOR, TICK } from "../../config/games.js";
import { P1C, P2C } from "../../config/theme.js";
import { $ } from "../../core.js";

/* v21 (G.7, build 35): EVERY LIVE SCORE COUNTS UP AND PULSES — TICK.ms (90, guess) and interruptible, because anything longer
   smears once taps come faster than three a second. `tick` is the one writer: the number walks from what is on screen to what
   it should be through countUp, a newer tick on the same element ends the older one where it stands, and the pulse is a Web
   Animation that a newer pulse cancels. In versus it carries that player's colour (L4). Presentation only (L10): nothing
   reads the text back. `driving` is the one exception — a countUp or addUp already walking #score frame by frame writes
   straight through, or every frame would start a count and a pulse of its own. */
let driving=0;
const NUM=/^(-?\d+(?:\.(\d+))?)([^]*)$/;
function pulse(el,p){ if(!el||!el.animate) return; try{ if(el._pulse) el._pulse.cancel(); }catch(e){}
  const mid={ scale:TICK.scale, offset:.4 }; if(p===0||p===1) mid.color=p?P2C:P1C;
  try{ el._pulse=el.animate([{ scale:1 },mid,{ scale:1 }],{ duration:TICK.ms, easing:'ease-out' }); }catch(e){} }
function tick(el,text,p){ if(!el) return; const to=String(text), from=el.textContent; const id=el._tick=(el._tick||0)+1;
  if(to===from) return;
  const a=NUM.exec(from), b=NUM.exec(to);
  if(a&&b&&a[3]===b[3]){ const dec=(b[2]||'').length, rest=b[3];
    countUp({ from:+a[1], to:+b[1], ms:TICK.ms, fmt:v=>v.toFixed(dec)+rest, set:t=>{ el.textContent=t; }, alive:()=>el._tick===id }); }
  else el.textContent=to;
  pulse(el,p); }
const score=t=>{ const s=$('#score'); if(driving) s.textContent=t; else tick(s,t); };
const scoreVisible=v=>{ $('#score').style.visibility=v?'':'hidden'; };
const scorePop=()=>{ const s=$('#score'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); };
const time=t=>{ $('#hud-time').textContent=t; };
const timeHtml=h=>{ $('#hud-time').innerHTML=h; };
const you=on=>{ $('#hud-time').classList.toggle('you',!!on); };
const mode=t=>{ $('#hud-mode').textContent=t; };
// the big centred count (v10) — Quick Tap solo — pops on every hit so you never look up to the HUD
// v21 (G.7): the big count is a live score like any other — the .18s `pop` it restarted every hit is the smear G.7 names, so it ticks
const bigcount=n=>{ tick($('#bigcount'),n); };
const shake=()=>{ const g=$('#game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); };
const flash=ms=>{ const f=$('#flash'); f.style.transition='none'; f.style.opacity=.28; requestAnimationFrame(()=>{ f.style.transition=`opacity ${ms}ms ease-out`; f.style.opacity=0; }); };
// live hits per second (v9): from the gaps between the last six taps, so it moves in tenths — counting hits over two seconds could only ever show halves. It sags when you stop
// v14 (6.7): two readings, the player's choice in Customise. `since` (a run start time) switches it to the whole-run average —
// every tap over the time played so far, so at 15s it averages 15s and at 17s it averages 17s. 0 keeps the rolling reading
/* v20 (D.3a, build 35 — L5 quoted on the 2.0): the whole-run reading was `taps / seconds since the start` from the very first
   frame, so one tap at 0.16s printed 6.3/s. It HOLDS what it last showed until RATE_RUN_FLOOR seconds have been played —
   a return before anything is written, so the bar, the number and the edge glow all hold together — and then averages from
   run start exactly as before. The rolling reading below never spiked and is untouched. */
function rate(game,hitT,now,runFrom){ const t=hitT; let r=0;
  if(runFrom){ const el=(now-runFrom)/1000; if(el<RATE_RUN_FLOOR) return; r=t.length/el; }
  else if(t.length>=2){ const k=Math.min(t.length-1,6); const avg=(t[t.length-1]-t[t.length-1-k])/k; const since=now-t[t.length-1]; r=1000/Math.max(avg,since>avg?since:avg); } else if(t.length===1){ r=Math.min(1,1000/Math.max(1,now-t[0])); } const k=Math.min(1,r/(RATE_MAX[game]||6));
  $('#rate i').style.height=Math.round(k*100)+'%'; $('#rate b').textContent=r.toFixed(1)+'/s'; $('#edge').style.opacity=k>.4?((k-.4)/.6*.4).toFixed(2):0; }
// v13 (6.7 / 8.2): a Streak's round figure counts down to 0 while the running total counts up by the same amount, together, with the whoosh.
// el shows the round figure through fmt; each frame calls onFrame(total); alive() ends it early; done(total) runs at the end
// v15 (3.7): `walk` moves ONE number from where the round landed to where it should have — 120% down to 100% — over the
// same k as the total climbing. It is the round's figure arriving in the total, drawn, instead of a second "+20%" beside it
function walkStep(walk,k){ if(walk&&walk.el) walk.el.textContent=walk.fmt(walk.from+(walk.to-walk.from)*k); }
// v21 (G.7): anything a running count writes goes straight through hud.score — `driving` — so a frame never starts a tick of its own
const drive=f=>{ driving++; try{ return f(); } finally{ driving--; } };
function addUp({audio,from,err,ms,el,fmt,alive,onFrame,done,walk}){ const t0=performance.now(); audio.whoosh(ms,140,760);
  const step=now=>{ if(!alive()) return; const k=Math.min(1,(now-t0)/ms); const tot=from+err*k; if(el) el.textContent=fmt(err*(1-k)); walkStep(walk,k); drive(()=>onFrame(tot)); if(k<1) requestAnimationFrame(step); else { walkStep(walk,1); drive(()=>done(from+err)); } };
  requestAnimationFrame(step); }
// v14 (6.1): EVERY addition to a running total is animated, in a Set as well as a Streak — the figure walks from its old value
// to its new one instead of jumping. set(text) writes it wherever it lives; alive() ends it early; done() runs at the end
function countUp({audio,from,to,ms=650,fmt,set,alive,done,walk}){ const t0=performance.now(); if(audio) audio.whoosh(ms,140,700);
  const step=now=>{ if(alive&&!alive()) return; const k=Math.min(1,(now-t0)/ms); drive(()=>set(fmt(from+(to-from)*k))); walkStep(walk,k); if(k<1) requestAnimationFrame(step); else { drive(()=>set(fmt(to))); walkStep(walk,1); done&&done(); } };
  requestAnimationFrame(step); }
// v14 (6.3): a round's result stays up until it is tapped — no auto-advance. The engines turn the cue on when the card is
// drawn and off when the tap arrives; #game.tapon is the one thing the gate has to look for to drive any game to its result
function hold(on){ $('#game').classList.toggle('tapon',!!on); $('#tapon').classList.toggle('on',!!on); }
// the cue (v11, Sequence's): a short line on a contrasting backing. `stay` keeps it up; otherwise it pops and fades.
// v15 (§4, build 25): shared, because every turn-taking pass & play hands the phone over with the same card
function cue(html,stay,p){ const t=$('#turn'); t.classList.remove('on','stay','p1','p2'); void t.offsetWidth; t.innerHTML=html||''; if(!html) return; if(p!==undefined) t.classList.add(p?'p2':'p1'); t.classList.add(stay?'stay':'on'); }
// v14 (4.8) / v15 (§4): whose turn it is is never in doubt — the run is outlined in that player's colour. It was set once
// by run/run.js for a Quick Tap or Dots hand-over; the games that alternate INSIDE one run move it every turn
function pturn(p){ const g=$('#game'); g.classList.toggle('pturn',p!==null&&p!==undefined); if(p===null||p===undefined) return; g.style.setProperty('--pc',p?P2C:P1C); }
// 3-2-1, then go. The steps ride the run's timers, so an abort mid-count stops it
function countdown(timers,audio,cb){ const c=$('#count'); let n=3; c.classList.add('on');
  const step=()=>{ if(n>0){ c.innerHTML=`<span>${n}</span>`; audio.tick(); n--; timers.later(step,CFG.countStep); } else { c.classList.remove('on'); c.innerHTML=''; audio.go(); cb(); } };
  step(); }
// what every start clears in the shell: the slots the engines share and whatever the last run left in them
function reset(){ $('#bigcount').textContent='0'; $('#score').style.visibility=''; $('#gen').innerHTML=''; $('#rxbar').innerHTML=''; $('#hud-time').classList.remove('you'); $('#seq').classList.remove('watch','input'); $('#turn').classList.remove('on','stay','p1','p2'); $('#rate i').style.height='0'; $('#rate b').textContent='0.0/s'; $('#edge').style.opacity=0; hold(false); }
// the ghost finger (v6): the first-play demo moves it, taps with it, holds with it. `later` is the demo's own timer set
function makeGhost(audio,timers){ const ghost=$('#ghost');
  const at=(x,y)=>{ ghost.style.transform=`translate(${x}px,${y}px)`; };
  const centre=el=>{ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; };
  return { at, centre, later:timers.later,
    show(){ ghost.classList.add('on'); },
    move(el){ const c=centre(el); at(c.x,c.y); ghost.classList.add('on'); },
    tap(){ ghost.classList.remove('tap'); void ghost.offsetWidth; ghost.classList.add('tap'); audio.hit(); },
    hold(on){ ghost.classList.toggle('hold',!!on); } }; }

export { addUp, bigcount, countUp, countdown, cue, flash, hold, makeGhost, mode, pturn, pulse, rate, reset, scorePop, score, scoreVisible, shake, tick, time, timeHtml, you };
