/* No Excuses — the gate's shared library (build 61): the section bookkeeping, the verdict, the browser, the page and every helper
   a section drives it with. Until build 60 all of this was the top of one 9,700-line `_smoke/smoke.mjs`; the sections are
   `_smoke/sections/*.mjs` now and `_smoke/smoke.mjs` runs them. Importing this module STARTS a worker: it launches Chrome and opens
   the page, so the parallel runner never imports it — it reads `lib/args.mjs` and `sections/index.mjs` and spawns workers that do.
   How to run the gate, and every flag: the head of `_smoke/smoke.mjs`. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from '../server.mjs';
import { launch, phonePage, FONT_HOST, IGNORED_REQUEST } from '../chrome.mjs';
import { installClock } from './clock.mjs';
import { ARGV, optOf, baseArg, termsOf, ONLY, FROM, PARTIAL, named, LEADS } from './args.mjs';
export { ARGV, optOf, baseArg, termsOf, ONLY, FROM, PARTIAL, named, LEADS, FONT_HOST, IGNORED_REQUEST, serve, launch, phonePage };

export const own = !baseArg;
export const srv = own ? await serve() : null;
export const BASE = baseArg || srv.base;
// a worker is one of the parallel runner's children: it runs exactly the sections it is handed and says so in JSON, not on screen
export const WORKER = ARGV.includes('--worker'), PICK = optOf('--pick') ? new Set(optOf('--pick').split(',').map(Number)) : null, JSON_OUT = optOf('--json');
{ const r = await fetch(BASE + '/index.html').catch(() => null); if (!r || !r.ok) { console.error(`No page at ${BASE}/index.html (${r ? r.status : 'no answer'})`); process.exit(2); } if (!WORKER) console.log('serving ' + BASE); }

export const GAMES = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
export const errors = [];
export const fail = [];
/* ---- build 61: THE TEST CLOCK ----
   `--clock N` runs the PAGE N times faster: lib/clock.mjs scales its timers, its clocks and its animations, and the driver's own
   waits shrink by the same factor, so a `sleep(450)` is still 450ms of the app's time. The shipped app never reads it. A section
   that cannot run fast says so in sections/index.mjs (`clock`), and the runner hands it the smaller of the two. */
export const CLOCK = Math.max(1, +optOf('--clock') || 1);
export const sleep = ms => new Promise(r => setTimeout(r, ms / CLOCK));

/* ---- sections, quiet output and partial runs (build 47) ----
   Every section is a module in sections/ with its `names` and a `run()`; `section` answers whether it runs. The name is what its
   summary line prints, what --only and --from match and what GATE.md indexes. `part` splits a running section's count without
   gating it. Build 61: a worker runs the sections at the indices it was handed (`--pick`), and nothing else. */
export const T0 = Date.now();
export const VERBOSE = ARGV.includes('--verbose'), BAIL = ARGV.includes('--bail'), LABELS = optOf('--labels');
export const sections = [], names = [];
export let cur = null, fromOn = false;
let secIdx = -1;
export const close = () => { if (!cur) return; cur.s = (Date.now() - cur.t0) / 1000; console.log(`${cur.name} · ${cur.n} check${cur.n === 1 ? '' : 's'} · ${cur.failed ? cur.failed + ' failed' : 'ok'} · ${cur.s.toFixed(1)}s`); cur = null; };
export const part = name => { close(); cur = { name, n: 0, failed: 0, lines: [], t0: Date.now(), idx: secIdx }; sections.push(cur); if (VERBOSE) console.log('\n' + name); };
export const section = (name, ...aka) => { close(); names.push(name, ...aka); secIdx++;
  const all = [name, ...aka, ...(LEADS[name] || [])], hit = ts => ts.some(t => all.some(n => named(n, t)));
  if (hit(FROM)) fromOn = true;
  const run = PICK ? PICK.has(secIdx) : (!PARTIAL || fromOn || hit(ONLY));
  if (run) part(name);
  return run; };
