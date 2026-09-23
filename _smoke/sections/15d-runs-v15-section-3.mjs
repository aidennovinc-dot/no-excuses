// build 61: part 4 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, part, ok, bad, read, at, page, until, click, up, verdict, clearReady, openSheet } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  { const lock60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'), G = await import('./config/games.js');
      SS.store.intro['timing'] = SS.store.intro['timing:stopwatch'] = SS.store.intro['timing:hidden'] = Date.now(); SS.save();
      const TM = (await import('./games/timing/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const till = async f => { for (let i = 0; i < 400; i++) { if (f()) return true; await wait(25); } return false; };
      const tap = () => { const g = document.getElementById('gen'); const r = g.getBoundingClientRect();
        g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); };
      const out = { lock: G.CFG.swLock, shortestTarget: null };
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'timing', diff: 'stopwatch', secs: -1 }); RUN.start();
      await till(() => TM.st === 'run' && TM.t0);
      out.target = TM.target;
      // the hint is dim while the lock holds
      out.hintLockedAt = (() => { const h = document.getElementById('tmhint'); return h ? h.classList.contains('locked') : null; })();
      // inside the window, twice
      await wait(Math.max(0, 120 - (performance.now() - TM.t0))); tap(); await wait(60);
      out.afterEarly = { st: TM.st, errs: TM.errs.length };
      await wait(300); tap(); await wait(60);
      out.afterEarly2 = { st: TM.st, errs: TM.errs.length };
      // past it
      await wait(Math.max(0, G.CFG.swLock + 250 - (performance.now() - TM.t0)));
      out.hintLockedLater = (() => { const h = document.getElementById('tmhint'); return h ? h.classList.contains('locked') : null; })();
      tap(); await wait(120);
      out.afterLate = { st: TM.st, errs: TM.errs.length, score: TM.errs[0] };
      RUN.abort(); await wait(400);
      // the shortest target a Stopwatch attempt can ever be dealt, so the lock can be shown never to eat a real answer
      out.shortestTarget = Math.min(...Array.from({ length: 400 }, () => TM.rampAt(1)));
      // Hidden is not locked
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'timing', diff: 'hidden', secs: -1 }); RUN.start();
      await till(() => TM.st === 'run' && TM.t0 && TM.ball);
      out.hiddenLocked = TM.swLocked({ t: TM.t0 + 100 });
      RUN.abort(); await wait(300);
      return out; });
    (lock60.lock === 1000 && lock60.hintLockedAt === true && lock60.hintLockedLater === false
      && lock60.afterEarly.errs === 0 && lock60.afterEarly.st === 'run'
      && lock60.afterEarly2.errs === 0 && lock60.afterEarly2.st === 'run'
      && lock60.afterLate.errs === 1 && lock60.hiddenLocked === false && lock60.shortestTarget >= 2)
      ? ok(`60.10 a Stopwatch attempt ignores taps for its first ${lock60.lock}ms: two taps inside the window score nothing and leave the attempt running, a tap after it scores (${lock60.afterLate.score}s off), the "tap to stop" hint is dim until taps count, and Hidden is NOT locked — the shortest Stopwatch target ever dealt is ${lock60.shortestTarget}s, so the window can never eat a real answer`)
      : bad('60.10 the Stopwatch lockout', JSON.stringify(lock60)); }

  /* ---- v31 (60.9, build 60): HIDDEN'S VERDICTS, AND THE SET'S THREE STEPS ARE THE KEY'S THREE BARS ----
     Per round, Aiden's numbers: 40 / 70 / 95ms becomes 60 / 115 / 200. Over the Set, Cowork's call: 400 / 650 / 950ms becomes
     700 / 1,000 / 1,500 on the same 5,400 scale. The WHY is the assertion: the old "Meh." sat at 950ms, which was STRICTER than
     the Skill key's own 1,500ms bar on the same combination, so a player could clear the key bar and be told the run was bad.
     The three steps are now Author, Pro and Skill off 'timing:hidden:10' — read from key-bars rather than written twice, so a
     bar Aiden moves later cannot leave the verdicts behind. This closes the verdict half of FEEDBACK-v24 §F.8. */
  { const h60 = await page.evaluate(async () => { const V = await import('./config/verdicts.js'), KB = await import('./config/key-bars.js');
      const P = await import('./progress.js'); const row = KB.KEY_BARS['timing:hidden:10'];
      const scale = 5400, at = V.VERDICTS['timing:hidden'].at;
      return { round: V.ROUND_AT['timing:hidden'], at, ms: at.map(a => Math.round((1 - a) * scale)),
        bars: { author: row.author, pro: row.pro, skill: row.bar },
        // and the reading a run actually gets, through the app's own verdict()
        tiers: [650, 700, 999, 1000, 1499, 1500, 1501].map(ms => [ms, P.verdict({ g: 'timing', d: 'hidden', s: 10, hits: ms }).tier]) }; });
    const want = [700, 1000, 1500];
    (JSON.stringify(h60.round) === JSON.stringify([60, 115, 200]) && JSON.stringify(h60.ms) === JSON.stringify(want)
      && h60.bars.author === 700 && h60.bars.pro === 1000 && h60.bars.skill === 1500
      && h60.tiers.find(t => t[0] === 1500)[1] !== 'bad' && h60.tiers.find(t => t[0] === 1501)[1] === 'bad')
      ? ok(`60.9 Hidden is looser and its Set now agrees with its own key: per-round ceilings ${h60.round.join(' / ')}ms (were 40 / 70 / 95), and a Set's Amazing / Great / Good at ${h60.ms.join(' / ')}ms — the SAME three numbers as the Author, Pro and Skill bars on timing:hidden:10, so a run that clears the Skill key bar is no longer told it was bad (${h60.tiers.map(t => t[0] + 'ms→' + t[1]).join(', ')}). Closes v24 §F.8's verdict half`)
      : bad('60.9 Hidden verdicts', JSON.stringify(h60)); }

  /* ---- v31 (60.4, build 60, L5 quoted — Aiden 2026-09-23): GROW'S VERDICTS AND ITS STREAK ALLOWANCE ----
     Three separate facts, and the third is the one that could quietly rot: the round's verdict word reads the RAW error while
     the budget is charged the error MINUS the allowance. If a later build ever passes the reduced number to the tier, a 6% round
     would read "Amazing!" — so the assertion drives the arithmetic on both sides rather than reading a constant.
     The BUDGET ITSELF DOES NOT MOVE: L5's 100% stands, and so do the key bars on Grow (they are not part of 60.4). */
  { const g60 = await page.evaluate(async () => { const V = await import('./config/verdicts.js'), G = await import('./config/games.js');
      const R = await import('./progress/rules.js').catch(() => null);
      const HD = (await import('./games/estimate/index.js')).default;
      const spend = e => { HD.ctx = { mode: 'grow' }; return HD.spendOf(e); };
      const spendCut = e => { HD.ctx = { mode: 'cut' }; return HD.spendOf(e); };
      return { round: V.ROUND_AT['hold:grow'], setAt: V.VERDICTS['hold'].at, cutAt: V.VERDICTS['hold:cut'].at,
        free: G.ESTIMATE.GROW_FREE, bud: G.ESTIMATE.STREAK_BUD,
        // the % off each `at` fraction stands for, on Estimate's own 40 scale
        setOff: V.VERDICTS['hold'].at.map(a => Math.round((1 - a) * 40 * 10) / 10),
        grow: [0, 2, 4, 6, 12, 30].map(e => [e, spend(e)]), cut: [0, 4, 12].map(e => [e, spendCut(e)]),
        tierReadsRaw: V.ROUND_AT['hold:grow'][0] }; });
    const wantRound = [4, 8, 15], wantOff = [7, 12, 30];
    const growSpend = Object.fromEntries(g60.grow), cutSpend = Object.fromEntries(g60.cut);
    (JSON.stringify(g60.round) === JSON.stringify(wantRound) && JSON.stringify(g60.setOff) === JSON.stringify(wantOff)
      && g60.free === 4 && g60.bud === 100
      && growSpend[0] === 0 && growSpend[2] === 0 && growSpend[4] === 0 && growSpend[6] === 2 && growSpend[12] === 8 && growSpend[30] === 26
      && cutSpend[0] === 0 && cutSpend[4] === 4 && cutSpend[12] === 12
      && JSON.stringify(g60.cutAt) === JSON.stringify([.8875, .8, .625]))
      ? ok(`60.4 (L5) Grow is looser: per-round ceilings ${wantRound.join(' / ')}% off (were 2 / 5 / 10), a Set's Amazing / Great / Good at ${wantOff.join(' / ')}% off over the 40 scale (were 5 / 10 / 30), and a Grow STREAK spends max(0, err − 4)% of the unchanged 100% budget — 6% costs 2, 12% costs 8, 30% costs 26 — while CUT still spends its error whole and keeps its own thresholds`)
      : bad('60.4 Grow verdicts and the Streak allowance', JSON.stringify(g60)); }
  // 3.10: Dots · Lead is set up before the run starts; Blind is not. Sampled during the 3-2-1, before #game.live
  /* AMENDED AT BUILD 53 (v28 item 7): BOTH MODES now show their first dot under the 3-2-1, not Lead alone. Build 26 (v15 3.10) did Lead only and
     left Blind "untouched, by intent"; Aiden asked for every Quick Tap and Dots mode, and Blind is not an exception — blind means no LEAD RING,
     not no dot ("Tap the dots as they appear"). The lead RING is still Lead's alone, which is what `lead` reads back below. */
  for (const [mode, want] of [['lead', true], ['blind', true]]) {
    const seen = await page.evaluate(async d => {
      const RUN = await import('./run/run.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
      S.store.intro['dots:' + d] = Date.now(); S.save();
      Object.assign(ST.sel, { game: 'dots', diff: d, secs: 15, vs: 0, practice: 0 });
      RUN.start();
      return new Promise(res => setTimeout(() => res({
        dot: document.getElementById('dot').classList.contains('on'),
        lead: document.getElementById('lead').classList.contains('on'),
        live: document.getElementById('game').classList.contains('live') }), 720)); }, mode);
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
    if (seen.live) bad(`3.10 sampling Dots · ${mode} under the 3-2-1`, 'the run was already live');
    else if (seen.dot === want && seen.lead === (mode === 'lead')) ok(`3.10 / v28 item 7 Dots · ${mode === 'lead' ? 'Lead' : 'Blind'} shows its first dot on "1", before the run starts — with its lead ring ${mode === 'lead' ? 'beside it' : 'withheld, which is the whole of what Blind means'}`);
    else bad(`3.10 Dots · ${mode} under the 3-2-1`, JSON.stringify(seen));
  }
  /* build 48 (v26 item 1): a solo Go / No-go SET shows the big counter and the goal box and nothing else - no "round 1 of 5 · 0 of 3" on the right,
     no "Go / No-go · Set" on the left. A Streak keeps its budget line */
  {
    const hud48 = async li => { await openSheet('reaction', 1, li); await click('#go-btn');
      let seen = null; for (let i = 0; i < 80 && !seen; i++) { await sleep(150); await clearReady('reaction'); seen = await page.evaluate(() => document.querySelector('#rxpane') && document.getElementById('game').classList.contains('live') ? { mode: document.getElementById('hud-mode').textContent.trim(), time: document.getElementById('hud-time').textContent.trim(), score: document.getElementById('score').textContent.trim() } : null); }
      await sleep(900); const later = await page.evaluate(() => ({ mode: document.getElementById('hud-mode').textContent.trim(), time: document.getElementById('hud-time').textContent.trim(), score: document.getElementById('score').textContent.trim() }));
      await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300); return { seen, later }; };
    const set48 = await hud48(0), streak48 = await hud48('streak');
    (set48.seen && !set48.seen.mode && !set48.seen.time && !set48.later.mode && !set48.later.time && /^\d+\/\d+$/.test(set48.later.score) && streak48.later.time)
      ? ok(`v26 item 1 Go / No-go · Set shows "${set48.later.score}" and the goal box alone - no round line, no mode label - and the Streak keeps "${streak48.later.time}"`)
      : bad('v26 item 1 the Go / No-go Set HUD', JSON.stringify({ set48, streak48 }));
  }
  /* build 50 (v26 §B2, ARCHITECTURE.md A9): THE SHAPE DIFFICULTY STANDARD and the round formats it deals. The data and the deal are
     driven off config/shapes.js and the dealer over 300 runs, each engine's own dealing function is called for real, and one live round
     of Go / No-go, Find and a Hidden Streak is played on the page. Nothing here reads how a source file is spelled */
}
