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

// requests the gate is allowed to see fail: the update poll (no-store, offline is fine) and, for now, Google Fonts (S4 bundles them in Stage 5)
export const IGNORED_REQUEST = u => u.includes('version.json') || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com');