export const check = (line, failed) => { if (!cur) part('(outside any section)'); cur.n++; cur.lines.push(line); if (failed) cur.failed++; };
export const ok = (label) => { check('  ok   ' + label); if (VERBOSE) console.log('  ok   ' + label); };
export const bad = (label, why) => { const line = label + (why ? ' — ' + why : ''); fail.push(line); check('  FAIL ' + line, true); console.log('  FAIL ' + line);
  if (BAIL) { verdict('STOPPED AT THE FIRST FAILURE (--bail)'); process.exit(1); } };
export function verdict(stopped) {
  close();
  // a worker hands everything to the runner, which prints the one verdict for the whole gate
  if (WORKER) { if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ sections: sections.map(({ t0, ...s }) => s), fail, errors, stopped: stopped || '' }));
    return !errors.length && !fail.length; }
  if (LABELS) fs.writeFileSync(LABELS, sections.map(s => '\n' + s.name + '\n' + s.lines.join('\n')).join('\n') + '\n');
  const unknown = stopped ? [] : [...ONLY, ...FROM].filter(t => !names.some(n => named(n, t)));
  console.log('\n' + '-'.repeat(60));
  if (errors.length) { console.log('UNCAUGHT ERRORS (' + errors.length + '):'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
  if (fail.length) console.log('FAILED CHECKS:\n  ' + fail.join('\n  '));
  if (unknown.length) console.log(`NO SECTION STARTS WITH ${unknown.map(t => '"' + t + '"').join(', ')} — the sections are:\n  ` + [...new Set(names)].join('\n  '));
  { const n = sections.reduce((a, s) => a + s.n, 0), m = sections.length; console.log(`${n} check${n === 1 ? '' : 's'} in ${m} section${m === 1 ? '' : 's'}, ${Math.round((Date.now() - T0) / 1000)}s, one worker, clock ×${CLOCK}`); }
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
export const inSection = () => cur ? ' — in ' + cur.name : '';
export let finished = false;
export function crashed(e) { if (finished) return; finished = true;
  const msg = (e && (e.stack || e.message)) || String(e);
  fail.push('THE GATE CRASHED before it finished — ' + msg.split('\n')[0] + inSection());
  if (cur) cur.failed++;
  console.log('\n  FAIL THE GATE CRASHED before it finished' + inSection() + '\n' + msg.split('\n').slice(0, 6).map(l => '    ' + l).join('\n'));
  let pass = false; try { pass = verdict('CRASHED — the run did not finish'); } catch (e2) { console.log('verdict() also threw: ' + e2.message); }
  try { browser && browser.close(); } catch (e2) { }
  try { srv && srv.close(); } catch (e2) { }
  process.exit(pass ? 1 : 1); }
process.on('uncaughtException', crashed);
process.on('unhandledRejection', crashed);
// the end of a run: close the browser and the server, print (or hand over) the verdict, exit with it
export async function finish() { const tc = Date.now(); await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 5000))]); if (process.env.GATE_DEBUG) console.log(`  [browser closed in ${((Date.now() - tc) / 1000).toFixed(1)}s]`); if (srv) srv.close(); finished = true; process.exit(verdict() ? 0 : 1); }


/* ---- the shared helpers (build 47): one root, one read, one strip, one boot ----
   Until build 46 every build section carried its own copy of each (root28-root46, read32-read46, strip28-strip46, boot40-boot46). */
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
/* v29 (item 17, build 55): ../_review IS OPTIONAL. Ten sections read the review pipeline, which lives OUTSIDE the site tree, with an
   unguarded readFileSync - so `npm test` on a clone of `site` alone (which is what Codemagic gets) died on the first of them. REVIEW
   says whether the directory is there; every read of it goes through rvRead, every assertion that needs it is skipped by name when it
   is not, and the section keeps every other check it has. Nothing changes on a full checkout. */
