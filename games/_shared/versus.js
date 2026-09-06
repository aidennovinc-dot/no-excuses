/* No Excuses — versus (v10): one phone, two ends. Quick Tap — each player has two pads and their own white square; Dots — squares
   for the bottom player, circles for the top, each mostly in its own 70% of the screen, and a tap on the other player's shape
   gives them the point. First to lead by VS_LEAD wins; at VS_CAP seconds whoever leads wins.
   Build 17 (refactor stage 3): an engine on the contract, picked by run/run.js for a Quick Tap or Dots versus run. Was VX in app.js. */
import { HUD } from "../../config/copy.js";
import { CFG, VS_CAP, VS_LEAD } from "../../config/games.js";
import { $, T, pWho, vmin, winner } from "../../core.js";

const VX={ id:'versus', noIntro:true, ctx:null, n:[0,0], tgt:[0,0], lock:[0,0], streak:[0,0], pos:[null,null], next:[null,null], raf:0, t0:0, done:false,
  qt(){ return this.ctx.game==='quick-tap'; },
  sz(){ return Math.max(64,Math.min(110,18*vmin())); },
  mount(ctx){ this.ctx=ctx; this.n=[0,0]; this.lock=[0,0]; this.streak=[0,0]; this.done=false; $('#vn0').textContent='0'; $('#vn1').textContent='0';  $('#vsdiff').textContent=T(HUD.vsLead,{n:VS_LEAD}); $('#vsnote').textContent=this.qt()?HUD.vsQt:HUD.vsDots; $('#vslead').style.left='50%'; $('#vslead').style.width='0'; $('#vwin').classList.remove('on');
    $('#vfield').style.setProperty('--dsz',this.sz()+'px'); $('#vfield').innerHTML=this.qt()?'':`<div class="vlead" id="vl0"></div><div class="vlead c" id="vl1"></div><div class="vshape" id="vs0"></div><div class="vshape c" id="vs1"></div>`; for(let p=0;p<2;p++) for(let i=0;i<2;i++) $(`#vsq${p}${i}`).style.setProperty('--v',0); },
  start(){ this.t0=performance.now(); if(this.qt()){ this.tgt=[Math.random()*2|0,Math.random()*2|0]; this.renderQT(); } else { this.pos=[this.spot(0,null),this.spot(1,null)]; this.next=[this.spot(0,this.pos[0]),this.spot(1,this.pos[1])]; this.renderDT(); }
    const loop=now=>{ if(!this.ctx.timers.alive()||this.done) return; if(now-this.t0>VS_CAP*1000) return this.end(); for(let p=0;p<2;p++) if(this.lock[p]&&now>=this.lock[p]){ this.lock[p]=0; this.qt()?this.renderQT():0; } this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  stop(){ cancelAnimationFrame(this.raf); },
  // the bottom player's shapes land in the bottom 70%, the top player's in the top 70% — the middle 40% is shared
  spot(p,avoid){ const f=$('#vfield').getBoundingClientRect(), sz=this.sz(); const mx=Math.max(1,f.width-sz), top=f.height*.16, bot=f.height*.84-sz; const y0=p===0?top+(bot-top)*.3:top, y1=p===0?bot:top+(bot-top)*.7;
    for(let i=0;i<20;i++){ const q={x:Math.random()*mx,y:y0+Math.random()*(y1-y0)}; if(avoid&&Math.hypot(q.x-avoid.x,q.y-avoid.y)<=sz*1.3) continue; const o=this.pos[1-p]; if(o&&Math.hypot(q.x-o.x,q.y-o.y)<=sz*1.2) continue; return q; } return {x:Math.random()*mx,y:y0}; },
  renderQT(){ for(let p=0;p<2;p++) for(let i=0;i<2;i++) $(`#vsq${p}${i}`).style.setProperty('--v',!this.lock[p]&&this.tgt[p]===i?1:0); },
  renderDT(){ const lead=this.ctx.mode==='lead'; for(let p=0;p<2;p++){ const s=$('#vs'+p), l=$('#vl'+p); s.style.transform=`translate(${this.pos[p].x}px,${this.pos[p].y}px)`; s.classList.add('on'); if(lead){ l.style.transform=`translate(${this.next[p].x}px,${this.next[p].y}px)`; l.classList.add('on'); } } },
  score(p){ this.n[p]++; const el=$('#vn'+p); el.textContent=this.n[p]; this.ctx.audio.hit(); const d=this.n[0]-this.n[1]; const k=Math.min(1,Math.abs(d)/VS_LEAD)*50; const bar=$('#vslead'); bar.style.width=k+'%'; bar.style.left=d>=0?'50%':(50-k)+'%'; $('#vsdiff').innerHTML=d===0?HUD.level:T(HUD.lead,{who:pWho(d>0?0:1),n:Math.abs(d)});
    if(Math.abs(d)>=VS_LEAD) this.end(); },
  // a pad tap carries the player and the pad (data-vs-side); a field tap carries the point
  input(ctx,ev){ if(ev.player!==undefined) this.padTap(ev.player,ev.target); else this.fieldTap(ev); },
  padTap(p,i){ if(!this.ctx.timers.alive()||this.done||this.lock[p]) return; if(this.tgt[p]===i){ this.score(p); const prev=this.tgt[p]; let t=Math.random()*2|0; if(t===prev){ this.streak[p]++; if(this.streak[p]>=3){ t=1-prev; this.streak[p]=0; } } else this.streak[p]=0; this.tgt[p]=t; this.renderQT(); } else { this.lock[p]=performance.now()+CFG.lockout; this.ctx.audio.miss(); this.renderQT(); if(navigator.vibrate) navigator.vibrate(30); } },
  fieldTap(ev){ if(!this.ctx.timers.alive()||this.done||this.qt()) return; const f=$('#vfield').getBoundingClientRect(); const x=ev.x-f.left, y=ev.y-f.top, sz=this.sz(), c=sz/2; let hitP=-1;
    for(let p=0;p<2;p++){ const q=this.pos[p]; if(Math.hypot(x-(q.x+c),y-(q.y+c))<=c*CFG.dotLeeway+8) hitP=p; } if(hitP<0) return;
    // whose finger? the bottom 50% is the bottom player's reach, the top the top player's. A tap on the other player's shape hands them the point
    this.score(hitP); const lead=this.ctx.mode==='lead'; this.pos[hitP]=lead?this.next[hitP]:this.spot(hitP,this.pos[hitP]); this.next[hitP]=this.spot(hitP,this.pos[hitP]); this.renderDT(); },
  end(){ if(this.done) return; this.done=true; cancelAnimationFrame(this.raf); const a=this.n[0], b=this.n[1]; const w=winner(a,b); const win=$('#vwin'); win.innerHTML=w<0?`<div>${HUD.draw}</div>`:`<div class="${w?'top p2':'p1'}">${T(HUD.wins,{n:w+1})}</div>`; win.classList.add('on'); this.ctx.audio.end();
    this.ctx.timers.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how:Math.abs(a-b)>=VS_LEAD?T(HUD.byLead,{n:VS_LEAD}):HUD.onClock}}),1900); },
  result(){ return {hits:this.n[0],misses:0}; } };

export default VX;
export { VX };
