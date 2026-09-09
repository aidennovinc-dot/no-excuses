/* No Excuses — the result screen (build 18, refactor stage 4; was renderOver* / shareRun in menu.js and the tail of finish in
   run/run.js). run:finish arrives with the record: the header, the pair or the stats, the option chips, the top 10 (never for
   two players, L10), then — after the ad break every fourth result — the unlock and achievement toasts. Go plays again with
   whatever the chips say; Back reopens the sheet; Challenge a friend shares a link that carries the score. */
import { RESULT, SHARE, SHEET, TOAST, VERDICT } from "../../config/copy.js";
import { PUB_URL } from "../../config/build.js";
import { MODE_NAME, PASS_LEN } from "../../config/games.js";
import { $, T, esc, pWho } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { VS, sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, SHARED2, isStreak, lenName, versusOf } from "../../games/registry.js";
import { Scores, achById, got, isOpen, lenLock, lenOpen, lensOf, markSeen, newMark, unlockHtml, unlockToast, verdict } from "../../progress.js";
import { start } from "../../run/run.js";
import { define, lock } from "../actions.js";
import { Ads } from "../ads.js";
import { colsOf, goLabel, picOf, scoreTxt } from "../format.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";

let lastRun=null, eggTaps=0;
// v14 (7.1): what the run that just finished was — the button reads Try again while the chips still say the same thing
let played=null;
const sameAsPlayed=()=>!!played&&played.g===sel.game&&played.d===sel.diff&&played.s===sel.secs&&played.vs===sel.vs;
// the result screen's options (v10): players, mode, length — pick, then Go. What you were just playing is pre-selected. v11: Solo / With a friend, then Pass & play / Versus; locked modes and lengths are crossed out and cannot be picked
function renderOverChips(){ const g=GAMES[sel.game]; const vsOk=versusOf(sel.game,sel.diff); if(sel.vs===2&&!vsOk) sel.vs=1; const fresh=[];
  $('#over-vs').innerHTML=`<button class="chip ${sel.vs===0?'sel':''}" data-act="chip-over" data-chip="over-vs" data-v="0">solo</button><button class="chip ${sel.vs?'sel':''}" data-act="chip-over" data-chip="over-vs" data-v="f">with a friend</button>`+(sel.vs?`<span class="chip lbl">·</span><button class="chip ${sel.vs===1?'sel':''}" data-act="chip-over" data-chip="over-vs2" data-v="1">pass &amp; play</button>${vsOk?`<button class="chip ${sel.vs===2?'sel':''}" data-act="chip-over" data-chip="over-vs2" data-v="2">versus</button>`:''}`:'');
  $('#over-chips').innerHTML=g.modes.length>1?g.modes.map(d=>{ const open=isOpen(sel.game,d); const nw=open?newMark('mode:'+sel.game+':'+d,fresh):''; return `<button class="mch ${d===sel.diff?'sel':''} ${open?'':'locked'}${nw}" data-act="chip-over" data-chip="over-d" data-v="${d}"><span class="pic">${picOf(sel.game,d)}</span><b class="${open?'':'x'}">${MODE_NAME[d]}</b></button>`; }).join(''):'';
  const versus=sel.vs===2&&vsOk, c=GC(sel.game,sel.diff), lens=lensOf(sel.game,sel.diff,versus?2:0), fixed=sel.vs===1&&(PASS_LEN[sel.game]||SHARED2(sel.game,sel.diff));
  if(!lens.includes(sel.secs)||!versus&&!lenOpen(sel.game,sel.diff,sel.secs)) sel.secs=lens.find(s=>versus||lenOpen(sel.game,sel.diff,s))||lens[0];
  $('#over-chips2').innerHTML=lens.length>1&&!fixed&&(!versus||c.vsLens)?lens.map(s=>{ const L=versus?null:lenLock(sel.game,sel.diff,s); const nw=L?'':newMark('len:'+sel.game+':'+sel.diff+':'+s,fresh); return `<button class="chip ${s===sel.secs?'sel':''} ${L?'locked x':''}${nw}" data-act="chip-over" data-chip="over-s" data-v="${s}">${lenName(sel.game,s,sel.diff,versus)}</button>`; }).join(''):'';
  $('#over-chips3').innerHTML='';
  markSeen(fresh);
  $('#again').textContent=sameAsPlayed()?SHEET.tryAgain:goLabel(sel.game,sel.diff,versus); }
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
  const rec=`<span><i class="bw">${g.lower?SHEET.closest:SHEET.best}</i> <b>${best===null?RESULT.dash:scoreTxt(run.g,best,run.d,run.s)}</b></span>`;
  $('#over-stats').innerHTML=[dupe(cols[0])?'':cell(cols[0]),rec,dupe(cols[1])?'':cell(cols[1])].join('')+peak;
  const rk=Scores.rank(run); $('#over-rank').innerHTML = rk&&rk<=10 ? T(RESULT.rank,{n:rk,name:esc(prefs.name||RESULT.you)}) : T(RESULT.outside,{name:esc(prefs.name||RESULT.you)}); }
