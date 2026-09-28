/* No Excuses — THE FIRST-RUN WALKTHROUGH (build 62, 61.3). Not a screen: a yellow ring round one thing and a short box beside it,
   laid over whatever screen is up, the way ui/welcome.js lays its ceremony over the result screen.

   FIVE STEPS, then ONE TIP. The steps walk a brand-new player from the games map to their first Go: the list, the first game (which they
   must tap themselves), the modes, the friend option, Go. The tip comes after their first result and points at a locked mode: tapping it
   opens the lock box, which already says what unlocks it (every locked tile, mode and length does, on tap).

   NOTHING IS BLOCKED. The ring and the dim are pointer-events:none and only the box takes taps, so a player who ignores it can still play,
   and a step that needs a tap on the game itself simply waits for one. Skip is on every step and ends it for good.

   `prefs.tut`: absent / 0 — not shown (and shown only to a profile with no runs, so nobody mid-game meets it after the update); -1 — asked
   for again from Customise; 1 — walkthrough finished, the tip still to come; 2 — done. A preference: Fresh game keeps it. */
import { TUTORIAL } from "../config/copy.js";
import { $ } from "../core.js";
import { on } from "../core/events.js";
import { prefs, save, store } from "../core/store.js";
import { define } from "./actions.js";
import { show } from "./router.js";

let step=0, host=null, timer=0, overAt=0, tipOn=false;
// build 64: a profile that has played (`prefs.played`, cleared only by Fresh game) is not new either — the walkthrough now holds every tap, so it must never reach one
const wanted=()=>prefs.tut===-1||(!prefs.tut&&!prefs.played&&!(store.runs||[]).length);
// a fixed element has no offsetParent, so "on screen" is: not hidden, laid out, and not made invisible
const vis=el=>!!el&&!el.hidden&&el.getClientRects().length>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
const onScreen=id=>{ const s=$('#'+id); return !!s&&s.classList.contains('on'); };
const sheetUp=()=>vis($('#sheet'));
// the map's first open is drawn out over ~7s; the walkthrough waits for it. A chest that breathes forever is not "the intro"
const mapSettled=()=>!$('#grid').getAnimations({subtree:true}).some(a=>{ try{ return a.playState==='running'&&a.effect.getComputedTiming().iterations!==Infinity; }catch(e){ return false; } });

/* each step: where it lives, what it rings, and whether a Next button moves it on (a step without one waits for the player) */
const STEPS=[
  { ok:()=>onScreen('s-pick')&&!sheetUp()&&mapSettled(), el:()=>$('#grid'), text:0, next:1 },
  { ok:()=>onScreen('s-pick')&&!sheetUp()&&mapSettled(), el:()=>$('#grid .tile[data-game="quick-tap"]'), text:1 },
  { ok:()=>onScreen('s-pick')&&sheetUp(), el:()=>vis($('#time-row'))?$('#time-row'):$('#diff-row'), text:2, next:1 },
  { ok:()=>onScreen('s-pick')&&sheetUp(), el:()=>$('#vs-wrap'), text:3, next:1 },
  { ok:()=>onScreen('s-pick')&&sheetUp(), el:()=>vis($('#go-btn'))?$('#go-btn'):$('#diff-row'), text:4 },
];

function build(){ if(host) return host;
  host=document.createElement('div'); host.id='tut'; host.hidden=true;
  host.innerHTML='<div class="tring"></div><div class="tbox" data-act="tut-box"><p></p><div class="trow"><button class="tskip" data-act="tut-skip"></button><button class="tnext" data-act="tut-next"></button></div></div>';
  document.body.appendChild(host); host.querySelector('.tskip').textContent=TUTORIAL.skip; host.querySelector('.tnext').textContent=TUTORIAL.next; return host; }
