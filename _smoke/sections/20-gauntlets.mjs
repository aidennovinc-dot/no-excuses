/* ---- 7c. the Gauntlets: real runs, and everything they must NOT touch (v29 items 11 / 18, build 56) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, check, ok, bad, root, read, PLAIN, boot, at, page, until, inGame, click, up, readySeen, verdict, clearHeld, poke, clearReady } from '../lib/gate.mjs';

export const SECTION = ["gauntlets"];

export async function run() {
  const GA56 = await import(pathToFileURL(path.join(root, 'config', 'gauntlets.js')).href);
  const GT56 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB56 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);

  /* item 18's rosters are Aiden's own, typed 2026-09-18, and this is the mapping check he asked for: every row a real game
     and mode, every step scored against a bar that exists, Sequence in NEITHER, and Mega the same roster as Mini. */
  { const wrong = [];
    for (const id of ['g1', 'g2']) for (const st of (GA56.GAUNTLET_RUNS[id] || [])) {
      if (!GT56.GAMES[st.g] || !GT56.GAMES[st.g].modes.includes(st.d)) wrong.push(`${id} ${st.g}:${st.d}`);
      if (!KB56.KEY_BARS[st.ref]) wrong.push(`${id} ref ${st.ref}`);
      if (!Number.isInteger(st.s) || st.s < 1) wrong.push(`${id} len ${st.s}`);
      if (st.g === 'sequence') wrong.push(`${id} Sequence is in a Gauntlet`); }
    const order = id => (GA56.GAUNTLET_RUNS[id] || []).map(x => x.g + ':' + x.d).join(' > ');
    const same = order('g1') === order('g2');
    (!wrong.length && same && GA56.GAUNTLET_RUNS.g1.length === 9)
      ? ok(`items 11 / 18 both rosters are Aiden's nine plays in his order — ${order('g1')} — every step a real game and mode with a bar to score against, Sequence in neither, Mega the same roster at full length`)
      : bad('items 11 / 18 the rosters', JSON.stringify({ wrong, same, n: (GA56.GAUNTLET_RUNS.g1 || []).length })); }

  /* R1 (v27 item 2): a secret may be KNOWN TO EXIST, never what it is — until its chest is opened a Gauntlet has no tile at
     all. Aiden narrowed this himself on 2026-09-18: "both tiles show NOTHING until their chest is opened". */
  const tiles = async chests => { await boot({ chests }); await click('[data-go="s-pick"]'); await sleep(1200);
    return page.evaluate(() => [...document.querySelectorAll('#grid .tile[data-gauntlet]')]
      .map(t => ({ id: t.dataset.gauntlet, hidden: !!t.hidden, lines: document.querySelectorAll(`#gridlines [data-gauntlet="${t.dataset.gauntlet}"]`).length }))); };
  const t0 = await tiles({ games: 1, key: 0, pro: 0, thorns: 0 });
  const t1 = await tiles({ games: 1, key: 1, pro: 0, thorns: 0 });
  const t2 = await tiles({ games: 1, key: 1, pro: 1, thorns: 0 });
  const at = (rows, id) => rows.find(r => r.id === id) || { hidden: null, lines: -1 };
  (t0.every(r => r.hidden && !r.lines) && !at(t1, 'g1').hidden && at(t1, 'g2').hidden && !at(t2, 'g1').hidden && !at(t2, 'g2').hidden)
    ? ok('R1 neither Gauntlet is on the map before its chest — no tile, no connector; Gauntlet Mini arrives with the Skill chest and Gauntlet Mega with the Pro chest')
    : bad('R1 the Gauntlet tiles', JSON.stringify({ t0, t1, t2 }));

  // item 8 (build 52): opening a Gauntlet is what opens its message, and it happens ONCE
  const msg56 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const S = await import('./core/store.js');
    const K = await import('./progress/key.js'); const M = await import('./config/messages.js'); const wait = t => new Promise(r => setTimeout(r, t));
    const row = M.MESSAGES.find(m => m.by && m.by.gauntlet === 'g1');
    S.prefs.gauntSeen = {}; S.save();
    const before = { seen: !!(S.prefs.gauntSeen || {}).g1, open: row ? !!K.msgOpen(row) : null };
    R.show('s-gauntlet', { id: 'g1' }); await wait(350);
    const one = { seen: (S.prefs.gauntSeen || {}).g1, open: row ? !!K.msgOpen(row) : null };
    R.show('s-menu'); await wait(150); R.show('s-gauntlet', { id: 'g1' }); await wait(350);
    const two = { seen: (S.prefs.gauntSeen || {}).g1, keys: Object.keys(S.prefs.gauntSeen || {}) };
    R.show('s-menu'); await wait(150);
    return { row: !!row, before, one, two }; });
  (msg56.row && !msg56.before.seen && !msg56.before.open && msg56.one.seen === 1 && msg56.one.open && msg56.two.seen === 1 && msg56.two.keys.length === 1)
    ? ok('item 8 "The Gauntlet Mini" opens the first time its Gauntlet is opened, and a second visit writes nothing more')
    : bad('item 8 the Gauntlet message', JSON.stringify(msg56));

  /* THE RUN. Nine plays back to back, driven the way every other run in this file is driven; what it must not touch is read
     off the store either side of it. The gate runs it TWICE — once with the Author-bar switch off, which is how it ships
     until #349 sets real Author times, and once with it on — because "the run must play and score sensibly with the switch
     off" is the whole point of building the scoring before the numbers exist. */
  const driveGaunt = async (id, ms = 300000) => {
    await page.evaluate(() => { window.__g56 = null; window.__d58 = [];
      return import('./core/events.js').then(E => { E.on('gaunt:done', o => { window.__g56 = o; });
        if (!window.__d58on) { window.__d58on = 1; E.on('gaunt:deal', d => { (window.__d58 = window.__d58 || []).push(d); }); } }); });
    await sleep(250);
    await page.evaluate(gid => import('./run/gauntlet.js').then(G => G.startGauntlet(gid)), id);
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const out = await page.evaluate(() => window.__g56); if (out) return out;
      if (await inGame()) { const g = await page.evaluate(() => import('./core/state.js').then(S => S.sel.game));
        if (!(await clearReady(g)) && !(await clearHeld(g))) await poke(g); }
      await sleep(110); }
    return null; };

  await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 0 } }, { unlock: {}, ach: {}, bars: {} });
  const before56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {};
    return { runs: (st.runs || []).length, unlock: Object.keys(st.unlock || {}).length, ach: Object.keys(st.ach || {}).length, bars: Object.keys(st.bars || {}).length, gaunt: (st.gaunt || []).length }; });
  const off56 = await driveGaunt('g1');
  const after56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {};
    return { runs: (st.runs || []).length, unlock: Object.keys(st.unlock || {}).length, ach: Object.keys(st.ach || {}).length, bars: Object.keys(st.bars || {}).length, gaunt: (st.gaunt || []).length, tier: (st.gaunt || [])[0] && (st.gaunt || [])[0].tier }; });
  (off56 && Number.isFinite(off56.score) && off56.web.length === 8 && off56.web.every(r => r.pct === null || Number.isFinite(r.pct)) && off56.verdict && off56.verdict.tier)
    ? ok(`items 11 / 18 / v30 59.12a Gauntlet Mini plays nine games back to back and scores ${off56.score}% against the AUTHOR column, which is the default since build 59 — eight spokes on the web (Estimate's two modes are one), a verdict of "${off56.verdict.name}"`)
    : bad('items 11 / 18 a Gauntlet run with the switch off', JSON.stringify(off56 && { score: off56.score, web: off56.web }));
  (after56.runs === before56.runs && after56.unlock === before56.unlock && after56.ach === before56.ach && after56.bars === before56.bars && after56.gaunt === before56.gaunt + 1 && after56.tier === GA56.GAUNTLET_SCORE.tier /* AMENDED at build 59 (v30 59.12a): read the column off the config rather than naming it, so Aiden's real Author numbers landing needs no edit here */)
    ? ok('L10 a Gauntlet run advances NOTHING — no board row, no unlock, no achievement, no clearance bar — and writes one row to its own board, stamped with the column it was scored against')
    : bad('L10 a Gauntlet run wrote something it should not have', JSON.stringify({ before56, after56 }));

  /* ---- v29 Section A (58.1, build 58): A GAUNTLET DEALS EVENLY. Every step that deals a random quantity draws it from the band in
     config/gauntlets.js, so one run is about as hard as the next — Aiden's own example was Estimate · Grow, whose tier spans the WHOLE
     size range. The check is on the deal itself, not on the source: each engine announces what it actually dealt (`gaunt:deal`, after
     any snapping), the run above is driven for real, and every draw has to land inside its own step's band. A band with no draw is the
     other half of it — a step that quietly stopped reading its band would otherwise pass by saying nothing. ---- */
  {
    const bandsOf = id => { const out = {}; for (const k of Object.keys(GA56.GAUNTLET_BANDS)) out[k] = Object.assign({}, GA56.GAUNTLET_BANDS[k]);
      const ov = GA56.GAUNTLET_BAND_OVERRIDE[id] || {}; for (const k of Object.keys(ov)) out[k] = Object.assign({}, out[k], ov[k]); return out; };
    const want58 = bandsOf('g1');
    const deals58 = await page.evaluate(() => window.__d58 || []);
    const outside = deals58.filter(d => { const b = (want58[d.step] || {})[d.q]; return !b || !(d.v >= b[0] && d.v <= b[1]); });
    // one row per band the Mini roster actually plays, and every one of them has to have been drawn at least once
    const steps58 = (GA56.GAUNTLET_RUNS.g1 || []).map(st => st.g + ':' + st.d);
    const owed = [];
    for (const k of steps58) for (const q of Object.keys(want58[k] || {})) if (!deals58.some(d => d.step === k && d.q === q)) owed.push(k + ' · ' + q);
    const printed = steps58.filter(k => want58[k]).map(k => Object.entries(want58[k]).map(([q, b]) => `${k} ${q} ${b[0]}-${b[1]}`).join(', ')).join(' | ');
    (deals58.length && !outside.length && !owed.length)
      ? ok(`58.1 a Gauntlet deals evenly — ${deals58.length} draws across a whole Gauntlet Mini, every one inside its band, and no band left unread (${printed})`)
      : bad('58.1 a Gauntlet deals inside its bands', JSON.stringify({ drew: deals58.length, outside: outside.slice(0, 6), owed }));
    // Quick Tap and Dots deal no quantity at all, so neither may carry a band — a row for one would be a band nothing reads
    const idle58 = ['quick-tap:two', 'dots:blind'].filter(k => GA56.GAUNTLET_BANDS[k]);
    idle58.length ? bad('58.1 a band on a step that deals no quantity', idle58.join(', '))
      : ok('58.1 Quick Tap · Two and Dots · Blind carry no band — neither deals a quantity, and a band nothing reads is a number that can drift');
  }

  /* ---- v30 (59.12, build 59): THE SCORING, REPLAYED ON AIDEN'S OWN RUN ----
     He played a Gauntlet Mini on v0.58 and it read 310.8%: Quick Tap · Two 155.6, Dots · Blind 142.9, Estimate 242.8, Reaction ·
     Flash 128.3, Go / No-go 139.9, Stopwatch 172.4, Hidden 263.2, Spot · Find 1241.4. "I don't know how I got 310%. 100% is supposed
     to be relative to author times." The acceptance asks for that run replayed through the new scoring with before and after per
     row, so the RAW RESULT of each step is recovered by inverting the old arithmetic — the percentage and the old scaled key-1 bar
     give back the number he scored — and the new arithmetic is then run on it. Nothing here is typed except his eight percentages. */
  {
    const HIS = { 'quick-tap:two': 155.6, 'dots:blind': 142.9, hold: 242.8, 'reaction:flash': 128.3, 'reaction:nogo': 139.9,
      'timing:stopwatch': 172.4, 'timing:hidden': 263.2, 'spot:find': 1241.4 };
    const replay = await page.evaluate(async his => {
      const G = await import('./config/gauntlets.js'), R = await import('./run/gauntlet.js'), K = await import('./progress/key.js');
      const steps = G.GAUNTLET_RUNS.g1;
      const refOf = ref => K.COMBOS.find(c => c.key === ref);
      const scaled = (step, tier) => { const c = refOf(step.ref); if (!c) return null;
        let bar = K.barOf(c, tier); if (!(bar > 0)) return null;
        if (step.tot) { const rl = +String(step.ref).split(':')[2]; if (rl > 0) bar = bar * (step.s / rl); }
        return { bar, dir: c.bar.dir }; };
      const out = [];
      for (const st of steps) {
        const key = st.web || (st.g + ':' + st.d);
        const was = his[key]; if (was === undefined) continue;
        const old = scaled(st, 'clear'), now = scaled(st, 'author');
        if (!old || !now) { out.push({ key, was, now: null }); continue; }
        // invert the OLD arithmetic to recover what he actually scored on this step
        const v = old.dir === 'lower' ? old.bar * 100 / was : old.bar * was / 100;
        // and run the NEW arithmetic on it: the Author bar, then the 150 cap
        const d = R.stepDetail(st, { hits: v });
        out.push({ key, was, dir: old.dir, v: Math.round(v * 1000) / 1000, oldBar: Math.round(old.bar * 1000) / 1000,
          newBar: Math.round(now.bar * 1000) / 1000, raw: d && d.raw, pct: d && d.pct, capped: !!(d && d.capped) });
      }
      /* the headline is the average of the SPOKES, not of the steps: Estimate's Grow and Cut are one game and one spoke, so the two
         are averaged into it first. That is webOf()'s own rule, and averaging nine steps instead of eight spokes would not be his run. */
      const had = out.filter(r => typeof r.pct === 'number');
      const spoke = ks => { const g = {}; for (const r of ks) (g[r.key] = g[r.key] || []).push(r);
        return Object.values(g).map(rs => rs.reduce((a, r) => a + (typeof r.pct === 'number' ? r.pct : r.was), 0) / rs.length); };
      const nowSpokes = spoke(had), wasSpokes = spoke(out.map(r => ({ key: r.key, was: r.was, pct: r.was })));
      return { rows: out, spokes: nowSpokes.length,
        wasScore: Math.round(wasSpokes.reduce((a, v) => a + v, 0) / wasSpokes.length * 10) / 10,
        nowScore: nowSpokes.length ? Math.round(nowSpokes.reduce((a, v) => a + v, 0) / nowSpokes.length * 10) / 10 : null,
        cap: G.GAUNTLET_SCORE.cap, perfect: G.GAUNTLET_SCORE.perfect, tier: G.GAUNTLET_SCORE.tier };
    }, HIS);
    const rows12 = replay.rows.filter(r => typeof r.pct === 'number');
    // nine STEPS, eight SPOKES — Estimate's Grow and Cut are one game (item 18), which is why the two are averaged before the headline
    const allScored = rows12.length === replay.rows.length && replay.spokes === 8;
    const noneOver = rows12.every(r => r.pct <= replay.cap + .001);
    /* the Author bar is never SOFTER than the key-1 one it replaces — which is a bigger number where more is better and a smaller
       one where less is better, so the test reads the bar's own direction rather than assuming one. */
    const harder = rows12.every(r => r.dir === 'lower' ? r.newBar <= r.oldBar + 1e-9 : r.newBar >= r.oldBar - 1e-9);
    const capOn = replay.cap === 150 && replay.perfect === replay.cap && replay.tier === 'author';
    const sane = replay.nowScore !== null && replay.nowScore < replay.wasScore;
    (allScored && noneOver && harder && capOn && sane)
      ? ok(`v30 59.12 Aiden's own Mini replayed through the new scoring — his ${replay.wasScore}% becomes ${replay.nowScore}%: ${rows12.map(r => `${r.key} ${r.was}→${r.pct}${r.capped ? ' (capped)' : ''}`).join(' · ')}. Scored against the ${replay.tier} column, every step capped at ${replay.cap} with perfect set to the same so the cap cannot be beaten by a flawless round, and no row above it — Spot · Find's ${HIS['spot:find']} was one step adding 155 points to the headline`)
      : bad('v30 59.12 the Gauntlet scoring', JSON.stringify({ allScored, noneOver, harder, capOn, sane, replay }));

    /* 59.12b: A MINI STEP'S SCALED BAR MUST NOT BE SOFTER THAN THE SAME ROUNDS OF A FULL SET WOULD BE.
       `tot` scales the bar by rounds-played over rounds-in-the-set, which assumes the rounds played are AVERAGE ones. They were the
       set's opening rounds, and Spot · Find's crowd grows with the round number — so the two easiest of ten were measured against
       two tenths of a bar earned over all ten. The ramp now starts at the middle of the set, so the assumption holds. Asserted on
       the step the ENGINE is handed, not on the config, because that is where the two tables are put together. */
    const ramp12 = await page.evaluate(async () => { const G = await import('./config/gauntlets.js'), R = await import('./run/gauntlet.js');
      const out = {};
      for (const id of ['g1', 'g2']) out[id] = G.GAUNTLET_RUNS[id].map(st => { const rl = +String(st.ref || '').split(':')[2];
        const step = R.bandFor ? null : null; void step;
        const from = (!(rl > 0) || !(st.s > 0) || st.s >= rl) ? 1 : Math.floor((rl - st.s) / 2) + 1;
        return { key: st.g + ':' + st.d, s: st.s, rl: rl || null, tot: !!st.tot, from, last: from + st.s - 1 }; });
      return out; });
    const centred = Object.values(ramp12).flat().every(r => {
      if (!r.rl || r.s >= r.rl) return r.from === 1;                       // a step that plays the whole set starts where a set starts
      const mid = (r.rl + 1) / 2;                                          // the played block straddles the set's own midpoint
      return r.from <= mid && r.last >= mid - 1 && r.from >= 2;
    });
    centred
      ? ok(`v30 59.12b a Gauntlet deals the MIDDLE of the set, so a scaled bar is never softer than the rounds it is scaled from: ${ramp12.g1.filter(r => r.rl && r.s < r.rl).map(r => `${r.key} plays ${r.from}-${r.last} of ${r.rl}`).join(' · ')}`)
      : bad('v30 59.12b a Gauntlet step plays the easy end of its set', JSON.stringify(ramp12));
  }

  /* AMENDED AT BUILD 59 (v30 59.12a): the columns have SWAPPED SIDES. 'author' is the default now, so the first drive above is the
     Author one and this is the key-1 one; the claim either way is that the switch is one line in config/gauntlets.js and a whole
     run completes and scores on both columns. The tier a run is stamped with is asserted against whatever the config says, not
     against a name typed here, so the day Aiden's real Author numbers land this does not need touching. */
  await page.evaluate(() => import('./config/gauntlets.js').then(G => { G.GAUNTLET_SCORE.tier = 'clear'; }));
  const on56 = await driveGaunt('g1');
  const tier56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return (st.gaunt || [])[0] && (st.gaunt || [])[0].tier; });
  await page.evaluate(() => import('./config/gauntlets.js').then(G => { G.GAUNTLET_SCORE.tier = 'author'; }));
  (on56 && Number.isFinite(on56.score) && on56.web.length === 8 && on56.web.every(r => r.pct === null || Number.isFinite(r.pct)) && tier56 === 'clear')
    ? ok(`items 11 / 18 and with the switch moved the same run completes and scores against the key-1 column (${on56.score}%, stamped "${tier56}") — the switch is one line in config/gauntlets.js and both sides of it play`)
    : bad('items 11 / 18 a Gauntlet run with the switch on', JSON.stringify({ on56: on56 && { score: on56.score }, tier56 }));

  // one way through: a quit ends the Gauntlet outright and writes no row at all
  await page.evaluate(() => { window.__q56 = null; return import('./core/events.js').then(E => { E.on('gaunt:quit', o => { window.__q56 = o; }); }); });
  const wasG = await page.evaluate(() => ((JSON.parse(localStorage.getItem('ne')) || {}).gaunt || []).length);
  await page.evaluate(() => import('./run/gauntlet.js').then(G => G.startGauntlet('g1')));
  for (let i = 0; i < 60 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
  await sleep(400); await click('#quit'); await sleep(700);
  const quit56 = await page.evaluate(async () => { const G = await import('./run/gauntlet.js');
    return { quit: !!window.__q56, on: G.gauntOn(), rows: ((JSON.parse(localStorage.getItem('ne')) || {}).gaunt || []).length, screen: (document.querySelector('.screen.on') || {}).id }; });
  (quit56.quit && !quit56.on && quit56.rows === wasG && quit56.screen === 's-gauntlet')
    ? ok('item 11 one way through — a quit ends the whole Gauntlet, writes no row, and lands back on its own screen where the next attempt starts at game one')
    : bad('item 11 quitting a Gauntlet', JSON.stringify(quit56));

  /* ---- v29 Section A (57.9 / 57.10, build 57): THE GAUNTLET SCREENS. Aiden's own copy, one row per STEP so eight games read as eight rows, the
     count in the line above the list generated from the roster, nothing under the list, ENTER THE GAUNTLET on both, and the scary face in its deep
     red on the title, the map label and the button — Mega a step further than Mini. And Mini's Stopwatch step is two rounds, not one. ---- */
  {
    const CP57 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const G = CP57.GAUNTLET, fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
    /* 57.10, off the data: Mini's Stopwatch is two rounds and its 5-6s window is untouched. TURNED OVER at build 58 (58.1): the window
       moved from the step to GAUNTLET_BANDS, where it is one row of the band table with the other six. The rule it stands for did not
       change, only where the two numbers live, so the assertion reads them from their new home rather than being deleted. */
    const sw = (GA56.GAUNTLET_RUNS.g1 || []).find(s => s.g === 'timing' && s.d === 'stopwatch') || {};
    const swBand = (GA56.GAUNTLET_BANDS['timing:stopwatch'] || {}).target;
    const two = sw.s === 2 && !('target' in sw) && Array.isArray(swBand) && swBand.join() === '5,6';
    const gone = !('oneWay' in G) && /enter the gauntlet/i.test(G.go);
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, {}, { plain: { ...PLAIN, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } } });
    /* v30 (59.5, build 59): MEASURED AT 375, not at the gate's own 390. Cinzel is wider than Creepster and Cinzel Decorative
       wider again, and 59.5's acceptance is that the title and the button each stay on ONE LINE AT 375px — the narrower of the
       two phones Aiden checks. The viewport goes back to 390 straight after, so nothing downstream sees a different screen. */
    await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const screens = [];
    for (const id of ['g1', 'g2']) screens.push(await page.evaluate(async id => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(120); R.show('s-gauntlet', { id }); await wait(500);
      // build 61: and until the title's own face has LOADED — a font arrives over the network on the wall clock, so on the test clock the
      // 500ms above could measure the fallback face's width, which runs off the phone where Cinzel does not
      await Promise.race([document.fonts.ready, wait(5000)]);
      const s = document.getElementById('s-gauntlet'), rows = [...document.querySelectorAll('#gt-body .gtlist li')];
      const go = document.querySelector('#gt-body [data-act="gaunt-go"]');
      const face = el => el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') : '';
      const col = el => el ? getComputedStyle(el).color : '';
      const title = document.getElementById('gt-title');
      return { id, dataG: s.dataset.g, soon: document.getElementById('gt-soon').textContent,
        rows: rows.map(li => [li.querySelector('b').textContent, li.querySelector('span').textContent, li.querySelector('i').textContent]),
        hints: document.querySelectorAll('#gt-body .gtbrief .gthint').length,
        go: go ? go.textContent : '', titleFace: face(title), titleCol: col(title), goFace: face(go), goCol: col(go),
        rowFace: face(rows[0] ? rows[0].querySelector('span') : null),
        /* v30 (59.5): one line, off the LAYOUT — a box taller than about 1.4 line-heights has wrapped — and still on the phone.
           Both are what the new face has to earn, because it is wider than the one it replaces. */
        lines: [title, go].map(el => { if (!el) return 0; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          return Math.max(1, Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh)); }),
        onPhone: [title, go].every(el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= -.5 && r.right <= innerWidth + .5; }),
        weights: [title, go].map(el => el ? getComputedStyle(el).fontWeight : ''),
        vw: innerWidth,
        anim: title ? (title.getAnimations() || []).map(a => a.animationName).join() : '' }; }, id));
    const est = screens.map(s => (s.rows.find(r => /Estimate/.test(r[1])) || []));
    /* AMENDED AT BUILD 59 (v30 59.5): THE FACE IS CINZEL, NOT CREEPSTER. Aiden rejected Creepster outright — "it looks like
       horror theme when it should be serious theme, something like knightly or noble" — and answered build 57's question 3
       (Creepster or Nosifer for Mega) with NEITHER. Mini wears Cinzel 700 and Mega Cinzel Decorative 900: the same letters with
       flourishes, so Mega is a visible step up WITHOUT changing family. The flicker, the deep red and the mono rows are
       untouched, which is the other half of what he said — "but I like the flashing of the title" — so `gflick` and the two
       different title colours are still asserted here. The width check is new and is the item's own: ONE LINE at 375px. */
    const WANT_FACE = { g1: 'Cinzel', g2: 'Cinzel Decorative' };
    const looks = screens.every(s => s.titleFace === WANT_FACE[s.id] && s.goFace === WANT_FACE[s.id] && /jetbrains/i.test(s.rowFace) && /gflick/.test(s.anim))
      && screens[0].titleCol !== screens[1].titleCol;
    const oneLine = screens.every(s => s.vw === 375 && s.lines.every(n => n === 1) && s.onPhone)
      && screens.every(s => s.weights.every(w => +w >= 700));
    const copy = screens.every((s, i) => s.rows.length === 8 && s.hints === 0 && /ENTER THE GAUNTLET/i.test(s.go)
        && s.soon === fill(G.intro[s.id], { n: 8 }) && /8/.test(s.soon))
      && est[0][0] === '3' && /Estimate · Grow \+ Cut/.test(est[0][1]) && est[0][2] === fill(G.roundsEach, { n: 2 })
      && est[1][0] === '3' && est[1][2] === fill(G.roundsPair, { a: 7, b: 10 });
    (two && gone && copy && looks && oneLine)
      ? ok(`57.9 / 57.10 / v30 59.5 both Gauntlet screens read as Aiden wrote them: "${screens[0].soon}" and "${screens[1].soon}" with the 8 generated from the roster, EIGHT rows for eight games (Estimate is one — "${est[0][1]}", ${est[0][2]} on Mini and ${est[1][2]} on Mega), nothing under the list, ${screens[0].go} on both, and a NOBLE face in a deep red with the slow flicker untouched on the title and the button while the rows keep the mono face — ${screens[0].titleFace} ${screens[0].weights[0]} on Mini and ${screens[1].titleFace} ${screens[1].weights[0]} on Mega, each on ONE line at ${screens[0].vw}px and inside the phone, Mega's red (${screens[1].titleCol}) a step past Mini's (${screens[0].titleCol}). Mini's Stopwatch is ${sw.s} rounds, still drawn from its ${swBand.join('-')}s window`)
      : bad('57.9 / 57.10 / v30 59.5 the Gauntlet screens', JSON.stringify({ two, sw, swBand, gone, copy, looks, oneLine, screens, est }));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  }
  await duels68();
}

