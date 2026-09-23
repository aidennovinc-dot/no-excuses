// ---- 4b. two-player: the five games that never had it (v15 section 4, build 25) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, sleep, names, section, ok, bad, read, boot, at, page, onScreen, inGame, click, setStorage, getJSON, OPEN_PREFS, skipAd, driveToResult, openSheet } from '../lib/gate.mjs';

export const SECTION = ["two-player (v15 section 4)"];

export async function run() {
  {
    // the config the section is built on, read straight out of the module rather than matched in its source
    const cfg = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'config', 'games.js')).href);
    const WANT = ['hold:grow', 'hold:cut', 'timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'spot:count'];
    const keys = Object.keys(cfg.PASS_TURNS);
    const missing = WANT.filter(k => !keys.includes(k));
    const stray = keys.filter(k => { const [g, d] = k.split(':'); return !cfg.GAMES[g] || !cfg.GAMES[g].modes.includes(d); });
    const shaped = keys.every(k => Array.isArray(cfg.PASS_TURNS[k]) && cfg.PASS_TURNS[k].length === 2 && cfg.PASS_TURNS[k].every(n => n >= 1));
    (!missing.length && !stray.length && shaped) ? ok(`4.x every turn-taking mode has a PASS_TURNS row and every row names a real mode (${keys.length})`)
      : bad('4.x PASS_TURNS covers the turn-taking modes', `missing ${missing.join(', ') || 'none'} · stray ${stray.join(', ') || 'none'} · shaped ${shaped}`);
    // 4.5 / 4.6: the two new versus modes exist in the config at all
    (cfg.SEQ_VS.lives >= 1 && cfg.SEQ_VS.opens.length > 1) ? ok(`4.5 Sequence versus is lives (${cfg.SEQ_VS.lives}) with an opening length to pick (${cfg.SEQ_VS.opens.join('/')})`) : bad('4.5 SEQ_VS', JSON.stringify(cfg.SEQ_VS));
    const spotVs = Array.isArray(cfg.GAMES.spot.versus) && cfg.GAMES.spot.versus.includes('find');
    (spotVs && cfg.VS_TARGET.spot >= 1) ? ok(`4.6 Spot · Find has a versus, first to ${cfg.VS_TARGET.spot} rounds`) : bad('4.6 Spot versus', `versus ${JSON.stringify(cfg.GAMES.spot.versus)} · target ${cfg.VS_TARGET.spot}`);
  }
  /* 4.1-4.4: Estimate, Timing and Reaction pass & play alternate INSIDE one run now. The hand-over screen must never appear,
     the result must be the pair, and nothing about the run may reach the store (L10, widened by A.3) */
  for (const [g, mi, label] of [['hold', 0, 'Estimate · Grow'], ['timing', 0, 'Timing · Stopwatch'], ['reaction', 0, 'Reaction · Flash'], ['reaction', 1, 'Reaction · Go / No-go']]) {
    await openSheet(g, mi, 0, 1);
    const btn = await page.evaluate(() => document.querySelector('#go-btn').textContent.trim());
    await click('#go-btn');
    const at = await driveToResult(g, `pass & play · ${label}`, 150000);
    if (at === 's-pass') { bad(`4.x ${label} pass & play is one run, not two`, 'it ended on the hand-over screen'); continue; }
    if (at !== 's-over') continue;
    const r = await page.evaluate(() => ({ pair: document.querySelector('#vsbox').classList.contains('on'), board: document.querySelector('#over-top').hidden, txt: document.querySelector('#vsbox').textContent.replace(/\s+/g, ' ').trim().slice(0, 60) }));
    (r.pair && r.board) ? ok(`4.x ${label} pass & play → one run, a pair and no board (Go read "${btn}") · ${r.txt}`) : bad(`4.x ${label} pass & play shows the pair and no board (L10)`, JSON.stringify(r));
    const st = await getJSON('ne');
    const wrote = ['unlock', 'ach', 'bars', 'runs'].filter(k => st && st[k] && Object.keys(st[k]).length);
    (!wrote.length) ? ok(`A.3 / L10 ${label} pass & play wrote nothing — no run, no unlock, no achievement, no bar`) : bad('A.3 a two-player run wrote to the store', wrote.join(', '));
  }
  // 4.5: Sequence versus keeps the key row and gains an opening-length row, then plays to a pair
  {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(320);
    await click('[data-go="s-pick"]'); await sleep(260);
    await page.evaluate(() => document.querySelector('.tile[data-game="sequence"]').click()); await sleep(300);
    await click('[data-p="f"]'); await sleep(180); await click('[data-p2="2"]'); await sleep(240);
    const sheet = await page.evaluate(() => ({
      lens: [...document.querySelectorAll('#time-row .tbtn b')].map(b => b.textContent.trim()),
      lenShown: getComputedStyle(document.querySelector('#time-row')).display !== 'none',
      opens: [...document.querySelectorAll('#prac-row [data-opens]')].map(b => b.textContent.trim()),
      optsShown: getComputedStyle(document.querySelector('#seq-opts')).display !== 'none',
      line: (document.querySelector('#vsart small') || {}).textContent || '' }));
    // v17 (B.9): two key counts, not three - the row itself is what 4.5 is about, and the count comes off the config
    (sheet.lenShown && sheet.lens.length === 2 && sheet.lens.join() === '3 keys,7 keys') ? ok(`4.5 Sequence versus keeps the key row (${sheet.lens.join(' · ')})`) : bad('4.5 Sequence versus shows the key row', JSON.stringify(sheet));
    (sheet.optsShown && sheet.opens.length > 1) ? ok(`4.5 and gains the opening length (${sheet.opens.join('/')} notes) · "${sheet.line}"`) : bad('4.5 Sequence versus opening length', JSON.stringify(sheet));
    (!/compose/i.test(sheet.line)) ? ok('4.5 Compose is gone from the versus line') : bad('4.5 the versus line still describes Compose', sheet.line);
    await page.evaluate(() => { const t = [...document.querySelectorAll('#time-row .tbtn')]; if (t[0]) t[0].click(); }); await sleep(160);
    await click('#go-btn');
    const at = await driveToResult('sequence', 'versus · Sequence', 120000);
    if (at === 's-over') { const r = await page.evaluate(() => ({ pair: document.querySelector('#vsbox').classList.contains('on'), board: document.querySelector('#over-top').hidden, txt: document.querySelector('#vsbox').textContent.replace(/\s+/g, ' ').trim().slice(0, 60) }));
      (r.pair && r.board) ? ok(`4.5 Sequence versus ends on lives, a pair and no board · ${r.txt}`) : bad('4.5 Sequence versus result', JSON.stringify(r)); }
    else bad('4.5 Sequence versus reaches a result', 'on ' + at);
  }
  // 4.6: Spot · Find versus — two odd shapes in one crowd, first to find theirs takes the round
  {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(320);
    await click('[data-go="s-pick"]'); await sleep(260);
    await page.evaluate(() => document.querySelector('.tile[data-game="spot"]').click()); await sleep(300);
    await click('[data-p="f"]'); await sleep(180);
    const offered = await page.evaluate(() => !document.querySelector('#vs-wrap [data-p2="2"]').hidden);
    offered ? ok('4.6 Spot offers Versus on the player row even though its FIRST mode has none') : bad('4.6 Spot offers Versus', 'the chip is hidden on the mode stage');
    await click('[data-p2="2"]'); await sleep(200);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); c[1].click(); }); await sleep(460);
    const stillVs = await page.evaluate(() => document.querySelector('#vs-wrap [data-p2="2"]').classList.contains('sel'));
    stillVs ? ok('4.6 and keeps it once Find is the mode') : bad('4.6 Versus survives picking Find');
    await click('#go-btn');
    // the two odd shapes are the only two classes with a single member; tap one and its owner takes the round
    const pokeFind = () => page.evaluate(() => {
      const els = [...document.querySelectorAll('#gen .fs')]; if (!els.length) return false;
      // AMENDED at build 50 (v26 §B2): one id per shape across every game — the triangle is 'triangle' in Spot now, as it always was in Estimate
      const cls = e => ['circle', 'square', 'triangle'].find(c => e.classList.contains(c)) || '';
      const n = {}; els.forEach(e => { const c = cls(e); n[c] = (n[c] || 0) + 1; });
      const t = els.find(e => n[cls(e)] === 1); if (!t) return false;
      const r = t.getBoundingClientRect();
      document.getElementById('gen').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 }));
      return true; });
    const deadline = Date.now() + 120000; let at = null;
    while (Date.now() < deadline) { at = await onScreen(); if (at === 's-over') break; if (await skipAd()) continue; if (at === null || (await inGame())) await pokeFind(); await sleep(120); }
    if (at === 's-over') { const r = await page.evaluate(() => ({ pair: document.querySelector('#vsbox').classList.contains('on'), board: document.querySelector('#over-top').hidden, txt: document.querySelector('#vsbox').textContent.replace(/\s+/g, ' ').trim().slice(0, 60) }));
      (r.pair && r.board) ? ok(`4.6 Spot · Find versus plays out to a pair and no board · ${r.txt}`) : bad('4.6 Spot versus result', JSON.stringify(r)); }
    else bad('4.6 Spot · Find versus reaches a result', 'on ' + (at || 'the game'));
  }
  /* ---- v29 (build 56): REACTION VERSUS SCORES. Nothing in this file had ever driven it — the versus drives here are Quick Tap's
     pads and Spot's crowd, and Reaction versus is a tap on the top or bottom half of #gen. Build 55 lost the three statements
     that score it (a stray end-of-line comment swallowed them) and every one of four full gate runs passed. This is the guard. ---- */
  {
    await boot({});
    const rx = await page.evaluate(async () => { const ST = await import('./core/state.js'); const RUN = await import('./run/run.js');
      const M = await import('./games/reaction/index.js'); const E = M.default; const wait = t => new Promise(r => setTimeout(r, t));
      Object.assign(ST.sel, { game: 'reaction', diff: 'flash', secs: 5, vs: 2, practice: 0 }); ST.VS.reset();
      RUN.start(); await wait(3200);
      for (let i = 0; i < 90 && !E.armed; i++) await wait(100);      // through the 3-2-1 and the 1.2-4.5s wait
      const before = { st: E.st, armed: !!E.armed, n: (E.vsN || []).slice() };
      const g = document.getElementById('gen'), r = g.getBoundingClientRect();
      g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * .2, pointerId: 1 }));
      await wait(200);
      const after = { st: E.st, n: (E.vsN || []).slice() };
      RUN.abort(); await wait(300); ST.sel.vs = 0; ST.VS.reset();
      return { before, after }; });
    (rx.before.armed && rx.before.st === 'go' && rx.after.st === 'show' && (rx.after.n[0] + rx.after.n[1]) === (rx.before.n[0] + rx.before.n[1]) + 1)
      ? ok(`v15 §4 / L4 a Reaction VERSUS tap scores the round to a player and stops it — ${rx.before.n.join('-')} to ${rx.after.n.join('-')}`)
      : bad('a Reaction versus tap scores nothing', JSON.stringify(rx));
  }
}
