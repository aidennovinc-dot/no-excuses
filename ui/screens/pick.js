/* No Excuses — the pick screen (build 18, refactor stage 4; was the middle of menu.js). The grid of tiles, then one bottom
   sheet for every game (L9): the player row, the mode row, the length row, Go. Three stages — grid, mode, len — and Back
   walks them before it leaves the screen. show('s-pick', {g, d, s}) opens a game's sheet straight at its mode or length row
   (the result screen's Back, an achievement row, a challenge link). Locked things ask the lock box through lock:ask. */
import { CHEST_SOON, GRID, SHEET } from "../../config/copy.js";
import { CHESTS } from "../../config/chests.js";
import { MODE_NAME, PASS_LEN, SEQ_VS, VS_LEAD, VS_TARGET } from "../../config/games.js";
import { VS_ART } from "../../config/theme.js";
import { VS_LINE } from "../../config/copy.js";
import { $, $$, T, pWho } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { VS, sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, SHARED2, lenName, lenSub, versusAny, versusOf } from "../../games/registry.js";
import { Scores, gameOpen, isOpen, lenLock, lenOpen, lensOf, markSeen, modeCount, needFor, newMark, newPlay, practiceOpen } from "../../progress.js";
import { chestAt, chestState, gameKey, meter, tierOpen } from "../../progress/key.js";
import { Snd } from "../../audio.js";
import { start } from "../../run/run.js";
import { define } from "../actions.js";
import { burstHtml, chestSvg, meterLook, spillVars, wordsHtml } from "../chest.js";
import { goLabel, picOf, scoreTxt } from "../format.js";
import { register, show } from "../router.js";
import { applyPrefs, colOf } from "../theme.js";
import { toast } from "../toast.js";
import { TOAST } from "../../config/copy.js";

let stage='grid', pickT=0;
const ask=(g,d,s)=>emit('lock:ask',{g,d,s});
// v14 (4.2): the caption and the grey sub-line under the picture are gone. Versus keeps one line, because 4.14 changed what wins
// v15 (4.5 / 4.6): Sequence versus is lives now, not Compose, and Spot · Find has a versus to describe for the first time
function vsLine(g,d){ if(g==='sequence') return T(VS_LINE.sequence,{n:SEQ_VS.lives}); if(g==='reaction') return VS_LINE.reaction; if(g==='spot') return VS_LINE.spot; return T(VS_LINE.lead,{n:VS_LEAD,t:VS_TARGET[g]||VS_LEAD}); }
// the two-player picture (v10). v14 (4.3 / 4.5): the phones wear the player labels — side by side for pass & play, one at each
// end of the one phone for versus, which is the thing versus actually is
function renderVsArt(){ const box=$('#vsart'); if(!sel.vs){ box.classList.remove('on','vs2'); $('#sheet').classList.remove('two'); return; }
  const versus=sel.vs===2, svg=VS_ART[sel.vs];
  box.innerHTML=versus?`<span class="vsp">${pWho(1)}</span>${svg}<span class="vsp">${pWho(0)}</span><small>${vsLine(sel.game,sel.diff)}</small>`
    :`${svg}<span class="vsp two">${pWho(0)}${pWho(1)}</span>`;
  box.classList.toggle('vs2',versus); box.classList.add('on'); $('#sheet').classList.add('two'); }
// the player row (v11): Solo / With a friend, and under a friend, Pass & play / Versus where versus exists
/* v15 (4.6): the player row sits on the MODE stage, so when it is drawn the mode has not been chosen yet. Asking versusOf
   there would hide Versus on any game where only the second mode has it — Spot, whose Find gained versus this build and
   whose first mode is Count. The row offers it if ANY mode has it; the choice narrows when the mode is picked, and a mode
   without versus falls the pair back to pass & play. */
function renderVsRow(){ const g=sel.game; const vsOk=stage==='mode'?versusAny(g):versusOf(g,sel.diff); if(sel.vs===2&&!vsOk) sel.vs=1;
  $$('#vs-row [data-vs]').forEach(c=>c.classList.toggle('sel',(c.dataset.vs==='0')===(sel.vs===0)));
  const sub=$('#vs-sub'); const showSub=sel.vs>0; sub.hidden=!showSub; sub.querySelector('[data-vs2="2"]').hidden=!vsOk; $$('#vs-sub [data-vs2]').forEach(c=>c.classList.toggle('sel',+c.dataset.vs2===sel.vs)); }
