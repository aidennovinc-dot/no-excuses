/* No Excuses — THE FIRST-TIME SYSTEM (build 65, A1). Build 62 made the first-run walkthrough (61.3), build 64 rewrote it (62.9 – 62.11);
   build 65 turns it into ONE MECHANISM and every first-time tutorial into data for it. Not a screen: one box, and a yellow ring round the thing
   a box is about, laid over whatever screen is up, the way ui/welcome.js lays its ceremony over the result screen. Build 66 (65.5): the box sits
   BESIDE what it rings, never over it, with a tail pointing at the ring, and glides from one spot to the next; (65.9) a tutorial never moves the
   player to another screen — when its next box lives elsewhere, the box before it rings the way there and waits for that tap.

   A TUTORIAL is an id and a list of STEPS (`DEFS` below; the words are config/copy.js TUTORIAL, Aiden's copy). A step says where it lives
   (`on`), what it is about (`el`), and whether it waits for a tap ON that thing (`tap`) or moves on at a tap anywhere. The rules, for all of them:
   · It fires when the player first reaches the thing, never ahead of time: a tutorial is ARMED at the moment its thing opens, and its box
     shows only while the player is where its current step lives.
   · A text box moves on at a tap anywhere; on a "must tap" box only the ringed thing responds. No Skip anywhere. While a box is up NOTHING
     ELSE RESPONDS — one capture below owns every tap (62.3 / 62.4 / 62.8).
   · It waits its turn: nothing shows while a toast is up or queued, while the result screen still has toasts to come, or while a ceremony,
     a reveal, a key animation, the Welcome moment, the video player, an ad or a lock box owns the screen (`busy()`, 64.3).
   · Numbers in its lines come from config, never typed into the copy.
   · Its current step is stored, so a reload resumes it; and the dim is the ring's own shadow, so it never shows without a box.

   THE FIRST-RUN WALKTHROUGH is two of them: `first` — twelve boxes on the games menu, then the first run, which cannot be quit (62.10) — and
   `over`, the boxes on that run's result. Their state keeps the fields it has had since build 62, because 62.10 says exactly how a reopened
   app resumes them: `prefs.tut` absent / 0 — not yet (a profile that has never played); -1 — asked for again from Testing; 1 — the first run is
   on record and its result's boxes are still to come (`prefs.tutRun` is that run, so a reopened app lands back on its result); 2 — done. A
   preference: Fresh game keeps it, so a player gets the walkthrough once.
   EVERY OTHER TUTORIAL is in `prefs.tuts`: `{ id: n }` armed and at step n, `{ id: 'done' }` finished. Also a preference. Testing's "reset
   all first-time tutorials" empties it, puts the walkthrough back to its start, and re-arms every tutorial whose thing is already open. */
import { TOAST, TUTORIAL } from "../config/copy.js";
import { MODE_NAME } from "../config/games.js";
import { LEN_RULES, MENU_UNLOCK } from "../config/unlocks.js";
import { bankMenu, menuOpen } from "../progress/menu.js";
import { chestOpen } from "../progress/key.js";
import { $, T, marks } from "../core.js";
import { emit, on } from "../core/events.js";
import { CHAL } from "../core/platform.js";
import { sel } from "../core/state.js";
import { prefs, save, store } from "../core/store.js";
import { GAMES, GC, lenName } from "../games/registry.js";
import { ACH } from "../config/achievements.js";
import { Scores, achToast, got, lenOpen } from "../progress.js";
import { UNLOCKS } from "../config/unlocks.js";
import { Snd } from "../audio.js";
import { define } from "./actions.js";
import { show } from "./router.js";
import { toast, toastBusy } from "./toast.js";

/* ---------- where things are ---------- */
// a fixed element has no offsetParent, so "on screen" is: not hidden, laid out, and not made invisible
const vis=el=>!!el&&!el.hidden&&el.getClientRects().length>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
const onScreen=id=>{ const s=$('#'+id); return !!s&&s.classList.contains('on'); };
const sheetUp=()=>vis($('#sheet'))&&$('#sheet').classList.contains('up');
const lenStage=()=>sheetUp()&&$('#sheet').classList.contains('len');
const lockUp=()=>$('#lockwrap').classList.contains('on');
// something that owns the screen for itself — the Welcome ceremony, the video player, an ad
const overlay=()=>vis($('#welcome'))||vis($('#vplay'))||!!$('#adbreak.on');
/* 64.3: EVERYTHING A TUTORIAL WAITS FOR. The first run's result used to wait a flat 1.5s and then talk over the unlock toasts; now nothing shows
   while a toast is up or queued, while the result screen still has toasts it has not sent (`#s-over[data-busy]`, ui/screens/result.js), or while
   a chest ceremony, a reveal, a key animation or the key's own question is on the screen */
