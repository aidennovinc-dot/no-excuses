/* No Excuses — the menu, and the title sequence that opens it (build 19; the sequence was ui/screens/title.js until build 18).
   Five items, the Next achievement card above the title (v13 1.3) and the first-experience dimming (v10 / v11).

   v14 (1.2) put the two together on purpose. NO EXCUSES used to be one element on #s-story and a second one on #s-menu, so
   the title re-rendered and jumped the moment the sequence ended. Now there is one title node, in one screen: the sequence is
   the `story` class on #s-menu, which hides the menu's own rows without taking their space, and the two lines are absolutely
   positioned above and below the title (1.1 — line one at the top, NO EXCUSES in the middle, line two under it). The menu is
   rendered before the sequence starts, so nothing about the layout can change while it plays. */
import { GRID, KEY, MENU, TOAST } from "../../config/copy.js";
import { $, $$, T, esc } from "../../core.js";
import { chestOpen, meter, readyChest } from "../../progress/key.js";
import { meterLook } from "../chest.js";
import { countUp } from "../../core/count.js";
import { emit, on } from "../../core/events.js";
import { CHAL } from "../../core/platform.js";
import { prefs, save } from "../../core/store.js";
import { Scores, nextGoal, setPendingAim } from "../../progress.js";
import { goWhere } from "../../run/run.js";
import { capture, define } from "../actions.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";
import { Snd } from "../../audio.js";

// first experience (v10): until one run is on the record only Play is live. v11: the rest are crossed out, and the strike wipes off the moment they open
const firstRun=()=>!prefs.played&&!Scores.runs().length&&!prefs.allOpen;
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
  $$('#s-menu .item').forEach((b,i)=>{ const x=first&&b.dataset.go!=='s-pick'; b.classList.toggle('dim',x); b.classList.remove('unx'); b.style.removeProperty('--ud');
    if(opening&&b.dataset.go!=='s-pick'){ const d=i*90; b.style.setProperty('--ud',d+'ms'); b.classList.add('unx'); b.style.pointerEvents='none'; setTimeout(()=>{ b.classList.remove('unx'); b.style.removeProperty('--ud'); b.style.pointerEvents=''; },700+d); } });
  renderCustomise(first);
  // v17 (B.20, build 29): the "play one run · the rest opens" line is gone — the struck-through items say it
  /* v17 (§A.6.7): percentage complete on the front of the app. It is hidden on a profile that has not run anything — A.6.2
     makes a new profile 0%, and handing a first-timer a number that says nothing has happened is the opposite of what §A.6.6
     is for. Tapping it opens the keys screen.
     v18 (B.15): the line is the PERCENTAGE ALONE — "67% complete" — and the cleared count stays on the keys screen.
     v23 (L.8a, build 40): the percentage is THE METER, 0–400, the same meter() the map's chests and the key screen read — no re-base
     at Pro any more (B.17 retired with the step into Pro, L.8b). A chest waiting to be opened says so. */
  const mk=$('#menu-key');
  mk.hidden=first; if(!first) paintPct(mk,meter());
  /* v13 (1.3): the card sits above the title; the box holds the requirement and what it opens, nothing else.
     v15 (2.2): it does NOT appear on a fresh profile's first menu open — a player who has not run anything yet is being
     told to play, not handed a target — and it labels itself Next unlock or Next achievement depending on which of the
     two nextGoal() found. Unlocks outrank achievements: the chain is offered until there is none of it left. */
  const ng=first?null:nextGoal(); const nx=$('#nextup'); $('#menu-tag').hidden=!ng;
  if(ng){ nx.innerHTML=T(ng.ach?MENU.nextAch:MENU.next,{need:ng.need,name:ng.name}); nx.hidden=false; nextWhere=Object.assign({need:ng.need},ng.where); } else { nx.hidden=true; nextWhere=null; } }

/* v23 (L.11a, build 40): CUSTOMISE IS LOCKED UNTIL THE GAMES CHEST OPENS. Crossed out — v17's crossed, not greyed — with "open the
   Games chest" under it, and a tap says so and goes nowhere. The first draw after the chest opens wipes the strike off (the menu's own
   unstrike, the one first-run items use), and the row is GREEN until Customise is first opened (L8 / v20 D.5 — `prefs.cusSeen`, set by
   ui/screens/customise.js). The first-run dimming outranks all of this: before any run every item but Play is dimmed anyway. */
function renderCustomise(first){ const b=$('[data-go="s-custom"]'), need=$('#cus-need'); if(!b||!need) return;
  const locked=!chestOpen('games'), wiped=cusWasLocked&&!locked; cusWasLocked=locked;
  b.classList.toggle('cuslock',locked&&!first); need.hidden=!locked||first; need.textContent=locked?MENU.cusNeed:'';
  b.classList.toggle('newthing',!locked&&!first&&!prefs.cusSeen);
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
function paintPct(mk,pct){ const rc=readyChest();
  const line=v=>Math.round(v)===pct&&rc?T(KEY.menuReady,{pct:Math.round(v),chest:GRID.chest[rc]}):T(KEY.menu,{pct:Math.round(v)});
  const draw=v=>{ const n=Math.round(v); mk.innerHTML=esc(line(n)).replace(/(\d+%)/,'<b class="meterv">$1</b>'); meterLook(mk.querySelector('.meterv'),n); meterLook(mk,n,true); };
  const seen=prefs.meterSeen; prefs.meterSeen=pct; save();
  const id=mk._up=(mk._up||0)+1; mk.classList.remove('up');
  if(typeof seen!=='number'||pct<=seen){ draw(pct); return; }
  draw(seen); void mk.offsetWidth; mk.classList.add('up');
  countUp({ audio:Snd, from:seen, to:pct, ms:PCT_UP_MS, fmt:v=>v, set:v=>draw(v), alive:()=>mk._up===id&&$('#s-menu').classList.contains('on') }); }

/* ---------- the title sequence (L1). Three beats: the first line at the top, the title in the middle, the second line under it.
   A tap anywhere ends it — that is the one capture in ui/actions.js — and the menu builds around the title that is already there ---------- */
function storyStart(){ const m=$('#s-menu'); storyOn=true; m.classList.remove('storyend','intro'); m.classList.add('story'); void m.offsetWidth; m.classList.add('run'); }
function storyEnd(){ if(!storyOn) return; storyOn=false; const m=$('#s-menu'); Snd.click(); prefs.story=1; save();
  m.classList.add('storyend'); setTimeout(()=>{ m.classList.remove('story','run','storyend'); menuIn(); },320);
  // v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
  if(CHAL) setTimeout(()=>emit('challenge',CHAL),570); }
capture(()=>{ if(!storyOn) return false; storyEnd(); return true; });

// a returning player boots straight onto the menu the markup already shows: the reveal plays once, and a challenge link opens its sheet
function enterMenu(){ renderMenu(); menuIn(); if(CHAL) setTimeout(()=>emit('challenge',CHAL),300); }

register('s-menu',{ onShow({intro,story}){ setPendingAim(''); storyOn=false; $('#s-menu').classList.remove('story','run','storyend');
  renderMenu(); if(story) storyStart(); else if(intro) menuIn(); } });
define({ nextup(){ if(nextWhere) goWhere(nextWhere); return 'click'; },
  // L.11a: the Customise row. Locked, it says what opens it and stays put; open, it is an ordinary menu row
  custom(b){ if(!chestOpen('games')){ toast(TOAST.cusLocked,'','',true); return 'pick'; } show(b.dataset.go); return 'click'; } });
on('store:reset',()=>{ menuWasFirst=true; cusWasLocked=true; });

export { enterMenu, firstRun };
