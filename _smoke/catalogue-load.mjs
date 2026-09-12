/* No Excuses — load the built review catalogue headless once and report page errors (the build-28 trap: the template has
   JavaScript in it, and a ReferenceError there renders three cards as nothing and is seen by nobody). Run after any
   `npm run review` that follows a template change:   node _smoke/catalogue-load.mjs
   Build 32 also counts the key section's rows and their three tier inputs (B.27). */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './chrome.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '..', '..', '_review', 'catalogue.html');
const browser = await launch();
const page = await browser.newPage();
const errors = [], logs = [];
page.on('pageerror', e => errors.push(String(e && e.message || e)));
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 120000 });
await new Promise(r => setTimeout(r, 4000));
const seen = await page.evaluate(() => ({
  cards: document.querySelectorAll('figure.card').length,
  kbRows: document.querySelectorAll('.kb-r:not(.kb-hd)').length,
  clear: document.querySelectorAll('input[id^="kbi-"]').length, pro: document.querySelectorAll('input[id^="kbp-"]').length, author: document.querySelectorAll('input[id^="kba-"]').length,
  strip: (document.querySelector('.kb-strip') || {}).textContent, animCards: document.querySelectorAll('.anim').length,
  achRows: document.querySelectorAll('#ach-host .arow, #ach-host li, #ach-host tr').length }));
await browser.close();
console.log(JSON.stringify({ file, errors, consoleErrors: logs.slice(0, 10), ...seen }, null, 1));
if (errors.length) { console.log('CATALOGUE LOAD: PAGE ERRORS'); process.exit(1); }
console.log('CATALOGUE LOAD: clean');
