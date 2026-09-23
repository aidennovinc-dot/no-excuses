/* ---- 10. build 29 (v17 §B.19–§B.26): the front of the app ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, GAMES, sleep, section, ok, bad, root, read, REVIEW, rvRead, noReview, at, browser, page, click, setStorage, OPEN_PREFS, SEEN_INTRO, down, up, revealDone, verdict, driveToResult, openSheet, named } from '../lib/gate.mjs';

export const SECTION = ["build 29 - v17 sections B.19 to B.26"];

export async function run() {
  const V29 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const AU29 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const TH29 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const C29 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const html29 = read('index.html');
  const css29 = read('styles', 'app.css');

  // ---- B.20: the first-run menu line is gone from the markup AND from the copy, not merely unrendered ----
  {
    const inHtml = /menu-note/.test(html29), inCopy = C29.MENU.note !== undefined, inCss = /\.menu-note\s*\{/.test(css29);
    (!inHtml && !inCopy && !inCss) ? ok('B.20 "play one run · the rest opens" is gone - the element, the copy row and the rule')
      : bad('B.20 the first-run menu line', JSON.stringify({ inHtml, inCopy, inCss }));
  }
  /* ---- B.21: one menu item, and the old screens are gone from the document ----
     AMENDED at build 33 (v18 B.31): THREE tabs, not two — Customise joined them and `s-custom` went the way `s-unl`
     and `s-ach` went at build 29. The point of the assertion is unchanged and is what it still tests: one menu row
     where there were two (three now), no orphan screen left in the document, and Game unlocks first (2.2). */
  {
    // AMENDED at build 58 (58.3): the chip row is BUILT by the screen from CHESTS now, so the screen has to be open before it can be read
    await click('[data-go="s-prog"]'); await sleep(500);
    const m = await page.evaluate(() => ({
      // AMENDED at build 40 (v23 L.11a): the Customise row carries "open the Games chest" under its label while locked, so read the label alone
      items: [...document.querySelectorAll('#s-menu .item')].map(b => (b.firstChild ? b.firstChild.textContent : b.textContent).trim()),
      prog: !!document.getElementById('s-prog'),
      old: !!document.getElementById('s-unl') || !!document.getElementById('s-ach'), custom: !!document.getElementById('s-custom'),
      tabs: [...document.querySelectorAll('#prog-tabs .chip')].map(c => c.dataset.tab) }));
    await click('#s-prog .back'); await sleep(400);
    // AMENDED at build 39 (v23 L.4a / L.4b): Customise is a menu row and a screen again, and the middle tab is Customise unlocks
    /* TURNED OVER at build 58 (58.3): SIX tabs, one per chest in the order they open, then Customise unlocks and Achievements. What B.21
       and B.31 stand for is unchanged — ONE menu item, one screen file, and the chain's tab first (2.2) — and that is what is asserted; the
       list of tab ids is read off config/chests.js so it cannot be a second copy of the chest order. */
    const { CHESTS: CH58 } = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
    const wantTabs58 = CH58.map(c => 'c-' + c.id).concat(['cul', 'ach']).join();
    (m.prog && !m.old && m.custom && m.items.includes('Progress') && !m.items.includes('Unlocks') && !m.items.includes('Achievements') && m.items.includes('Customise') && m.tabs.join() === wantTabs58)
      ? ok(`B.21 / B.31 one menu item - ${m.items.join(' · ')} - with tabs ${m.tabs.join(' / ')}, the Games chest first (2.2)`)
      : bad('B.21 / B.31 Unlocks, Customise and Achievements are one item with one tab per chest', JSON.stringify({ m, wantTabs58 }));
    const files = fs.readdirSync(path.join(root, 'ui', 'screens'));
    (!files.includes('unlocks.js') && !files.includes('achievements.js') && files.includes('progress.js'))
      ? ok('B.21 one screen file, not a host importing two (A4)') : bad('B.21 the two screen files are merged', files.join(', '));
  }
  // B.21: the tab is remembered, and the tab that is up is the one that is rendered
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(400);
    const a = await page.evaluate(() => ({ unl: !document.getElementById('p-chest').hidden, rows: document.querySelectorAll('#chest-list .urow').length }));
    await click('#prog-tabs [data-tab="ach"]'); await sleep(400);
    const b = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden, rows: document.querySelectorAll('#achlist .a').length, stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }));
    await click('#s-prog .back'); await sleep(300); await click('[data-go="s-prog"]'); await sleep(400);
    const c = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden }));
    (a.unl && a.rows > 0 && b.ach && b.rows > 0 && b.stored === 'ach' && c.ach)
      ? ok(`B.21 both tabs render (${a.rows} unlock rows on the Games chest, ${b.rows} achievements) and the last tab is remembered`)
      : bad('B.21 the tabs', JSON.stringify({ a, b, c }));
  }
  // ---- B.19: "tap to begin" sits higher and fades at 1.5x the old pace. L1 - placement and pace only ----
  {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(5200);
    const h = await page.evaluate(() => { const el = document.getElementById('storyhint'); const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { dur: cs.animationDuration, delay: cs.animationDelay, top: Math.round(r.top), vh: window.innerHeight, text: el.textContent.trim(),
        lines: [...document.querySelectorAll('#s-menu .stline')].map(x => x.textContent.trim()), title: (document.getElementById('wordmark') || {}).textContent };
    });
    (h.dur === '1.2s' && h.delay === '4.6s') ? ok(`B.19 "tap to begin" fades over ${h.dur}, 1.5x the old .8s, still last of the four beats`)
      : bad('B.19 the fade is 1.5x', JSON.stringify({ dur: h.dur, delay: h.delay }));
    (h.top < h.vh * 0.75 && h.top > h.vh * 0.5) ? ok(`B.19 it sits toward the middle - ${Math.round(100 * h.top / h.vh)}% down, was pinned to the bottom edge`)
      : bad('B.19 it sits higher', `top ${h.top} of ${h.vh}`);
    (h.text === 'tap to begin' && h.lines.length === 2 && /NO EXCUSES/i.test(h.title || '')) ? ok('B.19 / L1 nothing removed or shortened - both story lines, the title and the hint')
      : bad('B.19 / L1 the sequence is intact', JSON.stringify(h.lines));
  }
  // ---- B.22 / B.23 / B.24: the grid - the pressed outline, the path, the chest ----
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(800);
    // B.22 - the outline is the named colour, and it is neither L8's green nor L7's white
    await click('.tile[data-game="dots"]'); await sleep(400);
    const pr = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="dots"]');
      // AMENDED at build 37 (v22 §K): with the mode sheet up the pressed tile DEMOTES to the line colour - the mode is the live choice - so read it both ways
      const grid = document.getElementById('grid'), wasDim = grid.classList.contains('dim'), dimCol = getComputedStyle(t.querySelector('.pic')).outlineColor; grid.classList.remove('dim');
      const cs = getComputedStyle(t.querySelector('.pic')); const col0 = cs.outlineColor, w0 = cs.outlineWidth; if (wasDim) grid.classList.add('dim');
      return { keep: t.classList.contains('keep'), col: col0, width: w0, dimCol, wasDim,
        press: getComputedStyle(document.documentElement).getPropertyValue('--press').trim(),
        ok: getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() }; });
    const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    (pr.keep && pr.col === hex2rgb(TH29.PRESS.v) && pr.press === TH29.PRESS.v && pr.col !== hex2rgb(pr.ok) && !/255, 255, 255/.test(pr.col) && pr.wasDim && pr.dimCol === pr.col) /* AMENDED again at build 38 (Aiden): no mode chosen yet, so the tile keeps its amber with the sheet up */
      ? ok(`B.22 the pressed game wears an ${TH29.PRESS.name} outline (${pr.col}, ${pr.width}) - named in config/theme.js, not green (L8) and not white (L7)`)
      : bad('B.22 the pressed outline', JSON.stringify(pr));
    await click('#grid'); await sleep(400);
    // B.23 - the snake, Sequence directly under Estimate, and a line per step coloured by whether the next game is open
    const gr = await page.evaluate(async () => {
      const P = await import('./progress.js'); const R = await import('./games/registry.js');
      const order = Object.keys(R.GAMES);
      const cell = g => { const t = document.querySelector(`.tile[data-game="${g}"]`); return { r: +t.style.gridRow, c: +t.style.gridColumn }; };
      const at = Object.fromEntries(order.map(g => [g, cell(g)]));
      const chest = document.querySelector('.chest');
      // AMENDED at build 49 (v26 item 13): a Gauntlet's connector (.gt) hangs off its chest and is not a step of the chain
      const segs = [...document.querySelectorAll('#gridlines .gl:not(.gt)')].map(p => { const d = p.getAttribute('d').match(/-?[\d.]+/g).map(Number);
        return { len: Math.round(Math.hypot(d[2] - d[0], d[3] - d[1])), open: p.classList.contains('open') }; });
      return { at, chest: { r: +chest.style.gridRow, c: +chest.style.gridColumn }, segs, order,
        chests: ['games', 'key', 'pro', 'thorns'].filter(n => !document.querySelector(`.chest[data-chest="${n}"]`).hidden).length,   // AMENDED at build 40 (v23 L.10): four chests, by name
        opens: order.map(g => P.gameOpen(g)), cols: getComputedStyle(document.getElementById('grid')).gridTemplateColumns.trim().split(/\s+/).length };
    });
    const seq = gr.at.sequence, est = gr.at.hold;
    (seq.c === est.c && seq.r === est.r + 1) ? ok(`B.23 Sequence sits directly under Estimate (row ${est.r} col ${est.c} -> row ${seq.r}) so the path folds instead of jumping the row`)
      : bad('B.23 Sequence moves under Estimate', JSON.stringify({ est, seq }));
    // every step is one cell: the snake is what makes a straight line between neighbours possible at all
    const steps = gr.order.map(g => gr.at[g]).concat([gr.chest]);
    const jumps = steps.slice(1).map((p, i) => Math.abs(p.r - steps[i].r) + Math.abs(p.c - steps[i].c)).filter(d => d !== 1);
    (!jumps.length) ? ok(`B.23 every step of the order is one cell - a ${gr.cols}-column snake, ${steps.length} stops ending at the chest`)
      : bad('B.23 the order runs through neighbouring cells', jumps.join(', '));
    // AMENDED at build 34 (#411): a stop per game plus a stop per VISIBLE chest, so the lines between them are one fewer.
    // Hard-coding seven was only ever right for a profile with one chest; the post-chest-1 grid has always drawn nine.
    const stops = gr.order.length + gr.chests;
    (gr.segs.length === stops - 1 && gr.segs.every(s => s.len > 4))
      ? ok(`B.23 ${gr.segs.length} lines drawn for ${stops} stops (${gr.order.length} games + ${gr.chests} chest${gr.chests > 1 ? 's' : ''}), shortest ${Math.min(...gr.segs.map(s => s.len))}px`)
      : bad('B.23 a line per step', JSON.stringify({ segs: gr.segs, stops }));
    const wrong = gr.segs.slice(0, gr.order.length - 1).map((s, i) => s.open === gr.opens[i + 1] ? null : gr.order[i + 1]).filter(Boolean);
    (!wrong.length) ? ok('B.23 a segment is green where the game it leads to is open and grey where it is locked')
      : bad('B.23 the line colour follows the next game', wrong.join(', '));
    // B.24 - locked: the requirement is key 1's own count, and NOTHING about pro or author is anywhere on the grid (A.1)
    const ch = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const P = await import('./progress.js'); const el = () => document.querySelector('.chest');
      // #411: every chest takes the dev escapes, so A.1's subject - someone with no dev flag - has to be seeded for
      // AMENDED at build 40 (v23 L.10): the first chest is the GAMES chest, and locked it says the chain's own count, not key 1's
      const was = S.prefs.allOpen; S.prefs.allOpen = false; S.save();
      R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      const m = P.modeCount(); const out = { cls: el().className, id: el().dataset.chest, need: el().querySelector('.pic').dataset.need, open: m.open, total: m.total, k: K.keyState().total };
      out.shown = ['games', 'key', 'pro', 'thorns'].map(n => !document.querySelector(`.chest[data-chest="${n}"]`).hidden);
      out.needs = ['key', 'pro', 'thorns'].map(n => document.querySelector(`.chest[data-chest="${n}"] .pic`).dataset.need);
      out.text = (document.getElementById('s-pick').innerText || '') + ' ' + (el().querySelector('.pic').dataset.need || '');
      S.prefs.allOpen = was; S.save();
      return out; });
    (/locked/.test(ch.cls) && ch.id === 'games' && ch.need === `unlock every game · ${ch.open} of ${ch.total}`)
      ? ok(`B.24 AMENDED at build 40 (L.10c): the first chest is the Games chest, locked, saying what the chain asks: "${ch.need}"`) : bad('B.24 the locked chest', JSON.stringify(ch));
    // AMENDED at build 48 (v26 item 12): a locked key chest says what opens it in words - "Earn the Pro key" - and still no number
    (ch.shown.join() === 'true,true,true,true' && ch.needs.join('|') === 'Earn the Skill key|Earn the Pro key|Earn the Author key' /* AMENDED for build 49 (Aiden, after build 48): the Skill key */ && !/\d/.test(ch.needs.join('')))
      ? ok('B.24 / A.1 AMENDED at build 40 (v21 G.1, narrowing A.1; v23 L.10): with no dev flag all four chests are on the map, the Key, Pro and Author chests locked with the key that opens each (AMENDED at build 48, v26 item 12) and no number about what is inside')
      : bad('A.1 the grid mentions pro or author', JSON.stringify({ shown: ch.shown, text: ch.text.slice(0, 120) }));
  }
  /* B.24: every bar cleared -> the chest is openable, opens once, stores it, and says what it gave.
     AMENDED at build 40 (v23 L.8b / L.10): the chest key 1 opens is the KEY chest, behind the Games chest; a tap opens its key screen and
     the chest opens THERE by itself - there is no "Open the chest?" and no ask box in the page at all - and what it gave is its words */
  {
    const seed = await page.evaluate(async () => { const K = await import('./progress/key.js'); const U = await import('./config/unlocks.js'); const bars = {}, unlock = {};
      for (const c of K.COMBOS) bars[c.key] = Date.now(); for (const x of U.UNLOCKS) unlock[x.key] = Date.now(); return { bars, unlock }; });
    // AMENDED at build 43 (v24 B.2 / B.3): key 1's earn moment is marked seen, so the map's tap opens the chest straight away (an unseen one plays in full first — build 43's own section)
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, keySeen: 1, keyWhole: { clear: 1 }, progTab: 'unl', chests: { games: 1 } }, runs: [], ach: {}, unlock: seed.unlock, intro: SEEN_INTRO, seen: {}, bars: seed.bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const before = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { cls: c.className, need: c.querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap') }; });
    // AMENDED at build 41 (v23 L.6 / L.11b): the open is the Skill chest's CEREMONY on its key screen, and what it gave spills out on the map after "tap to continue"
    await click('.chest[data-chest="key"]'); await sleep(2300);
    const after = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.key,
      box: document.getElementById('key-cere').hidden ? '' : document.getElementById('key-cere').innerText.replace(/\s+/g, ' ').trim(), toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }));
    await revealDone(); await sleep(700);
    after.map = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, words: [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].map(x => x.dataset.w).join(' · ') }));
    (/ready/.test(before.cls) && before.need === 'tap to open' && !before.ask) ? ok('B.24 every bar cleared and the Skill chest is openable - and there is no ask box in the page (AMENDED at build 40, L.8b)') : bad('B.24 the openable chest', JSON.stringify(before));
    (after.screen === 's-key' && after.stored === 1 && after.box.toLowerCase().includes((C29.GRID.chest.key + ' opened').toLowerCase()) && !after.toast && after.map.screen === 's-pick' && /GAUNTLET/.test(after.map.words))
      ? ok(`B.24 a tap on the ready chest opens it once and for good, as its ceremony over the key screen - "${after.box}" - and its tap lands on the map with "${after.map.words}" beside it (AMENDED at build 43, B.2: the map's tap opens it, the key screen never does by itself)`) : bad('B.24 opening the chest', JSON.stringify(after));
    (!/\bauthor\b/i.test(after.box + ' ' + after.map.words)) ? ok('B.24 / A.1 an opened Skill chest says only what it gave - nothing about Author, which waits for the Pro chest') : bad('A.1 the opened chest', after.box + ' ' + after.map.words);
    // and it stays open across a reload, because it is progress and not a screen state
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400); await click('[data-go="s-pick"]'); await sleep(600);
    (await page.evaluate(() => document.querySelector('.chest[data-chest="key"]').classList.contains('open'))) ? ok('B.24 the chest is still open after a reload') : bad('B.24 the chest is stored');
  }
  // ---- B.25: one table of thresholds and lines, four tiers, five lines each, a colour and a sound per tier ----
  {
    const ids = V29.VERDICT_TIERS.map(t => t.id);
    const bad25 = [];
    for (const [k, row] of Object.entries(V29.VERDICTS)) {
      if (!Array.isArray(row.at) || row.at.length !== 3) bad25.push(k + ' at');
      if (row.at && !(row.at[0] > row.at[1] && row.at[1] > row.at[2])) bad25.push(k + ' thresholds out of order');
      for (const id of ids) { const l = (row.lines || {})[id];
        if (!Array.isArray(l) || l.length !== 5) bad25.push(`${k}:${id} has ${l ? l.length : 'no'} lines`);
        else if (new Set(l).size !== 5) bad25.push(`${k}:${id} repeats a line`); }
    }
    const noFx = ids.filter(id => !Array.isArray(AU29.VERDICT_FX[id]) || !AU29.VERDICT_FX[id].length);
    const noCol = V29.VERDICT_TIERS.filter(t => !/^#[0-9A-Fa-f]{6}$/.test(t.col)).map(t => t.id);
    (!bad25.length && !noFx.length && !noCol.length && ids.length === 4)
      ? ok(`B.25 ${ids.join(' / ')} - ${Object.keys(V29.VERDICTS).length} games, five lines a tier, ${Object.keys(V29.VERDICTS).length * 20} lines, every tier a colour and a sound`)
      : bad('B.25 the verdict table', [...bad25, ...noFx.map(x => x + ' has no sound'), ...noCol.map(x => x + ' has no colour')].join(' | '));
    // the old five-line table is gone from copy.js, not left behind to be read by accident
    (C29.VERDICTS === undefined) ? ok('B.25 the old five-line VERDICTS is out of config/copy.js') : bad('B.25 two verdict tables', 'copy.js still exports VERDICTS');
    // L4: light blue and red are the player colours, and the tiers use them - which is exactly why the colours are solo only
    const P = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
    const clash = V29.VERDICT_TIERS.filter(t => t.col === P.P1C || t.col === P.P2C).map(t => t.id);
    (clash.length === 2) ? ok(`B.25 / L4 ${clash.join(' and ')} ARE the player colours - which is why the tier colour is solo only`)
      : ok('B.25 the tier colours do not collide with the player colours');
  }
  // B.25 in the browser: a solo result wears its tier, a two-player one does not, and a line never repeats back to back
  {
    await setStorage({ ne: { v: 1, prefs: OPEN_PREFS, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const draw = await page.evaluate(async () => { const P = await import('./progress.js');
      const r = { g: 'quick-tap', d: 'two', s: 5, hits: 18, misses: 1, t: Date.now(), v: 2 };
      const out = []; for (let i = 0; i < 40; i++) out.push(P.verdict(r));
      const same = out.slice(1).filter((v, i) => v.line === out[i].line).length;
      const tiers = [...new Set(out.map(v => v.tier))];
      return { same, tiers, lines: [...new Set(out.map(v => v.line))].length, col: out[0].col }; });
    (draw.same === 0 && draw.tiers.length === 1 && draw.lines === 5)
      ? ok(`B.25 forty draws of one record: all ${draw.tiers[0]}, all five lines seen, never the same line twice running`)
      : bad('B.25 the line never repeats back to back', JSON.stringify(draw));
    await openSheet('quick-tap', 0, 0); await click('#go-btn'); await driveToResult('quick-tap', 'a run for the verdict', 30000);
    const solo = await page.evaluate(() => { const v = document.getElementById('verdict'); return { cls: v.className, col: getComputedStyle(v).color, text: v.textContent.trim() }; });
    const tier = V29.VERDICT_TIERS.find(t => solo.cls.includes('v-' + t.id));
    (tier && solo.text) ? ok(`B.25 the solo result wears its tier - ${tier.id} (${tier.name}), "${solo.text}"`) : bad('B.25 the solo verdict tier', JSON.stringify(solo));
    // a pass & play run: the line is there, the tier is not (L4)
    await openSheet('quick-tap', 0, 0, 1); await click('#go-btn');
    for (let i = 0; i < 3; i++) { const at = await driveToResult('quick-tap', 'pass & play for the verdict', 40000); if (at === 's-pass') { await click('#pass-go'); await sleep(400); continue; } break; }
    const two29 = await page.evaluate(() => { const v = document.getElementById('verdict'); return { cls: v.className, inline: v.style.color, text: v.textContent.trim() }; });
    (two29.cls === 'verdict' && !two29.inline) ? ok('B.25 / L4 a two-player result carries no tier colour - light blue and red stay the players')
      : bad('B.25 the tier is solo only', JSON.stringify(two29));
  }
  // ---- B.26: the review catalogue reads the same table, and prints the lines, the colours and the sounds ----
  rv1: {
    if (!REVIEW) { noReview('B.26 the review catalogue reads config/verdicts.js'); break rv1; }
    const gen = rvRead('scripts', 'catalogue.mjs');
    const tpl = rvRead('scripts', 'catalogue.template.html');
    const reads = /config\/verdicts\.js/.test(gen) && /verdicts/.test(gen);
    const prints = /id="verdicts"/.test(tpl) && /verd-host/.test(tpl) && /REF\.verdicts/.test(tpl);
    (reads && prints) ? ok('B.26 the catalogue reads config/verdicts.js out of the running app and prints a section per game')
      : bad('B.26 the review board shows the verdict tables', JSON.stringify({ reads, prints }));
  }
}
