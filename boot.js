/* No Excuses — entry point. The top-level statements that start the app, in their original order, after every module has evaluated.
   Split out of index.html at build 12. Build 15 (refactor stage 1): the click dispatcher is ui/actions.js; prefs, sel and the
   challenge link come from core/. The module graph is a DAG through core → store → state → audio → progress → menu → app,
   so evaluation order no longer depends on this import list. */
import { DRAW, H, Intro, VX, W, abort, cx, size, start, tapAt } from "./app.js";
import { SCALES, Snd, ac } from "./audio.js";
import { $, $$ } from "./core.js";
import { CHAL } from "./core/platform.js";
import { sel } from "./core/state.js";
import { prefs, save } from "./core/store.js";
import { G, cur } from "./engine-core.js";
import { DT } from "./games/dots.js";
import { HD } from "./games/estimate.js";
import { SQ } from "./games/sequence.js";
import { Story, firstRun, menuIn, setMenuWasFirst } from "./menu.js";
import { ACH, got, seedSeen, seenAll, unlockHtml } from "./progress.js";
import { goChallenge, onClick } from "./ui/actions.js";
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
if(prefs.mig11){ setTimeout(()=>toast(`Build 11 · ${prefs.mig11} old Estimate / Timing / Reaction / Count run${prefs.mig11>1?'s':''} retired — the scoring changed`),1200); delete prefs.mig11; save('ne.prefs',prefs); }
document.addEventListener('pointerdown', ()=>Snd.unlock(), {once:true});
$('#pname').value=prefs.name; $('#pname').addEventListener('input',e=>{ prefs.name=e.target.value.trim().toUpperCase().slice(0,10); save('ne.prefs',prefs);
  // Signed in is earned the moment a name goes in (v8) — it used to wait for the next finished run, which made it look impossible
  if(prefs.name&&!got().named){ const g=got(); g.named=Date.now(); save('ne.ach',g); const a=ACH.find(x=>x.id==='named'); toast('Achievement · '+a.name+' · '+unlockHtml(a),a.id,'',true); } });
$('#pname').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click', onClick);
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
