/* No Excuses — customise, navigation, pick sheet, scoreboard, result screen, lock box, achievements screen
   Split out of index.html at build 12. Build 15 (refactor stage 1): prefs live in core/store.js, sel/VS/F in core/state.js,
   the challenge link in core/platform.js; the screen functions that were in progress.js (lock box, open-sheet,
   achievements list) live here. This file never imports app.js. */

import { Snd } from "./audio.js";
import { SCALES } from "./config/audio.js";
import { PUB_URL } from "./config/build.js";
import { ABOUT, ACH_SCREEN, BOARD, CUSTOM, ITEM_WORD, LOCK, MENU, PASS_LINE, RESULT, SHARE, SHEET, TIERS, TOAST, VS_LINE } from "./config/copy.js";
import { MODE_NAME, PASS_LEN, VS_LEAD } from "./config/games.js";
import { DESIGNS, ITEMS, VS_ART } from "./config/theme.js";
import { $, $$, T, esc, pWho } from "./core.js";
import { CHAL } from "./core/platform.js";
import { F, VS, sel } from "./core/state.js";
import { musicOn, prefs, save } from "./core/store.js";
import { GAMES, GC, SHARED2, lenName, lenSub, versusOf } from "./games/registry.js";
import { ACH, Scores, UNLOCKS, achAll, achById, gameOpen, got, isOpen, lenLock, lenOpen, lensOf, markSeen, needFor, newMark, nextGoal, practiceOpen, seedSeen, setPendingAim, unlockHtml, unlockName, unlocked } from "./progress.js";
import { quality } from "./progress/rules.js";
import { colsOf, fmtScore, picOf, scoreTxt } from "./ui/format.js";
import { toast } from "./ui/toast.js";
/* ---------- prefs / customise (the tables — DESIGNS, ITEMS — are data in config/theme.js since build 16) ---------- */
const itemsOf=set=>set==='scale'?Object.entries(SCALES).map(([k,v])=>({v:k,label:v.name})):ITEMS[set];
if(!DESIGNS[prefs.bg]){ prefs.tint=String(prefs.bg).startsWith('#')?prefs.bg:''; prefs.bg='stars'; } // v3 stored a hex here
// supporters (v10) have every cosmetic open; "open everything" is the testing switch for the same thing
const lockedBy=it=> it.by && !got()[it.by] && !prefs.allOpen && !prefs.supporter ? ACH.find(a=>a.id===it.by) : null;
function freshGame(){ ['ne.runs','ne.ach','ne.unlock','ne.intro','ne.tileSeen','ne.seen'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} }); prefs.allOpen=false; prefs.story=0; prefs.adRuns=0; prefs.played=0; prefs.gridSeen=0; save('ne.prefs',prefs); lastRun=null; menuWasFirst=true; seedSeen(); Story.open(); }
function devState(){ const u=Object.keys(unlocked()).length, a=Object.keys(got()).length, r=Scores.runs().length; $('#dev-state').textContent=(prefs.allOpen?ABOUT.devOpen:T(ABOUT.devProg,{u,nu:UNLOCKS.length,a,na:ACH.length}))+T(ABOUT.devRuns,{r})+(prefs.supporter?ABOUT.devSup:ABOUT.devFree); $('#dev-open').classList.toggle('sel',!!prefs.allOpen); $('#dev-sup').classList.toggle('sel',!!prefs.supporter); renderTier(); }
// what supporting gets (v13, 13.1): no comparison table — a thank-you line and three lines of what is included. Pro lengths are gone (0.3)
function renderTier(){ $('#tierbox').innerHTML=ABOUT.tier.map(t=>`<div><span>${t}</span></div>`).join('');
  $('#support-title').textContent=prefs.supporter?ABOUT.supTitleOn:ABOUT.supTitleOff; $('#support-text').textContent=prefs.supporter?ABOUT.supTextOn:ABOUT.supTextOff; }
