/* No Excuses — entry point (build 18, refactor stage 4). Everything else has registered itself by the time this runs: the
   store loaded and migrated on import, the screens registered with the router and defined their buttons, the theme applied
   itself. What is left is the order of the first paint: seed "seen", show the first screen, the one-off migration note,
   the click dispatcher, the run's input, the canvas. */
import { TOAST } from "./config/copy.js";
import { T } from "./core.js";
import { prefs, save } from "./core/store.js";
import { seedSeen, seenAll } from "./progress.js";
import { bindInput } from "./run/input.js";
import { onClick } from "./ui/actions.js";
import { startAtmosphere } from "./ui/atmosphere.js";
import { show } from "./ui/router.js";
import { enterMenu } from "./ui/screens/index.js";
import { toast } from "./ui/toast.js";

// v13 (2.1): everything already open on this profile counts as seen, so nothing flashes green on day one
if(!seenAll()) seedSeen();
// a new profile gets the title sequence (L1); a returning one lands on the menu the markup already shows. v14 (1.2): the
// sequence is a state of the menu screen, so the title it lands on is the one the menu keeps — it never re-renders
if(!prefs.story) show('s-menu',{story:true}); else enterMenu();
if(prefs.mig11){ const n=prefs.mig11; setTimeout(()=>toast(T(TOAST.mig11,{n,s:n>1?'s':''})),1200); delete prefs.mig11; save(); }
// v18 (B.2 / B.4): the same courtesy for the build-31 unit change — say it once, then never again
if(prefs.mig31){ const n=prefs.mig31; setTimeout(()=>toast(T(TOAST.mig31,{n,s:n>1?'s':''})),1600); delete prefs.mig31; save(); }
if(prefs.mig32){ const n=prefs.mig32; setTimeout(()=>toast(T(TOAST.mig32,{n,s:n>1?'s':''})),1600); delete prefs.mig32; save(); }
document.addEventListener('click',onClick);
bindInput();
startAtmosphere();
