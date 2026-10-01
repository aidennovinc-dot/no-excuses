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
import { GAUNTLET, GRID, TUTORIAL, WELCOME } from "../config/copy.js";
import { ESTIMATE, MODE_NAME, SET_COPY, STREAK } from "../config/games.js";
import { LEN_RULES, MENU_UNLOCK } from "../config/unlocks.js";
import { bankMenu, menuOpen } from "../progress/menu.js";
import { chestOpen } from "../progress/key.js";
import { CHESTS } from "../config/chests.js";
import { GAUNTLET_RUNS } from "../config/gauntlets.js";
import { KEYS } from "../config/keys.js";
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
import { setToastGate, toast } from "./toast.js";
import { videoDue } from "./video.js";

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
// build 66 (65.18): and while a chest's video is owed, so the next tap is the video's
/* build 68 (67.3, L14, reversing FEEDBACK-v34 A1 and 64.3): NOT FOR TOASTS ANY MORE, and not for a result screen still counting. Waiting for them is
   what left Aiden "stuck there with no reason as to why" on his first result. A box shows as soon as its screen opens; toasts wait for it
   (`holds()` below, through ui/toast.js). What is left here is a moment that owns the whole screen: a ceremony, a reveal, a key animation, the
   Welcome, the player, an ad */
// …and a key's creation intro still to play on this visit (`kintro`, ui/screens/key.js): it is the first thing on that screen (67.22)
const busy=()=>overlay()||!!videoDue()||[...document.querySelectorAll('.cere')].some(vis)
  ||$('#s-key').classList.contains('kearning')||$('#s-key').classList.contains('kintro')||vis($('#key-ask'));
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
// build 66 (section C): Aiden's marked lines quote the Dots rule's game, Quick Tap's two variants and each length's seconds on its own
function nums(){ const need=dotsRule(), m=QM(), lens=GC(QT,m).lens, names=lens.map(s=>lenName(QT,s,m)), rule=(LEN_RULES[QT+':'+m]||[])[1]||'';
  const row=(rule.match(/^\d+\s+hits in a row/)||[''])[0];
  return { need:need.replace(/\bany\b/,'a'), count:(need.match(/^\d+\s+\S+/)||[need])[0], qt:(need.match(/\bin (?:any|a) (.+?) run\b/)||[0,GAMES[QT].name])[1],
    secs:lens[0], s1:lens[0], s2:lens[1], s3:lens[2], first:names[0], second:names[1]||'', long:names[2]||'',
    names:list(names), all:list(lens.map(String)), row, rowN:(row.match(/^\d+/)||[''])[0], dots:GAMES.dots.name,
    v1:MODE_NAME[GAMES[QT].modes[0]], v2:MODE_NAME[GAMES[QT].modes[1]]||'', game:GAMES[QT].name+' · '+MODE_NAME[m] }; }
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
  { on:map, el:()=>$('#grid .tile[data-game="dots"]'), tap:1, done:lockUp, text:()=>say(L[3]) },
  // build 68 (67.1): the lock popup stays where it always sits — the box goes round it, it never moves for the box
  { on:()=>onScreen('s-pick')&&lockUp(), el:()=>$('#lockbox'), ring:0, text:()=>say(L[4]) },
  { on:map, el:()=>$(`#grid .tile[data-game="${QT}"]`), tap:1, done:()=>sheetUp()&&!lenStage(), tag:TUTORIAL.start, text:L[5],
    enter(){ if(lockUp()) through(()=>$('#lock-no').click()); } },
  { on:()=>sheetUp()&&!lenStage(), el:()=>$('#diff-row'), ring:0, text:()=>say(L[6]) },
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
  /* build 66 (section C, over-03): when the run opened something, "Great job, you unlocked …" comes straight after the first box, ahead of Try Again
     — the unlock is the reward for the run, so it comes first */
  const again={ on:oOn, el:()=>$('#again'), text:O.again };
  const body=dashOpen()?[mid[0],again,...mid.slice(1)]:[again,...mid];
  return [ { on:oOn, text:O.hi }, ...body, { on:oOn, el:()=>$('#over-back'), arrow:1, text:O.back },
    ...O.end.map(t=>({ on:oOn, text:t })) ]; }

/* every tutorial. `steps` is a list or a function that builds one; `step` / `setStep` / `finish` are where its state lives. The walkthrough's two
   halves keep build 64's fields (above); the rest share `prefs.tuts`. Order is priority: when two are armed, the first one listed goes first. */
let firstAt=0, overAt=0, overList=null;
const armed=id=>{ const v=(prefs.tuts||{})[id]; return Number.isInteger(v)&&v>=0; };
const live=id=>!!DEFS[id]&&DEFS[id].live();
const DEFS={
  first:{ live:wanted, steps:FIRST, step:()=>firstAt, setStep:n=>{ firstAt=n; }, finish(){},
    meta:{ name:'First-run walkthrough', trigger:'A profile that has never played reaches the games menu (or Testing → Replay tutorial)', start:'Games menu, once the map has drawn in',
      why:'A new player learns what is locked, how a game unlocks, variants and modes, then plays the first run, which cannot be quit',
      at:[['Games menu',''],['Games menu',''],['Games menu',''],['Games menu','Dots tile'],['Games menu · Dots lock box',''],['Games menu','Quick Tap tile, labelled "Start here"'],
        ['Pick sheet · variants',''],['Pick sheet · variants','Two'],['Pick sheet · Mode row',''],['Pick sheet · Mode row',''],['Pick sheet · Mode row','With a friend'],['Pick sheet · Mode row','Sprint (starts the first run)']] } },
  over:{ live:results, steps:()=>overList||(overList=overSteps()), step:()=>overAt, setStep:n=>{ overAt=n; }, finish:tutEnd,
    meta:{ name:'First result', trigger:'The first run finishes', start:'That run\'s result screen, once its unlock toasts have played',
      why:'The reward for the first run, what to try next, and the way back — then the walkthrough ends and Off the Rails is banked' } },
};
const ORDER=['first','over'];
function stepsOf(d){ return typeof d.steps==='function'?d.steps():d.steps; }
function stored(id){ return { live:()=>armed(id), step:()=>prefs.tuts[id], setStep:n=>{ prefs.tuts=Object.assign({},prefs.tuts,{[id]:n}); save(); },
  finish(){ prefs.tuts=Object.assign({},prefs.tuts,{[id]:'done'}); save(); } }; }
