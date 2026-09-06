/* No Excuses — the toast (build 15, refactor stage 1). Was in progress.js; it is a screen element, not progress. */
import { Snd } from "../audio.js";
import { $ } from "../core.js";

let toastT=0;
// toast(msg, achId): an achievement toast is tappable and goes to that row; on the result screen every toast sits low, clear of the score (v8)
// build 14 (S1): the message is text. `html` is the opt-in for the achievement toasts, whose markup is the config swatch and nothing from the player
function toast(msg,ach,cls,html){ const t=$('#toast'); clearTimeout(toastT); if(html) t.innerHTML=msg; else t.textContent=msg; t.dataset.ach=ach||''; t.classList.toggle('tap',!!ach); t.classList.toggle('ok',cls==='ok'); t.classList.add('on'); cls==='ok'?Snd.go():Snd.click(); toastT=setTimeout(()=>t.classList.remove('on'),ach?3200:cls==='ok'?2600:2000); }

export { toast };
