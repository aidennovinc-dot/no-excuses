/* No Excuses — synthesised sound effects and the music
   Split out of index.html at build 12. Build 16 (refactor stage 2): the scales and the tracks are data in config/audio.js.
   Build 27 (v16 §1): the music module is an ARRANGEMENT PLAYER, not one hard-coded pad-and-bass. It reads `voices` off a
   track — wave, step pattern, role, bar length — and schedules exactly what the data says.
   Build 30 (v17 §B.27–§B.30): the player gained the six fields the tracks now use (`per` `form` `vol` `lv` `lpv` `lp` `q`
   `hold` `ct`), a FORM — a run gets one arc sized to it rather than a loop that restarts under the player (B.29) — a
   finish ramp that lands the last downbeat on the clock (B.28), an end cadence in the track's own key (B.30), a flow-state
   layer over the two tap games (B.27) and a duck for Sequence (B.30). Still no percussion. */

import { DUCK, DUCK_TAIL, FLOW_STEM, SCALES, SET_SECS, STEMS, TRACKS, TRACK_PICK, VERDICT_FX } from "./config/audio.js";
import { STREAK } from "./config/games.js";
import { on } from "./core/events.js";
import { sel } from "./core/state.js";
import { musicOn, prefs } from "./core/store.js";
/* ---------- sound: synthesised, tiny, quiet. The pack colours hit / miss / click; tick, go and end are the same everywhere ---------- */
// v10: iOS marks the context "interrupted" (not "suspended") when the app goes to the background, and only a resume inside a touch brings it back — so every touch checks, and so does coming back to the foreground
let ac=null; const AC=()=>{ if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } return ac; };
/* two things the music tells the effects, set below and read here. `endTune` is the key the run's track was in, so the
   end cadence lands in it instead of always in A (B.30); `duckHook` is Sequence's music ducking under its own keys. */
let endTune=null, duckHook=null;
const Snd = (()=>{
  let lastEnd=0;
  /* build 27: `dest` is a gain node to run through instead of the destination — the music's master bus, the two versus
     stems and the flow layer use it; every sound effect leaves it undefined and goes straight out.
     build 30: `o` is the per-note shaping the new tracks need — {lp, q} a lowpass, {hold} a fraction of the note to hold
     full gain for before the existing exponential release. A note with no `o` behaves exactly as it did. */
  function tone(f0,f1,ms,type,gain,at,attack,force,dest,o){ const a=AC(); if(!a||(prefs.snd==='off'&&!force)) return; const t=at||a.currentTime; const dur=Math.max(.02,ms/1000);
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
    hit(){ prefs.snd==='click' ? tone(1800,1200,25,'square',.06) : prefs.snd==='wood' ? tone(900,500,45,'triangle',.08) : prefs.snd==='sigh' ? (tone(560,190,300,'sine',.07,0,40),tone(2200,900,220,'sawtooth',.012,0,30)) : tone(700,1500,70,'sine',.07); },
    miss(){ prefs.snd==='click' ? tone(300,120,60,'square',.08) : prefs.snd==='wood' ? tone(180,90,140,'triangle',.08) : prefs.snd==='sigh' ? tone(240,50,520,'sine',.08,0,60) : tone(220,70,180,'triangle',.08); },
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
    click(k){ k=k||1; prefs.snd==='click' ? tone(1500*k,1100*k,14,'square',.03) : prefs.snd==='wood' ? tone(1000*k,600*k,22,'triangle',.05) : prefs.snd==='sigh' ? tone(700*k,380*k,60,'sine',.03) : tone(2400*k,1800*k,14,'sine',.035); },
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
    end(){ const a=AC(); if(!a) return; const t=a.currentTime; if(t-lastEnd<2) return; lastEnd=t; const k=endTune;
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
    // v13 (6.6): the counting whoosh — one voice sweeping low to high for the length of the count, so the pitch follows the fill
    whoosh(ms,f0,f1){ const a=AC(); if(!a||prefs.snd==='off') return null; const t=a.currentTime, dur=Math.max(120,ms)/1000;
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

const Music=(()=>{
  const TR=TRACKS;
  const opt=g=>(prefs.track&&prefs.track[g])||TRACK_PICK[g]||'a';
  // '<game>' -> the option this profile plays; 'menu' / 'key:roots' / an explicit '<game>:tide' are taken as given
  const pick=id=>TR[id]||TR[id+':'+opt(id)]||TR['quick-tap:held'];
  let tr=null, timer=0, next=0, bar=0, hits=[], sHits=[[],[]], fHits=[], mode='', mg=null, sg=[null,null], fg=null;
  let st=null, secs=0, stems=false, flow=false, shape=null, fin=null, duckT=0;
  function nodes(){ const a=AC(); if(!a) return null;
    if(!mg||mg.context!==a){ mg=a.createGain(); mg.gain.value=1; mg.connect(a.destination); }
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
      if(!musicOn(g)){ this.stop(); return; } const t=pick(g); run(t,g,shapeFor(t,g,d,len)); },
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
    // what B.29 asks to be reported: one row per track, the arc a known run gets and the long form's own length
    lengths(){ return Object.keys(TR).map(id=>({ id, name:TR[id].name, form:formOf(TR[id]), barSec:+barSecOf(TR[id]).toFixed(2), formSec:+(formOf(TR[id])*barSecOf(TR[id])).toFixed(1), phase:phaseOf(TR[id]), longSec:longSec(TR[id]) })); },
    // B.29: stopping cuts what is already in the air too — the bar that was scheduled a moment ago is the whole problem
    stop(){ clearInterval(timer); timer=0; cut(); tr=null; mode=''; shape=null; fin=null; duckT=0; } };
})();
duckHook=(sec,at)=>Music.duck(sec,at);

/* v16 (1.2): the menu has its own music, and it plays across the front of the app rather than only on one screen —
   stopping it to walk to the pick sheet and back would be worse than not having it. The game layer is the exception:
   a run's own track takes over there, and Music.start / Music.stop own it. The keys screen asks for its tier's loop
   itself (ui/screens/key.js) — this only sets the opening one. */
let menuT=0;
on('screen:change',({id})=>{ clearTimeout(menuT); if(id==='game') return; menuT=setTimeout(()=>Music.menu(id==='s-key'?'key:roots':'menu'),900); });

// build 18 (refactor stage 4, was in boot.js): every touch and every return to the foreground checks the context is running; the first touch unlocks it
document.addEventListener('pointerdown',()=>{ if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } },{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } });
document.addEventListener('pointerdown',()=>Snd.unlock(),{once:true});

export { AC, Music, Snd, ac };
