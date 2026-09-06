/* No Excuses — run-scoped timers (build 17, refactor stage 3). The good idea from app.js, shared by everyone:
   a timeout or frame scheduled inside a run dies with the run. makeTimers(alive) — alive() says whether the run
   that owns this set is still the live one; a callback whose run has ended or been replaced never fires, and
   clearT() drops everything still pending. The engines get one set per run as ctx.timers. */
export function makeTimers(alive){
  let ids=[], raf=0;
  return {
    alive,
    later(f,ms){ const id=setTimeout(()=>{ if(alive()) f(); },ms); ids.push(id); return id; },
    frame(f){ raf=requestAnimationFrame(now=>{ if(alive()) f(now); }); return raf; },
    clearT(){ ids.forEach(clearTimeout); ids=[]; if(raf){ cancelAnimationFrame(raf); raf=0; } },
  };
}
// the clock (v8, was in reaction.js): t0 is taken when the change has actually painted; a tap is timed from the event's
// own timestamp, not from when the handler ran. Anything that is not a plausible event timestamp falls back to now
export const tapTime=e=>{ const n=performance.now(); const ts=e&&e.timeStamp; return ts&&ts<=n+1&&ts>n-5000?ts:n; };
