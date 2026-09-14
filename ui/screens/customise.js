/* No Excuses — Customise, its own screen and its own menu row again (build 39, v21 G.6 / v23 §L.4a, amending v18 B.31).

   Build 33 (B.31) merged this screen into Progress as its middle tab, on the reading that the achievements one tab across
   pay out here. v21 G.6 (2026-09-14) called that a misread of the 2026-09-11 "merge into two tabs" instruction and asked
   for Customise back as its own menu item, unchanged; v23 §L.4 asked again with the build-38 screenshot beside it. G.6 was
   never built before this — it was scheduled for build 37 as #418 and moved on twice — so the screen Aiden saw nested at
   build 38 was build 33's layout, not a new misreading. The Progress screen keeps a middle tab, but it is the LIST of what
   can be earned here (Customise unlocks), not these controls.

   A4: this file imports no screen. Progress sends a player here with show('s-custom', {g, unlocks}); a locked line sends
   the player back to Progress with show('s-prog', {ach}).

   CONTENT UNTOUCHED — everything below is ui/screens/progress.js's Customise tab as build 38 shipped it, moved, with only
   the changes that come from where it lives: pvStep asks whether THIS screen is up, onShow does what setTab('cus', opts)
   did, and a locked line opens Progress at the row that pays for the item (it was a tab change on the same screen). */
import { Music, Snd } from "../../audio.js";
import { SCALES, TRACKS, TRACK_OPTS, TRACK_PICK } from "../../config/audio.js";
import { CUSTOM, ITEM_WORD } from "../../config/copy.js";
import { DESIGNS, ITEMS } from "../../config/theme.js";
import { $, $$, T, esc } from "../../core.js";
import { on } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { musicOn, prefs, save } from "../../core/store.js";
import { GAMES } from "../../games/registry.js";
import { ACH, achById, got, markSeen, newMark } from "../../progress.js";
import { chestOpen } from "../../progress/key.js";
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { register, show } from "../router.js";
import { applyPrefs, colOf } from "../theme.js";

/* The live preview and its finger, the per-game colour groups, background, tap sound, scale, the music rows, the colour
   wheel. Every item is a data-act="item" button inside a [data-set] group. Arriving with {unlocks} scrolls to and rings
   the item an achievement just opened. */
const F={ g:prefs.lastGame };   // the game being previewed
const itemsOf=set=>set==='scale'?Object.entries(SCALES).map(([k,v])=>({v:k,label:v.name})):ITEMS[set];
// supporters (v10) have every cosmetic open; "open everything" is the testing switch for the same thing
const lockedBy=it=> it.by && !got()[it.by] && !prefs.allOpen && !prefs.supporter ? ACH.find(a=>a.id===it.by) : null;
const pvTry={};   // a locked item being previewed: {set, v, by}
const pvSeen={};  // the last unlocked item tapped, so what earned it shows on touch (v5)
/* v18 (B.30) — WHERE THE LOCKED LINE GOES. It used to be one line under the preview plus a toast, and the toast is an
   overlay pinned to the top of the screen: tap a locked target colour and the word "locked" landed across the preview
   and the rows above, unreadable, while the line that explained it sat somewhere else entirely. A requirement belongs
   under the row it is about. Each group owns its own line, at most one is ever filled, and the toast is gone from this
   path — nothing about a locked cosmetic is drawn over anything now. The track row is not in this list on purpose: a
   locked track carries a padlock and says nothing about what opens it (A.1). */
const LOCK_SETS=['sq','lead','cut','bg','snd','scale','rate'];
function lockLine(set,L){ const el=$('#lk-'+set); if(!el) return;
  if(!L){ el.innerHTML=''; el.dataset.ach=''; return; }
  el.innerHTML=T(CUSTOM.lockLine,{name:L.name,how:L.how}); el.dataset.ach=L.id; }
