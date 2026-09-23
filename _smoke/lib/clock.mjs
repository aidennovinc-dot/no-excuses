/* No Excuses — the gate's test clock (build 61). TEST ONLY: nothing under the site root imports this, and the shipped app never
   reads it. It runs the page N times faster than the wall, so at the default ×5 a 90-second Marathon takes eighteen seconds of the gate's time.

   Everything the app keeps time with moves together, so no screen can see two clocks disagree:
   - performance.now, Date.now, an event's timeStamp and a requestAnimationFrame timestamp all read one scaled clock;
   - setTimeout and setInterval fire after 1/N of the delay they were asked for;
   - CSS animations and transitions, the Web Animations API and document.timeline run at N× through the DevTools Animation domain
     (`Animation.setPlaybackRate`), which is the same control as the DevTools animation-speed slider.
   What it cannot scale: an AudioContext's `currentTime` and a <video>'s playback run on the wall. A section that asserts real audio
   timing is left at ×1 — `clock: 1` on its row in sections/index.mjs. Not to be confused with build 36's "frozen clock", the iOS
   audio fix, which is the app's own and untouched by this. */
export async function installClock(page, N) {
  await page.evaluateOnNewDocument(N => {
    const P = performance, rNow = P.now.bind(P), rDate = Date.now, rST = window.setTimeout, rSI = window.setInterval, rRAF = window.requestAnimationFrame;
    const p0 = rNow(), d0 = rDate();
    const scaled = t => p0 + (t - p0) * N;
    P.now = () => scaled(rNow());
    Date.now = () => d0 + (rDate() - d0) * N;
    window.setTimeout = function (fn, ms, ...a) { return rST(fn, (+ms || 0) / N, ...a); };
    window.setInterval = function (fn, ms, ...a) { return rSI(fn, (+ms || 0) / N, ...a); };
    /* NOT scaled(t): under Animation.setPlaybackRate the frame timestamp Chrome hands a callback is ALREADY on the sped-up animation
       clock, from its own origin, so scaling it again ran the run's frame clock at N² and ahead of performance.now. The callback
       gets the one scaled clock at the moment it runs instead — a frame's worth later than frame start at most. */
    window.requestAnimationFrame = cb => rRAF(() => cb(P.now()));
    const ts = Object.getOwnPropertyDescriptor(Event.prototype, 'timeStamp');
    if (ts && ts.get) Object.defineProperty(Event.prototype, 'timeStamp', { configurable: true, get() { return scaled(ts.get.call(this)); } });
    Object.defineProperty(window, '__testClock', { value: N });
  }, N);
  const cdp = await page.createCDPSession();
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: N });
  return cdp;
}
