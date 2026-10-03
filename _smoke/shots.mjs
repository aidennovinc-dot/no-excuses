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
/* build 60: the folder follows the BUILD rather than being written here, so a build's frames land beside its own review and
   an earlier build's are never overwritten by a re-run. `--out <name>` overrides it for a before / after pair. */
const { BUILD: SHOT_BUILD } = await import('../config/build.js');
const OUT_ARG = (process.argv.indexOf('--out') >= 0 && process.argv[process.argv.indexOf('--out') + 1]) || null;
const OUT = path.join(ROOT, '..', '_review', '_shots', OUT_ARG || ('build-' + SHOT_BUILD));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ARGV = process.argv.slice(2);

/* ---------- the profile every scene starts from ----------
   A played-in profile with nothing revealed: the title sequence and the map's first open are already seen, so a scene opens
   on the screen it asked for instead of sitting through a 7s intro. Chests and bars are whatever the scene sets. */
const PLAIN = { tut: 2, story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, menuOpened: {}, snd: 'off',
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

/* the lens page (below) becomes the foreground tab the first time it is used, which leaves the app page HIDDEN — and Chrome
   stops firing requestAnimationFrame on a hidden page, so a per-frame trace taken after the first screenshot measures nothing at
   all. Every frame ends by handing the foreground back. */
async function frame(page, browser, name, note, extra = {}) {
  await page.bringToFront();
  const png = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), png);
  const im = await pixels(browser, png);
  await page.bringToFront();
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

/* =======================================================================================================
   59.5 — the Gauntlet face: Creepster out, Cinzel / Cinzel Decorative in, the flicker untouched
   Aiden: "I hate this font, it looks like horror theme when it should be serious theme, something like knightly or noble. But I
   like the flashing of the title." Cinzel is wider than Creepster, so the item's own check is the one measured here: the title
   and ENTER THE GAUNTLET each stay on ONE line at 375px, on Mini and on Mega.
   ======================================================================================================= */
scene('59.5', async (page, browser) => {
  for (const w of [375, 390]) {
    await page.setViewport({ width: w, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const g of ['g1', 'g2']) {
      await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1 }, gauntSeen: {} }));
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
      await page.evaluate(async id => { const R = await import('./ui/router.js'); R.show('s-gauntlet', { id }); }, g);
      await sleep(700);
      await page.evaluate(() => document.fonts.ready);
      await sleep(250);
      await frame(page, browser, `59.5-${g}-${w}`, `Gauntlet ${g === 'g1' ? 'Mini' : 'Mega'} at ${w}px — Cinzel${g === 'g2' ? ' Decorative' : ''}, one line each`);
      say('text', await page.evaluate(() => {
        // one line is measured off the LAYOUT: a box taller than about 1.4 line-heights has wrapped
        const one = el => { if (!el) return null; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          const inner = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
          return { text: el.textContent.trim(), family: cs.fontFamily.split(',')[0].replace(/"/g, ''), weight: cs.fontWeight,
            px: Math.round(parseFloat(cs.fontSize) * 10) / 10, lines: Math.max(1, Math.round(inner / lh)),
            rightEdge: Math.round(r.right), vw: innerWidth, onPhone: r.right <= innerWidth + .5 && r.left >= -.5 }; };
        const flick = el => el ? el.getAnimations().map(a => a.animationName).join(',') : '';
        const t = document.querySelector('#s-gauntlet .gttitle'), b = document.querySelector('#s-gauntlet .gtgo');
        return { title: one(t), button: one(b), titleAnim: flick(t), buttonAnim: flick(b) };
      }));
    }
  }
  // and the two map labels, which wear the same face
  await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
  await page.evaluate(async () => { const M = await import('./progress.js'), S = await import('./core/store.js'), R = await import('./ui/router.js');
    if (M.devModesAll) M.devModesAll(); S.save(); R.show('s-pick'); }); await sleep(1100);
  await frame(page, browser, '59.5-map-labels-375', 'Progress map at 375px — the two Gauntlet labels in the new face');
  say('labels', await page.evaluate(() => [...document.querySelectorAll('.tile.gauntlet .name')].map(n => {
    const cs = getComputedStyle(n), r = n.getBoundingClientRect(), tile = n.closest('.tile').getBoundingClientRect();
    return { text: n.textContent.trim(), family: cs.fontFamily.split(',')[0].replace(/"/g, ''), weight: cs.fontWeight,
      px: Math.round(parseFloat(cs.fontSize) * 10) / 10, fitsTile: r.right <= tile.right + 1 && r.left >= tile.left - 1 }; })));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

/* =======================================================================================================
   59.6 — the chest tile says ONE thing that fits, and the Gauntlet moves onto the key
   Aiden: "the author chest text doesn't fit within it, so that doesn't look good. Let's just do earn the author key. And maybe
   instead of having the gauntlet there, we should say in the key, it only can be wielded by the mega gauntlet or something like
   that." The acceptance is at 375px: no chest tile's text touches its drawing, in any state, on any chest. That is measured here
   as a box overlap between the tile's need text and the chest sprite — the pseudo-element is measured through a clone, because a
   ::after has no rect of its own.
   ======================================================================================================= */
const tileOverlap = page => page.evaluate(() => {
  const out = {};
  for (const id of ['games', 'key', 'pro', 'thorns']) {
    const c = document.querySelector(`#grid .chest[data-chest="${id}"]`); if (!c) { out[id] = null; continue; }
    const pic = c.querySelector('.pic'), art = pic.querySelector('.chestart');
    const need = pic.dataset.need || '';
    /* the need text is drawn by `.pic::after`, which has no getBoundingClientRect. A clone of the pseudo-element's own computed
       style, laid out in the same place with the same text, has the same box — so the overlap is measured rather than assumed. */
    const cs = getComputedStyle(pic, '::after');
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;font:${cs.font};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};white-space:${cs.whiteSpace};width:${cs.width};max-width:${cs.maxWidth};text-align:${cs.textAlign}`;
    probe.textContent = need; pic.appendChild(probe);
    const t = probe.getBoundingClientRect(); probe.remove();
    const a = art ? art.getBoundingClientRect() : null;
    out[id] = { state: c.classList.contains('open') ? 'open' : c.classList.contains('ready') ? 'ready' : 'locked',
      need, lines: need ? need.split('\n').length : 0, textW: Math.round(t.width), textH: Math.round(t.height),
      artW: a ? Math.round(a.width) : null, tileW: Math.round(c.getBoundingClientRect().width),
      // the text is drawn under the sprite, so "touching" is the text being taller than the room left for it
      fitsTile: t.width <= c.getBoundingClientRect().width + 1 };
  }
  return out; });
scene('59.6', async (page, browser) => {
  await page.setViewport({ width: 375, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const states = [['no-bars', { games: 1 }, false], ['all-bars-no-gauntlet', { games: 1, key: 1 }, true], ['pro-open', { games: 1, key: 1, pro: 1 }, true]];
  for (const [label, chests, fill] of states) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests }));
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await page.evaluate(async f => { const M = await import('./progress.js'), P = await import('./progress/key.js'), S = await import('./core/store.js'), R = await import('./ui/router.js');
      if (M.devModesAll) M.devModesAll();
      if (f) { const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1; S.store.bars = bars; }
      S.save(); R.show('s-pick'); }, fill); await sleep(1000);
    await frame(page, browser, `59.6-map-${label}-375`, `Progress map at 375px, ${label} — every chest tile's line fits its tile`);
    say('tiles', await tileOverlap(page));
  }
  // and the key's own standing line, which is where the Gauntlet requirement went
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
  await page.evaluate(async () => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
    const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1; S.store.bars = bars; S.save(); });
  for (const [i, tier] of ['clear', 'pro', 'author'].entries()) {
    await page.evaluate(async n => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 90)); R.show('s-key', { tier: n }); }, i);
    await sleep(800);
    await frame(page, browser, `59.6-key-${tier}-375`, `Keys screen at 375px, the ${tier} key — the Gauntlet line lives here now`);
    say('wield', await page.evaluate(() => { const el = document.getElementById('key-wield');
      return { shown: !!el && !el.hidden, text: el ? el.textContent.trim() : '', hint: (document.getElementById('key-hint') || {}).textContent }; }));
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

/* =======================================================================================================
   59.7 — Lantern Sky keeps its lanterns and moves onto the dark palette
   Aiden: "I really like the core of what you've done with the lantern theme, except I think it's far too bright because the
   words themselves are very difficult to read ... we should be keeping with this game's dark theme." The acceptance is MEASURED:
   the dimmest text on the Keys screen against the BRIGHTEST pixel of background it can sit over, a lantern passing behind it
   included. So the background is sampled with the text hidden — the brightest pixel in each dim line's own box, over a second of
   animation so a lantern drifting through is caught — and the ratio is computed against the text's own colour.
   59.8 — and the background reaches the bottom of the phone, every theme: the last row of pixels is the theme, not #000.
   ======================================================================================================= */
const THEMES = ['stars', 'grid', 'rain', 'orbs', 'lantern', 'circuit', 'thorn'];
scene('59.7', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1, thorns: 1 }, bg: 'lantern' }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await page.evaluate(async () => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
    const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1; S.store.bars = bars; S.save(); });
  /* The comparison is the OLD sky against the NEW one, not one theme against another: the Keys screen draws its own TIER's
     layer over whatever Customise has chosen, so the Skill key is on Lantern whatever `prefs.bg` says. Build 58's numbers are
     reproduced by putting build 58's values back into KEY_LAYER in the page — same screen, same text, same lanterns. */
  const rows = {};
  for (const sky of ['build 59 · dark', 'build 58 · dusk']) {
    await page.evaluate(async old => { const K = await import('./config/keys.js'), R = await import('./ui/router.js');
      const L = K.KEY_LAYER.lantern;
      if (old) Object.assign(L, { sky: '38,24,66', warm: .5, hz: .4 }); else Object.assign(L, { sky: '5,5,6', warm: .1, hz: .07 });
      R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-key', { tier: 0 }); }, sky.startsWith('build 58'));
    await sleep(1200);
    const bg = sky.startsWith('build 58') ? 'dusk-before' : 'dark-after';
    // scroll the key list to the bottom, which is where it failed
    await page.evaluate(() => { const l = document.getElementById('key-list'); if (l && !l.hidden) l.scrollTop = l.scrollHeight; });
    await sleep(400);
    await frame(page, browser, `59.7-keys-${bg}-390`, `Keys screen with ${bg} behind it — the dim lines measured against the background they sit on`);
    /* the boxes of the dimmest text, then the same frame with ALL text hidden, sampled across a second so a lantern drifting
       behind a line is caught. The ratio is that brightest background pixel against the line's own colour. */
    const boxes = await page.evaluate(() => {
      const dim = [...document.querySelectorAll('#s-key .hint, #s-key .keycount, #s-key .kneed, #s-key .notyet, #s-key small, #s-key .klbl')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 6 && getComputedStyle(el).visibility !== 'hidden'; });
      return dim.slice(0, 14).map(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        const m = cs.color.match(/[\d.]+/g).map(Number);
        return { cls: (el.className || el.id || el.tagName).toString().slice(0, 22), col: m.slice(0, 3), text: el.textContent.trim().slice(0, 26),
          box: { x0: Math.floor(r.x * 2), y0: Math.floor(r.y * 2), x1: Math.ceil(r.right * 2), y1: Math.ceil(r.bottom * 2) } }; });
    });
    await page.evaluate(() => { document.querySelectorAll('.screen').forEach(s => { s.style.visibility = 'hidden'; }); });
    /* TWO numbers, because they answer two different questions. WORST is the single brightest background pixel under any dim
       line across a second of animation — a lantern drifting directly behind the text — which is what the acceptance names.
       TYPICAL is the median background pixel under those lines, which is what "the whole bottom third is unreadable" was
       about: a wash you cannot escape, as against a lantern that passes. */
    let worst = null; const all = [];
    for (let k = 0; k < 6; k++) { await sleep(170);
      const im = await pixels(browser, await page.screenshot({ type: 'png' }));
      for (const b of boxes) { let top = null;
        for (let y = Math.max(0, b.box.y0); y < Math.min(im.h, b.box.y1); y++) for (let x = Math.max(0, b.box.x0); x < Math.min(im.w, b.box.x1); x++) {
          const p = px(im, x, y); all.push(contrast(b.col, p)); if (!top || lum(p) > lum(top)) top = p; }
        if (!top) continue; const c = contrast(b.col, top);
        if (!worst || c < worst.ratio) worst = { ratio: c, on: top, text: b.text, cls: b.cls, col: b.col }; }
    }
    await page.evaluate(() => { document.querySelectorAll('.screen').forEach(s => { s.style.visibility = ''; }); });
    all.sort((a, b2) => a - b2);
    const median = all.length ? Math.round(all[Math.floor(all.length / 2)] * 100) / 100 : null;
    const p05 = all.length ? Math.round(all[Math.floor(all.length * .05)] * 100) / 100 : null;
    rows[bg] = { worst: worst && worst.ratio, median, p05, brightestPixel: worst && worst.on, lines: boxes.length };
    say('contrast', rows[bg]);
  }
  console.log('      dim text vs its background — typical (median): build 58 ' + rows['dusk-before'].median + ':1  ->  build 59 ' + rows['dark-after'].median + ':1');
  console.log('      worst single pixel (a lantern passing behind):  build 58 ' + rows['dusk-before'].worst + ':1  ->  build 59 ' + rows['dark-after'].worst + ':1');
});

scene('59.8', async (page, browser) => {
  const out = {};
  for (const bg of THEMES) {
    await page.evaluate((f, b) => localStorage.setItem('ne', JSON.stringify(Object.assign({}, f, { prefs: Object.assign({}, f.prefs, { bg: b }) }))), fixture({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }), bg);
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(700);
    for (const screen of ['s-menu', 's-key']) {
      await page.evaluate(async s => { const R = await import('./ui/router.js'); R.show(s === 's-key' ? 's-key' : 's-menu', s === 's-key' ? { tier: 0 } : undefined); }, screen);
      await sleep(900);
      const im = await frame(page, browser, `59.8-${bg}-${screen}`, `${bg} on ${screen} with a 34px bottom inset — the last row of pixels must be the theme, not #000`);
      /* the bottom row of the SCREENSHOT is the bottom row of the phone. "Not #000" is not enough on its own, because the app's
         own ground is near-black too — so the row is compared against the row 120px higher, which is unambiguously the theme. */
      const rowAt = y => { let n = 0, sum = [0, 0, 0];
        for (let x = 0; x < im.w; x++) { const p = px(im, x, y); sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++; }
        return sum.map(v => Math.round(v / n)); };
      /* a PROFILE up from the bottom, not two samples: 68 device pixels is the 34px home-indicator inset, so a background that
         stops at the safe-area line shows as a step between the rows either side of it. A theme that is simply dark shows no step. */
      const prof = [1, 10, 34, 68, 90, 140].map(d => ({ up: d, mean: rowAt(im.h - d) }));
      const pure = (() => { let n = 0; for (let x = 0; x < im.w; x++) { const p = px(im, x, im.h - 1); if (p[0] === 0 && p[1] === 0 && p[2] === 0) n++; } return n; })();
      const step = Math.max(...prof.map(r => Math.abs(r.mean[0] - prof[prof.length - 1].mean[0]) + Math.abs(r.mean[1] - prof[prof.length - 1].mean[1]) + Math.abs(r.mean[2] - prof[prof.length - 1].mean[2])));
      out[bg + ' ' + screen] = { profileUpFromBottom: prof, pureBlackPixelsInLastRow: pure, maxStep: step, widthPx: im.w };
      say('bottom', out[bg + ' ' + screen]);
    }
  }
});

/* =======================================================================================================
   59.9 — the confetti is drawn at random, not off each piece's index
   Aiden: "the confetti is cool, except it looks very robotic and mechanical. It should be more randomized and human." Build 58
   had NINE start times on a 60ms grid, FIVE sways, one spin and one size for every piece, so they fell as neat horizontal rows
   of identical dashes. The acceptance is a STILL FRAME MID-FALL: no three neighbouring pieces share an angle or sit on one
   horizontal line. Both are measured off the frozen frame, and the variety is counted beside them.
   ======================================================================================================= */
scene('59.9', async (page, browser) => {
  for (const chest of CHESTS4) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await toCard(page, chest);
    // freeze mid-fall: the burst window plus about a third of the fall, so the field is in the air rather than launching
    const at = await page.evaluate(async () => { const C = await import('./config/chests.js');
      return Math.round(240 + C.CONFETTI_VARY.burst + C.CONFETTI.games.ms * .35); });
    await freezeAt(page, at);
    await sleep(60);
    await frame(page, browser, `59.9-${chest}-midfall`, `${chest} chest, confetti frozen ${at}ms in — no three neighbours on one line or at one angle`);
    say('confetti', await page.evaluate(() => {
      const pcs = [...document.querySelectorAll('.rconf .cf')].map(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        const v = k => cs.getPropertyValue(k).trim();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
          rot: Math.round(parseFloat(v('rotate')) || 0), d: v('--d'), sw: v('--sw'), s: v('--s'), tum: el.classList.contains('tum') };
      }).filter(p => p.y > -80);
      if (!pcs.length) return { pieces: 0 };
      // the VARIETY, against build 58's known 9 start times / 5 sways / one size / one spin
      const uniq = k => new Set(pcs.map(p => p[k])).size;
      /* the ACCEPTANCE, on neighbours in the order the eye reads them: left to right. "one horizontal line" is within a piece's
         own height; "one angle" is within 6 degrees, which is as close as two rotations can be and still look deliberate. */
      const byX = pcs.slice().sort((a, b) => a.x - b.x);
      let lineRuns = 0, angleRuns = 0;
      for (let i = 2; i < byX.length; i++) {
        const [a, b, c] = [byX[i - 2], byX[i - 1], byX[i]];
        const tol = Math.max(4, (a.h + b.h + c.h) / 3 * .5);
        if (Math.abs(a.y - b.y) < tol && Math.abs(b.y - c.y) < tol) lineRuns++;
        const near = (p, q) => { const d = Math.abs(((p - q) % 360 + 540) % 360 - 180); return d > 174; };
        if (near(a.rot, b.rot) && near(b.rot, c.rot)) angleRuns++;
      }
      return { pieces: pcs.length, startTimes: uniq('d'), sways: uniq('sw'), sizes: uniq('s'), angles: uniq('rot'),
        tumbling: pcs.filter(p => p.tum).length, threeOnALine: lineRuns, threeAtOneAngle: angleRuns };
    }));
  }
});

/* =======================================================================================================
   59.10 — the player fits the clip instead of boxing it into 16:9
   Aiden: "I currently see that the videos are a square, but they're very small within that player, so I feel like they should be
   widened a lot more. And the captions can actually sit outside of the box that it plays in." The frame was fixed at 16:9 with
   the video `object-fit:contain`, so a square clip was letterboxed to the frame's HEIGHT — about 184px of picture inside a 328px
   frame on a 390px phone. Three real files are driven through the real player: the 16:9 test card (must be unchanged), Aiden's
   own 9:16 clip, and a 1:1 card generated for this item because he has not shot a square one.
   ======================================================================================================= */
scene('59.10', async (page, browser) => {
  const CLIPS = [
    ['16x9', { id: 'games', title: 'The 16:9 test card', file: 'video/test-card.mp4', cc: 'video/test-card.vtt' }],
    ['9x16', { id: 'intro', title: 'Welcome', file: 'video/welcome-test.mp4', ratio: [9, 16] }],
    ['1x1', { id: 'games', title: 'Square test card', file: 'video/square-test-card.mp4', ratio: [1, 1] }],
  ];
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  for (const [label, row] of CLIPS) {
    await page.evaluate(async m => { const V = await import('./ui/video.js'); V.closeVideo && V.closeVideo(); V.playVideo(m); }, row);
    // wait for the clip's own metadata, which is what the frame's shape now comes from
    await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 80; i++) { const v = document.querySelector('#vplay video'); if (v && v.videoWidth) return; await w(60); } });
    await sleep(900);
    await frame(page, browser, `59.10-player-${label}-390`, `The shared player with a ${label} clip at 390px — the frame is the picture, captions outside it`);
    say('player', await page.evaluate(() => {
      const host = document.getElementById('vplay'), fr = host.querySelector('.vframe'), v = host.querySelector('video');
      const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
      const title = host.querySelector('.vtitle'), cc = host.querySelector('.vcc'), foot = host.querySelector('.vfoot');
      const f = box(fr), vb = v ? box(v) : null;
      const inside = el => { const r = el.getBoundingClientRect(); return r.top >= -.5 && r.bottom <= innerHeight + .5 && r.width > 0; };
      /* "nothing overlays the picture": the title, the caption strip and the foot line must each sit clear of the frame's box.
         That is the whole of item 9's rule and the thing a taller frame could break. */
      const clear = [title, cc, foot].every(el => { const r = el.getBoundingClientRect(); return r.bottom <= f.y + .5 || r.top >= f.bottom - .5; });
      return { clip: v ? [v.videoWidth, v.videoHeight] : null, frame: f, picture: vb,
        pictureFillsFrame: !!vb && Math.abs(vb.w - f.w) <= 2 && Math.abs(vb.h - f.h) <= 2,
        titleOnScreen: inside(title), captionsOnScreen: inside(cc), footOnScreen: inside(foot),
        nothingOverPicture: clear, vw: innerWidth, vh: innerHeight };
    }));
  }
  await page.evaluate(async () => { const V = await import('./ui/video.js'); V.closeVideo && V.closeVideo(); });
});

/* =======================================================================================================
   59.11 — "% complete" moves from the first game
   Aiden, on a menu reading "0% complete": "The percent complete just stays at zero until I've opened the Games chest. It should go
   towards 100% as we play the game." The evidence is the figure on the FRONT of the app at four points a player actually passes.
   ======================================================================================================= */
scene('59.11', async (page, browser) => {
  const steps = [
    ['new-profile', async () => {}],
    ['one-mode-unlocked', async () => page.evaluate(async () => { const S = await import('./core/store.js'), U = await import('./config/unlocks.js');
      const k = U.UNLOCKS.filter(x => x.key.split(':').length === 2)[0].key; S.store.unlock = { [k]: Date.now() }; S.save(); })],
    ['every-mode-unlocked', async () => page.evaluate(async () => { const S = await import('./core/store.js'), U = await import('./config/unlocks.js');
      S.store.unlock = Object.fromEntries(U.UNLOCKS.map(u => [u.key, Date.now()])); S.save(); })],
    ['games-chest-open-key-whole', async () => page.evaluate(async () => { const S = await import('./core/store.js'), K = await import('./progress/key.js'), U = await import('./config/unlocks.js');
      S.store.unlock = Object.fromEntries(U.UNLOCKS.map(u => [u.key, Date.now()]));
      S.prefs.chests = { games: 1, key: 0, pro: 0, thorns: 0 };
      const bars = {}; for (const c of K.COMBOS) bars[c.key] = 1; S.store.bars = bars; S.save(); })],
  ];
  for (const [label, set] of steps) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await set();
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); await new Promise(r => setTimeout(r, 120)); R.show('s-menu'); });
    await sleep(1500);   // the menu's count-up is 900ms
    await frame(page, browser, `59.11-menu-${label}`, `The menu at "${label}" — the figure a player sees on the front of the app`);
    say('menu', await page.evaluate(async () => { const K = await import('./progress/key.js'), el = document.getElementById('menu-key');
      return { line: el && !el.hidden ? el.textContent.trim() : null, meter: K.meter(), shown: K.meterPct(), max: K.meterMax() }; }));
  }
});

