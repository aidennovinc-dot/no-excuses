/* ---- 14. build 33 (v18 §B.28–§B.32): the surface ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, check, ok, bad, finished, root, read, at, page, reqs, click, setStorage, OPEN_PREFS, SEEN_INTRO, up, named, FONT_HOST } from '../lib/gate.mjs';

export const SECTION = ["build 33 - v18 sections B.28 to B.32"];

export async function run() {
  const html33 = read('index.html'), css33 = read('styles', 'app.css'), audio33 = read('audio.js');
  const prog33 = read('ui', 'screens', 'progress.js') + read('ui', 'screens', 'customise.js'), store33 = read('core', 'store.js');   // build 39: Customise's code is its own file again
  // v28 (items 2 / 3, build 53): the Music row holds the three key tracks now, titled by each key's own theme
  const KY33 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);

  /* ---- B.31: ONE screen, three tabs, one file. A4 forbids a screen importing a screen, so a tab host that called
     into customise.js would be the thing it forbids — this is the merge, and the file it replaced is gone. ---- */
  {
    const gone = fs.existsSync(path.join(root, 'ui', 'screens', 'customise.js'));   // AMENDED at build 39 (v23 L.4a): the file is back
    const idx = read('ui', 'screens', 'index.js');
    const markup = { custom: /id="s-custom"/.test(html33), row: /data-go="s-custom"/.test(html33), cus: /id="p-cus"/.test(html33) };
    (gone && /customise\.js"/.test(idx) && markup.custom && markup.row && !markup.cus)
      ? ok('B.31 AMENDED (v23 L.4a): customise.js is back and imported, s-custom and its menu row exist, and no #p-cus is left on s-prog')
      : bad('B.31 the merge', JSON.stringify({ gone, markup }));
    /* DELETED at build 58 (58.3), both of them, as CLAUDE.md's gate rule requires — a source-text check that fails on a refactor is
       deleted and named in the outcome, never re-spelled. The first read the three tab buttons out of index.html's own markup, and
       the tab row is built by ui/screens/progress.js from CHESTS now, so there is no markup to read. The second spelled the exact
       expression `cleanPrefs` used to clamp `progTab` to three values; there are six and the clamp is a named function. Both rules
       are still asserted, by driving the page: the tab list is read off #prog-tabs at B.21 above (against CHESTS, so it cannot be a
       second copy of the order), and the migration of a stored `unl` is driven at B.21's "the tab is remembered" block. */
    const keyRow = /data-go="s-key"/.test(html33);
    keyRow ? ok('B.31 Keys stays its own menu item') : bad('B.31 the Keys menu row');

    // each tab renders, and the one that is up is the only one rendered
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    // AMENDED at build 58 (58.3): six tabs, and the four chest tabs share one pane — so "one tab at a time" is asserted on the pane that is shown
    const walk = {};
    for (const t of ['c-games', 'c-key', 'c-pro', 'c-thorns', 'cul', 'ach']) { await click(`#prog-tabs [data-tab="${t}"]`); await sleep(600);
      walk[t] = await page.evaluate(t => ({ shown: [...document.querySelectorAll('#s-prog .ptab')].filter(p => !p.hidden).map(p => p.id),
        rows: document.querySelectorAll(t.startsWith('c-') ? '#chest-list .urow, #chest-list .a' : t === 'cul' ? '#cul-list .a' : '#achlist .a').length,
        needs: document.getElementById('p-chest').hidden ? null : document.querySelectorAll('#chest-need .urow').length,
        stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }), t); }
    const one58 = ['c-games', 'c-key', 'c-pro', 'c-thorns'].every(t => walk[t].shown.join() === 'p-chest')
      && walk.cul.shown.join() === 'p-cul' && walk.ach.shown.join() === 'p-ach';
    const rows58 = ['c-games', 'c-key', 'c-pro', 'c-thorns', 'cul', 'ach'].every(t => walk[t].rows > 0);
    // 58.2 / 58.3: the Pro and Author chest tabs list TWO requirements — the key and a finished Gauntlet — and the other two list one
    const needs58 = walk['c-games'].needs === 1 && walk['c-key'].needs === 1 && walk['c-pro'].needs === 2 && walk['c-thorns'].needs === 2 && walk.cul.needs === null && walk.ach.needs === null;
    (one58 && rows58 && needs58 && walk.ach.stored === 'ach')
      ? ok(`B.31 / 58.3 one tab at a time across six — ${walk['c-games'].rows} on the Games chest, ${walk['c-key'].rows} on the Skill chest, ${walk['c-pro'].rows} on the Pro chest, ${walk['c-thorns'].rows} on the Author chest, ${walk.cul.rows} customise unlocks and ${walk.ach.rows} achievements — the Pro and Author tabs listing two requirements each and the others one, and the last tab open is remembered`)
      : bad('B.31 / 58.3 the tabs render', JSON.stringify({ one58, rows58, needs58, walk }));
    /* an earned achievement still opens what it paid for — the same screen now, so it is a tab change and not a
       navigation. `first` ("Showed up") pays out the second target colour, which is why it is the row this earns. */
    // AMENDED at build 40 (v23 L.11a): an earned row opens Customise only once the Games chest is open, so the profile has it
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chests: { games: 1 } }, runs: [], ach: { first: Date.now() }, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    // AMENDED at build 39 (v23 L.4c / L.4d): Showed up pays out a colour, so it is on Customise unlocks, and it opens the Customise SCREEN
    await click('[data-go="s-prog"]'); await sleep(300); await click('#prog-tabs [data-tab="cul"]'); await sleep(500);
    const jumped = await page.evaluate(() => { const b = document.getElementById('cul-first'); if (!b) return null; const done = b.classList.contains('done'); b.click(); return done; });
    await sleep(600);
    const after = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, tab: 'screen',
      flashed: !!document.querySelector('#c-sq button.pvw') }));
    (jumped && after.screen === 's-custom' && after.flashed)
      ? ok('B.31 AMENDED (v23 L.4d): an earned achievement opens the Customise SCREEN and rings the swatch it paid for')
      : bad('B.31 the achievement payout', JSON.stringify({ jumped, after }));
  }

  /* ---- B.28: one music row, called Music, and it is the track. The locked half is asserted in the build-30 block
     above (amended there); this is the open half and the absence of everything the row used to carry. ---- */
  {
    const dead = { music: /id="c-music"/.test(html33), pv: /music-pv|track-pv/.test(html33 + prog33), label: /c-track-label|c-music-label/.test(html33 + prog33) };
    (!dead.music && !dead.pv && !dead.label)
      ? ok('B.28 the on / off row, both Preview buttons and the per-game row labels are gone — one row, called Music')
      : bad('B.28 what the row used to carry', JSON.stringify(dead));
    // unlock-all so the row is the open three; the locked shape is the build-30 block above
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    const row = await page.evaluate(() => { const grp = document.getElementById('c-track').parentElement;
      const b = [...grp.querySelectorAll('button')];
      return { label: grp.querySelector('.clabel').textContent, n: b.length, named: b.map(x => x.textContent), sel: b.filter(x => x.classList.contains('sel')).length }; });
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): SIX — this game's three tracks, then one track per key, titled by that key's own theme. B.28's
       shape is otherwise untouched: names only, exactly one selected, and no Preview / on / off anywhere on the row. */
    (row.label === 'Music' && row.n === 6 && row.sel === 1 && row.named.every(x => x && !/preview|^on$|^off$/i.test(x))
      && KY33.KEYS.every(k => row.named.some(x => x.trim().toUpperCase() === k.theme.toUpperCase())))
      ? ok(`B.28 / v28 item 2 the Music row is this game's three tracks and one per key, by name (${row.named.join(' · ')}), one of them selected`)
      : bad('B.28 the open music row', JSON.stringify(row));
  }

  /* ---- B.29: previewing a track silences the menu loop. loop() schedules a BAR at a time, so clearing the interval
     leaves the outgoing track ringing — the fix is that the bed's gain node is retired, and that is what is asserted:
     structurally in audio.js (a preview cannot start without it) and live, that a preview leaves one track playing. */
  {
    const cuts = { has: /function cut\(\)/.test(audio33), onRun: /function run\(t,id,sh\)\{ if\(tr\) cut\(\);/.test(audio33), onStop: /stop\(\)\{ clearInterval\(timer\); timer=0; cut\(\);/.test(audio33) };
    (cuts.has && cuts.onRun && cuts.onStop)
      ? ok('B.29 a track that replaces another cuts it first, and stopping cuts what is already scheduled')
      : bad('B.29 the cut', JSON.stringify(cuts));
    /* live: the loop, a preview over it, the hand back. Nobody in a Claude Code session can HEAR whether the overlap
       is gone (logged in UNVERIFIED.md) — what is testable is that the retire-and-rebuild path runs clean through a
       menu loop, a preview over it and the loop resuming, which is the sequence that used to leave two beds ringing. */
    const live = await page.evaluate(async () => { const M = await import('./audio.js');
      try { M.Music.menu('menu'); await new Promise(r => setTimeout(r, 250));
        M.Music.preview('quick-tap', 400); await new Promise(r => setTimeout(r, 700));
        M.Music.menu('menu'); await new Promise(r => setTimeout(r, 200)); M.Music.stop(); return { ok: 1 }; }
      catch (e) { return { err: String(e) }; } });
    live.ok ? ok('B.29 menu loop → preview → loop again runs clean: each bed is retired as the next one starts') : bad('B.29 the preview path', live.err);
  }

  /* ---- B.30: the locked line goes UNDER its row, never over it, and the toast is off this path ---- */
  {
    // a profile with nothing earned: the target-colour row has locked swatches
    // AMENDED at build 40 (v23 L.11a): Customise waits for the Games chest — this profile has it open and has earned nothing
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(600);
    const lock = await page.evaluate(() => { const b = document.querySelector('#c-sq button.locked'); if (!b) return { none: 1 };
      b.click(); return null; });
    await sleep(400);
    const shown = lock && lock.none ? null : await page.evaluate(() => { const ln = document.getElementById('lk-sq'), grp = document.getElementById('c-sq');
      const r = ln.getBoundingClientRect(), gr = grp.getBoundingClientRect(), t = document.getElementById('toast');
      return { text: ln.textContent.trim(), sameGroup: ln.parentElement === grp.parentElement, under: r.top >= gr.bottom - 1,
        ach: ln.dataset.ach, toast: t.classList.contains('on'),
        others: [...document.querySelectorAll('.lockline')].filter(x => x.textContent.trim()).length }; });
    (shown && shown.text && shown.sameGroup && shown.under && shown.ach && !shown.toast && shown.others === 1)
      ? ok(`B.30 a locked swatch says what opens it under its own row ("${shown.text.slice(0, 40)}…"), one line on the screen, no toast over anything`)
      : bad('B.30 the locked line', JSON.stringify(shown));
    // and the line is the way in: it opens the achievement that pays for it, on the tab beside it
    if (shown && shown.ach) { await click('#lk-sq'); await sleep(500);
      const to = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, ach: !document.getElementById('p-cul').hidden, row: !!document.querySelector('#cul-list .a.flash') }));
      (to.screen === 's-prog' && to.ach && to.row) ? ok('B.30 the locked line opens the achievement that earns it - on Customise unlocks, flashed (AMENDED at build 39, v23 L.4c)') : bad('B.30 where the line leads', JSON.stringify(to)); }
  }

  /* ---- B.32: the fonts are ours. No request leaves the origin for one, the faces are declared with swap, and the
     title's two are preloaded. `reqs` is every URL the page has asked for since the gate started. ---- */
  {
    const off = reqs.filter(FONT_HOST);
    !off.length ? ok(`B.32 no font request left the origin in ${reqs.length} requests — Google Fonts is gone`) : bad('B.32 a font request left the origin', [...new Set(off)].join(', '));
    /* AMENDED AT BUILD 59 (v30 59.5): a VARIABLE face declares a weight RANGE ("700 900"), which the old pattern could not
       match — Cinzel would have gone uncounted and the file uncheckedly absent. The rest of the rule is unchanged. */
    const faces = [...css33.matchAll(/@font-face\{font-family:"([^"]+)";font-style:normal;font-weight:([\d ]+);font-display:swap;src:url\(\.\.\/fonts\/([\w.-]+)\)/g)];
    const files = [...new Set(faces.map(f => f[3]))];
    const onDisk = files.filter(f => fs.existsSync(path.join(root, 'fonts', f)));
    const bytes = onDisk.reduce((a, f) => a + fs.statSync(path.join(root, 'fonts', f)).size, 0);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.9): a SIXTH face from a FOURTH file — Creepster 400, the Gauntlet screens' scary face.
       AMENDED AT BUILD 59 (v30 59.5): Creepster is REJECTED and gone, and TWO faces replace it — Cinzel (variable, 700-900, one
       file) and Cinzel Decorative 900. Seven faces from five files, and the check that every declared file is on disk is what
       proves creepster-400.woff2 really went rather than merely stopping being referenced. */
    (faces.length === 7 && onDisk.length === files.length && files.length === 5 && !fs.existsSync(path.join(root, 'fonts', 'creepster-400.woff2')) && !/fonts\.googleapis\.com/.test(html33))
      ? ok(`B.32 ${faces.length} faces from ${files.length} self-hosted files (${(bytes / 1024).toFixed(1)}KB), every one font-display:swap, and the <link> to Google is gone`)
      : bad('B.32 the @font-face block', JSON.stringify({ faces: faces.length, files, onDisk: onDisk.length }));
    const pre = [...html33.matchAll(/<link rel="preload" href="fonts\/([\w.-]+)" as="font" type="font\/woff2" crossorigin>/g)].map(m => m[1]);
    (pre.length === 2 && pre.some(f => /syncopate/.test(f)) && pre.some(f => /archivo/.test(f)) && pre.every(f => files.includes(f)))
      ? ok(`B.32 the title's two are preloaded with crossorigin (${pre.join(', ')})`) : bad('B.32 the preloads', JSON.stringify(pre));
    // and they actually loaded: document.fonts knows the three families by the time the app is up
    const loaded = await page.evaluate(async () => { await document.fonts.ready;
      return [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status); });
    const fam = new Set(loaded.map(l => l.split(' ')[0].replace(/"/g, '')));
    (fam.has('Syncopate') && fam.has('Archivo') && fam.has('JetBrains')) || loaded.length >= 5
      ? ok(`B.32 the page declares ${loaded.length} faces of its own and document.fonts resolved`) : bad('B.32 the faces loaded', loaded.join(' | '));
  }

  /* ---- the beta paragraph, item 1: Send feedback on About. A mailto with the build, the device and the last run
     filled in — no form, no endpoint, no third party, and nothing leaves without the tester's own send button. ---- */
  {
    const B33 = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
    await click('.back'); await sleep(300); await click('[data-go="s-about"]'); await sleep(500);
    const fb = await page.evaluate(() => { const a = document.getElementById('feedback'); if (!a) return null;
      return { tag: a.tagName, text: a.textContent, href: a.getAttribute('href'), act: a.dataset.act,
        blue: getComputedStyle(a).textDecorationLine }; });
    const body = fb && decodeURIComponent((/&body=([^&]*)/.exec(fb.href) || [, ''])[1]);
    (fb && fb.tag === 'A' && /^mailto:info@somethingstrange\.com\.au\?/.test(fb.href) && fb.act === 'none'
      && new RegExp(`v0\\.${B33.BUILD}`).test(fb.href) && /Mozilla|Chrome|AppleWebKit/.test(body) && /Last run:/.test(body) && fb.blue === 'none')
      ? ok(`beta 1 — Send feedback is a mailto to the Something Strange mailbox carrying v0.${B33.BUILD}, the device and the last run`)
      : bad('beta 1 the feedback link', JSON.stringify({ ...fb, href: (fb && fb.href || '').slice(0, 90) }));
    /* beta 2 — the tester's name on a run. REPORT WHAT YOU FOUND EVEN IF NOTHING IS WRONG: it was already built.
       `run/run.js` stamps `n: prefs.name` on every record, the result screen's rank line names the player and the
       share text leads with it. The field is on SCORES (`#pname`), not Customise as the handover said. Asserted here
       so a later build cannot quietly drop it. */
    await click('.back'); await sleep(300);
    const named = await page.evaluate(async () => { const S = await import('./core/store.js');
      S.prefs.name = 'AIDEN'; S.save();
      const runjs = 1; return { field: !!document.getElementById('pname'), stored: JSON.parse(localStorage.getItem('ne')).prefs.name, runjs }; });
    const runSrc = read('run', 'run.js');
    (named.field && named.stored === 'AIDEN' && /n:prefs\.name\|\|''/.test(runSrc.replace(/\s/g, '')))
      ? ok('beta 2 — already built: every run record carries the profile name (run/run.js), and the field is on Scores, not Customise')
      : bad('beta 2 the name on a run', JSON.stringify(named));
  }
}
