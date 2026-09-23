// ---- 2. everything unlocked, so every pick sheet can be opened ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, ok, bad, at, page, onScreen, click, setStorage, OPEN_PREFS, up } from '../lib/gate.mjs';

export const SECTION = ["pick sheets (all unlocked)"];

export async function run() {
  await setStorage({ 'ne.prefs': { ...OPEN_PREFS, played: 0 } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await click('[data-go="s-pick"]'); await sleep(400);
  (await onScreen()) === 's-pick' ? ok('Play opens the grid') : bad('Play opens the grid');
  for (const g of GAMES) {
    await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(320);
    await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(420);
    const state = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, modes: document.querySelector('#diff-row').children.length, lens: document.querySelector('#time-row').children.length, title: document.querySelector('#sheet-title').textContent.trim() }));
    (state.screen === 's-pick' && state.modes > 0 && state.lens > 0) ? ok(`${g} sheet — ${state.modes} mode(s), ${state.lens} length(s) · "${state.title}"`) : bad(`${g} sheet`, JSON.stringify(state));
    await click('#grid'); await sleep(200);
  }
  // the other screens open and render
  // AMENDED at build 39 (v23 L.4a): s-custom is back — Customise is its own menu row again (a tab of s-prog from build 33 to 38)
  for (const s of ['s-board', 's-prog', 's-custom', 's-key', 's-about', 's-testing']) { await click('.back'); await sleep(250); await click(`[data-go="${s}"]`); await sleep(600); (await onScreen()) === s ? ok(`${s} opens`) : bad(`${s} opens`, 'on ' + (await onScreen())); }

  /* ---- v28 item 14 (build 53): THE PICKER IS A BOTTOM SHEET, wherever the map is scrolled. It was absolute inside #s-pick, which is a scroller,
     so "the bottom" was the bottom of the map's content and the sheet landed mid-screen - which is what Aiden photographed with Spot tapped and
     the map scrolled to the chests. Driven from the BOTTOM of the map, which is the state that used to break it. ---- */
  {
    await click('.back'); await sleep(250); await click('[data-go="s-pick"]'); await sleep(500);
    const sheet14 = await page.evaluate(async () => { const sc = document.getElementById('s-pick');
      sc.scrollTop = sc.scrollHeight; await new Promise(r => setTimeout(r, 300));
      const at = sc.scrollTop;
      document.querySelector('.tile[data-game="spot"]').click(); await new Promise(r => setTimeout(r, 900));
      const sh = document.getElementById('sheet'), dim = document.getElementById('mapdim'), t = document.querySelector('.tile[data-game="spot"]');
      const r = sh.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const rows = [...sh.querySelectorAll('.choice, #time-row .chip')];
      return { pos: getComputedStyle(sh).position, bottom: Math.round(window.innerHeight - r.bottom), pinned: Math.abs(r.bottom - window.innerHeight) <= 1,
        dim: !dim.hidden && dim.classList.contains('on'), dimAct: dim.dataset.act,
        tileAbove: tr.bottom <= r.top + 2 && tr.top >= -2, scrolled: sc.scrollTop !== at,
        rowAnim: rows.filter(x => x.getAnimations().length).length,
        hint: [...document.querySelectorAll('#s-pick .hint')].map(x => x.textContent).join('|') }; });
    const closed = await page.evaluate(async () => { document.getElementById('mapdim').click(); await new Promise(r => setTimeout(r, 600));
      const sh = document.getElementById('sheet'); return { up: sh.classList.contains('up'), dim: document.getElementById('mapdim').classList.contains('on') }; });
    (sheet14.pos === 'fixed' && sheet14.pinned && sheet14.dim && sheet14.dimAct === 'sheetclose' && sheet14.tileAbove && !sheet14.rowAnim
      && !/empty space/.test(sheet14.hint) && !closed.up && !closed.dim)
      ? ok(`v28 item 14 the mode picker is a bottom sheet: with the map scrolled to the very bottom, tapping Spot pins the sheet to the screen's own bottom edge (${sheet14.pos}, ${sheet14.bottom}px from it), scrolls the map so the tile sits clear above it, dims the map behind, and a tap on the dim closes it - no per-row animation, and "tap empty space to go back" is gone`)
      : bad('v28 item 14 the bottom sheet', JSON.stringify({ sheet14, closed }));
  }
}
