/* No Excuses — the menu, and the title sequence that opens it (build 19; the sequence was ui/screens/title.js until build 18).
   Five items, the Next achievement card above the title (v13 1.3) and the first-experience dimming (v10 / v11).

   v14 (1.2) put the two together on purpose. NO EXCUSES used to be one element on #s-story and a second one on #s-menu, so
   the title re-rendered and jumped the moment the sequence ended. Now there is one title node, in one screen: the sequence is
   the `story` class on #s-menu, which hides the menu's own rows without taking their space, and the two lines are absolutely
   positioned above and below the title (1.1 — line one at the top, NO EXCUSES in the middle, line two under it). The menu is
   rendered before the sequence starts, so nothing about the layout can change while it plays. */
import { GRID, KEY, MENU, TOAST } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { GAMES } from "../../games/registry.js";
import { sel } from "../../core/state.js";
import { $, $$, T, esc } from "../../core.js";
import { chestOpen, meter, meterPct, msgDot, readyChest } from "../../progress/key.js";
import { meterLook } from "../chest.js";
import { countUp } from "../../core/count.js";
import { emit, on } from "../../core/events.js";
import { CHAL } from "../../core/platform.js";
import { prefs, save, store } from "../../core/store.js";
import { Scores, nextGoal, setPendingAim } from "../../progress.js";
import { goWhere } from "../../run/run.js";
import { capture, define } from "../actions.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";
import { Snd } from "../../audio.js";

// first experience (v10): until one run is on the record only Play is live. v11: the rest are crossed out, and the strike wipes off the moment they open
/* v25 (item 9, build 45): A PROFILE WITH THE GAMES CHEST OPEN IS NOT A FIRST RUN. The chest is read through chestOpen() — the one read the map and
   the key screen use — but this rule outranked it: Testing's chest switches open the Games chest without a run on the record, so the menu kept
   every row but Play crossed out while the map showed the chest opened and Keys and Customise had nothing locking them. Earned by play, a run is
   always on the record first, so the real path never met it; the Testing path always did. */
const firstRun=()=>!prefs.played&&!Scores.runs().length&&!prefs.allOpen&&!chestOpen('games');
let menuWasFirst=firstRun(), nextWhere=null, storyOn=false;
// v23 (L.11a): whether Customise was locked the last time the menu drew it, so the strike wipes off once, the first draw after the Games chest
let cusWasLocked=!chestOpen('games');
// v14 (1.3): the first menu a profile ever sees reveals its items one at a time; every open after that is instant
function menuIn(){ if(prefs.menuSeen) return; prefs.menuSeen=1; save(); const m=$('#s-menu'); m.classList.add('intro'); setTimeout(()=>m.classList.remove('intro'),2400); }
function renderMenu(){ const first=firstRun(); const opening=menuWasFirst&&!first; menuWasFirst=first;
  /* v15 (6.2, build 26): when the menu opens up, the strikes come off TOP TO BOTTOM rather than all at once. Every item
     un-crossed itself on the same frame, so what was actually a list opening read as a single flicker and there was
     nothing to follow. `--ud` carries each item's delay to both animations — the brighten on the element and the
     unstrike on its ::after — because a bare animation-delay reaches the element only. */
  /* v24 (A.3, build 43): TESTING IS LIVE FROM THE FIRST LOAD. It sat under the first-run dimming with every other row, so Aiden had to play a
     Quick Tap run before he could reach it. A [data-dev] row is never dimmed and never un-struck; a native build has no such row at all
     (config/build.js TARGET, scripts/native.mjs) */
  $$('#s-menu .item').forEach((b,i)=>{ const dev=b.dataset.dev!==undefined, x=first&&b.dataset.go!=='s-pick'&&!dev; b.classList.toggle('dim',x); b.classList.remove('unx'); b.style.removeProperty('--ud');
    if(opening&&b.dataset.go!=='s-pick'&&!dev){ const d=i*90; b.style.setProperty('--ud',d+'ms'); b.classList.add('unx'); b.style.pointerEvents='none'; setTimeout(()=>{ b.classList.remove('unx'); b.style.removeProperty('--ud'); b.style.pointerEvents=''; },700+d); } });
  renderCustomise(first); renderKeys(first);
  /* v26 (item 3, build 48): EVERY HOME MENU ITEM IS GREEN FROM THE MOMENT IT IS AVAILABLE UNTIL IT HAS BEEN OPENED ONCE. FEEDBACK-v20 (D.5) asked
     for it and only Customise and Keys ever had it. Available is: not dimmed by the first run, and for Keys and Customise not locked behind the
     Games chest. Opened is `prefs.menuOpened`, written below the moment the item's screen is opened from this menu, and cleared by Fresh game.
     The Testing row is a dev tool, never dimmed and never green. About keeps build 46's reason as well: a message waiting to be watched. */
  $$('#s-menu .item').forEach(b=>{ const go=b.dataset.go; if(b.dataset.dev!==undefined||!MENU_GO.includes(go)) return;
    const avail=!b.classList.contains('dim')&&!b.classList.contains('keylock')&&!b.classList.contains('cuslock');
    b.classList.toggle('newthing',avail&&(!(prefs.menuOpened||{})[go]||(go==='s-about'&&msgDot()))); });
  // v17 (B.20, build 29): the "play one run · the rest opens" line is gone — the struck-through items say it
  /* v17 (§A.6.7): percentage complete on the front of the app. It is hidden on a profile that has not run anything — A.6.2
     makes a new profile 0%, and handing a first-timer a number that says nothing has happened is the opposite of what §A.6.6
     is for. Tapping it opens the keys screen.
     v18 (B.15): the line is the PERCENTAGE ALONE — "67% complete" — and the cleared count stays on the keys screen.
     v23 (L.8a, build 40): the percentage is THE METER (0–300 since build 48, v26 item 9 — the one place the total is printed), the same meter() the key screen reads — no re-base
     at Pro any more (B.17 retired with the step into Pro, L.8b). A chest waiting to be opened says so. */
  const mk=$('#menu-key');
  mk.hidden=first; if(!first) paintPct(mk,meter());
  /* v13 (1.3): the card sits above the title; the box holds the requirement and what it opens, nothing else.
     v15 (2.2): it does NOT appear on a fresh profile's first menu open — a player who has not run anything yet is being
     told to play, not handed a target — and it labels itself Next unlock or Next achievement depending on which of the
     two nextGoal() found. Unlocks outrank achievements: the chain is offered until there is none of it left. */
  const ng=first?null:nextGoal(); const nx=$('#nextup');
  if(ng){ nx.innerHTML=T(ng.ach?MENU.nextAch:MENU.next,{need:ng.need,name:ng.name}); nx.hidden=false; nextWhere=Object.assign({need:ng.need},ng.where); } else { nx.hidden=true; nextWhere=null; }
  renderResume(); }

