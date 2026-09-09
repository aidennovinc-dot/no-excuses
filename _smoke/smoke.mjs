/* No Excuses — the gate (A7). Run before every push:  npm test
 *
 * Spawns its own static server (no Python), launches the Chrome at CHROME_PATH (Windows default as the fallback)
 * at 390x844, and fails on any uncaught error or failed assertion. What it covers, build 18:
 *   0. static: the build number in config/build.js is the one in index.html (x3) and version.json (A6); config/ is data only (A2);
 *      every engine imports only from games/_shared/, core/, config/ and core.js — never sel, the store, audio, the run or another engine (A3);
 *      no screen imports another screen or an engine, and the run imports no screen (A4)
 *   1. cold start: the title sequence -> the menu, and the locked decisions that can be asserted on a fresh profile
 *        L1 title sequence before the menu · v14 1.2 NO EXCUSES is the SAME node in the same place before and after the menu builds
 *        L2 Sprint / Dash / Marathon · L3 Solo shows nothing about friends
 *        L7 Quick Tap tile is white before any run · L9 the length row is labelled Mode
 *   2. every pick sheet opens (everything unlocked), and every Set / Streak line on every sheet comes from SET_COPY (L5, v14 section 5)
 *   3. one Set run and one Streak run per game, driven to the result screen the way that engine is played
 *   4. a pass & play Quick Tap (both players, the hand-over screen between)
 *   4b. two-player, v15 section 4 (build 25): Estimate, Timing and Reaction pass & play alternate INSIDE one run and never
 *       reach the hand-over screen; Sequence versus keeps its key row and gains an opening length; Spot · Find has a versus
 *       at all; every one of them ends on a pair with no board, and writes nothing to the store (L10, widened by A.3)
 *   5. boot on five storage fixtures: empty · build-13 layout (migrates to the one key `ne` v1 with runs, unlocks, achievements and name intact,
 *      the seven old keys removed) · corrupt build-13 keys · a corrupt `ne` v1 (every bad field falls back on its own) · 650 runs (capped at 600)
 *   6. challenge links: a hostile ?score= lands as text (S1); a bad ?s= is no challenge (S2); a run only the link opened is never on a board (S2)
 *   6b. the side screens (v14 section 8): a first-seen Customise swatch still shows its colour (8.7), the achievements list has no
 *       sideways axis (8.2), the title leads with the game name (8.3), a secret row is described (8.5), and Testing is its own
 *       screen with About left clean (8.10). Plus the two Reaction Streak thresholds L5 names (v14 C.1 / C.2 / C.3 / C.4)
 *   6c. the key (v14 section 9, build 22): the contributor list comes from GAMES + SET_COPY and not from a literal, every
 *       combination has a clearance bar and every bar has a combination, each bar's direction agrees with the game's own
 *       scoring, a bar clears ONCE (9.3) and only from a solo run (9.4)
 *   7. every button action (data-act) driven at least once — customise, chips, dev switches, lock box, Next card, full stop, share
 * Pass a base URL as argv[2] to test a server you are already running instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from './server.mjs';
import { launch, phonePage, IGNORED_REQUEST } from './chrome.mjs';

const own = !process.argv[2];
const srv = own ? await serve() : null;
const BASE = process.argv[2] || srv.base;
{ const r = await fetch(BASE + '/index.html').catch(() => null); if (!r || !r.ok) { console.error(`No page at ${BASE}/index.html (${r ? r.status : 'no answer'})`); process.exit(2); } console.log('serving ' + BASE); }

const GAMES = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
const errors = [];
const fail = [];
const ok = (label) => console.log('  ok   ' + label);
const bad = (label, why) => { fail.push(label + (why ? ' — ' + why : '')); console.log('  FAIL ' + label + (why ? ' — ' + why : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- 0. static: one build number (A6), config/ is data only (A2) ----
console.log('\nstatic checks');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { BUILD } = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); const vj = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  const places = [html.match(/<div class="hint">build (\d+) ·/)?.[1], html.match(/<div id="build">build (\d+)<\/div>/)?.[1], html.match(/const BUILD="(\d+)";/)?.[1], String(vj.build)];
  places.every(p => p === String(BUILD)) ? ok(`A6 build ${BUILD} in config/build.js = index.html ×3 = version.json`) : bad('A6 one build number', JSON.stringify(places) + ' vs config ' + BUILD);
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const cfg = fs.readdirSync(path.join(root, 'config')).filter(f => f.endsWith('.js'));
  const dirty = cfg.filter(f => /\bimport\b|=>|\bfunction\b/.test(strip(fs.readFileSync(path.join(root, 'config', f), 'utf8'))));
  dirty.length ? bad('A2 config/ is data only', dirty.join(', ')) : ok(`A2 config/ is data only (${cfg.length} files: no imports, no functions)`);
  // build 17 (A3): an engine's imports name only _shared, core, config or core.js. sel, prefs, audio, the run and the other engines reach it through ctx, or not at all
  const engines = fs.readdirSync(path.join(root, 'games'), { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => `games/${d.name}/index.js`).concat(fs.readdirSync(path.join(root, 'games', '_shared')).map(f => `games/_shared/${f}`));
  const stray = [];
  for (const f of engines) { const shared = f.startsWith('games/_shared/'); const src = strip(fs.readFileSync(path.join(root, f), 'utf8')); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { const p = m[1]; const okPath = shared ? /^(\.\/[\w.-]+\.js$|\.\.\/\.\.\/(core\/|config\/|core\.js$))/.test(p) : /^\.\.\/(_shared\/|\.\.\/(core\/|config\/|core\.js$))/.test(p); if (!okPath) stray.push(`${f} → ${p}`); } }
  stray.length ? bad('A3 engines import only _shared / core / config', stray.join(', ')) : ok(`A3 engines import only _shared / core / config (${engines.length} files)`);
  // v14 C.1 / C.2 / C.3 (L5, build 22): Flash spends what is over 150ms of 500; a Go / No-go Streak spends what is over 150ms
  // of 1000 and 200ms a wrong tap, while its SET still ADDS 150ms a wrong tap. Two currencies — the gate holds them apart so
  // nobody harmonises them. C.4: the Streak has no wrong-tap run-ender, so the `wrong>=3` test must stay inside a !streak() branch
  { const rx = fs.readFileSync(path.join(root, 'games', 'reaction', 'index.js'), 'utf8');
    const num = k => { const m = rx.match(new RegExp(k + ':\\s*(\\d+)')); return m ? +m[1] : null; };
    const want = { FLASH_FREE: 150, FLASH_BUD: 500, NOGO_FREE: 150, NOGO_BUD: 1000, NOGO_WRONG_SET: 150, NOGO_WRONG_STREAK: 200 };
    const got = Object.fromEntries(Object.keys(want).map(k => [k, num(k)]));
    const wrong = Object.keys(want).filter(k => got[k] !== want[k]);
    wrong.length ? bad('L5 the Reaction budgets', wrong.map(k => `${k}=${got[k]} want ${want[k]}`).join(', ')) : ok('L5 Flash 500/150, Go / No-go 1000/150, wrong tap 200 in a Streak and 150 in a Set (v14 C.1–C.3)');
    /(this\.NOGO_WRONG_SET|NOGO_WRONG_STREAK)/.test(rx) && !/this\.NOGO_WRONG\b/.test(rx) ? ok('B.3 no bare NOGO_WRONG left to blur the two currencies') : bad('B.3 the two wrong-tap costs are separate constants');
    // C.4: three wrong taps ends a SET and nothing else. Any `wrong >= 3` not guarded by !this.streak() has restored the retired contract
    const enders = [...rx.matchAll(/[^\n]*wrong\s*>=\s*3[^\n]*/g)].map(m => m[0].trim());
    enders.every(l => /!this\.streak\(\)/.test(l)) ? ok(`C.4 the three-wrong-taps ending is Set-only (${enders.length} test${enders.length === 1 ? '' : 's'}, all behind !streak())`) : bad('C.4 the three-wrong-taps run-ender is retired for a Streak', enders.join(' | ')); }
  // build 18 (A4): a screen never imports another screen or an engine; the run never imports a screen. They talk through core/events.js
  const screens = fs.readdirSync(path.join(root, 'ui', 'screens')).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => `ui/screens/${f}`);
  const cross = [];
  for (const f of screens) { const src = strip(fs.readFileSync(path.join(root, f), 'utf8')); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { if (/^\.\/|\/games\/(?!registry)/.test(m[1])) cross.push(`${f} → ${m[1]}`); } }
  { const src = strip(fs.readFileSync(path.join(root, 'run', 'run.js'), 'utf8')); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) if (/screens\//.test(m[1])) cross.push(`run/run.js → ${m[1]}`); }
  cross.length ? bad('A4 screens and the run talk by events, not imports', cross.join(', ')) : ok(`A4 no screen imports a screen or an engine, the run imports no screen (${screens.length} screens)`);
}

const browser = await launch();
const page = await phonePage(browser);
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !IGNORED_REQUEST(m.text())) errors.push('console: ' + m.text()); });
page.on('requestfailed', r => { const u = r.url(); if (!IGNORED_REQUEST(u)) errors.push('requestfailed: ' + u + ' ' + (r.failure()?.errorText || '')); });
page.on('dialog', async d => { errors.push('dialog opened: ' + d.message()); await d.dismiss(); });

const onScreen = () => page.$eval('.screen.on', s => s.id).catch(() => null);
const inGame = () => page.$eval('#game', g => g.classList.contains('on')).catch(() => false);
const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const setStorage = obj => page.evaluate(o => { localStorage.clear(); for (const k in o) localStorage.setItem(k, typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])); }, obj);
const getJSON = k => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return 'unparseable'; } }, k);
const OPEN_PREFS = { allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} };

