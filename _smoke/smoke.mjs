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
import { launch, phonePage, FONT_HOST, IGNORED_REQUEST } from './chrome.mjs';

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
// v18 (B.32, build 33): every URL the page asks for, for the whole run — the font assertion counts the ones that left the origin
const reqs = [];
page.on('request', r => reqs.push(r.url()));

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
// AMENDED at build 39 (v23 L.4a): s-custom is back — Customise is its own menu row again (a tab of s-prog from build 33 to 38)
for (const s of ['s-board', 's-prog', 's-custom', 's-key', 's-about', 's-testing']) { await click('.back'); await sleep(250); await click(`[data-go="${s}"]`); await sleep(600); (await onScreen()) === s ? ok(`${s} opens`) : bad(`${s} opens`, 'on ' + (await onScreen())); }

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
  // AMENDED at build 35 (v21 F.4): the record is v4 - up4 is the ladder's third step
  (ne && ne.v === 5 /* AMENDED at build 40: the ladder ends at v5 */ && Array.isArray(runs) && runs.every(r => r.v === 4)) ? ok('build-13 layout: migrated to `ne` v5, runs stamped RUN_SCHEMA 4') : bad('build-13 layout: ne v5 + run stamp', JSON.stringify({ v: ne && ne.v, stamps: runs && runs.map(r => r.v) }));
  const left = await page.evaluate(() => ['ne.prefs', 'ne.runs', 'ne.unlock', 'ne.ach', 'ne.seen', 'ne.intro', 'ne.tileSeen'].filter(k => localStorage.getItem(k) !== null));
  left.length === 0 ? ok('build-13 layout: the seven old keys are gone') : bad('build-13 layout: old keys removed', left.join(', '));
  (ne && ne.unlock['dots:blind'] && ne.ach.first && ne.ach.named && ne.intro['quick-tap:two'] && ne.seen && ne.seen['game:dots']) ? ok('build-13 layout: unlocks, achievements, intros and seen carried over') : bad('build-13 layout: maps carried', JSON.stringify({ u: ne && ne.unlock, a: ne && ne.ach, i: ne && ne.intro, s: ne && ne.seen }).slice(0, 160));
  (ne && ne.prefs.col['quick-tap'].sq === '#FFFFFF' && ne.prefs.mig35 >= 1 && ne.prefs.adRuns === 3 && ne.prefs.col.dots && ne.prefs.col.dots.sq === '#FFFFFF') ? ok('build-13 layout: prefs carried and missing games seeded - AMENDED at build 35 (F.4): the carried colour is retired to white by up4 and counted in mig35') : bad('build-13 layout: prefs carried', JSON.stringify(ne && ne.prefs).slice(0, 160));
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
    (ne.v === 5 /* AMENDED at build 40: the ladder runs on to v5 */ && kinds.join('|') === want && ne.runs.every(r => r.v === 4) && ne.bars['timing:hidden:10'] && ne.bars['quick-tap:two:5'] && ne.ach.tm_wall && ne.ach.first)
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
  const ach = await page.evaluate(() => {
    const row = document.getElementById('ach-qt_bclean5'), sec = document.getElementById('ach-qt_s5'), ev = document.getElementById('ach-every');
    return { ox: getComputedStyle(document.getElementById('achlist')).overflowX,
      lead: row ? (row.querySelector('span i') || {}).textContent : null,
      leadFirst: row ? row.querySelector('span').firstElementChild?.tagName : null,
      secret: sec ? (sec.querySelector('small') || {}).textContent : null,
      left: ev ? (ev.querySelector('small') || {}).textContent : null };
  });
  ach.left = await evTxt();
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
  // AMENDED at build 34 (#411 / #371): a fifth switch — fill pro + author · placeholder
  (moved.item && moved.below === 's-testing' && moved.inAbout === 0 && moved.inTesting === 22)   // AMENDED at build 37 (v21 G.8): a switch and a reset per key. AMENDED at build 40 (L.8f): per CHEST, four of each, the meter field's two, and a fourth chest-opening button
    ? ok('8.10 Testing is its own item directly below About, with all five switches, the seven animation buttons, the eight per-chest buttons and the meter\'s two, none left in About')
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
  // AMENDED at build 40 (v23 L.8a): the percentage on the count line is THE METER — OPEN EVERYTHING opens every mode, so band 1 is full and nothing else is
  /^0 of \d+ · 100%$/.test((ui.count || '').trim()) ? ok(`A.6 / L.8a the keys screen reads "${ui.count.trim()}" on a profile with no runs - no bar cleared, and the meter's modes band full under OPEN EVERYTHING`)
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
      blindMar: [L('dots', 'blind', 2)({ hits: 22 }), L('dots', 'blind', 2)({ hits: 21 })],   // AMENDED at build 35 (#415, L6): 24 -> 22
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
  pair('1.2d / #415 Dots · Blind Marathon asks 22 (AMENDED at build 35, was 24)', V.lens.blindMar);
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
  // AMENDED at build 38 (#426): both columns carry generated placeholders, so no key is a shell any more
  (!k1.shell[0] && !k1.shell[1] && !k1.shell[2]) ? ok('5.3 / #426 no key is a shell - Pro and Author carry generated placeholder bars') : bad('5.3 the shell flags', JSON.stringify(k1.shell));
  // tapping key 3 opens the Author key's own ring, and every generated number on it says so (A.2 as amended)
  await page.evaluate(() => document.querySelector('.kkey[data-kt="2"]').click()); await sleep(320);
  const k3 = await page.evaluate(() => ({ main: !document.getElementById('key-main').hidden, shell: !document.getElementById('key-shell').hidden,
    rings: document.querySelectorAll('#key-ring .kroot').length, style: document.getElementById('s-key').dataset.style,
    warn: document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent.trim(),
    title: document.getElementById('key-title').textContent.trim() }));
  (k3.main && !k3.shell && k3.rings > 0 && k3.style === 'thorn' && /^(\d+) of the \1 numbers on this key are PLACEHOLDERS/.test(k3.warn))
    ? ok(`5.3 / #426 the Author key opens its own ring - "${k3.title}", ${k3.rings} segments in Thorn - and says "${k3.warn}"`) : bad('5.3 the Author screen', JSON.stringify(k3));
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
  // customise: swatch, wheel + done, sound pack, scale (Sequence), the music row, game chip, lock line.
  // AMENDED at build 39 (v23 L.4a): Customise is its own menu row again, so the walk opens it straight off the menu
  await tap('[data-go="s-custom"]', 'customise'); await sleep(300);
  await tap('#c-sq button:nth-child(2)', 'customise · target colour');
  await tap('#c-sq button[data-v="wheel"]', 'customise · colour wheel'); await tap('#wheel-done');
  await tap('#c-bg button:nth-child(2)', 'customise · background');
  await tap('#c-snd button:nth-child(2)', 'customise · sound pack'); await tap('#c-snd button:nth-child(1)', 'customise · sound pack back');
  await tap('#pv-g [data-v="sequence"]', 'customise · game chip');
  await tap('#c-scale button:nth-child(2)', 'customise · scale');
  // build 33 (B.28): ONE music row and it is the track — no on / off, no Preview button. A tap on a track plays it
  await tap('#c-track button:nth-child(2)', 'customise · track'); await tap('#c-track button:nth-child(1)', 'customise · track back');
  await tap('#c-menumusic button:nth-child(2)', 'customise · menu music off'); await tap('#c-menumusic button:nth-child(1)', 'customise · menu music on');
  // build 33 (B.30): the locked line is under its own group now, not one line under the preview
  await tap('#lk-sq', 'customise · lock line');
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
  await tap('[data-go="s-prog"]'); await tap('#prog-tabs [data-tab="cul"]', 'progress · customise unlocks tab'); await tap('#prog-tabs [data-tab="ach"]', 'progress · achievements tab'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  await tap('#ach-qt_bclean5', 'achievements · jump row');   // AMENDED at build 39 (v23 L.4c): Clean · Sprint · Four pays out a colour, so it is on Customise unlocks await sleep(300);
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
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip-bd', 'chip-pv', 'chip-ach', 'chip-over', 'item', 'pvlock', 'ach', 'unl', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done', 'lock-no', 'lock-go', 'nextup', 'egg', 'ptab', 'chest'];
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
  /* ---- B.21: one menu item, and the old screens are gone from the document ----
     AMENDED at build 33 (v18 B.31): THREE tabs, not two — Customise joined them and `s-custom` went the way `s-unl`
     and `s-ach` went at build 29. The point of the assertion is unchanged and is what it still tests: one menu row
     where there were two (three now), no orphan screen left in the document, and Game unlocks first (2.2). */
  {
    const m = await page.evaluate(() => ({
      // AMENDED at build 40 (v23 L.11a): the Customise row carries "open the Games chest" under its label while locked, so read the label alone
      items: [...document.querySelectorAll('#s-menu .item')].map(b => (b.firstChild ? b.firstChild.textContent : b.textContent).trim()),
      prog: !!document.getElementById('s-prog'),
      old: !!document.getElementById('s-unl') || !!document.getElementById('s-ach'), custom: !!document.getElementById('s-custom'),
      tabs: [...document.querySelectorAll('#prog-tabs .chip')].map(c => c.dataset.tab) }));
    // AMENDED at build 39 (v23 L.4a / L.4b): Customise is a menu row and a screen again, and the middle tab is Customise unlocks
    (m.prog && !m.old && m.custom && m.items.includes('Progress') && !m.items.includes('Unlocks') && !m.items.includes('Achievements') && m.items.includes('Customise') && m.tabs.join() === 'unl,cul,ach')
      ? ok(`B.21 / B.31 one menu item - ${m.items.join(' · ')} - with tabs ${m.tabs.join(' / ')}, Game unlocks first (2.2)`)
      : bad('B.21 / B.31 Unlocks, Customise and Achievements are one item with three tabs', JSON.stringify(m));
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
      // AMENDED at build 37 (v22 §K): with the mode sheet up the pressed tile DEMOTES to the line colour - the mode is the live choice - so read it both ways
      const grid = document.getElementById('grid'), wasDim = grid.classList.contains('dim'), dimCol = getComputedStyle(t.querySelector('.pic')).outlineColor; grid.classList.remove('dim');
      const cs = getComputedStyle(t.querySelector('.pic')); const col0 = cs.outlineColor, w0 = cs.outlineWidth; if (wasDim) grid.classList.add('dim');
      return { keep: t.classList.contains('keep'), col: col0, width: w0, dimCol, wasDim,
        press: getComputedStyle(document.documentElement).getPropertyValue('--press').trim(),
        ok: getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() }; });
    const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    (pr.keep && pr.col === hex2rgb(TH29.PRESS.v) && pr.press === TH29.PRESS.v && pr.col !== hex2rgb(pr.ok) && !/255, 255, 255/.test(pr.col) && pr.wasDim && pr.dimCol === pr.col) /* AMENDED again at build 38 (Aiden): no mode chosen yet, so the tile keeps its amber with the sheet up */
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
        chests: ['games', 'key', 'pro', 'thorns'].filter(n => !document.querySelector(`.chest[data-chest="${n}"]`).hidden).length,   // AMENDED at build 40 (v23 L.10): four chests, by name
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
    // AMENDED at build 34 (#411): a stop per game plus a stop per VISIBLE chest, so the lines between them are one fewer.
    // Hard-coding seven was only ever right for a profile with one chest; the post-chest-1 grid has always drawn nine.
    const stops = gr.order.length + gr.chests;
    (gr.segs.length === stops - 1 && gr.segs.every(s => s.len > 4))
      ? ok(`B.23 ${gr.segs.length} lines drawn for ${stops} stops (${gr.order.length} games + ${gr.chests} chest${gr.chests > 1 ? 's' : ''}), shortest ${Math.min(...gr.segs.map(s => s.len))}px`)
      : bad('B.23 a line per step', JSON.stringify({ segs: gr.segs, stops }));
    const wrong = gr.segs.slice(0, gr.order.length - 1).map((s, i) => s.open === gr.opens[i + 1] ? null : gr.order[i + 1]).filter(Boolean);
    (!wrong.length) ? ok('B.23 a segment is green where the game it leads to is open and grey where it is locked')
      : bad('B.23 the line colour follows the next game', wrong.join(', '));
    // B.24 - locked: the requirement is key 1's own count, and NOTHING about pro or author is anywhere on the grid (A.1)
    const ch = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const P = await import('./progress.js'); const el = () => document.querySelector('.chest');
      // #411: every chest takes the dev escapes, so A.1's subject - someone with no dev flag - has to be seeded for
      // AMENDED at build 40 (v23 L.10): the first chest is the GAMES chest, and locked it says the chain's own count, not key 1's
      const was = S.prefs.allOpen; S.prefs.allOpen = false; S.save();
      R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      const m = P.modeCount(); const out = { cls: el().className, id: el().dataset.chest, need: el().querySelector('.pic').dataset.need, open: m.open, total: m.total, k: K.keyState().total };
      out.shown = ['games', 'key', 'pro', 'thorns'].map(n => !document.querySelector(`.chest[data-chest="${n}"]`).hidden);
      out.needs = ['key', 'pro', 'thorns'].map(n => document.querySelector(`.chest[data-chest="${n}"] .pic`).dataset.need);
      out.text = (document.getElementById('s-pick').innerText || '') + ' ' + (el().querySelector('.pic').dataset.need || '');
      S.prefs.allOpen = was; S.save();
      return out; });
    (/locked/.test(ch.cls) && ch.id === 'games' && ch.need === `unlock every game · ${ch.open} of ${ch.total}`)
      ? ok(`B.24 AMENDED at build 40 (L.10c): the first chest is the Games chest, locked, saying what the chain asks: "${ch.need}"`) : bad('B.24 the locked chest', JSON.stringify(ch));
    (ch.shown.join() === 'true,true,true,true' && ch.needs.every(x => x === 'open the previous chest') && !/\d/.test(ch.needs.join('')))
      ? ok('B.24 / A.1 AMENDED at build 40 (v21 G.1, narrowing A.1; v23 L.10): with no dev flag all four chests are on the map, the Key, Pro and Thorns chests locked with "open the previous chest" and no number about what is inside')
      : bad('A.1 the grid mentions pro or author', JSON.stringify({ shown: ch.shown, text: ch.text.slice(0, 120) }));
  }
  /* B.24: every bar cleared -> the chest is openable, opens once, stores it, and says what it gave.
     AMENDED at build 40 (v23 L.8b / L.10): the chest key 1 opens is the KEY chest, behind the Games chest; a tap opens its key screen and
     the chest opens THERE by itself - there is no "Open the chest?" and no ask box in the page at all - and what it gave is its words */
  {
    const seed = await page.evaluate(async () => { const K = await import('./progress/key.js'); const U = await import('./config/unlocks.js'); const bars = {}, unlock = {};
      for (const c of K.COMBOS) bars[c.key] = Date.now(); for (const x of U.UNLOCKS) unlock[x.key] = Date.now(); return { bars, unlock }; });
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, keySeen: 1, progTab: 'unl', chests: { games: 1 } }, runs: [], ach: {}, unlock: seed.unlock, intro: SEEN_INTRO, seen: {}, bars: seed.bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const before = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { cls: c.className, need: c.querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap') }; });
    // AMENDED at build 41 (v23 L.6 / L.11b): the open is the Key chest's CEREMONY on its key screen, and what it gave spills out on the map after "tap to continue"
    await click('.chest[data-chest="key"]'); await sleep(2300);
    const after = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.key,
      box: document.getElementById('key-cere').hidden ? '' : document.getElementById('key-cere').innerText.replace(/\s+/g, ' ').trim(), toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }));
    await sleep(3000); await click('#key-cere'); await sleep(900);
    after.map = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, words: [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].map(x => x.firstChild.textContent).join(' · ') }));
    (/ready/.test(before.cls) && before.need === 'tap to open' && !before.ask) ? ok('B.24 every bar cleared and the Key chest is openable - and there is no ask box in the page (AMENDED at build 40, L.8b)') : bad('B.24 the openable chest', JSON.stringify(before));
    (after.screen === 's-key' && after.stored === 1 && /Key chest opened/i.test(after.box) && !after.toast && after.map.screen === 's-pick' && /GAUNTLET/.test(after.map.words))
      ? ok(`B.24 a tap opens its key screen and the chest opens there by itself, once and for good, as its ceremony - "${after.box}" - and its tap lands on the map with "${after.map.words}" beside it`) : bad('B.24 opening the chest', JSON.stringify(after));
    (!/\bauthor\b/i.test(after.box + ' ' + after.map.words)) ? ok('B.24 / A.1 an opened Key chest says only what it gave - nothing about Author, which waits for the Pro chest') : bad('A.1 the opened chest', after.box + ' ' + after.map.words);
    // and it stays open across a reload, because it is progress and not a screen state
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400); await click('[data-go="s-pick"]'); await sleep(600);
    (await page.evaluate(() => document.querySelector('.chest[data-chest="key"]').classList.contains('open'))) ? ok('B.24 the chest is still open after a reload') : bad('B.24 the chest is stored');
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
    // #411: allOpen OFF - a first-timer is the subject of A.1, and OPEN EVERYTHING is now an escape from this gate
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, allOpen: false, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const before = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      txt: document.getElementById('s-key').textContent.toLowerCase(), theme: document.querySelector('#key-keys .kkey i')?.textContent,
      locked: document.querySelectorAll('#key-keys .kkey.locked').length, lockedTxt: [...document.querySelectorAll('#key-keys .kkey.locked')].map(x => x.textContent).join(' | ') }));
    (before.n === 3 && before.theme === 'Lantern' && before.locked === 3 && /open the Games chest/i.test(before.lockedTxt) && /open the previous chest/i.test(before.lockedTxt) && !/\d|%/.test(before.lockedTxt))
      ? ok('B.31 / A.1 AMENDED at build 40 (v23 L.10a): before the Games chest all three keys are on the strip and all three are crossed out - key 1 with "open the Games chest", the other two with "open the previous chest" - and no number')
      : bad('B.31 Frost and Thorn are hidden until chest 1', JSON.stringify(before).slice(0, 200));
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const after = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent) }));
    (after.n === 3 && after.themes.join(',') === 'Lantern,Circuit,Thorn') ? ok('B.31 all three arrive with chest 1 - ' + after.themes.join(' · '))
      : bad('B.31 chest 1 reveals the other two', JSON.stringify(after));
    /* #411: OPEN EVERYTHING is an ESCAPE from the A.1 gate, not an exception to it. The rest of the app already let
       allOpen and supporter stand in for a chest (ui/screens/progress.js:110); the key screen read prefs.chest1 alone,
       so it was the one place Testing's switch did nothing and Aiden could not see Circuit or Thorn on his phone.
       A.1's intent is untouched - core/store.js:39 reads both flags as `dev && ...`, so a release build zeroes them. */
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, allOpen: true, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const dev = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const read = () => ({ n: document.querySelectorAll('#key-keys .kkey').length,
        themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent),
        one: document.getElementById('key-keys').classList.contains('one'), locked: document.querySelectorAll('#key-keys .kkey.locked').length,
        pro: K.tierOpen('pro'), author: K.tierOpen('author'), rungs: K.radarRungs().length });
      const out = { open: read(), chest: S.prefs.chest1 };
      // the other half of the same escape, in memory rather than with a second reload
      S.prefs.allOpen = false; S.prefs.supporter = true; S.save();
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.sup = read();
      S.prefs.supporter = false; S.save();
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.neither = read();
      return out; });
    (!dev.chest && dev.open.n === 3 && dev.open.themes.join(',') === 'Lantern,Circuit,Thorn' && !dev.open.one && dev.open.pro && dev.open.author && dev.open.rungs === 3)
      ? ok('#411 OPEN EVERYTHING reveals all three tiers with chest 1 still shut - the key strip, tierOpen and the radar rungs all take the same escape')
      : bad('#411 allOpen opens the key map', JSON.stringify(dev.open));
    (dev.sup.n === 3 && dev.sup.rungs === 3 && dev.sup.pro) ? ok('#411 a supporter takes the same escape, chest or no chest')
      : bad('#411 supporter opens the key map', JSON.stringify(dev.sup));
    (dev.neither.n === 3 && dev.neither.locked === 3 && dev.neither.rungs === 1 && !dev.neither.pro)
      ? ok('#411 / A.1 with neither flag and no chest all three keys are crossed out again, no numbers (AMENDED at build 37, G.2; at build 40, L.10a: key 1 waits for the Games chest) - the escape is an escape, not a hole')
      : bad('#411 the gate still holds with no flag set', JSON.stringify(dev.neither));
    /* #411 follow-up: the chest column takes the same escape. pick.js gated chests 2 and 3 on prefs.chest1 alone, the
       same shape of bug one screen over - so OPEN EVERYTHING revealed the key tiers and still hid the chests. */
    const chests = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      // AMENDED at build 40 (v23 L.10): four chests by name, and the escape reaches them too - OPEN EVERYTHING draws every one open
      const see = () => ['games', 'key', 'pro', 'thorns'].map(n => { const c = document.querySelector(`.chest[data-chest="${n}"]`); return !c.hidden && (c.classList.contains('open') ? 'open' : 'shut'); });
      S.prefs.allOpen = true; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      const open = see();
      S.prefs.allOpen = false; S.save(); R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      return { open, shut: see() }; });
    (chests.open.join() === 'open,open,open,open' && chests.shut.join() === 'shut,shut,shut,shut')
      ? ok('#411 AMENDED at build 40 (G.1, L.10): all four chests are on the map with OPEN EVERYTHING and without it - every one drawn open under the escape, and every one shut without it')
      : bad('#411 the chests follow the key map', JSON.stringify(chests));

    /* #371 workaround: the placeholder fill. AMENDED at build 38 (#426): both columns carry GENERATED placeholders in
       config/key-bars.js now, so on the shipped table the fill has nothing to fill - and A.2 as amended forbids overwriting a
       number that is there, generated or not. It fills EMPTY cells only, is on only while it filled one, and is still
       session-only: nothing written, the file untouched, a reload throws it away. Checked on one cell emptied in memory. */
    const fill = await page.evaluate(async () => { const K = await import('./progress/key.js'); const KB = await import('./config/key-bars.js');
      const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const rows = Object.values(KB.KEY_BARS), snap = rows.map(r => [r.pro, r.author]);
      const same = skip => rows.every((r, i) => r === skip || (r.pro === snap[i][0] && r.author === snap[i][1]));
      const warn = () => document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent;
      const out = { before: { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author'), faked: K.barsFaked() } };
      S.prefs.allOpen = true; S.save();
      out.full = { on: K.fillBars(true), faked: K.barsFaked(), same: same(null) }; K.fillBars(false);
      // empty ONE Pro cell: Pro is a shell again, and the fill fills exactly that cell, in the row's own direction (C.7)
      const r0 = KB.KEY_BARS['quick-tap:two:5'], was = r0.pro; r0.pro = null;
      out.hole = { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author') };
      K.fillBars(true);
      out.on = { faked: K.barsFaked(), pro: r0.pro, shellPro: K.isShell('pro'), others: same(r0), dir: typeof r0.pro === 'number' && r0.pro > r0.bar };
      R.show('s-key'); await wait(300);
      document.querySelector('.kkey[data-kt="1"]').click(); await wait(350);
      out.circuit = { segs: document.querySelectorAll('#key-ring .kroot').length, shellHidden: document.getElementById('key-shell').hidden, warn: warn() };
      document.querySelector('.kkey[data-kt="0"]').click(); await wait(350);
      out.lantern = { warn: warn() };
      K.fillBars(false);
      out.off = { pro: r0.pro, shellPro: K.isShell('pro'), faked: K.barsFaked() };
      r0.pro = was; out.restored = !K.isShell('pro') && same(null);
      out.rawSame = !/\|pro\b/.test(JSON.stringify(JSON.parse(localStorage.getItem('ne')).bars || {}));
      S.prefs.allOpen = false; S.save();
      return out; });
    (!fill.before.shellPro && !fill.before.shellAuthor && !fill.before.faked && !fill.full.on && !fill.full.faked && fill.full.same)
      ? ok('#371 / #426 with both columns full the fill finds nothing to fill - it stays off and changes no number, generated or not')
      : bad('#371 the fill on a full table', JSON.stringify({ before: fill.before, full: fill.full }));
    (fill.hole.shellPro && !fill.hole.shellAuthor && fill.on.faked && fill.on.dir && !fill.on.shellPro && fill.on.others)
      ? ok(`#371 an emptied Pro cell makes Pro a shell again, and the fill fills exactly that cell (${fill.on.pro}, above the bar) and touches nothing else`)
      : bad('#371 the fill fills empty cells only', JSON.stringify({ hole: fill.hole, on: fill.on }));
    (fill.circuit.segs > 0 && fill.circuit.shellHidden && /derived from key 1 for testing/.test(fill.circuit.warn))
      ? ok('#371 / A.2 Circuit draws its ring and says the test fill is on - a derived bar never appears unannounced')
      : bad('#371 the filled ring announces itself', JSON.stringify(fill.circuit));
    (fill.lantern.warn === '') ? ok('#371 key 1 says nothing - none of its bars is generated or filled')
      : bad('#371 the note is only on the tiers carrying generated or filled numbers', JSON.stringify(fill.lantern));
    (fill.off.pro === null && fill.off.shellPro && !fill.off.faked && fill.restored && fill.rawSame)
      ? ok('#371 toggling it off empties that cell again, and nothing was ever written to storage')
      : bad('#371 the fill is session-only and reversible', JSON.stringify({ off: fill.off, restored: fill.restored, rawSame: fill.rawSame }));
    // and a reload is the real proof it was never persisted
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const afterLoad = await page.evaluate(async () => { const K = await import('./progress/key.js'); const KB = await import('./config/key-bars.js'); return { shellPro: K.isShell('pro'), faked: K.barsFaked(), pro: KB.KEY_BARS['quick-tap:two:5'].pro }; });
    (!afterLoad.shellPro && !afterLoad.faked && typeof afterLoad.pro === 'number') ? ok('#371 a reload reads the file again - both columns full, nothing faked')
      : bad('#371 the fill does not survive a reload', JSON.stringify(afterLoad));
    // the screen asks for the tier's own track, and there is no key:1 left anywhere
    (/keyTiers\(\)\[openKey\]\.track/.test(keyjs30) && !/key:1/.test(keyjs30)) ? ok('B.31 the key screen asks for the tier\'s own loop by name, never by number')
      : bad('B.31 the tier loop is asked for by name');
  }
  /* ---- B.32: music in Customise. A row per game and a row for the menu loop, locked behind chest 2 (A.3) with a
     padlock and NOTHING about what opens it (A.1), open under dev unlock-all. */
  {
    // AMENDED at build 40 (v23 L.11a): Customise waits for the Games chest, so the profile has that one open and nothing else
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chest1: 0, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    // AMENDED at build 33 (v18 B.28): the row is ONE button now — the track — because the Preview button beside it went
    const locked = await page.evaluate(() => { const b = [...document.querySelectorAll('#c-track button')];
      return { n: b.length, first: b[0]?.textContent, lock: b[0]?.classList.contains('locked'), plain: b[0]?.classList.contains('plain'),
        label: document.getElementById('c-track').parentElement.querySelector('.clabel')?.textContent,
        txt: document.getElementById('c-track').parentElement.textContent.toLowerCase(), menu: document.querySelectorAll('#c-menumusic button').length }; });
    (locked.n === 1 && locked.lock && locked.plain && locked.label === 'Music' && locked.menu === 2 && !/pro|author|chest|tier/.test(locked.txt))
      ? ok(`B.28 / A.1 the music row is one row, the track it plays ("${locked.first}") behind a padlock - and says nothing about what opens it`)
      : bad('B.28 the locked music row', JSON.stringify(locked));
    // dev unlock-all opens it, and picking one is stored and played
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    await page.evaluate(() => document.querySelectorAll('#c-track button')[1].click()); await sleep(500);
    const open30 = await page.evaluate(() => ({ n: document.querySelectorAll('#c-track button').length,
      stored: JSON.parse(localStorage.getItem('ne')).prefs.track, sel: document.querySelector('#c-track button.sel')?.textContent }));
    const g0 = open30.stored && Object.keys(open30.stored)[0];
    // AMENDED at build 33 (B.28): three options and nothing else on the row
    (open30.n === 3 && g0 && AU30.TRACK_OPTS[g0].includes(open30.stored[g0]))
      ? ok(`B.28 unlock-all opens the row: the three options, and "${open30.sel}" is stored as ${g0} → ${open30.stored[g0]}`)
      : bad('B.28 choosing a track', JSON.stringify(open30));
    // the choice is a preference, not the default: TRACK_PICK is untouched and Fresh game keeps it
    const kept = await page.evaluate(async () => { const S = await import('./core/store.js'); S.reset();
      return { track: JSON.parse(localStorage.getItem('ne')).prefs.track, chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.pro }; });
    // AMENDED at build 40 (v23 L.10): "chest 2" is the Pro chest by name
    (kept.track && Object.keys(kept.track).length && kept.chest2 === 0) ? ok('B.32 the chosen track survives Fresh game (a preference) and the Pro chest does not (progress)')
      : bad('B.32 what Fresh game clears', JSON.stringify(kept));
  }
  /* ---- B.33: the key-unlock animations at 1.5x, and the interlude waiting for them ---- */
  {
    const grow = /animation:krootgrow ([\d.]+)s/.exec(css30), halo = /animation:khaloglow ([\d.]+)s/.exec(css30);
    // AMENDED at build 32 (v18 B.21): the wait is "3900 + arrive" — the arrival's 2600 when this is the screen's first showing
    // AMENDED at build 41 (v23 L.6): the hand-back is handBack(), and a ceremony inside the interlude owns it — the fallback wait is the same number
    const wait = /handBack\(\); \}, (\d+) \+ arrive\)/.exec(keyjs30);
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
    // AMENDED at build 38 (#426): key-1 bars only - with Pro now a real tier, boot credits this profile's 14-hit run against Pro's 14 too
    (mig.runs.join(',') === 'reaction:flash,quick-tap:two' && mig.bars.filter(k => !k.includes('|')).join(',') === 'quick-tap:two:5,reaction:nogo:5' && mig.ach.includes('rx_clean'))
      ? ok(`C.5 / C.6 a v2 record retires exactly the two Go / No-go runs and the Streak bar's cleared flag — the Set bar, the Flash run, the Quick Tap run and Disciplined stay (${mig.toast || 'toast pending'})`)
      : bad('the Go / No-go migration', JSON.stringify(mig));
  }
  /* ---- B.27: three tiers per row, the shell derived from the column, the catalogue's three inputs ---- */
  {
    const rows = Object.values(KB32.KEY_BARS);
    // AMENDED at build 38 (#426): both columns are FULL - every Pro and Author number a generated placeholder whose marker still holds
    (rows.every(r => typeof r.pro === 'number' && typeof r.author === 'number' && r.placeholder && r.placeholder.pro && r.placeholder.pro.v === r.pro && r.placeholder.author && r.placeholder.author.v === r.author) && KY32.KEYS.every(k => !('shell' in k)))
      ? ok(`B.27 / #426 every one of the ${rows.length} rows carries pro and author, each a GENERATED placeholder whose marker still holds (A.2 as amended), and config/keys.js carries no shell flag`)
      : bad('B.27 the data shape', JSON.stringify(rows.filter(r => !(typeof r.pro === 'number' && typeof r.author === 'number' && r.placeholder)).map(r => r.id)));
    const sh = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const KB = await import('./config/key-bars.js');
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.store.bars = {}; S.save();   // AMENDED at build 40 (L.10): chest 1 is the Key chest, behind the Games chest
      const c = K.COMBOS.find(x => x.g === 'quick-tap' && x.s === 5);
      const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, misses: 0, hits: c.bar.bar + 50, v: 4 };
      // the shell is still DERIVED: empty one Pro and one Author cell in memory and both tiers are shells again
      const r1 = KB.KEY_BARS['dots:blind:5'], was = [r1.pro, r1.author]; r1.pro = null; r1.author = null;
      const adv = K.checkKey(run, false);
      const out = { shellClear: K.isShell('clear'), shellPro: K.isShell('pro'), shellAuthor: K.isShell('author'), fullClear: K.tierFull('clear'), barPro: K.barOf(K.COMBOS.find(x => x.key === 'dots:blind:5'), 'pro'), skey: K.skey('a:b:5', 'pro'),
        tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv && adv.tier, bars: Object.keys(S.store.bars), pct: K.keyPct('pro') };
      // …and with the columns full again the same run is a real clear on every open tier
      r1.pro = was[0]; r1.author = was[1]; S.store.bars = {};
      const adv2 = K.checkKey(run, false);
      out.full = { tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv2 && adv2.tier, bars: Object.keys(S.store.bars).sort(), author: K.tierOpen('author'), pct: K.keyPct('pro') };
      S.store.bars = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    (!sh.shellClear && sh.shellPro && sh.shellAuthor && sh.fullClear && sh.barPro === null && sh.skey === 'a:b:5|pro' && sh.tiers.join(',') === 'clear:live,pro:shell,author:shell')
      ? ok('B.27 the shell is still DERIVED: empty one Pro and one Author cell and key 1 stays live while Pro and Author are shells, the emptied bar reading null')
      : bad('B.27 isShell / tierFull / barOf', JSON.stringify(sh));
    (sh.adv === 'clear' && sh.bars.join(',') === 'quick-tap:two:5' && sh.pct.pct === 0 && sh.pct.total === 0)
      ? ok('B.27 a run far past every bar clears key 1 only while they are shells — a shell tier banks nothing and its percentage is 0 of 0')
      : bad('B.27 a shell tier clears nothing', JSON.stringify(sh));
    (sh.full.tiers.join(',') === 'clear:live,pro:live,author:live' && sh.full.adv === 'clear' && sh.full.pct.total > 0
      && sh.full.bars.join(',') === (sh.full.author ? 'quick-tap:two:5,quick-tap:two:5|author,quick-tap:two:5|pro' : 'quick-tap:two:5,quick-tap:two:5|pro'))
      ? ok(`#426 with the columns full the same run is a real clear on every open tier (${sh.full.bars.join(', ')}), the interlude still draws key 1's, and Pro counts ${sh.full.pct.done} of ${sh.full.pct.total}`)
      : bad('#426 a full column is a real tier', JSON.stringify(sh.full));
    (/pro: b \? KY\.barOf\(c, 'pro'\) : null, author: b \? KY\.barOf\(c, 'author'\) : null/.test(cat32) && /id="' \+ PFX\[tier\] \+ r\.id/.test(tpl32) && /inp\('clear'\) \+ inp\('pro'\) \+ inp\('author'\)/.test(tpl32) && /bars: \{ clear: CUR\.clear, pro: CUR\.pro, author: CUR\.author \}/.test(tpl32))
      ? ok('B.27 the review catalogue emits all three tiers a row and the page saves {bars:{clear,pro,author}} to bars/current')
      : bad('B.27 the catalogue\'s three inputs');
  }
  /* ---- B.15 / B.16 / B.17: "67% complete", the step into Pro, the re-based number ----
     RETIRED at build 40 (v23 L.8a / L.8b): the front of the app reads THE METER, 0-400, and never re-bases; "Open the chest?" and "Would
     you like to progress to Pro?" are gone with the double confirmation. Reversed both ways - nothing of the step is left, the menu reads
     the meter - and B.19's column is four chests now ---- */
  {
    const r40 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), rd40 = (...p) => fs.readFileSync(path.join(r40, ...p), 'utf8'), nocom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const gone = { front: /frontPct|FRONT_BASE/.test(nocom(rd40('progress', 'key.js'))), ask: /askPro|askBox|ask-yes|askwrap/.test(nocom(rd40('ui', 'screens', 'pick.js')) + rd40('index.html')),
      copy: /proAsk|proWarn|openAsk|openYes/.test(nocom(rd40('config', 'copy.js'))), pref: /pro:\[0,1,2\]/.test(rd40('core', 'store.js')) };
    (!gone.front && !gone.ask && !gone.copy && !gone.pref)
      ? ok('B.15 / B.16 / B.17 RETIRED at build 40 (L.8b): no frontPct, no 30/70 re-base, no "Open the chest?", no "Would you like to progress to Pro?", no prefs.pro') : bad('B.16 / B.17 the step into Pro is gone', JSON.stringify(gone));
    const seed = await page.evaluate(async () => { const K = await import('./progress/key.js'); const U = await import('./config/unlocks.js'); const bars = {}, unlock = {};
      for (const c of K.COMBOS) bars[c.key] = Date.now(); for (const x of U.UNLOCKS) unlock[x.key] = Date.now(); return { bars, unlock }; });
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, keySeen: 1, chests: { games: 1, key: 1 } }, runs: [], ach: {}, unlock: seed.unlock, intro: SEEN_INTRO, seen: {}, bars: seed.bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(1400);
    const line = await page.evaluate(() => document.getElementById('menu-key').textContent.trim());
    (line === '200% complete') ? ok(`L.8a (retiring B.17) the front of the app reads the meter and never re-bases: every mode, key 1 whole and the Key chest open reads "${line}"`) : bad('L.8a the front number', line);
    // B.19: the column — AMENDED at build 40 (L.10c): four chests, one column, Games at the top of it
    await click('[data-go="s-pick"]'); await sleep(600);
    const col = await page.evaluate(() => { const ids = ['games', 'key', 'pro', 'thorns']; const c = n => document.querySelector(`.chest[data-chest="${n}"]`); const cell = n => ({ r: +c(n).style.gridRow, col: +c(n).style.gridColumn, need: c(n).querySelector('.pic').dataset.need, cls: c(n).className, name: c(n).querySelector('.name').textContent.trim() });
      return Object.assign(Object.fromEntries(ids.map(n => [n, cell(n)])), { scroll: getComputedStyle(document.getElementById('s-pick')).overflowY }); });
    (col.key.col === col.games.col && col.pro.col === col.games.col && col.thorns.col === col.games.col && col.key.r === col.games.r + 1 && col.pro.r === col.games.r + 2 && col.thorns.r === col.games.r + 3
      && /open/.test(col.games.cls) && /open/.test(col.key.cls) && /locked/.test(col.pro.cls) && /^\d+% · opens at 300%$/.test(col.pro.need) && col.thorns.need === 'open the previous chest' && col.pro.name === 'Pro chest' && col.thorns.name === 'Thorns chest' && col.scroll === 'auto')
      ? ok(`B.19 AMENDED at build 40 (L.10c): four chests in a column (rows ${col.games.r}-${col.thorns.r}); Games and Key open, the Pro chest reading the meter "${col.pro.need}", Thorns pointing at the chest before it; the screen scrolls`)
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
    // #411: allOpen OFF - same reason as the key-strip check above; the radar takes the same escape now
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, allOpen: false, chest1: 0 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 6, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    const r1 = await page.evaluate(() => ({ web: document.querySelectorAll('#radar polygon.web').length, rungs: document.querySelectorAll('#radar polygon.rung').length, flame: document.querySelectorAll('#radar .flame').length, txt: document.getElementById('s-board').innerText.toLowerCase(), qt: (document.querySelector('#radar text') || {}).textContent }));
    (r1.web === 4 && r1.rungs === 0 && r1.flame === 0 && !/\bpro\b|author/.test(r1.txt) && /Quick Tap 50/.test(r1.qt || ''))
      ? ok(`B.24 / A.1 before chest 1 the radar has one rung — key 1 at the ring — and nothing beyond it; 6 hits against a bar of 12 reads "${r1.qt}"`)
      : bad('B.24 the single-rung radar', JSON.stringify(r1));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [{ t: NOW, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-board"]'); await sleep(500);
    /* AMENDED at build 38 (#426): the columns are full of placeholders, so the solid rungs and the flame are what the FILE draws
       now, and the dashed shells are the case that has to be made - by emptying both columns in memory */
    const r2 = await page.evaluate(async () => { const read = () => ({ rungs: [...document.querySelectorAll('#radar polygon.rung')].map(p => p.dataset.rung + (p.classList.contains('shell') ? ':dashed' : '')), flame: document.querySelectorAll('#radar .flame').length, qt: (document.querySelector('#radar text') || {}).textContent });
      const R = await import('./ui/router.js'); const KB = await import('./config/key-bars.js');
      const out = { full: read() }, keep = {};
      for (const k in KB.KEY_BARS) { keep[k] = [KB.KEY_BARS[k].pro, KB.KEY_BARS[k].author]; KB.KEY_BARS[k].pro = null; KB.KEY_BARS[k].author = null; }
      R.show('s-menu'); await new Promise(r => setTimeout(r, 200)); R.show('s-board'); await new Promise(r => setTimeout(r, 400));
      out.shell = read(); const d = document.querySelector('#radar polygon.rung.shell'); out.shell.dash = d ? getComputedStyle(d).strokeDasharray : 'none';
      for (const k in keep) { KB.KEY_BARS[k].pro = keep[k][0]; KB.KEY_BARS[k].author = keep[k][1]; }
      return out; });
    (r2.shell.rungs.join(',') === 'clear,pro:dashed,author:dashed' && r2.shell.flame === 0 && /Quick Tap 33/.test(r2.shell.qt || '') && r2.shell.dash !== 'none')
      ? ok(`B.24 / A.2 after chest 1 three rungs — with both columns emptied, Pro and Author are DASHED at no value; 60 hits against a bar of 12 climbs no further than rung 1 ("${r2.shell.qt}") and no flame`)
      : bad('B.24 the three rungs with shells', JSON.stringify(r2.shell));
    (r2.full.rungs.join(',') === 'clear,pro,author' && r2.full.flame === 1 && /Quick Tap 1\d\d/.test(r2.full.qt || ''))
      ? ok(`B.24 / #426 on the placeholder columns the rungs are solid and a score past the Author bar wears the flame ("${r2.full.qt}")`)
      : bad('B.24 the flame', JSON.stringify(r2.full));
  }
  /* ---- B.25: the three achievement sets tied to the keys ---- */
  {
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ka = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const rows = K.keyAch(); const out = { n: rows.length, tiers: [...new Set(rows.map(r => r.tier))], perTier: rows.filter(r => r.tier === 'key1').length, live: rows.filter(r => r.live).length };
      // #411: the dev escapes go off with the chest - the previous block left allOpen on, and A.1's subject has neither
      // AMENDED at build 40 (v23 L.10a): key 1's set waits for the Games chest — `none` is no chest open, `before` the Games chest, `after` the Key chest
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.progTab = 'ach'; S.store.bars = {}; S.store.ach = {}; S.save();
      R.show('s-prog', { tab: 'ach' }); await new Promise(r => setTimeout(r, 400));
      const heads = () => [...document.querySelectorAll('#achlist h4')].map(h => h.className);
      out.none = heads();
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save(); R.show('s-menu'); await new Promise(r => setTimeout(r, 150)); R.show('s-prog', { tab: 'ach' }); await new Promise(r => setTimeout(r, 400));
      out.before = heads();
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.save(); R.show('s-menu'); await new Promise(r => setTimeout(r, 150)); R.show('s-prog', { tab: 'ach' }); await new Promise(r => setTimeout(r, 400));
      out.after = heads();
      // earn: every Quick Tap bar cleared, then the check the run makes
      for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save();
      const fresh = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.fresh = fresh.map(a => a.id); out.stored = Object.keys(S.store.ach);
      const none = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.again = none.length;
      S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    (ka.n === 24 && ka.tiers.join(',') === 'key1,key2,key3' && ka.perTier === GAMES.length + 1 && ka.live === 0)
      ? ok(`B.25 24 key achievements — one per game per key plus one per key for the whole key — generated, none of them live`)
      : bad('B.25 the key sets', JSON.stringify(ka));
    (!ka.none.some(c => /^key/.test(c)) && ka.before.includes('key1') && !ka.before.includes('key2') && !ka.before.includes('key3') && ka.after.includes('key2') && !ka.after.includes('key3')) /* AMENDED at build 38: the Author set waits for the Pro chest. AMENDED at build 40: The key's set waits for the Games chest */
      ? ok('B.25 / A.1 the Achievements tab shows no key set before the Games chest, The key after it and the Pro set after the Key chest - the Author set waits for the Pro chest (builds 38 and 40)')
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
    // AMENDED at build 40 (v23 L.10): a chest-opening button per chest, four, named by chest
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] #dev-anim [data-act]')].map(b => b.dataset.act + (b.dataset.chest ? ':' + b.dataset.chest : '')));
    (btns.join(',') === 'dev-keyin,dev-seg,dev-whole,dev-chest:games,dev-chest:key,dev-chest:pro,dev-chest:thorns') ? ok('B.26 seven Testing buttons, one per animation and a chest opening per chest, under [data-dev] (S5)') : bad('B.26 the buttons', btns.join(','));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1, keyWhole: { clear: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-testing"]'); await sleep(300); await click('[data-act="dev-whole"]'); await sleep(700);
    const dw = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cls: document.getElementById('s-key').classList.contains('kwhole') }));
    await sleep(3400); await click('#s-key .back'); await sleep(400);
    const dwBack = await onScreen();
    // AMENDED at build 41 (v23 L.6): "replay key chest opening" plays the Key chest's CEREMONY on the key screen with nothing stored, and its tap lands on the map's spill, replayed the same way
    await click('[data-act="dev-chest"][data-chest="key"]'); await sleep(1200);
    const dc = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest }; });
    await sleep(3800); await click('#key-cere'); await sleep(900);
    const dcMap = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'), w = document.querySelector('.chestwords[data-for="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill') && w.classList.contains('spill') }; });
    await sleep(3600);
    const dcAfter = await page.evaluate(async () => { const K = await import('./progress/key.js'); const c = document.querySelector('.chest[data-chest="key"]');
      // AMENDED at build 34 (#411): the resting state is whatever the gate says, not "hidden" - and the demo must clear its own class
      // AMENDED at build 40 (L.10): every chest is on the map, so the resting state is the chest's own - open under OPEN EVERYTHING
      return { rest: !c.hidden && c.classList.contains(K.chestState('key')), spill: c.classList.contains('spill'), chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.key, whole: JSON.parse(localStorage.getItem('ne')).prefs.keyWhole }; });
    (dw.screen === 's-key' && dw.cls && dwBack === 's-testing' && dc.screen === 's-key' && dc.shown && dc.chest === 'key' && dcMap.screen === 's-pick' && dcMap.spill && dcAfter.rest && !dcAfter.spill && !dcAfter.chest2 && dcAfter.whole && dcAfter.whole.clear === 1)
      ? ok('B.26 "key complete" plays the moment and Back returns to Testing; "replay key chest opening" plays its ceremony, its tap lands on the map\'s spill, and the chest is put back exactly as its state left it — nothing stored (AMENDED at build 41, L.6)')
      : bad('B.26 the buttons play and store nothing', JSON.stringify({ dw, dwBack, dc, dcMap, dcAfter }));
    await click('[data-act="dev-keyin"]').catch(() => {}); await sleep(300);
    const arrive = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    arrive ? ok('B.26 "key arrival" plays the arrival again') : bad('B.26 the arrival button');
    await sleep(2500);
  }
}