/* =======================================================================================================
   59.12 — the Gauntlet result shows its working
   Aiden: "I don't know how I got 310%." Every row now carries the number he scored and the bar it was measured against, so the
   figure can be read back off the screen. The frame below is HIS OWN Mini run, replayed through the new scoring — the raw result
   of each step recovered by inverting the old arithmetic, then re-scored against the Author column with the 150 cap.
   ======================================================================================================= */
scene('59.12', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1 }, gauntSeen: { g1: 1 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  const out = await page.evaluate(async his => {
    const G = await import('./config/gauntlets.js'), R = await import('./run/gauntlet.js'), K = await import('./progress/key.js'),
      Rt = await import('./ui/router.js');
    const refOf = ref => K.COMBOS.find(c => c.key === ref);
    const runs = G.GAUNTLET_RUNS.g1.map(st => { const key = st.web || (st.g + ':' + st.d), was = his[key];
      const c = refOf(st.ref); let bar = K.barOf(c, 'clear');
      if (st.tot) { const rl = +String(st.ref).split(':')[2]; if (rl > 0) bar = bar * (st.s / rl); }
      const v = c.bar.dir === 'lower' ? bar * 100 / was : bar * was / 100;
      return { hits: v }; });
    const web = R.webOf(G.GAUNTLET_RUNS.g1, runs), score = R.scoreOf(web);
    const done = { id: 'g1', score, web, verdict: R.gauntVerdict(score) };
    Rt.show('s-gauntlet', { id: 'g1', done });
    return { score, rows: web.map(r => ({ key: r.key, pct: r.pct, work: (r.work || []).map(w => w.you + ' / bar ' + w.barShown + (w.capped ? ' CAPPED' : '')) })) };
  }, { 'quick-tap:two': 155.6, 'dots:blind': 142.9, hold: 242.8, 'reaction:flash': 128.3, 'reaction:nogo': 139.9, 'timing:stopwatch': 172.4, 'timing:hidden': 263.2, 'spot:find': 1241.4 });
  await sleep(900);
  await frame(page, browser, '59.12-result-390', "Aiden's own 310.8% Mini run, replayed through build 59's scoring — every row shows its working");
  say('replay', out);
});

/* =======================================================================================================
   59.13 — the finished key must not flash up before its own animation, on any of the three keys
   Aiden: "it shows a brief frame showing that the key was already complete, but then it does the animation again. So that just
   looks a little awkward." The Keys screen appeared with the whole key drawn, held it about three frames, blanked to the bare hub
   and only then drew the spokes in. The acceptance is per-frame: step the first 500ms and let no frame show a lit spoke before its
   turn. Sampled at 60fps INSIDE the page, because the fault lives in the first paint and a screenshot every 16ms cannot be taken
   fast enough to catch it — a frame trace is the measured frame the rule asks for, and the first frame is photographed beside it.
   ======================================================================================================= */
scene('59.13', async (page, browser) => {
  for (const [i, tier] of ['clear', 'pro', 'author'].entries()) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: 1, pro: 1, thorns: 0 } }));
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    await page.evaluate(async () => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
      const bars = {}; for (const c of P.COMBOS) for (const t of ['', '|pro', '|author']) bars[c.key + t] = 1;
      S.store.bars = bars; S.prefs.revealed = {}; S.save(); });
    /* HIS OWN PATH: the key is set whole from Testing, then the chest is tapped on the Progress map, which lands on the Keys
       screen. The trace starts on the frame the screen is shown, which is the frame the whole key used to appear on. */
    const trace = await page.evaluate(async n => {
      const R = await import('./ui/router.js');
      const rows = []; const t0 = performance.now();
      const dbg = { shown: null, vis: document.visibilityState, raf: 0 };
      R.show('s-key', { tier: n });
      dbg.shown = (document.querySelector('.screen.on') || {}).id; dbg.vis = document.visibilityState;
      window.__dbg = dbg;
      /* the tick can never throw its way out of the loop and leave the promise hanging: anything unexpected is recorded and the
         trace ends. A wall-clock fallback closes it too, because rAF does not fire while the page is busy with something heavy. */
      return await new Promise(res => {
        let over = false; const end = () => { if (!over) { over = true; res(rows); } };
        setTimeout(end, 3000);
        const tick = () => { if (over) return; dbg.raf++;
          try { const t = performance.now() - t0;
            const el = document.getElementById('s-key');
            const spokes = [...document.querySelectorAll('#key-ring .kr')].map(g => Math.round((parseFloat(getComputedStyle(g).opacity) || 0) * 100) / 100);
            const ring = document.querySelector('#key-ring .kring');
            rows.push({ t: Math.round(t), lit: spokes.filter(o => o > .02).length, spokes,
              ring: ring ? Math.round((parseFloat(getComputedStyle(ring).opacity) || 0) * 100) / 100 : null,
              cls: el ? el.className.replace(/\bon\b/, '').trim() : 'no #s-key' });
            if (t < 520) requestAnimationFrame(tick); else end();
          } catch (e) { rows.push({ t: -1, lit: -1, spokes: [], err: String((e && e.message) || e) }); end(); } };
        requestAnimationFrame(tick);
      });
    }, i);
    await page.evaluate(async n => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 80)); R.show('s-key', { tier: n }); }, i);
    await sleep(40);
    await frame(page, browser, `59.13-${tier}-first-frame`, `The ${tier} key the frame its screen appears — the bare hub, never the finished key`);
    // a spoke may only light AT OR AFTER its own scheduled turn; before that the trace must read zero lit
    if (!trace.length) { say('trace', { tier, frames: 0, note: 'no animation frame fired — nothing measured, NOT a pass', dbg: await page.evaluate(() => window.__dbg || null) }); continue; }
    /* and the same trace with BUILD 58's paint put back, so the number beside it is a comparison and not a claim: a rule of higher
       specificity that lights the key while `kdue` is on and `kearning` has not arrived yet is exactly what the screen used to do. */
    if (tier === 'clear') {
      const was = await page.evaluate(async n => {
        const R = await import('./ui/router.js');
        const st = document.createElement('style'); st.id = '__b58';
        st.textContent = '#s-key.kdue:not(.kearning):not(.ksettle) .kr,#s-key.kdue:not(.kearning):not(.ksettle) .knode,#s-key.kdue:not(.kearning):not(.ksettle) .kring{opacity:1}';
        document.head.appendChild(st);
        R.show('s-menu'); await new Promise(r => setTimeout(r, 90));
        const rows = []; const t0 = performance.now();
        R.show('s-key', { tier: n });
        return await new Promise(res => { let over = false; const end = () => { if (!over) { over = true; st.remove(); res(rows); } };
          setTimeout(end, 3000);
          const tick = () => { if (over) return;
            try { const t = performance.now() - t0;
              const lit = [...document.querySelectorAll('#key-ring .kr')].filter(g => (parseFloat(getComputedStyle(g).opacity) || 0) > .02).length;
              rows.push({ t: Math.round(t), lit });
              if (t < 520) requestAnimationFrame(tick); else end();
            } catch (e) { end(); } };
          requestAnimationFrame(tick); });
      }, i);
      say('build58Paint', was.length ? { frames: was.length, litOnFirstFrame: was[0].lit, framesFullyLitBeforeTheAnimation: was.filter((r, k) => r.lit === 7 && k < 12).length } : { frames: 0 });
    }
    const firstLit = trace.find(r => r.lit > 0);
    const worst = trace.reduce((m, r) => Math.max(m, r.lit), 0);
    say('trace', { tier, frames: trace.length, spanMs: trace[trace.length - 1].t, spokes: trace[0].spokes.length,
      litOnFirstFrame: trace[0].lit, maxLitInFirst500ms: worst,
      firstFrameWithAnyLitSpoke: firstLit ? { t: firstLit.t, lit: firstLit.lit } : null,
      classesOnFirstFrame: trace[0].cls });
  }
});

/* =======================================================================================================
   59.14 — the earn moment: motion fills the time, the prompt lands when it ends, a tap anywhere opens the chest
   This is 57.7 for the second time. Build 57 measured it with `_smoke/measure-earn.mjs`, which showed 420–504ms of dead air;
   Aiden's own recordings show 4.6s (Skill) and 5.8s (Pro). The difference is the PATH: the harness drove the key screen
   directly, and he came through Testing → the Progress map → a tap on the chest tile. So this walks HIS path and measures THAT,
   in pixels — a frame every `STEP_MS` from the moment the Keys screen appears until the prompt shows or the screen leaves.
   ======================================================================================================= */
const EARN_STEP_MS = 100;
async function earnRun(page, browser, tier, tierIx, label) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ chests: { games: 1, key: tierIx > 0 ? 1 : 0, pro: tierIx > 1 ? 1 : 0, thorns: 0 } }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
  /* HIS PATH, step for step: Testing sets this key whole, then the Progress map, then a tap on that key's chest tile — which is
     what lands on the Keys screen with the earn due. Nothing here shows the key screen directly, which is what build 57 did. */
  const chest = ['key', 'pro', 'thorns'][tierIx];
  /* HIS STATE, reached deterministically instead of through Testing's switch — which plays a reveal of its own and left the chest
     already open, so the measurement started after the thing it was meant to measure. What matters about his path is what it LANDS
     ON: this key whole, its chest READY and not yet opened, and nothing revealed — then the tap on that chest's tile on the
     Progress map, which is the tap he made. The clock starts on the frame the earn is first on screen. */
  await page.evaluate(async t => { const P = await import('./progress/key.js'), S = await import('./core/store.js');
    const tiers = ['clear', 'pro', 'author'].slice(0, t + 1);
    const bars = {}; for (const c of P.COMBOS) for (const ti of tiers) bars[P.skey(c.key, ti)] = 1;
    S.store.bars = bars; S.prefs.revealed = {}; S.prefs.keyWhole = {}; S.save(); }, tierIx);
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(250);
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); }); await sleep(900);
  await page.bringToFront();
  const pre = await page.evaluate(async c => { const K = await import('./progress/key.js'), el = document.getElementById('s-key');
    return { screen: (document.querySelector('.screen.on') || {}).id, chestState: K.chestState(c),
      keyWhole: K.keyState(['clear', 'pro', 'author'][['key', 'pro', 'thorns'].indexOf(c)]).whole,
      keyOn: !!(el && el.classList.contains('on')) }; }, chest);
  /* THE KEY SCREEN IS WHERE THE MOMENT LIVES. A tap on a READY chest tile starts the CHEST'S reveal, and a reveal already running
     is exactly what stops the key screen scheduling the key's earn (ui/screens/key.js: `!revealOn()`) — so that tap measures the
     chest opening, not this. What his Pro recording shows is the key screen's own moment: the key whole, its chest ready and
     unopened, nothing revealed, the earn playing and then the screen waiting on "TAP THE KEY TO OPEN THE PRO CHEST". That is the
     state reached above and the screen opened here, and the clock starts on the frame the earn is first on screen. */
  await page.evaluate(async t => { const R = await import('./ui/router.js'); R.show('s-key', { tier: t }); }, tierIx);
  // wait for the earn moment to actually be on screen before the clock starts, so t=0 is the frame HE sees it on
  await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 120; i++) { const el = document.getElementById('s-key');
      if (el && el.classList.contains('on') && /kearning|kdue/.test(el.className)) return; await w(50); } });
  const shots = [];
  let prev = null, firstPrompt = null, left = null;
  for (let i = 0; i < 140; i++) {
    const png = await page.screenshot({ type: 'png' });
    const im = await pixels(browser, png);
    const state = await page.evaluate(() => { const h = document.getElementById('key-cere'), el = document.getElementById('s-key');
      const hint = document.getElementById('key-hint'), cp = document.querySelector('.keprompt');
      const vis = e => { if (!e) return false; const cs = getComputedStyle(e);
        return cs.visibility !== 'hidden' && cs.display !== 'none' && (parseFloat(cs.opacity) || 0) > .3 && e.textContent.trim().length > 0; };
      /* the PROMPT is the one that arrives after the earn — a dedicated element, or the hint once the earn moment has let go of
         the screen. The screen's ordinary hint ("tap a game · solo runs only") is not it, and counting it was why the first run
         of this measurement reported a prompt on frame one. */
      const earning = el ? /kearning|kdue|ksettle/.test(el.className) : false;
      const hintTxt = vis(hint) ? hint.textContent.trim() : '';
      const isPrompt = /tap/i.test(hintTxt) && /chest|continue/i.test(hintTxt);
      return { screen: (document.querySelector('.screen.on') || {}).id, cere: !!(h && !h.hidden),
        cereStep: h ? h.dataset.step || '' : '', earn: earning,
        promptShown: vis(cp) || isPrompt, promptText: (cp && cp.textContent.trim()) || (isPrompt ? hintTxt : '') }; });
    // a coarse subsample is enough to answer "did anything move": every 4th pixel, any channel differing by more than 6
    let changed = 0;
    if (prev) { for (let y = 0; y < im.h; y += 4) for (let x = 0; x < im.w; x += 4) {
      const a = px(im, x, y), b = px(prev, x, y);
      if (Math.abs(a[0] - b[0]) > 6 || Math.abs(a[1] - b[1]) > 6 || Math.abs(a[2] - b[2]) > 6) changed++; } }
    shots.push({ t: i * EARN_STEP_MS, changed, ...state });
    if (!firstPrompt && state.promptShown && state.screen === 's-key') firstPrompt = i * EARN_STEP_MS;
    if (firstPrompt === null && state.screen && state.screen !== 's-key' && i > 3) { left = { t: i * EARN_STEP_MS, to: state.screen }; break; }
    if (firstPrompt !== null && i * EARN_STEP_MS - firstPrompt > 900) break;
    prev = im;
    await sleep(Math.max(0, EARN_STEP_MS - 60));
  }
  // the longest run of frames with nothing moving, before the prompt
  const before = shots.filter(s => firstPrompt === null || s.t <= firstPrompt);
  let run = 0, worst = 0, worstAt = null;
  for (const s of before.slice(1)) { if (s.changed === 0) { run++; if (run > worst) { worst = run; worstAt = s.t; } } else run = 0; }
  /* how legible the prompt is, against the chest ceremony's own "tap to continue", which is the item's yardstick: the rendered
     colour at its rendered opacity, as a contrast ratio on the screen's ground. */
  const legible = await page.evaluate(() => {
    const read = el => { if (!el) return null; const cs = getComputedStyle(el);
      const m = (cs.color.match(/[\d.]+/g) || []).map(Number), o = parseFloat(cs.opacity) || 0;
      return { rgb: m.slice(0, 3), opacity: o, px: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        pulses: el.getAnimations().map(a => a.animationName).join(',') }; };
    const probe = document.createElement('i'); probe.className = 'ctap'; probe.style.cssText = 'position:fixed;left:-999px';
    const host = document.createElement('div'); host.className = 'cere'; host.appendChild(probe); document.body.appendChild(host);
    const ctap = read(probe); host.remove();
    return { prompt: read(document.getElementById('key-hint')), ceremonyTapToContinue: ctap }; });
  await frame(page, browser, `59.14-${label}-${tier}-prompt`, `${tier} key — the frame the prompt arrives`);
  say('promptLegibility', legible);
  say('earn', { tier, path: 'Testing sets the key whole → Progress map → tap the chest tile → Keys screen', beforeTheTap: pre,
    firstFrames: shots.slice(0, 6).map(s2 => `${s2.t}:${s2.screen}${s2.earn ? '+earn' : ''}${s2.cere ? '+cere' : ''}${s2.promptShown ? '+PROMPT' : ''} ch${s2.changed}`),
    sampleEveryMs: EARN_STEP_MS, promptAtMs: firstPrompt, leftWithoutATap: left,
    longestStillStretchMs: worst * EARN_STEP_MS, longestStillEndedAtMs: worstAt,
    promptText: (shots.find(s => s.promptShown) || {}).promptText || null, frames: shots.length });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  return { firstPrompt, worst: worst * EARN_STEP_MS, left, shots };
}
scene('59.14-before', async (page, browser) => {
  for (const [i, tier] of ['clear', 'pro', 'author'].entries()) await earnRun(page, browser, tier, i, 'before');
});
scene('59.14', async (page, browser) => {
  for (const [i, tier] of ['clear', 'pro', 'author'].entries()) await earnRun(page, browser, tier, i, 'after');
});

/* =======================================================================================================
   59.16 — the gauntlet takes the key and drives it into the lock, on the Pro and Author chests
   Aiden: "it shows that the key and the gauntlet are next to each other, but it happens so quickly the user can't see. What should
   instead happen is that the key is sitting there and then the gauntlet comes out, holds the key, and then pushes it into the chest
   to unlock it." The acceptance is the two DURATIONS: the key visible alone for at least 0.6s, and gauntlet-holding-key visible for
   at least 1s before the lock turns. Frozen frames at each beat, with the glove's and the key's own opacity read off the page.
   ======================================================================================================= */
scene('59.16', async (page, browser) => {
  for (const chest of ['pro', 'thorns']) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    const beats = await page.evaluate(async c => { const C = await import('./config/chests.js');
      const st = C.CEREMONY[c].steps, at = n => st.find(x => x.name === n) || null;
      return { ms: C.CEREMONY[c].ms, steps: st.map(x => x.name), hold: at('hold'), enter: at('enter'), grip: at('grip'), drive: at('drive'), turn: at('turn') }; }, chest);
    for (const b of ['hold', 'enter', 'grip', 'drive', 'turn']) {
      const t = beats[b].at + Math.round(beats[b].ms * .6);
      await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(300);
      await page.evaluate(c => { const el = document.querySelector(`[data-act="dev-chest"][data-chest="${c}"]`); if (el) el.click(); }, chest);
      await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < 80; i++) { if (document.querySelector('.cere .ckeyg')) return; await w(20); } });
      await freezeAt(page, t); await sleep(50);
      await frame(page, browser, `59.16-${chest}-${b}`, `${chest} chest at the ${b} beat (t=${t}ms of ${beats.ms}ms)`);
      say('beat', await page.evaluate(() => { const o = s2 => { const el = document.querySelector(s2); if (!el) return null;
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          return { opacity: Math.round((parseFloat(cs.opacity) || 0) * 100) / 100, y: Math.round(r.y), h: Math.round(r.height) }; };
        return { key: o('.cere .ckeyg'), glove: o('.cere .chandg'), gauntOnHost: document.getElementById('key-cere').dataset.gaunt || null }; }));
    }
    say('timings', { chest, ms: beats.ms, steps: beats.steps.join(' · '),
      keyAloneMs: beats.enter.at - beats.hold.at,
      holdingKeyBeforeTheTurnMs: beats.turn.at - (beats.grip.at + beats.grip.ms) + beats.grip.ms });
  }
});

/* =======================================================================================================
   60.1 — the Skill chest can be opened. Aiden's own path, on all three keys.
   "Earn the Skill key, open the Skill key screen, tap the key or 'tap to open the Skill chest', and the dialog appears.
   Neither button does anything." Cowork guessed the Lantern effects layer was catching the taps. It was not: `#stars` is
   the first element in the body and every positioned screen paints over it. The cause is build 59's own 59.14 — a capture
   listener on `#s-key` that swallows every pointerdown while the chest prompt is up, so that a tap anywhere opens the
   chest. `askOpen()` never touches `#key-hint`, so the prompt is still up while its own dialog is, and the listener ate
   the taps on Open and Not yet and re-raised the same box.
   The proof is the Open button's own pointerdown: `defaultPrevented` is the swallow, and `chestState` is the outcome.
   Frames: the prompt, the dialog, and the frame after Open — which on build 59 is the dialog again.
   ======================================================================================================= */
scene('60.1', async (page, browser) => {
  for (const [chest, ix, label] of [['key', 0, 'Skill'], ['pro', 1, 'Pro'], ['thorns', 2, 'Author']]) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
    // Testing's switch: every chest before this one opened the way play does, this one left READY and its key whole
    await page.evaluate(async c => { const K = await import('./progress/key.js'), P = await import('./progress.js');
      K.devReach(c, P.devModesAll); }, chest);
    await page.evaluate(async i => { const R = await import('./ui/router.js'); R.show('s-key', { tier: i, from: 's-testing' }); }, ix);
    await sleep(1400);
    const pre = await page.evaluate(async c => { const K = await import('./progress/key.js');
      const h = document.getElementById('key-hint');
      return { chest: K.chestState(c), prompt: h.classList.contains('kprompt'), promptText: h.textContent.trim() }; }, chest);
    await frame(page, browser, `60.1-${chest}-a-prompt`, `${label} key whole, its chest READY — the prompt Aiden taps`);
    say('before', pre);

    // tap the key: the ask goes up
    await page.evaluate(() => { const el = document.querySelector('#s-key [data-act="key-chest"]');
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    await sleep(500);
    await frame(page, browser, `60.1-${chest}-b-ask`, `${label} key — "Open the ${label} chest?", Open / Not yet`);
    say('askBox', await page.evaluate(() => { const b = document.getElementById('key-ask');
      return { shown: !b.hidden, buttons: [...b.querySelectorAll('button')].map(x => x.textContent.trim()) }; }));

    // THE TAP UNDER TEST: Open
    const tap = await page.evaluate(() => { const b = document.querySelector('[data-act="key-ask-yes"]');
      const ev = new PointerEvent('pointerdown', { bubbles: true, cancelable: true }); b.dispatchEvent(ev);
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return { pointerdownDefaultPrevented: ev.defaultPrevented }; });
    await sleep(900);
    await frame(page, browser, `60.1-${chest}-c-after-open`, `${label} chest, 900ms after Open — the ceremony, where build 59 showed the same dialog`);
    say('open', Object.assign(tap, await page.evaluate(async c => { const K = await import('./progress/key.js');
      const cere = document.getElementById('key-cere');
      return { chestState: K.chestState(c), askStillUp: !document.getElementById('key-ask').hidden,
        ceremonyPlaying: !cere.hidden, ceremonyNodes: cere.querySelectorAll('svg,.cbig,.cchestg').length }; }, chest)));
    say('starsPointerEvents', await page.evaluate(() => getComputedStyle(document.getElementById('stars')).pointerEvents));
    // and a later beat, where the chest itself is on screen — the assembly at 900ms is the bars flying in, which reads as orbs alone
    await sleep(2600);
    await frame(page, browser, `60.1-${chest}-d-chest`, `${label} chest mid-ceremony (~3.5s after Open) — the chest itself, the key turning in the lock`);
    say('ceremony', await page.evaluate(() => { const c = document.getElementById('key-cere');
      return { step: c.dataset.step || null, chestDrawn: c.querySelectorAll('.cchestg,.cbig').length, keyDrawn: c.querySelectorAll('.ckeyg').length }; }));
  }
});

/* ---------- driving a real run, for the Find and Count scenes (build 60) ---------- */
const goRun = (page, sel) => page.evaluate(async sel => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
  const SS = await import('./core/store.js');
  for (const k of ['spot', 'spot:find', 'spot:count', 'timing', 'timing:stopwatch', 'timing:hidden', 'hold', 'hold:grow', 'hold:cut', 'reaction', 'reaction:flash', 'reaction:nogo', 'quick-tap', 'quick-tap:two', 'dots', 'dots:blind', 'sequence', 'sequence:solo']) SS.store.intro[k] = Date.now();
  SS.save(); Object.assign(ST.sel, { vs: 0, practice: 0 }, sel); RUN.start(); }, sel);