// pointer events the way the engines listen for them: pointerdown/up/move on an element, at a fraction of its box
const ptr = (type, sel, dx = .5, dy = .5) => page.evaluate((type, s, dx, dy) => {
  const t = document.querySelector(s); if (!t) return false; const r = t.getBoundingClientRect();
  t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + r.width * dx, clientY: r.top + r.height * dy, pointerId: 1 })); return true;
}, type, sel, dx, dy);
const down = (sel, dx, dy) => ptr('pointerdown', sel, dx, dy);
const up = (sel, dx, dy) => ptr('pointerup', sel, dx, dy);

// v14 (6.3): a round's result stays up until it is tapped, so nothing advances until the tap lands. #game.tapon is the cue,
// and the tap goes to the layer that game's engine listens on. It runs even in the no-tap drive (Reaction's Streak, which ends
// by never tapping the flash) — the held card is not the flash, and without this the run would sit there forever
const heldSeen = new Set();
async function clearHeld(g) {
  if (!(await page.evaluate(() => document.getElementById('game').classList.contains('tapon')))) return false;
  heldSeen.add(g); await down(g === 'hold' ? '#hfield' : '#gen'); return true;
}
async function poke(g) {
  if (g === 'quick-tap') { const i = await page.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') return i; return -1; }); if (i >= 0) await down(`.pad[data-side="${i}"]`); return; }
  if (g === 'dots') { await page.evaluate(() => { const d = document.getElementById('dot'), f = document.getElementById('field'); if (!d.classList.contains('on')) return; const r = d.getBoundingClientRect(); f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); }); return; }
  if (g === 'hold') { const wait = await page.evaluate(() => document.getElementById('hbg').classList.contains('on')); if (wait) { await down('#hfield'); await sleep(360); await up('#hfield'); } return; }
  if (g === 'sequence') { const input = await page.evaluate(() => document.getElementById('seq').classList.contains('input')); if (input) await down('.key[data-k="0"]'); return; }
  if (g === 'timing') { const run = await page.evaluate(() => !!document.querySelector('#tmclock, #tmball')); if (run) await down('#gen'); return; }
  if (g === 'reaction') { const lit = await page.evaluate(() => !!document.querySelector('#rxpane.lit')); if (lit) await down('#gen'); return; }  // Flash: tap only on the flash. A Streak that never taps also ends (no tap = 600ms)
  if (g === 'spot') { await page.evaluate(n => { const b = document.querySelector(`#gen [data-num="${n}"]`); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0, pointerId: 1 })); }, 14); return; }
}
// the ad break (every fourth result) has a 2s skip; press it when it is live
const skipAd = () => page.evaluate(() => { const a = document.getElementById('adbreak'), b = document.getElementById('adskip'); if (a.classList.contains('on') && !b.disabled) { b.click(); return true; } return false; });

let askedLine = '';
async function driveToResult(g, label, ms = 90000, noTap = false) {
  askedLine = '';
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const at = await onScreen(); if (at === 's-over' || at === 's-pass') break;
    if (await skipAd()) continue;
    if (at === null || (await inGame())) { if (!(await clearHeld(g)) && !noTap) await poke(g); }
    // v14 (6.18): the last thing Stopwatch said it had asked for, kept so the total can be checked against the stated average
    if (g === 'timing') { const t = await page.evaluate(() => document.getElementById('tmasked')?.textContent.trim() || ''); if (t) askedLine = t; }
    await sleep(45);
  }
  const at = await onScreen();
  if (at !== 's-over' && at !== 's-pass') { bad(label, 'still on ' + (at || 'the game') + ' after ' + ms / 1000 + 's'); return null; }
  if (at === 's-over') await keySettle();
  return at;
}
/* v15 (5.1, build 26): a run that clears a clearance bar for the FIRST time takes the screen — the result fades and
   stops taking taps, the key plays the segment, and it hands itself back. Both happen inside the same callback that
   shows the result, so the fade is already on by the time a poll can see 's-over'. Every test that starts poking the
   result screen has to wait that out first, or it is poking a screen that is deliberately not listening. */
async function keySettle() {
  for (let i = 0; i < 50; i++) {
    const busy = await page.evaluate(() => document.getElementById('s-over').classList.contains('fadeout') || (document.querySelector('.screen.on') || {}).id === 's-key');
    if (!busy) return i > 0;
    await sleep(200);
  }
  return true;
}
async function resultLine() {
  return page.evaluate(() => ({ score: document.querySelector('#over-score').textContent.trim(), verdict: document.querySelector('#verdict').textContent.trim(), stats: document.querySelector('#over-stats').textContent.trim().slice(0, 50), rank: document.querySelector('#over-rank').textContent.trim() }));
}
// fresh page with everything open, at the pick sheet of game g, mode index mi, length index li (or the Streak length when li === 'streak')
async function openSheet(g, mi, li, vs = 0) {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': OPEN_PREFS });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(320);
  await click('[data-go="s-pick"]'); await sleep(260);
  await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(260);
  if (vs) { await click('[data-vs="1"]'); await sleep(200); await click(`[data-vs2="${vs}"]`); await sleep(200); }
  await page.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); (c[mi] || c[0]).click(); }, mi); await sleep(420);
  const face = await page.evaluate(li => { const t = [...document.querySelectorAll('#time-row .tbtn')]; const b = li === 'streak' ? t.find(x => x.dataset.time === '-1') : t[li]; if (!b) return null; b.click(); return b.querySelector('b').textContent.trim(); }, li); await sleep(160);
  return face;
}

// ---- 1. cold start: intro plays, then the menu ----
console.log('\ncold start (empty storage)');
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(400);
let at = await onScreen();
const storyOn = () => page.evaluate(() => !!document.querySelector('#s-menu.story'));
const sawStory = at === 's-menu' && (await storyOn());
sawStory ? ok('the title sequence shows') : bad('the title sequence shows', 'on ' + at);
// v14 (1.2): mark the title node and the box it sits in, so the same node in the same place can be proved after the menu builds
const titleBefore = await page.evaluate(() => { const w = document.getElementById('wordmark'); if (!w) return null; w.dataset.probe = 'ne'; const r = document.querySelector('.titlewrap').getBoundingClientRect(); return { n: document.querySelectorAll('#s-menu .wordmark').length, x: Math.round(r.left), y: Math.round(r.top), t: w.textContent }; });
for (let i = 0; i < 8 && (await storyOn()); i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
await sleep(600);
at = await onScreen();
at === 's-menu' ? ok('the title sequence leads to the menu') : bad('the title sequence leads to the menu', 'on ' + at);
const titleAfter = await page.evaluate(() => { const w = document.getElementById('wordmark'); if (!w) return null; const r = document.querySelector('.titlewrap').getBoundingClientRect(); return { probe: w.dataset.probe === 'ne', n: document.querySelectorAll('#s-menu .wordmark').length, x: Math.round(r.left), y: Math.round(r.top), t: w.textContent }; });
(titleBefore && titleAfter && titleAfter.probe && titleBefore.n === 1 && titleAfter.n === 1 && titleAfter.x === titleBefore.x && titleAfter.y === titleBefore.y && titleAfter.t === titleBefore.t)
  ? ok('1.2 NO EXCUSES is the same node, in the same place, before and after the menu builds')
  : bad('1.2 NO EXCUSES never moves or re-renders between the title and the menu', JSON.stringify({ titleBefore, titleAfter }));

// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
console.log('\nlocked decisions (fresh profile)');
sawStory ? ok('L1 title sequence plays before the menu') : bad('L1 title sequence plays before the menu');
await click('[data-go="s-pick"]'); await sleep(400);
const tileCol = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="quick-tap"]'); return { sq: t.style.getPropertyValue('--sq-live').trim(), unplayed: t.classList.contains('unplayed') }; });
(tileCol.unplayed && tileCol.sq.toUpperCase() === '#FFFFFF') ? ok('L7 Quick Tap tile is white before any run') : bad('L7 Quick Tap tile is white before any run', JSON.stringify(tileCol));
await click('.tile[data-game="quick-tap"]'); await sleep(320);
const soloSub = await page.evaluate(() => { const sub = document.querySelector('#vs-sub'); return { hidden: sub.hasAttribute('hidden'), shown: getComputedStyle(sub).display !== 'none' }; });
(soloSub.hidden && !soloSub.shown) ? ok('L3 Solo shows no Pass & play / Versus') : bad('L3 Solo shows no Pass & play / Versus', JSON.stringify(soloSub));
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(420);
const lens = await page.evaluate(() => [...document.querySelectorAll('#time-row .tbtn b')].map(b => b.childNodes[0].textContent.trim()));
(lens.length === 3 && lens[0] === 'Sprint' && lens[1] === 'Dash' && lens[2] === 'Marathon') ? ok('L2 Quick Tap lengths are Sprint / Dash / Marathon') : bad('L2 Quick Tap lengths are Sprint / Dash / Marathon', JSON.stringify(lens));
const lenTitle = await page.evaluate(() => document.querySelector('#len-title').textContent.trim());
lenTitle === 'Mode' ? ok('L9 the length row is labelled Mode') : bad('L9 the length row is labelled Mode', lenTitle);
await click('#grid'); await sleep(200);

// ---- 2. everything unlocked, so every pick sheet can be opened ----
console.log('\npick sheets (all unlocked)');
await setStorage({ 'ne.prefs': { ...OPEN_PREFS, played: 0 } });
await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
await click('[data-go="s-pick"]'); await sleep(400);
(await onScreen()) === 's-pick' ? ok('Play opens the grid') : bad('Play opens the grid');
for (const g of GAMES) {
  await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(320);
  await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(420);
  const state = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, modes: document.querySelector('#diff-row').children.length, lens: document.querySelector('#time-row').children.length, title: document.querySelector('#sheet-title').textContent.trim() }));
  (state.screen === 's-pick' && state.modes > 0 && state.lens > 0) ? ok(`${g} sheet — ${state.modes} mode(s), ${state.lens} length(s) · "${state.title}"`) : bad(`${g} sheet`, JSON.stringify(state));
  await click('#grid'); await sleep(200);
}
// the other screens open and render
for (const s of ['s-board', 's-ach', 's-key', 's-custom', 's-about', 's-testing']) { await click('.back'); await sleep(250); await click(`[data-go="${s}"]`); await sleep(600); (await onScreen()) === s ? ok(`${s} opens`) : bad(`${s} opens`, 'on ' + (await onScreen())); }

