/* No Excuses — the title sequence (build 18, refactor stage 4; was Story in menu.js). Three lines, one after another, then
   the title lands (v11, L1). Plays for every new profile and after Fresh game; About → replay the intro brings it back.
   While it is on, a tap anywhere advances it — that is the one capture in ui/actions.js. */
import { Snd } from "../../audio.js";
import { $ } from "../../core.js";
import { emit } from "../../core/events.js";
import { CHAL } from "../../core/platform.js";
import { prefs, save } from "../../core/store.js";
import { capture } from "../actions.js";
import { register, show } from "../router.js";

register('s-story',{ onShow(){ const st=$('#s-story'); st.classList.remove('run'); void st.offsetWidth; st.classList.add('run'); } });
function next(){ Snd.click(); prefs.story=1; save(); show('s-menu',{intro:true});
  // v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
  if(CHAL) setTimeout(()=>emit('challenge',CHAL),250); }
capture(()=>{ if(!$('#s-story').classList.contains('on')) return false; next(); return true; });