export const REVIEW_DIR = path.resolve(root, '..', '_review');
export const REVIEW = fs.existsSync(REVIEW_DIR);
export const rvRead = (...p) => { try { return fs.readFileSync(path.join(REVIEW_DIR, ...p), 'utf8'); } catch (e) { return ''; } };
export const noReview = label => ok(label + ' — SKIPPED: ../_review is not in this checkout (site-only clone)');
if (!REVIEW) console.log('../_review not found — the review-pipeline checks will be skipped by name');
export const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
/* boot writes a whole profile and reloads: `prefs` over `plain`, `extra` over the rest of the store, at store version `v` (a 5 walks
   the ladder's up6). PLAIN is build 46's profile — title, map, menu and key screen already seen, sound off, nothing spilled or ready */
/* build 57 (v29 Section A, 57.6): and every key's CREATION INTRO already seen. It is a once-per-profile moment that covers the key screen, so a
   fixture that has not seen it would have one play over whatever that section is driving; the section that tests it clears the field itself. */
export const PLAIN = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: {}, readySeen: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
export const boot = async (prefs, extra = {}, { v = 7, plain = PLAIN } = {}) => { await setStorage({ ne: Object.assign({ v, prefs: { ...plain, ...prefs }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} }, extra) }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(450); };
export const NOW = Date.now();   // the fixtures' clock; storage fixtures, build 32 and build 38 stamp with it
/* v29 Section A (58.2, build 58): A FINISHED GAUNTLET, as the store holds one. The Pro chest needs Gauntlet Mini and the Author chest
   Gauntlet Mega, so a fixture that puts either of those chests into ready or open without `allOpen` has to carry the row play would have
   written. One shape, here, so a fixture never invents its own. */
export const GAUNT_ALL = () => [{ id: 'g1', t: NOW, score: 104.2, tier: 'clear', web: [] }, { id: 'g2', t: NOW, score: 97.8, tier: 'clear', web: [] }];
export let at, sawStory;         // cold start leaves both for the sections after it
export const setCold = (a, s) => { at = a; sawStory = s; };   // an importer cannot assign them (ESM bindings are read-only)

export const browser = await launch();
export const page = await phonePage(browser);
if (CLOCK > 1) await installClock(page, CLOCK);
if (process.env.GATE_DEBUG) console.log(`  [worker up in ${((Date.now() - T0) / 1000).toFixed(1)}s]`);
/* build 47: every uncaught error names the section it happened in, and a console error the URL it came from, so a failed run says
   which --only to run. PLANTED are the only two resources the gate forgives a 404 on, because the gate makes them fail: build 46's
   item 23 check puts a clip at video/test.mp4 with captions at video/test.vtt to prove the player is built, and neither file exists.
   Every build-46 full run failed on those two 404s with all 591 checks passing. Any other 404 still fails the run. */
// v29 (item 10, build 55): and the clip the video-error check asks for on purpose, to prove the player says so instead of showing a black rectangle
export const PLANTED = u => /\/video\/(test\.(mp4|vtt)|no-such-clip-55\.mp4)$/.test(u || '');
/* v27 (items 9 / 10, build 52): CLOSING THE PLAYER ABANDONS THE CLIP IT WAS STREAMING, and the browser reports that as net::ERR_ABORTED on
   the media request. It is not a failure and there is nothing to fix: a <video> the player tears down mid-buffer is exactly what "tap outside
   to close" does, on a phone as much as here. Only an ABORT, only under /video/, and every other request failure still fails the run. */
