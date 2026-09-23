/* ---- v28 item 7 (build 53): EVERY QUICK TAP AND DOTS MODE SHOWS ITS FIRST TARGET DURING THE COUNTDOWN, the way Dots - Lead has since build 26.
   NO EXCEPTIONS: Blind means no LEAD ring, not no dot ("Tap the dots as they appear"), and Quick Tap has only Two and Four - "Eyes shut" is an
   achievement, not a mode. Driven: a run of each of the four is started and the field read on the last beat of the 3-2-1, before Go. The target
   must also be the one the run starts on, so it cannot move out from under the player, and nothing may be tappable yet. ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sleep, ok, bad, read, boot, page, until, OPEN_PREFS, SEEN_INTRO, up } from '../lib/gate.mjs';

export const SECTION = ["pick sheets (all unlocked)"];

export async function run() {
  const seen7 = [];
  for (const [g, d] of [['quick-tap', 'two'], ['quick-tap', 'four'], ['dots', 'blind'], ['dots', 'lead']]) {
    // SEEN_INTRO, or the first-play ghost demo runs for three seconds before the countdown and the read lands inside it
    await boot({ ...OPEN_PREFS, played: 1, snd: 'off' });
    await page.evaluate(async (g, d) => { const R = await import('./ui/router.js'); R.show('s-pick', { g, d, s: 5 }); }, g, d);
    await sleep(700);
    /* build 61: THE PAGE READS ITS OWN BEATS. Until build 60 the driver slept 600ms ("two of the three countdown steps in") and 900ms
       ("past Go") and read the field — a guess that held only because a real driver is slow. The page now samples the field on every
       frame while the "1" is up (the beat precount() deals the target on, CFG.countStep × 2) and keeps the LAST sample before Go, then
       reads it again 150ms after Go. */
    await page.evaluate(g => { const c = document.getElementById('count'), w = window.__c7 = { mid: null, after: null };
      const read = () => g === 'quick-tap'
        ? [0, 1, 2, 3].map(i => +getComputedStyle(document.getElementById('sq' + i)).getPropertyValue('--v') > .5).indexOf(true)
        : (document.getElementById('dot').classList.contains('on') ? document.getElementById('dot').style.transform : '');
      // sampled on a 5ms timer, not per frame: the "1" is one countStep long, and on a loaded machine frames can be sparser than that
      let one = false;
      const tick = setInterval(() => { const on = c.classList.contains('on');
        if (on && c.textContent.trim() === '1') { one = true; w.mid = { lit: read() }; }
        if (one && !on) { clearInterval(tick); setTimeout(() => { w.after = g === 'quick-tap' ? read() : document.getElementById('dot').style.transform; }, 150); } }, 5); }, g);
    await page.evaluate(() => { const b = document.querySelector('[data-act="go-btn"]'); if (b) b.click(); });
    await until(() => window.__c7.after !== null);
    const { mid, after } = await page.evaluate(() => window.__c7);
    seen7.push({ g, d, shown: g === 'quick-tap' ? mid.lit >= 0 : !!mid.lit, same: String(mid.lit) === String(after), mid: mid.lit, after });
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); }); await sleep(300);
  }
  (seen7.every(x => x.shown && x.same))
    ? ok(`v28 item 7 every Quick Tap and Dots mode shows its first target during the countdown, and it is the target the run starts on: ${seen7.map(x => x.g + ' - ' + x.d).join(' - ')}. No exceptions: Blind hides the LEAD ring, not the dot, and Quick Tap has no eyes-shut mode`)
    : bad('v28 item 7 the first target during the countdown', JSON.stringify(seen7));
}
