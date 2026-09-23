
// ---- 1. cold start: intro plays, then the menu ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, sleep, ok, bad, at, sawStory, setCold, page, onScreen } from '../lib/gate.mjs';

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
  for (let i = 0; i < 8 && (await storyOn()); i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
  await sleep(600);
  at = await onScreen();
  at === 's-menu' ? ok('the title sequence leads to the menu') : bad('the title sequence leads to the menu', 'on ' + at);
  const titleAfter = await page.evaluate(() => { const w = document.getElementById('wordmark'); if (!w) return null; const r = document.querySelector('.titlewrap').getBoundingClientRect(); return { probe: w.dataset.probe === 'ne', n: document.querySelectorAll('#s-menu .wordmark').length, x: Math.round(r.left), y: Math.round(r.top), t: w.textContent }; });
  (titleBefore && titleAfter && titleAfter.probe && titleBefore.n === 1 && titleAfter.n === 1 && titleAfter.x === titleBefore.x && titleAfter.y === titleBefore.y && titleAfter.t === titleBefore.t)
    ? ok('1.2 NO EXCUSES is the same node, in the same place, before and after the menu builds')
    : bad('1.2 NO EXCUSES never moves or re-renders between the title and the menu', JSON.stringify({ titleBefore, titleAfter }));
  setCold(at, sawStory);
}