/* v21 (F.1, build 35): WITH NOTHING SELECTED THE SHEET LEAVES THE LAYOUT. It was only ever translated off the bottom, and
   #s-pick scrolls — a transformed box still counts towards its scroll container's overflow — so on a cold load the map
   could be dragged up to show a whole pick sheet parked under it, drawn for whatever game `sel` last held (Estimate, on a
   profile whose last game was Estimate). Opacity or a transform cannot take a box out of the layout; `hidden` can. It comes
   off before the slide up and goes back on once the slide down has run, so the animation Aiden passed is untouched, and
   hiding it clears what it held — a sheet with no game selected renders nothing. */
const SHEET_OUT=340;   // the sheet's own .32s slide, and a frame
let sheetT=0;
function hideSheet(){ const sh=$('#sheet'); sh.hidden=true; sh.classList.remove('up','len','two');
  $('#diff-row').innerHTML=''; $('#time-row').innerHTML=''; $('#sheet-title').textContent=''; $('#vsart').innerHTML=''; $('#vsart').classList.remove('on','vs2'); }
/* build 38 (Aiden, 2026-09-14, amending v22 §K): THE TILE KEEPS ITS AMBER UNTIL A MODE IS CHOSEN. `chosen` is on once a mode on
   the sheet is actually selected — a game with more than one mode, and a `.choice.sel` present — and only then does the pressed
   tile demote. With the mode row up and nothing tapped the tile is still what the player chose; a one-mode game (Sequence) has
   no mode row to tap, so its tile keeps the amber on its length row. Exactly one amber thing on screen either way. */
function setStage(st){ stage=st; clearTimeout(sheetT); const sh=$('#sheet'); $('#diff-row').classList.remove('picking'); $('#grid').classList.toggle('dim',st!=='grid');
  $('#grid').classList.toggle('chosen',st!=='grid'&&GAMES[sel.game].modes.length>1&&!!$('#diff-row .choice.sel'));
  if(st==='grid'){ $$('.tile').forEach(t=>t.classList.remove('keep')); if(sh.hidden) return;
    if(!sh.classList.contains('up')){ hideSheet(); return; }
    sh.classList.remove('up','len'); sheetT=setTimeout(()=>{ if(stage==='grid') hideSheet(); },SHEET_OUT); return; }
  if(sh.hidden){ sh.hidden=false; void sh.offsetWidth; }
  const g=GAMES[sel.game]; sh.classList.add('up'); sh.classList.toggle('len',st==='len');
  $('#diff-row').classList.toggle('single',g.modes.length===1);
  $('#seq-opts').style.display='none'; $('#vs-wrap').style.display=st==='mode'||(st==='len'&&g.modes.length===1)?'':'none'; renderVsRow();
  if(st==='grid'){ $$('.tile').forEach(t=>t.classList.remove('keep')); } $('#sheet-title').textContent=g.name+(sel.vs===1?SHEET.passTitle:sel.vs===2?SHEET.versusTitle:''); $('#len-title').textContent=SHEET.mode;
  renderVsArt(); $('#lvl-mode').textContent=MODE_NAME[sel.diff]||''; $('#lvl-back').style.display=g.modes.length>1?'':'none'; }
/* ---------- v17 (B.23 / B.24, build 29): the unlock order, drawn — and the chests the order ends at ----------

   B.23 asked for thin lines joining the games in the order they open, with Sequence moved directly under Estimate so
   the lines flow. THE ORDER IS NOT WRITTEN HERE: `Object.keys(GAMES)` already IS that order (config/games.js is in
   chain order and the markup follows it), and a second list would be a second copy of L6's table waiting to disagree
   with it. What is written here is the SHAPE — a snake, left to right then right to left — and it is computed from the
   column count the stylesheet is actually using, so the 4-column breakpoint at 700px folds it correctly with no second
   rule. The tiles are placed by `grid-row` / `grid-column` rather than by DOM order, which leaves the markup in chain
   order for tab focus and for the reveal's stagger.

   The line is measured off each tile's own `.pic` box, through offsetLeft / offsetTop rather than a bounding rect —
   the first-visit reveal animates `scale`, and a rect taken mid-animation would draw the path through where the tiles
   momentarily are instead of where they live. A segment is GREEN when the game it leads to is open and light grey when
   it is not, which is the whole of what the line says. It draws itself as part of the opening animation Aiden passed
   (v11's tile-by-tile reveal): each segment starts after the tile it points at has arrived. */