// which groups a game shows — the same four tests renderCustom applies to the group rows below
const shows=(g,set)=>set==='lead'?!!GAMES[g].lead:set==='cut'?g==='hold':set==='scale'?g==='sequence':set==='rate'?!!GAMES[g].timed:true;
function renderCustom(){
  const fresh=[];
  for(const set of ['sq','lead','cut','bg']) $('#c-'+set).innerHTML = ITEMS[set].map(it=>{ const L=lockedBy(it); const isWheel=it.v==='wheel';
    const curC=colOf(F.g)[set];
    const selNow = isWheel ? (set==='bg'?!!prefs.tint:!ITEMS[set].some(o=>o.v===curC)) : (set==='bg'?prefs.bg===it.v&&!prefs.tint:curC===it.v);
    const nw=L?'':newMark('cos:'+set+':'+it.v,fresh);
    const cls=`${selNow?'sel':''} ${L?'locked':''}${nw} ${pvTry.set===set&&pvTry.v===it.v?'pvw':''} ${isWheel?'wheel':''} ${set==='bg'&&!isWheel?'bg-'+it.v:''}`;
    const style=set==='bg'?`background-color:${DESIGNS[it.v]?.tint||'transparent'}`:isWheel?'':`background:${it.v}`;
    return `<button data-act="item" data-v="${it.v}" class="${cls}" data-lock="${L?L.id:''}" style="${style}" aria-label="${it.v}${L?' locked':''}"></button>`; }).join('');
  for(const set of ['snd','scale','rate']) $('#c-'+set).innerHTML = itemsOf(set).map(it=>{ const L=lockedBy(it); const nw=L?'':newMark('cos:'+set+':'+it.v,fresh); return `<button data-act="item" data-v="${it.v}" class="opt ${String(prefs[set])===String(it.v)?'sel':''} ${L?'locked':''}${nw}" data-lock="${L?L.id:''}">${it.label}</button>`; }).join('');
  /* v18 (B.28): ONE music row, and it is the track. It was four controls — on / off, a Preview button, which track, and
     a second Preview button — for a thing Aiden describes in one word: "Music". So the row is this game's track, named,
     and a tap plays it. Free choice is a chest 2 reward (A.3), so until then the row is the single track it is set to
     with a padlock, and NOT a word about what opens it (A.1 forbids the pro and author tiers existing on any screen
     before chest 1). A locked row still previews — hearing what you have is not the reward. Dev unlock-all opens it,
     which is how Aiden compares the three on his phone before either chest is reachable. TRACK_PICK is still the
     default; `prefs.track` is only what he chose. */
  // v23 (L.10, build 40): "chest 2" is the Pro chest by name — chestOpen() honours the two dev escapes, as every gate does (#411)
  const free=chestOpen('pro'), opts=TRACK_OPTS[F.g]||[], cur=prefs.track[F.g]||TRACK_PICK[F.g];
  $('#c-track').innerHTML = (free?opts:[cur]).map(o=>{ const t=TRACKS[F.g+':'+o]||{};
    return `<button data-act="item" data-v="${o}" class="opt ${o===cur?'sel':''} ${free?'':'locked plain'}">${esc(t.name||o)}</button>`; }).join('');
  // the menu loop is not a game's, so it gets its own switch rather than hiding inside one game's row
  $('#c-menumusic').innerHTML = itemsOf('music').map(it=>`<button data-act="item" data-v="${it.v}" class="opt ${musicOn('menu')===it.v?'sel':''}">${it.label}</button>`).join('');
  $('#pv-g').innerHTML=Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-pv" data-chip="pv-g" data-v="${id}">${x.name}</button>`).join(''); chips('pv','g',F.g);
  $('#pv').dataset.g=F.g; $('#g-lead').style.display=shows(F.g,'lead')?'':'none';
  $('#g-cut').style.display=shows(F.g,'cut')?'':'none'; $('#g-scale').style.display=shows(F.g,'scale')?'':'none';
  // v14 (6.7): the taps-per-second reading is a choice, and only the timed games have a rate bar to show it on
  $('#g-rate').style.display=shows(F.g,'rate')?'':'none';
  if(F.g==='spot'&&!$('#pvsp').children.length){ const sh=['','c','t']; $('#pvsp').innerHTML=Array.from({length:14},(_,i)=>`<i class="${i===9?'c':sh[i%2?0:2]}"></i>`).join(''); }
  const pv=$('#pv').style; pv.setProperty('--sq-live',colOf(F.g).sq); pv.setProperty('--cue',colOf(F.g).lead); pv.setProperty('--cutp',colOf(F.g).cut||colOf(F.g).sq); pv.removeProperty('background');
  // B.30: at most one group says anything, and it says it under its own row
  for(const s of LOCK_SETS) lockLine(s,null);
  if(pvTry.set){ const L=ACH.find(a=>a.id===pvTry.by); const map={sq:'--sq-live',lead:'--cue',cut:'--cutp'}; if(map[pvTry.set]&&pvTry.v!=='wheel') pv.setProperty(map[pvTry.set],pvTry.v); if(pvTry.set==='bg'&&DESIGNS[pvTry.v]) pv.background=DESIGNS[pvTry.v].tint; lockLine(pvTry.set,L); }
  // v11: an unlocked colour says nothing when tapped — the requirement line is for locked ones only
  else if(pvSeen.by&&!got()[pvSeen.by]&&!prefs.allOpen&&!prefs.supporter) lockLine(pvSeen.set,ACH.find(a=>a.id===pvSeen.by));
  markSeen(fresh);
}
/* previews (v9): every game's preview is played by the same finger as the pre-game demo — it shows the tap and what comes of it, on a loop */
const PV={k:0,n:1,last:''};
const pvG=(x,y)=>{ const g=$('#pvg'); g.style.left=x+'%'; g.style.top=y+'%'; g.classList.add('on'); };
const pvTap=()=>{ const g=$('#pvg'); g.classList.remove('tap'); void g.offsetWidth; g.classList.add('tap'); };
const pvPop=el=>{ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
function pvStep(){
  // build 39: the preview runs while THIS screen is up (it was "while the Customise tab is up" from build 33 to 38)
  if(!$('#s-custom').classList.contains('on')) return;
  const g=F.g; if(g!==PV.last){ PV.last=g; PV.k=0; $('#pvg').classList.remove('on','hold'); } const k=PV.k++;
  if(g==='quick-tap'){ const ph=k%3; if(ph===0){ PV.n=Math.random()<.5?0:1; [0,1].forEach(i=>$('#pv'+i).style.setProperty('--v',PV.n===i?1:0)); pvG(PV.n?75:25,80); } else if(ph===1){ pvTap(); pvPop($('#pv'+PV.n)); } }
  else if(g==='dots'){ const ph=k%3; const d=$('#pvdot'), l=$('#pvlead'); if(ph===0){ PV.pos=PV.next||{x:.4,y:.3}; PV.next={x:Math.random()*.76,y:Math.random()*.62}; d.style.left=PV.pos.x*100+'%'; d.style.top=PV.pos.y*100+'%'; l.style.left=PV.next.x*100+'%'; l.style.top=PV.next.y*100+'%'; d.classList.add('on'); l.classList.add('on'); pvG(PV.pos.x*100+11,PV.pos.y*100+17); } else if(ph===1) pvTap(); }
  // v14 (8.8): Estimate is two modes and the screen offers a swatch for each, so the preview plays both — seven beats of Grow,
  // then seven of Cut, where the finger draws a line and the two pieces land in the Cut pieces colour
  else if(g==='hold'){ const ph=k%14, box=$('.pvhold'), t=$('#pvhtxt'), f=$('#pvg');
    if(ph<7){ box.classList.remove('cut'); const m=$('.pvhold .m'); const q=ph;
      if(q===0){ m.setAttribute('r',0); t.innerHTML='tap and hold'; f.classList.remove('hold'); pvG(50,86); }
      else if(q===1){ f.classList.add('hold'); t.innerHTML=''; m.setAttribute('r',26+Math.random()*9); }
      else if(q===3){ f.classList.remove('hold'); const r=+m.getAttribute('r'), pct=r*r/900*100, err=Math.abs(pct-100); t.innerHTML=`<b class="${err<=8?'g':'r'}">${pct.toFixed(1)}%</b>${err<=8?'close':pct>100?'too much':'too little'}`; } }
    else { box.classList.add('cut'); const q=ph-7, a=$('#pvhcut .pa'), b=$('#pvhcut .pb'), ln=$('#pvhline');
      if(q===0){ PV.cut=30+Math.random()*40; a.setAttribute('d','M50 22h60v60H50z'); b.setAttribute('d','M50 22h60v60H50z'); ln.setAttribute('x1',50); ln.setAttribute('x2',50); t.innerHTML='draw a line'; f.classList.remove('hold'); pvG(34,52); }
      else if(q===1){ pvTap(); pvG(34+PV.cut*.6,52); }
      else if(q===2){ const x=(50+PV.cut*.6).toFixed(0); ln.setAttribute('x1',x); ln.setAttribute('x2',x); a.setAttribute('d',`M50 22H${x}v60H50z`); b.setAttribute('d',`M${x} 22h${(110-x).toFixed(0)}v60H${x}z`); t.innerHTML=''; }
      else if(q===4){ t.innerHTML=`<b class="g">${Math.round(PV.cut)}%</b>cut off`; } } }
  else if(g==='sequence'){ const ks=$$('.pvseq i'), ph=k%6; if(ph===0){ PV.a=Math.random()*5|0; PV.b=(PV.a+1+(Math.random()*3|0))%5; ks.forEach(x=>x.classList.remove('lit')); $('#pvg').classList.remove('on'); ks[PV.a].classList.add('lit'); } else if(ph===1){ ks.forEach(x=>x.classList.remove('lit')); ks[PV.b].classList.add('lit'); } else if(ph===2){ ks.forEach(x=>x.classList.remove('lit')); pvG(10+PV.a*20,60); } else if(ph===3){ pvTap(); ks[PV.a].classList.add('lit'); pvG(10+PV.b*20,60); } else if(ph===4){ pvTap(); ks[PV.a].classList.remove('lit'); ks[PV.b].classList.add('lit'); } else ks.forEach(x=>x.classList.remove('lit')); }
  else if(g==='timing'){ const ph=k%9, c=$('#pvclk'), r=$('#pvtmres'); if(ph===0){ c.textContent='0.00'; c.style.opacity=1; r.innerHTML=''; pvG(50,84); } else if(ph<6){ const e=ph*1.35; c.textContent=e.toFixed(2); c.style.opacity=e<1.5?1:Math.max(0,1-(e-1.5)/1.2); } else if(ph===6){ pvTap(); const e=6.75+Math.random()*.6; c.textContent=e.toFixed(2); c.style.opacity=1; const err=Math.abs(e-7); r.innerHTML=`<b class="${err<=.1?'g':err<=.3?'':'r'}">${err.toFixed(2)}s</b>${e>7?'late':'early'}`; } }
  else if(g==='reaction'){ const p=$('#pvrx'), ph=k%6; if(ph===0){ p.classList.remove('lit'); p.textContent='wait for it'; pvG(50,86); } else if(ph===3){ p.classList.add('lit'); p.textContent='tap'; } else if(ph===4){ pvTap(); p.classList.remove('lit'); p.innerHTML=`<b>${180+(Math.random()*90|0)} ms</b>`; } }
  else if(g==='spot'){ const ks=$$('#pvsp i'), ph=k%5; if(!ks.length) return; if(ph===0){ ks.forEach(x=>x.classList.remove('odd','dim')); $('#pvg').classList.remove('on'); } else if(ph===2){ const o=ks[9], r=o.getBoundingClientRect(), b=$('#pv').getBoundingClientRect(); pvG((r.left+r.width/2-b.left)/b.width*100,(r.top+r.height/2-b.top)/b.height*100); } else if(ph===3){ pvTap(); ks[9].classList.add('odd'); ks.forEach((x,i)=>{ if(i!==9) x.classList.add('dim'); }); } }
}
setInterval(pvStep,520);

/* colour wheel: hue around, saturation outward. Writes straight into prefs[set] (bg → tint) */
const Wheel=(()=>{ const cv=$('#wheel'), cx=cv.getContext('2d'); let set='sq', drawn=false, col='#ffffff';
  // v14 (8.11): the wheel opens with a ring on the colour already chosen, and the ring follows the finger. hueSat() is the
  // inverse of hsl() — it turns the stored hex back into the angle and radius it came off, so the ring lands where it was picked
  function hueSat(hex){ const m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex||''); if(!m) return null;
    const [r,g,b]=[1,2,3].map(i=>parseInt(m[i],16)/255); const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
    let h=0; if(d){ h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4); h*=60; }
    const l=(mx+mn)/2, sat=d===0?0:d/(1-Math.abs(2*l-1)); return { h, s:Math.min(1,sat) }; }
  function mark(h,sv){ const el=$('#wheelmark'); if(!el) return; if(h===null){ el.style.display='none'; return; }
    const a=h*Math.PI/180, r=Math.min(1,sv)*50; el.style.display=''; el.style.left=(50+Math.cos(a)*r)+'%'; el.style.top=(50+Math.sin(a)*r)+'%'; }
  function draw(){ const R=240; const img=cx.createImageData(480,480); const d=img.data; for(let y=0;y<480;y++) for(let x=0;x<480;x++){ const dx=x-R, dy=y-R, r=Math.hypot(dx,dy); const i=(y*480+x)*4; if(r>R){ d[i+3]=0; continue; } const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360, s=r/R, [rr,gg,bb]=hsl(h,s,set==='bg'?.08:.6); d[i]=rr; d[i+1]=gg; d[i+2]=bb; d[i+3]=255; } cx.putImageData(img,0,0); drawn=true; }
  function hsl(h,s,l){ const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2; let r,g,b; if(h<60)[r,g,b]=[c,x,0]; else if(h<120)[r,g,b]=[x,c,0]; else if(h<180)[r,g,b]=[0,c,x]; else if(h<240)[r,g,b]=[0,x,c]; else if(h<300)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x]; return [r,g,b].map(v=>Math.round((v+m)*255)); }
  function pick(e){ const b=cv.getBoundingClientRect(); const x=(e.clientX-b.left)/b.width*480, y=(e.clientY-b.top)/b.height*480; const dx=x-240, dy=y-240, r=Math.min(240,Math.hypot(dx,dy)); const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360; const [rr,gg,bb]=hsl(h,r/240,set==='bg'?.08:.6); col='#'+[rr,gg,bb].map(v=>v.toString(16).padStart(2,'0')).join(''); $('#wheelout').style.background=col; mark(h,r/240); if(set==='bg') prefs.tint=col; else prefs.col[F.g][set]=col; applyPrefs(F.g); $('#pv').style.setProperty(set==='sq'?'--sq-live':set==='cut'?'--cutp':'--cue',col); }
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); pick(e); cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove',e=>{ if(e.buttons) pick(e); });
  return { open(s){ set=s; draw(); $('#wheel-title').textContent=T(CUSTOM.wheel,{word:ITEM_WORD[s]||s,game:GAMES[F.g].name});
      const cur=s==='bg'?(prefs.tint||DESIGNS[prefs.bg].tint):colOf(F.g)[s]; $('#wheelout').style.background=cur;
      const hs=hueSat(cur); mark(hs?hs.h:null,hs?hs.s:0); $('#wheelwrap').classList.add('on'); },
    close(){ $('#wheelwrap').classList.remove('on'); renderCustom(); } }; })();
