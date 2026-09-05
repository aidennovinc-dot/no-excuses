/* No Excuses — the gate. Run before every push.
 *
 *   cd site && python -m http.server 8123 &      (modules need http, not file://)
 *   node _smoke/smoke.mjs http://localhost:8123
 *
 * Needs puppeteer-core and a local Chrome:  npm i puppeteer-core
 * Checks, at 390x844 with zero uncaught errors:
 *   intro -> menu -> every pick sheet opens -> one full Quick Tap run -> result screen.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:8123';
const CHROME = process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const GAMES = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
const errors = [];
const fail = [];
const ok = (label) => console.log('  ok   ' + label);
const bad = (label, why) => { fail.push(label + (why ? ' — ' + why : '')); console.log('  FAIL ' + label + (why ? ' — ' + why : '')); };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => {
  const u = r.url();
  if (u.includes('version.json')) return;            // polled with no-store; offline is fine
  errors.push('requestfailed: ' + u + ' ' + (r.failure()?.errorText || ''));
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const onScreen = () => page.$eval('.screen.on', s => s.id).catch(() => null);

// ---- 1. cold start: intro plays, then the menu ----
console.log('\ncold start (empty storage)');
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
await sleep(400);
let at = await onScreen();
at === 's-story' ? ok('intro screen shows') : bad('intro screen shows', 'on ' + at);
for (let i = 0; i < 8 && (await onScreen()) === 's-story'; i++) {
  await page.evaluate(() => document.body.click());
  await sleep(350);
}
at = await onScreen();
at === 's-menu' ? ok('intro leads to the menu') : bad('intro leads to the menu', 'on ' + at);

// ---- 2. everything unlocked, so every pick sheet can be opened ----
console.log('\npick sheets (all unlocked)');
await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('ne.prefs') || '{}');
  p.allOpen = true; p.story = 1; p.gridSeen = 1;
  localStorage.setItem('ne.prefs', JSON.stringify(p));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(400);
await page.evaluate(() => document.querySelector('[data-go="s-pick"]').click());
await sleep(400);
(await onScreen()) === 's-pick' ? ok('Play opens the grid') : bad('Play opens the grid');

for (const g of GAMES) {
  await page.evaluate(g => document.querySelector(`.tile[data-game="${g}"]`).click(), g);
  await sleep(320);
  // the sheet shows the mode row first; the lengths fill in once a mode is picked
  await page.evaluate(() => document.querySelector('#diff-row').children[0]?.click());
  await sleep(280);
  const state = await page.evaluate(() => ({
    screen: document.querySelector('.screen.on')?.id,
    modes: document.querySelector('#diff-row').children.length,
    lens: document.querySelector('#time-row').children.length,
    title: document.querySelector('#sheet-title').textContent.trim(),
  }));
  (state.screen === 's-pick' && state.modes > 0 && state.lens > 0)
    ? ok(`${g} sheet — ${state.modes} mode(s), ${state.lens} length(s) · "${state.title}"`)
    : bad(`${g} sheet`, JSON.stringify(state));
  await page.evaluate(() => document.querySelector('#grid').click());
  await sleep(200);
}

// ---- 3. one full Quick Tap run, to the result screen ----
console.log('\none full Quick Tap run');
await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click());
await sleep(300);
await page.evaluate(() => {           // Two - Sprint: the first mode, the first length
  document.querySelector('#diff-row').children[0].click();
});
await sleep(250);
await page.evaluate(() => document.querySelector('#time-row').children[0].click());
await sleep(250);
await page.evaluate(() => document.querySelector('#go-btn').click());
ok('run started');

const deadline = Date.now() + 30000;
let taps = 0;
while (Date.now() < deadline) {
  if ((await onScreen()) === 's-over') break;
  const side = await page.evaluate(() => {
    for (let i = 0; i < 4; i++) {
      const s = document.getElementById('sq' + i);
      if (s && s.style.getPropertyValue('--v').trim() === '1') return i;
    }
    return -1;
  });
  if (side >= 0) {
    await page.evaluate(i => {
      const pad = document.querySelector(`.pad[data-side="${i}"]`);
      pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    }, side);
    taps++;
  }
  await sleep(45);
}
at = await onScreen();
at === 's-over' ? ok(`result screen reached after ${taps} taps`) : bad('result screen reached', 'on ' + at);

if (at === 's-over') {
  const res = await page.evaluate(() => ({
    score: document.querySelector('#over-score').textContent.trim(),
    verdict: document.querySelector('#verdict').textContent.trim(),
    stats: document.querySelector('#over-stats').textContent.trim().slice(0, 60),
  }));
  res.score ? ok(`score "${res.score}" · ${res.verdict} · ${res.stats}`) : bad('result screen has a score');
}

// ---- 4. verdict ----
await browser.close();
console.log('\n' + '-'.repeat(60));
if (errors.length) {
  console.log('UNCAUGHT ERRORS (' + errors.length + '):');
  for (const e of [...new Set(errors)]) console.log('  ' + e);
}
if (fail.length) console.log('FAILED CHECKS:\n  ' + fail.join('\n  '));
const pass = !errors.length && !fail.length;
console.log(pass ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
process.exit(pass ? 0 : 1);
