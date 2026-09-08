/* No Excuses — Sequence — watch and copy
   Split out of index.html at build 12. Build 17 (refactor stage 3): the engine contract. Behaviour is identical to build 11. */

import { SCALES } from "../../config/audio.js";
import { SEQ as CP } from "../../config/copy.js";
import { CFG } from "../../config/games.js";
import { $, $$, T, pWho, seqStep, winner } from "../../core.js";
import * as hud from "../_shared/hud.js";
/* ---------- Sequence: streak. Watch, copy, one more each round; a wrong key ends it ---------- */
const SQ={ id:'sequence', ctx:null, st:'idle', keys:0, seq:[], idx:0, round:0, p:0, rounds:[0,0], copied:[0,0], phase:0,
  clearT(){ if(this.ctx) this.ctx.timers.clearT(); },
  later(f,ms){ this.ctx.timers.later(f,ms); },
  step(){ return seqStep(this.round); },
  mode(){ return this.ctx.players===2?'compose':this.ctx.players===1?'pass':'solo'; },
  // keys are built before the countdown so they can run the scale under it (v5)
  mount(ctx){ this.ctx=ctx; this.build(); },
  build(){ this.keys=this.ctx.len; this.st='idle'; $('#seq').innerHTML=Array.from({length:this.keys},(_,i)=>`<div class="key" data-k="${i}" data-n="${i+1}"></div>`).join('');
    hud.mode(T(CP.hud,{n:this.keys,tail:this.ctx.practice?CP.practice:this.mode()==='pass'?CP.pass:this.mode()==='compose'?CP.comp:''})); hud.scoreVisible(!(this.ctx.practice||this.ctx.players)); $('#seqdone').classList.remove('on'); },
  // the keys run the scale under the 3-2-1 (v5)
  precount(){ const n=this.keys, stepMs=Math.floor((CFG.countStep*3)/n); for(let i=0;i<n;i++) this.later(()=>this.light(i,stepMs*2.2,stepMs*.9),i*stepMs); },
  // first play (v6): two notes play, then the ghost copies them, then the countdown
  demo(ctx,g){ const k=i=>$(`.key[data-k="${i}"]`); g.later(()=>this.light(0,500,300),300); g.later(()=>this.light(2,500,300),800);
    g.later(()=>g.move(k(0)),1300); g.later(()=>{ g.tap(); this.light(0,700,180); },1650); g.later(()=>g.move(k(2)),1850); g.later(()=>{ g.tap(); this.light(2,700,180); },2200); return 2900; },
  start(){ this.begin(); },
  stop(){ this.clearT(); },
  // a key (ev.target is its index — from the keys or the 1–7 row); the Done button in Compose arrives as an act
  input(ctx,ev){ if(ev.type==='act'){ if(ev.target==='seqdone') this.done(); return; } if(ev.type==='down'&&ev.target!==undefined) this.press(ev.target); },
  result(){ return {hits:Math.max(0,this.round-1),misses:0}; },
  // the cue (v11): a short line on a contrasting backing. `stay` keeps it up; otherwise it pops and fades
  cue(html,stay,p){ const t=$('#turn'); t.classList.remove('on','stay','p1','p2'); void t.offsetWidth; t.innerHTML=html; if(p!==undefined) t.classList.add(p?'p2':'p1'); t.classList.add(stay?'stay':'on'); },
  // every run starts with three notes (v11)
  begin(){ this.p=0; this.rounds=[0,0]; this.copied=[0,0]; this.phase=0; if(this.mode()==='compose') return this.compose(0); this.round=Math.max(3,this.ctx.practice||3); this.seq=Array.from({length:this.round},()=>Math.random()*this.keys|0); this.play(); },
  // the note rings for `ms`; the key only lights for `lit` (default a short flash) — sound is never cut by the key going dark (v5)
  light(k,ms,lit){ const el=$(`.key[data-k="${k}"]`); if(!el) return; el.classList.add('lit'); this.ctx.audio.note(k,ms); this.later(()=>el.classList.remove('lit'),lit||Math.min(ms*.7,220)); },
  // whose turn it is is unmissable (v7): keys sit dim and "watch" while it plays; then YOUR TURN pops centre, the keys light their top edge, two rising notes, and the HUD turns target-coloured
  play(){ this.clearT(); this.st='play'; const pass=this.mode()==='pass'; hud.score(this.round-1); hud.time(pass?T(CP.round,{n:this.round}):T(CP.watch,{n:this.round})); hud.you(false); $('#seq').classList.add('watch'); $('#seq').classList.remove('input'); const step=this.step();
    if(pass) this.cue(`${pWho(this.p)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.copy}</small>`,true,this.p); else if(this.round<=4&&this.phase===0) this.cue(CP.copy,true);
    this.seq.forEach((k,i)=>this.later(()=>this.light(k,step*1.6,step*.7),700+i*step));
    this.later(()=>this.yourTurn(pass?this.p:undefined),700+this.seq.length*step+120); },
  yourTurn(p){ this.st='input'; this.idx=0; hud.timeHtml(p===undefined?CP.yourTurn:T(CP.whoTurn,{who:pWho(p)})); hud.you(true); $('#seq').classList.remove('watch'); $('#seq').classList.add('input'); this.cue(p===undefined?CP.yourTurn:`${pWho(p)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.yourTurn}</small>`,false,p); this.ctx.audio.turn(); },
  press(k){ if(this.st==='compose') return this.composeTap(k); if(this.st!=='input') return;
    if(k===this.seq[this.idx]){ this.light(k,700,180); this.idx++; if(this.idx===this.seq.length){ this.st='wait'; $('#seq').classList.remove('input'); hud.you(false); this.ctx.audio.hit();
        if(this.mode()==='compose'){ this.copied[1-this.phaseComposer]=this.idx; return this.later(()=>this.swap(),700); }
        this.round++; this.seq.push(Math.random()*this.keys|0);
        if(this.mode()==='pass'){ this.rounds[this.p]++; this.p=1-this.p; this.later(()=>this.play(),900); return; }
        if(!this.ctx.practice) this.ctx.emit('live',{hits:this.round-1}); this.later(()=>this.play(),650); } }
    else { this.st='over'; const el=$(`.key[data-k="${k}"]`); el.classList.add('bad'); const right=$(`.key[data-k="${this.seq[this.idx]}"]`); right.classList.add('lit'); this.ctx.audio.miss(); if(navigator.vibrate) navigator.vibrate(40);
      hud.shake();
      if(this.mode()==='compose'){ this.copied[1-this.phaseComposer]=this.idx; return this.later(()=>this.swap(),900); }
      if(this.mode()==='pass'){ const w=1-this.p; this.cue(T(CP.wins,{who:pWho(w)}),true,w); return this.later(()=>this.ctx.emit('finish',{hits:this.rounds[0],misses:0,vs2:{a:this.rounds[0],b:this.rounds[1],w,how:CP.missNote}}),1600); }
      this.later(()=>this.ctx.emit('finish',{hits:this.round-1,misses:0,x:this.step(),sc:SCALES[this.ctx.scale].name.toLowerCase().slice(0,5),practice:this.ctx.practice||0}),900); } },
  // Compose (v11, the Sequence versus): one player taps in up to 8 notes, the other hears it once and copies; then they swap. Longest copy wins
  compose(c){ this.clearT(); this.phaseComposer=c; this.st='compose'; this.seq=[]; $('#seq').classList.remove('watch','input'); hud.timeHtml(T(CP.composeHud,{who:pWho(c)})); this.cue(`${pWho(c)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.compose}</small>`,true,c); $('#seqdone').classList.remove('on'); },
  composeTap(k){ if(this.seq.length>=8) return; this.seq.push(k); this.light(k,600,200); hud.timeHtml(T(CP.composeN,{who:pWho(this.phaseComposer),n:this.seq.length})); if(this.seq.length>=1) $('#seqdone').classList.add('on'); if(this.seq.length>=8) this.later(()=>this.done(),500); },
  done(){ if(this.st!=='compose'||!this.seq.length) return; $('#seqdone').classList.remove('on'); const c=this.phaseComposer, p=1-c; this.st='play'; this.round=this.seq.length; $('#seq').classList.add('watch'); const step=450;
    this.cue(`${pWho(p)}<br><small style="font-size:.6em;letter-spacing:.2em">${CP.listen}</small>`,true,p); hud.timeHtml(T(CP.listenHud,{who:pWho(p)}));
    this.seq.forEach((k,i)=>this.later(()=>this.light(k,step*1.6,step*.7),900+i*step)); this.later(()=>this.yourTurn(p),900+this.seq.length*step+150); },
  swap(){ $('#seq').classList.remove('input','watch'); $$('.key').forEach(k=>k.classList.remove('bad','lit')); if(this.phase===0){ this.phase=1; return this.compose(1); }
    const a=this.copied[0], b=this.copied[1], w=winner(a,b); this.cue(w<0?CP.draw:T(CP.wins,{who:pWho(w)}),true,w<0?undefined:w); this.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:CP.longer,txt:[T(CP.notes,{n:a}),T(CP.notes,{n:b})]}}),1600); } };

export default SQ;
export { SQ };