function hide(){ if(host) host.hidden=true; }
function place(el,text,next){ const h=build(), r=el.getBoundingClientRect(), pad=6, ring=h.querySelector('.tring'), box=h.querySelector('.tbox');
  h.hidden=false; h.querySelector('p').textContent=text; h.querySelector('.tnext').hidden=!next;
  Object.assign(ring.style,{ left:(r.left-pad)+'px', top:(r.top-pad)+'px', width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px' });
  const bw=Math.min(320,innerWidth-32), bh=box.offsetHeight||90, below=r.bottom+pad+12, fitsBelow=below+bh<innerHeight-24;
  const top=fitsBelow?below:Math.max(16,r.top-pad-12-bh), left=Math.max(16,Math.min(innerWidth-16-bw,r.left+r.width/2-bw/2));
  Object.assign(box.style,{ width:bw+'px', left:left+'px', top:Math.min(top,innerHeight-bh-16)+'px' }); }
function finish(v){ prefs.tut=v; save(); step=0; tipOn=false; hide(); if(v===2) stop(); }

function tick(){
  if(prefs.tut===2) return stop();
  // the tip: the first result screen once the walkthrough is done, when it has settled and nothing else is on top of it
  if(prefs.tut===1){ if(!onScreen('s-over')){ if(tipOn) finish(2); else hide(); return; }
    const el=$('#over-chips2 .chip.locked')||$('#over-chips .mch.locked'); const busy=vis($('#welcome'))||vis($('#lockwrap #lockbox'))&&$('#lockwrap').classList.contains('on');
    if(!el||busy||Date.now()-overAt<3200){ if(!tipOn) hide(); return; }
    tipOn=true; place(el,TUTORIAL.locked,false); return; }
  if(!wanted()) return hide();
  if(step===3&&!vis($('#vs-wrap'))&&sheetUp()) step=4;
  if(step>=2&&onScreen('s-pick')&&!sheetUp()) step=1;
  if(step===1&&sheetUp()) step=2;
  const s=STEPS[step]; if(!s||!s.ok()) return hide();
  const el=s.el(); if(!vis(el)) return hide();
  place(el,step===4&&el.id!=='go-btn'?TUTORIAL.pickFirst:TUTORIAL.steps[s.text],!!s.next); }
function stop(){ clearInterval(timer); timer=0; }
function run(){ if(!timer&&prefs.tut!==2) timer=setInterval(tick,200); }

// Go pressed from the walkthrough: the run has started, so the walkthrough is over and the tip waits for the result
on('screen:change',({id})=>{ if(id==='s-over') overAt=Date.now(); if(id==='game'&&wanted()&&step>=1) finish(1); if(id==='game') hide(); });
on('store:reset',()=>{ step=0; });
/* build 64 (62.3): A TAP BEFORE THE FIRST BOX DOES NOTHING. Tapping a game while the map was still drawing itself in opened that game's sheet;
   step one waits for the bare map, so it never showed, and the run the player then played ended the walkthrough for good. From the moment the
   map is up for a walkthrough until its first box is on screen, every tap is swallowed here — capture, ahead of ui/actions.js's own handler —
   so nothing opens, nothing goes Back and nothing skips it. */
document.addEventListener('click',e=>{ if(!wanted()||!onScreen('s-pick')||step>0||(host&&!host.hidden)) return; e.stopPropagation(); e.preventDefault(); },true);
/* the tip is answered by a tap on the locked chip it rings — capture, so the chip's own lock box still opens underneath */
document.addEventListener('click',e=>{ if(!tipOn) return; const el=$('#over-chips2 .chip.locked')||$('#over-chips .mch.locked'); if(el&&e.target.closest('.chip.locked,.mch.locked')) finish(2); },true);

function next(){ if(tipOn){ const el=$('#over-chips2 .chip.locked')||$('#over-chips .mch.locked'); finish(2); if(el) el.click(); return; } step++; tick(); }
function skip(){ finish(2); }
/* Testing → replay tutorial (build 64, 62.5 — it was the foot of Customise until then; a player gets the walkthrough once): the walkthrough's
   state goes back to the start and the games menu opens, so it begins at step one whatever the profile has played */
function replay(){ prefs.tut=-1; save(); step=0; tipOn=false; run(); }

define({
  'tut-next'(){ next(); return 'click'; },
  'tut-skip'(){ skip(); return 'click'; },
  // a tap on the box itself moves on where Next would; on a step that waits for the player it does nothing (and never goes Back)
  'tut-box'(){ if(tipOn||(STEPS[step]&&STEPS[step].next)) next(); },
  'tut-replay'(){ replay(); show('s-pick'); return 'click'; },
});
run();
