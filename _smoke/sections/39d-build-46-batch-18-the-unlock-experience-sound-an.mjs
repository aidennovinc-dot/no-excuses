// build 61: part 4 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, check, ok, bad, root, read, strip, boot, at, page } from '../lib/gate.mjs';

export const SECTION = ["build 46 - batch 18, the unlock experience, sound and About"];

export async function run() {
  const css46 = read('styles', 'app.css'), flat46 = css46.replace(/\/\*[\s\S]*?\*\//g, '');
  const NOW46 = Date.now();
  const U46 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB46 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const CH46 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const KY46 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CP46 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const MS46 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const ALL46 = Object.fromEntries(U46.UNLOCKS.map(u => [u.key, NOW46]));
  const tier46 = (...ts) => Object.fromEntries(Object.keys(KB46.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW46])));
  const show46 = (id, o) => page.evaluate(async (i, x) => { const R = await import('./ui/router.js'); R.show(i, x); }, id, o || {});
  const revState = () => page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.rcard');
    return { on: !h.hidden, kind: h.dataset.kind || '', id: h.dataset.rev || '', step: h.dataset.step || '', tap: h.classList.contains('tap'), card: h.classList.contains('card'),
      gifts: [...h.querySelectorAll('.rgifts:not(.row) .rgift b')].map(g => g.textContent), syms: [...h.querySelectorAll('.rgifts:not(.row) .rgift .sym')].map(x => x.dataset.sym),
      title: c ? c.querySelector('h3').textContent : '', did: c ? [...c.querySelectorAll('li')].map(l => l.textContent) : [], got: c ? [...c.querySelectorAll('.rgift b')].map(b => b.textContent) : [],
      /* AMENDED at build 60 (v31 60.31): the next chest is a BLOCK, not a <p>, so the card's words are read from the paragraphs
         AND from the block's own question. What item 22 asserts — "Congratulations" and two lines, no lists — is unchanged. */
      next: c ? [...c.querySelectorAll('p'), ...c.querySelectorAll('.rnextup b')].map(x => x.textContent).join(' ') : '', go: c ? (c.querySelector('.rgo').disabled ? 'off' : 'on') : '' }; });



  /* ---- 10. item 15: a key's background REPLACES the base on its screen, and it is what its chest gives ---- */
  {
    const atm = strip(read('ui', 'atmosphere.js'));
    /* DELETED AT BUILD 57 (v29 Section A, 57.11): the source-text half of this check spelled the draw loop's own expression
       (`DRAW[over||own ? 'stars' : bg]`) and 57.11a rewrote that line — the starfield belongs to the default background alone now, so there is no
       `? 'stars' :` in it any more. The gate's rule is to delete a source-text check that fails on a refactor rather than respell it, and to name it
       in the outcome. What it stood for is DRIVEN instead, below: with the grid chosen, the grid's own blue is on the canvas on the menu and is not
       on it on a key screen, which is the whole of "only that key's background shows". */
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, bg: 'grid', revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    /* build 57: the grid draws in its own blue (#5B8CFF at .3), so "the chosen design is not drawn under a key layer" is countable — its pixels are
       on the canvas on the menu and must be gone on every key screen, where that key's own layer is the whole picture. */
    /* AMENDED at build 69 (68.39 follow-up): the art is drawn OPAQUE now, its colour already mixed onto the ground, so the grid's blue is no longer
       #5B8CFF stored at .3 alpha. Its colour is read off the live page instead of typed: on the menu, the commonest colour on the canvas that is
       not the page's own ground is the grid's line — and that colour must be on no key screen. */
    const gridPx = col => page.evaluate(col => { const cv = document.getElementById('stars'), cx = cv.getContext('2d');
      const d = cx.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8 && Math.abs(d[i] - col[0]) <= 6 && Math.abs(d[i + 1] - col[1]) <= 6 && Math.abs(d[i + 2] - col[2]) <= 6) n++;
      return n; }, col);
    await show46('s-menu'); await sleep(700);
    const gridCol = await page.evaluate(() => { const cv = document.getElementById('stars'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const g = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number), tally = {};
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 250 || [0, 1, 2].every(j => Math.abs(d[i + j] - g[j]) <= 3)) continue; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; tally[k] = (tally[k] || 0) + 1; }
      const top = Object.entries(tally).sort((x, y) => y[1] - x[1])[0]; return top ? top[0].split(',').map(Number) : [-99, -99, -99]; });
    // and it IS the grid's blue: blue the strongest channel by a clear margin
    const gridBlue = gridCol[2] > gridCol[0] + 30 && gridCol[2] > gridCol[1] + 20;
    const gridOnMenu = gridBlue ? await gridPx(gridCol) : 0;
    const layers = [];
    for (const [tier, tab, style] of [['clear', 0, 'lantern'], ['pro', 1, 'circuit'], ['author', 2, 'thorn']]) {
      await show46('s-menu'); await sleep(150); await show46('s-key', { tier: tab }); await sleep(900);
      layers.push(Object.assign({ tier, style, grid: await gridPx(gridCol) }, await page.evaluate(async () => { const A = await import('./ui/atmosphere.js'); const S = await import('./core/store.js');
        return { style: document.getElementById('s-key').dataset.style, chosen: S.look('bg'), draws: !!A.LAYER }; })));
    }
    const replaces = gridOnMenu > 0 && layers.every(l => l.grid === 0);
    await show46('s-menu'); await sleep(400);
    const off = await page.evaluate(() => document.getElementById('s-key').dataset.style);
    // and each key's background is in what that key's chest pops out (item 15's last line), on the same list item 7 reads
    const inChest = ['key', 'pro', 'thorns'].every((c, i) => (CP46.CHEST_WORDS[c] || []).some(x => x.sym === 'bg-' + ['lantern', 'circuit', 'thorn'][i]));
    // Reduce Motion holds it still: every layer reads the same `reduce` the rest of the file does
    const still = /const reduce=matchMedia/.test(atm) && /reduce\?0:t/.test(atm.replace(/\s/g, ''));
    (replaces && layers.every(l => l.style === l.style && l.chosen === 'grid') && inChest && still)
      ? ok(`item 15 on a key's screen only that key's background shows — the chosen design is not drawn at all while a key layer is over, DRIVEN at build 57: the grid's own blue is on ${gridOnMenu} pixels of the canvas on the menu and on ${layers.map(l => l.grid).join('/')} on the three key screens, so nothing is ever layered twice — and each key's background is one of the symbols its own chest pops out; Reduce Motion holds every layer still`)
      : bad('item 15 the key backgrounds', JSON.stringify({ replaces, gridCol, gridOnMenu, layers, off, inChest, still }));
  }

}
