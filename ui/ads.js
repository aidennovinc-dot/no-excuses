/* No Excuses — ads (v10): a placeholder slot on the result screen, and a placeholder break every fourth result. Never during a
   run, never for supporters. The real SDK goes in the app build. Build 17 (refactor stage 3): out of app.js. Build 18 (stage 4):
   the break is a data-act overlay — while it is on, only an enabled Skip does anything. */
import { HUD } from "../config/copy.js";
import { ADS, STREAK } from "../config/games.js";
import { $, T } from "../core.js";
import { prefs, save } from "../core/store.js";
import { define } from "./actions.js";

/* v31 (60.28, build 60): AIDEN'S RULES OF 2026-09-18, ALL OF THEM, read off config/games.js ADS. Until build 59 this honoured
   one of the five — supporters — and showed a break every FOURTH result whatever the run was and however new the player.
   `show(run)` is the whole policy in one place and answers whether this result gets one; `after` only draws it. The count is
   still `prefs.adRuns` and still counts every result, because "one per five RUNS" is about how often the player is interrupted,
   not about how often they finish a countable one. */
const Ads={
  show(run){ if(prefs.supporter) return false;
    if(!ADS.streak&&run&&run.s===STREAK) return false;
    const first=prefs.firstRun||0;
    if(!first||Date.now()-first<ADS.graceMs) return false;
    return (prefs.adRuns||0)%ADS.everyN===0; },
  after(cb,run){ prefs.adRuns=(prefs.adRuns||0)+1;
    // the clock a new player's ten minutes runs from: their first finished run, written once and never again
    if(!prefs.firstRun) prefs.firstRun=Date.now();
    save();
    if(!this.show(run)){ cb(); return; }
    const a=$('#adbreak'), b=$('#adskip'); b.disabled=true; b.textContent=T(HUD.skipIn,{n:2}); a.classList.add('on'); this.cb=cb; let n=2; const t=setInterval(()=>{ n--; if(n>0) b.textContent=T(HUD.skipIn,{n}); else { clearInterval(t); b.disabled=false; b.textContent=HUD.skip; } },1000); },
  close(){ $('#adbreak').classList.remove('on'); const cb=this.cb; this.cb=null; if(cb) cb(); } };
define({ adbreak(){}, adskip(b){ if(!b.disabled) Ads.close(); } });

export { Ads };
