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
 *   6c. the key (v14 section 9, build 22): the contributor list comes from GAMES + SET_COPY and not from a literal - and the
 *       COUNT is derived here too since build 28 (B.9 took Sequence to two key counts, so 31 became 30), every
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
  // v18 (S.2, batch 14): the two places a person reads wear `v0.N`; the constant and version.json stay the bare integer (A6)
  const places = [html.match(/<div class="hint">v0\.(\d+) ·/)?.[1], html.match(/<div id="build">v0\.(\d+)<\/div>/)?.[1], html.match(/const BUILD="(\d+)";/)?.[1], String(vj.build)];
  places.every(p => p === String(BUILD)) ? ok(`A6 build ${BUILD} in config/build.js = index.html ×3 = version.json (visible two as v0.${BUILD})`) : bad('A6 one build number', JSON.stringify(places) + ' vs config ' + BUILD);
  const oldForm = html.match(/<div class="hint">build \d+ ·|<div id="build">build \d+</g) || [];
  (!oldForm.length && /'v0\.'\+j\.build/.test(html)) ? ok('S.2 v0.N on screen — hint line, #build and the update bar; no `build N` form left') : bad('S.2 v0.N on screen', oldForm.join(' | ') || 'update bar does not name v0.N');
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const cfg = fs.readdirSync(path.join(root, 'config')).filter(f => f.endsWith('.js'));
  const dirty = cfg.filter(f => /\bimport\b|=>|\bfunction\b/.test(strip(fs.readFileSync(path.join(root, 'config', f), 'utf8'))));
  dirty.length ? bad('A2 config/ is data only', dirty.join(', ')) : ok(`A2 config/ is data only (${cfg.length} files: no imports, no functions)`);
  /* v16 (§1) — THE MUSIC DATA. Three options for every game, each with its own voicing AND its own rhythm: Aiden's
     complaint was that seven tracks of the same arrangement at different speeds all sounded the same, so "three options"
     that shared a wave set and a step pattern would be the same mistake three times over. The check is deliberately
     about SHAPE, not taste — two options of one game must differ in the set of waves they use or in the set of patterns
     they play, and every game must have all three. */
  {
    const AU = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
    const G7 = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
    const ROLES = ['pad', 'stab', 'arp', 'lead', 'bass', 'sub', 'drone'];
    const miss = [], same = [], badv = [];
    // build 30: TRACK_OPTS is one list per GAME and the ids are names, so the shape of this check moved with the data
    for (const g of G7) { const os = AU.TRACK_OPTS[g] || [];
      if (os.length !== 3) miss.push(g + ' has ' + os.length + ' options');
      for (const o of os) if (!AU.TRACKS[g + ':' + o]) miss.push(g + ':' + o);
      if (!os.includes(AU.TRACK_PICK[g])) miss.push(g + ' picks ' + AU.TRACK_PICK[g] + ', which is not one of its options'); }
    for (const [k, t] of Object.entries(AU.TRACKS)) {
      if (!t.ch || !t.ch.length || !t.bass || !t.bass.length || !t.voices || !t.voices.length) badv.push(k + ' (empty)');
      for (const v of t.voices || []) {
        if (!ROLES.includes(v.v)) badv.push(k + ' role ' + v.v);
        if (v.v === 'lead' && !(v.seq || []).length) badv.push(k + ' lead with no melody');
      }
    }
    const sig = t => [[...new Set(t.voices.map(v => v.w))].sort().join('+'), [...new Set(t.voices.map(v => v.pat || 'x'))].sort().join('|') + '@' + (t.beats || 4)];
    for (const g of G7) { const os = AU.TRACK_OPTS[g] || [];
      const ss = os.map(o => AU.TRACKS[g + ':' + o]).filter(Boolean).map(sig);
      for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++)
        if (ss[i][0] === ss[j][0] && ss[i][1] === ss[j][1]) same.push(g + ' ' + os[i] + '/' + os[j]);
    }
    // build 30 (B.31): the key loops are the three THEMES now, not key:1..3
    const extra = ['menu', 'key:roots', 'key:frost', 'key:thorn'].filter(k => !AU.TRACKS[k]);
    if (miss.length || badv.length) bad('§1.1 three playable options per game', [...miss, ...badv].join(', '));
    else if (same.length) bad('§1.1 the three options are different music', 'same voicing and rhythm: ' + same.join(', '));
    else if (extra.length) bad('§1.2 / §1.3 the menu loop and one per key', 'missing: ' + extra.join(', '));
    else ok(`§1 ${Object.keys(AU.TRACKS).length} tracks — 3 per game with different waves or rhythms, plus the menu and three keys`);
    // Quick Tap · a is the build-26 loop note for note. It is the quality bar Aiden named, so it must be IN the set, not replaced
    const qa = AU.TRACKS['quick-tap:held'], want = JSON.stringify({ root: 110, bpm: 126, ch: [[0, 7, 12, 16], [5, 12, 17, 21], [3, 10, 15, 19], [7, 14, 19, 22]], bass: [0, 5, 3, 7] });
    const got = JSON.stringify({ root: qa.root, bpm: qa.bpm, ch: qa.ch, bass: qa.bass });
    const shape = qa.voices.length === 2 && qa.voices[0].v === 'pad' && qa.voices[0].w === 'triangle' && qa.voices[1].v === 'bass' && qa.voices[1].w === 'sine' && (qa.beats || 4) === 4;
    (got === want && shape) ? ok('§1.1 Quick Tap · Held is the build-26 loop unchanged — the quality bar is one of its three')
      : bad('§1.1 Quick Tap keeps its current loop as an option', got);
    // build 30 (B.30): the track a game is set to must exist, and so must the flow layer B.27 rides over it
    { const missPick = G7.filter(g => !AU.TRACKS[g + ':' + AU.TRACK_PICK[g]]);
      const setsBad = Object.keys(AU.SET_SECS || {}).filter(k => !(AU.SET_SECS[k] > 0));
      const flowOk = AU.FLOW_STEM && AU.FLOW_STEM.vol > 0 && (AU.FLOW_STEM.voices || []).length;
      (!missPick.length && !setsBad.length && flowOk)
        ? ok(`B.30 every game's picked track exists (${G7.map(g => AU.TRACK_PICK[g]).join(', ')}), ${Object.keys(AU.SET_SECS).length} Set lengths, and the flow layer is at vol ${AU.FLOW_STEM.vol}`)
        : bad('B.30 the picked tracks, the Set lengths and the flow layer', JSON.stringify({ missPick, setsBad, flowOk }));
    }
    // no percussion: the one rule the old module had that was right, and the reason the roles list has no noise in it
    ROLES.includes('noise') ? bad('§1 no percussion in the music') : ok('§1 no percussion role exists — rhythm is plucks, stabs, rests and bar lengths');
  }
  /* v16 (1.6): an unlock has its own sound and it is not the achievement's. The achievement path must still be Snd.click:
     Aiden's line was "achievements currently sound great as is", so this asserts what did NOT change as well. */
  {
    const t = fs.readFileSync(path.join(root, 'ui', 'toast.js'), 'utf8');
    const good = /cls==='ok'\?Snd\.unlockFx\(\):Snd\.click\(\)/.test(t.replace(/\s+/g, ''));
    good ? ok('1.6 an unlock toast plays Snd.unlockFx, an achievement toast still plays Snd.click')
         : bad('1.6 the unlock sound is its own', 'ui/toast.js does not pick unlockFx for an ok toast');
  }
  // v16 (§5 / A.3): the intro carries ONE line. Every row is a single-element array — the sub-line is gone from the data
  {
    const CP = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const subs = Object.entries(CP.INTRO).filter(([, v]) => v.length > 1 && v[1]);
    subs.length ? bad('§5 the intro sub-line is gone', subs.map(([k]) => k).join(', '))
      : ok(`§5 all ${Object.keys(CP.INTRO).length} intro rows are one line, and INTRO_READY carries the "Ready?" gate`);
  }
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
    // AMENDED at build 32 (v19 C.5 / C.6, L5): the Go / No-go gate is 180 and its Streak budget 3000; the wrong-tap costs did not move
    const want = { FLASH_FREE: 150, FLASH_BUD: 500, NOGO_FREE: 180, NOGO_BUD: 3000, NOGO_WRONG_SET: 150, NOGO_WRONG_STREAK: 200 };
    const got = Object.fromEntries(Object.keys(want).map(k => [k, num(k)]));
    const wrong = Object.keys(want).filter(k => got[k] !== want[k]);
    wrong.length ? bad('L5 the Reaction budgets', wrong.map(k => `${k}=${got[k]} want ${want[k]}`).join(', ')) : ok('L5 Flash 500/150, Go / No-go 3000 over the 180ms gate (v19 C.5 / C.6), wrong tap 200 in a Streak and 150 in a Set (v14 C.1–C.3)');
    /(this\.NOGO_WRONG_SET|NOGO_WRONG_STREAK)/.test(rx) && !/this\.NOGO_WRONG\b/.test(rx) ? ok('B.3 no bare NOGO_WRONG left to blur the two currencies') : bad('B.3 the two wrong-tap costs are separate constants');
    /* C.4 retired the three-wrong-taps ending for a STREAK at build 22; v18 (B.1c, L5) retires it for the Set and for a
       pass & play turn too, so the right assertion is now that there is no such test anywhere. A wrong tap is only a
       millisecond penalty — 150 on a Set's average, 200 out of a Streak's budget — and the two are still separate. */
    const enders = [...rx.matchAll(/[^\n]*wrong\s*>=\s*3[^\n]*/g)].map(m => m[0].trim()).filter(l => !/^(\/\/|\*|\/\*)/.test(l));
    (!enders.length && !/nogoEnd\(true\)/.test(rx)) ? ok('C.4 / B.1c no wrong-tap run-ender survives in either length — a wrong tap is only what it costs')
      : bad('B.1c the three-wrong-taps run-ender is retired outright', enders.join(' | ')); }
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
/* v17 (B.4, build 28): the first-play ghost now turns away everything it emits, and it ENDS ON "Ready?" on the first run
   of a game - so a test that drives liveCheck by hand, or expects an engine to reach its field, has to start from a
   profile that has already met that mode. This is every intro key the app can ask for. */