const colOf=g=>prefs.col[g]||prefs.col['quick-tap'];
function applyPrefs(g){ const r=document.documentElement.style; const c=colOf(g||sel?.game||prefs.lastGame); r.setProperty('--sq-live',c.sq); r.setProperty('--cue',c.lead); r.setProperty('--cutp',c.cut||c.sq); r.setProperty('--ground',prefs.tint||DESIGNS[prefs.bg].tint); save('ne.prefs',prefs); }
applyPrefs(prefs.lastGame);
const pvTry={};  // a locked item being previewed: {set, v, by}
function renderCustom(){
  const fresh=[];
  for(const set of ['sq','lead','cut','bg']) $('#c-'+set).innerHTML = ITEMS[set].map(it=>{ const L=lockedBy(it); const isWheel=it.v==='wheel';
    const curC=colOf(F.pv.g)[set];
    const selNow = isWheel ? (set==='bg'?!!prefs.tint:!ITEMS[set].some(o=>o.v===curC)) : (set==='bg'?prefs.bg===it.v&&!prefs.tint:curC===it.v);
    const nw=L?'':newMark('cos:'+set+':'+it.v,fresh);
    const cls=`${selNow?'sel':''} ${L?'locked':''}${nw} ${pvTry.set===set&&pvTry.v===it.v?'pvw':''} ${isWheel?'wheel':''} ${set==='bg'&&!isWheel?'bg-'+it.v:''}`;
    const style=set==='bg'?`background-color:${DESIGNS[it.v]?.tint||'transparent'}`:isWheel?'':`background:${it.v}`;
    return `<button data-act="item" data-v="${it.v}" class="${cls}" data-lock="${L?L.id:''}" style="${style}" aria-label="${it.v}${L?' locked':''}"></button>`; }).join('');
  for(const set of ['snd','scale']) $('#c-'+set).innerHTML = itemsOf(set).map(it=>{ const L=lockedBy(it); const nw=L?'':newMark('cos:'+set+':'+it.v,fresh); return `<button data-act="item" data-v="${it.v}" class="opt ${String(prefs[set])===String(it.v)?'sel':''} ${L?'locked':''}${nw}" data-lock="${L?L.id:''}">${it.label}</button>`; }).join('');
  // music is per game now (12.1): the row switches this game's track and previews it
  $('#c-music').innerHTML = itemsOf('music').map(it=>`<button data-act="item" data-v="${it.v}" class="opt ${musicOn(F.pv.g)===it.v?'sel':''}">${it.label}</button>`).join('')+`<button data-act="music-pv" class="opt" id="c-music-pv">${CUSTOM.preview}</button>`;
  $('#pv-g').innerHTML=Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip" data-chip="pv-g" data-v="${id}">${x.name}</button>`).join(''); chips('pv','g',F.pv.g);
  $('#pv').dataset.g=F.pv.g; $('#g-lead').style.display=GAMES[F.pv.g].lead?'':'none';
  $('#g-cut').style.display=F.pv.g==='hold'?'':'none'; $('#g-scale').style.display=F.pv.g==='sequence'?'':'none';
  $('#c-music-label').textContent=T(CUSTOM.music,{game:GAMES[F.pv.g].name});
  if(F.pv.g==='spot'&&!$('#pvsp').children.length){ const sh=['','c','t']; $('#pvsp').innerHTML=Array.from({length:14},(_,i)=>`<i class="${i===9?'c':sh[i%2?0:2]}"></i>`).join(''); }
  $('#s-custom .eyebrow').textContent=T(CUSTOM.eyebrow,{game:GAMES[F.pv.g].name});
  const pv=$('#pv').style; pv.setProperty('--sq-live',colOf(F.pv.g).sq); pv.setProperty('--cue',colOf(F.pv.g).lead); pv.setProperty('--cutp',colOf(F.pv.g).cut||colOf(F.pv.g).sq); pv.removeProperty('background');
  const lockBtn=$('#pvlock');
  if(pvTry.set){ const L=ACH.find(a=>a.id===pvTry.by); const map={sq:'--sq-live',lead:'--cue',cut:'--cutp'}; if(map[pvTry.set]&&pvTry.v!=='wheel') pv.setProperty(map[pvTry.set],pvTry.v); if(pvTry.set==='bg'&&DESIGNS[pvTry.v]) pv.background=DESIGNS[pvTry.v].tint; lockBtn.innerHTML=T(CUSTOM.lockLine,{name:L.name,how:L.how}); lockBtn.dataset.ach=L.id; }
  // v11: an unlocked colour says nothing when tapped — the red requirement line is for locked ones only
  else if(pvSeen.by&&!got()[pvSeen.by]&&!prefs.allOpen&&!prefs.supporter){ const L=ACH.find(a=>a.id===pvSeen.by); lockBtn.innerHTML=T(CUSTOM.lockLine,{name:L.name,how:L.how}); lockBtn.dataset.ach=L.id; }
  else { lockBtn.textContent=''; lockBtn.dataset.ach=''; }
  markSeen(fresh);
}
const pvSeen={};  // the last unlocked item tapped, so what earned it shows on touch (v5)
/* previews (v9): every game's preview is played by the same finger as the pre-game demo — it shows the tap and what comes of it, on a loop */
const PV={k:0,n:1,last:''};
const pvG=(x,y)=>{ const g=$('#pvg'); g.style.left=x+'%'; g.style.top=y+'%'; g.classList.add('on'); };
const pvTap=()=>{ const g=$('#pvg'); g.classList.remove('tap'); void g.offsetWidth; g.classList.add('tap'); };
const pvPop=el=>{ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
function pvStep(){
  if(!$('#s-custom').classList.contains('on')) return;
  const g=F.pv.g; if(g!==PV.last){ PV.last=g; PV.k=0; $('#pvg').classList.remove('on','hold'); } const k=PV.k++;
  if(g==='quick-tap'){ const ph=k%3; if(ph===0){ PV.n=Math.random()<.5?0:1; [0,1].forEach(i=>$('#pv'+i).style.setProperty('--v',PV.n===i?1:0)); pvG(PV.n?75:25,80); } else if(ph===1){ pvTap(); pvPop($('#pv'+PV.n)); } }
  else if(g==='dots'){ const ph=k%3; const d=$('#pvdot'), l=$('#pvlead'); if(ph===0){ PV.pos=PV.next||{x:.4,y:.3}; PV.next={x:Math.random()*.76,y:Math.random()*.62}; d.style.left=PV.pos.x*100+'%'; d.style.top=PV.pos.y*100+'%'; l.style.left=PV.next.x*100+'%'; l.style.top=PV.next.y*100+'%'; d.classList.add('on'); l.classList.add('on'); pvG(PV.pos.x*100+11,PV.pos.y*100+17); } else if(ph===1) pvTap(); }
  else if(g==='hold'){ const ph=k%7, m=$('.pvhold .m'), t=$('#pvhtxt'), f=$('#pvg'); if(ph===0){ m.setAttribute('r',0); t.innerHTML='tap and hold'; f.classList.remove('hold'); pvG(50,86); } else if(ph===1){ f.classList.add('hold'); t.innerHTML=''; m.setAttribute('r',26+Math.random()*9); } else if(ph===3){ f.classList.remove('hold'); const r=+m.getAttribute('r'), pct=r*r/900*100, err=Math.abs(pct-100); t.innerHTML=`<b class="${err<=8?'g':'r'}">${pct.toFixed(1)}%</b>${err<=8?'close':pct>100?'too much':'too little'}`; } }
  else if(g==='sequence'){ const ks=$$('.pvseq i'), ph=k%6; if(ph===0){ PV.a=Math.random()*5|0; PV.b=(PV.a+1+(Math.random()*3|0))%5; ks.forEach(x=>x.classList.remove('lit')); $('#pvg').classList.remove('on'); ks[PV.a].classList.add('lit'); } else if(ph===1){ ks.forEach(x=>x.classList.remove('lit')); ks[PV.b].classList.add('lit'); } else if(ph===2){ ks.forEach(x=>x.classList.remove('lit')); pvG(10+PV.a*20,60); } else if(ph===3){ pvTap(); ks[PV.a].classList.add('lit'); pvG(10+PV.b*20,60); } else if(ph===4){ pvTap(); ks[PV.a].classList.remove('lit'); ks[PV.b].classList.add('lit'); } else ks.forEach(x=>x.classList.remove('lit')); }
  else if(g==='timing'){ const ph=k%9, c=$('#pvclk'), r=$('#pvtmres'); if(ph===0){ c.textContent='0.00'; c.style.opacity=1; r.innerHTML=''; pvG(50,84); } else if(ph<6){ const e=ph*1.35; c.textContent=e.toFixed(2); c.style.opacity=e<1.5?1:Math.max(0,1-(e-1.5)/1.2); } else if(ph===6){ pvTap(); const e=6.75+Math.random()*.6; c.textContent=e.toFixed(2); c.style.opacity=1; const err=Math.abs(e-7); r.innerHTML=`<b class="${err<=.1?'g':err<=.3?'':'r'}">${err.toFixed(2)}s</b>${e>7?'late':'early'}`; } }
  else if(g==='reaction'){ const p=$('#pvrx'), ph=k%6; if(ph===0){ p.classList.remove('lit'); p.textContent='wait for it'; pvG(50,86); } else if(ph===3){ p.classList.add('lit'); p.textContent='tap'; } else if(ph===4){ pvTap(); p.classList.remove('lit'); p.innerHTML=`<b>${180+(Math.random()*90|0)} ms</b>`; } }
  else if(g==='spot'){ const ks=$$('#pvsp i'), ph=k%5; if(!ks.length) return; if(ph===0){ ks.forEach(x=>x.classList.remove('odd','dim')); $('#pvg').classList.remove('on'); } else if(ph===2){ const o=ks[9], r=o.getBoundingClientRect(), b=$('#pv').getBoundingClientRect(); pvG((r.left+r.width/2-b.left)/b.width*100,(r.top+r.height/2-b.top)/b.height*100); } else if(ph===3){ pvTap(); ks[9].classList.add('odd'); ks.forEach((x,i)=>{ if(i!==9) x.classList.add('dim'); }); } }
}
setInterval(pvStep,520);

/* colour wheel: hue around, saturation outward. Writes straight into prefs[set] (bg → tint) */
const Wheel=(()=>{ const cv=$('#wheel'), cx=cv.getContext('2d'); let set='sq', drawn=false, col='#ffffff';
  function draw(){ const R=240; const img=cx.createImageData(480,480); const d=img.data; for(let y=0;y<480;y++) for(let x=0;x<480;x++){ const dx=x-R, dy=y-R, r=Math.hypot(dx,dy); const i=(y*480+x)*4; if(r>R){ d[i+3]=0; continue; } const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360, s=r/R, [rr,gg,bb]=hsl(h,s,set==='bg'?.08:.6); d[i]=rr; d[i+1]=gg; d[i+2]=bb; d[i+3]=255; } cx.putImageData(img,0,0); drawn=true; }
  function hsl(h,s,l){ const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2; let r,g,b; if(h<60)[r,g,b]=[c,x,0]; else if(h<120)[r,g,b]=[x,c,0]; else if(h<180)[r,g,b]=[0,c,x]; else if(h<240)[r,g,b]=[0,x,c]; else if(h<300)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x]; return [r,g,b].map(v=>Math.round((v+m)*255)); }
  function pick(e){ const b=cv.getBoundingClientRect(); const x=(e.clientX-b.left)/b.width*480, y=(e.clientY-b.top)/b.height*480; const dx=x-240, dy=y-240, r=Math.min(240,Math.hypot(dx,dy)); const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360; const [rr,gg,bb]=hsl(h,r/240,set==='bg'?.08:.6); col='#'+[rr,gg,bb].map(v=>v.toString(16).padStart(2,'0')).join(''); $('#wheelout').style.background=col; if(set==='bg') prefs.tint=col; else prefs.col[F.pv.g][set]=col; applyPrefs(F.pv.g); $('#pv').style.setProperty(set==='sq'?'--sq-live':set==='cut'?'--cutp':'--cue',col); }
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); pick(e); cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove',e=>{ if(e.buttons) pick(e); });
  return { open(s){ set=s; draw(); $('#wheel-title').textContent=T(CUSTOM.wheel,{word:ITEM_WORD[s]||s,game:GAMES[F.pv.g].name}); $('#wheelout').style.background=s==='bg'?(prefs.tint||DESIGNS[prefs.bg].tint):colOf(F.pv.g)[s]; $('#wheelwrap').classList.add('on'); }, close(){ $('#wheelwrap').classList.remove('on'); renderCustom(); } }; })();

