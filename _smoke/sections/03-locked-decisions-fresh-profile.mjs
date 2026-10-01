// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, at, sawStory, page, click, stepQuickTap, driveToResult, SEEN_INTRO, revealDone } from '../lib/gate.mjs';

export const SECTION = ["locked decisions (fresh profile)"];
// build 66 (65.19): a box shows its line without the colour marks, so the copy is compared the same way
const um = v => typeof v === 'string' ? v.replace(/\[\/?(green|yellow|red)\]/g, '') : Array.isArray(v) ? v.map(um) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, um(x)])) : v;

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
    const C = um(await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL));
    // build 65 (A1): the result's boxes are named now so the third can branch (64.2); in order, they are these
    const OV = [C.over.hi, C.over.again];
    // the lines as the config makes them: the Dots rule (never a typed 35), Quick Tap's lengths and their seconds
    const X = await page.evaluate(async () => { const U = (await import('./config/unlocks.js')).UNLOCKS, R = await import('./games/registry.js'), G = await import('./config/games.js');
      const d = R.GAMES.dots.modes[0], need = U.find(u => u.key === 'dots:' + d).need, m = R.GAMES['quick-tap'].modes[0], lens = R.GC('quick-tap', m).lens, names = lens.map(s => R.lenName('quick-tap', s, m));
      const row = (await import('./config/unlocks.js')).LEN_RULES['quick-tap:' + m][1].match(/^\d+ hits in a row/)[0];
      return { need, m, lens, names, row, dots: R.GAMES.dots.name, game: R.GAMES['quick-tap'].name + ' · ' + G.MODE_NAME[m], v: R.GAMES['quick-tap'].modes.map(x => G.MODE_NAME[x]), qt: R.GAMES['quick-tap'].name }; });
    const and = a => a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1], count = X.need.match(/^\d+\s+\S+/)[0];
    // build 66 (section C): every placeholder Aiden's marked lines use, from the config
    const V = { need: X.need.replace(/\bany\b/, 'a'), count, qt: X.qt, secs: X.lens[0], s1: X.lens[0], s2: X.lens[1], s3: X.lens[2], first: X.names[0], second: X.names[1], long: X.names[2],
      names: and(X.names), all: and(X.lens.map(String)), game: X.game, row: X.row, rowN: X.row.match(/^\d+/)[0], v1: X.v[0], v2: X.v[1], dots: X.dots };
    const want = C.steps.map(s => s.replace(/\{(\w+)\}/g, (_, k) => V[k] ?? '{' + k + '}'));
    // build 65 (64.2): the first result's lines as the config makes them
    const fillO = s => s.replace('{count}', count).replace('{second}', X.names[1]).replace('{long}', X.names[2]).replace('{dots}', X.dots).replace('{row}', X.row);
    // build 66 (65.5): a box glides between spots, so it is read once it has come to rest
    const box = () => page.evaluate(async () => { const t = document.getElementById('tut'); if (!t || t.hidden) return null;
      for (let i = 0; i < 40 && t.getAnimations({ subtree: true }).some(a => a.playState === 'running' && a.effect.getComputedTiming().iterations !== Infinity); i++) await new Promise(r => setTimeout(r, 30));
      const q = t.querySelector('.tring'), drawn = getComputedStyle(q).display !== 'none', r = q.getBoundingClientRect(), tl = t.querySelector('.ttail');
      const b = t.querySelector('.tbox').getBoundingClientRect(), over = drawn && !(r.bottom <= b.top || r.top >= b.bottom), a = t.querySelector('.tarrow');
      return { text: t.querySelector('p').textContent, buttons: t.querySelectorAll('button').length, drawn, ring: [Math.round(r.width), Math.round(r.height)], col: getComputedStyle(q).borderTopColor,
        tag: drawn ? t.querySelector('.ttag').textContent : '', arrow: getComputedStyle(a).display !== 'none', centre: [Math.round(b.x + b.width / 2 - innerWidth / 2), Math.round(b.y + b.height / 2 - innerHeight / 2)], top: Math.round(b.top), covers: over,
        inside: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth, tail: getComputedStyle(tl).display !== 'none', glow: document.querySelectorAll('.tglow').length, rt: Math.round(r.top) }; });
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
    /* AMENDED at build 66 (65.5, superseding 62.7's one centred spot): every box is on the phone, centred across it, never over what it rings, and a
       ringed box has its tail; the boxes move (not one spot); 62.8: no button on any of them */
    (seen.every(b => b && Math.abs(b.centre[0]) <= 2 && b.inside && !b.covers && b.buttons === 0 && (!b.drawn || b.tail)) && new Set(seen.map(b => b.top)).size > 2)
      ? ok(`65.5 / 62.8 all twelve boxes sit beside what they ring (tops ${[...new Set(seen.map(b => b.top))].join(', ')}px), never over it, a tail on every ringed one, no Skip and no Next on any`)
      : bad('65.5 / 62.8 where the box sits', JSON.stringify(seen.map(b => b && { t: b.text.slice(0, 20), c: b.centre, top: b.top, covers: b.covers, inside: b.inside, tail: b.tail, drawn: b.drawn, buttons: b.buttons })));
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
    // AMENDED at build 66 (section C, over-03): the unlock line comes straight after the first box, ahead of Try Again
    const OW = [C.over.hi, C.over.got.replace('{names}', G2.dash + ' and ' + G2.four), C.over.again, fillO(C.over.next), C.over.back, ...C.over.end];
    const over = [back];
    await click('#again'); over.push(await waitText(OW[1]));
    await click('#again'); over.push(await waitText(OW[2]));
    await click('#again'); over.push(await waitText(OW[3]));
    await click('#over-back'); over.push(await waitText(OW[4]));
    for (let i = 5; i < OW.length; i++) { await click('#over-back'); over.push(await waitText(OW[i])); }
    const dashW = await page.evaluate(() => document.querySelector('#over-chips2 .chip:nth-child(2)').getBoundingClientRect().width);
    const still = await state();
    const rings = await page.evaluate(() => ({ again: document.getElementById('again').getBoundingClientRect().width, back: document.getElementById('over-back').getBoundingClientRect() }));
    (over.every((b, i) => b && b.text === OW[i]) && over[1].drawn && Math.abs(over[1].ring[0] - dashW - 12) <= 2 && over[2].drawn && Math.abs(over[2].ring[0] - rings.again - 12) <= 2 && over[3].drawn && Math.abs(over[3].ring[0] - dashW - 12) <= 2 && over[4].arrow && !over[4].drawn && !over[0].drawn && still.screen === 's-over' && !still.game
      // AMENDED at build 66 (65.5): no box is parked in the centre — each sits beside what it rings, never over it
      && over.every(b => b.inside && !b.covers) && !/\{/.test(OW.join('')))
      ? ok(`62.11 / 64.2 / section C the first result's boxes in order: "${OW[1]}" with Dash ringed, TRY AGAIN ringed, then "${OW[3]}" with Dash ringed, an arrow at BACK — and tapping either does nothing until the last box`)
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
    (reset && reset.text === want[0] && rs.tut === -1 && rs.on === 's-pick' && rs.tuts.board === undefined && rs.tuts.prog === 0)
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
      /* build 66 (65.3): each of the three, crossed out, says what opens it in green — the line composed from MENU_UNLOCK, never typed */
      {
        const L3 = await page.evaluate(async () => { const U = (await import('./config/unlocks.js')).MENU_UNLOCK, C = (await import('./config/copy.js')).MENU, R = await import('./games/registry.js'), M = (await import('./config/messages.js')).MESSAGES;
          const want = { 's-board': C.playNeed.replace('{game}', R.GAMES[U.board.game].name), 's-prog': C.playNeed.replace('{game}', R.GAMES[U.prog.game].name), 's-about': C.watchNeed.replace('{title}', M.find(m => m.id === U.about.video).title.toLowerCase()) };
          const ok = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim(), p = document.createElement('i'); p.style.color = ok; document.body.appendChild(p); const green = getComputedStyle(p).color; p.remove();
          return Object.entries(want).map(([go, w]) => { const b = document.querySelector(`#s-menu .item[data-go="${go}"]`), n = b.querySelector('.cusneed');
            return { go, w, t: n && !n.hidden ? n.textContent : null, green: n ? getComputedStyle(n).color === green : false, op: getComputedStyle(b).opacity }; }); });
        (L3.every(x => x.t === x.w && x.green && +x.op === 1))
          ? ok(`65.3 crossed-out Scores, Progress and About each say what opens them in green: ${L3.map(x => '"' + x.t + '"').join(', ')} (from MENU_UNLOCK)`)
          : bad('65.3 the locked menu lines', JSON.stringify(L3));
      }
      /* build 66 (section C, prog-01): the first Estimate run's RESULT says the Progress tutorial's first line once its toasts are done — it is read there
         and moved on with a tap, as a player would */
      const P0 = await page.evaluate(async () => { const C = (await import('./config/copy.js')).TUTORIAL.prog[0], R = await import('./games/registry.js'); return C.replace('{game}', R.GAMES.hold.name); }), est = {};
      const runOf = async g => { await page.evaluate(async g => (await import('./run/run.js')).goWhere({ g }), g); await driveToResult(g, '64.7 a first ' + g + ' run');
        if (g === 'hold') { const b = await waitText(um(P0), 200); est.text = b && b.text; est.on = (await state()).screen; await anywhere(); await sleep(300); } else await sleep(9000);
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
      const CA = um(await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL.about));
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
      /* 64.9 / 64.12: the Estimate and Reaction runs above armed PROGRESS and SCORES; each waits its turn on the main menu. Progress: the item ringed,
         two lines, the Games chest tab ringed, then a game filter must be picked — All does nothing. Scores: the item ringed, a welcome, Quick Tap's
         chip to tap, the web chart ringed */
      const CP = um(await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL)), QTN = await page.evaluate(async () => (await import('./games/registry.js')).GAMES['quick-tap'].name);
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu'));
      const p = [await waitText(CP.prog[1])]; await click('#s-menu .item[data-go="s-prog"]'); p.push(await waitText(CP.prog[2]));
      for (let i = 3; i <= 6; i++) { await anywhere(); p.push(await waitText(CP.prog[i])); }
      await click('#chest-g .chip[data-v="all"]'); await sleep(300); const allHeld = (await box() || {}).text;
      await click('#chest-g .chip[data-v="hold"]'); await sleep(500);
      const pEnd = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem('ne')).prefs.tuts.prog, box: !document.getElementById('tut').hidden, g: document.querySelector('#chest-g .chip.sel')?.dataset.v, tab: document.querySelector('#prog-tabs .chip.sel')?.dataset.tab }));
      (est.text === um(P0) && est.on === 's-over' && p.map(b => b && b.text).join('|') === CP.prog.slice(1).join('|') && p[0].drawn && p[3].drawn && p[4].drawn && p[5].drawn && allHeld === CP.prog[6] && pEnd.done === 'done' && !pEnd.box && pEnd.g === 'hold' && pEnd.tab === 'c-games')
        ? ok(`64.9 / section C the Progress tutorial: "${um(P0)}" on the first Estimate run's result, then Progress ringed on the menu, its boxes in order (the Games chest line split in two), the tab ringed, a game filter picked to finish (All does nothing)`)
        : bad('64.9 the Progress tutorial', JSON.stringify({ est, P0, p: p.map(b => b && { t: b.text, drawn: b.drawn }), allHeld, pEnd }));
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu'));
      const want12 = [CP.board[0], CP.board[1], CP.board[2].replace('{game}', QTN), CP.board[3]];
      const q = [await waitText(want12[0])]; await click('#s-menu .item[data-go="s-board"]'); q.push(await waitText(want12[1]));
      await anywhere(); q.push(await waitText(want12[2])); await click('#bd-g .chip[data-v="quick-tap"]'); q.push(await waitText(want12[3]));
      const radarW = await page.evaluate(() => document.getElementById('radar').getBoundingClientRect().width); await anywhere(); await sleep(400);
      const qEnd = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem('ne')).prefs.tuts.board, box: !document.getElementById('tut').hidden }));
      (q.map(b => b && b.text).join('|') === want12.join('|') && q[0].drawn && q[2].drawn && q[3].drawn && Math.abs(q[3].ring[0] - radarW - 12) <= 2 && qEnd.done === 'done' && !qEnd.box)
        ? ok(`64.12 the Scores tutorial after the first Reaction run: Scores ringed on the menu, a welcome, "${want12[2]}" with its chip to tap, the web chart ringed`)
        : bad('64.12 the Scores tutorial', JSON.stringify({ q: q.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring }), radarW, qEnd }));
    }
    /* 64.14, REWRITTEN at build 66 (65.9): THE GAMES CHEST TUTORIAL — every mode open, the Games chest opened from the map: the first box when its
       words have spilt, then the SKILL KEY word ringed to tap (the tutorial takes the player nowhere itself), the key (after its own first animation)
       with every spoke lit, Quick Tap's node to tap, BACK ringed to tap, the menu with Customise, and the Games chest's background to pick. Every screen
       change on the way is recorded with the tap before it: each follows a tap on a ring, none a tap on a text box or no tap at all */
    {
      const keys = await page.evaluate(async () => (await import('./config/unlocks.js')).UNLOCKS.map(u => u.key).filter(k => k !== 'sequence:practice'));
      const unl = Object.fromEntries(keys.map(k => [k, 1]));
      await page.evaluate((u, si) => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 1 }, runs: [], ach: {}, unlock: u, intro: si, seen: {}, bars: {} })); }, unl, SEEN_INTRO);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(900);
      /* build 66 (65.18): THE CHEST'S VIDEO IS OWED FIRST. The card continued, the Games chest's clip is owed: no tutorial box shows; the next tap
         anywhere opens it, the Welcome clip for now; a tap outside and a tap on the picture do nothing — it plays to the end, then the tutorial
         starts. A replay from About closes at a tap */
      await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(600); await revealDone({ owed: true }); await sleep(400);
      const v18 = { owed: await page.evaluate(async () => (await import('./ui/video.js')).videoDue()), boxBefore: await box() };
      await anywhere(); await sleep(400);
      Object.assign(v18, await page.evaluate(async () => { const h = document.getElementById('vplay'), v = h && h.querySelector('video'), wait = ms => new Promise(r => setTimeout(r, ms));
        const o = { open: !!h && !h.hidden, msg: h && h.dataset.msg, src: v ? v.querySelector('source').getAttribute('src') : '', must: h.classList.contains('vmust') };
        h.querySelector('.vback')?.click(); h.click(); await wait(300); o.afterOutside = !h.hidden;
        h.querySelector('.vframe')?.click(); await wait(100); o.notPaused = !!v && !v.paused;
        v.dispatchEvent(new Event('ended')); await wait(1500); o.closedAtEnd = h.hidden; o.seen = !!JSON.parse(localStorage.getItem('ne')).prefs.msgSeen.games;
        const M = (await import('./config/messages.js')).MESSAGES, V = await import('./ui/video.js'); V.playVideo(M.find(m => m.id === 'games')); await wait(300);
        o.replayMust = h.classList.contains('vmust'); h.click(); await wait(1200); o.replayClosed = h.hidden; return o; }));
      const files18 = await page.evaluate(async () => { const M = (await import('./config/messages.js')).MESSAGES; return M.filter(m => m.by && m.by.chest).map(m => m.file); });
      (v18.owed === 'games' && !v18.boxBefore && v18.open && v18.msg === 'games' && v18.src === 'video/welcome-test.mp4' && v18.must && v18.afterOutside && v18.notPaused && v18.closedAtEnd && v18.seen
        && !v18.replayMust && v18.replayClosed && files18.length === 4 && files18.every(f => f === 'video/welcome-test.mp4'))
        ? ok('65.18 a chest\'s video is owed when its card is continued: no tutorial box meanwhile; the next tap anywhere plays it (the Welcome clip, named per chest for all four), a tap outside or on the picture does nothing, it closes at its end; a replay from About closes at a tap')
        : bad('65.18 the owed chest video', JSON.stringify({ v18, files18 }));
      const CG = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL.games), gg = [], UG = CG.map(s => s.replace(/\[\/?(green|yellow|red)\]/g, ''));
      await page.evaluate(async () => { const E = await import('./core/events.js'); window.__nav = []; window.__clk = null;
        window.addEventListener('click', () => { const t = document.getElementById('tut'); window.__clk = { t: performance.now(), up: !!t && !t.hidden, text: !!t && !t.hidden && t.classList.contains('text') }; }, true);
        E.on('screen:change', ({ id }) => { const c = window.__clk; window.__nav.push({ id, dt: c ? Math.round(performance.now() - c.t) : null, ring: !!c && c.up && !c.text }); }); });
      const clearIntro = async () => { for (let i = 0; i < 6; i++) { await revealDone(); await sleep(300); } };
      gg.push(await waitText(UG[0], 150)); const onMap = (await state()).screen; await anywhere(); gg.push(await waitText(UG[1]));
      await click('#grid .chestwords .cw[data-to="s-custom"]'); await sleep(200); const heldW = { s: (await state()).screen, t: (await box() || {}).text };
      await click('#grid .chestwords .cw[data-to="key:0"]'); await clearIntro(); gg.push(await waitText(UG[2], 150));
      await anywhere(); gg.push(await waitText(UG[3])); await anywhere(); gg.push(await waitText(UG[4]));
      await click('#s-menu .item[data-go="s-about"]'); await sleep(200); const heldK = (await state()).screen;
      await page.evaluate(() => document.querySelector('#s-key .knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); gg.push(await waitText(UG[5]));
      await anywhere(); await sleep(200); const stillK = (await state()).screen;
      await click('#s-key > .back'); gg.push(await waitText(UG[6])); const onMenu = (await state()).screen;
      await click('#s-menu .item[data-go="s-custom"]'); gg.push(await waitText(UG[7])); await anywhere(); gg.push(await waitText(UG[8]));
      await click('#c-bg button[data-v="grid"]'); await sleep(200); const heldC = (await box() || {}).text;
      await click('#c-bg button[data-v="snow"]'); gg.push(await waitText(UG[9])); await anywhere(); await sleep(400);
      const gEnd = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ne')).prefs; return { done: p.tuts.games, bg: p.bg, box: !document.getElementById('tut').hidden, nav: window.__nav }; });
      const navBad = gEnd.nav.filter(n => !n.ring || n.dt === null || n.dt > 1000);
      (gg.map(b => b && b.text).join('|') === UG.join('|') && onMap === 's-pick' && heldW.s === 's-pick' && heldW.t === UG[1] && heldK === 's-key' && stillK === 's-key' && onMenu === 's-menu' && heldC === UG[8]
        && gg[1].drawn && gg[1].tail && gg[3].glow === Object.keys(await page.evaluate(async () => (await import("./games/registry.js")).GAMES)).length && !gg[3].covers && gg[4].drawn && gg[5].drawn && gg[6].drawn && gg[8].drawn && gg.every(b => b.inside && !b.covers) && gEnd.done === 'done' && gEnd.bg === 'snow' && !gEnd.box)
        ? ok('64.14 / 65.9 the Games chest tutorial: map → the SKILL KEY word ringed and tapped → the key with every spoke lit → Quick Tap tapped → BACK ringed and tapped → Customise → Snow picked — ten boxes in order, done once')
        : bad('64.14 / 65.9 the Games chest tutorial', JSON.stringify({ gg: gg.map(b => b && { t: b.text, drawn: b.drawn, glow: b.glow, covers: b.covers, inside: b.inside }), onMap, heldW, heldK, stillK, onMenu, heldC, gEnd }));
      (gEnd.nav.length >= 3 && !navBad.length)
        ? ok(`65.9 the tutorial never moves the player: all ${gEnd.nav.length} screen changes (${gEnd.nav.map(n => n.id).join(' → ')}) came straight after a tap on a ringed thing, none after a tap on a text box`)
        : bad('65.9 a tutorial changed the screen by itself', JSON.stringify(gEnd.nav));
    }
    /* build 66 (65.8): ESTIMATE'S SET AND STREAK — the first time its sheet shows the Mode row, on a profile with Estimate open and no Estimate run: the
       row, Set ringed with its rounds from SET_COPY, Streak ringed with how it really ends (the budget, and Grow's free share), then "Pick one" */
    {
      await page.evaluate(si => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 1, tuts: {} }, runs: [], ach: {}, unlock: { 'hold:grow': 1 }, intro: si, seen: {}, bars: {} })); }, SEEN_INTRO);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(900);
      await click('.tile[data-game="hold"]'); await sleep(400);
      if (!(await page.evaluate(() => document.getElementById('sheet').classList.contains('len')))) { await click('#diff-row .choice[data-diff="grow"]'); await sleep(400); }
      const E = await page.evaluate(async () => { const C = (await import('./config/copy.js')).TUTORIAL, G = await import('./config/games.js'), R = await import('./games/registry.js');
        const l = R.GC('hold', 'grow').lens, set = l.find(x => x !== G.STREAK), f = s => s.replace('{set}', R.lenName('hold', set, 'grow')).replace('{streak}', R.lenName('hold', G.STREAK, 'grow')).replace('{n}', G.SET_COPY['hold:grow'].rounds)
          .replace('{bud}', G.ESTIMATE.STREAK_BUD).replace('{free}', C.estFree.replace('{free}', G.ESTIMATE.GROW_FREE));
        return { want: C.est.map(f), set, streak: G.STREAK }; });
      const W8 = um(E.want), e8 = [await waitText(W8[0], 60)];
      for (let i = 1; i < 4; i++) { await anywhere(); e8.push(await waitText(W8[i])); }
      const wd = await page.evaluate(s => ({ set: document.querySelector(`#time-row .tbtn[data-time="${s.set}"]`).getBoundingClientRect().width, streak: document.querySelector(`#time-row .tbtn[data-time="${s.streak}"]`).getBoundingClientRect().width }), E);
      await anywhere(); await sleep(300);
      const e8End = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem('ne')).prefs.tuts.est, box: !document.getElementById('tut').hidden, sheet: document.getElementById('sheet').classList.contains('up') }));
      (e8.every((b, i) => b && b.text === W8[i]) && !e8[0].drawn && e8[1].drawn && Math.abs(e8[1].ring[0] - wd.set - 12) <= 2 && e8[2].drawn && Math.abs(e8[2].ring[0] - wd.streak - 12) <= 2 && e8.every(b => !b.covers && b.inside)
        && !/\{|\[/.test(W8.join('')) && e8End.done === 'done' && !e8End.box && e8End.sheet)
        ? ok(`65.8 Estimate's modes, the first time its sheet shows the Mode row: "${W8[1]}" with Set ringed, "${W8[2]}" with Streak ringed, then "${W8[3]}" — done once, the sheet left up`)
        : bad('65.8 the Estimate modes tutorial', JSON.stringify({ e8: e8.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring, covers: b.covers }), W8, wd, e8End }));
    }
    /* build 66 (65.16): A GAUNTLET'S TUTORIAL, when the chest before it opens — Mini with the Skill chest, Mega with the Pro chest. On the map the
       reveal hands back to, its tile ringed and tapped; then three lines on its screen, every fact from config ("finish", never "beat") */
    for (const [id, g, chests] of [['mini', 'g1', { games: 1, key: 1 }], ['mega', 'g2', { games: 1, key: 1, pro: 1 }]]) {
      await page.evaluate((si, ch) => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 1, keySeen: 1, keysSeen: 1, spill: {}, readySeen: {}, keyIntro: { clear: 1, pro: 1, author: 1 }, chests: ch, tuts: { games: 'done', est: 'done' }, menuUnl: { about: 1, prog: 1, board: 1 } }, runs: [], ach: {}, unlock: {}, intro: si, seen: {}, bars: {} })); }, SEEN_INTRO, chests);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
      await page.evaluate(async c => { const E = await import('./core/events.js'); E.emit('chest:opened', { id: c }); }, id === 'mini' ? 'key' : 'pro');
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(900);
      const F = await page.evaluate(async g => { const C = (await import('./config/copy.js')), N = C.GAUNTLET.name[g]; return { lines: C.TUTORIAL.gaunt, name: N }; }, g);
      const G16 = [];
      for (let i = 0; i < 80 && !(G16[0] = await box()); i++) await sleep(100);
      const tw = await page.evaluate(g => document.querySelector(`#grid .tile[data-gauntlet="${g}"]`)?.getBoundingClientRect().width, g);
      await click(`#grid .tile[data-gauntlet="${g}"]`); await sleep(300); const onG = (await state()).screen;
      for (let i = 1; i < 4; i++) { for (let j = 0; j < 40 && (!(G16[i] = await box()) || G16[i].text === (G16[i - 1] || {}).text); j++) await sleep(100); if (i < 4) await anywhere(); }
      await sleep(300);
      const gEnd = await page.evaluate(id => ({ done: JSON.parse(localStorage.getItem('ne')).prefs.tuts[id], box: !document.getElementById('tut').hidden }), id);
      const txt = G16.map(b => b && b.text), named = (txt[0] || '').includes(F.name), finish = /^Finish it once/.test(txt[3] || '') && !/beat/i.test(txt.join(' '));
      (onG === 's-gauntlet' && G16[0] && G16[0].drawn && Math.abs(G16[0].ring[0] - tw - 12) <= 2 && named && /but Sequence/.test(txt[1] || '') && finish && /(Pro|Author) Key/.test(txt[3]) && /(Pro|Author) Chest/.test(txt[3])
        && !/\{|\[/.test(txt.join('')) && gEnd.done === 'done' && !gEnd.box)
        ? ok(`65.16 ${F.name}'s tutorial: its tile ringed on the map and tapped, then "${txt[1]}", "${txt[2]}", "${txt[3]}" — done once`)
        : bad(`65.16 the ${F.name} tutorial`, JSON.stringify({ txt, onG, ring: G16[0] && G16[0].ring, tw, gEnd }));
    }
    /* build 66 (65.11 / 65.1 / 65.5 / 65.9): EVERY TUTORIAL, WALKED WITH REAL TAPS, at 390×844 with a phone's insets and on an SE. Each box is measured
       — on the phone between its safe areas, never over its ring, no "[" left in it — and moved on the way a player would: a text box by a real tap on it,
       a MUST-TAP box by a real tap on the point of its ring that answers (ui/tutorial.js tutAim(): the top element there must be the thing the box lets
       through). A must-tap box with no such point, or a real tap on it that does not move the tutorial on, is a SOFT LOCK and FAILS the gate (65.11:
       Snow on Customise). And no screen changes after a tap on a text box (65.9) */
    {
      const PL = { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 1, keySeen: 1, keysSeen: 1, readySeen: {}, keyIntro: { clear: 1, pro: 1, author: 1 }, menuUnl: { about: 1, prog: 1, board: 1 } };
      const QR = { g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 20, misses: 0, row: 20, v: 4 };
      const TW = [
        { id: 'first', prefs: { story: 1, gridSeen: 1, snd: 'off' }, store: { intro: { 'quick-tap': 1, 'quick-tap:two': 1 } }, go: 's-pick', endOnGame: 1 },
        { id: 'over', prefs: { ...PL, tut: 1, played: 1, tutRun: { ...QR, got: ['quick-tap:two:15', 'quick-tap:four'] } }, store: { runs: [QR], unlock: { 'quick-tap:two:15': 1, 'quick-tap:four': 1 } } },
        { id: 'about', prefs: { ...PL, tuts: { about: 0 } }, go: 's-menu' },
        { id: 'prog', prefs: { ...PL, tuts: { prog: 0 } }, store: { unlock: { 'hold:grow': 1 } }, go: 's-menu' },
        { id: 'board', prefs: { ...PL, tuts: { board: 0 } }, store: { runs: [QR] }, go: 's-menu' },
        { id: 'games', prefs: { ...PL, tuts: { games: 0 }, chests: { games: 1 }, spill: { games: 1 } }, store: { unlock: Object.fromEntries((await page.evaluate(async () => (await import('./config/unlocks.js')).UNLOCKS.map(u => u.key))).map(k => [k, 1])) }, go: 's-pick' },
        { id: 'est', prefs: { ...PL, tuts: {} }, store: { unlock: { 'hold:grow': 1 } }, go: 's-pick', open: 'hold' },
        { id: 'mini', prefs: { ...PL, tuts: { mini: 0 }, chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } }, go: 's-pick' },
        { id: 'mega', prefs: { ...PL, tuts: { mega: 0 }, chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 } }, go: 's-pick' },
      ];
      const cdp = await page.createCDPSession(), out = [];
      for (const [w, h, top, bottom] of [[390, 844, 47, 34], [375, 667, 20, 0]]) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, bottom, left: 0, right: 0 } }); } catch (e) {}
        for (const T of TW) {
          await page.evaluate((T, si) => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify(Object.assign({ v: 7, prefs: T.prefs, runs: [], ach: {}, unlock: {}, intro: si, seen: {}, bars: {} }, T.store || {}))); }, T, SEEN_INTRO);
          await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
          if (T.go) await page.evaluate(async g => (await import('./ui/router.js')).show(g), T.go);
          if (T.open) { await sleep(900); await click(`.tile[data-game="${T.open}"]`); await sleep(400); if (!(await page.evaluate(() => document.getElementById('sheet').classList.contains('len')))) { await click('#diff-row .choice'); await sleep(400); } }
          const boxes = []; let idle = 0, why = '';
          for (let n = 0; n < 200 && boxes.length < 16; n++) {
            const st = await page.evaluate(async () => (await import('./ui/tutorial.js')).tutNow());
            if (!st || st.id !== T.id) break;
            if (!st.shown) { if (++idle > 60) { why = 'no box came at step ' + st.i; break; } await sleep(120); continue; }
            // measured once the box and its ring have stopped moving — a sheet still sliding up carries its ring with it
            idle = 0; let b = await box(); for (let k = 0; k < 12 && b; k++) { await sleep(250); const b2 = await box(); if (b2 && b2.top === b.top && b2.rt === b.rt) break; b = b2; } if (!b) continue;
            const m = await page.evaluate(() => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);width:1px'; document.body.appendChild(p); const r = p.getBoundingClientRect(); p.remove();
              const bx = document.querySelector('#tut .tbox').getBoundingClientRect(); return { safe: bx.top >= r.top - .5 && bx.bottom <= r.bottom + .5 && bx.left >= 0 && bx.right <= innerWidth, scr: document.querySelector('.screen.on')?.id }; });
            const rec = { i: st.i, tap: st.tap, t: b.text.slice(0, 28), covers: b.covers, safe: m.safe, marks: /\[|\]/.test(b.text) };
            let pt = null;
            if (st.tap) { pt = await page.evaluate(async () => (await import('./ui/tutorial.js')).tutAim()); if (!pt) { rec.lock = 'no point on the ring answers a tap'; boxes.push(rec); why = 'soft lock'; break; } }
            else pt = await page.evaluate(() => { const r = document.querySelector('#tut .tbox').getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; });
            await page.mouse.click(pt[0], pt[1]);
            let moved = false, after = null;
            for (let k = 0; k < 40 && !moved; k++) { await sleep(100); after = await page.evaluate(async () => ({ s: (await import('./ui/tutorial.js')).tutNow(), scr: document.querySelector('.screen.on')?.id, game: document.getElementById('game').classList.contains('on') }));
              moved = !after.s || after.s.id !== st.id || after.s.i !== st.i || (T.endOnGame && after.game); }
            rec.moved = moved; if (!st.tap && after && after.scr !== m.scr && !(T.endOnGame && after.game)) rec.nav = after.scr;
            boxes.push(rec); if (!moved) { why = st.tap ? 'soft lock: a real tap on the ring did not move it on' : 'a tap on a text box did not move it on'; break; }
            if (T.endOnGame && after.game) { await page.evaluate(async () => (await import('./run/run.js')).abort(true)); break; }
          }
          const done = await page.evaluate(id => { const v = (JSON.parse(localStorage.getItem('ne')).prefs.tuts || {})[id]; return v; }, T.id);
          out.push({ at: w + 'x' + h, id: T.id, n: boxes.length, why, done: T.id === 'first' || T.id === 'over' ? 'n/a' : done, bad: boxes.filter(b => b.covers || !b.safe || b.marks || b.lock || !b.moved || b.nav) });
        }
      }
      try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const fails = out.filter(o => o.bad.length || o.why || !o.n || (o.done !== 'n/a' && o.done !== 'done'));
      const taps = out.reduce((n, o) => n + o.n, 0);
      (!fails.length)
        ? ok(`65.11 / 65.1 / 65.5 / 65.9 every tutorial walked with real taps at 390×844 (47/34 insets) and on an SE: ${taps} boxes (${out.filter(o => o.at === '390x844').map(o => o.id + ' ' + o.n).join(', ')}) — every must-tap ring answers a real tap, no box over its ring or outside the safe areas, no "[" left, no screen change after a text box`)
        : bad('65.11 a tutorial soft-locks or misplaces a box', JSON.stringify(fails));
    }
    /* build 66.1: THE WELCOME PUT OFF ON THE MAIN MENU. Aiden on v0.66: Later on the Welcome (which now plays on the menu, 65.2) opened About without
       redrawing the menu, so About stayed crossed out and untappable while its tutorial rang it. Now: Later → About drawn open → its box rings it →
       a REAL tap on the ring opens About */
    {
      await page.evaluate(si => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 0, menuUnl: {}, tuts: { games: 'done', est: 'done', mini: 'done', mega: 'done', prog: 'done', board: 'done' } }, runs: [], ach: {}, unlock: { 'dots:blind': 1 }, intro: si, seen: {}, bars: {} })); }, SEEN_INTRO);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu'));
      let wl = false; for (let i = 0; i < 80 && !(wl = await page.evaluate(() => { const w = document.getElementById('welcome'); return !!w && !w.hidden; })); i++) await sleep(100);
      await sleep(400); await page.evaluate(() => document.querySelector('#welcome [data-act="wlater"]').click());
      let st = null; for (let i = 0; i < 150 && !((st = await page.evaluate(async () => (await import('./ui/tutorial.js')).tutNow())) || {}).shown; i++) await sleep(100);
      const aim = await page.evaluate(async () => (await import('./ui/tutorial.js')).tutAim()), dim = await page.evaluate(() => document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('dim'));
      if (aim) await page.mouse.click(aim[0], aim[1]); await sleep(600);
      const on661 = (await state()).screen;
      (wl && st && st.id === 'about' && st.shown && !dim && aim && on661 === 's-about')
        ? ok('66.1 the Welcome put off with Later on the main menu: About is drawn open at once, its box rings it, and a real tap on the ring opens About')
        : bad('66.1 the About soft lock', JSON.stringify({ wl, st, dim, aim, on661 }));
    }
    /* build 66 (65.19): COLOUR MARKS. Every line of tutorial copy (section C writes them with [green] / [yellow] / [red]) renders with no "[" left in
       it, and each mark is drawn in the game's own colour — green --ok, yellow --tut, red the game's red */
    {
      const M = await page.evaluate(async () => { const C = (await import('./config/copy.js')).TUTORIAL, { marks } = await import('./core.js'), lines = [];
        const walk = v => { if (typeof v === 'string') lines.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(C);
        const d = document.createElement('div'); document.body.appendChild(d); const left = [];
        for (const s of lines) { d.innerHTML = marks(s); if (/\[|\]/.test(d.textContent)) left.push(d.textContent); }
        d.innerHTML = marks('[green]a[/green][yellow]b[/yellow][red]c[/red] [/green]d');
        const col = [...d.querySelectorAll('span')].map(x => getComputedStyle(x).color), txt = d.textContent; d.remove();
        const cs = getComputedStyle(document.documentElement), probe = v => { const p = document.createElement('i'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
        return { n: lines.length, marked: lines.filter(s => /\[(green|yellow|red)\]/.test(s)).length, left, col, txt, want: [probe(cs.getPropertyValue('--ok').trim()), probe(cs.getPropertyValue('--tut').trim()), probe('#E0453B')] }; });
      (M.n > 40 && !M.left.length && M.txt === 'abc d' && M.col.join('|') === M.want.join('|'))
        ? ok(`65.19 colour marks: all ${M.n} lines of tutorial copy render with no "[" left (${M.marked} carry marks); green, yellow and red are the game's own; a stray closing mark is dropped`)
        : bad('65.19 colour marks', JSON.stringify(M));
    }
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
  }
}