// a tutorial registers itself here with its steps and, optionally, `opened()` — whether its thing is already open (Testing's reset re-arms it)
function tutorial(id,steps,o={}){ DEFS[id]=Object.assign(stored(id),{ steps },o); if(!ORDER.includes(id)) ORDER.push(id); }
// the moment a tutorial's thing opens: armed at step one, unless it has already been done (or is already under way). Open-everything arms none
function arm(id){ if(!DEFS[id]||prefs.allOpen) return; const v=(prefs.tuts||{})[id]; if(v!==undefined) return; prefs.tuts=Object.assign({},prefs.tuts,{[id]:0}); save(); run(); }

/* ---------- build 68 (67.22 / 67.3, L14): A FIRST-TIME MOMENT RUNS ON THE FIRST VISIT, OR NEVER ----------
   THE SHARED CAUSE of Aiden's five late or missing moments (the About, Progress and Scores tours, the Skill Key intro, the Customise tour): every
   first-time moment was built to STEP ASIDE — behind toasts and a result still counting (`busy()` waited for both, 64.3 / FEEDBACK-v34 A1), behind
   another moment (the key's creation intro "stands aside … and plays on the next plain visit", 57.6), or behind its own doorway (a tour's step
   pointer sat on the menu box that rings the item, so a player who walked in by any other route, or before that box could show, met nothing inside)
   — and nothing marked the first visit as spent, so each one waited for a later visit and played there.
   Now: a ROOM is a screen a tour lives in (`room` on its steps; `door` on the boxes that lead there). Entering one starts its tour at once, whatever
   route the player took — the doorway boxes are passed. LEAVING one spends it (`prefs.rooms`), and whatever of a tour was still to come there is
   dropped for good: "We don't want to have random tutorials play after they've already seen it." A reload mid-tour spends nothing, so the next visit
   resumes it — the one safety net. A key screen the run's interlude passes through is not a visit (the player did not go there). */
const ROOMS=['s-about','s-prog','s-board','s-key','s-custom','s-gauntlet'];
// the key screen as a chest opens on it (`kpass`) or as the run's interlude passes through (`auto`) is not a visit
function roomNow(){ const s=$('.screen.on'); if(!s||!ROOMS.includes(s.id)) return ''; if(s.id==='s-key'&&(s.classList.contains('auto')||s.classList.contains('kpass'))) return '';
  return s.id==='s-gauntlet'?(s.dataset.g?'s-gauntlet:'+s.dataset.g:''):s.id; }
const spent=r=>!!(prefs.rooms||{})[r];
// a step in a spent room, or a doorway into the room the player is in (or has spent), is passed
const gone=s=>!!s&&((!!s.room&&spent(s.room))||(!!s.door&&(spent(s.door)||roomNow()===s.door)));
// a stored step past the end (a profile saved before a tutorial was split) finishes it
function drop(id){ const d=DEFS[id]; for(let n=0;n<60&&d&&d.live();n++){ const s=stepsOf(d)[d.step()]; if(!s&&d!==DEFS.first&&d!==DEFS.over){ d.finish(); return; } if(!gone(s)) return; advance(id); } }
let inRoom='';
on('screen:change',()=>{ const was=inRoom; inRoom='';
  if(was&&!spent(was)){ prefs.rooms=Object.assign({},prefs.rooms,{[was]:1}); save(); }
  for(const id of ORDER) drop(id); setTimeout(tick,0); });

/* ---------- the tutorials the menu's own unlocks arm (64.8 / 64.9 / 64.12) ---------- */
const menuOn=()=>onScreen('s-menu')&&!$('#s-menu').classList.contains('story');
const item=go=>()=>$(`#s-menu .item[data-go="${go}"]`);
/* build 68 (67.15): EACH OF THE THREE STARTS ON THE SCREEN THAT OPENS IT — "Congratulations, you unlocked Scores!" (Aiden's words) on that result, ahead
   of its toasts (or on the menu, for one opened there); then the item ringed on the menu, must-tap; then the tour inside. Been in already, by any
   route? The tour is dropped (67.22). The menu box's line, "Tap … to take a look", is Claude's, worded as Progress's own; it replaces "You've unlocked …" */
const res=()=>oOn()||menuOn(), MU=k=>(MENU_UNLOCK[k]||{}).name||'';
const got1=k=>()=>T(TUTORIAL.got,{name:MU(k)}), look=k=>()=>T(TUTORIAL.look,{name:MU(k)});
/* 64.8: ABOUT, after the Welcome clip. The menu with About ringed and the only thing that answers; then inside it, on rails — the videos, the
   feedback line, the support button, and away */
const A=TUTORIAL.about, ab=()=>onScreen('s-about');
tutorial('about',[
  { on:res, door:'s-about', text:got1('about') },
  { on:menuOn, el:item('s-about'), tap:1, door:'s-about', text:look('about') },
  { on:ab, room:'s-about', text:A[0] },
  { on:ab, room:'s-about', el:()=>$('#msglist'), text:A[1] },
  { on:ab, room:'s-about', el:()=>$('#feedback'), text:A[2] },
  { on:ab, room:'s-about', el:()=>$('#support'), text:A[3] },
  { on:ab, room:'s-about', text:A[4] },
],{ opened:()=>menuOpen('s-about'),
  meta:{ name:'About', trigger:'The Welcome clip finishes', start:'The result screen the Welcome played on (or the main menu)', why:'Shows where the videos, the feedback form and the support button live',
    at:[['Result, or the main menu',''],['Main menu','About'],['About',''],['About','the videos'],['About','Send feedback'],['About','Support'],['About','']] } });