const abortRun = page => page.evaluate(async () => (await import('./run/run.js')).abort());
const waitFor = (page, fn, ms = 15000) => page.evaluate(async (src, ms) => { const f = new Function('return (' + src + ')')();
  const t0 = Date.now(); while (Date.now() - t0 < ms) { let v = null; try { v = f(); } catch (e) {} if (v) return true; await new Promise(r => setTimeout(r, 50)); } return false; }, fn.toString(), ms);

/* =======================================================================================================
   60.2 / 60.3 — every shape is visible in the Find field, and the target is never buried
   The item's own test: deal many rounds and fail if any target is less than about 90% visible. The measurement is
   geometric and done on the live DOM — each shape's own box against every box drawn AFTER it (later elements paint over
   earlier ones, and the target is index 0, so it is under every decoy it touches) — plus a rendered check that the shape
   has a paint at all under the game's own colour scheme.
   ======================================================================================================= */
const findMetrics = page => page.evaluate(() => { const SP = window.__spot;
  const els = [...document.querySelectorAll('#gen .fs')]; if (!els.length || !SP) return null;
  const rects = els.map(e => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, a: r.width * r.height }; });
  const over = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const visible = i => { const me = rects[i]; if (!me.a) return 0;
    // a conservative union: the largest single cover, plus the rest summed, capped at 1 — it can only UNDER-state visibility
    let sum = 0; for (let j = i + 1; j < rects.length; j++) sum += over(me, rects[j]);
    return Math.max(0, 1 - Math.min(1, sum / me.a)); };
  const paint = els.map(e => { const p = e.querySelector('path'); const cs = p && getComputedStyle(p);
    return cs ? { fill: cs.fill, stroke: cs.stroke, w: cs.strokeWidth } : null; });
  const ti = els.findIndex(e => e.classList.contains(SP.odd));
  return { n: els.length, odd: SP.odd, targetIx: ti, targetVisible: Math.round(visible(ti) * 100),
    worstDecoy: Math.round(Math.min(...els.map((_, i) => i === ti ? 1 : visible(i))) * 100),
    fills: [...new Set(paint.map(p => p && p.fill))], strokes: [...new Set(paint.map(p => p && p.stroke))] }; });

scene('60.2-60.3', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  const rows = [], shot = {};
  /* Every round is dealt through the engine's own findRound(), with the round number set first — so the later bands (which is
     where ring, crescent and spiral arrive) are dealt exactly as play deals them rather than mocked. The deck is a deck per RUN,
     so each pass is a fresh run; six passes over rounds 1–10 is the item's "deal many rounds". */
  for (let pass = 0; pass < 6; pass++) {
    await goRun(page, { game: 'spot', diff: 'find', secs: 10 });
    await waitFor(page, () => document.querySelectorAll('#gen .fs').length > 3);
    await page.evaluate(async () => { window.__spot = (await import('./games/spot/index.js')).default; });
    for (let r = 1; r <= 10; r++) {
      await page.evaluate(n => { const S = window.__spot; S.clearT(); S.round = n; S.findRound(); }, r);
      await sleep(1550);   // findRound shows the crowd 1.4s after it deals
      const m = await findMetrics(page);
      if (!m) break;
      m.round = r; rows.push(m);
      // and again after three seconds of drift — the item asks for "including during motion"
      await sleep(3000); const m2 = await findMetrics(page);
      if (m2) { m2.round = r; m2.moving = 1; rows.push(m2); }
      // a frame for each of the shapes 60.2 names, the first time it comes up as the target
      if (['ring', 'crescent', 'spiral'].includes(m.odd) && !shot[m.odd]) { shot[m.odd] = 1;
        await frame(page, browser, `60.2-find-${m.odd}`, `Find round ${r}, "find the ${m.odd}" — ${m.n} shapes, target ${m.targetVisible}% visible`);
        say('field', m); }
    }
    await abortRun(page); await sleep(300);
  }
  const worst = rows.reduce((a, r) => Math.min(a, r.targetVisible), 100);
  const under = rows.filter(r => r.targetVisible < 90);
  await frame(page, browser, '60.2-find-last', 'the last Find field of the pass');
  say('overTheRounds', { rounds: rows.length, worstTargetVisible: worst + '%',
    targetsUnder90pc: under.length + ' of ' + rows.length,
    dealt: rows.filter(r => !r.moving).length + ' at the deal, ' + rows.filter(r => r.moving).length + ' after 3s of drift',
    worstFive: rows.slice().sort((a, b) => a.targetVisible - b.targetVisible).slice(0, 5).map(r => `r${r.round}${r.moving ? ' moving' : ''} ${r.odd} ${r.targetVisible}%`).join(' · '),
    shapesSeenAsTarget: [...new Set(rows.map(r => r.odd))].join(','),
    fills: [...new Set(rows.flatMap(r => r.fills))], strokes: [...new Set(rows.flatMap(r => r.strokes))] });
  console.log('      worst target visibility over ' + rows.length + ' rounds: ' + worst + '%  ·  under 90%: ' + under.length);
  await abortRun(page); await sleep(300);
});

/* ---------- pointer helpers, for the scenes that play a round (build 60) ---------- */
const ptr = (page, type, sel, fx = .5, fy = .5) => page.evaluate((t, s, fx, fy) => { const el = document.querySelector(s); if (!el) return false;
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }));
  return true; }, type, sel, fx, fy);

/* =======================================================================================================
   60.4 / 60.12 / 60.18 — the allowance-Streak round screen, one layout for Grow, Hidden and Flash
   Flash read: verdict, big time, "BASELINE 150 MS", "+0 MS", "TOTAL 398 OF 1000 MS". The new order is the item's —
   verdict, big number, the amount over the allowance (draining), a slim budget bar with this round's addition lighting up
   as it drains in, and the allowance as a dim caption at the bar's end. The frames are the middle of the drain, so the
   lit share is visible, and the manifest carries the measured widths.
   ======================================================================================================= */
const allowMetrics = (page, id) => page.evaluate(i => { const host = document.getElementById(i); if (!host) return null;
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const bar = host.querySelector('.abar');
  return { add: (host.querySelector('.aadd') || {}).textContent, addBox: box(host.querySelector('.aadd')),
    bar: box(bar), spent: box(host.querySelector('.aspent')), lit: box(host.querySelector('.anew')),
    free: (host.querySelector('.afree') || {}).textContent, freeBox: box(host.querySelector('.afree')),
    order: [...host.children].map(e => e.className) }; }, id);

scene('60.4', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await goRun(page, { game: 'hold', diff: 'grow', secs: -1 });
  /* the hold that lands a round a chosen distance off: the demo's own sum (target ÷ holdRate·vmin) is the hold that matches
     the area exactly, and area goes as the square of the size, so √(1 + e) of it lands e over. Round 3 is deliberately 12%
     off — over the 4% allowance, so there is something to watch drain. */
  const holdFor = over => page.evaluate(async e => { const HD = (await import('./games/estimate/index.js')).default;
    const { CFG } = await import('./config/games.js'); const { vmin } = await import('./core.js');
    return HD.target / (CFG.holdRate * vmin()) * 1000 * Math.sqrt(1 + e / 100); }, over);
  let shot = false;
  for (let round = 1; round <= 6 && !shot; round++) {
    await waitFor(page, () => document.getElementById('hbg') && document.getElementById('hbg').classList.contains('on'), 20000);
    const ms = await holdFor(12);
    // the previous round's block is taken out first, so waiting for one can only ever find THIS round's
    await page.evaluate(() => { const o = document.getElementById('hallow'); if (o) o.remove(); });
    await ptr(page, 'pointerdown', '#hfield'); await sleep(Math.round(ms)); await ptr(page, 'pointerup', '#hfield');
    // the reveal chains target → yours → difference → % → the drain; the block lands with the drain and is LAID OUT then
    const up = await waitFor(page, () => { const h = document.getElementById('hallow'); if (!h) return false;
      const b = h.querySelector('.abar'); return !!b && b.getBoundingClientRect().width > 10; }, 14000);
    if (up) {
      await sleep(420);   // mid-drain, so the lit share is part-way across the bar
      // measured BEFORE the frame: `frame()` hands the tab to the lens page to decode the PNG, and a backgrounded page
      // reports a zero box for everything
      const met = await allowMetrics(page, 'hallow');
      const bud = await page.evaluate(async () => { const HD = (await import('./games/estimate/index.js')).default;
        const G = await import('./config/games.js');
        return { free: G.ESTIMATE.GROW_FREE + '%', budget: G.ESTIMATE.STREAK_BUD + '%', spentSoFar: Math.round(HD.total * 100) / 100,
          roundsPlayed: HD.errs.length, rawErrors: HD.errs.map(e => Math.round(e * 10) / 10),
          spentPerRound: HD.errs.map(e => Math.round(Math.max(0, e - G.ESTIMATE.GROW_FREE) * 10) / 10) }; });
      await frame(page, browser, '60.4-grow-streak-round', 'Grow Streak round screen — the 60.18 allowance layout: the amount over the allowance draining, the budget bar with this round lit, the caption');
      say('allowance', met); say('budget', bud);
      shot = true;
    }
    await sleep(1400); await ptr(page, 'pointerdown', '#game'); await ptr(page, 'pointerup', '#game'); await sleep(600);
  }
  await abortRun(page); await sleep(300);
});

scene('60.12', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await goRun(page, { game: 'timing', diff: 'hidden', secs: -1 });
  let shot = false;
  for (let round = 1; round <= 6 && !shot; round++) {
    // tap a fixed distance past the marker, so the round's miss is a known number well over the 50ms allowance
    await page.evaluate(async () => { window.__tm = (await import('./games/timing/index.js')).default; });
    const ok = await waitFor(page, () => { const M = window.__tm; return M && M.st === 'run' && M.ball && M.t0; }, 20000);
    if (!ok) { console.log('      never reached a live round'); break; }
    await page.evaluate(() => { const o = document.getElementById('tmallow'); if (o) o.remove(); });
    // the tap lands 180ms after the marker: 180ms raw, 130ms spent
    await page.evaluate(async () => { const M = window.__tm = window.__tm || (await import('./games/timing/index.js')).default;
      const b = M.ball, at = M.t0 + (b.markT / b.v + 0.18) * 1000;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      while (performance.now() < at - 4) await wait(2);
      M.onDown({ type: 'down', t: at }); });
    const up = await waitFor(page, () => { const h = document.getElementById('tmallow'); if (!h) return false;
      const b = h.querySelector('.abar'); return !!b && b.getBoundingClientRect().width > 10; }, 6000);
    if (up) {
      await sleep(380);
      const met = await allowMetrics(page, 'tmallow');
      const bud = await page.evaluate(async () => { const M = window.__tm; const G = await import('./config/games.js');
        return { free: G.HIDDEN.free + 'ms', budget: M.budget() + 'ms', spentSoFar: Math.round(M.tot),
          roundsPlayed: M.errs.length, rawMiss: M.errs.map(e => Math.round(e)),
          spentPerRound: M.errs.map(e => Math.round(Math.max(0, e - G.HIDDEN.free))) }; });
      await frame(page, browser, '60.12-hidden-streak-round', 'Hidden Streak round screen — the same 60.18 allowance layout: the ms over the allowance draining, the 700ms budget bar with this round lit, the caption');
      say('allowance', met); say('budget', bud); shot = true;
    }
    await sleep(1600); await ptr(page, 'pointerdown', '#gen'); await ptr(page, 'pointerup', '#gen'); await sleep(700);
  }
  await abortRun(page); await sleep(300);
});

/* =======================================================================================================
   60.13 — an angled-wall ball starts off screen and rolls in
   Two frames per wall: the first frame the round is drawn (where build 59 shows half a ball parked on the edge) and the
   same round a second later, rolling. The straight wall is beside it as the reference, because it is the behaviour the
   item asks the angled one to match.
   ======================================================================================================= */
scene('60.13', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  for (const [which, force] of [['angled', 1], ['straight', 0]]) {
    // a fresh run each time: a round dealt into a #gen that is no longer laid out measures nothing
    await goRun(page, { game: 'timing', diff: 'hidden', secs: -1 });
    await page.evaluate(async () => { window.__tm = (await import('./games/timing/index.js')).default; });
    await waitFor(page, () => window.__tm && (window.__tm.st === 'run' || window.__tm.st === 'arm'), 20000);
    await page.evaluate(async f => { const G = await import('./config/games.js');
      G.HIDDEN.diag = f; G.HIDDEN.plain = 0; G.HIDDEN.diagFrom = 1;
      const M = window.__tm; M.clearT(); M.round = 16; M.st = 'arm'; M.hidden(); }, force);
    await sleep(60);
    // measured BEFORE the frame: frame() hands the tab to the lens page and a backgrounded page reports a zero box
    const ball = await page.evaluate(() => { const M = window.__tm, b = M.ball, p0 = b.pos(0);
      const f = document.getElementById('gen').getBoundingClientRect(); const el = document.getElementById('tmball');
      const r = el ? el.getBoundingClientRect() : null;
      return { wall: b.diag === undefined ? 'straight' : b.diag + '°', size: Math.round(b.size),
        at0: { x: Math.round(p0.x), y: Math.round(p0.y) },
        field: { w: Math.round(f.width), h: Math.round(f.height) },
        onScreenPixels: r ? Math.round(Math.max(0, Math.min(r.right, f.right) - Math.max(r.left, f.left)) * Math.max(0, Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top))) : null }; });
    await frame(page, browser, `60.13-${which}-t0`, `Hidden Streak, ${which} wall — the first frame the round is drawn`);
    say('ball', ball);
    await sleep(1500);
    await frame(page, browser, `60.13-${which}-rolling`, `the same round 1.5s later — the ball has rolled in`);
    await abortRun(page); await sleep(400);
  }
  await page.evaluate(async () => { const G = await import('./config/games.js'); G.HIDDEN.diag = 0.5; G.HIDDEN.plain = 3; G.HIDDEN.diagFrom = 6; });
  await abortRun(page); await sleep(300);
});

/* 60.14 — the Stopwatch Streak's running counter, on the screen it is printed on */
scene('60.14', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await goRun(page, { game: 'timing', diff: 'stopwatch', secs: -1 });
  await page.evaluate(async () => { window.__tm = (await import('./games/timing/index.js')).default; });
  await waitFor(page, () => window.__tm && window.__tm.st === 'run' && window.__tm.t0, 20000);
  // a real attempt, stopped a known distance past the target so the total is a hundredths figure
  await page.evaluate(async () => { const M = window.__tm; const G = await import('./config/games.js');
    const at = M.t0 + (M.target + 0.16) * 1000; const wait = ms => new Promise(r => setTimeout(r, ms));
    while (performance.now() < at - 4) await wait(2);
    M.onDown({ type: 'down', t: at }); });
  await sleep(2200);
  const line = await page.evaluate(() => ({ score: document.getElementById('score').textContent.trim(),
    hud: document.getElementById('hud-time').textContent.trim() }));
  await frame(page, browser, '60.14-stopwatch-streak-counter', 'Stopwatch Streak, after one attempt — the running counter to two decimals');
  say('counter', line);
});

/* 60.17 — Spot · Count shows the target shape big and centred first */
scene('60.17', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await goRun(page, { game: 'spot', diff: 'count', secs: 10 });
  await waitFor(page, () => !!document.getElementById('cshow'), 20000);
  await sleep(500);
  const big = await page.evaluate(() => { const c = document.getElementById('cshow'), sh = c && c.querySelector('.cshape');
    const w = c && c.querySelector('.cword'); const g = document.getElementById('gen').getBoundingClientRect();
    const r = sh && sh.getBoundingClientRect();
    return { shape: r && { w: Math.round(r.width), h: Math.round(r.height) }, field: { w: Math.round(g.width), h: Math.round(g.height) },
      centred: r ? Math.abs((r.left + r.width / 2) - (g.left + g.width / 2)) < 3 : null,
      words: w && w.textContent.trim(), crowd: document.querySelectorAll('#gen .fs').length }; });
  await frame(page, browser, '60.17-count-shape-big', 'Spot · Count — the target shape alone, big and centred, with the instruction under it, before any of the crowd');
  say('opening', big);
  /* and after the slide: the card has gone and the crowd is up. A SECOND RUN, because taking a frame hands the tab to the lens
     page and a hidden page ends the run it was playing (v29 item 4) — until 60.27, which pauses and resumes instead. */
  await abortRun(page); await sleep(400);
  await goRun(page, { game: 'spot', diff: 'count', secs: 10 });
  await waitFor(page, () => document.querySelectorAll('#gen .fs').length > 3, 20000);
  const after = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).default;
    const bar = document.querySelector('#rxbar i.shp'); const b = bar && bar.getBoundingClientRect();
    return { crowd: document.querySelectorAll('#gen .fs').length, card: !!document.getElementById('cshow'),
      barShape: b && { w: Math.round(b.width), h: Math.round(b.height) }, target: SP.target, flashMs: SP.flash }; });
  await frame(page, browser, '60.17-count-crowd', 'the crowd, once the shape has shrunk into the instruction line — its screen time starts here');
  say('after', after);
  await abortRun(page); await sleep(300);
});

/* 60.18 — the Flash Streak round screen on the shared allowance layout, and the header that had lost its budget */
scene('60.18', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await goRun(page, { game: 'reaction', diff: 'flash', secs: -1 });
  await page.evaluate(async () => { window.__rx = (await import('./games/reaction/index.js')).default; });
  // one real attempt: wait for the flash, then tap a known time after it
  await waitFor(page, () => window.__rx && window.__rx.st === 'go' && window.__rx.armed, 25000);
  await page.evaluate(() => { const M = window.__rx; M.onDown({ type: 'down', t: M.t0 + 420 }); });
  await sleep(1100);   // past CFG.hold, into the drain
  const met = await allowMetrics(page, 'rxallow');
  const hud = await page.evaluate(() => ({ header: document.getElementById('hud-time').textContent.trim(),
    verdict: (document.querySelector('.rxmsg') || {}).textContent, score: document.getElementById('score').textContent.trim() }));
  await frame(page, browser, '60.18-flash-streak-round', 'Flash Streak round screen — verdict, big time, the amount over the allowance draining, the budget bar, the caption. And the header carries its budget again');
  say('allowance', met); say('hud', hud);
});

/* =======================================================================================================
   60.19 — the in-game header, at 375, 390 and 430 wide
   The three collisions Aiden's screenshots show: the UNLOCK pill over the GOAL pill, "Stopwatch · Streak" wrapping to three
   lines under the score, and "BEST 831MS" touching the big number. The measurement is the only one that means anything —
   the four rows' boxes, and whether any of them overlaps any other.
   ======================================================================================================= */
const headerMetrics = page => page.evaluate(() => {
  const box = s => { const e = document.querySelector(s); if (!e) return null;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      lines: Math.round(r.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2)),
      text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) }; };
  const rows = { goal: box('#goal'), mode: box('#hud-mode'), count: box('#hud-time'), score: box('#score'), best: box('#pbghost') };
  const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const names = Object.keys(rows), clashes = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    // the mode and the count share a row on purpose; everything else must be clear of everything else
    if (names[i] === 'mode' && names[j] === 'count') continue;
    if (hit(rows[names[i]], rows[names[j]])) clashes.push(names[i] + '/' + names[j]); }
  const w = document.documentElement.clientWidth;
  return { rows, clashes, viewport: w,
    scoreCentred: rows.score ? Math.round(Math.abs((rows.score.x + rows.score.w / 2) - w / 2)) : null,
    order: names.filter(n => rows[n]).sort((a, b) => rows[a].y - rows[b].y).join(' → ') }; });

scene('60.19', async (page, browser) => {
  for (const [g, d, secs, label] of [['timing', 'stopwatch', -1, 'stopwatch-streak'], ['hold', 'grow', -1, 'grow-streak'], ['reaction', 'flash', 5, 'flash-set']]) {
    for (const w of [375, 390, 430]) {
      await page.setViewport({ width: w, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
      await goRun(page, { game: g, diff: d, secs });
      await waitFor(page, () => document.getElementById('game').classList.contains('live'), 20000);
      await sleep(900);
      const m = await headerMetrics(page);
      if (w === 390) await frame(page, browser, `60.19-${label}-390`, `${g} · ${d} header at 390 wide — badge, mode / count row, score, best`);
      say(label + '@' + w, m);
      await abortRun(page); await sleep(300);
    }
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

/* 60.20 — a goal badge that does not fit scans, and freezes while the round is live */
scene('60.20', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await page.evaluate(async () => { const P = await import('./progress.js');
    P.setPendingAim('reach round 24 in Reaction · Flash · Streak without a single early tap'); });
  await goRun(page, { game: 'reaction', diff: 'flash', secs: -1 });
  await sleep(160);
  const during = await page.evaluate(() => { const gl = document.getElementById('goal'), e = gl.children[0];
    const cs = e && getComputedStyle(e);
    return { text: e && e.textContent.trim(), over: e && Math.round(e.scrollWidth - e.clientWidth),
      anim: cs && cs.animationName, dur: cs && cs.animationDuration, live: document.getElementById('game').classList.contains('live') }; });
  await frame(page, browser, '60.20-goal-countdown', 'the goal badge during the 3-2-1 — the line is wider than the pill and is walking');
  say('countdown', during);
  /* a SECOND run for the live frame: taking a frame hands the tab to the lens page, and a hidden page ends the run it was
     playing (v29 item 4) — the same thing 60.17's scene works around, until 60.27 pauses and resumes instead. */
  await abortRun(page); await sleep(400);
  await page.evaluate(async () => { const P = await import('./progress.js');
    P.setPendingAim('reach round 24 in Reaction · Flash · Streak without a single early tap'); });
  await goRun(page, { game: 'reaction', diff: 'flash', secs: -1 });
  // measured INSIDE the wait, because the live class comes and goes with the round and a sleep between the two can miss it
  const live = await page.evaluate(async () => { const g = document.getElementById('game');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 400; i++) { if (g.classList.contains('live') && !g.classList.contains('tapon')) break; await wait(25); }
    const e = document.getElementById('goal').children[0]; const cs = e && getComputedStyle(e);
    return { anim: cs && cs.animationName, translate: cs && cs.translate,
      live: g.classList.contains('live'), tapon: g.classList.contains('tapon') }; });
  await frame(page, browser, '60.20-goal-live', 'the same badge the moment the round goes live — frozen at its start');
  say('live', live);
  await abortRun(page); await sleep(300);
});

/* 60.21 — the Grow result: the shape and the TARGET / YOURS panel never overlap */
const growOverlap = page => page.evaluate(() => {
  const f = document.getElementById('hfield'), c = document.getElementById('hcalc');
  if (!f || !c || !c.classList.contains('on')) return null;
  // the drawn shapes' own boxes, off the SVG geometry rather than off the field
  const paths = [...document.querySelectorAll('#hg path,#ht path,#hm path')].filter(p => p.getAttribute('d'));
  const boxes = paths.map(p => { const r = p.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).filter(b => b.w > 1);
  const cr = c.getBoundingClientRect(), panel = { x: cr.x, y: cr.y, w: cr.width, h: cr.height };
  const rows = [...c.querySelectorAll('.hrow,#hn0,#hn1,#hb0,#hb1,b')].map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).filter(b => b.w > 1);
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const over = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return { shapes: boxes.length, panel: { y: Math.round(panel.y - f.getBoundingClientRect().y), h: Math.round(panel.h) },
    lowestShape: boxes.length ? Math.round(Math.max(...boxes.map(b => b.y + b.h)) - f.getBoundingClientRect().y) : null,
    gap: boxes.length ? Math.round(panel.y - Math.max(...boxes.map(b => b.y + b.h))) : null,
    panelHits: boxes.filter(b => hit(b, panel)).length,
    rowHits: rows.filter(r => boxes.some(b => hit(b, r))).length,
    overlapPx: Math.round(boxes.reduce((a, b) => a + over(b, panel), 0)) }; });

scene('60.21', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  const holdFor = over => page.evaluate(async e => { const HD = (await import('./games/estimate/index.js')).default;
    const { CFG } = await import('./config/games.js'); const { vmin } = await import('./core.js');
    return HD.target / (CFG.holdRate * vmin()) * 1000 * Math.sqrt(1 + e / 100); }, over);
  let shot = false;
  await goRun(page, { game: 'hold', diff: 'grow', secs: 7 });
  for (let round = 1; round <= 5 && !shot; round++) {
    await waitFor(page, () => document.getElementById('hbg') && document.getElementById('hbg').classList.contains('on'), 20000);
    // a big overshoot, which is the round that used to draw straight through the panel
    const ms = await holdFor(60);
    await ptr(page, 'pointerdown', '#hfield'); await sleep(Math.round(ms)); await ptr(page, 'pointerup', '#hfield');
    const up = await waitFor(page, () => { const c = document.getElementById('hcalc'); return c && c.classList.contains('on') && document.querySelector('#hm path') && document.querySelector('#hm path').getAttribute('d'); }, 14000);
    if (up) { await sleep(2400);
      const m = await growOverlap(page);
      await frame(page, browser, '60.21-grow-result', 'Grow result — the grown shape above, the TARGET / YOURS panel below, nothing overlapping');
      say('layout', m); shot = true; }
    await sleep(900); await ptr(page, 'pointerdown', '#hfield'); await ptr(page, 'pointerup', '#hfield'); await sleep(600);
  }
  await abortRun(page); await sleep(300);
});

/* 60.23 — the player picker, the same component on the pick sheet and the result screen */
scene('60.23', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  const read = host => page.evaluate(h => { const el = document.querySelector(h); if (!el) return null;
    const rows = [...el.querySelectorAll('.prow')];
    const pick = r => [...r.querySelectorAll('.pchip')].map(x => { const rc = x.getBoundingClientRect();
      return { text: x.textContent.trim(), w: Math.round(rc.width), y: Math.round(rc.y), sel: x.classList.contains('sel'), colour: getComputedStyle(x).color }; });
    return { rows: rows.length, top: rows[0] ? pick(rows[0]) : [], sub: rows[1] ? { hidden: rows[1].hidden, chips: pick(rows[1]) } : null }; }, host);
  // the pick sheet
  await page.evaluate(async () => { const R = await import('./ui/router.js'), ST = await import('./core/state.js');
    Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0 }); R.show('s-pick'); });
  await sleep(700);
  await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(500);
  await page.evaluate(() => document.querySelector('#vs-wrap [data-p="f"]').click()); await sleep(500);
  const sheet = await read('#vs-wrap');
  await frame(page, browser, '60.23-sheet-picker', 'the pick sheet — Solo | With a friend equal widths, the Pass & play | Versus row slid in, the selected chip orange');
  say('sheet', sheet);
  // the result screen, after a real run
  await page.evaluate(() => document.querySelector('#vs-wrap [data-p="0"]').click()); await sleep(300);
  await goRun(page, { game: 'quick-tap', diff: 'two', secs: 5 });
  await waitFor(page, () => (document.querySelector('.screen.on') || {}).id === 's-over', 30000);
  await sleep(700);
  await page.evaluate(() => { const f = document.querySelector('#over-vs [data-p="f"]'); if (f) f.click(); }); await sleep(500);
  const result = await read('#over-vs');
  await frame(page, browser, '60.23-result-picker', 'the result screen — the same component, the same widths, the same orange');
  say('result', result);
});

