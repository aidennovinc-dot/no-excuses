/* No Excuses — synthesised sound effects and the music
   Split out of index.html at build 12. Build 16 (refactor stage 2): the scales and the tracks are data in config/audio.js.
   Build 27 (v16 §1): the music module is an ARRANGEMENT PLAYER, not one hard-coded pad-and-bass. It reads `voices` off a
   track — wave, step pattern, role, bar length — and schedules exactly what the data says.
   Build 30 (v17 §B.27–§B.30): the player gained the six fields the tracks now use (`per` `form` `vol` `lv` `lpv` `lp` `q`
   `hold` `ct`), a FORM — a run gets one arc sized to it rather than a loop that restarts under the player (B.29) — a
   finish ramp that lands the last downbeat on the clock (B.28), an end cadence in the track's own key (B.30), a flow-state
   layer over the two tap games (B.27) and a duck for Sequence (B.30). Still no percussion. */

import { CHEST_FX, CHEST_NOISE, CHEST_READY_FX, CHEST_STING, DUCK, DUCK_TAIL, FLOW_STEM, GIFT_FX, HUSH, KEY_EARN_FX, KEY_STEP_FX, KEY_THEMES, MAP_FX, MAP_LOCKED, POP_FX, ROUND_FX, ROUND_VERDICT, SCALES, SET_SECS, STEMS, STING_RING, TITLE_FX, TRACKS, TRACK_PICK, VERDICT_FX, VIDEO_FX, WHOOSH_VARIANTS } from "./config/audio.js";
import { STREAK } from "./config/games.js";
import { emit, on } from "./core/events.js";
import { sel } from "./core/state.js";
import { everywhere, look, musicOn, prefs } from "./core/store.js";
/* ---------- sound: synthesised, tiny, quiet. The pack colours hit / miss / click; tick, go and end are the same everywhere ---------- */
// v10: iOS marks the context "interrupted" (not "suspended") when the app goes to the background, and only a resume inside a touch brings it back — so every touch checks, and so does coming back to the foreground
/* v21 (F.2, build 35) — WHAT THAT PATH DID, READ BEFORE ANY OF THIS WAS WRITTEN: three bare `resume()` calls — here, on
   every capture-phase pointerdown, and on visibilitychange — and nothing else. None awaited the promise or looked at the
   state afterwards, nothing listened to the context's own `statechange`, and there was no way back from a context that
   will not resume: every tone after that is scheduled into a clock that never moves, which is total silence — music AND
   effects — until the app is killed. That is the report, and it is why it is the context and not the loop scheduler.
   F.2's four parts, in its order: (a) resume on foreground — visibilitychange, plus pageshow for a page restored from
   memory; (b) the context's own statechange, because iOS reports `interrupted`; (c) a resume that has not brought it
   back inside REVIVE_MS REBUILDS the context and re-points everything built on it — `rebinds`, which the music uses to
   drop its bed, stems and flow nodes and re-anchor its clock, and the end sound to forget the old clock's time; (d) the
   next tap tries again, and a tap may rebuild even a context that never ran, because a tap is the one moment iOS lets a
   new one start. NOT REPRODUCIBLE ON A DESKTOP — it needs the phone (FEATURES.md, UNVERIFIED.md). */
const REVIVE_MS=400;
/* v22 (§J.1, build 36) — THE STATE LIED. Build 35 shipped F.2 and the music still did not come back: Aiden's Testing screen
   read `audio · running` with no sound. After an interruption iOS can leave `state === 'running'` while `currentTime` has
   stopped moving, and every way into the recovery was gated on `state !== 'running'` — the tap, visibilitychange and
   pageshow call sites, and revive() itself — so not one fired, nothing was rebuilt, and every tone went into a frozen
   clock. F.2's ladder below is right and stays. What changed is that `running` is no longer taken on trust: off a tap,
   live() samples `currentTime`, waits LIVE_MS, samples again, and a clock that has not moved is rebuilt whatever the state
   says. A resume that ends `running` is checked the same way.
   THE TAP NEVER WAITS. The capture-phase pointerdown runs on every tap of every game, so it costs one flag read: only a
   context that is not running, or one marked `_suspect` — the page went hidden, a foreground check is out, a rebuilt context
   not yet seen moving — reaches revive(), and there the clock is compared against the sample already taken, synchronously.
   A stuck clock is rebuilt inside the gesture, the one moment iOS lets a new context start; a moving one clears the flag.
   No timer is ever started from a tap. */
const LIVE_MS=150;
let ac=null, acGen=0, acWhy='', acLast='', acChecks=0, acClock=null, reviving=null;
const rebinds=[];
const newCtx=()=>{ try{ return new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } };
/* S5: what Testing reads out — the state, how many times the context has been rebuilt, the last REBUILD and the last thing
   that happened. The rebuild is kept on its own: a rebuilt context reports `statechange · running` a moment later, and that
   would otherwise wipe the one line Aiden is reading for after coming back to the app.
   v22 (§J.1): `checks` is how many timed clock checks have run and `clock` is what the last one measured. */
const audioState=()=>({ state:ac?ac.state:'none', gen:acGen, why:acWhy, last:acLast, checks:acChecks, clock:acClock });
// v22 (§J.1): what Testing samples once a second — the clock itself, because the state is the value that lied
const audioClock=()=>({ t:ac?ac.currentTime:null, p:performance.now(), gen:acGen });
function told(why){ acWhy=why; emit('audio:state',audioState()); }
// v22 (§J.1): a clock sample kept on the context, and the only two conclusions the tap path may draw from it without waiting
const mark=c=>{ c._t=c.currentTime; c._p=performance.now(); };
const stuck=c=>c._p!==undefined&&performance.now()-c._p>=LIVE_MS&&c.currentTime<=c._t;
const moved=c=>c._p!==undefined&&c.currentTime>c._t;
function adopt(c,suspect){ if(!c) return null; if(c.state==='running') c._ran=1; mark(c); if(suspect) c._suspect=1;
  if(c.addEventListener) c.addEventListener('statechange',()=>{ if(c!==ac) return; if(c.state==='running'){ c._ran=1; mark(c); } told('statechange · '+c.state);
    if(c.state!=='running'&&c.state!=='closed'&&!document.hidden) revive('statechange'); });
  return c; }
const AC=()=>{ if(!ac){ ac=adopt(newCtx()); if(ac) told('created'); } if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } return ac; };
// (c): a new context, the old one closed, and everything that held a node or a time on the old one told to let go.
// v22 (§J.1): the replacement is suspect until its clock has been seen moving, so the first tap on it checks it
function rebuild(why){ const old=ac, c=newCtx(); if(!c) return false; ac=adopt(c,true); acGen++;
  try{ if(old&&old.state!=='closed') old.close(); }catch(e){}
  try{ c.resume(); }catch(e){}
  for(const f of rebinds){ try{ f(c); }catch(e){} }
  acLast='rebuilt · '+why; told(acLast); return true; }
/* v22 (§J.1): THE TIMED CHECK. Never from a tap, and at most one per context at a time. The sample it compares against is its
   own — a `statechange` re-marks the context mid-check, and measuring from that would call a moving clock stopped. */
