/* No Excuses — versus (v10): one phone, two ends. Quick Tap — each player has their own pads and their own white square; Dots —
   squares for the bottom player, circles for the top, each strictly inside its own half, and a tap on the other player's shape
   gives them the point. First to VS_TARGET, or first to lead by VS_LEAD, wins; VS_CAP seconds is the backstop.
   Build 17 (refactor stage 3): an engine on the contract, picked by run/run.js for a Quick Tap or Dots versus run. Was VX in app.js.
   Build 19 (v14 section 4): Four gives each player four pads, not two (4.11); a wrong tap flashes that player's half red instead of
   going blank (4.12); neither player's dots cross the centre line (4.13); the first to VS_TARGET wins as well as the first to lead
   by VS_LEAD (4.14); and the screen leans towards whoever is ahead, shakes as it gets close and tells the music to change bed (4.15). */
import { HUD } from "../../config/copy.js";
import { CFG, VS_CAP, VS_LEAD, VS_TARGET } from "../../config/games.js";
import { $, T, pWho, vmin, winner } from "../../core.js";

const VX={ id:'versus', noIntro:true, ctx:null, n:[0,0], tgt:[0,0], lock:[0,0], streak:[0,0], pos:[null,null], next:[null,null], raf:0, t0:0, done:false, target:100,
  qt(){ return this.ctx.game==='quick-tap'; },
  // 4.11: Four is four pads a player in versus too — the format does not work with two
  pads(){ return this.ctx.mode==='four'?4:2; },
  sz(){ return Math.max(64,Math.min(110,18*vmin())); },
  mount(ctx){ this.ctx=ctx; this.n=[0,0]; this.lock=[0,0]; this.streak=[0,0]; this.done=false; this.target=VS_TARGET[ctx.game]||VS_LEAD*10;
    $('#vn0').textContent='0'; $('#vn1').textContent='0';  $('#vsdiff').textContent=T(HUD.vsLead,{n:VS_LEAD,t:this.target}); $('#vsnote').textContent=this.qt()?HUD.vsQt:HUD.vsDots; $('#vslead').style.left='50%'; $('#vslead').style.width='0'; $('#vwin').classList.remove('on');
    this.lean(0);
    $('#vfield').style.setProperty('--dsz',this.sz()+'px'); $('#vfield').innerHTML=this.qt()?'':`<div class="vlead" id="vl0"></div><div class="vlead c" id="vl1"></div><div class="vshape" id="vs0"></div><div class="vshape c" id="vs1"></div>`;
    for(let p=0;p<2;p++) for(let i=0;i<4;i++){ const sq=$(`#vsq${p}${i}`); if(sq) sq.style.setProperty('--v',0); } },
  start(){ this.t0=performance.now(); if(this.qt()){ const n=this.pads(); this.tgt=[Math.random()*n|0,Math.random()*n|0]; this.renderQT(); } else { this.pos=[this.spot(0,null),this.spot(1,null)]; this.next=[this.spot(0,this.pos[0]),this.spot(1,this.pos[1])]; this.renderDT(); }
    const loop=now=>{ if(!this.ctx.timers.alive()||this.done) return; if(now-this.t0>VS_CAP*1000) return this.end(); for(let p=0;p<2;p++) if(this.lock[p]&&now>=this.lock[p]){ this.lock[p]=0; this.qt()?this.renderQT():0; } this.raf=requestAnimationFrame(loop); }; this.raf=requestAnimationFrame(loop); },
  stop(){ cancelAnimationFrame(this.raf); this.lean(0); $('#vs').classList.remove('close'); for(let p=0;p<2;p++) halfOf(p).classList.remove('miss'); },
  // 4.13: the bottom player's shapes stay in the bottom half, the top player's in the top half — neither crosses the centre line
  spot(p,avoid){ const f=$('#vfield').getBoundingClientRect(), sz=this.sz(); const mx=Math.max(1,f.width-sz), top=f.height*.16, bot=f.height*.84-sz, mid=f.height/2;
    const y0=p===0?Math.min(mid+6,bot):top, y1=p===0?bot:Math.max(top,mid-6-sz);
    for(let i=0;i<20;i++){ const q={x:Math.random()*mx,y:y0+Math.random()*Math.max(0,y1-y0)}; if(avoid&&Math.hypot(q.x-avoid.x,q.y-avoid.y)<=sz*1.3) continue; return q; } return {x:Math.random()*mx,y:y0}; },
  renderQT(){ const n=this.pads(); for(let p=0;p<2;p++) for(let i=0;i<4;i++){ const sq=$(`#vsq${p}${i}`); if(sq) sq.style.setProperty('--v',(i<n&&!this.lock[p]&&this.tgt[p]===i)?1:0); } },
  renderDT(){ const lead=this.ctx.mode==='lead'; for(let p=0;p<2;p++){ const s=$('#vs'+p), l=$('#vl'+p); s.style.transform=`translate(${this.pos[p].x}px,${this.pos[p].y}px)`; s.classList.add('on'); if(lead){ l.style.transform=`translate(${this.next[p].x}px,${this.next[p].y}px)`; l.classList.add('on'); } } },
  // 4.15: the screen leans towards whoever is ahead, harder the bigger the margin, and the music is told how close it is
  lean(d){ const k=Math.max(-1,Math.min(1,d/VS_LEAD)); const el=$('#vslean'); el.style.setProperty('--lk',Math.abs(k).toFixed(2)); el.classList.toggle('p1',k>0); el.classList.toggle('p2',k<0);
    const near=Math.max(Math.abs(d)/VS_LEAD,Math.max(this.n[0],this.n[1])/this.target); $('#vs').classList.toggle('close',near>=.7);
    /* v16 (1.4): the two stems. A player is close to winning by their own count OR by their lead, so the proximity is
       whichever of the two is further along — the same pair of conditions `score` ends the run on. Presentation (L10). */
    const px=p=>Math.max(this.n[p]/this.target, Math.max(0,p?-d:d)/VS_LEAD);
    if(this.ctx) this.ctx.emit('live',{vsTension:Math.min(1,near),vsP:[Math.min(1,px(0)),Math.min(1,px(1))]}); },
  score(p){ this.n[p]++; const el=$('#vn'+p); el.textContent=this.n[p]; this.ctx.audio.hit(); const d=this.n[0]-this.n[1]; const k=Math.min(1,Math.abs(d)/VS_LEAD)*50; const bar=$('#vslead'); bar.style.width=k+'%'; bar.style.left=d>=0?'50%':(50-k)+'%'; $('#vsdiff').innerHTML=d===0?HUD.level:T(HUD.lead,{who:pWho(d>0?0:1),n:Math.abs(d)});
    this.lean(d);
    // 4.14: first to the target, or first to lead by VS_LEAD
    if(Math.abs(d)>=VS_LEAD||this.n[p]>=this.target) this.end(); },
  // a pad tap carries the player and the pad (data-vs-side); a field tap carries the point
  input(ctx,ev){ if(ev.player!==undefined) this.padTap(ev.player,ev.target); else this.fieldTap(ev); },
  padTap(p,i){ if(!this.ctx.timers.alive()||this.done||this.lock[p]) return; const n=this.pads(); if(i>=n) return;
    if(this.tgt[p]===i){ this.score(p); const prev=this.tgt[p]; let t=Math.random()*n|0; if(t===prev){ this.streak[p]++; if(this.streak[p]>=3){ t=(prev+1+(Math.random()*(n-1)|0))%n; this.streak[p]=0; } } else this.streak[p]=0; this.tgt[p]=t; this.renderQT(); }
    // 4.12: a wrong tap reads like it does in solo — a red flash over that player's half and a beat of lockout, not a blank screen
    else { this.lock[p]=performance.now()+CFG.lockout; this.ctx.audio.miss(); this.renderQT(); this.flash(p); if(navigator.vibrate) navigator.vibrate(30); } },
  flash(p){ const h=halfOf(p); h.classList.remove('miss'); void h.offsetWidth; h.classList.add('miss'); this.ctx.timers.later(()=>h.classList.remove('miss'),CFG.lockout); },
  fieldTap(ev){ if(!this.ctx.timers.alive()||this.done||this.qt()) return; const f=$('#vfield').getBoundingClientRect(); const x=ev.x-f.left, y=ev.y-f.top, sz=this.sz(), c=sz/2; let hitP=-1;
    for(let p=0;p<2;p++){ const q=this.pos[p]; if(Math.hypot(x-(q.x+c),y-(q.y+c))<=c*CFG.dotLeeway+8) hitP=p; } if(hitP<0) return;
    // whose finger? the bottom 50% is the bottom player's reach, the top the top player's. A tap on the other player's shape hands them the point
    this.score(hitP); const lead=this.ctx.mode==='lead'; this.pos[hitP]=lead?this.next[hitP]:this.spot(hitP,this.pos[hitP]); this.next[hitP]=this.spot(hitP,this.pos[hitP]); this.renderDT(); },
  end(){ if(this.done) return; this.done=true; cancelAnimationFrame(this.raf); const a=this.n[0], b=this.n[1]; const w=winner(a,b); const win=$('#vwin'); win.innerHTML=w<0?`<div>${HUD.draw}</div>`:`<div class="${w?'top p2':'p1'}">${T(HUD.wins,{n:w+1})}</div>`; win.classList.add('on'); this.ctx.audio.end();
    const how=Math.max(a,b)>=this.target?T(HUD.byLead,{n:Math.abs(a-b)}):Math.abs(a-b)>=VS_LEAD?T(HUD.byLead,{n:VS_LEAD}):HUD.onClock;
    this.ctx.timers.later(()=>this.ctx.emit('finish',{hits:a,misses:0,vs2:{a,b,w,how}}),1900); },
  result(){ return {hits:this.n[0],misses:0}; } };

// the half a player is playing in — the top one is turned to face them
const halfOf=p=>$(p?'.vhalf.top':'.vhalf.bot');

export default VX;
export { VX };