/* =======================================================================================================
   60.27 — leaving the app pauses the run; coming back counts it in and replays the attempt
   THE MEASUREMENT IS ONE EVALUATE, not a sequence of frames. Taking a frame hands the tab to the lens page, which HIDES the app
   page — and hiding the app page is the very thing under test, so a screenshot between two readings would itself pause and
   resume the run. (That it does is its own small proof that this works.) So the clock is read across a real hide from inside
   the page, and the frames are taken afterwards, of a run deliberately left mid-countdown.
   ======================================================================================================= */
scene('60.27', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  const m = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
    const SS = await import('./core/store.js');
    SS.store.intro['timing'] = SS.store.intro['timing:stopwatch'] = Date.now(); SS.save();
    const TM = (await import('./games/timing/index.js')).default;
    const w = ms => new Promise(r => setTimeout(r, ms));
    const read = () => ({ st: TM.st, raf: TM.raf, round: TM.round,
      paused: document.getElementById('game').classList.contains('paused'),
      clock: (document.getElementById('tmclock') || {}).textContent, live: RUN.R.on });
    Object.assign(ST.sel, { vs: 0, practice: 0, game: 'timing', diff: 'stopwatch', secs: -1 }); RUN.start();
    for (let i = 0; i < 300 && TM.st !== 'run'; i++) await w(40);
    await w(800);
    const out = { playing: read() };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await w(250); out.away = read();
    await w(2000); out.awayLater = read();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await w(300); out.counting = { n: document.getElementById('count').textContent.trim(), on: document.getElementById('count').classList.contains('on') };
    await w(1500); out.back = read();
    RUN.abort(); return out; });
  say('acrossThePause', m);
  /* NO FRAME OF THE PAUSE ITSELF. A frozen screen and a running one are the same picture, and taking the screenshot is what
     un-freezes it — the lens page has to come forward, which makes the app page visible again. The honest evidence for a pause is
     the measurement above (the engine's frame id at 0 and a clock that has not moved across two seconds away) and the gate's own
     check, which drives a real hide. What 60.27 has to SHOW is the offer a killed app comes back to, and that is the next scene. */
  await abortRun(page); await sleep(300);
});

/* 60.27 — and the offer a killed app comes back to */
scene('60.27-resume', async (page, browser) => {
  await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture({ allOpen: 1 }));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(450);
  await page.evaluate(async () => { const SS = await import('./core/store.js'), R = await import('./ui/router.js');
    SS.store.resume = { g: 'spot', d: 'find', s: -1, round: 14, hits: 6.4, t: Date.now(), gaunt: 0 }; SS.save();
    R.show('s-menu'); });
  await sleep(800);
  const row = await page.evaluate(() => { const e = document.getElementById('resumerow');
    const r = e.getBoundingClientRect();
    return { hidden: e.hidden, text: (e.textContent || '').replace(/\s+/g, ' ').trim(), w: Math.round(r.width), y: Math.round(r.y) }; });
  await frame(page, browser, '60.27-c-resume-offer', 'the menu after the phone killed the app mid-Streak — "Resume your streak"');
  say('offer', row);
  await page.evaluate(async () => { const SS = await import('./core/store.js'); delete SS.store.resume; SS.save(); });
});

/* =======================================================================================================
   60.29 — a key theme's background runs edge to edge, on every key screen and at every width
   Aiden: Lantern shows black bars about 50px wide left and right and ends before the bottom. The measurement is the item's own
   test — the four edges of the SCREENSHOT, at 375, 390 and 430 wide with real safe-area insets, on all three keys.
   ======================================================================================================= */
const edgeDark = (im, side, floor = 26) => { // how many pixels deep the dark border runs in from one edge, at the middle
  const mid = side === 'top' || side === 'bottom' ? Math.floor(im.w / 2) : Math.floor(im.h / 2);
  let n = 0;
  for (let i = 0; i < (side === 'left' || side === 'right' ? im.w : im.h); i++) {
    const x = side === 'left' ? i : side === 'right' ? im.w - 1 - i : mid;
    const y = side === 'top' ? i : side === 'bottom' ? im.h - 1 - i : mid;
    const px4 = ((y * im.w + x) * 4), p = [im.data[px4], im.data[px4 + 1], im.data[px4 + 2]];
    if (Math.max(...p) > floor) break; n++; }
  return n; };

scene('60.29', async (page, browser) => {
  for (const W of [375, 390, 430]) {
    await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const [tier, ix, label] of [['clear', 0, 'lantern'], ['pro', 1, 'circuit'], ['author', 2, 'thorns']]) {
      await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
      await page.evaluate(async c => { const K = await import('./progress/key.js'), P = await import('./progress.js');
        K.devReach(c, P.devModesAll); }, tier === 'clear' ? 'key' : tier === 'pro' ? 'pro' : 'thorns');
      await page.evaluate(async i => { const R = await import('./ui/router.js'); R.show('s-key', { tier: i, from: 's-testing' }); }, ix);
      await sleep(1600);
      const im = await frame(page, browser, `60.29-${label}-${W}`, `the ${label} key screen at ${W} wide, with a 47px top and 34px bottom safe-area inset`);
      const edges = { left: edgeDark(im, 'left'), right: edgeDark(im, 'right'), top: edgeDark(im, 'top'), bottom: edgeDark(im, 'bottom') };
      say('edges', { device: 'px at dpr 2', ...edges,
        worst: Math.max(...Object.values(edges)) });
      say('wheel', await page.evaluate(() => { const r = document.getElementById('key-ring'), k = document.getElementById('key-keys');
        if (!r || !k) return null; const a = r.getBoundingClientRect(), b = k.getBoundingClientRect();
        return { cardsBottom: Math.round(b.bottom), ringTop: Math.round(a.top), gap: Math.round(a.top - b.bottom) }; }));
    }
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

/* 60.30 — the Pro key's wield line: what to do, the Gauntlet's own icon, and green once it is met */
scene('60.30', async (page, browser) => {
  for (const [label, gaunt] of [['todo', []], ['done', [{ id: 'g1', t: Date.now(), score: 90, tier: 'clear', web: [] }]]]) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await page.evaluate(async g => { const K = await import('./progress/key.js'), P = await import('./progress.js'), S = await import('./core/store.js');
      K.devReach('pro', P.devModesAll); S.store.gaunt = g; S.save();
      const R = await import('./ui/router.js'); R.show('s-key', { tier: 1, from: 's-testing' }); }, gaunt);
    await sleep(1500);
    const line = await page.evaluate(() => { const w = document.getElementById('key-wield'); const r = w.getBoundingClientRect();
      return { hidden: w.hidden, done: w.classList.contains('done'), colour: getComputedStyle(w).color,
        icon: w.querySelectorAll('.kwsym').length, text: (w.textContent || '').replace(/\s+/g, ' ').trim(),
        w: Math.round(r.width), y: Math.round(r.y) }; });
    await frame(page, browser, `60.30-pro-wield-${label}`, `the Pro key's wield line, Gauntlet Mini ${label === 'done' ? 'finished' : 'still to do'}`);
    say(label, line);
  }
  // and the Author key at the same moment, which must say nothing at all (R1)
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key', { tier: 2, from: 's-testing' }); });
  await sleep(1200);
  say('authorKey', await page.evaluate(() => { const w = document.getElementById('key-wield');
    return { hidden: w.hidden, text: (w.textContent || '').trim() }; }));
});

/* 60.31 — the NEXT UP block on every chest's congratulations card, in its next key's colour */
scene('60.31', async (page, browser) => {
  /* each pair is [the chest whose card is shown, the chest that is then NEXT]. The chests before it are opened first, or every
     card would name the Games chest and the colour under test would never change. */
  for (const [chest, next] of [['games', 'key'], ['key', 'pro'], ['pro', 'thorns']]) {
    await page.evaluate(f => localStorage.setItem('ne', JSON.stringify(f)), fixture());
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
    await page.evaluate(async n2 => { const K = await import('./progress/key.js'), P = await import('./progress.js');
      K.devReach(n2, P.devModesAll); }, next);
    await toCard(page, chest);
    const m = await page.evaluate(() => { const n = document.querySelector('.rnextup');
      if (!n) return { block: false, line: (document.querySelector('.rnext') || {}).textContent };
      const em = n.querySelector('em'), b = n.querySelector('b'), sym = n.querySelector('.rnsym');
      const go = document.querySelector('.rgo'), msg = document.querySelector('.rmsg');
      const r = n.getBoundingClientRect();
      return { block: true, label: em.textContent.trim(), line: b.textContent.trim(),
        labelColour: getComputedStyle(em).color, lineColour: getComputedStyle(b).color,
        labelPx: Math.round(parseFloat(getComputedStyle(em).fontSize)), linePx: Math.round(parseFloat(getComputedStyle(b).fontSize)),
        icon: !!sym, belowMessage: msg ? Math.round(r.top - msg.getBoundingClientRect().bottom) : null,
        aboveContinue: go ? Math.round(go.getBoundingClientRect().top - r.bottom) : null }; });
    await frame(page, browser, `60.31-${chest}-card`, `the ${chest} chest's congratulations card — NEXT UP (${next}) in that key's own colour, above Continue`);
    say(chest + ' → ' + next, m);
  }
});

/* 60.33 - the Welcome ceremony. The first thing the game ever gives a player was one green toast among the others; this is the
   moment that replaced it, caught twice: mid power-on, and settled on its card. The safe-area gap under the last button is
   measured rather than asserted, because the card is the lowest thing on the screen. */
scene('60.33', async (page, browser) => {
  const f = fixture();
  // the run that opens the slot: Quick Tap at the Sprint length, solo (config/messages.js MESSAGES[0].by.run)
  f.runs = [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 14, misses: 0, v: 4 }];
  await page.evaluate(x => localStorage.setItem('ne', JSON.stringify(x)), f);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(420);
  await page.evaluate(async () => { const W = await import('./ui/welcome.js'); W.welcomeCheck(false); });
  await sleep(320);
  await frame(page, browser, '60.33-intro', 'the ceremony mid power-on - the picture flickering into being on PLAYER.on, the shared television intro');
  say('steps', await page.evaluate(async () => { const M = await import('./config/messages.js');
    const h = document.getElementById('welcome');
    return M.PLAYER.on.steps.map(x => x.name + ' @' + h.style.getPropertyValue('--w-' + x.name + '-at').trim()); }));
  await sleep(1000);
  await frame(page, browser, '60.33-card', 'the card it settles into - A message from Aiden, the clip title, Play and Later');
  say('card', await page.evaluate(() => { const h = document.getElementById('welcome');
    const card = h.querySelector('.wcard'), stage = h.querySelector('.wframe');
    const btns = [...h.querySelectorAll('.wrow .item')], last = btns[btns.length - 1];
    const r = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { label: card.querySelector('em').textContent.trim(), title: card.querySelector('b').textContent.trim(),
      buttons: btns.map(x => x.textContent.trim() + ' ' + Math.round(x.getBoundingClientRect().width) + 'x' + Math.round(x.getBoundingClientRect().height)),
      picture: Math.round(sr.width) + 'x' + Math.round(sr.height), card: Math.round(r.width) + 'x' + Math.round(r.height),
      underLastButton: Math.round(innerHeight - last.getBoundingClientRect().bottom) + 'px' }; }));
});

/* =======================================================================================================
   BUILD 62 — one 390-wide frame per visual item, top and bottom safe-area insets on (47 / 34)
   ======================================================================================================= */
const INTRO_ALL = (() => { const o = {}; for (const g of ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot']) o[g] = 1;
  for (const k of ['quick-tap:two', 'quick-tap:four', 'dots:blind', 'dots:lead', 'hold:grow', 'hold:cut', 'sequence:solo',
    'timing:stopwatch', 'timing:hidden', 'reaction:flash', 'reaction:nogo', 'spot:count', 'spot:find']) o[k] = 1; return o; })();
const OPEN = { allOpen: 1 };
// a played-in, everything-open profile, then a run of game `g` started from its sheet (mode index `mi`, length index `li`)
async function load(page, prefs = OPEN, extra = {}) {
  const f = Object.assign(fixture(prefs), { intro: INTRO_ALL }, extra);
  await page.evaluate(x => localStorage.setItem('ne', JSON.stringify(x)), f);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(420); }
async function runOf(page, g, mi = 0, li = 0) {
  await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); }); await sleep(500);
  await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(400);
  await page.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); (c[mi] || c[0]).click(); }, mi); await sleep(450);
  await page.evaluate(li => { const t = document.querySelectorAll('#time-row .tbtn'); (t[li] || t[0]).click(); }, li); await sleep(200);
  await page.evaluate(() => document.getElementById('go-btn').click());
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100); }
const show = (page, id, opts) => page.evaluate(async (id, o) => { const R = await import('./ui/router.js'); R.show(id, o); }, id, opts);

scene('61.1', async (page, browser) => {
  await load(page); await runOf(page, 'quick-tap'); await sleep(600);
  await page.evaluate(() => document.getElementById('quit').click()); await sleep(3400);
  await frame(page, browser, '61.1-abandoned', 'Exit mid-run: the result screen marked abandoned, Retry straight under the line');
});

scene('61.2', async (page, browser) => {
  await load(page); await runOf(page, 'quick-tap'); await sleep(600);
  // the hold, frozen three-quarters of the way round: the line has drawn most of the pill
  await page.evaluate(() => document.getElementById('restart').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(360);
  await page.evaluate(() => { for (const a of document.getAnimations()) try { a.pause(); } catch (e) {} });
  await frame(page, browser, '61.2-restart-hold', 'Restart, top right opposite Exit, held about three quarters of the way: the line drawing round the word');
  await page.evaluate(() => document.getElementById('restart').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
});

scene('61.3', async (page, browser) => {
  await load(page, { tut: 0 }); await show(page, 's-pick'); await sleep(1500);
  for (let i = 0; i < 80 && !(await page.evaluate(() => { const t = document.getElementById('tut'); return !!t && !t.hidden; })); i++) await sleep(100);
  await page.evaluate(() => document.querySelector('#tut .tnext').click()); await sleep(400);
  await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(900);
  await frame(page, browser, '61.3-walkthrough-modes', 'First-run walkthrough, step 3 of 5: the modes ringed in yellow, one short box, Skip and Next');
  say('box', await page.evaluate(() => document.querySelector('#tut p').textContent));
});

// 61.6: Achievements → back → Keys → Author tab → a REAL tap (by coordinates) on the Pro tile. What is under the finger, and where it goes
scene('61.6', async (page, browser) => {
  await load(page); await show(page, 's-menu'); await sleep(400);
  const tapAt = async sel => { const b = await page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel); await page.touchscreen.tap(b[0], b[1]); await sleep(700); return b; };
  const under = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const a = e && e.closest('[data-act]'); return { el: e ? e.tagName + '.' + (e.className.baseVal ?? e.className) : null, act: a ? a.dataset.act : null, screen: document.querySelector('.screen.on')?.id }; }, sel);
  // the old CSS, put back on the element for one look: a faded tappable toast that still takes pointer events. Is it over the Pro tile?
  const old = await page.evaluate(async () => { const T = await import('./ui/toast.js'); T.toast('Achievement: Grand tour · unlocks target colour · tap to see it in Customise', 'x1'); await new Promise(r => setTimeout(r, 6000));
    const t = document.getElementById('toast'); t.style.pointerEvents = 'auto'; t.dataset.ach = 'x1'; const R = await import('./ui/router.js'); R.show('s-key'); await new Promise(r => setTimeout(r, 600));
    const out = [...document.querySelectorAll('#s-key .kkey')].map(b => { const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && e.closest('[data-act]')?.dataset.act; });
    const tr = t.getBoundingClientRect(), kr = document.querySelector('#s-key .kkey[data-kt="1"]').getBoundingClientRect();
    out.push('toast y ' + Math.round(tr.top) + '–' + Math.round(tr.bottom) + ' x ' + Math.round(tr.left) + '–' + Math.round(tr.right) + ' · pro tile y ' + Math.round(kr.top) + '–' + Math.round(kr.bottom));
    t.style.pointerEvents = ''; t.dataset.ach = ''; R.show('s-menu'); return out; });
  say('withOldCss', old); await sleep(400);
  await tapAt('#s-menu [data-go="s-prog"]'); await tapAt('#s-prog [data-tab="ach"]'); await sleep(300);
  await tapAt('#s-prog .back'); await tapAt('#s-menu [data-go="s-key"]');
  await tapAt('#s-key .kkey[data-kt="2"]');
  say('underPro', await under('#s-key .kkey[data-kt="1"]'));
  await tapAt('#s-key .kkey[data-kt="1"]');
  say('after', await page.evaluate(() => ({ screen: document.querySelector('.screen.on')?.id, sel: document.querySelector('#s-key .kkey.sel')?.dataset.kt })));
  await frame(page, browser, '61.6-keys-pro-tab', 'Keys: Achievements, back, Keys, Author tab, then a real tap on the Pro tile');
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

scene('61.7', async (page, browser) => {
  await load(page, { ...OPEN, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }); await show(page, 's-key', { tier: 2 }); await sleep(2600);
  await frame(page, browser, '61.7-author-key-thorns', 'Author key screen, Thorn layer: the vines cleared from behind every row, status label and hint line');
});

const CHESTS_OPEN = { ...OPEN, chests: { games: 1, key: 1, pro: 1, thorns: 1 } };
scene('61.8', async (page, browser) => {
  await load(page, CHESTS_OPEN); await show(page, 's-prog', { tab: 'c-pro' }); await sleep(700);
  say('need', await page.evaluate(() => { const n = document.getElementById('chest-need'), b = n.querySelector('button'); return { html: n.innerHTML.slice(0, 120), disp: getComputedStyle(n).display, h: n.getBoundingClientRect().height, b: b && [getComputedStyle(b).display, getComputedStyle(b).opacity, getComputedStyle(b).color, b.getBoundingClientRect().height] }; }));
  await frame(page, browser, '61.8-pro-chest-tab', 'Pro chest tab: the requirement lines are gone, one small link to the key, the count straight above the filter chips');
});

scene('61.11', async (page, browser) => {
  await load(page, CHESTS_OPEN, { runs: [{ t: Date.now() - 9000, g: 'quick-tap', d: 'two', s: 5, hits: 11, misses: 0, v: 4 }] });
  await show(page, 's-prog', { tab: 'c-pro' }); await sleep(600);
  await page.evaluate(() => document.querySelector('#chest-list .a').click()); await sleep(400);
  await frame(page, browser, '61.11-play-this', 'A Pro chest row tapped: "Play Quick Tap · Two · Sprint?", target and best, one Play; the list waits underneath');
});

scene('61.12', async (page, browser) => {
  await load(page, CHESTS_OPEN, { runs: [{ t: Date.now() - 9000, g: 'quick-tap', d: 'two', s: 5, hits: 11, misses: 0, v: 4 }] });
  await show(page, 's-prog', { tab: 'c-pro' }); await sleep(600);
  await page.evaluate(() => { document.getElementById('chest-list').scrollTop = 0; });
  await frame(page, browser, '61.12-nameless-rows', 'Pro chest: score-target rows read "Two · Sprint — 13 hits or more", no name, no second line');
});

scene('61.13', async (page, browser) => {
  await load(page, CHESTS_OPEN); await show(page, 's-prog', { tab: 'ach' }); await sleep(600);
  await frame(page, browser, '61.13-achievements-flat', 'Achievements: one flat list, no Pro or Secret sections, "N of 18 unlocked", filter chips kept');
  say('count', await page.evaluate(() => document.getElementById('ach-hint').textContent));
});

scene('61.14', async (page, browser) => {
  await load(page, CHESTS_OPEN); await show(page, 's-prog', { tab: 'ach' }); await sleep(600);
  await page.evaluate(() => { const l = document.getElementById('achlist'); l.scrollTop = l.scrollHeight; }); await sleep(300);
  await frame(page, browser, '61.14-no-secrets', 'Achievements, the old Secret rows: every one named and saying what earns it, no ???, no SECRET label');
});

scene('61.15', async (page, browser) => {
  await load(page, { ...CHESTS_OPEN, bg: 'lantern' }); await show(page, 's-prog', { tab: 'ach' }); await sleep(900);
  await frame(page, browser, '61.15-gold-names', 'Achievements on the Lantern background: every name in one gold');
});

scene('61.16', async (page, browser) => {
  await load(page, CHESTS_OPEN); await show(page, 's-prog', { tab: 'cul' }); await sleep(700);
  await page.evaluate(() => document.getElementById('cul-qt_clean30')?.scrollIntoView({ block: 'center' })); await sleep(300);
  await frame(page, browser, '61.16-customise-rows', 'Customise unlocks: [swatch] Clean / No misses, at least 50 hits / → Quick Tap · Four · Marathon — the mode said once');
});

scene('61.20', async (page, browser) => {
  await load(page, { ...CHESTS_OPEN, bg: 'lantern' }); await runOf(page, 'quick-tap'); await sleep(1500);
  await frame(page, browser, '61.20-lantern-mid-run', 'Quick Tap mid-run on the Lantern background: the art stays, under a 50% dark overlay; pads, dot and numbers the brightest things');
  say('bg', await page.evaluate(async () => (await import('./core/store.js')).look('bg')));
});

scene('61.21', async (page, browser) => {
  await load(page, {}, { runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: 14, misses: 0, v: 4 }] });
  await page.evaluate(async () => { const W = await import('./ui/welcome.js'); W.welcomeCheck(false); }); await sleep(1600);
  await frame(page, browser, '61.21-welcome-card', 'The Welcome card: the picture is a chest reward video waiting to play (frame, glow, play mark); the whole card plays it, LATER skips');
});

