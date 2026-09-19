/* No Excuses — PIXEL EVIDENCE (build 59, v30 rule 3). NOT part of the gate; run it by hand:
 *     node _smoke/shots.mjs               every scene
 *     node _smoke/shots.mjs 59.1 59.8     only those
 *     node _smoke/shots.mjs --list
 *
 * WHY IT EXISTS. 59.1 (was 57.2) and 59.14 (was 57.7) were both marked done in build 57 on MARKUP and on STEP TIMINGS, and
 * neither works on Aiden's phone. v30 therefore rules that the evidence for anything visual is a screenshot or a measured
 * frame. This file is the one place that makes either, so every item's evidence is made the same way and a later build can
 * re-run a scene by name and compare like for like.
 *
 * THE PHONE IT PRETENDS TO BE. 390 x 844 at dpr 2 — the gate's own viewport — plus a BOTTOM SAFE-AREA INSET, which the gate
 * does not have and which is the whole of 59.8. Chrome takes it through CDP `Emulation.setSafeAreaInsetsOverride`; a Chrome
 * too old to know the command leaves `sab: none` on every row of the manifest, so an item that needs the inset can never
 * quietly claim a pass it did not get.
 *
 * HOW A CLAIM IS MADE HONEST. Counting lit pixels inside a box proves nothing on its own — the chest's own outline is lit
 * too, and the cracks are drawn in the SAME colour as it (`--mute`). So a scene that asks "is this thing drawn" takes a
 * BASELINE with that thing's group hidden and reports the difference. Frame minus baseline is the only number that means
 * "these pixels are the cracks".
 *
 * WHAT IT LEAVES BEHIND. A PNG per frame in ../_review/_shots/build-59/ and one row per frame in manifest.json carrying
 * whatever the scene measured. Measuring runs on the PNG itself, decoded through a canvas on a second page, so a number in
 * the manifest is read off the same bytes as the picture beside it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './server.mjs';
import { launch, phonePage } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '..', '_review', '_shots', 'build-59');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ARGV = process.argv.slice(2);

/* ---------- the profile every scene starts from ----------
   A played-in profile with nothing revealed: the title sequence and the map's first open are already seen, so a scene opens
   on the screen it asked for instead of sitting through a 7s intro. Chests and bars are whatever the scene sets. */
const PLAIN = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, menuOpened: {}, snd: 'off',
  musicG: {}, spill: {}, readySeen: {}, msgSeen: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
const fixture = (prefs = {}, bars = {}) => ({ v: 7, prefs: Object.assign({}, PLAIN, prefs), runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars });

/* ---------- pixels ----------
   A PNG is decoded by drawing it into a canvas on a second, blank page and reading getImageData — no image library, and the
   numbers come off the bytes written to disk rather than off the live DOM, which is the point of the exercise. */
let lens = null;
async function pixels(browser, png) {
  if (!lens) { lens = await browser.newPage(); await lens.goto('data:text/html,<canvas id=c></canvas>'); }
  const raw = await lens.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    return { w: c.width, h: c.height, data: Array.from(d.data) };
  }, png.toString('base64'));
  raw.at = null; return raw;
}
const px = (im, x, y) => { const i = (y * im.w + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]]; };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round((x + .05) / (y + .05) * 100) / 100; };
// how many pixels of a box are brighter than the page's near-black ground — "is anything drawn here at all"
const litIn = (im, b, floor = 26) => { let n = 0;
  for (let y = Math.max(0, b.y0); y < Math.min(im.h, b.y1); y++) for (let x = Math.max(0, b.x0); x < Math.min(im.w, b.x1); x++) {
    const p = px(im, x, y); if (Math.max(p[0], p[1], p[2]) > floor) n++; }
  return n; };
// how many pixels of a box differ from the SAME box of another frame by more than `tol` in any channel
const diffIn = (a, c, b, tol = 10) => { let n = 0;
  for (let y = Math.max(0, b.y0); y < Math.min(a.h, c.h, b.y1); y++) for (let x = Math.max(0, b.x0); x < Math.min(a.w, c.w, b.x1); x++) {
    const p = px(a, x, y), q = px(c, x, y);
    if (Math.abs(p[0] - q[0]) > tol || Math.abs(p[1] - q[1]) > tol || Math.abs(p[2] - q[2]) > tol) n++; }
  return n; };
// the CSS rect of a selector, in device pixels, which is what a screenshot is measured in
const boxOf = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x0: Math.floor(r.x * 2), y0: Math.floor(r.y * 2), x1: Math.ceil(r.right * 2), y1: Math.ceil(r.bottom * 2) }; }, sel);