// the "beat my score" share (v11): navigator.share, or the clipboard with a toast
// v13 (3.6): Challenge a friend. The link carries the target, so opening it drops the other player straight onto that pick sheet with the score to beat
function shareRun(){ const r=lastRun; if(!r) return; const c=GC(r.g,r.d,r.s); const score=scoreTxt(r.g,r.hits,r.d,r.s)+(c.scoreWord&&!c.suffix?' '+c.scoreWord:'');
  const rate=c.timed?` (${(r.hits/r.s).toFixed(1)}/s)`:'';
  const where=`${c.name}${MODE_NAME[r.d]?' '+MODE_NAME[r.d]:''} · ${lenName(r.g,r.s,r.d)}`;
  const url=`${PUB_URL}?g=${encodeURIComponent(r.g)}&d=${encodeURIComponent(r.d)}&s=${r.s}&score=${encodeURIComponent(r.hits)}`;
  const text=T(SHARE.text,{name:prefs.name||SHARE.someone,score,rate,where,url});
  if(navigator.share){ navigator.share({text}).catch(()=>{}); return; } if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>toast(TOAST.copied),()=>toast(text)); } else toast(text); }

register('s-over',{});
on('run:record',({run})=>{ lastRun=run; played={g:run.g,d:run.d,s:run.s,vs:sel.vs}; });
on('store:reset',()=>{ lastRun=null; played=null; });
on('run:finish',({run,isBest,two,fresh,ach,adv})=>{ const g=GC(run.g,run.d,run.s);
  // the header (v11) carries only a status — the board title under the top 10 names the game, mode and length
  $('#over-eyebrow').textContent=run.practice?RESULT.practice:run.fail?RESULT.fail:isBest?RESULT.best:run.vs2?(sel.vs===1?RESULT.pass:RESULT.versus):VS.on?RESULT.pass:'';
  // practice shows no score at all (v5). Versus shows the pair of counts. Lower-is-better scores wear a ▼ (v11)
  // v14 (4.16): a versus run drops the white score strip entirely — #vsbox below is the result, and it only needs saying once
  $('#over-score').hidden=!!run.vs2;
  // v15 (3.8 answer, build 25): a Streak says what its number is. The score is the round the run reached — bare, it was just
  // a figure, and 3.8's retune can only be judged from play by reading it
  const unit=!run.vs2&&!run.practice&&isStreak(run.g,run.d,run.s)?T(RESULT.streakUnit,{word:g.scoreWord||'rounds'}):'';
  $('#over-score').innerHTML=run.vs2?'':run.practice||(run.fail&&!run.hits)?RESULT.dash:scoreTxt(run.g,run.hits,run.d,run.s)+(g.lower?RESULT.lowerMark:'')+unit; $('#over-score').classList.toggle('sm',!!g.suffix);
  $('#verdict').textContent=run.vs2?(run.vs2.w<0?VERDICT.draw:T(VERDICT.took,{n:run.vs2.w+1,how:run.vs2.how?' '+run.vs2.how:''})):run.practice?VERDICT.practice:verdict(run);
  renderOver(run);
  // the ad break (v10) comes between the run and the result, every fourth result, never for supporters
  /* v15 (2.5): what was earned is already in the store — run/run.js banked it the moment the record existed, and hands the
     three lists down on the event. This block only SHOWS them. It used to do the earning too, inside this callback, so a
     player who closed the app on the ad break lost every unlock and achievement the run had made. Silent data loss.
     v14 (9.3 / 9.4 / 9.5): a solo run that beats a clearance bar for the FIRST time clears it for good and takes the player
     to the key to watch its root advance one segment. Re-clearing hands down null and plays nothing, and Back from there
     comes straight back here — the run is not finished with. Two-player and practice never get this far. */
  setTimeout(()=>Ads.after(()=>{ show('s-over'); if(run.practice||two) return;
    const msgs=(fresh||[]).map(u=>[unlockToast(u.key),'','ok'])
      .concat((ach||[]).map(a=>[T(TOAST.achievement,{name:a.name})+(a.unlocks?' · '+unlockHtml(a):''),a.id,'']));
    const rest=()=>{ msgs.forEach(([m,id,cls],i)=>setTimeout(()=>toast(m,id,cls,!!id),i*(id?3400:2600))); renderOverChips(); };
    if(adv) keyBreak(adv,rest); else rest(); }),250); });
