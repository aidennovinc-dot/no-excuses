/* build-13 review pack (FEEDBACK-v13 14.1): twelve 390x844 shots on a fresh profile, composed into one contact sheet PNG.
   node _smoke/contact.mjs http://localhost:8123 ../_review/build-13.png */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = resolve(process.argv[3] || '../_review/build-13.png');
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shots = [];
const shot = async label => { shots.push({ label, data: await p.screenshot({ encoding: 'base64' }) }); console.log('  shot ' + shots.length + ' · ' + label); };
const fresh = async prefs => { await p.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); await p.evaluate(x => { localStorage.clear(); if (x) localStorage.setItem('ne.prefs', JSON.stringify(x)); }, prefs || null); await p.reload({ waitUntil: 'networkidle0' }); await sleep(400); };

// ---- 1-7: the real first-run experience, nothing unlocked ----
await fresh(null);
await sleep(4900); await shot('1 · title sequence');                       // the wordmark has landed
for (let i = 0; i < 8 && (await p.$eval('.screen.on', s => s.id)) === 's-story'; i++) { await p.evaluate(() => document.body.click()); await sleep(320); }
await sleep(1600); await shot('2 · menu · Next achievement');
await p.evaluate(() => document.querySelector('[data-go="s-pick"]').click()); await sleep(1400); await shot('3 · Play grid · tiles white, padlocks');
await p.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(500); await shot('4 · Quick Tap sheet · Solo');
await p.evaluate(() => document.querySelector('#vs-row [data-vs="1"]').click()); await sleep(600); await shot('5 · same sheet · With a friend');
await p.evaluate(() => document.querySelector('#vs-row [data-vs="0"]').click()); await sleep(300);
await p.evaluate(() => document.querySelector('#diff-row .choice').click()); await sleep(300);
await p.evaluate(() => document.querySelector('#time-row .tbtn').click()); await sleep(200);
await p.evaluate(() => document.querySelector('#go-btn').click());
await sleep(7000);   // past the first-play demo and the 3-2-1
for (let i = 0; i < 14; i++) { const s = await p.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') return i; return -1; }); if (s >= 0) await p.evaluate(i => document.querySelector(`.pad[data-side="${i}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), s); await sleep(120); }
await shot('6 · mid-run · Quick Tap');
const end = Date.now() + 25000;
while (Date.now() < end && (await p.$eval('.screen.on', s => s.id).catch(() => '')) !== 's-over') { const s = await p.evaluate(() => { for (let i = 0; i < 4; i++) if (document.getElementById('sq' + i)?.style.getPropertyValue('--v').trim() === '1') return i; return -1; }); if (s >= 0) await p.evaluate(i => document.querySelector(`.pad[data-side="${i}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), s); await sleep(90); }
await sleep(3200); await shot('7 · result screen');

// ---- 8-12: everything open, so the later screens have something on them ----
await fresh({ allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off' });
await p.evaluate(() => document.querySelector('[data-go="s-pick"]').click()); await sleep(400);
await p.evaluate(() => document.querySelector('.tile[data-game="hold"]').click()); await sleep(320);
await p.evaluate(() => document.querySelector('#diff-row .choice').click()); await sleep(500); await shot('8 · Estimate sheet · Set / Streak');
await p.evaluate(() => document.querySelector('#grid').click()); await sleep(300);
await p.evaluate(() => document.querySelector('.tile[data-game="spot"]').click()); await sleep(320);
await p.evaluate(() => document.querySelector('#diff-row .choice').click()); await sleep(500); await shot('9 · Spot sheet · Count');
await fresh({ allOpen: true, story: 1, gridSeen: 1, played: 1, snd: 'off' });
await p.evaluate(() => document.querySelector('[data-go="s-ach"]').click()); await sleep(700); await shot('10 · Achievements · Unlocks / Pro / Author / Secret');
await p.evaluate(() => document.querySelector('.screen.on .back').click()); await sleep(300);
await p.evaluate(() => document.querySelector('[data-go="s-custom"]').click()); await sleep(800); await shot('11 · Customise');
await p.evaluate(() => document.querySelector('.screen.on .back').click()); await sleep(300);
await p.evaluate(() => document.querySelector('[data-go="s-about"]').click()); await sleep(600); await shot('12 · About · supporter block');

// ---- compose ----
const cols = 4, cw = 390, ch = 844, gap = 18, lab = 26, pad = 26;
const W = pad * 2 + cols * cw + (cols - 1) * gap, rows = Math.ceil(shots.length / cols);
const H = pad * 2 + 46 + rows * (ch + lab + gap);
const html = `<style>body{margin:0;background:#14151a;font:500 15px system-ui;color:#E8E6E1;width:${W}px}
h1{font:700 22px system-ui;letter-spacing:.16em;text-transform:uppercase;padding:${pad}px ${pad}px 8px;margin:0}
.g{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:${gap}px;padding:0 ${pad}px ${pad}px}
figure{margin:0}figcaption{font:600 13px ui-monospace,monospace;letter-spacing:.06em;color:#9a9892;padding:6px 2px;height:${lab}px}
img{width:${cw}px;height:${ch}px;display:block;border:1px solid #2a2b31}</style>
<h1>No Excuses · build 13 · review contact sheet · 2026-09-05</h1><div class="g">` +
  shots.map(s => `<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.data}"></figure>`).join('') + '</div>';
const q = await b.newPage();
await q.setViewport({ width: W, height: Math.min(H, 30000), deviceScaleFactor: .5 });
await q.setContent(html, { waitUntil: 'load' });
await sleep(600);
mkdirSync(dirname(OUT), { recursive: true });
const png = await q.screenshot({ fullPage: true });
writeFileSync(OUT, png);
await b.close();
console.log('\nwrote ' + OUT + ' · ' + Math.round(png.length / 1024) + 'KB · ' + shots.length + ' shots');