export const ABORTED_CLIP = (u, err) => /\/video\//.test(u || '') && /ERR_ABORTED/.test(err || '');
page.on('pageerror', e => errors.push('pageerror: ' + e.message + inSection()));
page.on('console', m => { const u = m.location()?.url || ''; if (m.type() === 'error' && !IGNORED_REQUEST(m.text()) && !PLANTED(u)) errors.push('console: ' + m.text() + (u ? ' ' + u : '') + inSection()); });
page.on('requestfailed', r => { const u = r.url(), e = r.failure()?.errorText || ''; if (!IGNORED_REQUEST(u) && !ABORTED_CLIP(u, e)) errors.push('requestfailed: ' + u + ' ' + e + inSection()); });
page.on('dialog', async d => { errors.push('dialog opened: ' + d.message() + inSection()); await d.dismiss(); });
// v18 (B.32, build 33): every URL the page asks for, for the whole run — the font assertion counts the ones that left the origin
export const reqs = [];
page.on('request', r => reqs.push(r.url()));
/* build 61: B.32's font assertion reads `reqs` inside ONE section, and a worker's `reqs` is only what its own sections asked for. So a font
   request is an error the moment it happens, in whichever worker, and the whole run still can never fetch one unnoticed. */
page.on('request', r => { if (FONT_HOST(r.url())) errors.push('a font request left the origin: ' + r.url() + inSection()); });
// a partial run can start at any section, and a section's first setStorage needs the page on the app's origin
if (PARTIAL || PICK) await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });

/* build 61: A DRIVER'S WAIT IS A POLL ON A STATE SIGNAL, NEVER A NUMBER. `until(fn, arg)` resolves on the first frame `fn` (run in the
   page, with `arg`) is truthy, and throws — a named crash, never a silent pass — after `ms` of wall time. A fixed `sleep` aimed at a
   window is a guess that only held because a real driver is slow; under the test clock it lands somewhere else. */
export const until = (fn, arg, ms = 30000) => page.waitForFunction(fn, { polling: 'raf', timeout: ms }, arg);
export const onScreen = () => page.$eval('.screen.on', s => s.id).catch(() => null);
export const inGame = () => page.$eval('#game', g => g.classList.contains('on')).catch(() => false);
export const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
export const setStorage = obj => page.evaluate(o => { localStorage.clear(); for (const k in o) localStorage.setItem(k, typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])); }, obj);
export const getJSON = k => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return 'unparseable'; } }, k);
export const OPEN_PREFS = { allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
/* v17 (B.4, build 28): the first-play ghost now turns away everything it emits, and it ENDS ON "Ready?" on the first run
   of a game - so a test that drives liveCheck by hand, or expects an engine to reach its field, has to start from a
   profile that has already met that mode. This is every intro key the app can ask for. */
export const SEEN_INTRO = (() => { const o = {}; for (const g of GAMES) { o[g] = 1; }
  for (const k of ['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead', 'hold:grow', 'hold:cut', 'sequence:solo',
    'timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'spot:count', 'spot:find']) o[k] = 1;
  return o; })();

// pointer events the way the engines listen for them: pointerdown/up/move on an element, at a fraction of its box
export const ptr = (type, sel, dx = .5, dy = .5) => page.evaluate((type, s, dx, dy) => {
  const t = document.querySelector(s); if (!t) return false; const r = t.getBoundingClientRect();
  t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + r.width * dx, clientY: r.top + r.height * dy, pointerId: 1 })); return true;
}, type, sel, dx, dy);
export const down = (sel, dx, dy) => ptr('pointerdown', sel, dx, dy);
export const up = (sel, dx, dy) => ptr('pointerup', sel, dx, dy);

// v14 (6.3): a round's result stays up until it is tapped, so nothing advances until the tap lands. #game.tapon is the cue,
// and the tap goes to the layer that game's engine listens on. It runs even in the no-tap drive (Reaction's Streak, which ends
// by never tapping the flash) — the held card is not the flash, and without this the run would sit there forever
export const heldSeen = new Set();
export async function clearHeld(g) {
  if (!(await page.evaluate(() => document.getElementById('game').classList.contains('tapon')))) return false;
  heldSeen.add(g); await down(g === 'hold' ? '#hfield' : '#gen'); return true;
}
/* build 61: one round trip that answers the screen AND, when a Quick Tap run is live, presses its lit pad — for the drivers that loop on
   their own rather than through driveToResult. Three round trips per tap was slow enough, on the test clock, to miss a 15-in-a-row. */