/* ---- 14. build 33 (v18 §B.28–§B.32): the surface ---- */
console.log('\nbuild 33 - v18 sections B.28 to B.32');
{
  const root33 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read33 = (...p) => fs.readFileSync(path.join(root33, ...p), 'utf8');
  const html33 = read33('index.html'), css33 = read33('styles', 'app.css'), audio33 = read33('audio.js');
  const prog33 = read33('ui', 'screens', 'progress.js') + read33('ui', 'screens', 'customise.js'), store33 = read33('core', 'store.js');   // build 39: Customise's code is its own file again

  /* ---- B.31: ONE screen, three tabs, one file. A4 forbids a screen importing a screen, so a tab host that called
     into customise.js would be the thing it forbids — this is the merge, and the file it replaced is gone. ---- */
  {
    const gone = fs.existsSync(path.join(root33, 'ui', 'screens', 'customise.js'));   // AMENDED at build 39 (v23 L.4a): the file is back
    const idx = read33('ui', 'screens', 'index.js');
    const markup = { custom: /id="s-custom"/.test(html33), row: /data-go="s-custom"/.test(html33), cus: /id="p-cus"/.test(html33) };
    (gone && /customise\.js"/.test(idx) && markup.custom && markup.row && !markup.cus)
      ? ok('B.31 AMENDED (v23 L.4a): customise.js is back and imported, s-custom and its menu row exist, and no #p-cus is left on s-prog')
      : bad('B.31 the merge', JSON.stringify({ gone, markup }));
    // the three tabs, in Aiden's order, and Keys still its own menu item
    const tabs = [...html33.matchAll(/data-act="ptab" class="chip" data-tab="(\w+)">([^<]+)</g)].map(m => [m[1], m[2]]);
    const keyRow = /data-go="s-key"/.test(html33);
    (tabs.length === 3 && tabs[0][1] === 'Game unlocks' && tabs[1][1] === 'Customise unlocks' && tabs[1][0] === 'cul' && tabs[2][1] === 'Achievements' && keyRow)   // AMENDED at build 39 (v23 L.4b)
      ? ok(`B.31 (L6) three tabs — ${tabs.map(t => t[1]).join(' · ')} — and Keys stays its own menu item`)
      : bad('B.31 the tabs', JSON.stringify({ tabs, keyRow }));
    // the third value is shape-checked in the store the day it is added, which is the rule build 28 exists to not repeat
    /progTab:p\.progTab==='cus'\?'cul':\['cul','ach'\]\.includes\(p\.progTab\)/.test(store33.replace(/\s/g, ''))   // AMENDED at build 39: unl / cul / ach, and the old cus lands on cul
      ? ok('B.31 prefs.progTab takes all three tabs (cleanPrefs)') : bad('B.31 progTab is still two-valued');

    // each tab renders, and the one that is up is the only one rendered
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const walk = {};
    for (const t of ['unl', 'cul', 'ach']) { await click(`#prog-tabs [data-tab="${t}"]`); await sleep(600);
      walk[t] = await page.evaluate(t => ({ shown: [...document.querySelectorAll('#s-prog .ptab')].filter(p => !p.hidden).map(p => p.id),
        rows: document.querySelectorAll(t === 'unl' ? '#unl-list .urow' : t === 'cul' ? '#cul-list .a' : '#achlist .a').length,
        stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }), t); }
    (walk.unl.shown.join() === 'p-unl' && walk.cul.shown.join() === 'p-cul' && walk.ach.shown.join() === 'p-ach'
      && walk.unl.rows > 0 && walk.cul.rows > 0 && walk.ach.rows > 0 && walk.ach.stored === 'ach')
      ? ok(`B.31 one tab at a time — ${walk.unl.rows} unlock rows, ${walk.cul.rows} customise unlocks, ${walk.ach.rows} achievements — and the last one open is remembered`)
      : bad('B.31 the tabs render', JSON.stringify(walk));
    /* an earned achievement still opens what it paid for — the same screen now, so it is a tab change and not a
       navigation. `first` ("Showed up") pays out the second target colour, which is why it is the row this earns. */
    // AMENDED at build 40 (v23 L.11a): an earned row opens Customise only once the Games chest is open, so the profile has it
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chests: { games: 1 } }, runs: [], ach: { first: Date.now() }, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    // AMENDED at build 39 (v23 L.4c / L.4d): Showed up pays out a colour, so it is on Customise unlocks, and it opens the Customise SCREEN
    await click('[data-go="s-prog"]'); await sleep(300); await click('#prog-tabs [data-tab="cul"]'); await sleep(500);
    const jumped = await page.evaluate(() => { const b = document.getElementById('cul-first'); if (!b) return null; const done = b.classList.contains('done'); b.click(); return done; });
    await sleep(600);
    const after = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, tab: 'screen',
      flashed: !!document.querySelector('#c-sq button.pvw') }));
    (jumped && after.screen === 's-custom' && after.flashed)
      ? ok('B.31 AMENDED (v23 L.4d): an earned achievement opens the Customise SCREEN and rings the swatch it paid for')
      : bad('B.31 the achievement payout', JSON.stringify({ jumped, after }));
  }

  /* ---- B.28: one music row, called Music, and it is the track. The locked half is asserted in the build-30 block
     above (amended there); this is the open half and the absence of everything the row used to carry. ---- */
  {
    const dead = { music: /id="c-music"/.test(html33), pv: /music-pv|track-pv/.test(html33 + prog33), label: /c-track-label|c-music-label/.test(html33 + prog33) };
    (!dead.music && !dead.pv && !dead.label)
      ? ok('B.28 the on / off row, both Preview buttons and the per-game row labels are gone — one row, called Music')
      : bad('B.28 what the row used to carry', JSON.stringify(dead));
    // unlock-all so the row is the open three; the locked shape is the build-30 block above
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    const row = await page.evaluate(() => { const grp = document.getElementById('c-track').parentElement;
      const b = [...grp.querySelectorAll('button')];
      return { label: grp.querySelector('.clabel').textContent, n: b.length, named: b.map(x => x.textContent), sel: b.filter(x => x.classList.contains('sel')).length }; });
    (row.label === 'Music' && row.n === 3 && row.sel === 1 && row.named.every(n => n && !/preview|^on$|^off$/i.test(n)))
      ? ok(`B.28 the Music row is the three tracks by name (${row.named.join(' · ')}), one of them this game's`)
      : bad('B.28 the open music row', JSON.stringify(row));
  }

  /* ---- B.29: previewing a track silences the menu loop. loop() schedules a BAR at a time, so clearing the interval
     leaves the outgoing track ringing — the fix is that the bed's gain node is retired, and that is what is asserted:
     structurally in audio.js (a preview cannot start without it) and live, that a preview leaves one track playing. */
  {
    const cuts = { has: /function cut\(\)/.test(audio33), onRun: /function run\(t,id,sh\)\{ if\(tr\) cut\(\);/.test(audio33), onStop: /stop\(\)\{ clearInterval\(timer\); timer=0; cut\(\);/.test(audio33) };
    (cuts.has && cuts.onRun && cuts.onStop)
      ? ok('B.29 a track that replaces another cuts it first, and stopping cuts what is already scheduled')
      : bad('B.29 the cut', JSON.stringify(cuts));
    /* live: the loop, a preview over it, the hand back. Nobody in a Claude Code session can HEAR whether the overlap
       is gone (logged in UNVERIFIED.md) — what is testable is that the retire-and-rebuild path runs clean through a
       menu loop, a preview over it and the loop resuming, which is the sequence that used to leave two beds ringing. */
    const live = await page.evaluate(async () => { const M = await import('./audio.js');
      try { M.Music.menu('menu'); await new Promise(r => setTimeout(r, 250));
        M.Music.preview('quick-tap', 400); await new Promise(r => setTimeout(r, 700));
        M.Music.menu('menu'); await new Promise(r => setTimeout(r, 200)); M.Music.stop(); return { ok: 1 }; }
      catch (e) { return { err: String(e) }; } });
    live.ok ? ok('B.29 menu loop → preview → loop again runs clean: each bed is retired as the next one starts') : bad('B.29 the preview path', live.err);
  }

  /* ---- B.30: the locked line goes UNDER its row, never over it, and the toast is off this path ---- */
  {
    // a profile with nothing earned: the target-colour row has locked swatches
    // AMENDED at build 40 (v23 L.11a): Customise waits for the Games chest — this profile has it open and has earned nothing
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(600);
    const lock = await page.evaluate(() => { const b = document.querySelector('#c-sq button.locked'); if (!b) return { none: 1 };
      b.click(); return null; });
    await sleep(400);
    const shown = lock && lock.none ? null : await page.evaluate(() => { const ln = document.getElementById('lk-sq'), grp = document.getElementById('c-sq');
      const r = ln.getBoundingClientRect(), gr = grp.getBoundingClientRect(), t = document.getElementById('toast');
      return { text: ln.textContent.trim(), sameGroup: ln.parentElement === grp.parentElement, under: r.top >= gr.bottom - 1,
        ach: ln.dataset.ach, toast: t.classList.contains('on'),
        others: [...document.querySelectorAll('.lockline')].filter(x => x.textContent.trim()).length }; });
    (shown && shown.text && shown.sameGroup && shown.under && shown.ach && !shown.toast && shown.others === 1)
      ? ok(`B.30 a locked swatch says what opens it under its own row ("${shown.text.slice(0, 40)}…"), one line on the screen, no toast over anything`)
      : bad('B.30 the locked line', JSON.stringify(shown));
    // and the line is the way in: it opens the achievement that pays for it, on the tab beside it
    if (shown && shown.ach) { await click('#lk-sq'); await sleep(500);
      const to = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, ach: !document.getElementById('p-cul').hidden, row: !!document.querySelector('#cul-list .a.flash') }));
      (to.screen === 's-prog' && to.ach && to.row) ? ok('B.30 the locked line opens the achievement that earns it - on Customise unlocks, flashed (AMENDED at build 39, v23 L.4c)') : bad('B.30 where the line leads', JSON.stringify(to)); }
  }

  /* ---- B.32: the fonts are ours. No request leaves the origin for one, the faces are declared with swap, and the
     title's two are preloaded. `reqs` is every URL the page has asked for since the gate started. ---- */
  {
    const off = reqs.filter(FONT_HOST);
    !off.length ? ok(`B.32 no font request left the origin in ${reqs.length} requests — Google Fonts is gone`) : bad('B.32 a font request left the origin', [...new Set(off)].join(', '));
    const faces = [...css33.matchAll(/@font-face\{font-family:"([^"]+)";font-style:normal;font-weight:(\d+);font-display:swap;src:url\(\.\.\/fonts\/([\w.-]+)\)/g)];
    const files = [...new Set(faces.map(f => f[3]))];
    const onDisk = files.filter(f => fs.existsSync(path.join(root33, 'fonts', f)));
    const bytes = onDisk.reduce((a, f) => a + fs.statSync(path.join(root33, 'fonts', f)).size, 0);
    (faces.length === 5 && onDisk.length === files.length && !/fonts\.googleapis\.com/.test(html33))
      ? ok(`B.32 five faces from ${files.length} self-hosted files (${(bytes / 1024).toFixed(1)}KB), every one font-display:swap, and the <link> to Google is gone`)
      : bad('B.32 the @font-face block', JSON.stringify({ faces: faces.length, files, onDisk: onDisk.length }));
    const pre = [...html33.matchAll(/<link rel="preload" href="fonts\/([\w.-]+)" as="font" type="font\/woff2" crossorigin>/g)].map(m => m[1]);
    (pre.length === 2 && pre.some(f => /syncopate/.test(f)) && pre.some(f => /archivo/.test(f)) && pre.every(f => files.includes(f)))
      ? ok(`B.32 the title's two are preloaded with crossorigin (${pre.join(', ')})`) : bad('B.32 the preloads', JSON.stringify(pre));
    // and they actually loaded: document.fonts knows the three families by the time the app is up
    const loaded = await page.evaluate(async () => { await document.fonts.ready;
      return [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status); });
    const fam = new Set(loaded.map(l => l.split(' ')[0].replace(/"/g, '')));
    (fam.has('Syncopate') && fam.has('Archivo') && fam.has('JetBrains')) || loaded.length >= 5
      ? ok(`B.32 the page declares ${loaded.length} faces of its own and document.fonts resolved`) : bad('B.32 the faces loaded', loaded.join(' | '));
  }

  /* ---- the beta paragraph, item 1: Send feedback on About. A mailto with the build, the device and the last run
     filled in — no form, no endpoint, no third party, and nothing leaves without the tester's own send button. ---- */
  {
    const B33 = await import(pathToFileURL(path.join(root33, 'config', 'build.js')).href);
    await click('.back'); await sleep(300); await click('[data-go="s-about"]'); await sleep(500);
    const fb = await page.evaluate(() => { const a = document.getElementById('feedback'); if (!a) return null;
      return { tag: a.tagName, text: a.textContent, href: a.getAttribute('href'), act: a.dataset.act,
        blue: getComputedStyle(a).textDecorationLine }; });
    const body = fb && decodeURIComponent((/&body=([^&]*)/.exec(fb.href) || [, ''])[1]);
    (fb && fb.tag === 'A' && /^mailto:info@somethingstrange\.com\.au\?/.test(fb.href) && fb.act === 'none'
      && new RegExp(`v0\\.${B33.BUILD}`).test(fb.href) && /Mozilla|Chrome|AppleWebKit/.test(body) && /Last run:/.test(body) && fb.blue === 'none')
      ? ok(`beta 1 — Send feedback is a mailto to the Something Strange mailbox carrying v0.${B33.BUILD}, the device and the last run`)
      : bad('beta 1 the feedback link', JSON.stringify({ ...fb, href: (fb && fb.href || '').slice(0, 90) }));
    /* beta 2 — the tester's name on a run. REPORT WHAT YOU FOUND EVEN IF NOTHING IS WRONG: it was already built.
       `run/run.js` stamps `n: prefs.name` on every record, the result screen's rank line names the player and the
       share text leads with it. The field is on SCORES (`#pname`), not Customise as the handover said. Asserted here
       so a later build cannot quietly drop it. */
    await click('.back'); await sleep(300);
    const named = await page.evaluate(async () => { const S = await import('./core/store.js');
      S.prefs.name = 'AIDEN'; S.save();
      const runjs = 1; return { field: !!document.getElementById('pname'), stored: JSON.parse(localStorage.getItem('ne')).prefs.name, runjs }; });
    const runSrc = read33('run', 'run.js');
    (named.field && named.stored === 'AIDEN' && /n:prefs\.name\|\|''/.test(runSrc.replace(/\s/g, '')))
      ? ok('beta 2 — already built: every run record carries the profile name (run/run.js), and the field is on Scores, not Customise')
      : bad('beta 2 the name on a run', JSON.stringify(named));
  }
}

/* ---- 15. build 35 (batch 15: FEEDBACK-v21 §F.1–§F.5 and §G.7; FEEDBACK-v20 §D.1–§D.3, §D.8–§D.10; #415; the Verdict Desk) ---- */
console.log('\nbuild 35 - batch 15, bugs and the runs');
{
  const root35 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read35 = (...p) => fs.readFileSync(path.join(root35, ...p), 'utf8');
  const imp35 = (...p) => import(pathToFileURL(path.join(root35, ...p)).href);
  const html35 = read35('index.html'), css35 = read35('styles', 'app.css'), audio35 = read35('audio.js'), hud35 = read35('games', '_shared', 'hud.js');
  const vs35 = read35('games', '_shared', 'versus.js'), rx35 = read35('games', 'reaction', 'index.js'), sp35 = read35('games', 'spot', 'index.js');
  const pick35 = read35('ui', 'screens', 'pick.js'), prog35 = read35('ui', 'screens', 'progress.js') + read35('ui', 'screens', 'customise.js'), store35 = read35('core', 'store.js'), rules35 = read35('progress', 'rules.js'), run35 = read35('run', 'run.js');
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
    (/id="sheet" hidden/.test(html35) && /function hideSheet\(\)\{ const sh=\$\('#sheet'\); sh\.hidden=true;/.test(pick35) && !/\$\('#sheet'\)\.classList\.toggle\('up',st!=='grid'\)/.test(pick35))
      ? ok('F.1 the sheet starts hidden and is hidden again once it has slid down - out of the layout, not translated under it') : bad('F.1 the sheet leaves the layout, statically');
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
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' || e.name === '_smoke' || e.name.startsWith('.')) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
    const files = walk(root35);
    const writers = files.flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/prefs\.col\[[^\]]+\]\[[^\]]+\]\s*=(?!=)/g)].map(() => path.relative(root35, f).replace(/\\/g, '/')));
    const near = files.filter(f => /prefs\.col[^;\n]*\b(P1C|P2C)\b/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(root35, f));
    (writers.length === 2 && writers.every(w => w === 'ui/screens/customise.js' /* AMENDED at build 39: Customise's code is its own file again */) && !near.length)
      ? ok('F.4 investigated: the only two writers of a game colour are Customise\'s swatch tap and its wheel, and no player colour is written near prefs.col anywhere')
      : bad('F.4 who writes prefs.col', JSON.stringify({ writers, near }));
    (/VERSION=5/.test(store35) /* AMENDED at build 40: v5, the named chests (up5) */ && /if\(\(raw\.v\|\|0\)<4\) raw=up4\(raw\);/.test(store35) && /o\.mig35=p\.mig35/.test(store35) && /'chip-pv'\(b\)\{ F\.g=b\.dataset\.v; pvTry\.set=null;/.test(prog35))
      ? ok('F.4 the store is v4 with up4 on the ladder and mig35 shape-checked, and a previewed swatch is dropped when the game chip changes')
      : bad('F.4 the ladder step and the preview reset');
    const COLS = { 'quick-tap': { sq: '#9BE8FF', lead: '#C8322A', cut: '#9BE8FF' }, dots: { sq: '#C6FF7A', lead: '#C8322A', cut: '#C6FF7A' }, hold: { sq: '#FFFFFF', lead: '#C8322A', cut: '#FFFFFF' } };
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, allOpen: false, col: COLS, chests: { games: 1 } /* AMENDED at build 40 (L.11a): Customise waits for the Games chest */ }, runs: [{ t: NOW35, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }, { t: NOW35 - 1, g: 'dots', d: 'blind', s: 5, n: '', v: 4, hits: 8, misses: 0 }], ach: {}, unlock: { 'dots:blind': NOW35 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(500);
    const f4 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); const t = g => document.querySelector(`.tile[data-game="${g}"]`).style.getPropertyValue('--sq-live').trim().toUpperCase();
      return { v: ne.v, mig: ne.prefs.mig35, sq: [...new Set(Object.values(ne.prefs.col).map(c => c.sq))], qt: t('quick-tap'), dots: t('dots') }; });
    (f4.v === 5 /* AMENDED at build 40: the ladder runs on to v5 */ && f4.mig === 2 && f4.sq.join() === '#FFFFFF' && f4.qt === '#FFFFFF' && f4.dots === '#FFFFFF')
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
    (C35.SHEET.goVersus === undefined && /const goLabel=\(\)=>SHEET\.go;/.test(read35('ui', 'format.js')))
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
    const AT = { 'quick-tap': [.4833, .3667, .25], dots: [.5556, .4444, .3111], hold: [.875, .75, .25], 'hold:cut': [.8875, .8, .625], sequence: [.6875, .5, .3125] };
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
    (split.every(k => T35[k]) && T35['timing:stopwatch'].at.join() === '0.9,0.74,0.56' && T35['timing:hidden'].at.join() === '0.9259,0.8796,0.8241' && !T35.timing && !T35.reaction && !same('reaction:flash', 'reaction:nogo'))
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