/* 64.9: PROGRESS, after the first Estimate run. Build 66 (section C, prog-01): its first line is said on that run's RESULT, once the result's toasts
   are done ("otherwise the user might continue playing and not see this tutorial") — or on the menu, for a player who left the result first. Then
   Progress ringed on the menu; inside, two lines about the screen, the Games chest's tab ringed (the screen is put on that tab if it opened on another)
   for two lines, then a game filter the player must pick — any game but All. The result has no way straight to the menu, so its box is a line and
   the player goes on by themselves (65.9: nothing takes them) */
const P9=TUTORIAL.prog, pr=()=>onScreen('s-prog'), gtab=()=>$('#prog-tabs [data-tab="c-games"]');
tutorial('prog',[
  { on:res, door:'s-prog', text:got1('prog') },
  { on:res, door:'s-prog', text:()=>T(P9[0],{ game:(GAMES[MENU_UNLOCK.prog.game]||{}).name||'' }) },
  { on:menuOn, el:item('s-prog'), tap:1, door:'s-prog', text:P9[1] },
  { on:pr, room:'s-prog', text:P9[2] },
  { on:pr, room:'s-prog', text:P9[3] },
  { on:pr, room:'s-prog', el:gtab, text:P9[4], enter(){ const t=gtab(); if(t&&!t.classList.contains('sel')) through(()=>t.click()); } },
  { on:pr, room:'s-prog', el:gtab, text:P9[5] },
  { on:()=>pr()&&!!$('#prog-tabs [data-tab="c-games"].sel'), room:'s-prog', el:()=>$('#chest-g'), tap:1, hit:t=>{ const b=t.closest&&t.closest('#chest-g .chip'); return !!b&&b.dataset.v!=='all'; }, text:P9[6] },
],{ opened:()=>menuOpen('s-prog'),
  meta:{ name:'Progress', trigger:'The first Estimate run', start:'That run\'s result, ahead of its toasts (or the main menu, for a player who left it first)', why:'Progress is where every unlock lives, and how to earn it',
    at:[['Result, or the main menu',''],['Result, or the main menu',''],['Main menu','Progress'],['Progress',''],['Progress',''],['Progress','Games chest tab'],['Progress','Games chest tab'],['Progress · Games chest','a game filter (not All)']] } });
/* 64.12: SCORES, after the first Reaction run. Scores ringed on the menu; inside, a welcome, Quick Tap's chip to tap (Claude's call — "let's
   check" is a tap), then the web chart ringed */
const B12=TUTORIAL.board, bd=()=>onScreen('s-board');
tutorial('board',[
  { on:res, door:'s-board', text:got1('board') },
  { on:menuOn, el:item('s-board'), tap:1, door:'s-board', text:look('board') },
  { on:bd, room:'s-board', text:B12[0] },
  { on:bd, room:'s-board', el:()=>$(`#bd-g .chip[data-v="${QT}"]`), tap:1, text:()=>T(B12[1],{game:GAMES[QT].name}) },
  { on:bd, room:'s-board', el:()=>$('#radar'), text:B12[2] },
],{ opened:()=>menuOpen('s-board'),
  meta:{ name:'Scores', trigger:'The first Reaction run', start:'That run\'s result, ahead of its toasts', why:'Shows each game\'s top ten and the web chart of every game together',
    at:[['Result, or the main menu',''],['Main menu','Scores'],['Scores',''],['Scores','Quick Tap chip'],['Scores','the web chart']] } });

/* 64.14: THE GAMES CHEST, armed the moment it opens (`chest:opened`, progress/key.js). It starts on the map once the chest's words have spilt.
   Build 66 (65.9): the player gets everywhere by their own tap — the SKILL KEY word beside the chest is ringed and must be tapped ("Tap the Skill Key
   to take a look", Aiden's line) before the key's boxes; on the key, the spokes light for "fill all the bars", Quick Tap's node is tapped, then BACK
   is ringed and tapped to the menu, where Customise is ringed and tapped for "something fun"; Snow (64.15) is scrolled into view and picked. Build
   65 started it on About too, once the chest's video had played, and then took the player to the key itself — it waits for the map now */
const G14=TUTORIAL.games, ks=()=>onScreen('s-key'), cu=()=>onScreen('s-custom');
const word=to=>()=>$(`#grid .chestwords .cw[data-for="games"][data-to="${to}"]`);
/* build 68 (67.22): THREE TOURS, ONE PER PLACE — the map's two boxes, the Skill Key's four, Customise's four — so each runs on its own room's first
   visit, in whichever order the player gets there. Aiden's order is kept where the player follows it: Customise is ringed on the menu only once the
   map's and the key's boxes are behind them */
tutorial('games',[
  { on:()=>map()&&mapSettled(), door:'s-key', text:G14[0] },
  { on:()=>map()&&mapSettled(), el:word('key:0'), tap:1, door:'s-key', text:G14[1] },
],{ opened:()=>chestOpen('games'),
  meta:{ name:'Games chest', trigger:'The Games chest opens (every game mode unlocked)', start:'Games menu, once the chest\'s words have spilt (and its video has played)',
    why:'Introduces the Skill Key and its bars, the last step to 100%, and Customise', at:[['Games menu',''],['Games menu','SKILL KEY, beside the chest']] } });
tutorial('gkey',[
  { on:ks, room:'s-key', el:()=>$('#s-key .kkey[data-kt="0"]'), text:G14[2] },
  { on:ks, room:'s-key', el:()=>[...document.querySelectorAll('#key-ring .kr')], glow:1, keep:()=>$('#key-count'), text:G14[3] },
  { on:ks, room:'s-key', el:()=>$(`#s-key .knode[data-kg="${QT}"]`), tap:1, hit:t=>!!(t.closest&&t.closest(`#s-key [data-kg="${QT}"]`)), text:G14[4] },
  { on:ks, room:'s-key', el:()=>$('#s-key > .back'), tap:1, text:G14[5] },
],{ opened:()=>chestOpen('games'),
  meta:{ name:'Skill Key', trigger:'The Games chest opens; the first visit to the Skill Key, after its intro', start:'Skill Key',
    why:'The Skill Key and its bars, and the last step to 100%', at:[['Skill Key','the Skill Key card'],['Skill Key','every spoke (lit)'],['Skill Key','Quick Tap\'s node'],['Skill Key','Back']] } });
