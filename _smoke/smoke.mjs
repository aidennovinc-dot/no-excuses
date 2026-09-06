/* No Excuses — the gate (A7). Run before every push:  npm test
 *
 * Spawns its own static server (no Python), launches the Chrome at CHROME_PATH (Windows default as the fallback)
 * at 390x844, and fails on any uncaught error or failed assertion. What it covers, build 15:
 *   1. cold start: intro -> menu, and the locked decisions that can be asserted on a fresh profile
 *        L1 title sequence before the menu · L2 Sprint / Dash / Marathon · L3 Solo shows nothing about friends
 *        L7 Quick Tap tile is white before any run · L9 the length row is labelled Mode
 *   2. every pick sheet opens (everything unlocked)
 *   3. one Set run and one Streak run per game, driven to the result screen the way that engine is played
 *   4. a pass & play Quick Tap (both players, the hand-over screen between)
 *   5. boot on three storage fixtures: empty · build-13 layout (runs survive) · corrupt (ne.runs="{}", prefs.scale="foo", prefs.col=42)
 *   6. challenge links: a hostile ?score= lands as text (S1); a bad ?s= is no challenge (S2); a run only the link opened is never on a board (S2)
 *   7. every button action (data-act) driven at least once — customise, chips, dev switches, lock box, Next card, full stop, share
 * Pass a base URL as argv[2] to test a server you are already running instead.
 */
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

// one poke per game, state-aware from the DOM alone, so a run of any length reaches its result
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

async function driveToResult(g, label, ms = 90000, noTap = false) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const at = await onScreen(); if (at === 's-over' || at === 's-pass') break;
    if (await skipAd()) continue;
    if (at === null || (await inGame())) { if (!noTap) await poke(g); }
    await sleep(45);
  }
  const at = await onScreen();
  if (at !== 's-over' && at !== 's-pass') { bad(label, 'still on ' + (at || 'the game') + ' after ' + ms / 1000 + 's'); return null; }
  return at;
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
  await page.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); (c[mi] || c[0]).click(); }, mi); await sleep(240);
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
const sawStory = at === 's-story';
sawStory ? ok('intro screen shows') : bad('intro screen shows', 'on ' + at);
for (let i = 0; i < 8 && (await onScreen()) === 's-story'; i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
at = await onScreen();
at === 's-menu' ? ok('intro leads to the menu') : bad('intro leads to the menu', 'on ' + at);

// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
console.log('\nlocked decisions (fresh profile)');
sawStory ? ok('L1 title sequence plays before the menu') : bad('L1 title sequence plays before the menu');
await click('[data-go="s-pick"]'); await sleep(400);
const tileCol = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="quick-tap"]'); return { sq: t.style.getPropertyValue('--sq-live').trim(), unplayed: t.classList.contains('unplayed') }; });
(tileCol.unplayed && tileCol.sq.toUpperCase() === '#FFFFFF') ? ok('L7 Quick Tap tile is white before any run') : bad('L7 Quick Tap tile is white before any run', JSON.stringify(tileCol));
await click('.tile[data-game="quick-tap"]'); await sleep(320);
const soloSub = await page.evaluate(() => { const sub = document.querySelector('#vs-sub'); return { hidden: sub.hasAttribute('hidden'), shown: getComputedStyle(sub).display !== 'none' }; });
(soloSub.hidden && !soloSub.shown) ? ok('L3 Solo shows no Pass & play / Versus') : bad('L3 Solo shows no Pass & play / Versus', JSON.stringify(soloSub));
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(280);
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
  await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(280);
  const state = await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, modes: document.querySelector('#diff-row').children.length, lens: document.querySelector('#time-row').children.length, title: document.querySelector('#sheet-title').textContent.trim() }));
  (state.screen === 's-pick' && state.modes > 0 && state.lens > 0) ? ok(`${g} sheet — ${state.modes} mode(s), ${state.lens} length(s) · "${state.title}"`) : bad(`${g} sheet`, JSON.stringify(state));
  await click('#grid'); await sleep(200);
}
// the other screens open and render
for (const s of ['s-board', 's-ach', 's-custom', 's-about']) { await click('.back'); await sleep(250); await click(`[data-go="${s}"]`); await sleep(600); (await onScreen()) === s ? ok(`${s} opens`) : bad(`${s} opens`, 'on ' + (await onScreen())); }

