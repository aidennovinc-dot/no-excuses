/* No Excuses — computed-style diff between two stylesheets (build 18, refactor stage 4). A tool, not part of npm test.
 *   node _smoke/cssdiff.mjs <a.css> <b.css>
 * One tab, driven through every screen and a moment of every game. At each state the page's stylesheet is swapped in place
 * — A, then B, then A again — and getComputedStyle of every element (and its ::before / ::after) is compared. Same DOM, same
 * instant, so what differs is the cascade, which is the one thing a CSS reorganisation can break. A state where the two A
 * snapshots differ (something moved between them) is retried, then reported as unstable and not counted. Animations are paused
 * and the page's timers and animation frames are held while the snapshots are taken, so nothing moves under them. Only the screen that is
 * on (and the game layer, when it is) is compared — every screen is visited. Exit 1 on any differing property. */
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './server.mjs';
import { launch, IGNORED_REQUEST } from './chrome.mjs';

const [A, B] = [process.argv[2], process.argv[3]].map(p => p && path.resolve(p));
if (!A || !B) { console.error('usage: node _smoke/cssdiff.mjs <a.css> <b.css>'); process.exit(2); }
const CSS = { A: fs.readFileSync(A, 'utf8'), B: fs.readFileSync(B, 'utf8') };
const srv = await serve(); const BASE = srv.base;
const browser = await launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('requestfailed', r => { if (!IGNORED_REQUEST(r.url())) console.log('requestfailed', r.url()); });
// from the first paint of every navigation: no stylesheet link (both sheets are injected as <style> and toggled), animations frozen
await page.evaluateOnNewDocument((a, b) => {
  // a hold on timers and frames: while frozen, timeouts and frames queue and run on release; interval ticks are dropped
  const o = { st: window.setTimeout, si: window.setInterval, raf: window.requestAnimationFrame }; let frozen = false, q = [];
  window.__freeze = v => { frozen = v; if (!v) { const run = q; q = []; run.forEach(f => f()); } };
  window.setTimeout = (f, ms, ...a) => o.st.call(window, () => { if (frozen) q.push(() => f(...a)); else f(...a); }, ms);
  window.setInterval = (f, ms, ...a) => o.si.call(window, () => { if (!frozen) f(...a); }, ms);
  window.requestAnimationFrame = f => o.raf.call(window, t => { if (frozen) q.push(() => f(performance.now())); else f(t); });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('link[href="styles/app.css"]')?.remove();
    for (const [id, css] of [['cssA', a], ['cssB', b]]) { const st = document.createElement('style'); st.id = id; st.textContent = css; st.disabled = id === 'cssB'; document.head.appendChild(st); }
    const fz = document.createElement('style'); fz.id = 'freeze'; fz.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}'; document.head.appendChild(fz);
  });
}, CSS.A, CSS.B);
const goto = async (qs = '') => { await page.goto(BASE + '/index.html' + qs, { waitUntil: 'networkidle0' }); };
const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
const setNe = patch => page.evaluate(patch => { const s = JSON.parse(localStorage.getItem('ne') || '{"v":1,"prefs":{}}'); Object.assign(s.prefs, patch); localStorage.setItem('ne', JSON.stringify(s)); }, patch);
const pause = () => page.evaluate(() => window.__freeze(true));
const resume = () => page.evaluate(() => window.__freeze(false));
const use = which => page.evaluate(w => { document.getElementById('cssA').disabled = w !== 'A'; document.getElementById('cssB').disabled = w !== 'B'; void document.body.offsetHeight; }, which);

