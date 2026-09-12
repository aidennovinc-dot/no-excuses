/* No Excuses — one place that knows where Chrome is and how the gate launches it (build 14).
   CHROME_PATH wins; the Windows default is the fallback. A missing binary fails loudly, not with a puppeteer stack. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function launch() {
  if (!fs.existsSync(CHROME)) { console.error(`No Chrome at ${CHROME} — set CHROME_PATH`); process.exit(2); }
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-sandbox'] });
}

// the phone the gate pretends to be
export async function phonePage(browser, deviceScaleFactor = 2) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor, isMobile: true, hasTouch: true });
  return page;
}

/* requests the gate is allowed to see fail: the update poll, and nothing else. Google Fonts was on this list until
   build 33 — v18 (B.32) self-hosts the three families, so a request to either font host is now a REGRESSION rather
   than a tolerated failure, and FONT_HOST is what the build-33 assertion counts. */
export const IGNORED_REQUEST = u => u.includes('version.json');
export const FONT_HOST = u => u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com');
