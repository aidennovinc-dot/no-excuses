/* No Excuses — the hand-over screen (build 18, refactor stage 4; was the pass & play branch of finish in run/run.js).
   Player 1's run has ended: whose turn it is next, what there is to beat, and Ready starts player 2's run.
   v14 (4.7): rebuilt. The game name goes back to its usual place at the top; whose turn it is is the biggest thing on the
   screen and wears that player's colour; the score to beat sits under it (4.9) with the pace behind it as a bar where the
   game is timed, so player 2 knows what they are chasing before they start. */
import { PASS } from "../../config/copy.js";
import { MODE_NAME, RATE_MAX } from "../../config/games.js";
import { $, T, pWho } from "../../core.js";
import { on } from "../../core/events.js";
import { GAMES } from "../../games/registry.js";
import { start } from "../../run/run.js";
import { define } from "../actions.js";
import { scoreTxt } from "../format.js";
import { register, show } from "../router.js";

register('s-pass',{});
on('run:pass',({run})=>{ const g=GAMES[run.g];
  $('#pass-eyebrow').textContent=T(PASS.eyebrow,{game:`${g.name}${MODE_NAME[run.d]?' · '+MODE_NAME[run.d]:''}`});
  $('#pass-who').innerHTML=pWho(1); $('#pass-turn').textContent=PASS.up; $('#pass-hand').textContent=PASS.hand;
  // 4.9: the score, and for a timed game the average taps per second behind it, drawn against that game's ceiling
  const rate=g.timed&&run.s?run.hits/run.s:0, k=Math.min(1,rate/(RATE_MAX[run.g]||6));
  $('#pass-beat').innerHTML=`<span class="lbl">${pWho(0)} · ${PASS.beat}</span><b>${scoreTxt(run.g,run.hits,run.d,run.s)}</b>`
    +(rate?`<span class="pbar"><i style="width:${Math.round(k*100)}%"></i></span><span class="lbl">${T(PASS.rate,{n:rate.toFixed(1)})}</span>`:'');
  setTimeout(()=>show('s-pass'),250); });
define({ 'pass-go'(){ start(); return 'click'; } });
