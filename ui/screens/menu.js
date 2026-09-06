/* No Excuses — the menu (build 18, refactor stage 4; was renderMenu / menuIn / firstRun in menu.js). Five items, the Next
   achievement card above the title (v13 1.3) and the first-experience dimming (v10 / v11). The card's tap starts the run
   it names through run.goWhere. */
import { MENU } from "../../config/copy.js";
import { $, $$, T } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { CHAL } from "../../core/platform.js";
import { prefs } from "../../core/store.js";
import { Scores, nextGoal, setPendingAim } from "../../progress.js";
import { goWhere } from "../../run/run.js";
import { define } from "../actions.js";
import { register } from "../router.js";

// first experience (v10): until one run is on the record only Play is live. v11: the rest are crossed out, and the strike wipes off the moment they open
const firstRun=()=>!prefs.played&&!Scores.runs().length&&!prefs.allOpen;
let menuWasFirst=firstRun(), nextWhere=null;
// first open only: title fades up, then the menu fades in under it (v7). The class comes off once it has played so hover/focus opacity works again
function menuIn(){ $('#s-menu').classList.add('intro'); setTimeout(()=>$('#s-menu').classList.remove('intro'),2400); }
function renderMenu(){ const first=firstRun(); const opening=menuWasFirst&&!first; menuWasFirst=first;
  $$('#s-menu .item').forEach(b=>{ const x=first&&b.dataset.go!=='s-pick'; b.classList.toggle('dim',x); b.classList.remove('unx'); if(opening&&b.dataset.go!=='s-pick'){ b.classList.add('unx'); b.style.pointerEvents='none'; setTimeout(()=>{ b.classList.remove('unx'); b.style.pointerEvents=''; },700); } });
  $('#menu-note').textContent=first?MENU.note:'';
  // v13 (1.3): the card sits above the title, labelled Next achievement; the box holds the requirement and what it opens, nothing else
  const ng=nextGoal(); const nx=$('#nextup'); $('#menu-tag').hidden=!ng; if(ng){ nx.innerHTML=T(MENU.next,{need:ng.need,game:ng.gname,name:ng.name}); nx.hidden=false; nextWhere=Object.assign({need:ng.need},ng.where); } else { nx.hidden=true; nextWhere=null; } }
// a returning player boots straight onto the menu the markup already shows: the fade plays, and a challenge link opens its sheet
function enterMenu(){ menuIn(); if(CHAL) setTimeout(()=>emit('challenge',CHAL),300); }

register('s-menu',{ onShow({intro}){ setPendingAim(''); renderMenu(); if(intro) menuIn(); } });
define({ nextup(){ if(nextWhere) goWhere(nextWhere); return 'click'; } });
on('store:reset',()=>{ menuWasFirst=true; });

export { enterMenu, firstRun };
