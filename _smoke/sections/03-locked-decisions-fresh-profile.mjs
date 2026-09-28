// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, at, sawStory, page, click, stepQuickTap } from '../lib/gate.mjs';

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
    // the lines as the config makes them: the Dots rule (never a typed 35), Quick Tap's lengths and their seconds
    const X = await page.evaluate(async () => { const U = (await import('./config/unlocks.js')).UNLOCKS, R = await import('./games/registry.js'), G = await import('./config/games.js');
      const d = R.GAMES.dots.modes[0], need = U.find(u => u.key === 'dots:' + d).need, m = R.GAMES['quick-tap'].modes[0], lens = R.GC('quick-tap', m).lens, names = lens.map(s => R.lenName('quick-tap', s, m));
      return { need, m, lens, names, game: R.GAMES['quick-tap'].name + ' · ' + G.MODE_NAME[m] }; });
    const and = a => a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1], count = X.need.match(/^\d+\s+\S+/)[0];
    const want = C.steps.map(s => s.replace('{need}', X.need.replace(/\bany\b/, 'a')).replace('{count}', count).replace('{secs}', X.lens[0]).replace('{first}', X.names[0])
      .replace('{names}', and(X.names)).replace('{all}', and(X.lens.map(String))).replace('{game}', X.game));
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
    // box 12 → Sprint: the run starts with no box for Go — and with no Exit and no Restart (62.10)
    await click(`#time-row .tbtn[data-time="${X.lens[0]}"]`);
    for (let i = 0; i < 60 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
    const first = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), exit: getComputedStyle(document.getElementById('quit')).display, restart: getComputedStyle(document.getElementById('restart')).display, tut: JSON.parse(localStorage.getItem('ne')).prefs.tut }));
    for (let i = 0; i < 200 && (await page.evaluate(() => document.getElementById('game').classList.contains('on'))); i++) { await stepQuickTap(); await sleep(60); }
    const rec = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ne')).prefs; return { tut: p.tut, run: !!p.tutRun && p.tutRun.g }; });
    const r1 = await waitText(C.over[0], 200);
    // 62.10: the app closed half way through the result — reopened, it lands back on that result, box one
    await anywhere(); await waitText(C.over[1]);
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const back = await waitText(C.over[0], 200), backOn = (await state()).screen;
    (first.game && first.exit === 'none' && first.restart === 'none' && first.tut !== 1 && rec.tut === 1 && rec.run === 'quick-tap' && r1 && back && back.text === C.over[0] && backOn === 's-over')
      ? ok('62.10 the first run has no Exit and no Restart; once it is on record, an app reopened before "Good luck!" lands on its result and starts the eight boxes again')
      : bad('62.10 the first run and the resume', JSON.stringify({ first, rec, r1: r1 && r1.text, back: back && back.text, backOn }));
    // 62.11: the eight, each moved on by any tap — a tap on TRY AGAIN (ringed) or BACK (arrowed) does neither thing
    const over = [back];
    await click('#again'); over.push(await waitText(C.over[1]));
    await click('#again'); over.push(await waitText(C.over[2]));
    await click('#over-back'); over.push(await waitText(C.over[3]));
    for (let i = 4; i < 8; i++) { await click('#over-back'); over.push(await waitText(C.over[i])); }
    const still = await state();
    const rings = await page.evaluate(() => ({ again: document.getElementById('again').getBoundingClientRect().width, back: document.getElementById('over-back').getBoundingClientRect() }));
    (over.every((b, i) => b && b.text === C.over[i]) && over[1].drawn && Math.abs(over[1].ring[0] - rings.again - 12) <= 2 && over[2].drawn && over[3].arrow && !over[3].drawn && !over[0].drawn && still.screen === 's-over' && !still.game
      && over.every(b => Math.abs(b.centre[1]) <= 2 && !b.covers))
      ? ok('62.11 the eight boxes on the first result in order, centred: TRY AGAIN ringed, the longer length ringed, an arrow at BACK — and tapping either does nothing until the last box')
      : bad('62.11 the result boxes', JSON.stringify({ over: over.map(b => b && { t: b.text, drawn: b.drawn, ring: b.ring, arrow: b.arrow, c: b.centre, covers: b.covers }), still, rings }));
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
    (done.tut === 2 && !done.tutRun && done.rails && done.hidden && second.game && second.exit !== 'none' && second.restart !== 'none' && !menu['s-board'] && !menu['s-prog'] && !menu['s-about']
      && row.done && row.text.includes(row.name) && row.text.includes('Unlocks ' + row.gives) && !row.key && row.gold)
      ? ok(`62.14 "Good luck!" banks ${row.name} (gold, "Unlocks ${row.gives}", no key) and the walkthrough ends; Scores, Progress and About open on the menu; the second run has Exit and Restart back`)
      : bad('62.14 the end of the walkthrough', JSON.stringify({ done, second, menu, row, gold }));
    /* 62.14: what locks them — a profile that has not finished it has Scores, Progress and About crossed out; one from before build 64 that has
       played and never met the walkthrough keeps them open */
    const menuOf = async prefs => { await page.evaluate(p => { localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: Object.assign({ story: 1, gridSeen: 1, menuSeen: 1, snd: 'off' }, p), runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} })); }, prefs);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); return page.evaluate(() => ['s-board', 's-prog', 's-about'].map(g => document.querySelector(`#s-menu .item[data-go="${g}"]`).classList.contains('dim'))); };
    const fresh = await menuOf({}), legacy = await menuOf({ played: 1 });
    (fresh.every(Boolean) && legacy.every(x => !x))
      ? ok('62.14 before the walkthrough is finished Scores, Progress and About are crossed out; a profile that played before build 64 keeps them open')
      : bad('62.14 what locks the three items', JSON.stringify({ fresh, legacy }));
    // build 64 (62.5): Replay lives in the Testing menu and nowhere in Customise; it lands on the games menu at box one
    const where = await page.evaluate(() => ({ testing: !!document.querySelector('#s-testing #tut-replay'), custom: !!document.querySelector('#s-custom [data-act="tut-replay"]') }));
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.prefs.played = 1; S.save(); (await import('./ui/router.js')).show('s-testing'); }); await sleep(200);
    await click('#tut-replay'); await sleep(300);
    const again = await waitText(want[0]), on = (await state()).screen;
    (where.testing && !where.custom && again && again.text === want[0] && on === 's-pick')
      ? ok('62.5 Replay tutorial is in the Testing menu, gone from Customise, and lands on the games menu with the walkthrough at box one whatever has been played')
      : bad('62.5 replay', JSON.stringify({ where, again, on }));
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
  }
}
