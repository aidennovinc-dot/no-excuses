/* No Excuses — pass & play INSIDE one run (v15 §4, build 25).

   Until this build a pass & play run of anything but Quick Tap or Dots was two whole runs with the hand-over screen
   between them: player 1 played a complete Set, the phone changed hands, player 2 played another, and the two were
   compared at the end. §4.1–§4.4 replace that for the five turn-taking games — Estimate goes turn by turn, Timing and
   Reaction attempt by attempt — which means the two players share ONE run and the engine, not run/run.js, owns the
   hand-over. This is the part all of them share: whose turn it is, what each player has done, the card between turns,
   and how the pair is read at the end.

   L10, widened by v15 A.3: nothing here reaches a board, a key, an unlock or an achievement. Two-player runs are turned
   away by run/run.js before any of them and this module never touches the store — its only output is the `vs2` payload
   the result screen draws. */
import { TWO as CP } from "../../config/copy.js";
import { PASS_TURNS } from "../../config/games.js";
import { T, mean, pWho, sum, winner } from "../../core.js";
import * as hud from "./hud.js";

// [attempts per turn, turns each] for one mode, from the config. A game with no row plays one attempt a turn
const turnsOf=(g,d)=>PASS_TURNS[g+':'+d]||[1,3];

/* the turn keeper. `lower` says which way the pair is read, `agg` how a player's attempts become their one score, `fmt`
   prints it. Engines hold one of these and ask it three things: whose turn is it, is the run over, what is the record */
function makeTwo(ctx,{lower=true,agg='mean',fmt=v=>String(Math.round(v))}={}){
  const [per,turns]=turnsOf(ctx.game,ctx.mode);
  return {
    // a shared pass & play run — sel.vs 1 on a game whose engine runs both players itself (SHARED2). Versus is players 2
    on:ctx.players===1, p:0, per, turns, taken:[0,0], vals:[[],[]], lower, fmt,
    // the attempt that just landed belongs to whoever is holding the phone
    add(v){ this.vals[this.p].push(v); },
    // a turn is over: bank it and give the phone to whoever is behind. Player 1 leads every round
    turnDone(){ this.taken[this.p]++; this.p=this.taken[0]<=this.taken[1]?0:1; },
    over(){ return this.taken[0]>=this.turns&&this.taken[1]>=this.turns; },
    scoreOf(i){ return agg==='sum'?sum(this.vals[i]):mean(this.vals[i]); },
    // "Player 2 · turn 2 of 3" — the HUD line every one of these games shows in place of its own round counter
    hudLine(){ return T(CP.hud,{who:pWho(this.p),n:Math.min(this.turns,this.taken[this.p]+1),s:this.turns}); },
    /* the hand-over. The card names the player, wears their colour and waits for a tap — which is exactly the
       tap-to-continue mechanism §3.9 kept for two-player hand-over points, so it is the engine's own wait() that
       parks on it and the same #game.tapon cue that clears it */
    gate(eng,go){ hud.pturn(this.p); hud.timeHtml(this.hudLine()); hud.cue(`${pWho(this.p)}<br><small>${CP.ready}</small>`,true,this.p);
      eng.wait(()=>{ hud.cue(''); go(); }); },
    // the finish. `lower` travels with it because the result screen reads the pair itself (ui/screens/result.js)
    record(){ const a=this.scoreOf(0), b=this.scoreOf(1); const w=this.lower?winner(-a,-b):winner(a,b);
      hud.pturn(null);
      return { hits:Math.round(a*100)/100, misses:0, vs2:{ a:Math.round(a*100)/100, b:Math.round(b*100)/100, w, lower:this.lower, how:this.lower?CP.lowest:CP.highest, txt:[this.fmt(a),this.fmt(b)] } }; },
  };
}

export { makeTwo, turnsOf };
