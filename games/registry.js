/* No Excuses — the GAMES table's accessors (build 16, refactor stage 2). The table itself is data in config/games.js;
   a new game is one entry there plus an engine. GC merges a game's `per`-mode and `streak` overlays; GV looks a
   function up in a table keyed the same way ('g', 'g:d', 'g:streak', 'g:d:streak') — ui/format.js and progress/rules.js
   keep their formatters and predicates under those keys. */
import { GAMES, LEN_NAME, SET_COPY, STREAK } from "../config/games.js";
import VX from "./_shared/versus.js";
import DT from "./dots/index.js";
import HD from "./estimate/index.js";
import QT from "./quick-tap/index.js";
import RX from "./reaction/index.js";
import SQ from "./sequence/index.js";
import SP from "./spot/index.js";
import TM from "./timing/index.js";

// build 17 (refactor stage 3): the engines by id — run/run.js is the only caller. A new game = one folder + one line here + config rows.
// VERSUS is the one-phone-two-ends engine Quick Tap and Dots share
const ENGINES={ 'quick-tap':QT, 'dots':DT, 'hold':HD, 'sequence':SQ, 'timing':TM, 'reaction':RX, 'spot':SP };
const VERSUS=VX;

const N_GAMES=Object.keys(GAMES).length;
// a game's config for one mode and length (v11): `per` overrides by mode, `streak` overrides by length. GC(g,d) without a length is the Set config
// v14 (section 5 / L5): a game with a SET_COPY row gets its lengths from it — [the Set round count, Streak] — so the round count
// lives in exactly one place. Timed games (Quick Tap, Dots) and Sequence keep the `lens` in their own row
const GC=(g,d,s)=>{ const G_=GAMES[g]; let c=G_.per&&G_.per[d]?Object.assign({},G_,G_.per[d]):G_; const sc=SET_COPY[g+':'+d]; if(sc) c=Object.assign({},c,{lens:[sc.rounds,STREAK]});
  if(s===STREAK&&c.streak) c=Object.assign({},c,c.streak); return c; };
// is this length the Streak of a game that has one — the same test GC applies before it overlays `streak`
const isStreak=(g,d,s)=>s===STREAK&&!!GC(g,d).streak;
// look a per-variant value up: a Streak tries 'g:d:streak', 'g:streak', 'streak'; a Set tries 'g:d', 'g'; then the default
const GV=(table,g,d,s,dflt)=>{ if(isStreak(g,d,s)) return table[g+':'+d+':streak']||table[g+':streak']||table.streak||dflt; return table[g+':'+d]||table[g]||dflt; };
// length faces (v11): the name everywhere, the seconds only on the pick sheet. `vs` picks the versus family first — Reaction's
// best-of-5 and its 5-round Flash Set are both `5`, and only the caller knows which row it is drawing
const lenName=(g,s,d,vs)=>{ const c=GC(g,d); if(g==='sequence') return s+' keys'; if(c.timed) return LEN_NAME[s]||s+'s';
  if(vs&&c.lenNames&&c.lenNames[s]) return c.lenNames[s];
  if(SET_COPY[g+':'+d]) return s===STREAK?'Streak':'Set';
  if(c.lenNames&&c.lenNames[s]) return c.lenNames[s]; return s+c.unit; };
// the line under the length name: seconds for a timed game, otherwise the Set or Streak line from the one table
const lenSub=(g,s,d)=>{ const c=GC(g,d); if(c.timed) return s+'s'; const sc=SET_COPY[g+':'+d]; if(sc) return s===STREAK?sc.streak:sc.set; return ''; };
const lenLabel=(g,s,d)=>lenName(g,s,d);
const lenFull=(g,s,d)=>{ const n=lenName(g,s,d), sub=lenSub(g,s,d); return sub&&GC(g,d).timed?`${n} · ${sub}`:n; };
// versus exists for a game, or for some of its modes (v11)
const versusOf=(g,d)=>{ const v=GAMES[g].versus; return v===true||(Array.isArray(v)&&v.includes(d)); };
// two-player runs the engine handles on one screen (v11): Sequence and Count. Everything else passes the phone through VS
const SHARED2=(g,d)=>g==='sequence'||(g==='spot'&&d==='count');

export { ENGINES, GAMES, GC, GV, N_GAMES, SHARED2, VERSUS, isStreak, lenFull, lenLabel, lenName, lenSub, versusOf };
