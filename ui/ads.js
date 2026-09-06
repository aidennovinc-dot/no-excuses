/* No Excuses — ads (v10): a placeholder slot on the result screen, and a placeholder break every fourth result. Never during a
   run, never for supporters. The real SDK goes in the app build. Build 17 (refactor stage 3): out of app.js. Build 18 (stage 4):
   the break is a data-act overlay — while it is on, only an enabled Skip does anything. */
import { HUD } from "../config/copy.js";
import { $, T } from "../core.js";
import { prefs, save } from "../core/store.js";
import { define } from "./actions.js";

const Ads={ after(cb){ if(prefs.supporter){ cb(); return; } prefs.adRuns=(prefs.adRuns||0)+1; save(); if(prefs.adRuns%4){ cb(); return; }
    const a=$('#adbreak'), b=$('#adskip'); b.disabled=true; b.textContent=T(HUD.skipIn,{n:2}); a.classList.add('on'); this.cb=cb; let n=2; const t=setInterval(()=>{ n--; if(n>0) b.textContent=T(HUD.skipIn,{n}); else { clearInterval(t); b.disabled=false; b.textContent=HUD.skip; } },1000); },
  close(){ $('#adbreak').classList.remove('on'); const cb=this.cb; this.cb=null; if(cb) cb(); } };
define({ adbreak(){}, adskip(b){ if(!b.disabled) Ads.close(); } });

export { Ads };
