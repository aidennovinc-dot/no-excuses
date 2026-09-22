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
  for (const k of ['spot', 'spot:find', 'spot:count', 'timing', 'timing:hidden', 'hold', 'hold:grow', 'reaction', 'reaction:flash']) SS.store.intro[k] = Date.now();
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

const want = ARGV.filter((a, i) => !a.startsWith('--') && !(i > 0 && ARGV[i - 1] === '--out'));
for (const name of (want.length ? want : Object.keys(SCENES))) {
  if (!SCENES[name]) { console.log('no scene "' + name + '"'); continue; }
  console.log('\n' + name);
  await SCENES[name](page, browser);
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ sab: SAB, when: new Date().toISOString(), pageErrors: errs, frames: manifest }, null, 2));
if (errs.length) console.log('\nPAGE ERRORS\n  ' + errs.join('\n  '));
console.log('\n' + manifest.length + ' frames → ' + path.relative(ROOT, OUT));
await browser.close(); srv.close();