const busy=()=>overlay()||toastBusy()||$('#s-over').hasAttribute('data-busy')||[...document.querySelectorAll('.cere')].some(vis)
  ||$('#s-key').classList.contains('kearning')||vis($('#key-ask'));
// the map's first open is drawn out; the walkthrough waits for it. A chest that breathes forever is not "the intro"
const mapSettled=()=>!$('#grid').getAnimations({subtree:true}).some(a=>{ try{ return a.playState==='running'&&a.effect.getComputedTiming().iterations!==Infinity; }catch(e){ return false; } });

/* ---------- the walkthrough's state ---------- */
/* build 64: a profile that has played (`prefs.played`, cleared only by Fresh game) is not new either — the walkthrough holds every tap, so it must
   never reach one. Nor does a player who arrived on a challenge link (Cowork's call): the link opens its own sheet, which the walkthrough would hold */
const wanted=()=>!CHAL&&(prefs.tut===-1||(!prefs.tut&&!prefs.played&&!(store.runs||[]).length));
const results=()=>prefs.tut===1&&!!prefs.tutRun;
/* 62.14: whether the walkthrough is behind this profile. A profile from before build 64 that played and never met it, and a build-62 profile left on
   its old after-result tip (tut 1, no run to come back to), both count as done */
const tutDone=()=>prefs.tut===2||(prefs.tut===1&&!prefs.tutRun)||(!prefs.tut&&(!!prefs.played||!!(store.runs||[]).length));

/* ---------- the numbers the lines quote, from config ---------- */
/* 62.9 steps 5 and 10, 64.1, 64.2: the Dots rule and Quick Tap's lengths as the config states them, never a number typed here. "35 hits in any
   Quick Tap run" is the lock box's own line; the box says it of A run. `row` is Dash's rule ("7 hits in a row"), read off LEN_RULES */
const QT='quick-tap', QM=()=>GAMES[QT].modes[0], dotsRule=()=>{ const u=UNLOCKS.find(u=>u.key===`dots:${GAMES.dots.modes[0]}`); return u?u.need:''; };
const list=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:a.join('');
function nums(){ const need=dotsRule(), m=QM(), lens=GC(QT,m).lens, names=lens.map(s=>lenName(QT,s,m)), rule=(LEN_RULES[QT+':'+m]||[])[1]||'';
  return { need:need.replace(/\bany\b/,'a'), count:(need.match(/^\d+\s+\S+/)||[need])[0], secs:lens[0], first:names[0], second:names[1]||'', long:names[2]||'',
    names:list(names), all:list(lens.map(String)), row:(rule.match(/^\d+\s+hits in a row/)||[''])[0], dots:GAMES.dots.name,
    game:GAMES[QT].name+' · '+MODE_NAME[m] }; }
const say=(line,extra)=>T(line,Object.assign(nums(),extra||{}));
// what a key is called in a line, the way its toast names it — a length by its name, a game's first mode by the game, any other mode by its own (64.2)
const nameOf=k=>{ const [g,d,s]=String(k).split(':'); if(!GAMES[g]) return ''; if(s!==undefined) return lenName(g,+s,d);
  const first=g!==QT&&!GAMES[g].modes.some(m=>m!==d&&(store.unlock||{})[g+':'+m]); return first||!MODE_NAME[d]?GAMES[g].name:MODE_NAME[d]; };

/* ---------- THE TUTORIALS, as data ----------
   A step: `on` where it lives; `el` what it is about (a ring round it, unless `ring:0`); `tap` — only that thing responds, and the step moves on
   when the tap lands on it (or when `done()` says so, for a tap whose effect the step must wait to see); `text` its line; `tag` a label on the
   ring; `arrow` an arrow at it instead of a ring; `enter` what happens as the step starts. */
const map=()=>onScreen('s-pick')&&!sheetUp()&&!lockUp();
const L=TUTORIAL.steps;
/* build 66 (65.9): where a step's ring goes is also where the player's tap goes. A ring of several things (`el` returns a list) is drawn round all of
   them at once and each one lights (`.tglow`); `keep` names something else on the screen the box must also stay clear of */
