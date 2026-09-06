/* No Excuses — the hand-over screen (build 18, refactor stage 4; was the pass & play branch of finish in run/run.js).
   Player 1's run has ended: say the score, name who is up, and Ready starts player 2's run. */
import { PASS } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, pWho } from "../../core.js";
import { on } from "../../core/events.js";
import { GAMES } from "../../games/registry.js";
import { start } from "../../run/run.js";
import { define } from "../actions.js";
import { scoreTxt } from "../format.js";
import { register, show } from "../router.js";

register('s-pass',{});
on('run:pass',({run})=>{ $('#pass-eyebrow').textContent=T(PASS.eyebrow,{game:`${GAMES[run.g].name}${MODE_NAME[run.d]?' · '+MODE_NAME[run.d]:''}`}); $('#pass-who').innerHTML=T(PASS.up,{who:pWho(1)}); $('#pass-text').innerHTML=T(PASS.text,{who:pWho(0),score:scoreTxt(run.g,run.hits,run.d,run.s)}); setTimeout(()=>show('s-pass'),250); });
define({ 'pass-go'(){ start(); return 'click'; } });