function live(c,why){ if(c._checking) return c._checking;
  acChecks++; c._suspect=1; mark(c); const t0=c._t, p0=c._p;
  return c._checking=new Promise(done=>setTimeout(()=>{ c._checking=null;
    if(ac!==c||c.state==='closed'||document.hidden) return done(!!ac&&ac.state==='running');
    const dt=c.currentTime-t0; acClock={ dt:+dt.toFixed(3), ms:Math.round(performance.now()-p0), why };
    if(dt<=0){ rebuild(why+' · clock stopped'); return done(!!ac&&ac.state==='running'); }
    c._suspect=0; told('clock moving · '+why); done(true); },LIVE_MS)); }
/* (a) (b) (d): a resume that can tell it failed. A context that had been running and will not come back is rebuilt; one
   that never ran is only rebuilt inside a tap — outside one iOS would start the new context suspended too, and rebuilding
   it on every foreground would be a loop with nothing to show for it. It is marked `_dead` instead, and the next tap
   rebuilds it on the spot, inside the gesture. Never while the page is hidden: a backgrounded context is meant to stop.
   v22 (§J.1): a context reading `running` is no longer waved through — off a tap it goes to live(), on a tap it is read
   against its last sample with no wait. */
function revive(why,tap){ const c=ac; if(!c||c.state==='closed'||document.hidden) return Promise.resolve(!!c&&c.state==='running');
  if(c.state==='running'){ if(!tap) return live(c,why);
    if(stuck(c)){ rebuild(why+' · clock stopped'); return Promise.resolve(!!ac&&ac.state==='running'); }
    if(moved(c)) c._suspect=0;
    return Promise.resolve(true); }
  if(tap&&c._dead){ rebuild(why); return Promise.resolve(ac.state==='running'); }
  if(reviving) return reviving;
  reviving=new Promise(done=>{ let over=false;
    const end=()=>{ if(over) return; over=true; reviving=null;
      if(ac===c&&c.state!=='running'){ if(c._ran||tap) rebuild(why); else c._dead=1; return done(!!ac&&ac.state==='running'); }
      // v22 (§J.1): a resume that says `running` is not believed either — off a tap it is checked; on a tap it stays suspect
      if(ac===c&&!tap) return live(c,why).then(done);
      if(ac===c){ c._suspect=1; mark(c); }
      done(!!ac&&ac.state==='running'); };
    try{ const p=c.resume(); if(p&&p.then) p.then(()=>{ if(c.state==='running') end(); },end); }catch(e){ end(); }
    setTimeout(end,REVIVE_MS); });
  return reviving; }
/* two things the music tells the effects, set below and read here. `endTune` is the key the run's track was in, so the
   end cadence lands in it instead of always in A (B.30); `duckHook` is Sequence's music ducking under its own keys. */
