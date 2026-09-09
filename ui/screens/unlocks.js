/* No Excuses — the Unlocks screen (build 23, v15 §2.4). The menu used to put the whole chain and every achievement behind
   one item called Achievements. They are two different things: an UNLOCK opens something you could not play before, an
   achievement is a mark on a thing you already have. This screen is the first half — every requirement that opens
   something — and ui/screens/achievements.js keeps the second.

   L6: nothing here is a second copy of a requirement. Every line on this page comes out of UNLOCKS and lenLock() in
   progress.js, exactly as the lock box, the goal line and the Next card do. A tap on a locked row opens the same lock box
   the pick sheet opens, so the discovery route §2.1 built works from here too.

   SHELL ONLY, and deliberately so: what sits behind keys 2 and 3 is register #372 and is not decided (v15 §2.4 / §5.3).
   The key section says what is true today — the first key is earned here — and links to the key screen for the rest. */
import { UNLOCKS_SCREEN } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T } from "../../core.js";
import { emit } from "../../core/events.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { UNLOCKS, gameOpen, isOpen, lenLock, markSeen, newMark, unlockName, unlocked } from "../../progress.js";
import { keyState } from "../../progress/key.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";

const row=(cls,name,need,state,data)=>`<button data-act="unl" class="urow ${cls}"${data}><span>${name}</span><em>${state}</em><small>${need}</small></button>`;
function renderUnlocks(){
  const u=unlocked(); const fresh=[];
  // the chain, in the order it is earned. A row is open when its key is in the store or its game is open from the start
  const chain=UNLOCKS.map(x=>{ const [g,d]=x.key.split(':'); const open=x.key==='sequence:practice'?!!u[x.key]:isOpen(g,d);
    const nw=open?newMark('mode:'+g+':'+d,fresh):'';
    return row('u'+(open?' done':' lock')+nw,unlockName(x.key),open?'':x.need,open?UNLOCKS_SCREEN.done:UNLOCKS_SCREEN.locked,` data-g="${g}" data-d="${d}"`); }).join('');
  // every length of every mode, from lenLock — the same call the pick sheet's crossed-out rows make
  const lens=[];
  for(const g in GAMES){ if(!gameOpen(g)) continue; for(const d of GAMES[g].modes) for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(!L&&GC(g,d).lens.indexOf(s)===0) continue;
    const name=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,s,d)}`;
    lens.push(row('u'+(L?' lock':' done'),name,L?L.need:'',L?UNLOCKS_SCREEN.locked:UNLOCKS_SCREEN.done,` data-g="${g}" data-d="${d}" data-s="${s}"`)); } }
  const k=keyState();
  $('#unl-list').innerHTML=
    `<h4>${UNLOCKS_SCREEN.games}</h4>${chain}`+
    `<h4>${UNLOCKS_SCREEN.lens}</h4>${lens.join('')||''}`+
    `<h4>${UNLOCKS_SCREEN.keys}</h4>`+
    row('u key'+(k.done>=k.total?' done':' lock'),UNLOCKS_SCREEN.keys,UNLOCKS_SCREEN.keyLine,`${k.done}/${k.total}`,' data-key="1"');
  markSeen(fresh);
}
register('s-unl',{ onShow(){ renderUnlocks(); } });
define({
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  unl(b){ if(b.dataset.key) { show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    show('s-pick',{g,d,s:len}); return 'click'; },
});
