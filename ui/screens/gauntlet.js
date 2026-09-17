/* No Excuses — a Gauntlet's placeholder screen (v26 item 13, build 49). The two Gauntlets are game tiles on the map (ui/screens/pick.js), each opened by
   the chest beside it — Gauntlet with the Skill chest, Gauntlet II with the Pro chest. What a Gauntlet actually IS is designed separately, by Aiden and
   Claude, after this build, so an open tile leads here: its title, "Coming soon" and Back, and nothing else — no scores, no achievements. */
import { GAUNTLET } from "../../config/copy.js";
import { $ } from "../../core.js";
import { register } from "../router.js";

register('s-gauntlet',{ onShow({id}={}){ $('#gt-title').textContent=GAUNTLET.name[id]||''; $('#gt-soon').textContent=GAUNTLET.soon; } });
