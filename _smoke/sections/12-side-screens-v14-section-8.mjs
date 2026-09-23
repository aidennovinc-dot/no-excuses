// ---- 6b. the side screens (v14 section 8) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, sleep, names, section, check, ok, bad, finished, root, read, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, down } from '../lib/gate.mjs';

export const SECTION = ["side screens (v14 section 8)"];

export async function run() {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  // a brand-new profile: everything unseen, which is what 8.7 broke. AMENDED at build 40 (v23 L.11a): Customise opens with the Games
  // chest, so the new profile has that one chest open and nothing else
  await setStorage({ ne: { v: 5, prefs: { chests: { games: 1 } } } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  await page.evaluate(() => document.body.click()); await sleep(900);
  // AMENDED at build 39 (v23 L.4a): Customise is its own screen again (it was the middle tab of Progress, builds 33-38)
  await click('[data-go="s-custom"]'); await sleep(1400);   // past the .6s first-seen highlight
  // 8.7: the highlight used to end on `background-color:transparent` under animation-fill-mode:both, which held forever —
  // so every first-seen swatch was left blank. The target colours must still be their own colour once it has played
  const sw = await page.evaluate(() => { const b = document.querySelector('#c-sq button'); if (!b) return null;
    const bg = getComputedStyle(b).backgroundColor; const a = /rgba?\(([^)]+)\)/.exec(bg); const parts = a ? a[1].split(',') : [];
    return { cls: b.className.trim(), bg, alpha: parts.length > 3 ? parseFloat(parts[3]) : 1 }; });
  (sw && sw.alpha > .9) ? ok(`8.7 a first-seen target colour still shows its colour (${sw.bg})`) : bad('8.7 target colours blank on first load', JSON.stringify(sw));
  (await page.evaluate(() => !document.querySelector('#s-custom .eyebrow'))) ? ok('8.9 the Customise eyebrow line is gone') : bad('8.9 the Customise eyebrow line is gone');
  // AMENDED at build 39 (v23 L.4a): Customise is its own screen again, so Achievements is back through the Progress menu row
  await click('#s-custom .back'); await sleep(400); await click('[data-go="s-prog"]'); await sleep(300); await click('#prog-tabs [data-tab="ach"]'); await sleep(400);
  /* AMENDED at build 39 (v23 L.4c): Clean · Sprint · Four and Every game pay out a cosmetic, so both live on Customise unlocks
     now. 8.3 reads Clean · Sprint · Two (Quick Tap, no payout) and 8.1 reads Every game on its own tab */
  const evTxt = async () => { await click('#prog-tabs [data-tab="cul"]'); await sleep(400);
    const t = await page.evaluate(() => (document.querySelector('#cul-every small') || {}).textContent || null);
    await click('#prog-tabs [data-tab="ach"]'); await sleep(400); return t; };
  /* TURNED OVER at build 58 (58.3): `qt_bclean5` is a key-1 roster row and lives on the SKILL CHEST tab now, so 8.3 reads a row that is
     still on Achievements — Committed, which is Quick Tap and pays out nothing. The rule is unchanged: the game name leads the title. */
  const ach = await page.evaluate(() => {
    const row = document.getElementById('ach-qt_sab'), sec = document.getElementById('ach-qt_s5'), ev = document.getElementById('ach-every');
    return { ox: getComputedStyle(document.getElementById('achlist')).overflowX,
      lead: row ? (row.querySelector('span i') || {}).textContent : null,
      leadFirst: row ? row.querySelector('span').firstElementChild?.tagName : null,
      secret: sec ? (sec.querySelector('small') || {}).textContent : null,
      left: ev ? (ev.querySelector('small') || {}).textContent : null };
  });
  ach.left = await evTxt();
  (ach.ox === 'hidden') ? ok('8.2 the achievements list has no sideways axis to be left panned on') : bad('8.2 achievements list overflow-x', ach.ox);
  (ach.leadFirst === 'I' && ach.lead === 'Quick Tap') ? ok('8.3 the game name leads the achievement title') : bad('8.3 the game name leads the title', JSON.stringify(ach));
  /* v14 8.5 is REVERSED at build 58 (v29 Section A 58.3, Aiden's own line): a secret's description is hidden until it is earned. The tier
     heading says "what earns them is not written down" and every row underneath then wrote it down. The progress bar is the hint now, and
     the only one; an earned secret is described in full, which is asserted where 58.3 is (the block at the foot of this section). */
  (ach.secret === '') ? ok('8.5 / 58.3 an unearned secret row carries NO description at all — the progress bar is the only hint (v14 8.5 reversed)') : bad('58.3 an unearned secret is silent', JSON.stringify(ach.secret));
  (ach.left && /still to play/.test(ach.left)) ? ok('8.1 "Finish a run in every game" names the games left') : bad('8.1 which games are left', ach.left);
  await click('#s-prog .back'); await sleep(400);
  // 8.10: Testing is its own item below About, and About no longer carries it
  const moved = await page.evaluate(() => ({ item: !!document.querySelector('#s-menu [data-go="s-testing"]'),
    below: document.querySelector('#s-menu [data-go="s-about"]')?.nextElementSibling?.dataset.go,
    inAbout: document.querySelectorAll('#s-about [data-dev]').length, inTesting: document.querySelectorAll('#s-testing [data-act^="dev-"]').length }));
  // AMENDED at build 32 (v18 B.26): six animation buttons joined the four switches
  // AMENDED at build 34 (#411 / #371): a fifth switch — fill pro + author · placeholder
  (moved.item && moved.below === 's-testing' && moved.inAbout === 0 && moved.inTesting === 26 /* AMENDED at build 48 (v26 items 7 / 12): "meter · as earned" went with the meter override. AMENDED AT BUILD 57 (v29 Section A, 57.6): one "key N created" button per key, three */)   // AMENDED at build 37 (v21 G.8): a switch and a reset per key. AMENDED at build 40 (L.8f): per CHEST, four of each, the meter field's two, and a fourth chest-opening button. AMENDED at build 43 (v24 C.5): "key complete" is three buttons, one earn moment per key
    ? ok('8.10 Testing is its own item directly below About, with all five switches, the twelve animation buttons, the eight per-chest buttons and "set meter to N%", none left in About')
    : bad('8.10 Testing moved out of About', JSON.stringify(moved));

  /* ---- v28 items 1 / 4 / 6 (build 53): THE PROGRESS SCREEN. R3 - a list appears the moment it is asked for, so no tab and no filter animates
     its rows in; Secret sits below every other tier in every filter and is drawn like a locked ordinary row, never in the cue red; the grey
     helper text on all three tabs is one count line, with Secret out of the total until one is found (R1); and every Customise-unlock row shows
     the thing it unlocks. Driven: the tabs and the filters are tapped and the rows read back off the page. ---- */
  {
    const CP53 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    await setStorage({ 'ne.prefs': { ...OPEN_PREFS, played: 1, chests: { games: 1 } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    await click('[data-go="s-prog"]'); await sleep(500);
    /* TURNED OVER at build 58 (58.3): six tabs, one per chest. The four chest tabs share one pane and one hint line, so `pane`
       and `hint` resolve by tab rather than by name, and the old `unl` tab is read as `c-games` — the tab it became. Every rule
       this check stands for (R3, one count line per tab, Secret last and plain, the stacked headings, the Customise art) is
       unchanged and is still asserted on exactly the same three lists. */
    const paneOf = t => t.startsWith('c-') ? 'chest' : t;
    const tabRead = async tab => { await page.evaluate(t => document.querySelector(`[data-act="ptab"][data-tab="${t}"]`).click(), tab); await sleep(420);
      return page.evaluate(t => { const pane = document.getElementById('p-' + (t.startsWith('c-') ? 'chest' : t));
        const rows = [...pane.querySelectorAll('.urow, .a')];
        const moving = rows.filter(r => r.getAnimations().some(a => { const tm = a.effect && a.effect.getComputedTiming(); return tm && tm.activeDuration > 0 && a.playState !== 'finished' && !/achflash/.test(a.animationName || ''); })).length;
        const delays = rows.filter(r => (parseFloat(getComputedStyle(r).animationDelay) || 0) > 0).length;
        return { hint: (document.getElementById((t.startsWith('c-') ? 'chest' : t) + '-hint') || {}).textContent || '', lede: !!document.getElementById('unl-lede'),
          heads: [...pane.querySelectorAll('h4')].map(h => ({ t: h.className, txt: h.textContent, col: getComputedStyle(h).color, disp: getComputedStyle(h).display })),
          rows: rows.length, moving, delays,
          art: [...pane.querySelectorAll('.a.cu .rw')].map(r => ({ w: r.textContent.trim(), sw: r.querySelectorAll('.rwsw').length })) }; }, tab); };
    const unl53 = await tabRead('c-games'), cul53 = await tabRead('cul'), ach53 = await tabRead('ach');
    // the Achievements tab, filtered to one game, must still put Secret last
    const filtered = await page.evaluate(async () => { const b = document.querySelector('[data-act="chip-ach"][data-v="dots"]'); if (b) b.click();
      await new Promise(r => setTimeout(r, 350));
      return [...document.querySelectorAll('#achlist h4')].map(h => h.className); });
    const cue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cue').trim());
    const R3 = [unl53, cul53, ach53].every(t => !t.moving && !t.delays);
    const counted = [unl53, cul53, ach53].every(t => /^\d+ of \d+ unlocked$/.test(t.hint.trim()));
    const noLede = !unl53.lede;
    const secretLast = ach53.heads.length && ach53.heads[ach53.heads.length - 1].t === 'secret' && (!filtered.length || filtered[filtered.length - 1] === 'secret');
    const secretPlain = ach53.heads.filter(h => h.t === 'secret').every(h => h.col === (ach53.heads.find(x => x.t !== 'secret') || h).col);
    const stacked = ach53.heads.every(h => h.disp !== 'flex');
    const art = cul53.art.length && cul53.art.every(r => r.sw === 1);
    (R3 && counted && noLede && secretLast && secretPlain && stacked && art)
      ? ok(`v28 items 1 / 4 / 6 Progress: every tab draws its rows with no entry animation at all (${unl53.rows}/${cul53.rows}/${ach53.rows} rows, none moving, none delayed - R3); the grey helper text is gone and each tab says how much of itself is done ("${unl53.hint}" / "${cul53.hint}" / "${ach53.hint}"); Secret is the last group in every filter and is drawn like any other locked row rather than in the cue red (${cue}); every heading stacks its description under its title instead of pushing it to the edge; and all ${cul53.art.length} Customise-unlock rows carry the thing they unlock`)
      : bad('v28 items 1 / 4 / 6 the Progress screen', JSON.stringify({ R3, counted, noLede, secretLast, secretPlain, stacked, art, unl53, cul53, ach53, filtered }));
  }

  /* ---- v29 Section A (58.3, build 58): A SECRET SAYS NOTHING UNTIL IT IS EARNED, and Achievements is only the extras ----
     The tier heading is "they exist. what earns them is not written down" and every row underneath then wrote it down, in `hint` —
     thirteen rows contradicting the heading above them. The progress bar is the hint now and the only one. An EARNED secret is
     described in full, because by then there is nothing to keep back. And with the key rows gone to their own chests, this tab
     holds what 58.3 says it holds: the Pro extras and the Secrets, nothing that carries a key tier. ---- */
  {
    const A58 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
    const someSecret = (A58.ACH.find(a => a.tier === 'secret' && a.hint && !a.unlocks) || {}).id;   // not one that pays out a cosmetic — those are on Customise unlocks (L.4c)
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, played: 1, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const sec58 = await page.evaluate(async id => { const R = await import('./ui/router.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const read = async () => { R.show('s-menu'); await wait(120); R.show('s-prog', { tab: 'ach' }); await wait(450);
        document.querySelector('#ach-g [data-v="all"]')?.click(); await wait(300);
        const rows = [...document.querySelectorAll('#achlist .a')];
        const one = rows.find(r => r.dataset.ach === id);
        return { n: rows.length, kt: rows.filter(r => /^key_/.test(r.dataset.ach)).length,
          name: one ? one.querySelector('span').textContent.trim() : null,
          line: one ? one.querySelector('small').textContent.trim() : null,
          bar: !!(one && one.querySelector('.pbar')),
          hint: (document.getElementById('ach-hint') || {}).textContent || '' }; };
      const shut = await read();
      S.store.ach[id] = Date.now(); S.save();
      const open = await read();
      delete S.store.ach[id]; S.save();
      return { shut, open }; }, someSecret);
    // the game name still leads the title (v14 8.3), so the name reads "Quick Tap???" until it is earned
    const hidden58 = /\?\?\?/.test(sec58.shut.name || '') && sec58.shut.line === '' && sec58.shut.bar;
    const told58 = sec58.open.name && !/\?\?\?/.test(sec58.open.name) && sec58.open.line.length > 0;
    const extras58 = sec58.shut.kt === 0 && sec58.shut.n > 0 && sec58.shut.n < 40;
    (hidden58 && told58 && extras58)
      ? ok(`58.3 a Secret is "${sec58.shut.name}" with NO description at all and the progress bar as the only hint until it is earned, and then it says what it was ("${sec58.open.name}" \u00b7 ${sec58.open.line}); and Achievements holds only the extras that fit nowhere else \u2014 ${sec58.shut.n} rows, not one of them a key row, "${sec58.shut.hint}"`)
      : bad('58.3 the Secrets and the Achievements tab', JSON.stringify({ hidden58, told58, extras58, someSecret, sec58 }));
  }
}