// one snapshot: path → [hash(main), hash(::before), hash(::after)]; inline-set properties skipped; entries sorted (custom properties enumerate in declaration order)
const snap = () => page.evaluate(() => {
  const h = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return x; };
  const pathOf = el => { const parts = []; while (el && el.nodeType === 1) { const tag = el.tagName.toLowerCase(); if (el.id) { parts.unshift(tag + '#' + el.id); break; } let i = 1, s = el; while ((s = s.previousElementSibling)) i++; parts.unshift(tag + ':' + i); el = el.parentElement; } return parts.join('>'); };
  const out = {};
  for (const el of document.querySelectorAll('*')) { if (el.tagName === 'STYLE') continue; const sc = el.closest('.screen, #game'); if (sc && !sc.classList.contains('on')) continue; const res = [];
    for (const pe of [null, '::before', '::after']) { const cs = getComputedStyle(el, pe); const kv = []; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (!pe && el.style.getPropertyValue(k)) continue; kv.push(k + ':' + cs.getPropertyValue(k)); } kv.sort(); res.push(h(kv.join(';'))); }
    out[pathOf(el)] = res; }
  return out;
});
const detail = (pth, pe) => page.evaluate((pth, pe) => {
  const pathOf = el => { const parts = []; while (el && el.nodeType === 1) { const tag = el.tagName.toLowerCase(); if (el.id) { parts.unshift(tag + '#' + el.id); break; } let i = 1, s = el; while ((s = s.previousElementSibling)) i++; parts.unshift(tag + ':' + i); el = el.parentElement; } return parts.join('>'); };
  const el = [...document.querySelectorAll('*')].find(e => pathOf(e) === pth); if (!el) return null;
  const cs = getComputedStyle(el, pe || null); const o = {}; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (!pe && el.style.getPropertyValue(k)) continue; o[k] = cs.getPropertyValue(k); } return o;
}, pth, pe);

let diffs = 0, states = 0, unstable = 0;
async function compare(name) {
  const same = (x, y) => Object.keys(x).length === Object.keys(y).length && Object.keys(x).every(k => k in y && x[k].every((v, i) => v === y[k][i]));
  let a1, b, a2;
  for (let attempt = 0; attempt < 3; attempt++) { await pause(); await use('A'); a1 = await snap(); await use('B'); b = await snap(); await use('A'); a2 = await snap(); if (same(a1, a2)) break; await resume(); await sleep(150); a1 = null; }
  if (!a1) { unstable++; console.log(`skip ${name} — the page moved between snapshots three times (unstable state, not compared)`); return; }
  states++; let n = 0;
  for (const k of Object.keys(a1)) { if (!(k in b)) continue;
    for (let i = 0; i < 3; i++) if (a1[k][i] !== b[k][i]) { n++; if (n <= 8) { const pe = [null, '::before', '::after'][i]; await use('A'); const da = await detail(k, pe); await use('B'); const db = await detail(k, pe); await use('A');
      const props = da && db ? Object.keys(da).filter(x => da[x] !== db[x]).slice(0, 5).map(x => `${x}: ${da[x]} → ${db[x]}`) : ['?']; console.log(`  DIFF ${k}${pe || ''}  ${props.join(' | ')}`); } } }
  diffs += n; await resume();
  console.log(`${n ? 'DIFF' : 'same'} ${name} — ${Object.keys(a1).length} elements${n ? `, ${n} differing` : ''}`);
}