tutorial('gcust',[
  { on:()=>menuOn()&&!live('games')&&!live('gkey'), el:item('s-custom'), tap:1, door:'s-custom', text:G14[6] },
  { on:cu, room:'s-custom', text:G14[7] },
  { on:cu, room:'s-custom', el:()=>$('#c-bg button[data-v="snow"]'), tap:1, text:G14[8] },
  { on:cu, room:'s-custom', text:G14[9] },
],{ opened:()=>chestOpen('games'),
  meta:{ name:'Customise', trigger:'The Games chest opens; the first visit to Customise', start:'Main menu, once the Skill Key\'s boxes are behind the player',
    why:'Customise, and the Games chest\'s background to pick', at:[['Main menu','Customise'],['Customise',''],['Customise','Snow background'],['Customise','']] } });
// the three are one tour: armed together, and only for a player who has not already had the Games chest's
on('chest:opened',({id})=>{ if(id==='games'&&(prefs.tuts||{}).games===undefined){ arm('games'); arm('gkey'); arm('gcust'); } });

/* build 66 (65.8): ESTIMATE'S SET AND STREAK, the first time its pick sheet shows the Mode row — armed right there, for a player with no Estimate run on
   record (a player who has played it has met both already; Testing's reset all shows it again). The row about the two, each one ringed, then the
   player picks. The numbers are the variant on the sheet's: its Set's rounds (SET_COPY), the Streak's budget and Grow's free share (ESTIMATE) */
const E8=TUTORIAL.est, EG='hold', eOn=()=>lenStage()&&sel.game===EG;
const eLen=st=>()=>{ const l=GC(EG,sel.diff).lens, s=st?STREAK:l.find(x=>x!==STREAK); return $(`#time-row .tbtn[data-time="${s}"]`); };
const eSay=line=>()=>{ const d=sel.game===EG&&GAMES[EG].modes.includes(sel.diff)?sel.diff:GAMES[EG].modes[0], l=GC(EG,d).lens, set=l.find(x=>x!==STREAK);
  return T(line,{ set:lenName(EG,set,d), streak:lenName(EG,STREAK,d), n:(SET_COPY[EG+':'+d]||{}).rounds||set, bud:ESTIMATE.STREAK_BUD,
    free:d==='grow'?T(TUTORIAL.estFree,{free:ESTIMATE.GROW_FREE}):'' }); };
tutorial('est',[
  { on:eOn, el:()=>$('#time-row'), ring:0, text:E8[0] },
  { on:eOn, el:eLen(0), text:eSay(E8[1]) },
  { on:eOn, el:eLen(1), text:eSay(E8[2]) },
  // build 68 (67.10): every box points at something — the last one at the row it asks the player to pick from
  { on:eOn, el:()=>$('#time-row'), ring:0, text:E8[3] },
],{ opened:()=>GAMES[EG].modes.some(d=>(store.unlock||{})[EG+':'+d]),
  meta:{ name:'Estimate · Set and Streak', trigger:'Estimate\'s pick sheet shows its Mode row for the first time, with no Estimate run on record', start:'Estimate\'s pick sheet, Mode row',
    why:'The two modes score in opposite ways, and the cards alone don\'t say how a Streak ends',
    at:[['Estimate pick sheet','(the Mode row, not ringed)'],['Estimate pick sheet','Set'],['Estimate pick sheet','Streak'],['Estimate pick sheet','']] } });
const estFirst=()=>eOn()&&(prefs.tuts||{}).est===undefined&&!(store.runs||[]).some(r=>r.g===EG);

/* build 68 (67.40): THE NEXT-UNLOCK CARD'S ONE BOX, the first time the main menu shows the card — on the first arrival there after the walkthrough's
   run. The card is ringed; a tap anywhere moves the box on, and the card is the player's to tap */
tutorial('next',[
  { on:()=>menuOn()&&vis($('#nextup')), el:()=>$('#nextup'), text:TUTORIAL.nextBox },
],{ opened:()=>tutDone(),
  meta:{ name:'Next unlock', trigger:'The walkthrough ends; the first main menu after it', start:'Main menu', why:'The card that says what to chase next, and that a tap goes straight there', at:[['Main menu','the Next unlock card']] } });
on('tut:done',()=>arm('next'));

/* build 66 (65.16): A GAUNTLET, when the chest whose spill brings it in opens — Mini with the Skill chest, Mega with the Pro chest. It starts on the map
   the reveal hands back to: the Gauntlet's tile is ringed and must be tapped (65.9 — the player goes in by themselves), then three lines on its own
   screen. Every fact is config's: what it plays (its roster, every game but those it leaves out), and the key and chest a finished run opens */
const G16=TUTORIAL.gaunt, cap=s=>String(s).replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase());
const gauntFacts=g=>{ const c=CHESTS.find(x=>x.gaunt===g)||{}, k=KEYS.find(x=>x.id===c.needs)||{}, played=new Set((GAUNTLET_RUNS[g]||[]).map(s=>s.g)), left=Object.keys(GAMES).filter(x=>!played.has(x));
  return { name:GAUNTLET.name[g]||g, games:left.length?T(TUTORIAL.gauntBut,{names:list(left.map(x=>GAMES[x].name))}):TUTORIAL.gauntAll,
    key:cap(/key/i.test(k.name||'')?k.name:(k.name||'')+' key'), chest:cap(GRID.chest[c.id]||c.id||'') }; };
