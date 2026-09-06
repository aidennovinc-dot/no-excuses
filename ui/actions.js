/* No Excuses — what a tap on a button does (build 15, refactor stage 1). Replaces the 60-line click dispatcher in boot.js.
   Every button carries data-act; ACTIONS[act](btn, ev) does the work and returns the sound to play — 'pick' for a
   control that selects something (select()), 'click' for everything else, undefined for silence. onClick plays it.
   The overlays that used to sit above the button chain (toast, title sequence, ad break, lock box, the Next card, the
   full stop, and a tap on nothing) keep their old order at the top of onClick. A button without data-act, or with an
   unknown one, plays the sound it always did and does nothing else. */
import { Ads, abort, goWhere, start } from "../app.js";
import { Music, Snd } from "../audio.js";
import { TOAST } from "../config/copy.js";
import { $, $$, T } from "../core.js";
import { CHAL } from "../core/platform.js";
import { F, VS, sel } from "../core/state.js";
import { prefs, save } from "../core/store.js";
import { SQ } from "../games/sequence.js";
import { GAMES, GC } from "../games/registry.js";
import { Story, Wheel, applyPrefs, askUnlock, back, bumpEggTaps, devState, eggTaps, fillSheet, fillTimes, freshGame, gotoAch, isPick, itemsOf, jumpTo, lockGo, nextWhere, openChallenge, openSheet, pvSeen, pvTry, renderAch, renderBoard, renderCustom, renderOverChips, renderOverTop, renderVsArt, renderVsRow, setStage, shareRun, show, stage } from "../menu.js";
import { achById, got, isOpen, lenOpen, unlockHtml } from "../progress.js";
import { toast } from "./toast.js";

// v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
function goChallenge(){ if(!CHAL) return false; openSheet(CHAL.g,CHAL.d,CHAL.s); openChallenge(); return true; }

