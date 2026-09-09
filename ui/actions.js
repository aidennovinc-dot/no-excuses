/* No Excuses — what a tap does (build 15, refactor stage 1; build 18, stage 4). Every control carries data-act;
   ACTIONS[act](el, ev) does the work and returns the sound — 'pick' for a control that selects something, 'click' for
   everything else, undefined for silence. Since build 18 each screen defines its own handlers with define({...}) and
   the overlays (toast, ad break, lock box, the Next card, the full stop) are ordinary data-act elements, so the
   nearest data-act ancestor of the tap decides. capture(fn) is for the one thing containment cannot express: while
   the title sequence is on, a tap anywhere advances it. A button with no act plays the sound it always did. */
import { Snd } from "../audio.js";
import { $ } from "../core.js";
import { back, show } from "./router.js";

// a tap on a control that picks something is a select(); everything else is a click() (v11)
const isPick=b=>b.classList.contains('chip')||b.classList.contains('choice')||b.classList.contains('tbtn')||b.classList.contains('tile')||b.classList.contains('mch')||b.classList.contains('opt')||b.dataset.vs2!==undefined||!!b.closest('.sw');
const ACTIONS={
  none(b){ return isPick(b)?'pick':'click'; },
  go(b){ show(b.dataset.go); return 'click'; },
  back(){ back(); return 'click'; },
};
const captures=[];
function define(map){ for(const k in map){ if(ACTIONS[k]) throw new Error('data-act defined twice: '+k); ACTIONS[k]=map[k]; } }
function capture(fn){ captures.push(fn); }
function play(s){ if(s==='pick') Snd.select(); else if(s==='click') Snd.click(); }
/* v15 (5.1, build 26): the whole screen layer stops taking taps. A key unlock now INTERRUPTS the result screen and plays
   itself out, and "before the player can input anything" has to mean every route in: a data-act control, a capture, and
   the bare tap on the ground that goes Back. Blocking it here is the only place all three pass through — CSS
   pointer-events would still leave the last of those firing on the body. It is not a screen state: whoever takes the
   lock releases it (ui/screens/result.js, on key:done), so nothing else has to know it exists. */
let locked=false;
const lock=v=>{ locked=!!v; };
function onClick(e){
  if(locked) return;
  const el=e.target.closest('[data-act]');
  if(el){ play((ACTIONS[el.dataset.act]||ACTIONS.none)(el,e)); return; }
  for(const c of captures) if(c(e)) return;
  const b=e.target.closest('button'); if(b){ play(ACTIONS.none(b)); return; }
  // a tap that isn't on a control: every sub-screen goes back
  // v15 (2.1): a chip row is never "not on a control" — a tap that lands between or on top of chips must do nothing, not
  // navigate. This is the belt to .chip.locked's braces: the result screen's mode and length rows sit outside .sheet, so a
  // dead chip there used to read as a tap on the screen and Back out of s-over into game select
  if(e.target.closest('.chips')||e.target.closest('.mchips')) return;
  if(e.target.closest('.sheet')||e.target.closest('#game')||e.target.closest('input')||e.target.closest('#wheelwrap')) return;
  if($('.screen.on')){ Snd.click(); back(); }
}

export { ACTIONS, capture, define, isPick, lock, onClick };
