/* No Excuses — Progress: Game unlocks · Customise · Achievements, three tabs on one screen (build 33, v18 §B.31).

   Build 23 (v15 §2.4) split unlocks from achievements onto two screens, and the reason was right: an UNLOCK opens
   something you could not play before, an achievement is a mark on a thing you already have. Build 29 (v17 §B.21) made
   that split two tabs instead of two menu rows. Build 33 brings Customise in beside them, because nearly every cosmetic
   in it is opened by an achievement listed one tab across — Aiden: "anything that opens customisation goes under
   customise; achievements is just extra". Unlocks is now GAME unlocks, which says what it holds and what it does not:
   the games, modes and lengths that gate PLAY. A cosmetic's requirement is on the Achievements tab and nowhere else, so
   no requirement is written twice on a screen that now shows all three.

   ONE file, not three and a host: A4 forbids a screen importing a screen, so a tab host calling into `customise.js`
   would be exactly the thing it forbids. This is the merge — `ui/screens/customise.js` is deleted, as `unlocks.js` and
   `achievements.js` were at build 29. The menu row and the screen id do not move (B.31 names the tab titles, not the
   row): Progress covers unlocks and achievements outright and customise is what they pay out.

   L6 is quoted by B.31, because "the Unlocks screen" in that rule is the Game unlocks tab now. Nothing else about it
   moved: every line on it still comes out of UNLOCKS and lenLock() / lenNeed() in progress.js, exactly as the lock box,
   the goal line and the Next card do. A tap on a locked row opens the same lock box the pick sheet opens.

   The screen remembers which tab was last open in `prefs.progTab`; only the tab that is up renders.

   SHELL, still, on the key section: what sits behind keys 2 and 3 is register #372 and is not decided (v15 §5.3). */