/* ---- 16. build 36 (FEEDBACK-v22 §J.1, the frozen clock; the Verdict Desk export, version 658) ---- */
console.log('\nbuild 36 - the frozen clock and the verdict export');
{
  const root36 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read36 = (...p) => fs.readFileSync(path.join(root36, ...p), 'utf8');
  const imp36 = (...p) => import(pathToFileURL(path.join(root36, ...p)).href);
  const audio36 = read36('audio.js'), testing36 = read36('ui', 'screens', 'testing.js');

  /* ---- §J.1: iOS leaves state 'running' on a frozen clock. The gates are off the foreground paths, revive() checks the clock,
     and the tap reads a flag and never waits. Static first, then every path driven with the clock frozen by hand. ---- */
  {
    const tapBranch = (audio36.split("if(c.state==='running'){ if(!tap) return live(c,why);")[1] || '').split('return Promise.resolve(true); }')[0];
    const has = {
      fg: audio36.includes("document.addEventListener('visibilitychange',()=>{ if(!ac) return; if(document.hidden){ ac._suspect=1; mark(ac); return; } revive('foreground'); });"),
      ps: audio36.includes("addEventListener('pageshow',()=>{ if(ac) revive('pageshow'); });"),
      tap: audio36.includes("document.addEventListener('pointerdown',()=>{ if(ac&&(ac.state!=='running'||ac._suspect)) revive('tap',true); },{capture:true,passive:true});"),
      reviveGate: !audio36.includes("if(!c||c.state==='running'||"),
      live: audio36.includes('const LIVE_MS=150;') && /function live\(c,why\)\{[\s\S]*?\},LIVE_MS\)\); \}/.test(audio36),
      tapNoWait: !!tapBranch && !/setTimeout|live\(/.test(tapBranch) && /stuck\(c\)/.test(tapBranch),
      resumeChecked: audio36.includes('if(ac===c&&!tap) return live(c,why).then(done);'),
      readout: testing36.includes('audioClock()') && testing36.includes('ABOUT.devClockStopped') };
    Object.values(has).every(Boolean)
      ? ok('§J.1 no state gate left on the foreground or pageshow paths or at the top of revive(); a running context goes to the 150ms clock check; the tap reads a flag and its branch starts no timer; a resume that ends running is checked too; Testing samples the clock')
      : bad('§J.1 the shape of the fix', JSON.stringify(has));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const fz = await page.evaluate(async () => { const M = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const freeze = c => { const t = c.currentTime; Object.defineProperty(c, 'currentTime', { get: () => t, configurable: true }); };
      const tap = () => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
      const S = () => M.audioState(); const out = {};
      M.AC(); M.Music.menu('menu'); await wait(500);
      const c0 = M.ac, g0 = S().gen, k0 = S().checks;
      // a healthy running context: one foreground event runs ONE timed check, sees the clock move and keeps the context
      document.dispatchEvent(new Event('visibilitychange')); await wait(320);
      out.healthy = { same: M.ac === c0, gen: S().gen - g0, checks: S().checks - k0, suspect: !!c0._suspect, why: S().why, clock: S().clock };
      // THE BUG: state still reads running and the clock has stopped. A foreground event rebuilds it
      freeze(c0); out.lie = c0.state;
      document.dispatchEvent(new Event('visibilitychange')); await wait(360);
      out.fg = { changed: M.ac !== c0, gen: S().gen - g0, last: S().last, clock: S().clock };
      // pageshow reaches the same check
      await wait(300); const c1 = M.ac; freeze(c1); window.dispatchEvent(new Event('pageshow')); await wait(360);
      out.ps = { changed: M.ac !== c1, last: S().last };
      // the music re-points after a frozen rebuild: a tick later the bed is on the live context
      await wait(300); out.bed = M.Music.probe();
      // a resume that ends 'running' on a stopped clock is not believed: checked, and rebuilt
      await wait(200); const c2 = M.ac; freeze(c2); await c2.suspend(); await wait(900);
      out.resumeLie = { changed: M.ac !== c2, last: S().last };
      // THE TRAP: fifty taps on a healthy, unsuspected context start no timed check and rebuild nothing
      await wait(300); const c3 = M.ac; c3._suspect = 0; const k1 = S().checks, g1 = S().gen;
      for (let i = 0; i < 50; i++) tap();
      out.taps = { checks: S().checks - k1, gen: S().gen - g1, checking: !!c3._checking };
      // a hidden page marks the context suspect; a suspect, stopped clock is rebuilt by the next tap SYNCHRONOUSLY - inside the gesture
      freeze(c3);
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden;
      out.hidden = !!c3._suspect; c3._p = performance.now() - 500;
      const k2 = S().checks; tap();
      out.tapFrozen = { changed: M.ac !== c3, checks: S().checks - k2, last: S().last };
      // a suspect context whose clock IS moving is cleared by a tap, with no rebuild and no timer
      await wait(300); const c4 = M.ac; const g2 = S().gen, k3 = S().checks; tap();
      out.tapLive = { same: M.ac === c4, suspect: !!c4._suspect, gen: S().gen - g2, checks: S().checks - k3 };
      M.Music.stop(); return out; });
    (fz.healthy.same && fz.healthy.gen === 0 && fz.healthy.checks === 1 && !fz.healthy.suspect && /clock moving/.test(fz.healthy.why) && fz.healthy.clock && fz.healthy.clock.dt > 0)
      ? ok(`§J.1 a healthy context is checked once on foreground and kept - the clock moved ${fz.healthy.clock.dt}s in ${fz.healthy.clock.ms}ms`) : bad('§J.1 a healthy context is kept', JSON.stringify(fz.healthy));
    (fz.lie === 'running' && fz.fg.changed && fz.fg.gen === 1 && /clock stopped/.test(fz.fg.last) && fz.fg.clock && fz.fg.clock.dt === 0)
      ? ok(`§J.1 THE BUG: a context reading "running" with a stopped clock is rebuilt on foreground ("${fz.fg.last}")`) : bad('§J.1 the frozen clock on foreground', JSON.stringify({ lie: fz.lie, fg: fz.fg }));
    (fz.ps.changed && /pageshow · clock stopped/.test(fz.ps.last)) ? ok('§J.1 pageshow reaches the same check and rebuilds a stopped clock') : bad('§J.1 pageshow', JSON.stringify(fz.ps));
    (fz.bed.bed && fz.bed.playing) ? ok('§J.1 after a stopped-clock rebuild the music bed is back on the live context') : bad('§J.1 the music re-points', JSON.stringify(fz.bed));
    (fz.resumeLie.changed && /clock stopped/.test(fz.resumeLie.last)) ? ok(`§J.1 a resume that ends "running" on a stopped clock is checked and rebuilt ("${fz.resumeLie.last}")`) : bad('§J.1 the resume that says running', JSON.stringify(fz.resumeLie));
    (fz.taps.checks === 0 && fz.taps.gen === 0 && !fz.taps.checking)
      ? ok('§J.1 THE TRAP: fifty taps on a healthy context start no clock check and rebuild nothing - the tap path costs one flag read') : bad('§J.1 the tap path runs the check', JSON.stringify(fz.taps));
    (fz.hidden && fz.tapFrozen.changed && fz.tapFrozen.checks === 0 && /tap · clock stopped/.test(fz.tapFrozen.last))
      ? ok('§J.1 a hidden page marks the context suspect, and the next tap on a stopped clock rebuilds it synchronously, inside the gesture, with no timer') : bad('§J.1 the suspect tap', JSON.stringify({ hidden: fz.hidden, tapFrozen: fz.tapFrozen }));
    (fz.tapLive.same && !fz.tapLive.suspect && fz.tapLive.gen === 0 && fz.tapLive.checks === 0)
      ? ok('§J.1 a suspect context whose clock is moving is cleared by the next tap - no rebuild, no timer') : bad('§J.1 the suspect tap on a live clock', JSON.stringify(fz.tapLive));
    // the Testing line: the clock beside the state, and STOPPED when a running state has a still clock
    await click('[data-go="s-testing"]'); await sleep(2300);
    const ro1 = await page.evaluate(() => document.getElementById('dev-audio').textContent.trim());
    await page.evaluate(async () => { const M = await import('./audio.js'); const c = M.ac; const t = c.currentTime; Object.defineProperty(c, 'currentTime', { get: () => t, configurable: true }); });
    await sleep(2300);
    const ro2 = await page.evaluate(() => document.getElementById('dev-audio').textContent.trim());
    await page.evaluate(async () => { const M = await import('./audio.js'); delete M.ac.currentTime; });
    await click('#s-testing .back'); await sleep(300);
    (/^audio · running · clock \+\d\.\d{3}s in \d\.\ds · context \d+/.test(ro1) && !/STOPPED/.test(ro1) && /^audio · running · clock \+0\.000s in \d\.\ds · STOPPED · context/.test(ro2))
      ? ok(`§J.1 Testing reports the clock beside the state - "${ro1.slice(0, 48)}…", and with the clock held still: "${ro2.slice(0, 52)}…"`) : bad('§J.1 the Testing clock readout', JSON.stringify({ ro1, ro2 }));
  }

  /* ---- the Verdict Desk export (version 658): every line it carries, Reaction's thresholds, the per-round ceilings for Cut,
     Flash and Go / No-go (AMENDED at build 37: Timing's thresholds are built too, #414 closed) ---- */
  {
    const V = await imp36('config', 'verdicts.js'), T = V.VERDICTS;
    const W = {
      'quick-tap': { bad: ['Warming up, try again!', 'A few mistakes?', "Alright let's go again.", 'Could be quicker...', 'Do you need a coffee?'], ok: ['Good work!', 'Steady pace!', 'Keep pushing!', 'Decent speed.', 'Almost a Great!'], good: ['Great job!', 'Proper fast.', 'Solid run!', "You're switched on today.", 'Well done!'], ace: ['Look at you go!', "You're flying!", "You're a Quick Tap master!", 'Do those thumbs come with a warning?', 'Quick.  Damn quick.'] },
      dots: { bad: ['Maybe try fingers instead of thumbs?', 'The dots might be winning...', 'Have another crack.', 'Can we pick up the speed?', 'You need to be one with the dots'], ok: ['You own the dots.', 'Decent speed, can you go faster?', "In the 20's!", "That's worthy of the first key.", 'Solid, but could you improve?'], good: ['Quick work!', 'Great job!', 'That was some serious speed.', 'Very good run!', 'Be one with the dots.'], ace: ['Are you cheating?', 'Quickest hands in the West.', 'That will be hard to top.', 'You are the Dots master!', 'Wow, what a run!'] },
      hold: { bad: ['Ooft, maybe try another round.', 'Make sure you match the total area', 'A bit off but not the worst', 'Were you just guessing or...', 'Back to the drawing board.'], ok: ['Decent estimation skills!', 'In the ball park for sure.', 'Not a bad run at all.', 'Reasonable, but could you do better?', "You're getting there!"], good: ['Great eye!', 'Tight. Nearly there!', 'You were on the ball for that one!', 'Close to being an amazing run!', 'One step off perfect.'], ace: ['Machine-like!', 'That was not a normal run.', 'Dead on, round after round.', 'Nothing to correct, perfection.', 'Your estimation skills are unmatched!'] },
      'hold:cut': { bad: ["I wouldn't let you cut my birthday cake...", 'Hmmmm, maybe we work on this one.', 'Give me back that knife please.', 'Do you understand the game or...?', 'Measure twice, cut once'], ok: ['Getting there, solid run!', 'Close enough, good enough.', 'Good run, could we improve?', 'Taking your time, nice to see!', 'You know your percentages!'], good: ["You've got the eye!", 'Clean cutting.', 'Certified birthday cake cutter!', 'See the cut, be the cut.', 'Sliced and diced!'], ace: ['Surgical!', 'Wow, excellent cutting!', 'Are you a doctor?', "Surely there's cheating involved...", "You're a pro!"] },
      sequence: { bad: ['Was that a mistaken tap?', 'Lost it early!', 'I know you can do better than that.', 'Go on, have another crack!', 'Whoops!'], ok: ['Decent performance.', 'Not half bad!', 'Can you get to 8?', 'Taxing the memory.', 'You’ve got more in you!'], good: ['Great memory!', 'A long chain!', 'An ear for music!', 'Very good run!', 'Nicely done!'], ace: ['Photographic!', 'Far above average!', 'A modern day Mozart.', 'Sequence master!', 'Amazing!'] },
      'timing:stopwatch': { bad: ['I’ll keep my watch.', 'Maybe try this one again.', 'Maybe tap in time?', 'Have another crack.', 'Appreciate the attempt.'], ok: ['Getting the rhythm.', 'In the ballpark!', 'Learn to trust your gut.', 'Not bad at all.', 'Close, but I think you could do better!'], good: ['Great intuition.', 'Tight.  Tight tight tight tight!', 'On a roll!', 'Very close timing.', 'Very very good.'], ace: ['The human-stopwatch hybrid!', 'Who needs clocks when we have you?', 'The stopwatch master!', 'More accurate than my Casio!', 'Uncanny performance!'] },
      'timing:hidden': { bad: ['Was there an accidental tap in there?', 'The wall won that one.', 'It really was hidden…', 'Maybe another attempt?', 'Have another go!'], ok: ['Feel the ball, be the ball.', 'In the ball park.', 'A touch early or late, but solid!', 'Decent read.', 'Getting there!'], good: ['Great tracking!', 'Very close!', 'Nice run!', 'Well judged.', 'You’re a natural!'], ace: ['You can see through walls!', 'Right on the marker.', 'How did you track that?', 'Perfect judgement.', 'X-ray vision!'] },
      'reaction:flash': { bad: ['Did you nod off?', 'Slow off the mark.', 'You blinked!', 'Late every time.', 'Do you need a coffee?'], ok: ['Consistent but not that quick', 'Decent but could be better', 'Bang on average!', 'Not the worst.', 'Try again but focus this time!'], good: ['Quick hands!', 'Great reflexes.', 'Very sharp.', 'Nicely quick.', 'Great reactions!'], ace: ['Lightning quick!', 'Faster than a blink.', 'Like a cat!', 'That is elite.', 'Reaction master!'] },
      'reaction:nogo': { bad: ['Don’t let them trick you.', 'Make sure to focus.', 'You need to be one with the shapes.', 'Make a stronger coffee?', 'Have another go, try again.'], ok: ['Decent reactions.', 'You got it!', 'Good run.', 'Decent discipline.', 'Keep at it!'], good: ['Great control!', 'We couldn’t fool you.', 'Quick and careful.', 'Very good run!', 'You know your shapes.'], ace: ['Perfect discipline!', 'Very very very quick.', 'Nothing fooled you.', 'Sharp and patient.', 'You nailed it!'] },
      'spot:count': { bad: ['Blinked and you missed it.', 'Back to pre-school perhaps?', 'Counting the wrong shapes?', 'Don’t count them one by one.', 'Have another crack.'], ok: ['Decent guesses!', 'Good intuition.', 'Stop counting one by one.', 'Not bad, not bad at all', 'Good stuff.'], good: ['Great eye!', 'Nearly spot on.', 'Tight counting.', 'Very close!', 'You have the knack for counting.'], ace: ['Your subconscious mind is strong!', 'This game is too easy for you.', 'Brilliant performance!', 'The counting savant!', 'The shape detective!'] },
      'spot:find': { bad: ['It was there the whole time!', 'Too long on each one.', 'Lost in the crowd.', 'Scan, do not stare.', 'Look wider and go again.'], ok: ['Finding them.', 'Decent search.', 'Let the odd one come to you.', 'Mid pace.', 'Nearly quick!'], good: ['Quick eye!', 'Great scanning.', 'Straight to it, mostly.', 'Low times, nice.', 'Very good run!'], ace: ['You did not search, you saw!', 'Straight to it, every time.', 'Nothing wasted.', 'Very quick eye.', 'That will be hard to beat.'] } };
    const lineBad = []; for (const [k, tiers] of Object.entries(W)) for (const [t, want] of Object.entries(tiers)) if (((T[k] || {}).lines || {})[t]?.join('|') !== want.join('|')) lineBad.push(k + ':' + t);
    const ws = Object.entries(T).flatMap(([k, r]) => Object.values(r.lines).flat().filter(l => l !== l.trim()).map(l => k + ' "' + l + '"'));
    (!lineBad.length && !ws.length && Object.keys(T).length === 11)
      ? ok('Verdict export (v658): every line it carries is in, across all eleven verdict rows; the lines it left blank keep theirs; the two half-typed lines are Aiden\'s fixes; no line carries stray whitespace')
      : bad('Verdict export lines', JSON.stringify({ lineBad, ws, keys: Object.keys(T) }));
    const AT = { 'quick-tap': [.4833, .3667, .25], dots: [.5556, .4444, .3111], hold: [.875, .75, .25], 'hold:cut': [.8875, .8, .625], sequence: [.6875, .5, .3125],
      'reaction:flash': [.7714, .6714, .5857], 'reaction:nogo': [.5, .44, .33], 'timing:stopwatch': [.9, .74, .56], 'timing:hidden': [.9259, .8796, .8241], 'spot:count': [.85, .6, .35], 'spot:find': [.85, .6, .35] };
    const RA = { 'timing:stopwatch': [0.1, 0.3, 0.55], 'timing:hidden': [40, 70, 95], 'reaction:flash': [225, 255, 285], 'reaction:nogo': [299, 330, 400], 'hold:grow': [2, 5, 10], 'hold:cut': [3.5, 5.5, 9], 'spot:count': [0, 1, 2], 'spot:find': [1, 2, 4] };
    const atBad = Object.entries(AT).filter(([k, v]) => !T[k] || T[k].at.join() !== v.join()).map(([k]) => k);
    const raBad = Object.entries(RA).filter(([k, v]) => !V.ROUND_AT[k] || V.ROUND_AT[k].join() !== v.join()).map(([k]) => k);
    (!atBad.length && !raBad.length && Object.keys(V.ROUND_AT).length === 8)
      ? ok('Verdict export: Reaction\'s two threshold triples and the per-round ceilings for Cut, Flash and Go / No-go are Aiden\'s; Timing\'s `at` AND its per-round ceilings are Aiden\'s numbers from build 37 (#414 closed); Spot keeps its own')
      : bad('Verdict export thresholds', JSON.stringify({ atBad, raBad }));
    /timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(read36('progress', 'rules.js'))
      ? ok('Verdict export: Timing\'s QUALITY scales are still 5 and 5400 - build 37\'s Timing thresholds are written against those') : bad('Timing\'s scale moved');
    const q = await page.evaluate(async () => { const P = await import('./progress.js');
      const tier = r => (P.tierOf(Object.assign({ misses: 0, t: 1, v: 4 }, r)) || {}).tier;
      return { flash: [tier({ g: 'reaction', d: 'flash', s: 5, hits: 230 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 231 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 295 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 296 })],
        nogo: [tier({ g: 'reaction', d: 'nogo', s: 5, hits: 320 }), tier({ g: 'reaction', d: 'nogo', s: 5, hits: 321 })] }; });
    (q.flash.join() === 'ace,good,ok,bad' && q.nogo.join() === 'ace,good')
      ? ok('Verdict export played back through the tier: a Flash Set averaging 230ms is Amazing!, 231 Great!, 295 Good., 296 Meh.; Go / No-go 320 over the curve is Amazing!, 321 Great!') : bad('Verdict export, played back', JSON.stringify(q));
  }
}