let endTune=null, duckHook=null;
const Snd = (()=>{
  let lastEnd=0;
  const END_LANDS=1.06;   // Snd.end()'s last note: starts .44s in, 620ms long
  // v21 (F.2 c): the end sound's de-duplication is a time on the OLD clock; a rebuilt clock starts at zero and would mute it for as long as the old one had run
  rebinds.push(()=>{ lastEnd=-9; });
  /* build 27: `dest` is a gain node to run through instead of the destination — the music's master bus, the two versus
     stems and the flow layer use it; every sound effect leaves it undefined and goes straight out.
     build 30: `o` is the per-note shaping the new tracks need — {lp, q} a lowpass, {hold} a fraction of the note to hold
     full gain for before the existing exponential release. A note with no `o` behaves exactly as it did. */
  /* v25 (item 20, build 45): THE RECORDER. `plan(fn)` runs a sound's own code with `rec` set, and tone(), noise() and whoosh() write what they
     would have played — [at, f0, f1, ms, wave, gain, attackMs, filterHz] from the moment plan() started — instead of playing it. It is how the
     review catalogue's sound list plays EVERY sound the app makes without a second copy of any of them; the sound-pack switch does not silence
     a recording. Nothing in the app calls plan(). */
  let rec=null;
  const recAt=(a,at)=>+Math.max(0,(at||a.currentTime)-rec.t0).toFixed(3);
  function tone(f0,f1,ms,type,gain,at,attack,force,dest,o){ const a=AC(); if(!a) return; if(rec){ rec.push([recAt(a,at),f0,f1,ms,type,gain,attack||0,(o&&o.lp)||0]); return; }
    if(look('snd')==='off'&&!force) return; const t=at||a.currentTime; const dur=Math.max(.02,ms/1000);
    const osc=a.createOscillator(), g=a.createGain(); osc.type=type; osc.frequency.setValueAtTime(f0,t); osc.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    const atk=attack?Math.min(dur*.95,attack/1000):0;
    g.gain.setValueAtTime(atk?0.0001:gain,t); if(atk) g.gain.exponentialRampToValueAtTime(gain,t+atk);
    if(o&&o.hold>0) g.gain.setValueAtTime(gain,Math.max(t+atk,t+dur*o.hold));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    let n=osc; if(o&&o.lp){ const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; f.Q.value=o.q||.7; osc.connect(f); n=f; }
    n.connect(g).connect(dest||a.destination); osc.start(t); osc.stop(t+dur+.03); }
  return { unlock:AC, tone,
    // 'sigh' (v8): a breathy fall on every tap. Earned by the Grand tour. It is a joke, and it is meant to be
    // v11 loudness pass: hit ≈ .07, miss ≈ .08 in every pack, nothing above the game-end sound (.10)
    hit(){ look('snd')==='click' ? tone(1800,1200,25,'square',.06) : look('snd')==='wood' ? tone(900,500,45,'triangle',.08) : look('snd')==='sigh' ? (tone(560,190,300,'sine',.07,0,40),tone(2200,900,220,'sawtooth',.012,0,30)) : tone(700,1500,70,'sine',.07); },
    miss(){ look('snd')==='click' ? tone(300,120,60,'square',.08) : look('snd')==='wood' ? tone(180,90,140,'triangle',.08) : look('snd')==='sigh' ? (tone(520,200,520,'sine',.08,0,60),tone(1040,420,380,'sine',.012,0,50)) : tone(220,70,180,'triangle',.08); },
    /* a key rings out on its own (v5): the tone decays over `ms`, it is never cut by the key being let go.
       v17 (B.30): a ringing key DUCKS the Sequence bed. It is both halves of the complaint in one line — the game
       playing the pattern and the player copying it both come through here — and audio ducks only while a Sequence
       track is the one playing, so the scale run under a countdown elsewhere costs nothing. */
    note(i,ms,at){ const sc=SCALES[sel.scale]||SCALES.penta; const f=261.6*Math.pow(2,sc.n[i%sc.n.length]/12); tone(f,f,ms||650,'triangle',.07,at); if(duckHook) duckHook((ms||650)/1000,at); },
    // run up the scale — hearing it on select, and under the countdown
    scaleRun(step,keys,ms){ const a=AC(); if(!a) return; const sc=SCALES[sel.scale]||SCALES.penta; const n=Math.min(keys||sc.n.length,sc.n.length); for(let i=0;i<n;i++) this.note(i,ms||step*2.2,a.currentTime+i*step/1000); },
    // picking a scale (v7): slower, louder, and it comes back down so the whole shape of it is heard — ~2.3s
    scaleHear(){ const a=AC(); if(!a) return; const sc=SCALES[sel.scale]||SCALES.penta; const n=sc.n.length, step=.17; const order=[...Array(n).keys()].concat([...Array(n-1).keys()].reverse()); order.forEach((k,i)=>{ const f=261.6*Math.pow(2,sc.n[k]/12); tone(f,f,380,'triangle',.08,a.currentTime+i*step); }); },
    // sequence: "your turn" — two quick rising notes, on top of the visual (v7)
    turn(){ const a=AC(); if(!a) return; const t=a.currentTime; tone(660,660,90,'sine',.07,t); tone(990,990,160,'sine',.08,t+.09); },
    // one click family (v11): every menu tap is click(); picking an option is select() — the same tone, a step higher (×1.12)
    click(k){ k=k||1; look('snd')==='click' ? tone(1500*k,1100*k,14,'square',.03) : look('snd')==='wood' ? tone(1000*k,600*k,22,'triangle',.05) : look('snd')==='sigh' ? tone(700*k,380*k,60,'sine',.03) : tone(2400*k,1800*k,14,'sine',.035); },
    select(){ this.click(1.12); },
    tick(){ tone(880,880,70,'sine',.07); },
    go(){ tone(1320,1320,140,'sine',.08); },
    /* v16 (1.5): the end of a game. It always fired — run/run.js calls it on every finish, every game, every mode — but it
       was two notes and it got lost under the result screen arriving. It is a falling four-note cadence now, and it
       DE-DUPLICATES: the versus engines and Spot's two-player ends play it themselves so it lands with the win card,
       1.6s before the run actually finishes, and without this guard the finish played it again on top.
       v17 (B.30): IT IS IN THE TRACK'S KEY. The four notes were always 880/660/554/440 — A — whatever the run had been
       playing, which is why the finish sounded like it belonged to a different piece. The run's track leaves its root and
       its quality behind in `endTune`; the cadence transposes to it (nearest wrap, never more than a tritone), takes a
       minor third where the track's first chord is minor, and lands the tonic chord under the last note. With no track
       (`endTune` null — a run with music off, or the very first sound of a session) it is exactly the sound it was. */
    // v25 (item 20): a RECORDING is never turned away by the de-duplication — a fresh context's clock starts near zero, which reads as "played just now"
    /* v26 (§B1, build 49): HOW LONG UNTIL "END OF RUN" HAS LANDED, in ms — its four notes end 1.06s after it starts. Aiden asked whether it overlaps the
       result's own sound, and it did: the result screen comes up 250ms after the finish and played its tier straight away, over the last three notes.
       ui/screens/result.js waits this long before it plays the tier. 0 once it has landed, or if nothing has played */
    endLeft(){ const a=AC(); if(!a||lastEnd<=0) return 0; return Math.max(0,Math.round((lastEnd+END_LANDS-a.currentTime)*1000)); },
    end(){ const a=AC(); if(!a) return; const t=a.currentTime; if(!rec){ if(t-lastEnd<2) return; lastEnd=t; } const k=endTune;
      const r=k?k.r:1, third=440*(k&&k.minor?Math.pow(2,3/12):Math.pow(2,4/12));
      [[880,0,220],[660,.14,240],[third,.28,260],[440,.44,620]].forEach(([f,d,ms])=>{ tone(f*r,f*r,ms,'triangle',.10,t+d,18); });
      tone(220*r,220*r,900,'sine',.05,t+.44,60);
      if(k) k.ch.forEach(n=>tone(k.root*2*Math.pow(2,n/12),k.root*2*Math.pow(2,n/12),2600,'triangle',.014,t+.44,60,false,undefined,{lp:1800,q:.7,hold:.4})); },
    /* v16 (1.6): an UNLOCK. Audibly bigger than the achievement — a rising fifth-and-octave over a swell, where an
       achievement is a single click. The achievement sound is untouched on purpose: Aiden said it is right as it is. */
    unlockFx(){ const a=AC(); if(!a) return; const t=a.currentTime;
      [[523.3,0],[784,.10],[1046.5,.20]].forEach(([f,d])=>{ tone(f,f,520,'triangle',.085,t+d,26); tone(f*2,f*2,300,'sine',.03,t+d,20); });
      tone(130.8,261.6,760,'sine',.055,t,90); },
    /* v17 (B.25, build 29): THE VERDICT TIER'S OWN SOUND. One event list per tier in config/audio.js — the same
       [at, f0, f1, ms, wave, gain, attackMs] shape the review catalogue plays, so the page and the app cannot drift.
       Solo only, because the tier itself is solo only (L4): a two-player result is player colours and no tier.
       It plays when the result is READ, not when the run ends — Snd.end() already owns the finish. */
    verdict(id){ const a=AC(); if(!a) return; const ev=VERDICT_FX[id]; if(!ev) return; const t=a.currentTime;
      for(const [at,f0,f1,ms,w,g,am] of ev) tone(f0,f1,ms,w,g,t+at,am); },
    /* v25 (item 17, build 45): the same tier's sound on a ROUND — shorter and quieter (ROUND_VERDICT), played by games/_shared/tier.js roundShow()
       whenever a round's figure wears a tier. Solo only, like the tier (L4). An effect: it follows the tap-sound switch */
    /* v26 (§B1, build 49): AND ITS OWN NOTES — ROUND_FX, one note fewer than the result's, with bass under it — still played shorter and quieter */
    roundVerdictPlan(id){ const k=ROUND_VERDICT; return (ROUND_FX[id]||[]).map(([at,f0,f1,ms,w,g,am])=>[+(at*k.time).toFixed(3),f0,f1,Math.round(ms*k.time),w,+(g*k.gain).toFixed(4),Math.round((am||0)*k.time)]); },
    roundVerdict(id){ const a=AC(); if(!a) return; const t=a.currentTime;
      for(const [at,f0,f1,ms,w,g,am] of this.roundVerdictPlan(id)) tone(f0,f1,ms,w,g,t+at,am); },
    plan(fn){ const a=AC(); if(!a) return []; const was=rec; rec=[]; rec.t0=a.currentTime; try{ fn(); }catch(e){} const out=rec; rec=was; return out.sort((x,y)=>x[0]-y[0]); },
    /* v23 (§L.6 / §L.9c / §L.10d, build 41): THE CHESTS. `fx` plays an event list in the VERDICT_FX shape plus an optional lowpass; `noise` is
       the one noise in the app — the Author chest's cut, an effect and not a music role; `chest(id)` schedules a ceremony's effects AND its
       sting in one pass on the audio clock; `chestReady()` is the map's quiet two-note rise. None of them is unlockFx or click, and the gate
       holds all of them apart. The effects follow the tap-sound pack like every effect; the sting is MUSIC, so it follows the menu music
       switch and nothing else. `chestPlan(id)` is the same events flat — the review catalogue plays exactly what the app plays. */
    fx(ev,t0){ const a=AC(); if(!a||!ev) return; const t=t0||a.currentTime; for(const [at,f0,f1,ms,w,g,am,lp] of ev) tone(f0,f1,ms,w,g,t+at,am,false,undefined,lp?{lp}:undefined); },
    noise(at,ms,gain,hp){ const a=AC(); if(!a) return; if(rec){ rec.push([recAt(a,at),0,0,ms,'noise',gain,0,hp||800]); return; } if(look('snd')==='off') return; const t=at||a.currentTime, dur=Math.max(.02,ms/1000), n=Math.max(1,Math.ceil(a.sampleRate*dur));
      const buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
      const src=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); src.buffer=buf; f.type='highpass'; f.frequency.value=hp||800;
      g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t+dur+.02); },
    chestPlan(id){ const out=[]; for(const e of CHEST_FX[id]||[]) out.push([e[0],e[1],e[2],e[3],e[4],e[5],e[6]||0,e[7]||0,'fx']);
      for(const [at,ms,g,hp] of CHEST_NOISE[id]||[]) out.push([at,0,0,ms,'noise',g,0,hp,'fx']);
      // v24 (C.7, build 43): the sting is the theme itself, cut and resolved — stingOf() below, the key screen's own arrangement engine
      const s=CHEST_STING[id], tr=s&&TRACKS[s.track];
      if(tr) for(const e of stingOf(s,tr)) out.push(e.concat('sting'));
      return out.sort((x,y)=>x[0]-y[0]); },
    /* v24 (C.5, build 43): EARNING A KEY. `keyEarnPlan(tier)` is KEY_EARN_FX flat, [at, f0, f1, ms, wave, gain, attackMs, lowpassHz], the shape the
       review catalogue plays; `keyEarn(tier)` schedules it in one pass on the audio clock. An effect: it follows the tap-sound switch (tone()
       with force false), like unlockFx — and it is not unlockFx, click or a chest's (gated). */
    keyEarnPlan(tier){ const s=KEY_EARN_FX[tier], tr=s&&TRACKS[s.track]; if(!tr) return [];
      return s.notes.map(([at,semi,ms,w,g,am,lp])=>{ const f=+(tr.root*2*Math.pow(2,semi/12)).toFixed(2); return [at,f,f,ms,w,g,am||0,lp||0]; }).sort((x,y)=>x[0]-y[0]); },
    keyEarn(tier){ const a=AC(); if(!a) return; const t=a.currentTime+.02;
      for(const [at,f0,f1,ms,w,g,am,lp] of this.keyEarnPlan(tier)) tone(f0,f1,ms,w,g,t+at,am,false,undefined,{lp:lp||0,hold:.45}); },
    /* v27 (item 14, build 51): one sound per NAMED STEP of the key-earned animation — config/audio.js KEY_STEP_FX, played through the one fx() like
       every other effect. `keyStepPlan(name)` is the same events flat, for the review catalogue's sound list. */
    keyStepPlan(name){ return (KEY_STEP_FX[name]||[]).map(e=>e.slice()); },
    keyStep(name){ this.fx(this.keyStepPlan(name)); },
    /* v27 (item 10, build 52): the shared video player's power-on and power-off — config/audio.js VIDEO_FX, one pair for all eight clips because
       item 10 builds them into the player rather than the files. `videoPlan(k)` is the same events flat, for the review catalogue's sound list. */
    videoPlan(k){ return (VIDEO_FX[k]||[]).map(e=>e.slice()); },
    videoFx(k){ this.fx(this.videoPlan(k)); },
    chest(id){ const a=AC(); if(!a) return; const t=a.currentTime+.02, sting=musicOn('menu');
      for(const [at,f0,f1,ms,w,g,am,lp,kind] of this.chestPlan(id)){
        if(w==='noise') this.noise(t+at,ms,g,lp);
        else if(kind==='sting'){ if(sting) tone(f0,f1,ms,w,g,t+at,am,true,undefined,{lp:lp||0,hold:.55}); }
        else tone(f0,f1,ms,w,g,t+at,am,false,undefined,lp?{lp}:undefined); } },
    chestReady(){ this.fx(CHEST_READY_FX); },
    /* v25 (items 1 / 2 / 6 / 11, build 46): THE FOUR NEW FAMILIES. Each is an event list in config/audio.js played through the one tone(), so
       each follows the tap-sound switch like every other effect and each is recorded by plan() for the review catalogue's sound list (item 20).
       None of them is unlockFx, click, a chest's or a key's earn (gated).
       `titleFx(kind)` — item 1, a low whoosh under a line of the title; 'title' is the heavier one under NO EXCUSES itself.
       `mapFx(g, locked)` — item 2, one soft sound per game as its tile arrives on the map's first open, and item 11's node landing on a key
       reveal. A locked tile plays the same events down MAP_LOCKED.semi semitones and quieter, so it is recognisably the same game.
       `gift(i)` — item 6, the small sound a symbol lands with as it rises out of a chest, a step higher for each one after the first. */
    titleFx(kind){ this.fx(TITLE_FX[kind]||TITLE_FX.line); },
    mapPlan(g,locked){ const ev=MAP_FX[g]||[]; if(!locked) return ev.map(e=>e.slice());
      const r=Math.pow(2,MAP_LOCKED.semi/12); return ev.map(([at,f0,f1,ms,w,gn,am,lp])=>[at,+(f0*r).toFixed(2),+(f1*r).toFixed(2),ms,w,+(gn*MAP_LOCKED.gain).toFixed(4),am||0,lp?Math.round(lp*r):0]); },
    mapFx(g,locked,at){ this.fx(this.mapPlan(g,locked),at); },
    giftPlan(i){ const r=Math.pow(2,(GIFT_FX.step*(i||0))/12);
      return GIFT_FX.notes.map(([at,f0,f1,ms,w,g,am,lp])=>[at,+(f0*r).toFixed(2),+(f1*r).toFixed(2),ms,w,g,am||0,lp||0]); },
    gift(i){ this.fx(this.giftPlan(i)); },
    /* v26 (item 6, build 49): the small pop as a reward LEAVES the chest — POP_FX, a step higher for each one after the first. ui/reveal.js plays it at the
       start of that reward's own flight, and gift(i) at its end.
       v27 (item 6, build 51): `o` is which chest it came out of and whether the reward is a KEY. A chest with a POP_FX.by row lifts its pops (only
       `games` has one — item 12 approved the Pro chest's sounds as they are) and, inside that chest, a key reward takes POP_FX.bright on top, which
       is item 6's "the key's slightly brighter". Both are multipliers on POP_FX, so one edit there re-tunes every version. */
    popPlan(i,o){ const B=POP_FX.by&&POP_FX.by[(o&&o.chest)||'']||null, K=B&&o&&o.key?POP_FX.bright:null;
      const semi=POP_FX.step*(i||0)+(B?B.semi:0)+(K?K.semi:0), r=Math.pow(2,semi/12), gm=(B?B.gain:1)*(K?K.gain:1);
      return POP_FX.notes.map(([at,f0,f1,ms,w,g,am,lp])=>[at,+(f0*r).toFixed(2),+(f1*r).toFixed(2),ms,w,+(g*gm).toFixed(4),am||0,lp||0]); },
    pop(i,o){ this.fx(this.popPlan(i,o)); },
    // v13 (6.6): the counting whoosh — one voice sweeping low to high for the length of the count, so the pitch follows the fill
    // v25 (item 20): recorded as its two voices through one fixed lowpass — the page cannot sweep a filter, so the catalogue says it is approximate
    /* v26 (§B1, build 49): SEVEN VERY SIMILAR WHOOSHES, ONE AT RANDOM. `v` picks a WHOOSH_VARIANTS row — pitch × and length × — and without it one is drawn
       at random each time (the catalogue passes it, so each version can be heard). Presentation only: nothing a player does depends on it */
    whoosh(ms,f0,f1,v){ const a=AC(); if(!a) return null; const V=WHOOSH_VARIANTS[typeof v==='number'?v:Math.floor(Math.random()*WHOOSH_VARIANTS.length)]||[1,1];
      f0=(f0||110)*V[0]; f1=(f1||660)*V[0]; ms=Math.round(Math.max(120,ms)*V[1]);
      if(rec){ const d=Math.max(120,ms); rec.push([0,+f0.toFixed(1),+f1.toFixed(1),d,'sawtooth',.045,80,2400],[0,+(f0*2).toFixed(1),+(f1*2).toFixed(1),d,'sine',.045,80,2400]); return null; }
      if(look('snd')==='off') return null; const t=a.currentTime, dur=Math.max(120,ms)/1000;
      const o=a.createOscillator(), n=a.createOscillator(), g=a.createGain(), f=a.createBiquadFilter();
      o.type='sawtooth'; n.type='sine'; f.type='lowpass';
      o.frequency.setValueAtTime(f0||110,t); o.frequency.exponentialRampToValueAtTime(f1||660,t+dur);
      n.frequency.setValueAtTime((f0||110)*2,t); n.frequency.exponentialRampToValueAtTime((f1||660)*2,t+dur);
      f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(4200,t+dur);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(.045,t+.08); g.gain.setValueAtTime(.045,t+dur*.8); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(f); n.connect(f); f.connect(g).connect(a.destination); o.start(t); n.start(t); o.stop(t+dur); n.stop(t+dur);
      return { stop(){ try{ o.stop(); n.stop(); }catch(e){} } }; } };
})();