import { Music, Snd } from "../../audio.js";
import { SCALES, TRACKS, TRACK_OPTS, TRACK_PICK } from "../../config/audio.js";
import { ACH_SCREEN, CUSTOM, ITEM_WORD, PROGRESS_SCREEN, TIERS, UNLOCKS_SCREEN } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { DESIGNS, ITEMS } from "../../config/theme.js";
import { $, $$, T, esc } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { musicOn, prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { ACH, Scores, UNLOCKS, achAll, achById, gameOpen, got, isOpen, lenLock, lenOpen, markSeen, newMark, setPendingAim, unlockHtml, unlockName, unlocked } from "../../progress.js";
import { keyAch, keyState, tierOpen } from "../../progress/key.js";

// v18 (B.25): the key achievement sets live in progress/key.js (progress.js cannot import it); this screen reads both lists
const allAch=()=>achAll().concat(keyAch());
const findAch=id=>achById(id)||keyAch().find(a=>a.id===id);
// the second and third key sets are not shown before chest 1 (A.1)
const groupShown=t=>!/^key[23]$/.test(t)||tierOpen('pro');
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { register, show } from "../router.js";
import { applyPrefs, colOf } from "../theme.js";

const TABS = ['unl', 'cus', 'ach'];
const tabOf = t => TABS.includes(t) ? t : (TABS.includes(prefs.progTab) ? prefs.progTab : 'unl');

/* ---------- the Game unlocks tab (build 23, v15 §2.4 — unchanged but for where it lives and what it is called) ---------- */
const row=(cls,name,need,state,data)=>`<button data-act="unl" class="urow ${cls}"${data}><span>${name}</span><em>${state}</em><small>${need}</small></button>`;
function renderUnlocks(){
  const u=unlocked(); const fresh=[];
  // the chain, in the order it is earned. A row is open when its key is in the store or its game is open from the start
  const chain=UNLOCKS.map(x=>{ const [g,d]=x.key.split(':'); const open=x.key==='sequence:practice'?!!u[x.key]:isOpen(g,d);
    const nw=open?newMark('mode:'+g+':'+d,fresh):'';
    return row('u'+(open?' done':' lock')+nw,unlockName(x.key),open?'':x.need,open?UNLOCKS_SCREEN.done:UNLOCKS_SCREEN.locked,` data-g="${g}" data-d="${d}"`); }).join('');
  // every length of every mode, from lenLock — the same call the pick sheet's crossed-out rows make
  const lens=[];
  for(const g in GAMES){ if(!gameOpen(g)) continue; for(const d of GAMES[g].modes) for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(!L&&GC(g,d).lens.indexOf(s)===0) continue;
    const name=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,s,d)}`;
    lens.push(row('u'+(L?' lock':' done'),name,L?L.need:'',L?UNLOCKS_SCREEN.locked:UNLOCKS_SCREEN.done,` data-g="${g}" data-d="${d}" data-s="${s}"`)); } }
  const k=keyState();
  $('#unl-list').innerHTML=
    `<h4>${UNLOCKS_SCREEN.games}</h4>${chain}`+
    `<h4>${UNLOCKS_SCREEN.lens}</h4>${lens.join('')||''}`+
    `<h4>${UNLOCKS_SCREEN.keys}</h4>`+
    // v17 (B.9): the count in the key line is read from the same keyState() the row's own figure comes from — a literal
    // would have gone stale the day Sequence lost 5 keys, which is the day it did
    row('u key'+(k.done>=k.total?' done':' lock'),UNLOCKS_SCREEN.keys,T(UNLOCKS_SCREEN.keyLine,{n:k.total}),`${k.done}/${k.total}`,' data-key="1"');
  markSeen(fresh);
}

/* ---------- the Customise tab (build 18; was ui/screens/customise.js until build 33) ----------
   The live preview and its finger, the per-game colour groups, background, tap sound, scale, the music rows, the colour
   wheel. Every item is a data-act="item" button inside a [data-set] group. Arriving with {unlocks} scrolls to and
   flashes the item an achievement just opened. */
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
  const free=!!(prefs.chest2||prefs.allOpen||prefs.supporter), opts=TRACK_OPTS[F.g]||[], cur=prefs.track[F.g]||TRACK_PICK[F.g];
  $('#c-track').innerHTML = (free?opts:[cur]).map(o=>{ const t=TRACKS[F.g+':'+o]||{};
    return `<button data-act="item" data-v="${o}" class="opt ${o===cur?'sel':''} ${free?'':'locked plain'}">${esc(t.name||o)}</button>`; }).join('');
  // the menu loop is not a game's, so it gets its own switch rather than hiding inside one game's row
  $('#c-menumusic').innerHTML = itemsOf('music').map(it=>`<button data-act="item" data-v="${it.v}" class="opt ${musicOn('menu')===it.v?'sel':''}">${it.label}</button>`).join('');
  $('#pv-g').innerHTML=Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-pv" data-chip="pv-g" data-v="${id}">${x.name}</button>`).join(''); chips('pv','g',F.g);
  $('#pv').dataset.g=F.g; $('#g-lead').style.display=GAMES[F.g].lead?'':'none';
  $('#g-cut').style.display=F.g==='hold'?'':'none'; $('#g-scale').style.display=F.g==='sequence'?'':'none';
  // v14 (6.7): the taps-per-second reading is a choice, and only the timed games have a rate bar to show it on
  $('#g-rate').style.display=GAMES[F.g].timed?'':'none';
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
  // build 33: the preview runs while the Customise TAB is up, not merely while the screen is — the other two tabs are
  // a list each and the finger is not on screen for either of them
  if(!$('#s-prog').classList.contains('on')||$('#p-cus').hidden) return;
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

