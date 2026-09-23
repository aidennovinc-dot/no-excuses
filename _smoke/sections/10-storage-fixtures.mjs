// ---- 5. storage fixtures ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, errors, sleep, names, ok, bad, PLAIN, boot, NOW, at, page, until, onScreen, inGame, click, setStorage, getJSON, SEEN_INTRO, up, named } from '../lib/gate.mjs';

export const SECTION = ["storage fixtures"];

export async function run() {
  const bootWith = async (name, storage, expectScreen) => {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    const before = errors.length;
    await setStorage(storage); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const at = await onScreen();
    (at === expectScreen && errors.length === before) ? ok(`${name}: boots to ${at}`) : bad(`${name}: boots to ${expectScreen}`, `on ${at}, ${errors.length - before} new error(s)`);
    return at === expectScreen;
  };
  await bootWith('empty', {}, 's-menu');   // v14 (1.2): the title sequence is the menu screen wearing .story
  const B13 = {
    'ne.prefs': { sq: '#FFFFFF', lead: '#C8322A', bg: 'stars', tint: '', snd: 'space', music: true, musicG: {}, lastGame: 'quick-tap', name: 'AIDEN', scale: 'penta', allOpen: false, supporter: false, adRuns: 3, story: 1, played: 1, gridSeen: 1, col: { 'quick-tap': { sq: '#FFE9C4', lead: '#C8322A', cut: '#FFE9C4' } } },
    'ne.runs': [{ t: NOW - 60000, g: 'quick-tap', d: 'two', s: 5, n: 'AIDEN', v: 13, hits: 12, misses: 1, peak: 4 }, { t: NOW - 120000, g: 'dots', d: 'blind', s: 5, n: 'AIDEN', v: 13, hits: 9, misses: 0, peak: 3 }],
    'ne.unlock': { 'dots:blind': NOW - 120000 }, 'ne.ach': { first: NOW - 120000, named: NOW - 100000 }, 'ne.seen': { 'game:quick-tap': 1, 'game:dots': 1 }, 'ne.intro': { 'quick-tap:two': NOW - 130000 },
  };
  if (await bootWith('build-13 layout', B13, 's-menu')) {
    const ne = await getJSON('ne'); const runs = ne && ne.runs;
    (Array.isArray(runs) && runs.length === 2 && runs[0].hits === 12) ? ok('build-13 layout: both runs survive the boot') : bad('build-13 layout: runs survive', JSON.stringify(runs).slice(0, 80));
    // build 18 (A5): the seven keys become one versioned record; every surviving run carries the current schema stamp
    // v18 (B.2 / B.4): the record is v2 and RUN_SCHEMA is 3 — two Timing scoring units changed, so the ladder gained a step
    // v19 (C.5 / C.6): the record is v3 and RUN_SCHEMA is 4 — Go / No-go's units changed, so the ladder gained its second step
    // AMENDED at build 35 (v21 F.4): the record is v4 - up4 is the ladder's third step
    (ne && ne.v === 7 /* AMENDED at build 40: the ladder ends at v5; at build 42 at v6 (up6, L.7c); at build 57 at v7 (up7, 57.6) */ && Array.isArray(runs) && runs.every(r => r.v === 4)) ? ok('build-13 layout: migrated to `ne` v7, runs stamped RUN_SCHEMA 4') : bad('build-13 layout: ne v7 + run stamp', JSON.stringify({ v: ne && ne.v, stamps: runs && runs.map(r => r.v) }));
    const left = await page.evaluate(() => ['ne.prefs', 'ne.runs', 'ne.unlock', 'ne.ach', 'ne.seen', 'ne.intro', 'ne.tileSeen'].filter(k => localStorage.getItem(k) !== null));
    left.length === 0 ? ok('build-13 layout: the seven old keys are gone') : bad('build-13 layout: old keys removed', left.join(', '));
    (ne && ne.unlock['dots:blind'] && ne.ach.first && ne.ach.named && ne.intro['quick-tap:two'] && ne.seen && ne.seen['game:dots']) ? ok('build-13 layout: unlocks, achievements, intros and seen carried over') : bad('build-13 layout: maps carried', JSON.stringify({ u: ne && ne.unlock, a: ne && ne.ach, i: ne && ne.intro, s: ne && ne.seen }).slice(0, 160));
    (ne && ne.prefs.col['quick-tap'].sq === '#FFFFFF' && ne.prefs.mig35 >= 1 && ne.prefs.adRuns === 3 && ne.prefs.col.dots && ne.prefs.col.dots.sq === '#FFFFFF') ? ok('build-13 layout: prefs carried and missing games seeded - AMENDED at build 35 (F.4): the carried colour is retired to white by up4 and counted in mig35') : bad('build-13 layout: prefs carried', JSON.stringify(ne && ne.prefs).slice(0, 160));
    await click('[data-go="s-board"]'); await sleep(400);
    const row = await page.evaluate(() => document.querySelector('#runs tr.best td:nth-child(3)')?.textContent.trim());
    row === '12' ? ok('build-13 layout: the Quick Tap board shows the 12-hit run first') : bad('build-13 layout: board shows the run', 'first score ' + row);
    const name = await page.evaluate(() => document.querySelector('#pname').value);
    name === 'AIDEN' ? ok('build-13 layout: the profile name is kept') : bad('build-13 layout: profile name', name);
  }
  const CORRUPT = { 'ne.prefs': { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: {} }, 'ne.runs': '{}', 'ne.unlock': '[]', 'ne.ach': 'null', 'ne.seen': '"x"' };
  if (await bootWith('corrupt build-13 keys (ne.runs="{}", prefs.scale="foo", prefs.col=42)', CORRUPT, 's-menu')) {
    const p = (await getJSON('ne')).prefs;
    p.scale === 'penta' ? ok('corrupt: prefs.scale fell back to penta') : bad('corrupt: prefs.scale fallback', String(p.scale));
    (p.col && typeof p.col === 'object' && p.col['quick-tap']) ? ok('corrupt: prefs.col was rebuilt') : bad('corrupt: prefs.col rebuilt', JSON.stringify(p.col));
    // Sequence reads SCALES[sel.scale] the moment a run starts — the crash site the fixture is for
    await click('[data-go="s-pick"]'); await sleep(260); await click('.tile[data-game="sequence"]'); await sleep(260);
    await page.evaluate(() => document.querySelector('#time-row .tbtn')?.click()); await sleep(160);
    const before = errors.length; await click('#go-btn'); await sleep(1200);
    ((await inGame()) && errors.length === before) ? ok('corrupt: a Sequence run starts on the fallback scale') : bad('corrupt: Sequence run starts', `${errors.length - before} error(s)`);
    await click('#quit'); await sleep(300);
  }
  // build 18: a corrupt one-key record — every bad field falls back to its own default, the good ones stay; and the 600-run cap
  // v18 (B.2 / B.4): the ladder step. A v1 record's Timing · Stopwatch Sets and Hidden runs are in units the build no
  // longer scores in, so they retire — and nothing else does
  {
    const OLD = { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off', musicG: {} }, runs: [
      { t: NOW - 1000, g: 'timing', d: 'stopwatch', s: 5, n: '', v: 2, hits: 0.31, misses: 0 },
      { t: NOW - 2000, g: 'timing', d: 'hidden', s: 10, n: '', v: 2, hits: 210, misses: 0 },
      { t: NOW - 3000, g: 'timing', d: 'stopwatch', s: -1, n: '', v: 2, hits: 7, misses: 0 },
      { t: NOW - 4000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 2, hits: 14, misses: 0 } ],
      unlock: {}, ach: { tm_wall: NOW, first: NOW }, intro: {}, seen: {}, bars: { 'timing:hidden:10': NOW, 'quick-tap:two:5': NOW } } };
    if (await bootWith('a v1 record carrying pre-build-31 Timing runs', OLD, 's-menu')) {
      const ne = await getJSON('ne');
      const kinds = ne.runs.map(r => r.g + ':' + r.d + ':' + r.s).sort();
      const want = ['quick-tap:two:5', 'timing:stopwatch:-1'].join('|');
      /* the bars and the achievement STAY: they were converted at the measured pace, not retuned, so a player who cleared
         180px has cleared 1200ms. The RUNS go, because a stored `hits` in the old unit has nothing to be compared against. */
      // AMENDED at build 32: the survivors come out stamped 4 in a v3 record — up3 runs after up2 and touches none of these
      (ne.v === 7 /* AMENDED at build 40: the ladder runs on to v5; at build 42 to v6; at build 57 to v7 */ && kinds.join('|') === want && ne.runs.every(r => r.v === 4) && ne.bars['timing:hidden:10'] && ne.bars['quick-tap:two:5'] && ne.ach.tm_wall && ne.ach.first)
        ? ok('B.2 / B.4 the v1 → v2 step retires the Stopwatch Set and the Hidden run whose units changed — the Stopwatch Streak and the Quick Tap run stay, and so do the cleared bars and the achievement, because those were converted rather than retuned')
        : bad('B.2 / B.4 the ladder step retires only the records that changed unit', JSON.stringify({ v: ne.v, kinds, bars: Object.keys(ne.bars), ach: Object.keys(ne.ach) }));
    }
  }
  const CORRUPT2 = { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: { dots: false, spot: 'yes' }, bg: '#123456', name: 12, adRuns: 'x', tint: 'red', lastGame: 'dots' }, runs: '{}', unlock: [], ach: null, intro: 'x', seen: 'x' } };
  if (await bootWith('corrupt `ne` v1 (runs="{}", col=42, bg="#123456", name=12, adRuns="x")', CORRUPT2, 's-menu')) {
    const ne = await getJSON('ne'); const p = ne.prefs;
    const good = p.scale === 'penta' && p.bg === 'stars' && p.tint === '' && p.name === '' && p.adRuns === 0 && p.snd === 'off' && p.lastGame === 'dots' && p.allOpen === true && p.musicG.dots === false && !('spot' in p.musicG) && p.col['quick-tap'].sq === '#FFFFFF' && Array.isArray(ne.runs) && ne.runs.length === 0 && ne.seen && typeof ne.seen === 'object' && Object.keys(ne.ach).length === 0;   // seen was corrupt → null → boot reseeded it
    good ? ok('corrupt ne v1: each bad field fell back on its own; scale, bg, tint, name, adRuns, col, runs repaired, seen reseeded; snd, lastGame, allOpen, musicG.dots kept') : bad('corrupt ne v1: per-field fallback', JSON.stringify(ne).slice(0, 220));
  }
  const MANY = Array.from({ length: 650 }, (_, i) => ({ t: NOW - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 650 - i, misses: 0 }));
  if (await bootWith('650 runs in `ne`', { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off' }, runs: MANY, unlock: {}, ach: {}, intro: {}, seen: {} } }, 's-menu')) {
    const ne = await getJSON('ne');
    (ne.runs.length === 600 && ne.runs[0].hits === 650) ? ok('runs are capped at 600, newest first kept') : bad('runs cap 600', `${ne.runs.length} runs, first hits ${ne.runs[0] && ne.runs[0].hits}`);
  }
  /* build 48 (v26 item 3): `menuOpened` — which home menu items have been opened, by screen — is shape-checked, seeded from the older flags on a
     profile that has none, and cleared by Fresh game. v26 items 7 / 12: a stored `devMeter` (Testing's retired override) is dropped on load */
  if (await bootWith('`menuOpened` seeded, shape-checked and cleared; `devMeter` dropped (v26 items 3 / 7 / 12)', { ne: { v: 6, prefs: { story: 1, played: 1, gridSeen: 1, keysSeen: 1, cusSeen: 0, snd: 'off', devMeter: 150 }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } }, 's-menu')) {
    const seeded = (await getJSON('ne')).prefs;
    await setStorage({ ne: { v: 6, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off', menuOpened: { 's-board': 1, 's-about': 0, 's-nowhere': 1, 's-key': 'yes' } }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const shaped = (await getJSON('ne')).prefs.menuOpened;
    const wiped = await page.evaluate(async () => { const S = await import('./core/store.js'); S.reset(); return JSON.parse(localStorage.getItem('ne')).prefs.menuOpened; });
    (JSON.stringify(seeded.menuOpened) === '{"s-pick":1,"s-key":1}' && !('devMeter' in seeded) && JSON.stringify(shaped) === '{"s-board":1,"s-key":1}' && JSON.stringify(wiped) === '{}')
      ? ok('v26 item 3 `menuOpened` keeps only the six menu screens, each 1 or gone; an older profile takes the map from gridSeen, Keys from keysSeen and Customise from cusSeen; Fresh game empties it — and a stored devMeter is dropped (items 7 / 12)')
      : bad('v26 item 3 menuOpened in the store', JSON.stringify({ seeded: seeded.menuOpened, devMeter: seeded.devMeter, shaped, wiped }));
    await page.evaluate(() => localStorage.clear());
  }
  /* ---- v29 (items 5 / 6 / 16, build 55): the corrupt fixtures the build-54 review executed, and one Machine ----
     The gate's own corrupt fixtures covered runs="{}", scale="foo", col=42, name=12 and adRuns="x" — none of them an
     INHERITED property name, so both S3 Highs passed the gate on the day they were found. `TABLE[x] ? x : default` is
     truthy for every member of Object.prototype, and g:'constructor' threw inside validRun during module evaluation:
     blank app, nothing after core/store.js loaded, and the record never repaired because save() was never reached. */
  {
    const PROTO = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
    const broke = [];
    for (const k of PROTO) {
      await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [{ g: k, d: 'two', s: 5, hits: 1, t: 1 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
      const r1 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return { up: !!document.querySelector('.screen.on'), runs: (st.runs || []).length }; });
      if (!r1.up || r1.runs) broke.push(`runs[].g=${k} (up ${r1.up}, ${r1.runs} kept)`);
      await setStorage({ ne: { v: 6, prefs: { ...PLAIN, lastGame: k, scale: k, bg: k }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
      const r2 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}, p = st.prefs || {}; return { up: !!document.querySelector('.screen.on'), lg: p.lastGame, sc: p.scale, bg: p.bg }; });
      if (!r2.up || r2.lg === k || r2.sc === k || r2.bg === k) broke.push(`prefs=${k} (up ${r2.up}, ${r2.lg}/${r2.sc}/${r2.bg})`);
    }
    !broke.length
      ? ok(`S3 the inherited-property names boot clean and are repaired — ${PROTO.join(', ')} in runs[].g and in prefs.lastGame / scale / bg (Object.hasOwn at all four sites)`)
      : bad('S3 the truthy-index pattern', broke.join(' | '));

    await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [
      { g: 'quick-tap', d: 'two', s: 5, hits: 1e999, t: 101 },
      { g: 'quick-tap', d: 'two', s: 5, hits: 4, misses: -2, t: 102 },
      { g: 'hold', d: 'grow', s: 7, hits: 3, x: 1e999, y: 0, t: 103 },
      { g: 'sequence', d: 'solo', s: 3, hits: 3, t: 104, sc: '<img src=x onerror="window.__xss=1">' },
      { g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, t: 105 } ], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const kept = await page.evaluate(() => ((JSON.parse(localStorage.getItem('ne')) || {}).runs || []).map(r => r.t));
    (kept.length === 1 && kept[0] === 105)
      ? ok('S3 a stored run is rejected outright when a number a board or a sort reads is not finite (hits 1e999, x 1e999), when misses is negative, or when a formatter field is not what its formatter expects — only the honest row survives')
      : bad('S3 the run fields are type-checked', JSON.stringify(kept));

    const many = {}; for (let i = 0; i < 9000; i++) many['junk' + i] = 1;
    await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [], ach: many, unlock: many, intro: SEEN_INTRO, seen: {}, bars: many } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const caps = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return [Object.keys(st.ach || {}).length, Object.keys(st.unlock || {}).length, Object.keys(st.bars || {}).length]; });
    caps.every(n => n > 0 && n <= 4000)
      ? ok(`S3 ach / unlock / bars are capped — 9,000 planted keys load as ${caps.join(' / ')}, so a tampered map can no longer be written back on every save until the quota fails silently`)
      : bad('S3 the map cap', JSON.stringify(caps));

    /* item 6: and the cell itself is escaped. `lim` is a legal short string, so a record carrying markup in it survives
       validRun by design — which is exactly why the board escapes every formatter cell rather than trusting the store. */
    await setStorage({ ne: { v: 6, prefs: { ...PLAIN, lastGame: 'spot' }, runs: [{ g: 'spot', d: 'count', s: -1, hits: 4, misses: 0, x: 0, y: 0, lim: '<b id="xss55">x</b>', t: 106 }], ach: {}, unlock: { 'spot:count': 1, 'spot:count:-1': 1 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const esc55 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = t => new Promise(r => setTimeout(r, t));
      R.show('s-board'); await wait(350);
      const pick = (k, v) => { const el = [...document.querySelectorAll(`#s-board [data-chip="bd-${k}"]`)].find(x => x.dataset.v === String(v)); if (el) el.click(); return !!el; };
      const picked = [pick('g', 'spot'), pick('d', 'count'), pick('s', -1)]; await wait(350);
      const tb = document.querySelector('#s-board table');
      return { picked, el: !!document.getElementById('xss55'), txt: (tb ? tb.textContent : '').includes('<b id='), rows: tb ? tb.querySelectorAll('tbody tr, tr').length : 0 }; });
    (!esc55.el && esc55.txt && esc55.picked.every(Boolean))
      ? ok('S1 / item 6 a board cell is escaped — markup planted in a run field that survives validRun is drawn as text, never parsed')
      : bad('S1 the board escapes every formatter cell', JSON.stringify(esc55));

    // item 16: 'Machine' says "every round of a Set within 4.00%" and tested s===7, so a Cut Set (s===10) could never earn it
    const hd55 = await page.evaluate(async () => { const R = await import('./progress/rules.js'); const G = await import('./config/games.js');
      return { cut: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'cut', s: 10, y: 3 }), grow: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'grow', s: 7, y: 3 }),
        streak: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'grow', s: G.STREAK, y: 3 }), over: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'cut', s: 10, y: 5 }) }; });
    (hd55.cut && hd55.grow && !hd55.streak && !hd55.over)
      ? ok("item 16 'Machine' matches its own copy — every round of a SET within 4%, either mode; a Streak still cannot earn it")
      : bad('item 16 hd_s reads any Set', JSON.stringify(hd55));
    await page.evaluate(() => localStorage.clear());
  }
}