/* v31 (60.27, build 60): THE OFFER A KILLED APP COMES BACK TO. A Streak or a Gauntlet writes where it had got to after every
   round (run/run.js saveResume), and the record is cleared the moment the run finishes or is quit — so a row here means the app
   went away in the middle of one and never came back to end it, which on iOS means the phone killed it outright. A run that was
   merely BACKGROUNDED never reaches this: it is still in memory and simply resumes where it was.
   The row names the game and the round; a tap plays that combination from where it stopped. It is the only thing on the menu
   that offers a specific run, so it sits above Next unlock, which offers a target. */
function renderResume(){ const row=$('#resumerow'); if(!row) return;
  const r=store.resume;
  if(!r||!GAMES[r.g]){ row.hidden=true; return; }
  const name=GAMES[r.g].name+(MODE_NAME[r.d]?' · '+MODE_NAME[r.d]:'');
  row.innerHTML=T(r.gaunt?MENU.resumeGaunt:MENU.resume,{game:esc(name),n:r.round});
  row.hidden=false; }

/* v23 (L.11a, build 40): CUSTOMISE IS LOCKED UNTIL THE GAMES CHEST OPENS. Crossed out — v17's crossed, not greyed — with "open the
   Games chest" under it, and a tap says so and goes nowhere. The first draw after the chest opens wipes the strike off (the menu's own
   unstrike, the one first-run items use), and the row is GREEN until Customise is first opened (L8 / v20 D.5 — `prefs.cusSeen`, set by
   ui/screens/customise.js). The first-run dimming outranks all of this: before any run every item but Play is dimmed anyway. */
function renderCustomise(first){ const b=$('[data-go="s-custom"]'), need=$('#cus-need'); if(!b||!need) return;
  const locked=!chestOpen('games'), wiped=cusWasLocked&&!locked; cusWasLocked=locked;
  b.classList.toggle('cuslock',locked&&!first); need.hidden=!locked||first; need.textContent=locked?MENU.cusNeed:'';
  if(wiped&&!first){ b.classList.add('unx'); setTimeout(()=>b.classList.remove('unx'),700); } }
/* v24 (A.1, build 43): KEYS IS LOCKED UNTIL THE GAMES CHEST OPENS, the same treatment as Customise and as a locked chest on the map: visible,
   crossed out, "open the Games chest" under it, and a tap says so and goes nowhere — so a new player can see the keys exist. The meter line
   under the menu goes to the same screen and is refused the same way. The first draw after the chest wipes the strike off, and the row is
   green until the key screen is first seen (L8 — `prefs.keysSeen`, set by ui/screens/key.js). */
