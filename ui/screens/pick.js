/* No Excuses — the pick screen (build 18, refactor stage 4; was the middle of menu.js). The grid of tiles, then one bottom
   sheet for every game (L9): the player row, the mode row, the length row, Go. Three stages — grid, mode, len — and Back
   walks them before it leaves the screen. show('s-pick', {g, d, s}) opens a game's sheet straight at its mode or length row
   (the result screen's Back, an achievement row, a challenge link). Locked things ask the lock box through lock:ask. */
import { SHEET } from "../../config/copy.js";
import { MODE_NAME, PASS_LEN, SEQ_VS, VS_LEAD, VS_TARGET } from "../../config/games.js";
import { VS_ART } from "../../config/theme.js";
import { VS_LINE } from "../../config/copy.js";
import { $, $$, T, pWho } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { VS, sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, SHARED2, lenName, lenSub, versusAny, versusOf } from "../../games/registry.js";
import { Scores, gameOpen, isOpen, lenLock, lenOpen, lensOf, markSeen, needFor, newMark, practiceOpen } from "../../progress.js";
import { start } from "../../run/run.js";
import { define } from "../actions.js";
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
function setStage(st){ stage=st; const g=GAMES[sel.game]; $('#diff-row').classList.remove('picking'); $('#grid').classList.toggle('dim',st!=='grid'); $('#sheet').classList.toggle('up',st!=='grid'); $('#sheet').classList.toggle('len',st==='len');
  $('#diff-row').classList.toggle('single',g.modes.length===1);
  $('#seq-opts').style.display='none'; $('#vs-wrap').style.display=st==='mode'||(st==='len'&&g.modes.length===1)?'':'none'; renderVsRow();
  if(st==='grid'){ $$('.tile').forEach(t=>t.classList.remove('keep')); } $('#sheet-title').textContent=g.name+(sel.vs===1?SHEET.passTitle:sel.vs===2?SHEET.versusTitle:''); $('#len-title').textContent=SHEET.mode;
  renderVsArt(); $('#lvl-mode').textContent=MODE_NAME[sel.diff]||''; $('#lvl-back').style.display=g.modes.length>1?'':'none'; }
// locked games are greyed with the condition on the tile (v6). Each tile wears its own game's colours (v10). v11: a padlock badge; the first visit reveals the grid tile by tile; a padlock wipes off when its game opens
function renderTiles(){ const reveal=!prefs.gridSeen; if(reveal){ prefs.gridSeen=1; save(); } const runs=Scores.runs(); const fresh=[];
  $$('.tile[data-game]').forEach((t,i)=>{ const g=t.dataset.game, open=gameOpen(g); t.classList.toggle('locked',!open); t.querySelector('.pic').dataset.need=open?'':T(SHEET.tileUnlock,{need:needFor(g,GAMES[g].modes[0])});
    // v13 (1.2 / L7): white until the game has been played once — colour arrives with the first recorded run
    const played=runs.some(r=>r.g===g), c=colOf(g); t.classList.toggle('unplayed',!played);
    t.style.setProperty('--sq-live',played?c.sq:'#FFFFFF'); t.style.setProperty('--cue',played?c.lead:'#8A8883');
    t.classList.remove('reveal','newthing','arrive'); t.style.animationDelay=''; if(reveal){ t.classList.add('reveal'); t.style.animationDelay=(i*120)+'ms'; }
    /* v15 (6.3, build 26): a game unlocked since you were last here ARRIVES the first time it is seen, on top of L8's
       green first-seen marker. The two say different things and both are wanted: the animation is the game turning up,
       the green border is the mark that says which one is new. The first visit of all keeps its own reveal (v11) and
       does not get this as well — everything is new on that screen, so nothing would be. */
    if(open&&!reveal){ const nw=newMark('game:'+g,fresh); if(nw){ t.classList.add('newthing'); t.classList.add('arrive'); } } });
  markSeen(fresh); }
// a locked mode (v11) is crossed out, not just greyed; tapping it says what it takes
function fillSheet(){ const g=GAMES[sel.game]; const fresh=[]; $('#diff-row').innerHTML=g.modes.map(d=>{ const open=isOpen(sel.game,d); const nw=open?newMark('mode:'+sel.game+':'+d,fresh):''; return `<button data-act="diff" class="choice ${open?'':'locked'}${nw}" data-diff="${d}"><span class="pic">${picOf(sel.game,d)}</span><span class="txt"><b class="${open?'':'x'}">${MODE_NAME[d]}</b><small class="${open?'':'need'}">${open?g[d]:T(SHEET.toUnlock,{need:needFor(sel.game,d)})}</small></span></button>`; }).join(''); markSeen(fresh); }
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

register('s-pick',{
  onShow({g,d,s}){ if(g){ sel.game=g; prefs.lastGame=g; save(); applyPrefs(g); } renderTiles(); setStage('grid'); if(g) openSheet(g,d,s); },
  onBack(){ if(stage==='len'){ setStage(GAMES[sel.game].modes.length===1?'grid':'mode'); return true; } if(stage==='mode'){ setStage('grid'); return true; } return false; },
});
on('challenge',c=>{ show('s-pick',{g:c.g,d:c.d,s:c.s}); showChallenge(c); });
on('run:abort',()=>show('s-pick'));
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
  praclock(){ toast(TOAST.pracLocked); return 'pick'; },
  prac(b){ sel.practice=+b.dataset.prac; $$('[data-prac]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
  // v15 (4.5): how many notes a Sequence versus opens with
  opens(b){ sel.opens=+b.dataset.opens; $$('[data-opens]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
});