// ---- 3. one Set run and one Streak run per game ----
console.log('\none Set run and one Streak run per game (first mode)');
const RUNS = [['quick-tap', 0, 0], ['dots', 0, 0], ['hold', 0, 0], ['hold', 0, 'streak'], ['sequence', 0, 0], ['timing', 0, 0], ['timing', 0, 'streak'], ['reaction', 0, 0], ['reaction', 0, 'streak'], ['spot', 0, 0], ['spot', 0, 'streak']];
for (const [g, mi, li] of RUNS) {
  const face = await openSheet(g, mi, li);
  const label = `${g} · ${face || '?'}`;
  if (!face) { bad(label, 'no length button'); continue; }
  await click('#go-btn');
  const at = await driveToResult(g, label, 90000, g === 'reaction' && li === 'streak');
  if (at === 's-over') { const r = await resultLine(); r.score ? ok(`${label} → "${r.score}" · ${r.verdict} · ${r.stats}`) : bad(label, 'result screen has no score'); }
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
await bootWith('empty', {}, 's-story');
const NOW = Date.now();
const B13 = {
  'ne.prefs': { sq: '#FFFFFF', lead: '#C8322A', bg: 'stars', tint: '', snd: 'space', music: true, musicG: {}, lastGame: 'quick-tap', name: 'AIDEN', scale: 'penta', allOpen: false, supporter: false, adRuns: 3, story: 1, played: 1, gridSeen: 1, col: { 'quick-tap': { sq: '#FFE9C4', lead: '#C8322A', cut: '#FFE9C4' } } },
  'ne.runs': [{ t: NOW - 60000, g: 'quick-tap', d: 'two', s: 5, n: 'AIDEN', v: 13, hits: 12, misses: 1, peak: 4 }, { t: NOW - 120000, g: 'dots', d: 'blind', s: 5, n: 'AIDEN', v: 13, hits: 9, misses: 0, peak: 3 }],
  'ne.unlock': { 'dots:blind': NOW - 120000 }, 'ne.ach': { first: NOW - 120000, named: NOW - 100000 }, 'ne.seen': { 'game:quick-tap': 1, 'game:dots': 1 }, 'ne.intro': { 'quick-tap:two': NOW - 130000 },
};
if (await bootWith('build-13 layout', B13, 's-menu')) {
  const runs = await getJSON('ne.runs');
  (Array.isArray(runs) && runs.length === 2 && runs[0].hits === 12) ? ok('build-13 layout: both runs survive the boot') : bad('build-13 layout: runs survive', JSON.stringify(runs).slice(0, 80));
  await click('[data-go="s-board"]'); await sleep(400);
  const row = await page.evaluate(() => document.querySelector('#runs tr.best td:nth-child(3)')?.textContent.trim());
  row === '12' ? ok('build-13 layout: the Quick Tap board shows the 12-hit run first') : bad('build-13 layout: board shows the run', 'first score ' + row);
  const name = await page.evaluate(() => document.querySelector('#pname').value);
  name === 'AIDEN' ? ok('build-13 layout: the profile name is kept') : bad('build-13 layout: profile name', name);
}
const CORRUPT = { 'ne.prefs': { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: {} }, 'ne.runs': '{}', 'ne.unlock': '[]', 'ne.ach': 'null', 'ne.seen': '"x"' };
if (await bootWith('corrupt (ne.runs="{}", prefs.scale="foo", prefs.col=42)', CORRUPT, 's-menu')) {
  const p = await getJSON('ne.prefs');
  p.scale === 'penta' ? ok('corrupt: prefs.scale fell back to penta') : bad('corrupt: prefs.scale fallback', String(p.scale));
  (p.col && typeof p.col === 'object' && p.col['quick-tap']) ? ok('corrupt: prefs.col was rebuilt') : bad('corrupt: prefs.col rebuilt', JSON.stringify(p.col));
  // Sequence reads SCALES[sel.scale] the moment a run starts — the crash site the fixture is for
  await click('[data-go="s-pick"]'); await sleep(260); await click('.tile[data-game="sequence"]'); await sleep(260);
  await page.evaluate(() => document.querySelector('#time-row .tbtn')?.click()); await sleep(160);
  const before = errors.length; await click('#go-btn'); await sleep(1200);
  ((await inGame()) && errors.length === before) ? ok('corrupt: a Sequence run starts on the fallback scale') : bad('corrupt: Sequence run starts', `${errors.length - before} error(s)`);
  await click('#quit'); await sleep(300);
}

// ---- 6. challenge links ----
console.log('\nchallenge links');
const openChallenge = async (qs) => {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/index.html' + qs, { waitUntil: 'networkidle0' }); await sleep(400);
  for (let i = 0; i < 8 && (await onScreen()) === 's-story'; i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
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
      const runs = await getJSON('ne.runs'), ach = await getJSON('ne.ach'), r = await resultLine();
      (!runs || runs.length === 0) ? ok(`S2 challenge run is not on the board (chal:1) · "${r.score}" · ${r.rank}`) : bad('S2 challenge run is not on the board', JSON.stringify(runs).slice(0, 80));
      (!ach || !ach.first) ? ok('S2 challenge run earns no achievement') : bad('S2 challenge run earns no achievement', JSON.stringify(ach));
    }
  } else bad('challenge link opens a locked mode sheet', JSON.stringify(c));
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
  // achievements: filter chip, a row that jumps to a sheet (Quick Tap · Clean · Sprint · Four)
  await tap('[data-go="s-ach"]'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  await tap('#ach-qt_clean5', 'achievements · jump row'); await sleep(300);
  (await onScreen()) === 's-pick' ? ok('achievement row jumps to its pick sheet') : bad('achievement row jumps to its pick sheet', 'on ' + (await onScreen()));
  await tap('#lvl-back', 'sheet · mode back'); await tap('#diff-row .choice:nth-child(2)', 'sheet · mode');
  await tap('#prac-row [data-prac]', 'sheet · practice from'); await tap('#grid', 'sheet · grid');
  await sleep(500); await tap('#s-pick .back', 'grid · back');
  // about: the dev switches (each toggled back), support, replay the intro
  await tap('[data-go="s-about"]'); await tap('#dev-sup', 'about · supporter on'); await tap('#dev-sup', 'about · supporter off'); await tap('#support', 'about · support');
  await tap('#dev-open', 'about · progression on'); await tap('#dev-open', 'about · everything open');
  await tap('#dev-story', 'about · replay the intro'); await sleep(300);
  (await onScreen()) === 's-story' ? ok('replay the intro shows the title sequence') : bad('replay the intro', 'on ' + (await onScreen()));
  await page.evaluate(() => document.body.click()); await sleep(400);
  // the full stop, three taps
  for (let i = 0; i < 3; i++) await tap('#egg', 'egg');
  const egg = await getJSON('ne.ach');
  egg && egg.egg ? ok('three taps on the full stop earn Excuses') : bad('three taps on the full stop earn Excuses', JSON.stringify(egg));
  // fresh profile: a locked tile opens the lock box, Try to unlock starts the run with the goal line up; the Next card does the same
  await setStorage({ 'ne.prefs': { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await tap('[data-go="s-pick"]'); await tap('.tile[data-game="dots"]', 'locked tile');
  const boxOn = await page.evaluate(() => document.getElementById('lockwrap').classList.contains('on'));
  boxOn ? ok('a locked tile opens the lock box') : bad('a locked tile opens the lock box');
  await tap('#lock-no', 'lock box · not now'); await tap('.tile[data-game="dots"]', 'locked tile again'); await tap('#lock-go', 'lock box · try to unlock'); await sleep(600);
  const goal = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), goal: document.getElementById('goal').textContent.trim() }));
  (goal.game && /30 hits/.test(goal.goal)) ? ok(`try to unlock starts the run with its goal: "${goal.goal}"`) : bad('try to unlock starts the run with its goal', JSON.stringify(goal));
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
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip', 'item', 'music-pv', 'pvlock', 'ach', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done'];
  const missing = expected.filter(a => !seen.has(a));
  missing.length ? bad('every data-act driven once', 'not driven: ' + missing.join(', ')) : ok(`every data-act driven once (${expected.length}) — not covered: again, pass-go, to-games, seqdone, praclock, dev-fresh`);
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
