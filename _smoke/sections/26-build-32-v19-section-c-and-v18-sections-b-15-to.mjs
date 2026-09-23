/* ---- 13. build 32 (v19 §C, v18 §B.15–§B.27): Go / No-go's dealing and scoring, the three tiers, the chests ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, part, section, check, ok, bad, finished, root, read, REVIEW, rvRead, noReview, strip, boot, NOW, at, page, until, onScreen, click, setStorage, OPEN_PREFS, SEEN_INTRO, up, revealDone, finish, named } from '../lib/gate.mjs';

export const SECTION = ["build 32 - v19 section C and v18 sections B.15 to B.27"];

export async function run() {
  const rx32 = read('games', 'reaction', 'index.js'), keyjs32 = read('ui', 'screens', 'key.js'), css32 = read('styles', 'app.css');
  const store32 = read('core', 'store.js'), run32 = read('run', 'run.js'), pkjs32 = read('progress', 'key.js'), pick32 = read('ui', 'screens', 'pick.js');
  const tpl32 = rvRead('scripts', 'catalogue.template.html'), cat32 = rvRead('scripts', 'catalogue.mjs');
  const G32 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB32 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const KY32 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CP32 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const B32 = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
  const svgClick = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);

  /* ---- §C statically: the gate, the budget, the gaps, the dwell, the five shapes, the units ---- */
  {
    const RXC = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { free: R.NOGO_FREE, bud: R.NOGO_BUD, wrongSet: R.NOGO_WRONG_SET, wrongStreak: R.NOGO_WRONG_STREAK, gapMin: R.GO_GAP_MIN, gapMax: R.GO_GAP_MAX, dwell: R.NOGO_DWELL, per: R.GO_PER }; });
    (RXC.free === 180 && RXC.bud === 3000 && RXC.wrongSet === 150 && RXC.wrongStreak === 200)
      ? ok(`C.5 / C.6 (L5) the gate is ${RXC.free}ms and the Streak budget ${RXC.bud}ms; a wrong tap still adds ${RXC.wrongSet} to a Set and spends ${RXC.wrongStreak} of a Streak`)
      : bad('C.5 / C.6 the gate and the budget', JSON.stringify(RXC));
    (RXC.gapMin === 1 && RXC.gapMax === 5) ? ok('C.2 (L5) each target sits behind 1 to 5 decoys — 2nd to 6th in its sub-round') : bad('C.2 the gap range', JSON.stringify(RXC));
    const D = RXC.dwell || {};
    (D.set === 980 && D.streak === 1330 && D.spread === 180 && D.set - D.spread >= 800 && D.streak - D.spread >= 1150)
      ? ok(`C.4 (L5) dwell is ${D.set} ± ${D.spread} on a Set and ${D.streak} ± ${D.spread} on a Streak — never quicker than build 31's 800 / 1150, and variable`)
      : bad('C.4 the dwell', JSON.stringify(D));
    /* AMENDED at build 50 (v26 §B2, #444): Go / No-go's pool is config/shapes.js DEALS 'reaction:nogo' — nine shapes, the hexagon gone — and every shape is
       the shared svg. The stylesheet half of this check is DELETED (site/CLAUDE.md → The gate): it tested how app.css spelled the clip paths */
    { const CS32 = await import(pathToFileURL(path.join(root, 'config', 'shapes.js')).href), pool32 = CS32.DEALS['reaction:nogo'].pool;
      (pool32.length === 9 && !pool32.includes('hex') && pool32.every(s => CS32.SHAPES[s]))
        ? ok('C.3 amended: Go / No-go deals ' + pool32.length + ' shapes (' + pool32.join(', ') + '), every one on the shape list, no hexagon')
        : bad('C.3 the Go / No-go shapes', pool32.join(',')); }
    const s32 = strip(rx32);
    (/gated\(ms\)\{ return Math\.max\(0,ms-this\.NOGO_FREE\); \}/.test(s32) && /const add=this\.gated\(ms\); if\(this\.streak\(\)\) this\.over\+=add;/.test(s32) && /const all=this\.gatedAll\(\);/.test(s32) && !/this\.beatMs\(\)\)\.fill|fill\(this\.beatMs\(\)\)/.test(s32))
      ? ok('C.5 every tap goes through gated() — Streak spend and Set mean alike — and a skipped target is charged the dwell it was given')
      : bad('C.5 the gate is one function on both lengths');
    /* RESTATED at build 60 (v31 60.22): the Set line no longer NAMES the 180ms gate, because a mode line is one short line now. The
       gate itself has not moved — it is NOGO_FREE, it is asserted three lines up in C.5, and it is written out in the catalogue's
       scoring section, which "build 45" drives off the engine's own constant. What C.6 stands for — the Streak's UNIT and the
       constants that were retired — is unchanged, and the line is now asserted to be inside SET_LIMIT instead. */
    (/hits:this\.gotAll,/.test(s32) && G32.GAMES.reaction.per.nogo.streak.scoreWord === 'targets' && G32.SET_COPY['reaction:nogo'].set.length <= G32.SET_LIMIT && /targets/i.test(G32.SET_COPY['reaction:nogo'].streak) && !/GO_PAD|GO_SPREAD|beatMs\(\)\?1150|\['circle','square','tri'\]/.test(s32))
      ? ok(`C.6 a Streak scores in TARGETS (gotAll) and the sheet says so — "${G32.SET_COPY['reaction:nogo'].streak}", and the Set line "${G32.SET_COPY['reaction:nogo'].set}" is inside the ${G32.SET_LIMIT}-character limit (60.22 moved the 180ms gate to the catalogue's scoring section; C.5 above still asserts the gate itself); GO_PAD, GO_SPREAD, the fixed beats and the three-shape list are gone`)
      : bad('C.6 the Streak unit and the retired constants');
    (B32.RUN_SCHEMA === 4 && /function up3\(raw\)/.test(store32) && /r\.d==='nogo'&&\(r\.v\|\|0\)<4/.test(store32) && /delete raw\.bars\['reaction:nogo:-1'\]/.test(store32) && /if\(\(raw\.v\|\|0\)<3\) raw=up3\(raw\);/.test(store32))
      ? ok('C.5 / C.6 a scoring unit changed, so RUN_SCHEMA is 4 and up3 retires the Go / No-go records and the Streak bar\'s cleared flag, nothing else')
      : bad('the migration for the Go / No-go unit change', `RUN_SCHEMA ${B32.RUN_SCHEMA}`);
    const ng = KB32.KEY_BARS['reaction:nogo:5'], ngs = KB32.KEY_BARS['reaction:nogo:-1'];
    // AMENDED at build 44 (v24 §E): the conversion stood until Aiden set both bars himself — 400 over the gate and 10 targets, in the same units
    (ng.bar === 400 && ng.dir === 'lower' && ng.unit === 'ms avg over 180' && ngs.bar === 10 && ngs.dir === 'higher' && ngs.unit === 'targets')
      ? ok('C.5 / C.6 the Go / No-go bars are read over the gate and in targets — Aiden\'s 400ms and 10 targets (v24 §E)')
      : bad('the two Go / No-go bars', JSON.stringify([ng, ngs]));
  }
  /* ---- §C as behaviour: 400 dealt rounds, the target order, the dwell draw, the arithmetic ---- */
  {
    const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default; const G = await import('./config/games.js');
      // AMENDED at build 50 (v26 §B2): the pool is DEALS 'reaction:nogo', and a round's go shape comes from the dealer, keyed by the round
      const CS = await import('./config/shapes.js');
      R.ctx = { mode: 'nogo', len: 5 }; R.two = { on: false }; R.rule = 'circle'; R.spec = null; R.dealer = null;
      const all = CS.DEALS['reaction:nogo'].pool;
      const out = { n: 0, first: 0, count: 0, adjacent: 0, thrice: 0, dup: 0, badDecoy: 0, gaps: {}, lens: {}, min: 99, max: 0, shapesSeen: new Set() };
      for (let i = 0; i < 400; i++) { const b = R.dealRound(); out.n++;
        out.lens[b.length] = (out.lens[b.length] || 0) + 1; out.min = Math.min(out.min, b.length); out.max = Math.max(out.max, b.length);
        if (b[0] === R.rule) out.first++;
        if (b.filter(s => s === R.rule).length !== R.GO_PER) out.count++;
        let gap = 0; for (let j = 0; j < b.length; j++) { b[j] === R.rule ? (out.gaps[gap] = (out.gaps[gap] || 0) + 1, gap = 0) : gap++; if (j && b[j] === R.rule && b[j - 1] === R.rule) out.adjacent++; if (b[j] !== R.rule) { out.shapesSeen.add(b[j]); if (!all.includes(b[j])) out.badDecoy++; } }
        for (let j = 2; j < b.length; j++) if (b[j] === b[j - 1] && b[j] === b[j - 2]) out.thrice++;
        for (let j = 1; j < b.length; j++) if (b[j] !== R.rule && b[j] === b[j - 1]) out.dup++; }
      // C.3: a Set's five targets are the five shapes, and a Streak never deals the same target twice running
      R.rule = ''; R.dealer = null; const setOrder = []; for (let i = 0; i < 5; i++) { R.round = i + 1; R.rule = R.nextTarget(); setOrder.push(R.rule); }
      let repeat = 0; R.rule = ''; R.dealer = null; let prev = ''; for (let i = 0; i < 60; i++) { R.round = i + 1; R.rule = R.nextTarget(); if (R.rule === prev) repeat++; prev = R.rule; }
      R.spec = null; R.dealer = null;
      // C.4: the dwell draw, per length
      const dw = { set: [], streak: [] }; for (let i = 0; i < 300; i++) { R.ctx.len = 5; dw.set.push(R.dwellMs()); R.ctx.len = G.STREAK; dw.streak.push(R.dwellMs()); }
      const rng = a => ({ min: Math.min(...a), max: Math.max(...a), distinct: new Set(a).size });
      // C.5: the arithmetic on three raw taps at the old bar's pace, then one wrong tap, then a skipped target; and a Streak in targets
      R.ctx.len = 5; R.times = [380, 380, 380]; R.skipped = []; R.wrong = 0; R.gotAll = 3; const set0 = R.nogoScore().hits;
      R.wrong = 1; const set1 = R.nogoScore().hits; R.wrong = 0; R.skipped = [980]; const set2 = R.nogoScore().hits;
      R.times = [100, 150, 180]; R.skipped = []; const setFree = R.nogoScore().hits;
      R.ctx.len = G.STREAK; R.gotAll = 7; R.seen = 40; const streakHits = R.nogoScore().hits;
      R.ctx = null; R.times = []; R.skipped = []; R.wrong = 0; R.gotAll = 0; R.seen = 0; R.pool = [];
      return { ...out, shapesSeen: [...out.shapesSeen].sort(), setOrder, distinctTargets: new Set(setOrder).size, repeat, dwSet: rng(dw.set), dwStreak: rng(dw.streak), set0, set1, set2, setFree, streakHits }; });
    (!d.first && !d.count && !d.adjacent && !d.thrice && !d.dup && !d.badDecoy)
      ? ok(`C.1 / C.2 400 dealt rounds: first shape always a decoy, exactly 3 targets, NO TWO TARGETS ADJACENT, no shape three running, no decoy repeated (${d.min}–${d.max} shapes a round)`)
      : bad('C.1 / C.2 the solo dealer', JSON.stringify({ first: d.first, count: d.count, adjacent: d.adjacent, thrice: d.thrice, dup: d.dup, badDecoy: d.badDecoy }));
    const gapTot = Object.values(d.gaps).reduce((a, b) => a + b, 0); const gapShare = Object.fromEntries(Object.entries(d.gaps).map(([k, v]) => [k, +(v / gapTot).toFixed(3)]));
    const gapOk = [1, 2, 3, 4, 5].every(k => (d.gaps[k] || 0) / gapTot >= 0.12) && !d.gaps[0] && !d.gaps[6];
    gapOk ? ok(`C.2 the target's position is spread — decoys before it, share of 1200 targets: ${JSON.stringify(gapShare)}`) : bad('C.2 the position is drawn uniformly from 1 to 5 decoys', JSON.stringify(gapShare));
    // AMENDED at build 50 (v26 §B2): decoys come from the other eight shapes of the nine
    (d.shapesSeen.length === 8 && d.distinctTargets === 5 && !d.repeat)
      ? ok(`C.3 decoys come from the other eight shapes (${d.shapesSeen.join(', ')}), a Set's five targets are five different shapes (${d.setOrder.join(' → ')}), and a Streak never repeats a target twice running`)
      : bad('C.3 the five shapes', JSON.stringify({ seen: d.shapesSeen, order: d.setOrder, repeat: d.repeat }));
    (d.dwSet.min >= 800 && d.dwSet.max <= 1160 && d.dwSet.distinct > 20 && d.dwStreak.min >= 1150 && d.dwStreak.max <= 1510 && d.dwStreak.distinct > 20)
      ? ok(`C.4 300 dwell draws: a Set shape stays ${d.dwSet.min}–${d.dwSet.max}ms, a Streak shape ${d.dwStreak.min}–${d.dwStreak.max}ms, and the draw varies`)
      : bad('C.4 the dwell draw', JSON.stringify({ set: d.dwSet, streak: d.dwStreak }));
    (d.set0 === 200 && d.set1 === 350 && d.set2 === 350 && d.setFree === 0 && d.streakHits === 7)
      ? ok(`C.5 the arithmetic: three 380ms taps read 200 (over the gate), a wrong tap adds 150 (350), a skipped 980ms target is charged 800 (mean 350), three taps at or under 180 read 0, and a Streak reads its targets (7), not its shapes (40)`)
      : bad('C.5 the scoring', JSON.stringify({ set0: d.set0, set1: d.set1, set2: d.set2, setFree: d.setFree, streakHits: d.streakHits }));
    // the migration as behaviour: a v2 record with Go / No-go runs in the old units
    /*
   v29 (item 13, build 55): the fixture OPENS the chest it needs. It used to lean on OPEN EVERYTHING, and a dev flag no
   longer banks a bar or retro-credits a column — "OPEN EVERYTHING and SUPPORTER stay flags that store no progress"
   (CLAUDE.md). Every READ still honours the escapes; only the two writers ask tierEarned().
    */
    await setStorage({ ne: { v: 2, prefs: { ...OPEN_PREFS, chests: { games: 1, key: 0, pro: 0, thorns: 0 } }, runs: [
        { t: NOW - 1000, g: 'reaction', d: 'nogo', s: 5, n: '', v: 3, hits: 380, misses: 0 }, { t: NOW - 2000, g: 'reaction', d: 'nogo', s: -1, n: '', v: 3, hits: 12, misses: 1 },
        { t: NOW - 3000, g: 'reaction', d: 'flash', s: 5, n: '', v: 3, hits: 255, misses: 0 }, { t: NOW - 4000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 14, misses: 0 } ],
      unlock: {}, ach: { rx_clean: NOW }, intro: SEEN_INTRO, seen: {}, bars: { 'reaction:nogo:5': NOW, 'reaction:nogo:-1': NOW, 'quick-tap:two:5': NOW } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const mig = await page.evaluate(async () => { const S = await import('./core/store.js');
      return { v: JSON.parse(localStorage.getItem('ne')).v, runs: S.store.runs.map(r => r.g + ':' + r.d), bars: Object.keys(S.store.bars).sort(), ach: Object.keys(S.store.ach), mig: S.prefs.mig32, toast: document.getElementById('toast').textContent.trim() }; });
    // AMENDED at build 38 (#426): key-1 bars only - with Pro now a real tier, boot credits this profile's 14-hit run against Pro's 14 too
    // AMENDED at build 44 (v24 §E): key 1 is credited at boot too now, so the surviving Flash run's 255ms banks Aiden's 295ms Flash · Set bar
    (mig.runs.join(',') === 'reaction:flash,quick-tap:two' && mig.bars.filter(k => !k.includes('|')).join(',') === 'quick-tap:two:5,reaction:flash:5,reaction:nogo:5' && !mig.bars.includes('reaction:nogo:-1') && mig.ach.includes('rx_clean'))
      ? ok(`C.5 / C.6 a v2 record retires exactly the two Go / No-go runs and the Streak bar's cleared flag — the Set bar, the Flash run, the Quick Tap run and Disciplined stay (${mig.toast || 'toast pending'})`)
      : bad('the Go / No-go migration', JSON.stringify(mig));
  }
  /* ---- B.27: three tiers per row, the shell derived from the column, the catalogue's three inputs ---- */
  {
    const rows = Object.values(KB32.KEY_BARS);
    /* AMENDED at build 44 (v24 §E): both columns are FULL - each Pro and Author number is either Aiden's (no marker: the twelve Quick Tap and
       Dots Pro figures) or a desk proposal whose marker still holds (the other 48); every key 1 bar is `conf:'set'` */
    const aidenPro = rows.filter(r => /^(qt|dt)-/.test(r.id));
    /* AMENDED at build 60 (v31 60.6): ONE AUTHOR CELL IS AIDEN'S NOW — `es-cut-streak`, 25, "I reached around 25, put that as an
       author time for now" (2026-09-23). A.2 as amended at #426 says a ported number DROPS its marker and no build regenerates it,
       so the rule this asserts is not "every author cell is marked" but "every author cell is EITHER Aiden's, with no marker, OR a
       desk proposal whose marker still matches the number". The same shape the Pro column has had since build 44. */
    const aidenAuthor = rows.filter(r => !(r.placeholder && r.placeholder.author));
    (rows.every(r => typeof r.pro === 'number' && typeof r.author === 'number' && r.conf === 'set'
        && r.placeholder && (!r.placeholder.author || (r.placeholder.author.v === r.author && r.placeholder.author.by === 'desk')))
      && aidenAuthor.length === 1 && aidenAuthor[0].id === 'es-cut-streak' && aidenAuthor[0].author === 25
      && aidenPro.length === 12 && aidenPro.every(r => !('pro' in r.placeholder)) && rows.filter(r => !aidenPro.includes(r)).every(r => r.placeholder.pro && r.placeholder.pro.v === r.pro && r.placeholder.pro.by === 'desk')
      && KY32.KEYS.every(k => !('shell' in k)))
      ? ok(`B.27 / v24 §E / v31 60.6 every one of the ${rows.length} rows carries pro and author: 12 Pro figures and 1 Author figure (es-cut-streak, 25) are Aiden's own and carry no marker, the other ${rows.length * 2 - 13} cells are desk proposals marked by:'desk' whose markers still match their numbers, every key 1 bar is conf 'set', and config/keys.js carries no shell flag`)
      : bad('B.27 the data shape', JSON.stringify(rows.filter(r => !(typeof r.pro === 'number' && typeof r.author === 'number' && r.placeholder && r.conf === 'set')).map(r => r.id)));
    const sh = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const KB = await import('./config/key-bars.js');
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.store.bars = {}; S.save();   // AMENDED at build 40 (L.10): chest 1 is the Skill chest, behind the Games chest
      const c = K.COMBOS.find(x => x.g === 'quick-tap' && x.s === 5);
      const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, misses: 0, hits: c.bar.bar + 50, v: 4 };
      // the shell is still DERIVED: empty one Pro and one Author cell in memory and both tiers are shells again
      const r1 = KB.KEY_BARS['dots:blind:5'], was = [r1.pro, r1.author]; r1.pro = null; r1.author = null;
      const adv = K.checkKey(run, false);
      const out = { shellClear: K.isShell('clear'), shellPro: K.isShell('pro'), shellAuthor: K.isShell('author'), fullClear: K.tierFull('clear'), barPro: K.barOf(K.COMBOS.find(x => x.key === 'dots:blind:5'), 'pro'), skey: K.skey('a:b:5', 'pro'),
        tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv && adv.tier, bars: Object.keys(S.store.bars), pct: K.keyPct('pro') };
      // …and with the columns full again the same run is a real clear on every open tier
      r1.pro = was[0]; r1.author = was[1]; S.store.bars = {};
      const adv2 = K.checkKey(run, false);
      // v29 (item 13, build 55): tierEARNED, not tierOpen — the Pro chest is shut in this fixture, so Author is SHOWN (the dev flag) and never BANKED
      out.full = { tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv2 && adv2.tier, bars: Object.keys(S.store.bars).sort(), author: K.tierEarned('author'), pct: K.keyPct('pro') };
      S.store.bars = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    (!sh.shellClear && sh.shellPro && sh.shellAuthor && sh.fullClear && sh.barPro === null && sh.skey === 'a:b:5|pro' && sh.tiers.join(',') === 'clear:live,pro:shell,author:shell')
      ? ok('B.27 the shell is still DERIVED: empty one Pro and one Author cell and key 1 stays live while Pro and Author are shells, the emptied bar reading null')
      : bad('B.27 isShell / tierFull / barOf', JSON.stringify(sh));
    (sh.adv === 'clear' && sh.bars.join(',') === 'quick-tap:two:5' && sh.pct.pct === 0 && sh.pct.total === 0)
      ? ok('B.27 a run far past every bar clears key 1 only while they are shells — a shell tier banks nothing and its percentage is 0 of 0')
      : bad('B.27 a shell tier clears nothing', JSON.stringify(sh));
    (sh.full.tiers.join(',') === 'clear:live,pro:live,author:live' && sh.full.adv === 'clear' && sh.full.pct.total > 0
      && sh.full.bars.join(',') === (sh.full.author ? 'quick-tap:two:5,quick-tap:two:5|author,quick-tap:two:5|pro' : 'quick-tap:two:5,quick-tap:two:5|pro'))
      ? ok(`#426 with the columns full the same run is a real clear on every open tier (${sh.full.bars.join(', ')}), the interlude still draws key 1's, and Pro counts ${sh.full.pct.done} of ${sh.full.pct.total}`)
      : bad('#426 a full column is a real tier', JSON.stringify(sh.full));
    !REVIEW ? noReview('B.27 the catalogue emits all three tiers a row')
      : (/pro: b \? KY\.barOf\(c, 'pro'\) : null, author: b \? KY\.barOf\(c, 'author'\) : null/.test(cat32) && /id="' \+ PFX\[tier\] \+ r\.id/.test(tpl32) && /inp\('clear'\) \+ inp\('pro'\) \+ inp\('author'\)/.test(tpl32) && /bars: \{ clear: CUR\.clear, pro: CUR\.pro, author: CUR\.author \}/.test(tpl32))
      ? ok('B.27 the review catalogue emits all three tiers a row and the page saves {bars:{clear,pro,author}} to bars/current')
      : bad('B.27 the catalogue\'s three inputs');
  }
  /* ---- B.15 / B.16 / B.17: "67% complete", the step into Pro, the re-based number ----
     RETIRED at build 40 (v23 L.8a / L.8b): the front of the app reads THE METER, 0-400, and never re-bases; "Open the chest?" and "Would
     you like to progress to Pro?" are gone with the double confirmation. Reversed both ways - nothing of the step is left, the menu reads
     the meter - and B.19's column is four chests now ---- */
  {
    const r40 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), rd40 = (...p) => fs.readFileSync(path.join(r40, ...p), 'utf8'), nocom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const gone = { front: /frontPct|FRONT_BASE/.test(nocom(rd40('progress', 'key.js'))), ask: /askPro|askBox|ask-yes|askwrap/.test(nocom(rd40('ui', 'screens', 'pick.js')) + rd40('index.html')),
      copy: /proAsk|proWarn|openAsk|openYes/.test(nocom(rd40('config', 'copy.js'))), pref: /pro:\[0,1,2\]/.test(rd40('core', 'store.js')) };
    (!gone.front && !gone.ask && !gone.copy && !gone.pref)
      ? ok('B.15 / B.16 / B.17 RETIRED at build 40 (L.8b): no frontPct, no 30/70 re-base, no "Open the chest?", no "Would you like to progress to Pro?", no prefs.pro') : bad('B.16 / B.17 the step into Pro is gone', JSON.stringify(gone));
    const seed = await page.evaluate(async () => { const K = await import('./progress/key.js'); const U = await import('./config/unlocks.js'); const bars = {}, unlock = {};
      for (const c of K.COMBOS) bars[c.key] = Date.now(); for (const x of U.UNLOCKS) unlock[x.key] = Date.now(); return { bars, unlock }; });
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, keySeen: 1, chests: { games: 1, key: 1 } }, runs: [], ach: {}, unlock: seed.unlock, intro: SEEN_INTRO, seen: {}, bars: seed.bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(1400);
    const line = await page.evaluate(() => document.getElementById('menu-key').textContent.trim());
    /* AMENDED at build 48 (v26 items 7 / 9): the meter is 0–300, the keys alone - key 1 whole with the Skill chest open is 100.
       Build 53 (v28 item 9) clamped what the FRONT PRINTS to 0–100, so this read 33%. REVERSED AT BUILD 55 (v29 item 1): the figure
       is the meter itself, so one key of the three reads 100 again and the difference between 100, 200 and 300 is back on the front
       of the app. FEEDBACK-v29 §1 carries the disagreement — it is the one thing in that build Aiden has asked for both ways.
       The figure is derived here rather than written out, so it cannot drift from the config. */
    const want53 = await page.evaluate(async () => { const K = await import('./progress/key.js'); return K.meterPct() + '% complete'; });
    (line === want53 && line === '100% complete') ? ok(`L.8a (retiring B.17) the front of the app reads the meter, never re-bases, and prints it as a share of the whole - every mode, key 1 whole and the Skill chest open reads "${line}" (100 of the raw 0–300 meter)`) : bad('L.8a the front number', JSON.stringify({ line, want53 }));
    // B.19: the column — AMENDED at build 40 (L.10c): four chests, one column, Games at the top of it
    await click('[data-go="s-pick"]'); await sleep(600);
    const col = await page.evaluate(() => { const ids = ['games', 'key', 'pro', 'thorns']; const c = n => document.querySelector(`.chest[data-chest="${n}"]`); const cell = n => ({ r: +c(n).style.gridRow, col: +c(n).style.gridColumn, need: c(n).querySelector('.pic').dataset.need, cls: c(n).className, name: c(n).querySelector('.name').textContent.trim() });
      return Object.assign(Object.fromEntries(ids.map(n => [n, cell(n)])), { scroll: getComputedStyle(document.getElementById('s-pick')).overflowY }); });
    (col.key.col === col.games.col && col.pro.col === col.games.col && col.thorns.col === col.games.col && col.key.r === col.games.r + 1 && col.pro.r === col.games.r + 2 && col.thorns.r === col.games.r + 3
      && /open/.test(col.games.cls) && /open/.test(col.key.cls) && /locked/.test(col.pro.cls) && col.pro.need.split('\n').length === 1 && /Earn the Pro key/.test(col.pro.need) /* AMENDED AT BUILD 59 (v30 59.6): the locked tile carries ONE line, the first thing still missing - 58.2's two ticked requirements wrapped to four and ran over the chest drawing. The Pro key is not in hand here, so its line is the key's; the Gauntlet's turn comes once the key is held, and it is on the key's own screen from the start. */ && col.thorns.need === 'Earn the Author key' /* AMENDED at build 48 (v26 item 12); at build 58 (58.2) the Pro chest lists both its requirements */ && col.pro.name === CP32.GRID.chest.pro && col.thorns.name === CP32.GRID.chest.thorns && col.scroll === 'auto')
      ? ok(`B.19 AMENDED at build 40 (L.10c): four chests in a column (rows ${col.games.r}-${col.thorns.r}); Games and Key open, the Pro chest saying "${col.pro.need}" and Thorns "${col.thorns.need}" (v26 item 12); the screen scrolls`)
      : bad('B.19 the chest column', JSON.stringify(col));
  }
  /* ---- B.18: the outline fills with key-1 progress; complete is a different thing ---- */
  {
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 9, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: { 'quick-tap:two:5': NOW, 'quick-tap:two:15': NOW, 'quick-tap:two:30': NOW } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const kf = await page.evaluate(async () => { const K = await import('./progress/key.js'); const t = document.querySelector('.tile[data-game="quick-tap"]'); const r = t.querySelector('.kfill rect');
      const cs = getComputedStyle(r); const keyfill = getComputedStyle(document.documentElement).getPropertyValue('--keyfill').trim();
      const locked = document.querySelector('.tile.locked .kfill'); const lockedShown = locked ? getComputedStyle(locked).display !== 'none' : false;
      return { kf: t.querySelector('.kfill').style.getPropertyValue('--kf'), frac: K.gameKey('quick-tap').frac, part: t.classList.contains('kpart'), done: t.classList.contains('kdone'), stroke: cs.stroke, dash: cs.strokeDasharray, keyfill, lockedShown, ok: getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() }; });
    const hex2rgb2 = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    (kf.kf === '0.500' && Math.abs(kf.frac - 0.5) < 1e-6 && kf.part && !kf.done && kf.stroke === hex2rgb2(kf.keyfill) && kf.keyfill !== kf.ok && kf.keyfill !== '#FFFFFF' && /^0\.5/.test(kf.dash))
      ? ok(`B.18 Quick Tap with 3 of 6 cleared wears an outline drawn half way round (--kf ${kf.kf}, dash ${kf.dash}) in ${kf.keyfill} — not green, not white`)
      : bad('B.18 the filling outline', JSON.stringify(kf));
    (!kf.lockedShown) ? ok('B.18 a locked game shows no outline') : bad('B.18 a locked tile draws an outline');
    const bars6 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save(); const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-pick'); await new Promise(r => setTimeout(r, 500));
      const t = document.querySelector('.tile[data-game="quick-tap"]'); return { done: t.classList.contains('kdone'), kf: t.querySelector('.kfill').style.getPropertyValue('--kf'), shadow: getComputedStyle(t.querySelector('.pic')).boxShadow !== 'none' }; });
    (bars6.done && bars6.kf === '1.000' && bars6.shadow) ? ok('B.18 all six cleared: the outline closes and the picture takes the wash — complete reads as a different thing') : bad('B.18 the complete tile', JSON.stringify(bars6));
  }
  /* ---- B.21: the arrival plays the first time the screen is seen, via a clear during a run too ---- */
  {
    // v29 (item 13, build 55): the Games chest is what makes key 1 count, and a dev flag no longer stands in for it
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 0, adRuns: 0, chests: { games: 1, key: 0, pro: 0, thorns: 0 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const arr = await page.evaluate(async () => {
      const E = await import('./core/events.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js'); const K = await import('./progress/key.js');
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
      const bar = K.COMBOS.find(c => c.g === 'quick-tap' && c.d === 'two' && c.s === 5).bar;
      const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: bar.bar + 3, misses: 0, n: '', v: 4 };
      const adv = K.checkKey(run, false); if (!adv) return { err: 'no clear' };
      /* build 61: the page records its own beats — whether the arrival ran (`first` on #s-key at any point) and whether the segment grew
         while it was still running — instead of the driver sampling at 1500 / 2900 / 4200ms and hoping each read landed mid-beat */
      const sk = document.getElementById('s-key'), rec = { first: false, grewEarly: false, grew: false };
      const mo = new MutationObserver(() => { const f = sk.classList.contains('first'), g = !!document.querySelector('.kroot.grow');
        if (f) rec.first = true; if (g) { rec.grew = true; if (f) rec.grewEarly = true; } });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
      E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
      const at = () => (document.querySelector('.screen.on') || {}).id; const wait = ms => new Promise(r => setTimeout(r, ms));
      // the interlude starts ~1s after the finish (250 ad-break + 420 fade + 320), plays the 2.6s arrival, then the segment
      const till = async (f, ms) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(16); } return false; };
      await till(() => at() === 's-key', 4000); const onKey = at();
      await till(() => rec.grew, 8000); const first = rec.first, grewEarly = rec.grewEarly, grewLater = rec.grew;
      await till(() => at() === 's-over', 9000); mo.disconnect(); return { err: null, onKey, first, grewEarly, grewLater, back: at(), seen: JSON.parse(localStorage.getItem('ne')).prefs.keySeen }; });
    if (arr.err) bad('B.21 the fabricated clear', arr.err);
    else (arr.onKey === 's-key' && arr.first && !arr.grewEarly && arr.grewLater && arr.back === 's-over' && arr.seen === 1)
      ? ok('B.21 a first-ever visit that arrives as a clear during a run PLAYS THE ARRIVAL, then the segment, then hands back — and marks the screen seen')
      : bad('B.21 the interlude plays the arrival first', JSON.stringify(arr));
    await click('[data-go="s-key"]').catch(() => {}); await sleep(300);
    const again = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    (!again) ? ok('B.21 and the Keys menu item does not play it a second time') : bad('B.21 the arrival played twice');
  }
  /* ---- B.22 / B.23: the ring in the tier's style, and taps inside it ---- */
  {
    (KY32.KEYS.map(k => k.style).join(',') === 'lantern,circuit,thorn' && /spokeOf\(style, i\)/.test(keyjs32) && /style === 'circuit'/.test(keyjs32) && /style === 'thorn'/.test(keyjs32) && /pathLength="1"/.test(keyjs32) && /\.kthorn\{/.test(css32) && /\.kdot2\{/.test(css32) && /\.karc\{/.test(css32))
      ? ok('B.22 Lantern / Circuit / Thorn are drawn by style — straight glowing spokes, right-angled traces with corner dots, curved branches with thorns — every segment a path of length 1')
      : bad('B.22 the three styles');
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 1, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(500);
    // fill the two columns IN MEMORY so the two styles can be drawn; a reload discards it
    const art = await page.evaluate(async () => { const KB = await import('./config/key-bars.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      for (const k in KB.KEY_BARS) { KB.KEY_BARS[k].pro = KB.KEY_BARS[k].bar; KB.KEY_BARS[k].author = KB.KEY_BARS[k].bar; }
      const out = { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author') };
      const el = document.getElementById('s-key'); const n = () => ({ style: el.dataset.style, segs: document.querySelectorAll('#key-ring .kroot').length, paths: document.querySelectorAll('#key-ring path.kroot').length,
        dots: document.querySelectorAll('#key-ring .kdot2').length, thorns: document.querySelectorAll('#key-ring .kthorn').length, ground: !!document.querySelector('#key-ring .kground'), rects: document.querySelectorAll('#key-ring rect.kdot').length, tint: el.style.getPropertyValue('--ktint').trim() });
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.lantern = n();
      document.querySelector('.kkey[data-kt="1"]').click(); await new Promise(r => setTimeout(r, 300)); out.circuit = n();
      document.querySelector('.kkey[data-kt="2"]').click(); await new Promise(r => setTimeout(r, 300)); out.thorn = n();
      return out; });
    const N = art.lantern.segs;
    (!art.shellPro && !art.shellAuthor && art.lantern.style === 'lantern' && art.lantern.paths === N && !art.lantern.dots && !art.lantern.thorns && art.lantern.tint === '#FFD08A'
      && art.circuit.style === 'circuit' && art.circuit.segs === N && art.circuit.dots > 0 && art.circuit.rects === GAMES.length && art.circuit.tint === '#BFE6FF' && art.circuit.tint !== '#D39A5E'
      && art.thorn.style === 'thorn' && art.thorn.segs === N && art.thorn.thorns > 0 && !art.thorn.dots && art.thorn.tint === '#FFFFFF' && art.lantern.ground)
      ? ok(`B.22 with the columns filled in memory the ring redraws per tier — Lantern ${N} glowing segments, Circuit ${N} segments with ${art.circuit.dots} corner dots and square nodes in Frost's white-blue (not the page's copper), Thorn ${N} segments with ${art.thorn.thorns} thorns in white`)
      : bad('B.22 the three rings', JSON.stringify(art));
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(500);
    await svgClick('#key-ring .kground'); await sleep(250);
    const ground = await onScreen();
    await svgClick('#key-ring .khit2[data-kg="dots"]'); await sleep(350);
    const bar = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, h4: (document.querySelector('#key-list h4') || {}).textContent, sel: !!document.querySelector('.knode.sel[data-kg="dots"]') }));
    (ground === 's-key' && bar.screen === 's-key' && /Dots/.test(bar.h4 || '') && bar.sel)
      ? ok('B.23 a tap on the ring\'s ground stays put, and a tap on Dots\' bar selects Dots exactly as its circle does')
      : bad('B.23 taps inside the ring', JSON.stringify({ ground, ...bar }));
    await page.evaluate(async () => { const B = await import('./ui/router.js'); B.show('s-menu'); }); await sleep(300);
  }
  /* ---- B.24: the radar's rungs and the flame ---- */
  {
    // #411: allOpen OFF - same reason as the key-strip check above; the radar takes the same escape now
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, allOpen: false, chest1: 0 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 6, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    const r1 = await page.evaluate(() => ({ web: document.querySelectorAll('#radar polygon.web').length, rungs: document.querySelectorAll('#radar polygon.rung').length, flame: document.querySelectorAll('#radar .flame').length, txt: document.getElementById('s-board').innerText.toLowerCase(), qt: (document.querySelector('#radar text') || {}).textContent }));
    // AMENDED at build 44 (v24 §E): Quick Tap · Two · Sprint's key 1 bar is Aiden's 9, so 6 hits reads 67
    (r1.web === 4 && r1.rungs === 0 && r1.flame === 0 && !/\bpro\b|author/.test(r1.txt) && /Quick Tap 67/.test(r1.qt || ''))
      ? ok(`B.24 / A.1 before chest 1 the radar has one rung — key 1 at the ring — and nothing beyond it; 6 hits against a bar of 9 reads "${r1.qt}"`)
      : bad('B.24 the single-rung radar', JSON.stringify(r1));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    /* AMENDED at build 38 (#426): the columns are full of placeholders, so the solid rungs and the flame are what the FILE draws
       now, and the dashed shells are the case that has to be made - by emptying both columns in memory */
    const r2 = await page.evaluate(async () => { const read = () => ({ rungs: [...document.querySelectorAll('#radar polygon.rung')].map(p => p.dataset.rung + (p.classList.contains('shell') ? ':dashed' : '')), flame: document.querySelectorAll('#radar .flame').length, qt: (document.querySelector('#radar text') || {}).textContent });
      const R = await import('./ui/router.js'); const KB = await import('./config/key-bars.js');
      const out = { full: read() }, keep = {};
      for (const k in KB.KEY_BARS) { keep[k] = [KB.KEY_BARS[k].pro, KB.KEY_BARS[k].author]; KB.KEY_BARS[k].pro = null; KB.KEY_BARS[k].author = null; }
      R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-board'); await new Promise(r => setTimeout(r, 400));
      out.shell = read(); const d = document.querySelector('#radar polygon.rung.shell'); out.shell.dash = d ? getComputedStyle(d).strokeDasharray : 'none';
      for (const k in keep) { KB.KEY_BARS[k].pro = keep[k][0]; KB.KEY_BARS[k].author = keep[k][1]; }
      return out; });
    (r2.shell.rungs.join(',') === 'clear,pro:dashed,author:dashed' && r2.shell.flame === 0 && /Quick Tap 33/.test(r2.shell.qt || '') && r2.shell.dash !== 'none')
      ? ok(`B.24 / A.2 after chest 1 three rungs — with both columns emptied, Pro and Author are DASHED at no value; 60 hits against a bar of 12 climbs no further than rung 1 ("${r2.shell.qt}") and no flame`)
      : bad('B.24 the three rungs with shells', JSON.stringify(r2.shell));
    (r2.full.rungs.join(',') === 'clear,pro,author' && r2.full.flame === 1 && /Quick Tap 1\d\d/.test(r2.full.qt || ''))
      ? ok(`B.24 / #426 on the placeholder columns the rungs are solid and a score past the Author bar wears the flame ("${r2.full.qt}")`)
      : bad('B.24 the flame', JSON.stringify(r2.full));
  }
  /* ---- B.25: the three achievement sets tied to the keys ---- */
  {
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ka = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const rows = K.keyAch(); const out = { n: rows.length, tiers: [...new Set(rows.map(r => r.tier))], perTier: rows.filter(r => r.tier === 'key1').length, live: rows.filter(r => r.live).length };
      // #411: the dev escapes go off with the chest - the previous block left allOpen on, and A.1's subject has neither
      // AMENDED at build 40 (v23 L.10a): key 1's set waits for the Games chest — `none` is no chest open, `before` the Games chest, `after` the Skill chest
      /* TURNED OVER at build 58 (58.3): the key sets are on their own CHEST's tab now, not on Achievements — which is the whole of 58.3 —
         so A.1's rule is read where the rows live. `sets()` visits the three key chest tabs and says which of them is LISTING rows; a tab
         whose tier its chest has not revealed lists none and says so instead (A.1: existence shows, numbers do not). The rule asserted
         underneath is exactly build 38's and build 40's: key 1 waits for the Games chest, Pro for the Skill chest, Author for the Pro chest. */
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.progTab = 'ach'; S.store.bars = {}; S.store.ach = {}; S.save();
      const sets = async () => { const got = [];
        for (const [tab, name] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) {
          R.show('s-menu'); await new Promise(r => setTimeout(r, 120));
          R.show('s-prog', { tab }); await new Promise(r => setTimeout(r, 320));
          if (document.querySelectorAll('#chest-list .a').length) got.push(name); }
        return got; };
      out.none = await sets();
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save();
      out.before = await sets();
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.save();
      out.after = await sets();
      // earn: every Quick Tap bar cleared, then the check the run makes
      for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save();
      const fresh = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.fresh = fresh.map(a => a.id); out.stored = Object.keys(S.store.ach);
      const none = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.again = none.length;
      S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    // AMENDED at build 44 (v24 D.2): each tier opens with a row per combination — 30 — before its per-game and whole-key rows
    (ka.n === 3 * (30 + GAMES.length + 1) && ka.tiers.join(',') === 'key1,key2,key3' && ka.perTier === 30 + GAMES.length + 1 && ka.live === 0)
      ? ok(`B.25 / D.2 ${ka.n} key achievements — a row per combination, one per game and one for the whole key, on each of three keys — generated, none of them live`)
      : bad('B.25 the key sets', JSON.stringify(ka));
    (!ka.none.length && ka.before.includes('key1') && !ka.before.includes('key2') && !ka.before.includes('key3') && ka.after.includes('key2') && !ka.after.includes('key3')) /* AMENDED at build 38: the Author set waits for the Pro chest. AMENDED at build 40: The key's set waits for the Games chest. AMENDED at build 58 (58.3): each set is on its own chest's tab */
      ? ok('B.25 / A.1 / 58.3 no chest tab lists its key set before the Games chest, the Skill chest tab lists it after, and the Pro chest tab only once the Skill chest is open - the Author chest tab waits for the Pro chest (builds 38, 40 and 58)')
      : bad('B.25 the sets before and after chest 1', JSON.stringify({ before: ka.before, after: ka.after }));
    // AMENDED at build 44 (v24 D.2): clearing every Quick Tap bar also banks its six roster rows (two of them older ids)
    (ka.fresh.includes('key_clear_quick-tap') && ka.fresh.length === 7 && ['qt_bclean5', 'qt_clean5', 'key_clear_qt-two-15', 'key_clear_qt-two-30', 'key_clear_qt-four-15', 'key_clear_qt-four-30'].every(id => ka.fresh.includes(id) && ka.stored.includes(id)) && ka.stored.includes('key_clear_quick-tap') && ka.again === 0)
      ? ok('B.25 / D.2 clearing every Quick Tap bar earns its six key 1 roster rows and "Quick Tap · Skill key", banked at once and never twice')
      : bad('B.25 the earn', JSON.stringify({ fresh: ka.fresh, stored: ka.stored, again: ka.again }));
    (/const adv=checkKey\(run,two\);[\s\S]{0,400}checkAch\(run\)\.concat\(checkKeyAch\(run\)\)/.test(run32)) ? ok('B.25 run/run.js banks the key BEFORE it asks the achievements, and asks the key sets too') : bad('B.25 the order in run.js');
  }
  /* ---- B.20 / B.26: the whole-key moment, and the Testing buttons ---- */
  {
    // AMENDED at build 43 (v24 C.5): the whole-key moment is earnMoment(tier) — each key's own earn, Lantern's still the glyph's turn and flare
    // AMENDED at build 46 (v25 item 11): the whole-key moment is the beat inside the first-open REVEAL where the key lights, and the once-flag is prefs.revealed
    /* AMENDED at build 51 (v27 item 14): the `/kwholeglyph/` clause is DELETED rather than re-spelled — it tested a stylesheet for the name of a
       keyframe, which is the one thing a check may not do, and item 14 replaced that keyframe with one per tier. What is left is the shape: the
       stage, the once-flag, and the config the animation is drawn from. The animation itself is driven, not read, in build 46 section 5. */
    (/function keyStage\(tier\)/.test(keyjs32) && /function keyReveal\(tier/.test(keyjs32) && /prefs\.revealed/.test(keyjs32)) ? ok('B.20 the whole-key moment exists — once per tier per profile, each key its own earn since build 43 (C.5) and its own 2s animation since build 51 (v27 item 14)') : bad('B.20 the whole-key moment');
    const bars = await page.evaluate(async () => { const K = await import('./progress/key.js'); const o = {}; for (const c of K.COMBOS) o[c.key] = Date.now(); return o; });
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    /* AMENDED at build 46 (v25 items 11 / 22): the moment is now a beat inside the key's REVEAL - the ring starts unlit (`krev`) and the key lights
       part-way through - and the once-flag is `prefs.revealed['key:clear']`, written as it starts rather than when the moment fires. */
    const w1 = await page.evaluate(() => ({ cls: document.getElementById('s-key').classList.contains('kearning'), count: document.getElementById('key-count').textContent.trim(), seen: JSON.parse(localStorage.getItem('ne')).prefs.revealed }));
    await revealDone(); await sleep(400); await click('#s-key .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(900);
    const w2 = await page.evaluate(() => ({ rev: document.getElementById('s-key').classList.contains('kearning'), done: document.getElementById('s-key').classList.contains('kdone') }));
    (w1.cls && /whole/.test(w1.count) && w1.seen && w1.seen['key:clear'] === 1 && !w2.rev && w2.done) ? ok(`B.20 a whole key plays its reveal on the keys screen once — "${w1.count}" — and the next open goes straight to the finished key`) : bad('B.20 the moment plays once', JSON.stringify({ w1, w2 }));
    // AMENDED at build 40 (v23 L.10): a chest-opening button per chest, four, named by chest
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] #dev-anim [data-act]')].map(b => b.dataset.act + (b.dataset.chest ? ':' + b.dataset.chest : '')));
    // AMENDED at build 43 (v24 C.5): an earn-moment button per key, three
    // AMENDED AT BUILD 57 (v29 Section A, 57.6): and a CREATION intro per key, three more — the first-open moment is otherwise once per profile
    (btns.join(',') === 'dev-keyin,dev-seg,dev-whole,dev-whole,dev-whole,dev-keyintro,dev-keyintro,dev-keyintro,dev-chest:games,dev-chest:key,dev-chest:pro,dev-chest:thorns') ? ok('B.26 twelve Testing buttons, one per animation, an earn moment and a creation intro per key and a chest opening per chest, under [data-dev] (S5)') : bad('B.26 the buttons', btns.join(','));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1, keyWhole: { clear: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-testing"]'); await sleep(300); await click('[data-act="dev-whole"]'); await sleep(900);
    /* AMENDED at build 46 (v25 item 11): "key complete" replays the whole REVEAL, which is not skippable - so Back does nothing while it plays, and it
       ends on its own congratulations card. Nothing is stored either way (S5): this is Testing's replay, not an earn. */
    const dw = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cls: document.getElementById('s-key').classList.contains('kearning') }));
    await click('#s-key .back'); await sleep(300);
    const dwLocked = await onScreen();
    await revealDone(); await sleep(400); await click('#s-key .back'); await sleep(400);
    const dwBack = await onScreen();
    // AMENDED at build 41 (v23 L.6): "replay key chest opening" plays the Skill chest's CEREMONY on the key screen with nothing stored, and its tap lands on the map's spill, replayed the same way
    await click('[data-act="dev-chest"][data-chest="key"]'); await sleep(1200);
    const dc = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest }; });
    await revealDone(); await sleep(700);
    const dcMap = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'), w = document.querySelector('.chestwords[data-for="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill') && w.classList.contains('spill') }; });
    await sleep(3600);
    const dcAfter = await page.evaluate(async () => { const K = await import('./progress/key.js'); const c = document.querySelector('.chest[data-chest="key"]');
      // AMENDED at build 34 (#411): the resting state is whatever the gate says, not "hidden" - and the demo must clear its own class
      // AMENDED at build 40 (L.10): every chest is on the map, so the resting state is the chest's own - open under OPEN EVERYTHING
      return { rest: !c.hidden && c.classList.contains(K.chestState('key')), spill: c.classList.contains('spill'), chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.key, whole: JSON.parse(localStorage.getItem('ne')).prefs.keyWhole }; });
    (dw.screen === 's-key' && dw.cls && dwLocked === 's-key' && dwBack === 's-testing' && dc.screen === 's-key' && dc.shown && dc.chest === 'key' && dcMap.screen === 's-pick' && dcMap.spill && dcAfter.rest && !dcAfter.spill && !dcAfter.chest2 && dcAfter.whole && dcAfter.whole.clear === 1)
      ? ok('B.26 "key complete" replays the key\'s whole reveal - Back does nothing while it plays, and once it has been taken Back returns to Testing; "replay key chest opening" plays its reveal, its tap and Continue land on the map\'s spill, and the chest is put back exactly as its state left it — nothing stored (AMENDED at build 46, item 11)')
      : bad('B.26 the buttons play and store nothing', JSON.stringify({ dw, dwLocked, dwBack, dc, dcMap, dcAfter }));
    await click('[data-act="dev-keyin"]').catch(() => {}); await sleep(300);
    const arrive = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    arrive ? ok('B.26 "key arrival" plays the arrival again') : bad('B.26 the arrival button');
    await sleep(2500);
  }
}