const GRID_ORDER=Object.keys(GAMES);
// v23 (L.10, build 40): the chests in the order they open — config/chests.js, by name, never by number
const CHEST_ORDER=CHESTS.map(c=>c.id);
/* the tiles in CHAIN order, whatever order the markup is in, with the chests last. Sorting here rather than trusting the
   DOM means the order can only ever be wrong in config/games.js, which is the one place L6 allows it to be stated. */
const orderedTiles=()=>$$('#grid .tile').filter(t=>!t.hidden).sort((a,b)=>{ const i=t=>t.dataset.game?GRID_ORDER.indexOf(t.dataset.game):GRID_ORDER.length+Math.max(0,CHEST_ORDER.indexOf(t.dataset.chest)); return i(a)-i(b); });
// where tile i sits: row by row, alternating direction, so the path from one to the next is always one step
function cellOf(i,cols){ const r=Math.floor(i/cols), c=i%cols; return { r:r+1, c:(r%2?cols-c:c+1) }; }
function colCount(){ const g=$('#grid'); const t=getComputedStyle(g).gridTemplateColumns; const n=t?t.trim().split(/\s+/).length:3; return n>0?n:3; }
/* an element's centre within #grid. Both walk the same offsetParent chain and the difference cancels everything above
   the grid, so it does not matter which ancestor happens to be positioned — and offsets, not a bounding rect, because
   the first-visit reveal animates `scale` and a rect taken mid-animation is the wrong box. */
function pageOff(el){ let x=0, y=0, n=el; while(n){ x+=n.offsetLeft; y+=n.offsetTop; n=n.offsetParent; } return { x, y }; }
function centreIn(el,root){ const a=pageOff(el), b=pageOff(root); return { x:a.x-b.x+el.offsetWidth/2, y:a.y-b.y+el.offsetHeight/2 }; }
/* v18 (B.19, build 32): THE CHESTS IN A COLUMN. v23 (L.10, build 40): FOUR of them. The Games chest is the snake's last stop; the Key,
   Pro and Thorns chests sit directly under it in the same column, one row each, so the screen scrolls. v23 (L.11c): each opened chest's
   words take a free grid cell beside it — to its right, or to its left where the right is off the grid or taken (the 4-column layout
   puts the Games chest against the last game). One layout whatever state a chest is in, so nothing moves when one opens (L.11d, guess). */
function layoutGrid(){ const cols=colCount(); let below=null; const taken=new Set();
  orderedTiles().forEach((t,i)=>{ const ci=t.dataset.chest?CHEST_ORDER.indexOf(t.dataset.chest):-1;
    if(ci>0){ if(!below) return; t.style.gridRow=below.r+ci; t.style.gridColumn=below.c; taken.add((below.r+ci)+':'+below.c); return; }
    const {r,c}=cellOf(i,cols); t.style.gridRow=r; t.style.gridColumn=c; taken.add(r+':'+c); if(ci===0) below={r,c}; });
  $$('#grid .chestwords').forEach(w=>{ const ci=CHEST_ORDER.indexOf(w.dataset.for); if(!below||ci<0){ w.classList.add('nocell'); return; }
    const r=below.r+ci, free=c=>c>=1&&c<=cols&&!taken.has(r+':'+c), c=free(below.c+1)?below.c+1:free(below.c-1)?below.c-1:0;
    w.classList.toggle('nocell',!c); w.classList.toggle('left',c===below.c-1); if(c){ w.style.gridRow=r; w.style.gridColumn=c; } });
  return cols; }