/* FREEZE THE CLOCK. Two frames of a moving thing taken from two different runs cannot be diffed — the chest breathes and the
   ceremony scales it, so the difference is the whole chest rather than the one thing under test. Pausing every animation and
   setting them all to the same currentTime (which counts from the start of a CSS animation's DELAY, so one number is one
   moment of the ceremony) makes the geometry identical and leaves the change under test as the only difference. */
const freezeAt = (page, t) => page.evaluate(ms => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = ms; } catch (e) {} }
  return document.getAnimations().length; }, t);

/* ---------- the harness ---------- */
const manifest = [];
let SAB = 'none';
const SCENES = {};
const scene = (name, fn) => { SCENES[name] = fn; };

async function frame(page, browser, name, note, extra = {}) {
  const png = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), png);
  const im = await pixels(browser, png);
  manifest.push(Object.assign({ frame: name + '.png', note, sab: SAB }, extra));
  return im;
}
const say = (k, v) => { const row = manifest[manifest.length - 1]; if (row) row[k] = v; console.log('      ' + k + ': ' + JSON.stringify(v)); };

/* =======================================================================================================
   59.1 — the Games chest carries NO crack until the opening draws them (57.2 again)
   The cause, found by Cowork in the code and confirmed here: `paths()` in ui/chest.js emitted the crack paths with no
   pathLength, so `stroke-dasharray:1` meant ONE USER UNIT of dash rather than the whole path, and the cracks rendered as
   DASHED lines from frame zero and stayed dashed after the draw-in. The fix is `pathLength="1"` on those paths.
   The three frames below ARE the item's three acceptance clauses, and each is measured against a baseline taken with the
   crack group hidden outright — because the cracks are the same colour as the chest's outline, so only the DIFFERENCE from
   a chest with no cracks at all can honestly be called crack pixels.
   ======================================================================================================= */
scene('59.1', async (page, browser) => {
  // (3) first: the map, with the Games chest still locked — a clean chest
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); }); await sleep(900);
  const mapBox = await boxOf(page, '#grid .chestart[data-look="games"]');
  await frame(page, browser, '59.1a-map-locked', 'Progress map, Games chest LOCKED — acceptance (3): a clean chest');
  const mapLit = await page.evaluate(() => document.querySelectorAll('#grid .chestart[data-look="games"] .crk').length);
  say('crackPathsOnMap', mapLit); say('chestBox', mapBox);

  /* now the ceremony, on a FROZEN clock so the frames are comparable. `open(at)` replays the Games chest opening, freezes
     every animation at `at` ms into the ceremony, and hands back the page in that state. Because the geometry is then
     identical from run to run, hiding the crack group gives a true baseline and the difference IS the crack pixels. */
  const open = async at => {
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(320);
    await page.evaluate(() => { document.querySelectorAll('.cere .crk').forEach(p => p.style.removeProperty('display')); });
    await page.evaluate(() => document.querySelector('[data-act="dev-chest"][data-chest="games"]').click());
    await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) { if (document.querySelectorAll('.cere .crk').length) return; await wait(15); } });
    await freezeAt(page, at); await sleep(40);
  };
  const hideCracks = on => page.evaluate(v => document.querySelectorAll('.cere .crk').forEach(p => p.style.display = v ? 'none' : ''), on);
  const stripPathLength = () => page.evaluate(() => document.querySelectorAll('.cere .crk').forEach(p => p.removeAttribute('pathLength')));

  /* THE FIRST FRAME, which is t=0: the frame the chest is first on screen, before the `crack` step opens at 90ms. This is
     the frame acceptance (1) names, and the one a build-58 phone shows seven dashed cracks on. */
  await open(0);
  const first = await frame(page, browser, '59.1c-first-frame', 'Ceremony FIRST frame (t=0), build 59 — acceptance (1): zero crack pixels');
  const cereBox = await boxOf(page, '.cere .cbig'); say('chestBox', cereBox);
  say('crk', await page.evaluate(() => { const p = document.querySelector('.cere .crk'); return p && { pathLength: p.getAttribute('pathLength'), dasharray: getComputedStyle(p).strokeDasharray, dashoffset: getComputedStyle(p).strokeDashoffset }; }));
  await hideCracks(true); await sleep(40);
  const base = await frame(page, browser, '59.1b-baseline-no-cracks', 'The same frozen frame with the crack group HIDDEN — the reference for "zero crack pixels"');
  say('crackPixels', 0);
  const fixedPx = diffIn(first, base, cereBox);

  // and the same frozen moment with pathLength stripped: build 58's defect, reproduced beside it
  await hideCracks(false); await stripPathLength(); await sleep(40);
  const bug = await frame(page, browser, '59.1d-first-frame-BUG', 'The same frozen frame with pathLength stripped — build 58\'s defect, for comparison');
  const bugPx = diffIn(bug, base, cereBox);
  say('crackPixels', bugPx);
  manifest.find(r => r.frame === '59.1c-first-frame.png').crackPixels = fixedPx;
  console.log('      FIRST FRAME crack pixels — build 59: ' + fixedPx + '   ·   build 58 (pathLength stripped): ' + bugPx);

  /* (2) ONE MORE CRACK PER SQUARE, SOLID NOT DASHED. `crack` runs 90–1290ms and each of the seven draws .34s after the one
     before, so these seven moments are one per square. Each frame is measured against ITS OWN baseline at the same instant. */
  const counts = [];
  for (let i = 0; i < 7; i++) {
    const t = 200 + i * 190;
    await open(t);
    const im = await frame(page, browser, '59.1e-crack-' + (i + 1), `Ceremony at t=${t}ms — acceptance (2): square ${i + 1} of 7`);
    // read the paths BEFORE hiding them: a display:none path reports no dash offset at all
    const st = await page.evaluate(() => [...document.querySelectorAll('.cere .crk')].map(p => Math.round((1 - parseFloat(getComputedStyle(p).strokeDashoffset)) * 100)));
    await hideCracks(true); await sleep(40);
    const b = await pixels(browser, await page.screenshot({ type: 'png' }));
    const n = diffIn(im, b, cereBox);
    say('crackPixels', n); say('percentDrawnPerCrack', st);
    counts.push(n);
  }
  console.log('      crack pixels as the squares land: ' + counts.join(' → '));
});

