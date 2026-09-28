/* No Excuses — "PLAY THIS?" (build 62, 61.11). Not a screen: one small box over the list a requirement row was tapped on.
   A tap on a row used to go straight to the game, so a stray tap while scrolling a chest tab or the Keys screen took the player away.
   Now every tappable requirement row asks first: what it is, its target and the player's best, and one PLAY. A tap anywhere outside the
   box just closes it — nothing under it is re-drawn, so the list is exactly where it was. */
import { ASK_PLAY } from "../config/copy.js";
import { MODE_NAME } from "../config/games.js";
import { T, esc } from "../core.js";
import { on } from "../core/events.js";
import { GAMES, lenName } from "../games/registry.js";
import { Scores } from "../progress.js";
import { define } from "./actions.js";
import { scoreTxt } from "./format.js";

let host=null, then=null;
function build(){ if(host) return host;
  host=document.createElement('div'); host.id='askplay'; host.hidden=true; host.dataset.act='askp-out';
  host.innerHTML='<div class="apbox" data-act="askp-box"><h3></h3><p></p><button class="item big" data-act="askp-play"></button></div>';
  document.body.appendChild(host); host.querySelector('button').textContent=ASK_PLAY.play; return host; }
const close=()=>{ if(host) host.hidden=true; then=null; };
/* `target` is the row's own number in its game's units (null where the row has none); `go` is what the row used to do on the tap */
function askPlay({ g, d, s, target, go }){ const h=build();
  const name=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''}${s!==undefined&&s!==null?' · '+lenName(g,s,d):''}`;
  const best=s!==undefined&&s!==null?Scores.best(g,d,s):null;
  const bits=[]; if(target!==null&&target!==undefined) bits.push(T(ASK_PLAY.target,{n:scoreTxt(g,target,d,s)}));
  bits.push(T(ASK_PLAY.best,{n:best===null?ASK_PLAY.none:scoreTxt(g,best,d,s)}));
  h.querySelector('h3').textContent=T(ASK_PLAY.title,{name}); h.querySelector('p').innerHTML=bits.map(esc).join(' · ');
  then=go; h.hidden=false; }
on('screen:change',close);
define({
  'askp-out'(){ close(); return undefined; },
  'askp-box'(){ return undefined; },
  'askp-play'(){ const f=then; close(); if(f) f(); return 'click'; },
});
export { askPlay, close as askClosePlay };