const FIRST=[
  { on:()=>map()&&mapSettled(), el:()=>$('#grid'), ring:0, text:L[0] },
  { on:map, el:()=>$('#grid'), ring:0, text:L[1] },
  { on:map, el:()=>$('#grid'), ring:0, text:L[2] },
  { on:map, el:()=>$('#grid .tile[data-game="dots"]'), tap:1, done:lockUp, text:L[3] },
  { on:()=>onScreen('s-pick')&&lockUp(), el:()=>$('#lockbox'), ring:0, text:()=>say(L[4]), enter(){ $('#lockwrap').classList.add('tut'); } },
  { on:map, el:()=>$(`#grid .tile[data-game="${QT}"]`), tap:1, done:()=>sheetUp()&&!lenStage(), tag:TUTORIAL.start, text:L[5],
    enter(){ if(lockUp()) through(()=>$('#lock-no').click()); $('#lockwrap').classList.remove('tut'); } },
  { on:()=>sheetUp()&&!lenStage(), el:()=>$('#diff-row'), ring:0, text:L[6] },
  { on:()=>sheetUp()&&!lenStage(), el:()=>$(`#diff-row .choice[data-diff="${QM()}"]`), tap:1, done:lenStage, text:()=>say(L[7]) },
  { on:lenStage, el:()=>$('#time-row'), ring:0, text:()=>say(L[8]) },
  { on:lenStage, el:()=>$('#time-row'), ring:0, text:()=>say(L[9]) },
  /* step 11: "With a friend" lives on the variant step of the sheet, and by now the sheet is on its length step — so for this box and the
     next the player row is shown on the length step too (Cowork's call: Aiden's order kept, the thing it points at put where it can be seen) */
  { on:lenStage, el:()=>$('#vs-wrap [data-p="f"]'), text:L[10], enter(){ $('#vs-wrap').style.display=''; } },
  // step 12: Sprint picked, the run starts — there is no box for Go (the second capture below presses it)
  { on:lenStage, el:()=>$(`#time-row .tbtn[data-time="${GC(QT,QM()).lens[0]}"]`), tap:1, done:()=>false, text:L[11] },
];
/* THE FIRST RESULT (62.11, 64.2). Every box moves on at a tap anywhere and nothing on the screen can be tapped until the last. The third box
   BRANCHES on what the first run opened (64.2 — the game knows, so it no longer hedges): Dash open → "Great job, you unlocked Dash!", naming every
   unlock the run made, then the Dots line with Dash ringed; Dash still shut → Dash's own rule, with TRY AGAIN ringed. */
const O=TUTORIAL.over, oOn=()=>onScreen('s-over');
const gotKeys=()=>((prefs.tutRun||{}).got||[]).filter(k=>GAMES[String(k).split(':')[0]]);
const dashOpen=()=>{ const m=QM(), s=GC(QT,m).lens[1]; return s!==undefined&&lenOpen(QT,m,s); };
function overSteps(){ const dash=()=>$(`#over-chips2 .chip[data-v="${GC(QT,QM()).lens[1]}"]`)||$('#over-chips2 .chip:nth-child(2)');
  const dots=()=>GAMES.dots.modes.some(m=>(store.unlock||{})['dots:'+m]);
  const mid=dashOpen()
    ? [ { on:oOn, el:dash, text:()=>say(O.got,{names:list(gotKeys().map(nameOf).filter(Boolean))||nums().second}) }, ...(dots()?[]:[{ on:oOn, el:dash, text:()=>say(O.next) }]) ]
    : [ { on:oOn, el:()=>$('#again'), text:()=>say(O.miss) } ];
  return [ { on:oOn, text:O.hi }, { on:oOn, el:()=>$('#again'), text:O.again }, ...mid, { on:oOn, el:()=>$('#over-back'), arrow:1, text:O.back },
    ...O.end.map(t=>({ on:oOn, text:t })) ]; }

/* every tutorial. `steps` is a list or a function that builds one; `step` / `setStep` / `finish` are where its state lives. The walkthrough's two
   halves keep build 64's fields (above); the rest share `prefs.tuts`. Order is priority: when two are armed, the first one listed goes first. */
