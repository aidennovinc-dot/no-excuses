// build 61: part 3 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, CLOCK, sleep, names, part, check, ok, bad, read, at, page, until, down, up, verdict } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  { const hdAll = [];
    for (const W of [375, 390, 430]) {
      await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await sleep(200);
      const rows60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
        const SS = await import('./core/store.js');
        for (const k of ['timing', 'timing:stopwatch', 'hold', 'hold:grow', 'reaction', 'reaction:flash', 'spot', 'spot:count', 'sequence', 'sequence:solo', 'quick-tap', 'quick-tap:two', 'dots', 'dots:blind']) SS.store.intro[k] = Date.now();
        SS.save();
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const box = sel => { const e = document.querySelector(sel); if (!e) return null;
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null;
          return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        const out = [];
        for (const [g, d, secs] of [['timing', 'stopwatch', -1], ['hold', 'grow', -1], ['reaction', 'flash', 5], ['spot', 'count', 10], ['quick-tap', 'two', 15], ['dots', 'blind', 15], ['sequence', 'solo', 3]]) {
          Object.assign(ST.sel, { vs: 0, practice: 0, game: g, diff: d, secs }); RUN.start();
          for (let i = 0; i < 300 && !document.getElementById('game').classList.contains('live'); i++) await wait(40);
          await wait(650);
          const rows = { goal: box('#goal'), mode: box('#hud-mode'), count: box('#hud-time'), score: box('#score'), best: box('#pbghost') };
          const names = Object.keys(rows), clash = [];
          const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
            if (names[i] === 'mode' && names[j] === 'count') continue;
            if (hit(rows[names[i]], rows[names[j]])) clash.push(names[i] + '/' + names[j]); }
          const shown = names.filter(n => rows[n]);
          out.push({ game: g + ':' + d, clash, shown: shown.length,
            order: shown.slice().sort((a, b) => rows[a].y - rows[b].y).join('>'),
            scoreOff: rows.score ? Math.round(Math.abs((rows.score.x + rows.score.w / 2) - document.documentElement.clientWidth / 2)) : null,
            aboveGap: rows.score && rows.count ? Math.round(rows.score.y - (rows.count.y + rows.count.h)) : null });
          RUN.abort(); await wait(320);
        }
        return out; });
      rows60.forEach(r => hdAll.push(Object.assign({ w: W }, r)));
    }
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await sleep(200);
    /* a row that is not there is simply absent — Estimate’s Grow has no goal on a fresh profile, and Quick Tap solo hides
       #score behind its own big count (`bigc`). The rule is the ORDER of whatever is shown, not that all five are. */
    const RANK60 = { goal: 0, mode: 1, count: 1, score: 2, best: 3 };
    const inOrder = o => { const seq = o.split('>').map(k => RANK60[k]); return seq.every((v, i) => !i || v >= seq[i - 1]); };
    const hdBad = hdAll.filter(r => r.clash.length || r.scoreOff > 2 || (r.aboveGap !== null && r.aboveGap < 0) || !inOrder(r.order));
    hdBad.length === 0
      ? ok(`60.19 the run's header is four rows in flow and nothing shares a line with the big score — ${hdAll.length} readings (7 game / mode pairs × 375, 390 and 430 wide): every one is goal, then the mode-and-count row, then the score, with no box touching any other and the score centred to within ${Math.max(...hdAll.map(r => r.scoreOff))}px`)
      : bad('60.19 the run header', JSON.stringify(hdBad.slice(0, 6))); }

  /* ---- v31 (60.18, build 60): ONE ALLOWANCE-STREAK ROUND SCREEN, AND THE HEADER THAT HAD LOST ITS BUDGET ----
     Flash read verdict, big time, "BASELINE 150 MS", "+0 MS", "TOTAL 398 OF 1000 MS" — three lines of small caps about one
     budget. The block is now the one Grow and Hidden use. The header bug is its own fact and its own check: REACTION.hudStreak is
     'attempt {n} · {over} of {bud}ms' and hud() passed no {bud}, so between rounds it read "attempt 1 · 398 of ms" — the DRAIN's
     call passed it, which is why only the line between rounds was broken. Both are driven on a real attempt. */
  { const fl60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'); SS.store.intro['reaction'] = SS.store.intro['reaction:flash'] = Date.now(); SS.save();
      const RX = (await import('./games/reaction/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'reaction', diff: 'flash', secs: -1 }); RUN.start();
      for (let i = 0; i < 600 && !(RX.st === 'go' && RX.armed); i++) await wait(50);
      RX.onDown({ type: 'down', t: RX.t0 + 420 });
      await wait(120);
      const card = document.querySelector('.rxmsg');
      const out = { headerBeforeDrain: document.getElementById('hud-time').textContent.trim(),
        blocks: card ? [...card.children].map(e => e.className || e.tagName.toLowerCase()) : null,
        hasBaselineLine: !!card && /baseline/i.test(card.textContent),
        hasTotalLine: !!document.getElementById('rxtot') };
      await wait(1200);
      const a = document.getElementById('rxallow');
      out.block = a ? { add: a.querySelector('.aadd').textContent, free: a.querySelector('.afree').textContent,
        barW: Math.round(a.querySelector('.abar').getBoundingClientRect().width),
        litW: Math.round(a.querySelector('.anew').getBoundingClientRect().width) } : null;
      out.headerDuringDrain = document.getElementById('hud-time').textContent.trim();
      await wait(900);
      out.headerAfter = document.getElementById('hud-time').textContent.trim();
      RUN.abort(); await wait(300); return out; });
    const ok60 = s => /of [0-9]+ms$/.test(s);
    (fl60.block && fl60.blocks && fl60.blocks.includes('allow') && !fl60.hasBaselineLine && !fl60.hasTotalLine
      && /free each round/.test(fl60.block.free) && fl60.block.barW > 100 && fl60.block.litW > 0 && fl60.block.litW < fl60.block.barW
      && ok60(fl60.headerBeforeDrain) && ok60(fl60.headerDuringDrain) && ok60(fl60.headerAfter))
      ? ok(`60.18 the Flash Streak round screen is the SHARED allowance block — verdict, big time, "${fl60.block.add}" draining, a ${fl60.block.barW}px budget bar with this round's ${fl60.block.litW}px lit, and "${fl60.block.free}" at its end — with the BASELINE and TOTAL lines gone; and the header carries its budget at every beat ("${fl60.headerBeforeDrain}", "${fl60.headerDuringDrain}", "${fl60.headerAfter}"), where it read "398 of ms" between rounds until build 60`)
      : bad('60.18 the Flash Streak round screen', JSON.stringify(fl60)); }

  /* ---- v31 (60.17, build 60): COUNT SHOWS THE TARGET SHAPE BIG AND CENTRED FIRST ----
     "It is too easy to miss which shape to count." The rule bar said it in a 20px mark beside two words at the top of the screen,
     at the same moment the crowd was being laid out. The round now opens on the shape alone. Driven, and timed off the page: the
     card's size and centring, that NO crowd is on screen while it is up, that it lands on the rule bar's own mark, and — the part
     that matters most — that the shapes' SCREEN TIME is not shortened by any of it. */
  { const ci60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'), G = await import('./config/games.js');
      SS.store.intro['spot'] = SS.store.intro['spot:count'] = Date.now(); SS.save();
      const SP = (await import('./games/spot/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'count', secs: 10 }); RUN.start();
      const t0 = performance.now(); const out = { SHOW: G.COUNT_SHOW };
      // the card
      for (let i = 0; i < 200 && !document.getElementById('cshow'); i++) await wait(25);
      const card = document.getElementById('cshow'), sh = card && card.querySelector('.cshape');
      const g = document.getElementById('gen').getBoundingClientRect();
      out.cardAt = Math.round(performance.now() - t0);
      if (sh) { const r = sh.getBoundingClientRect();
        out.card = { w: Math.round(r.width), h: Math.round(r.height),
          offCentreX: Math.round(Math.abs((r.left + r.width / 2) - (g.left + g.width / 2))),
          share: Math.round(r.width / g.width * 100),
          words: card.querySelector('.cword').textContent.replace(/\s+/g, ' ').trim(),
          crowdWhileUp: document.querySelectorAll('#gen .fs').length }; }
      // the slide: the class goes on, and the transform it takes lands on the bar's mark
      for (let i = 0; i < 200 && card && !card.classList.contains('go'); i++) await wait(25);
      out.slideAt = Math.round(performance.now() - t0);
      const bar = document.querySelector('#rxbar i.shp'); const b = bar && bar.getBoundingClientRect();
      if (sh && b) { const r = sh.getBoundingClientRect();
        // the transform is set but not yet applied at the moment the class lands, so read what it was TOLD to do
        const cs = getComputedStyle(card);
        out.lands = { k: +(+cs.getPropertyValue('--ck')).toFixed(3), barW: Math.round(b.width),
          wantK: +(b.width / r.width).toFixed(3) }; }
      // the crowd, and the screen time it is given
      for (let i = 0; i < 400 && document.querySelectorAll('#gen .fs').length < 4; i++) await wait(25);
      out.crowdAt = Math.round(performance.now() - t0);
      out.crowd = document.querySelectorAll('#gen .fs').length; out.cardGone = !document.getElementById('cshow');
      out.flash = SP.flash;
      // the ask is what ends the looking time; it has to be flash ms after the shapes were drawn, not after the card
      const askAt = await (async () => { for (let i = 0; i < 400; i++) { if (SP.st === 'ask') return Math.round(performance.now() - t0); await wait(25); } return null; })();
      out.askAt = askAt; out.lookedFor = askAt === null ? null : askAt - out.crowdAt;
      RUN.abort(); await wait(300); return out; });
    const S = ci60.SHOW;
    (ci60.card && ci60.card.share >= 25 && ci60.card.offCentreX <= 3 && ci60.card.crowdWhileUp === 0
      && /count the/i.test(ci60.card.words)
      && ci60.slideAt - ci60.cardAt >= S.hold - 150 && ci60.slideAt - ci60.cardAt <= S.hold + 400
      && ci60.crowdAt - ci60.slideAt >= S.slide + S.gap - 200
      && ci60.cardGone && ci60.crowd >= 4
      && ci60.lands && Math.abs(ci60.lands.k - ci60.lands.wantK) < 0.02
      && ci60.lookedFor !== null && Math.abs(ci60.lookedFor - ci60.flash) <= 250)
      ? ok(`60.17 Spot · Count opens on the target shape alone — ${ci60.card.w}px, ${ci60.card.share}% of the field's width, centred to within ${ci60.card.offCentreX}px, "${ci60.card.words}" under it and NO crowd on screen — holds ${ci60.slideAt - ci60.cardAt}ms, then shrinks by ${ci60.lands.k} onto the rule bar's own ${ci60.lands.barW}px mark, and the crowd arrives ${ci60.crowdAt - ci60.slideAt}ms later. The shapes' SCREEN TIME starts when they appear: they were up for ${ci60.lookedFor}ms against a ${ci60.flash}ms flash, so none of the opening comes out of the looking time`)
      : bad('60.17 the Count opening card', JSON.stringify(ci60)); }

  /* ---- v31 (60.16, build 60): COUNT'S DIFFICULTY IS THE DECOYS, NOT THE TARGET COUNT ----
     "Counting to 12 of a single shape is difficult, lots of distractions is fun." Four claims, all sampled off the engine's own
     ramp() and countRound() rather than read off the config: the target count is MOSTLY 3-9; a 12-13 spike is RARE and never
     before its round; the decoys climb to about 20; and the dip is a real "few among many". Then the look-alikes: from LOOK_FROM
     a majority of a round's decoys are shapes the target is mistakable for, and never a shape outside that round's own pool (A9). */
  { const c16 = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).default;
      const G = await import('./config/games.js'); const CS = await import('./config/shapes.js'); const R = G.SPOT_RAMP;
      const N = 400, out = { R, LOOK_FROM: CS.LOOK_FROM, LOOK_SHARE: CS.LOOK_SHARE, rounds: {} };
      for (const r of [1, 5, 9, 11, 12, 18, 25]) {
        const band = [], spike = [], ds = []; let dips = 0;
        for (let i = 0; i < N; i++) { const x = SP.ramp(r, undefined, null); ds.push(x.decoys); if (x.dip) dips++;
          (x.spike ? spike : band).push(x.n); }
        out.rounds[r] = { min: Math.min(...band), max: Math.max(...band),
          spikePc: Math.round(spike.length / N * 100),
          spikeMin: spike.length ? Math.min(...spike) : null, spikeMax: spike.length ? Math.max(...spike) : null,
          dip: dips === N, decoys: ds[0] };
      }
      // the look-alikes, dealt by countRound itself
      const RUN = await import('./run/run.js'), ST = await import('./core/state.js'), SS = await import('./core/store.js');
      SS.store.intro['spot'] = SS.store.intro['spot:count'] = Date.now(); SS.save();
      const wait = ms => new Promise(x => setTimeout(x, ms));
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'count', secs: -1 }); RUN.start();
      for (let i = 0; i < 200 && !SP.pts.length; i++) await wait(25);
      /* the dealer caches its deal by TURN, so one round is one target for the whole run — a sample has to walk several rounds
         (and re-start the run, which reshuffles the deck) to see more than one target's look-alikes. */
      const sample = async rounds => { const tally = { look: 0, other: 0, outOfPool: 0, targets: [], noLook: 0, chance: 0, decoys: 0 };
        for (let pass = 0; pass < 6; pass++) {
          RUN.start(); for (let i = 0; i < 200 && !SP.pts.length; i++) await wait(20);
          for (const round of rounds) { SP.clearT(); SP.round = round; SP.countRound();
            const t = SP.target, pool = SP.spec.pool, look = (CS.LOOKALIKE[t] || []).filter(x => pool.includes(x) && x !== t);
            if (!tally.targets.includes(t)) tally.targets.push(t);
            if (!look.length) tally.noLook++;
            const rest = pool.filter(x => x !== t);
            let decoys = 0;
            for (const q of SP.pts) { if (q.shape === t) continue; decoys++;
              if (!pool.includes(q.shape)) tally.outOfPool++;
              else if (look.includes(q.shape)) tally.look++; else tally.other++; }
            // what a UNIFORM draw from this round's own pool would have given, which is the baseline the bias is measured against
            tally.chance += decoys * (rest.length ? look.length / rest.length : 0); tally.decoys += decoys; }
          RUN.abort(); await wait(120); }
        return tally; };
      out.early = await sample([2, 3, 4]); out.late = await sample([6, 7, 8, 9]);
      return out; });
    const r = c16.rounds;
    const lookPc = t => Math.round(t.look / Math.max(1, t.decoys) * 100);
    const chancePc = t => Math.round(t.chance / Math.max(1, t.decoys) * 100);
    (r[1].min >= 3 && [1, 5, 9, 11, 12, 18, 25].every(n => r[n].max <= c16.R.bandCap)
      && r[1].spikePc === 0 && r[5].spikePc === 0 && r[9].spikePc === 0
      && r[12].spikePc > 2 && r[12].spikePc < 30 && r[12].spikeMin >= c16.R.spikeLo && r[12].spikeMax <= c16.R.spikeHi
      && c16.R.nCap >= c16.R.spikeHi && c16.R.bandCap < c16.R.nCap
      && r[1].decoys >= 3 && r[18].decoys >= 18 && r[18].decoys <= c16.R.decoyCap
      && r[11].dip && r[11].decoys >= 15 && r[11].min <= 5
      && c16.early.outOfPool === 0 && c16.late.outOfPool === 0
      && Math.abs(lookPc(c16.early) - chancePc(c16.early)) <= 8
      && lookPc(c16.late) - chancePc(c16.late) >= 15
      && c16.late.noLook === 0 && c16.late.targets.length > 1)
      ? ok(`60.16 Count's difficulty is the decoys: the ordinary band stays inside 3-${c16.R.bandCap} at every round (${[1, 9, 18, 25].map(n => 'r' + n + ' ' + r[n].min + '-' + r[n].max).join(', ')}), a ${c16.R.spikeLo}-${c16.R.spikeHi} spike never fires before round ${c16.R.spikeFrom} and then only ${r[12].spikePc}% of the time (nCap ${c16.R.nCap} is the spike's ceiling and the highest button, B.15), decoys climb ${r[1].decoys} → ${r[18].decoys} to a ${c16.R.decoyCap} ceiling, a dip round is ${r[11].min}-${r[11].max} among ${r[11].decoys} — and from round ${c16.LOOK_FROM} the decoys are BIASED toward the shapes the target is mistakable for — ${lookPc(c16.late)}% of them against the ${chancePc(c16.late)}% a uniform draw from the same pool would give, over ${c16.late.targets.length} different targets, every one of which has a look-alike in its own pool, while the early rounds sit on chance (${lookPc(c16.early)}% against ${chancePc(c16.early)}%) and nothing is ever dealt outside that round's own pool`)
      : bad('60.16 Count deals', JSON.stringify(c16)); }

  /* ---- v31 (60.15, build 60, L5 quoted — Aiden 2026-09-23): THE COUNT BUDGET AND A SMOOTHED RAMP ----
     "It gets very hard around round 9", and it did: hiPer 1.0 put the target band's top on nCap at ROUND 8, with the drift, the
     spin and the size variation at or near their ceilings a few rounds later — so by round 9 there was nothing left to climb.
     The check is where each thing REACHES ITS CEILING, driven through the engine's own ramp() rather than read off the config,
     because the ceilings are what "full difficulty" means. The flash is asserted to have MOVED THE OTHER WAY on purpose: it is
     screen time, more of it is easier, and Aiden's 15 Sept rule (time scales with the shapes on screen) is untouched. */
  { const cr60 = await page.evaluate(async () => { const SP = (await import('./games/spot/index.js')).default;
      const G = await import('./config/games.js'); const R = G.SPOT_RAMP;
      const rows = []; for (let r = 1; r <= 30; r++) rows.push(Object.assign({ r }, SP.ramp(r, undefined, null)));
      const capAt = (k, v) => { const i = rows.findIndex(x => x[k] >= v); return i < 0 ? null : rows[i].r; };
      return { budget: G.COUNT_BUDGET, R,
        // AMENDED within build 60 by 60.16: the ORDINARY band's ceiling is `bandCap` now, and `nCap` is the spike's and the keypad's
        hiCapAt: capAt('hi', R.bandCap || R.nCap), sizeCapAt: capAt('sizeVar', R.sizeCap),
        hi: rows.filter(x => [1, 5, 9, 14, 18].includes(x.r)).map(x => [x.r, x.hi]),
        drift: rows.filter(x => [5, 9, 18].includes(x.r)).map(x => [x.r, x.drift]),
        flash: rows.filter(x => [1, 9, 18].includes(x.r)).map(x => [x.r, x.flash]) }; });
    const hi = Object.fromEntries(cr60.hi), flash = Object.fromEntries(cr60.flash);
    (cr60.budget === 20
      && cr60.hiCapAt >= 16 && cr60.hiCapAt <= 20 && cr60.sizeCapAt >= 16 && cr60.sizeCapAt <= 20
      && hi[9] < (cr60.R.bandCap || cr60.R.nCap) && hi[18] >= (cr60.R.bandCap || cr60.R.nCap)
      && cr60.R.hiPer <= 0.55 && cr60.R.loPer <= 0.25 && cr60.R.driftPer <= 3 && cr60.R.spinPer <= 3 && cr60.R.sizePer <= 0.025
      && flash[18] > flash[9] && flash[9] > flash[1])
      ? ok(`60.15 (L5) the Count Streak budget is ${cr60.budget} miscounts (was 8, a placeholder) and the ramp is smoothed: the target band's top reaches its ceiling at round ${cr60.hiCapAt} and the size variation its ceiling at round ${cr60.sizeCapAt}, where both were there by round 9 or so — the band reads ${cr60.hi.map(x => 'r' + x[0] + ' ' + x[1]).join(', ')} — and every per-round step is at most half what it was. The FLASH deliberately does not halve: it is screen time, more of it is easier, and it still grows with the crowd (${cr60.flash.map(x => 'r' + x[0] + ' ' + x[1] + 'ms').join(', ')})`)
      : bad('60.15 the Count budget and ramp', JSON.stringify(cr60)); }

  /* ---- v31 (60.14, build 60): THE STOPWATCH STREAK'S RUNNING COUNTER READS TO TWO DECIMALS ----
     "0.2 / 5.0s" becomes "0.16 / 5.00s". An attempt is scored to a hundredth (onDown rounds err to 100ths), so a whole round
     could land and a counter printed to a tenth not move — one tenth of a 5s budget is two percent of the run. Driven, not read
     off the string: a real attempt is scored and the number on #score is compared with the engine's own total. */
  { const dp60 = await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default;
      TM.ctx = { mode: 'stopwatch', len: -1 }; TM.round = 1;
      const shots = [0, 0.04, 0.16, 1.234, 5].map(v => { TM.tot = v; return { tot: v, line: TM.streakScore() }; });
      TM.round = 11; TM.tot = 0.16; const past10 = TM.streakScore();
      return { shots, past10 }; });
    const two = dp60.shots.every(r => /^[0-9]+\.[0-9]{2} \/ [0-9]+\.[0-9]{2}s$/.test(r.line));
    const moves = dp60.shots.find(r => r.tot === 0.04).line !== dp60.shots.find(r => r.tot === 0).line;
    (two && moves && dp60.shots.find(r => r.tot === 0.16).line === '0.16 / 5.00s' && dp60.past10 === '0.16 / 7.50s')
      ? ok(`60.14 the Stopwatch Streak's running counter reads to two decimals — ${dp60.shots.map(r => '"' + r.line + '"').join(', ')}, and "${dp60.past10}" past round 10 — so a 0.04s round moves it where a single decimal did not`)
      : bad('60.14 the Stopwatch Streak counter', JSON.stringify(dp60)); }

  /* ---- v31 (60.13, build 60): AN ANGLED-WALL BALL STARTS OFF SCREEN AND ROLLS IN ----
     hiddenDiag started it a `size` before the point at which the box is fully INSIDE the field, which left it straddling the edge
     — half of it visible from the first frame, sitting there through the 600ms before the loop starts. A straight round starts at
     pos(0).x = −size, fully out. Measured the same way for both: the ball's box at t=0 against the field's own rect. */
  { const roll60 = await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default;
      const RUN = await import('./run/run.js'), ST = await import('./core/state.js'), SS = await import('./core/store.js');
      const G = await import('./config/games.js');
      SS.store.intro['timing'] = SS.store.intro['timing:hidden'] = Date.now(); SS.save();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'timing', diff: 'hidden', secs: -1 }); RUN.start();
      for (let i = 0; i < 200 && TM.st !== 'run' && TM.st !== 'arm'; i++) await wait(25);
      const f = document.getElementById('gen').getBoundingClientRect();
      const off = b => { const p0 = b.pos(0), s = b.size;
        return p0.x + s <= 0.5 || p0.x >= f.width - 0.5 || p0.y + s <= 0.5 || p0.y >= f.height - 0.5; };
      const out = { field: { w: Math.round(f.width), h: Math.round(f.height) }, diag: [], straight: [] };
      const wasD = G.HIDDEN.diag, wasP = G.HIDDEN.plain, wasF = G.HIDDEN.diagFrom;
      for (const [which, force] of [['diag', 1], ['straight', 0]]) {
        G.HIDDEN.diag = force; G.HIDDEN.plain = 0; G.HIDDEN.diagFrom = 1;
        for (let i = 0; i < 24; i++) { TM.clearT(); TM.round = 14 + i; TM.st = 'arm'; TM.hidden();
          const b = TM.ball; out[which].push({ diag: b.diag === undefined ? null : b.diag, off: off(b),
            at0: { x: Math.round(b.pos(0).x), y: Math.round(b.pos(0).y) }, size: Math.round(b.size) }); }
      }
      G.HIDDEN.diag = wasD; G.HIDDEN.plain = wasP; G.HIDDEN.diagFrom = wasF;
      RUN.abort(); await wait(300); return out; });
    const dOff = roll60.diag.filter(r => !r.off), sOff = roll60.straight.filter(r => !r.off);
    (roll60.diag.length === 24 && roll60.diag.every(r => r.diag !== null) && dOff.length === 0
      && roll60.straight.every(r => r.diag === null) && sOff.length === 0)
      ? ok(`60.13 an angled-wall ball starts entirely off screen and rolls in, exactly as a straight-wall ball does — 24 angled rounds and 24 straight ones, every one of them with its whole box outside the ${roll60.field.w}×${roll60.field.h} field at t=0`)
      : bad('60.13 the angled ball starts on screen', JSON.stringify({ diagOn: dOff.slice(0, 4), straightOn: sOff.slice(0, 4) })); }

  /* ---- v31 (60.12, build 60, L5 quoted — Aiden 2026-09-23): A HIDDEN STREAK HAS A 50ms ALLOWANCE ----
     The budget is still 700ms; what changes is what a round SPENDS of it. As with 60.4 the thing that could quietly rot is the
     split — the verdict word reads the RAW ms and the budget is charged the reduced one — so the check drives both sides and
     asserts the STOPWATCH Streak still spends its seconds whole. */
  { const hf60 = await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default;
      const G = await import('./config/games.js');
      const spend = (mode, e) => { TM.ctx = { mode }; return TM.spendOf(e); };
      return { free: G.HIDDEN.free,
        hidden: [0, 25, 50, 51, 180, 700].map(e => [e, spend('hidden', e)]),
        stopwatch: [0, 0.5, 2].map(e => [e, spend('stopwatch', e)]) }; });
    const h = Object.fromEntries(hf60.hidden), w = Object.fromEntries(hf60.stopwatch);
    (hf60.free === 50 && h[0] === 0 && h[25] === 0 && h[50] === 0 && h[51] === 1 && h[180] === 130 && h[700] === 650
      && w[0] === 0 && w[0.5] === 0.5 && w[2] === 2)
      ? ok('60.12 (L5) a Hidden Streak round spends max(0, ms − 50) of the unchanged 700ms budget — a 180ms miss costs 130, a 50ms miss costs nothing — while the STOPWATCH Streak still spends its seconds whole')
      : bad('60.12 the Hidden Streak allowance', JSON.stringify(hf60)); }

  /* ---- v31 (60.11, build 60, Cowork's ramp, Aiden agreed): A HIDDEN STREAK RAMPS UP MORE SLOWLY ----
     "I only got to round six." The speed band and the angled wall both applied from ROUND ONE at full strength, so round 1 was
     already most of the difficulty. The new shape is asserted at the rounds it names — plain to 3, band in from 4 and full at
     10, angled walls from 6 and full at 14, rampTo 20 — and, separately, that a SET still gets none of it whatever the round. */
  { const ramp60 = await page.evaluate(async () => { const TM = (await import('./games/timing/index.js')).default;
      const G = await import('./config/games.js'); const H = G.HIDDEN;
      const at = (r, vary) => TM.hiddenRamp(r, vary);
      const rows = [1, 2, 3, 4, 6, 7, 10, 14, 20, 30].map(r => { const x = at(r, true);
        return { r, plain: !!x.plain, band: Math.round(x.band * 1000) / 1000, diagP: Math.round(x.diagP * 1000) / 1000, tilt: Math.round(x.tilt * 10) / 10 }; });
      return { H: { plain: H.plain, bandFrom: H.bandFrom, bandFull: H.bandFull, diagFrom: H.diagFrom, diagFull: H.diagFull, rampTo: H.rampTo, band: H.band, diag: H.diag },
        rows, set: [1, 6, 10, 20].map(r => at(r, false)).map(x => ({ band: x.band, diagP: x.diagP, tilt: x.tilt, plain: !!x.plain })) }; });
    const by = n => ramp60.rows.find(r => r.r === n);
    const H = ramp60.H;
    const monotone = (k) => ramp60.rows.every((r, i) => !i || r[k] >= ramp60.rows[i - 1][k] - 1e-9);
    (H.plain === 3 && H.bandFrom === 4 && H.bandFull === 10 && H.diagFrom === 6 && H.diagFull === 14 && H.rampTo === 20
      && [1, 2, 3].every(n => by(n).plain && by(n).band === 0 && by(n).diagP === 0 && by(n).tilt === 0)
      && by(4).band > 0 && by(4).band < H.band && by(10).band === H.band && by(20).band === H.band
      && by(4).diagP === 0 && by(6).diagP > 0 && by(6).diagP < H.diag && by(14).diagP === H.diag && by(30).diagP === H.diag
      && monotone('band') && monotone('diagP') && monotone('tilt')
      && ramp60.set.every(x => x.band === 0 && x.diagP === 0 && x.tilt === 0 && !x.plain))
      ? ok(`60.11 a Hidden Streak ramps up slowly: rounds 1-${H.plain} are plain (steady speed, straight wall, no tilt), the speed band phases in from ${H.bandFrom} and is full at ${H.bandFull} (${ramp60.rows.filter(r => [1, 4, 7, 10].includes(r.r)).map(r => 'r' + r.r + ' ±' + Math.round(r.band * 100) + '%').join(', ')}), angled walls start at ${H.diagFrom} and reach ${H.diag} by ${H.diagFull} (${ramp60.rows.filter(r => [4, 6, 10, 14].includes(r.r)).map(r => 'r' + r.r + ' ' + r.diagP).join(', ')}), rampTo is ${H.rampTo} (was 12), every dimension climbs and never falls — and a SET draws none of it at any round`)
      : bad('60.11 the Hidden Streak ramp', JSON.stringify(ramp60)); }

  /* ---- v31 (60.10, build 60): THE STOPWATCH IGNORES TAPS FOR ITS FIRST SECOND ----
     Aiden's accidental tap as the game started scored 0.01 and ruined a run. The lock is measured from when the CLOCK starts,
     not from when the round is drawn, so the check reads `t0` off the engine and taps against that rather than against a sleep.
     Three things: a tap inside the window scores NOTHING and leaves the attempt running, a tap after it scores normally, and
     HIDDEN IS NOT LOCKED — its ball can be behind the wall for 0.6s, so a second there would eat real answers. */
}
