/* No Excuses — entry point. Every top-level statement from the original single script, in its original order, after all modules have evaluated
   Split out of index.html at build 12. Behaviour is identical to build 11. */
import "./core.js";
import "./games/registry.js";
import "./progress.js";
import "./audio.js";
import "./menu.js";
import "./engine-core.js";
import "./games/quick-tap.js";
import "./games/dots.js";
import "./games/shapes.js";
import "./games/estimate.js";
import "./games/sequence.js";
import "./games/round.js";
import "./games/timing.js";
import "./games/reaction.js";
import "./games/spot.js";
import "./app.js";

import { Ads, DRAW, H, Intro, VX, W, abort, cx, size, start, tapAt } from "./app.js";
import { Music, Snd, ac } from "./audio.js";
import { $, $$, save } from "./core.js";
import { G, cur } from "./engine-core.js";
import { DT } from "./games/dots.js";
import { HD } from "./games/estimate.js";
import { GAMES, GC } from "./games/registry.js";
import { SQ } from "./games/sequence.js";
import { CHAL, F, ITEMS, itemsOf, Story, VS, Wheel, applyPrefs, back, bumpEggTaps, devState, eggTaps, fillSheet, fillTimes, firstRun, freshGame, isPick, menuIn, nextWhere, openChallenge, prefs, pvSeen, pvTry, renderBoard, renderCustom, renderOverChips, renderOverTop, renderVsArt, renderVsRow, sel, setMenuWasFirst, setStage, shareRun, show, stage } from "./menu.js";
import { ACH, achById, askUnlock, goWhere, got, gotoAch, isOpen, jumpTo, lenOpen, lockGo, openSheet, renderAch, seedSeen, seenAll, toast, unlockHtml } from "./progress.js";
document.addEventListener('pointerdown',()=>{ if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } },{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } });
// v7: nothing is force-open any more. Cosmetics and modes both follow the one "open everything" switch on the About screen
delete prefs.pack;
setMenuWasFirst(firstRun());
// v13 (2.1): everything already open on this profile counts as seen, so nothing flashes green on day one
if(!seenAll()) seedSeen();
// v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
function goChallenge(){ if(!CHAL) return false; openSheet(CHAL.g,CHAL.d,CHAL.s); openChallenge(); return true; }
if(!prefs.story) Story.open(); else { menuIn(); if(CHAL) setTimeout(goChallenge,300); }
if(prefs.mig11){ setTimeout(()=>toast(`Build 11 · ${prefs.mig11} old Estimate / Timing / Reaction / Count run${prefs.mig11>1?'s':''} retired — the scoring changed`),1200); delete prefs.mig11; save('ne.prefs',prefs); }
document.addEventListener('pointerdown', ()=>Snd.unlock(), {once:true});
$('#pname').value=prefs.name; $('#pname').addEventListener('input',e=>{ prefs.name=e.target.value.trim().toUpperCase().slice(0,10); save('ne.prefs',prefs);
  // Signed in is earned the moment a name goes in (v8) — it used to wait for the next finished run, which made it look impossible
  if(prefs.name&&!got().named){ const g=got(); g.named=Date.now(); save('ne.ach',g); const a=ACH.find(x=>x.id==='named'); toast('Achievement · '+a.name+' · '+unlockHtml(a),a.id); } });