on('screen:change',({id})=>{ if(id==='game') $('#wheelwrap').classList.remove('on'); });

/* build 39: what setTab('cus', opts) did on Progress, as this screen's own arrival. `g` is the game to preview — an earned
   row on Progress's Customise unlocks tab passes its own; `unlocks` is that row's payout, scrolled to and ringed for 1.8s
   the way the tab did it (v23 L.4d, "with that item selected" — picked out, not applied: applying it would change a
   colour he has chosen without asking, guess). A payout into a group this game does not show (Every game's lead colour
   on a game with no lead) previews the first game that shows it; the tab scrolled to a hidden row and showed nothing. */
// v23 (L.11a / D.5, build 40): the menu row stays green until this screen is first opened after the Games chest — this is that opening
register('s-custom',{ onShow(o){ const k=o.unlocks?o.unlocks[0]:null; if(chestOpen('games')&&!prefs.cusSeen){ prefs.cusSeen=1; save(); }
  F.g=o.g&&GAMES[o.g]?o.g:sel.game;
  if(k&&!shows(F.g,k)) F.g=Object.keys(GAMES).find(g=>shows(g,k))||F.g;
  pvTry.set=null; pvSeen.by=null; renderCustom();
  if(k){ const v=k==='wheel'?'wheel':o.unlocks[1]; const grp=$('#c-'+(k==='wheel'?'sq':k));
    if(grp){ grp.closest('.cgroup').scrollIntoView({block:'center',behavior:'smooth'}); const sw=grp.querySelector(`[data-v="${v}"]`); if(sw){ sw.classList.add('pvw'); setTimeout(()=>sw.classList.remove('pvw'),1800); } } } } });