/* ---- 17. build 37 (batch 15: FEEDBACK-v21 §G.1–§G.4, §G.8; FEEDBACK-v20 §D.4, §D.7; FEEDBACK-v22 §K; Aiden's 2026-09-14 data fixes) ---- */
console.log('\nbuild 37 - keys and chests');
{
  const root37 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read37 = (...p) => fs.readFileSync(path.join(root37, ...p), 'utf8');
  const imp37 = (...p) => import(pathToFileURL(path.join(root37, ...p)).href);
  const strip37 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const css37 = read37('styles', 'app.css'), pick37 = read37('ui', 'screens', 'pick.js'), keyjs37 = read37('progress', 'key.js'), menu37 = read37('ui', 'screens', 'menu.js'), hud37 = read37('games', '_shared', 'hud.js'), prog37 = read37('progress.js');
  const NOW37 = Date.now();
  const rgb37 = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };

  /* ---- a / b: the two typos and Timing's thresholds (Aiden, 2026-09-14; #414 closed) ---- */
  {
    const V = await imp37('config', 'verdicts.js'), T = V.VERDICTS;
    const lines = Object.values(T).flatMap(r => Object.values(r.lines).flat());
    (T['reaction:nogo'].lines.ok[1] === 'You got it!' && T['reaction:nogo'].lines.bad[2] === 'You need to be one with the shapes.' && !lines.some(l => /!\.$|be own with/.test(l)))
      ? ok('a. the two Go / No-go typos are corrected - "You got it!" and "You need to be one with the shapes."') : bad('a. the typos', JSON.stringify([T['reaction:nogo'].lines.ok[1], T['reaction:nogo'].lines.bad[2]]));
    const at = { sw: T['timing:stopwatch'].at.join(), hd: T['timing:hidden'].at.join(), rsw: V.ROUND_AT['timing:stopwatch'].join(), rhd: V.ROUND_AT['timing:hidden'].join() };
    const rules = read37('progress', 'rules.js');
    (at.sw === '0.9,0.74,0.56' && at.hd === '0.9259,0.8796,0.8241' && at.rsw === '0.1,0.3,0.55' && at.rhd === '40,70,95' && /'timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(rules))
      ? ok('b. Timing\'s thresholds build (#414 closed) - Stopwatch 0.90 / 0.74 / 0.56 and per round 0.1 / 0.3 / 0.55, Hidden 0.9259 / 0.8796 / 0.8241 and 40 / 70 / 95 - and the scales did not move (5s, 5400ms)')
      : bad('b. Timing thresholds', JSON.stringify(at));
    const warn = [['site', 'config', 'verdicts.js'], ['site', 'progress', 'rules.js'], ['_review', '2026-09-13_personal_verdict-desk-edits.md'], ['_review', '2026-09-14_personal_verdict-desk-export.md']]
      .filter(p => /DO NOT BUILD Timing|DO-NOT-BUILD-TIMING|DO NOT BUILD THE LINE TABLES BELOW[\s\S]*DO NOT BUILD Timing/i.test(fs.readFileSync(path.join(root37, '..', ...p), 'utf8'))).map(p => p.join('/'));
    !warn.length ? ok('b. the DO NOT BUILD Timing warning is gone from the config, the rules and both Verdict Desk files') : bad('b. the Timing warning still stands somewhere', warn.join(', '));
    const tq = await page.evaluate(async () => { const P = await import('./progress.js'); const tier = r => (P.tierOf(Object.assign({ misses: 0, t: 1, v: 4 }, r)) || {}).tier;
      return { sw: [tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 0.5 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 0.51 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 2.19 }), tier({ g: 'timing', d: 'stopwatch', s: 5, hits: 2.3 })],
        hd: [tier({ g: 'timing', d: 'hidden', s: 10, hits: 400 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 401 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 949 }), tier({ g: 'timing', d: 'hidden', s: 10, hits: 951 })] }; });
    (tq.sw.join() === 'ace,good,ok,bad' && tq.hd.join() === 'ace,good,ok,bad')
      ? ok('b. played back through the tier: a Stopwatch Set 0.50s off is Amazing!, 0.51 Great!, 2.19 Good., 2.30 Meh.; Hidden 400ms Amazing!, 401 Great!, 949 Good. (0.8241 is 949.9ms on the curve), 951 Meh.') : bad('b. Timing played back', JSON.stringify(tq));
  }

  /* ---- c. §K: one colour for "this is what you chose" - and its three checks ---- */
  {
    (/\n  \.choice\.sel\{border-color:var\(--press\)\}/.test(css37) && /\.grid\.chosen \.tile\.keep \.pic\{outline-color:var\(--line\)\}/.test(css37) && /\.grid\.chosen \.tile\.keep \.name\{color:var\(--mute\)\}/.test(css37)
      && /\.choice\.sel\.newthing,\.choice\.sel\.newplay\{border-color:var\(--press\)!important\}/.test(css37) && /\.choice\.sel\.picked\{border-color:var\(--ok\)!important\}/.test(css37))
      ? ok('§K a selected mode takes --press, the pressed tile demotes once a mode is chosen (build 38), first-seen and unplayed modes take --press when selected, and .picked keeps --ok (the tap\'s own 170ms confirmation)')
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
      out.picked = getComputedStyle(two).borderTopColor; await wait(500);
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
    (k.mode.outline === rgb37(k.P) && k.mode.amber === 1 && k.len.sel === rgb37(k.P) && k.len.amber === 1 && k.picked === k.okRgb)
      ? ok(`§K one amber thing at a time: with the mode row up and nothing tapped the pressed tile is the one amber thing; once a mode is chosen that mode is (AMENDED at build 38) (${k.len.sel}); for the 170ms of the tap it flashes --ok first`)
      : bad('§K one colour for what you chose', JSON.stringify({ mode: k.mode, len: k.len, picked: k.picked }));
    (k.contrast.plain >= 3 && k.contrast.pass >= 3)
      ? ok(`§K check 3: --press against the sheet's own ground is ${k.contrast.plain}:1, and ${k.contrast.pass}:1 on the pass & play sheet - past the 3:1 a UI line needs`) : bad('§K check 3 the contrast', JSON.stringify(k.contrast));
  }

  /* ---- G.8: a switch and a reset per key (S5). AMENDED at build 40 (v23 L.8f): per CHEST, four of each - the Key chest's switch is key 1 ---- */
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
    (on.bars.length === 30 && on.snap && on.snap.length === 2 && on.sel && off.bars.join() === 'dots:blind:5,quick-tap:two:5' && !off.snap && !off.sel)
      ? ok('G.8 the Key chest\'s switch clears all thirty key-1 bars and remembers the two it held; switching it off puts exactly those two back') : bad('G.8 the switch', JSON.stringify({ on, off }));
    (!rs.bars.length && rs.chestKey === 0 && !rs.pro && !rs.ach.length && !rs.snap)
      ? ok('G.8 resetting the Key chest backs key 1 out entirely - its bars, the chest and its key achievements - without Fresh game (there is no step into Pro left to undo)') : bad('G.8 the reset', JSON.stringify(rs));
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
    (f.every(x => x.shown) && f.every(x => x.locked) && f[1].name === 'Key chest' && f[2].name === 'Pro chest' && f[3].name === 'Thorns chest' && f.slice(1).every(x => x.need === 'open the previous chest')
      && f.slice(1).every(x => x.col === f[0].col) && f[1].r === f[0].r + 1 && f[2].r === f[0].r + 2 && f[3].r === f[0].r + 3)
      ? ok('G.1 (v17 A.1, narrowed; AMENDED at build 40, L.10c) the Key, Pro and Thorns chests are on the map from the start, stacked under the Games chest, locked, each saying "open the previous chest" and nothing about what is inside') : bad('G.1 the chest column', JSON.stringify(f));
    (g12.tap.toast === 'Open the previous chest first' && g12.tap.screen === 's-pick' && !g12.tap.chest2)
      ? ok('G.1 tapping a chest whose previous chest is shut says so and stays put, storing nothing') : bad('G.1 the early tap', JSON.stringify(g12.tap));
    (/^\d+% · opens at 200%$/.test(g12.after1[1].need) && g12.after1[2].need === 'open the previous chest' && g12.after1[3].need === 'open the previous chest')
      ? ok(`G.1 AMENDED at build 40 (L.8a): once the Games chest is open the Key chest reads the meter - "${g12.after1[1].need}" - and the chests after it still point at the chest before them`) : bad('G.1 after the Games chest', JSON.stringify(g12.after1));
    const u = g12.keys.under;
    (g12.keys.n === 3 && g12.keys.locked.join() === 'true,true,true' && g12.keys.x.join() === 'true,true,true' && u[0] === 'To unlock: open the Games chest' && u[1] === 'To unlock: open the previous chest' && u[2] === u[1] && !g12.keys.whole && !g12.keys.one)
      ? ok(`G.2 / D.7 AMENDED at build 40 (L.10a): all three keys on the strip and all three crossed out before the Games chest - "${u[0]}", then "${u[1]}" - with no percentage`) : bad('G.2 / D.7 the key strip', JSON.stringify(g12.keys));
    (/^Open the previous chest first/.test(g12.keyTap.toast) && g12.keyTap.title === 'the key' && g12.keyTap.sel === 0)
      ? ok('G.2 / A.1 a locked key says what opens it and does not open - no ring, no numbers') : bad('G.2 the locked key tap', JSON.stringify(g12.keyTap));
    (g12.keysAfter.join() === 'false,true,true' && g12.keysAfter2.join() === 'false,false,true') ? ok('G.2 the Games chest opens key 1, the Key chest opens Pro, and Author stays crossed out until the Pro chest (builds 38 and 40)') : bad('G.2 after each chest', JSON.stringify({ a: g12.keysAfter, b: g12.keysAfter2 }));
  }

  /* ---- G.3: chest 1 waits for every game mode - the one crossing between the chain and the key ---- */
  {
    const KB = await imp37('config', 'key-bars.js'), U = await imp37('config', 'unlocks.js');
    const chain = new Set(U.UNLOCKS.map(x => x.key));
    const modes = [...new Set(Object.keys(KB.KEY_BARS).map(key => key.split(':').slice(0, 2).join(':')))];
    const stranded = modes.filter(m => !chain.has(m) && m !== 'quick-tap:two');
    const chestInChain = [['config', 'unlocks.js'], ['progress', 'rules.js']].filter(p => /chest/i.test(strip37(read37(...p)))).map(p => p.join('/'));
    const modeOpenLine = (/const modeOpen=\(g,d,noChal\)=>[^\n]*/.exec(prog37) || [''])[0];
    (!stranded.length && !chestInChain.length && modeOpenLine && !/chest/.test(modeOpenLine))
      ? ok(`G.3 VERIFIED: every key-1 bar belongs to a mode the chain reaches without chest 1 (${modes.length} modes, none stranded) and nothing in the chain reads a chest - the chest can always be opened`)
      : bad('G.3 a key-1 bar sits behind chest 1', JSON.stringify({ stranded, chestInChain }));
    // AMENDED at build 40 (v23 L.10): modesOpen() sits beside tierOpen() now - mapOpen() is gone - and it is what opens the Games chest
    (/const modesOpen = \(\) => [^\n]*modeCount\(\)/.test(keyjs37) && keyjs37.indexOf('const modesOpen') > keyjs37.indexOf('const tierOpen') && keyjs37.indexOf('const modesOpen') - keyjs37.indexOf('const tierOpen') < 1600
      && !/store\.unlock/.test(strip37(keyjs37)) && !/store\.unlock/.test(strip37(pick37)))
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
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save();
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
    (g4.ready && g4.pro && !g4.author && g4.retro.join() === 'quick-tap:two:5|pro' && g4.fx === 1 && !g4.un && !g4.toasts.length && /Key chest opened/i.test(g4.box))
      ? ok(`G.4 opening the Key chest banks the Pro bars a saved best already beats, SILENTLY (Author waits for the Pro chest, build 38) - one chest sound and its ceremony ("${g4.box}"), no toast, no unlock sound for the clears (AMENDED at build 40, L.8b; at build 41, L.6)`)
      : bad('G.4 the retroactive clear is silent', JSON.stringify(g4));
    (g4.live === 'pro' && /if\(adv\) keyBreak\(adv,rest\)/.test(read37('ui', 'screens', 'result.js')))
      ? ok('G.4 a LIVE clear still announces - checkKey hands back the fresh Pro clear and the result screen interrupts for it, exactly as before') : bad('G.4 the live clear', JSON.stringify({ live: g4.live }));
    (g4.proGreen && g4.rows.join() === 'quick-tap:two:5' && !g4.retroAfter.length)
      ? ok('G.4 the keys screen already wears L8\'s green on the Pro key and on the rows banked that way, the first time they are seen - and then the mark is spent') : bad('G.4 the green on first sight', JSON.stringify({ proGreen: g4.proGreen, rows: g4.rows, retroAfter: g4.retroAfter }));
  }

  /* ---- D.4: the front percentage counts up when it has gone up since it was last shown ---- */
  {
    (/import \{ countUp \} from "\.\.\/\.\.\/core\/count\.js";/.test(menu37) && /import \{ countUp as baseCountUp \} from "\.\.\/\.\.\/core\/count\.js";/.test(hud37) && !/requestAnimationFrame/.test(strip37(menu37)))
      ? ok('D.4 the menu reuses the run\'s count-up - it lives in core/count.js now, hud.countUp wraps it, and the menu has no loop of its own (A4 kept)') : bad('D.4 one count-up');
    const d4 = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const A = await import('./audio.js'); const K = await import('./progress/key.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      /* AMENDED at build 40 (v23 L.8e): ONE last-painted figure - the meter, `prefs.meterSeen` - not one per key. Every mode is open (G.4 left
         them) and so is the Games chest, so 6 of 30 key-1 bars reads 100 + 20 = 120 */
      S.store.runs = []; S.store.bars = {}; K.COMBOS.slice(0, 6).forEach(c => { S.store.bars[c.key] = Date.now(); }); S.prefs.played = 1; S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.prefs.meterSeen = 100; S.save();
      const pct = K.meter(); const wh = []; const ow = A.Snd.whoosh; A.Snd.whoosh = function (ms) { wh.push(ms); return ow.apply(this, arguments); };
      R.show('s-pick'); await wait(120); R.show('s-menu');
      const mk = document.getElementById('menu-key'); const first = { txt: mk.textContent, up: mk.classList.contains('up') };
      await wait(1300); const end = { txt: mk.textContent, seen: JSON.parse(localStorage.getItem('ne')).prefs.meterSeen, whoosh: wh.slice() };
      R.show('s-pick'); await wait(120); R.show('s-menu'); const again = { up: mk.classList.contains('up'), txt: mk.textContent };
      S.prefs.meterSeen = 190; S.save(); R.show('s-pick'); await wait(120); R.show('s-menu'); const down = { up: mk.classList.contains('up'), txt: mk.textContent, seen: S.prefs.meterSeen };
      A.Snd.whoosh = ow; return { pct, first, end, again, down }; });
    (d4.pct === 120 && d4.first.txt === '100% complete' && d4.first.up && d4.end.txt === '120% complete' && d4.end.seen === 120 && d4.end.whoosh.includes(900))
      ? ok('D.4 / L.8e back at the menu with the meter up from 100% to 120% since it was last shown, the figure pulses and counts up with the count-up\'s own whoosh, and 120 is written when it is painted') : bad('D.4 the count-up', JSON.stringify(d4));
    (!d4.again.up && d4.again.txt === '120% complete' && !d4.down.up && d4.down.txt === '120% complete' && d4.down.seen === 120)
      ? ok('D.4 painting the same figure again plays nothing, and a figure LOWER than the one last seen never counts down') : bad('D.4 once, and never down', JSON.stringify({ again: d4.again, down: d4.down }));
  }
}