/* ---------- music (v16 §1, rebuilt v17 §B.28–§B.30). One player, driven by the track's own `voices`. ----------
   `bars(track, bar, hits, shape)` is PURE: it turns one bar into a list of {p, d, f, w, g, a, am, gl, lp, q, h} where p
   and d are fractions of the bar, so the same list serves the live loop (scaled by the finish ramp) and the review
   catalogue's Play button (`plan()` below). There is one arrangement engine and the catalogue carries no second copy.

   `shape` is B.29, and it is the whole of it: {fb, lb} — which bar of the WRITTEN FORM this bar is playing (chords, bass)
   and which bar the level strings are reading. A known-length run maps the form across the run once (an arc); an
   open-ended one plays the form on repeat with the level strings walking out of phase with it, which is what takes the
   repeat period past three minutes without writing three minutes of data. */
const ROLE_OCT = { pad:2, stab:2, arp:2, lead:2, bass:.5, sub:.25, drone:.5 };
const ORDER = { up:i=>i, down:(i,n)=>n-1-i%n, updown:(i,n)=>{ const m=Math.max(1,2*n-2), k=i%m; return k<n?k:m-k; } };
const LV = c => c==='x' ? 1 : (c>='1'&&c<='9') ? (+c)/10 : 0;
const lvAt = (s,b) => s ? LV(s[((b%s.length)+s.length)%s.length]) : 1;