define({
  /* v21 (F.4, build 35): a locked swatch being PREVIEWED belongs to the game it was tapped on. `pvTry` survived the game chip,
     so light blue tried on Quick Tap was drawn on Dots' preview, and on every game after it, until something else cleared it. */
  'chip-pv'(b){ F.g=b.dataset.v; pvTry.set=null; pvSeen.by=null; renderCustom(); return 'pick'; },
  // B.30: the locked line is the control now — a tap on it goes to the achievement that opens the item, on Progress (build 39)
  pvlock(b){ if(b.dataset.ach) show('s-prog',{ach:b.dataset.ach}); return 'click'; },
  'wheel-done'(){ Wheel.close(); return 'click'; },
  // a Customise item: colour, background, sound pack, scale, the track, the menu loop — the group is the closest [data-set]
  item(b){ const set=b.closest('[data-set]'); if(!set) return 'pick'; const k=set.dataset.set;
    /* B.30: a locked item previews itself and says what opens it UNDER ITS OWN ROW. The toast that used to carry this is
       gone from here — it is an overlay, and an overlay is the one place a requirement about a row must not be drawn */
    if(b.classList.contains('locked')&&k!=='track'){ const L=achById(b.dataset.lock); Object.assign(pvTry,{set:k,v:b.dataset.v,by:L.id}); renderCustom(); return 'pick'; }
    pvTry.set=null; const it=(itemsOf(k)||[]).find(i=>String(i.v)===b.dataset.v); pvSeen.set=k; pvSeen.by=it&&it.by||null; if(b.dataset.v==='wheel'){ Wheel.open(k); return 'pick'; }
    if(k==='bg'){ prefs.bg=b.dataset.v; prefs.tint=''; }
    else if(k==='sq'||k==='lead'||k==='cut') prefs.col[F.g][k]=b.dataset.v;
    /* B.28: the music row IS the track. A tap plays it, whether or not it can be chosen — a locked row is the one this
       game already plays, and hearing it is the whole of what the row is for. */
    else if(k==='track'){ if(!b.classList.contains('locked')) prefs.track[F.g]=b.dataset.v; Music.preview(F.g,4200,b.dataset.v); }
    else if(k==='menumusic'){ prefs.musicG.menu=b.dataset.v==='true'; if(b.dataset.v==='true') Music.menu('menu'); else Music.stop(); }
    // v13 (7.1): the scale left the pick sheet — one choice, applied to every Sequence run
    else if(k==='scale'){ prefs.scale=b.dataset.v; sel.scale=b.dataset.v; }
    else prefs[k]=b.dataset.v;
    applyPrefs(F.g); renderCustom();
    if(k==='scale') Snd.scaleHear();
    // v13 (12.2): the pack is demonstrated with the app's own tap sounds, in the pack just picked — a select, then a hit
    if(k==='snd'){ Snd.select(); setTimeout(()=>Snd.hit(),150); } return 'pick'; },
});
