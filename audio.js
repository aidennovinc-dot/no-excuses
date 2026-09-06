/* No Excuses — synthesised sound effects and the per-game music pad
   Split out of index.html at build 12. Build 16 (refactor stage 2): the scales and the seven tracks are data in config/audio.js. */

import { SCALES, TRACKS } from "./config/audio.js";
import { sel } from "./core/state.js";
import { musicOn, prefs } from "./core/store.js";
/* ---------- sound: synthesised, tiny, quiet. The pack colours hit / miss / click; tick, go and end are the same everywhere ---------- */
// v10: iOS marks the context "interrupted" (not "suspended") when the app goes to the background, and only a resume inside a touch brings it back — so every touch checks, and so does coming back to the foreground
let ac=null; const AC=()=>{ if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac&&ac.state!=='running'){ try{ ac.resume(); }catch(e){} } return ac; };
const Snd = (()=>{
  function tone(f0,f1,ms,type,gain,at,attack,force){ const a=AC(); if(!a||(prefs.snd==='off'&&!force)) return; const t=at||a.currentTime; const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+ms/1000); g.gain.setValueAtTime(attack?0.0001:gain,t); if(attack) g.gain.exponentialRampToValueAtTime(gain,t+attack/1000); g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000); o.connect(g).connect(a.destination); o.start(t); o.stop(t+ms/1000); }
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
    end(){ const a=AC(); if(!a) return; const t=a.currentTime; tone(660,660,180,'triangle',.10,t); tone(440,440,420,'triangle',.10,t+.17); },
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
/* music: one sustained pad-and-bass loop per game. No percussion — taps must never be confused with the track. Timed runs ramp tempo and volume in the last stretch */
const Music=(()=>{
  // v13 (12.1): one module per game — seven tracks in config/audio.js, each its own entry, each previewable on its own from Customise. Nothing borrows any more
  const TR=TRACKS;
  let tr=null, timer=0, next=0, bar=0;
  // v11 audit: the end-of-run tempo/volume ramp read G.end, which start() never reset — so under the 3-2-1 of the NEXT run "time left" was hugely negative, the ramp went past 1.7× and the volume up 35%. That was the wild countdown music. Now the ramp only runs once the clock is live, and the whole track ducks −12dB until then
  // build 17 (refactor stage 3): the run hands over its state object and length at start() — audio reads on / live / end off it and never imports the run
  let st=null, secs=0;
  function ramp(){ if(!st||!st.on||!st.live||!st.end) return 1; const left=(st.end-performance.now())/1000, w={5:2.2,15:4.5,30:7}[secs]||4; return left<w? 1+.7*(1-Math.max(0,left)/w) : 1; }
  function loop(){ const a=AC(); if(!a||!tr) return; while(next<a.currentTime+.25){ const r=ramp(), dur=60/tr.bpm*4/r, vol=(r>1?1.35:1)*(st&&st.on&&!st.live?.25:1);
      const c=tr.ch[bar%4]; c.forEach((n,i)=>Snd.tone(tr.root*2*Math.pow(2,n/12),tr.root*2*Math.pow(2,n/12),dur*1000*.98,'triangle',.022*vol*(i===0?1.2:1),next,dur*280,true));
      Snd.tone(tr.root/2*Math.pow(2,tr.bass[bar%4]/12),tr.root/2*Math.pow(2,tr.bass[bar%4]/12),dur*1000*.9,'sine',.07*vol,next,90,true);
      next+=dur; bar++; } }
  return { start(g,state,len){ st=state||null; secs=len||0; if(!musicOn(g)) return; const a=AC(); if(!a) return; tr=TR[g]||TR.hold; bar=0; next=a.currentTime+.05; clearInterval(timer); timer=setInterval(loop,80); loop(); },
           // preview one game's track on its own, from Customise (12.1) — four bars, then it stops itself
           preview(g,ms){ st=null; const a=AC(); if(!a) return; tr=TR[g]||TR.hold; bar=0; next=a.currentTime+.05; clearInterval(timer); timer=setInterval(loop,80); loop(); setTimeout(()=>this.stop(),ms||4200); },
           tracks(){ return Object.keys(TR); },
           stop(){ clearInterval(timer); tr=null; } };
})();


export { AC, Music, Snd, ac };