// ---- 2b. the Set and Streak lines on every sheet come from the one table (L5 / v14 section 5) ----
console.log('\nsheet copy comes from SET_COPY (L5)');
{
  const cfgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { SET_COPY, GAMES: TABLE } = await import(pathToFileURL(path.join(cfgRoot, 'config', 'games.js')).href);
  for (const key of Object.keys(SET_COPY)) {
    const [g, d] = key.split(':'); const mi = TABLE[g].modes.indexOf(d); const want = SET_COPY[key];
    await openSheet(g, mi, 0);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#time-row .tbtn')].map(b => ({ name: b.querySelector('b').textContent.trim(), sub: (b.querySelector('.lsub') || { textContent: '' }).textContent.trim() })));
    (rows.length === 2 && rows[0].name === 'Set' && rows[0].sub === want.set && rows[1].name === 'Streak' && rows[1].sub === want.streak)
      ? ok(`${key} \u2014 "${want.set}" / "${want.streak}"`)
      : bad(`${key} sheet copy comes from SET_COPY`, JSON.stringify(rows));
  }
}

// ---- 3. one Set run and one Streak run per game ----
console.log('\none Set run and one Streak run per game (first mode)');
let askedSet = '';
const RUNS = [['quick-tap', 0, 0], ['dots', 0, 0], ['hold', 0, 0], ['hold', 0, 'streak'], ['sequence', 0, 0], ['timing', 0, 0], ['timing', 0, 'streak'], ['reaction', 0, 0], ['reaction', 0, 'streak'], ['spot', 0, 0], ['spot', 0, 'streak']];
for (const [g, mi, li] of RUNS) {
  const face = await openSheet(g, mi, li);
  const label = `${g} · ${face || '?'}`;
  if (!face) { bad(label, 'no length button'); continue; }
  await click('#go-btn');
  const at = await driveToResult(g, label, 90000, g === 'reaction' && li === 'streak');
  if (g === 'timing' && li === 0) askedSet = askedLine;   // the Stopwatch Set's last "asked" line, for the 6.18 check below
  if (at === 's-over') { const r = await resultLine(); r.score ? ok(`${label} → "${r.score}" · ${r.verdict} · ${r.stats}`) : bad(label, 'result screen has no score'); }
}
// v14 (6.3): every round-based game held at least one result until it was tapped. A game that never raised #game.tapon
// auto-advanced, which is the thing this batch removed
{
  // v15 (3.9) narrows the list: only a result with something to read waits. Timing and Spot lost the cue this build,
  // so they must NOT hold — the assertion runs both ways or "removed it" and "broke it" look identical
  const want = ['hold', 'reaction'], gone = ['timing', 'spot'];
  const missing = want.filter(g => !heldSeen.has(g));
  const stillHolding = gone.filter(g => heldSeen.has(g));
  missing.length ? bad('6.3 a complicated result waits for a tap', 'never held: ' + missing.join(', ')) : ok(`6.3 Estimate and Reaction hold their result until it is tapped (${want.join(', ')})`);
  stillHolding.length ? bad('3.9 Timing and Spot no longer wait for a tap', 'still holding: ' + stillHolding.join(', ')) : ok(`3.9 tap-to-continue is gone from ${gone.join(' and ')} — they advance on their own`);
}
// v14 (6.18): five Stopwatch rounds averaging 7s ask for exactly 35.00s — the targets are generated so the total lands on the
// stated average, so no run is ever dealt a harder set of targets than another
{
  const m = askedSet.match(/^([\d.]+)s of ([\d.]+)s asked$/);
  if (!m) bad('6.18 Stopwatch shows what it has asked for', 'last line was "' + askedSet + '"');
  else if (m[2] !== '35.00') bad('6.18 five rounds averaging 7s ask for 35.00s', 'the run asked for ' + m[2] + 's');
  else if (m[1] !== m[2]) bad('6.18 the last round lands on the stated total', m[1] + ' of ' + m[2]);
  else ok(`6.18 Stopwatch · Set asks for exactly 35.00s over five rounds (last line "${askedSet}")`);
}
// the timed games have no Streak (Sprint / Dash / Marathon are seconds) — noted, not a failure
ok('quick-tap and dots: timed, no Streak length to run (L2)');
ok('sequence: one length family (keys), the run is its own streak');

// ---- 4. pass & play Quick Tap: two players, the hand-over screen between ----
console.log('\npass & play Quick Tap');
{
  await openSheet('quick-tap', 0, 0, 1);
  const btn = await page.evaluate(() => document.querySelector('#go-btn').textContent.trim());
  await click('#go-btn');
  let at = await driveToResult('quick-tap', 'pass & play · player 1', 30000);
  at === 's-pass' ? ok(`player 1 run ends on the hand-over screen (Go read "${btn}")`) : bad('player 1 run ends on the hand-over screen', 'on ' + at);
  if (at === 's-pass') {
    await click('#pass-go');
    at = await driveToResult('quick-tap', 'pass & play · player 2', 30000);
    if (at === 's-over') { const r = await resultLine(); const vs = await page.evaluate(() => document.querySelector('#vsbox').classList.contains('on') && document.querySelector('#over-top').hidden); vs ? ok(`player 2 run ends on the result: pair shown, board hidden (L10) · "${r.score}"`) : bad('L10 pass & play result shows the pair and no board'); }
  }
}