/* ---- 18. build 38 (Aiden's two answers to build 37, 2026-09-14): the tile keeps its amber until a mode is chosen; Author waits for the Pro chest ---- */
console.log('\nbuild 38 - the tile keeps its amber, Author waits for the Pro chest');
{
  const root38 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read38 = (...p) => fs.readFileSync(path.join(root38, ...p), 'utf8');
  const css38 = read38('styles', 'app.css'), pick38 = read38('ui', 'screens', 'pick.js'), key38 = read38('progress', 'key.js'), prog38 = read38('ui', 'screens', 'progress.js');

  /* ---- 1. the pressed tile keeps --press until a mode is actually chosen ---- */
  {
    (/\.grid\.chosen \.tile\.keep \.pic\{outline-color:var\(--line\)\}/.test(css38) && !/\.grid\.dim \.tile\.keep \.pic\{outline-color/.test(css38)
      && /classList\.toggle\('chosen',st!=='grid'&&GAMES\[sel\.game\]\.modes\.length>1&&!!\$\('#diff-row \.choice\.sel'\)\)/.test(pick38))
      ? ok('38.1 the tile demotes on `.grid.chosen` - a mode selected on a game with more than one - and no longer on `.grid.dim`') : bad('38.1 the rule');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(600);
    const q1 = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms));
      const P = getComputedStyle(document.documentElement).getPropertyValue('--press').trim(); const n = parseInt(P.slice(1), 16); const A = `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
      const grid = document.getElementById('grid'), sheet = document.getElementById('sheet');
      const tileAmber = t => getComputedStyle(t.querySelector('.pic')).outlineColor === A;
      const choices = () => [...document.querySelectorAll('#diff-row .choice')].filter(c => c.offsetParent && getComputedStyle(c).borderTopColor === A).length;
      const qt = document.querySelector('.tile[data-game="quick-tap"]'); qt.click(); await wait(450);
      const out = { mode: { chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() } };
      document.querySelector('#diff-row .choice[data-diff="two"]').click(); await wait(600);
      out.len = { chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() };
      document.querySelector('#diff-row .choice.sel').click(); await wait(400);
      out.back = { stage: sheet.classList.contains('len') ? 'len' : 'mode', chosen: grid.classList.contains('chosen'), tile: tileAmber(qt), choices: choices() };
      document.querySelector('#s-pick .back').click(); await wait(500);
      const seq = document.querySelector('.tile[data-game="sequence"]'); seq.click(); await wait(500);
      out.seq = { stage: sheet.classList.contains('len') ? 'len' : 'mode', chosen: grid.classList.contains('chosen'), tile: tileAmber(seq) };
      return out; });
    (!q1.mode.chosen && q1.mode.tile && q1.mode.choices === 0)
      ? ok('38.1 with the mode row up and nothing tapped the pressed tile keeps its amber, and it is the only amber thing') : bad('38.1 the mode row', JSON.stringify(q1.mode));
    (q1.len.chosen && !q1.len.tile && q1.len.choices === 1 && q1.back.stage === 'mode' && q1.back.chosen && !q1.back.tile && q1.back.choices === 1)
      ? ok('38.1 once a mode is chosen it takes the amber and the tile demotes - still so when the sheet goes back to the mode row with that mode selected') : bad('38.1 a chosen mode', JSON.stringify({ len: q1.len, back: q1.back }));
    (q1.seq.stage === 'len' && !q1.seq.chosen && q1.seq.tile)
      ? ok('38.1 Sequence has no mode row to tap, so its tile keeps the amber on its length row') : bad('38.1 a one-mode game', JSON.stringify(q1.seq));
  }

  /* ---- 2. each tier opens with its own chest: Pro with chest 1, Author with the Pro chest ---- */
  {
    /* AMENDED at build 40 (v23 L.10): the tier line names the chest that REVEALS the tier (config/chests.js `opens`) rather than counting
       chests; the radar keeps key 1's rung before the Games chest; the Achievements tab asks for key 1's set too */
    (/const tierOpen = tier => \{ const c = CHESTS\.find\(x => x\.opens === tier\); return !c \|\| chestOpen\(c\.id\); \};/.test(key38)
      && /function radarRungs\(\) \{ const open = TIERS\.filter\(\(t, i\) => !i \|\| tierOpen\(t\)\);/.test(key38)
      && /const groupShown=t=>t==='key1'\?tierOpen\('clear'\):t==='key2'\?tierOpen\('pro'\):t==='key3'\?tierOpen\('author'\):true;/.test(prog38))
      ? ok('38.2 one line decides a tier: the chest that reveals it, with the dev escapes - and the radar and the Achievements tab ask it per tier (AMENDED at build 40)') : bad('38.2 the rule');
    await setStorage({ ne: { v: 5, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const q2 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.store.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 40, misses: 0 }]; S.save(); K.fillBars(true);
      const out = { pro: K.tierOpen('pro'), author: K.tierOpen('author'), rungs: K.radarRungs().map(r => r.tier).join() };
      out.live = (K.checkKey({ g: 'quick-tap', d: 'two', s: 5, hits: 40, misses: 0, t: Date.now(), v: 4 }, false) || {}).tier;
      out.proBar = !!S.store.bars['quick-tap:two:5|pro']; out.authorBar = !!S.store.bars['quick-tap:two:5|author'];
      R.show('s-key'); await wait(600); out.strip = [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('locked')).join();
      R.show('s-prog', { tab: 'ach' }); await wait(500); out.sets = [...document.querySelectorAll('#achlist h4')].map(h => h.className).filter(c => /^key/.test(c)).join();
      S.prefs.chests = Object.assign({}, S.prefs.chests, { pro: 1 }); S.save(); out.retro = K.retroBank(['author']).join(); out.author2 = K.tierOpen('author'); out.rungs2 = K.radarRungs().map(r => r.tier).join();
      R.show('s-menu'); await wait(150); R.show('s-key'); await wait(500); out.strip2 = [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('locked')).join();
      R.show('s-prog', { tab: 'ach' }); await wait(500); out.sets2 = [...document.querySelectorAll('#achlist h4')].map(h => h.className).filter(c => /^key/.test(c)).join();
      K.fillBars(false); S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.bars = {}; S.store.runs = []; S.save(); return out; });
    (q2.pro && !q2.author && q2.rungs === 'clear,pro' && q2.strip === 'false,false,true' && q2.sets === 'key1,key2')
      ? ok('38.2 with chest 1 open and the Pro chest shut: Pro is open, Author is crossed out on the strip, the radar has two rungs and the Achievements tab shows no Author set') : bad('38.2 before the Pro chest', JSON.stringify(q2));
    (q2.live === 'clear' && q2.proBar && !q2.authorBar)
      ? ok('38.2 a run that beats every bar clears key 1 and Pro and banks nothing on Author while its chest is shut') : bad('38.2 no Author clear before its chest', JSON.stringify({ live: q2.live, proBar: q2.proBar, authorBar: q2.authorBar }));
    (q2.author2 && q2.retro === 'quick-tap:two:5|author' && q2.rungs2 === 'clear,pro,author' && q2.strip2 === 'false,false,false' && q2.sets2 === 'key1,key2,key3')
      ? ok('38.2 the Pro chest opens Author: its bars already beaten are credited silently (G.4), all three keys and rungs are open, and the Author set appears') : bad('38.2 after the Pro chest', JSON.stringify(q2));
  }

  /* ---- 3. #426: Pro and Author PLACEHOLDERS (A.2 amended) - the generator writes the file, and never a person's number ---- */
  console.log('\nbuild 38 - #426 Pro and Author placeholders');
  const P38 = await import(pathToFileURL(path.join(root38, 'scripts', 'placeholders.mjs')).href);
  const { ROUND_AT: RA38 } = await import(pathToFileURL(path.join(root38, 'config', 'verdicts.js')).href);
  const bars38 = read38('config', 'key-bars.js'), json38 = fs.readFileSync(path.join(root38, '..', '_review', 'key-bars.json'), 'utf8');
  const rows38 = P38.rowsOf(bars38);
  const spanOf = (src, key, name) => { const r = P38.rowsOf(src).find(x => x.key === key); const f = P38.fieldsOf(src, r.from, r.to).find(x => x.name === name); return f ? src.slice(f.from, f.to) : ''; };
  {
    const again = P38.generate(bars38, RA38).out, cleared = P38.generate(bars38, RA38, 'clear').out, refilled = P38.generate(cleared, RA38).out;
    const empty = P38.rowsOf(cleared).every(r => r.obj.pro === null && r.obj.author === null && !('placeholder' in r.obj));
    (again === bars38 && empty && refilled === bars38 && P38.reviewJson(json38, rows38) === json38)
      ? ok(`#426 config/key-bars.js is exactly what npm run placeholders writes: regenerating changes nothing, --clear takes all ${rows38.length * 2} cells back to null with no marker left, filling that gives the file back byte for byte, and ../_review/key-bars.json matches`)
      : bad('#426 the file is the generator\'s output', JSON.stringify({ again: again === bars38, empty, refilled: refilled === bars38, json: P38.reviewJson(json38, rows38) === json38 }));
    // the scheme, cell by cell: the multiplier for the row's own direction, its own precision, harder tier over tier, the floors, the marker
    const off = [];
    for (const r of rows38) { const o = r.obj, st = P38.stepOf(o.unit), fl = P38.floorOf(r.key, o, RA38);
      for (const [t, below] of [['pro', o.bar], ['author', o.pro]]) { const v = o[t], m = P38.MULT[o.dir][t], mk = (o.placeholder || {})[t] || {}, basis = mk.basis || '';
        const prec = st === 10 ? v % 10 === 0 : st === 1 ? Number.isInteger(v) : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
        const expect = Math.max(fl ? fl.at : -Infinity, P38.roundTo(o.bar * m, st));
        const good = prec && (o.dir === 'lower' ? v < below : v > below) && !(fl && v < fl.at) && (v === expect || /stepped to/.test(basis))
          && mk.v === v && mk.conf === 'low' && /^PLACEHOLDER/.test(basis) && basis.includes('× ' + m.toFixed(2)) && /awaiting his/.test(basis);
        if (!good) off.push(`${r.key} ${t}=${v}`); } }
    const flash = rows38.find(r => r.key === 'reaction:flash:5').obj;
    (!off.length && flash.author === 180 && /CLAMPED to 180/.test(flash.placeholder.author.basis))
      ? ok(`#426 all ${rows38.length * 2} cells follow the scheme: × 1.15 / × 1.30 on a floor, × 0.80 / × 0.65 on a ceiling, the row's own precision, each tier strictly harder than the one below, none past its floor, each marked conf 'low' with a basis naming its multiplier - and Flash · Set's Author is CLAMPED to 180ms (255 × 0.65 = 165.75), saying so`)
      : bad('#426 the scheme', JSON.stringify({ off, flash: [flash.pro, flash.author] }));
    /* NEVER OVERWRITE A NUMBER A PERSON ENTERED. Two cells hand-set to odd values - one through --set, which drops its marker,
       one typed over a placeholder with its now-stale marker left behind - then the generator runs over the table twice */
    let hand = P38.setCell(bars38, 'qt-two-5', 'pro', 13.37);
    { const r = P38.rowsOf(hand).find(x => x.key === 'dots:lead:30'), f = P38.fieldsOf(hand, r.from, r.to).find(x => x.name === 'author'); hand = hand.slice(0, f.from) + '101.5' + hand.slice(f.to); }
    const g1 = P38.generate(hand, RA38), g2 = P38.generate(g1.out, RA38);
    const barsText = src => P38.rowsOf(src).map(r => spanOf(src, r.key, 'bar')).join();
    const handRows = P38.rowsOf(hand), qtRow = handRows.find(r => r.key === 'quick-tap:two:5').obj, dlRow = handRows.find(r => r.key === 'dots:lead:30').obj;
    const kept = g1.report.filter(x => x.act === 'kept').map(x => x.key + ' ' + x.tier).sort().join();
    let refused = false; try { P38.setCell(bars38, 'qt-two-5', 'bar', 1); } catch (e) { refused = /bar/.test(e.message); }
    (g1.out === hand && g2.out === hand && spanOf(g2.out, 'quick-tap:two:5', 'pro') === '13.37' && spanOf(g2.out, 'dots:lead:30', 'author') === '101.5'
      && spanOf(g2.out, 'dots:lead:30', 'placeholder') === spanOf(hand, 'dots:lead:30', 'placeholder') && !('pro' in (qtRow.placeholder || {})) && dlRow.placeholder.author.v !== 101.5
      && kept === 'dots:lead:30 author,quick-tap:two:5 pro' && barsText(g2.out) === barsText(bars38) && refused)
      ? ok('#426 NEVER OVERWRITE: 13.37 put in through --set (marker dropped) and 101.5 typed over a placeholder (stale marker left) survive two generator runs byte for byte, both reported kept, every other cell and every key-1 bar untouched - and --set refuses `bar`')
      : bad('#426 a person\'s number survives the generator', JSON.stringify({ same1: g1.out === hand, same2: g2.out === hand, qt: spanOf(g2.out, 'quick-tap:two:5', 'pro'), dl: spanOf(g2.out, 'dots:lead:30', 'author'), kept, refused }));
    // and the app reads the marker by the same test, and says so on the key screen per tier
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const ph = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const warn = () => document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent.trim();
      const out = { pro: K.placeholderCount('pro'), author: K.placeholderCount('author'), clear: K.placeholderCount('clear'), n: K.COMBOS.length };
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5'), was = c.bar.pro;
      c.bar.pro = 13.37; out.edited = { is: K.isPlaceholder(c, 'pro'), count: K.placeholderCount('pro'), author: K.isPlaceholder(c, 'author') };
      R.show('s-key', { tier: 1 }); await wait(350); out.edited.warn = warn();
      c.bar.pro = was; R.show('s-menu'); await wait(80); R.show('s-key', { tier: 1 }); await wait(350); out.warnPro = warn();
      R.show('s-menu'); await wait(80); R.show('s-key', { tier: 0 }); await wait(350); out.warnClear = warn();
      return out; });
    (ph.pro === ph.n && ph.author === ph.n && ph.clear === 0 && !ph.edited.is && ph.edited.count === ph.n - 1 && ph.edited.author
      && ph.warnPro.startsWith(`${ph.n} of the ${ph.n} numbers on this key are PLACEHOLDERS`) && ph.edited.warn.startsWith(`${ph.n - 1} of the ${ph.n}`) && ph.warnClear === '')
      ? ok(`#426 progress/key.js tells a generated number from a set one: ${ph.pro} Pro and ${ph.author} Author placeholders, none on key 1; one Pro number changed in place is a person's (${ph.edited.count} left) and Circuit says "${ph.edited.warn}"`)
      : bad('#426 isPlaceholder and the key screen note', JSON.stringify(ph));
  }

  /* ---- 4. #426 A: Circuit and Thorn seen working - every animation Lantern gets, on all three, each in its own tint ---- */
  {
    const kfLines = css38.split('\n').filter(l => /@keyframes krootgrow\{/.test(l)), kfLast = kfLines[kfLines.length - 1] || '';
    (/var\(--ktint\)/.test(kfLast) && !/--ok/.test(kfLast) && /\.khalo\{fill:none;stroke:var\(--ktint\)\}/.test(css38)
      && /@keyframes kwholeglyph\{[^\n]*var\(--ktint\)/.test(css38) && !/\[data-style="(lantern|circuit|thorn)"\][^{]*\{[^}]*animation/.test(css38))
      ? ok('#426 A statically: the krootgrow that wins reads --ktint, the halo strokes in --ktint, the whole-key glyph flares in it, and no [data-style] rule sets or cancels an animation')
      : bad('#426 A the animation CSS is theme-driven');
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const par = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const KY = await import('./config/keys.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const trip = hex => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
      const names = el => [...new Set(el.getAnimations({ subtree: true }).map(a => a.animationName).filter(Boolean))].sort().join();
      const key = document.getElementById('s-key'), out = [];
      // most of every tier lit, never whole: Spot's first combination left dark for the advance to grow, and one Quick Tap one
      const spot = K.COMBOS.find(c => c.g === 'spot'), spare = K.COMBOS.find(c => c.g === 'quick-tap');
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c !== spot && c !== spare) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.save();
      for (let i = 0; i < K.TIERS.length; i++) { const t = K.TIERS[i], tint = trip(KY.KEYS[i].tint), row = { tier: t, tint: KY.KEYS[i].tint };
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i }); await wait(400);
        row.style = key.dataset.style;
        const lit = document.querySelector('#key-ring .kroot.on'); row.lit = !!lit && getComputedStyle(lit).stroke.includes(tint);
        // 9.5 / 5.1: the advance, handed over exactly the way the result screen hands a fresh clear over
        S.store.bars[K.skey(spot.key, t)] = Date.now(); S.save(); const g = K.gameKey('spot', t);
        R.show('s-menu'); await wait(80); R.show('s-key', { advance: { key: spot.key, tier: t, g: 'spot', d: spot.d, s: spot.s, was: g.done - 1, done: g.done, total: g.total } }); await wait(360);
        const seg = document.querySelector(`#key-ring [data-seg="spot:${g.done - 1}"]`), halo = document.querySelector('#key-ring .kr[data-rg="spot"] .khalo');
        row.advance = { grow: !!seg && seg.classList.contains('grow'), seg: seg ? names(seg) : '', halo: halo ? halo.getAnimations().map(a => a.animationName).join() : '', haloTint: !!halo && getComputedStyle(halo).stroke.includes(tint) };
        delete S.store.bars[K.skey(spot.key, t)]; S.save(); await wait(900);
        // B.20: the whole-key moment
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, whole: true }); await wait(520);
        const glyph = document.querySelector('#key-ring .kglyph');
        row.whole = { on: key.classList.contains('kwhole'), names: names(key), glyph: glyph ? glyph.getAnimations().map(a => a.animationName).join() : '', count: getComputedStyle(document.getElementById('key-count')).color.includes(tint) };
        await wait(3000);
        // 5.4 / B.21: the staged first open
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, arrive: true }); await wait(250);
        const every = (sel, n) => { const els = [...document.querySelectorAll(sel)]; return els.length > 0 && els.every(x => x.getAnimations().some(a => a.animationName === n)); };
        row.first = { on: key.classList.contains('first'), names: names(key), kr: every('#key-ring .kr', 'keyin'), node: every('#key-ring .knode', 'keyin') };
        await wait(2700);
        out.push(row); }
      S.store.bars = {}; S.prefs.keySeen = 1; S.save(); return out; });
    const L = par[0];
    const sameAs = p => p.advance.seg === L.advance.seg && p.advance.halo === L.advance.halo && p.whole.names === L.whole.names && p.whole.glyph === L.whole.glyph && p.first.names === L.first.names;
    (par.map(p => p.style).join() === 'lantern,circuit,thorn' && L.advance.seg === 'krootgrow' && L.advance.halo === 'khaloglow' && L.whole.glyph === 'kwholeglyph' && /khaloglow/.test(L.whole.names) && /keyin/.test(L.first.names)
      && par.every(p => sameAs(p) && p.lit && p.advance.grow && p.advance.haloTint && p.whole.on && p.whole.count && p.first.on && p.first.kr && p.first.node))
      ? ok(`#426 A: Circuit and Thorn run every animation Lantern does - the advance (${L.advance.seg} under ${L.advance.halo}), the whole-key moment (${L.whole.names}), the staged first open (${L.first.names}) - with lit segments, halos and the count line in each tier's own tint (${par.map(p => p.tint).join(' / ')})`)
      : bad('#426 A animation parity across the three styles', JSON.stringify(par));
  }

  /* ---- 5. #426 B: retroactive banking has something to bank - both ways - and it runs when the numbers arrive ---- */
  {
    const keys = rows38.map(r => r.key);
    const runs = keys.map((k, i) => { const [g, d, s] = k.split(':'), o = rows38[i].obj; return { t: NOW, g, d, s: +s, n: '', v: 4, hits: i % 2 ? o.bar : o.pro, misses: 0 }; });
    const want = keys.filter((k, i) => !(i % 2)).map(k => k + '|pro').sort();
    const open1 = async list => {
      await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1 }, runs: list, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
      return page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const A = await import('./audio.js'); const U = await import('./config/unlocks.js');
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const bootPro = Object.keys(S.store.bars).filter(k => k.endsWith('|pro')).length;
        for (const x of U.UNLOCKS) S.store.unlock[x.key] = Date.now();
        for (const c of K.COMBOS) S.store.bars[c.key] = Date.now();
        // AMENDED at build 40 (v23 L.10 / L.8b): chest 1 is the KEY chest, behind the Games chest, and it opens on its key screen by itself
        S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save();
        // AMENDED at build 41 (v23 L.6): the chest's one sound is Snd.chest, never unlockFx
        let fx = 0, un = 0; const orig = A.Snd.chest, origU = A.Snd.unlockFx; A.Snd.chest = function () { fx++; return orig.apply(this, arguments); }; A.Snd.unlockFx = function () { un++; return origU.apply(this, arguments); };
        const toasts = []; const mo = new MutationObserver(() => toasts.push(document.getElementById('toast').textContent.trim())); mo.observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true });
        R.show('s-pick'); await wait(600);
        const ready = document.querySelector('.chest[data-chest="key"]').classList.contains('ready');
        document.querySelector('.chest[data-chest="key"]').click(); await wait(2300);
        const out = { bootPro, ready, pro: Object.keys(S.store.bars).filter(k => k.endsWith('|pro')).sort(), author: Object.keys(S.store.bars).filter(k => k.endsWith('|author')).length,
          retro: Object.keys(S.prefs.retro || {}).length, col: typeof (S.prefs.retroCol || {}).pro === 'string', fx: un ? -un : fx, toasts: [...new Set(toasts.filter(Boolean))], opened: S.prefs.chests.key };
        mo.disconnect(); A.Snd.chest = orig; A.Snd.unlockFx = origU;
        return out; }); };
    const good = await open1(runs), none = await open1([]);
    (good.ready && !good.bootPro && good.opened === 1 && good.pro.join() === want.join() && !good.author && good.retro === want.length && good.col && good.fx === 1 && !good.toasts.length)
      ? ok(`#426 B: a profile whose bests beat every other Pro bar opens the Key chest and banks exactly those ${good.pro.length}, SILENTLY - one chest sound, no toast (AMENDED at build 40, L.8b), nothing for the clears, nothing on Author behind its own chest`)
      : bad('#426 B the retroactive clear with something to bank', JSON.stringify({ ...good, want: want.length }));
    (none.ready && none.opened === 1 && !none.pro.length && !none.author && !none.retro && none.col && none.fx === 1 && !none.toasts.length)
      ? ok('#426 B: a profile with no runs opens the Key chest and banks nothing - still one chest sound, and no toast')
      : bad('#426 B the retroactive clear with nothing to bank', JSON.stringify(none));
    // Aiden, "yes, silently, once": a column that ARRIVES for a tier already open is credited at boot, once per column
    await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1, chest1: 1 }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const readNe = () => page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')), t = document.getElementById('toast');
      return { pro: Object.keys(ne.bars).filter(k => k.endsWith('|pro')).sort(), author: Object.keys(ne.bars).filter(k => k.endsWith('|author')).length, col: Object.keys(ne.prefs.retroCol || {}).join(), retro: Object.keys(ne.prefs.retro || {}).length, toast: t.classList.contains('on') ? t.textContent.trim() : '' }; });
    const a1 = await readNe();
    const gone = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); const k = Object.keys(ne.bars).find(x => x.endsWith('|pro')); delete ne.bars[k]; localStorage.setItem('ne', JSON.stringify(ne)); return k; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a2 = await readNe();
    await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); ne.prefs.retroCol = { pro: 'an older column' }; localStorage.setItem('ne', JSON.stringify(ne)); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a3 = await readNe();
    (a1.pro.join() === want.join() && !a1.author && a1.col === 'pro' && a1.retro === want.length && a1.toast === '')
      ? ok(`#426 on arrival: a profile with chest 1 already open boots on the new columns and banks the ${a1.pro.length} Pro bars its bests beat - no toast, no chest, Author untouched behind its own chest, the column recorded`)
      : bad('#426 retro credit when the numbers arrive', JSON.stringify(a1));
    (gone && !a2.pro.includes(gone) && a2.pro.length === want.length - 1 && a3.pro.includes(gone) && a3.pro.length === want.length)
      ? ok('#426 once per column: a Pro bar removed by hand is NOT re-banked on the next boot, and a different column credits once more')
      : bad('#426 retro on arrival runs once per column', JSON.stringify({ gone, a2: a2.pro.length, a3: a3.pro.length }));
  }
}

