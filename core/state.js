/* No Excuses — the session's selection state (build 15, refactor stage 1). Not persisted.
   sel: what the pick sheet has chosen and the run will play. VS: pass & play, two runs and a hand-over.
   Build 18 (refactor stage 4): the screens' own filters (the board, preview and achievements pickers) left for their
   screen files; what is here is shared by the pick sheet, the result screen and the run. */
import { GAMES } from "../games/registry.js";
import { look, prefs } from "./store.js";

// v15 (4.5): `opens` is how many notes a Sequence versus starts on — the second thing the two players agree before they
// play, after the key count. Session state like the rest of sel; nothing about it is worth persisting
// v23 (L.11a, build 40): the scale is a Customise choice, so it is the default until the Games chest opens
// v31 (60.27, build 60): `resumeAt` is the saved row the menu's Resume offer hands over — session state like the rest of sel,
// read once by run/run.js the moment the run goes live and cleared there, so an offer can never be taken twice
const sel={ game:prefs.lastGame, diff:GAMES[prefs.lastGame].modes[0], secs:5, practice:0, opens:3, scale:look('scale')||'penta', vs:0, resumeAt:null };
// vs a friend (v9): pass-and-play. Player 1 is the profile, player 2 is FRIEND; only player 1's run goes on the board
const VS={ on:false, stage:0, p1:null, p2:null, reset(){ this.on=false; this.stage=0; this.p1=null; this.p2=null; } };

export { VS, sel };