// ---- 4b. two-player: the five games that never had it (v15 section 4, build 25) ----
console.log('\ntwo-player (v15 section 4)');
{
  // the config the section is built on, read straight out of the module rather than matched in its source
  const cfg = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'games.js')).href);
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
  await click('[data-vs="1"]'); await sleep(180); await click('[data-vs2="2"]'); await sleep(240);
  const sheet = await page.evaluate(() => ({
    lens: [...document.querySelectorAll('#time-row .tbtn b')].map(b => b.textContent.trim()),
    lenShown: getComputedStyle(document.querySelector('#time-row')).display !== 'none',
    opens: [...document.querySelectorAll('#prac-row [data-opens]')].map(b => b.textContent.trim()),
    optsShown: getComputedStyle(document.querySelector('#seq-opts')).display !== 'none',
    line: (document.querySelector('#vsart small') || {}).textContent || '' }));
  (sheet.lenShown && sheet.lens.length === 3) ? ok(`4.5 Sequence versus keeps the key row (${sheet.lens.join(' · ')})`) : bad('4.5 Sequence versus shows the key row', JSON.stringify(sheet));
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
  await click('[data-vs="1"]'); await sleep(180);
  const offered = await page.evaluate(() => !document.querySelector('#vs-sub [data-vs2="2"]').hidden);
  offered ? ok('4.6 Spot offers Versus on the player row even though its FIRST mode has none') : bad('4.6 Spot offers Versus', 'the chip is hidden on the mode stage');
  await click('[data-vs2="2"]'); await sleep(200);
  await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); c[1].click(); }); await sleep(460);
  const stillVs = await page.evaluate(() => document.querySelector('#vs-sub [data-vs2="2"]').classList.contains('sel'));
  stillVs ? ok('4.6 and keeps it once Find is the mode') : bad('4.6 Versus survives picking Find');
  await click('#go-btn');
  // the two odd shapes are the only two classes with a single member; tap one and its owner takes the round
  const pokeFind = () => page.evaluate(() => {
    const els = [...document.querySelectorAll('#gen .fs')]; if (!els.length) return false;
    const cls = e => ['circle', 'square', 'tri'].find(c => e.classList.contains(c)) || '';
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

// ---- 5. storage fixtures ----
console.log('\nstorage fixtures');
const bootWith = async (name, storage, expectScreen) => {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  const before = errors.length;
  await setStorage(storage); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  const at = await onScreen();
  (at === expectScreen && errors.length === before) ? ok(`${name}: boots to ${at}`) : bad(`${name}: boots to ${expectScreen}`, `on ${at}, ${errors.length - before} new error(s)`);
  return at === expectScreen;
};
await bootWith('empty', {}, 's-menu');   // v14 (1.2): the title sequence is the menu screen wearing .story
const NOW = Date.now();
const B13 = {
  'ne.prefs': { sq: '#FFFFFF', lead: '#C8322A', bg: 'stars', tint: '', snd: 'space', music: true, musicG: {}, lastGame: 'quick-tap', name: 'AIDEN', scale: 'penta', allOpen: false, supporter: false, adRuns: 3, story: 1, played: 1, gridSeen: 1, col: { 'quick-tap': { sq: '#FFE9C4', lead: '#C8322A', cut: '#FFE9C4' } } },
  'ne.runs': [{ t: NOW - 60000, g: 'quick-tap', d: 'two', s: 5, n: 'AIDEN', v: 13, hits: 12, misses: 1, peak: 4 }, { t: NOW - 120000, g: 'dots', d: 'blind', s: 5, n: 'AIDEN', v: 13, hits: 9, misses: 0, peak: 3 }],
  'ne.unlock': { 'dots:blind': NOW - 120000 }, 'ne.ach': { first: NOW - 120000, named: NOW - 100000 }, 'ne.seen': { 'game:quick-tap': 1, 'game:dots': 1 }, 'ne.intro': { 'quick-tap:two': NOW - 130000 },
};
if (await bootWith('build-13 layout', B13, 's-menu')) {
  const ne = await getJSON('ne'); const runs = ne && ne.runs;
  (Array.isArray(runs) && runs.length === 2 && runs[0].hits === 12) ? ok('build-13 layout: both runs survive the boot') : bad('build-13 layout: runs survive', JSON.stringify(runs).slice(0, 80));
  // build 18 (A5): the seven keys become one versioned record; every surviving run carries the current schema stamp
  (ne && ne.v === 1 && Array.isArray(runs) && runs.every(r => r.v === 2)) ? ok('build-13 layout: migrated to `ne` v1, runs stamped RUN_SCHEMA 2') : bad('build-13 layout: ne v1 + run stamp', JSON.stringify({ v: ne && ne.v, stamps: runs && runs.map(r => r.v) }));
  const left = await page.evaluate(() => ['ne.prefs', 'ne.runs', 'ne.unlock', 'ne.ach', 'ne.seen', 'ne.intro', 'ne.tileSeen'].filter(k => localStorage.getItem(k) !== null));
  left.length === 0 ? ok('build-13 layout: the seven old keys are gone') : bad('build-13 layout: old keys removed', left.join(', '));
  (ne && ne.unlock['dots:blind'] && ne.ach.first && ne.ach.named && ne.intro['quick-tap:two'] && ne.seen && ne.seen['game:dots']) ? ok('build-13 layout: unlocks, achievements, intros and seen carried over') : bad('build-13 layout: maps carried', JSON.stringify({ u: ne && ne.unlock, a: ne && ne.ach, i: ne && ne.intro, s: ne && ne.seen }).slice(0, 160));
  (ne && ne.prefs.col['quick-tap'].sq === '#FFE9C4' && ne.prefs.adRuns === 3 && ne.prefs.col.dots && ne.prefs.col.dots.sq === '#FFFFFF') ? ok('build-13 layout: colours and prefs carried, missing games seeded') : bad('build-13 layout: prefs carried', JSON.stringify(ne && ne.prefs).slice(0, 160));
  await click('[data-go="s-board"]'); await sleep(400);
  const row = await page.evaluate(() => document.querySelector('#runs tr.best td:nth-child(3)')?.textContent.trim());
  row === '12' ? ok('build-13 layout: the Quick Tap board shows the 12-hit run first') : bad('build-13 layout: board shows the run', 'first score ' + row);
  const name = await page.evaluate(() => document.querySelector('#pname').value);
  name === 'AIDEN' ? ok('build-13 layout: the profile name is kept') : bad('build-13 layout: profile name', name);
}
const CORRUPT = { 'ne.prefs': { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: {} }, 'ne.runs': '{}', 'ne.unlock': '[]', 'ne.ach': 'null', 'ne.seen': '"x"' };
if (await bootWith('corrupt build-13 keys (ne.runs="{}", prefs.scale="foo", prefs.col=42)', CORRUPT, 's-menu')) {
  const p = (await getJSON('ne')).prefs;
  p.scale === 'penta' ? ok('corrupt: prefs.scale fell back to penta') : bad('corrupt: prefs.scale fallback', String(p.scale));
  (p.col && typeof p.col === 'object' && p.col['quick-tap']) ? ok('corrupt: prefs.col was rebuilt') : bad('corrupt: prefs.col rebuilt', JSON.stringify(p.col));
  // Sequence reads SCALES[sel.scale] the moment a run starts — the crash site the fixture is for
  await click('[data-go="s-pick"]'); await sleep(260); await click('.tile[data-game="sequence"]'); await sleep(260);
  await page.evaluate(() => document.querySelector('#time-row .tbtn')?.click()); await sleep(160);
  const before = errors.length; await click('#go-btn'); await sleep(1200);
  ((await inGame()) && errors.length === before) ? ok('corrupt: a Sequence run starts on the fallback scale') : bad('corrupt: Sequence run starts', `${errors.length - before} error(s)`);
  await click('#quit'); await sleep(300);
}
// build 18: a corrupt one-key record — every bad field falls back to its own default, the good ones stay; and the 600-run cap
const CORRUPT2 = { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: { dots: false, spot: 'yes' }, bg: '#123456', name: 12, adRuns: 'x', tint: 'red', lastGame: 'dots' }, runs: '{}', unlock: [], ach: null, intro: 'x', seen: 'x' } };
if (await bootWith('corrupt `ne` v1 (runs="{}", col=42, bg="#123456", name=12, adRuns="x")', CORRUPT2, 's-menu')) {
  const ne = await getJSON('ne'); const p = ne.prefs;
  const good = p.scale === 'penta' && p.bg === 'stars' && p.tint === '' && p.name === '' && p.adRuns === 0 && p.snd === 'off' && p.lastGame === 'dots' && p.allOpen === true && p.musicG.dots === false && !('spot' in p.musicG) && p.col['quick-tap'].sq === '#FFFFFF' && Array.isArray(ne.runs) && ne.runs.length === 0 && ne.seen && typeof ne.seen === 'object' && Object.keys(ne.ach).length === 0;   // seen was corrupt → null → boot reseeded it
  good ? ok('corrupt ne v1: each bad field fell back on its own; scale, bg, tint, name, adRuns, col, runs repaired, seen reseeded; snd, lastGame, allOpen, musicG.dots kept') : bad('corrupt ne v1: per-field fallback', JSON.stringify(ne).slice(0, 220));
}
const MANY = Array.from({ length: 650 }, (_, i) => ({ t: NOW - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 2, hits: 650 - i, misses: 0 }));
if (await bootWith('650 runs in `ne`', { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off' }, runs: MANY, unlock: {}, ach: {}, intro: {}, seen: {} } }, 's-menu')) {
  const ne = await getJSON('ne');
  (ne.runs.length === 600 && ne.runs[0].hits === 650) ? ok('runs are capped at 600, newest first kept') : bad('runs cap 600', `${ne.runs.length} runs, first hits ${ne.runs[0] && ne.runs[0].hits}`);
}

// ---- 6. challenge links ----
console.log('\nchallenge links');
const openChallenge = async (qs) => {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/index.html' + qs, { waitUntil: 'networkidle0' }); await sleep(400);
  for (let i = 0; i < 8 && (await page.evaluate(() => !!document.querySelector('#s-menu.story'))); i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
  await sleep(500);
  return page.evaluate(() => { const c = document.getElementById('chal'); return { screen: document.querySelector('.screen.on')?.id, shown: !c.hidden, img: !!c.querySelector('img'), html: c.innerHTML, text: c.textContent.trim() }; });
};
{
  const h = await openChallenge('?g=quick-tap&d=two&s=5&score=<img%20src=x%20onerror=alert(1)>');
  (h.screen === 's-pick' && h.shown && !h.img && !/<img/i.test(h.html)) ? ok(`S1 hostile score lands as text: "${h.text}"`) : bad('S1 hostile score lands as text', JSON.stringify(h));
  const n = await openChallenge('?g=quick-tap&d=two&s=5&score=31');
  (n.screen === 's-pick' && n.text === 'A friend scored 31 — beat it') ? ok('a numeric score reads as before') : bad('a numeric score reads as before', JSON.stringify(n));
  for (const [qs, why] of [['?g=quick-tap&d=two&s=1e308', 's=1e308'], ['?g=quick-tap&d=two&s=-5', 's=-5'], ['?g=quick-tap&d=two&s=NaN', 's=NaN'], ['?g=quick-tap&d=lead&s=5', 'd not a mode'], ['?g=nope&d=two&s=5', 'g not a game']]) {
    const b = await openChallenge(qs);
    (b.screen === 's-menu' && !b.shown) ? ok(`S2 ${why} is no challenge`) : bad(`S2 ${why} is no challenge`, JSON.stringify(b));
  }
  // a locked mode opened by the link: the run reaches the result and is never on a board or in achievements
  const c = await openChallenge('?g=quick-tap&d=four&s=5&score=20');
  if (c.screen === 's-pick' && c.shown) {
    const open = await page.evaluate(() => !document.querySelector('#diff-row .choice[data-diff="four"]').classList.contains('locked'));
    open ? ok('S2 the link opens Four for this visit') : bad('S2 the link opens Four for this visit');
    await click('#go-btn');
    const at = await driveToResult('quick-tap', 'challenge run', 30000);
    if (at === 's-over') {
      const ne = await getJSON('ne'), runs = ne && ne.runs, ach = ne && ne.ach, r = await resultLine();
      (!runs || runs.length === 0) ? ok(`S2 challenge run is not on the board (chal:1) · "${r.score}" · ${r.rank}`) : bad('S2 challenge run is not on the board', JSON.stringify(runs).slice(0, 80));
      (!ach || !ach.first) ? ok('S2 challenge run earns no achievement') : bad('S2 challenge run earns no achievement', JSON.stringify(ach));
    }
  } else bad('challenge link opens a locked mode sheet', JSON.stringify(c));
}

// ---- 6b. the side screens (v14 section 8) ----
console.log('\nside screens (v14 section 8)');
{
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({});                        // a brand-new profile: everything unseen, which is what 8.7 broke
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  await page.evaluate(() => document.body.click()); await sleep(900);
  await click('[data-go="s-custom"]'); await sleep(1400);   // past the .6s first-seen highlight
  // 8.7: the highlight used to end on `background-color:transparent` under animation-fill-mode:both, which held forever —
  // so every first-seen swatch was left blank. The target colours must still be their own colour once it has played
  const sw = await page.evaluate(() => { const b = document.querySelector('#c-sq button'); if (!b) return null;
    const bg = getComputedStyle(b).backgroundColor; const a = /rgba?\(([^)]+)\)/.exec(bg); const parts = a ? a[1].split(',') : [];
    return { cls: b.className.trim(), bg, alpha: parts.length > 3 ? parseFloat(parts[3]) : 1 }; });
  (sw && sw.alpha > .9) ? ok(`8.7 a first-seen target colour still shows its colour (${sw.bg})`) : bad('8.7 target colours blank on first load', JSON.stringify(sw));
  (await page.evaluate(() => !document.querySelector('#s-custom .eyebrow'))) ? ok('8.9 the Customise eyebrow line is gone') : bad('8.9 the Customise eyebrow line is gone');
  await click('#s-custom .back'); await sleep(400);
  await click('[data-go="s-ach"]'); await sleep(500);
  const ach = await page.evaluate(() => {
    const row = document.getElementById('ach-qt_clean5'), sec = document.getElementById('ach-qt_s5'), ev = document.getElementById('ach-every');
    return { ox: getComputedStyle(document.getElementById('achlist')).overflowX,
      lead: row ? (row.querySelector('span i') || {}).textContent : null,
      leadFirst: row ? row.querySelector('span').firstElementChild?.tagName : null,
      secret: sec ? (sec.querySelector('small') || {}).textContent : null,
      left: ev ? (ev.querySelector('small') || {}).textContent : null };
  });
  (ach.ox === 'hidden') ? ok('8.2 the achievements list has no sideways axis to be left panned on') : bad('8.2 achievements list overflow-x', ach.ox);
  (ach.leadFirst === 'I' && ach.lead === 'Quick Tap') ? ok('8.3 the game name leads the achievement title') : bad('8.3 the game name leads the title', JSON.stringify(ach));
  (ach.secret && !/^A stretch past/.test(ach.secret)) ? ok(`8.5 a secret row is described: "${ach.secret.slice(0, 46)}…"`) : bad('8.5 secret achievements get descriptions', ach.secret);
  (ach.left && /still to play/.test(ach.left)) ? ok('8.1 "Finish a run in every game" names the games left') : bad('8.1 which games are left', ach.left);
  await click('#s-ach .back'); await sleep(400);
  // 8.10: Testing is its own item below About, and About no longer carries it
  const moved = await page.evaluate(() => ({ item: !!document.querySelector('#s-menu [data-go="s-testing"]'),
    below: document.querySelector('#s-menu [data-go="s-about"]')?.nextElementSibling?.dataset.go,
    inAbout: document.querySelectorAll('#s-about [data-dev]').length, inTesting: document.querySelectorAll('#s-testing [data-act^="dev-"]').length }));
  (moved.item && moved.below === 's-testing' && moved.inAbout === 0 && moved.inTesting === 4)
    ? ok('8.10 Testing is its own item directly below About, with all four switches and none left in About')
    : bad('8.10 Testing moved out of About', JSON.stringify(moved));
}

// ---- 6c. the key (v14 section 9 / C.5 / C.6 / C.7, build 22) ----
console.log('\nthe key (v14 section 9)');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { KEY_BARS } = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  // C.5: the list is BUILT, never listed. A literal count or an array of ids in the CODE means a new mode would not join
  // the key. Comments come off first — the header is allowed to say what 31 is made of, the code is not allowed to know it
  const src = fs.readFileSync(path.join(root, 'progress', 'key.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  (!/\b31\b/.test(src) && !/['"]quick-tap:/.test(src)) ? ok('C.5 progress/key.js hard-codes neither 31 nor a list of combinations') : bad('C.5 the contributor list must come from GAMES + SET_COPY');
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  const k = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./games/registry.js'); const G = await import('./config/games.js');
    const want = []; for (const g in R.GAMES) for (const d of R.GAMES[g].modes) for (const sc of R.GC(g, d).lens) want.push(`${g}:${d}:${sc}`);
    return { combos: K.COMBOS.map(c => c.key), want, missing: K.barsMissing(), orphan: K.barsOrphan(),
      dirs: K.COMBOS.map(c => ({ key: c.key, dir: c.bar && c.bar.dir, lower: !!R.GC(c.g, c.d, c.s).lower })),
      setRows: Object.keys(G.SET_COPY).length, state: K.keyState().total }; });
  (k.combos.join('|') === k.want.join('|')) ? ok(`C.5 the key's ${k.combos.length} combinations are exactly GAMES x modes x GC(g,d).lens`) : bad('C.5 the contributor list', `${k.combos.length} vs ${k.want.length}`);
  (k.combos.length === 31) ? ok('C.5 6 + 6 + 4 + 3 + 4 + 4 + 4 = 31 combinations today') : bad('C.5 31 combinations today', String(k.combos.length));
  // C.6: the config decides which combinations exist. Either way round is a mismatch someone has to fix, never a silent drop
  (!k.missing.length) ? ok('C.6 every combination the config makes has a clearance bar') : bad('C.6 combinations with no bar (config wins — add a row to config/key-bars.js)', k.missing.join(', '));
  (!k.orphan.length) ? ok('C.6 every clearance bar belongs to a combination the config makes') : bad('C.6 orphan rows in config/key-bars.js', k.orphan.join(', '));
  // C.7: direction is read from the data, and nineteen of the thirty-one are ceilings. It must still agree with the game's own scoring
  { const off = k.dirs.filter(d => (d.dir === 'lower') !== d.lower);
    const ceils = k.dirs.filter(d => d.dir === 'lower').length;
    off.length ? bad('C.7 a bar direction disagrees with the game it scores', off.map(d => d.key).join(', ')) : ok(`C.7 all ${k.dirs.length} directions match GC(g,d,s).lower — ${ceils} ceilings, ${k.dirs.length - ceils} floors`); }
  // 9.3 / 9.4 / 9.5: a bar clears once, from a solo run only. Re-clearing returns null, which is what plays nothing
  const clear = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
    S.store.bars = {}; const bar = K.COMBOS.find(c => c.g === 'quick-tap' && c.s === 5).bar;
    const base = { g: 'quick-tap', d: 'two', s: 5, misses: 0, t: Date.now(), hits: bar.bar + 5 };
    const under = { ...base, hits: bar.bar - 5 };
    const a = K.checkKey({ ...under }, false);                 // short of the bar: nothing
    const b = K.checkKey({ ...base }, false);                  // over it, first time: a clear
    const c = K.checkKey({ ...base }, false);                  // over it again: nothing
    S.store.bars = {};
    const two = K.checkKey({ ...base }, true);                 // versus / pass & play never contribute (9.4, L10)
    const prac = K.checkKey({ ...base, practice: 1 }, false);
    const chal = K.checkKey({ ...base, chal: 1 }, false);
    const done = Object.keys(S.store.bars).length; S.store.bars = {};
    return { a: !!a, b: b && b.key, c: !!c, two: !!two, prac: !!prac, chal: !!chal, done, was: b && b.was, total: b && b.total }; });
  (!clear.a && clear.b === 'quick-tap:two:5' && !clear.c) ? ok(`9.3 a clearance bar is a one-off: beaten -> cleared (segment ${clear.was + 1} of ${clear.total}), beaten again -> nothing`) : bad('9.3 a bar clears once', JSON.stringify(clear));
  (!clear.two && !clear.prac && !clear.chal && clear.done === 0) ? ok('9.4 pass & play, versus, practice and challenge runs never feed the key') : bad('9.4 solo runs only', JSON.stringify(clear));
  // the screen itself draws a root segment per combination and says how far the key is
  await click('[data-go="s-key"]'); await sleep(600);
  const ui = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id,
    segs: document.querySelectorAll('#key-ring .kroot').length, nodes: document.querySelectorAll('#key-ring .knode').length,
    count: (document.getElementById('key-count') || {}).textContent, warn: !document.getElementById('key-warn').hidden }));
  (ui.screen === 's-key' && ui.nodes === GAMES.length && ui.segs === 31) ? ok(`9.6 the ring draws ${ui.nodes} games and ${ui.segs} root segments — "${ui.count}"`) : bad('9.6 the key ring', JSON.stringify(ui));
  (!ui.warn) ? ok('C.6 no mismatch warning on the key screen') : bad('C.6 the key screen is warning about missing bars');
  await page.evaluate(() => document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(350);
  const rows = await page.evaluate(() => ({ rows: document.querySelectorAll('#key-list .krow').length, nobar: document.querySelectorAll('#key-list .krow.nobar').length, first: (document.querySelector('#key-list .krow i') || {}).textContent }));
  (rows.rows === 6 && !rows.nobar) ? ok(`9.3 tapping Quick Tap lists its 6 combinations — first reads "${rows.first}"`) : bad('9.3 the key panel', JSON.stringify(rows));
}