/* ---------- navigation: every sub-screen goes back on a tap that isn't on a control ---------- */
let stage='grid', shownAt=0;
function show(id){ $$('.screen').forEach(s=>s.classList.toggle('on',s.id===id)); $('#game').classList.remove('on','versus','bigc','live','shake'); $('#stars').style.opacity=1; shownAt=performance.now(); applyPrefs(sel.game);
  if(id==='s-menu'){ setPendingAim(''); renderMenu(); } if(id==='s-pick'){ renderTiles(); setStage('grid'); } if(id==='s-board'){ renderBoard(); renderRadar(); } if(id==='s-ach') renderAch(); if(id==='s-custom'){ F.pv.g=sel.game; pvTry.set=null; pvSeen.by=null; renderCustom(); } if(id==='s-about') devState(); }
// first open only: title fades up, then the menu fades in under it (v7). The class comes off once it has played so hover/focus opacity works again
function menuIn(){ $('#s-menu').classList.add('intro'); setTimeout(()=>$('#s-menu').classList.remove('intro'),2400); }
// first experience (v10): until one run is on the record only Play is live. v11: the rest are crossed out, and the strike wipes off the moment they open
const firstRun=()=>!prefs.played&&!Scores.runs().length&&!prefs.allOpen;
let menuWasFirst=false;
function renderMenu(){ const first=firstRun(); const opening=menuWasFirst&&!first; menuWasFirst=first;
  $$('#s-menu .item').forEach(b=>{ const x=first&&b.dataset.go!=='s-pick'; b.classList.toggle('dim',x); b.classList.remove('unx'); if(opening&&b.dataset.go!=='s-pick'){ b.classList.add('unx'); b.style.pointerEvents='none'; setTimeout(()=>{ b.classList.remove('unx'); b.style.pointerEvents=''; },700); } });
  $('#menu-note').textContent=first?MENU.note:'';
  // v13 (1.3): the card sits above the title, labelled Next achievement; the box holds the requirement and what it opens, nothing else
  const ng=nextGoal(); const nx=$('#nextup'); $('#menu-tag').hidden=!ng; if(ng){ nx.innerHTML=T(MENU.next,{need:ng.need,game:ng.gname,name:ng.name}); nx.hidden=false; nextWhere=Object.assign({need:ng.need},ng.where); } else { nx.hidden=true; nextWhere=null; } }
