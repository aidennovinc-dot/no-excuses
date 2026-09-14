/* No Excuses — Testing (build 21, v14 8.10; was the [data-dev] block at the bottom of the About screen). Fresh game, open
   everything, replay the intro, supporter, and the state line under them. It is its own menu item directly below About so it
   can be reviewed on its own instead of hanging off the end of a screen about something else.

   S5 still holds: a release build has no testing anywhere. BUILD_FLAGS.dev false strips every [data-dev] node in the document
   — the menu item, this screen and anything else that ever carries the attribute — and the store already refuses to read
   `allOpen` / `supporter` out of storage, so nothing here is reachable or plantable in a release build.

   v18 (B.26, build 32): A BUTTON PER ANIMATION — key arrival, segment advance, key complete, a chest opening each — so
   Aiden can watch each one without earning it. Every button plays the REAL animation through the real screen and stores
   nothing: the arrival is asked for with `arrive`, which clears `prefs.keySeen` for that one open only; the advance is a
   fabricated `advance` object the key screen animates over whatever ring is drawn; the whole-key moment is asked for by
   name; a chest opening runs pick.js's own chestDemo, which puts the tile back afterwards.

   v23 (L.8f / G.8 extended, build 40): the switches and resets are PER CHEST — Games, Key, Pro, Thorns — and there is a "set meter to
   N%" field, so the meter can be looked at at any value without earning it. A chest's switch is what fills it: every mode for the
   Games chest (progress.js, beside the chain), a key's every bar for the other three (progress/key.js). */
import { audioClock, audioState } from "../../audio.js";
import { BUILD_FLAGS } from "../../config/build.js";
import { CHESTS } from "../../config/chests.js";
import { on } from "../../core/events.js";
import { ABOUT, GRID, TOAST } from "../../config/copy.js";
import { $, $$, T } from "../../core.js";
import { prefs, reset, save } from "../../core/store.js";
import { GAMES } from "../../games/registry.js";
import { ACH, Scores, UNLOCKS, devModesAll, devModesOn, devModesReset, got, seedSeen, unlocked } from "../../progress.js";
import { barsFaked, devChestReset, devKeyAll, devKeyOn, devSetMeter, fillBars, keyAch, meter } from "../../progress/key.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";

/* v21 (F.2, build 35, S5): THE AUDIO CONTEXT, READ OUT. Its state, how many times it has been rebuilt, and the last thing
   that happened to it — live, because the rebuild path can only be checked on a phone and this is how it gets checked:
   background the app, come back, read the line. Dev only, like everything on this screen. */
/* v22 (§J.1, build 36): AND ITS CLOCK. `state` is the value that lied — Aiden read `audio · running` with no sound — so the
   line also says how far `currentTime` moved against the wall clock since the last reading, sampled once a second while this
   screen is up, and a clock that did not move says STOPPED whatever the state says. The interval lives only while Testing
   is the screen on show; a rebuild between two samples starts the measurement again rather than comparing two clocks. */
let clockT=0, clockPrev=null, clockTxt='';
function sampleClock(){ const a=audioClock();
  if(clockPrev&&a.t!==null&&clockPrev.t!==null&&a.gen===clockPrev.gen){ const dt=a.t-clockPrev.t, wall=(a.p-clockPrev.p)/1000;
    clockTxt=T(dt>0?ABOUT.devClock:ABOUT.devClockStopped,{dt:Math.max(0,dt).toFixed(3),wall:wall.toFixed(1)}); }
  else clockTxt='';
  clockPrev=a; devAudio(); }
function devAudio(){ if(!BUILD_FLAGS.dev) return; const el=$('#dev-audio'); if(!el) return; const a=audioState();
  el.textContent=T(ABOUT.devAudio,{state:a.state,clock:clockTxt||ABOUT.devClockWait,gen:a.gen,why:(a.last?' · '+a.last:'')+(a.why&&a.why!==a.last?' · '+a.why:'')}); }
on('audio:state',devAudio);
on('screen:change',({id})=>{ if(id!=='s-testing'&&clockT){ clearInterval(clockT); clockT=0; } });
// L.8f: a chest's switch is what fills it — the chain for the Games chest, its key for the other three
const chestOf=id=>CHESTS.find(c=>c.id===id);
const chestOn=id=>{ const c=chestOf(id); return !!c&&(c.needs==='modes'?devModesOn():devKeyOn(c.needs)); };
function devState(){ if(!BUILD_FLAGS.dev) return; devAudio(); const u=Object.keys(unlocked()).length, a=Object.keys(got()).length, r=Scores.runs().length, na=ACH.length+keyAch().length;
  $('#dev-state').textContent=(prefs.allOpen?ABOUT.devOpen:T(ABOUT.devProg,{u,nu:UNLOCKS.length,a,na}))+T(ABOUT.devRuns,{r})+(prefs.supporter?ABOUT.devSup:ABOUT.devFree);
  $('#dev-open').classList.toggle('sel',!!prefs.allOpen); $('#dev-sup').classList.toggle('sel',!!prefs.supporter);
  const b=$('#dev-bars'); if(b) b.classList.toggle('sel',barsFaked());
  $$('#dev-keys [data-act="dev-chestall"]').forEach(x=>x.classList.toggle('sel',chestOn(x.dataset.chest)));
  const m=$('#dev-meter-now'); if(m) m.textContent=T(ABOUT.devMeter,{n:meter(),over:typeof prefs.devMeter==='number'?ABOUT.devMeterOver:''});
  $('#dev-meteroff').classList.toggle('sel',typeof prefs.devMeter!=='number');
  const h=$('#dev-anim-hint'); if(h) h.textContent=ABOUT.devAnim; }