/* =======================================================================================================
   59.2 — the congratulations word on ONE line, and Continue visible without scrolling, on all four chests
   57.3 rebuilt the word letter by letter and sized it up (--cw-size 1.7 to 1.9). A per-letter span gives the browser a
   break opportunity between every letter, so once the word is wider than the card it snaps mid-word — CONGRATULA / TIONS —
   and the taller card pushes Continue off the bottom. Measured here, at both widths the item names, on every chest:
   the word's line count and rendered width, and whether Continue's box is inside the viewport.
   ======================================================================================================= */
const CHESTS4 = ['games', 'key', 'pro', 'thorns'];
// drive one chest's opening all the way to its congratulations card
async function toCard(page, chest) {
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(320);
  await page.evaluate(c => document.querySelector(`[data-act="dev-chest"][data-chest="${c}"]`).click(), chest);
  // the stage, then the gifts, then "tap to continue" — tap it, then wait for the card's blocks to land
  await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 400; i++) { const t = document.querySelector('.cere .ctap');
      if (t && getComputedStyle(t).opacity > .5) break; await w(50); } });
  await page.evaluate(() => { const h = document.getElementById('key-cere'); h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); h.click(); });
  await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 200; i++) { if (document.querySelector('.rcard')) break; await w(30); } });
  await sleep(1700);   // cardAt + the staged blocks + cardGo, so Continue is live and everything has landed
}
const cardMetrics = page => page.evaluate(() => {
  const card = document.querySelector('.rcard'), t = card && card.querySelector('.rtitle'), go = card && card.querySelector('.rgo');
  if (!card || !t) return { card: false };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;width:1px;height:env(safe-area-inset-bottom)'; document.body.appendChild(probe);
  const sab = parseFloat(getComputedStyle(probe).height) || 0; probe.remove();
  /* how many lines the word occupies, off offsetTop rather than a client rect: each letter drops in on its own beat and a
     rect carries that transform, so a mid-flight letter reads as a second line. offsetTop is layout, which is what "one
     line" is a claim about. */
  const tops = [...t.querySelectorAll('.cl')].map(s => s.offsetTop);
  const r = t.getBoundingClientRect(), cr = card.getBoundingClientRect(), gr = go && go.getBoundingClientRect();
  return { lines: new Set(tops).size, letters: tops.length, wordW: Math.round(r.width), wordH: Math.round(r.height),
    fontPx: Math.round(parseFloat(getComputedStyle(t).fontSize) * 10) / 10, wrap: getComputedStyle(t).whiteSpace,
    cardW: Math.round(cr.width), cardTop: Math.round(cr.top), cardBottom: Math.round(cr.bottom),
    cardScrolls: card.scrollHeight > card.clientHeight + 1, overflowPx: card.scrollHeight - card.clientHeight, lastBlockBottom: Math.round(card.lastElementChild.getBoundingClientRect().bottom), vh: innerHeight, safeBottom: sab,
    picH: card.querySelector('.mpframe') ? Math.round(card.querySelector('.mpframe').getBoundingClientRect().height) : null,
    // "visible without scrolling" means ABOVE the home indicator, not merely inside the viewport box
    goBottom: gr ? Math.round(gr.bottom) : null, goVisible: !!gr && gr.bottom <= innerHeight - sab + .5 && gr.top >= 0 };
});
scene('59.2', async (page, browser) => {
  for (const w of [375, 390]) {
    await page.setViewport({ width: w, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const chest of CHESTS4) {
      await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
      await toCard(page, chest);
      await frame(page, browser, `59.2-${chest}-${w}`, `Congratulations card, ${chest} chest at ${w}px — ONE line, Continue on screen`);
      const m = await cardMetrics(page);
      say('metrics', m);
      if (m.lines > 1 || !m.goVisible) console.log('      ^^ FAILS: ' + (m.lines > 1 ? 'word on ' + m.lines + ' lines' : '') + (m.goVisible ? '' : ' Continue off screen'));
    }
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

/* =======================================================================================================
   59.3 — the video's name in quotation marks on the chest words, all four chests
   Aiden on the Games chest's third word: "You've seen them all!" read bare, like a tab label or a sentence rather than the
   name of a clip. The marks are put on at render time from MSG.quote. The measurement that matters beside the picture is
   L.11d — the word still fits its CELL and stays inside two lines — because two more characters is what broke it at build 52.
   ======================================================================================================= */
scene('59.3', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, spill: { games: 1, key: 1, pro: 1, thorns: 1 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await page.evaluate(async () => { const M = await import('./progress.js'), S = await import('./core/store.js'), R = await import('./ui/router.js');
    if (M.devModesAll) M.devModesAll(); S.save(); R.show('s-pick'); }); await sleep(1100);
  await frame(page, browser, '59.3-map-words', 'Progress map, all four chests open — every video name in quotation marks, each inside its cell');
  say('words', await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => {
    const w = document.querySelector(`.chestwords[data-for="${id}"]`); if (!w || w.hidden) return [id, null];
    const cell = w.getBoundingClientRect();
    const msg = w.querySelector('.cw.msg');
    return [id, { all: [...w.querySelectorAll('.cwt')].map(x => x.textContent),
      videoWord: msg ? msg.textContent : null,
      fitsCell: msg ? msg.getBoundingClientRect().right <= cell.right + 1 : null,
      onPhone: msg ? msg.getBoundingClientRect().right <= innerWidth : null,
      heightPx: msg ? Math.round(msg.getBoundingClientRect().height) : null }];
  }))));
});

/* ---------- the runner ---------- */
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (ARGV.includes('--list')) { console.log(Object.keys(SCENES).join('\n')); process.exit(0); }

const srv = await serve();
const browser = await launch();
const page = await phonePage(browser);
const errs = [];
page.on('pageerror', e => errs.push(e.message));

// the bottom safe-area inset 59.8 is about. Chrome >= 131 takes the override; an older one says so rather than pretending.
try {
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  const read = await (async () => { await page.goto(srv.base + '/index.html', { waitUntil: 'networkidle0' });
    return page.evaluate(() => { const d = document.createElement('div');
      d.style.cssText = 'position:fixed;bottom:0;width:1px;height:env(safe-area-inset-bottom)'; document.body.appendChild(d);
      const h = getComputedStyle(d).height; d.remove(); return h; }); })();
  SAB = 'bottom ' + read + ' / top 47px';
} catch (e) { SAB = 'none — ' + String(e.message || e).slice(0, 70); }
console.log('safe area: ' + SAB);
await page.goto(srv.base + '/index.html', { waitUntil: 'networkidle0' });

const want = ARGV.filter(a => !a.startsWith('--'));
for (const name of (want.length ? want : Object.keys(SCENES))) {
  if (!SCENES[name]) { console.log('no scene "' + name + '"'); continue; }
  console.log('\n' + name);
  await SCENES[name](page, browser);
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ sab: SAB, when: new Date().toISOString(), pageErrors: errs, frames: manifest }, null, 2));
if (errs.length) console.log('\nPAGE ERRORS\n  ' + errs.join('\n  '));
console.log('\n' + manifest.length + ' frames → ' + path.relative(ROOT, OUT));
await browser.close(); srv.close();