/* ---- 19. build 39 (batch 16, the surface - FEEDBACK-v23 §L.2-§L.5): Customise out of Progress, the partition, the labels, the stamp ---- */
console.log('\nbuild 39 - batch 16, the surface');
{
  const root39 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read39 = (...p) => fs.readFileSync(path.join(root39, ...p), 'utf8');
  const html39 = read39('index.html'), css39 = read39('styles', 'app.css'), prog39 = read39('ui', 'screens', 'progress.js'), cus39 = read39('ui', 'screens', 'customise.js'), store39 = read39('core', 'store.js');
  const INK39 = 'rgb(232, 230, 225)', OK39 = 'rgb(61, 214, 140)', RED39 = ['rgb(200, 50, 42)', 'rgb(179, 38, 30)', 'rgb(224, 69, 59)'];
  const NOW39 = Date.now();
  const PLAIN39 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {} };

  /* ---- 1. L.4a: Customise is its own screen, menu item and file again - content untouched (v18 B.31 amended, A4) ---- */
  {
    const custom = (html39.match(/<section class="screen top" id="s-custom"[\s\S]*?<\/section>/) || [''])[0];
    const prog = (html39.match(/<section class="screen top" id="s-prog"[\s\S]*?<\/section>/) || [''])[0];
    const ids = ['pv', 'pvg', 'pv-g', 'c-sq', 'c-lead', 'c-cut', 'c-bg', 'c-snd', 'c-scale', 'c-rate', 'c-track', 'c-menumusic', 'lk-sq', 'lk-lead', 'lk-cut', 'lk-bg', 'lk-snd', 'lk-scale', 'lk-rate', 'g-lead', 'g-cut', 'g-scale', 'g-rate'];
    const missing = ids.filter(id => !custom.includes(`id="${id}"`)), left = ids.filter(id => prog.includes(`id="${id}"`));
    // AMENDED at build 40 (v23 L.11a): the Customise row carries data-act="custom" so a locked tap can be refused
    const menu = [...html39.matchAll(/<button data-act="(?:go|custom)" class="item glow" data-go="(s-[\w-]+)"[^>]*>([^<]+)</g)].map(m => m[2]);
    const code = { moved: /function renderCustom\(\)/.test(cus39) && /const Wheel=/.test(cus39) && /function pvStep\(\)/.test(cus39), gone: !/renderCustom|Wheel|pvStep|pvTry/.test(prog39), reg: /register\('s-custom'/.test(cus39), sibling: /from "\.\/[\w-]+\.js"/.test(cus39) };
    (!missing.length && !left.length && menu.join(' · ').includes('Progress · Keys · Customise · About') && code.moved && code.gone && code.reg && !code.sibling)
      ? ok(`L.4a Customise is its own screen again - all ${ids.length} of its controls on s-custom, none left on Progress, its own file importing no screen (A4), and a menu row: ${menu.join(' · ')}`)
      : bad('L.4a Customise out of Progress', JSON.stringify({ missing, left, menu, code }));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(1200);
    const live = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, groups: document.querySelectorAll('#s-custom .cgroup').length,
      sw: document.querySelectorAll('#c-sq button').length, g: document.getElementById('pv').dataset.g, scrolls: getComputedStyle(document.getElementById('s-custom')).overflowY }));
    (live.screen === 's-custom' && live.groups === 9 && live.sw > 1 && live.g && live.scrolls === 'auto')
      ? ok(`L.4a the menu row opens it: ${live.groups} groups, ${live.sw} target colours, previewing ${live.g}, and the screen scrolls as it did at build 32`)
      : bad('L.4a Customise opens from the menu', JSON.stringify(live));
    await click('#s-custom .back'); await sleep(400);
  }

  /* ---- 2. L.4b: the middle tab reads CUSTOMISE UNLOCKS, and three labels that long wrap the bar instead of shrinking the type ---- */
  {
    await click('[data-go="s-prog"]'); await sleep(500);
    const tb = await page.evaluate(() => { const cs = [...document.querySelectorAll('#prog-tabs .chip')];
      const probe = document.createElement('button'); probe.className = 'chip'; document.body.appendChild(probe); const base = getComputedStyle(probe).fontSize; probe.remove();
      return { tabs: cs.map(c => c.dataset.tab + ':' + c.textContent.trim()), sizes: [...new Set(cs.map(c => getComputedStyle(c).fontSize))], base, upper: cs.every(c => getComputedStyle(c).textTransform === 'uppercase'),
        rows: new Set(cs.map(c => c.offsetTop)).size, inside: cs.every(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), w: innerWidth }; });
    (tb.tabs.join('|') === 'unl:Game unlocks|cul:Customise unlocks|ach:Achievements' && tb.upper && tb.sizes.length === 1 && tb.sizes[0] === tb.base && tb.inside)
      ? ok(`L.4b the tabs read GAME UNLOCKS · CUSTOMISE UNLOCKS · ACHIEVEMENTS in the chip's own ${tb.base} on ${tb.rows} row(s) at ${tb.w}px - the row wraps, the type does not shrink, nothing past the edge`)
      : bad('L.4b the tab bar', JSON.stringify(tb));
    await click('#s-prog .back'); await sleep(400);
    // a profile left on the old Customise tab (builds 33-38) comes back on Customise unlocks, not on nothing
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1, progTab: 'cus' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const old = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab, cul: !document.getElementById('p-cul').hidden, rows: document.querySelectorAll('#cul-list .a').length }));
    (old.stored === 'cul' && old.cul && old.rows > 0)
      ? ok(`L.4b a stored 'cus' from builds 33-38 opens on Customise unlocks (${old.rows} rows) and is stored as 'cul'`) : bad('L.4b the old tab value', JSON.stringify(old));
    (/progTab:p\.progTab==='cus'\?'cul':\['cul','ach'\]\.includes\(p\.progTab\)\?p\.progTab:'unl'/.test(store39.replace(/\s/g, '')))
      ? ok('L.4b cleanPrefs takes unl / cul / ach and maps the old cus onto cul') : bad('L.4b cleanPrefs progTab');
  }

  /* ---- 3. L.4c: the three tabs are a PARTITION - disjoint, and together exactly ACH + keyAch(); Game unlocks is the chain (L6) ---- */
  {
    const pt = await page.evaluate(async () => { const P = await import('./progress.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const ids = s => [...document.querySelectorAll(s)].map(b => b.dataset.ach);
      R.show('s-menu'); await wait(100); R.show('s-prog', { tab: 'unl' }); await wait(400); const unl = ids('#unl-list [data-ach]'), unlRows = document.querySelectorAll('#unl-list .urow').length;
      R.show('s-menu'); await wait(100); R.show('s-prog', { tab: 'cul' }); await wait(400); const cul = ids('#cul-list .a'), culHeads = [...document.querySelectorAll('#cul-list h4')].map(h => h.textContent.trim());
      R.show('s-menu'); await wait(100); R.show('s-prog', { tab: 'ach' }); await wait(400); document.querySelector('#ach-g [data-v="all"]')?.click(); await wait(300); const ach = ids('#achlist .a');
      const keys = K.keyAch();
      return { unl, unlRows, cul, culHeads, ach, table: P.ACH.map(a => a.id).concat(keys.map(a => a.id)), withUnlocks: P.ACH.filter(a => a.unlocks).map(a => a.id),
        pureCul: P.ACH.concat(keys).filter(a => P.achTab(a) === 'cul').map(a => a.id), keyPaid: keys.filter(a => a.unlocks).length }; });
    const srt = a => a.slice().sort().join();
    const both = pt.cul.filter(id => pt.ach.includes(id)), union = new Set([...pt.cul, ...pt.ach]);
    const lost = pt.table.filter(id => !union.has(id)), extra = [...union].filter(id => !pt.table.includes(id));
    (!pt.unl.length && pt.unlRows > 0 && !both.length && !lost.length && !extra.length && pt.cul.length + pt.ach.length === pt.table.length)
      ? ok(`L.4c the three tabs are a partition: Game unlocks ${pt.unlRows} rows and no achievement (L6), Customise unlocks ${pt.cul.length}, Achievements ${pt.ach.length} - disjoint, and together exactly ACH + keyAch() (${pt.table.length})`)
      : bad('L.4c the partition', JSON.stringify({ unl: pt.unl, both, lost, extra, n: [pt.cul.length, pt.ach.length, pt.table.length] }));
    (srt(pt.cul) === srt(pt.withUnlocks) && srt(pt.pureCul) === srt(pt.cul) && !pt.keyPaid)
      ? ok(`L.4c Customise unlocks is every row with an unlocks field and nothing else, by achTab() - grouped ${pt.culHeads.join(' / ')}`)
      : bad('L.4c what the middle tab holds', JSON.stringify({ cul: pt.cul, want: pt.withUnlocks }));
    // an achievement toast, and a locked cosmetic's line, open Progress on the tab the row lives on, at the row
    const route = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'first' }); await wait(500);
      const a = { cul: !document.getElementById('p-cul').hidden, flash: !!document.querySelector('#cul-first.flash') };
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'qt_bclean5' }); await wait(500);
      const b = { ach: !document.getElementById('p-ach').hidden, flash: !!document.querySelector('#ach-qt_bclean5.flash') };
      return { a, b }; });
    (route.a.cul && route.a.flash && route.b.ach && route.b.flash)
      ? ok('L.4c {ach} lands on the tab achTab() names: Showed up on Customise unlocks, Clean · Sprint · Two on Achievements, each row flashed')
      : bad('L.4c where {ach} lands', JSON.stringify(route));
  }

  /* ---- 4. L.2 + L.4d: every label white until earned and green once, on all three tabs, never red; an earned middle-tab row opens
     Customise with its item picked out (not applied); an unearned one still goes to play it ---- */
  {
    const flat = css39.replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = { red: /em\.u\{/.test(flat), cueOnLabel: /\.(?:ach|unl)[^{}]*\bem[^{}]*\{[^}]*var\(--(?:cue|miss)\)/.test(flat), cls: /\?'u':''/.test(prog39) };
    (!rule.red && !rule.cueOnLabel && !rule.cls)
      ? ok('L.2 the build-8 red label rule (.ach .lock em.u in --cue) is gone, and no Progress label rule reads a red') : bad('L.2 a red label rule is left', JSON.stringify(rule));
    // AMENDED at build 40 (v23 L.11a): an earned middle-tab row opens Customise only once the Games chest is open, so this profile has it
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN39, chests: { games: 1 } }, runs: [{ t: NOW39, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 9, misses: 0 }], ach: { first: NOW39, qt_bclean5: NOW39 }, unlock: { 'quick-tap:four': NOW39 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const lab = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      for (const [t, s] of [['unl', '#unl-list .urow'], ['cul', '#cul-list .a'], ['ach', '#achlist .a']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(1800);
        out[t] = [...document.querySelectorAll(s)].map(b => ({ id: b.dataset.ach || b.dataset.d || 'key', done: b.classList.contains('done'), cols: [...b.querySelectorAll(':scope > .rw, :scope > em')].map(e => getComputedStyle(e).color) })); }
      return out; });
    const judge = rows => { const wrong = rows.filter(r => !r.cols.length || r.cols.some(c => c !== (r.done ? OK39 : INK39))); return { n: rows.length, done: rows.filter(r => r.done).length, wrong: wrong.length, sample: wrong[0] }; };
    const J = { unl: judge(lab.unl), cul: judge(lab.cul), ach: judge(lab.ach) };
    const reds = Object.values(lab).flat().flatMap(r => r.cols).filter(c => RED39.includes(c)).length;
    (['unl', 'cul', 'ach'].every(t => J[t].n && J[t].done && J[t].done < J[t].n && !J[t].wrong) && !reds)
      ? ok(`L.2 every label is white until earned and green once, on all three tabs - Game unlocks ${J.unl.done}/${J.unl.n}, Customise unlocks ${J.cul.done}/${J.cul.n}, Achievements ${J.ach.done}/${J.ach.n} earned - and not one is red`)
      : bad('L.2 the label colours', JSON.stringify({ J, reds }));
    const nav = await page.evaluate(async () => { const R = await import('./ui/router.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const on = () => (document.querySelector('.screen.on') || {}).id;
      const open = async id => { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: 'cul' }); await wait(500); document.getElementById('cul-' + id)?.click(); await wait(500); };
      const out = {};
      await open('first');
      out.first = { screen: on(), ring: !!document.querySelector('#c-sq button[data-v="#FFE9C4"].pvw'), applied: Object.values(S.prefs.col || {}).some(c => c && c.sq === '#FFE9C4') };
      S.store.ach.dt_pin = Date.now(); S.save(); await open('dt_pin');
      out.game = { screen: on(), g: document.getElementById('pv').dataset.g, ring: !!document.querySelector('#c-sq button[data-v="#FFD1DC"].pvw') };
      S.store.ach.every = Date.now(); S.save(); await open('every');
      out.lead = { screen: on(), g: document.getElementById('pv').dataset.g, shown: document.getElementById('g-lead').style.display !== 'none', ring: !!document.querySelector('#c-lead button[data-v="#FFB020"].pvw') };
      await open('dt_sweep');
      out.unearned = { screen: on(), box: document.getElementById('lockwrap').classList.contains('on') };
      return out; });
    if (nav.unearned.box) { await click('#lock-no'); await sleep(300); }
    (nav.first.screen === 's-custom' && nav.first.ring && !nav.first.applied && nav.game.screen === 's-custom' && nav.game.g === 'dots' && nav.game.ring)
      ? ok(`L.4d an earned row opens Customise with its item ringed - Showed up's target colour picked out and NOT applied, Pinpoint previewed on its own game (${nav.game.g})`)
      : bad('L.4d an earned row goes to Customise', JSON.stringify(nav));
    (nav.lead.screen === 's-custom' && nav.lead.shown && nav.lead.ring)
      ? ok(`L.4d Every game's lead colour is shown on a game that has a lead row (${nav.lead.g}) - the build-38 tab scrolled to a hidden row there`)
      : bad('L.4d a payout into a hidden group', JSON.stringify(nav.lead));
    (nav.unearned.screen === 's-pick' || (nav.unearned.screen === 's-prog' && nav.unearned.box))
      ? ok(`L.4d an unearned row still goes to play it - Sweep ${nav.unearned.box ? 'asks the lock box, Dots being locked on this profile' : 'opens its sheet'}`)
      : bad('L.4d an unearned row', JSON.stringify(nav.unearned));
  }

  /* ---- 5. L.5: the build stamp never sits on the last thing a scrolling screen holds. Every scroller ends with --stampclear of
     space; each is scrolled to the bottom and its last control measured against the stamp ---- */
  {
    const flat = css39.replace(/\/\*[\s\S]*?\*\//g, '');
    const autos = [...flat.matchAll(/(?:^|\})\s*([^{}@]+?)\s*\{[^}]*overflow-y:auto/g)].flatMap(m => m[1].split(',').map(s => s.trim()));
    const spacer = ((flat.match(/([^{}]+)\{content:"";display:block;flex:none;height:var\(--stampclear\)\}/) || [])[1] || '').split(',').map(s => s.trim());
    const bare = autos.filter(s => s !== '.otwrap' && !spacer.includes(s + '::after'));
    (/--stampclear:calc\(var\(--stampat\) \+ var\(--stamp\) \+ 16px\)/.test(flat) && /#build\{[^}]*bottom:var\(--stampat\)[^}]*font:500 var\(--stamp\)\/1/.test(flat) && autos.length && !bare.length)
      ? ok(`L.5 every overflow-y:auto scroller ends with the stamp's offset + height + a 16px line of space (${autos.filter(s => s !== '.otwrap').join(', ')}); .otwrap, the result's fixed top-10 box mid-screen, is left out`)
      : bad('L.5 a scroller without the stamp clearance', JSON.stringify({ autos, bare, spacer }));
    const runs = Array.from({ length: 10 }, (_, i) => ({ t: NOW39 - i * 1000, g: 'quick-tap', d: 'two', s: 5, n: 'AIDEN', v: 4, hits: 10 + i, misses: 0 }));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1, name: 'AIDEN', keySeen: 1 }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const st = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const stamp = document.getElementById('build').getBoundingClientRect();
      const one = async (label, screen, opts, sel, prep, lastSel) => { R.show('s-menu'); await wait(120); R.show(screen, opts); await wait(900); if (prep) { prep(); await wait(700); }
        const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return { label, none: 1 };
        const oy = getComputedStyle(el).overflowY, scrolls = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
        el.scrollTop = el.scrollHeight; await wait(300);
        const kids = [...el.children].filter(c => c.getClientRects().length && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
        const last = lastSel ? document.querySelector(lastSel) : kids[kids.length - 1];
        const lb = last ? last.getBoundingClientRect().bottom : 0, eb = el.getBoundingClientRect().bottom, vis = Math.min(lb, eb);
        return { label, scrolls, bottom: Math.round(vis), clear: vis <= stamp.top, last: last ? (last.id ? '#' + last.id : String(last.className || last.tagName)) : null }; };
      const out = [];
      for (const g of ['quick-tap', 'dots', 'hold', 'sequence', 'timing']) out.push(await one('Customise · ' + g, 's-custom', { g }, '#s-custom'));
      out.push(await one('Progress · Game unlocks', 's-prog', { tab: 'unl' }, '#unl-list'));
      out.push(await one('Progress · Customise unlocks', 's-prog', { tab: 'cul' }, '#cul-list'));
      out.push(await one('Progress · Achievements', 's-prog', { tab: 'ach' }, '#achlist'));
      out.push(await one('Scores', 's-board', {}, '#s-board .scroll'));
      out.push(await one('Keys · Quick Tap open', 's-key', {}, '#key-list', () => document.querySelector('.knode[data-kg="quick-tap"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
      out.push(await one('Game select · Quick Tap sheet', 's-pick', { g: 'quick-tap', d: 'two' }, '#s-pick', null, '#go-btn'));
      out.push(await one('About', 's-about', {}, '#s-about'));
      out.push(await one('Testing', 's-testing', {}, '#s-testing'));
      R.show('s-menu'); return { top: Math.round(stamp.top), out }; });
    const under = st.out.filter(r => !r.none && !r.clear), none = st.out.filter(r => r.none).map(r => r.label);
    console.log('       L.5 measured: ' + st.out.map(r => r.none ? `${r.label} (not drawn)` : `${r.label} ${r.scrolls ? 'SCROLLS' : 'fits'} ${r.bottom}px`).join(' | '));
    (!under.length)
      ? ok(`L.5 scrolled to the bottom, nothing ends under the stamp (its top at ${st.top}px). Scrolls at 390x844: ${st.out.filter(r => r.scrolls).map(r => r.label).join(', ') || 'none'}${none.length ? '; not drawn: ' + none.join(', ') : ''}`)
      : bad('L.5 the stamp covers a last control', JSON.stringify({ top: st.top, under }));
  }
}

/* ---- 20. build 40 (batch 16, four chests and the 0-400 meter - FEEDBACK-v23 §L.8 a-c f, §L.10 a-c e, §L.11 a c, §L.12, G.8 extended) ---- */
console.log('\nbuild 40 - batch 16, four chests and the meter');
{
  const root40 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read40 = (...p) => fs.readFileSync(path.join(root40, ...p), 'utf8');
  const strip40 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const NOW40 = Date.now();
  const PLAIN40 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {} };
  const CH40 = await import(pathToFileURL(path.join(root40, 'config', 'chests.js')).href);
  const U40 = await import(pathToFileURL(path.join(root40, 'config', 'unlocks.js')).href);
  const KB40 = await import(pathToFileURL(path.join(root40, 'config', 'key-bars.js')).href);
  const ALL_UNLOCK = Object.fromEntries(U40.UNLOCKS.map(x => [x.key, NOW40]));
  const KEY1_BARS = Object.fromEntries(Object.keys(KB40.KEY_BARS).map(k => [k, NOW40]));
  // the build-32 block's svgClick is scoped to that block: an SVG element takes a dispatched click, not .click()
  const svgClick = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);
  const boot40 = async (prefs, extra = {}) => { await setStorage({ ne: Object.assign({ v: 5, prefs: { ...PLAIN40, ...prefs }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} }, extra) }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(450); };

  /* ---- 1. L.10: FOUR chests, named by what opens them, in one config beside config/key-bars.js; G.3's gate, both asks and frontPct are gone ---- */
  {
    const cfg = read40('config', 'chests.js');
    const ids = CH40.CHESTS.map(c => c.id).join(), needs = CH40.CHESTS.map(c => c.needs).join(), opens = CH40.CHESTS.map(c => c.opens).join();
    const a2 = !/^\s*import\b/m.test(cfg) && !/=>|\bfunction\b/.test(strip40(cfg));
    const code = ['index.html', 'progress/key.js', 'ui/screens/pick.js', 'ui/screens/key.js', 'ui/screens/menu.js', 'ui/screens/testing.js', 'ui/screens/customise.js', 'ui/screens/progress.js', 'config/copy.js', 'styles/app.css']
      .map(f => [f, strip40(read40(...f.split('/')))]);
    const numbered = code.filter(([, s]) => /\bchest[123]\b|data-chest="\d|\bchestN\b/.test(s)).map(([f]) => f);
    const gate = code.filter(([, s]) => /glgate|gateState|gateOff|\.gated\b|unlock all games first|askPro|askBox|askwrap|proAsk|openAsk|frontPct|prefs\.pro\b|mapOpen/i.test(s)).map(([f]) => f);
    (ids === 'games,key,pro,thorns' && needs === 'modes,clear,pro,author' && opens === 'clear,pro,author,' && a2 && !numbered.length && !gate.length)
      ? ok(`L.10 four chests in config/chests.js - ${ids} - needing ${needs} and revealing clear, pro, author and nothing; data only (A2); no chest is numbered anywhere in the app, and G.3's gate, both asks and frontPct are gone`)
      : bad('L.10 the four chests', JSON.stringify({ ids, needs, opens, a2, numbered, gate }));
  }

  /* ---- 2. L.10e: strictly sequential - no chest ready while the one before it is shut - and opening Games reveals exactly key 1 ---- */
  {
    await boot40({});
    const sq = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const C = await import('./config/chests.js');
      const ids = C.CHESTS.map(c => c.id), bad = []; let n = 0;
      for (let mask = 0; mask < 16; mask++) for (let modes = 0; modes < 2; modes++) for (let whole = 0; whole < 8; whole++) { n++;
        S.prefs.chests = Object.fromEntries(ids.map((id, i) => [id, (mask >> i) & 1]));
        S.store.unlock = modes ? Object.assign({}, ALL) : {};
        S.store.bars = {}; K.TIERS.forEach((t, i) => { if ((whole >> i) & 1) for (const c of K.COMBOS) S.store.bars[K.skey(c.key, t)] = 1; });
        ids.forEach((id, i) => { const s = K.chestState(id), prevShut = i > 0 && !S.prefs.chests[ids[i - 1]];
          if (s === 'ready' && prevShut) bad.push({ mask, modes, whole, id, why: 'ready behind a shut chest' });
          if (!S.prefs.chests[id] && prevShut && s !== 'before') bad.push({ mask, modes, whole, id, why: s }); }); }
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.store.bars = {}; S.save(); return { n, bad: bad.slice(0, 3), count: bad.length }; }, ALL_UNLOCK);
    (!sq.count && sq.n === 256) ? ok(`L.10e strictly sequential: across ${sq.n} states of opened chests, modes and whole keys, no chest is ever ready while the chest before it is shut`) : bad('L.10e the chests are sequential', JSON.stringify(sq));
    const rv = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      // a best AT the Author number on every combination - the hardest of the three, so it beats all three tiers
      S.store.unlock = Object.assign({}, ALL); S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.retro = {};
      S.store.runs = K.COMBOS.map(c => ({ t: Date.now(), g: c.g, d: c.d, s: c.s, n: '', v: 4, hits: K.barOf(c, 'author'), misses: 0 }));
      const before = { state: K.chestState('games'), meter: K.meter(), clear: K.tierOpen('clear') };
      const r = K.openChest('games');
      const bars = Object.keys(S.store.bars);
      const out = { before, r: r && { was: r.was, now: r.now, fresh: r.fresh.length }, bare: bars.filter(k => !k.includes('|')).length, tiered: bars.filter(k => k.includes('|')).length,
        retroBare: Object.keys(S.prefs.retro || {}).every(k => !k.includes('|')), again: K.openChest('games'), total: K.COMBOS.length, key: K.chestState('key') };
      S.store.runs = []; S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.retro = {}; S.store.unlock = {}; S.save(); return out; }, ALL_UNLOCK);
    (rv.before.state === 'ready' && !rv.before.clear && rv.before.meter === 100 && rv.r && rv.r.was === 100 && rv.r.now === 200 && rv.bare === rv.total && !rv.tiered && rv.retroBare && rv.again === null && rv.key === 'ready')
      ? ok(`L.10e opening the Games chest reveals exactly key 1: all ${rv.bare} key-1 bars a saved best beats bank silently and nothing on Pro or Author does; the meter goes ${rv.r.was} -> ${rv.r.now}, the Key chest is ready, a second open does nothing`)
      : bad('L.10e what the Games chest reveals', JSON.stringify(rv));
  }

  /* ---- 3. L.8a / L.10b: ONE meter, 0-400 - modes, then each key's cleared bars - a band counting only once its chest is open ---- */
  {
    const keyjs = strip40(read40('progress', 'key.js')), surf = ['ui/screens/menu.js', 'ui/screens/pick.js', 'ui/screens/key.js'].map(f => strip40(read40(...f.split('/'))));
    (/const meter = \(\) =>/.test(keyjs) && surf.every(s => /\bmeter\(\)/.test(s)) && !surf.some(s => /keyPct\(|frontPct/.test(s)))
      ? ok('L.8a one meter() in progress/key.js, and the menu card, the map chests and the key screen all read it - none reads keyPct or frontPct') : bad('L.8a one meter function');
    const mt = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const U = await import('./config/unlocks.js');
      const set = (chests, unlock, tiers) => { S.prefs.chests = Object.assign({ games: 0, key: 0, pro: 0, thorns: 0 }, chests); S.store.unlock = unlock;
        S.store.bars = {}; for (const t of tiers) for (const c of K.COMBOS) S.store.bars[K.skey(c.key, t)] = 1; return K.meter(); };
      const all = ['clear', 'pro', 'author'], mode = U.UNLOCKS.find(x => x.key !== 'sequence:practice' && x.key.split(':').length === 2).key;
      const out = { fresh: set({}, {}, []), oneMode: set({}, { [mode]: 1 }, []), everyMode: set({}, Object.assign({}, ALL), []),
        noGames: set({}, Object.assign({}, ALL), all), noKey: set({ games: 1 }, Object.assign({}, ALL), all), noPro: set({ games: 1, key: 1 }, Object.assign({}, ALL), all),
        noThorns: set({ games: 1, key: 1, pro: 1 }, Object.assign({}, ALL), all), full: set({ games: 1, key: 1, pro: 1, thorns: 1 }, Object.assign({}, ALL), all), max: K.meterMax() };
      set({ games: 1 }, Object.assign({}, ALL), []); K.COMBOS.slice(0, K.COMBOS.length / 2).forEach(c => { S.store.bars[c.key] = 1; }); out.half = K.meter();
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.store.bars = {}; S.save(); return out; }, ALL_UNLOCK);
    (mt.fresh === 0 && mt.oneMode === 8 && mt.everyMode === 100 && mt.noGames === 100 && mt.noKey === 200 && mt.noPro === 300 && mt.noThorns === 400 && mt.full === 400 && mt.half === 150 && mt.max === 400)
      ? ok(`L.8a / L.10b the meter: a new profile ${mt.fresh}%, one mode past the start ${mt.oneMode}% (§M.4), every mode ${mt.everyMode}; with every bar on every key banked underneath it still reads ${mt.noGames} before the Games chest and ${mt.noKey} before the Key chest (never past either), ${mt.noPro} before the Pro chest and ${mt.noThorns} past it; half of key 1 is ${mt.half}`)
      : bad('L.8a the meter', JSON.stringify(mt));
  }

  /* ---- 4. L.8b: a chest's tap opens its screen and the open happens THERE by itself - no ask - then no repeat; L.11c its words beside it ---- */
  {
    const runs = Object.keys(KB40.KEY_BARS).slice(0, 5).map(k => { const [g, d, s] = k.split(':'); return { t: NOW40, g, d, s: +s, n: '', v: 4, hits: KB40.KEY_BARS[k].author, misses: 0 }; });
    await boot40({}, { unlock: ALL_UNLOCK, runs });
    await click('[data-go="s-pick"]'); await sleep(700);
    const map = await page.evaluate(() => { const c = id => document.querySelector(`.chest[data-chest="${id}"]`);
      return { games: c('games').className, need: c('games').querySelector('.pic').dataset.need, key: c('key').querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap'), words: document.querySelector('.chestwords[data-for="games"]').hidden }; });
    // AMENDED at build 41 (v23 L.6): the chest's sound is Snd.chest and never unlockFx; the open is its ceremony, ~3s after the 600ms open, held on "tap to continue"
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__fx40 = 0; window.__un40 = 0; const o = A.Snd.chest, u = A.Snd.unlockFx;
      A.Snd.chest = function () { window.__fx40++; return o.apply(this, arguments); }; A.Snd.unlockFx = function () { window.__un40++; return u.apply(this, arguments); }; });
    await click('.chest[data-chest="games"]'); await sleep(250);
    const onKey = await onScreen();
    await sleep(3700);
    const opened = await page.evaluate(async () => { const K = await import('./progress/key.js'); const ne = JSON.parse(localStorage.getItem('ne')); const box = document.getElementById('key-cere');
      return { games: ne.prefs.chests.games, shown: !box.hidden, tap: box.classList.contains('tap'), txt: box.innerText.replace(/\s+/g, ' ').trim(), meterTxt: (box.querySelector('.meterv') || {}).textContent, meter: K.meter(), seen: ne.prefs.meterSeen, total: K.COMBOS.length,
        bare: Object.keys(ne.bars).filter(k => !k.includes('|')).length, fx: window.__un40 ? -window.__un40 : window.__fx40, toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }; });
    await click('#key-cere'); await sleep(700); opened.map = await onScreen();
    await click('#s-pick .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(1400);
    const again = await page.evaluate(() => ({ shown: !document.getElementById('key-cere').hidden, fx: window.__fx40 }));
    await click('#s-key .back'); await sleep(300); await click('[data-go="s-pick"]'); await sleep(700);
    const after = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { cls: c.className, need: c.querySelector('.pic').dataset.need, words: w.hidden ? null : [...w.querySelectorAll('.cw')].map(x => x.firstChild.textContent), wr: +w.style.gridRow, wc: +w.style.gridColumn, cr: +c.style.gridRow, cc: +c.style.gridColumn, key: document.querySelector('.chest[data-chest="key"] .pic').dataset.need, keyWords: document.querySelector('.chestwords[data-for="key"]').hidden }; });
    (/ready/.test(map.games) && map.need === 'tap to open' && map.key === 'open the previous chest' && !map.ask && map.words)
      ? ok('L.8b with every mode unlocked the Games chest is ready on the map - "tap to open" - the Key chest points at the chest before it, nothing stands beside a shut chest, and there is no ask box in the page') : bad('L.8b the ready Games chest', JSON.stringify(map));
    (onKey === 's-key' && opened.games === 1 && opened.shown && opened.tap && /Games chest opened/i.test(opened.txt) && opened.meterTxt === opened.meter + '%' && opened.seen === opened.meter && opened.meter === 100 + Math.floor(100 * opened.bare / opened.total) && opened.bare === 5 && opened.fx === 1 && !opened.toast && opened.map === 's-pick')
      ? ok(`L.8b the tap opened the key screen and the chest opened there by itself: "${opened.txt}" - its ${opened.bare} already-beaten key-1 bars credited silently (G.4 extended), the meter counted up to ${opened.meterTxt} in the ceremony's last beat, one chest sound, no toast, no question; its tap goes to the map (AMENDED at build 41, L.6)`) : bad('L.8b the open on the key screen', JSON.stringify(opened));
    (!again.shown && again.fx === 1) ? ok('L.8b opened is opened: the next visit to the key screen opens nothing and plays nothing') : bad('L.8b no repeat', JSON.stringify(again));
    (/open/.test(after.cls) && after.need === 'opened' && after.words && after.words.join() === 'CUSTOMISE,THE KEY' && after.wr === after.cr && after.wc !== after.cc && after.keyWords && /^\d+% · opens at 200%$/.test(after.key))
      ? ok(`L.11c back on the map the Games chest is open with its words beside it (${after.words.join(' · ')}, row ${after.wr}, col ${after.wc} against the chest's ${after.cc}), and the Key chest reads the meter: "${after.key}"`) : bad('L.11c the opened chest and its words', JSON.stringify(after));
  }

  /* ---- 5. L.8b, both drivers: a result-screen clear that tops key 1 opens the Key chest inside the interlude and hands back on time ---- */
  {
    const bars = Object.assign({}, KEY1_BARS); delete bars['quick-tap:two:5'];
    await boot40({ chests: { games: 1 }, adRuns: 0 }, { unlock: ALL_UNLOCK, bars });
    const il = await page.evaluate(async () => { const E = await import('./core/events.js'); const ST = await import('./core/state.js'); const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const at = () => (document.querySelector('.screen.on') || {}).id;
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5'); const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: c.bar.bar + 3, misses: 0, n: '', v: 4 };
      const before = K.chestState('key'); const adv = K.checkKey(run, false); if (!adv) return { err: 'no clear' };
      const ready = K.chestState('key');
      E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
      /* AMENDED at build 41 (v23 L.6): the open is the Key chest's CEREMONY, which is not skippable and holds on "tap to continue" - so the result
         does NOT come back on its own; the tap brings it back, and both drivers answer it (the gate here, catalogue.mjs cereTap) */
      await wait(4300); const A = await import('./audio.js'); const mid = { screen: at(), key: S.prefs.chests.key, box: !document.getElementById('key-cere').hidden, hushed: A.Music.probe().hushed };
      await wait(1500); const held = at();
      for (let i = 0; i < 40 && !document.getElementById('key-cere').classList.contains('tap'); i++) await wait(150);
      const tappable = document.getElementById('key-cere').classList.contains('tap');
      document.getElementById('key-cere').click(); await wait(700);
      return { err: null, before, ready, mid, held, tappable, back: at(), key: S.prefs.chests.key, pro: K.tierOpen('pro') }; });
    if (il.err) bad('L.8b the interlude', il.err);
    else (il.before === 'locked' && il.ready === 'ready' && il.mid.screen === 's-key' && il.mid.key === 1 && il.mid.box && il.mid.hushed && il.held === 's-key' && il.tappable && il.back === 's-over' && il.key === 1 && il.pro)
      ? ok('L.8b / L.6 a live clear that makes key 1 whole interrupts the result as always, the Key chest opens on the key screen inside the interlude as its ceremony - Pro revealed, the music hushed - and the result waits for "tap to continue" and comes back on that tap (AMENDED at build 41)')
      : bad('L.8b the chest opening inside the interlude', JSON.stringify(il));
  }

  /* ---- 6. L.11a: Customise locked until the Games chest - crossed out, "open the Games chest", defaults applied, choices kept; green until first opened ---- */
  {
    await boot40({ col: { 'quick-tap': { sq: '#FFD1DC', lead: '#FFB020', cut: '#FFD1DC' } }, bg: 'grid', snd: 'wood', lastGame: 'quick-tap' }, { ach: { first: NOW40 } });
    const lk = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const T = await import('./ui/theme.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const root = () => getComputedStyle(document.documentElement).getPropertyValue('--sq-live').trim().toUpperCase(), on = () => (document.querySelector('.screen.on') || {}).id;
      const item = () => document.querySelector('[data-go="s-custom"]'), need = () => document.getElementById('cus-need');
      R.show('s-menu'); await wait(300);
      const out = { locked: { cls: item().className, need: need().hidden ? '' : need().textContent, x: getComputedStyle(item(), '::after').content, sq: root(), snd: S.look('snd'), bg: S.look('bg'), kept: S.prefs.col['quick-tap'].sq + ' ' + S.prefs.bg + ' ' + S.prefs.snd } };
      item().click(); await wait(250); out.locked.screen = on(); out.locked.toast = document.getElementById('toast').textContent.trim();
      R.show('s-prog', { tab: 'cul' }); await wait(500); out.cul = { hint: document.getElementById('cul-hint').textContent, earned: !!document.querySelector('#cul-first.done') };
      document.getElementById('cul-first').click(); await wait(300); out.cul.screen = on();
      S.prefs.chests = Object.assign({}, S.prefs.chests, { games: 1 }); S.save(); T.applyPrefs('quick-tap');
      R.show('s-menu'); await wait(300);
      out.open = { cls: item().className, need: need().hidden, sq: root(), snd: S.look('snd'), bg: S.look('bg'), unx: item().classList.contains('unx') };
      R.show('s-prog', { tab: 'cul' }); await wait(400); out.open.hint = document.getElementById('cul-hint').textContent;
      R.show('s-menu'); await wait(200); item().click(); await wait(700);
      out.opened = { screen: on(), seen: S.prefs.cusSeen, green: !!document.querySelector('#c-sq .newthing') };
      R.show('s-menu'); await wait(300); out.opened.after = item().classList.contains('newthing');
      return out; });
    const L = lk.locked, O = lk.open;
    (/cuslock/.test(L.cls) && L.need === 'open the Games chest' && L.x !== 'none' && L.screen === 's-menu' && /Games chest/.test(L.toast))
      ? ok(`L.11a before the Games chest Customise is crossed out with "${L.need}" under it, and a tap says so and stays on the menu`) : bad('L.11a the locked Customise row', JSON.stringify(L));
    (L.sq === '#FFFFFF' && L.snd === 'space' && L.bg === 'stars' && L.kept === '#FFD1DC grid wood')
      ? ok('L.11a meanwhile the defaults apply - white target, the stock background, the default tap sound - and every stored choice is kept, not applied') : bad('L.11a the defaults', JSON.stringify(L));
    (lk.cul.hint === 'open the Games chest to use them' && lk.cul.earned && lk.cul.screen === 's-prog' && O.hint === 'tap an earned one to use it')
      ? ok('L.11a the Customise unlocks tab is not gated: an achievement earned before the chest is there and green, the tab says "open the Games chest to use them", and a tap on it does not open a locked screen') : bad('L.11a the Customise unlocks tab', JSON.stringify({ cul: lk.cul, hint: O.hint }));
    (!/cuslock/.test(O.cls) && /newthing/.test(O.cls) && O.need && O.sq === '#FFD1DC' && O.snd === 'wood' && O.bg === 'grid' && O.unx)
      ? ok('L.11a with the Games chest open the strike wipes off, the row is green until first opened (L8 / D.5), and the choices made before apply the moment it opens') : bad('L.11a Customise once the chest is open', JSON.stringify(O));
    (lk.opened.screen === 's-custom' && lk.opened.seen === 1 && !lk.opened.after && lk.opened.green)
      ? ok('L.11a opening Customise spends the green on the menu row, and a colour earned while it was locked is first-seen green there') : bad('L.11a the first open of Customise', JSON.stringify(lk.opened));
  }

  /* ---- 7. L.12: a whole key taps through to its chest on the map - one exported predicate, no chest read on the key screen (A4) ---- */
  {
    const keyScr = strip40(read40('ui', 'screens', 'key.js'));
    (/export \{[^}]*\bkeyChest\b/.test(read40('progress', 'key.js')) && /keyChest\(/.test(keyScr) && !/prefs\.chests|prefs\[['"]chest|store\.unlock/.test(keyScr))
      ? ok('L.12 keyChest() is the one exported predicate, and the key screen reads no chest flag of its own (A4)') : bad('L.12 one predicate');
    await boot40({ chests: { games: 1, key: 1 } }, { unlock: ALL_UNLOCK, bars: KEY1_BARS });
    await click('[data-go="s-key"]'); await sleep(900);
    const k12 = await page.evaluate(() => ({ hub: (document.querySelector('#key-ring [data-act="key-chest"]') || {}).dataset?.chest || null, hint: document.getElementById('key-hint').textContent }));
    await svgClick('#key-ring [data-act="key-chest"]'); await sleep(700);
    const map12 = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, flash: c.classList.contains('flash'), open: c.classList.contains('open') }; });
    const none = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS[0]; delete S.store.bars[c.key]; S.save(); R.show('s-menu'); await wait(100); R.show('s-key'); await wait(700);
      const out = { hub: !!document.querySelector('#key-ring [data-act="key-chest"]'), pred: K.keyChest('clear') }; S.store.bars[c.key] = 1; S.save(); return out; });
    (k12.hub === 'key' && /tap the key/.test(k12.hint) && map12.screen === 's-pick' && map12.flash && map12.open && !none.hub && none.pred === null)
      ? ok(`L.12 a whole key 1 whose chest is open is a tap target ("${k12.hint}") that lands on the map with the Key chest in view, lid up; a key still in progress is not one`) : bad('L.12 the key taps through to its chest', JSON.stringify({ k12, map12, none }));
  }

  /* ---- 8. L.8f + G.8 extended: Testing's switch and reset PER CHEST, four of each, and "set meter to N%" (S5) ---- */
  {
    await boot40({}, { bars: { 'quick-tap:two:5': NOW40 } });
    await click('[data-go="s-testing"]'); await sleep(400);
    const t8 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const q = s => document.querySelector(s);
      const sw = id => q(`[data-act="dev-chestall"][data-chest="${id}"]`), rs = id => q(`[data-act="dev-chestreset"][data-chest="${id}"]`);
      const out = { m0: K.meter() };
      sw('games').click(); await wait(200); out.games = { meter: K.meter(), state: K.chestState('games'), sel: sw('games').classList.contains('sel') };
      sw('games').click(); await wait(200); out.gamesOff = { meter: K.meter(), unlock: Object.keys(S.store.unlock).length };
      sw('games').click(); await wait(150); S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save();
      sw('key').click(); await wait(200); out.key = { meter: K.meter(), state: K.chestState('key') };
      sw('key').click(); await wait(200); out.keyOff = { bars: Object.keys(S.store.bars).join() };
      S.prefs.chests = Object.assign({}, S.prefs.chests, { key: 1 }); S.store.ach.key_clear_all = Date.now(); S.save();
      rs('key').click(); await wait(200); out.keyReset = { chest: S.prefs.chests.key, bars: Object.keys(S.store.bars).length, ach: !!S.store.ach.key_clear_all };
      rs('games').click(); await wait(200); out.gamesReset = { chest: S.prefs.chests.games, unlock: Object.keys(S.store.unlock).filter(k => k !== 'sequence:practice' && k.split(':').length === 2).length, snap: !!(S.prefs.devKeys || {}).games };
      q('#dev-meter').value = '250'; q('[data-act="dev-meter"]').click(); await wait(200); out.set = { meter: K.meter(), line: q('#dev-meter-now').textContent, stored: JSON.parse(localStorage.getItem('ne')).prefs.devMeter };
      q('[data-act="dev-meteroff"]').click(); await wait(200); out.off = { meter: K.meter(), stored: JSON.parse(localStorage.getItem('ne')).prefs.devMeter };
      return out; });
    (t8.m0 === 0 && t8.games.meter === 100 && t8.games.state === 'ready' && t8.games.sel && t8.gamesOff.meter === 0 && t8.gamesOff.unlock === 0 && t8.key.meter === 200 && t8.key.state === 'ready' && t8.keyOff.bars === 'quick-tap:two:5')
      ? ok('L.8f the Games chest\'s switch takes the meter to 100 and the chest to ready, the Key chest\'s to 200; each switch off puts back exactly what the profile held') : bad('L.8f the per-chest switches', JSON.stringify(t8));
    (t8.keyReset.chest === 0 && !t8.keyReset.bars && !t8.keyReset.ach && t8.gamesReset.chest === 0 && !t8.gamesReset.unlock && !t8.gamesReset.snap)
      ? ok('G.8 extended: resetting the Key chest backs out key 1, the chest and its achievements; resetting the Games chest locks every mode again and shuts it') : bad('G.8 the per-chest resets', JSON.stringify({ keyReset: t8.keyReset, gamesReset: t8.gamesReset }));
    (t8.set.meter === 250 && /250%/.test(t8.set.line) && t8.set.stored === 250 && t8.off.meter === 0 && t8.off.stored === undefined)
      ? ok(`L.8f "set meter to N%" makes the meter read 250 for review ("${t8.set.line}") with nothing earned, and taking it off reads what the profile holds again`) : bad('L.8f set meter to N%', JSON.stringify({ set: t8.set, off: t8.off }));
  }

  /* ---- 9. the store is v5: the chests named, one ladder step; the retired fields gone ---- */
  {
    const st9 = read40('core', 'store.js');
    (/VERSION=5/.test(st9) && /if\(\(raw\.v\|\|0\)<5\) raw=up5\(raw\);/.test(st9) && /chests:cleanChests\(p\.chests\)/.test(st9) && !/\bpro:\[0,1,2\]|chest1:p\.chest1|gateOff:p\.gateOff|pctSeen:isObj/.test(st9))
      ? ok('store v5: up5 on the ladder, `chests` shape-checked by name, and `pro`, `chest1`-`chest3`, `gateOff` and `pctSeen` no longer read') : bad('store v5 statics');
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN40, chest1: 1, chest2: 1, chest3: 0, pro: 1, gateOff: 1, pctSeen: { clear: 40 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const mg = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { v: ne.v, chests: ne.prefs.chests, gone: ['chest1', 'chest2', 'chest3', 'pro', 'gateOff', 'pctSeen'].filter(k => k in ne.prefs) }; });
    (mg.v === 5 && JSON.stringify(mg.chests) === '{"games":1,"key":1,"pro":1,"thorns":0}' && !mg.gone.length)
      ? ok('store v5: a v4 record with chest 1 and chest 2 open loads with the Games, Key and Pro chests open - Games too, because chest 1 already waited for every mode (G.3) - and the retired fields dropped') : bad('store v5 migration', JSON.stringify(mg));
  }

  /* ---- 10. L.10a / §M.2: key 1 is quiet before the Games chest - no clear banked, no interlude, no outline fill, no key set, the modes count on the key screen ---- */
  {
    await boot40({}, { runs: [{ t: NOW40, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }] });
    const qt = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5');
      const out = { adv: K.checkKey({ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: c.bar.bar + 5, misses: 0 }, false), bars: Object.keys(S.store.bars).length, ach: K.checkKeyAch({ g: 'quick-tap' }).length };
      S.store.bars['quick-tap:two:5'] = 1; S.save();   // even a clear banked before build 40 shows nothing until the chest
      R.show('s-pick'); await wait(600); const t = document.querySelector('.tile[data-game="quick-tap"]'); out.fill = { part: t.classList.contains('kpart'), kf: t.querySelector('.kfill').style.getPropertyValue('--kf') };
      R.show('s-key'); await wait(600); out.key = { main: document.getElementById('key-main').hidden, shell: document.getElementById('key-shell').innerText.replace(/\s+/g, ' ').trim(), locked: document.querySelectorAll('#key-keys .kkey.locked').length, digits: [...document.querySelectorAll('#key-keys .kkey')].some(b => /\d/.test(b.textContent)) };
      R.show('s-prog', { tab: 'ach' }); await wait(500); out.sets = [...document.querySelectorAll('#achlist h4')].map(h => h.className).filter(x => /^key/.test(x)).join();
      S.store.bars = {}; S.save(); return out; });
    (qt.adv === null && !qt.bars && !qt.ach && !qt.fill.part && qt.fill.kf === '0.000' && qt.key.main && /1 of 13 modes · 0%/.test(qt.key.shell) && qt.key.locked === 3 && !qt.key.digits && !qt.sets)
      ? ok(`L.10a / §M.2 before the Games chest key 1 is quiet: a run past a bar banks nothing and hands back no interlude, the tile outline stays empty, no key set is listed, and the key screen says only "${qt.key.shell.slice(0, 70)}…"`) : bad('L.10a key 1 quiet before the Games chest', JSON.stringify(qt));
  }
}