$('#pname').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click', e=>{
  const b=e.target.closest('button');
  if(e.target.closest('#toast')){ const id=$('#toast').dataset.ach; if(id){ Snd.click(); $('#toast').classList.remove('on'); gotoAch(id); } return; }
  if($('#s-story').classList.contains('on')){ Story.next(); if(CHAL) setTimeout(goChallenge,250); return; }
  if($('#adbreak').classList.contains('on')){ if(b&&b.id==='adskip'&&!b.disabled) Ads.close(); return; }
  if($('#lockwrap').classList.contains('on')){ if(b&&b.id==='lock-go'){ Snd.click(); return goWhere(lockGo); } if(!e.target.closest('#lockbox')||(b&&b.id==='lock-no')){ Snd.click(); $('#lockwrap').classList.remove('on'); } return; }
  if(e.target.closest('#nextup')){ Snd.click(); if(nextWhere) goWhere(nextWhere); return; }
  if(e.target.closest('#egg')){ bumpEggTaps(); if(eggTaps>=3&&!got().egg){ const g=got(); g.egg=Date.now(); save('ne.ach',g); const a=achById('egg'); toast('Achievement · '+a.name+' · '+unlockHtml(a),a.id); } return; }
  if(!b){ if(e.target.closest('.sheet')||e.target.closest('#game')||e.target.closest('input')||e.target.closest('#wheelwrap')) return; if($('.screen.on')){ Snd.click(); back(); } return; }
  isPick(b)?Snd.select():Snd.click();
  if(b.id==='quit') return abort();
  if(b.id==='wheel-done') return Wheel.close();
  if(b.id==='seqdone') return SQ.done();
  if(b.id==='over-back') return openSheet(sel.game,GAMES[sel.game].modes.length>1?sel.diff:undefined);
  if(b.id==='share') return shareRun();
  if(b.classList.contains('back')) return back();
  if(b.dataset.go) return show(b.dataset.go);
  if(b.dataset.game){ if(b.classList.contains('locked')) return askUnlock(b.dataset.game,GAMES[b.dataset.game].modes[0]);
    sel.game=b.dataset.game; prefs.lastGame=sel.game; save('ne.prefs',prefs); applyPrefs(sel.game); $$('.tile').forEach(t=>t.classList.toggle('keep',t===b)); fillSheet();
    if(GAMES[sel.game].modes.length===1){ sel.diff=GAMES[sel.game].modes[0]; setStage('len'); fillTimes(); } else setStage('mode'); }
  if(b.dataset.diff){ if(stage==='len') return setStage('mode'); if(b.classList.contains('locked')) return askUnlock(sel.game,b.dataset.diff); sel.diff=b.dataset.diff; $$('.choice').forEach(c=>c.classList.toggle('sel',c===b));
    setStage('len'); fillTimes(); }
  if(b.id==='lvl-back') return setStage('mode');
  if(b.id==='dev-open'){ prefs.allOpen=!prefs.allOpen; save('ne.prefs',prefs); devState(); return toast(prefs.allOpen?'Everything open · modes and cosmetics':'Progression back on · only what you earned'); }
  if(b.id==='dev-sup'){ prefs.supporter=!prefs.supporter; save('ne.prefs',prefs); devState(); return toast(prefs.supporter?'Supporter ON · no ads, all cosmetics, pro length':'Free tier · ads back on'); }
  if(b.id==='dev-fresh'){ freshGame(); devState(); return toast('Fresh game · runs, unlocks, achievements and intros wiped'); }
  if(b.dataset.time){ const v=+b.dataset.time; if(b.classList.contains('locked')) return askUnlock(sel.game,sel.diff,v); sel.secs=v; $$('[data-time]').forEach(c=>c.classList.toggle('sel',c===b)); return; }
  if(b.id==='go-btn'){ if(sel.game!=='sequence') sel.practice=0; VS.reset(); return start(); }
  if(b.dataset.vs!==undefined){ sel.vs=b.dataset.vs==='0'?0:(sel.vs||1); renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':sel.vs===2?' · versus':''); renderVsArt(); if(stage==='len') fillTimes(); return; }
  if(b.dataset.vs2!==undefined){ sel.vs=+b.dataset.vs2; renderVsRow(); $('#sheet-title').textContent=GAMES[sel.game].name+(sel.vs===1?' · pass & play':' · versus'); renderVsArt(); if(stage==='len') fillTimes(); return; }
  if(b.id==='pass-go'){ return start(); }
  if(b.id==='to-games'){ VS.reset(); return show('s-pick'); }
  if(b.id==='dev-story'){ return Story.open(); }
  if(b.dataset.praclock) return toast('Locked · Practice from · 8 notes in 7 keys');
  if(b.dataset.prac!==undefined){ sel.practice=+b.dataset.prac; $$('[data-prac]').forEach(c=>c.classList.toggle('sel',c===b)); }
  if(b.id==='again'){ VS.reset(); if(sel.game!=='sequence') sel.practice=0; return start(); }
  if(b.id==='support'){ if(prefs.supporter) return toast('Already a supporter · thank you'); return toast('Purchases arrive in the app build · About → testing → supporter to try it'); }
  if(b.id==='pvlock'){ if(b.dataset.ach) gotoAch(b.dataset.ach); return; }
  // an earned achievement (v11) opens Customise at what it unlocked; a locked one still offers the run
  if(b.dataset.ach){ const a=achById(b.dataset.ach); if(!a) return; if(got()[a.id]){ if(a.g!=='all') sel.game=a.g; show('s-custom'); if(a.unlocks){ const [k,v]=a.unlocks; const grp=$('#c-'+(k==='wheel'?'sq':k)); if(grp){ grp.closest('.cgroup').scrollIntoView({block:'center',behavior:'smooth'}); const sw=grp.querySelector(`[data-v="${v}"]`); if(sw){ sw.classList.add('pvw'); setTimeout(()=>sw.classList.remove('pvw'),1800); } } } return; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') return jumpTo(a); return; }
  if(b.dataset.chip){ const [scope,key]=b.dataset.chip.split('-'); const v=b.dataset.v==='true'?true:b.dataset.v==='false'?false:isNaN(b.dataset.v)?b.dataset.v:+b.dataset.v;
    // the result screen's chips (v11): a locked mode or length cannot be picked, and the board under them follows what is picked
    if(scope==='over'){ if(key==='d'){ if(!isOpen(sel.game,v)) return askUnlock(sel.game,v); sel.diff=v; } if(key==='s'){ if(sel.vs!==2&&!lenOpen(sel.game,sel.diff,v)) return askUnlock(sel.game,sel.diff,v); sel.secs=v; } if(key==='vs'){ sel.vs=v==='f'?(sel.vs||1):v; } if(key==='vs2') sel.vs=v; if(key==='sc'){ sel.scale=v; prefs.scale=v; save('ne.prefs',prefs); Snd.scaleHear(); } sel.practice=0; renderOverChips(); renderOverTop(); return; }
    F[scope][key]=v; if(scope==='bd'){ if(key==='g'){ F.bd.d=GAMES[v].modes[0]; F.bd.s=GC(v,F.bd.d).lens[0]; } if(key==='d'){ F.bd.s=GC(F.bd.g,v).lens[0]; } renderBoard(); } if(scope==='pv') renderCustom(); if(scope==='ach') renderAch(); }
  if(b.id==='c-music-pv'){ Music.preview(F.pv.g); return; }
  const set=b.closest('[data-set]'); if(set){ const k=set.dataset.set;
    if(b.classList.contains('locked')){ const L=achById(b.dataset.lock); Object.assign(pvTry,{set:k,v:b.dataset.v,by:L.id}); renderCustom(); return toast('Locked · '+L.name); }
    pvTry.set=null; const it=(itemsOf(k)||[]).find(i=>String(i.v)===b.dataset.v); pvSeen.by=it&&it.by||null; if(b.dataset.v==='wheel') return Wheel.open(k);
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
    if(k==='snd'){ Snd.select(); setTimeout(()=>Snd.hit(),150); } }
});
// a tap during the intro does nothing at all (v8) — it used to skip, and a stray touch left people confused
document.addEventListener('pointerdown',e=>{ if(Intro.active()&&e.target.closest('#game')&&!e.target.closest('#quit')){ e.stopPropagation(); e.preventDefault(); } },true);
$$('[data-vs-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); const [pl,i]=p.dataset.vsSide.split(':').map(Number); VX.padTap(pl,i); }));
$('#vfield').addEventListener('pointerdown',e=>{ e.preventDefault(); VX.fieldTap(e); });

$$('.pad[data-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); tapAt(+p.dataset.side===G.target); }));
$('#field').addEventListener('pointerdown',e=>{ e.preventDefault(); DT.onDown(e); });
$('#hfield').addEventListener('pointerdown',e=>{ e.preventDefault(); HD.down(e); });
$('#hfield').addEventListener('pointermove',e=>{ HD.cutMove(e); });
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('#hfield').addEventListener(ev,()=>HD.up()));
$('#seq').addEventListener('pointerdown',e=>{ const k=e.target.closest('.key'); if(k){ e.preventDefault(); SQ.press(+k.dataset.k); } });
$('#gen').addEventListener('pointerdown',e=>{ e.preventDefault(); if(cur&&cur.onDown&&G.on) cur.onDown(e); });
window.addEventListener('keydown',e=>{ if(!G.on||e.repeat) return;
  if(e.key==='Escape') return abort();
  if((sel.game==='timing'||sel.game==='reaction')&&e.key===' ') cur.onDown({target:document.body,clientX:0,clientY:0});
  if(sel.game==='quick-tap'){ const m={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3}; if(e.key in m) tapAt(G.target===m[e.key]); }
  if(sel.game==='hold'&&e.key===' ') HD.down();
  if(sel.game==='sequence'&&/^[1-7]$/.test(e.key)) SQ.press(+e.key-1); });
window.addEventListener('keyup',e=>{ if(sel.game==='hold'&&e.key===' ') HD.up(); });

addEventListener('resize',size); size();
(function draw(t){ cx.clearRect(0,0,W,H); (DRAW[prefs.bg]||DRAW.stars)(t); requestAnimationFrame(draw); })(0);