// ---- the states ----
await goto(); await page.evaluate(() => localStorage.clear()); await goto(); await sleep(600);
await compare('title');
for (let i = 0; i < 8; i++) { await page.evaluate(() => document.body.click()); await sleep(300); }
await sleep(500); await compare('menu · fresh');
await click('[data-go="s-pick"]'); await sleep(600); await compare('grid · fresh');
await click('.tile[data-game="quick-tap"]'); await sleep(400); await compare('sheet · mode');
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(400); await compare('sheet · length');
await page.evaluate(() => { const b = [...document.querySelectorAll('#time-row .tbtn')].find(x => x.classList.contains('locked')); b && b.click(); }); await sleep(400); await compare('lock box');
await click('#lock-no'); await sleep(300);
await setNe({ allOpen: true, story: 1, gridSeen: 1, name: 'AIDEN', snd: 'off' }); await goto(); await sleep(600); await compare('menu · open');
// build 33 (B.31): Customise is the middle tab of s-prog, so the walk opens the screen and taps the tab
for (const s of ['s-board', 's-ach', 's-prog', 's-about']) { await click(`[data-go="${s}"]`); await sleep(700); await compare(s); if (s === 's-prog') { await click('#prog-tabs [data-tab="cus"]'); await sleep(400); await compare('customise'); await click('#c-sq button[data-v="wheel"]'); await sleep(400); await compare('wheel'); await click('#wheel-done'); await sleep(300); for (const g of ['dots', 'hold', 'sequence', 'timing', 'reaction', 'spot']) { await click(`#pv-g [data-v="${g}"]`); await sleep(400); await compare(`customise · ${g}`); } } await click('.back'); await sleep(500); }
await click('[data-go="s-pick"]'); await sleep(500); await click('.tile[data-game="dots"]'); await sleep(400);
await click('[data-vs="1"]'); await sleep(400); await compare('sheet · friend');
await click('[data-vs2="2"]'); await sleep(400); await compare('sheet · versus');
await click('[data-vs="0"]'); await sleep(300);
for (const g of ['hold', 'sequence', 'timing', 'reaction', 'spot']) { await click('#grid'); await sleep(300); await click(`.tile[data-game="${g}"]`); await sleep(400); await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(400); await compare(`sheet · ${g}`); await page.evaluate(() => document.querySelector('#diff-row').children[1]?.click()); await sleep(400); await compare(`sheet · ${g} · mode 2`); }
// a moment of every game and mode: the intro / countdown, then live
for (const g of ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot']) {
  for (const mi of [0, 1]) {
    await click('#grid'); await sleep(300); await click(`.tile[data-game="${g}"]`); await sleep(400);
    const has = await page.evaluate(mi => !!document.querySelector('#diff-row').children[mi], mi); if (!has) continue;
    await page.evaluate(mi => document.querySelector('#diff-row').children[mi].click(), mi); await sleep(300);
    await page.evaluate(() => document.querySelector('#time-row').children[0]?.click()); await sleep(300);
    await click('#go-btn'); await sleep(900); await compare(`${g} · ${mi ? 'mode 2' : 'mode 1'} · intro / countdown`);
    await sleep(3000); await compare(`${g} · ${mi ? 'mode 2' : 'mode 1'} · live`);
    await click('#quit'); await sleep(500);
  }
}
// quick tap to the result (the fourth result carries the ad break), the result scrolled, a toast
await setNe({ adRuns: 3 }); await goto(); await sleep(500);
await click('[data-go="s-pick"]'); await sleep(400); await click('.tile[data-game="quick-tap"]'); await sleep(400);
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(300); await page.evaluate(() => document.querySelector('#time-row').children[0].click()); await sleep(300);
await click('#go-btn');
const tapLit = () => page.evaluate(() => { for (let i = 0; i < 4; i++) { const s = document.getElementById('sq' + i); if (s && s.style.getPropertyValue('--v').trim() === '1') { document.querySelector(`.pad[data-side="${i}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); return; } } });
let deadline = Date.now() + 15000;
while (Date.now() < deadline) { if (await page.$eval('#adbreak', a => a.classList.contains('on')).catch(() => false)) break; await tapLit(); await sleep(60); }
await sleep(300); await compare('ad break');
await sleep(2300); await click('#adskip'); await sleep(900); await compare('result');
await page.evaluate(() => document.querySelector('#s-over').scrollTo(0, 9999)); await sleep(300); await compare('result · scrolled');
await click('#over-back'); await sleep(400); await click('#s-pick .back'); await sleep(400); await click('[data-go="s-about"]'); await sleep(400); await click('#dev-sup'); await sleep(200); await compare('toast'); await click('#dev-sup'); await sleep(2500);
// pass & play: the hand-over screen and the paired result; then versus, live
await click('.back'); await sleep(400); await click('[data-go="s-pick"]'); await sleep(400); await click('.tile[data-game="quick-tap"]'); await sleep(400);
await click('[data-vs="1"]'); await sleep(300); await click('[data-vs2="1"]'); await sleep(300);
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(300); await click('#go-btn');
for (const stop of ['s-pass', 's-over']) { const dl = Date.now() + 20000; while (Date.now() < dl) { const at = await page.$eval('.screen.on', s => s.id).catch(() => null); if (at === stop) break; await tapLit(); await sleep(60); } await sleep(600); await compare(stop === 's-pass' ? 'pass' : 'result · pair'); if (stop === 's-pass') await click('#pass-go'); }
await click('#over-back'); await sleep(400); await click('[data-vs="1"]'); await sleep(200); await click('[data-vs2="2"]'); await sleep(300); await click('#go-btn'); await sleep(3800); await compare('versus · live'); await click('#quit'); await sleep(300);

await browser.close(); srv.close();
console.log(`\n${states} states compared, ${unstable} unstable and skipped · ${diffs ? diffs + ' DIFFERING PROPERTIES' : 'no differences'}`);
process.exit(diffs ? 1 : 0);
