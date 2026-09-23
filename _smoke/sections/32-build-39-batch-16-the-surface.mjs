/* ---- 19. build 39 (batch 16, the surface - FEEDBACK-v23 §L.2-§L.5): Customise out of Progress, the partition, the labels, the stamp ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, part, section, check, ok, bad, root, read, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, up, named } from '../lib/gate.mjs';

export const SECTION = ["build 39 - batch 16, the surface"];

export async function run() {
  const html39 = read('index.html'), css39 = read('styles', 'app.css'), prog39 = read('ui', 'screens', 'progress.js'), cus39 = read('ui', 'screens', 'customise.js'), store39 = read('core', 'store.js');
  const INK39 = 'rgb(232, 230, 225)', OK39 = 'rgb(61, 214, 140)', RED39 = ['rgb(200, 50, 42)', 'rgb(179, 38, 30)', 'rgb(224, 69, 59)'];
  const NOW39 = Date.now();
  const PLAIN39 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };

  /* ---- 1. L.4a: Customise is its own screen, menu item and file again - content untouched (v18 B.31 amended, A4) ---- */
  {
    const custom = (html39.match(/<section class="screen top" id="s-custom"[\s\S]*?<\/section>/) || [''])[0];
    const prog = (html39.match(/<section class="screen top" id="s-prog"[\s\S]*?<\/section>/) || [''])[0];
    const ids = ['pv', 'pvg', 'pv-g', 'c-sq', 'c-lead', 'c-cut', 'c-bg', 'c-snd', 'c-scale', 'c-rate', 'c-track', 'c-menumusic', 'lk-sq', 'lk-lead', 'lk-cut', 'lk-bg', 'lk-snd', 'lk-scale', 'lk-rate', 'g-lead', 'g-cut', 'g-scale', 'g-rate'];
    const missing = ids.filter(id => !custom.includes(`id="${id}"`)), left = ids.filter(id => prog.includes(`id="${id}"`));
    // AMENDED at build 40 (v23 L.11a): the Customise row carries data-act="custom" so a locked tap can be refused
    // AMENDED at build 43 (v24 A.1): the Keys row carries data-act="keys" for the same reason
    const menu = [...html39.matchAll(/<button data-act="(?:go|custom|keys)" class="item glow" data-go="(s-[\w-]+)"[^>]*>([^<]+)</g)].map(m => m[2]);
    const code = { moved: /function renderCustom\(\)/.test(cus39) && /const Wheel=/.test(cus39) && /function pvStep\(\)/.test(cus39), gone: !/renderCustom|Wheel|pvStep|pvTry/.test(prog39), reg: /register\('s-custom'/.test(cus39), sibling: /from "\.\/[\w-]+\.js"/.test(cus39) };
    (!missing.length && !left.length && menu.join(' · ').includes('Progress · Keys · Customise · About') && code.moved && code.gone && code.reg && !code.sibling)
      ? ok(`L.4a Customise is its own screen again - all ${ids.length} of its controls on s-custom, none left on Progress, its own file importing no screen (A4), and a menu row: ${menu.join(' · ')}`)
      : bad('L.4a Customise out of Progress', JSON.stringify({ missing, left, menu, code }));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(1200);
    const live = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, groups: document.querySelectorAll('#s-custom .cgroup').length,
      sw: document.querySelectorAll('#c-sq button').length, g: document.getElementById('pv').dataset.g, scrolls: getComputedStyle(document.getElementById('s-custom')).overflowY }));
    /* AMENDED at build 42 (v23 L.7c): the Everywhere row was a tenth group. AMENDED AT BUILD 53 (v28 item 2): it is gone again - the Music
       row holds the key tracks now, so there are nine, which is what build 39 shipped. */
    // AMENDED AT BUILD 57 (v29 Section A, 57.11b): a tenth group — Background colour, split off the Background row
    (live.screen === 's-custom' && live.groups === 10 && live.sw > 1 && live.g && live.scrolls === 'auto')
      ? ok(`L.4a the menu row opens it: ${live.groups} groups, ${live.sw} target colours, previewing ${live.g}, and the screen scrolls as it did at build 32`)
      : bad('L.4a Customise opens from the menu', JSON.stringify(live));
    await click('#s-custom .back'); await sleep(400);
  }

  /* ---- 2. L.4b: the middle tab reads CUSTOMISE UNLOCKS, and three labels that long wrap the bar instead of shrinking the type ---- */
  {
    await click('[data-go="s-prog"]'); await sleep(500);
    const tb = await page.evaluate(() => { const cs = [...document.querySelectorAll('#prog-tabs .chip')];
      const probe = document.createElement('button'); probe.className = 'chip'; document.body.appendChild(probe); const base = getComputedStyle(probe).fontSize; probe.remove();
      return { tabs: cs.map(c => c.dataset.tab + ':' + c.textContent.trim()), sizes: [...new Set(cs.map(c => getComputedStyle(c).fontSize))], base, upper: cs.every(c => getComputedStyle(c).textTransform === 'uppercase'),
        rows: new Set(cs.map(c => c.offsetTop)).size, inside: cs.every(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), w: innerWidth }; });
    /* AMENDED at build 58 (58.3): SIX tabs, one per chest, and every label comes from GRID.chest or PROGRESS_SCREEN so the four chest names
       are still spelled in exactly one place. L.4b's rule is unchanged and is what is asserted — one type size, the chip's own, and the ROW
       wraps rather than the type shrinking. Six labels of that length wrap to THREE rows at 390px; that is the price of naming each chest in
       full rather than inventing a second, shorter spelling of it, and it is named in the outcome for Aiden to overrule. */
    const CH39b = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
    const CP39b = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const wantTb = CH39b.CHESTS.map(c => 'c-' + c.id + ':' + CP39b.GRID.chest[c.id]).concat(['cul:' + CP39b.PROGRESS_SCREEN.cul, 'ach:' + CP39b.PROGRESS_SCREEN.ach]).join('|');
    (tb.tabs.join('|') === wantTb && tb.upper && tb.sizes.length === 1 && tb.sizes[0] === tb.base && tb.inside)
      ? ok(`L.4b the tabs read ${tb.tabs.map(x => x.split(':')[1]).join(' · ')} in the chip's own ${tb.base} on ${tb.rows} row(s) at ${tb.w}px - the row wraps, the type does not shrink, nothing past the edge`)
      : bad('L.4b the tab bar', JSON.stringify({ tb, wantTb }));
    await click('#s-prog .back'); await sleep(400);
    // a profile left on the old Customise tab (builds 33-38) comes back on Customise unlocks, not on nothing
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1, progTab: 'cus' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const old = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab, cul: !document.getElementById('p-cul').hidden, rows: document.querySelectorAll('#cul-list .a').length }));
    (old.stored === 'cul' && old.cul && old.rows > 0)
      ? ok(`L.4b a stored 'cus' from builds 33-38 opens on Customise unlocks (${old.rows} rows) and is stored as 'cul'`) : bad('L.4b the old tab value', JSON.stringify(old));
    /* DELETED at build 58 (58.3), as CLAUDE.md's gate rule requires — a source-text check that fails on a refactor is deleted and named in the
       outcome, never re-spelled. It spelled the exact expression `cleanPrefs` used to clamp `progTab` to three values; there are six now and the
       clamp is a named function, `cleanTab`. What it stood for is DRIVEN instead, immediately above (a stored 'cus' lands on Customise unlocks)
       and at B.21's "the tab is remembered" block, which boots a profile holding the retired 'unl' and lands it on the Games chest tab. */
    // a stored value that is not one of the six falls back to the first tab, which is what an absent one does
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, menuSeen: 1, progTab: 'nonsense' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const junk39 = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab, chest: !document.getElementById('p-chest').hidden }));
    (junk39.stored === 'c-games' && junk39.chest)
      ? ok('L.4b / 58.3 a progTab value that is not one of the six falls back to the Games chest tab') : bad('L.4b the unknown tab value', JSON.stringify(junk39));
  }

  /* ---- 3. L.4c: the tabs are a PARTITION - disjoint, and together exactly ACH + keyAch(); the Games chest tab is the chain (L6).
     AMENDED at build 58 (58.3): SIX tabs, not three. Each key chest's tab holds that key's rows, Customise unlocks still holds every row with a
     payout, and Achievements holds what is left - the five Pro extras and the thirteen Secrets. The property being asserted has not changed at
     all: no row on two tabs, no row on none, and the six together are exactly ACH + keyAch(). ---- */
  {
    const pt = await page.evaluate(async () => { const P = await import('./progress.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const ids = s => [...document.querySelectorAll(s)].map(b => b.dataset.ach);
      const open = async tab => { R.show('s-menu'); await wait(100); R.show('s-prog', { tab }); await wait(400); };
      await open('c-games'); const unl = ids('#chest-list [data-ach]'), unlRows = document.querySelectorAll('#chest-list .urow').length;
      const chest = {};
      for (const tab of ['c-key', 'c-pro', 'c-thorns']) { await open(tab); document.querySelector('#chest-g [data-v="all"]')?.click(); await wait(300); chest[tab] = ids('#chest-list .a'); }
      await open('cul'); const cul = ids('#cul-list .a'), culHeads = [...document.querySelectorAll('#cul-list h4')].map(h => h.textContent.trim());
      await open('ach'); document.querySelector('#ach-g [data-v="all"]')?.click(); await wait(300); const ach = ids('#achlist .a');
      const keys = K.keyAch();
      // AMENDED at build 44 (v24 D.2): nine key roster rows carry a reward now, so "every row with an unlocks field" reads both lists
      return { unl, unlRows, chest, cul, culHeads, ach, table: P.ACH.map(a => a.id).concat(keys.map(a => a.id)), withUnlocks: P.ACH.concat(keys).filter(a => a.unlocks).map(a => a.id),
        pureCul: P.ACH.concat(keys).filter(a => P.achTab(a) === 'cul').map(a => a.id), keyPaid: keys.filter(a => a.unlocks).length }; });
    const srt = a => a.slice().sort().join();
    const chestAll = [].concat(pt.chest['c-key'], pt.chest['c-pro'], pt.chest['c-thorns']);
    const everyTab = [pt.cul, pt.ach, pt.chest['c-key'], pt.chest['c-pro'], pt.chest['c-thorns']];
    const seen58 = {}; const both = []; for (const list of everyTab) for (const id of list) { if (seen58[id]) both.push(id); seen58[id] = 1; }
    const union = new Set(Object.keys(seen58));
    const lost = pt.table.filter(id => !union.has(id)), extra = [...union].filter(id => !pt.table.includes(id));
    const total58 = pt.cul.length + pt.ach.length + chestAll.length;
    // 58.3: Achievements keeps only what fits nowhere else - no row on it may also be on a chest tab
    const strays = pt.ach.filter(id => chestAll.includes(id));
    (!pt.unl.length && pt.unlRows > 0 && !both.length && !lost.length && !extra.length && !strays.length && total58 === pt.table.length)
      ? ok(`L.4c / 58.3 the six tabs are a partition: the Games chest ${pt.unlRows} rows and no achievement (L6), the Skill chest ${pt.chest['c-key'].length}, the Pro chest ${pt.chest['c-pro'].length}, the Author chest ${pt.chest['c-thorns'].length}, Customise unlocks ${pt.cul.length}, Achievements ${pt.ach.length} - disjoint, and together exactly ACH + keyAch() (${pt.table.length})`)
      : bad('L.4c the partition', JSON.stringify({ unl: pt.unl, both, lost, extra, strays, n: [pt.cul.length, pt.ach.length, chestAll.length, pt.table.length] }));
    (srt(pt.cul) === srt(pt.withUnlocks) && srt(pt.pureCul) === srt(pt.cul) && pt.keyPaid === 9)
      ? ok(`L.4c Customise unlocks is every row with an unlocks field and nothing else, by achTab() - grouped ${pt.culHeads.join(' / ')}`)
      : bad('L.4c what the middle tab holds', JSON.stringify({ cul: pt.cul, want: pt.withUnlocks }));
    // an achievement toast, and a locked cosmetic's line, open Progress on the tab the row lives on, at the row
    const route = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'first' }); await wait(500);
      const a = { cul: !document.getElementById('p-cul').hidden, flash: !!document.querySelector('#cul-first.flash') };
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'qt_sab' }); await wait(500);
      const b = { ach: !document.getElementById('p-ach').hidden, flash: !!document.querySelector('#ach-qt_sab.flash') };
      // 58.3: a KEY row lands on its own chest's tab - `qt_bclean5` is one of the 23 roster rows that kept an older id, at key 1, so the Skill chest
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'qt_bclean5' }); await wait(500);
      const c = { chest: !document.getElementById('p-chest').hidden, tab: JSON.parse(localStorage.getItem('ne')).prefs.progTab, flash: !!document.querySelector('#c-key-qt_bclean5.flash') };
      return { a, b, c }; });
    (route.a.cul && route.a.flash && route.b.ach && route.b.flash && route.c.chest && route.c.tab === 'c-key' && route.c.flash)
      ? ok('L.4c / 58.3 {ach} lands on the tab that row lives on: Showed up on Customise unlocks, Committed on Achievements, and a key-1 roster row on the SKILL CHEST tab - each row flashed')
      : bad('L.4c where {ach} lands', JSON.stringify(route));
  }

  /* ---- 4. L.2 + L.4d: every label white until earned and green once, on all three tabs, never red; an earned middle-tab row opens
     Customise with its item picked out (not applied); an unearned one still goes to play it ---- */
  {
    const flat = css39.replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = { red: /em\.u\{/.test(flat), cueOnLabel: /\.(?:ach|unl)[^{}]*\bem[^{}]*\{[^}]*var\(--(?:cue|miss)\)/.test(flat), cls: /\?'u':''/.test(prog39) };
    (!rule.red && !rule.cueOnLabel && !rule.cls)
      ? ok('L.2 the build-8 red label rule (.ach .lock em.u in --cue) is gone, and no Progress label rule reads a red') : bad('L.2 a red label rule is left', JSON.stringify(rule));
    // AMENDED at build 40 (v23 L.11a): an earned middle-tab row opens Customise only once the Games chest is open, so this profile has it
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN39, chests: { games: 1 } }, runs: [{ t: NOW39, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 9, misses: 0 }], ach: { first: NOW39, qt_bclean5: NOW39, qt_sab: NOW39 }, unlock: { 'quick-tap:four': NOW39 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const lab = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      for (const [t, s] of [['c-games', '#chest-list .urow'], ['c-key', '#chest-list .a'], ['cul', '#cul-list .a'], ['ach', '#achlist .a']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(1800);
        out[t] = [...document.querySelectorAll(s)].map(b => ({ id: b.dataset.ach || b.dataset.d || 'key', done: b.classList.contains('done'), cols: [...b.querySelectorAll(':scope > .rw, :scope > em')].map(e => getComputedStyle(e).color) })); }
      return out; });
    const judge = rows => { const wrong = rows.filter(r => !r.cols.length || r.cols.some(c => c !== (r.done ? OK39 : INK39))); return { n: rows.length, done: rows.filter(r => r.done).length, wrong: wrong.length, sample: wrong[0] }; };
    // AMENDED at build 58 (58.3): the Game unlocks tab is the Games chest tab, and a key chest tab is walked beside it - same rule, more tabs
    const J = { 'c-games': judge(lab['c-games']), 'c-key': judge(lab['c-key']), cul: judge(lab.cul), ach: judge(lab.ach) };
    const reds = Object.values(lab).flat().flatMap(r => r.cols).filter(c => RED39.includes(c)).length;
    (['c-games', 'c-key', 'cul', 'ach'].every(t => J[t].n && J[t].done && J[t].done < J[t].n && !J[t].wrong) && !reds)
      ? ok(`L.2 every label is white until earned and green once, on every tab - the Games chest ${J['c-games'].done}/${J['c-games'].n}, the Skill chest ${J['c-key'].done}/${J['c-key'].n}, Customise unlocks ${J.cul.done}/${J.cul.n}, Achievements ${J.ach.done}/${J.ach.n} earned - and not one is red`)
      : bad('L.2 the label colours', JSON.stringify({ J, reds }));
    const nav = await page.evaluate(async () => { const R = await import('./ui/router.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const on = () => (document.querySelector('.screen.on') || {}).id;
      const open = async id => { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: 'cul' }); await wait(500); document.getElementById('cul-' + id)?.click(); await wait(500); };
      const out = {};
      await open('first');
      out.first = { screen: on(), ring: !!document.querySelector('#c-sq button[data-v="#FFE9C4"].pvw'), applied: Object.values(S.prefs.col || {}).some(c => c && c.sq === '#FFE9C4') };
      S.store.ach.dt_pin = Date.now(); S.save(); await open('dt_pin');
      out.game = { screen: on(), g: document.getElementById('pv').dataset.g, ring: !!document.querySelector('#c-sq button[data-v="#FFD1DC"].pvw') };
      S.store.ach.every = Date.now(); S.save(); await open('every');
      out.lead = { screen: on(), g: document.getElementById('pv').dataset.g, shown: document.getElementById('g-lead').style.display !== 'none', ring: !!document.querySelector('#c-lead button[data-v="#FFB020"].pvw') };
      await open('dt_sweep');
      out.unearned = { screen: on(), box: document.getElementById('lockwrap').classList.contains('on') };
      return out; });
    if (nav.unearned.box) { await click('#lock-no'); await sleep(300); }
    (nav.first.screen === 's-custom' && nav.first.ring && !nav.first.applied && nav.game.screen === 's-custom' && nav.game.g === 'dots' && nav.game.ring)
      ? ok(`L.4d an earned row opens Customise with its item ringed - Showed up's target colour picked out and NOT applied, Pinpoint previewed on its own game (${nav.game.g})`)
      : bad('L.4d an earned row goes to Customise', JSON.stringify(nav));
    (nav.lead.screen === 's-custom' && nav.lead.shown && nav.lead.ring)
      ? ok(`L.4d Every game's lead colour is shown on a game that has a lead row (${nav.lead.g}) - the build-38 tab scrolled to a hidden row there`)
      : bad('L.4d a payout into a hidden group', JSON.stringify(nav.lead));
    (nav.unearned.screen === 's-pick' || (nav.unearned.screen === 's-prog' && nav.unearned.box))
      ? ok(`L.4d an unearned row still goes to play it - Sweep ${nav.unearned.box ? 'asks the lock box, Dots being locked on this profile' : 'opens its sheet'}`)
      : bad('L.4d an unearned row', JSON.stringify(nav.unearned));
  }

  /* ---- 5. L.5: the build stamp never sits on the last thing a scrolling screen holds. Every scroller ends with --stampclear of
     space; each is scrolled to the bottom and its last control measured against the stamp ---- */
  {
    const flat = css39.replace(/\/\*[\s\S]*?\*\//g, '');
    const autos = [...flat.matchAll(/(?:^|\})\s*([^{}@]+?)\s*\{[^}]*overflow-y:auto/g)].flatMap(m => m[1].split(',').map(s => s.trim()));
    const spacer = ((flat.match(/([^{}]+)\{content:"";display:block;flex:none;height:var\(--stampclear\)\}/) || [])[1] || '').split(',').map(s => s.trim());
    /* AMENDED at build 46 (v25 item 22): `.rcard` is the congratulations card, and it is the second exemption. The rule exists because the stamp is
       drawn BEHIND every screen (item 4) and a screen's last control would otherwise sit over it; the card lives inside `.cere`, a fixed overlay at
       z-index 60 with its own opaque panel, so the stamp is behind the whole layer and cannot reach its last control. A scroller that is part of a
       SCREEN still joins the selector or this fails. */
    const OVERLAY = ['.otwrap', '.rcard'];
    const bare = autos.filter(s => !OVERLAY.includes(s) && !spacer.includes(s + '::after'));
    (/--stampclear:calc\(var\(--stampat\) \+ var\(--stamp\) \+ 16px\)/.test(flat) && /#build\{[^}]*bottom:var\(--stampat\)[^}]*font:500 var\(--stamp\)\/1/.test(flat) && autos.length && !bare.length)
      ? ok(`L.5 every overflow-y:auto scroller on a SCREEN ends with the stamp's offset + height + a 16px line of space (${autos.filter(s => !OVERLAY.includes(s)).join(', ')}); the two inside fixed overlays are left out - .otwrap, the result's top-10 box, and .rcard, the congratulations card at z-index 60`)
      : bad('L.5 a scroller without the stamp clearance', JSON.stringify({ autos, bare, spacer }));
    const runs = Array.from({ length: 10 }, (_, i) => ({ t: NOW39 - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: 'AIDEN', v: 4, hits: 10 + i, misses: 0 }));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1, name: 'AIDEN', keySeen: 1 }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const st = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const stamp = document.getElementById('build').getBoundingClientRect();
      const one = async (label, screen, opts, sel, prep, lastSel) => { R.show('s-menu'); await wait(120); R.show(screen, opts); await wait(900); if (prep) { prep(); await wait(700); }
        const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return { label, none: 1 };
        const oy = getComputedStyle(el).overflowY, scrolls = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
        el.scrollTop = el.scrollHeight; await wait(300);
        const kids = [...el.children].filter(c => c.getClientRects().length && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
        const last = lastSel ? document.querySelector(lastSel) : kids[kids.length - 1];
        const lb = last ? last.getBoundingClientRect().bottom : 0, eb = el.getBoundingClientRect().bottom, vis = Math.min(lb, eb);
        return { label, scrolls, bottom: Math.round(vis), clear: vis <= stamp.top, last: last ? (last.id ? '#' + last.id : String(last.className || last.tagName)) : null }; };
      const out = [];
      for (const g of ['quick-tap', 'dots', 'hold', 'sequence', 'timing']) out.push(await one('Customise · ' + g, 's-custom', { g }, '#s-custom'));
      out.push(await one('Progress · Game unlocks', 's-prog', { tab: 'unl' }, '#unl-list'));
      out.push(await one('Progress · Customise unlocks', 's-prog', { tab: 'cul' }, '#cul-list'));
      out.push(await one('Progress · Achievements', 's-prog', { tab: 'ach' }, '#achlist'));
      out.push(await one('Scores', 's-board', {}, '#s-board .scroll'));
      out.push(await one('Keys · Quick Tap open', 's-key', {}, '#key-list', () => document.querySelector('.knode[data-kg="quick-tap"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
      out.push(await one('Game select · Quick Tap sheet', 's-pick', { g: 'quick-tap', d: 'two' }, '#s-pick', null, '#go-btn'));
      out.push(await one('About', 's-about', {}, '#s-about'));
      out.push(await one('Testing', 's-testing', {}, '#s-testing'));
      R.show('s-menu'); return { top: Math.round(stamp.top), out }; });
    const under = st.out.filter(r => !r.none && !r.clear), none = st.out.filter(r => r.none).map(r => r.label);
    console.log('       L.5 measured: ' + st.out.map(r => r.none ? `${r.label} (not drawn)` : `${r.label} ${r.scrolls ? 'SCROLLS' : 'fits'} ${r.bottom}px`).join(' | '));
    (!under.length)
      ? ok(`L.5 scrolled to the bottom, nothing ends under the stamp (its top at ${st.top}px). Scrolls at 390x844: ${st.out.filter(r => r.scrolls).map(r => r.label).join(', ') || 'none'}${none.length ? '; not drawn: ' + none.join(', ') : ''}`)
      : bad('L.5 the stamp covers a last control', JSON.stringify({ top: st.top, under }));
  }
}
