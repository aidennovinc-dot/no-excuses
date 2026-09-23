/* ---- 18. build 38 (Aiden's two answers to build 37, 2026-09-14): the tile keeps its amber until a mode is chosen; Author waits for the Pro chest ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, names, part, section, check, ok, bad, finished, root, read, REVIEW, rvRead, strip, boot, NOW, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, up } from '../lib/gate.mjs';

export const SECTION = ["build 38 - the tile keeps its amber, Author waits for the Pro chest","build 38 - #426 Pro and Author placeholders"];

export async function run() {
  const css38 = read('styles', 'app.css'), pick38 = read('ui', 'screens', 'pick.js'), key38 = read('progress', 'key.js'), prog38 = read('ui', 'screens', 'progress.js');

  /* ---- 1. the pressed tile keeps --press until a mode is actually chosen ---- */
  {
    (/\.grid\.chosen \.tile\.keep \.pic\{outline-color:var\(--line\)\}/.test(css38) && !/\.grid\.dim \.tile\.keep \.pic\{outline-color/.test(css38)
      && /classList\.toggle\('chosen',st!=='grid'&&GAMES\[sel\.game\]\.modes\.length>1&&!!\$\('#diff-row \.choice\.sel'\)\)/.test(pick38))
      ? ok('38.1 the tile demotes on `.grid.chosen` - a mode selected on a game with more than one - and no longer on `.grid.dim`') : bad('38.1 the rule');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(600);
    const q1 = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms));
      const P = getComputedStyle(document.documentElement).getPropertyValue('--press').trim(); const n = parseInt(P.slice(1), 16); const A = `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
      const grid = document.getElementById('grid'), sheet = document.getElementById('sheet');
      const tileAmber = t => getComputedStyle(t.querySelector('.pic')).outlineColor === A;
      const choices = () => [...document.querySelectorAll('#diff-row .choice')].filter(c => c.offsetParent && getComputedStyle(c).borderTopColor === A).length;
      const qt = document.querySelector('.tile[data-game="quick-tap"]'); qt.click(); await wait(450);
      const out = { mode: { chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() } };
      document.querySelector('#diff-row .choice[data-diff="two"]').click(); await wait(600);
      out.len = { chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() };
      document.querySelector('#diff-row .choice.sel').click(); await wait(400);
      out.back = { stage: sheet.classList.contains('len') ? 'len' : 'mode', chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() };
      document.querySelector('#s-pick .back').click(); await wait(500);
      const seq = document.querySelector('.tile[data-game="sequence"]'); seq.click(); await wait(500);
      out.seq = { stage: sheet.classList.contains('len') ? 'len' : 'mode', chosen: grid.classList.contains('chosen'), tile: tileAmber(seq) };
      return out; });
    (!q1.mode.chosen && q1.mode.tile && q1.mode.choices === 0)
      ? ok('38.1 with the mode row up and nothing tapped the pressed tile keeps its amber, and it is the only amber thing') : bad('38.1 the mode row', JSON.stringify(q1.mode));
    (q1.len.chosen && !q1.len.tile && q1.len.choices === 1 && q1.back.stage === 'mode' && q1.back.chosen && !q1.back.tile && q1.back.choices === 1)
      ? ok('38.1 once a mode is chosen it takes the amber and the tile demotes - still so when the sheet goes back to the mode row with that mode selected') : bad('38.1 a chosen mode', JSON.stringify({ len: q1.len, back: q1.back }));
    (q1.seq.stage === 'len' && !q1.seq.chosen && q1.seq.tile)
      ? ok('38.1 Sequence has no mode row to tap, so its tile keeps the amber on its length row') : bad('38.1 a one-mode game', JSON.stringify(q1.seq));
  }

  /* ---- 2. each tier opens with its own chest: Pro with chest 1, Author with the Pro chest ---- */
  {
    /* AMENDED at build 40 (v23 L.10): the tier line names the chest that REVEALS the tier (config/chests.js `opens`) rather than counting
       chests; the radar keeps key 1's rung before the Games chest; the Achievements tab asks for key 1's set too */
    (/const tierOpen = tier => \{ const c = CHESTS\.find\(x => x\.opens === tier\); return !c \|\| chestOpen\(c\.id\); \};/.test(key38)
      && /function radarRungs\(\) \{ const open = TIERS\.filter\(\(t, i\) => !i \|\| tierOpen\(t\)\);/.test(key38)
      && /const groupShown=t=>t==='key1'\?tierOpen\('clear'\):t==='key2'\?tierOpen\('pro'\):t==='key3'\?tierOpen\('author'\):true;/.test(prog38))
      ? ok('38.2 one line decides a tier: the chest that reveals it, with the dev escapes - and the radar and the Achievements tab ask it per tier (AMENDED at build 40)') : bad('38.2 the rule');
    await setStorage({ ne: { v: 5, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const q2 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.store.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 40, misses: 0 }]; S.save(); K.fillBars(true);
      const out = { pro: K.tierOpen('pro'), author: K.tierOpen('author'), rungs: K.radarRungs().map(r => r.tier).join() };
      out.live = (K.checkKey({ g: 'quick-tap', d: 'two', s: 5, hits: 40, misses: 0, t: Date.now(), v: 4 }, false) || {}).tier;
      out.proBar = !!S.store.bars['quick-tap:two:5|pro']; out.authorBar = !!S.store.bars['quick-tap:two:5|author'];
      R.show('s-key'); await wait(600); out.strip = [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('locked')).join();
      /* AMENDED at build 58 (58.3): the key sets are on their own chest's tab now, so "which sets are shown" is read there. A chest tab
         whose tier its chest has not revealed lists no rows at all and says so instead (A.1), which is the same fact in its new place. */
      for (const [t, nm] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(400);
        if (document.querySelectorAll('#chest-list .a').length) out.sets = (out.sets ? out.sets + ',' : '') + nm; }
      out.sets = out.sets || '';
      // AMENDED at build 58 (58.2): the Pro chest also wants Gauntlet Mini finished, and this fixture reaches past it to the Author tier
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 100, tier: 'clear', web: [] }];
      S.prefs.chests = Object.assign({}, S.prefs.chests, { pro: 1 }); S.save(); out.retro = K.retroBank(['author']).join(); out.author2 = K.tierOpen('author'); out.rungs2 = K.radarRungs().map(r => r.tier).join();
      R.show('s-menu'); await wait(150); R.show('s-key'); await wait(500); out.strip2 = [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('locked')).join();
      for (const [t, nm] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(400);
        if (document.querySelectorAll('#chest-list .a').length) out.sets2 = (out.sets2 ? out.sets2 + ',' : '') + nm; }
      out.sets2 = out.sets2 || '';
      K.fillBars(false); S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.bars = {}; S.store.runs = []; S.store.gaunt = []; S.save(); return out; });
    (q2.pro && !q2.author && q2.rungs === 'clear,pro' && q2.strip === 'false,false,true' && q2.sets === 'key1,key2')
      ? ok('38.2 with chest 1 open and the Pro chest shut: Pro is open, Author is crossed out on the strip, the radar has two rungs and the Author chest tab lists no set (build 58: the sets are on their own chest tabs)') : bad('38.2 before the Pro chest', JSON.stringify(q2));
    (q2.live === 'clear' && q2.proBar && !q2.authorBar)
      ? ok('38.2 a run that beats every bar clears key 1 and Pro and banks nothing on Author while its chest is shut') : bad('38.2 no Author clear before its chest', JSON.stringify({ live: q2.live, proBar: q2.proBar, authorBar: q2.authorBar }));
    (q2.author2 && q2.retro === 'quick-tap:two:5|author' && q2.rungs2 === 'clear,pro,author' && q2.strip2 === 'false,false,false' && q2.sets2 === 'key1,key2,key3')
      ? ok('38.2 the Pro chest opens Author: its bars already beaten are credited silently (G.4), all three keys and rungs are open, and the Author chest tab lists its set') : bad('38.2 after the Pro chest', JSON.stringify(q2));
  }

  /* ---- 3. #426: Pro and Author PLACEHOLDERS (A.2 amended) - the generator writes the file, and never a person's number ---- */
  part('build 38 - #426 Pro and Author placeholders');
  const P38 = await import(pathToFileURL(path.join(root, 'scripts', 'placeholders.mjs')).href);
  const { ROUND_AT: RA38 } = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const bars38 = read('config', 'key-bars.js'), json38 = rvRead('key-bars.json');
  const rows38 = P38.rowsOf(bars38);
  const spanOf = (src, key, name) => { const r = P38.rowsOf(src).find(x => x.key === key); const f = P38.fieldsOf(src, r.from, r.to).find(x => x.name === name); return f ? src.slice(f.from, f.to) : ''; };
  {
    /* AMENDED at build 44 (v24 §E): no cell is the generator's any more - 12 are Aiden's and 48 are the desk's, marked by:'desk' - so the
       generator must leave the file exactly as it is, --clear must leave it too (a desk proposal is not the generator's to clear), and the
       generator's own scheme is still proved on a copy where every desk cell is emptied first */
    const again = P38.generate(bars38, RA38).out, cleared = P38.generate(bars38, RA38, 'clear').out;
    const deskOnly = src => { let out = src; for (const t of ['pro', 'author']) for (const r of P38.rowsOf(out).reverse()) { if (!(r.obj.placeholder && r.obj.placeholder[t] && r.obj.placeholder[t].by)) continue;
      const f = P38.fieldsOf(out, r.from, r.to).find(x => x.name === t); out = out.slice(0, f.from) + 'null' + out.slice(f.to); } return out; };
    const emptied = deskOnly(bars38), filled = P38.generate(emptied, RA38).out, rowsF = P38.rowsOf(filled);
    (again === bars38 && cleared === bars38 && (!REVIEW || P38.reviewJson(json38, rows38) === json38))
      ? ok(`v24 §E / #426 config/key-bars.js is what npm run placeholders leaves: regenerating changes nothing, --clear changes nothing (all ${rows38.length * 2} Pro and Author cells are Aiden's or the desk's), and ../_review/key-bars.json matches`)
      : bad('#426 the generator keeps every cell', JSON.stringify({ again: again === bars38, cleared: cleared === bars38, json: P38.reviewJson(json38, rows38) === json38 }));
    // the scheme, cell by cell, on the copy whose desk cells were emptied: the multiplier for the row's own direction, its precision, harder tier over tier, the floors, the marker
    const off = [];
    /* RESTATED at build 60 (v31 60.6): AIDEN'S OWN CELLS ARE SKIPPED BY WHETHER THEY ARE HIS, not by which game they belong to. The
       build-44 test was the id prefix (qt / dt — the twelve Pro figures he set), and 60.6 made the Cut Streak's AUTHOR cell his as
       well ("I reached around 25, put that as an author time for now"), which a prefix cannot see. A cell with no placeholder marker
       is a number a PERSON set: the generator may not write it, isPlaceholder() already reads it as not generated, and this scheme
       check has nothing to say about it. Every cell the generator IS allowed to write is checked exactly as it was. */
    const own38 = (o, t) => !((o.placeholder || {})[t]);
    for (const r of rowsF) { const o = r.obj, st = P38.stepOf(o.unit), fl = P38.floorOf(r.key, o, RA38);
      for (const [t, below] of [['pro', o.bar], ['author', o.pro]]) { if (own38(o, t)) continue; const v = o[t], m = P38.MULT[o.dir][t], mk = (o.placeholder || {})[t] || {}, basis = mk.basis || '';
        const prec = st === 10 ? v % 10 === 0 : st === 1 ? Number.isInteger(v) : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
        const expect = Math.max(fl ? fl.at : -Infinity, P38.roundTo(o.bar * m, st));
        const good = prec && (o.dir === 'lower' ? v < below : v > below) && !(fl && v < fl.at) && (v === expect || /stepped to/.test(basis) || /CLAMPED/.test(basis))
          && mk.v === v && mk.conf === 'low' && !mk.by && /^PLACEHOLDER/.test(basis) && basis.includes('× ' + m.toFixed(2)) && /awaiting his/.test(basis);
        if (!good) off.push(`${r.key} ${t}=${v}`); } }
    // and the desk's own cells, in the real file: harder tier over tier, marked by:'desk', conf 'low', saying they are not Aiden's
    const deskOff = []; for (const r of rows38) { const o = r.obj; for (const [t, below] of [['pro', o.bar], ['author', o.pro]]) { const mk = (o.placeholder || {})[t]; if (!mk) continue;
      if (!(mk.by === 'desk' && mk.conf === 'low' && mk.v === o[t] && /^PROPOSED on the Key Unlocks Desk/.test(mk.basis) && /Not Aiden’s number/.test(mk.basis) && (o.dir === 'lower' ? o[t] < below : o[t] > below))) deskOff.push(`${r.key} ${t}`); } }
    (!off.length && !deskOff.length && emptied !== bars38)
      ? ok(`#426 / v24 §E the generator's scheme still holds where it is allowed to write (the desk cells emptied on a copy): × 1.15 / × 1.30 on a floor, × 0.80 / × 0.65 on a ceiling, the row's own precision, each tier strictly harder, none past its floor - and all 48 desk cells in the real file are marked by:'desk', harder than the tier below, saying they are not Aiden's`)
      : bad('#426 the scheme', JSON.stringify({ off, deskOff }));
    /* NEVER OVERWRITE A NUMBER A PERSON ENTERED. Two cells hand-set to odd values - one through --set, which drops its marker,
       one typed over a placeholder with its now-stale marker left behind - then the generator runs over the table twice */
    let hand = P38.setCell(bars38, 'qt-two-5', 'pro', 13.37);
    { const r = P38.rowsOf(hand).find(x => x.key === 'dots:lead:30'), f = P38.fieldsOf(hand, r.from, r.to).find(x => x.name === 'author'); hand = hand.slice(0, f.from) + '101.5' + hand.slice(f.to); }
    const g1 = P38.generate(hand, RA38), g2 = P38.generate(g1.out, RA38);
    const barsText = src => P38.rowsOf(src).map(r => spanOf(src, r.key, 'bar')).join();
    const handRows = P38.rowsOf(hand), qtRow = handRows.find(r => r.key === 'quick-tap:two:5').obj, dlRow = handRows.find(r => r.key === 'dots:lead:30').obj;
    // AMENDED at build 44: every cell is kept now; the two hand-set cells must be among them
    const keptAll = g1.report.filter(x => x.act === 'kept').map(x => x.key + ' ' + x.tier);
    const kept = ['dots:lead:30 author', 'quick-tap:two:5 pro'].filter(k => keptAll.includes(k)).join() + (keptAll.length === rows38.length * 2 ? '' : ' (not all kept)');
    let refused = false; try { P38.setCell(bars38, 'qt-two-5', 'bar', 1); } catch (e) { refused = /bar/.test(e.message); }
    (g1.out === hand && g2.out === hand && spanOf(g2.out, 'quick-tap:two:5', 'pro') === '13.37' && spanOf(g2.out, 'dots:lead:30', 'author') === '101.5'
      && spanOf(g2.out, 'dots:lead:30', 'placeholder') === spanOf(hand, 'dots:lead:30', 'placeholder') && !('pro' in (qtRow.placeholder || {})) && dlRow.placeholder.author.v !== 101.5
      && kept === 'dots:lead:30 author,quick-tap:two:5 pro' && barsText(g2.out) === barsText(bars38) && refused)
      ? ok('#426 NEVER OVERWRITE: 13.37 put in through --set (marker dropped) and 101.5 typed over a placeholder (stale marker left) survive two generator runs byte for byte, both reported kept, every other cell and every key-1 bar untouched - and --set refuses `bar`')
      : bad('#426 a person\'s number survives the generator', JSON.stringify({ same1: g1.out === hand, same2: g2.out === hand, qt: spanOf(g2.out, 'quick-tap:two:5', 'pro'), dl: spanOf(g2.out, 'dots:lead:30', 'author'), kept, refused }));
    // and the app reads the marker by the same test, and says so on the key screen per tier
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ph = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const warn = () => document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent.trim();
      const out = { pro: K.placeholderCount('pro'), author: K.placeholderCount('author'), clear: K.placeholderCount('clear'), n: K.COMBOS.length };
      // AMENDED at build 44: Quick Tap's Pro figures are Aiden's, so the number changed in place is a desk proposal's — Estimate · Grow · Set
      const c = K.COMBOS.find(x => x.key === 'hold:grow:7'), was = c.bar.pro;
      c.bar.pro = 13.37; out.edited = { is: K.isPlaceholder(c, 'pro'), count: K.placeholderCount('pro'), author: K.isPlaceholder(c, 'author') };
      R.show('s-key', { tier: 1 }); await wait(350); out.edited.warn = warn();
      c.bar.pro = was; R.show('s-menu'); await wait(80); R.show('s-key', { tier: 1 }); await wait(350); out.warnPro = warn();
      R.show('s-menu'); await wait(80); R.show('s-key', { tier: 0 }); await wait(350); out.warnClear = warn();
      return out; });
    // AMENDED at build 44 (v24 §E): 18 Pro placeholders (Aiden set the other 12) and 30 Author
    // AMENDED at build 45 (v25 item 14): isPlaceholder() is unchanged and still counts them — what is gone is the key screen SAYING so (every warn is empty now)
    // RESTATED at build 60 (v31 60.6): 29 Author placeholders, not 30 — the Cut Streak's Author bar is Aiden's own number now (25), so it is not one
    (ph.pro === ph.n - 12 && ph.author === ph.n - 1 && ph.clear === 0 && !ph.edited.is && ph.edited.count === ph.n - 13 && ph.edited.author
      && ph.warnPro === '' && ph.edited.warn === '' && ph.warnClear === '')
      ? ok(`#426 progress/key.js tells a generated number from a set one: ${ph.pro} Pro and ${ph.author} Author placeholders, none on key 1; one Pro number changed in place is a person's (${ph.edited.count} left) — and since build 45 no key screen says a word about it`)
      : bad('#426 isPlaceholder and the key screen note', JSON.stringify(ph));
  }

  /* ---- 4. #426 A: Circuit and Thorn seen working - every animation Lantern gets, on all three, each in its own tint ---- */
  {
    const kfLines = css38.split('\n').filter(l => /@keyframes krootgrow\{/.test(l)), kfLast = kfLines[kfLines.length - 1] || '';
    /* AMENDED at build 51 (v27 item 14): the `@keyframes kwholeglyph` clause is DELETED — that keyframe is gone and a check may not be re-spelled
       to a new one. The rest stands: what matters to #426 A is that the theme drives the colour and that no [data-style] rule sets an animation. */
    (/var\(--ktint\)/.test(kfLast) && !/--ok/.test(kfLast) && /\.khalo\{fill:none;stroke:var\(--ktint\)\}/.test(css38)
      && !/\[data-style="(lantern|circuit|thorn)"\][^{]*\{[^}]*animation/.test(css38))
      ? ok('#426 A statically: the krootgrow that wins reads --ktint, the halo strokes in --ktint, and no [data-style] rule sets or cancels an animation')
      : bad('#426 A the animation CSS is theme-driven');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const par = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const KY = await import('./config/keys.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const trip = hex => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
      const names = el => [...new Set(el.getAnimations({ subtree: true }).map(a => a.animationName).filter(Boolean))].sort().join();
      const key = document.getElementById('s-key'), out = [];
      // most of every tier lit, never whole: Spot's first combination left dark for the advance to grow, and one Quick Tap one
      const spot = K.COMBOS.find(c => c.g === 'spot'), spare = K.COMBOS.find(c => c.g === 'quick-tap');
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c !== spot && c !== spare) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.save();
      for (let i = 0; i < K.TIERS.length; i++) { const t = K.TIERS[i], tint = trip(KY.KEYS[i].tint), row = { tier: t, tint: KY.KEYS[i].tint };
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i }); await wait(400);
        row.style = key.dataset.style;
        const lit = document.querySelector('#key-ring .kroot.on'); row.lit = !!lit && getComputedStyle(lit).stroke.includes(tint);
        // 9.5 / 5.1: the advance, handed over exactly the way the result screen hands a fresh clear over
        S.store.bars[K.skey(spot.key, t)] = Date.now(); S.save(); const g = K.gameKey('spot', t);
        R.show('s-menu'); await wait(80); R.show('s-key', { advance: { key: spot.key, tier: t, g: 'spot', d: spot.d, s: spot.s, was: g.done - 1, done: g.done, total: g.total } }); await wait(360);
        const seg = document.querySelector(`#key-ring [data-seg="spot:${g.done - 1}"]`), halo = document.querySelector('#key-ring .kr[data-rg="spot"] .khalo');
        row.advance = { grow: !!seg && seg.classList.contains('grow'), seg: seg ? names(seg) : '', halo: halo ? halo.getAnimations().map(a => a.animationName).join() : '', haloTint: !!halo && getComputedStyle(halo).stroke.includes(tint) };
        delete S.store.bars[K.skey(spot.key, t)]; S.save(); await wait(900);
        /* B.20 → AMENDED at build 51 (v27 item 14): Testing's "key complete" plays that key's EARNED ANIMATION, two seconds at most, and the
           glyph is moving from its own step onward — so the wait is a beat into it, read from the config rather than typed */
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, whole: true }); await wait(300 + Math.round(KY.KEY_EARN[t].ms * .5));
        const glyph = document.querySelector('#key-ring .kglyph');
        row.whole = { on: key.classList.contains('kearning'), names: names(key), glyph: glyph ? glyph.getAnimations().map(a => a.animationName).join() : '', count: getComputedStyle(document.getElementById('key-count')).color.includes(tint) };
        await wait(400); document.getElementById('key-cere').click(); await wait(400);
        const go = document.querySelector('#key-cere .rgo'); if (go) { await wait(1400); go.click(); } await wait(600);
        // 5.4 / B.21: the staged first open
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, arrive: true }); await wait(250);
        const every = (sel, n) => { const els = [...document.querySelectorAll(sel)]; return els.length > 0 && els.every(x => x.getAnimations().some(a => a.animationName === n)); };
        row.first = { on: key.classList.contains('first'), names: names(key), kr: every('#key-ring .kr', 'keyin'), node: every('#key-ring .knode', 'keyin') };
        await wait(2700);
        out.push(row); }
      S.store.bars = {}; S.prefs.keySeen = 1; S.save(); return out; });
    const L = par[0];
    /* AMENDED at build 43 (v24 C.5): the whole-key moment is no longer the SAME on all three — earning each key is its own moment (Lantern's
       flare, Circuit's snap, Thorn's slow turn). What stays shared is held here: the advance and the first open, in each tier's tint; the whole
       moment plays on every tier, each with its own glyph animation, and the count line takes the tint. Build 43's own section checks the rest */
    const sameAs = p => p.advance.seg === L.advance.seg && p.advance.halo === L.advance.halo && p.first.names === L.first.names;
    /* AMENDED at build 51 (v27 item 14): each key's earned animation is its own — the Skill key spins and clicks upright, the Pro key snaps a
       quarter turn, the Author key drops and slams — so the three glyph animations are kespin / kesnap / kedrop, and the count line no longer
       has its own beat inside a 2s animation (`whole.count` is dropped with it). The advance and the first open are still shared. */
    (par.map(p => p.style).join() === 'lantern,circuit,thorn' && L.advance.seg === 'krootgrow' && L.advance.halo === 'khaloglow' && /keyin/.test(L.first.names)
      && par.map(p => p.whole.glyph).join() === 'kespin,kesnap,kedrop'
      && par.every(p => sameAs(p) && p.lit && p.advance.grow && p.advance.haloTint && p.whole.on && p.first.on && p.first.kr && p.first.node))
      ? ok(`#426 A: Circuit and Thorn run every animation Lantern does - the advance (${L.advance.seg} under ${L.advance.halo}), the staged first open (${L.first.names}) - with lit segments and halos in each tier's own tint (${par.map(p => p.tint).join(' / ')}); and each plays its OWN earned animation (${par.map(p => p.whole.glyph).join(' / ')}, AMENDED at build 51, v27 item 14)`)
      : bad('#426 A animation parity across the three styles', JSON.stringify(par));
  }

  /* ---- 5. #426 B: retroactive banking has something to bank - both ways - and it runs when the numbers arrive ---- */
  {
    const keys = rows38.map(r => r.key);
    const runs = keys.map((k, i) => { const [g, d, s] = k.split(':'), o = rows38[i].obj; return { t: NOW, g, d, s: +s, n: '', v: 4, hits: i % 2 ? o.bar : o.pro, misses: 0 }; });
    const want = keys.filter((k, i) => !(i % 2)).map(k => k + '|pro').sort();
    const open1 = async list => {
      await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1 }, runs: list, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
      return page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const A = await import('./audio.js'); const U = await import('./config/unlocks.js');
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const bootPro = Object.keys(S.store.bars).filter(k => k.endsWith('|pro')).length;
        for (const x of U.UNLOCKS) S.store.unlock[x.key] = Date.now();
        for (const c of K.COMBOS) S.store.bars[c.key] = Date.now();
        // AMENDED at build 40 (v23 L.10 / L.8b): chest 1 is the KEY chest, behind the Games chest, and it opens on its key screen by itself
        // AMENDED at build 43 (v24 B.2 / B.3): the map's tap opens it; key 1's earn moment is marked seen so it opens straight away
        S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.prefs.keyWhole = { clear: 1 }; S.save();
        // AMENDED at build 41 (v23 L.6): the chest's one sound is Snd.chest, never unlockFx
        let fx = 0, un = 0; const orig = A.Snd.chest, origU = A.Snd.unlockFx; A.Snd.chest = function () { fx++; return orig.apply(this, arguments); }; A.Snd.unlockFx = function () { un++; return origU.apply(this, arguments); };
        const toasts = []; const mo = new MutationObserver(() => toasts.push(document.getElementById('toast').textContent.trim())); mo.observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true });
        R.show('s-pick'); await wait(600);
        const ready = document.querySelector('.chest[data-chest="key"]').classList.contains('ready');
        document.querySelector('.chest[data-chest="key"]').click(); await wait(2300);
        const out = { bootPro, ready, pro: Object.keys(S.store.bars).filter(k => k.endsWith('|pro')).sort(), author: Object.keys(S.store.bars).filter(k => k.endsWith('|author')).length,
          retro: Object.keys(S.prefs.retro || {}).length, col: typeof (S.prefs.retroCol || {}).pro === 'string', fx: un ? -un : fx, toasts: [...new Set(toasts.filter(Boolean))], opened: S.prefs.chests.key };
        mo.disconnect(); A.Snd.chest = orig; A.Snd.unlockFx = origU;
        return out; }); };
    const good = await open1(runs), none = await open1([]);
    (good.ready && !good.bootPro && good.opened === 1 && good.pro.join() === want.join() && !good.author && good.retro === want.length && good.col && good.fx === 1 && !good.toasts.length)
      ? ok(`#426 B: a profile whose bests beat every other Pro bar opens the Skill chest and banks exactly those ${good.pro.length}, SILENTLY - one chest sound, no toast (AMENDED at build 40, L.8b), nothing for the clears, nothing on Author behind its own chest`)
      : bad('#426 B the retroactive clear with something to bank', JSON.stringify({ ...good, want: want.length }));
    (none.ready && none.opened === 1 && !none.pro.length && !none.author && !none.retro && none.col && none.fx === 1 && !none.toasts.length)
      ? ok('#426 B: a profile with no runs opens the Skill chest and banks nothing - still one chest sound, and no toast')
      : bad('#426 B the retroactive clear with nothing to bank', JSON.stringify(none));
    // Aiden, "yes, silently, once": a column that ARRIVES for a tier already open is credited at boot, once per column
    await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1, chest1: 1 }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const readNe = () => page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')), t = document.getElementById('toast');
      return { pro: Object.keys(ne.bars).filter(k => k.endsWith('|pro')).sort(), author: Object.keys(ne.bars).filter(k => k.endsWith('|author')).length, clear: Object.keys(ne.bars).filter(k => !k.includes('|')).length, col: Object.keys(ne.prefs.retroCol || {}).join(), retro: Object.keys(ne.prefs.retro || {}).length, toast: t.classList.contains('on') ? t.textContent.trim() : '' }; });
    const a1 = await readNe();
    const gone = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); const k = Object.keys(ne.bars).find(x => x.endsWith('|pro')); delete ne.bars[k]; localStorage.setItem('ne', JSON.stringify(ne)); return k; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a2 = await readNe();
    await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); ne.prefs.retroCol = { pro: 'an older column' }; localStorage.setItem('ne', JSON.stringify(ne)); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a3 = await readNe();
    // AMENDED at build 44 (v24 §E): key 1's column is credited on arrival too, so the column record is clear + pro and the green marks count both
    (a1.pro.join() === want.join() && !a1.author && a1.col === 'clear,pro' && a1.retro === want.length + a1.clear && a1.toast === '')
      ? ok(`#426 on arrival: a profile with chest 1 already open boots on the new columns and banks the ${a1.pro.length} Pro bars its bests beat - no toast, no chest, Author untouched behind its own chest, the column recorded`)
      : bad('#426 retro credit when the numbers arrive', JSON.stringify(a1));
    (gone && !a2.pro.includes(gone) && a2.pro.length === want.length - 1 && a3.pro.includes(gone) && a3.pro.length === want.length)
      ? ok('#426 once per column: a Pro bar removed by hand is NOT re-banked on the next boot, and a different column credits once more')
      : bad('#426 retro on arrival runs once per column', JSON.stringify({ gone, a2: a2.pro.length, a3: a3.pro.length }));
  }
}
