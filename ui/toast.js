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
/* v18 (B.12): AN UNLOCK TOAST GOES THERE. `go` is the unlock's own key — 'game:mode' for a mode, 'game:mode:length' for
   a length — and a tap on the toast opens that game's pick sheet at exactly that mode or length, the way an achievement
   toast has opened its row since build 18. It is passed only from the RESULT screen: mid-run a toast stays a toast,
   because the one thing a player is doing then is playing. The toast holds 3200ms when it leads somewhere, like the
   achievement one, so there is time to reach it. */
function toast(msg,ach,cls,html,go){ const t=$('#toast'); clearTimeout(toastT); if(html) t.innerHTML=msg; else t.textContent=msg;
  t.dataset.ach=ach||''; t.dataset.goto=go||''; t.classList.toggle('tap',!!ach||!!go); t.classList.toggle('ok',cls==='ok'); t.classList.add('on');
  cls==='ok'?Snd.unlockFx():Snd.click(); toastT=setTimeout(()=>t.classList.remove('on'),(ach||go)?3200:cls==='ok'?2600:2000); }
/* where an unlock key points. 'sequence:practice' is the one key that is not a mode — Practice from is a row on
   Sequence's own sheet — so it opens Sequence at the mode it belongs to rather than at a mode called "practice". */
function unlockWhere(key){ const [g,d,s]=String(key).split(':');
  if(key==='sequence:practice') return {g:'sequence',d:'solo'};
  return s===undefined?{g,d}:{g,d,s:+s}; }
define({ toast(t){ const id=t.dataset.ach, go=t.dataset.goto;
  if(!id&&!go) return;
  Snd.click(); t.classList.remove('on');
  show(id?'s-prog':'s-pick',id?{ach:id}:unlockWhere(go)); } });

export { toast };