for(const [id,g,from] of [['mini','g1','key'],['mega','g2','pro']]){ const gOn=()=>onScreen('s-gauntlet')&&$('#s-gauntlet').dataset.g===g, say=i=>()=>T(G16[i],gauntFacts(g));
  tutorial(id,[
    { on:()=>map()&&mapSettled(), el:()=>$(`#grid .tile[data-gauntlet="${g}"]`), tap:1, door:'s-gauntlet:'+g, text:say(0) },
    { on:gOn, room:'s-gauntlet:'+g, text:say(1) },
    { on:gOn, room:'s-gauntlet:'+g, text:say(2) },
    { on:gOn, room:'s-gauntlet:'+g, text:say(3) },
  ],{ opened:()=>chestOpen(from),
    meta:{ name:GAUNTLET.name[g]||g, trigger:'The '+(GRID.chest[from]||from)+' opens (its reveal ends)', start:'Games menu, where the reveal hands back',
      why:'What '+(GAUNTLET.name[g]||g)+' is, and that finishing it once opens the next chest',
      at:[['Games menu',(GAUNTLET.name[g]||g)+' tile'],[(GAUNTLET.name[g]||g)+' screen',''],[(GAUNTLET.name[g]||g)+' screen',''],[(GAUNTLET.name[g]||g)+' screen','']] } });
  on('chest:opened',({id:c})=>{ if(c===from) arm(id); }); }