let keysWasLocked=!chestOpen('games');
function renderKeys(first){ const b=$('#s-menu .item[data-go="s-key"]'), need=$('#keys-need'); if(!b||!need) return;
  const locked=!chestOpen('games'), wiped=keysWasLocked&&!locked; keysWasLocked=locked;
  b.classList.toggle('keylock',locked&&!first); need.hidden=!locked||first; need.textContent=locked?MENU.keysNeed:'';
  if(wiped&&!first){ b.classList.add('unx'); setTimeout(()=>b.classList.remove('unx'),700); } }

/* v20 (D.4, build 37): THE FRONT NUMBER SAYS WHEN IT WENT UP. The last-painted figure is in the store, written when the menu PAINTS
   it — not when a bar clears — so coming back with the figure higher than it was last shown walks it up from the old number with a
   pulse and a sound, through core/count.js, the same count-up the runs use; the sound is that count-up's own whoosh (the v16 §1.5
   lesson: check whether an existing sound fits before writing another). Never animates down, never with nothing seen before.
   v23 (L.8e, build 40): ONE figure now — `prefs.meterSeen`, the meter — not one per key, and it fires on every rise whatever the band. */
const PCT_UP_MS=900;   // (guess)
/* v23 (L.8d / L.8e, build 41): THE FIGURE WEARS ITS BAND — mute, ink, gold with a glow that strengthens across it, Thorns white on black with a
   spiked edge, a cold glow and a whole-pixel shake — through ui/chest.js meterLook(), and the pulse on a rise is in the band's colour. The
   words around the figure are untouched. Green is never a band colour (B.22). */
/* v28 (item 9, build 53): THE FIGURE PRINTED IS meterPct() — 0–100 — AND THE LOOK IS STILL THE RAW METER. Aiden saw "300% complete" here.
   The count-up still walks the raw meter, because that is what `prefs.meterSeen` holds and what the bands are measured in; only the text it
   draws is converted, so a rise of one bar still counts up and still wears its band. */
function paintPct(mk,pct){ const rc=readyChest();
  const line=v=>Math.round(v)===pct&&rc?T(KEY.menuReady,{pct:meterPct(v),chest:GRID.chest[rc]}):T(KEY.menu,{pct:meterPct(v)});
  const draw=v=>{ const n=Math.round(v); mk.innerHTML=esc(line(n)).replace(/(\d+%)/,'<b class="meterv">$1</b>'); meterLook(mk.querySelector('.meterv'),n); meterLook(mk,n,true); };
  const seen=prefs.meterSeen; prefs.meterSeen=pct; save();
  const id=mk._up=(mk._up||0)+1; mk.classList.remove('up');
  if(typeof seen!=='number'||pct<=seen){ draw(pct); return; }
  draw(seen); void mk.offsetWidth; mk.classList.add('up');
  countUp({ audio:Snd, from:seen, to:pct, ms:PCT_UP_MS, fmt:v=>v, set:v=>draw(v), alive:()=>mk._up===id&&$('#s-menu').classList.contains('on') }); }

/* ---------- the title sequence (L1). Three beats: the first line at the top, the title in the middle, the second line under it.
   A tap anywhere ends it — that is the one capture in ui/actions.js — and the menu builds around the title that is already there ---------- */
/* ---------- v25 (item 1, build 46): A SOUND UNDER EACH LINE OF THE TITLE ----------
   Four beats, four sounds: the two story lines, NO EXCUSES itself (the heavier one) and "tap to begin". Each is scheduled off THAT LINE'S OWN
   ANIMATION — the stylesheet keeps the only copy of the timing and a re-tune cannot leave the sound behind. It follows the sound setting like
   every other effect (config/audio.js TITLE_FX through Snd.titleFx).
   THE BUILD CATCH, accepted as item 1 writes it: a phone browser blocks audio until the player has tapped once, so the very first title of a
   web session plays silent. It works the second time the title is seen and in the App Store build, and it is NOT faked with a hidden tap.
   v27 (item 1, build 51): ON THE FRAME THE LINE APPEARS. Two things made it read late and they were one fault, as item 1 guessed. The sound was a
   400–600ms swell, so its loudest moment arrived half a second after it was fired (config/audio.js TITLE_FX — an impact now); and the delay was
   measured from the moment this function happened to run rather than from the animation's own start, so the style recalc and the first frame were
   added on top. `startTime` is when the animation itself began on the document timeline, so `startTime + delay − now` is exactly how long is left
   until that line moves, however long the work in between took. */
/* v29 Section A (57.1, build 57 — quotes L1; Aiden authorises the change): the fourth beat takes a sound of its OWN, `begin`, pitched above the
   three that fall (config/audio.js TITLE_FX). Nothing about the sequence's placement or pace moves: four beats, four sounds, each still fired off
   its own animation's start on the document timeline. */