export const stepQuickTap = () => page.evaluate(() => { const s = document.querySelector('.screen.on'), gm = document.getElementById('game');
  if (gm && gm.classList.contains('on')) for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') {
    const t = document.querySelector('.pad[data-side="' + i + '"]'); if (!t) break; const r = t.getBoundingClientRect();
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width * .5, clientY: r.top + r.height * .5, pointerId: 1 })); break; }
  return s ? s.id : null; }).catch(() => null);
export async function poke(g) {
  // build 61: find the lit pad and press it in ONE round trip (it was two) — the same pointerdown down() sends, at the pad's centre
  if (g === 'quick-tap') { await page.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') {
      const t = document.querySelector(`.pad[data-side="${i}"]`); if (!t) return; const r = t.getBoundingClientRect();
      t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width * .5, clientY: r.top + r.height * .5, pointerId: 1 })); return; } }); return; }
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
    /* AMENDED at build 60 (v31 60.16): this pressed `data-num="14"`, which was a hand-written copy of SPOT_RAMP.nCap — and 60.16
       made nCap 13, so there was no such button and a Count Streak was never answered at all: the run simply never ended.
       It presses the HIGHEST button the keypad ACTUALLY HAS now, read off the page, which is a deliberately wrong answer on every
       round (the point: a Streak has to be able to spend its budget) and cannot go stale the next time the cap moves. */
    await page.evaluate(() => { const b = [...document.querySelectorAll('#gen [data-num]')].pop();
      if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0, pointerId: 1 })); }); return; }
}
// the ad break (every fourth result) has a 2s skip; press it when it is live
/* v25 (items 6 / 11 / 22, build 46): A CHEST OPENING AND A KEY'S FIRST OPEN ARE THE SAME REVEAL NOW — the stage, the symbols rising out of it,
   "tap to continue", then the congratulations card whose Continue is dead for about a second. So every driver that used to answer one tap
   answers both, and every wait is a POLL rather than a number: the length of one is config/chests.js REVEAL plus that stage's own, and a
   number typed here would go stale the day either is re-tuned. `revealReady` waits for it to reach the tap; `revealDone` finishes the whole
   thing and answers whether it ended one. Both are no-ops when nothing is playing, so they are safe anywhere. */
export const revealReady = async (ms = 20000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { const st = await page.evaluate(() => { const h = document.getElementById('key-cere');
      return !h || h.hidden ? 'off' : h.classList.contains('card') ? 'card' : h.classList.contains('tap') ? 'tap' : 'on'; });
    if (st !== 'on') return st; await sleep(150); }
  return 'timeout'; };
/* it finishes EVERY reveal that is queued, not one: a chest tapped on the map while its key's first open has not been seen plays the key's
   reveal and then the chest's, and a driver that answered only the first would photograph the second and call it the next screen. */
export const revealOne = async () => { const st = await revealReady(); if (st === 'off' || st === 'timeout') return false;
  if (st === 'tap') { await click('#key-cere'); await sleep(320); }
  for (let i = 0; i < 40; i++) { const b = await page.evaluate(() => { const x = document.querySelector('#key-cere .rgo'); return !x ? '' : x.disabled ? 'wait' : 'go'; });
    if (b === 'go') { await page.evaluate(() => document.querySelector('#key-cere .rgo').click()); await sleep(320); return true; }
    if (!b) return false; await sleep(150); }
  return false; };
export const revealDone = async () => { let any = false;
  for (let i = 0; i < 4; i++) { const on = await page.evaluate(() => !document.getElementById('key-cere').hidden);
    if (!on) break; if (!(await revealOne())) break; any = true; await sleep(450); }
  return any; };
export const skipAd = () => page.evaluate(() => { const a = document.getElementById('adbreak'), b = document.getElementById('adskip'); if (a.classList.contains('on') && !b.disabled) { b.click(); return true; } return false; });

/* v16 (A.3): a player's FIRST run of each game ends its intro with a "Ready?" that has to be tapped. Nothing else in the
   run is listening while it is up, so the driver answers it — and records that it saw one, which is the assertion below. */
