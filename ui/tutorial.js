/* No Excuses — THE FIRST-RUN WALKTHROUGH (build 62, 61.3; REWRITTEN at build 64, 62.9 – 62.11 / 62.14). Not a screen: one centred box, and a
   yellow ring round the thing a box is about, laid over whatever screen is up, the way ui/welcome.js lays its ceremony over the result screen.

   TWELVE BOXES ON THE GAMES MENU, then THE FIRST RUN, then EIGHT ON ITS RESULT (config/copy.js TUTORIAL, Aiden's copy). A box that only says
   something moves on at a tap anywhere; a box that asks for a tap (Dots, Quick Tap, Two, Sprint) moves on only when that tap lands. While a box
   is up NOTHING ELSE RESPONDS — one capture below owns every tap (62.3 / 62.4 / 62.8). No Skip anywhere. The box sits in the centre of the phone,
   the same spot every time, and a target it would cover is scrolled clear (62.7). A box about many things draws no ring (62.6).

   THE FIRST RUN CANNOT BE QUIT (62.10): no Exit and no Restart on it, so a new player cannot land on the abandoned result by accident.

   `prefs.tut`: absent / 0 — not yet (a profile with no runs that has never played); -1 — asked for again from Testing; 1 — the first run is on
   record and its result's eight boxes are still to come (`prefs.tutRun` is that run, so a reopened app lands back on its result, 62.10);
   2 — done. A preference: Fresh game keeps it, so a player gets the walkthrough once. The last box's tap banks Off the Rails, which is what
   opens Scores, Progress and About on the menu (62.14, `tutDone()`). */
import { ACH } from "../config/achievements.js";
import { TUTORIAL } from "../config/copy.js";
import { MODE_NAME } from "../config/games.js";
import { $, T } from "../core.js";
import { emit, on } from "../core/events.js";
import { CHAL } from "../core/platform.js";
import { sel } from "../core/state.js";
import { prefs, save, store } from "../core/store.js";
import { GAMES, GC, lenName } from "../games/registry.js";
import { Scores, achToast, got } from "../progress.js";
import { UNLOCKS } from "../config/unlocks.js";
import { Snd } from "../audio.js";
import { define } from "./actions.js";
import { show } from "./router.js";
import { toast } from "./toast.js";

let step=0, host=null, timer=0, overAt=0, fromTut=false, passing=false;
/* build 64: a profile that has played (`prefs.played`, cleared only by Fresh game) is not new either — the walkthrough holds every tap, so it must
   never reach one. Nor does a player who arrived on a challenge link (Cowork's call): the link opens its own sheet, which the walkthrough would hold */
const wanted=()=>!CHAL&&(prefs.tut===-1||(!prefs.tut&&!prefs.played&&!(store.runs||[]).length));
const results=()=>prefs.tut===1&&!!prefs.tutRun;
/* 62.14: whether the walkthrough is behind this profile — the menu reads it. A profile from before build 64 that played and never met it, and a
   build-62 profile left on its old after-result tip (tut 1, no run to come back to), both count as done */
const tutDone=()=>prefs.tut===2||(prefs.tut===1&&!prefs.tutRun)||(!prefs.tut&&(!!prefs.played||!!(store.runs||[]).length));
// a fixed element has no offsetParent, so "on screen" is: not hidden, laid out, and not made invisible
const vis=el=>!!el&&!el.hidden&&el.getClientRects().length>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
const onScreen=id=>{ const s=$('#'+id); return !!s&&s.classList.contains('on'); };
const sheetUp=()=>vis($('#sheet'))&&$('#sheet').classList.contains('up');
const lenStage=()=>sheetUp()&&$('#sheet').classList.contains('len');
const lockUp=()=>$('#lockwrap').classList.contains('on');
// something that owns the screen for itself — the Welcome ceremony, the video player, an ad — and must keep its own taps
const overlay=()=>vis($('#welcome'))||vis($('#vplay'))||!!$('#adbreak.on');
// the map's first open is drawn out; the walkthrough waits for it. A chest that breathes forever is not "the intro"
const mapSettled=()=>!$('#grid').getAnimations({subtree:true}).some(a=>{ try{ return a.playState==='running'&&a.effect.getComputedTiming().iterations!==Infinity; }catch(e){ return false; } });