function voiceEvents(t,v,sh,out,hit0){
  // a silent bar is silent for THIS voice only, and its hit counter does not advance — an arp picks up where it left off
  const lvl=lvAt(v.lv,sh.lb); if(lvl<=0) return hit0;
  const m=v.lpv?Math.max(.05,lvAt(v.lpv,sh.lb)):lvl, lp=v.lp?Math.max(110,v.lp*Math.pow(2,3*(m-1))):0;
  const per=t.per||1, cb=Math.floor(sh.fb/per), chord=t.ch[cb%t.ch.length], bn=t.bass[cb%t.bass.length]||0;
  const pat=v.pat||'x', steps=pat.length, add=v.add||0, sus=v.sus===undefined?.9:v.sus;
  const base=(t.root||110)*(ROLE_OCT[v.v]||2)*Math.pow(2,v.o||0)*Math.pow(2,(v.ct||0)/1200);
  let hit=hit0;
  for(let i=0;i<steps;i++){ const c=pat[i]; if(c!=='x'&&c!=='o') continue;
    const p=i/steps, d=Math.min(1.999,sus/steps), soft=c==='o'?.62:1, g=(v.g||.02)*soft*lvl*(t.vol||1);
    const push=(n,gain)=>{ const f=base*Math.pow(2,(n+add)/12); out.push({ p, d, f, f1:f*(v.gl||1), w:v.w||'triangle', g:gain, a:v.at===undefined?.06:v.at, am:v.atms||0, lp, q:v.q||.7, h:v.hold||0 }); };
    if(v.v==='pad'||v.v==='stab') chord.forEach((n,k)=>push(n,g*(k===0?(v.lead||1):1)));
    else if(v.v==='arp') push(chord[(ORDER[v.dir]||ORDER.up)(hit,chord.length)%chord.length],g);
    else if(v.v==='lead'){ const s=v.seq&&v.seq.length?v.seq[hit%v.seq.length]:0; if(s!==null&&s!==undefined) push(s,g); }
    else push(bn,g);            // bass, sub, drone
    hit++; }
  return hit;
}
// one bar of a track, as fractions of that bar. `hits` carries each voice's hit counter across bars so an arp or a
// melody spans the whole form instead of restarting every bar
function bars(t,bar,hits,sh){ const out=[]; const s=sh||{fb:bar,lb:bar}; (t.voices||[]).forEach((v,i)=>{ hits[i]=voiceEvents(t,v,s,out,hits[i]||0); }); return out; }

/* B.29 — the two lengths a track has.
   `formOf` is one written pass: `form` where the track says so, otherwise however many bars its chords take.
   `repeatBars` is how long the LONG form runs before it repeats itself exactly. The level strings are indexed by
   `bar + section×phase`, so each pass through the form reads them from a different offset; with bar = s·form + r the
   level index is s·(form+phase) + r, and the whole state comes back only after m sections, where m is the lcm over every
   string of L/gcd(L, form+phase). `phaseOf` picks the smallest phase that puts that past three minutes. A track with no
   level strings at all has nothing to walk out of phase and simply loops — the menu is the only one that does. */
const gcd=(a,b)=>b?gcd(b,a%b):a, lcm=(a,b)=>a/gcd(a,b)*b;
const formOf = t => t.form || (t.ch.length*(t.per||1));
const barSecOf = t => 60/t.bpm*(t.beats||4);
const strLens = t => { const L=[]; for(const v of t.voices||[]){ if(v.lv) L.push(v.lv.length); if(v.lpv) L.push(v.lpv.length); } return L; };
function repeatBars(t,phase){ const form=formOf(t), L=strLens(t); let m=1;
  for(const n of L) m=lcm(m,n/gcd(n,form+phase)); return form*m; }
function phaseOf(t){ const bs=barSecOf(t); if(!strLens(t).length) return 0;
  for(const p of [1,2,3,5,7,11]) if(repeatBars(t,p)*bs>=180) return p;
  return 11; }
// the long form's own length in seconds — what B.29 asks to be reported, and what the gate holds to 180s
const longSec = t => +(repeatBars(t,phaseOf(t))*barSecOf(t)).toFixed(1);