let nextWhere=null;
/* the intro (v11): three lines, one after another, then the title lands. About → replay the intro brings it back */
const Story={ open(){ show('s-story'); const st=$('#s-story'); st.classList.remove('run'); void st.offsetWidth; st.classList.add('run'); }, next(){ Snd.click(); prefs.story=1; save('ne.prefs',prefs); show('s-menu'); menuIn(); } };
// the line under the two-player picture (v10 / v11): a table in config/copy.js, picked by game and mode
function passLine(g,d){ if(g==='sequence') return PASS_LINE.sequence; if(g==='spot'&&d==='count') return PASS_LINE['spot:count']; return PASS_LEN[g]?T(PASS_LINE.timed,{n:PASS_LEN[g]}):PASS_LINE.once; }
function vsLine(g,d){ if(g==='sequence') return VS_LINE.sequence; if(g==='reaction') return VS_LINE.reaction; return T(VS_LINE.lead,{n:VS_LEAD}); }
function renderVsArt(){ const box=$('#vsart'); if(!sel.vs){ box.classList.remove('on'); $('#sheet').classList.remove('two'); return; }
  const [svg,line]=VS_ART[sel.vs]; box.innerHTML=svg+`<span>${line}</span><small>${sel.vs===1?passLine(sel.game,sel.diff):vsLine(sel.game,sel.diff)}</small><small>${pWho(0)} · ${pWho(1)}</small>`; box.classList.add('on'); $('#sheet').classList.add('two'); }
// the player row (v11): Solo / With a friend, and under a friend, Pass & play / Versus where versus exists
function renderVsRow(){ const g=sel.game; const vsOk=versusOf(g,sel.diff); if(sel.vs===2&&!vsOk) sel.vs=1;
  $$('#vs-row [data-vs]').forEach(c=>c.classList.toggle('sel',(c.dataset.vs==='0')===(sel.vs===0)));
  const sub=$('#vs-sub'); const showSub=sel.vs>0; sub.hidden=!showSub; sub.querySelector('[data-vs2="2"]').hidden=!vsOk; $$('#vs-sub [data-vs2]').forEach(c=>c.classList.toggle('sel',+c.dataset.vs2===sel.vs)); }
function setStage(st){ stage=st; const g=GAMES[sel.game]; $('#grid').classList.toggle('dim',st!=='grid'); $('#sheet').classList.toggle('up',st!=='grid'); $('#sheet').classList.toggle('len',st==='len');
  $('#diff-row').classList.toggle('single',g.modes.length===1);
  $('#seq-opts').style.display='none'; $('#vs-wrap').style.display=st==='mode'||(st==='len'&&g.modes.length===1)?'':'none'; renderVsRow();
  if(st==='grid'){ $$('.tile').forEach(t=>t.classList.remove('keep')); } $('#sheet-title').textContent=g.name+(sel.vs===1?SHEET.passTitle:sel.vs===2?SHEET.versusTitle:''); $('#len-title').textContent=SHEET.mode;
  renderVsArt(); $('#lvl-mode').textContent=MODE_NAME[sel.diff]||''; $('#lvl-back').style.display=g.modes.length>1?'':'none'; }
// locked games are greyed with the condition on the tile (v6). Each tile wears its own game's colours (v10). v11: a padlock badge; the first visit reveals the grid tile by tile; a padlock wipes off when its game opens
function renderTiles(){ const reveal=!prefs.gridSeen; if(reveal){ prefs.gridSeen=1; save('ne.prefs',prefs); } const runs=Scores.runs(); const fresh=[];
  $$('.tile[data-game]').forEach((t,i)=>{ const g=t.dataset.game, open=gameOpen(g); t.classList.toggle('locked',!open); t.querySelector('.pic').dataset.need=open?'':T(SHEET.tileUnlock,{need:needFor(g,GAMES[g].modes[0])});
    // v13 (1.2 / L7): white until the game has been played once — colour arrives with the first recorded run
    const played=runs.some(r=>r.g===g), c=colOf(g); t.classList.toggle('unplayed',!played);
    t.style.setProperty('--sq-live',played?c.sq:'#FFFFFF'); t.style.setProperty('--cue',played?c.lead:'#8A8883');
    t.classList.remove('reveal','newthing'); t.style.animationDelay=''; if(reveal){ t.classList.add('reveal'); t.style.animationDelay=(i*120)+'ms'; }
    if(open&&!reveal){ const nw=newMark('game:'+g,fresh); if(nw) t.classList.add('newthing'); } });
  markSeen(fresh); }
