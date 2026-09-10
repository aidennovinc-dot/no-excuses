/* No Excuses — synthesised sound effects and the music
   Split out of index.html at build 12. Build 16 (refactor stage 2): the scales and the tracks are data in config/audio.js.
   Build 27 (v16 §1): the music module is an ARRANGEMENT PLAYER, not one hard-coded pad-and-bass. It reads `voices` off a
   track — wave, step pattern, role, bar length — and schedules exactly what the data says, so three options for a game
   can share a root and a tempo and still be different pieces of music. Three per game, plus a menu loop, a loop per key
   tier, and a per-player stem for versus. Still no percussion: a drum is indistinguishable from a tap. */

import { STEMS, SCALES, TRACKS, TRACK_PICK } from "./config/audio.js";
import { on } from "./core/events.js";
import { sel } from "./core/state.js";
import { musicOn, prefs } from "./core/store.js";
/* ---------- sound: synthesised, tiny, quiet. The pack colours hit / miss / click; tick, go and end are the same everywhere ---------- */
// v10: iOS marks the context "interrupted" (not "suspended") when the app goes to the background, and only a resume inside a touch brings it back — so every touch checks, and so does coming back to the foreground
let ac=null; const AC=()=>{ if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } return ac; };
const Snd = (()=>{
  let lastEnd=0;
  // build 27: `dest` is the last argument — a gain node to run through instead of the destination. The music uses it for
  // the master bus and for the two versus stems; every sound effect leaves it undefined and goes straight out
  function tone(f0,f1,ms,type,gain,at,attack,force,dest){ const a=AC(); if(!a||(prefs.snd==='off'&&!force)) return; const t=at||a.currentTime; const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+ms/1000); g.gain.setValueAtTime(attack?0.0001:gain,t); if(attack) g.gain.exponentialRampToValueAtTime(gain,t+attack/1000); g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000); o.connect(g).connect(dest||a.destination); o.start(t); o.stop(t+ms/1000); }
  return { unlock:AC, tone,
    // 'sigh' (v8): a breathy fall on every tap. Earned by the Grand tour. It is a joke, and it is meant to be
    // v11 loudness pass: hit ≈ .07, miss ≈ .08 in every pack, nothing above the game-end sound (.10)
    hit(){ prefs.snd==='click' ? tone(1800,1200,25,'square',.06) : prefs.snd==='wood' ? tone(900,500,45,'triangle',.08) : prefs.snd==='sigh' ? (tone(560,190,300,'sine',.07,0,40),tone(2200,900,220,'sawtooth',.012,0,30)) : tone(700,1500,70,'sine',.07); },
    miss(){ prefs.snd==='click' ? tone(300,120,60,'square',.08) : prefs.snd==='wood' ? tone(180,90,140,'triangle',.08) : prefs.snd==='sigh' ? tone(240,50,520,'sine',.08,0,60) : tone(220,70,180,'triangle',.08); },
    // a key rings out on its own (v5): the tone decays over `ms`, it is never cut by the key being let go
    note(i,ms,at){ const sc=SCALES[sel.scale]||SCALES.penta; const f=261.6*Math.pow(2,sc.n[i%sc.n.length]/12); tone(f,f,ms||650,'triangle',.07,at); },
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
       1.6s before the run actually finishes, and without this guard the finish played it again on top. */
    end(){ const a=AC(); if(!a) return; const t=a.currentTime; if(t-lastEnd<2) return; lastEnd=t;
      [[880,0,220],[660,.14,240],[554,.28,260],[440,.44,620]].forEach(([f,d,ms])=>{ tone(f,f,ms,'triangle',.10,t+d,18); });
      tone(220,220,900,'sine',.05,t+.44,60); },
    /* v16 (1.6): an UNLOCK. Audibly bigger than the achievement — a rising fifth-and-octave over a swell, where an
       achievement is a single click. The achievement sound is untouched on purpose: Aiden said it is right as it is. */
    unlockFx(){ const a=AC(); if(!a) return; const t=a.currentTime;
      [[523.3,0],[784,.10],[1046.5,.20]].forEach(([f,d])=>{ tone(f,f,520,'triangle',.085,t+d,26); tone(f*2,f*2,300,'sine',.03,t+d,20); });
      tone(130.8,261.6,760,'sine',.055,t,90); },
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

/* ---------- music (v16 §1). One player, driven by the track's own `voices`. ----------
   `bars(track, bar)` is PURE: it turns one bar into a list of {p, d, f, w, g, a, am, gl} where p and d are fractions of
   the bar, so the same list serves the live loop (scaled by the finish ramp) and the review catalogue's Play button
   (`plan()` below). There is one arrangement engine and the catalogue does not carry a second copy of it. */
const ROLE_OCT = { pad:2, stab:2, arp:2, lead:2, bass:.5, sub:.25, drone:.5 };
const ORDER = { up:i=>i, down:(i,n)=>n-1-i%n, updown:(i,n)=>{ const m=Math.max(1,2*n-2), k=i%m; return k<n?k:m-k; } };

function voiceEvents(t,v,bar,out,hit0){
  const pat=v.pat||'x', steps=pat.length, ci=bar%t.ch.length, chord=t.ch[ci], bn=t.bass[bar%t.bass.length]||0;
  const base=(t.root||110)*(ROLE_OCT[v.v]||2)*Math.pow(2,v.o||0), sus=v.sus===undefined?.9:v.sus, add=v.add||0;
  let hit=hit0;
  for(let i=0;i<steps;i++){ const c=pat[i]; if(c!=='x'&&c!=='o') continue;
    const p=i/steps, d=Math.min(1.999,sus/steps), soft=c==='o'?.62:1, g=(v.g||.02)*soft;
    const push=(n,gain)=>{ const f=base*Math.pow(2,(n+add)/12); out.push({ p, d, f, f1:f*(v.gl||1), w:v.w||'triangle', g:gain, a:v.at===undefined?.06:v.at, am:v.atms||0 }); };
    if(v.v==='pad'||v.v==='stab') chord.forEach((n,k)=>push(n,g*(k===0?(v.lead||1):1)));
    else if(v.v==='arp') push(chord[(ORDER[v.dir]||ORDER.up)(hit,chord.length)%chord.length],g);
    else if(v.v==='lead'){ const s=v.seq&&v.seq.length?v.seq[hit%v.seq.length]:0; if(s!==null&&s!==undefined) push(s,g); }
    else push(bn,g);            // bass, sub, drone
    hit++; }
  return hit;
}
// one bar of a track, as fractions of that bar. `hits` carries each voice's hit counter across bars so an arp or a
// melody spans the whole loop instead of restarting every bar
function bars(t,bar,hits){ const out=[]; (t.voices||[]).forEach((v,i)=>{ hits[i]=voiceEvents(t,v,bar,out,hits[i]||0); }); return out; }
/* how many bars before a track repeats itself exactly: the chords and the bass have to come round, and so does every
   arp order and every melody, whose cycles are counted in HITS rather than bars. Least common multiple of the lot,
   capped so a badly-chosen melody length cannot ask the catalogue for a hundred bars. */
const gcd=(a,b)=>b?gcd(b,a%b):a, lcm=(a,b)=>a/gcd(a,b)*b;
const hitsPerBar=v=>Math.max(1,(v.pat||'x').split('').filter(c=>c==='x'||c==='o').length);
function loopBars(t){ let n=lcm(t.ch.length,t.bass.length);
  for(const v of t.voices||[]){ const per=hitsPerBar(v);
    const cyc=v.v==='lead'?(v.seq||[]).length:v.v==='arp'?(v.dir==='updown'?Math.max(1,2*t.ch[0].length-2):t.ch[0].length):0;
    if(cyc) n=lcm(n,Math.ceil(cyc/per)); }
  return Math.min(16,n); }

const Music=(()=>{
  const TR=TRACKS;
  const opt=g=>TRACK_PICK[g]||'a';
  // '<game>' -> the option the app plays; 'menu' / 'key:1' / an explicit '<game>:b' are taken as given
  const pick=id=>TR[id]||TR[id+':'+opt(id)]||TR[id+':a']||TR['hold:a'];
  let tr=null, timer=0, next=0, bar=0, hits=[], sHits=[[],[]], mode='', mg=null, sg=[null,null];
  // v11 audit: the end-of-run tempo/volume ramp read G.end, which start() never reset — so under the 3-2-1 of the NEXT run "time left" was hugely negative, the ramp went past 1.7× and the volume up 35%. That was the wild countdown music. Now the ramp only runs once the clock is live, and the whole track ducks −12dB until then
  // build 17 (refactor stage 3): the run hands over its state object and length at start() — audio reads on / live / end off it and never imports the run
  let st=null, secs=0, stems=false;
  function nodes(){ const a=AC(); if(!a) return null; if(!mg||mg.context!==a){ mg=a.createGain(); mg.gain.value=1; mg.connect(a.destination);
      sg=[0,1].map(()=>{ const g=a.createGain(); g.gain.value=0; g.connect(a.destination); return g; }); } return a; }
  /* v14 (4.15 / 10.2): a versus run hands its closeness up as st.tension, and the track tightens with it. Past .6 it swaps bed
     — a fifth up and faster — so the last stretch of a close versus sounds like a different piece of music.
     v16 (1.5, A.1): MUSIC ONLY. `st.fin` is 0..1, "how far into the finish this run is", set by run/run.js from the clock
     on a timed run and from the engine's own fin() on a round-based one — the final round of a Set, or a Streak budget
     past 80%. Nothing about the gameplay speeds up; this is the only thing that reads it. */
  function ramp(){ const t=st&&st.tension?st.tension:0, f=st&&st.fin?st.fin:0; const tense=Math.max(1+.45*t,1+.7*f);
    if(!st||!st.on||!st.live||!st.end) return tense; const left=(st.end-performance.now())/1000, w={5:2.2,15:4.5,30:7}[secs]||5; return Math.max(tense, left<w? 1+.7*(1-Math.max(0,left)/w) : 1); }
  function schedule(t,at,barSec,vol,dest,h){ bars(t,bar,h).forEach(e=>{ const ms=e.d*barSec*1000;
      Snd.tone(e.f,e.f1,ms,e.w,e.g*vol,at+e.p*barSec,e.am||Math.max(4,(e.a||.06)*ms),true,dest); }); }
  function loop(){ const a=nodes(); if(!a||!tr) return;
    while(next<a.currentTime+.25){ const r=ramp(), barSec=60/tr.bpm*(tr.beats||4)/r, vol=(r>1?1.35:1)*(st&&st.on&&!st.live?.25:1);
      schedule(tr,next,barSec,vol,mg,hits);
      /* v16 (1.4): the two versus stems. Same track, so the same root, tempo and bar — only the voicing is the stem's own,
         and each rides its own gain node whose level follows that player's proximity to winning (st.vsP). P1 red, P2 light
         blue on screen; here they are simply the two ends of the same piece of music. Presentation only (L10). */
      if(stems) for(const p of [0,1]){ const want=Math.max(0,Math.min(1,(st&&st.vsP&&st.vsP[p])||0));
        try{ sg[p].gain.setTargetAtTime(want*want,a.currentTime,.25); }catch(e){ sg[p].gain.value=want*want; }
        schedule(Object.assign({},tr,STEMS[p]),next,barSec,vol,sg[p],sHits[p]); }
      next+=barSec; bar++; } }
  function run(t,id){ const a=nodes(); if(!a) return; tr=t; mode=id; bar=0; hits=[]; sHits=[[],[]]; next=a.currentTime+.05; clearInterval(timer); timer=setInterval(loop,80); loop(); }
  return {
    start(g,state,len){ st=state||null; secs=len||0; stems=sel.vs===2; if(!musicOn(g)){ this.stop(); return; } run(pick(g),g); },
    /* v16 (1.2 / 1.3): the front of the app has music too — one menu loop, and one per key tier, rising in intensity.
       Called from the screen change below and from ui/screens/key.js when a tier is selected. Idempotent: asking for the
       loop that is already playing does nothing, so moving between menu screens never restarts it. */
    menu(id){ if(mode===id&&tr) return; st=null; secs=0; stems=false; if(!musicOn('menu')){ this.stop(); return; } const t=TR[id]; if(!t) return; run(t,id); },
    // preview one track on its own — Customise (12.1), and the option a game is set to play
    // a preview ends by handing the menu loop back — walking away from Customise into silence would be worse than not previewing
    preview(g,ms,o){ st=null; stems=false; const t=o?(TR[g+':'+o]||pick(g)):pick(g); run(t,'preview'); setTimeout(()=>{ if(mode==='preview'){ this.stop(); this.menu('menu'); } },ms||4200); },
    /* the review catalogue's Play button (v16 §1.1). One loop of a track as a flat list of tone events —
       [t, freq, freqEnd, ms, wave, gain, attackMs] — so the page plays exactly what the app plays and there is no second
       copy of the arrangement engine to drift. */
    plan(id,barsN){ const t=TR[id]; if(!t) return null; const n=barsN||loopBars(t), barSec=60/t.bpm*(t.beats||4), h=[], out=[];
      for(let b=0;b<n;b++) bars(t,b,h).forEach(e=>{ const ms=e.d*barSec*1000;
        out.push([+(b*barSec+e.p*barSec).toFixed(4),+e.f.toFixed(2),+e.f1.toFixed(2),Math.round(ms),e.w,+e.g.toFixed(4),Math.round(e.am||Math.max(4,(e.a||.06)*ms))]); });
      return { id, name:t.name, bpm:t.bpm, root:t.root, beats:t.beats||4, bars:n, loopSec:+(n*barSec).toFixed(3), plan:out }; },
    tracks(){ return Object.keys(TR); },
    stop(){ clearInterval(timer); tr=null; mode=''; if(sg[0]) try{ sg[0].gain.value=0; sg[1].gain.value=0; }catch(e){} } };
})();

/* v16 (1.2): the menu has its own music, and it plays across the front of the app rather than only on one screen —
   stopping it to walk to the pick sheet and back would be worse than not having it. The game layer is the exception:
   a run's own track takes over there, and Music.start / Music.stop own it. The keys screen asks for its tier's loop
   itself (ui/screens/key.js) — this only sets the opening one. */
let menuT=0;
on('screen:change',({id})=>{ clearTimeout(menuT); if(id==='game') return; menuT=setTimeout(()=>Music.menu(id==='s-key'?'key:1':'menu'),900); });

// build 18 (refactor stage 4, was in boot.js): every touch and every return to the foreground checks the context is running; the first touch unlocks it
document.addEventListener('pointerdown',()=>{ if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } },{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } });
document.addEventListener('pointerdown',()=>Snd.unlock(),{once:true});

export { AC, Music, Snd, ac };
