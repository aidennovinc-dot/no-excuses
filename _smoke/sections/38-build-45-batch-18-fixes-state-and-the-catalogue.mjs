/* ---- 22. build 45 (batch 18, fixes, state and the catalogue - FEEDBACK-v25 items 3, 4, 5, 8, 9, 10, 12, 14, 16-21) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, fail, sleep, sections, names, part, section, check, ok, bad, root, read, REVIEW_DIR, REVIEW, rvRead, noReview, strip, boot, at, page, until, onScreen, click, down, up, revealDone, readySeen, driveToResult, named } from '../lib/gate.mjs';

export const SECTION = ["build 45 - batch 18, fixes, state and the catalogue"];

export async function run() {
  const css45 = read('styles', 'app.css'), flat45 = css45.replace(/\/\*[\s\S]*?\*\//g, ''), html45 = read('index.html');
  const NOW45 = Date.now();
  const U45 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const VD45 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const AU45 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const KB45 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALLUNL = Object.fromEntries(U45.UNLOCKS.map(u => [u.key, NOW45]));
  const VH45 = 844;   // the phone the gate drives
  const PLAIN45 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const menu45 = () => page.evaluate(() => { const k = document.querySelector('#s-menu .item[data-go="s-key"]'), c = document.querySelector('[data-go="s-custom"]');
    return { keys: k.className, cus: c.className, need: !document.getElementById('keys-need').hidden || !document.getElementById('cus-need').hidden }; });
  const menuOpen45 = m => !/\bdim\b/.test(m.keys) && !/keylock/.test(m.keys) && !/\bdim\b/.test(m.cus) && !/cuslock/.test(m.cus) && !m.need;
  // a player's own route into a chest: tap it on the map, then answer its ceremony's "tap to continue"
  // AMENDED at build 46 (v25 items 6 / 22): the open is a REVEAL - its stage, its symbols, the tap, then the card's Continue. revealDone does both
  const openChest45 = async id => { await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(400);
    await revealDone(); await sleep(500); return onScreen(); };
  // every point of every line drawn in the key's ring, and every label's box — the check item 12 stands on
  const labels45 = () => page.evaluate(() => { const svg = document.getElementById('key-ring'); const pts = [];
    svg.querySelectorAll('.kroot,.kdot2,.kthorn,.khub,.karc').forEach(el => { let len = 0; try { len = el.getTotalLength(); } catch (e) { return; }
      for (let s = 0; s <= len; s += 2) { const p = el.getPointAtLength(s); pts.push([p.x, p.y]); } });
    const ring = 128, cx = 150, cy = 150, n = Math.ceil(2 * Math.PI * ring / 2);
    for (let k = 0; k < n; k++) { const t = k / n * 2 * Math.PI; pts.push([cx + Math.cos(t) * ring, cy + Math.sin(t) * ring]); }
    const boxes = [...svg.querySelectorAll('.klabels text')].map(t => ({ g: t.dataset.kg, b: t.getBBox(), txt: t.textContent }));
    const hit = boxes.filter(o => pts.some(([x, y]) => x > o.b.x - 1 && x < o.b.x + o.b.width + 1 && y > o.b.y - 1 && y < o.b.y + o.b.height + 1)).map(o => o.g);
    const over = boxes.filter((o, i) => boxes.some((p, j) => j !== i && o.b.x < p.b.x + p.b.width && o.b.x + o.b.width > p.b.x && o.b.y < p.b.y + p.b.height && o.b.y + o.b.height > p.b.y)).map(o => o.g);
    const out = boxes.filter(o => o.b.x < -20 || o.b.x + o.b.width > 320 || o.b.y < -16 || o.b.y + o.b.height > 318).map(o => o.g);
    return { n: boxes.length, hit, over, out, style: document.getElementById('s-key').dataset.style, counted: boxes.every(o => /\d+\/\d+$/.test(o.txt.replace(/\s+/g, ''))) }; });

  /* ---- 1. item 9: the menu, the map and the key screen read ONE chest state - through Testing's switches AND through play ---- */
  {
    await boot({ played: 0 }, {}, { plain: PLAIN45 });
    const before = await menu45();
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(350);
    await click('#dev-keys [data-act="dev-chestall"][data-chest="games"]'); await sleep(250);
    await click('#s-testing .back'); await sleep(400);
    await click('#s-menu [data-go="s-pick"]'); await sleep(900);
    const ready = await page.evaluate(async () => (await import('./progress/key.js')).chestState('games'));
    const landed = await openChest45('games');
    await click('#s-pick .back'); await sleep(600);
    const after = await menu45();
    const agree = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-pick'); await wait(500); const map = document.querySelector('#grid .chest[data-chest="games"]').classList.contains('open');
      R.show('s-key', { tier: 0 }); await wait(600); const quiet = !document.getElementById('key-shell').hidden;
      R.show('s-menu'); await wait(200);
      return { store: K.chestOpen('games'), map, quiet }; });
    (!menuOpen45(before) && ready === 'ready' && landed === 's-pick' && menuOpen45(after) && agree.store && agree.map && !agree.quiet)
      ? ok('item 9 Testing\'s "every mode" leaves the Games chest READY, the map opens it, and Keys and Customise open on the menu with it - map, key screen and menu all read chestOpen()')
      : bad('item 9 the Testing path', JSON.stringify({ before, ready, landed, after, agree }));
  }
  {
    // the real path: EARN the chest. Everything is open but Quick Tap - Four, which any Two run opens, so the run itself is the last mode
    const unl = Object.assign({}, ALLUNL); delete unl['quick-tap:four'];
    await boot({ played: 0 }, { unlock: unl }, { plain: PLAIN45 });
    const before = await menu45();
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); c[0].click(); }); await sleep(320);
    await page.evaluate(() => { const t = document.querySelectorAll('#time-row .tbtn'); t[0].click(); }); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const at = await driveToResult('quick-tap', 'item 9 a Quick Tap - Two run, to earn the last mode');
    await sleep(600);
    const earned = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const R = await import('./ui/router.js');
      const m = P.modeCount(); R.show('s-pick'); await new Promise(r => setTimeout(r, 600)); return { state: K.chestState('games'), open: m.open, total: m.total }; });
    const landed = earned.state === 'ready' ? await openChest45('games') : null;
    await click('#s-pick .back'); await sleep(600);
    const after = await menu45();
    (at === 's-over' && !menuOpen45(before) && earned.state === 'ready' && earned.open === earned.total && landed === 's-pick' && menuOpen45(after))
      ? ok(`item 9 the real path: one Quick Tap run opens the last mode (${earned.open} of ${earned.total}), the Games chest goes ready, opening it on the map opens Keys and Customise on the menu - no Testing switch involved`)
      : bad('item 9 the earned path', JSON.stringify({ at, before, earned, landed, after }));
  }

  /* ---- 2. item 3: a tap that moves the sheet on never waits for its own highlight ---- */
  {
    const pick45 = strip(read('ui', 'screens', 'pick.js'));
    const diff45 = (pick45.match(/diff\(b\)\{[\s\S]*?\n {2}'lvl-back'/) || [''])[0];
    const clean = !/setTimeout/.test(diff45) && !/picked/.test(pick45) && !/\.choice\.picked|\.picking/.test(flat45);
    await boot({}, { unlock: ALLUNL }, { plain: PLAIN45 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    // the class is read in the SAME task as the tap: if anything waited, the sheet would still be on the mode stage
    const snap = await page.evaluate(() => { document.querySelectorAll('#diff-row .choice')[0].click();
      return { sheet: document.getElementById('sheet').className, lens: document.querySelectorAll('#time-row .tbtn').length }; });
    (clean && /\blen\b/.test(snap.sheet) && snap.lens > 0)
      ? ok(`item 3 tapping a mode moves to the lengths on the same frame - ${snap.lens} lengths drawn with no timer between (v14 4.6's 170ms hold and its .picked green are gone)`)
      : bad('item 3 the picker never waits', JSON.stringify({ clean, snap }));
  }

  /* ---- 3. items 4 / 5 / 8 / 19: the stamp behind every screen, the sheet above the map, and the safe area at the top ---- */
  {
    const stampZ = /#build\{[^}]*z-index:0[^}]*\}/.test(flat45);
    const iB = html45.indexOf('<div id="build">'), iC = html45.indexOf('<canvas id="stars">'), iS = html45.indexOf('<section class="screen'), iG = html45.indexOf('<div id="game"');
    const order = iB > iC && iB < iS && (iG < 0 || iB < iG);
    const sheetZ = /\.sheet\{[^}]*z-index:5\}/.test(flat45);
    const clip = /#s-pick,#s-about,#s-over,#s-custom,#s-testing\{clip-path:inset\(env\(safe-area-inset-top\) 0 0 0\)\}/.test(flat45);
    /* v25 (item 19): the goal box sits 11px BELOW the safe-area line and the HUD below IT, so the phone's clock never covers
       either. AMENDED at build 60 (v31 60.19): this was two regexes against how those two rules are SPELLED, and 60.19 made the
       header a column — #goal is in flow inside #top and `goalon`'s hand-written 44px nudge of the HUD is retired, so both
       failed on the refactor. The gate's own rule is not to re-spell such a check, and its other rule is to drive the page
       instead. So the FACT is measured now, which is stronger than the spelling ever was: the badge's top edge is at least 11px
       below the safe-area line, and the mode / count row is below the badge rather than under it. */
    const goalBox = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'), P = await import('./progress.js');
      SS.store.intro['reaction'] = SS.store.intro['reaction:flash'] = Date.now(); SS.save();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      P.setPendingAim('a goal long enough to be drawn');
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'reaction', diff: 'flash', secs: 5 }); RUN.start();
      await wait(250);
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;width:1px;height:env(safe-area-inset-top)'; document.body.appendChild(probe);
      const inset = parseFloat(getComputedStyle(probe).height) || 0; probe.remove();
      const g = document.getElementById('game').getBoundingClientRect();
      const b = document.getElementById('goal').getBoundingClientRect();
      const h = document.querySelector('.hud').getBoundingClientRect();
      RUN.abort(); await wait(300);
      return { inset, badgeTop: Math.round(b.top - g.top), badgeBottom: Math.round(b.bottom - g.top), hudTop: Math.round(h.top - g.top), shown: b.height > 1 }; });
    const goal = goalBox.shown && goalBox.badgeTop >= goalBox.inset + 11 && goalBox.hudTop >= goalBox.badgeBottom;
    /* the measurement above plays a run, which leaves the app on the map with no sheet — and the next reading wants one up.
       Put it back the way the block above opened it, so the two are measuring the state each of them is about. */
    await click('[data-go="s-pick"]'); await sleep(600);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    // live, with a sheet up: the stamp is under the sheet, and nothing the map layers over the sheet is above it
    // AMENDED at build 48 (v26 item 12): the label shows on the home menu only, so on the map it is un-hidden for the measurement and put back
    const live = await page.evaluate(() => { const b = document.getElementById('build'), wasHidden = b.hidden; b.hidden = false; b.style.pointerEvents = 'auto';
      const r = b.getBoundingClientRect(), stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).map(e => e.id || String(e.className || e.tagName));
      b.style.pointerEvents = ''; b.hidden = wasHidden;
      const z = el => { const v = +getComputedStyle(el).zIndex; return Number.isFinite(v) ? v : 0; };
      const sheet = z(document.getElementById('sheet'));
      const layers = [...document.querySelectorAll('#grid, #grid *')].map(el => z(el));
      return { stack, sheet, top: Math.max(0, ...layers), grid: z(document.getElementById('grid')) }; });
    const iSheet = live.stack.findIndex(s => /sheet/.test(s)), iBuild = live.stack.indexOf('build');
    (stampZ && order && sheetZ && clip && goal && iSheet === 0 && iBuild > iSheet && live.sheet > live.top && !live.grid)
      ? ok(`items 4 / 5 / 8 / 19 the stamp is drawn before every screen and paints under them (the sheet is over it, ${live.stack.slice(0, 3).join(' > ')}); the sheet sits at z ${live.sheet} over the map's ${live.top}; the five scrolling screens are clipped at the safe-area line, and the goal badge's top edge is ${goalBox.badgeTop}px down against a ${goalBox.inset}px inset with the mode / count row at ${goalBox.hudTop}px, below it (v31 60.19 measures this where build 45 read the stylesheet)`)
      : bad('items 4 / 5 / 8 / 19 the stamp, the sheet and the safe area', JSON.stringify({ stampZ, order, sheetZ, clip, goal, goalBox, live }));
  }

  /* ---- 4. item 10: the map is the phone's width, whatever stands beside the chests ---- */
  {
    const fits = [];
    for (const [label, chests] of [['nothing open', {}], ['Games open', { games: 1 }], ['Games + Key open', { games: 1, key: 1 }]]) {
      await boot({ chests }, { unlock: ALLUNL, bars: Object.fromEntries(Object.keys(KB45.KEY_BARS).map(k => [k, NOW45])) }, { plain: PLAIN45 });
      await click('[data-go="s-pick"]'); await sleep(900);
      const m = await page.evaluate(() => { const p = document.getElementById('s-pick'), g = document.getElementById('grid').getBoundingClientRect();
        p.scrollLeft = 999; const forced = p.scrollLeft; p.scrollLeft = 0;
        return { sw: p.scrollWidth, cw: p.clientWidth, left: Math.round(g.left), right: Math.round(window.innerWidth - g.right), forced, ox: getComputedStyle(p).overflowX,
          words: [...document.querySelectorAll('#grid .chestwords')].filter(w => !w.hidden).length }; });
      fits.push({ label, ...m });
    }
    const bad10 = fits.filter(f => f.sw > f.cw || f.left !== f.right || f.forced !== 0 || f.ox !== 'hidden');
    (!bad10.length)
      ? ok(`item 10 the map never scrolls sideways: ${fits.map(f => `${f.label} ${f.sw}/${f.cw}px, ${f.left}px a side, ${f.words} word column(s)`).join(' · ')} - and a forced sideways scroll comes straight back to 0`)
      : bad('item 10 the map\'s width', JSON.stringify(fits));
  }

  /* ---- 5. item 12: every name and count on the key sits clear of every line, in all three styles, part-done and whole ---- */
  {
    const seen = [];
    for (const [label, bars] of [['nothing cleared', {}], ['every bar cleared', 'all']]) {
      const B = bars === 'all' ? Object.fromEntries(Object.keys(KB45.KEY_BARS).flatMap(k => [[k, NOW45], [k + '|pro', NOW45], [k + '|author', NOW45]])) : {};
      await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, keyWhole: { clear: 1, pro: 1, author: 1 } }, { unlock: ALLUNL, bars: B }, { plain: PLAIN45 });
      for (const tier of [0, 1, 2]) {
        await page.evaluate(async t => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 80)); R.show('s-key', { tier: t }); }, tier);
        await sleep(900);
        seen.push(Object.assign({ label }, await labels45()));
      }
    }
    const bad12 = seen.filter(s => s.n !== GAMES.length || s.hit.length || s.over.length || s.out.length || !s.counted);
    (!bad12.length)
      ? ok(`item 12 all ${seen.length * GAMES.length} labels on the key - name and count in one line - clear every spoke, corner dot, thorn, hub and the ring itself, in ${[...new Set(seen.map(s => s.style))].join(' / ')}, part-done and whole`)
      : bad('item 12 a label on a line', JSON.stringify(bad12));
  }

  /* ---- 6. item 14: the red placeholder note is gone from the key screen (a real config mismatch still speaks) ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    const warn = await page.evaluate(async () => { const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = []; for (const t of [0, 1, 2]) { R.show('s-menu'); await wait(80); R.show('s-key', { tier: t }); await wait(500);
        const el = document.getElementById('key-warn'); out.push(el.hidden ? '' : el.textContent.trim()); }
      return { out, ph: [K.placeholderCount('pro'), K.placeholderCount('author')] }; });
    const CP45 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    (warn.out.every(t => !t) && warn.ph[0] > 0 && warn.ph[1] > 0 && !('placeholder' in CP45.KEY) && !/are PLACEHOLDERS/.test(read('ui', 'screens', 'key.js')) && /KEY\.mismatch/.test(read('ui', 'screens', 'key.js')))
      ? ok(`item 14 no key screen says anything about placeholders any more (${warn.ph[0]} Pro and ${warn.ph[1]} Author cells still are, and isPlaceholder still answers for the generator and the catalogue); the config-mismatch warning is untouched`)
      : bad('item 14 the placeholder note', JSON.stringify(warn));
  }

  /* ---- 7. item 16: a game's panel fits the phone and scrolls inside itself ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 0 }); }); await sleep(800);
    const panels = [];
    for (const g of GAMES) {
      await page.evaluate(x => document.querySelector(`.knode[data-kg="${x}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), g); await sleep(450);
      panels.push(Object.assign({ g }, await page.evaluate(() => { const l = document.getElementById('key-list'), m = document.getElementById('key-music'), s = document.getElementById('s-key');
        const lb = l.getBoundingClientRect(), floor = m.hidden ? window.innerHeight : m.getBoundingClientRect().top;
        const kids = [...s.children].filter(c => c.getClientRects().length && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
        const lowest = Math.max(...kids.map(c => c.getBoundingClientRect().bottom));
        l.scrollTop = l.scrollHeight; const rows = l.querySelectorAll('.krow'), last = rows[rows.length - 1].getBoundingClientRect();
        // build 57 (v29 Section A, 57.5): `kpanel` is retired — the wheel is locked to one size, so what is asserted is that the ring did NOT move
        const rb = document.getElementById('key-ring').getBoundingClientRect();
        return { bottom: Math.round(lb.bottom), floor: Math.round(floor), lowest: Math.round(lowest), rows: rows.length, lastIn: last.bottom <= lb.bottom + 1,
          ring: [Math.round(rb.top), Math.round(rb.height)], panel: s.classList.contains('kpanel') }; })));
    }
    const ring16 = panels.every(p => p.ring[0] === panels[0].ring[0] && p.ring[1] === panels[0].ring[1]) && !panels.some(p => p.panel);
    const bad16 = panels.filter(p => p.bottom > p.floor + 1 || p.lowest > VH45 || !p.lastIn || !p.rows);
    (!bad16.length && ring16)
      ? ok(`item 16 / v29 57.5 every game's panel ends above SET THIS MUSIC and inside the screen, its last row can be scrolled to (${panels.map(p => p.g + ' ' + p.rows).join(', ')} rows) — and the wheel is LOCKED: ${panels[0].ring[1]}px tall at ${panels[0].ring[0]}px on all seven, so a tap never resizes or shifts it`)
      : bad('item 16 / v29 57.5 the key screen panel', JSON.stringify({ bad16, ring16, rings: panels.map(p => p.ring) }));
  }

  /* ---- 8. items 17 / 18: every round that shows a tier names it and sounds it ---- */
  {
    const src = { reaction: read('games', 'reaction', 'index.js'), timing: read('games', 'timing', 'index.js'), spot: read('games', 'spot', 'index.js'), estimate: read('games', 'estimate', 'index.js') };
    const direct = Object.entries(src).filter(([, s]) => /\broundTier\(/.test(strip(s))).map(([g]) => g);
    const tier45 = strip(read('games', '_shared', 'tier.js'));
    const oneCall = /roundShow\([\s\S]*?audio\.roundVerdict\(id\)/.test(tier45);
    const shows = Object.entries(src).map(([g, s]) => [g, (strip(s).match(/roundShow\(/g) || []).length]);
    await boot({ chests: { games: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    const flash = await page.evaluate(async () => { const ST = await import('./core/state.js'); const RUN = await import('./run/run.js'); const MU = await import('./audio.js');
      const TI = await import('./games/_shared/tier.js'); const RX = (await import('./games/reaction/index.js')).RX; const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = [], real = MU.Snd.roundVerdict; MU.Snd.roundVerdict = id => fired.push(id);
      Object.assign(ST.sel, { game: 'reaction', diff: 'flash', secs: 5, vs: 0, practice: 0 }); ST.VS.reset(); RUN.start();
      const tap = () => RUN.input({ type: 'down', x: 195, y: 420, el: document.getElementById('gen'), raw: new PointerEvent('pointerdown') });
      const cards = []; const t0 = performance.now();
      while (performance.now() - t0 < 45000 && cards.length < 3) {
        // v14 6.3: an attempt's card stays up until it is tapped — the driver answers it, or the run never reaches its next round
        if (document.getElementById('game').classList.contains('tapon')) { tap(); await wait(220); continue; }
        if (RX.st === 'go' && RX.armed) { await wait(30 + Math.random() * 90); tap(); await wait(260);
          const b = document.querySelector('#rxpane .rxmsg b'), w = document.querySelector('#rxpane .tiername');
          const ms = b ? parseInt(b.textContent, 10) : null;
          cards.push({ ms, word: w ? w.textContent : '', col: w ? w.style.color : '', want: TI.roundId('reaction:flash', ms) });
          continue; }
        await wait(25); }
      RUN.abort(); MU.Snd.roundVerdict = real; await wait(200);
      return { cards, fired }; });
    const named = flash.cards.every(c => { const t = VD45.VERDICT_TIERS.find(x => x.id === c.want); return t && c.word === t.name; });
    const sounded = flash.fired.length >= flash.cards.length && flash.cards.every((c, i) => flash.fired[i] === c.want);
    /* the round variant of every tier is shorter and quieter than the one the result screen plays, event for event.
       AMENDED at build 49 (v26 §B1): a round plays its own list, ROUND_FX - one note shorter than the result's, with bass - so it is held against that */
    const quieter = await page.evaluate(async ids => { const MU = await import('./audio.js'); const AU = await import('./config/audio.js');
      return ids.every(id => { const full = AU.ROUND_FX[id] || [], cut = MU.Snd.roundVerdictPlan(id);
        const end = ev => Math.max(0, ...ev.map(e => e[0] + e[3] / 1000));
        return full.length === cut.length && cut.every((e, i) => e[5] < full[i][5] && e[3] < full[i][3]) && end(cut) < end(full); }); }, VD45.VERDICT_TIERS.map(t => t.id));
    (!direct.length && oneCall && shows.every(([, n]) => n > 0) && flash.cards.length === 3 && named && sounded && quieter)
      ? ok(`items 17 / 18 a round's tier is one call: three Flash attempts read ${flash.cards.map(c => `${c.ms}ms "${c.word}"`).join(', ')}, each in its tier's colour with its tier's sound (${flash.fired.join(', ')}), shorter and quieter than the result's (× ${AU45.ROUND_VERDICT.time} long, × ${AU45.ROUND_VERDICT.gain} loud); every engine goes through roundShow (${shows.map(([g, n]) => g + ' ' + n).join(', ')}) and none calls roundTier itself`)
      : bad('items 17 / 18 the round tier', JSON.stringify({ direct, oneCall, shows, flash }));
  }

  /* ---- 9. items 20 / 21: the catalogue's sound list and Round formats, built by the same two functions npm run review uses ---- */
  rv6: {
    if (!REVIEW) { noReview("items 20 / 21 the catalogue's sound list and Round formats"); break rv6; }
    const { roundsRef, scoringRef, soundsRef } = REVIEW ? await import(pathToFileURL(path.join(REVIEW_DIR, 'scripts', 'catalogue.ref.mjs')).href) : { roundsRef: null, scoringRef: null, soundsRef: null };
    await boot({}, { unlock: ALLUNL }, { plain: PLAIN45 });
    const snd = await page.evaluate(soundsRef);
    const rows = snd.groups.flatMap(g => g.rows);
    const silent = rows.filter(r => !r.plays.length || r.plays.some(p => !p.ev || !p.ev.length)).map(r => r.id);
    // nothing that makes a sound can be left off the list: every Snd method but the helpers is named in a row's `src`
    // AMENDED at build 46 (v25 items 1 / 2 / 6): three more sound-makers, and their two plan helpers, which are not sounds of their own
    // AMENDED at build 49 (v26 item 6 / §B1): the pop's plan helper, and endLeft - how long until End of run has landed - which is not a sound
    // AMENDED at build 51 (v27 item 14): keyStepPlan, the plan helper for the key-earned animation's per-step sounds (keyStep is the sound)
    // AMENDED at build 52 (v27 item 10): videoPlan, the plan helper for the shared player's power-on and power-off (videoFx is the sound)
    /* AMENDED at build 53 (v28 items 13 / 17): cheerPlan, the plan helper for each chest's celebration.
       AMENDED AT BUILD 57 (v29 Section A, 57.2 / 57.6): crackPlan and crackBurstPlan are GONE with the map arrival they were written for, and
       keyIntroPlan arrives with the key-creation intro. */
    /* AMENDED AT BUILD 59 (v30 59.15): keyCircuitPlan, the plan helper for the Pro key's electrical layer. Like keyEarnPlan beside
       it, it is not a sound of its own — Snd.keyEarn plays both plans through one gain node, so one stop() silences both — and a
       helper in this list is one the page's sound roster does not need a button for. */
    const HELP = ['unlock', 'tone', 'plan', 'fx', 'noise', 'chestPlan', 'keyEarnPlan', 'keyCircuitPlan', 'keyIntroPlan', 'keyStepPlan', 'videoPlan', 'roundVerdictPlan', 'mapPlan', 'giftPlan', 'popPlan', 'cheerPlan', 'endLeft'];
    const srcs = rows.map(r => r.src).join(' ');
    const missed = snd.methods.filter(m => !HELP.includes(m) && !srcs.includes(m + '('));
    const packs = rows.filter(r => r.plays.length > 1).length;
    // build 52 adds a group of its own for the video player (v27 items 9 / 10)
    (!silent.length && !missed.length && rows.length >= 34 && snd.groups.length === 8)
      ? ok(`item 20 the sound list: ${rows.length} sounds in ${snd.groups.length} groups, every one with events off audio.js itself (${packs} of them a button per sound pack), and every sound-making Snd method is in it`)
      : bad('item 20 the sound list', JSON.stringify({ silent, missed, rows: rows.length, groups: snd.groups.length }));
    const rf = await page.evaluate(roundsRef);
    const want21 = ['rf-hold-grow', 'rf-hold-cut', 'rf-reaction-nogo', 'rf-spot-count', 'rf-spot-find', 'rf-timing-hidden'];
    const shaped = rf.every(g => g.bands.length && g.bands.every(b => b.rows.length && b.rows.every(r => r.length === g.cols.length)));
    const drawn = rf.every(g => g.id === 'rf-timing-hidden' || g.bands.every(b => (b.shapes || []).length && b.shapes.every(s => /^<svg /.test(s.svg))));
    const nogo = rf.find(g => g.id === 'rf-reaction-nogo');
    // AMENDED at build 50 (v26 §B2, #444): the amber "square turned 45° — drawn as a diamond" is gone with the turned square; the diamond is its own shape, on every band
    const diamond = nogo.bands.every(b => (b.shapes || []).some(s => /^diamond/.test(s.name)) && !(b.shapes || []).some(s => s.flag));
    // the figures are the engine's own, not a copy of them: three spot checks against the modules
    const live21 = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).SP, TM = (await import('./games/timing/index.js')).TM;
      return { decoys7: String(SP.ramp(7, 0).decoys), find5: String(SP.findSpec(5).n), hid5: TM.hiddenRamp(5, true).ramp.toFixed(2) }; });
    const rowOf = (id, first) => { const g = rf.find(x => x.id === id); for (const b of g.bands) for (const r of b.rows) if (r[0] === first) return r; return null; };
    const c7 = rowOf('rf-spot-count', '7'), f5 = rowOf('rf-spot-find', '5'), h5 = (rf.find(g => g.id === 'rf-timing-hidden').bands.find(b => /Streak/.test(b.label) && b.rows.some(r => r[0] === '5')) || { rows: [] }).rows.find(r => r[0] === '5');
    const figures = c7 && f5 && h5 && c7[2].startsWith(live21.decoys7) && f5[1] === live21.find5 && h5[1].includes('× ' + live21.hid5);
    const bands = rf.reduce((n, g) => n + g.bands.length, 0);
    (want21.every(id => rf.some(g => g.id === id)) && rf.length === want21.length && shaped && drawn && diamond && figures)
      ? ok(`item 21 Round formats: ${rf.length} games, ${bands} bands, every figure read from the game's own config and engine (spot checks: Count round 7 deals ${live21.decoys7} decoys, Find round 5 deals ${live21.find5} shapes, a Hidden Streak's round 5 stretches × ${live21.hid5}); the shapes are drawn by the app's own code, and Go / No-go's square at 45° is flagged as the diamond (#444)`)
      : bad('item 21 Round formats', JSON.stringify({ ids: rf.map(g => g.id), shaped, drawn, diamond, figures, c7, f5, h5 }));
    /* ---- v31 (60.22, build 60): AND THE RULES 60.22 TAKES OFF THE SHEETS HAVE A HOME ----
       A pick sheet's mode line is one short line now, so the scoring fine print has to live somewhere. It is a catalogue section
       built the same way these two are — off the app's own config and engines at capture time — so the check is the same shape:
       drive it against the build under test and fail on a rule that says nothing, a mode that is missing, or a figure that does
       not match the module it claims to come from. */
    const sc = await page.evaluate(scoringRef);
    const live22 = await page.evaluate(async () => { const G = await import('./config/games.js');
      const RX = (await import('./games/reaction/index.js')).default;
      return { limit: G.SET_LIMIT, free: G.SPOT_FIND.leeway, lock: G.CFG.swLock, bud: G.COUNT_BUDGET, max: RX.FLASH_MAX, gate: RX.NOGO_FREE }; });
    const ruleOf = (key, rx) => { const m = sc.modes.find(x => x.id === 'sc-' + key.replace(':', '-')); return m && m.rules.some(r => rx.test(r[0])); };
    const shaped22 = sc.modes.length === 8 && sc.modes.every(m => m.set && m.streak && m.limit === live22.limit
      && m.longest <= m.limit && Array.isArray(m.rules) && m.rules.every(r => r.length === 2 && r[0].length > 10 && r[1].length > 3));
    const carries = ruleOf('reaction:flash', new RegExp(live22.max + 'ms'))
      && ruleOf('reaction:nogo', new RegExp(live22.gate + 'ms gate'))
      && ruleOf('spot:find', new RegExp(live22.free + 's of every find is FREE'))
      && ruleOf('spot:count', new RegExp('reach ' + live22.bud))
      && ruleOf('timing:stopwatch', new RegExp('first ' + live22.lock + 'ms'));
    const tpl22 = rvRead('scripts', 'catalogue.template.html'), gen22 = rvRead('scripts', 'catalogue.mjs');
    (shaped22 && carries && /id="scoring"/.test(tpl22) && /id="sc-host"/.test(tpl22) && /REF\.scoring/.test(tpl22) && /page\.evaluate\(scoringRef\)/.test(gen22))
      ? ok(`60.22 the catalogue's "Scoring, in full" section carries what came off the sheets — ${sc.modes.length} modes, each with its two lines measured against the ${sc.limit}-character limit and ${sc.modes.reduce((n, m) => n + m.rules.length, 0)} rules between them, every figure read off the module it names (Flash's ${live22.max}ms, Go / No-go's ${live22.gate}ms gate, Find's ${live22.free}s, Count's ${live22.bud}, the Stopwatch's ${live22.lock}ms lock) — and the section and its host are in the template, so every future board keeps it (#441)`)
      : bad('60.22 the catalogue scoring section', JSON.stringify({ shaped22, carries, modes: sc.modes.length, tpl: /id="scoring"/.test(tpl22), gen: /scoringRef/.test(gen22) }));

    // and the page has somewhere to put both, carried in the template so every future board keeps them (#441)
    const tpl45 = rvRead('scripts', 'catalogue.template.html'), gen45 = rvRead('scripts', 'catalogue.mjs');
    (/id="sounds"/.test(tpl45) && /id="snd-host"/.test(tpl45) && /id="rounds"/.test(tpl45) && /id="rf-host"/.test(tpl45) && /REF\.sounds/.test(tpl45) && /REF\.rounds/.test(tpl45)
      && /page\.evaluate\(soundsRef\)/.test(gen45) && /page\.evaluate\(roundsRef\)/.test(gen45))
      ? ok('items 20 / 21 both sections are in catalogue.template.html with their note boxes, and catalogue.mjs fills them from catalogue.ref.mjs - so every future npm run review carries them (#441)')
      : bad('items 20 / 21 the template and the generator', JSON.stringify({ tpl: /id="sounds"/.test(tpl45) && /id="rounds"/.test(tpl45), gen: /soundsRef/.test(gen45) }));
  }
}