/* v24 (C.7, build 43): A CHEST'S STING, CUT FROM ITS KEY'S THEME. The theme's own bars from the first, through bars() — the one arrangement
   engine, so the sting cannot be a second copy of the track that drifts — up to `cut` seconds; `voices` narrows which of the theme's voices
   play. A note still sounding at the cut rings on STING_RING seconds and stops, and a note that would then break the theme rule (under 700 ms
   above 300 Hz, under 1200 ms above C5) is left out rather than clipped short. Then the `tail` lands the tonic on the reveal. Flat events,
   [at, f0, f1, ms, wave, gain, attackMs, lowpassHz] — chestPlan's shape. */
function stingOf(s,tr){ const barSec=barSecOf(tr), cut=s.cut||0, end=cut+STING_RING, out=[], hits=[];
  const t=s.voices?Object.assign({},tr,{voices:tr.voices.filter((v,i)=>s.voices.includes(i))}):tr;
  for(let b=0;b*barSec<cut;b++) bars(t,b,hits,{fb:b,lb:b}).forEach(e=>{ const at=b*barSec+e.p*barSec; if(at>=cut) return;
    const ms=Math.round(Math.min(e.d*barSec*1000,(end-at)*1000));
    if((e.f>=300&&ms<700)||(e.f>523.3&&ms<1200)) return;
    out.push([+at.toFixed(4),+e.f.toFixed(2),+e.f1.toFixed(2),ms,e.w,+e.g.toFixed(5),Math.round(e.am||Math.max(4,(e.a||.06)*ms)),Math.round(e.lp||0)]); });
  for(const [at,semi,ms,w,g,am,lp] of s.tail||[]){ const f=+(tr.root*2*Math.pow(2,semi/12)).toFixed(2); out.push([at,f,f,ms,w,g,am||0,lp||0]); }
  return out; }

