/* No Excuses — EXCUSES ON SCREEN (build 68, 67.38 / 67.39). progress/excuses.js keeps the tally; this is what the player sees and hears when one is
   made: a tiny shrugging stick figure in the game's line style pops in a corner, one deflating kazoo "bwomp" (Snd.bwomp, the one signature sound),
   and the toast. A run's excuse is said by the result screen with its other toasts (ui/screens/result.js); #10 is said here, because it is not a run
   but the game select map's hidden exit. */
import { EXCUSES } from "../config/excuses.js";
import { EXCUSE_TXT } from "../config/copy.js";
import { $, T } from "../core.js";
import { on } from "../core/events.js";
import { Snd } from "../audio.js";
import { excuseOk, makeExcuse } from "../progress/excuses.js";
import { define } from "./actions.js";
import { toast } from "./toast.js";

const SHRUG_SVG = '<svg viewBox="0 0 64 72" aria-hidden="true"><circle cx="32" cy="13" r="7"/><path d="M32 20v24M32 44l-9 18M32 44l9 18M32 27l-11 5-5-9M32 27l11 5 5-9M12 22l4 1M52 22l-4 1"/></svg>';
function shrug(){ let el=$('#shrug'); if(!el){ el=document.createElement('div'); el.id='shrug'; el.innerHTML=SHRUG_SVG; document.body.appendChild(el); }
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(shrug.t); shrug.t=setTimeout(()=>el.classList.remove('on'),1900); }
// the shrug and the kazoo
function excuseFx(x){ if(!x) return; shrug(); Snd.bwomp(); }
const excuseLine = x => T(EXCUSE_TXT.toast,{n:x.id,name:x.name});

/* ---------- #10: the map's hidden exit ----------
   Pull the game select map down past its top — a finger dragged down, or a wheel turned up, while it is already at the top — and a tiny "exit" shows
   for EXCUSES[9].showMs. A tap on it makes the excuse. Nothing shows during the walkthrough or a profile's first ten minutes. */
const EXIT = EXCUSES.find(e=>e.id===10);
let pull=0, y0=null, exitT=0;
function exitShow(){ const b=$('#exit10'); if(!b||!excuseOk()||!b.hidden) return; b.hidden=false; clearTimeout(exitT); exitT=setTimeout(()=>{ b.hidden=true; },EXIT.showMs); }
function bindExit(){ const s=$('#s-pick'); if(!s||s.dataset.exit) return; s.dataset.exit='1'; const b=$('#exit10'); if(b) b.textContent=EXCUSE_TXT.exit;
  s.addEventListener('touchstart',e=>{ y0=s.scrollTop<=0&&e.touches[0]?e.touches[0].clientY:null; },{passive:true});
  s.addEventListener('touchmove',e=>{ if(y0===null||s.scrollTop>0||!e.touches[0]) return; if(e.touches[0].clientY-y0>=EXIT.pull) exitShow(); },{passive:true});
  s.addEventListener('wheel',e=>{ if(s.scrollTop>0||e.deltaY>=0){ pull=0; return; } pull-=e.deltaY; if(pull>=EXIT.pull){ pull=0; exitShow(); } },{passive:true}); }
bindExit();
// the exit goes when the map does
on('screen:change',({id})=>{ if(id!=='s-pick'){ const x=$('#exit10'); if(x) x.hidden=true; } });
define({ 'excuse-exit'(b){ b.hidden=true; const x=makeExcuse(10); if(x){ toast(excuseLine(x)); excuseFx(x); } return 'pick'; } });

export { excuseFx, excuseLine };
