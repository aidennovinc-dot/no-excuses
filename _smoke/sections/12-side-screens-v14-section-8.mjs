// ---- 6b. the side screens (v14 section 8) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, sleep, names, section, check, ok, bad, finished, root, read, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, down, openSheet, driveToResult } from '../lib/gate.mjs';

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
  // RESTATED at build 62 (61.14, Aiden: no secret achievements): an unearned secret row says what earns it, like every other row
  (ach.secret && ach.secret.length > 0) ? ok(`L18 / 61.14 an unearned "secret" row says what earns it: "${ach.secret}"`) : bad('L18 / 61.14 an unearned secret says what earns it', JSON.stringify(ach.secret));
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
    // build 64 (A1): the Games chest tab counts its modes in its own words ("Every game and mode — 13 of 13", then "Streak not counted"); the other two keep "N of M unlocked"
    const counted = [cul53, ach53].every(t => /^\d+ of \d+ unlocked$/.test(t.hint.trim())) && /\d+ of \d+/.test(unl53.hint);
    const noLede = !unl53.lede;
    /* RESTATED at build 62 (61.13): Achievements is ONE flat list — no Pro or Secret heading, in any filter — and its count is every row it lists */
    const secretLast = ach53.heads.length === 0 && filtered.length === 0 && new RegExp('^0 of ' + ach53.rows + ' unlocked$').test(ach53.hint.trim());
    const stacked = ach53.heads.every(h => h.disp !== 'flex');
    const art = cul53.art.length && cul53.art.every(r => r.sw === 1);
    (R3 && counted && noLede && secretLast && stacked && art)
      ? ok(`v28 items 1 / 4 / 6 Progress: every tab draws its rows with no entry animation at all (${unl53.rows}/${cul53.rows}/${ach53.rows} rows, none moving, none delayed - R3); the grey helper text is gone and each tab says how much of itself is done ("${unl53.hint}" / "${cul53.hint}" / "${ach53.hint}"); Secret is the last group in every filter and is drawn like any other locked row rather than in the cue red (${cue}); every heading stacks its description under its title instead of pushing it to the edge; and all ${cul53.art.length} Customise-unlock rows carry the thing they unlock`)
      : bad('v28 items 1 / 4 / 6 the Progress screen', JSON.stringify({ R3, counted, noLede, secretLast, stacked, art, unl53, cul53, ach53, filtered }));
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
    // RESTATED at build 62 (61.14): nothing is kept back — before it is earned the row already has its real name and its line, and no "???"
    const hidden58 = !/\?\?\?/.test(sec58.shut.name || '') && sec58.shut.name.includes(sec58.open.name.replace(/^.*✓ /, '')) && sec58.shut.line === sec58.open.line && sec58.shut.bar;
    const told58 = sec58.open.name && !/\?\?\?/.test(sec58.open.name) && sec58.open.line.length > 0;
    const extras58 = sec58.shut.kt === 0 && sec58.shut.n > 0 && sec58.shut.n < 40;
    (hidden58 && told58 && extras58)
      ? ok(`L18 / 61.14 a one-time Secret is "${sec58.shut.name}" with its line before it is earned, exactly as after it ("${sec58.open.name}" \u00b7 ${sec58.open.line}); and Achievements holds only the extras that fit nowhere else \u2014 ${sec58.shut.n} rows, not one of them a key row, "${sec58.shut.hint}"`)
      : bad('58.3 the Secrets and the Achievements tab', JSON.stringify({ hidden58, told58, extras58, someSecret, sec58 }));
  }
  /* build 62 (61.9 – 61.16): THE PROGRESS ROWS. One profile, every chest tab, Customise unlocks and Achievements read back */
  await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  const tab62 = t => page.evaluate(async t => { const R = await import('./ui/router.js'); R.show('s-prog', { tab: t }); await new Promise(r => setTimeout(r, 400));
    const list = document.querySelector(t.startsWith('c-') ? '#chest-list' : t === 'cul' ? '#cul-list' : '#achlist');
    return { heads: [...list.querySelectorAll('h4')].map(h => h.textContent), rows: [...list.querySelectorAll('.a')].map(b => ({ id: b.dataset.ach, title: (b.querySelector('span') || {}).textContent || '', lines: [...b.children].map(c => c.textContent), game: !!b.querySelector('span i'), gold: [...b.querySelectorAll('.aname')].map(x => getComputedStyle(x).color), bar: (b.querySelector('.pbar i') || {}).style?.width || null })),
      count: (document.getElementById(t.startsWith('c-') ? 'chest-hint' : t + '-hint') || {}).textContent || '' }; }, t);
  {
    const pro = await tab62('c-pro');
    (pro.heads.length > 3 && pro.rows.length && pro.rows.every(r => !r.game))
      ? ok(`61.9 under a "${pro.heads[0]}" header no row repeats the game's name (${pro.rows.length} Pro chest rows)`)
      : bad('61.9 the game name repeated under its header', JSON.stringify(pro.rows.filter(r => r.game).slice(0, 3)));
  }
  /* build 64 (A1): the Games chest tab's line is the MODE count the chest opens on, worded so its Streak rows sit outside it */
  {
    const gm = await tab62('c-games'), want = await page.evaluate(async () => { const P = await import('./progress.js'), C = await import('./config/copy.js'), m = P.modeCount();
      return { line: C.PROGRESS_SCREEN.gamesCount.replace('{open}', m.open).replace('{total}', m.total), total: m.total }; });
    (gm.count === want.line && /streak/i.test(gm.count))
      ? ok(`L19 / A1 the Games chest tab says "${gm.count}" — the ${want.total} modes the chest counts, Streak named as outside it`)
      : bad('L19 / A1 the Games chest count line', JSON.stringify({ got: gm.count, want }));
  }
  /* 61.10: each Quick Tap row on the Pro chest draws ITS best ÷ ITS target — three different bests give three different bars, each the
     ratio, read against Aiden's Pro targets in config (never a copy of them) */
  {
    const KB = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href), B = KB.KEY_BARS;
    const bests = { 'quick-tap:two:5': 11, 'quick-tap:two:15': 20, 'quick-tap:four:5': 6 }, t0 = Date.now() - 5000;
    const runs = Object.entries(bests).map(([k, h], i) => { const [g, d, s] = k.split(':'); return { t: t0 + i, g, d, s: +s, hits: h, misses: 0, v: 4 }; });
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const pro = await tab62('c-pro'), K = await page.evaluate(async () => (await import('./progress/key.js')).keyAch().filter(a => a.kt === 'pro' && a.combo).map(a => ({ key: a.combo, id: a.id })));
    const got10 = Object.keys(bests).map(k => { const id = (K.find(c => c.key === k) || {}).id, row = pro.rows.find(r => r.id === id); return { k, want: Math.round(Math.min(.99, bests[k] / B[k].pro) * 100) + '%', bar: row && row.bar }; });
    (got10.every(x => x.bar === x.want) && new Set(got10.map(x => x.bar)).size === 3)
      ? ok(`61.10 each Pro chest row's bar is its best ÷ its target: ${got10.map(x => x.k.replace('quick-tap:', '') + ' ' + x.bar).join(', ')} — no longer one capped ~88% for every row`)
      : bad('61.10 the row bars', JSON.stringify(got10));
  }
  /* 61.12: a score-target row has no name — "Two · Sprint — 13 hits or more" — and no second line; the name is still in config (KEY_ROSTER);
     a nameless row's toast is "Pro · Two Sprint cleared"; an achievement that unlocks something keeps its name */
  {
    const pro = await tab62('c-pro'), t12 = await page.evaluate(async () => { const P = await import('./progress.js'), K = await import('./progress/key.js');
      const rows = K.keyAch().filter(a => a.kt === 'pro' && a.combo), a = rows.find(x => x.combo === 'quick-tap:two:5'), named = P.achAll().find(x => x.unlocks);
      // what the row and the toast SHOULD say, built from config (61.28: no copy of a name or a line in the gate)
      const C = await import('./config/copy.js'), KY = await import('./config/keys.js'), tier = KY.KEYS.find(k => k.id === 'pro').name.replace(/ key$/i, '');
      return { id: a.id, name: a.name, toast: P.achToast(a), named: named.name, namedToast: P.achToast(named),
        wantTitle: P.achWhere(a, ' · ') + ' — ' + a.how, wantToast: C.TOAST.cleared.replace('{tier}', tier).replace('{where}', P.achWhere(a, ' ')) }; });
    const r12 = pro.rows.find(r => r.id === t12.id);
    (r12 && r12.title === t12.wantTitle && !r12.title.includes(t12.name) && r12.lines.filter(Boolean).length === 1 && t12.name && t12.toast === t12.wantToast && t12.namedToast.includes(t12.named))
      ? ok(`61.12 a score-target row reads "${r12.title}" with no name ("${t12.name}" is still in config) and toasts "${t12.toast}"; "${t12.named}" keeps its name`)
      : bad('61.12 nameless score-target rows', JSON.stringify({ r12, t12 }));
  }
  /* 61.15: every achievement NAME is gold — Achievements, Customise unlocks and the toast — one token, at least 4.5:1 on every design's ground;
     a nameless row has no gold at all */
  {
    const TH = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
    const ach = await tab62('ach'), cul = await tab62('cul'), pro = await tab62('c-pro');
    const g15 = await page.evaluate(async () => { const P = await import('./progress.js'), a = P.achAll().find(x => x.unlocks), d = document.createElement('div'); d.innerHTML = P.achToast(a); document.body.appendChild(d);
      const c = getComputedStyle(d.querySelector('.aname')).color; d.remove(); const tok = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
      const t = document.createElement('i'); t.style.color = tok; document.body.appendChild(t); const rgb = getComputedStyle(t).color; t.remove(); return { toast: c, rgb, tok }; });
    const lum = h => { const n = h.match(/[\da-f]{2}/gi).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * n[0] + .7152 * n[1] + .0722 * n[2]; };
    const ratios = Object.entries(TH.DESIGNS).map(([k, v]) => [k, +((lum(g15.tok) + .05) / (lum(v.tint) + .05)).toFixed(1)]);
    const named = ach.rows.concat(cul.rows);
    (named.length && named.every(r => r.gold.length === 1 && r.gold[0] === g15.rgb) && g15.toast === g15.rgb && pro.rows.filter(r => r.title.includes(' — ')).every(r => !r.gold.length) && ratios.every(([, r]) => r >= 4.5))
      ? ok(`61.15 every achievement name is ${g15.tok} (${named.length} rows and the toast); nameless rows carry none; contrast on every design's ground ${ratios.map(([k, r]) => k + ' ' + r).join(', ')}`)
      : bad('61.15 gold names', JSON.stringify({ g15, ratios, off: named.filter(r => r.gold[0] !== g15.rgb).slice(0, 3) }));
  }
  /* 61.18: choosing a tap sound in Customise plays it ONCE, as a game tap — no select, no click of the button's own — and OFF plays nothing */
  {
    const s18 = await page.evaluate(async () => { const A = await import('./audio.js'), S = await import('./core/store.js'), R = await import('./ui/router.js'), w = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-custom'); await w(500); const out = {};
      for (const v of ['click', 'wood', 'space', 'off']) { const b = document.querySelector(`#c-snd [data-v="${v}"]`); if (!b) { out[v] = 'none'; continue; }
        const n = { hit: 0, select: 0, click: 0 }, keep = {}; for (const k in n) { keep[k] = A.Snd[k]; A.Snd[k] = function (...x) { n[k]++; if (k === 'hit') n.pack = S.prefs.snd; return keep[k].apply(this, x); }; }
        b.click(); await w(350); for (const k in keep) A.Snd[k] = keep[k]; out[v] = n; }
      return out; });
    (['click', 'wood', 'space', 'off'].every(v => s18[v].hit === 1 && !s18[v].select && !s18[v].click && s18[v].pack === v))
      ? ok('61.18 a tap sound picked in Customise plays once, in that pack, as a game tap does — no click of its own; OFF picks off and so plays nothing')
      : bad('61.18 the tap-sound preview', JSON.stringify(s18));
  }
  /* 61.16: a Customise-unlock row is three lines — [thing] Name / the requirement alone / → game · mode · length — and says its mode ONCE;
     no row says what kind of thing it unlocks (the header does); no requirement anywhere shows a whole percent with decimals */
  {
    const A = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href), clean = A.ACH.find(a => a.id === 'qt_clean30');
    const cul = await tab62('cul'), c16 = cul.rows.find(r => r.id === clean.id), chests = [await tab62('c-games'), await tab62('c-key'), await tab62('c-pro'), await tab62('c-thorns')];
    const txt = c16 ? c16.lines.filter(Boolean) : [], all = txt.join(' | ');
    const once = w => all.split(w).length === 2;
    const pct = cul.rows.concat(...chests.map(c => c.rows)).filter(r => /\d\.0+%/.test(r.lines.join(' '))).map(r => r.id);
    // 61.28: the words are read from config — the name as shown is its first part, the line the `how` after its mode words, the → line the game's own
    const G16 = await page.evaluate(async () => { const R = await import('./games/registry.js'), GG = await import('./config/games.js'); return { game: R.GAMES['quick-tap'].name, mode: GG.MODE_NAME.four, len: R.lenName('quick-tap', 30, 'four') }; });
    const want16 = [clean.name.split(' · ')[0], null, `→ ${G16.game} · ${G16.mode} · ${G16.len}`];
    (c16 && txt.length === 3 && txt[0] === want16[0] && !txt[1].includes(G16.mode) && !txt[1].includes(G16.len) && /^[A-Z0-9]/.test(txt[1]) && txt[2] === want16[2] && once(G16.len) && once(G16.mode)
      && cul.rows.every(r => !/unlocks/i.test(r.title)) && !pct.length)
      ? ok(`61.16 a Customise-unlock row reads "${txt.join('" / "')}" — Marathon and Four once each, no "unlocks …" on any row, no ".00%" anywhere`)
      : bad('61.16 the Customise-unlock rows', JSON.stringify({ txt, pct: pct.slice(0, 4), title: (cul.rows.find(r => /unlocks/i.test(r.title)) || {}).title }));
  }
  /* 61.26: the foot of the Games chest tab is the Skill key's art and one line — lit, "Skill key unlocked", once the Games chest has opened it,
     and dim, "Unlock all games to open the Skill key", before; no grey paragraph, no count */
  {
    const read26 = () => page.evaluate(async () => { const C = (await import('./config/copy.js')).PROGRESS_SCREEN, R = await import('./ui/router.js'); R.show('s-prog', { tab: 'c-games' }); await new Promise(r => setTimeout(r, 400));
      const b = document.querySelector('#chest-list .keyblock'); return b ? { art: b.querySelectorAll('.kbart path').length, lit: b.classList.contains('lit'), txt: b.textContent.trim(), shut: C.skillShut, open: C.skillOpen } : null; });
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, allOpen: false, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400); const open26 = await read26();
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, allOpen: false, chests: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400); const shut26 = await read26();
    (open26 && shut26 && open26.art > 0 && open26.lit && open26.txt === open26.open && !shut26.lit && shut26.txt === shut26.shut)
      ? ok(`61.26 the Games chest tab ends on the Skill key's art and one line: "${shut26.txt}" dim before, "${open26.txt}" lit after`)
      : bad('61.26 the Skill key block', JSON.stringify({ open26, shut26 }));
  }
  /* build 68 (67.19): the line under the web — "each game against its key bars · a ring for each key" — is gone */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const h19 = await page.evaluate(async () => { (await import('./ui/router.js')).show('s-board'); await new Promise(r => setTimeout(r, 400)); return { hint: !!document.getElementById('radar-hint'), text: document.getElementById('s-board').textContent.includes('a ring for each key') }; });
    (!h19.hint && !h19.text) ? ok('67.19 the line under the web is gone') : bad('67.19 the web\'s caption line', JSON.stringify(h19));
  }
  /* build 68 (67.18): THE WEB IS BIGGER — at least the screen's width less its margins, its labels larger than build 67's 8px */
  {
    const w18 = await page.evaluate(async () => { (await import('./ui/router.js')).show('s-board'); await new Promise(r => setTimeout(r, 400));
      const r = document.getElementById('radar').getBoundingClientRect(), t = document.querySelector('#radar text'), tr = t ? t.getBoundingClientRect() : null;
      return { w: Math.round(r.width), iw: innerWidth, label: tr ? Math.round(tr.height) : 0, inside: r.left >= -1 && r.right <= innerWidth + 1 }; });
    (w18.w >= w18.iw - 64 && w18.label >= 10 && w18.inside)
      ? ok(`67.18 the web is ${w18.w}px wide on a ${w18.iw}px phone (it was 230 at most), its labels ${w18.label}px tall`)
      : bad('67.18 the bigger web', JSON.stringify(w18));
  }
  /* build 68 (67.21): A TAP ON THE WEB NEVER GOES BACK TO THE MENU. A real tap on a game's name opens its panel — score, bars per key, best per mode, the next
     bar — and the screen stays Scores; a tap on the panel closes it; a tap in the web's middle stays on Scores too */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS }, runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 20, misses: 0, row: 20, v: 4 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-board')); await sleep(500);
    const lab = await page.evaluate(() => { const t = document.querySelector('#radar text[data-g="quick-tap"]'), r = t.getBoundingClientRect(), c = document.getElementById('radar').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cx: c.left + c.width / 2, cy: c.top + c.height / 2 }; });
    await page.mouse.click(lab.x, lab.y); await sleep(400);
    const d21 = await page.evaluate(() => { const d = document.getElementById('radar-detail'); return { open: !d.hidden, txt: d.textContent, li: d.querySelectorAll('li').length, scr: document.querySelector('.screen.on')?.id }; });
    await page.evaluate(() => document.getElementById('radar-detail').click()); await sleep(300);
    const closed = await page.evaluate(() => ({ hidden: document.getElementById('radar-detail').hidden, scr: document.querySelector('.screen.on')?.id }));
    await page.mouse.click(lab.cx, lab.cy); await sleep(400);
    const mid = await page.evaluate(() => document.querySelector('.screen.on')?.id);
    (d21.open && /Quick Tap/.test(d21.txt) && /bars/.test(d21.txt) && /next|every bar/.test(d21.txt) && d21.li >= 3 && d21.scr === 's-board' && closed.hidden && closed.scr === 's-board' && mid === 's-board')
      ? ok(`67.21 a tap on the web opens the game's detail ("${d21.txt.slice(0, 60)}…", ${d21.li} lines) and never goes back to the menu; a tap on the panel closes it`)
      : bad('67.21 the web\'s detail', JSON.stringify({ d21, closed, mid }));
  }
  /* build 68 (67.38): EXCUSES. Each of the nine run excuses fires on its own trigger and not on the near miss beside it; none fires in the walkthrough,
     a profile's first ten minutes or a demo; one that comes with an unlock is a quiet tick. Then for real: a Quick Tap run of nothing but misses ends
     on "Excuse #1: The phone was upside down" with the shrug and the bwomp; the Excuses tab lists all ten with the total; and the map pulled down past
     its top shows the tiny exit, whose tap is Excuse #10 */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS }, runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 3600e3, hits: 20, misses: 0, row: 20, v: 4 }, { g: 'quick-tap', d: 'two', s: 15, t: Date.now() - 3500e3, hits: 40, misses: 1, row: 30, v: 4 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const ex = await page.evaluate(async () => {
      const { checkExcuse, excuseCount } = await import('./progress/excuses.js'); const { prefs, store } = await import('./core/store.js');
      const R = (g, d, o) => Object.assign({ g, d, s: 5, t: Date.now(), hits: 0, misses: 0 }, o || {});
      const cases = [[1, R('quick-tap', 'two', { misses: 10 })], [0, R('quick-tap', 'two', { misses: 9 })], [0, R('quick-tap', 'two', { hits: 1, misses: 12 })],
        [2, R('dots', 'blind', { misses: 15 })], [0, R('dots', 'blind', { misses: 14 })],
        [3, R('hold', 'grow'), { pmin: 4.2, pmax: 90 }], [3, R('hold', 'grow'), { pmin: 80, pmax: 310 }], [0, R('hold', 'grow'), { pmin: 6, pmax: 290 }],
        [4, R('hold', 'cut'), { smin: .8 }], [0, R('hold', 'cut'), { smin: 1.2 }],
        [5, R('reaction', 'flash'), { erow: 3 }], [0, R('reaction', 'flash'), { erow: 2 }],
        [6, R('reaction', 'nogo'), { dseen: 6, dhit: 6 }], [0, R('reaction', 'nogo'), { dseen: 6, dhit: 5 }], [0, R('reaction', 'nogo'), { dseen: 4, dhit: 4 }],
        [7, R('timing', 'stopwatch', { y: 3.2 })], [0, R('timing', 'stopwatch', { y: 2.9 })], [0, R('timing', 'hidden', { y: 3500 })],
        [8, R('sequence', 'solo'), { oneKey: 2 }], [0, R('sequence', 'solo'), { oneKey: 1 }],
        [9, R('spot', 'count'), { z0: 10 }], [0, R('spot', 'count'), { z0: 9 }]];
      const wrong = cases.map(([want, r, xs]) => { const x = checkExcuse(r, xs || {}, false); return [want, x ? x.id : 0, r.g + ':' + r.d]; }).filter(([w, g]) => w !== g);
      const q = checkExcuse(R('timing', 'stopwatch', { y: 4 }), {}, true), n = excuseCount();
      prefs.tut = 1; prefs.tutRun = { g: 'quick-tap' }; const inTut = checkExcuse(R('timing', 'stopwatch', { y: 4 }), {}, false); prefs.tut = 2; delete prefs.tutRun;
      const keep = store.runs; store.runs = [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 60e3, hits: 3, misses: 0 }];
      const young = checkExcuse(R('timing', 'stopwatch', { y: 4 }), {}, false); store.runs = keep;
      const demo = checkExcuse(R('timing', 'stopwatch', { y: 4, demo: 1 }), {}, false);
      return { wrong, n, want: cases.filter(c => c[0]).length + 1, quiet: !!(q && q.quiet), inTut, young, demo };
    });
    await page.evaluate(async () => { const { Snd } = await import('./audio.js'); const o = Snd.bwomp.bind(Snd); window.__bw = 0; Snd.bwomp = () => { window.__bw++; o(); }; });
    // the sheet is opened by hand: openSheet() resets the profile, and a profile with no run before this one is inside its first ten minutes
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(400);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(300);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); c[0] && c[0].click(); }); await sleep(300);
    await page.evaluate(() => { const t = [...document.querySelectorAll('#time-row .tbtn')]; (t[1] || t[0]).click(); }); await sleep(300);
    await click('#go-btn');
    /* every press lands on a pad that is NOT the target — read off the engine, not the pad's light: when a miss's lockout runs out the pad is
       live again a frame before it is lit, so a press chosen by the light can land on the target */
    await page.evaluate(async () => { const QT = (await import('./games/quick-tap/index.js')).QT; window.__mx = setInterval(() => { const gm = document.getElementById('game'); if (!gm || !gm.classList.contains('on')) return;
      for (let i = 0; i < 4; i++) { const t = document.querySelector('.pad[data-side="' + i + '"]'); if (!t || i === QT.target) continue;
        const r = t.getBoundingClientRect(); if (!r.width) continue; t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); break; } }, 60); });
    await driveToResult('quick-tap', 'excuse #1 run', 40000, true);
    await page.evaluate(() => clearInterval(window.__mx));
    let said = ''; for (let i = 0; i < 48 && !said; i++) { await sleep(250); said = await page.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') && /Excuse #/.test(t.textContent) ? t.textContent : ''; }); }
    const fx = await page.evaluate(() => { const r = (JSON.parse(localStorage.getItem('ne')).runs || []).reduce((a, b) => (b.t > (a.t || 0) ? b : a), {}); return { shrug: !!document.getElementById('shrug'), bw: window.__bw, made: (JSON.parse(localStorage.getItem('ne')).prefs.excuses || {})[1] || 0, hits: r.hits, misses: r.misses }; });
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-prog', { tab: 'exc' })); await sleep(400);
    const tab = await page.evaluate(() => ({ chip: !!document.querySelector('#prog-tabs [data-tab="exc"]'), up: !document.getElementById('p-exc').hidden, rows: document.querySelectorAll('#exc-list .exrow').length,
      made: document.querySelectorAll('#exc-list .exrow.made').length, hint: document.getElementById('exc-hint').textContent, one: (document.getElementById('exc-1') || {}).textContent || '' }));
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-pick')); await sleep(500);
    await page.evaluate(() => { document.getElementById('s-pick').scrollTop = 0; });
    const before10 = await page.evaluate(() => document.getElementById('exit10').hidden);
    // a wheel tick lands as half its delta at this device scale, so six of them make the 70px pull
    await page.mouse.move(195, 320); for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -40 }); await sleep(80); }
    const shown10 = await page.evaluate(() => !document.getElementById('exit10').hidden);
    if (shown10) await click('#exit10');
    let said10 = ''; for (let i = 0; i < 24 && !said10; i++) { await sleep(250); said10 = await page.evaluate(() => { const t = document.getElementById('toast'); return t && /Excuse #10/.test(t.textContent) ? t.textContent : ''; }); }
    const made10 = await page.evaluate(() => (JSON.parse(localStorage.getItem('ne')).prefs.excuses || {})[10] || 0);
    (!ex.wrong.length && ex.n === ex.want && ex.quiet && !ex.inTut && !ex.young && !ex.demo
      && /Excuse #1: The phone was upside down/.test(said) && fx.shrug && fx.bw >= 1 && fx.made === 2 && !fx.hits && fx.misses >= 10
      && tab.chip && tab.up && tab.rows === 10 && tab.made === 9 && /\d+ made/.test(tab.hint) && /The phone was upside down/.test(tab.one) && /Tap everything except the thing/.test(tab.one)
      && before10 && shown10 && /Excuse #10: Looking for the exit/.test(said10) && made10 === 1)
      ? ok(`67.38 Excuses: the nine run triggers fire on their own and not on the near miss beside each (${ex.n} made, none in the walkthrough, the first ten minutes or a demo; with an unlock it is a quiet tick); a real Quick Tap run of ${fx.misses} misses and no hits ends on "${said.trim()}" with the shrug and the bwomp; the Excuses tab lists all ten ("${tab.hint}"); the map pulled past its top shows the tiny exit and its tap is "${said10.trim()}"`)
      : bad('67.38 Excuses', JSON.stringify({ ex, said, fx, tab, before10, shown10, said10, made10 }));
  }
  /* build 68 (67.30, Cowork): NO BLACK BACKING BOX BEHIND TEXT OR AN ICON, ANYWHERE — the menu, the map with a chest's "You found" words, Customise, on the
     brightest backgrounds: nothing is cut out of the background behind them (so nothing can show before the text it backs), and every line wears its
     own soft dark shadow instead */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, chests: { games: 1 }, spill: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const b30 = await page.evaluate(async () => { const AT = await import('./ui/atmosphere.js'), R = await import('./ui/router.js'), S = await import('./core/store.js'), TH = await import('./config/theme.js'), w = ms => new Promise(r => setTimeout(r, ms)), out = [];
      for (const bg of Object.keys(TH.DESIGNS).slice(0, 4)) { S.prefs.bg = bg; S.save();
        for (const id of ['s-menu', 's-pick', 's-custom']) { R.show(id); await w(700);
          const txt = [...document.querySelectorAll('.screen.on .item, .screen.on .cw, .screen.on .chip, .screen.on h4')].filter(e => e.textContent.trim() && e.getBoundingClientRect().height > 0);
          out.push({ bg, id, n: txt.length, holes: AT.holesNow(), bare: txt.filter(e => getComputedStyle(e).textShadow === 'none').length }); } }
      R.show('s-menu'); return out; });
    (b30.every(x => x.holes === 0 && !x.bare) && b30.some(x => x.id === 's-pick' && x.n))
      ? ok(`67.30 no box is cut out of the background behind any text or icon — menu, map ("You found") and Customise on ${[...new Set(b30.map(x => x.bg))].join(', ')} — and every line carries its own soft dark shadow instead`)
      : bad('67.30 the backing boxes', JSON.stringify(b30));
  }
}