/* 62.9 steps 5 and 10: the Dots rule as the config states it, never a number typed here. "35 hits in any Quick Tap run" is the lock box's own
   line; the box says it of A run, and step 10 takes its count ("35 hits") and the first length's seconds */
const QT='quick-tap', dotsRule=()=>{ const u=UNLOCKS.find(u=>u.key===`dots:${GAMES.dots.modes[0]}`); return u?u.need:''; };
const fill=i=>{ const need=dotsRule(), lens=GC(QT,GAMES[QT].modes[0]).lens, names=lens.map(s=>lenName(QT,s,GAMES[QT].modes[0]));
  const list=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:a.join('');
  return T(TUTORIAL.steps[i],{ need:need.replace(/\bany\b/,'a'), count:(need.match(/^\d+\s+\S+/)||[need])[0], secs:lens[0], first:names[0],
    names:list(names), all:list(lens.map(String)), game:GAMES[QT].name+' · '+MODE_NAME[GAMES[QT].modes[0]] }); };

/* THE TWELVE BOXES (62.9). `el` is what the box is about; `tap` marks a box that waits for a tap on it, and `done` says the tap landed (a box
   moves itself on then); `ring:0` draws no outline; `tag` is a short label on the ring. `on` is where the box lives. */
const map=()=>onScreen('s-pick')&&!sheetUp()&&!lockUp();
const STEPS=[
  { on:()=>map()&&mapSettled(), el:()=>$('#grid'), ring:0 },
  { on:map, el:()=>$('#grid'), ring:0 },
  { on:map, el:()=>$('#grid'), ring:0 },
  { on:map, el:()=>$('#grid .tile[data-game="dots"]'), tap:1, done:lockUp },
  { on:()=>onScreen('s-pick')&&lockUp(), el:()=>$('#lockbox'), ring:0, enter(){ $('#lockwrap').classList.add('tut'); } },
  { on:map, el:()=>$(`#grid .tile[data-game="${QT}"]`), tap:1, done:()=>sheetUp()&&!lenStage(), tag:TUTORIAL.start,
    enter(){ if(lockUp()) through(()=>$('#lock-no').click()); $('#lockwrap').classList.remove('tut'); } },
  { on:()=>sheetUp()&&!lenStage(), el:()=>$('#diff-row'), ring:0 },
  { on:()=>sheetUp()&&!lenStage(), el:()=>$(`#diff-row .choice[data-diff="${GAMES[QT].modes[0]}"]`), tap:1, done:lenStage },
  { on:lenStage, el:()=>$('#time-row'), ring:0 },
  { on:lenStage, el:()=>$('#time-row'), ring:0 },
  /* step 11: "With a friend" lives on the variant step of the sheet, and by now the sheet is on its length step — so for this box and the
     next the player row is shown on the length step too (Cowork's call: Aiden's order kept, the thing it points at put where it can be seen) */
  { on:lenStage, el:()=>$('#vs-wrap [data-p="f"]'), enter(){ $('#vs-wrap').style.display=''; } },
  { on:lenStage, el:()=>$(`#time-row .tbtn[data-time="${GC(QT,GAMES[QT].modes[0]).lens[0]}"]`), tap:1, done:()=>false },
];
/* THE EIGHT ON THE FIRST RESULT (62.11). Every one moves on at a tap anywhere; three point at something the player will use later — TRY AGAIN
   and the longer length ringed, BACK with an arrow — and none of them can be tapped yet. The last tap closes the walkthrough (tutEnd). */
const OVER=[
  {}, { el:()=>$('#again') }, { el:()=>$('#over-chips2 .chip:nth-child(2)') }, { el:()=>$('#over-back'), arrow:1 }, {}, {}, {}, {},
];

function build(){ if(host) return host;
  // build 64 (62.8): the box is its line and nothing else — no Skip, no Next; a tap anywhere moves a text box on (the capture below)
  host=document.createElement('div'); host.id='tut'; host.hidden=true;
  host.innerHTML='<div class="tring"><span class="ttag"></span></div><div class="tarrow"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M40 40L10 10M10 10h14M10 10v14"></path></svg></div><div class="tbox"><p></p></div>';
  document.body.appendChild(host); return host; }