// 61.22 is about the bottom inset, so it gets the three widths: Customise ("Settings") on Lantern, scrolled to the very bottom
scene('61.22', async (page, browser) => {
  for (const W of [375, 390, 430]) {
    await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await load(page, { ...CHESTS_OPEN, bg: 'lantern' }); await show(page, 's-custom'); await sleep(700);
    await page.evaluate(() => { for (const s of document.querySelectorAll('.screen.on, .screen.on .scroll')) s.scrollTop = s.scrollHeight; }); await sleep(900);
    await frame(page, browser, '61.22-settings-lantern-' + W, `Customise on Lantern at ${W} wide, scrolled to the bottom, 47 / 34 insets: the lanterns run under the home indicator and sit behind every row`);
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
});

// 61.23: the Pro chest's congratulations card, opened from Testing, tapped through to its card. Measured: does the card scroll?
async function proCard(page) {
  await load(page, { ...OPEN, chests: { games: 1, key: 1 } }); await show(page, 's-testing'); await sleep(400);
  await page.evaluate(() => document.querySelector('[data-act="dev-chest"][data-chest="pro"]').click());
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const h = document.querySelector('.cere'); if (!h) return 'none'; if (h.querySelector('.rcard .rgo:not([disabled])')) return 'card';
      if (h.classList.contains('tap') || /tap/.test(h.dataset.step || '')) h.click(); return h.dataset.step || 'x'; }); if (st === 'card') break; await sleep(250); }
  await sleep(4000);
  return page.evaluate(() => { const c = document.querySelector('.rcard'); if (!c) return null; const fr = c.querySelector('.mpframe');
    return { scroll: c.scrollHeight - c.clientHeight, card: Math.round(c.getBoundingClientRect().height), pic: fr ? Math.round(fr.getBoundingClientRect().height) : 0, bottom: Math.round(innerHeight - c.getBoundingClientRect().bottom), oy: getComputedStyle(c).overflowY }; }); }
scene('61.23', async (page, browser) => {
  say('card', await proCard(page));
  await frame(page, browser, '61.23-pro-congratulations', 'The Pro chest congratulations box at 390 with 47 / 34 insets: heading, line, video, caption and NEXT UP all in view, nothing scrolls inside it');
});

// 61.24: a finished Author key, its screen visited three times (twice, then after a reload). Which moments start on each visit?
scene('61.24', async (page, browser) => {
  const KB = await import('../config/key-bars.js'); const now = Date.now();
  const bars = Object.fromEntries(Object.keys(KB.KEY_BARS).flatMap(k => [[k, now], [k + '|pro', now], [k + '|author', now]]));
  const P = { ...OPEN, allOpen: 0, chests: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: {} };
  await page.evaluate((p, b) => localStorage.setItem('ne', JSON.stringify({ v: 7, prefs: Object.assign({ tut: 2, story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {} }, p), runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: b })), P, bars);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  const visit = async label => { await show(page, 's-menu'); await sleep(300);
    await page.evaluate(() => { window.__m = []; const k = document.getElementById('s-key'); const mo = new MutationObserver(() => { for (const c of ['kearning', 'kintro', 'kdue', 'karrive']) if (k.classList.contains(c) && !window.__m.includes(c)) window.__m.push(c); }); mo.observe(k, { attributes: true }); window.__mo = mo; });
    await show(page, 's-key', { tier: 2 }); await sleep(6500);
    const r = await page.evaluate(async () => { const S = await import('./core/store.js'); window.__mo.disconnect(); return { moments: window.__m, intro: S.prefs.keyIntro, revealed: S.prefs.revealed, whole: S.prefs.keyWhole }; });
    say(label, r); };
  await visit('first'); await visit('second');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500); await visit('afterReload');
  await frame(page, browser, '61.24-author-key-third-visit', 'The Author key screen on a third visit, after a reload: the celebration does not play again');
});

// 61.25: the Skill key screen with Quick Tap picked — how many requirement rows show before scrolling, and where the music button sits
const keyList = page => page.evaluate(() => { const l = document.getElementById('key-list'), m = document.getElementById('key-music'), rows = [...l.querySelectorAll('.krow')];
  const lr = l.getBoundingClientRect(), full = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= lr.top - 1 && b.bottom <= lr.bottom + 1; }).length;
  const mr = m.getBoundingClientRect(); return { rows: rows.length, full, list: Math.round(lr.height), music: m.hidden ? 'hidden' : Math.round(innerHeight - mr.bottom) + 'px above the bottom' }; });
scene('61.25', async (page, browser) => {
  const KB = await import('../config/key-bars.js'); const now = Date.now();
  await load(page, { ...OPEN, allOpen: 0, chests: { games: 1, key: 1, pro: 1, thorns: 1 }, revealed: { 'key:clear': 1 }, keyIntro: { clear: 1, pro: 1, author: 1 } }, { bars: Object.fromEntries(Object.keys(KB.KEY_BARS).map(k => [k, now])) });
  await show(page, 's-key', { tier: 0 }); await sleep(900);
  await page.evaluate(() => document.querySelector('.knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(700);
  say('layout', await keyList(page));
  await frame(page, browser, '61.25-key-list', 'Skill key, Quick Tap picked: the requirement list takes the room, SET THIS MUSIC near the bottom above the safe area');
});

scene('61.26', async (page, browser) => {
  await load(page, { ...OPEN, allOpen: 0, chests: { games: 1 } }); await show(page, 's-prog', { tab: 'c-games' }); await sleep(600);
  await page.evaluate(() => { const l = document.getElementById('chest-list'); l.scrollTop = l.scrollHeight; }); await sleep(300);
  await frame(page, browser, '61.26-games-chest-skill-key', 'Foot of the Games chest tab: the Skill key lit, "Skill key unlocked" — the grey paragraph and 30/30 are gone');
});

/* =======================================================================================================
   BUILD 64 — one 390-wide frame per visual item, the same 47 / 34 insets; the walkthrough one frame per box
   ======================================================================================================= */
scene('A1', async (page, browser) => {
  await load(page, { ...OPEN, allOpen: 0, chests: { games: 1 } }); await show(page, 's-prog', { tab: 'c-games' }); await sleep(600);
  say('line', await page.evaluate(() => document.getElementById('chest-hint').textContent));
  await frame(page, browser, 'A1-games-chest-count', 'Games chest tab: the count line is the thirteen modes, "Streak not counted"');
});

scene('A2', async (page, browser) => {
  await load(page, { ...OPEN, chests: { games: 1, key: 1, pro: 1, thorns: 1 } }); await show(page, 's-key', { tier: 2 }); await sleep(2600);
  const im = await frame(page, browser, 'A2-author-key-top-strip', 'Author key screen, Thorn layer: nothing drawn in the top 47px under the clock');
  say('litInStrip', litIn(im, { x0: 0, y0: 0, x1: im.w, y1: 47 * 2 }));
});

scene('62.5', async (page, browser) => {
  await load(page); await show(page, 's-testing'); await sleep(500);
  await frame(page, browser, '62.5-testing-replay', 'Testing: "replay tutorial" beside fresh game and open everything; Customise no longer has it');
  say('customiseHasIt', await page.evaluate(() => !!document.querySelector('#s-custom [data-act="tut-replay"]')));
});

// the walkthrough's box, waited for by its text (any box when `want` is empty)
const tutBox = async (page, want = '', n = 100) => { for (let i = 0; i < n; i++) { const t = await page.evaluate(() => { const h = document.getElementById('tut'); return h && !h.hidden ? h.querySelector('p').textContent : null; });
  if (t && (!want || t === want)) return t; await sleep(100); } return null; };
scene('62.7', async (page, browser) => {
  await load(page, { tut: 0, played: 0 }); await show(page, 's-pick'); say('box', await tutBox(page));
  say('box', await page.evaluate(() => { const b = document.querySelector('#tut .tbox').getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), centreOff: Math.round((b.top + b.bottom) / 2 - (47 + (innerHeight - 47 - 34) / 2)) }; }));
  await frame(page, browser, '62.7-box-centred', 'Walkthrough step 1: the box in the centre of the phone, clear of both safe areas, no outline round the list (62.6)');
});

/* 62.9 / 62.10 / 62.11: the whole walkthrough, one frame per box, driven by real taps at real coordinates — the twelve on the games menu, the
   first run (Exit and Restart looked for), then the eight on its result. A box that asks for a tap gets it on its target; every other box
   gets a tap in the bottom-left corner of the phone, which is on nothing in particular */
const tutState = page => page.evaluate(() => { const h = document.getElementById('tut'), r = h && h.querySelector('.tring'), b = h && h.querySelector('.tbox');
  return { text: h && !h.hidden ? h.querySelector('p').textContent : null, ring: r && getComputedStyle(r).display !== 'none' ? (() => { const q = r.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; })() : null,
    box: b ? (() => { const q = b.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; })() : null, screen: document.querySelector('.screen.on')?.id }; });
// (before 62.12 moved it, the Welcome card came up on the first result — "Later" is what a player would tap)
const nextBox = async (page, prev, n = 120) => { for (let i = 0; i < n; i++) { const s = await tutState(page); if (s.text && s.text !== prev) return s;
  await page.evaluate(() => { const w = document.getElementById('welcome'); if (w && !w.hidden && w.getClientRects().length) w.querySelector('[data-act="wlater"]')?.click(); }); await sleep(100); } return tutState(page); };
const tapEl = async (page, sel) => { const p = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel); if (p) await page.touchscreen.tap(p[0], p[1]); return !!p; };
const TARGET = { 3: '#grid .tile[data-game="dots"]', 5: '#grid .tile[data-game="quick-tap"]', 7: '#diff-row .choice[data-diff="two"]', 11: '#time-row .tbtn[data-time="5"]' };
scene('62.9', async (page, browser) => {
  await load(page, { tut: 0, played: 0 }); await show(page, 's-pick');
  let prev = null;
  for (let i = 0; i < 12; i++) {
    const s = await nextBox(page, prev); prev = s.text;
    await frame(page, browser, `62.9-box-${String(i + 1).padStart(2, '0')}`, `Walkthrough box ${i + 1}: "${s.text}"`); say('box', s);
    if (TARGET[i]) await tapEl(page, TARGET[i]); else await page.touchscreen.tap(14, 830);
    await sleep(500);
  }
  // the first run: live, with no Exit and no Restart (62.10); taps on both pads until it ends
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(100);
  say('firstRun', await page.evaluate(() => ({ tutrun: document.getElementById('game').classList.contains('tutrun'), exit: getComputedStyle(document.getElementById('quit')).display, restart: getComputedStyle(document.getElementById('restart')).display })));
  await frame(page, browser, '62.10-first-run', 'The walkthrough\'s first run: no Exit (top left) and no Restart (top right)');
  for (let i = 0; i < 90 && (await page.evaluate(() => document.getElementById('game').classList.contains('on'))); i++) {
    await page.evaluate(k => { const p = document.querySelectorAll('#qt .pad')[k % 2]; p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 400 })); }, i); await sleep(120); }
  say('stored', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); return { tut: s.prefs.tut, tutRun: !!s.prefs.tutRun, hits: s.prefs.tutRun && s.prefs.tutRun.hits }; }));
});
scene('62.11', async (page, browser) => {
  let prev = null;
  // build 65 (64.2): the result's boxes branch on what the first run opened, so there are eight or nine — framed until the last
  for (let i = 0; i < 10; i++) {
    const s = await nextBox(page, prev, 200); if (!s.text || s.text === prev) break; prev = s.text;
    await frame(page, browser, `62.11-box-${i + 1}`, `First result, box ${i + 1}: "${s.text}"`); say('box', s);
    await page.touchscreen.tap(14, 830); await sleep(450);
  }
  await sleep(600);
  say('after', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); return { tut: s.prefs.tut, rails: !!(s.ach || {}).rails, tut2: !document.getElementById('tut') || document.getElementById('tut').hidden, screen: document.querySelector('.screen.on')?.id }; }));
  await frame(page, browser, '62.14-off-the-rails', 'After "Good luck!": the result screen works again and Off the Rails is banked (its toast)');
  await show(page, 's-menu'); await sleep(1400);
  say('menu', await page.evaluate(() => [...document.querySelectorAll('#s-menu .item')].map(b => (b.dataset.go || b.dataset.act) + (b.classList.contains('dim') ? ' dim' : ''))));
  await frame(page, browser, '62.14-menu-open', 'The menu after the walkthrough: Scores, Progress and About open, Customise and Keys still locked behind the Games chest');
});

// 62.13: one Sprint on record and Dash banked from it — the result screen of that Sprint, Dash's chip green
scene('62.13', async (page, browser) => {
  const t0 = Date.now() - 60000, sprint = { t: t0, g: 'quick-tap', d: 'two', s: 5, hits: 14, misses: 2, v: 4 };
  await load(page, { story: 1 }, { runs: [sprint], unlock: { 'quick-tap:two:15': t0 } });
  await page.evaluate(async sprint => { const ST = await import('./core/state.js'), E = await import('./core/events.js'); ST.sel.game = 'quick-tap'; ST.sel.diff = 'two'; ST.sel.secs = 5; ST.sel.vs = 0;
    E.emit('run:record', { run: sprint }); E.emit('run:finish', { run: sprint, isBest: true, two: false, fresh: [], ach: [], adv: null }); }, sprint);
  await sleep(5000);
  say('dash', await page.evaluate(() => { const b = document.querySelector('#over-chips2 .chip[data-v="15"]'); return { cls: b.className, border: getComputedStyle(b).borderTopColor }; }));
  await frame(page, browser, '62.13-dash-green', 'Result of the Sprint that unlocked Dash: the DASH chip green until a Dash is played');
});

/* 62.15: Customise scrolled to the bottom with Lantern chosen. Desktop Chrome draws the canvas to the very bottom even with the insets on, so the
   second frame FORCES the phone's failure — the canvas stopped 34px short — to show what that strip is now: the layer's own bottom colour, not
   Lantern's purple --ground. Pixels read off each PNG: the strip (bottom 20px) against the layer 80px above it */
scene('62.15', async (page, browser) => {
  await load(page, { ...OPEN, bg: 'lantern' }); await show(page, 's-custom'); await sleep(900);
  await page.evaluate(() => { const s = document.getElementById('s-custom'); s.scrollTop = s.scrollHeight; }); await sleep(1400);
  const read = im => { const at = y => px(im, 20, y); return { strip: at(im.h - 20), above: at(im.h - 160) }; };
  say('ground', await page.evaluate(() => { const p = document.createElement('div'); p.style.background = 'var(--ground)'; document.body.appendChild(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return { ground: c, html: getComputedStyle(document.documentElement).backgroundColor }; }));
  say('pixels', read(await frame(page, browser, '62.15-customise-bottom', 'Customise scrolled to the bottom, Lantern: the layer runs to the bottom edge under MUSIC ON / OFF (47 / 34 insets)')));
  await page.evaluate(() => { document.getElementById('stars').style.height = 'calc(100lvh + env(safe-area-inset-top) - 34px)'; }); await sleep(1400);
  say('pixels', read(await frame(page, browser, '62.15-short-layer', 'The same, with the canvas forced 34px short as on the phone: the strip is the layer\'s own bottom colour, no purple band')));
  await page.evaluate(() => { document.getElementById('stars').style.height = ''; });
});

/* =======================================================================================================
   BUILD 65 — one 390-wide frame per visual item, the same 47 / 34 insets; one frame per tutorial box. Run with --out build-65 before the bump
   ======================================================================================================= */
// a result screen with a full top 10 behind it: twelve Quick Tap · Two Sprints on record, the one just played somewhere in the middle
async function resultOf(page, prefs = OPEN, place = 4) {
  const now = Date.now(), runs = Array.from({ length: 12 }, (_, i) => ({ t: now - (12 - i) * 60000, g: 'quick-tap', d: 'two', s: 5, hits: 30 - i * 2, misses: 1, v: 4 }));
  const cur = Object.assign({}, runs[place], { t: now }); runs[place] = cur;
  await load(page, prefs, { runs });
  await page.evaluate(async cur => { const ST = await import('./core/state.js'), E = await import('./core/events.js'); ST.sel.game = 'quick-tap'; ST.sel.diff = 'two'; ST.sel.secs = 5; ST.sel.vs = 0;
    E.emit('run:record', { run: cur }); E.emit('run:finish', { run: cur, isBest: false, two: false, fresh: [], ach: [], adv: null }); }, cur);
  await sleep(4200); }
const fits = page => page.evaluate(() => { const s = document.getElementById('s-over'), q = id => document.getElementById(id).getBoundingClientRect(), w = document.querySelector('#over-top .otwrap'), rows = [...document.querySelectorAll('#over-runs tr')];
  const vis = rows.filter(r => { const a = r.getBoundingClientRect(), b = w.getBoundingClientRect(); return a.top >= b.top - 1 && a.bottom <= b.bottom + 1; });
  return { scroll: s.scrollHeight - s.clientHeight, back: [Math.round(q('over-back').left), Math.round(q('over-back').top)], toGames: Math.round(innerHeight - q('to-games').bottom), rowsShown: vis.length,
    cur: document.querySelector('#over-runs tr.cur') ? vis.includes(document.querySelector('#over-runs tr.cur')) : null, ranks: rows.slice(0, 3).map(r => r.cells[0].textContent) }; });
scene('64.4', async (page, browser) => {
  await resultOf(page, { ...OPEN, welcomeSeen: 1, bg: ARGV.includes('--lantern') ? 'lantern' : 'stars' }, 8); say('fit', await fits(page));
  await frame(page, browser, '64.4-result-fits', 'Result screen, 390 x 844 with 47 / 34 insets: no page scroll, Back top left, the top 10 in its own box opened at this run, Game select pinned at the foot');
  // a small phone (iPhone SE, 375 x 667): the big number and the gaps give way, the box still shows three rows and Game select is on screen
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 20, bottom: 0, left: 0, right: 0 } }).catch(() => {});
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await sleep(900);
  say('fitSE', await fits(page));
  await frame(page, browser, '64.4-result-fits-se', 'The same result on a 375 x 667 phone (20 / 0 insets, an SE): still one screen, three rows of the top 10 at least, Game select on screen');
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } }).catch(() => {});
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await sleep(300);
});

/* a first-time tutorial, one frame per box: each box waited for by its text changing, framed, then answered — a tap on `taps[i]` where the box asks
   for one, a tap in the bottom-left corner of the phone (on nothing in particular) where it does not */
async function tutFrames(page, browser, name, n, taps = {}, note = '', between = null) {
  let prev = null;
  for (let i = 0; i < n; i++) {
    if (between) await between();
    const s = await nextBox(page, prev, 200); prev = s.text;
    await frame(page, browser, `${name}-box-${i + 1}`, `${note}box ${i + 1}: "${s.text}"`); say('box', s);
    if (taps[i]) await tapEl(page, taps[i]); else await page.touchscreen.tap(14, 830);
    await sleep(600);
  } }
const MENU_NEW = { ...PLAIN, menuUnl: {}, welcomeSeen: 1 };
scene('64.8', async (page, browser) => {
  await load(page, MENU_NEW, { unlock: { 'dots:blind': 1 } });
  await page.evaluate(async () => { const V = await import('./ui/video.js'), M = (await import('./config/messages.js')).MESSAGES; V.playVideo(M[0]); await new Promise(r => setTimeout(r, 600)); V.closeVideo(); });
  await tutFrames(page, browser, '64.8', 6, { 0: '#s-menu .item[data-go="s-about"]' }, 'About tutorial, after the Welcome clip — ');
});

scene('64.10', async (page, browser) => {
  const t = Date.now() - 3600000, run = { t, g: 'quick-tap', d: 'two', s: 5, hits: 16, misses: 0, v: 4 };
  await load(page, { ...PLAIN, menuUnl: { prog: 1 }, unlBy: { 'quick-tap:two:15': { g: 'quick-tap', d: 'two', s: 5, h: 16, t } } }, { runs: [run], unlock: { 'quick-tap:two:15': t, 'quick-tap:four': t } });
  await show(page, 's-prog', { tab: 'c-games' }); await sleep(700);
  await page.evaluate(() => { const l = document.getElementById('chest-list'), r = l.querySelector('.urow[data-s="15"]'); if (r) l.scrollTop = r.offsetTop - 260; }); await sleep(300);
  await frame(page, browser, '64.10-open-rows', 'Progress, Games chest tab: Four (earned before this build) and Dash (with "you: 16") keep their requirement, ticked and green; the Four Dash row names its mode (64.11)');
});

scene('64.9', async (page, browser) => {
  await load(page, { ...MENU_NEW, menuUnl: { prog: 1 }, tuts: { prog: 0 } }, { unlock: { 'dots:blind': 1, 'hold:grow': 1 } }); await show(page, 's-menu'); await sleep(600);
  await tutFrames(page, browser, '64.9', 5, { 0: '#s-menu .item[data-go="s-prog"]', 4: '#chest-list .gh[data-g]' }, 'Progress tutorial, after the first Estimate run — ');
});
scene('64.12', async (page, browser) => {
  await load(page, { ...MENU_NEW, menuUnl: { prog: 1, board: 1 }, tuts: { prog: 'done', board: 0 } }, { unlock: { 'dots:blind': 1, 'reaction:flash': 1 } }); await show(page, 's-menu'); await sleep(600);
  await tutFrames(page, browser, '64.12', 4, { 0: '#s-menu .item[data-go="s-board"]', 2: '#radar text[data-g="quick-tap"]' }, 'Scores tutorial, after the first Reaction run — ');
});

// 64.13: runs placed exactly on the bars, read from config/key-bars.js, so each spoke's number is known — `at` maps a combination to a tier
async function barRuns(page, at) { return page.evaluate(async at => { const KB = (await import('./config/key-bars.js')).KEY_BARS, now = Date.now(); let i = 0;
  return Object.entries(at).map(([k, tier]) => { const [g, d, s] = k.split(':'), r = KB[k], v = tier === 'clear' ? r.bar : r[tier]; return { t: now - (++i) * 60000, g, d, s: +s, hits: v, misses: 0, v: 4 }; }); }, at); }