// a locked mode (v11) is crossed out, not just greyed; tapping it says what it takes
function fillSheet(){ const g=GAMES[sel.game]; const fresh=[]; $('#diff-row').innerHTML=g.modes.map(d=>{ const open=isOpen(sel.game,d); const nw=open?newMark('mode:'+sel.game+':'+d,fresh):''; return `<button data-act="diff" class="choice ${open?'':'locked'}${nw}" data-diff="${d}"><span class="pic">${picOf(sel.game,d)}</span><span class="txt"><b class="${open?'':'x'}">${MODE_NAME[d]}</b><small>${open?g[d]:T(SHEET.toUnlock,{need:needFor(sel.game,d)})}</small></span></button>`; }).join(''); markSeen(fresh); }
function back(){ if(performance.now()-shownAt<450) return; const s=$('.screen.on'); if(!s) return;
  if(s.id==='s-pick'){ if(stage==='len'){ if(GAMES[sel.game].modes.length===1) setStage('grid'); else setStage('mode'); } else if(stage==='mode') setStage('grid'); else show('s-menu'); return; }
  if(s.dataset.back) show(s.dataset.back); }
// the length face (v11): the name with its seconds beside it on the pick sheet, the best underneath; a locked length is crossed out
const lenFace=(g,s,d)=>{ if(g==='sequence') return `<span class="keys">${'<i></i>'.repeat(s)}</span>${lenName(g,s,d)}`; return lenName(g,s,d); };
// the length buttons only select (v10); Go starts. The whole block slides up together, the same for every game. Pass & play fixes the length; versus has none (Reaction versus has a best-of)
function fillTimes(){ const g=GAMES[sel.game], c=GC(sel.game,sel.diff); const seq=sel.game==='sequence'; const versus=sel.vs===2&&versusOf(sel.game,sel.diff); const lens=lensOf(sel.game,sel.diff,versus?2:0); if(!lens.includes(sel.secs)||!versus&&!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens.find(s=>versus||lenOpen(sel.game,sel.diff,s))||lens[0];
  const fixed=sel.vs===1&&(PASS_LEN[sel.game]||SHARED2(sel.game,sel.diff)), hideLen=fixed||(versus&&!c.vsLens);
  const fresh=[];
  $('#time-row').style.display=hideLen?'none':''; $('#len-title').style.display=hideLen?'none':''; $('#len-title').textContent=SHEET.mode;
  // v13 (3.3): NAME on one line, what it costs on the next, the best under that — nothing can overlap, and the layout is the same for every game
  $('#time-row').innerHTML=lens.map(s=>{ const best=Scores.best(sel.game,sel.diff,s); const L=versus?null:lenLock(sel.game,sel.diff,s); const sub=versus?'':lenSub(sel.game,s,sel.diff); const nw=L?'':newMark('len:'+sel.game+':'+sel.diff+':'+s,fresh);
    return `<button data-act="time" class="tbtn ${sel.secs===s?'sel':''} ${L?'locked':''}${nw}" data-time="${s}"><b class="${L?'x':''}">${lenFace(sel.game,s,sel.diff)}</b>${sub?`<small class="lsub">${sub}</small>`:''}<small>${L?SHEET.locked:best!==null?`${c.lower?SHEET.closest:SHEET.best} ${scoreTxt(sel.game,best,sel.diff,s)}`:SHEET.noRun}</small></button>`; }).join('');
  // v13 (7.1): the scale left for Customise. Practice from is earned (7.2)
  const pOpen=practiceOpen(); if(!pOpen) sel.practice=0;
  $('#prac-row').innerHTML=`<span class="chip lbl">${SHEET.practiceFrom}</span>`+(pOpen?[0,5,10,15].map(n=>`<button data-act="prac" class="chip ${sel.practice===n?'sel':''}" data-prac="${n}">${n||SHEET.off}</button>`).join(''):`<button data-act="praclock" class="chip locked x" data-praclock="1">${SHEET.pracLocked}</button>`);
  $('#seq-opts').style.display=seq&&stage==='len'&&!sel.vs?'flex':'none';
  markSeen(fresh);
  $('#go-btn').textContent=goLabel(versus,fixed); }
// the Go button's face (v10): versus, a fixed pass & play length, or plain Go — the same on the pick sheet and the result screen
const goLabel=(versus,fixed)=>versus?SHEET.goVersus:fixed?(PASS_LEN[sel.game]&&!SHARED2(sel.game,sel.diff)?T(SHEET.goEach,{n:PASS_LEN[sel.game]}):SHEET.goPass):SHEET.go;
// the "beat my score" share (v11): navigator.share, or the clipboard with a toast
// v13 (3.6): Challenge a friend. The link carries the target, so opening it drops the other player straight onto that pick sheet with the score to beat
function shareRun(){ const r=lastRun; if(!r) return; const c=GC(r.g,r.d,r.s); const score=scoreTxt(r.g,r.hits,r.d,r.s)+(c.scoreWord&&!c.suffix?' '+c.scoreWord:'');
  const rate=c.timed?` (${(r.hits/r.s).toFixed(1)}/s)`:'';
  const where=`${c.name}${MODE_NAME[r.d]?' '+MODE_NAME[r.d]:''} · ${lenName(r.g,r.s,r.d)}`;
  const url=`${PUB_URL}?g=${encodeURIComponent(r.g)}&d=${encodeURIComponent(r.d)}&s=${r.s}&score=${encodeURIComponent(r.hits)}`;
  const text=T(SHARE.text,{name:prefs.name||SHARE.someone,score,rate,where,url});
  if(navigator.share){ navigator.share({text}).catch(()=>{}); return; } if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>toast(TOAST.copied),()=>toast(text)); } else toast(text); }
