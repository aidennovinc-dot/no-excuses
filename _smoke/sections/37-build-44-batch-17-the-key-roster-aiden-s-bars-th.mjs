import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, check, ok, bad, root, read, strip, boot, at, page, down, up, readySeen, named } from '../lib/gate.mjs';

export const SECTION = ["build 44 - batch 17, the key roster, Aiden's bars, the goal and six game tweaks"];

export async function run() {
  const KB44 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const G44 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const U44 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const NOW44 = Date.now();
  const ALL44 = Object.assign(Object.fromEntries(U44.UNLOCKS.map(x => [x.key, NOW44])), Object.fromEntries(Object.keys(KB44.KEY_BARS).map(k => [k, NOW44])));
  const PLAIN44 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const spot44 = strip(read('games', 'spot', 'index.js'));

  /* ---- 1. §E: Aiden's 42 numbers, exactly as he set them, and the two shapes in them ---- */
  {
    const AIDEN = { 'quick-tap:two:5': [9, 13], 'quick-tap:two:15': [26, 39], 'quick-tap:two:30': [51, 78], 'quick-tap:four:5': [9, 12], 'quick-tap:four:15': [26, 36], 'quick-tap:four:30': [51, 72],
      'dots:blind:5': [7, 11], 'dots:blind:15': [21, 33], 'dots:blind:30': [42, 66], 'dots:lead:5': [9, 15], 'dots:lead:15': [27, 45], 'dots:lead:30': [54, 90],
      'hold:grow:7': [30], 'hold:grow:-1': [7], 'hold:cut:10': [15], 'hold:cut:-1': [10], 'sequence:solo:3': [6], 'sequence:solo:7': [6], 'timing:stopwatch:5': [2.5], 'timing:stopwatch:-1': [9],
      'timing:hidden:10': [1500], 'timing:hidden:-1': [6], 'reaction:flash:5': [295], 'reaction:flash:-1': [6], 'reaction:nogo:5': [400], 'reaction:nogo:-1': [10], 'spot:count:10': [12], 'spot:count:-1': [8], 'spot:find:10': [18], 'spot:find:-1': [8] };
    const B = KB44.KEY_BARS, off = [];
    for (const [k, v] of Object.entries(AIDEN)) { const r = B[k]; if (!r || r.bar !== v[0] || r.conf !== 'set') off.push(k + ' bar'); if (v.length > 1 && (r.pro !== v[1] || (r.placeholder && 'pro' in r.placeholder))) off.push(k + ' pro'); }
    const set = Object.values(AIDEN).reduce((n, v) => n + v.length, 0);
    /* the shapes in his data, as they are: × 1 / 3 / 6 at Pro in all four modes and at key 1 in Dots. Quick Tap's key 1 is NOT × 1 / 3 / 6 —
       it is 9 / 26 / 51, one curve for Two and Four — and the gate says so rather than "correcting" it (the build 44 prompt claimed otherwise) */
    const x136 = (m, t) => [1, 3, 6].every((x, i) => B[`${m}:${[5, 15, 30][i]}`][t] === B[`${m}:5`][t] * x);
    const shape = ['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead'].every(m => x136(m, 'pro')) && ['dots:blind', 'dots:lead'].every(m => x136(m, 'bar')) && !x136('quick-tap:two', 'bar');
    const curve = [5, 15, 30].every(s => B[`quick-tap:two:${s}`].bar === B[`quick-tap:four:${s}`].bar) && [9, 26, 51].every((v, i) => B[`quick-tap:two:${[5, 15, 30][i]}`].bar === v) && B['quick-tap:two:5'].pro === 13 && B['quick-tap:four:5'].pro === 12;
    (!off.length && set === 42 && Object.keys(B).length === 30 && shape && curve)
      ? ok(`v24 §E all ${set} of Aiden's numbers are in config/key-bars.js exactly as he set them (30 key 1, 12 Pro, conf 'set', no marker on his Pro); every length is the Sprint figure × 1 / 3 / 6 at Pro and at Dots' key 1, while Quick Tap's key 1 is his 9 / 26 / 51 for both Two and Four, which split at Pro, 13 against 12`)
      : bad('v24 §E Aiden\'s bars', JSON.stringify({ off, set, shape, curve }));
  }

  /* ---- 2. §D.2: one achievement on every key requirement at every tier - 90 rows, named off KEY_ROSTER, 23 older ids kept with their rewards ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const ro = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const AC = await import('./config/achievements.js'); const TH = await import('./config/theme.js');
      const all = K.keyAch(), rows = all.filter(a => a.combo);
      const named = rows.every(a => { const c = K.COMBOS.find(x => x.key === a.combo); const r = (AC.KEY_ROSTER[c.bar.id] || {})[a.kt]; return !!r && r.name === a.name && (!r.id || r.id === a.id) && typeof a.how === 'string' && !/revealed/.test(a.how); });
      const kept = rows.filter(a => !a.id.startsWith('key_')).map(a => a.id).sort();
      const bys = Object.values(TH.ITEMS).flat().filter(i => i.by).map(i => i.by);
      return { n: rows.length, sets: all.length - rows.length, pairs: new Set(rows.map(a => a.combo + '|' + a.kt)).size, ids: new Set(rows.map(a => a.id)).size, named, kept,
        inAch: kept.filter(id => P.ACH.some(x => x.id === id)), orphanBy: bys.filter(id => !P.ACH.some(x => x.id === id) && !all.some(x => x.id === id)),
        rewards: rows.filter(a => a.unlocks).map(a => a.id).sort(), ach: P.ACH.length, live: rows.filter(a => a.live).length }; });
    const KEPT23 = ['qt_bclean5', 'qt_clean5', 'dt_bpin', 'dt_pin', 'hd_steady', 'hd_money', 'sq_7', 'tm_close', 'rx_200', 'sp_5', 'sp_fast', 'qt_br4', 'qt_r5', 'dt_blind', 'dt_land', 'hd_est', 'sq_12', 'tm_run', 'tm_wall', 'rx_run', 'rx_clean', 'sp_15', 'sp_clean'].sort();
    const REWARD9 = ['dt_land', 'dt_pin', 'hd_est', 'hd_money', 'hd_steady', 'qt_clean5', 'qt_r5', 'sq_12', 'sq_7'].sort();
    (ro.n === 90 && ro.pairs === 90 && ro.ids === 90 && ro.sets === 24 && ro.named && ro.kept.join() === KEPT23.join() && !ro.inAch.length && !ro.orphanBy.length && ro.rewards.join() === REWARD9.join() && ro.ach === 28 && !ro.live)
      ? ok(`D.2 the key roster: ${ro.n} rows, one per combination per tier, every name off KEY_ROSTER; the 23 rows that replace an older achievement keep its id and are gone from ACH (${ro.ach} rows left), the 9 that carried a reward still carry it, every Customise item's \`by\` still resolves, none is live:1 - beside the ${ro.sets} key sets`)
      : bad('D.2 the key roster', JSON.stringify(Object.assign({}, ro, { kept: ro.kept.length, rewards: ro.rewards })));
    // earned by clearing the bar, and banked the moment it is
    const earn = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const P = await import('./progress.js');
      S.store.bars = { 'quick-tap:four:5': Date.now() }; S.store.ach = {}; const fresh = K.checkKeyAch({}); const row = fresh.find(a => a.id === 'qt_clean5');
      return { got: !!row, name: row && row.name, tab: row && P.achTab(row), others: fresh.filter(a => a.combo && a.id !== 'qt_clean5').map(a => a.id) }; });
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const shut = await page.evaluate(async () => { const K = await import('./progress/key.js'); const r = K.keyAch().find(a => a.id === 'key_pro_qt-two-5'); return r ? r.how : ''; });
    (earn.got && earn.name === 'Warm hands' && earn.tab === 'cul' && !earn.others.length && /revealed/.test(shut) && !/13/.test(shut))
      ? ok(`D.2 clearing Quick Tap · Four · Sprint's key 1 bar banks Warm hands (id qt_clean5, on Customise unlocks) and nothing else; a Pro row before the Skill chest says "${shut}" and prints no number (A.1)`)
      : bad('D.2 a roster row is the bar', JSON.stringify({ earn, shut }));
    // its reward is still locked in Customise, and Customise unlocks lists the tier's rows only once the tier is revealed
    const cu = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-prog', { tab: 'cul' }); await wait(400); const k1 = !!document.getElementById('cul-qt_clean5'), pro = !!document.getElementById('cul-qt_r5');
      R.show('s-custom'); await wait(500); const b = [...document.querySelectorAll('[data-v="#9BE8FF"]')]; return { k1, pro, found: b.length, locked: b.length > 0 && b.every(x => x.classList.contains('locked')) }; });
    (cu.k1 && !cu.pro && cu.locked)
      ? ok('D.2 Customise unlocks lists Warm hands with the Games chest open and not Quicker before the Skill chest; the colour Warm hands pays out is still locked in Customise (its `by` resolves to the roster row)')
      : bad('D.2 the roster rows on Customise unlocks and in Customise', JSON.stringify(cu));
  }

  /* ---- 3. §D.1: the goal at the top is the next unlock this run can fairly earn, then the key; an aim the player arrived with still wins ---- */
  {
    const goal44 = (g, d, s, aim) => page.evaluate(async (g, d, s, aim) => { const ST = await import('./core/state.js'); const P = await import('./progress.js'); const RUN = await import('./run/run.js');
      Object.assign(ST.sel, { game: g, diff: d, secs: s, vs: 0, practice: 0 }); ST.VS.reset(); if (aim) P.setPendingAim(aim); RUN.start(); await new Promise(r => setTimeout(r, 150));
      const gl = document.getElementById('goal'), txt = gl.classList.contains('on') ? gl.textContent.replace(/\s+/g, ' ').trim() : ''; RUN.abort(); await new Promise(r => setTimeout(r, 120)); return txt; }, g, d, s, aim || '');
    const G = {};
    await boot({}, {}, { plain: PLAIN44 }); G.fresh = await goal44('quick-tap', 'two', 5);
    await boot({}, { unlock: { 'quick-tap:four': NOW44 } }, { plain: PLAIN44 }); G.fourSprint = await goal44('quick-tap', 'four', 5);
    await boot({}, { unlock: { 'quick-tap:four': NOW44, 'quick-tap:two:15': NOW44, 'quick-tap:two:30': NOW44 } }, { plain: PLAIN44 }); G.twoSprint = await goal44('quick-tap', 'two', 5); G.twoMarathon = await goal44('quick-tap', 'two', 30);
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 }); G.key = await goal44('quick-tap', 'two', 15); G.aimed = await goal44('quick-tap', 'two', 15, 'a pinned aim');
    await boot({}, { unlock: ALL44 }, { plain: PLAIN44 }); G.quiet = await goal44('quick-tap', 'two', 15);
    (/7 hits in a row/.test(G.fresh) && !/15 hits/.test(G.fresh) && /7 hits in a row/.test(G.fourSprint) && !/35 hits/.test(G.fourSprint) && !/35 hits/.test(G.twoSprint) && /35 hits/.test(G.twoMarathon)
      && /26 hits or more/.test(G.key) && /Two steady/.test(G.key) && /a pinned aim/.test(G.aimed) && !/26 hits/.test(G.aimed) && G.quiet === '')
      ? ok(`D.1 the goal: a first Sprint is "${G.fresh}", not fifteen in a row; "35 hits in any run" waits for the longest open length ("${G.twoMarathon}") and never sits on a Sprint; with the chain done it is the nearest key requirement ("${G.key}"), none before the Games chest; a pinned aim still shows ("${G.aimed}")`)
      : bad('D.1 the goal at the top', JSON.stringify(G));
  }

  /* ---- 4. §E: a key 1 column that changes credits a saved best silently, once - Aiden's #426 answer, now reaching key 1 ---- */
  {
    await boot({ chests: { games: 1 }, retroCol: { clear: 'build 43' } }, { unlock: ALL44, runs: [{ t: NOW44, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN44 });
    const r1 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { bar: !!ne.bars['quick-tap:two:5'], ach: !!ne.ach.qt_bclean5, mark: !!(ne.prefs.retro || {})['quick-tap:two:5'] }; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r2 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return Object.keys(ne.bars).length; });
    await boot({ retroCol: { clear: 'build 43' } }, { unlock: ALL44, runs: [{ t: NOW44, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN44 });
    const r3 = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ne')).bars).length);
    (r1.bar && r1.ach && r1.mark && r2 === 1 && r3 === 0)
      ? ok('E a key 1 column that changed since it was last credited credits a saved best at boot - Quick Tap · Two · Sprint on 10 hits against Aiden\'s 9 banks the bar and Two hands, marked green once - and a reload credits nothing more; with the Games chest shut key 1 stays quiet')
      : bad('E key 1 credited when its numbers arrive', JSON.stringify({ r1, r2, r3 }));
  }

  /* ---- 5. §F.1 / F.3: Flash's Streak budget is 1000 (the L5 check above); Go / No-go's big number counts targets ---- */
  {
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const ng = await page.evaluate(async () => { const ST = await import('./core/state.js'); const RUN = await import('./run/run.js'); const RX = (await import('./games/reaction/index.js')).RX; const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { game: 'reaction', diff: 'nogo', secs: 5, vs: 0, practice: 0 }); ST.VS.reset(); RUN.start(); const t0 = performance.now(); const out = { start: '', after: '' };
      while (performance.now() - t0 < 9000 && RX.st !== 'rule') await wait(40); await wait(300); out.start = document.getElementById('score').textContent;
      while (performance.now() - t0 < 30000 && !(RX.st === 'go' && RX.armed)) await wait(25);
      if (RX.st === 'go') { await wait(60); RUN.input({ type: 'down', x: 195, y: 420, el: document.getElementById('gen'), raw: new PointerEvent('pointerdown') }); await wait(350); out.after = document.getElementById('score').textContent; }
      RUN.abort(); return out; });
    (G44.NOGO_COUNTER === 'targets' && ng.start === '0/15' && ng.after === '1/15')
      ? ok(`F.3 Go / No-go's running counter: a Set's big number is the targets answered - "${ng.start}" at the first rule, "${ng.after}" after one correct tap (NOGO_COUNTER 'targets', guess)`)
      : bad('F.3 the Go / No-go counter', JSON.stringify({ flag: G44.NOGO_COUNTER, ng }));
  }

  /* ---- 6. §F.5 / F.6: Spot · Count's add-up holds then walks, and its Streak budget is ONE NUMBER ----
     AMENDED at build 60 (v31 60.15, L5 quoted — Aiden 2026-09-23): the number is 20, not 8. F.6's 8 was Cowork's placeholder,
     logged in UNVERIFIED.md; 20 is Aiden's own, against a ramp that now reaches full difficulty at round 18 rather than 8.
     The RULE this check stands for is untouched and is the reason it is not loosened: the budget is COUNT_BUDGET everywhere it
     is read or printed, never a literal, so the screen and the run-ender can never disagree. */
  {
    const budget = G44.COUNT_BUDGET === 20 && (spot44.match(/off>=COUNT_BUDGET/g) || []).length === 2 && !/off>=5\b/.test(spot44) && /this\.find\(\)\?10:COUNT_BUDGET/.test(spot44) && /lim:COUNT_BUDGET\+' miscounts'/.test(spot44);
    const copy = /of5:' · \{off\} of \{bud\}'/.test(read('config', 'copy.js')) && /hudCountStreak:'Round \{n\} · \{off\} of \{bud\} off'/.test(read('config', 'copy.js'));
    const walk = /ms:off\?COUNT_ADD\.ms:0/.test(spot44) && /off\?CFG\.hold:0\)/.test(spot44) && /String\(this\.off-off\)/.test(spot44) && G44.COUNT_ADD.ms > 480;
    (budget && copy && walk)
      ? ok(`F.5 / F.6 Spot · Count: a miscount holds CFG.hold (${G44.CFG.hold}ms) and walks into the total over ${G44.COUNT_ADD.ms}ms, the Set's number waiting on the old total; the Streak's budget is COUNT_BUDGET (${G44.COUNT_BUDGET}, Aiden's own number since build 60) everywhere it is read or printed`)
      : bad('F.5 / F.6 Spot · Count', JSON.stringify({ budget, copy, walk }));
  }

  /* ---- 7. §F.7: shapes can start overlapped, and a tap on the target always counts ---- */
  {
    const hit = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).SP; const g = document.getElementById('gen').getBoundingClientRect();
      const fake = { size: 40, pts: [{ shape: 'circle', x: 100, y: 100, sz: 40 }, { shape: 'square', x: 114, y: 104, sz: 40 }] };
      const at = (x, y, want) => SP.hitAt.call(fake, { x: g.left + x, y: g.top + y }, want);
      const grid = Array.from({ length: 12 }, (_, i) => ({ shape: 'square', x: (i % 4) * 60, y: Math.floor(i / 4) * 60, sz: 40 }));
      SP.pile.call({ size: 40 }, grid, 0.5); let pairs = 0;
      for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) if (Math.abs(grid[i].x - grid[j].x) < 40 && Math.abs(grid[i].y - grid[j].y) < 40) pairs++;
      return { onTarget: at(128.8, 122, q => q.shape === 'circle'), nearest: at(128.8, 122, () => false), offTarget: at(150, 124, q => q.shape === 'circle'), pairs }; });
    /* AMENDED at build 60 (v31 60.3): the first clause was a SOURCE-TEXT check on how findRound calls pile(), and 60.3 gave pile
       a third argument (the indices that must stay clear), so it failed on the refactor. The gate's own rule is to DELETE such a
       check and name it in the outcome rather than re-spell it. What it stood for — that the crowd is actually dealt overlapping —
       is measured two lines up by `pairs`, off a real pile() call, and 60.3's own check in "the runs" asserts that decoys are STILL
       piled while the target is not. */
    const wired = (spot44.match(/this\.hitAt\(ev,/g) || []).length === 2 && G44.SPOT_FIND.overlap > 0;
    (hit.onTarget === 0 && hit.nearest === 1 && hit.offTarget === 1 && hit.pairs >= 1 && wired)
      ? ok(`F.7 Spot · Find: a tap inside the target's own box counts even when a decoy's centre is nearer (the old nearest-centre test gave it to the decoy), a tap off the target still goes to the nearest shape, and ${Math.round(G44.SPOT_FIND.overlap * 100)}% of the crowd is dealt on a neighbour from round 1 (${hit.pairs} overlapping pair(s) from half of a clean grid) - solo and versus both hit through hitAt`)
      : bad('F.7 overlap and tap precedence', JSON.stringify({ hit, wired }));
  }
}
