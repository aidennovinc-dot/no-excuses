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
import { GAUNTLET, TWO as CP } from "../../config/copy.js";
import { VERSUS_BOT } from "../../config/gauntlets.js";
import { PASS_TURNS } from "../../config/games.js";
import { T, mean, pWho, sum, winner } from "../../core.js";
import { makeBot } from "./bot.js";
import * as hud from "./hud.js";

// [attempts per turn, turns each] for one mode, from the config. A game with no row plays one attempt a turn
const turnsOf=(g,d)=>PASS_TURNS[g+':'+d]||[1,3];

/* the turn keeper. `lower` says which way the pair is read, `agg` how a player's attempts become their one score, `fmt`
   prints it. Engines hold one of these and ask it three things: whose turn is it, is the run over, what is the record */
/* build 69 (68.28): A GAUNTLET · VERSUS DUEL IS THIS SAME SHARED RUN WITH THE COMPUTER HOLDING THE PHONE FOR PLAYER 2. `bot` is the opponent
   (games/_shared/bot.js) — null in every other run, and then nothing below changes. With it: the turns are its row's best-of, the round goes to
   whoever is closer (first to a majority, the player first every round), Player 2 is called by the computer's name, and its turn opens on a
   card that needs no tap — the engine then plays the turn for it (`botTurn()`). The best-of counts ROUNDS, never the player's running score. */
function makeTwo(ctx,{lower=true,agg='mean',fmt=v=>String(Math.round(v))}={}){
  const bot=ctx.players===1?makeBot(ctx):null;
  const [per,t0]=turnsOf(ctx.game,ctx.mode), turns=bot&&bot.row.best?bot.row.best:t0;
  const who=p=>bot&&p?`<span class="p2">${bot.name}</span>`:pWho(p);
  return {
    // a shared pass & play run — sel.vs 1 on a game whose engine runs both players itself (SHARED2). Versus is players 2
    on:ctx.players===1, p:0, per, turns, taken:[0,0], vals:[[],[]], lower, fmt, bot,
    // 68.28: the computer is holding the phone — the engine plays this turn for it, and the player's taps wait
    botTurn(){ return !!bot&&this.p===1; },
    // 68.28: rounds won each, over the rounds BOTH have played — closer takes it, an exact tie takes nobody
    wins(){ const w=[0,0], n=Math.min(this.vals[0].length,this.vals[1].length);
      for(let i=0;i<n;i++){ const a=this.vals[0][i], b=this.vals[1][i]; if(a===b) continue; w[(lower?a<b:a>b)?0:1]++; } return w; },
    // the attempt that just landed belongs to whoever is holding the phone
    add(v){ this.vals[this.p].push(v); },
    // a turn is over: bank it and give the phone to whoever is behind. Player 1 leads every round
    turnDone(){ this.taken[this.p]++; this.p=this.taken[0]<=this.taken[1]?0:1; },
    over(){ if(bot&&this.taken[0]===this.taken[1]){ const w=this.wins(), need=Math.ceil(this.turns/2); if(w[0]>=need||w[1]>=need) return true; }
      return this.taken[0]>=this.turns&&this.taken[1]>=this.turns; },
    scoreOf(i){ return agg==='sum'?sum(this.vals[i]):mean(this.vals[i]); },
    // "Player 2 · turn 2 of 3" — the HUD line every one of these games shows in place of its own round counter
    hudLine(){ return T(CP.hud,{who:who(this.p),n:Math.min(this.turns,this.taken[this.p]+1),s:this.turns}); },
    /* the hand-over. The card names the player, wears their colour and waits for a tap — which is exactly the
       tap-to-continue mechanism §3.9 kept for two-player hand-over points, so it is the engine's own wait() that
       parks on it and the same #game.tapon cue that clears it */
    gate(eng,go){ hud.pturn(this.p); hud.timeHtml(this.hudLine());
      // 68.28: the computer's turn is announced and then simply starts; the player's own turn still waits for their tap
      if(this.botTurn()){ hud.cue(`${who(1)}<br><small>${GAUNTLET.botTurn}</small>`,true,1); return eng.later(()=>{ hud.cue(''); go(); },VERSUS_BOT.card); }
      hud.cue(`${pWho(this.p)}<br><small>${bot?GAUNTLET.yourTurn:CP.ready}</small>`,true,this.p);
      eng.wait(()=>{ hud.cue(''); go(); }); },
    // the finish. `lower` travels with it because the result screen reads the pair itself (ui/screens/result.js)
    record(){ const a=this.scoreOf(0), b=this.scoreOf(1); let w=this.lower?winner(-a,-b):winner(a,b);
      hud.pturn(null);
      // 68.28: a duel is decided on rounds won; only a level count of rounds falls back to the totals
      if(bot){ const r=this.wins(); if(r[0]!==r[1]) w=r[0]>r[1]?0:1;
        return { hits:r[0], misses:0, vs2:{ a:r[0], b:r[1], w, lower:false, how:CP.highest, txt:[String(r[0]),String(r[1])], rounds:r } }; }
      return { hits:Math.round(a*100)/100, misses:0, vs2:{ a:Math.round(a*100)/100, b:Math.round(b*100)/100, w, lower:this.lower, how:this.lower?CP.lowest:CP.highest, txt:[this.fmt(a),this.fmt(b)] } }; },
  };
}

export { makeTwo, turnsOf };
