/* No Excuses — the shell's input for the run (build 18, refactor stage 4; was the bottom half of boot.js). Every pointer
   event on the game layer becomes one input for run/run.js — { type, x, y, el, target, player, raw } — and the engine
   behind it is never named here. The keyboard is for the desk. */
import { $, $$ } from "../core.js";
import { sel } from "../core/state.js";
import { define } from "../ui/actions.js";
import { abort, active, input, introActive, introTap } from "./run.js";

define({ quit(){ abort(); return 'click'; }, seqdone(){ input({type:'act',target:'seqdone'}); return 'click'; } });

const ptr=(e,type,more)=>Object.assign({ type, x:e.clientX, y:e.clientY, el:e.target, raw:e },more);
function bindInput(){
  // a tap during the intro does nothing at all (v8) — it used to skip, and a stray touch left people confused
  // v16 (A.3): a tap during the intro still does nothing — EXCEPT the one that answers "Ready?" on a player's first run
  // of a game. introTap() returns false unless the intro is actually waiting, so every other stray touch is still eaten
  document.addEventListener('pointerdown',e=>{ if(introActive()&&e.target.closest('#game')&&!e.target.closest('#quit')){ e.stopPropagation(); e.preventDefault(); introTap(); } },true);
  $$('[data-vs-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); const [pl,i]=p.dataset.vsSide.split(':').map(Number); input(ptr(e,'down',{player:pl,target:i})); }));
  $('#vfield').addEventListener('pointerdown',e=>{ e.preventDefault(); input(ptr(e,'down')); });
  $$('.pad[data-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); input(ptr(e,'down',{target:+p.dataset.side})); }));
  $('#field').addEventListener('pointerdown',e=>{ e.preventDefault(); input(ptr(e,'down')); });
  $('#hfield').addEventListener('pointerdown',e=>{ e.preventDefault(); input(ptr(e,'down')); });
  $('#hfield').addEventListener('pointermove',e=>{ input(ptr(e,'move')); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>$('#hfield').addEventListener(ev,e=>input(ptr(e,'up'))));
  $('#seq').addEventListener('pointerdown',e=>{ const k=e.target.closest('.key'); if(k){ e.preventDefault(); input(ptr(e,'down',{target:+k.dataset.k})); } });
  $('#gen').addEventListener('pointerdown',e=>{ e.preventDefault(); input(ptr(e,'down')); });
  // Escape quits; space is the tap in Timing, Reaction and Estimate; arrows are Quick Tap's pads; 1–7 are Sequence's keys
  window.addEventListener('keydown',e=>{ if(!active()||e.repeat) return;
    if(e.key==='Escape') return abort();
    const key={ type:'down', x:0, y:0, el:document.body };
    if((sel.game==='timing'||sel.game==='reaction'||sel.game==='hold')&&e.key===' ') input(key);
    if(sel.game==='quick-tap'){ const m={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3}; if(e.key in m) input({...key,target:m[e.key]}); }
    if(sel.game==='sequence'&&/^[1-7]$/.test(e.key)) input({...key,target:+e.key-1}); });
  window.addEventListener('keyup',e=>{ if(sel.game==='hold'&&e.key===' ') input({ type:'up', x:0, y:0, el:document.body }); });
}
export { bindInput };
