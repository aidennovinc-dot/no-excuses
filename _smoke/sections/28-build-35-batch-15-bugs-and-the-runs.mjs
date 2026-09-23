/* ---- 15. build 35 (batch 15: FEEDBACK-v21 §F.1–§F.5 and §G.7; FEEDBACK-v20 §D.1–§D.3, §D.8–§D.10; #415; the Verdict Desk) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, section, check, ok, bad, root, read, at, browser, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, down, up, poke, openSheet, named } from '../lib/gate.mjs';

export const SECTION = ["build 35 - batch 15, bugs and the runs"];

export async function run() {
  const imp35 = (...p) => import(pathToFileURL(path.join(root, ...p)).href);
  const html35 = read('index.html'), css35 = read('styles', 'app.css'), audio35 = read('audio.js'), hud35 = read('games', '_shared', 'hud.js');
  const vs35 = read('games', '_shared', 'versus.js'), rx35 = read('games', 'reaction', 'index.js'), sp35 = read('games', 'spot', 'index.js');
  const pick35 = read('ui', 'screens', 'pick.js'), prog35 = read('ui', 'screens', 'progress.js') + read('ui', 'screens', 'customise.js'), store35 = read('core', 'store.js'), rules35 = read('progress', 'rules.js'), run35 = read('run', 'run.js');
  const V35 = await imp35('config', 'verdicts.js'), C35 = await imp35('config', 'copy.js'), G35 = await imp35('config', 'games.js'), U35 = await imp35('config', 'unlocks.js'), TH35 = await imp35('config', 'theme.js');
  const NOW35 = Date.now();
  const rgb35 = hex => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); return m ? `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})` : hex; };
  const sameCol = (a, hex) => !!a && (String(a).toLowerCase() === hex.toLowerCase() || String(a).replace(/\s/g, '') === rgb35(hex).replace(/\s/g, ''));

  /* ---- F.2: audio dies on backgrounding. The existing path was three bare resume() calls; the four parts are asserted by
     shape, then driven in the browser: a context that resumes is kept, one that will not is rebuilt and the music re-points,
     and one that never ran is rebuilt by the next tap. Nobody can hear any of it here — the phone is the check. ---- */
  {
    const has = {
      statechange: /addEventListener\('statechange'/.test(audio35),
      revive: /function revive\(why,tap\)/.test(audio35) && /setTimeout\(end,REVIVE_MS\)/.test(audio35),
      rebuild: /function rebuild\(why\)/.test(audio35) && /for\(const f of rebinds\)/.test(audio35),
      // AMENDED at build 36 (v22 §J.1): the state gate these two asserted WAS the bug - iOS reads 'running' on a stopped clock.
      // Foreground now always reaches revive(); the tap reaches it for a context that is not running OR is marked suspect
      foreground: /visibilitychange',\(\)=>\{ if\(!ac\) return; if\(document\.hidden\)\{[^}]*\} revive\('foreground'\)/.test(audio35),
      pageshow: /addEventListener\('pageshow'/.test(audio35),
      tap: /pointerdown',\(\)=>\{ if\(ac&&\(ac\.state!=='running'\|\|ac\._suspect\)\) revive\('tap',true\)/.test(audio35),
      music: /rebinds\.push\(c=>\{ mg=null; sg=\[null,null\]; fg=null;[^}]*next=c\.currentTime/.test(audio35),
      readout: /<section class="screen" id="s-testing"[^>]*data-dev>[\s\S]*id="dev-audio"/.test(html35) };
    Object.values(has).every(Boolean)
      ? ok('F.2 (a) foreground and pageshow, (b) the context\'s own statechange, (c) rebuild and re-point, (d) the next tap - all through one revive(), and Testing reads the context out (S5)')
      : bad('F.2 the four parts', JSON.stringify(has));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, snd: 'space', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const au = await page.evaluate(async () => { const M = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = {}; M.AC(); M.Music.menu('menu'); await wait(400);
      const c0 = M.ac; out.start = { state: c0.state, gen: M.audioState().gen };
      // a context that suspends and CAN resume is resumed, not replaced
      await c0.suspend(); await wait(700);
      out.resumed = { same: M.ac === c0, state: M.ac.state, gen: M.audioState().gen };
      // (c): one that had been running and will not come back is rebuilt - this resume never settles, as iOS's can
      c0.resume = () => new Promise(() => {}); await c0.suspend(); await wait(900);
      out.rebuilt = { changed: M.ac !== c0, old: c0.state, gen: M.audioState().gen, last: M.audioState().last };
      // the music re-points: straight after a rebuild the old bed is dropped and the clock is anchored to the NEW context...
      M.rebuild('gate'); const c2 = M.ac; out.anchor = M.Music.probe();
      // ...and on the loop's next tick the bed is built again, on the live context
      await wait(400); out.bed = M.Music.probe();
      // (d): a context that never ran and will not resume is marked dead, and the next TAP rebuilds it inside the gesture
      c2.resume = () => new Promise(() => {}); c2._ran = 0; await c2.suspend(); c2._ran = 0; await wait(900);
      out.dead = { same: M.ac === c2, dead: !!c2._dead, gen: M.audioState().gen };
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 })); await wait(60);
      out.tap = { changed: M.ac !== c2, gen: M.audioState().gen, last: M.audioState().last };
      M.Music.stop(); return out; });
    (au.resumed.same && au.resumed.state === 'running' && au.resumed.gen === au.start.gen)
      ? ok('F.2 (a)(b) a context that suspends and resumes is resumed and kept - no rebuild for a context that comes back') : bad('F.2 a resumable context is kept', JSON.stringify(au));
    (au.rebuilt.changed && au.rebuilt.old === 'closed' && au.rebuilt.gen === au.start.gen + 1 && /rebuilt/.test(au.rebuilt.last))
      ? ok(`F.2 (c) a context that had run and will not resume inside REVIVE_MS is closed and rebuilt ("${au.rebuilt.last}")`) : bad('F.2 (c) the rebuild', JSON.stringify(au.rebuilt));
    (!au.anchor.bed && Math.abs(au.anchor.next - au.anchor.now - .05) < .1 && au.bed.bed && au.bed.playing)
      ? ok('F.2 (c) the music re-points - the old bed is dropped, the clock re-anchors to the new context, and the next tick builds the bed on it') : bad('F.2 (c) the re-point', JSON.stringify({ anchor: au.anchor, bed: au.bed }));
    (au.dead.same && au.dead.dead && au.tap.changed && au.tap.gen === au.dead.gen + 1 && /rebuilt · tap/.test(au.tap.last))
      ? ok('F.2 (d) a context that never ran is not rebuilt on its own - it is marked dead, and the next tap rebuilds it inside the gesture') : bad('F.2 (d) the tap', JSON.stringify({ dead: au.dead, tap: au.tap }));
    await click('[data-go="s-testing"]'); await sleep(300);
    const ro = await page.evaluate(() => document.getElementById('dev-audio').textContent.trim());
    /^audio · (running|suspended|interrupted|closed|none) · clock .+? · context \d+ · rebuilt · tap/.test(ro)
      ? ok(`F.2 / S5 Testing reads the context out live - "${ro}" - and the fix needs the phone to verify`) : bad('F.2 the Testing readout', ro);
  }

  /* ---- F.1: with nothing selected the sheet is not mounted, and the screen scrolls no further than the map ---- */
  {
    /* DELETED AT BUILD 53 (v28 item 14). This was a SOURCE-TEXT check — it matched `hideSheet`'s body character for character, and item 14's
       bottom sheet added the dim to that line (`const sh=$('#sheet'), dim=$('#mapdim')`). CLAUDE.md -> The gate: when an existing source-text
       check fails on a refactor, DELETE it and name it in the outcome; never adjust it to the new spelling. Nothing is lost — the two driven
       checks below prove the fact it stood for, and prove it harder: a cold load has `display:none` and no rendered sheet at all, and a picked
       game slides it up and Back slides it down and out of the layout again, emptied. The markup's `hidden` attribute is asserted there too. */
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, lastGame: 'hold' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(600);
    const cold = () => page.evaluate(() => { const s = document.getElementById('s-pick'), sh = document.getElementById('sheet'), g = document.getElementById('grid'), h = s.querySelector(':scope > .hint');
      const end = Math.max(g.offsetTop + g.offsetHeight, h ? h.offsetTop + h.offsetHeight : 0);
      return { hidden: sh.hidden, display: getComputedStyle(sh).display, title: document.getElementById('sheet-title').textContent, modes: document.getElementById('diff-row').children.length, scroll: s.scrollHeight, client: s.clientHeight, end, pad: parseFloat(getComputedStyle(s).paddingBottom) || 0, gap: parseFloat(getComputedStyle(s).rowGap) || 0, after: parseFloat(getComputedStyle(s, '::after').height) || 0 }; });
    // AMENDED at build 39 (v23 L.5): after the map comes the stamp's clearance - one flex gap and the --stampclear spacer - and nothing else
    const clamp = c => c.after > 0 && c.scroll <= Math.max(c.client, Math.ceil(c.end + c.gap + c.after + c.pad) + 2);
    const c1 = await cold();
    (c1.hidden && c1.display === 'none' && !c1.title && !c1.modes && clamp(c1))
      ? ok(`F.1 a cold load with Estimate as the last game has no sheet at all - nothing rendered - and the screen scrolls to ${c1.scroll}px against a map ending at ${Math.round(c1.end)}px`)
      : bad('F.1 the cold-load sheet', JSON.stringify(c1));
    await click('.tile[data-game="quick-tap"]'); await sleep(500);
    const open1 = await page.evaluate(() => { const sh = document.getElementById('sheet'); return { hidden: sh.hidden, up: sh.classList.contains('up'), modes: document.getElementById('diff-row').children.length }; });
    await click('#s-pick .back'); await sleep(700);
    const c2 = await cold();
    (open1.up && !open1.hidden && open1.modes === 2 && c2.hidden && !c2.modes && clamp(c2))
      ? ok('F.1 a picked game slides the sheet up; Back slides it down and it leaves the layout again, emptied')
      : bad('F.1 up and away again', JSON.stringify({ open1, c2 }));
  }

  /* ---- F.4: no player colour where customisation lives; previews white until a colour is chosen for that game ---- */
  {
    // AMENDED at build 43 (v24 A.3): `dist` is `npm run native`'s generated copy of the tree (git-ignored) — the same writers twice, not new ones
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' || e.name === '_smoke' || e.name === 'dist' || e.name.startsWith('.')) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
    const files = walk(root);
    const writers = files.flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/prefs\.col\[[^\]]+\]\[[^\]]+\]\s*=(?!=)/g)].map(() => path.relative(root, f).replace(/\\/g, '/')));
    const near = files.filter(f => /prefs\.col[^;\n]*\b(P1C|P2C)\b/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(root, f));
    (writers.length === 2 && writers.every(w => w === 'ui/screens/customise.js' /* AMENDED at build 39: Customise's code is its own file again */) && !near.length)
      ? ok('F.4 investigated: the only two writers of a game colour are Customise\'s swatch tap and its wheel, and no player colour is written near prefs.col anywhere')
      : bad('F.4 who writes prefs.col', JSON.stringify({ writers, near }));
    (/VERSION=7/.test(store35) /* AMENDED at build 40: v5, the named chests (up5); at build 42: v6, the music everywhere (up6); at build 57: v7, the key intros (up7) */ && /if\(\(raw\.v\|\|0\)<4\) raw=up4\(raw\);/.test(store35) && /o\.mig35=p\.mig35/.test(store35) && /'chip-pv'\(b\)\{ F\.g=b\.dataset\.v; pvTry\.set=null;/.test(prog35))
      ? ok('F.4 the store is v4 with up4 on the ladder and mig35 shape-checked, and a previewed swatch is dropped when the game chip changes')
      : bad('F.4 the ladder step and the preview reset');
    const COLS = { 'quick-tap': { sq: '#9BE8FF', lead: '#C8322A', cut: '#9BE8FF' }, dots: { sq: '#C6FF7A', lead: '#C8322A', cut: '#C6FF7A' }, hold: { sq: '#FFFFFF', lead: '#C8322A', cut: '#FFFFFF' } };
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, allOpen: false, col: COLS, chests: { games: 1 } /* AMENDED at build 40 (L.11a): Customise waits for the Games chest */ }, runs: [{ t: NOW35, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }, { t: NOW35 - 1, g: 'dots', d: 'blind', s: 5, n: '', v: 4, hits: 8, misses: 0 }], ach: {}, unlock: { 'dots:blind': NOW35 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(500);
    const f4 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); const t = g => document.querySelector(`.tile[data-game="${g}"]`).style.getPropertyValue('--sq-live').trim().toUpperCase();
      return { v: ne.v, mig: ne.prefs.mig35, sq: [...new Set(Object.values(ne.prefs.col).map(c => c.sq))], qt: t('quick-tap'), dots: t('dots') }; });
    (f4.v === 7 /* AMENDED at build 40: the ladder runs on to v5; at build 42 to v6; at build 57 to v7 */ && f4.mig === 2 && f4.sq.join() === '#FFFFFF' && f4.qt === '#FFFFFF' && f4.dots === '#FFFFFF')
      ? ok('F.4 a v3 record holding light blue on Quick Tap and lime on Dots loads as v4 with every game white again (mig35 2), and both played tiles are white')
      : bad('F.4 the colours go back to white', JSON.stringify(f4));
    await click('#s-pick .back'); await sleep(300); await click('[data-go="s-custom"]'); await sleep(500);
    const tried = await page.evaluate(() => { const b = document.querySelector('#c-sq button.locked'); if (!b) return null; b.click(); return b.dataset.v; });
    await sleep(300);
    const onQt = await page.evaluate(() => document.getElementById('pv').style.getPropertyValue('--sq-live').trim().toUpperCase());
    await click('#pv-g [data-v="dots"]'); await sleep(300);
    const onDots = await page.evaluate(() => ({ sq: document.getElementById('pv').style.getPropertyValue('--sq-live').trim().toUpperCase(), line: document.getElementById('lk-sq').textContent.trim(), pvw: document.querySelectorAll('#c-sq .pvw').length }));
    (tried && onQt === tried.toUpperCase() && onDots.sq === '#FFFFFF' && !onDots.line && !onDots.pvw)
      ? ok(`F.4 a locked swatch tried on Quick Tap (${tried}) stays on Quick Tap - Dots' preview is its own white, with no locked line and no ring carried across`)
      : bad('F.4 the preview follows the game chip', JSON.stringify({ tried, onQt, onDots }));
    await page.evaluate(async () => { const S = await import('./core/store.js'); S.prefs.allOpen = true; S.save(); const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 150)); R.show('s-custom'); await new Promise(r => setTimeout(r, 400)); });
    await click('#pv-g [data-v="quick-tap"]'); await sleep(250); await click('#c-sq button[data-v="#9BE8FF"]'); await sleep(300);
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); }); await sleep(500);
    const chose = await page.evaluate(() => { const t = g => document.querySelector(`.tile[data-game="${g}"]`).style.getPropertyValue('--sq-live').trim().toUpperCase(); return { qt: t('quick-tap'), dots: t('dots'), stored: JSON.parse(localStorage.getItem('ne')).prefs.col['quick-tap'].sq }; });
    (chose.qt === '#9BE8FF' && chose.dots === '#FFFFFF' && String(chose.stored).toUpperCase() === '#9BE8FF')
      ? ok('F.4 a colour chosen for Quick Tap is saved and shows on Quick Tap\'s tile only; Dots stays white')
      : bad('F.4 a saved choice', JSON.stringify(chose));
  }

  /* ---- F.3, F.5, G.7: a Quick Tap versus run ---- */
  {
    (C35.SHEET.goVersus === undefined && /const goLabel=\(\)=>SHEET\.go;/.test(read('ui', 'format.js')))
      ? ok('F.5 SHEET.goVersus is retired and goLabel reads Go for every run') : bad('F.5 the versus Go label, statically');
    (/tapped\(p,i\)\{/.test(vs35) && /this\.tapped\(p,i\); this\.score\(p\);/.test(vs35) && /\.pad\.tapped\{animation:padtap/.test(css35))
      ? ok('F.3 a correct versus pad tap pulses that pad (versus.js tapped(), .pad.tapped)') : bad('F.3 the pad pulse, statically');
    (G35.TICK && G35.TICK.ms === 90 && /const score=t=>\{ const s=\$\('#score'\); if\(driving\) s\.textContent=t; else tick\(s,t\); \};/.test(hud35)
      && /set:v=>drive\(\(\)=>set\(v\)\)/.test(hud35) && /drive\(\(\)=>onFrame\(tot\)\)/.test(hud35)
      && /hud\.tick\(el,this\.n\[p\],p\)/.test(vs35) && /hud\.tick\(\$\$\('\.vz b'\)\[w\?0:1\],this\.vsN\[w\],w\)/.test(rx35) && /hud\.pulse\(\$\('#hud-time \.spvs b\.'/.test(sp35))
      ? ok('G.7 every live score goes through hud.tick - TICK.ms 90 (guess); a running count writes straight through; the three versus scoreboards pass their player')
      : bad('G.7 the tick, statically');
    await openSheet('quick-tap', 0, 0, 2);
    const go = await page.evaluate(() => document.getElementById('go-btn').textContent.trim());
    go === 'Go' ? ok('F.5 the versus Go button reads "Go", not "GO VERSUS"') : bad('F.5 the versus Go button', go);
    await click('#go-btn'); await sleep(1500);
    const litPad = p => page.evaluate(p => { for (let i = 0; i < 4; i++) { const sq = document.getElementById('vsq' + p + i); if (sq && sq.style.getPropertyValue('--v').trim() === '1') return i; } return -1; }, p);
    const readTap = (p, i) => page.evaluate((p, i) => { const pad = document.querySelector(`[data-vs-side="${p}:${i}"]`), n = document.getElementById('vn' + p);
      return { tapped: pad.classList.contains('tapped'), anim: getComputedStyle(pad).animationName, n: n.textContent, ticks: n.getAnimations().map(a => ({ d: a.effect.getTiming().duration, col: (a.effect.getKeyframes().find(k => k.color) || {}).color })) }; }, p, i);
    const i0 = await litPad(0); if (i0 >= 0) await down(`[data-vs-side="0:${i0}"]`); await sleep(25);
    const t0 = i0 >= 0 ? await readTap(0, i0) : null;
    const i1 = await litPad(1); if (i1 >= 0) await down(`[data-vs-side="1:${i1}"]`); await sleep(25);
    const t1 = i1 >= 0 ? await readTap(1, i1) : null;
    (t0 && t1 && t0.tapped && t1.tapped && t0.anim === 'padtap' && t1.anim === 'padtap')
      ? ok('F.3 each player\'s correct tap pulses the pad they hit, bottom half and top half') : bad('F.3 the versus pad pulse', JSON.stringify({ i0, i1, t0, t1 }));
    (t0 && t1 && t0.ticks.length === 1 && t0.ticks[0].d === 90 && sameCol(t0.ticks[0].col, TH35.P1C) && t1.ticks.length === 1 && t1.ticks[0].d === 90 && sameCol(t1.ticks[0].col, TH35.P2C))
      ? ok(`G.7 / L4 each player's count ticks for 90ms in their own colour - Player 1 ${TH35.P1C}, Player 2 ${TH35.P2C}`) : bad('G.7 the versus count in player colours', JSON.stringify({ t0, t1 }));
    const inter = await page.evaluate(async () => { const H = await import('./games/_shared/hud.js'); const el = document.getElementById('vn0'); const base = +el.textContent;
      H.tick(el, base + 5, 0); H.tick(el, base + 6, 0); const n = el.getAnimations().length; await new Promise(r => setTimeout(r, 250)); return { n, txt: el.textContent, want: String(base + 6) }; });
    (inter.n === 1 && inter.txt === inter.want) ? ok('G.7 a tick is interruptible - a second one on the same number cancels the first and lands on the newer value') : bad('G.7 interruptible', JSON.stringify(inter));
    await click('#quit'); await sleep(500);
    const cols = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('ne')).prefs.col).toUpperCase());
    (!cols.includes(TH35.P1C.toUpperCase()) && !cols.includes(TH35.P2C.toUpperCase()))
      ? ok('F.4 / L4 a versus run leaves neither player colour in the customisation store') : bad('F.4 a player colour reached prefs.col', cols);
  }

  /* ---- D.3: (a) the whole-run rate holds until 2.0s, driven; (b) peak counts intervals. G.7 on the solo big count ---- */
  {
    (G35.RATE_RUN_FLOOR === 2 && /if\(el<RATE_RUN_FLOOR\) return; r=t\.length\/el;/.test(hud35))
      ? ok('D.3a (L5 quoted) the whole-run reading holds until RATE_RUN_FLOOR = 2.0s (guess), then averages from run start as before; the live reading is untouched') : bad('D.3a the floor, statically');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, rate: 'run' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(300); await click('.tile[data-game="quick-tap"]'); await sleep(350);
    await page.evaluate(() => document.querySelector('#diff-row .choice[data-diff="two"]').click()); await sleep(450);
    await click('#time-row .tbtn[data-time="15"]'); await sleep(150); await click('#go-btn');
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
    const samples = []; const tS = Date.now();
    while (Date.now() - tS < 3200) { await poke('quick-tap');
      samples.push(await page.evaluate(async () => { const Q = (await import('./games/quick-tap/index.js')).default; return { el: Q.runFrom ? (performance.now() - Q.runFrom) / 1000 : -1, txt: document.querySelector('#rate b').textContent, hits: Q.hits, big: document.getElementById('bigcount').getAnimations().map(a => a.effect.getTiming().duration) }; }));
      await sleep(90); }
    await click('#quit'); await sleep(400);
    const early = samples.filter(x => x.el > .3 && x.el < 1.8 && x.hits > 0), late = samples.filter(x => x.el > 2.3 && x.hits > 0);
    (early.length && early.every(x => x.txt === '0.0/s') && late.length && late.some(x => x.txt !== '0.0/s'))
      ? ok(`D.3a whole-run mode: ${early.length} readings before 2.0s all hold at 0.0/s with taps on the board; after it the average arrives (${late[late.length - 1].txt} at ${late[late.length - 1].el.toFixed(1)}s)`)
      : bad('D.3a the whole-run reading waits for the floor', JSON.stringify({ early: early.slice(0, 4), late: late.slice(-2) }));
    samples.some(x => x.big.includes(90)) ? ok('G.7 the solo big count ticks for 90ms on a hit - the .18s pop it restarted is gone') : bad('G.7 the solo big count', JSON.stringify(samples.slice(0, 3)));
    const pk = await page.evaluate(async () => { const T = await import('./games/_shared/timed.js'); return [T.peakRate([]), T.peakRate([0]), T.peakRate([0, 900]), T.peakRate([0, 100, 200, 300]), T.peakRate([0, 1001]), T.peakRate([0, 500, 1000, 1500, 2000])]; });
    (pk.join() === '0,0,1,3,0,2')
      ? ok('D.3b peak counts the intervals in a trailing second, not the taps - two taps 900ms apart read 1 and four inside 300ms read 3 (were 2 and 4); no RUN_SCHEMA step, because nothing reads a stored peak') : bad('D.3b peakRate', pk.join());
  }

  /* ---- D.1 / D.2: a newly unlocked mode is green until played; selected beats green ---- */
  {
    const P35 = { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, lastGame: 'quick-tap' };
    await setStorage({ ne: { v: 4, prefs: P35, runs: [{ t: NOW35, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }], ach: {}, unlock: { 'quick-tap:four': NOW35 }, intro: SEEN_INTRO, seen: { 'game:quick-tap': 1, 'mode:quick-tap:two': 1 }, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(500);
    const grid1 = await page.evaluate(() => ({ qt: document.querySelector('.tile[data-game="quick-tap"]').classList.contains('newplay'), dots: document.querySelector('.tile[data-game="dots"]').classList.contains('newplay') }));
    await click('.tile[data-game="quick-tap"]'); await sleep(500);
    const row = await page.evaluate(() => { const c = s => document.querySelector(`#diff-row .choice[data-diff="${s}"]`); const tile = document.querySelector('.tile[data-game="quick-tap"] .pic');
      return { four: c('four').className, two: c('two').className, fourB: getComputedStyle(c('four')).borderTopColor, tileB: getComputedStyle(tile).borderTopColor, seen: (JSON.parse(localStorage.getItem('ne')).seen || {})['mode:quick-tap:four'] }; });
    (grid1.qt && !grid1.dots && /newplay/.test(row.four) && !/newplay/.test(row.two) && sameCol(row.fourB, '#3DD68C') && row.seen === 1)
      ? ok('D.1 Quick Tap · Four, unlocked and never played, is green on its tile and on its row; Two is not; markSeen still records it on sight (kept for D.5)')
      : bad('D.1 green until played', JSON.stringify({ grid1, row }));
    // AMENDED at build 37 (v22 §K): with the mode sheet up the pressed tile demotes - its border is the line colour, never green and never amber
    sameCol(row.tileB, TH35.PRESS.v) ? ok(`D.2 / §K the pressed tile wears its amber and no green under it until a mode is chosen (AMENDED again at build 38) (${row.tileB})`) : bad('D.2 the pressed tile over green', row.tileB);
    await page.evaluate(() => document.querySelector('#diff-row .choice[data-diff="four"]').click()); await sleep(600);
    const picked = await page.evaluate(() => { const b = document.querySelector('#diff-row .choice[data-diff="four"]'); return { cls: b.className, border: getComputedStyle(b).borderTopColor }; });
    (/\bsel\b/.test(picked.cls) && /newplay/.test(picked.cls) && /newthing/.test(picked.cls) && sameCol(picked.border, TH35.PRESS.v))   // AMENDED at build 37 (§K): the selected line is --press
      ? ok('D.2 a selected mode wears the selected line even while it is first-seen AND unplayed - the rule lost, not the class order') : bad('D.2 selection beats green', JSON.stringify(picked));
    /\.choice\.sel\.newthing,\.choice\.sel\.newplay\{border-color:var\(--press\)!important\}/.test(css35) ? ok('D.2 the stylesheet rule that does it, against .newthing\'s !important') : bad('D.2 the CSS rule');
    const after = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      S.store.runs.unshift({ t: Date.now(), g: 'quick-tap', d: 'four', s: 5, n: '', v: 4, hits: 9, misses: 0 }); S.save();
      R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-pick'); await new Promise(r => setTimeout(r, 400));
      const tile = document.querySelector('.tile[data-game="quick-tap"]').classList.contains('newplay'); document.querySelector('.tile[data-game="quick-tap"]').click(); await new Promise(r => setTimeout(r, 400));
      return { tile, four: document.querySelector('#diff-row .choice[data-diff="four"]').className }; });
    (!after.tile && !/newplay/.test(after.four)) ? ok('D.1 one recorded run of Four and the green is gone from tile and row - read off the run store') : bad('D.1 played clears it', JSON.stringify(after));
  }

  /* ---- D.8: Try to unlock lands on the highest open mode and length when `where` names none, never on a locked one ---- */
  {
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const d8 = await page.evaluate(async () => { const RUN = await import('./run/run.js'); const P = await import('./progress.js'); const S = await import('./core/store.js'); const G = await import('./games/registry.js');
      const probe = () => P.UNLOCKS.map(u => { const w = RUN.whereOf(u.where), G_ = G.GAMES[w.g], lens = P.lensOf(w.g, w.d);
        return { key: u.key, nd: !u.where.d, ns: u.where.s === undefined, wd: u.where.d, ws: u.where.s, d: w.d, s: w.s,
          topMode: G_.modes.filter(m => P.isOpen(w.g, m)).pop(), top: lens.filter(x => P.lenOpen(w.g, w.d, x)).pop(),
          open: P.isOpen(w.g, w.d) && P.lenOpen(w.g, w.d, w.s), any: G_.modes.some(m => P.isOpen(w.g, m)) }; });
      S.prefs.allOpen = true; const all = probe();
      S.prefs.allOpen = false; const fresh = probe();
      return { all, fresh }; });
    const wrong = d8.all.filter(r => !r.open || (r.nd ? r.d !== r.topMode : r.d !== r.wd) || (r.ns ? r.s !== r.top : r.s !== r.ws));
    const locked = d8.fresh.filter(r => r.any && !r.open);
    const moved = d8.all.filter(r => r.nd || r.ns).map(r => `${r.key}→${r.d}:${r.s}`);
    (!wrong.length && !locked.length)
      ? ok(`D.8 every UNLOCKS row lands open; with everything open the ${moved.length} rows naming no mode or length land on the highest - ${moved.join(' · ')} - and on a fresh profile none lands on a locked one`)
      : bad('D.8 where Try to unlock lands', JSON.stringify({ wrong, locked }));
    (/sel\.secs=at\.s;/.test(run35) && !/lens\.find\(s=>lenOpen/.test(run35)) ? ok('D.8 goWhere takes its destination from whereOf, and nothing picks the shortest open length any more') : bad('D.8 goWhere uses whereOf');
  }

  /* ---- D.9, D.10, #415 and the Verdict Desk data edit ---- */
  {
    const T35 = V35.VERDICTS;
    // RESTATED at build 60 (v31 60.4): Estimate · Grow's triple is Aiden's own again — .875/.75 became .825/.70 when he made Grow looser on 2026-09-23. Cut did not move.
    const AT = { 'quick-tap': [.4833, .3667, .25], dots: [.5556, .4444, .3111], hold: [.825, .7, .25], 'hold:cut': [.8875, .8, .625], sequence: [.6875, .5, .3125] };
    const atBad = Object.entries(AT).filter(([k, v]) => !T35[k] || T35[k].at.join() !== v.join()).map(([k]) => k);
    const names = V35.VERDICT_TIERS.map(t => t.name).join('|');
    (names === 'Amazing!|Great!|Good.|Meh.' && !atBad.length)
      ? ok('Verdict Desk: the tiers are Amazing! / Great! / Good. / Meh., and Aiden\'s thresholds are in for Quick Tap, Dots, Estimate Grow and Cut, and Sequence') : bad('Verdict Desk tier names and at', JSON.stringify({ names, atBad }));
    const LINES = {
      'quick-tap': { bad: ['Warming up, try again!', 'A few mistakes?', "Alright let's go again.", 'Could be quicker...', 'Do you need a coffee?'],
        ok: ['Good work!', 'Steady pace!', 'Keep pushing!', 'Decent speed.', 'Halfway to quick.'],
        good: ['Great job!', 'Proper fast.', 'Solid run!', "You're switched on today.", 'Well done!'],
        ace: ['Look at you go!', "You're flying!", "You're a Quick Tap master!", 'Do those thumbs come with a warning?', 'Quick.  Damn quick.'] },
      dots: { bad: ['Maybe try fingers instead of thumbs?', 'The dots might be winning...', 'Have another crack.', 'Can we pick up the speed?', 'You need to be one with the dots'],
        ok: ['You own the dots.', 'Decent speed, can you go faster?', "In the 20's!", "That's worthy of the first key.", 'Solid, but could you improve?'],
        good: ['Quick work!', 'Great job!', 'That was some serious speed.', 'Very good run!', 'Be one with the dots.'],
        ace: ['Are you cheating?', 'Quickest hands in the West.', 'That will be hard to top.', 'You are the Dots master!', 'Wow, what a run!'] },
      hold: { bad: ['Nowhere near. Feel the rate, not the shape.', 'Make sure you match the total area', 'A bit off but not the worst', 'Were you just guessing or...', 'Back to the drawing board.'],
        ok: ['Decent estimation skills!', 'In the ball park for sure.', 'Not a bad run at all.', 'Reasonable, but could you do better?', "You're getting there!"],
        good: ['Good eye.', 'Tight. Nearly there!', 'You were on the ball for that one!', 'Close to being an amazing run!', 'One step off machine.'],
        ace: ['Machine-adjacent.', 'That was not a normal run.', 'Dead on, round after round.', 'Nothing to correct, perfection.', 'Your estimation skills are unmatched!'] },
      'hold:cut': { bad: ["I wouldn't let you cut my birthday cake...", 'Hmmmm, maybe we work on this one.', 'Give me back that knife please.', 'Do you understand the game or...?', 'Measure twice, cut once'],
        ok: ['Getting there, solid run!', 'Close enough, good enough.', 'Good run, could we improve?', 'Taking your time, nice to see!', 'You know your percentages!'],
        good: ["You've got the eye!", 'Clean cutting.', 'Certified birthday cake cutter!', 'See the cut, be the cut.', 'Sliced and diced!'],
        ace: ['Surgical!', 'Wow, excellent cutting!', 'Are you a doctor?', "Surely there's cheating involved...", "You're a pro!"] } };
    const lineBad = [];
    // AMENDED at build 36: the 09-13 lines are superseded by the export (v658) - Quick Tap ok/4, four Grow lines and every Sequence line moved - so this holds Dots and Cut, which the export did not touch; the build 36 block asserts every line
    for (const [k, tiers] of Object.entries(LINES).filter(([k]) => k === 'dots' || k === 'hold:cut')) for (const [t, want] of Object.entries(tiers)) if ((T35[k].lines[t] || []).join('|') !== want.join('|')) lineBad.push(k + ':' + t);
    const halfTyped = Object.values(T35).flatMap(r => Object.values(r.lines).flat()).filter(l => /^Almost a\s*$/.test(l));
    (!lineBad.length && !halfTyped.length && T35.sequence.lines.ace[0] === 'Photographic!')
      ? ok('Verdict Desk (AMENDED at build 36): Dots and Cut are as the 09-13 file had them, no bare "Almost a" remains, and Sequence carries the export\'s lines') : bad('Verdict Desk lines', JSON.stringify({ lineBad, halfTyped }));
    const INTRO = { 'quick-tap:two': 'Tap the box when it lights up.', 'quick-tap:four': 'Four buttons this time!', 'dots:blind': 'Tap as many dots as you can.', 'dots:lead': 'Tap the dot.  The outline leads the way.',
      'hold:grow': 'Grow your shape to match the area.', 'hold:cut': 'Cut the shape to the target %.', 'sequence:solo': 'Copy the notes.  How far can you get?', 'timing:stopwatch': 'Stop the watch at the target time.',
      'timing:hidden': 'Tap the ball when it reaches the outline.', 'reaction:flash': 'Test your reaction time.', 'reaction:nogo': 'Tap only when you see your shape.', 'spot:count': 'Count how many of your shape appears.', 'spot:find': 'Quickly find and tap your shape.' };
    const introBad = Object.entries(INTRO).filter(([k, v]) => !C35.INTRO[k] || C35.INTRO[k].length !== 1 || C35.INTRO[k][0] !== v).map(([k]) => k);
    (!introBad.length && Object.keys(C35.INTRO).length === 13) ? ok('Verdict Desk: the twelve intro lines are Aiden\'s, and Quick Tap · Two keeps its own') : bad('Verdict Desk intro lines', introBad.join(', '));
    const split = ['timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo'];
    const same = (a, b) => JSON.stringify(T35[a]) === JSON.stringify(T35[b]);
    // RESTATED at build 60 (v31 60.9): Hidden's Set triple is 0.8704 / 0.8148 / 0.7222 — the Author, Pro and Skill key bars (700 / 1,000 / 1,500ms over ten rounds), so a Set "Meh." can no longer be stricter than the Skill bar. Stopwatch did not move.
    (split.every(k => T35[k]) && T35['timing:stopwatch'].at.join() === '0.9,0.74,0.56' && T35['timing:hidden'].at.join() === '0.8704,0.8148,0.7222' && !T35.timing && !T35.reaction && !same('reaction:flash', 'reaction:nogo'))
      ? ok('D.10 Timing and Reaction are keyed per mode - four rows, no parent left, and Timing\'s numbers are Aiden\'s (AMENDED at build 37, #414 closed) - AMENDED at build 36: the export wrote the rows apart, so they are no longer seeded copies') : bad('D.10 the split', JSON.stringify(Object.keys(T35)));
    !/r\.d==='four'\?5/.test(rules35) ? ok('D.9 QUALITY[\'quick-tap\'] no longer divides Four by 5') : bad('D.9 the Four divisor is still there');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const q = await page.evaluate(async () => { const R = await import('./progress/rules.js'); const P = await import('./progress.js');
      const tier = r => (P.tierOf(Object.assign({ misses: 0, t: 1, v: 4 }, r)) || {}).tier;
      return { q2: R.QUALITY['quick-tap']({ d: 'two', s: 5, hits: 15 }), q4: R.QUALITY['quick-tap']({ d: 'four', s: 5, hits: 15 }),
        hold: [R.QUALITY.hold({ hits: 10 }), R.QUALITY.hold({ hits: 30 })],
        blind: [R.LEN_TEST['dots:blind'][2]({ hits: 22 }), R.LEN_TEST['dots:blind'][2]({ hits: 21 })], lead: [R.LEN_TEST['dots:lead'][2]({ hits: 28 }), R.LEN_TEST['dots:lead'][2]({ hits: 27 })],
        need: P.lenNeed('dots', 'blind', 30),
        keys: [P.verdictKey('timing', 'stopwatch'), P.verdictKey('timing', 'hidden'), P.verdictKey('reaction', 'flash'), P.verdictKey('reaction', 'nogo')],
        qt: [tier({ g: 'quick-tap', d: 'four', s: 10, hits: 29 }), tier({ g: 'quick-tap', d: 'two', s: 10, hits: 28 })],
        grow: [tier({ g: 'hold', d: 'grow', s: 7, hits: 5 }), tier({ g: 'hold', d: 'grow', s: 7, hits: 30 }), tier({ g: 'hold', d: 'grow', s: 7, hits: 31 })],
        seq: [tier({ g: 'sequence', d: 'solo', s: 7, hits: 11 }), tier({ g: 'sequence', d: 'solo', s: 7, hits: 10 })],
        tm: tier({ g: 'timing', d: 'hidden', s: 10, hits: 500 }), rx: tier({ g: 'reaction', d: 'nogo', s: 5, hits: 250 }) }; });
    (q.q2 === q.q4 && Math.abs(q.q2 - .5) < 1e-9) ? ok('D.9 Quick Tap Two and Four share one curve - 3/s reads 0.5 in both (Four was ÷5)') : bad('D.9 one curve', JSON.stringify([q.q2, q.q4]));
    (q.hold[0] === .75 && q.hold[1] === .25) ? ok('Verdict Desk: Estimate\'s QUALITY scale is 40% off - 10% reads 0.75, 30% reads 0.25') : bad('Verdict Desk Estimate scale 40', JSON.stringify(q.hold));
    (q.qt.join() === 'ace,good' && q.grow.join() === 'ace,ok,bad' && q.seq.join() === 'ace,good')
      ? ok('Verdict Desk played back through the tier: Quick Tap 2.90/s is Amazing! and 2.80 is not; Grow 5% off is Amazing!, 30% Good., 31% Meh.; Sequence 11 notes is Amazing!') : bad('the thresholds, played back', JSON.stringify({ qt: q.qt, grow: q.grow, seq: q.seq }));
    (q.blind.join() === 'true,false' && q.lead.join() === 'true,false' && /22 hits/.test(q.need) && /22 hits/.test(U35.LEN_RULES['dots:blind'][2]))
      ? ok(`#415 (L6) Dots · Blind Marathon opens at 22 in a Blind Dash and 21 does not - "${q.need}"; Lead keeps 28`) : bad('#415 the Blind Marathon rung', JSON.stringify({ blind: q.blind, lead: q.lead, need: q.need }));
    (q.keys.join() === 'timing:stopwatch,timing:hidden,reaction:flash,reaction:nogo' && q.tm && q.rx) ? ok('D.10 verdictKey resolves all four new keys and a run in each still wears a tier') : bad('D.10 the lookups', JSON.stringify(q));
  }
}