function hide(){ if(host) host.hidden=true; }
/* build 64 (62.7): THE BOX SITS IN THE CENTRE, THE SAME SPOT ON EVERY STEP. It used to follow its target, and on the step about the whole list
   that pinned it to the very top, under the clock. Now it is centred between the two safe areas and never moves; its height is held by a
   min-height so one line or two does not shift it. A target the box would cover is moved instead: its screen scrolls until it is clear of
   the box, above it if it sat above the centre, below it if below. The insets come off a probe, as the stylesheet sees them. */
let inset=null;
function insets(){ if(!inset){ inset=document.createElement('div'); inset.style.cssText='position:fixed;left:0;width:0;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none'; document.body.appendChild(inset); }
  const r=inset.getBoundingClientRect(); return { top:r.top, bottom:innerHeight-r.bottom }; }
function clear(el,bt,bb){ const sc=el.closest('.screen'); if(!sc||sc.scrollHeight<=sc.clientHeight+1) return; const r=el.getBoundingClientRect(), gap=16;
  if(r.bottom<=bt-gap||r.top>=bb+gap) return;
  const up=r.top+r.height/2<(bt+bb)/2, before=sc.scrollTop;
  sc.scrollTop+=up?r.bottom-(bt-gap):-(bb+gap-r.top);
  // the screen could not move that way far enough (the top or the end of it): the other side of the box
  const n=el.getBoundingClientRect(); if(n.bottom>bt-gap&&n.top<bb+gap){ sc.scrollTop=before; sc.scrollTop+=up?-(bb+gap-r.top):r.bottom-(bt-gap); } }
