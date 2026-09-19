/* scratch probe — not part of the gate, deleted before the push */
import { serve } from './server.mjs';
import { launch, phonePage } from './chrome.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = await serve(); const browser = await launch(); const page = await phonePage(browser);
await page.goto(srv.base + '/index.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
console.log(JSON.stringify(await page.evaluate(() => {
  const mk = (fam, ls) => { const s = document.createElement('span');
    s.style.cssText = `position:fixed;left:-9999px;white-space:nowrap;font-family:${fam};font-weight:700;letter-spacing:${ls};font-size:100px`;
    s.textContent = 'Congratulations'; document.body.appendChild(s);
    const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 100) / 100; };
  const title = getComputedStyle(document.documentElement).getPropertyValue('--title').trim();
  return { title, ratioAt100: mk('var(--title)', '.02em'), archivo: mk('var(--display)', '.02em'),
    loaded: [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status) };
}), null, 1));
await browser.close(); srv.close();