// the challenge line on the pick sheet, and the sheet itself
function openChallenge(){ if(!CHAL) return false; openSheetSafe(); return true; }
// build 14 (S1): the score came off a URL — it is built as text nodes, never markup
function openSheetSafe(){ const el=$('#chal'); if(el){ el.textContent=''; if(CHAL.score!==''){ const b=document.createElement('b'); b.textContent=String(CHAL.score); el.append(SHEET.chalScored,b,SHEET.chalBeat); } else el.textContent=SHEET.chalSent; el.hidden=false; } }
// a locked game or mode (v10): say what it takes and offer to go straight there — into the game, with the goal line up
let lockGo=null;
// v13 (3.8): the box shows the goal for the thing that was tapped, and `aim` carries that same goal into the run it starts — never the first unearned step of the chain
function askUnlock(g,d,s){ if(s!==undefined){ const L=lenLock(g,d,s); if(!L) return; $('#lock-text').innerHTML=T(LOCK.text,{name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${L.name}`,need:L.need}); lockGo=Object.assign({need:L.need,aim:g+':'+d+':'+s},L); $('#lockwrap').classList.add('on'); return; }
  const u=UNLOCKS.find(u=>u.key===g+':'+d); if(!u) return; $('#lock-text').innerHTML=T(LOCK.text,{name:unlockName(u.key),need:u.need}); lockGo=Object.assign({need:u.need,aim:u.key},u.where); $('#lockwrap').classList.add('on'); }
function gotoAch(id){ const a=achById(id); if(!a) return; F.ach.g=a.g==='all'?'all':a.g; show('s-ach'); const row=$('#ach-'+a.id); if(row){ row.scrollIntoView({block:'center'}); row.classList.add('flash'); } }
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=F.ach.g; const fresh=[]; let k=0;
  $('#ach-g').innerHTML=`<button class="chip" data-act="chip" data-chip="ach-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  const list=achAll().filter(a=>gsel==='all'||a.g===gsel||a.g==='all');
  const fsGame=gsel==='all'?sel.game:gsel;
  $('#achlist').innerHTML = Object.keys(TIERS).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    if(!items.length) return '';
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>{
      const isDone=!!g[a.id], secret=a.tier==='secret'&&!isDone;
      const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
      const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
      const bar=p!==null?`<div class="pbar ${secret?'s':''}"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
      const jump=a.g!=='all'||a.id==='fullset';
      const where=jump&&!secret?`<small class="go">→ ${GAMES[a.g==='all'?fsGame:a.g].name}${a.at?.d?' · '+MODE_NAME[a.at.d]:''}${a.at?.s!==undefined?' · '+lenName(a.g,a.at.s,a.at?.d||GAMES[a.g].modes[0]):''}</small>`:'';
      const nw=isDone?newMark('ach:'+a.id,fresh):''; const dl=isDone?` style="animation-delay:${Math.min(k++,14)*70}ms"`:'';
      return `<button data-act="ach" class="a ${isDone?'done':'lock'}${nw} ${jump?'jump':''}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${isDone?'✓ ':''}${secret?ACH_SCREEN.hidden:a.name}${gname}</span><em class="${a.unlocks&&!isDone?'u':''}">${isDone?ACH_SCREEN.done+(a.unlocks?' · '+unlockHtml(a):''):a.unlocks?unlockHtml(a):secret?ACH_SCREEN.secret:''}</em><small>${secret?(p!==null?T(ACH_SCREEN.progress,{p:Math.round(p*100)}):ACH_SCREEN.stretch):a.how+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')}</small>${where}${bar}</button>`; }).join(''); }).join('');
  markSeen(fresh);
}
function jumpTo(a){ const g=a.g==='all'?(F.ach.g==='all'?sel.game:F.ach.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return askUnlock(g,d); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return askUnlock(g,d,a.at.s); setPendingAim(a.how); openSheet(g,a.at?.d,a.at?.s); }
// open the pick sheet on a game (v11), at the mode row or straight at the length row. Used by achievements and the result screen's Back
function openSheet(g,d,s){ const G_=GAMES[g]; sel.game=g; prefs.lastGame=g; save('ne.prefs',prefs); show('s-pick');
  $$('.tile').forEach(t=>t.classList.toggle('keep',t.dataset.game===g)); fillSheet();
  if(!G_.modes.includes(sel.diff)) sel.diff=G_.modes[0]; if(s!==undefined) sel.secs=s;
  if(d||G_.modes.length===1){ sel.diff=d||G_.modes[0]; $$('.choice').forEach(c=>c.classList.toggle('sel',c.dataset.diff===sel.diff)); setStage('len'); fillTimes(); }
  else setStage('mode'); }
let eggTaps=0;
// a tap on a control that picks something is a select(); everything else is a click() (v11)
const isPick=b=>b.classList.contains('chip')||b.classList.contains('choice')||b.classList.contains('tbtn')||b.classList.contains('tile')||b.classList.contains('mch')||b.classList.contains('opt')||b.dataset.vs2!==undefined||!!b.closest('.sw');
function rows(g,d,s,list,curT){ const cfg=GC(g,d,s), c=colsOf(g,d,s); return list.length ? list.map((r,i)=>`<tr class="${i===0&&(r.hits>0||cfg.lower)?'best':''} ${r.t===curT?'cur':''}"><td>${i+1}</td><td></td><td>${fmtScore(g,r.hits,d,s)}</td><td>${c[0][1](r)}</td><td>${c[1][1](r)}</td><td>${new Date(r.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'2-digit'})}</td></tr>`).join('') : `<tr><td colspan="6">${RESULT.noRuns}</td></tr>`; }
// the profile radar (v9): one axis per game, your best quality 0..1 in any mode and length of it. Every lower-is-better config's quality() already runs 1 − (score/limit), so the radar reads the same way for every game (checked v11)
function renderRadar(){ const all=Scores.runs(), ids=Object.keys(GAMES), n=ids.length, C=100, R=88; const vals=ids.map(g=>Math.min(1,Math.max(0,...all.filter(r=>r.g===g&&!r.practice).map(r=>{ try{ return quality(g,r.d,r.s,r)||0; }catch(e){ return 0; } }))));
  const pt=(i,k)=>{ const a=-Math.PI/2+i/n*2*Math.PI; return [C+Math.cos(a)*R*k,C+Math.sin(a)*R*k]; }; const P=k=>ids.map((_,i)=>pt(i,k).map(v=>v.toFixed(1)).join(',')).join(' ');
  $('#radar').innerHTML=[.25,.5,.75,1].map(k=>`<polygon class="web" points="${P(k)}"/>`).join('')+ids.map((_,i)=>{ const [x,y]=pt(i,1); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')
    +`<polygon class="me" points="${ids.map((_,i)=>pt(i,Math.max(.03,vals[i])).map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`+ids.map((_,i)=>{ const [x,y]=pt(i,Math.max(.03,vals[i])); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"/>`; }).join('')
    +ids.map((g,i)=>{ const [x,y]=pt(i,1.19); return `<text x="${x.toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="middle">${GAMES[g].name} ${Math.round(vals[i]*100)}</text>`; }).join(''); }
function chips(scope,key,val){ $$(`[data-chip="${scope}-${key}"]`).forEach(c=>c.classList.toggle('sel',String(c.dataset.v)===String(val))); }
function renderBoard(){ $('#pstar').textContent=prefs.supporter?'★':''; const g=F.bd.g; if(!GAMES[g].modes.includes(F.bd.d)) F.bd.d=GAMES[g].modes[0]; const lens=lensOf(g,F.bd.d); if(!lens.includes(F.bd.s)) F.bd.s=lens[0];
  $('#bd-g').innerHTML=Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip" data-chip="bd-g" data-v="${id}">${x.name}</button>`).join('');
  $('#bd-d').innerHTML=GAMES[g].modes.length>1?GAMES[g].modes.map(d=>`<button class="chip" data-act="chip" data-chip="bd-d" data-v="${d}">${MODE_NAME[d]}</button>`).join(''):'';
  $('#bd-s').innerHTML=lens.length>1?lens.map(s=>`<button class="chip" data-act="chip" data-chip="bd-s" data-v="${s}">${lenName(g,s,F.bd.d)}</button>`).join(''):'';
  chips('bd','g',g); chips('bd','d',F.bd.d); chips('bd','s',F.bd.s);
  const cfg=GC(g,F.bd.d,F.bd.s), c=colsOf(g,F.bd.d,F.bd.s); $('#runs-h').innerHTML=`<tr><th>${BOARD.rank}</th><th></th><th>${cfg.scoreWord||BOARD.score}${cfg.lower?BOARD.lowerMark:''}</th><th>${c[0][0]}</th><th>${c[1][0]}</th><th>${BOARD.date}</th></tr>`;
  $('#runs').innerHTML=rows(g,F.bd.d,F.bd.s,Scores.of(g,F.bd.d,F.bd.s).slice(0,10),lastRun?.t); }
let lastRun=null;
// the result screen's options (v10): players, mode, length, scale — pick, then Go. What you were just playing is pre-selected. v11: Solo / With a friend, then Pass & play / Versus; locked modes and lengths are crossed out and cannot be picked
function renderOverChips(){ const g=GAMES[sel.game]; const vsOk=versusOf(sel.game,sel.diff); if(sel.vs===2&&!vsOk) sel.vs=1; const fresh=[];
  $('#over-vs').innerHTML=`<button class="chip ${sel.vs===0?'sel':''}" data-act="chip" data-chip="over-vs" data-v="0">solo</button><button class="chip ${sel.vs?'sel':''}" data-act="chip" data-chip="over-vs" data-v="f">with a friend</button>`+(sel.vs?`<span class="chip lbl">·</span><button class="chip ${sel.vs===1?'sel':''}" data-act="chip" data-chip="over-vs2" data-v="1">pass &amp; play</button>${vsOk?`<button class="chip ${sel.vs===2?'sel':''}" data-act="chip" data-chip="over-vs2" data-v="2">versus</button>`:''}`:'');
  $('#over-chips').innerHTML=g.modes.length>1?g.modes.map(d=>{ const open=isOpen(sel.game,d); const nw=open?newMark('mode:'+sel.game+':'+d,fresh):''; return `<button class="mch ${d===sel.diff?'sel':''} ${open?'':'locked'}${nw}" data-act="chip" data-chip="over-d" data-v="${d}"><span class="pic">${picOf(sel.game,d)}</span><b class="${open?'':'x'}">${MODE_NAME[d]}</b></button>`; }).join(''):'';
  const versus=sel.vs===2&&vsOk, c=GC(sel.game,sel.diff), lens=lensOf(sel.game,sel.diff,versus?2:0), fixed=sel.vs===1&&(PASS_LEN[sel.game]||SHARED2(sel.game,sel.diff));
  if(!lens.includes(sel.secs)||!versus&&!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens.find(s=>versus||lenOpen(sel.game,sel.diff,s))||lens[0];
  $('#over-chips2').innerHTML=lens.length>1&&!fixed&&(!versus||c.vsLens)?lens.map(s=>{ const L=versus?null:lenLock(sel.game,sel.diff,s); const nw=L?'':newMark('len:'+sel.game+':'+sel.diff+':'+s,fresh); return `<button class="chip ${s===sel.secs?'sel':''} ${L?'locked x':''}${nw}" data-act="chip" data-chip="over-s" data-v="${s}">${lenName(sel.game,s,sel.diff)}</button>`; }).join(''):'';
  $('#over-chips3').innerHTML='';
  markSeen(fresh);
  $('#again').textContent=goLabel(versus,fixed); }
// the top 10 under the result (v11) follows the mode and length picked in the chips, not only the run just played
// v13 (3.5): a two-player run is never on a board (L10), so the whole top-10 block goes — the side-by-side pair and the chips stay
function renderOverTop(){ const run=lastRun; const g=GC(sel.game,sel.diff,sel.secs); const two=sel.vs>0; $('#over-top').hidden=two||!!(run&&run.practice); $('#over-top').style.display=two||(run&&run.practice)?'none':''; if(two) return;
  const top=Scores.of(sel.game,sel.diff,sel.secs).slice(0,10);
  $('#over-top-title').textContent=T(RESULT.top,{where:`${g.name}${MODE_NAME[sel.diff]?' · '+MODE_NAME[sel.diff]:''} · ${lenName(sel.game,sel.secs,sel.diff)}`})+(g.lower?RESULT.closestFirst:'');
  $('#over-runs').innerHTML=top.length?top.map((r,i)=>`<tr class="${run&&r.t===run.t?'cur':''}"><td>${i+1}</td><td></td><td>${scoreTxt(sel.game,r.hits,r.d,r.s)}</td><td>${new Date(r.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'2-digit'})}</td></tr>`).join(''):`<tr><td colspan="4">${RESULT.noRuns}</td></tr>`; }
function renderOver(run){ const g=GC(run.g,run.d,run.s);
  renderOverChips();
  // vs (v9): both scores side by side, the winner in green. Versus (v10) carries its own pair of counts. v11: Player 1 red, Player 2 blue
  const vb=$('#vsbox');
  if(run.vs2){ const {a,b}=run.vs2, tie=a===b; const lo=run.vs2.lower; const w1=lo?a<b:a>b; vb.innerHTML=`<div class="${!tie&&w1?'win':''}">${pWho(0)}<b>${run.vs2.txt?run.vs2.txt[0]:a}</b></div><em>vs</em><div class="${!tie&&!w1?'win':''}">${pWho(1)}<b>${run.vs2.txt?run.vs2.txt[1]:b}</b></div>`; vb.classList.add('on'); }
  else if(VS.on&&VS.stage===2&&VS.p1&&VS.p2){ const lo=g.lower, a=VS.p1.hits, b=VS.p2.hits, tie=a===b, w1=lo?a<b:a>b; vb.innerHTML=`<div class="${!tie&&w1?'win':''}">${pWho(0)}<b>${scoreTxt(run.g,a,run.d,run.s)}</b></div><em>vs</em><div class="${!tie&&!w1?'win':''}">${pWho(1)}<b>${scoreTxt(run.g,b,run.d,run.s)}</b></div>`; vb.classList.add('on'); } else vb.classList.remove('on');
  const two=!!run.vs2||VS.on; $('#adslot').classList.toggle('off',!!prefs.supporter); $('#share').hidden=!!run.practice||two||(run.fail&&!run.hits);
  renderOverTop();
  if(run.practice||two){ $('#over-stats').innerHTML=''; $('#over-rank').innerHTML=run.practice?RESULT.practiceNote:RESULT.twoNote; return; }
  const best=Scores.best(run.g,run.d,run.s), cols=colsOf(run.g,run.d,run.s);
  const peak=run.peak?`<span>${RESULT.peak} <b>${run.peak.toFixed(1)}/s</b></span>`:'';
  // v13 (8.1): where lower is better, "closest" already IS the best try — whichever column repeats it comes out. Same rule on Estimate, Timing, Hidden and Reaction
  const dupe=c=>!!g.lower&&/^best /.test(c[0]);
  const cell=c=>`<span>${c[0]} <b>${c[1](run)}</b></span>`;
  const rec=`<span>${g.lower?SHEET.closest:SHEET.best} <b>${best===null?RESULT.dash:scoreTxt(run.g,best,run.d,run.s)}</b></span>`;
  $('#over-stats').innerHTML=[dupe(cols[0])?'':cell(cols[0]),rec,dupe(cols[1])?'':cell(cols[1])].join('')+peak;
  const rk=Scores.rank(run); $('#over-rank').innerHTML = rk&&rk<=10 ? T(RESULT.rank,{n:rk,name:esc(prefs.name||RESULT.you)}) : T(RESULT.outside,{name:esc(prefs.name||RESULT.you)}); }

function setLastRun(v){ lastRun=v; }
function setMenuWasFirst(v){ menuWasFirst=v; }
function bumpEggTaps(){ eggTaps++; }


export { itemsOf, PV, Story, Wheel, applyPrefs, askUnlock, back, bumpEggTaps, chips, colOf, devState, eggTaps, fillSheet, fillTimes, firstRun, freshGame, gotoAch, isPick, jumpTo, lastRun, lenFace, lockGo, lockedBy, menuIn, menuWasFirst, nextWhere, openChallenge, openSheet, passLine, pvG, pvPop, pvSeen, pvStep, pvTap, pvTry, renderAch, renderBoard, renderCustom, renderMenu, renderOver, renderOverChips, renderOverTop, renderRadar, renderTier, renderTiles, renderVsArt, renderVsRow, rows, setLastRun, setMenuWasFirst, setStage, shareRun, show, shownAt, stage, vsLine };
