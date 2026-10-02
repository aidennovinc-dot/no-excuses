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
    // AMENDED AT BUILD 64 (62.12): Welcome opens when Dots unlocks, so the fresh profile here has every mode but Dots's
    await boot({}, { unlock: Object.fromEntries(Object.entries(ALL46).filter(([k]) => !k.startsWith('dots:'))) });
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
    /* AMENDED at build 66 (65.18): the four chest slots carry the portrait Welcome clip with no captions now, so the clip-is-a-file-name round trip is
       driven on the support slot, which keeps the 16:9 test card and its captions */
    const withFile = await page.evaluate(async () => { const M = await import('./config/messages.js'); const A = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const m = M.MESSAGES.find(x => x.id === 'thanks'), keep = { file: m.file, cc: m.cc };
      m.file = ''; m.cc = '';
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="thanks"]').click(); await wait(250);
      const out = { soon: /video coming soon/i.test(document.querySelector('#msglist .msgrow[data-msg="thanks"] .msgtxt small').textContent), noPlayer: !document.querySelector('#vplay:not([hidden])') };
      m.file = keep.file; m.cc = keep.cc;
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="thanks"]').click(); await wait(500);
      const h = document.getElementById('vplay'), v = h && h.querySelector('video');
      out.has = !!v; out.inline = v ? v.hasAttribute('playsinline') : false; out.full = v ? !v.hasAttribute('autoplay') : false;
      out.src = v ? v.querySelector('source').getAttribute('src') : ''; out.cc = v ? !!v.querySelector('track[kind="captions"][default]') : false;
      out.seen = JSON.parse(localStorage.getItem('ne')).prefs.msgSeen.thanks === 1;
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
      && fresh.rows.every(r => r.frame && !r.video) && /opens when you unlock dots/i.test(fresh.rows[0].state) && /opens with/i.test(fresh.rows[1].state)
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
  /* build 68 (67.6b, Cowork): THE PLAYER'S FRAME IS LANDSCAPE — 16:9 for every clip, the phone upright; the portrait test clip is letterboxed inside it
     (contain, never crop), and no message row carries a shape of its own any more.
     AMENDED at build 69 (68.11, L26 — "SUPERSEDES 67.6b (every frame 16:9)"): the frame is the CLIP's shape, so the Skill chest's clip (portrait today)
     is measured against its own videoWidth / videoHeight, and every row that carries a `ratio` carries its clip's (section 16 reads every file) */
  {
    await boot({});
    const f68 = await page.evaluate(async () => { const V = await import('./ui/video.js'), M = (await import('./config/messages.js')).MESSAGES, w = ms => new Promise(r => setTimeout(r, ms));
      V.playVideo(M.find(m => m.id === 'skill')); const v = document.querySelector('#vplay video');
      for (let i = 0; i < 200 && v && !v.videoWidth; i++) await w(25); await w(900);
      const fr = document.querySelector('#vplay .vframe').getBoundingClientRect();
      const o = { ar: +(fr.width / fr.height).toFixed(3), clip: v && v.videoWidth ? +(v.videoWidth / v.videoHeight).toFixed(3) : 0, fit: v ? getComputedStyle(v).objectFit : '' }; V.closeVideo(); await w(800); return o; });
    (f68.clip > 0 && Math.abs(f68.ar - f68.clip) < .03 && f68.fit === 'contain')
      ? ok(`67.6b AMENDED by 68.11 (L26): the player's frame is the clip's own shape, ${f68.ar} wide to 1 high for a ${f68.clip} clip — nothing letterboxed (object-fit ${f68.fit})`)
      : bad('67.6b / L26 the frame is the clip\'s shape', JSON.stringify(f68));
  }
  /* build 68 (#496, answered 2026-10-01): A CHEST VIDEO'S FIRST VIEWING IS FULL SCREEN — the picture the phone's whole width, letterboxed (contain), on black;
     a replay from About keeps the inset player. Every chest drives its own: opened on the key screen, tapped through to its card, Continue → the video,
     and (67.28) the chest's own screen is still under it — the map never shows in between — until the clip ends and switches off. And a Gauntlet reward
     says "(challenge)" */
  {
    const v28 = [];
    for (const chest of ['games', 'key', 'pro', 'thorns']) {
      await boot({});
      v28.push(await page.evaluate(async chest => { const K = await import('./progress/key.js'), P = await import('./progress.js'), R = await import('./ui/router.js'), S = await import('./core/store.js'), w = ms => new Promise(r => setTimeout(r, ms));
        S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.msgSeen = {}; S.prefs.chests = {}; S.prefs.revealed = {}; S.store.bars = {}; S.save();
        K.devReach(chest, P.devModesAll); R.show('s-key', { open: chest });
        let b = null; for (let i = 0; i < 260 && !(b = document.querySelector('#key-cere .rgo:not([disabled])')); i++) { const h = document.getElementById('key-cere'); if (h && h.classList.contains('tap')) h.click(); await w(80); }
        if (!b) return { chest, err: 'no card' }; b.click(); await w(400);
        const h = document.getElementById('vplay'), fr = h && h.querySelector('.vframe'), v = h && h.querySelector('video');
        // AMENDED at build 69 (68.11, L26): the frame is read once the clip's metadata is in, and its ratio is held to the CLIP's, not 16:9
        for (let i = 0; i < 200 && v && !v.videoWidth; i++) await w(25); await w(300);
        const r = fr ? fr.getBoundingClientRect() : null;
        const o = { chest, up: !!h && !h.hidden, full: !!h && h.classList.contains('vfull'), must: !!h && h.classList.contains('vmust'), under: document.querySelector('.screen.on')?.id, w: r ? Math.round(r.width) : 0, iw: innerWidth,
          ar: r ? +(r.width / r.height).toFixed(2) : 0, clip: v && v.videoWidth ? +(v.videoWidth / v.videoHeight).toFixed(2) : 0, fit: v ? getComputedStyle(v).objectFit : '', edge: fr ? getComputedStyle(fr).borderTopColor : '', thorn: !!h && h.classList.contains('vthorn') };
        if (v) v.dispatchEvent(new Event('ended')); await w(1500);
        o.after = document.querySelector('.screen.on')?.id; o.closed = !h || h.hidden;
        // a replay from About is the inset player
        const M = (await import('./config/messages.js')).MESSAGES, V = await import('./ui/video.js'), m = M.find(x => x.by && x.by.chest === chest); V.playVideo(m); await w(800);
        const f2 = h.querySelector('.vframe').getBoundingClientRect(); o.replayFull = h.classList.contains('vfull'); o.replayW = Math.round(f2.width); V.closeVideo(); await w(900);
        return o; }, chest)); }
    const kind = await page.evaluate(async () => (await import('./config/copy.js')).REWARD_KIND);
    (v28.every(o => o.up && o.full && o.must && o.under === 's-key' && o.w === o.iw && o.clip > 0 && Math.abs(o.ar - o.clip) < .03 && o.fit === 'contain' && o.closed && (o.after === 's-pick') && !o.replayFull && o.replayW < o.iw)
      && kind.gauntlet === 'challenge' && kind.gauntlet2 === 'challenge')
      ? ok(`#496 / 67.28 every chest's video comes straight from its card over the chest's own screen — ${v28.map(o => o.chest).join(', ')} — full screen the first time (${v28[0].w}px wide, the clip's own shape, contain, mandatory), and only when it ends does the map come; a replay from About is the inset player; a Gauntlet reward says "(${kind.gauntlet})"`)
      : bad('#496 / 67.28 the chest videos', JSON.stringify({ v28, kind: [kind.gauntlet, kind.gauntlet2] }));
    globalThis.__v28 = v28;
  }
  /* build 68 (67.27): EACH CHEST'S VIDEO WEARS THAT CHEST'S COLOUR — on the player's frame (read off the four first viewings above) and on its row's frame
     on About: Games white, Skill gold, Pro the Pro key's light blue, Author the Author key's black-and-white teeth */
  {
    const want = await page.evaluate(async () => { const C = await import('./ui/chest.js'), p = c => { const e = document.createElement('i'); e.style.color = c; document.body.appendChild(e); const v = getComputedStyle(e).color; e.remove(); return v; };
      return { games: p('#FFFFFF'), key: p(C.chestCol('key')), pro: p(C.chestCol('pro')) }; });
    await boot({ allOpen: true });
    const rows = await page.evaluate(async () => { (await import('./ui/router.js')).show('s-about'); await new Promise(r => setTimeout(r, 500));
      return Object.fromEntries(['games', 'skill', 'pro', 'author'].map(id => { const f = document.querySelector(`#msglist .msgrow[data-msg="${id}"] .msgframe`); return [id, f ? { col: getComputedStyle(f).borderTopColor, thorn: f.classList.contains('vthorn') } : null]; })); });
    const v = Object.fromEntries((globalThis.__v28 || []).map(o => [o.chest, o]));
    (v.games && v.games.edge === want.games && v.key && v.key.edge === want.key && v.pro && v.pro.edge === want.pro && v.thorns && v.thorns.thorn
      && rows.games && rows.games.col === want.games && rows.skill.col === want.key && rows.pro.col === want.pro && rows.author.thorn)
      ? ok(`67.27 each chest's video wears its chest's colour, in the player and on its About row: Games ${want.games}, Skill ${want.key}, Pro ${want.pro}, Author black-and-white teeth`)
      : bad('67.27 the chest video colours', JSON.stringify({ want, v: (globalThis.__v28 || []).map(o => [o.chest, o.edge, o.thorn]), rows }));
  }
  /* build 68 (67.8): EVERY VIDEO HAS A THUMBNAIL — never a blank black box: About's every row, the Welcome card and a chest card's message row each show the
     clip's still or, until the clip exists, the placeholder card carrying its name, with the play arrow over it */
  {
    await boot({ allOpen: true });
    const th = await page.evaluate(async () => { (await import('./ui/router.js')).show('s-about'); await new Promise(r => setTimeout(r, 500));
      const C = await import('./ui/chest.js'), M = (await import('./config/messages.js')).MESSAGES;
      const rows = [...document.querySelectorAll('#msglist .msgrow .msgframe')].map(f => ({ card: !!f.querySelector('.mcard, .mthumb'), name: (f.querySelector('.mcard b') || {}).textContent || '' }));
      const d = document.createElement('div'); d.innerHTML = C.msgPreview(M[0], { title: false }); const prev = { card: !!d.querySelector('.mcard, .mthumb'), play: !!d.querySelector('.mpplay') };
      return { rows, prev }; });
    (th.rows.length >= 5 && th.rows.every(r => r.card) && th.rows.filter(r => r.name).length >= 5 && th.prev.card && th.prev.play)
      ? ok(`67.8 every video has a thumbnail — all ${th.rows.length} rows on About and the player's preview card show the placeholder card with the clip's name ("${th.rows[0].name}"…) under the play arrow; no blank black box`)
      : bad('67.8 the video thumbnails', JSON.stringify(th));
  }
  /* build 68 (67.14): A VIDEO THAT STOPS SWITCHES OFF LIKE AN OLD TV — about half a second of static ("chhh", Snd.staticFx) while the picture collapses to its
     line, then the dot; on a natural end and on an early close alike; the music steps back while it plays and comes back after */
  {
    await boot({ allOpen: true });
    const st = await page.evaluate(async () => { const A = await import('./audio.js'), V = await import('./ui/video.js'), M = (await import('./config/messages.js')).MESSAGES, P = (await import('./config/messages.js')).PLAYER, w = ms => new Promise(r => setTimeout(r, ms));
      const log = []; const sf = A.Snd.staticFx, hu = A.Music.hush; A.Snd.staticFx = function () { log.push('static'); return sf.apply(this, arguments); }; A.Music.hush = function (v) { log.push('hush:' + !!v); return hu.apply(this, arguments); };
      const out = {};
      for (const how of ['ended', 'close']) { log.length = 0; V.playVideo(M.find(m => m.id === 'g1') || M[1]); await w(800);
        const h = document.getElementById('vplay'); if (how === 'ended') h.querySelector('video').dispatchEvent(new Event('ended')); else V.closeVideo();
        await w(60); const anim = getComputedStyle(h.querySelector('.vpic'), '::after').animationName; await w(P.off.ms + 300);
        out[how] = { log: log.slice(), anim, closed: h.hidden }; }
      A.Snd.staticFx = sf; A.Music.hush = hu;
      const steps = P.off.steps.map(s => s.name), stat = P.off.steps.find(s => s.name === 'static');
      return { out, steps, statMs: stat ? stat.ms : 0 }; });
    const good = o => o.closed && o.log.includes('static') && o.log[0] === 'hush:true' && o.log[o.log.length - 1] === 'hush:false' && /vstatic/.test(o.anim);
    (good(st.out.ended) && good(st.out.close) && st.steps.join() === 'static,close,dot,fade' && st.statMs >= 400 && st.statMs <= 600)
      ? ok(`67.14 a video switches off like an old TV — ${st.statMs}ms of static while the picture collapses to its line, then the dot (${st.steps.join(' · ')}) — on its natural end and on an early close; the music steps back while it plays and fades in after`)
      : bad('67.14 the switch-off static', JSON.stringify(st));
  }
}
