// ---- chests (build 48 opens it — FEEDBACK-v26 items 7 and 12): one saved value, reached through play and through Testing ----
/* Chest state, key state and the 0–300% meter are one saved value — the bars and the chests in the store — and every screen reads it. This section
   proves it both ways Aiden gets there: by EARNING the Games chest and key 1 with real runs, and by Testing's buttons, which must land exactly where
   play does. After every step the store, the map, the Keys screen and the menu are read side by side and must agree, and the state must be one play
   can reach: no chest open behind a shut one, no bars on a key whose chest is shut, and a meter that is the bars. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, fail, sleep, names, close, part, section, check, ok, bad, finished, root, read, PLAIN, boot, NOW, GAUNT_ALL, at, browser, page, until, onScreen, click, down, up, stepQuickTap, revealReady, revealDone, readySeen, finish, FROM, named } from '../lib/gate.mjs';

export const SECTION = ["chests"];

export async function run() {
  const CP48 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const CH48 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const PLAIN48 = { ...PLAIN, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const tap = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, sel);
  const go = (id, o) => page.evaluate(async (id, o) => (await import('./ui/router.js')).show(id, o || {}), id, o);
  const EARN = CP48.GRID.chestEarn;
  // every surface's reading, beside the store's
  const read48 = () => page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
    const ids = ['games', 'key', 'pro', 'thorns'];
    // v30 (59.11): the modes are part of the first band now, so the derived figure this section checks against needs their count too
    const P59 = await import('./progress.js'), C59 = await import('./config/chests.js');
    const mc = P59.modeCount(), freeN = C59.METER.freeStart ? mc.free : 0;
    const out = { store: { meter: K.meter(), shown: K.meterPct(), max: K.meterMax(), chests: ids.map(K.chestState), bars: K.TIERS.map(t => K.keyState(t).done), total: K.TIERS.map(t => K.keyState(t).total), pct: K.TIERS.map(t => K.bandPct(t)), open: K.TIERS.map(t => K.tierOpen(t)),
      modes: { num: Math.max(0, mc.open - freeN), den: Math.max(0, mc.total - freeN) } } };
    R.show('s-pick'); await wait(450);
    out.map = ids.map(id => { const c = document.querySelector(`#grid .chest[data-chest="${id}"]`); return { st: c.classList.contains('open') ? 'open' : c.classList.contains('ready') ? 'ready' : 'locked', need: c.querySelector('.pic').dataset.need }; });
    R.show('s-testing'); await wait(60); R.show('s-key', { tier: 0, from: 's-testing' }); await wait(450);
    const quiet = !document.getElementById('key-shell').hidden;
    out.keys = { quiet, cards: [...document.querySelectorAll('#key-keys .kkey')].map(k => ({ locked: k.classList.contains('locked'), u: k.querySelector('u').textContent, theme: k.querySelectorAll('i').length })),
      line: quiet ? (document.getElementById('key-quiet-count') || {}).textContent || '' : document.getElementById('key-count').textContent,
      // AMENDED for build 49 (Aiden, after build 48): the quiet screen's row of chests is gone - its key asks, and the map shows the chests
      row: quiet ? document.querySelectorAll('#key-shell .kch, #key-shell .kchests').length : null };
    R.show('s-menu'); await wait(1250);   // the menu's count-up is 900ms
    out.menu = document.getElementById('menu-key').hidden ? null : document.getElementById('menu-key').textContent;
    return out; });
  const why48 = s => { const st = s.store, w = [];
    s.map.forEach((m, i) => { const want = st.chests[i] === 'before' ? 'locked' : st.chests[i]; if (m.st !== want) w.push(`map ${i} ${m.st}≠${want}`); if (/%/.test(m.need)) w.push(`map ${i} prints "${m.need}"`);
      /* AMENDED at build 58 (58.2): a chest that wants a finished Gauntlet as well lists BOTH requirements, one per line with its own tick.
         REVERSED AT BUILD 59 (v30 59.6): it carries ONE LINE, FOLLOWING THE STATE. Aiden on the locked Author chest — "the author chest text
         doesn't fit within it, so that doesn't look good. Let's just do earn the author key" — the two ticked lines wrapped to four and ran over
         the chest drawing and its red strike. So a locked tile says the FIRST thing still missing and nothing else: its key line while the key is
         not in hand, its Gauntlet line once it is. The requirement is not lost — it is still listed on that chest's Progress tab and it is now
         part of the key's own story on the Keys screen, both of which this section asserts elsewhere. */
      if (i && want === 'locked') { const cid = ['games', 'key', 'pro', 'thorns'][i];
        const lines = String(m.need).split('\n');
        const okNeed = lines.length === 1 && !/^[✓·] /.test(m.need)
          && (m.need === EARN[cid] || /Gauntlet/.test(m.need));
        if (!okNeed) w.push(`map ${i} says "${m.need}"`); } });
    s.keys.cards.forEach((k, i) => { if (k.theme) w.push(`card ${i} has a theme name`); if (k.locked !== !st.open[i]) w.push(`card ${i} locked ${k.locked}`); if (!k.locked && st.bars[i] < st.total[i] && k.u !== st.pct[i] + '%') w.push(`card ${i} "${k.u}"≠${st.pct[i]}%`); });
    if (/%/.test(s.keys.line)) w.push(`key line "${s.keys.line}"`);
    if (s.keys.row) w.push(`the quiet key screen still draws ${s.keys.row} chest row elements`);
    /* v28 (item 9, build 53) put meterPct() over the top of meter() and clamped it to 100. REVERSED at build 55 (v29 item 1): the figure is the
       METER, 0 to its own maximum, so 100 means key 1 whole and 200 means Pro whole as well — which is what the 2026-09-14 decision says and what
       build 53 took away. meterPct() is still the ONE thing a surface prints and the one place rounding happens. FEEDBACK-v29 carries the
       disagreement: Aiden asked for the clamp after reading 300% on the front of the app, and it was Testing's Author switch that produced it. */
    if (s.menu !== null && !s.menu.startsWith(st.shown + '%')) w.push(`menu "${s.menu}"≠${st.shown}%`);
    if (st.shown > st.max || st.shown < 0) w.push(`the shown figure is ${st.shown}% of a ${st.max} meter`);
    if (st.shown !== Math.max(0, Math.min(st.max, Math.round(st.meter)))) w.push(`shown ${st.shown}≠meter ${st.meter} of ${st.max}`);
    // reachable by play
    st.chests.forEach((c, i) => { if (i && c === 'open' && st.chests[i - 1] !== 'open') w.push(`chest ${i} open behind a shut one`); });
    st.bars.forEach((n, i) => { if (n && !st.open[i]) w.push(`${n} bars on shut key ${i}`); });
    /* AMENDED AT BUILD 59 (v30 59.11): the first hundred is MODES UNLOCKED + KEY-1 BARS in equal steps, so the figure this derives
       independently of meter() has to be derived the same way or it is checking the old rule. The other two bands are bars alone and
       do not move. The point of deriving it here at all is unchanged: the store, the map, the Keys screen and the menu must agree on
       a number that PLAY can reach, and this is the only place that recomputes it from first principles rather than asking meter(). */
    const band59 = (i) => { const bars = st.open[i] ? st.bars[i] : 0;
      if (i > 0) return st.total[i] ? 100 * bars / st.total[i] : 0;
      const den = st.modes.den + st.total[i];
      return den ? 100 * (st.modes.num + bars) / den : 0; };
    const m = Math.floor(st.bars.reduce((a, _, i) => a + band59(i), 0) + 1e-9); if (st.meter !== m) w.push(`meter ${st.meter}≠modes+bars ${m}`);
    return w; };
  const MODES48 = (await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k.split(':').length === 2);

  (CH48.METER.modes === false && (await page.evaluate(async () => (await import('./progress/key.js')).meterMax())) === 300)
    ? ok('v26 items 7 / 9 / 12 the meter is 0–300 - the three keys alone (METER.modes false) - so the Skill chest is at 100, the Pro chest at 200 and the Author chest at 300')
    : bad('v26 the 0–300 meter', JSON.stringify(CH48.METER));

  /* ---- 1. THROUGH PLAY: a run earns the last mode, the Games chest opens on the map, a run clears the last key-1 bar ---- */
  await boot({}, { unlock: Object.fromEntries(MODES48.filter(k => k !== 'quick-tap:four').map(k => [k, NOW])) }, { plain: PLAIN48 });
  const p0 = await read48();
  const qt48 = async (mi, label) => { await click('#s-menu [data-go="s-pick"]'); await sleep(800);
    // build 61: each row is TAPPED WHEN IT IS THERE — polled — rather than 420 / 320ms after the tap before it, which the map's first
    // open outran on the test clock
    await until(() => document.querySelector('.tile[data-game="quick-tap"]')); await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await until(i => document.querySelectorAll('#diff-row .choice')[i], mi); await page.evaluate(i => document.querySelectorAll('#diff-row .choice')[i].click(), mi); await sleep(320);
    await until(() => document.querySelectorAll('#time-row .tbtn')[0]); await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const t0 = Date.now(); while (Date.now() - t0 < 40000) { const at = await stepQuickTap(); if (at === 's-over' || at === 's-key') break; await sleep(40); }
    return onScreen(); };
  const run1 = await qt48(0, 'chests: a Quick Tap - Two run, the last mode');
  await sleep(700); await go('s-menu'); await sleep(300);
  const p1 = await read48();
  await click('#s-menu [data-go="s-pick"]'); await sleep(800);
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(500);
  // item 7: the Games chest's screen shows no percentage - not on the stage, not on its card
  const stage7 = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { on: !h.hidden, meter: !!h.querySelector('.meterv'), txt: (h.querySelector('.ctxt') || {}).textContent || '' }; });
  await revealReady(); await tap('#key-cere'); await sleep(500);
  const card7 = await page.evaluate(() => [...document.querySelectorAll('#key-cere .rcard li, #key-cere .rcard p, #key-cere .rcard h3')].map(x => x.textContent));
  await revealDone(); await sleep(500);
  const p2 = await read48();
  // key 1: the other 28 bars are a saved profile's; the last one is cleared LIVE by a Quick Tap - Four Sprint, which interrupts the result
  await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); for (const c of K.COMBOS) if (c.key !== 'quick-tap:four:5' && !S.store.bars[c.key]) S.store.bars[c.key] = Date.now(); S.save(); });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  await page.evaluate(() => { const el = document.getElementById('s-key'); const w = window.__k48 = { n: 0, fin: 0, cut: 0, done: false };
    new MutationObserver(() => { if (el.classList.contains('kearning') && !w.n) { const as = document.getAnimations().filter(a => a.effect && a.effect.target && el.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime));
      w.n = as.length; as.forEach(a => a.finished.then(() => w.fin++, () => w.cut++)); } }).observe(el, { attributes: true, attributeFilter: ['class'] }); });
  const run2 = await qt48(1, 'chests: a Quick Tap - Four Sprint, the last key-1 bar');
  let rev2 = 'none'; for (let i = 0; i < 100; i++) { await sleep(250); const s = await page.evaluate(() => ({ scr: document.querySelector('.screen.on').id, on: !document.getElementById('key-cere').hidden, n: window.__k48.n }));
    if (s.on) rev2 = 'playing'; if (rev2 === 'playing' && !s.on && s.scr === 's-key') { rev2 = 'ended'; break; } }
  const k48 = await page.evaluate(() => Object.assign({}, window.__k48, { hint: document.getElementById('key-hint').textContent, lock: document.getElementById('s-key').classList.contains('auto') }));
  const p3 = await page.evaluate(async () => { const K = await import('./progress/key.js'); return { meter: K.meter(), chests: ['games', 'key', 'pro', 'thorns'].map(K.chestState), bars: K.TIERS.map(t => K.keyState(t).done) }; });
  // the key asks, Open opens its chest (AMENDED for build 49), and inside the run's interlude the chest's card hands back to that run's result
  await tap('#key-ring .khubhit'); await sleep(400);
  const ask2 = await page.evaluate(() => !document.getElementById('key-ask').hidden && document.getElementById('key-cere').hidden);
  await tap('[data-act="key-ask-yes"]'); await sleep(400); await revealDone(); await sleep(500);
  const back2 = await onScreen();
  const p4 = await read48();
  (run1 === 's-over' && !why48(p0).length && p0.store.chests.join() === 'locked,before,before,before' && p1.store.chests[0] === 'ready' && !why48(p1).length
    && stage7.on && !stage7.meter && !/%/.test(stage7.txt) && card7.length && !card7.some(x => /%/.test(x)) && p2.store.chests.join() === 'open,locked,before,before' && !why48(p2).length
    && (run2 === 's-over' || run2 === 's-key') && rev2 === 'ended' && k48.n && k48.fin === k48.n && !k48.cut && k48.hint === CP48.KEY.completeReady.replace('{chest}', CP48.GRID.chest.key)
    && p3.chests.join() === 'open,ready,before,before' && p3.meter === 100 && p3.bars[0] === 30 && ask2 && back2 === 's-over' && p4.store.chests.slice(0, 3).join() === 'open,open,locked' && !why48(p4).length)
    ? ok(`v26 items 7 / 12 THROUGH PLAY: a run earns the last mode and the Games chest goes ready; opened on the map its screen and card show no percentage ("${card7.join(' · ')}"); a run clears the last key-1 bar, the reveal plays every one of its ${k48.n} animations to the end, the key says "${k48.hint}", the Skill chest is ready at ${p3.meter}%, the tap asks, Open opens it and its card goes back to the run's result - and at every step the store, the map, the Keys screen and the menu agree`)
    : bad('v26 items 7 / 12 the earned path', JSON.stringify({ run1, p0: why48(p0), p1: [p1.store.chests, why48(p1)], stage7, card7, p2: [p2.store.chests, why48(p2)], run2, rev2, k48, p3, ask2, back2, p4: [p4.store, why48(p4)] }));

  /* ---- 2. THROUGH TESTING: every button lands where play does, and every screen agrees after each ---- */
  await boot({}, {}, { plain: PLAIN48 });
  const steps = [];
  const press = async (label, sel, val) => { await go('s-testing'); await sleep(250); if (val !== undefined) await page.evaluate(v => { document.getElementById('dev-meter').value = v; }, val);
    await tap(sel); await sleep(250); const s = await read48(); steps.push({ label, chests: s.store.chests.join(), bars: s.store.bars.join(), meter: s.store.meter, why: why48(s), menu: s.menu, map: s.map.map(m => m.need) }); return s; };
  const t1 = await press('key chest · ready', '[data-act="dev-chestall"][data-chest="key"]');
  const t2 = await press('pro chest · ready', '[data-act="dev-chestall"][data-chest="pro"]');
  const t3 = await press('reset key chest', '[data-act="dev-chestreset"][data-chest="key"]');
  const t4 = await press('set meter to 203', '[data-act="dev-meter"]', '203');
  const t5 = await press('set meter to 100', '[data-act="dev-meter"]', '100');
  const t5b = await press('key chest switch off (its reset)', '[data-act="dev-chestall"][data-chest="key"]');
  const t6 = await press('thorns chest · ready', '[data-act="dev-chestall"][data-chest="thorns"]');
  const t7 = await press('reset pro chest', '[data-act="dev-chestreset"][data-chest="pro"]');
  const t8 = await press('reset games chest', '[data-act="dev-chestreset"][data-chest="games"]');
  const byPress = steps.filter(s => s.why.length);
  (!byPress.length
    && t1.store.chests.join() === p3.chests.join() && t1.store.bars.join() === p3.bars.join() && t1.store.meter === p3.meter
    && t2.store.chests.join() === 'open,open,ready,before' && t2.store.meter === 200 && t2.menu === CP48.KEY.menuReady.replace('{pct}', t2.store.shown).replace('{chest}', CP48.GRID.chest.pro)
    && t3.store.chests.join() === 'open,locked,before,before' && t3.store.bars.join() === '0,0,0'
    /* AMENDED at build 58 (58.2): the Author chest is genuinely LOCKED here, so it lists both its requirements with a tick each.
       REVERSED AT BUILD 59 (v30 59.6): ONE line. At this step the Author key is one bar in, so the thing still missing is the KEY
       and that is the whole of what the tile says — the Gauntlet's turn comes only once the key is in hand, and it is on the key's
       own screen from the start either way. */
    && t4.store.chests.join() === 'open,open,open,locked' && t4.store.bars.join() === '30,30,1' && t4.store.meter === 203
    && t4.map[3].need === EARN.thorns
    && t5.store.chests.join() === 'open,ready,before,before' && t5.store.meter === 100 && t5.map[2].need === EARN.pro
    /* AMENDED AT BUILD 59 (v30 59.11): taking the Skill chest's switch off shuts that chest and clears its bars, but the GAMES chest
       stays open and its modes stay unlocked — so the meter falls back to the modes' own share of the first hundred, not to 0. It is
       0 only when the Games chest itself is reset, which is t8 below and is still asserted as 0. */
    && t5b.store.chests.join() === 'open,locked,before,before' && t5b.store.meter > 0 && t5b.store.meter < 100
    && t6.store.chests.join() === 'open,open,open,ready' && t6.store.meter === 300
    && t7.store.chests.join() === 'open,open,locked,before' && t7.store.meter === 100
    && t8.store.chests.join() === 'locked,before,before,before' && t8.store.meter === 0)
    ? ok(`v26 items 7 / 12 THROUGH TESTING: "key chest · ready" lands exactly where the earned path did (${p3.chests.join(', ')} · ${p3.bars.join('/')} bars · ${p3.meter}%); the Pro key whole is 200% with the Pro chest ready ("${t2.menu}"); set meter to 203 opens the Key and Pro chests and clears one Author bar; a reset shuts that chest and every chest after it - ${steps.length} presses, and after each one the store, the map, the Keys screen and the menu agree on a state play can reach`)
    : bad('v26 items 7 / 12 the Testing path', JSON.stringify({ byPress, p3, steps }));

  // and the key reveal a Testing button leaves unseen is played in full before a chest tapped on the map opens - the map path (B.3) with the new reveal
  await go('s-testing'); await sleep(250); await tap('[data-act="dev-chestall"][data-chest="key"]'); await sleep(250);
  await go('s-pick'); await sleep(600);
  await page.evaluate(() => { const h = document.getElementById('key-cere'), o = window.__o48 = ['off']; new MutationObserver(() => { const k = h.hidden ? 'off' : h.dataset.kind || 'off'; if (o[o.length - 1] !== k) o.push(k); }).observe(h, { attributes: true, attributeFilter: ['hidden', 'data-kind'] }); });
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="key"]').click()); await sleep(300);
  let order48 = []; for (let i = 0; i < 120; i++) { await sleep(200); order48 = await page.evaluate(() => window.__o48.slice(1)); if (order48.includes('chest')) break; }
  await revealDone(); await sleep(500);
  const mapOpen = await page.evaluate(async () => (await import('./progress/key.js')).chestState('key'));
  (order48.join() === 'key,off,chest' && mapOpen === 'open')
    ? ok('v26 item 11 a ready Skill chest tapped on the map with key 1\'s reveal unseen plays that reveal to its end, then opens the chest - the player already asked, so nothing else is tapped in between')
    : bad('v26 item 11 the map path', JSON.stringify({ order48, mapOpen }));

  /* ---- 3. v26 items 5 / 6 / 8 / 12 (build 49): the rewards come OUT of the chest one at a time, settle under it, and the card sits under them ---- */
  const MS49 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const KY49 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const U49 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB49 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const NOW49 = Date.now(), ALL49 = Object.fromEntries(U49.UNLOCKS.map(u => [u.key, NOW49]));
  const tier49 = (...ts) => Object.fromEntries(Object.keys(KB49.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW49])));
  const fill49 = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  {
    const seen = [], R49 = CH48.REVEAL;
    // AMENDED at build 58 (58.2): the Pro and Author chests also want a finished Gauntlet, so the fixture carries the rows play would have written
    for (const [id, chests, bars] of [['games', {}, {}], ['key', { games: 1 }, tier49('clear')], ['pro', { games: 1, key: 1 }, tier49('clear', 'pro')], ['thorns', { games: 1, key: 1, pro: 1 }, tier49('clear', 'pro', 'author')]]) {
      await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL49, bars, gaunt: GAUNT_ALL() }, { plain: PLAIN48 });
      await page.evaluate(async () => { const A = await import('./audio.js'); const log = window.__s49 = []; const h = document.getElementById('key-cere'); window.__tap49 = 0;
        for (const k of ['pop', 'gift']) { const o = A.Snd[k]; A.Snd[k] = function (i) { log.push([k, i, Math.round(performance.now())]); return o.apply(this, arguments); }; }
        new MutationObserver(() => { if (h.classList.contains('tap') && !window.__tap49) window.__tap49 = Math.round(performance.now()); }).observe(h, { attributes: true, attributeFilter: ['class'] }); });
      await go('s-pick'); await sleep(600);
      await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(300);
      const start = await page.evaluate(() => { const h = document.getElementById('key-cere'), row = h.querySelector('.rgifts'), hb = h.getBoundingClientRect(), txt = h.querySelector('.ctxt');
        const ta = txt && txt.getAnimations().find(a => a.animationName === 'cfade');
        return { placed: row.classList.contains('placed'), textAt: ta ? ta.effect.getComputedTiming().delay : -1,
          gifts: [...h.querySelectorAll('.rgift')].map(g => { const a = g.getAnimations().find(x => x.animationName === 'rgiftfly'), tm = a ? a.effect.getComputedTiming() : {}, s = g.querySelector('.rsym'), f = g.querySelector('.rfly'), cs = getComputedStyle(g);
            let x = 0, y = 0, n = f; while (n && n !== h) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
            return { w: g.querySelector('b').textContent, sym: s.dataset.sym, style: s.getAttribute('style') || '', key: s.classList.contains('symkey'), size: Math.round(parseFloat(getComputedStyle(s).width)),
              delay: tm.delay, dur: +tm.duration, sx: Math.round(hb.left + x + f.offsetWidth / 2 + parseFloat(cs.getPropertyValue('--x0'))), sy: Math.round(hb.top + y + f.offsetHeight / 2 + parseFloat(cs.getPropertyValue('--y0'))) }; }) }; });
      await revealReady();
      const landed = await page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.cchestg .chestart').getBoundingClientRect();
        return { chest: { l: c.left, r: c.right, t: c.top, b: c.bottom }, rest: [...h.querySelectorAll('.rgift .rfly')].map(f => { const r = f.getBoundingClientRect(); return { t: r.top, b: r.bottom }; }),
          log: window.__s49.slice(), tapAt: window.__tap49 }; });
      await click('#key-cere'); await sleep(CH48.REVEAL.cardAt + 700);
      // build 61: and until the card's own staging has finished moving — polled off its animations, not assumed from the sleep, because on
      // the test clock a frame is long enough for the last block to land after cardAt + 700
      await page.evaluate(() => Promise.race([Promise.all(document.getElementById('key-cere').getAnimations({ subtree: true }).filter(a => Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
      const card = await page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.rcard'), r = c.getBoundingClientRect(), m = c.querySelector('.rmsg');
        return { h3: c.querySelector('h3').textContent, style: c.getAttribute('style') || '', you: (c.querySelector('.ryou') || {}).textContent, /* AMENDED at build 60 (v31 60.31): the next chest is a BLOCK now, not a sentence — a label in that key's colour and the
           question under it — so what is read back is the question, out of the block where there is one and out of the old single
           line where there is not (the last chest, which has no next key to colour). */
          next: (c.querySelector('.rnextup b') || c.querySelector('.rnext') || {}).textContent, nextBlock: !!c.querySelector('.rnextup'), lists: c.querySelectorAll('ul,li,u,.rgifts').length,
          text: c.innerText, top: r.top, bottom: r.bottom, msg: m ? m.dataset.msg : '', rows: [...h.querySelectorAll('.rgift .rfly')].map(f => f.getBoundingClientRect().bottom), chestB: h.querySelector('.cchestg .chestart').getBoundingClientRect().bottom, vh: innerHeight }; });
      await page.evaluate(() => document.querySelector('#key-cere .rmsg').click()); await sleep(500);
      /* AMENDED AT BUILD 52 (v27 items 9 / 11): with a clip in every slot the button now lands on About and OPENS THE SHARED PLAYER on that
         slot; the build-49 behaviour — picking the row out for a moment — is what a slot with no clip still does. Either counts, and the
         claim under test is the same one: the button goes to About, on this chest's own slot. The player is closed again so the next chest
         starts on a clean screen. */
      const about = await page.evaluate(async m => { const V = await import('./ui/video.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
        const h = document.getElementById('vplay');
        const out = { screen: document.querySelector('.screen.on').id, flash: !!document.querySelector(`#msglist .msgrow[data-msg="${m}"].flash`),
          playing: !!(h && !h.hidden && h.dataset.msg === m) };
        if (out.playing) { V.closeVideo(); await wait(700); }
        return out; }, card.msg);
      seen.push({ id, start, landed, card, about });
    }
    const bad49 = [];
    // AMENDED at build 51 (v27 item 13 / R2): a chest wears the colour of the key that OPENS it — `col` on its CHEST_LOOK row — not the meter band it sits in
    for (const s of seen) { const id = s.id, L = CH48.CHEST_LOOK[id], band = L.col || CH48.METER_BANDS[L.band].col, slot = MS49.MESSAGES.find(m => m.by && m.by.chest === id);
      /* v28 (item 10, build 53): a chest word that GIVES a Gauntlet carries `gaunt`, not a word, so its name is composed off GAUNTLET.name — one
         spelling for Gauntlet Mini and Gauntlet Mega. A Gauntlet's MESSAGE slot has no title of its own for the same reason. */
      const title49 = m => m.gaunt ? fill49(CP48.GAUNTLET.msgTitle, { name: CP48.GAUNTLET.name[m.gaunt] }) : m.title;
      /* v30 (59.3, build 59): the video's reward word now wears QUOTATION MARKS, so the name reads as the name of a clip rather than as a tab
         label or a sentence. The marks come off MSG.quote here as they do in ui/chest.js, so this still spells no punctuation of its own. */
      const q49 = s => CP48.MSG.quote[0] + s + CP48.MSG.quote[1];
      const want = (CP48.CHEST_WORDS[id] || []).map(x => x.w || (CP48.GAUNTLET.name[x.gaunt] || '').toUpperCase()).concat(fill49(CP48.MSG.reward, { title: q49(title49(slot)) }));
      const g = s.start.gifts, n = g.length, pops = s.landed.log.filter(e => e[0] === 'pop'), gifts = s.landed.log.filter(e => e[0] === 'gift');
      const why = [];
      if (!s.start.placed) why.push('row not placed');
      if (g.map(x => x.w).join() !== want.join() || g[n - 1].sym !== 'video') why.push('rewards ' + g.map(x => x.w).join());
      // out of the chest: every flight starts at one point, inside the chest sprite
      const c = s.landed.chest; if (g.some(x => Math.abs(x.sx - g[0].sx) > 3 || Math.abs(x.sy - g[0].sy) > 3 || x.sx < c.l - 12 || x.sx > c.r + 12 || x.sy < c.t - 12 || x.sy > c.b + 12)) why.push('flight does not start at the lid ' + JSON.stringify({ c, starts: g.map(x => [x.sx, x.sy]) }));
      // one at a time, REVEAL.giftGap apart; twice the build-46 size; close under the chest
      if (g.some((x, i) => i && Math.abs((x.delay - g[i - 1].delay) - R49.giftGap) > 1)) why.push('not ' + R49.giftGap + 'ms apart');
      if (g.some(x => x.size < 60)) why.push('size ' + g.map(x => x.size).join('/'));
      if (s.landed.rest.some(r => r.t < c.b - 2) || Math.min(...s.landed.rest.map(r => r.t)) > c.b + 40) why.push('not close under the chest ' + JSON.stringify({ cb: c.b, rest: s.landed.rest.map(r => Math.round(r.t)) }));
      // colour: a key is its own glyph in its tint, the video and every other reward the chest's colour (or its own)
      for (const x of g) { const S = CH48.SYMBOLS[x.sym] || {}; const col = S.key ? KY49.KEYS.find(k => k.id === S.key).tint : S.col || band;
        if (!x.style.includes('color:' + col) || !!S.key !== x.key) why.push('colour ' + x.sym + ' ' + x.style); }
      // a small pop as each leaves and the landing sound as each lands, read off its own flight; tap to continue only after the last has landed, the name after it too
      if (pops.length !== n || gifts.length !== n) why.push('sounds ' + pops.length + '/' + gifts.length);
      else if (gifts.some((e, i) => Math.abs((e[2] - pops[i][2]) - g[i].dur) > 250) || pops.some((e, i) => i && Math.abs((e[2] - pops[i - 1][2]) - R49.giftGap) > 250)) why.push('sound timing ' + JSON.stringify(s.landed.log));
      else if (!(s.landed.tapAt >= gifts[n - 1][2])) why.push('tap before the last landed');
      if (s.start.textAt < g[n - 1].delay + g[n - 1].dur - 1) why.push('the chest\'s name came before the rewards landed ' + s.start.textAt);
      // item 8: Congratulations in the chest's colour, one You line, one Next line, the video button; no lists, no headings, no percentage; under the rewards
      const nxt = CH48.CHESTS[CH48.CHESTS.findIndex(x => x.id === id) + 1];
      if (s.card.h3 !== CP48.CARD.title || !s.card.style.includes(band) || String(s.card.you).replace(/\d+/, '{total}') !== CP48.CARD.you[id] || !s.card.next
        || s.card.next !== (nxt ? fill49(CP48.CARD.next, { chest: CP48.GRID.chest[nxt.id] }) : CP48.CARD.nDone) || s.card.lists || /%/.test(s.card.text)) why.push('card ' + JSON.stringify(s.card));
      // v31 (60.31): and where there IS a next chest it is the block, in that chest's own colour, rather than a line of body text
      if (nxt && !s.card.nextBlock) why.push('the next chest is not a NEXT UP block ' + JSON.stringify(s.card));
      if (s.card.top < Math.max(...s.card.rows) - 1 || s.card.top < s.card.chestB || s.card.bottom > s.card.vh + 1) why.push('card overlaps ' + JSON.stringify(s.card));
      if (s.card.msg !== slot.id || s.about.screen !== 's-about' || !(s.about.flash || s.about.playing)) why.push('the video button ' + JSON.stringify({ msg: s.card.msg, about: s.about }));
      if (why.length) bad49.push({ id, why }); }
    // the "You unlocked all N game modes" line counts the modes the app counts - read it back off the page rather than re-deriving it here
    (!bad49.length)
      ? ok(`v26 items 5 / 6 / 8 / 12 all four chests: each reward pops out of the lid - every flight starts inside the chest sprite - one at a time ${CH48.REVEAL.giftGap}ms apart with a small pop, arcs round and settles close under the chest at twice the old size, landing with its own sound; a key reward is that key's own glyph in its tint and the rest wear the chest's colour; the About video the chest opens is one of them (${seen.map(s => s.id + ': ' + s.start.gifts.map(x => x.w).join(' + ')).join(' · ')}); the chest's name and "tap to continue" wait for the last to land; the card below them says "${CP48.CARD.title}", one You line ("${seen[0].card.you}"), one Next line ("${seen[0].card.next}"), no lists and no percentage, and its "${CP48.CARD.msg}" goes to that slot on About`)
      : bad('v26 items 5 / 6 / 8 / 12 the chest opening', JSON.stringify(bad49));
  }

  /* ---- 4. v26 item 13 (build 49) AMENDED AT BUILD 51 (v27 item 2 / R1): two Gauntlet tiles, each hanging off the chest that opens it — and
     NOTHING AT ALL until that chest has been opened: no tile, no label, no lock, no connector, no cell and no beat in the map's first open.
     Build 49 drew a shut Gauntlet crossed out with a padlock and "Open the Pro chest" under it, which told a player exactly what the second
     secret was; R1 allows a secret to be known to exist and never what it is. It arrives as part of its chest's own reward moment (the spill).
     ---- */
  {
    const gt = () => page.evaluate(() => ['g1', 'g2'].map(id => { const t = document.querySelector(`#grid .tile[data-gauntlet="${id}"]`), ch = document.querySelector(`#grid .chest[data-chest="${id === 'g1' ? 'key' : 'pro'}"]`), ln = document.querySelector(`#gridlines .gl.gt[data-gauntlet="${id}"]`);
      const cs = t.hidden ? null : getComputedStyle(t);
      return { hidden: !!t.hidden, box: Math.round(t.getBoundingClientRect().width), name: t.querySelector('.name').textContent, need: t.querySelector('.pic').dataset.need,
        display: cs ? cs.display : 'none', cell: (t.style.gridRow || '') + '/' + (t.style.gridColumn || ''), row: !!t.style.gridRow && t.style.gridRow === ch.style.gridRow, left: +t.style.gridColumn === +ch.style.gridColumn - 1,
        sym: (t.querySelector('.sym') || { dataset: {} }).dataset.sym, line: !!ln, open: !!ln && ln.classList.contains('open'),
        spillin: t.classList.contains('spillin'), delay: t.style.getPropertyValue('--gin') }; }));
    // (a) with only the Games chest open, neither Gauntlet exists on the map at all
    await boot({ chests: { games: 1 } }, { unlock: ALL49 }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const shut = await gt();
    // (b) and the map's first open does not leave a hole where they would have been: the chests follow the seventh game by `chestAt` alone
    await boot({ chests: { games: 1 } }, { unlock: ALL49 }, { plain: { ...PLAIN48, gridSeen: 0 } });
    await go('s-pick'); await sleep(500);
    const intro = await page.evaluate(() => ({ games: [...document.querySelectorAll('#grid .tile[data-game]')].map(t => parseInt(t.style.animationDelay) || 0).sort((x, y) => x - y),
      chests: [...document.querySelectorAll('#grid .chest')].map(c => parseInt(c.style.animationDelay) || 0),
      gaunt: [...document.querySelectorAll('#grid .tile[data-gauntlet]')].filter(t => !t.hidden).length }));
    // (c) the Skill chest open: g1 is there, named, on its own connector, arriving on that chest's spill — and g2 is still not there
    // PLAIN48 has every chest's spill already spent; this one must not, because arriving ON the spill is the whole of item 2's second half
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL49, bars: tier49('clear') }, { plain: { ...PLAIN48, spill: { games: 1 } } });
    await go('s-pick'); await sleep(700);
    const half = await gt();
    // seen again, once the spill has been spent, it simply stands there
    await go('s-menu'); await sleep(250); await go('s-pick'); await sleep(600);
    const again = await gt();
    const word = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const w = [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => x.dataset.to === 'tile:g1');
      if (!w) return null; w.click(); await wait(250); return { screen: document.querySelector('.screen.on').id, flash: document.querySelector('#grid .tile[data-gauntlet="g1"]').classList.contains('flash') }; });
    await page.evaluate(() => document.querySelector('#grid .tile[data-gauntlet="g1"]').click()); await sleep(400);
    /* v29 (items 11 / 18, build 56): this screen was a title, "Coming soon" and Back. It is the RUN now, so what it must show is the
       one intro line, the roster in order and a Go button — and the body is the fourth child. The R1 half of this check is unchanged. */
    const screen = await page.evaluate(() => { const s = document.getElementById('s-gauntlet'); return { on: s.classList.contains('on'), title: document.getElementById('gt-title').textContent, soon: document.getElementById('gt-soon').textContent,
      rows: document.querySelectorAll('#gt-body .gtlist li').length, go: !!document.querySelector('#gt-body [data-act="gaunt-go"]'),
      shown: [...s.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className) }; });
    await sleep(500); await click('#s-gauntlet .back'); await sleep(400);
    const back = await onScreen();
    const C = CP48.GAUNTLET, I = CH48.MAP_INTRO, G7 = 7;
    // the chests arrive one beat after the last game plus `chestAt`, with no slot left for a Gauntlet that is not there
    const noGap = intro.gaunt === 0 && intro.chests[0] === I.at + G7 * I.gap + I.chestAt && intro.games[G7 - 1] === I.at + (G7 - 1) * I.gap;
    const gone = t => t.hidden && t.display === 'none' && t.box === 0 && !t.line && !t.row && !t.cell.replace('/', '');
    (shut.every(gone) && noGap
      && !half[0].hidden && half[0].name === C.name.g1 && half[0].sym === 'gauntlet' && half[0].need === '' && half[0].row && half[0].left && half[0].line && half[0].open
      && half[0].spillin && half[0].delay === CH48.SPILL.delay + 'ms' && gone(half[1])
      && !again[0].hidden && !again[0].spillin && gone(again[1])
      && word && word.screen === 's-pick' && word.flash
      // build 57 (v29 Section A, 57.9): EIGHT rows for eight games — Estimate's two plays are one step and one row — and the count in the line above
      // the list is generated from the roster, so the copy carries `{n}` and cannot drift from the run
      && screen.on && screen.title === C.name.g1 && screen.soon === fill49(C.intro.g1, { n: 8 }) && screen.rows === 8 && screen.go && screen.shown.length === 4 && back === 's-pick')
      ? ok(`v27 item 2 / R1 a Gauntlet is NOTHING until its chest opens - no tile, no label, no lock, no connector, no grid cell and no beat in the map's first open (the chests land at ${intro.chests[0]}ms, ${I.chestAt}ms after the seventh game and not ${2 * I.gap}ms later) - and then it comes out of that chest: the ${CP48.GRID.chest.key} opens ${C.name.g1}, which arrives on the spill's own beat and leads to its nine-play roster and Go (${half[0].delay}) in its chest's row to the LEFT of it on a green connector of its own, with its GAUNTLET word going to it; ${C.name.g2} is still not on the map at all; seen again it simply stands there; and an open tile goes to a placeholder with its title, "${C.soon}" and Back, and nothing else`)
      : bad('v27 item 2 the Gauntlets are secret until their chest', JSON.stringify({ shut, intro, noGap, half, again, word, screen, back }));
  }

  /* ---- 5. v27 item 4 (build 51): THE FOUR NAMES, FROM ONE SOURCE. The chests are Games / Skill / Pro / Author everywhere a player or the
     catalogue can read one, and config/copy.js GRID.chest is the only place any of the four is spelled — index.html carries no label, the
     Messages list composes its locked line from the slot's own `by`, and the Gauntlet toast fills GRID.chestOpenIt. The ids do not move.
     R2 is in item 13 below; this is its copy half. Driven, not read: every surface is opened and the names read back off the page. ---- */
  {
    const G = CP48.GRID.chest;
    // AMENDED at build 58 (58.2): the Author chest also wants Gauntlet Mega finished, or its key screen names the Gauntlet instead of the chest
    await boot({ chests: { games: 1, key: 1, pro: 1 }, snd: 'off' }, { unlock: ALL49, bars: tier49('clear', 'pro', 'author'), gaunt: GAUNT_ALL() }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const map = await page.evaluate(() => [...document.querySelectorAll('#grid .chest')].map(c => ({ id: c.dataset.chest, name: c.querySelector('.name').textContent })));
    // the Author tab: its key is whole and its chest is the one still waiting, so the hint is the "tap the key to open the …" line
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 2 }); }); await sleep(900);
    const keyHint = await page.evaluate(() => document.getElementById('key-hint').textContent);
    await go('s-custom'); await sleep(500);
    /* v28 (items 2 / 3, build 53): CUSTOMISE NAMES THE KEY, NOT THE CHEST. The Everywhere row is gone — its Per game / Key / Pro / Thorns chips
       were the one place on this screen that named a chest, and their labels were the TRACK names, which is why they read Key / Pro / Thorns
       where a key was meant. The Music row holds the three key tracks now, titled Lantern / Circuit / Thorns, and a locked one says what opens
       it under the row: the KEY, by its own name in config/keys.js. So what is read back here is the track titles and the lock line. */
    const cusTracks = await page.evaluate(() => [...document.querySelectorAll('#c-track .opt')].map(x => x.textContent.trim()));
    const cusLock = await page.evaluate(async () => { const b = [...document.querySelectorAll('#c-track .opt.locked')][0]; if (!b) return '';
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 120));
      return (document.getElementById('lk-track') || {}).textContent || ''; });
    const cus = cusTracks;
    await go('s-about'); await sleep(500);
    const msg = await page.evaluate(() => [...document.querySelectorAll('#msglist .msgrow')].map(r => ({ title: r.querySelector('b').textContent, need: r.querySelector('small').textContent })));
    // index.html has no name of its own: the one source is the config, and the map fills every label from it. The MARKUP, not the comments
    // around it — a comment explaining which chest a row is for is documentation, not a second place the name is read from
    const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
    const inMarkup = Object.values(G).filter(v => html.includes(v));
    const named = map.map(m => m.id + '=' + m.name).join(' ');
    /* the two names item 4 retired, built from characters rather than written out: a blanket rename of the new names across this file once
       rewrote this very test into asserting the page does NOT say "Skill chest", which is the opposite of the check. */
    const OLD51 = new RegExp(['Key', 'Thorns'].map(w => w + ' chest').join('|'));
    const locked = msg.filter(m => m.need.startsWith('opens with')).map(m => m.need);
    (map.map(m => m.name).join('|') === [G.games, G.key, G.pro, G.thorns].join('|')
      && !inMarkup.length && !OLD51.test(html) && !OLD51.test(JSON.stringify([map, cus, msg]))
      && keyHint === CP48.KEY.completeReady.replace('{chest}', G.thorns)
      && cus.length && KY49.KEYS.every(k => cus.includes(k.theme)) && !cus.some(t => KY49.KEYS.some(k => k.name === t))
      && msg.every(m => !/\bLantern\b|\bCircuit\b|\bThorn\b/.test(m.title + ' ' + m.need))
      && locked.length && locked.every(t => Object.values(G).some(v => t.includes(v)) || /a whole .* key/.test(t)))
      ? ok(`v27 item 4 / v28 item 3 the chests are ${map.map(m => m.name).join(' · ')} everywhere a player reads one — the map (${named}), the Keys screen ("${keyHint}") and the Messages list (${locked.join(' · ')}) — from ONE source in config/: index.html spells none of the four. And Customise's one Music row titles the key tracks by their THEMES (${cus.join(' · ')}), never by a key's name${cusLock ? `, with a locked one saying "${cusLock}"` : ''}`)
      : bad('v27 item 4 one source for the chest names', JSON.stringify({ map, inMarkup, keyHint, wantHint: CP48.KEY.completeReady.replace('{chest}', G.thorns), cus, cusLock, msg, locked }));
  }

  /* ---- 6. v27 item 13 / R2 (build 51): A CHEST MATCHES THE KEY THAT OPENS IT. The gold banded chest moves from Pro to Skill (the Skill key is
     gold); the Pro chest is redrawn from the Pro key — its Circuit blue, its ring and antennae, traces across the box; the Author chest already
     matched and the Games chest has no key, so neither moves. The colour is `col` on the CHEST_LOOK row and every surface that draws a chest
     reads it: the sprite, the ceremony's --cc, the spill's particles, a reward symbol and the congratulations card. ---- */
  {
    const L = CH48.CHEST_LOOK, KY = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const keyCol = { key: 'clear', pro: 'pro', thorns: 'author' };
    // each key chest's colour is the tint of the key that opens it, or a shade of it - held to the hue, not to a literal
    const hue = h => { const n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx === mn) return -1; const d = mx - mn; let x = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round(x * 60); };
    const near = (a, b) => { const x = hue(a), y = hue(b); return x < 0 || y < 0 ? a.toUpperCase() === b.toUpperCase() : Math.min(Math.abs(x - y), 360 - Math.abs(x - y)) <= 30; };
    const matches = Object.entries(keyCol).every(([c, t]) => near(L[c].col, KY.KEYS.find(k => k.id === t).tint));
    const proIsKey = L.pro.col === KY.KEYS.find(k => k.id === 'pro').tint && (L.pro.lid || []).length >= 3 && (L.pro.fit || []).length >= 3 && L.pro.idle.kind === 'circuit';
    const skillIsGold = L.key.col === '#E8B84A' && (L.key.fit || []).length === 6 && L.key.lidSw === 2.6 && L.key.idle.kind === 'shimmer';
    const plain = L.games.col === 'var(--mute)' && !L.games.fit && L.thorns.col === '#FFFFFF' && (L.thorns.spikes || []).length === 5;
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, snd: 'off' }, { unlock: ALL49, bars: tier49('clear', 'pro', 'author') }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const drawn = await page.evaluate(() => [...document.querySelectorAll('#grid .chest .chestart')].map(a => ({ id: a.dataset.look, cs: a.style.getPropertyValue('--cs'), bc: a.style.getPropertyValue('--bc'), idle: a.dataset.idle,
      lid: a.querySelectorAll('.lidg .lid').length, fit: a.querySelectorAll('.fit').length, spk: a.querySelectorAll('.spk').length })));
    const onPage = drawn.every(d => d.bc === L[d.id].col && d.cs === L[d.id].stroke && d.idle === L[d.id].idle.kind);
    (matches && proIsKey && skillIsGold && plain && onPage)
      ? ok(`v27 item 13 / R2 each chest matches the key that opens it: the ${CP48.GRID.chest.key} is the gold banded chest with its ${drawn.find(d => d.id === 'key').fit} fittings and its shimmer (the Skill key is gold), the ${CP48.GRID.chest.pro} is redrawn from the Pro key in its own ${L.pro.col} — the ring and antennae on the lid, ${drawn.find(d => d.id === 'pro').fit} traces across the box and a current running them — the ${CP48.GRID.chest.thorns} already matched and the ${CP48.GRID.chest.games} keeps its plain outline (no key opens it); every surface reads that one colour and not the meter band's`)
      : bad('v27 item 13 the chest artwork', JSON.stringify({ matches, proIsKey, skillIsGold, plain, onPage, drawn }));
  }

  /* ---- 7. v28 items 13 / 16 (build 53): A CHEST OPENED BY A KEY UNLOCKS; THE GAMES CHEST BREAKS. Aiden saw the PRO chest open on jagged crack
     symbols and a scatter of coloured swatches - the wrong metaphor twice over, because the Pro KEY opens it. All three key chests run the one
     key-turn sequence now, in their own key's colour and glyph; the breaking moved to the chest no key opens, one crack per game finished, and
     the seventh bursts it. Driven: the cracks are counted off the map's own sprite as games are unlocked. ---- */
  {
    const CER = CH48.CEREMONY, TURN = ['assemble', 'turn', 'lid', 'spill'];
    /* AMENDED at build 54 (v29 item 5): the four turn steps are still the MECHANISM every key chest runs, and still first and in order — what
       Aiden's item 5 changes is that the Author chest wears its own language over them again, so `thorns` carries five theme steps after the
       four. `spikes` / `split` / `widen` / `recede` / `black` therefore move out of the forbidden list and into a list of their own, allowed on
       the Author chest and on nothing else; the BREAKING (shake, cracks, scatter, burst) stays forbidden on all three, which is item 13. */
    /* AMENDED AT BUILD 57 (v29 Section A, 57.8): A CHEST OPENING IS TWO BEATS, IN ORDER. The four turn steps are still the mechanism every key
       chest runs and still in this order — what is new is the COVER in front of them: `cover` from zero, `uncover` clearing it, and the chest drawn
       500ms into the uncover (the stylesheet's one rule, which is build 52's own timing for the Author chest). So the assertion is no longer "the
       first four steps are the turn" but "the turn comes after the chest has been revealed", which is what Aiden asked for and what build 54 broke. */
    const stepAt = (id, n) => { const s = CER[id].steps.find(x => x.name === n); return s ? s.at : null; };
    const turnNames = id => CER[id].steps.map(x => x.name).filter(n => TURN.includes(n)).join();
    const keyTurn = ['key', 'pro', 'thorns'].every(id => turnNames(id) === TURN.join()
      && stepAt(id, 'cover') === 0 && stepAt(id, 'uncover') > 0 && stepAt(id, 'assemble') >= stepAt(id, 'uncover') + 500);
    const THEME54 = ['black', 'spikes', 'split', 'widen', 'recede'];
    const authorTheme = CER.thorns.steps.map(x => x.name).filter(n => THEME54.includes(n)).join() === THEME54.join()
      && ['key', 'pro'].every(id => !CER[id].steps.some(x => THEME54.includes(x.name)));
    const BREAK = ['shake', 'cracks', 'scatter', 'burst'];
    const noBreak = ['key', 'pro', 'thorns'].every(id => !CER[id].steps.some(x => BREAK.includes(x.name)));
    const grows = CER.key.ms < CER.pro.ms && CER.pro.ms < CER.thorns.ms;
    const gamesBreaks = CER.games.steps.some(x => x.name === 'crack') && CER.games.steps.some(x => x.name === 'burst');
    const noSwatch = !CH48.CEREMONY_FX.swatch;
    const onlyGames = Object.keys(CH48.CHEST_LOOK).every(id => id === 'games' ? (CH48.CHEST_LOOK[id].cracks || []).length === 7 : !CH48.CHEST_LOOK[id].cracks);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.2): THE CHEST IS CLEAN UNTIL IT IS OPENED, which REVERSES item 13's accumulating cracks. Aiden: no
       cracks anywhere before it is opened, on the opening screen or on the map; the cracking is the OPENING (each of the seven squares puts one in as
       it is ticked off), and once it is open its tile may stay broken. So the driver asks the map for its crack count at every state of the chest
       instead of at every count of games: nothing while it is locked, nothing while it is ready, all seven once it is open. */
    const MODES53 = (await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k.split(':').length === 2);
    const crackAt = async (keep, chests) => { await boot({ snd: 'off', chests }, { unlock: Object.fromEntries(MODES53.slice(0, keep).map(k => [k, NOW])) }, { plain: PLAIN48 });
      await go('s-pick'); await sleep(700);
      return page.evaluate(async () => { const K = await import('./progress/key.js');
        const a = document.querySelector('#grid .chest[data-chest="games"] .chestart');
        return { st: K.chestState('games'), n: K.crackCount(), drawn: a ? a.querySelectorAll('.crackg .crk').length : -1, d: a ? [...a.querySelectorAll('.crackg .crk')].map(x => x.getAttribute('d')) : [] }; }); };
    const c0 = await crackAt(0, { games: 0 }), c3 = await crackAt(6, { games: 0 }), c7 = await crackAt(MODES53.length, { games: 1 });
    const counts = c0.n === 0 && c0.drawn === 0 && c3.n === 0 && c3.drawn === 0 && c7.st === 'open' && c7.n === 7 && c7.drawn === 7;
    // the seven are a fixed order, so every player's opened chest looks the same
    const fixed = c7.d.length === 7 && new Set(c7.d).size === 7;
    const coverArt = await page.evaluate(async () => { const CE = await import('./ui/ceremony.js'); const host = document.getElementById('key-cere');
      const out = {}; for (const id of ['key', 'pro', 'thorns']) { CE.ceremonyFrame(host, id, .08, { was: 0, now: 0 });
        out[id] = { cov: host.querySelectorAll('.ccovbg').length, lan: host.querySelectorAll('.clan').length, tr: host.querySelectorAll('.ctrace').length,
          spk: host.querySelectorAll('.cspk').length, chest: +getComputedStyle(host.querySelector('.cchestg')).opacity }; }
      host.hidden = true; host.className = 'cere'; host.innerHTML = ''; host.removeAttribute('style'); return out; });
    const covered = coverArt.key.cov === 1 && coverArt.key.lan > 0 && coverArt.pro.cov === 1 && coverArt.pro.tr > 0 && coverArt.thorns.spk > 0
      && ['key', 'pro', 'thorns'].every(id => coverArt[id].chest === 0);
    (keyTurn && authorTheme && noBreak && grows && gamesBreaks && noSwatch && onlyGames && counts && fixed && covered)
      ? ok(`v28 items 13 / 16 / v29 item 5 a chest opened by a KEY unlocks and never breaks: ${CP48.GRID.chest.key}, ${CP48.GRID.chest.pro} and ${CP48.GRID.chest.thorns} all run ${TURN.join(' \u00b7 ')} in their own key's colour and glyph, ${CER.key.ms}/${CER.pro.ms}/${CER.thorns.ms}ms, with no shake, cracks, scatter or burst left between them and no coloured swatches anywhere; the ${CP48.GRID.chest.thorns} chest alone dresses that mechanism in ${THEME54.join(' \u00b7 ')}, which the other two never draw; the breaking is the ${CP48.GRID.chest.games}'s alone - ${c3.n} of its 7 cracks on the map at ${c3.n} games finished and all 7 at the last, the same cracks in the same order every time, and its ceremony draws the seventh in and bursts it`)
      : bad('v28 items 13 / 16 / v29 57.2 / 57.8 the chest openings', JSON.stringify({ keyTurn, authorTheme, noBreak, grows, gamesBreaks, noSwatch, onlyGames, counts, fixed, covered, coverArt, c0, c3, c7 }));

    /* v30 (59.1, build 59): AND THE CRACKS ARE ACTUALLY HIDDEN ON THE FIRST FRAME — 57.2's THIRD go.
       The check above asks how many crack paths are DRAWN, and it passed all through build 58 while Aiden's phone showed
       seven dashed cracks from frame zero. The hide is `stroke-dasharray:1;stroke-dashoffset:1`, which only hides a path
       whose pathLength is normalised to 1; the cracks came out of `paths()` with no pathLength, so "1" meant one USER UNIT,
       the seven rendered as dashed lines immediately and stayed dashed after the draw-in. Counting paths could never see
       that. So this asks the two things that are the mechanism: every ceremony crack declares pathLength="1", and its real
       length is longer than 1 user unit — which is what makes the attribute load-bearing rather than decorative. Then it
       drives the frozen frame at both ends: nothing showing at t=0, every crack whole by the end of the `crack` step.
       Pixel evidence for the same three clauses is `_smoke/shots.mjs 59.1` (build 59's frames are in _review/_shots). */
    /* Driven through Testing's own replay, not `ceremonyFrame` — the catalogue's frame helper renders the stage inside a
       screen that is display:none, so no CSS animation is generated at all and every frame it makes reads as "not drawn".
       That is exactly the blind spot 57.2 hid in, so this one plays the real opening and freezes ITS clock. */
    await boot({ snd: 'off', chests: { games: 0 } }, {}, { plain: PLAIN48 });
    await go('s-testing'); await sleep(300);
    await page.evaluate(() => document.querySelector('[data-act="dev-chest"][data-chest="games"]').click());
    await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 80; i++) { if (document.querySelectorAll('.cere .crk').length) return; await w(15); } });
    const crk = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.cere .crk')];
      const anims = ps.flatMap(p => p.getAnimations());
      // the LAST crack's own end: the seven are staggered by `--crack-step` and each takes .34s, so the seventh finishes
      // after the `crack` step's declared window closes. Read it off the animations rather than adding the numbers up.
      const endAt = Math.round(Math.max(0, ...anims.map(a => a.effect.getComputedTiming().endTime || 0)));
      const at = t => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t; } catch (e) {} }
        return ps.map(p => ({ pl: p.getAttribute('pathLength'), len: Math.round(p.getTotalLength() * 100) / 100,
          off: parseFloat(getComputedStyle(p).strokeDashoffset) || 0, arr: getComputedStyle(p).strokeDasharray })); };
      return { first: at(0), done: at(endAt), endAt, anims: anims.length };
    });
    const declared = crk.first.length === 7 && crk.anims >= 7 && crk.first.every(p => p.pl === '1');
    const loadBearing = crk.first.every(p => p.len > 1);          // a path shorter than 1 unit would hide with or without the attribute
    const hiddenAtZero = crk.first.every(p => p.arr === '1px' && p.off >= .999);
    const wholeAtEnd = crk.done.every(p => p.off <= .001);
    (declared && loadBearing && hiddenAtZero && wholeAtEnd)
      ? ok(`v30 59.1 (57.2, third time) the ${CP48.GRID.chest.games} chest's cracks are HIDDEN on frame one, not dashed: all 7 carry pathLength="1" over real lengths of ${Math.min(...crk.first.map(p => p.len))}-${Math.max(...crk.first.map(p => p.len))} user units, so dasharray 1 is the WHOLE path and not 8-16 dashes; at t=0 every one is fully offset and by ${crk.endAt}ms every one is whole`)
      : bad('v30 59.1 the cracks are hidden until they are drawn', JSON.stringify({ declared, loadBearing, hiddenAtZero, wholeAtEnd, endAt: crk.endAt, first: crk.first, done: crk.done }));
  }

  /* ---- 8. v28 items 12 / 17 (build 53): THE CONGRATULATIONS SCREEN IS STAGED AND CELEBRATED. The title lands first, then each block in turn,
     the message, then Continue - the whole reveal under a second - and the message reads as a screen you tap: the build-52 player powered off,
     with the clip's own title under it. Confetti and one celebratory sound fire with the title, different for each chest and escalating. ---- */
  {
    const CONF = CH48.CONFETTI, RV53 = CH48.REVEAL;
    const escal = ['games', 'key', 'pro', 'thorns'].every((id, i, a) => !i || (CONF[id].n > CONF[a[i - 1]].n && CONF[id].ms > CONF[a[i - 1]].ms));
    const gamesSquares = CONF.games.shape === 'square';   // build 57 (57.3): the count is no longer one per game — it is "a LOT", across the screen
    // item 12: "the whole reveal under a second" — measured from the card arriving, which is what a player sees staged
    const under1s = 4 * RV53.cardStep + RV53.cardBlockMs <= 1000;   // the BLOCKS under the word are unchanged; 57.3 reverses item 12 for the word only
    /* v29 Section A (57.3, build 57): the word is a celebration. Every number is CHEER_LOOK; the letters land one at a time, the Games chest's dim
       grey is bright white, and the confetti is several times the volume and thrown from the host so it crosses the screen. */
    const CL57 = CH48.CHEER_LOOK;
    const cheerLook = ['games', 'key', 'pro', 'thorns'].every(id => { const L = CL57[id]; return L && L.step > 0 && L.drop > 0 && L.bounce > 1 && L.shine > 0 && L.pulse > 0 && L.size > 1.2 && /^#/.test(L.col); })
      && CL57.games.col.toUpperCase() === '#FFFFFF'
      && ['games', 'key', 'pro', 'thorns'].every(id => CONF[id].n >= 40 && CONF[id].white > 0 && CONF[id].spread >= 100);
    const cheer = await page.evaluate(async () => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const ids = ['games', 'key', 'pro', 'thorns'], plans = ids.map(id => A.Snd.cheerPlan(id));
      return { n: plans.map(x => x.length), uniq: new Set(plans.map(sig)).size,
        clash: plans.map(sig).filter(x => [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.keyEarnPlan('clear'))].includes(x)).length }; });
    const cheerGrows = cheer.n.every((n, i, a) => !i || n >= a[i - 1]) && cheer.uniq === 4 && !cheer.clash;
    await boot({ chests: { games: 1 }, snd: 'off' }, { unlock: ALL49 }, { plain: { ...PLAIN48, revealed: {} } });
    const card53 = await page.evaluate(async () => { const RV = await import('./ui/reveal.js'), CE = await import('./ui/ceremony.js'), CH = await import('./ui/chest.js'), K = await import('./progress/key.js'), R = await import('./ui/router.js');
      const MS = await import('./config/messages.js');
      R.show('s-key'); await new Promise(r => setTimeout(r, 300));
      const m = K.meter();
      RV.playReveal(document.getElementById('key-cere'), { kind: 'chest', id: 'games', silent: true, stage: CE.chestStage('games', { was: m, now: m }), gifts: CH.giftsOf('games'),
        card: { title: 'Congratulations', chest: 'games', col: '#ffffff', you: 'y', next: 'n', msg: 'games', msgObj: MS.MESSAGES.find(x => x.id === 'games') } });
      // the Games chest's own length plus its three rewards flying out, then the hold — tap after all of it, or the tap is swallowed
      for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 300)); if (document.getElementById('key-cere').classList.contains('tap')) break; }
      RV.revealTap(); await new Promise(r => setTimeout(r, 900));
      const c = document.querySelector('.rcard'); if (!c) return null;
      const blocks = [...c.children].filter(x => !x.classList.contains('rconf')).map(x => ({ tag: x.tagName.toLowerCase(), cls: x.className, ci: +getComputedStyle(x).getPropertyValue('--ci') }));
      // build 57 (57.3): the confetti hangs on the HOST, so it covers the screen rather than the card
      const conf = document.querySelectorAll('#key-cere > .rconf .cf').length;
      const letters = c.querySelectorAll('.rtitle .cl').length;
      const big = parseFloat(getComputedStyle(c.querySelector('.rtitle')).fontSize) > parseFloat(getComputedStyle(c.querySelector('.ryou')).fontSize);
      const prev = c.querySelector('.rmsg .mprev');
      return { blocks, conf, letters, big, prev: !!prev, frame: !!(prev && prev.querySelector('.mpframe')), play: !!(prev && prev.querySelector('.mpplay')), title: prev ? (prev.querySelector('.mptitle') || {}).textContent : '' }; });
    const staged = !!card53 && card53.blocks.length >= 4 && card53.blocks.every((b, i) => b.ci === i) && /rgo/.test(card53.blocks[card53.blocks.length - 1].cls);
    const confDrawn = !!card53 && card53.conf === CONF.games.n;
    const preview = !!card53 && card53.prev && card53.frame && card53.play && !!card53.title;
    (escal && gamesSquares && under1s && cheerGrows && staged && confDrawn && preview && cheerLook && card53.letters === 'Congratulations'.length && card53.big)
      ? ok(`v28 items 12 / 17 the congratulations screen: ${card53.blocks.length} blocks land one at a time ${RV53.cardStep}ms apart with Continue last (${Math.round(RV53.cardAt + (card53.blocks.length - 1) * RV53.cardStep + RV53.cardBlockMs)}ms end to end, inside a second); the message is the powered-off player - a framed picture with a play mark and "${card53.title}" under it; and ${card53.conf} confetti pieces throw with it, the seven game squares for this chest and ${CONF.key.n}/${CONF.pro.n}/${CONF.thorns.n} shards for the keys, each with its own celebration sound and none of them the unlock sound, the achievement click or a key's earn`)
      : bad('v28 items 12 / 17 / v29 57.3 the congratulations screen', JSON.stringify({ escal, gamesSquares, under1s, cheerGrows, staged, confDrawn, preview, cheerLook, card53, cheer }));

    /* v30 (59.2, build 59): AND THE WORD FITS ON ONE LINE, WITH CONTINUE STILL ON SCREEN — ALL FOUR CHESTS.
       57.3 rebuilt "Congratulations" letter by letter, which hands the browser a break opportunity between every letter, and
       sized it up; at 375px it snapped as CONGRATULA / TIONS on every chest, the card grew a whole line and Continue went off
       the bottom. The two invariants are asserted separately because they fail separately: the LETTERS all share one line
       (the only honest test of "one line" when the h3 is full width either way), and the word's measured span fits inside the
       card's content box — which is viewport-independent, so it holds at 375 and 390 alike. Then Continue's box is inside the
       viewport. The gate has no safe-area inset; the frames in _review/_shots taken WITH one (34px) are 59.2's own evidence,
       and there Continue's bottom lands 791-802 against a 810 floor on all four chests at both widths. */
    const fitAll = await page.evaluate(async () => {
      const RV = await import('./ui/reveal.js'), CE = await import('./ui/ceremony.js'), CH = await import('./ui/chest.js'),
        K = await import('./progress/key.js'), R = await import('./ui/router.js'), MS = await import('./config/messages.js'),
        CP = await import('./config/copy.js');
      const host = document.getElementById('key-cere'), out = {};
      for (const id of ['games', 'key', 'pro', 'thorns']) {
        RV.stopReveal(); R.show('s-key'); await new Promise(r => setTimeout(r, 250));
        const m = K.meter(), msg = MS.MESSAGES.find(x => x.by && x.by.chest === id);
        RV.playReveal(host, { kind: 'chest', id, silent: true, stage: CE.chestStage(id, { was: m, now: m }), gifts: CH.giftsOf(id),
          card: { title: CP.CARD.title, chest: id, col: CH.chestCol(id), you: CP.CARD.you[id] || 'y', next: CP.CARD.next,
            msg: msg ? msg.id : '', msgObj: msg || null } });
        for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 300)); if (host.classList.contains('tap')) break; }
        RV.revealTap(); await new Promise(r => setTimeout(r, 1200));
        const c = document.querySelector('.rcard'), t = c && c.querySelector('.rtitle'), go = c && c.querySelector('.rgo');
        if (!c || !t || !go) { out[id] = null; continue; }
        const cl = [...t.querySelectorAll('.cl')];
        // each letter drops in on its own beat, so wait for the last one to land before measuring anything about the word
        await Promise.all(cl.flatMap(s => s.getAnimations().map(a => a.finished.catch(() => {}))));
        // LINES off offsetTop, not off a client rect: a rect carries the drop-in's transform and would read a mid-flight
        // letter as a second line. offsetTop is layout, which is the only thing "one line" is a claim about.
        const ls = cl.map(s => s.getBoundingClientRect()), tops = cl.map(s => s.offsetTop);
        const cs = getComputedStyle(c);
        out[id] = { lines: new Set(tops).size, letters: ls.length,
          wordW: Math.round(Math.max(...ls.map(r => r.right)) - Math.min(...ls.map(r => r.left))),
          inner: Math.round(c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
          nowrap: getComputedStyle(t).whiteSpace === 'nowrap', goIn: go.getBoundingClientRect().bottom <= innerHeight + .5,
          goBottom: Math.round(go.getBoundingClientRect().bottom), vh: innerHeight };
      }
      RV.stopReveal(); return out;
    });
    const F4 = ['games', 'key', 'pro', 'thorns'];
    const oneLine = F4.every(id => fitAll[id] && fitAll[id].lines === 1 && fitAll[id].letters === 'Congratulations'.length);
    const insideCard = F4.every(id => fitAll[id] && fitAll[id].nowrap && fitAll[id].wordW <= fitAll[id].inner);
    const goOn = F4.every(id => fitAll[id] && fitAll[id].goIn);
    (oneLine && insideCard && goOn)
      ? ok(`v30 59.2 the congratulations word is ONE LINE and Continue is on screen, all four chests: 15 letters on a single line each, the word measuring ${F4.map(id => fitAll[id].wordW).join('/')}px inside card content boxes of ${F4.map(id => fitAll[id].inner).join('/')}px (white-space:nowrap plus a size taken off the CARD through container units, so it cannot outgrow what it sits in), and Continue's bottom at ${F4.map(id => fitAll[id].goBottom).join('/')} against a ${fitAll.games.vh}px viewport`)
      : bad('v30 59.2 the congratulations word on one line with Continue visible', JSON.stringify({ oneLine, insideCard, goOn, fitAll }));

    /* v30 (59.6, build 59): THE CHEST TILE CARRIES ONE LINE, AND THE GAUNTLET MOVED ONTO THE KEY.
       Two halves, asserted separately because they are two places. (1) NO tile, on any chest, in any state, prints more than one
       line — the thing that made the Author chest's text run over its own drawing was 58.2's two ticked requirements, and a
       newline in `data-need` is exactly what produced them. Driven at 375, the narrower phone, because that is where it failed.
       (2) The requirement is not lost: the Pro and Author KEYS now carry it as a standing line naming their Gauntlet, from the
       moment the tier is open rather than only once the key is whole. The Skill key has no Gauntlet and must stay silent. */
    await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const tiles59 = [];
    /* three profiles, chosen so every line a locked tile can print is actually produced: no key at all (its key line), every
       bar cleared with no Gauntlet finished (its Gauntlet line — the state 59.6 invents), and the chests behind it shut. */
    for (const [label, chests, fill] of [['no bars cleared', { games: 1 }, false], ['every bar cleared, no Gauntlet finished', { games: 1, key: 1 }, true], ['Pro chest open, every bar cleared', { games: 1, key: 1, pro: 1 }, true]]) {
      await boot({ snd: 'off', chests }, { unlock: ALL49 }, { plain: PLAIN48 });
      if (fill) await page.evaluate(async () => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
        const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1;
        S.store.bars = bars; S.save(); });
      await go('s-pick'); await sleep(800);
      tiles59.push([label, await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => {
        const c = document.querySelector(`#grid .chest[data-chest="${id}"]`); if (!c) return [id, null];
        return [id, { st: c.classList.contains('open') ? 'open' : c.classList.contains('ready') ? 'ready' : 'locked',
          need: c.querySelector('.pic').dataset.need || '', twoneed: c.classList.contains('twoneed') }]; })))]);
    }
    const oneLineTile = tiles59.every(([, m]) => Object.values(m).every(t => t && !/\n/.test(t.need) && !t.twoneed));
    const wield59 = await page.evaluate(async () => {
      const R = await import('./ui/router.js'), K = await import('./progress/key.js'), CP = await import('./config/copy.js');
      const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const [i, tier] of ['clear', 'pro', 'author'].entries()) {
        R.show('s-menu'); await wait(90); R.show('s-key', { tier: i }); await wait(420);
        const el = document.getElementById('key-wield');
        out[tier] = { gaunt: K.keyGaunt(tier), shown: !!el && !el.hidden, text: el ? el.textContent.trim() : '',
          want: K.keyGaunt(tier) ? CP.KEY.wield.replace('{name}', CP.GAUNTLET.name[K.keyGaunt(tier)]) : '' };
      }
      return out; });
    const wieldOk = !wield59.clear.gaunt && !wield59.clear.shown
      && ['pro', 'author'].every(t => wield59[t].gaunt && wield59[t].shown && wield59[t].text === wield59[t].want && /Gauntlet/.test(wield59[t].text));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    (oneLineTile && wieldOk)
      ? ok(`v30 59.6 a chest tile says ONE thing at 375px — never two ticked requirements over its own drawing — in every state of every chest (${tiles59.map(([l, m]) => l + ': ' + Object.values(m).map(t => '"' + t.need + '"').join(' ')).join(' | ')}); and the Gauntlet requirement moved onto the KEY, standing from the moment its tier opens: ${['pro', 'author'].map(t => t + ' "' + wield59[t].text + '"').join(' · ')}, with the Skill key silent because no Gauntlet wields it`)
      : bad('v30 59.6 the chest tile and the key wield line', JSON.stringify({ oneLineTile, wieldOk, tiles59, wield59 }));
  }

  /* ---- v29 Section A (58.2, build 58, quoting L6): A FINISHED GAUNTLET OPENS THE NEXT CHEST ----
     This reverses build 56 SS3's "a Gauntlet advances nothing" and Aiden authorised it on 2026-09-19. Five things are asserted, and the
     first is the one 58.2 asked to be CONFIRMED FROM CONFIG rather than assumed: that Gauntlet Mega comes out of the Pro chest, so each
     Gauntlet is in hand a whole chest before the chest that wants it. Then the gate itself: the chest is LOCKED with the key whole and no
     finished run, READY the moment a row lands, and an already-opened chest is never locked back out. ---- */
  {
    const chain58 = CH48.GAUNTLETS.map(g => g.id + '<-' + g.chest).join(' ');
    const mini = CH48.GAUNTLETS.find(g => g.id === 'g1'), mega = CH48.GAUNTLETS.find(g => g.id === 'g2');
    const pro58 = CH48.CHESTS.find(c => c.id === 'pro'), th58 = CH48.CHESTS.find(c => c.id === 'thorns');
    const wired = mini && mini.chest === 'key' && mega && mega.chest === 'pro' && pro58.gaunt === 'g1' && th58.gaunt === 'g2'
      && !CH48.CHESTS.find(c => c.id === 'games').gaunt && !CH48.CHESTS.find(c => c.id === 'key').gaunt;
    wired
      ? ok(`58.2 CONFIRMED from config: Gauntlet Mega DOES come out of the Pro chest and Gauntlet Mini out of the Skill chest (${chain58}), so the Pro chest can ask for Mini and the Author chest for Mega and each is in hand a whole chest before it is wanted. The Games and Skill chests ask for no Gauntlet`)
      : bad('58.2 the Gauntlet chain', JSON.stringify({ chain58, proGaunt: pro58.gaunt, thornsGaunt: th58.gaunt }));

    /* the gate itself, driven on the real store. Every bar of every tier cleared and the first two chests open, so the Pro chest's KEY is
       whole — the only thing between it and ready is a finished Gauntlet Mini. */
    const gate58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      S.prefs.allOpen = false; S.prefs.supporter = false;
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 };
      S.store.bars = {}; S.store.gaunt = [];
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c.bar) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.save(); await wait(60);
      out.keyWhole = K.keyState('pro').whole;
      out.shut = K.chestState('pro');
      out.needs = K.chestNeeds('pro').map(r => r.k + ':' + (r.done ? 1 : 0));
      out.keyHint = (K.keyChest('pro') || {}).state;
      // one finished run, the shape run/gauntlet.js writes
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 88.5, tier: 'clear', web: [] }]; S.save(); await wait(60);
      out.ready = K.chestState('pro');
      out.needsOn = K.chestNeeds('pro').map(r => r.k + ':' + (r.done ? 1 : 0));
      out.best = K.gauntBest('g1');
      out.hintOn = (K.keyChest('pro') || {}).state;
      // the Author chest is still behind the Pro chest, and wants Mega
      out.thorns = K.chestState('thorns');
      // NOBODY IS LOCKED BACK OUT: a chest already opened stays open with no row at all
      S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 0 }; S.store.gaunt = []; S.save(); await wait(60);
      out.stillOpen = K.chestState('pro');
      out.tierKept = K.tierOpen('author');
      // and the Author chest, whose turn it now is, is LOCKED on its Gauntlet rather than ready
      out.thornsShut = K.chestState('thorns');
      S.store.gaunt = [{ id: 'g2', t: Date.now(), score: 101, tier: 'clear', web: [] }]; S.save(); await wait(60);
      out.thornsReady = K.chestState('thorns');
      S.store.bars = {}; S.store.gaunt = []; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save();
      return out; });
    (gate58.keyWhole && gate58.shut === 'locked' && gate58.needs.join() === 'key:1,gaunt:0' && gate58.keyHint === 'gaunt'
      && gate58.ready === 'ready' && gate58.needsOn.join() === 'key:1,gaunt:1' && gate58.best === 88.5 && gate58.hintOn === 'ready'
      && gate58.thorns === 'before' && gate58.stillOpen === 'open' && gate58.tierKept && gate58.thornsShut === 'locked' && gate58.thornsReady === 'ready')
      ? ok('58.2 the CHEST is gated, not the key: with the Pro key whole and no Gauntlet Mini the Pro chest is LOCKED and lists both requirements with the key ticked, the key screen says the Gauntlet rather than promising a chest that will not open, and one finished run makes it READY. The Author chest is the same a step on. Migration holds — a chest already opened stays OPEN with the Gauntlet board emptied, and the tier it revealed stays revealed')
      : bad('58.2 the chest gate', JSON.stringify(gate58));

    // Testing's chest switches have to land exactly where play does, which means satisfying the Gauntlet too (S5)
    const dev58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const S = await import('./core/store.js');
      const out = {};
      S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.bars = {}; S.store.gaunt = []; S.save();
      out.pro = K.devReach('pro', P.devModesAll);
      out.rows = (S.store.gaunt || []).map(r => r.id + (r.dev ? ':dev' : ''));
      out.thorns = K.devReach('thorns', P.devModesAll);
      out.rows2 = (S.store.gaunt || []).map(r => r.id + (r.dev ? ':dev' : ''));
      out.meter = K.devMeterTo(300, P.devModesAll);
      K.devBack('pro', P.devModesAll);
      out.back = (S.store.gaunt || []).map(r => r.id);
      K.devBack('games', P.devModesAll); S.store.gaunt = []; S.save();
      return out; });
    (dev58.pro === 'ready' && dev58.rows.join() === 'g1:dev' && dev58.thorns === 'ready' && dev58.rows2.sort().join() === 'g1:dev,g2:dev' && dev58.meter === 300 && !dev58.back.length)
      ? ok(`58.2 Testing's chest switches still land where play does — the Pro and Author switches finish the Gauntlet their chest asks for, marked \`dev\` so it can never be read as a played run, "set meter to N%" still reaches ${dev58.meter}, and a reset takes the row out with the chest`)
      : bad('58.2 Testing past the Gauntlet gate', JSON.stringify(dev58));

    /* the MAP: a locked chest that wants two things lists both, ticks each, and a FINISHED Gauntlet wears a tick and its best score on its
       own tile. The Skill chest, which wants one thing, prints exactly the line it printed before. */
    // a chest with ONE requirement, locked, still prints exactly the line it printed before — a tick on a list of one says nothing
    await boot({ chests: {} }, {}, { plain: PLAIN48 });
    const one58 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      return document.querySelector('#grid .chest[data-chest="games"] .pic').dataset.need; });
    await boot({ chests: { games: 1, key: 1, pro: 0, thorns: 0 } }, {}, { plain: PLAIN48 });
    const map58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c.bar) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.store.gaunt = []; S.save();
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      const pic = id => document.querySelector(`#grid .chest[data-chest="${id}"] .pic`);
      const out = { shut: pic('pro').dataset.need,
        pre: getComputedStyle(pic('pro'), '::after').whiteSpace,
        tile: (() => { const t = document.querySelector('#grid .tile[data-gauntlet="g1"]'); return { done: t.classList.contains('done'), need: t.querySelector('.pic').dataset.need }; })() };
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 93.4, tier: 'clear', web: [] }]; S.save();
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      out.on = pic('pro').dataset.need;
      const t2 = document.querySelector('#grid .tile[data-gauntlet="g1"]');
      out.tileOn = { done: t2.classList.contains('done'), need: t2.querySelector('.pic').dataset.need };
      S.store.bars = {}; S.store.gaunt = []; S.save();
      return out; });
    /* AMENDED AT BUILD 59 (v30 59.6): the locked tile lists ONE requirement, not both. 58.2's two ticked lines wrapped to four on
       the Author chest and ran over its drawing, which is what 59.6 is; the tile now says the first thing still missing. The
       requirement itself is untouched \u2014 the chest still wants the key AND the Gauntlet, `chestNeeds` still returns both, the
       chest's Progress tab still lists both, and the key's own screen now names the Gauntlet from the moment its tier opens.
       So what this asserts is the SAME fact through the new wording: with the key in hand and Gauntlet Mini unfinished, the Pro
       chest's one line is the GAUNTLET's, it is one line, it carries no tick marker, and finishing the run turns it to "tap to open". */
    (map58.shut.indexOf('\n') < 0 && !/^[\u2713\u00b7] /.test(map58.shut) && /Gauntlet Mini/.test(map58.shut)
      && one58.indexOf('\n') < 0 && !/^[\u2713\u00b7] /.test(one58)
      && !map58.tile.done && !map58.tile.need && map58.tileOn.done && /93/.test(map58.tileOn.need)
      && map58.on === CP48.GRID.chestOpen)
      ? ok(`58.2 / v30 59.6 the map says it in ONE line: with the Pro key whole and Gauntlet Mini unfinished the Pro chest says "${map58.shut}" and nothing else, a chest whose key is still missing says only that ("${one58}"), a finished Gauntlet Mini wears a tick on its own tile with its best score under it ("${map58.tileOn.need}"), and that same run turns the Pro chest's line into "${map58.on}"`)
      : bad('58.2 / v30 59.6 the map tile', JSON.stringify({ one58, map58 }));

    // the ceremony: the gauntlet hand carries the key in and turns it, on the two chests that want a Gauntlet and on neither of the others
    const hand58 = await page.evaluate(async () => { const CE = await import('./ui/ceremony.js');
      const host = document.createElement('div'); host.className = 'cere'; const inner = document.createElement('div');
      host.appendChild(inner); document.body.appendChild(host); const out = {};
      for (const id of ['games', 'key', 'pro', 'thorns']) { const st = CE.chestStage(id, { was: 0, now: 0, silent: true });
        st.start(inner, {}); const g = inner.querySelector('.ckeyg');
        out[id] = { hand: inner.querySelectorAll('.chand path').length, inKey: !!(g && g.querySelector('.chand')) };
        if (st.clear) st.clear(); }
      host.remove(); return out; });
    (!hand58.games.hand && !hand58.key.hand && hand58.pro.hand > 0 && hand58.pro.inKey && hand58.thorns.hand > 0 && hand58.thorns.inKey)
      ? ok(`58.2 in the chest's own opening the GAUNTLET HAND carries the key in and turns it — the same glove the map tile draws, inside the key's own group so the two move as one (${hand58.pro.hand} paths on the Pro chest, ${hand58.thorns.hand} on the Author chest), and neither the Games nor the Skill chest draws one`)
      : bad('58.2 the gauntlet hand', JSON.stringify(hand58));
  }

  /* ---- v31 (60.33, build 60): THE WELCOME CEREMONY ----
     The first thing the game ever gives a player arrived as one green toast among the others and a dot on a menu row, which Aiden
     called far too easy to miss. It is a moment of its own now, and each clause is driven rather than read: nothing at all before the
     first Quick Tap - Sprint opens the slot; then a full-screen moment carrying the SHARED television intro (PLAYER.on's own named
     steps, written onto the host as custom properties, so the thing announcing the clip and the thing that plays it are one object);
     PLAY opens the shared player; LATER closes it and leaves the Messages row green, because nothing here marks the clip watched; it
     refuses while a run is live; it fires ONCE per save; and its sound is its own, neither the unlock's nor the achievement click. */
  { const wc60 = await page.evaluate(async () => { const W = await import('./ui/welcome.js'), S = await import('./core/store.js');
      const M = await import('./config/messages.js'), K = await import('./progress/key.js'), A = await import('./audio.js');
      const wait = ms => new Promise(x => setTimeout(x, ms));
      const slot = M.MESSAGES[0], host = () => document.getElementById('welcome');
      const out = { slot: slot.id };
      S.prefs.allOpen = 0; S.prefs.supporter = 0; S.prefs.msgSeen = {}; delete S.prefs.welcomeSeen;
      // a save that has not played its first game: the slot is shut, so there is nothing to announce
      S.store.runs = []; S.save();
      out.beforeFirstRun = { open: K.msgOpen(slot), played: W.welcomeCheck(false), seen: !!S.prefs.welcomeSeen };
      // the run that opens it (v27 item 8: Quick Tap, the Sprint length)
      S.store.runs = [{ t: Date.now(), g: slot.by.run.g, d: 'two', s: slot.by.run.s, hits: 12, misses: 0, v: 4 }]; S.save();
      out.open = K.msgOpen(slot);
      out.duringRun = { played: W.welcomeCheck(true), seen: !!S.prefs.welcomeSeen };   // a live run is refused, and nothing is spent
      out.played = W.welcomeCheck(false);
      await wait(Math.max(900, M.PLAYER.on.ms + 400));
      const h = host();
      out.up = { shown: !!h && !h.hidden, stage: !!h.querySelector('.wframe'),
        label: (h.querySelector('.wcard em') || {}).textContent, title: (h.querySelector('.wcard b') || {}).textContent,
        buttons: [...h.querySelectorAll('.wrow .item')].map(b => b.dataset.act + ':' + b.textContent.trim()),
        steps: M.PLAYER.on.steps.map(x => x.name + '=' + h.style.getPropertyValue('--w-' + x.name + '-at').trim()) };
      W.closeWelcome(); out.again = W.welcomeCheck(false);                             // ONCE PER SAVE
      // LATER leaves the Messages row green, because it does not mark the clip watched
      delete S.prefs.welcomeSeen; S.save(); W.welcomeCheck(false); await wait(300);
      document.querySelector('[data-act="wlater"]').click(); await wait(200);
      out.afterLater = { closed: host().hidden, seen: !!(S.prefs.msgSeen || {})[slot.id], dot: K.msgDot() };
      // PLAY hands it to the shared player, so the clip behaves as every other message does
      delete S.prefs.welcomeSeen; S.save(); W.welcomeCheck(false); await wait(300);
      document.querySelector('[data-act="wplay"]').click(); await wait(500);
      const vp = document.getElementById('vplay');
      out.afterPlay = { closed: host().hidden, player: !!vp && !vp.hidden && vp.dataset.msg === slot.id };
      (await import('./ui/video.js')).closeVideo(); await wait(800);
      // and the sound is its own: recorded through Snd.plan and compared with the three it must never be
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const mine = sig(A.Snd.plan(() => A.Snd.welcome()));
      const others = [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.chestPlan('games').map(e => e.slice(0, 8)))];
      out.fx = { notes: A.Snd.plan(() => A.Snd.welcome()).length, clash: others.includes(mine), empty: !mine };
      S.store.runs = []; S.prefs.msgSeen = {}; delete S.prefs.welcomeSeen; S.save();
      return out; });
    (!wc60.beforeFirstRun.open && wc60.beforeFirstRun.played === false && !wc60.beforeFirstRun.seen && wc60.open
      && wc60.duringRun.played === false && !wc60.duringRun.seen && wc60.played === true && wc60.again === false
      && wc60.up.shown && wc60.up.stage && /message from/i.test(wc60.up.label || '') && wc60.up.title
      && wc60.up.buttons.length === 2 && wc60.up.buttons.some(b => /^wplay:/.test(b)) && wc60.up.buttons.some(b => /^wlater:/.test(b))
      && wc60.up.steps.length >= 3 && wc60.up.steps.every(x => /=\d+ms$/.test(x))
      && wc60.afterLater.closed && !wc60.afterLater.seen && wc60.afterLater.dot
      && wc60.afterPlay.closed && wc60.afterPlay.player
      && !wc60.fx.empty && !wc60.fx.clash && wc60.fx.notes >= 3)
      ? ok(`60.33 the Welcome message gets a moment of its own - nothing at all before the first Quick Tap run opens the slot, then a full-screen ceremony carrying the player's own television intro (${wc60.up.steps.join(', ')}) and a card ("${wc60.up.label}" - "${wc60.up.title}", ${wc60.up.buttons.join(', ')}); PLAY hands the clip to the shared player, LATER closes it and leaves the Messages row green because the clip is still unwatched, it refuses while a run is live and spends nothing doing so, it fires exactly ONCE per save, and its ${wc60.fx.notes}-note sound is neither the unlock's, the achievement click nor a chest's`)
      : bad('60.33 the Welcome ceremony', JSON.stringify(wc60)); }

  /* ---- v31 (60.32, build 60): A CLIP THAT FINISHES CLOSES ITSELF ----
     It dimmed its glow and held the last frame inside a lit frame until the player tapped outside, which reads as the thing
     having got stuck. Driven: a clip is opened, seeked to its end, and the player has to run its own power-off and go — with no
     hold on the last frame, which is measured as the off animation being under way in the same beat the clip ends. */
  { const vd60 = await page.evaluate(async () => { const V = await import('./ui/video.js'), R = await import('./ui/router.js');
      const M = await import('./config/messages.js');
      const wait = ms => new Promise(x => setTimeout(x, ms));
      const host = () => document.getElementById('vplay');
      R.show('s-about'); await wait(500);
      // playVideo takes the SLOT, not its id (a slot with no `file` is one that has no clip yet and is refused)
      const slot = M.MESSAGES.find(x => x.file) || M.MESSAGES[0];
      const opened = V.playVideo(slot);
      await wait(900);
      const h = host();
      const out = { opened, on: !!h && !h.hidden, msg: h && h.dataset.msg };
      const v = h && h.querySelector('video');
      if (!v) return Object.assign(out, { noVideo: true });
      // to the end, the way the clip itself gets there
      try { v.currentTime = Math.max(0, (v.duration || 1) - 0.05); } catch (e) {}
      v.dispatchEvent(new Event('ended'));
      await wait(60);
      out.offStarted = h.classList.contains('voff');
      await wait(M.PLAYER.off.ms + 400);
      out.closed = h.hidden && !h.dataset.msg;
      out.offMs = M.PLAYER.off.ms; out.steps = M.PLAYER.off.steps.map(s2 => s2.name).join(' · ');
      return out; });
    (vd60.on && vd60.offStarted && vd60.closed)
      ? ok(`60.32 a clip that finishes closes itself — the shared power-off (${vd60.steps}) starts on the ended event itself, with no hold on the last frame, and ${vd60.offMs}ms later the player is gone exactly as if the player had tapped outside`)
      : bad('60.32 the video does not close itself', JSON.stringify(vd60)); }

  /* ---- v31 (60.31, build 60): THE NEXT UP BLOCK ON A CONGRATULATIONS CARD ----
     "Next: can you open the Skill chest?" was one grey sentence in the same size and weight as the card's other grey sentences,
     and Aiden read past it. It is a block now — a small label in the NEXT key's own colour, the question under it in larger white
     type, that chest's own drawing beside it — under the message and just above Continue. Driven on three chests, because the
     claim is that EVERY card gets it in ITS OWN next key's colours, which one card cannot show. */
  { const nu60 = [];
    for (const [chest, next] of [['games', 'key'], ['key', 'pro'], ['pro', 'thorns']]) {
      await boot(PLAIN48);
      const r = await page.evaluate(async (chest, next) => { const K = await import('./progress/key.js'), P = await import('./progress.js');
        const R = await import('./ui/router.js'), CH = await import('./ui/chest.js');
        const wait = ms => new Promise(x => setTimeout(x, ms));
        K.devReach(next, P.devModesAll);
        R.show('s-key', { ceremony: chest, from: 's-testing' }); await wait(400);
        for (let i = 0; i < 400; i++) { const t = document.querySelector('.cere .ctap');
          if (t && getComputedStyle(t).opacity > .5) break; await wait(50); }
        const h = document.getElementById('key-cere');
        h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); h.click();
        for (let i = 0; i < 300 && !document.querySelector('.rcard'); i++) await wait(30);
        await wait(1700);
        const n = document.querySelector('.rnextup'); if (!n) return { chest, next, block: false };
        const em = n.querySelector('em'), b = n.querySelector('b');
        const go = document.querySelector('.rgo'), msg = document.querySelector('.rmsg');
        const rgb = c => { const d = document.createElement('i'); d.style.color = c; document.body.appendChild(d);
          const v = getComputedStyle(d).color; d.remove(); return v; };
        const nr = n.getBoundingClientRect();
        return { chest, next, block: true, label: em.textContent.trim(), line: b.textContent.trim(),
          labelColour: getComputedStyle(em).color, wantColour: rgb(CH.chestCol(next)),
          lineColour: getComputedStyle(b).color, labelPx: Math.round(parseFloat(getComputedStyle(em).fontSize)),
          linePx: Math.round(parseFloat(getComputedStyle(b).fontSize)), icon: !!n.querySelector('.rnsym'),
          belowMessage: msg ? Math.round(nr.top - msg.getBoundingClientRect().bottom) : null,
          aboveContinue: go ? Math.round(go.getBoundingClientRect().top - nr.bottom) : null }; }, chest, next);
      nu60.push(r);
    }
    const bad31 = nu60.filter(r => !r.block || r.labelColour !== r.wantColour || r.linePx <= r.labelPx
      || !r.icon || !/^Can you open the .+?$/.test(r.line)
      || !(r.belowMessage >= 0) || !(r.aboveContinue >= 0));
    bad31.length === 0
      ? ok(`60.31 every chest's congratulations card carries a NEXT UP block in its next key's own colours — ${nu60.map(r => r.chest + ' → ' + r.label.toLowerCase() + ' ' + r.labelColour + ' "' + r.line + '"').join('; ')} — each with that chest's own drawing, the question at ${nu60[0].linePx}px against the label's ${nu60[0].labelPx}px, under the message and above Continue`)
      : bad('60.31 the NEXT UP block', JSON.stringify(bad31)); }

  /* ---- v31 (60.30, build 60): THE WIELD LINE SAYS WHAT TO DO, GOES GREEN WHEN DONE, AND LEAKS NOTHING ----
     "Only Gauntlet Mega can wield it." states a fact and asks for nothing. It is "Unlock Gauntlet Mega to wield this key" now,
     with that Gauntlet's own icon beside it, and it turns green once the Gauntlet is finished. The third clause is the one worth
     driving: R1 says a secret may be known to exist and never what it is, so the line is NOT THERE before the chest that gives
     that Gauntlet has been opened — otherwise the Author key screen, which is reachable long before the Pro chest, would name
     Gauntlet Mega to a player who has never heard of it. */
  { await boot(PLAIN48);   // a clean profile: the check before this one opens chests, and R1's clause is about which are still shut
    const wl60 = await page.evaluate(async () => { const R = await import('./ui/router.js'), K = await import('./progress/key.js');
      const S = await import('./core/store.js'), P = await import('./progress.js'), C = await import('./config/chests.js');
      const wait = ms => new Promise(x => setTimeout(x, ms));
      const read = async ix => { R.show('s-key', { tier: ix, from: 's-testing' }); await wait(700);
        const w = document.getElementById('key-wield');
        return { hidden: w.hidden, done: w.classList.contains('done'),
          sym: w.querySelectorAll('.kwsym').length, text: (w.textContent || '').replace(/\s+/g, ' ').trim() }; };
      const out = {};
      // the Pro key with only the Skill chest open: Gauntlet Mini is out, so the line is there and not yet met
      /* devReach writes a `dev` Gauntlet row of its own to satisfy the chest it is filling (58.2), so the board is emptied AFTER
         it rather than before — otherwise the line under test would already be met. */
      K.devReach('pro', P.devModesAll); S.store.gaunt = []; S.save();
      out.proBefore = await read(1);
      // and the Author key at the same moment: Gauntlet Mega is still inside the Pro chest, so it says nothing at all (R1)
      out.authorHidden = await read(2);
      // finish Gauntlet Mini: the Pro key's line goes green
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 90, tier: 'clear', web: [] }]; S.save();
      out.proDone = await read(1);
      S.store.gaunt = []; S.save();
      out.gaunts = C.GAUNTLETS.map(g => g.id + '@' + g.chest);
      return out; });
    (!wl60.proBefore.hidden && wl60.proBefore.sym === 1 && /^Unlock Gauntlet Mini to wield this key$/.test(wl60.proBefore.text) && !wl60.proBefore.done
      && wl60.authorHidden.hidden && !wl60.authorHidden.text
      && !wl60.proDone.hidden && wl60.proDone.done && /Gauntlet Mini can wield this key/.test(wl60.proDone.text))
      ? ok(`60.30 the key's wield line asks for something and answers when it is done — the Pro key reads "${wl60.proBefore.text}" with Gauntlet Mini's own icon beside it, turns green as "${wl60.proDone.text}" the moment that Gauntlet is finished, and the AUTHOR key says nothing at all while Gauntlet Mega is still inside the Pro chest (R1: a secret may be known to exist, never what it is)`)
      : bad('60.30 the wield line', JSON.stringify(wl60)); }

  /* ---- v31 (60.29, build 60): A KEY THEME'S BACKGROUND RUNS EDGE TO EDGE ----
     Aiden: Lantern shows black bars about 50px wide left and right and ends before the bottom. Both were one rule — the key's
     radial ground was painted on #key-main, which sits inside the screen's own 24px padding and ends where the panel does, so a
     lighter wash sat in a box with the theme's darker background showing down each side and under it.
     TWO THINGS ARE MEASURED. The LAYER: the canvas the themes draw on is read at all four edges and all four corners, and every
     one has to be something other than the page's plain ground — which is what "runs edge to edge" means and is checked at the
     three widths the item names. The WASH: the element that draws the key's own ground has to cover the whole viewport, past the
     padding and past the safe areas. And the wheel has to sit clear of the key cards above it. */
  { const bg60 = [];
    for (const W of [375, 390, 430]) {
      await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await sleep(200);
      const r = await page.evaluate(async () => { const AT = await import('./ui/atmosphere.js'), R = await import('./ui/router.js');
        const wait = ms => new Promise(x => setTimeout(x, ms));
        const cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
        const ground = (() => { const d = document.createElement('i'); d.style.background = getComputedStyle(document.body).backgroundColor;
          document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove();
          return (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number); })();
        const at = (x, y) => { const d = cx.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
        const out = { w: document.documentElement.clientWidth, keys: {} };
        R.show('s-key'); await wait(400);
        for (const style of ['lantern', 'circuit', 'thorn']) {
          AT.setKeyLayer(style); await wait(900);
          const cw = cv.width, ch = cv.height, m = 2;
          /* WHAT IS AND IS NOT THE TEST. Not "a different colour from the page": Lantern's own sky IS the app's near-black by
             design (v30 59.7 laid it down opaque and left the dusk as a tint over it). Not "opaque" either: Circuit and Thorn
             draw their traces and branches OVER the page's own ground and leave the canvas clear between them, which is how they
             have always looked and is not what Aiden reported. The bars were an INSET — a lighter wash painted inside the
             screen's 24px padding with the darker background showing down each side and under it — so what is asserted is that
             nothing on this screen is inset: the canvas covers the viewport and its buffer matches its box at every width, and
             the key's own ground is fixed and covers the viewport too. The pixels are in the build-60 shots. */
          const pts = { topLeft: at(m, m), topRight: at(cw - 1 - m, m), bottomLeft: at(m, ch - 1 - m), bottomRight: at(cw - 1 - m, ch - 1 - m),
            top: at(cw >> 1, m), bottom: at(cw >> 1, ch - 1 - m), left: at(m, ch >> 1), right: at(cw - 1 - m, ch >> 1) };
          const box = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
          out.keys[style] = { clear: Object.keys(pts).filter(k => pts[k][3] < 250), buffer: cw + 'x' + ch,
            fitsBox: Math.abs(cw - Math.round(box.width * dpr)) <= 2 && Math.abs(ch - Math.round(box.height * dpr)) <= 2,
            coversViewport: box.width >= document.documentElement.clientWidth - 1 && box.height >= document.documentElement.clientHeight - 1 };
        }
        AT.setKeyLayer('lantern'); await wait(300);
        // the wash, and the wheel's clearance
        const wash = (() => { const el = document.getElementById('key-main'); if (!el) return null;
          const cs = getComputedStyle(el, '::before'); const w = parseFloat(cs.width), h = parseFloat(cs.height);
          return { pos: cs.position, w: Math.round(w), h: Math.round(h),
            coversW: w >= document.documentElement.clientWidth - 1, coversH: h >= document.documentElement.clientHeight - 1 }; })();
        const ring = document.getElementById('key-ring').getBoundingClientRect();
        const cards = document.getElementById('key-keys').getBoundingClientRect();
        return { ...out, wash, gap: Math.round(ring.top - cards.bottom) }; });
      bg60.push({ W, ...r });
    }
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await sleep(200);
    const bad29 = bg60.filter(r => !r.wash || !r.wash.coversW || !r.wash.coversH || r.wash.pos !== 'fixed' || r.gap < 12
      || Object.values(r.keys).some(k => !k.fitsBox || !k.coversViewport));
    bad29.length === 0
      ? ok(`60.29 every key theme's background runs edge to edge — Lantern, Circuit and Thorn at 375, 390 and 430 wide, on a buffer that matches the canvas's own box and a canvas that covers the whole viewport at each of them; the key's own wash is fixed and covers the whole viewport (${bg60[1].wash.w}×${bg60[1].wash.h}) rather than sitting inside the screen's 24px padding, which is what the "black bars" were; and the wheel clears the key cards by ${bg60[1].gap}px`)
      : bad('60.29 a key background has an edge', JSON.stringify(bad29)); }

  /* ---- v31 (60.1, build 60): THE ASK ANSWERS. END TO END, ON ALL THREE KEYS ----
     Build 59's 59.14 put a capture listener on `#s-key` so that while the chest prompt is up a tap ANYWHERE opens that chest. The
     prompt is still up while the ask box it raises is on screen, so that listener swallowed the taps on Open and Not yet as well and
     re-raised the same box: every player who earned the Skill key was stuck at the dialog with the chest unopened. Nothing in the
     gate caught it, because every chest check above opens a chest through Testing or through `openChest()` rather than through the
     two buttons a player actually taps.
     So this walks the player's path on each of the three key chests — earn the key, open its key screen, tap the key, tap Open — and
     fails unless the CEREMONY ACTUALLY PLAYS and the chest ends up open. Not yet is driven too, on its own raise, because the same
     listener ate it. The Pro and Author chests want a finished Gauntlet as well (L6, 58.2), so the fixture carries GAUNT_ALL. */
  const ask60 = {};
  for (const [chest, ix] of [['key', 0], ['pro', 1], ['thorns', 2]]) {
    await boot(PLAIN48);
    ask60[chest] = await page.evaluate(async (chest, ix) => { const R = await import('./ui/router.js'), K = await import('./progress/key.js');
      const P = await import('./progress.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      // Testing's own switch: every chest before this one filled and opened the way play does, and this one left READY
      K.devReach(chest, P.devModesAll);
      R.show('s-key', { tier: ix, from: 's-testing' }); await wait(1200);
      const out = { state: K.chestState(chest), prompt: document.getElementById('key-hint').classList.contains('kprompt') };
      const fire = sel => { const el = document.querySelector(sel); if (!el) return null;
        const ev = new PointerEvent('pointerdown', { bubbles: true, cancelable: true }); el.dispatchEvent(ev);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return { swallowed: ev.defaultPrevented }; };
      // the key's own hit disc raises the ask (C.1)
      out.tapKey = fire('#s-key [data-act="key-chest"]'); await wait(400);
      out.askUp = !document.getElementById('key-ask').hidden;
      // NOT YET closes it and opens nothing
      out.tapNo = fire('[data-act="key-ask-no"]'); await wait(300);
      out.closed = document.getElementById('key-ask').hidden; out.afterNo = K.chestState(chest);
      // raise it again and say OPEN
      fire('#s-key [data-act="key-chest"]'); await wait(400);
      out.tapYes = fire('[data-act="key-ask-yes"]'); await wait(700);
      const cere = document.getElementById('key-cere');
      out.cere = { shown: !cere.hidden, nodes: cere.querySelectorAll('svg,.cbig,.cchestg').length };
      await wait(700); out.after = K.chestState(chest);
      return out; }, chest, ix);
  }
  const askBad = Object.entries(ask60).filter(([id, r]) => !(r.state === 'ready' && r.prompt
    && r.askUp && r.tapNo && !r.tapNo.swallowed && r.closed && r.afterNo === 'ready'
    && r.tapYes && !r.tapYes.swallowed && r.cere.shown && r.cere.nodes > 0 && r.after === 'open'));
  askBad.length === 0
    ? ok(`60.1 the ask ANSWERS on all three key chests — the key's own tap raises "Open the … chest?", Not yet closes it and opens nothing, Open is not swallowed and the CEREMONY PLAYS (${Object.entries(ask60).map(([id, r]) => `${id}: ${r.cere.nodes} nodes drawn, ${r.state} → ${r.after}`).join('; ')})`)
    : bad('60.1 the ask does not answer', JSON.stringify(ask60));
}