let firstAt=0, overAt=0, overList=null;
const armed=id=>{ const v=(prefs.tuts||{})[id]; return Number.isInteger(v)&&v>=0; };
const DEFS={
  first:{ live:wanted, steps:FIRST, step:()=>firstAt, setStep:n=>{ firstAt=n; }, finish(){} },
  over:{ live:results, steps:()=>overList||(overList=overSteps()), step:()=>overAt, setStep:n=>{ overAt=n; }, finish:tutEnd },
};
const ORDER=['first','over'];
function stepsOf(d){ return typeof d.steps==='function'?d.steps():d.steps; }
function stored(id){ return { live:()=>armed(id), step:()=>prefs.tuts[id], setStep:n=>{ prefs.tuts=Object.assign({},prefs.tuts,{[id]:n}); save(); },
  finish(){ prefs.tuts=Object.assign({},prefs.tuts,{[id]:'done'}); save(); } }; }
// a tutorial registers itself here with its steps and, optionally, `opened()` — whether its thing is already open (Testing's reset re-arms it)
function tutorial(id,steps,o={}){ DEFS[id]=Object.assign(stored(id),{ steps },o); if(!ORDER.includes(id)) ORDER.push(id); }
// the moment a tutorial's thing opens: armed at step one, unless it has already been done (or is already under way). Open-everything arms none
function arm(id){ if(!DEFS[id]||prefs.allOpen) return; const v=(prefs.tuts||{})[id]; if(v!==undefined) return; prefs.tuts=Object.assign({},prefs.tuts,{[id]:0}); save(); run(); }

/* ---------- the tutorials the menu's own unlocks arm (64.8 / 64.9 / 64.12) ---------- */
const menuOn=()=>onScreen('s-menu')&&!$('#s-menu').classList.contains('story');
const item=go=>()=>$(`#s-menu .item[data-go="${go}"]`);
/* 64.8: ABOUT, after the Welcome clip. The menu with About ringed and the only thing that answers; then inside it, on rails — the videos, the
   feedback line, the support button, and away */
const A=TUTORIAL.about, ab=()=>onScreen('s-about');
tutorial('about',[
  { on:menuOn, el:item('s-about'), tap:1, text:A[0] },
  { on:ab, text:A[1] },
  { on:ab, el:()=>$('#msglist'), text:A[2] },
  { on:ab, el:()=>$('#feedback'), text:A[3] },
  { on:ab, el:()=>$('#support'), text:A[4] },
  { on:ab, text:A[5] },
],{ opened:()=>menuOpen('s-about') });
/* 64.9: PROGRESS, after the first Estimate run. Progress ringed on the menu; inside, two lines about the screen, the Games chest's tab ringed (the
   screen is put on that tab if it opened on another), then a game filter the player must pick — any game but All */
const P9=TUTORIAL.prog, pr=()=>onScreen('s-prog');
tutorial('prog',[
  { on:menuOn, el:item('s-prog'), tap:1, text:P9[0] },
  { on:pr, text:P9[1] },
  { on:pr, text:P9[2] },
  { on:pr, el:()=>$('#prog-tabs [data-tab="c-games"]'), text:P9[3], enter(){ const t=$('#prog-tabs [data-tab="c-games"]'); if(t&&!t.classList.contains('sel')) through(()=>t.click()); } },
  { on:()=>pr()&&!!$('#prog-tabs [data-tab="c-games"].sel'), el:()=>$('#chest-g'), tap:1, hit:t=>{ const b=t.closest&&t.closest('#chest-g .chip'); return !!b&&b.dataset.v!=='all'; }, text:P9[4] },
],{ opened:()=>menuOpen('s-prog') });
/* 64.12: SCORES, after the first Reaction run. Scores ringed on the menu; inside, a welcome, Quick Tap's chip to tap (Claude's call — "let's
   check" is a tap), then the web chart ringed */
const B12=TUTORIAL.board, bd=()=>onScreen('s-board');
tutorial('board',[
  { on:menuOn, el:item('s-board'), tap:1, text:B12[0] },
  { on:bd, text:B12[1] },
  { on:bd, el:()=>$(`#bd-g .chip[data-v="${QT}"]`), tap:1, text:()=>T(B12[2],{game:GAMES[QT].name}) },
  { on:bd, el:()=>$('#radar'), text:B12[3] },
],{ opened:()=>menuOpen('s-board') });

