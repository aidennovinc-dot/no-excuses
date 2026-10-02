
// ---- 1. cold start: intro plays, then the menu ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, sleep, ok, bad, at, sawStory, setCold, page, onScreen, until, TITLE_HINT, tapTitle } from '../lib/gate.mjs';

export const SECTION = ["cold start (empty storage)"];

export async function run() {
  let at, sawStory;   // build 61: set here, handed to locked decisions through setCold
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  at = await onScreen();
  const storyOn = () => page.evaluate(() => !!document.querySelector('#s-menu.story'));
  sawStory = at === 's-menu' && (await storyOn());
  sawStory ? ok('the title sequence shows') : bad('the title sequence shows', 'on ' + at);
  // v14 (1.2): mark the title node and the box it sits in, so the same node in the same place can be proved after the menu builds
  const titleBefore = await page.evaluate(() => { const w = document.getElementById('wordmark'); if (!w) return null; w.dataset.probe = 'ne'; const r = document.querySelector('.titlewrap').getBoundingClientRect(); return { n: document.querySelectorAll('#s-menu .wordmark').length, x: Math.round(r.left), y: Math.round(r.top), t: w.textContent }; });
  await tapTitle();
  await sleep(600);
  at = await onScreen();
  at === 's-menu' ? ok('the title sequence leads to the menu') : bad('the title sequence leads to the menu', 'on ' + at);
  const titleAfter = await page.evaluate(() => { const w = document.getElementById('wordmark'); if (!w) return null; const r = document.querySelector('.titlewrap').getBoundingClientRect(); return { probe: w.dataset.probe === 'ne', n: document.querySelectorAll('#s-menu .wordmark').length, x: Math.round(r.left), y: Math.round(r.top), t: w.textContent }; });
  (titleBefore && titleAfter && titleAfter.probe && titleBefore.n === 1 && titleAfter.n === 1 && titleAfter.x === titleBefore.x && titleAfter.y === titleBefore.y && titleAfter.t === titleBefore.t)
    ? ok('1.2 NO EXCUSES is the same node, in the same place, before and after the menu builds')
    : bad('1.2 NO EXCUSES never moves or re-renders between the title and the menu', JSON.stringify({ titleBefore, titleAfter }));
  /* build 69 (68.13, L27): THE TITLE IGNORES EVERY TAP UNTIL "TAP TO BEGIN" HAS STARTED TO APPEAR. Aiden tapped through with the three lines on
     screen and the hint not yet shown. From this new profile: a real tap 1s and 3s into the sequence (on the hint's own clock) leaves the title up,
     on the menu screen, with no menu item under any point a tap could land; a tap once the hint has begun goes through to the menu */
  {
    // the tap is dispatched in the page at the moment the hint's own clock passes `ms`, where a phone's tap would land, and that moment is recorded
    const tapAt = ms => page.evaluate(async ms => { const a = document.getElementById('storyhint').getAnimations()[0];
      while (a && (a.effect.getComputedTiming().localTime || 0) < ms) await new Promise(r => requestAnimationFrame(r));
      const t = a ? Math.round(a.effect.getComputedTiming().localTime) : null, e = document.elementFromPoint(195, 520) || document.body;
      e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 195, clientY: 520 })); await new Promise(r => setTimeout(r, 400)); return t; }, ms);
    const probe = () => page.evaluate(() => { const items = [...document.querySelectorAll('#s-menu .item, #s-menu .menu-key, #s-menu .nextup')];
      const hit = items.filter(i => { const r = i.getBoundingClientRect(); if (!r.width) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && i.contains(e); }).map(i => i.dataset.go || i.className);
      const a = document.getElementById('storyhint').getAnimations()[0], t = a ? a.effect.getComputedTiming() : null;
      return { story: !!document.querySelector('#s-menu.story'), on: document.querySelector('.screen.on')?.id, hit, delay: t ? t.delay : null }; });
    // a new profile again, from its first frame: the sequence is caught 1s and 3s in, which the checks above have already spent
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'domcontentloaded' }); await until(() => !!document.querySelector('#s-menu.story.run'), null, 10000);
    const taps = [];
    for (const ms of [1000, 3000]) { const hintAt = await tapAt(ms); taps.push({ ms, hintAt, ...(await probe()) }); }
    await until(TITLE_HINT); await page.mouse.click(195, 520); await until(() => !document.querySelector('#s-menu.story'), null, 10000).catch(() => {});
    const after = await probe();
    (taps.every(x => x.story && x.on === 's-menu' && !x.hit.length && x.hintAt < x.delay) && !after.story && after.on === 's-menu')
      ? ok(`L27 / 68.13 the title ignores every tap until "Tap to begin" has started to appear: taps ${taps.map(x => x.hintAt + 'ms').join(' and ')} in (the hint begins at ${taps[0].delay}ms, read off its own animation) left the title up with no menu item reachable; a tap once it had begun went through to the menu`)
      : bad('L27 / 68.13 a tap before "Tap to begin"', JSON.stringify({ taps, after }));
  }
  setCold(at, sawStory);
}