function place(el,text,o={}){ const h=build(), pad=6, ring=h.querySelector('.tring'), box=h.querySelector('.tbox'), arrow=h.querySelector('.tarrow');
  h.hidden=false; h.querySelector('p').textContent=text; h.classList.toggle('text',!o.tap); ring.hidden=!!o.noRing||!el;
  const bw=Math.min(320,innerWidth-32), bh=box.offsetHeight||90, s=insets(), top=Math.round(s.top+(innerHeight-s.top-s.bottom-bh)/2);
  Object.assign(box.style,{ width:bw+'px', left:Math.round((innerWidth-bw)/2)+'px', top:top+'px' });
  arrow.hidden=!o.arrow||!el;
  if(!el) return;
  if(!ring.hidden) clear(el,top,top+bh);
  const r=el.getBoundingClientRect();
  Object.assign(ring.style,{ left:(r.left-pad)+'px', top:(r.top-pad)+'px', width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px' });
  const tag=ring.querySelector('.ttag'); tag.textContent=o.tag||''; tag.hidden=!o.tag;
  // 62.11 box 4: an arrow just under and right of BACK, pointing up at it
  if(o.arrow) Object.assign(arrow.style,{ left:Math.round(r.right-6)+'px', top:Math.round(r.bottom+2)+'px' }); }

// a click the walkthrough makes itself (the lock box's own close, Go after Sprint) passes its own capture
function through(fn){ passing=true; try{ fn(); } finally{ passing=false; } }
function enter(){ const s=STEPS[step]; if(s&&s.enter) s.enter(); }

function tick(){
  if(prefs.tut===2) return stop();
  if(results()) return tickOver();
  if(!wanted()||!onScreen('s-pick')||overlay()) return hide();
  const s=STEPS[step]; if(!s) return hide();
  if(s.tap&&s.done()){ step++; enter(); return tick(); }
  if(!s.on()) return hide();
  const el=s.el(); if(el&&!vis(el)) return hide();
  place(el,fill(step),{ tap:s.tap, noRing:s.ring===0, tag:s.tag }); }
function tickOver(){ const i=step;
  if(!onScreen('s-over')||overlay()||lockUp()||Date.now()-overAt<1500) return hide();
  const o=OVER[i]; if(!o) return hide();
  const el=o.el?o.el():null;
  place(el&&vis(el)?el:null,TUTORIAL.over[i],{ noRing:!!o.arrow, arrow:o.arrow }); }
function stop(){ clearInterval(timer); timer=0; hide(); }
function run(){ if(!timer&&prefs.tut!==2) timer=setInterval(tick,200); }

/* 62.14: THE LAST TAP. The walkthrough is done, Off the Rails is banked (its toast says so) and the menu's Scores, Progress and About open —
   the menu reads tutDone(). The result screen under it works normally from here. */
function tutEnd(){ prefs.tut=2; delete prefs.tutRun; save(); step=0; stop(); bankRails(true); }
function bankRails(say){ const g=got(); if(g.rails) return; g.rails=Date.now(); save(); const a=ACH.find(x=>x.id==='rails'); if(say&&a) toast(achToast(a),a.id,'',true); }

function next(){ step++; enter(); tick(); }

/* build 64 (62.3 / 62.4 / 62.8): THE WALKTHROUGH OWNS EVERY TAP while it is up — capture, ahead of ui/actions.js's own handler. From the moment
   the map is up for it until its first box is on screen, and between boxes, a tap does nothing at all (62.3: a tap on a game while the map was
   still drawing in used to open its sheet, and the walkthrough never showed). With a box up, a box that asks for a tap lets that one tap
   through and nothing else; any other box moves on at a tap anywhere, and that tap reaches nothing under it (62.8). No navigation, no Back off
   the ground, nothing opened by accident (62.4). On the result screen the same holds until the last box. */
const owns=()=>!overlay()&&((wanted()&&onScreen('s-pick'))||(results()&&onScreen('s-over')));
function lets(t){ if(!host||host.hidden||results()) return false; const s=STEPS[step]; if(!s||!s.tap) return false; const el=s.el(); return !!el&&el.contains(t); }
document.addEventListener('click',e=>{ if(passing||!owns()||lets(e.target)) return; e.stopPropagation(); e.preventDefault();
  if(!host||host.hidden) return;
  if(results()){ Snd.click(); if(step>=OVER.length-1) tutEnd(); else next(); return; }
  const s=STEPS[step]; if(s&&!s.tap){ Snd.click(); next(); } },true);
/* step 12: Sprint picked, the run starts — there is no box for Go. The tap selected the length (pick.js's own handler, bubbling after this
   capture); Go is pressed for it on the next turn of the loop */
document.addEventListener('click',e=>{ if(passing||!wanted()||!onScreen('s-pick')||step!==STEPS.length-1||!host||host.hidden) return;
  const el=STEPS[step].el(); if(!el||!el.contains(e.target)) return; hide(); setTimeout(()=>{ fromTut=true; through(()=>$('#go-btn').click()); },0); },true);

/* 62.10: THE FIRST RUN. No Exit and no Restart on it (#game.tutrun). Once its result is on record the walkthrough is at 1 and holds the run, so
   an app closed before "Good luck!" opens on that run's result and carries on from box one; closed before the run finished, nothing was
   recorded and it starts again from step one. */
on('screen:change',({id})=>{ const g=$('#game');
  if(id==='game'){ hide(); g.classList.toggle('tutrun',fromTut&&wanted()); return; }
  g.classList.remove('tutrun'); fromTut=false;
  if(id==='s-over') overAt=Date.now();
  // the map, come back to before the first run was finished (an abandoned run, a reload): from step one again
  if(id==='s-pick'&&wanted()){ step=0; $('#lockwrap').classList.remove('tut'); } });
on('run:finish',({run:r,two})=>{ if(!$('#game').classList.contains('tutrun')&&!(wanted()&&fromTut)) return; if(two||r.demo||r.practice) return;
  prefs.tut=1; prefs.tutRun=Object.assign({},r); save(); step=0; run(); });
on('store:reset',()=>{ step=0; if(prefs.tut===2) bankRails(false); });
// an app reopened between the first result and "Good luck!": that run's result, as it was, and the eight boxes from the first
function resumeOver(){ const r=prefs.tutRun; if(!results()||!r||!GAMES[r.g]) return;
  sel.game=r.g; sel.diff=r.d; sel.secs=r.s; sel.vs=0; sel.practice=0; step=0;
  emit('run:record',{run:r}); emit('run:finish',{ run:r, isBest:Scores.runs().some(x=>x.t===r.t), two:false, fresh:[], ach:[], adv:null }); }

/* Testing → replay tutorial (build 64, 62.5 — it was the foot of Customise until then; a player gets the walkthrough once): the walkthrough's
   state goes back to the start and the games menu opens, so it begins at step one whatever the profile has played */
function replay(){ prefs.tut=-1; delete prefs.tutRun; save(); step=0; run(); }

define({
  'tut-replay'(){ replay(); show('s-pick'); return 'click'; },
});
run();
setTimeout(resumeOver,0);

export { tutDone };
