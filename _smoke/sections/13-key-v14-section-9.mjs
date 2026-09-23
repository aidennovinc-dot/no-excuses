// ---- 6c. the key (v14 section 9 / C.5 / C.6 / C.7, build 22) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, GAMES, sleep, ok, bad, root, read, at, page, click, setStorage, OPEN_PREFS } from '../lib/gate.mjs';

export const SECTION = ["the key (v14 section 9)"];

export async function run() {
  const { KEY_BARS } = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  // C.5: the list is BUILT, never listed. A literal count or an array of ids in the CODE means a new mode would not join
  // the key. Comments come off first — the header is allowed to say what 31 is made of, the code is not allowed to know it
  const src = read('progress', 'key.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  (!/\b31\b/.test(src) && !/['"]quick-tap:/.test(src)) ? ok('C.5 progress/key.js hard-codes neither 31 nor a list of combinations') : bad('C.5 the contributor list must come from GAMES + SET_COPY');
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  const k = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./games/registry.js'); const G = await import('./config/games.js');
    const want = []; for (const g in R.GAMES) for (const d of R.GAMES[g].modes) for (const sc of R.GC(g, d).lens) want.push(`${g}:${d}:${sc}`);
    return { combos: K.COMBOS.map(c => c.key), want, missing: K.barsMissing(), orphan: K.barsOrphan(),
      dirs: K.COMBOS.map(c => ({ key: c.key, dir: c.bar && c.bar.dir, lower: !!R.GC(c.g, c.d, c.s).lower })),
      setRows: Object.keys(G.SET_COPY).length, state: K.keyState().total }; });
  (k.combos.join('|') === k.want.join('|')) ? ok(`C.5 the key's ${k.combos.length} combinations are exactly GAMES x modes x GC(g,d).lens`) : bad('C.5 the contributor list', `${k.combos.length} vs ${k.want.length}`);
  /* v17 (B.9): THE COUNT IS DERIVED, here as well as in the app. It was a literal 31 in this file - so the gate would
     have gone red on the build that legitimately took Sequence from three key counts to two, and the honest way to hold
     the number is against the config that makes it. key-bars.js has to agree with it, which is C.6 below. */
  const N_COMBOS = k.want.length, N_BARS = Object.keys(KEY_BARS).length;
  (N_COMBOS === N_BARS) ? ok(`C.5 ${N_COMBOS} combinations today, and config/key-bars.js carries exactly that many rows`)
    : bad('C.5 the config and the bars disagree about how many combinations exist', `${N_COMBOS} vs ${N_BARS}`);
  // C.6: the config decides which combinations exist. Either way round is a mismatch someone has to fix, never a silent drop
  (!k.missing.length) ? ok('C.6 every combination the config makes has a clearance bar') : bad('C.6 combinations with no bar (config wins — add a row to config/key-bars.js)', k.missing.join(', '));
  (!k.orphan.length) ? ok('C.6 every clearance bar belongs to a combination the config makes') : bad('C.6 orphan rows in config/key-bars.js', k.orphan.join(', '));
  // C.7: direction is read from the data, and nineteen of the thirty-one are ceilings. It must still agree with the game's own scoring
  { const off = k.dirs.filter(d => (d.dir === 'lower') !== d.lower);
    const ceils = k.dirs.filter(d => d.dir === 'lower').length;
    off.length ? bad('C.7 a bar direction disagrees with the game it scores', off.map(d => d.key).join(', ')) : ok(`C.7 all ${k.dirs.length} directions match GC(g,d,s).lower — ${ceils} ceilings, ${k.dirs.length - ceils} floors`); }
  // 9.3 / 9.4 / 9.5: a bar clears once, from a solo run only. Re-clearing returns null, which is what plays nothing
  const clear = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
    /* v29 (item 13, build 55): the fixture OPENS the Games chest. It used to lean on OPEN EVERYTHING, and a dev flag no longer
       banks a bar — "OPEN EVERYTHING and SUPPORTER stay flags that store no progress" (CLAUDE.md). What key 1 counting means
       is that the Games chest is open, so that is what the fixture says. */
    const wasCh = S.prefs.chests; S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 };
    S.store.bars = {}; const bar = K.COMBOS.find(c => c.g === 'quick-tap' && c.s === 5).bar;
    const base = { g: 'quick-tap', d: 'two', s: 5, misses: 0, t: Date.now(), hits: bar.bar + 5 };
    const under = { ...base, hits: bar.bar - 5 };
    const a = K.checkKey({ ...under }, false);                 // short of the bar: nothing
    const b = K.checkKey({ ...base }, false);                  // over it, first time: a clear
    const c = K.checkKey({ ...base }, false);                  // over it again: nothing
    S.store.bars = {};
    const two = K.checkKey({ ...base }, true);                 // versus / pass & play never contribute (9.4, L10)
    const prac = K.checkKey({ ...base, practice: 1 }, false);
    const chal = K.checkKey({ ...base, chal: 1 }, false);
    const done = Object.keys(S.store.bars).length; S.store.bars = {}; S.prefs.chests = wasCh;
    return { a: !!a, b: b && b.key, c: !!c, two: !!two, prac: !!prac, chal: !!chal, done, was: b && b.was, total: b && b.total }; });
  (!clear.a && clear.b === 'quick-tap:two:5' && !clear.c) ? ok(`9.3 a clearance bar is a one-off: beaten -> cleared (segment ${clear.was + 1} of ${clear.total}), beaten again -> nothing`) : bad('9.3 a bar clears once', JSON.stringify(clear));
  (!clear.two && !clear.prac && !clear.chal && clear.done === 0) ? ok('9.4 pass & play, versus, practice and challenge runs never feed the key') : bad('9.4 solo runs only', JSON.stringify(clear));
  // the screen itself draws a root segment per combination and says how far the key is
  await click('[data-go="s-key"]'); await sleep(600);
  const ui = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id,
    segs: document.querySelectorAll('#key-ring .kroot').length, nodes: document.querySelectorAll('#key-ring .knode').length,
    count: (document.getElementById('key-count') || {}).textContent, warn: !document.getElementById('key-warn').hidden }));
  (ui.screen === 's-key' && ui.nodes === GAMES.length && ui.segs === N_COMBOS) ? ok(`9.6 the ring draws ${ui.nodes} games and ${ui.segs} root segments — "${ui.count}"`) : bad('9.6 the key ring', JSON.stringify(ui));
  /* v17 (A.6): the count line is "{done} of {total} · {pct}%" now, and both halves come off progress/key.js. On this
     profile nothing is cleared, so A.6.2 says it reads 0% — never played contributes nothing, not a free ratio. */
  // AMENDED at build 40 (v23 L.8a): the percentage on the count line is THE METER — OPEN EVERYTHING opens every mode, so band 1 is full and nothing else is
  // AMENDED at build 48 (v26 item 9): the line under the key is the count alone - the card carries the key's share and the menu the total
  /^0 of \d+$/.test((ui.count || '').trim()) ? ok(`A.6 / v26 item 9 the keys screen reads "${ui.count.trim()}" on a profile with no runs - no bar cleared, and no percentage beside it`)
    : bad('A.6 the cleared count and the percentage together', JSON.stringify(ui.count));
  (!ui.warn) ? ok('C.6 no mismatch warning on the key screen') : bad('C.6 the key screen is warning about missing bars');
  await page.evaluate(() => document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(350);
  const rows = await page.evaluate(() => ({ rows: document.querySelectorAll('#key-list .krow').length, nobar: document.querySelectorAll('#key-list .krow.nobar').length, first: (document.querySelector('#key-list .krow i') || {}).textContent }));
  (rows.rows === 6 && !rows.nobar) ? ok(`9.3 tapping Quick Tap lists its 6 combinations — first reads "${rows.first}"`) : bad('9.3 the key panel', JSON.stringify(rows));
}
