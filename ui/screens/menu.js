/* No Excuses — the menu, and the title sequence that opens it (build 19; the sequence was ui/screens/title.js until build 18).
   Five items, the Next achievement card above the title (v13 1.3) and the first-experience dimming (v10 / v11).

   v14 (1.2) put the two together on purpose. NO EXCUSES used to be one element on #s-story and a second one on #s-menu, so
   the title re-rendered and jumped the moment the sequence ended. Now there is one title node, in one screen: the sequence is
   the `story` class on #s-menu, which hides the menu's own rows without taking their space, and the two lines are absolutely
   positioned above and below the title (1.1 — line one at the top, NO EXCUSES in the middle, line two under it). The menu is
   rendered before the sequence starts, so nothing about the layout can change while it plays. */
import { MENU } from "../../config/copy.js";
import { $, $$, T } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { CHAL } from "../../core/platform.js";
import { prefs, save } from "../../core/store.js";
import { Scores, nextGoal, setPendingAim } from "../../progress.js";
import { goWhere } from "../../run/run.js";
import { capture, define } from "../actions.js";
import { register, show } from "../router.js";
import { Snd } from "../../audio.js";

// first experience (v10): until one run is on the record only Play is live. v11: the rest are crossed out, and the strike wipes off the moment they open
const firstRun=()=>!prefs.played&&!Scores.runs().length&&!prefs.allOpen;
let menuWasFirst=firstRun(), nextWhere=null, storyOn=false;
// v14 (1.3): the first menu a profile ever sees reveals its items one at a time; every open after that is instant
function menuIn(){ if(prefs.menuSeen) return; prefs.menuSeen=1; save(); const m=$('#s-menu'); m.classList.add('intro'); setTimeout(()=>m.classList.remove('intro'),2400); }
function renderMenu(){ const first=firstRun(); const opening=menuWasFirst&&!first; menuWasFirst=first;
  /* v15 (6.2, build 26): when the menu opens up, the strikes come off TOP TO BOTTOM rather than all at once. Every item
     un-crossed itself on the same frame, so what was actually a list opening read as a single flicker and there was
     nothing to follow. `--ud` carries each item's delay to both animations — the brighten on the element and the
     unstrike on its ::after — because a bare animation-delay reaches the element only. */
  $$('#s-menu .item').forEach((b,i)=>{ const x=first&&b.dataset.go!=='s-pick'; b.classList.toggle('dim',x); b.classList.remove('unx'); b.style.removeProperty('--ud');
    if(opening&&b.dataset.go!=='s-pick'){ const d=i*90; b.style.setProperty('--ud',d+'ms'); b.classList.add('unx'); b.style.pointerEvents='none'; setTimeout(()=>{ b.classList.remove('unx'); b.style.removeProperty('--ud'); b.style.pointerEvents=''; },700+d); } });
  $('#menu-note').textContent=first?MENU.note:'';
  /* v13 (1.3): the card sits above the title; the box holds the requirement and what it opens, nothing else.
     v15 (2.2): it does NOT appear on a fresh profile's first menu open — a player who has not run anything yet is being
     told to play, not handed a target — and it labels itself Next unlock or Next achievement depending on which of the
     two nextGoal() found. Unlocks outrank achievements: the chain is offered until there is none of it left. */
  const ng=first?null:nextGoal(); const nx=$('#nextup'); $('#menu-tag').hidden=!ng;
  if(ng){ nx.innerHTML=T(ng.ach?MENU.nextAch:MENU.next,{need:ng.need,name:ng.name}); nx.hidden=false; nextWhere=Object.assign({need:ng.need},ng.where); } else { nx.hidden=true; nextWhere=null; } }

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
define({ nextup(){ if(nextWhere) goWhere(nextWhere); return 'click'; } });
on('store:reset',()=>{ menuWasFirst=true; });

export { enterMenu, firstRun };
