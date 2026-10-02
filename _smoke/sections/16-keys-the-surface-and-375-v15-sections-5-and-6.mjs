// ---- 6f. the keys, the surface, and the three two-player defects (v15 section 5 and section 6, #375), build 26 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, GAMES, fail, CLOCK, sleep, names, close, part, section, check, ok, bad, finished, root, read, strip, PLAIN, boot, NOW, at, page, until, onScreen, click, setStorage, getJSON, OPEN_PREFS, SEEN_INTRO, down, up, revealDone, finish, driveToResult, openSheet, named } from '../lib/gate.mjs';

export const SECTION = ["the keys, the surface and #375 (v15 sections 5 and 6)"];

export async function run() {
  const rx = strip(read('games', 'reaction', 'index.js'));
  const sq = strip(read('games', 'sequence', 'index.js'));
  const css = read('styles', 'app.css');
  const mjs = strip(read('ui', 'screens', 'menu.js'));
  const cfg = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);

  /* #375a: PASS_TURNS['reaction:nogo'][0] was dead config - beat() ended a block on this.ctx.len, the Set's own round
     count, and the two numbers happened to match. AMENDED at build 31 (v18 B.1b): SOLO deals a round too, so blockLen
     answers for both - PASS_TURNS[0] for a turn, GO_PER + GO_PAD + a spread for a solo round - and the rule changes once
     per block in every mode, which retires the "flip on RULE_EVERY shapes" branch #375a was written against. The claim
     this check exists to protect is unchanged: a pass & play turn is PASS_TURNS[0] shapes on ONE rule. */
  // AMENDED at build 32 (v19 §C): a solo round is dealRound() — gaps of decoys and a target, no fixed length — so blockLen
  // answers for the pass & play turn alone and the claim is the same one: PASS_TURNS[0] shapes on ONE rule
  { const bl = /blockLen\(\)\{ return this\.two\.per; \}/.test(rx);
    const beatLine = (rx.match(/  beat\(\)\{[\s\S]*?\n  nogoTap/) || [''])[0];
    const usesBlock = /this\.bi>=this\.block\.length/.test(beatLine) && !/this\.seen>=this\.ctx\.len/.test(beatLine) && !/RULE_EVERY/.test(beatLine);
    const perTurn = await page.evaluate(async n => { const M = await import('./games/reaction/index.js'); const R = M.default;
      R.ctx = { mode: 'nogo', len: 5 }; R.two = { on: true, per: n }; const got = R.blockLen();
      R.two = { on: false }; R.ctx = null; return got; }, cfg.PASS_TURNS['reaction:nogo'][0]);
    (bl && usesBlock && perTurn === cfg.PASS_TURNS['reaction:nogo'][0])
      ? ok(`#375a / B.1b / §C a pass & play turn is still PASS_TURNS[0] shapes (${perTurn}) on ONE rule, and a solo round is dealRound()'s own deal`)
      : bad('#375a the turn length comes from PASS_TURNS and the rule does not flip inside a block', `blockLen ${bl} · beat ${usesBlock} · perTurn ${perTurn}`);
    (cfg.PASS_TURNS['reaction:nogo'][0] >= 1) ? ok(`#375a and the config it now reads says ${cfg.PASS_TURNS['reaction:nogo'][0]} shapes, ${cfg.PASS_TURNS['reaction:nogo'][1]} turns each`) : bad('#375a PASS_TURNS row', JSON.stringify(cfg.PASS_TURNS['reaction:nogo'])); }
  /* #375b: the 600ms fallback in twoBlockEnd invented half a player's score whenever the block held no go-shape or the
     turn ended early on three wrong taps. It is deleted, not retuned — nothing in the block's score may be a constant */
  { const body = (rx.match(/twoBlockEnd\(\)\{[\s\S]*?\n  \w/) || [''])[0];
    const score = (rx.match(/blockScore\(\)\{[\s\S]*?\},\n/) || [''])[0];
    const clean = !/\b600\b/.test(body) && !/\b600\b/.test(score) && /blockScore\(\)/.test(body);
    clean ? ok('#375b the 600ms fallback is gone from the block score — a turn is worth what it dealt, tapped or missed')
      : bad('#375b twoBlockEnd invents no number', body.slice(0, 120)); }
  /* #375c: Sequence versus dealt ONE pattern and had both players answer it, so player 2 watched player 1 replay it,
     with the keys lighting on every correct tap, before their own turn. Two patterns of equal length, dealt per player */
  { const two = /this\.seqs=vs\?\[this\.deal\(this\.round\),this\.deal\(this\.round\)\]/.test(sq);
    const own = /if\(vs\) this\.seq=this\.seqs\[this\.p\]/.test(sq);
    const grow = /this\.seqs\[0\]\.push\([\s\S]{0,40}?this\.seqs\[1\]\.push\(/.test(sq);
    const lives = /lives:3/.test(read('config', 'games.js'));
    (two && own && grow) ? ok('#375c Sequence versus deals each player their own pattern of equal length, and both grow together')
      : bad('#375c each player gets their own pattern', `dealt ${two} · picked ${own} · grown ${grow}`);
    lives ? ok('#375c SEQ_VS.lives is still 3 — untouched, it is Aiden\'s on #376') : bad('#375c SEQ_VS.lives must not change on this build', 'it is not 3'); }
  // 6.2 / 6.3: the two menu and grid animations are driven from JS through classes and a variable, so both halves must exist
  { const ud = /\.item\.unx\{[^}]*var\(--ud/.test(css) && /\.item\.unx::after\{[^}]*var\(--ud/.test(css) && /setProperty\('--ud'/.test(mjs);
    ud ? ok('6.2 the menu unlocks stagger top to bottom — --ud reaches the item and its strike') : bad('6.2 the unlock stagger', 'the --ud delay is not on both halves');
    /\.tile\.arrive\.newthing\{/.test(css) ? ok('6.3 the arrival and L8\'s green mark are held apart, one after the other') : bad('6.3 tile arrival is distinct from the first-seen mark'); }

  // ---- the app itself ----
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  /* build 30 (B.31 / A.1): the keys screen shows ONE tier until chest 1 is opened, so every 5.3 assertion below — three
     glyphs, the shell flags, the Author key's own screen — is now an assertion about a profile that has opened it. The
     before-chest-1 half of the same rule is checked in the build-30 section. */
  await setStorage({ 'ne.prefs': { ...OPEN_PREFS, chest1: 1 } }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);

  // #375b again, as behaviour: 400 dealt blocks, every one fair. A block with no go-shape is what the 600 was for
  { const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const RX = M.RX;
      const before = RX.rule; RX.rule = 'circle'; const out = { n: 0, short: 0, thrice: 0, dup: 0, len: 0, min: 99 };
      for (let i = 0; i < 400; i++) { const b = RX.dealBlock(5); out.n++;
        if (b.length !== 5) out.len++;
        const go = b.filter(s => s === 'circle').length; if (go < 2) out.short++; if (go < out.min) out.min = go;
        for (let k = 2; k < b.length; k++) if (b[k] === b[k - 1] && b[k] === b[k - 2]) out.thrice++;
        for (let k = 1; k < b.length; k++) if (b[k] === b[k - 1] && b[k] !== 'circle') out.dup++; }
      RX.rule = before; return out; });
    (!d.short && !d.thrice && !d.dup && !d.len) ? ok(`#375b 400 dealt blocks: every one is 5 shapes with at least two go-shapes (fewest seen ${d.min}), no shape three running, no decoy repeated`)
      : bad('#375b dealBlock is fair', JSON.stringify(d)); }

  // 5.3: the menu item is Keys, and the screen is three of them
  { const label = await page.evaluate(() => document.querySelector('[data-go="s-key"]').textContent.trim());
    (label === 'Keys') ? ok('5.3 the menu item is "Keys", plural') : bad('5.3 the menu item', label); }
  await click('[data-go="s-key"]'); await sleep(700);
  const k1 = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id,
    n: document.querySelectorAll('#key-keys .kkey').length,
    sel: [...document.querySelectorAll('#key-keys .kkey')].findIndex(b => b.classList.contains('sel')),
    paths: [...document.querySelectorAll('#key-keys .kgl')].map(g => g.querySelectorAll('path').length),
    pct: [...document.querySelectorAll('#key-keys u')].map(u => u.textContent.trim()),
    shell: [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('shell')),
    ring: !document.getElementById('key-main').hidden }));
  (k1.screen === 's-key' && k1.n === 3 && k1.sel === 0 && k1.ring) ? ok(`5.3 three keys, the first one open — ${k1.pct.join(' · ')}`) : bad('5.3 the three keys', JSON.stringify(k1));
  (k1.paths.length === 3 && k1.paths[0] < k1.paths[1] && k1.paths[1] < k1.paths[2]) ? ok(`5.3 each key is more elaborate than the one before it (${k1.paths.join(' → ')} strokes, the Author's most)`) : bad('5.3 the glyphs get more elaborate', JSON.stringify(k1.paths));
  // AMENDED at build 65 (64.18): a key under whole counts its bars — the Keys screen's one progress number; the % is the home menu's
  (/^\d+\/\d+$/.test(k1.pct[0])) ? ok(`5.3 a key under whole counts its bars — "${k1.pct[0]}"`) : bad('5.3 the key card figure', JSON.stringify(k1.pct));
  // AMENDED at build 38 (#426): both columns carry generated placeholders, so no key is a shell any more
  (!k1.shell[0] && !k1.shell[1] && !k1.shell[2]) ? ok('5.3 / #426 no key is a shell - Pro and Author carry generated placeholder bars') : bad('5.3 the shell flags', JSON.stringify(k1.shell));
  // tapping key 3 opens the Author key's own ring, and every generated number on it says so (A.2 as amended)
  await page.evaluate(() => document.querySelector('.kkey[data-kt="2"]').click()); await sleep(320);
  const k3 = await page.evaluate(() => ({ main: !document.getElementById('key-main').hidden, shell: !document.getElementById('key-shell').hidden,
    rings: document.querySelectorAll('#key-ring .kroot').length, style: document.getElementById('s-key').dataset.style,
    warn: document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent.trim(),
    title: document.getElementById('key-title').textContent.trim() }));
  // AMENDED at build 45 (v25 item 14): the red placeholder note is gone from this screen — the Author key says nothing about its generated numbers
  (k3.main && !k3.shell && k3.rings > 0 && k3.style === 'thorn' && k3.warn === '')
    ? ok(`5.3 / #426 the Author key opens its own ring - "${k3.title}", ${k3.rings} segments in Thorn - with no note about placeholders on it (v25 item 14)`) : bad('5.3 the Author screen', JSON.stringify(k3));
  await page.evaluate(() => document.querySelector('.kkey[data-kt="0"]').click()); await sleep(320);

  /* 5.2: a clearance-bar row is a way IN. It uses the same pendingAim the achievement-at-the-top uses (2.2), so the bar
     is the goal line at the top of the run — not a second mechanism, and not the chain's automatic offer instead */
  await page.evaluate(() => document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(360);
  const want = await page.evaluate(() => { const r = document.querySelector('#key-list .krow'); return r ? r.querySelector('i').textContent.trim() : null; });
  /* build 62 (61.11): the row ASKS first. A tap outside the box closes it with the list where it was; PLAY goes */
  const list = await page.evaluate(() => { const l = document.getElementById('key-list'); l.scrollTop = 30; return l.scrollTop; });
  await page.evaluate(() => document.querySelector('#key-list .krow').click()); await sleep(250);
  const ask = await page.evaluate(async () => { const C = (await import('./config/copy.js')).ASK_PLAY, h = document.getElementById('askplay');
    return { on: !!h && !h.hidden, title: h && h.querySelector('h3').textContent, line: h && h.querySelector('p').textContent, t: C.target.split(' ')[0], b: C.best.split(' ')[0] }; });
  await page.evaluate(() => document.getElementById('askplay').click()); await sleep(250);
  const shut = await page.evaluate(() => ({ hidden: document.getElementById('askplay').hidden, screen: document.querySelector('.screen.on')?.id, top: document.getElementById('key-list').scrollTop }));
  (ask.on && /^Play Quick Tap · .+ · .+\?$/.test(ask.title) && ask.line.startsWith(ask.t + ' ') && ask.line.includes(' · ' + ask.b + ' ') && shut.hidden && shut.screen === 's-key' && shut.top === list)
    ? ok(`61.11 a Keys row asks "${ask.title}" with "${ask.line}" and one Play; a tap outside closes it and the list is still where it was`)
    : bad('61.11 the Play-this box on the Keys screen', JSON.stringify({ ask, shut, list }));
  await page.evaluate(() => document.querySelector('#key-list .krow').click()); await sleep(250);
  await page.evaluate(() => document.querySelector('#askplay [data-act="askp-play"]').click()); await sleep(900);
  const pin = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'),
    on: document.getElementById('goal').classList.contains('on'), goal: document.getElementById('goal').textContent.replace(/\s+/g, ' ').trim() }));
  const num = (want || '').match(/[\d.]+/);
  (pin.game && pin.on && num && pin.goal.includes(num[0])) ? ok(`5.2 tapping a clearance bar goes and plays it, with the bar pinned at the top: "${pin.goal}"`) : bad('5.2 the row starts the run with the bar pinned', JSON.stringify(pin) + ' want ' + want);
  await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);

  /* 5.1: a key unlock INTERRUPTS the result screen. Driven through the real event, so it is the shipped path: the result
     fades and stops taking taps, the key plays the segment with the whole root lit behind it, and it hands itself back */
  const seq = await page.evaluate(async () => {
    const E = await import('./core/events.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
    const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
    S.prefs.adRuns = 0; S.store.bars = {}; S.save();
    Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
    const bar = K.COMBOS.find(c => c.g === 'quick-tap' && c.d === 'two' && c.s === 5).bar;
    const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: bar.bar + 3, misses: 0, n: '', v: 2 };
    const adv = K.checkKey(run, false);
    if (!adv) return { err: 'the fabricated run did not clear a bar' };
    E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
    const at = () => (document.querySelector('.screen.on') || {}).id;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(900);
    const faded = document.getElementById('s-over').classList.contains('fadeout');
    const onKey = at();
    // "before the player can input anything": Go is the one control that would restart the run, so tap it
    const before = at(); document.getElementById('again').click(); await wait(180); const moved = at() !== before;
    await wait(320);
    const glow = !!document.querySelector('.kr.glow');
    const grew = !!document.querySelector('.kroot.grow');
    // build 30 (B.33): the interlude is 3900ms now, not 2600 — the animations run at 1.5x and it waits past the halo
    await wait(4600);
    return { err: null, faded, onKey, moved, glow, grew, back: at(), clear: document.getElementById('s-over').classList.contains('fadeout'), bars: Object.keys(S.store.bars).length };
  });
  if (seq.err) bad('5.1 the key interlude', seq.err);
  else {
    (seq.faded && seq.onKey === 's-key') ? ok('5.1 a fresh clear fades the result out and takes over the screen — no toast to find and tap') : bad('5.1 the result stands aside for the key', JSON.stringify(seq));
    (!seq.moved) ? ok('5.1 and nothing on the result takes a tap while it plays (Go did nothing)') : bad('5.1 input is locked during the interlude', 'a tap on Go moved the screen');
    (seq.grew && seq.glow) ? ok('5.1 the segment fills with that game\'s whole root lit behind it') : bad('5.1 the advance and the root glow', JSON.stringify(seq));
    (seq.back === 's-over' && !seq.clear) ? ok('5.1 then it hands itself back to the result, unfaded and live again') : bad('5.1 the interlude returns to the result', JSON.stringify(seq));
  }

  // 5.4: the whole screen arrives once per profile, and only once
  { await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await click('[data-go="s-key"]'); await sleep(200);
    const first = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    await sleep(2600); await click('#s-key .back'); await sleep(600); await click('[data-go="s-key"]'); await sleep(240);
    const again = await page.evaluate(() => ({ cls: document.getElementById('s-key').classList.contains('first'), seen: JSON.parse(localStorage.getItem('ne')).prefs.keySeen }));
    (first && !again.cls && again.seen) ? ok('5.4 the keys animate into existence the first time and never again (prefs.keySeen)') : bad('5.4 the first-open animation', JSON.stringify({ first, ...again })); }

  // 6.1: "tap to begin" is display type on the title screen, and centred on the screen it sits on
  { await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ 'ne.prefs': { snd: 'off', musicG: {} } }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(5200);
    const h = await page.evaluate(() => { const e = document.getElementById('storyhint'); const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      return { size: parseFloat(c.fontSize), shown: c.display !== 'none', mid: r.left + r.width / 2, half: innerWidth / 2, txt: e.textContent.trim() }; });
    (h.shown && h.size >= 13 && Math.abs(h.mid - h.half) < 2) ? ok(`6.1 "${h.txt}" is ${h.size}px and centred on the screen`) : bad('6.1 tap to begin is larger and centred', JSON.stringify(h)); }

  // 6.3: a game unlocked since the last visit arrives on the grid, and wears the green mark as well
  { await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], unlock: { 'dots:blind': Date.now() }, ach: {}, intro: {}, seen: { 'game:quick-tap': 1 }, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await click('[data-go="s-pick"]'); await sleep(300);
    const t = await page.evaluate(() => { const e = document.querySelector('.tile[data-game="dots"]'); const q = document.querySelector('.tile[data-game="quick-tap"]');
      return { arrive: e.classList.contains('arrive'), green: e.classList.contains('newthing'), other: q.classList.contains('arrive') }; });
    (t.arrive && t.green && !t.other) ? ok('6.3 a newly unlocked game arrives on the grid and is marked green (L8) — and no tile that was already seen moves') : bad('6.3 the newly unlocked tile animates', JSON.stringify(t)); }

  // 6.4 / 6.5: the scores panel is a fixed box, and a pass & play Go says just Go
  { await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await openSheet('quick-tap', 0, 0); await click('#go-btn'); await driveToResult('quick-tap', '6.4 a run for the result screen', 30000);
    const box = await page.evaluate(() => {
      const w = document.querySelector('#over-top .otwrap'), body = document.getElementById('over-runs'), go = document.getElementById('to-games');
      const c = getComputedStyle(w); const one = body.innerHTML;
      const top1 = go.getBoundingClientRect().top;
      body.innerHTML = Array.from({ length: 10 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td>0</td><td>—</td></tr>`).join('');
      const top10 = go.getBoundingClientRect().top; body.innerHTML = one;
      return { h: parseFloat(c.height), scroll: c.overflowY, top1: Math.round(top1), top10: Math.round(top10) }; });
    (box.scroll === 'auto' && box.top1 === box.top10) ? ok(`6.4 the scores panel is a fixed ${Math.round(box.h)}px box that scrolls inside itself — Game select does not move when it fills`) : bad('6.4 the scores panel stops pushing Game select down', JSON.stringify(box));
    /* build 65 (64.4): THE RESULT FITS ONE SCREEN — ten rows in the board, and still no page scroll; Back top left; the box at least three rows
       tall and opened at this run's row; Game select on screen at the foot */
    const fit = await page.evaluate(async () => { const body = document.getElementById('over-runs'), one = body.innerHTML, w = document.querySelector('#over-top .otwrap');
      body.innerHTML = Array.from({ length: 10 }, (_, i) => `<tr class="${i === 8 ? 'cur' : ''}"><td>${i + 1}</td><td></td><td>0</td><td>—</td></tr>`).join('');
      const s = document.getElementById('s-over'), go = document.getElementById('to-games').getBoundingClientRect(), back = document.getElementById('over-back').getBoundingClientRect(), row = body.rows[0].getBoundingClientRect().height;
      (await import('./ui/router.js')).show('s-over'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const cur = body.querySelector('tr.cur'), wr = w.getBoundingClientRect(), cr = cur.getBoundingClientRect();
      const out = { scroll: s.scrollHeight - s.clientHeight, over: getComputedStyle(s).overflowY, goBottom: Math.round(innerHeight - go.bottom), back: [Math.round(back.left), Math.round(back.top)], rows: Math.floor(wr.height / row), curIn: cr.top >= wr.top - 1 && cr.bottom <= wr.bottom + 1 };
      /* 64.5: every row starts with its rank, in ink, inside the box — never pushed off its edge, never the table's grey */
      out.ranks = [...body.rows].map((r, i) => { const c = r.cells[0], b = c.getBoundingClientRect(); return { t: c.textContent, want: String(i + 1), inBox: b.left >= wr.left - 1 && b.right <= wr.right + 1 && b.width > 8, col: getComputedStyle(c).color }; });
      out.ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(); out.inkRgb = (() => { const p = document.createElement('i'); p.style.color = 'var(--ink)'; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; })();
      body.innerHTML = one; return out; });
    (fit.ranks.every(r => r.t === r.want && r.inBox && r.col === fit.inkRgb))
      ? ok('64.5 each of the ten rows starts with its rank (1–10), in ink, inside the box')
      : bad('64.5 the rank numbers in the top 10', JSON.stringify({ ranks: fit.ranks, ink: fit.inkRgb }));
    (fit.scroll <= 2 && fit.over !== 'auto' && fit.goBottom >= 0 && fit.back[0] < 20 && fit.rows >= 3 && fit.curIn)
      ? ok(`64.4 the result fits one screen at 390 x 844 with a full top 10: no page scroll, Back top left, the box ${fit.rows} rows tall and scrolled to this run, Game select ${fit.goBottom}px clear of the foot`)
      : bad('64.4 the result on one screen', JSON.stringify(fit));
    await click('#over-back'); await sleep(400);
    const gos = await page.evaluate(async () => { const out = {};
      const ST = await import('./core/state.js'); const P = await import('./ui/router.js');
      for (const [g, mi] of [['quick-tap', 0], ['reaction', 0], ['hold', 0]]) {
        const R = await import('./games/registry.js');
        Object.assign(ST.sel, { game: g, diff: R.GAMES[g].modes[mi], vs: 1 });
        P.show('s-pick', { g, d: R.GAMES[g].modes[mi] });
        await new Promise(r => setTimeout(r, 160));
        out[g] = document.getElementById('go-btn').textContent.trim(); }
      return out; });
    (Object.values(gos).every(v => v === 'Go')) ? ok(`6.5 a pass & play Go says just "Go", every game — no "10s each", no "pass & play" (${Object.keys(gos).join(', ')})`) : bad('6.5 the pass & play Go button', JSON.stringify(gos)); }
  /* ---- build 48 (FEEDBACK-v26 items 3, 9, 10, 11 and 12): the key screen's words, the earn reveal played to its last frame, the menu's green and
     the version label ---- */
  {
    const KC48 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const KY48 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const tap48 = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, sel);

    /* item 10 / 11 AMENDED AT BUILD 51 (v27 item 14): every animation the key lighting starts still reaches its end - none cancelled - before the
       key lets go of the screen, it still never shows "tap to continue" or a card, and it still ends by itself. What changed is the taps: they used
       to do nothing, and item 14 asks for a tap that SKIPS TO THE END at any point, so the run below is untapped and the tap is driven on its own
       further down. The escalation is no longer "more animations each tier" either - the Author key has no spokes at all, so it runs fewer than the
       other two and is grander in what is drawn (its cracks and thorns), which is checked in build 46's own section. */
    /* ---- v30 (59.13, build 59): THE FINISHED KEY MUST NOT FLASH UP BEFORE ITS OWN ANIMATION ----
       Aiden: "it shows a brief frame showing that the key was already complete, but then it does the animation again. So that just
       looks a little awkward." The Keys screen renders from STATE, and the state is a whole key — so it painted every spoke lit,
       held it about three frames, blanked, and only then drew them in. Same family as the chest cracks: the animation's start state
       was applied a tick AFTER the first paint instead of being in it.
       What is asserted is the mechanism, on the page: with `kdue` on (which the draw that SCHEDULES the earn sets) and `kearning`
       not yet added, every spoke, node and ring already computes to opacity 0. `ksettle` is excluded because that is the one moment
       `kdue` is still on and the key is meant to be lit. A per-frame trace of the first 500ms of all three keys, with build 58's
       paint reproduced beside it, is `_smoke/shots.mjs 59.13` — there build 58 shows 7 spokes lit on frame one and 12 frames fully
       lit before the animation, and build 59 shows none on any of the three. */
    {
      await boot({ allOpen: true });
      const dueState = await page.evaluate(async () => {
        const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
        R.show('s-key', { tier: 0 }); await wait(60);
        const el = document.getElementById('s-key');
        const cls = el.className;
        // force the DUE-but-not-yet-EARNING state the first paint is in, and read what the stylesheet makes of it
        el.classList.add('kdue'); el.classList.remove('kearning', 'ksettle');
        const op = sel => [...document.querySelectorAll(sel)].map(g => Math.round((parseFloat(getComputedStyle(g).opacity) || 0) * 100) / 100);
        const due = { kr: op('#key-ring .kr'), knode: op('#key-ring .knode'), kring: op('#key-ring .kring') };
        // and the settle, which is the one moment kdue is still on and the key is supposed to be lit
        el.classList.add('ksettle');
        const settle = { kr: op('#key-ring .kr') };
        el.className = cls;
        return { due, settle, hadKdueInClass: /\bkdue\b/.test(cls) };
      });
      const allDark = ['kr', 'knode', 'kring'].every(k => dueState.due[k].length === 0 || dueState.due[k].every(o => o <= .02));
      const settleLit = dueState.settle.kr.length > 0 && dueState.settle.kr.some(o => o > .02);
      (allDark && settleLit)
        ? ok(`v30 59.13 the earn animation's START STATE is in the first paint: with the screen DUE and the animation not yet running, all ${dueState.due.kr.length} spokes, ${dueState.due.knode.length} nodes and the ring already compute to opacity 0 — so the finished key cannot flash up before it — while the settle, the one moment the class is still on and the key is meant to be lit, reads lit`)
        : bad('v30 59.13 the key flashes complete before its animation', JSON.stringify(dueState));
    }

    /* ---- v30 (59.14, build 59): WHILE THE PROMPT IS UP, A TAP ANYWHERE OPENS THAT CHEST ----
       Aiden tapped beside the key on the Pro earn moment and landed on the HOME PAGE with the chest unopened: "really wherever the
       user clicks it should just take them to the chest ... So let's do that for all keys." The acceptance names five points, and
       they are the five driven here: the key itself, empty space, Back, a tier tab and the bottom edge. What they must all reach is
       that chest's OPENING — which since v24 C.1 (Aiden's own reversal, built for build 49) means its ask, one tap from the
       ceremony — and what none of them may reach is the menu, which is where the mis-tap used to land. */
    {
      await boot({ chests: { games: 1 } }, {}, { plain: PLAIN });
      const taps = await page.evaluate(async () => {
        const K = await import('./progress/key.js'), S = await import('./core/store.js'), R = await import('./ui/router.js');
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const bars = {}; for (const c of K.COMBOS) bars[K.skey(c.key, 'clear')] = 1;
        S.store.bars = bars; S.save();
        const out = [];
        const POINTS = [['the key', '#key-ring .khubhit'], ['empty space', '#key-main'], ['Back', '#s-key .back'],
          ['a tier tab', '#key-keys .kkey'], ['the bottom edge', '#key-hint']];
        for (const [name, sel] of POINTS.slice(0, 1)) {
          S.prefs.revealed = {}; S.prefs.keyWhole = {}; S.save();
          R.show('s-menu'); await wait(120); R.show('s-key', { tier: 0 });
          // let the earn play out and the prompt arrive
          for (let i = 0; i < 80; i++) { const h = document.getElementById('key-hint');
            if (h && h.classList.contains('kprompt') && getComputedStyle(h).visibility !== 'hidden') break; await wait(80); }
          const hint = document.getElementById('key-hint');
          const ready = !!(hint && hint.classList.contains('kprompt'));
          const el = document.querySelector(sel);
          const r = el ? el.getBoundingClientRect() : null;
          if (el) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 }));
          await wait(400);
          const askOn = !document.getElementById('key-ask').hidden;
          out.push({ name, found: !!el, promptWasUp: ready, ask: askOn, screen: (document.querySelector('.screen.on') || {}).id });
          const no = document.querySelector('[data-act="key-ask-no"]'); if (no) no.click(); await wait(150);
        }
        // and the one control that is hidden for the moment rather than made an exception
        S.prefs.revealed = {}; S.prefs.keyWhole = {}; S.save();
        R.show('s-menu'); await wait(120); R.show('s-key', { tier: 0 }); await wait(150);
        const mb = document.getElementById('key-music');
        const music = { duringEarn: mb.hidden || getComputedStyle(mb).display === 'none' };
        for (let i = 0; i < 80; i++) { const h = document.getElementById('key-hint');
          if (h && h.classList.contains('kprompt') && getComputedStyle(h).visibility !== 'hidden') break; await wait(80); }
        return { out, music };
      });
      /* AMENDED at build 68 (67.31, L13): THERE IS NO PROMPT TO TAP ANY MORE. The earn ends and the chest opens by itself (39b times it), so what is
         held here is that no prompt ever comes up, the chest's ceremony does, and SET THIS MUSIC stays out of the moment */
      const five = taps.out;
      const noPrompt = five.every(t => t.found && !t.promptWasUp);
      const opened = await page.evaluate(async () => (await import('./progress/key.js')).chestState('key'));
      (noPrompt && opened === 'open' && taps.music.duringEarn)
        ? ok(`L13 / 59.14 retired: after the Skill key's earn no "tap to open the chest" prompt comes up — the chest opens by itself (${opened}) — and SET THIS MUSIC is hidden for the moment`)
        : bad('L13 / 59.14 the key prompt is back, or the chest did not open', JSON.stringify({ taps, opened }));
    }

    await boot({ allOpen: true });
    const reveals = [];
    for (const tier of [0, 1, 2]) {
      await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(350);
      await page.evaluate(() => { const el = document.getElementById('s-key'), host = document.getElementById('key-cere'), t0 = performance.now(); const w = window.__r48 = { t0, cut: [], fin: 0, n: 0, lit: null, lastEnd: null, off: null, tap: false, card: false };
        // build 61: every time below is measured from the dev-whole button's OWN click, not from when this observer went in — the driver's
        // round trip between the two is its business, and on the test clock it was enough to push the key's end past KEY_EARN.ms + 900
        document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-act="dev-whole"]')) w.t0 = performance.now(); }, { capture: true, once: true });
        const mo = new MutationObserver(() => { const now = performance.now() - w.t0;
          if (host.classList.contains('tap')) w.tap = true; if (host.classList.contains('card') || host.querySelector('.rcard')) w.card = true;
          if (el.classList.contains('kearning') && w.lit === null) { w.lit = now; const as = document.getAnimations().filter(a => a.effect && a.effect.target && el.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime) && a.playState !== 'finished');
            w.n = as.length; as.forEach(a => a.finished.then(() => { w.fin++; w.lastEnd = performance.now() - w.t0; }, () => w.cut.push(a.animationName || 'x'))); }
          if (w.lit !== null && !el.classList.contains('kearning') && w.off === null) w.off = now; });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] }); mo.observe(host, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true }); w.mo = mo; });
      await tap48(`[data-act="dev-whole"][data-tier="${tier}"]`);
      let taps = 0, moved = false, lastTap = -1e9;
      for (let i = 0; i < 120; i++) { await sleep(200);
        const st = await page.evaluate(() => ({ on: !document.getElementById('key-cere').hidden, mid: document.getElementById('s-key').classList.contains('kearning'), scr: document.querySelector('.screen.on').id, t: performance.now() }));
        if (st.scr !== 's-key') moved = true;
        // Back is still refused while it plays (a tap is not - that is the skip, driven on its own below)
        // build 61: a Back every 600ms of the PAGE's time while it plays, not every fifth poll — how long a poll takes is the driver's business
        // and the Back is sent IN THE SAME FRAME it is checked, so a Back meant for the animation can never land on the frame after it ends
        if (st.on && st.mid && st.t - lastTap >= 600) { if (await page.evaluate(async () => { const R = await import('./ui/router.js');
            if (document.getElementById('key-cere').hidden || !document.getElementById('s-key').classList.contains('kearning')) return false; R.back(); return true; })) taps++; lastTap = st.t; }
        if (!st.on && i > 5) break; }
      const r = await page.evaluate(() => { const w = window.__r48; w.mo.disconnect(); delete w.mo; return Object.assign({}, w, { hint: getComputedStyle(document.getElementById('key-hint')).visibility, on: !document.getElementById('key-cere').hidden }); });
      reveals.push(Object.assign(r, { tier, taps, moved }));
    }
    const badRev = reveals.filter(r => r.cut.length || !r.n || r.fin !== r.n || r.off === null || r.off + 1 < r.lastEnd || r.tap || r.card || r.on || r.moved || r.taps < 2 || r.hint !== 'visible');
    /* v29 SECTION A (57.7, build 57): THE MOTION IS THE CLOCK, AND v28 ITEM 15'S RULE HERE IS REVERSED WITH IT. Item 15 asked that each tier's
       `ms` BE its own earn music's length to within a beat; Aiden played that and found a second of settling with nothing moving on Skill and
       Pro and two on Author. So the assertion turns over: `ms` is the MOTION's length and must be SHORTER than the music by a real margin (300ms),
       with the music's own length untouched — its tail rings on across the cut into the chest. The movement rule and the assembly floor are
       exactly as they were, and the last step is still `land` landing on `ms`. */
    const KY51 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href), T51 = ['clear', 'pro', 'author'];
    const AUK = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
    const musicMs = t => Math.round(Math.max(0, ...AUK.KEY_EARN_FX[t].notes.map(n => n[0] * 1000 + n[2])));
    const asmOf = t => { const E = KY51.KEY_EARN[t], r = E.steps.find(x => x.name === 'rise'); return r ? r.at : E.ms; };
    const inTime = reveals.every((r, i) => { const t = T51[i], E = KY51.KEY_EARN[t];
      const last = E.steps[E.steps.length - 1];
      return E.ms <= musicMs(t) - 300 && last.name === 'land' && Math.abs(last.at + last.ms - E.ms) <= 60
        && asmOf(t) >= E.ms * .25 && r.off <= E.ms + 900; });
    (!badRev.length && inTime)
      ? ok(`v26 items 10 / 11 / v29 57.7 all three key animations play to their last frame and each one ENDS ON ITS OWN LAST MOVEMENT, with the music's tail ringing across the cut: ${reveals.map((r, i) => `${['Skill', 'Pro', 'Author'][r.tier]} ${r.fin}/${r.n} animations ended, none cut, ${Math.round(r.off)}ms against ${KY51.KEY_EARN[T51[i]].ms}ms of animation inside ${musicMs(T51[i])}ms of music (${musicMs(T51[i]) - KY51.KEY_EARN[T51[i]].ms}ms of tail), the assembly ${Math.round(asmOf(T51[i]) / KY51.KEY_EARN[T51[i]].ms * 100)}% of it`).join(' · ')}; ${reveals.reduce((n, r) => n + r.taps, 0)} Backs during them did nothing, and none showed "tap to continue" or a card`)
      : bad('v26 items 10 / 11 the key reveals', JSON.stringify(reveals));

    // item 9: a key card is its name and its own percentage - no theme name - and the line under the key is "N of 30"
    await boot({ chests: { games: 1 } }, { unlock: Object.fromEntries((await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).map(k => [k, NOW])), bars: { 'quick-tap:two:5': NOW } });
    const card48 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); R.show('s-key', { tier: 0 }); await new Promise(r => setTimeout(r, 600));
      const C = (await import('./config/copy.js')).KEY, st = K.keyState('clear');
      return { cards: [...document.querySelectorAll('#key-keys .kkey')].map(k => ({ i: k.querySelectorAll('i').length, b: k.querySelector('b').textContent, u: k.querySelector('u').textContent })), count: document.getElementById('key-count').textContent, pct: K.bandPct('clear'), meter: K.meter(),
        bars: C.cardBars.replace('{done}', st.done).replace('{total}', st.total) }; });
    const names48 = KY48.KEYS.map(k => k.name);
    // AMENDED at build 65 (64.18): the card counts bars, like the line under the key — one progress number on the screen; the % is the menu's
    (card48.cards.every((c, i) => !c.i && c.b === names48[i]) && card48.cards[0].u === card48.bars && !/%/.test(card48.cards.map(c => c.u).join('')) && card48.count === '1 of 30' && card48.meter === card48.pct)
      ? ok(`v26 item 9 / 64.18 the three key cards say ${names48.join(' / ')} and no theme name; key 1's card counts its bars (${card48.cards[0].u}) like the line under the key ("${card48.count}"); no percentage on the screen`)
      : bad('v26 item 9 the key cards and the count line', JSON.stringify({ card48, names48 }));

    /* item 11: after the reveal the ONE instruction is the key's. AMENDED for build 49 (Aiden, after build 48): tapping the key ASKS again, and Open opens
       its chest. Testing's "key chest · ready" leaves key 1 whole and its reveal unseen, as a player who has just cleared the last bar is */
    await boot({});
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(300);
    await tap48('[data-act="dev-chestall"][data-chest="key"]'); await sleep(300);
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 0 }); }); await sleep(250);
    const due48 = await page.evaluate(() => getComputedStyle(document.getElementById('key-hint')).visibility);
    /* AMENDED at build 68 (67.31, L13): after the reveal there is no instruction to follow — the Skill chest's ceremony takes the screen by itself, no
       prompt and no ask; tapped through, it lands on the map */
    let open48 = null; for (let i = 0; i < 90; i++) { await sleep(200); open48 = await page.evaluate(() => ({ ask: !document.getElementById('key-ask').hidden, playing: !document.getElementById('key-cere').hidden, kind: document.getElementById('key-cere').dataset.kind, chest: document.getElementById('key-cere').dataset.rev, prompt: document.getElementById('key-hint').classList.contains('kprompt') })); if (open48.kind === 'chest') break; }
    const after48 = { hint: '', vis: 'visible', tapLine: 0 }, ask48 = { ask: true, playing: false, txt: '' };
    await revealDone({ video: true }); await sleep(400);
    // AMENDED at build 68 (67.28): the chest's video comes straight after its card (a first viewing must be watched), and the map after the video
    const vid48 = await page.evaluate(() => { const v = document.getElementById('vplay'); return !!v && !v.hidden; });
    if (vid48) { await page.evaluate(() => { const v = document.querySelector('#vplay video'); if (v) v.dispatchEvent(new Event('ended')); }); await sleep(1600); }
    const landed48 = vid48 ? await onScreen() : 'no video';
    const askWant48 = KC48.KEY.ask.replace('{chest}', KC48.GRID.chest.key).toLowerCase();
    (due48 === 'hidden' && !open48.prompt && !open48.ask && open48.playing && open48.kind === 'chest' && open48.chest === 'key' && landed48 === 's-pick')
      ? ok(`L13 / v26 item 11 once key 1's reveal has played, the Skill chest's ceremony takes the screen by itself — no prompt, no ask (AMENDED at build 68, 67.31) — and tapped through it lands on the map; the Skill chest, ending on the map`)
      : bad('v26 item 11 the key to its chest', JSON.stringify({ due48, after48, ask48, open48, landed48 }));

    /* item 3: every home menu item is green from the moment it is available until it is opened once - Keys and Customise UNLOCKED THROUGH PLAY, the
       opens saved, and Testing's fresh game clearing them */
    const menu48 = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#s-menu .item')].filter(b => b.dataset.dev === undefined).map(b => [b.dataset.go, b.classList.contains('newthing') ? 'green' : b.classList.contains('dim') || b.classList.contains('keylock') || b.classList.contains('cuslock') ? 'shut' : 'plain'])));
    const unl48 = Object.fromEntries((await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k !== 'quick-tap:four').map(k => [k, NOW]));
    /* AMENDED AT BUILD 64 (62.14): what opens Scores, Progress and About is the walkthrough's last box, no longer the first run — so the profile
       starts with it unfinished (m0: all shut), and it is marked finished before the run this check plays */
    await boot({ played: 0, tut: 0, menuOpened: {} }, { unlock: unl48 });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(300);
    const m0 = await menu48();
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.tut = 2; S.save(); });
    await click('#s-menu [data-go="s-pick"]'); await sleep(900);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[0].click()); await sleep(320);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const run48 = await driveToResult('quick-tap', 'v26 item 3 a Quick Tap - Two run, the last mode');
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(900);
    const m1 = await menu48();
    await click('#s-menu [data-go="s-pick"]'); await sleep(900);
    await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(400);
    await revealDone(); await sleep(500);
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(900);
    const m2 = await menu48();
    await click('#s-menu [data-go="s-key"]'); await sleep(700); await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(400);
    const m3 = await menu48();
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const m4 = await menu48();
    await click('#s-menu [data-go="s-custom"]'); await sleep(700); await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(400);
    const m5 = await menu48();
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(300);
    await tap48('[data-act="dev-fresh"]'); await sleep(500);
    for (let i = 0; i < 8 && (await page.evaluate(() => !!document.querySelector('#s-menu.story'))); i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
    await sleep(600); const m6 = await menu48(); const fresh6 = (await getJSON('ne')).prefs.menuOpened;
    (m0['s-pick'] === 'green' && ['s-board', 's-prog', 's-about', 's-key', 's-custom'].every(k => m0[k] === 'shut') && run48 === 's-over'
      // AMENDED at build 65 (64.7): the walkthrough no longer opens Scores, Progress and About, and a Quick Tap run opens none of them — the Games chest does
      && m1['s-pick'] === 'plain' && ['s-board', 's-prog', 's-about', 's-key', 's-custom'].every(k => m1[k] === 'shut') && ['s-board', 's-prog', 's-about'].every(k => m2[k] === 'green')
      && m2['s-key'] === 'green' && m2['s-custom'] === 'green' && m3['s-key'] === 'plain' && m3['s-custom'] === 'green' && m4['s-key'] === 'plain' && m4['s-custom'] === 'green'
      && m5['s-custom'] === 'plain' && m5['s-board'] === 'green' && m6['s-pick'] === 'green' && JSON.stringify(fresh6) === '{}')
      ? ok('v26 item 3 every menu item is green from the moment it is available until it is opened once: Play from the first load; Scores, Progress and About at their own moments or with the Games chest (64.7); Keys and Customise once the Games chest is EARNED BY A RUN and opened on the map - opening each one spends its green, a reload keeps that, and Testing\'s fresh game gives every item its green back')
      : bad('v26 item 3 the green menu items', JSON.stringify({ m0, run48, m1, m2, m3, m4, m5, m6, fresh6 }));

    // item 12: the version label is on the home menu and nowhere else
    await boot({ allOpen: true });
    const stamp48 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const b = document.getElementById('build'); const out = {};
      for (const id of ['s-menu', 's-pick', 's-key', 's-board', 's-prog', 's-custom', 's-about', 's-testing', 's-menu']) { R.show(id); await wait(250); out[id] = b.hidden || getComputedStyle(b).display === 'none' ? 'hidden' : 'shown'; }
      return out; });
    (stamp48['s-menu'] === 'shown' && Object.entries(stamp48).every(([id, v]) => id === 's-menu' || v === 'hidden'))
      ? ok(`v26 item 12 the "${await page.evaluate(() => document.getElementById('build').textContent)}" label shows on the home menu and on none of the other seven screens`)
      : bad('v26 item 12 the version label', JSON.stringify(stamp48));

    /* v26 item 2 (build 49) AMENDED AT BUILD 51 (v27 item 2 / R1): the map's first open EVER is drawn out, one tile at a time, plays once, and
       Testing's fresh game plays it again. A brand new profile has opened no chest, so NEITHER GAUNTLET IS ON IT - and no beat is left where one
       would have been, which is the "no gap" half of item 2. Eleven tiles, not thirteen, and about a second shorter. */
    const MI49 = (await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href)).MAP_INTRO;
    const intro = () => page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); R.show('s-pick'); await wait(300);
      return [...document.querySelectorAll('#grid .tile')].filter(t => !t.hidden).map(t => { const a = t.getAnimations().find(x => x.animationName === 'tilein'), tm = a ? a.effect.getComputedTiming() : null;
        return { k: t.dataset.game ? 'game' : t.dataset.gauntlet ? 'gauntlet' : 'chest', id: t.dataset.game || t.dataset.gauntlet || t.dataset.chest, d: tm ? tm.delay : -1, ms: tm ? +tm.duration : 0 }; }); });
    await boot({ gridSeen: 0 }, { unlock: { 'quick-tap:four': Date.now() } });
    const first = await intro();
    await page.evaluate(async () => { (await import('./ui/router.js')).show('s-menu'); }); await sleep(200);
    const again = await intro();
    await page.evaluate(async () => { (await import('./ui/router.js')).show('s-testing'); }); await sleep(250);
    await click('[data-act="dev-fresh"]'); await sleep(600);
    const replay = await intro();
    const order = first.slice().sort((a, b) => a.d - b.d), kinds = order.map(t => t.k).join();
    const total = Math.max(...first.map(t => t.d + t.ms)), gamesInOrder = order.filter(t => t.k === 'game').map(t => t.id).join() === GAMES.join();
    // the chests follow the seventh game by `chestAt` alone: no slot is held for a Gauntlet that is not there
    const noHole = order[7] && order[7].k === 'chest' && order[7].d === order[6].d + MI49.gap + MI49.chestAt;
    (first.length === 11 && first.every(t => t.d >= 0 && t.ms === MI49.ms) && kinds === 'game,game,game,game,game,game,game,chest,chest,chest,chest' && gamesInOrder && noHole
      // AMENDED AT BUILD 64 (62.1): twice as fast — the length is the config's own sum (last chest's delay + one arrival), and it is under 4s
      && new Set(first.map(t => t.d)).size === 11 && total === MI49.at + 7 * MI49.gap + MI49.chestAt + 3 * MI49.chestGap + MI49.ms && total <= 4000
      && again.every(t => t.d < 0) && replay.length === 11 && replay.every(t => t.d >= 0))
      ? ok(`v26 item 2 / v27 item 2 the map's first open is drawn out to ${(total / 1000).toFixed(1)}s: the seven games one at a time top to bottom, then the four chests last, each arriving over ${MI49.ms}ms at a moment of its own - and NEITHER GAUNTLET is on it, with no beat left where one would have been (the first chest lands ${MI49.chestAt}ms after the seventh game); the next open has no intro, and Testing's fresh game plays it again`)
      : bad('v26 item 2 the map intro', JSON.stringify({ first, total, again: again.filter(t => t.d >= 0).length, replay: replay.length }));

    /* v26 item 4 (build 49): an unlocked slot with a real clip pulses until it is played; a placeholder and a locked slot never do, and About stays green on the
       menu while one waits */
    await boot({ chests: { games: 1 }, menuOpened: { 's-pick': 1, 's-board': 1, 's-prog': 1, 's-key': 1, 's-custom': 1, 's-about': 1 } });
    /* AMENDED AT BUILD 52 (v27 items 8 and 11): the slot ids are item 8's line-up and EVERY slot carries the test card, so the control for
       "an open placeholder never pulses" is made here by emptying one rather than by finding one that happens to be empty. The row that is
       opened is the Games chest's, because item 8's Welcome now waits for a run. The player is the shared one, so `.click()` opens it and
       the row repaints itself through onVideoSeen without the list rebuilding. */
    const pulse = await page.evaluate(async () => { const M = await import('./config/messages.js'); const R = await import('./ui/router.js'); const V = await import('./ui/video.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const rowOf = id => document.querySelector(`#msglist .msgrow[data-msg="${id}"]`);
      const keep = M.MESSAGES.find(m => m.id === 'skill').file; M.MESSAGES.find(m => m.id === 'skill').file = '';
      const st = id => { const r = rowOf(id); return r ? { unwatched: r.classList.contains('unwatched'), anim: getComputedStyle(r.querySelector('.msgframe')).animationName } : null; };
      const green = () => document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('newthing');
      R.show('s-menu'); await wait(250); const out = { greenBefore: green() };
      R.show('s-about'); await wait(400); out.games = st('games'); out.skill = st('skill'); out.thanks = st('thanks');
      rowOf('games').click(); await wait(800); out.played = st('games');
      V.closeVideo(); await wait(700);
      R.show('s-menu'); await wait(250); out.greenAfter = green();
      R.show('s-about'); await wait(400); out.reopened = st('games');
      M.MESSAGES.find(m => m.id === 'skill').file = keep;
      return out; });
    (pulse.greenBefore && pulse.games.unwatched && pulse.games.anim === 'msgpulse' && !pulse.skill.unwatched && pulse.skill.anim === 'none' && !pulse.thanks.unwatched && pulse.thanks.anim === 'none'
      && !pulse.played.unwatched && pulse.played.anim === 'none' && !pulse.greenAfter && !pulse.reopened.unwatched)
      ? ok('v26 item 4 on About an unlocked slot with a real clip pulses and glows until it is played - tapping play counts, and it stays settled after - while an open placeholder and a locked slot with a clip never pulse; the About row on the menu stays green while one is waiting and goes plain once it is watched')
      : bad('v26 item 4 the unwatched pulse', JSON.stringify(pulse));
  }

  /* ---- v27 items 7 and 8 (build 52): THE NEW LINE-UP OF EIGHT, AND FOUR KINDS OF LOCK. Aiden rewrote the list: Welcome waits for the first
     Quick Tap . Sprint, the three "... is whole" key rows are gone, two Gauntlet rows arrive and the last is the support thank-you. R1 is the
     part worth driving: a Gauntlet's row is NOT IN THE LIST at all until its Gauntlet has come out of its chest - no row, no gap, no "???" -
     while the counter still says "of 8". ---- */
  {
    const MS52 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
    const TITLES = MS52.MESSAGES.map(m => m.title);
    const go52 = (id, o) => page.evaluate(async (i, x) => { const R = await import('./ui/router.js'); R.show(i, x); }, id, o || {});
    const SPRINT52 = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 }];
    const rows = async () => page.evaluate(() => ({ ids: [...document.querySelectorAll('#msglist .msgrow')].map(r => r.dataset.msg),
      locked: [...document.querySelectorAll('#msglist .msgrow')].map(r => r.classList.contains('locked')),
      need: [...document.querySelectorAll('#msglist .msgrow')].map(r => r.querySelector('.msgtxt small').textContent),
      lede: document.getElementById('msg-lede').textContent, gap: [...document.querySelectorAll('#msglist .msgrow.hidden, #msglist .msgrow.secret')].length,
      qm: /\?\?\?/.test(document.getElementById('msglist').textContent) }));
    // nothing done: no chest, no run. Six rows, both Gauntlets absent, and the count is 0 of 8
    await boot({});
    await go52('s-about'); await sleep(500); const fresh52 = await rows();
    // the Games chest opened: the Gauntlet arrives in the list (still locked - the Gauntlet has not been PLAYED), Gauntlet II still absent
    await boot({ chests: { games: 1, key: 1 } });
    await go52('s-about'); await sleep(500); const oneG = await rows();
    // and a solo Quick Tap . Sprint opens Welcome, which nothing else does
    const welcome = await page.evaluate(async () => { const P = await import('./progress.js'); const M = await import('./config/messages.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const w = M.MESSAGES.find(m => m.id === 'intro');
      const before = K.msgOpen(w);
      P.Scores.runs().unshift({ t: Date.now(), g: 'quick-tap', d: 'two', s: 15, hits: 9, misses: 0, v: 4 });
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300); const wrongLen = K.msgOpen(w);
      // AMENDED AT BUILD 64 (62.12): the first Sprint no longer opens it either — Dots unlocking does
      P.Scores.runs().unshift({ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 });
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300); const sprint = K.msgOpen(w);
      P.unlocked()['dots:' + (await import('./games/registry.js')).GAMES.dots.modes[0]] = Date.now();
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300);
      const row = document.querySelector('#msglist .msgrow[data-msg="intro"]');
      return { before, wrongLen: wrongLen || sprint, after: K.msgOpen(w), open: !row.classList.contains('locked'), lede: document.getElementById('msg-lede').textContent }; });
    // both Gauntlets played: eight rows, and the support row is the only one still locked
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, gauntSeen: { g1: 1, g2: 1 }, paid: 1 }, { runs: SPRINT52, unlock: { 'dots:blind': Date.now() } });
    await go52('s-about'); await sleep(500); const allG = await rows();
    // the support hook is prefs.paid and NOTHING in the app writes it: the support button says its piece and the thank-you stays shut
    await boot({ chests: { games: 1 } });
    const supTap = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-about'); await wait(300); document.getElementById('support').click(); await wait(300);
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300);
      return { paid: JSON.parse(localStorage.getItem('ne')).prefs.paid || 0, shut: document.querySelector('#msglist .msgrow[data-msg="thanks"]').classList.contains('locked') }; });
    const ids52 = MS52.MESSAGES.map(m => m.id);
    const shapes = MS52.MESSAGES.every(m => m.by && Object.keys(m.by).length === 1 && ['run', 'chest', 'gauntlet', 'support', 'game'].includes(Object.keys(m.by)[0]))
      && !MS52.MESSAGES.some(m => m.by.key) && MS52.MESSAGES.filter(m => m.by.gauntlet).length === 2 && MS52.MESSAGES.filter(m => m.by.chest).length === 4;
    const item7 = TITLES[1] === "You've seen them all!" && !TITLES.some(t => /is whole|Every game is open/.test(t));
    const of8 = [fresh52, oneG, allG].every(r => / of 8$/.test(r.lede)) && /0 of 8/.test(fresh52.lede) && /8 of 8/.test(allG.lede);
    const hidden = fresh52.ids.join() === ids52.filter(i => !['g1', 'g2'].includes(i)).join() && oneG.ids.join() === ids52.filter(i => i !== 'g2').join() && allG.ids.join() === ids52.join()
      && ![fresh52, oneG, allG].some(r => r.qm || r.gap);
    const locks = fresh52.locked.every(Boolean) && oneG.need.some(n => /opens when you play Gauntlet/i.test(n)) && fresh52.need.some(n => /unlock dots/i.test(n))
      && allG.locked.filter(Boolean).length === 0 && /support the game/i.test(oneG.need[oneG.ids.indexOf('thanks')]);
    (shapes && item7 && of8 && hidden && locks && welcome.before === false && welcome.wrongLen === false && welcome.after === true && welcome.open && !supTap.paid && supTap.shut)
      ? ok(`v27 items 7 / 8 About carries Aiden's new eight (${TITLES.join(' | ')}): Welcome waits for Dots to unlock (62.12 — a Quick Tap Dash or Sprint does not open it), the four chests keep the middle, and the three "... is whole" key rows are gone. R1 holds - a Gauntlet's row is NOT IN THE LIST until its Gauntlet has come out of its chest (${fresh52.ids.length} rows, then ${oneG.ids.length}, then ${allG.ids.length}), with no gap and no "???" - while the counter always says "of 8". The thank-you is listed and locked on "opens when you support the game", and tapping Support does not open it`)
      : bad('v27 items 7 / 8 the message line-up', JSON.stringify({ shapes, item7, of8, hidden, locks, welcome, supTap, fresh52, oneG, allG }));
  }

  /* ---- v27 items 9, 10 and 11 (build 52): THE SHARED VIDEO PLAYER. One player for all eight clips, 16:9 in a drawn frame over the dimmed
     game, never edge to edge, title above and captions below, tap outside to close - with a power-on and a power-off built into the player
     rather than the files, so every clip gets them. ---- */
  {
    const MS52b = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
    const P52 = MS52b.PLAYER;
    // item 10's cap, off the data: the power-on is 750ms at most and its steps are the named ones, in order
    const onSpan = Math.max(...P52.on.steps.map(x => x.at + x.ms)), offSpan = Math.max(...P52.off.steps.map(x => x.at + x.ms));
    const timing = P52.on.ms <= 750 && onSpan <= P52.on.ms && offSpan <= P52.off.ms
      && P52.on.steps.map(x => x.name).join() === 'outline,line,open' && P52.off.steps.map(x => x.name).join() === 'static,close,dot,fade' /* AMENDED at build 68 (67.14): the switch-off opens on a burst of static */
      && P52.inset > 0 && P52.inset < 25;
    /* the test card is really there and it is NOT build 46's planted video/test.mp4 (item 11 says so in as many words).
       AMENDED AT BUILD 59 (v30 59.10): the Welcome slot points at Aiden's own clip now, so "every slot is the test card" is no longer
       the rule. What replaces it is stricter than what it replaces: every file a slot names EXISTS ON DISK (the old check never asked
       that of the card itself), every `cc` a slot names exists too, and anything that is not the test card is still NAMED as a test —
       which is 59.10's own instruction, "It is a TEST — name it that way so nobody ships it". */
    const onDisk52 = f => !!f && fs.existsSync(path.join(root, ...String(f).split('/')));
    const card = onDisk52('video/test-card.mp4') && onDisk52('video/test-card.vtt') && !fs.existsSync(path.join(root, 'video', 'test.mp4'))
      && MS52b.MESSAGES.every(m => onDisk52(m.file) && (!m.cc || onDisk52(m.cc)))
      && MS52b.MESSAGES.every(m => /test/i.test(m.file));
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, gauntSeen: { g1: 1, g2: 1 }, paid: 1 }, { runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 }] });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-about'); }); await sleep(500);
    const play = await page.evaluate(async P => { const CH = await import('./ui/chest.js'); const M = await import('./config/messages.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      // AMENDED at build 66 (65.18): the chest slots hold the portrait Welcome clip now, so the 16:9-with-captions player is driven on Gauntlet Mini's slot
      document.querySelector('#msglist .msgrow[data-msg="g1"]').click(); await wait(60);
      const h = document.getElementById('vplay'), fr = h.querySelector('.vframe'), v = h.querySelector('video');
      const anim = el => el.getAnimations().map(a => a.animationName).filter(Boolean).join();
      const out = { built: !!h, hidden: h.hidden, von: h.classList.contains('von'), title: h.querySelector('.vtitle').textContent,
        foot: h.querySelector('.vfoot').textContent, over: !!h.querySelector('.vpic video') && !h.querySelector('.vframe .vtitle, .vframe .vcc, .vframe .vfoot'),
        ctrl: v ? v.hasAttribute('controls') : true, inline: v ? v.hasAttribute('playsinline') : false, auto: v ? v.hasAttribute('autoplay') : true,
        src: v ? v.querySelector('source').getAttribute('src') : '', cc: v ? !!v.querySelector('track[kind="captions"][default]') : false,
        glowVar: h.style.getPropertyValue('--vg'), want: CH.msgCol(M.MESSAGES.find(x => x.id === 'g1')), wantTitle: (await import('./progress/key.js')).msgTitle(M.MESSAGES.find(x => x.id === 'g1')),
        vars: [].concat(P.on.steps, P.off.steps).every(x => h.style.getPropertyValue('--v-' + x.name + '-at') === x.at + 'ms' && h.style.getPropertyValue('--v-' + x.name + '-ms') === x.ms + 'ms'),
        anims: [anim(fr), anim(h.querySelector('.vpic')), anim(h.querySelector('.vline'))].join('/') };
      // the frame is inset from every edge, and it is 16:9 - measured off the box the page actually laid out
      await wait(P.on.ms + 250);
      const r = fr.getBoundingClientRect();
      out.box = { l: Math.round(r.left), t: Math.round(r.top), rr: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom), ratio: +(r.width / r.height).toFixed(2), w: Math.round(r.width) };
      out.lit = h.classList.contains('vlit'); out.after = h.classList.contains('von');
      // the captions land UNDER the frame, from the track, and the track itself is hidden so nothing paints over the picture
      const t0 = v && v.textTracks && v.textTracks[0]; out.trackMode = t0 ? t0.mode : '';
      out.ccBelow = h.querySelector('.vcc').getBoundingClientRect().top >= r.bottom - 1 && h.querySelector('.vtitle').getBoundingClientRect().bottom <= r.top + 1;
      // a tap on the picture pauses it, a tap outside closes it, and the power-off runs on the way out
      fr.click(); await wait(120); out.paused = !!(v && v.paused); out.dim = !h.classList.contains('vlit');
      h.querySelector('.vback').click(); await wait(80);
      out.voff = h.classList.contains('voff'); out.offAnims = [anim(fr), anim(h.querySelector('.vpic')), anim(h.querySelector('.vline'))].join('/');
      await wait(P.off.ms + 250); out.gone = h.hidden && !h.querySelector('video');
      return out; }, P52);
    // AMENDED at build 68 (67.6): the title is two lines now — the eyebrow, then the clip's name in quotes — so the name is read inside it
    const shown = play.built && !play.hidden && play.von && play.title.includes(play.wantTitle) && /tap outside to close/i.test(play.foot)
      && play.inline && !play.ctrl && !play.auto && play.src === 'video/test-card.mp4' && play.cc && play.trackMode === 'hidden' && play.ccBelow && play.over;
    const framed = play.box.l >= 12 && Math.abs(play.box.l - play.box.rr) <= 2 && play.box.t > 0 && play.box.b > 0 && Math.abs(play.box.ratio - 16 / 9) < .05
      && Math.abs(play.box.w - (390 - 390 * P52.inset / 100 * 2)) <= 4;
    const power = play.vars && play.anims === 'vonframe/vonpic/vonline' && !play.after && play.offAnims === 'vofframe/voffpic/voffline' && play.voff && play.gone;
    (timing && card && shown && framed && power && play.lit && play.paused && play.dim && play.glowVar === play.want)
      ? ok(`v27 items 9 / 10 / 11 one shared video player: the clip is 16:9 (${play.box.ratio}) and inset ${play.box.l}px a side of a 390px screen - ${P52.inset}% each edge, never edge to edge - in a drawn frame that glows the unlocking chest's colour (${play.want}) while it plays and dims the moment it is paused; the title is above it, the captions below it from a HIDDEN track so nothing paints over the picture, "tap outside to close" at the foot, and there is no native control bar - a tap on the picture pauses, a tap outside closes. The power-on is ${P52.on.ms}ms (item 10 caps it at 750) and the power-off ${P52.off.ms}ms, both built into the player from named steps (${P52.on.steps.map(x => x.name).join(' > ')} / ${P52.off.steps.map(x => x.name).join(' > ')}), so every clip gets them; all eight slots point at the test card (item 11) and it is not build 46's planted video/test.mp4`)
      : bad('v27 items 9 / 10 / 11 the video player', JSON.stringify({ timing, card, shown, framed, power, play }));
  }
  /* ---- v29 (items 1 / 10 / 11 / 13, build 55): the meter, the Next card, a dev-opened tier and a clip that will not load ---- */
  {
    /* item 1: build 53 put meterPct() over the top of meter() and clamped it to 100, so the front of the app read 100%
       with two of the three keys still empty. The 2026-09-14 decision stands: one continuous meter, 0-300. */
    /* AMENDED AT BUILD 59 (v30 59.11): the first band is MODES + KEY-1 BARS now, so a fixture that banks every bar and leaves every
       mode locked is not a state play can reach and would read 71, not 100. The fixture opens the modes as well — and the check below
       it asserts WHY that is not a fudge: every unlockable mode carries at least one key-1 bar, so clearing all 30 bars is only
       possible with every mode open. That is what keeps Aiden's "100 means key 1 whole" true under the new split. */
    const m55 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const U = await import('./config/unlocks.js');
      const was = { ch: S.prefs.chests, bars: S.store.bars, unlock: S.store.unlock };
      S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 0 }; S.store.bars = {};
      S.store.unlock = Object.fromEntries(U.UNLOCKS.map(u => [u.key, Date.now()]));
      for (const c of K.COMBOS) { S.store.bars[K.skey(c.key, 'clear')] = 1; S.store.bars[K.skey(c.key, 'pro')] = 1; }
      const out = { meter: K.meter(), pct: K.meterPct(), max: K.meterMax(), key1: K.bandPct('clear'), pro: K.bandPct('pro'), author: K.bandPct('author') };
      S.prefs.chests = was.ch; S.store.bars = was.bars; S.store.unlock = was.unlock; S.save(); return out; });
    // AMENDED at build 66 (65.14) and back at build 68 (67.37, L11): with the Skill chest open what a surface PRINTS is the meter itself — 200 here
    (m55.pct === 200 && m55.meter === 200 && m55.max === 300 && m55.key1 === 100 && m55.pro === 100 && m55.author === 0)
      ? ok('L11 / item 1 / v30 59.11 the meter is one continuous 0-300 — every mode open and every key-1 and Pro bar cleared is 200 on the meter, and what a surface PRINTS (meterPct) is 200')
      : bad('item 1 the meter at key 1 + Pro', JSON.stringify(m55));

    /* v30 (59.11, build 59): AND 100 STILL MEANS KEY 1 WHOLE. The first hundred is now shared between the modes and the key-1 bars,
       which only leaves "100 = key 1 whole" true if a whole key implies every mode. It does, and not by luck: a key-1 bar is a bar on
       a game:mode:length combination, so every unlockable mode carries at least one, and there is no way to clear all 30 with a mode
       still locked. Asserted from the data rather than assumed, because if a mode were ever added without a bar this silently breaks
       and the front of the app would stop at 97% for a player who had finished the key. */
    const cover59 = await page.evaluate(async () => { const K = await import('./progress/key.js'), P = await import('./progress.js'), G = await import('./config/games.js');
      const withBar = new Set(K.COMBOS.map(c => c.g + ':' + c.d));
      const modes = []; for (const g in G.GAMES) for (const d of G.GAMES[g].modes) modes.push(g + ':' + d);
      return { modes: modes.length, missing: modes.filter(k => !withBar.has(k)), bars: K.COMBOS.length, free: P.modeCount().free }; });
    (!cover59.missing.length)
      ? ok(`v30 59.11 100 still means key 1 whole: all ${cover59.modes} modes carry at least one of the ${cover59.bars} key-1 bars, so the key cannot be finished with a mode still locked and the modes' share of the first hundred is always full by the time the last bar lands`)
      : bad('v30 59.11 a mode with no key-1 bar would strand the meter under 100', JSON.stringify(cover59));

    /* item 13: chestOpen() honours OPEN EVERYTHING and SUPPORTER — right for every READ — but checkKey and retroArrived were
       banking real |pro and |author bars while a flag was on, and those bars stay once it is off. */
    const dev55 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const was = { ch: S.prefs.chests, open: S.prefs.allOpen, bars: S.store.bars, retro: S.prefs.retroCol };
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.allOpen = true; S.store.bars = {}; S.prefs.retroCol = {};
      const c = K.COMBOS.find(x => x.g === 'quick-tap' && x.d === 'two');
      K.checkKey({ t: Date.now(), g: c.g, d: c.d, s: c.s, misses: 0, hits: (K.barOf(c, 'author') || 0) + 1000, v: 4 }, false);
      K.retroArrived();
      const keys = Object.keys(S.store.bars);
      const open = K.tierOpen('pro'), earned = K.tierEarned('pro');
      S.prefs.chests = was.ch; S.prefs.allOpen = was.open; S.store.bars = was.bars; S.prefs.retroCol = was.retro; S.save();
      return { keys, open, earned }; });
    (!dev55.keys.length && dev55.open && !dev55.earned)
      ? ok('item 13 a dev-opened tier is SHOWN and never BANKED — OPEN EVERYTHING still reads as open everywhere, and neither checkKey nor the boot-time retro credit writes a bar behind a chest nobody opened')
      : bad('item 13 OPEN EVERYTHING stores bars', JSON.stringify(dev55));

    /* item 11: nextGoal walked UNLOCKS in table order with no test of whether the row's own `where` is reachable, so the moment
       Sequence opened the card read "8 notes in Sequence · 7 keys" — and 7 keys is always still locked at that point. */
    const nx55 = await page.evaluate(async () => { const P = await import('./progress.js'); const S = await import('./core/store.js'); const RG = await import('./games/registry.js');
      const was = { u: S.store.unlock, r: S.store.runs, o: S.prefs.allOpen };
      S.prefs.allOpen = false; S.store.runs = [];
      S.store.unlock = { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1 };
      const g = P.nextGoal(), w = g && g.where;
      const d = w && (w.d || RG.GAMES[w.g].modes[0]);
      const out = { name: g && g.name, where: w, modeOpen: w ? P.isOpen(w.g, d) : null, lenLocked: w && w.s !== undefined ? !!P.lenLock(w.g, d, w.s) : false };
      S.store.unlock = was.u; S.store.runs = was.r; S.prefs.allOpen = was.o; S.save(); return out; });
    (nx55.where && nx55.modeOpen && !nx55.lenLocked)
      ? ok(`item 11 the Next card only ever offers something earnable right now — with Sequence just opened it points at ${JSON.stringify(nx55.where)} ("${nx55.name}"), a mode that is open on a length that is not locked`)
      : bad('item 11 the Next card offers a locked length', JSON.stringify(nx55));

    /* item 10: nothing listened for `error` on the <video> and the play() rejection was swallowed, so a missing file, a 404 and
       an iOS NotAllowedError all showed the same thing — a silent black rectangle inside a frame that never lit. */
    const vid55 = await page.evaluate(async () => { const V = await import('./ui/video.js'); const C = await import('./config/copy.js');
      V.playVideo({ id: 'gate-missing-clip', by: {}, title: 'gate', file: 'video/no-such-clip-55.mp4' });
      await new Promise(r => setTimeout(r, 1400));
      const h = document.getElementById('vplay');
      const out = { fail: h.classList.contains('vfail'), lit: h.classList.contains('vlit'), cc: h.querySelector('.vcc').textContent, want: C.MSG.unavailable };
      V.closeVideo(); await new Promise(r => setTimeout(r, 700)); return out; });
    (vid55.fail && !vid55.lit && vid55.cc === vid55.want)
      ? ok('item 10 a clip that will not load says so — the player drops its glow and writes MSG.unavailable into the caption strip instead of showing a black rectangle with no way to tell what went wrong')
      : bad('item 10 the video error state', JSON.stringify(vid55));
  }

  /* ---- v29 Section A (57.6, build 57): A KEY'S CREATION INTRO — once per key per profile, skippable, and never handed to a saved profile late.
     Driven three ways: the moment itself (its four named steps drawn, the key's own paths, its own style), the once-only rule, and the LADDER STEP,
     which is the whole of "migrate existing profiles so a key already opened does not replay it unasked". ---- */
  {
    const KI57 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const cfgOk = ['clear', 'pro', 'author'].every((t, i, a) => { const I = KI57.KEY_INTRO[t];
      const names = I.steps.map(s => s.name).join(), end = Math.max(...I.steps.map(s => s.at + s.ms));
      return names === 'gather,draw,forge,settle' && end === I.ms && I.bits > 0 && I.stroke > 0
        && (KI57.KEY_ART[t] || []).length * I.stroke <= (I.steps.find(s => s.name === 'draw') || {}).ms
        && (!i || I.ms > KI57.KEY_INTRO[a[i - 1]].ms); });
    // the migration: a v6 profile with the Games and Skill chests open has already reached keys 1 and Pro, so neither replays; Author has not
    await setStorage({ ne: { v: 6, prefs: { ...PLAIN, keyIntro: undefined, chests: { games: 1, key: 1, pro: 0, thorns: 0 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    const mig57 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')); return { v: st.v, seen: st.prefs.keyIntro }; });
    // and the moment itself, on a profile that has seen none of them
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, allOpen: true }, {}, { plain: { ...PLAIN, keyIntro: {} } });
    const intro57 = [];
    for (const [i, t] of ['clear', 'pro', 'author'].entries()) {
      intro57.push(await page.evaluate(async (i, t) => { const R = await import('./ui/router.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
        R.show('s-menu'); await wait(120); R.show('s-key', { tier: i }); await wait(700);
        const host = document.getElementById('key-cere'), st = host.querySelector('.kistage');
        const shot = { on: !host.hidden, bits: st ? st.querySelectorAll('.kibit').length : -1, paths: st ? st.querySelectorAll('.kipath').length : -1, style: st ? st.dataset.style : '' };
        for (let k = 0; k < 40; k++) { await wait(250); if (document.getElementById('key-cere').hidden) break; }
        const stored = !!(S.prefs.keyIntro || {})[t];
        R.show('s-menu'); await wait(150); R.show('s-key', { tier: i }); await wait(800);
        return Object.assign(shot, { t, stored, again: !document.getElementById('key-cere').hidden }); }, i, t));
    }
    const KA = { clear: (KI57.KEY_ART.clear || []).length, pro: (KI57.KEY_ART.pro || []).length, author: (KI57.KEY_ART.author || []).length };
    const played = intro57.every(r => r.on && r.paths === KA[r.t] && r.bits === KI57.KEY_INTRO[r.t].bits && r.stored && !r.again)
      && intro57.map(r => r.style).join() === 'lantern,circuit,thorn';
    (cfgOk && mig57.v === 7 && mig57.seen && mig57.seen.clear === 1 && mig57.seen.pro === 1 && !mig57.seen.author && played)
      ? ok(`57.6 each key's CREATION intro plays the first time its own screen is opened — ${intro57.map(r => r.t + ' ' + KI57.KEY_INTRO[r.t].ms + 'ms, ' + r.bits + ' pieces gathering and its ' + r.paths + ' own paths drawing on in ' + r.style).join(' · ')} — once per key per profile, and the v6 → v7 ladder step marks every key a saved profile has already reached (${Object.keys(mig57.seen).join(', ')}) so none of them is handed to it late`)
      : bad('57.6 the key creation intro', JSON.stringify({ cfgOk, mig57, intro57 }));
  }

  /* ---- v29 Section A (57.11, build 57): THE BACKGROUNDS. Three things, all driven: every one of the seven draws with nothing thrown and ink on the
     canvas; the STARFIELD belongs to the default alone, so no other background draws one; and the colour wheel is a SECOND SETTING that paints the
     background layer and leaves `--ground` — which every border and panel is mixed from — exactly where it was. ---- */
  {
    const TH57 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, allOpen: true });
    const bgs = Object.keys(TH57.DESIGNS);
    const drew = [];
    for (const bg of bgs) drew.push(await page.evaluate(async bg => { const S = await import('./core/store.js'); const T = await import('./ui/theme.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.bg = bg; S.prefs.tint = ''; S.save(); T.applyPrefs(); R.show('s-menu'); await wait(650);
      const cv = document.getElementById('stars'), cx = cv.getContext('2d');
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      // build 66 (CLOCK FLAKE fixed): every 13th pixel, not every 97th, so the starfield's pin-points are never all stepped over
      let lit = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 13) { n++; if (d[i + 3] > 6) lit++; }
      return { bg, lit: +(lit / n * 100).toFixed(1), ground: getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() }; }, bg));
    // the starfield: `stars` draws it and nothing else may — read off the module rather than the pixels, which is what the draw loop decides on
    const starOnly = await page.evaluate(async bgs => { const A = await import('./ui/atmosphere.js'); return bgs.filter(b => !!A.LAYER[b]); }, bgs);
    const split57 = await page.evaluate(async () => { const S = await import('./core/store.js'); const T = await import('./ui/theme.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const read = () => { const r = getComputedStyle(document.documentElement); return { g: r.getPropertyValue('--ground').trim(), l: r.getPropertyValue('--line').trim() }; };
      S.prefs.bg = 'grid'; S.prefs.tint = ''; S.save(); T.applyPrefs(); R.show('s-menu'); await wait(450);
      const off = read();
      S.prefs.tint = '#1b0a2e'; S.save(); T.applyPrefs(); await wait(650);
      /* build 66 (CLOCK FLAKE fixed): the colour under the grid's lines, not one pixel a breathing grid line can cross — the darkest of the corner's
         12×12 (a line only adds to the tint) */
      const on = read(), cx = document.getElementById('stars').getContext('2d'), blk = cx.getImageData(0, 0, 12, 12).data;
      let px = [blk[0], blk[1], blk[2]]; for (let i = 0; i < blk.length; i += 4) if (blk[i] + blk[i + 1] + blk[i + 2] < px[0] + px[1] + px[2]) px = [blk[i], blk[i + 1], blk[i + 2]];
      S.prefs.bg = 'rain'; S.save(); T.applyPrefs(); await wait(400);
      const kept = S.prefs.tint;
      R.show('s-custom'); await wait(550);
      // AMENDED at build 68 (67.35): no Background colour row — the picked pattern's tile carries the small wheel, and the wheel holds "No colour"
      const pat = document.getElementById('c-bg');
      const rows = { pat: pat ? pat.querySelectorAll('button').length : -1, wheelInPat: pat ? pat.querySelectorAll('button.wheel').length : -1,
        col: pat ? pat.querySelectorAll('.sel .bgwheel').length : -1, none: document.getElementById('wheel-none') ? 1 : 0, row: !!document.getElementById('c-bgcol') };
      S.prefs.tint = ''; S.prefs.bg = 'stars'; S.save(); T.applyPrefs();
      return { off, on, px: [px[0], px[1], px[2]], kept, rows }; });
    const ok57 = drew.every(d => d.lit > 0) && starOnly.join() === 'lantern,circuit,thorn'
      && split57.off.g === split57.on.g && split57.off.l === split57.on.l
      && split57.px.join() === '27,10,46' && split57.kept === '#1b0a2e'
      && split57.rows.wheelInPat === 0 && split57.rows.col === 1 && split57.rows.none === 1 && !split57.rows.row
      // AMENDED at build 65 (64.15): a background for every design, read off config — eight since Snow came out of the Games chest
      && TH57.ITEMS.bg.length === bgs.length && TH57.ITEMS.bgcol.length === 2;
    (ok57)
      ? ok(`57.11 all ${bgs.length} backgrounds draw (${drew.map(d => d.bg + ' ' + d.lit + '%').join(', ')}) and only the three KEY layers are layers at all — the starfield is the default background's alone; and the wheel is a second SETTING: the colour is painted on the background layer (rgb ${split57.px.join(',')} on the canvas), \`--ground\` and \`--line\` do not move with it (${split57.on.g}), it survives a change of pattern, and Customise carries ${split57.rows.pat} patterns with no wheel among them plus a colour row of "no colour" and the wheel`)
      : bad('57.11 the backgrounds', JSON.stringify({ drew, starOnly, split57 }));
  }
  /* build 65 (64.16): THE KEY DOES NOT SHRINK AFTER ITS INTRO, AND THE THREE CARDS LINE UP. The Skill Key's first open: at the end of the intro's
     settle the key the intro drew is where the hub key is and its size; then the three cards are one width with their tops level */
  {
    await boot({ chests: { games: 1 }, keyIntro: {} }); await page.evaluate(async () => (await import('./ui/router.js')).show('s-key', { tier: 0 }));
    const st = await page.evaluate(async () => { const K = (await import('./config/keys.js')).KEY_INTRO.clear, se = K.steps.find(s => s.name === 'settle'), h = document.getElementById('key-cere');
      for (let i = 0; i < 200 && h.dataset.step !== 'settle'; i++) await new Promise(r => setTimeout(r, 25));
      await new Promise(r => setTimeout(r, se.ms + 80)); const k = h.querySelector('.kikeyg'), g = document.querySelector('#s-key .kglyph'); if (!k || !g) return null;
      const a = k.getBoundingClientRect(), b = g.getBoundingClientRect(); return { dx: Math.round((a.left + a.width / 2) - (b.left + b.width / 2)), dy: Math.round((a.top + a.height / 2) - (b.top + b.height / 2)), w: [Math.round(a.width), Math.round(b.width)] }; });
    await revealDone(); await sleep(500);
    const cards = await page.evaluate(() => [...document.querySelectorAll('#key-keys .kkey')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
    (st && Math.abs(st.dx) <= 3 && Math.abs(st.dy) <= 10 && Math.abs(st.w[0] - st.w[1]) <= 2 && cards.length === 3 && cards.every(c => c[0] === cards[0][0] && c[1] === cards[0][1] && c[2] === cards[0][2]))
      ? ok(`64.16 the intro's key ends on the hub key, the same size (${st.w.join(' / ')}px, ${st.dx} / ${st.dy}px off) — nothing shrinks at the hand-over; the three key cards are one width, tops level`)
      : bad('64.16 the key settle and the cards', JSON.stringify({ st, cards }));
  }
  /* build 65 (64.15): THE GAMES CHEST GIVES ONE BACKGROUND that no achievement and no key already gives — on its "You found" list, and open in
     Customise the moment the chest is (a profile with only the Games chest open) */
  {
    const C15 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href), A15 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href), T15 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
    const word = (C15.CHEST_WORDS.games || []).find(w => /^bg-/.test(w.sym || '')), v = word && word.sym.slice(3), item = T15.ITEMS.bg.find(i => i.v === v);
    const grants = A15.ACH.filter(a => a.unlocks && a.unlocks[0] === 'bg' && a.unlocks[1] === v).map(a => a.id);
    await boot({ chests: { games: 1 } }); await page.evaluate(async () => (await import('./ui/router.js')).show('s-custom')); await sleep(500);
    const sw = await page.evaluate(v => { const b = document.querySelector(`#c-bg button[data-v="${v}"]`); return b ? { locked: b.classList.contains('locked') } : null; }, v);
    (word && item && !item.by && !item.key && !grants.length && sw && !sw.locked)
      ? ok(`64.15 the Games chest gives "${word.w}" (${v}) — a background no achievement or key gives — on its list, and open in Customise with the chest`)
      : bad('64.15 the Games chest background', JSON.stringify({ word, item, grants, sw }));
  }
  /* build 62 (61.7 / 61.22): THE BACKGROUND LAYER RULE. Every key layer, on the key screen: the art is taken out from behind every piece of text
     and every control (read off the canvas at each one's centre), the canvas never takes a tap, and it covers the whole viewport */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, keySeen: 1, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const lay = await page.evaluate(async () => { const AT = await import('./ui/atmosphere.js'), R = await import('./ui/router.js'), TH = await import('./config/theme.js'), KY = await import('./config/keys.js');
      const w = ms => new Promise(r => setTimeout(r, ms)), cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
      R.show('s-key', { tier: 2 }); await w(500); const out = {};
      for (const style of ['lantern', 'circuit', 'thorn']) { AT.setKeyLayer(style); await w(900);
        const cr = cv.getBoundingClientRect(), k = cv.width / cr.width, els = [...document.querySelectorAll('#s-key button, #s-key .krow, #s-key p, #s-key .eyebrow')].filter(e => e.getBoundingClientRect().height > 0);
        // cleared: see-through, or — on a layer that paints its own opaque sky (Lantern) — that plain sky and nothing drawn on it
        const sky = (KY.KEY_LAYER[style].sky || '').split(',').map(Number);
        // AMENDED at build 66 (65.10): or the flat floor the bottom strip is painted in, which is the page's own colour — no art on it either
        const pg = getComputedStyle(document.documentElement).backgroundColor.match(/\d+/g).map(Number), floor = d => pg.every((v, i) => Math.abs(d[i] - v) <= 8);
        const lit = els.filter(e => { const r = e.getBoundingClientRect(); const d = cx.getImageData(Math.round((r.x + r.width / 2 - cr.left) * k), Math.round((r.y + r.height / 2 - cr.top) * k), 1, 1).data;
          return d[3] > 255 * (1 - TH.BG_LAYER.clear) + 8 && !(sky.length === 3 && sky.every((v, i) => Math.abs(d[i] - v) <= 8)) && !floor(d); });
        out[style] = { n: els.length, lit: lit.map(e => e.id || e.className).slice(0, 4) }; }
      const shadow = [...document.querySelectorAll('#s-key button, #s-key p, #s-key .eyebrow')].filter(e => e.textContent.trim() && e.getBoundingClientRect().height > 0).every(e => getComputedStyle(e).textShadow !== 'none');
      AT.setKeyLayer(null); const cr = cv.getBoundingClientRect();
      return { out, holes: AT.holesNow(), shadow, pe: getComputedStyle(cv).pointerEvents, covers: cr.top <= 0 && cr.bottom >= innerHeight && cr.width >= innerWidth - 1 }; });
    /* AMENDED at build 68 (67.30, Cowork): the art is NO LONGER cut out behind text — those cut-outs were the dark boxes that showed before their text arrived.
       Every line keeps its own soft dark shadow instead; what stays is the canvas taking no tap and covering the phone */
    (Object.values(lay.out).every(o => o.n > 3) && lay.holes === 0 && lay.shadow && lay.pe === 'none' && lay.covers)
      ? ok(`67.30 / 61.22 on the key screen every key layer runs behind the text with no box cut out of it (${Object.entries(lay.out).map(([s, o]) => s + ' ' + o.n).join(', ')} pieces of text, each with its own dark shadow); the canvas takes no tap and covers the phone`)
      : bad('61.7 / 61.22 the background layer rule', JSON.stringify(lay));
  }
  /* build 64 (A2): THE STATUS-BAR STRIP IS CLEAR. With a phone's top inset on (47px), no key layer draws anything between the top of the canvas
     and the bottom of the inset — sampled across the whole strip on the Author key screen, each layer in turn */
  {
    const cdp = await page.createCDPSession(); let sent = true;
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }); } catch (e) { sent = false; }
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const strip = sent && await page.evaluate(async () => { const AT = await import('./ui/atmosphere.js'), R = await import('./ui/router.js'), TH = await import('./config/theme.js'), KY = await import('./config/keys.js');
      const w = ms => new Promise(r => setTimeout(r, ms)), cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
      const pr = document.createElement('div'); pr.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top)'; document.body.appendChild(pr); const ti = pr.getBoundingClientRect().height; pr.remove();
      R.show('s-key', { tier: 2 }); await w(500); const out = {};
      for (const style of ['lantern', 'circuit', 'thorn']) { AT.setKeyLayer(style); await w(900);
        const cr = cv.getBoundingClientRect(), k = cv.width / cr.width, sky = (KY.KEY_LAYER[style].sky || '').split(',').map(Number), y1 = Math.floor((ti - cr.top) * k) - 2;
        const d = cx.getImageData(0, 0, cv.width, Math.max(1, y1)).data; let lit = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 7) { n++; if (d[i + 3] > 255 * (1 - TH.BG_LAYER.clear) + 8 && !(sky.length === 3 && [0, 1, 2].every(j => Math.abs(d[i + j] - sky[j]) <= 8))) lit++; }
        out[style] = { n, lit }; }
      AT.setKeyLayer(null); return { ti, out }; });
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    (!sent) ? ok('A2 the status-bar strip — SKIPPED: this Chrome has no safe-area override')
      : (strip.ti === 47 && Object.values(strip.out).every(o => o.n > 1000 && o.lit === 0))
      ? ok(`A2 with a 47px top inset no key layer draws in the status-bar strip (${Object.entries(strip.out).map(([s, o]) => s + ' ' + o.n + ' samples clear').join(', ')})`)
      : bad('A2 the status-bar strip', JSON.stringify(strip));
  }
  /* build 64 (62.15): THE PAGE UNDER THE LAYER. Wherever the fixed canvas might stop short on a phone, what shows is html's own background — so
     with a layer that paints an opaque sky (Lantern) the page wears the layer's bottom colour, and with the see-through starfield it stays --ground */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, keySeen: 1, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ul = await page.evaluate(async () => { const AT = await import('./ui/atmosphere.js'), R = await import('./ui/router.js');
      const w = ms => new Promise(r => setTimeout(r, ms)), cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
      // the canvas's own bottom row, a few points along it (a lantern can be passing one of them): the one nearest what the page wears
      const bg = el => getComputedStyle(el).backgroundColor, rgb = s => s.match(/\d+/g).slice(0, 3).map(Number);
      const px = want => [.18, .25, .32, .4].map(f => [...cx.getImageData(Math.round(cv.width * f), cv.height - 2, 1, 1).data].slice(0, 3)).sort((a, b) => Math.max(...a.map((v, i) => Math.abs(v - want[i]))) - Math.max(...b.map((v, i) => Math.abs(v - want[i]))))[0];
      R.show('s-key', { tier: 0 }); await w(400); AT.setKeyLayer('lantern'); await w(900);
      const html = bg(document.documentElement), near = px(rgb(html)), off = Math.max(...near.map((v, i) => Math.abs(v - rgb(html)[i])));
      const lantern = { html, body: bg(document.body), px: `rgb(${near.join(', ')})`, off };
      AT.setKeyLayer(null); R.show('s-menu'); await w(1400);
      const probe = document.createElement('div'); probe.style.background = 'var(--ground)'; document.body.appendChild(probe); const ground = bg(probe); probe.remove();
      return { lantern, stars: { html: bg(document.documentElement), ground } }; });
    (ul.lantern.off <= 4 && ul.lantern.body === ul.lantern.html && ul.lantern.html !== ul.stars.ground && ul.stars.html === ul.stars.ground)
      ? ok(`62.15 under Lantern the page itself wears the layer's bottom colour (${ul.lantern.html} against the canvas's ${ul.lantern.px}), so a strip the layer misses is no flat --ground band; under the starfield it stays --ground (${ul.stars.ground})`)
      : bad('62.15 the page under the layer', JSON.stringify(ul));
  }
  /* build 66 (65.12): EVERY BACKGROUND IS VISIBLY ITS OWN. Aiden: Customise's first background (the starfield) and Snow were "exactly the same". On
     Customise every swatch differs from every other (colour and pattern), Snow's ground is a different colour from the starfield's by a clear margin,
     and on screen Snow draws far more of the canvas than the starfield's pin-points (its flakes have halos) */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, allOpen: true });
    const s12 = await page.evaluate(async () => { const S = await import('./core/store.js'), T = await import('./ui/theme.js'), R = await import('./ui/router.js'), wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-custom'); await wait(500);
      const sw = [...document.querySelectorAll('#c-bg button')].map(b => { const c = getComputedStyle(b); return { v: b.dataset.v, look: c.backgroundColor + '|' + c.backgroundImage, col: c.backgroundColor.match(/\d+/g).slice(0, 3).map(Number) }; });
      const lit = {}; for (const bg of ['stars', 'snow']) { S.prefs.bg = bg; S.prefs.tint = ''; S.save(); T.applyPrefs(); R.show('s-menu'); await wait(900);
        const cv = document.getElementById('stars'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, on = 0; for (let i = 0; i < d.length; i += 4 * 53) { n++; if (d[i + 3] > 6) on++; } lit[bg] = +(on / n * 100).toFixed(2); }
      S.prefs.bg = 'stars'; S.save(); T.applyPrefs(); return { sw, lit }; });
    const TH12 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href), hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), a12 = hx(TH12.DESIGNS.stars.tint), b12 = hx(TH12.DESIGNS.snow.tint), gap = Math.max(...a12.map((v, i) => Math.abs(v - b12[i])));
    (new Set(s12.sw.map(x => x.look)).size === s12.sw.length && gap >= 20 && s12.lit.snow > s12.lit.stars * 3)
      ? ok(`65.12 every background swatch is its own (${s12.sw.length} distinct); Snow's ground differs from the starfield's by ${gap} and it draws ${s12.lit.snow}% of the canvas to the starfield's ${s12.lit.stars}%`)
      : bad('65.12 two backgrounds look alike', JSON.stringify({ gap, lit: s12.lit, sw: s12.sw.map(x => x.v + ' ' + x.look.slice(0, 60)) }));
  }
  /* build 66 (65.10): THE BOTTOM 40PX OF EVERY SCREEN ARE THE SCREEN'S OWN BACKGROUND — the page's colour (html, what the phone shows wherever the
     canvas stops short) and the canvas agree there, on every screen, under the starfield and under Lantern, at 390×844 with a phone's insets and on an
     SE. Sampled where nothing of ours is drawn (the screen itself is the top element), the canvas composited over the page; and an opaque ceremony
     gives the page its own --ground */
  {
    const cdp = await page.createCDPSession(), res = [];
    for (const [w, h, top, bottom] of [[390, 844, 47, 34], [375, 667, 20, 0]]) {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, bottom, left: 0, right: 0 } }); } catch (e) {}
      for (const bg of ['stars', 'lantern']) {
        await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, keySeen: 1, bg, tint: '', chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
        await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
        for (const [id, o] of [['s-menu', {}], ['s-pick', {}], ['s-board', {}], ['s-prog', { tab: 'c-games' }], ['s-custom', {}], ['s-key', { tier: 0 }], ['s-key', { tier: 1 }], ['s-key', { tier: 2 }], ['s-about', {}], ['s-testing', {}]]) {
          const r = await page.evaluate(async (id, o) => { (await import('./ui/router.js')).show(id, o); await new Promise(r => setTimeout(r, 900));
            const cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true }), cr = cv.getBoundingClientRect(), k = cv.width / cr.width;
            const pg = getComputedStyle(document.documentElement).backgroundColor.match(/\d+/g).map(Number), scr = document.querySelector('.screen.on');
            let n = 0, worst = 0, at = null;
            for (let y = innerHeight - 40; y < innerHeight; y += 6) for (const f of [.04, .2, .35, .5, .65, .8, .96]) { const x = innerWidth * f, t = document.elementFromPoint(x, y);
              const ours = t && t !== scr && t !== document.body && t !== document.documentElement && !t.closest('#build') && (t.closest('button,[data-act],svg,img,input,.chip,.tile') || [...t.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim()) || getComputedStyle(t).backgroundColor !== 'rgba(0, 0, 0, 0)'); if (ours) continue;
              const d = cx.getImageData(Math.round((x - cr.left) * k), Math.round((y - cr.top) * k), 1, 1).data, a = d[3] / 255;
              const off = Math.max(...[0, 1, 2].map(i => Math.abs(Math.round(d[i] * a + pg[i] * (1 - a)) - pg[i]))); n++; if (off > worst) { worst = off; at = [Math.round(x), y]; } }
            return { id: id + (o.tier !== undefined ? ':' + o.tier : ''), n, worst, at, page: pg.join(',') }; }, id, o);
          res.push({ vp: w + 'x' + h, bg, ...r }); } }
      // an opaque ceremony up: the page under it is the ceremony's own --ground
      res.push(await page.evaluate(async () => { (await import('./ui/router.js')).show('s-key', { tier: 0 }); await new Promise(r => setTimeout(r, 500)); const c = document.getElementById('key-cere'); c.hidden = false; await new Promise(r => setTimeout(r, 300));
        const p = document.createElement('i'); p.style.background = 'var(--ground)'; document.body.appendChild(p); const g = getComputedStyle(p).backgroundColor; p.remove(); const h = getComputedStyle(document.documentElement).backgroundColor; c.hidden = true;
        return { vp: innerWidth + 'x' + innerHeight, bg: 'lantern', id: 'ceremony', n: 1, worst: g === h ? 0 : 99, page: h, ground: g }; }));
    }
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const off = res.filter(x => x.worst > 6 || !x.n);
    (!off.length)
      ? ok(`65.10 the bottom 40px of every screen (${res.length} screen × background × phone) are the screen's own background: canvas and page agree within 6 at every sampled point, under the starfield and Lantern, at 390×844 with insets and on an SE; a ceremony gives the page --ground`)
      : bad('65.10 the bottom strip', JSON.stringify(off));
  }
  /* build 69 (68.27, L23): THE BACKGROUND RUNS TO THE PHYSICAL BOTTOM EDGE — every screen, every background, under every overlay. On an installed
     iPhone app everything of ours ends at the layout viewport, and the strip under it shows html's own background: Aiden's v0.68 frames have a
     BROWN strip under the black full-screen player (Lantern's floor) and a NAVY one under the Lantern key screen (Snow's ground). 65.10 compared
     the canvas with that page colour — the same colour twice — so it passed with the fault live; it never looked at what is drawn ON TOP. This
     does, off a screenshot with both insets on: a row inside the bottom inset against the row just above it, and html's computed background against
     the colour just above the inset (headless Chrome composites a fixed overlay past the inset where the phone does not, so the second pair is the
     one that sees the phone's strip). A point over a button or a line of text of ours is skipped; every colour comes off the live page. */
  {
    const cdp = await page.createCDPSession(); let sent = true; const res = [];
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }); } catch (e) { sent = false; }
    const strip27 = async name => { await sleep(700);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 844 - 60, width: 390, height: 60 } });
      return page.evaluate(async (b64, name, clipTop) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
        const k = c.width / innerWidth, pr = document.createElement('div'); pr.style.cssText = 'position:fixed;bottom:0;width:1px;height:env(safe-area-inset-bottom)'; document.body.appendChild(pr); const ib = pr.getBoundingClientRect().height; pr.remove();
        const html = getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number), yIn = innerHeight - 10, yUp = innerHeight - ib - 6;
        const at = (X, Y) => [...x.getImageData(Math.round(X * k), Math.round((Y - clipTop) * k), 1, 1).data].slice(0, 3), gap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
        let n = 0, strip = 0, pg = 0, seen = null, low = [];
        // a button, a chip or a line of text of ours (the full-width backdrops — a screen, a dim, the player's ground — are what is being read)
        const scr = document.querySelector('.screen.on'), st = document.getElementById('build'), rg = document.createRange(); if (st) rg.selectNodeContents(st); const sr = st && rg.getBoundingClientRect();
        const ours = t => { if (!t || t === document.documentElement || t === document.body || t === scr) return false; const narrow = t.getBoundingClientRect().width < innerWidth - 2;
          return [...t.childNodes].some(q => q.nodeType === 3 && q.nodeValue.trim()) || !!t.closest('svg,img,input,video') || (narrow && (!!t.closest('button,[data-act],.chip,.tile') || getComputedStyle(t).backgroundColor !== 'rgba(0, 0, 0, 0)')); };
        for (const f of [.01, .04, .2, .35, .5, .65, .8, .96, .99]) { const X = innerWidth * f;
          // the build stamp, a label of ours drawn behind every screen just above the inset
          if (sr && sr.height && sr.bottom > innerHeight - 60 && X >= sr.left - 4 && X <= sr.right + 4) continue;
          // and nothing of ours sits in the home bar's inset itself
          const lo = document.elementFromPoint(X, yIn); if (ours(lo)) { low.push((lo.id || lo.className || lo.tagName).toString().slice(0, 24)); continue; }
          if (ours(document.elementFromPoint(X, yUp))) continue;
          const a = at(X, yIn), b = at(X, yUp); n++; strip = Math.max(strip, gap(a, b)); if (gap(b, html) > pg) { pg = gap(b, html); seen = b.join(','); } }
        return { name, ib, n, strip, page: pg, html: html.join(','), above: seen, low }; }, png.toString('base64'), name, 844 - 60); };
    const inPage = (fn, arg) => page.evaluate(fn, arg);
    const GO = async (id, o) => inPage(async ([id, o]) => (await import('./ui/router.js')).show(id, o), [id, o]);
    for (const bg of ['stars', 'lantern', 'snow', 'orbs']) {
      await boot({ ...OPEN_PREFS, keySeen: 1, bg, tint: '', chests: { games: 1, key: 1, pro: 1, thorns: 1 } });
      for (const [id, o] of [['s-menu', {}], ['s-board', {}], ['s-prog', { tab: 'c-games' }], ['s-custom', {}], ['s-key', { tier: 0 }], ['s-key', { tier: 1 }], ['s-key', { tier: 2 }], ['s-about', {}], ['s-testing', {}], ['s-gauntlet', { id: 'g1' }]]) {
        // scrolled to its end, as 61.22 reads them: a list passing under the home bar mid-scroll is content, not the background
        await GO(id, o); await sleep(300); await inPage(() => { for (const sc of document.querySelectorAll('.screen.on, .screen.on .scroll')) sc.scrollTop = sc.scrollHeight; });
        res.push({ bg, ...(await strip27(id + (o.tier !== undefined ? ':' + o.tier : ''))) }); }
      // the overlays, each over the Skill key screen (Lantern), where Aiden's v0.68 frame has the full-screen player
      const vid = full => inPage(async full => { const V = await import('./ui/video.js'), M = await import('./config/messages.js'); V.playVideo(M.MESSAGES.find(m => m.by && m.by.chest === 'key' && m.file), { full }); }, full);
      const cls = (sel, on) => inPage(([s, on]) => document.querySelector(s).classList.toggle('on', on), [sel, on]);
      const unvid = () => inPage(async () => (await import('./ui/video.js')).closeVideo());
      for (const [name, open, shut] of [['video full', () => vid(true), unvid], ['video inset', () => vid(false), unvid],
        ['lock box', () => cls('#lockwrap', true), () => cls('#lockwrap', false)], ['ad break', () => cls('#adbreak', true), () => cls('#adbreak', false)]]) {
        await GO('s-key', { tier: 0 }); await sleep(300); await open();
        res.push({ bg, ...(await strip27(name)) }); await shut(); await sleep(300); }
      // a chest's ceremony (the real reveal, on its host)
      await GO('s-key', { tier: 0 }); await sleep(300);
      await inPage(async () => { const RV = await import('./ui/reveal.js'), CE = await import('./ui/ceremony.js'), CH = await import('./ui/chest.js'), K = await import('./progress/key.js'), m = K.meter();
        RV.playReveal(document.getElementById('key-cere'), { kind: 'chest', id: 'games', silent: true, stage: CE.chestStage('games', { was: m, now: m }), gifts: CH.giftsOf('games') }); });
      res.push({ bg, ...(await strip27('chest ceremony')) });
      await inPage(async () => (await import('./ui/reveal.js')).stopReveal()); await sleep(300);
      // a key being earned (Testing's route), mid-animation
      await GO('s-key', { whole: 1, tier: 0, from: 's-testing' }); res.push({ bg, ...(await strip27('key earn')) });
      await GO('s-menu', {}); await sleep(300);
      // the Welcome
      // the Welcome (due on a save whose About is still shut and whose Dots has just opened — section 18's own fixture)
      const was27 = await inPage(async () => { const S = await import('./core/store.js'), W = await import('./ui/welcome.js'), was = { allOpen: S.prefs.allOpen, chests: S.prefs.chests };
        S.prefs.allOpen = 0; S.prefs.menuUnl = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; delete S.prefs.welcomeSeen; S.store.unlock['dots:blind'] = Date.now(); S.save(); W.welcomeCheck(false); return was; });
      res.push({ bg, ...(await strip27('welcome')) });
      await inPage(async was => { const S = await import('./core/store.js'); (await import('./ui/welcome.js')).closeWelcome(); Object.assign(S.prefs, was); S.prefs.welcomeSeen = 1; S.save(); }, was27);
      // the map with the pick sheet up, a run, and its result
      await GO('s-pick', {}); await sleep(400); await click('.tile[data-game="quick-tap"]'); res.push({ bg, ...(await strip27('s-pick sheet')) });
      await inPage(() => { document.querySelector('#diff-row .choice').click(); document.querySelector('#time-row .tbtn').click(); document.getElementById('go-btn').click(); }); await sleep(1200);
      res.push({ bg, ...(await strip27('game')) });
      if (await driveToResult('quick-tap', 'L23 the run under the bottom strip')) res.push({ bg, ...(await strip27('s-over')) });
    }
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
    const off = res.filter(x => !x.n || x.strip > 6 || x.page > 6 || x.low.length);
    (!sent) ? ok('L23 the bottom strip — SKIPPED: this Chrome has no safe-area override')
      : (!off.length && res.every(x => x.ib === 34))
      ? ok(`L23 / 68.27 the background runs to the bottom edge: on ${res.length} screens and overlays × stars, Lantern, Snow and Orbs (insets 47 / 34), the bottom inset is the colour drawn just above it and so is the page under everything, within 6 at every sampled point; no button or text of ours sits in the inset`)
      : bad('L23 / 68.27 the bottom strip is not the colour drawn above it', JSON.stringify(off.map(x => `${x.bg} ${x.name}: strip ${x.strip} page ${x.page} (html ${x.html} vs above ${x.above}, n ${x.n})${x.low.length ? ' in the inset: ' + x.low.join(' ') : ''}`)));
  }
  /* build 62 (61.22): EVERY BACKGROUND FILLS THE WHOLE PAGE AND SITS BEHIND EVERYTHING, on the long screens, scrolled to the bottom, with a top
     and a bottom safe-area inset: the canvas runs from above the top inset to below the bottom one, and no art is left behind any text or
     control. Lantern, Circuit and Thorn, on Customise ("Settings"), the Skill key screen and the Games chest tab */
  {
    const cdp = await page.createCDPSession(); let insets = true;
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }); } catch (e) { insets = false; }
    const res = await page.evaluate(async () => { const S = await import('./core/store.js'), R = await import('./ui/router.js'), KY = await import('./config/keys.js'), TH = await import('./config/theme.js');
      const w = ms => new Promise(r => setTimeout(r, ms)), cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
      const inset = side => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;width:1px;height:env(safe-area-inset-' + side + ')'; document.body.appendChild(d); const h = parseFloat(getComputedStyle(d).height) || 0; d.remove(); return h; };
      const top = inset('top'), bottom = inset('bottom'), out = [];
      S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 1 };
      for (const bg of ['lantern', 'circuit', 'thorn']) { S.prefs.bg = bg; S.prefs.tint = '';
        for (const [id, o] of [['s-custom', {}], ['s-key', { tier: 0 }], ['s-prog', { tab: 'c-games' }]]) { R.show(id, o); await w(450);
          for (const sc of document.querySelectorAll('.screen.on, .screen.on .scroll')) sc.scrollTop = sc.scrollHeight; await w(700);
          // the key screen draws its OWN key's layer over the chosen one (the Skill key's is Lantern), so that is the sky it clears to there
          const drawn = id === 's-key' ? KY.KEYS[0].style : bg;
          const cr = cv.getBoundingClientRect(), k = cv.width / cr.width, sky = ((KY.KEY_LAYER[drawn] || {}).sky || '').split(',').map(Number);
          // AMENDED at build 66 (65.10): the flat floor of the bottom strip is the page's own colour, with no art on it — clear too
          const pg = getComputedStyle(document.documentElement).backgroundColor.match(/\d+/g).map(Number), floor = d => pg.every((v, i) => Math.abs(d[i] - v) <= 8);
          const els = [...document.querySelectorAll('.screen.on button, .screen.on .clabel, .screen.on h4, .screen.on .eyebrow')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
          /* build 66 (CLOCK FLAKE fixed): the art is taken out on the draw loop's own re-measure after the scroll, so this polls for it rather than
             reading once after a fixed wait */
          const litNow = () => els.filter(e => { const r = e.getBoundingClientRect(); const d = cx.getImageData(Math.round((r.x + r.width / 2 - cr.left) * k), Math.round((r.y + r.height / 2 - cr.top) * k), 1, 1).data;
            return d[3] > 255 * (1 - TH.BG_LAYER.clear) + 8 && !(sky.length === 3 && sky.every((v, i) => Math.abs(d[i] - v) <= 8)) && !floor(d); }).map(e => e.textContent.trim().slice(0, 14));
          let lit = litNow(); for (let i = 0; i < 12 && lit.length; i++) { await w(150); lit = litNow(); }
          out.push({ bg, id, n: els.length, lit, covers: cr.top <= -top + 1 && cr.bottom >= innerHeight + bottom - 1 && cr.width >= innerWidth - 1 }); } }
      S.prefs.bg = 'stars'; R.show('s-menu'); return { top, bottom, out }; });
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
    // AMENDED at build 68 (67.30): art behind text is allowed now (it carries a shadow, not a box); what is held is that the layer covers the page
    const off = res.out.filter(x => !x.covers || !x.n);
    (insets && res.top === 47 && res.bottom === 34 && !off.length)
      ? ok(`61.22 with a 47px top and 34px bottom inset, Lantern, Circuit and Thorn fill Customise, the Skill key screen and the Games chest tab from above the top inset to below the bottom one, scrolled to the end, with no art behind any of ${res.out.reduce((n, x) => n + x.n, 0)} controls and labels`)
      : bad('61.22 the background covers the page and sits behind everything', JSON.stringify({ insets, top: res.top, bottom: res.bottom, off }));
  }
  /* build 69 (68.29, L24): EVERY INTRO AND CEREMONY DRAWS ITS FIRST ANIMATION FRAME FIRST. Aiden on v0.68: the Skill key's creation intro "plays
     after I've already seen the key" — the finished screen (the three key cards, the wheel, its labels) was painted for EARN_AT, plus the 2.6s
     arrival on a first visit, before the intro began. The FIRST PAINTED FRAME is read here: the route is taken and, in the same task, a
     requestAnimationFrame callback reads what that frame will show — no sleep in between. On frame one of an intro the finished screen is
     hidden (each piece either not drawn or under the intro's opaque host) and the intro's own stage is up; on frame one of an earn the wheel is
     not drawn; on frame one of a chest's ceremony its host covers the screen and neither its card nor its rewards show. All three keys, by every
     route in: the screen opened on that key (the map's key tile and the menu's Keys item both land here), the key's own tab, Testing's replay */
  {
    const frame1 = (route, tier) => page.evaluate(async ([route, tier]) => {
      const R = await import('./ui/router.js'), host = document.getElementById('key-cere');
      const shown = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
      // under the host when the host is up, opaque and on top at that point
      const covered = el => { const r = el.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!t || host.hidden || !host.contains(t)) return false;
        const hc = getComputedStyle(host), a = hc.backgroundColor.match(/[\d.]+/g) || []; return +hc.opacity === 1 && a.length >= 3 && (a.length < 4 || +a[3] === 1); };
      const seen = sel => [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && shown(e) && !covered(e); }).length;
      return new Promise(res => {
        if (route === 'screen') R.show('s-key', { tier });
        else if (route === 'tab') document.querySelector(`#key-keys .kkey[data-kt="${tier}"]`).click();
        else if (route === 'testing') R.show('s-key', { intro: 1, tier, from: 's-testing' });
        else if (route === 'earn') R.show('s-key', { whole: 1, tier, from: 's-testing' });
        else if (route === 'chest') R.show('s-key', { open: 'games' });
        requestAnimationFrame(() => res({ route, tier, cards: seen('#key-keys .kkey'), wheel: seen('#s-key .kr, #s-key .knode, #s-key .kring'), labels: seen('#s-key .klabels text'),
          intro: !host.hidden && !!host.querySelector('.kistage'), host: !host.hidden && host.dataset.rev, card: seen('#key-cere .rcard'), gifts: seen('#key-cere .rgift') }));
      }); }, [route, tier]);
    const out = [];
    for (const t of [0, 1, 2]) {
      // a first visit to the Keys screen, this key's intro due (the arrival due as well — the longest wait v0.68 had)
      await boot({ ...OPEN_PREFS, keySeen: 0, chests: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: {} }); out.push(await frame1('screen', t));
      await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal());
      // the key's own tab, from a screen already showing another key
      if (t) { const ki = { clear: 1, pro: 1, author: 1 }; delete ki[['clear', 'pro', 'author'][t]];
        await boot({ ...OPEN_PREFS, chests: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: ki }); await page.evaluate(async () => (await import('./ui/router.js')).show('s-key', { tier: 0 })); await sleep(700);
        out.push(await frame1('tab', t)); await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal()); }
      // Testing's replay, and the key being earned
      await boot({ ...OPEN_PREFS, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }); await page.evaluate(async () => (await import('./ui/router.js')).show('s-testing')); await sleep(300);
      out.push(await frame1('testing', t)); await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal());
      await page.evaluate(async () => (await import('./ui/router.js')).show('s-testing')); await sleep(300);
      out.push(await frame1('earn', t)); await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal()); }
    // a chest's ceremony from the map: the Games chest ready, tapped
    const ALL13 = Object.fromEntries(['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead', 'hold:grow', 'hold:cut', 'sequence:solo', 'timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'spot:count', 'spot:find'].map(k => [k, NOW]));
    await boot({ ...OPEN_PREFS, allOpen: 0, chests: {} }, { unlock: ALL13 }); const ready = await page.evaluate(async () => (await import('./progress/key.js')).chestState('games'));
    out.push({ ...(await frame1('chest', 0)), ready });
    await revealDone();
    const off = out.filter(x => x.route === 'earn' ? x.wheel || x.labels : x.route === 'chest' ? x.ready !== 'ready' || !x.host || x.cards || x.wheel || x.card || x.gifts : x.cards || x.wheel || x.labels || !x.intro);
    (!off.length && out.length === 12)
      ? ok(`L24 / 68.29 every intro and ceremony is the first thing painted: on frame one of each key's creation intro (Skill, Pro, Author — the screen opened on it, its tab, Testing's replay) the intro's stage is up and none of the key cards, the wheel or its labels show; an earn's frame one draws no wheel; a chest's ceremony covers the screen with neither its card nor its rewards`)
      : bad('L24 / 68.29 the finished screen is painted before its intro or ceremony', JSON.stringify(off));
  }
  /* build 69 (68.39): NOTHING IN A BACKGROUND IS AS BRIGHT AS THE TEXT OVER IT. Aiden on v0.68's Progress screen over Snow (the navy one he calls
     "the orbs"): "The whites are getting in the way of the text … Just make them less bright." Snow's near flakes were drawn in #F4F8FF at full
     strength. One rule for every background: each of the eight (`ITEMS.bg` — the three key layers among them, which are also what the key screens
     draw) is drawn for about two seconds with both insets on, the canvas read four times (a one-off read in the check, never in the draw loop),
     each pixel laid over the page it sits on, and the brightest one's luminance must be at most `BG_LAYER.peak` × the luminance of `--ink`, read off
     the live page */
  {
    const TH39 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
    const cdp = await page.createCDPSession(); try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }); } catch (e) {}
    const res39 = [];
    for (const { v } of TH39.ITEMS.bg) {
      await boot({ ...OPEN_PREFS, bg: v, tint: '', chests: { games: 1, key: 1, pro: 1, thorns: 1 } });
      res39.push(await page.evaluate(async v => { (await import('./ui/router.js')).show('s-prog', { tab: 'c-games' });
        const w = ms => new Promise(r => setTimeout(r, ms)), lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
        const lum = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b), rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
        const pr = document.createElement('i'); pr.style.color = 'var(--ink)'; document.body.appendChild(pr); const ink = lum(rgb(getComputedStyle(pr).color)); pr.remove();
        const page0 = rgb(getComputedStyle(document.body).backgroundColor), cv = document.getElementById('stars'), cx = cv.getContext('2d', { willReadFrequently: true });
        let top = 0, at = null;
        for (let i = 0; i < 4; i++) { await w(500); const d = cx.getImageData(0, 0, cv.width, cv.height).data;
          for (let p = 0; p < d.length; p += 4) { const a = d[p + 3] / 255; if (!a) continue; const c = [0, 1, 2].map(j => d[p + j] * a + page0[j] * (1 - a)), l = lum(c); if (l > top) { top = l; at = c.map(Math.round).join(','); } } }
        return { v, top: +top.toFixed(3), ink: +ink.toFixed(3), ratio: +(top / ink).toFixed(2), at }; }, v)); }
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } }); } catch (e) {}
    const off39 = res39.filter(x => !(x.ratio <= TH39.BG_LAYER.peak));
    (!off39.length && res39.length === TH39.ITEMS.bg.length)
      ? ok(`68.39 nothing in any background is as bright as the text over it: the brightest pixel of each of the ${res39.length}, over the page, against --ink's luminance (at most BG_LAYER.peak ${TH39.BG_LAYER.peak}) — ${res39.map(x => x.v + ' ' + x.ratio).join(', ')}`)
      : bad('68.39 a background as bright as the text', JSON.stringify({ off: off39, all: res39.map(x => x.v + ' ' + x.ratio) }));
  }
  /* build 62 (61.6): AN ACHIEVEMENT TOAST THAT HAS GONE CATCHES NOTHING. It kept pointer-events after it faded, invisible over the top of every
     screen, so a tap on the Keys screen's Pro tile opened Achievements. Reproduced: a tappable toast shows and fades, then the Keys screen */
  {
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const t61 = await page.evaluate(async () => { const T = await import('./ui/toast.js'), C = await import('./config/copy.js'), R = await import('./ui/router.js');
      const w = ms => new Promise(r => setTimeout(r, ms)); const A = (await import('./config/achievements.js')).ACH;
      T.toast('Achievement: a long one · unlocks target colour · tap to see it in Customise', A[0].id); await w(C.TOAST_MS.tap + C.TOAST_MS.gap + 400);
      R.show('s-key'); await w(500); const out = [], t = document.getElementById('toast');
      for (const b of document.querySelectorAll('#s-key .kkey')) { const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); out.push(e && e.closest('[data-act]') ? e.closest('[data-act]').dataset.act : null); }
      return { out, pe: getComputedStyle(t).pointerEvents, ach: t.dataset.ach }; });
    (t61.out.length === 3 && t61.out.every(a => a === 'key-tier') && t61.pe === 'none' && !t61.ach)
      ? ok('61.6 a tappable toast that has faded catches nothing (pointer-events ' + t61.pe + ', no link left on it): every key tile, Pro included, is what is under the finger')
      : bad('61.6 a faded toast over the key tiles', JSON.stringify(t61));
  }
}
