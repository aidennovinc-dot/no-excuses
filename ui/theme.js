/* No Excuses — the look (build 18, refactor stage 4): the game's colours and the ground tint as CSS variables on the root.
   Was applyPrefs / colOf in menu.js. Re-applied for the selected game whenever a screen shows. */
import { DESIGNS, KEYFILL, PRESS } from "../config/theme.js";
import { on } from "../core/events.js";
import { sel } from "../core/state.js";
import { prefs, save } from "../core/store.js";

const colOf=g=>prefs.col[g]||prefs.col['quick-tap'];
function applyPrefs(g){ const r=document.documentElement.style; const c=colOf(g||sel?.game||prefs.lastGame); r.setProperty('--sq-live',c.sq); r.setProperty('--cue',c.lead); r.setProperty('--cutp',c.cut||c.sq); r.setProperty('--ground',prefs.tint||DESIGNS[prefs.bg].tint);
  // v17 (B.22, build 29): the pressed game's outline. Named in config/theme.js (amber) so the stylesheet never picks a colour
  r.setProperty('--press',PRESS.v);
  // v18 (B.18, build 32): the key-progress outline on game select, named in config/theme.js (lilac)
  r.setProperty('--keyfill',KEYFILL.v); save(); }
applyPrefs(prefs.lastGame);
on('screen:change',({id})=>{ if(id!=='game') applyPrefs(sel.game); });

export { applyPrefs, colOf };
