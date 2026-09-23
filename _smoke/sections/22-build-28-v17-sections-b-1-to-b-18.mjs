/* ---- 9. build 28 (v17 §B.1-§B.18): the chain and the scoring ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, names, section, check, ok, bad, finished, root, read, strip, at, page, setStorage, OPEN_PREFS, SEEN_INTRO, up, finish } from '../lib/gate.mjs';

export const SECTION = ["build 28 - v17 sections B.1 to B.18"];

export async function run() {
  const G28 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const U28 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const A28 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  const C28 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const KB28 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);

  // ---- B.9: five keys is gone from every table that could still offer it ----
  {
    const sq = G28.GAMES.sequence;
    const bad5 = [];
    if (sq.lens.includes(5)) bad5.push('GAMES.sequence.lens');
    if ((sq.vsLens || []).includes(5)) bad5.push('GAMES.sequence.vsLens');
    if (KB28.KEY_BARS['sequence:solo:5']) bad5.push('KEY_BARS');
    if ((U28.LEN_RULES['sequence:solo'] || []).length !== sq.lens.length) bad5.push('LEN_RULES rung count');
    const ach5 = A28.ACH.filter(a => a.g === 'sequence' && a.at && a.at.s === 5).map(a => a.id);
    if (ach5.length) bad5.push('ACH ' + ach5.join('/'));
    bad5.length ? bad('B.9 Sequence drops 5 keys everywhere', bad5.join(', '))
      : ok(`B.9 Sequence is ${sq.lens.join(' and ')} keys - solo, pass & play and versus, with no bar, no rung and no achievement left on five`);
  }
  // B.9: no literal 31 survives anywhere the count is stated
  {
    // build 29: unlocks.js is the Unlocks TAB of ui/screens/progress.js now (B.21), and it is still one of the four
    const files = ['progress/key.js', 'ui/screens/key.js', 'ui/screens/progress.js', 'ui/screens/menu.js'];
    const hits = files.filter(f => /\b31\b|thirty-one/i.test(strip(read(f))));
    hits.length ? bad('B.9 no literal 31 in the code that prints the count', hits.join(', '))
      : ok(`B.9 the count is read from the config in all ${files.length} files that print it - none of them knows a number`);
  }
  // B.9: a profile carrying 5-key runs boots, counts them toward nothing, and crashes nothing
  {
    // NB: no allOpen - lenLock returns null the moment it is set, and this check is about what a length asks for
    const old5 = { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [
      { t: Date.now(), g: 'sequence', d: 'solo', s: 5, hits: 14, misses: 0, v: 2 },
      { t: Date.now() - 1, g: 'sequence', d: 'solo', s: 3, hits: 4, misses: 0, v: 2 }],
      ach: {}, unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1 },
      intro: SEEN_INTRO, seen: {}, bars: { 'sequence:solo:5': Date.now() } };
    await setStorage({ ne: old5 });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const r = await page.evaluate(async () => {
      const K = await import('./progress/key.js'); const P = await import('./progress.js'); const S = await import('./core/store.js');
      return { screen: document.querySelector('.screen.on')?.id, runs: S.store.runs.length,
        combos: K.COMBOS.filter(c => c.g === 'sequence').map(c => c.s),
        orphan: K.barsOrphan(), missing: K.barsMissing(), pct: K.keyPct(),
        sevenOpen: !P.lenLock('sequence', 'solo', 7, true) };
    });
    (r.screen && r.runs === 2 && r.combos.join(',') === '3,7' && !r.orphan.length && !r.missing.length)
      ? ok(`B.9 a profile with 5-key runs boots clean - both runs kept, Sequence contributes ${r.combos.join(' and ')}, nothing orphaned`)
      : bad('B.9 stored 5-key runs count toward nothing and crash nothing', JSON.stringify(r));
    // the ladder is: 5 keys is gone, so a 14-round run at five does NOT open 7 keys - only 8 notes in 3 does
    (!r.sevenOpen) ? ok('B.9 a 5-key run no longer opens 7 keys - the rung is 8 notes in 3 keys now')
      : bad('B.9 a retired 5-key run must open nothing', 'it opened 7 keys');
  }

  // ---- B.4: no demo, ghost or scripted run earns anything ----
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, allOpen: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    const d = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { game: 'hold', diff: 'grow', secs: 7, vs: 0, practice: 0 });
      RUN.start();                                   // a fresh profile, so the first-play ghost plays a real round
      let sawDemo = false;
      const answerReady = () => { const el = document.getElementById('intro'); if (el && el.classList.contains('ready')) { RUN.introTap(); return true; } return false; };
      for (let i = 0; i < 60; i++) { if (RUN.R.demo) sawDemo = true; if (sawDemo && !RUN.R.demo) break; if (sawDemo) answerReady(); await wait(100); }
      // while the ghost has the engine, a record that WOULD earn "On the money" (live:1, one round within 2%) earns nothing
      // AMENDED at build 44 (v24 D.2): "On the money" is a key roster row now, earned by a bar and never live - the live thing this record
      // earns is the chain's Cut unlock (one Grow round within 15%), so both stores are read
      const during = (() => { if (!RUN.R.demo) return null; RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 }); return Object.keys(S.store.ach).concat(Object.keys(S.store.unlock)); })();
      for (let i = 0; i < 90 && RUN.R.demo; i++) { answerReady(); await wait(100); }
      const afterDemo = { ach: Object.keys(S.store.ach), unlock: Object.keys(S.store.unlock), bars: Object.keys(S.store.bars), runs: S.store.runs.length };
      // and the same record, once the demo has handed over, DOES earn it - or this test proves nothing
      RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 });
      const afterReal = Object.keys(S.store.ach).concat(Object.keys(S.store.unlock));
      RUN.abort();
      return { sawDemo, during, afterDemo, afterReal };
    });
    if (!d.sawDemo) bad('B.4 the first-play demo runs at all', 'R.demo never went true');
    else if (d.during && d.during.length) bad('B.4 a demo earns nothing mid-run', 'it banked ' + d.during.join(', '));
    else if (d.afterDemo.ach.length || d.afterDemo.unlock.length || d.afterDemo.bars.length || d.afterDemo.runs)
      bad('B.4 a whole first-play demo writes nothing to the store', JSON.stringify(d.afterDemo));
    else if (!d.afterReal.includes('hold:cut')) bad('B.4 the same record earns normally once the demo hands over', JSON.stringify(d.afterReal));
    else ok('B.4 the first-play ghost advances no key, bar, unlock, achievement or board - and the same record earns the moment it is the player');
  }

  // ---- B.5: a length unlock announces, in every game with a rung and every game without one ----
  {
    const announced = [], silent = [];
    for (const [g, d, s] of [['quick-tap', 'two', 5], ['dots', 'blind', 5], ['hold', 'cut', 10], ['reaction', 'flash', 5]]) {
      await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [],
        ach: {}, unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1, 'timing:stopwatch': 1, 'timing:hidden': 1, 'reaction:flash': 1 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      const r = await page.evaluate(async (g, d, s) => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
        Object.assign(ST.sel, { game: g, diff: d, secs: s, vs: 0, practice: 0 });
        RUN.start();
        const next = RUN.R.lenNext;
        if (!next) { RUN.abort(); return { none: true }; }
        // a record that passes the rung, whatever the rung is
        // deliberately modest: a record that ALSO earns an achievement raises a second toast over the first, which is
        // real behaviour mid-run and would make this assertion read the wrong line
        const rec = { 'quick-tap:two': { hits: 18, misses: 2, row: 7 }, 'dots:blind': { hits: 18, misses: 2, row: 6 },
          'hold:cut': { hits: 5, y: 44 }, 'reaction:flash': { hits: 600 } }[g + ':' + d];
        RUN.liveCheck(rec);
        const t = document.getElementById('toast');
        const out = { key: next.key, on: t.classList.contains('on'), ok: t.classList.contains('ok'), text: t.textContent.trim(), fresh: RUN.R.fresh.slice() };
        RUN.abort(); return out;
      }, g, d, s);
      /* v18 (B.8) AMENDS THIS. B.5 gave every length rung a mid-run announcement; B.8 found that `lenNextLive` handed it
         EVERY LEN_TEST, monotone or not, and Reaction · Flash's rung is "a Set averaging over 500ms" — a whole-run claim
         that one slow attempt made true. `LEN_LIVE` is the flag, and Flash is the one row that carries 0. So "no live
         rung" is now the RIGHT answer for Flash and the wrong one for the other three, and the check says which. */
      const wantLive = !(g === 'reaction' && d === 'flash');
      if (r.none) (wantLive ? silent : announced).push(`${g}:${d} ${wantLive ? '(no live rung)' : 'correctly silent mid-run — B.8'}`);
      else if (!wantLive) silent.push(`${g}:${d} announced mid-run off a running average — B.8 says it must not`);
      else if (r.on && r.ok && /^Unlock/.test(r.text) && r.fresh.includes(r.key)) announced.push(`${g} "${r.text}"`);
      else silent.push(`${g}:${d} ${JSON.stringify(r)}`);
    }
    silent.length ? bad('B.5 a length unlock fires the green toast the moment it is met', silent.join(' | '))
      : ok(`B.5 / B.8 every MONOTONE length rung announces mid-run, and the one whose test is a whole-run average does not - ${announced.join(', ')}`);
  }
  // B.5: and the default "finish one run of the length before" rule lands at the FINISH, on the result screen
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: { 'quick-tap:two': 1, 'quick-tap': 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const r = await page.evaluate(async () => {
      const P = await import('./progress.js');
      const before = P.lenOpen('quick-tap', 'two', 15);
      const n = P.lenNextOf('quick-tap', 'two', 5);
      // a finished Sprint with 7 in a row opens Dash: the rung has a LEN_TEST, so it is the live kind
      const live = P.lenNextLive('quick-tap', 'two', 5);
      // Sequence's 7-keys rung is the live kind too; Estimate · Grow's Streak is the DEFAULT kind and has no live form
      const dflt = { next: !!P.lenNextOf('hold', 'grow', 7), live: !!P.lenNextLive('hold', 'grow', 7) };
      return { before, key: n && n.key, live: !!live, dflt };
    });
    (!r.before && r.key === 'quick-tap:two:15' && r.live && r.dflt.next && !r.dflt.live)
      ? ok('B.5 lenNextOf names the rung above any combination; lenNextLive answers only where a LEN_TEST can judge a partial run (Estimate Grow Streak correctly has no mid-run answer)')
      : bad('B.5 the two halves of a length unlock', JSON.stringify(r));
  }

  // ---- B.10: the Customise lock check, and what was actually leaking ----
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, supporter: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const S = await import('./core/store.js'); const P = await import('./progress.js'); const { ITEMS } = await import('./config/theme.js');
      const was = S.prefs.supporter;
      S.reset(); P.seedSeen();
      const nowSup = S.prefs.supporter, nowOpen = S.prefs.allOpen;
      const shouldLock = Object.values(ITEMS).flat().filter(i => i.by).length;
      const seen = S.store.seen || {};
      // AMENDED at build 43 (v24 C.6): an item locked by a KEY (`key`) is not open from the start either, so it is not seeded
      const unseeded = Object.entries(ITEMS).flatMap(([set, items]) => items.filter(i => !i.by && !i.key).map(i => 'cos:' + set + ':' + i.v)).filter(k => !seen[k]);
      return { was, nowSup, nowOpen, shouldLock, unseeded };
    });
    (r.was && !r.nowSup && !r.nowOpen)
      ? ok(`B.10 Fresh game clears BOTH dev switches - supporter survived it before, and lockedBy() treats a supporter exactly like unlock-all, so a "fresh" profile showed all ${r.shouldLock} locked cosmetics open`)
      : bad('B.10 Fresh game clears supporter as well as allOpen', JSON.stringify(r));
    (!r.unseeded.length)
      ? ok('B.10 seedSeen() covers the cosmetics - an item that was open from the start no longer wears L8 green as if something had just earned it')
      : bad('B.10 an open-from-the-start cosmetic is seeded as seen', r.unseeded.join(', '));
  }

  // ---- B.11: nothing on the Achievements screen calls itself an unlock ----
  {
    const tiers = Object.keys(C28.TIERS);
    const rows = A28.ACH.map(a => a.tier);
    const strayTier = [...new Set(rows)].filter(t => !tiers.includes(t));
    const claims = tiers.filter(t => /unlock/i.test(C28.TIERS[t][0]));
    // the chain is the one place an unlock lives, and every row in it opens a game, a mode or a length
    const opens = U28.UNLOCKS.every(u => { const [g, d] = u.key.split(':'); return !!G28.GAMES[g] && (u.key === 'sequence:practice' || G28.GAMES[g].modes.includes(d)); });
    (!strayTier.length && !claims.length && opens)
      ? ok(`B.11 no achievement tier calls itself an unlock (${tiers.join(' / ')}), and every row in UNLOCKS opens a game, a mode or a length`)
      : bad('B.11 a row listed as an unlock that opens nothing', JSON.stringify({ strayTier, claims, opens }));
  }

  // ---- B.12: Stopwatch runs to ten seconds over, and going the distance is a secret row ----
  {
    (G28.CFG.swOver === 10) ? ok('B.12 a Stopwatch attempt runs to 10 seconds past its target, was 5') : bad('B.12 CFG.swOver', String(G28.CFG.swOver));
    const a = A28.ACH.find(x => x.id === 'tm_s10');
    (a && a.tier === 'secret' && a.hint && a.live === 1 && a.g === 'timing')
      ? ok(`B.12 the new secret row "${a.name}" is described, is live (ov can only become more true) and is Timing's`)
      : bad('B.12 the secret row for letting the clock run out', JSON.stringify(a));
    const r = await page.evaluate(async () => {
      const R = await import('./progress/rules.js');
      return [R.ACH_TEST.tm_s10({ g: 'timing', d: 'stopwatch', s: 5, ov: 1 }),
        R.ACH_TEST.tm_s10({ g: 'timing', d: 'stopwatch', s: 5 }),
        R.ACH_TEST.tm_s10({ g: 'timing', d: 'hidden', s: 10, ov: 1 })]; });
    (r[0] && !r[1] && !r[2]) ? ok('B.12 the row reads the engine’s own ov flag, Stopwatch only') : bad('B.12 the ov predicate', JSON.stringify(r));
  }

  // ---- B.13: the Sequence HUD. Fixed-width slots, and "best" clear of the score ----
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const S = await import('./core/store.js');
      S.store.runs = [{ t: Date.now(), g: 'sequence', d: 'solo', s: 3, hits: 9, misses: 0, v: 2 }]; S.save();
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: 3, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms)); await wait(400);
      const t = document.getElementById('hud-time'), sc = document.getElementById('score'), gh = document.getElementById('pbghost');
      const at = () => { const r = sc.getBoundingClientRect(); return Math.round(r.left) + ':' + Math.round(r.width); };
      t.textContent = 'round 12 · watch'; const a = at();
      t.textContent = 'your turn'; const b = at();
      t.textContent = 'round 4 · watch'; const c = at();
      const sr = sc.getBoundingClientRect(), gr = gh.getBoundingClientRect();
      const overlap = gh.classList.contains('on') && !(gr.top >= sr.bottom || gr.bottom <= sr.top);
      const ghostOn = gh.classList.contains('on');
      RUN.abort(); return { a, b, c, overlap, ghostOn, ghostTop: Math.round(gr.top), scoreBottom: Math.round(sr.bottom) };
    });
    (r.a === r.b && r.b === r.c) ? ok(`B.13 the Sequence round marker does not move the score - "watch" and "your turn" both leave it at ${r.a}`)
      : bad('B.13 fixed-width HUD slots', JSON.stringify(r));
    (r.ghostOn && !r.overlap) ? ok(`B.13 "best" sits clear of the score (${r.scoreBottom} → ${r.ghostTop}), not behind it`)
      : bad('B.13 the best-ghost is separated from the score', JSON.stringify(r));
  }

  // ---- B.15: the Spot ramp. The crowd is the difficulty, not the clock ----
  {
    const R = G28.SPOT_RAMP;
    const kp = read('games', 'spot', 'index.js');
    const padFromCap = /length:\s*SPOT_RAMP\.nCap\s*\+\s*1/.test(kp);
    padFromCap ? ok(`B.15 the keypad is built from SPOT_RAMP.nCap (${R.nCap}), so the band can never deal a count the player cannot answer`)
      : bad('B.15 the keypad must read the cap', 'it carries its own length');
    /* AMENDED at build 44 (v24 F.4): the flash no longer falls at all — it GROWS with the crowd a round deals, from flashBase, capped */
    /* RESTATED at build 60 (v31 60.16): the ordinary band is held at `bandCap` and a round from `spikeFrom` on MAY, rarely, ask for
       `spikeLo`-`spikeHi` instead. So a count is no longer always inside [lo, hi] — but the fact this check stands for is unchanged and
       is now asserted on BOTH branches: every count a band can deal is one the keypad can answer (nCap), and the spike has bounds of
       its own. It is sampled 40 times a round rather than once, so the rare branch is actually exercised instead of flaked past. */
    const r = await page.evaluate(async () => {
      const SP = (await import('./games/spot/index.js')).default;
      const out = []; for (let i = 1; i <= 12; i++) { const x = SP.ramp(i); out.push({ r: i, lo: x.lo, hi: x.hi, dip: x.dip, spike: !!x.spike, n: x.n, decoys: x.decoys, flash: x.flash, sizeVar: +x.sizeVar.toFixed(3) }); }
      return out; });
    const many = await page.evaluate(async () => {
      const SP = (await import('./games/spot/index.js')).default;
      const out = []; for (let i = 1; i <= 14; i++) for (let k = 0; k < 40; k++) { const x = SP.ramp(i); out.push({ r: i, lo: x.lo, hi: x.hi, dip: x.dip, spike: !!x.spike, n: x.n }); }
      return out; });
    const dips = r.filter(x => x.dip);
    const rising = r.every((x, i) => !i || x.decoys >= r[i - 1].decoys || r[i - 1].dip);
    const cap28 = G28.SPOT_RAMP.bandCap || G28.SPOT_RAMP.nCap;
    const banded = many.every(x => x.hi <= cap28 && x.n <= G28.SPOT_RAMP.nCap
      && (x.spike ? (x.n >= G28.SPOT_RAMP.spikeLo && x.n <= G28.SPOT_RAMP.spikeHi && x.r >= G28.SPOT_RAMP.spikeFrom && !x.dip) : (x.n >= x.lo && x.n <= x.hi)));
    const spiked = many.filter(x => x.spike);
    const fewer = dips.every(x => { const prev = r[x.r - 2]; return prev && x.n <= prev.hi && x.decoys > prev.decoys; });
    (dips.length >= 2 && rising && banded && fewer && spiked.length)
      ? ok(`B.15 the target count is dealt from a rising band capped at ${cap28} (round 10: ${r[9].lo}-${r[9].hi}) and rounds ${dips.map(d => d.r).join(', ')} deal the floor among more decoys - fewer targets, bigger crowd. RESTATED at build 60 (60.16): ${spiked.length} of 560 sampled rounds SPIKED to ${G28.SPOT_RAMP.spikeLo}-${G28.SPOT_RAMP.spikeHi}, never before round ${G28.SPOT_RAMP.spikeFrom}, never on a dip, and never above the keypad's ${G28.SPOT_RAMP.nCap}`)
      : bad('B.15 the reworked curve', JSON.stringify({ dips: dips.length, rising, banded, fewer, spiked: spiked.length }));
    (r[2].sizeVar > 0 && r[9].sizeVar > r[2].sizeVar) ? ok(`B.15 size variation arrives at round ${G28.SPOT_RAMP.sizeFrom} and grows (±${Math.round(r[9].sizeVar * 100)}% by round 10)`)
      : bad('B.15 size variation', JSON.stringify(r.map(x => x.sizeVar)));
    // v24 (F.4, build 44): more shapes on screen, more time — every round's flash is exactly the crowd it deals, and never shorter than round 1's base
    // AMENDED at build 50 (v26 §B2): later rounds stay up longer as well — flashRound ms a round from flashRoundFrom, inside the same cap
    const flashOf = x => Math.min(R.flashCap, R.flashBase + R.flashShape * Math.max(0, x.n + x.decoys - R.flashFree) + R.flashRound * Math.max(0, x.r - R.flashRoundFrom + 1));
    const grows = r.every(x => x.flash === flashOf(x) && x.flash >= R.flashBase) && r[9].flash > r[0].flash && !('flashPer' in R) && !('flashMin' in R);
    grows ? ok(`F.4 the Count flash grows with the crowd - round 1 ${r[0].flash}ms for ${r[0].n + r[0].decoys} shapes, round 10 ${r[9].flash}ms for ${r[9].n + r[9].decoys}, capped at ${R.flashCap}ms`)
      : bad('F.4 the flash must grow with the shapes shown', JSON.stringify(r.map(x => [x.n + x.decoys, x.flash])));
  }

  // ---- B.16: every shape's full bounds stay inside the field, rotation and pulse included ----
  {
    for (const [mode, secs, vs] of [['find', 10, 0], ['count', 10, 0], ['find', 10, 2]]) {
      await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      const r = await page.evaluate(async (mode, secs, vs) => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SP = (await import('./games/spot/index.js')).default;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        Object.assign(ST.sel, { game: 'spot', diff: mode, secs, vs, practice: 0 });
        RUN.start();
        for (let i = 0; i < 120; i++) { if (SP.st === 'find' || SP.st === 'vsfind' || SP.st === 'flash') break; await wait(100); }
        if (!['find', 'vsfind', 'flash'].includes(SP.st)) { RUN.abort(); return { err: 'never reached a field, st=' + SP.st }; }
        SP.round = 9;                                   // late-round motion, rotation and size spread
        const gen = document.getElementById('gen'); const out = { frames: 0, shapes: 0, worst: 0, bad: 0 };
        for (let f = 0; f < 40; f++) {
          const rect = gen.getBoundingClientRect();
          for (const q of SP.pts) { const sz = q.sz || SP.size;
            const m = q.va ? sz * (Math.SQRT2 - 1) / 2 : 0;
            const over = Math.max(-(q.x - m), (q.x + sz + m) - rect.width, -(q.y - m), (q.y + sz + m) - rect.height);
            out.shapes++; if (over > 1) { out.bad++; out.worst = Math.max(out.worst, Math.round(over)); } }
          out.frames++; await wait(40); }
        RUN.abort(); return out;
      }, mode, secs, vs);
      if (r.err) bad(`B.16 Spot · ${mode}${vs ? ' versus' : ''} reaches a field`, r.err);
      else (!r.bad) ? ok(`B.16 Spot · ${mode}${vs ? ' versus' : ''} - ${r.shapes} shape-frames, every one fully inside the field (rotation swept box included)`)
        : bad(`B.16 a shape left the field in Spot · ${mode}${vs ? ' versus' : ''}`, `${r.bad} of ${r.shapes} shape-frames, worst ${r.worst}px out`);
    }
  }

  // ---- B.17: the Ready gate on a genuinely first Spot run. Investigation, both directions ----
  {
    const look = async (intro, mode) => {
      await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro, seen: {}, bars: {} } });   // B.17 drives the gate itself
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      return page.evaluate(async mode => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
        Object.assign(ST.sel, { game: 'spot', diff: mode, secs: 10, vs: 0, practice: 0 });
        RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
        const el = document.getElementById('intro'); let sawOn = false, sawReady = false;
        for (let i = 0; i < 60; i++) { if (el.classList.contains('on')) sawOn = true; if (el.classList.contains('ready')) { sawReady = true; break; } if (sawOn && !el.classList.contains('on')) break; await wait(120); }
        RUN.abort(); return { sawOn, sawReady };
      }, mode); };
    const first = await look({}, 'count');
    const second = await look({ spot: 1, 'spot:count': 1 }, 'find');
    (first.sawOn && first.sawReady) ? ok('B.17 Spot DOES show "Ready?" on a genuinely first run - no bug; build 27 made the gate once per GAME (A.3), so Find skipping it after Count is by design')
      : bad('B.17 Spot shows Ready on a genuinely first run', JSON.stringify(first));
    (second.sawOn && !second.sawReady) ? ok('B.17 and the second mode of Spot shows its one-liner without the gate, which is the rule working')
      : bad('B.17 Ready is once per game, not once per mode', JSON.stringify(second));
  }

  // ---- B.18 / A.6: percentage complete ----
  {
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const floorC = K.COMBOS.find(c => c.bar && c.bar.dir === 'higher');
      const ceilC = K.COMBOS.find(c => c.bar && c.bar.dir === 'lower');
      const put = (c, hits) => { S.store.runs.unshift({ t: Date.now(), g: c.g, d: c.d, s: c.s, hits, misses: 0, v: 2 }); };
      const reset = () => { S.store.runs = []; S.store.bars = {}; S.save(); };
      reset(); const zero = K.keyPct();                                   // A.6.2: never played is 0
      reset(); put(floorC, floorC.bar.bar * 0.5); const half = K.credit(floorC);
      reset(); put(floorC, floorC.bar.bar * 10); const capped = K.credit(floorC);   // A.6.1: 0.9 is the cap while uncleared
      reset(); S.store.bars[floorC.key] = Date.now(); const done = K.credit(floorC);
      reset(); put(ceilC, 0); const zeroBest = K.credit(ceilC);           // A.6.3: guard the divide
      reset(); put(ceilC, ceilC.bar.bar * 2); const ceilHalf = K.credit(ceilC);
      reset(); for (const c of K.COMBOS) S.store.bars[c.key] = Date.now(); const whole = K.keyPct();
      reset();
      return { zero, half: +half.toFixed(3), capped, done, zeroBest, ceilHalf: +ceilHalf.toFixed(3), whole,
        floor: floorC.key, ceil: ceilC.key, total: K.COMBOS.length }; });
    const okPct = r.zero.pct === 0 && r.done === 1 && r.capped === 0.9 && r.zeroBest === 0
      && Math.abs(r.half - 0.5) < 0.02 && Math.abs(r.ceilHalf - 0.5) < 0.02 && r.whole.pct === 100 && r.whole.done === r.total;
    okPct ? ok(`A.6 percentage complete over ${r.total} combinations - never played 0 (A.6.2), half a floor bar 0.5, ten times the bar still capped at 0.9 (A.6.1), a zero best guarded to 0 (A.6.3), cleared 1, all cleared 100%`)
      : bad('A.6 the percentage', JSON.stringify(r));
    // A.6.5 / A.6.7: the same line on the menu as on the keys screen, and nothing on a profile with no runs
    const m = await page.evaluate(async () => {
      const S = await import('./core/store.js'); const P = await import('./progress.js');
      S.store.runs = []; S.prefs.played = 0; S.prefs.allOpen = false; S.save();
      const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 250));
      const first = document.getElementById('menu-key').hidden;
      S.store.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 6, misses: 0, v: 2 }]; S.prefs.played = 1; S.save();
      R.show('s-menu'); await new Promise(r => setTimeout(r, 250));
      const el = document.getElementById('menu-key');
      return { first, hidden: el.hidden, text: el.textContent.trim() }; });
    // AMENDED at build 32 (v18 B.15, amending A.6.5): the menu says "N% complete" — the cleared count stays on the keys screen
    (m.first && !m.hidden && /^\d+% complete$/.test(m.text))
      ? ok(`A.6.7 / B.15 the menu carries "${m.text}" once a profile has played - and nothing before that`)
      : bad('A.6.7 percentage complete on the menu', JSON.stringify(m));
  }

  // ---- B.1: the three running totals ----
  {
    // Spot · Find: the total is floored at zero. Ten instant finds used to run a Set to -4.71s and a Streak could not end
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const f = await page.evaluate(async () => {
      const SP = (await import('./games/spot/index.js')).default;
      const src = SP.onDown.toString();
      return { floored: /this\.tot\s*=\s*Math\.max\(\s*0\s*,/.test(src.replace(/\s+/g, ' ')) };
    });
    f.floored ? ok('B.1 Spot · Find’s running total is floored at zero - the 0.5s rebate (6.30) survives, the unbounded negative does not')
      : bad('B.1 Find’s total must not go negative', 'the floor is missing');
    // and the sheet lines say what the engines actually score
    /* RESTATED at build 60 (v31 60.22): a mode line is ONE SHORT LINE now, inside SET_LIMIT, and Find's half-second rebate is no
       longer ON it — the fine print moved to the catalogue's "Scoring, in full" section, where "build 45" asserts it against
       SPOT_FIND.leeway itself. What B.1 stands for is that the line says WHAT IS SCORED, and both still do. */
    const cut = G28.SET_COPY['hold:cut'].set, find = G28.SET_COPY['spot:find'].set;
    (/average/.test(cut) && /total time/.test(find) && cut.length <= G28.SET_LIMIT && find.length <= G28.SET_LIMIT)
      ? ok(`B.1 the sheet says what is scored - Cut "${cut}" (${cut.length}), Find "${find}" (${find.length}), both inside the ${G28.SET_LIMIT}-character limit; the 0.5s rebate is stated in the catalogue's scoring section instead of on the sheet (60.22)`)
      : bad('B.1 the Set lines match the engines', JSON.stringify({ cut, find, limit: G28.SET_LIMIT }));
  }

  // ---- B.2 / B.3: the Estimate round result ----
  {
    const src = read('games', 'estimate', 'index.js');
    const flat = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const iRes = flat.indexOf("$('#hres')"), iDiff = flat.indexOf("$('#hdiff')", flat.indexOf('chain.then'));
    (iRes > 0 && iDiff > 0 && iRes < iDiff) ? ok('B.2 the round result shows HIS % first, then the difference, then the 800ms hold, then the drain')
      : bad('B.2 the % lands before the difference', `hres at ${iRes}, hdiff at ${iDiff}`);
    /pause\(diffHtml\?800:100\)/.test(flat) ? ok('B.2 the 800ms hold is between the difference and the drain') : bad('B.2 the 800ms hold');
    /* every write to the footer, listed. The only value allowed on a ROUND is empty; the one message left is the
       correction when a drag misses the shape entirely, which is not a label and would leave a failed cut silent. */
    const writes = [...flat.matchAll(/\$\('#hlbl'\)\.innerHTML\s*=\s*([^;]+);/g)].map(m => m[1].trim());
    const stray = writes.filter(v => v !== "''" && !/^T\(CP\.missed/.test(v));
    (!stray.length && writes.length) ? ok(`B.3 no footer line on an Estimate round - ${writes.length} writes to #hlbl, every one of them empty bar the missed-drag correction`)
      : bad('B.3 the Estimate footer line is deleted', 'the engine still writes ' + stray.join(' | '));
    (!C28.ESTIMATE.sameShape && !C28.ESTIMATE.sameArea && !C28.ESTIMATE.watch) ? ok('B.3 the four retired strings are out of config/copy.js, not merely unused')
      : bad('B.3 the retired Estimate strings', JSON.stringify(Object.keys(C28.ESTIMATE)));
  }
}
