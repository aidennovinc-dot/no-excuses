/* No Excuses — Testing (build 21, v14 8.10; was the [data-dev] block at the bottom of the About screen). Fresh game, open
   everything, replay the intro, supporter, and the state line under them. It is its own menu item directly below About so it
   can be reviewed on its own instead of hanging off the end of a screen about something else.

   S5 still holds: a release build has no testing anywhere. BUILD_FLAGS.dev false strips every [data-dev] node in the document
   — the menu item, this screen and anything else that ever carries the attribute — and the store already refuses to read
   `allOpen` / `supporter` out of storage, so nothing here is reachable or plantable in a release build.

   v18 (B.26, build 32): A BUTTON PER ANIMATION — key arrival, segment advance, key complete, chest 1 / 2 / 3 opening — so
   Aiden can watch each one without earning it. Every button plays the REAL animation through the real screen and stores
   nothing: the arrival is asked for with `arrive`, which clears `prefs.keySeen` for that one open only; the advance is a
   fabricated `advance` object the key screen animates over whatever ring is drawn; the whole-key moment is asked for by
   name; a chest opening runs pick.js's own openChest with `demoOnly`, which puts the tile back afterwards. */
import { BUILD_FLAGS } from "../../config/build.js";
import { ABOUT, TOAST } from "../../config/copy.js";
import { $, $$, T } from "../../core.js";
import { prefs, reset, save } from "../../core/store.js";
import { GAMES } from "../../games/registry.js";
import { ACH, Scores, UNLOCKS, got, seedSeen, unlocked } from "../../progress.js";
import { keyAch } from "../../progress/key.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";

function devState(){ if(!BUILD_FLAGS.dev) return; const u=Object.keys(unlocked()).length, a=Object.keys(got()).length, r=Scores.runs().length, na=ACH.length+keyAch().length;
  $('#dev-state').textContent=(prefs.allOpen?ABOUT.devOpen:T(ABOUT.devProg,{u,nu:UNLOCKS.length,a,na}))+T(ABOUT.devRuns,{r})+(prefs.supporter?ABOUT.devSup:ABOUT.devFree);
  $('#dev-open').classList.toggle('sel',!!prefs.allOpen); $('#dev-sup').classList.toggle('sel',!!prefs.supporter);
  const h=$('#dev-anim-hint'); if(h) h.textContent=ABOUT.devAnim; }
// Fresh game: progress goes, the look and the name stay, and the title sequence plays again (L1)
function freshGame(){ reset(); seedSeen(); show('s-menu',{story:true}); }

// build 20 found this as a boot crash waiting to happen: the sweep must not name one screen, because [data-dev] is now on the
// menu item and this whole section as well as anything About keeps
if(!BUILD_FLAGS.dev) $$('[data-dev]').forEach(el=>el.remove());
register('s-testing',{ onShow(){ devState(); } });
// B.26: the first game's first combination is the segment the advance demo lights — a real key, drawn over the ring as it is
const firstKey=()=>{ const g=Object.keys(GAMES)[0]; const d=GAMES[g].modes[0]; return { g, d, key:`${g}:${d}:5`, tier:'clear', was:0, done:1, total:1 }; };
define({
  'dev-open'(){ prefs.allOpen=!prefs.allOpen; save(); devState(); toast(prefs.allOpen?TOAST.devOpenOn:TOAST.devOpenOff); return 'pick'; },
  'dev-sup'(){ prefs.supporter=!prefs.supporter; save(); devState(); toast(prefs.supporter?TOAST.supOn:TOAST.supOff); return 'pick'; },
  'dev-fresh'(){ freshGame(); devState(); toast(TOAST.fresh); return 'pick'; },
  'dev-story'(){ show('s-menu',{story:true}); return 'pick'; },
  // B.26: the animations, each on its own screen, nothing stored
  'dev-keyin'(){ show('s-key',{arrive:1,from:'s-testing'}); return 'pick'; },
  'dev-seg'(){ show('s-key',{advance:firstKey(),from:'s-testing'}); return 'pick'; },
  'dev-whole'(){ show('s-key',{whole:1,from:'s-testing'}); return 'pick'; },
  'dev-chest'(b){ show('s-pick',{chestDemo:+b.dataset.n}); return 'pick'; },
});
