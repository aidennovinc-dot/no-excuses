/* No Excuses — the toast (build 15, refactor stage 1). Was in progress.js; it is a screen element, not progress.
   Build 18 (refactor stage 4): the toast is a data-act element — a tap on an achievement toast goes to that row. */
import { Snd } from "../audio.js";
import { $ } from "../core.js";
import { TOAST_MS } from "../config/copy.js";
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
/* v21 (G.4, build 37): `quiet` shows the toast and plays nothing. A chest opening had been playing the unlock sound TWICE since
   build 29 — once with the lid (openChest) and again with its green toast 1.6s later — and G.4 asks for one chest-open sound.
   The chest's toast keeps its green; the lid keeps the sound. */
/* v31 (60.25, build 60): TOASTS QUEUE, AND EACH GETS ITS FULL TIME. Until build 59 this function called clearTimeout and
   wrote straight over whatever was on screen, so a run that unlocked two things showed the first for however long it took the
   second to arrive — which on a result screen is a few hundred milliseconds. They line up now: one shows, holds for its own
   time (TOAST_MS, and 3,200 / 2,600 / 2,000 become 5,000 / 4,500 / 3,000 — Aiden's numbers), leaves, and the next arrives
   TOAST_MS.gap later, so two never read as one.
   THE SOUND GOES WITH THE TOAST, not with the call: a queued toast plays when it is shown, or two unlock sounds would land on
   top of each other while only one toast was readable.
   A TAP still navigates and dismisses — and it takes the REST of the queue with it, because the player has said where they are
   going and a toast about something else arriving on the screen they asked for is noise. */
const Q=[]; let showing=false;
function holdOf(t){ return (t.ach||t.go)?TOAST_MS.tap:t.cls==='ok'?TOAST_MS.unlock:TOAST_MS.plain; }
function nextToast(){ const t=$('#toast');
  if(!Q.length){ showing=false; return; }
  showing=true; const it=Q.shift();
  if(it.html) t.innerHTML=it.msg; else t.textContent=it.msg;
  t.dataset.ach=it.ach||''; t.dataset.goto=it.go||''; t.classList.toggle('tap',!!it.ach||!!it.go); t.classList.toggle('ok',it.cls==='ok'); t.classList.add('on');
  if(!it.quiet) it.cls==='ok'?Snd.unlockFx():Snd.click();
  toastT=setTimeout(()=>{ t.classList.remove('on'); toastT=setTimeout(nextToast,TOAST_MS.gap); },holdOf(it)); }
function toast(msg,ach,cls,html,go,quiet){ Q.push({msg,ach,cls,html,go,quiet}); if(!showing) nextToast(); }
// a tap, or a screen the toast no longer belongs on, empties the queue: nothing that was going to be said is said late
function toastClear(){ clearTimeout(toastT); Q.length=0; showing=false; const t=$('#toast'); if(t) t.classList.remove('on'); }
/* where an unlock key points. 'sequence:practice' is the one key that is not a mode — Practice from is a row on
   Sequence's own sheet — so it opens Sequence at the mode it belongs to rather than at a mode called "practice". */
function unlockWhere(key){ const [g,d,s]=String(key).split(':');
  if(key==='sequence:practice') return {g:'sequence',d:'solo'};
  return s===undefined?{g,d}:{g,d,s:+s}; }
define({ toast(t){ const id=t.dataset.ach, go=t.dataset.goto;
  if(!id&&!go) return;
  Snd.click(); toastClear();
  show(id?'s-prog':'s-pick',id?{ach:id}:unlockWhere(go)); } });

export { toast, toastClear };
