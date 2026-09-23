/* ---- 8. build 27 (v16): the Timing unlock, the music engine, Find versus, the intro ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, ok, bad, at, page, setStorage, OPEN_PREFS, up, finish } from '../lib/gate.mjs';

export const SECTION = ["build 27 — v16"];

export async function run() {
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);

  /* §1: every track plans. `plan` is the one arrangement engine — the review catalogue plays its output rather than
     carrying a second copy of the synth — so a track that plans to nothing is a track nobody can hear or review. */
  const P = await page.evaluate(async () => {
    const M = await import('./audio.js'); const A = await import('./config/audio.js');
    const out = { bad: [], n: 0, events: 0 };
    for (const id of Object.keys(A.TRACKS)) { const q = M.Music.plan(id);
      if (!q || !q.plan.length) { out.bad.push(id + ' (no events)'); continue; }
      // build 30: ten fields — the last three are the per-note lowpass, its Q and the hold (B.30)
      for (const [t, f, f1, ms, w, g, am, lp, q2, hold] of q.plan)
        if (![t, f, f1, ms, g, am, lp, q2, hold].every(Number.isFinite) || f <= 0 || f1 <= 0 || ms <= 0 || g <= 0 || !w || lp < 0 || hold < 0 || hold > 1) { out.bad.push(id + ' (bad event)'); break; }
      out.n++; out.events += q.plan.length; }
    return out; });
  P.bad.length ? bad('§1 every track plays', P.bad.join(', '))
    : ok(`§1 all ${P.n} tracks schedule cleanly — ${P.events} tone events across one loop each`);

  /* §2: THE TIMING UNLOCK. Get the first note of a Sequence run wrong and Timing · Stopwatch opens, at 3 and 7 keys (five
     is gone at build 28, B.9), and it is in the store BEFORE the run ends — the old row waited for a finish nobody sits
     through after failing on note one, and its predicate tested a score (`hits === 0`) a Sequence run cannot reach. */
  for (const keys of [3, 7]) {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1 }, ach: {}, intro: { 'sequence:solo': 1, sequence: 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const got = await page.evaluate(async k => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SQ = (await import('./games/sequence/index.js')).default;
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: k, vs: 0, practice: 0 });
      RUN.start();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 90; i++) { if (SQ.st === 'input') break; await wait(100); }
      if (SQ.st !== 'input') return { err: 'never reached input' };
      const wrong = (SQ.seq[0] + 1) % k;               // deliberately not the note it just played
      SQ.press(wrong);
      await wait(120);
      const mid = JSON.parse(localStorage.getItem('ne') || '{}');
      RUN.abort();                                      // quit before the run's own finish ever lands
      await wait(150);
      const after = JSON.parse(localStorage.getItem('ne') || '{}');
      return { mid: !!(mid.unlock || {})['timing:stopwatch'], after: !!(after.unlock || {})['timing:stopwatch'], first: SQ.badFirst }; }, keys);
    if (got.err) bad(`§2 Sequence · ${keys} keys, first note wrong`, got.err);
    else if (got.mid && got.after) ok(`§2 first note wrong on ${keys} keys unlocks Timing · Stopwatch mid-run, and it survives the quit`);
    else bad(`§2 first note wrong on ${keys} keys unlocks Timing`, JSON.stringify(got));
  }
  // and the other half of the same rule: a run that answers the first note CORRECTLY must not open it
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], unlock: { 'sequence:solo': 1 }, ach: {}, intro: { 'sequence:solo': 1, sequence: 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const got = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SQ = (await import('./games/sequence/index.js')).default;
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: 3, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 90; i++) { if (SQ.st === 'input') break; await wait(100); }
      SQ.press(SQ.seq[0]); await wait(120);
      const u = !!(JSON.parse(localStorage.getItem('ne') || '{}').unlock || {})['timing:stopwatch'];
      RUN.abort(); return u; });
    got ? bad('§2 a correct first note must not open Timing', 'it did') : ok('§2 answering the first note correctly does not open Timing');
  }

  /* §4: Spot · Find versus. The shapes are dealt ONCE and kept for the whole match, the two `.vz` bands (and the border
     between them that was the "mid line") are gone from the field, and the round lights in the owner's colour (L4). */
  {
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const f = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SP = (await import('./games/spot/index.js')).default;
      Object.assign(ST.sel, { game: 'spot', diff: 'find', secs: 10, vs: 2, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 120; i++) { if (SP.st === 'vsfind') break; await wait(100); }
      if (SP.st !== 'vsfind') { RUN.abort(); return { err: 'never reached the field' }; }
      const r1 = { o1: SP.o1, o2: SP.o2, base: SP.vsBase, moving: SP.pts.some(q => q.vx || q.vy || q.va), vz: document.querySelectorAll('#gen .vz').length };
      // take the round for player 2 by tapping their shape, then wait for the next round
      const i2 = SP.pts.findIndex(q => q.shape === SP.o2);
      const lit = (() => { const els = document.querySelectorAll('#gen .fs'); return els[i2]; })();
      const rect = document.getElementById('gen').getBoundingClientRect();
      const sz2 = SP.pts[i2].sz || SP.size;   // v17 (B.15): a crowd is not all one size any more
      SP.vsTap({ x: rect.left + SP.pts[i2].x + sz2 / 2, y: rect.top + SP.pts[i2].y + sz2 / 2 });
      const colour = lit.classList.contains('p2') && lit.classList.contains('odd');
      for (let i = 0; i < 60; i++) { if (SP.st === 'wait' || SP.st === 'vsfind') break; await wait(100); }
      await wait(3200);
      const r2 = { o1: SP.o1, o2: SP.o2, base: SP.vsBase, moving: SP.pts.some(q => q.vx || q.vy || q.va), round: SP.round, score: SP.vsN.slice() };
      RUN.abort();
      return { r1, r2, colour }; });
    if (f.err) bad('§4 Spot · Find versus reaches its field', f.err);
    else {
      (f.r1.o1 === f.r2.o1 && f.r1.o2 === f.r2.o2 && f.r1.base === f.r2.base)
        ? ok(`§4 both players keep the shape they were dealt for the whole match (P1 ${f.r1.o1}, P2 ${f.r1.o2}, crowd ${f.r1.base})`)
        : bad('§4 the shapes are dealt once', JSON.stringify([f.r1, f.r2]));
      f.r1.vz === 0 ? ok('§4 the mid line is gone — no .vz bands on the field, the score is one line in the HUD')
        : bad('§4 no mid line on the Find versus field', f.r1.vz + ' .vz bands still there');
      f.colour ? ok('§4 the round lights in the owner\'s colour (L4), not green') : bad('§4 the winning shape lights in its owner\'s colour');
      (!f.r1.moving && f.r2.moving) ? ok('§4 the crowd starts static and gains motion from round 2')
        : bad('§4 static first, moving after', JSON.stringify({ r1: f.r1.moving, r2: f.r2.moving, round: f.r2.round }));
      f.r2.score[1] === 1 ? ok('§4 a tap on your own shape takes the round (A.2)') : bad('§4 a tap on your own shape takes the round', JSON.stringify(f.r2.score));
    }
  }

  /* §5: the intro carries the line and nothing else — no sub-line, no word-by-word reveal — and the "Ready?" is on a
     fresh profile's first run of a game and gone on the second mode of that same game (A.3). */
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, allOpen: true }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const look = async (d) => page.evaluate(async m => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
      Object.assign(ST.sel, { game: 'quick-tap', diff: m, secs: 5, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      /* WATCH it rather than sampling once. The ghost demo runs first and its length is the engine's own, and the two
         cases end differently: a first run of a game STOPS on Ready, a later mode closes the intro by itself and is
         already gone by the time a poll notices. So record what was seen while it was up, not what is there after. */
      const el = document.getElementById('intro');
      let sawOn = false, sawReady = false;
      for (let i = 0; i < 70; i++) { const on = el.classList.contains('on');
        if (on) sawOn = true;
        if (el.classList.contains('ready')) { sawReady = true; break; }
        if (sawOn && !on) break; await wait(150); }
      const t = document.getElementById('intro-text');   // clear() drops the classes, never the markup
      const out = { sawOn, sawReady,
        words: t.querySelectorAll('.w').length, subs: t.querySelectorAll('small:not(.rdy small)').length,
        text: (t.textContent || '').trim() };
      RUN.abort(); return out; }, d);
    const a = await look('two'); await sleep(300);
    const b = await look('four'); await sleep(300);
    (a.words === 0 && a.subs === 0) ? ok(`§5 the intro is one line, arriving as a line — "${a.text.split('Ready?')[0].trim()}"`)
      : bad('§5 the intro is one line with no word-by-word reveal', JSON.stringify(a));
    a.sawReady ? ok('A.3 the first run of Quick Tap ends its intro on "Ready?"') : bad('A.3 "Ready?" on the first run of a game', JSON.stringify(a));
    (b.sawOn && !b.sawReady) ? ok(`A.3 the second mode of the same game shows its one-liner and skips the Ready gate — "${b.text.split('Ready?')[0].trim()}"`)
      : bad('A.3 Ready is once per game, not once per mode', JSON.stringify(b));
  }
}