function drawLines(reveal){ const grid=$('#grid'), svg=$('#gridlines'); if(!svg) return;
  const tiles=orderedTiles(); if(tiles.length<2) return;
  const w=grid.offsetWidth, h=grid.offsetHeight; if(!w||!h) return;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`); svg.style.width=w+'px'; svg.style.height=h+'px';
  const pts=tiles.map(t=>centreIn(t.querySelector('.pic'),grid));
  const open=tiles.map(t=>t.dataset.game?gameOpen(t.dataset.game):t.classList.contains('open'));
  let out='';
  for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1];
    const len=Math.hypot(b.x-a.x,b.y-a.y); if(!len) continue;
    /* stop at the edge of each tile's PICTURE, not its tile box: the box carries the name label above the art, so
       half of it is most of the distance to the next tile and the segment came out two pixels long. The picture is
       square, so half its width is the inset on every side, and what is left is the gap the grid puts between them. */
    const half=tiles[i].querySelector('.pic').offsetWidth/2;
    const pad=Math.min(len/2-1,half+1);
    const ux=(b.x-a.x)/len, uy=(b.y-a.y)/len;
    const x1=a.x+ux*pad, y1=a.y+uy*pad, x2=b.x-ux*pad, y2=b.y-uy*pad;
    const l=Math.hypot(x2-x1,y2-y1); const d=reveal?(i+1)*120+260:i*40;
    // v23 (L.10, build 40): no gate on the connector into the first chest any more — v21 G.3's gate IS the Games chest now
    out+=`<path class="gl${open[i+1]?' open':''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" style="--len:${l.toFixed(1)};--gd:${d}ms"></path>`; }
  svg.innerHTML=out; }
/* THE CHESTS (B.24, build 29 → B.19 / B.20, build 32 → v21 G.1 / G.3, build 37 → v23 L.10, build 40). FOUR, named by what opens them
   (config/chests.js), every one on the map from the first visit. Each is in one of four states and progress/key.js decides which —
   chestState(), strictly sequential (L.10e) — so nothing here counts anything or reads a chest flag:
   · BEFORE — the chest ahead of it is shut: "open the previous chest", and nothing about what is inside (v17 A.1, as G.1 narrowed it)
   · LOCKED — the Games chest says the chain's own count, "unlock every game · N of M" (L.10c); a key's chest reads THE METER and the
     figure it opens at (L.8a — the map chest is one of the three surfaces that read it)
   · READY — "tap to open", and it breathes; a tap goes to its key screen, which opens it there by itself (L.8b)
   · OPEN — the lid is up, the line says "opened", and what it gave stands beside it as a column of words (L.11c)
   v23 (L.9 / L.11b, build 41): EACH CHEST IN ITS OWN SPRITE (ui/chest.js, from config/chests.js) — locked crossed out, ready running its own
   idle, open lid up and still. The first time the map paints a chest READY it plays one quiet sound (L.9c, `prefs.readySeen`); the first
   time it paints one OPEN, its words shoot out one per line with a burst from the lid in its band colour (`prefs.spill`), and after that
   the column simply stands. Every word is a tap target (`chestword`). A locked key chest's meter line wears its band's colour (L.8d). */
// the spill's timings, as the custom properties ui/chest.js names — set on an element without touching its grid placement
const setVars=(el,s)=>s.split(';').forEach(kv=>{ const i=kv.indexOf(':'); if(i>0) el.style.setProperty(kv.slice(0,i),kv.slice(i+1)); });
function renderChests(){ const m=modeCount(), pct=meter(), rang=[];
  $$('#grid .chest').forEach(el=>{ const id=el.dataset.chest, st=chestState(id), c=CHESTS.find(x=>x.id===id); if(!st||!c) return;
    el.hidden=false;
    el.classList.toggle('locked',st==='locked'||st==='before'); el.classList.toggle('ready',st==='ready'); el.classList.toggle('open',st==='open');
    el.querySelector('.name').textContent=GRID.chest[id]||id;
    const pic=el.querySelector('.pic'); if(!pic.querySelector('.chestart')) pic.insertAdjacentHTML('afterbegin',chestSvg(id));
    const metered=st==='locked'&&c.needs!=='modes';
    const need=st==='open'?GRID.chestOpened:st==='ready'?GRID.chestOpen:st==='before'?GRID.chestPrev
      :c.needs==='modes'?T(GRID.chestModes,{open:m.open,total:m.total}):T(GRID.chestMeter,{pct,at:chestAt(id)});
    pic.dataset.need=need; el.classList.toggle('metered',metered); if(metered) meterLook(el,pct,true);
    if(st==='ready'&&!(prefs.readySeen||{})[id]) rang.push(id);
    const spill=st==='open'&&!(prefs.spill||{})[id];
    const old=pic.querySelector('.pburst'); if(old) old.remove(); if(spill) pic.insertAdjacentHTML('beforeend',burstHtml(id));
    el.classList.toggle('spill',spill);
    const w=$(`#grid .chestwords[data-for="${id}"]`); if(w){ w.hidden=st!=='open'; w.innerHTML=st==='open'?wordsHtml(id):''; setVars(w,spillVars()); w.classList.toggle('spill',spill); }
    if(spill){ prefs.spill=Object.assign({},prefs.spill,{[id]:1}); save(); } });
  // L.9c: one quiet sound the first time the map paints a chest READY — once, however many became ready together (guess)
  if(rang.length){ prefs.readySeen=Object.assign({},prefs.readySeen,Object.fromEntries(rang.map(id=>[id,1]))); save(); Snd.chestReady(); } }
