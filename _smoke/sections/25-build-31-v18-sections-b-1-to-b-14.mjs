/* ---- 12. build 31 (v18 §B.1–§B.14): the runs ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, section, check, ok, bad, root, read, at, page, until, onScreen, click, setStorage, SEEN_INTRO, down, up, skipAd, verdict, finish, clearReady, driveToResult, keySettle, openSheet } from '../lib/gate.mjs';

export const SECTION = ["build 31 - v18 sections B.1 to B.14"];

export async function run() {
  const UN31 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const AU31 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const G31 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB31 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const VD31 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const rx31 = read('games', 'reaction', 'index.js');
  const tm31 = read('games', 'timing', 'index.js');
  const run31 = read('run', 'run.js');
  const pg31 = read('progress.js');

  /* ---- B.8: a LENGTH rung may only be judged mid-run when its test can only become MORE true. The Flash Streak rung
     is "a Set averaging over 500ms" and Reaction emits its running average as `hits`, so one slow attempt made it true
     on attempt one. LEN_LIVE is the flag lengths never had; this is the row that has to be 0. ---- */
  {
    const live = UN31.LEN_LIVE || {};
    const rows = Object.keys(UN31.LEN_RULES);
    const missing = rows.filter(k => !live[k]);
    const flashLive = (live['reaction:flash'] || [])[1];
    (!missing.length && !flashLive) ? ok('B.8 every LEN_RULES row declares which rungs are live, and Reaction · Flash’s Streak is not one of them')
      : bad('B.8 LEN_LIVE covers the table and the average rung is not live', JSON.stringify({ missing, flashLive }));
    // and the code asks it: lenNextLive returns nothing for a rung LEN_LIVE has not flagged
    const asks = /LEN_LIVE\[g\+':'\+d\]\|\|\[\]\)\[i\+1\]/.test(pg31.replace(/\s+/g, ''), '') || /LEN_LIVE/.test(pg31);
    asks ? ok('B.8 lenNextLive reads LEN_LIVE before it hands a test to the mid-run pass')
      : bad('B.8 lenNextLive consults LEN_LIVE');
  }
  {
    // the behaviour, in the page: the Flash rung has no live test, a monotone rung still does
    await setStorage({ ne: { v: 2, prefs: { story: 1, played: 1, gridSeen: 1, menuSeen: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const live31 = await page.evaluate(async () => { const P = await import('./progress.js');
      return { flash: !!P.lenNextLive('reaction', 'flash', 5), qt: !!P.lenNextLive('quick-tap', 'two', 5), cut: !!P.lenNextLive('hold', 'cut', 10) }; });
    (!live31.flash && live31.qt && live31.cut) ? ok('B.8 mid-run: the Flash Set offers no live rung; Quick Tap’s and Estimate · Cut’s still do')
      : bad('B.8 only monotone rungs are judged mid-run', JSON.stringify(live31));
    // the second half: an announced length is BANKED, so the announcement and the store can never disagree again
    const bank31 = await page.evaluate(async () => { const P = await import('./progress.js');
      const was = !!P.lenLock('reaction', 'flash', -1); P.bankLen('reaction:flash:-1');
      const now = !!P.lenLock('reaction', 'flash', -1);
      return { was, now, stored: !!JSON.parse(localStorage.getItem('ne')).unlock['reaction:flash:-1'] }; });
    (bank31.was && !bank31.now && bank31.stored) ? ok('B.8 a length earn is written to the store the moment it fires, and lenLock reads it back — quitting cannot lose it')
      : bad('B.8 an announced length survives a quit', JSON.stringify(bank31));
    // and the run banks it on the live path as well as at the finish
    (/bankLen\(R\.lenNext\.key\)/.test(run31) && /for\(const f of freshLen\) bankLen\(f\.key\)/.test(run31))
      ? ok('B.8 run/run.js banks a length on the mid-run announcement and again at the finish')
      : bad('B.8 the run banks what it announces');
  }

  /* ---- B.1: Go / No-go, four parts ---- */
  {
    const RXC = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { per: R.GO_PER, pad: R.GO_PAD, spread: R.GO_SPREAD, gapMin: R.GO_GAP_MIN, gapMax: R.GO_GAP_MAX, max: R.FLASH_MAX, ruleEvery: R.RULE_EVERY }; });
    // AMENDED at build 32 (v19 C.2): GO_PAD / GO_SPREAD went with the fixed-length block; the round is GO_PER gaps-and-a-target
    (RXC.per === 3 && RXC.pad === undefined && RXC.spread === undefined && RXC.gapMin >= 1 && RXC.gapMax > RXC.gapMin && RXC.ruleEvery === undefined)
      ? ok(`B.1b / C.2 a Go / No-go round is ${RXC.per} correct taps of one shape behind ${RXC.gapMin}–${RXC.gapMax} decoys each; RULE_EVERY, GO_PAD and GO_SPREAD are retired`)
      : bad('B.1b the round constants', JSON.stringify(RXC));
    // B.1c: no wrong-tap run-ender is left anywhere in the engine, in either length
    const enders = [...rx31.matchAll(/[^\n]*wrong\s*>=\s*3[^\n]*/g)].map(m => m[0].trim()).filter(l => !/^[/*]/.test(l));
    (!enders.length && !/nogoEnd\(true\)/.test(rx31) && /const cost=this\.streak\(\)\?this\.NOGO_WRONG_STREAK:this\.NOGO_WRONG_SET/.test(rx31))
      ? ok('B.1c the three-wrong-taps run-ender is gone from both lengths, and a wrong tap shows what it cost')
      : bad('B.1c a wrong tap is only a millisecond penalty', enders.join(' | ') || 'the cost is not shown');
    // and the mode line no longer promises the ender
    /Three wrong taps/.test(G31.GAMES.reaction.nogo) ? bad('B.1c the mode line stops promising an ender', G31.GAMES.reaction.nogo)
      : ok(`B.1c the mode line says what a round is — "${G31.GAMES.reaction.nogo}"`);
  }
  {
    // B.1d: 400 dealt rounds. The first shape is NEVER the target, there are exactly GO_PER of them, no shape three
    // running and no decoy repeated. #375b's gate, amended rather than replaced
    const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      R.ctx = { mode: 'nogo', len: 5 }; R.rule = 'circle';
      const out = { n: 0, first: 0, wrongCount: 0, thrice: 0, dup: 0, lens: {} };
      for (let i = 0; i < 400; i++) { const b = R.dealRound(); out.n++;
        out.lens[b.length] = (out.lens[b.length] || 0) + 1;
        if (b[0] === R.rule) out.first++;
        if (b.filter(s => s === R.rule).length !== R.GO_PER) out.wrongCount++;
        for (let j = 2; j < b.length; j++) if (b[j] === b[j - 1] && b[j] === b[j - 2]) out.thrice++;
        for (let j = 1; j < b.length; j++) if (b[j] !== R.rule && b[j] === b[j - 1]) out.dup++; }
      R.ctx = null; return out; });
    (!d.first && !d.wrongCount && !d.thrice && !d.dup)
      ? ok(`B.1d 400 dealt rounds (dealRound since build 32): the target is never the first shape, always exactly 3 of them, no shape three running, no decoy repeated (lengths ${JSON.stringify(d.lens)})`)
      : bad('B.1d the dealing gate, amended', JSON.stringify(d));
    /* B.1a (the instruction arrives whole) was a source-text check spelling rulePause's rxBar call with SHAPE_WORD. DELETED at build 50 (site/CLAUDE.md →
       The gate): SHAPE_WORD retired into config/shapes.js. The runs section drives the rule bar on the page since build 50 */
  }
  {
    // B.1b as behaviour: a Go / No-go Set is five rounds of three, and the HUD says which round you are in
    await openSheet('reaction', 1, 0);
    await click('#go-btn');
    let hudSeen = '';
    // a Go / No-go Set is five rounds of five to seven shapes on an 800ms beat, plus an instruction and a wait each:
    // about forty seconds, where build 30’s was under ten. The loop has to outlast it
    // build 32 (v19 §C): a round is 6–18 shapes on a 980ms ± 180 dwell, so a Set runs about eighty seconds; the loop outlasts it
    for (let i = 0; i < 3200; i++) { const at = await onScreen(); if (at === 's-over') break;
      if (await skipAd()) continue;
      if (await clearReady('reaction')) continue;
      const st = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
        return { lit: R.st === 'go', hud: document.getElementById('hud-time').textContent.trim(), round: R.round, dealt: R.goDealt }; });
      if (st.hud) hudSeen = st.hud;
      if (st.lit) await down('#gen');
      await sleep(45); }
    const end = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { round: R.round, dealt: R.goDealt, score: document.querySelector('#over-score').textContent.trim() }; });
    // AMENDED at build 48 (v26 item 1): the Set's round line is gone - the big counter says how far through a player is
    (end.round === 5 && end.dealt === 15 && hudSeen === '')
      ? ok('B.1b a Go / No-go Set is 5 rounds × 3 target shapes — 15 dealt, and no round line on the HUD at any point (v26 item 1)')
      : bad('B.1b five rounds of three correct taps', JSON.stringify({ ...end, hudSeen }));
  }

  /* ---- B.2 / B.3 / B.13: Stopwatch Set and Streak ---- */
  {
    const tm = await page.evaluate(async () => { const M = await import('./games/timing/index.js'); const T = M.default;
      const save = T.ctx;
      T.ctx = { mode: 'stopwatch', len: 5 }; T.errs = [0.10, 0.20, 0.30, 0.40, 0.50];
      const setScore = T.result().hits;
      T.ctx = { mode: 'stopwatch', len: -1 }; T.round = 1; const b1 = T.budget(); T.round = 11; const b11 = T.budget();
      const ramp = [1, 2, 3, 10, 14].map(r => T.rampAt(r));
      T.ctx = { mode: 'hidden', len: -1 }; const hidBud = T.budget(), hidTxt = T.budTxt();
      T.ctx = save; T.errs = [];
      return { setScore, b1, b11, ramp, hidBud, hidTxt }; });
    (Math.abs(tm.setScore - 1.5) < 1e-9) ? ok(`B.2 Timing · Stopwatch · Set is the SUM of its rounds — 0.10+0.20+0.30+0.40+0.50 scores ${tm.setScore}, not 0.30`)
      : bad('B.2 the Stopwatch Set is cumulative', 'five rounds summing to 1.50 scored ' + tm.setScore);
    (tm.b1 === 5 && tm.b11 === 7.5) ? ok('B.3a the Stopwatch Streak budget is 5s, 7.5s past round 10 (was 25 / 30)')
      : bad('B.3a the Streak budget', JSON.stringify([tm.b1, tm.b11]));
    const climbs = tm.ramp.every((v, i) => i === 0 || v > tm.ramp[i - 1]) && Math.abs(tm.ramp[0] - 2.5) < .45 && tm.ramp[4] > 14;
    climbs ? ok(`B.3b the targets climb a whole second a round and are never held — ${tm.ramp.map(v => v.toFixed(2)).join('s, ')}s at rounds 1, 2, 3, 10, 14`)
      : bad('B.3b +1.0s a round, no hold', JSON.stringify(tm.ramp));
    (tm.hidBud === 700 && /ms$/.test(tm.hidTxt)) ? ok(`B.4 Timing · Hidden’s budget is ${tm.hidTxt} — 100px converted at the ball’s measured pace and rounded to a hundred`)
      : bad('B.4 the Hidden budget is milliseconds', JSON.stringify([tm.hidBud, tm.hidTxt]));
  }
  {
    // B.3c / B.7: both add-ups hold before they drain, on one shared number
    /* DELETED and REPLACED at build 60: the two clauses here were REGEXES AGAINST HOW drainUp AND flashDrain ARE CALLED, and 60.12
       gave drainUp a third argument (the raw miss, so the round's word can read it while the total spends less than it). The gate's
       own rule is to delete a source-text check rather than re-spell it, so the FACT is DRIVEN now instead: each engine's own add-up
       is called with a stub that records what delay it schedules. That proves the hold, proves it is CFG.hold, and proves both
       engines are on the one number, without caring how either line is written. */
    const held31 = await page.evaluate(async () => {
      const TM = (await import('./games/timing/index.js')).default, RX = (await import('./games/reaction/index.js')).default;
      const at = [], stub = { st: 'show', later(f, ms) { at.push(ms); }, drainUp() {}, flashDrain() {} };
      TM.addUp.call(stub, 120, true, 170); RX.flashAdd.call(stub, 120);
      return at; });
    (G31.CFG.hold === 800 && held31.length === 2 && held31.every(ms => ms === G31.CFG.hold))
      ? ok(`B.3c / B.7 the round's figure holds ${G31.CFG.hold}ms before it drains — one number, Timing and Reaction on the same beat, each driven through its own add-up (${held31.join('ms, ')}ms)`)
      : bad('B.3c / B.7 the hold before the drain', JSON.stringify({ hold: G31.CFG.hold, held31 }));
    // B.3d / B.13: every Streak says what it is spending and what the budget is, and the Stopwatch score is the spend
    (/spentOf:'\{tot\} \/ \{bud\}s'/.test(read('config', 'copy.js'))
      && /streakScore\(\)\{ return this\.hid\(\)\?String\(this\.errs\.length\):this\.spentLine\(\); \}/.test(tm31))
      ? ok('B.3d the Stopwatch Streak’s big number is the time spent out of the budget, not the round "attempt N" already names')
      : bad('B.3d the Streak score is the spend');
  }

  /* ---- B.4 / B.5: Hidden in milliseconds, and the Streak’s variation ---- */
  {
    const ms = /const off=\(b\.t-b\.markT\)\/b\.v\*1000/.test(tm31);
    const cfgOk = G31.HIDDEN.band > 0 && G31.HIDDEN.tilt > 0 && G31.HIDDEN.far > 0;
    /* AMENDED at build 45 (v25 item 21): the three variations moved into TM.hiddenRamp(round, vary) — expression for expression.
       DELETED AT BUILD 60 (v31 60.11): `varies` was a SOURCE-TEXT check — nine regexes against how hiddenRamp is spelled — and
       60.11 rewrote that function, so it failed on the refactor. The gate's own rule is to DELETE such a check and name it in the
       outcome rather than re-spell it, and the FACT it stood for is asserted better elsewhere now: 60.11 in "the runs" drives
       hiddenRamp itself at ten rounds and checks the pace, the angled-wall share and the tilt against the numbers in config, and
       asserts a SET draws none of them; the live 45° check in that same section drives four real Streak rounds and a real Set. */
    (ms && cfgOk) ? ok(`B.4 / B.5 Hidden scores the TIME between ball and marker, and a Streak varies its pace (±${G31.HIDDEN.band * 100}%), its angle (to ${G31.HIDDEN.tilt}°) and its distance (+${G31.HIDDEN.far * 100}% a round) — the variation's own shape is 60.11's check in "the runs" since build 60`)
      : bad('B.4 / B.5 milliseconds and the variation', JSON.stringify({ ms, cfgOk }));
    // nothing anywhere still calls Hidden pixels
    const pxLeft = [['config/games.js', G31.GAMES.timing.per.hidden.suffix], ['config/key-bars.js', KB31.KEY_BARS['timing:hidden:10'].unit]].filter(([, v]) => /px/.test(String(v)));
    // AMENDED at build 44 (v24 §E): the conversions stood until Aiden set both bars himself — 1500ms and 2.5s, in the converted units
    (!pxLeft.length && KB31.KEY_BARS['timing:hidden:10'].bar === 1500 && KB31.KEY_BARS['timing:stopwatch:5'].bar === 2.5 && KB31.KEY_BARS['timing:hidden:10'].unit === 'ms total')
      ? ok('B.2 / B.4 no pixel unit is left on Hidden, and both Timing Set bars are Aiden’s own in the new units — 1500ms total, 2.5s total (v24 §E)')
      : bad('B.4 no pixel unit is left on Hidden', JSON.stringify(pxLeft));
  }

  /* ---- B.6: the Flash Set scores a slow attempt instead of throwing it away ---- */
  {
    const cp31 = read('config', 'copy.js');
    const gone = !/\bslow:'too slow'/.test(cp31) && !/again:'try again/.test(cp31) && !/fault\(msg\)/.test(rx31);
    gone ? ok('B.6 "too slow" and "try again · attempt N of 5" are gone with the retake — fault() has no callers and no copy')
      : bad('B.6 the Flash Set has no retake');
    await openSheet('reaction', 0, 0);
    await click('#go-btn');
    const at = await driveToResult('reaction', 'B.6 Flash Set, never tapping', 60000, true);
    if (at === 's-over') { const sc = await page.evaluate(() => document.querySelector('#over-score').textContent.trim());
      /^1000/.test(sc) ? ok('B.6 five attempts, none tapped: every one scores 1000ms and counts — the Set reads 1000ms')
        : bad('B.6 an attempt over 1000ms scores 1000ms and counts', 'the Set scored ' + sc); }
  }

  /* ---- B.9: the flow line and the single unchanging hum ---- */
  {
    (AU31.FLOW_AT === 2.7 && AU31.FLOW_SPAN === undefined && /const want=tps>=FLOW_AT\?1:0/.test(run31))
      ? ok('B.9 the flow line is 2.7 taps a second and the hum is one sound — on or off, with FLOW_RISE / FLOW_FALL fading the switch')
      : bad('B.9 flow at 2.7, one unchanging sound', JSON.stringify({ at: AU31.FLOW_AT, span: AU31.FLOW_SPAN }));
  }

  /* ---- B.10 / B.11: the tier on the number, and one set of tier sounds ---- */
  {
    const tiers = VD31.VERDICT_TIERS.map(t => t.id);
    const rounds = Object.keys(VD31.ROUND_AT);
    const fxOk = tiers.every(id => (AU31.VERDICT_FX[id] || []).length) && Object.keys(AU31.VERDICT_FX).length === tiers.length;
    const audio31 = read('audio.js');
    const noPerGame = /verdict\(id\)\{[^}]*VERDICT_FX\[id\]/.test(audio31) && !/VERDICT_FX\[[^\]]*g\s*\+/.test(audio31);
    (fxOk && noPerGame) ? ok(`B.11 one sound set for every game — ${tiers.join(', ')} in VERDICT_FX, and audio.js keys it by tier alone with nothing per game`)
      : bad('B.11 the tier sounds are one standard set', JSON.stringify({ fxOk, noPerGame }));
    // every round-based combination has a row, and the colours are the verdict's own four
    const want31 = ['timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'hold:grow', 'hold:cut', 'spot:count', 'spot:find'];
    const missR = want31.filter(k => !(VD31.ROUND_AT[k] || []).length);
    const sorted = want31.every(k => { const a = VD31.ROUND_AT[k]; return a && a.length === 3 && a[0] <= a[1] && a[1] <= a[2]; });
    (!missR.length && sorted && rounds.length === want31.length)
      ? ok(`B.10 all ${rounds.length} round-based combinations carry their own three cut-offs, each a ceiling on the round’s own figure`)
      : bad('B.10 ROUND_AT covers the round games', JSON.stringify({ missR, sorted }));
  }
  {
    // the colour, in the page: the result’s score, that run’s row on the board, and the round card it came from
    await openSheet('timing', 0, 0);
    await click('#go-btn');
    let roundCol = '';
    for (let i = 0; i < 400; i++) { const at = await onScreen(); if (at === 's-over') break;
      if (await skipAd()) continue;
      if (await clearReady('timing')) continue;
      const c = await page.evaluate(() => { const e = document.getElementById('tmerr'); return e ? e.style.color : ''; });
      if (c) roundCol = c;
      if (await page.evaluate(() => !!document.querySelector('#tmclock'))) await down('#gen');
      await sleep(45); }
    await keySettle();
    const cols = await page.evaluate(() => ({ score: document.getElementById('over-score').style.color,
      verdict: document.getElementById('verdict').style.color,
      row: (document.querySelector('#over-runs tr.cur td:nth-child(3)') || {}).style?.color || '' }));
    (cols.score && cols.score === cols.verdict && cols.row === cols.score && roundCol)
      ? ok(`B.10 the tier colour is on the NUMBER — the result score, that run’s row on the board and each round’s own figure (${cols.score})`)
      : bad('B.10 the tier colour follows the number', JSON.stringify({ ...cols, roundCol }));
  }

  /* ---- B.12: an unlock toast goes there ---- */
  {
    const toast31 = read('ui', 'toast.js');
    /* DELETED at build 49 (site/CLAUDE.md -> The gate): the result.js half, which spelled the toast list's tuple `[unlockToast(u.key),'','ok',false,u.key]`
       and failed when §B1 added a sixth field (the game whose map sound follows its unlock toast). The toast.js and run.js halves stand */
    const midRun = /toast\(unlockToast\(x\.key\),'','ok'\)/.test(run31) && !/toast\(unlockToast\(x\.key\),'','ok',[^)]/.test(run31);
    (/dataset\.goto/.test(toast31) && /unlockWhere/.test(toast31) && midRun)
      ? ok('B.12 an unlock toast knows where it leads and opens that pick sheet; mid-run it stays a toast')
      : bad('B.12 tapping an unlock toast goes there', JSON.stringify({ midRun }));
    // and it actually navigates
    const went = await page.evaluate(async () => { const { toast } = await import('./ui/toast.js');
      toast('Unlock: Streak', '', 'ok', false, 'reaction:flash:-1');
      document.getElementById('toast').click(); await new Promise(r => setTimeout(r, 400));
      return { at: (document.querySelector('.screen.on') || {}).id, sheet: document.getElementById('sheet-title')?.textContent.trim() }; });
    (went.at === 's-pick') ? ok(`B.12 tapping it lands on the pick sheet — "${went.sheet}"`)
      : bad('B.12 the toast navigates', JSON.stringify(went));
  }

  /* ---- B.14: the 600 cap never drops a top-10 row ---- */
  {
    const NOW31 = Date.now();
    const many = Array.from({ length: 600 }, (_, i) => ({ t: NOW31 - 10000 - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 40 - (i % 30), misses: 0, row: 3 }));
    const rare = { t: NOW31 - 9999999, g: 'hold', d: 'grow', s: 7, n: '', v: 3, hits: 4.2, misses: 0, x: 1, y: 9 };
    await setStorage({ ne: { v: 2, prefs: { story: 1, played: 1, gridSeen: 1, menuSeen: 1, snd: 'off', musicG: {} }, runs: many.concat([rare]), ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const cap = await page.evaluate(async () => { const P = await import('./progress.js');
      const before = P.Scores.runs().filter(r => r.g === 'hold').length;
      for (let i = 0; i < 25; i++) P.Scores.submit({ t: Date.now() + i, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 11 + i, misses: 0, row: 3 });
      const runs = P.Scores.runs();
      return { before, after: runs.filter(r => r.g === 'hold').length, total: runs.length,
        top: P.Scores.of('quick-tap', 'two', 5).slice(0, 10).map(r => r.hits) }; });
    (cap.before === 1 && cap.after === 1 && cap.total <= 600 && cap.top[0] >= 40)
      ? ok(`B.14 601 runs, 25 more submitted: the one Estimate run — the oldest row in the store and its mode’s whole top ten — survives, and the store is back under the cap (${cap.total})`)
      : bad('B.14 the cap never drops a top-10 row', JSON.stringify(cap));
  }
}