/* 64.14: THE GAMES CHEST, armed the moment it opens (`chest:opened`, progress/key.js). It starts on the map once the chest's words have spilt.
   Build 66 (65.9): the player gets everywhere by their own tap — the SKILL KEY word beside the chest is ringed and must be tapped ("Tap the Skill Key
   to take a look", Aiden's line) before the key's boxes; on the key, the spokes light for "fill all the bars", Quick Tap's node is tapped, then BACK
   is ringed and tapped to the menu, where Customise is ringed and tapped for "something fun"; Snow (64.15) is scrolled into view and picked. Build
   65 started it on About too, once the chest's video had played, and then took the player to the key itself — it waits for the map now */
const G14=TUTORIAL.games, ks=()=>onScreen('s-key'), cu=()=>onScreen('s-custom');
const word=to=>()=>$(`#grid .chestwords .cw[data-for="games"][data-to="${to}"]`);
tutorial('games',[
  { on:()=>map()&&mapSettled(), text:G14[0] },
  { on:()=>map()&&mapSettled(), el:word('key:0'), tap:1, text:G14[1] },
  { on:ks, el:()=>$('#s-key .kkey[data-kt="0"]'), text:G14[2] },
  { on:ks, el:()=>[...document.querySelectorAll('#key-ring .kr')], glow:1, keep:()=>$('#key-count'), text:G14[3] },
  { on:ks, el:()=>$(`#s-key .knode[data-kg="${QT}"]`), tap:1, hit:t=>!!(t.closest&&t.closest(`#s-key [data-kg="${QT}"]`)), text:G14[4] },
  { on:ks, el:()=>$('#s-key > .back'), tap:1, text:G14[5] },
  { on:menuOn, el:item('s-custom'), tap:1, text:G14[6] },
  { on:cu, text:G14[7] },
  { on:cu, el:()=>$('#c-bg button[data-v="snow"]'), tap:1, text:G14[8] },
  { on:cu, text:G14[9] },
],{ opened:()=>chestOpen('games') });
on('chest:opened',({id})=>{ if(id==='games') arm('games'); });

/* ---------- the box ---------- */
let host=null, timer=0, fromTut=false, passing=false, cur=null, last=null, lit=[];
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
function build(){ if(host) return host;
  // build 64 (62.8): the box is its line and nothing else — no Skip, no Next; a tap anywhere moves a text box on (the capture below)
  host=document.createElement('div'); host.id='tut'; host.hidden=true;
  host.innerHTML='<div class="tring"><span class="ttag"></span></div><div class="tarrow"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M40 40L10 10M10 10h14M10 10v14"></path></svg></div><div class="tbox"><p></p></div><i class="ttail"></i>';
  document.body.appendChild(host); return host; }
function glow(els){ for(const e of lit) if(!els.includes(e)) e.classList.remove('tglow'); for(const e of els) e.classList.add('tglow'); lit=els; }
function hide(){ if(host){ host.hidden=true; host.classList.remove('glide'); } glow([]); cur=null; }
// the insets come off a probe, as the stylesheet sees them
let inset=null;
function insets(){ if(!inset){ inset=document.createElement('div'); inset.style.cssText='position:fixed;left:0;width:0;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none'; document.body.appendChild(inset); }
  const r=inset.getBoundingClientRect(); return { top:r.top, bottom:innerHeight-r.bottom }; }
// the rectangle round several things at once
function union(els){ const rs=els.map(e=>e.getBoundingClientRect()).filter(r=>r.width||r.height); if(!rs.length) return null;
  const l=Math.min(...rs.map(r=>r.left)), t=Math.min(...rs.map(r=>r.top)), rt=Math.max(...rs.map(r=>r.right)), b=Math.max(...rs.map(r=>r.bottom));
  return { left:l, top:t, right:rt, bottom:b, width:rt-l, height:b-t }; }
// what scrolls a thing: its nearest ancestor that can, or the page
function scroller(el){ for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){ const o=getComputedStyle(p).overflowY; if((o==='auto'||o==='scroll')&&p.scrollHeight>p.clientHeight+1) return p; }
  const d=document.scrollingElement; return d&&d.scrollHeight>d.clientHeight+1?d:null; }
/* build 66 (65.5 / 65.11): A RINGED THING THE BOX CANNOT SIT BESIDE IS SCROLLED TO FIRST — off the screen (Snow, below Customise's fold, which Aiden
   had to find himself), or too near an edge for the box to fit on either side of it. The thing and the box are centred between the safe areas as a
   pair; a thing too tall for that goes to the top */