scene('64.13', async (page, browser) => {
  await load(page); const runs = await barRuns(page, { 'quick-tap:two:5': 'pro', 'quick-tap:two:15': 'author', 'dots:blind:5': 'clear' });
  await load(page, { ...OPEN, welcomeSeen: 1 }, { runs }); await show(page, 's-board'); await sleep(1600);
  say('chart', await page.evaluate(() => ({ labels: [...document.querySelectorAll('#radar text')].map(t => t.textContent), all: document.getElementById('radar-all').textContent, cls: document.getElementById('radar-all').className })));
  await frame(page, browser, '64.13-web-lit', 'Scores: Quick Tap (Pro and Author runs) reads 250, Dots (on its Skill bar) 100; the rings at 100 / 200 / 300 in Lantern, Circuit and Thorns styles; overall 175 past the Lantern ring');
  const runs3 = await barRuns(page, { 'quick-tap:two:5': 'author', 'dots:blind:5': 'author', 'hold:grow:7': 'author' });
  runs3[0].hits = Math.round(runs3[0].hits * 1.4);
  await load(page, { ...OPEN, welcomeSeen: 1 }, { runs: runs3 }); await show(page, 's-board'); await sleep(1600);
  say('chart', await page.evaluate(() => ({ labels: [...document.querySelectorAll('#radar text')].map(t => t.textContent), all: document.getElementById('radar-all').textContent, cls: document.getElementById('radar-all').className })));
  await frame(page, browser, '64.13-web-thorned', 'Scores: three games on or past their Author bars — the web out past the Thorns ring, the overall figure in the Thorns style');
});

// a reveal on screen (a chest's ceremony, a key's first animation): tapped through to its card and the card's Continue pressed
const revealThrough = async page => { for (let i = 0; i < 60; i++) { const st = await page.evaluate(() => { const h = document.getElementById('key-cere'); if (!h || h.hidden) return 'none';
  const go = h.querySelector('.rgo.on'); if (go) { go.click(); return 'go'; } if (h.classList.contains('tap')) { h.click(); return 'tap'; } return 'wait'; }); if (st === 'none') return; await sleep(250); } };
scene('64.14', async (page, browser) => {
  const keys = await page.evaluate(async () => (await import('./config/unlocks.js')).UNLOCKS.map(u => u.key).filter(k => k !== 'sequence:practice'));
  await load(page, { ...PLAIN, welcomeSeen: 1 }, { unlock: Object.fromEntries(keys.map(k => [k, 1])) }); await show(page, 's-pick'); await sleep(1200);
  await page.evaluate(() => document.querySelector('#grid .chest[data-chest="games"]').click()); await sleep(800); await revealThrough(page);
  await tutFrames(page, browser, '64.14', 9, { 3: '#s-key .knode[data-kg="quick-tap"]', 5: '#s-menu .item[data-go="s-custom"]', 7: '#c-bg button[data-v="snow"]' }, 'Games chest tutorial — ', () => revealThrough(page));
});

scene('64.16', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 }, keyIntro: {} }); await show(page, 's-key', { tier: 0 });
  for (let i = 0; i < 80 && (await page.evaluate(() => document.getElementById('key-cere').dataset.step)) !== 'settle'; i++) await sleep(50);
  await sleep(560);
  say('settle', await page.evaluate(() => { const k = document.querySelector('#key-cere .kikeyg'), h = document.querySelector('#s-key .kglyph'); if (!k || !h) return null; const a = k.getBoundingClientRect(), b = h.getBoundingClientRect();
    return { intro: [Math.round(a.left), Math.round(a.top), Math.round(a.width)], hub: [Math.round(b.left), Math.round(b.top), Math.round(b.width)] }; }));
  await frame(page, browser, '64.16-key-settled', 'The Skill Key intro at its last frame: the key has travelled to the hub and is the hub key size — nothing shrinks when the screen takes over');
  await revealThrough(page); await sleep(600);
  say('cards', await page.evaluate(() => [...document.querySelectorAll('#key-keys .kkey')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })));
  await frame(page, browser, '64.16-key-cards', 'Key screen after the intro: the Skill Key, Pro and Author cards one width with their tops level');
});

scene('64.17', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 } }, { bars: { 'quick-tap:two:5': Date.now(), 'dots:blind:5': Date.now() } }); await show(page, 's-key', { tier: 0 }); await sleep(1200);
  await page.evaluate(() => document.querySelector('#s-key .knode[data-kg="quick-tap"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(700);
  say('panel', await page.evaluate(() => ({ para: document.querySelectorAll('#s-key .keyblk p').length, cards: [...document.querySelectorAll('#key-keys u')].map(u => u.textContent), count: (document.getElementById('key-count') || {}).textContent })));
  await frame(page, browser, '64.17-key-panel', 'Skill Key, Quick Tap opened: no description paragraph, the rows straight under the heading; the card counts bars ("2/30") like the line under the key (64.18)');
});

scene('64.20', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 } }); await show(page, 's-custom'); await sleep(900);
  say('music', await page.evaluate(() => ({ row: [...document.querySelectorAll('#c-track button')].map(b => b.textContent + (b.classList.contains('sel') ? '*' : '') + (b.classList.contains('locked') ? ' (locked)' : '')), above: document.getElementById('c-track').getBoundingClientRect().top < document.getElementById('pv-g').getBoundingClientRect().top })));
  await frame(page, browser, '64.20-music-global', 'Customise: Music and Music on / off at the top, above the game tabs — one list for the whole game, the key themes locked until their keys');
  await page.evaluate(() => { const s = document.getElementById('s-custom'); s.scrollTop = s.scrollHeight; }); await sleep(600);
  say('rows', await page.evaluate(() => [...document.querySelectorAll('#s-custom .clabel')].map(l => l.textContent)));
  await frame(page, browser, '64.19-customise-foot', 'Customise scrolled to the foot: Tap sound is the last row — the Taps per second choice is gone');
});

scene('64.15', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 } }); await show(page, 's-custom'); await sleep(700);
  await page.evaluate(() => document.querySelector('#c-bg button[data-v="snow"]').click()); await sleep(1500);
  say('snow', await page.evaluate(async () => ({ words: (await import('./config/copy.js')).CHEST_WORDS.games.map(w => w.w), bg: JSON.parse(localStorage.getItem('ne')).prefs.bg, locked: document.querySelector('#c-bg button[data-v="snow"]').classList.contains('locked') })));
  await frame(page, browser, '64.15-snow-picked', 'Customise with only the Games chest open: SNOW (the chest’s background) open and picked, the snowfall behind the screen');
});

scene('64.6', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1 }); await runOf(page, 'quick-tap'); await sleep(1200);
  say('hud', await page.evaluate(() => { const q = id => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    const a = q('restart'), t = q('hud-time'); return { restart: a, time: t, mode: q('hud-mode'), quit: q('quit'), overlap: !(t[2] <= a[0] || t[0] >= a[2] || t[3] <= a[1] || t[1] >= a[3]) }; }));
  await frame(page, browser, '64.6-restart-outlined', 'A Quick Tap Sprint, live: Restart an outlined button top right opposite the ✕, the clock under "Two · Sprint" on the left, nothing over Restart');
});


/* =======================================================================================================
   BUILD 68 (FEEDBACK-v36) — one 390-wide frame per visual item, both safe-area insets. The tutorial boxes are the gate's own
   new-player journey frames (_review/_shots/journey), so they are not taken again here.
   ======================================================================================================= */
const tap68 = (page, sel) => page.evaluate(s => document.querySelector(s)?.click(), sel);
const ALL68 = { welcomeSeen: 1, chests: { games: 1, key: 1, pro: 1, thorns: 1 }, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, allOpen: 1 };
scene('67.37', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } }); await show(page, 's-menu'); await sleep(900);
  say('menu', await page.evaluate(() => [...document.querySelectorAll('#s-menu .item')].map(b => b.textContent.trim()).filter(t => /%/.test(t))));
  await frame(page, browser, '67.37-meter', 'The main menu with the Skill chest open: the meter reads out of 300, not "100% · Pro 6/30"');
});
scene('67.40', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1 }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 9, misses: 0, v: 4 }] }); await show(page, 's-menu'); await sleep(900);
  await frame(page, browser, '67.40-next-card', 'The next-unlock card on the main menu: the one thing to earn next, with the best on a bar');
});
scene('67.16-67.17', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1 }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 9, misses: 0, v: 4 }] }); await runOf(page, 'quick-tap'); await sleep(900);
  await frame(page, browser, '67.16-run-top', 'A Quick Tap run: the ✕ alone on its row, one goal line with its pips under it, no Restart (67.5)');
  await load(page, { ...OPEN, welcomeSeen: 1 }); await runOf(page, 'reaction'); await sleep(2600);
  await frame(page, browser, '67.17-reaction', 'Reaction Flash live: AVG on top, each tap’s verdict under its number, no average line');
});
// 67.7 / 67.6: the Welcome card is the new-player journey's own frame (_review/_shots/journey/welcome-01.jpg), on the real result that opens Dots
scene('67.6b-496', async (page, browser) => {
  await load(page, { ...PLAIN, ...ALL68, msgSeen: {} });
  await page.evaluate(async () => { const V = await import('./ui/video.js'), M = await import('./config/messages.js'); V.playVideo(M.MESSAGES.find(m => m.by && m.by.chest === 'key' && m.file), { full: true }); }); await sleep(1500);
  await frame(page, browser, '496-full-screen', 'A chest video’s first viewing: full screen, 16:9 letterboxed, the Skill chest’s gold as its edge');
  await page.evaluate(() => { const v = document.querySelector('#vplay video'); if (v) v.dispatchEvent(new Event('ended')); }); await sleep(120);
  await frame(page, browser, '67.14-static', 'The switch-off: a burst of static over the picture as it goes');
});
scene('67.27-67.8', async (page, browser) => {
  await load(page, { ...PLAIN, ...ALL68, gauntSeen: { g1: 1, g2: 1 }, paid: 1, msgSeen: { games: 1 } }); await show(page, 's-about'); await sleep(900);
  await frame(page, browser, '67.27-about-frames', 'About’s list: each chest’s clip framed in its chest’s colour (Games white, Skill gold, Pro light blue, Author thorns), a placeholder card where there is no still (67.8)');
});
scene('67.12-67.32', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1 }, spill: { games: 1 } }); await show(page, 's-pick', { chest: 'key' }); await sleep(2600);
  await frame(page, browser, '67.32-you-found', 'The map after the Skill chest: “You found” names the key’s track (LANTERN) before the video; the reward kinds carry no bracket except (music)');
});
scene('67.24', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 } }); await show(page, 's-key'); await sleep(1200);
  await tap68(page, '#key-keys .kkey.locked:last-child'); await sleep(300);
  await frame(page, browser, '67.24-key-card', 'A locked key card names the chest that opens it (“open the Pro chest”); the tap shakes it, no popup');
});
scene('67.30', async (page, browser) => {
  await load(page, { ...PLAIN, ...ALL68, bg: 'lantern' }); await show(page, 's-menu'); await sleep(1500);
  await frame(page, browser, '67.30-lantern-menu', 'The main menu on Lantern: no black box behind any line, each wearing its own soft shadow');
});
scene('67.18-67.21', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1 }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 14, misses: 0, row: 14, v: 4 }, { g: 'hold', d: 'grow', s: 7, t: Date.now() - 5e4, hits: 5.93, misses: 0, x: 1, y: 27.82, v: 4 }] });
  await show(page, 's-board'); await sleep(900);
  await frame(page, browser, '67.18-web', 'Scores: the web the screen’s full width, its labels larger, no caption line under it (67.19)');
  await page.evaluate(() => document.querySelector('#radar text[data-g="quick-tap"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(500);
  await frame(page, browser, '67.21-detail', 'A tap on Quick Tap’s point: its detail — score, bars per key, best per mode, the next bar — and still on Scores');
});
scene('67.38', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1, excuses: { 1: 1, 3: 2, 7: 1 } }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 4e6, hits: 9, misses: 0, v: 4 }] });
  await show(page, 's-prog', { tab: 'exc' }); await sleep(800);
  await frame(page, browser, '67.38-tab', 'Progress → Excuses: the total, then all ten with their hints and counts');
  await page.evaluate(async () => { const X = await import('./progress/excuses.js'), U = await import('./ui/excuse.js'), T = await import('./ui/toast.js'); const x = X.makeExcuse(7); T.toast(U.excuseLine(x)); U.excuseFx(x); }); await sleep(700);
  await frame(page, browser, '67.38-made', 'An excuse made: “Excuse #7: My watch is slow”, the shrug in the corner');
  await show(page, 's-pick'); await sleep(500); await page.mouse.move(195, 320); for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -40 }); await sleep(80); }
  await frame(page, browser, '67.38-exit', 'Excuse #10: the map pulled past its top shows the tiny exit');
});
scene('67.39', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1, excuses: { 7: 9 } }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 4e6, hits: 9, misses: 0, v: 4 }] });
  await page.evaluate(async () => { const X = await import('./progress/excuses.js'), U = await import('./ui/excuse.js'); U.excuseFx(X.makeExcuse(7)); }); await sleep(1900);
  await frame(page, browser, '67.39-tiny', 'The tenth excuse: Tiny Aiden (the placeholder stick figure) dancing');
  await show(page, 's-custom'); await sleep(700);
  await frame(page, browser, '67.39-switch', 'Customise from ten excuses on: the Tiny Aiden switch');
});
scene('67.33-67.35', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1, bg: 'lantern', everywhere: 'key', menuTrack: 'theme:key' }); await show(page, 's-custom'); await sleep(500); await show(page, 's-menu'); await sleep(200); await show(page, 's-custom'); await sleep(900);
  say('fit', await page.evaluate(() => { const t = document.getElementById('pv-g').getBoundingClientRect(); return { tabsBottom: Math.round(t.bottom), h: innerHeight, scroll: document.getElementById('s-custom').scrollTop }; }));
  await frame(page, browser, '67.35-customise', 'Customise at 390×844: Music (Off last, 67.34), Background with the small wheel on Lantern, Tap sound, the preview, the game tabs — no scroll; Lantern and its track in gold (67.33)');
});

/* =======================================================================================================
   BUILD 69 — FEEDBACK-v37, one 390-wide frame per visual item, insets 47 / 34
   ======================================================================================================= */
/* 68.27 (L23): headless Chrome composites a fixed overlay past the bottom inset where an installed iPhone app does not, so these frames paint the
   bottom inset in html's OWN background (#phone-strip, added for the frame and removed after it) — what the phone shows in that band */
const phoneStrip = (page, on) => page.evaluate(on => { let d = document.getElementById('phone-strip'); if (!on) { if (d) d.remove(); return null; }
  if (!d) { d = document.createElement('div'); d.id = 'phone-strip'; document.documentElement.appendChild(d); }
  const bg = getComputedStyle(document.documentElement).backgroundColor;
  d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:env(safe-area-inset-bottom);z-index:2147483647;pointer-events:none;background:' + bg; return bg; }, on);
scene('68.27', async (page, browser) => {
  await load(page, { ...PLAIN, ...ALL68, bg: 'stars' }); await show(page, 's-key', { tier: 0 }); await sleep(900);
  await page.evaluate(async () => { const V = await import('./ui/video.js'), M = await import('./config/messages.js'); V.playVideo(M.MESSAGES.find(m => m.by && m.by.chest === 'key' && m.file), { full: true }); }); await sleep(1600);
  say('html', await phoneStrip(page, true));
  await frame(page, browser, '68.27-video-strip', 'The Skill chest video full screen over the Lantern key screen; the bottom 34px are html’s own background, as the installed app shows them: black under the black player (v0.68: Lantern brown)');
  await phoneStrip(page, false); await page.evaluate(async () => (await import('./ui/video.js')).closeVideo()); await sleep(600);
  await load(page, { ...PLAIN, ...ALL68, bg: 'orbs' }); await show(page, 's-key', { tier: 0 }); await sleep(1200);
  say('html', await phoneStrip(page, true));
  await frame(page, browser, '68.27-key-orbs', 'The Skill key screen with Orbs chosen in Customise; the bottom 34px are html’s own background: the key screen’s Lantern floor');
  await phoneStrip(page, false);
  await load(page, { ...PLAIN, ...ALL68, bg: 'snow' }); await show(page, 's-key', { whole: 1, tier: 0, from: 's-testing' }); await sleep(1400);
  say('html', await phoneStrip(page, true));
  await frame(page, browser, '68.27-key-snow-earn', 'The Skill key being earned with Snow (Aiden’s navy) chosen; the bottom 34px are html’s own background: Lantern’s floor (v0.68: Snow’s navy, his 68.36 frame)');
  await phoneStrip(page, false);
});

/* 68.29 (L24): the first painted frame on arriving at a key whose creation intro is due — every animation frozen at its start in the same task as
   the screen is shown, so the frame is the one the phone paints first; then the same visit 600ms in */
scene('68.29', async (page, browser) => {
  for (const [t, name] of [[0, 'skill'], [1, 'pro'], [2, 'author']]) {
    await load(page, { ...PLAIN, ...ALL68, keySeen: 0, keyIntro: {} });
    say('frame one', await page.evaluate(async t => { const R = await import('./ui/router.js'); R.show('s-key', { tier: t });
      for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0; } catch (e) {} }
      const h = document.getElementById('key-cere'); return { host: !h.hidden && h.dataset.rev, stage: !!h.querySelector('.kistage') }; }, t));
    await frame(page, browser, t ? `68.29-intro-frame-one-${name}` : '68.29-intro-frame-one', `The ${name} key's creation intro, frame one: the intro's own dark stage, nothing of the finished key screen (v0.68: the finished screen, then the intro)`);
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.currentTime = 600; } catch (e) {} } });
    await frame(page, browser, `68.29-intro-600ms-${name}`, `The ${name} key's creation intro 600ms in: the pieces gathering`);
    await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal());
  }
});

/* 68.36 (L13): the Skill key earned through Testing's switch, frames back to back at the wall clock (the moving background hidden, as the gate reads
   it) from the earn starting until the chest's ceremony is up; the frame kept is the LAST one that differs from the frame before it */
scene('68.36', async (page, browser) => {
  const U = await import('../config/unlocks.js');
  await load(page, { ...PLAIN, chests: { games: 1 }, spill: { games: 1 }, readySeen: { games: 1 }, welcomeSeen: 1 }, { unlock: Object.fromEntries(U.UNLOCKS.map(u => [u.key, Date.now()])) });
  await show(page, 's-testing'); await sleep(300); await page.evaluate(() => document.querySelector('[data-act="dev-chestall"][data-chest="key"]').click()); await sleep(300);
  await page.evaluate(() => { const s = document.createElement('style'); s.id = 'shot-nobg'; s.textContent = '#stars{visibility:hidden!important}'; document.head.appendChild(s); });
  await show(page, 's-key', { tier: 0 }); const shots = []; const t0 = Date.now(); let began = false;
  while (Date.now() - t0 < 15000) { const st = await page.evaluate(() => { const h = document.getElementById('key-cere'); return h.hidden ? '' : h.dataset.kind; });
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 390, height: 844, scale: .5 } }); if (st === 'key') began = true;
    if (began) { shots.push({ t: Date.now(), st, png }); if (st === 'chest') break; } }
  if (!lens) { lens = await browser.newPage(); await lens.goto('data:text/html,<canvas id=c></canvas>'); }
  const d = await lens.evaluate(async list => { const dec = async b => { const i = new Image(); i.src = 'data:image/png;base64,' + b; await i.decode(); const c = document.getElementById('c'); c.width = i.naturalWidth; c.height = i.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const out = []; let p = await dec(list[0]); for (let k = 1; k < list.length; k++) { const q = await dec(list[k]); let n = 0;
      for (let j = 0; j < q.length; j += 4) if (Math.max(Math.abs(q[j] - p[j]), Math.abs(q[j + 1] - p[j + 1]), Math.abs(q[j + 2] - p[j + 2])) > 16) n++; out.push(n); p = q; } return { out, N: p.length / 4 }; }, shots.map(s => s.png.toString('base64')));
  await page.bringToFront();
  const nx = shots.findIndex((s, k) => k && (s.st === 'chest' || d.out[k - 1] > d.N * .25)); let last = 0; for (let k = 1; k < nx; k++) if (d.out[k - 1] > 300) last = k;
  fs.writeFileSync(path.join(OUT, '68.36-last-frame.png'), shots[last].png);
  manifest.push({ frame: '68.36-last-frame.png', note: 'The last frame that visibly changes after the Skill key is earned (Testing\u2019s switch); the chest\u2019s ceremony is up ' + (shots[nx].t - shots[last].t) + 'ms later', sab: SAB });
  say('last change → chest', (shots[nx].t - shots[last].t) + 'ms, at ' + (shots[last].t - shots[0].t) + 'ms into the earn');
  await page.evaluate(() => document.getElementById('shot-nobg')?.remove());
  await page.evaluate(async () => (await import('./ui/reveal.js')).stopReveal());
});

/* 68.39: Progress over Snow — the navy background with the white flakes Aiden calls "the orbs" — on the Author chest's tab, as his v0.68 frame */
scene('68.39', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 }, bg: 'snow' }); await show(page, 's-prog', { tab: 'c-thorns' }); await sleep(2200);
  await frame(page, browser, '68.39-orbs-progress', 'Progress on Snow (the navy "orbs"): the flakes drawn at most 0.45 of the text’s brightness, under every line and chip');
});

/* 68.21 (L25): green means done and nothing else — the Games chest tab under Quick Tap with Quick Tap · Four locked (his v0.68 frame), and the Skill
   Key screen with the Pro and Author cards locked */
scene('68.21', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1 }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 16, misses: 0, row: 16, v: 4 }] });
  await show(page, 's-prog', { tab: 'c-games' }); await sleep(500); await tap68(page, '#chest-g [data-v="quick-tap"]'); await sleep(500);
  await frame(page, browser, '68.21-games-tab', 'Games chest tab, Quick Tap: the locked Four rows’ names and requirements in plain white (v0.68: the requirement green)');
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 }, spill: { games: 1 } }); await show(page, 's-key', { tier: 0 }); await sleep(1200);
  await frame(page, browser, '68.21-key-cards', 'The Skill Key screen: the locked Pro and Author cards say “To unlock: open the … chest” in plain white (v0.68: green)');
});

/* 68.3: every web label drawn once and inside its own picture — Scores with Spot's detail open (his frame: a second "Spot 0" beside Overall, a second
   "Reaction 0" over the card), and the whole Skill Key (his frame: a stray "Spot 4/4" above Timing). Headless Chrome never drew the ghost; these show
   the labels inside the picture's own box, which is what the phone's ghost needed to be drawn */