const ACTIONS={
  // a button with no act, or one this table does not know: the sound it always made, nothing else
  none(b){ return isPick(b)?'pick':'click'; },
  quit(){ abort(); return 'click'; },
  'wheel-done'(){ Wheel.close(); return 'click'; },
  seqdone(){ SQ.done(); return 'click'; },
  'over-back'(){ openSheet(sel.game,GAMES[sel.game].modes.length>1?sel.diff:undefined); return 'click'; },
  share(){ shareRun(); return 'click'; },
  back(){ back(); return 'click'; },
  go(b){ show(b.dataset.go); return 'click'; },
  game(b){ if(b.classList.contains('locked')){ askUnlock(b.dataset.game,GAMES[b.dataset.game].modes[0]); return 'pick'; }
    sel.game=b.dataset.game; prefs.lastGame=sel.game; save('ne.prefs',prefs); applyPrefs(sel.game); $$('.tile').forEach(t=>t.classList.toggle('keep',t===b)); fillSheet();
    if(GAMES[sel.game].modes.length===1){ sel.diff=GAMES[sel.game].modes[0]; setStage('len'); fillTimes(); } else setStage('mode'); return 'pick'; },
  diff(b){ if(stage==='len'){ setStage('mode'); return 'pick'; } if(b.classList.contains('locked')){ askUnlock(sel.game,b.dataset.diff); return 'pick'; } sel.diff=b.dataset.diff; $$('.choice').forEach(c=>c.classList.toggle('sel',c===b));
    setStage('len'); fillTimes(); return 'pick'; },
  'lvl-back'(){ setStage('mode'); return 'click'; },
  'dev-open'(){ prefs.allOpen=!prefs.allOpen; save('ne.prefs',prefs); devState(); toast(prefs.allOpen?TOAST.devOpenOn:TOAST.devOpenOff); return 'pick'; },
  'dev-sup'(){ prefs.supporter=!prefs.supporter; save('ne.prefs',prefs); devState(); toast(prefs.supporter?TOAST.supOn:TOAST.supOff); return 'pick'; },
  'dev-fresh'(){ freshGame(); devState(); toast(TOAST.fresh); return 'pick'; },
  time(b){ const v=+b.dataset.time; if(b.classList.contains('locked')){ askUnlock(sel.game,sel.diff,v); return 'pick'; } sel.secs=v; $$('[data-time]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
  'go-btn'(){ if(sel.game!=='sequence') sel.practice=0; VS.reset(); start(); return 'click'; },
  vs(b){ sel.vs=b.dataset.vs==='0'?0:(sel.vs||1); renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':sel.vs===2?' · versus':''); renderVsArt(); if(stage==='len') fillTimes(); return 'pick'; },
  vs2(b){ sel.vs=+b.dataset.vs2; renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':' · versus'); renderVsArt(); if(stage==='len') fillTimes(); return 'pick'; },
  'pass-go'(){ start(); return 'click'; },
  'to-games'(){ VS.reset(); show('s-pick'); return 'click'; },
  'dev-story'(){ Story.open(); return 'pick'; },
  praclock(){ toast(TOAST.pracLocked); return 'pick'; },
  prac(b){ sel.practice=+b.dataset.prac; $$('[data-prac]').forEach(c=>c.classList.toggle('sel',c===b)); return 'pick'; },
  again(){ VS.reset(); if(sel.game!=='sequence') sel.practice=0; start(); return 'click'; },
  support(){ if(prefs.supporter) toast(TOAST.supAlready); else toast(TOAST.supLater); return 'click'; },
  pvlock(b){ if(b.dataset.ach) gotoAch(b.dataset.ach); return 'click'; },
  // an earned achievement (v11) opens Customise at what it unlocked; a locked one still offers the run
  ach(b){ const a=achById(b.dataset.ach); if(!a) return 'click'; if(got()[a.id]){ if(a.g!=='all') sel.game=a.g; show('s-custom'); if(a.unlocks){ const [k,v]=a.unlocks; const grp=$('#c-'+(k==='wheel'?'sq':k)); if(grp){ grp.closest('.cgroup').scrollIntoView({block:'center',behavior:'smooth'}); const sw=grp.querySelector(`[data-v="${v}"]`); if(sw){ sw.classList.add('pvw'); setTimeout(()=>sw.classList.remove('pvw'),1800); } } } return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
  chip(b){ const [scope,key]=b.dataset.chip.split('-'); const v=b.dataset.v==='true'?true:b.dataset.v==='false'?false:isNaN(b.dataset.v)?b.dataset.v:+b.dataset.v;
    // the result screen's chips (v11): a locked mode or length cannot be picked, and the board under them follows what is picked
    if(scope==='over'){ if(key==='d'){ if(!isOpen(sel.game,v)){ askUnlock(sel.game,v); return 'pick'; } sel.diff=v; } if(key==='s'){ if(sel.vs!==2&&!lenOpen(sel.game,sel.diff,v)){ askUnlock(sel.game,sel.diff,v); return 'pick'; } sel.secs=v; } if(key==='vs'){ sel.vs=v==='f'?(sel.vs||1):v; } if(key==='vs2') sel.vs=v; if(key==='sc'){ sel.scale=v; prefs.scale=v; save('ne.prefs',prefs); Snd.scaleHear(); } sel.practice=0; renderOverChips(); renderOverTop(); return 'pick'; }
    F[scope][key]=v; if(scope==='bd'){ if(key==='g'){ F.bd.d=GAMES[v].modes[0]; F.bd.s=GC(v,F.bd.d).lens[0]; } if(key==='d'){ F.bd.s=GC(F.bd.g,v).lens[0]; } renderBoard(); } if(scope==='pv') renderCustom(); if(scope==='ach') renderAch(); return 'pick'; },
  'music-pv'(){ Music.preview(F.pv.g); return 'pick'; },
  // a Customise item: colour, background, sound pack, scale, music switch — the group is the closest [data-set]
  item(b){ const set=b.closest('[data-set]'); if(!set) return 'pick'; const k=set.dataset.set;
    if(b.classList.contains('locked')){ const L=achById(b.dataset.lock); Object.assign(pvTry,{set:k,v:b.dataset.v,by:L.id}); renderCustom(); toast(T(TOAST.locked,{name:L.name})); return 'pick'; }
    pvTry.set=null; const it=(itemsOf(k)||[]).find(i=>String(i.v)===b.dataset.v); pvSeen.by=it&&it.by||null; if(b.dataset.v==='wheel'){ Wheel.open(k); return 'pick'; }
    if(k==='bg'){ prefs.bg=b.dataset.v; prefs.tint=''; }
    else if(k==='sq'||k==='lead'||k==='cut') prefs.col[F.pv.g][k]=b.dataset.v;
    // v13 (12.1): music is per game now — the row switches this game's track on or off
    else if(k==='music'){ prefs.musicG[F.pv.g]=b.dataset.v==='true'; if(b.dataset.v==='true') Music.preview(F.pv.g,2600); else Music.stop(); }
    // v13 (7.1): the scale left the pick sheet — one choice, applied to every Sequence run
    else if(k==='scale'){ prefs.scale=b.dataset.v; sel.scale=b.dataset.v; }
    else prefs[k]=b.dataset.v;
    applyPrefs(F.pv.g); renderCustom();
    if(k==='scale') Snd.scaleHear();
    // v13 (12.2): the pack is demonstrated with the app's own tap sounds, in the pack just picked — a select, then a hit
    if(k==='snd'){ Snd.select(); setTimeout(()=>Snd.hit(),150); } return 'pick'; },
};

function onClick(e){
  const b=e.target.closest('button');
  if(e.target.closest('#toast')){ const id=$('#toast').dataset.ach; if(id){ Snd.click(); $('#toast').classList.remove('on'); gotoAch(id); } return; }
  if($('#s-story').classList.contains('on')){ Story.next(); if(CHAL) setTimeout(goChallenge,250); return; }
  if($('#adbreak').classList.contains('on')){ if(b&&b.id==='adskip'&&!b.disabled) Ads.close(); return; }
  if($('#lockwrap').classList.contains('on')){ if(b&&b.id==='lock-go'){ Snd.click(); return goWhere(lockGo); } if(!e.target.closest('#lockbox')||(b&&b.id==='lock-no')){ Snd.click(); $('#lockwrap').classList.remove('on'); } return; }
  if(e.target.closest('#nextup')){ Snd.click(); if(nextWhere) goWhere(nextWhere); return; }
  if(e.target.closest('#egg')){ bumpEggTaps(); if(eggTaps>=3&&!got().egg){ const g=got(); g.egg=Date.now(); save('ne.ach',g); const a=achById('egg'); toast(T(TOAST.achievement,{name:a.name})+' · '+unlockHtml(a),a.id,'',true); } return; }
  // a tap that isn't on a control: every sub-screen goes back
  if(!b){ if(e.target.closest('.sheet')||e.target.closest('#game')||e.target.closest('input')||e.target.closest('#wheelwrap')) return; if($('.screen.on')){ Snd.click(); back(); } return; }
  const h=ACTIONS[b.dataset.act]||ACTIONS.none; const snd=h(b,e);
  if(snd==='pick') Snd.select(); else if(snd==='click') Snd.click();
}

export { ACTIONS, goChallenge, onClick };
