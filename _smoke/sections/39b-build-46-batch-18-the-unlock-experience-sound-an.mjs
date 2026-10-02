// build 61: part 2 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, CLOCK, sleep, ok, bad, finished, root, read, boot, at, page, click, revealReady, revealDone, GAUNT_ALL, PLAIN, until, stepQuickTap } from '../lib/gate.mjs';

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
    // AMENDED at build 68 (67.31, L13): NO SKIP. The tap after where EARN_SKIP_AT used to let one through does nothing either
    const late54 = await page.evaluate(() => document.getElementById('s-key').classList.contains('kearning'));
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
    // AMENDED at build 68 (67.31, L13): both taps left it running, and it ran to its own end
    const skipOk = skipSt === 'off' && skipTook >= KY46.KEY_EARN.author.ms - 400 && skipped.kdone && !skipped.on && skipped.ring
      && early54.on && early54.cere && late54;
    (!bad11.length && grander && spokeSounds && skipOk)
      ? ok(`L13 / item 11 / v27 item 14 all three keys get their own earned animation, and no tap ends one early: the Skill AND Pro keys' seven spokes fire clockwise from Quick Tap at 12 (${order.replace(/,/g, ' → ')}), each with its own game's sound, and the Author key has its own; ${seen.map(s => s.tier + ' ' + s.cfg.ms / 1000 + 's (took ' + s.took + 'ms)').join(' · ')}, each ending by itself in the finished key with no tap and no card — and THE SKIP WAITS ${KY46.EARN_SKIP_AT}ms: a tap ${early54At}ms into the Author key's ${KY46.KEY_EARN.author.ms}ms did nothing and it played on, a tap after the window ended it in ${skipTook}ms, on the finished key with its ring drawn`)
      : bad('item 11 / v27 item 14 the earned animations', JSON.stringify({ bad11, grander, spokeSounds, skipOk, skipTook, skipped, early54, late54, seen: seen.map(s => ({ t: s.tier, st: s.st, took: s.took, heard: s.heard, after: s.after })) }));
  }
  /* build 68 (67.31, L13): THE KEY'S MOTION ENDS, AND HALF A SECOND LATER AT MOST THE NEXT SCREEN IS UP — BY ITSELF. Aiden, the third time: "It
     shouldn't be sitting there for more than like half a second before the next screen is opened up … I shouldn't be able to tap at all." All three
     keys, each earned on its own screen with its chest's Gauntlet behind it, so the next screen is that chest's opening. Measured on the page's clock
     (this section runs at ×1) from the frame the motion settles (`ksettle`) to the frame the chest's ceremony takes the screen; nothing is tapped, and
     no "tap to open the chest" prompt ever shows */
  {
    const l13 = [];
    for (const [tier, chest, chests, bars, tab] of [['clear', 'key', { games: 1 }, tier46('clear'), 0], ['pro', 'pro', { games: 1, key: 1 }, tier46('clear', 'pro'), 1], ['author', 'thorns', { games: 1, key: 1, pro: 1 }, tier46('clear', 'pro', 'author'), 2]]) {
      await boot({ chests }, { unlock: ALL46, bars, gaunt: GAUNT_ALL() });
      await page.evaluate(c => { const k = document.getElementById('s-key'), h = document.getElementById('key-cere'), hint = document.getElementById('key-hint'); window.__l13 = { prompt: 0 };
        new MutationObserver(() => { if (k.classList.contains('ksettle') && !window.__l13.settle) window.__l13.settle = performance.now(); if (hint.classList.contains('kprompt')) window.__l13.prompt++; }).observe(k, { attributes: true, subtree: true, attributeFilter: ['class'] });
        new MutationObserver(() => { if (h.dataset.kind === 'chest' && h.dataset.rev === c && !window.__l13.next) window.__l13.next = performance.now(); }).observe(h, { attributes: true }); }, chest);
      await show46('s-key', { tier: tab });
      let st = null; for (let i = 0; i < 120 && !((st = await page.evaluate(() => window.__l13)).next); i++) await sleep(100);
      l13.push({ tier, gap: st.next && st.settle ? Math.round(st.next - st.settle) : null, prompt: st.prompt });
      await revealDone(); await sleep(300);
    }
    (l13.every(x => x.gap !== null && x.gap >= 0 && x.gap <= 500 && !x.prompt))
      ? ok(`L13 / 67.31 a key earned: the motion ends and the chest's opening is up by itself ${l13.map(x => x.tier + ' ' + x.gap + 'ms').join(' · ')} later (0.5s at most, EARN_NEXT.hold ${KY46.EARN_NEXT.hold}ms), no tap, no prompt`)
      : bad('L13 / 67.31 the next screen after a key', JSON.stringify(l13));
  }
  /* build 69 (68.36, L13): NO DEAD SECONDS AFTER A KEY IS EARNED — measured from the LAST VISIBLE CHANGE, not from the motion's own end. Aiden on
     v0.68: "I was sitting after the animation … for like three seconds doing nothing", with L13's check green (430–437ms "after the motion" — timed
     from `ksettle`, which is not what a person sees). Both routes a key is earned by: a LIVE CLEAR (29 of the Skill key's 30 bars saved, the last
     one cleared by a Quick Tap · Four Sprint driven to its result) and Testing's (the Skill chest's switch, then the Keys screen). Frames are taken
     back to back at the wall clock from the earn starting until the next screen is up; the gap is the time from the last frame that differs from
     the one before it to the frame the next screen (the chest's ceremony, or another screen) is on. The moving background is hidden for the
     reading, so only what is drawn on the screens counts; a change is more than 40 pixels (at half size) moving by more than 16 */
  {
    const KY36 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const watch36 = async () => { const frames = [], t0 = Date.now();
      await page.evaluate(() => { const s = document.createElement('style'); s.id = 'gate-nobg'; s.textContent = '#stars{visibility:hidden!important}'; document.head.appendChild(s); });
      let began = false;
      while (Date.now() - t0 < 20000) {
        const st = await page.evaluate(() => { const h = document.getElementById('key-cere'), s = document.querySelector('.screen.on');
          return { scr: s ? s.id : 'game', kind: h.hidden ? '' : h.dataset.kind }; });
        const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 390, height: 844, scale: .5 } }), t = Date.now();
        if (!began && st.kind === 'key') began = true;
        if (began) { frames.push({ t, st, b64: png.toString('base64') }); if (st.kind === 'chest' || st.scr !== 's-key') break; } }
      await page.evaluate(() => document.getElementById('gate-nobg')?.remove());
      if (!began || frames.length < 3) return { gap: null, n: frames.length };
      let N36 = 0; const diffs = await page.evaluate(async list => { const dec = async b => { const i = new Image(); i.src = 'data:image/png;base64,' + b; await i.decode();
          const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
        const out = []; let prev = await dec(list[0]); for (let k = 1; k < list.length; k++) { const cur = await dec(list[k]); let n = 0;
          for (let p = 0; p < cur.length; p += 4) if (Math.max(Math.abs(cur[p] - prev[p]), Math.abs(cur[p + 1] - prev[p + 1]), Math.abs(cur[p + 2] - prev[p + 2])) > 16) n++;
          out.push(n); prev = cur; } return { out, N: prev.length / 4 }; }, frames.map(f => f.b64)).then(r => (N36 = r.N, r.out));
      // the next screen: the first frame whose state has moved on, or that changed as a whole (a ceremony's opaque host coming up); the last visible change
      // before it: the last frame that differs from the one before it by more than the finished key's own breathing (300 px at half size)
      const N = N36; let nx = frames.findIndex((f, k) => k && (f.st.kind === 'chest' || f.st.scr !== 's-key' || diffs[k - 1] > N * .25)); if (nx < 0) nx = frames.length - 1;
      /* the dead time: the LONGEST stretch with nothing visibly changing, from the earn starting to the next screen being up — after the motion's last
         frame, or in the middle (v0.68 sat still and then jumped to the settled key just before the chest). A change is more than the finished key's
         own breathing: 300 px at half size moving by more than 16 */
      const moved = [0]; for (let k = 1; k < nx; k++) if (diffs[k - 1] > 300) moved.push(k); moved.push(nx);
      let still = 0, from = 0; for (let i = 1; i < moved.length; i++) { const d = frames[moved[i]].t - frames[moved[i - 1]].t; if (d > still) { still = d; from = moved[i - 1]; } }
      const lastMove = moved[moved.length - 2];
      return { gap: still, tail: frames[nx].t - frames[lastMove].t, n: frames.length, step: Math.round((frames[nx].t - frames[0].t) / Math.max(1, nx)), stillAt: frames[from].t - frames[0].t, next: frames[nx].st, frame: frames[lastMove].b64 }; };
    // (1) a live clear
    const MODES36 = (await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k.split(':').length === 2);
    await boot({ chests: { games: 1 } }, { unlock: Object.fromEntries(MODES36.map(k => [k, Date.now()])) }, { plain: { ...PLAIN, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } } });
    await page.evaluate(async () => { const K = await import('./progress/key.js'), S = await import('./core/store.js'); for (const c of K.COMBOS) if (c.key !== 'quick-tap:four:5' && !S.store.bars[c.key]) S.store.bars[c.key] = Date.now(); S.save(); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    await click('#s-menu [data-go="s-pick"]'); await sleep(800);
    await until(() => document.querySelector('.tile[data-game="quick-tap"]')); await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await until(() => document.querySelectorAll('#diff-row .choice')[1]); await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[1].click()); await sleep(320);
    await until(() => document.querySelectorAll('#time-row .tbtn')[0]); await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    { const t0 = Date.now(); while (Date.now() - t0 < 40000) { const st = await page.evaluate(() => ({ at: (document.querySelector('.screen.on') || {}).id || null, key: !document.getElementById('key-cere').hidden && document.getElementById('key-cere').dataset.kind === 'key' }));
        if (st.key) break; if (st.at !== 's-over' && st.at !== 's-key') await stepQuickTap(); await sleep(30); } }
    const live36 = await watch36(); await revealDone(); await sleep(300);
    // (2) Testing: the Skill chest's switch plays forward until the chest is ready, then the Keys screen
    await boot({ chests: { games: 1 } }, { unlock: Object.fromEntries(MODES36.map(k => [k, Date.now()])) }, { plain: { ...PLAIN, spill: { games: 1 }, readySeen: { games: 1 } } });
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-testing')); await sleep(300);
    await click('[data-act="dev-chestall"][data-chest="key"]'); await sleep(300);
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-key', { tier: 0 }));
    const dev36 = await watch36(); await revealDone(); await sleep(300);
    /* (3) the same, with one animation on the key screen that runs on past the motion and shows nothing — what a phone does with an animation it is
       slow to finish. v0.68's settle waited for EVERY animation on the screen, up to twice the motion's length plus a second, so a straggler held the
       finished key on screen for seconds: Aiden's ~3s (his frame has the earn's host still up — the strip under it is the page's --ground). The
       motion sets the length (L13): nothing that is not moving may hold the next screen */
    await boot({ chests: { games: 1 } }, { unlock: Object.fromEntries(MODES36.map(k => [k, Date.now()])) }, { plain: { ...PLAIN, spill: { games: 1 }, readySeen: { games: 1 } } });
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-testing')); await sleep(300);
    await click('[data-act="dev-chestall"][data-chest="key"]'); await sleep(300);
    await page.evaluate(async () => { (await import('./ui/router.js')).show('s-key', { tier: 0 }); const i = document.createElement('i'); i.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
      document.getElementById('key-main').appendChild(i); i.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(1px)' }], { duration: 6000 }); });
    const slow36 = await watch36(); await revealDone(); await sleep(300);
    console.log(`  68.36 longest stillness from the earn to the next screen (last visible change → next screen): live clear ${live36.gap} ms (${live36.tail}); testing unlock ${dev36.gap} ms (${dev36.tail}); testing unlock with a straggling animation ${slow36.gap} ms (${slow36.tail})`);
    const lim36 = 600;
    ([live36, dev36, slow36].every(x => x.gap !== null && x.gap <= lim36))
      ? ok(`L13 / 68.36 no dead seconds after a key is earned: the longest stretch with nothing visibly changing, from the earn starting to the next screen, is ${live36.gap}ms on a live clear, ${dev36.gap}ms by Testing's switch and ${slow36.gap}ms with an animation straggling past the motion (frames every ~${live36.step}ms at ×1; ${lim36}ms at most, EARN_NEXT.hold ${KY36.EARN_NEXT.hold}ms)`)
      : bad('L13 / 68.36 dead time after a key is earned', JSON.stringify({ live: { ...live36, frame: undefined }, dev: { ...dev36, frame: undefined }, slow: { ...slow36, frame: undefined } }));
  }
}
