/* No Excuses — how loud a track actually is (v17 B.27, build 30). A tool, not a gate step.
   `node _smoke/loudness.mjs` renders every track — and the flow layer over each of the two games that can raise it —
   offline in the same headless Chromium the gate drives, high-passes at 220 Hz (a phone speaker reproduces almost
   nothing under that, so unweighted RMS flatters a sub every time) and reports the loudest 4-second window in dBFS.

   It exists because B.27 asked a question no one in a Claude Code session can answer by listening: is the flow hum
   audible OVER the music, or is it a stem nobody will ever hear? The proposal's FLOW_STEM measured 20.6 dB under Held
   and 21.7 dB under Waltz — inaudible on a phone — and `vol` in config/audio.js is the number this script sets.
   Re-run it whenever a track's gains change; the numbers in FEATURES.md came from here. */
import { launch, phonePage } from './chrome.mjs';
import { serve } from './server.mjs';

const srv = await serve();
const browser = await launch();
const page = await phonePage(browser);
await page.goto(srv.base + '/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));

const rows = await page.evaluate(async () => {
  const M = await import('./audio.js'); const A = await import('./config/audio.js');
  const SR = 24000, WIN = 4;
  // one plan rendered offline, exactly the way audio.js schedules it: attack, optional hold, exponential release, optional lowpass
  async function render(plan, secs) {
    const ctx = new OfflineAudioContext(1, Math.ceil(SR * secs), SR);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220; hp.Q.value = .7; hp.connect(ctx.destination);
    for (const [at, f0, f1, ms, w, g, am, lp, q, hold] of plan) {
      if (at > secs) continue;
      const dur = Math.min(ms / 1000, secs - at), o = ctx.createOscillator(), gn = ctx.createGain();
      if (dur <= .02) continue;
      o.type = w; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur);
      const atk = Math.min(dur * .95, Math.max(4, am) / 1000);
      gn.gain.setValueAtTime(.0001, at); gn.gain.exponentialRampToValueAtTime(Math.max(.00011, g), at + atk);
      if (hold > 0) gn.gain.setValueAtTime(Math.max(.00011, g), Math.max(at + atk, at + dur * hold));
      gn.gain.exponentialRampToValueAtTime(.0001, at + dur);
      let n = o; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = q || .7; o.connect(f); n = f; }
      n.connect(gn).connect(hp); o.start(at); o.stop(at + dur);
    }
    const buf = await ctx.startRendering(), d = buf.getChannelData(0);
    // loudest WIN seconds, stepped a tenth of a second at a time
    const w = Math.min(d.length, SR * WIN); let best = 0;
    for (let s = 0; s + w <= d.length; s += SR / 10) { let sum = 0; for (let i = s; i < s + w; i++) sum += d[i] * d[i];
      best = Math.max(best, Math.sqrt(sum / w)); }
    if (!best) { let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i]; best = Math.sqrt(sum / Math.max(1, d.length)); }
    return 20 * Math.log10(best || 1e-9);
  }
  const out = [];
  for (const id of Object.keys(A.TRACKS)) { const q = M.Music.plan(id); if (!q) continue;
    out.push({ id, name: q.name, kind: 'track', db: +(await render(q.plan, Math.min(30, q.loopSec))).toFixed(1), sec: q.loopSec }); }
  for (const g of ['quick-tap', 'dots']) { const q = M.Music.plan(g, { flow: 1 }); if (!q) continue;
    out.push({ id: 'flow over ' + g, name: q.name, kind: 'flow', db: +(await render(q.plan, Math.min(30, q.loopSec))).toFixed(1), sec: q.loopSec }); }
  return out;
});

const by = Object.fromEntries(rows.map(r => [r.id, r]));
console.log('\nloudest 4s window, 220Hz high-passed, dBFS — one written pass of each track\n');
for (const r of rows.filter(r => r.kind === 'track')) console.log(' ', r.id.padEnd(20), String(r.db).padStart(7), 'dB', ' (' + r.sec + 's)');
console.log('\nflow layer, and what it sits at against the track it rides on:\n');
for (const g of ['quick-tap', 'dots']) {
  const f = by['flow over ' + g], t = rows.find(r => r.kind === 'track' && r.id.startsWith(g + ':'));
  const pick = rows.find(r => r.kind === 'track' && r.id === g + ':' + ({ 'quick-tap': 'held', dots: 'waltz' })[g]) || t;
  const d = +(f.db - pick.db).toFixed(1);
  console.log(' ', g.padEnd(10), 'flow', String(f.db).padStart(7), 'dB vs', pick.id, String(pick.db).padStart(7), 'dB  →', (d > 0 ? '+' : '') + d, 'dB',
    ' (' + Math.round(Math.pow(10, d / 20) * 100) + '% of the track; 40% = -8.0 dB)');
}
console.log('');
await browser.close(); srv.close();
