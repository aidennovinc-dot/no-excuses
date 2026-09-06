/* No Excuses — the router (build 18, refactor stage 4). show(id, opts) puts one screen on and hands opts to that screen's
   onShow; back() asks the screen first (onBack returning true means it moved within itself), then follows the screen's
   data-back — the parent map in the markup is the stack, fixed on purpose so Back never lands on the game layer.
   game() shows the game layer. Every change emits screen:change {id} ('game' for the layer), which is how the
   atmosphere, the theme and the overlays hear about it. The 450ms guard stops a tap that opened a screen closing it. */
import { $, $$ } from "../core.js";
import { emit } from "../core/events.js";

const screens={}; let shownAt=0;
function register(id,screen){ screens[id]=screen; }
function show(id,opts){ $$('.screen').forEach(s=>s.classList.toggle('on',s.id===id)); $('#game').classList.remove('on','versus','bigc','live','shake'); shownAt=performance.now();
  emit('screen:change',{id}); if(screens[id]&&screens[id].onShow) screens[id].onShow(opts||{}); }
function game(){ $$('.screen').forEach(s=>s.classList.remove('on')); $('#game').classList.add('on'); emit('screen:change',{id:'game'}); }
function back(){ if(performance.now()-shownAt<450) return; const s=$('.screen.on'); if(!s) return; if(screens[s.id]&&screens[s.id].onBack&&screens[s.id].onBack()) return; if(s.dataset.back) show(s.dataset.back); }
const current=()=>{ const s=$('.screen.on'); return s?s.id:null; };

export { back, current, game, register, show };