/* v18 (B.18, build 32): each game tile's outline fills with its KEY-1 progress — 5 of 8 requirements met is the outline
   drawn five eighths of the way round, clockwise from the top, in the lilac named KEYFILL in config/theme.js. A game whose
   key-1 combinations are all cleared is COMPLETE: the outline closes and the picture takes a wash of the same colour, so
   it reads as a different thing and not merely a fuller line. The outline is an svg rect with pathLength=1 laid over the
   picture; the fraction comes out of progress/key.js and nothing here counts anything. Key 1 only — it is the quick view
   of "which games still need work for the key", and the key a first-timer is working on is key 1.
   v23 (L.10a / §M.2, build 40): NO OUTLINE BEFORE THE GAMES CHEST — key 1 is quiet until it opens, so every tile reads empty until then. */
function renderFill(){ const shown=tierOpen('clear');
  $$('.tile[data-game]').forEach(t=>{ const g=t.dataset.game; const k=shown?gameKey(g):{done:0,total:0,frac:0}; const pic=t.querySelector('.pic');
    let svg=pic.querySelector('.kfill'); if(!svg){ pic.insertAdjacentHTML('beforeend','<svg class="kfill" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="1" width="98" height="98" pathLength="1"></rect></svg>'); svg=pic.querySelector('.kfill'); }
    svg.style.setProperty('--kf',k.frac.toFixed(3)); t.classList.toggle('kdone',k.total>0&&k.done===k.total); t.classList.toggle('kpart',k.done>0&&k.done<k.total); }); }
// locked games are greyed with the condition on the tile (v6). Each tile wears its own game's colours (v10). v11: a padlock badge; the first visit reveals the grid tile by tile; a padlock wipes off when its game opens
function renderTiles(){ const reveal=!prefs.gridSeen; if(reveal){ prefs.gridSeen=1; save(); } const runs=Scores.runs(); const fresh=[];
  $$('.tile[data-game]').forEach((t,i)=>{ const g=t.dataset.game, open=gameOpen(g); t.classList.toggle('locked',!open); t.querySelector('.pic').dataset.need=open?'':T(SHEET.tileUnlock,{need:needFor(g,GAMES[g].modes[0])});
    // v13 (1.2 / L7): white until the game has been played once — colour arrives with the first recorded run
    const played=runs.some(r=>r.g===g), c=colOf(g); t.classList.toggle('unplayed',!played);
    // v20 (D.1): a game holding a newly unlocked mode that has not been played wears the green line until it has
    t.classList.toggle('newplay',open&&GAMES[g].modes.some(d=>newPlay(g,d)));
    t.style.setProperty('--sq-live',played?c.sq:'#FFFFFF'); t.style.setProperty('--cue',played?c.lead:'#8A8883');
    t.classList.remove('reveal','newthing','arrive'); t.style.animationDelay=''; if(reveal){ t.classList.add('reveal'); t.style.animationDelay=(i*120)+'ms'; }
    /* v15 (6.3, build 26): a game unlocked since you were last here ARRIVES the first time it is seen, on top of L8's
       green first-seen marker. The two say different things and both are wanted: the animation is the game turning up,
       the green border is the mark that says which one is new. The first visit of all keeps its own reveal (v11) and
       does not get this as well — everything is new on that screen, so nothing would be. */
    if(open&&!reveal){ const nw=newMark('game:'+g,fresh); if(nw){ t.classList.add('newthing'); t.classList.add('arrive'); } } });
  markSeen(fresh);
  // v17 (B.23 / B.24): the snake placement, the chest's state, then the lines over the top of both
  renderChests(); renderFill(); layoutGrid(); drawLines(reveal);
  /* v24 (B.5, build 43): THE CHESTS JOIN THE LOADING SEQUENCE. They were already there while the tiles arrived one by one with their padlocks;
     now each chest pops in after the last game, on the same 120ms beat, in the order they open */
  $$('#grid .chest').forEach(b=>{ const i=GRID_ORDER.length+Math.max(0,CHEST_ORDER.indexOf(b.dataset.chest)); b.classList.remove('reveal'); b.style.animationDelay='';
    if(reveal){ b.classList.add('reveal'); b.style.animationDelay=(i*120)+'ms'; } });
  /* v24 (A.2, build 43): A BRAND NEW GAME OPENS THE MAP AT THE TOP. #s-pick scrolls, and a scroller keeps its position while the screen is
     display:none — so after Fresh game the map came back wherever it was last left, which since build 40 was down at the chests. The loading
     sequence plays on a new profile's first visit, so that is when it starts from the top (measured headless: 0 on a clean install, 254 after
     scrolling down and taking Fresh game) */
  if(reveal) $('#s-pick').scrollTop=0; }
