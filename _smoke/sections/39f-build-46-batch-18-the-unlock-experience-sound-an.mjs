// build 61: part 6 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, part, section, check, ok, bad, root, read, REVIEW_DIR, REVIEW, noReview, boot, at, page, until, finish } from '../lib/gate.mjs';

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


  /* ---- 12. item 23: the About screen's eight slots ---- */
  {
    /* AMENDED AT BUILD 52 (v27 items 8 / 9 / 11). Three things this check asserted are no longer true and are asserted the other way round now:
       the intro is not open from the first load (item 8 makes Welcome wait for a run), no slot shows "video coming soon" while every slot points
       at the test card (item 11), and the player is not built inside the row (item 9 makes it one shared overlay). What item 23 still stands for
       is the part that has not moved: the list IS the screen, it is data in config/messages.js, and A CLIP ARRIVES BY FILLING IN A FILE NAME —
       so it is driven by EMPTYING one instead, which is the same claim from the other end. */
    await boot({}, { unlock: ALL46 });
    await show46('s-about'); await sleep(600);
    const fresh = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#msglist .msgrow')].map(r => ({ id: r.dataset.msg, locked: r.classList.contains('locked'),
      title: r.querySelector('.msgtxt b').textContent, state: r.querySelector('.msgtxt small').textContent, frame: !!r.querySelector('.msgframe'), video: !!r.querySelector('video') })),
      lede: document.getElementById('msg-lede').textContent }));
    // everything done: every chest, both Gauntlets played, a Quick Tap . Sprint on record and a payment through, so all eight are open
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, gauntSeen: { g1: 1, g2: 1 }, paid: 1 },
      { unlock: ALL46, bars: tier46('clear', 'pro', 'author'), runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 }] });
    await show46('s-about'); await sleep(600);
    const all = await page.evaluate(() => [...document.querySelectorAll('#msglist .msgrow')].map(r => r.classList.contains('locked')));
    // a clip is a file name and nothing else: empty one and the row says "video coming soon" and opens no player; put it back and it plays again
    const withFile = await page.evaluate(async () => { const M = await import('./config/messages.js'); const A = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const m = M.MESSAGES.find(x => x.id === 'games'), keep = { file: m.file, cc: m.cc };
      m.file = ''; m.cc = '';
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="games"]').click(); await wait(250);
      const out = { soon: /video coming soon/i.test(document.querySelector('#msglist .msgrow[data-msg="games"] .msgtxt small').textContent), noPlayer: !document.querySelector('#vplay:not([hidden])') };
      m.file = keep.file; m.cc = keep.cc;
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="games"]').click(); await wait(500);
      const h = document.getElementById('vplay'), v = h && h.querySelector('video');
      out.has = !!v; out.inline = v ? v.hasAttribute('playsinline') : false; out.full = v ? !v.hasAttribute('autoplay') : false;
      out.src = v ? v.querySelector('source').getAttribute('src') : ''; out.cc = v ? !!v.querySelector('track[kind="captions"][default]') : false;
      out.seen = JSON.parse(localStorage.getItem('ne')).prefs.msgSeen.games === 1;
      const V = await import('./ui/video.js'); V.closeVideo(); await wait(700);
      /* the dot is "any open slot with a clip not yet watched", and since item 11 every slot HAS a clip — so the seven others are marked watched
         here and the eighth, watched above, is what the dot is then read against. Before build 52 every slot was a placeholder and one clip was
         the whole of it. */
      A.show('s-menu'); await wait(200); out.dotWithOthers = document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('newthing');
      const S = await import('./core/store.js'); S.prefs.msgSeen = Object.fromEntries(M.MESSAGES.map(x => [x.id, 1])); S.save();
      A.show('s-about'); await wait(200); A.show('s-menu'); await wait(300);
      out.dot = document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('newthing');
      return out; });
    const order = MS46.MESSAGES.map(m => m.id).join();
    const shown46 = MS46.MESSAGES.filter(m => !(m.by && m.by.gauntlet)).map(m => m.id).join();
    (fresh.rows.length === 6 && shown46 === fresh.rows.map(r => r.id).join() && fresh.rows.every(r => r.locked) && / of 8$/.test(fresh.lede)
      && fresh.rows.every(r => r.frame && !r.video) && /opens when you finish/i.test(fresh.rows[0].state) && /opens with/i.test(fresh.rows[1].state)
      && all.length === 8 && all.every(l => !l) && withFile.soon && withFile.noPlayer
      && withFile.has && withFile.inline && withFile.full && withFile.cc && withFile.src === 'video/test-card.mp4' && withFile.seen && withFile.dotWithOthers && !withFile.dot)
      ? ok(`item 23 / v27 item 8 About carries the eight message slots in unlock order (${order}) as data in config/messages.js - six of them on a new profile, because R1 keeps a Gauntlet's row out of the list until its chest opens while the counter still says "of 8" - each saying what opens it, and all eight open once every chest is open, both Gauntlets have been played, a Quick Tap . Sprint is on record and a payment has gone through; a clip is still nothing but a file name - emptying one puts "video coming soon" back and opens no player, filling it in plays it, playsinline with its captions track and never autoplaying, and watching it takes the dot off the About row`)
      : bad('item 23 the About messages', JSON.stringify({ fresh, all, withFile, order, shown46 }));
  }

  /* ---- 13. items 20 / 22: every new sound is in the catalogue's list, and the card offers a message that has one ---- */
  rv7: {
    if (!REVIEW) { noReview('items 20 / 22 every new sound is in the catalogue list'); break rv7; }
    const { soundsRef } = REVIEW ? await import(pathToFileURL(path.join(REVIEW_DIR, 'scripts', 'catalogue.ref.mjs')).href) : { soundsRef: null };
    await boot({}, { unlock: ALL46 });
    const snd = await page.evaluate(soundsRef);
    const rows = snd.groups.flatMap(g => g.rows);
    const srcs = rows.map(r => r.src).join(' ');
    // v27 (build 52): the two the video player adds, and the Pro key's current between its spokes
    const want = ["Snd.titleFx('line')", "Snd.titleFx('title')", "Snd.mapFx('quick-tap')", "Snd.mapFx('chest')", 'Snd.gift(i)',
      "Snd.videoFx('on')", "Snd.videoFx('off')", "Snd.keyStep('trace')"];
    const missed = want.filter(x => !srcs.includes(x));
    const silent = rows.filter(r => !r.plays.length || r.plays.some(p => !p.ev || !p.ev.length)).map(r => r.id);
    /* DELETED at build 49: the source-text half of this check, which spelled `m.file ? m.id : ''` in key.js. v26 item 5 shows the button while a slot is a
       placeholder, behind the before-release flag, and the chests section drives the button on all four chests instead */
    (!missed.length && !silent.length)
      ? ok(`items 20 / 22 every sound this build adds is in the catalogue's Every sound list with events off audio.js itself (${rows.length} rows now)`)
      : bad('items 20 / 22 the new sounds', JSON.stringify({ missed, silent }));
  }
}
