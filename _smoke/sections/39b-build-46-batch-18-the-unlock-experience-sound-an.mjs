// build 61: part 2 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, CLOCK, sleep, ok, bad, finished, root, read, boot, at, page, click, revealReady, revealDone } from '../lib/gate.mjs';

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



  /* ---- 5. item 11 AMENDED AT BUILD 51 (v27 item 14): the reveal that introduced the seven games one at a time over 4–6.6s and then ran the
     earn moment inside it is replaced by ONE animation per key of two seconds at most. What item 11 asked for that survives is held here: the
     seven spokes still arrive clockwise from Quick Tap at 12, each with its own game's sound, on the Skill key; each key still ends by itself
     in the finished state; and the three still escalate. What item 14 adds: the length, and that A TAP SKIPS IT. ---- */
  {
    const seen = [];
    for (const [tier, chests, bars, tab] of [['clear', { games: 1 }, tier46('clear'), 0], ['pro', { games: 1, key: 1 }, tier46('clear', 'pro'), 1], ['author', { games: 1, key: 1, pro: 1 }, tier46('clear', 'pro', 'author'), 2]]) {
      await boot({ chests }, { unlock: ALL46, bars });
      await page.evaluate(async () => { const A = await import('./audio.js'); window.__m46 = []; const o = A.Snd.mapFx; A.Snd.mapFx = function (g) { window.__m46.push(g); return o.apply(this, arguments); };
        window.__k46 = []; const k = A.Snd.keyEarn; A.Snd.keyEarn = function (t) { window.__k46.push(t); return k.apply(this, arguments); }; });
      await show46('s-key', { tier: tab }); await sleep(320);
      const t0 = Date.now();
      const start = await page.evaluate(() => ({ krev: document.getElementById('s-key').classList.contains('kearning'), rev: document.getElementById('s-key').dataset.earn || '',
        hours: [...document.querySelectorAll('#key-ring .kr')].map(g => g.style.getPropertyValue('--h')), games: [...document.querySelectorAll('#key-ring .kr')].map(g => g.dataset.rg),
        crk: document.querySelectorAll('#key-ring .kecrk').length, thn: document.querySelectorAll('#key-ring .kethn').length }));
      const st = await revealReady(); const took = Date.now() - t0;
      const heard = await page.evaluate(() => ({ map: window.__m46.slice(), earn: window.__k46.slice() }));
      const after = await page.evaluate(() => ({ kdone: document.getElementById('s-key').classList.contains('kdone'), krev: document.getElementById('s-key').classList.contains('kearning'),
        ring: !!document.querySelector('#key-ring .kring') }));
      seen.push({ tier, st, took, start, heard, after, cfg: KY46.KEY_EARN[tier] });
      await revealDone(); await sleep(300);
    }
    /* item 14: A TAP SKIPS TO THE END and the screen never locks.
       AMENDED AT BUILD 54 (v29 item 3): THE SKIP WAITS EARN_SKIP_AT MS FIRST. A tap inside that window does NOTHING — it is not taken, not
       queued, and the ceremony carries on — and a tap after it jumps straight to the finished state. Both halves are driven here, because the
       old drive tapped a third of the way through the Author key and a third of 4000ms is now inside the window. */
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    await show46('s-key', { tier: 2 });
    /* THE CLOCK IS THE CEREMONY'S, NOT show()'s. The screen's ARRIVAL plays first (`ARRIVE_MS`, and a due earn starts `EARN_AT` after the screen
       draws), so timing the taps off show() put the "late" tap ~1460ms into a 4000ms ceremony — still inside the window — and it correctly did
       nothing. Wait for `kearning` and measure from there. */
    for (let i = 0; i < 80; i++) { if (await page.evaluate(() => document.getElementById('s-key').classList.contains('kearning'))) break; await sleep(50); }
    const onAt54 = Date.now();
    const cereTap54 = () => page.evaluate(() => document.getElementById('key-cere').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    const early54At = Math.round(KY46.EARN_SKIP_AT * .4);
    await sleep(Math.max(0, early54At - (Date.now() - onAt54))); await cereTap54();
    const early54 = await page.evaluate(() => ({ on: document.getElementById('s-key').classList.contains('kearning'), cere: !document.getElementById('key-cere').hidden }));
    await sleep(Math.max(0, KY46.EARN_SKIP_AT + 250 - (Date.now() - onAt54)));
    await cereTap54();
    const skipSt = await revealReady(); const skipTook = Date.now() - onAt54;   // measured from the first frame of the ceremony
    const skipped = await page.evaluate(() => ({ kdone: document.getElementById('s-key').classList.contains('kdone'), on: document.getElementById('s-key').classList.contains('kearning'),
      cere: !document.getElementById('key-cere').hidden, ring: !!document.querySelector('#key-ring .kring') }));
    await revealDone(); await sleep(300);
    const order = GAMES.join();
    const bad11 = seen.filter(s => s.st !== 'off' || !s.start.krev || s.start.rev !== s.tier || s.start.hours.join() !== '0,1,2,3,4,5,6' || s.start.games.join() !== order
      || s.heard.earn.join() !== s.tier || !s.after.kdone || s.after.krev || !s.after.ring
      || s.took < s.cfg.ms - 400 || s.took > s.cfg.ms + 1600);
    /* AMENDED AT BUILD 52 (Aiden's answer to build 51): the PRO key's spokes fire one by one as well now — "one by one around like a clock" —
       so it walks the seven games' own sounds exactly as the Skill key does, with its own current between each pair on top. The Author key has
       no spokes at all, so it still plays none of them. A key that walks its spokes is one whose `spokes.gap` is over zero, read off the config
       rather than listed here, so the day a fourth key arrives this line already knows what to expect of it. */
    const walksSpokes = t => { const E = KY46.KEY_EARN[t]; return !!(E.spokes && E.spokes.gap > 0); };
    const spokeSounds = seen.every(x => x.heard.map.join() === (walksSpokes(x.tier) ? order : ''));
    const grander = seen[0].cfg.ms <= seen[1].cfg.ms && seen[1].cfg.ms <= seen[2].cfg.ms
      && !seen[0].start.crk && !seen[1].start.crk && seen[2].start.crk > 0 && seen[2].start.thn > 0;
    const skipOk = skipSt === 'off' && skipTook < KY46.KEY_EARN.author.ms - 200 && skipped.kdone && !skipped.on && !skipped.cere && skipped.ring
      && early54.on && early54.cere;   // v29 item 3: the tap inside the window left the ceremony running
    (!bad11.length && grander && spokeSounds && skipOk)
      ? ok(`item 11 / v27 item 14 / v29 item 3 all three keys get their own earned animation: the Skill AND Pro keys' seven spokes fire clockwise from Quick Tap at 12 (${order.replace(/,/g, ' → ')}), each with its own game's sound, and the Author key has its own; ${seen.map(s => s.tier + ' ' + s.cfg.ms / 1000 + 's (took ' + s.took + 'ms)').join(' · ')}, each ending by itself in the finished key with no tap and no card — and THE SKIP WAITS ${KY46.EARN_SKIP_AT}ms: a tap ${early54At}ms into the Author key's ${KY46.KEY_EARN.author.ms}ms did nothing and it played on, a tap after the window ended it in ${skipTook}ms, on the finished key with its ring drawn`)
      : bad('item 11 / v27 item 14 the earned animations', JSON.stringify({ bad11, grander, spokeSounds, skipOk, skipTook, skipped, early54, seen: seen.map(s => ({ t: s.tier, st: s.st, took: s.took, heard: s.heard, after: s.after })) }));
  }
}
