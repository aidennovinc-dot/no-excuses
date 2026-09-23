// build 61: part 5 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, ok, bad, root, read, strip, boot, at, page } from '../lib/gate.mjs';

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


  /* ---- 11. items 1 / 2: the title whoosh and the map's sounds, both tied to the animation's own timing ---- */
  {
    const menujs = strip(read('ui', 'screens', 'menu.js')), pickjs = strip(read('ui', 'screens', 'pick.js'));
    const offAnim = /getComputedTiming\(\)\.delay/.test(menujs) && /getComputedTiming\(\)\.delay/.test(pickjs) && !/4600|3300|1900/.test(menujs);
    // the title: four beats, four sounds, at the delays the stylesheet itself carries
    await boot({ story: 0 }, { unlock: ALL46 });
    const title = await page.evaluate(async () => { const A = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = []; const o = A.Snd.titleFx; A.Snd.titleFx = function (k) { fired.push([k, Math.round(performance.now())]); return o.apply(this, arguments); };
      const R = await import('./ui/router.js'); const t0 = performance.now(); R.show('s-menu', { story: 1 }); await wait(5600);
      const want = ['#st1', '#s-menu .wmin', '#st2', '#storyhint'].map(s => { const el = document.querySelector(s), a = el && el.getAnimations()[0];
        return a ? Math.round(a.effect.getComputedTiming().delay) : -1; });
      A.Snd.titleFx = o; return { fired: fired.map(([k, t]) => [k, Math.round(t - t0)]), want }; });
    const kinds = title.fired.map(f => f[0]).join();   // build 57 (57.1): the fourth beat is `begin` now, not a third `line`
    const onTime = title.fired.length === 4 && title.fired.every((f, i) => Math.abs(f[1] - title.want[i]) < 400);
    // the map: one sound per tile on the FIRST open only, off each tile's own animation delay, a locked one lower and muted
    // AMENDED at build 49 (§B1): a game ARRIVING on the map now plays its sound, so the fixture seeds Quick Tap as seen - which Fresh game's seedSeen does for a real new profile
    await boot({ gridSeen: 0 }, { unlock: { 'quick-tap:four': NOW46 }, seen: { 'game:quick-tap': 1, 'mode:quick-tap:two': 1, 'mode:quick-tap:four': 1 } });
    const map = await page.evaluate(async () => { const A = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = []; const o = A.Snd.mapFx; A.Snd.mapFx = function (g, lk) { fired.push([g, !!lk]); return o.apply(this, arguments); };
      /* AMENDED at build 49 (v26 items 2 / 13): the first open is drawn out to about 7 seconds.
         AMENDED at build 51 (v27 item 2 / R1): and the two Gauntlets are NOT in it - a new profile has opened no chest, so neither tile exists
         and neither takes a beat. Eleven sounds, not thirteen. */
      const R = await import('./ui/router.js'); R.show('s-pick'); await wait(7600);
      const first = fired.slice(); fired.length = 0;
      R.show('s-menu'); await wait(200); R.show('s-pick'); await wait(1800);
      A.Snd.mapFx = o; return { first, again: fired.slice() }; });
    const locked = map.first.filter(f => f[1]).length, open = map.first.filter(f => !f[1]).length;
    // AMENDED AT BUILD 57 (v29 Section A, 57.1): the fourth beat has a sound of its OWN, `begin`, pitched above the three that fall
    (offAnim && kinds === 'line,title,line,begin' && onTime && map.first.length === 11 && open >= 2 && locked >= 6 && !map.again.length)
      ? ok(`items 1 / 2 the title plays its impact under each line, the title line heavier (${kinds}), each scheduled off that line's own CSS animation delay (${title.want.join('/')}ms); the map's first open plays ${map.first.length} sounds - ${open} open tiles, ${locked} locked ones lower and muted, and the chests - each off its own tile's animation, and the second visit is silent`)
      : bad('items 1 / 2 the title and map sounds', JSON.stringify({ offAnim, title, map }));
  }

}