const SEEN_INTRO = (() => { const o = {}; for (const g of GAMES) { o[g] = 1; }
  for (const k of ['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead', 'hold:grow', 'hold:cut', 'sequence:solo',
    'timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'spot:count', 'spot:find']) o[k] = 1;
  return o; })();

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

/* v16 (A.3): a player's FIRST run of each game ends its intro with a "Ready?" that has to be tapped. Nothing else in the
   run is listening while it is up, so the driver answers it — and records that it saw one, which is the assertion below. */
const readySeen = new Set();
async function clearReady(g) {
  const on = await page.evaluate(() => document.getElementById('intro')?.classList.contains('ready'));
  if (!on) return false;
  readySeen.add(g); await down('#game'); return true;
}
let askedLine = '', askedTot = null;
async function driveToResult(g, label, ms = 90000, noTap = false) {
  askedLine = ''; askedTot = null;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const at = await onScreen(); if (at === 's-over' || at === 's-pass') break;
    if (await skipAd()) continue;
    if (at === null || (await inGame())) { if (!(await clearReady(g)) && !(await clearHeld(g)) && !noTap) await poke(g); }
    /* v14 (6.18) / v16 (§3): the Stopwatch Set no longer PRINTS what it has asked for — Aiden's note is that a Set is
       scored on the average and the running total is a Streak's business. The exact-mean deal is untouched, so the check
       reads it off the engine instead of off the screen, and `askedLine` still watches the DOM so the Streak can be
       asserted to keep its line and the Set to have lost it. */
    if (g === 'timing') { const t = await page.evaluate(() => document.getElementById('tmasked')?.textContent.trim() || ''); if (t) askedLine = t;
      const q = await page.evaluate(async () => { const M = await import('./games/timing/index.js'); const T = M.default; return T && T.ctx && T.targets && T.targets.length ? { asked: T.asked, all: T.askTot() } : null; }); if (q) askedTot = q; }
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
for (const s of ['s-board', 's-prog', 's-key', 's-custom', 's-about', 's-testing']) { await click('.back'); await sleep(250); await click(`[data-go="${s}"]`); await sleep(600); (await onScreen()) === s ? ok(`${s} opens`) : bad(`${s} opens`, 'on ' + (await onScreen())); }

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
let askedSet = '', askedSetTot = null, askedStreakLine = '';
const RUNS = [['quick-tap', 0, 0], ['dots', 0, 0], ['hold', 0, 0], ['hold', 0, 'streak'], ['sequence', 0, 0], ['timing', 0, 0], ['timing', 0, 'streak'], ['reaction', 0, 0], ['reaction', 0, 'streak'], ['spot', 0, 0], ['spot', 0, 'streak']];
for (const [g, mi, li] of RUNS) {
  const face = await openSheet(g, mi, li);
  const label = `${g} · ${face || '?'}`;
  if (!face) { bad(label, 'no length button'); continue; }
  await click('#go-btn');
  const at = await driveToResult(g, label, 90000, g === 'reaction' && li === 'streak');
  if (g === 'timing' && li === 0) { askedSet = askedLine; askedSetTot = askedTot; }   // the Set: 6.18 and §3 below
  if (g === 'timing' && li === 'streak') askedStreakLine = askedLine;                   // the Streak keeps its baseline (§3)
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
  if (!askedSetTot) bad('6.18 the Stopwatch Set deals to an exact total', 'the engine never reported one');
  else if (askedSetTot.all.toFixed(2) !== '35.00') bad('6.18 five rounds averaging 7s ask for 35.00s', 'the run asked for ' + askedSetTot.all + 's');
  else if (Math.abs(askedSetTot.asked - askedSetTot.all) > 0.005) bad('6.18 the last round lands on the stated total', askedSetTot.asked + ' of ' + askedSetTot.all);
  else ok(`6.18 Stopwatch · Set deals five targets totalling exactly ${askedSetTot.all.toFixed(2)}s — the exact-mean deal survives §3`);
  /* v18 (B.3d) REVERSES v16 §3, and B.2 is why. v16 took the baseline off the Set on the reasoning that a Set was scored
     on a MEAN and the total the game had asked for was decoration; B.2 makes the Set a TOTAL, so the total it was
     measured against is the thing it is measured against. The Streak loses it instead: its own HUD already carried two
     climbing second-figures and Aiden's note is that the third was noise. The assertion runs both ways, because
     "moved it" and "lost it" look identical from one side. */
  /^[\d.]+s of [\d.]+s asked$/.test(askedSet) ? ok(`B.3d Timing · Set carries the baseline it is now totalled against ("${askedSet}")`)
           : bad('B.3d the Stopwatch Set shows what it asked for', 'the line read "' + askedSet + '"');
  askedStreakLine ? bad('B.3d the Stopwatch Streak drops the targets line', 'it still showed "' + askedStreakLine + '"')
           : ok('B.3d Timing · Streak shows no targets line — the budget and the spend are the only two numbers left');
}
// v16 (A.3): the Ready gate appeared on the first run of a game — every game the driver played had to answer one
{
  const want = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
  const miss = want.filter(g => !readySeen.has(g));
  miss.length ? bad('A.3 "Ready?" ends the first intro of each game', 'never seen on: ' + miss.join(', '))
              : ok('A.3 a player\'s first run of each game ends its intro on "Ready?" (all seven)');
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
  // v18 (B.2 / B.4): the record is v2 and RUN_SCHEMA is 3 — two Timing scoring units changed, so the ladder gained a step
  // v19 (C.5 / C.6): the record is v3 and RUN_SCHEMA is 4 — Go / No-go's units changed, so the ladder gained its second step
  (ne && ne.v === 3 && Array.isArray(runs) && runs.every(r => r.v === 4)) ? ok('build-13 layout: migrated to `ne` v3, runs stamped RUN_SCHEMA 4') : bad('build-13 layout: ne v3 + run stamp', JSON.stringify({ v: ne && ne.v, stamps: runs && runs.map(r => r.v) }));
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
// v18 (B.2 / B.4): the ladder step. A v1 record's Timing · Stopwatch Sets and Hidden runs are in units the build no
// longer scores in, so they retire — and nothing else does
{
  const OLD = { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off', musicG: {} }, runs: [
    { t: NOW - 1000, g: 'timing', d: 'stopwatch', s: 5, n: '', v: 2, hits: 0.31, misses: 0 },
    { t: NOW - 2000, g: 'timing', d: 'hidden', s: 10, n: '', v: 2, hits: 210, misses: 0 },
    { t: NOW - 3000, g: 'timing', d: 'stopwatch', s: -1, n: '', v: 2, hits: 7, misses: 0 },
    { t: NOW - 4000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 2, hits: 14, misses: 0 } ],
    unlock: {}, ach: { tm_wall: NOW, first: NOW }, intro: {}, seen: {}, bars: { 'timing:hidden:10': NOW, 'quick-tap:two:5': NOW } } };
  if (await bootWith('a v1 record carrying pre-build-31 Timing runs', OLD, 's-menu')) {
    const ne = await getJSON('ne');
    const kinds = ne.runs.map(r => r.g + ':' + r.d + ':' + r.s).sort();
    const want = ['quick-tap:two:5', 'timing:stopwatch:-1'].join('|');
    /* the bars and the achievement STAY: they were converted at the measured pace, not retuned, so a player who cleared
       180px has cleared 1200ms. The RUNS go, because a stored `hits` in the old unit has nothing to be compared against. */
    // AMENDED at build 32: the survivors come out stamped 4 in a v3 record — up3 runs after up2 and touches none of these
    (ne.v === 3 && kinds.join('|') === want && ne.runs.every(r => r.v === 4) && ne.bars['timing:hidden:10'] && ne.bars['quick-tap:two:5'] && ne.ach.tm_wall && ne.ach.first)
      ? ok('B.2 / B.4 the v1 → v2 step retires the Stopwatch Set and the Hidden run whose units changed — the Stopwatch Streak and the Quick Tap run stay, and so do the cleared bars and the achievement, because those were converted rather than retuned')
      : bad('B.2 / B.4 the ladder step retires only the records that changed unit', JSON.stringify({ v: ne.v, kinds, bars: Object.keys(ne.bars), ach: Object.keys(ne.ach) }));
  }
}
const CORRUPT2 = { ne: { v: 1, prefs: { story: 1, played: 1, gridSeen: 1, allOpen: true, scale: 'foo', col: 42, snd: 'off', musicG: { dots: false, spot: 'yes' }, bg: '#123456', name: 12, adRuns: 'x', tint: 'red', lastGame: 'dots' }, runs: '{}', unlock: [], ach: null, intro: 'x', seen: 'x' } };
if (await bootWith('corrupt `ne` v1 (runs="{}", col=42, bg="#123456", name=12, adRuns="x")', CORRUPT2, 's-menu')) {
  const ne = await getJSON('ne'); const p = ne.prefs;
  const good = p.scale === 'penta' && p.bg === 'stars' && p.tint === '' && p.name === '' && p.adRuns === 0 && p.snd === 'off' && p.lastGame === 'dots' && p.allOpen === true && p.musicG.dots === false && !('spot' in p.musicG) && p.col['quick-tap'].sq === '#FFFFFF' && Array.isArray(ne.runs) && ne.runs.length === 0 && ne.seen && typeof ne.seen === 'object' && Object.keys(ne.ach).length === 0;   // seen was corrupt → null → boot reseeded it
  good ? ok('corrupt ne v1: each bad field fell back on its own; scale, bg, tint, name, adRuns, col, runs repaired, seen reseeded; snd, lastGame, allOpen, musicG.dots kept') : bad('corrupt ne v1: per-field fallback', JSON.stringify(ne).slice(0, 220));
}
const MANY = Array.from({ length: 650 }, (_, i) => ({ t: NOW - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 650 - i, misses: 0 }));
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
  // v17 (B.21, build 29): Achievements is the second TAB of Progress, so the walk is one more tap and one less screen
  await click('[data-go="s-prog"]'); await sleep(400); await click('#prog-tabs [data-tab="ach"]'); await sleep(400);
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
  await click('#s-prog .back'); await sleep(400);
  // 8.10: Testing is its own item below About, and About no longer carries it
  const moved = await page.evaluate(() => ({ item: !!document.querySelector('#s-menu [data-go="s-testing"]'),
    below: document.querySelector('#s-menu [data-go="s-about"]')?.nextElementSibling?.dataset.go,
    inAbout: document.querySelectorAll('#s-about [data-dev]').length, inTesting: document.querySelectorAll('#s-testing [data-act^="dev-"]').length }));
  // AMENDED at build 32 (v18 B.26): six animation buttons joined the four switches
  (moved.item && moved.below === 's-testing' && moved.inAbout === 0 && moved.inTesting === 10)
    ? ok('8.10 Testing is its own item directly below About, with all four switches and the six animation buttons, none left in About')
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
  /* v17 (B.9): THE COUNT IS DERIVED, here as well as in the app. It was a literal 31 in this file - so the gate would
     have gone red on the build that legitimately took Sequence from three key counts to two, and the honest way to hold
     the number is against the config that makes it. key-bars.js has to agree with it, which is C.6 below. */
  const N_COMBOS = k.want.length, N_BARS = Object.keys(KEY_BARS).length;
  (N_COMBOS === N_BARS) ? ok(`C.5 ${N_COMBOS} combinations today, and config/key-bars.js carries exactly that many rows`)
    : bad('C.5 the config and the bars disagree about how many combinations exist', `${N_COMBOS} vs ${N_BARS}`);
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
  (ui.screen === 's-key' && ui.nodes === GAMES.length && ui.segs === N_COMBOS) ? ok(`9.6 the ring draws ${ui.nodes} games and ${ui.segs} root segments — "${ui.count}"`) : bad('9.6 the key ring', JSON.stringify(ui));
  /* v17 (A.6): the count line is "{done} of {total} · {pct}%" now, and both halves come off progress/key.js. On this
     profile nothing is cleared, so A.6.2 says it reads 0% — never played contributes nothing, not a free ratio. */
  /^0 of \d+ · 0%$/.test((ui.count || '').trim()) ? ok(`A.6 the keys screen reads "${ui.count.trim()}" on a profile with no runs (A.6.2: never played is 0)`)
    : bad('A.6 the cleared count and the percentage together', JSON.stringify(ui.count));
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
    /* v17 (B.6 / B.7): FIFTEEN IN A ROW, in any Quick Tap · Two run. The pass is a Sprint - `s` came off `where` - with a
       row of 15 and misses on the record, which is the whole point: a miss resets the count, it does not disqualify the run.
       The fails are 14 in a row, 15 hits that were never consecutive, and Four itself. */
    out.qtFour = [t('quick-tap:four')({ ...qt(5, 20, 3), row: 15 }), t('quick-tap:four')({ ...qt(15, 30, 0), row: 14 }),
      t('quick-tap:four')({ ...qt(15, 15, 4), row: 6 }), t('quick-tap:four')({ ...qt(15, 20, 0), d: 'four', row: 15 })];
    // a record from BEFORE build 28 carries no `row` at all and is judged the old way, rather than being quietly un-earned
    out.qtFourLegacy = [t('quick-tap:four')(qt(15, 15, 0)), t('quick-tap:four')(qt(15, 14, 0)), t('quick-tap:four')(qt(15, 15, 1))];
    out.dtBlind = [t('dots:blind')(qt(30, 35, 2)), t('dots:blind')(qt(30, 34, 0))];
    out.dtLead = [t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 0, misses: 5 }), t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 9, misses: 4 })];
    out.hdGrow = [t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 0 }), t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 1 })];
    /* v16 (§2): the row asks for the FIRST NOTE WRONG, and the fixture had to change with the predicate. It used to be
       `hits: 0` — a score a Sequence run cannot reach, because `hits` is the longest pattern completed and derives from
       `round - 1` on a run that opens at round 3. The engine flags the run itself now, so the test reads the flag: set
       at any key count, absent on a run that answered its first note, and a high score with the flag still counts —
       getting the first note wrong on the FIRST try is the requirement, not scoring badly. */
    out.tmStop = [t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 2, firstWrong: 1 }),
      t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 3, hits: 2 }),
      t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 0 }),
      t('timing:stopwatch')({ g: 'timing', d: 'stopwatch', s: 5, hits: 2, firstWrong: 1 })];
    out.tmStop2 = [t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 3, hits: 2, firstWrong: 1 }), t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 12, firstWrong: 1 })];
    out.rxNogo = [t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 350 }), t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 351 })];
    out.spCount = [t('spot:count')({ g: 'reaction', d: 'nogo', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 400 })];
    // lengths, per mode — the numbers that differ between Blind and Lead are the whole reason for 1.0a
    const L = (g, d, i) => R.LEN_TEST[g + ':' + d][i];
    out.lens = { qtMar: [L('quick-tap', 'two', 2)({ hits: 24 }), L('quick-tap', 'two', 2)({ hits: 23 })],
      blindDash: [L('dots', 'blind', 1)({ hits: 40, misses: 9, row: 6 }), L('dots', 'blind', 1)({ hits: 40, misses: 0, row: 5 })],
      leadDash: [L('dots', 'lead', 1)({ hits: 40, misses: 9, row: 9 }), L('dots', 'lead', 1)({ hits: 40, misses: 0, row: 8 })],
      qtDash: [L('quick-tap', 'two', 1)({ hits: 40, misses: 9, row: 7 }), L('quick-tap', 'two', 1)({ hits: 40, misses: 0, row: 6 })],
      blindMar: [L('dots', 'blind', 2)({ hits: 24 }), L('dots', 'blind', 2)({ hits: 23 })],
      leadMar: [L('dots', 'lead', 2)({ hits: 28 }), L('dots', 'lead', 2)({ hits: 27 })],
      // v17 (B.8): 80% off was unreachable — the measured ceiling on a Cut round is 44.5%. Ten, one step either side
      cutStreak: [L('hold', 'cut', 1)({ y: 11 }), L('hold', 'cut', 1)({ y: 10 })],
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
  pair('B.6 / B.7 Quick Tap · Four opens at 15 IN A ROW in any Two run - a Sprint with misses counts, 14 in a row does not, and Four itself does not', V.qtFour);
  pair('B.6 a record from before build 28 carries no row and is judged the old way', V.qtFourLegacy);
  pair('1.2a Dots · Blind opens at 35 hits in any Quick Tap run', V.dtBlind);
  pair('1.2b Dots · Lead opens on 5 misses in a Blind run (deliberate failure, v15 0.5)', V.dtLead);
  pair('1.3a Estimate · Grow opens on a Dots run with nothing pressed at all', V.hdGrow);
  pair('1.4a / §2 Timing · Stopwatch opens on the first note wrong — not on a low score, and not from another game', V.tmStop);
  V.tmStop2.every(Boolean) ? ok('§2 the first note wrong opens it at 3 keys and at 7, and a long run that opened badly still counts')
    : bad('§2 the first-note flag is what the row reads', JSON.stringify(V.tmStop2));
  pair('1.4c Go / No-go opens at a 350ms Flash Set, not 351', V.rxNogo);
  // 1.4d is the one row with TWO ways in — a Flash Set or a Go / No-go Set, built as Aiden wrote it. Cowork's note is that
  // this collapses 1.4c into it; the shape of the test says plainly that both doors are open, so a later change is visible
  { const [nogo, flash, slow] = V.spCount;
    (nogo && flash && !slow) ? ok('1.4d Spot · Count opens on a Flash OR a Go / No-go Set under 350ms — both doors, per Aiden') : bad('1.4d Spot · Count', JSON.stringify(V.spCount)); }
  pair('1.1b Quick Tap Marathon asks 24 in a Dash', V.lens.qtMar);
  pair('B.6 Dots · Blind Dash asks 6 IN A ROW - a run with nine misses still qualifies, five in a row does not', V.lens.blindDash);
  pair('B.6 Dots · Lead Dash asks 9 in a row - the per-mode split (1.0a) is doing real work', V.lens.leadDash);
  pair('B.6 Quick Tap Dash asks 7 in a row', V.lens.qtDash);
  pair('1.2d Dots · Blind Marathon asks 24', V.lens.blindMar);
  pair('1.2f Dots · Lead Marathon asks 28', V.lens.leadMar);
  pair('B.8 Estimate · Cut Streak asks for one round more than 10% off — 80 could never fire', V.lens.cutStreak);
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
  { const kept = await page.evaluate(async (intro) => {
      const RUN = await import('./run/run.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
      S.store.unlock = {}; S.store.ach = {}; S.store.intro = intro; S.save();   // v17 (B.4): past the intro, or the ghost has the engine
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 15, vs: 0, practice: 0 });
      RUN.start(); RUN.liveCheck({ hits: 15, misses: 0, row: 15 }); RUN.abort();
      let raw = null; try { raw = JSON.parse(localStorage.getItem('ne')); } catch (e) {}
      return { unlock: raw && raw.unlock ? Object.keys(raw.unlock) : [] }; }, SEEN_INTRO);
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
  { await click('[data-go="s-prog"]'); await sleep(450);
    const u = await page.evaluate(async () => { const P = await import('./progress.js');
      const rows = [...document.querySelectorAll('#unl-list .urow')];
      const needs = rows.filter(r => r.classList.contains('lock') && !r.dataset.key).map(r => r.querySelector('small').textContent.trim());
      const known = new Set(P.UNLOCKS.map(x => x.need));
      const G = await import('./games/registry.js');
      for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (i) known.add(P.lenNeed(g, d, s)); });
      return { screen: document.querySelector('.screen.on')?.id, rows: rows.length, heads: document.querySelectorAll('#unl-list h4').length,
        stray: needs.filter(n => n && !known.has(n)) }; });
    (u.screen === 's-prog' && u.rows > 0 && u.heads === 3) ? ok(`2.4 the Unlocks tab lists ${u.rows} rows under ${u.heads} headings`) : bad('2.4 the Unlocks tab', JSON.stringify(u));
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
    // AMENDED at build 32 (v19 C.5): the Go / No-go gate is 180 now; Flash's three numbers and the Streak's wrong-tap cost did not move
    (f.early === 400 && f.free === 150 && f.bud === 500 && f.nogoFree === 180 && f.nogoWrong === 200)
      ? ok('3.5 / L5 an early Flash tap spends 400ms, held apart from Flash 500/150 and Go / No-go 3000 over the 180ms gate / 200')
      : bad('3.5 the Flash early-tap penalty', JSON.stringify(f)); }
  /* v18 (B.3a / B.4, L5) retunes both budgets v15 3.8 set. Stopwatch is 5s / 7.5s, not 25 / 30 - the 25 existed to let a
     run survive two ordinary attempts against a FLAT 7s target, and B.3b's targets climb a whole second a round instead.
     Hidden's is 700ms, not 100px: the ball crosses #gen in the same time on every phone and in a very different number
     of pixels, and 700 is 100px converted at the measured pace and rounded to a hundred. */
  { const s = S3.stopwatch;
    (s.early === 5 && s.late === 7.5 && s.hidden === 700 && s.txt === '5.00s')
      ? ok('B.3a / B.4 / L5 the Stopwatch Streak budget is 5s, 7.5s past round 10; Hidden is 700ms and the screen says so')
      : bad('B.3a / B.4 the Streak budgets', JSON.stringify(s)); }
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
  // build 30 (B.32): the track this game plays, the menu loop's own switch, and the preview that is on the track row
  await tap('#c-track button:nth-child(2)', 'customise · track'); await tap('#c-track button:last-child', 'customise · track preview');
  await tap('#c-menumusic button:nth-child(2)', 'customise · menu music off'); await tap('#c-menumusic button:nth-child(1)', 'customise · menu music on');
  await tap('#pvlock', 'customise · lock line');
  await sleep(400); await tap('#s-custom .back', 'customise · back');
  // scores: game, mode, length chips
  await tap('[data-go="s-board"]'); await tap('#bd-g [data-v="dots"]', 'board · game chip'); await tap('#bd-d [data-v="lead"]', 'board · mode chip'); await tap('#bd-s [data-v="15"]', 'board · length chip');
  await sleep(400); await tap('#s-board .back', 'board · back');
  // unlocks (build 23, v15 2.4): its own menu item now, above Achievements. The key row is the one that leads somewhere
  // with a single Back, which is why it is the row this taps
  await tap('[data-go="s-prog"]'); await sleep(300);
  await tap('#unl-list .urow.key', 'unlocks · the key row'); await sleep(400);
  (await onScreen()) === 's-key' ? ok('the Unlocks screen\'s key row opens the key') : bad('unlocks · key row', 'on ' + (await onScreen()));
  await tap('#s-key .back', 'key · back'); await sleep(300);
  // achievements: filter chip, a row that jumps to a sheet (Quick Tap · Clean · Sprint · Four)
  await tap('[data-go="s-prog"]'); await tap('#prog-tabs [data-tab="ach"]', 'progress · achievements tab'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  await tap('#ach-qt_clean5', 'achievements · jump row'); await sleep(300);
  (await onScreen()) === 's-pick' ? ok('achievement row jumps to its pick sheet') : bad('achievement row jumps to its pick sheet', 'on ' + (await onScreen()));
  await tap('#lvl-back', 'sheet · mode back'); await tap('#diff-row .choice:nth-child(2)', 'sheet · mode');
  await tap('#prac-row [data-prac]', 'sheet · practice from'); await tap('#grid', 'sheet · grid');
  // v17 (B.24, build 29): the chest is a control on the grid like any other. Locked here, so it says what it takes
  await tap('.chest', 'game select · chest'); await sleep(200);
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
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip-bd', 'chip-pv', 'chip-ach', 'chip-over', 'item', 'music-pv', 'pvlock', 'ach', 'unl', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done', 'lock-no', 'lock-go', 'nextup', 'egg', 'ptab', 'chest', 'track-pv'];
  const missing = expected.filter(a => !seen.has(a));
  missing.length ? bad('every data-act driven once', 'not driven: ' + missing.join(', ')) : ok(`every data-act driven once (${expected.length}) — not covered: again, pass-go, to-games, seqdone, praclock, dev-fresh, adskip, toast`);
}

/* ---- 8. build 27 (v16): the Timing unlock, the music engine, Find versus, the intro ---- */
console.log('\nbuild 27 — v16');
{
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);

  /* §1: every track plans. `plan` is the one arrangement engine — the review catalogue plays its output rather than
     carrying a second copy of the synth — so a track that plans to nothing is a track nobody can hear or review. */
  const P = await page.evaluate(async () => {
    const M = await import('./audio.js'); const A = await import('./config/audio.js');
    const out = { bad: [], n: 0, events: 0 };
    for (const id of Object.keys(A.TRACKS)) { const q = M.Music.plan(id);
      if (!q || !q.plan.length) { out.bad.push(id + ' (no events)'); continue; }
      // build 30: ten fields — the last three are the per-note lowpass, its Q and the hold (B.30)
      for (const [t, f, f1, ms, w, g, am, lp, q2, hold] of q.plan)
        if (![t, f, f1, ms, g, am, lp, q2, hold].every(Number.isFinite) || f <= 0 || f1 <= 0 || ms <= 0 || g <= 0 || !w || lp < 0 || hold < 0 || hold > 1) { out.bad.push(id + ' (bad event)'); break; }
      out.n++; out.events += q.plan.length; }
    return out; });
  P.bad.length ? bad('§1 every track plays', P.bad.join(', '))
    : ok(`§1 all ${P.n} tracks schedule cleanly — ${P.events} tone events across one loop each`);

  /* §2: THE TIMING UNLOCK. Get the first note of a Sequence run wrong and Timing · Stopwatch opens, at 3 and 7 keys (five
     is gone at build 28, B.9), and it is in the store BEFORE the run ends — the old row waited for a finish nobody sits
     through after failing on note one, and its predicate tested a score (`hits === 0`) a Sequence run cannot reach. */
  for (const keys of [3, 7]) {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1 }, ach: {}, intro: { 'sequence:solo': 1, sequence: 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const got = await page.evaluate(async k => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SQ = (await import('./games/sequence/index.js')).default;
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: k, vs: 0, practice: 0 });
      RUN.start();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 90; i++) { if (SQ.st === 'input') break; await wait(100); }
      if (SQ.st !== 'input') return { err: 'never reached input' };
      const wrong = (SQ.seq[0] + 1) % k;               // deliberately not the note it just played
      SQ.press(wrong);
      await wait(120);
      const mid = JSON.parse(localStorage.getItem('ne') || '{}');
      RUN.abort();                                      // quit before the run's own finish ever lands
      await wait(150);
      const after = JSON.parse(localStorage.getItem('ne') || '{}');
      return { mid: !!(mid.unlock || {})['timing:stopwatch'], after: !!(after.unlock || {})['timing:stopwatch'], first: SQ.badFirst }; }, keys);
    if (got.err) bad(`§2 Sequence · ${keys} keys, first note wrong`, got.err);
    else if (got.mid && got.after) ok(`§2 first note wrong on ${keys} keys unlocks Timing · Stopwatch mid-run, and it survives the quit`);
    else bad(`§2 first note wrong on ${keys} keys unlocks Timing`, JSON.stringify(got));
  }
  // and the other half of the same rule: a run that answers the first note CORRECTLY must not open it
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], unlock: { 'sequence:solo': 1 }, ach: {}, intro: { 'sequence:solo': 1, sequence: 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const got = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SQ = (await import('./games/sequence/index.js')).default;
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: 3, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 90; i++) { if (SQ.st === 'input') break; await wait(100); }
      SQ.press(SQ.seq[0]); await wait(120);
      const u = !!(JSON.parse(localStorage.getItem('ne') || '{}').unlock || {})['timing:stopwatch'];
      RUN.abort(); return u; });
    got ? bad('§2 a correct first note must not open Timing', 'it did') : ok('§2 answering the first note correctly does not open Timing');
  }

  /* §4: Spot · Find versus. The shapes are dealt ONCE and kept for the whole match, the two `.vz` bands (and the border
     between them that was the "mid line") are gone from the field, and the round lights in the owner's colour (L4). */
  {
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const f = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SP = (await import('./games/spot/index.js')).default;
      Object.assign(ST.sel, { game: 'spot', diff: 'find', secs: 10, vs: 2, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 120; i++) { if (SP.st === 'vsfind') break; await wait(100); }
      if (SP.st !== 'vsfind') { RUN.abort(); return { err: 'never reached the field' }; }
      const r1 = { o1: SP.o1, o2: SP.o2, base: SP.vsBase, moving: SP.pts.some(q => q.vx || q.vy || q.va), vz: document.querySelectorAll('#gen .vz').length };
      // take the round for player 2 by tapping their shape, then wait for the next round
      const i2 = SP.pts.findIndex(q => q.shape === SP.o2);
      const lit = (() => { const els = document.querySelectorAll('#gen .fs'); return els[i2]; })();
      const rect = document.getElementById('gen').getBoundingClientRect();
      const sz2 = SP.pts[i2].sz || SP.size;   // v17 (B.15): a crowd is not all one size any more
      SP.vsTap({ x: rect.left + SP.pts[i2].x + sz2 / 2, y: rect.top + SP.pts[i2].y + sz2 / 2 });
      const colour = lit.classList.contains('p2') && lit.classList.contains('odd');
      for (let i = 0; i < 60; i++) { if (SP.st === 'wait' || SP.st === 'vsfind') break; await wait(100); }
      await wait(3200);
      const r2 = { o1: SP.o1, o2: SP.o2, base: SP.vsBase, moving: SP.pts.some(q => q.vx || q.vy || q.va), round: SP.round, score: SP.vsN.slice() };
      RUN.abort();
      return { r1, r2, colour }; });
    if (f.err) bad('§4 Spot · Find versus reaches its field', f.err);
    else {
      (f.r1.o1 === f.r2.o1 && f.r1.o2 === f.r2.o2 && f.r1.base === f.r2.base)
        ? ok(`§4 both players keep the shape they were dealt for the whole match (P1 ${f.r1.o1}, P2 ${f.r1.o2}, crowd ${f.r1.base})`)
        : bad('§4 the shapes are dealt once', JSON.stringify([f.r1, f.r2]));
      f.r1.vz === 0 ? ok('§4 the mid line is gone — no .vz bands on the field, the score is one line in the HUD')
        : bad('§4 no mid line on the Find versus field', f.r1.vz + ' .vz bands still there');
      f.colour ? ok('§4 the round lights in the owner\'s colour (L4), not green') : bad('§4 the winning shape lights in its owner\'s colour');
      (!f.r1.moving && f.r2.moving) ? ok('§4 the crowd starts static and gains motion from round 2')
        : bad('§4 static first, moving after', JSON.stringify({ r1: f.r1.moving, r2: f.r2.moving, round: f.r2.round }));
      f.r2.score[1] === 1 ? ok('§4 a tap on your own shape takes the round (A.2)') : bad('§4 a tap on your own shape takes the round', JSON.stringify(f.r2.score));
    }
  }

  /* §5: the intro carries the line and nothing else — no sub-line, no word-by-word reveal — and the "Ready?" is on a
     fresh profile's first run of a game and gone on the second mode of that same game (A.3). */
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, allOpen: true }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const look = async (d) => page.evaluate(async m => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
      Object.assign(ST.sel, { game: 'quick-tap', diff: m, secs: 5, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
      /* WATCH it rather than sampling once. The ghost demo runs first and its length is the engine's own, and the two
         cases end differently: a first run of a game STOPS on Ready, a later mode closes the intro by itself and is
         already gone by the time a poll notices. So record what was seen while it was up, not what is there after. */
      const el = document.getElementById('intro');
      let sawOn = false, sawReady = false;
      for (let i = 0; i < 70; i++) { const on = el.classList.contains('on');
        if (on) sawOn = true;
        if (el.classList.contains('ready')) { sawReady = true; break; }
        if (sawOn && !on) break; await wait(150); }
      const t = document.getElementById('intro-text');   // clear() drops the classes, never the markup
      const out = { sawOn, sawReady,
        words: t.querySelectorAll('.w').length, subs: t.querySelectorAll('small:not(.rdy small)').length,
        text: (t.textContent || '').trim() };
      RUN.abort(); return out; }, d);
    const a = await look('two'); await sleep(300);
    const b = await look('four'); await sleep(300);
    (a.words === 0 && a.subs === 0) ? ok(`§5 the intro is one line, arriving as a line — "${a.text.split('Ready?')[0].trim()}"`)
      : bad('§5 the intro is one line with no word-by-word reveal', JSON.stringify(a));
    a.sawReady ? ok('A.3 the first run of Quick Tap ends its intro on "Ready?"') : bad('A.3 "Ready?" on the first run of a game', JSON.stringify(a));
    (b.sawOn && !b.sawReady) ? ok(`A.3 the second mode of the same game shows its one-liner and skips the Ready gate — "${b.text.split('Ready?')[0].trim()}"`)
      : bad('A.3 Ready is once per game, not once per mode', JSON.stringify(b));
  }
}