const Music=(()=>{
  const TR=TRACKS;
  // v23 (L.11a, build 40): a chosen track is a Customise choice — until the Games chest opens, look('track') is empty and the default plays
  const opt=g=>(look('track')&&look('track')[g])||TRACK_PICK[g]||'a';
  // '<game>' -> the option this profile plays; 'menu' / 'key:roots' / an explicit '<game>:tide' are taken as given
  const pick=id=>TR[id]||TR[id+':'+opt(id)]||TR['quick-tap:held'];
  /* v23 (L.7d, build 42): WHAT A RUN PLAYS. A key theme set to play everywhere (core/store.js everywhere() — 'game' while its chest is shut)
     is every game's run track; otherwise the game's own. It is resolved HERE, once, before shapeFor — so a theme gets every run-music rule
     a game's track gets and not one of those rules had to learn what a theme is: the arc sized to a Set or a clock (B.29), the last five
     seconds landing on the finish (B.28), the versus stems (1.4), the flow hum on solo Quick Tap and Dots (B.27), Sequence's duck (B.30)
     and the end cadence in its key. The menu loop does not read it (guess, L.7d). */
  const pickRun=g=>{ const th=KEY_THEMES[everywhere()]; return (th&&TR[th])||pick(g); };
  let tr=null, timer=0, next=0, bar=0, hits=[], sHits=[[],[]], fHits=[], mode='', mg=null, sg=[null,null], fg=null;
  let st=null, secs=0, stems=false, flow=false, shape=null, fin=null, duckT=0, hushed=false;
  /* v21 (F.2 c): A REBUILT CONTEXT STRANDS EVERYTHING BUILT ON THE OLD ONE. The bed, the two stems and the flow layer are
     gain nodes of a context that is now closed, and `next` is a time on its clock — the loop would schedule nothing until
     the new clock caught up with where the old one had got to. Drop the nodes (nodes() builds all four again on the next
     tick, on the new context, which is the re-point) and re-anchor the clock where the new one is. The track, its bar and
     its form carry on from where they were. */
  rebinds.push(c=>{ mg=null; sg=[null,null]; fg=null; duckT=0; if(tr){ next=c.currentTime+.05; fin=null; } });
  function nodes(){ const a=AC(); if(!a) return null;
    if(!mg||mg.context!==a){ mg=a.createGain(); mg.gain.value=hushed?0:1; mg.connect(a.destination); }
    if(!sg[0]||sg[0].context!==a){ sg=[0,1].map(()=>{ const g=a.createGain(); g.gain.value=0; g.connect(a.destination); return g; });
      fg=a.createGain(); fg.gain.value=0; fg.connect(a.destination); } return a; }
  /* v18 (B.29) — SILENCE IS NOT THE SAME AS "STOP SCHEDULING", and that is the whole of the bug. `loop()` schedules a
     bar of notes at a time into the audio clock, so clearing the interval leaves up to a full bar of the outgoing track
     already started and unstoppable — which is exactly what Aiden heard when a preview opened over the menu loop:
     "both playing gets confusing". A started oscillator cannot be unscheduled, so the bed's gain node is RETIRED
     instead — ramped to nothing over CUT and dropped — and every note still hanging off it goes quiet with it. The
     stems and the flow layer ride their own nodes and are retired in the same breath, so nothing of the old track is
     left anywhere. Called wherever one track replaces another, which makes it structural: the preview, the menu loop
     and a run's own track can never overlap again, not only on the screen the note was filed against. */
  const CUT=.05;
  function cut(){ const a=ac; const old=[mg,sg[0],sg[1],fg].filter(Boolean); mg=null; sg=[null,null]; fg=null;
    for(const n of old){ try{ if(a){ n.gain.cancelScheduledValues(a.currentTime); n.gain.setTargetAtTime(0,a.currentTime,CUT); } }catch(e){}
      setTimeout(()=>{ try{ n.disconnect(); }catch(e){} },700); } }
  /* v14 (4.15 / 10.2): a versus run hands its closeness up as st.tension, and the track tightens with it. Past .6 it swaps bed
     — a fifth up and faster — so the last stretch of a close versus sounds like a different piece of music.
     v16 (1.5, A.1): `st.fin` is 0..1, "how far into the finish this run is", set by run/run.js from the engine's own fin()
     on a round-based run — the final round of a Set, or a Streak budget past 80%. MUSIC ONLY: no gameplay speeds up.
     v17 (B.28): a TIMED run no longer reads this at all. It has a clock, so it gets the exact landing below instead of a
     window guess, and Sequence gets neither — it has nothing to count down to and B.28 says so out loud. */
  function tense(){ const t=st&&st.tension?st.tension:0, f=st&&st.fin?st.fin:0; return Math.max(1+.45*t,1+.7*f); }
  /* B.28 — THE LAST FIVE SECONDS. On a run with a clock the bars shrink geometrically from the first bar line inside the
     window so that the final bar ENDS exactly on the clock, and the cadence lands on the finish rather than near it.
     The map is built once, at that bar line: n bars, each `q` of the one before, scaled to fill exactly what is left. */
  const WIN=5;
  function finPlan(rem,nom){ const n=Math.max(1,Math.round(rem/nom*1.18)), q=Math.pow(1/1.5,1/Math.max(1,n));
    let sum=0; for(let i=0;i<n;i++) sum+=Math.pow(q,i); return { n, q, s:rem/sum, k:0 }; }
  // the clock's end in audio time. st.end is performance.now() based, so the two clocks are lined up every time it is asked
  const endAudio=a=>a.currentTime+(st.end-performance.now())/1000;
  function barSecNow(a){ const nom=barSecOf(tr)/tense();
    if(!st||!st.on||!st.live||!st.end) return nom;
    const rem=endAudio(a)-next;
    // the last bar of the plan ENDS on the clock, so there is nothing after it to schedule
    if(fin) return fin.k>=fin.n ? 0 : Math.max(.08,fin.s*Math.pow(fin.q,fin.k++));
    if(rem>0&&rem<=WIN){ fin=finPlan(rem,nom); fin.k=1; return Math.max(.08,fin.s); }
    return nom; }
  /* B.29 — WHAT MAKES A RUN'S MUSIC ONE ARC RATHER THAN A LOOP. Two things, and neither of them touches the chords:
     the chord progression always advances exactly as written (`fb` is the bar itself), because stretching a four-chord
     loop over thirty seconds or stepping through it two chords at a time is not an arrangement, it is a mangled one.
     What IS mapped across the run is the arrangement — each track's per-bar level strings play their whole written pass
     once, start to finish, so a track that builds and thins does it over this run's length — and a run-shaped envelope
     underneath, so every track opens quieter and is at full by the time the run is two thirds done. An open-ended run
     gets neither: the level strings walk out of phase with the form instead, which is what takes the repeat past three
     minutes. `u` is how far through the run this bar is, and it is the whole of the difference. */
  function shapeAt(b){ const form=formOf(tr);
    if(shape&&shape.arc){ const u=Math.max(0,Math.min(.9999,(b-shape.b0)/Math.max(1,shape.bars))); return { fb:b, lb:Math.floor(u*form), u }; }
    const s=Math.floor(b/form); return { fb:b, lb:b+s*((shape&&shape.p)||0) }; }
  const arcEnv=sh=>sh.u===undefined?1:.55+.45*Math.min(1,sh.u/.6);
  function arcFrom(b,runSec){ shape={ arc:1, b0:b, bars:Math.max(1,runSec/barSecOf(tr)) }; }
  function schedule(t,at,barSec,vol,dest,h,sh){ bars(t,bar,h,sh).forEach(e=>{ const ms=e.d*barSec*1000;
      Snd.tone(e.f,e.f1,ms,e.w,e.g*vol,at+e.p*barSec,e.am||Math.max(4,(e.a||.06)*ms),true,dest,{lp:e.lp,q:e.q,hold:e.h}); }); }
  function loop(){ const a=nodes(); if(!a||!tr) return;
    // the arc is re-anchored the moment the clock starts, so it spans the run and not the run plus its countdown
    if(shape&&shape.arc&&!shape.livened&&st&&st.live&&secs>0){ arcFrom(bar,secs); shape.livened=1; }
    while(next<a.currentTime+.25){ const barSec=barSecNow(a); if(!barSec) break;
      const sh=shapeAt(bar), r=tense(), vol=arcEnv(sh)*(fin||r>1?1.35:1)*(st&&st.on&&!st.live?.25:1);
      schedule(tr,next,barSec,vol,mg,hits,sh);
      /* v16 (1.4): the two versus stems. Same track, so the same root, tempo and bar — only the voicing is the stem's own,
         and each rides its own gain node whose level follows that player's proximity to winning (st.vsP). Presentation only (L10). */
      if(stems) for(const p of [0,1]){ const want=Math.max(0,Math.min(1,(st&&st.vsP&&st.vsP[p])||0));
        try{ sg[p].gain.setTargetAtTime(want*want,a.currentTime,.25); }catch(e){ sg[p].gain.value=want*want; }
        schedule(Object.assign({},tr,STEMS[p]),next,barSec,vol,sg[p],sHits[p],sh); }
      /* B.27: the flow layer, over the music and never instead of it. Same track, so the same chords; its own gain node,
         whose level is the run's own smoothed taps-per-second reading (run/run.js owns the smoothing, and the edge glow
         reads the same number). Solo Quick Tap and Dots only — the glow is P2's light blue (L4). */
      if(flow){ const want=Math.max(0,Math.min(1,(st&&st.flow)||0));
        try{ fg.gain.setTargetAtTime(want,a.currentTime,.12); }catch(e){ fg.gain.value=want; }
        schedule(Object.assign({},tr,FLOW_STEM),next,barSec,vol,fg,fHits,sh); }
      next+=barSec; bar++; } }
  // B.29: a track that replaces another cuts it first — nodes() then builds the incoming track its own clean bed
  function run(t,id,sh){ if(tr) cut(); const a=nodes(); if(!a) return; tr=t; mode=id; bar=0; hits=[]; sHits=[[],[]]; fHits=[]; shape=sh||null; fin=null;
    endTune=keyOf(t); next=a.currentTime+.05; clearInterval(timer); timer=setInterval(loop,80); loop(); }
  // what the end cadence needs to land in this track's key: the nearest transposition, and whether the track is minor
  function keyOf(t){ const semi=Math.round(12*Math.log2(t.root/110)), wrap=((semi%12)+18)%12-6;
    return { r:Math.pow(2,wrap/12), root:t.root, minor:(t.ch[0]||[]).some(n=>((n%12)+12)%12===3), ch:t.ch[0]||[] }; }
  /* B.29 — what shape a run gets. A length in seconds IS the run (Quick Tap, Dots), and a Set's expected length is one
     row in SET_SECS; either way the form is mapped across it once. A Streak has no expected length and neither does
     Sequence, so they get the long form: the same written pass with its level strings walking out of phase with it. */
  function shapeFor(t,g,d,len){ const known=len>0&&len!==STREAK?len:(d?SET_SECS[g+':'+d]:0);
    if(!known) return { p:phaseOf(t) };
    // the countdown is not the run, but the music is already playing under it — the anchor is re-set when the clock starts
    return { arc:1, b0:0, bars:Math.max(1,(known+3)/barSecOf(t)) }; }
  return {
    start(g,state,len,d){ st=state||null; secs=(len>0&&len!==STREAK)?len:0; stems=sel.vs===2;
      flow=!sel.vs&&(g==='quick-tap'||g==='dots');
      if(!musicOn(g)){ this.stop(); return; } const t=pickRun(g); run(t,g,shapeFor(t,g,d,len)); },
    /* v16 (1.2 / 1.3): the front of the app has music too — one menu loop, and one per key tier. Called from the screen
       change below and from ui/screens/key.js when a tier is selected. Idempotent: asking for the loop that is already
       playing does nothing, so moving between menu screens never restarts it. */
    menu(id){ if(mode===id&&tr) return; st=null; secs=0; stems=false; flow=false; if(!musicOn('menu')){ this.stop(); return; } const t=TR[id]; if(!t) return; run(t,id,{p:phaseOf(t)}); },
    // preview one track on its own — Customise (12.1 / B.32), and the option a game is set to play
    // a preview ends by handing the menu loop back — walking away from Customise into silence would be worse than not previewing
    preview(g,ms,o){ st=null; stems=false; flow=false; const t=o?(TR[g+':'+o]||TR[o]||pick(g)):pick(g); run(t,'preview',{p:phaseOf(t)}); setTimeout(()=>{ if(mode==='preview'){ this.stop(); this.menu('menu'); } },ms||4200); },
    /* B.30 — Sequence ducks while a key rings. The bed drops to DUCK and comes back over the note plus DUCK_TAIL; the
       hook is only armed while a Sequence track is playing, so nothing else in the app pays for it. */
    duck(sec,at){ const a=ac; if(!a||!mg||mode!=='sequence') return; const t0=Math.max(a.currentTime,at||a.currentTime), back=t0+sec+DUCK_TAIL;
      if(back<=duckT) return; duckT=back;
      try{ mg.gain.cancelScheduledValues(t0); mg.gain.setTargetAtTime(DUCK,t0,.06); mg.gain.setTargetAtTime(1,back,.25); }catch(e){} },
    /* v23 (§L.6, build 41): a chest ceremony HUSHES the music fully and its tap brings it back. A flag as well as a ramp, because the key
       screen can ask for a different loop mid-ceremony and a bed built while hushed has to start silent (nodes()). No stem or flow layer
       plays on the key screen, so the bed is the whole of it. */
    hush(on){ hushed=!!on; const a=ac; if(!a||!mg) return;
      try{ mg.gain.cancelScheduledValues(a.currentTime); mg.gain.setTargetAtTime(hushed?0:1,a.currentTime,hushed?HUSH.down:HUSH.up); }catch(e){ mg.gain.value=hushed?0:1; } },
    /* the review catalogue's Play button (v16 §1.1). One pass of a track as a flat list of tone events —
       [t, freq, freqEnd, ms, wave, gain, attackMs, lowpassHz, q, hold] — so the page plays exactly what the app plays and
       there is no second copy of the arrangement engine to drift. `o` picks which version (B.29 / B.27):
       {} the written form · {run:<seconds>} the arc a run of that length gets · {long:1} the open-ended form · {flow:1}
       the flow layer over that track. */
    plan(id,o){ o=o||{}; let t=TR[id]||TR[id+':'+opt(id)]; if(!t) return null;
      if(o.flow) t=Object.assign({},t,FLOW_STEM);
      const form=formOf(t), barSec=barSecOf(t), h=[], out=[]; let n=form, sh=b=>({fb:b,lb:b}), env=()=>1;
      if(o.run){ n=Math.max(1,Math.round(o.run/barSec)); sh=b=>({ fb:b, lb:Math.floor(Math.min(.9999,b/n)*form), u:b/n }); env=b=>.55+.45*Math.min(1,(b/n)/.6); }
      else if(o.long){ const p=phaseOf(t); n=Math.min(repeatBars(t,p),Math.max(form,Math.ceil(75/barSec))); sh=b=>({ fb:b, lb:b+Math.floor(b/form)*p }); }
      if(o.bars) n=o.bars;
      for(let b=0;b<n;b++) bars(t,b,h,sh(b)).forEach(e=>{ const ms=e.d*barSec*1000;
        out.push([+(b*barSec+e.p*barSec).toFixed(4),+e.f.toFixed(2),+e.f1.toFixed(2),Math.round(ms),e.w,+(e.g*env(b)).toFixed(5),Math.round(e.am||Math.max(4,(e.a||.06)*ms)),Math.round(e.lp||0),+(e.q||.7).toFixed(2),+(e.h||0).toFixed(2)]); });
      return { id, name:t.name||id, bpm:t.bpm, root:t.root, beats:t.beats||4, bars:n, form, loopSec:+(n*barSec).toFixed(3), longSec:longSec(t), plan:out }; },
    tracks(){ return Object.keys(TR); },
    // v21 (F.2): what the gate reads after a rebuild — is the bed on the live context, and is the clock anchored to it
    // v23 (L.7d, build 42): and which track is playing, and which run-music rules it is under — what the gate reads for a key theme in a run
    probe(){ return { bed:!!mg&&mg.context===ac, playing:!!tr, next, now:ac?ac.currentTime:0, hushed, track:tr?Object.keys(TR).find(k=>TR[k]===tr)||'':'',
      arc:!!(shape&&shape.arc), arcBars:shape&&shape.arc?+shape.bars.toFixed(2):0, stems, flow, fin:!!fin }; },
    // what B.29 asks to be reported: one row per track, the arc a known run gets and the long form's own length
    lengths(){ return Object.keys(TR).map(id=>({ id, name:TR[id].name, form:formOf(TR[id]), barSec:+barSecOf(TR[id]).toFixed(2), formSec:+(formOf(TR[id])*barSecOf(TR[id])).toFixed(1), phase:phaseOf(TR[id]), longSec:longSec(TR[id]) })); },
    // B.29: stopping cuts what is already in the air too — the bar that was scheduled a moment ago is the whole problem
    stop(){ clearInterval(timer); timer=0; cut(); tr=null; mode=''; shape=null; fin=null; duckT=0; } };
})();
duckHook=(sec,at)=>Music.duck(sec,at);

