/* ---- 17. build 37 (batch 15: FEEDBACK-v21 §G.1–§G.4, §G.8; FEEDBACK-v20 §D.4, §D.7; FEEDBACK-v22 §K; Aiden's 2026-09-14 data fixes) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, check, ok, bad, root, read, strip, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, down, up } from '../lib/gate.mjs';

export const SECTION = ["build 37 - keys and chests"];

export async function run() {
  const imp37 = (...p) => import(pathToFileURL(path.join(root, ...p)).href);
  const CP37 = await imp37('config', 'copy.js');   // build 51 (v27 item 4): the four chest names come from the config, never spelled here
  const css37 = read('styles', 'app.css'), pick37 = read('ui', 'screens', 'pick.js'), keyjs37 = read('progress', 'key.js'), menu37 = read('ui', 'screens', 'menu.js'), hud37 = read('games', '_shared', 'hud.js'), prog37 = read('progress.js');
  const NOW37 = Date.now();
  const rgb37 = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };

  /* ---- a / b: the two typos and Timing's thresholds (Aiden, 2026-09-14; #414 closed) ---- */
  {
    const V = await imp37('config', 'verdicts.js'), T = V.VERDICTS;
    const lines = Object.values(T).flatMap(r => Object.values(r.lines).flat());
    (T['reaction:nogo'].lines.ok[1] === 'You got it!' && T['reaction:nogo'].lines.bad[2] === 'You need to be one with the shapes.' && !lines.some(l => /!\.$|be own with/.test(l)))
      ? ok('a. the two Go / No-go typos are corrected - "You got it!" and "You need to be one with the shapes."') : bad('a. the typos', JSON.stringify([T['reaction:nogo'].lines.ok[1], T['reaction:nogo'].lines.bad[2]]));
    const at = { sw: T['timing:stopwatch'].at.join(), hd: T['timing:hidden'].at.join(), rsw: V.ROUND_AT['timing:stopwatch'].join(), rhd: V.ROUND_AT['timing:hidden'].join() };
    const rules = read('progress', 'rules.js');
    /* RESTATED at build 60 (v31 60.9): HIDDEN's numbers are Aiden's again and they moved. Per round 40/70/95 became 60/115/200 (his
       own), and the Set triple .9259/.8796/.8241 became .8704/.8148/.7222 — which is the Author, Pro and Skill key bars converted
       onto the same 5400ms scale (700 / 1,000 / 1,500ms over ten rounds), closing the fault that a Set "Meh." was STRICTER than the
       Skill key's own bar. Stopwatch did not move, and neither scale moved: this is still 5s and 5400ms. */
    (at.sw === '0.9,0.74,0.56' && at.hd === '0.8704,0.8148,0.7222' && at.rsw === '0.1,0.3,0.55' && at.rhd === '60,115,200' && /'timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(rules))
      ? ok('b. Timing\'s thresholds build (#414 closed) - Stopwatch 0.90 / 0.74 / 0.56 and per round 0.1 / 0.3 / 0.55, Hidden 0.8704 / 0.8148 / 0.7222 and 60 / 115 / 200 (RESTATED at build 60, v31 60.9: Hidden IS the Author / Pro / Skill key bars in the Set\'s own unit) - and the scales did not move (5s, 5400ms)')
      : bad('b. Timing thresholds', JSON.stringify(at));
    const warn = [['site', 'config', 'verdicts.js'], ['site', 'progress', 'rules.js'], ['_review', '2026-09-13_personal_verdict-desk-edits.md'], ['_review', '2026-09-14_personal_verdict-desk-export.md']]
      .filter(p => /DO NOT BUILD Timing|DO-NOT-BUILD-TIMING|DO NOT BUILD THE LINE TABLES BELOW[\s\S]*DO NOT BUILD Timing/i.test(read('..', ...p))).map(p => p.join('/'));
    !warn.length ? ok('b. the DO NOT BUILD Timing warning is gone from the config, the rules and both Verdict Desk files') : bad('b. the Timing warning still stands somewhere', warn.join(', '));
    const tq = await page.evaluate(async () => { const P = await import('./progress.js'); const tier = r => (P.tierOf(Object.assign({ misses: 0, t: 1, v: 4 }, r)) || {}).tier;
      return { sw: [tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 0.5 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 0.51 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 2.19 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 2.3 })],
        /* RESTATED at build 60 (v31 60.9): these four probes were picked to sit either side of the OLD 400 / 650 / 950 bars. They are
           picked the same way for Aiden's new ones — one either side of the Author bar (700ms) and one either side of the Skill bar
           (1,500ms), which is the bottom of the scale. */
        hd: [tier({ g: 'timing', d: 'hidden', s: 10, hits: 699 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 700 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 1500 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 1501 })] }; });
    (tq.sw.join() === 'ace,good,ok,bad' && tq.hd.join() === 'ace,good,ok,bad')
      ? ok('b. played back through the tier: a Stopwatch Set 0.50s off is Amazing!, 0.51 Great!, 2.19 Good., 2.30 Meh.; Hidden 699ms Amazing!, 700 Great! (0.8704 is 699.8ms on the curve), 1500 Good., 1501 Meh. — the Author, Pro and Skill key bars, 60.9') : bad('b. Timing played back', JSON.stringify(tq));
  }

  /* ---- c. §K: one colour for "this is what you chose" - and its three checks ---- */
  {
    (/\n  \.choice\.sel\{border-color:var\(--press\)\}/.test(css37) && /\.grid\.chosen \.tile\.keep \.pic\{outline-color:var\(--line\)\}/.test(css37) && /\.grid\.chosen \.tile\.keep \.name\{color:var\(--mute\)\}/.test(css37)
      // AMENDED at build 45 (v25 item 3): the `.picked` override is gone with the 170ms hold it was the confirmation for — nothing sets the class now
      && /\.choice\.sel\.newthing,\.choice\.sel\.newplay\{border-color:var\(--press\)!important\}/.test(css37) && !/\.choice\.sel\.picked/.test(css37) && !/\bclassList\.[a-z]+\('picked'/.test(pick37))
      ? ok('§K a selected mode takes --press, the pressed tile demotes once a mode is chosen (build 38), first-seen and unplayed modes take --press when selected, and the `.picked` override is gone with its 170ms hold (v25 item 3)')
      : bad('§K the rules');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(600);
    const k = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms));
      const P = getComputedStyle(document.documentElement).getPropertyValue('--press').trim(), OK = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim();
      const rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
      const grid = document.getElementById('grid'), sheet = document.getElementById('sheet');
      const amber = t => [(getComputedStyle(t.querySelector('.pic')).outlineColor === rgb(P) || getComputedStyle(t.querySelector('.name')).color === rgb(P)) ? rgb(P) : '', ...[...document.querySelectorAll('#diff-row .choice')].filter(c => c.offsetParent).map(c => getComputedStyle(c).borderTopColor)].filter(c => c === rgb(P)).length;
      const qt = document.querySelector('.tile[data-game="quick-tap"]'); qt.click(); await wait(450);
      const out = { P, mode: { dim: grid.classList.contains('dim'), stage: sheet.classList.contains('len') ? 'len' : 'mode', outline: getComputedStyle(qt.querySelector('.pic')).outlineColor, line: (() => { const p = document.createElement('i'); p.style.cssText = 'position:absolute;border-top:1px solid var(--line)'; document.body.appendChild(p); const c = getComputedStyle(p).borderTopColor; p.remove(); return c; })(), name: getComputedStyle(qt.querySelector('.name')).color, amber: amber(qt) } };
      const two = document.querySelector('#diff-row .choice[data-diff="two"]'); two.click(); await wait(60);
      out.picked = getComputedStyle(two).borderTopColor; out.pickedStage = sheet.classList.contains('len'); out.pickedClass = two.className; await wait(500);
      out.len = { stage: sheet.classList.contains('len') ? 'len' : 'mode', sel: getComputedStyle(document.querySelector('#diff-row .choice.sel')).borderTopColor, amber: amber(qt) };
      // (3) the contrast of --press against the SHEET's own ground, plain and pass & play
      const parse = s => { let m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s); if (m) return [+m[1], +m[2], +m[3]]; m = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(s); return m ? [m[1] * 255, m[2] * 255, m[3] * 255] : null; };
      const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const pc = parse(rgb(P));
      out.contrast = { plain: +ratio(pc, parse(getComputedStyle(sheet).backgroundColor)).toFixed(2) };
      sheet.classList.add('two'); out.contrast.pass = +ratio(pc, parse(getComputedStyle(sheet).backgroundColor)).toFixed(2); sheet.classList.remove('two');
      // (1) Sequence has one mode and goes straight to its length row - the grid is dimmed there too
      document.querySelector('#s-pick .back').click(); await wait(500); document.querySelector('.tile[data-game="sequence"]').click(); await wait(500);
      out.seq = { dim: grid.classList.contains('dim'), stage: sheet.classList.contains('len') ? 'len' : 'mode' };
      out.okRgb = rgb(OK); return out; });
    (k.mode.dim && k.mode.stage === 'mode' && k.seq.dim && k.seq.stage === 'len')
      ? ok('§K check 1: .grid.dim is on for the MODE sheet (Quick Tap) as well as the length sheet (Sequence, one mode) - it is set for every stage but the grid') : bad('§K check 1', JSON.stringify({ mode: k.mode, seq: k.seq }));
    // AMENDED at build 45 (v25 item 3): there is no 170ms --ok flash to catch any more — the tap is at the length stage on the frame it lands
    (k.mode.outline === rgb37(k.P) && k.mode.amber === 1 && k.len.sel === rgb37(k.P) && k.len.amber === 1 && k.pickedStage && !/\bpicked\b/.test(k.pickedClass))
      ? ok(`§K one amber thing at a time: with the mode row up and nothing tapped the pressed tile is the one amber thing; once a mode is chosen that mode is (AMENDED at build 38) (${k.len.sel}); the tap goes straight to the lengths with no green flash on the way (v25 item 3)`)
      : bad('§K one colour for what you chose', JSON.stringify({ mode: k.mode, len: k.len, picked: k.picked, stage: k.pickedStage, cls: k.pickedClass }));
    (k.contrast.plain >= 3 && k.contrast.pass >= 3)
      ? ok(`§K check 3: --press against the sheet's own ground is ${k.contrast.plain}:1, and ${k.contrast.pass}:1 on the pass & play sheet - past the 3:1 a UI line needs`) : bad('§K check 3 the contrast', JSON.stringify(k.contrast));
  }

  /* ---- G.8: a switch and a reset per key (S5). AMENDED at build 40 (v23 L.8f): per CHEST, four of each - the Skill chest's switch is key 1 ---- */
  {
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: { 'quick-tap:two:5': NOW37, 'dots:blind:5': NOW37 } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-testing"]'); await sleep(400);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] #dev-keys [data-act]')].map(b => b.dataset.act + ':' + b.dataset.chest));
    const readK = () => page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { bars: Object.keys(ne.bars).filter(k => !k.includes('|')).sort(), snap: (ne.prefs.devKeys || {}).clear, sel: document.querySelector('#dev-keys [data-act="dev-chestall"][data-chest="key"]').classList.contains('sel'), chestKey: ne.prefs.chests.key, pro: 'pro' in ne.prefs, ach: Object.keys(ne.ach).filter(a => a.startsWith('key_clear_')) }; });
    const sw = '#dev-keys [data-act="dev-chestall"][data-chest="key"]';
    await click(sw); await sleep(300); const on = await readK();
    await click(sw); await sleep(300); const off = await readK();
    await click(sw); await sleep(300);
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.chests = Object.assign({}, S.prefs.chests, { key: 1 }); S.store.ach.key_clear_all = Date.now(); S.save(); });
    await click('#dev-keys [data-act="dev-chestreset"][data-chest="key"]'); await sleep(300); const rs = await readK();
    (btns.join() === 'dev-chestall:games,dev-chestall:key,dev-chestall:pro,dev-chestall:thorns,dev-chestreset:games,dev-chestreset:key,dev-chestreset:pro,dev-chestreset:thorns')
      ? ok('G.8 AMENDED at build 40 (L.8f): eight Testing buttons under [data-dev] - a switch and a reset for each of the four chests (S5)') : bad('G.8 the buttons', btns.join());
    /* AMENDED at build 48 (v26 items 7 / 12): the switch plays forward until the Skill chest is READY and never opens it, and taking it off is its
       reset - nothing is remembered and put back, because a snapshot restored over a later state is a state play cannot reach */
    (on.bars.length === 30 && !on.snap && on.sel && on.chestKey === 0 && !off.bars.length && !off.snap && !off.sel)
      ? ok('G.8 the Skill chest\'s switch clears all thirty key-1 bars and leaves the Skill chest ready, unopened; switching it off backs key 1 out (v26 items 7 / 12)') : bad('G.8 the switch', JSON.stringify({ on, off }));
    (!rs.bars.length && rs.chestKey === 0 && !rs.pro && !rs.ach.length && !rs.snap)
      ? ok('G.8 resetting the Skill chest backs key 1 out entirely - its bars, the chest and its key achievements - without Fresh game (there is no step into Pro left to undo)') : bad('G.8 the reset', JSON.stringify(rs));
  }

  /* ---- G.1 / G.2 / D.7: every chest and every key on screen from the start, locked ones crossed out, no numbers (v17 A.1, narrowed).
     AMENDED at build 40 (v23 L.10): four chests, and before the Games chest all three keys are crossed out ---- */
  {
    await setStorage({ ne: { v: 5, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const g12 = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const ids = ['games', 'key', 'pro', 'thorns'], c = n => document.querySelector(`.chest[data-chest="${n}"]`);
      const chests = () => ids.map(n => ({ shown: !c(n).hidden, locked: c(n).classList.contains('locked'), name: c(n).querySelector('.name').textContent.trim(), need: c(n).querySelector('.pic').dataset.need, r: +c(n).style.gridRow, col: +c(n).style.gridColumn }));
      R.show('s-pick'); await wait(600);
      const out = { fresh: chests() };
      c('key').click(); await wait(200); out.tap = { toast: document.getElementById('toast').textContent.trim(), screen: document.querySelector('.screen.on').id, chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.key };
      R.show('s-key'); await wait(700);
      const kk = () => [...document.querySelectorAll('#key-keys .kkey')];
      out.keys = { n: kk().length, locked: kk().map(b => b.classList.contains('locked')), x: kk().map(b => !!b.querySelector('b.x')), under: kk().map(b => b.querySelector('u').textContent.trim()), whole: kk().some(b => b.classList.contains('whole') && b.classList.contains('locked')), one: document.getElementById('key-keys').classList.contains('one') };
      kk()[2].click(); await wait(300);
      out.keyTap = { toast: document.getElementById('toast').textContent.trim(), title: document.getElementById('key-title').textContent.trim(), sel: kk().findIndex(b => b.classList.contains('sel')) };
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save(); R.show('s-menu'); await wait(150); R.show('s-pick'); await wait(500);
      out.after1 = chests(); R.show('s-key'); await wait(500); out.keysAfter = kk().map(b => b.classList.contains('locked'));
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.save(); R.show('s-menu'); await wait(150); R.show('s-key'); await wait(500); out.keysAfter2 = kk().map(b => b.classList.contains('locked'));
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    const f = g12.fresh;
    (f.every(x => x.shown) && f.every(x => x.locked) && f.slice(1).map(x => x.name).join('|') === [CP37.GRID.chest.key, CP37.GRID.chest.pro, CP37.GRID.chest.thorns].join('|') && f.slice(1).map(x => x.need).join('|') === 'Earn the Skill key|Earn the Pro key|Earn the Author key' /* AMENDED for build 49 (Aiden, after build 48): the Skill key */ /* AMENDED at build 48 (v26 item 12) */
      && f.slice(1).every(x => x.col === f[0].col) && f[1].r === f[0].r + 1 && f[2].r === f[0].r + 2 && f[3].r === f[0].r + 3)
      ? ok('G.1 (v17 A.1, narrowed; AMENDED at build 40, L.10c) the Key, Pro and Author chests are on the map from the start, stacked under the Games chest, locked, each saying which key opens it and nothing about what is inside (v26 item 12)') : bad('G.1 the chest column', JSON.stringify(f));
    (g12.tap.toast === 'Open the previous chest first' && g12.tap.screen === 's-pick' && !g12.tap.chest2)
      ? ok('G.1 tapping a chest whose previous chest is shut says so and stays put, storing nothing') : bad('G.1 the early tap', JSON.stringify(g12.tap));
    // AMENDED at build 48 (v26 item 12): no percentage on the map - each locked key chest names its key, before and after the Games chest
    (g12.after1.slice(1).map(x => x.need).join('|') === 'Earn the Skill key|Earn the Pro key|Earn the Author key' /* AMENDED for build 49 (Aiden, after build 48): the Skill key */)
      ? ok(`G.1 once the Games chest is open the Skill chest says "${g12.after1[1].need}" and the chests after it name their keys - no percentage (v26 item 12)`) : bad('G.1 after the Games chest', JSON.stringify(g12.after1));
    const u = g12.keys.under;
    (g12.keys.n === 3 && g12.keys.locked.join() === 'true,true,true' && g12.keys.x.join() === 'true,true,true' && u[0] === 'To unlock: open the Games chest' && u[1] === 'To unlock: open the previous chest' && u[2] === u[1] && !g12.keys.whole && !g12.keys.one)
      ? ok(`G.2 / D.7 AMENDED at build 40 (L.10a): all three keys on the strip and all three crossed out before the Games chest - "${u[0]}", then "${u[1]}" - with no percentage`) : bad('G.2 / D.7 the key strip', JSON.stringify(g12.keys));
    (/^Open the previous chest first/.test(g12.keyTap.toast) && g12.keyTap.title === 'skill key' /* AMENDED for build 49 (Aiden, after build 48): the Skill key */ && g12.keyTap.sel === 0)
      ? ok('G.2 / A.1 a locked key says what opens it and does not open - no ring, no numbers') : bad('G.2 the locked key tap', JSON.stringify(g12.keyTap));
    (g12.keysAfter.join() === 'false,true,true' && g12.keysAfter2.join() === 'false,false,true') ? ok('G.2 the Games chest opens key 1, the Skill chest opens Pro, and Author stays crossed out until the Pro chest (builds 38 and 40)') : bad('G.2 after each chest', JSON.stringify({ a: g12.keysAfter, b: g12.keysAfter2 }));
  }

  /* ---- G.3: chest 1 waits for every game mode - the one crossing between the chain and the key ---- */
  {
    const KB = await imp37('config', 'key-bars.js'), U = await imp37('config', 'unlocks.js');
    const chain = new Set(U.UNLOCKS.map(x => x.key));
    const modes = [...new Set(Object.keys(KB.KEY_BARS).map(key => key.split(':').slice(0, 2).join(':')))];
    const stranded = modes.filter(m => !chain.has(m) && m !== 'quick-tap:two');
    const chestInChain = [['config', 'unlocks.js'], ['progress', 'rules.js']].filter(p => /chest/i.test(strip(read(...p)))).map(p => p.join('/'));
    const modeOpenLine = (/const modeOpen=\(g,d,noChal\)=>[^\n]*/.exec(prog37) || [''])[0];
    (!stranded.length && !chestInChain.length && modeOpenLine && !/chest/.test(modeOpenLine))
      ? ok(`G.3 VERIFIED: every key-1 bar belongs to a mode the chain reaches without chest 1 (${modes.length} modes, none stranded) and nothing in the chain reads a chest - the chest can always be opened`)
      : bad('G.3 a key-1 bar sits behind chest 1', JSON.stringify({ stranded, chestInChain }));
    // AMENDED at build 40 (v23 L.10): modesOpen() sits beside tierOpen() now - mapOpen() is gone - and it is what opens the Games chest
    (/const modesOpen = \(\) => [^\n]*modeCount\(\)/.test(keyjs37) && keyjs37.indexOf('const modesOpen') > keyjs37.indexOf('const tierOpen') && keyjs37.indexOf('const modesOpen') - keyjs37.indexOf('const tierOpen') < 1600
      && !/store\.unlock/.test(strip(keyjs37)) && !/store\.unlock/.test(strip(pick37)))
      ? ok('G.3 ONE exported predicate, modesOpen(), beside tierOpen() - reading the chain through progress.js modeCount(), and neither the key nor the grid reads store.unlock') : bad('G.3 the one crossing');
    await setStorage({ ne: { v: 5, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const g3 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const P = await import('./progress.js'); const U = await import('./config/unlocks.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const c1 = () => document.querySelector('.chest[data-chest="games"]');
      const out = { m0: P.modeCount() };
      R.show('s-pick'); await wait(600);
      out.before = { need: c1().querySelector('.pic').dataset.need, gated: c1().classList.contains('gated'), gate: document.querySelectorAll('#gridlines .glgate').length, open: K.modesOpen(), state: K.chestState('games') };
      c1().click(); await wait(200); out.before.toast = document.getElementById('toast').innerHTML; out.before.screen = document.querySelector('.screen.on').id;
      for (const x of U.UNLOCKS) S.store.unlock[x.key] = Date.now(); S.save();
      R.show('s-menu'); await wait(150); R.show('s-pick'); await wait(600);
      out.after = { need: c1().querySelector('.pic').dataset.need, ready: c1().classList.contains('ready'), gate: document.querySelectorAll('#gridlines .glgate').length, stored: 'gateOff' in S.prefs, open: K.modesOpen(), state: K.chestState('games') };
      S.store.unlock = {}; S.prefs.allOpen = true; out.dev = K.modesOpen(); S.prefs.allOpen = false; S.save();
      return out; });
    const b = g3.before, a = g3.after;
    // REVERSED at build 40 (v23 L.10, amending G.3): there is no gate - the all-modes condition IS the Games chest
    (g3.m0.open === 1 && g3.m0.total === 13 && !b.gated && b.gate === 0 && !b.open && b.state === 'locked' && b.need === 'unlock every game · 1 of 13' && /Unlock every game first/.test(b.toast) && /1 of 13 modes unlocked/.test(b.toast) && b.screen === 's-pick')
      ? ok(`G.3 REVERSED at build 40 (L.10): with 1 of 13 modes open there is no gate on the connector - the Games chest itself is locked, "${b.need}", and an early tap says "Unlock every game first" with the count underneath and does not send you to the keys`)
      : bad('G.3 / L.10 the locked Games chest', JSON.stringify(b));
    (a.open && a.state === 'ready' && a.ready && a.need === 'tap to open' && a.gate === 0 && !a.stored && g3.dev)
      ? ok('G.3 / L.10 once every mode is open the Games chest is READY - no gate to animate away and no gateOff stored; OPEN EVERYTHING takes the same escape') : bad('G.3 / L.10 the Games chest readies', JSON.stringify({ a, dev: g3.dev }));
  }

  /* ---- G.4: retroactive credit when a chest opens - silent; a live clear still announces ---- */
  {
    await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const g4 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const A = await import('./audio.js'); const U = await import('./config/unlocks.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const x of U.UNLOCKS) S.store.unlock[x.key] = Date.now();
      for (const c of K.COMBOS) S.store.bars[c.key] = Date.now();
      S.store.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 40, misses: 0 }];
      // AMENDED at build 40 (v23 L.10 / L.8b): chest 1 is the KEY chest, behind the Games chest, and it opens on its key screen by itself
      // AMENDED at build 43 (v24 B.2 / B.3): the map's tap opens it; key 1's earn moment is marked seen so it opens straight away
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.prefs.keyWhole = { clear: 1 }; S.save();
      K.fillBars(true);
      // AMENDED at build 41 (v23 L.6): the chest's one sound is Snd.chest (its effects and its sting), never unlockFx, and the banner is its ceremony
      let fx = 0, un = 0; const orig = A.Snd.chest, origU = A.Snd.unlockFx; A.Snd.chest = function () { fx++; return orig.apply(this, arguments); }; A.Snd.unlockFx = function () { un++; return origU.apply(this, arguments); };
      const toasts = []; const mo = new MutationObserver(() => toasts.push(document.getElementById('toast').textContent.trim())); mo.observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true });
      R.show('s-pick'); await wait(600);
      const out = { ready: document.querySelector('.chest[data-chest="key"]').classList.contains('ready') };
      document.querySelector('.chest[data-chest="key"]').click(); await wait(2300);
      out.pro = !!S.store.bars['quick-tap:two:5|pro']; out.author = !!S.store.bars['quick-tap:two:5|author']; out.retro = Object.keys(S.prefs.retro || {}).filter(x => x.includes('|')).sort();
      out.fx = fx; out.un = un; out.toasts = [...new Set(toasts.filter(Boolean))]; mo.disconnect(); A.Snd.chest = orig; A.Snd.unlockFx = origU;
      out.box = document.getElementById('key-cere').hidden ? '' : document.getElementById('key-cere').innerText.replace(/\s+/g, ' ').trim();
      const live = K.checkKey({ g: 'quick-tap', d: 'two', s: 15, hits: 999, misses: 0, t: Date.now(), v: 4 }, false); out.live = live && live.tier;
      R.show('s-key'); await wait(700);
      out.proGreen = document.querySelector('.kkey[data-kt="1"]').classList.contains('newthing');
      document.querySelector('.kkey[data-kt="1"]').click(); await wait(350);
      document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(350);
      out.rows = [...document.querySelectorAll('#key-list .krow.done.newthing')].map(r => r.dataset.kk);
      out.retroAfter = Object.keys(S.prefs.retro || {}).filter(x => x.endsWith('|pro'));
      K.fillBars(false); return out; });
    (g4.ready && g4.pro && !g4.author && g4.retro.join() === 'quick-tap:two:5|pro' && g4.fx === 1 && !g4.un && !g4.toasts.length && g4.box.toLowerCase().includes((CP37.GRID.chest.key + ' opened').toLowerCase()))
      ? ok(`G.4 opening the Skill chest banks the Pro bars a saved best already beats, SILENTLY (Author waits for the Pro chest, build 38) - one chest sound and its ceremony ("${g4.box}"), no toast, no unlock sound for the clears (AMENDED at build 40, L.8b; at build 41, L.6)`)
      : bad('G.4 the retroactive clear is silent', JSON.stringify(g4));
    (g4.live === 'pro' && /if\(adv\) keyBreak\(adv,rest\)/.test(read('ui', 'screens', 'result.js')))
      ? ok('G.4 a LIVE clear still announces - checkKey hands back the fresh Pro clear and the result screen interrupts for it, exactly as before') : bad('G.4 the live clear', JSON.stringify({ live: g4.live }));
    (g4.proGreen && g4.rows.join() === 'quick-tap:two:5' && !g4.retroAfter.length)
      ? ok('G.4 the keys screen already wears L8\'s green on the Pro key and on the rows banked that way, the first time they are seen - and then the mark is spent') : bad('G.4 the green on first sight', JSON.stringify({ proGreen: g4.proGreen, rows: g4.rows, retroAfter: g4.retroAfter }));
  }

  /* ---- D.4: the front percentage counts up when it has gone up since it was last shown ---- */
  {
    (/import \{ countUp \} from "\.\.\/\.\.\/core\/count\.js";/.test(menu37) && /import \{ countUp as baseCountUp \} from "\.\.\/\.\.\/core\/count\.js";/.test(hud37) && !/requestAnimationFrame/.test(strip(menu37)))
      ? ok('D.4 the menu reuses the run\'s count-up - it lives in core/count.js now, hud.countUp wraps it, and the menu has no loop of its own (A4 kept)') : bad('D.4 one count-up');
    const d4 = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const A = await import('./audio.js'); const K = await import('./progress/key.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      /* AMENDED at build 40 (v23 L.8e): ONE last-painted figure - the meter, `prefs.meterSeen` - not one per key. Every mode is open (G.4 left
         them) and so is the Games chest, so 6 of 30 key-1 bars reads 100 + 20 = 120. AMENDED at build 48 (v26 items 7 / 9): the meter is 0–300, so
         the same six read 20, counted up from a last-painted 10 */
      S.store.runs = []; S.store.bars = {}; K.COMBOS.slice(0, 6).forEach(c => { S.store.bars[c.key] = Date.now(); }); S.prefs.played = 1; S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.prefs.meterSeen = 10; S.save();
      const pct = K.meter(); const wh = []; const ow = A.Snd.whoosh; A.Snd.whoosh = function (ms) { wh.push(ms); return ow.apply(this, arguments); };
      R.show('s-pick'); await wait(120); R.show('s-menu');
      const mk = document.getElementById('menu-key'); const first = { txt: mk.textContent, up: mk.classList.contains('up') };
      await wait(1300); const end = { txt: mk.textContent, seen: JSON.parse(localStorage.getItem('ne')).prefs.meterSeen, whoosh: wh.slice() };
      R.show('s-pick'); await wait(120); R.show('s-menu'); const again = { up: mk.classList.contains('up'), txt: mk.textContent };
      S.prefs.meterSeen = 90; S.save(); R.show('s-pick'); await wait(120); R.show('s-menu'); const down = { up: mk.classList.contains('up'), txt: mk.textContent, seen: S.prefs.meterSeen };
      /* AMENDED AT BUILD 53 (v28 item 9): the raw meter still drives the count-up and `prefs.meterSeen` — what the line PRINTS is meterPct(),
         so a raw 10 → 20 reads 3% → 7%. The figures are derived here rather than written out, so the check cannot drift from the config. */
      A.Snd.whoosh = ow; return { pct, first, end, again, down, showFrom: K.meterPct(10), showTo: K.meterPct(pct) }; });
    /* AMENDED AT BUILD 59 (v30 59.11): the figure this fixture reaches is DERIVED, not typed. Six of thirty key-1 bars with every
       mode open used to be 20; the first hundred is now the modes AND the bars in equal steps, so the same store reads 42. What the
       check is for has not changed and is what is asserted: the menu pulses, counts UP from the last figure it painted to the one it
       has now, plays the count-up's own whoosh, and writes what it painted. */
    (d4.pct > 10 && d4.first.txt === d4.showFrom + '% complete' && d4.first.up && d4.end.txt === d4.showTo + '% complete' && d4.end.seen === d4.pct && d4.end.whoosh.includes(900))
      ? ok(`D.4 / L.8e back at the menu with the meter up from 10 to 20 since it was last shown, the figure pulses and counts up with the count-up's own whoosh (${d4.showFrom}% → ${d4.showTo}% on screen, v28 item 9), and the raw 20 is written when it is painted`) : bad('D.4 the count-up', JSON.stringify(d4));
    (!d4.again.up && d4.again.txt === d4.showTo + '% complete' && !d4.down.up && d4.down.txt === d4.showTo + '% complete' && d4.down.seen === d4.pct)
      ? ok('D.4 painting the same figure again plays nothing, and a figure LOWER than the one last seen never counts down') : bad('D.4 once, and never down', JSON.stringify({ again: d4.again, down: d4.down }));
  }
}