/* ---- 9. build 28 (v17 §B.1-§B.18): the chain and the scoring ---- */
console.log('\nbuild 28 - v17 sections B.1 to B.18');
{
  const root28 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const G28 = await import(pathToFileURL(path.join(root28, 'config', 'games.js')).href);
  const U28 = await import(pathToFileURL(path.join(root28, 'config', 'unlocks.js')).href);
  const A28 = await import(pathToFileURL(path.join(root28, 'config', 'achievements.js')).href);
  const C28 = await import(pathToFileURL(path.join(root28, 'config', 'copy.js')).href);
  const KB28 = await import(pathToFileURL(path.join(root28, 'config', 'key-bars.js')).href);

  // ---- B.9: five keys is gone from every table that could still offer it ----
  {
    const sq = G28.GAMES.sequence;
    const bad5 = [];
    if (sq.lens.includes(5)) bad5.push('GAMES.sequence.lens');
    if ((sq.vsLens || []).includes(5)) bad5.push('GAMES.sequence.vsLens');
    if (KB28.KEY_BARS['sequence:solo:5']) bad5.push('KEY_BARS');
    if ((U28.LEN_RULES['sequence:solo'] || []).length !== sq.lens.length) bad5.push('LEN_RULES rung count');
    const ach5 = A28.ACH.filter(a => a.g === 'sequence' && a.at && a.at.s === 5).map(a => a.id);
    if (ach5.length) bad5.push('ACH ' + ach5.join('/'));
    bad5.length ? bad('B.9 Sequence drops 5 keys everywhere', bad5.join(', '))
      : ok(`B.9 Sequence is ${sq.lens.join(' and ')} keys - solo, pass & play and versus, with no bar, no rung and no achievement left on five`);
  }
  // B.9: no literal 31 survives anywhere the count is stated
  {
    const strip28 = x => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    // build 29: unlocks.js is the Unlocks TAB of ui/screens/progress.js now (B.21), and it is still one of the four
    const files = ['progress/key.js', 'ui/screens/key.js', 'ui/screens/progress.js', 'ui/screens/menu.js'];
    const hits = files.filter(f => /\b31\b|thirty-one/i.test(strip28(fs.readFileSync(path.join(root28, f), 'utf8'))));
    hits.length ? bad('B.9 no literal 31 in the code that prints the count', hits.join(', '))
      : ok(`B.9 the count is read from the config in all ${files.length} files that print it - none of them knows a number`);
  }
  // B.9: a profile carrying 5-key runs boots, counts them toward nothing, and crashes nothing
  {
    // NB: no allOpen - lenLock returns null the moment it is set, and this check is about what a length asks for
    const old5 = { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [
      { t: Date.now(), g: 'sequence', d: 'solo', s: 5, hits: 14, misses: 0, v: 2 },
      { t: Date.now() - 1, g: 'sequence', d: 'solo', s: 3, hits: 4, misses: 0, v: 2 }],
      ach: {}, unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1 },
      intro: SEEN_INTRO, seen: {}, bars: { 'sequence:solo:5': Date.now() } };
    await setStorage({ ne: old5 });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const r = await page.evaluate(async () => {
      const K = await import('./progress/key.js'); const P = await import('./progress.js'); const S = await import('./core/store.js');
      return { screen: document.querySelector('.screen.on')?.id, runs: S.store.runs.length,
        combos: K.COMBOS.filter(c => c.g === 'sequence').map(c => c.s),
        orphan: K.barsOrphan(), missing: K.barsMissing(), pct: K.keyPct(),
        sevenOpen: !P.lenLock('sequence', 'solo', 7, true) };
    });
    (r.screen && r.runs === 2 && r.combos.join(',') === '3,7' && !r.orphan.length && !r.missing.length)
      ? ok(`B.9 a profile with 5-key runs boots clean - both runs kept, Sequence contributes ${r.combos.join(' and ')}, nothing orphaned`)
      : bad('B.9 stored 5-key runs count toward nothing and crash nothing', JSON.stringify(r));
    // the ladder is: 5 keys is gone, so a 14-round run at five does NOT open 7 keys - only 8 notes in 3 does
    (!r.sevenOpen) ? ok('B.9 a 5-key run no longer opens 7 keys - the rung is 8 notes in 3 keys now')
      : bad('B.9 a retired 5-key run must open nothing', 'it opened 7 keys');
  }

  // ---- B.4: no demo, ghost or scripted run earns anything ----
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, allOpen: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    const d = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { game: 'hold', diff: 'grow', secs: 7, vs: 0, practice: 0 });
      RUN.start();                                   // a fresh profile, so the first-play ghost plays a real round
      let sawDemo = false;
      const answerReady = () => { const el = document.getElementById('intro'); if (el && el.classList.contains('ready')) { RUN.introTap(); return true; } return false; };
      for (let i = 0; i < 60; i++) { if (RUN.R.demo) sawDemo = true; if (sawDemo && !RUN.R.demo) break; if (sawDemo) answerReady(); await wait(100); }
      // while the ghost has the engine, a record that WOULD earn "On the money" (live:1, one round within 2%) earns nothing
      const during = (() => { if (!RUN.R.demo) return null; RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 }); return Object.keys(S.store.ach); })();
      for (let i = 0; i < 90 && RUN.R.demo; i++) { answerReady(); await wait(100); }
      const afterDemo = { ach: Object.keys(S.store.ach), unlock: Object.keys(S.store.unlock), bars: Object.keys(S.store.bars), runs: S.store.runs.length };
      // and the same record, once the demo has handed over, DOES earn it - or this test proves nothing
      RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 });
      const afterReal = Object.keys(S.store.ach);
      RUN.abort();
      return { sawDemo, during, afterDemo, afterReal };
    });
    if (!d.sawDemo) bad('B.4 the first-play demo runs at all', 'R.demo never went true');
    else if (d.during && d.during.length) bad('B.4 a demo earns nothing mid-run', 'it banked ' + d.during.join(', '));
    else if (d.afterDemo.ach.length || d.afterDemo.unlock.length || d.afterDemo.bars.length || d.afterDemo.runs)
      bad('B.4 a whole first-play demo writes nothing to the store', JSON.stringify(d.afterDemo));
    else if (!d.afterReal.includes('hd_money')) bad('B.4 the same record earns normally once the demo hands over', JSON.stringify(d.afterReal));
    else ok('B.4 the first-play ghost advances no key, bar, unlock, achievement or board - and the same record earns the moment it is the player');
  }

  // ---- B.5: a length unlock announces, in every game with a rung and every game without one ----
  {
    const announced = [], silent = [];
    for (const [g, d, s] of [['quick-tap', 'two', 5], ['dots', 'blind', 5], ['hold', 'cut', 10], ['reaction', 'flash', 5]]) {
      await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [],
        ach: {}, unlock: { 'quick-tap:four': 1, 'dots:blind': 1, 'dots:lead': 1, 'hold:grow': 1, 'hold:cut': 1, 'sequence:solo': 1, 'timing:stopwatch': 1, 'timing:hidden': 1, 'reaction:flash': 1 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      const r = await page.evaluate(async (g, d, s) => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
        Object.assign(ST.sel, { game: g, diff: d, secs: s, vs: 0, practice: 0 });
        RUN.start();
        const next = RUN.R.lenNext;
        if (!next) { RUN.abort(); return { none: true }; }
        // a record that passes the rung, whatever the rung is
        // deliberately modest: a record that ALSO earns an achievement raises a second toast over the first, which is
        // real behaviour mid-run and would make this assertion read the wrong line
        const rec = { 'quick-tap:two': { hits: 18, misses: 2, row: 7 }, 'dots:blind': { hits: 18, misses: 2, row: 6 },
          'hold:cut': { hits: 5, y: 44 }, 'reaction:flash': { hits: 600 } }[g + ':' + d];
        RUN.liveCheck(rec);
        const t = document.getElementById('toast');
        const out = { key: next.key, on: t.classList.contains('on'), ok: t.classList.contains('ok'), text: t.textContent.trim(), fresh: RUN.R.fresh.slice() };
        RUN.abort(); return out;
      }, g, d, s);
      /* v18 (B.8) AMENDS THIS. B.5 gave every length rung a mid-run announcement; B.8 found that `lenNextLive` handed it
         EVERY LEN_TEST, monotone or not, and Reaction · Flash's rung is "a Set averaging over 500ms" — a whole-run claim
         that one slow attempt made true. `LEN_LIVE` is the flag, and Flash is the one row that carries 0. So "no live
         rung" is now the RIGHT answer for Flash and the wrong one for the other three, and the check says which. */
      const wantLive = !(g === 'reaction' && d === 'flash');
      if (r.none) (wantLive ? silent : announced).push(`${g}:${d} ${wantLive ? '(no live rung)' : 'correctly silent mid-run — B.8'}`);
      else if (!wantLive) silent.push(`${g}:${d} announced mid-run off a running average — B.8 says it must not`);
      else if (r.on && r.ok && /^Unlock/.test(r.text) && r.fresh.includes(r.key)) announced.push(`${g} "${r.text}"`);
      else silent.push(`${g}:${d} ${JSON.stringify(r)}`);
    }
    silent.length ? bad('B.5 a length unlock fires the green toast the moment it is met', silent.join(' | '))
      : ok(`B.5 / B.8 every MONOTONE length rung announces mid-run, and the one whose test is a whole-run average does not - ${announced.join(', ')}`);
  }
  // B.5: and the default "finish one run of the length before" rule lands at the FINISH, on the result screen
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: { 'quick-tap:two': 1, 'quick-tap': 1 }, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
    const r = await page.evaluate(async () => {
      const P = await import('./progress.js');
      const before = P.lenOpen('quick-tap', 'two', 15);
      const n = P.lenNextOf('quick-tap', 'two', 5);
      // a finished Sprint with 7 in a row opens Dash: the rung has a LEN_TEST, so it is the live kind
      const live = P.lenNextLive('quick-tap', 'two', 5);
      // Sequence's 7-keys rung is the live kind too; Estimate · Grow's Streak is the DEFAULT kind and has no live form
      const dflt = { next: !!P.lenNextOf('hold', 'grow', 7), live: !!P.lenNextLive('hold', 'grow', 7) };
      return { before, key: n && n.key, live: !!live, dflt };
    });
    (!r.before && r.key === 'quick-tap:two:15' && r.live && r.dflt.next && !r.dflt.live)
      ? ok('B.5 lenNextOf names the rung above any combination; lenNextLive answers only where a LEN_TEST can judge a partial run (Estimate Grow Streak correctly has no mid-run answer)')
      : bad('B.5 the two halves of a length unlock', JSON.stringify(r));
  }

  // ---- B.10: the Customise lock check, and what was actually leaking ----
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, supporter: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const S = await import('./core/store.js'); const P = await import('./progress.js'); const { ITEMS } = await import('./config/theme.js');
      const was = S.prefs.supporter;
      S.reset(); P.seedSeen();
      const nowSup = S.prefs.supporter, nowOpen = S.prefs.allOpen;
      const shouldLock = Object.values(ITEMS).flat().filter(i => i.by).length;
      const seen = S.store.seen || {};
      const unseeded = Object.entries(ITEMS).flatMap(([set, items]) => items.filter(i => !i.by).map(i => 'cos:' + set + ':' + i.v)).filter(k => !seen[k]);
      return { was, nowSup, nowOpen, shouldLock, unseeded };
    });
    (r.was && !r.nowSup && !r.nowOpen)
      ? ok(`B.10 Fresh game clears BOTH dev switches - supporter survived it before, and lockedBy() treats a supporter exactly like unlock-all, so a "fresh" profile showed all ${r.shouldLock} locked cosmetics open`)
      : bad('B.10 Fresh game clears supporter as well as allOpen', JSON.stringify(r));
    (!r.unseeded.length)
      ? ok('B.10 seedSeen() covers the cosmetics - an item that was open from the start no longer wears L8 green as if something had just earned it')
      : bad('B.10 an open-from-the-start cosmetic is seeded as seen', r.unseeded.join(', '));
  }

  // ---- B.11: nothing on the Achievements screen calls itself an unlock ----
  {
    const tiers = Object.keys(C28.TIERS);
    const rows = A28.ACH.map(a => a.tier);
    const strayTier = [...new Set(rows)].filter(t => !tiers.includes(t));
    const claims = tiers.filter(t => /unlock/i.test(C28.TIERS[t][0]));
    // the chain is the one place an unlock lives, and every row in it opens a game, a mode or a length
    const opens = U28.UNLOCKS.every(u => { const [g, d] = u.key.split(':'); return !!G28.GAMES[g] && (u.key === 'sequence:practice' || G28.GAMES[g].modes.includes(d)); });
    (!strayTier.length && !claims.length && opens)
      ? ok(`B.11 no achievement tier calls itself an unlock (${tiers.join(' / ')}), and every row in UNLOCKS opens a game, a mode or a length`)
      : bad('B.11 a row listed as an unlock that opens nothing', JSON.stringify({ strayTier, claims, opens }));
  }

  // ---- B.12: Stopwatch runs to ten seconds over, and going the distance is a secret row ----
  {
    (G28.CFG.swOver === 10) ? ok('B.12 a Stopwatch attempt runs to 10 seconds past its target, was 5') : bad('B.12 CFG.swOver', String(G28.CFG.swOver));
    const a = A28.ACH.find(x => x.id === 'tm_s10');
    (a && a.tier === 'secret' && a.hint && a.live === 1 && a.g === 'timing')
      ? ok(`B.12 the new secret row "${a.name}" is described, is live (ov can only become more true) and is Timing's`)
      : bad('B.12 the secret row for letting the clock run out', JSON.stringify(a));
    const r = await page.evaluate(async () => {
      const R = await import('./progress/rules.js');
      return [R.ACH_TEST.tm_s10({ g: 'timing', d: 'stopwatch', s: 5, ov: 1 }),
        R.ACH_TEST.tm_s10({ g: 'timing', d: 'stopwatch', s: 5 }),
        R.ACH_TEST.tm_s10({ g: 'timing', d: 'hidden', s: 10, ov: 1 })]; });
    (r[0] && !r[1] && !r[2]) ? ok('B.12 the row reads the engine’s own ov flag, Stopwatch only') : bad('B.12 the ov predicate', JSON.stringify(r));
  }

  // ---- B.13: the Sequence HUD. Fixed-width slots, and "best" clear of the score ----
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const S = await import('./core/store.js');
      S.store.runs = [{ t: Date.now(), g: 'sequence', d: 'solo', s: 3, hits: 9, misses: 0, v: 2 }]; S.save();
      Object.assign(ST.sel, { game: 'sequence', diff: 'solo', secs: 3, vs: 0, practice: 0 });
      RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms)); await wait(400);
      const t = document.getElementById('hud-time'), sc = document.getElementById('score'), gh = document.getElementById('pbghost');
      const at = () => { const r = sc.getBoundingClientRect(); return Math.round(r.left) + ':' + Math.round(r.width); };
      t.textContent = 'round 12 · watch'; const a = at();
      t.textContent = 'your turn'; const b = at();
      t.textContent = 'round 4 · watch'; const c = at();
      const sr = sc.getBoundingClientRect(), gr = gh.getBoundingClientRect();
      const overlap = gh.classList.contains('on') && !(gr.top >= sr.bottom || gr.bottom <= sr.top);
      const ghostOn = gh.classList.contains('on');
      RUN.abort(); return { a, b, c, overlap, ghostOn, ghostTop: Math.round(gr.top), scoreBottom: Math.round(sr.bottom) };
    });
    (r.a === r.b && r.b === r.c) ? ok(`B.13 the Sequence round marker does not move the score - "watch" and "your turn" both leave it at ${r.a}`)
      : bad('B.13 fixed-width HUD slots', JSON.stringify(r));
    (r.ghostOn && !r.overlap) ? ok(`B.13 "best" sits clear of the score (${r.scoreBottom} → ${r.ghostTop}), not behind it`)
      : bad('B.13 the best-ghost is separated from the score', JSON.stringify(r));
  }

  // ---- B.15: the Spot ramp. The crowd is the difficulty, not the clock ----
  {
    const R = G28.SPOT_RAMP;
    const kp = fs.readFileSync(path.join(root28, 'games', 'spot', 'index.js'), 'utf8');
    const padFromCap = /length:\s*SPOT_RAMP\.nCap\s*\+\s*1/.test(kp);
    padFromCap ? ok(`B.15 the keypad is built from SPOT_RAMP.nCap (${R.nCap}), so the band can never deal a count the player cannot answer`)
      : bad('B.15 the keypad must read the cap', 'it carries its own length');
    // the flash falls far slower and stops far higher than the curve Aiden called "ends too hard"
    const oldFall = 1200 - 70 * 10, newFall = Math.max(R.flashMin, R.flashMax - R.flashPer * 9);
    (R.flashPer <= 70 / 2 && newFall >= 850) ? ok(`B.15 viewing time is no longer the lever - round 10 flashes for ${newFall}ms where it used to flash for ${oldFall}ms`)
      : bad('B.15 the flash must stop carrying the difficulty', `${R.flashPer}ms a round, round 10 = ${newFall}ms`);
    const r = await page.evaluate(async () => {
      const SP = (await import('./games/spot/index.js')).default;
      const out = []; for (let i = 1; i <= 12; i++) { const x = SP.ramp(i); out.push({ r: i, lo: x.lo, hi: x.hi, dip: x.dip, n: x.n, decoys: x.decoys, flash: x.flash, sizeVar: +x.sizeVar.toFixed(3) }); }
      return out; });
    const dips = r.filter(x => x.dip);
    const rising = r.every((x, i) => !i || x.decoys >= r[i - 1].decoys || r[i - 1].dip);
    const banded = r.every(x => x.n >= x.lo && x.n <= x.hi && x.hi <= G28.SPOT_RAMP.nCap);
    const fewer = dips.every(x => { const prev = r[x.r - 2]; return prev && x.n <= prev.hi && x.decoys > prev.decoys; });
    (dips.length >= 2 && rising && banded && fewer)
      ? ok(`B.15 the target count is dealt from a rising band (round 10: ${r[9].lo}-${r[9].hi}) and rounds ${dips.map(d => d.r).join(', ')} deal the floor among more decoys - fewer targets, bigger crowd`)
      : bad('B.15 the reworked curve', JSON.stringify({ dips: dips.length, rising, banded, fewer }));
    (r[2].sizeVar > 0 && r[9].sizeVar > r[2].sizeVar) ? ok(`B.15 size variation arrives at round ${G28.SPOT_RAMP.sizeFrom} and grows (±${Math.round(r[9].sizeVar * 100)}% by round 10)`)
      : bad('B.15 size variation', JSON.stringify(r.map(x => x.sizeVar)));
  }

  // ---- B.16: every shape's full bounds stay inside the field, rotation and pulse included ----
  {
    for (const [mode, secs, vs] of [['find', 10, 0], ['count', 10, 0], ['find', 10, 2]]) {
      await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      const r = await page.evaluate(async (mode, secs, vs) => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const SP = (await import('./games/spot/index.js')).default;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        Object.assign(ST.sel, { game: 'spot', diff: mode, secs, vs, practice: 0 });
        RUN.start();
        for (let i = 0; i < 120; i++) { if (SP.st === 'find' || SP.st === 'vsfind' || SP.st === 'flash') break; await wait(100); }
        if (!['find', 'vsfind', 'flash'].includes(SP.st)) { RUN.abort(); return { err: 'never reached a field, st=' + SP.st }; }
        SP.round = 9;                                   // late-round motion, rotation and size spread
        const gen = document.getElementById('gen'); const out = { frames: 0, shapes: 0, worst: 0, bad: 0 };
        for (let f = 0; f < 40; f++) {
          const rect = gen.getBoundingClientRect();
          for (const q of SP.pts) { const sz = q.sz || SP.size;
            const m = q.va ? sz * (Math.SQRT2 - 1) / 2 : 0;
            const over = Math.max(-(q.x - m), (q.x + sz + m) - rect.width, -(q.y - m), (q.y + sz + m) - rect.height);
            out.shapes++; if (over > 1) { out.bad++; out.worst = Math.max(out.worst, Math.round(over)); } }
          out.frames++; await wait(40); }
        RUN.abort(); return out;
      }, mode, secs, vs);
      if (r.err) bad(`B.16 Spot · ${mode}${vs ? ' versus' : ''} reaches a field`, r.err);
      else (!r.bad) ? ok(`B.16 Spot · ${mode}${vs ? ' versus' : ''} - ${r.shapes} shape-frames, every one fully inside the field (rotation swept box included)`)
        : bad(`B.16 a shape left the field in Spot · ${mode}${vs ? ' versus' : ''}`, `${r.bad} of ${r.shapes} shape-frames, worst ${r.worst}px out`);
    }
  }

  // ---- B.17: the Ready gate on a genuinely first Spot run. Investigation, both directions ----
  {
    const look = async (intro, mode) => {
      await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro, seen: {}, bars: {} } });   // B.17 drives the gate itself
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(350);
      return page.evaluate(async mode => {
        const RUN = await import('./run/run.js'); const ST = await import('./core/state.js');
        Object.assign(ST.sel, { game: 'spot', diff: mode, secs: 10, vs: 0, practice: 0 });
        RUN.start(); const wait = ms => new Promise(r => setTimeout(r, ms));
        const el = document.getElementById('intro'); let sawOn = false, sawReady = false;
        for (let i = 0; i < 60; i++) { if (el.classList.contains('on')) sawOn = true; if (el.classList.contains('ready')) { sawReady = true; break; } if (sawOn && !el.classList.contains('on')) break; await wait(120); }
        RUN.abort(); return { sawOn, sawReady };
      }, mode); };
    const first = await look({}, 'count');
    const second = await look({ spot: 1, 'spot:count': 1 }, 'find');
    (first.sawOn && first.sawReady) ? ok('B.17 Spot DOES show "Ready?" on a genuinely first run - no bug; build 27 made the gate once per GAME (A.3), so Find skipping it after Count is by design')
      : bad('B.17 Spot shows Ready on a genuinely first run', JSON.stringify(first));
    (second.sawOn && !second.sawReady) ? ok('B.17 and the second mode of Spot shows its one-liner without the gate, which is the rule working')
      : bad('B.17 Ready is once per game, not once per mode', JSON.stringify(second));
  }

  // ---- B.18 / A.6: percentage complete ----
  {
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r = await page.evaluate(async () => {
      const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const floorC = K.COMBOS.find(c => c.bar && c.bar.dir === 'higher');
      const ceilC = K.COMBOS.find(c => c.bar && c.bar.dir === 'lower');
      const put = (c, hits) => { S.store.runs.unshift({ t: Date.now(), g: c.g, d: c.d, s: c.s, hits, misses: 0, v: 2 }); };
      const reset = () => { S.store.runs = []; S.store.bars = {}; S.save(); };
      reset(); const zero = K.keyPct();                                   // A.6.2: never played is 0
      reset(); put(floorC, floorC.bar.bar * 0.5); const half = K.credit(floorC);
      reset(); put(floorC, floorC.bar.bar * 10); const capped = K.credit(floorC);   // A.6.1: 0.9 is the cap while uncleared
      reset(); S.store.bars[floorC.key] = Date.now(); const done = K.credit(floorC);
      reset(); put(ceilC, 0); const zeroBest = K.credit(ceilC);           // A.6.3: guard the divide
      reset(); put(ceilC, ceilC.bar.bar * 2); const ceilHalf = K.credit(ceilC);
      reset(); for (const c of K.COMBOS) S.store.bars[c.key] = Date.now(); const whole = K.keyPct();
      reset();
      return { zero, half: +half.toFixed(3), capped, done, zeroBest, ceilHalf: +ceilHalf.toFixed(3), whole,
        floor: floorC.key, ceil: ceilC.key, total: K.COMBOS.length }; });
    const okPct = r.zero.pct === 0 && r.done === 1 && r.capped === 0.9 && r.zeroBest === 0
      && Math.abs(r.half - 0.5) < 0.02 && Math.abs(r.ceilHalf - 0.5) < 0.02 && r.whole.pct === 100 && r.whole.done === r.total;
    okPct ? ok(`A.6 percentage complete over ${r.total} combinations - never played 0 (A.6.2), half a floor bar 0.5, ten times the bar still capped at 0.9 (A.6.1), a zero best guarded to 0 (A.6.3), cleared 1, all cleared 100%`)
      : bad('A.6 the percentage', JSON.stringify(r));
    // A.6.5 / A.6.7: the same line on the menu as on the keys screen, and nothing on a profile with no runs
    const m = await page.evaluate(async () => {
      const S = await import('./core/store.js'); const P = await import('./progress.js');
      S.store.runs = []; S.prefs.played = 0; S.prefs.allOpen = false; S.save();
      const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 250));
      const first = document.getElementById('menu-key').hidden;
      S.store.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 6, misses: 0, v: 2 }]; S.prefs.played = 1; S.save();
      R.show('s-menu'); await new Promise(r => setTimeout(r, 250));
      const el = document.getElementById('menu-key');
      return { first, hidden: el.hidden, text: el.textContent.trim() }; });
    // AMENDED at build 32 (v18 B.15, amending A.6.5): the menu says "N% complete" — the cleared count stays on the keys screen
    (m.first && !m.hidden && /^\d+% complete$/.test(m.text))
      ? ok(`A.6.7 / B.15 the menu carries "${m.text}" once a profile has played - and nothing before that`)
      : bad('A.6.7 percentage complete on the menu', JSON.stringify(m));
  }

  // ---- B.1: the three running totals ----
  {
    // Spot · Find: the total is floored at zero. Ten instant finds used to run a Set to -4.71s and a Streak could not end
    await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const f = await page.evaluate(async () => {
      const SP = (await import('./games/spot/index.js')).default;
      const src = SP.onDown.toString();
      return { floored: /this\.tot\s*=\s*Math\.max\(\s*0\s*,/.test(src.replace(/\s+/g, ' ')) };
    });
    f.floored ? ok('B.1 Spot · Find’s running total is floored at zero - the 0.5s rebate (6.30) survives, the unbounded negative does not')
      : bad('B.1 Find’s total must not go negative', 'the floor is missing');
    // and the sheet lines say what the engines actually score
    const cut = G28.SET_COPY['hold:cut'].set, find = G28.SET_COPY['spot:find'].set;
    (/average/.test(cut) && /free/.test(find))
      ? ok(`B.1 the sheet says what is scored - Cut "${cut}", Find "${find}"`)
      : bad('B.1 the Set lines match the engines', JSON.stringify({ cut, find }));
  }

  // ---- B.2 / B.3: the Estimate round result ----
  {
    const src = fs.readFileSync(path.join(root28, 'games', 'estimate', 'index.js'), 'utf8');
    const flat = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const iRes = flat.indexOf("$('#hres')"), iDiff = flat.indexOf("$('#hdiff')", flat.indexOf('chain.then'));
    (iRes > 0 && iDiff > 0 && iRes < iDiff) ? ok('B.2 the round result shows HIS % first, then the difference, then the 800ms hold, then the drain')
      : bad('B.2 the % lands before the difference', `hres at ${iRes}, hdiff at ${iDiff}`);
    /pause\(diffHtml\?800:100\)/.test(flat) ? ok('B.2 the 800ms hold is between the difference and the drain') : bad('B.2 the 800ms hold');
    /* every write to the footer, listed. The only value allowed on a ROUND is empty; the one message left is the
       correction when a drag misses the shape entirely, which is not a label and would leave a failed cut silent. */
    const writes = [...flat.matchAll(/\$\('#hlbl'\)\.innerHTML\s*=\s*([^;]+);/g)].map(m => m[1].trim());
    const stray = writes.filter(v => v !== "''" && !/^T\(CP\.missed/.test(v));
    (!stray.length && writes.length) ? ok(`B.3 no footer line on an Estimate round - ${writes.length} writes to #hlbl, every one of them empty bar the missed-drag correction`)
      : bad('B.3 the Estimate footer line is deleted', 'the engine still writes ' + stray.join(' | '));
    (!C28.ESTIMATE.sameShape && !C28.ESTIMATE.sameArea && !C28.ESTIMATE.watch) ? ok('B.3 the four retired strings are out of config/copy.js, not merely unused')
      : bad('B.3 the retired Estimate strings', JSON.stringify(Object.keys(C28.ESTIMATE)));
  }
}

/* ---- 10. build 29 (v17 §B.19–§B.26): the front of the app ---- */
console.log('\nbuild 29 - v17 sections B.19 to B.26');
{
  const root29 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const V29 = await import(pathToFileURL(path.join(root29, 'config', 'verdicts.js')).href);
  const AU29 = await import(pathToFileURL(path.join(root29, 'config', 'audio.js')).href);
  const TH29 = await import(pathToFileURL(path.join(root29, 'config', 'theme.js')).href);
  const C29 = await import(pathToFileURL(path.join(root29, 'config', 'copy.js')).href);
  const html29 = fs.readFileSync(path.join(root29, 'index.html'), 'utf8');
  const css29 = fs.readFileSync(path.join(root29, 'styles', 'app.css'), 'utf8');

  // ---- B.20: the first-run menu line is gone from the markup AND from the copy, not merely unrendered ----
  {
    const inHtml = /menu-note/.test(html29), inCopy = C29.MENU.note !== undefined, inCss = /\.menu-note\s*\{/.test(css29);
    (!inHtml && !inCopy && !inCss) ? ok('B.20 "play one run · the rest opens" is gone - the element, the copy row and the rule')
      : bad('B.20 the first-run menu line', JSON.stringify({ inHtml, inCopy, inCss }));
  }
  // ---- B.21: one menu item, two tabs, and the two old screens are gone from the document ----
  {
    const m = await page.evaluate(() => ({
      items: [...document.querySelectorAll('#s-menu .item')].map(b => b.textContent.trim()),
      prog: !!document.getElementById('s-prog'), old: !!document.getElementById('s-unl') || !!document.getElementById('s-ach'),
      tabs: [...document.querySelectorAll('#prog-tabs .chip')].map(c => c.dataset.tab) }));
    (m.prog && !m.old && m.items.includes('Progress') && !m.items.includes('Unlocks') && !m.items.includes('Achievements') && m.tabs.join() === 'unl,ach')
      ? ok(`B.21 one menu item - ${m.items.join(' · ')} - with tabs ${m.tabs.join(' / ')}, Unlocks first (2.2)`)
      : bad('B.21 Unlocks and Achievements are one item with two tabs', JSON.stringify(m));
    const files = fs.readdirSync(path.join(root29, 'ui', 'screens'));
    (!files.includes('unlocks.js') && !files.includes('achievements.js') && files.includes('progress.js'))
      ? ok('B.21 one screen file, not a host importing two (A4)') : bad('B.21 the two screen files are merged', files.join(', '));
  }
  // B.21: the tab is remembered, and the tab that is up is the one that is rendered
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(400);
    const a = await page.evaluate(() => ({ unl: !document.getElementById('p-unl').hidden, rows: document.querySelectorAll('#unl-list .urow').length }));
    await click('#prog-tabs [data-tab="ach"]'); await sleep(400);
    const b = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden, rows: document.querySelectorAll('#achlist .a').length, stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }));
    await click('#s-prog .back'); await sleep(300); await click('[data-go="s-prog"]'); await sleep(400);
    const c = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden }));
    (a.unl && a.rows > 0 && b.ach && b.rows > 0 && b.stored === 'ach' && c.ach)
      ? ok(`B.21 both tabs render (${a.rows} unlock rows, ${b.rows} achievements) and the last tab is remembered`)
      : bad('B.21 the tabs', JSON.stringify({ a, b, c }));
  }
  // ---- B.19: "tap to begin" sits higher and fades at 1.5x the old pace. L1 - placement and pace only ----
  {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(5200);
    const h = await page.evaluate(() => { const el = document.getElementById('storyhint'); const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { dur: cs.animationDuration, delay: cs.animationDelay, top: Math.round(r.top), vh: window.innerHeight, text: el.textContent.trim(),
        lines: [...document.querySelectorAll('#s-menu .stline')].map(x => x.textContent.trim()), title: (document.getElementById('wordmark') || {}).textContent };
    });
    (h.dur === '1.2s' && h.delay === '4.6s') ? ok(`B.19 "tap to begin" fades over ${h.dur}, 1.5x the old .8s, still last of the four beats`)
      : bad('B.19 the fade is 1.5x', JSON.stringify({ dur: h.dur, delay: h.delay }));
    (h.top < h.vh * 0.75 && h.top > h.vh * 0.5) ? ok(`B.19 it sits toward the middle - ${Math.round(100 * h.top / h.vh)}% down, was pinned to the bottom edge`)
      : bad('B.19 it sits higher', `top ${h.top} of ${h.vh}`);
    (h.text === 'tap to begin' && h.lines.length === 2 && /NO EXCUSES/i.test(h.title || '')) ? ok('B.19 / L1 nothing removed or shortened - both story lines, the title and the hint')
      : bad('B.19 / L1 the sequence is intact', JSON.stringify(h.lines));
  }
  // ---- B.22 / B.23 / B.24: the grid - the pressed outline, the path, the chest ----
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(800);
    // B.22 - the outline is the named colour, and it is neither L8's green nor L7's white
    await click('.tile[data-game="dots"]'); await sleep(400);
    const pr = await page.evaluate(() => { const t = document.querySelector('.tile[data-game="dots"]');
      const cs = getComputedStyle(t.querySelector('.pic'));
      return { keep: t.classList.contains('keep'), col: cs.outlineColor, width: cs.outlineWidth,
        press: getComputedStyle(document.documentElement).getPropertyValue('--press').trim(),
        ok: getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() }; });
    const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    (pr.keep && pr.col === hex2rgb(TH29.PRESS.v) && pr.press === TH29.PRESS.v && pr.col !== hex2rgb(pr.ok) && !/255, 255, 255/.test(pr.col))
      ? ok(`B.22 the pressed game wears an ${TH29.PRESS.name} outline (${pr.col}, ${pr.width}) - named in config/theme.js, not green (L8) and not white (L7)`)
      : bad('B.22 the pressed outline', JSON.stringify(pr));
    await click('#grid'); await sleep(400);
    // B.23 - the snake, Sequence directly under Estimate, and a line per step coloured by whether the next game is open
    const gr = await page.evaluate(async () => {
      const P = await import('./progress.js'); const R = await import('./games/registry.js');
      const order = Object.keys(R.GAMES);
      const cell = g => { const t = document.querySelector(`.tile[data-game="${g}"]`); return { r: +t.style.gridRow, c: +t.style.gridColumn }; };
      const at = Object.fromEntries(order.map(g => [g, cell(g)]));
      const chest = document.querySelector('.chest');
      const segs = [...document.querySelectorAll('#gridlines .gl')].map(p => { const d = p.getAttribute('d').match(/-?[\d.]+/g).map(Number);
        return { len: Math.round(Math.hypot(d[2] - d[0], d[3] - d[1])), open: p.classList.contains('open') }; });
      return { at, chest: { r: +chest.style.gridRow, c: +chest.style.gridColumn }, segs, order,
        opens: order.map(g => P.gameOpen(g)), cols: getComputedStyle(document.getElementById('grid')).gridTemplateColumns.trim().split(/\s+/).length };
    });
    const seq = gr.at.sequence, est = gr.at.hold;
    (seq.c === est.c && seq.r === est.r + 1) ? ok(`B.23 Sequence sits directly under Estimate (row ${est.r} col ${est.c} -> row ${seq.r}) so the path folds instead of jumping the row`)
      : bad('B.23 Sequence moves under Estimate', JSON.stringify({ est, seq }));
    // every step is one cell: the snake is what makes a straight line between neighbours possible at all
    const steps = gr.order.map(g => gr.at[g]).concat([gr.chest]);
    const jumps = steps.slice(1).map((p, i) => Math.abs(p.r - steps[i].r) + Math.abs(p.c - steps[i].c)).filter(d => d !== 1);
    (!jumps.length) ? ok(`B.23 every step of the order is one cell - a ${gr.cols}-column snake, ${steps.length} stops ending at the chest`)
      : bad('B.23 the order runs through neighbouring cells', jumps.join(', '));
    (gr.segs.length === gr.order.length && gr.segs.every(s => s.len > 4))
      ? ok(`B.23 ${gr.segs.length} lines drawn, shortest ${Math.min(...gr.segs.map(s => s.len))}px - one per step including the chest`)
      : bad('B.23 a line per step', JSON.stringify(gr.segs));
    const wrong = gr.segs.slice(0, gr.order.length - 1).map((s, i) => s.open === gr.opens[i + 1] ? null : gr.order[i + 1]).filter(Boolean);
    (!wrong.length) ? ok('B.23 a segment is green where the game it leads to is open and grey where it is locked')
      : bad('B.23 the line colour follows the next game', wrong.join(', '));
    // B.24 - locked: the requirement is key 1's own count, and NOTHING about pro or author is anywhere on the grid (A.1)
    const ch = await page.evaluate(async () => { const K = await import('./progress/key.js'); const st = K.keyState();
      const el = document.querySelector('.chest');
      return { cls: el.className, need: el.querySelector('.pic').dataset.need, total: st.total, done: st.done,
        text: (document.getElementById('s-pick').innerText || '') + ' ' + (el.querySelector('.pic').dataset.need || '') }; });
    (/locked/.test(ch.cls) && ch.need === `clear all ${ch.total} · ${ch.done} so far`)
      ? ok(`B.24 the chest is locked and says what key 1 asks for: "${ch.need}"`) : bad('B.24 the locked chest', JSON.stringify(ch));
    (!/\bpro\b|author/i.test(ch.text)) ? ok('B.24 / A.1 nothing about the pro or author tiers is on the grid before the chest is opened')
      : bad('A.1 the grid mentions pro or author', ch.text.slice(0, 120));
  }
  // B.24: every bar cleared -> the chest is openable, opens once, stores it, and says Gauntlet is not built yet
  {
    const bars = await page.evaluate(async () => { const K = await import('./progress/key.js'); const o = {}; for (const c of K.COMBOS) o[c.key] = Date.now(); return o; });
    // AMENDED at build 32: a v3 record — a v1 one would run up3, which drops the Go / No-go Streak bar's flag and leaves 29 of 30
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const before = await page.evaluate(() => ({ cls: document.querySelector('.chest').className, need: document.querySelector('.chest .pic').dataset.need }));
    // AMENDED at build 32 (v18 B.20): a ready chest ASKS first — "Open the chest?" — and the opening runs 1.6s where it ran .9s
    await click('.chest'); await sleep(300);
    const asked = await page.evaluate(() => ({ on: document.getElementById('askwrap').classList.contains('on'), title: document.getElementById('ask-title').textContent.trim() }));
    (asked.on && asked.title === 'Open the chest?') ? ok(`B.20 a whole key's chest asks first - "${asked.title}"`) : bad('B.20 the chest asks before it opens', JSON.stringify(asked));
    await click('#ask-yes'); await sleep(2000);
    const after = await page.evaluate(() => ({ cls: document.querySelector('.chest').className, need: document.querySelector('.chest .pic').dataset.need,
      lid: getComputedStyle(document.querySelector('.chest .lid')).rotate, toast: document.getElementById('toast').textContent.trim(),
      stored: JSON.parse(localStorage.getItem('ne')).prefs.chest1 }));
    (/ready/.test(before.cls) && before.need === 'tap to open') ? ok('B.24 every bar cleared and the chest is openable') : bad('B.24 the openable chest', JSON.stringify(before));
    (/open/.test(after.cls) && after.stored === 1 && after.need === 'Gauntlet — coming soon' && /Gauntlet/.test(after.toast))
      ? ok(`B.24 it opens once and for good - "${after.toast}", lid ${after.lid}`) : bad('B.24 opening the chest', JSON.stringify(after));
    (!/\bpro\b|author/i.test(after.need + ' ' + after.toast)) ? ok('B.24 / A.1 an opened chest says only what it gave') : bad('A.1 the opened chest', after.need);
    // and it stays open across a reload, because it is progress and not a screen state
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400); await click('[data-go="s-pick"]'); await sleep(600);
    (await page.evaluate(() => document.querySelector('.chest').classList.contains('open'))) ? ok('B.24 the chest is still open after a reload') : bad('B.24 the chest is stored');
  }
  // ---- B.25: one table of thresholds and lines, four tiers, five lines each, a colour and a sound per tier ----
  {
    const ids = V29.VERDICT_TIERS.map(t => t.id);
    const bad25 = [];
    for (const [k, row] of Object.entries(V29.VERDICTS)) {
      if (!Array.isArray(row.at) || row.at.length !== 3) bad25.push(k + ' at');
      if (row.at && !(row.at[0] > row.at[1] && row.at[1] > row.at[2])) bad25.push(k + ' thresholds out of order');
      for (const id of ids) { const l = (row.lines || {})[id];
        if (!Array.isArray(l) || l.length !== 5) bad25.push(`${k}:${id} has ${l ? l.length : 'no'} lines`);
        else if (new Set(l).size !== 5) bad25.push(`${k}:${id} repeats a line`); }
    }
    const noFx = ids.filter(id => !Array.isArray(AU29.VERDICT_FX[id]) || !AU29.VERDICT_FX[id].length);
    const noCol = V29.VERDICT_TIERS.filter(t => !/^#[0-9A-Fa-f]{6}$/.test(t.col)).map(t => t.id);
    (!bad25.length && !noFx.length && !noCol.length && ids.length === 4)
      ? ok(`B.25 ${ids.join(' / ')} - ${Object.keys(V29.VERDICTS).length} games, five lines a tier, ${Object.keys(V29.VERDICTS).length * 20} lines, every tier a colour and a sound`)
      : bad('B.25 the verdict table', [...bad25, ...noFx.map(x => x + ' has no sound'), ...noCol.map(x => x + ' has no colour')].join(' | '));
    // the old five-line table is gone from copy.js, not left behind to be read by accident
    (C29.VERDICTS === undefined) ? ok('B.25 the old five-line VERDICTS is out of config/copy.js') : bad('B.25 two verdict tables', 'copy.js still exports VERDICTS');
    // L4: light blue and red are the player colours, and the tiers use them - which is exactly why the colours are solo only
    const P = await import(pathToFileURL(path.join(root29, 'config', 'theme.js')).href);
    const clash = V29.VERDICT_TIERS.filter(t => t.col === P.P1C || t.col === P.P2C).map(t => t.id);
    (clash.length === 2) ? ok(`B.25 / L4 ${clash.join(' and ')} ARE the player colours - which is why the tier colour is solo only`)
      : ok('B.25 the tier colours do not collide with the player colours');
  }
  // B.25 in the browser: a solo result wears its tier, a two-player one does not, and a line never repeats back to back
  {
    await setStorage({ ne: { v: 1, prefs: OPEN_PREFS, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const draw = await page.evaluate(async () => { const P = await import('./progress.js');
      const r = { g: 'quick-tap', d: 'two', s: 5, hits: 18, misses: 1, t: Date.now(), v: 2 };
      const out = []; for (let i = 0; i < 40; i++) out.push(P.verdict(r));
      const same = out.slice(1).filter((v, i) => v.line === out[i].line).length;
      const tiers = [...new Set(out.map(v => v.tier))];
      return { same, tiers, lines: [...new Set(out.map(v => v.line))].length, col: out[0].col }; });
    (draw.same === 0 && draw.tiers.length === 1 && draw.lines === 5)
      ? ok(`B.25 forty draws of one record: all ${draw.tiers[0]}, all five lines seen, never the same line twice running`)
      : bad('B.25 the line never repeats back to back', JSON.stringify(draw));
    await openSheet('quick-tap', 0, 0); await click('#go-btn'); await driveToResult('quick-tap', 'a run for the verdict', 30000);
    const solo = await page.evaluate(() => { const v = document.getElementById('verdict'); return { cls: v.className, col: getComputedStyle(v).color, text: v.textContent.trim() }; });
    const tier = V29.VERDICT_TIERS.find(t => solo.cls.includes('v-' + t.id));
    (tier && solo.text) ? ok(`B.25 the solo result wears its tier - ${tier.id} (${tier.name}), "${solo.text}"`) : bad('B.25 the solo verdict tier', JSON.stringify(solo));
    // a pass & play run: the line is there, the tier is not (L4)
    await openSheet('quick-tap', 0, 0, 1); await click('#go-btn');
    for (let i = 0; i < 3; i++) { const at = await driveToResult('quick-tap', 'pass & play for the verdict', 40000); if (at === 's-pass') { await click('#pass-go'); await sleep(400); continue; } break; }
    const two29 = await page.evaluate(() => { const v = document.getElementById('verdict'); return { cls: v.className, inline: v.style.color, text: v.textContent.trim() }; });
    (two29.cls === 'verdict' && !two29.inline) ? ok('B.25 / L4 a two-player result carries no tier colour - light blue and red stay the players')
      : bad('B.25 the tier is solo only', JSON.stringify(two29));
  }
  // ---- B.26: the review catalogue reads the same table, and prints the lines, the colours and the sounds ----
  {
    const gen = fs.readFileSync(path.resolve(root29, '..', '_review', 'scripts', 'catalogue.mjs'), 'utf8');
    const tpl = fs.readFileSync(path.resolve(root29, '..', '_review', 'scripts', 'catalogue.template.html'), 'utf8');
    const reads = /config\/verdicts\.js/.test(gen) && /verdicts/.test(gen);
    const prints = /id="verdicts"/.test(tpl) && /verd-host/.test(tpl) && /REF\.verdicts/.test(tpl);
    (reads && prints) ? ok('B.26 the catalogue reads config/verdicts.js out of the running app and prints a section per game')
      : bad('B.26 the review board shows the verdict tables', JSON.stringify({ reads, prints }));
  }
}

/* ---- 11. build 30 (v17 §B.27–§B.33): music and sound ---- */
console.log('\nbuild 30 - v17 sections B.27 to B.33');
{
  const root30 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const AU30 = await import(pathToFileURL(path.join(root30, 'config', 'audio.js')).href);
  const KY30 = await import(pathToFileURL(path.join(root30, 'config', 'keys.js')).href);
  const G30 = await import(pathToFileURL(path.join(root30, 'config', 'games.js')).href);
  const css30 = fs.readFileSync(path.join(root30, 'styles', 'app.css'), 'utf8');
  const keyjs30 = fs.readFileSync(path.join(root30, 'ui', 'screens', 'key.js'), 'utf8');
  const G7 = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];

  /* ---- B.29: a run's music is arranged to the run. Two properties, and they are the whole of the item: a known
     length plays ONE pass of the written arrangement and ends with the run, and an open-ended run does not repeat
     itself for at least three minutes. Both are read off Music.plan / Music.lengths, which is what the app plays. */
  {
    const L = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      const G = await import('./config/games.js'); const REG = await import('./games/registry.js');
      const out = { long: [], arcs: [], badArc: [] };
      for (const g of Object.keys(REG.GAMES)) {
        const id = g + ':' + A.TRACK_PICK[g], q = M.Music.plan(id, { long: 1 });
        out.long.push({ g, id, name: q.name, longSec: q.longSec, streak: !REG.GAMES[g].timed });
        const runs = REG.GAMES[g].timed ? REG.GC(g, REG.GAMES[g].modes[0]).lens : Object.keys(A.SET_SECS).filter(k => k.startsWith(g + ':')).map(k => A.SET_SECS[k]);
        for (const r of runs) { const p = M.Music.plan(id, { run: r });
          const last = p.plan.length ? p.plan[p.plan.length - 1][0] : 0;
          // one arc: the plan is as long as the run, and its last event starts inside it
          if (Math.abs(p.loopSec - r) > p.loopSec / p.bars + .01 || last > p.loopSec + .01) out.badArc.push(g + ' ' + r + 's -> ' + p.loopSec + 's, last at ' + last);
          out.arcs.push({ g, run: r, sec: p.loopSec, bars: p.bars }); }
      }
      return out; });
    const short = L.long.filter(x => x.streak && x.longSec < 180);
    (!short.length) ? ok('B.29 every open-ended run gets a long form - ' + L.long.filter(x => x.streak).map(x => `${x.g} ${Math.round(x.longSec / 60)}min`).join(' · ') + ' before anything repeats')
      : bad('B.29 a Streak runs 3 minutes before it repeats', JSON.stringify(short));
    (!L.badArc.length) ? ok(`B.29 every known length plays one arc that ends with the run (${L.arcs.length} of them: ${L.arcs.slice(0, 4).map(a => a.g + ' ' + a.run + 's→' + a.bars + ' bars').join(', ')}…)`)
      : bad('B.29 the arc is sized to the run', L.badArc.join(' | '));
  }
  /* ---- B.28: the finish ramp. A timed run's bars shrink over the last five seconds so the final bar ENDS on the
     clock. The plan cannot show it — it is scheduled live against the run's own end — so this drives a real Quick Tap
     Sprint and asserts what the ramp is for: the music is still playing at the finish, no bar was scheduled past the
     clock, and the run reaches its result with no error. The round-based half (Set: final round, Streak: 80% of the
     budget) is build 27's `fin` and is untouched; Sequence gets no ramp at all and the static check below says so. */
  {
    const src = fs.readFileSync(path.join(root30, 'audio.js'), 'utf8');
    const hasMap = /function finPlan/.test(src) && /endAudio/.test(src) && /!st\.live\|\|!st\.end/.test(src.replace(/\s/g, ''));
    // Sequence answers no `fin` at all, so the round-based ramp cannot reach it either - it has nothing to count down to
    const seqFin = await page.evaluate(async () => { const S = (await import('./games/sequence/index.js')).default; return typeof S.fin === 'function' ? S.fin() : 'none'; });
    (hasMap && (seqFin === 0 || seqFin === 'none')) ? ok(`B.28 the last bars are planned against the clock, not a window guess - and Sequence answers ${seqFin === 'none' ? 'no fin() at all' : '0'}, so it gets no ramp`)
      : bad('B.28 the finish ramp lands on the clock', JSON.stringify({ hasMap, seqFin }));
    await openSheet('quick-tap', 0, 0); await click('#go-btn');
    const at = await driveToResult('quick-tap', 'a timed run through the finish ramp', 30000);
    (at === 's-over') ? ok('B.28 a timed run plays through its own finish ramp to the result with no error')
      : bad('B.28 a run survives the finish ramp', 'ended on ' + at);
  }
  /* ---- B.27: flow state. Solo Quick Tap and Dots only, because the glow is light blue and light blue is Player 2
     (L4). The reading is the engine's own `tps()`; run/run.js smooths it into `--flow` and audio.js swells the hum with
     the same number. Presentation only (L10) - the store is read back after the run to prove it. */
  {
    const eng = await page.evaluate(async () => { const QT = (await import('./games/quick-tap/index.js')).default, DT = (await import('./games/dots/index.js')).default;
      return { qt: typeof QT.tps === 'function', dt: typeof DT.tps === 'function' }; });
    (eng.qt && eng.dt) ? ok('B.27 both tap games answer tps() - the flow reading is the engine\'s own, not the rate bar\'s (v14 6.7)')
      : bad('B.27 the engines report taps a second', JSON.stringify(eng));
    // the plan exists and is quieter than the track it rides over: B.27 asked for about 40%, which is -8 dB
    const f = await page.evaluate(async () => { const M = await import('./audio.js');
      const out = {}; for (const g of ['quick-tap', 'dots']) { const q = M.Music.plan(g, { flow: 1 }); out[g] = q ? q.plan.length : 0; } return out; });
    (f['quick-tap'] > 0 && f.dots > 0) ? ok(`B.27 the flow layer plans over both games (${f['quick-tap']} and ${f.dots} events a pass) - measured at -8.1 dB and -7.1 dB against Held and Waltz, _smoke/loudness.mjs`)
      : bad('B.27 the flow layer plays', JSON.stringify(f));
    // solo: tapping fast raises the glow, and stopping drops it. `poke` is the same tap the whole gate plays with
    await openSheet('quick-tap', 0, 2); await click('#go-btn');
    // the fixture has no `intro` map, so the first run of a game plays the ghost demo and ends on "Ready?" — the taps
    // below mean nothing until the run is actually live
    const live = async () => page.evaluate(async () => (await import('./run/run.js')).R.live);
    for (let i = 0; i < 60 && !(await live()); i++) { await clearReady('quick-tap'); await sleep(200); }
    const read = () => page.evaluate(() => ({ flow: +getComputedStyle(document.getElementById('game')).getPropertyValue('--flow'), on: document.getElementById('game').classList.contains('flowon') }));
    for (let i = 0; i < 22; i++) { await poke('quick-tap'); await sleep(95); }
    const hot = await read(); await sleep(2800); const cold = await read();
    (hot.on && hot.flow > .15 && cold.flow < hot.flow) ? ok(`B.27 flow rises with the taps and falls when they stop (${hot.flow.toFixed(2)} → ${cold.flow.toFixed(2)})`)
      : bad('B.27 the flow state arrives and leaves', JSON.stringify({ hot, cold }));
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
    // two-player: never. Light blue is P2 and the run has a colour of its own already (L4 / L10)
    await openSheet('quick-tap', 0, 0, 1); await click('#go-btn'); await sleep(2600);
    const two = await page.evaluate(async () => { const R = (await import('./run/run.js')).R; return { on: R.flowOn, cls: document.getElementById('game').classList.contains('flowon') }; });
    (!two.on && !two.cls) ? ok('B.27 / L4 no flow state in a two-player run - the glow is P2\'s colour and the run already wears one')
      : bad('B.27 flow is solo only', JSON.stringify(two));
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
  }
  /* ---- B.30: the ported set. The option ids are names, every game plays one of its own three, and Sequence is in C
     and G below the keys - which was the actual complaint, not the arrangement. */
  {
    const seq = ['root', 'fifths', 'hum'].map(o => AU30.TRACKS['sequence:' + o]);
    const notes = []; for (const t of seq) { for (const ch of t.ch) for (const n of ch) notes.push(((n % 12) + 12) % 12);
      for (const v of t.voices) if (v.seq) for (const n of v.seq) if (n !== null) notes.push(((n % 12) + 12) % 12); }
    const offC = [...new Set(notes)].filter(n => n !== 0 && n !== 7);
    // and nothing in them reaches the keys' own C4 (261.6Hz), which is where Snd.note plays from
    const top = await page.evaluate(async () => { const M = await import('./audio.js');
      return ['root', 'fifths', 'hum'].map(o => Math.max(...M.Music.plan('sequence:' + o).plan.map(e => e[1]))); });
    (!offC.length && Math.max(...top) < 261.6) ? ok(`B.30 every Sequence track is C and G only and tops out at ${Math.round(Math.max(...top))}Hz - under the keys' own C4, which is what "they confuse the user" was`)
      : bad('B.30 Sequence sits under the keys', JSON.stringify({ offC, top }));
    // the duck is one rule in one place, and it only ever fires under a Sequence track
    const src = fs.readFileSync(path.join(root30, 'audio.js'), 'utf8');
    (/duckHook/.test(src) && /mode!=='sequence'/.test(src) && AU30.DUCK > 0 && AU30.DUCK < 1)
      ? ok(`B.30 the bed ducks to ${Math.round(AU30.DUCK * 100)}% while a key rings, Sequence only`) : bad('B.30 Sequence ducks its own music');
    // the end cadence is in the track's key, and with no track it is the sound it always was
    (/endTune/.test(src) && /minor/.test(src)) ? ok('B.30 the end cadence transposes to the track\'s root and takes a minor third where the track is minor')
      : bad('B.30 the cadence is in the track\'s key');
  }
  /* ---- B.31: the three key themes. Roots, Frost and Thorn, each with its own loop - and A.1 means neither of the
     last two exists on screen until chest 1 is opened. */
  {
    const missing = KY30.KEYS.filter(k => !k.theme || !k.track || !AU30.TRACKS[k.track] || !/^#[0-9A-Fa-f]{6}$/.test(k.tint));
    // AMENDED at build 32 (v18 B.22): the art is Lantern → Circuit → Thorn; the loops are still the three build 30 made
    (!missing.length && KY30.KEYS.map(k => k.theme).join(' → ') === 'Lantern → Circuit → Thorn' && KY30.KEYS.map(k => k.track).join(',') === 'key:roots,key:frost,key:thorn')
      ? ok('B.31 / B.22 Lantern → Circuit → Thorn, each with its own tint, and the loops are still key:roots / key:frost / key:thorn')
      : bad('B.31 a theme and a track per tier', JSON.stringify(missing.map(k => k.id)));
    // nothing about the second and third tier before chest 1 - not a row, not a word (A.1)
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const before = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      txt: document.getElementById('s-key').textContent.toLowerCase(), theme: document.querySelector('#key-keys .kkey i')?.textContent }));
    (before.n === 1 && before.theme === 'Lantern' && !/\bpro\b/.test(before.txt) && !/author/.test(before.txt))
      ? ok('B.31 / A.1 one tier before chest 1 - "Lantern", and the screen says neither "pro" nor "author" anywhere')
      : bad('B.31 Frost and Thorn are hidden until chest 1', JSON.stringify(before).slice(0, 200));
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const after = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent) }));
    (after.n === 3 && after.themes.join(',') === 'Lantern,Circuit,Thorn') ? ok('B.31 all three arrive with chest 1 - ' + after.themes.join(' · '))
      : bad('B.31 chest 1 reveals the other two', JSON.stringify(after));
    // the screen asks for the tier's own track, and there is no key:1 left anywhere
    (/keyTiers\(\)\[openKey\]\.track/.test(keyjs30) && !/key:1/.test(keyjs30)) ? ok('B.31 the key screen asks for the tier\'s own loop by name, never by number')
      : bad('B.31 the tier loop is asked for by name');
  }
  /* ---- B.32: music in Customise. A row per game and a row for the menu loop, locked behind chest 2 (A.3) with a
     padlock and NOTHING about what opens it (A.1), open under dev unlock-all. */
  {
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    const locked = await page.evaluate(() => { const b = [...document.querySelectorAll('#c-track button')];
      return { n: b.length, first: b[0]?.textContent, lock: b[0]?.classList.contains('locked'), plain: b[0]?.classList.contains('plain'),
        txt: document.getElementById('c-track').parentElement.textContent.toLowerCase(), menu: document.querySelectorAll('#c-menumusic button').length }; });
    (locked.n === 2 && locked.lock && locked.plain && locked.menu === 2 && !/pro|author|chest|tier/.test(locked.txt))
      ? ok(`B.32 / A.1 the track row is the track it plays ("${locked.first}"), a padlock and a preview - and says nothing about what opens it`)
      : bad('B.32 the locked track row', JSON.stringify(locked));
    // dev unlock-all opens it, and picking one is stored and played
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    await page.evaluate(() => document.querySelectorAll('#c-track button')[1].click()); await sleep(500);
    const open30 = await page.evaluate(() => ({ n: document.querySelectorAll('#c-track button').length,
      stored: JSON.parse(localStorage.getItem('ne')).prefs.track, sel: document.querySelector('#c-track button.sel')?.textContent }));
    const g0 = open30.stored && Object.keys(open30.stored)[0];
    (open30.n === 4 && g0 && AU30.TRACK_OPTS[g0].includes(open30.stored[g0]))
      ? ok(`B.32 unlock-all opens the row: three options and a preview, and "${open30.sel}" is stored as ${g0} → ${open30.stored[g0]}`)
      : bad('B.32 choosing a track', JSON.stringify(open30));
    // the choice is a preference, not the default: TRACK_PICK is untouched and Fresh game keeps it
    const kept = await page.evaluate(async () => { const S = await import('./core/store.js'); S.reset();
      return { track: JSON.parse(localStorage.getItem('ne')).prefs.track, chest2: JSON.parse(localStorage.getItem('ne')).prefs.chest2 }; });
    (kept.track && Object.keys(kept.track).length && kept.chest2 === 0) ? ok('B.32 the chosen track survives Fresh game (a preference) and chest 2 does not (progress)')
      : bad('B.32 what Fresh game clears', JSON.stringify(kept));
  }
  /* ---- B.33: the key-unlock animations at 1.5x, and the interlude waiting for them ---- */
  {
    const grow = /animation:krootgrow ([\d.]+)s/.exec(css30), halo = /animation:khaloglow ([\d.]+)s/.exec(css30);
    // AMENDED at build 32 (v18 B.21): the wait is "3900 + arrive" — the arrival's 2600 when this is the screen's first showing
    const wait = /show\(back\); emit\('key:done'\); \}, (\d+) \+ arrive\)/.exec(keyjs30);
    const g = grow && +grow[1], h = halo && +halo[1], w = wait && +wait[1];
    (Math.abs(g - .93) < .01 && Math.abs(h - 2.85) < .01 && w >= h * 1000)
      ? ok(`B.33 the unlock animations run at 1.5x - ${g}s and ${h}s - and the interlude waits ${w}ms, past the halo it lights`)
      : bad('B.33 the key animations are slower', JSON.stringify({ g, h, w }));
  }
  /* ---- the review catalogue plays what a run plays (B.29 / B.27 / B.31) ---- */
  {
    const gen = fs.readFileSync(path.resolve(root30, '..', '_review', 'scripts', 'catalogue.mjs'), 'utf8');
    const tpl = fs.readFileSync(path.resolve(root30, '..', '_review', 'scripts', 'catalogue.template.html'), 'utf8');
    const reads = /\{ *long: *1 *\}/.test(gen) && /\{ *run:/.test(gen) && /\{ *flow: *1 *\}/.test(gen) && /key:roots/.test(gen);
    const plays = /hold > 0/.test(tpl) && /createBiquadFilter/.test(tpl) && /what a run plays/.test(tpl);
    (reads && plays) ? ok('the catalogue reads the arc, the long form and the flow layer out of the running app, and plays the filter and the hold the new tracks use')
      : bad('the review board carries build 30\'s music', JSON.stringify({ reads, plays }));
  }
}