/* ---------- the box ---------- */
let host=null, timer=0, fromTut=false, passing=false, cur=null, last=null, lit=[], brought='';
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
function build(){ if(host) return host;
  // build 64 (62.8): the box is its line and nothing else — no Skip, no Next; a tap anywhere moves a text box on (the capture below)
  host=document.createElement('div'); host.id='tut'; host.hidden=true;
  // build 68 (67.2): four blocks round the ring — the dimmed, untappable ground a box sits on when the screen has no free spot for it
  host.innerHTML='<i class="tblk" hidden></i><i class="tblk" hidden></i><i class="tblk" hidden></i><i class="tblk" hidden></i><div class="tring"><span class="ttag"></span></div><div class="tarrow"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M40 40L10 10M10 10h14M10 10v14"></path></svg></div><div class="tbox"><p></p></div><i class="ttail"></i>';
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

/* build 68 (67.2 / 67.10 / 67.9 / 67.1, L15): THE BOX GOES WHERE NOTHING CAN BE TAPPED, AND NEVER MOVES THE SCREEN.
   Build 66 (65.5) kept a box clear of its own ring and nothing else, so on Aiden's phone it sat over the Two / Four chips, the first result's mode
   tiles and Sprint / Dash / Marathon, and Estimate's Grow / Cut row. Now every spot is tested against EVERYTHING on the screen that takes a tap
   (`taps()`: a control whose own middle is the top thing there — a tile under the map's dim is not), and the box takes the free spot nearest where it
   wants to be: beside its target (under it, else over it), or ON A PICK SHEET above the sheet over the dimmed map, its tail pointing down (67.10).
   With no free spot at all it goes over whatever has the least to tap, and the ring's own shade dims it. Every box with a target points at it.
   IT NEVER SCROLLS (67.9, superseding 65.5's "scrolled in once"): a target off the screen gets an arrow toward it, the ring waits, and the step waits
   with it (`far`) until the player brings the target in — then the ring lands. And the game's own UI never moves for a box (67.1: the lock popup is
   where it always is; build 66's `#lockwrap.tut` is gone). Between boxes the box and the ring glide (`.glide`, 250ms); reduced motion jumps. */
const TAPS='button,a[href],input,select,textarea,[data-act],[data-go],.tile,.chip,.chest,.cw';
function taps(skip){ const out=[], W=innerWidth, H=innerHeight;
  for(const el of document.querySelectorAll(TAPS)){
    if(host&&host.contains(el)) continue; if(skip.some(x=>x===el||x.contains(el))) continue; if(!vis(el)) continue;
    const r=el.getBoundingClientRect(); if(r.width<4||r.height<4||r.width*r.height>W*H*.4||r.bottom<=0||r.top>=H||r.right<=0||r.left>=W) continue;
    const t=document.elementFromPoint(Math.min(W-1,Math.max(0,r.left+r.width/2)),Math.min(H-1,Math.max(0,r.top+r.height/2)));
    if(t&&(t===el||el.contains(t))) out.push(r); }
  return out; }
// the free top nearest the first wish, then the next; with none free, the one over least
// an obstacle may carry a weight: the box's own target (`w` 1000) is the last thing it may ever sit on
function spot(obs,left,bw,bh,lo,hi,wish){ const ys=[], over=y=>{ let c=0; for(const r of obs){ const w=Math.min(r.right,left+bw+4)-Math.max(r.left,left-4), h=Math.min(r.bottom,y+bh+4)-Math.max(r.top,y-4); if(w>0&&h>0) c+=w*h*(r.w||1); } return c; };
  for(let y=lo;y<=hi-bh;y+=2) ys.push(Math.round(y)); if(!ys.length) return { y:Math.round(lo), fall:true };
  const cost=new Map(ys.map(y=>[y,Math.min(...wish.map((p,i)=>Math.abs(y-p)+i*40))])); ys.sort((a,b)=>cost.get(a)-cost.get(b));
  for(const y of ys) if(!over(y)) return { y, fall:false };
  return { y:ys.reduce((b,y)=>over(y)<over(b)?y:b,ys[0]), fall:true }; }
/* NO FREE SPOT (the whole map, a long list): what the box sits over is DIMMED AND TAKES NO TAP — four blocks round the ring (one for the whole screen
   when there is no ring), dark where no ring's own shade already darkens it. The tutorial owned those taps anyway; now nothing under the box can be
   mistaken for live (67.2: "No clear space → the box goes over a dimmed, non-tappable area") */
function blocks(on,r,pad){ const bs=[...build().querySelectorAll('.tblk')], W=innerWidth, H=innerHeight;
  host.classList.toggle('tdim',on&&!r); if(!on){ bs.forEach(b=>{ b.hidden=true; }); return; }
  const set=(b,l,t,w,h)=>{ b.hidden=!(w>0&&h>0); Object.assign(b.style,{ left:l+'px', top:t+'px', width:Math.max(0,w)+'px', height:Math.max(0,h)+'px' }); };
  if(!r){ set(bs[0],0,0,W,H); bs.slice(1).forEach(b=>{ b.hidden=true; }); return; }
  const L=r.left-pad, T=r.top-pad, R=r.right+pad, B=r.bottom+pad;
  set(bs[0],0,0,W,T); set(bs[1],0,B,W,H-B); set(bs[2],0,T,L,B-T); set(bs[3],R,T,W-R,B-T); }
function place(el,text,o={}){ const h=build(), pad=6, ring=h.querySelector('.tring'), box=h.querySelector('.tbox'), arrow=h.querySelector('.tarrow'), tail=h.querySelector('.ttail');
  const was=!h.hidden; h.hidden=false; h.classList.toggle('glide',was&&!REDUCE);
  h.querySelector('p').innerHTML=marks(text); h.classList.toggle('text',!o.tap);
  const els=(Array.isArray(el)?el:el?[el]:[]).filter(vis), keep=o.keep?[o.keep()].filter(e=>e&&vis(e)):[];
  const s=insets(), lo=s.top+8, hi=innerHeight-s.bottom-8, bw=Math.min(320,innerWidth-32), left=Math.round((innerWidth-bw)/2);
  box.style.width=bw+'px'; const bh=box.offsetHeight||92, gap=pad+(o.arrow?48:16);
  const T0=union(els), whole=!!T0&&T0.height>=(hi-lo)*.55;
  // 67.9: a target less than half on the screen (between the clock and the home indicator) is FAR — no ring yet, an arrow toward it, the box at that edge
  const seen=T0?(Math.min(T0.bottom,innerHeight-s.bottom)-Math.max(T0.top,s.top))/Math.max(1,T0.height):1;
  const far=!!T0&&!whole&&seen<.5?(T0.top+T0.height/2>innerHeight/2?1:-1):0;
  const ringed=!!els.length&&!o.noRing&&!far, aimed=!!els.length&&!whole&&!far;
  ring.hidden=!ringed; glow(o.glow&&!far?els:[]);
  // a target that is the whole screen (the map) or not yet on it does not hide what is inside it: those tiles are obstacles like any other
  // measured with the box and last turn's blocks out of the way — a block still taking hits would make every control under it look untappable
  const lift=[box,...h.querySelectorAll('.tblk')]; lift.forEach(e=>{ e.style.pointerEvents='none'; });
  const obs=taps(whole||far?keep:els.concat(keep)); lift.forEach(e=>{ e.style.pointerEvents=''; });
  const U=union(els.concat(keep));
  if(U&&!whole&&!far) obs.push({ left:U.left-pad, right:U.right+pad, top:U.top-gap+4, bottom:U.bottom+gap-4, w:1000 });
  const sheet=sheetUp()?$('#sheet').getBoundingClientRect():null; if(sheet) obs.push({ left:0, right:innerWidth, top:sheet.top, bottom:innerHeight });
  const wish=far>0?[hi-bh-56]:far<0?[lo+56]:sheet&&aimed?[sheet.top-gap-bh]:aimed&&U?[U.bottom+gap,U.top-gap-bh]:[last&&last.id===o.id?last.top:lo+(hi-lo-bh)/2];
  const at=spot(obs,left,bw,bh,lo,hi,wish), top=at.y; last={ id:o.id, top };
  // 67.9: while the target is off the screen the dim is only a look — the player has to be able to scroll to it (`#tut.far`)
  blocks(at.fall,ringed?union(els):null,pad); h.classList.toggle('over',at.fall); h.classList.toggle('far',!!far);
  Object.assign(box.style,{ left:left+'px', top:top+'px' });
  const side=aimed&&U?(top>=U.bottom?1:top+bh<=U.top?-1:0):0;
  tail.hidden=!side; tail.classList.toggle('up',side<0);
  if(side){ const R=union(els); Object.assign(tail.style,{ left:Math.round(Math.max(left+14,Math.min(left+bw-26,R.left+R.width/2-6)))+'px', top:(side>0?top-5:top+bh-7)+'px' }); }
  const sv=arrow.querySelector('svg');
  arrow.hidden=!((o.arrow&&els.length&&!far)||far);
  if(far){ sv.style.transform=far>0?'rotate(225deg)':'rotate(45deg)'; Object.assign(arrow.style,{ left:Math.round(Math.max(8,Math.min(innerWidth-48,T0.left+T0.width/2-20)))+'px', top:Math.round(far>0?top+bh+6:top-46)+'px' }); }
  else sv.style.transform='';
  if(!els.length||far) return { far };
  const r=union(els);
  Object.assign(ring.style,{ left:(r.left-pad)+'px', top:(r.top-pad)+'px', width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px' });
  const tag=ring.querySelector('.ttag'); tag.textContent=o.tag||''; tag.hidden=!o.tag;
  // 62.11: an arrow just under and right of BACK, pointing up at it
  if(o.arrow) Object.assign(arrow.style,{ left:Math.round(r.right-6)+'px', top:Math.round(r.bottom+2)+'px' });
  return { far:0 }; }

// a click the walkthrough makes itself (the lock box's own close, Go after Sprint) passes its own capture
function through(fn){ passing=true; try{ fn(); } finally{ passing=false; } }

/* ---------- the loop ---------- */
/* the tutorial that has the floor: the first live one in ORDER whose step lives where the player is (build 68, 67.22 — it was the first live one
   anywhere, so a tour waiting on the menu kept another off the screen it was made for); with none here, the first live one */
function active(){ let first=null; for(const id of ORDER){ const d=DEFS[id]; if(!d||!d.live()) continue; if(!first) first=id; const s=stepsOf(d)[d.step()]; if(s&&s.on()) return id; } return first; }
function tick(){
  if(estFirst()) arm('est');
  { const r=roomNow(); if(r) inRoom=r; }
  for(const k of ORDER) drop(k);
  /* 67.29: a Gauntlet's own Enter button is out of sight while its tour talks on its screen, and arrives as the last box closes — it was under the box */
  { const g=$('#s-gauntlet'), on=['mini','mega'].some(k=>{ const d=DEFS[k]; if(!d||!d.live()) return false; const s=stepsOf(d)[d.step()]; return !!s&&!!s.room; });
    if(g&&g.classList.contains('tuthold')!==on){ g.classList.toggle('tuthold',on); g.classList.toggle('tutin',!on); if(!on) setTimeout(()=>g.classList.remove('tutin'),700); } }
  const id=active(); if(!id) return hide();
  const d=DEFS[id], steps=stepsOf(d), i=d.step(), s=steps[i];
  if(!s) return hide();
  if(s.tap&&s.done&&s.done()){ advance(id); return tick(); }
  if(busy()||!s.on()) return hide();
  const el=s.el?s.el():null, first=Array.isArray(el)?el[0]:el; if(s.el&&!(first&&vis(first))) return hide();
  // build 66.1: a must-tap box never shows on something that cannot take the tap (a crossed-out menu item, one mid-animation) — it waits
  if(s.tap&&getComputedStyle(first).pointerEvents==='none') return hide();
  cur={ id, i, s };
  cur.far=place(el,typeof s.text==='function'?s.text():s.text,{ id, i, tap:s.tap, noRing:s.ring===0||!!s.arrow, arrow:s.arrow, tag:s.tag, glow:s.glow, keep:s.keep }).far; }
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
/* build 68 (67.3, L14): WHAT A TOAST WAITS FOR — a box up, a box due on this screen (its thing laid out), the first result before its first box, or a
   moment that owns the screen. ui/toast.js asks this before it shows one, so "you unlocked …" can never land ahead of the box that says it */
function holds(){ if(overlay()||shown()||waiting()) return true; const id=active(); if(!id) return false;
  const d=DEFS[id], s=stepsOf(d)[d.step()]; if(!s||!s.on()) return false; const el=s.el?s.el():null, f=Array.isArray(el)?el[0]:el; return !s.el||(!!f&&vis(f)); }
setToastGate(holds);
/* build 68 (67.3): THE TOASTS A FIRST-TIME BOX ALREADY SAYS, so the result screen drops them: a menu item's "you unlocked …" (its tour's first box
   says it, 67.15), and every unlock of the first run when the walkthrough's result names them ("Great job, you unlocked Dash and Four!") */
function tutTells(run){ const out=new Set();
  for(const k of Object.keys(MENU_UNLOCK)) if((prefs.tuts||{})[k]===0) out.add('menu:'+k);
  if(results()&&run&&prefs.tutRun.t===run.t&&dashOpen()) for(const k of gotKeys()) out.add(k);
  return out; }
function lets(t){ if(!shown()||!cur.s.tap) return false; if(cur.s.hit) return !!cur.s.hit(t); return [].concat(cur.s.el()||[]).some(el=>el.contains(t)); }
document.addEventListener('click',e=>{ if(passing) return;
  tick();   // what is on the screen NOW decides — a box whose tutorial ended since the last turn of the loop owns nothing
  if(!shown()){ if(waiting()){ e.stopPropagation(); e.preventDefault(); } return; }
  // build 68: only if the step is still the one tapped — a tap that changes screen has already passed its doorway step on the way (67.22)
  if(lets(e.target)){ const {id,i,s}=cur; if(!s.done) setTimeout(()=>{ if(active()===id&&DEFS[id].step()===i) advance(id); tick(); },0); return; }
  e.stopPropagation(); e.preventDefault();
  // 67.9: a box whose target is still off the screen waits for the player to bring it in; a tap does not move it on
  if(!cur.s.tap&&!cur.far){ Snd.click(); advance(cur.id); tick(); } },true);
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
  if(id==='s-pick'&&wanted()) firstAt=0; });
/* 64.3: THE RUN THE WALKTHROUGH STARTED IS ITS FIRST RUN, whatever happens on the way (`firstRun`, set as the game layer comes up and kept until
   that run finishes or is quit). Build 64 asked at the finish, through a flag any screen change wiped and a test the finished run itself made
   false (the run is on record by then), and a first run that lost it was never marked — the result boxes never came, the walkthrough stayed "not yet", and the next visit to the map
   restarted it behind a pick sheet with no box: Aiden's v0.64 report. The run's unlocks go with it (`got`, for 64.2's third box): the ones made mid-run and at the finish alike (run/run.js hands both). */
on('run:abort',()=>{ firstRun=false; });
on('run:finish',({run:r,two,fresh})=>{ if(!firstRun||two||r.demo||r.practice||r.chal||r.gaunt) return; firstRun=false;
  prefs.tut=1; prefs.tutRun=Object.assign({},r,{ got:(fresh||[]).map(u=>u.key).filter(Boolean) }); save(); overAt=0; overList=null; run(); });
// build 68 (67.36): a Fresh game forgets the walkthrough with everything else, so it plays again and banks Rails at its end like any first time
on('store:reset',()=>{ firstAt=0; overAt=0; overList=null; });
/* build 65 (64.7): THE MENU'S OWN UNLOCKS ARM THEIR TUTORIALS. Progress and Scores open with a run (run/run.js, progress/menu.js) and come down on
   its result's list with the rest of what it opened; About opens when the Welcome clip finishes — ended or closed, the same moment — and the
   player is taken straight to the main menu, where its tutorial waits (64.8). Put off with Later, About still opens, because the clip is waiting
   there, and its tutorial shows the next time the player is on the menu (Cowork's call: a Welcome put off must not lock About for good). */
on('run:finish',({fresh,two})=>{ if(two) return; for(const u of fresh||[]) if(u.menu) arm(u.menu); });
/* build 68 (67.15): no toast — About's first box says it — and the player is not taken anywhere (65.9): the box is on the screen the Welcome played over */
function openAbout(){ if(!bankMenu('about')) return; arm('about'); }
on('video:closed',({id})=>{ if(id===MENU_UNLOCK.about.video) openAbout(); });
// an app reopened between the first result and its last box: that run's result, as it was, and the boxes from the first
function resumeOver(){ const r=prefs.tutRun; if(!results()||!r||!GAMES[r.g]) return;
  sel.game=r.g; sel.diff=r.d; sel.secs=r.s; sel.vs=0; sel.practice=0; overAt=0; overList=null;
  emit('run:record',{run:r}); emit('run:finish',{ run:r, isBest:Scores.runs().some(x=>x.t===r.t), two:false, fresh:[], ach:[], adv:null }); }

/* Testing (build 64, 62.5): REPLAY TUTORIAL — the walkthrough goes back to its start and the games menu opens, so it begins at step one whatever
   the profile has played. A1: RESET ALL FIRST-TIME TUTORIALS — the same, and every other tutorial forgotten; one whose thing is already open is
   armed again at its first step, so it shows the next time the player is where it lives. */
function replay(){ prefs.tut=-1; delete prefs.tutRun; save(); firstAt=0; overAt=0; overList=null; run(); }
function resetAll(){ prefs.tuts={}; prefs.rooms={}; replay(); for(const id of ORDER){ const d=DEFS[id]; if(d.opened&&d.opened()) prefs.tuts[id]=0; } save(); }

define({
  'tut-replay'(){ replay(); show('s-pick'); return 'click'; },
  'tut-reset'(){ resetAll(); show('s-pick'); return 'click'; },
});
run();
setTimeout(resumeOver,0);

/* build 66: where the tutorials are, for Testing and the gate — the one that has the floor, its step, how many it has, and whether its box is up
   and waiting for a tap on its ring */
function tutNow(){ const id=active(); if(!id) return null; const d=DEFS[id]; return { id, i:d.step(), n:stepsOf(d).length, shown:shown()&&cur.id===id, tap:shown()&&!!cur.s.tap, far:shown()&&cur.far||0 }; }
/* build 66 (65.4): EVERY TUTORIAL AS THE REVIEW CATALOGUE PRINTS IT — the Tutorials section (_review/scripts/catalogue.ref.mjs tutorialsRef) is built
   from this, so it cannot drift from the game: each tutorial's trigger, starting screen and purpose (`meta`, beside its definition), then each box —
   its screen, what it rings, whether it waits for a tap on that, and its line exactly as the copy has it, colour marks and all, with every number
   filled from config. Ids are the Tutorial Map's (`first-03`, `over-all`), so notes made against one read against the other. The first result's
   boxes are listed with BOTH branches (a first run that opened Dash, and one that did not); the Welcome moment is in, since About waits for it */
function tutMap(){ const out=[], text=t=>{ try{ return typeof t==='function'?t():t; }catch(e){ return ''; } };
  for(const id of ORDER){ const d=DEFS[id], m=d&&d.meta; if(!m) continue;
    let boxes;
    if(id==='over'){ const R='Result', n=nums();
      boxes=[ { screen:R, ring:'', tap:0, text:O.hi }, { screen:R+' · if the run opened '+n.second, ring:n.second+' chip', tap:0, text:T(O.got,Object.assign({},n,{ names:n.second })) },
        { screen:R+' · if the run opened '+n.second+', not '+n.dots, ring:n.second+' chip', tap:0, text:say(O.next) }, { screen:R, ring:'Try again', tap:0, text:O.again },
        { screen:R+' · if '+n.second+' is still shut', ring:'Try again', tap:0, text:say(O.miss) }, { screen:R, ring:'Back (an arrow at it)', tap:0, text:O.back },
        ...O.end.map(t=>({ screen:R, ring:'', tap:0, text:t })) ]; }
    else boxes=stepsOf(d).map((s,i)=>({ screen:(m.at[i]||[])[0]||'', ring:(m.at[i]||[])[1]||'', tap:s.tap?1:0, text:text(s.text) }));
    out.push({ id, name:m.name, trigger:m.trigger, start:m.start, why:m.why, steps:stepsOf(d).length, at:id==='over'?boxes.length:m.at.length,
      boxes:boxes.map((b,i)=>Object.assign({ key:id+'-'+String(i+1).padStart(2,'0') },b)) });
    if(id==='over') out.push({ id:'welcome', name:'Welcome moment', trigger:'Dots unlocks — on that result as soon as it opens, ahead of its toasts (the main menu only after a reload or crash mid-way)',
      start:'Result screen', why:'The first thing the game gives you: Aiden\'s welcome clip, and watching it opens About', steps:1, at:1,
      boxes:[{ key:'welcome-01', screen:'The result that opens Dots', ring:'', tap:1, text:WELCOME.from+' · '+T(WELCOME.name,{ title:WELCOME.fallback }) }] }); }
  return out; }

/* build 66 (65.11): WHERE A REAL TAP ON A MUST-TAP BOX'S RING LANDS AND IS ANSWERED — a point on the screen, inside the ring, whose top element the box
   lets through; null when there is none (the ring is round something covered, off the screen or not the thing that answers), which is a soft lock */
function tutAim(){ if(!shown()||!cur.s.tap||cur.far) return null; const r=union([].concat(cur.s.el()||[]).filter(vis)); if(!r) return null;
  for(const fy of [.5,.3,.7,.15,.85]) for(const fx of [.5,.3,.7,.15,.85]){ const x=r.left+r.width*fx, y=r.top+r.height*fy; if(x<0||y<0||x>=innerWidth||y>=innerHeight) continue;
    const t=document.elementFromPoint(x,y); if(t&&lets(t)) return [Math.round(x),Math.round(y)]; } return null; }

export { arm, busy as tutBusy, tutAim, tutDone, tutMap, tutNow, tutTells, tutorial };
