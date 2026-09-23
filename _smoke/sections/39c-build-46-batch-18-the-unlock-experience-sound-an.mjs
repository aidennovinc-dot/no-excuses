// build 61: part 3 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, ok, bad, finished, root, read, strip, boot, at, page, click, revealReady, revealDone, ONLY } from '../lib/gate.mjs';

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



  /* ---- 6. items 11 / 22: FIRST TIME ONLY, and a Testing chest reset makes it a first time again ---- */
  {
    await boot({ chests: { games: 1 } }, { unlock: ALL46, bars: tier46('clear') });
    await show46('s-key', { tier: 0 }); await revealReady(); await revealDone(); await sleep(500);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.revealed);
    await show46('s-menu'); await sleep(200); await show46('s-key', { tier: 0 }); await sleep(1400);
    const again = await page.evaluate(() => ({ on: !document.getElementById('key-cere').hidden, krev: document.getElementById('s-key').classList.contains('kearning'), kdone: document.getElementById('s-key').classList.contains('kdone') }));
    // Testing's per-chest reset gives the key back its first time (item 11: "which on this phone counts as a first time again")
    const reset = await page.evaluate(async () => { const K = await import('./progress/key.js'); K.devChestReset('key');
      return JSON.parse(localStorage.getItem('ne')).prefs.revealed; });
    (stored['key:clear'] === 1 && !again.on && !again.krev && again.kdone && !reset['key:clear'])
      ? ok('items 11 / 22 the reveal plays once: it is written to prefs.revealed as it starts, a second visit goes straight to the finished key with no animation, and Testing\'s per-chest reset clears that key\'s flag so it is a first time again')
      : bad('item 11 first time only', JSON.stringify({ stored, again, reset }));
  }

  /* ---- 7. item 11: Reduce Motion gives a short fade, and still reaches the card ---- */
  {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await boot({ chests: { games: 1 } }, { unlock: ALL46, bars: tier46('clear') });
    const t0 = Date.now();
    /* AMENDED at build 51 (v27 item 14): the read was at 250ms, and the animation is scheduled 260ms after the screen draws - so it landed inside
       the frame between the reveal starting and its immediate settle, and caught `kearning` still on. 450ms is clear of it either way. */
    await show46('s-key', { tier: 0 }); await sleep(450);
    // the reveal's own `quick` class is what says it took the short path; `kearnquick` on the screen is gone already, because under Reduce Motion the settle is immediate
    const quick = await page.evaluate(() => ({ cls: document.getElementById('key-cere').className, settled: document.getElementById('s-key').classList.contains('kdone') && !document.getElementById('s-key').classList.contains('kearning') }));
    const st = await revealReady(); const took = Date.now() - t0;
    // AMENDED at build 48 (v26 item 11): a key's reveal has no card any more - under Reduce Motion it is the short fade, and it ends by itself on the key
    const card = await revState();
    await revealDone(); await sleep(300);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    (/\bquick\b/.test(quick.cls) && quick.settled && st === 'off' && took < KY46.KEY_EARN.clear.ms && !card.card)
      ? ok(`item 11 with Reduce Motion the earned animation is a short fade - ${took}ms against the ${KY46.KEY_EARN.clear.ms}ms animation - and it ends by itself with no card (v26 item 11), so nothing is skipped, only shortened (Apple expects it)`)
      : bad('item 11 Reduce Motion', JSON.stringify({ quick, st, took, card }));
  }

  /* ---- 8. item 13: an unfinished key and a finished one, all three keys ---- */
  {
    const seen = [];
    for (const [tier, tab, chests] of [['clear', 0, { games: 1 }], ['pro', 1, { games: 1, key: 1 }], ['author', 2, { games: 1, key: 1, pro: 1 }]]) {
      const under = tier === 'clear' ? {} : tier === 'pro' ? tier46('clear') : tier46('clear', 'pro');
      for (const [label, bars, done] of [['unfinished', under, false], ['finished', Object.assign({}, under, tier46(tier)), true]]) {
        // `revealed` already set, so the finished one is simply the settled state and not the reveal
        await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars });
        await show46('s-key', { tier: tab }); await sleep(900);
        seen.push(Object.assign({ tier, label, done }, await page.evaluate(() => { const el = document.getElementById('s-key'), gl = document.querySelector('#key-ring .kglyph'), gr = document.querySelector('#key-ring .kground'), kk = document.querySelector('.kkey.sel');
          const cs = getComputedStyle(gl);
          return { kdone: el.classList.contains('kdone'), ring: !!document.querySelector('#key-ring .kring'), scale: cs.scale, filter: cs.filter, anim: cs.animationName,
            stroke: cs.stroke, ground: gr ? +getComputedStyle(gr).opacity : 0, card: kk ? getComputedStyle(kk.querySelector('.kgl path')).animationName : '',
            dim: getComputedStyle(el).getPropertyValue('--kdim').trim(), tint: getComputedStyle(el).getPropertyValue('--ktint').trim() }; })));
      }
    }
    const un = seen.filter(s => !s.done), fin = seen.filter(s => s.done);
    const badUn = un.filter(s => s.kdone || s.ring || s.filter !== 'none' || s.anim !== 'none' || s.scale !== 'none' || s.ground > 0);
    const badFin = fin.filter(s => !s.kdone || !s.ring || s.filter === 'none' || s.anim !== 'kbreathe' || s.card !== 'kbreathe' || !(+s.scale > 1));
    const steps = KY46.KEY_FINISH.clear.glow < KY46.KEY_FINISH.pro.glow && KY46.KEY_FINISH.pro.glow < KY46.KEY_FINISH.author.glow;
    (!badUn.length && !badFin.length && steps)
      ? ok(`item 13 the two states are pushed apart on all three keys: unfinished has no glow at all - no ground, no drop shadow, no pulse, the centre key in the tier's own dim and no outer ring - and finished is ${fin.map(s => s.tier + ' × ' + s.scale).join(', ')}, full tint, a ${KY46.KEY_FINISH.clear.pulse}ms breathing pulse on the key and on its card at the top, the ring drawn, each tier a step brighter`)
      : bad('item 13 unfinished against finished', JSON.stringify({ badUn, badFin, steps }));
  }

  /* ---- 9. item 7: a symbol beside every chest unlock on the map - the same one that pops out ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, spill: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    await click('[data-go="s-pick"]'); await sleep(900);
    const map = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const w = document.querySelector(`.chestwords[data-for="${id}"]`);
      return [id, [...w.querySelectorAll('.cw')].map(x => ({ w: x.dataset.w, sym: (x.querySelector('.sym') || {}).dataset && x.querySelector('.sym').dataset.sym, fits: (() => { const t = x.querySelector('.cwt'), b = x.getBoundingClientRect(); return t.scrollWidth <= t.clientWidth + 1 && b.right <= innerWidth; })() }))]; })));
    // AMENDED at build 49 (v26 item 5): each chest's list ends on its About video
    const wantSym = Object.fromEntries(Object.keys(map).map(id => [id, (CP46.CHEST_WORDS[id] || []).map(x => x.sym).concat('video')]));
    const bad7 = Object.keys(map).filter(id => map[id].map(x => x.sym).join() !== wantSym[id].join() || map[id].some(x => !x.sym || !x.fits) || !map[id].length);
    // and it is the SAME symbol the chest pops out — one drawer, one list, so they cannot drift (ui/chest.js symSvg / giftsOf)
    const one = /function symSvg/.test(strip(read('ui', 'chest.js'))) && !/SYMBOLS\[/.test(strip(read('ui', 'reveal.js')) + strip(read('ui', 'screens', 'pick.js')));
    (!bad7.length && one)
      ? ok(`item 7 every chest's unlock on the map carries its symbol beside the title - ${Object.keys(map).map(id => id + ' ' + map[id].map(x => x.sym).join('+')).join(' · ')} - each drawn by the one symSvg() the chest pop-out and the card use, and every word still fits its cell at 390px`)
      : bad('item 7 the map symbols', JSON.stringify({ bad7, one, map }));
  }
}
