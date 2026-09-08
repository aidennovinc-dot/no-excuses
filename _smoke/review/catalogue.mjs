/* No Excuses — the screen catalogue for Cowork's review (build 14). Puppeteer-core port of ../_review/scripts/catalogue.mjs.
   Spawns its own server, drives the build through every screen at 390x844, screenshots each one, and writes
   ../_review/catalogue.html from ../_review/scripts/catalogue.template.html + catalogue.annotations.json.
   Shots land in ../_review/_build/shots/. Not published from here — Cowork publishes the page.   npm run review */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';
import { launch, phonePage, IGNORED_REQUEST } from '../chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.resolve(here, '../../../_review');
const SCRIPTS = path.join(REVIEW, 'scripts');
const OUT = path.join(REVIEW, '_build', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const srv = await serve();
const BASE = process.argv[2] || srv.base;
const browser = await launch();
const page = await phonePage(browser, 1);
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => { if (!IGNORED_REQUEST(r.url())) errors.push('requestfailed: ' + r.url()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name); };
const click = async (sel) => page.evaluate(s => document.querySelector(s)?.click(), sel);
const on = () => page.$eval('.screen.on', s => s.id).catch(() => null);

await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500); await shot('01-title');
for (let i = 0; i < 8 && (await page.evaluate(() => document.querySelector('#s-menu').classList.contains('story'))); i++) { await page.evaluate(() => document.body.click()); await sleep(350); }
await sleep(600); await shot('02-menu-fresh');
await click('[data-go="s-pick"]'); await sleep(500); await shot('03-grid-fresh');
await click('.tile[data-game="quick-tap"]'); await sleep(500); await shot('04-sheet-mode');
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(400); await shot('05-sheet-length');
// locked length tap -> lock box
await page.evaluate(() => { const b = [...document.querySelectorAll('#time-row .tbtn')].find(x => x.classList.contains('locked')); b && b.click(); }); await sleep(400); await shot('06-lockbox');
await click('#lock-no'); await sleep(200);
// all open
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ne')); Object.assign(s.prefs, { allOpen: true, story: 1, gridSeen: 1, name: 'AIDEN' }); localStorage.setItem('ne', JSON.stringify(s)); });   // build 18: one key
await page.reload({ waitUntil: 'networkidle0' }); await sleep(600); await shot('07-menu-open');
await click('[data-go="s-pick"]'); await sleep(500); await shot('08-grid-open');
await click('.tile[data-game="dots"]'); await sleep(400);
await page.evaluate(() => document.querySelector('[data-vs="1"]')?.click()); await sleep(400); await shot('09-sheet-friend');
await page.evaluate(() => document.querySelector('[data-vs2="2"]')?.click()); await sleep(400); await shot('10-sheet-versus');
await page.evaluate(() => document.querySelector('[data-vs="0"]')?.click()); await sleep(200); await click('#grid'); await sleep(200);
for (const g of ['hold', 'sequence', 'timing', 'reaction', 'spot']) {
  await click(`.tile[data-game="${g}"]`); await sleep(400);
  await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(350);
  await shot(`11-sheet-${g}`);
  await click('#grid'); await sleep(200);
}
await sleep(300); await click('.back'); await sleep(400);
for (const s of ['s-board', 's-ach', 's-custom', 's-about']) { await click(`[data-go="${s}"]`); await sleep(600); await shot(`12-${s}`); await click('.back'); await sleep(300); }
// a quick tap run: capture the countdown and mid-run, then result
await click('[data-go="s-pick"]'); await sleep(300); await click('.tile[data-game="quick-tap"]'); await sleep(300);
await page.evaluate(() => document.querySelector('#diff-row').children[0].click()); await sleep(250);
await page.evaluate(() => document.querySelector('#time-row').children[0].click()); await sleep(250);
await click('#go-btn'); await sleep(900); await shot('13-countdown');
await sleep(2600);
const deadline = Date.now() + 12000; let taps = 0, midShot = false;
while (Date.now() < deadline) {
  if ((await on()) === 's-over') break;
  const side = await page.evaluate(() => { for (let i = 0; i < 4; i++) { const s = document.getElementById('sq' + i); if (s && s.style.getPropertyValue('--v').trim() === '1') return i; } return -1; });
  if (side >= 0) { await page.evaluate(i => { document.querySelector(`.pad[data-side="${i}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }, side); taps++; if (taps === 3 && !midShot) { midShot = true; await shot('14-run-quicktap'); } }
  await sleep(45);
}
await sleep(1200); await shot('15-result');
await page.evaluate(() => window.scrollTo(0, 9999)); await page.evaluate(() => document.querySelector('#s-over').scrollTo(0, 9999)); await sleep(300); await shot('16-result-scrolled');
// other games mid-run (just the first ~1.5s)
for (const g of ['dots', 'hold', 'sequence', 'timing', 'reaction', 'spot']) {
  await click('#over-back'); await sleep(300); await click('#grid'); await sleep(200);
  await click(`.tile[data-game="${g}"]`); await sleep(350);
  await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click()); await sleep(250);
  await page.evaluate(() => document.querySelector('#time-row').children[0]?.click()); await sleep(250);
  await click('#go-btn'); await sleep(4200); await shot(`17-run-${g}`);
  await click('#quit'); await sleep(400);
  if ((await on()) !== 's-over') { await click('[data-go="s-pick"]'); await sleep(200); }
}
console.log('errors', errors);
await browser.close(); srv.close();

// ---- build the page: ../_review/scripts/build-catalogue.mjs, inlined so one command does the lot ----
const ann = JSON.parse(fs.readFileSync(path.join(SCRIPTS, 'catalogue.annotations.json'), 'utf8'));
const cards = ann.map((a, i) => { const img = fs.readFileSync(path.join(OUT, a.shot + '.png')).toString('base64');
  return `<figure class="card" id="${a.shot}"><div class="ph"><img src="data:image/png;base64,${img}" alt="${a.title}" loading="lazy"></div>
<figcaption><div class="n">${String(i + 1).padStart(2, '0')}</div><h3>${a.title}</h3>
<dl><dt>DOM</dt><dd class="mono">${a.dom}</dd><dt>Code</dt><dd class="mono">${a.code}</dd><dt>Bound to</dt><dd>${a.bound}</dd></dl><p>${a.note}</p></figcaption></figure>`; });
const tpl = fs.readFileSync(path.join(SCRIPTS, 'catalogue.template.html'), 'utf8');
const out = path.join(REVIEW, 'catalogue.html');
fs.writeFileSync(out, tpl.replace('__CARDS__', JSON.stringify(cards).replace(/<\//g, '<\\/')));
console.log('wrote', out, cards.length, 'cards');
process.exit(errors.length ? 1 : 0);
