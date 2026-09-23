// build 61: part 1 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, cur, close, ok, bad, finished, root, read, strip, boot, GAUNT_ALL, at, page, until, onScreen, click, up, revealReady, revealDone } from '../lib/gate.mjs';

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


  /* ---- 1. items 6 / 11 / 22: ONE shared reveal routine, and both kinds go through it ---- */
  {
    const rev = strip(read('ui', 'reveal.js')), cere = strip(read('ui', 'ceremony.js')), keyjs = strip(read('ui', 'screens', 'key.js'));
    // the routine lives in one file: the ceremony no longer owns a clock, a tap or a hand-over, and the key screen starts both kinds the same way
    const oneRoutine = !/playCeremony|ceremonyTap|stopCeremony|ceremonyOn/.test(cere + keyjs) && /export function chestStage|const chestStage|function chestStage/.test(cere)
      && (keyjs.match(/playReveal\(/g) || []).length >= 3 && /kind: 'chest'/.test(keyjs) && /kind: 'key'/.test(keyjs);
    // and the routine itself is the one that swallows the taps, holds, and ends on the card
    const inRev = /function tap\(\)/.test(rev) && /cur\.ready/.test(rev) && /REVEAL\.cardGo/.test(rev) && /reduced\(\)/.test(rev);
    // presentation only (L10): neither the routine nor the drawer writes anything
    const l10 = !/\bsave\(|localStorage|store\.bars/.test(rev + cere);
    (oneRoutine && inRev && l10)
      ? ok('items 6 / 11 / 22 ONE shared reveal routine (ui/reveal.js): the stage, the gifts, "tap to continue", the congratulations card - a chest hands it its ceremony as a stage, a key hands it the ring, and neither draws a clock, a tap or a hand-over of its own. Presentation only (L10): the routine and the chest drawer write nothing')
      : bad('items 6 / 11 / 22 one routine', JSON.stringify({ oneRoutine, inRev, l10 }));
  }

  /* ---- 2. item 6: ALL FOUR chests pop their unlocks out as symbols with titles, and "tap to continue" waits for the last ---- */
  {
    const want = { games: ['games', {}], key: ['key', { games: 1 }], pro: ['pro', { games: 1, key: 1 }], thorns: ['thorns', { games: 1, key: 1, pro: 1 }] };
    const seen = [];
    for (const id of Object.keys(want)) {
      const [, chests] = want[id];
      const bars = id === 'games' ? {} : id === 'key' ? tier46('clear') : id === 'pro' ? tier46('clear', 'pro') : tier46('clear', 'pro', 'author');
      // the keys' own first opens are already seen on this fixture, so what the tap plays is the chest's reveal and nothing queued in front of it
      // AMENDED at build 58 (58.2): the Pro and Author chests also want a finished Gauntlet before they are ready to be tapped open
      await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars, gaunt: GAUNT_ALL() });
      await page.evaluate(async () => { const A = await import('./audio.js'); window.__g46 = []; const o = A.Snd.gift; A.Snd.gift = function (i) { window.__g46.push(i); return o.apply(this, arguments); }; });
      await click('[data-go="s-pick"]'); await sleep(800);
      const state = await page.evaluate(i => { const c = document.querySelector(`#grid .chest[data-chest="${i}"]`); return c && c.className; }, id);
      await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(500);
      // mid-reveal: nothing is tappable yet and no gift has landed before the stage has finished
      const early = Object.assign(await revState(), { fired: await page.evaluate(() => window.__g46.length) });
      await revealReady();
      const held = Object.assign(await revState(), { fired: await page.evaluate(() => window.__g46.slice()) });
      // AMENDED at build 49 (v26 item 5): every chest also gives the About video it opens, its slot's title last among the rewards
      // AMENDED at build 53 (v28 item 10): a chest word that GIVES a Gauntlet carries `gaunt` and composes its name off GAUNTLET.name
      // AMENDED at build 59 (v30 59.3): the video's title wears MSG.quote, so it reads as the name of a clip and not as a sentence
      seen.push({ id, state, early, held, words: (CP46.CHEST_WORDS[id] || []).map(x => x.w || (CP46.GAUNTLET.name[x.gaunt] || '').toUpperCase())
        .concat(CP46.MSG.quote[0] + MS46.MESSAGES.find(m => m.by && m.by.chest === id).title + CP46.MSG.quote[1]) });
      await revealDone(); await sleep(400);
    }
    const bad6 = seen.filter(s => !/ready/.test(s.state) || s.early.tap || s.early.card || !s.held.tap
      || s.held.gifts.join() !== s.words.join() || s.held.syms.length !== s.words.length || s.held.syms.some(x => !x) || s.held.fired.join() !== s.words.map((_, i) => i).join());
    (!bad6.length)
      ? ok(`item 6 all four chests pop their unlocks out as symbols with titles, each landing with its own sound a step higher (${seen.map(s => s.id + ' ' + s.held.gifts.join('+')).join(' · ')}), and "tap to continue" is held back until the last one has landed`)
      : bad('item 6 the chest pop-out', JSON.stringify(bad6));
  }

  /* ---- 3. items 6 / 11: not skippable, and taps are SWALLOWED, not queued ---- */
  {
    await boot({}, { unlock: ALL46 });
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(900);
    // eight taps on the host and one Back, mid-stage: nothing moves, and none of them is waiting to fire when it ends
    const during = await page.evaluate(async () => { const h = document.getElementById('key-cere'); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 8; i++) { h.click(); await wait(40); }
      document.querySelector('#s-key .back').click(); await wait(200);
      return { screen: (document.querySelector('.screen.on') || {}).id, on: !h.hidden, card: h.classList.contains('card') }; });
    const st = await revealReady();
    const atTap = await revState();
    // one tap now brings the card up, and its Continue is DEAD for about a second (item 22), so a leftover tap cannot close it unseen
    await click('#key-cere'); await sleep(200);
    const early = await revState();
    await sleep(CH46.REVEAL.cardAt + CH46.REVEAL.cardGo + 350);
    const late = await revState();
    await page.evaluate(() => document.querySelector('#key-cere .rgo').click()); await sleep(600);
    const done = await onScreen();
    (during.screen === 's-key' && during.on && !during.card && st === 'tap' && atTap.tap && early.card && early.go === 'off' && late.go === 'on' && done === 's-pick')
      ? ok(`items 6 / 11 / 22 the reveal cannot be tapped out of: eight taps and Back during it do nothing and none of them is queued; the tap that lands brings the card up, whose Continue is dead for ${CH46.REVEAL.cardGo}ms and then takes it to the map`)
      : bad('items 6 / 11 taps swallowed', JSON.stringify({ during, st, atTap, early, late, done }));
  }

  /* ---- 4. item 22: what the congratulations card says ---- */
  {
    await boot({}, { unlock: ALL46 });
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click());
    await revealReady(); await click('#key-cere'); await sleep(CH46.REVEAL.cardAt + 300);
    const card = await revState();

    await revealDone(); await sleep(400);
    /* AMENDED at build 49 (v26 item 8): shorter and celebratory - "Congratulations", one You line and one Next line, no lists of what you did or got */
    (card.title === CP46.CARD.title && !card.did.length && !card.got.length && /You unlocked all \d+ game modes!/.test(card.next) && card.next.includes(CP46.CARD.next.replace('{chest}', CP46.GRID.chest.key)))
      ? ok(`item 22 the card ends the routine: "${card.title}" and two lines ("${card.next.trim()}") - no what you did, no what you got (v26 item 8)`)
      : bad('item 22 the congratulations card', JSON.stringify(card));
  }
}