// a locked mode (v11) is crossed out, not just greyed; tapping it says what it takes
function fillSheet(){ const g=GAMES[sel.game]; const fresh=[]; $('#diff-row').innerHTML=g.modes.map(d=>{ const open=isOpen(sel.game,d); const nw=open?newMark('mode:'+sel.game+':'+d,fresh):''; const np=open&&newPlay(sel.game,d)?' newplay':''; return `<button data-act="diff" class="choice ${open?'':'locked'}${nw}${np}" data-diff="${d}"><span class="pic">${picOf(sel.game,d)}</span><span class="txt"><b class="${open?'':'x'}">${MODE_NAME[d]}</b><small class="${open?'':'need'}">${open?g[d]:T(SHEET.toUnlock,{need:needFor(sel.game,d)})}</small></span></button>`; }).join(''); markSeen(fresh); }
// the length face (v11): the name with its seconds beside it on the pick sheet, the best underneath; a locked length is crossed out
const lenFace=(g,s,d,vs)=>{ if(g==='sequence') return `<span class="keys">${'<i></i>'.repeat(s)}</span>${lenName(g,s,d,vs)}`; return lenName(g,s,d,vs); };
// the length buttons only select (v10); Go starts. The whole block slides up together, the same for every game. Pass & play fixes the length; versus has none (Reaction versus has a best-of)
function fillTimes(){ const c=GC(sel.game,sel.diff); const seq=sel.game==='sequence'; const versus=sel.vs===2&&versusOf(sel.game,sel.diff); const lens=lensOf(sel.game,sel.diff,versus?2:0); if(!lens.includes(sel.secs)||!versus&&!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens.find(s=>versus||lenOpen(sel.game,sel.diff,s))||lens[0];
  const fixed=sel.vs===1&&(PASS_LEN[sel.game]||SHARED2(sel.game,sel.diff)), hideLen=fixed||(versus&&!c.vsLens);
  const fresh=[];
  $('#time-row').style.display=hideLen?'none':''; $('#len-title').style.display=hideLen?'none':''; $('#len-title').textContent=SHEET.mode;
  // v13 (3.3): NAME on one line, what it costs on the next, the best under that — nothing can overlap, and the layout is the same for every game
  $('#time-row').innerHTML=lens.map(s=>{ const best=Scores.best(sel.game,sel.diff,s); const L=versus?null:lenLock(sel.game,sel.diff,s); const sub=versus?'':lenSub(sel.game,s,sel.diff); const nw=L?'':newMark('len:'+sel.game+':'+sel.diff+':'+s,fresh);
    return `<button data-act="time" class="tbtn ${sel.secs===s?'sel':''} ${L?'locked':''}${nw}" data-time="${s}"><b class="${L?'x':''}">${lenFace(sel.game,s,sel.diff,versus)}</b>${sub?`<small class="lsub">${sub}</small>`:''}<small>${L?SHEET.locked:best!==null?`<i class="bw">${c.lower?SHEET.closest:SHEET.best}</i> ${scoreTxt(sel.game,best,sel.diff,s)}`:SHEET.noRun}</small></button>`; }).join('');
  // v13 (7.1): the scale left for Customise. Practice from is earned (7.2)
  // v15 (4.5): in a Sequence versus the SAME row asks how many notes it opens with. One row on the sheet, two jobs —
  // adding a second would be the per-game special case L9 forbids
  const seqVs=seq&&sel.vs===2; const pOpen=practiceOpen(); if(!pOpen) sel.practice=0;
  if(!SEQ_VS.opens.includes(sel.opens)) sel.opens=SEQ_VS.opens[0];
  $('#prac-row').innerHTML=seqVs
    ? `<span class="chip lbl">${SHEET.opens}</span>`+SEQ_VS.opens.map(n=>`<button data-act="opens" class="chip ${sel.opens===n?'sel':''}" data-opens="${n}">${n}</button>`).join('')+`<span class="chip lbl">${SHEET.notes}</span>`
    : `<span class="chip lbl">${SHEET.practiceFrom}</span>`+(pOpen?[0,5,10,15].map(n=>`<button data-act="prac" class="chip ${sel.practice===n?'sel':''}" data-prac="${n}">${n||SHEET.off}</button>`).join(''):`<button data-act="praclock" class="chip locked x" data-praclock="1">${SHEET.pracLocked}</button>`);
  $('#seq-opts').style.display=seq&&stage==='len'&&(!sel.vs||seqVs)?'flex':'none';
  markSeen(fresh);
  $('#go-btn').textContent=goLabel(sel.game,sel.diff,versus); }
// open the sheet on a game (v11), at the mode row or straight at the length row. Used by achievements, the result screen's Back and a challenge link
function openSheet(g,d,s){ const G_=GAMES[g];
  $$('.tile').forEach(t=>t.classList.toggle('keep',t.dataset.game===g)); fillSheet();
  if(!G_.modes.includes(sel.diff)) sel.diff=G_.modes[0]; if(s!==undefined) sel.secs=s;
  if(d||G_.modes.length===1){ sel.diff=d||G_.modes[0]; $$('.choice').forEach(c=>c.classList.toggle('sel',c.dataset.diff===sel.diff)); setStage('len'); fillTimes(); }
  else setStage('mode'); }
// the challenge line on the sheet (v13 3.6). build 14 (S1): the score came off a URL — it is built as text nodes, never markup
function showChallenge(c){ const el=$('#chal'); el.textContent=''; if(c.score!==''){ const b=document.createElement('b'); b.textContent=String(c.score); el.append(SHEET.chalScored,b,SHEET.chalBeat); } else el.textContent=SHEET.chalSent; el.hidden=false; }

/* v23 (L.12, build 40): a whole key on the key screen taps through to HERE, with its chest in view — scrolled to and picked out for a
   moment, in whatever state it is in: ready (and breathing) or opened (lid up, words beside it). The next tap on it goes back to the key
   screen, which opens a ready one (L.8b). */
function chestInView(id){ const b=$(`#grid .chest[data-chest="${id}"]`); if(!b) return;
  b.scrollIntoView({block:'center',behavior:'smooth'}); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); setTimeout(()=>b.classList.remove('flash'),1800); }