const TITLE_BEATS=[['#st1','line'],['#s-menu .wmin','title'],['#st2','line'],['#storyhint','begin']];
let titleT=[];
function titleSounds(){ titleT.forEach(clearTimeout); titleT=[];
  const now=(document.timeline&&document.timeline.currentTime)||0;
  for(const [sel,kind] of TITLE_BEATS){ const el=$(sel); if(!el||!el.getAnimations) continue;
    const a=el.getAnimations()[0]; if(!a||!a.effect) continue;
    const d=a.effect.getComputedTiming().delay||0;
    const left=typeof a.startTime==='number'?(a.startTime+d)-now:d;
    titleT.push(setTimeout(()=>{ if(storyOn) Snd.titleFx(kind); },Math.max(0,left))); } }
const titleStop=()=>{ titleT.forEach(clearTimeout); titleT=[]; };
function storyStart(){ const m=$('#s-menu'); storyOn=true; m.classList.remove('storyend','intro'); m.classList.add('story'); void m.offsetWidth; m.classList.add('run'); titleSounds(); }
function storyEnd(){ if(!storyOn) return; storyOn=false; titleStop(); const m=$('#s-menu'); Snd.click(); prefs.story=1; save();
  m.classList.add('storyend'); setTimeout(()=>{ m.classList.remove('story','run','storyend'); menuIn(); },320);
  // v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
  if(CHAL) setTimeout(()=>emit('challenge',CHAL),570); }
capture(()=>{ if(!storyOn) return false; storyEnd(); return true; });

// a returning player boots straight onto the menu the markup already shows: the reveal plays once, and a challenge link opens its sheet
function enterMenu(){ renderMenu(); menuIn(); if(CHAL) setTimeout(()=>emit('challenge',CHAL),300); }

register('s-menu',{ onShow({intro,story}){ setPendingAim(''); storyOn=false; titleStop(); $('#s-menu').classList.remove('story','run','storyend');
  renderMenu(); if(story) storyStart(); else if(intro) menuIn(); } });
define({ nextup(){ if(nextWhere) goWhere(nextWhere); return 'click'; },
  /* v31 (60.27, build 60): the tap that takes the offer. It sets the combination and the round to come back at, and the pick
     sheet is where it lands — the player presses Go themselves, so the run starts when they are ready to play rather than while
     the menu is still fading. 'resumeAt' is read once by run/run.js and cleared, so this can never fire twice. */
  resume(){ const r=store.resume; if(!r||!GAMES[r.g]) return 'click';
    sel.game=r.g; sel.diff=r.d; sel.secs=r.s; sel.vs=0; sel.practice=0; sel.resumeAt=r;
    show('s-pick',{g:r.g,d:r.d,s:r.s}); return 'click'; },
  // L.11a: the Customise row. Locked, it says what opens it and stays put; open, it is an ordinary menu row
  custom(b){ if(!chestOpen('games')){ toast(TOAST.cusLocked,'','',true); return 'pick'; } show(b.dataset.go); return 'click'; },
  // v24 (A.1, build 43): the Keys row and the meter line. Locked, they say what opens them and stay put
  keys(){ if(!chestOpen('games')){ toast(TOAST.keysLocked,'','',true); return 'pick'; } show('s-key'); return 'click'; } });
on('store:reset',()=>{ menuWasFirst=true; cusWasLocked=true; keysWasLocked=true; });
/* v26 (item 3, build 48): AN ITEM IS OPENED WHEN ITS SCREEN IS OPENED FROM THIS MENU — the row itself, or the meter line under it, which opens
   Keys. A screen reached some other way (a run's key interlude, a chest ceremony, a Testing replay, Progress's key row) was not opened from its
   item, so the item stays green. The router announces a screen before it draws it, so the item is spent on the tap that opens it. */
const MENU_GO=['s-pick','s-board','s-prog','s-key','s-custom','s-about'];
// the screen on show when the app loads is the menu the markup already shows — boot draws it without announcing a screen change
let lastScreen=($('.screen.on')||{}).id||null;
on('screen:change',({id})=>{ if(lastScreen==='s-menu'&&MENU_GO.includes(id)&&!(prefs.menuOpened||{})[id]){ prefs.menuOpened=Object.assign({},prefs.menuOpened,{[id]:1}); save(); } lastScreen=id;
  /* v26 (item 12, build 48): THE VERSION LABEL IS ON THE HOME MENU AND NOWHERE ELSE. Builds 39–46 kept moving it out of the way screen by screen
     (the map, the Keys screen, a game's sheet, "tap to continue"); Aiden's call is one place for it, which ends every overlap at once. The
     About screen's own line (the build, its label and its date) is A6's and stays */
  const b=$('#build'); if(b) b.hidden=id!=='s-menu'; });

export { enterMenu, firstRun };