function into(els,bh,lo,hi,gap){ const r=union(els); if(!r) return; if(r.top>=lo&&r.bottom<=hi&&(r.bottom+gap+bh<=hi||r.top-gap-bh>=lo)) return;
  const sc=scroller(els[0]); if(!sc) return; const pair=r.height+gap+bh, want=pair<=hi-lo?lo+(hi-lo-pair)/2:lo;
  sc.scrollTo({ top:sc.scrollTop+r.top-want, behavior:'instant' }); }
/* build 66 (65.5, superseding build 64's 62.7 — one centred spot for every box): THE BOX SITS BESIDE WHAT IT IS ABOUT. Below it if there is room
   above the home indicator, else above it, never over it, with a tail pointing at the ring; a thing too tall for either side gets the box on its
   roomier side, inside the safe areas. A box about nothing (or about the whole screen) stays where the tutorial's last box was, or the centre for
   its first. Between boxes the box and the ring glide to their new spot (`.glide`, 250ms, ease-out); reduced motion jumps. */
function place(el,text,o={}){ const h=build(), pad=6, ring=h.querySelector('.tring'), box=h.querySelector('.tbox'), arrow=h.querySelector('.tarrow'), tail=h.querySelector('.ttail');
  const was=!h.hidden; h.hidden=false; h.classList.toggle('glide',was&&!REDUCE);
  h.querySelector('p').innerHTML=marks(text); h.classList.toggle('text',!o.tap);
  const els=(Array.isArray(el)?el:el?[el]:[]).filter(vis), keep=o.keep?[o.keep()].filter(e=>e&&vis(e)):[];
  const ringed=!!els.length&&!o.noRing, aimed=ringed||(!!o.arrow&&!!els.length);
  ring.hidden=!ringed; arrow.hidden=!(o.arrow&&els.length); glow(o.glow?els:[]);
  const s=insets(), lo=s.top+8, hi=innerHeight-s.bottom-8, bw=Math.min(320,innerWidth-32), left=Math.round((innerWidth-bw)/2);
  box.style.width=bw+'px'; const bh=box.offsetHeight||92, gap=pad+(o.arrow?48:16);
  if(aimed) into(els,bh,lo,hi,gap);
  const U=union(els.concat(keep)); let top=null, side=0;
  // a thing the box is about but does not ring (a row, the lock box) is kept clear too, unless it is most of the screen (the whole map)
  if(U&&(aimed||U.height<(hi-lo)*.55)){
    if(U.bottom+gap+bh<=hi){ top=U.bottom+gap; side=1; } else if(U.top-gap-bh>=lo){ top=U.top-gap-bh; side=-1; }
    else if(aimed) top=hi-U.bottom>=U.top-lo?hi-bh:lo; }
  if(top===null) top=last&&last.id===o.id?last.top:lo+(hi-lo-bh)/2;
  top=Math.round(Math.max(lo,Math.min(hi-bh,top))); last={ id:o.id, top };
  Object.assign(box.style,{ left:left+'px', top:top+'px' });
  tail.hidden=!(aimed&&side); tail.classList.toggle('up',side<0);
  if(aimed&&side){ const R=union(els); Object.assign(tail.style,{ left:Math.round(Math.max(left+14,Math.min(left+bw-26,R.left+R.width/2-6)))+'px', top:(side>0?top-5:top+bh-7)+'px' }); }
  if(!els.length) return;
  const r=union(els);
  Object.assign(ring.style,{ left:(r.left-pad)+'px', top:(r.top-pad)+'px', width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px' });
  const tag=ring.querySelector('.ttag'); tag.textContent=o.tag||''; tag.hidden=!o.tag;
  // 62.11: an arrow just under and right of BACK, pointing up at it
  if(o.arrow) Object.assign(arrow.style,{ left:Math.round(r.right-6)+'px', top:Math.round(r.bottom+2)+'px' }); }

// a click the walkthrough makes itself (the lock box's own close, Go after Sprint) passes its own capture
function through(fn){ passing=true; try{ fn(); } finally{ passing=false; } }

/* ---------- the loop ---------- */
// the tutorial that has the floor: the first live one in ORDER. Its box shows only where its step lives, and only when nothing is busy
function active(){ for(const id of ORDER){ const d=DEFS[id]; if(d&&d.live()) return id; } return null; }
function tick(){
  const id=active(); if(!id) return hide();
  const d=DEFS[id], steps=stepsOf(d), i=d.step(), s=steps[i];
  if(!s) return hide();
  if(s.tap&&s.done&&s.done()){ advance(id); return tick(); }
  if(busy()||!s.on()) return hide();
  const el=s.el?s.el():null, first=Array.isArray(el)?el[0]:el; if(s.el&&!(first&&vis(first))) return hide();
  cur={ id, i, s };
  place(el,typeof s.text==='function'?s.text():s.text,{ id, tap:s.tap, noRing:s.ring===0||!!s.arrow, arrow:s.arrow, tag:s.tag, glow:s.glow, keep:s.keep }); }
function run(){ if(!timer) timer=setInterval(tick,200); }
// the next step, or the end: the last tap on a tutorial is what finishes it
function advance(id){ const d=DEFS[id], steps=stepsOf(d), n=d.step()+1;
  if(n>=steps.length){ d.finish(); hide(); return; }
  d.setStep(n); const s=steps[n]; if(s&&s.enter) s.enter(); }

/* 62.14 / 64.3: THE LAST TAP ON THE FIRST RESULT ends the walkthrough, however that first run went, and banks Off the Rails (its toast says so).
   The result screen under it works normally from here. */
function tutEnd(){ prefs.tut=2; delete prefs.tutRun; save(); overAt=0; overList=null; bankRails(true); emit('tut:done',{}); }
function bankRails(say){ const g=got(); if(g.rails) return; g.rails=Date.now(); save(); const a=ACH.find(x=>x.id==='rails'); if(say&&a) toast(achToast(a),a.id,'',true); }

/* build 64 (62.3 / 62.4 / 62.8): A TUTORIAL OWNS EVERY TAP while its box is up — capture, ahead of ui/actions.js's own handler. A box that asks for a
   tap lets that one tap through and nothing else; any other box moves on at a tap anywhere, and that tap reaches nothing under it (62.8). Two waits
   are owned as well, with no box yet: a new profile's map drawing itself in before box one (62.3: a tap on a game then used to open its sheet and the
   walkthrough never showed), and the first result before its first box (62.11). Nothing else is: a tutorial that is armed but not showing leaves
   every tap alone, which is what keeps the screen from ever being held with no box on it (64.3). */
const shown=()=>!!host&&!host.hidden&&!!cur;
const waiting=()=>!overlay()&&((wanted()&&firstAt===0&&onScreen('s-pick')&&!sheetUp()&&!lockUp())||(results()&&onScreen('s-over')));
function lets(t){ if(!shown()||!cur.s.tap) return false; if(cur.s.hit) return !!cur.s.hit(t); return [].concat(cur.s.el()||[]).some(el=>el.contains(t)); }
document.addEventListener('click',e=>{ if(passing) return;
  tick();   // what is on the screen NOW decides — a box whose tutorial ended since the last turn of the loop owns nothing
  if(!shown()){ if(waiting()){ e.stopPropagation(); e.preventDefault(); } return; }
  if(lets(e.target)){ const {id,s}=cur; if(!s.done) setTimeout(()=>{ if(active()===id) advance(id); tick(); },0); return; }
  e.stopPropagation(); e.preventDefault();
  if(!cur.s.tap){ Snd.click(); advance(cur.id); tick(); } },true);
/* step 12: Sprint picked, the run starts — there is no box for Go. The tap selected the length (pick.js's own handler, bubbling after this
   capture); Go is pressed for it on the next turn of the loop */
document.addEventListener('click',e=>{ if(passing||!shown()||cur.id!=='first'||cur.i!==FIRST.length-1) return;
  const el=cur.s.el(); if(!el||!el.contains(e.target)) return; hide(); setTimeout(()=>{ fromTut=true; through(()=>$('#go-btn').click()); },0); },true);

/* 62.10: THE FIRST RUN. No Exit and no Restart on it (#game.tutrun). Once a run is on record the walkthrough is at 1 and holds the run, so an app
   closed before the last box opens on that run's result and carries on from its first box; closed before the run finished, nothing was recorded
   and it starts again from step one. */
let firstRun=false;
on('screen:change',({id})=>{ const g=$('#game');
  if(id==='game'){ hide(); if(fromTut&&wanted()) firstRun=true; g.classList.toggle('tutrun',firstRun); return; }
  g.classList.remove('tutrun'); fromTut=false;
  // the map, come back to before the first run was finished (an abandoned run, a reload): from step one again
  if(id==='s-pick'&&wanted()){ firstAt=0; $('#lockwrap').classList.remove('tut'); } });
/* 64.3: THE RUN THE WALKTHROUGH STARTED IS ITS FIRST RUN, whatever happens on the way (`firstRun`, set as the game layer comes up and kept until
   that run finishes or is quit). Build 64 asked at the finish, through a flag any screen change wiped and a test the finished run itself made
   false (the run is on record by then), and a first run that lost it was never marked — the result boxes never came, the walkthrough stayed "not yet", and the next visit to the map
   restarted it behind a pick sheet with no box: Aiden's v0.64 report. The run's unlocks go with it (`got`, for 64.2's third box): the ones made mid-run and at the finish alike (run/run.js hands both). */
on('run:abort',()=>{ firstRun=false; });
on('run:finish',({run:r,two,fresh})=>{ if(!firstRun||two||r.demo||r.practice||r.chal||r.gaunt) return; firstRun=false;
  prefs.tut=1; prefs.tutRun=Object.assign({},r,{ got:(fresh||[]).map(u=>u.key).filter(Boolean) }); save(); overAt=0; overList=null; run(); });
on('store:reset',()=>{ firstAt=0; if(prefs.tut===2) bankRails(false); });
/* build 65 (64.7): THE MENU'S OWN UNLOCKS ARM THEIR TUTORIALS. Progress and Scores open with a run (run/run.js, progress/menu.js) and come down on
   its result's list with the rest of what it opened; About opens when the Welcome clip finishes — ended or closed, the same moment — and the
   player is taken straight to the main menu, where its tutorial waits (64.8). Put off with Later, About still opens, because the clip is waiting
   there, and its tutorial shows the next time the player is on the menu (Cowork's call: a Welcome put off must not lock About for good). */
on('run:finish',({fresh,two})=>{ if(two) return; for(const u of fresh||[]) if(u.menu) arm(u.menu); });
function openAbout(go){ if(!bankMenu('about')) return; toast(T(TOAST.unlock,{name:MENU_UNLOCK.about.name}),'','ok'); arm('about'); if(go) show('s-menu'); }
on('video:closed',({id})=>{ if(id===MENU_UNLOCK.about.video) openAbout(true); });
on('welcome:later',()=>openAbout(false));
// an app reopened between the first result and its last box: that run's result, as it was, and the boxes from the first
function resumeOver(){ const r=prefs.tutRun; if(!results()||!r||!GAMES[r.g]) return;
  sel.game=r.g; sel.diff=r.d; sel.secs=r.s; sel.vs=0; sel.practice=0; overAt=0; overList=null;
  emit('run:record',{run:r}); emit('run:finish',{ run:r, isBest:Scores.runs().some(x=>x.t===r.t), two:false, fresh:[], ach:[], adv:null }); }

/* Testing (build 64, 62.5): REPLAY TUTORIAL — the walkthrough goes back to its start and the games menu opens, so it begins at step one whatever
   the profile has played. A1: RESET ALL FIRST-TIME TUTORIALS — the same, and every other tutorial forgotten; one whose thing is already open is
   armed again at its first step, so it shows the next time the player is where it lives. */
function replay(){ prefs.tut=-1; delete prefs.tutRun; save(); firstAt=0; overAt=0; overList=null; run(); }
function resetAll(){ prefs.tuts={}; replay(); for(const id of ORDER){ const d=DEFS[id]; if(d.opened&&d.opened()) prefs.tuts[id]=0; } save(); }

define({
  'tut-replay'(){ replay(); show('s-pick'); return 'click'; },
  'tut-reset'(){ resetAll(); show('s-pick'); return 'click'; },
});
run();
setTimeout(resumeOver,0);

/* build 66: where the tutorials are, for Testing and the gate — the one that has the floor, its step, how many it has, and whether its box is up
   and waiting for a tap on its ring */
function tutNow(){ const id=active(); if(!id) return null; const d=DEFS[id]; return { id, i:d.step(), n:stepsOf(d).length, shown:shown()&&cur.id===id, tap:shown()&&!!cur.s.tap }; }

export { arm, busy as tutBusy, tutDone, tutNow, tutorial };
