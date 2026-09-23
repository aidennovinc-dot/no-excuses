/* No Excuses — run-scoped timers (build 17, refactor stage 3). The good idea from app.js, shared by everyone:
   a timeout or frame scheduled inside a run dies with the run. makeTimers(alive) — alive() says whether the run
   that owns this set is still the live one; a callback whose run has ended or been replaced never fires, and
   clearT() drops everything still pending. The engines get one set per run as ctx.timers.

   v31 (60.27, build 60): AND THE WHOLE SET CAN BE PAUSED. Leaving the app used to END the run (v29 item 4, build 55, which this
   reverses at Aiden's own call of 2026-09-23 — "a 20-round Streak lost to a phone call"). A pause has to stop every clock the
   run owns, and the engines' timeouts are most of them: a Flash waiting to light, a Count waiting to ask, a round's card waiting
   to move on. `pause()` cancels each one and remembers how much of its wait was LEFT; `resume()` re-arms it for exactly that,
   so a round paused half a second before its flash still has half a second to go when the player comes back. */
export function makeTimers(alive){
  let items=[], raf=0, paused=false;
  const arm=it=>{ it.at=performance.now();
    it.id=setTimeout(()=>{ items=items.filter(x=>x!==it); if(alive()) it.f(); },it.ms); };
  return {
    alive,
    later(f,ms){ const it={ f, ms:Math.max(0,ms||0), id:0, at:0 };
      items.push(it); if(paused) it.id=0; else arm(it); return it.id; },
    frame(f){ raf=requestAnimationFrame(now=>{ if(alive()) f(now); }); return raf; },
    clearT(){ items.forEach(it=>clearTimeout(it.id)); items=[]; paused=false; if(raf){ cancelAnimationFrame(raf); raf=0; } },
    /* every pending wait is cancelled and what was LEFT of it is kept. A frame request is dropped outright — the run's own rAF
       is restarted by whoever resumes, and a single frame's worth of work is not worth carrying across a pause. */
    pause(){ if(paused) return 0; paused=true;
      const now=performance.now();
      items.forEach(it=>{ clearTimeout(it.id); it.id=0; it.ms=Math.max(0,it.ms-(now-it.at)); });
      if(raf){ cancelAnimationFrame(raf); raf=0; }
      return items.length; },
    resume(){ if(!paused) return 0; paused=false; items.forEach(arm); return items.length; },
    paused(){ return paused; },
  };
}
// the clock (v8, was in reaction.js): t0 is taken when the change has actually painted; a tap is timed from the event's
// own timestamp, not from when the handler ran. Anything that is not a plausible event timestamp falls back to now
export const tapTime=e=>{ const n=performance.now(); const ts=e&&e.timeStamp; return ts&&ts<=n+1&&ts>n-5000?ts:n; };
