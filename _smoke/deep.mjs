/* build-13 deep drive: every mode and length, one reload each, poked the way that mode is actually played.
   Not part of the gate — a scratch harness kept next to it. node _smoke/deep.mjs */
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:8123';
const errors = [];
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('version.json')) errors.push('console: ' + m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const screen = () => p.$eval('.screen.on', s => s.id).catch(() => 'in-game');

const down = async (sel, dx = .5, dy = .5) => p.evaluate((s, dx, dy) => {
  const t = document.querySelector(s); if (!t) return false; const r = t.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: r.left + r.width * dx, clientY: r.top + r.height * dy, pointerId: 1 };
  t.dispatchEvent(new PointerEvent('pointerdown', o)); return true;
}, sel, dx, dy);
const up = async (sel, dx = .5, dy = .5) => p.evaluate((s, dx, dy) => {
  const t = document.querySelector(s); if (!t) return false; const r = t.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: r.left + r.width * dx, clientY: r.top + r.height * dy, pointerId: 1 };
  t.dispatchEvent(new PointerEvent('pointerup', o)); return true;
}, sel, dx, dy);
const move = async (sel, dx, dy) => p.evaluate((s, dx, dy) => {
  const t = document.querySelector(s); if (!t) return; const r = t.getBoundingClientRect();
  t.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: r.left + r.width * dx, clientY: r.top + r.height * dy, pointerId: 1 }));
}, sel, dx, dy);

async function poke(g) {
  if (g === 'quick-tap') { const i = await p.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') return i; return -1; }); if (i >= 0) await down(`.pad[data-side="${i}"]`); return; }
  if (g === 'dots') { await p.evaluate(() => { const d = document.getElementById('dot'), f = document.getElementById('field'); const r = d.getBoundingClientRect(); f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }); return; }
  if (g === 'hold') {
    const cut = await p.evaluate(() => document.getElementById('game').dataset.d === 'cut');
    if (cut) { await down('#hfield', .1, .55); await move('#hfield', .5, .6); await move('#hfield', .9, .65); await up('#hfield', .9, .65); }
    else { await down('#hfield'); await sleep(360); await up('#hfield'); }
    return; }
  if (g === 'sequence') { await p.evaluate(() => { const k = document.querySelector('.key'); if (k) k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); return; }
  if (g === 'spot') {
    const num = await p.evaluate(() => { const b = document.querySelector('#gen [data-num="3"]'); if (!b) return false; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 })); return true; });
    if (num) return;
    // Find: sweep the crowd, one shape at a time
    await p.evaluate(() => { const els = [...document.querySelectorAll('#gen .fs')]; const gen = document.getElementById('gen');
      for (const el of els.slice(0, 6)) { const r = el.getBoundingClientRect(); gen.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); } });
    return; }
  await down('#gen'); // timing, reaction
}

const CASES = [];
for (const [g, modes, lens] of [['quick-tap', 2, 3], ['dots', 2, 3], ['hold', 2, 2], ['sequence', 1, 3], ['timing', 2, 2], ['reaction', 2, 2], ['spot', 2, 2]])
  for (let m = 0; m < modes; m++) for (let l = 0; l < lens; l++) CASES.push([g, m, l]);

for (const [g, mi, li] of CASES) {
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.setItem('ne.prefs', JSON.stringify({ allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} })));
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(320);
  await p.evaluate(() => document.querySelector('[data-go="s-pick"]').click()); await sleep(260);
  await p.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g); await sleep(260);
  await p.evaluate(mi => { const c = document.querySelectorAll('#diff-row .choice'); (c[mi] || c[0]).click(); }, mi); await sleep(240);
  await p.evaluate(li => { const t = document.querySelectorAll('#time-row .tbtn'); (t[li] || t[0]).click(); }, li); await sleep(160);
  const face = await p.evaluate(() => ({ mode: document.querySelector('#diff-row .choice.sel .txt b')?.textContent, len: document.querySelector('#time-row .tbtn.sel b')?.textContent.trim(), sub: document.querySelector('#time-row .tbtn.sel .lsub')?.textContent || '' }));
  await p.evaluate(() => document.querySelector('#go-btn').click());
  await sleep(5200);
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && (await screen()) === 'in-game') { await poke(g); await sleep(160); }
  const on = await screen();
  const res = on === 's-over' ? await p.evaluate(() => ({ score: document.querySelector('#over-score').textContent.trim(), stats: document.querySelector('#over-stats').textContent.trim() })) : {};
  console.log(`${(g + ' m' + mi + ' l' + li).padEnd(16)} ${face.mode || '-'} / ${face.len} ${face.sub ? '(' + face.sub + ')' : ''} -> ${on} ${res.score ? '· score ' + res.score + ' · ' + res.stats : ''}`);
}
await b.close();
console.log('\nERRORS (' + errors.length + '):'); for (const e of [...new Set(errors)]) console.log('  ' + e);
