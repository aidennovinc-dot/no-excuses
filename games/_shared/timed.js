/* No Excuses — the timed engine base (build 17, refactor stage 3): Quick Tap and Dots. A clock the run keeps, hits and
   misses the engine keeps, a lockout after a miss, the live rate bar. Was G + tapAt/hit/miss/arm in app.js and
   engine-core.js. An engine built on this supplies reset / begin / advance / render / ring / check (the tap test that
   sat in boot.js and dots.js) and may override lockMs, hideOnMiss and unlock. */
import { CFG } from "../../config/games.js";
import * as hud from "./hud.js";

// best hits in any rolling second — a test readout for setting the Blind thresholds (v5)
const peakRate=t=>{ let best=0; for(let i=0,j=0;i<t.length;i++){ while(t[i]-t[j]>1000) j++; best=Math.max(best,i-j+1); } return best; };

/* v17 (B.6, L6): `row` is the longest run of hits with no miss between them, and `rowNow` the one in progress. Every
   "N hits, no misses" rung in the chain reads it — Aiden's words were "7 consecutive hits with no misses", and the old
   `misses===0 && hits>=N` was a claim about a whole run that the live path had no business testing halfway through it.
   This one only ever grows, so it is safe mid-run, which is the whole point. */
const timedEngine=()=>({ ctx:null, hits:0, misses:0, hitT:[], row:0, rowNow:0, armed:false, lockUntil:0, meterAt:0, runFrom:0, lockMs:CFG.lockout, hideOnMiss:true,
  mount(ctx){ this.ctx=ctx; Object.assign(this,{hits:0,misses:0,hitT:[],row:0,rowNow:0,armed:false,lockUntil:0,meterAt:0,runFrom:0}); this.reset(); this.render(false); },
  // v14 (6.7): the whole-run reading needs a start, and the run's own clock starts on the same tick as this
  start(){ this.begin(); this.armed=true; this.runFrom=performance.now(); this.arm(); },
  arm(){ this.render(true); this.ring(); },
  // the lockout ending: the target comes back. Dots keeps its dot where it was, so it only re-shows it
  unlock(){ this.arm(); },
  input(ctx,ev){ const now=performance.now(); if(!this.armed||now<this.lockUntil) return; this.check(ev)?this.hit():this.miss(now); },
  hit(){ const ctx=this.ctx; this.hits++; this.rowNow++; if(this.rowNow>this.row) this.row=this.rowNow; this.hitT.push(performance.now()); hud.score(this.hits); ctx.audio.hit(); this.advance(); this.arm(); hud.bigcount(this.hits); ctx.emit('live',{hits:this.hits,misses:this.misses,row:this.row}); },
  // dots (v8): a miss holds the dot where it is for half a second, then play goes on — it no longer vanishes
  // v17 (B.6): a miss RESETS the clean streak. The best one the run managed is what the chain reads
  miss(now){ this.misses++; this.rowNow=0; this.lockUntil=now+this.lockMs; this.ctx.audio.miss(); if(this.hideOnMiss) this.render(false); hud.shake(); hud.flash(CFG.lockout); if(navigator.vibrate) navigator.vibrate(40); this.ctx.emit('live',{hits:this.hits,misses:this.misses,row:this.row}); },
  tick(ctx,now){ if(now-this.meterAt>100){ this.meterAt=now; hud.rate(ctx.game,this.hitT,now,ctx.rateMode==='run'?this.runFrom:0); } if(this.lockUntil&&now>=this.lockUntil){ this.lockUntil=0; this.unlock(); } },
  stop(){ this.armed=false; },
  result(){ return {hits:this.hits,misses:this.misses,peak:peakRate(this.hitT),row:this.row}; } });

export { peakRate, timedEngine };