export const readySeen = new Set();
export async function clearReady(g) {
  const on = await page.evaluate(() => document.getElementById('intro')?.classList.contains('ready'));
  if (!on) return false;
  readySeen.add(g); await down('#game'); return true;
}
export let askedLine = '', askedTot = null;
export async function driveToResult(g, label, ms = 90000, noTap = false) {
  askedLine = ''; askedTot = null;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    /* build 61: ONE round trip reads everything the loop decides on — the screen, the ad break, the run, the Ready? card and a held
       round card — where it used to be five. Each round trip is the driver's own time, and on the test clock the page saw it ten times
       over: a Quick Tap Sprint driven at ×10 landed 14 hits in a row where the rule it was earning asks for 15. Same order, same taps. */
    const st = await page.evaluate((qt) => { const s = document.querySelector('.screen.on'), a = document.getElementById('adbreak'), b = document.getElementById('adskip'), gm = document.getElementById('game'), it = document.getElementById('intro');
      const o = { at: s ? s.id : null, ad: !!(a && b && a.classList.contains('on') && !b.disabled), game: !!(gm && gm.classList.contains('on')), ready: !!(it && it.classList.contains('ready')), held: !!(gm && gm.classList.contains('tapon')), pressed: false };
      // and a live Quick Tap run's lit pad is pressed in the same trip — poke('quick-tap')'s own pointerdown, at the pad's centre
      if (qt && (o.at === null || o.game) && !o.ad && !o.ready && !o.held) for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') {
        const t = document.querySelector('.pad[data-side="' + i + '"]'); if (!t) break; const r = t.getBoundingClientRect();
        t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width * .5, clientY: r.top + r.height * .5, pointerId: 1 })); o.pressed = true; break; }
      return o; }, g === 'quick-tap' && !noTap).catch(() => ({ at: null }));
    const at = st.at; if (at === 's-over' || at === 's-pass') break;
    if (st.ad) { if (await skipAd()) continue; }
    if (at === null || st.game) {
      if (st.ready) { readySeen.add(g); await down('#game'); }
      else if (st.held) { heldSeen.add(g); await down(g === 'hold' ? '#hfield' : '#gen'); }
      else if (!noTap && g !== 'quick-tap') await poke(g); }
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
export async function keySettle() {
  for (let i = 0; i < 50; i++) {
    const busy = await page.evaluate(() => document.getElementById('s-over').classList.contains('fadeout') || (document.querySelector('.screen.on') || {}).id === 's-key');
    if (!busy) return i > 0;
    await sleep(200);
  }
  return true;
}
export async function resultLine() {
  return page.evaluate(() => ({ score: document.querySelector('#over-score').textContent.trim(), verdict: document.querySelector('#verdict').textContent.trim(), stats: document.querySelector('#over-stats').textContent.trim().slice(0, 50), rank: document.querySelector('#over-rank').textContent.trim() }));
}
// fresh page with everything open, at the pick sheet of game g, mode index mi, length index li (or the Streak length when li === 'streak')
export async function openSheet(g, mi, li, vs = 0) {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': OPEN_PREFS });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(320);
  await click('[data-go="s-pick"]'); await sleep(260);
  await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(260);
  // v31 (60.23, build 60): the player rows are ui/players.js's on both screens and carry data-p / data-p2
  if (vs) { await click('#vs-wrap [data-p="f"]'); await sleep(200); await click(`#vs-wrap [data-p2="${vs}"]`); await sleep(200); }
  await page.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); (c[mi] || c[0]).click(); }, mi); await sleep(420);
  const face = await page.evaluate(li => { const t = [...document.querySelectorAll('#time-row .tbtn')]; const b = li === 'streak' ? t.find(x => x.dataset.time === '-1') : t[li]; if (!b) return null; b.click(); return b.querySelector('b').textContent.trim(); }, li); await sleep(160);
  return face;
}