/* No Excuses — the lock box (build 18, refactor stage 4; was askUnlock / lockGo in menu.js). A locked game, mode or length
   (v10): say what it takes and offer to go straight there — into the game, with the goal line up. Opened by a lock:ask
   event from whichever screen was tapped; Try to unlock hands the goal to run.goWhere. v13 (3.8): the box shows the goal
   for the thing that was tapped, and `aim` carries that same goal into the run it starts — never the first unearned step. */
import { LOCK } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T } from "../../core.js";
import { on } from "../../core/events.js";
import { GAMES } from "../../games/registry.js";
import { UNLOCKS, lenLock, unlockName } from "../../progress.js";
import { goWhere } from "../../run/run.js";
import { define } from "../actions.js";

let lockGo=null;
const close=()=>$('#lockwrap').classList.remove('on');
function askUnlock(g,d,s){ if(s!==undefined){ const L=lenLock(g,d,s); if(!L) return; $('#lock-text').innerHTML=T(LOCK.text,{name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${L.name}`,need:L.need}); lockGo=Object.assign({need:L.need,aim:g+':'+d+':'+s},L); $('#lockwrap').classList.add('on'); return; }
  const u=UNLOCKS.find(u=>u.key===g+':'+d); if(!u) return; $('#lock-text').innerHTML=T(LOCK.text,{name:unlockName(u.key),need:u.need}); lockGo=Object.assign({need:u.need,aim:u.key},u.where); $('#lockwrap').classList.add('on'); }
on('lock:ask',({g,d,s})=>askUnlock(g,d,s));
on('screen:change',({id})=>{ if(id==='game') close(); });
define({
  'lock-go'(){ close(); goWhere(lockGo); return 'click'; },
  'lock-no'(){ close(); return 'click'; },
  // a tap on the dimmed ground around the box closes it; inside the box, only the two buttons do anything
  lockwrap(el,e){ if(e.target.closest('#lockbox')) return; close(); return 'click'; },
});
