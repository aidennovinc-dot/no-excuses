/* No Excuses — the About screen (build 18, refactor stage 4; was devState / renderTier / freshGame in menu.js). The support
   line, the tier box, Send feedback and the build hint — nothing else since build 21: v14 (8.10) moved Testing out to its
   own menu item directly below About, in ui/screens/testing.js, so it can be reviewed on its own. */
import { BUILD } from "../../config/build.js";
import { ABOUT, TOAST } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T } from "../../core.js";
import { prefs } from "../../core/store.js";
import { GAMES, lenName } from "../../games/registry.js";
import { Scores } from "../../progress.js";
import { define } from "../actions.js";
import { register } from "../router.js";
import { toast } from "../toast.js";

// what supporting gets (v13, 13.1): no comparison table — a thank-you line and three lines of what is included. Pro lengths are gone (0.3)
function renderTier(){ $('#tierbox').innerHTML=ABOUT.tier.map(t=>`<div><span>${t}</span></div>`).join('');
  $('#support-title').textContent=prefs.supporter?ABOUT.supTitleOn:ABOUT.supTitleOff; $('#support-text').textContent=prefs.supporter?ABOUT.supTextOn:ABOUT.supTextOff; }

/* build 33 — SEND FEEDBACK (the beta paragraph, item 1). GitHub Pages is already the beta channel; what was missing was
   the way back from a tester. It is a mailto, built when the screen opens: no form, no endpoint, no third party, and
   nothing sent without the tester's own mail app and their own send button. The three things a report is useless
   without — which build, which device, which run — are filled in, because nobody thinks to include them.
   It is an <a>, not a button with a handler: `data-act="none"` gives it the click sound and lets the link do its own
   work, so nothing here has to know what a mail client is. */
const lastRun=()=>{ const rs=Scores.runs(); if(!rs||!rs.length) return ABOUT.fbNoRun;
  const r=rs.reduce((a,b)=>b.t>a.t?b:a);
  const g=GAMES[r.g]; if(!g) return ABOUT.fbNoRun;
  return `${g.name}${MODE_NAME[r.d]?' · '+MODE_NAME[r.d]:''} · ${lenName(r.g,r.s,r.d)} · ${r.hits}${r.practice?' (practice)':''} · ${new Date(r.t).toISOString().slice(0,16).replace('T',' ')}`; };
const device=()=>`${navigator.userAgent} · ${innerWidth}x${innerHeight} @${devicePixelRatio||1}x`;
function renderFeedback(){ const a=$('#feedback'); if(!a) return; const build='v0.'+BUILD;
  const q=s=>encodeURIComponent(s);
  a.textContent=ABOUT.fb;
  a.href=`mailto:${ABOUT.fbTo}?subject=${q(T(ABOUT.fbSubject,{build}))}`
    +`&body=${q(T(ABOUT.fbBody,{build,when:new Date().toISOString().slice(0,16).replace('T',' '),device:device(),run:lastRun()}))}`; }

register('s-about',{ onShow(){ renderTier(); renderFeedback(); } });
define({ support(){ toast(prefs.supporter?TOAST.supAlready:TOAST.supLater); return 'click'; } });