// Fresh game: progress goes, the look and the name stay, and the title sequence plays again (L1)
function freshGame(){ reset(); seedSeen(); show('s-menu',{story:true}); }

// build 20 found this as a boot crash waiting to happen: the sweep must not name one screen, because [data-dev] is now on the
// menu item and this whole section as well as anything About keeps
if(!BUILD_FLAGS.dev) $$('[data-dev]').forEach(el=>el.remove());
// v22 (§J.1): the clock is sampled once a second for as long as this screen is up, starting fresh each time it opens
register('s-testing',{ onShow(){ clockPrev=null; clockTxt=''; devState(); if(BUILD_FLAGS.dev){ clearInterval(clockT); sampleClock(); clockT=setInterval(sampleClock,1000); } } });
// B.26: the first game's first combination is the segment the advance demo lights — a real key, drawn over the ring as it is
const firstKey=()=>{ const g=Object.keys(GAMES)[0]; const d=GAMES[g].modes[0]; return { g, d, key:`${g}:${d}:5`, tier:'clear', was:0, done:1, total:1 }; };
define({
  'dev-open'(){ prefs.allOpen=!prefs.allOpen; save(); devState(); toast(prefs.allOpen?TOAST.devOpenOn:TOAST.devOpenOff); return 'pick'; },
  'dev-sup'(){ prefs.supporter=!prefs.supporter; save(); devState(); toast(prefs.supporter?TOAST.supOn:TOAST.supOff); return 'pick'; },
  /* build 34 (#371): fill Pro and Author IN MEMORY so the two rings could be played before any numbers existed. BUILD 38
     (#426) put marked placeholders in config/key-bars.js, so the shipped table has nothing empty left: this fills EMPTY cells
     only — A.2 as amended forbids overwriting a number that is there, generated or not — and says so when there are none.
     No save(), the file untouched, gone on reload; the key screen says every number it derived is derived. */
  'dev-bars'(){ const was=barsFaked(), on=fillBars(!was); devState(); toast(on?TOAST.barsOn:was?TOAST.barsOff:TOAST.barsNone); return 'pick'; },
  /* v21 (G.8, build 37), PER CHEST since build 40 (L.8f): the switch fills the chest's key (or, for the Games chest, every mode) and
     remembers what it held; the reset backs the chest out entirely — for a key's chest its bars, its whole-key moment, the chest, its
     retro marks and its key achievements; for the Games chest every mode and the chest itself */
  'dev-chestall'(b){ const c=chestOf(b.dataset.chest); if(!c) return 'pick'; const name=GRID.chest[c.id];
    if(c.needs==='modes'){ const on=devModesAll(!devModesOn()); devState(); toast(on?TOAST.devModesOn:TOAST.devModesOff); return 'pick'; }
    const on=devKeyAll(c.needs,!devKeyOn(c.needs)); devState(); toast(T(on?TOAST.devKeyOn:TOAST.devKeyOff,{key:name})); return 'pick'; },
  'dev-chestreset'(b){ const c=chestOf(b.dataset.chest); if(!c) return 'pick';
    if(c.needs==='modes'){ devModesReset(); devChestReset(c.id); devState(); toast(TOAST.devModesReset); return 'pick'; }
    devChestReset(c.id); devState(); toast(T(TOAST.devKeyReset,{key:GRID.chest[c.id]})); return 'pick'; },
  // L.8f: "set meter to N%" — an override the meter reads, nothing earned; the other button takes it off
  'dev-meter'(){ const v=$('#dev-meter').value; if(v===''){ return 'pick'; } const n=devSetMeter(v); devState(); toast(T(TOAST.devMeterSet,{n})); return 'pick'; },
  'dev-meteroff'(){ devSetMeter(null); devState(); toast(TOAST.devMeterOff); return 'pick'; },
  'dev-fresh'(){ freshGame(); devState(); toast(TOAST.fresh); return 'pick'; },
  'dev-story'(){ show('s-menu',{story:true}); return 'pick'; },
  // B.26: the animations, each on its own screen, nothing stored
  'dev-keyin'(){ show('s-key',{arrive:1,from:'s-testing'}); return 'pick'; },
  'dev-seg'(){ show('s-key',{advance:firstKey(),from:'s-testing'}); return 'pick'; },
  'dev-whole'(){ show('s-key',{whole:1,from:'s-testing'}); return 'pick'; },
  'dev-chest'(b){ show('s-pick',{chestDemo:b.dataset.chest}); return 'pick'; },
});
