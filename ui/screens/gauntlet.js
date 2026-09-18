/* No Excuses — a Gauntlet's placeholder screen (v26 item 13, build 49). The two Gauntlets are game tiles on the map (ui/screens/pick.js), each opened by
   the chest beside it — Gauntlet with the Skill chest, Gauntlet II with the Pro chest. What a Gauntlet actually IS is designed separately, by Aiden and
   Claude, after this build, so an open tile leads here: its title, "Coming soon" and Back, and nothing else — no scores, no achievements.
   v27 (item 8, build 52): OPENING THIS SCREEN IS "PLAYING THE GAUNTLET", and it is what opens that Gauntlet's message slot. The slot's condition is
   "first time Gauntlet is opened", and while the Gauntlet is a placeholder, arriving here is the whole of opening it — the flag moves to the real
   first run the day there is one, and nothing else changes, because config/messages.js asks progress/key.js and not this screen. */
import { GAUNTLET } from "../../config/copy.js";
import { $ } from "../../core.js";
import { prefs, save } from "../../core/store.js";
import { register } from "../router.js";

register('s-gauntlet',{ onShow({id}={}){ $('#gt-title').textContent=GAUNTLET.name[id]||''; $('#gt-soon').textContent=GAUNTLET.soon;
  if(id&&!(prefs.gauntSeen||{})[id]){ prefs.gauntSeen=Object.assign({},prefs.gauntSeen,{[id]:1}); save(); } } });
