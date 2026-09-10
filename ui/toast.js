/* No Excuses — the toast (build 15, refactor stage 1). Was in progress.js; it is a screen element, not progress.
   Build 18 (refactor stage 4): the toast is a data-act element — a tap on an achievement toast goes to that row. */
import { Snd } from "../audio.js";
import { $ } from "../core.js";
import { define } from "./actions.js";
import { show } from "./router.js";

let toastT=0;
// toast(msg, achId): an achievement toast is tappable and goes to that row; on the result screen every toast sits low, clear of the score (v8)
// v16 (1.6): an 'ok' toast is an UNLOCK and it gets its own sound, audibly bigger than the achievement's. The achievement
// path (Snd.click) is untouched — Aiden's note was that achievements already sound right
// build 14 (S1): the message is text. `html` is the opt-in for the achievement toasts, whose markup is the config swatch and nothing from the player
function toast(msg,ach,cls,html){ const t=$('#toast'); clearTimeout(toastT); if(html) t.innerHTML=msg; else t.textContent=msg; t.dataset.ach=ach||''; t.classList.toggle('tap',!!ach); t.classList.toggle('ok',cls==='ok'); t.classList.add('on'); cls==='ok'?Snd.unlockFx():Snd.click(); toastT=setTimeout(()=>t.classList.remove('on'),ach?3200:cls==='ok'?2600:2000); }
define({ toast(t){ const id=t.dataset.ach; if(id){ Snd.click(); t.classList.remove('on'); show('s-ach',{ach:id}); } } });

export { toast };
