// ---- build 68 (67.41): THE NEW-PLAYER JOURNEY ----
import fs from 'node:fs';
import path from 'node:path';
import { BASE, sleep, ok, bad, root, page, click, driveToResult } from '../lib/gate.mjs';

export const SECTION = ["new-player journey"];

/* ONE SCRIPTED RUN FROM A WIPED PROFILE, the way a new player meets the game: the walkthrough → Dash → Four → Dots and the Welcome → the About tour →
   Estimate and the Progress tour → Reaction and the Scores tour → (the rest of the chain, played forward) → the Games chest and its tours → Customise
   → the Keys screen. At every box: it fires ONCE (no box key twice), FIRST (no toast is up as a tutorial starts) and, for a tour that lives in a room,
   on that room's FIRST visit (L14); it covers nothing that takes a tap (L15 / 67.2); nothing is cut out of the background behind it (67.30); and over the
   whole journey the tutorials never scroll the screen (67.9). Every box is saved as a 390-wide frame with both insets for the review board's
   Tutorials section (67.10b): _review/_shots/journey/<id>-NN.jpg. This is the check that stops the repeats — the per-tutorial walks in the locked
   decisions section set each tutorial up on its own fixture; this one lets each fire only because the play before it earned it. */
export async function run() {
  const FRAMES = path.join(root, '..', '_review', '_shots', 'journey');
  fs.mkdirSync(FRAMES, { recursive: true }); for (const f of fs.readdirSync(FRAMES)) if (f.endsWith('.jpg')) fs.rmSync(path.join(FRAMES, f));
  await page.evaluateOnNewDocument(() => { window.__tscroll = 0; const mine = () => /ui\/tutorial\.js/.test(new Error().stack || '');
    for (const [o, k] of [[Element.prototype, 'scrollTo'], [Element.prototype, 'scrollBy'], [Element.prototype, 'scrollIntoView'], [window, 'scrollTo'], [window, 'scrollBy']]) { const f = o[k]; o[k] = function (...a) { if (mine()) window.__tscroll++; return f.apply(this, a); }; }
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop'); Object.defineProperty(Element.prototype, 'scrollTop', { configurable: true, get: d.get, set(v) { if (mine()) window.__tscroll++; d.set.call(this, v); } }); });
  const vp = page.viewport(), cdp = await page.createCDPSession();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }).catch(() => {});
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' });
  // every screen change is counted, so a tour can be held to its room's first visit
  const watch = () => page.evaluate(async () => { window.__vis = window.__vis || {}; window.__scrAt = {}; window.__tOn = 0; const E = await import('./core/events.js'); E.on('screen:change', ({ id }) => { window.__vis[id] = (window.__vis[id] || 0) + 1; window.__scrAt[id] = performance.now(); });
    const tt = document.getElementById('toast'); new MutationObserver(() => { const on = tt.classList.contains('on'); if (on && !window.__tOn) window.__tOn = performance.now(); if (!on) window.__tOn = 0; }).observe(tt, { attributes: true, attributeFilter: ['class'] });
    const on = document.querySelector('.screen.on'); if (on && !window.__vis[on.id]) window.__vis[on.id] = 1; });
  await watch();

  const tut = () => page.evaluate(async () => (await import('./ui/tutorial.js')).tutNow()).catch(() => null);
  const where = () => page.evaluate(() => document.getElementById('game').classList.contains('on') ? 'game' : (document.querySelector('.screen.on') || {}).id || null);
  const boxAt = () => page.evaluate(() => { const t = document.getElementById('tut'), b = t && !t.hidden && t.querySelector('.tbox'); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.height)]; });
  const ROOMS = { about: 's-about', prog: 's-prog', board: 's-board', gcust: 's-custom' };
  const seen = new Map(), steps = [], fails = [], trail = [];
  const lift = '#tut .tbox,#tut .ttail,#tut .tarrow,#tut .tring';
  // walk every box that comes up, until none has for `quiet` ms; `stopOnGame` hands a box that starts a run back to the caller
  let lastKey = '', lastTap = 0, retries = 0;
  const roomsMet = new Set();
  // `first` waits up to that long for a box to come before quiet can end the walk (the walkthrough waits for the map to draw in)
  async function walk(step, quiet = 1600, stopOnGame = false, first = 0) {
    let idle = 0, n = 0, waited = 0;
    for (let k = 0; k < 200; k++) {
      if (stopOnGame && (await where()) === 'game') return;
      const st = await tut();
      if (!st || !st.shown) { await welcomePlay(); if (!n && waited < first) { waited += 160; await sleep(160); continue; } idle += 160; if (idle >= quiet) return; await sleep(160); continue; }
      idle = 0; let b = await boxAt(); for (let j = 0; j < 12; j++) { await sleep(200); const b2 = await boxAt(); if (b2 && b && b2.join() === b.join()) break; b = b2; }
      const key = st.id + '-' + String(st.i + 1).padStart(2, '0');
      const m = await page.evaluate(async (lift, room, first) => { const AT = await import('./ui/atmosphere.js'); const t = document.getElementById('tut'), bx = t.querySelector('.tbox').getBoundingClientRect(), hit = [];
        const toast = document.getElementById('toast'), scr = (document.querySelector('.screen.on') || {}).id;
        document.querySelectorAll(lift).forEach(e => { e.style.visibility = 'hidden'; });
        for (const el of document.querySelectorAll('button,a[href],input,select,textarea,[data-act],[data-go],.tile,.chip,.chest,.cw')) { if (t.contains(el)) continue; const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4 || r.width * r.height > innerWidth * innerHeight * .4 || getComputedStyle(el).visibility === 'hidden') continue;
          const e = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
          if (!e || !(e === el || el.contains(e))) continue;
          if (r.left < bx.right && r.right > bx.left && r.top < bx.bottom && r.bottom > bx.top) hit.push((el.id ? '#' + el.id : String(el.className).split(' ')[0] || el.tagName) + (el.dataset.v ? '[' + el.dataset.v + ']' : '')); }
        document.querySelectorAll(lift).forEach(e => { e.style.visibility = ''; });
        return { scr, hit: t.classList.contains('far') ? [] : hit, toast: toast && toast.classList.contains('on') && first && window.__tOn > ((window.__scrAt || {})[scr] || 0) ? toast.textContent.trim().slice(0, 60) : '', holes: AT.holesNow ? AT.holesNow() : 0, visit: room && scr === room ? (window.__vis || {})[room] || 0 : null, text: t.querySelector('.tbox p')?.textContent || '' }; }, lift, ROOMS[st.id] || '', st.i === 0);
      /* the same box still up after a tap: it is not a second firing. A tap can land while a box is still settling and be taken as nothing, as a
         player's would; the walker taps again after 1.5s, and a box that needs more than three taps is a soft lock */
      let rec;
      if (key === lastKey) { if (Date.now() - lastTap < 1500) { await sleep(160); continue; } if (++retries > 3) { seen.get(key).lock = 'four taps did not move it on'; return; } rec = seen.get(key); rec.taps = retries + 1; }
      else { retries = 0; rec = { step, key, scr: m.scr, text: m.text.slice(0, 40) }; if (seen.has(key)) rec.twice = 1; seen.set(key, rec); lastKey = key; steps.push(rec); }
      if (!rec.taps) { if (m.hit.length) rec.covers = m.hit.join(','); if (m.toast) rec.late = 'a toast was up as it started: ' + m.toast; if (m.holes) rec.holes = m.holes; }
      // a tour that lives in a room meets the player on that room's FIRST visit
      if (m.visit !== null && !roomsMet.has(st.id)) { roomsMet.add(st.id); if (m.visit !== 1) rec.notFirst = 'its room on visit ' + m.visit; }
      if (!fs.existsSync(path.join(FRAMES, key + '.jpg'))) await page.screenshot({ path: path.join(FRAMES, key + '.jpg'), type: 'jpeg', quality: 62 });
      n++;
      if (st.far) { await page.mouse.move(8, 422); for (let j = 0; j < 30 && ((await tut()) || {}).far; j++) { await page.mouse.wheel({ deltaY: st.far * 140 }); await sleep(150); } continue; }
      const pt = st.tap ? await page.evaluate(async () => (await import('./ui/tutorial.js')).tutAim()) : await page.evaluate(() => { const r = document.querySelector('#tut .tbox').getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; });
      if (!pt) { rec.lock = 'no point on its ring answers'; return; }
      await page.mouse.click(pt[0], pt[1]); lastTap = Date.now();
      let moved = false; for (let j = 0; j < 40 && !moved; j++) { await sleep(100); const a = await tut(); moved = !a || a.id !== st.id || a.i !== st.i || (await where()) === 'game'; }
      if (!moved) continue;
    }
  }
  // the Welcome card's Play, and its clip played to its end (a first viewing cannot be closed)
  async function welcomePlay() { const up = await page.evaluate(() => { const w = document.getElementById('welcome'); return !!(w && !w.hidden && w.getClientRects().length); });
    if (!up) return; await sleep(700);
    if (!fs.existsSync(path.join(FRAMES, 'welcome-01.jpg'))) await page.screenshot({ path: path.join(FRAMES, 'welcome-01.jpg'), type: 'jpeg', quality: 62 });
    steps.push({ step: 'Welcome', key: 'welcome-01', scr: await where(), text: 'the Welcome card' });
    await page.evaluate(() => document.querySelector('#welcome .wplay')?.click()); await sleep(900); await endVideo(); }
  async function endVideo() { const up = await page.evaluate(() => { const v = document.getElementById('vplay'); return !!v && !v.hidden; });
    if (up) { await page.evaluate(() => { const v = document.querySelector('#vplay video'); if (v) v.dispatchEvent(new Event('ended')); }); await sleep(1500); } return up; }
  // a run of game `g`, mode index `mi`, length index `li`, opened from the map the way a player opens it
  async function play(step, g, mi, li, noTap = false) {
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(500); await walk(step + ' · map', 900);
    await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`)?.click(), g); await sleep(450); await walk(step + ' · sheet', 900);
    await page.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); c[mi] && c[mi].click(); }, mi); await sleep(350); await walk(step + ' · mode', 900);
    await page.evaluate(li => { const t = [...document.querySelectorAll('#time-row .tbtn')]; (t[li] || t[0])?.click(); }, li); await sleep(350); await walk(step + ' · length', 900);
    const runs0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('ne')).runs || []).length);
    await click('#go-btn'); await driveToResult(g, 'journey · ' + step, 60000, noTap);
    trail.push({ step, ran: (await page.evaluate(() => (JSON.parse(localStorage.getItem('ne')).runs || []).length)) - runs0, at: await where() });
    await sleep(500); await walk(step + ' · result', 2200); await endVideo(); await walk(step + ' · after the clip', 1200); }
  const menu = async (go, step) => { await page.evaluate(async () => (await import('./ui/router.js')).show('s-menu')); await sleep(500); await walk(step + ' · menu', 1200);
    await page.evaluate(go => document.querySelector(`[data-go="${go}"]`)?.click(), go); await sleep(600); await walk(step, 2000); };

  // the chain walked forward to a key, as Testing does — every unlock before it written as earned, then a reload
  const forward = async upto => { await page.evaluate(async upto => { const U = await import('./config/unlocks.js'), S = await import('./core/store.js'); const keys = U.UNLOCKS.map(u => u.key), n = upto ? keys.indexOf(upto) + 1 : keys.length;
      S.store.unlock = Object.assign({}, S.store.unlock, Object.fromEntries(keys.slice(0, n).map(k => [k, S.store.unlock[k] || Date.now()]))); S.save(); }, upto || '');
    await page.reload({ waitUntil: 'networkidle0' }); await watch(); await sleep(400); trail.push({ step: 'forward to ' + (upto || 'everything') }); };

  // 1. the title sequence, then the menu, then the map: the walkthrough, which ends by starting the first run, and the first result's boxes
  for (let i = 0; i < 80 && (await where()) !== 's-menu'; i++) await sleep(250);
  await page.evaluate(() => document.querySelector('[data-go="s-pick"]')?.click()); await sleep(600);
  await walk('walkthrough', 2500, true, 15000);
  if ((await where()) === 'game') { await driveToResult('quick-tap', 'journey · first run', 60000); trail.push({ step: 'first run', at: await where() }); await sleep(500); await walk('first result', 3000); }
  // 2–3. Dash, Four (the first run opened both, and Dots: the Welcome is on that result, after the walkthrough's own boxes)
  await play('Dash', 'quick-tap', 0, 1);
  await play('Four', 'quick-tap', 1, 0);
  // 4. a Dots run pressing nothing opens Estimate; 5. About, opened by the Welcome's clip, its tour met there
  await play('Dots', 'dots', 0, 0, true);
  await menu('s-about', 'About');
  // 6. Estimate, and the Progress tour
  await play('Estimate', 'hold', 0, 0);
  await menu('s-prog', 'Progress');
  // 7. the chain walked forward to Reaction, then a real Reaction run, and the Scores tour
  await forward('reaction:flash');
  await play('Reaction', 'reaction', 0, 0);
  await menu('s-board', 'Scores');
  // 8. the rest of the chain, then the Games chest from the map: its card, its clip, its tours
  await forward('');
  await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(900); await walk('chest · map', 1500);
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]')?.click()); await sleep(900);
  for (let i = 0; i < 40; i++) { const c = await page.evaluate(() => { const k = document.getElementById('key-cere'); return !!k && !k.hidden; }); if (!c) break; await page.evaluate(() => (document.querySelector('#key-cere .rgo') || document.getElementById('key-cere')).click()); await sleep(500); }
  trail.push({ step: 'Games chest', at: await where(), chest: await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.chests) });
  const vid = await endVideo(); await sleep(600);
  trail.push({ step: 'after the chest', video: vid, at: await where(), tut: await tut() });
  await walk('Games chest', 3000, false, 8000);
  // 9. Customise, then the Keys screen
  await menu('s-custom', 'Customise');
  await menu('s-key', 'Keys');
  const scrolled = await page.evaluate(() => window.__tscroll || 0);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }).catch(() => {});
  await page.setViewport(vp);

  const ids = [...new Set(steps.map(s => s.key.split('-').slice(0, -1).join('-')))];
  const badSteps = steps.filter(s => s.twice || s.covers || s.late || s.holes || s.notFirst || s.lock);
  const want = ['first', 'over', 'welcome', 'about', 'prog', 'board', 'games'];
  const missing = want.filter(id => !ids.includes(id));
  fs.writeFileSync(path.join(FRAMES, 'journey.json'), JSON.stringify({ steps, trail, scrolled }, null, 1));
  (!badSteps.length && !missing.length && !scrolled)
    ? ok(`67.41 / L14 / L15 the new-player journey from a wiped profile: ${steps.length} boxes across ${ids.join(', ')} — each fired once, first and (a room's tour) on its first visit; none covered anything that takes a tap; nothing cut out of the background; the tutorials never scrolled the screen. ${fs.readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length} frames for the review board`)
    : bad('67.41 the new-player journey', JSON.stringify({ missing, scrolled, bad: badSteps, ids, trail }).slice(0, 2500));
}