/* ---------- the Achievements tab (build 18; the filter row, three tiers plus the author rows) ---------- */
const A={ g:'all' };
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=A.g; const fresh=[]; let k=0;
  $('#ach-g').innerHTML=`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  const list=allAch().filter(a=>gsel==='all'||a.g===gsel||a.g==='all');
  const fsGame=gsel==='all'?sel.game:gsel;
  $('#achlist').innerHTML = Object.keys(TIERS).filter(groupShown).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    if(!items.length) return '';
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>{
      const isDone=!!g[a.id], secret=a.tier==='secret'&&!isDone;
      const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
      // v14 (8.3): the game name leads the title. v14 (8.4): so it is written once — the jump line below repeats it only for
      // the rows that have no game of their own ("Every game", "Full set") or that name no mode and no length to point at
      const wg=a.g==='all'?fsGame:a.g;
      const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
      const bar=p!==null?`<div class="pbar ${secret?'s':''}"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
      const jump=a.g!=='all'||a.id==='fullset';
      const wbits=[]; if(a.at?.d) wbits.push(MODE_NAME[a.at.d]); if(a.at?.s!==undefined) wbits.push(lenName(a.g,a.at.s,a.at?.d||GAMES[wg].modes[0]));
      if(a.g==='all'||!wbits.length) wbits.unshift(GAMES[wg].name);
      const where=jump&&!secret?`<small class="go">→ ${wbits.join(' · ')}</small>`:'';
      // v14 (8.1): a requirement that is a set of things names the ones still outstanding
      const left=!isDone&&a.left?a.left(all):null;
      const leftTxt=left&&left.length?T(ACH_SCREEN.left,{names:left.join(', ')}):'';
      // v14 (8.5): a secret row is described. The name stays ???; the hint says what kind of thing earns it, never the number
      const line=secret?(a.hint||ACH_SCREEN.stretch)+(p!==null?T(ACH_SCREEN.progress,{p:Math.round(p*100)}):'')
                       :a.how+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')+leftTxt;
      const nw=isDone?newMark('ach:'+a.id,fresh):''; const dl=isDone?` style="animation-delay:${Math.min(k++,14)*70}ms"`:'';
      return `<button data-act="ach" class="a ${isDone?'done':'lock'}${nw} ${jump?'jump':''}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${gname}${isDone?'✓ ':''}${secret?ACH_SCREEN.hidden:a.name}</span><em class="${a.unlocks&&!isDone?'u':''}">${isDone?ACH_SCREEN.done+(a.unlocks?' · '+unlockHtml(a):''):a.unlocks?unlockHtml(a):secret?ACH_SCREEN.secret:''}</em><small>${line}</small>${where}${bar}</button>`; }).join(''); }).join('');
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?(A.g==='all'?sel.game:A.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s}); setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); }

/* ---------- the three tabs ---------- */
// only the tab that is up is rendered: the achievements list is the longest markup in the app, the unlocks list walks
// every mode of every game and Customise rebuilds seven swatch rows, so building the hidden ones would be three renders
// for one screen. `opts.unlocks` is an achievement's payout — the Customise tab scrolls to it and flashes it
function setTab(t,opts){ const tab=tabOf(t); prefs.progTab=tab; save(); opts=opts||{};
  $$('#prog-tabs .chip').forEach(c=>c.classList.toggle('sel',c.dataset.tab===tab));
  $('#p-unl').hidden=tab!=='unl'; $('#p-cus').hidden=tab!=='cus'; $('#p-ach').hidden=tab!=='ach';
  if(tab==='unl') renderUnlocks(); else if(tab==='cus'){ F.g=sel.game; pvTry.set=null; pvSeen.by=null; renderCustom(); } else renderAch();
  if(tab==='cus'&&opts.unlocks){ const [k,v]=opts.unlocks; const grp=$('#c-'+(k==='wheel'?'sq':k));
    if(grp){ grp.closest('.cgroup').scrollIntoView({block:'center',behavior:'smooth'}); const sw=grp.querySelector(`[data-v="${v}"]`); if(sw){ sw.classList.add('pvw'); setTimeout(()=>sw.classList.remove('pvw'),1800); } } }
  if(tab==='ach'&&opts.ach){ const r=$('#ach-'+opts.ach); if(r){ r.scrollIntoView({block:'center'}); r.classList.add('flash'); } } }

register('s-prog',{ onShow(o){ const a=o.ach?findAch(o.ach):null; if(a) A.g=a.g==='all'?'all':a.g;
  $('#unl-hint').textContent=PROGRESS_SCREEN.unlHint; $('#ach-hint').textContent=PROGRESS_SCREEN.achHint;
  $('#unl-lede').textContent=UNLOCKS_SCREEN.lede;
  setTab(o.ach?'ach':o.unlocks?'cus':o.tab,o); } });
define({
  ptab(b){ setTab(b.dataset.tab); return 'pick'; },
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  unl(b){ if(b.dataset.key) { show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    show('s-pick',{g,d,s:len}); return 'click'; },
  'chip-ach'(b){ A.g=b.dataset.v; renderAch(); return 'pick'; },
  // an earned achievement (v11) opens the Customise tab at what it unlocked; a locked one still offers the run
  ach(b){ const a=findAch(b.dataset.ach); if(!a) return 'click'; if(got()[a.id]){ if(a.g!=='all') sel.game=a.g; setTab('cus',{unlocks:a.unlocks}); return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
  'chip-pv'(b){ F.g=b.dataset.v; renderCustom(); return 'pick'; },
  // B.30: the locked line is the control now — a tap on it goes to the achievement that opens the item
  pvlock(b){ if(b.dataset.ach) setTab('ach',{ach:b.dataset.ach}); return 'click'; },
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
