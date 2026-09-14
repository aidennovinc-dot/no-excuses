/* No Excuses — the count-up (build 37). A figure walking from one value to another over `ms`, one frame at a time.

   It was `countUp` in games/_shared/hud.js from v14 (6.1). It lives here since build 37 so the MENU can walk its
   percentage with the same one (v20 D.4): A4 forbids a screen importing from games/ (the registry aside), and a second copy
   of this loop is exactly the kind of drift the rule is there to stop. hud.js wraps it — G.7's `driving` and v15 3.7's
   `walk` stay there — so every engine calls precisely what it called before.

   set(text) writes the figure wherever it lives; alive() ends it early; done() runs at the end; onK(k) sees each frame's
   0..1, which is how hud.js drives its second figure. `audio` is anything with whoosh(ms, f0, f1) — the counting sweep. */
function countUp({ audio, from, to, ms = 650, fmt, set, alive, done, onK }) {
  const t0 = performance.now(); if (audio) audio.whoosh(ms, 140, 700);
  const step = now => { if (alive && !alive()) return; const k = Math.min(1, (now - t0) / ms);
    set(fmt(from + (to - from) * k)); if (onK) onK(k);
    if (k < 1) requestAnimationFrame(step); else { set(fmt(to)); if (onK) onK(1); if (done) done(); } };
  requestAnimationFrame(step); }

export { countUp };
