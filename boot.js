/* No Excuses — entry point. The top-level statements that start the app, in their original order, after every module has evaluated.
   Split out of index.html at build 12. Build 15 (refactor stage 1): the click dispatcher is ui/actions.js; prefs, sel and the
   challenge link come from core/. Build 17 (refactor stage 3): every tap on the game screen goes to run/run.js as one input
   event — the engine behind it is never named here. The old loop in app.js still takes the engines not yet ported. */
import { Intro, abort, tapAt } from "./app.js";
import { Snd, ac } from "./audio.js";
import { SCALES } from "./config/audio.js";
import { TOAST } from "./config/copy.js";
import { $, $$, T } from "./core.js";
import { CHAL } from "./core/platform.js";
import { sel } from "./core/state.js";
import { prefs, save } from "./core/store.js";
import { G, cur } from "./engine-core.js";
import { DT } from "./games/dots/index.js";
import { HD } from "./games/estimate/index.js";
import { SQ } from "./games/sequence/index.js";
import { Story, firstRun, menuIn, setMenuWasFirst } from "./menu.js";
import { ACH, got, seedSeen, seenAll, unlockHtml } from "./progress.js";
import * as Run from "./run/run.js";
import { goChallenge, onClick } from "./ui/actions.js";
import { startAtmosphere } from "./ui/atmosphere.js";
import { toast } from "./ui/toast.js";
document.addEventListener('pointerdown',()=>{ if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } },{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } });
// v7: nothing is force-open any more. Cosmetics and modes both follow the one "open everything" switch on the About screen
delete prefs.pack;
// build 14 (S3): a scale that is not in SCALES falls back to penta. SCALES evaluates after menu.js, so the check lives here, not beside prefs
if(!SCALES[prefs.scale]){ prefs.scale='penta'; sel.scale='penta'; save('ne.prefs',prefs); }
setMenuWasFirst(firstRun());
// v13 (2.1): everything already open on this profile counts as seen, so nothing flashes green on day one
if(!seenAll()) seedSeen();
// v13 (3.6): a challenge link waits for the title sequence, then opens its pick sheet
if(!prefs.story) Story.open(); else { menuIn(); if(CHAL) setTimeout(goChallenge,300); }
if(prefs.mig11){ const n=prefs.mig11; setTimeout(()=>toast(T(TOAST.mig11,{n,s:n>1?'s':''})),1200); delete prefs.mig11; save('ne.prefs',prefs); }
document.addEventListener('pointerdown', ()=>Snd.unlock(), {once:true});
$('#pname').value=prefs.name; $('#pname').addEventListener('input',e=>{ prefs.name=e.target.value.trim().toUpperCase().slice(0,10); save('ne.prefs',prefs);
  // Signed in is earned the moment a name goes in (v8) — it used to wait for the next finished run, which made it look impossible
  if(prefs.name&&!got().named){ const g=got(); g.named=Date.now(); save('ne.ach',g); const a=ACH.find(x=>x.id==='named'); toast(T(TOAST.achievement,{name:a.name})+' · '+unlockHtml(a),a.id,'',true); } });
$('#pname').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click', onClick);
// a tap during the intro does nothing at all (v8) — it used to skip, and a stray touch left people confused
document.addEventListener('pointerdown',e=>{ if((Run.introActive()||Intro.active())&&e.target.closest('#game')&&!e.target.closest('#quit')){ e.stopPropagation(); e.preventDefault(); } },true);

/* ---------- the game screen: every pointer event becomes one input for the run. build 17 transition: an engine still on the old loop gets its old call ---------- */
const inp=(ev,old)=>{ if(Run.active()) Run.input(ev); else if(old) old(); };
const ptr=(e,type,more)=>Object.assign({ type, x:e.clientX, y:e.clientY, el:e.target, raw:e },more);
$$('[data-vs-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); const [pl,i]=p.dataset.vsSide.split(':').map(Number); inp(ptr(e,'down',{player:pl,target:i})); }));
$('#vfield').addEventListener('pointerdown',e=>{ e.preventDefault(); inp(ptr(e,'down')); });
$$('.pad[data-side]').forEach(p=>p.addEventListener('pointerdown',e=>{ e.preventDefault(); inp(ptr(e,'down',{target:+p.dataset.side}),()=>tapAt(+p.dataset.side===G.target)); }));
$('#field').addEventListener('pointerdown',e=>{ e.preventDefault(); inp(ptr(e,'down'),()=>DT.onDown(e)); });
$('#hfield').addEventListener('pointerdown',e=>{ e.preventDefault(); inp(ptr(e,'down'),()=>HD.down(e)); });
$('#hfield').addEventListener('pointermove',e=>{ inp(ptr(e,'move'),()=>HD.cutMove(e)); });
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('#hfield').addEventListener(ev,e=>inp(ptr(e,'up'),()=>HD.up())));
$('#seq').addEventListener('pointerdown',e=>{ const k=e.target.closest('.key'); if(k){ e.preventDefault(); inp(ptr(e,'down',{target:+k.dataset.k}),()=>SQ.press(+k.dataset.k)); } });
$('#gen').addEventListener('pointerdown',e=>{ e.preventDefault(); inp(ptr(e,'down'),()=>{ if(cur&&cur.onDown&&G.on) cur.onDown(e); }); });
// the keyboard, for the desk: Escape quits; space is the tap in Timing, Reaction and Estimate; arrows are Quick Tap's pads; 1–7 are Sequence's keys
window.addEventListener('keydown',e=>{ if(!(Run.active()||G.on)||e.repeat) return;
  if(e.key==='Escape') return abort();
  const key={ type:'down', x:0, y:0, el:document.body };
  if((sel.game==='timing'||sel.game==='reaction')&&e.key===' ') inp(key,()=>cur.onDown({target:document.body,clientX:0,clientY:0}));
  if(sel.game==='quick-tap'){ const m={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3}; if(e.key in m) inp({...key,target:m[e.key]},()=>tapAt(G.target===m[e.key])); }
  if(sel.game==='hold'&&e.key===' ') inp(key,()=>HD.down());
  if(sel.game==='sequence'&&/^[1-7]$/.test(e.key)) inp({...key,target:+e.key-1},()=>SQ.press(+e.key-1)); });
window.addEventListener('keyup',e=>{ if(sel.game==='hold'&&e.key===' ') inp({ type:'up', x:0, y:0, el:document.body },()=>HD.up()); });

startAtmosphere();
