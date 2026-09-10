/* No Excuses — Sequence — watch and copy
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract. Behaviour is identical to build 11. */

import { SCALES } from "../../config/audio.js";
import { SEQ as CP } from "../../config/copy.js";
import { CFG, SEQ_VS } from "../../config/games.js";
import { $, $$, T, pWho, seqStep } from "../../core.js";
import * as hud from "../_shared/hud.js";
/* ---------- Sequence: streak. Watch, copy, one more each round; a wrong key ends it ---------- */
const SQ={ id:'sequence', ctx:null, st:'idle', keys:0, seq:[], seqs:null, idx:0, round:0, p:0, rounds:[0,0], lives:[0,0], ans:0, badFirst:0,
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); },
  later(f,ms){ this.ctx.timers.later(f,ms); },
  step(){ return seqStep(this.round); },
  // v15 (4.5): versus is lives-based. Compose — one player taps in a tune, the other copies it, longest copy wins — is
  // retired with it: the two patterns grow together and the one still holding a life at the end wins. v15 (#375c,
  // build 26): each player answers their OWN pattern of that length, never the one the other just replayed
  mode(){ return this.ctx.players===2?'vs':this.ctx.players===1?'pass':'solo'; },
  // keys are built before the countdown so they can run the scale under it (v5)
  mount(ctx){ this.ctx=ctx; this.build(); },
  build(){ this.keys=this.ctx.len; this.st='idle'; $('#seq').innerHTML=Array.from({length:this.keys},(_,i)=>`<div class="key" data-k="${i}" data-n="${i+1}"></div>`).join('');
    hud.mode(T(CP.hud,{n:this.keys,tail:this.ctx.practice?CP.practice:this.mode()==='pass'?CP.pass:this.mode()==='vs'?CP.comp:''})); hud.scoreVisible(!(this.ctx.practice||this.ctx.players)); $('#seqdone').classList.remove('on'); },
  // the keys run the scale under the 3-2-1 (v5)
  precount(){ const n=this.keys, stepMs=Math.floor((CFG.countStep*3)/n); for(let i=0;i<n;i++) this.later(()=>this.light(i,stepMs*2.2,stepMs*.9),i*stepMs); },
  // first play (v6): two notes play, then the ghost copies them, then the countdown
  demo(ctx,g){ const k=i=>$(`.key[data-k="${i}"]`); g.later(()=>this.light(0,500,300),300); g.later(()=>this.light(2,500,300),800);
    g.later(()=>g.move(k(0)),1300); g.later(()=>{ g.tap(); this.light(0,700,180); },1650); g.later(()=>g.move(k(2)),1850); g.later(()=>{ g.tap(); this.light(2,700,180); },2200); return 2900; },
  start(){ this.begin(); },
  stop(){ this.clearT(); },
  // a key (ev.target is its index — from the keys or the 1–7 row). The Done button belonged to Compose and is never
  // raised now that versus is lives-based (v15 4.5); its act is swallowed rather than left to reach a key
  input(ctx,ev){ if(ev.type==='act') return; if(ev.type==='down'&&ev.target!==undefined) this.press(ev.target); },
  /* v16 (2): `firstWrong` is the run's own answer to "was the FIRST note you answered wrong" — it is not derivable from
     `hits`, which is the longest pattern completed and starts a solo run at 2 because every run opens on 3 notes. The
     unlock predicate reads this field and nothing else (progress/rules.js, timing:stopwatch). */
  result(){ const r={hits:Math.max(0,this.round-1),misses:0}; if(this.badFirst) r.firstWrong=1; return r; },
  // the cue (v11): a short line on a contrasting backing. `stay` keeps it up; otherwise it pops and fades
  cue(html,stay,p){ const t=$('#turn'); t.classList.remove('on','stay','p1','p2'); void t.offsetWidth; t.innerHTML=html; if(p!==undefined) t.classList.add(p?'p2':'p1'); t.classList.add(stay?'stay':'on'); },
  /* every run starts with three notes (v11). v15 (4.5): a versus opens on the number the two players picked.
     v15 (#375c, build 26): each player gets their OWN pattern, of the same length. Build 25 dealt one pattern and had
     both players answer it — so player 2 watched player 1 replay it, with the keys lighting on every correct tap,
     before taking their turn. On a memory game that is a free second look, it is systematic, and it compounds every
     round. Two patterns of equal length was the choice over alternating who answers first: alternating only halves the
     advantage and leaves the round it is taken in deciding the match, while equal-length patterns remove the leak
     outright and keep everything else — the lives, the growth, the order — exactly as Aiden agreed it (SEQ_VS is his,
     on #376, and is untouched). */
  deal(n){ return Array.from({length:n},()=>Math.random()*this.keys|0); },
  begin(){ this.p=0; this.ans=0; this.badFirst=0; this.rounds=[0,0]; this.lives=[SEQ_VS.lives,SEQ_VS.lives]; const vs=this.mode()==='vs';
    this.round=vs?Math.max(3,Math.min(8,this.ctx.opens||3)):Math.max(3,this.ctx.practice||3);
    this.seqs=vs?[this.deal(this.round),this.deal(this.round)]:null;
    this.seq=vs?this.seqs[0]:this.deal(this.round); this.play(); },
  // the note rings for `ms`; the key only lights for `lit` (default a short flash) — sound is never cut by the key going dark (v5)
  light(k,ms,lit){ const el=$(`.key[data-k="${k}"]`); if(!el) return; el.classList.add('lit'); this.ctx.audio.note(k,ms); this.later(()=>el.classList.remove('lit'),lit||Math.min(ms*.7,220)); },
  // whose turn it is is unmissable (v7): keys sit dim and "watch" while it plays; then YOUR TURN pops centre, the keys light their top edge, two rising notes, and the HUD turns target-coloured
  play(){ this.clearT(); this.st='play'; const pass=this.mode()==='pass', vs=this.mode()==='vs', two=pass||vs; hud.score(this.round-1);
    if(vs) this.seq=this.seqs[this.p];   // #375c: the pattern belongs to the player about to answer it, not to the round
    if(vs){ hud.timeHtml(T(CP.vsHud,{who:pWho(this.p),a:this.lives[0],b:this.lives[1]})); hud.pturn(this.p); }
    else hud.time(pass?T(CP.round,{n:this.round}):T(CP.watch,{n:this.round}));
    hud.you(false); $('#seq').classList.add('watch'); $('#seq').classList.remove('input'); const step=this.step();
    if(two) this.cue(`${pWho(this.p)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.copy}</small>`,true,this.p); else if(this.round<=4) this.cue(CP.copy,true);
    this.seq.forEach((k,i)=>this.later(()=>this.light(k,step*1.6,step*.7),700+i*step));
    this.later(()=>this.yourTurn(two?this.p:undefined),700+this.seq.length*step+120); },
  yourTurn(p){ this.st='input'; this.idx=0; hud.timeHtml(p===undefined?CP.yourTurn:T(CP.whoTurn,{who:pWho(p)})); hud.you(true); $('#seq').classList.remove('watch'); $('#seq').classList.add('input'); this.cue(p===undefined?CP.yourTurn:`${pWho(p)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.yourTurn}</small>`,false,p); this.ctx.audio.turn(); },
  press(k){ if(this.st!=='input') return; const first=this.ans===0; this.ans++;
    if(k===this.seq[this.idx]){ this.light(k,700,180); this.idx++; if(this.idx===this.seq.length){ this.st='wait'; $('#seq').classList.remove('input'); hud.you(false); this.ctx.audio.hit();
        if(this.mode()==='vs') return this.vsTurn(true);
        this.round++; this.seq.push(Math.random()*this.keys|0);
        if(this.mode()==='pass'){ this.rounds[this.p]++; this.p=1-this.p; this.later(()=>this.play(),900); return; }
        if(!this.ctx.practice) this.ctx.emit('live',{hits:this.round-1}); this.later(()=>this.play(),650); } }
    else { this.st='over';
      /* v16 (2): the first note of the run, answered wrong — banked the INSTANT it happens, not at the finish. It is the
         Timing unlock and a run that ends here is one a player is very likely to quit out of. */
      if(first){ this.badFirst=1; if(this.mode()==='solo'&&!this.ctx.practice) this.ctx.emit('live',{hits:0,firstWrong:1}); }
      const el=$(`.key[data-k="${k}"]`); el.classList.add('bad'); const right=$(`.key[data-k="${this.seq[this.idx]}"]`); right.classList.add('lit'); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40);
      hud.shake();
      if(this.mode()==='vs') return this.vsTurn(false);
      if(this.mode()==='pass'){ const w=1-this.p; this.cue(T(CP.wins,{who:pWho(w)}),true,w); return this.later(()=>this.ctx.emit('finish',{hits:this.rounds[0],misses:0,vs2:{a:this.rounds[0],b:this.rounds[1],w,how:CP.missNote}}),1600); }
      this.later(()=>this.ctx.emit('finish',{hits:this.round-1,misses:0,x:this.step(),sc:SCALES[this.ctx.scale].name.toLowerCase().slice(0,5),practice:this.ctx.practice||0,firstWrong:this.badFirst||0}),900); } },
  /* v15 (4.5) — versus is lives-based. Each player answers their own pattern of the round's length (#375c, build 26):
     player 1 answers theirs, player 2 answers theirs, and only then do both grow by a note. A wrong note costs a life
     instead of ending the run, and the last player still holding one wins — so a single slip does not decide a match.
     Three lives each is Cowork's number and a guess (SEQ_VS.lives, Aiden's call on #376); the keys and the opening
     length are the two players' own choices on the sheet.
     Nothing here reaches a board, a key, an unlock or an achievement (L10, widened by A.3). */
  // v16 (1.4): you are close to winning when the other player is close to out. Presentation only (L10)
  vsP(){ const n=SEQ_VS.lives; return [1-this.lives[1]/n,1-this.lives[0]/n]; },
  vsTurn(ok){ if(!ok) this.lives[this.p]--; if(!ok) this.ctx.emit('live',{vsP:this.vsP()});
    if(!ok) this.cue(this.lives[this.p]<=0?T(CP.vsOut,{who:pWho(this.p)}):T(CP.vsHud,{who:pWho(this.p),a:this.lives[0],b:this.lives[1]}),true,this.p);
    const last=this.p===1;
    this.later(()=>{ if(this.lives[0]<=0||this.lives[1]<=0) return this.vsEnd();
      $$('.key').forEach(el=>el.classList.remove('bad','lit'));
      // both patterns grow once player 2 has answered, so the two are never asked for different lengths (#375c)
      if(last){ this.round++; this.seqs[0].push(Math.random()*this.keys|0); this.seqs[1].push(Math.random()*this.keys|0); }
      this.p=1-this.p; this.play(); },ok?800:1400); },
  // only one player can lose a life in a turn, so there is no draw to read for
  vsEnd(){ const a=this.lives[0], b=this.lives[1], w=a<=0?1:0; this.st='over'; hud.pturn(null); this.clearT();
    this.cue(T(CP.wins,{who:pWho(w)}),true,w);
    this.later(()=>this.ctx.emit('finish',{hits:this.round-1,misses:0,vs2:{a,b,w,how:CP.vsLost,txt:[T(CP.vsLives2,{n:a}),T(CP.vsLives2,{n:b})]}}),1600); } };

export default SQ;
export { SQ };