// ---- 6d. the chain (v15 section 1) and the screens that carry it (v15 section 2), build 23 ----
console.log('\nthe chain and its screens (v15 sections 1 and 2)');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { LEN_RULES, UNLOCKS: U } = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const { GAMES: GT } = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const { ACH } = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  // 1.0a: the table is keyed 'game:mode'. A bare game key would silently give both modes the same numbers again
  { const keys = Object.keys(LEN_RULES);
    const bad_ = keys.filter(k => { const [g, d] = k.split(':'); return !GT[g] || !d || !GT[g].modes.includes(d); });
    bad_.length ? bad("1.0a LEN_RULES is keyed 'game:mode'", bad_.join(', ')) : ok(`1.0a LEN_RULES is keyed 'game:mode' — ${keys.length} rows, every one a real game and mode`); }
  // 1.5: the new Estimate · Grow row. A secret row must carry a hint (v14 8.5) or it shows the fallback line instead
  { const a = ACH.find(x => x.id === 'hd_max');
    (a && a.tier === 'secret' && a.hint && a.g === 'hold') ? ok(`1.5 hd_max "${a.name}" is a secret Estimate row with a hint`) : bad('1.5 the new Estimate · Grow achievement', JSON.stringify(a)); }
  // 2.5 static: the earning moved OUT of the result screen's ad-break callback and INTO the run. If it ever moves back,
  // an achievement earned on a run the player leaves before the ad clears is lost again, silently
  { const rs = fs.readFileSync(path.join(root, 'ui', 'screens', 'result.js'), 'utf8');
    const rn = fs.readFileSync(path.join(root, 'run', 'run.js'), 'utf8');
    const clean = /checkUnlocks|checkAch\(/.test(rs) === false;
    const banks = /checkUnlocks\(run\)/.test(rn) && /checkAch\(run\)/.test(rn) && rn.indexOf('checkUnlocks(run)') < rn.indexOf("emit('run:finish'");
    const onAbort = /function abort\(\)[\s\S]{0,400}liveCheck\(/.test(rn);
    (clean && banks && onAbort) ? ok('2.5 the run banks every earn before run:finish, and once more on abort; the result screen only shows them')
      : bad('2.5 earns are banked by the run, not the result screen', `result clean ${clean} · run banks ${banks} · abort banks ${onAbort}`); }

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  // 1.1-1.4: the seventeen values, checked through the predicates rather than by reading the table back at itself.
  // Each pair is [a record that must pass, a record that must not] — the second is the number one step short
  const V = await page.evaluate(async () => {
    const P = await import('./progress.js'); const R = await import('./progress/rules.js');
    const t = k => P.UNLOCKS.find(u => u.key === k).test;
    const qt = (s, hits, misses) => ({ g: 'quick-tap', d: 'two', s, hits, misses });
    const out = {};
    out.qtFour = [t('quick-tap:four')(qt(15, 15, 0)), t('quick-tap:four')(qt(15, 14, 0)), t('quick-tap:four')(qt(15, 15, 1))];
    out.dtBlind = [t('dots:blind')(qt(30, 35, 2)), t('dots:blind')(qt(30, 34, 0))];
    out.dtLead = [t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 0, misses: 5 }), t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 9, misses: 4 })];
    out.hdGrow = [t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 0 }), t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 1 })];
    out.tmStop = [t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 0 }), t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 1 })];
    out.rxNogo = [t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 350 }), t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 351 })];
    out.spCount = [t('spot:count')({ g: 'reaction', d: 'nogo', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 400 })];
    // lengths, per mode — the numbers that differ between Blind and Lead are the whole reason for 1.0a
    const L = (g, d, i) => R.LEN_TEST[g + ':' + d][i];
    out.lens = { qtMar: [L('quick-tap', 'two', 2)({ hits: 24 }), L('quick-tap', 'two', 2)({ hits: 23 })],
      blindDash: [L('dots', 'blind', 1)({ hits: 6, misses: 0 }), L('dots', 'blind', 1)({ hits: 5, misses: 0 })],
      leadDash: [L('dots', 'lead', 1)({ hits: 9, misses: 0 }), L('dots', 'lead', 1)({ hits: 8, misses: 0 })],
      blindMar: [L('dots', 'blind', 2)({ hits: 24 }), L('dots', 'blind', 2)({ hits: 23 })],
      leadMar: [L('dots', 'lead', 2)({ hits: 28 }), L('dots', 'lead', 2)({ hits: 27 })],
      cutStreak: [L('hold', 'cut', 1)({ y: 81 }), L('hold', 'cut', 1)({ y: 80 })],
      flashStreak: [L('reaction', 'flash', 1)({ hits: 501 }), L('reaction', 'flash', 1)({ hits: 500 })] };
    // build 24: Greedy is the engine's `mx` flag — the hold ran to its ceiling — not a % threshold. A big overshoot
    // with no `mx` must NOT earn it, or the row is just "miss by a lot" under another name
    out.hdMax = [R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, mx: 1, y: 174 }), R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, y: 684 }), R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, y: 120 })];
    // 1.0d: ONE record of the chain. Every requirement the app can show for a length is the string lenNeed builds
    const G = await import('./games/registry.js');
    out.oneRecord = [];
    for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (!i) return;
      const lk = P.lenLock(g, d, s, true); if (lk && lk.need !== P.lenNeed(g, d, s)) out.oneRecord.push(g + ':' + d + ':' + s); });
    return out; });
  const pair = (label, [yes, ...no]) => (yes && no.every(x => !x)) ? ok(label) : bad(label, JSON.stringify([yes, ...no]));
  pair('1.1a Quick Tap · Four opens at 15 clean hits in a Dash, not 14 and not with a miss', V.qtFour);
  pair('1.2a Dots · Blind opens at 35 hits in any Quick Tap run', V.dtBlind);
  pair('1.2b Dots · Lead opens on 5 misses in a Blind run (deliberate failure, v15 0.5)', V.dtLead);
  pair('1.3a Estimate · Grow opens on a Dots run with nothing pressed at all', V.hdGrow);
  pair('1.4a Timing · Stopwatch opens on a Sequence run that scored nothing', V.tmStop);
  pair('1.4c Go / No-go opens at a 350ms Flash Set, not 351', V.rxNogo);
  // 1.4d is the one row with TWO ways in — a Flash Set or a Go / No-go Set, built as Aiden wrote it. Cowork's note is that
  // this collapses 1.4c into it; the shape of the test says plainly that both doors are open, so a later change is visible
  { const [nogo, flash, slow] = V.spCount;
    (nogo && flash && !slow) ? ok('1.4d Spot · Count opens on a Flash OR a Go / No-go Set under 350ms — both doors, per Aiden') : bad('1.4d Spot · Count', JSON.stringify(V.spCount)); }
  pair('1.1b Quick Tap Marathon asks 24 in a Dash', V.lens.qtMar);
  pair('1.2c Dots · Blind Dash asks 6 clean', V.lens.blindDash);
  pair('1.2e Dots · Lead Dash asks 9 clean — the per-mode split (1.0a) is doing real work', V.lens.leadDash);
  pair('1.2d Dots · Blind Marathon asks 24', V.lens.blindMar);
  pair('1.2f Dots · Lead Marathon asks 28', V.lens.leadMar);
  pair('1.3b Estimate · Cut Streak asks for one round more than 80% off', V.lens.cutStreak);
  pair('1.4b Reaction · Flash Streak asks for a Set averaging over 500ms', V.lens.flashStreak);
  pair('1.5 the shape at its limit earns Greedy; merely overshooting does not', V.hdMax);
  (!V.oneRecord.length) ? ok('1.0d one record of the chain — every lock box and goal line reads the string lenNeed builds') : bad('1.0d a second copy of a requirement', V.oneRecord.join(', '));

  // 2.2: no Next card on a fresh profile's first menu open
  { const nx = await page.evaluate(() => { const s = document.querySelector('#s-menu.story'); if (s) document.body.click(); return null; }); void nx; await sleep(900);
    for (let i = 0; i < 8 && (await page.evaluate(() => !!document.querySelector('#s-menu.story'))); i++) { await page.evaluate(() => document.body.click()); await sleep(320); }
    await sleep(400);
    const card = await page.evaluate(() => ({ hidden: document.getElementById('nextup').hidden, tag: document.getElementById('menu-tag').hidden }));
    (card.hidden && card.tag) ? ok('2.2 no Next card on a fresh profile\'s first menu open') : bad('2.2 the Next card on a fresh profile', JSON.stringify(card)); }

  // 2.5 behavioural: an unlock that fires mid-run is in localStorage after the player quits
  { const kept = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
      S.store.unlock = {}; S.store.ach = {}; S.save();
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 15, vs: 0, practice: 0 });
      RUN.start(); RUN.liveCheck({ hits: 15, misses: 0 }); RUN.abort();
      let raw = null; try { raw = JSON.parse(localStorage.getItem('ne')); } catch (e) {}
      return { unlock: raw && raw.unlock ? Object.keys(raw.unlock) : [] }; });
    kept.unlock.includes('quick-tap:four') ? ok('2.5 an unlock earned mid-run is in storage after the run is quit — no silent loss')
      : bad('2.5 a mid-run earn survives a quit', JSON.stringify(kept)); }

  // 2.1: a locked length on the RESULT screen shows its requirement instead of walking out to game select
  await setStorage({ 'ne.prefs': { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  // NB: not openSheet — that helper reseeds the profile with allOpen, and a profile with nothing locked cannot show this
  { await click('[data-go="s-pick"]'); await sleep(300);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(300);
    await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[0].click()); await sleep(420);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn');
    const at = await driveToResult('quick-tap', '2.1 run for the locked chip', 60000);
    if (at !== 's-over') bad('2.1 a run to the result screen', 'ended on ' + at);
    else { const had = await page.evaluate(() => { const b = document.querySelector('#over-chips2 .chip.locked'); if (!b) return null; b.click(); return true; });
      await sleep(350);
      const st = await page.evaluate(() => ({ box: document.getElementById('lockwrap').classList.contains('on'), screen: document.querySelector('.screen.on')?.id, text: document.getElementById('lock-text').textContent.trim() }));
      if (had === null) bad('2.1 a locked length chip on the result screen', 'no locked chip to tap');
      else (st.box && st.screen === 's-over') ? ok(`2.1 tapping a locked length shows its requirement and stays put — "${st.text}"`) : bad('2.1 a locked chip must not navigate', JSON.stringify(st));
      await click('#lock-no'); await sleep(250); } }

  // 2.4: the Unlocks screen, and every line on it read from the one table
  await click('#over-back'); await sleep(300); await click('#s-pick .back'); await sleep(400);
  { await click('[data-go="s-unl"]'); await sleep(450);
    const u = await page.evaluate(async () => { const P = await import('./progress.js');
      const rows = [...document.querySelectorAll('#unl-list .urow')];
      const needs = rows.filter(r => r.classList.contains('lock') && !r.dataset.key).map(r => r.querySelector('small').textContent.trim());
      const known = new Set(P.UNLOCKS.map(x => x.need));
      const G = await import('./games/registry.js');
      for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (i) known.add(P.lenNeed(g, d, s)); });
      return { screen: document.querySelector('.screen.on')?.id, rows: rows.length, heads: document.querySelectorAll('#unl-list h4').length,
        stray: needs.filter(n => n && !known.has(n)) }; });
    (u.screen === 's-unl' && u.rows > 0 && u.heads === 3) ? ok(`2.4 the Unlocks screen lists ${u.rows} rows under ${u.heads} headings`) : bad('2.4 the Unlocks screen', JSON.stringify(u));
    (!u.stray.length) ? ok('2.4 / L6 every requirement on the Unlocks screen comes from UNLOCKS or lenNeed — no second copy') : bad('2.4 a requirement written twice', u.stray.join(' | ')); }
}

