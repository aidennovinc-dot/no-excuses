/* No Excuses — the About screen (build 18, refactor stage 4; was devState / renderTier / freshGame in menu.js). The support
   line and the tier box, the build hint, and — only while BUILD_FLAGS.dev is on (S5) — the testing row: fresh game, open
   everything, replay the intro, supporter. The release build has no testing block at all. */
import { BUILD_FLAGS } from "../../config/build.js";
import { ABOUT, TOAST } from "../../config/copy.js";
import { $, T } from "../../core.js";
import { prefs, reset, save } from "../../core/store.js";
import { ACH, Scores, UNLOCKS, got, seedSeen, unlocked } from "../../progress.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";

// what supporting gets (v13, 13.1): no comparison table — a thank-you line and three lines of what is included. Pro lengths are gone (0.3)
function renderTier(){ $('#tierbox').innerHTML=ABOUT.tier.map(t=>`<div><span>${t}</span></div>`).join('');
  $('#support-title').textContent=prefs.supporter?ABOUT.supTitleOn:ABOUT.supTitleOff; $('#support-text').textContent=prefs.supporter?ABOUT.supTextOn:ABOUT.supTextOff; }
function devState(){ renderTier(); if(!BUILD_FLAGS.dev) return; const u=Object.keys(unlocked()).length, a=Object.keys(got()).length, r=Scores.runs().length;
  $('#dev-state').textContent=(prefs.allOpen?ABOUT.devOpen:T(ABOUT.devProg,{u,nu:UNLOCKS.length,a,na:ACH.length}))+T(ABOUT.devRuns,{r})+(prefs.supporter?ABOUT.devSup:ABOUT.devFree);
  $('#dev-open').classList.toggle('sel',!!prefs.allOpen); $('#dev-sup').classList.toggle('sel',!!prefs.supporter); }
// Fresh game: progress goes, the look and the name stay, and the title sequence plays again (L1)
function freshGame(){ reset(); seedSeen(); show('s-story'); }

if(!BUILD_FLAGS.dev) $('#testing').remove();
register('s-about',{ onShow(){ devState(); } });
define({
  support(){ toast(prefs.supporter?TOAST.supAlready:TOAST.supLater); return 'click'; },
  'dev-open'(){ prefs.allOpen=!prefs.allOpen; save(); devState(); toast(prefs.allOpen?TOAST.devOpenOn:TOAST.devOpenOff); return 'pick'; },
  'dev-sup'(){ prefs.supporter=!prefs.supporter; save(); devState(); toast(prefs.supporter?TOAST.supOn:TOAST.supOff); return 'pick'; },
  'dev-fresh'(){ freshGame(); devState(); toast(TOAST.fresh); return 'pick'; },
  'dev-story'(){ show('s-story'); return 'pick'; },
});