scene('68.3', async (page, browser) => {
  await load(page, { ...OPEN, welcomeSeen: 1 }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 30, misses: 0, row: 30, v: 4 }, { g: 'sequence', d: 'solo', s: 3, t: Date.now() - 5e4, hits: 4, misses: 1, v: 4 }] });
  await show(page, 's-board'); await sleep(1200);
  await page.evaluate(() => document.querySelector('#radar text[data-g="sequence"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(500);
  say('labels', await page.evaluate(() => { const s = document.getElementById('radar').getBoundingClientRect(); return { viewBox: document.getElementById('radar').getAttribute('viewBox'), n: document.querySelectorAll('#s-board text[data-g]').length, outside: [...document.querySelectorAll('#radar text')].filter(t => { const r = t.getBoundingClientRect(); return r.left < s.left || r.right > s.right || r.top < s.top || r.bottom > s.bottom; }).length }; }));
  await frame(page, browser, '68.3-scores', 'Scores with Sequence’s detail open: seven labels, each once, all inside the web’s own box — nothing beside Overall or over the card');
  await load(page, { ...PLAIN, ...ALL68 }); await show(page, 's-key', { tier: 0 }); await sleep(2600);
  say('labels', await page.evaluate(() => { const s = document.getElementById('key-ring').getBoundingClientRect(); return { viewBox: document.getElementById('key-ring').getAttribute('viewBox'), n: document.querySelectorAll('#s-key .klbl').length, outside: [...document.querySelectorAll('#key-ring .klbl')].filter(t => { const r = t.getBoundingClientRect(); return r.left < s.left || r.right > s.right || r.top < s.top || r.bottom > s.bottom; }).length }; }));
  await frame(page, browser, '68.3-key-labels', 'The whole Skill Key: seven labels, each once, all inside the ring’s own box — no stray “Spot” above Timing');
});

/* 68.13 (L27): a new profile's title sequence 4.3s in, a tap having landed at 3s (on the hint's own clock) and nothing changed — the three lines up,
   "Tap to begin" not yet shown, no menu */
scene('68.13', async (page, browser) => {
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 100 && !(await page.evaluate(() => !!document.querySelector('#s-menu.story.run'))); i++) await sleep(50);
  say('tap', await page.evaluate(async () => { const a = document.getElementById('storyhint').getAnimations()[0];
    while ((a.effect.getComputedTiming().localTime || 0) < 3000) await new Promise(r => requestAnimationFrame(r));
    const at = Math.round(a.effect.getComputedTiming().localTime); (document.elementFromPoint(195, 520) || document.body).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 195, clientY: 520 }));
    while ((a.effect.getComputedTiming().localTime || 0) < 4300) await new Promise(r => requestAnimationFrame(r)); const t = a.effect.getComputedTiming();
    return { tappedAt: at, nowAt: Math.round(t.localTime), hintAt: t.delay, story: !!document.querySelector('#s-menu.story') }; }));
  await page.evaluate(() => { for (const a of document.getAnimations()) a.pause(); });
  await frame(page, browser, '68.13-title-locked', 'The title 4.3s in, a tap having landed at 3s: still the title — the three lines up, “Tap to begin” not yet shown (it begins at 4.6s), no menu (v0.68: the tap went through)');
  await page.evaluate(() => { for (const a of document.getAnimations()) a.play(); });
});

/* 68.41 / 68.43: the two filters Aiden photographed — the Pro chest's tab under Quick Tap (no "The key entire"), Achievements under Dots (no "Off the
   Rails", no "Grand tour") */
scene('68.41', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, gauntSeen: { g1: 1 } });
  await show(page, 's-prog', { tab: 'c-pro' }); await sleep(500); await tap68(page, '#chest-g [data-v="quick-tap"]'); await sleep(500);
  say('rows', await page.evaluate(() => [...document.querySelectorAll('#chest-list [data-ach]')].map(b => b.dataset.ach)));
  await frame(page, browser, '68.41-pro-quicktap', 'The Pro chest’s tab under Quick Tap: Quick Tap’s rows and nothing else — “The key entire” is under ALL only (v0.68: listed here)');
  await show(page, 's-prog', { tab: 'ach' }); await sleep(500); await tap68(page, '#ach-g [data-v="dots"]'); await sleep(500);
  say('rows', await page.evaluate(() => [...document.querySelectorAll('#achlist [data-ach]')].map(b => b.dataset.ach)));
  await frame(page, browser, '68.43-ach-dots', 'Achievements under Dots: the two Dots rows and nothing else — “Off the Rails” and “Grand tour” are under ALL only (v0.68: listed above them)');
});

/* the count bugs (Aiden's 68.40 / 68.41 frames): the Skill chest's tab under ALL, its Quick Tap group listing all six bars (v0.68: five, no
   Four · Sprint, "33 of 33"); the Pro chest's tab under Quick Tap, all six (v0.68: five, no Four · Dash, "of 34") */
/* build 69 (68.40 / 68.42, PICKED as mocked): the rebuilt lists. A profile with the Skill chest open, every Dots bar met, two of Quick Tap's and a
   Quick Tap · Two · Marathon run of 40 (its bar is 51): the Skill tab part-way — the count line and its gold bar, Quick Tap open with NEXT on Marathon,
   Dots a gold folded heading; Customise unlocks with two earned; Achievements opening on General */
const P740 = async page => page.evaluate(async () => { const S = await import('./core/store.js'), K = await import('./progress/key.js');
  const bars = K.keyAch().filter(a => a.kt === 'clear' && a.combo), met = bars.filter(a => a.g === 'dots').concat(bars.filter(a => a.combo === 'quick-tap:two:5' || a.combo === 'quick-tap:two:15'));
  for (const a of met) { S.store.ach[a.id] = Date.now(); S.store.bars[K.skey(a.combo, 'clear')] = Date.now(); }
  for (const id of ['first', 'qt_sab', 'rails']) S.store.ach[id] = Date.now(); S.save(); });
scene('68.40', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, allOpen: 1, chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, gauntSeen: { g1: 1 } }, { runs: [{ t: Date.now() - 6e5, g: 'quick-tap', d: 'two', s: 30, hits: 40, misses: 0, row: 40, v: 4 }] });
  await P740(page); await show(page, 's-menu'); await sleep(200);
  await show(page, 's-prog', { tab: 'c-key' }); await sleep(600);
  say('skill', await page.evaluate(() => ({ line: document.getElementById('chest-lab').textContent + ' · ' + document.getElementById('chest-hint').textContent, heads: [...document.querySelectorAll('#chest-list .g')].map(g => g.dataset.g + (g.classList.contains('whole') ? ' gold' : '') + (g.classList.contains('fold') ? ' folded' : '')), next: (document.querySelector('#chest-list .nx span') || {}).textContent })));
  await frame(page, browser, '68.40-skill-tab', 'The Skill chest’s tab part-way: one row of tabs that slides, “Skill key · 8 of 30 unlocked” over a gold bar, Quick Tap open (to-do above done, NEXT on Two · Marathon, the best-so-far bars), Dots a gold folded heading with its tick; no filter row, no “Done” (v0.68: tabs on three lines, “33 of 33”, a filter row, green rows ending DONE, the gold “Quick Tap · Skill key” row)');
  await show(page, 's-prog', { tab: 'cul' }); await sleep(600);
  await frame(page, browser, '68.42-customise-unlocks', 'Customise unlocks: each group its label, count and thin bar; each row a 30px swatch in a fixed column with clear space, crossed in red until earned, the name in gold, the requirement and where on one line, the state at the right edge; to-do above earned (v0.68: a tiny swatch jammed against the name, three lines a row)');
  await show(page, 's-prog', { tab: 'ach' }); await sleep(600);
  await frame(page, browser, '68.40-achievements', 'Achievements: “General” first, then a heading per game with its map symbol; to-do above done; no filter row, no “Done”');
});
/* 68.22: the Author chest's tab while the Pro chest is shut — Aiden's own screen (68.22_author-tab.png) */
scene('68.22', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } });
  await show(page, 's-prog', { tab: 'c-thorns' }); await sleep(700);
  say('tab', await page.evaluate(() => ({ chips: [...document.querySelectorAll('#prog-tabs .chip')].map(c => c.dataset.tab + (c.classList.contains('locked') ? ' locked' : '') + (c.classList.contains('sel') ? ' sel' : '')), text: document.getElementById('p-chest').innerText })));
  await frame(page, browser, '68.22-author-tab-locked', 'The Author chest’s tab with the Pro chest shut: the Author chip greyed and struck through in red (the Pro chip is open), still selectable; the tab says “Revealed when the chest before it opens” and “How to open this chest →” and nothing else (v0.68: a plain chip, “0 of 0 unlocked”, the filter row)');
});
scene('68.40-count', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, gauntSeen: { g1: 1 } });
  await show(page, 's-prog', { tab: 'c-key' }); await sleep(500); await tap68(page, '#chest-g [data-v="all"]'); await sleep(500);
  say('count', await page.evaluate(() => ({ line: document.getElementById('chest-hint').textContent, qt: [...document.querySelectorAll('#chest-list h4')].map(h => h.textContent)[0] })));
  await frame(page, browser, '68.40-skill-tab-count', 'The Skill chest’s tab: “of 38” (30 bars, 7 games, the key entire), and Quick Tap lists all six bars, Four · Sprint among them (v0.68: five, “33 of 33”)');
  await show(page, 's-prog', { tab: 'c-pro' }); await sleep(500); await tap68(page, '#chest-g [data-v="quick-tap"]'); await sleep(500);
  say('count', await page.evaluate(() => ({ line: document.getElementById('chest-hint').textContent, rows: [...document.querySelectorAll('#chest-list [data-ach]')].length })));
  await frame(page, browser, '68.41-pro-tab-count', 'The Pro chest’s tab under Quick Tap: “of 38”, all six Quick Tap bars with Four · Dash, then Quick Tap · Pro (v0.68: five, “of 34”)');
});

/* ---------- build 69 (package P3, the tutorials) ---------- */
// the tutorial box, once it has stopped moving: its line, and whether it is waiting for a tap on its ring
const pBox = async (page, want, ms = 8000) => { const t0 = Date.now(); let b = null;
  while (Date.now() - t0 < ms) { b = await page.evaluate(async () => { const t = document.getElementById('tut'); if (!t || t.hidden) return null; const s = (await import('./ui/tutorial.js')).tutNow();
      return { text: t.querySelector('.tbox p').textContent, top: Math.round(t.querySelector('.tbox').getBoundingClientRect().top), tap: !!(s && s.tap) }; });
    if (b && (!want || b.text.includes(want))) { await sleep(450); return b; } await sleep(120); }
  return b; };
const tutTap = page => page.evaluate(() => document.elementFromPoint(12, innerHeight - 12).click());
const tutAimTap = async page => { const a = await page.evaluate(async () => (await import('./ui/tutorial.js')).tutAim()); if (a) await page.mouse.click(a[0], a[1]); return a; };
// a run started from the map that presses nothing, to its result
async function idleRun(page, g) { await page.evaluate(async g => (await import('./run/run.js')).goWhere({ g }), g);
  for (let i = 0; i < 600 && !(await page.evaluate(() => document.getElementById('s-over').classList.contains('on'))); i++) {
    await page.evaluate(() => { const a = document.getElementById('adbreak'), b = document.getElementById('adskip'); if (a.classList.contains('on') && !b.disabled) b.click(); }); await sleep(100); } await sleep(900); }

/* 68.19: a Dots run that opens Estimate, its result's box read, Game Select — the map with Estimate ringed and no sheet; then the player's tap on the
   tile and Grow, and Estimate's own first box on the sheet */
scene('68.19', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done' } }, { unlock: { 'dots:blind': Date.now() } });
  await idleRun(page, 'dots');
  for (let i = 0; i < 6; i++) { const b = await pBox(page, '', 2500); if (!b || b.tap) break; say('result box', b.text); await tutTap(page); await sleep(300); }
  await page.evaluate(() => document.getElementById('over-back').click());
  say('box', await pBox(page, 'new'));
  await frame(page, browser, '68.19-map-ringed', 'Game Select after the Dots run that opened Estimate: the games menu, no sheet up, Estimate ringed by a must-tap box (v0.68: Estimate’s sheet opened by itself)');
  say('tap', await tutAimTap(page)); await sleep(700);
  await page.evaluate(() => document.querySelector('#diff-row .choice[data-diff="grow"]')?.click()); await sleep(600);
  say('box', await pBox(page, 'modes'));
  await frame(page, browser, '68.19-sheet-after-tap', 'After the player’s own tap on Estimate (then Grow): the sheet, and only now Estimate’s first box');
});

/* 68.18: "Congratulations, you unlocked Progress!" on a result, tapped: the main menu, Progress ringed and the only thing that answers */
scene('68.18', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { prog: 1 }, tuts: { next: 'done', prog: 0 } }, { unlock: { 'dots:blind': Date.now(), 'hold:grow': Date.now() } });
  await show(page, 's-over'); say('result box', await pBox(page, 'Progress'));
  await tutTap(page); await sleep(700); say('screen', await page.evaluate(() => document.querySelector('.screen.on')?.id));
  for (let i = 0; i < 3; i++) { const b = await pBox(page, '', 3000); if (!b || b.tap) { say('box', b); break; } await tutTap(page); await sleep(400); }
  await frame(page, browser, '68.18-menu-ringed-prog', 'The tap on “Congratulations, you unlocked Progress!” on the result: the main menu, Progress ringed by a must-tap box, the only thing that answers (v0.68: left on the result)');
});

/* 68.4 (L15 amended): the walkthrough on a new profile — its second box, about the whole map, at the home spot in the middle of the safe area (v0.68:
   pinned to the bottom edge over the Skill chest); then box 5, the Dots rule, moved off home only as far as it takes to clear the lock popup it is about */
scene('68.4', async (page, browser) => {
  await load(page, { story: 1, gridSeen: 1, snd: 'off', tut: 0, played: 0 }); await show(page, 's-pick'); await sleep(1200);
  say('box 1', await pBox(page, 'Welcome')); await tutTap(page); await sleep(300);
  const b2 = await pBox(page, 'play all'); say('box 2', b2);
  say('home', await page.evaluate(() => { const b = document.querySelector('#tut .tbox').getBoundingClientRect(); return { top: Math.round(b.top), offMiddle: Math.round((b.top + b.bottom) / 2 - (47 + (innerHeight - 34)) / 2) }; }));
  await frame(page, browser, '68.4-map-box-home', 'The walkthrough’s second box, about the whole map: at the home spot in the middle of the safe area, the map dimmed under it (v0.68: pinned to the bottom edge over the Skill chest)');
  await tutTap(page); await sleep(300); say('box 3', await pBox(page, 'locked')); await tutTap(page); await sleep(300);
  say('box 4', await pBox(page, 'Tap a game')); await tutAimTap(page); await sleep(500);
  say('box 5', await pBox(page, 'Wow'));
  say('beside', await page.evaluate(() => { const b = document.querySelector('#tut .tbox').getBoundingClientRect(), l = document.getElementById('lockbox').getBoundingClientRect(); return { box: [Math.round(b.top), Math.round(b.bottom)], lock: [Math.round(l.top), Math.round(l.bottom)] }; }));
  await frame(page, browser, '68.4-box-beside-target', 'Box 5, the Dots rule: its target is the lock popup in the middle, so the box leaves home just far enough to sit beside it, tail pointing at it; the popup is where it always sits (67.1)');
});

/* 68.12: the About tour's videos box, About opened at the top as a player opens it — the game scrolls the list into view as the box comes up (v0.68: an
   arrow down at the list off screen, and the step waiting for him to scroll) */
scene('68.12', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done', about: 2 } });
  await show(page, 's-about'); say('box', await pBox(page, 'Welcome')); await tutTap(page);
  say('box', await pBox(page, 'videos'));
  say('list', await page.evaluate(() => { const r = document.getElementById('msglist').getBoundingClientRect(), s = document.getElementById('s-about'); return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrolled: Math.round(s.scrollTop), arrow: getComputedStyle(document.querySelector('#tut .tarrow')).display }; }));
  await frame(page, browser, '68.12-about-videos', 'About, opened at the top: the game has scrolled the videos into view as the box came up — the list ringed, no arrow, a tap anywhere moves on (v0.68: an arrow at the list off screen, the step waiting for a scroll)');
});

/* 68.5: the walkthrough's "play with a friend" box on the sheet's variant step, ringing the real Solo / With a friend row (v0.68: the row forced onto the
   length step, above Sprint / Dash / Marathon, where no player ever sees it) */
scene('68.5', async (page, browser) => {
  await load(page, { story: 1, gridSeen: 1, snd: 'off', tut: 0, played: 0 }); await show(page, 's-pick'); await sleep(1200);
  for (let i = 0; i < 9; i++) { const b = await pBox(page, '', 6000); if (!b) break; if (/friend/.test(b.text)) { say('box', b); break; } if (b.tap) await tutAimTap(page); else await tutTap(page); await sleep(500); }
  say('sheet', await page.evaluate(() => ({ stage: document.getElementById('sheet').classList.contains('len') ? 'length' : 'variant', row: getComputedStyle(document.getElementById('vs-wrap')).display })));
  await frame(page, browser, '68.5-friend-box', 'The walkthrough’s friend box on the sheet’s variant step, ringing the real With a friend chip — the row every player sees there (v0.68: forced onto the length step)');
});

// a Quick Tap run started from its sheet, `n` lit pads pressed in a row and nothing else, to its result
async function qtRun(page, n) { await runOf(page, 'quick-tap', 0, 0);
  for (let i = 0, k = 0; i < 400 && !(await page.evaluate(() => document.getElementById('s-over').classList.contains('on') && !document.getElementById('game').classList.contains('on'))); i++) {
    await page.evaluate(() => { const a = document.getElementById('adbreak'), b = document.getElementById('adskip'); if (a.classList.contains('on') && !b.disabled) b.click(); });
    if (k < n && await page.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') { const t = document.querySelector('.pad[data-side="' + i + '"]'), r = t.getBoundingClientRect(); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); return true; } return false; })) k++;
    await sleep(60); } await sleep(900); }

/* 68.6: his case — the first run on record missed Dash (its result's boxes done); the SECOND run gets 8 in a row, and its own result says "Great job, you
   unlocked Dash!" with Dash ringed (v0.68: no box on this run) */
scene('68.6', async (page, browser) => {
  const r = { g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 4, misses: 3, v: 4 };
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done' } }, { runs: [r] });
  await qtRun(page, 8);
  for (let i = 0; i < 4; i++) { const b = await pBox(page, '', 4000); if (!b) break; say('box', b.text); if (/unlocked/.test(b.text)) break; await tutTap(page); await sleep(400); }
  await sleep(2500); say('chips', await page.evaluate(() => [...document.querySelectorAll('#over-chips2 .chip')].map(c => c.textContent + ':' + getComputedStyle(c).opacity + ':' + getComputedStyle(c.closest('.change')).opacity + ':' + getComputedStyle(c.closest('.change')).visibility)));
  await frame(page, browser, '68.6-dash-box-second-run', 'The second run’s result (8 in a row, the first run having missed): “Great job, you unlocked Dash!”, Dash ringed, on the result of the run that opened it (v0.68: no box)');
});

/* 68.15: a first result whose run opened Dash and Four, the walkthrough's boxes walked: Try Again, Game Select, THEN "Great job, you unlocked Dash!" —
   the frame is the Dash box, its place in the sequence in the note (v0.68: before the Game Select box) */
scene('68.15', async (page, browser) => {
  const r = { g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 5000, hits: 20, misses: 0, row: 20, v: 4 };
  await load(page, { story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 1, tutRun: r, tuts: { 'unl-quick-tap-two-15': 0, 'unl-quick-tap-four': 0 } }, { runs: [r], unlock: { 'quick-tap:two:15': Date.now(), 'quick-tap:four': Date.now() } });
  const seq = [];
  for (let i = 0; i < 9; i++) { const b = await pBox(page, '', 4000); if (!b) break; seq.push(b.text); if (/unlocked Dash/.test(b.text)) break; await tutTap(page); await sleep(500); }
  say('sequence', seq);
  await frame(page, browser, '68.15-order', 'A first result that opened Dash: box ' + seq.length + ' of the sequence — ' + seq.map((t, i) => (i + 1) + '. ' + t).join(' / ') + ' — the Dash box after “Or return to the games menu” (v0.68: before it)');
});

/* 68.30: the Skill Key tour after Quick Tap's node is tapped — the new box ringing the opened list (Two · Sprint …), before the Skill Chest line and Back */
scene('68.30', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { gkey: 0 }, chests: { games: 1 }, spill: { games: 1 } }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 30, misses: 0, row: 30, v: 4 }] });
  await show(page, 's-key', { tier: 0 }); await sleep(1500);
  for (let i = 0; i < 5; i++) { const b = await pBox(page, '', 5000); if (!b) break; say('box', b.text); if (/Each row/.test(b.text)) break; if (b.tap) await tutAimTap(page); else await tutTap(page); await sleep(600); }
  await frame(page, browser, '68.30-list-box', 'The Skill Key tour after Quick Tap’s node: a box ringing the opened list — each row a target, green cleared — before “Open the Skill Chest …” with Back (v0.68: straight to Back, nothing said about the list)');
});

/* 68.25: the Scores tour on the web — its first ring box, the gold Skill key ring ringed with its value from RADAR */
scene('68.25', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { board: 0 }, rooms: {} }, { runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 30, misses: 0, row: 30, v: 4 }] });
  await show(page, 's-board'); await sleep(900);
  for (let i = 0; i < 4; i++) { const b = await pBox(page, '', 5000); if (!b) break; say('box', b.text); if (/gold ring/.test(b.text)) break; await tutTap(page); await sleep(600); }
  await frame(page, browser, '68.25-scores-ring-box', 'The Scores tour: “The gold ring is the Skill key standard, 100” with the gold ring ringed (the value from RADAR) — one box per ring, then past the edge, a spoke, a game to tap and Overall');
});

/* 68.23: the Testing screen's new rows — a switch per game, mode and length (Estimate switched on), then the menu items and "play this tour" */
scene('68.23', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1 } }, { unlock: { 'dots:blind': Date.now() } });
  await show(page, 's-testing'); await sleep(500);
  await page.evaluate(() => document.querySelector('#dev-unl [data-k="hold:grow"]').click()); await sleep(5200);
  say('switches', await page.evaluate(() => ({ unl: document.querySelectorAll('#dev-unl [data-act="dev-unl"]').length, on: [...document.querySelectorAll('#dev-unl .sel')].map(b => b.dataset.k), menu: document.querySelectorAll('#dev-menu button').length, tours: [...document.querySelectorAll('#dev-tour button')].map(b => b.textContent) })));
  await page.evaluate(() => document.getElementById('dev-unl-hint').scrollIntoView({ block: 'start' })); await sleep(400);
  await frame(page, browser, '68.23-testing-switches', 'Testing: a switch per game, mode and length, each row a game (Estimate’s “the game” switched on, Dots’ Blind on as earned)');
  await page.evaluate(() => document.getElementById('dev-tour').scrollIntoView({ block: 'center' })); await sleep(400);
  await frame(page, browser, '68.23-testing-tours', 'Testing, further down: the menu items’ switches (About on) and the “play this tour” list — About, Progress, Scores, Customise, Skill Key intro, Welcome video');
});

/* =======================================================================================================
   BUILD 69 (FEEDBACK-v37), package P4 — the in-play screens. 390 wide, both safe-area insets.
   ======================================================================================================= */
