/* No Excuses — the About screen (build 18, refactor stage 4; was devState / renderTier / freshGame in menu.js). The support
   line, the tier box and the build hint — and nothing else since build 21: v14 (8.10) moved Testing out to its own menu item
   directly below About, in ui/screens/testing.js, so it can be reviewed on its own. */
import { ABOUT, TOAST } from "../../config/copy.js";
import { $ } from "../../core.js";
import { prefs } from "../../core/store.js";
import { define } from "../actions.js";
import { register } from "../router.js";
import { toast } from "../toast.js";

// what supporting gets (v13, 13.1): no comparison table — a thank-you line and three lines of what is included. Pro lengths are gone (0.3)
function renderTier(){ $('#tierbox').innerHTML=ABOUT.tier.map(t=>`<div><span>${t}</span></div>`).join('');
  $('#support-title').textContent=prefs.supporter?ABOUT.supTitleOn:ABOUT.supTitleOff; $('#support-text').textContent=prefs.supporter?ABOUT.supTextOn:ABOUT.supTextOff; }
register('s-about',{ onShow(){ renderTier(); } });
define({ support(){ toast(prefs.supporter?TOAST.supAlready:TOAST.supLater); return 'click'; } });
