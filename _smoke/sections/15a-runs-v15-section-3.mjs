// build 61: part 1 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, fail, sleep, names, check, ok, bad, root, read, at, page, onScreen, click, setStorage, verdict, clearHeld, poke, clearReady, openSheet } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  const css = read('styles', 'app.css');

  /* ---- v30 (59.4, build 59): NO DIRECTION WORD AFTER A ROUND, IN ANY GAME ----
     Aiden, on a Timing · Hidden round reading "44MS · Great! · EARLY": "we don't need late or early after a user finishes a round. In this
     one it says great, that's all we need ... it doesn't need to be told whether it's early or late. This should apply to all games." The
     direction is already on screen as a PICTURE in every game that had one — the ghost ball against the marker, your shape against the dashed
     target — so the word repeated it and made a good round read like a correction.
     Two games printed one and they are the two driven here: Timing's early / late and Estimate's too much / too little. The check plays a real
     round of each MODE and reads the round line off the screen, because the item says to find every APPENDER rather than blank the strings —
     a string left in config with a caller still on it would pass a config test and fail on the phone. The separator is asserted gone too
     ("not left dangling"), and the figure and the tier's own name are asserted still there, because 59.4 keeps both. */
  {
    const DIRW = await (async () => { const C = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
      return { timing: [C.TIMING.early, C.TIMING.late], est: [C.ESTIMATE.much, C.ESTIMATE.little], tiers: (await import(pathToFileURL(path.join(root, 'config', 'verdicts.js')).href)).VERDICT_TIERS.map(t => t.name) }; })();
    /* `clearReady` first, then poke: a fresh profile shows each game's one-line intro and ends it on "Ready?", and a driver that
       only pokes the playing field waits out the whole run on that screen. `clearHeld` is deliberately NOT called — it taps the
       round card away, and the round card is the thing being read. The line is read off its own HOST, not off the figure: the
       tier's word is a SIBLING of `<b id="hpct">`, so reading the figure's element would report a line with no verdict in it. */
    const lineOf = async (g, mi, sel) => {
      await openSheet(g, mi, 0);
      await click('#go-btn');
      for (let i = 0; i < 160; i++) {
        if (!(await clearReady(g))) await poke(g);
        await sleep(130);
        const txt = await page.evaluate(s => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
        if (txt) return txt;
        if ((await onScreen()) === 's-over') return '';
      }
      return '';
    };
    const lines = {};
    lines['timing:stopwatch'] = await lineOf('timing', 0, '#tmres');
    lines['timing:hidden'] = await lineOf('timing', 1, '#tmres');
    lines['hold:grow'] = await lineOf('hold', 0, '#hres');
    lines['hold:cut'] = await lineOf('hold', 1, '#hres');
    const got = Object.entries(lines).filter(([, v]) => v);
    const words = k => k.startsWith('timing') ? DIRW.timing : DIRW.est;
    const noDir = got.every(([k, v]) => !words(k).some(w => w && new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(v)));
    // "not left dangling": no round line ends on the separator, and none carries an empty one
    const noDangle = got.every(([, v]) => !/·\s*$/.test(v) && !/·\s*·/.test(v));
    // KEEP: the figure and the verdict word. Every line still carries a number, and a judged one still names its tier
    const keptFigure = got.every(([, v]) => /\d/.test(v));
    const keptVerdict = got.some(([, v]) => DIRW.tiers.some(n => v.includes(n)));
    (got.length === 4 && noDir && noDangle && keptFigure && keptVerdict)
      ? ok(`v30 59.4 no direction word after a round, every game and mode: ${got.map(([k, v]) => k + ' "' + v + '"').join(' · ')} — none of ${[...DIRW.timing, ...DIRW.est].join(' / ')}, no separator left dangling, and the figure and the tier's own name both kept`)
      : bad('v30 59.4 the direction word after a round', JSON.stringify({ lines, noDir, noDangle, keptFigure, keptVerdict }));
  }
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  // 3.12: a glow, not a solid line. The old rule is the thing that must be gone, so test for its absence too
  { const rule = (css.match(/#game\.pturn::after\{[^}]*\}/) || [''])[0];
    const glow = /box-shadow:\s*inset/.test(rule), solid = /border:\s*\d+px solid/.test(rule);
    (glow && !solid) ? ok('3.12 the pass & play outline is a glow, not a solid line') : bad('3.12 the pass & play outline', `glow ${glow} · still a solid border ${solid}`); }
  // 3.11 / L4: the two halves must resolve to DIFFERENT colours. Both lit the same before, which is the one thing L4 exists to stop
  { const p1 = /#game\.versus \.vhalf\.p1 \.sq\{--sq-live:var\(--p1\)\}/.test(css), p2 = /#game\.versus \.vhalf\.p2 \.sq\{--sq-live:var\(--p2\)\}/.test(css);
    (p1 && p2) ? ok('3.11 / L4 the lit versus square takes the tapping player\'s colour — P1 red, P2 light blue') : bad('3.11 versus square colours', `p1 ${p1} · p2 ${p2}`); }
  // 3.3: the outline is lifted over the fill at the reveal only — a permanent lift would change the hold as well
  { const rev = /#hfield\.rev #hg\{z-index:\d+\}/.test(css);
    rev ? ok('3.3 the target outline sits over your shape at the round result') : bad('3.3 the target outline at the reveal', 'no #hfield.rev #hg rule'); }

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  const S3 = await page.evaluate(async () => {
    const out = {};
    const HD = (await import('./games/estimate/index.js')).default;
    const RX = (await import('./games/reaction/index.js')).default;
    const TM = (await import('./games/timing/index.js')).default;
    const { ESTIMATE, STREAK } = await import('./config/games.js');
    const v = Math.min(innerWidth, innerHeight) / 100;
    // 3.1: no Grow target lands under the floor, at any shape. Measured in vmin², which is the point of the item —
    // a raw-pixel floor would mean something different on every screen
    let worst = Infinity;
    // AMENDED at build 50 (v26 §B2): the shape comes from the dealer by round now, so each of the 4,000 rounds gets a fresh dealer at a round of a Set
    const DL = await import('./games/_shared/deal.js'); HD.two = { on: false };
    for (let i = 0; i < 4000; i++) { HD.dealer = DL.makeDealer('hold:grow'); HD.round = 1 + i % 7; HD.shape = HD.pickTarget(); const t = HD.growTarget() * v; worst = Math.min(worst, HD.shape.coef * t * t / (v * v)); }
    out.floor = { want: ESTIMATE.MIN_AREA, worst: Math.round(worst), px: Math.round(ESTIMATE.MIN_AREA * v * v) };
    // 3.5: Flash's third currency, held apart from the other two exactly as C.1-C.3 hold theirs apart
    out.flash = { early: RX.FLASH_EARLY, free: RX.FLASH_FREE, bud: RX.FLASH_BUD, nogoFree: RX.NOGO_FREE, nogoWrong: RX.NOGO_WRONG_STREAK };
    // 3.8: 25 seconds, 30 once round 10 is passed, and Hidden's 100px untouched
    TM.ctx = { mode: 'stopwatch', len: STREAK };
    TM.round = 1; const b1 = TM.budget(), t1 = TM.budTxt();
    TM.round = 11; const b2 = TM.budget();
    TM.ctx = { mode: 'hidden', len: STREAK }; const bh = TM.budget();
    out.stopwatch = { early: b1, late: b2, hidden: bh, txt: t1 };
    // 3.8: the Streak's targets climb; the SET's exact-mean deal is untouched (6.18 checks that separately)
    TM.ctx = { mode: 'stopwatch', len: STREAK };
    out.ramp = [1, 2, 5, 10, 20].map(r => TM.rampAt(r));
    // answer 2, the ceiling Aiden asked for: at the largest target the vmin clamp bites first, so 600% is unreachable
    const pctAt = t => { const cap = Math.min(t * 2.8, 96); return (cap / t) ** 2 * 100 - 100; };
    out.ceiling = { small: Math.round(pctAt(ESTIMATE.TMIN)), large: Math.round(pctAt(ESTIMATE.TMAX)), crossover: +(96 / Math.sqrt(7)).toFixed(1) };
    return out; });
  { const f = S3.floor;
    (f.worst >= f.want) ? ok(`3.1 every Grow target clears the ${f.want} vmin² floor (${f.px} px² here) — smallest dealt in 4,000 rounds was ${f.worst} vmin²`)
      : bad('3.1 the Grow minimum shape size', `floor ${f.want} vmin², smallest dealt ${f.worst} vmin²`); }
  { const f = S3.flash;
    // AMENDED at build 32 (v19 C.5): the Go / No-go gate is 180 now; Flash's three numbers and the Streak's wrong-tap cost did not move
    // AMENDED at build 44 (v24 F.1, L5 amended at Aiden's request): Flash's Streak budget is 1000
    (f.early === 400 && f.free === 150 && f.bud === 1000 && f.nogoFree === 180 && f.nogoWrong === 200)
      ? ok('3.5 / L5 an early Flash tap spends 400ms, held apart from Flash 1000/150 (v24 F.1) and Go / No-go 3000 over the 180ms gate / 200')
      : bad('3.5 the Flash early-tap penalty', JSON.stringify(f)); }
  /* v18 (B.3a / B.4, L5) retunes both budgets v15 3.8 set. Stopwatch is 5s / 7.5s, not 25 / 30 - the 25 existed to let a
     run survive two ordinary attempts against a FLAT 7s target, and B.3b's targets climb a whole second a round instead.
     Hidden's is 700ms, not 100px: the ball crosses #gen in the same time on every phone and in a very different number
     of pixels, and 700 is 100px converted at the measured pace and rounded to a hundred. */
  { const s = S3.stopwatch;
    (s.early === 5 && s.late === 7.5 && s.hidden === 700 && s.txt === '5.00s')
      ? ok('B.3a / B.4 / L5 the Stopwatch Streak budget is 5s, 7.5s past round 10; Hidden is 700ms and the screen says so')
      : bad('B.3a / B.4 the Streak budgets', JSON.stringify(s)); }

  /* ---- v31 (60.28, build 60): AIDEN'S AD RULES OF 2026-09-18, ALL FIVE ----
     The app honoured ONE of them (supporters) and showed a break every FOURTH result, while telling the player in a caption that
     it did. The caption is gone — the app does not explain its own ad policy — and so is the dashed banner on the result screen,
     because the only ad this game has is the interstitial. The five rules are driven against `Ads.show`, which is the whole
     policy in one place, at the boundaries of each. */
  { const r = S3.ramp, climbs = r.every((x, i) => !i || x > r[i - 1] - 0.9), low = r[0] < 4, high = r[4] > 7;
    (climbs && low && high) ? ok(`3.8 Stopwatch Streak targets climb — rounds 1/2/5/10/20 dealt ${r.join('s · ')}s`)
      : bad('3.8 the Stopwatch Streak ramp', JSON.stringify(r)); }
  // the finding behind Greedy's rewrite, asserted so it cannot quietly go back to a % threshold
  { const c = S3.ceiling;
    (c.large < 600 && c.small >= 600) ? ok(`3.x Greedy: a maxed hold reaches ${c.small}% off on the smallest target but only ${c.large}% on the largest (96vmin bites above ${c.crossover} vmin) — which is why the test is the cap, not a percentage`)
      : bad('the Greedy ceiling', JSON.stringify(c)); }
}