const RUN69 = { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done', about: 'done', prog: 'done', board: 'done', games: 'done', est: 'done', mini: 'done', mega: 'done' } };
const QT69 = { unlock: { 'quick-tap:two:15': Date.now() }, runs: [{ g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 9, misses: 0, row: 9, v: 4 }] };
const pressLit = page => page.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') { const t = document.querySelector('.pad[data-side="' + i + '"]'), r = t.getBoundingClientRect(); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); return true; } return false; });
scene('68.9', async (page, browser) => {
  await load(page, RUN69, QT69); await runOf(page, 'quick-tap', 0, 1);
  for (let k = 0; k < 5; k++) { await pressLit(page); await sleep(260); }
  say('goal', await page.evaluate(() => { const g = document.getElementById('goal'), b = g.getBoundingClientRect(), p = g.querySelector('.gbar,.gpips'), r = p && p.getBoundingClientRect(); return { text: g.textContent, box: [b.top, b.width].map(Math.round), line: r && [r.top, r.height, r.width].map(Math.round), fill: p && p.querySelector('u')?.style.width }; }));
  await frame(page, browser, '68.9-goal-line', 'Quick Tap Two · Dash, five hits in: the goal’s progress is a thin line along the TOP edge of the goal box, filling from the left; the words have the box to themselves (v0.68: a short bar beside the words, scanned over by them)');
});

const start69 = (page, g, d, s, aim) => page.evaluate(async ([g, d, s, aim]) => { const S = await import('./core/state.js'), RN = await import('./run/run.js'), P = await import('./progress.js');
  if (aim) P.setPendingAim(aim); Object.assign(S.sel, { game: g, diff: d, secs: s, vs: 0, practice: 0 }); RN.start(); }, [g, d, s, aim]);
const goalRead = page => page.evaluate(() => { const t = document.querySelector('#goal > i'); return t ? { text: t.textContent, cls: t.className, anims: t.getAnimations().length, translate: getComputedStyle(t).translate, over: t.scrollWidth - t.clientWidth } : null; });
scene('68.10', async (page, browser) => {
  await load(page, RUN69, QT69); await start69(page, 'quick-tap', 'two', 15, '30 hits');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(50);
  await sleep(400); for (let k = 0; k < 3; k++) { await pressLit(page); await sleep(220); }
  say('goal', await goalRead(page));
  await frame(page, browser, '68.10-goal-still', 'Quick Tap Two · Dash just after Go with a goal that fits: it sits still, no scan class, no animation, through the 3-2-1 and the run');
  await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(400);
  await load(page, RUN69, QT69); await start69(page, 'quick-tap', 'two', 15);
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(50);
  for (let k = 0; k < 4; k++) { await pressLit(page); await sleep(220); }
  say('gover', await page.evaluate(() => { const t = document.querySelector('#goal > i'); return t && { cls: t.className, gover: t.style.getPropertyValue('--gover'), sw: t.scrollWidth, cw: t.clientWidth }; }));
  // the one walk: wait for it to reach its end (the translate is its whole overflow, --gover); no more hits, so the goal is not met and its words stay
  for (let i = 0; i < 120 && !(await page.evaluate(() => { const t = document.querySelector('#goal > i'), m = t && /(-?[\d.]+)px/.exec(getComputedStyle(t).translate || ''); return !t || (m && Math.abs(Math.abs(+m[1]) - parseFloat(t.style.getPropertyValue('--gover') || '0')) <= .3); })); i++) await sleep(150);
  await sleep(500);
  say('goal', await goalRead(page));
  await frame(page, browser, '68.10-long-held', 'A Quick Tap Dash run with a goal still too long for the full-width box: it walked once from the 3-2-1 and now HOLDS AT ITS END, “… → unlocks Quick Tap · Four” readable, through Go and every hit — no restart, no movement while the run is live');
});

/* 68.16: every timed mode with its timer, ~2s left (amber). Quick Tap Two · Dash is Aiden's own case; the rest at Sprint, pass & play at its fixed length */
const pokeDot = page => page.evaluate(() => { const d = document.getElementById('dot'), f = document.getElementById('field'); if (!d.classList.contains('on')) return; const r = d.getBoundingClientRect(); f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); });
scene('68.16', async (page, browser) => {
  const shots = [['quick-tap', 'two', 15, 0, '68.16-quick-tap-ring', 'Quick Tap Two · Dash, 2s left: the ring round the score drains clockwise from 12 o’clock, amber and pulsing for the last 3s; the small clock stays; no line along the bottom of the screen'],
    ['quick-tap', 'four', 5, 0, '68.16-quick-tap-four-ring', 'Quick Tap Four · Sprint, 2s left: the same ring round the score, clear of the upper pads'],
    ['quick-tap', 'two', 5, 1, '68.16-quick-tap-pass-ring', 'Quick Tap pass & play (Player 1’s turn), 2s left: the ring round the score'],
    ['quick-tap', 'four', 5, 1, '68.16-quick-tap-four-pass-ring', 'Quick Tap Four pass & play, 2s left: the ring'],
    ['dots', 'blind', 5, 0, '68.16-dots-bar', 'Dots Blind · Sprint, 2s left: the bar along the bottom edge of the play area, draining from both ends to the middle, amber'],
    ['dots', 'lead', 5, 0, '68.16-dots-lead-bar', 'Dots Lead · Sprint, 2s left: the same bar on the play area’s bottom edge'],
    ['dots', 'blind', 5, 1, '68.16-dots-pass-bar', 'Dots pass & play (Blind), 2s left: the bar'],
    ['dots', 'lead', 5, 1, '68.16-dots-lead-pass-bar', 'Dots Lead pass & play, 2s left: the bar']];
  for (const [g, d, s, vs, name, note] of shots) {
    await load(page, RUN69, QT69);
    await page.evaluate(async ([g, d, s, vs]) => { const S = await import('./core/state.js'), RN = await import('./run/run.js'); Object.assign(S.sel, { game: g, diff: d, secs: s, vs, practice: 0 }); RN.start(); }, [g, d, s, vs]);
    for (let i = 0; i < 80 && !(await page.evaluate(() => document.getElementById('game').classList.contains('live'))); i++) await sleep(50);
    for (let i = 0; i < 400 && (await page.evaluate(() => +document.getElementById('hud-time').textContent)) > 2.05; i++) { await (g === 'dots' ? pokeDot(page) : pressLit(page)); await sleep(240); }
    say('timer', await page.evaluate(() => { const t = document.getElementById('timer'); if (!t) return null; const p = t.querySelector('.tf,i'), r = t.getBoundingClientRect(); return { cls: t.className, host: t.parentElement.id, left: document.getElementById('hud-time').textContent, col: getComputedStyle(p).stroke !== 'none' && t.classList.contains('tring') ? getComputedStyle(p).stroke : getComputedStyle(p).backgroundColor, box: [r.left, r.top, r.width, r.height].map(Math.round), oldBar: !!document.getElementById('bar') }; }));
    await frame(page, browser, name, note);
    await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(500);
  }
});

/* 68.24: a Stopwatch Streak, round 1 tapped near its target, then round 2 mid-attempt (and the same top on Hidden) */
const UNL69 = async page => Object.fromEntries((await page.evaluate(async () => (await import('./config/unlocks.js')).UNLOCKS.map(u => u.key).filter(k => !/^reaction:(flash|nogo)$|^spot:/.test(k)))).map(k => [k, Date.now()]));
const tmTap = (page, early = .25) => page.evaluate(async e => { const TM = (await import('./games/timing/index.js')).default, w = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 2000 && !(TM.st === 'run' && performance.now() - TM.t0 > TM.target * 1000 - e * 1000); i++) await w(10);
  const g = document.getElementById('gen'), r = g.getBoundingClientRect(); g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 20, pointerId: 1 })); }, early);
const topRead = page => page.evaluate(() => { const q = id => document.getElementById(id), v = e => !!e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0;
  return { goal: q('goal').textContent, allow: q('hallow').hidden ? null : q('hallow').textContent, line: q('hud-mode').textContent + ' | ' + q('hud-time').textContent, score: v(q('score')) ? q('score').textContent : '(hidden)', gen: q('gen').textContent.replace(/\s+/g, ' ').trim() }; });
scene('68.24', async (page, browser) => {
  await load(page, RUN69, { unlock: await UNL69(page) }); await start69(page, 'timing', 'stopwatch', -1);
  await tmTap(page); await sleep(3300);
  await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default, w = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 600 && !(TM.st === 'run' && performance.now() - TM.t0 > 2000); i++) await w(10); });
  say('top', await topRead(page));
  await frame(page, browser, '68.24-timing-top', 'Timing · Stopwatch · Streak, round 2 mid-attempt: the goal box; the allowance bar with what is left at its right end; one line “Stopwatch · Streak · Round 2”; TARGET and its figure; nothing under the clock until the tap');
  await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(400);
  await load(page, RUN69, { unlock: await UNL69(page) }); await start69(page, 'timing', 'stopwatch', -1);
  await tmTap(page); await sleep(3300);
  // 68.24 review: the live clock while an attempt runs — it is drawn at full strength for its first 1.5s, then fades (the Stopwatch's own rule)
  await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default, w = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 600 && !(TM.st === 'run' && performance.now() - TM.t0 > 800); i++) await w(10); });
  say('clock', await page.evaluate(() => { const c = document.getElementById('tmclock'); return c && { text: c.textContent, opacity: getComputedStyle(c).opacity, size: getComputedStyle(c).fontSize }; }));
  await frame(page, browser, '68.24-timing-clock', 'The same Stopwatch Streak, round 2, 0.8s into the attempt: the live clock running large between TARGET and “tap to stop the timer” (it fades from 1.5s, the Stopwatch’s own rule, unchanged)');
  await tmTap(page, .2); await sleep(2000);
  say('afterTap', await topRead(page));
  await frame(page, browser, '68.24-timing-tapped', 'The same run after round 2’s tap: the round’s own figure and tier under the clock (never 0.00s), the goal and the game on the same round');
  await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(400);
  await load(page, RUN69, { unlock: await UNL69(page) }); await start69(page, 'timing', 'hidden', -1);
  await sleep(2500); say('hidden', await topRead(page));
  await frame(page, browser, '68.24-hidden-top', 'Timing · Hidden · Streak: the same top — goal, allowance bar with what is left at its end, one line “Hidden · Streak · Round 1”');
});

/* 68.20: one driven Grow Set — the frame is taken mid-hold (the player's shape growing inside the dashed target) on the first triangle of rounds 3–5 and on
   round 6's long thin shape. Every round is played at a fixed skill (released at the target's size × 1.05) */
const growTo = (page, want) => page.evaluate(async want => { const w = ms => new Promise(r => setTimeout(r, ms));
  const HD = (await import('./games/estimate/index.js')).default, G = await import('./config/games.js'), hf = () => document.getElementById('hfield');
  const at = type => { const r = hf().getBoundingClientRect(); hf().dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); };
  const full = () => 1.05 * HD.target / (G.CFG.holdRate * Math.min(innerWidth, innerHeight) / 100) * 1000;
  for (let i = 0; i < 4000; i++) { const gm = document.getElementById('game'); if (!gm.classList.contains('on')) return null;
    if (gm.classList.contains('tapon')) { at('pointerdown'); await w(200); continue; }
    if (HD.st === 'wait') { const hit = HD.round >= want.from && HD.round <= want.to && want.shapes.includes(HD.shape.name);
      at('pointerdown'); if (hit) { await w(full() * .72); return { round: HD.round, shape: HD.shape.name, rot: HD.rot, line: document.getElementById('hud-time').textContent, score: document.getElementById('score').textContent }; }
      await w(full()); at('pointerup'); await w(200); continue; }
    await w(50); } return null; }, want);
const release = page => page.evaluate(() => { const hf = document.getElementById('hfield'), r = hf.getBoundingClientRect(); hf.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 })); });
scene('68.20', async (page, browser) => {
  await load(page, RUN69, { unlock: await UNL69(page) }); await start69(page, 'hold', 'grow', 7);
  const a = await growTo(page, { from: 3, to: 5, shapes: ['triangle'] }); say('round', a);
  await frame(page, browser, '68.20-round-3-tilt', `Estimate · Grow · Set, round ${a && a.round} (step 2 of the ladder): a ${a && a.shape} turned ${a && a.rot}°, the shape you grow wearing the same turn inside the dashed target; the round line “${a && a.line}” with no “same shape”; the big number “${a && a.score}”`);
  await release(page); await sleep(600);
  await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(400);
  // a fresh Set for the second frame: a frame hides the page, and the run pauses and replays its round when it comes back
  await load(page, RUN69, { unlock: await UNL69(page) }); await start69(page, 'hold', 'grow', 7);
  const b = await growTo(page, { from: 6, to: 7, shapes: ['bar', 'wedge'] }); say('round', b);
  await frame(page, browser, '68.20-round-6-thin', `A second driven Set, round ${b && b.round} (the last step): a long thin ${b && b.shape} at a steep ${b && b.rot}°`);
  await release(page); await sleep(400);
  await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(400);
});

// 68.8: ✕ mid-run on Quick Tap — the Abandoned screen
scene('68.8', async (page, browser) => {
  await load(page, RUN69, QT69); await runOf(page, 'quick-tap'); await sleep(600);
  await page.evaluate(() => document.getElementById('quit').click()); await sleep(3400);
  say('lines', await page.evaluate(() => [...document.querySelectorAll('#s-over > *')].filter(e => e.getClientRects().length && getComputedStyle(e).display !== 'none').map(e => e.id + ': ' + e.textContent.trim().slice(0, 30))));
  await frame(page, browser, '68.8-abandoned', 'Exit mid-run: one word, “Abandoned”, mid grey and between the old eyebrow and the old line in size; no dash, no “Run abandoned · nothing saved”; Retry, then Game select (L21)');
});

/* 68.11 (L26): the frame takes the clip's shape — the Welcome clip (portrait) played from About, the Skill chest's clip on its first (full screen)
   viewing, and Gauntlet Mini's 16:9 test card from About; each held once its metadata is in and the power-on has finished */
const clipUp = async page => { await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120; i++) { const v = document.querySelector('#vplay video'); if (v && v.videoWidth) return; await w(50); } }); await sleep(1100);
  return page.evaluate(() => { const h = document.getElementById('vplay'), v = h.querySelector('video'), r = h.querySelector('.vframe').getBoundingClientRect(), f = h.querySelector('.vfoot').getBoundingClientRect();
    return { clip: v ? [v.videoWidth, v.videoHeight] : null, frame: [Math.round(r.width), Math.round(r.height)], top: Math.round(r.top), bottom: Math.round(r.bottom), footTop: Math.round(f.top) }; }); };
scene('68.11', async (page, browser) => {
  await load(page, { ...PLAIN, ...ALL68, gauntSeen: { g1: 1, g2: 1 } }); await show(page, 's-about'); await sleep(700);
  await tap68(page, '#msglist .msgrow[data-msg="intro"]'); say('player', await clipUp(page));
  await frame(page, browser, '68.11-portrait-inset', 'About playing the Welcome clip (portrait 540×960): a tall frame inset 8% a side, no side bars, “tap outside to close” 14px under it (v0.68: a wide 16:9 frame, black bars, the line over Game Select)');
  await page.evaluate(async () => (await import('./ui/video.js')).closeVideo()); await sleep(900);
  await show(page, 's-pick'); await sleep(700);
  await page.evaluate(async () => { const V = await import('./ui/video.js'), M = await import('./config/messages.js'); V.playVideo(M.MESSAGES.find(m => m.by && m.by.chest === 'key'), { full: true }); });
  say('player', await clipUp(page));
  await frame(page, browser, '68.11-portrait-full', 'The Skill chest’s clip on its first viewing, full screen: the portrait picture as wide as the phone and as tall as its shape, no side bars (v0.68: a portrait picture in a landscape frame)');
  await page.evaluate(async () => (await import('./ui/video.js')).closeVideo()); await sleep(900);
  await show(page, 's-about'); await sleep(700);
  await tap68(page, '#msglist .msgrow[data-msg="g1"]'); say('player', await clipUp(page));
  await frame(page, browser, '68.11-landscape-inset', 'About playing Gauntlet Mini’s 16:9 test card: a wide frame inset 8% a side, captions under it, “tap outside to close” under them');
  await page.evaluate(async () => (await import('./ui/video.js')).closeVideo()); await sleep(900);
});

/* 68.17: a first (owed) viewing of the Games chest's clip, full screen over the map, a finger held on the picture and the ring by "Skip" stopped at
   half of PLAYER.skipHold */
scene('68.17', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, chests: { games: 1 }, spill: { games: 1 }, readySeen: { games: 1 }, mustWatch: 'games', msgSeen: {} });
  await show(page, 's-pick'); await sleep(900);
  await page.evaluate(async () => { const V = await import('./ui/video.js'), M = await import('./config/messages.js'); V.playVideo(M.MESSAGES.find(m => m.id === 'games'), { full: true }); });
  await clipUp(page);
  const half = (await import('../config/messages.js')).PLAYER.skipHold / 2;
  await page.mouse.move(195, 420); await page.mouse.down(); await sleep(60);
  say('ring', await page.evaluate(ms => { const c = document.querySelector('#vplay .vrfill'); for (const a of c.getAnimations()) { a.pause(); a.currentTime = ms; }
    const s = document.querySelector('#vplay .vskip').getBoundingClientRect(), f = document.querySelector('#vplay .vframe').getBoundingClientRect();
    return { fill: +(1 - parseFloat(getComputedStyle(c).strokeDashoffset)).toFixed(2), skipTop: Math.round(s.top), frameBottom: Math.round(f.bottom), ih: innerHeight }; }, half));
  await frame(page, browser, '68.17-skip-ring-half', 'The Games chest’s clip on its first viewing, full screen: a finger held on the picture, the ring by “Skip” half full (it empties if the finger lifts, and a tap does nothing)');
  await page.mouse.up(); await sleep(1200);
  await page.evaluate(async () => (await import('./ui/video.js')).closeVideo()); await sleep(900);
});

/* 68.38: About as the picks page mocked it — four of eight open (Welcome, the Games, Skill and Pro chests' clips), the Pro one unwatched; then scrolled
   to its foot if it does not fit */
scene('68.38', async (page, browser) => {
  await load(page, { ...PLAIN, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done', about: 'done' }, chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 },
    readySeen: { games: 1, key: 1, pro: 1 }, msgSeen: { intro: 1, games: 1, skill: 1 } }, { unlock: { 'dots:blind': 1, 'dots:lead': 1 } });
  await show(page, 's-about'); await sleep(900);
  const fit = await page.evaluate(() => { const s = document.getElementById('s-about'); return { scrollH: s.scrollHeight, h: s.clientHeight, label: document.getElementById('msg-lede').textContent,
    rows: [...document.querySelectorAll('#msglist .msgrow')].map(r => r.dataset.msg + (r.classList.contains('locked') ? ' (locked)' : r.classList.contains('unwatched') ? ' (unwatched)' : '')) }; });
  say('about', fit);
  await frame(page, browser, '68.38-about', 'About rebuilt as mocked: NO EXCUSES and its one line, “Messages · 4 of 8”, compact rows (tall frames for the portrait clips, a clean play mark, the Pro clip pulsing, locked titles struck through in red with how they open), ONE support box, the version line; no perk rows, no “No ads, ever.”, no Send feedback');
  if (fit.scrollH > fit.h + 4) { await page.evaluate(() => { const s = document.getElementById('s-about'); s.scrollTop = s.scrollHeight; }); await sleep(500);
    await frame(page, browser, '68.38-about-foot', 'About scrolled to its foot: the support box and the version line'); }
});

// 68.1 / 68.2: the web is the only game picker — Scores opens on the game played last (Quick Tap), its title, its mode and length chips and its top 10
// under the web; then a tap on Dots' name on the web picks Dots
scene('68.1', async (page, browser) => {
  const now = Date.now(), qt = [13, 11, 9, 12, 7].map((h, i) => ({ t: now - (i + 1) * 3600000, g: 'quick-tap', d: 'two', s: 5, hits: h, misses: 2, v: 4 }));
  await load(page, { ...OPEN, welcomeSeen: 1, name: 'AIDEN' }, { runs: [...qt, { t: now - 9 * 3600000, g: 'dots', d: 'blind', s: 5, hits: 6, misses: 0, v: 4 }] });
  await show(page, 's-board'); await sleep(1600);
  const read = () => page.evaluate(() => { const s = document.getElementById('s-board'); return { title: document.getElementById('bd-title').textContent, d: document.getElementById('bd-d').textContent, s: document.getElementById('bd-s').textContent,
    rows: document.querySelectorAll('#runs tr').length, gRow: !!document.getElementById('bd-g'), detail: !!document.getElementById('radar-detail'), scrollH: s.scrollHeight, h: s.clientHeight }; });
  const a = await read(); say('scores', a);
  await frame(page, browser, '68.1-scores', `Scores opens on the game played last: Quick Tap picked on the web (its point and name lit), "${a.title.trim()}" as the title under Overall, its TWO / FOUR and SPRINT / DASH / MARATHON chips, then its top 10 — no game chip row, no detail card`);
  if (a.scrollH > a.h + 4) { await page.evaluate(() => { const s = document.getElementById('s-board'); s.scrollTop = s.scrollHeight; }); await sleep(500);
    await frame(page, browser, '68.1-scores-foot', 'Scores scrolled to its foot: the top 10 table'); await page.evaluate(() => { document.getElementById('s-board').scrollTop = 0; }); await sleep(300); }
  const p = await page.evaluate(() => { const t = document.querySelector('#radar text[data-g="dots"]'), r = t.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.click(p[0], p[1]); await sleep(700);
  const b = await read(); say('picked', b);
  await frame(page, browser, '68.1-scores-dots', `A tap on Dots' name on the web picks it: "${b.title.trim()}" as the title, its Blind / Lead chips and its top 10`);
});

// 68.26: a game's score is the average over every mode and length in it, unplayed counting zero; Overall the average of all seven games — Quick Tap
// with every Skill bar met (each combination on its bar, from config/key-bars.js) and nothing else played: Quick Tap 100, the rest 0, Overall 14
scene('68.26', async (page, browser) => {
  await load(page); const keys = await page.evaluate(async () => (await import('./progress/key.js')).COMBOS.filter(c => c.g === 'quick-tap').map(c => c.key));
  const runs = await barRuns(page, Object.fromEntries(keys.map(k => [k, 'clear'])));
  await load(page, { ...OPEN, welcomeSeen: 1, name: 'AIDEN' }, { runs }); await show(page, 's-board'); await sleep(1600);
  const r = await page.evaluate(() => ({ labels: [...document.querySelectorAll('#radar text')].map(t => t.textContent), all: document.getElementById('radar-all').textContent, title: document.getElementById('bd-title').textContent })); say('chart', r);
  await frame(page, browser, '68.26-overall', `Scores with Quick Tap fully met (all ${keys.length} of its Skill bars) and nothing else played: "${r.title.trim()}" on its spoke, every other game 0, "${r.all.trim()}" (100 ÷ 7)`);
});

const want = ARGV.filter((a, i) => !a.startsWith('--') && !(i > 0 && ARGV[i - 1] === '--out'));
for (const name of (want.length ? want : Object.keys(SCENES))) {
  if (!SCENES[name]) { console.log('no scene "' + name + '"'); continue; }
  console.log('\n' + name);
  await SCENES[name](page, browser);
}

// build 64: a run of some scenes keeps the rows an earlier run of OTHER scenes wrote to the same folder (one item per commit)
const MF = path.join(OUT, 'manifest.json'), prior = fs.existsSync(MF) ? (JSON.parse(fs.readFileSync(MF, 'utf8')).frames || []) : [];
const frames = prior.filter(r => !manifest.some(m => m.frame === r.frame)).concat(manifest);
fs.writeFileSync(MF, JSON.stringify({ sab: SAB, when: new Date().toISOString(), pageErrors: errs, frames }, null, 2));
if (errs.length) console.log('\nPAGE ERRORS\n  ' + errs.join('\n  '));
console.log('\n' + manifest.length + ' frames → ' + path.relative(ROOT, OUT));
await browser.close(); srv.close();
