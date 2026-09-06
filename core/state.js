/* No Excuses — the session's selection state (build 15, refactor stage 1). Not persisted.
   sel: what the pick sheet has chosen and the run will play. VS: pass & play, two runs and a hand-over.
   F: the board, preview and achievements screens' own filters. Lived in menu.js until Stage 1; Stage 3 hands
   the run's share to run/run.js and Stage 4 the screens' share to ui/screens. */
import { GAMES } from "../games/registry.js";
import { prefs } from "./store.js";

const sel={ game:prefs.lastGame, diff:GAMES[prefs.lastGame].modes[0], secs:5, practice:0, scale:prefs.scale||'penta', vs:0 };
// vs a friend (v9): pass-and-play. Player 1 is the profile, player 2 is FRIEND; only player 1's run goes on the board
const VS={ on:false, stage:0, p1:null, p2:null, reset(){ this.on=false; this.stage=0; this.p1=null; this.p2=null; } };
const F={ bd:{g:prefs.lastGame,d:GAMES[prefs.lastGame].modes[0],s:5}, pv:{g:prefs.lastGame}, ach:{g:'all'} };

export { F, VS, sel };
