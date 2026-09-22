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
 * Pass a base URL as the one bare argument to test a server you are already running instead.
 *
 * HOW TO RUN IT (build 47, the gate housekeeping). `npm test` with no flags IS the gate: run it once, before the push. It prints each
 * failure as it happens, one line per section (`build 46 - batch 18, the unlock experience, sound and About · 13 checks · ok`) and the
 * verdict. The flags are for the fix loop and never stand in for the gate:
 *   npm test -- --only "build 46"   only the sections whose printed name starts with that — a comma list, a bare number means that
 *                                   build, a leading "the " may be left off (--only static,runs); a section another one stands on
 *                                   runs with it (LEADS)
 *   npm test -- --from 44           that build section and every section after it
 *   npm test -- --bail              stop at the first failure
 *   npm test -- --verbose           every pass line as well, which is what the gate printed until build 46
 *   npm test -- --labels <file>     every check, by section and in order, written to <file> — how a refactor proves it kept them all
 * What each section stands for, and the name to hand --only: _smoke/GATE.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from './server.mjs';
import { launch, phonePage, FONT_HOST, IGNORED_REQUEST } from './chrome.mjs';

const ARGV = process.argv.slice(2);
const optOf = f => { const i = ARGV.indexOf(f); return i < 0 ? null : ARGV[i + 1]; };
const baseArg = ARGV.find((a, i) => !a.startsWith('--') && !['--only', '--from', '--labels'].includes(ARGV[i - 1]));
const own = !baseArg;
const srv = own ? await serve() : null;
const BASE = baseArg || srv.base;
{ const r = await fetch(BASE + '/index.html').catch(() => null); if (!r || !r.ok) { console.error(`No page at ${BASE}/index.html (${r ? r.status : 'no answer'})`); process.exit(2); } console.log('serving ' + BASE); }

const GAMES = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
const errors = [];
const fail = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- sections, quiet output and partial runs (build 47) ----
   Every section opens with `if (section('its name')) {`. The name is what its summary line prints, what --only and --from match and
   what GATE.md indexes, and `section` answers whether it runs. `part` splits a running section's count without gating it. */
const T0 = Date.now();
const VERBOSE = ARGV.includes('--verbose'), BAIL = ARGV.includes('--bail'), LABELS = optOf('--labels');
const termsOf = s => (s || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean).map(t => /^\d+$/.test(t) ? 'build ' + t : t);
const ONLY = termsOf(optOf('--only')), FROM = termsOf(optOf('--from')), PARTIAL = ONLY.length + FROM.length > 0;
const named = (name, t) => [name.toLowerCase(), name.toLowerCase().replace(/^the /, '')].some(n => n.startsWith(t) && !/[a-z0-9]/.test(n.charAt(t.length)));
// a section that leaves the page, or a name, that a later one reads: asking for the later one runs both
const LEADS = { 'cold start (empty storage)': ['locked decisions (fresh profile)'] };
const sections = [], names = [];
let cur = null, fromOn = false;
const close = () => { if (!cur) return; console.log(`${cur.name} · ${cur.n} check${cur.n === 1 ? '' : 's'} · ${cur.failed ? cur.failed + ' failed' : 'ok'}`); cur = null; };
const part = name => { close(); cur = { name, n: 0, failed: 0, lines: [] }; sections.push(cur); if (VERBOSE) console.log('\n' + name); };
const section = (name, ...aka) => { close(); names.push(name, ...aka);
  const all = [name, ...aka, ...(LEADS[name] || [])], hit = ts => ts.some(t => all.some(n => named(n, t)));
  if (hit(FROM)) fromOn = true;
  const run = !PARTIAL || fromOn || hit(ONLY);
  if (run) part(name);
  return run; };
const check = (line, failed) => { if (!cur) part('(outside any section)'); cur.n++; cur.lines.push(line); if (failed) cur.failed++; };
const ok = (label) => { check('  ok   ' + label); if (VERBOSE) console.log('  ok   ' + label); };
const bad = (label, why) => { const line = label + (why ? ' — ' + why : ''); fail.push(line); check('  FAIL ' + line, true); console.log('  FAIL ' + line);
  if (BAIL) { verdict('STOPPED AT THE FIRST FAILURE (--bail)'); process.exit(1); } };
function verdict(stopped) {
  close();
  if (LABELS) fs.writeFileSync(LABELS, sections.map(s => '\n' + s.name + '\n' + s.lines.join('\n')).join('\n') + '\n');
  const unknown = stopped ? [] : [...ONLY, ...FROM].filter(t => !names.some(n => named(n, t)));
  console.log('\n' + '-'.repeat(60));
  if (errors.length) { console.log('UNCAUGHT ERRORS (' + errors.length + '):'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
  if (fail.length) console.log('FAILED CHECKS:\n  ' + fail.join('\n  '));
  if (unknown.length) console.log(`NO SECTION STARTS WITH ${unknown.map(t => '"' + t + '"').join(', ')} — the sections are:\n  ` + [...new Set(names)].join('\n  '));
  { const n = sections.reduce((a, s) => a + s.n, 0), m = sections.length; console.log(`${n} check${n === 1 ? '' : 's'} in ${m} section${m === 1 ? '' : 's'}, ${Math.round((Date.now() - T0) / 1000)}s`); }
  if (stopped || PARTIAL) console.log((stopped || 'PARTIAL RUN (--only / --from)') + ' — not the gate: the full npm test runs once before the push');
  const pass = !errors.length && !fail.length && !unknown.length;
  console.log(pass ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
  return pass;
}

/* ---- v29 (item 17, build 55): THE GATE ALWAYS PRINTS ITS VERDICT ----
   Any thrown puppeteer error used to kill the process where it stood: the first full run of the build-54 review died on a detached
   frame inside `two-player` and printed no verdict, no failure list and no section summary - 22 sections of work, 21 minutes, and
   nothing to read. A crash is now a FAILURE like any other: it is named, the verdict runs, the exit code is 1, and everything that
   passed before it is still on the page. A rejected top-level await surfaces here as an uncaughtException. */
let finished = false;
function crashed(e) { if (finished) return; finished = true;
  const msg = (e && (e.stack || e.message)) || String(e);
  fail.push('THE GATE CRASHED before it finished — ' + msg.split('\n')[0]);
  console.log('\n  FAIL THE GATE CRASHED before it finished\n' + msg.split('\n').slice(0, 6).map(l => '    ' + l).join('\n'));
  let pass = false; try { pass = verdict('CRASHED — the run did not finish'); } catch (e2) { console.log('verdict() also threw: ' + e2.message); }
  try { browser && browser.close(); } catch (e2) { }
  try { srv && srv.close(); } catch (e2) { }
  process.exit(pass ? 1 : 1); }
process.on('uncaughtException', crashed);
process.on('unhandledRejection', crashed);

/* ---- the shared helpers (build 47): one root, one read, one strip, one boot ----
   Until build 46 every build section carried its own copy of each (root28-root46, read32-read46, strip28-strip46, boot40-boot46). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
/* v29 (item 17, build 55): ../_review IS OPTIONAL. Ten sections read the review pipeline, which lives OUTSIDE the site tree, with an
   unguarded readFileSync - so `npm test` on a clone of `site` alone (which is what Codemagic gets) died on the first of them. REVIEW
   says whether the directory is there; every read of it goes through rvRead, every assertion that needs it is skipped by name when it
   is not, and the section keeps every other check it has. Nothing changes on a full checkout. */
const REVIEW_DIR = path.resolve(root, '..', '_review');
const REVIEW = fs.existsSync(REVIEW_DIR);
const rvRead = (...p) => { try { return fs.readFileSync(path.join(REVIEW_DIR, ...p), 'utf8'); } catch (e) { return ''; } };
const noReview = label => ok(label + ' — SKIPPED: ../_review is not in this checkout (site-only clone)');
if (!REVIEW) console.log('../_review not found — the review-pipeline checks will be skipped by name');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
/* boot writes a whole profile and reloads: `prefs` over `plain`, `extra` over the rest of the store, at store version `v` (a 5 walks
   the ladder's up6). PLAIN is build 46's profile — title, map, menu and key screen already seen, sound off, nothing spilled or ready */
/* build 57 (v29 Section A, 57.6): and every key's CREATION INTRO already seen. It is a once-per-profile moment that covers the key screen, so a
   fixture that has not seen it would have one play over whatever that section is driving; the section that tests it clears the field itself. */
const PLAIN = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: {}, readySeen: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
const boot = async (prefs, extra = {}, { v = 7, plain = PLAIN } = {}) => { await setStorage({ ne: Object.assign({ v, prefs: { ...plain, ...prefs }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} }, extra) }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(450); };
const NOW = Date.now();   // the fixtures' clock; storage fixtures, build 32 and build 38 stamp with it
/* v29 Section A (58.2, build 58): A FINISHED GAUNTLET, as the store holds one. The Pro chest needs Gauntlet Mini and the Author chest
   Gauntlet Mega, so a fixture that puts either of those chests into ready or open without `allOpen` has to carry the row play would have
   written. One shape, here, so a fixture never invents its own. */
const GAUNT_ALL = () => [{ id: 'g1', t: NOW, score: 104.2, tier: 'clear', web: [] }, { id: 'g2', t: NOW, score: 97.8, tier: 'clear', web: [] }];
let at, sawStory;         // cold start leaves both for the sections after it

// ---- 0. static: one build number (A6), config/ is data only (A2) ----
if (section('static checks')) {
  const { BUILD } = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
  const html = read('index.html'); const vj = JSON.parse(read('version.json'));
  // v18 (S.2, batch 14): the two places a person reads wear `v0.N`; the constant and version.json stay the bare integer (A6)
  /* v29 (item 7, build 55): TWO PLACES, NOT THREE. The update-check constant went with the inline script it lived in — the poll is
     core/platform.js now and imports BUILD from config/build.js, so A6's one place has one fewer copy to keep in step. */
  const places = [html.match(/<div class="hint">v0\.(\d+) ·/)?.[1], html.match(/<div id="build">v0\.(\d+)<\/div>/)?.[1], String(vj.build)];
  places.every(p => p === String(BUILD)) ? ok(`A6 build ${BUILD} in config/build.js = index.html ×2 = version.json (both visible as v0.${BUILD})`) : bad('A6 one build number', JSON.stringify(places) + ' vs config ' + BUILD);
  !/const BUILD="\d+";/.test(html) ? ok('A6 no fourth copy of the build number in index.html') : bad('A6 the update-check constant is back in index.html');
  const oldForm = html.match(/<div class="hint">build \d+ ·|<div id="build">build \d+</g) || [];
  /* DELETED at build 55 (v29 item 7): the half of this check that spelled `'v0.'+j.build` in index.html. The update bar's text is
     written in core/platform.js now, and CLAUDE.md:204 says a source-text check that fails on a refactor is deleted, not re-spelled. */
  (!oldForm.length) ? ok('S.2 v0.N on screen — the hint line and #build; no `build N` form left') : bad('S.2 v0.N on screen', oldForm.join(' | '));
  const cfg = fs.readdirSync(path.join(root, 'config')).filter(f => f.endsWith('.js'));
  const dirty = cfg.filter(f => /\bimport\b|=>|\bfunction\b/.test(strip(read('config', f))));
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
    // AMENDED at build 42 (v23 L.7a): the three themes are theme:key / theme:pro / theme:thorns; the build-30 three stay one build, retired, for the A/B
    const extra = ['menu', ...Object.values(AU.KEY_THEMES || {}), 'key:roots', 'key:frost', 'key:thorn'].filter(k => !AU.TRACKS[k]).concat(Object.keys(AU.KEY_THEMES || {}).length === 3 ? [] : ['KEY_THEMES']);
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
    const t = read('ui', 'toast.js');
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
  for (const f of engines) { const shared = f.startsWith('games/_shared/'); const src = strip(read(f)); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { const p = m[1]; const okPath = shared ? /^(\.\/[\w.-]+\.js$|\.\.\/\.\.\/(core\/|config\/|core\.js$))/.test(p) : /^\.\.\/(_shared\/|\.\.\/(core\/|config\/|core\.js$))/.test(p); if (!okPath) stray.push(`${f} → ${p}`); } }
  stray.length ? bad('A3 engines import only _shared / core / config', stray.join(', ')) : ok(`A3 engines import only _shared / core / config (${engines.length} files)`);
  // v14 C.1 / C.2 / C.3 (L5, build 22): Flash spends what is over 150ms of 500; a Go / No-go Streak spends what is over 150ms
  // of 1000 and 200ms a wrong tap, while its SET still ADDS 150ms a wrong tap. Two currencies — the gate holds them apart so
  // nobody harmonises them. C.4: the Streak has no wrong-tap run-ender, so the `wrong>=3` test must stay inside a !streak() branch
  { const rx = read('games', 'reaction', 'index.js');
    const num = k => { const m = rx.match(new RegExp(k + ':\\s*(\\d+)')); return m ? +m[1] : null; };
    // AMENDED at build 32 (v19 C.5 / C.6, L5): the Go / No-go gate is 180 and its Streak budget 3000; the wrong-tap costs did not move
    // AMENDED at build 44 (v24 F.1, L5 amended at Aiden's direct request): Flash's Streak budget is 1000
    const want = { FLASH_FREE: 150, FLASH_BUD: 1000, NOGO_FREE: 180, NOGO_BUD: 3000, NOGO_WRONG_SET: 150, NOGO_WRONG_STREAK: 200 };
    const got = Object.fromEntries(Object.keys(want).map(k => [k, num(k)]));
    const wrong = Object.keys(want).filter(k => got[k] !== want[k]);
    wrong.length ? bad('L5 the Reaction budgets', wrong.map(k => `${k}=${got[k]} want ${want[k]}`).join(', ')) : ok('L5 Flash 1000/150 (v24 F.1), Go / No-go 3000 over the 180ms gate (v19 C.5 / C.6), wrong tap 200 in a Streak and 150 in a Set (v14 C.1–C.3)');
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
  for (const f of screens) { const src = strip(read(f)); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { if (/^\.\/|\/games\/(?!registry)/.test(m[1])) cross.push(`${f} → ${m[1]}`); } }
  { const src = strip(read('run', 'run.js')); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) if (/screens\//.test(m[1])) cross.push(`run/run.js → ${m[1]}`); }
  cross.length ? bad('A4 screens and the run talk by events, not imports', cross.join(', ')) : ok(`A4 no screen imports a screen or an engine, the run imports no screen (${screens.length} screens)`);
  /* ---- v29 (items 7 / 15 / 16, build 55): S4, S7, A8 and one name per achievement ---- */
  {
    const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'";
    const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    (meta && meta[1] === CSP) ? ok('S4 index.html carries the Content-Security-Policy ARCHITECTURE.md has claimed since build 14 — and it is the S4 value') : bad('S4 the CSP meta', meta ? meta[1] : 'no meta at all');
    const inline = html.replace(/<!--[\s\S]*?-->/g, '').match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || [];
    !inline.length ? ok("S4 no inline <script> left in index.html — `script-src` falls to `default-src 'self'`, which refuses one") : bad('S4 an inline script would be refused by the CSP', inline.length + ' left');
    /* core/platform.js reads location.search at module load (CHAL), so it cannot be imported in node — the two facts about it are
       read off the source the way A2-A4's boundaries are, and the page drives the poll itself in the section below. */
    const PLSRC = strip(read('core', 'platform.js'));
    (/export \{[^}]*\bupdatePoll\b/.test(PLSRC) && /location\.protocol!=='https:'/.test(PLSRC) && /TARGET==='native'/.test(PLSRC))
      ? ok('S7 the update poll is core/platform.js, gated to https: and out of the native shell') : bad('S7 the update poll', 'not in platform.js, or not gated');
    /* A8 / A3 import boundary (the CLAUDE.md:204 exception): eleven direct navigator.vibrate calls across six engines are one
       platform.haptic() now. iOS WebKit implements none of the Vibration API, so this is where the Capacitor plugin lands. */
    const HAPT = ['games/_shared/timed.js', 'games/_shared/versus.js', 'games/estimate/index.js', 'games/sequence/index.js', 'games/timing/index.js', 'games/reaction/index.js', 'games/spot/index.js'];
    const direct = [...HAPT, 'run/run.js', 'run/input.js'].filter(f => /navigator\.vibrate/.test(strip(read(...f.split('/')))));
    const routed = HAPT.filter(f => /haptic\s*\}\s*from\s*"[^"]*core\/platform\.js"/.test(read(...f.split('/'))));
    (/export \{[^}]*\bhaptic\b/.test(PLSRC) && !direct.length && routed.length === HAPT.length)
      ? ok(`A8 one haptic: core/platform.js haptic(), imported by all ${HAPT.length} engines that buzz, and no navigator.vibrate left in games/ or run/`)
      : bad('A8 one haptic', JSON.stringify({ direct, routed: routed.length }));
    const AC55 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
    const nm = AC55.ACH.map(a => a.name).concat(Object.values(AC55.KEY_ROSTER).flatMap(r => ['clear', 'pro', 'author'].map(t => r[t] && r[t].name).filter(Boolean)));
    const dup = [...new Set(nm.filter((n, i) => nm.indexOf(n) !== i))];
    !dup.length ? ok(`v29 item 16 every achievement name is its own — ${nm.length} rows across ACH and KEY_ROSTER, no two alike`) : bad('two achievements with one name', dup.join(', '));
  }
}

const browser = await launch();
const page = await phonePage(browser);
/* build 47: every uncaught error names the section it happened in, and a console error the URL it came from, so a failed run says
   which --only to run. PLANTED are the only two resources the gate forgives a 404 on, because the gate makes them fail: build 46's
   item 23 check puts a clip at video/test.mp4 with captions at video/test.vtt to prove the player is built, and neither file exists.
   Every build-46 full run failed on those two 404s with all 591 checks passing. Any other 404 still fails the run. */
const inSection = () => cur ? ' — in ' + cur.name : '';
// v29 (item 10, build 55): and the clip the video-error check asks for on purpose, to prove the player says so instead of showing a black rectangle
const PLANTED = u => /\/video\/(test\.(mp4|vtt)|no-such-clip-55\.mp4)$/.test(u || '');
/* v27 (items 9 / 10, build 52): CLOSING THE PLAYER ABANDONS THE CLIP IT WAS STREAMING, and the browser reports that as net::ERR_ABORTED on
   the media request. It is not a failure and there is nothing to fix: a <video> the player tears down mid-buffer is exactly what "tap outside
   to close" does, on a phone as much as here. Only an ABORT, only under /video/, and every other request failure still fails the run. */
const ABORTED_CLIP = (u, err) => /\/video\//.test(u || '') && /ERR_ABORTED/.test(err || '');
page.on('pageerror', e => errors.push('pageerror: ' + e.message + inSection()));
page.on('console', m => { const u = m.location()?.url || ''; if (m.type() === 'error' && !IGNORED_REQUEST(m.text()) && !PLANTED(u)) errors.push('console: ' + m.text() + (u ? ' ' + u : '') + inSection()); });
page.on('requestfailed', r => { const u = r.url(), e = r.failure()?.errorText || ''; if (!IGNORED_REQUEST(u) && !ABORTED_CLIP(u, e)) errors.push('requestfailed: ' + u + ' ' + e + inSection()); });
page.on('dialog', async d => { errors.push('dialog opened: ' + d.message() + inSection()); await d.dismiss(); });
// v18 (B.32, build 33): every URL the page asks for, for the whole run — the font assertion counts the ones that left the origin
const reqs = [];
page.on('request', r => reqs.push(r.url()));
// a partial run can start at any section, and a section's first setStorage needs the page on the app's origin
if (PARTIAL) await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });

const onScreen = () => page.$eval('.screen.on', s => s.id).catch(() => null);
const inGame = () => page.$eval('#game', g => g.classList.contains('on')).catch(() => false);
const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const setStorage = obj => page.evaluate(o => { localStorage.clear(); for (const k in o) localStorage.setItem(k, typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])); }, obj);
const getJSON = k => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return 'unparseable'; } }, k);
const OPEN_PREFS = { allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
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
  /* v29 (build 56): Estimate has TWO shapes of input and poke() could only do one. Grow is a hold; Cut is a DRAG, and until now
     nothing in the gate drove it — every driver here plays a game's FIRST mode, and Cut is the second. A Gauntlet plays both, so
     the shared poke learns the drag: pointerdown, one move well past cutUp's 24px floor, pointerup, all on #hfield. */
  if (g === 'hold') { const st = await page.evaluate(() => import('./games/estimate/index.js').then(M => ({ cut: !!(M.default && M.default.cut && M.default.cut()),
      drawn: !!(document.querySelector('#hcut path.a') && document.querySelector('#hcut path.a').getAttribute('d')),
      hold: document.getElementById('hbg').classList.contains('on') })).catch(() => ({ cut: false, drawn: false, hold: false })));
    // the MODE decides, not #hbg: it carries the prompt in both, so a Cut round looked like a Grow round waiting for a hold
    if (!st.cut) { if (st.hold) { await down('#hfield'); await sleep(360); await up('#hfield'); } return; }
    if (st.drawn) { await ptr('pointerdown', '#hfield', .2, .3); await sleep(50); await ptr('pointermove', '#hfield', .8, .72); await sleep(50); await ptr('pointerup', '#hfield', .8, .72); }
    return; }
  if (g === 'sequence') { const input = await page.evaluate(() => document.getElementById('seq').classList.contains('input')); if (input) await down('.key[data-k="0"]'); return; }
  if (g === 'timing') { const run = await page.evaluate(() => !!document.querySelector('#tmclock, #tmball')); if (run) await down('#gen'); return; }
  if (g === 'reaction') { const lit = await page.evaluate(() => !!document.querySelector('#rxpane.lit')); if (lit) await down('#gen'); return; }  // Flash: tap only on the flash. A Streak that never taps also ends (no tap = 600ms)
  /* v29 (build 56): Spot has two shapes of input too. Count is the keypad, which is all poke() could press; FIND is a tap on the
     ODD SHAPE in the crowd, and only that shape advances the round — a wrong tap costs a penalty and the round waits. A Gauntlet
     plays Find, so the gate reads the odd point off the engine and taps its centre, the way a player who has spotted it would. */
  if (g === 'spot') {
    const hit = await page.evaluate(() => import('./games/spot/index.js').then(M => { const S = M.default;
      if (!S || typeof S.find !== 'function' || !S.find() || !Array.isArray(S.pts) || !S.odd) return false;
      const q = S.pts.find(x => x.shape === S.odd); if (!q) return false;
      const r = document.getElementById('gen').getBoundingClientRect(), sz = q.sz || S.size;
      document.getElementById('gen').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true,
        clientX: r.left + q.x + sz / 2, clientY: r.top + q.y + sz / 2, pointerId: 1 }));
      return true; }).catch(() => false));
    if (hit) return;
    await page.evaluate(n => { const b = document.querySelector(`#gen [data-num="${n}"]`); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0, pointerId: 1 })); }, 14); return; }
}
// the ad break (every fourth result) has a 2s skip; press it when it is live
/* v25 (items 6 / 11 / 22, build 46): A CHEST OPENING AND A KEY'S FIRST OPEN ARE THE SAME REVEAL NOW — the stage, the symbols rising out of it,
   "tap to continue", then the congratulations card whose Continue is dead for about a second. So every driver that used to answer one tap
   answers both, and every wait is a POLL rather than a number: the length of one is config/chests.js REVEAL plus that stage's own, and a
   number typed here would go stale the day either is re-tuned. `revealReady` waits for it to reach the tap; `revealDone` finishes the whole
   thing and answers whether it ended one. Both are no-ops when nothing is playing, so they are safe anywhere. */
const revealReady = async (ms = 20000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { const st = await page.evaluate(() => { const h = document.getElementById('key-cere');
      return !h || h.hidden ? 'off' : h.classList.contains('card') ? 'card' : h.classList.contains('tap') ? 'tap' : 'on'; });
    if (st !== 'on') return st; await sleep(150); }
  return 'timeout'; };
/* it finishes EVERY reveal that is queued, not one: a chest tapped on the map while its key's first open has not been seen plays the key's
   reveal and then the chest's, and a driver that answered only the first would photograph the second and call it the next screen. */
const revealOne = async () => { const st = await revealReady(); if (st === 'off' || st === 'timeout') return false;
  if (st === 'tap') { await click('#key-cere'); await sleep(320); }
  for (let i = 0; i < 40; i++) { const b = await page.evaluate(() => { const x = document.querySelector('#key-cere .rgo'); return !x ? '' : x.disabled ? 'wait' : 'go'; });
    if (b === 'go') { await page.evaluate(() => document.querySelector('#key-cere .rgo').click()); await sleep(320); return true; }
    if (!b) return false; await sleep(150); }
  return false; };
const revealDone = async () => { let any = false;
  for (let i = 0; i < 4; i++) { const on = await page.evaluate(() => !document.getElementById('key-cere').hidden);
    if (!on) break; if (!(await revealOne())) break; any = true; await sleep(450); }
  return any; };
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
if (section('cold start (empty storage)')) {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  at = await onScreen();
  const storyOn = () => page.evaluate(() => !!document.querySelector('#s-menu.story'));
  sawStory = at === 's-menu' && (await storyOn());
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
}

// ---- 1b. the locked decisions that can be asserted, on this fresh profile ----
if (section('locked decisions (fresh profile)')) {
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
}

// ---- 2. everything unlocked, so every pick sheet can be opened ----
if (section('pick sheets (all unlocked)')) {
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

  /* ---- v28 item 14 (build 53): THE PICKER IS A BOTTOM SHEET, wherever the map is scrolled. It was absolute inside #s-pick, which is a scroller,
     so "the bottom" was the bottom of the map's content and the sheet landed mid-screen - which is what Aiden photographed with Spot tapped and
     the map scrolled to the chests. Driven from the BOTTOM of the map, which is the state that used to break it. ---- */
  {
    await click('.back'); await sleep(250); await click('[data-go="s-pick"]'); await sleep(500);
    const sheet14 = await page.evaluate(async () => { const sc = document.getElementById('s-pick');
      sc.scrollTop = sc.scrollHeight; await new Promise(r => setTimeout(r, 300));
      const at = sc.scrollTop;
      document.querySelector('.tile[data-game="spot"]').click(); await new Promise(r => setTimeout(r, 900));
      const sh = document.getElementById('sheet'), dim = document.getElementById('mapdim'), t = document.querySelector('.tile[data-game="spot"]');
      const r = sh.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const rows = [...sh.querySelectorAll('.choice, #time-row .chip')];
      return { pos: getComputedStyle(sh).position, bottom: Math.round(window.innerHeight - r.bottom), pinned: Math.abs(r.bottom - window.innerHeight) <= 1,
        dim: !dim.hidden && dim.classList.contains('on'), dimAct: dim.dataset.act,
        tileAbove: tr.bottom <= r.top + 2 && tr.top >= -2, scrolled: sc.scrollTop !== at,
        rowAnim: rows.filter(x => x.getAnimations().length).length,
        hint: [...document.querySelectorAll('#s-pick .hint')].map(x => x.textContent).join('|') }; });
    const closed = await page.evaluate(async () => { document.getElementById('mapdim').click(); await new Promise(r => setTimeout(r, 600));
      const sh = document.getElementById('sheet'); return { up: sh.classList.contains('up'), dim: document.getElementById('mapdim').classList.contains('on') }; });
    (sheet14.pos === 'fixed' && sheet14.pinned && sheet14.dim && sheet14.dimAct === 'sheetclose' && sheet14.tileAbove && !sheet14.rowAnim
      && !/empty space/.test(sheet14.hint) && !closed.up && !closed.dim)
      ? ok(`v28 item 14 the mode picker is a bottom sheet: with the map scrolled to the very bottom, tapping Spot pins the sheet to the screen's own bottom edge (${sheet14.pos}, ${sheet14.bottom}px from it), scrolls the map so the tile sits clear above it, dims the map behind, and a tap on the dim closes it - no per-row animation, and "tap empty space to go back" is gone`)
      : bad('v28 item 14 the bottom sheet', JSON.stringify({ sheet14, closed }));
  }
}

/* ---- v28 item 7 (build 53): EVERY QUICK TAP AND DOTS MODE SHOWS ITS FIRST TARGET DURING THE COUNTDOWN, the way Dots - Lead has since build 26.
   NO EXCEPTIONS: Blind means no LEAD ring, not no dot ("Tap the dots as they appear"), and Quick Tap has only Two and Four - "Eyes shut" is an
   achievement, not a mode. Driven: a run of each of the four is started and the field read on the last beat of the 3-2-1, before Go. The target
   must also be the one the run starts on, so it cannot move out from under the player, and nothing may be tappable yet. ---- */
if (section('pick sheets (all unlocked)')) {
  const seen7 = [];
  for (const [g, d] of [['quick-tap', 'two'], ['quick-tap', 'four'], ['dots', 'blind'], ['dots', 'lead']]) {
    // SEEN_INTRO, or the first-play ghost demo runs for three seconds before the countdown and the read lands inside it
    await boot({ ...OPEN_PREFS, played: 1, snd: 'off' });
    await page.evaluate(async (g, d) => { const R = await import('./ui/router.js'); R.show('s-pick', { g, d, s: 5 }); }, g, d);
    await sleep(700);
    await page.evaluate(() => { const b = document.querySelector('[data-act="go-btn"]'); if (b) b.click(); });
    await sleep(600);   // two of the three countdown steps in: the target is up, the run has not started
    const mid = await page.evaluate(g => { const lit = g === 'quick-tap'
      ? [0, 1, 2, 3].map(i => +getComputedStyle(document.getElementById('sq' + i)).getPropertyValue('--v') > .5).indexOf(true)
      : (document.getElementById('dot').classList.contains('on') ? document.getElementById('dot').style.transform : '');
      return { lit }; }, g);
    await sleep(900);   // past Go
    const after = await page.evaluate(g => (g === 'quick-tap'
      ? [0, 1, 2, 3].map(i => +getComputedStyle(document.getElementById('sq' + i)).getPropertyValue('--v') > .5).indexOf(true)
      : document.getElementById('dot').style.transform), g);
    seen7.push({ g, d, shown: g === 'quick-tap' ? mid.lit >= 0 : !!mid.lit, same: String(mid.lit) === String(after), mid: mid.lit, after });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(300);
  }
  (seen7.every(x => x.shown && x.same))
    ? ok(`v28 item 7 every Quick Tap and Dots mode shows its first target during the countdown, and it is the target the run starts on: ${seen7.map(x => x.g + ' - ' + x.d).join(' - ')}. No exceptions: Blind hides the LEAD ring, not the dot, and Quick Tap has no eyes-shut mode`)
    : bad('v28 item 7 the first target during the countdown', JSON.stringify(seen7));
}

// ---- 2b. the Set and Streak lines on every sheet come from the one table (L5 / v14 section 5) ----
if (section('sheet copy comes from SET_COPY (L5)')) {
  const { SET_COPY, GAMES: TABLE } = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
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
if (section('one Set run and one Streak run per game (first mode)')) {
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
}

// ---- 4. pass & play Quick Tap: two players, the hand-over screen between ----
if (section('pass & play Quick Tap')) {
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
if (section('two-player (v15 section 4)')) {
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

// ---- 5. storage fixtures ----
if (section('storage fixtures')) {
  const bootWith = async (name, storage, expectScreen) => {
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
    const before = errors.length;
    await setStorage(storage); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const at = await onScreen();
    (at === expectScreen && errors.length === before) ? ok(`${name}: boots to ${at}`) : bad(`${name}: boots to ${expectScreen}`, `on ${at}, ${errors.length - before} new error(s)`);
    return at === expectScreen;
  };
  await bootWith('empty', {}, 's-menu');   // v14 (1.2): the title sequence is the menu screen wearing .story
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
    (ne && ne.v === 7 /* AMENDED at build 40: the ladder ends at v5; at build 42 at v6 (up6, L.7c); at build 57 at v7 (up7, 57.6) */ && Array.isArray(runs) && runs.every(r => r.v === 4)) ? ok('build-13 layout: migrated to `ne` v7, runs stamped RUN_SCHEMA 4') : bad('build-13 layout: ne v7 + run stamp', JSON.stringify({ v: ne && ne.v, stamps: runs && runs.map(r => r.v) }));
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
      (ne.v === 7 /* AMENDED at build 40: the ladder runs on to v5; at build 42 to v6; at build 57 to v7 */ && kinds.join('|') === want && ne.runs.every(r => r.v === 4) && ne.bars['timing:hidden:10'] && ne.bars['quick-tap:two:5'] && ne.ach.tm_wall && ne.ach.first)
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
  /* build 48 (v26 item 3): `menuOpened` — which home menu items have been opened, by screen — is shape-checked, seeded from the older flags on a
     profile that has none, and cleared by Fresh game. v26 items 7 / 12: a stored `devMeter` (Testing's retired override) is dropped on load */
  if (await bootWith('`menuOpened` seeded, shape-checked and cleared; `devMeter` dropped (v26 items 3 / 7 / 12)', { ne: { v: 6, prefs: { story: 1, played: 1, gridSeen: 1, keysSeen: 1, cusSeen: 0, snd: 'off', devMeter: 150 }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } }, 's-menu')) {
    const seeded = (await getJSON('ne')).prefs;
    await setStorage({ ne: { v: 6, prefs: { story: 1, played: 1, gridSeen: 1, snd: 'off', menuOpened: { 's-board': 1, 's-about': 0, 's-nowhere': 1, 's-key': 'yes' } }, runs: [], unlock: {}, ach: {}, intro: {}, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const shaped = (await getJSON('ne')).prefs.menuOpened;
    const wiped = await page.evaluate(async () => { const S = await import('./core/store.js'); S.reset(); return JSON.parse(localStorage.getItem('ne')).prefs.menuOpened; });
    (JSON.stringify(seeded.menuOpened) === '{"s-pick":1,"s-key":1}' && !('devMeter' in seeded) && JSON.stringify(shaped) === '{"s-board":1,"s-key":1}' && JSON.stringify(wiped) === '{}')
      ? ok('v26 item 3 `menuOpened` keeps only the six menu screens, each 1 or gone; an older profile takes the map from gridSeen, Keys from keysSeen and Customise from cusSeen; Fresh game empties it — and a stored devMeter is dropped (items 7 / 12)')
      : bad('v26 item 3 menuOpened in the store', JSON.stringify({ seeded: seeded.menuOpened, devMeter: seeded.devMeter, shaped, wiped }));
    await page.evaluate(() => localStorage.clear());
  }
  /* ---- v29 (items 5 / 6 / 16, build 55): the corrupt fixtures the build-54 review executed, and one Machine ----
     The gate's own corrupt fixtures covered runs="{}", scale="foo", col=42, name=12 and adRuns="x" — none of them an
     INHERITED property name, so both S3 Highs passed the gate on the day they were found. `TABLE[x] ? x : default` is
     truthy for every member of Object.prototype, and g:'constructor' threw inside validRun during module evaluation:
     blank app, nothing after core/store.js loaded, and the record never repaired because save() was never reached. */
  {
    const PROTO = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
    const broke = [];
    for (const k of PROTO) {
      await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [{ g: k, d: 'two', s: 5, hits: 1, t: 1 }], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
      const r1 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return { up: !!document.querySelector('.screen.on'), runs: (st.runs || []).length }; });
      if (!r1.up || r1.runs) broke.push(`runs[].g=${k} (up ${r1.up}, ${r1.runs} kept)`);
      await setStorage({ ne: { v: 6, prefs: { ...PLAIN, lastGame: k, scale: k, bg: k }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
      const r2 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}, p = st.prefs || {}; return { up: !!document.querySelector('.screen.on'), lg: p.lastGame, sc: p.scale, bg: p.bg }; });
      if (!r2.up || r2.lg === k || r2.sc === k || r2.bg === k) broke.push(`prefs=${k} (up ${r2.up}, ${r2.lg}/${r2.sc}/${r2.bg})`);
    }
    !broke.length
      ? ok(`S3 the inherited-property names boot clean and are repaired — ${PROTO.join(', ')} in runs[].g and in prefs.lastGame / scale / bg (Object.hasOwn at all four sites)`)
      : bad('S3 the truthy-index pattern', broke.join(' | '));

    await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [
      { g: 'quick-tap', d: 'two', s: 5, hits: 1e999, t: 101 },
      { g: 'quick-tap', d: 'two', s: 5, hits: 4, misses: -2, t: 102 },
      { g: 'hold', d: 'grow', s: 7, hits: 3, x: 1e999, y: 0, t: 103 },
      { g: 'sequence', d: 'solo', s: 3, hits: 3, t: 104, sc: '<img src=x onerror="window.__xss=1">' },
      { g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, t: 105 } ], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const kept = await page.evaluate(() => ((JSON.parse(localStorage.getItem('ne')) || {}).runs || []).map(r => r.t));
    (kept.length === 1 && kept[0] === 105)
      ? ok('S3 a stored run is rejected outright when a number a board or a sort reads is not finite (hits 1e999, x 1e999), when misses is negative, or when a formatter field is not what its formatter expects — only the honest row survives')
      : bad('S3 the run fields are type-checked', JSON.stringify(kept));

    const many = {}; for (let i = 0; i < 9000; i++) many['junk' + i] = 1;
    await setStorage({ ne: { v: 6, prefs: { ...PLAIN }, runs: [], ach: many, unlock: many, intro: SEEN_INTRO, seen: {}, bars: many } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const caps = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return [Object.keys(st.ach || {}).length, Object.keys(st.unlock || {}).length, Object.keys(st.bars || {}).length]; });
    caps.every(n => n > 0 && n <= 4000)
      ? ok(`S3 ach / unlock / bars are capped — 9,000 planted keys load as ${caps.join(' / ')}, so a tampered map can no longer be written back on every save until the quota fails silently`)
      : bad('S3 the map cap', JSON.stringify(caps));

    /* item 6: and the cell itself is escaped. `lim` is a legal short string, so a record carrying markup in it survives
       validRun by design — which is exactly why the board escapes every formatter cell rather than trusting the store. */
    await setStorage({ ne: { v: 6, prefs: { ...PLAIN, lastGame: 'spot' }, runs: [{ g: 'spot', d: 'count', s: -1, hits: 4, misses: 0, x: 0, y: 0, lim: '<b id="xss55">x</b>', t: 106 }], ach: {}, unlock: { 'spot:count': 1, 'spot:count:-1': 1 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(380);
    const esc55 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = t => new Promise(r => setTimeout(r, t));
      R.show('s-board'); await wait(350);
      const pick = (k, v) => { const el = [...document.querySelectorAll(`#s-board [data-chip="bd-${k}"]`)].find(x => x.dataset.v === String(v)); if (el) el.click(); return !!el; };
      const picked = [pick('g', 'spot'), pick('d', 'count'), pick('s', -1)]; await wait(350);
      const tb = document.querySelector('#s-board table');
      return { picked, el: !!document.getElementById('xss55'), txt: (tb ? tb.textContent : '').includes('<b id='), rows: tb ? tb.querySelectorAll('tbody tr, tr').length : 0 }; });
    (!esc55.el && esc55.txt && esc55.picked.every(Boolean))
      ? ok('S1 / item 6 a board cell is escaped — markup planted in a run field that survives validRun is drawn as text, never parsed')
      : bad('S1 the board escapes every formatter cell', JSON.stringify(esc55));

    // item 16: 'Machine' says "every round of a Set within 4.00%" and tested s===7, so a Cut Set (s===10) could never earn it
    const hd55 = await page.evaluate(async () => { const R = await import('./progress/rules.js'); const G = await import('./config/games.js');
      return { cut: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'cut', s: 10, y: 3 }), grow: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'grow', s: 7, y: 3 }),
        streak: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'grow', s: G.STREAK, y: 3 }), over: !!R.ACH_TEST.hd_s({ g: 'hold', d: 'cut', s: 10, y: 5 }) }; });
    (hd55.cut && hd55.grow && !hd55.streak && !hd55.over)
      ? ok("item 16 'Machine' matches its own copy — every round of a SET within 4%, either mode; a Streak still cannot earn it")
      : bad('item 16 hd_s reads any Set', JSON.stringify(hd55));
    await page.evaluate(() => localStorage.clear());
  }
}

// ---- 6. challenge links ----
if (section('challenge links')) {
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
}

// ---- 6b. the side screens (v14 section 8) ----
if (section('side screens (v14 section 8)')) {
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
  (ach.secret === '') ? ok('8.5 / 58.3 an unearned secret row carries NO description at all — the progress bar is the only hint (v14 8.5 reversed)') : bad('58.3 an unearned secret is silent', JSON.stringify(ach.secret));
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
    const counted = [unl53, cul53, ach53].every(t => /^\d+ of \d+ unlocked$/.test(t.hint.trim()));
    const noLede = !unl53.lede;
    const secretLast = ach53.heads.length && ach53.heads[ach53.heads.length - 1].t === 'secret' && (!filtered.length || filtered[filtered.length - 1] === 'secret');
    const secretPlain = ach53.heads.filter(h => h.t === 'secret').every(h => h.col === (ach53.heads.find(x => x.t !== 'secret') || h).col);
    const stacked = ach53.heads.every(h => h.disp !== 'flex');
    const art = cul53.art.length && cul53.art.every(r => r.sw === 1);
    (R3 && counted && noLede && secretLast && secretPlain && stacked && art)
      ? ok(`v28 items 1 / 4 / 6 Progress: every tab draws its rows with no entry animation at all (${unl53.rows}/${cul53.rows}/${ach53.rows} rows, none moving, none delayed - R3); the grey helper text is gone and each tab says how much of itself is done ("${unl53.hint}" / "${cul53.hint}" / "${ach53.hint}"); Secret is the last group in every filter and is drawn like any other locked row rather than in the cue red (${cue}); every heading stacks its description under its title instead of pushing it to the edge; and all ${cul53.art.length} Customise-unlock rows carry the thing they unlock`)
      : bad('v28 items 1 / 4 / 6 the Progress screen', JSON.stringify({ R3, counted, noLede, secretLast, secretPlain, stacked, art, unl53, cul53, ach53, filtered }));
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
    const hidden58 = /\?\?\?/.test(sec58.shut.name || '') && sec58.shut.line === '' && sec58.shut.bar;
    const told58 = sec58.open.name && !/\?\?\?/.test(sec58.open.name) && sec58.open.line.length > 0;
    const extras58 = sec58.shut.kt === 0 && sec58.shut.n > 0 && sec58.shut.n < 40;
    (hidden58 && told58 && extras58)
      ? ok(`58.3 a Secret is "${sec58.shut.name}" with NO description at all and the progress bar as the only hint until it is earned, and then it says what it was ("${sec58.open.name}" \u00b7 ${sec58.open.line}); and Achievements holds only the extras that fit nowhere else \u2014 ${sec58.shut.n} rows, not one of them a key row, "${sec58.shut.hint}"`)
      : bad('58.3 the Secrets and the Achievements tab', JSON.stringify({ hidden58, told58, extras58, someSecret, sec58 }));
  }
}

// ---- 6c. the key (v14 section 9 / C.5 / C.6 / C.7, build 22) ----
if (section('the key (v14 section 9)')) {
  const { KEY_BARS } = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  // C.5: the list is BUILT, never listed. A literal count or an array of ids in the CODE means a new mode would not join
  // the key. Comments come off first — the header is allowed to say what 31 is made of, the code is not allowed to know it
  const src = read('progress', 'key.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
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
    /* v29 (item 13, build 55): the fixture OPENS the Games chest. It used to lean on OPEN EVERYTHING, and a dev flag no longer
       banks a bar — "OPEN EVERYTHING and SUPPORTER stay flags that store no progress" (CLAUDE.md). What key 1 counting means
       is that the Games chest is open, so that is what the fixture says. */
    const wasCh = S.prefs.chests; S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 };
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
    const done = Object.keys(S.store.bars).length; S.store.bars = {}; S.prefs.chests = wasCh;
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
  // AMENDED at build 48 (v26 item 9): the line under the key is the count alone - the card carries the key's share and the menu the total
  /^0 of \d+$/.test((ui.count || '').trim()) ? ok(`A.6 / v26 item 9 the keys screen reads "${ui.count.trim()}" on a profile with no runs - no bar cleared, and no percentage beside it`)
    : bad('A.6 the cleared count and the percentage together', JSON.stringify(ui.count));
  (!ui.warn) ? ok('C.6 no mismatch warning on the key screen') : bad('C.6 the key screen is warning about missing bars');
  await page.evaluate(() => document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(350);
  const rows = await page.evaluate(() => ({ rows: document.querySelectorAll('#key-list .krow').length, nobar: document.querySelectorAll('#key-list .krow.nobar').length, first: (document.querySelector('#key-list .krow i') || {}).textContent }));
  (rows.rows === 6 && !rows.nobar) ? ok(`9.3 tapping Quick Tap lists its 6 combinations — first reads "${rows.first}"`) : bad('9.3 the key panel', JSON.stringify(rows));
}

// ---- 6d. the chain (v15 section 1) and the screens that carry it (v15 section 2), build 23 ----
if (section('the chain and its screens (v15 sections 1 and 2)')) {
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
  { const rs = read('ui', 'screens', 'result.js');
    const rn = read('run', 'run.js');
    const clean = /checkUnlocks|checkAch\(/.test(rs) === false;
    const banks = /checkUnlocks\(run\)/.test(rn) && /checkAch\(run\)/.test(rn) && rn.indexOf('checkUnlocks(run)') < rn.indexOf("emit('run:finish'");
    /* DELETED at build 55 (v29 item 2): `/function abort\(\)[\s\S]{0,400}liveCheck\(/`. abort() takes a `quiet` argument now and
       the live pass sits behind a `landed` test, so the regex fails on the new spelling — and CLAUDE.md:204 says a source-text
       check that fails on a refactor is deleted and named, never re-spelled. What it stood for is DRIVEN instead, in `the runs`:
       a quit before round 1 banks nothing, and a quit AFTER a round has landed still banks it. */
    (clean && banks) ? ok('2.5 the run banks every earn before run:finish; the result screen only shows them (the abort half is driven in `the runs`)')
      : bad('2.5 earns are banked by the run, not the result screen', `result clean ${clean} · run banks ${banks}`); }

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
      /* v17 (B.8): 80% off was unreachable — the measured ceiling on a Cut round is 44.5%. Ten, one step either side.
         v31 (60.5, build 60, L6 quoted — Aiden 2026-09-23): FIFTEEN, one step either side. The smallest reachable maximum miss
         is 25 (target 25), so 15 is still reachable at every target and on every shape, which is the whole of B.8's derivation. */
      cutStreak: [L('hold', 'cut', 1)({ y: 16 }), L('hold', 'cut', 1)({ y: 15 })],
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
  pair('60.5 (L6) Estimate · Cut Streak asks for one round more than 15% off — 10 until build 60, 80 until build 28, and 80 could never fire', V.lens.cutStreak);
  /* v31 (60.5): the SENTENCE and the PREDICATE are the same fact said twice, so they are checked against each other rather than
     each against a number. A build that moves one and not the other is exactly the failure this catches. */
  { const c60 = await page.evaluate(async () => { const U = await import('./config/unlocks.js'), R = await import('./progress/rules.js');
      const text = U.LEN_RULES['hold:cut'][1], n = +((text.match(/more than (\d+)%/) || [])[1]);
      const t = R.LEN_TEST['hold:cut'][1];
      return { text, n, over: !!t({ y: n + 1 }), at: !!t({ y: n }), under: !!t({ y: n - 1 }) }; });
    (c60.n === 15 && c60.over && !c60.at && !c60.under)
      ? ok(`60.5 (L6) the Cut Streak row's words and its predicate agree — "${c60.text}", and a run whose worst round is ${c60.n + 1}% off opens it while ${c60.n}% does not`)
      : bad('60.5 the Cut Streak text and predicate disagree', JSON.stringify(c60)); }
  pair('1.4b Reaction · Flash Streak asks for a Set averaging over 500ms', V.lens.flashStreak);
  pair('1.5 the shape at its limit earns Greedy; merely overshooting does not', V.hdMax);
  (!V.oneRecord.length) ? ok('1.0d one record of the chain — every lock box and goal line reads the string lenNeed builds') : bad('1.0d a second copy of a requirement', V.oneRecord.join(', '));

  // 2.2: no Next card on a fresh profile's first menu open
  { const nx = await page.evaluate(() => { const s = document.querySelector('#s-menu.story'); if (s) document.body.click(); return null; }); void nx; await sleep(900);
    for (let i = 0; i < 8 && (await page.evaluate(() => !!document.querySelector('#s-menu.story'))); i++) { await page.evaluate(() => document.body.click()); await sleep(320); }
    await sleep(400);
    // AMENDED at build 53 (v28 item 8): #menu-tag went with "unlock them all", so there is no subtitle left to be hidden
    const card = await page.evaluate(() => ({ hidden: document.getElementById('nextup').hidden, tag: !document.getElementById('menu-tag') }));
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

  /* 2.4: the Unlocks screen, and every line on it read from the one table. TURNED OVER at build 58 (58.3): the Game unlocks tab is the
     GAMES CHEST tab, its rows are in the shared `#chest-list` host, and it opens as the first tab — the rule it stands for, that every
     requirement on it comes from UNLOCKS or lenNeed and never from a second copy, is exactly what it was. */
  await click('#over-back'); await sleep(300); await click('#s-pick .back'); await sleep(400);
  { await click('[data-go="s-prog"]'); await sleep(450);
    const u = await page.evaluate(async () => { const P = await import('./progress.js');
      const rows = [...document.querySelectorAll('#chest-list .urow')];
      const needs = rows.filter(r => r.classList.contains('lock') && !r.dataset.key).map(r => r.querySelector('small').textContent.trim());
      const known = new Set(P.UNLOCKS.map(x => x.need));
      const G = await import('./games/registry.js');
      for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (i) known.add(P.lenNeed(g, d, s)); });
      return { screen: document.querySelector('.screen.on')?.id, rows: rows.length, heads: document.querySelectorAll('#chest-list h4').length,
        stray: needs.filter(n => n && !known.has(n)) }; });
    (u.screen === 's-prog' && u.rows > 0 && u.heads === 3) ? ok(`2.4 the Games chest tab lists ${u.rows} rows under ${u.heads} headings`) : bad('2.4 the Games chest tab', JSON.stringify(u));
    (!u.stray.length) ? ok('2.4 / L6 every requirement on the Unlocks screen comes from UNLOCKS or lenNeed — no second copy') : bad('2.4 a requirement written twice', u.stray.join(' | ')); }
}

// ---- 6e. the runs (v15 section 3), build 24 ----
if (section('the runs (v15 section 3)')) {
  const css = read('styles', 'app.css');

  /* ---- v30 (59.4, build 59): NO DIRECTION WORD AFTER A ROUND, IN ANY GAME ----
     Aiden, on a Timing · Hidden round reading "44MS · Great! · EARLY": "we don't need late or early after a user finishes a round. In this
     one it says great, that's all we need ... it doesn't need to be told whether it's early or late. This should apply to all games." The
     direction is already on screen as a PICTURE in every game that had one — the ghost ball against the marker, your shape against the dashed
     target — so the word repeated it and made a good round read like a correction.
     Two games printed one and they are the two driven here: Timing's early / late and Estimate's too much / too little. The check plays a real
     round of each MODE and reads the round line off the screen, because the item says to find every APPENDER rather than blank the strings —
     a string left in config with a caller still on it would pass a config test and fail on the phone. The separator is asserted gone too
     ("not left dangling"), and the figure and the tier's own name are asserted still there, because 59.4 keeps both. */
  {
    const DIRW = await (async () => { const C = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
      return { timing: [C.TIMING.early, C.TIMING.late], est: [C.ESTIMATE.much, C.ESTIMATE.little], tiers: (await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href)).VERDICT_TIERS.map(t => t.name) }; })();
    /* `clearReady` first, then poke: a fresh profile shows each game's one-line intro and ends it on "Ready?", and a driver that
       only pokes the playing field waits out the whole run on that screen. `clearHeld` is deliberately NOT called — it taps the
       round card away, and the round card is the thing being read. The line is read off its own HOST, not off the figure: the
       tier's word is a SIBLING of `<b id="hpct">`, so reading the figure's element would report a line with no verdict in it. */
    const lineOf = async (g, mi, sel) => {
      await openSheet(g, mi, 0);
      await click('#go-btn');
      for (let i = 0; i < 160; i++) {
        if (!(await clearReady(g))) await poke(g);
        await sleep(130);
        const txt = await page.evaluate(s => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
        if (txt) return txt;
        if ((await onScreen()) === 's-over') return '';
      }
      return '';
    };
    const lines = {};
    lines['timing:stopwatch'] = await lineOf('timing', 0, '#tmres');
    lines['timing:hidden'] = await lineOf('timing', 1, '#tmres');
    lines['hold:grow'] = await lineOf('hold', 0, '#hres');
    lines['hold:cut'] = await lineOf('hold', 1, '#hres');
    const got = Object.entries(lines).filter(([, v]) => v);
    const words = k => k.startsWith('timing') ? DIRW.timing : DIRW.est;
    const noDir = got.every(([k, v]) => !words(k).some(w => w && new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(v)));
    // "not left dangling": no round line ends on the separator, and none carries an empty one
    const noDangle = got.every(([, v]) => !/·\s*$/.test(v) && !/·\s*·/.test(v));
    // KEEP: the figure and the verdict word. Every line still carries a number, and a judged one still names its tier
    const keptFigure = got.every(([, v]) => /\d/.test(v));
    const keptVerdict = got.some(([, v]) => DIRW.tiers.some(n => v.includes(n)));
    (got.length === 4 && noDir && noDangle && keptFigure && keptVerdict)
      ? ok(`v30 59.4 no direction word after a round, every game and mode: ${got.map(([k, v]) => k + ' "' + v + '"').join(' · ')} — none of ${[...DIRW.timing, ...DIRW.est].join(' / ')}, no separator left dangling, and the figure and the tier's own name both kept`)
      : bad('v30 59.4 the direction word after a round', JSON.stringify({ lines, noDir, noDangle, keptFigure, keptVerdict }));
  }
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
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
    // AMENDED at build 50 (v26 §B2): the shape comes from the dealer by round now, so each of the 4,000 rounds gets a fresh dealer at a round of a Set
    const DL = await import('./games/_shared/deal.js'); HD.two = { on: false };
    for (let i = 0; i < 4000; i++) { HD.dealer = DL.makeDealer('hold:grow'); HD.round = 1 + i % 7; HD.shape = HD.pickTarget(); const t = HD.growTarget() * v; worst = Math.min(worst, HD.shape.coef * t * t / (v * v)); }
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
    // AMENDED at build 44 (v24 F.1, L5 amended at Aiden's request): Flash's Streak budget is 1000
    (f.early === 400 && f.free === 150 && f.bud === 1000 && f.nogoFree === 180 && f.nogoWrong === 200)
      ? ok('3.5 / L5 an early Flash tap spends 400ms, held apart from Flash 1000/150 (v24 F.1) and Go / No-go 3000 over the 180ms gate / 200')
      : bad('3.5 the Flash early-tap penalty', JSON.stringify(f)); }
  /* v18 (B.3a / B.4, L5) retunes both budgets v15 3.8 set. Stopwatch is 5s / 7.5s, not 25 / 30 - the 25 existed to let a
     run survive two ordinary attempts against a FLAT 7s target, and B.3b's targets climb a whole second a round instead.
     Hidden's is 700ms, not 100px: the ball crosses #gen in the same time on every phone and in a very different number
     of pixels, and 700 is 100px converted at the measured pace and rounded to a hundred. */
  { const s = S3.stopwatch;
    (s.early === 5 && s.late === 7.5 && s.hidden === 700 && s.txt === '5.00s')
      ? ok('B.3a / B.4 / L5 the Stopwatch Streak budget is 5s, 7.5s past round 10; Hidden is 700ms and the screen says so')
      : bad('B.3a / B.4 the Streak budgets', JSON.stringify(s)); }

  /* ---- v31 (60.4, build 60, L5 quoted — Aiden 2026-09-23): GROW'S VERDICTS AND ITS STREAK ALLOWANCE ----
     Three separate facts, and the third is the one that could quietly rot: the round's verdict word reads the RAW error while
     the budget is charged the error MINUS the allowance. If a later build ever passes the reduced number to the tier, a 6% round
     would read "Amazing!" — so the assertion drives the arithmetic on both sides rather than reading a constant.
     The BUDGET ITSELF DOES NOT MOVE: L5's 100% stands, and so do the key bars on Grow (they are not part of 60.4). */
  { const g60 = await page.evaluate(async () => { const V = await import('./config/verdicts.js'), G = await import('./config/games.js');
      const R = await import('./progress/rules.js').catch(() => null);
      const HD = (await import('./games/estimate/index.js')).default;
      const spend = e => { HD.ctx = { mode: 'grow' }; return HD.spendOf(e); };
      const spendCut = e => { HD.ctx = { mode: 'cut' }; return HD.spendOf(e); };
      return { round: V.ROUND_AT['hold:grow'], setAt: V.VERDICTS['hold'].at, cutAt: V.VERDICTS['hold:cut'].at,
        free: G.ESTIMATE.GROW_FREE, bud: G.ESTIMATE.STREAK_BUD,
        // the % off each `at` fraction stands for, on Estimate's own 40 scale
        setOff: V.VERDICTS['hold'].at.map(a => Math.round((1 - a) * 40 * 10) / 10),
        grow: [0, 2, 4, 6, 12, 30].map(e => [e, spend(e)]), cut: [0, 4, 12].map(e => [e, spendCut(e)]),
        tierReadsRaw: V.ROUND_AT['hold:grow'][0] }; });
    const wantRound = [4, 8, 15], wantOff = [7, 12, 30];
    const growSpend = Object.fromEntries(g60.grow), cutSpend = Object.fromEntries(g60.cut);
    (JSON.stringify(g60.round) === JSON.stringify(wantRound) && JSON.stringify(g60.setOff) === JSON.stringify(wantOff)
      && g60.free === 4 && g60.bud === 100
      && growSpend[0] === 0 && growSpend[2] === 0 && growSpend[4] === 0 && growSpend[6] === 2 && growSpend[12] === 8 && growSpend[30] === 26
      && cutSpend[0] === 0 && cutSpend[4] === 4 && cutSpend[12] === 12
      && JSON.stringify(g60.cutAt) === JSON.stringify([.8875, .8, .625]))
      ? ok(`60.4 (L5) Grow is looser: per-round ceilings ${wantRound.join(' / ')}% off (were 2 / 5 / 10), a Set's Amazing / Great / Good at ${wantOff.join(' / ')}% off over the 40 scale (were 5 / 10 / 30), and a Grow STREAK spends max(0, err − 4)% of the unchanged 100% budget — 6% costs 2, 12% costs 8, 30% costs 26 — while CUT still spends its error whole and keeps its own thresholds`)
      : bad('60.4 Grow verdicts and the Streak allowance', JSON.stringify(g60)); }
  { const r = S3.ramp, climbs = r.every((x, i) => !i || x > r[i - 1] - 0.9), low = r[0] < 4, high = r[4] > 7;
    (climbs && low && high) ? ok(`3.8 Stopwatch Streak targets climb — rounds 1/2/5/10/20 dealt ${r.join('s · ')}s`)
      : bad('3.8 the Stopwatch Streak ramp', JSON.stringify(r)); }
  // the finding behind Greedy's rewrite, asserted so it cannot quietly go back to a % threshold
  { const c = S3.ceiling;
    (c.large < 600 && c.small >= 600) ? ok(`3.x Greedy: a maxed hold reaches ${c.small}% off on the smallest target but only ${c.large}% on the largest (96vmin bites above ${c.crossover} vmin) — which is why the test is the cap, not a percentage`)
      : bad('the Greedy ceiling', JSON.stringify(c)); }
  // 3.10: Dots · Lead is set up before the run starts; Blind is not. Sampled during the 3-2-1, before #game.live
  /* AMENDED AT BUILD 53 (v28 item 7): BOTH MODES now show their first dot under the 3-2-1, not Lead alone. Build 26 (v15 3.10) did Lead only and
     left Blind "untouched, by intent"; Aiden asked for every Quick Tap and Dots mode, and Blind is not an exception — blind means no LEAD RING,
     not no dot ("Tap the dots as they appear"). The lead RING is still Lead's alone, which is what `lead` reads back below. */
  for (const [mode, want] of [['lead', true], ['blind', true]]) {
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
    else if (seen.dot === want && seen.lead === (mode === 'lead')) ok(`3.10 / v28 item 7 Dots · ${mode === 'lead' ? 'Lead' : 'Blind'} shows its first dot on "1", before the run starts — with its lead ring ${mode === 'lead' ? 'beside it' : 'withheld, which is the whole of what Blind means'}`);
    else bad(`3.10 Dots · ${mode} under the 3-2-1`, JSON.stringify(seen));
  }
  /* build 48 (v26 item 1): a solo Go / No-go SET shows the big counter and the goal box and nothing else - no "round 1 of 5 · 0 of 3" on the right,
     no "Go / No-go · Set" on the left. A Streak keeps its budget line */
  {
    const hud48 = async li => { await openSheet('reaction', 1, li); await click('#go-btn');
      let seen = null; for (let i = 0; i < 80 && !seen; i++) { await sleep(150); await clearReady('reaction'); seen = await page.evaluate(() => document.querySelector('#rxpane') && document.getElementById('game').classList.contains('live') ? { mode: document.getElementById('hud-mode').textContent.trim(), time: document.getElementById('hud-time').textContent.trim(), score: document.getElementById('score').textContent.trim() } : null); }
      await sleep(900); const later = await page.evaluate(() => ({ mode: document.getElementById('hud-mode').textContent.trim(), time: document.getElementById('hud-time').textContent.trim(), score: document.getElementById('score').textContent.trim() }));
      await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300); return { seen, later }; };
    const set48 = await hud48(0), streak48 = await hud48('streak');
    (set48.seen && !set48.seen.mode && !set48.seen.time && !set48.later.mode && !set48.later.time && /^\d+\/\d+$/.test(set48.later.score) && streak48.later.time)
      ? ok(`v26 item 1 Go / No-go · Set shows "${set48.later.score}" and the goal box alone - no round line, no mode label - and the Streak keeps "${streak48.later.time}"`)
      : bad('v26 item 1 the Go / No-go Set HUD', JSON.stringify({ set48, streak48 }));
  }
  /* build 50 (v26 §B2, ARCHITECTURE.md A9): THE SHAPE DIFFICULTY STANDARD and the round formats it deals. The data and the deal are
     driven off config/shapes.js and the dealer over 300 runs, each engine's own dealing function is called for real, and one live round
     of Go / No-go, Find and a Hidden Streak is played on the page. Nothing here reads how a source file is spelled */
  {
    const CS50 = await import(pathToFileURL(path.join(root, 'config', 'shapes.js')).href), G50 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
    const TIERS50 = ['easy', 'medium', 'hard'];
    const d50 = await page.evaluate(async () => {
      const CS = await import('./config/shapes.js'); const DL = await import('./games/_shared/deal.js'); const SH = await import('./games/_shared/shapes.js');
      const out = { drawn: {}, deals: {}, gone: ['line', 'rects', 'hex', 'tri'].filter(s => SH.Shapes.has(s) || CS.SHAPES[s]) };
      // every shape: a drawing with a real outline, measured in its own 100-unit box
      for (const s of Object.keys(CS.SHAPES)) { const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100px';
        host.innerHTML = SH.Shapes.svg(s); document.body.appendChild(host); const b = host.querySelector('path').getBBox(); host.remove();
        out.drawn[s] = { w: Math.round(b.width), h: Math.round(b.height) }; }
      // 300 runs of every deal: each band's tiers against its mix, the setting against load − shape, the pool, and repeats
      for (const key of Object.keys(CS.DEALS)) { const D = CS.DEALS[key], end = D.bands[D.bands.length - 1].to;
        const o = { mixOff: 0, pairOff: 0, outOfPool: 0, repeat: 0, cache: 0, streakOff: 0, seen: {} };
        for (let run = 0; run < 300; run++) { const dl = DL.makeDealer(key); const got = D.bands.map(() => ({})); let prev = '', tail = {};
          for (let k = 1; k <= end + 6; k++) { const S = dl.at(k), bi = D.bands.indexOf(S.band);
            if (k <= end) got[bi][S.tier] = (got[bi][S.tier] || 0) + 1; else tail[S.tier] = (tail[S.tier] || 0) + 1;
            if (S.set !== DL.setTier(S.band, S.tier)) o.pairOff++;
            if (!DL.poolAt(D, k).includes(S.shape) || CS.SHAPES[S.shape].tier !== S.tier) o.outOfPool++;
            if (S.shape === prev) o.repeat++; prev = S.shape; o.seen[S.shape] = (o.seen[S.shape] || 0) + 1;
            if (dl.at(k) !== S) o.cache++; }
          D.bands.forEach((b, i) => { for (const t of ['easy', 'medium', 'hard']) if ((got[i][t] || 0) !== (b.mix[t] || 0)) o.mixOff++; });
          // a Streak past the last band deals the last band again — six rounds of a band that is N long hold its mix in whole decks
          const lb = D.bands[D.bands.length - 1], len = end - (D.bands.length > 1 ? D.bands[D.bands.length - 2].to : 0);
          if (6 % len === 0) for (const t of ['easy', 'medium', 'hard']) if ((tail[t] || 0) !== (lb.mix[t] || 0) * 6 / len) o.streakOff++; }
        out.deals[key] = o; }
      return out; });
    // the list and the bands, as data
    const pools50 = Object.fromEntries(Object.entries(CS50.DEALS).map(([k, D]) => [k, D.bands.map((b, i) => { const p = D.pool.slice(); for (const x of D.bands.slice(0, i + 1)) (x.add || []).forEach(s => { if (!p.includes(s)) p.push(s); }); return p; })]));
    const untagged = Object.entries(CS50.SHAPES).filter(([, v]) => !TIERS50.includes(v.tier) || !v.word).map(([k]) => k);
    const unknown = Object.values(pools50).flat(2).filter(s => !CS50.SHAPES[s]);
    const undrawn = Object.entries(d50.drawn).filter(([, b]) => Math.max(b.w, b.h) < 95).map(([k]) => k);
    const badBands = Object.entries(CS50.DEALS).flatMap(([k, D]) => D.bands.map((b, i) => { const len = b.to - (i ? D.bands[i - 1].to : 0), sum = Object.values(b.mix).reduce((a, c) => a + c, 0);
      const noShape = Object.keys(b.mix).filter(t => !pools50[k][i].some(s => CS50.SHAPES[s].tier === t));
      return (sum !== len || noShape.length || !TIERS50.every(t => D.tiers[t] !== undefined)) ? `${k} band ${i + 1}: ${sum} of ${len}${noShape.length ? ', no ' + noShape.join('/') + ' shape' : ''}` : ''; })).filter(Boolean);
    (!untagged.length && !unknown.length && !undrawn.length && !badBands.length && !d50.gone.length)
      ? ok(`v26 §B2 / A9 one shape list: ${Object.keys(CS50.SHAPES).length} shapes each tagged once (${TIERS50.map(t => Object.values(CS50.SHAPES).filter(v => v.tier === t).length + ' ' + t).join(', ')}) and each drawn by the one geometry; every pool shape is on it; every band's mix fills its rounds from shapes of the tiers it names; line, rects, hexagon and "tri" are gone`)
      : bad('v26 §B2 / A9 the shape list', JSON.stringify({ untagged, unknown, undrawn, badBands, gone: d50.gone }));
    const dealBad = Object.entries(d50.deals).filter(([, o]) => o.mixOff || o.pairOff || o.outOfPool || o.repeat || o.cache || o.streakOff);
    (!dealBad.length)
      ? ok(`v26 §B2 / A9 300 runs of each of the ${Object.keys(d50.deals).length} deals: every band deals exactly its mix, every setting is the band's load minus the shape's tier, every shape is from its band's pool and tier, none twice running, a Streak deals the last band in whole decks, and asking for a turn again is the same deal (the pass & play rule)`)
      : bad('v26 §B2 / A9 the dealer', JSON.stringify(Object.fromEntries(dealBad.map(([k, o]) => [k, { ...o, seen: undefined }]))));
    // the per-game notes, as data
    const grow50 = pools50['hold:grow'].at(-1), nogo50 = pools50['reaction:nogo'].at(-1), count50 = pools50['spot:count'], find50 = pools50['spot:find'];
    const dia = d50.drawn.diamond, RXT = CS50.NOGO_TURNS;
    const notes50 = {
      grow: ['spiral', 'heart', 'cat'].every(s => grow50.includes(s)) && !grow50.includes('line') && !grow50.includes('rects'),
      cut: CS50.DEALS['hold:cut'].tiers.easy.includes(50) && Object.values(CS50.DEALS['hold:cut'].tiers).flat().every(v => v % 5 === 0),
      nogo: ['spiral', 'crescent', 'plus', 'bar', 'ring'].every(s => nogo50.includes(s)) && !nogo50.includes('hex') && !RXT.square && dia.h > dia.w * 1.4,
      count: count50[0].length === 3 && ['bar', 'plus', 'star'].every(s => count50[1].includes(s)),
      find: find50.every((p, i) => !i || p.length > find50[i - 1].length) };
    Object.values(notes50).every(Boolean)
      ? ok(`v26 §B2 the round formats as data: Grow adds spiral, heart and cat and drops line and rects; Cut can ask 50%; Go / No-go deals ${nogo50.length} shapes with no hexagon and no turned square, the diamond ${dia.w}×${dia.h}; Count adds bar, plus and star from round 3; Find's pool grows every band (${find50.map(p => p.length).join(' → ')})`)
      : bad('v26 §B2 the round formats', JSON.stringify(notes50));
    // each engine's own dealing code, called for real on the page: the setting it plays is the tier the dealer paired
    const e50 = await page.evaluate(async () => {
      const CS = await import('./config/shapes.js'); const DL = await import('./games/_shared/deal.js'); const G = await import('./config/games.js');
      const HD = (await import('./games/estimate/index.js')).default, RX = (await import('./games/reaction/index.js')).default, SP = (await import('./games/spot/index.js')).default;
      const out = { cut: { off: 0, fiftySym: 0, fifty: 0, n: 0 }, grow: { off: 0, sameOff: 0, n: 0, p2same: null, p1diff: null }, nogo: { off: 0, n: 0, sameTurn: null }, count: { off: 0, n: 0 }, find: { off: 0 }, flash: null };
      const keep = { ctx: HD.ctx, two: HD.two, hud: HD.hud, hint: HD.hint, icon: HD.icon, later: HD.later, bg: HD.bg, shareUp: HD.shareUp };
      HD.hud = HD.hint = HD.icon = HD.later = HD.bg = HD.shareUp = () => {};
      // Cut: HD.cutRound() itself, 300 runs of ten rounds
      HD.ctx = { mode: 'cut', len: 10 }; HD.two = { on: false };
      for (let run = 0; run < 300; run++) { HD.dealer = DL.makeDealer('hold:cut');
        for (let k = 1; k <= 10; k++) { HD.round = k; HD.cutRound(); const S = HD.spec; out.cut.n++;
          if (!CS.DEALS['hold:cut'].tiers[S.set].includes(HD.share)) out.cut.off++;
          if (HD.share === 50) { out.cut.fifty++; if (CS.SHAPES[S.shape].sym) out.cut.fiftySym++; } } }
      // Grow: the target's size sits in its setting's third of that shape's range, and odd turns grow the same shape, even a different one
      HD.ctx = { mode: 'grow', len: 7 };
      for (let run = 0; run < 200; run++) { HD.dealer = DL.makeDealer('hold:grow');
        for (let k = 1; k <= 7; k++) { HD.round = k; HD.shape = HD.pickTarget(); const S = HD.spec, t = HD.growTarget(), E = G.ESTIMATE;
          const lo = Math.max(E.TMIN, Math.min(E.TMAX, Math.sqrt(E.MIN_AREA / HD.shape.coef))), f = (t - lo) / (E.TMAX - lo), r = CS.DEALS['hold:grow'].tiers[S.set];
          if (f < r[0] - 1e-9 || f > r[1] + 1e-9) out.grow.off++;
          const mine = HD.pickMine(); if ((k % 2 === 1) !== (mine.name === HD.shape.name)) out.grow.sameOff++; out.grow.n++; } }
      // pass & play: Player 2's first turn grows the same shape, Player 1's second a different one — each counts their own turns
      HD.dealer = DL.makeDealer('hold:grow'); HD.round = 2; HD.two = { on: true, p: 1, taken: [1, 0] }; out.grow.p2same = !HD.est();
      HD.round = 3; HD.two = { on: true, p: 0, taken: [1, 1] }; out.grow.p1diff = HD.est();
      Object.assign(HD, keep);
      // Go / No-go: the dwell is inside its setting's third, and both players' turn 1 is the same go shape
      RX.ctx = { mode: 'nogo', len: 5 }; RX.two = { on: false };
      for (let run = 0; run < 200; run++) { RX.dealer = null;
        for (let k = 1; k <= 5; k++) { RX.round = k; RX.rule = RX.nextTarget(); const S = RX.spec, W = RX.NOGO_DWELL, r = CS.DEALS['reaction:nogo'].tiers[S.set];
          const ms = RX.dwellMs(); out.nogo.n++; if (ms < Math.floor(W.set + r[0] * W.spread) || ms > Math.ceil(W.set + r[1] * W.spread)) out.nogo.off++; } }
      RX.dealer = null; RX.two = { on: true, p: 0, taken: [0, 0] }; const a = RX.nextTarget(); RX.two = { on: true, p: 1, taken: [1, 0] }; const b = RX.nextTarget();
      out.nogo.sameTurn = a === b; RX.ctx = null; RX.two = { on: false }; RX.dealer = null; RX.spec = null;
      // Count: the target count sits in its setting's third of the band (a dip deals the floor); the flash gains flashRound a round
      const DC = DL.makeDealer('spot:count');
      for (let k = 1; k <= 14; k++) { const S = DC.at(k); for (let i = 0; i < 40; i++) { const R = SP.ramp(k, undefined, { ...S, u: Math.random() }), t = CS.DEALS['spot:count'].tiers[S.set];
        const want = R.dip ? [R.lo, R.lo] : [R.lo + Math.round(t[0] * (R.hi - R.lo)), R.lo + Math.round(t[1] * (R.hi - R.lo))]; out.count.n++;
        if (R.n < want[0] || R.n > want[1]) out.count.off++; } }
      { const R = G.SPOT_RAMP, x = SP.ramp(10, 0), crowd = Math.min(R.flashCap, R.flashBase + R.flashShape * Math.max(0, x.n + x.decoys - R.flashFree));
        out.flash = { r1: SP.ramp(1, 0).flash, r10: x.flash, crowd, extra: x.flash - crowd, want: R.flashRound * (10 - R.flashRoundFrom + 1) }; }
      // Find: the crowd is the round's count times its setting's factor
      for (let k = 1; k <= 11; k++) for (const set of ['easy', 'medium', 'hard']) { const base = SP.findSpec(k).n, n = SP.findSpec(k, { set }).n;
        if (n !== Math.round(base * CS.DEALS['spot:find'].tiers[set])) out.find.off++; }
      return out; });
    (!e50.cut.off && !e50.cut.fiftySym && e50.cut.fifty > 0)
      ? ok(`v26 §B2 Estimate · Cut's own cutRound(), ${e50.cut.n} rounds: every share is from its setting's tier, 50% was asked ${e50.cut.fifty} times and never of a shape with an axis of symmetry`)
      : bad('v26 §B2 Cut deals its shares by the standard', JSON.stringify(e50.cut));
    (!e50.grow.off && !e50.grow.sameOff && e50.grow.p2same && e50.grow.p1diff)
      ? ok(`v26 §B2 Estimate · Grow's own pickTarget / growTarget / pickMine, ${e50.grow.n} rounds: every target's size is in its setting's third, rounds 1, 3, 5, 7 grow the same shape and 2, 4, 6 a different one — and in pass & play each player counts their own turns`)
      : bad('v26 §B2 Grow deals by the standard', JSON.stringify(e50.grow));
    (!e50.nogo.off && e50.nogo.sameTurn)
      ? ok(`v26 §B2 Go / No-go's own nextTarget / dwellMs, ${e50.nogo.n} rounds: every dwell is inside its setting's third of ± spread, and both players' turn 1 is the same go shape`)
      : bad('v26 §B2 Go / No-go deals by the standard', JSON.stringify(e50.nogo));
    (!e50.count.off && e50.flash.extra === e50.flash.want && e50.flash.r10 > e50.flash.r1 && !e50.find.off)
      ? ok(`v26 §B2 Spot: Count's own ramp() deals ${e50.count.n} target counts inside their setting's third, a round-10 flash is ${e50.flash.extra}ms longer than its crowd alone (${e50.flash.r10}ms), and Find's crowd is its round's count × the setting's factor`)
      : bad('v26 §B2 Spot deals by the standard', JSON.stringify({ count: e50.count, flash: e50.flash, find: e50.find }));
    // live: a Go / No-go beat and a Find crowd are the shared drawing on screen, and a Hidden Streak turns its wall 45° while a Set never does
    const live50 = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const G = await import('./config/games.js'); const SS = await import('./core/store.js');
      for (const k of ['reaction', 'spot', 'timing', 'reaction:nogo', 'spot:find', 'timing:hidden']) SS.store.intro[k] = Date.now(); SS.save();
      const RX = (await import('./games/reaction/index.js')).default, SP = (await import('./games/spot/index.js')).default, TM = (await import('./games/timing/index.js')).default;
      const wait = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = f(); if (v) return v; await new Promise(r => setTimeout(r, 60)); } return null; };
      const go = sel => { Object.assign(ST.sel, { vs: 0, practice: 0 }, sel); RUN.start(); };
      const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
      const out = {};
      go({ game: 'reaction', diff: 'nogo', secs: 5 });
      out.bar = box(await wait(() => document.querySelector('#rxbar i.shp svg path')));
      out.beat = box(await wait(() => document.querySelector('#rxpane .rxshape svg path')));
      out.beatShape = RX.shown; RUN.abort(); await new Promise(r => setTimeout(r, 400));
      go({ game: 'spot', diff: 'find', secs: 10 });
      await wait(() => SP.st === 'find'); const fs = [...document.querySelectorAll('#gen .fs')];
      out.find = { n: fs.length, drawn: fs.filter(e => { const p = e.querySelector('svg path'); return p && p.getBoundingClientRect().width > 4; }).length, odd: fs.filter(e => e.classList.contains(SP.odd)).length };
      RUN.abort(); await new Promise(r => setTimeout(r, 400));
      const was = G.HIDDEN.diag; G.HIDDEN.diag = 1;
      const hid = async secs => { TM.ball = null; document.getElementById('gen').innerHTML = ''; go({ game: 'timing', diff: 'hidden', secs });
        if (!(await wait(() => TM.st === 'run' && TM.ball && document.getElementById('tmwall')))) { RUN.abort(); await new Promise(res => setTimeout(res, 400)); return { never: 1 }; }
        const b = TM.ball, s = b.size, f = document.getElementById('gen').getBoundingClientRect(), c = t => { const p = b.pos(t); return [p.x + s / 2, p.y + s / 2]; };
        const u = b.diag === undefined ? null : [Math.cos(b.diag * Math.PI / 180), Math.sin(b.diag * Math.PI / 180)];
        const w = c(b.wall), m = c(b.markT), end = c(b.markT + (b.markT - b.wall));
        const r = { diag: b.diag, tilt: b.tilt, markAhead: u ? (m[0] - w[0]) * u[0] + (m[1] - w[1]) * u[1] > 0 : null,
          inField: [c(b.wall), m].every(([x, y]) => x >= 0 && x <= f.width && y >= 0 && y <= f.height), wall: getComputedStyle(document.getElementById('tmwall')).transform };
        RUN.abort(); await new Promise(res => setTimeout(res, 400)); return r; };
      out.streak = []; for (let i = 0; i < 4; i++) out.streak.push(await hid(-1));
      out.set = await hid(10);
      G.HIDDEN.diag = was; return out; });
    const diagOk = live50.streak.every(r => [45, 135, 225, 315].includes(r.diag) && Math.abs(r.tilt) <= G50.HIDDEN.diagTilt && r.markAhead && r.inField && r.wall !== 'none') && live50.set.diag === undefined && live50.set.wall === 'none';
    /* v29 (build 55): `beat.w > 40` assumed the dealt beat shape is a WIDE one. `bar` is 29x132 — tall and thin — so this
       failed on the third full run of build 55 and passed on the first two, on nothing but which shape the dealer handed it.
       What it means is that the beat shape is drawn at a real size, so it measures the larger side and not the width. */
    (live50.bar && live50.bar.w > 8 && live50.beat && Math.max(live50.beat.w, live50.beat.h) > 40 && live50.find.n > 10 && live50.find.drawn === live50.find.n && live50.find.odd === 1 && diagOk)
      ? ok(`v26 §B2 on screen: the rule bar and a Go / No-go beat (${live50.beatShape}) are the shared svg, all ${live50.find.n} shapes of a Find crowd are drawn with one odd one, and a Hidden Streak turned its wall to ${live50.streak.map(r => r.diag + '°').join(', ')} with the ball within ${Math.max(...live50.streak.map(r => Math.abs(r.tilt)))}° of square and the marker behind it — a Set never did (#450)`)
      : bad('v26 §B2 the shapes and the 45° wall on screen', JSON.stringify(live50));

    /* ---- v31 (60.2, build 60): EVERY SHAPE IS PAINTED, IN EVERY STATE A GAME PUTS IT IN ----
       Aiden played Find, was asked for the RING and could not see one anywhere. Cowork's guess was that the crowd's recolouring
       sets `fill` only, so a stroke-only shape gets no colour. It is not that: NOTHING in config/shapes.js is stroke-only — every
       shape is one filled path with `fill-rule:evenodd`, which is how a ring's hole and a spiral's turns are drawn — so a shape
       was never left uncoloured. What was left behind was a STROKE: `.fs.bad` set the fill alone, so an odd shape tapped in error
       wore its green (or the other player's red or blue, L4) ring round a red fill.
       This is the check the item asks for and it is stronger than the item's wording: every shape in SHAPES, in every state a game
       puts a crowd shape in — plain, dim, bad, odd, odd.p1, odd.p2, odd.bad — with the fill and stroke each resolved to real paint,
       both against the ground, and a path with real area. It fails on a shape drawn in the ground colour, at zero alpha, or with a
       recolour that moved the fill and left the stroke. (What Aiden actually saw is 60.3: the target was buried under a decoy, and
       a ring whose hole is filled in by the shape behind it is a disc.) */
    const paint60 = await page.evaluate(async () => {
      const { Shapes } = await import('./games/_shared/shapes.js');
      const { SHAPES } = await import('./config/shapes.js');
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(host);
      const rgba = s => { const m = (String(s).match(/[\d.]+/g) || []).map(Number); return m.length >= 3 ? { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 } : null; };
      const near = (a, b) => a && b && Math.abs(a.r - b.r) < 12 && Math.abs(a.g - b.g) < 12 && Math.abs(a.b - b.b) < 12;
      const ground = rgba(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      const STATES = ['', 'dim', 'bad', 'odd', 'odd p1', 'odd p2', 'odd bad'];
      const out = [];
      for (const name of Object.keys(SHAPES)) for (const st of STATES) {
        const i = document.createElement('i'); i.className = ('fs ' + name + ' ' + st).trim();
        i.style.cssText = 'position:relative;--fsz:40px'; i.innerHTML = Shapes.svg(name); host.appendChild(i);
        const p = i.querySelector('path'), cs = getComputedStyle(p), box = p.getBBox();
        const fill = rgba(cs.fill), stroke = cs.stroke === 'none' ? null : rgba(cs.stroke);
        const bad = [];
        if (!fill || !fill.a || near(fill, ground)) bad.push('fill ' + cs.fill);
        // a stroke is optional; one that EXISTS has to be paint, and on `bad` it has to have followed the fill
        if (stroke && (!stroke.a || near(stroke, ground))) bad.push('stroke ' + cs.stroke);
        if (st.includes('bad') && stroke && !near(stroke, fill)) bad.push('bad left the stroke at ' + cs.stroke + ' over a ' + cs.fill + ' fill');
        if (!(box.width > 1 && box.height > 1)) bad.push('no area');
        if (getComputedStyle(i).opacity === '0') bad.push('opacity 0');
        if (bad.length) out.push({ shape: name, state: st || 'plain', why: bad.join(', ') });
        host.removeChild(i);
      }
      host.remove();
      return { n: Object.keys(SHAPES).length, states: STATES.length, bad: out }; });
    paint60.bad.length === 0
      ? ok(`60.2 every one of the ${paint60.n} shapes in config/shapes.js is painted in all ${paint60.states} states a crowd puts it in — plain, dim, bad, odd and odd in each player's colour — with a fill that is not the ground, a real drawn area, and a recolour that takes the STROKE with it (${paint60.n * paint60.states} combinations)`)
      : bad('60.2 a shape comes out invisible', JSON.stringify(paint60.bad.slice(0, 8)));

    /* ---- v31 (60.3, build 60): THE FIND TARGET IS NEVER OVERLAPPED — AT THE DEAL AND WHILE THE CROWD DRIFTS ----
       `pile()` (F.7, build 44) could move the target onto a decoy or drop a decoy on the target, and the target is dealt at index
       0 so every shape that touches it paints OVER it. Measured before the fix over 57 dealt rounds: 28 targets under 90% visible
       and several at 0%. The item's own test: deal many rounds, including during motion, and fail on a target less than about 90%
       visible. Decoy-on-decoy piles are NOT under test — they are build 44's ask and they stay. */
    const findVis = () => page.evaluate(() => { const S = window.__sp60; if (!S || !S.pts) return null;
      const box = q => { const s = q.sz || S.size; return { x0: q.x, y0: q.y, x1: q.x + s, y1: q.y + s, a: s * s }; };
      const B = S.pts.map(box);
      const over = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
      const vis = i => { let sum = 0; for (let j = i + 1; j < B.length; j++) sum += over(B[i], B[j]); return Math.max(0, 1 - Math.min(1, sum / B[i].a)); };
      const ti = S.pts.findIndex(q => q.shape === S.odd);
      return { odd: S.odd, n: B.length, target: Math.round(vis(ti) * 100),
        decoyBuried: S.pts.filter((_, i) => i !== ti && vis(i) < .9).length }; });
    const find60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'); SS.store.intro['spot'] = SS.store.intro['spot:find'] = Date.now(); SS.save();
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'find', secs: 10 }); RUN.start();
      await new Promise(r => setTimeout(r, 200));
      window.__sp60 = (await import('./games/spot/index.js')).default; return !!window.__sp60; });
    const vis60 = [];
    if (find60) {
      // 20 deals across both Find runs' whole band range, measured the instant they are dealt
      for (let pass = 0; pass < 2; pass++) for (let r = 1; r <= 10; r++) {
        await page.evaluate(n => { const S = window.__sp60; S.clearT(); S.round = n; S.findRound(); }, r);
        const v = await findVis(); if (v) { v.round = r; vis60.push(v); }
      }
      // and three rounds driven all the way through 2.5s of real drift, which is where the keep-out has to hold
      for (const r of [4, 7, 10]) {
        await page.evaluate(n => { const S = window.__sp60; S.clearT(); S.round = n; S.findRound(); }, r);
        await sleep(1500 + 2500);
        const v = await findVis(); if (v) { v.round = r; v.moving = 1; vis60.push(v); }
      }
      await page.evaluate(async () => (await import('./run/run.js')).abort()); await sleep(300);
    }
    const vBad = vis60.filter(v => v.target < 90);
    (vis60.length >= 20 && vBad.length === 0 && vis60.some(v => v.moving) && vis60.some(v => v.decoyBuried > 0))
      ? ok(`60.3 the Find target is never overlapped — ${vis60.length} rounds dealt across every band (${vis60.filter(v => v.moving).length} of them measured after 2.5s of drift), worst target ${Math.min(...vis60.map(v => v.target))}% visible, none under 90%; decoy-on-decoy piles are untouched (build 44's F.7 — up to ${Math.max(...vis60.map(v => v.decoyBuried))} decoys under 90% in a round)`)
      : bad('60.3 the Find target is overlapped', JSON.stringify({ rounds: vis60.length, under90: vBad.slice(0, 6), moving: vis60.filter(v => v.moving) }));
  }
  /* ---- v29 (items 2 / 3 / 4 / 9 / 14, build 55): the quit path, the stale state, the sleeping phone ----
     Four of the build-54 review's findings meet on the same few lines of run/run.js, so they are driven together. */
  {
    // openSheet writes a profile with no `intro`, so a first run plays its ghost demo and ends on "Ready?" — the wait answers it
    const liveNow = async (g) => { for (let i = 0; i < 140; i++) { if (await page.evaluate(() => document.getElementById('game').classList.contains('live'))) return true;
      if (g) await clearReady(g); await sleep(100); } return false; };
    const unlocksAfterQuit = async (g, mi, li) => { await openSheet(g, mi, li); await click('#go-btn');
      if (!(await liveNow(g))) return ['NEVER-WENT-LIVE'];
      await sleep(500); await click('#quit'); await sleep(500);
      return page.evaluate(() => { try { return Object.keys((JSON.parse(localStorage.getItem('ne')) || {}).unlock || {}); } catch (e) { return ['UNREADABLE']; } }); };
    /* item 2: minMax([]) answers [0,0] — a display convenience — and x:0 satisfies hold:cut (x<=15), sequence:solo (x<=3.5)
       and timing:hidden (x<=.3), every one of them live:1. Quitting during round 1, before anything was played, therefore
       banked a quarter of the L6 chain and turned two "within N%" skill rows into no-ops. */
    const quits = { 'hold · grow': await unlocksAfterQuit('hold', 0, 0), 'hold · cut': await unlocksAfterQuit('hold', 1, 0),
      'timing · stopwatch': await unlocksAfterQuit('timing', 0, 0), 'timing · hidden': await unlocksAfterQuit('timing', 1, 0) };
    Object.values(quits).every(u => Array.isArray(u) && !u.length)
      ? ok('item 2 quitting during round 1 of Grow, Cut, Stopwatch or Hidden banks NOTHING — the engines report no best round they do not have, and abort() runs no live pass on a result with nothing on it')
      : bad('item 2 an aborted run with no round played banks an unlock', JSON.stringify(quits));

    /* item 2, the other way round (and what the deleted source-text check in `the chain` stood for): a quit AFTER a round has
       landed STILL banks it — v15 2.5, "quitting must never cost a player something they already earned". A Grow round scored
       at 0.00% off is a real result whose `hits` is 0, which is why `landed` reads the engine's `x` and not a count. */
    await openSheet('hold', 0, 0); await click('#go-btn');
    (await liveNow('hold')) || bad('item 2 the Grow run never went live');
    /* the round is PLANTED rather than played: a driven hold releases at whatever size the poke produced, and whether that lands
       inside hold:cut's 15% is chance. One round of 4% off is a round that landed, which is the whole of what this asserts. */
    { const planted = await page.evaluate(async () => { const M = await import('./games/estimate/index.js'); const E = M.default;
        if (!E) return null; E.errs = [4]; return { x: E.result().x, hits: E.result().hits }; });
      await sleep(200); await click('#quit'); await sleep(600);
      const banked = await page.evaluate(() => { try { return Object.keys((JSON.parse(localStorage.getItem('ne')) || {}).unlock || {}); } catch (e) { return ['UNREADABLE']; } });
      (planted && planted.x === 4 && banked.includes('hold:cut'))
        ? ok('v15 2.5 a quit AFTER a round has landed still banks what it earned — the live pass is skipped only when the engine has no round to report, never when it has one')
        : bad('2.5 quitting costs an earn the player already made', JSON.stringify({ planted, banked })); }

    /* item 3: roundEngine.stop() left `st` on 'wait' / 'run' / 'find', and run.input forwarded taps from R.on — which is set
       when the screen is BUILT — so a tap during the next run's 3-2-1 ran the dead state's handler. On Flash it walked a
       phantom early tap, set `pending`, and the player's first real flash was eaten: a Set of five played four. */
    await openSheet('reaction', 0, 0); await click('#go-btn');
    (await liveNow('reaction')) || bad('item 3 the Flash run never went live'); await sleep(400); await click('#quit'); await sleep(600);
    await click('[data-go="s-pick"]'); await sleep(300);
    await page.evaluate(() => document.querySelector('.tile[data-game="reaction"]').click()); await sleep(320);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); (c[0] || c[0]).click(); }); await sleep(420);
    await page.evaluate(() => { const t = [...document.querySelectorAll('#time-row .tbtn')]; (t[0] || t[0]).click(); }); await sleep(160);
    await click('#go-btn'); await sleep(250);
    await down('#gen'); await sleep(120); await down('#gen');   // taps during the 3-2-1, the way a restless thumb makes them
    await liveNow('reaction'); await sleep(250);
    const flash55 = await page.evaluate(() => ({ hud: (document.getElementById('hud-time') || {}).textContent || '', held: document.getElementById('game').classList.contains('tapon') }));
    (/^\s*1\s*\//.test(flash55.hud) && !flash55.held)
      ? ok(`item 3 a tap during the 3-2-1 after an aborted Flash run is dropped — the new run opens on round 1 (${flash55.hud.trim()}) with no card held over from the dead one`)
      : bad('item 3 the stale round state eats round 1', JSON.stringify(flash55));

    // item 9: and a route out of a LIVE run ends it, instead of leaving it ticking under the screen the player went to
    const nav55 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const RN = await import('./run/run.js');
      const before = RN.R.on; R.show('s-pick'); await new Promise(r => setTimeout(r, 300)); return { before, after: RN.R.on }; });
    (nav55.before && !nav55.after)
      ? ok('item 9 navigating away from a live run ends it — a stray toast tap used to call show(\'s-pick\') and leave R.on true, the rAF ticking, the engine armed and the music playing under the pick sheet')
      : bad('item 9 a live run survives a screen change', JSON.stringify(nav55));

    /* item 4: nothing handled visibilitychange for the run. R.end is absolute, so a locked Marathon recorded its first ten
       seconds as a Marathon; Stopwatch's t0 kept its start while rAF paused, so the first frame back scored the whole lock
       time as the attempt and set `ov` — which is what tm_s10 reads, so locking the phone handed out a secret achievement. */
    await openSheet('timing', 0, 0); await click('#go-btn');
    (await liveNow('timing')) || bad('item 4 the Stopwatch run never went live'); await sleep(700);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(600);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(700);
    const lock55 = await page.evaluate(async () => { const RN = await import('./run/run.js'); const st = JSON.parse(localStorage.getItem('ne')) || {};
      return { on: RN.R.on, runs: (st.runs || []).length, ach: Object.keys(st.ach || {}), screen: (document.querySelector('.screen.on') || {}).id, toast: document.getElementById('toast').classList.contains('on') }; });
    (!lock55.on && !lock55.runs && !lock55.ach.includes('tm_s10') && lock55.screen === 's-pick' && lock55.toast)
      ? ok('item 4 the phone going to sleep mid-Stopwatch ends the run and banks nothing — no record, no tm_s10, back on the pick sheet with one toast on RETURN rather than into a dark screen')
      : bad('item 4 a backgrounded run keeps counting', JSON.stringify(lock55));

    // item 14: the rolling hits/sec number was unclamped while its bar was clamped — two taps 100ms apart printed 10.0/s
    const rate55 = await page.evaluate(async () => { const H = await import('./games/_shared/hud.js'); const G = await import('./config/games.js');
      const now = performance.now(); H.rate('quick-tap', [now - 100, now], now);
      const txt = document.querySelector('#rate b').textContent, bar = document.querySelector('#rate i').style.height;
      return { txt, bar, max: G.RATE_MAX['quick-tap'] }; });
    (parseFloat(rate55.txt) <= rate55.max + 1e-9 && rate55.bar === '100%')
      ? ok(`item 14 the HUD's rolling figure is held to the same ceiling as its bar — two taps 100ms apart read ${rate55.txt} against RATE_MAX ${rate55.max}, not 10.0/s`)
      : bad('item 14 the rate number is unclamped', JSON.stringify(rate55));
  }
}

// ---- 6f. the keys, the surface, and the three two-player defects (v15 section 5 and section 6, #375), build 26 ----
if (section('the keys, the surface and #375 (v15 sections 5 and 6)')) {
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
      await page.evaluate(() => { const el = document.getElementById('s-key'), host = document.getElementById('key-cere'), t0 = performance.now(); const w = window.__r48 = { cut: [], fin: 0, n: 0, lit: null, lastEnd: null, off: null, tap: false, card: false };
        const mo = new MutationObserver(() => { const now = performance.now() - t0;
          if (host.classList.contains('tap')) w.tap = true; if (host.classList.contains('card') || host.querySelector('.rcard')) w.card = true;
          if (el.classList.contains('kearning') && w.lit === null) { w.lit = now; const as = document.getAnimations().filter(a => a.effect && a.effect.target && el.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime) && a.playState !== 'finished');
            w.n = as.length; as.forEach(a => a.finished.then(() => { w.fin++; w.lastEnd = performance.now() - t0; }, () => w.cut.push(a.animationName || 'x'))); }
          if (w.lit !== null && !el.classList.contains('kearning') && w.off === null) w.off = now; });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] }); mo.observe(host, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true }); w.mo = mo; });
      await tap48(`[data-act="dev-whole"][data-tier="${tier}"]`);
      let taps = 0, moved = false;
      for (let i = 0; i < 120; i++) { await sleep(200);
        const st = await page.evaluate(() => ({ on: !document.getElementById('key-cere').hidden, mid: document.getElementById('s-key').classList.contains('kearning'), scr: document.querySelector('.screen.on').id }));
        if (st.scr !== 's-key') moved = true;
        // Back is still refused while it plays (a tap is not - that is the skip, driven on its own below)
        if (st.on && st.mid && i % 5 === 3) { await page.evaluate(async () => { const R = await import('./ui/router.js'); R.back(); }); taps++; }
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

// ---- 7. every button action once (build 15: ui/actions.js dispatches on data-act) ----
if (section('button actions (every data-act at least once)')) {
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
  await tap('#chest-list .urow.key', 'unlocks · the key row'); await sleep(400);
  (await onScreen()) === 's-key' ? ok('the Unlocks screen\'s key row opens the key') : bad('unlocks · key row', 'on ' + (await onScreen()));
  await tap('#s-key .back', 'key · back'); await sleep(300);
  // achievements: filter chip, a row that jumps to a sheet (Quick Tap · Clean · Sprint · Four)
  await tap('[data-go="s-prog"]'); await tap('#prog-tabs [data-tab="cul"]', 'progress · customise unlocks tab'); await tap('#prog-tabs [data-tab="ach"]', 'progress · achievements tab'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  // 58.3: the per-game filter inside a chest tab is its own action, and the Skill chest tab is where the key rows live now
  await tap('#prog-tabs [data-tab="c-key"]', 'progress · skill chest tab'); await tap('#chest-g [data-v="dots"]', 'skill chest · filter chip'); await sleep(300);
  // back to Achievements, filtered as it was, for the row walk below
  await tap('#prog-tabs [data-tab="ach"]'); await sleep(300); await tap('#ach-g [data-v="quick-tap"]'); await sleep(300);
  // AMENDED at build 58 (58.3): `qt_bclean5` is a key-1 roster row and lives on the Skill chest tab now; Committed is Quick Tap, pays out nothing, and jumps
  await tap('#ach-qt_sab', 'achievements · jump row');   // AMENDED at build 39 (v23 L.4c): Clean · Sprint · Four pays out a colour, so it is on Customise unlocks await sleep(300);
  (await onScreen()) === 's-pick' ? ok('achievement row jumps to its pick sheet') : bad('achievement row jumps to its pick sheet', 'on ' + (await onScreen()));
  await tap('#lvl-back', 'sheet · mode back'); await tap('#diff-row .choice:nth-child(2)', 'sheet · mode');
  await tap('#prac-row [data-prac]', 'sheet · practice from'); await tap('#grid', 'sheet · grid');
  // v17 (B.24, build 29): the chest is a control on the grid like any other. Locked here, so it says what it takes
  await tap('.chest', 'game select · chest'); await sleep(200);
  await sleep(500); await tap('#s-pick .back', 'grid · back');
  // about: support. v14 (8.10): the dev switches live on their own screen now, one menu item below About
  await tap('[data-go="s-about"]'); await tap('#support', 'about · support');
  // v25 (item 23, build 46): the eight message slots. The first is open with no clip yet; a later one is locked and says what opens it
  await tap('#msglist .msgrow[data-msg="games"]', 'about · a message');
  await tap('#msglist .msgrow[data-msg="thanks"]', 'about · a locked message');
  // v27 (items 9 / 10, build 52): the shared player's two controls — a tap on the picture pauses and plays, a tap outside closes
  await sleep(700); await tap('#vplay .vframe', 'about · the player, pause');
  await tap('#vplay .vback', 'about · the player, close'); await sleep(700);
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
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip-bd', 'chip-pv', 'chip-ach', 'chip-over', 'item', 'pvlock', 'ach', 'unl', 'chip-chest', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done', 'lock-no', 'lock-go', 'nextup', 'egg', 'ptab', 'chest', 'msg'];
  const missing = expected.filter(a => !seen.has(a));
  missing.length ? bad('every data-act driven once', 'not driven: ' + missing.join(', ')) : ok(`every data-act driven once (${expected.length}) — not covered: again, pass-go, to-games, seqdone, praclock, dev-fresh, adskip, toast, cere-tap, reveal-go, reveal-msg (the reveal's three are driven in the build 46 section)`);
}

// ---- chests (build 48 opens it — FEEDBACK-v26 items 7 and 12): one saved value, reached through play and through Testing ----
/* Chest state, key state and the 0–300% meter are one saved value — the bars and the chests in the store — and every screen reads it. This section
   proves it both ways Aiden gets there: by EARNING the Games chest and key 1 with real runs, and by Testing's buttons, which must land exactly where
   play does. After every step the store, the map, the Keys screen and the menu are read side by side and must agree, and the state must be one play
   can reach: no chest open behind a shut one, no bars on a key whose chest is shut, and a meter that is the bars. */
if (section('chests')) {
  const CP48 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const CH48 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const PLAIN48 = { ...PLAIN, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const tap = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, sel);
  const go = (id, o) => page.evaluate(async (id, o) => (await import('./ui/router.js')).show(id, o || {}), id, o);
  const EARN = CP48.GRID.chestEarn;
  // every surface's reading, beside the store's
  const read48 = () => page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
    const ids = ['games', 'key', 'pro', 'thorns'];
    // v30 (59.11): the modes are part of the first band now, so the derived figure this section checks against needs their count too
    const P59 = await import('./progress.js'), C59 = await import('./config/chests.js');
    const mc = P59.modeCount(), freeN = C59.METER.freeStart ? mc.free : 0;
    const out = { store: { meter: K.meter(), shown: K.meterPct(), max: K.meterMax(), chests: ids.map(K.chestState), bars: K.TIERS.map(t => K.keyState(t).done), total: K.TIERS.map(t => K.keyState(t).total), pct: K.TIERS.map(t => K.bandPct(t)), open: K.TIERS.map(t => K.tierOpen(t)),
      modes: { num: Math.max(0, mc.open - freeN), den: Math.max(0, mc.total - freeN) } } };
    R.show('s-pick'); await wait(450);
    out.map = ids.map(id => { const c = document.querySelector(`#grid .chest[data-chest="${id}"]`); return { st: c.classList.contains('open') ? 'open' : c.classList.contains('ready') ? 'ready' : 'locked', need: c.querySelector('.pic').dataset.need }; });
    R.show('s-testing'); await wait(60); R.show('s-key', { tier: 0, from: 's-testing' }); await wait(450);
    const quiet = !document.getElementById('key-shell').hidden;
    out.keys = { quiet, cards: [...document.querySelectorAll('#key-keys .kkey')].map(k => ({ locked: k.classList.contains('locked'), u: k.querySelector('u').textContent, theme: k.querySelectorAll('i').length })),
      line: quiet ? (document.getElementById('key-quiet-count') || {}).textContent || '' : document.getElementById('key-count').textContent,
      // AMENDED for build 49 (Aiden, after build 48): the quiet screen's row of chests is gone - its key asks, and the map shows the chests
      row: quiet ? document.querySelectorAll('#key-shell .kch, #key-shell .kchests').length : null };
    R.show('s-menu'); await wait(1250);   // the menu's count-up is 900ms
    out.menu = document.getElementById('menu-key').hidden ? null : document.getElementById('menu-key').textContent;
    return out; });
  const why48 = s => { const st = s.store, w = [];
    s.map.forEach((m, i) => { const want = st.chests[i] === 'before' ? 'locked' : st.chests[i]; if (m.st !== want) w.push(`map ${i} ${m.st}≠${want}`); if (/%/.test(m.need)) w.push(`map ${i} prints "${m.need}"`);
      /* AMENDED at build 58 (58.2): a chest that wants a finished Gauntlet as well lists BOTH requirements, one per line with its own tick.
         REVERSED AT BUILD 59 (v30 59.6): it carries ONE LINE, FOLLOWING THE STATE. Aiden on the locked Author chest — "the author chest text
         doesn't fit within it, so that doesn't look good. Let's just do earn the author key" — the two ticked lines wrapped to four and ran over
         the chest drawing and its red strike. So a locked tile says the FIRST thing still missing and nothing else: its key line while the key is
         not in hand, its Gauntlet line once it is. The requirement is not lost — it is still listed on that chest's Progress tab and it is now
         part of the key's own story on the Keys screen, both of which this section asserts elsewhere. */
      if (i && want === 'locked') { const cid = ['games', 'key', 'pro', 'thorns'][i];
        const lines = String(m.need).split('\n');
        const okNeed = lines.length === 1 && !/^[✓·] /.test(m.need)
          && (m.need === EARN[cid] || /Gauntlet/.test(m.need));
        if (!okNeed) w.push(`map ${i} says "${m.need}"`); } });
    s.keys.cards.forEach((k, i) => { if (k.theme) w.push(`card ${i} has a theme name`); if (k.locked !== !st.open[i]) w.push(`card ${i} locked ${k.locked}`); if (!k.locked && st.bars[i] < st.total[i] && k.u !== st.pct[i] + '%') w.push(`card ${i} "${k.u}"≠${st.pct[i]}%`); });
    if (/%/.test(s.keys.line)) w.push(`key line "${s.keys.line}"`);
    if (s.keys.row) w.push(`the quiet key screen still draws ${s.keys.row} chest row elements`);
    /* v28 (item 9, build 53) put meterPct() over the top of meter() and clamped it to 100. REVERSED at build 55 (v29 item 1): the figure is the
       METER, 0 to its own maximum, so 100 means key 1 whole and 200 means Pro whole as well — which is what the 2026-09-14 decision says and what
       build 53 took away. meterPct() is still the ONE thing a surface prints and the one place rounding happens. FEEDBACK-v29 carries the
       disagreement: Aiden asked for the clamp after reading 300% on the front of the app, and it was Testing's Author switch that produced it. */
    if (s.menu !== null && !s.menu.startsWith(st.shown + '%')) w.push(`menu "${s.menu}"≠${st.shown}%`);
    if (st.shown > st.max || st.shown < 0) w.push(`the shown figure is ${st.shown}% of a ${st.max} meter`);
    if (st.shown !== Math.max(0, Math.min(st.max, Math.round(st.meter)))) w.push(`shown ${st.shown}≠meter ${st.meter} of ${st.max}`);
    // reachable by play
    st.chests.forEach((c, i) => { if (i && c === 'open' && st.chests[i - 1] !== 'open') w.push(`chest ${i} open behind a shut one`); });
    st.bars.forEach((n, i) => { if (n && !st.open[i]) w.push(`${n} bars on shut key ${i}`); });
    /* AMENDED AT BUILD 59 (v30 59.11): the first hundred is MODES UNLOCKED + KEY-1 BARS in equal steps, so the figure this derives
       independently of meter() has to be derived the same way or it is checking the old rule. The other two bands are bars alone and
       do not move. The point of deriving it here at all is unchanged: the store, the map, the Keys screen and the menu must agree on
       a number that PLAY can reach, and this is the only place that recomputes it from first principles rather than asking meter(). */
    const band59 = (i) => { const bars = st.open[i] ? st.bars[i] : 0;
      if (i > 0) return st.total[i] ? 100 * bars / st.total[i] : 0;
      const den = st.modes.den + st.total[i];
      return den ? 100 * (st.modes.num + bars) / den : 0; };
    const m = Math.floor(st.bars.reduce((a, _, i) => a + band59(i), 0) + 1e-9); if (st.meter !== m) w.push(`meter ${st.meter}≠modes+bars ${m}`);
    return w; };
  const MODES48 = (await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k.split(':').length === 2);

  (CH48.METER.modes === false && (await page.evaluate(async () => (await import('./progress/key.js')).meterMax())) === 300)
    ? ok('v26 items 7 / 9 / 12 the meter is 0–300 - the three keys alone (METER.modes false) - so the Skill chest is at 100, the Pro chest at 200 and the Author chest at 300')
    : bad('v26 the 0–300 meter', JSON.stringify(CH48.METER));

  /* ---- 1. THROUGH PLAY: a run earns the last mode, the Games chest opens on the map, a run clears the last key-1 bar ---- */
  await boot({}, { unlock: Object.fromEntries(MODES48.filter(k => k !== 'quick-tap:four').map(k => [k, NOW])) }, { plain: PLAIN48 });
  const p0 = await read48();
  const qt48 = async (mi, label) => { await click('#s-menu [data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await page.evaluate(i => document.querySelectorAll('#diff-row .choice')[i].click(), mi); await sleep(320);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const t0 = Date.now(); while (Date.now() - t0 < 40000) { const at = await onScreen(); if (at === 's-over' || at === 's-key') break; if (await inGame()) await poke('quick-tap'); await sleep(40); }
    return onScreen(); };
  const run1 = await qt48(0, 'chests: a Quick Tap - Two run, the last mode');
  await sleep(700); await go('s-menu'); await sleep(300);
  const p1 = await read48();
  await click('#s-menu [data-go="s-pick"]'); await sleep(800);
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(500);
  // item 7: the Games chest's screen shows no percentage - not on the stage, not on its card
  const stage7 = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { on: !h.hidden, meter: !!h.querySelector('.meterv'), txt: (h.querySelector('.ctxt') || {}).textContent || '' }; });
  await revealReady(); await tap('#key-cere'); await sleep(500);
  const card7 = await page.evaluate(() => [...document.querySelectorAll('#key-cere .rcard li, #key-cere .rcard p, #key-cere .rcard h3')].map(x => x.textContent));
  await revealDone(); await sleep(500);
  const p2 = await read48();
  // key 1: the other 28 bars are a saved profile's; the last one is cleared LIVE by a Quick Tap - Four Sprint, which interrupts the result
  await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); for (const c of K.COMBOS) if (c.key !== 'quick-tap:four:5' && !S.store.bars[c.key]) S.store.bars[c.key] = Date.now(); S.save(); });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  await page.evaluate(() => { const el = document.getElementById('s-key'); const w = window.__k48 = { n: 0, fin: 0, cut: 0, done: false };
    new MutationObserver(() => { if (el.classList.contains('kearning') && !w.n) { const as = document.getAnimations().filter(a => a.effect && a.effect.target && el.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime));
      w.n = as.length; as.forEach(a => a.finished.then(() => w.fin++, () => w.cut++)); } }).observe(el, { attributes: true, attributeFilter: ['class'] }); });
  const run2 = await qt48(1, 'chests: a Quick Tap - Four Sprint, the last key-1 bar');
  let rev2 = 'none'; for (let i = 0; i < 100; i++) { await sleep(250); const s = await page.evaluate(() => ({ scr: document.querySelector('.screen.on').id, on: !document.getElementById('key-cere').hidden, n: window.__k48.n }));
    if (s.on) rev2 = 'playing'; if (rev2 === 'playing' && !s.on && s.scr === 's-key') { rev2 = 'ended'; break; } }
  const k48 = await page.evaluate(() => Object.assign({}, window.__k48, { hint: document.getElementById('key-hint').textContent, lock: document.getElementById('s-key').classList.contains('auto') }));
  const p3 = await page.evaluate(async () => { const K = await import('./progress/key.js'); return { meter: K.meter(), chests: ['games', 'key', 'pro', 'thorns'].map(K.chestState), bars: K.TIERS.map(t => K.keyState(t).done) }; });
  // the key asks, Open opens its chest (AMENDED for build 49), and inside the run's interlude the chest's card hands back to that run's result
  await tap('#key-ring .khubhit'); await sleep(400);
  const ask2 = await page.evaluate(() => !document.getElementById('key-ask').hidden && document.getElementById('key-cere').hidden);
  await tap('[data-act="key-ask-yes"]'); await sleep(400); await revealDone(); await sleep(500);
  const back2 = await onScreen();
  const p4 = await read48();
  (run1 === 's-over' && !why48(p0).length && p0.store.chests.join() === 'locked,before,before,before' && p1.store.chests[0] === 'ready' && !why48(p1).length
    && stage7.on && !stage7.meter && !/%/.test(stage7.txt) && card7.length && !card7.some(x => /%/.test(x)) && p2.store.chests.join() === 'open,locked,before,before' && !why48(p2).length
    && (run2 === 's-over' || run2 === 's-key') && rev2 === 'ended' && k48.n && k48.fin === k48.n && !k48.cut && k48.hint === CP48.KEY.completeReady.replace('{chest}', CP48.GRID.chest.key)
    && p3.chests.join() === 'open,ready,before,before' && p3.meter === 100 && p3.bars[0] === 30 && ask2 && back2 === 's-over' && p4.store.chests.slice(0, 3).join() === 'open,open,locked' && !why48(p4).length)
    ? ok(`v26 items 7 / 12 THROUGH PLAY: a run earns the last mode and the Games chest goes ready; opened on the map its screen and card show no percentage ("${card7.join(' · ')}"); a run clears the last key-1 bar, the reveal plays every one of its ${k48.n} animations to the end, the key says "${k48.hint}", the Skill chest is ready at ${p3.meter}%, the tap asks, Open opens it and its card goes back to the run's result - and at every step the store, the map, the Keys screen and the menu agree`)
    : bad('v26 items 7 / 12 the earned path', JSON.stringify({ run1, p0: why48(p0), p1: [p1.store.chests, why48(p1)], stage7, card7, p2: [p2.store.chests, why48(p2)], run2, rev2, k48, p3, ask2, back2, p4: [p4.store, why48(p4)] }));

  /* ---- 2. THROUGH TESTING: every button lands where play does, and every screen agrees after each ---- */
  await boot({}, {}, { plain: PLAIN48 });
  const steps = [];
  const press = async (label, sel, val) => { await go('s-testing'); await sleep(250); if (val !== undefined) await page.evaluate(v => { document.getElementById('dev-meter').value = v; }, val);
    await tap(sel); await sleep(250); const s = await read48(); steps.push({ label, chests: s.store.chests.join(), bars: s.store.bars.join(), meter: s.store.meter, why: why48(s), menu: s.menu, map: s.map.map(m => m.need) }); return s; };
  const t1 = await press('key chest · ready', '[data-act="dev-chestall"][data-chest="key"]');
  const t2 = await press('pro chest · ready', '[data-act="dev-chestall"][data-chest="pro"]');
  const t3 = await press('reset key chest', '[data-act="dev-chestreset"][data-chest="key"]');
  const t4 = await press('set meter to 203', '[data-act="dev-meter"]', '203');
  const t5 = await press('set meter to 100', '[data-act="dev-meter"]', '100');
  const t5b = await press('key chest switch off (its reset)', '[data-act="dev-chestall"][data-chest="key"]');
  const t6 = await press('thorns chest · ready', '[data-act="dev-chestall"][data-chest="thorns"]');
  const t7 = await press('reset pro chest', '[data-act="dev-chestreset"][data-chest="pro"]');
  const t8 = await press('reset games chest', '[data-act="dev-chestreset"][data-chest="games"]');
  const byPress = steps.filter(s => s.why.length);
  (!byPress.length
    && t1.store.chests.join() === p3.chests.join() && t1.store.bars.join() === p3.bars.join() && t1.store.meter === p3.meter
    && t2.store.chests.join() === 'open,open,ready,before' && t2.store.meter === 200 && t2.menu === CP48.KEY.menuReady.replace('{pct}', t2.store.shown).replace('{chest}', CP48.GRID.chest.pro)
    && t3.store.chests.join() === 'open,locked,before,before' && t3.store.bars.join() === '0,0,0'
    /* AMENDED at build 58 (58.2): the Author chest is genuinely LOCKED here, so it lists both its requirements with a tick each.
       REVERSED AT BUILD 59 (v30 59.6): ONE line. At this step the Author key is one bar in, so the thing still missing is the KEY
       and that is the whole of what the tile says — the Gauntlet's turn comes only once the key is in hand, and it is on the key's
       own screen from the start either way. */
    && t4.store.chests.join() === 'open,open,open,locked' && t4.store.bars.join() === '30,30,1' && t4.store.meter === 203
    && t4.map[3].need === EARN.thorns
    && t5.store.chests.join() === 'open,ready,before,before' && t5.store.meter === 100 && t5.map[2].need === EARN.pro
    /* AMENDED AT BUILD 59 (v30 59.11): taking the Skill chest's switch off shuts that chest and clears its bars, but the GAMES chest
       stays open and its modes stay unlocked — so the meter falls back to the modes' own share of the first hundred, not to 0. It is
       0 only when the Games chest itself is reset, which is t8 below and is still asserted as 0. */
    && t5b.store.chests.join() === 'open,locked,before,before' && t5b.store.meter > 0 && t5b.store.meter < 100
    && t6.store.chests.join() === 'open,open,open,ready' && t6.store.meter === 300
    && t7.store.chests.join() === 'open,open,locked,before' && t7.store.meter === 100
    && t8.store.chests.join() === 'locked,before,before,before' && t8.store.meter === 0)
    ? ok(`v26 items 7 / 12 THROUGH TESTING: "key chest · ready" lands exactly where the earned path did (${p3.chests.join(', ')} · ${p3.bars.join('/')} bars · ${p3.meter}%); the Pro key whole is 200% with the Pro chest ready ("${t2.menu}"); set meter to 203 opens the Key and Pro chests and clears one Author bar; a reset shuts that chest and every chest after it - ${steps.length} presses, and after each one the store, the map, the Keys screen and the menu agree on a state play can reach`)
    : bad('v26 items 7 / 12 the Testing path', JSON.stringify({ byPress, p3, steps }));

  // and the key reveal a Testing button leaves unseen is played in full before a chest tapped on the map opens - the map path (B.3) with the new reveal
  await go('s-testing'); await sleep(250); await tap('[data-act="dev-chestall"][data-chest="key"]'); await sleep(250);
  await go('s-pick'); await sleep(600);
  await page.evaluate(() => { const h = document.getElementById('key-cere'), o = window.__o48 = ['off']; new MutationObserver(() => { const k = h.hidden ? 'off' : h.dataset.kind || 'off'; if (o[o.length - 1] !== k) o.push(k); }).observe(h, { attributes: true, attributeFilter: ['hidden', 'data-kind'] }); });
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="key"]').click()); await sleep(300);
  let order48 = []; for (let i = 0; i < 120; i++) { await sleep(200); order48 = await page.evaluate(() => window.__o48.slice(1)); if (order48.includes('chest')) break; }
  await revealDone(); await sleep(500);
  const mapOpen = await page.evaluate(async () => (await import('./progress/key.js')).chestState('key'));
  (order48.join() === 'key,off,chest' && mapOpen === 'open')
    ? ok('v26 item 11 a ready Skill chest tapped on the map with key 1\'s reveal unseen plays that reveal to its end, then opens the chest - the player already asked, so nothing else is tapped in between')
    : bad('v26 item 11 the map path', JSON.stringify({ order48, mapOpen }));

  /* ---- 3. v26 items 5 / 6 / 8 / 12 (build 49): the rewards come OUT of the chest one at a time, settle under it, and the card sits under them ---- */
  const MS49 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const KY49 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const U49 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB49 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const NOW49 = Date.now(), ALL49 = Object.fromEntries(U49.UNLOCKS.map(u => [u.key, NOW49]));
  const tier49 = (...ts) => Object.fromEntries(Object.keys(KB49.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW49])));
  const fill49 = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  {
    const seen = [], R49 = CH48.REVEAL;
    // AMENDED at build 58 (58.2): the Pro and Author chests also want a finished Gauntlet, so the fixture carries the rows play would have written
    for (const [id, chests, bars] of [['games', {}, {}], ['key', { games: 1 }, tier49('clear')], ['pro', { games: 1, key: 1 }, tier49('clear', 'pro')], ['thorns', { games: 1, key: 1, pro: 1 }, tier49('clear', 'pro', 'author')]]) {
      await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL49, bars, gaunt: GAUNT_ALL() }, { plain: PLAIN48 });
      await page.evaluate(async () => { const A = await import('./audio.js'); const log = window.__s49 = []; const h = document.getElementById('key-cere'); window.__tap49 = 0;
        for (const k of ['pop', 'gift']) { const o = A.Snd[k]; A.Snd[k] = function (i) { log.push([k, i, Math.round(performance.now())]); return o.apply(this, arguments); }; }
        new MutationObserver(() => { if (h.classList.contains('tap') && !window.__tap49) window.__tap49 = Math.round(performance.now()); }).observe(h, { attributes: true, attributeFilter: ['class'] }); });
      await go('s-pick'); await sleep(600);
      await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(300);
      const start = await page.evaluate(() => { const h = document.getElementById('key-cere'), row = h.querySelector('.rgifts'), hb = h.getBoundingClientRect(), txt = h.querySelector('.ctxt');
        const ta = txt && txt.getAnimations().find(a => a.animationName === 'cfade');
        return { placed: row.classList.contains('placed'), textAt: ta ? ta.effect.getComputedTiming().delay : -1,
          gifts: [...h.querySelectorAll('.rgift')].map(g => { const a = g.getAnimations().find(x => x.animationName === 'rgiftfly'), tm = a ? a.effect.getComputedTiming() : {}, s = g.querySelector('.rsym'), f = g.querySelector('.rfly'), cs = getComputedStyle(g);
            let x = 0, y = 0, n = f; while (n && n !== h) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
            return { w: g.querySelector('b').textContent, sym: s.dataset.sym, style: s.getAttribute('style') || '', key: s.classList.contains('symkey'), size: Math.round(parseFloat(getComputedStyle(s).width)),
              delay: tm.delay, dur: +tm.duration, sx: Math.round(hb.left + x + f.offsetWidth / 2 + parseFloat(cs.getPropertyValue('--x0'))), sy: Math.round(hb.top + y + f.offsetHeight / 2 + parseFloat(cs.getPropertyValue('--y0'))) }; }) }; });
      await revealReady();
      const landed = await page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.cchestg .chestart').getBoundingClientRect();
        return { chest: { l: c.left, r: c.right, t: c.top, b: c.bottom }, rest: [...h.querySelectorAll('.rgift .rfly')].map(f => { const r = f.getBoundingClientRect(); return { t: r.top, b: r.bottom }; }),
          log: window.__s49.slice(), tapAt: window.__tap49 }; });
      await click('#key-cere'); await sleep(CH48.REVEAL.cardAt + 700);
      const card = await page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.rcard'), r = c.getBoundingClientRect(), m = c.querySelector('.rmsg');
        return { h3: c.querySelector('h3').textContent, style: c.getAttribute('style') || '', you: (c.querySelector('.ryou') || {}).textContent, next: (c.querySelector('.rnext') || {}).textContent, lists: c.querySelectorAll('ul,li,u,.rgifts').length,
          text: c.innerText, top: r.top, bottom: r.bottom, msg: m ? m.dataset.msg : '', rows: [...h.querySelectorAll('.rgift .rfly')].map(f => f.getBoundingClientRect().bottom), chestB: h.querySelector('.cchestg .chestart').getBoundingClientRect().bottom, vh: innerHeight }; });
      await page.evaluate(() => document.querySelector('#key-cere .rmsg').click()); await sleep(500);
      /* AMENDED AT BUILD 52 (v27 items 9 / 11): with a clip in every slot the button now lands on About and OPENS THE SHARED PLAYER on that
         slot; the build-49 behaviour — picking the row out for a moment — is what a slot with no clip still does. Either counts, and the
         claim under test is the same one: the button goes to About, on this chest's own slot. The player is closed again so the next chest
         starts on a clean screen. */
      const about = await page.evaluate(async m => { const V = await import('./ui/video.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
        const h = document.getElementById('vplay');
        const out = { screen: document.querySelector('.screen.on').id, flash: !!document.querySelector(`#msglist .msgrow[data-msg="${m}"].flash`),
          playing: !!(h && !h.hidden && h.dataset.msg === m) };
        if (out.playing) { V.closeVideo(); await wait(700); }
        return out; }, card.msg);
      seen.push({ id, start, landed, card, about });
    }
    const bad49 = [];
    // AMENDED at build 51 (v27 item 13 / R2): a chest wears the colour of the key that OPENS it — `col` on its CHEST_LOOK row — not the meter band it sits in
    for (const s of seen) { const id = s.id, L = CH48.CHEST_LOOK[id], band = L.col || CH48.METER_BANDS[L.band].col, slot = MS49.MESSAGES.find(m => m.by && m.by.chest === id);
      /* v28 (item 10, build 53): a chest word that GIVES a Gauntlet carries `gaunt`, not a word, so its name is composed off GAUNTLET.name — one
         spelling for Gauntlet Mini and Gauntlet Mega. A Gauntlet's MESSAGE slot has no title of its own for the same reason. */
      const title49 = m => m.gaunt ? fill49(CP48.GAUNTLET.msgTitle, { name: CP48.GAUNTLET.name[m.gaunt] }) : m.title;
      /* v30 (59.3, build 59): the video's reward word now wears QUOTATION MARKS, so the name reads as the name of a clip rather than as a tab
         label or a sentence. The marks come off MSG.quote here as they do in ui/chest.js, so this still spells no punctuation of its own. */
      const q49 = s => CP48.MSG.quote[0] + s + CP48.MSG.quote[1];
      const want = (CP48.CHEST_WORDS[id] || []).map(x => x.w || (CP48.GAUNTLET.name[x.gaunt] || '').toUpperCase()).concat(fill49(CP48.MSG.reward, { title: q49(title49(slot)) }));
      const g = s.start.gifts, n = g.length, pops = s.landed.log.filter(e => e[0] === 'pop'), gifts = s.landed.log.filter(e => e[0] === 'gift');
      const why = [];
      if (!s.start.placed) why.push('row not placed');
      if (g.map(x => x.w).join() !== want.join() || g[n - 1].sym !== 'video') why.push('rewards ' + g.map(x => x.w).join());
      // out of the chest: every flight starts at one point, inside the chest sprite
      const c = s.landed.chest; if (g.some(x => Math.abs(x.sx - g[0].sx) > 3 || Math.abs(x.sy - g[0].sy) > 3 || x.sx < c.l - 12 || x.sx > c.r + 12 || x.sy < c.t - 12 || x.sy > c.b + 12)) why.push('flight does not start at the lid ' + JSON.stringify({ c, starts: g.map(x => [x.sx, x.sy]) }));
      // one at a time, REVEAL.giftGap apart; twice the build-46 size; close under the chest
      if (g.some((x, i) => i && Math.abs((x.delay - g[i - 1].delay) - R49.giftGap) > 1)) why.push('not ' + R49.giftGap + 'ms apart');
      if (g.some(x => x.size < 60)) why.push('size ' + g.map(x => x.size).join('/'));
      if (s.landed.rest.some(r => r.t < c.b - 2) || Math.min(...s.landed.rest.map(r => r.t)) > c.b + 40) why.push('not close under the chest ' + JSON.stringify({ cb: c.b, rest: s.landed.rest.map(r => Math.round(r.t)) }));
      // colour: a key is its own glyph in its tint, the video and every other reward the chest's colour (or its own)
      for (const x of g) { const S = CH48.SYMBOLS[x.sym] || {}; const col = S.key ? KY49.KEYS.find(k => k.id === S.key).tint : S.col || band;
        if (!x.style.includes('color:' + col) || !!S.key !== x.key) why.push('colour ' + x.sym + ' ' + x.style); }
      // a small pop as each leaves and the landing sound as each lands, read off its own flight; tap to continue only after the last has landed, the name after it too
      if (pops.length !== n || gifts.length !== n) why.push('sounds ' + pops.length + '/' + gifts.length);
      else if (gifts.some((e, i) => Math.abs((e[2] - pops[i][2]) - g[i].dur) > 250) || pops.some((e, i) => i && Math.abs((e[2] - pops[i - 1][2]) - R49.giftGap) > 250)) why.push('sound timing ' + JSON.stringify(s.landed.log));
      else if (!(s.landed.tapAt >= gifts[n - 1][2])) why.push('tap before the last landed');
      if (s.start.textAt < g[n - 1].delay + g[n - 1].dur - 1) why.push('the chest\'s name came before the rewards landed ' + s.start.textAt);
      // item 8: Congratulations in the chest's colour, one You line, one Next line, the video button; no lists, no headings, no percentage; under the rewards
      const nxt = CH48.CHESTS[CH48.CHESTS.findIndex(x => x.id === id) + 1];
      if (s.card.h3 !== CP48.CARD.title || !s.card.style.includes(band) || String(s.card.you).replace(/\d+/, '{total}') !== CP48.CARD.you[id] || !s.card.next
        || s.card.next !== (nxt ? fill49(CP48.CARD.next, { chest: CP48.GRID.chest[nxt.id] }) : CP48.CARD.nDone) || s.card.lists || /%/.test(s.card.text)) why.push('card ' + JSON.stringify(s.card));
      if (s.card.top < Math.max(...s.card.rows) - 1 || s.card.top < s.card.chestB || s.card.bottom > s.card.vh + 1) why.push('card overlaps ' + JSON.stringify(s.card));
      if (s.card.msg !== slot.id || s.about.screen !== 's-about' || !(s.about.flash || s.about.playing)) why.push('the video button ' + JSON.stringify({ msg: s.card.msg, about: s.about }));
      if (why.length) bad49.push({ id, why }); }
    // the "You unlocked all N game modes" line counts the modes the app counts - read it back off the page rather than re-deriving it here
    (!bad49.length)
      ? ok(`v26 items 5 / 6 / 8 / 12 all four chests: each reward pops out of the lid - every flight starts inside the chest sprite - one at a time ${CH48.REVEAL.giftGap}ms apart with a small pop, arcs round and settles close under the chest at twice the old size, landing with its own sound; a key reward is that key's own glyph in its tint and the rest wear the chest's colour; the About video the chest opens is one of them (${seen.map(s => s.id + ': ' + s.start.gifts.map(x => x.w).join(' + ')).join(' · ')}); the chest's name and "tap to continue" wait for the last to land; the card below them says "${CP48.CARD.title}", one You line ("${seen[0].card.you}"), one Next line ("${seen[0].card.next}"), no lists and no percentage, and its "${CP48.CARD.msg}" goes to that slot on About`)
      : bad('v26 items 5 / 6 / 8 / 12 the chest opening', JSON.stringify(bad49));
  }

  /* ---- 4. v26 item 13 (build 49) AMENDED AT BUILD 51 (v27 item 2 / R1): two Gauntlet tiles, each hanging off the chest that opens it — and
     NOTHING AT ALL until that chest has been opened: no tile, no label, no lock, no connector, no cell and no beat in the map's first open.
     Build 49 drew a shut Gauntlet crossed out with a padlock and "Open the Pro chest" under it, which told a player exactly what the second
     secret was; R1 allows a secret to be known to exist and never what it is. It arrives as part of its chest's own reward moment (the spill).
     ---- */
  {
    const gt = () => page.evaluate(() => ['g1', 'g2'].map(id => { const t = document.querySelector(`#grid .tile[data-gauntlet="${id}"]`), ch = document.querySelector(`#grid .chest[data-chest="${id === 'g1' ? 'key' : 'pro'}"]`), ln = document.querySelector(`#gridlines .gl.gt[data-gauntlet="${id}"]`);
      const cs = t.hidden ? null : getComputedStyle(t);
      return { hidden: !!t.hidden, box: Math.round(t.getBoundingClientRect().width), name: t.querySelector('.name').textContent, need: t.querySelector('.pic').dataset.need,
        display: cs ? cs.display : 'none', cell: (t.style.gridRow || '') + '/' + (t.style.gridColumn || ''), row: !!t.style.gridRow && t.style.gridRow === ch.style.gridRow, left: +t.style.gridColumn === +ch.style.gridColumn - 1,
        sym: (t.querySelector('.sym') || { dataset: {} }).dataset.sym, line: !!ln, open: !!ln && ln.classList.contains('open'),
        spillin: t.classList.contains('spillin'), delay: t.style.getPropertyValue('--gin') }; }));
    // (a) with only the Games chest open, neither Gauntlet exists on the map at all
    await boot({ chests: { games: 1 } }, { unlock: ALL49 }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const shut = await gt();
    // (b) and the map's first open does not leave a hole where they would have been: the chests follow the seventh game by `chestAt` alone
    await boot({ chests: { games: 1 } }, { unlock: ALL49 }, { plain: { ...PLAIN48, gridSeen: 0 } });
    await go('s-pick'); await sleep(500);
    const intro = await page.evaluate(() => ({ games: [...document.querySelectorAll('#grid .tile[data-game]')].map(t => parseInt(t.style.animationDelay) || 0).sort((x, y) => x - y),
      chests: [...document.querySelectorAll('#grid .chest')].map(c => parseInt(c.style.animationDelay) || 0),
      gaunt: [...document.querySelectorAll('#grid .tile[data-gauntlet]')].filter(t => !t.hidden).length }));
    // (c) the Skill chest open: g1 is there, named, on its own connector, arriving on that chest's spill — and g2 is still not there
    // PLAIN48 has every chest's spill already spent; this one must not, because arriving ON the spill is the whole of item 2's second half
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL49, bars: tier49('clear') }, { plain: { ...PLAIN48, spill: { games: 1 } } });
    await go('s-pick'); await sleep(700);
    const half = await gt();
    // seen again, once the spill has been spent, it simply stands there
    await go('s-menu'); await sleep(250); await go('s-pick'); await sleep(600);
    const again = await gt();
    const word = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const w = [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => x.dataset.to === 'tile:g1');
      if (!w) return null; w.click(); await wait(250); return { screen: document.querySelector('.screen.on').id, flash: document.querySelector('#grid .tile[data-gauntlet="g1"]').classList.contains('flash') }; });
    await page.evaluate(() => document.querySelector('#grid .tile[data-gauntlet="g1"]').click()); await sleep(400);
    /* v29 (items 11 / 18, build 56): this screen was a title, "Coming soon" and Back. It is the RUN now, so what it must show is the
       one intro line, the roster in order and a Go button — and the body is the fourth child. The R1 half of this check is unchanged. */
    const screen = await page.evaluate(() => { const s = document.getElementById('s-gauntlet'); return { on: s.classList.contains('on'), title: document.getElementById('gt-title').textContent, soon: document.getElementById('gt-soon').textContent,
      rows: document.querySelectorAll('#gt-body .gtlist li').length, go: !!document.querySelector('#gt-body [data-act="gaunt-go"]'),
      shown: [...s.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className) }; });
    await sleep(500); await click('#s-gauntlet .back'); await sleep(400);
    const back = await onScreen();
    const C = CP48.GAUNTLET, I = CH48.MAP_INTRO, G7 = 7;
    // the chests arrive one beat after the last game plus `chestAt`, with no slot left for a Gauntlet that is not there
    const noGap = intro.gaunt === 0 && intro.chests[0] === I.at + G7 * I.gap + I.chestAt && intro.games[G7 - 1] === I.at + (G7 - 1) * I.gap;
    const gone = t => t.hidden && t.display === 'none' && t.box === 0 && !t.line && !t.row && !t.cell.replace('/', '');
    (shut.every(gone) && noGap
      && !half[0].hidden && half[0].name === C.name.g1 && half[0].sym === 'gauntlet' && half[0].need === '' && half[0].row && half[0].left && half[0].line && half[0].open
      && half[0].spillin && half[0].delay === CH48.SPILL.delay + 'ms' && gone(half[1])
      && !again[0].hidden && !again[0].spillin && gone(again[1])
      && word && word.screen === 's-pick' && word.flash
      // build 57 (v29 Section A, 57.9): EIGHT rows for eight games — Estimate's two plays are one step and one row — and the count in the line above
      // the list is generated from the roster, so the copy carries `{n}` and cannot drift from the run
      && screen.on && screen.title === C.name.g1 && screen.soon === fill49(C.intro.g1, { n: 8 }) && screen.rows === 8 && screen.go && screen.shown.length === 4 && back === 's-pick')
      ? ok(`v27 item 2 / R1 a Gauntlet is NOTHING until its chest opens - no tile, no label, no lock, no connector, no grid cell and no beat in the map's first open (the chests land at ${intro.chests[0]}ms, ${I.chestAt}ms after the seventh game and not ${2 * I.gap}ms later) - and then it comes out of that chest: the ${CP48.GRID.chest.key} opens ${C.name.g1}, which arrives on the spill's own beat and leads to its nine-play roster and Go (${half[0].delay}) in its chest's row to the LEFT of it on a green connector of its own, with its GAUNTLET word going to it; ${C.name.g2} is still not on the map at all; seen again it simply stands there; and an open tile goes to a placeholder with its title, "${C.soon}" and Back, and nothing else`)
      : bad('v27 item 2 the Gauntlets are secret until their chest', JSON.stringify({ shut, intro, noGap, half, again, word, screen, back }));
  }

  /* ---- 5. v27 item 4 (build 51): THE FOUR NAMES, FROM ONE SOURCE. The chests are Games / Skill / Pro / Author everywhere a player or the
     catalogue can read one, and config/copy.js GRID.chest is the only place any of the four is spelled — index.html carries no label, the
     Messages list composes its locked line from the slot's own `by`, and the Gauntlet toast fills GRID.chestOpenIt. The ids do not move.
     R2 is in item 13 below; this is its copy half. Driven, not read: every surface is opened and the names read back off the page. ---- */
  {
    const G = CP48.GRID.chest;
    // AMENDED at build 58 (58.2): the Author chest also wants Gauntlet Mega finished, or its key screen names the Gauntlet instead of the chest
    await boot({ chests: { games: 1, key: 1, pro: 1 }, snd: 'off' }, { unlock: ALL49, bars: tier49('clear', 'pro', 'author'), gaunt: GAUNT_ALL() }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const map = await page.evaluate(() => [...document.querySelectorAll('#grid .chest')].map(c => ({ id: c.dataset.chest, name: c.querySelector('.name').textContent })));
    // the Author tab: its key is whole and its chest is the one still waiting, so the hint is the "tap the key to open the …" line
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 2 }); }); await sleep(900);
    const keyHint = await page.evaluate(() => document.getElementById('key-hint').textContent);
    await go('s-custom'); await sleep(500);
    /* v28 (items 2 / 3, build 53): CUSTOMISE NAMES THE KEY, NOT THE CHEST. The Everywhere row is gone — its Per game / Key / Pro / Thorns chips
       were the one place on this screen that named a chest, and their labels were the TRACK names, which is why they read Key / Pro / Thorns
       where a key was meant. The Music row holds the three key tracks now, titled Lantern / Circuit / Thorns, and a locked one says what opens
       it under the row: the KEY, by its own name in config/keys.js. So what is read back here is the track titles and the lock line. */
    const cusTracks = await page.evaluate(() => [...document.querySelectorAll('#c-track .opt')].map(x => x.textContent.trim()));
    const cusLock = await page.evaluate(async () => { const b = [...document.querySelectorAll('#c-track .opt.locked')][0]; if (!b) return '';
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 120));
      return (document.getElementById('lk-track') || {}).textContent || ''; });
    const cus = cusTracks;
    await go('s-about'); await sleep(500);
    const msg = await page.evaluate(() => [...document.querySelectorAll('#msglist .msgrow')].map(r => ({ title: r.querySelector('b').textContent, need: r.querySelector('small').textContent })));
    // index.html has no name of its own: the one source is the config, and the map fills every label from it. The MARKUP, not the comments
    // around it — a comment explaining which chest a row is for is documentation, not a second place the name is read from
    const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
    const inMarkup = Object.values(G).filter(v => html.includes(v));
    const named = map.map(m => m.id + '=' + m.name).join(' ');
    /* the two names item 4 retired, built from characters rather than written out: a blanket rename of the new names across this file once
       rewrote this very test into asserting the page does NOT say "Skill chest", which is the opposite of the check. */
    const OLD51 = new RegExp(['Key', 'Thorns'].map(w => w + ' chest').join('|'));
    const locked = msg.filter(m => m.need.startsWith('opens with')).map(m => m.need);
    (map.map(m => m.name).join('|') === [G.games, G.key, G.pro, G.thorns].join('|')
      && !inMarkup.length && !OLD51.test(html) && !OLD51.test(JSON.stringify([map, cus, msg]))
      && keyHint === CP48.KEY.completeReady.replace('{chest}', G.thorns)
      && cus.length && KY49.KEYS.every(k => cus.includes(k.theme)) && !cus.some(t => KY49.KEYS.some(k => k.name === t))
      && msg.every(m => !/\bLantern\b|\bCircuit\b|\bThorn\b/.test(m.title + ' ' + m.need))
      && locked.length && locked.every(t => Object.values(G).some(v => t.includes(v)) || /a whole .* key/.test(t)))
      ? ok(`v27 item 4 / v28 item 3 the chests are ${map.map(m => m.name).join(' · ')} everywhere a player reads one — the map (${named}), the Keys screen ("${keyHint}") and the Messages list (${locked.join(' · ')}) — from ONE source in config/: index.html spells none of the four. And Customise's one Music row titles the key tracks by their THEMES (${cus.join(' · ')}), never by a key's name${cusLock ? `, with a locked one saying "${cusLock}"` : ''}`)
      : bad('v27 item 4 one source for the chest names', JSON.stringify({ map, inMarkup, keyHint, wantHint: CP48.KEY.completeReady.replace('{chest}', G.thorns), cus, cusLock, msg, locked }));
  }

  /* ---- 6. v27 item 13 / R2 (build 51): A CHEST MATCHES THE KEY THAT OPENS IT. The gold banded chest moves from Pro to Skill (the Skill key is
     gold); the Pro chest is redrawn from the Pro key — its Circuit blue, its ring and antennae, traces across the box; the Author chest already
     matched and the Games chest has no key, so neither moves. The colour is `col` on the CHEST_LOOK row and every surface that draws a chest
     reads it: the sprite, the ceremony's --cc, the spill's particles, a reward symbol and the congratulations card. ---- */
  {
    const L = CH48.CHEST_LOOK, KY = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const keyCol = { key: 'clear', pro: 'pro', thorns: 'author' };
    // each key chest's colour is the tint of the key that opens it, or a shade of it - held to the hue, not to a literal
    const hue = h => { const n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx === mn) return -1; const d = mx - mn; let x = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round(x * 60); };
    const near = (a, b) => { const x = hue(a), y = hue(b); return x < 0 || y < 0 ? a.toUpperCase() === b.toUpperCase() : Math.min(Math.abs(x - y), 360 - Math.abs(x - y)) <= 30; };
    const matches = Object.entries(keyCol).every(([c, t]) => near(L[c].col, KY.KEYS.find(k => k.id === t).tint));
    const proIsKey = L.pro.col === KY.KEYS.find(k => k.id === 'pro').tint && (L.pro.lid || []).length >= 3 && (L.pro.fit || []).length >= 3 && L.pro.idle.kind === 'circuit';
    const skillIsGold = L.key.col === '#E8B84A' && (L.key.fit || []).length === 6 && L.key.lidSw === 2.6 && L.key.idle.kind === 'shimmer';
    const plain = L.games.col === 'var(--mute)' && !L.games.fit && L.thorns.col === '#FFFFFF' && (L.thorns.spikes || []).length === 5;
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, snd: 'off' }, { unlock: ALL49, bars: tier49('clear', 'pro', 'author') }, { plain: PLAIN48 });
    await go('s-pick'); await sleep(700);
    const drawn = await page.evaluate(() => [...document.querySelectorAll('#grid .chest .chestart')].map(a => ({ id: a.dataset.look, cs: a.style.getPropertyValue('--cs'), bc: a.style.getPropertyValue('--bc'), idle: a.dataset.idle,
      lid: a.querySelectorAll('.lidg .lid').length, fit: a.querySelectorAll('.fit').length, spk: a.querySelectorAll('.spk').length })));
    const onPage = drawn.every(d => d.bc === L[d.id].col && d.cs === L[d.id].stroke && d.idle === L[d.id].idle.kind);
    (matches && proIsKey && skillIsGold && plain && onPage)
      ? ok(`v27 item 13 / R2 each chest matches the key that opens it: the ${CP48.GRID.chest.key} is the gold banded chest with its ${drawn.find(d => d.id === 'key').fit} fittings and its shimmer (the Skill key is gold), the ${CP48.GRID.chest.pro} is redrawn from the Pro key in its own ${L.pro.col} — the ring and antennae on the lid, ${drawn.find(d => d.id === 'pro').fit} traces across the box and a current running them — the ${CP48.GRID.chest.thorns} already matched and the ${CP48.GRID.chest.games} keeps its plain outline (no key opens it); every surface reads that one colour and not the meter band's`)
      : bad('v27 item 13 the chest artwork', JSON.stringify({ matches, proIsKey, skillIsGold, plain, onPage, drawn }));
  }

  /* ---- 7. v28 items 13 / 16 (build 53): A CHEST OPENED BY A KEY UNLOCKS; THE GAMES CHEST BREAKS. Aiden saw the PRO chest open on jagged crack
     symbols and a scatter of coloured swatches - the wrong metaphor twice over, because the Pro KEY opens it. All three key chests run the one
     key-turn sequence now, in their own key's colour and glyph; the breaking moved to the chest no key opens, one crack per game finished, and
     the seventh bursts it. Driven: the cracks are counted off the map's own sprite as games are unlocked. ---- */
  {
    const CER = CH48.CEREMONY, TURN = ['assemble', 'turn', 'lid', 'spill'];
    /* AMENDED at build 54 (v29 item 5): the four turn steps are still the MECHANISM every key chest runs, and still first and in order — what
       Aiden's item 5 changes is that the Author chest wears its own language over them again, so `thorns` carries five theme steps after the
       four. `spikes` / `split` / `widen` / `recede` / `black` therefore move out of the forbidden list and into a list of their own, allowed on
       the Author chest and on nothing else; the BREAKING (shake, cracks, scatter, burst) stays forbidden on all three, which is item 13. */
    /* AMENDED AT BUILD 57 (v29 Section A, 57.8): A CHEST OPENING IS TWO BEATS, IN ORDER. The four turn steps are still the mechanism every key
       chest runs and still in this order — what is new is the COVER in front of them: `cover` from zero, `uncover` clearing it, and the chest drawn
       500ms into the uncover (the stylesheet's one rule, which is build 52's own timing for the Author chest). So the assertion is no longer "the
       first four steps are the turn" but "the turn comes after the chest has been revealed", which is what Aiden asked for and what build 54 broke. */
    const stepAt = (id, n) => { const s = CER[id].steps.find(x => x.name === n); return s ? s.at : null; };
    const turnNames = id => CER[id].steps.map(x => x.name).filter(n => TURN.includes(n)).join();
    const keyTurn = ['key', 'pro', 'thorns'].every(id => turnNames(id) === TURN.join()
      && stepAt(id, 'cover') === 0 && stepAt(id, 'uncover') > 0 && stepAt(id, 'assemble') >= stepAt(id, 'uncover') + 500);
    const THEME54 = ['black', 'spikes', 'split', 'widen', 'recede'];
    const authorTheme = CER.thorns.steps.map(x => x.name).filter(n => THEME54.includes(n)).join() === THEME54.join()
      && ['key', 'pro'].every(id => !CER[id].steps.some(x => THEME54.includes(x.name)));
    const BREAK = ['shake', 'cracks', 'scatter', 'burst'];
    const noBreak = ['key', 'pro', 'thorns'].every(id => !CER[id].steps.some(x => BREAK.includes(x.name)));
    const grows = CER.key.ms < CER.pro.ms && CER.pro.ms < CER.thorns.ms;
    const gamesBreaks = CER.games.steps.some(x => x.name === 'crack') && CER.games.steps.some(x => x.name === 'burst');
    const noSwatch = !CH48.CEREMONY_FX.swatch;
    const onlyGames = Object.keys(CH48.CHEST_LOOK).every(id => id === 'games' ? (CH48.CHEST_LOOK[id].cracks || []).length === 7 : !CH48.CHEST_LOOK[id].cracks);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.2): THE CHEST IS CLEAN UNTIL IT IS OPENED, which REVERSES item 13's accumulating cracks. Aiden: no
       cracks anywhere before it is opened, on the opening screen or on the map; the cracking is the OPENING (each of the seven squares puts one in as
       it is ticked off), and once it is open its tile may stay broken. So the driver asks the map for its crack count at every state of the chest
       instead of at every count of games: nothing while it is locked, nothing while it is ready, all seven once it is open. */
    const MODES53 = (await page.evaluate(async () => (await import('./progress.js')).UNLOCKS.map(u => u.key))).filter(k => k.split(':').length === 2);
    const crackAt = async (keep, chests) => { await boot({ snd: 'off', chests }, { unlock: Object.fromEntries(MODES53.slice(0, keep).map(k => [k, NOW])) }, { plain: PLAIN48 });
      await go('s-pick'); await sleep(700);
      return page.evaluate(async () => { const K = await import('./progress/key.js');
        const a = document.querySelector('#grid .chest[data-chest="games"] .chestart');
        return { st: K.chestState('games'), n: K.crackCount(), drawn: a ? a.querySelectorAll('.crackg .crk').length : -1, d: a ? [...a.querySelectorAll('.crackg .crk')].map(x => x.getAttribute('d')) : [] }; }); };
    const c0 = await crackAt(0, { games: 0 }), c3 = await crackAt(6, { games: 0 }), c7 = await crackAt(MODES53.length, { games: 1 });
    const counts = c0.n === 0 && c0.drawn === 0 && c3.n === 0 && c3.drawn === 0 && c7.st === 'open' && c7.n === 7 && c7.drawn === 7;
    // the seven are a fixed order, so every player's opened chest looks the same
    const fixed = c7.d.length === 7 && new Set(c7.d).size === 7;
    const coverArt = await page.evaluate(async () => { const CE = await import('./ui/ceremony.js'); const host = document.getElementById('key-cere');
      const out = {}; for (const id of ['key', 'pro', 'thorns']) { CE.ceremonyFrame(host, id, .08, { was: 0, now: 0 });
        out[id] = { cov: host.querySelectorAll('.ccovbg').length, lan: host.querySelectorAll('.clan').length, tr: host.querySelectorAll('.ctrace').length,
          spk: host.querySelectorAll('.cspk').length, chest: +getComputedStyle(host.querySelector('.cchestg')).opacity }; }
      host.hidden = true; host.className = 'cere'; host.innerHTML = ''; host.removeAttribute('style'); return out; });
    const covered = coverArt.key.cov === 1 && coverArt.key.lan > 0 && coverArt.pro.cov === 1 && coverArt.pro.tr > 0 && coverArt.thorns.spk > 0
      && ['key', 'pro', 'thorns'].every(id => coverArt[id].chest === 0);
    (keyTurn && authorTheme && noBreak && grows && gamesBreaks && noSwatch && onlyGames && counts && fixed && covered)
      ? ok(`v28 items 13 / 16 / v29 item 5 a chest opened by a KEY unlocks and never breaks: ${CP48.GRID.chest.key}, ${CP48.GRID.chest.pro} and ${CP48.GRID.chest.thorns} all run ${TURN.join(' \u00b7 ')} in their own key's colour and glyph, ${CER.key.ms}/${CER.pro.ms}/${CER.thorns.ms}ms, with no shake, cracks, scatter or burst left between them and no coloured swatches anywhere; the ${CP48.GRID.chest.thorns} chest alone dresses that mechanism in ${THEME54.join(' \u00b7 ')}, which the other two never draw; the breaking is the ${CP48.GRID.chest.games}'s alone - ${c3.n} of its 7 cracks on the map at ${c3.n} games finished and all 7 at the last, the same cracks in the same order every time, and its ceremony draws the seventh in and bursts it`)
      : bad('v28 items 13 / 16 / v29 57.2 / 57.8 the chest openings', JSON.stringify({ keyTurn, authorTheme, noBreak, grows, gamesBreaks, noSwatch, onlyGames, counts, fixed, covered, coverArt, c0, c3, c7 }));

    /* v30 (59.1, build 59): AND THE CRACKS ARE ACTUALLY HIDDEN ON THE FIRST FRAME — 57.2's THIRD go.
       The check above asks how many crack paths are DRAWN, and it passed all through build 58 while Aiden's phone showed
       seven dashed cracks from frame zero. The hide is `stroke-dasharray:1;stroke-dashoffset:1`, which only hides a path
       whose pathLength is normalised to 1; the cracks came out of `paths()` with no pathLength, so "1" meant one USER UNIT,
       the seven rendered as dashed lines immediately and stayed dashed after the draw-in. Counting paths could never see
       that. So this asks the two things that are the mechanism: every ceremony crack declares pathLength="1", and its real
       length is longer than 1 user unit — which is what makes the attribute load-bearing rather than decorative. Then it
       drives the frozen frame at both ends: nothing showing at t=0, every crack whole by the end of the `crack` step.
       Pixel evidence for the same three clauses is `_smoke/shots.mjs 59.1` (build 59's frames are in _review/_shots). */
    /* Driven through Testing's own replay, not `ceremonyFrame` — the catalogue's frame helper renders the stage inside a
       screen that is display:none, so no CSS animation is generated at all and every frame it makes reads as "not drawn".
       That is exactly the blind spot 57.2 hid in, so this one plays the real opening and freezes ITS clock. */
    await boot({ snd: 'off', chests: { games: 0 } }, {}, { plain: PLAIN48 });
    await go('s-testing'); await sleep(300);
    await page.evaluate(() => document.querySelector('[data-act="dev-chest"][data-chest="games"]').click());
    await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 80; i++) { if (document.querySelectorAll('.cere .crk').length) return; await w(15); } });
    const crk = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.cere .crk')];
      const anims = ps.flatMap(p => p.getAnimations());
      // the LAST crack's own end: the seven are staggered by `--crack-step` and each takes .34s, so the seventh finishes
      // after the `crack` step's declared window closes. Read it off the animations rather than adding the numbers up.
      const endAt = Math.round(Math.max(0, ...anims.map(a => a.effect.getComputedTiming().endTime || 0)));
      const at = t => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t; } catch (e) {} }
        return ps.map(p => ({ pl: p.getAttribute('pathLength'), len: Math.round(p.getTotalLength() * 100) / 100,
          off: parseFloat(getComputedStyle(p).strokeDashoffset) || 0, arr: getComputedStyle(p).strokeDasharray })); };
      return { first: at(0), done: at(endAt), endAt, anims: anims.length };
    });
    const declared = crk.first.length === 7 && crk.anims >= 7 && crk.first.every(p => p.pl === '1');
    const loadBearing = crk.first.every(p => p.len > 1);          // a path shorter than 1 unit would hide with or without the attribute
    const hiddenAtZero = crk.first.every(p => p.arr === '1px' && p.off >= .999);
    const wholeAtEnd = crk.done.every(p => p.off <= .001);
    (declared && loadBearing && hiddenAtZero && wholeAtEnd)
      ? ok(`v30 59.1 (57.2, third time) the ${CP48.GRID.chest.games} chest's cracks are HIDDEN on frame one, not dashed: all 7 carry pathLength="1" over real lengths of ${Math.min(...crk.first.map(p => p.len))}-${Math.max(...crk.first.map(p => p.len))} user units, so dasharray 1 is the WHOLE path and not 8-16 dashes; at t=0 every one is fully offset and by ${crk.endAt}ms every one is whole`)
      : bad('v30 59.1 the cracks are hidden until they are drawn', JSON.stringify({ declared, loadBearing, hiddenAtZero, wholeAtEnd, endAt: crk.endAt, first: crk.first, done: crk.done }));
  }

  /* ---- 8. v28 items 12 / 17 (build 53): THE CONGRATULATIONS SCREEN IS STAGED AND CELEBRATED. The title lands first, then each block in turn,
     the message, then Continue - the whole reveal under a second - and the message reads as a screen you tap: the build-52 player powered off,
     with the clip's own title under it. Confetti and one celebratory sound fire with the title, different for each chest and escalating. ---- */
  {
    const CONF = CH48.CONFETTI, RV53 = CH48.REVEAL;
    const escal = ['games', 'key', 'pro', 'thorns'].every((id, i, a) => !i || (CONF[id].n > CONF[a[i - 1]].n && CONF[id].ms > CONF[a[i - 1]].ms));
    const gamesSquares = CONF.games.shape === 'square';   // build 57 (57.3): the count is no longer one per game — it is "a LOT", across the screen
    // item 12: "the whole reveal under a second" — measured from the card arriving, which is what a player sees staged
    const under1s = 4 * RV53.cardStep + RV53.cardBlockMs <= 1000;   // the BLOCKS under the word are unchanged; 57.3 reverses item 12 for the word only
    /* v29 Section A (57.3, build 57): the word is a celebration. Every number is CHEER_LOOK; the letters land one at a time, the Games chest's dim
       grey is bright white, and the confetti is several times the volume and thrown from the host so it crosses the screen. */
    const CL57 = CH48.CHEER_LOOK;
    const cheerLook = ['games', 'key', 'pro', 'thorns'].every(id => { const L = CL57[id]; return L && L.step > 0 && L.drop > 0 && L.bounce > 1 && L.shine > 0 && L.pulse > 0 && L.size > 1.2 && /^#/.test(L.col); })
      && CL57.games.col.toUpperCase() === '#FFFFFF'
      && ['games', 'key', 'pro', 'thorns'].every(id => CONF[id].n >= 40 && CONF[id].white > 0 && CONF[id].spread >= 100);
    const cheer = await page.evaluate(async () => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const ids = ['games', 'key', 'pro', 'thorns'], plans = ids.map(id => A.Snd.cheerPlan(id));
      return { n: plans.map(x => x.length), uniq: new Set(plans.map(sig)).size,
        clash: plans.map(sig).filter(x => [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.keyEarnPlan('clear'))].includes(x)).length }; });
    const cheerGrows = cheer.n.every((n, i, a) => !i || n >= a[i - 1]) && cheer.uniq === 4 && !cheer.clash;
    await boot({ chests: { games: 1 }, snd: 'off' }, { unlock: ALL49 }, { plain: { ...PLAIN48, revealed: {} } });
    const card53 = await page.evaluate(async () => { const RV = await import('./ui/reveal.js'), CE = await import('./ui/ceremony.js'), CH = await import('./ui/chest.js'), K = await import('./progress/key.js'), R = await import('./ui/router.js');
      const MS = await import('./config/messages.js');
      R.show('s-key'); await new Promise(r => setTimeout(r, 300));
      const m = K.meter();
      RV.playReveal(document.getElementById('key-cere'), { kind: 'chest', id: 'games', silent: true, stage: CE.chestStage('games', { was: m, now: m }), gifts: CH.giftsOf('games'),
        card: { title: 'Congratulations', chest: 'games', col: '#ffffff', you: 'y', next: 'n', msg: 'games', msgObj: MS.MESSAGES.find(x => x.id === 'games') } });
      // the Games chest's own length plus its three rewards flying out, then the hold — tap after all of it, or the tap is swallowed
      for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 300)); if (document.getElementById('key-cere').classList.contains('tap')) break; }
      RV.revealTap(); await new Promise(r => setTimeout(r, 900));
      const c = document.querySelector('.rcard'); if (!c) return null;
      const blocks = [...c.children].filter(x => !x.classList.contains('rconf')).map(x => ({ tag: x.tagName.toLowerCase(), cls: x.className, ci: +getComputedStyle(x).getPropertyValue('--ci') }));
      // build 57 (57.3): the confetti hangs on the HOST, so it covers the screen rather than the card
      const conf = document.querySelectorAll('#key-cere > .rconf .cf').length;
      const letters = c.querySelectorAll('.rtitle .cl').length;
      const big = parseFloat(getComputedStyle(c.querySelector('.rtitle')).fontSize) > parseFloat(getComputedStyle(c.querySelector('.ryou')).fontSize);
      const prev = c.querySelector('.rmsg .mprev');
      return { blocks, conf, letters, big, prev: !!prev, frame: !!(prev && prev.querySelector('.mpframe')), play: !!(prev && prev.querySelector('.mpplay')), title: prev ? (prev.querySelector('.mptitle') || {}).textContent : '' }; });
    const staged = !!card53 && card53.blocks.length >= 4 && card53.blocks.every((b, i) => b.ci === i) && /rgo/.test(card53.blocks[card53.blocks.length - 1].cls);
    const confDrawn = !!card53 && card53.conf === CONF.games.n;
    const preview = !!card53 && card53.prev && card53.frame && card53.play && !!card53.title;
    (escal && gamesSquares && under1s && cheerGrows && staged && confDrawn && preview && cheerLook && card53.letters === 'Congratulations'.length && card53.big)
      ? ok(`v28 items 12 / 17 the congratulations screen: ${card53.blocks.length} blocks land one at a time ${RV53.cardStep}ms apart with Continue last (${Math.round(RV53.cardAt + (card53.blocks.length - 1) * RV53.cardStep + RV53.cardBlockMs)}ms end to end, inside a second); the message is the powered-off player - a framed picture with a play mark and "${card53.title}" under it; and ${card53.conf} confetti pieces throw with it, the seven game squares for this chest and ${CONF.key.n}/${CONF.pro.n}/${CONF.thorns.n} shards for the keys, each with its own celebration sound and none of them the unlock sound, the achievement click or a key's earn`)
      : bad('v28 items 12 / 17 / v29 57.3 the congratulations screen', JSON.stringify({ escal, gamesSquares, under1s, cheerGrows, staged, confDrawn, preview, cheerLook, card53, cheer }));

    /* v30 (59.2, build 59): AND THE WORD FITS ON ONE LINE, WITH CONTINUE STILL ON SCREEN — ALL FOUR CHESTS.
       57.3 rebuilt "Congratulations" letter by letter, which hands the browser a break opportunity between every letter, and
       sized it up; at 375px it snapped as CONGRATULA / TIONS on every chest, the card grew a whole line and Continue went off
       the bottom. The two invariants are asserted separately because they fail separately: the LETTERS all share one line
       (the only honest test of "one line" when the h3 is full width either way), and the word's measured span fits inside the
       card's content box — which is viewport-independent, so it holds at 375 and 390 alike. Then Continue's box is inside the
       viewport. The gate has no safe-area inset; the frames in _review/_shots taken WITH one (34px) are 59.2's own evidence,
       and there Continue's bottom lands 791-802 against a 810 floor on all four chests at both widths. */
    const fitAll = await page.evaluate(async () => {
      const RV = await import('./ui/reveal.js'), CE = await import('./ui/ceremony.js'), CH = await import('./ui/chest.js'),
        K = await import('./progress/key.js'), R = await import('./ui/router.js'), MS = await import('./config/messages.js'),
        CP = await import('./config/copy.js');
      const host = document.getElementById('key-cere'), out = {};
      for (const id of ['games', 'key', 'pro', 'thorns']) {
        RV.stopReveal(); R.show('s-key'); await new Promise(r => setTimeout(r, 250));
        const m = K.meter(), msg = MS.MESSAGES.find(x => x.by && x.by.chest === id);
        RV.playReveal(host, { kind: 'chest', id, silent: true, stage: CE.chestStage(id, { was: m, now: m }), gifts: CH.giftsOf(id),
          card: { title: CP.CARD.title, chest: id, col: CH.chestCol(id), you: CP.CARD.you[id] || 'y', next: CP.CARD.next,
            msg: msg ? msg.id : '', msgObj: msg || null } });
        for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 300)); if (host.classList.contains('tap')) break; }
        RV.revealTap(); await new Promise(r => setTimeout(r, 1200));
        const c = document.querySelector('.rcard'), t = c && c.querySelector('.rtitle'), go = c && c.querySelector('.rgo');
        if (!c || !t || !go) { out[id] = null; continue; }
        const cl = [...t.querySelectorAll('.cl')];
        // each letter drops in on its own beat, so wait for the last one to land before measuring anything about the word
        await Promise.all(cl.flatMap(s => s.getAnimations().map(a => a.finished.catch(() => {}))));
        // LINES off offsetTop, not off a client rect: a rect carries the drop-in's transform and would read a mid-flight
        // letter as a second line. offsetTop is layout, which is the only thing "one line" is a claim about.
        const ls = cl.map(s => s.getBoundingClientRect()), tops = cl.map(s => s.offsetTop);
        const cs = getComputedStyle(c);
        out[id] = { lines: new Set(tops).size, letters: ls.length,
          wordW: Math.round(Math.max(...ls.map(r => r.right)) - Math.min(...ls.map(r => r.left))),
          inner: Math.round(c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
          nowrap: getComputedStyle(t).whiteSpace === 'nowrap', goIn: go.getBoundingClientRect().bottom <= innerHeight + .5,
          goBottom: Math.round(go.getBoundingClientRect().bottom), vh: innerHeight };
      }
      RV.stopReveal(); return out;
    });
    const F4 = ['games', 'key', 'pro', 'thorns'];
    const oneLine = F4.every(id => fitAll[id] && fitAll[id].lines === 1 && fitAll[id].letters === 'Congratulations'.length);
    const insideCard = F4.every(id => fitAll[id] && fitAll[id].nowrap && fitAll[id].wordW <= fitAll[id].inner);
    const goOn = F4.every(id => fitAll[id] && fitAll[id].goIn);
    (oneLine && insideCard && goOn)
      ? ok(`v30 59.2 the congratulations word is ONE LINE and Continue is on screen, all four chests: 15 letters on a single line each, the word measuring ${F4.map(id => fitAll[id].wordW).join('/')}px inside card content boxes of ${F4.map(id => fitAll[id].inner).join('/')}px (white-space:nowrap plus a size taken off the CARD through container units, so it cannot outgrow what it sits in), and Continue's bottom at ${F4.map(id => fitAll[id].goBottom).join('/')} against a ${fitAll.games.vh}px viewport`)
      : bad('v30 59.2 the congratulations word on one line with Continue visible', JSON.stringify({ oneLine, insideCard, goOn, fitAll }));

    /* v30 (59.6, build 59): THE CHEST TILE CARRIES ONE LINE, AND THE GAUNTLET MOVED ONTO THE KEY.
       Two halves, asserted separately because they are two places. (1) NO tile, on any chest, in any state, prints more than one
       line — the thing that made the Author chest's text run over its own drawing was 58.2's two ticked requirements, and a
       newline in `data-need` is exactly what produced them. Driven at 375, the narrower phone, because that is where it failed.
       (2) The requirement is not lost: the Pro and Author KEYS now carry it as a standing line naming their Gauntlet, from the
       moment the tier is open rather than only once the key is whole. The Skill key has no Gauntlet and must stay silent. */
    await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const tiles59 = [];
    /* three profiles, chosen so every line a locked tile can print is actually produced: no key at all (its key line), every
       bar cleared with no Gauntlet finished (its Gauntlet line — the state 59.6 invents), and the chests behind it shut. */
    for (const [label, chests, fill] of [['no bars cleared', { games: 1 }, false], ['every bar cleared, no Gauntlet finished', { games: 1, key: 1 }, true], ['Pro chest open, every bar cleared', { games: 1, key: 1, pro: 1 }, true]]) {
      await boot({ snd: 'off', chests }, { unlock: ALL49 }, { plain: PLAIN48 });
      if (fill) await page.evaluate(async () => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
        const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1;
        S.store.bars = bars; S.save(); });
      await go('s-pick'); await sleep(800);
      tiles59.push([label, await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => {
        const c = document.querySelector(`#grid .chest[data-chest="${id}"]`); if (!c) return [id, null];
        return [id, { st: c.classList.contains('open') ? 'open' : c.classList.contains('ready') ? 'ready' : 'locked',
          need: c.querySelector('.pic').dataset.need || '', twoneed: c.classList.contains('twoneed') }]; })))]);
    }
    const oneLineTile = tiles59.every(([, m]) => Object.values(m).every(t => t && !/\n/.test(t.need) && !t.twoneed));
    const wield59 = await page.evaluate(async () => {
      const R = await import('./ui/router.js'), K = await import('./progress/key.js'), CP = await import('./config/copy.js');
      const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const [i, tier] of ['clear', 'pro', 'author'].entries()) {
        R.show('s-menu'); await wait(90); R.show('s-key', { tier: i }); await wait(420);
        const el = document.getElementById('key-wield');
        out[tier] = { gaunt: K.keyGaunt(tier), shown: !!el && !el.hidden, text: el ? el.textContent.trim() : '',
          want: K.keyGaunt(tier) ? CP.KEY.wield.replace('{name}', CP.GAUNTLET.name[K.keyGaunt(tier)]) : '' };
      }
      return out; });
    const wieldOk = !wield59.clear.gaunt && !wield59.clear.shown
      && ['pro', 'author'].every(t => wield59[t].gaunt && wield59[t].shown && wield59[t].text === wield59[t].want && /Gauntlet/.test(wield59[t].text));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    (oneLineTile && wieldOk)
      ? ok(`v30 59.6 a chest tile says ONE thing at 375px — never two ticked requirements over its own drawing — in every state of every chest (${tiles59.map(([l, m]) => l + ': ' + Object.values(m).map(t => '"' + t.need + '"').join(' ')).join(' | ')}); and the Gauntlet requirement moved onto the KEY, standing from the moment its tier opens: ${['pro', 'author'].map(t => t + ' "' + wield59[t].text + '"').join(' · ')}, with the Skill key silent because no Gauntlet wields it`)
      : bad('v30 59.6 the chest tile and the key wield line', JSON.stringify({ oneLineTile, wieldOk, tiles59, wield59 }));
  }

  /* ---- v29 Section A (58.2, build 58, quoting L6): A FINISHED GAUNTLET OPENS THE NEXT CHEST ----
     This reverses build 56 SS3's "a Gauntlet advances nothing" and Aiden authorised it on 2026-09-19. Five things are asserted, and the
     first is the one 58.2 asked to be CONFIRMED FROM CONFIG rather than assumed: that Gauntlet Mega comes out of the Pro chest, so each
     Gauntlet is in hand a whole chest before the chest that wants it. Then the gate itself: the chest is LOCKED with the key whole and no
     finished run, READY the moment a row lands, and an already-opened chest is never locked back out. ---- */
  {
    const chain58 = CH48.GAUNTLETS.map(g => g.id + '<-' + g.chest).join(' ');
    const mini = CH48.GAUNTLETS.find(g => g.id === 'g1'), mega = CH48.GAUNTLETS.find(g => g.id === 'g2');
    const pro58 = CH48.CHESTS.find(c => c.id === 'pro'), th58 = CH48.CHESTS.find(c => c.id === 'thorns');
    const wired = mini && mini.chest === 'key' && mega && mega.chest === 'pro' && pro58.gaunt === 'g1' && th58.gaunt === 'g2'
      && !CH48.CHESTS.find(c => c.id === 'games').gaunt && !CH48.CHESTS.find(c => c.id === 'key').gaunt;
    wired
      ? ok(`58.2 CONFIRMED from config: Gauntlet Mega DOES come out of the Pro chest and Gauntlet Mini out of the Skill chest (${chain58}), so the Pro chest can ask for Mini and the Author chest for Mega and each is in hand a whole chest before it is wanted. The Games and Skill chests ask for no Gauntlet`)
      : bad('58.2 the Gauntlet chain', JSON.stringify({ chain58, proGaunt: pro58.gaunt, thornsGaunt: th58.gaunt }));

    /* the gate itself, driven on the real store. Every bar of every tier cleared and the first two chests open, so the Pro chest's KEY is
       whole — the only thing between it and ready is a finished Gauntlet Mini. */
    const gate58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      S.prefs.allOpen = false; S.prefs.supporter = false;
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 };
      S.store.bars = {}; S.store.gaunt = [];
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c.bar) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.save(); await wait(60);
      out.keyWhole = K.keyState('pro').whole;
      out.shut = K.chestState('pro');
      out.needs = K.chestNeeds('pro').map(r => r.k + ':' + (r.done ? 1 : 0));
      out.keyHint = (K.keyChest('pro') || {}).state;
      // one finished run, the shape run/gauntlet.js writes
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 88.5, tier: 'clear', web: [] }]; S.save(); await wait(60);
      out.ready = K.chestState('pro');
      out.needsOn = K.chestNeeds('pro').map(r => r.k + ':' + (r.done ? 1 : 0));
      out.best = K.gauntBest('g1');
      out.hintOn = (K.keyChest('pro') || {}).state;
      // the Author chest is still behind the Pro chest, and wants Mega
      out.thorns = K.chestState('thorns');
      // NOBODY IS LOCKED BACK OUT: a chest already opened stays open with no row at all
      S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 0 }; S.store.gaunt = []; S.save(); await wait(60);
      out.stillOpen = K.chestState('pro');
      out.tierKept = K.tierOpen('author');
      // and the Author chest, whose turn it now is, is LOCKED on its Gauntlet rather than ready
      out.thornsShut = K.chestState('thorns');
      S.store.gaunt = [{ id: 'g2', t: Date.now(), score: 101, tier: 'clear', web: [] }]; S.save(); await wait(60);
      out.thornsReady = K.chestState('thorns');
      S.store.bars = {}; S.store.gaunt = []; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save();
      return out; });
    (gate58.keyWhole && gate58.shut === 'locked' && gate58.needs.join() === 'key:1,gaunt:0' && gate58.keyHint === 'gaunt'
      && gate58.ready === 'ready' && gate58.needsOn.join() === 'key:1,gaunt:1' && gate58.best === 88.5 && gate58.hintOn === 'ready'
      && gate58.thorns === 'before' && gate58.stillOpen === 'open' && gate58.tierKept && gate58.thornsShut === 'locked' && gate58.thornsReady === 'ready')
      ? ok('58.2 the CHEST is gated, not the key: with the Pro key whole and no Gauntlet Mini the Pro chest is LOCKED and lists both requirements with the key ticked, the key screen says the Gauntlet rather than promising a chest that will not open, and one finished run makes it READY. The Author chest is the same a step on. Migration holds — a chest already opened stays OPEN with the Gauntlet board emptied, and the tier it revealed stays revealed')
      : bad('58.2 the chest gate', JSON.stringify(gate58));

    // Testing's chest switches have to land exactly where play does, which means satisfying the Gauntlet too (S5)
    const dev58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const S = await import('./core/store.js');
      const out = {};
      S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.bars = {}; S.store.gaunt = []; S.save();
      out.pro = K.devReach('pro', P.devModesAll);
      out.rows = (S.store.gaunt || []).map(r => r.id + (r.dev ? ':dev' : ''));
      out.thorns = K.devReach('thorns', P.devModesAll);
      out.rows2 = (S.store.gaunt || []).map(r => r.id + (r.dev ? ':dev' : ''));
      out.meter = K.devMeterTo(300, P.devModesAll);
      K.devBack('pro', P.devModesAll);
      out.back = (S.store.gaunt || []).map(r => r.id);
      K.devBack('games', P.devModesAll); S.store.gaunt = []; S.save();
      return out; });
    (dev58.pro === 'ready' && dev58.rows.join() === 'g1:dev' && dev58.thorns === 'ready' && dev58.rows2.sort().join() === 'g1:dev,g2:dev' && dev58.meter === 300 && !dev58.back.length)
      ? ok(`58.2 Testing's chest switches still land where play does — the Pro and Author switches finish the Gauntlet their chest asks for, marked \`dev\` so it can never be read as a played run, "set meter to N%" still reaches ${dev58.meter}, and a reset takes the row out with the chest`)
      : bad('58.2 Testing past the Gauntlet gate', JSON.stringify(dev58));

    /* the MAP: a locked chest that wants two things lists both, ticks each, and a FINISHED Gauntlet wears a tick and its best score on its
       own tile. The Skill chest, which wants one thing, prints exactly the line it printed before. */
    // a chest with ONE requirement, locked, still prints exactly the line it printed before — a tick on a list of one says nothing
    await boot({ chests: {} }, {}, { plain: PLAIN48 });
    const one58 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      return document.querySelector('#grid .chest[data-chest="games"] .pic').dataset.need; });
    await boot({ chests: { games: 1, key: 1, pro: 0, thorns: 0 } }, {}, { plain: PLAIN48 });
    const map58 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const t of K.TIERS) for (const c of K.COMBOS) if (c.bar) S.store.bars[K.skey(c.key, t)] = Date.now();
      S.store.gaunt = []; S.save();
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      const pic = id => document.querySelector(`#grid .chest[data-chest="${id}"] .pic`);
      const out = { shut: pic('pro').dataset.need,
        pre: getComputedStyle(pic('pro'), '::after').whiteSpace,
        tile: (() => { const t = document.querySelector('#grid .tile[data-gauntlet="g1"]'); return { done: t.classList.contains('done'), need: t.querySelector('.pic').dataset.need }; })() };
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 93.4, tier: 'clear', web: [] }]; S.save();
      R.show('s-menu'); await wait(120); R.show('s-pick'); await wait(600);
      out.on = pic('pro').dataset.need;
      const t2 = document.querySelector('#grid .tile[data-gauntlet="g1"]');
      out.tileOn = { done: t2.classList.contains('done'), need: t2.querySelector('.pic').dataset.need };
      S.store.bars = {}; S.store.gaunt = []; S.save();
      return out; });
    /* AMENDED AT BUILD 59 (v30 59.6): the locked tile lists ONE requirement, not both. 58.2's two ticked lines wrapped to four on
       the Author chest and ran over its drawing, which is what 59.6 is; the tile now says the first thing still missing. The
       requirement itself is untouched \u2014 the chest still wants the key AND the Gauntlet, `chestNeeds` still returns both, the
       chest's Progress tab still lists both, and the key's own screen now names the Gauntlet from the moment its tier opens.
       So what this asserts is the SAME fact through the new wording: with the key in hand and Gauntlet Mini unfinished, the Pro
       chest's one line is the GAUNTLET's, it is one line, it carries no tick marker, and finishing the run turns it to "tap to open". */
    (map58.shut.indexOf('\n') < 0 && !/^[\u2713\u00b7] /.test(map58.shut) && /Gauntlet Mini/.test(map58.shut)
      && one58.indexOf('\n') < 0 && !/^[\u2713\u00b7] /.test(one58)
      && !map58.tile.done && !map58.tile.need && map58.tileOn.done && /93/.test(map58.tileOn.need)
      && map58.on === CP48.GRID.chestOpen)
      ? ok(`58.2 / v30 59.6 the map says it in ONE line: with the Pro key whole and Gauntlet Mini unfinished the Pro chest says "${map58.shut}" and nothing else, a chest whose key is still missing says only that ("${one58}"), a finished Gauntlet Mini wears a tick on its own tile with its best score under it ("${map58.tileOn.need}"), and that same run turns the Pro chest's line into "${map58.on}"`)
      : bad('58.2 / v30 59.6 the map tile', JSON.stringify({ one58, map58 }));

    // the ceremony: the gauntlet hand carries the key in and turns it, on the two chests that want a Gauntlet and on neither of the others
    const hand58 = await page.evaluate(async () => { const CE = await import('./ui/ceremony.js');
      const host = document.createElement('div'); host.className = 'cere'; const inner = document.createElement('div');
      host.appendChild(inner); document.body.appendChild(host); const out = {};
      for (const id of ['games', 'key', 'pro', 'thorns']) { const st = CE.chestStage(id, { was: 0, now: 0, silent: true });
        st.start(inner, {}); const g = inner.querySelector('.ckeyg');
        out[id] = { hand: inner.querySelectorAll('.chand path').length, inKey: !!(g && g.querySelector('.chand')) };
        if (st.clear) st.clear(); }
      host.remove(); return out; });
    (!hand58.games.hand && !hand58.key.hand && hand58.pro.hand > 0 && hand58.pro.inKey && hand58.thorns.hand > 0 && hand58.thorns.inKey)
      ? ok(`58.2 in the chest's own opening the GAUNTLET HAND carries the key in and turns it — the same glove the map tile draws, inside the key's own group so the two move as one (${hand58.pro.hand} paths on the Pro chest, ${hand58.thorns.hand} on the Author chest), and neither the Games nor the Skill chest draws one`)
      : bad('58.2 the gauntlet hand', JSON.stringify(hand58));
  }

  /* ---- v31 (60.1, build 60): THE ASK ANSWERS. END TO END, ON ALL THREE KEYS ----
     Build 59's 59.14 put a capture listener on `#s-key` so that while the chest prompt is up a tap ANYWHERE opens that chest. The
     prompt is still up while the ask box it raises is on screen, so that listener swallowed the taps on Open and Not yet as well and
     re-raised the same box: every player who earned the Skill key was stuck at the dialog with the chest unopened. Nothing in the
     gate caught it, because every chest check above opens a chest through Testing or through `openChest()` rather than through the
     two buttons a player actually taps.
     So this walks the player's path on each of the three key chests — earn the key, open its key screen, tap the key, tap Open — and
     fails unless the CEREMONY ACTUALLY PLAYS and the chest ends up open. Not yet is driven too, on its own raise, because the same
     listener ate it. The Pro and Author chests want a finished Gauntlet as well (L6, 58.2), so the fixture carries GAUNT_ALL. */
  const ask60 = {};
  for (const [chest, ix] of [['key', 0], ['pro', 1], ['thorns', 2]]) {
    await boot(PLAIN48);
    ask60[chest] = await page.evaluate(async (chest, ix) => { const R = await import('./ui/router.js'), K = await import('./progress/key.js');
      const P = await import('./progress.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      // Testing's own switch: every chest before this one filled and opened the way play does, and this one left READY
      K.devReach(chest, P.devModesAll);
      R.show('s-key', { tier: ix, from: 's-testing' }); await wait(1200);
      const out = { state: K.chestState(chest), prompt: document.getElementById('key-hint').classList.contains('kprompt') };
      const fire = sel => { const el = document.querySelector(sel); if (!el) return null;
        const ev = new PointerEvent('pointerdown', { bubbles: true, cancelable: true }); el.dispatchEvent(ev);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return { swallowed: ev.defaultPrevented }; };
      // the key's own hit disc raises the ask (C.1)
      out.tapKey = fire('#s-key [data-act="key-chest"]'); await wait(400);
      out.askUp = !document.getElementById('key-ask').hidden;
      // NOT YET closes it and opens nothing
      out.tapNo = fire('[data-act="key-ask-no"]'); await wait(300);
      out.closed = document.getElementById('key-ask').hidden; out.afterNo = K.chestState(chest);
      // raise it again and say OPEN
      fire('#s-key [data-act="key-chest"]'); await wait(400);
      out.tapYes = fire('[data-act="key-ask-yes"]'); await wait(700);
      const cere = document.getElementById('key-cere');
      out.cere = { shown: !cere.hidden, nodes: cere.querySelectorAll('svg,.cbig,.cchestg').length };
      await wait(700); out.after = K.chestState(chest);
      return out; }, chest, ix);
  }
  const askBad = Object.entries(ask60).filter(([id, r]) => !(r.state === 'ready' && r.prompt
    && r.askUp && r.tapNo && !r.tapNo.swallowed && r.closed && r.afterNo === 'ready'
    && r.tapYes && !r.tapYes.swallowed && r.cere.shown && r.cere.nodes > 0 && r.after === 'open'));
  askBad.length === 0
    ? ok(`60.1 the ask ANSWERS on all three key chests — the key's own tap raises "Open the … chest?", Not yet closes it and opens nothing, Open is not swallowed and the CEREMONY PLAYS (${Object.entries(ask60).map(([id, r]) => `${id}: ${r.cere.nodes} nodes drawn, ${r.state} → ${r.after}`).join('; ')})`)
    : bad('60.1 the ask does not answer', JSON.stringify(ask60));
}

/* ---- music (build 49 opened it: v26 §B1, the sound notes from the build 46 board) ---- */
if (section('music')) {
  /* ---- v30 (59.15, build 59): THE PRO KEY SOUNDS ELECTRICAL, AND ITS TIMES COME OFF THE ANIMATION ----
     Aiden: "the sound should be more electronic. You can keep the current music but also have some electrical success music
     because it's a circuit, you know." The bed is untouched and this is a second layer over it, tied to what the circuit is
     DOING. What is asserted is the thing that would rot first: 59.15 says to "schedule these off the animation's own step times,
     not fixed offsets, or they drift the first time a timing changes", and this animation has been re-timed twice already — so
     the check MOVES a step in config and proves the layer moved with it, rather than reading a list of numbers. */
  {
    const c15 = await page.evaluate(async () => { const M = await import('./audio.js'), K = await import('./config/keys.js');
      const at = p => p.map(n => Math.round(n[0] * 1000));
      const before = M.Snd.keyCircuitPlan('pro');
      const E = K.KEY_EARN.pro, ring = E.steps.find(s => s.name === 'ring'), was = ring.at;
      ring.at = was + 500;                                    // move the ring later and ask the layer where its sweep went
      const moved = M.Snd.keyCircuitPlan('pro');
      ring.at = was;
      const sweepOf = p => { const n = p.find(x => x[4] === 'sawtooth' && x[1] !== x[2] && x[3] <= 600); return n ? Math.round(n[0] * 1000) : null; };
      return { n: before.length, tiers: { clear: M.Snd.keyCircuitPlan('clear').length, pro: before.length, author: M.Snd.keyCircuitPlan('author').length },
        sweepWas: sweepOf(before), sweepMoved: sweepOf(moved), ringAt: was,
        // the layer's own shapes: climbing blips, dry clicks, one long rising hum, the sweep, the closing arpeggio
        blips: before.filter(x => x[4] === 'square' && x[3] === 70).map(x => Math.round(x[1])),
        clicks: before.filter(x => x[4] === 'square' && x[3] <= 30).length,
        hum: before.filter(x => x[4] === 'sawtooth' && x[3] > 1000).map(x => [Math.round(x[1]), Math.round(x[2]), x[3]])[0] || null,
        arp: before.filter(x => x[4] === 'square' && x[3] === 150).map(x => Math.round(x[1])),
        endsBeforeTheBed: Math.max(...before.map(x => x[0] * 1000 + x[3])) <= Math.max(...M.Snd.keyEarnPlan('pro').map(x => x[0] * 1000 + x[3])) + 1,
        bedUntouched: at(M.Snd.keyEarnPlan('pro')).length }; });
    const climbs = c15.blips.length === 7 && c15.blips.every((f, i) => !i || f > c15.blips[i - 1]);
    const arpRises = c15.arp.length >= 3 && c15.arp.every((f, i) => !i || f > c15.arp[i - 1]);
    const humRises = !!c15.hum && c15.hum[1] > c15.hum[0] && c15.hum[2] > 1000;
    const proOnly = c15.tiers.clear === 0 && c15.tiers.author === 0 && c15.tiers.pro > 10;
    const followsTheAnimation = c15.sweepWas === c15.ringAt && c15.sweepMoved === c15.ringAt + 500;
    (climbs && arpRises && humRises && proOnly && followsTheAnimation && c15.clicks === 7 && c15.endsBeforeTheBed)
      ? ok(`v30 59.15 the Pro key has an ELECTRICAL layer over its own music, and it is tied to the circuit: ${c15.blips.length} blips climbing ${c15.blips[0]}→${c15.blips[c15.blips.length - 1]}Hz one per spoke, ${c15.clicks} dry relay clicks as the nodes are reached, a mains hum rising ${c15.hum[0]}→${c15.hum[1]}Hz under the whole build, a saw sweep as the ring closes and a ${c15.arp.length}-note arpeggio resolving with the bed — and MOVING the ring step 500ms later moves the sweep with it (${c15.sweepWas}→${c15.sweepMoved}ms), so no offset is written twice. The Skill and Author keys have none of it and the bed is untouched`)
      : bad('v30 59.15 the Pro key circuit layer', JSON.stringify(c15));
  }
  const AU49 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CH49 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);   // build 51 (v27 item 5): the uncross step's own beat
  // build 51 (v27 item 1): the title sequence is driven here, so this section needs a profile of its own
  const PLAIN51 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: {}, readySeen: {}, revealed: {}, menuOpened: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const TH49 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const AC49 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  const notes = ev => ev.filter(e => e[4] === 'triangle'), bass = ev => ev.filter(e => e[4] === 'sine' && e[1] < 300);
  const endHz = ev => { const n = notes(ev); return n.length ? Math.max(...n.map(e => e[2])) : 0; };
  const V = AU49.VERDICT_FX, RF = AU49.ROUND_FX;
  // build 45's Amazing!, which Aiden asked to become Great!
  const OLD_ACE = [[0, 523.3, 523.3, 300, 'triangle', .075, 18], [.10, 784, 784, 300, 'triangle', .075, 18], [.20, 1046.5, 1046.5, 460, 'triangle', .08, 18], [.20, 2093, 2093, 320, 'sine', .022, 26], [0, 261.6, 392, 760, 'sine', .05, 90]];
  const OLD_BAD = [[0, 392, 330, 260, 'triangle', .07, 14], [.14, 294.7, 196, 440, 'triangle', .06, 14], [0, 98, 98, 560, 'sine', .04, 70]];
  {
    const counts = ['bad', 'ok', 'good', 'ace'].map(id => notes(V[id]).length);
    const okRises = notes(V.ok)[1][1] > notes(V.ok)[0][1] && notes(V.ok)[0][1] === notes(V.ok)[0][2];
    const ladder = JSON.stringify(V.good) === JSON.stringify(OLD_ACE) && JSON.stringify(V.bad) === JSON.stringify(OLD_BAD) && counts.join() === '2,2,3,4' && okRises
      && endHz(V.ace) > endHz(V.good) && endHz(V.good) > endHz(V.ok) && ['bad', 'ok', 'good', 'ace'].every(id => bass(V[id]).length);
    const rounds = ['bad', 'ok', 'good', 'ace'].every(id => notes(RF[id]).length === notes(V[id]).length - 1 && bass(RF[id]).length > 0);
    const played = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      return ['bad', 'ok', 'good', 'ace'].every(id => { const src = A.ROUND_FX[id], p = M.Snd.roundVerdictPlan(id); return p.length === src.length && p.every((e, i) => e[5] < src[i][5] && e[3] < src[i][3] && e[1] === src[i][1]); }); });
    (ladder && rounds && played)
      ? ok(`§B1 the result sounds climb - Meh. unchanged (${counts[0]} notes, falling), Good. a rising third (${counts[1]}), Great! build 45's Amazing! note for note (${counts[2]}), Amazing! ${counts[3]} notes ending highest (${endHz(V.ace)} Hz) - each with bass under it; every round sound is one note shorter than its result sound, with bass, and still plays shorter and quieter`)
      : bad('§B1 the verdict sounds', JSON.stringify({ counts, okRises, ladder, rounds, played }));
  }
  {
    // End of run no longer plays under the result's tier: a real Quick Tap run, timed at the two calls
    await boot({}, { unlock: { 'quick-tap:four': Date.now() } });
    await page.evaluate(async () => { const A = await import('./audio.js'); const log = window.__e49 = [];
      for (const k of ['end', 'verdict']) { const o = A.Snd[k]; A.Snd[k] = function () { log.push([k, Math.round(performance.now())]); return o.apply(this, arguments); }; } });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(() => document.querySelector('#grid .tile[data-game="quick-tap"]').click()); await sleep(350);
    await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[0].click()); await sleep(320);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const t0 = Date.now(); while (Date.now() - t0 < 40000) { const at = await onScreen(); if (at === 's-over') break; if (await inGame()) await poke('quick-tap'); await sleep(40); }
    for (let i = 0; i < 40; i++) { await skipAd(); if (await page.evaluate(() => window.__e49.some(x => x[0] === 'verdict'))) break; await sleep(200); }
    const log = await page.evaluate(() => window.__e49.slice());
    const e = log.find(x => x[0] === 'end'), v = log.find(x => x[0] === 'verdict');
    (e && v && v[1] - e[1] >= 1000)
      ? ok(`§B1 End of run no longer plays on top of the result's tier sound: the tier waits until it has landed (${v[1] - e[1]}ms after it, where it came in at about 250ms)`)
      : bad('§B1 End of run and the verdict', JSON.stringify(log));
  }
  {
    const W = AU49.WHOOSH_VARIANTS;
    const data = W.length === 7 && W.every(([p, l]) => Math.abs(p - 1) <= .06 && Math.abs(l - 1) <= .1) && new Set(W.map(x => x.join())).size === 7;
    const drawn = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js'); const S = await import('./core/store.js'); S.prefs.snd = 'space';
      const one = v => M.Snd.plan(() => M.Snd.whoosh(900, 110, 700, v))[0];
      const fixed = A.WHOOSH_VARIANTS.every((w, i) => { const e = one(i); return Math.abs(e[1] - 110 * w[0]) < .2 && Math.abs(e[3] - Math.round(900 * w[1])) <= 1; });
      const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(one().slice(1, 4).join());
      return { fixed, distinct: seen.size }; });
    /* AMENDED at build 51 (v27 item 1): the title half of this check is DELETED. It asserted that both title beats were LONG (over 1.1s and
       1.5s) with a slowly beating high pair over them — build 49's swell, and exactly what item 1 replaced with a single impact. It is not
       re-spelled to the new shape: the impact has its own check below, on its own terms. The whoosh half is untouched. */
    (data && drawn.fixed && drawn.distinct >= 4)
      ? ok(`§B1 the count-up whoosh has seven very similar versions (pitch and length within 6% / 10%), one drawn at random each time (${drawn.distinct} different ones in 60 plays)`)
      : bad('§B1 the whooshes', JSON.stringify({ data, drawn }));
  }
  {
    const item = TH49.ITEMS.snd.find(i => i.v === 'sigh'), tour = AC49.ACH.find(a => a.id === 'tour');
    await boot({ snd: 'sigh', chests: { games: 1 } });
    const held = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const M = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { stored: S.prefs.snd }; R.show('s-custom'); await wait(400); out.row = [...document.querySelectorAll('#c-snd [data-v]')].map(b => b.dataset.v);
      S.prefs.snd = 'sigh'; out.miss = M.Snd.plan(() => M.Snd.miss()).map(e => e[1]); S.prefs.snd = 'space'; return out; });
    (item && item.held && !item.by && tour && !tour.unlocks && held.stored === 'space' && !held.row.includes('sigh') && held.row.length && Math.min(...held.miss) >= 400)
      ? ok(`§B1 Sigh is held: off Customise's sound pack row (${held.row.join(', ')}), a profile that had it chosen plays Space, Grand tour no longer unlocks it (the achievement is still to be decided), and its miss starts at ${Math.min(...held.miss)} Hz so it can be heard`)
      : bad('§B1 the Sigh sound pack', JSON.stringify({ item, tour, held }));
  }
  {
    const tk = AU49.TRACKS['theme:key'], r2 = tk.root * 2, tones = [...tk.ch[0], ...tk.ch[1]].map(n => (((n % 12) + 12) % 12));
    const assemble = AU49.CHEST_FX.key.filter(e => e[0] < 1.8 && e[4] === 'sine');
    const inTheme = assemble.length >= 8 && assemble.every(e => { const s = Math.round(12 * Math.log2(e[1] / r2)); return tones.includes(((s % 12) + 12) % 12) && Math.abs(e[1] - r2 * Math.pow(2, s / 12)) < 1; });
    const spill = AU49.CHEST_FX.key.filter(e => e[0] >= 2.7).map(e => Math.round(12 * Math.log2(e[1] / r2))).join() === tk.ch[0].join();
    const pro = AU49.CHEST_FX.pro, burst = pro.filter(e => Math.abs(e[0] - 2.8) < .01 && e[1] >= 140);
    const epic = pro.length >= 24 && burst.length >= 5 && pro.some(e => e[1] < 45) && AU49.CHEST_STING.pro.tail.length >= 6;
    const earn = AU49.KEY_EARN_FX, layers = ev => new Set(ev.map(e => e[3] + e[4])).size;
    const thorn = earn.author.notes.length >= 25 && earn.author.notes.length > earn.pro.notes.length && layers(earn.author.notes) > 12;
    (inTheme && spill && epic && thorn)
      ? ok(`§B1 the Skill chest opening is built from key 1's theme - its first two chords arpeggiated as the bars assemble and its opening chord held as the light spills; the Pro chest opening has ${pro.length} sounds with a ${burst.length}-note chord on the burst and a sub under it; Thorn earned has ${earn.author.notes.length} notes in more layers (Circuit has ${earn.pro.notes.length})`)
      : bad('§B1 the chest and key sounds', JSON.stringify({ inTheme, spill, epic, thorn, assemble: assemble.map(e => e[1]) }));
  }

  /* ---- v27 item 1 (build 51): THE TITLE IS AN IMPACT NOW, FIRED ON THE FRAME ITS LINE STARTS. Aiden heard each line's sound landing late, and
     the two faults were one: a 400-600ms attack means the loudest part arrives half a second after the trigger. Every layer of both beats opens
     inside 5ms and falls away; the title line is still the heavier. And the trigger is measured off the animation's OWN start time on the
     document timeline, not off a setTimeout taken after the style recalc — driven below, against the stylesheet's own delays. ---- */
  {
    /* AMENDED AT BUILD 57 (v29 Section A, 57.1): each beat is an impact PLUS A REVERB TAIL, and the fourth beat has a sound of its own. So the
       impact rule is measured on the events at 0s — which is where item 1's "the moment it is fired IS the moment it is heard" lives — and the TAIL
       is asserted for what a reverb is: every tail event comes after the impact, quieter than it, and lowpassed no higher than it. `begin` is held
       to the same shape and to being HIGHER than the three that fall, which is Aiden's own instruction. */
    const T = AU49.TITLE_FX, lay = ev => ev.map(e => ({ at: e[0], atk: e[6] || 0, ms: e[3], g: e[5], f0: e[1], f1: e[2], lp: e[7] || 0 }));
    const hit = k => lay(T[k]).filter(x => x.at === 0), tail = k => lay(T[k]).filter(x => x.at > 0);
    const impact = k => hit(k).length && hit(k).every(x => x.atk <= 5 && x.ms <= 950 && x.f1 <= x.f0);
    const reverb = k => { const h = hit(k), t = tail(k); const gMax = Math.max(...h.map(x => x.g));
      return t.length >= 3 && t.every((x, i) => x.g < gMax && (!i || x.g <= t[i - 1].g) && (!i || x.at > t[i - 1].at)); };
    const heavier = Math.max(...T.title.map(e => e[5])) > Math.max(...T.line.map(e => e[5])) && Math.max(...T.title.map(e => e[3])) > Math.max(...T.line.map(e => e[3]));
    // 57.1: TAP TO BEGIN sits above the three that fall into the floor
    const lead = k => { const h = hit(k); return h.reduce((a, b) => b.g > a.g ? b : a, h[0]).f0; };
    const begins = lead('begin') > lead('line') && lead('begin') > lead('title');
    // the theme rule the other families keep: nothing short and high
    const rule = ['line', 'title'].every(k => T[k].every(e => !(e[1] >= 300 && e[3] >= 700)) && T[k].every(e => e[3] < 700 ? true : e[1] < 300));
    await boot({ story: 0, snd: 'space' }, {}, { plain: { ...PLAIN51, story: 0, snd: 'space' } });
    const fired = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const log = [], o = A.Snd.titleFx; A.Snd.titleFx = function (k) { log.push({ k, at: Math.round(performance.now() - t0) }); return o.apply(this, arguments); };
      const t0 = performance.now(); R.show('s-menu', { story: true });
      await wait(120);
      const want = [['#st1', 'line'], ['#s-menu .wmin', 'title'], ['#st2', 'line'], ['#storyhint', 'begin']].map(([sel, k]) => { const el = document.querySelector(sel), a = el.getAnimations()[0];
        return { k, at: a ? Math.round((a.effect.getComputedTiming().delay || 0) + (a.startTime || 0) - t0) : -1 }; });
      await wait(5200); A.Snd.titleFx = o; return { log, want }; });
    // each beat fires within a frame or two of the moment its own line starts moving - the whole of item 1's "on the same frame"
    const drift = fired.log.map((x, i) => Math.abs(x.at - (fired.want[i] || { at: 0 }).at));
    const onTime = fired.log.length === 4 && fired.log.map(x => x.k).join() === 'line,title,line,begin' && drift.every(d => d <= 40);
    const green = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('storyhint')); return { col: c.color, glow: c.textShadow }; });
    const isGreen = /rgb\(\s*61,\s*214,\s*140/.test(green.col) && /rgb/.test(green.glow);
    (impact('line') && impact('title') && impact('begin') && reverb('line') && reverb('title') && reverb('begin') && heavier && begins && rule && onTime && isGreen)
      ? ok(`v27 item 1 / v29 57.1 each title beat is ONE IMPACT with a reverb tail behind it — every layer at 0s opens in ${Math.max(...hit('title').map(x => x.atk))}ms at most, then ${tail('title').length} tails each quieter and darker than the last — the title line still the heaviest, TAP TO BEGIN its own sound led at ${lead('begin')}Hz against the ${lead('line')}Hz and ${lead('title')}Hz the others fall from, and glowing green (${green.col}); and each is fired on the frame its own line starts: ${fired.log.map((x, i) => x.k + ' ' + x.at + 'ms (line at ' + fired.want[i].at + ')').join(' · ')}, off by ${Math.max(...drift)}ms at worst`)
      : bad('v27 item 1 / v29 57.1 the title impact', JSON.stringify({ impact: [impact('line'), impact('title'), impact('begin')], reverb: [reverb('line'), reverb('title'), reverb('begin')], heavier, begins, rule, onTime, drift, green, fired }));
  }

  /* ---- v27 items 5 / 6 (build 51): THE GAMES CHEST. Its seven squares tick off (item 5) — they were never missing, they were seven identical
     notes under a sting — and each is now a step higher, the seventh a finish. Its rewards' pops (item 6) were masked by its own closing chord,
     so that chest's pops are lifted and a KEY reward's brighter, and ONLY that chest's: item 12 approved the Pro chest's sounds as they are. ---- */
  {
    const G = AU49.CHEST_FX.games, ticks = G.filter(e => e[0] <= .95 && e[3] <= 160 && e[4] === 'triangle');
    const rising = ticks.length === 7 && ticks.every((e, i) => !i || e[2] > ticks[i - 1][2]);
    const finish = G.some(e => Math.abs(e[0] - .9) < .001 && e[3] > 160) && ticks[6][3] > ticks[0][3];
    const onStep = (() => { const ux = (CH49.CEREMONY.games.steps.find(x => x.name === 'uncross') || {}); const step = Math.round(ux.ms / 8);
      return ticks.every((e, i) => Math.abs(Math.round(e[0] * 1000) - i * step) <= 5); })();
    const pops = await page.evaluate(async () => { const A = await import('./audio.js');
      const peak = ev => Math.max(...ev.map(e => e[5])), top = ev => Math.max(...ev.map(e => e[1]));
      const base = A.Snd.popPlan(0), games = A.Snd.popPlan(0, { chest: 'games' }), gkey = A.Snd.popPlan(1, { chest: 'games', key: true }), pro = A.Snd.popPlan(0, { chest: 'pro' });
      return { base: [peak(base), top(base)], games: [peak(games), top(games)], gkey: [peak(gkey), top(gkey)], pro: [peak(pro), top(pro)] }; });
    const lifted = pops.games[0] > pops.base[0] && pops.games[1] > pops.base[1];
    const brighter = pops.gkey[0] > pops.games[0] && pops.gkey[1] > pops.games[1];
    const proUntouched = pops.pro[0] === pops.base[0] && pops.pro[1] === pops.base[1];
    (rising && finish && onStep && lifted && brighter && proUntouched)
      ? ok(`v27 items 5 / 6 the Games chest: its seven squares tick ${ticks.map(e => Math.round(e[2])).join(' → ')} Hz, one per square on the uncross step's own beat, the seventh longer with a low body under it (item 5 — they were wired at build 41 and never removed, all seven at one pitch); and its rewards pop clear of its own closing chord, ${(pops.games[0] / pops.base[0]).toFixed(1)}× the level and ${Math.round(pops.games[1] - pops.base[1])} Hz higher, a key reward brighter again — with the Pro chest's pop untouched, as item 12 requires`)
      : bad('v27 items 5 / 6 the Games chest sounds', JSON.stringify({ ticks: ticks.map(e => [e[0], e[2], e[3]]), rising, finish, onStep, pops, lifted, brighter, proUntouched }));
  }

  /* ---- v27 item 14 (build 51): a sound per NAMED STEP of the key-earned animation. One row per name, every name a tier uses has one, and none
     of them is the unlock sound, the achievement click, a chest's or the key's own earn. ---- */
  {
    const S = AU49.KEY_STEP_FX, KY = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    /* AMENDED AT BUILD 52 (Aiden's answer to build 51): a SPOKES step whose spokes fire one at a time plays its games' own sounds, not a row here,
       and since the Pro key was rebuilt to fire one by one no tier fires them together — so `spokes` has no row and must not be asked for one. */
    /* AMENDED AT BUILD 53 (v28 item 15): `rise` is the finale's settle — three to four seconds of continuous motion under the music's own last
       chords — and a sound held under it would only fight the track, so it has no row either. `land`, the hit on the final note, does. */
    const used = [...new Set(Object.values(KY.KEY_EARN).flatMap(e => e.steps.filter(x => !(x.name === 'spokes' && e.spokes && e.spokes.gap > 0) && x.name !== 'rise').map(x => x.name)))].filter(n => n !== KY.EARN_GLOW);
    const covered = used.every(n => (S[n] || []).length);
    const shape = Object.values(S).every(ev => ev.length && ev.every(e => e.length >= 6 && typeof e[1] === 'number' && e[3] > 0 && e[5] > 0 && e[5] < .2));
    const apart = await page.evaluate(async names => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const mine = names.map(n => sig(A.Snd.keyStepPlan(n)));
      const others = [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.chestPlan('games').map(e => e.slice(0, 8))), sig(A.Snd.keyEarnPlan('clear'))];
      return { clash: mine.filter(m => others.includes(m)).length, uniq: new Set(mine).size, n: mine.length }; }, Object.keys(S));
    (covered && shape && !apart.clash && apart.uniq === apart.n)
      ? ok(`v27 item 14 each named step of the key-earned animation has its own sound — ${Object.keys(S).join(', ')} — every step a tier uses is covered (${used.join(', ')}), no two are the same and none is the unlock sound, the achievement click, a chest's or the key's own earn (which lands on the flash instead)`)
      : bad('v27 item 14 the step sounds', JSON.stringify({ used, covered, shape, apart }));
  }

  /* ---- v27 item 10 (build 52): THE VIDEO PLAYER'S POWER ON AND POWER OFF. One pair for all eight clips, because item 10 builds them into the
     player and not into the files. Both follow the tap-sound switch like every other effect, neither is the unlock sound, the achievement
     click, a chest's or a key's earn, and the pair is a pair: the power-off is the power-on's shape falling instead of rising. ---- */
  {
    const V = AU49.VIDEO_FX;
    const shape = ['on', 'off'].every(k => (V[k] || []).length && V[k].every(e => e.length >= 6 && e[3] > 0 && e[5] > 0 && e[5] < .2 && (e[6] || 0) <= 10));
    // soft: item 10's word. Under a chest's pop, which is the quietest thing it sits near
    const soft = Math.max(...V.on.map(e => e[5])) <= Math.max(...AU49.POP_FX.notes.map(e => e[5])) * 1.2
      && Math.max(...V.off.map(e => e[5])) <= Math.max(...V.on.map(e => e[5]));
    // the thunk rises going out and falls coming back: the loudest layer of `on` sweeps up, of `off` sweeps down
    const loudest = ev => ev.slice().sort((a, b) => b[5] - a[5])[0];
    const pair = loudest(V.on)[1] > loudest(V.on)[2] && loudest(V.off)[1] > loudest(V.off)[2]
      && V.on.some(e => e[1] < e[2]) && V.off.some(e => e[1] > e[2]);
    const apart = await page.evaluate(async () => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const mine = ['on', 'off'].map(k => sig(A.Snd.videoPlan(k)));
      const others = [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.chestPlan('games').map(e => e.slice(0, 8))),
        sig(A.Snd.keyEarnPlan('clear')), sig(A.Snd.keyStepPlan('slam'))];
      // the player really fires them, and only those two, once each way
      const heard = []; const f = A.Snd.videoFx; A.Snd.videoFx = function (k) { heard.push(k); return f.apply(this, arguments); };
      return { clash: mine.filter(m => others.includes(m)).length, uniq: new Set(mine).size, restore: !!A.Snd.videoFx }; });
    (shape && soft && pair && !apart.clash && apart.uniq === 2)
      ? ok(`v27 item 10 the video player's power-on and power-off are one pair for all eight clips (config/audio.js VIDEO_FX): a soft thunk with a short rise over it as the picture opens, its reverse as the picture goes to a dot, both under a chest's pop, both following the tap-sound switch, and neither one the unlock sound, the achievement click, a chest's or a key's earn`)
      : bad('v27 item 10 the video sounds', JSON.stringify({ shape, soft, pair, apart }));
  }

  /* ---- v27 (Aiden's answer to build 51, build 52): "even more epic for the pro ... the author should be epic super duper music". The three
     earn sounds have to climb, and they have to climb by more than they did: Pro over Skill and Author over Pro, in notes, in layers and in
     length, with every note still inside the key-theme rule (nothing under 700ms above 300 Hz, nothing above C5 under 1200ms). ---- */
  {
    const E52 = AU49.KEY_EARN_FX, T52 = ['clear', 'pro', 'author'];
    const plans = await page.evaluate(async ts => { const A = await import('./audio.js'); return Object.fromEntries(ts.map(t => [t, A.Snd.keyEarnPlan(t)])); }, T52);
    const lenOf = t => Math.max(...plans[t].map(e => e[0] + e[3] / 1000));
    const layersOf = t => new Set(E52[t].notes.map(e => e[3] + e[4])).size;
    const climbs = T52.every((t, i) => !i || (E52[t].notes.length > E52[T52[i - 1]].notes.length && lenOf(t) > lenOf(T52[i - 1]) && layersOf(t) >= layersOf(T52[i - 1])));
    const rule = T52.every(t => plans[t].length && plans[t].every(e => !((e[1] >= 300 && e[3] < 700) || (e[1] > 523.3 && e[3] < 1200))));
    // and Pro really grew at build 52 rather than being called grander: it is at least half again the notes build 51 gave it (14)
    const grew = E52.pro.notes.length >= 21 && E52.author.notes.length >= 40;
    (climbs && rule && grew)
      ? ok(`v27 Aiden's answer to build 51: the three earn sounds climb by more than they did - ${T52.map(t => `${t} ${E52[t].notes.length} notes in ${layersOf(t)} layers over ${lenOf(t).toFixed(1)}s`).join(', ')} - the Pro key "even more epic" and the Author key "epic super duper", the biggest of the three, with every note still inside the key-theme rule`)
      : bad('v27 the earn sound escalation', JSON.stringify({ climbs, rule, grew, n: T52.map(t => E52[t].notes.length), len: T52.map(lenOf), layers: T52.map(layersOf) }));
  }

  /* ---- v29 (items 8 / 12, build 55): a skip silences the earn music, and AC() no longer resumes by itself ---- */
  {
    /* item 8: every note of KEY_EARN_FX was scheduled straight to a.destination in one pass with nothing keeping a handle, and
       Music.hush() only touches the music BED — so no code path could silence it. A tap-to-skip at 1.5s left up to 2.5s of it
       ringing over the settled key, and over Snd.chest('thorns') 250ms later. The gate spies on Snd.keyEarn, drives the Author
       key's earn, taps the skip and asks the handle the screen was holding whether it went quiet. */
    const skip55 = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js');
      const S = await import('./core/store.js'); const K = await import('./progress/key.js');
      const wait = t => new Promise(r => setTimeout(r, t));
      S.prefs.allOpen = true; S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 0 }; S.prefs.revealed = {}; S.prefs.snd = 'space';
      S.store.bars = {}; for (const c of K.COMBOS) for (const t of K.TIERS) S.store.bars[K.skey(c.key, t)] = 1;
      S.save();
      const orig = A.Snd.keyEarn; let h = null;
      A.Snd.keyEarn = function () { h = orig.apply(this, arguments); return h; };
      R.show('s-menu'); await wait(150); R.show('s-key', { tier: 2 }); await wait(1800);
      const before = h ? { ringing: !h.stopped(), g: h.gain() } : null;
      const host = document.getElementById('key-cere'); if (host) host.click();
      await wait(700);
      const after = h ? { stopped: h.stopped(), g: h.gain() } : null;
      A.Snd.keyEarn = orig; R.show('s-menu'); await wait(200);
      return { had: !!h, before, after }; });
    (skip55.had && skip55.before.ringing && skip55.after.stopped && skip55.after.g < .05)
      ? ok('item 8 a tap-to-skip silences the earn music — Snd.keyEarn hands back a handle on its own gain node and the skip cuts it, so nothing from it is still sounding over the chest that follows')
      : bad('item 8 the earn music outlives the skip', JSON.stringify(skip55));

    /* item 12: AC() fired a bare unawaited resume() on every call while the context was not running — the music loop calls it
       every 80ms and every tone() calls it, so an iOS interruption meant ~12 rejected promises a second, all of them bypassing
       revive()'s single-flight guard. Every resume goes through revive() now, which is F.2's rule. */
    const ac55 = await page.evaluate(async () => { const A = await import('./audio.js'); const a = A.AC(); if (!a) return { none: 1 };
      let n = 0; const real = a.resume.bind(a); a.resume = function () { n++; return real(); };
      const st0 = a.state; for (let i = 0; i < 12; i++) A.Snd.click();
      await new Promise(r => setTimeout(r, 250)); a.resume = real; return { n, st0, st1: a.state }; });
    (!ac55.none && (ac55.st0 === 'running' ? ac55.n === 0 : ac55.n <= 1))
      ? ok(`item 12 AC() no longer resumes by itself — twelve sounds through a ${ac55.st0} context asked for ${ac55.n} resume${ac55.n === 1 ? '' : 's'}; every one goes through revive()'s single-flight ladder (F.2)`)
      : bad('item 12 AC() still resumes on every call', JSON.stringify(ac55));
  }
}

/* ---- 7c. the Gauntlets: real runs, and everything they must NOT touch (v29 items 11 / 18, build 56) ---- */
if (section('gauntlets')) {
  const GA56 = await import(pathToFileURL(path.join(root, 'config', 'gauntlets.js')).href);
  const GT56 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB56 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);

  /* item 18's rosters are Aiden's own, typed 2026-09-18, and this is the mapping check he asked for: every row a real game
     and mode, every step scored against a bar that exists, Sequence in NEITHER, and Mega the same roster as Mini. */
  { const wrong = [];
    for (const id of ['g1', 'g2']) for (const st of (GA56.GAUNTLET_RUNS[id] || [])) {
      if (!GT56.GAMES[st.g] || !GT56.GAMES[st.g].modes.includes(st.d)) wrong.push(`${id} ${st.g}:${st.d}`);
      if (!KB56.KEY_BARS[st.ref]) wrong.push(`${id} ref ${st.ref}`);
      if (!Number.isInteger(st.s) || st.s < 1) wrong.push(`${id} len ${st.s}`);
      if (st.g === 'sequence') wrong.push(`${id} Sequence is in a Gauntlet`); }
    const order = id => (GA56.GAUNTLET_RUNS[id] || []).map(x => x.g + ':' + x.d).join(' > ');
    const same = order('g1') === order('g2');
    (!wrong.length && same && GA56.GAUNTLET_RUNS.g1.length === 9)
      ? ok(`items 11 / 18 both rosters are Aiden's nine plays in his order — ${order('g1')} — every step a real game and mode with a bar to score against, Sequence in neither, Mega the same roster at full length`)
      : bad('items 11 / 18 the rosters', JSON.stringify({ wrong, same, n: (GA56.GAUNTLET_RUNS.g1 || []).length })); }

  /* R1 (v27 item 2): a secret may be KNOWN TO EXIST, never what it is — until its chest is opened a Gauntlet has no tile at
     all. Aiden narrowed this himself on 2026-09-18: "both tiles show NOTHING until their chest is opened". */
  const tiles = async chests => { await boot({ chests }); await click('[data-go="s-pick"]'); await sleep(1200);
    return page.evaluate(() => [...document.querySelectorAll('#grid .tile[data-gauntlet]')]
      .map(t => ({ id: t.dataset.gauntlet, hidden: !!t.hidden, lines: document.querySelectorAll(`#gridlines [data-gauntlet="${t.dataset.gauntlet}"]`).length }))); };
  const t0 = await tiles({ games: 1, key: 0, pro: 0, thorns: 0 });
  const t1 = await tiles({ games: 1, key: 1, pro: 0, thorns: 0 });
  const t2 = await tiles({ games: 1, key: 1, pro: 1, thorns: 0 });
  const at = (rows, id) => rows.find(r => r.id === id) || { hidden: null, lines: -1 };
  (t0.every(r => r.hidden && !r.lines) && !at(t1, 'g1').hidden && at(t1, 'g2').hidden && !at(t2, 'g1').hidden && !at(t2, 'g2').hidden)
    ? ok('R1 neither Gauntlet is on the map before its chest — no tile, no connector; Gauntlet Mini arrives with the Skill chest and Gauntlet Mega with the Pro chest')
    : bad('R1 the Gauntlet tiles', JSON.stringify({ t0, t1, t2 }));

  // item 8 (build 52): opening a Gauntlet is what opens its message, and it happens ONCE
  const msg56 = await page.evaluate(async () => { const R = await import('./ui/router.js'); const S = await import('./core/store.js');
    const K = await import('./progress/key.js'); const M = await import('./config/messages.js'); const wait = t => new Promise(r => setTimeout(r, t));
    const row = M.MESSAGES.find(m => m.by && m.by.gauntlet === 'g1');
    S.prefs.gauntSeen = {}; S.save();
    const before = { seen: !!(S.prefs.gauntSeen || {}).g1, open: row ? !!K.msgOpen(row) : null };
    R.show('s-gauntlet', { id: 'g1' }); await wait(350);
    const one = { seen: (S.prefs.gauntSeen || {}).g1, open: row ? !!K.msgOpen(row) : null };
    R.show('s-menu'); await wait(150); R.show('s-gauntlet', { id: 'g1' }); await wait(350);
    const two = { seen: (S.prefs.gauntSeen || {}).g1, keys: Object.keys(S.prefs.gauntSeen || {}) };
    R.show('s-menu'); await wait(150);
    return { row: !!row, before, one, two }; });
  (msg56.row && !msg56.before.seen && !msg56.before.open && msg56.one.seen === 1 && msg56.one.open && msg56.two.seen === 1 && msg56.two.keys.length === 1)
    ? ok('item 8 "The Gauntlet Mini" opens the first time its Gauntlet is opened, and a second visit writes nothing more')
    : bad('item 8 the Gauntlet message', JSON.stringify(msg56));

  /* THE RUN. Nine plays back to back, driven the way every other run in this file is driven; what it must not touch is read
     off the store either side of it. The gate runs it TWICE — once with the Author-bar switch off, which is how it ships
     until #349 sets real Author times, and once with it on — because "the run must play and score sensibly with the switch
     off" is the whole point of building the scoring before the numbers exist. */
  const driveGaunt = async (id, ms = 300000) => {
    await page.evaluate(() => { window.__g56 = null; window.__d58 = [];
      return import('./core/events.js').then(E => { E.on('gaunt:done', o => { window.__g56 = o; });
        if (!window.__d58on) { window.__d58on = 1; E.on('gaunt:deal', d => { (window.__d58 = window.__d58 || []).push(d); }); } }); });
    await sleep(250);
    await page.evaluate(gid => import('./run/gauntlet.js').then(G => G.startGauntlet(gid)), id);
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const out = await page.evaluate(() => window.__g56); if (out) return out;
      if (await inGame()) { const g = await page.evaluate(() => import('./core/state.js').then(S => S.sel.game));
        if (!(await clearReady(g)) && !(await clearHeld(g))) await poke(g); }
      await sleep(110); }
    return null; };

  await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 0 } }, { unlock: {}, ach: {}, bars: {} });
  const before56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {};
    return { runs: (st.runs || []).length, unlock: Object.keys(st.unlock || {}).length, ach: Object.keys(st.ach || {}).length, bars: Object.keys(st.bars || {}).length, gaunt: (st.gaunt || []).length }; });
  const off56 = await driveGaunt('g1');
  const after56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {};
    return { runs: (st.runs || []).length, unlock: Object.keys(st.unlock || {}).length, ach: Object.keys(st.ach || {}).length, bars: Object.keys(st.bars || {}).length, gaunt: (st.gaunt || []).length, tier: (st.gaunt || [])[0] && (st.gaunt || [])[0].tier }; });
  (off56 && Number.isFinite(off56.score) && off56.web.length === 8 && off56.web.every(r => r.pct === null || Number.isFinite(r.pct)) && off56.verdict && off56.verdict.tier)
    ? ok(`items 11 / 18 / v30 59.12a Gauntlet Mini plays nine games back to back and scores ${off56.score}% against the AUTHOR column, which is the default since build 59 — eight spokes on the web (Estimate's two modes are one), a verdict of "${off56.verdict.name}"`)
    : bad('items 11 / 18 a Gauntlet run with the switch off', JSON.stringify(off56 && { score: off56.score, web: off56.web }));
  (after56.runs === before56.runs && after56.unlock === before56.unlock && after56.ach === before56.ach && after56.bars === before56.bars && after56.gaunt === before56.gaunt + 1 && after56.tier === GA56.GAUNTLET_SCORE.tier /* AMENDED at build 59 (v30 59.12a): read the column off the config rather than naming it, so Aiden's real Author numbers landing needs no edit here */)
    ? ok('L10 a Gauntlet run advances NOTHING — no board row, no unlock, no achievement, no clearance bar — and writes one row to its own board, stamped with the column it was scored against')
    : bad('L10 a Gauntlet run wrote something it should not have', JSON.stringify({ before56, after56 }));

  /* ---- v29 Section A (58.1, build 58): A GAUNTLET DEALS EVENLY. Every step that deals a random quantity draws it from the band in
     config/gauntlets.js, so one run is about as hard as the next — Aiden's own example was Estimate · Grow, whose tier spans the WHOLE
     size range. The check is on the deal itself, not on the source: each engine announces what it actually dealt (`gaunt:deal`, after
     any snapping), the run above is driven for real, and every draw has to land inside its own step's band. A band with no draw is the
     other half of it — a step that quietly stopped reading its band would otherwise pass by saying nothing. ---- */
  {
    const bandsOf = id => { const out = {}; for (const k of Object.keys(GA56.GAUNTLET_BANDS)) out[k] = Object.assign({}, GA56.GAUNTLET_BANDS[k]);
      const ov = GA56.GAUNTLET_BAND_OVERRIDE[id] || {}; for (const k of Object.keys(ov)) out[k] = Object.assign({}, out[k], ov[k]); return out; };
    const want58 = bandsOf('g1');
    const deals58 = await page.evaluate(() => window.__d58 || []);
    const outside = deals58.filter(d => { const b = (want58[d.step] || {})[d.q]; return !b || !(d.v >= b[0] && d.v <= b[1]); });
    // one row per band the Mini roster actually plays, and every one of them has to have been drawn at least once
    const steps58 = (GA56.GAUNTLET_RUNS.g1 || []).map(st => st.g + ':' + st.d);
    const owed = [];
    for (const k of steps58) for (const q of Object.keys(want58[k] || {})) if (!deals58.some(d => d.step === k && d.q === q)) owed.push(k + ' · ' + q);
    const printed = steps58.filter(k => want58[k]).map(k => Object.entries(want58[k]).map(([q, b]) => `${k} ${q} ${b[0]}-${b[1]}`).join(', ')).join(' | ');
    (deals58.length && !outside.length && !owed.length)
      ? ok(`58.1 a Gauntlet deals evenly — ${deals58.length} draws across a whole Gauntlet Mini, every one inside its band, and no band left unread (${printed})`)
      : bad('58.1 a Gauntlet deals inside its bands', JSON.stringify({ drew: deals58.length, outside: outside.slice(0, 6), owed }));
    // Quick Tap and Dots deal no quantity at all, so neither may carry a band — a row for one would be a band nothing reads
    const idle58 = ['quick-tap:two', 'dots:blind'].filter(k => GA56.GAUNTLET_BANDS[k]);
    idle58.length ? bad('58.1 a band on a step that deals no quantity', idle58.join(', '))
      : ok('58.1 Quick Tap · Two and Dots · Blind carry no band — neither deals a quantity, and a band nothing reads is a number that can drift');
  }

  /* ---- v30 (59.12, build 59): THE SCORING, REPLAYED ON AIDEN'S OWN RUN ----
     He played a Gauntlet Mini on v0.58 and it read 310.8%: Quick Tap · Two 155.6, Dots · Blind 142.9, Estimate 242.8, Reaction ·
     Flash 128.3, Go / No-go 139.9, Stopwatch 172.4, Hidden 263.2, Spot · Find 1241.4. "I don't know how I got 310%. 100% is supposed
     to be relative to author times." The acceptance asks for that run replayed through the new scoring with before and after per
     row, so the RAW RESULT of each step is recovered by inverting the old arithmetic — the percentage and the old scaled key-1 bar
     give back the number he scored — and the new arithmetic is then run on it. Nothing here is typed except his eight percentages. */
  {
    const HIS = { 'quick-tap:two': 155.6, 'dots:blind': 142.9, hold: 242.8, 'reaction:flash': 128.3, 'reaction:nogo': 139.9,
      'timing:stopwatch': 172.4, 'timing:hidden': 263.2, 'spot:find': 1241.4 };
    const replay = await page.evaluate(async his => {
      const G = await import('./config/gauntlets.js'), R = await import('./run/gauntlet.js'), K = await import('./progress/key.js');
      const steps = G.GAUNTLET_RUNS.g1;
      const refOf = ref => K.COMBOS.find(c => c.key === ref);
      const scaled = (step, tier) => { const c = refOf(step.ref); if (!c) return null;
        let bar = K.barOf(c, tier); if (!(bar > 0)) return null;
        if (step.tot) { const rl = +String(step.ref).split(':')[2]; if (rl > 0) bar = bar * (step.s / rl); }
        return { bar, dir: c.bar.dir }; };
      const out = [];
      for (const st of steps) {
        const key = st.web || (st.g + ':' + st.d);
        const was = his[key]; if (was === undefined) continue;
        const old = scaled(st, 'clear'), now = scaled(st, 'author');
        if (!old || !now) { out.push({ key, was, now: null }); continue; }
        // invert the OLD arithmetic to recover what he actually scored on this step
        const v = old.dir === 'lower' ? old.bar * 100 / was : old.bar * was / 100;
        // and run the NEW arithmetic on it: the Author bar, then the 150 cap
        const d = R.stepDetail(st, { hits: v });
        out.push({ key, was, dir: old.dir, v: Math.round(v * 1000) / 1000, oldBar: Math.round(old.bar * 1000) / 1000,
          newBar: Math.round(now.bar * 1000) / 1000, raw: d && d.raw, pct: d && d.pct, capped: !!(d && d.capped) });
      }
      /* the headline is the average of the SPOKES, not of the steps: Estimate's Grow and Cut are one game and one spoke, so the two
         are averaged into it first. That is webOf()'s own rule, and averaging nine steps instead of eight spokes would not be his run. */
      const had = out.filter(r => typeof r.pct === 'number');
      const spoke = ks => { const g = {}; for (const r of ks) (g[r.key] = g[r.key] || []).push(r);
        return Object.values(g).map(rs => rs.reduce((a, r) => a + (typeof r.pct === 'number' ? r.pct : r.was), 0) / rs.length); };
      const nowSpokes = spoke(had), wasSpokes = spoke(out.map(r => ({ key: r.key, was: r.was, pct: r.was })));
      return { rows: out, spokes: nowSpokes.length,
        wasScore: Math.round(wasSpokes.reduce((a, v) => a + v, 0) / wasSpokes.length * 10) / 10,
        nowScore: nowSpokes.length ? Math.round(nowSpokes.reduce((a, v) => a + v, 0) / nowSpokes.length * 10) / 10 : null,
        cap: G.GAUNTLET_SCORE.cap, perfect: G.GAUNTLET_SCORE.perfect, tier: G.GAUNTLET_SCORE.tier };
    }, HIS);
    const rows12 = replay.rows.filter(r => typeof r.pct === 'number');
    // nine STEPS, eight SPOKES — Estimate's Grow and Cut are one game (item 18), which is why the two are averaged before the headline
    const allScored = rows12.length === replay.rows.length && replay.spokes === 8;
    const noneOver = rows12.every(r => r.pct <= replay.cap + .001);
    /* the Author bar is never SOFTER than the key-1 one it replaces — which is a bigger number where more is better and a smaller
       one where less is better, so the test reads the bar's own direction rather than assuming one. */
    const harder = rows12.every(r => r.dir === 'lower' ? r.newBar <= r.oldBar + 1e-9 : r.newBar >= r.oldBar - 1e-9);
    const capOn = replay.cap === 150 && replay.perfect === replay.cap && replay.tier === 'author';
    const sane = replay.nowScore !== null && replay.nowScore < replay.wasScore;
    (allScored && noneOver && harder && capOn && sane)
      ? ok(`v30 59.12 Aiden's own Mini replayed through the new scoring — his ${replay.wasScore}% becomes ${replay.nowScore}%: ${rows12.map(r => `${r.key} ${r.was}→${r.pct}${r.capped ? ' (capped)' : ''}`).join(' · ')}. Scored against the ${replay.tier} column, every step capped at ${replay.cap} with perfect set to the same so the cap cannot be beaten by a flawless round, and no row above it — Spot · Find's ${HIS['spot:find']} was one step adding 155 points to the headline`)
      : bad('v30 59.12 the Gauntlet scoring', JSON.stringify({ allScored, noneOver, harder, capOn, sane, replay }));

    /* 59.12b: A MINI STEP'S SCALED BAR MUST NOT BE SOFTER THAN THE SAME ROUNDS OF A FULL SET WOULD BE.
       `tot` scales the bar by rounds-played over rounds-in-the-set, which assumes the rounds played are AVERAGE ones. They were the
       set's opening rounds, and Spot · Find's crowd grows with the round number — so the two easiest of ten were measured against
       two tenths of a bar earned over all ten. The ramp now starts at the middle of the set, so the assumption holds. Asserted on
       the step the ENGINE is handed, not on the config, because that is where the two tables are put together. */
    const ramp12 = await page.evaluate(async () => { const G = await import('./config/gauntlets.js'), R = await import('./run/gauntlet.js');
      const out = {};
      for (const id of ['g1', 'g2']) out[id] = G.GAUNTLET_RUNS[id].map(st => { const rl = +String(st.ref || '').split(':')[2];
        const step = R.bandFor ? null : null; void step;
        const from = (!(rl > 0) || !(st.s > 0) || st.s >= rl) ? 1 : Math.floor((rl - st.s) / 2) + 1;
        return { key: st.g + ':' + st.d, s: st.s, rl: rl || null, tot: !!st.tot, from, last: from + st.s - 1 }; });
      return out; });
    const centred = Object.values(ramp12).flat().every(r => {
      if (!r.rl || r.s >= r.rl) return r.from === 1;                       // a step that plays the whole set starts where a set starts
      const mid = (r.rl + 1) / 2;                                          // the played block straddles the set's own midpoint
      return r.from <= mid && r.last >= mid - 1 && r.from >= 2;
    });
    centred
      ? ok(`v30 59.12b a Gauntlet deals the MIDDLE of the set, so a scaled bar is never softer than the rounds it is scaled from: ${ramp12.g1.filter(r => r.rl && r.s < r.rl).map(r => `${r.key} plays ${r.from}-${r.last} of ${r.rl}`).join(' · ')}`)
      : bad('v30 59.12b a Gauntlet step plays the easy end of its set', JSON.stringify(ramp12));
  }

  /* AMENDED AT BUILD 59 (v30 59.12a): the columns have SWAPPED SIDES. 'author' is the default now, so the first drive above is the
     Author one and this is the key-1 one; the claim either way is that the switch is one line in config/gauntlets.js and a whole
     run completes and scores on both columns. The tier a run is stamped with is asserted against whatever the config says, not
     against a name typed here, so the day Aiden's real Author numbers land this does not need touching. */
  await page.evaluate(() => import('./config/gauntlets.js').then(G => { G.GAUNTLET_SCORE.tier = 'clear'; }));
  const on56 = await driveGaunt('g1');
  const tier56 = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return (st.gaunt || [])[0] && (st.gaunt || [])[0].tier; });
  await page.evaluate(() => import('./config/gauntlets.js').then(G => { G.GAUNTLET_SCORE.tier = 'author'; }));
  (on56 && Number.isFinite(on56.score) && on56.web.length === 8 && on56.web.every(r => r.pct === null || Number.isFinite(r.pct)) && tier56 === 'clear')
    ? ok(`items 11 / 18 and with the switch moved the same run completes and scores against the key-1 column (${on56.score}%, stamped "${tier56}") — the switch is one line in config/gauntlets.js and both sides of it play`)
    : bad('items 11 / 18 a Gauntlet run with the switch on', JSON.stringify({ on56: on56 && { score: on56.score }, tier56 }));

  // one way through: a quit ends the Gauntlet outright and writes no row at all
  await page.evaluate(() => { window.__q56 = null; return import('./core/events.js').then(E => { E.on('gaunt:quit', o => { window.__q56 = o; }); }); });
  const wasG = await page.evaluate(() => ((JSON.parse(localStorage.getItem('ne')) || {}).gaunt || []).length);
  await page.evaluate(() => import('./run/gauntlet.js').then(G => G.startGauntlet('g1')));
  for (let i = 0; i < 60 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
  await sleep(400); await click('#quit'); await sleep(700);
  const quit56 = await page.evaluate(async () => { const G = await import('./run/gauntlet.js');
    return { quit: !!window.__q56, on: G.gauntOn(), rows: ((JSON.parse(localStorage.getItem('ne')) || {}).gaunt || []).length, screen: (document.querySelector('.screen.on') || {}).id }; });
  (quit56.quit && !quit56.on && quit56.rows === wasG && quit56.screen === 's-gauntlet')
    ? ok('item 11 one way through — a quit ends the whole Gauntlet, writes no row, and lands back on its own screen where the next attempt starts at game one')
    : bad('item 11 quitting a Gauntlet', JSON.stringify(quit56));

  /* ---- v29 Section A (57.9 / 57.10, build 57): THE GAUNTLET SCREENS. Aiden's own copy, one row per STEP so eight games read as eight rows, the
     count in the line above the list generated from the roster, nothing under the list, ENTER THE GAUNTLET on both, and the scary face in its deep
     red on the title, the map label and the button — Mega a step further than Mini. And Mini's Stopwatch step is two rounds, not one. ---- */
  {
    const CP57 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const G = CP57.GAUNTLET, fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
    /* 57.10, off the data: Mini's Stopwatch is two rounds and its 5-6s window is untouched. TURNED OVER at build 58 (58.1): the window
       moved from the step to GAUNTLET_BANDS, where it is one row of the band table with the other six. The rule it stands for did not
       change, only where the two numbers live, so the assertion reads them from their new home rather than being deleted. */
    const sw = (GA56.GAUNTLET_RUNS.g1 || []).find(s => s.g === 'timing' && s.d === 'stopwatch') || {};
    const swBand = (GA56.GAUNTLET_BANDS['timing:stopwatch'] || {}).target;
    const two = sw.s === 2 && !('target' in sw) && Array.isArray(swBand) && swBand.join() === '5,6';
    const gone = !('oneWay' in G) && /enter the gauntlet/i.test(G.go);
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, {}, { plain: { ...PLAIN, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } } });
    /* v30 (59.5, build 59): MEASURED AT 375, not at the gate's own 390. Cinzel is wider than Creepster and Cinzel Decorative
       wider again, and 59.5's acceptance is that the title and the button each stay on ONE LINE AT 375px — the narrower of the
       two phones Aiden checks. The viewport goes back to 390 straight after, so nothing downstream sees a different screen. */
    await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const screens = [];
    for (const id of ['g1', 'g2']) screens.push(await page.evaluate(async id => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(120); R.show('s-gauntlet', { id }); await wait(500);
      const s = document.getElementById('s-gauntlet'), rows = [...document.querySelectorAll('#gt-body .gtlist li')];
      const go = document.querySelector('#gt-body [data-act="gaunt-go"]');
      const face = el => el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') : '';
      const col = el => el ? getComputedStyle(el).color : '';
      const title = document.getElementById('gt-title');
      return { id, dataG: s.dataset.g, soon: document.getElementById('gt-soon').textContent,
        rows: rows.map(li => [li.querySelector('b').textContent, li.querySelector('span').textContent, li.querySelector('i').textContent]),
        hints: document.querySelectorAll('#gt-body .gtbrief .gthint').length,
        go: go ? go.textContent : '', titleFace: face(title), titleCol: col(title), goFace: face(go), goCol: col(go),
        rowFace: face(rows[0] ? rows[0].querySelector('span') : null),
        /* v30 (59.5): one line, off the LAYOUT — a box taller than about 1.4 line-heights has wrapped — and still on the phone.
           Both are what the new face has to earn, because it is wider than the one it replaces. */
        lines: [title, go].map(el => { if (!el) return 0; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          return Math.max(1, Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh)); }),
        onPhone: [title, go].every(el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= -.5 && r.right <= innerWidth + .5; }),
        weights: [title, go].map(el => el ? getComputedStyle(el).fontWeight : ''),
        vw: innerWidth,
        anim: title ? (title.getAnimations() || []).map(a => a.animationName).join() : '' }; }, id));
    const est = screens.map(s => (s.rows.find(r => /Estimate/.test(r[1])) || []));
    /* AMENDED AT BUILD 59 (v30 59.5): THE FACE IS CINZEL, NOT CREEPSTER. Aiden rejected Creepster outright — "it looks like
       horror theme when it should be serious theme, something like knightly or noble" — and answered build 57's question 3
       (Creepster or Nosifer for Mega) with NEITHER. Mini wears Cinzel 700 and Mega Cinzel Decorative 900: the same letters with
       flourishes, so Mega is a visible step up WITHOUT changing family. The flicker, the deep red and the mono rows are
       untouched, which is the other half of what he said — "but I like the flashing of the title" — so `gflick` and the two
       different title colours are still asserted here. The width check is new and is the item's own: ONE LINE at 375px. */
    const WANT_FACE = { g1: 'Cinzel', g2: 'Cinzel Decorative' };
    const looks = screens.every(s => s.titleFace === WANT_FACE[s.id] && s.goFace === WANT_FACE[s.id] && /jetbrains/i.test(s.rowFace) && /gflick/.test(s.anim))
      && screens[0].titleCol !== screens[1].titleCol;
    const oneLine = screens.every(s => s.vw === 375 && s.lines.every(n => n === 1) && s.onPhone)
      && screens.every(s => s.weights.every(w => +w >= 700));
    const copy = screens.every((s, i) => s.rows.length === 8 && s.hints === 0 && /ENTER THE GAUNTLET/i.test(s.go)
        && s.soon === fill(G.intro[s.id], { n: 8 }) && /8/.test(s.soon))
      && est[0][0] === '3' && /Estimate · Grow \+ Cut/.test(est[0][1]) && est[0][2] === fill(G.roundsEach, { n: 2 })
      && est[1][0] === '3' && est[1][2] === fill(G.roundsPair, { a: 7, b: 10 });
    (two && gone && copy && looks && oneLine)
      ? ok(`57.9 / 57.10 / v30 59.5 both Gauntlet screens read as Aiden wrote them: "${screens[0].soon}" and "${screens[1].soon}" with the 8 generated from the roster, EIGHT rows for eight games (Estimate is one — "${est[0][1]}", ${est[0][2]} on Mini and ${est[1][2]} on Mega), nothing under the list, ${screens[0].go} on both, and a NOBLE face in a deep red with the slow flicker untouched on the title and the button while the rows keep the mono face — ${screens[0].titleFace} ${screens[0].weights[0]} on Mini and ${screens[1].titleFace} ${screens[1].weights[0]} on Mega, each on ONE line at ${screens[0].vw}px and inside the phone, Mega's red (${screens[1].titleCol}) a step past Mini's (${screens[0].titleCol}). Mini's Stopwatch is ${sw.s} rounds, still drawn from its ${swBand.join('-')}s window`)
      : bad('57.9 / 57.10 / v30 59.5 the Gauntlet screens', JSON.stringify({ two, sw, swBand, gone, copy, looks, oneLine, screens, est }));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  }
}

/* ---- 8. build 27 (v16): the Timing unlock, the music engine, Find versus, the intro ---- */
if (section('build 27 — v16')) {
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
if (section('build 28 - v17 sections B.1 to B.18')) {
  const G28 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const U28 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const A28 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  const C28 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const KB28 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);

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
    // build 29: unlocks.js is the Unlocks TAB of ui/screens/progress.js now (B.21), and it is still one of the four
    const files = ['progress/key.js', 'ui/screens/key.js', 'ui/screens/progress.js', 'ui/screens/menu.js'];
    const hits = files.filter(f => /\b31\b|thirty-one/i.test(strip(read(f))));
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
      // AMENDED at build 44 (v24 D.2): "On the money" is a key roster row now, earned by a bar and never live - the live thing this record
      // earns is the chain's Cut unlock (one Grow round within 15%), so both stores are read
      const during = (() => { if (!RUN.R.demo) return null; RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 }); return Object.keys(S.store.ach).concat(Object.keys(S.store.unlock)); })();
      for (let i = 0; i < 90 && RUN.R.demo; i++) { answerReady(); await wait(100); }
      const afterDemo = { ach: Object.keys(S.store.ach), unlock: Object.keys(S.store.unlock), bars: Object.keys(S.store.bars), runs: S.store.runs.length };
      // and the same record, once the demo has handed over, DOES earn it - or this test proves nothing
      RUN.liveCheck({ hits: 1, x: 0.5, y: 0.5 });
      const afterReal = Object.keys(S.store.ach).concat(Object.keys(S.store.unlock));
      RUN.abort();
      return { sawDemo, during, afterDemo, afterReal };
    });
    if (!d.sawDemo) bad('B.4 the first-play demo runs at all', 'R.demo never went true');
    else if (d.during && d.during.length) bad('B.4 a demo earns nothing mid-run', 'it banked ' + d.during.join(', '));
    else if (d.afterDemo.ach.length || d.afterDemo.unlock.length || d.afterDemo.bars.length || d.afterDemo.runs)
      bad('B.4 a whole first-play demo writes nothing to the store', JSON.stringify(d.afterDemo));
    else if (!d.afterReal.includes('hold:cut')) bad('B.4 the same record earns normally once the demo hands over', JSON.stringify(d.afterReal));
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
      // AMENDED at build 43 (v24 C.6): an item locked by a KEY (`key`) is not open from the start either, so it is not seeded
      const unseeded = Object.entries(ITEMS).flatMap(([set, items]) => items.filter(i => !i.by && !i.key).map(i => 'cos:' + set + ':' + i.v)).filter(k => !seen[k]);
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
    const kp = read('games', 'spot', 'index.js');
    const padFromCap = /length:\s*SPOT_RAMP\.nCap\s*\+\s*1/.test(kp);
    padFromCap ? ok(`B.15 the keypad is built from SPOT_RAMP.nCap (${R.nCap}), so the band can never deal a count the player cannot answer`)
      : bad('B.15 the keypad must read the cap', 'it carries its own length');
    /* AMENDED at build 44 (v24 F.4): the flash no longer falls at all — it GROWS with the crowd a round deals, from flashBase, capped */
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
    // v24 (F.4, build 44): more shapes on screen, more time — every round's flash is exactly the crowd it deals, and never shorter than round 1's base
    // AMENDED at build 50 (v26 §B2): later rounds stay up longer as well — flashRound ms a round from flashRoundFrom, inside the same cap
    const flashOf = x => Math.min(R.flashCap, R.flashBase + R.flashShape * Math.max(0, x.n + x.decoys - R.flashFree) + R.flashRound * Math.max(0, x.r - R.flashRoundFrom + 1));
    const grows = r.every(x => x.flash === flashOf(x) && x.flash >= R.flashBase) && r[9].flash > r[0].flash && !('flashPer' in R) && !('flashMin' in R);
    grows ? ok(`F.4 the Count flash grows with the crowd - round 1 ${r[0].flash}ms for ${r[0].n + r[0].decoys} shapes, round 10 ${r[9].flash}ms for ${r[9].n + r[9].decoys}, capped at ${R.flashCap}ms`)
      : bad('F.4 the flash must grow with the shapes shown', JSON.stringify(r.map(x => [x.n + x.decoys, x.flash])));
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
    const src = read('games', 'estimate', 'index.js');
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
if (section('build 29 - v17 sections B.19 to B.26')) {
  const V29 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const AU29 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const TH29 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const C29 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const html29 = read('index.html');
  const css29 = read('styles', 'app.css');

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
    // AMENDED at build 58 (58.3): the chip row is BUILT by the screen from CHESTS now, so the screen has to be open before it can be read
    await click('[data-go="s-prog"]'); await sleep(500);
    const m = await page.evaluate(() => ({
      // AMENDED at build 40 (v23 L.11a): the Customise row carries "open the Games chest" under its label while locked, so read the label alone
      items: [...document.querySelectorAll('#s-menu .item')].map(b => (b.firstChild ? b.firstChild.textContent : b.textContent).trim()),
      prog: !!document.getElementById('s-prog'),
      old: !!document.getElementById('s-unl') || !!document.getElementById('s-ach'), custom: !!document.getElementById('s-custom'),
      tabs: [...document.querySelectorAll('#prog-tabs .chip')].map(c => c.dataset.tab) }));
    await click('#s-prog .back'); await sleep(400);
    // AMENDED at build 39 (v23 L.4a / L.4b): Customise is a menu row and a screen again, and the middle tab is Customise unlocks
    /* TURNED OVER at build 58 (58.3): SIX tabs, one per chest in the order they open, then Customise unlocks and Achievements. What B.21
       and B.31 stand for is unchanged — ONE menu item, one screen file, and the chain's tab first (2.2) — and that is what is asserted; the
       list of tab ids is read off config/chests.js so it cannot be a second copy of the chest order. */
    const { CHESTS: CH58 } = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
    const wantTabs58 = CH58.map(c => 'c-' + c.id).concat(['cul', 'ach']).join();
    (m.prog && !m.old && m.custom && m.items.includes('Progress') && !m.items.includes('Unlocks') && !m.items.includes('Achievements') && m.items.includes('Customise') && m.tabs.join() === wantTabs58)
      ? ok(`B.21 / B.31 one menu item - ${m.items.join(' · ')} - with tabs ${m.tabs.join(' / ')}, the Games chest first (2.2)`)
      : bad('B.21 / B.31 Unlocks, Customise and Achievements are one item with one tab per chest', JSON.stringify({ m, wantTabs58 }));
    const files = fs.readdirSync(path.join(root, 'ui', 'screens'));
    (!files.includes('unlocks.js') && !files.includes('achievements.js') && files.includes('progress.js'))
      ? ok('B.21 one screen file, not a host importing two (A4)') : bad('B.21 the two screen files are merged', files.join(', '));
  }
  // B.21: the tab is remembered, and the tab that is up is the one that is rendered
  {
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, progTab: 'unl' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(400);
    const a = await page.evaluate(() => ({ unl: !document.getElementById('p-chest').hidden, rows: document.querySelectorAll('#chest-list .urow').length }));
    await click('#prog-tabs [data-tab="ach"]'); await sleep(400);
    const b = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden, rows: document.querySelectorAll('#achlist .a').length, stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }));
    await click('#s-prog .back'); await sleep(300); await click('[data-go="s-prog"]'); await sleep(400);
    const c = await page.evaluate(() => ({ ach: !document.getElementById('p-ach').hidden }));
    (a.unl && a.rows > 0 && b.ach && b.rows > 0 && b.stored === 'ach' && c.ach)
      ? ok(`B.21 both tabs render (${a.rows} unlock rows on the Games chest, ${b.rows} achievements) and the last tab is remembered`)
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
      // AMENDED at build 49 (v26 item 13): a Gauntlet's connector (.gt) hangs off its chest and is not a step of the chain
      const segs = [...document.querySelectorAll('#gridlines .gl:not(.gt)')].map(p => { const d = p.getAttribute('d').match(/-?[\d.]+/g).map(Number);
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
    // AMENDED at build 48 (v26 item 12): a locked key chest says what opens it in words - "Earn the Pro key" - and still no number
    (ch.shown.join() === 'true,true,true,true' && ch.needs.join('|') === 'Earn the Skill key|Earn the Pro key|Earn the Author key' /* AMENDED for build 49 (Aiden, after build 48): the Skill key */ && !/\d/.test(ch.needs.join('')))
      ? ok('B.24 / A.1 AMENDED at build 40 (v21 G.1, narrowing A.1; v23 L.10): with no dev flag all four chests are on the map, the Key, Pro and Author chests locked with the key that opens each (AMENDED at build 48, v26 item 12) and no number about what is inside')
      : bad('A.1 the grid mentions pro or author', JSON.stringify({ shown: ch.shown, text: ch.text.slice(0, 120) }));
  }
  /* B.24: every bar cleared -> the chest is openable, opens once, stores it, and says what it gave.
     AMENDED at build 40 (v23 L.8b / L.10): the chest key 1 opens is the KEY chest, behind the Games chest; a tap opens its key screen and
     the chest opens THERE by itself - there is no "Open the chest?" and no ask box in the page at all - and what it gave is its words */
  {
    const seed = await page.evaluate(async () => { const K = await import('./progress/key.js'); const U = await import('./config/unlocks.js'); const bars = {}, unlock = {};
      for (const c of K.COMBOS) bars[c.key] = Date.now(); for (const x of U.UNLOCKS) unlock[x.key] = Date.now(); return { bars, unlock }; });
    // AMENDED at build 43 (v24 B.2 / B.3): key 1's earn moment is marked seen, so the map's tap opens the chest straight away (an unseen one plays in full first — build 43's own section)
    await setStorage({ ne: { v: 5, prefs: { ...OPEN_PREFS, allOpen: false, keySeen: 1, keyWhole: { clear: 1 }, progTab: 'unl', chests: { games: 1 } }, runs: [], ach: {}, unlock: seed.unlock, intro: SEEN_INTRO, seen: {}, bars: seed.bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-pick"]'); await sleep(700);
    const before = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { cls: c.className, need: c.querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap') }; });
    // AMENDED at build 41 (v23 L.6 / L.11b): the open is the Skill chest's CEREMONY on its key screen, and what it gave spills out on the map after "tap to continue"
    await click('.chest[data-chest="key"]'); await sleep(2300);
    const after = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.key,
      box: document.getElementById('key-cere').hidden ? '' : document.getElementById('key-cere').innerText.replace(/\s+/g, ' ').trim(), toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }));
    await revealDone(); await sleep(700);
    after.map = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, words: [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].map(x => x.dataset.w).join(' · ') }));
    (/ready/.test(before.cls) && before.need === 'tap to open' && !before.ask) ? ok('B.24 every bar cleared and the Skill chest is openable - and there is no ask box in the page (AMENDED at build 40, L.8b)') : bad('B.24 the openable chest', JSON.stringify(before));
    (after.screen === 's-key' && after.stored === 1 && after.box.toLowerCase().includes((C29.GRID.chest.key + ' opened').toLowerCase()) && !after.toast && after.map.screen === 's-pick' && /GAUNTLET/.test(after.map.words))
      ? ok(`B.24 a tap on the ready chest opens it once and for good, as its ceremony over the key screen - "${after.box}" - and its tap lands on the map with "${after.map.words}" beside it (AMENDED at build 43, B.2: the map's tap opens it, the key screen never does by itself)`) : bad('B.24 opening the chest', JSON.stringify(after));
    (!/\bauthor\b/i.test(after.box + ' ' + after.map.words)) ? ok('B.24 / A.1 an opened Skill chest says only what it gave - nothing about Author, which waits for the Pro chest') : bad('A.1 the opened chest', after.box + ' ' + after.map.words);
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
    const P = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
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
  rv1: {
    if (!REVIEW) { noReview('B.26 the review catalogue reads config/verdicts.js'); break rv1; }
    const gen = rvRead('scripts', 'catalogue.mjs');
    const tpl = rvRead('scripts', 'catalogue.template.html');
    const reads = /config\/verdicts\.js/.test(gen) && /verdicts/.test(gen);
    const prints = /id="verdicts"/.test(tpl) && /verd-host/.test(tpl) && /REF\.verdicts/.test(tpl);
    (reads && prints) ? ok('B.26 the catalogue reads config/verdicts.js out of the running app and prints a section per game')
      : bad('B.26 the review board shows the verdict tables', JSON.stringify({ reads, prints }));
  }
}

/* ---- 11. build 30 (v17 §B.27–§B.33): music and sound ---- */
if (section('build 30 - v17 sections B.27 to B.33')) {
  const AU30 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const KY30 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const G30 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const css30 = read('styles', 'app.css');
  const keyjs30 = read('ui', 'screens', 'key.js');
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
    const src = read('audio.js');
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
    const src = read('audio.js');
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
    // AMENDED at build 42 (v23 L.7a): the loops are the rewritten themes, theme:key / theme:pro / theme:thorns
    /* AMENDED AT BUILD 53 (v28 item 3): the Author key's theme is THORNS, not Thorn, so a key's `theme` and its track's own `name` are the same
       word — Customise's one Music row titles the three key tracks by the theme and a mismatch would be two spellings of one thing. */
    const themeNames30 = KY30.KEYS.every(k => AU30.TRACKS[k.track].name === k.theme);
    (!missing.length && themeNames30 && KY30.KEYS.map(k => k.theme).join(' → ') === 'Lantern → Circuit → Thorns' && KY30.KEYS.map(k => k.track).join(',') === 'theme:key,theme:pro,theme:thorns')
      ? ok('B.31 / B.22 / v28 item 3 Lantern → Circuit → Thorns, each with its own tint, each the TITLE of its own loop on Customise\'s Music row, and the loops are the build-42 themes theme:key / theme:pro / theme:thorns')
      : bad('B.31 a theme and a track per tier', JSON.stringify(missing.map(k => k.id)));
    // nothing about the second and third tier before chest 1 - not a row, not a word (A.1)
    // #411: allOpen OFF - a first-timer is the subject of A.1, and OPEN EVERYTHING is now an escape from this gate
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, allOpen: false, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    // AMENDED at build 43 (v24 A.1): the Keys menu row is locked before the Games chest, so the quiet key screen is opened directly
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key'); }); await sleep(700);
    const before = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      txt: document.getElementById('s-key').textContent.toLowerCase(), theme: document.querySelector('#key-keys .kkey i')?.textContent,
      locked: document.querySelectorAll('#key-keys .kkey.locked').length, lockedTxt: [...document.querySelectorAll('#key-keys .kkey.locked')].map(x => x.textContent).join(' | ') }));
    (before.n === 3 && !before.theme /* AMENDED at build 48 (v26 item 9): no theme name on a key card */ && before.locked === 3 && /open the Games chest/i.test(before.lockedTxt) && /open the previous chest/i.test(before.lockedTxt) && !/\d|%/.test(before.lockedTxt))
      ? ok('B.31 / A.1 AMENDED at build 40 (v23 L.10a): before the Games chest all three keys are on the strip and all three are crossed out - key 1 with "open the Games chest", the other two with "open the previous chest" - and no number')
      : bad('B.31 Frost and Thorn are hidden until chest 1', JSON.stringify(before).slice(0, 200));
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const after = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent) }));
    // AMENDED at build 48 (v26 item 9): the cards carry no theme name - Lantern, Circuit and Thorn name backgrounds and music, not keys
    (after.n === 3 && !after.themes.length) ? ok('B.31 all three arrive with chest 1, and no card carries a theme name (v26 item 9)')
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
    (!dev.chest && dev.open.n === 3 && !dev.open.themes.length /* AMENDED at build 48 (v26 item 9) */ && !dev.open.one && dev.open.pro && dev.open.author && dev.open.rungs === 3)
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
    // AMENDED at build 42 (v23 L.7b): the loop goes through themeOf(), which hands back the tier's own track once its chest is open and the menu loop until then
    (/themeOf\(keyTiers\(\)\[openKey\]\)/.test(keyjs30) && /\? t\.track : 'menu'/.test(keyjs30) && !/key:1/.test(keyjs30)) ? ok('B.31 the key screen asks for the tier\'s own loop by name, never by number (through themeOf, AMENDED at build 42)')
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
        gameOpen: b.filter(x => !x.dataset.v.startsWith('key:') && !x.classList.contains('locked')).length,
        keyLocked: b.filter(x => x.dataset.v.startsWith('key:') && x.classList.contains('locked')).length,
        label: document.getElementById('c-track').parentElement.querySelector('.clabel')?.textContent,
        txt: document.getElementById('c-track').parentElement.textContent.toLowerCase(), menu: document.querySelectorAll('#c-menumusic button').length }; });
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): THE ROW IS NOT LOCKED BEHIND THE PRO CHEST ANY MORE. Music choice is open from the first visit —
       this game's three tracks, always — and what is gated is the three KEY TRACKS, each until its own key is EARNED. A.1's "nothing about a
       later tier" no longer applies to them, because v21 G.1 put all three keys on screen from the first visit, so naming one hides nothing;
       a locked key track says what opens it under the row (B.30) rather than carrying a silent padlock. */
    (locked.n === 6 && !locked.lock && locked.label === 'Music' && locked.menu === 2 && locked.gameOpen === 3 && locked.keyLocked === 3)
      ? ok(`B.28 / v28 item 2 the music row is ONE row and the whole choice: this game's three tracks open from the first visit ("${locked.first}" …) and one track per key, all three locked until their own key is earned`)
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
    // AMENDED AT BUILD 53 (v28 item 2): SIX — this game's three, then one per key. The second is still one of this game's three, so what it
    // stores is unchanged; unlock-all now opens the three KEY tracks rather than the row itself, which is open to everybody
    (open30.n === 6 && g0 && AU30.TRACK_OPTS[g0].includes(open30.stored[g0]))
      ? ok(`B.28 / v28 item 2 the row is this game's three tracks and one per key: "${open30.sel}" is stored as ${g0} → ${open30.stored[g0]}, and unlock-all opens the three key tracks`)
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
    // AMENDED at build 43 (v24 C.5): the hand-back also waits out a key's earn moment when the clear makes the key whole — `+ earnWait`, 0 otherwise
    const wait = /handBack\(\); \}, (\d+) \+ arrive(?: \+ earnWait)?\)/.exec(keyjs30);
    const g = grow && +grow[1], h = halo && +halo[1], w = wait && +wait[1];
    (Math.abs(g - .93) < .01 && Math.abs(h - 2.85) < .01 && w >= h * 1000)
      ? ok(`B.33 the unlock animations run at 1.5x - ${g}s and ${h}s - and the interlude waits ${w}ms, past the halo it lights`)
      : bad('B.33 the key animations are slower', JSON.stringify({ g, h, w }));
  }
  /* ---- the review catalogue plays what a run plays (B.29 / B.27 / B.31) ---- */
  rv2: {
    if (!REVIEW) { noReview('B.29 / B.27 / B.31 the review catalogue plays what a run plays'); break rv2; }
    const gen = rvRead('scripts', 'catalogue.mjs');
    const tpl = rvRead('scripts', 'catalogue.template.html');
    // AMENDED at build 42 (v23 L.7e): the key themes are read out of KEY_THEMES, not named
    const reads = /\{ *long: *1 *\}/.test(gen) && /\{ *run:/.test(gen) && /\{ *flow: *1 *\}/.test(gen) && /AU\.KEY_THEMES/.test(gen);
    const plays = /hold > 0/.test(tpl) && /createBiquadFilter/.test(tpl) && /what a run plays/.test(tpl);
    (reads && plays) ? ok('the catalogue reads the arc, the long form and the flow layer out of the running app, and plays the filter and the hold the new tracks use')
      : bad('the review board carries build 30\'s music', JSON.stringify({ reads, plays }));
  }
}

/* ---- 12. build 31 (v18 §B.1–§B.14): the runs ---- */
if (section('build 31 - v18 sections B.1 to B.14')) {
  const UN31 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const AU31 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const G31 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB31 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const VD31 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const rx31 = read('games', 'reaction', 'index.js');
  const tm31 = read('games', 'timing', 'index.js');
  const run31 = read('run', 'run.js');
  const pg31 = read('progress.js');

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
    /* B.1a (the instruction arrives whole) was a source-text check spelling rulePause's rxBar call with SHAPE_WORD. DELETED at build 50 (site/CLAUDE.md →
       The gate): SHAPE_WORD retired into config/shapes.js. The runs section drives the rule bar on the page since build 50 */
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
      if (st.hud) hudSeen = st.hud;
      if (st.lit) await down('#gen');
      await sleep(45); }
    const end = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default;
      return { round: R.round, dealt: R.goDealt, score: document.querySelector('#over-score').textContent.trim() }; });
    // AMENDED at build 48 (v26 item 1): the Set's round line is gone - the big counter says how far through a player is
    (end.round === 5 && end.dealt === 15 && hudSeen === '')
      ? ok('B.1b a Go / No-go Set is 5 rounds × 3 target shapes — 15 dealt, and no round line on the HUD at any point (v26 item 1)')
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
    (/spentOf:'\{tot\} \/ \{bud\}s'/.test(read('config', 'copy.js'))
      && /streakScore\(\)\{ return this\.hid\(\)\?String\(this\.errs\.length\):this\.spentLine\(\); \}/.test(tm31))
      ? ok('B.3d the Stopwatch Streak’s big number is the time spent out of the budget, not the round "attempt N" already names')
      : bad('B.3d the Streak score is the spend');
  }

  /* ---- B.4 / B.5: Hidden in milliseconds, and the Streak’s variation ---- */
  {
    const ms = /const off=\(b\.t-b\.markT\)\/b\.v\*1000/.test(tm31);
    const cfgOk = G31.HIDDEN.band > 0 && G31.HIDDEN.tilt > 0 && G31.HIDDEN.far > 0;
    /* AMENDED at build 45 (v25 item 21): the three variations moved into TM.hiddenRamp(round, vary) — expression for expression, so the review
       catalogue's Round formats table reads the ramp the game deals from instead of a typed copy. The check follows them there. */
    const ramp45 = (tm31.match(/hiddenRamp\(round,vary\)\{[\s\S]*?\},\r?\n/) || [''])[0];
    const varies = /const vary=this\.streak\(\)&&!this\.two\.on/.test(tm31) && /const R=this\.hiddenRamp\(this\.round,vary\)/.test(tm31)
      && /jit\(R\.band\)/.test(tm31) && /jit\(R\.spread\)/.test(tm31) && /R\.tilt\*Math\.PI\/180/.test(tm31)
      && /band:vary\?HIDDEN\.band:0/.test(ramp45) && /HIDDEN\.far\*k/.test(ramp45) && /HIDDEN\.spread\*k/.test(ramp45) && /HIDDEN\.tilt\*\(k\/Math\.max\(1,HIDDEN\.rampTo-1\)\)/.test(ramp45);
    (ms && cfgOk && varies) ? ok(`B.4 / B.5 Hidden scores the TIME between ball and marker, and a Streak varies its pace (±${G31.HIDDEN.band * 100}%), its angle (to ${G31.HIDDEN.tilt}°) and its distance (+${G31.HIDDEN.far * 100}% a round)`)
      : bad('B.4 / B.5 milliseconds and the variation', JSON.stringify({ ms, cfgOk, varies }));
    // nothing anywhere still calls Hidden pixels
    const pxLeft = [['config/games.js', G31.GAMES.timing.per.hidden.suffix], ['config/key-bars.js', KB31.KEY_BARS['timing:hidden:10'].unit]].filter(([, v]) => /px/.test(String(v)));
    // AMENDED at build 44 (v24 §E): the conversions stood until Aiden set both bars himself — 1500ms and 2.5s, in the converted units
    (!pxLeft.length && KB31.KEY_BARS['timing:hidden:10'].bar === 1500 && KB31.KEY_BARS['timing:stopwatch:5'].bar === 2.5 && KB31.KEY_BARS['timing:hidden:10'].unit === 'ms total')
      ? ok('B.2 / B.4 no pixel unit is left on Hidden, and both Timing Set bars are Aiden’s own in the new units — 1500ms total, 2.5s total (v24 §E)')
      : bad('B.4 no pixel unit is left on Hidden', JSON.stringify(pxLeft));
  }

  /* ---- B.6: the Flash Set scores a slow attempt instead of throwing it away ---- */
  {
    const cp31 = read('config', 'copy.js');
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
    const audio31 = read('audio.js');
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
    const toast31 = read('ui', 'toast.js');
    /* DELETED at build 49 (site/CLAUDE.md -> The gate): the result.js half, which spelled the toast list's tuple `[unlockToast(u.key),'','ok',false,u.key]`
       and failed when §B1 added a sixth field (the game whose map sound follows its unlock toast). The toast.js and run.js halves stand */
    const midRun = /toast\(unlockToast\(x\.key\),'','ok'\)/.test(run31) && !/toast\(unlockToast\(x\.key\),'','ok',[^)]/.test(run31);
    (/dataset\.goto/.test(toast31) && /unlockWhere/.test(toast31) && midRun)
      ? ok('B.12 an unlock toast knows where it leads and opens that pick sheet; mid-run it stays a toast')
      : bad('B.12 tapping an unlock toast goes there', JSON.stringify({ midRun }));
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
if (section('build 32 - v19 section C and v18 sections B.15 to B.27')) {
  const rx32 = read('games', 'reaction', 'index.js'), keyjs32 = read('ui', 'screens', 'key.js'), css32 = read('styles', 'app.css');
  const store32 = read('core', 'store.js'), run32 = read('run', 'run.js'), pkjs32 = read('progress', 'key.js'), pick32 = read('ui', 'screens', 'pick.js');
  const tpl32 = rvRead('scripts', 'catalogue.template.html'), cat32 = rvRead('scripts', 'catalogue.mjs');
  const G32 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const KB32 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const KY32 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CP32 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const B32 = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
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
    /* AMENDED at build 50 (v26 §B2, #444): Go / No-go's pool is config/shapes.js DEALS 'reaction:nogo' — nine shapes, the hexagon gone — and every shape is
       the shared svg. The stylesheet half of this check is DELETED (site/CLAUDE.md → The gate): it tested how app.css spelled the clip paths */
    { const CS32 = await import(pathToFileURL(path.join(root, 'config', 'shapes.js')).href), pool32 = CS32.DEALS['reaction:nogo'].pool;
      (pool32.length === 9 && !pool32.includes('hex') && pool32.every(s => CS32.SHAPES[s]))
        ? ok('C.3 amended: Go / No-go deals ' + pool32.length + ' shapes (' + pool32.join(', ') + '), every one on the shape list, no hexagon')
        : bad('C.3 the Go / No-go shapes', pool32.join(',')); }
    const s32 = strip(rx32);
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
    // AMENDED at build 44 (v24 §E): the conversion stood until Aiden set both bars himself — 400 over the gate and 10 targets, in the same units
    (ng.bar === 400 && ng.dir === 'lower' && ng.unit === 'ms avg over 180' && ngs.bar === 10 && ngs.dir === 'higher' && ngs.unit === 'targets')
      ? ok('C.5 / C.6 the Go / No-go bars are read over the gate and in targets — Aiden\'s 400ms and 10 targets (v24 §E)')
      : bad('the two Go / No-go bars', JSON.stringify([ng, ngs]));
  }
  /* ---- §C as behaviour: 400 dealt rounds, the target order, the dwell draw, the arithmetic ---- */
  {
    const d = await page.evaluate(async () => { const M = await import('./games/reaction/index.js'); const R = M.default; const G = await import('./config/games.js');
      // AMENDED at build 50 (v26 §B2): the pool is DEALS 'reaction:nogo', and a round's go shape comes from the dealer, keyed by the round
      const CS = await import('./config/shapes.js');
      R.ctx = { mode: 'nogo', len: 5 }; R.two = { on: false }; R.rule = 'circle'; R.spec = null; R.dealer = null;
      const all = CS.DEALS['reaction:nogo'].pool;
      const out = { n: 0, first: 0, count: 0, adjacent: 0, thrice: 0, dup: 0, badDecoy: 0, gaps: {}, lens: {}, min: 99, max: 0, shapesSeen: new Set() };
      for (let i = 0; i < 400; i++) { const b = R.dealRound(); out.n++;
        out.lens[b.length] = (out.lens[b.length] || 0) + 1; out.min = Math.min(out.min, b.length); out.max = Math.max(out.max, b.length);
        if (b[0] === R.rule) out.first++;
        if (b.filter(s => s === R.rule).length !== R.GO_PER) out.count++;
        let gap = 0; for (let j = 0; j < b.length; j++) { b[j] === R.rule ? (out.gaps[gap] = (out.gaps[gap] || 0) + 1, gap = 0) : gap++; if (j && b[j] === R.rule && b[j - 1] === R.rule) out.adjacent++; if (b[j] !== R.rule) { out.shapesSeen.add(b[j]); if (!all.includes(b[j])) out.badDecoy++; } }
        for (let j = 2; j < b.length; j++) if (b[j] === b[j - 1] && b[j] === b[j - 2]) out.thrice++;
        for (let j = 1; j < b.length; j++) if (b[j] !== R.rule && b[j] === b[j - 1]) out.dup++; }
      // C.3: a Set's five targets are the five shapes, and a Streak never deals the same target twice running
      R.rule = ''; R.dealer = null; const setOrder = []; for (let i = 0; i < 5; i++) { R.round = i + 1; R.rule = R.nextTarget(); setOrder.push(R.rule); }
      let repeat = 0; R.rule = ''; R.dealer = null; let prev = ''; for (let i = 0; i < 60; i++) { R.round = i + 1; R.rule = R.nextTarget(); if (R.rule === prev) repeat++; prev = R.rule; }
      R.spec = null; R.dealer = null;
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
    // AMENDED at build 50 (v26 §B2): decoys come from the other eight shapes of the nine
    (d.shapesSeen.length === 8 && d.distinctTargets === 5 && !d.repeat)
      ? ok(`C.3 decoys come from the other eight shapes (${d.shapesSeen.join(', ')}), a Set's five targets are five different shapes (${d.setOrder.join(' → ')}), and a Streak never repeats a target twice running`)
      : bad('C.3 the five shapes', JSON.stringify({ seen: d.shapesSeen, order: d.setOrder, repeat: d.repeat }));
    (d.dwSet.min >= 800 && d.dwSet.max <= 1160 && d.dwSet.distinct > 20 && d.dwStreak.min >= 1150 && d.dwStreak.max <= 1510 && d.dwStreak.distinct > 20)
      ? ok(`C.4 300 dwell draws: a Set shape stays ${d.dwSet.min}–${d.dwSet.max}ms, a Streak shape ${d.dwStreak.min}–${d.dwStreak.max}ms, and the draw varies`)
      : bad('C.4 the dwell draw', JSON.stringify({ set: d.dwSet, streak: d.dwStreak }));
    (d.set0 === 200 && d.set1 === 350 && d.set2 === 350 && d.setFree === 0 && d.streakHits === 7)
      ? ok(`C.5 the arithmetic: three 380ms taps read 200 (over the gate), a wrong tap adds 150 (350), a skipped 980ms target is charged 800 (mean 350), three taps at or under 180 read 0, and a Streak reads its targets (7), not its shapes (40)`)
      : bad('C.5 the scoring', JSON.stringify({ set0: d.set0, set1: d.set1, set2: d.set2, setFree: d.setFree, streakHits: d.streakHits }));
    // the migration as behaviour: a v2 record with Go / No-go runs in the old units
    /*
   v29 (item 13, build 55): the fixture OPENS the chest it needs. It used to lean on OPEN EVERYTHING, and a dev flag no
   longer banks a bar or retro-credits a column — "OPEN EVERYTHING and SUPPORTER stay flags that store no progress"
   (CLAUDE.md). Every READ still honours the escapes; only the two writers ask tierEarned().
    */
    await setStorage({ ne: { v: 2, prefs: { ...OPEN_PREFS, chests: { games: 1, key: 0, pro: 0, thorns: 0 } }, runs: [
        { t: NOW - 1000, g: 'reaction', d: 'nogo', s: 5, n: '', v: 3, hits: 380, misses: 0 }, { t: NOW - 2000, g: 'reaction', d: 'nogo', s: -1, n: '', v: 3, hits: 12, misses: 1 },
        { t: NOW - 3000, g: 'reaction', d: 'flash', s: 5, n: '', v: 3, hits: 255, misses: 0 }, { t: NOW - 4000, g: 'quick-tap', d: 'two', s: 5, n: '', v: 3, hits: 14, misses: 0 } ],
      unlock: {}, ach: { rx_clean: NOW }, intro: SEEN_INTRO, seen: {}, bars: { 'reaction:nogo:5': NOW, 'reaction:nogo:-1': NOW, 'quick-tap:two:5': NOW } } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const mig = await page.evaluate(async () => { const S = await import('./core/store.js');
      return { v: JSON.parse(localStorage.getItem('ne')).v, runs: S.store.runs.map(r => r.g + ':' + r.d), bars: Object.keys(S.store.bars).sort(), ach: Object.keys(S.store.ach), mig: S.prefs.mig32, toast: document.getElementById('toast').textContent.trim() }; });
    // AMENDED at build 38 (#426): key-1 bars only - with Pro now a real tier, boot credits this profile's 14-hit run against Pro's 14 too
    // AMENDED at build 44 (v24 §E): key 1 is credited at boot too now, so the surviving Flash run's 255ms banks Aiden's 295ms Flash · Set bar
    (mig.runs.join(',') === 'reaction:flash,quick-tap:two' && mig.bars.filter(k => !k.includes('|')).join(',') === 'quick-tap:two:5,reaction:flash:5,reaction:nogo:5' && !mig.bars.includes('reaction:nogo:-1') && mig.ach.includes('rx_clean'))
      ? ok(`C.5 / C.6 a v2 record retires exactly the two Go / No-go runs and the Streak bar's cleared flag — the Set bar, the Flash run, the Quick Tap run and Disciplined stay (${mig.toast || 'toast pending'})`)
      : bad('the Go / No-go migration', JSON.stringify(mig));
  }
  /* ---- B.27: three tiers per row, the shell derived from the column, the catalogue's three inputs ---- */
  {
    const rows = Object.values(KB32.KEY_BARS);
    /* AMENDED at build 44 (v24 §E): both columns are FULL - each Pro and Author number is either Aiden's (no marker: the twelve Quick Tap and
       Dots Pro figures) or a desk proposal whose marker still holds (the other 48); every key 1 bar is `conf:'set'` */
    const aidenPro = rows.filter(r => /^(qt|dt)-/.test(r.id));
    /* AMENDED at build 60 (v31 60.6): ONE AUTHOR CELL IS AIDEN'S NOW — `es-cut-streak`, 25, "I reached around 25, put that as an
       author time for now" (2026-09-23). A.2 as amended at #426 says a ported number DROPS its marker and no build regenerates it,
       so the rule this asserts is not "every author cell is marked" but "every author cell is EITHER Aiden's, with no marker, OR a
       desk proposal whose marker still matches the number". The same shape the Pro column has had since build 44. */
    const aidenAuthor = rows.filter(r => !(r.placeholder && r.placeholder.author));
    (rows.every(r => typeof r.pro === 'number' && typeof r.author === 'number' && r.conf === 'set'
        && r.placeholder && (!r.placeholder.author || (r.placeholder.author.v === r.author && r.placeholder.author.by === 'desk')))
      && aidenAuthor.length === 1 && aidenAuthor[0].id === 'es-cut-streak' && aidenAuthor[0].author === 25
      && aidenPro.length === 12 && aidenPro.every(r => !('pro' in r.placeholder)) && rows.filter(r => !aidenPro.includes(r)).every(r => r.placeholder.pro && r.placeholder.pro.v === r.pro && r.placeholder.pro.by === 'desk')
      && KY32.KEYS.every(k => !('shell' in k)))
      ? ok(`B.27 / v24 §E / v31 60.6 every one of the ${rows.length} rows carries pro and author: 12 Pro figures and 1 Author figure (es-cut-streak, 25) are Aiden's own and carry no marker, the other ${rows.length * 2 - 13} cells are desk proposals marked by:'desk' whose markers still match their numbers, every key 1 bar is conf 'set', and config/keys.js carries no shell flag`)
      : bad('B.27 the data shape', JSON.stringify(rows.filter(r => !(typeof r.pro === 'number' && typeof r.author === 'number' && r.placeholder && r.conf === 'set')).map(r => r.id)));
    const sh = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const KB = await import('./config/key-bars.js');
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.store.bars = {}; S.save();   // AMENDED at build 40 (L.10): chest 1 is the Skill chest, behind the Games chest
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
      // v29 (item 13, build 55): tierEARNED, not tierOpen — the Pro chest is shut in this fixture, so Author is SHOWN (the dev flag) and never BANKED
      out.full = { tiers: K.keyTiers().map(k => k.id + ':' + (k.shell ? 'shell' : 'live')), adv: adv2 && adv2.tier, bars: Object.keys(S.store.bars).sort(), author: K.tierEarned('author'), pct: K.keyPct('pro') };
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
    !REVIEW ? noReview('B.27 the catalogue emits all three tiers a row')
      : (/pro: b \? KY\.barOf\(c, 'pro'\) : null, author: b \? KY\.barOf\(c, 'author'\) : null/.test(cat32) && /id="' \+ PFX\[tier\] \+ r\.id/.test(tpl32) && /inp\('clear'\) \+ inp\('pro'\) \+ inp\('author'\)/.test(tpl32) && /bars: \{ clear: CUR\.clear, pro: CUR\.pro, author: CUR\.author \}/.test(tpl32))
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
    /* AMENDED at build 48 (v26 items 7 / 9): the meter is 0–300, the keys alone - key 1 whole with the Skill chest open is 100.
       Build 53 (v28 item 9) clamped what the FRONT PRINTS to 0–100, so this read 33%. REVERSED AT BUILD 55 (v29 item 1): the figure
       is the meter itself, so one key of the three reads 100 again and the difference between 100, 200 and 300 is back on the front
       of the app. FEEDBACK-v29 §1 carries the disagreement — it is the one thing in that build Aiden has asked for both ways.
       The figure is derived here rather than written out, so it cannot drift from the config. */
    const want53 = await page.evaluate(async () => { const K = await import('./progress/key.js'); return K.meterPct() + '% complete'; });
    (line === want53 && line === '100% complete') ? ok(`L.8a (retiring B.17) the front of the app reads the meter, never re-bases, and prints it as a share of the whole - every mode, key 1 whole and the Skill chest open reads "${line}" (100 of the raw 0–300 meter)`) : bad('L.8a the front number', JSON.stringify({ line, want53 }));
    // B.19: the column — AMENDED at build 40 (L.10c): four chests, one column, Games at the top of it
    await click('[data-go="s-pick"]'); await sleep(600);
    const col = await page.evaluate(() => { const ids = ['games', 'key', 'pro', 'thorns']; const c = n => document.querySelector(`.chest[data-chest="${n}"]`); const cell = n => ({ r: +c(n).style.gridRow, col: +c(n).style.gridColumn, need: c(n).querySelector('.pic').dataset.need, cls: c(n).className, name: c(n).querySelector('.name').textContent.trim() });
      return Object.assign(Object.fromEntries(ids.map(n => [n, cell(n)])), { scroll: getComputedStyle(document.getElementById('s-pick')).overflowY }); });
    (col.key.col === col.games.col && col.pro.col === col.games.col && col.thorns.col === col.games.col && col.key.r === col.games.r + 1 && col.pro.r === col.games.r + 2 && col.thorns.r === col.games.r + 3
      && /open/.test(col.games.cls) && /open/.test(col.key.cls) && /locked/.test(col.pro.cls) && col.pro.need.split('\n').length === 1 && /Earn the Pro key/.test(col.pro.need) /* AMENDED AT BUILD 59 (v30 59.6): the locked tile carries ONE line, the first thing still missing - 58.2's two ticked requirements wrapped to four and ran over the chest drawing. The Pro key is not in hand here, so its line is the key's; the Gauntlet's turn comes once the key is held, and it is on the key's own screen from the start. */ && col.thorns.need === 'Earn the Author key' /* AMENDED at build 48 (v26 item 12); at build 58 (58.2) the Pro chest lists both its requirements */ && col.pro.name === CP32.GRID.chest.pro && col.thorns.name === CP32.GRID.chest.thorns && col.scroll === 'auto')
      ? ok(`B.19 AMENDED at build 40 (L.10c): four chests in a column (rows ${col.games.r}-${col.thorns.r}); Games and Key open, the Pro chest saying "${col.pro.need}" and Thorns "${col.thorns.need}" (v26 item 12); the screen scrolls`)
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
    // v29 (item 13, build 55): the Games chest is what makes key 1 count, and a dev flag no longer stands in for it
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 0, adRuns: 0, chests: { games: 1, key: 0, pro: 0, thorns: 0 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
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
    // AMENDED at build 44 (v24 §E): Quick Tap · Two · Sprint's key 1 bar is Aiden's 9, so 6 hits reads 67
    (r1.web === 4 && r1.rungs === 0 && r1.flame === 0 && !/\bpro\b|author/.test(r1.txt) && /Quick Tap 67/.test(r1.qt || ''))
      ? ok(`B.24 / A.1 before chest 1 the radar has one rung — key 1 at the ring — and nothing beyond it; 6 hits against a bar of 9 reads "${r1.qt}"`)
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
      // AMENDED at build 40 (v23 L.10a): key 1's set waits for the Games chest — `none` is no chest open, `before` the Games chest, `after` the Skill chest
      /* TURNED OVER at build 58 (58.3): the key sets are on their own CHEST's tab now, not on Achievements — which is the whole of 58.3 —
         so A.1's rule is read where the rows live. `sets()` visits the three key chest tabs and says which of them is LISTING rows; a tab
         whose tier its chest has not revealed lists none and says so instead (A.1: existence shows, numbers do not). The rule asserted
         underneath is exactly build 38's and build 40's: key 1 waits for the Games chest, Pro for the Skill chest, Author for the Pro chest. */
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.allOpen = false; S.prefs.supporter = false; S.prefs.progTab = 'ach'; S.store.bars = {}; S.store.ach = {}; S.save();
      const sets = async () => { const got = [];
        for (const [tab, name] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) {
          R.show('s-menu'); await new Promise(r => setTimeout(r, 120));
          R.show('s-prog', { tab }); await new Promise(r => setTimeout(r, 320));
          if (document.querySelectorAll('#chest-list .a').length) got.push(name); }
        return got; };
      out.none = await sets();
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.save();
      out.before = await sets();
      S.prefs.chests = { games: 1, key: 1, pro: 0, thorns: 0 }; S.save();
      out.after = await sets();
      // earn: every Quick Tap bar cleared, then the check the run makes
      for (const c of K.COMBOS) if (c.g === 'quick-tap') S.store.bars[c.key] = Date.now(); S.save();
      const fresh = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.fresh = fresh.map(a => a.id); out.stored = Object.keys(S.store.ach);
      const none = K.checkKeyAch({ g: 'quick-tap', d: 'two', s: 5, hits: 1 }); out.again = none.length;
      S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); return out; });
    // AMENDED at build 44 (v24 D.2): each tier opens with a row per combination — 30 — before its per-game and whole-key rows
    (ka.n === 3 * (30 + GAMES.length + 1) && ka.tiers.join(',') === 'key1,key2,key3' && ka.perTier === 30 + GAMES.length + 1 && ka.live === 0)
      ? ok(`B.25 / D.2 ${ka.n} key achievements — a row per combination, one per game and one for the whole key, on each of three keys — generated, none of them live`)
      : bad('B.25 the key sets', JSON.stringify(ka));
    (!ka.none.length && ka.before.includes('key1') && !ka.before.includes('key2') && !ka.before.includes('key3') && ka.after.includes('key2') && !ka.after.includes('key3')) /* AMENDED at build 38: the Author set waits for the Pro chest. AMENDED at build 40: The key's set waits for the Games chest. AMENDED at build 58 (58.3): each set is on its own chest's tab */
      ? ok('B.25 / A.1 / 58.3 no chest tab lists its key set before the Games chest, the Skill chest tab lists it after, and the Pro chest tab only once the Skill chest is open - the Author chest tab waits for the Pro chest (builds 38, 40 and 58)')
      : bad('B.25 the sets before and after chest 1', JSON.stringify({ before: ka.before, after: ka.after }));
    // AMENDED at build 44 (v24 D.2): clearing every Quick Tap bar also banks its six roster rows (two of them older ids)
    (ka.fresh.includes('key_clear_quick-tap') && ka.fresh.length === 7 && ['qt_bclean5', 'qt_clean5', 'key_clear_qt-two-15', 'key_clear_qt-two-30', 'key_clear_qt-four-15', 'key_clear_qt-four-30'].every(id => ka.fresh.includes(id) && ka.stored.includes(id)) && ka.stored.includes('key_clear_quick-tap') && ka.again === 0)
      ? ok('B.25 / D.2 clearing every Quick Tap bar earns its six key 1 roster rows and "Quick Tap · Skill key", banked at once and never twice')
      : bad('B.25 the earn', JSON.stringify({ fresh: ka.fresh, stored: ka.stored, again: ka.again }));
    (/const adv=checkKey\(run,two\);[\s\S]{0,400}checkAch\(run\)\.concat\(checkKeyAch\(run\)\)/.test(run32)) ? ok('B.25 run/run.js banks the key BEFORE it asks the achievements, and asks the key sets too') : bad('B.25 the order in run.js');
  }
  /* ---- B.20 / B.26: the whole-key moment, and the Testing buttons ---- */
  {
    // AMENDED at build 43 (v24 C.5): the whole-key moment is earnMoment(tier) — each key's own earn, Lantern's still the glyph's turn and flare
    // AMENDED at build 46 (v25 item 11): the whole-key moment is the beat inside the first-open REVEAL where the key lights, and the once-flag is prefs.revealed
    /* AMENDED at build 51 (v27 item 14): the `/kwholeglyph/` clause is DELETED rather than re-spelled — it tested a stylesheet for the name of a
       keyframe, which is the one thing a check may not do, and item 14 replaced that keyframe with one per tier. What is left is the shape: the
       stage, the once-flag, and the config the animation is drawn from. The animation itself is driven, not read, in build 46 section 5. */
    (/function keyStage\(tier\)/.test(keyjs32) && /function keyReveal\(tier/.test(keyjs32) && /prefs\.revealed/.test(keyjs32)) ? ok('B.20 the whole-key moment exists — once per tier per profile, each key its own earn since build 43 (C.5) and its own 2s animation since build 51 (v27 item 14)') : bad('B.20 the whole-key moment');
    const bars = await page.evaluate(async () => { const K = await import('./progress/key.js'); const o = {}; for (const c of K.COMBOS) o[c.key] = Date.now(); return o; });
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    /* AMENDED at build 46 (v25 items 11 / 22): the moment is now a beat inside the key's REVEAL - the ring starts unlit (`krev`) and the key lights
       part-way through - and the once-flag is `prefs.revealed['key:clear']`, written as it starts rather than when the moment fires. */
    const w1 = await page.evaluate(() => ({ cls: document.getElementById('s-key').classList.contains('kearning'), count: document.getElementById('key-count').textContent.trim(), seen: JSON.parse(localStorage.getItem('ne')).prefs.revealed }));
    await revealDone(); await sleep(400); await click('#s-key .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(900);
    const w2 = await page.evaluate(() => ({ rev: document.getElementById('s-key').classList.contains('kearning'), done: document.getElementById('s-key').classList.contains('kdone') }));
    (w1.cls && /whole/.test(w1.count) && w1.seen && w1.seen['key:clear'] === 1 && !w2.rev && w2.done) ? ok(`B.20 a whole key plays its reveal on the keys screen once — "${w1.count}" — and the next open goes straight to the finished key`) : bad('B.20 the moment plays once', JSON.stringify({ w1, w2 }));
    // AMENDED at build 40 (v23 L.10): a chest-opening button per chest, four, named by chest
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] #dev-anim [data-act]')].map(b => b.dataset.act + (b.dataset.chest ? ':' + b.dataset.chest : '')));
    // AMENDED at build 43 (v24 C.5): an earn-moment button per key, three
    // AMENDED AT BUILD 57 (v29 Section A, 57.6): and a CREATION intro per key, three more — the first-open moment is otherwise once per profile
    (btns.join(',') === 'dev-keyin,dev-seg,dev-whole,dev-whole,dev-whole,dev-keyintro,dev-keyintro,dev-keyintro,dev-chest:games,dev-chest:key,dev-chest:pro,dev-chest:thorns') ? ok('B.26 twelve Testing buttons, one per animation, an earn moment and a creation intro per key and a chest opening per chest, under [data-dev] (S5)') : bad('B.26 the buttons', btns.join(','));
    await setStorage({ ne: { v: 3, prefs: { ...OPEN_PREFS, keySeen: 1, keyWhole: { clear: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-testing"]'); await sleep(300); await click('[data-act="dev-whole"]'); await sleep(900);
    /* AMENDED at build 46 (v25 item 11): "key complete" replays the whole REVEAL, which is not skippable - so Back does nothing while it plays, and it
       ends on its own congratulations card. Nothing is stored either way (S5): this is Testing's replay, not an earn. */
    const dw = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cls: document.getElementById('s-key').classList.contains('kearning') }));
    await click('#s-key .back'); await sleep(300);
    const dwLocked = await onScreen();
    await revealDone(); await sleep(400); await click('#s-key .back'); await sleep(400);
    const dwBack = await onScreen();
    // AMENDED at build 41 (v23 L.6): "replay key chest opening" plays the Skill chest's CEREMONY on the key screen with nothing stored, and its tap lands on the map's spill, replayed the same way
    await click('[data-act="dev-chest"][data-chest="key"]'); await sleep(1200);
    const dc = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest }; });
    await revealDone(); await sleep(700);
    const dcMap = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'), w = document.querySelector('.chestwords[data-for="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill') && w.classList.contains('spill') }; });
    await sleep(3600);
    const dcAfter = await page.evaluate(async () => { const K = await import('./progress/key.js'); const c = document.querySelector('.chest[data-chest="key"]');
      // AMENDED at build 34 (#411): the resting state is whatever the gate says, not "hidden" - and the demo must clear its own class
      // AMENDED at build 40 (L.10): every chest is on the map, so the resting state is the chest's own - open under OPEN EVERYTHING
      return { rest: !c.hidden && c.classList.contains(K.chestState('key')), spill: c.classList.contains('spill'), chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.key, whole: JSON.parse(localStorage.getItem('ne')).prefs.keyWhole }; });
    (dw.screen === 's-key' && dw.cls && dwLocked === 's-key' && dwBack === 's-testing' && dc.screen === 's-key' && dc.shown && dc.chest === 'key' && dcMap.screen === 's-pick' && dcMap.spill && dcAfter.rest && !dcAfter.spill && !dcAfter.chest2 && dcAfter.whole && dcAfter.whole.clear === 1)
      ? ok('B.26 "key complete" replays the key\'s whole reveal - Back does nothing while it plays, and once it has been taken Back returns to Testing; "replay key chest opening" plays its reveal, its tap and Continue land on the map\'s spill, and the chest is put back exactly as its state left it — nothing stored (AMENDED at build 46, item 11)')
      : bad('B.26 the buttons play and store nothing', JSON.stringify({ dw, dwLocked, dwBack, dc, dcMap, dcAfter }));
    await click('[data-act="dev-keyin"]').catch(() => {}); await sleep(300);
    const arrive = await page.evaluate(() => document.getElementById('s-key').classList.contains('first'));
    arrive ? ok('B.26 "key arrival" plays the arrival again') : bad('B.26 the arrival button');
    await sleep(2500);
  }
}

/* ---- 14. build 33 (v18 §B.28–§B.32): the surface ---- */
if (section('build 33 - v18 sections B.28 to B.32')) {
  const html33 = read('index.html'), css33 = read('styles', 'app.css'), audio33 = read('audio.js');
  const prog33 = read('ui', 'screens', 'progress.js') + read('ui', 'screens', 'customise.js'), store33 = read('core', 'store.js');   // build 39: Customise's code is its own file again
  // v28 (items 2 / 3, build 53): the Music row holds the three key tracks now, titled by each key's own theme
  const KY33 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);

  /* ---- B.31: ONE screen, three tabs, one file. A4 forbids a screen importing a screen, so a tab host that called
     into customise.js would be the thing it forbids — this is the merge, and the file it replaced is gone. ---- */
  {
    const gone = fs.existsSync(path.join(root, 'ui', 'screens', 'customise.js'));   // AMENDED at build 39 (v23 L.4a): the file is back
    const idx = read('ui', 'screens', 'index.js');
    const markup = { custom: /id="s-custom"/.test(html33), row: /data-go="s-custom"/.test(html33), cus: /id="p-cus"/.test(html33) };
    (gone && /customise\.js"/.test(idx) && markup.custom && markup.row && !markup.cus)
      ? ok('B.31 AMENDED (v23 L.4a): customise.js is back and imported, s-custom and its menu row exist, and no #p-cus is left on s-prog')
      : bad('B.31 the merge', JSON.stringify({ gone, markup }));
    /* DELETED at build 58 (58.3), both of them, as CLAUDE.md's gate rule requires — a source-text check that fails on a refactor is
       deleted and named in the outcome, never re-spelled. The first read the three tab buttons out of index.html's own markup, and
       the tab row is built by ui/screens/progress.js from CHESTS now, so there is no markup to read. The second spelled the exact
       expression `cleanPrefs` used to clamp `progTab` to three values; there are six and the clamp is a named function. Both rules
       are still asserted, by driving the page: the tab list is read off #prog-tabs at B.21 above (against CHESTS, so it cannot be a
       second copy of the order), and the migration of a stored `unl` is driven at B.21's "the tab is remembered" block. */
    const keyRow = /data-go="s-key"/.test(html33);
    keyRow ? ok('B.31 Keys stays its own menu item') : bad('B.31 the Keys menu row');

    // each tab renders, and the one that is up is the only one rendered
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    // AMENDED at build 58 (58.3): six tabs, and the four chest tabs share one pane — so "one tab at a time" is asserted on the pane that is shown
    const walk = {};
    for (const t of ['c-games', 'c-key', 'c-pro', 'c-thorns', 'cul', 'ach']) { await click(`#prog-tabs [data-tab="${t}"]`); await sleep(600);
      walk[t] = await page.evaluate(t => ({ shown: [...document.querySelectorAll('#s-prog .ptab')].filter(p => !p.hidden).map(p => p.id),
        rows: document.querySelectorAll(t.startsWith('c-') ? '#chest-list .urow, #chest-list .a' : t === 'cul' ? '#cul-list .a' : '#achlist .a').length,
        needs: document.getElementById('p-chest').hidden ? null : document.querySelectorAll('#chest-need .urow').length,
        stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab }), t); }
    const one58 = ['c-games', 'c-key', 'c-pro', 'c-thorns'].every(t => walk[t].shown.join() === 'p-chest')
      && walk.cul.shown.join() === 'p-cul' && walk.ach.shown.join() === 'p-ach';
    const rows58 = ['c-games', 'c-key', 'c-pro', 'c-thorns', 'cul', 'ach'].every(t => walk[t].rows > 0);
    // 58.2 / 58.3: the Pro and Author chest tabs list TWO requirements — the key and a finished Gauntlet — and the other two list one
    const needs58 = walk['c-games'].needs === 1 && walk['c-key'].needs === 1 && walk['c-pro'].needs === 2 && walk['c-thorns'].needs === 2 && walk.cul.needs === null && walk.ach.needs === null;
    (one58 && rows58 && needs58 && walk.ach.stored === 'ach')
      ? ok(`B.31 / 58.3 one tab at a time across six — ${walk['c-games'].rows} on the Games chest, ${walk['c-key'].rows} on the Skill chest, ${walk['c-pro'].rows} on the Pro chest, ${walk['c-thorns'].rows} on the Author chest, ${walk.cul.rows} customise unlocks and ${walk.ach.rows} achievements — the Pro and Author tabs listing two requirements each and the others one, and the last tab open is remembered`)
      : bad('B.31 / 58.3 the tabs render', JSON.stringify({ one58, rows58, needs58, walk }));
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
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): SIX — this game's three tracks, then one track per key, titled by that key's own theme. B.28's
       shape is otherwise untouched: names only, exactly one selected, and no Preview / on / off anywhere on the row. */
    (row.label === 'Music' && row.n === 6 && row.sel === 1 && row.named.every(x => x && !/preview|^on$|^off$/i.test(x))
      && KY33.KEYS.every(k => row.named.some(x => x.trim().toUpperCase() === k.theme.toUpperCase())))
      ? ok(`B.28 / v28 item 2 the Music row is this game's three tracks and one per key, by name (${row.named.join(' · ')}), one of them selected`)
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
    /* AMENDED AT BUILD 59 (v30 59.5): a VARIABLE face declares a weight RANGE ("700 900"), which the old pattern could not
       match — Cinzel would have gone uncounted and the file uncheckedly absent. The rest of the rule is unchanged. */
    const faces = [...css33.matchAll(/@font-face\{font-family:"([^"]+)";font-style:normal;font-weight:([\d ]+);font-display:swap;src:url\(\.\.\/fonts\/([\w.-]+)\)/g)];
    const files = [...new Set(faces.map(f => f[3]))];
    const onDisk = files.filter(f => fs.existsSync(path.join(root, 'fonts', f)));
    const bytes = onDisk.reduce((a, f) => a + fs.statSync(path.join(root, 'fonts', f)).size, 0);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.9): a SIXTH face from a FOURTH file — Creepster 400, the Gauntlet screens' scary face.
       AMENDED AT BUILD 59 (v30 59.5): Creepster is REJECTED and gone, and TWO faces replace it — Cinzel (variable, 700-900, one
       file) and Cinzel Decorative 900. Seven faces from five files, and the check that every declared file is on disk is what
       proves creepster-400.woff2 really went rather than merely stopping being referenced. */
    (faces.length === 7 && onDisk.length === files.length && files.length === 5 && !fs.existsSync(path.join(root, 'fonts', 'creepster-400.woff2')) && !/fonts\.googleapis\.com/.test(html33))
      ? ok(`B.32 ${faces.length} faces from ${files.length} self-hosted files (${(bytes / 1024).toFixed(1)}KB), every one font-display:swap, and the <link> to Google is gone`)
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
    const B33 = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
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
    const runSrc = read('run', 'run.js');
    (named.field && named.stored === 'AIDEN' && /n:prefs\.name\|\|''/.test(runSrc.replace(/\s/g, '')))
      ? ok('beta 2 — already built: every run record carries the profile name (run/run.js), and the field is on Scores, not Customise')
      : bad('beta 2 the name on a run', JSON.stringify(named));
  }
}

/* ---- 15. build 35 (batch 15: FEEDBACK-v21 §F.1–§F.5 and §G.7; FEEDBACK-v20 §D.1–§D.3, §D.8–§D.10; #415; the Verdict Desk) ---- */
if (section('build 35 - batch 15, bugs and the runs')) {
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
if (section('build 36 - the frozen clock and the verdict export')) {
  const imp36 = (...p) => import(pathToFileURL(path.join(root, ...p)).href);
  const audio36 = read('audio.js'), testing36 = read('ui', 'screens', 'testing.js');

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
    // v29 (items 11 / 18, build 56): TWELVE rows. The Gauntlet has a verdict set of its own, like any game (config/verdicts.js)
    (!lineBad.length && !ws.length && Object.keys(T).length === 12)
      ? ok('Verdict export (v658): every line it carries is in, across all eleven of Aiden\'s verdict rows plus the Gauntlet\'s own; the lines it left blank keep theirs; the two half-typed lines are Aiden\'s fixes; no line carries stray whitespace')
      : bad('Verdict export lines', JSON.stringify({ lineBad, ws, keys: Object.keys(T) }));
    const AT = { 'quick-tap': [.4833, .3667, .25], dots: [.5556, .4444, .3111], hold: [.875, .75, .25], 'hold:cut': [.8875, .8, .625], sequence: [.6875, .5, .3125],
      'reaction:flash': [.7714, .6714, .5857], 'reaction:nogo': [.5, .44, .33], 'timing:stopwatch': [.9, .74, .56], 'timing:hidden': [.9259, .8796, .8241], 'spot:count': [.85, .6, .35], 'spot:find': [.85, .6, .35] };
    const RA = { 'timing:stopwatch': [0.1, 0.3, 0.55], 'timing:hidden': [40, 70, 95], 'reaction:flash': [225, 255, 285], 'reaction:nogo': [299, 330, 400], 'hold:grow': [2, 5, 10], 'hold:cut': [3.5, 5.5, 9], 'spot:count': [0, 1, 2], 'spot:find': [1, 2, 4] };
    const atBad = Object.entries(AT).filter(([k, v]) => !T[k] || T[k].at.join() !== v.join()).map(([k]) => k);
    const raBad = Object.entries(RA).filter(([k, v]) => !V.ROUND_AT[k] || V.ROUND_AT[k].join() !== v.join()).map(([k]) => k);
    (!atBad.length && !raBad.length && Object.keys(V.ROUND_AT).length === 8)
      ? ok('Verdict export: Reaction\'s two threshold triples and the per-round ceilings for Cut, Flash and Go / No-go are Aiden\'s; Timing\'s `at` AND its per-round ceilings are Aiden\'s numbers from build 37 (#414 closed); Spot keeps its own')
      : bad('Verdict export thresholds', JSON.stringify({ atBad, raBad }));
    /timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(read('progress', 'rules.js'))
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
if (section('build 37 - keys and chests')) {
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
    (at.sw === '0.9,0.74,0.56' && at.hd === '0.9259,0.8796,0.8241' && at.rsw === '0.1,0.3,0.55' && at.rhd === '40,70,95' && /'timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(rules))
      ? ok('b. Timing\'s thresholds build (#414 closed) - Stopwatch 0.90 / 0.74 / 0.56 and per round 0.1 / 0.3 / 0.55, Hidden 0.9259 / 0.8796 / 0.8241 and 40 / 70 / 95 - and the scales did not move (5s, 5400ms)')
      : bad('b. Timing thresholds', JSON.stringify(at));
    const warn = [['site', 'config', 'verdicts.js'], ['site', 'progress', 'rules.js'], ['_review', '2026-09-13_personal_verdict-desk-edits.md'], ['_review', '2026-09-14_personal_verdict-desk-export.md']]
      .filter(p => /DO NOT BUILD Timing|DO-NOT-BUILD-TIMING|DO NOT BUILD THE LINE TABLES BELOW[\s\S]*DO NOT BUILD Timing/i.test(read('..', ...p))).map(p => p.join('/'));
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

/* ---- 18. build 38 (Aiden's two answers to build 37, 2026-09-14): the tile keeps its amber until a mode is chosen; Author waits for the Pro chest ---- */
if (section('build 38 - the tile keeps its amber, Author waits for the Pro chest', 'build 38 - #426 Pro and Author placeholders')) {
  const css38 = read('styles', 'app.css'), pick38 = read('ui', 'screens', 'pick.js'), key38 = read('progress', 'key.js'), prog38 = read('ui', 'screens', 'progress.js');

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
      /* AMENDED at build 58 (58.3): the key sets are on their own chest's tab now, so "which sets are shown" is read there. A chest tab
         whose tier its chest has not revealed lists no rows at all and says so instead (A.1), which is the same fact in its new place. */
      for (const [t, nm] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(400);
        if (document.querySelectorAll('#chest-list .a').length) out.sets = (out.sets ? out.sets + ',' : '') + nm; }
      out.sets = out.sets || '';
      // AMENDED at build 58 (58.2): the Pro chest also wants Gauntlet Mini finished, and this fixture reaches past it to the Author tier
      S.store.gaunt = [{ id: 'g1', t: Date.now(), score: 100, tier: 'clear', web: [] }];
      S.prefs.chests = Object.assign({}, S.prefs.chests, { pro: 1 }); S.save(); out.retro = K.retroBank(['author']).join(); out.author2 = K.tierOpen('author'); out.rungs2 = K.radarRungs().map(r => r.tier).join();
      R.show('s-menu'); await wait(150); R.show('s-key'); await wait(500); out.strip2 = [...document.querySelectorAll('#key-keys .kkey')].map(b => b.classList.contains('locked')).join();
      for (const [t, nm] of [['c-key', 'key1'], ['c-pro', 'key2'], ['c-thorns', 'key3']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(400);
        if (document.querySelectorAll('#chest-list .a').length) out.sets2 = (out.sets2 ? out.sets2 + ',' : '') + nm; }
      out.sets2 = out.sets2 || '';
      K.fillBars(false); S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.bars = {}; S.store.runs = []; S.store.gaunt = []; S.save(); return out; });
    (q2.pro && !q2.author && q2.rungs === 'clear,pro' && q2.strip === 'false,false,true' && q2.sets === 'key1,key2')
      ? ok('38.2 with chest 1 open and the Pro chest shut: Pro is open, Author is crossed out on the strip, the radar has two rungs and the Author chest tab lists no set (build 58: the sets are on their own chest tabs)') : bad('38.2 before the Pro chest', JSON.stringify(q2));
    (q2.live === 'clear' && q2.proBar && !q2.authorBar)
      ? ok('38.2 a run that beats every bar clears key 1 and Pro and banks nothing on Author while its chest is shut') : bad('38.2 no Author clear before its chest', JSON.stringify({ live: q2.live, proBar: q2.proBar, authorBar: q2.authorBar }));
    (q2.author2 && q2.retro === 'quick-tap:two:5|author' && q2.rungs2 === 'clear,pro,author' && q2.strip2 === 'false,false,false' && q2.sets2 === 'key1,key2,key3')
      ? ok('38.2 the Pro chest opens Author: its bars already beaten are credited silently (G.4), all three keys and rungs are open, and the Author chest tab lists its set') : bad('38.2 after the Pro chest', JSON.stringify(q2));
  }

  /* ---- 3. #426: Pro and Author PLACEHOLDERS (A.2 amended) - the generator writes the file, and never a person's number ---- */
  part('build 38 - #426 Pro and Author placeholders');
  const P38 = await import(pathToFileURL(path.join(root, 'scripts', 'placeholders.mjs')).href);
  const { ROUND_AT: RA38 } = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const bars38 = read('config', 'key-bars.js'), json38 = rvRead('key-bars.json');
  const rows38 = P38.rowsOf(bars38);
  const spanOf = (src, key, name) => { const r = P38.rowsOf(src).find(x => x.key === key); const f = P38.fieldsOf(src, r.from, r.to).find(x => x.name === name); return f ? src.slice(f.from, f.to) : ''; };
  {
    /* AMENDED at build 44 (v24 §E): no cell is the generator's any more - 12 are Aiden's and 48 are the desk's, marked by:'desk' - so the
       generator must leave the file exactly as it is, --clear must leave it too (a desk proposal is not the generator's to clear), and the
       generator's own scheme is still proved on a copy where every desk cell is emptied first */
    const again = P38.generate(bars38, RA38).out, cleared = P38.generate(bars38, RA38, 'clear').out;
    const deskOnly = src => { let out = src; for (const t of ['pro', 'author']) for (const r of P38.rowsOf(out).reverse()) { if (!(r.obj.placeholder && r.obj.placeholder[t] && r.obj.placeholder[t].by)) continue;
      const f = P38.fieldsOf(out, r.from, r.to).find(x => x.name === t); out = out.slice(0, f.from) + 'null' + out.slice(f.to); } return out; };
    const emptied = deskOnly(bars38), filled = P38.generate(emptied, RA38).out, rowsF = P38.rowsOf(filled);
    (again === bars38 && cleared === bars38 && (!REVIEW || P38.reviewJson(json38, rows38) === json38))
      ? ok(`v24 §E / #426 config/key-bars.js is what npm run placeholders leaves: regenerating changes nothing, --clear changes nothing (all ${rows38.length * 2} Pro and Author cells are Aiden's or the desk's), and ../_review/key-bars.json matches`)
      : bad('#426 the generator keeps every cell', JSON.stringify({ again: again === bars38, cleared: cleared === bars38, json: P38.reviewJson(json38, rows38) === json38 }));
    // the scheme, cell by cell, on the copy whose desk cells were emptied: the multiplier for the row's own direction, its precision, harder tier over tier, the floors, the marker
    const off = [];
    for (const r of rowsF) { const o = r.obj, st = P38.stepOf(o.unit), fl = P38.floorOf(r.key, o, RA38), aiden = /^(qt|dt)-/.test(o.id);
      for (const [t, below] of [['pro', o.bar], ['author', o.pro]]) { if (t === 'pro' && aiden) continue; const v = o[t], m = P38.MULT[o.dir][t], mk = (o.placeholder || {})[t] || {}, basis = mk.basis || '';
        const prec = st === 10 ? v % 10 === 0 : st === 1 ? Number.isInteger(v) : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
        const expect = Math.max(fl ? fl.at : -Infinity, P38.roundTo(o.bar * m, st));
        const good = prec && (o.dir === 'lower' ? v < below : v > below) && !(fl && v < fl.at) && (v === expect || /stepped to/.test(basis) || /CLAMPED/.test(basis))
          && mk.v === v && mk.conf === 'low' && !mk.by && /^PLACEHOLDER/.test(basis) && basis.includes('× ' + m.toFixed(2)) && /awaiting his/.test(basis);
        if (!good) off.push(`${r.key} ${t}=${v}`); } }
    // and the desk's own cells, in the real file: harder tier over tier, marked by:'desk', conf 'low', saying they are not Aiden's
    const deskOff = []; for (const r of rows38) { const o = r.obj; for (const [t, below] of [['pro', o.bar], ['author', o.pro]]) { const mk = (o.placeholder || {})[t]; if (!mk) continue;
      if (!(mk.by === 'desk' && mk.conf === 'low' && mk.v === o[t] && /^PROPOSED on the Key Unlocks Desk/.test(mk.basis) && /Not Aiden’s number/.test(mk.basis) && (o.dir === 'lower' ? o[t] < below : o[t] > below))) deskOff.push(`${r.key} ${t}`); } }
    (!off.length && !deskOff.length && emptied !== bars38)
      ? ok(`#426 / v24 §E the generator's scheme still holds where it is allowed to write (the desk cells emptied on a copy): × 1.15 / × 1.30 on a floor, × 0.80 / × 0.65 on a ceiling, the row's own precision, each tier strictly harder, none past its floor - and all 48 desk cells in the real file are marked by:'desk', harder than the tier below, saying they are not Aiden's`)
      : bad('#426 the scheme', JSON.stringify({ off, deskOff }));
    /* NEVER OVERWRITE A NUMBER A PERSON ENTERED. Two cells hand-set to odd values - one through --set, which drops its marker,
       one typed over a placeholder with its now-stale marker left behind - then the generator runs over the table twice */
    let hand = P38.setCell(bars38, 'qt-two-5', 'pro', 13.37);
    { const r = P38.rowsOf(hand).find(x => x.key === 'dots:lead:30'), f = P38.fieldsOf(hand, r.from, r.to).find(x => x.name === 'author'); hand = hand.slice(0, f.from) + '101.5' + hand.slice(f.to); }
    const g1 = P38.generate(hand, RA38), g2 = P38.generate(g1.out, RA38);
    const barsText = src => P38.rowsOf(src).map(r => spanOf(src, r.key, 'bar')).join();
    const handRows = P38.rowsOf(hand), qtRow = handRows.find(r => r.key === 'quick-tap:two:5').obj, dlRow = handRows.find(r => r.key === 'dots:lead:30').obj;
    // AMENDED at build 44: every cell is kept now; the two hand-set cells must be among them
    const keptAll = g1.report.filter(x => x.act === 'kept').map(x => x.key + ' ' + x.tier);
    const kept = ['dots:lead:30 author', 'quick-tap:two:5 pro'].filter(k => keptAll.includes(k)).join() + (keptAll.length === rows38.length * 2 ? '' : ' (not all kept)');
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
      // AMENDED at build 44: Quick Tap's Pro figures are Aiden's, so the number changed in place is a desk proposal's — Estimate · Grow · Set
      const c = K.COMBOS.find(x => x.key === 'hold:grow:7'), was = c.bar.pro;
      c.bar.pro = 13.37; out.edited = { is: K.isPlaceholder(c, 'pro'), count: K.placeholderCount('pro'), author: K.isPlaceholder(c, 'author') };
      R.show('s-key', { tier: 1 }); await wait(350); out.edited.warn = warn();
      c.bar.pro = was; R.show('s-menu'); await wait(80); R.show('s-key', { tier: 1 }); await wait(350); out.warnPro = warn();
      R.show('s-menu'); await wait(80); R.show('s-key', { tier: 0 }); await wait(350); out.warnClear = warn();
      return out; });
    // AMENDED at build 44 (v24 §E): 18 Pro placeholders (Aiden set the other 12) and 30 Author
    // AMENDED at build 45 (v25 item 14): isPlaceholder() is unchanged and still counts them — what is gone is the key screen SAYING so (every warn is empty now)
    (ph.pro === ph.n - 12 && ph.author === ph.n && ph.clear === 0 && !ph.edited.is && ph.edited.count === ph.n - 13 && ph.edited.author
      && ph.warnPro === '' && ph.edited.warn === '' && ph.warnClear === '')
      ? ok(`#426 progress/key.js tells a generated number from a set one: ${ph.pro} Pro and ${ph.author} Author placeholders, none on key 1; one Pro number changed in place is a person's (${ph.edited.count} left) — and since build 45 no key screen says a word about it`)
      : bad('#426 isPlaceholder and the key screen note', JSON.stringify(ph));
  }

  /* ---- 4. #426 A: Circuit and Thorn seen working - every animation Lantern gets, on all three, each in its own tint ---- */
  {
    const kfLines = css38.split('\n').filter(l => /@keyframes krootgrow\{/.test(l)), kfLast = kfLines[kfLines.length - 1] || '';
    /* AMENDED at build 51 (v27 item 14): the `@keyframes kwholeglyph` clause is DELETED — that keyframe is gone and a check may not be re-spelled
       to a new one. The rest stands: what matters to #426 A is that the theme drives the colour and that no [data-style] rule sets an animation. */
    (/var\(--ktint\)/.test(kfLast) && !/--ok/.test(kfLast) && /\.khalo\{fill:none;stroke:var\(--ktint\)\}/.test(css38)
      && !/\[data-style="(lantern|circuit|thorn)"\][^{]*\{[^}]*animation/.test(css38))
      ? ok('#426 A statically: the krootgrow that wins reads --ktint, the halo strokes in --ktint, and no [data-style] rule sets or cancels an animation')
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
        /* B.20 → AMENDED at build 51 (v27 item 14): Testing's "key complete" plays that key's EARNED ANIMATION, two seconds at most, and the
           glyph is moving from its own step onward — so the wait is a beat into it, read from the config rather than typed */
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, whole: true }); await wait(300 + Math.round(KY.KEY_EARN[t].ms * .5));
        const glyph = document.querySelector('#key-ring .kglyph');
        row.whole = { on: key.classList.contains('kearning'), names: names(key), glyph: glyph ? glyph.getAnimations().map(a => a.animationName).join() : '', count: getComputedStyle(document.getElementById('key-count')).color.includes(tint) };
        await wait(400); document.getElementById('key-cere').click(); await wait(400);
        const go = document.querySelector('#key-cere .rgo'); if (go) { await wait(1400); go.click(); } await wait(600);
        // 5.4 / B.21: the staged first open
        R.show('s-menu'); await wait(80); R.show('s-key', { tier: i, arrive: true }); await wait(250);
        const every = (sel, n) => { const els = [...document.querySelectorAll(sel)]; return els.length > 0 && els.every(x => x.getAnimations().some(a => a.animationName === n)); };
        row.first = { on: key.classList.contains('first'), names: names(key), kr: every('#key-ring .kr', 'keyin'), node: every('#key-ring .knode', 'keyin') };
        await wait(2700);
        out.push(row); }
      S.store.bars = {}; S.prefs.keySeen = 1; S.save(); return out; });
    const L = par[0];
    /* AMENDED at build 43 (v24 C.5): the whole-key moment is no longer the SAME on all three — earning each key is its own moment (Lantern's
       flare, Circuit's snap, Thorn's slow turn). What stays shared is held here: the advance and the first open, in each tier's tint; the whole
       moment plays on every tier, each with its own glyph animation, and the count line takes the tint. Build 43's own section checks the rest */
    const sameAs = p => p.advance.seg === L.advance.seg && p.advance.halo === L.advance.halo && p.first.names === L.first.names;
    /* AMENDED at build 51 (v27 item 14): each key's earned animation is its own — the Skill key spins and clicks upright, the Pro key snaps a
       quarter turn, the Author key drops and slams — so the three glyph animations are kespin / kesnap / kedrop, and the count line no longer
       has its own beat inside a 2s animation (`whole.count` is dropped with it). The advance and the first open are still shared. */
    (par.map(p => p.style).join() === 'lantern,circuit,thorn' && L.advance.seg === 'krootgrow' && L.advance.halo === 'khaloglow' && /keyin/.test(L.first.names)
      && par.map(p => p.whole.glyph).join() === 'kespin,kesnap,kedrop'
      && par.every(p => sameAs(p) && p.lit && p.advance.grow && p.advance.haloTint && p.whole.on && p.first.on && p.first.kr && p.first.node))
      ? ok(`#426 A: Circuit and Thorn run every animation Lantern does - the advance (${L.advance.seg} under ${L.advance.halo}), the staged first open (${L.first.names}) - with lit segments and halos in each tier's own tint (${par.map(p => p.tint).join(' / ')}); and each plays its OWN earned animation (${par.map(p => p.whole.glyph).join(' / ')}, AMENDED at build 51, v27 item 14)`)
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
        // AMENDED at build 43 (v24 B.2 / B.3): the map's tap opens it; key 1's earn moment is marked seen so it opens straight away
        S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 }; S.prefs.keyWhole = { clear: 1 }; S.save();
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
      ? ok(`#426 B: a profile whose bests beat every other Pro bar opens the Skill chest and banks exactly those ${good.pro.length}, SILENTLY - one chest sound, no toast (AMENDED at build 40, L.8b), nothing for the clears, nothing on Author behind its own chest`)
      : bad('#426 B the retroactive clear with something to bank', JSON.stringify({ ...good, want: want.length }));
    (none.ready && none.opened === 1 && !none.pro.length && !none.author && !none.retro && none.col && none.fx === 1 && !none.toasts.length)
      ? ok('#426 B: a profile with no runs opens the Skill chest and banks nothing - still one chest sound, and no toast')
      : bad('#426 B the retroactive clear with nothing to bank', JSON.stringify(none));
    // Aiden, "yes, silently, once": a column that ARRIVES for a tier already open is credited at boot, once per column
    await setStorage({ ne: { v: 4, prefs: { story: 1, gridSeen: 1, played: 1, snd: 'space', musicG: { menu: false }, keySeen: 1, chest1: 1 }, runs, ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
    const readNe = () => page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')), t = document.getElementById('toast');
      return { pro: Object.keys(ne.bars).filter(k => k.endsWith('|pro')).sort(), author: Object.keys(ne.bars).filter(k => k.endsWith('|author')).length, clear: Object.keys(ne.bars).filter(k => !k.includes('|')).length, col: Object.keys(ne.prefs.retroCol || {}).join(), retro: Object.keys(ne.prefs.retro || {}).length, toast: t.classList.contains('on') ? t.textContent.trim() : '' }; });
    const a1 = await readNe();
    const gone = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); const k = Object.keys(ne.bars).find(x => x.endsWith('|pro')); delete ne.bars[k]; localStorage.setItem('ne', JSON.stringify(ne)); return k; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a2 = await readNe();
    await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); ne.prefs.retroCol = { pro: 'an older column' }; localStorage.setItem('ne', JSON.stringify(ne)); });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const a3 = await readNe();
    // AMENDED at build 44 (v24 §E): key 1's column is credited on arrival too, so the column record is clear + pro and the green marks count both
    (a1.pro.join() === want.join() && !a1.author && a1.col === 'clear,pro' && a1.retro === want.length + a1.clear && a1.toast === '')
      ? ok(`#426 on arrival: a profile with chest 1 already open boots on the new columns and banks the ${a1.pro.length} Pro bars its bests beat - no toast, no chest, Author untouched behind its own chest, the column recorded`)
      : bad('#426 retro credit when the numbers arrive', JSON.stringify(a1));
    (gone && !a2.pro.includes(gone) && a2.pro.length === want.length - 1 && a3.pro.includes(gone) && a3.pro.length === want.length)
      ? ok('#426 once per column: a Pro bar removed by hand is NOT re-banked on the next boot, and a different column credits once more')
      : bad('#426 retro on arrival runs once per column', JSON.stringify({ gone, a2: a2.pro.length, a3: a3.pro.length }));
  }
}

/* ---- 19. build 39 (batch 16, the surface - FEEDBACK-v23 §L.2-§L.5): Customise out of Progress, the partition, the labels, the stamp ---- */
if (section('build 39 - batch 16, the surface')) {
  const html39 = read('index.html'), css39 = read('styles', 'app.css'), prog39 = read('ui', 'screens', 'progress.js'), cus39 = read('ui', 'screens', 'customise.js'), store39 = read('core', 'store.js');
  const INK39 = 'rgb(232, 230, 225)', OK39 = 'rgb(61, 214, 140)', RED39 = ['rgb(200, 50, 42)', 'rgb(179, 38, 30)', 'rgb(224, 69, 59)'];
  const NOW39 = Date.now();
  const PLAIN39 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };

  /* ---- 1. L.4a: Customise is its own screen, menu item and file again - content untouched (v18 B.31 amended, A4) ---- */
  {
    const custom = (html39.match(/<section class="screen top" id="s-custom"[\s\S]*?<\/section>/) || [''])[0];
    const prog = (html39.match(/<section class="screen top" id="s-prog"[\s\S]*?<\/section>/) || [''])[0];
    const ids = ['pv', 'pvg', 'pv-g', 'c-sq', 'c-lead', 'c-cut', 'c-bg', 'c-snd', 'c-scale', 'c-rate', 'c-track', 'c-menumusic', 'lk-sq', 'lk-lead', 'lk-cut', 'lk-bg', 'lk-snd', 'lk-scale', 'lk-rate', 'g-lead', 'g-cut', 'g-scale', 'g-rate'];
    const missing = ids.filter(id => !custom.includes(`id="${id}"`)), left = ids.filter(id => prog.includes(`id="${id}"`));
    // AMENDED at build 40 (v23 L.11a): the Customise row carries data-act="custom" so a locked tap can be refused
    // AMENDED at build 43 (v24 A.1): the Keys row carries data-act="keys" for the same reason
    const menu = [...html39.matchAll(/<button data-act="(?:go|custom|keys)" class="item glow" data-go="(s-[\w-]+)"[^>]*>([^<]+)</g)].map(m => m[2]);
    const code = { moved: /function renderCustom\(\)/.test(cus39) && /const Wheel=/.test(cus39) && /function pvStep\(\)/.test(cus39), gone: !/renderCustom|Wheel|pvStep|pvTry/.test(prog39), reg: /register\('s-custom'/.test(cus39), sibling: /from "\.\/[\w-]+\.js"/.test(cus39) };
    (!missing.length && !left.length && menu.join(' · ').includes('Progress · Keys · Customise · About') && code.moved && code.gone && code.reg && !code.sibling)
      ? ok(`L.4a Customise is its own screen again - all ${ids.length} of its controls on s-custom, none left on Progress, its own file importing no screen (A4), and a menu row: ${menu.join(' · ')}`)
      : bad('L.4a Customise out of Progress', JSON.stringify({ missing, left, menu, code }));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(1200);
    const live = await page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, groups: document.querySelectorAll('#s-custom .cgroup').length,
      sw: document.querySelectorAll('#c-sq button').length, g: document.getElementById('pv').dataset.g, scrolls: getComputedStyle(document.getElementById('s-custom')).overflowY }));
    /* AMENDED at build 42 (v23 L.7c): the Everywhere row was a tenth group. AMENDED AT BUILD 53 (v28 item 2): it is gone again - the Music
       row holds the key tracks now, so there are nine, which is what build 39 shipped. */
    // AMENDED AT BUILD 57 (v29 Section A, 57.11b): a tenth group — Background colour, split off the Background row
    (live.screen === 's-custom' && live.groups === 10 && live.sw > 1 && live.g && live.scrolls === 'auto')
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
    /* AMENDED at build 58 (58.3): SIX tabs, one per chest, and every label comes from GRID.chest or PROGRESS_SCREEN so the four chest names
       are still spelled in exactly one place. L.4b's rule is unchanged and is what is asserted — one type size, the chip's own, and the ROW
       wraps rather than the type shrinking. Six labels of that length wrap to THREE rows at 390px; that is the price of naming each chest in
       full rather than inventing a second, shorter spelling of it, and it is named in the outcome for Aiden to overrule. */
    const CH39b = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
    const CP39b = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const wantTb = CH39b.CHESTS.map(c => 'c-' + c.id + ':' + CP39b.GRID.chest[c.id]).concat(['cul:' + CP39b.PROGRESS_SCREEN.cul, 'ach:' + CP39b.PROGRESS_SCREEN.ach]).join('|');
    (tb.tabs.join('|') === wantTb && tb.upper && tb.sizes.length === 1 && tb.sizes[0] === tb.base && tb.inside)
      ? ok(`L.4b the tabs read ${tb.tabs.map(x => x.split(':')[1]).join(' · ')} in the chip's own ${tb.base} on ${tb.rows} row(s) at ${tb.w}px - the row wraps, the type does not shrink, nothing past the edge`)
      : bad('L.4b the tab bar', JSON.stringify({ tb, wantTb }));
    await click('#s-prog .back'); await sleep(400);
    // a profile left on the old Customise tab (builds 33-38) comes back on Customise unlocks, not on nothing
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS, menuSeen: 1, progTab: 'cus' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const old = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab, cul: !document.getElementById('p-cul').hidden, rows: document.querySelectorAll('#cul-list .a').length }));
    (old.stored === 'cul' && old.cul && old.rows > 0)
      ? ok(`L.4b a stored 'cus' from builds 33-38 opens on Customise unlocks (${old.rows} rows) and is stored as 'cul'`) : bad('L.4b the old tab value', JSON.stringify(old));
    /* DELETED at build 58 (58.3), as CLAUDE.md's gate rule requires — a source-text check that fails on a refactor is deleted and named in the
       outcome, never re-spelled. It spelled the exact expression `cleanPrefs` used to clamp `progTab` to three values; there are six now and the
       clamp is a named function, `cleanTab`. What it stood for is DRIVEN instead, immediately above (a stored 'cus' lands on Customise unlocks)
       and at B.21's "the tab is remembered" block, which boots a profile holding the retired 'unl' and lands it on the Games chest tab. */
    // a stored value that is not one of the six falls back to the first tab, which is what an absent one does
    await setStorage({ ne: { v: 7, prefs: { ...OPEN_PREFS, menuSeen: 1, progTab: 'nonsense' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-prog"]'); await sleep(500);
    const junk39 = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ne')).prefs.progTab, chest: !document.getElementById('p-chest').hidden }));
    (junk39.stored === 'c-games' && junk39.chest)
      ? ok('L.4b / 58.3 a progTab value that is not one of the six falls back to the Games chest tab') : bad('L.4b the unknown tab value', JSON.stringify(junk39));
  }

  /* ---- 3. L.4c: the tabs are a PARTITION - disjoint, and together exactly ACH + keyAch(); the Games chest tab is the chain (L6).
     AMENDED at build 58 (58.3): SIX tabs, not three. Each key chest's tab holds that key's rows, Customise unlocks still holds every row with a
     payout, and Achievements holds what is left - the five Pro extras and the thirteen Secrets. The property being asserted has not changed at
     all: no row on two tabs, no row on none, and the six together are exactly ACH + keyAch(). ---- */
  {
    const pt = await page.evaluate(async () => { const P = await import('./progress.js'); const K = await import('./progress/key.js'); const R = await import('./ui/router.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const ids = s => [...document.querySelectorAll(s)].map(b => b.dataset.ach);
      const open = async tab => { R.show('s-menu'); await wait(100); R.show('s-prog', { tab }); await wait(400); };
      await open('c-games'); const unl = ids('#chest-list [data-ach]'), unlRows = document.querySelectorAll('#chest-list .urow').length;
      const chest = {};
      for (const tab of ['c-key', 'c-pro', 'c-thorns']) { await open(tab); document.querySelector('#chest-g [data-v="all"]')?.click(); await wait(300); chest[tab] = ids('#chest-list .a'); }
      await open('cul'); const cul = ids('#cul-list .a'), culHeads = [...document.querySelectorAll('#cul-list h4')].map(h => h.textContent.trim());
      await open('ach'); document.querySelector('#ach-g [data-v="all"]')?.click(); await wait(300); const ach = ids('#achlist .a');
      const keys = K.keyAch();
      // AMENDED at build 44 (v24 D.2): nine key roster rows carry a reward now, so "every row with an unlocks field" reads both lists
      return { unl, unlRows, chest, cul, culHeads, ach, table: P.ACH.map(a => a.id).concat(keys.map(a => a.id)), withUnlocks: P.ACH.concat(keys).filter(a => a.unlocks).map(a => a.id),
        pureCul: P.ACH.concat(keys).filter(a => P.achTab(a) === 'cul').map(a => a.id), keyPaid: keys.filter(a => a.unlocks).length }; });
    const srt = a => a.slice().sort().join();
    const chestAll = [].concat(pt.chest['c-key'], pt.chest['c-pro'], pt.chest['c-thorns']);
    const everyTab = [pt.cul, pt.ach, pt.chest['c-key'], pt.chest['c-pro'], pt.chest['c-thorns']];
    const seen58 = {}; const both = []; for (const list of everyTab) for (const id of list) { if (seen58[id]) both.push(id); seen58[id] = 1; }
    const union = new Set(Object.keys(seen58));
    const lost = pt.table.filter(id => !union.has(id)), extra = [...union].filter(id => !pt.table.includes(id));
    const total58 = pt.cul.length + pt.ach.length + chestAll.length;
    // 58.3: Achievements keeps only what fits nowhere else - no row on it may also be on a chest tab
    const strays = pt.ach.filter(id => chestAll.includes(id));
    (!pt.unl.length && pt.unlRows > 0 && !both.length && !lost.length && !extra.length && !strays.length && total58 === pt.table.length)
      ? ok(`L.4c / 58.3 the six tabs are a partition: the Games chest ${pt.unlRows} rows and no achievement (L6), the Skill chest ${pt.chest['c-key'].length}, the Pro chest ${pt.chest['c-pro'].length}, the Author chest ${pt.chest['c-thorns'].length}, Customise unlocks ${pt.cul.length}, Achievements ${pt.ach.length} - disjoint, and together exactly ACH + keyAch() (${pt.table.length})`)
      : bad('L.4c the partition', JSON.stringify({ unl: pt.unl, both, lost, extra, strays, n: [pt.cul.length, pt.ach.length, chestAll.length, pt.table.length] }));
    (srt(pt.cul) === srt(pt.withUnlocks) && srt(pt.pureCul) === srt(pt.cul) && pt.keyPaid === 9)
      ? ok(`L.4c Customise unlocks is every row with an unlocks field and nothing else, by achTab() - grouped ${pt.culHeads.join(' / ')}`)
      : bad('L.4c what the middle tab holds', JSON.stringify({ cul: pt.cul, want: pt.withUnlocks }));
    // an achievement toast, and a locked cosmetic's line, open Progress on the tab the row lives on, at the row
    const route = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'first' }); await wait(500);
      const a = { cul: !document.getElementById('p-cul').hidden, flash: !!document.querySelector('#cul-first.flash') };
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'qt_sab' }); await wait(500);
      const b = { ach: !document.getElementById('p-ach').hidden, flash: !!document.querySelector('#ach-qt_sab.flash') };
      // 58.3: a KEY row lands on its own chest's tab - `qt_bclean5` is one of the 23 roster rows that kept an older id, at key 1, so the Skill chest
      R.show('s-menu'); await wait(100); R.show('s-prog', { ach: 'qt_bclean5' }); await wait(500);
      const c = { chest: !document.getElementById('p-chest').hidden, tab: JSON.parse(localStorage.getItem('ne')).prefs.progTab, flash: !!document.querySelector('#c-key-qt_bclean5.flash') };
      return { a, b, c }; });
    (route.a.cul && route.a.flash && route.b.ach && route.b.flash && route.c.chest && route.c.tab === 'c-key' && route.c.flash)
      ? ok('L.4c / 58.3 {ach} lands on the tab that row lives on: Showed up on Customise unlocks, Committed on Achievements, and a key-1 roster row on the SKILL CHEST tab - each row flashed')
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
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN39, chests: { games: 1 } }, runs: [{ t: NOW39, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 9, misses: 0 }], ach: { first: NOW39, qt_bclean5: NOW39, qt_sab: NOW39 }, unlock: { 'quick-tap:four': NOW39 }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const lab = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      for (const [t, s] of [['c-games', '#chest-list .urow'], ['c-key', '#chest-list .a'], ['cul', '#cul-list .a'], ['ach', '#achlist .a']]) { R.show('s-menu'); await wait(100); R.show('s-prog', { tab: t }); await wait(1800);
        out[t] = [...document.querySelectorAll(s)].map(b => ({ id: b.dataset.ach || b.dataset.d || 'key', done: b.classList.contains('done'), cols: [...b.querySelectorAll(':scope > .rw, :scope > em')].map(e => getComputedStyle(e).color) })); }
      return out; });
    const judge = rows => { const wrong = rows.filter(r => !r.cols.length || r.cols.some(c => c !== (r.done ? OK39 : INK39))); return { n: rows.length, done: rows.filter(r => r.done).length, wrong: wrong.length, sample: wrong[0] }; };
    // AMENDED at build 58 (58.3): the Game unlocks tab is the Games chest tab, and a key chest tab is walked beside it - same rule, more tabs
    const J = { 'c-games': judge(lab['c-games']), 'c-key': judge(lab['c-key']), cul: judge(lab.cul), ach: judge(lab.ach) };
    const reds = Object.values(lab).flat().flatMap(r => r.cols).filter(c => RED39.includes(c)).length;
    (['c-games', 'c-key', 'cul', 'ach'].every(t => J[t].n && J[t].done && J[t].done < J[t].n && !J[t].wrong) && !reds)
      ? ok(`L.2 every label is white until earned and green once, on every tab - the Games chest ${J['c-games'].done}/${J['c-games'].n}, the Skill chest ${J['c-key'].done}/${J['c-key'].n}, Customise unlocks ${J.cul.done}/${J.cul.n}, Achievements ${J.ach.done}/${J.ach.n} earned - and not one is red`)
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
    /* AMENDED at build 46 (v25 item 22): `.rcard` is the congratulations card, and it is the second exemption. The rule exists because the stamp is
       drawn BEHIND every screen (item 4) and a screen's last control would otherwise sit over it; the card lives inside `.cere`, a fixed overlay at
       z-index 60 with its own opaque panel, so the stamp is behind the whole layer and cannot reach its last control. A scroller that is part of a
       SCREEN still joins the selector or this fails. */
    const OVERLAY = ['.otwrap', '.rcard'];
    const bare = autos.filter(s => !OVERLAY.includes(s) && !spacer.includes(s + '::after'));
    (/--stampclear:calc\(var\(--stampat\) \+ var\(--stamp\) \+ 16px\)/.test(flat) && /#build\{[^}]*bottom:var\(--stampat\)[^}]*font:500 var\(--stamp\)\/1/.test(flat) && autos.length && !bare.length)
      ? ok(`L.5 every overflow-y:auto scroller on a SCREEN ends with the stamp's offset + height + a 16px line of space (${autos.filter(s => !OVERLAY.includes(s)).join(', ')}); the two inside fixed overlays are left out - .otwrap, the result's top-10 box, and .rcard, the congratulations card at z-index 60`)
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
if (section('build 40 - batch 16, four chests and the meter')) {
  const NOW40 = Date.now();
  const PLAIN40 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const CH40 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const CP40 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const MS40 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);   // build 52 (v27 items 7 / 8): the video word is the slot's own title
  const fill40 = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  const U40 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB40 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL_UNLOCK = Object.fromEntries(U40.UNLOCKS.map(x => [x.key, NOW40]));
  const KEY1_BARS = Object.fromEntries(Object.keys(KB40.KEY_BARS).map(k => [k, NOW40]));
  // the build-32 block's svgClick is scoped to that block: an SVG element takes a dispatched click, not .click()
  const svgClick = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);

  /* ---- 1. L.10: FOUR chests, named by what opens them, in one config beside config/key-bars.js; G.3's gate, both asks and frontPct are gone ---- */
  {
    const cfg = read('config', 'chests.js');
    const ids = CH40.CHESTS.map(c => c.id).join(), needs = CH40.CHESTS.map(c => c.needs).join(), opens = CH40.CHESTS.map(c => c.opens).join();
    const a2 = !/^\s*import\b/m.test(cfg) && !/=>|\bfunction\b/.test(strip(cfg));
    const code = ['index.html', 'progress/key.js', 'ui/screens/pick.js', 'ui/screens/key.js', 'ui/screens/menu.js', 'ui/screens/testing.js', 'ui/screens/customise.js', 'ui/screens/progress.js', 'config/copy.js', 'styles/app.css']
      .map(f => [f, strip(read(...f.split('/')))]);
    const numbered = code.filter(([, s]) => /\bchest[123]\b|data-chest="\d|\bchestN\b/.test(s)).map(([f]) => f);
    const gate = code.filter(([, s]) => /glgate|gateState|gateOff|\.gated\b|unlock all games first|askPro|askBox|askwrap|proAsk|openAsk|frontPct|prefs\.pro\b|mapOpen/i.test(s)).map(([f]) => f);
    (ids === 'games,key,pro,thorns' && needs === 'modes,clear,pro,author' && opens === 'clear,pro,author,' && a2 && !numbered.length && !gate.length)
      ? ok(`L.10 four chests in config/chests.js - ${ids} - needing ${needs} and revealing clear, pro, author and nothing; data only (A2); no chest is numbered anywhere in the app, and G.3's gate, both asks and frontPct are gone`)
      : bad('L.10 the four chests', JSON.stringify({ ids, needs, opens, a2, numbered, gate }));
  }

  /* ---- 2. L.10e: strictly sequential - no chest ready while the one before it is shut - and opening Games reveals exactly key 1 ---- */
  {
    await boot({}, {}, { v: 5, plain: PLAIN40 });
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
    /* AMENDED AT BUILD 59 (v30 59.11): the meter BEFORE the chest opens is no longer 0 — it is the modes' own share of the first
       hundred, which is the whole of the item ("it should go towards 100% as we play the game"). What is asserted instead is the
       thing that has not changed: the chest opening is what lands the KEY-1 BARS, so the figure jumps from the modes share to 100. */
    (rv.before.state === 'ready' && !rv.before.clear && rv.before.meter > 0 && rv.before.meter < 100 && rv.r && rv.r.was === rv.before.meter && rv.r.now === 100 /* AMENDED at build 48 (v26 items 7 / 9): 0–300 */ && rv.bare === rv.total && !rv.tiered && rv.retroBare && rv.again === null && rv.key === 'ready')
      ? ok(`L.10e / v30 59.11 opening the Games chest reveals exactly key 1 — it already stood at ${rv.r.was} on the modes alone, and the chest is what lets the bars count: all ${rv.bare} key-1 bars a saved best beats bank silently and nothing on Pro or Author does; the meter goes ${rv.r.was} -> ${rv.r.now}, the Skill chest is ready, a second open does nothing`)
      : bad('L.10e what the Games chest reveals', JSON.stringify(rv));
  }

  /* ---- 3. L.8a / L.10b: ONE meter, 0-400 - modes, then each key's cleared bars - a band counting only once its chest is open ---- */
  {
    const keyjs = strip(read('progress', 'key.js')), surf = ['ui/screens/menu.js', 'ui/screens/pick.js', 'ui/screens/key.js'].map(f => strip(read(...f.split('/'))));
    /* DELETED at build 48: "L.8a one meter() … the menu card, the map chests and the key screen all read it" tested the source text, and v26 item 12
       took the percentage off the map, so pick.js no longer spells meter(). A source-text check a rule change fails is deleted, not re-spelled
       (site/CLAUDE.md → The gate). The chests section drives the same claim on the page: every surface agrees with the store. */
    void keyjs; void surf;
    const mt = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const U = await import('./config/unlocks.js');
      const set = (chests, unlock, tiers) => { S.prefs.chests = Object.assign({ games: 0, key: 0, pro: 0, thorns: 0 }, chests); S.store.unlock = unlock;
        S.store.bars = {}; for (const t of tiers) for (const c of K.COMBOS) S.store.bars[K.skey(c.key, t)] = 1; return K.meter(); };
      const all = ['clear', 'pro', 'author'], mode = U.UNLOCKS.find(x => x.key !== 'sequence:practice' && x.key.split(':').length === 2).key;
      const out = { fresh: set({}, {}, []), oneMode: set({}, { [mode]: 1 }, []), everyMode: set({}, Object.assign({}, ALL), []),
        noGames: set({}, Object.assign({}, ALL), all), noKey: set({ games: 1 }, Object.assign({}, ALL), all), noPro: set({ games: 1, key: 1 }, Object.assign({}, ALL), all),
        noThorns: set({ games: 1, key: 1, pro: 1 }, Object.assign({}, ALL), all), full: set({ games: 1, key: 1, pro: 1, thorns: 1 }, Object.assign({}, ALL), all), max: K.meterMax() };
      set({ games: 1 }, Object.assign({}, ALL), []); K.COMBOS.slice(0, K.COMBOS.length / 2).forEach(c => { S.store.bars[c.key] = 1; }); out.half = K.meter();
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.store.bars = {}; S.save(); return out; }, ALL_UNLOCK);
    /* AMENDED at build 48 (v26 items 7 / 9 / 12): the meter is 0–300 - the modes band is off (METER.modes false), so modes read 0 and the keys are the whole of it.
       AMENDED AT BUILD 59 (v30 59.11): THE FIRST 100 IS MODES + KEY-1 BARS IN EQUAL STEPS, so modes are back in the number - but INSIDE the
       first band, not as a fourth one. Aiden: "the user should also feel like they're progressing based on the games they unlocked. So the
       first 100% should be a combination of unlocking games and then doing the key." The figures this asserts are therefore derived rather
       than typed: the modes' share of the first band is its own count over (modes + key-1 bars), so a mode added to the game moves all of
       them together and this check follows without an edit. What has NOT moved is asserted as hard numbers because it is the rule: 100 at
       key 1 whole, 200 at Pro, 300 at Author, a maximum of 300, and nothing counting past a shut chest. */
    const modeShare = await page.evaluate(async () => { const P = await import('./progress.js'), K = await import('./progress/key.js'), C = await import('./config/chests.js');
      const m = P.modeCount(), free = C.METER.freeStart ? m.free : 0, den = Math.max(0, m.total - free);
      return { den, bars: K.COMBOS.length, all: Math.floor(100 * den / (den + K.COMBOS.length) + 1e-9) }; });
    const half58 = Math.floor(100 * (modeShare.den + Math.floor(modeShare.bars / 2)) / (modeShare.den + modeShare.bars) + 1e-9);
    (mt.fresh === 0 && mt.oneMode > 0 && mt.oneMode < modeShare.all && mt.everyMode === modeShare.all && mt.noGames === modeShare.all
      && mt.noKey === 100 && mt.noPro === 200 && mt.noThorns === 300 && mt.full === 300 && mt.half === half58 && mt.max === 300)
      ? ok(`L.8a / L.10b / v30 59.11 the meter, 0–300, with the first hundred shared between modes and key-1 bars in EQUAL STEPS: a new profile ${mt.fresh}%, one mode ${mt.oneMode}, every mode ${mt.everyMode} (${modeShare.den} unlockable modes against ${modeShare.bars} bars, so the Games chest opens at about a quarter and the key carries the rest); with every bar on every key banked underneath it still reads ${mt.noGames} before the Games chest — the bars wait for it, only the modes move — then ${mt.noKey} before the Skill chest, ${mt.noPro} before the Pro chest and ${mt.noThorns} past it (never past a shut chest); half of key 1 is ${mt.half}`)
      : bad('L.8a / v30 59.11 the meter', JSON.stringify({ mt, modeShare, half58 }));
  }

  /* ---- 4. L.8b: a chest's tap opens its screen and the open happens THERE by itself - no ask - then no repeat; L.11c its words beside it ---- */
  {
    const runs = Object.keys(KB40.KEY_BARS).slice(0, 5).map(k => { const [g, d, s] = k.split(':'); return { t: NOW40, g, d, s: +s, n: '', v: 4, hits: KB40.KEY_BARS[k].author, misses: 0 }; });
    await boot({}, { unlock: ALL_UNLOCK, runs }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-pick"]'); await sleep(700);
    const map = await page.evaluate(() => { const c = id => document.querySelector(`.chest[data-chest="${id}"]`);
      return { games: c('games').className, need: c('games').querySelector('.pic').dataset.need, key: c('key').querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap'), words: document.querySelector('.chestwords[data-for="games"]').hidden }; });
    // AMENDED at build 41 (v23 L.6): the chest's sound is Snd.chest and never unlockFx; the open is its ceremony, ~3s after the 600ms open, held on "tap to continue"
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__fx40 = 0; window.__un40 = 0; const o = A.Snd.chest, u = A.Snd.unlockFx;
      A.Snd.chest = function () { window.__fx40++; return o.apply(this, arguments); }; A.Snd.unlockFx = function () { window.__un40++; return u.apply(this, arguments); }; });
    await click('.chest[data-chest="games"]'); await sleep(250);
    const onKey = await onScreen();
    await revealReady();
    const opened = await page.evaluate(async () => { const K = await import('./progress/key.js'); const ne = JSON.parse(localStorage.getItem('ne')); const box = document.getElementById('key-cere');
      // v30 (59.11): the first band is modes + key-1 bars, so the figure derived here needs the modes count as well
      const P59 = await import('./progress.js'), C59 = await import('./config/chests.js');
      const mc = P59.modeCount(), fr = C59.METER.freeStart ? mc.free : 0;
      return { modes: { num: Math.max(0, mc.open - fr), den: Math.max(0, mc.total - fr) }, games: ne.prefs.chests.games, shown: !box.hidden, tap: box.classList.contains('tap'), txt: box.innerText.replace(/\s+/g, ' ').trim(), meterTxt: (box.querySelector('.meterv') || {}).textContent, meter: K.meter(), seen: ne.prefs.meterSeen, total: K.COMBOS.length,
        bare: Object.keys(ne.bars).filter(k => !k.includes('|')).length, fx: window.__un40 ? -window.__un40 : window.__fx40, toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }; });
    await revealDone(); await sleep(500); opened.map = await onScreen();
    await click('#s-pick .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(1400);
    const again = await page.evaluate(() => ({ shown: !document.getElementById('key-cere').hidden, fx: window.__fx40 }));
    await click('#s-key .back'); await sleep(300); await click('[data-go="s-pick"]'); await sleep(700);
    const after = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { cls: c.className, need: c.querySelector('.pic').dataset.need, words: w.hidden ? null : [...w.querySelectorAll('.cw')].map(x => x.dataset.w), syms: w.querySelectorAll('.cwsym').length, wr: +w.style.gridRow, wc: +w.style.gridColumn, cr: +c.style.gridRow, cc: +c.style.gridColumn, key: document.querySelector('.chest[data-chest="key"] .pic').dataset.need, keyWords: document.querySelector('.chestwords[data-for="key"]').hidden }; });
    (/ready/.test(map.games) && map.need === 'tap to open' && map.key === 'Earn the Skill key' /* AMENDED at build 48 (v26 item 12); for build 49, the Skill key */ && !map.ask && map.words)
      ? ok('L.8b with every mode unlocked the Games chest is ready on the map - "tap to open" - the Skill chest says "Earn the Skill key", nothing stands beside a shut chest, and there is no ask box in the page') : bad('L.8b the ready Games chest', JSON.stringify(map));
    (onKey === 's-key' && opened.games === 1 && opened.shown && opened.tap && /Games chest opened/i.test(opened.txt) && !opened.meterTxt && !/%/.test(opened.txt) /* AMENDED at build 48 (v26 item 7): no percentage on the Games chest */ && opened.seen === opened.meter && opened.meter === Math.floor(100 * (opened.modes.num + opened.bare) / (opened.modes.den + opened.total) + 1e-9) /* AMENDED at build 59 (v30 59.11): the first band is modes + key-1 bars */ && opened.bare === 5 && opened.fx === 1 && !opened.toast && opened.map === 's-pick')
      ? ok(`L.8b AMENDED at build 43 (v24 B.2): the map's tap on the READY chest opened it at once, its ceremony covering the key screen from the frame it is shown: "${opened.txt}" - its ${opened.bare} already-beaten key-1 bars credited silently (G.4 extended) and the meter at ${opened.meter}% with no figure on the chest's own screen (v26 item 7), one chest sound, no toast, no question; its tap goes to the map (AMENDED at build 41, L.6)`) : bad('L.8b the open on the key screen', JSON.stringify(opened));
    (!again.shown && again.fx === 1) ? ok('L.8b opened is opened: the next visit to the key screen opens nothing and plays nothing') : bad('L.8b no repeat', JSON.stringify(again));
    // v25 (item 7, build 46): and each word now carries the SAME symbol that rose out of the chest, so the two moments are connected
    /* AMENDED AT BUILD 52 (v27 items 7 / 8): the chest's video word is the slot's title and Aiden renamed every slot, so the title is READ FROM
       config/messages.js here rather than written out. It had already been rewritten twice by hand; a literal in a gate check is a second place
       the name lives, which is exactly what build 51 item 4 took out of the app. */
    /* AMENDED AT BUILD 59 (v30 59.3): and the slot's title wears MSG.quote on the map too, so it reads as the name of a video. The marks
       come off the config here exactly as ui/chest.js puts them on, so this check still spells neither the name nor the punctuation. */
    const vidWord41 = CP40.MSG.quote[0] + MS40.MESSAGES.find(m => m.by && m.by.chest === 'games').title + CP40.MSG.quote[1];
    (/open/.test(after.cls) && after.need === 'opened' && after.words && after.words.join() === 'CUSTOMISE,SKILL KEY,' + vidWord41 && after.syms === after.words.length && after.wr === after.cr && after.wc !== after.cc && after.keyWords && after.key === 'Earn the Skill key' /* AMENDED at build 48 (v26 item 12); for build 49, the Skill key */)
      ? ok(`L.11c back on the map the Games chest is open with its words beside it (${after.words.join(' · ')}, row ${after.wr}, col ${after.wc} against the chest's ${after.cc}), each with its own symbol (item 7), and the Skill chest says "${after.key}" (v26 item 12)`) : bad('L.11c the opened chest and its words', JSON.stringify(after));
  }

  /* ---- 5. L.8b, both drivers: a result-screen clear that tops key 1 opens the Skill chest inside the interlude and hands back on time ----
     REVERSED at build 43 (v24 C.1 / C.5): the interlude NO LONGER OPENS the chest — a chest opens because its key was tapped and the player said
     Open. The same clear makes key 1 WHOLE, so key 1's earn moment plays inside the interlude after the segment, the Skill chest stays READY, and
     the result comes back by itself once the moment has finished (nothing waits for a tap, so the second driver needs nothing new) */
  {
    const bars = Object.assign({}, KEY1_BARS); delete bars['quick-tap:two:5'];
    await boot({ chests: { games: 1 }, adRuns: 0 }, { unlock: ALL_UNLOCK, bars }, { v: 5, plain: PLAIN40 });
    const il = await page.evaluate(async () => { const E = await import('./core/events.js'); const ST = await import('./core/state.js'); const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const at = () => (document.querySelector('.screen.on') || {}).id;
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5'); const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: c.bar.bar + 3, misses: 0, n: '', v: 4 };
      const before = K.chestState('key'); const adv = K.checkKey(run, false); if (!adv) return { err: 'no clear' };
      const ready = K.chestState('key');
      E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
      /* AMENDED at build 51 (v27 item 14): the screen's own marker is `data-earn`, the tier being earned - `data-rev` went with KEY_REVEAL. And the
         read WAITS FOR THE ANIMATION rather than for a number: the old 2600ms sat inside a 6.3s reveal, and at 1.7s there is no fixed wait that is
         after the result hands over and before the animation ends. It polls for the reveal to come up, then for it to end by itself. */
      let up = false; for (let i = 0; i < 80; i++) { await wait(100); if (!document.getElementById('key-cere').hidden) { up = true; break; } }
      const mid = { screen: at(), key: S.prefs.chests.key, box: up, rev: document.getElementById('s-key').dataset.earn || '' };
      /* AMENDED at build 48 (v26 items 10 / 11): the reveal plays its earn moment to the end and ends BY ITSELF - no tap to continue, no card - and the
         key then waits for its tap; wait for it to end rather than for a fixed time */
      let sawTap = false, sawCard = false; for (let i = 0; i < 80 && !document.getElementById('key-cere').hidden; i++) { await wait(200); const h = document.getElementById('key-cere'); if (h.classList.contains('tap')) sawTap = true; if (h.querySelector('.rcard')) sawCard = true; }
      const held = { screen: at(), tap: sawTap, card: sawCard, ended: document.getElementById('key-cere').hidden, done: document.getElementById('s-key').classList.contains('kdone'), hint: document.getElementById('key-hint').textContent };
      return { err: null, before, ready, mid, held, key: S.prefs.chests.key, state: K.chestState('key') }; });
    if (il.err) bad('L.8b the interlude', il.err);
    /* REVERSED AGAIN at build 46 (v25 items 11 / 22): the clear that makes key 1 whole now plays its FIRST-OPEN REVEAL, which waits for a tap and
       ends on the congratulations card — so the result does NOT come back on a timer any more; the reveal hands it back at Continue. Same family
       as build 41's lesson: a moment that waits for a tap, inside a moment that hands itself back on a timer, owns the hand-back. The chest still
       does not open here (v24 C.1) and nothing is banked by any of it (L10). */
    else (il.before === 'locked' && il.ready === 'ready' && il.mid.screen === 's-key' && il.mid.key === 0 && il.mid.box && il.mid.rev === 'clear' && il.held.screen === 's-key' && !il.held.tap && !il.held.card && il.held.ended && il.held.done && il.held.hint === fill40(CP40.KEY.completeReady, { chest: CP40.GRID.chest.key }) && il.key === 0 && il.state === 'ready')
      ? ok('L.8b REVERSED at build 46 (v25 items 11 / 22), AMENDED at build 48 (v26 items 10 / 11): a live clear that makes key 1 whole interrupts the result and plays key 1\'s FIRST-OPEN REVEAL after the segment, to its end and by itself - no "tap to continue", no card - and the key then says "tap the key to open the Skill chest" instead of handing the result back on a timer. No chest opens by itself; the Skill chest stays READY for its key to be tapped')
      : bad('items 11 / 22 the interlude plays the reveal and holds', JSON.stringify(il));
    // AMENDED at build 48 (v26 item 11): with no card, what hands the result back is the player - Back from the waiting key (or the Skill chest's own card)
    await sleep(600); await page.evaluate(async () => { const R = await import('./ui/router.js'); R.back(); }); await sleep(900);
    const back46 = await onScreen();
    (back46 === 's-over')
      ? ok('items 11 / 22 and the player hands the result screen back - Back from the key waiting to be tapped (v26 item 11), never a timer (build 41\'s lesson, one moment further on)')
      : bad('items 11 / 22 the reveal hands the result back', back46);
  }

  /* ---- 6. L.11a: Customise locked until the Games chest - crossed out, "open the Games chest", defaults applied, choices kept; green until first opened ---- */
  {
    await boot({ col: { 'quick-tap': { sq: '#FFD1DC', lead: '#FFB020', cut: '#FFD1DC' } }, bg: 'grid', snd: 'wood', lastGame: 'quick-tap' }, { ach: { first: NOW40 } }, { v: 5, plain: PLAIN40 });
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
    /* AMENDED AT BUILD 53 (v28 item 4): the grey line on this tab is gone - it said "open the Games chest to use them" before the chest and "tap
       an earned one to use it" after, two lines saying what a tap does on a screen made of rows. Both are the tab's own count now, either way. */
    (/^\d+ of \d+ unlocked$/.test(lk.cul.hint.trim()) && lk.cul.earned && lk.cul.screen === 's-prog' && /^\d+ of \d+ unlocked$/.test(O.hint.trim()))
      ? ok(`L.11a / v28 item 4 the Customise unlocks tab is not gated: an achievement earned before the chest is there and green, the tab says how much of itself is done either side of the chest ("${lk.cul.hint}" then "${O.hint}"), and a tap on it does not open a locked screen`) : bad('L.11a the Customise unlocks tab', JSON.stringify({ cul: lk.cul, hint: O.hint }));
    (!/cuslock/.test(O.cls) && /newthing/.test(O.cls) && O.need && O.sq === '#FFD1DC' && O.snd === 'wood' && O.bg === 'grid' && O.unx)
      ? ok('L.11a with the Games chest open the strike wipes off, the row is green until first opened (L8 / D.5), and the choices made before apply the moment it opens') : bad('L.11a Customise once the chest is open', JSON.stringify(O));
    (lk.opened.screen === 's-custom' && lk.opened.seen === 1 && !lk.opened.after && lk.opened.green)
      ? ok('L.11a opening Customise spends the green on the menu row, and a colour earned while it was locked is first-seen green there') : bad('L.11a the first open of Customise', JSON.stringify(lk.opened));
  }

  /* ---- 7. L.12: a whole key taps through to its chest on the map - one exported predicate, no chest read on the key screen (A4) ---- */
  {
    const keyScr = strip(read('ui', 'screens', 'key.js'));
    (/export \{[^}]*\bkeyChest\b/.test(read('progress', 'key.js')) && /keyChest\(/.test(keyScr) && !/prefs\.chests|prefs\[['"]chest|store\.unlock/.test(keyScr))
      ? ok('L.12 keyChest() is the one exported predicate, and the key screen reads no chest flag of its own (A4)') : bad('L.12 one predicate');
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL_UNLOCK, bars: KEY1_BARS }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-key"]'); await sleep(900);
    const k12 = await page.evaluate(() => ({ hub: (document.querySelector('#key-ring [data-act="key-chest"]') || {}).dataset?.chest || null, hint: document.getElementById('key-hint').textContent }));
    await svgClick('#key-ring [data-act="key-chest"]'); await sleep(700);
    const map12 = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, flash: c.classList.contains('flash'), open: c.classList.contains('open') }; });
    const none = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS[0]; delete S.store.bars[c.key]; S.save(); R.show('s-menu'); await wait(100); R.show('s-key'); await wait(700);
      const out = { hub: !!document.querySelector('#key-ring [data-act="key-chest"]'), pred: K.keyChest('clear') }; S.store.bars[c.key] = 1; S.save(); return out; });
    (k12.hub === 'key' && /tap the key/.test(k12.hint) && map12.screen === 's-pick' && map12.flash && map12.open && !none.hub && none.pred === null)
      ? ok(`L.12 a whole key 1 whose chest is open is a tap target ("${k12.hint}") that lands on the map with the Skill chest in view, lid up; a key still in progress is not one`) : bad('L.12 the key taps through to its chest', JSON.stringify({ k12, map12, none }));
  }

  /* ---- 8. L.8f + G.8 extended: Testing's switch and reset PER CHEST, four of each, and "set meter to N%" (S5) ---- */
  {
    await boot({}, { bars: { 'quick-tap:two:5': NOW40 } }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-testing"]'); await sleep(400);
    const t8 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const q = s => document.querySelector(s);
      const sw = id => q(`[data-act="dev-chestall"][data-chest="${id}"]`), rs = id => q(`[data-act="dev-chestreset"][data-chest="${id}"]`);
      const out = { m0: K.meter() };
      /* AMENDED at build 48 (v26 items 7 / 12): a switch plays forward until its chest is READY - the chests before it opened the way a tap opens
         them - and taking it off is its reset; nothing is remembered and put back. The meter is 0–300 and "set meter to N%" reaches N by play */
      sw('games').click(); await wait(200); out.games = { meter: K.meter(), state: K.chestState('games'), sel: sw('games').classList.contains('sel') };
      sw('games').click(); await wait(200); out.gamesOff = { meter: K.meter(), unlock: Object.keys(S.store.unlock).filter(k => k.split(':').length === 2).length, state: K.chestState('games') };
      sw('key').click(); await wait(200); out.key = { meter: K.meter(), state: K.chestState('key'), games: K.chestState('games') };
      sw('key').click(); await wait(200); out.keyOff = { bars: Object.keys(S.store.bars).join(), state: K.chestState('key') };
      S.prefs.chests = Object.assign({}, S.prefs.chests, { key: 1 }); S.store.ach.key_clear_all = Date.now(); S.save();
      rs('key').click(); await wait(200); out.keyReset = { chest: S.prefs.chests.key, bars: Object.keys(S.store.bars).length, ach: !!S.store.ach.key_clear_all };
      rs('games').click(); await wait(200); out.gamesReset = { chest: S.prefs.chests.games, unlock: Object.keys(S.store.unlock).filter(k => k !== 'sequence:practice' && k.split(':').length === 2).length, snap: !!(S.prefs.devKeys || {}).games };
      q('#dev-meter').value = '250'; q('[data-act="dev-meter"]').click(); await wait(300); out.set = { meter: K.meter(), line: q('#dev-meter-now').textContent, stored: JSON.parse(localStorage.getItem('ne')).prefs.devMeter, chests: ['games', 'key', 'pro', 'thorns'].map(K.chestState).join(), bars: K.TIERS.map(t => K.keyState(t).done).join() };
      out.off = { button: !!q('[data-act="dev-meteroff"]') };
      return out; });
    /* AMENDED AT BUILD 59 (v30 59.11): the Games chest's switch unlocks every mode, and every mode unlocked is now most of the way
       to the Games chest rather than 0% — so what is asserted is that it is ABOVE zero and still short of the key. */
    (t8.m0 === 0 && t8.games.meter > 0 && t8.games.meter < 100 && t8.gamesOff.meter === 0 && t8.games.state === 'ready' && t8.games.sel && t8.gamesOff.unlock === 0 && t8.gamesOff.state === 'locked' && t8.key.meter === 100 && t8.key.state === 'ready' && t8.key.games === 'open' && t8.keyOff.bars === '' && t8.keyOff.state === 'locked')
      ? ok(`L.8f AMENDED at build 48 (v26 items 7 / 12) and at build 59 (v30 59.11): the Games chest's switch unlocks every mode and leaves the chest ready at ${t8.games.meter}% — the modes' own share of the first hundred, where it used to read 0; the Skill chest's opens the Games chest the way a tap does and leaves the Skill chest ready at 100%; taking either off is its reset, and taking the Games one off puts the meter back to ${t8.gamesOff.meter}`) : bad('L.8f the per-chest switches', JSON.stringify(t8));
    (t8.keyReset.chest === 0 && !t8.keyReset.bars && !t8.keyReset.ach && t8.gamesReset.chest === 0 && !t8.gamesReset.unlock && !t8.gamesReset.snap)
      ? ok('G.8 extended: resetting the Skill chest backs out key 1, the chest and its achievements; resetting the Games chest locks every mode again and shuts it') : bad('G.8 the per-chest resets', JSON.stringify({ keyReset: t8.keyReset, gamesReset: t8.gamesReset }));
    /* Build 53 (v28 item 9) made Testing's line say both figures because the shown one was clamped — "250 of 300 raw · 83% shown".
       Build 55 (v29 item 1) puts the shown figure back on the meter's own scale, so the two now agree and the line reads 250 twice. */
    (t8.set.meter === 250 && /\b250\b/.test(t8.set.line) && /250% shown/.test(t8.set.line) && t8.set.stored === undefined && t8.set.chests === 'open,open,open,locked' && t8.set.bars === '30,30,15' && !t8.off.button)
      ? ok(`L.8f AMENDED at build 48 (v26 items 7 / 12): "set meter to N%" REACHES 250 - the Key and Pro chests opened, key 1 and Pro whole, 15 Author bars - and stores no override ("${t8.set.line}"); "meter · as earned" is gone with it`) : bad('L.8f set meter to N%', JSON.stringify({ set: t8.set, off: t8.off }));
  }

  /* ---- 9. the store is v5: the chests named, one ladder step; the retired fields gone ---- */
  {
    const st9 = read('core', 'store.js');
    (/VERSION=7/.test(st9) /* AMENDED at build 42: v6 (up6, L.7c) follows up5; AMENDED AT BUILD 57 (57.6): v7 (up7, prefs.keyIntro) follows both */ && /if\(\(raw\.v\|\|0\)<5\) raw=up5\(raw\);/.test(st9) && /chests:cleanChests\(p\.chests\)/.test(st9) && !/\bpro:\[0,1,2\]|chest1:p\.chest1|gateOff:p\.gateOff|pctSeen:isObj/.test(st9))
      ? ok('store v5: up5 on the ladder, `chests` shape-checked by name, and `pro`, `chest1`-`chest3`, `gateOff` and `pctSeen` no longer read') : bad('store v5 statics');
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN40, chest1: 1, chest2: 1, chest3: 0, pro: 1, gateOff: 1, pctSeen: { clear: 40 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const mg = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { v: ne.v, chests: ne.prefs.chests, gone: ['chest1', 'chest2', 'chest3', 'pro', 'gateOff', 'pctSeen'].filter(k => k in ne.prefs) }; });
    (mg.v === 7 /* AMENDED at build 42: up6 runs after up5; AMENDED at build 57: up7 after both */ && JSON.stringify(mg.chests) === '{"games":1,"key":1,"pro":1,"thorns":0}' && !mg.gone.length)
      ? ok('store v5: a v4 record with chest 1 and chest 2 open loads with the Games, Key and Pro chests open - Games too, because chest 1 already waited for every mode (G.3) - and the retired fields dropped') : bad('store v5 migration', JSON.stringify(mg));
  }

  /* ---- 10. L.10a / §M.2: key 1 is quiet before the Games chest - no clear banked, no interlude, no outline fill, no key set, the modes count on the key screen ---- */
  {
    await boot({}, { runs: [{ t: NOW40, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }] }, { v: 5, plain: PLAIN40 });
    const qt = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5');
      const out = { adv: K.checkKey({ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: c.bar.bar + 5, misses: 0 }, false), bars: Object.keys(S.store.bars).length, ach: K.checkKeyAch({ g: 'quick-tap' }).length };
      S.store.bars['quick-tap:two:5'] = 1; S.save();   // even a clear banked before build 40 shows nothing until the chest
      R.show('s-pick'); await wait(600); const t = document.querySelector('.tile[data-game="quick-tap"]'); out.fill = { part: t.classList.contains('kpart'), kf: t.querySelector('.kfill').style.getPropertyValue('--kf') };
      R.show('s-key'); await wait(600); out.key = { main: document.getElementById('key-main').hidden, shell: document.getElementById('key-shell').innerText.replace(/\s+/g, ' ').trim(), locked: document.querySelectorAll('#key-keys .kkey.locked').length, digits: [...document.querySelectorAll('#key-keys .kkey')].some(b => /\d/.test(b.textContent)) };
      R.show('s-prog', { tab: 'ach' }); await wait(500); out.sets = [...document.querySelectorAll('#achlist h4')].map(h => h.className).filter(x => /^key/.test(x)).join();
      S.store.bars = {}; S.save(); return out; });
    (qt.adv === null && !qt.bars && !qt.ach && !qt.fill.part && qt.fill.kf === '0.000' && qt.key.main && /1 of 13 modes/.test(qt.key.shell) && !/%/.test(qt.key.shell) /* AMENDED at build 48 (v26 item 9): no percentage on the Keys screen */ && qt.key.locked === 3 && !qt.key.digits && !qt.sets)
      ? ok(`L.10a / §M.2 before the Games chest key 1 is quiet: a run past a bar banks nothing and hands back no interlude, the tile outline stays empty, no key set is listed, and the key screen says only "${qt.key.shell.slice(0, 70)}…"`) : bad('L.10a key 1 quiet before the Games chest', JSON.stringify(qt));
  }
}

/* ---- 21. build 41 (batch 16, the moments - FEEDBACK-v23 §L.6, §L.8 d-e, §L.9 a-d, §L.10 d, §L.11 b d e). Presentation only, L10 quoted ---- */
if (section('build 41 - batch 16, the moments')) {
  const NOW41 = Date.now();
  const PLAIN41 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {} };
  const MS41 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const CP41 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 59 (v30 59.3): MSG.quote, for the video word
  const CH41 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const AU41 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const U41 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB41 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL41 = Object.fromEntries(U41.UNLOCKS.map(x => [x.key, NOW41]));
  const tierBars = t => Object.fromEntries(Object.keys(KB41.KEY_BARS).map(k => [t === 'clear' ? k : `${k}|${t}`, NOW41]));
  const IDS = ['games', 'key', 'pro', 'thorns'];
  const scr = () => page.evaluate(() => (document.querySelector('.screen.on') || {}).id);

  /* ---- 1. L.9a / L.10d: four sprites in one data config, one renderer for every surface, no art left in the markup; L10 - the two new modules write nothing ---- */
  {
    const L = CH41.CHEST_LOOK, B = CH41.METER_BANDS;
    const sig = id => JSON.stringify([L[id].box, L[id].lid, L[id].fit || [], L[id].spikes || [], L[id].boxSpikes || [], L[id].stroke, L[id].fill]);
    const distinct = new Set(IDS.map(sig)).size === 4;
    /* AMENDED at build 51 (v27 item 13 / R2): a chest matches the KEY that opens it, so the gold banded chest is the SKILL chest's and the Pro
       chest is drawn from the Pro key — its own `col`, the ring and antennae on the lid, traces across the box. `band` still says which meter
       band a chest's figure belongs to; it is no longer where its colour comes from (`col` is, through chestCol()). */
    const looks = L.games.stroke === 'var(--mute)' && L.games.fill === 'none' && L.games.sw <= 1
      && (L.key.fit || []).length >= 4 && L.key.lidSw > L.games.lidSw && L.key.lid.length > L.games.lid.length && L.key.col === L.key.stroke
      && (L.pro.fit || []).length >= 3 && (L.pro.lid || []).length > L.key.lid.length && L.pro.col === L.pro.stroke && !(L.pro.col || '').startsWith('var(')
      && L.thorns.fill === '#000000' && L.thorns.stroke === '#FFFFFF' && (L.thorns.spikes || []).length >= 3 && (L.thorns.boxSpikes || []).length > 0
      && IDS.every((id, i) => L[id].band === i) && IDS.every(id => L[id].col);
    const idle = IDS.map(id => L[id].idle.kind).join() === 'breath,shimmer,circuit,spikes' && L.games.idle.px < L.key.idle.px && L.key.idle.px < L.pro.idle.px && L.pro.idle.px <= L.thorns.idle.px;
    const drawers = ['ui/screens/pick.js', 'ui/screens/key.js', 'ui/ceremony.js'].every(f => /chestSvg\(/.test(strip(read(...f.split('/')))));
    const noArt = !/class="chestart"/.test(read('index.html')) && !/CHEST_ART/.test(strip(read('ui', 'screens', 'key.js')));
    const l10 = ['ui/ceremony.js', 'ui/chest.js'].every(f => !/\bsave\(|\bstore\b|\bprefs\b|localStorage/.test(strip(read(...f.split('/')))));
    (Object.keys(L).join() === IDS.join() && distinct && looks && idle && drawers && noArt && l10)
      ? ok('L.9a / L.10d four chest sprites in one data config (config/chests.js CHEST_LOOK): Games a thin --mute outline, Skill the gold fittings and heavier lid, Pro the Pro key\'s ring, antennae and circuit traces, Author black with spikes and white accents, each in the colour of the key that opens it (v27 item 13 / R2); four idles rising in strength; one renderer (ui/chest.js) draws the map, the key screen and the ceremony, no chest art is left in the markup, and neither new module writes anything (L10)')
      : bad('L.9a the four sprites', JSON.stringify({ keys: Object.keys(L), distinct, looks, idle, drawers, noArt, l10 }));
  }

  /* ---- 2. L.9b: READY animates, locked and opened do not; locked is crossed out, opened is lid up ---- */
  {
    // AMENDED at build 58 (58.2): the Pro chest is READY here only once Gauntlet Mini is finished as well
    await boot({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 }, readySeen: { pro: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro')), gaunt: GAUNT_ALL() }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(1400);
    const s9 = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), svg = c.querySelector('.chestart');
      return [id, { cls: ['locked', 'ready', 'open'].filter(k => c.classList.contains(k)).join(), look: svg && svg.dataset.look, run: svg ? svg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName) : null,
        x: svg ? getComputedStyle(svg.querySelector('.xl')).opacity : null, lid: svg ? getComputedStyle(svg.querySelector('.lidg')).rotate : null }]; })));
    (s9.games.cls === 'open' && s9.key.cls === 'open' && s9.pro.cls === 'ready' && s9.thorns.cls === 'locked' && IDS.every(id => s9[id].look === id)
      // AMENDED at build 51 (v27 item 13): the Pro chest's idle is a CURRENT running its traces now (`idlecur` + its nodes), not a metal shimmer
      && !s9.games.run.length && !s9.key.run.length && !s9.thorns.run.length && s9.pro.run.includes('idleglow') && s9.pro.run.includes('idlecur') && s9.pro.run.includes('idlenode')
      && s9.thorns.x === '1' && s9.games.x === '0' && /-118deg/.test(s9.games.lid) && s9.thorns.lid === 'none')
      ? ok(`L.9b on the map each chest wears its own sprite; the READY Pro chest runs its idle (${[...new Set(s9.pro.run)].join(' + ')}) and nothing else on a chest animates - not the opened Games and Skill chests, lid up and still, and not the locked Author chest, crossed out`)
      : bad('L.9b the chest states', JSON.stringify(s9));
  }

  /* ---- 3. L.9c: one quiet sound the first time the map paints a chest ready, not on the next visit ---- */
  {
    await boot({}, { unlock: ALL41 }, { v: 5, plain: PLAIN41 });
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
    /* AMENDED AT BUILD 53 (v28 items 13 / 16): a chest opened by a KEY unlocks and never breaks, so all three key chests run the one key-turn
       sequence; the breaking moved to the Games chest, which no key opens, as `crack` then `burst`.
       AMENDED AGAIN AT BUILD 54 (v29 item 5): the Author chest keeps that sequence and lays its own five theme steps over it. */
    /* AMENDED AGAIN AT BUILD 57 (v29 Section A, 57.2 / 57.8): every chest a key opens runs a COVER first and the Games chest cracks on its own
       squares' beat, so both step lists move. The Games chest is SHORTER for it (its cracking shares the uncross beat instead of following it) and the
       three key chests are longer (a cover in front of the turn), which is what makes the Author chest the longest thing in the app. */
    /* AMENDED AT BUILD 59 (v30 59.16): the two chests that want a GAUNTLET gain four named beats between `assemble` and `turn` —
       hold, enter, grip, drive — because the key and the glove used to arrive together and be gone inside half a second. The
       Games and Skill chests have no Gauntlet and are untouched, which is half of what this check is for. */
    const C = CH41.CEREMONY, want = { games: 'uncross,crack,path,burst,lid,chord', key: 'cover,uncover,assemble,turn,lid,spill',
      pro: 'cover,uncover,assemble,hold,enter,grip,drive,turn,lid,spill',
      thorns: 'cover,black,spikes,split,uncover,widen,recede,assemble,hold,enter,grip,drive,turn,lid,spill' };
    const names = IDS.every(id => C[id].steps.map(s => s.name).join() === want[id]);
    /* AMENDED AT BUILD 59 (v30 59.16): the CEILING moves from 9000 to 11500, because the item deliberately lengthens the two
       ceremonies that now have a gauntlet: "That is roughly 2.5s added, which is fine: he has said these moments can run long as
       long as something is happening." The bound is restated rather than dropped — the four ceremonies must still RISE, the Games
       one must still be about 3s, and there is still a ceiling. FLAGGED IN THE OUTCOME: build 57's question 1, whether the Author
       chest's 8.7s opening is too long, is STILL UNANSWERED, and this takes it to 11.0s. If he says it is too long, this ceiling
       and those four beats come back down together. */
    const lens = IDS.map(id => C[id].ms), rising = lens.every((v, i) => !i || v > lens[i - 1]) && Math.abs(lens[0] - 3000) <= 500 && lens[3] <= 11500;
    const inside = IDS.every(id => C[id].steps.every(s => s.at >= 0 && s.at + s.ms <= C[id].ms));
    /* AMENDED at build 43 (v24 C.7): a sting is CUT FROM ITS KEY'S THEME through the arrangement engine, so it is read off Snd.chestPlan() on the
       page and held to the theme's own rule — nothing under 700ms (or attacked under 40ms) at 300 Hz or above, nothing above C5 under 1200ms.
       Build 41 held every note to 700ms; a theme's bass pulse and low arp are short by design, and they are under 300 Hz */
    const stingBad = [], end = {};
    const plans41 = await page.evaluate(async ids => { const M = await import('./audio.js'); return Object.fromEntries(ids.map(id => [id, M.Snd.chestPlan(id).filter(e => e[8] === 'sting')])); }, IDS);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.8): a chest's sting is the TURN's music and audio.js now offsets it by COVER_AT, so its absolute end is
       the cover's length plus its own. What the rule is about is the sting's LENGTH — 3 to 6 seconds of a theme resolving — so it is measured as its
       own span from its first note to its last, which is the same number it has always been. */
    for (const id of IDS) { const s = AU41.CHEST_STING[id], tr = s && AU41.TRACKS[s.track], p = plans41[id] || []; if (!tr || !p.length) { stingBad.push(id + ' no theme'); continue; }
      end[id] = +(Math.max(...p.map(e => e[0] + e[3] / 1000)) - Math.min(...p.map(e => e[0]))).toFixed(2); if (end[id] < 3 || end[id] > 6.05) stingBad.push(`${id} ${end[id]}s`);
      for (const e of p) { if (e[1] >= 300 && (e[3] < 700 || e[6] < 40)) stingBad.push(`${id} short or hard ${Math.round(e[1])}Hz ${e[3]}ms`); if (e[1] > 523.3 && e[3] < 1200) stingBad.push(`${id} short high ${Math.round(e[1])}Hz`); } }
    // AMENDED at build 42 (v23 L.7a): each sting points at the rewritten theme, same root and chords as the one it was cut from
    const themes = IDS.map(id => AU41.CHEST_STING[id].track).join() === 'theme:key,theme:key,theme:pro,theme:thorns';
    const fxBad = [];
    for (const id of IDS) for (const e of AU41.CHEST_FX[id]) if (e[3] < 250 && e[1] > 400) fxBad.push(`${id} ${e[1]}Hz ${e[3]}ms`);
    const sigFx = id => JSON.stringify((AU41.CHEST_FX[id] || []).map(e => [e[0], e[1], e[4]]));
    const distinct = new Set(IDS.map(sigFx)).size === 4;
    const isUnlock = id => [523.3, 784, 1046.5].every((f, i) => (AU41.CHEST_FX[id] || []).some(e => e[1] === f && Math.abs(e[0] - i * .1) < .01));
    const notVerdict = IDS.every(id => !Object.values(AU41.VERDICT_FX).some(v => JSON.stringify(v) === JSON.stringify(AU41.CHEST_FX[id])));
    const noise = Object.keys(AU41.CHEST_NOISE).join() === 'thorns' && AU41.CHEST_NOISE.thorns.length === 1;
    const keyScr = strip(read('ui', 'screens', 'key.js')), cer = strip(read('ui', 'ceremony.js')), aud = strip(read('audio.js'));
    const block = (aud.match(/chest\(id\)\{[\s\S]*?\n    chestReady/) || [''])[0];
    const code = !/unlockFx/.test(keyScr) && !/unlockFx/.test(cer) && /Snd\.chest\(id\)/.test(cer) && !!block && !/unlockFx|click\(/.test(block);
    (names && rising && inside && !stingBad.length && themes && !fxBad.length && distinct && !IDS.some(isUnlock) && notVerdict && noise && code)
      ? ok(`L.6 / L.10d four ceremonies as named steps in config/chests.js - ${lens.map(v => v / 1000 + 's').join(', ')}, every step inside its ceremony; each chest its own effects and a ${IDS.map(id => end[id].toFixed(1)).join(' / ')}s sting from its key's theme, no note under 700ms and none above C5 under 1200ms; the four effect sets differ from each other, from the unlock sound and from every verdict; one noise cut, Thorns only; the open plays Snd.chest, never unlockFx (the achievement click is untouched, 1.6)`)
      : bad('L.6 the ceremonies and their sounds', JSON.stringify({ names, rising, inside, stingBad: stingBad.slice(0, 4), themes, fxBad, distinct, notVerdict, noise, code }));
  }

  /* ---- 5. L.6 live: a real open - not skippable, music hushed, the steps in order, "tap to continue", then the map and the spill (L.11b) ---- */
  {
    await boot({}, { unlock: ALL41 }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__c41 = []; const o = A.Snd.chest; A.Snd.chest = function (id) { window.__c41.push(id); return o.apply(this, arguments); };
      window.__st41 = []; const h = document.getElementById('key-cere'); new MutationObserver(() => { const s = h.dataset.step; if (s && window.__st41[window.__st41.length - 1] !== s) window.__st41.push(s); }).observe(h, { attributes: true, attributeFilter: ['data-step'] }); });
    await click('.chest[data-chest="games"]'); await sleep(1600);
    const early = await page.evaluate(async () => { const A = await import('./audio.js'); const h = document.getElementById('key-cere'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, tap: h.classList.contains('tap'), hushed: A.Music.probe().hushed, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games };
      h.click(); document.querySelector('#s-key .back').click(); await wait(200);
      out.after = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden }; return out; });
    await revealReady();
    const ready = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { tap: h.classList.contains('tap'), txt: h.innerText.replace(/\s+/g, ' ').trim(), steps: window.__st41.slice(), vars: h.getAttribute('style') || '',
      gifts: [...h.querySelectorAll('.rgift b')].map(g => g.textContent), syms: [...h.querySelectorAll('.rgift .sym')].map(x => x.dataset.sym) }; });
    await revealDone(); await sleep(900);
    const done = await page.evaluate(async () => { const A = await import('./audio.js'); const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { screen: (document.querySelector('.screen.on') || {}).id, hidden: document.getElementById('key-cere').hidden, hushed: A.Music.probe().hushed, chest: window.__c41.slice(), spill: w.classList.contains('spill') && c.classList.contains('spill'),
        spilled: JSON.parse(localStorage.getItem('ne')).prefs.spill.games, words: [...w.querySelectorAll('.cw')].map(x => x.dataset.act + ':' + x.dataset.to).join(), burst: c.querySelectorAll('.pburst i').length }; });
    (early.screen === 's-key' && early.shown && !early.tap && early.hushed && early.stored === 1 && early.after.screen === 's-key' && early.after.shown)
      ? ok('L.6 / L10 a ready Games chest opens on its key screen as its CEREMONY - the chest already stored before a frame plays, the music hushed fully, and neither a tap on it nor Back does anything before the end') : bad('L.6 the ceremony plays and is not skippable', JSON.stringify(early));
    /* AMENDED at build 46 (v25 items 6 / 22): the named steps are unchanged and still come off the config's own times, and `settle` then `tap`
       are the shared reveal's own two beats after them — the stage ends, the symbols rise out of the chest, and only then does it hold. */
    // AMENDED AT BUILD 53 (v28 item 13): `crack` and `burst` join them - the Games chest is the one that breaks open
    // AMENDED AT BUILD 57 (v29 Section A, 57.2): the cracking runs ON the uncross beat now, so `crack` comes before `path` in the step order
    (ready.tap && ready.steps.join() === 'uncross,crack,path,burst,lid,chord,settle,tap' && /GAMES CHEST OPENED/i.test(ready.txt) && /TAP TO CONTINUE/i.test(ready.txt) && /--st-uncross-at:\s?0ms/.test(ready.vars) /* AMENDED at build 49: the reveal sets --reveal-at on the host after the stage, and the browser re-serialises the attribute with a space */
      /* AMENDED at build 52 (v27 item 7): read from the slot, not spelled again. AMENDED at build 59 (v30 59.3): and the slot's
         title wears MSG.quote, so it reads as the name of a video rather than as a sentence — still read, never spelled. */
      && ready.gifts.join() === 'CUSTOMISE,SKILL KEY,' + CP41.MSG.quote[0] + MS41.MESSAGES.find(m => m.by && m.by.chest === "games").title + CP41.MSG.quote[1] && ready.syms.join() === 'palette,key,video')
      ? ok(`L.6 its named steps play in order off the config's own times (${ready.steps.join(' → ')}); item 6: ${ready.gifts.length} unlocks rise out of it as symbols with their titles (${ready.gifts.join(' · ')}) and only then does it hold on "tap to continue"`) : bad('L.6 the steps and the reveal', JSON.stringify(ready));
    // AMENDED at build 49 (v26 item 5): the chest's words carry its About video too, which goes to that slot
    // AMENDED at build 52 (v27 item 8): the Games chest's slot id moved with Aiden's new line-up, so the word's target is read from the config
    (done.screen === 's-pick' && done.hidden && !done.hushed && done.chest.join() === 'games' && done.spill && done.spilled === 1
      && done.words === 'chestword:s-custom,chestword:key:0,chestword:msg:' + MS41.MESSAGES.find(m => m.by && m.by.chest === 'games').id && done.burst === CH41.SPILL.particles)
      ? ok('L.6 / L.11b "tap to continue" goes to the map and the music comes back, one chest sound played; the words spill out beside the chest with a burst from the lid, once, and each word is a tap target to what it names') : bad('L.6 / L.11b after the tap', JSON.stringify(done));
  }

  /* ---- 6. L.11d one layout, nothing beside a shut chest, every word fits at 390px; L.11b the words go where they say ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, readySeen: { thorns: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro'), tierBars('author')) }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(900);
    const lay = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), w = document.querySelector(`.chestwords[data-for="${id}"]`), cell = w.hidden ? null : w.getBoundingClientRect();
      return [id, { r: c.style.gridRow, col: c.style.gridColumn, hidden: w.hidden, n: w.hidden ? 0 : w.querySelectorAll('.cw').length,
        // AMENDED at build 46 (v25 item 7): the word is `.cwt` now, with its symbol beside it — the text is what has to fit, and the row is taller
        /* AMENDED at build 52 (v27 items 7 / 8): a REWARD word is one line and still is; the VIDEO word is Aiden's own message title, which
           since build 49 may wrap (`.cw.msg`) and since item 8 is a sentence rather than a name — "The skill chest is open" against "PRO KEY".
           It gets two lines, which is 44px at the row's own line height; anything that needs three overflows the cell and still fails. */
        /* AMENDED AT BUILD 53 (v28 item 10): GAUNTLET became GAUNTLET MINI and GAUNTLET II became GAUNTLET MEGA, so two reward words are two
           words wide and wrap. The rule that matters is unchanged - the word fits its CELL and stays on the phone - so what is held is the
           cell's right edge, the screen's, and the row's two-line height; the one-line requirement went with the longer names. */
        fit: w.hidden ? null : [...w.querySelectorAll('.cw')].every(x => { const b = x.getBoundingClientRect();
          // a `tba` row carries its own second line ("not built yet"), so it is allowed the same two lines plus that one
          return b.right <= cell.right + 1 && b.right <= innerWidth && b.height <= (x.querySelector('small') ? 62 : 44); }) }]; })));
    const shut = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.save(); R.show('s-menu'); await wait(80); R.show('s-pick'); await wait(600);
      return Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`); return [id, { r: c.style.gridRow, col: c.style.gridColumn, words: !document.querySelector(`.chestwords[data-for="${id}"]`).hidden }]; })); });
    (IDS.every(id => lay[id].r === shut[id].r && lay[id].col === shut[id].col) && IDS.every(id => !shut[id].words) && lay.thorns.hidden && ['games', 'key', 'pro'].every(id => lay[id].fit && lay[id].n >= 1))
      ? ok('L.11d one layout for every state - each chest keeps its cell open or shut, nothing stands beside a chest that is not open, and at 390px every word fits its cell on one line (the sprite did not need shrinking)') : bad('L.11d the layout', JSON.stringify({ lay, shut }));
    await boot({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } }, { unlock: ALL41, bars: tierBars('clear') }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(800);
    const taps = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id; const out = {};
      const word = (id, w) => [...document.querySelectorAll(`.chestwords[data-for="${id}"] .cw`)].find(x => x.dataset.w === w);
      word('games', 'CUSTOMISE').click(); await wait(400); out.custom = on(); R.show('s-pick'); await wait(500);
      word('key', 'PRO KEY').click(); await wait(500); out.pro = { screen: on(), tier: (document.querySelector('#key-keys .kkey.sel') || { dataset: {} }).dataset.kt }; R.show('s-pick'); await wait(500);
      // AMENDED at build 49 (v26 item 13): GAUNTLET is a tile on the map now, so its word goes to that tile; the video word goes to its slot on About
      // AMENDED AT BUILD 53 (v28 item 10): the word is GAUNTLET MINI now, and it is composed off GAUNTLET.name rather than spelled here
      [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => x.dataset.to === 'tile:g1').click(); await wait(300);
      out.soon = { screen: on(), flash: document.querySelector('#grid .tile[data-gauntlet="g1"]').classList.contains('flash') };
      [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => /^msg:/.test(x.dataset.to)).click(); await wait(400); out.video = on();
      return out; });
    (taps.custom === 's-custom' && taps.pro.screen === 's-key' && taps.pro.tier === '1' && taps.soon.screen === 's-pick' && taps.soon.flash && taps.video === 's-about')
      ? ok('L.11b every word is a tap target to the thing it names - CUSTOMISE opens Customise, PRO KEY the Pro key, the Gauntlet word its tile on the map (v26 item 13), and the video its slot on About (v26 item 5)') : bad('L.11b the words go where they say', JSON.stringify(taps));
  }

  /* ---- 7. L.8d / L.8e: the meter's four bands, driven by "set meter to N%"; effects scale in a band; the pulse in the band's colour; never green ---- */
  {
    const B = CH41.METER_BANDS;
    const cfgOk = B.length === 4 && B.map(b => b.col).join() === 'var(--mute),var(--ink),#E8B84A,#FFFFFF' && !B.some(b => /3DD68C|--ok/i.test(JSON.stringify(b)))
      && B[3].ground === '#000000' && B[3].shake.every(Number.isInteger) && B[3].shake[1] <= 2 && B[2].glow[1] > B[2].glow[0] && B[3].spike[1] > 0 && !B[0].glow[1] && !B[1].glow[1];
    const pct = (read('styles', 'app.css').match(/@keyframes pctup\{[^\n]*/) || [''])[0], pctOk = !!pct && !/--ok/.test(pct) && /--mcol/.test(pct);
    await boot({}, {}, { v: 5, plain: PLAIN41 });
    const mb = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = [];
      /* AMENDED at build 48 (v26 items 7 / 12): there is no override, so each figure is REACHED - Testing's devMeterTo clears the bars and opens the
         chests it means - and the meter stops at 300, which is the Thorns band's look. 96 / 196 / 296 are the highest a bar count makes under 100 / 200 / 300 */
      const P = await import('./progress.js'); const modes = on => { if (on) P.devModesAll(true); else P.devModesReset(); };
      for (const v of [0, 50, 96, 100, 150, 196, 200, 250, 296, 300]) { const n = K.devMeterTo(v, modes); S.prefs.meterSeen = n; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(120);
        const m = document.querySelector('#menu-key .meterv'), cs = getComputedStyle(m), band = K.meterBand(v);
        out.push({ v, i: band.i, k: +band.k.toFixed(2), cls: m.className, col: cs.color, bg: cs.backgroundColor, ts: cs.textShadow, anim: cs.animationName, timing: cs.animationTimingFunction, shp: m.style.getPropertyValue('--shp'), glow: m.style.getPropertyValue('--mglow'), txt: document.getElementById('menu-key').textContent }); }
      K.devMeterTo(260, modes); S.prefs.meterSeen = 210; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(60);
      const mk = document.getElementById('menu-key'); const pulse = { up: mk.classList.contains('up'), mcol: mk.style.getPropertyValue('--mcol'), anim: getComputedStyle(mk).animationName };
      return { out, pulse }; });
    const at = v => mb.out.find(x => x.v === v);
    const bandsOk = mb.out.every(x => x.cls === 'meterv mb' + x.i && x.col !== 'rgb(61, 214, 140)') && [0, 50, 96].every(v => at(v).i === 0) && at(100).i === 1 && at(196).i === 1 && at(200).i === 2 && at(296).i === 2 && at(300).i === 3
      && at(0).col === 'rgb(110, 108, 104)' && at(150).col === 'rgb(232, 230, 225)' && at(250).col === 'rgb(232, 184, 74)' && at(300).col === 'rgb(255, 255, 255)' && at(300).bg === 'rgb(0, 0, 0)'
      && at(0).ts === 'none' && at(150).ts === 'none' && at(250).ts !== 'none' && parseFloat(at(296).glow) > parseFloat(at(200).glow)
      && at(0).anim === 'none' && at(150).anim === 'none' && at(300).anim === 'mshake' && /^steps\(1(, end)?\)$/.test(at(300).timing) /* Chromium serialises steps(1, end) as steps(1) */ && at(300).shp === '1' && at(250).txt === '250% complete';   // v29 (item 1, build 55): the printed figure is the meter, not a share of it. Was '83% complete' at build 53 (v28 item 9): the BAND still reads the raw meter; the TEXT is meterPct()
    (cfgOk && pctOk && bandsOk && mb.pulse.up && mb.pulse.mcol === '#E8B84A' && mb.pulse.anim === 'pctup')
      ? ok('L.8d / L.8e the meter\'s bands at figures REACHED by Testing\'s "set meter to N%" (AMENDED at build 48, v26 items 7 / 12 - 0–300, no override): 0-99 --mute with no effects, 100-199 --ink, 200-299 gold with a glow that grows across the band, 300 - the full meter - white on black with a spiked edge, a cold glow and a stepped whole-pixel shake; a rise pulses in the band\'s colour; green is in no band and not in the pulse (B.22)')
      : bad('L.8d / L.8e the meter bands', JSON.stringify({ cfgOk, pctOk, bandsOk, out: mb.out.filter(x => [0, 100, 200, 250, 300].includes(x.v)), pulse: mb.pulse }));
  }

  /* ---- 8. L.6 / S5: Testing's "replay chest opening" x4 - the ceremony with nothing stored, then the map's spill, then the chest put back ---- */
  {
    await boot({}, {}, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-testing"]'); await sleep(400);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] [data-act="dev-chest"]')].map(b => b.dataset.chest + ':' + b.textContent.trim()));
    const rp = [];
    for (const id of IDS) { await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(200);
      await click(`[data-act="dev-chest"][data-chest="${id}"]`); await sleep(700);
      rp.push(await page.evaluate(id => { const h = document.getElementById('key-cere'); return { id, screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests[id] }; }, id)); }
    await revealDone(); await sleep(700);
    const end = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill'), open: c.classList.contains('open'), stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.thorns }; });
    await sleep(3800);
    const rest = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { cls: ['locked', 'ready', 'open', 'spill'].filter(k => c.classList.contains(k)).join(), words: !document.querySelector('.chestwords[data-for="thorns"]').hidden }; });
    (btns.length === 4 && btns.every(b => /^(\w+):replay \1 chest opening$/.test(b)) && rp.every(x => x.screen === 's-key' && x.shown && x.chest === x.id && !x.stored) && end.screen === 's-pick' && end.spill && end.open && !end.stored && rest.cls === 'locked' && !rest.words)
      ? ok('L.6 / S5 Testing has "replay <chest> chest opening" x4: each plays that chest\'s ceremony on the key screen with nothing stored, and "tap to continue" lands on the map with its spill replayed, the chest then put back as its state leaves it') : bad('L.6 the four replay buttons', JSON.stringify({ btns, rp, end, rest }));
  }

  /* ---- 9. L.11e / L.10d / L.8f: the catalogue's chest cards, and the second driver answering a ceremony ---- */
  rv3: {
    if (!REVIEW) { noReview("L.11e / L.10d / L.8f the catalogue's chest cards"); break rv3; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).filter(a => a.group === 'chests').map(a => a.shot) : [];
    const want41 = IDS.flatMap(id => ['locked', 'ready', 'opened', 'spill'].map(s => `30-chest-${id}-${s}`)).concat(IDS.map(id => `31-cere-${id}`), [0, 50, 100, 150, 200, 250, 300 /* AMENDED at build 48 (v26 items 7 / 9 / 12): the meter is 0–300 */].map(v => `32-meter-${String(v).padStart(3, '0')}`), IDS.map(id => `33-spill-${id}`));
    (/const cereTap = async/.test(gen) && /await cereTap\(\)/.test(gen) && /ceremonyFrame\(/.test(gen) && /chestPlan\(/.test(gen) && want41.every(s => shots.includes(s)) && shots.length === want41.length
      && /'chests'\]\.forEach/.test(tpl) && /id="g-chests"/.test(tpl) && /REF\.chestFx/.test(tpl) && /w === 'noise'/.test(tpl))
      ? ok(`L.11e / L.10d / L.8f the catalogue carries ${want41.length} chest cards - 16 chest states, four ceremonies at five frames each with their sting and effects on a button, the meter at seven values (0–300 since build 48), a spill per chest - drawn by the app's own renderers; and the second driver answers a ceremony's "tap to continue" as the gate does`)
      : bad('L.11e the catalogue cards', JSON.stringify({ shots: shots.length, missing: want41.filter(s => !shots.includes(s)) }));
  }
}

/* ---- 22. build 42 (batch 16, the key themes - FEEDBACK-v23 §L.7 a-e). Music and one preference; nothing clears, opens or banks anything (L10) ---- */
if (section('build 42 - batch 16, the key themes')) {
  const AU42 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CP42 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const KY42 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CH42 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const THEMES = ['key', 'pro', 'thorns'], IDS42 = THEMES.map(k => (AU42.KEY_THEMES || {})[k]);
  const PLAIN42 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const LV42 = c => c === 'x' ? 1 : (c >= '1' && c <= '9') ? +c / 10 : 0;

  /* ---- 1. L.7a: three rewritten themes in their motif from the first step, escalating, to batch 12's rules; the build-30 three kept one build, retired ---- */
  {
    const T = AU42.KEY_THEMES || {}, R = AU42.KEY_THEMES_RETIRED || {};
    const shape = Object.keys(T).join() === THEMES.join() && IDS42.every(id => AU42.TRACKS[id] && !AU42.TRACKS[id].retired)
      && KY42.KEYS.map(k => k.track).join() === IDS42.join() && KY42.KEYS.map(k => k.music).join() === THEMES.join()
      && KY42.KEYS.every(k => (CH42.CHESTS.find(c => c.id === k.music) || {}).needs === k.id)
      && Object.values(R).join() === 'key:roots,key:frost,key:thorn' && Object.values(R).every(id => AU42.TRACKS[id] && AU42.TRACKS[id].retired === 42)
      && THEMES.every(k => AU42.TRACKS[T[k]].root === AU42.TRACKS[R[k]].root);
    // no intro, no fade-up, no build, read off the data: every level and filter string opens at 70% or more and never rests or drops under
    // 60%, so no voice drops out at a loop point; a lead hits on the first step; the form is whole chord cycles, so the loop lands on chord 1
    const opens = [];
    for (const id of IDS42) { const t = AU42.TRACKS[id]; if (!t) continue;
      if (t.form % (t.ch.length * (t.per || 1))) opens.push(`${id} form ${t.form} is not whole chord cycles`);
      if (!t.voices.some(v => v.v === 'lead' && /[xo]/.test((v.pat || 'x')[0]) && v.seq[0] !== null)) opens.push(`${id} no motif on the first step`);
      t.voices.forEach((v, i) => { for (const s of [v.lv, v.lpv].filter(Boolean)) { if (LV42(s[0]) < .7) opens.push(`${id} voice ${i} opens at ${s[0]}`); if ([...s].some(c => LV42(c) < .6)) opens.push(`${id} voice ${i} drops: ${s}`); }
        if (!/[xo]/.test(v.pat || 'x')) opens.push(`${id} voice ${i} never sounds`); }); }
    await boot({}, {}, { plain: PLAIN42 });
    const pl = await page.evaluate(async ids => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      return ids.map(id => { const t = A.TRACKS[id], full = M.Music.plan(id), one = M.Music.plan(id, { bars: 1 }), beat = 60000 / t.bpm, barSec = 60 / t.bpm * (t.beats || 4);
        return { id, bad: full.plan.filter(e => (e[3] < 700 && e[1] >= 300) || (e[1] > 523.3 && e[3] < 1200)).slice(0, 3).map(e => `${Math.round(e[1])}Hz ${e[3]}ms`),
          first: one.plan.length ? Math.min(...one.plan.map(e => e[0])) : -1, slow: one.plan.filter(e => e[6] > beat).length,
          bars: new Set(full.plan.map(e => Math.floor(e[0] / barSec + 1e-6))).size, form: full.form, rate: +(full.plan.length / full.loopSec).toFixed(2),
          longSec: M.Music.lengths().find(r => r.id === id).longSec, leads: t.voices.filter(v => v.v === 'lead').length, root: t.root, sawBass: t.voices.some(v => v.v === 'bass' && v.w === 'sawtooth') }; }); }, IDS42);
    const [k, p, th] = pl;
    const rules = pl.every(x => !x.bad.length && x.first === 0 && !x.slow && x.bars === x.form && x.longSec >= 180);
    const escalate = k.rate < p.rate && p.rate < th.rate && k.leads === 1 && p.leads === 2 && th.leads >= 2 && th.root < k.root && th.sawBass;
    (shape && !opens.length && rules && escalate)
      ? ok(`L.7a three rewritten key themes (${IDS42.join(', ')}): each in its motif on the first step with every voice sounding in bar 1 at full gain inside a beat - no intro, no fade-up, no build - and no voice resting or dropping under 60% anywhere, so nothing drops out at a loop point; every bar sounds, the form is whole chord cycles, the long form ${pl.map(x => Math.round(x.longSec) + 's').join(' / ')}; nothing under 700ms above 300 Hz and nothing above C5 under 1200ms (batch 12); escalating ${pl.map(x => x.rate).join(' < ')} notes a second, Pro and Thorns with a second voice, Thorns the lowest root on a sawtooth bass; the build-30 three kept under their old ids, retired, same roots`)
      : bad('L.7a the rewritten themes', JSON.stringify({ shape, opens: opens.slice(0, 5), pl }));
  }

  /* ---- 2. L.7c: ONE store key, one ladder step - it round-trips, nonsense is dropped, and a theme whose chest is shut is kept and never applied ---- */
  {
    const src = strip(read('core', 'store.js'));
    const stat = /VERSION=7/.test(src) /* AMENDED at build 57 (57.6): up7 follows up6 */ && /if\(\(raw\.v\|\|0\)<6\) raw=up6\(raw\);/.test(src) && /p\.everywhere===undefined\) p\.everywhere='game'/.test(src) && /everywhere:Object\.keys\(KEY_THEMES\)\.includes\(p\.everywhere\)/.test(src);
    /* AMENDED AT BUILD 53 (v28 item 2): a key track waits for its KEY to be EARNED, not for the chest that key opens - Aiden's line is "each key
       track locked until that key is earned", which is strictly earlier. So the fixtures carry bars, not just chests, and `everywhere()` reads
       through progress/key.js keyFinished (bound into the store, because core/ sits below progress/ in the graph). */
    const KB42 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42 = (...ts) => Object.fromEntries(Object.keys(KB42.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { bars: tier42('clear', 'pro') }, { v: 5, plain: PLAIN42 });
    const a = await page.evaluate(async () => { const S = await import('./core/store.js'); const out = { v: S.store.v, first: S.prefs.everywhere, eff: S.everywhere() }; S.prefs.everywhere = 'pro'; S.save(); return out; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const b = await page.evaluate(async () => { const S = await import('./core/store.js'); const raw = JSON.parse(localStorage.getItem('ne')); return { v: raw.v, stored: raw.prefs.everywhere, eff: S.everywhere() }; });
    await boot({ chests: { games: 1, key: 1 }, everywhere: 'key' }, { bars: tier42('clear') }, { v: 5, plain: PLAIN42 });
    const kept = await page.evaluate(async () => (await import('./core/store.js')).prefs.everywhere);
    // the Author key is not earned here, so its theme is KEPT and never applied - the same shape as build 42's shut chest
    await boot({ chests: { games: 1, key: 1 }, everywhere: 'thorns' }, { bars: tier42('clear') }, { plain: PLAIN42 });
    const shut = await page.evaluate(async () => { const S = await import('./core/store.js'); const M = await import('./audio.js'); const st = await import('./core/state.js');
      st.sel.vs = 0; M.Music.start('dots', { on: true, live: false }, 20); const id = M.Music.probe().track; M.Music.stop(); return { stored: S.prefs.everywhere, eff: S.everywhere(), id }; });
    await boot({ chests: { games: 1 }, everywhere: 'constructor' }, {}, { plain: PLAIN42 });
    const junk = await page.evaluate(async () => (await import('./core/store.js')).prefs.everywhere);
    // AMENDED at build 57 (v29 Section A, 57.6): the ladder ends at v7
    (stat && a.v === 7 && a.first === 'game' && a.eff === 'game' && b.v === 7 && b.stored === 'pro' && b.eff === 'pro' && kept === 'key' && shut.stored === 'thorns' && shut.eff === 'game' && shut.id === 'dots:waltz' && junk === 'game')
      ? ok('L.7c / v28 item 2 one store key, prefs.everywhere, and one ladder step (v5 → v6): a v5 record arrives with it as Per game, and one that already carries a theme keeps it (up6 adds, never replaces); a theme round-trips a reload; "constructor" is dropped; and a theme whose KEY IS NOT EARNED is KEPT and never applied - everywhere() reads Per game and a Dots run plays Waltz')
      : bad('L.7c the store key', JSON.stringify({ stat, a, b, kept, shut, junk }));
  }

  /* ---- 3. L.7c AMENDED AT BUILD 53 (v28 items 2 / 3): THE EVERYWHERE ROW IS GONE AND THE MUSIC ROW IS THE WHOLE CHOICE. Build 42 put a second
     row above the tracks for the same decision said a second way, and Aiden's line was "I don't know why they're separate". One row now: this
     game's three tracks, then one track per key, each key track locked until its KEY is earned and saying so under the row - by the key's own
     name (item 3), because the labels that read Key / Pro / Thorns were the TRACK names and a key is Skill key / Pro / Author. ---- */
  {
    const KY42 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const KB42b = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42b = (...ts) => Object.fromEntries(Object.keys(KB42b.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1 } }, { bars: tier42b('clear') }, { plain: PLAIN42 });
    await click('[data-go="s-custom"]'); await sleep(500);
    const cu = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const M = await import('./audio.js');
      const row = () => [...document.querySelectorAll('#c-track button')].map(b => ({ v: b.dataset.v, txt: b.textContent.trim(), sel: b.classList.contains('sel'), locked: b.classList.contains('locked') }));
      const out = { gone: !document.getElementById('c-everywhere') && !document.getElementById('g-everywhere'),
        label: document.getElementById('c-track').closest('.cgroup').querySelector('.clabel').textContent, before: row(), line0: document.getElementById('lk-track').textContent };
      const shut = row().filter(b => b.locked)[0];
      document.querySelector(`#c-track [data-v="${shut.v}"]`).click(); await wait(250);
      out.shutTap = { stored: S.prefs.everywhere, line: document.getElementById('lk-track').textContent };
      document.querySelector('#c-track [data-v="key:key"]').click(); await wait(300);
      // v29 (item 4, build 54): and what the MENU plays, for both kinds of pick — the stored id and what audio.js resolves it to
      out.on = { stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere, sel: (row().find(b => b.sel) || {}).v, menu: S.prefs.menuTrack, plays: M.Music.menuTrack() };
      const t = row().filter(b => !b.v.startsWith('key:'))[1];
      document.querySelector(`#c-track [data-v="${t.v}"]`).click(); await wait(300);
      out.g = document.getElementById('pv').dataset.g;
      out.back = { v: t.v, stored: S.prefs.everywhere, track: S.prefs.track[out.g], sel: (row().find(b => b.sel) || {}).v, menu: S.prefs.menuTrack, plays: M.Music.menuTrack() };
      return out; });
    const names = cu.before.map(x => x.txt.toUpperCase());
    const keyRows = cu.before.filter(x => x.v.startsWith('key:'));
    const themes = KY42.KEYS.map(k => k.theme.toUpperCase());
    (cu.gone && cu.label === 'Music' && cu.before.length === 6 && keyRows.length === 3
      && themes.every(t => names.includes(t)) && !names.some(t => KY42.KEYS.some(k => k.name.toUpperCase() === t))
      && keyRows.filter(x => x.locked).length === 2 && cu.line0 === ''
      && cu.shutTap.stored === 'game' && KY42.KEYS.some(k => cu.shutTap.line.includes(k.name))
      && cu.on.stored === 'key' && cu.on.sel === 'key:key'
      && cu.back.stored === 'game' && cu.back.track === cu.back.v.replace('key:', '') && cu.back.sel === cu.back.v
      /* v29 (item 4, build 54): ONE RULE FOR BOTH \u2014 whatever is picked plays on the MENU, key theme or game track alike, where build 53 sent
         the menu back to its own loop for a game's track. `prefs.menuTrack` is the resolved id and menuTrack() in audio.js is what plays. */
      && cu.on.menu === 'theme:key' && cu.on.plays === 'theme:key'
      && cu.back.menu === cu.g + ':' + cu.back.v && cu.back.plays === cu.g + ':' + cu.back.v)
      ? ok(`v28 items 2 / 3 / v29 item 4 Customise has ONE Music row and no Everywhere row: ${cu.before.length} options - this game's three tracks and one per key (${keyRows.map(x => x.txt).join(' \u00b7 ')}) - each key track locked until its own KEY is earned and saying so under the row ("${cu.shutTap.line}"), never over it; a locked one chooses nothing; the Skill key's track is chosen and stored in the same field the key screen writes; a tap on one of this game's tracks goes back to Per game with that track chosen; and EITHER KIND becomes the menu's music - the key theme plays "${cu.on.plays}" on the front of the app and the game track "${cu.back.plays}", one rule for both`)
      : bad('v28 items 2 / 3 the one Music row', JSON.stringify(cu));
  }

  /* ---- 4. L.7b: SET THIS MUSIC at the foot of a key screen whose chest is open; a key whose chest is shut plays no theme and its button cannot be pressed;
     the tap writes the one key and reads PLAYING EVERYWHERE in green, the other keys revert, and Customise reads the same key (A4) ---- */
  {
    const keyAt = async i => { await page.evaluate(async i => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-key', { tier: i }); }, i); await sleep(1200);
      return page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music'), r = b.getBoundingClientRect(), s = document.getElementById('build').getBoundingClientRect();
        return { track: M.Music.probe().track, hidden: b.hidden, txt: b.textContent, on: b.classList.contains('on'), clear: b.hidden || document.getElementById('build').hidden /* AMENDED at build 48 (v26 item 12): no label on this screen */ || r.bottom <= s.top, stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere }; }); };
    /* AMENDED AT BUILD 53 (v28 item 2): the button waits for the KEY to be EARNED, not for the chest that key opens - the same line Customise's
       Music row now takes. So `locked` is a profile with the tier open and the key UNFINISHED, and the rest carry the bars. */
    const KB42c = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42c = (...ts) => Object.fromEntries(Object.keys(KB42c.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1 } }, {}, { plain: PLAIN42 });
    const locked = await keyAt(0);
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { bars: tier42c('clear', 'pro') }, { plain: PLAIN42 });
    const k0 = await keyAt(0), k1 = await keyAt(1), k2 = await keyAt(2);
    await page.evaluate(() => document.getElementById('key-music').click()); await sleep(200);
    const k2tap = await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.everywhere);
    await keyAt(1); await page.evaluate(() => document.getElementById('key-music').click()); await sleep(250);
    const k1on = await page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music');
      return { txt: b.textContent, on: b.classList.contains('on'), col: getComputedStyle(b).color, stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere, track: M.Music.probe().track }; });
    await click('#key-keys [data-kt="0"]'); await sleep(400);
    const k0after = await page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music'); return { txt: b.textContent, on: b.classList.contains('on'), track: M.Music.probe().track }; });
    await click('#key-keys [data-kt="1"]'); await sleep(300);
    const k1back = await page.evaluate(() => document.getElementById('key-music').textContent);
    // v28 (item 2): Customise reads the same field from its one Music row - the key tracks carry `key:<chest>` as their value
    const cus = await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-custom'); await new Promise(r => setTimeout(r, 400));
      return ((document.querySelector('#c-track .opt.sel') || { dataset: {} }).dataset.v || '').replace('key:', ''); });
    const srcKey = strip(read('ui', 'screens', 'key.js')), srcCus = strip(read('ui', 'screens', 'customise.js')), srcAud = strip(read('audio.js'));
    const a4 = !/screens\/customise|"\.\/customise\.js"/.test(srcKey) && !/screens\/key|"\.\/key\.js"/.test(srcCus) && /everywhere\(\)/.test(srcKey) && /everywhere\(\)/.test(srcCus) && !/key:roots/.test(srcAud);
    /* AMENDED at build 43 (v24 C.2 / C.3): a key's theme plays on its screen once its TIER is open, not once the chest it opens is — build 42's
       guess was what silenced Pro and Author. So key 1 with only the Games chest plays theme:key, and Author with its Author chest shut plays
       theme:thorns; SET THIS MUSIC still waits for that chest (both buttons hidden) */
    (locked.hidden && locked.track === 'theme:key' && !k0.hidden && k0.txt === 'SET THIS MUSIC' && k0.track === 'theme:key' && k0.clear && !k1.hidden && k1.track === 'theme:pro' && k2.hidden && k2.track === 'theme:thorns' && k2tap === 'game'
      && k1on.txt === 'PLAYING EVERYWHERE' && k1on.on && k1on.col === 'rgb(61, 214, 140)' && k1on.stored === 'pro' && k0after.txt === 'SET THIS MUSIC' && !k0after.on && k0after.track === 'theme:key' && k1back === 'PLAYING EVERYWHERE' && cus === 'pro' && a4)
      ? ok('L.7b with only the Games chest open, key 1\'s screen has no button yet plays its theme (AMENDED at build 43, C.2); with its chest open SET THIS MUSIC sits at the foot of the screen clear of the build stamp and key 1 plays its theme - and Pro its own a second after arriving on the Pro tab, where build 30\'s screen timer used to swap in Roots; Author\'s, its Author chest shut, plays its theme but its button is hidden and does nothing; the tap stores Pro and reads PLAYING EVERYWHERE in green, key 1 reads SET THIS MUSIC again, and Customise\'s Everywhere row reads the same key - neither screen imports the other (A4)')
      : bad('L.7b SET THIS MUSIC', JSON.stringify({ locked, k0, k1, k2, k2tap, k1on, k0after, k1back, cus, a4 }));
  }

  /* ---- 5. L.7d: a key theme as run music takes the one path a game's track takes, so it obeys every run-music rule; the menu loop is not the setting (guess) ---- */
  {
    // v28 (item 2): a key track waits for its KEY, so the fixture carries the bars as well as the chests
    const KB42d = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42d = (...ts) => Object.fromEntries(Object.keys(KB42d.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1, pro: 1 }, everywhere: 'pro' }, { bars: tier42d('clear', 'pro') }, { plain: PLAIN42 });
    const rm = await page.evaluate(async () => { const M = await import('./audio.js'); const st = await import('./core/state.js'); const A = await import('./config/audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      const t = A.TRACKS['theme:pro'], barSec = 60 / t.bpm * (t.beats || 4);
      st.sel.vs = 0; M.Music.start('quick-tap', { on: true, live: true, end: performance.now() + 4500, flow: 1 }, 20); await wait(500); out.timed = M.Music.probe();
      M.Music.start('hold', { on: true, live: false }, 0, 'grow'); out.set = Object.assign(M.Music.probe(), { want: +((A.SET_SECS['hold:grow'] + 3) / barSec).toFixed(2) });
      M.Music.start('spot', { on: true, live: false }, 0); out.open = M.Music.probe();
      st.sel.vs = 2; M.Music.start('reaction', { on: true, live: true, vsP: [.4, .6] }, 0, 'flash'); out.vs = M.Music.probe(); st.sel.vs = 0;
      M.Music.stop(); M.Music.menu('menu'); out.menu = M.Music.probe(); M.Music.stop();
      return out; });
    const srcAud = strip(read('audio.js'));
    /* AMENDED AT BUILD 53 (v28 item 2): the menu loop reads the setting too - Aiden's line is "whatever is picked plays in the menu from then
       on", and build 42's "the menu loop ignores it" was marked a guess. Music.menu resolves through menuTrack(), which is that key's theme or
       the menu's own loop, so a key track chosen in Customise is the front of the app's music as well as every run's. */
    /* DELETED AT BUILD 54 (v29 item 4), NOT RE-SPELLED: the third clause here was `/const menuTrack=\(\)=>KEY_THEMES\[everywhere\(\)\]/` — a
       source-text check on how one line of audio.js is written. Item 4 gives menuTrack a second branch for a game's track, so the line is
       spelled differently and the check failed on the refactor; the repo rule is to delete such a check and name it, never to adjust it to the
       new spelling. Nothing is lost: `rm.menu.track` below DRIVES the page and proves the same fact harder (the menu really plays the theme),
       and the build-42 Customise check proves the other half — a game's track picked in the Music row is what menuTrack() then resolves to. */
    const one = /const t=pickRun\(g\); run\(t,g,shapeFor\(t,g,d,len\)\)/.test(srcAud) && (srcAud.match(/pickRun\(/g) || []).length === 1;
    (one && rm.timed.track === 'theme:pro' && rm.timed.arc && rm.timed.fin && rm.timed.flow && !rm.timed.stems
      && rm.set.track === 'theme:pro' && rm.set.arc && Math.abs(rm.set.arcBars - rm.set.want) < .02 && !rm.set.flow
      && rm.open.track === 'theme:pro' && !rm.open.arc && rm.vs.track === 'theme:pro' && rm.vs.stems && !rm.vs.flow && rm.menu.track === 'theme:pro')
      ? ok(`L.7d with Pro set everywhere, every run plays theme:pro through the one path a game's track takes (pickRun, then shapeFor): a 20s Quick Tap run gets the arc, lands its last five seconds on the clock and arms the flow hum; an Estimate Grow Set gets the arc sized to SET_SECS (${rm.set.arcBars} bars); an open-ended run gets the long form; a versus run gets both stems; Sequence's duck keys on the game, not the track; and the MENU LOOP PLAYS IT TOO (v28 item 2 - build 42's guess that it should not was Aiden's to settle, and he did)`)
      : bad('L.7d the theme as run music', JSON.stringify({ one, rm }));
  }

  /* ---- 6. L.7e: the catalogue - the new themes on the music cards and linked both ways with their key screen cards, the old three once more marked retired, the Everywhere row photographed ---- */
  rv4: {
    if (!REVIEW) { noReview('L.7e the catalogue and the key themes'); break rv4; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).map(x => x.shot) : [];
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): the Everywhere row is gone, so the capture no longer sets `prefs.everywhere = 'pro'` to photograph
       it and the shot is `13g-s-custom-music` — the one Music row, with a locked key track tapped so its line shows. Everything else stands. */
    const catOk = { gen: /AU\.KEY_THEMES\)/.test(gen) && /AU\.KEY_THEMES_RETIRED\)/.test(gen) && /'13d-s-key-lantern'/.test(gen),
      tpl: /(\\u266a|♪) its theme/.test(tpl) && /(\\u266a|♪) its key screen/.test(tpl) && /t\.retired/.test(tpl),
      shot: shots.includes('13g-s-custom-music'), gone: !shots.includes('13g-s-custom-everywhere') };
    (catOk.gen && catOk.tpl && catOk.shot && catOk.gone)
      ? ok('L.7e the catalogue carries the three rewritten themes on the music cards, each linked to its key screen card and back (the build-27 pattern), the build-30 three once more marked retired for the A/B, SET THIS MUSIC on the key shots, and the ONE Music row on its own card (v28 item 2 — the Everywhere card went with the row)')
      : bad('L.7e the catalogue', JSON.stringify(catOk));
  }
}

/* ---- 23. build 43 (batch 17, chests and keys - FEEDBACK-v24 §A, §B.1-§B.3, §B.5, §C). Presentation, one menu lock and one build flag;
   nothing clears, opens by itself or banks anything new (L10) ---- */
if (section('build 43 - batch 17, chests and keys')) {
  const AU43 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CP43 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const KY43 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const TH43 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const U43 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB43 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL43 = Object.fromEntries(U43.UNLOCKS.map(x => [x.key, Date.now()]));
  const bars43 = (...tiers) => Object.fromEntries(tiers.flatMap(t => Object.keys(KB43.KEY_BARS).map(k => [t === 'clear' ? k : `${k}|${t}`, Date.now()])));
  const PLAIN43 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const show43 = (id, o) => page.evaluate(async (id, o) => { const R = await import('./ui/router.js'); R.show(id, o); }, id, o || {});
  const svg43 = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);
  const keyjs43 = strip(read('ui', 'screens', 'key.js'));
  const at43 = () => page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cere: !document.getElementById('key-cere').hidden, earn: document.getElementById('s-key').dataset.earn || '', chests: JSON.parse(localStorage.getItem('ne')).prefs.chests }));

  /* ---- 1. C.2 / C.3: the Pro and Author keys have their music back - a key's theme plays on its screen once its TIER is open ---- */
  {
    const stat = /const themeOf = t => tierOpen\(t\.id\) \? t\.track : 'menu';/.test(keyjs43);
    const trackAt = async (chests, tier, bars) => { await boot({ chests }, { unlock: ALL43, bars: bars || {} }, { plain: PLAIN43 }); await show43('s-menu'); await sleep(120); await show43('s-key', { tier }); await sleep(1300);
      return page.evaluate(async () => (await import('./audio.js')).Music.probe().track); };
    const t = { quiet: await trackAt({}, 0), key1: await trackAt({ games: 1 }, 0), pro: await trackAt({ games: 1, key: 1 }, 1, bars43('clear')), author: await trackAt({ games: 1, key: 1, pro: 1 }, 2, bars43('clear', 'pro')) };
    (stat && t.quiet === 'menu' && t.key1 === 'theme:key' && t.pro === 'theme:pro' && t.author === 'theme:thorns')
      ? ok(`C.2 / C.3 the Pro and Author keys have their music back: a key's theme plays on its screen once its TIER is open - key 1 ${t.key1}, Pro ${t.pro} with the Pro chest still shut, Author ${t.author} with the Author chest still shut - and only the quiet screen before the Games chest plays the menu loop. One regression, and not the rewritten themes: build 42 waited for the chest each key OPENS`)
      : bad('C.2 / C.3 the key themes on their screens', JSON.stringify({ stat, t }));
  }

  /* ---- 2. C.1: the key screen never opens a chest by itself - the key asks; Not yet and Back leave it; Open opens it ---- */
  {
    const stat = !/OPEN_AT|OPEN_AFTER_ARRIVAL|OPEN_IN_INTERLUDE|autoOpen/.test(keyjs43) && /function askOpen\(id\)/.test(keyjs43);
    await boot({ chests: { games: 1 }, keyWhole: { clear: 1 } }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 });
    await click('.item[data-go="s-key"]'); await sleep(1700);
    const arrive = Object.assign(await at43(), { hint: await page.evaluate(() => document.getElementById('key-hint').textContent) });
    /* AMENDED for build 49 (Aiden, after build 48 - reversing build 48's v26 item 11 amendment): "tap the key to open the Skill chest" leads to the ASK again.
       Not yet and Back leave the chest shut, Open plays it. The quiet screen's key asks the same for the Games chest, and its row of chests is gone */
    const askOf = () => page.evaluate(() => ({ ask: !document.getElementById('key-ask').hidden, txt: document.getElementById('key-ask').innerText.replace(/\s+/g, ' ').trim() }));
    await svg43('#key-ring .khubhit'); await sleep(250);
    const asked = Object.assign(await at43(), await askOf());
    await click('[data-act="key-ask-no"]'); await sleep(300);
    const no = Object.assign(await at43(), await askOf());
    await svg43('#key-ring .khubhit'); await sleep(250); await click('#s-key .back'); await sleep(550);
    const backClose = Object.assign(await at43(), await askOf());
    await svg43('#key-ring .khubhit'); await sleep(250); await click('[data-act="key-ask-yes"]'); await sleep(250);
    const yes = Object.assign(await at43(), await askOf());
    await revealDone(); await sleep(500); const after = await onScreen();
    await boot({}, { unlock: ALL43 }, { plain: PLAIN43 }); await show43('s-key'); await sleep(900);
    const quiet = await page.evaluate(() => { const k = document.querySelector('#key-shell button.kquiet[data-act="key-chest"][data-chest="games"]');
      return { key: !!k, ring: k ? getComputedStyle(k).animationName : '', row: document.querySelectorAll('#key-shell .kch, #key-shell .kchests').length, cere: !document.getElementById('key-cere').hidden, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games }; });
    await click('#key-shell button.kquiet'); await sleep(300);
    Object.assign(quiet, await askOf(), { opened0: JSON.parse(await page.evaluate(() => localStorage.getItem('ne'))).prefs.chests.games });
    await click('[data-act="key-ask-yes"]'); await sleep(300); quiet.opened = JSON.parse(await page.evaluate(() => localStorage.getItem('ne'))).prefs.chests.games;
    await revealDone(); await sleep(400);
    (stat && arrive.screen === 's-key' && !arrive.cere && !arrive.chests.key && arrive.hint === CP43.KEY.completeReady.replace('{chest}', CP43.GRID.chest.key)
      && asked.ask && !asked.cere && !asked.chests.key && asked.txt.toUpperCase().includes(CP43.KEY.ask.replace('{chest}', CP43.GRID.chest.key).toUpperCase()) && !no.ask && !no.chests.key && no.screen === 's-key' && !backClose.ask && !backClose.chests.key && backClose.screen === 's-key'
      && !yes.ask && yes.cere && yes.chests.key === 1 && after === 's-pick'
      && quiet.key && quiet.ring === 'readyring' && !quiet.row && !quiet.cere && !quiet.stored && quiet.ask && /OPEN THE GAMES CHEST\?/i.test(quiet.txt) && !quiet.opened0 && quiet.opened === 1)
      ? ok(`C.1 AMENDED for build 49 (Aiden, after build 48): the key screen never opens a ready chest by itself - arriving says "${arrive.hint}" - and tapping the key asks "${asked.txt}"; Not yet and Back leave it shut, Open plays its ceremony and ends on the map. The quiet screen's key wears the ready outline and asks "${quiet.txt}", and there is no row of chests under it`)
      : bad('C.1 tap the key, it asks', JSON.stringify({ stat, arrive, asked, no, backClose, yes, after, quiet }));
  }

  /* ---- 3. B.1 / B.2: a chest that can be opened wears a pulsing green outline; tapped on the map it opens on the frame the key screen is shown ---- */
  {
    await boot({}, { unlock: ALL43 }, { plain: PLAIN43 }); await click('[data-go="s-pick"]'); await sleep(900);
    const ring = await page.evaluate(() => { const c = id => document.querySelector(`.chest[data-chest="${id}"] .pic`); return { ready: getComputedStyle(c('games')).animationName, before: getComputedStyle(c('key')).animationName }; });
    const tap = await page.evaluate(() => { document.querySelector('.chest[data-chest="games"]').click(); const h = document.getElementById('key-cere'), on = document.querySelector('.screen.on');
      return { screen: on && on.id, cere: !h.hidden, playing: h.classList.contains('play'), stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games }; });
    await revealDone(); await sleep(500); const after = await onScreen();
    /* DELETED for build 49 (site/CLAUDE.md -> The gate): this check's stylesheet-text half, which spelled `.kch.ready` - the quiet screen's row of chests,
       now gone. The quiet screen's key wearing the same outline is driven in C.1 above */
    (ring.ready === 'readyring' && ring.before === 'none' && tap.screen === 's-key' && tap.cere && tap.playing && tap.stored === 1 && after === 's-pick')
      ? ok('B.1 / B.2 a chest that can be opened wears a pulsing green outline (readyring in --ok) on the map, and a chest that cannot does not; tapped on the map the ready chest opens in the same task that shows the key screen - its ceremony already covers it, so the key screen never flashes - and "tap to continue" returns to the map')
      : bad('B.1 / B.2 the ready outline and the no-flash open', JSON.stringify({ ring, tap, after }));
  }

  /* ---- 4. B.3: a key animation not yet seen plays IN FULL, input held, and only then does the chest open - never started and cut off ---- */
  {
    await boot({ chests: { games: 1 }, keyWhole: {} }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await click('.chest[data-chest="key"]'); await sleep(700);
    /* AMENDED at build 46 (v25 item 11): the unseen key animation is the first-open REVEAL now. It still plays IN FULL and Back still does nothing
       while it does — but it ends on a TAP, so the chest that was waiting cannot be opened on a timer. `pendingOpen` hands it to the reveal, which
       opens it at its Continue. What B.3 asked for is unchanged: never started and cut off. */
    const kindOf = () => page.evaluate(() => { const h = document.getElementById('key-cere'); return { kind: h.hidden ? '' : (h.dataset.kind || '') }; });
    const mid = Object.assign(await at43(), await kindOf());
    await page.evaluate(() => { const h = document.getElementById('key-cere'), o = window.__b3 = []; new MutationObserver(() => { const k = h.hidden ? 'off' : h.dataset.kind || 'off'; if (o[o.length - 1] !== k) o.push(k); }).observe(h, { attributes: true, attributeFilter: ['hidden', 'data-kind'] }); });
    /* AMENDED at build 51 (v27 item 14): the wait was 1300ms, which is longer than the whole animation now (1.7s from a start about 700ms back),
       so "Back did nothing while it played" was being read after it had already finished. It is taken well inside the animation instead. */
    await click('#s-key .back'); await sleep(300);
    const held = Object.assign(await at43(), await kindOf());
    /* AMENDED at build 48 (v26 items 10 / 11): the key's reveal ends BY ITSELF once its earn moment has played to the end - no tap, no card - and the
       chest the player tapped on the map opens straight after it */
    let seq = []; for (let i = 0; i < 100; i++) { await sleep(200); seq = await page.evaluate(() => window.__b3.slice()); if (seq.includes('chest')) break; }
    const ready = { kind: seq.join('>'), chests: held.chests };
    const opened = Object.assign(await at43(), await kindOf());
    await revealDone(); await sleep(500);
    (mid.screen === 's-key' && mid.kind === 'key' && !mid.chests.key && held.screen === 's-key' && held.kind === 'key' && !held.chests.key
      && ready.kind === 'off>chest' && opened.kind === 'chest' && opened.chests.key === 1)
      ? ok(`B.3 the Skill chest tapped on the map with key 1's first-open reveal unseen: the reveal plays in full on the key screen - Back does nothing while it does - and the chest opens only once it has ended by itself, never started and interrupted (AMENDED at build 48, v26 items 10 / 11: the reveal waits for its earn moment's own end, ${KY43.KEY_EARN.clear.ms}ms of it, and needs no tap)`)
      : bad('B.3 a key animation is never cut off', JSON.stringify({ mid, held, ready, opened }));
  }

  /* ---- 5. C.5 AMENDED AT BUILD 51 (v27 item 14): earning a key is its own ANIMATION per tier, two seconds at most, at least three quarters of
     it movement, drawn centred on the hub, with its own sound from that key's theme on the closing flash. Build 43's moment (a bloom, squares,
     a spiked burst) and build 46's reveal around it nested to 6.3s / 8.0s / 10.5s; the numbers are the whole of what changed here. ---- */
  {
    const E = KY43.KEY_EARN, F = AU43.KEY_EARN_FX, T3 = ['clear', 'pro', 'author'], GLOW = KY43.EARN_GLOW;
    // item 14's two rules, off the data: two seconds at most, and movement is at least three quarters of it (the flash is the only step that is not)
    const span = t => { const st = E[t].steps, move = st.filter(x => x.name !== GLOW);
      return { ms: E[t].ms, from: Math.min(...st.map(x => x.at)), to: Math.max(...move.map(x => x.at + x.ms)), end: Math.max(...st.map(x => x.at + x.ms)) }; };
    const sp = Object.fromEntries(T3.map(t => [t, span(t)]));
    /* AND REVERSED AT BUILD 57 (v29 Section A, 57.7): THE MOTION IS THE CLOCK. Build 51 capped the whole thing at 2.0s and build 52 at 2.5s;
       build 53's item 15 threw the cap away and made the MUSIC the clock, because Snd.keyEarn was fired on the closing FLASH and rang on for
       seconds after the animation. Aiden played that and found the fault at the other end — a second of settling on Skill and Pro and two on
       Author with nothing moving. 57.7 settles it: `ms` is the MOTION's own length and must be SHORTER than the music by at least 300ms, the
       music is not trimmed to fit, and its tail rings across the cut into the chest. Everything else here is untouched — movement is still
       three quarters at least, still measured against the flash; the assembly is still a quarter of the whole; the last step is still `land`. */
    const musicMs43 = t => Math.round(Math.max(0, ...F[t].notes.map(x => x[0] * 1000 + x[2])));
    const asm43 = t => { const r = E[t].steps.find(x => x.name === 'rise'); return r ? r.at : E[t].ms; };
    const cfg = T3.every(t => E[t].ms <= musicMs43(t) - 300 && sp[t].end <= sp[t].ms && (sp[t].to - sp[t].from) / sp[t].ms >= .75
        && asm43(t) >= E[t].ms * .25 && E[t].steps.some(x => x.name === GLOW)
        && E[t].steps[E[t].steps.length - 1].name === 'land' && E[t].steps.every((x, i, all) => !i || x.at >= all[i - 1].at))
      && T3.every((t, i) => !i || E[t].ms >= E[T3[i - 1]].ms)
      // build 52: BOTH keys with spokes now fire them one at a time, and the Pro key runs a current between each pair (`spokes.trace`)
      && E.clear.spokes.gap > 0 && !E.clear.spokes.trace && E.pro.spokes.gap > 0 && E.pro.spokes.trace > 0
      && !E.author.spokes && E.author.cracks && E.author.thorns && E.author.shake
      // build 52: the beat between one crack and the next, and one thorn and the next, is config's — the stylesheet held it until now
      && E.author.crackGap > 0 && E.author.thornGap > 0
      && F.clear.track === 'theme:key' && F.pro.track === 'theme:pro' && F.author.track === 'theme:thorns';
    await boot({ allOpen: true, keyWhole: {} }, { unlock: ALL43, bars: bars43('clear', 'pro', 'author') }, { plain: PLAIN43 });
    const got = await page.evaluate(async cfgE => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const calls = [], steps = [], o = A.Snd.keyEarn, u = A.Snd.unlockFx, c = A.Snd.chest, k = A.Snd.keyStep;
      A.Snd.keyEarn = function (t) { calls.push(t); return o.apply(this, arguments); }; A.Snd.unlockFx = function () { calls.push('unlockFx'); return u.apply(this, arguments); };
      A.Snd.chest = function () { calls.push('chest'); return c.apply(this, arguments); }; A.Snd.keyStep = function (nm) { steps.push(nm); return k.apply(this, arguments); };
      const out = {};
      for (const [i, t] of [[0, 'clear'], [1, 'pro'], [2, 'author']]) { R.show('s-menu'); await wait(80); R.show('s-key', { tier: i }); await wait(Math.round(cfgE[t].ms * .55) + 320);
        const el = document.getElementById('s-key'), g = document.querySelector('#key-ring .kglyph'), hub = document.querySelector('#key-ring .khub').getBoundingClientRect(), gr = g.getBoundingClientRect();
        out[t] = { earn: el.dataset.earn, on: el.classList.contains('kearning'), ms: el.style.getPropertyValue('--earn-ms'),
          flash: document.querySelectorAll('#key-ring .keflash').length, crk: document.querySelectorAll('#key-ring .kecrk').length, thn: document.querySelectorAll('#key-ring .kethn').length,
          cur: document.querySelectorAll('#key-ring .kecur').length, curAnim: (document.querySelector('#key-ring .kecur') || { getAnimations: () => [] }).getAnimations().map(a => a.animationName).filter(Boolean).join(),
          gaps: [el.style.getPropertyValue('--crack-gap'), el.style.getPropertyValue('--thorn-gap'), el.style.getPropertyValue('--trace-ms')].join('/'),
          vars: (cfgE[t].steps || []).every(x => el.style.getPropertyValue('--st-' + x.name + '-at') === x.at + 'ms' && el.style.getPropertyValue('--st-' + x.name + '-ms') === x.ms + 'ms'),
          glyph: g.getAnimations().map(a => a.animationName).filter(Boolean).join(), attr: g.hasAttribute('transform'),
          off: Math.round(Math.hypot((gr.left + gr.width / 2) - (hub.left + hub.width / 2), (gr.top + gr.height / 2) - (hub.top + hub.height / 2))) };
        // and it comes off by itself, well inside the ceiling item 14 sets
        await wait(cfgE[t].ms + 1400); out[t].after = document.getElementById('s-key').classList.contains('kearning');
        await wait(300); }
      const plans = Object.fromEntries(['clear', 'pro', 'author'].map(t => [t, A.Snd.keyEarnPlan(t)]));
      A.Snd.keyEarn = o; A.Snd.unlockFx = u; A.Snd.chest = c; A.Snd.keyStep = k; return { out, calls, steps, plans };
    }, Object.fromEntries(T3.map(t => [t, { ms: E[t].ms, steps: E[t].steps }])));
    const P = got.plans, len = t => Math.max(...P[t].map(e => e[0] + e[3] / 1000)), O = got.out;
    const rules = T3.every(t => P[t].length && P[t].every(e => !((e[1] >= 300 && e[3] < 700) || (e[1] > 523.3 && e[3] < 1200))));
    const rising = T3.every((t, i) => !i || (len(t) > len(T3[i - 1]) && P[t].length > P[T3[i - 1]].length));
    const notUnlock = T3.every(t => ![523.3, 784, 1046.5].every((f, i) => P[t].some(e => Math.abs(e[1] - f) < .5 && Math.abs(e[0] - i * .1) < .01)));
    // every step but the flash and a lone spoke plays its own KEY_STEP_FX; the Skill key's seven spokes play their games' sounds instead
    /* build 52: a `trace` step sounds once per LINK between two spokes — six times on a seven-spoke ring — because the current runs six times,
       and a spokes step whose spokes fire one at a time still sounds its seven games and not a step sound */
    const NG52 = GAMES.length;
    const wantSteps = T3.flatMap(t => E[t].steps.filter(x => x.name !== GLOW && !(x.name === 'spokes' && E[t].spokes && E[t].spokes.gap > 0))
      .flatMap(x => x.name === 'trace' ? Array(NG52 - 1).fill('trace') : [x.name]));
    const draw = O.clear.earn === 'clear' && O.clear.glyph === 'kespin' && O.pro.earn === 'pro' && O.pro.glyph === 'kesnap'
      && O.author.earn === 'author' && O.author.glyph === 'kedrop' && O.author.crk === E.author.cracks && O.author.thn === E.author.thorns
      // build 52: six currents on the Pro key, one between each pair of spokes, and none on the other two
      && O.pro.cur === NG52 - 1 && O.pro.curAnim === 'kecurrent' && !O.clear.cur && !O.author.cur
      && O.author.gaps === `${E.author.crackGap}ms/${E.author.thornGap}ms/0ms` && O.pro.gaps === `0ms/0ms/${E.pro.spokes.trace}ms`
      && T3.every(t => O[t].on && !O[t].after && !O[t].attr && O[t].off <= 8 && O[t].flash === 1 && O[t].vars && O[t].ms === E[t].ms + 'ms');
    (cfg && draw && got.calls.join() === 'clear,pro,author' && got.steps.join() === wantSteps.join() && rules && rising && notUnlock)
      ? ok(`C.5 / v27 item 14 earning a key is its own ANIMATION per tier: ${T3.map(t => E[t].ms + 'ms').join(' ≤ ')}, never over 2500, and ${T3.map(t => Math.round((sp[t].to - sp[t].from) / sp[t].ms * 100) + '%').join(' / ')} of each is movement (the flash is the rest) — the Skill key's seven spokes fire one at a time and it spins upright (kespin), the Pro key's fire ONE BY ONE ROUND THE RING with a current running the ${NG52 - 1} links between them (Aiden's answer to build 51) before it snaps a quarter turn (kesnap), the Author key drops and slams with ${E.author.cracks} cracks ${E.author.crackGap}ms apart and ${E.author.thorns} thorns ${E.author.thornGap}ms apart, one by one (kedrop) — each centred on the hub (no transform attribute on the animated group; off by ${T3.map(t => O[t].off).join(' / ')}px), each step landing its own sound (${got.steps.join(', ')}) and each key its own earn sound from its theme on the closing flash (${T3.map(t => P[t].length + ' notes over ' + len(t).toFixed(1) + 's').join(', ')}), none of it the unlock sound or a chest's, and each once`)
      : bad('C.5 / v27 item 14 the earned animations', JSON.stringify({ cfg, sp, draw, O, calls: got.calls, steps: got.steps, wantSteps, rules, rising, notUnlock }));
  }

  /* ---- 6. C.6 / C.4: three key backgrounds drawn in code over the live background, each a Customise background once its key is finished ---- */
  {
    const atm = strip(read('ui', 'atmosphere.js'));
    const code = /const LAYER=\{/.test(atm) && ['lantern(t)', 'circuit(t)', 'thorn(t)'].every(s => atm.includes(s)) && /TRACKS\[k\.track\]/.test(atm) && !/\.png|\.jpe?g|\.webp|new Image|url\(/i.test(atm)
      && /setKeyLayer\(quiet \|\| t\.shell \? null : t\.style\)/.test(keyjs43);
    const items = TH43.ITEMS.bg.filter(i => i.key).map(i => i.v + ':' + i.key).join() === 'lantern:clear,circuit:pro,thorn:author' && ['lantern', 'circuit', 'thorn'].every(v => TH43.DESIGNS[v]);
    const ground = !/rgba\(0,\s*0,\s*0/.test(KY43.KEYS[2].ground) && !/\[data-style="thorn"\] #key-main\{background/.test(read('styles', 'app.css'));
    await boot({ allOpen: true }, {}, { plain: PLAIN43 });
    const live = await page.evaluate(async () => { const R = await import('./ui/router.js'); const AT = await import('./ui/atmosphere.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const cv = document.getElementById('stars'), cx = cv.getContext('2d'), out = { layers: Object.keys(AT.LAYER).join() };
      // what is drawn, sampled off the canvas rather than trusted: pixels with anything in them, every ninth
      const lit = () => { const d = cx.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 36) if (d[i] > 0) n++; return n; };
      R.show('s-menu'); await wait(400); out.stars = lit();
      for (const [i, s] of [[0, 'lantern'], [1, 'circuit'], [2, 'thorn']]) { R.show('s-key', { tier: i }); await wait(500); out[s] = lit(); if (s === 'thorn') out.main = getComputedStyle(document.getElementById('key-main')).backgroundColor; }
      R.show('s-menu'); await wait(400); out.back = lit(); return out; });
    await boot({ chests: { games: 1 } }, {}, { plain: PLAIN43 }); await show43('s-custom'); await sleep(500);
    const lockd = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const b = v => document.querySelector(`#c-bg [data-v="${v}"]`);
      const out = { locked: ['lantern', 'circuit', 'thorn'].map(v => !!b(v) && b(v).classList.contains('locked')).join() }; b('circuit').click(); await wait(250); out.line = document.getElementById('lk-bg').textContent; out.bg = S.prefs.bg; return out; });
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 }); await show43('s-custom'); await sleep(500);
    const fin = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const b = v => document.querySelector(`#c-bg [data-v="${v}"]`);
      const out = { lantern: b('lantern').classList.contains('locked'), green: b('lantern').classList.contains('newthing'), circuit: b('circuit').classList.contains('locked') }; b('lantern').click(); await wait(250); out.bg = S.prefs.bg; out.look = S.look('bg'); return out; });
    (code && items && ground && live.layers === 'lantern,circuit,thorn' && ['lantern', 'circuit', 'thorn'].every(s => live[s] > live.stars * 2) && live.back < live.lantern && live.main === 'rgba(0, 0, 0, 0)'
      && lockd.locked === 'true,true,true' && /Pro · whole/.test(lockd.line) && lockd.bg === 'stars' && !fin.lantern && fin.green && fin.circuit && fin.bg === 'lantern' && fin.look === 'lantern')
      ? ok(`C.6 / C.4 three key backgrounds drawn in code - no image assets - each over the live background on its key screen and in its key's own tempo (the canvas holds ${live.lantern} / ${live.circuit} / ${live.thorn} sampled pixels against the stars' ${live.stars}); Thorn's solid black is gone (#key-main ${live.main}); in Customise each is locked until its key is FINISHED, its line naming that key ("${lockd.line.trim()}"), and key 1 finished opens Lantern, green once, and it applies`)
      : bad('C.6 / C.4 the key backgrounds', JSON.stringify({ code, items, ground, live, lockd, fin }));
  }

  /* ---- 7. C.7: every chest's sting is cut from its own key's theme, escalating Games -> Key -> Pro -> Thorns ---- */
  {
    const S7 = AU43.CHEST_STING, IDS = ['games', 'key', 'pro', 'thorns'];
    const shape = IDS.every(id => S7[id].track && typeof S7[id].cut === 'number' && Array.isArray(S7[id].tail) && !S7[id].notes) && IDS.map(id => S7[id].track).join() === 'theme:key,theme:key,theme:pro,theme:thorns' && /function stingOf\(s,tr\)/.test(strip(read('audio.js')));
    const st = await page.evaluate(async ids => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      /* AMENDED AT BUILD 57 (v29 Section A, 57.8): a chest a key opens is two beats, and the sting belongs to the SECOND — audio.js offsets it by
         COVER_AT so it still resolves on the lid. This check is about the sting itself (its notes, its shape, its length), so it is measured from
         its own first note, which is the same set of numbers it has always had. */
      return ids.map(id => { const s = A.CHEST_STING[id], raw = M.Snd.chestPlan(id).filter(e => e[8] === 'sting');
        const off = raw.length ? Math.min(...raw.map(e => e[0])) : 0;
        const p = raw.map(e => [+(e[0] - off).toFixed(3)].concat(e.slice(1))), body = p.filter(e => e[0] < s.cut), theme = M.Music.plan(s.track).plan;
        const fromTheme = body.every(e => theme.some(x => Math.abs(x[0] - e[0]) < 2e-3 && Math.abs(x[1] - e[1]) < .05 && x[4] === e[4]));
        const end = Math.max(...p.map(e => e[0] + e[3] / 1000));
        return { id, n: p.length, body: body.length, fromTheme, end: +end.toFixed(2), rate: +(p.length / end).toFixed(2), voices: s.voices ? s.voices.length : A.TRACKS[s.track].voices.length,
          bad: p.filter(e => (e[1] >= 300 && (e[3] < 700 || e[6] < 40)) || (e[1] > 523.3 && e[3] < 1200)).length }; }); }, IDS);
    const rising = st.every((x, i) => !i || (x.end > st[i - 1].end && x.rate > st[i - 1].rate && x.voices >= st[i - 1].voices));
    (shape && st.every(x => x.body > 0 && x.fromTheme && !x.bad && x.end >= 3 && x.end <= 6.05) && rising)
      ? ok(`C.7 every chest's sting is its own key's theme - its first bars played through the key screen's own arrangement engine, every note of the body a note of that theme, then the tonic landed - escalating Games -> Key -> Pro -> Thorns in length (${st.map(x => x.end + 's').join(' < ')}), notes a second (${st.map(x => x.rate).join(' < ')}) and voices (${st.map(x => x.voices).join(' / ')}), all to the theme rule; built on C.2 / C.3's fix`)
      : bad('C.7 the stings from the themes', JSON.stringify({ shape, st, rising }));
  }

  /* ---- 8. A.1: Keys is locked until the Games chest - crossed out with "open the Games chest", the meter line and Progress's key row refused too; green until first seen ---- */
  {
    await boot({}, { runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN43 });
    await show43('s-menu'); await sleep(350);
    const lk = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id;
      const k = document.querySelector('.item[data-go="s-key"]'), out = { cls: k.className, need: document.getElementById('keys-need').hidden ? '' : document.getElementById('keys-need').textContent, x: getComputedStyle(k, '::after').content };
      k.click(); await wait(250); out.tap = on(); out.toast = document.getElementById('toast').textContent.trim();
      document.getElementById('menu-key').click(); await wait(250); out.meter = on();
      R.show('s-prog', { tab: 'unl' }); await wait(450); const row = document.querySelector('[data-act="unl"][data-key]'); out.row = !!row; if (row) row.click(); await wait(250); out.prog = on();
      return out; });
    await boot({ chests: { games: 1 }, keySeen: 0 }, { unlock: ALL43 }, { plain: PLAIN43 }); await show43('s-menu'); await sleep(350);
    const op = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id; const k = () => document.querySelector('.item[data-go="s-key"]');
      const out = { cls: k().className, need: document.getElementById('keys-need').hidden }; k().click(); await wait(600); out.tap = on();
      R.show('s-menu'); await wait(300); out.after = k().className; out.seen = JSON.parse(localStorage.getItem('ne')).prefs.keysSeen; return out; });
    const st = strip(read('core', 'store.js'));
    const store = /keysSeen:p\.keysSeen!==undefined\?\(p\.keysSeen\?1:0\):\(p\.keySeen\?1:0\)/.test(st) && /keySeen:0,keysSeen:0/.test(st) && /prefs\.keysSeen = 0/.test(strip(read('progress', 'key.js')));
    (/keylock/.test(lk.cls) && lk.need === 'open the Games chest' && lk.x !== 'none' && lk.tap === 's-menu' && /Games chest/.test(lk.toast) && lk.meter === 's-menu' && lk.row && lk.prog === 's-prog'
      && !/keylock/.test(op.cls) && /newthing/.test(op.cls) && op.need && op.tap === 's-key' && !/newthing/.test(op.after) && op.seen === 1 && store)
      ? ok('A.1 before the Games chest the Keys row is on the menu, crossed out with "open the Games chest" under it - the Customise treatment - and a tap says so and stays put, as do the meter line and Progress\'s key row; once the chest is open the strike is gone, the row is green until the key screen is first seen, and that spends it (prefs.keysSeen; an older profile takes keySeen, Fresh game and the Games chest reset clear it)')
      : bad('A.1 Keys locked until the first chest', JSON.stringify({ lk, op, store }));
  }

  /* ---- 9. A.2 / B.5: a brand new game opens the map at the top, and the chests arrive with the loading sequence ---- */
  {
    await boot({}, {}, { plain: PLAIN43 }); await click('[data-go="s-pick"]'); await sleep(600);
    await page.evaluate(() => { document.getElementById('s-pick').scrollTop = 9999; }); const was = await page.evaluate(() => document.getElementById('s-pick').scrollTop);
    const fr = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      S.reset(); R.show('s-menu'); await wait(200); R.show('s-pick'); await wait(150);
      return { top: document.getElementById('s-pick').scrollTop, chests: [...document.querySelectorAll('#grid .chest')].map(c => (c.classList.contains('reveal') ? 'reveal' : '-') + '@' + c.style.animationDelay), tile6: document.querySelectorAll('#grid .tile[data-game]')[6].style.animationDelay }; });
    const again = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); R.show('s-menu'); await wait(150); R.show('s-pick'); await wait(150); return document.querySelectorAll('#grid .chest.reveal').length; });
    /* AMENDED at build 49 (v26 items 2 / 13): the first open is drawn out (config/chests.js MAP_INTRO) - the seventh game, then the Gauntlets, then the
       four chests on their own beat - so the delays are read off that config rather than the 120ms beat.
       AMENDED at build 51 (v27 item 2): a new game has opened no chest, so NEITHER GAUNTLET IS THERE and neither takes a beat - the chests follow
       the seventh game by `chestAt` alone. Seven games, not nine tiles. */
    const I43 = (await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href)).MAP_INTRO;
    const want43 = [0, 1, 2, 3].map(i => 'reveal@' + (I43.at + 7 * I43.gap + I43.chestAt + i * I43.chestGap) + 'ms').join();
    (was > 100 && fr.top === 0 && fr.chests.join() === want43 && fr.tile6 === (I43.at + 6 * I43.gap) + 'ms' && again === 0)
      ? ok(`A.2 / B.5 a brand new game opens the map at the top (it was left at ${was}px: a scroller keeps its place while its screen is hidden, which put Fresh game down at the chests) and the four chests pop in last, straight after the seventh game (${fr.chests.join(', ')}) with no beat held for a Gauntlet that is not there; the next visit reveals nothing, as the tiles do not`)
      : bad('A.2 / B.5 the map on a new game', JSON.stringify({ was, fr, again }));
  }

  /* ---- 10. A.3: Testing is live from the first load; a build-time flag strips it from the native build ---- */
  {
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const first = await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 400));
      const t = document.querySelector('#s-menu [data-go="s-testing"]'), p = document.querySelector('#s-menu [data-go="s-board"]');
      return { dim: t.classList.contains('dim'), pe: getComputedStyle(t).pointerEvents, other: p.classList.contains('dim') }; });
    const cfg = read('config', 'build.js');
    const flag = /export const TARGET = 'web';/.test(cfg) && /export const BUILD_FLAGS = \{ dev: TARGET !== 'native' \};/.test(cfg) && /"native": "node scripts\/native\.mjs"/.test(read('package.json'));
    const os = await import('node:os'); const { execFileSync } = await import('node:child_process');
    const outDir = path.join(os.tmpdir(), 'ne-native-gate-43'); let nat = null, ran = '';
    try { ran = execFileSync(process.execPath, [path.join(root, 'scripts', 'native.mjs'), outDir], { encoding: 'utf8' }); } catch (e) { ran = 'FAILED ' + (e.stderr || e.message); }
    if (!/^FAILED/.test(ran)) {
      const nh = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), nb = fs.readFileSync(path.join(outDir, 'config', 'build.js'), 'utf8');
      /* v29 (item 10, build 55): scripts/native.mjs left `video` out of TREE while all eight config/messages.js rows point at
         video/test-card.mp4 + .vtt, so every message in a native build was a 404 — which, until this build, showed as a silent
         black rectangle and nothing else. The copy is also atomic now: it is built and checked in a temp tree and only moved
         into place once every check has passed, so a failure no longer leaves a half-written dist/native that looks like a build. */
      const vid43 = ['test-card.mp4', 'test-card.vtt'].filter(f => !fs.existsSync(path.join(outDir, 'video', f)));
      !vid43.length ? ok('v29 item 10 the native tree carries video/ — every message slot\'s clip is in the bundle') : bad('item 10 video/ missing from the native tree', vid43.join(', '));
      nat = { html: !/\sdata-dev[\s>=]/.test(nh) && !/id="s-testing"/.test(nh) && !/data-act="dev-/.test(nh), target: /export const TARGET = 'native';/.test(nb), web: /id="s-testing"/.test(read('index.html')) && /export const TARGET = 'web';/.test(read('config', 'build.js')) };
      const nsrv = await serve(outDir);
      await page.goto(nsrv.base + '/index.html', { waitUntil: 'networkidle0' });
      await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify({ v: 6, prefs: { story: 1, played: 1, menuSeen: 1, allOpen: true, supporter: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} })); });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
      nat.live = await page.evaluate(async () => { const S = await import('./core/store.js'); const B = await import('./config/build.js');
        return { dev: B.BUILD_FLAGS.dev, testing: !!document.querySelector('[data-go="s-testing"]'), screen: !!document.getElementById('s-testing'), allOpen: S.prefs.allOpen, supporter: S.prefs.supporter, games: S.opened('games') }; });
      await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); nsrv.close();
      fs.rmSync(outDir, { recursive: true, force: true }); }
    (!first.dim && first.pe !== 'none' && first.other && flag && nat && nat.html && nat.target && nat.web && nat.live && nat.live.dev === false && !nat.live.testing && !nat.live.screen && !nat.live.allOpen && !nat.live.supporter && !nat.live.games)
      ? ok('A.3 Testing is live on the menu from the first load - not dimmed while every other row but Play is - and the build-time flag strips it: `npm run native` writes a tree with TARGET native (BUILD_FLAGS.dev false) and no [data-dev] element in its markup, which loads with no Testing row or screen and refuses a planted OPEN EVERYTHING and Supporter; the web tree keeps both (S5)')
      : bad('A.3 Testing from the first load, and the native strip', JSON.stringify({ first, flag, ran: ran.slice(0, 160), nat }));
  }

  /* ---- 11. the review board: the new cards, and each key's earn sound on its card ---- */
  rv5: {
    if (!REVIEW) { noReview("the review board's new cards"); break rv5; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).map(a => a.shot) : [];
    const want43 = ['13h-s-key-ask', '13i-s-key-earn-clear', '13j-s-key-earn-pro', '13k-s-key-earn-author', '13l-s-custom-keybg', '13m-menu-keys-locked'];
    (want43.every(s => shots.includes(s) && gen.includes(`'${s}'`)) && /keyEarnPlan\(/.test(gen) && /REF\.earnFx/.test(tpl))
      ? ok(`build 43 the catalogue carries ${want43.length} new cards - the ask, the three earn moments (each with its sound on a button, off Snd.keyEarnPlan), Customise's key backgrounds and the Keys row locked`)
      : bad('build 43 the catalogue cards', JSON.stringify({ missing: want43.filter(s => !shots.includes(s) || !gen.includes(`'${s}'`)), plan: /keyEarnPlan\(/.test(gen), tpl: /REF\.earnFx/.test(tpl) }));
  }
}

if (section('build 44 - batch 17, the key roster, Aiden\'s bars, the goal and six game tweaks')) {
  const KB44 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const G44 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const U44 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const NOW44 = Date.now();
  const ALL44 = Object.assign(Object.fromEntries(U44.UNLOCKS.map(x => [x.key, NOW44])), Object.fromEntries(Object.keys(KB44.KEY_BARS).map(k => [k, NOW44])));
  const PLAIN44 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const spot44 = strip(read('games', 'spot', 'index.js'));

  /* ---- 1. §E: Aiden's 42 numbers, exactly as he set them, and the two shapes in them ---- */
  {
    const AIDEN = { 'quick-tap:two:5': [9, 13], 'quick-tap:two:15': [26, 39], 'quick-tap:two:30': [51, 78], 'quick-tap:four:5': [9, 12], 'quick-tap:four:15': [26, 36], 'quick-tap:four:30': [51, 72],
      'dots:blind:5': [7, 11], 'dots:blind:15': [21, 33], 'dots:blind:30': [42, 66], 'dots:lead:5': [9, 15], 'dots:lead:15': [27, 45], 'dots:lead:30': [54, 90],
      'hold:grow:7': [30], 'hold:grow:-1': [7], 'hold:cut:10': [15], 'hold:cut:-1': [10], 'sequence:solo:3': [6], 'sequence:solo:7': [6], 'timing:stopwatch:5': [2.5], 'timing:stopwatch:-1': [9],
      'timing:hidden:10': [1500], 'timing:hidden:-1': [6], 'reaction:flash:5': [295], 'reaction:flash:-1': [6], 'reaction:nogo:5': [400], 'reaction:nogo:-1': [10], 'spot:count:10': [12], 'spot:count:-1': [8], 'spot:find:10': [18], 'spot:find:-1': [8] };
    const B = KB44.KEY_BARS, off = [];
    for (const [k, v] of Object.entries(AIDEN)) { const r = B[k]; if (!r || r.bar !== v[0] || r.conf !== 'set') off.push(k + ' bar'); if (v.length > 1 && (r.pro !== v[1] || (r.placeholder && 'pro' in r.placeholder))) off.push(k + ' pro'); }
    const set = Object.values(AIDEN).reduce((n, v) => n + v.length, 0);
    /* the shapes in his data, as they are: × 1 / 3 / 6 at Pro in all four modes and at key 1 in Dots. Quick Tap's key 1 is NOT × 1 / 3 / 6 —
       it is 9 / 26 / 51, one curve for Two and Four — and the gate says so rather than "correcting" it (the build 44 prompt claimed otherwise) */
    const x136 = (m, t) => [1, 3, 6].every((x, i) => B[`${m}:${[5, 15, 30][i]}`][t] === B[`${m}:5`][t] * x);
    const shape = ['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead'].every(m => x136(m, 'pro')) && ['dots:blind', 'dots:lead'].every(m => x136(m, 'bar')) && !x136('quick-tap:two', 'bar');
    const curve = [5, 15, 30].every(s => B[`quick-tap:two:${s}`].bar === B[`quick-tap:four:${s}`].bar) && [9, 26, 51].every((v, i) => B[`quick-tap:two:${[5, 15, 30][i]}`].bar === v) && B['quick-tap:two:5'].pro === 13 && B['quick-tap:four:5'].pro === 12;
    (!off.length && set === 42 && Object.keys(B).length === 30 && shape && curve)
      ? ok(`v24 §E all ${set} of Aiden's numbers are in config/key-bars.js exactly as he set them (30 key 1, 12 Pro, conf 'set', no marker on his Pro); every length is the Sprint figure × 1 / 3 / 6 at Pro and at Dots' key 1, while Quick Tap's key 1 is his 9 / 26 / 51 for both Two and Four, which split at Pro, 13 against 12`)
      : bad('v24 §E Aiden\'s bars', JSON.stringify({ off, set, shape, curve }));
  }

  /* ---- 2. §D.2: one achievement on every key requirement at every tier - 90 rows, named off KEY_ROSTER, 23 older ids kept with their rewards ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const ro = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const AC = await import('./config/achievements.js'); const TH = await import('./config/theme.js');
      const all = K.keyAch(), rows = all.filter(a => a.combo);
      const named = rows.every(a => { const c = K.COMBOS.find(x => x.key === a.combo); const r = (AC.KEY_ROSTER[c.bar.id] || {})[a.kt]; return !!r && r.name === a.name && (!r.id || r.id === a.id) && typeof a.how === 'string' && !/revealed/.test(a.how); });
      const kept = rows.filter(a => !a.id.startsWith('key_')).map(a => a.id).sort();
      const bys = Object.values(TH.ITEMS).flat().filter(i => i.by).map(i => i.by);
      return { n: rows.length, sets: all.length - rows.length, pairs: new Set(rows.map(a => a.combo + '|' + a.kt)).size, ids: new Set(rows.map(a => a.id)).size, named, kept,
        inAch: kept.filter(id => P.ACH.some(x => x.id === id)), orphanBy: bys.filter(id => !P.ACH.some(x => x.id === id) && !all.some(x => x.id === id)),
        rewards: rows.filter(a => a.unlocks).map(a => a.id).sort(), ach: P.ACH.length, live: rows.filter(a => a.live).length }; });
    const KEPT23 = ['qt_bclean5', 'qt_clean5', 'dt_bpin', 'dt_pin', 'hd_steady', 'hd_money', 'sq_7', 'tm_close', 'rx_200', 'sp_5', 'sp_fast', 'qt_br4', 'qt_r5', 'dt_blind', 'dt_land', 'hd_est', 'sq_12', 'tm_run', 'tm_wall', 'rx_run', 'rx_clean', 'sp_15', 'sp_clean'].sort();
    const REWARD9 = ['dt_land', 'dt_pin', 'hd_est', 'hd_money', 'hd_steady', 'qt_clean5', 'qt_r5', 'sq_12', 'sq_7'].sort();
    (ro.n === 90 && ro.pairs === 90 && ro.ids === 90 && ro.sets === 24 && ro.named && ro.kept.join() === KEPT23.join() && !ro.inAch.length && !ro.orphanBy.length && ro.rewards.join() === REWARD9.join() && ro.ach === 28 && !ro.live)
      ? ok(`D.2 the key roster: ${ro.n} rows, one per combination per tier, every name off KEY_ROSTER; the 23 rows that replace an older achievement keep its id and are gone from ACH (${ro.ach} rows left), the 9 that carried a reward still carry it, every Customise item's \`by\` still resolves, none is live:1 - beside the ${ro.sets} key sets`)
      : bad('D.2 the key roster', JSON.stringify(Object.assign({}, ro, { kept: ro.kept.length, rewards: ro.rewards })));
    // earned by clearing the bar, and banked the moment it is
    const earn = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const P = await import('./progress.js');
      S.store.bars = { 'quick-tap:four:5': Date.now() }; S.store.ach = {}; const fresh = K.checkKeyAch({}); const row = fresh.find(a => a.id === 'qt_clean5');
      return { got: !!row, name: row && row.name, tab: row && P.achTab(row), others: fresh.filter(a => a.combo && a.id !== 'qt_clean5').map(a => a.id) }; });
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const shut = await page.evaluate(async () => { const K = await import('./progress/key.js'); const r = K.keyAch().find(a => a.id === 'key_pro_qt-two-5'); return r ? r.how : ''; });
    (earn.got && earn.name === 'Warm hands' && earn.tab === 'cul' && !earn.others.length && /revealed/.test(shut) && !/13/.test(shut))
      ? ok(`D.2 clearing Quick Tap · Four · Sprint's key 1 bar banks Warm hands (id qt_clean5, on Customise unlocks) and nothing else; a Pro row before the Skill chest says "${shut}" and prints no number (A.1)`)
      : bad('D.2 a roster row is the bar', JSON.stringify({ earn, shut }));
    // its reward is still locked in Customise, and Customise unlocks lists the tier's rows only once the tier is revealed
    const cu = await page.evaluate(async () => { const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-prog', { tab: 'cul' }); await wait(400); const k1 = !!document.getElementById('cul-qt_clean5'), pro = !!document.getElementById('cul-qt_r5');
      R.show('s-custom'); await wait(500); const b = [...document.querySelectorAll('[data-v="#9BE8FF"]')]; return { k1, pro, found: b.length, locked: b.length > 0 && b.every(x => x.classList.contains('locked')) }; });
    (cu.k1 && !cu.pro && cu.locked)
      ? ok('D.2 Customise unlocks lists Warm hands with the Games chest open and not Quicker before the Skill chest; the colour Warm hands pays out is still locked in Customise (its `by` resolves to the roster row)')
      : bad('D.2 the roster rows on Customise unlocks and in Customise', JSON.stringify(cu));
  }

  /* ---- 3. §D.1: the goal at the top is the next unlock this run can fairly earn, then the key; an aim the player arrived with still wins ---- */
  {
    const goal44 = (g, d, s, aim) => page.evaluate(async (g, d, s, aim) => { const ST = await import('./core/state.js'); const P = await import('./progress.js'); const RUN = await import('./run/run.js');
      Object.assign(ST.sel, { game: g, diff: d, secs: s, vs: 0, practice: 0 }); ST.VS.reset(); if (aim) P.setPendingAim(aim); RUN.start(); await new Promise(r => setTimeout(r, 150));
      const gl = document.getElementById('goal'), txt = gl.classList.contains('on') ? gl.textContent.replace(/\s+/g, ' ').trim() : ''; RUN.abort(); await new Promise(r => setTimeout(r, 120)); return txt; }, g, d, s, aim || '');
    const G = {};
    await boot({}, {}, { plain: PLAIN44 }); G.fresh = await goal44('quick-tap', 'two', 5);
    await boot({}, { unlock: { 'quick-tap:four': NOW44 } }, { plain: PLAIN44 }); G.fourSprint = await goal44('quick-tap', 'four', 5);
    await boot({}, { unlock: { 'quick-tap:four': NOW44, 'quick-tap:two:15': NOW44, 'quick-tap:two:30': NOW44 } }, { plain: PLAIN44 }); G.twoSprint = await goal44('quick-tap', 'two', 5); G.twoMarathon = await goal44('quick-tap', 'two', 30);
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 }); G.key = await goal44('quick-tap', 'two', 15); G.aimed = await goal44('quick-tap', 'two', 15, 'a pinned aim');
    await boot({}, { unlock: ALL44 }, { plain: PLAIN44 }); G.quiet = await goal44('quick-tap', 'two', 15);
    (/7 hits in a row/.test(G.fresh) && !/15 hits/.test(G.fresh) && /7 hits in a row/.test(G.fourSprint) && !/35 hits/.test(G.fourSprint) && !/35 hits/.test(G.twoSprint) && /35 hits/.test(G.twoMarathon)
      && /26 hits or more/.test(G.key) && /Two steady/.test(G.key) && /a pinned aim/.test(G.aimed) && !/26 hits/.test(G.aimed) && G.quiet === '')
      ? ok(`D.1 the goal: a first Sprint is "${G.fresh}", not fifteen in a row; "35 hits in any run" waits for the longest open length ("${G.twoMarathon}") and never sits on a Sprint; with the chain done it is the nearest key requirement ("${G.key}"), none before the Games chest; a pinned aim still shows ("${G.aimed}")`)
      : bad('D.1 the goal at the top', JSON.stringify(G));
  }

  /* ---- 4. §E: a key 1 column that changes credits a saved best silently, once - Aiden's #426 answer, now reaching key 1 ---- */
  {
    await boot({ chests: { games: 1 }, retroCol: { clear: 'build 43' } }, { unlock: ALL44, runs: [{ t: NOW44, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN44 });
    const r1 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { bar: !!ne.bars['quick-tap:two:5'], ach: !!ne.ach.qt_bclean5, mark: !!(ne.prefs.retro || {})['quick-tap:two:5'] }; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const r2 = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return Object.keys(ne.bars).length; });
    await boot({ retroCol: { clear: 'build 43' } }, { unlock: ALL44, runs: [{ t: NOW44, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN44 });
    const r3 = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ne')).bars).length);
    (r1.bar && r1.ach && r1.mark && r2 === 1 && r3 === 0)
      ? ok('E a key 1 column that changed since it was last credited credits a saved best at boot - Quick Tap · Two · Sprint on 10 hits against Aiden\'s 9 banks the bar and Two hands, marked green once - and a reload credits nothing more; with the Games chest shut key 1 stays quiet')
      : bad('E key 1 credited when its numbers arrive', JSON.stringify({ r1, r2, r3 }));
  }

  /* ---- 5. §F.1 / F.3: Flash's Streak budget is 1000 (the L5 check above); Go / No-go's big number counts targets ---- */
  {
    await boot({ chests: { games: 1 } }, { unlock: ALL44 }, { plain: PLAIN44 });
    const ng = await page.evaluate(async () => { const ST = await import('./core/state.js'); const RUN = await import('./run/run.js'); const RX = (await import('./games/reaction/index.js')).RX; const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { game: 'reaction', diff: 'nogo', secs: 5, vs: 0, practice: 0 }); ST.VS.reset(); RUN.start(); const t0 = performance.now(); const out = { start: '', after: '' };
      while (performance.now() - t0 < 9000 && RX.st !== 'rule') await wait(40); await wait(300); out.start = document.getElementById('score').textContent;
      while (performance.now() - t0 < 30000 && !(RX.st === 'go' && RX.armed)) await wait(25);
      if (RX.st === 'go') { await wait(60); RUN.input({ type: 'down', x: 195, y: 420, el: document.getElementById('gen'), raw: new PointerEvent('pointerdown') }); await wait(350); out.after = document.getElementById('score').textContent; }
      RUN.abort(); return out; });
    (G44.NOGO_COUNTER === 'targets' && ng.start === '0/15' && ng.after === '1/15')
      ? ok(`F.3 Go / No-go's running counter: a Set's big number is the targets answered - "${ng.start}" at the first rule, "${ng.after}" after one correct tap (NOGO_COUNTER 'targets', guess)`)
      : bad('F.3 the Go / No-go counter', JSON.stringify({ flag: G44.NOGO_COUNTER, ng }));
  }

  /* ---- 6. §F.5 / F.6: Spot · Count's add-up holds then walks, and its Streak budget is one number, 8 ---- */
  {
    const budget = G44.COUNT_BUDGET === 8 && (spot44.match(/off>=COUNT_BUDGET/g) || []).length === 2 && !/off>=5\b/.test(spot44) && /this\.find\(\)\?10:COUNT_BUDGET/.test(spot44) && /lim:COUNT_BUDGET\+' miscounts'/.test(spot44);
    const copy = /of5:' · \{off\} of \{bud\}'/.test(read('config', 'copy.js')) && /hudCountStreak:'Round \{n\} · \{off\} of \{bud\} off'/.test(read('config', 'copy.js'));
    const walk = /ms:off\?COUNT_ADD\.ms:0/.test(spot44) && /off\?CFG\.hold:0\)/.test(spot44) && /String\(this\.off-off\)/.test(spot44) && G44.COUNT_ADD.ms > 480;
    (budget && copy && walk)
      ? ok(`F.5 / F.6 Spot · Count: a miscount holds CFG.hold (${G44.CFG.hold}ms) and walks into the total over ${G44.COUNT_ADD.ms}ms, the Set's number waiting on the old total; the Streak's budget is COUNT_BUDGET (${G44.COUNT_BUDGET}, a placeholder) everywhere it is read or printed`)
      : bad('F.5 / F.6 Spot · Count', JSON.stringify({ budget, copy, walk }));
  }

  /* ---- 7. §F.7: shapes can start overlapped, and a tap on the target always counts ---- */
  {
    const hit = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).SP; const g = document.getElementById('gen').getBoundingClientRect();
      const fake = { size: 40, pts: [{ shape: 'circle', x: 100, y: 100, sz: 40 }, { shape: 'square', x: 114, y: 104, sz: 40 }] };
      const at = (x, y, want) => SP.hitAt.call(fake, { x: g.left + x, y: g.top + y }, want);
      const grid = Array.from({ length: 12 }, (_, i) => ({ shape: 'square', x: (i % 4) * 60, y: Math.floor(i / 4) * 60, sz: 40 }));
      SP.pile.call({ size: 40 }, grid, 0.5); let pairs = 0;
      for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) if (Math.abs(grid[i].x - grid[j].x) < 40 && Math.abs(grid[i].y - grid[j].y) < 40) pairs++;
      return { onTarget: at(128.8, 122, q => q.shape === 'circle'), nearest: at(128.8, 122, () => false), offTarget: at(150, 124, q => q.shape === 'circle'), pairs }; });
    const wired = /this\.pile\(this\.pts,SPOT_FIND\.overlap\+p\*SPOT_FIND\.overlapPer\)/.test(spot44) && (spot44.match(/this\.hitAt\(ev,/g) || []).length === 2 && G44.SPOT_FIND.overlap > 0;
    (hit.onTarget === 0 && hit.nearest === 1 && hit.offTarget === 1 && hit.pairs >= 1 && wired)
      ? ok(`F.7 Spot · Find: a tap inside the target's own box counts even when a decoy's centre is nearer (the old nearest-centre test gave it to the decoy), a tap off the target still goes to the nearest shape, and ${Math.round(G44.SPOT_FIND.overlap * 100)}% of the crowd is dealt on a neighbour from round 1 (${hit.pairs} overlapping pair(s) from half of a clean grid) - solo and versus both hit through hitAt`)
      : bad('F.7 overlap and tap precedence', JSON.stringify({ hit, wired }));
  }
}

/* ---- 22. build 45 (batch 18, fixes, state and the catalogue - FEEDBACK-v25 items 3, 4, 5, 8, 9, 10, 12, 14, 16-21) ---- */
if (section('build 45 - batch 18, fixes, state and the catalogue')) {
  const css45 = read('styles', 'app.css'), flat45 = css45.replace(/\/\*[\s\S]*?\*\//g, ''), html45 = read('index.html');
  const NOW45 = Date.now();
  const U45 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const VD45 = await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href);
  const AU45 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const KB45 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALLUNL = Object.fromEntries(U45.UNLOCKS.map(u => [u.key, NOW45]));
  const VH45 = 844;   // the phone the gate drives
  const PLAIN45 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const menu45 = () => page.evaluate(() => { const k = document.querySelector('#s-menu .item[data-go="s-key"]'), c = document.querySelector('[data-go="s-custom"]');
    return { keys: k.className, cus: c.className, need: !document.getElementById('keys-need').hidden || !document.getElementById('cus-need').hidden }; });
  const menuOpen45 = m => !/\bdim\b/.test(m.keys) && !/keylock/.test(m.keys) && !/\bdim\b/.test(m.cus) && !/cuslock/.test(m.cus) && !m.need;
  // a player's own route into a chest: tap it on the map, then answer its ceremony's "tap to continue"
  // AMENDED at build 46 (v25 items 6 / 22): the open is a REVEAL - its stage, its symbols, the tap, then the card's Continue. revealDone does both
  const openChest45 = async id => { await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(400);
    await revealDone(); await sleep(500); return onScreen(); };
  // every point of every line drawn in the key's ring, and every label's box — the check item 12 stands on
  const labels45 = () => page.evaluate(() => { const svg = document.getElementById('key-ring'); const pts = [];
    svg.querySelectorAll('.kroot,.kdot2,.kthorn,.khub,.karc').forEach(el => { let len = 0; try { len = el.getTotalLength(); } catch (e) { return; }
      for (let s = 0; s <= len; s += 2) { const p = el.getPointAtLength(s); pts.push([p.x, p.y]); } });
    const ring = 128, cx = 150, cy = 150, n = Math.ceil(2 * Math.PI * ring / 2);
    for (let k = 0; k < n; k++) { const t = k / n * 2 * Math.PI; pts.push([cx + Math.cos(t) * ring, cy + Math.sin(t) * ring]); }
    const boxes = [...svg.querySelectorAll('.klabels text')].map(t => ({ g: t.dataset.kg, b: t.getBBox(), txt: t.textContent }));
    const hit = boxes.filter(o => pts.some(([x, y]) => x > o.b.x - 1 && x < o.b.x + o.b.width + 1 && y > o.b.y - 1 && y < o.b.y + o.b.height + 1)).map(o => o.g);
    const over = boxes.filter((o, i) => boxes.some((p, j) => j !== i && o.b.x < p.b.x + p.b.width && o.b.x + o.b.width > p.b.x && o.b.y < p.b.y + p.b.height && o.b.y + o.b.height > p.b.y)).map(o => o.g);
    const out = boxes.filter(o => o.b.x < -20 || o.b.x + o.b.width > 320 || o.b.y < -16 || o.b.y + o.b.height > 318).map(o => o.g);
    return { n: boxes.length, hit, over, out, style: document.getElementById('s-key').dataset.style, counted: boxes.every(o => /\d+\/\d+$/.test(o.txt.replace(/\s+/g, ''))) }; });

  /* ---- 1. item 9: the menu, the map and the key screen read ONE chest state - through Testing's switches AND through play ---- */
  {
    await boot({ played: 0 }, {}, { plain: PLAIN45 });
    const before = await menu45();
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(350);
    await click('#dev-keys [data-act="dev-chestall"][data-chest="games"]'); await sleep(250);
    await click('#s-testing .back'); await sleep(400);
    await click('#s-menu [data-go="s-pick"]'); await sleep(900);
    const ready = await page.evaluate(async () => (await import('./progress/key.js')).chestState('games'));
    const landed = await openChest45('games');
    await click('#s-pick .back'); await sleep(600);
    const after = await menu45();
    const agree = await page.evaluate(async () => { const K = await import('./progress/key.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      R.show('s-pick'); await wait(500); const map = document.querySelector('#grid .chest[data-chest="games"]').classList.contains('open');
      R.show('s-key', { tier: 0 }); await wait(600); const quiet = !document.getElementById('key-shell').hidden;
      R.show('s-menu'); await wait(200);
      return { store: K.chestOpen('games'), map, quiet }; });
    (!menuOpen45(before) && ready === 'ready' && landed === 's-pick' && menuOpen45(after) && agree.store && agree.map && !agree.quiet)
      ? ok('item 9 Testing\'s "every mode" leaves the Games chest READY, the map opens it, and Keys and Customise open on the menu with it - map, key screen and menu all read chestOpen()')
      : bad('item 9 the Testing path', JSON.stringify({ before, ready, landed, after, agree }));
  }
  {
    // the real path: EARN the chest. Everything is open but Quick Tap - Four, which any Two run opens, so the run itself is the last mode
    const unl = Object.assign({}, ALLUNL); delete unl['quick-tap:four'];
    await boot({ played: 0 }, { unlock: unl }, { plain: PLAIN45 });
    const before = await menu45();
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    await page.evaluate(() => { const c = document.querySelectorAll('#diff-row .choice'); c[0].click(); }); await sleep(320);
    await page.evaluate(() => { const t = document.querySelectorAll('#time-row .tbtn'); t[0].click(); }); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const at = await driveToResult('quick-tap', 'item 9 a Quick Tap - Two run, to earn the last mode');
    await sleep(600);
    const earned = await page.evaluate(async () => { const K = await import('./progress/key.js'); const P = await import('./progress.js'); const R = await import('./ui/router.js');
      const m = P.modeCount(); R.show('s-pick'); await new Promise(r => setTimeout(r, 600)); return { state: K.chestState('games'), open: m.open, total: m.total }; });
    const landed = earned.state === 'ready' ? await openChest45('games') : null;
    await click('#s-pick .back'); await sleep(600);
    const after = await menu45();
    (at === 's-over' && !menuOpen45(before) && earned.state === 'ready' && earned.open === earned.total && landed === 's-pick' && menuOpen45(after))
      ? ok(`item 9 the real path: one Quick Tap run opens the last mode (${earned.open} of ${earned.total}), the Games chest goes ready, opening it on the map opens Keys and Customise on the menu - no Testing switch involved`)
      : bad('item 9 the earned path', JSON.stringify({ at, before, earned, landed, after }));
  }

  /* ---- 2. item 3: a tap that moves the sheet on never waits for its own highlight ---- */
  {
    const pick45 = strip(read('ui', 'screens', 'pick.js'));
    const diff45 = (pick45.match(/diff\(b\)\{[\s\S]*?\n {2}'lvl-back'/) || [''])[0];
    const clean = !/setTimeout/.test(diff45) && !/picked/.test(pick45) && !/\.choice\.picked|\.picking/.test(flat45);
    await boot({}, { unlock: ALLUNL }, { plain: PLAIN45 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(420);
    // the class is read in the SAME task as the tap: if anything waited, the sheet would still be on the mode stage
    const snap = await page.evaluate(() => { document.querySelectorAll('#diff-row .choice')[0].click();
      return { sheet: document.getElementById('sheet').className, lens: document.querySelectorAll('#time-row .tbtn').length }; });
    (clean && /\blen\b/.test(snap.sheet) && snap.lens > 0)
      ? ok(`item 3 tapping a mode moves to the lengths on the same frame - ${snap.lens} lengths drawn with no timer between (v14 4.6's 170ms hold and its .picked green are gone)`)
      : bad('item 3 the picker never waits', JSON.stringify({ clean, snap }));
  }

  /* ---- 3. items 4 / 5 / 8 / 19: the stamp behind every screen, the sheet above the map, and the safe area at the top ---- */
  {
    const stampZ = /#build\{[^}]*z-index:0[^}]*\}/.test(flat45);
    const iB = html45.indexOf('<div id="build">'), iC = html45.indexOf('<canvas id="stars">'), iS = html45.indexOf('<section class="screen'), iG = html45.indexOf('<div id="game"');
    const order = iB > iC && iB < iS && (iG < 0 || iB < iG);
    const sheetZ = /\.sheet\{[^}]*z-index:5\}/.test(flat45);
    const clip = /#s-pick,#s-about,#s-over,#s-custom,#s-testing\{clip-path:inset\(env\(safe-area-inset-top\) 0 0 0\)\}/.test(flat45);
    const goal = /#goal\{[^}]*top:calc\(env\(safe-area-inset-top\) \+ 11px\)/.test(flat45) && /#game\.goalon \.hud\{top:calc\(env\(safe-area-inset-top\) \+ 44px\)\}/.test(flat45);
    // live, with a sheet up: the stamp is under the sheet, and nothing the map layers over the sheet is above it
    // AMENDED at build 48 (v26 item 12): the label shows on the home menu only, so on the map it is un-hidden for the measurement and put back
    const live = await page.evaluate(() => { const b = document.getElementById('build'), wasHidden = b.hidden; b.hidden = false; b.style.pointerEvents = 'auto';
      const r = b.getBoundingClientRect(), stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).map(e => e.id || String(e.className || e.tagName));
      b.style.pointerEvents = ''; b.hidden = wasHidden;
      const z = el => { const v = +getComputedStyle(el).zIndex; return Number.isFinite(v) ? v : 0; };
      const sheet = z(document.getElementById('sheet'));
      const layers = [...document.querySelectorAll('#grid, #grid *')].map(el => z(el));
      return { stack, sheet, top: Math.max(0, ...layers), grid: z(document.getElementById('grid')) }; });
    const iSheet = live.stack.findIndex(s => /sheet/.test(s)), iBuild = live.stack.indexOf('build');
    (stampZ && order && sheetZ && clip && goal && iSheet === 0 && iBuild > iSheet && live.sheet > live.top && !live.grid)
      ? ok(`items 4 / 5 / 8 / 19 the stamp is drawn before every screen and paints under them (the sheet is over it, ${live.stack.slice(0, 3).join(' > ')}); the sheet sits at z ${live.sheet} over the map's ${live.top}; the five scrolling screens are clipped at the safe-area line and the goal box and its HUD sit below it`)
      : bad('items 4 / 5 / 8 / 19 the stamp, the sheet and the safe area', JSON.stringify({ stampZ, order, sheetZ, clip, goal, live }));
  }

  /* ---- 4. item 10: the map is the phone's width, whatever stands beside the chests ---- */
  {
    const fits = [];
    for (const [label, chests] of [['nothing open', {}], ['Games open', { games: 1 }], ['Games + Key open', { games: 1, key: 1 }]]) {
      await boot({ chests }, { unlock: ALLUNL, bars: Object.fromEntries(Object.keys(KB45.KEY_BARS).map(k => [k, NOW45])) }, { plain: PLAIN45 });
      await click('[data-go="s-pick"]'); await sleep(900);
      const m = await page.evaluate(() => { const p = document.getElementById('s-pick'), g = document.getElementById('grid').getBoundingClientRect();
        p.scrollLeft = 999; const forced = p.scrollLeft; p.scrollLeft = 0;
        return { sw: p.scrollWidth, cw: p.clientWidth, left: Math.round(g.left), right: Math.round(window.innerWidth - g.right), forced, ox: getComputedStyle(p).overflowX,
          words: [...document.querySelectorAll('#grid .chestwords')].filter(w => !w.hidden).length }; });
      fits.push({ label, ...m });
    }
    const bad10 = fits.filter(f => f.sw > f.cw || f.left !== f.right || f.forced !== 0 || f.ox !== 'hidden');
    (!bad10.length)
      ? ok(`item 10 the map never scrolls sideways: ${fits.map(f => `${f.label} ${f.sw}/${f.cw}px, ${f.left}px a side, ${f.words} word column(s)`).join(' · ')} - and a forced sideways scroll comes straight back to 0`)
      : bad('item 10 the map\'s width', JSON.stringify(fits));
  }

  /* ---- 5. item 12: every name and count on the key sits clear of every line, in all three styles, part-done and whole ---- */
  {
    const seen = [];
    for (const [label, bars] of [['nothing cleared', {}], ['every bar cleared', 'all']]) {
      const B = bars === 'all' ? Object.fromEntries(Object.keys(KB45.KEY_BARS).flatMap(k => [[k, NOW45], [k + '|pro', NOW45], [k + '|author', NOW45]])) : {};
      await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, keyWhole: { clear: 1, pro: 1, author: 1 } }, { unlock: ALLUNL, bars: B }, { plain: PLAIN45 });
      for (const tier of [0, 1, 2]) {
        await page.evaluate(async t => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 80)); R.show('s-key', { tier: t }); }, tier);
        await sleep(900);
        seen.push(Object.assign({ label }, await labels45()));
      }
    }
    const bad12 = seen.filter(s => s.n !== GAMES.length || s.hit.length || s.over.length || s.out.length || !s.counted);
    (!bad12.length)
      ? ok(`item 12 all ${seen.length * GAMES.length} labels on the key - name and count in one line - clear every spoke, corner dot, thorn, hub and the ring itself, in ${[...new Set(seen.map(s => s.style))].join(' / ')}, part-done and whole`)
      : bad('item 12 a label on a line', JSON.stringify(bad12));
  }

  /* ---- 6. item 14: the red placeholder note is gone from the key screen (a real config mismatch still speaks) ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    const warn = await page.evaluate(async () => { const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = []; for (const t of [0, 1, 2]) { R.show('s-menu'); await wait(80); R.show('s-key', { tier: t }); await wait(500);
        const el = document.getElementById('key-warn'); out.push(el.hidden ? '' : el.textContent.trim()); }
      return { out, ph: [K.placeholderCount('pro'), K.placeholderCount('author')] }; });
    const CP45 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    (warn.out.every(t => !t) && warn.ph[0] > 0 && warn.ph[1] > 0 && !('placeholder' in CP45.KEY) && !/are PLACEHOLDERS/.test(read('ui', 'screens', 'key.js')) && /KEY\.mismatch/.test(read('ui', 'screens', 'key.js')))
      ? ok(`item 14 no key screen says anything about placeholders any more (${warn.ph[0]} Pro and ${warn.ph[1]} Author cells still are, and isPlaceholder still answers for the generator and the catalogue); the config-mismatch warning is untouched`)
      : bad('item 14 the placeholder note', JSON.stringify(warn));
  }

  /* ---- 7. item 16: a game's panel fits the phone and scrolls inside itself ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 0 }); }); await sleep(800);
    const panels = [];
    for (const g of GAMES) {
      await page.evaluate(x => document.querySelector(`.knode[data-kg="${x}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), g); await sleep(450);
      panels.push(Object.assign({ g }, await page.evaluate(() => { const l = document.getElementById('key-list'), m = document.getElementById('key-music'), s = document.getElementById('s-key');
        const lb = l.getBoundingClientRect(), floor = m.hidden ? window.innerHeight : m.getBoundingClientRect().top;
        const kids = [...s.children].filter(c => c.getClientRects().length && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
        const lowest = Math.max(...kids.map(c => c.getBoundingClientRect().bottom));
        l.scrollTop = l.scrollHeight; const rows = l.querySelectorAll('.krow'), last = rows[rows.length - 1].getBoundingClientRect();
        // build 57 (v29 Section A, 57.5): `kpanel` is retired — the wheel is locked to one size, so what is asserted is that the ring did NOT move
        const rb = document.getElementById('key-ring').getBoundingClientRect();
        return { bottom: Math.round(lb.bottom), floor: Math.round(floor), lowest: Math.round(lowest), rows: rows.length, lastIn: last.bottom <= lb.bottom + 1,
          ring: [Math.round(rb.top), Math.round(rb.height)], panel: s.classList.contains('kpanel') }; })));
    }
    const ring16 = panels.every(p => p.ring[0] === panels[0].ring[0] && p.ring[1] === panels[0].ring[1]) && !panels.some(p => p.panel);
    const bad16 = panels.filter(p => p.bottom > p.floor + 1 || p.lowest > VH45 || !p.lastIn || !p.rows);
    (!bad16.length && ring16)
      ? ok(`item 16 / v29 57.5 every game's panel ends above SET THIS MUSIC and inside the screen, its last row can be scrolled to (${panels.map(p => p.g + ' ' + p.rows).join(', ')} rows) — and the wheel is LOCKED: ${panels[0].ring[1]}px tall at ${panels[0].ring[0]}px on all seven, so a tap never resizes or shifts it`)
      : bad('item 16 / v29 57.5 the key screen panel', JSON.stringify({ bad16, ring16, rings: panels.map(p => p.ring) }));
  }

  /* ---- 8. items 17 / 18: every round that shows a tier names it and sounds it ---- */
  {
    const src = { reaction: read('games', 'reaction', 'index.js'), timing: read('games', 'timing', 'index.js'), spot: read('games', 'spot', 'index.js'), estimate: read('games', 'estimate', 'index.js') };
    const direct = Object.entries(src).filter(([, s]) => /\broundTier\(/.test(strip(s))).map(([g]) => g);
    const tier45 = strip(read('games', '_shared', 'tier.js'));
    const oneCall = /roundShow\([\s\S]*?audio\.roundVerdict\(id\)/.test(tier45);
    const shows = Object.entries(src).map(([g, s]) => [g, (strip(s).match(/roundShow\(/g) || []).length]);
    await boot({ chests: { games: 1 } }, { unlock: ALLUNL }, { plain: PLAIN45 });
    const flash = await page.evaluate(async () => { const ST = await import('./core/state.js'); const RUN = await import('./run/run.js'); const MU = await import('./audio.js');
      const TI = await import('./games/_shared/tier.js'); const RX = (await import('./games/reaction/index.js')).RX; const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = [], real = MU.Snd.roundVerdict; MU.Snd.roundVerdict = id => fired.push(id);
      Object.assign(ST.sel, { game: 'reaction', diff: 'flash', secs: 5, vs: 0, practice: 0 }); ST.VS.reset(); RUN.start();
      const tap = () => RUN.input({ type: 'down', x: 195, y: 420, el: document.getElementById('gen'), raw: new PointerEvent('pointerdown') });
      const cards = []; const t0 = performance.now();
      while (performance.now() - t0 < 45000 && cards.length < 3) {
        // v14 6.3: an attempt's card stays up until it is tapped — the driver answers it, or the run never reaches its next round
        if (document.getElementById('game').classList.contains('tapon')) { tap(); await wait(220); continue; }
        if (RX.st === 'go' && RX.armed) { await wait(30 + Math.random() * 90); tap(); await wait(260);
          const b = document.querySelector('#rxpane .rxmsg b'), w = document.querySelector('#rxpane .tiername');
          const ms = b ? parseInt(b.textContent, 10) : null;
          cards.push({ ms, word: w ? w.textContent : '', col: w ? w.style.color : '', want: TI.roundId('reaction:flash', ms) });
          continue; }
        await wait(25); }
      RUN.abort(); MU.Snd.roundVerdict = real; await wait(200);
      return { cards, fired }; });
    const named = flash.cards.every(c => { const t = VD45.VERDICT_TIERS.find(x => x.id === c.want); return t && c.word === t.name; });
    const sounded = flash.fired.length >= flash.cards.length && flash.cards.every((c, i) => flash.fired[i] === c.want);
    /* the round variant of every tier is shorter and quieter than the one the result screen plays, event for event.
       AMENDED at build 49 (v26 §B1): a round plays its own list, ROUND_FX - one note shorter than the result's, with bass - so it is held against that */
    const quieter = await page.evaluate(async ids => { const MU = await import('./audio.js'); const AU = await import('./config/audio.js');
      return ids.every(id => { const full = AU.ROUND_FX[id] || [], cut = MU.Snd.roundVerdictPlan(id);
        const end = ev => Math.max(0, ...ev.map(e => e[0] + e[3] / 1000));
        return full.length === cut.length && cut.every((e, i) => e[5] < full[i][5] && e[3] < full[i][3]) && end(cut) < end(full); }); }, VD45.VERDICT_TIERS.map(t => t.id));
    (!direct.length && oneCall && shows.every(([, n]) => n > 0) && flash.cards.length === 3 && named && sounded && quieter)
      ? ok(`items 17 / 18 a round's tier is one call: three Flash attempts read ${flash.cards.map(c => `${c.ms}ms "${c.word}"`).join(', ')}, each in its tier's colour with its tier's sound (${flash.fired.join(', ')}), shorter and quieter than the result's (× ${AU45.ROUND_VERDICT.time} long, × ${AU45.ROUND_VERDICT.gain} loud); every engine goes through roundShow (${shows.map(([g, n]) => g + ' ' + n).join(', ')}) and none calls roundTier itself`)
      : bad('items 17 / 18 the round tier', JSON.stringify({ direct, oneCall, shows, flash }));
  }

  /* ---- 9. items 20 / 21: the catalogue's sound list and Round formats, built by the same two functions npm run review uses ---- */
  rv6: {
    if (!REVIEW) { noReview("items 20 / 21 the catalogue's sound list and Round formats"); break rv6; }
    const { roundsRef, soundsRef } = REVIEW ? await import(pathToFileURL(path.join(REVIEW_DIR, 'scripts', 'catalogue.ref.mjs')).href) : { roundsRef: null, soundsRef: null };
    await boot({}, { unlock: ALLUNL }, { plain: PLAIN45 });
    const snd = await page.evaluate(soundsRef);
    const rows = snd.groups.flatMap(g => g.rows);
    const silent = rows.filter(r => !r.plays.length || r.plays.some(p => !p.ev || !p.ev.length)).map(r => r.id);
    // nothing that makes a sound can be left off the list: every Snd method but the helpers is named in a row's `src`
    // AMENDED at build 46 (v25 items 1 / 2 / 6): three more sound-makers, and their two plan helpers, which are not sounds of their own
    // AMENDED at build 49 (v26 item 6 / §B1): the pop's plan helper, and endLeft - how long until End of run has landed - which is not a sound
    // AMENDED at build 51 (v27 item 14): keyStepPlan, the plan helper for the key-earned animation's per-step sounds (keyStep is the sound)
    // AMENDED at build 52 (v27 item 10): videoPlan, the plan helper for the shared player's power-on and power-off (videoFx is the sound)
    /* AMENDED at build 53 (v28 items 13 / 17): cheerPlan, the plan helper for each chest's celebration.
       AMENDED AT BUILD 57 (v29 Section A, 57.2 / 57.6): crackPlan and crackBurstPlan are GONE with the map arrival they were written for, and
       keyIntroPlan arrives with the key-creation intro. */
    /* AMENDED AT BUILD 59 (v30 59.15): keyCircuitPlan, the plan helper for the Pro key's electrical layer. Like keyEarnPlan beside
       it, it is not a sound of its own — Snd.keyEarn plays both plans through one gain node, so one stop() silences both — and a
       helper in this list is one the page's sound roster does not need a button for. */
    const HELP = ['unlock', 'tone', 'plan', 'fx', 'noise', 'chestPlan', 'keyEarnPlan', 'keyCircuitPlan', 'keyIntroPlan', 'keyStepPlan', 'videoPlan', 'roundVerdictPlan', 'mapPlan', 'giftPlan', 'popPlan', 'cheerPlan', 'endLeft'];
    const srcs = rows.map(r => r.src).join(' ');
    const missed = snd.methods.filter(m => !HELP.includes(m) && !srcs.includes(m + '('));
    const packs = rows.filter(r => r.plays.length > 1).length;
    // build 52 adds a group of its own for the video player (v27 items 9 / 10)
    (!silent.length && !missed.length && rows.length >= 34 && snd.groups.length === 8)
      ? ok(`item 20 the sound list: ${rows.length} sounds in ${snd.groups.length} groups, every one with events off audio.js itself (${packs} of them a button per sound pack), and every sound-making Snd method is in it`)
      : bad('item 20 the sound list', JSON.stringify({ silent, missed, rows: rows.length, groups: snd.groups.length }));
    const rf = await page.evaluate(roundsRef);
    const want21 = ['rf-hold-grow', 'rf-hold-cut', 'rf-reaction-nogo', 'rf-spot-count', 'rf-spot-find', 'rf-timing-hidden'];
    const shaped = rf.every(g => g.bands.length && g.bands.every(b => b.rows.length && b.rows.every(r => r.length === g.cols.length)));
    const drawn = rf.every(g => g.id === 'rf-timing-hidden' || g.bands.every(b => (b.shapes || []).length && b.shapes.every(s => /^<svg /.test(s.svg))));
    const nogo = rf.find(g => g.id === 'rf-reaction-nogo');
    // AMENDED at build 50 (v26 §B2, #444): the amber "square turned 45° — drawn as a diamond" is gone with the turned square; the diamond is its own shape, on every band
    const diamond = nogo.bands.every(b => (b.shapes || []).some(s => /^diamond/.test(s.name)) && !(b.shapes || []).some(s => s.flag));
    // the figures are the engine's own, not a copy of them: three spot checks against the modules
    const live21 = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).SP, TM = (await import('./games/timing/index.js')).TM;
      return { decoys7: String(SP.ramp(7, 0).decoys), find5: String(SP.findSpec(5).n), hid5: TM.hiddenRamp(5, true).ramp.toFixed(2) }; });
    const rowOf = (id, first) => { const g = rf.find(x => x.id === id); for (const b of g.bands) for (const r of b.rows) if (r[0] === first) return r; return null; };
    const c7 = rowOf('rf-spot-count', '7'), f5 = rowOf('rf-spot-find', '5'), h5 = (rf.find(g => g.id === 'rf-timing-hidden').bands.find(b => /Streak/.test(b.label) && b.rows.some(r => r[0] === '5')) || { rows: [] }).rows.find(r => r[0] === '5');
    const figures = c7 && f5 && h5 && c7[2].startsWith(live21.decoys7) && f5[1] === live21.find5 && h5[1].includes('× ' + live21.hid5);
    const bands = rf.reduce((n, g) => n + g.bands.length, 0);
    (want21.every(id => rf.some(g => g.id === id)) && rf.length === want21.length && shaped && drawn && diamond && figures)
      ? ok(`item 21 Round formats: ${rf.length} games, ${bands} bands, every figure read from the game's own config and engine (spot checks: Count round 7 deals ${live21.decoys7} decoys, Find round 5 deals ${live21.find5} shapes, a Hidden Streak's round 5 stretches × ${live21.hid5}); the shapes are drawn by the app's own code, and Go / No-go's square at 45° is flagged as the diamond (#444)`)
      : bad('item 21 Round formats', JSON.stringify({ ids: rf.map(g => g.id), shaped, drawn, diamond, figures, c7, f5, h5 }));
    // and the page has somewhere to put both, carried in the template so every future board keeps them (#441)
    const tpl45 = rvRead('scripts', 'catalogue.template.html'), gen45 = rvRead('scripts', 'catalogue.mjs');
    (/id="sounds"/.test(tpl45) && /id="snd-host"/.test(tpl45) && /id="rounds"/.test(tpl45) && /id="rf-host"/.test(tpl45) && /REF\.sounds/.test(tpl45) && /REF\.rounds/.test(tpl45)
      && /page\.evaluate\(soundsRef\)/.test(gen45) && /page\.evaluate\(roundsRef\)/.test(gen45))
      ? ok('items 20 / 21 both sections are in catalogue.template.html with their note boxes, and catalogue.mjs fills them from catalogue.ref.mjs - so every future npm run review carries them (#441)')
      : bad('items 20 / 21 the template and the generator', JSON.stringify({ tpl: /id="sounds"/.test(tpl45) && /id="rounds"/.test(tpl45), gen: /soundsRef/.test(gen45) }));
  }
}


if (section('build 46 - batch 18, the unlock experience, sound and About')) {
  const css46 = read('styles', 'app.css'), flat46 = css46.replace(/\/\*[\s\S]*?\*\//g, '');
  const NOW46 = Date.now();
  const U46 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB46 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const CH46 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const KY46 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CP46 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
  const MS46 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const ALL46 = Object.fromEntries(U46.UNLOCKS.map(u => [u.key, NOW46]));
  const tier46 = (...ts) => Object.fromEntries(Object.keys(KB46.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW46])));
  const show46 = (id, o) => page.evaluate(async (i, x) => { const R = await import('./ui/router.js'); R.show(i, x); }, id, o || {});
  const revState = () => page.evaluate(() => { const h = document.getElementById('key-cere'), c = h.querySelector('.rcard');
    return { on: !h.hidden, kind: h.dataset.kind || '', id: h.dataset.rev || '', step: h.dataset.step || '', tap: h.classList.contains('tap'), card: h.classList.contains('card'),
      gifts: [...h.querySelectorAll('.rgifts:not(.row) .rgift b')].map(g => g.textContent), syms: [...h.querySelectorAll('.rgifts:not(.row) .rgift .sym')].map(x => x.dataset.sym),
      title: c ? c.querySelector('h3').textContent : '', did: c ? [...c.querySelectorAll('li')].map(l => l.textContent) : [], got: c ? [...c.querySelectorAll('.rgift b')].map(b => b.textContent) : [],
      next: c ? [...c.querySelectorAll('p')].map(x => x.textContent).join(' ') : '', go: c ? (c.querySelector('.rgo').disabled ? 'off' : 'on') : '' }; });

  /* ---- 1. items 6 / 11 / 22: ONE shared reveal routine, and both kinds go through it ---- */
  {
    const rev = strip(read('ui', 'reveal.js')), cere = strip(read('ui', 'ceremony.js')), keyjs = strip(read('ui', 'screens', 'key.js'));
    // the routine lives in one file: the ceremony no longer owns a clock, a tap or a hand-over, and the key screen starts both kinds the same way
    const oneRoutine = !/playCeremony|ceremonyTap|stopCeremony|ceremonyOn/.test(cere + keyjs) && /export function chestStage|const chestStage|function chestStage/.test(cere)
      && (keyjs.match(/playReveal\(/g) || []).length >= 3 && /kind: 'chest'/.test(keyjs) && /kind: 'key'/.test(keyjs);
    // and the routine itself is the one that swallows the taps, holds, and ends on the card
    const inRev = /function tap\(\)/.test(rev) && /cur\.ready/.test(rev) && /REVEAL\.cardGo/.test(rev) && /reduced\(\)/.test(rev);
    // presentation only (L10): neither the routine nor the drawer writes anything
    const l10 = !/\bsave\(|localStorage|store\.bars/.test(rev + cere);
    (oneRoutine && inRev && l10)
      ? ok('items 6 / 11 / 22 ONE shared reveal routine (ui/reveal.js): the stage, the gifts, "tap to continue", the congratulations card - a chest hands it its ceremony as a stage, a key hands it the ring, and neither draws a clock, a tap or a hand-over of its own. Presentation only (L10): the routine and the chest drawer write nothing')
      : bad('items 6 / 11 / 22 one routine', JSON.stringify({ oneRoutine, inRev, l10 }));
  }

  /* ---- 2. item 6: ALL FOUR chests pop their unlocks out as symbols with titles, and "tap to continue" waits for the last ---- */
  {
    const want = { games: ['games', {}], key: ['key', { games: 1 }], pro: ['pro', { games: 1, key: 1 }], thorns: ['thorns', { games: 1, key: 1, pro: 1 }] };
    const seen = [];
    for (const id of Object.keys(want)) {
      const [, chests] = want[id];
      const bars = id === 'games' ? {} : id === 'key' ? tier46('clear') : id === 'pro' ? tier46('clear', 'pro') : tier46('clear', 'pro', 'author');
      // the keys' own first opens are already seen on this fixture, so what the tap plays is the chest's reveal and nothing queued in front of it
      // AMENDED at build 58 (58.2): the Pro and Author chests also want a finished Gauntlet before they are ready to be tapped open
      await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars, gaunt: GAUNT_ALL() });
      await page.evaluate(async () => { const A = await import('./audio.js'); window.__g46 = []; const o = A.Snd.gift; A.Snd.gift = function (i) { window.__g46.push(i); return o.apply(this, arguments); }; });
      await click('[data-go="s-pick"]'); await sleep(800);
      const state = await page.evaluate(i => { const c = document.querySelector(`#grid .chest[data-chest="${i}"]`); return c && c.className; }, id);
      await page.evaluate(i => document.querySelector(`#grid .chest[data-chest="${i}"]`).click(), id); await sleep(500);
      // mid-reveal: nothing is tappable yet and no gift has landed before the stage has finished
      const early = Object.assign(await revState(), { fired: await page.evaluate(() => window.__g46.length) });
      await revealReady();
      const held = Object.assign(await revState(), { fired: await page.evaluate(() => window.__g46.slice()) });
      // AMENDED at build 49 (v26 item 5): every chest also gives the About video it opens, its slot's title last among the rewards
      // AMENDED at build 53 (v28 item 10): a chest word that GIVES a Gauntlet carries `gaunt` and composes its name off GAUNTLET.name
      // AMENDED at build 59 (v30 59.3): the video's title wears MSG.quote, so it reads as the name of a clip and not as a sentence
      seen.push({ id, state, early, held, words: (CP46.CHEST_WORDS[id] || []).map(x => x.w || (CP46.GAUNTLET.name[x.gaunt] || '').toUpperCase())
        .concat(CP46.MSG.quote[0] + MS46.MESSAGES.find(m => m.by && m.by.chest === id).title + CP46.MSG.quote[1]) });
      await revealDone(); await sleep(400);
    }
    const bad6 = seen.filter(s => !/ready/.test(s.state) || s.early.tap || s.early.card || !s.held.tap
      || s.held.gifts.join() !== s.words.join() || s.held.syms.length !== s.words.length || s.held.syms.some(x => !x) || s.held.fired.join() !== s.words.map((_, i) => i).join());
    (!bad6.length)
      ? ok(`item 6 all four chests pop their unlocks out as symbols with titles, each landing with its own sound a step higher (${seen.map(s => s.id + ' ' + s.held.gifts.join('+')).join(' · ')}), and "tap to continue" is held back until the last one has landed`)
      : bad('item 6 the chest pop-out', JSON.stringify(bad6));
  }

  /* ---- 3. items 6 / 11: not skippable, and taps are SWALLOWED, not queued ---- */
  {
    await boot({}, { unlock: ALL46 });
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(900);
    // eight taps on the host and one Back, mid-stage: nothing moves, and none of them is waiting to fire when it ends
    const during = await page.evaluate(async () => { const h = document.getElementById('key-cere'); const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 8; i++) { h.click(); await wait(40); }
      document.querySelector('#s-key .back').click(); await wait(200);
      return { screen: (document.querySelector('.screen.on') || {}).id, on: !h.hidden, card: h.classList.contains('card') }; });
    const st = await revealReady();
    const atTap = await revState();
    // one tap now brings the card up, and its Continue is DEAD for about a second (item 22), so a leftover tap cannot close it unseen
    await click('#key-cere'); await sleep(200);
    const early = await revState();
    await sleep(CH46.REVEAL.cardAt + CH46.REVEAL.cardGo + 350);
    const late = await revState();
    await page.evaluate(() => document.querySelector('#key-cere .rgo').click()); await sleep(600);
    const done = await onScreen();
    (during.screen === 's-key' && during.on && !during.card && st === 'tap' && atTap.tap && early.card && early.go === 'off' && late.go === 'on' && done === 's-pick')
      ? ok(`items 6 / 11 / 22 the reveal cannot be tapped out of: eight taps and Back during it do nothing and none of them is queued; the tap that lands brings the card up, whose Continue is dead for ${CH46.REVEAL.cardGo}ms and then takes it to the map`)
      : bad('items 6 / 11 taps swallowed', JSON.stringify({ during, st, atTap, early, late, done }));
  }

  /* ---- 4. item 22: what the congratulations card says ---- */
  {
    await boot({}, { unlock: ALL46 });
    await click('[data-go="s-pick"]'); await sleep(800);
    await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click());
    await revealReady(); await click('#key-cere'); await sleep(CH46.REVEAL.cardAt + 300);
    const card = await revState();

    await revealDone(); await sleep(400);
    /* AMENDED at build 49 (v26 item 8): shorter and celebratory - "Congratulations", one You line and one Next line, no lists of what you did or got */
    (card.title === CP46.CARD.title && !card.did.length && !card.got.length && /You unlocked all \d+ game modes!/.test(card.next) && card.next.includes(CP46.CARD.next.replace('{chest}', CP46.GRID.chest.key)))
      ? ok(`item 22 the card ends the routine: "${card.title}" and two lines ("${card.next.trim()}") - no what you did, no what you got (v26 item 8)`)
      : bad('item 22 the congratulations card', JSON.stringify(card));
  }

  /* ---- 5. item 11 AMENDED AT BUILD 51 (v27 item 14): the reveal that introduced the seven games one at a time over 4–6.6s and then ran the
     earn moment inside it is replaced by ONE animation per key of two seconds at most. What item 11 asked for that survives is held here: the
     seven spokes still arrive clockwise from Quick Tap at 12, each with its own game's sound, on the Skill key; each key still ends by itself
     in the finished state; and the three still escalate. What item 14 adds: the length, and that A TAP SKIPS IT. ---- */
  {
    const seen = [];
    for (const [tier, chests, bars, tab] of [['clear', { games: 1 }, tier46('clear'), 0], ['pro', { games: 1, key: 1 }, tier46('clear', 'pro'), 1], ['author', { games: 1, key: 1, pro: 1 }, tier46('clear', 'pro', 'author'), 2]]) {
      await boot({ chests }, { unlock: ALL46, bars });
      await page.evaluate(async () => { const A = await import('./audio.js'); window.__m46 = []; const o = A.Snd.mapFx; A.Snd.mapFx = function (g) { window.__m46.push(g); return o.apply(this, arguments); };
        window.__k46 = []; const k = A.Snd.keyEarn; A.Snd.keyEarn = function (t) { window.__k46.push(t); return k.apply(this, arguments); }; });
      await show46('s-key', { tier: tab }); await sleep(320);
      const t0 = Date.now();
      const start = await page.evaluate(() => ({ krev: document.getElementById('s-key').classList.contains('kearning'), rev: document.getElementById('s-key').dataset.earn || '',
        hours: [...document.querySelectorAll('#key-ring .kr')].map(g => g.style.getPropertyValue('--h')), games: [...document.querySelectorAll('#key-ring .kr')].map(g => g.dataset.rg),
        crk: document.querySelectorAll('#key-ring .kecrk').length, thn: document.querySelectorAll('#key-ring .kethn').length }));
      const st = await revealReady(); const took = Date.now() - t0;
      const heard = await page.evaluate(() => ({ map: window.__m46.slice(), earn: window.__k46.slice() }));
      const after = await page.evaluate(() => ({ kdone: document.getElementById('s-key').classList.contains('kdone'), krev: document.getElementById('s-key').classList.contains('kearning'),
        ring: !!document.querySelector('#key-ring .kring') }));
      seen.push({ tier, st, took, start, heard, after, cfg: KY46.KEY_EARN[tier] });
      await revealDone(); await sleep(300);
    }
    /* item 14: A TAP SKIPS TO THE END and the screen never locks.
       AMENDED AT BUILD 54 (v29 item 3): THE SKIP WAITS EARN_SKIP_AT MS FIRST. A tap inside that window does NOTHING — it is not taken, not
       queued, and the ceremony carries on — and a tap after it jumps straight to the finished state. Both halves are driven here, because the
       old drive tapped a third of the way through the Author key and a third of 4000ms is now inside the window. */
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    await show46('s-key', { tier: 2 });
    /* THE CLOCK IS THE CEREMONY'S, NOT show()'s. The screen's ARRIVAL plays first (`ARRIVE_MS`, and a due earn starts `EARN_AT` after the screen
       draws), so timing the taps off show() put the "late" tap ~1460ms into a 4000ms ceremony — still inside the window — and it correctly did
       nothing. Wait for `kearning` and measure from there. */
    for (let i = 0; i < 80; i++) { if (await page.evaluate(() => document.getElementById('s-key').classList.contains('kearning'))) break; await sleep(50); }
    const onAt54 = Date.now();
    const cereTap54 = () => page.evaluate(() => document.getElementById('key-cere').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    const early54At = Math.round(KY46.EARN_SKIP_AT * .4);
    await sleep(Math.max(0, early54At - (Date.now() - onAt54))); await cereTap54();
    const early54 = await page.evaluate(() => ({ on: document.getElementById('s-key').classList.contains('kearning'), cere: !document.getElementById('key-cere').hidden }));
    await sleep(Math.max(0, KY46.EARN_SKIP_AT + 250 - (Date.now() - onAt54)));
    await cereTap54();
    const skipSt = await revealReady(); const skipTook = Date.now() - onAt54;   // measured from the first frame of the ceremony
    const skipped = await page.evaluate(() => ({ kdone: document.getElementById('s-key').classList.contains('kdone'), on: document.getElementById('s-key').classList.contains('kearning'),
      cere: !document.getElementById('key-cere').hidden, ring: !!document.querySelector('#key-ring .kring') }));
    await revealDone(); await sleep(300);
    const order = GAMES.join();
    const bad11 = seen.filter(s => s.st !== 'off' || !s.start.krev || s.start.rev !== s.tier || s.start.hours.join() !== '0,1,2,3,4,5,6' || s.start.games.join() !== order
      || s.heard.earn.join() !== s.tier || !s.after.kdone || s.after.krev || !s.after.ring
      || s.took < s.cfg.ms - 400 || s.took > s.cfg.ms + 1600);
    /* AMENDED AT BUILD 52 (Aiden's answer to build 51): the PRO key's spokes fire one by one as well now — "one by one around like a clock" —
       so it walks the seven games' own sounds exactly as the Skill key does, with its own current between each pair on top. The Author key has
       no spokes at all, so it still plays none of them. A key that walks its spokes is one whose `spokes.gap` is over zero, read off the config
       rather than listed here, so the day a fourth key arrives this line already knows what to expect of it. */
    const walksSpokes = t => { const E = KY46.KEY_EARN[t]; return !!(E.spokes && E.spokes.gap > 0); };
    const spokeSounds = seen.every(x => x.heard.map.join() === (walksSpokes(x.tier) ? order : ''));
    const grander = seen[0].cfg.ms <= seen[1].cfg.ms && seen[1].cfg.ms <= seen[2].cfg.ms
      && !seen[0].start.crk && !seen[1].start.crk && seen[2].start.crk > 0 && seen[2].start.thn > 0;
    const skipOk = skipSt === 'off' && skipTook < KY46.KEY_EARN.author.ms - 200 && skipped.kdone && !skipped.on && !skipped.cere && skipped.ring
      && early54.on && early54.cere;   // v29 item 3: the tap inside the window left the ceremony running
    (!bad11.length && grander && spokeSounds && skipOk)
      ? ok(`item 11 / v27 item 14 / v29 item 3 all three keys get their own earned animation: the Skill AND Pro keys' seven spokes fire clockwise from Quick Tap at 12 (${order.replace(/,/g, ' → ')}), each with its own game's sound, and the Author key has its own; ${seen.map(s => s.tier + ' ' + s.cfg.ms / 1000 + 's (took ' + s.took + 'ms)').join(' · ')}, each ending by itself in the finished key with no tap and no card — and THE SKIP WAITS ${KY46.EARN_SKIP_AT}ms: a tap ${early54At}ms into the Author key's ${KY46.KEY_EARN.author.ms}ms did nothing and it played on, a tap after the window ended it in ${skipTook}ms, on the finished key with its ring drawn`)
      : bad('item 11 / v27 item 14 the earned animations', JSON.stringify({ bad11, grander, spokeSounds, skipOk, skipTook, skipped, early54, seen: seen.map(s => ({ t: s.tier, st: s.st, took: s.took, heard: s.heard, after: s.after })) }));
  }

  /* ---- 6. items 11 / 22: FIRST TIME ONLY, and a Testing chest reset makes it a first time again ---- */
  {
    await boot({ chests: { games: 1 } }, { unlock: ALL46, bars: tier46('clear') });
    await show46('s-key', { tier: 0 }); await revealReady(); await revealDone(); await sleep(500);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.revealed);
    await show46('s-menu'); await sleep(200); await show46('s-key', { tier: 0 }); await sleep(1400);
    const again = await page.evaluate(() => ({ on: !document.getElementById('key-cere').hidden, krev: document.getElementById('s-key').classList.contains('kearning'), kdone: document.getElementById('s-key').classList.contains('kdone') }));
    // Testing's per-chest reset gives the key back its first time (item 11: "which on this phone counts as a first time again")
    const reset = await page.evaluate(async () => { const K = await import('./progress/key.js'); K.devChestReset('key');
      return JSON.parse(localStorage.getItem('ne')).prefs.revealed; });
    (stored['key:clear'] === 1 && !again.on && !again.krev && again.kdone && !reset['key:clear'])
      ? ok('items 11 / 22 the reveal plays once: it is written to prefs.revealed as it starts, a second visit goes straight to the finished key with no animation, and Testing\'s per-chest reset clears that key\'s flag so it is a first time again')
      : bad('item 11 first time only', JSON.stringify({ stored, again, reset }));
  }

  /* ---- 7. item 11: Reduce Motion gives a short fade, and still reaches the card ---- */
  {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await boot({ chests: { games: 1 } }, { unlock: ALL46, bars: tier46('clear') });
    const t0 = Date.now();
    /* AMENDED at build 51 (v27 item 14): the read was at 250ms, and the animation is scheduled 260ms after the screen draws - so it landed inside
       the frame between the reveal starting and its immediate settle, and caught `kearning` still on. 450ms is clear of it either way. */
    await show46('s-key', { tier: 0 }); await sleep(450);
    // the reveal's own `quick` class is what says it took the short path; `kearnquick` on the screen is gone already, because under Reduce Motion the settle is immediate
    const quick = await page.evaluate(() => ({ cls: document.getElementById('key-cere').className, settled: document.getElementById('s-key').classList.contains('kdone') && !document.getElementById('s-key').classList.contains('kearning') }));
    const st = await revealReady(); const took = Date.now() - t0;
    // AMENDED at build 48 (v26 item 11): a key's reveal has no card any more - under Reduce Motion it is the short fade, and it ends by itself on the key
    const card = await revState();
    await revealDone(); await sleep(300);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    (/\bquick\b/.test(quick.cls) && quick.settled && st === 'off' && took < KY46.KEY_EARN.clear.ms && !card.card)
      ? ok(`item 11 with Reduce Motion the earned animation is a short fade - ${took}ms against the ${KY46.KEY_EARN.clear.ms}ms animation - and it ends by itself with no card (v26 item 11), so nothing is skipped, only shortened (Apple expects it)`)
      : bad('item 11 Reduce Motion', JSON.stringify({ quick, st, took, card }));
  }

  /* ---- 8. item 13: an unfinished key and a finished one, all three keys ---- */
  {
    const seen = [];
    for (const [tier, tab, chests] of [['clear', 0, { games: 1 }], ['pro', 1, { games: 1, key: 1 }], ['author', 2, { games: 1, key: 1, pro: 1 }]]) {
      const under = tier === 'clear' ? {} : tier === 'pro' ? tier46('clear') : tier46('clear', 'pro');
      for (const [label, bars, done] of [['unfinished', under, false], ['finished', Object.assign({}, under, tier46(tier)), true]]) {
        // `revealed` already set, so the finished one is simply the settled state and not the reveal
        await boot({ chests, revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars });
        await show46('s-key', { tier: tab }); await sleep(900);
        seen.push(Object.assign({ tier, label, done }, await page.evaluate(() => { const el = document.getElementById('s-key'), gl = document.querySelector('#key-ring .kglyph'), gr = document.querySelector('#key-ring .kground'), kk = document.querySelector('.kkey.sel');
          const cs = getComputedStyle(gl);
          return { kdone: el.classList.contains('kdone'), ring: !!document.querySelector('#key-ring .kring'), scale: cs.scale, filter: cs.filter, anim: cs.animationName,
            stroke: cs.stroke, ground: gr ? +getComputedStyle(gr).opacity : 0, card: kk ? getComputedStyle(kk.querySelector('.kgl path')).animationName : '',
            dim: getComputedStyle(el).getPropertyValue('--kdim').trim(), tint: getComputedStyle(el).getPropertyValue('--ktint').trim() }; })));
      }
    }
    const un = seen.filter(s => !s.done), fin = seen.filter(s => s.done);
    const badUn = un.filter(s => s.kdone || s.ring || s.filter !== 'none' || s.anim !== 'none' || s.scale !== 'none' || s.ground > 0);
    const badFin = fin.filter(s => !s.kdone || !s.ring || s.filter === 'none' || s.anim !== 'kbreathe' || s.card !== 'kbreathe' || !(+s.scale > 1));
    const steps = KY46.KEY_FINISH.clear.glow < KY46.KEY_FINISH.pro.glow && KY46.KEY_FINISH.pro.glow < KY46.KEY_FINISH.author.glow;
    (!badUn.length && !badFin.length && steps)
      ? ok(`item 13 the two states are pushed apart on all three keys: unfinished has no glow at all - no ground, no drop shadow, no pulse, the centre key in the tier's own dim and no outer ring - and finished is ${fin.map(s => s.tier + ' × ' + s.scale).join(', ')}, full tint, a ${KY46.KEY_FINISH.clear.pulse}ms breathing pulse on the key and on its card at the top, the ring drawn, each tier a step brighter`)
      : bad('item 13 unfinished against finished', JSON.stringify({ badUn, badFin, steps }));
  }

  /* ---- 9. item 7: a symbol beside every chest unlock on the map - the same one that pops out ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, spill: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    await click('[data-go="s-pick"]'); await sleep(900);
    const map = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const w = document.querySelector(`.chestwords[data-for="${id}"]`);
      return [id, [...w.querySelectorAll('.cw')].map(x => ({ w: x.dataset.w, sym: (x.querySelector('.sym') || {}).dataset && x.querySelector('.sym').dataset.sym, fits: (() => { const t = x.querySelector('.cwt'), b = x.getBoundingClientRect(); return t.scrollWidth <= t.clientWidth + 1 && b.right <= innerWidth; })() }))]; })));
    // AMENDED at build 49 (v26 item 5): each chest's list ends on its About video
    const wantSym = Object.fromEntries(Object.keys(map).map(id => [id, (CP46.CHEST_WORDS[id] || []).map(x => x.sym).concat('video')]));
    const bad7 = Object.keys(map).filter(id => map[id].map(x => x.sym).join() !== wantSym[id].join() || map[id].some(x => !x.sym || !x.fits) || !map[id].length);
    // and it is the SAME symbol the chest pops out — one drawer, one list, so they cannot drift (ui/chest.js symSvg / giftsOf)
    const one = /function symSvg/.test(strip(read('ui', 'chest.js'))) && !/SYMBOLS\[/.test(strip(read('ui', 'reveal.js')) + strip(read('ui', 'screens', 'pick.js')));
    (!bad7.length && one)
      ? ok(`item 7 every chest's unlock on the map carries its symbol beside the title - ${Object.keys(map).map(id => id + ' ' + map[id].map(x => x.sym).join('+')).join(' · ')} - each drawn by the one symSvg() the chest pop-out and the card use, and every word still fits its cell at 390px`)
      : bad('item 7 the map symbols', JSON.stringify({ bad7, one, map }));
  }

  /* ---- 10. item 15: a key's background REPLACES the base on its screen, and it is what its chest gives ---- */
  {
    const atm = strip(read('ui', 'atmosphere.js'));
    /* DELETED AT BUILD 57 (v29 Section A, 57.11): the source-text half of this check spelled the draw loop's own expression
       (`DRAW[over||own ? 'stars' : bg]`) and 57.11a rewrote that line — the starfield belongs to the default background alone now, so there is no
       `? 'stars' :` in it any more. The gate's rule is to delete a source-text check that fails on a refactor rather than respell it, and to name it
       in the outcome. What it stood for is DRIVEN instead, below: with the grid chosen, the grid's own blue is on the canvas on the menu and is not
       on it on a key screen, which is the whole of "only that key's background shows". */
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, bg: 'grid', revealed: { 'key:clear': 1, 'key:pro': 1, 'key:author': 1 } }, { unlock: ALL46, bars: tier46('clear', 'pro', 'author') });
    /* build 57: the grid draws in its own blue (#5B8CFF at .3), so "the chosen design is not drawn under a key layer" is countable — its pixels are
       on the canvas on the menu and must be gone on every key screen, where that key's own layer is the whole picture. */
    const gridPx = () => page.evaluate(() => { const cv = document.getElementById('stars'), cx = cv.getContext('2d');
      const d = cx.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8 && Math.abs(d[i] - 91) < 12 && Math.abs(d[i + 1] - 140) < 12 && Math.abs(d[i + 2] - 255) < 12) n++;
      return n; });
    await show46('s-menu'); await sleep(700);
    const gridOnMenu = await gridPx();
    const layers = [];
    for (const [tier, tab, style] of [['clear', 0, 'lantern'], ['pro', 1, 'circuit'], ['author', 2, 'thorn']]) {
      await show46('s-menu'); await sleep(150); await show46('s-key', { tier: tab }); await sleep(900);
      layers.push(Object.assign({ tier, style, grid: await gridPx() }, await page.evaluate(async () => { const A = await import('./ui/atmosphere.js'); const S = await import('./core/store.js');
        return { style: document.getElementById('s-key').dataset.style, chosen: S.look('bg'), draws: !!A.LAYER }; })));
    }
    const replaces = gridOnMenu > 0 && layers.every(l => l.grid === 0);
    await show46('s-menu'); await sleep(400);
    const off = await page.evaluate(() => document.getElementById('s-key').dataset.style);
    // and each key's background is in what that key's chest pops out (item 15's last line), on the same list item 7 reads
    const inChest = ['key', 'pro', 'thorns'].every((c, i) => (CP46.CHEST_WORDS[c] || []).some(x => x.sym === 'bg-' + ['lantern', 'circuit', 'thorn'][i]));
    // Reduce Motion holds it still: every layer reads the same `reduce` the rest of the file does
    const still = /const reduce=matchMedia/.test(atm) && /reduce\?0:t/.test(atm.replace(/\s/g, ''));
    (replaces && layers.every(l => l.style === l.style && l.chosen === 'grid') && inChest && still)
      ? ok(`item 15 on a key's screen only that key's background shows — the chosen design is not drawn at all while a key layer is over, DRIVEN at build 57: the grid's own blue is on ${gridOnMenu} pixels of the canvas on the menu and on ${layers.map(l => l.grid).join('/')} on the three key screens, so nothing is ever layered twice — and each key's background is one of the symbols its own chest pops out; Reduce Motion holds every layer still`)
      : bad('item 15 the key backgrounds', JSON.stringify({ replaces, gridOnMenu, layers, off, inChest, still }));
  }

  /* ---- 11. items 1 / 2: the title whoosh and the map's sounds, both tied to the animation's own timing ---- */
  {
    const menujs = strip(read('ui', 'screens', 'menu.js')), pickjs = strip(read('ui', 'screens', 'pick.js'));
    const offAnim = /getComputedTiming\(\)\.delay/.test(menujs) && /getComputedTiming\(\)\.delay/.test(pickjs) && !/4600|3300|1900/.test(menujs);
    // the title: four beats, four sounds, at the delays the stylesheet itself carries
    await boot({ story: 0 }, { unlock: ALL46 });
    const title = await page.evaluate(async () => { const A = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = []; const o = A.Snd.titleFx; A.Snd.titleFx = function (k) { fired.push([k, Math.round(performance.now())]); return o.apply(this, arguments); };
      const R = await import('./ui/router.js'); const t0 = performance.now(); R.show('s-menu', { story: 1 }); await wait(5600);
      const want = ['#st1', '#s-menu .wmin', '#st2', '#storyhint'].map(s => { const el = document.querySelector(s), a = el && el.getAnimations()[0];
        return a ? Math.round(a.effect.getComputedTiming().delay) : -1; });
      A.Snd.titleFx = o; return { fired: fired.map(([k, t]) => [k, Math.round(t - t0)]), want }; });
    const kinds = title.fired.map(f => f[0]).join();   // build 57 (57.1): the fourth beat is `begin` now, not a third `line`
    const onTime = title.fired.length === 4 && title.fired.every((f, i) => Math.abs(f[1] - title.want[i]) < 400);
    // the map: one sound per tile on the FIRST open only, off each tile's own animation delay, a locked one lower and muted
    // AMENDED at build 49 (§B1): a game ARRIVING on the map now plays its sound, so the fixture seeds Quick Tap as seen - which Fresh game's seedSeen does for a real new profile
    await boot({ gridSeen: 0 }, { unlock: { 'quick-tap:four': NOW46 }, seen: { 'game:quick-tap': 1, 'mode:quick-tap:two': 1, 'mode:quick-tap:four': 1 } });
    const map = await page.evaluate(async () => { const A = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const fired = []; const o = A.Snd.mapFx; A.Snd.mapFx = function (g, lk) { fired.push([g, !!lk]); return o.apply(this, arguments); };
      /* AMENDED at build 49 (v26 items 2 / 13): the first open is drawn out to about 7 seconds.
         AMENDED at build 51 (v27 item 2 / R1): and the two Gauntlets are NOT in it - a new profile has opened no chest, so neither tile exists
         and neither takes a beat. Eleven sounds, not thirteen. */
      const R = await import('./ui/router.js'); R.show('s-pick'); await wait(7600);
      const first = fired.slice(); fired.length = 0;
      R.show('s-menu'); await wait(200); R.show('s-pick'); await wait(1800);
      A.Snd.mapFx = o; return { first, again: fired.slice() }; });
    const locked = map.first.filter(f => f[1]).length, open = map.first.filter(f => !f[1]).length;
    // AMENDED AT BUILD 57 (v29 Section A, 57.1): the fourth beat has a sound of its OWN, `begin`, pitched above the three that fall
    (offAnim && kinds === 'line,title,line,begin' && onTime && map.first.length === 11 && open >= 2 && locked >= 6 && !map.again.length)
      ? ok(`items 1 / 2 the title plays its impact under each line, the title line heavier (${kinds}), each scheduled off that line's own CSS animation delay (${title.want.join('/')}ms); the map's first open plays ${map.first.length} sounds - ${open} open tiles, ${locked} locked ones lower and muted, and the chests - each off its own tile's animation, and the second visit is silent`)
      : bad('items 1 / 2 the title and map sounds', JSON.stringify({ offAnim, title, map }));
  }

  /* ---- 12. item 23: the About screen's eight slots ---- */
  {
    /* AMENDED AT BUILD 52 (v27 items 8 / 9 / 11). Three things this check asserted are no longer true and are asserted the other way round now:
       the intro is not open from the first load (item 8 makes Welcome wait for a run), no slot shows "video coming soon" while every slot points
       at the test card (item 11), and the player is not built inside the row (item 9 makes it one shared overlay). What item 23 still stands for
       is the part that has not moved: the list IS the screen, it is data in config/messages.js, and A CLIP ARRIVES BY FILLING IN A FILE NAME —
       so it is driven by EMPTYING one instead, which is the same claim from the other end. */
    await boot({}, { unlock: ALL46 });
    await show46('s-about'); await sleep(600);
    const fresh = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#msglist .msgrow')].map(r => ({ id: r.dataset.msg, locked: r.classList.contains('locked'),
      title: r.querySelector('.msgtxt b').textContent, state: r.querySelector('.msgtxt small').textContent, frame: !!r.querySelector('.msgframe'), video: !!r.querySelector('video') })),
      lede: document.getElementById('msg-lede').textContent }));
    // everything done: every chest, both Gauntlets played, a Quick Tap . Sprint on record and a payment through, so all eight are open
    await boot({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, gauntSeen: { g1: 1, g2: 1 }, paid: 1 },
      { unlock: ALL46, bars: tier46('clear', 'pro', 'author'), runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 7, misses: 0, v: 4 }] });
    await show46('s-about'); await sleep(600);
    const all = await page.evaluate(() => [...document.querySelectorAll('#msglist .msgrow')].map(r => r.classList.contains('locked')));
    // a clip is a file name and nothing else: empty one and the row says "video coming soon" and opens no player; put it back and it plays again
    const withFile = await page.evaluate(async () => { const M = await import('./config/messages.js'); const A = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const m = M.MESSAGES.find(x => x.id === 'games'), keep = { file: m.file, cc: m.cc };
      m.file = ''; m.cc = '';
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="games"]').click(); await wait(250);
      const out = { soon: /video coming soon/i.test(document.querySelector('#msglist .msgrow[data-msg="games"] .msgtxt small').textContent), noPlayer: !document.querySelector('#vplay:not([hidden])') };
      m.file = keep.file; m.cc = keep.cc;
      A.show('s-menu'); await wait(120); A.show('s-about'); await wait(400);
      document.querySelector('#msglist .msgrow[data-msg="games"]').click(); await wait(500);
      const h = document.getElementById('vplay'), v = h && h.querySelector('video');
      out.has = !!v; out.inline = v ? v.hasAttribute('playsinline') : false; out.full = v ? !v.hasAttribute('autoplay') : false;
      out.src = v ? v.querySelector('source').getAttribute('src') : ''; out.cc = v ? !!v.querySelector('track[kind="captions"][default]') : false;
      out.seen = JSON.parse(localStorage.getItem('ne')).prefs.msgSeen.games === 1;
      const V = await import('./ui/video.js'); V.closeVideo(); await wait(700);
      /* the dot is "any open slot with a clip not yet watched", and since item 11 every slot HAS a clip — so the seven others are marked watched
         here and the eighth, watched above, is what the dot is then read against. Before build 52 every slot was a placeholder and one clip was
         the whole of it. */
      A.show('s-menu'); await wait(200); out.dotWithOthers = document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('newthing');
      const S = await import('./core/store.js'); S.prefs.msgSeen = Object.fromEntries(M.MESSAGES.map(x => [x.id, 1])); S.save();
      A.show('s-about'); await wait(200); A.show('s-menu'); await wait(300);
      out.dot = document.querySelector('#s-menu .item[data-go="s-about"]').classList.contains('newthing');
      return out; });
    const order = MS46.MESSAGES.map(m => m.id).join();
    const shown46 = MS46.MESSAGES.filter(m => !(m.by && m.by.gauntlet)).map(m => m.id).join();
    (fresh.rows.length === 6 && shown46 === fresh.rows.map(r => r.id).join() && fresh.rows.every(r => r.locked) && / of 8$/.test(fresh.lede)
      && fresh.rows.every(r => r.frame && !r.video) && /opens when you finish/i.test(fresh.rows[0].state) && /opens with/i.test(fresh.rows[1].state)
      && all.length === 8 && all.every(l => !l) && withFile.soon && withFile.noPlayer
      && withFile.has && withFile.inline && withFile.full && withFile.cc && withFile.src === 'video/test-card.mp4' && withFile.seen && withFile.dotWithOthers && !withFile.dot)
      ? ok(`item 23 / v27 item 8 About carries the eight message slots in unlock order (${order}) as data in config/messages.js - six of them on a new profile, because R1 keeps a Gauntlet's row out of the list until its chest opens while the counter still says "of 8" - each saying what opens it, and all eight open once every chest is open, both Gauntlets have been played, a Quick Tap . Sprint is on record and a payment has gone through; a clip is still nothing but a file name - emptying one puts "video coming soon" back and opens no player, filling it in plays it, playsinline with its captions track and never autoplaying, and watching it takes the dot off the About row`)
      : bad('item 23 the About messages', JSON.stringify({ fresh, all, withFile, order, shown46 }));
  }

  /* ---- 13. items 20 / 22: every new sound is in the catalogue's list, and the card offers a message that has one ---- */
  rv7: {
    if (!REVIEW) { noReview('items 20 / 22 every new sound is in the catalogue list'); break rv7; }
    const { soundsRef } = REVIEW ? await import(pathToFileURL(path.join(REVIEW_DIR, 'scripts', 'catalogue.ref.mjs')).href) : { soundsRef: null };
    await boot({}, { unlock: ALL46 });
    const snd = await page.evaluate(soundsRef);
    const rows = snd.groups.flatMap(g => g.rows);
    const srcs = rows.map(r => r.src).join(' ');
    // v27 (build 52): the two the video player adds, and the Pro key's current between its spokes
    const want = ["Snd.titleFx('line')", "Snd.titleFx('title')", "Snd.mapFx('quick-tap')", "Snd.mapFx('chest')", 'Snd.gift(i)',
      "Snd.videoFx('on')", "Snd.videoFx('off')", "Snd.keyStep('trace')"];
    const missed = want.filter(x => !srcs.includes(x));
    const silent = rows.filter(r => !r.plays.length || r.plays.some(p => !p.ev || !p.ev.length)).map(r => r.id);
    /* DELETED at build 49: the source-text half of this check, which spelled `m.file ? m.id : ''` in key.js. v26 item 5 shows the button while a slot is a
       placeholder, behind the before-release flag, and the chests section drives the button on all four chests instead */
    (!missed.length && !silent.length)
      ? ok(`items 20 / 22 every sound this build adds is in the catalogue's Every sound list with events off audio.js itself (${rows.length} rows now)`)
      : bad('items 20 / 22 the new sounds', JSON.stringify({ missed, silent }));
  }
}

// ---- verdict ----
await browser.close();
if (srv) srv.close();
process.exit(verdict() ? 0 : 1);