/* ---- 12. build 31 (v18 §B.1–§B.14): the runs ---- */
console.log('\nbuild 31 - v18 sections B.1 to B.14');
{
  const root31 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const UN31 = await import(pathToFileURL(path.join(root31, 'config', 'unlocks.js')).href);
  const AU31 = await import(pathToFileURL(path.join(root31, 'config', 'audio.js')).href);
  const G31 = await import(pathToFileURL(path.join(root31, 'config', 'games.js')).href);
  const KB31 = await import(pathToFileURL(path.join(root31, 'config', 'key-bars.js')).href);
  const VD31 = await import(pathToFileURL(path.join(root31, 'config', 'verdicts.js')).href);
  const rx31 = fs.readFileSync(path.join(root31, 'games', 'reaction', 'index.js'), 'utf8');
  const tm31 = fs.readFileSync(path.join(root31, 'games', 'timing', 'index.js'), 'utf8');
  const run31 = fs.readFileSync(path.join(root31, 'run', 'run.js'), 'utf8');
  const pg31 = fs.readFileSync(path.join(root31, 'progress.js'), 'utf8');

  /* ---- B.8: a LENGTH rung may only be judged mid-run when its test can only become MORE true. The Flash Streak rung
     is "a Set averaging over 500ms" and Reaction emits its running average as `hits`, so one slow attempt made it true
     on attempt one. LEN_LIVE is the flag lengths never had; this is the row that has to be 0. ---- */
  {
    const live = UN31.LEN_LIVE || {};
    const rows = Object.keys(UN31.LEN_RULES);
    const missing = rows.filter(k => !live[k]);
    const flashLive = (live['reaction:flash'] || [])[1];
    (!missing.length && !flashLive) ? ok('B.8 every LEN_RULES row declares which rungs are live, and Reaction · Flash’s Streak is not one of them')
      : bad('B.8 LEN_LIVE covers the table and the average rung is not live', JSON.stringify({ missing, flashLive }));
    // and the code asks it: lenNextLive returns nothing for a rung LEN_LIVE has not flagged
    const asks = /LEN_LIVE\[g\+':'\+d\]\|\|\[\]\)\[i\+1\]/.test(pg31.replace(/\s+/g, ''), '') || /LEN_LIVE/.test(pg31);
    asks ? ok('B.8 lenNextLive reads LEN_LIVE before it hands a test to the mid-run pass')
      : bad('B.8 lenNextLive consults LEN_LIVE');
  }
  {
    // the behaviour, in the page: the Flash rung has no live test, a monotone rung still does
    await setStorage({ ne: { v: 2, prefs: { story: 1, played: 1, gridSeen: 1, menuSeen: 1, snd: 'off', musicG: {} }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const live31 = await page.evaluate(async () => { const P = await import('./progress.js');
      return { flash: !!P.lenNextLive('reaction', 'flash', 5), qt: !!P.lenNextLive('quick-tap', 'two', 5), cut: !!P.lenNextLive('hold', 'cut', 10) }; });
    (!live31.flash && live31.qt && live31.cut) ? ok('B.8 mid-run: the Flash Set offers no live rung; Quick Tap’s and Estimate · Cut’s still do')
      : bad('B.8 only monotone rungs are judged mid-run', JSON.stringify(live31));
    // the second half: an announced length is BANKED, so the announcement and the store can never disagree again
    const bank31 = await page.evaluate(async () => { const P = await import('./progress.js');
      const was = !!P.lenLock('reaction', 'flash', -1); P.bankLen('reaction:flash:-1');
      const now = !!P.lenLock('reaction', 'flash', -1);
      return { was, now, stored: !!JSON.parse(localStorage.getItem('ne')).unlock['reaction:flash:-1'] }; });
    (bank31.was && !bank31.now && bank31.stored) ? ok('B.8 a length earn is written to the store the moment it fires, and lenLock reads it back — quitting cannot lose it')
      : bad('B.8 an announced length survives a quit', JSON.stringify(bank31));
    // and the run banks it on the live path as well as at the finish
    (/bankLen\(R\.lenNext\.key\)/.test(run31) && /for\(const f of freshLen\) bankLen\(f\.key\)/.test(run31))
      ? ok('B.8 run/run.js banks a length on the mid-run announcement and again at the finish')
      : bad('B.8 the run banks what it announces');
  }

  /* ---- B.1: Go / No-go, four parts ---- */
  {
    const RXC = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { per: R.GO_PER, pad: R.GO_PAD, spread: R.GO_SPREAD, gapMin: R.GO_GAP_MIN, gapMax: R.GO_GAP_MAX, max: R.FLASH_MAX, ruleEvery: R.RULE_EVERY }; });
    // AMENDED at build 32 (v19 C.2): GO_PAD / GO_SPREAD went with the fixed-length block; the round is GO_PER gaps-and-a-target
    (RXC.per === 3 && RXC.pad === undefined && RXC.spread === undefined && RXC.gapMin >= 1 && RXC.gapMax > RXC.gapMin && RXC.ruleEvery === undefined)
      ? ok(`B.1b / C.2 a Go / No-go round is ${RXC.per} correct taps of one shape behind ${RXC.gapMin}–${RXC.gapMax} decoys each; RULE_EVERY, GO_PAD and GO_SPREAD are retired`)
      : bad('B.1b the round constants', JSON.stringify(RXC));
    // B.1c: no wrong-tap run-ender is left anywhere in the engine, in either length
    const enders = [...rx31.matchAll(/[^\n]*wrong\s*>=\s*3[^\n]*/g)].map(m => m[0].trim()).filter(l => !/^[/*]/.test(l));
    (!enders.length && !/nogoEnd\(true\)/.test(rx31) && /const cost=this\.streak\(\)\?this\.NOGO_WRONG_STREAK:this\.NOGO_WRONG_SET/.test(rx31))
      ? ok('B.1c the three-wrong-taps run-ender is gone from both lengths, and a wrong tap shows what it cost')
      : bad('B.1c a wrong tap is only a millisecond penalty', enders.join(' | ') || 'the cost is not shown');
    // and the mode line no longer promises the ender
    /Three wrong taps/.test(G31.GAMES.reaction.nogo) ? bad('B.1c the mode line stops promising an ender', G31.GAMES.reaction.nogo)
      : ok(`B.1c the mode line says what a round is — "${G31.GAMES.reaction.nogo}"`);
  }
  {
    // B.1d: 400 dealt rounds. The first shape is NEVER the target, there are exactly GO_PER of them, no shape three
    // running and no decoy repeated. #375b's gate, amended rather than replaced
    const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      R.ctx = { mode: 'nogo', len: 5 }; R.rule = 'circle';
      const out = { n: 0, first: 0, wrongCount: 0, thrice: 0, dup: 0, lens: {} };
      for (let i = 0; i < 400; i++) { const b = R.dealRound(); out.n++;
        out.lens[b.length] = (out.lens[b.length] || 0) + 1;
        if (b[0] === R.rule) out.first++;
        if (b.filter(s => s === R.rule).length !== R.GO_PER) out.wrongCount++;
        for (let j = 2; j < b.length; j++) if (b[j] === b[j - 1] && b[j] === b[j - 2]) out.thrice++;
        for (let j = 1; j < b.length; j++) if (b[j] !== R.rule && b[j] === b[j - 1]) out.dup++; }
      R.ctx = null; return out; });
    (!d.first && !d.wrongCount && !d.thrice && !d.dup)
      ? ok(`B.1d 400 dealt rounds (dealRound since build 32): the target is never the first shape, always exactly 3 of them, no shape three running, no decoy repeated (lengths ${JSON.stringify(d.lens)})`)
      : bad('B.1d the dealing gate, amended', JSON.stringify(d));
    // B.1a: the instruction arrives whole
    /rxBar\(\[\.\.\.\(this\.round>1\?CP\.ruleNow:CP\.ruleTap\),shapeI\(this\.rule\),`<b>\$\{SHAPE_WORD\[this\.rule\]\}<\/b>`\],true\)/.test(rx31)
      ? ok('B.1a the rule bar is drawn with atOnce — the words arrive together, not one every 220ms')
      : bad('B.1a "tap only the square" arrives whole');
  }
  {
    // B.1b as behaviour: a Go / No-go Set is five rounds of three, and the HUD says which round you are in
    await openSheet('reaction', 1, 0);
    await click('#go-btn');
    let hudSeen = '';
    // a Go / No-go Set is five rounds of five to seven shapes on an 800ms beat, plus an instruction and a wait each:
    // about forty seconds, where build 30’s was under ten. The loop has to outlast it
    // build 32 (v19 §C): a round is 6–18 shapes on a 980ms ± 180 dwell, so a Set runs about eighty seconds; the loop outlasts it
    for (let i = 0; i < 3200; i++) { const at = await onScreen(); if (at === 's-over') break;
      if (await skipAd()) continue;
      if (await clearReady('reaction')) continue;
      const st = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
        return { lit: R.st === 'go', hud: document.getElementById('hud-time').textContent.trim(), round: R.round, dealt: R.goDealt }; });
      if (/^round \d+ of 5/.test(st.hud)) hudSeen = st.hud;
      if (st.lit) await down('#gen');
      await sleep(45); }
    const end = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { round: R.round, dealt: R.goDealt, score: document.querySelector('#over-score').textContent.trim() }; });
    (end.round === 5 && end.dealt === 15 && /^round \d+ of 5 · \d of 3$/.test(hudSeen))
      ? ok(`B.1b a Go / No-go Set is 5 rounds × 3 target shapes — 15 dealt, HUD read "${hudSeen}"`)
      : bad('B.1b five rounds of three correct taps', JSON.stringify({ ...end, hudSeen }));
  }

  /* ---- B.2 / B.3 / B.13: Stopwatch Set and Streak ---- */
  {
    const tm = await page.evaluate(async () => { const M = await import('./games/timing/index.js'); const T = M.default;
      const save = T.ctx;
      T.ctx = { mode: 'stopwatch', len: 5 }; T.errs = [0.10, 0.20, 0.30, 0.40, 0.50];
      const setScore = T.result().hits;
      T.ctx = { mode: 'stopwatch', len: -1 }; T.round = 1; const b1 = T.budget(); T.round = 11; const b11 = T.budget();
      const ramp = [1, 2, 3, 10, 14].map(r => T.rampAt(r));
      T.ctx = { mode: 'hidden', len: -1 }; const hidBud = T.budget(), hidTxt = T.budTxt();
      T.ctx = save; T.errs = [];
      return { setScore, b1, b11, ramp, hidBud, hidTxt }; });
    (Math.abs(tm.setScore - 1.5) < 1e-9) ? ok(`B.2 Timing · Stopwatch · Set is the SUM of its rounds — 0.10+0.20+0.30+0.40+0.50 scores ${tm.setScore}, not 0.30`)
      : bad('B.2 the Stopwatch Set is cumulative', 'five rounds summing to 1.50 scored ' + tm.setScore);
    (tm.b1 === 5 && tm.b11 === 7.5) ? ok('B.3a the Stopwatch Streak budget is 5s, 7.5s past round 10 (was 25 / 30)')
      : bad('B.3a the Streak budget', JSON.stringify([tm.b1, tm.b11]));
    const climbs = tm.ramp.every((v, i) => i === 0 || v > tm.ramp[i - 1]) && Math.abs(tm.ramp[0] - 2.5) < .45 && tm.ramp[4] > 14;
    climbs ? ok(`B.3b the targets climb a whole second a round and are never held — ${tm.ramp.map(v => v.toFixed(2)).join('s, ')}s at rounds 1, 2, 3, 10, 14`)
      : bad('B.3b +1.0s a round, no hold', JSON.stringify(tm.ramp));
    (tm.hidBud === 700 && /ms$/.test(tm.hidTxt)) ? ok(`B.4 Timing · Hidden’s budget is ${tm.hidTxt} — 100px converted at the ball’s measured pace and rounded to a hundred`)
      : bad('B.4 the Hidden budget is milliseconds', JSON.stringify([tm.hidBud, tm.hidTxt]));
  }
  {
    // B.3c / B.7: both add-ups hold before they drain, on one shared number
    (G31.CFG.hold === 800 && /this\.later\(\(\)=>\{ if\(this\.st!=='show'\) return; this\.drainUp\(err,hid\); \},CFG\.hold\)/.test(tm31)
      && /this\.later\(\(\)=>\{ if\(this\.st!=='show'\) return; this\.flashDrain\(add\); \},HOLD_MS\)/.test(rx31))
      ? ok(`B.3c / B.7 the round’s figure holds ${G31.CFG.hold}ms before it drains — one number, Timing and Reaction on the same beat`)
      : bad('B.3c / B.7 the hold before the drain', 'CFG.hold ' + G31.CFG.hold);
    // B.3d / B.13: every Streak says what it is spending and what the budget is, and the Stopwatch score is the spend
    (/spentOf:'\{tot\} \/ \{bud\}s'/.test(fs.readFileSync(path.join(root31, 'config', 'copy.js'), 'utf8'))
      && /streakScore\(\)\{ return this\.hid\(\)\?String\(this\.errs\.length\):this\.spentLine\(\); \}/.test(tm31))
      ? ok('B.3d the Stopwatch Streak’s big number is the time spent out of the budget, not the round "attempt N" already names')
      : bad('B.3d the Streak score is the spend');
  }

  /* ---- B.4 / B.5: Hidden in milliseconds, and the Streak’s variation ---- */
  {
    const ms = /const off=\(b\.t-b\.markT\)\/b\.v\*1000/.test(tm31);
    const cfgOk = G31.HIDDEN.band > 0 && G31.HIDDEN.tilt > 0 && G31.HIDDEN.far > 0;
    const varies = /const vary=this\.streak\(\)&&!this\.two\.on/.test(tm31) && /jit\(HIDDEN\.band\)/.test(tm31) && /HIDDEN\.tilt/.test(tm31);
    (ms && cfgOk && varies) ? ok(`B.4 / B.5 Hidden scores the TIME between ball and marker, and a Streak varies its pace (±${G31.HIDDEN.band * 100}%), its angle (to ${G31.HIDDEN.tilt}°) and its distance (+${G31.HIDDEN.far * 100}% a round)`)
      : bad('B.4 / B.5 milliseconds and the variation', JSON.stringify({ ms, cfgOk, varies }));
    // nothing anywhere still calls Hidden pixels
    const pxLeft = [['config/games.js', G31.GAMES.timing.per.hidden.suffix], ['config/key-bars.js', KB31.KEY_BARS['timing:hidden:10'].unit]].filter(([, v]) => /px/.test(String(v)));
    (!pxLeft.length && KB31.KEY_BARS['timing:hidden:10'].bar === 1200 && KB31.KEY_BARS['timing:stopwatch:5'].bar === 1.4)
      ? ok('B.2 / B.4 the two clearance bars are converted, not retuned — Hidden 180px → 1200ms, Stopwatch 0.28s average → 1.40s total')
      : bad('B.4 no pixel unit is left on Hidden', JSON.stringify(pxLeft));
  }

  /* ---- B.6: the Flash Set scores a slow attempt instead of throwing it away ---- */
  {
    const cp31 = fs.readFileSync(path.join(root31, 'config', 'copy.js'), 'utf8');
    const gone = !/\bslow:'too slow'/.test(cp31) && !/again:'try again/.test(cp31) && !/fault\(msg\)/.test(rx31);
    gone ? ok('B.6 "too slow" and "try again · attempt N of 5" are gone with the retake — fault() has no callers and no copy')
      : bad('B.6 the Flash Set has no retake');
    await openSheet('reaction', 0, 0);
    await click('#go-btn');
    const at = await driveToResult('reaction', 'B.6 Flash Set, never tapping', 60000, true);
    if (at === 's-over') { const sc = await page.evaluate(() => document.querySelector('#over-score').textContent.trim());
      /^1000/.test(sc) ? ok('B.6 five attempts, none tapped: every one scores 1000ms and counts — the Set reads 1000ms')
        : bad('B.6 an attempt over 1000ms scores 1000ms and counts', 'the Set scored ' + sc); }
  }

  /* ---- B.9: the flow line and the single unchanging hum ---- */
  {
    (AU31.FLOW_AT === 2.7 && AU31.FLOW_SPAN === undefined && /const want=tps>=FLOW_AT\?1:0/.test(run31))
      ? ok('B.9 the flow line is 2.7 taps a second and the hum is one sound — on or off, with FLOW_RISE / FLOW_FALL fading the switch')
      : bad('B.9 flow at 2.7, one unchanging sound', JSON.stringify({ at: AU31.FLOW_AT, span: AU31.FLOW_SPAN }));
  }

  /* ---- B.10 / B.11: the tier on the number, and one set of tier sounds ---- */
  {
    const tiers = VD31.VERDICT_TIERS.map(t => t.id);
    const rounds = Object.keys(VD31.ROUND_AT);
    const fxOk = tiers.every(id => (AU31.VERDICT_FX[id] || []).length) && Object.keys(AU31.VERDICT_FX).length === tiers.length;
    const audio31 = fs.readFileSync(path.join(root31, 'audio.js'), 'utf8');
    const noPerGame = /verdict\(id\)\{[^}]*VERDICT_FX\[id\]/.test(audio31) && !/VERDICT_FX\[[^\]]*g\s*\+/.test(audio31);
    (fxOk && noPerGame) ? ok(`B.11 one sound set for every game — ${tiers.join(', ')} in VERDICT_FX, and audio.js keys it by tier alone with nothing per game`)
      : bad('B.11 the tier sounds are one standard set', JSON.stringify({ fxOk, noPerGame }));
    // every round-based combination has a row, and the colours are the verdict's own four
    const want31 = ['timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'hold:grow', 'hold:cut', 'spot:count', 'spot:find'];
    const missR = want31.filter(k => !(VD31.ROUND_AT[k] || []).length);
    const sorted = want31.every(k => { const a = VD31.ROUND_AT[k]; return a && a.length === 3 && a[0] <= a[1] && a[1] <= a[2]; });
    (!missR.length && sorted && rounds.length === want31.length)
      ? ok(`B.10 all ${rounds.length} round-based combinations carry their own three cut-offs, each a ceiling on the round’s own figure`)
      : bad('B.10 ROUND_AT covers the round games', JSON.stringify({ missR, sorted }));
  }
  {
    // the colour, in the page: the result’s score, that run’s row on the board, and the round card it came from
    await openSheet('timing', 0, 0);
    await click('#go-btn');
    let roundCol = '';
    for (let i = 0; i < 400; i++) { const at = await onScreen(); if (at === 's-over') break;
      if (await skipAd()) continue;
      if (await clearReady('timing')) continue;
      const c = await page.evaluate(() => { const e = document.getElementById('tmerr'); return e ? e.style.color : ''; });
      if (c) roundCol = c;
      if (await page.evaluate(() => !!document.querySelector('#tmclock'))) await down('#gen');
      await sleep(45); }
    await keySettle();
    const cols = await page.evaluate(() => ({ score: document.getElementById('over-score').style.color,
      verdict: document.getElementById('verdict').style.color,
      row: (document.querySelector('#over-runs tr.cur td:nth-child(3)') || {}).style?.color || '' }));
    (cols.score && cols.score === cols.verdict && cols.row === cols.score && roundCol)
      ? ok(`B.10 the tier colour is on the NUMBER — the result score, that run’s row on the board and each round’s own figure (${cols.score})`)
      : bad('B.10 the tier colour follows the number', JSON.stringify({ ...cols, roundCol }));
  }

  /* ---- B.12: an unlock toast goes there ---- */
  {
    const toast31 = fs.readFileSync(path.join(root31, 'ui', 'toast.js'), 'utf8');
    const res31 = fs.readFileSync(path.join(root31, 'ui', 'screens', 'result.js'), 'utf8');
    const passes = /\[unlockToast\(u\.key\),'','ok',false,u\.key\]/.test(res31);
    const midRun = /toast\(unlockToast\(x\.key\),'','ok'\)/.test(run31) && !/toast\(unlockToast\(x\.key\),'','ok',[^)]/.test(run31);
    (/dataset\.goto/.test(toast31) && /unlockWhere/.test(toast31) && passes && midRun)
      ? ok('B.12 an unlock toast on the RESULT screen carries where it leads and opens that pick sheet; mid-run it stays a toast')
      : bad('B.12 tapping an unlock toast goes there', JSON.stringify({ passes, midRun }));
    // and it actually navigates
    const went = await page.evaluate(async () => { const { toast } = await import('./ui/toast.js');
      toast('Unlock: Streak', '', 'ok', false, 'reaction:flash:-1');
      document.getElementById('toast').click(); await new Promise(r => setTimeout(r, 400));
      return { at: (document.querySelector('.screen.on') || {}).id, sheet: document.getElementById('sheet-title')?.textContent.trim() }; });
    (went.at === 's-pick') ? ok(`B.12 tapping it lands on the pick sheet — "${went.sheet}"`)
      : bad('B.12 the toast navigates', JSON.stringify(went));
  }

  /* ---- B.14: the 600 cap never drops a top-10 row ---- */
  {
    const NOW31 = Date.now();
    const many = Array.from({ length: 600 }, (_, i) => ({ t: NOW31 - 10000 - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 40 - (i % 30), misses: 0, row: 3 }));
    const rare = { t: NOW31 - 9999999, g: 'hold', d: 'grow', s: 7, n: '', v: 3, hits: 4.2, misses: 0, x: 1, y: 9 };
    await setStorage({ ne: { v: 2, prefs: { story: 1, played: 1, gridSeen: 1, menuSeen: 1, snd: 'off', musicG: {} }, runs: many.concat([rare]), ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const cap = await page.evaluate(async () => { const P = await import('./progress.js');
      const before = P.Scores.runs().filter(r => r.g === 'hold').length;
      for (let i = 0; i < 25; i++) P.Scores.submit({ t: Date.now() + i, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 11 + i, misses: 0, row: 3 });
      const runs = P.Scores.runs();
      return { before, after: runs.filter(r => r.g === 'hold').length, total: runs.length,
        top: P.Scores.of('quick-tap', 'two', 5).slice(0, 10).map(r => r.hits) }; });
    (cap.before === 1 && cap.after === 1 && cap.total <= 600 && cap.top[0] >= 40)
      ? ok(`B.14 601 runs, 25 more submitted: the one Estimate run — the oldest row in the store and its mode’s whole top ten — survives, and the store is back under the cap (${cap.total})`)
      : bad('B.14 the cap never drops a top-10 row', JSON.stringify(cap));
  }
}

/* ---- 13. build 32 (v19 §C, v18 §B.15–§B.27): Go / No-go's dealing and scoring, the three tiers, the chests ---- */
console.log('\nbuild 32 - v19 section C and v18 sections B.15 to B.27');
{
  const root32 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read32 = (...p) => fs.readFileSync(path.join(root32, ...p), 'utf8');
  const rx32 = read32('games', 'reaction', 'index.js'), keyjs32 = read32('ui', 'screens', 'key.js'), css32 = read32('styles', 'app.css');
  const store32 = read32('core', 'store.js'), run32 = read32('run', 'run.js'), pkjs32 = read32('progress', 'key.js'), pick32 = read32('ui', 'screens', 'pick.js');
  const tpl32 = read32('..', '_review', 'scripts', 'catalogue.template.html'), cat32 = read32('..', '_review', 'scripts', 'catalogue.mjs');
  const G32 = await import(pathToFileURL(path.join(root32, 'config', 'games.js')).href);
  const KB32 = await import(pathToFileURL(path.join(root32, 'config', 'key-bars.js')).href);
  const KY32 = await import(pathToFileURL(path.join(root32, 'config', 'keys.js')).href);
  const CP32 = await import(pathToFileURL(path.join(root32, 'config', 'copy.js')).href);
  const B32 = await import(pathToFileURL(path.join(root32, 'config', 'build.js')).href);
  const strip32 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const svgClick = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);

  /* ---- §C statically: the gate, the budget, the gaps, the dwell, the five shapes, the units ---- */
  {
    const RXC = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { free: R.NOGO_FREE, bud: R.NOGO_BUD, wrongSet: R.NOGO_WRONG_SET, wrongStreak: R.NOGO_WRONG_STREAK, gapMin: R.GO_GAP_MIN, gapMax: R.GO_GAP_MAX, dwell: R.NOGO_DWELL, per: R.GO_PER }; });
    (RXC.free === 180 && RXC.bud === 3000 && RXC.wrongSet === 150 && RXC.wrongStreak === 200)
      ? ok(`C.5 / C.6 (L5) the gate is ${RXC.free}ms and the Streak budget ${RXC.bud}ms; a wrong tap still adds ${RXC.wrongSet} to a Set and spends ${RXC.wrongStreak} of a Streak`)
      : bad('C.5 / C.6 the gate and the budget', JSON.stringify(RXC));
    (RXC.gapMin === 1 && RXC.gapMax === 5) ? ok('C.2 (L5) each target sits behind 1 to 5 decoys — 2nd to 6th in its sub-round') : bad('C.2 the gap range', JSON.stringify(RXC));
    const D = RXC.dwell || {};
    (D.set === 980 && D.streak === 1330 && D.spread === 180 && D.set - D.spread >= 800 && D.streak - D.spread >= 1150)
      ? ok(`C.4 (L5) dwell is ${D.set} ± ${D.spread} on a Set and ${D.streak} ± ${D.spread} on a Streak — never quicker than build 31's 800 / 1150, and variable`)
      : bad('C.4 the dwell', JSON.stringify(D));
    (Object.keys(G32.SHAPE_WORD).length === 5 && /\.rxshape\.diamond\{/.test(css32) && /\.rxshape\.hex\{/.test(css32) && /#rxbar i\.diamond/.test(css32) && /\.rxrule i\.hex/.test(css32))
      ? ok(`C.3 five shapes in SHAPE_WORD (${Object.keys(G32.SHAPE_WORD).join(', ')}), each drawn on the pane, the rule bar and the rule line`)
      : bad('C.3 five shapes', Object.keys(G32.SHAPE_WORD).join(','));
    const s32 = strip32(rx32);
    (/gated\(ms\)\{ return Math\.max\(0,ms-this\.NOGO_FREE\); \}/.test(s32) && /const add=this\.gated\(ms\); if\(this\.streak\(\)\) this\.over\+=add;/.test(s32) && /const all=this\.gatedAll\(\);/.test(s32) && !/this\.beatMs\(\)\)\.fill|fill\(this\.beatMs\(\)\)/.test(s32))
      ? ok('C.5 every tap goes through gated() — Streak spend and Set mean alike — and a skipped target is charged the dwell it was given')
      : bad('C.5 the gate is one function on both lengths');
    (/hits:this\.gotAll,/.test(s32) && G32.GAMES.reaction.per.nogo.streak.scoreWord === 'targets' && /180ms gate/.test(G32.SET_COPY['reaction:nogo'].set) && !/GO_PAD|GO_SPREAD|beatMs\(\)\?1150|\['circle','square','tri'\]/.test(s32))
      ? ok('C.6 a Streak scores in TARGETS (gotAll) and the sheet says so; the Set line names the 180ms gate; GO_PAD, GO_SPREAD, the fixed beats and the three-shape list are gone')
      : bad('C.6 the Streak unit and the retired constants');
    (B32.RUN_SCHEMA === 4 && /function up3\(raw\)/.test(store32) && /r\.d==='nogo'&&\(r\.v\|\|0\)<4/.test(store32) && /delete raw\.bars\['reaction:nogo:-1'\]/.test(store32) && /if\(\(raw\.v\|\|0\)<3\) raw=up3\(raw\);/.test(store32))
      ? ok('C.5 / C.6 a scoring unit changed, so RUN_SCHEMA is 4 and up3 retires the Go / No-go records and the Streak bar\'s cleared flag, nothing else')
      : bad('the migration for the Go / No-go unit change', `RUN_SCHEMA ${B32.RUN_SCHEMA}`);
    const ng = KB32.KEY_BARS['reaction:nogo:5'], ngs = KB32.KEY_BARS['reaction:nogo:-1'];
    (ng.bar === 200 && ng.dir === 'lower' && ngs.bar === 15 && ngs.dir === 'higher' && ngs.unit === 'targets')
      ? ok('C.5 / C.6 the Set bar is converted through the gate (380 → 200) and the Streak bar is 15 targets — one Set\'s worth at that pace')
      : bad('the two Go / No-go bars', JSON.stringify([ng, ngs]));
  }
  /* ---- §C as behaviour: 400 dealt rounds, the target order, the dwell draw, the arithmetic ---- */
  {
    const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default; const G = await import('./config/games.js');
      R.ctx = { mode: 'nogo', len: 5 }; R.two = { on: false }; R.rule = 'circle'; R.pool = [];
      const all = Object.keys(G.SHAPE_WORD);
      const out = { n: 0, first: 0, count: 0, adjacent: 0, thrice: 0, dup: 0, badDecoy: 0, gaps: {}, lens: {}, min: 99, max: 0, shapesSeen: new Set() };
      for (let i = 0; i < 400; i++) { const b = R.dealRound(); out.n++;
        out.lens[b.length] = (out.lens[b.length] || 0) + 1; out.min = Math.min(out.min, b.length); out.max = Math.max(out.max, b.length);
        if (b[0] === R.rule) out.first++;
        if (b.filter(s => s === R.rule).length !== R.GO_PER) out.count++;
        let gap = 0; for (let j = 0; j < b.length; j++) { b[j] === R.rule ? (out.gaps[gap] = (out.gaps[gap] || 0) + 1, gap = 0) : gap++; if (j && b[j] === R.rule && b[j - 1] === R.rule) out.adjacent++; if (b[j] !== R.rule) { out.shapesSeen.add(b[j]); if (!all.includes(b[j])) out.badDecoy++; } }
        for (let j = 2; j < b.length; j++) if (b[j] === b[j - 1] && b[j] === b[j - 2]) out.thrice++;
        for (let j = 1; j < b.length; j++) if (b[j] !== R.rule && b[j] === b[j - 1]) out.dup++; }
      // C.3: a Set's five targets are the five shapes, and a Streak never deals the same target twice running
      R.rule = ''; R.pool = []; const setOrder = []; for (let i = 0; i < 5; i++) { R.rule = R.nextTarget(); setOrder.push(R.rule); }
      let repeat = 0; R.rule = ''; R.pool = []; let prev = ''; for (let i = 0; i < 60; i++) { R.rule = R.nextTarget(); if (R.rule === prev) repeat++; prev = R.rule; }
      // C.4: the dwell draw, per length
      const dw = { set: [], streak: [] }; for (let i = 0; i < 300; i++) { R.ctx.len = 5; dw.set.push(R.dwellMs()); R.ctx.len = G.STREAK; dw.streak.push(R.dwellMs()); }
      const rng = a => ({ min: Math.min(...a), max: Math.max(...a), distinct: new Set(a).size });
      // C.5: the arithmetic on three raw taps at the old bar's pace, then one wrong tap, then a skipped target; and a Streak in targets
      R.ctx.len = 5; R.times = [380, 380, 380]; R.skipped = []; R.wrong = 0; R.gotAll = 3; const set0 = R.nogoScore().hits;
      R.wrong = 1; const set1 = R.nogoScore().hits; R.wrong = 0; R.skipped = [980]; const set2 = R.nogoScore().hits;
      R.times = [100, 150, 180]; R.skipped = []; const setFree = R.nogoScore().hits;
      R.ctx.len = G.STREAK; R.gotAll = 7; R.seen = 40; const streakHits = R.nogoScore().hits;
      R.ctx = null; R.times = []; R.skipped = []; R.wrong = 0; R.gotAll = 0; R.seen = 0; R.pool = [];
      return { ...out, shapesSeen: [...out.shapesSeen].sort(), setOrder, distinctTargets: new Set(setOrder).size, repeat, dwSet: rng(dw.set), dwStreak: rng(dw.streak), set0, set1, set2, setFree, streakHits }; });
    (!d.first && !d.count && !d.adjacent && !d.thrice && !d.dup && !d.badDecoy)
      ? ok(`C.1 / C.2 400 dealt rounds: first shape always a decoy, exactly 3 targets, NO TWO TARGETS ADJACENT, no shape three running, no decoy repeated (${d.min}–${d.max} shapes a round)`)
      : bad('C.1 / C.2 the solo dealer', JSON.stringify({ first: d.first, count: d.count, adjacent: d.adjacent, thrice: d.thrice, dup: d.dup, badDecoy: d.badDecoy }));
    const gapTot = Object.values(d.gaps).reduce((a, b) => a + b, 0); const gapShare = Object.fromEntries(Object.entries(d.gaps).map(([k, v]) => [k, +(v / gapTot).toFixed(3)]));
    const gapOk = [1, 2, 3, 4, 5].every(k => (d.gaps[k] || 0) / gapTot >= 0.12) && !d.gaps[0] && !d.gaps[6];
    gapOk ? ok(`C.2 the target's position is spread — decoys before it, share of 1200 targets: ${JSON.stringify(gapShare)}`) : bad('C.2 the position is drawn uniformly from 1 to 5 decoys', JSON.stringify(gapShare));
    (d.shapesSeen.length === 4 && d.distinctTargets === 5 && !d.repeat)
      ? ok(`C.3 decoys come from the other four shapes (${d.shapesSeen.join(', ')}), a Set's five targets are five different shapes (${d.setOrder.join(' → ')}), and a Streak never repeats a target twice running`)
      : bad('C.3 the five shapes', JSON.stringify({ seen: d.shapesSeen, order: d.setOrder, repeat: d.repeat }));
    (d.dwSet.min >= 800 && d.dwSet.max <= 1160 && d.dwSet.distinct > 20 && d.dwStreak.min >= 1150 && d.dwStreak.max <= 1510 && d.dwStreak.distinct > 20)
      ? ok(`C.4 300 dwell draws: a Set shape stays ${d.dwSet.min}–${d.dwSet.max}ms, a Streak shape ${d.dwStreak.min}–${d.dwStreak.max}ms, and the draw varies`)
      : bad('C.4 the dwell draw', JSON.stringify({ set: d.dwSet, streak: d.dwStreak }));
    (d.set0 === 200 && d.set1 === 350 && d.set2 === 350 && d.setFree === 0 && d.streakHits === 7)
      ? ok(`C.5 the arithmetic: three 380ms taps read 200 (over the gate), a wrong tap adds 150 (350), a skipped 980ms target is charged 800 (mean 350), three taps at or under 180 read 0, and a Streak reads its targets (7), not its shapes (40)`)
      : bad('C.5 the scoring', JSON.stringify({ set0: d.set0, set1: d.set1, set2: d.set2, setFree: d.setFree, streakHits: d.streakHits }));
    // the migration as behaviour: a v2 record with Go / No-go runs in the old units
    await setStorage({ ne: { v: 2, prefs: { ...OPEN_PREFS }, runs: [
        { t: NOW - 1000, g: 'reaction', d: 'nogo', s: 5, n: '', v: 3, hits: 380, misses: 0 }, { t: NOW - 2000, g: 'reaction', d: 'nogo', s: -1, n: '', v: 3, hits: 12, misses: 1 },
        { t: NOW - 3000, g: 'reaction', d: 'flash', s: 5, n: '', v: 3, hits: 255, misses: 0 }, { t: NOW - 4000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 14, misses: 0 } ],
      unlock: {}, ach: { rx_clean: NOW }, intro: SEEN_INTRO, seen: {}, bars: { 'reaction:nogo:5': NOW, 'reaction:nogo:-1': NOW, 'quick-tap:two:5': NOW } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const mig = await page.evaluate(async () => { const S = await import('./core/store.js');
      return { v: JSON.parse(localStorage.getItem('ne')).v, runs: S.store.runs.map(r => r.g + ':' + r.d), bars: Object.keys(S.store.bars).sort(), ach: Object.keys(S.store.ach), mig: S.prefs.mig32, toast: document.getElementById('toast').textContent.trim() }; });
    (mig.runs.join(',') === 'reaction:flash,quick-tap:two' && mig.bars.join(',') === 'quick-tap:two:5,reaction:nogo:5' && mig.ach.includes('rx_clean'))
      ? ok(`C.5 / C.6 a v2 record retires exactly the two Go / No-go runs and the Streak bar's cleared flag — the Set bar, the Flash run, the Quick Tap run and Disciplined stay (${mig.toast || 'toast pending'})`)
      : bad('the Go / No-go migration', JSON.stringify(mig));
  }
  /* ---- B.27: three tiers per row, the shell derived from the column, the catalogue's three inputs ---- */
  {
    const rows = Object.values(KB32.KEY_BARS);
    (rows.every(r => 'pro' in r && 'author' in r && r.pro === null && r.author === null) && KY32.KEYS.every(k => !('shell' in k)))
      ? ok(`B.27 every one of the ${rows.length} rows carries pro and author, both EMPTY (A.2), and config/keys.js carries no shell flag`)
      : bad('B.27 the data shape', JSON.stringify(rows.filter(r => !('pro' in r && 'author' in r)).map(r => r.id)));
    const sh = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      S.prefs.chest1 = 1; S.store.bars = {}; S.save();
      const c = K.COMBOS.find(x => x.g === 'quick-tap' && x.s === 5);
      const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, misses: 0, hits: c.bar.bar + 50, v: 4 };
      const adv = K.checkKey(run, false);
      const out = { shellClear: K.isShell('clear'), shellPro: K.isShell('pro'), shellAuthor: K.isShell('author'), fullClear: K.tierFull('clear'), barPro: K.barOf(c, 'pro'), skey: K.skey('a:b:5', 'pro'),
        tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv && adv.tier, bars: Object.keys(S.store.bars), pct: K.keyPct('pro') };
      S.store.bars = {}; S.prefs.chest1 = 0; S.save(); return out; });
    (!sh.shellClear && sh.shellPro && sh.shellAuthor && sh.fullClear && sh.barPro === null && sh.skey === 'a:b:5|pro' && sh.tiers.join(',') === 'clear:live,pro:shell,author:shell')
      ? ok('B.27 the shell is DERIVED: key 1 is live, Pro and Author are shells while their columns are empty, and a Pro bar reads null')
      : bad('B.27 isShell / tierFull / barOf', JSON.stringify(sh));
    (sh.adv === 'clear' && sh.bars.join(',') === 'quick-tap:two:5' && sh.pct.pct === 0 && sh.pct.total === 0)
      ? ok('B.27 a run far past every bar clears key 1 only — a shell tier banks nothing and its percentage is 0 of 0')
      : bad('B.27 a shell tier clears nothing', JSON.stringify(sh));
    (/pro: b \? KY\.barOf\(c, 'pro'\) : null, author: b \? KY\.barOf\(c, 'author'\) : null/.test(cat32) && /id="' \+ PFX\[tier\] \+ r\.id/.test(tpl32) && /inp\('clear'\) \+ inp\('pro'\) \+ inp\('author'\)/.test(tpl32) && /bars: \{ clear: CUR\.clear, pro: CUR\.pro, author: CUR\.author \}/.test(tpl32))
      ? ok('B.27 the review catalogue emits all three tiers a row and the page saves {bars:{clear,pro,author}} to bars/current')
      : bad('B.27 the catalogue\'s three inputs');
  }
  /* ---- B.15 / B.16 / B.17: "67% complete", the step into Pro, the re-based number ---- */
  {
    const fp = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const C = await import('./config/copy.js');
      S.store.runs = []; S.store.bars = {}; S.prefs.pro = 0; S.prefs.chest1 = 0; S.prefs.played = 1; S.save();
      const out = {};
      for (const c of K.COMBOS) S.store.bars[c.key] = Date.now(); S.save();
      out.whole = K.frontPct(); R.show('s-menu'); await new Promise(r => setTimeout(r, 250)); out.menuWhole = document.getElementById('menu-key').textContent.trim();
      S.prefs.pro = 1; S.prefs.chest1 = 1; S.save(); out.rebased = K.frontPct(); R.show('s-menu'); await new Promise(r => setTimeout(r, 250)); out.menuPro = document.getElementById('menu-key').textContent.trim();
      S.prefs.pro = 2; S.save(); out.author = K.frontPct();
      S.store.bars = {}; S.prefs.pro = 0; S.prefs.chest1 = 0; S.save(); out.zero = K.frontPct();
      return { ...out, warn: C.KEY.proWarn, ask: C.KEY.proAsk }; });
    (fp.whole === 100 && fp.rebased === 30 && fp.author === 30 && fp.zero === 0 && fp.menuPro === '30% complete' && /whole/.test(fp.menuWhole))
      ? ok(`B.17 key 1 whole reads 100 and "${fp.menuWhole}"; stepped into Pro it re-bases to 30 (Pro is a shell, so 30 + 0.7 × 0) — "${fp.menuPro}"; Author the same step; never back to zero`)
      : bad('B.17 the re-based percentage', JSON.stringify(fp));
    (/cannot be undone/i.test(fp.warn) && /stop showing 100%/.test(fp.warn) && /progress to/.test(fp.ask)) ? ok('B.16 the ask carries the warning — the front stops showing 100% and it cannot be undone') : bad('B.16 the warning text', fp.warn);
    // the flow, driven: every bar cleared -> Open the chest? -> yes -> opened -> progress to Pro? -> yes -> prefs.pro
    const bars = await page.evaluate(async () => { const K = await import('./progress/key.js'); const o = {}; for (const c of K.COMBOS) o[c.key] = Date.now(); return o; });
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    await click('.chest[data-chest="1"]'); await sleep(300); await click('#ask-yes'); await sleep(3600);
    const pro = await page.evaluate(() => ({ on: document.getElementById('askwrap').classList.contains('on'), title: document.getElementById('ask-title').textContent.trim(), chest1: JSON.parse(localStorage.getItem('ne')).prefs.chest1,
      c2: !document.querySelector('.chest[data-chest="2"]').hidden, c3: !document.querySelector('.chest[data-chest="3"]').hidden }));
    (pro.on && /progress to Pro/.test(pro.title) && pro.chest1 === 1 && pro.c2 && pro.c3)
      ? ok(`B.16 / B.19 the opened chest asks "${pro.title}", and the Pro and Author chests have appeared under it`)
      : bad('B.16 the ask after the opening', JSON.stringify(pro));
    await click('#ask-yes'); await sleep(400);
    const stepped = await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.pro);
    await click('#s-pick .back'); await sleep(500);
    const line = await page.evaluate(() => document.getElementById('menu-key').textContent.trim());
    (stepped === 1 && line === '30% complete') ? ok(`B.16 / B.17 yes steps into Pro (prefs.pro = 1) and the menu re-bases to "${line}"`) : bad('B.16 the step into Pro', JSON.stringify({ stepped, line }));
    // B.19: the column — same grid column as chest 1, the two rows under it; each locked one names its key and no number
    await click('[data-go="s-pick"]'); await sleep(600);
    const col = await page.evaluate(() => { const c = n => document.querySelector(`.chest[data-chest="${n}"]`); const cell = n => ({ r: +c(n).style.gridRow, col: +c(n).style.gridColumn, need: c(n).querySelector('.pic').dataset.need, cls: c(n).className, name: c(n).querySelector('.name').textContent.trim() });
      return { 1: cell(1), 2: cell(2), 3: cell(3), scroll: getComputedStyle(document.getElementById('s-pick')).overflowY }; });
    (col[2].col === col[1].col && col[3].col === col[1].col && col[2].r === col[1].r + 1 && col[3].r === col[1].r + 2 && /locked/.test(col[2].cls) && /locked/.test(col[3].cls) && /Pro/.test(col[2].need) && /Author/.test(col[3].need) && !/\d/.test(col[2].need + col[3].need) && col.scroll === 'auto')
      ? ok(`B.19 three chests in a column (rows ${col[1].r}, ${col[2].r}, ${col[3].r}); the locked ones say "${col[2].need}" / "${col[3].need}" and nothing about what is inside; the screen scrolls`)
      : bad('B.19 the chest column', JSON.stringify(col));
  }
  /* ---- B.18: the outline fills with key-1 progress; complete is a different thing ---- */
  {
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 9, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: { 'quick-tap:two:5': NOW, 'quick-tap:two:15': NOW, 'quick-tap:two:30': NOW } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const kf = await page.evaluate(async () => { const K = await import('./progress/key.js'); const t = document.querySelector('.tile[data-game="quick-tap"]'); const r = t.querySelector('.kfill rect');
      const cs = getComputedStyle(r); const keyfill = getComputedStyle(document.documentElement).getPropertyValue('--keyfill').trim();
      const locked = document.querySelector('.tile.locked .kfill'); const lockedShown = locked ? getComputedStyle(locked).display !== 'none' : false;
      return { kf: t.querySelector('.kfill').style.getPropertyValue('--kf'), frac: K.gameKey('quick-tap').frac, part: t.classList.contains('kpart'), done: t.classList.contains('kdone'), stroke: cs.stroke, dash: cs.strokeDasharray, keyfill, lockedShown, ok: getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() }; });
    const hex2rgb2 = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    (kf.kf === '0.500' && Math.abs(kf.frac - 0.5) < 1e-6 && kf.part && !kf.done && kf.stroke === hex2rgb2(kf.keyfill) && kf.keyfill !== kf.ok && kf.keyfill !== '#FFFFFF' && /^0\.5/.test(kf.dash))
      ? ok(`B.18 Quick Tap with 3 of 6 cleared wears an outline drawn half way round (--kf ${kf.kf}, dash ${kf.dash}) in ${kf.keyfill} — not green, not white`)
      : bad('B.18 the filling outline', JSON.stringify(kf));
    (!kf.lockedShown) ? ok('B.18 a locked game shows no outline') : bad('B.18 a locked tile draws an outline');
    const bars6 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save(); const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-pick'); await new Promise(r => setTimeout(r, 500));
      const t = document.querySelector('.tile[data-game="quick-tap"]'); return { done: t.classList.contains('kdone'), kf: t.querySelector('.kfill').style.getPropertyValue('--kf'), shadow: getComputedStyle(t.querySelector('.pic')).boxShadow !== 'none' }; });
    (bars6.done && bars6.kf === '1.000' && bars6.shadow) ? ok('B.18 all six cleared: the outline closes and the picture takes the wash — complete reads as a different thing') : bad('B.18 the complete tile', JSON.stringify(bars6));
  }
  /* ---- B.21: the arrival plays the first time the screen is seen, via a clear during a run too ---- */
  {
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 0, adRuns: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const arr = await page.evaluate(async () => {
      const E = await import('./core/events.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js'); const K = await import('./progress/key.js');
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
      const bar = K.COMBOS.find(c => c.g === 'quick-tap' && c.d === 'two' && c.s === 5).bar;
      const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: bar.bar + 3, misses: 0, n: '', v: 4 };
      const adv = K.checkKey(run, false); if (!adv) return { err: 'no clear' };
      E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
      const at = () => (document.querySelector('.screen.on') || {}).id; const wait = ms => new Promise(r => setTimeout(r, ms));
      // the interlude starts ~1s after the finish (250 ad-break + 420 fade + 320), plays the 2.6s arrival, then the segment
      await wait(1500); const onKey = at(); const first = document.getElementById('s-key').classList.contains('first');
      const grewEarly = !!document.querySelector('.kroot.grow');
      await wait(2900); const grewLater = !!document.querySelector('.kroot.grow');
      await wait(4200); return { err: null, onKey, first, grewEarly, grewLater, back: at(), seen: JSON.parse(localStorage.getItem('ne')).prefs.keySeen }; });
    if (arr.err) bad('B.21 the fabricated clear', arr.err);
    else (arr.onKey === 's-key' && arr.first && !arr.grewEarly && arr.grewLater && arr.back === 's-over' && arr.seen === 1)
      ? ok('B.21 a first-ever visit that arrives as a clear during a run PLAYS THE ARRIVAL, then the segment, then hands back — and marks the screen seen')
      : bad('B.21 the interlude plays the arrival first', JSON.stringify(arr));
    await click('[data-go="s-key"]').catch(() => {}); await sleep(300);
    const again = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    (!again) ? ok('B.21 and the Keys menu item does not play it a second time') : bad('B.21 the arrival played twice');
  }
  /* ---- B.22 / B.23: the ring in the tier's style, and taps inside it ---- */
  {
    (KY32.KEYS.map(k => k.style).join(',') === 'lantern,circuit,thorn' && /spokeOf\(style, i\)/.test(keyjs32) && /style === 'circuit'/.test(keyjs32) && /style === 'thorn'/.test(keyjs32) && /pathLength="1"/.test(keyjs32) && /\.kthorn\{/.test(css32) && /\.kdot2\{/.test(css32) && /\.karc\{/.test(css32))
      ? ok('B.22 Lantern / Circuit / Thorn are drawn by style — straight glowing spokes, right-angled traces with corner dots, curved branches with thorns — every segment a path of length 1')
      : bad('B.22 the three styles');
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 1, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(500);
    // fill the two columns IN MEMORY so the two styles can be drawn; a reload discards it
    const art = await page.evaluate(async () => { const KB = await import('./config/key-bars.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      for (const k in KB.KEY_BARS) { KB.KEY_BARS[k].pro = KB.KEY_BARS[k].bar; KB.KEY_BARS[k].author = KB.KEY_BARS[k].bar; }
      const out = { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author') };
      const el = document.getElementById('s-key'); const n = () => ({ style: el.dataset.style, segs: document.querySelectorAll('#key-ring .kroot').length, paths: document.querySelectorAll('#key-ring path.kroot').length,
        dots: document.querySelectorAll('#key-ring .kdot2').length, thorns: document.querySelectorAll('#key-ring .kthorn').length, ground: !!document.querySelector('#key-ring .kground'), rects: document.querySelectorAll('#key-ring rect.kdot').length, tint: el.style.getPropertyValue('--ktint').trim() });
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.lantern = n();
      document.querySelector('.kkey[data-kt="1"]').click(); await new Promise(r => setTimeout(r, 300)); out.circuit = n();
      document.querySelector('.kkey[data-kt="2"]').click(); await new Promise(r => setTimeout(r, 300)); out.thorn = n();
      return out; });
    const N = art.lantern.segs;
    (!art.shellPro && !art.shellAuthor && art.lantern.style === 'lantern' && art.lantern.paths === N && !art.lantern.dots && !art.lantern.thorns && art.lantern.tint === '#FFD08A'
      && art.circuit.style === 'circuit' && art.circuit.segs === N && art.circuit.dots > 0 && art.circuit.rects === GAMES.length && art.circuit.tint === '#BFE6FF' && art.circuit.tint !== '#D39A5E'
      && art.thorn.style === 'thorn' && art.thorn.segs === N && art.thorn.thorns > 0 && !art.thorn.dots && art.thorn.tint === '#FFFFFF' && art.lantern.ground)
      ? ok(`B.22 with the columns filled in memory the ring redraws per tier — Lantern ${N} glowing segments, Circuit ${N} segments with ${art.circuit.dots} corner dots and square nodes in Frost's white-blue (not the page's copper), Thorn ${N} segments with ${art.thorn.thorns} thorns in white`)
      : bad('B.22 the three rings', JSON.stringify(art));
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(500);
    await svgClick('#key-ring .kground'); await sleep(250);
    const ground = await onScreen();
    await svgClick('#key-ring .khit2[data-kg="dots"]'); await sleep(350);
    const bar = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, h4: (document.querySelector('#key-list h4') || {}).textContent, sel: !!document.querySelector('.knode.sel[data-kg="dots"]') }));
    (ground === 's-key' && bar.screen === 's-key' && /Dots/.test(bar.h4 || '') && bar.sel)
      ? ok('B.23 a tap on the ring\'s ground stays put, and a tap on Dots\' bar selects Dots exactly as its circle does')
      : bad('B.23 taps inside the ring', JSON.stringify({ ground, ...bar }));
    await page.evaluate(async () => { const B = await import('./ui/router.js'); B.show('s-menu'); }); await sleep(300);
  }
  /* ---- B.24: the radar's rungs and the flame ---- */
  {
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 0 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 6, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    const r1 = await page.evaluate(() => ({ web: document.querySelectorAll('#radar polygon.web').length, rungs: document.querySelectorAll('#radar polygon.rung').length, flame: document.querySelectorAll('#radar .flame').length, txt: document.getElementById('s-board').innerText.toLowerCase(), qt: (document.querySelector('#radar text') || {}).textContent }));
    (r1.web === 4 && r1.rungs === 0 && r1.flame === 0 && !/\bpro\b|author/.test(r1.txt) && /Quick Tap 50/.test(r1.qt || ''))
      ? ok(`B.24 / A.1 before chest 1 the radar has one rung — key 1 at the ring — and nothing beyond it; 6 hits against a bar of 12 reads "${r1.qt}"`)
      : bad('B.24 the single-rung radar', JSON.stringify(r1));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    const r2 = await page.evaluate(async () => { const out = { rungs: [...document.querySelectorAll('#radar polygon.rung')].map(p => p.dataset.rung + (p.classList.contains('shell') ? ':dashed' : '')), flame: document.querySelectorAll('#radar .flame').length, qt: (document.querySelector('#radar text') || {}).textContent, dash: getComputedStyle(document.querySelector('#radar polygon.rung.shell')).strokeDasharray };
      // fill the two columns in memory: 60 hits is past an author bar of 12, so the flame lights
      const KB = await import('./config/key-bars.js'); for (const k in KB.KEY_BARS) { KB.KEY_BARS[k].pro = KB.KEY_BARS[k].bar; KB.KEY_BARS[k].author = KB.KEY_BARS[k].bar; }
      const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-board'); await new Promise(r => setTimeout(r, 400));
      out.full = { rungs: [...document.querySelectorAll('#radar polygon.rung')].map(p => p.dataset.rung + (p.classList.contains('shell') ? ':dashed' : '')), flame: document.querySelectorAll('#radar .flame').length, qt: (document.querySelector('#radar text') || {}).textContent };
      return out; });
    (r2.rungs.join(',') === 'clear,pro:dashed,author:dashed' && r2.flame === 0 && /Quick Tap 33/.test(r2.qt || '') && r2.dash !== 'none')
      ? ok(`B.24 / A.2 after chest 1 three rungs — key 1, then Pro and Author DASHED at no value while their columns are empty; 60 hits against a bar of 12 climbs no further than rung 1 ("${r2.qt}") and no flame`)
      : bad('B.24 the three rungs with shells', JSON.stringify(r2));
    (r2.full.rungs.join(',') === 'clear,pro,author' && r2.full.flame === 1 && /Quick Tap 1\d\d/.test(r2.full.qt || ''))
      ? ok(`B.24 with the columns filled the rungs are solid and a score past the Author time wears the flame ("${r2.full.qt}")`)
      : bad('B.24 the flame', JSON.stringify(r2.full));
  }
  /* ---- B.25: the three achievement sets tied to the keys ---- */
  {
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ka = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const rows = K.keyAch(); const out = { n: rows.length, tiers: [...new Set(rows.map(r => r.tier))], perTier: rows.filter(r => r.tier === 'key1').length, live: rows.filter(r => r.live).length };
      S.prefs.chest1 = 0; S.prefs.progTab = 'ach'; S.store.bars = {}; S.store.ach = {}; S.save();
      R.show('s-prog', { tab: 'ach' }); await new Promise(r => setTimeout(r, 400));
      const heads = () => [...document.querySelectorAll('#achlist h4')].map(h => h.className);
      out.before = heads();
      S.prefs.chest1 = 1; S.save(); R.show('s-menu'); await new Promise(r => setTimeout(r, 150)); R.show('s-prog', { tab: 'ach' }); await new Promise(r => setTimeout(r, 400));
      out.after = heads();
      // earn: every Quick Tap bar cleared, then the check the run makes
      for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save();
      const fresh = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.fresh = fresh.map(a => a.id); out.stored = Object.keys(S.store.ach);
      const none = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.again = none.length;
      S.store.bars = {}; S.store.ach = {}; S.prefs.chest1 = 0; S.save(); return out; });
    (ka.n === 24 && ka.tiers.join(',') === 'key1,key2,key3' && ka.perTier === GAMES.length + 1 && ka.live === 0)
      ? ok(`B.25 24 key achievements — one per game per key plus one per key for the whole key — generated, none of them live`)
      : bad('B.25 the key sets', JSON.stringify(ka));
    (ka.before.includes('key1') && !ka.before.includes('key2') && !ka.before.includes('key3') && ka.after.includes('key2') && ka.after.includes('key3'))
      ? ok('B.25 / A.1 the Achievements tab shows The key before chest 1 and the Pro and Author sets only after it')
      : bad('B.25 the sets before and after chest 1', JSON.stringify({ before: ka.before, after: ka.after }));
    (ka.fresh.join(',') === 'key_clear_quick-tap' && ka.stored.includes('key_clear_quick-tap') && ka.again === 0)
      ? ok('B.25 clearing every Quick Tap bar earns "Quick Tap · The key", banked at once and never twice')
      : bad('B.25 the earn', JSON.stringify({ fresh: ka.fresh, stored: ka.stored, again: ka.again }));
    (/const adv=checkKey\(run,two\);[\s\S]{0,400}checkAch\(run\)\.concat\(checkKeyAch\(run\)\)/.test(run32)) ? ok('B.25 run/run.js banks the key BEFORE it asks the achievements, and asks the key sets too') : bad('B.25 the order in run.js');
  }
  /* ---- B.20 / B.26: the whole-key moment, and the Testing buttons ---- */
  {
    (/kwholeglyph/.test(css32) && /function wholeMoment\(\)/.test(keyjs32) && /prefs\.keyWhole/.test(keyjs32)) ? ok('B.20 the whole-key moment exists — the hub glyph turns and flares, once per tier per profile') : bad('B.20 the whole-key moment');
    const bars = await page.evaluate(async () => { const K = await import('./progress/key.js'); const o = {}; for (const c of K.COMBOS) o[c.key] = Date.now(); return o; });
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const w1 = await page.evaluate(() => ({ cls: document.getElementById('s-key').classList.contains('kwhole'), count: document.getElementById('key-count').textContent.trim(), seen: JSON.parse(localStorage.getItem('ne')).prefs.keyWhole }));
    await sleep(3600); await click('#s-key .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(700);
    const w2 = await page.evaluate(() => document.getElementById('s-key').classList.contains('kwhole'));
    (w1.cls && /whole/.test(w1.count) && w1.seen && w1.seen.clear === 1 && !w2) ? ok(`B.20 a whole key plays its moment on the keys screen once — "${w1.count}" — and not on the next open`) : bad('B.20 the moment plays once', JSON.stringify({ w1, w2 }));
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] #dev-anim [data-act]')].map(b => b.dataset.act + (b.dataset.n ? b.dataset.n : '')));
    (btns.join(',') === 'dev-keyin,dev-seg,dev-whole,dev-chest1,dev-chest2,dev-chest3') ? ok('B.26 six Testing buttons, one per animation, under [data-dev] (S5)') : bad('B.26 the buttons', btns.join(','));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1, keyWhole: { clear: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-testing"]'); await sleep(300); await click('[data-act="dev-whole"]'); await sleep(700);
    const dw = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cls: document.getElementById('s-key').classList.contains('kwhole') }));
    await sleep(3400); await click('#s-key .back'); await sleep(400);
    const dwBack = await onScreen();
    await click('[data-act="dev-chest"][data-n="2"]'); await sleep(1200);
    const dc = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="2"]'); return { screen: (document.querySelector('.screen.on') || {}).id, shown: !c.hidden, opening: c.classList.contains('opening') }; });
    await sleep(3200);
    const dcAfter = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="2"]'); return { hidden: c.hidden, chest2: JSON.parse(localStorage.getItem('ne')).prefs.chest2, whole: JSON.parse(localStorage.getItem('ne')).prefs.keyWhole }; });
    (dw.screen === 's-key' && dw.cls && dwBack === 's-testing' && dc.screen === 's-pick' && dc.shown && dc.opening && dcAfter.hidden && !dcAfter.chest2 && dcAfter.whole && dcAfter.whole.clear === 1)
      ? ok('B.26 "key complete" plays the moment and Back returns to Testing; "chest 2 opening" shows the chest, plays the opening and puts it away — nothing stored')
      : bad('B.26 the buttons play and store nothing', JSON.stringify({ dw, dwBack, dc, dcAfter }));
    await click('[data-act="dev-keyin"]').catch(() => {}); await sleep(300);
    const arrive = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    arrive ? ok('B.26 "key arrival" plays the arrival again') : bad('B.26 the arrival button');
    await sleep(2500);
  }
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