register('s-pick',{
  onShow({g,d,s,spillDemo:sd,chest}){ if(g){ sel.game=g; prefs.lastGame=g; save(); applyPrefs(g); } renderTiles(); setStage('grid'); if(g) openSheet(g,d,s); if(sd) setTimeout(()=>spillDemo(sd),350); if(chest) setTimeout(()=>chestInView(chest),150); },
  onBack(){ if(stage==='len'){ setStage(GAMES[sel.game].modes.length===1?'grid':'mode'); return true; } if(stage==='mode'){ setStage('grid'); return true; } return false; },
});
/* B.26 → v23 (L.6 / L.11b, build 41): Testing's "replay chest opening" plays the CEREMONY on the key screen, and its tap lands here, where
   the SPILL replays over whatever state the chest is really in — lid up, the words shooting out, the burst from the lid — before the tile
   is put back as its state leaves it. Nothing is stored: not the chest, not `prefs.spill`. Build 32's lid swing is retired with it. */
const SPILL_DEMO_MS=3600;
function spillDemo(id){ const b=$(`#grid .chest[data-chest="${id}"]`), w=$(`#grid .chestwords[data-for="${id}"]`); if(!b||!w) return;
  b.hidden=false; b.classList.remove('locked','ready','metered'); b.classList.add('open','spill');
  const pic=b.querySelector('.pic'); pic.dataset.need=GRID.chestOpened; const old=pic.querySelector('.pburst'); if(old) old.remove(); pic.insertAdjacentHTML('beforeend',burstHtml(id));
  w.hidden=false; w.innerHTML=wordsHtml(id); setVars(w,spillVars()); w.classList.add('spill'); layoutGrid(); chestInView(id);
  setTimeout(()=>{ b.classList.remove('spill'); w.classList.remove('spill'); renderChests(); layoutGrid(); drawLines(false); },SPILL_DEMO_MS); }
