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
  (/^\d+%$/.test(k1.pct[0])) ? ok(`5.3 a key under 100% wears its % — "${k1.pct[0]}"`) : bad('5.3 the % overlay', JSON.stringify(k1.pct));
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
  await page.evaluate(() => document.querySelector('#key-list .krow').click()); await sleep(900);
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
        for (const [name, sel] of POINTS) {
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
      const five = taps.out;
      const allFound = five.every(t => t.found && t.promptWasUp);
      const allToChest = five.every(t => t.ask && t.screen === 's-key');
      const noneToMenu = five.every(t => t.screen !== 's-menu');
      (allFound && allToChest && noneToMenu && taps.music.duringEarn)
        ? ok(`v30 59.14 while the prompt is up a tap ANYWHERE opens that chest — ${five.map(t => t.name).join(', ')} all reach its ask and none reaches the menu, which is where the mis-tap used to land; SET THIS MUSIC is hidden for the moment rather than made the single exception`)
        : bad('v30 59.14 a tap beside the key does not open the chest', JSON.stringify(taps));
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
      return { cards: [...document.querySelectorAll('#key-keys .kkey')].map(k => ({ i: k.querySelectorAll('i').length, b: k.querySelector('b').textContent, u: k.querySelector('u').textContent })), count: document.getElementById('key-count').textContent, pct: K.bandPct('clear'), meter: K.meter() }; });
    const names48 = KY48.KEYS.map(k => k.name);
    (card48.cards.every((c, i) => !c.i && c.b === names48[i]) && card48.cards[0].u === card48.pct + '%' && card48.count === '1 of 30' && card48.meter === card48.pct)
      ? ok(`v26 item 9 the three key cards say ${names48.join(' / ')} and no theme name; key 1's card carries its own ${card48.cards[0].u}; the line under the key is "${card48.count}", no percentage`)
      : bad('v26 item 9 the key cards and the count line', JSON.stringify({ card48, names48 }));

    /* item 11: after the reveal the ONE instruction is the key's. AMENDED for build 49 (Aiden, after build 48): tapping the key ASKS again, and Open opens
       its chest. Testing's "key chest · ready" leaves key 1 whole and its reveal unseen, as a player who has just cleared the last bar is */
    await boot({});
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(300);
    await tap48('[data-act="dev-chestall"][data-chest="key"]'); await sleep(300);
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 0 }); }); await sleep(250);
    const due48 = await page.evaluate(() => getComputedStyle(document.getElementById('key-hint')).visibility);
    for (let i = 0; i < 90; i++) { await sleep(200); const on = await page.evaluate(() => !document.getElementById('key-cere').hidden || document.getElementById('s-key').classList.contains('kdue')); if (!on && i > 3) break; }
    const after48 = await page.evaluate(() => ({ hint: document.getElementById('key-hint').textContent, vis: getComputedStyle(document.getElementById('key-hint')).visibility, tapLine: document.querySelectorAll('#s-key .ctap:not(:empty)').length && !document.getElementById('key-cere').hidden }));
    await tap48('#key-ring .khubhit'); await sleep(500);
    const ask48 = await page.evaluate(() => ({ ask: !document.getElementById('key-ask').hidden, txt: document.getElementById('key-ask').innerText.replace(/\s+/g, ' ').trim(), playing: !document.getElementById('key-cere').hidden }));
    await tap48('[data-act="key-ask-yes"]'); await sleep(500);
    const open48 = await page.evaluate(() => ({ ask: !document.getElementById('key-ask').hidden, playing: !document.getElementById('key-cere').hidden, kind: document.getElementById('key-cere').dataset.kind, chest: document.getElementById('key-cere').dataset.rev }));
    await revealDone(); await sleep(400);
    const landed48 = await onScreen();
    const askWant48 = KC48.KEY.ask.replace('{chest}', KC48.GRID.chest.key).toLowerCase();
    (due48 === 'hidden' && after48.hint === KC48.KEY.completeReady.replace('{chest}', KC48.GRID.chest.key) && after48.vis === 'visible' && !after48.tapLine
      && ask48.ask && !ask48.playing && ask48.txt.toLowerCase().includes(askWant48) && !open48.ask && open48.playing && open48.kind === 'chest' && open48.chest === 'key' && landed48 === 's-pick')
      ? ok(`v26 item 11 once key 1's reveal has played the screen says only "${after48.hint}" (hidden while it plays); tapping the key asks "${ask48.txt}" (AMENDED for build 49) and Open plays the Skill chest, ending on the map`)
      : bad('v26 item 11 the key to its chest', JSON.stringify({ due48, after48, ask48, open48, landed48 }));

    /* item 3: every home menu item is green from the moment it is available until it is opened once - Keys and Customise UNLOCKED THROUGH PLAY, the
       opens saved, and Testing's fresh game clearing them */
    const menu48 = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#s-menu .item')].filter(b => b.dataset.dev === undefined).map(b => [b.dataset.go, b.classList.contains('newthing') ? 'green' : b.classList.contains('dim') || b.classList.contains('keylock') || b.classList.contains('cuslock') ? 'shut' : 'plain'])));
    const unl48 = Object.fromEntries((await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k !== 'quick-tap:four').map(k => [k, NOW]));
    await boot({ played: 0, menuOpened: {} }, { unlock: unl48 });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(300);
    const m0 = await menu48();
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
      && m1['s-pick'] === 'plain' && ['s-board', 's-prog', 's-about'].every(k => m1[k] === 'green') && m1['s-key'] === 'shut' && m1['s-custom'] === 'shut'
      && m2['s-key'] === 'green' && m2['s-custom'] === 'green' && m3['s-key'] === 'plain' && m3['s-custom'] === 'green' && m4['s-key'] === 'plain' && m4['s-custom'] === 'green'
      && m5['s-custom'] === 'plain' && m5['s-board'] === 'green' && m6['s-pick'] === 'green' && JSON.stringify(fresh6) === '{}')
      ? ok('v26 item 3 every menu item is green from the moment it is available until it is opened once: Play from the first load; Scores, Progress and About once the first run is on record; Keys and Customise once the Games chest is EARNED BY A RUN and opened on the map - opening each one spends its green, a reload keeps that, and Testing\'s fresh game gives every item its green back')
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
      && new Set(first.map(t => t.d)).size === 11 && total >= 5000 && total <= 8000 && again.every(t => t.d < 0) && replay.length === 11 && replay.every(t => t.d >= 0))
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
      P.Scores.runs().unshift({ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 });
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300);
      const row = document.querySelector('#msglist .msgrow[data-msg="intro"]');
      return { before, wrongLen, after: K.msgOpen(w), open: !row.classList.contains('locked'), lede: document.getElementById('msg-lede').textContent }; });
    // both Gauntlets played: eight rows, and the support row is the only one still locked
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, gauntSeen: { g1: 1, g2: 1 }, paid: 1 }, { runs: SPRINT52 });
    await go52('s-about'); await sleep(500); const allG = await rows();
    // the support hook is prefs.paid and NOTHING in the app writes it: the support button says its piece and the thank-you stays shut
    await boot({ chests: { games: 1 } });
    const supTap = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-about'); await wait(300); document.getElementById('support').click(); await wait(300);
      R.show('s-menu'); await wait(120); R.show('s-about'); await wait(300);
      return { paid: JSON.parse(localStorage.getItem('ne')).prefs.paid || 0, shut: document.querySelector('#msglist .msgrow[data-msg="thanks"]').classList.contains('locked') }; });
    const ids52 = MS52.MESSAGES.map(m => m.id);
    const shapes = MS52.MESSAGES.every(m => m.by && Object.keys(m.by).length === 1 && ['run', 'chest', 'gauntlet', 'support'].includes(Object.keys(m.by)[0]))
      && !MS52.MESSAGES.some(m => m.by.key) && MS52.MESSAGES.filter(m => m.by.gauntlet).length === 2 && MS52.MESSAGES.filter(m => m.by.chest).length === 4;
    const item7 = TITLES[1] === "You've seen them all!" && !TITLES.some(t => /is whole|Every game is open/.test(t));
    const of8 = [fresh52, oneG, allG].every(r => / of 8$/.test(r.lede)) && /0 of 8/.test(fresh52.lede) && /8 of 8/.test(allG.lede);
    const hidden = fresh52.ids.join() === ids52.filter(i => !['g1', 'g2'].includes(i)).join() && oneG.ids.join() === ids52.filter(i => i !== 'g2').join() && allG.ids.join() === ids52.join()
      && ![fresh52, oneG, allG].some(r => r.qm || r.gap);
    const locks = fresh52.locked.every(Boolean) && oneG.need.some(n => /opens when you play Gauntlet/i.test(n)) && fresh52.need.some(n => /finish a quick tap/i.test(n))
      && allG.locked.filter(Boolean).length === 0 && /support the game/i.test(oneG.need[oneG.ids.indexOf('thanks')]);
    (shapes && item7 && of8 && hidden && locks && welcome.before === false && welcome.wrongLen === false && welcome.after === true && welcome.open && !supTap.paid && supTap.shut)
      ? ok(`v27 items 7 / 8 About carries Aiden's new eight (${TITLES.join(' | ')}): Welcome waits for the first solo Quick Tap . Sprint (a Dash does not open it), the four chests keep the middle, and the three "... is whole" key rows are gone. R1 holds - a Gauntlet's row is NOT IN THE LIST until its Gauntlet has come out of its chest (${fresh52.ids.length} rows, then ${oneG.ids.length}, then ${allG.ids.length}), with no gap and no "???" - while the counter always says "of 8". The thank-you is listed and locked on "opens when you support the game", and tapping Support does not open it`)
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
      && P52.on.steps.map(x => x.name).join() === 'outline,line,open' && P52.off.steps.map(x => x.name).join() === 'close,dot,fade'
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
      document.querySelector('#msglist .msgrow[data-msg="pro"]').click(); await wait(60);
      const h = document.getElementById('vplay'), fr = h.querySelector('.vframe'), v = h.querySelector('video');
      const anim = el => el.getAnimations().map(a => a.animationName).filter(Boolean).join();
      const out = { built: !!h, hidden: h.hidden, von: h.classList.contains('von'), title: h.querySelector('.vtitle').textContent,
        foot: h.querySelector('.vfoot').textContent, over: !!h.querySelector('.vpic video') && !h.querySelector('.vframe .vtitle, .vframe .vcc, .vframe .vfoot'),
        ctrl: v ? v.hasAttribute('controls') : true, inline: v ? v.hasAttribute('playsinline') : false, auto: v ? v.hasAttribute('autoplay') : true,
        src: v ? v.querySelector('source').getAttribute('src') : '', cc: v ? !!v.querySelector('track[kind="captions"][default]') : false,
        glowVar: h.style.getPropertyValue('--vg'), want: CH.msgCol(M.MESSAGES.find(x => x.id === 'pro')),
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
    const shown = play.built && !play.hidden && play.von && play.title === 'Have you gone pro?' && /tap outside to close/i.test(play.foot)
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
    (m55.pct === 200 && m55.meter === 200 && m55.max === 300 && m55.key1 === 100 && m55.pro === 100 && m55.author === 0)
      ? ok('item 1 / v30 59.11 the meter is one continuous 0-300 — every mode open and every key-1 and Pro bar cleared renders 200%, and what a surface PRINTS (meterPct) is what the app reasons with (meter)')
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
      let lit = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { n++; if (d[i + 3] > 6) lit++; }
      return { bg, lit: +(lit / n * 100).toFixed(1), ground: getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() }; }, bg));
    // the starfield: `stars` draws it and nothing else may — read off the module rather than the pixels, which is what the draw loop decides on
    const starOnly = await page.evaluate(async bgs => { const A = await import('./ui/atmosphere.js'); return bgs.filter(b => !!A.LAYER[b]); }, bgs);
    const split57 = await page.evaluate(async () => { const S = await import('./core/store.js'); const T = await import('./ui/theme.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const read = () => { const r = getComputedStyle(document.documentElement); return { g: r.getPropertyValue('--ground').trim(), l: r.getPropertyValue('--line').trim() }; };
      S.prefs.bg = 'grid'; S.prefs.tint = ''; S.save(); T.applyPrefs(); R.show('s-menu'); await wait(450);
      const off = read();
      S.prefs.tint = '#1b0a2e'; S.save(); T.applyPrefs(); await wait(650);
      const on = read(), cx = document.getElementById('stars').getContext('2d'), px = cx.getImageData(3, 3, 1, 1).data;
      S.prefs.bg = 'rain'; S.save(); T.applyPrefs(); await wait(400);
      const kept = S.prefs.tint;
      R.show('s-custom'); await wait(550);
      const row = document.getElementById('c-bgcol'), pat = document.getElementById('c-bg');
      const rows = { pat: pat ? pat.querySelectorAll('button').length : -1, wheelInPat: pat ? pat.querySelectorAll('.wheel').length : -1,
        col: row ? row.querySelectorAll('button').length : -1, none: row ? row.querySelectorAll('.bgnone').length : -1 };
      S.prefs.tint = ''; S.prefs.bg = 'stars'; S.save(); T.applyPrefs();
      return { off, on, px: [px[0], px[1], px[2]], kept, rows }; });
    const ok57 = drew.every(d => d.lit > 0) && starOnly.join() === 'lantern,circuit,thorn'
      && split57.off.g === split57.on.g && split57.off.l === split57.on.l
      && split57.px.join() === '27,10,46' && split57.kept === '#1b0a2e'
      && split57.rows.wheelInPat === 0 && split57.rows.col === 2 && split57.rows.none === 1
      && TH57.ITEMS.bg.length === 7 && TH57.ITEMS.bgcol.length === 2;
    (ok57)
      ? ok(`57.11 all ${bgs.length} backgrounds draw (${drew.map(d => d.bg + ' ' + d.lit + '%').join(', ')}) and only the three KEY layers are layers at all — the starfield is the default background's alone; and the wheel is a second SETTING: the colour is painted on the background layer (rgb ${split57.px.join(',')} on the canvas), \`--ground\` and \`--line\` do not move with it (${split57.on.g}), it survives a change of pattern, and Customise carries ${split57.rows.pat} patterns with no wheel among them plus a colour row of "no colour" and the wheel`)
      : bad('57.11 the backgrounds', JSON.stringify({ drew, starOnly, split57 }));
  }
}
