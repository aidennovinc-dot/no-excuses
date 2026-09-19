/* No Excuses — the look (build 18, refactor stage 4): the game's colours and the ground tint as CSS variables on the root.
   Was applyPrefs / colOf in menu.js. Re-applied for the selected game whenever a screen shows. */
import { DESIGNS, KEYFILL, PRESS } from "../config/theme.js";
import { on } from "../core/events.js";
import { sel } from "../core/state.js";
import { look, lookCol, prefs, save } from "../core/store.js";

/* v23 (L.11a, build 40): what is DRAWN reads the look, not the choice — until the Games chest opens Customise is locked and the
   defaults apply (white target, red lead, the stock background); every choice stays stored and applies the moment it opens.
   Customise's own swatches still read prefs directly: that screen is the choice, and it cannot be opened before then. */
const colOf=g=>lookCol(g);
/* v29 Section A (57.11b, build 57): `--ground` IS THE DESIGN'S OWN GROUND AND NOTHING ELSE. It used to be `look('tint') || the design's` — the
   colour picked from the wheel — and every panel, border, line and tile colour in the sheet is color-mix'd from `--ground`, which is exactly Aiden's
   "it colours everything on screen, text and borders included". The picked colour is painted on the BACKGROUND LAYER instead (ui/atmosphere.js), so
   it sits under every screen and tints nothing above it. */
function applyPrefs(g){ const r=document.documentElement.style; const c=colOf(g||sel?.game||prefs.lastGame); r.setProperty('--sq-live',c.sq); r.setProperty('--cue',c.lead); r.setProperty('--cutp',c.cut||c.sq); r.setProperty('--ground',DESIGNS[look('bg')].tint);
  // v17 (B.22, build 29): the pressed game's outline. Named in config/theme.js (amber) so the stylesheet never picks a colour
  r.setProperty('--press',PRESS.v);
  // v18 (B.18, build 32): the key-progress outline on game select, named in config/theme.js (lilac)
  // build 55 (in passing): applyPrefs runs on EVERY screen change and nothing in it changes the store, so the save() wrote the whole record to localStorage on every navigation
  r.setProperty('--keyfill',KEYFILL.v); }
applyPrefs(prefs.lastGame);
on('screen:change',({id})=>{ if(id!=='game') applyPrefs(sel.game); });

export { applyPrefs, colOf };