// ---- 6e. the runs (v15 section 3), build 24 ----
console.log('\nthe runs (v15 section 3)');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const css = fs.readFileSync(path.join(root, 'styles', 'app.css'), 'utf8');
  // 3.12: a glow, not a solid line. The old rule is the thing that must be gone, so test for its absence too
  { const rule = (css.match(/#game\.pturn::after\{[^}]*\}/) || [''])[0];
    const glow = /box-shadow:\s*inset/.test(rule), solid = /border:\s*\d+px solid/.test(rule);
    (glow && !solid) ? ok('3.12 the pass & play outline is a glow, not a solid line') : bad('3.12 the pass & play outline', `glow ${glow} · still a solid border ${solid}`); }
  // 3.11 / L4: the two halves must resolve to DIFFERENT colours. Both lit the same before, which is the one thing L4 exists to stop
  { const p1 = /#game\.versus \.vhalf\.p1 \.sq\{--sq-live:var\(--p1\)\}/.test(css), p2 = /#game\.versus \.vhalf\.p2 \.sq\{--sq-live:var\(--p2\)\}/.test(css);
    (p1 && p2) ? ok('3.11 / L4 the lit versus square takes the tapping player\'s colour — P1 red, P2 light blue') : bad('3.11 versus square colours', `p1 ${p1} · p2 ${p2}`); }
  // 3.3: the outline is lifted over the fill at the reveal only — a permanent lift would change the hold as well
  { const rev = /#hfield\.rev #hg\{z-index:\d+\}/.test(css);
    rev ? ok('3.3 the target outline sits over your shape at the round result') : bad('3.3 the target outline at the reveal', 'no #hfield.rev #hg rule'); }

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  const S3 = await page.evaluate(async () => {
    const out = {};
    const HD = (await import('./games/estimate/index.js')).default;
    const RX = (await import('./games/reaction/index.js')).default;
    const TM = (await import('./games/timing/index.js')).default;
    const { ESTIMATE, STREAK } = await import('./config/games.js');
    const v = Math.min(innerWidth, innerHeight) / 100;
    // 3.1: no Grow target lands under the floor, at any shape. Measured in vmin², which is the point of the item —
    // a raw-pixel floor would mean something different on every screen
    let worst = Infinity;
    for (let i = 0; i < 4000; i++) { HD.shape = HD.pickTarget(); const t = HD.growTarget() * v; worst = Math.min(worst, HD.shape.coef * t * t / (v * v)); }
    out.floor = { want: ESTIMATE.MIN_AREA, worst: Math.round(worst), px: Math.round(ESTIMATE.MIN_AREA * v * v) };
    // 3.5: Flash's third currency, held apart from the other two exactly as C.1-C.3 hold theirs apart
    out.flash = { early: RX.FLASH_EARLY, free: RX.FLASH_FREE, bud: RX.FLASH_BUD, nogoFree: RX.NOGO_FREE, nogoWrong: RX.NOGO_WRONG_STREAK };
    // 3.8: 25 seconds, 30 once round 10 is passed, and Hidden's 100px untouched
    TM.ctx = { mode: 'stopwatch', len: STREAK };
    TM.round = 1; const b1 = TM.budget(), t1 = TM.budTxt();
    TM.round = 11; const b2 = TM.budget();
    TM.ctx = { mode: 'hidden', len: STREAK }; const bh = TM.budget();
    out.stopwatch = { early: b1, late: b2, hidden: bh, txt: t1 };
    // 3.8: the Streak's targets climb; the SET's exact-mean deal is untouched (6.18 checks that separately)
    TM.ctx = { mode: 'stopwatch', len: STREAK };
    out.ramp = [1, 2, 5, 10, 20].map(r => TM.rampAt(r));
    // answer 2, the ceiling Aiden asked for: at the largest target the vmin clamp bites first, so 600% is unreachable
    const pctAt = t => { const cap = Math.min(t * 2.8, 96); return (cap / t) ** 2 * 100 - 100; };
    out.ceiling = { small: Math.round(pctAt(ESTIMATE.TMIN)), large: Math.round(pctAt(ESTIMATE.TMAX)), crossover: +(96 / Math.sqrt(7)).toFixed(1) };
    return out; });
  { const f = S3.floor;
    (f.worst >= f.want) ? ok(`3.1 every Grow target clears the ${f.want} vmin² floor (${f.px} px² here) — smallest dealt in 4,000 rounds was ${f.worst} vmin²`)
      : bad('3.1 the Grow minimum shape size', `floor ${f.want} vmin², smallest dealt ${f.worst} vmin²`); }
  { const f = S3.flash;
    (f.early === 400 && f.free === 150 && f.bud === 500 && f.nogoFree === 150 && f.nogoWrong === 200)
      ? ok('3.5 / L5 an early Flash tap spends 400ms, held apart from Flash 500/150 and Go / No-go 1000/150/200')
      : bad('3.5 the Flash early-tap penalty', JSON.stringify(f)); }
  { const s = S3.stopwatch;
    (s.early === 25 && s.late === 30 && s.hidden === 100 && s.txt === '25.00s')
      ? ok('3.8 / L5 the Stopwatch Streak budget is 25s, 30s past round 10; Hidden stays 100px and the screen says so')
      : bad('3.8 the Stopwatch Streak budget', JSON.stringify(s)); }
  { const r = S3.ramp, climbs = r.every((x, i) => !i || x > r[i - 1] - 0.9), low = r[0] < 4, high = r[4] > 7;
    (climbs && low && high) ? ok(`3.8 Stopwatch Streak targets climb — rounds 1/2/5/10/20 dealt ${r.join('s · ')}s`)
      : bad('3.8 the Stopwatch Streak ramp', JSON.stringify(r)); }
  // the finding behind Greedy's rewrite, asserted so it cannot quietly go back to a % threshold
  { const c = S3.ceiling;
    (c.large < 600 && c.small >= 600) ? ok(`3.x Greedy: a maxed hold reaches ${c.small}% off on the smallest target but only ${c.large}% on the largest (96vmin bites above ${c.crossover} vmin) — which is why the test is the cap, not a percentage`)
      : bad('the Greedy ceiling', JSON.stringify(c)); }
  // 3.10: Dots · Lead is set up before the run starts; Blind is not. Sampled during the 3-2-1, before #game.live
  for (const [mode, want] of [['lead', true], ['blind', false]]) {
    const seen = await page.evaluate(async d => {
      const RUN = await import('./run/run.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
      S.store.intro['dots:' + d] = Date.now(); S.save();
      Object.assign(ST.sel, { game: 'dots', diff: d, secs: 15, vs: 0, practice: 0 });
      RUN.start();
      return new Promise(res => setTimeout(() => res({
        dot: document.getElementById('dot').classList.contains('on'),
        lead: document.getElementById('lead').classList.contains('on'),
        live: document.getElementById('game').classList.contains('live') }), 720)); }, mode);
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
    if (seen.live) bad(`3.10 sampling Dots · ${mode} under the 3-2-1`, 'the run was already live');
    else if (seen.dot === want) ok(want ? `3.10 Dots · Lead shows the next dot and its ring on "1", before the run starts (lead ring ${seen.lead})` : '3.10 Dots · Blind is unchanged — nothing on screen under the 3-2-1');
    else bad(`3.10 Dots · ${mode} under the 3-2-1`, JSON.stringify(seen));
  }
}

// ---- 6f. the keys, the surface, and the three two-player defects (v15 section 5 and section 6, #375), build 26 ----
console.log('\nthe keys, the surface and #375 (v15 sections 5 and 6)');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const rx = strip(fs.readFileSync(path.join(root, 'games', 'reaction', 'index.js'), 'utf8'));
  const sq = strip(fs.readFileSync(path.join(root, 'games', 'sequence', 'index.js'), 'utf8'));
  const css = fs.readFileSync(path.join(root, 'styles', 'app.css'), 'utf8');
  const mjs = strip(fs.readFileSync(path.join(root, 'ui', 'screens', 'menu.js'), 'utf8'));
  const cfg = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);

  /* #375a: PASS_TURNS['reaction:nogo'][0] was dead config — beat() ended a block on this.ctx.len, the Set's own round
     count, which happened to be the same 5. The block length has to come off the turn table, and the rule change has to
     stay out of a pass & play block, or "a turn is one rule period" is only true at one turn length */
  { const bl = /blockLen\(\)\s*\{\s*return this\.two\.on\?this\.two\.per:this\.ctx\.len/.test(rx);
    const beatLine = (rx.match(/^\s*beat\(\)\{[^\n]*/m) || [''])[0];
    const usesBlock = /this\.seen>=this\.blockLen\(\)/.test(beatLine) && !/this\.seen>=this\.ctx\.len/.test(beatLine);
    const flip = (rx.match(/^[^\n]*ruleAt!==this\.seen[^\n]*/m) || [''])[0];
    const suppressed = /!this\.two\.on/.test(flip) && /this\.RULE_EVERY/.test(flip);
    (bl && usesBlock && suppressed) ? ok("#375a a Go / No-go turn is PASS_TURNS[0] shapes on ONE rule — read off the turn table, not off ctx.len")
      : bad('#375a the block length comes from PASS_TURNS and the rule does not flip inside it', `blockLen ${bl} · beat ${usesBlock} · flip ${suppressed}`);
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
    const lives = /lives:3/.test(fs.readFileSync(path.join(root, 'config', 'games.js'), 'utf8'));
    (two && own && grow) ? ok('#375c Sequence versus deals each player their own pattern of equal length, and both grow together')
      : bad('#375c each player gets their own pattern', `dealt ${two} · picked ${own} · grown ${grow}`);
    lives ? ok('#375c SEQ_VS.lives is still 3 — untouched, it is Aiden\'s on #376') : bad('#375c SEQ_VS.lives must not change on this build', 'it is not 3'); }
  // 6.2 / 6.3: the two menu and grid animations are driven from JS through classes and a variable, so both halves must exist
  { const ud = /\.item\.unx\{[^}]*var\(--ud/.test(css) && /\.item\.unx::after\{[^}]*var\(--ud/.test(css) && /setProperty\('--ud'/.test(mjs);
    ud ? ok('6.2 the menu unlocks stagger top to bottom — --ud reaches the item and its strike') : bad('6.2 the unlock stagger', 'the --ud delay is not on both halves');
    /\.tile\.arrive\.newthing\{/.test(css) ? ok('6.3 the arrival and L8\'s green mark are held apart, one after the other') : bad('6.3 tile arrival is distinct from the first-seen mark'); }

  // ---- the app itself ----
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);

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
  (!k1.shell[0] && k1.shell[1] && k1.shell[2]) ? ok('5.3 keys 2 and 3 are marked as the shell they are (#372)') : bad('5.3 the shell flags', JSON.stringify(k1.shell));
  // tapping key 3 opens the Author key's screen, and it says nothing about a target nobody has set (A.2)
  await page.evaluate(() => document.querySelector('.kkey[data-kt="2"]').click()); await sleep(320);
  const k3 = await page.evaluate(() => ({ main: document.getElementById('key-main').hidden, shell: !document.getElementById('key-shell').hidden,
    txt: document.getElementById('key-shell').textContent.replace(/\s+/g, ' ').trim(), rings: document.querySelectorAll('#key-shell .kroot').length,
    title: document.getElementById('key-title').textContent.trim() }));
  (k3.main && k3.shell && !k3.rings && /not set yet/i.test(k3.txt)) ? ok(`5.3 the Author key opens its own screen — "${k3.title}" — a shell that says so, with no ring and no invented bar`) : bad('5.3 the shell screen', JSON.stringify(k3));
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
    await wait(3200);
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
}

// ---- 7. every button action once (build 15: ui/actions.js dispatches on data-act) ----
console.log('\nbutton actions (every data-act at least once)');
{
  const seen = new Set();
  const tap = async (sel, label) => {
    const before = errors.length;
    const act = await page.evaluate(s => { const b = document.querySelector(s); if (!b) return null; b.click(); return b.dataset.act || '(none)'; }, sel);
    await sleep(250);
    if (act === null) { bad(label || sel, 'no such button'); return null; }
    seen.add(act);
    if (errors.length > before) bad(`${label || sel} [${act}]`, errors.slice(before).join(' | '));
    return act;
  };
  // everything open, name set, on the menu
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': { ...OPEN_PREFS, name: 'AIDEN' } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  // customise: swatch, wheel + done, sound pack, scale (Sequence), music on/off + preview, game chip, lock line
  await tap('[data-go="s-custom"]'); await sleep(300);
  await tap('#c-sq button:nth-child(2)', 'customise · target colour');
  await tap('#c-sq button[data-v="wheel"]', 'customise · colour wheel'); await tap('#wheel-done');
  await tap('#c-bg button:nth-child(2)', 'customise · background');
  await tap('#c-snd button:nth-child(2)', 'customise · sound pack'); await tap('#c-snd button:nth-child(1)', 'customise · sound pack back');
  await tap('#pv-g [data-v="sequence"]', 'customise · game chip');
  await tap('#c-scale button:nth-child(2)', 'customise · scale');
  await tap('#c-music button:nth-child(2)', 'customise · music off'); await tap('#c-music button:nth-child(1)', 'customise · music on'); await tap('#c-music-pv', 'customise · music preview');
  await tap('#pvlock', 'customise · lock line');
  await sleep(400); await tap('#s-custom .back', 'customise · back');
  // scores: game, mode, length chips
  await tap('[data-go="s-board"]'); await tap('#bd-g [data-v="dots"]', 'board · game chip'); await tap('#bd-d [data-v="lead"]', 'board · mode chip'); await tap('#bd-s [data-v="15"]', 'board · length chip');
  await sleep(400); await tap('#s-board .back', 'board · back');
  // unlocks (build 23, v15 2.4): its own menu item now, above Achievements. The key row is the one that leads somewhere
  // with a single Back, which is why it is the row this taps
  await tap('[data-go="s-unl"]'); await sleep(300);
  await tap('#unl-list .urow.key', 'unlocks · the key row'); await sleep(400);
  (await onScreen()) === 's-key' ? ok('the Unlocks screen\'s key row opens the key') : bad('unlocks · key row', 'on ' + (await onScreen()));
  await tap('#s-key .back', 'key · back'); await sleep(300);
  // achievements: filter chip, a row that jumps to a sheet (Quick Tap · Clean · Sprint · Four)
  await tap('[data-go="s-ach"]'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  await tap('#ach-qt_clean5', 'achievements · jump row'); await sleep(300);
  (await onScreen()) === 's-pick' ? ok('achievement row jumps to its pick sheet') : bad('achievement row jumps to its pick sheet', 'on ' + (await onScreen()));
  await tap('#lvl-back', 'sheet · mode back'); await tap('#diff-row .choice:nth-child(2)', 'sheet · mode');
  await tap('#prac-row [data-prac]', 'sheet · practice from'); await tap('#grid', 'sheet · grid');
  await sleep(500); await tap('#s-pick .back', 'grid · back');
  // about: support. v14 (8.10): the dev switches live on their own screen now, one menu item below About
  await tap('[data-go="s-about"]'); await tap('#support', 'about · support');
  await sleep(400); await tap('#s-about .back', 'about · back');
  await tap('[data-go="s-testing"]'); await tap('#dev-sup', 'testing · supporter on'); await tap('#dev-sup', 'testing · supporter off');
  await tap('#dev-open', 'testing · progression on'); await tap('#dev-open', 'testing · everything open');
  await tap('#dev-story', 'testing · replay the intro'); await sleep(300);
  (await page.evaluate(() => !!document.querySelector('#s-menu.story'))) ? ok('replay the intro shows the title sequence') : bad('replay the intro', 'on ' + (await onScreen()));
  await page.evaluate(() => document.body.click()); await sleep(400);
  // the full stop, three taps
  for (let i = 0; i < 3; i++) await tap('#egg', 'egg');
  const egg = (await getJSON('ne')).ach;
  egg && egg.egg ? ok('three taps on the full stop earn Excuses') : bad('three taps on the full stop earn Excuses', JSON.stringify(egg));
  // fresh profile: a locked tile opens the lock box, Try to unlock starts the run with the goal line up; the Next card does the same
  await setStorage({ 'ne.prefs': { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await tap('[data-go="s-pick"]'); await tap('.tile[data-game="dots"]', 'locked tile');
  const boxOn = await page.evaluate(() => document.getElementById('lockwrap').classList.contains('on'));
  boxOn ? ok('a locked tile opens the lock box') : bad('a locked tile opens the lock box');
  await tap('#lock-no', 'lock box · not now'); await tap('.tile[data-game="dots"]', 'locked tile again'); await tap('#lock-go', 'lock box · try to unlock'); await sleep(600);
  const goal = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), goal: document.getElementById('goal').textContent.trim() }));
  (goal.game && /35 hits/.test(goal.goal)) ? ok(`try to unlock starts the run with its goal: "${goal.goal}"`) : bad('try to unlock starts the run with its goal', JSON.stringify(goal));
  await tap('#quit', 'quit'); await sleep(300);
  await tap('#s-pick .back'); await sleep(300); await tap('#nextup', 'next achievement card'); await sleep(600);
  (await inGame()) ? ok('the Next achievement card starts its run') : bad('the Next achievement card starts its run', 'on ' + (await onScreen()));
  await tap('#quit');
  // the result screen's chips, again, share (clipboard fallback → toast), back
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await openSheet('quick-tap', 0, 0); await tap('#go-btn'); await driveToResult('quick-tap', 'run for the result chips', 30000);
  await tap('#over-chips [data-v="four"]', 'result · mode chip'); await tap('#over-chips2 [data-v="15"]', 'result · length chip'); await tap('#over-vs [data-v="f"]', 'result · with a friend'); await tap('#over-vs [data-chip="over-vs2"][data-v="1"]', 'result · pass & play'); await tap('#over-vs [data-v="0"]', 'result · solo');
  await tap('#share', 'result · share'); await tap('#over-back', 'result · back'); await sleep(300);
  (await onScreen()) === 's-pick' ? ok('result back opens the pick sheet') : bad('result back opens the pick sheet', 'on ' + (await onScreen()));
  await tap('#time-row .tbtn:nth-child(2)', 'sheet · length'); await tap('[data-vs="1"]', 'sheet · with a friend'); await tap('[data-vs2="1"]', 'sheet · pass & play'); await tap('[data-vs="0"]', 'sheet · solo');
  // build 18: the chips are one act per screen, and the overlays (lock box, Next card, the full stop) are acts too
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip-bd', 'chip-pv', 'chip-ach', 'chip-over', 'item', 'music-pv', 'pvlock', 'ach', 'unl', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done', 'lock-no', 'lock-go', 'nextup', 'egg'];
  const missing = expected.filter(a => !seen.has(a));
  missing.length ? bad('every data-act driven once', 'not driven: ' + missing.join(', ')) : ok(`every data-act driven once (${expected.length}) — not covered: again, pass-go, to-games, seqdone, praclock, dev-fresh, adskip, toast`);
}

// ---- verdict ----
await browser.close();
if (srv) srv.close();
console.log('\n' + '-'.repeat(60));
if (errors.length) { console.log('UNCAUGHT ERRORS (' + errors.length + '):'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
if (fail.length) console.log('FAILED CHECKS:\n  ' + fail.join('\n  '));
const pass = !errors.length && !fail.length;
console.log(pass ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
process.exit(pass ? 0 : 1);
