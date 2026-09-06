/* No Excuses — the edges of the web platform (build 15, refactor stage 1): today the challenge deep link.
   Share, haptics, the update poll and the storage adapter join it in Stage 5, when this file becomes the only
   one that knows whether it is running in a browser or the Capacitor shell (A8). */
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

export { CHAL, parseChallenge };
