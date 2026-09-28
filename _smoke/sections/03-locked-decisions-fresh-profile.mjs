// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, at, sawStory, page, click } from '../lib/gate.mjs';

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

  /* build 62 (61.3): THE FIRST-RUN WALKTHROUGH, walked on a profile with no runs: five steps in order, each ringed in yellow and under
     ~12 words, the tile step waiting for the tile itself, Go ending it; then the one tip on a locked mode after the first result, answered
     by the lock box and its rule; Replay from Customise brings it back and Skip ends it for good */
  {
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, snd: 'off' }, runs: [], ach: {}, unlock: {}, intro: { 'quick-tap': 1, 'quick-tap:two': 1 }, seen: {}, bars: {} })); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await click('[data-go="s-pick"]');
    const C = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL);
    const box = () => page.evaluate(() => { const t = document.getElementById('tut'); if (!t || t.hidden) return null; const r = t.querySelector('.tring').getBoundingClientRect();
      const b = t.querySelector('.tbox').getBoundingClientRect(), over = !(r.bottom <= b.top || r.top >= b.bottom);
      return { text: t.querySelector('p').textContent, next: t.classList.contains('text'), buttons: t.querySelectorAll('button').length, ring: [Math.round(r.width), Math.round(r.height)], col: getComputedStyle(t.querySelector('.tring')).borderTopColor, drawn: getComputedStyle(t.querySelector('.tring')).display !== 'none',
        centre: [Math.round(b.x + b.width / 2 - innerWidth / 2), Math.round(b.y + b.height / 2 - innerHeight / 2)], top: Math.round(b.top), covers: over && getComputedStyle(t.querySelector('.tring')).display !== 'none' }; });
    const waitText = async (want, n = 80) => { for (let i = 0; i < n; i++) { const b = await box(); if (b && b.text === want) return b; await sleep(100); } return await box(); };
    /* build 64 (62.3): a new profile's map drawing itself in — taps on a game, the ground and Back, before the first box, all do nothing:
       no sheet, no navigation, and the first box still arrives */
    {
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); s.prefs.gridSeen = 0; localStorage.setItem('ne', JSON.stringify(s)); });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await click('[data-go="s-pick"]'); await sleep(250);
      const early = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="quick-tap"]'), b = t.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        const drawing = t.getAnimations().some(a => a.playState === 'running'); hit.click(); document.getElementById('grid').click(); document.querySelector('#s-pick .back')?.click();
        return { drawing, box: !document.getElementById('tut') || document.getElementById('tut').hidden }; });
      await sleep(300);
      const mid = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, sheet: !document.getElementById('sheet').hidden }));
      const first = await waitText(C.steps[0], 120);
      (early.drawing && early.box && mid.screen === 's-pick' && !mid.sheet && first && first.text === C.steps[0])
        ? ok('62.3 taps on a game, the map and Back while the map is still drawing in do nothing — no sheet, no Back — and the first box still arrives')
        : bad('62.3 a tap during the games-menu intro', JSON.stringify({ early, mid, first }));
    }
    const seen = [];
    seen.push(await waitText(C.steps[0]));
    /* build 64 (62.4): with a box up, a tap on anything but what it asks for does nothing — here a game that is not the step's, the ground
       (which used to go Back) and Back itself, on the step that points at the list */
    const stray = await page.evaluate(() => { document.querySelector('.tile[data-game="dots"]').click(); document.getElementById('grid').click(); document.querySelector('#s-pick .back').click();
      return { screen: document.querySelector('.screen.on')?.id, sheet: !document.getElementById('sheet').hidden, lock: document.getElementById('lockwrap').classList.contains('on'), box: document.querySelector('#tut p').textContent }; });
    // build 64 (62.8): no Skip and no Next — a tap anywhere (here the far corner of the map, not the box) moves a text box on
    await page.evaluate(() => document.elementFromPoint(12, innerHeight - 12).click());
    const onTile = await waitText(C.steps[1]);
    const stray2 = await page.evaluate(() => { document.querySelector('.tile[data-game="dots"]').click(); return { sheet: !document.getElementById('sheet').hidden, lock: document.getElementById('lockwrap').classList.contains('on'), box: document.querySelector('#tut p').textContent }; });
    // (62.8 since: the first of those taps moves the text box on, and is spent there — the tile step then ignores the other two)
    (stray.screen === 's-pick' && !stray.sheet && !stray.lock && stray.box === C.steps[1] && !stray2.sheet && !stray2.lock && stray2.box === C.steps[1])
      ? ok('62.4 while a box is up, a tap on another game, the ground or Back does nothing — only what the box asks for (or the box) responds')
      : bad('62.4 only the step\'s target responds', JSON.stringify({ stray, stray2 }));
    // build 64 (62.6): the step about the whole list draws no outline; the step that wants one tile rings it
    (!seen[0].drawn && onTile && onTile.drawn && onTile.ring[0] > 0 && onTile.ring[0] < 200)
      ? ok(`62.6 no outline round the whole games list; the step that wants a tap rings its tile (${onTile.ring.join('×')})`)
      : bad('62.6 the list step\'s outline', JSON.stringify({ first: seen[0], onTile }));
    seen.push(onTile); await click('.tile[data-game="quick-tap"]');
    seen.push(await waitText(C.steps[2])); await page.evaluate(() => document.elementFromPoint(12, 60).click());
    seen.push(await waitText(C.steps[3])); await click('#tut .tbox p');
    // on a box that asks for a tap, a tap anywhere else does nothing: still step 5 after a tap on the map
    const held = await (async () => { await sleep(300); const b = await box(); await page.evaluate(() => document.elementFromPoint(12, 60).click()); await sleep(250); return { before: b && b.text, after: (await box() || {}).text }; })();
    await page.evaluate(() => document.querySelector('#diff-row .choice').click()); await sleep(450);
    seen.push(await waitText(C.steps[4]));
    // build 64 (62.7): every box is centred — within a pixel or two of the middle of the phone — at the same top, and never over its target
    (seen.every(b => b && Math.abs(b.centre[0]) <= 2 && Math.abs(b.centre[1]) <= 2 && b.top === seen[0].top && !b.covers))
      ? ok(`62.7 every box sits in the centre of the phone at the same spot (top ${seen[0].top}px) and none covers the thing it points at`)
      : bad('62.7 the centred box', JSON.stringify(seen.map(b => b && { t: b.text, c: b.centre, top: b.top, covers: b.covers })));
    const words = C.steps.map(s => s.split(/\s+/).filter(w => /\w/.test(w)).length);
    const walked = seen.every((b, i) => b && b.text === C.steps[i]) && seen[1].next === false && seen[4].next === false && seen[0].next && words.every(n => n <= 12);
    (seen.every(b => b && b.buttons === 0) && [C.pickFirst, C.steps[4]].includes(held.before) && held.after === held.before)
      ? ok('62.8 no Skip and no Next on any box; a text box moves on at a tap anywhere, and a box that asks for a tap ignores every other one')
      : bad('62.8 tap to advance', JSON.stringify({ buttons: seen.map(b => b && b.buttons), held }));
    await click('#go-btn'); await sleep(500);
    const after = await page.evaluate(() => ({ tut: JSON.parse(localStorage.getItem('ne')).prefs.tut, hidden: document.getElementById('tut').hidden, game: document.getElementById('game').classList.contains('on') }));
    (walked && after.tut === 1 && after.hidden && after.game)
      ? ok(`61.3 the walkthrough: ${C.steps.length} steps in order, each ${Math.max(...words)} words or fewer, ringed ${seen[0].col}; the tile step waits for the tile and Go ends it (tut 1)`)
      : bad('61.3 the walkthrough', JSON.stringify({ seen, words, after }));
    await click('#quit'); await sleep(400);
    const tip = await waitText(C.locked, 120);
    await page.evaluate(() => (document.querySelector('#over-chips2 .chip.locked') || document.querySelector('#over-chips .mch.locked')).click()); await sleep(400);
    const rule = await page.evaluate(() => ({ box: document.getElementById('lockwrap').classList.contains('on') || getComputedStyle(document.getElementById('lockwrap')).display !== 'none', text: document.getElementById('lock-text').textContent.trim(),
      tut: JSON.parse(localStorage.getItem('ne')).prefs.tut, hidden: document.getElementById('tut').hidden }));
    (tip && tip.text === C.locked && rule.box && /\d/.test(rule.text) && rule.tut === 2 && rule.hidden)
      ? ok(`61.3 after the first result one tip rings a locked mode; tapping it opens the lock box with its rule ("${rule.text.slice(0, 60)}") and the tutorial is done (tut 2)`)
      : bad('61.3 the locked-mode tip', JSON.stringify({ tip, rule }));
    await click('#lock-no'); await sleep(200);
    // build 64 (62.5): Replay lives in the Testing menu and nowhere in Customise
    const where = await page.evaluate(() => ({ testing: !!document.querySelector('#s-testing #tut-replay'), custom: !!document.querySelector('#s-custom [data-act="tut-replay"]') }));
    (where.testing && !where.custom) ? ok('62.5 Replay tutorial is in the Testing menu and gone from Customise') : bad('62.5 where Replay tutorial lives', JSON.stringify(where));
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-testing')); await sleep(200);
    await click('#tut-replay'); await sleep(300);
    const again = await waitText(C.steps[0]); const on = await page.evaluate(() => document.querySelector('.screen.on')?.id);
    (again && again.text === C.steps[0] && on === 's-pick')
      ? ok('61.3 / 62.5 Replay tutorial (Testing) lands on the games menu with the walkthrough back at step one, whatever has been played')
      : bad('61.3 / 62.5 replay', JSON.stringify({ again, on }));
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
  }
}