/* v16 (1.2): the menu has its own music, and it plays across the front of the app rather than only on one screen —
   stopping it to walk to the pick sheet and back would be worse than not having it. The game layer is the exception:
   a run's own track takes over there, and Music.start / Music.stop own it. The keys screen asks for its tier's loop
   itself (ui/screens/key.js) — this only sets the opening one.
   BUILD 42 (L.7b): THE KEY SCREEN IS LEFT TO key.js ENTIRELY. The router emits screen:change BEFORE a screen's onShow, so key.js asked for
   its key's loop and then this timer asked for 'key:roots' 900ms later whatever was on screen — arriving on the Pro or Author tab (a chest
   word, a key interlude) swapped its loop for Roots within a second, since build 30. With a key's theme now silent until its chest opens,
   key.js is the one thing that may choose what plays there. */
let menuT=0;
on('screen:change',({id})=>{ clearTimeout(menuT); if(id==='game'||id==='s-key') return; menuT=setTimeout(()=>Music.menu('menu'),900); });

// build 18 (refactor stage 4, was in boot.js): every touch and every return to the foreground checks the context is running; the first touch unlocks it
// v21 (F.2): all three now go through revive(), the resume that can tell it failed — (d) the tap, (a) the foreground and a page restored from memory
/* v22 (§J.1, build 36): THE STATE GATE IS OFF THE FOREGROUND PATHS — a context reading `running` is exactly the one that
   lied, so visibilitychange and pageshow hand every return to revive() and revive() decides. Going hidden marks the context
   suspect and samples its clock, so a tap after returning is checked even if no foreground event arrives. The TAP keeps a
   gate, because it runs on every tap of every game: only a context that is not running, or one marked suspect, is looked
   at, and revive() never waits on a tap. */
document.addEventListener('pointerdown',()=>{ if(ac&&(ac.state!=='running'||ac._suspect)) revive('tap',true); },{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{ if(!ac) return; if(document.hidden){ ac._suspect=1; mark(ac); return; } revive('foreground'); });
addEventListener('pagehide',()=>{ if(ac){ ac._suspect=1; mark(ac); } });
addEventListener('pageshow',()=>{ if(ac) revive('pageshow'); });
document.addEventListener('pointerdown',()=>Snd.unlock(),{once:true});

export { AC, Music, Snd, ac, audioClock, audioState, rebuild, revive };
