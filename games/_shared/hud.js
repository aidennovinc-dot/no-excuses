/* No Excuses — the run's shared HUD (build 17, refactor stage 3): the countdown, the rate bar, the score and clock
   slots, the shake and flash on a miss, and the ghost finger the first-play demos move about. The engines write to the
   shell's HUD only through here; the goal line and the PB marker stay in run/run.js because they read progress. */
import { CFG, RATE_MAX } from "../../config/games.js";
import { $ } from "../../core.js";

const score=t=>{ $('#score').textContent=t; };
const scoreVisible=v=>{ $('#score').style.visibility=v?'':'hidden'; };
const scorePop=()=>{ const s=$('#score'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); };
const time=t=>{ $('#hud-time').textContent=t; };
const timeHtml=h=>{ $('#hud-time').innerHTML=h; };
const you=on=>{ $('#hud-time').classList.toggle('you',!!on); };
const mode=t=>{ $('#hud-mode').textContent=t; };
// the big centred count (v10) — Quick Tap solo — pops on every hit so you never look up to the HUD
const bigcount=n=>{ const bc=$('#bigcount'); bc.textContent=n; bc.classList.remove('pop'); void bc.offsetWidth; bc.classList.add('pop'); };
const shake=()=>{ const g=$('#game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); };
const flash=ms=>{ const f=$('#flash'); f.style.transition='none'; f.style.opacity=.28; requestAnimationFrame(()=>{ f.style.transition=`opacity ${ms}ms ease-out`; f.style.opacity=0; }); };
// live hits per second (v9): from the gaps between the last six taps, so it moves in tenths — counting hits over two seconds could only ever show halves. It sags when you stop
function rate(game,hitT,now){ const t=hitT; let r=0; if(t.length>=2){ const k=Math.min(t.length-1,6); const avg=(t[t.length-1]-t[t.length-1-k])/k; const since=now-t[t.length-1]; r=1000/Math.max(avg,since>avg?since:avg); } else if(t.length===1){ r=Math.min(1,1000/Math.max(1,now-t[0])); } const k=Math.min(1,r/(RATE_MAX[game]||6));
  $('#rate i').style.height=Math.round(k*100)+'%'; $('#rate b').textContent=r.toFixed(1)+'/s'; $('#edge').style.opacity=k>.4?((k-.4)/.6*.4).toFixed(2):0; }
// v13 (6.7 / 8.2): a Streak's round figure counts down to 0 while the running total counts up by the same amount, together, with the whoosh.
// el shows the round figure through fmt; each frame calls onFrame(total); alive() ends it early; done(total) runs at the end
function addUp({audio,from,err,ms,el,fmt,alive,onFrame,done}){ const t0=performance.now(); audio.whoosh(ms,140,760);
  const step=now=>{ if(!alive()) return; const k=Math.min(1,(now-t0)/ms); const tot=from+err*k; if(el) el.textContent=fmt(err*(1-k)); onFrame(tot); if(k<1) requestAnimationFrame(step); else done(from+err); };
  requestAnimationFrame(step); }
// 3-2-1, then go. The steps ride the run's timers, so an abort mid-count stops it
function countdown(timers,audio,cb){ const c=$('#count'); let n=3; c.classList.add('on');
  const step=()=>{ if(n>0){ c.innerHTML=`<span>${n}</span>`; audio.tick(); n--; timers.later(step,CFG.countStep); } else { c.classList.remove('on'); c.innerHTML=''; audio.go(); cb(); } };
  step(); }
// what every start clears in the shell: the slots the engines share and whatever the last run left in them
function reset(){ $('#bigcount').textContent='0'; $('#score').style.visibility=''; $('#gen').innerHTML=''; $('#rxbar').innerHTML=''; $('#hud-time').classList.remove('you'); $('#seq').classList.remove('watch','input'); $('#turn').classList.remove('on','stay','p1','p2'); $('#rate i').style.height='0'; $('#rate b').textContent='0.0/s'; $('#edge').style.opacity=0; }
// the ghost finger (v6): the first-play demo moves it, taps with it, holds with it. `later` is the demo's own timer set
function makeGhost(audio,timers){ const ghost=$('#ghost');
  const at=(x,y)=>{ ghost.style.transform=`translate(${x}px,${y}px)`; };
  const centre=el=>{ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; };
  return { at, centre, later:timers.later,
    show(){ ghost.classList.add('on'); },
    move(el){ const c=centre(el); at(c.x,c.y); ghost.classList.add('on'); },
    tap(){ ghost.classList.remove('tap'); void ghost.offsetWidth; ghost.classList.add('tap'); audio.hit(); },
    hold(on){ ghost.classList.toggle('hold',!!on); } }; }

export { addUp, bigcount, countdown, flash, makeGhost, mode, rate, reset, scorePop, score, scoreVisible, shake, time, timeHtml, you };