/* v15 (5.1, build 26): a key unlock INTERRUPTS this screen. It was a green toast the player tapped, sitting behind
   however many unlock and achievement toasts came first, and only then did it offer the key — so the one thing the key
   is for, watching a root move, was the easiest thing in the run to miss. Now the result fades before anything can be
   tapped, input is locked at the dispatcher (nothing else blocks the bare-ground Back), the key screen plays the segment
   filling with that game's whole root lit behind it, and it hands itself straight back. Same flow for every game.
   The two screens still know nothing about each other (A4): this one asks with show(..., {auto}), the key answers with
   key:done, and the toasts that were waiting run after it rather than in front of it. */
function keyBreak(adv,then){ pendingRest=then; lock(true); $('#s-over').classList.add('fadeout');
  setTimeout(()=>show('s-key',{advance:adv,auto:'s-over'}),420); }
let pendingRest=null;
on('key:done',()=>{ lock(false); $('#s-over').classList.remove('fadeout'); const f=pendingRest; pendingRest=null; if(f) setTimeout(f,320); });
define({
  'over-back'(){ show('s-pick',{g:sel.game,d:GAMES[sel.game].modes.length>1?sel.diff:undefined}); return 'click'; },
  share(){ shareRun(); return 'click'; },
  again(){ VS.reset(); if(sel.game!=='sequence') sel.practice=0; start(); return 'click'; },
  'to-games'(){ VS.reset(); show('s-pick'); return 'click'; },
  // the result screen's chips (v11): a locked mode or length cannot be picked, and the board under them follows what is picked
  'chip-over'(b){ const key=b.dataset.chip.split('-')[1]; const v=isNaN(b.dataset.v)?b.dataset.v:+b.dataset.v;
    if(key==='d'){ if(!isOpen(sel.game,v)){ emit('lock:ask',{g:sel.game,d:v}); return 'pick'; } sel.diff=v; }
    if(key==='s'){ if(sel.vs!==2&&!lenOpen(sel.game,sel.diff,v)){ emit('lock:ask',{g:sel.game,d:sel.diff,s:v}); return 'pick'; } sel.secs=v; }
    if(key==='vs'){ sel.vs=v==='f'?(sel.vs||1):v; } if(key==='vs2') sel.vs=v;
    sel.practice=0; renderOverChips(); renderOverTop(); return 'pick'; },
  // the full stop under the top 10: three taps earn Excuses
  egg(){ eggTaps++; if(eggTaps>=3&&!got().egg){ got().egg=Date.now(); save(); const a=achById('egg'); toast(T(TOAST.achievement,{name:a.name})+' · '+unlockHtml(a),a.id,'',true); } },
});