/* ---- 21. build 41 (batch 16, the moments - FEEDBACK-v23 §L.6, §L.8 d-e, §L.9 a-d, §L.10 d, §L.11 b d e). Presentation only, L10 quoted ---- */
console.log('\nbuild 41 - batch 16, the moments');
{
  const root41 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read41 = (...p) => fs.readFileSync(path.join(root41, ...p), 'utf8');
  const strip41 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const NOW41 = Date.now();
  const PLAIN41 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {} };
  const CH41 = await import(pathToFileURL(path.join(root41, 'config', 'chests.js')).href);
  const AU41 = await import(pathToFileURL(path.join(root41, 'config', 'audio.js')).href);
  const U41 = await import(pathToFileURL(path.join(root41, 'config', 'unlocks.js')).href);
  const KB41 = await import(pathToFileURL(path.join(root41, 'config', 'key-bars.js')).href);
  const ALL41 = Object.fromEntries(U41.UNLOCKS.map(x => [x.key, NOW41]));
  const tierBars = t => Object.fromEntries(Object.keys(KB41.KEY_BARS).map(k => [t === 'clear' ? k : `${k}|${t}`, NOW41]));
  const IDS = ['games', 'key', 'pro', 'thorns'];
  const boot41 = async (prefs, extra = {}) => { await setStorage({ ne: Object.assign({ v: 5, prefs: { ...PLAIN41, ...prefs }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} }, extra) }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(450); };
  const scr = () => page.evaluate(() => (document.querySelector('.screen.on') || {}).id);

  /* ---- 1. L.9a / L.10d: four sprites in one data config, one renderer for every surface, no art left in the markup; L10 - the two new modules write nothing ---- */
  {
    const L = CH41.CHEST_LOOK, B = CH41.METER_BANDS;
    const sig = id => JSON.stringify([L[id].box, L[id].lid, L[id].fit || [], L[id].spikes || [], L[id].boxSpikes || [], L[id].stroke, L[id].fill]);
    const distinct = new Set(IDS.map(sig)).size === 4;
    const looks = L.games.stroke === 'var(--mute)' && L.games.fill === 'none' && L.games.sw <= 1
      && L.key.stroke === 'var(--ink)' && !(L.key.fit || []).length && !(L.key.spikes || []).length
      && (L.pro.fit || []).length >= 4 && L.pro.lidSw > L.key.lidSw && L.pro.lid.length > L.key.lid.length && B[L.pro.band].col === L.pro.stroke
      && L.thorns.fill === '#000000' && L.thorns.stroke === '#FFFFFF' && (L.thorns.spikes || []).length >= 3 && (L.thorns.boxSpikes || []).length > 0
      && IDS.every((id, i) => L[id].band === i);
    const idle = IDS.map(id => L[id].idle.kind).join() === 'breath,glow,shimmer,spikes' && L.games.idle.px < L.key.idle.px && L.key.idle.px < L.pro.idle.px && L.pro.idle.px <= L.thorns.idle.px;
    const drawers = ['ui/screens/pick.js', 'ui/screens/key.js', 'ui/ceremony.js'].every(f => /chestSvg\(/.test(strip41(read41(...f.split('/')))));
    const noArt = !/class="chestart"/.test(read41('index.html')) && !/CHEST_ART/.test(strip41(read41('ui', 'screens', 'key.js')));
    const l10 = ['ui/ceremony.js', 'ui/chest.js'].every(f => !/\bsave\(|\bstore\b|\bprefs\b|localStorage/.test(strip41(read41(...f.split('/')))));
    (Object.keys(L).join() === IDS.join() && distinct && looks && idle && drawers && noArt && l10)
      ? ok('L.9a / L.10d four chest sprites in one data config (config/chests.js CHEST_LOOK): Games a thin --mute outline, Key clean --ink lines, Pro gold fittings and a heavier lid, Thorns black with spikes and white accents, each in its own band colour; four idles rising in strength; one renderer (ui/chest.js) draws the map, the key screen and the ceremony, no chest art is left in the markup, and neither new module writes anything (L10)')
      : bad('L.9a the four sprites', JSON.stringify({ keys: Object.keys(L), distinct, looks, idle, drawers, noArt, l10 }));
  }

  /* ---- 2. L.9b: READY animates, locked and opened do not; locked is crossed out, opened is lid up ---- */
  {
    await boot41({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 }, readySeen: { pro: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro')) });
    await click('[data-go="s-pick"]'); await sleep(1400);
    const s9 = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), svg = c.querySelector('.chestart');
      return [id, { cls: ['locked', 'ready', 'open'].filter(k => c.classList.contains(k)).join(), look: svg && svg.dataset.look, run: svg ? svg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName) : null,
        x: svg ? getComputedStyle(svg.querySelector('.xl')).opacity : null, lid: svg ? getComputedStyle(svg.querySelector('.lidg')).rotate : null }]; })));
    (s9.games.cls === 'open' && s9.key.cls === 'open' && s9.pro.cls === 'ready' && s9.thorns.cls === 'locked' && IDS.every(id => s9[id].look === id)
      && !s9.games.run.length && !s9.key.run.length && !s9.thorns.run.length && s9.pro.run.includes('idleglow') && s9.pro.run.includes('idleshim')
      && s9.thorns.x === '1' && s9.games.x === '0' && /-118deg/.test(s9.games.lid) && s9.thorns.lid === 'none')
      ? ok(`L.9b on the map each chest wears its own sprite; the READY Pro chest runs its idle (${[...new Set(s9.pro.run)].join(' + ')}) and nothing else on a chest animates - not the opened Games and Key chests, lid up and still, and not the locked Thorns chest, crossed out`)
      : bad('L.9b the chest states', JSON.stringify(s9));
  }

  /* ---- 3. L.9c: one quiet sound the first time the map paints a chest ready, not on the next visit ---- */
  {
    await boot41({}, { unlock: ALL41 });
    const r9 = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      let n = 0; const o = A.Snd.chestReady; A.Snd.chestReady = function () { n++; return o.apply(this, arguments); };
      R.show('s-pick'); await wait(500); const first = n; R.show('s-menu'); await wait(100); R.show('s-pick'); await wait(500); const second = n;
      const seen = Object.assign({}, S.prefs.readySeen); A.Snd.chestReady = o; return { first, second, seen }; });
    const fx = AU41.CHEST_READY_FX;
    (r9.first === 1 && r9.second === 1 && r9.seen.games === 1 && !r9.seen.key && fx.length === 2 && fx[1][1] > fx[0][1] && fx.every(e => e[1] < 400 && e[5] < 0.085))
      ? ok('L.9c the first time the map paints the Games chest READY it plays one quiet sound - a low two-note rise under the unlock sound\'s level - and the next visit plays nothing') : bad('L.9c the ready sound', JSON.stringify({ r9, fx }));
  }

  /* ---- 4. L.6 / L.10d: the four ceremonies as named steps, their effects and stings, and none of it the unlock or achievement sound ---- */
  {
    const C = CH41.CEREMONY, want = { games: 'uncross,path,lid,chord', key: 'assemble,turn,lid,spill', pro: 'shake,cracks,burst,scatter', thorns: 'black,spikes,split,widen,recede' };
    const names = IDS.every(id => C[id].steps.map(s => s.name).join() === want[id]);
    const lens = IDS.map(id => C[id].ms), rising = lens.every((v, i) => !i || v > lens[i - 1]) && Math.abs(lens[0] - 3000) <= 500 && Math.abs(lens[3] - 6000) <= 500;
    const inside = IDS.every(id => C[id].steps.every(s => s.at >= 0 && s.at + s.ms <= C[id].ms));
    const stingBad = [], end = {};
    for (const id of IDS) { const s = AU41.CHEST_STING[id], tr = s && AU41.TRACKS[s.track]; if (!tr) { stingBad.push(id + ' no theme'); continue; }
      end[id] = Math.max(...s.notes.map(n => n[0] + n[2] / 1000)); if (end[id] < 3 || end[id] > 6.05) stingBad.push(`${id} ${end[id]}s`);
      for (const n of s.notes) { const f = tr.root * 2 * Math.pow(2, n[1] / 12); if (n[2] < 700 || (n[5] || 0) < 40) stingBad.push(`${id} short or hard ${n}`); if (f > 523.3 && n[2] < 1200) stingBad.push(`${id} short high ${Math.round(f)}Hz`); } }
    const themes = IDS.map(id => AU41.CHEST_STING[id].track).join() === 'key:roots,key:roots,key:frost,key:thorn';
    const fxBad = [];
    for (const id of IDS) for (const e of AU41.CHEST_FX[id]) if (e[3] < 250 && e[1] > 400) fxBad.push(`${id} ${e[1]}Hz ${e[3]}ms`);
    const sigFx = id => JSON.stringify((AU41.CHEST_FX[id] || []).map(e => [e[0], e[1], e[4]]));
    const distinct = new Set(IDS.map(sigFx)).size === 4;
    const isUnlock = id => [523.3, 784, 1046.5].every((f, i) => (AU41.CHEST_FX[id] || []).some(e => e[1] === f && Math.abs(e[0] - i * .1) < .01));
    const notVerdict = IDS.every(id => !Object.values(AU41.VERDICT_FX).some(v => JSON.stringify(v) === JSON.stringify(AU41.CHEST_FX[id])));
    const noise = Object.keys(AU41.CHEST_NOISE).join() === 'thorns' && AU41.CHEST_NOISE.thorns.length === 1;
    const keyScr = strip41(read41('ui', 'screens', 'key.js')), cer = strip41(read41('ui', 'ceremony.js')), aud = strip41(read41('audio.js'));
    const block = (aud.match(/chest\(id\)\{[\s\S]*?\n    chestReady/) || [''])[0];
    const code = !/unlockFx/.test(keyScr) && !/unlockFx/.test(cer) && /Snd\.chest\(id\)/.test(cer) && !!block && !/unlockFx|click\(/.test(block);
    (names && rising && inside && !stingBad.length && themes && !fxBad.length && distinct && !IDS.some(isUnlock) && notVerdict && noise && code)
      ? ok(`L.6 / L.10d four ceremonies as named steps in config/chests.js - ${lens.map(v => v / 1000 + 's').join(', ')}, every step inside its ceremony; each chest its own effects and a ${IDS.map(id => end[id].toFixed(1)).join(' / ')}s sting from its key's theme, no note under 700ms and none above C5 under 1200ms; the four effect sets differ from each other, from the unlock sound and from every verdict; one noise cut, Thorns only; the open plays Snd.chest, never unlockFx (the achievement click is untouched, 1.6)`)
      : bad('L.6 the ceremonies and their sounds', JSON.stringify({ names, rising, inside, stingBad: stingBad.slice(0, 4), themes, fxBad, distinct, notVerdict, noise, code }));
  }

  /* ---- 5. L.6 live: a real open - not skippable, music hushed, the steps in order, "tap to continue", then the map and the spill (L.11b) ---- */
  {
    await boot41({}, { unlock: ALL41 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__c41 = []; const o = A.Snd.chest; A.Snd.chest = function (id) { window.__c41.push(id); return o.apply(this, arguments); };
      window.__st41 = []; const h = document.getElementById('key-cere'); new MutationObserver(() => { const s = h.dataset.step; if (s && window.__st41[window.__st41.length - 1] !== s) window.__st41.push(s); }).observe(h, { attributes: true, attributeFilter: ['data-step'] }); });
    await click('.chest[data-chest="games"]'); await sleep(1600);
    const early = await page.evaluate(async () => { const A = await import('./audio.js'); const h = document.getElementById('key-cere'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, tap: h.classList.contains('tap'), hushed: A.Music.probe().hushed, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games };
      h.click(); document.querySelector('#s-key .back').click(); await wait(200);
      out.after = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden }; return out; });
    await sleep(2600);
    const ready = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { tap: h.classList.contains('tap'), txt: h.innerText.replace(/\s+/g, ' ').trim(), steps: window.__st41.slice(), vars: h.getAttribute('style') || '' }; });
    await click('#key-cere'); await sleep(1300);
    const done = await page.evaluate(async () => { const A = await import('./audio.js'); const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { screen: (document.querySelector('.screen.on') || {}).id, hidden: document.getElementById('key-cere').hidden, hushed: A.Music.probe().hushed, chest: window.__c41.slice(), spill: w.classList.contains('spill') && c.classList.contains('spill'),
        spilled: JSON.parse(localStorage.getItem('ne')).prefs.spill.games, words: [...w.querySelectorAll('.cw')].map(x => x.dataset.act + ':' + x.dataset.to).join(), burst: c.querySelectorAll('.pburst i').length }; });
    (early.screen === 's-key' && early.shown && !early.tap && early.hushed && early.stored === 1 && early.after.screen === 's-key' && early.after.shown)
      ? ok('L.6 / L10 a ready Games chest opens on its key screen as its CEREMONY - the chest already stored before a frame plays, the music hushed fully, and neither a tap on it nor Back does anything before the end') : bad('L.6 the ceremony plays and is not skippable', JSON.stringify(early));
    (ready.tap && ready.steps.join() === 'uncross,path,lid,chord,tap' && /GAMES CHEST OPENED/i.test(ready.txt) && /TAP TO CONTINUE/i.test(ready.txt) && /--st-uncross-at:0ms/.test(ready.vars))
      ? ok(`L.6 its named steps play in order off the config's own times (${ready.steps.join(' → ')}) and it holds on "${ready.txt}"`) : bad('L.6 the steps and the reveal', JSON.stringify(ready));
    (done.screen === 's-pick' && done.hidden && !done.hushed && done.chest.join() === 'games' && done.spill && done.spilled === 1 && done.words === 'chestword:s-custom,chestword:key:0' && done.burst === CH41.SPILL.particles)
      ? ok('L.6 / L.11b "tap to continue" goes to the map and the music comes back, one chest sound played; the words spill out beside the chest with a burst from the lid, once, and each word is a tap target to what it names') : bad('L.6 / L.11b after the tap', JSON.stringify(done));
  }

  /* ---- 6. L.11d one layout, nothing beside a shut chest, every word fits at 390px; L.11b the words go where they say ---- */
  {
    await boot41({ chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, readySeen: { thorns: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro'), tierBars('author')) });
    await click('[data-go="s-pick"]'); await sleep(900);
    const lay = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), w = document.querySelector(`.chestwords[data-for="${id}"]`), cell = w.hidden ? null : w.getBoundingClientRect();
      return [id, { r: c.style.gridRow, col: c.style.gridColumn, hidden: w.hidden, n: w.hidden ? 0 : w.querySelectorAll('.cw').length,
        fit: w.hidden ? null : [...w.querySelectorAll('.cw')].every(x => { const b = x.getBoundingClientRect(); return x.scrollWidth <= x.clientWidth + 1 && b.right <= cell.right + 1 && b.right <= innerWidth && b.height <= 36; }) }]; })));
    const shut = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.save(); R.show('s-menu'); await wait(80); R.show('s-pick'); await wait(600);
      return Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`); return [id, { r: c.style.gridRow, col: c.style.gridColumn, words: !document.querySelector(`.chestwords[data-for="${id}"]`).hidden }]; })); });
    (IDS.every(id => lay[id].r === shut[id].r && lay[id].col === shut[id].col) && IDS.every(id => !shut[id].words) && lay.thorns.hidden && ['games', 'key', 'pro'].every(id => lay[id].fit && lay[id].n >= 1))
      ? ok('L.11d one layout for every state - each chest keeps its cell open or shut, nothing stands beside a chest that is not open, and at 390px every word fits its cell on one line (the sprite did not need shrinking)') : bad('L.11d the layout', JSON.stringify({ lay, shut }));
    await boot41({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } }, { unlock: ALL41, bars: tierBars('clear') });
    await click('[data-go="s-pick"]'); await sleep(800);
    const taps = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id; const out = {};
      const word = (id, w) => [...document.querySelectorAll(`.chestwords[data-for="${id}"] .cw`)].find(x => x.dataset.w === w);
      word('games', 'CUSTOMISE').click(); await wait(400); out.custom = on(); R.show('s-pick'); await wait(500);
      word('key', 'PRO KEY').click(); await wait(500); out.pro = { screen: on(), tier: (document.querySelector('#key-keys .kkey.sel') || { dataset: {} }).dataset.kt }; R.show('s-pick'); await wait(500);
      word('key', 'GAUNTLET').click(); await wait(300); out.soon = { screen: on(), toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' };
      return out; });
    (taps.custom === 's-custom' && taps.pro.screen === 's-key' && taps.pro.tier === '1' && taps.soon.screen === 's-pick' && /GAUNTLET/.test(taps.soon.toast) && /not built yet/.test(taps.soon.toast))
      ? ok(`L.11b every word is a tap target to the thing it names - CUSTOMISE opens Customise, PRO KEY the Pro key, and GAUNTLET, not built yet, says so where it is ("${taps.soon.toast}")`) : bad('L.11b the words go where they say', JSON.stringify(taps));
  }

  /* ---- 7. L.8d / L.8e: the meter's four bands, driven by "set meter to N%"; effects scale in a band; the pulse in the band's colour; never green ---- */
  {
    const B = CH41.METER_BANDS;
    const cfgOk = B.length === 4 && B.map(b => b.col).join() === 'var(--mute),var(--ink),#E8B84A,#FFFFFF' && !B.some(b => /3DD68C|--ok/i.test(JSON.stringify(b)))
      && B[3].ground === '#000000' && B[3].shake.every(Number.isInteger) && B[3].shake[1] <= 2 && B[2].glow[1] > B[2].glow[0] && B[3].spike[1] > 0 && !B[0].glow[1] && !B[1].glow[1];
    const pct = (read41('styles', 'app.css').match(/@keyframes pctup\{[^\n]*/) || [''])[0], pctOk = !!pct && !/--ok/.test(pct) && /--mcol/.test(pct);
    await boot41({});
    const mb = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = [];
      for (const v of [0, 50, 99, 100, 150, 199, 200, 250, 299, 300, 350, 400]) { S.prefs.devMeter = v; S.prefs.meterSeen = v; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(120);
        const m = document.querySelector('#menu-key .meterv'), cs = getComputedStyle(m), band = K.meterBand(v);
        out.push({ v, i: band.i, k: +band.k.toFixed(2), cls: m.className, col: cs.color, bg: cs.backgroundColor, ts: cs.textShadow, anim: cs.animationName, timing: cs.animationTimingFunction, shp: m.style.getPropertyValue('--shp'), glow: m.style.getPropertyValue('--mglow'), txt: document.getElementById('menu-key').textContent }); }
      S.prefs.devMeter = 260; S.prefs.meterSeen = 210; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(60);
      const mk = document.getElementById('menu-key'); const pulse = { up: mk.classList.contains('up'), mcol: mk.style.getPropertyValue('--mcol'), anim: getComputedStyle(mk).animationName };
      delete S.prefs.devMeter; S.save(); return { out, pulse }; });
    const at = v => mb.out.find(x => x.v === v);
    const bandsOk = mb.out.every(x => x.cls === 'meterv mb' + x.i && x.col !== 'rgb(61, 214, 140)') && [0, 50, 99].every(v => at(v).i === 0) && at(100).i === 1 && at(199).i === 1 && at(200).i === 2 && at(299).i === 2 && at(300).i === 3 && at(400).i === 3 && at(400).k === 1
      && at(0).col === 'rgb(110, 108, 104)' && at(150).col === 'rgb(232, 230, 225)' && at(250).col === 'rgb(232, 184, 74)' && at(350).col === 'rgb(255, 255, 255)' && at(350).bg === 'rgb(0, 0, 0)'
      && at(0).ts === 'none' && at(150).ts === 'none' && at(250).ts !== 'none' && parseFloat(at(299).glow) > parseFloat(at(200).glow)
      && at(0).anim === 'none' && at(150).anim === 'none' && at(350).anim === 'mshake' && /^steps\(1(, end)?\)$/.test(at(350).timing) /* Chromium serialises steps(1, end) as steps(1) */ && at(300).shp === '1' && at(400).shp === '2' && at(250).txt === '250% complete';
    (cfgOk && pctOk && bandsOk && mb.pulse.up && mb.pulse.mcol === '#E8B84A' && mb.pulse.anim === 'pctup')
      ? ok('L.8d / L.8e the meter\'s four bands, set by Testing\'s "set meter to N%": 0-99 --mute with no effects, 100-199 --ink, 200-299 gold with a glow that grows across the band, 300-400 white on black with a spiked edge, a cold glow and a stepped whole-pixel shake (1px low in the band, 2px high); a rise pulses in the band\'s colour; green is in no band and not in the pulse (B.22)')
      : bad('L.8d / L.8e the meter bands', JSON.stringify({ cfgOk, pctOk, bandsOk, out: mb.out.filter(x => [0, 100, 200, 250, 300, 350, 400].includes(x.v)), pulse: mb.pulse }));
  }

  /* ---- 8. L.6 / S5: Testing's "replay chest opening" x4 - the ceremony with nothing stored, then the map's spill, then the chest put back ---- */
  {
    await boot41({});
    await click('[data-go="s-testing"]'); await sleep(400);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] [data-act="dev-chest"]')].map(b => b.dataset.chest + ':' + b.textContent.trim()));
    const rp = [];
    for (const id of IDS) { await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(200);
      await click(`[data-act="dev-chest"][data-chest="${id}"]`); await sleep(700);
      rp.push(await page.evaluate(id => { const h = document.getElementById('key-cere'); return { id, screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests[id] }; }, id)); }
    await sleep(CH41.CEREMONY.thorns.ms); await click('#key-cere'); await sleep(900);
    const end = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill'), open: c.classList.contains('open'), stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.thorns }; });
    await sleep(3800);
    const rest = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { cls: ['locked', 'ready', 'open', 'spill'].filter(k => c.classList.contains(k)).join(), words: !document.querySelector('.chestwords[data-for="thorns"]').hidden }; });
    (btns.length === 4 && btns.every(b => /^(\w+):replay \1 chest opening$/.test(b)) && rp.every(x => x.screen === 's-key' && x.shown && x.chest === x.id && !x.stored) && end.screen === 's-pick' && end.spill && end.open && !end.stored && rest.cls === 'locked' && !rest.words)
      ? ok('L.6 / S5 Testing has "replay <chest> chest opening" x4: each plays that chest\'s ceremony on the key screen with nothing stored, and "tap to continue" lands on the map with its spill replayed, the chest then put back as its state leaves it') : bad('L.6 the four replay buttons', JSON.stringify({ btns, rp, end, rest }));
  }

  /* ---- 9. L.11e / L.10d / L.8f: the catalogue's chest cards, and the second driver answering a ceremony ---- */
  {
    const gen = read41('..', '_review', 'scripts', 'catalogue.mjs'), tpl = read41('..', '_review', 'scripts', 'catalogue.template.html');
    const shots = JSON.parse(read41('..', '_review', 'scripts', 'catalogue.annotations.json')).filter(a => a.group === 'chests').map(a => a.shot);
    const want41 = IDS.flatMap(id => ['locked', 'ready', 'opened', 'spill'].map(s => `30-chest-${id}-${s}`)).concat(IDS.map(id => `31-cere-${id}`), [0, 50, 100, 150, 200, 250, 300, 350, 400].map(v => `32-meter-${String(v).padStart(3, '0')}`), IDS.map(id => `33-spill-${id}`));
    (/const cereTap = async/.test(gen) && /await cereTap\(\)/.test(gen) && /ceremonyFrame\(/.test(gen) && /chestPlan\(/.test(gen) && want41.every(s => shots.includes(s)) && shots.length === want41.length
      && /'chests'\]\.forEach/.test(tpl) && /id="g-chests"/.test(tpl) && /REF\.chestFx/.test(tpl) && /w === 'noise'/.test(tpl))
      ? ok(`L.11e / L.10d / L.8f the catalogue carries ${want41.length} chest cards - 16 chest states, four ceremonies at five frames each with their sting and effects on a button, the meter at nine values, a spill per chest - drawn by the app's own renderers; and the second driver answers a ceremony's "tap to continue" as the gate does`)
      : bad('L.11e the catalogue cards', JSON.stringify({ shots: shots.length, missing: want41.filter(s => !shots.includes(s)) }));
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