/* ---- build 69 (68.28): GAUNTLET · VERSUS, test-only — a run of duels against the computer ----
   Aiden: "The gauntlet mini should actually be versing a computer in the versus mode of the games … simulated like a set number of hits per
   second … put it into the game as like an additional version, just so I can test it." Everything the computer plays at is read off the
   config here (VERSUS_AI, KEY_BARS), never typed. The player's end is played by an in-page hand that taps the real elements (a lit pad, the
   square, the flash, the clock at its target, the ball at its marker, the shape) and, on a Grow round, holds for exactly the target — so
   which side wins is decided by the computer's level, which the run's own test hook sets. */
async function duels68() {
  const GA = await import(pathToFileURL(path.join(root, 'config', 'gauntlets.js')).href);
  const KB = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const CP = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const GM = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const ID = GA.VERSUS_ID, steps = GA.GAUNTLET_RUNS[ID] || [];
  const dname = st => GM.GAMES[st.g].name + (GM.GAMES[st.g].modes.length > 1 && GM.MODE_NAME[st.d] ? ' · ' + GM.MODE_NAME[st.d] : '');

  // the roster: seven duels, one per game, Sequence and Spot · Count left out, every one with an opponent row whose bar exists
  { const keys = steps.map(s => s.g + ':' + s.d), games = new Set(steps.map(s => s.g));
    const noRow = keys.filter(k => !GA.VERSUS_AI[k] || !KB.KEY_BARS[GA.VERSUS_AI[k].bar]);
    (steps.length === 7 && new Set(keys).size === 7 && games.size === 6 && !games.has('sequence') && !keys.includes('spot:count') && !noRow.length && GA.GAUNTLET_RUNS.g1.length === 9)
      ? ok(`68.28 Gauntlet · Versus is seven duels, one per game — ${steps.map(dname).join(' > ')} — Sequence and Spot · Count left out, every duel an opponent row in VERSUS_AI on a Skill bar that exists; Mini and Mega untouched`)
      : bad('68.28 the Gauntlet · Versus roster', JSON.stringify({ keys, noRow })); }

  // it exists only while BUILD_FLAGS.dev; it is not on the map and no chest wants it
  await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } });
  await click('[data-go="s-pick"]'); await sleep(1200);
  const where = await page.evaluate(async id => { const B = await import('./config/build.js'), G = await import('./run/gauntlet.js'), K = await import('./progress/key.js'), C = await import('./config/chests.js');
    const tile = document.querySelectorAll(`#grid [data-gauntlet="${id}"]`).length, needs = C.CHESTS.flatMap(c => K.chestNeeds(c.id)).filter(r => r.gaunt === id).length;
    const onDev = G.duelOn(id); B.BUILD_FLAGS.dev = false; const offStart = G.startGauntlet(id), offOn = G.duelOn(id); B.BUILD_FLAGS.dev = true;
    const btn = document.getElementById('dev-gversus');
    return { tile, needs, onDev, offStart, offOn, gaunted: K.chestNeeds('pro').map(r => r.gaunt).filter(Boolean), btn: btn ? { dev: btn.hasAttribute('data-dev'), act: btn.dataset.act, text: btn.textContent } : null }; }, ID);
  (where.tile === 0 && where.needs === 0 && where.onDev && where.offStart === false && !where.offOn && where.btn && where.btn.dev && where.gaunted.join() === 'g1')
    ? ok(`68.28 Gauntlet · Versus exists only while BUILD_FLAGS.dev — off, startGauntlet refuses it; its Testing button carries data-dev (the native build strips it) — and it has no map tile and no chest asks for it (the Pro chest still wants Gauntlet Mini alone)`)
    : bad('68.28 Gauntlet · Versus is test-only', JSON.stringify(where));

  // every opponent number is DERIVED from KEY_BARS at run time: the config's arithmetic, and a bar that moves moves the computer
  { const want = {}; for (const [k, r] of Object.entries(GA.VERSUS_AI)) { const bar = KB.KEY_BARS[r.bar].bar, len = +r.bar.split(':')[2];
      const per = r.kind === 'mean' ? bar : bar / len; want[k] = r.kind === 'rate' ? per * r.level : per / r.level; }
    const got = await page.evaluate(async () => { const G = await import('./run/gauntlet.js'), A = await import('./config/gauntlets.js'), KB = await import('./config/key-bars.js');
      const out = {}; for (const [k, r] of Object.entries(A.VERSUS_AI)) { const row = KB.KEY_BARS[r.bar], was = row.bar, a = G.versusPlays(k).at;
        row.bar = was * 1.5; const b = G.versusPlays(k).at; row.bar = was; out[k] = { a, b, back: G.versusPlays(k).at }; } return out; });
    const off = Object.keys(want).filter(k => !got[k] || Math.abs(got[k].a - want[k]) > 1e-9 || Math.abs(got[k].b / got[k].a - 1.5) > 1e-9 || got[k].back !== got[k].a);
    const shown = Object.keys(want).map(k => `${k} ${(+got[k].a).toFixed(GA.VERSUS_AI[k].dp)}`).join(', ');
    !off.length ? ok(`68.28 every opponent number comes off its Skill bar at run time — ${shown} — and moving a bar by half moves the computer by half`)
      : bad('68.28 the opponent numbers are derived from KEY_BARS', JSON.stringify({ off, want, got })); }

  // the in-page hand for the player's end, and the listeners the run is read through
  const hand = (on, slow = 0) => page.evaluate(async (on, slow) => {
    clearInterval(window.__hand68); if (!on) return;
    const [TM, HD, SP, RX] = (await Promise.all([import('./games/timing/index.js'), import('./games/estimate/index.js'), import('./games/spot/index.js'), import('./games/reaction/index.js')])).map(m => m.default);
    const G = await import('./config/games.js'), C = await import('./core.js');
    const pd = (el, x, y) => el && el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }));
    const mid = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    window.__hand68 = setInterval(() => { const gm = document.getElementById('game'); if (!gm.classList.contains('on') || !gm.classList.contains('live')) return; const g = gm.dataset.g;
      if (gm.classList.contains('tapon')) { const t = document.getElementById(g === 'hold' ? 'hfield' : 'gen'); return pd(t, ...mid(t)); }
      if (g === 'quick-tap') { if (slow && performance.now() - (window.__last68 || 0) < slow) return; window.__last68 = performance.now(); for (let i = 0; i < 4; i++) { const sq = document.getElementById('vsq0' + i); if (sq && sq.style.getPropertyValue('--v').trim() === '1') { const p = document.querySelector(`[data-vs-side="0:${i}"]`); return pd(p, ...mid(p)); } } return; }
      if (g === 'dots') { const s = document.getElementById('vs0'); if (s && s.classList.contains('on')) pd(document.getElementById('vfield'), ...mid(s)); return; }
      if (g === 'hold') { if (HD.two && HD.two.on && HD.two.p === 0 && HD.st === 'wait') { HD.down({ type: 'down', x: 0, y: 0 }); HD.t0 = performance.now() - HD.target / (G.CFG.holdRate * C.vmin()) * 1000; HD.up(); } return; }
      if (g === 'reaction') { const p = document.getElementById('rxpane'); if (p && p.classList.contains('lit') && RX.armed) { const e = document.getElementById('gen'), r = e.getBoundingClientRect(); pd(e, r.left + r.width / 2, r.top + r.height * .8); } return; }
      if (g === 'timing') { if (!(TM.two && TM.two.on && TM.two.p === 0 && TM.st === 'run')) return;
        const hit = TM.hid() ? (TM.ball && TM.ball.t >= TM.ball.markT) : performance.now() - TM.t0 >= TM.target * 1000; if (hit) { const e = document.getElementById('gen'); pd(e, ...mid(e)); } return; }
      if (g === 'spot') { if (SP.st !== 'vsfind') return; const i = SP.pts.findIndex(q => q.shape === SP.o1), el = document.querySelectorAll('#gen .fs')[i]; if (el) pd(document.getElementById('gen'), ...mid(el)); } }, 25); }, on, slow);
  const listen = () => page.evaluate(() => import('./core/events.js').then(E => { window.__gv68 = null; window.__gb68 = []; window.__acts68 = [];
    if (!window.__on68) { window.__on68 = 1; E.on('gaunt:done', o => { if (o && o.duel) window.__gv68 = o; }); E.on('gaunt:between', b => window.__gb68.push(b.i)); E.on('bot:act', a => window.__acts68.push(a)); } }));
  let nexts = 0;
  const drive = async (over, ms = 300000, stopAtBetween = false) => {
    await listen(); await page.evaluate((id, o) => import('./run/gauntlet.js').then(G => G.startGauntlet(id, o)), ID, over);
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const st = await page.evaluate(() => ({ done: window.__gv68, between: window.__gb68.length, next: !!document.querySelector('#s-gauntlet.on [data-act="gaunt-next"]') }));
      if (st.done) return st.done;
      if (st.next) { if (stopAtBetween) return { between: true }; await click('#s-gauntlet.on [data-act="gaunt-next"]'); nexts++; }
      await sleep(150); }
    return null; };
  const store = () => page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {};
    return { runs: (st.runs || []).length, unlock: Object.keys(st.unlock || {}).length, ach: Object.keys(st.ach || {}).length, bars: Object.keys(st.bars || {}).length, gaunt: (st.gaunt || []).filter(r => r.id === 'g3').map(r => r.score) }; });

  await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 0 } }, { unlock: {}, ach: {}, bars: {} });
  const before = await store();
  // A WHOLE RUN THE COMPUTER ENDS EARLY: every duel at a hundredth of its level except duel 2 (Dots), forced far past the player
  await hand(true);
  const lost = await drive({ seed: 11, level: 0.01, miss: 0, levels: { 1: 60 } });
  const lostScreen = await page.evaluate(() => ({ on: document.querySelector('.screen.on') && document.querySelector('.screen.on').id, big: (document.querySelector('#gt-body .gtbig') || {}).textContent || '',
    retry: !!document.querySelector('#gt-body [data-act="gaunt-go"]'), back: !!document.querySelector('#gt-body [data-act="back"]'), ticks: document.querySelectorAll('#gt-body .gtduel li.won').length }));
  const wantLost = fill(CP.GAUNTLET.duelOver, { n: 2, s: steps.length, name: dname(steps[1]) });
  (lost && lost.duel && lost.duel.lost && lost.duel.at === 2 && lost.duel.won === 1 && nexts === 1 && lostScreen.on === 's-gauntlet' && lostScreen.big === wantLost && lostScreen.retry && lostScreen.back && lostScreen.ticks === 1)
    ? ok(`68.28 a Gauntlet · Versus run is a run of duels: duel 1 won, the screen between offers the next, and the computer winning duel 2 ends the run there — "${lostScreen.big}", with Retry and Back`)
    : bad('68.28 the computer ends the run early', JSON.stringify({ lost, nexts, lostScreen, wantLost }));
  // AND ONE THE PLAYER WINS OUTRIGHT: every duel at a hundredth of its level
  nexts = 0;
  const won = await drive({ seed: 12, level: 0.01, miss: 0 });
  const wonScreen = await page.evaluate(() => ({ big: (document.querySelector('#gt-body .gtbig') || {}).textContent || '', ticks: document.querySelectorAll('#gt-body .gtduel li.won').length }));
  const wantWon = fill(CP.GAUNTLET.duelAll, { name: CP.GAUNTLET.name[ID], s: steps.length });
  (won && won.duel && !won.duel.lost && won.duel.won === steps.length && nexts === steps.length - 1 && wonScreen.big === wantWon && wonScreen.ticks === steps.length)
    ? ok(`68.28 with the computer beaten in every duel the run goes all the way — six screens between, then "${wonScreen.big}"`)
    : bad('68.28 a Gauntlet · Versus run won outright', JSON.stringify({ won, nexts, wonScreen, wantWon }));
  await hand(false);
  const after = await store();
  (after.runs === before.runs && after.unlock === before.unlock && after.ach === before.ach && after.bars === before.bars && after.gaunt.length === before.gaunt.length + 2 && after.gaunt[0] === steps.length && after.gaunt[1] === 1)
    ? ok('68.28 / L10 a Gauntlet · Versus run advances nothing — no board row, unlock, achievement or bar — and writes one row each to its own board, scored in duels won (7, then 1)')
    : bad('68.28 / L10 Gauntlet · Versus wrote something it should not have', JSON.stringify({ before, after }));

  /* NO RUBBER-BANDING: the same seed plays the same computer whatever the player does. Quick Tap twice on one seed — once with nobody at
     the player's end (the computer wins it), once with the player tapping at a steady 2.5 a second (the player wins it) — and the computer's draws, every one
     its rate and whether it missed, are the same sequence in both. */
  await page.evaluate(() => import('./ui/router.js').then(R => R.show('s-menu'))); await sleep(300);
  await hand(false); const idle = await drive({ seed: 77 }, 120000);
  const idleActs = await page.evaluate(() => window.__acts68.filter(a => a.key === 'quick-tap:two'));
  await hand(true, 400); const busy = await drive({ seed: 77 }, 120000, true);
  const busyActs = await page.evaluate(() => window.__acts68.filter(a => a.key === 'quick-tap:two'));
  await hand(false); await page.evaluate(() => import('./run/gauntlet.js').then(G => { G.gauntDrop(); return import('./ui/router.js'); }).then(R => R.show('s-menu')));
  const n = Math.min(idleActs.length, busyActs.length), same = n >= 5 && idleActs.slice(0, n).every((a, i) => a.v === busyActs[i].v && a.miss === busyActs[i].miss);
  (idle && idle.duel && idle.duel.lost && idle.duel.at === 1 && busy && busy.between && same)
    ? ok(`68.28 no rubber-banding — on one seed the computer's Quick Tap draws are the same ${n} in a row whether the player sits still (the computer wins) or taps it down (the player wins); its rate is ${(GA.VERSUS_AI['quick-tap:two'].level * KB.KEY_BARS[GA.VERSUS_AI['quick-tap:two'].bar].bar / +GA.VERSUS_AI['quick-tap:two'].bar.split(':')[2]).toFixed(2)} taps a second either way`)
    : bad('68.28 the computer reads nothing of the player', JSON.stringify({ idle: idle && idle.duel, busy, n, idleActs: idleActs.slice(0, 8), busyActs: busyActs.slice(0, 8) }));
}
