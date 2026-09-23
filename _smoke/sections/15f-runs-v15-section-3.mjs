// build 61: part 6 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, part, check, ok, bad, read, at, page, PLANTED, click, down, up, poke, clearReady, openSheet } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  {
    // openSheet writes a profile with no `intro`, so a first run plays its ghost demo and ends on "Ready?" — the wait answers it
    const liveNow = async (g) => { for (let i = 0; i < 140; i++) { if (await page.evaluate(() => document.getElementById('game').classList.contains('live'))) return true;
      if (g) await clearReady(g); await sleep(100); } return false; };
    const unlocksAfterQuit = async (g, mi, li) => { await openSheet(g, mi, li); await click('#go-btn');
      if (!(await liveNow(g))) return ['NEVER-WENT-LIVE'];
      await sleep(500); await click('#quit'); await sleep(500);
      return page.evaluate(() => { try { return Object.keys((JSON.parse(localStorage.getItem('ne')) || {}).unlock || {}); } catch (e) { return ['UNREADABLE']; } }); };
    /* item 2: minMax([]) answers [0,0] — a display convenience — and x:0 satisfies hold:cut (x<=15), sequence:solo (x<=3.5)
       and timing:hidden (x<=.3), every one of them live:1. Quitting during round 1, before anything was played, therefore
       banked a quarter of the L6 chain and turned two "within N%" skill rows into no-ops. */
    const quits = { 'hold · grow': await unlocksAfterQuit('hold', 0, 0), 'hold · cut': await unlocksAfterQuit('hold', 1, 0),
      'timing · stopwatch': await unlocksAfterQuit('timing', 0, 0), 'timing · hidden': await unlocksAfterQuit('timing', 1, 0) };
    Object.values(quits).every(u => Array.isArray(u) && !u.length)
      ? ok('item 2 quitting during round 1 of Grow, Cut, Stopwatch or Hidden banks NOTHING — the engines report no best round they do not have, and abort() runs no live pass on a result with nothing on it')
      : bad('item 2 an aborted run with no round played banks an unlock', JSON.stringify(quits));

    /* item 2, the other way round (and what the deleted source-text check in `the chain` stood for): a quit AFTER a round has
       landed STILL banks it — v15 2.5, "quitting must never cost a player something they already earned". A Grow round scored
       at 0.00% off is a real result whose `hits` is 0, which is why `landed` reads the engine's `x` and not a count. */
    await openSheet('hold', 0, 0); await click('#go-btn');
    (await liveNow('hold')) || bad('item 2 the Grow run never went live');
    /* the round is PLANTED rather than played: a driven hold releases at whatever size the poke produced, and whether that lands
       inside hold:cut's 15% is chance. One round of 4% off is a round that landed, which is the whole of what this asserts. */
    { const planted = await page.evaluate(async () => { const M = await import('./games/estimate/index.js'); const E = M.default;
        if (!E) return null; E.errs = [4]; return { x: E.result().x, hits: E.result().hits }; });
      await sleep(200); await click('#quit'); await sleep(600);
      const banked = await page.evaluate(() => { try { return Object.keys((JSON.parse(localStorage.getItem('ne')) || {}).unlock || {}); } catch (e) { return ['UNREADABLE']; } });
      (planted && planted.x === 4 && banked.includes('hold:cut'))
        ? ok('v15 2.5 a quit AFTER a round has landed still banks what it earned — the live pass is skipped only when the engine has no round to report, never when it has one')
        : bad('2.5 quitting costs an earn the player already made', JSON.stringify({ planted, banked })); }

    /* item 3: roundEngine.stop() left `st` on 'wait' / 'run' / 'find', and run.input forwarded taps from R.on — which is set
       when the screen is BUILT — so a tap during the next run's 3-2-1 ran the dead state's handler. On Flash it walked a
       phantom early tap, set `pending`, and the player's first real flash was eaten: a Set of five played four. */
    await openSheet('reaction', 0, 0); await click('#go-btn');
    (await liveNow('reaction')) || bad('item 3 the Flash run never went live'); await sleep(400); await click('#quit'); await sleep(600);
    await click('[data-go="s-pick"]'); await sleep(300);
    await page.evaluate(() => document.querySelector('.tile[data-game="reaction"]').click()); await sleep(320);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); (c[0] || c[0]).click(); }); await sleep(420);
    await page.evaluate(() => { const t = [...document.querySelectorAll('#time-row .tbtn')]; (t[0] || t[0]).click(); }); await sleep(160);
    await click('#go-btn'); await sleep(250);
    await down('#gen'); await sleep(120); await down('#gen');   // taps during the 3-2-1, the way a restless thumb makes them
    /* build 61: the page waits for live and reads 250ms later ITSELF — two driver round trips here were up to a few hundred ms of the
       page's time on the test clock, enough for round 1's own flash to come and go and hold its card */
    const flash55 = await page.evaluate(async () => { const g = document.getElementById('game'), w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 400 && !g.classList.contains('live'); i++) await w(25);
      await w(250); return { hud: (document.getElementById('hud-time') || {}).textContent || '', held: g.classList.contains('tapon') }; });
    (/^\s*1\s*\//.test(flash55.hud) && !flash55.held)
      ? ok(`item 3 a tap during the 3-2-1 after an aborted Flash run is dropped — the new run opens on round 1 (${flash55.hud.trim()}) with no card held over from the dead one`)
      : bad('item 3 the stale round state eats round 1', JSON.stringify(flash55));

    // item 9: and a route out of a LIVE run ends it, instead of leaving it ticking under the screen the player went to
    const nav55 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const RN = await import('./run/run.js');
      const before = RN.R.on; R.show('s-pick'); await new Promise(r => setTimeout(r, 300)); return { before, after: RN.R.on }; });
    (nav55.before && !nav55.after)
      ? ok('item 9 navigating away from a live run ends it — a stray toast tap used to call show(\'s-pick\') and leave R.on true, the rAF ticking, the engine armed and the music playing under the pick sheet')
      : bad('item 9 a live run survives a screen change', JSON.stringify(nav55));

    /* item 4: nothing handled visibilitychange for the run. R.end is absolute, so a locked Marathon recorded its first ten
       seconds as a Marathon; Stopwatch's t0 kept its start while rAF paused, so the first frame back scored the whole lock
       time as the attempt and set `ov` — which is what tm_s10 reads, so locking the phone handed out a secret achievement.
       AMENDED AT BUILD 60 (v31 60.27, Aiden's call of 2026-09-23, which REVERSES item 4's remedy): the run PAUSES and resumes
       rather than ending. "A 20-round Streak lost to a phone call." Item 4 was right about the fault and wrong about the cure,
       so this is RESTATED rather than dropped: every one of the three things it caught is still asserted impossible — nothing
       banked, no tm_s10, and no attempt scored across the time away — and what it asserted about the REMEDY (the run over, back
       on the pick sheet, one toast) is replaced by what the remedy is now. The Marathon half is driven too, because keeping the
       seconds a timed run had left is the part item 4's own reasoning turned on. */
    await openSheet('timing', 0, 0); await click('#go-btn');
    (await liveNow('timing')) || bad('item 4 the Stopwatch run never went live'); await sleep(900);
    const before60 = await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default;
      return { st: TM.st, t0: TM.t0, round: TM.round }; });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(2500);   // a good long time away — long enough that a clock left running would score it
    const away60 = await page.evaluate(async () => { const RN = await import('./run/run.js');
      return { on: RN.R.on, paused: document.getElementById('game').classList.contains('paused') }; });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    const counting60 = await page.evaluate(() => ({ count: document.getElementById('count').classList.contains('on') }));
    await sleep(1600);   // past the 3-2-1
    const back60 = await page.evaluate(async () => { const RN = await import('./run/run.js'); const TM = (await import('./games/timing/index.js')).default;
      const st = JSON.parse(localStorage.getItem('ne')) || {};
      return { on: RN.R.on, paused: document.getElementById('game').classList.contains('paused'),
        runs: (st.runs || []).length, ach: Object.keys(st.ach || {}),
        screen: (document.querySelector('.screen.on') || {}).id,
        st: TM.st, round: TM.round, errs: TM.errs.length,
        // the attempt is REPLAYED FRESH: a new clock, started after the return, not the one that was running when the phone slept
        clockAge: TM.t0 ? Math.round(performance.now() - TM.t0) : null }; });
    (away60.on && away60.paused && !back60.paused && back60.on
      && !back60.runs && !back60.ach.includes('tm_s10') && back60.errs === 0
      && back60.round === before60.round && back60.clockAge !== null && back60.clockAge < 2500
      && counting60.count)
      ? ok(`60.27 (amending v29 item 4) the phone going to sleep mid-Stopwatch PAUSES the run and it resumes — 2.5s away, the run still live and frozen while it was gone, a 3-2-1 on return, and the attempt REPLAYED FRESH on a clock ${back60.clockAge}ms old rather than one 2.5s older; still round ${back60.round}, nothing banked, and no tm_s10 from a clock left running`)
      : bad('60.27 the pause and resume', JSON.stringify({ before60, away60, counting60, back60 }));

    /* and a TIMED run keeps the seconds it had left, which is the other half of item 4's fault: R.end is absolute, so a
       Marathon locked at 10s recorded ten seconds of hits as a Marathon. The paused time goes back onto R.end now. */
    await openSheet('quick-tap', 0, 2); await click('#go-btn');
    (await liveNow('quick-tap')) || bad('60.27 the Marathon never went live'); await sleep(900);
    const leftBefore = await page.evaluate(async () => { const RN = await import('./run/run.js'); return RN.R.end - performance.now(); });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(2500);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1700);
    const leftAfter = await page.evaluate(async () => { const RN = await import('./run/run.js');
      return { left: RN.R.end - performance.now(), on: RN.R.on }; });
    // the 3-2-1 itself runs on real time, so the comparison allows for it and for the 2.5s away, not for the lock
    (leftAfter.on && leftAfter.left > leftBefore - 3000)
      ? ok(`60.27 a timed run keeps the seconds it had left — a Marathon with ${Math.round(leftBefore / 1000)}s to go came back with ${Math.round(leftAfter.left / 1000)}s, where the 2.5s away would have been taken off the clock before build 60 (item 4's own fault, cured by pausing rather than by ending the run)`)
      : bad('60.27 a timed run loses its paused time', JSON.stringify({ leftBefore, leftAfter }));
    await page.evaluate(async () => (await import('./run/run.js')).abort()); await sleep(400);

    // item 14: the rolling hits/sec number was unclamped while its bar was clamped — two taps 100ms apart printed 10.0/s
    const rate55 = await page.evaluate(async () => { const H = await import('./games/_shared/hud.js'); const G = await import('./config/games.js');
      const now = performance.now(); H.rate('quick-tap', [now - 100, now], now);
      const txt = document.querySelector('#rate b').textContent, bar = document.querySelector('#rate i').style.height;
      return { txt, bar, max: G.RATE_MAX['quick-tap'] }; });
    (parseFloat(rate55.txt) <= rate55.max + 1e-9 && rate55.bar === '100%')
      ? ok(`item 14 the HUD's rolling figure is held to the same ceiling as its bar — two taps 100ms apart read ${rate55.txt} against RATE_MAX ${rate55.max}, not 10.0/s`)
      : bad('item 14 the rate number is unclamped', JSON.stringify(rate55));
  }
}
