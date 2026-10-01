/* No Excuses — WHEN THE HOME MENU'S SCORES, PROGRESS AND ABOUT OPEN (build 65, 64.7; replaces build 64's 62.14, where all three opened on the
   walkthrough's last box). Each opens at its own moment, the one `MENU_UNLOCK` (config/unlocks.js) names:
     About     — when the Welcome video (the About message Dots opens, 62.12) finishes. Nothing else opens then.
     Progress  — when the first Estimate run is on record.
     Scores    — when the first Reaction run is on record.
   `prefs.menuUnl` is what has opened, `{ about | prog | board: when }` — PROGRESS, so Fresh game clears it. A profile from before build 65 that had
   the three open (the walkthrough behind it, or a player from before the walkthrough) keeps them: core/store.js fills the field in once, the first
   time it loads without one. Testing's open-everything opens all three, and so does the Games chest (Testing's chest switches reach it with no run
   on record — the rule v25 item 9 wrote for the rest of the menu). Opening one is an unlock like any other: it toasts, and it arms that item's
   first-time tutorial (ui/tutorial.js). */
import { MENU_UNLOCK } from "../config/unlocks.js";
import { emit } from "../core/events.js";
import { prefs, save } from "../core/store.js";
import { chestOpen } from "./key.js";

const keyOf=go=>Object.keys(MENU_UNLOCK).find(k=>MENU_UNLOCK[k].go===go)||null;
// whether a home menu item is open; an item this file does not govern (Play, Keys, Customise, Testing) is not its business and says yes
function menuOpen(go){ const k=keyOf(go); if(!k) return true; return !!prefs.allOpen||!!(prefs.menuUnl||{})[k]||chestOpen('games'); }
// banks one item; true the first time only
// build 66.1: and says so, so a menu already on screen redraws the item open (ui/screens/menu.js)
function bankMenu(k){ if(!MENU_UNLOCK[k]||(prefs.menuUnl||{})[k]) return false; prefs.menuUnl=Object.assign({},prefs.menuUnl,{[k]:Date.now()}); save(); emit('menu:opened',{ k }); return true; }
/* what a finished run opens — its game's first real run. Two-player, practice, challenge and demo runs open nothing (L10); the caller has already
   turned those away, like every other earn. Returned the way a run's unlocks are, so the result screen toasts them in the same queue */
function menuEarn(run){ const out=[]; for(const k in MENU_UNLOCK){ const m=MENU_UNLOCK[k]; if(m.game&&m.game===run.g&&!menuOpen(m.go)&&bankMenu(k)) out.push({ key:'menu:'+k, menu:k, name:m.name }); } return out; }

export { bankMenu, keyOf as menuKey, menuEarn, menuOpen };
