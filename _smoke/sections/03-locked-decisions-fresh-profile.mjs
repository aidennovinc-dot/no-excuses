// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, at, sawStory, page, click } from '../lib/gate.mjs';

export const SECTION = ["locked decisions (fresh profile)"];

export async function run() {
  sawStory ? ok('L1 title sequence plays before the menu') : bad('L1 title sequence plays before the menu');
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
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off' }, runs: [], ach: {}, unlock: {}, intro: { 'quick-tap': 1, 'quick-tap:two': 1 }, seen: {}, bars: {} })); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await click('[data-go="s-pick"]');
    const C = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL);
    const box = () => page.evaluate(() => { const t = document.getElementById('tut'); if (!t || t.hidden) return null; const r = t.querySelector('.tring').getBoundingClientRect();
      return { text: t.querySelector('p').textContent, next: !t.querySelector('.tnext').hidden, ring: [Math.round(r.width), Math.round(r.height)], col: getComputedStyle(t.querySelector('.tring')).borderTopColor }; });
    const waitText = async (want, n = 80) => { for (let i = 0; i < n; i++) { const b = await box(); if (b && b.text === want) return b; await sleep(100); } return await box(); };
    const seen = [];
    seen.push(await waitText(C.steps[0])); await click('#tut .tnext');
    seen.push(await waitText(C.steps[1])); await click('.tile[data-game="quick-tap"]');
    seen.push(await waitText(C.steps[2])); await click('#tut .tnext');
    seen.push(await waitText(C.steps[3])); await click('#tut .tnext');
    await page.evaluate(() => document.querySelector('#diff-row .choice').click()); await sleep(450);
    seen.push(await waitText(C.steps[4]));
    const words = C.steps.map(s => s.split(/\s+/).filter(w => /\w/.test(w)).length);
    const walked = seen.every((b, i) => b && b.text === C.steps[i]) && seen[1].next === false && seen[4].next === false && seen[0].next && words.every(n => n <= 12);
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
    await click('#tut-replay'); await sleep(300);
    const again = await waitText(C.steps[0]); await click('#tut .tskip'); await sleep(250);
    const skipped = await page.evaluate(() => ({ tut: JSON.parse(localStorage.getItem('ne')).prefs.tut, hidden: document.getElementById('tut').hidden }));
    (again && again.text === C.steps[0] && skipped.tut === 2 && skipped.hidden)
      ? ok('61.3 Replay tutorial (Customise) brings it back from step one, whatever has been played, and Skip ends it for good')
      : bad('61.3 replay and skip', JSON.stringify({ again, skipped }));
  }
}
