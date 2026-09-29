// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, at, sawStory, page, click, stepQuickTap, driveToResult, SEEN_INTRO } from '../lib/gate.mjs';

export const SECTION = ["locked decisions (fresh profile)"];

export async function run() {
  sawStory ? ok('L1 title sequence plays before the menu') : bad('L1 title sequence plays before the menu');
  /* build 64 (62.3 / 62.4): a fresh profile's map belongs to the walkthrough, which lets no tap through but its own — so the L checks below,
     which are about the fresh profile's UNLOCKS and not its walkthrough, mark it finished first (the walkthrough is walked further down) */
  await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
  await click('[data-go="s-pick"]'); await sleep(400);
  const tileCol = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="quick-tap"]'); return { sq: t.style.getPropertyValue('--sq-live').trim(), unplayed: t.classList.contains('unplayed') }; });
  (tileCol.unplayed && tileCol.sq.toUpperCase() === '#FFFFFF') ? ok('L7 Quick Tap tile is white before any run') : bad('L7 Quick Tap tile is white before any run', JSON.stringify(tileCol));
  await click('.tile[data-game="quick-tap"]'); await sleep(320);
  /* RESTATED at build 60 (v31 60.23): the sheet's player row is ui/players.js's markup now, not index.html's, so `#vs-sub` is gone
     and the sub-row is `.prow.sub` inside `#vs-wrap`. L3 is unchanged and so is what is asserted — on Solo the second step is not
     there to be read — only the selector it is read through. */
  const soloSub = await page.evaluate(() => { const sub = document.querySelector('#vs-wrap .prow.sub');
    return { there: !!sub, hidden: !!sub && sub.hidden, shown: !!sub && getComputedStyle(sub).display !== 'none' }; });
  (soloSub.there && soloSub.hidden && !soloSub.shown) ? ok('L3 Solo shows no Pass & play / Versus') : bad('L3 Solo shows no Pass & play / Versus', JSON.stringify(soloSub));
  await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(420);
  const lens = await page.evaluate(() => [...document.querySelectorAll('#time-row .tbtn b')].map(b => b.childNodes[0].textContent.trim()));
  (lens.length === 3 && lens[0] === 'Sprint' && lens[1] === 'Dash' && lens[2] === 'Marathon') ? ok('L2 Quick Tap lengths are Sprint / Dash / Marathon') : bad('L2 Quick Tap lengths are Sprint / Dash / Marathon', JSON.stringify(lens));
  const lenTitle = await page.evaluate(() => document.querySelector('#len-title').textContent.trim());
  lenTitle === 'Mode' ? ok('L9 the length row is labelled Mode') : bad('L9 the length row is labelled Mode', lenTitle);
  await click('#grid'); await sleep(200);


  /* build 64 (62.3 – 62.11, 62.14, REWRITING build 62's 61.3 checks): THE FIRST-RUN WALKTHROUGH, walked on a profile that has never played —
     Aiden's twelve boxes on the games menu (each line built from config where it quotes a rule), the first run with no way out of it, the app
     reopened half way through the result, the eight boxes on the result, then the menu that "Good luck!" opens */
  {
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, snd: 'off' }, runs: [], ach: {}, unlock: {}, intro: { 'quick-tap': 1, 'quick-tap:two': 1 }, seen: {}, bars: {} })); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await click('[data-go="s-pick"]');
    const C = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL);
    // build 65 (A1): the result's boxes are named now so the third can branch (64.2); in order, they are these
    const OV = [C.over.hi, C.over.again];
    // the lines as the config makes them: the Dots rule (never a typed 35), Quick Tap's lengths and their seconds
    const X = await page.evaluate(async () => { const U = (await import('./config/unlocks.js')).UNLOCKS, R = await import('./games/registry.js'), G = await import('./config/games.js');
      const d = R.GAMES.dots.modes[0], need = U.find(u => u.key === 'dots:' + d).need, m = R.GAMES['quick-tap'].modes[0], lens = R.GC('quick-tap', m).lens, names = lens.map(s => R.lenName('quick-tap', s, m));
      const row = (await import('./config/unlocks.js')).LEN_RULES['quick-tap:' + m][1].match(/^\d+ hits in a row/)[0];
      return { need, m, lens, names, row, dots: R.GAMES.dots.name, game: R.GAMES['quick-tap'].name + ' · ' + G.MODE_NAME[m] }; });
    const and = a => a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1], count = X.need.match(/^\d+\s+\S+/)[0];
    const want = C.steps.map(s => s.replace('{need}', X.need.replace(/\bany\b/, 'a')).replace('{count}', count).replace('{secs}', X.lens[0]).replace('{first}', X.names[0])
      .replace('{names}', and(X.names)).replace('{all}', and(X.lens.map(String))).replace('{game}', X.game).replace('{second}', X.names[1]).replace('{row}', X.row));
    // build 65 (64.2): the first result's lines as the config makes them
    const fillO = s => s.replace('{count}', count).replace('{second}', X.names[1]).replace('{long}', X.names[2]).replace('{dots}', X.dots).replace('{row}', X.row);
    const box = () => page.evaluate(() => { const t = document.getElementById('tut'); if (!t || t.hidden) return null; const q = t.querySelector('.tring'), drawn = getComputedStyle(q).display !== 'none', r = q.getBoundingClientRect();
      const b = t.querySelector('.tbox').getBoundingClientRect(), over = drawn && !(r.bottom <= b.top || r.top >= b.bottom), a = t.querySelector('.tarrow');
      return { text: t.querySelector('p').textContent, buttons: t.querySelectorAll('button').length, drawn, ring: [Math.round(r.width), Math.round(r.height)], col: getComputedStyle(q).borderTopColor,
        tag: drawn ? t.querySelector('.ttag').textContent : '', arrow: getComputedStyle(a).display !== 'none', centre: [Math.round(b.x + b.width / 2 - innerWidth / 2), Math.round(b.y + b.height / 2 - innerHeight / 2)], top: Math.round(b.top), covers: over }; });
    // the Welcome card may come up on a result (before 62.12 moved it, it did on the first one); "Later" is what a player would tap
    const later = () => page.evaluate(() => { const w = document.getElementById('welcome'); if (w && !w.hidden && w.getClientRects().length) w.querySelector('[data-act="wlater"]')?.click(); });
    const waitText = async (want, n = 80) => { for (let i = 0; i < n; i++) { const b = await box(); if (b && b.text === want) return b; await later(); await sleep(100); } return await box(); };
    // a tap on nothing in particular: the bottom-left corner of the phone
    const anywhere = () => page.evaluate(() => document.elementFromPoint(12, innerHeight - 12).click());
    const state = () => page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, sheet: !document.getElementById('sheet').hidden, lock: document.getElementById('lockwrap').classList.contains('on'), game: document.getElementById('game').classList.contains('on'), vs: 0 }));
    /* build 64 (62.3): a new profile's map drawing itself in — taps on a game, the ground and Back, before the first box, all do nothing:
       no sheet, no navigation, and the first box still arrives */
    {
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); s.prefs.gridSeen = 0; localStorage.setItem('ne', JSON.stringify(s)); });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await click('[data-go="s-pick"]'); await sleep(250);
      const early = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="quick-tap"]'), b = t.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        const drawing = t.getAnimations().some(a => a.playState === 'running'); hit.click(); document.getElementById('grid').click(); document.querySelector('#s-pick .back')?.click();
        return { drawing, box: !document.getElementById('tut') || document.getElementById('tut').hidden }; });
      await sleep(300);
      const mid = await state();
      const first = await waitText(want[0], 120);
      (early.drawing && early.box && mid.screen === 's-pick' && !mid.sheet && first && first.text === want[0])
        ? ok('62.3 taps on a game, the map and Back while the map is still drawing in do nothing — no sheet, no Back — and the first box still arrives')
        : bad('62.3 a tap during the games-menu intro', JSON.stringify({ early, mid, first }));
    }
    const seen = [await waitText(want[0])];
    /* 62.4 / 62.8: three stray taps with a text box up — a game that is not asked for, the ground (which used to go Back), Back itself. Each
       is spent moving a text box on and reaches nothing under it: three boxes on, no sheet, no lock box, still on the map */
    await page.evaluate(() => { document.querySelector('.tile[data-game="dots"]').click(); });
    seen.push(await waitText(want[1])); await page.evaluate(() => document.getElementById('grid').click());
    seen.push(await waitText(want[2])); await page.evaluate(() => document.querySelector('#s-pick .back').click());
    seen.push(await waitText(want[3]));
    const stray = await state();
    // box 4 asks for Dots: Quick Tap, the ground and Back do nothing now
    await page.evaluate(() => { document.querySelector('.tile[data-game="quick-tap"]').click(); document.getElementById('grid').click(); document.querySelector('#s-pick .back').click(); }); await sleep(250);
    const held = { ...(await state()), box: (await box() || {}).text };
    (stray.screen === 's-pick' && !stray.sheet && !stray.lock && seen[3] && seen[3].text === want[3] && held.screen === 's-pick' && !held.sheet && !held.lock && held.box === want[3])
      ? ok('62.4 / 62.8 a stray tap on a text box moves it on and reaches nothing under it; on a box that asks for Dots, Quick Tap, the ground and Back do nothing')
      : bad('62.4 / 62.8 only the asked-for tap', JSON.stringify({ stray, held, box4: seen[3] }));
    // box 4 → Dots: its lock box opens with its rule, and box 5 says the rule back
    await click('.tile[data-game="dots"]');
    seen.push(await waitText(want[4]));
    const rule = await page.evaluate(() => ({ lock: document.getElementById('lockwrap').classList.contains('on'), text: document.getElementById('lock-text').textContent }));
    await anywhere(); seen.push(await waitText(want[5]));
    const closed = await state();
    await click('.tile[data-game="quick-tap"]'); seen.push(await waitText(want[6]));
    await anywhere(); seen.push(await waitText(want[7]));
    await page.evaluate(() => document.getElementById('grid').click()); await sleep(200); const twoHeld = (await box() || {}).text;
    await click(`#diff-row .choice[data-diff="${X.m}"]`); seen.push(await waitText(want[8]));
    await anywhere(); seen.push(await waitText(want[9]));
    await anywhere(); seen.push(await waitText(want[10]));
    // box 11 rings With a friend, which cannot be picked: a tap on it moves the box on and leaves Solo chosen
    await click('#vs-wrap [data-p="f"]'); seen.push(await waitText(want[11]));
    const solo = await page.evaluate(async () => (await import('./core/state.js')).sel.vs);
    (seen.length === 12 && seen.every((b, i) => b && b.text === want[i]) && !/\{/.test(want.join('')) && rule.lock && rule.text.includes(X.need) && !closed.lock && twoHeld === want[7] && solo === 0)
      ? ok(`62.9 the twelve boxes in Aiden's order; box 5 is the Dots rule from config ("${want[4]}") and box 10 its count and Sprint's seconds; Dots opens its lock box, which closes on the next tap; the friend option rings and cannot be picked`)
      : bad('62.9 the twelve boxes', JSON.stringify({ seen: seen.map(b => b && b.text), want, rule, closed, twoHeld, solo }));
    // 62.6: no ring on the three about the whole list, a ring on every box that asks for a tap, "Start here" on Quick Tap's
    (!seen[0].drawn && !seen[1].drawn && !seen[2].drawn && [3, 5, 7, 11].every(i => seen[i].drawn && seen[i].ring[0] > 0 && seen[i].ring[0] < 380) && seen[5].tag === C.start && seen[10].drawn)
      ? ok(`62.6 no outline on the boxes about the whole list; one round each thing to tap (and With a friend), Quick Tap's labelled "${C.start}"`)
      : bad('62.6 the outlines', JSON.stringify(seen.map(b => b && { t: b.text.slice(0, 20), drawn: b.drawn, ring: b.ring, tag: b.tag })));
    // 62.7: every box in the centre of the phone, the same top, never over what it rings; 62.8: no button on any of them
    (seen.every(b => b && Math.abs(b.centre[0]) <= 2 && Math.abs(b.centre[1]) <= 2 && b.top === seen[0].top && !b.covers && b.buttons === 0))
      ? ok(`62.7 / 62.8 all twelve boxes sit in the centre of the phone at one spot (top ${seen[0].top}px), none over what it rings, no Skip and no Next on any`)
      : bad('62.7 / 62.8 the centred box', JSON.stringify(seen.map(b => b && { t: b.text.slice(0, 20), c: b.centre, top: b.top, covers: b.covers, buttons: b.buttons })));
    /* build 65 (64.3): every toast from here on, with the screen it showed on and whether a walkthrough box was up at the same moment — this first
       run is Aiden's v0.64 case, a Sprint fast enough to open Dash (7 in a row) and Four (15 in a row) at once */
    await page.evaluate(() => { window.__toasts = []; window.__overlap = 0; const t = document.getElementById('toast'), tut = () => { const b = document.getElementById('tut'); return !!b && !b.hidden; };
      new MutationObserver(() => { if (t.classList.contains('on')) window.__toasts.push({ t: t.textContent, s: document.querySelector('.screen.on')?.id || 'game' }); }).observe(t, { attributes: true, attributeFilter: ['class'] });
      setInterval(() => { if (t.classList.contains('on') && tut()) window.__overlap++; }, 40); });
    // box 12 → Sprint: the run starts with no box for Go — and with no Exit and no Restart (62.10)
    await click(`#time-row .tbtn[data-time="${X.lens[0]}"]`);
    for (let i = 0; i < 60 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
    const first = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), exit: getComputedStyle(document.getElementById('quit')).display, restart: getComputedStyle(document.getElementById('restart')).display, tut: JSON.parse(localStorage.getItem('ne')).prefs.tut }));
    // build 65 (64.2): twenty hits in a row — Dash (7) and Four (15) open, Dots (35) does not, which is the first result the third box branches on
    for (let i = 0, n = 0; i < 200 && (await page.evaluate(() => document.getElementById('game').classList.contains('on'))); i++) { if (n < 20 && await page.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') { const t = document.querySelector('.pad[data-side="' + i + '"]'), r = t.getBoundingClientRect(); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); return true; } return false; })) n++; await sleep(60); }
    const rec = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ne')).prefs; return { tut: p.tut, run: !!p.tutRun && p.tutRun.g }; });
    const r1 = await waitText(OV[0], 400);
    /* 64.3: both unlocks toast on the result, in the order they were earned, and the walkthrough's first box waits until every toast has gone —
       it never shows while one is up. The run's two unlocks are Dash and Four; a mid-run toast still up when the run ended is said again here */
    const T3 = await page.evaluate(async () => { const C = (await import('./config/copy.js')).TOAST, R = await import('./games/registry.js'), G = await import('./config/games.js');
      return { toasts: window.__toasts, overlap: window.__overlap, dash: C.unlock.replace('{name}', R.lenName('quick-tap', R.GC('quick-tap', 'two').lens[1], 'two')), four: C.unlock.replace('{name}', G.MODE_NAME.four),
        unl: JSON.parse(localStorage.getItem('ne')).unlock }; });
    const onOver = T3.toasts.filter(x => x.s === 's-over').map(x => x.t), iD = onOver.indexOf(T3.dash), iF = onOver.indexOf(T3.four);
    (iD >= 0 && iF > iD && T3.overlap === 0 && Object.keys(T3.unl).length >= 2)
      ? ok(`64.3 a first run that opens two things at once: "${T3.dash}" then "${T3.four}" both toast on the result, in order, and no walkthrough box shows while a toast is up`)
      : bad('64.3 two unlocks on the first run', JSON.stringify({ onOver, all: T3.toasts, overlap: T3.overlap, unl: T3.unl }));
    // 62.10: the app closed half way through the result — reopened, it lands back on that result, box one
    await anywhere(); await waitText(OV[1]);
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const back = await waitText(OV[0], 200), backOn = (await state()).screen;
    (first.game && first.exit === 'none' && first.restart === 'none' && first.tut !== 1 && rec.tut === 1 && rec.run === 'quick-tap' && r1 && back && back.text === OV[0] && backOn === 's-over')
      ? ok('62.10 the first run has no Exit and no Restart; once it is on record, an app reopened before "Good luck!" lands on its result and starts the eight boxes again')
      : bad('62.10 the first run and the resume', JSON.stringify({ first, rec, r1: r1 && r1.text, back: back && back.text, backOn }));
    /* 62.11 / 64.2: the boxes, each moved on by any tap — a tap on TRY AGAIN (ringed) or BACK (arrowed) does neither thing. This run opened Dash and
       Four, so the third box names both and the fourth rings Dash with the Dots line */
    const G2 = await page.evaluate(async () => { const R = await import('./games/registry.js'), G = await import('./config/games.js'); return { dash: R.lenName('quick-tap', R.GC('quick-tap', 'two').lens[1], 'two'), four: G.MODE_NAME.four }; });
    const OW = [C.over.hi, C.over.again, C.over.got.replace('{names}', G2.dash + ' and ' + G2.four), fillO(C.over.next), C.over.back, ...C.over.end];
    const over = [back];
    await click('#again'); over.push(await waitText(OW[1]));
    await click('#again'); over.push(await waitText(OW[2]));
    await click('#again'); over.push(await waitText(OW[3]));
    await click('#over-back'); over.push(await waitText(OW[4]));
    for (let i = 5; i < OW.length; i++) { await click('#over-back'); over.push(await waitText(OW[i])); }
    const dashW = await page.evaluate(() => document.querySelector('#over-chips2 .chip:nth-child(2)').getBoundingClientRect().width);
    const still = await state();
    const rings = await page.evaluate(() => ({ again: document.getElementById('again').getBoundingClientRect().width, back: document.getElementById('over-back').getBoundingClientRect() }));
    (over.every((b, i) => b && b.text === OW[i]) && over[1].drawn && Math.abs(over[1].ring[0] - rings.again - 12) <= 2 && !over[2].drawn && over[3].drawn && Math.abs(over[3].ring[0] - dashW - 12) <= 2 && over[4].arrow && !over[4].drawn && !over[0].drawn && still.screen === 's-over' && !still.game
      // AMENDED at build 65 (64.4): the result no longer scrolls, so a box whose ring sits at the centre (TRY AGAIN) moves clear of it instead
      && over.every(b => (Math.abs(b.centre[1]) <= 2 || b.drawn) && !b.covers) && !/\{/.test(OW.join('')))
      ? ok(`62.11 / 64.2 the first result's boxes in order, centred: TRY AGAIN ringed, "${OW[2]}", then "${OW[3]}" with Dash ringed, an arrow at BACK — and tapping either does nothing until the last box`)
      : bad('62.11 the result boxes', JSON.stringify({ want: OW, over: over.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring, arrow: b.arrow, c: b.centre, covers: b.covers }), still, rings }));
    // 62.14: "Good luck!" is answered — Off the Rails banked, the walkthrough gone, the result screen live again (and the second run can be quit)
    await anywhere(); await sleep(300);
    const done = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); return { tut: s.prefs.tut, tutRun: !!s.prefs.tutRun, rails: !!s.ach.rails, hidden: document.getElementById('tut').hidden }; });
    await click('#again'); for (let i = 0; i < 60 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
    const second = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), exit: getComputedStyle(document.getElementById('quit')).display, restart: getComputedStyle(document.getElementById('restart')).display }));
    await click('#quit'); await sleep(400);
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu')); await sleep(300);
    const menu = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#s-menu .item[data-go]')].map(b => [b.dataset.go, b.classList.contains('dim')])));
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-prog', { tab: 'ach' })); await sleep(400);
    const row = await page.evaluate(async () => { const a = (await import('./config/achievements.js')).ACH.find(x => x.id === 'rails'), b = document.getElementById('ach-rails');
      return { name: a && a.name, gives: a && a.gives, key: !!(a && (a.kt || a.combo)), text: b ? b.textContent : '', gold: b && b.querySelector('.aname') ? getComputedStyle(b.querySelector('.aname')).color : '', done: b && b.classList.contains('done') }; });
    const gold = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gold').trim());
    /* AMENDED at build 65 (64.7, replacing 62.14's "the last box opens Scores, Progress and About"): Off the Rails is still banked, gold, feeding no
       key — and now opens nothing, so the three stay crossed out until their own moments (checked below) */
    (done.tut === 2 && !done.tutRun && done.rails && done.hidden && second.game && second.exit !== 'none' && second.restart !== 'none' && menu['s-board'] && menu['s-prog'] && menu['s-about']
      && row.done && row.text.includes(row.name) && !row.gives && !/Unlocks/.test(row.text) && !row.key && row.gold)
      ? ok(`62.14 / 64.7 "Good luck!" banks ${row.name} (gold, no key, unlocks nothing) and the walkthrough ends; Scores, Progress and About stay crossed out; the second run has Exit and Restart back`)
      : bad('62.14 the end of the walkthrough', JSON.stringify({ done, second, menu, row, gold }));
    /* 64.3: THE WALKTHROUGH FINISHES ONCE AND NEVER COMES BACK — on the map (where v0.64 restarted it behind a pick sheet with no box), on the
       result, or after a reload */
    {
      const noBox = async where => { await page.evaluate(async w => (await import('./ui/router.js')).show(w, w === 's-pick' ? { g: 'quick-tap', d: 'two' } : {}), where); await sleep(900);
        return page.evaluate(() => { const b = document.getElementById('tut'); return { box: !!b && !b.hidden, tut: JSON.parse(localStorage.getItem('ne')).prefs.tut }; }); };
      const a = await noBox('s-pick'); await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(600);
      const b = await page.evaluate(() => { const t = document.getElementById('tut'); return !!t && !t.hidden; });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); const c = await noBox('s-pick');
      const tap = await page.evaluate(() => { document.querySelector('.tile[data-game="quick-tap"]').click(); return !!document.querySelector('#sheet.up'); }); await sleep(300);
      const opened = await page.evaluate(() => !!document.querySelector('#sheet.up'));
      (!a.box && a.tut === 2 && !b && !c.box && c.tut === 2 && opened)
        ? ok('64.3 once finished the walkthrough never replays: no box on the map or its sheet, before or after a reload, and the map answers taps')
        : bad('64.3 the walkthrough replayed', JSON.stringify({ a, b, c, opened }));
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu')); await sleep(200);
    }
    /* 62.14: what locks them — a profile that has not finished it has Scores, Progress and About crossed out; one from before build 64 that has
       played and never met the walkthrough keeps them open */
    const menuOf = async prefs => { await page.evaluate(p => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: Object.assign({ story: 1, gridSeen: 1, menuSeen: 1, snd: 'off' }, p), runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} })); }, prefs);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); return page.evaluate(() => ['s-board', 's-prog', 's-about'].map(g => document.querySelector(`#s-menu .item[data-go="${g}"]`).classList.contains('dim'))); };
    const fresh = await menuOf({}), legacy = await menuOf({ played: 1 }), legacy64 = await menuOf({ tut: 2, played: 1 }), since = await menuOf({ tut: 2, played: 1, menuUnl: {} });
    (fresh.every(Boolean) && legacy.every(x => !x) && legacy64.every(x => !x) && since.every(Boolean))
      ? ok('62.14 / 64.7 a new profile has Scores, Progress and About crossed out; one saved before build 65 with its walkthrough behind it (or from before the walkthrough) keeps all three; one saved since keeps only what it opened')
      : bad('62.14 what locks the three items', JSON.stringify({ fresh, legacy }));
    // build 64 (62.5): Replay lives in the Testing menu and nowhere in Customise; it lands on the games menu at box one
    const where = await page.evaluate(() => ({ testing: !!document.querySelector('#s-testing #tut-replay'), custom: !!document.querySelector('#s-custom [data-act="tut-replay"]') }));
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.prefs.played = 1; S.save(); (await import('./ui/router.js')).show('s-testing'); }); await sleep(200);
    await click('#tut-replay'); await sleep(300);
    const again = await waitText(want[0]), on = (await state()).screen;
    (where.testing && !where.custom && again && again.text === want[0] && on === 's-pick')
      ? ok('62.5 Replay tutorial is in the Testing menu, gone from Customise, and lands on the games menu with the walkthrough at box one whatever has been played')
      : bad('62.5 replay', JSON.stringify({ where, again, on }));
    /* build 65 (A1): Testing's second switch — every first-time tutorial forgotten, the walkthrough back at box one, and a tutorial whose thing is
       already open armed again at its first step (Progress, on a profile that has it) */
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.prefs.played = 1; S.prefs.tuts = { prog: 'done', board: 3 }; S.prefs.menuUnl = { prog: 1 }; S.save(); (await import('./ui/router.js')).show('s-testing'); }); await sleep(200);
    await click('#tut-reset'); await sleep(300);
    const reset = await waitText(want[0]), rs = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ne')).prefs; return { tut: p.tut, tuts: p.tuts, on: document.querySelector('.screen.on')?.id }; });
    (reset && reset.text === want[0] && rs.tut === -1 && rs.on === 's-pick' && rs.tuts.board === undefined && (rs.tuts.prog === 0 || rs.tuts.prog === undefined))
      ? ok('A1 Testing: "reset all first-time tutorials" forgets every one, puts the walkthrough back at box one and re-arms those whose thing is open')
      : bad('A1 reset all first-time tutorials', JSON.stringify({ reset: reset && reset.text, rs }));
    /* build 65 (64.2): THE OTHER BRANCH — a first run that did not open Dash. Its third box is Dash's own rule, read from config, with TRY AGAIN ringed */
    {
      const t = Date.now(), r = { g: 'quick-tap', d: 'two', s: X.lens[0], t, hits: 4, misses: 3, v: 4 };
      await page.evaluate(r => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 1, tutRun: r }, runs: [r], ach: {}, unlock: {}, intro: { 'quick-tap': 1, 'quick-tap:two': 1 }, seen: {}, bars: {} })); }, r);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
      const m = [await waitText(C.over.hi, 300)]; await anywhere(); m.push(await waitText(C.over.again)); await anywhere(); m.push(await waitText(fillO(C.over.miss)));
      const againW = await page.evaluate(() => document.getElementById('again').getBoundingClientRect().width);
      (m[2] && m[2].text === fillO(C.over.miss) && m[2].drawn && Math.abs(m[2].ring[0] - againW - 12) <= 2 && !/\{/.test(m[2].text))
        ? ok(`64.2 a first run that did not open Dash: the third box is "${m[2].text}", TRY AGAIN ringed`)
        : bad('64.2 the no-Dash branch', JSON.stringify(m.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring })));
    }
    /* build 65 (64.7): EACH OPENS AT ITS OWN MOMENT — Progress with the first Estimate run, Scores with the first Reaction run, About when the Welcome
       clip finishes (and the player lands on the main menu). Each toasts like any unlock; nothing opens a second one */
    {
      const unl = { 'dots:blind': 1, 'hold:grow': 1, 'reaction:flash': 1 };
      await page.evaluate((u, si) => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, menuUnl: {}, welcomeSeen: 1 }, runs: [], ach: {}, unlock: u, intro: si, seen: {}, bars: {} })); }, unl, SEEN_INTRO);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
      const dims = () => page.evaluate(() => Object.fromEntries(['s-board', 's-prog', 's-about'].map(g => [g, document.querySelector(`#s-menu .item[data-go="${g}"]`).classList.contains('dim')])));
      const toasts = () => page.evaluate(() => { const t = document.getElementById('toast'); window.__t64 = window.__t64 || []; if (!window.__t64o) { window.__t64o = 1; new MutationObserver(() => { if (t.classList.contains('on')) window.__t64.push(t.textContent); }).observe(t, { attributes: true, attributeFilter: ['class'] }); } return window.__t64; });
      const before = await dims(); await toasts();
      const runOf = async g => { await page.evaluate(async g => (await import('./run/run.js')).goWhere({ g }), g); await driveToResult(g, '64.7 a first ' + g + ' run'); await sleep(9000);
        await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu')); await sleep(400); return dims(); };
      const afterEst = await runOf('hold'), afterRx = await runOf('reaction');
      await page.evaluate(async () => { const V = await import('./ui/video.js'), M = (await import('./config/messages.js')).MESSAGES; (await import('./ui/router.js')).show('s-over'); V.playVideo(M[0]); await new Promise(r => setTimeout(r, 600)); V.closeVideo(); });
      await sleep(2500); for (let i = 0; i < 150 && await page.evaluate(async () => (await import('./ui/toast.js')).toastBusy()); i++) await sleep(100);
      const afterVid = await dims(), on = await page.evaluate(() => document.querySelector('.screen.on')?.id), said = await toasts();
      const C7 = await page.evaluate(async () => { const U = (await import('./config/unlocks.js')).MENU_UNLOCK, T = (await import('./config/copy.js')).TOAST; return ['prog', 'board', 'about'].map(k => T.unlock.replace('{name}', U[k].name)); });
      (Object.values(before).every(Boolean) && !afterEst['s-prog'] && afterEst['s-board'] && afterEst['s-about'] && !afterRx['s-board'] && afterRx['s-about'] && !afterVid['s-about'] && on === 's-menu' && C7.every(x => said.includes(x)))
        ? ok(`64.7 Progress opens with the first Estimate run, Scores with the first Reaction run, About when the Welcome clip finishes (landing on the main menu) — each on its own, each toasting ("${C7.join('", "')}")`)
        : bad('64.7 the menu unlock order', JSON.stringify({ before, afterEst, afterRx, afterVid, on, said, C7 }));
      /* 64.8: THE ABOUT TUTORIAL, straight after the clip, on the main menu: About ringed and the only thing that answers — Scores does nothing —
         then five boxes inside About, the videos, the feedback line and the support button ringed; a reload half way resumes at the same box */
      const CA = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL.about);
      const a = [await waitText(CA[0], 100)];
      await click('#s-menu .item[data-go="s-board"]'); await sleep(300); const held = (await state()).screen;
      await click('#s-menu .item[data-go="s-about"]'); a.push(await waitText(CA[1])); const inAbout = (await state()).screen;
      await anywhere(); a.push(await waitText(CA[2])); await anywhere(); a.push(await waitText(CA[3]));
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await page.evaluate(async () => (await import('./ui/router.js')).show('s-about'));
      const resumed = await waitText(CA[3]); a.push(resumed);
      await anywhere(); a.push(await waitText(CA[4])); await anywhere(); a.push(await waitText(CA[5])); await anywhere(); await sleep(400);
      const rings = await page.evaluate(() => ({ list: document.getElementById('msglist').getBoundingClientRect().width, fb: document.getElementById('feedback').getBoundingClientRect().width, sup: document.getElementById('support').getBoundingClientRect().width }));
      const endA = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem('ne')).prefs.tuts.about, box: !document.getElementById('tut').hidden }));
      const txt = [a[0], a[1], a[2], a[3], a[5], a[6]].map(b => b && b.text);
      (txt.join('|') === CA.join('|') && held === 's-menu' && inAbout === 's-about' && a[0].drawn && a[2].drawn && Math.abs(a[2].ring[0] - rings.list - 12) <= 2 && a[3].drawn && Math.abs(a[3].ring[0] - rings.fb - 12) <= 2
        && a[5].drawn && Math.abs(a[5].ring[0] - rings.sup - 12) <= 2 && !a[1].drawn && resumed && resumed.text === CA[3] && endA.done === 'done' && !endA.box && a.every(b => b && !b.covers))
        ? ok('64.8 after the Welcome clip: About ringed on the main menu and the only thing that answers; inside, the six boxes in order with the videos, feedback and support ringed; a reload resumes at the same box; done once')
        : bad('64.8 the About tutorial', JSON.stringify({ a: a.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring, covers: b.covers }), held, inAbout, rings, endA }));
    }
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
  }
}
