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
// a new profile gets the title sequence (L1); a returning one lands on the menu the markup already shows
if(!prefs.story) show('s-story'); else enterMenu();
if(prefs.mig11){ const n=prefs.mig11; setTimeout(()=>toast(T(TOAST.mig11,{n,s:n>1?'s':''})),1200); delete prefs.mig11; save(); }
document.addEventListener('click',onClick);
bindInput();
startAtmosphere();
