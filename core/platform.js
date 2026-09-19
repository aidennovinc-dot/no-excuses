/* No Excuses — the edges of the web platform (build 15, refactor stage 1): today the challenge deep link.
   Share, haptics, the update poll and the storage adapter join it in Stage 5, when this file becomes the only
   one that knows whether it is running in a browser or the Capacitor shell (A8). */
import { BUILD, TARGET } from "../config/build.js";
import { GAMES, GC } from "../games/registry.js";

/* ---------- a challenge link (v13, 3.6): ?g=quick-tap&d=two&s=5&score=31 opens that pick sheet after the title sequence,
   with the game open for this run only. Nothing is written to the unlock store ---------- */
// build 14 (S2): one parser. g must be a game, d one of its modes (absent → the first), s an integer in that mode's lengths (absent → none), score a finite number (else none). Anything else is no challenge at all
function parseChallenge(search){ try{ const q=new URLSearchParams(search); const g=q.get('g'); if(!g||!GAMES[g]) return null;
  const dq=q.get('d'); if(dq!==null&&!GAMES[g].modes.includes(dq)) return null; const d=dq===null?GAMES[g].modes[0]:dq;
  const sq=q.get('s'); let s; if(sq!==null){ if(!/^-?\d+$/.test(sq)) return null; s=parseInt(sq,10); if(!GC(g,d).lens.includes(s)) return null; }
  const scq=q.get('score'); const n=scq===null||scq===''?NaN:Number(scq); const score=Number.isFinite(n)?n:'';
  return { g, d, s, score }; }catch(e){ return null; } }
const CHAL=parseChallenge(location.search);

/* ---------- v29 (item 15, build 55): ONE HAPTIC (A8) ----------
   navigator.vibrate was called directly from eleven places across six engines, each behind its own `if(navigator.vibrate)` guard. iOS
   WebKit does not implement the Vibration API at all, so every one of those guards is a no-op on the phone this game is being built
   for - and the day the Capacitor Haptics plugin lands, eleven call sites have to find it. A8 says this file is the one that knows
   what it is running inside. Engines call haptic(ms); this is where the plugin goes, and nowhere else changes. */
const haptic = ms => { try{ if(navigator.vibrate) navigator.vibrate(ms||30); }catch(e){} };

/* ---------- v29 (item 7, build 55): THE UPDATE POLL (S7) ----------
   It was an inline <script> in index.html, with the build number written into it a fourth time, and it ran everywhere: no https: gate,
   no native gate. Under Capacitor scripts/native.mjs copies index.html and version.json into the bundle untouched, so it fetched the
   bundled file and compared the bundle to itself; point a native build at a live URL (a Capacitor server.url live-update setup) and the
   green bar pins on and location.reload loops. On a http: or file: dev server it ran for nothing. S7 says https: only and never in the
   shell, and A8 says this file is the one that knows which it is inside - so this is where it belongs. Adding the CSP made the move
   compulsory as well as correct: an inline script is refused under `default-src 'self'`.
   BUILD comes from config/build.js, which is A6's one place; the poll no longer needs its own copy of the number. */
function updatePoll(){ if(TARGET==='native'||location.protocol!=='https:') return;
  const check=async()=>{ try{ const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'}); const j=await r.json();
    // v18 (S.2): the bar names the build it found in the v0.N form a person reads; BUILD and j.build stay the bare integer (A6)
    if(j.build&&String(j.build)!==String(BUILD)){ const u=document.getElementById('update'); if(!u) return;
      u.textContent='v0.'+j.build+' is ready \u2014 tap to reload'; u.classList.add('on'); u.onclick=()=>location.reload(); } }catch(e){} };
  check(); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); }); }
updatePoll();

export { CHAL, haptic, parseChallenge, updatePoll };
