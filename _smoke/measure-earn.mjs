/* No Excuses — a one-off measurement for v29 Section A item 57.7 (build 57): where the dead wait after a key is earned
   actually is. Not part of the gate; run it by hand:  node _smoke/measure-earn.mjs
   Per tier it prints: every animation the earn beat puts up with its end time, the last MOVEMENT, the music's own length,
   when the reveal lets go, and the gap between the two — which is the number item 57.7 is about. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from './server.mjs';
import { launch, phonePage } from './chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
const A = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// the earn track's own length: the last note's start plus how long it rings
const musicMs = tier => { const n = (A.KEY_EARN_FX[tier] || {}).notes || [];
  return Math.round(Math.max(...n.map(x => x[0] * 1000 + x[2]))); };

const srv = await serve();
const browser = await launch();
const page = await phonePage(browser);
page.on('pageerror', e => console.log('  PAGE ERROR ' + e.message));
await page.goto(srv.base + '/index.html', { waitUntil: 'networkidle0' });

const BARS = {};   // every bar cleared, so every key is whole
const CH = { games: 1, key: 1, pro: 1, thorns: 1 };
const PLAIN = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: {}, readySeen: {} };

for (const [i, tier] of ['clear', 'pro', 'author'].entries()) {
  // a profile with every bar cleared and no reveal seen, so this tier's earn is due the moment its screen opens
  await page.evaluate((plain, chests) => {
    localStorage.setItem('ne', JSON.stringify({ v: 6, prefs: Object.assign({}, plain, { chests }), runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} }));
  }, PLAIN, CH);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  const out = await page.evaluate(async (ti, tier) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const KB = await import('./config/key-bars.js'); const S = await import('./core/store.js'); const P = await import('./progress/key.js');
    const R = await import('./ui/router.js'); const E = await import('./core/events.js');
    // clear every bar of every tier, so all three keys are whole
    const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1;
    S.store.bars = bars; S.prefs.revealed = {}; S.prefs.keyWhole = {}; S.save();
    const log = [];
    const t0 = performance.now();
    R.show('s-key', { tier: ti });
    // the reveal starts 260ms after the screen draws; sample the animations just after it does
    await wait(520);
    const el = document.getElementById('s-key');
    const anims = document.getAnimations().filter(a => { const tg = a.effect && a.effect.target, tm = a.effect && a.effect.getComputedTiming();
      return tg && el.contains(tg) && !tg.closest('#key-cere') && tm && Number.isFinite(tm.endTime); });
    const rows = anims.map(a => { const tm = a.effect.getComputedTiming(), tg = a.effect.target;
      return { name: a.animationName || a.transitionProperty || 'transition', on: (tg.id || tg.getAttribute('class') || tg.tagName || '').slice(0, 40),
        delay: Math.round(tm.delay || 0), ms: Math.round(+tm.duration || 0), end: Math.round(tm.endTime || 0), state: a.playState }; });
    // and watch for the reveal letting go: #key-cere goes hidden
    const host = document.getElementById('key-cere');
    const start = performance.now();
    let endAt = null;
    for (let i = 0; i < 300; i++) { if (host.hidden) { endAt = Math.round(performance.now() - start + 520); break; } await wait(60); }
    return { rows, endAt, earnOn: el.classList.contains('kearning'), hint: (document.getElementById('key-hint') || {}).textContent };
  }, i, tier);

  const cfg = K.KEY_EARN[tier];
  const move = Math.max(...cfg.steps.filter(s => s.name !== K.EARN_GLOW).map(s => s.at + s.ms));
  const assembly = Math.max(...cfg.steps.filter(s => !['rise', 'land', K.EARN_GLOW].includes(s.name)).map(s => s.at + s.ms));
  const longest = out.rows.length ? Math.max(...out.rows.map(r => r.end)) : 0;
  console.log(`\n=== ${tier} ===  config ms ${cfg.ms}   music ${musicMs(tier)}ms`);
  console.log(`  assembly (every step but rise/land/flash) ends ${assembly}ms · every step but flash ends ${move}ms`);
  console.log(`  longest animation the earn beat put up: ${longest}ms   (${out.rows.length} animations)`);
  const late = out.rows.filter(r => r.end > cfg.ms + 50).sort((a, b) => b.end - a.end).slice(0, 8);
  if (late.length) console.log('  ANIMATIONS THAT END AFTER config ms:\n' + late.map(r => `    ${r.end}ms  ${r.name} on ${r.on} (delay ${r.delay}, ${r.ms}ms)`).join('\n'));
  console.log(`  reveal let go at ~${out.endAt}ms after the screen drew  → gap after the assembly ≈ ${out.endAt === null ? '?' : out.endAt - 260 - assembly}ms`);
  console.log(`  hint now: "${(out.hint || '').trim()}"`);
}

await browser.close(); srv.close();