on('challenge',c=>{ show('s-pick',{g:c.g,d:c.d,s:c.s}); showChallenge(c); });
on('run:abort',()=>show('s-pick'));
// v24 (A.2, build 43): Fresh game starts the map at the top, whatever the last profile left it scrolled to
on('store:reset',()=>{ const p=$('#s-pick'); if(p) p.scrollTop=0; });
// the snake and its lines are measured, so a rotation has to re-measure them. Only while the grid is the screen on show
addEventListener('resize',()=>{ if($('#s-pick').classList.contains('on')){ layoutGrid(); drawLines(false); } });
define({
  game(b){ if(b.classList.contains('locked')){ ask(b.dataset.game,GAMES[b.dataset.game].modes[0]); return 'pick'; }
    sel.game=b.dataset.game; prefs.lastGame=sel.game; save(); applyPrefs(sel.game); $$('.tile').forEach(t=>t.classList.toggle('keep',t===b)); fillSheet();
    if(GAMES[sel.game].modes.length===1){ sel.diff=GAMES[sel.game].modes[0]; setStage('len'); fillTimes(); } else setStage('mode'); return 'pick'; },
  // v15 (2.1): the locked test comes FIRST. It used to sit behind the length-stage check, so tapping a locked mode from the
  // length row walked the sheet back a stage instead of saying what the mode takes — and every §1 requirement, the five
  // deliberate-failure ones especially, is only findable by tapping the thing that is locked
  diff(b){ if(b.classList.contains('locked')){ ask(sel.game,b.dataset.diff); return 'pick'; } if(stage==='len'){ setStage('mode'); return 'pick'; } sel.diff=b.dataset.diff;
    // v14 (4.6): the picked mode turns green and the other darkens, then the length row and Go push up — no jump cut
    $$('.choice').forEach(c=>{ c.classList.toggle('sel',c===b); c.classList.toggle('picked',c===b); }); $('#diff-row').classList.add('picking');
    clearTimeout(pickT); pickT=setTimeout(()=>{ $('#diff-row').classList.remove('picking'); $$('.choice').forEach(c=>c.classList.remove('picked')); if(stage==='mode'){ setStage('len'); fillTimes(); } },170); return 'pick'; },
  'lvl-back'(){ setStage('mode'); return 'click'; },
  time(b){ const v=+b.dataset.time; if(b.classList.contains('locked')){ ask(sel.game,sel.diff,v); return 'pick'; } sel.secs=v; $$('[data-time]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
  'go-btn'(){ if(sel.game!=='sequence') sel.practice=0; VS.reset(); start(); return 'click'; },
  vs(b){ sel.vs=b.dataset.vs==='0'?0:(sel.vs||1); renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':sel.vs===2?' · versus':''); renderVsArt(); if(stage==='len') fillTimes(); return 'pick'; },
  vs2(b){ sel.vs=+b.dataset.vs2; renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':' · versus'); renderVsArt(); if(stage==='len') fillTimes(); return 'pick'; },
  /* v17 (B.24): a locked chest says what it takes, the same way every other locked thing does (v15 2.1).
     v23 (L.8b / L.10, build 40): a chest whose chest ahead is shut says so and stays put (G.1). The Games chest while any mode is locked
     says the chain's count and stays put — it never sends you to the keys, where there is nothing to open yet (G.3's rule, kept for the
     chest that replaced its gate). Every other tap opens THAT chest's key screen, as it always did — and a READY chest is opened there,
     by itself, with no "Open the chest?" and no "Would you like to progress to Pro?": both are retired with the double confirmation. */
  chest(b){ const id=b.dataset.chest, st=chestState(id), c=CHESTS.find(x=>x.id===id); if(!c) return 'pick';
    if(st==='before'){ toast(GRID.chestPrevToast); return 'pick'; }
    if(st==='locked'&&c.needs==='modes'){ const m=modeCount(); toast(T(GRID.chestModesToast,{open:m.open,total:m.total}),'','',true); return 'pick'; }
    /* v24 (B.2 / B.3, build 43): a READY chest's tap IS the ask — "tap to open" says so — and it opens without flashing the key screen: the key
       screen opens it on the frame it is shown, or after a key animation not yet seen has played through (ui/screens/key.js `open`) */
    if(st==='ready'){ show('s-key',{open:id,tier:c.screen}); return 'click'; }
    show('s-key',{tier:c.screen}); return 'click'; },
  /* v23 (L.11b, build 41): a chest's word goes to the thing it names — `to` in config/copy.js: a screen, a key's tab (`key:<n>`), or `soon`
     for a reward not built yet (Gauntlet, and the Pro and Thorns placeholders), which says so where it is */
  chestword(b){ const to=b.dataset.to||'soon';
    if(to.startsWith('key:')){ show('s-key',{tier:+to.slice(4)}); return 'click'; }
    if(to.startsWith('s-')){ show(to); return 'click'; }
    toast(T(CHEST_SOON,{w:b.dataset.w||''}),'','',true); return 'pick'; },
  praclock(){ toast(TOAST.pracLocked); return 'pick'; },
  prac(b){ sel.practice=+b.dataset.prac; $$('[data-prac]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
  // v15 (4.5): how many notes a Sequence versus opens with
  opens(b){ sel.opens=+b.dataset.opens; $$('[data-opens]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
});
