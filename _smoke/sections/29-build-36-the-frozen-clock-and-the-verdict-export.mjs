/* ---- 16. build 36 (FEEDBACK-v22 §J.1, the frozen clock; the Verdict Desk export, version 658) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, close, check, ok, bad, root, read, at, page, click, setStorage, OPEN_PREFS, SEEN_INTRO, up, verdict } from '../lib/gate.mjs';

export const SECTION = ["build 36 - the frozen clock and the verdict export"];

export async function run() {
  const imp36 = (...p) => import(pathToFileURL(path.join(root, ...p)).href);
  const audio36 = read('audio.js'), testing36 = read('ui', 'screens', 'testing.js');

  /* ---- §J.1: iOS leaves state 'running' on a frozen clock. The gates are off the foreground paths, revive() checks the clock,
     and the tap reads a flag and never waits. Static first, then every path driven with the clock frozen by hand. ---- */
  {
    const tapBranch = (audio36.split("if(c.state==='running'){ if(!tap) return live(c,why);")[1] || '').split('return Promise.resolve(true); }')[0];
    const has = {
      fg: audio36.includes("document.addEventListener('visibilitychange',()=>{ if(!ac) return; if(document.hidden){ ac._suspect=1; mark(ac); return; } revive('foreground'); });"),
      ps: audio36.includes("addEventListener('pageshow',()=>{ if(ac) revive('pageshow'); });"),
      tap: audio36.includes("document.addEventListener('pointerdown',()=>{ if(ac&&(ac.state!=='running'||ac._suspect)) revive('tap',true); },{capture:true,passive:true});"),
      reviveGate: !audio36.includes("if(!c||c.state==='running'||"),
      live: audio36.includes('const LIVE_MS=150;') && /function live\(c,why\)\{[\s\S]*?\},LIVE_MS\)\); \}/.test(audio36),
      tapNoWait: !!tapBranch && !/setTimeout|live\(/.test(tapBranch) && /stuck\(c\)/.test(tapBranch),
      resumeChecked: audio36.includes('if(ac===c&&!tap) return live(c,why).then(done);'),
      readout: testing36.includes('audioClock()') && testing36.includes('ABOUT.devClockStopped') };
    Object.values(has).every(Boolean)
      ? ok('§J.1 no state gate left on the foreground or pageshow paths or at the top of revive(); a running context goes to the 150ms clock check; the tap reads a flag and its branch starts no timer; a resume that ends running is checked too; Testing samples the clock')
      : bad('§J.1 the shape of the fix', JSON.stringify(has));
    await setStorage({ ne: { v: 4, prefs: { ...OPEN_PREFS }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const fz = await page.evaluate(async () => { const M = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const freeze = c => { const t = c.currentTime; Object.defineProperty(c, 'currentTime', { get: () => t, configurable: true }); };
      const tap = () => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
      const S = () => M.audioState(); const out = {};
      M.AC(); M.Music.menu('menu'); await wait(500);
      const c0 = M.ac, g0 = S().gen, k0 = S().checks;
      // a healthy running context: one foreground event runs ONE timed check, sees the clock move and keeps the context
      document.dispatchEvent(new Event('visibilitychange')); await wait(320);
      out.healthy = { same: M.ac === c0, gen: S().gen - g0, checks: S().checks - k0, suspect: !!c0._suspect, why: S().why, clock: S().clock };
      // THE BUG: state still reads running and the clock has stopped. A foreground event rebuilds it
      freeze(c0); out.lie = c0.state;
      document.dispatchEvent(new Event('visibilitychange')); await wait(360);
      out.fg = { changed: M.ac !== c0, gen: S().gen - g0, last: S().last, clock: S().clock };
      // pageshow reaches the same check
      await wait(300); const c1 = M.ac; freeze(c1); window.dispatchEvent(new Event('pageshow')); await wait(360);
      out.ps = { changed: M.ac !== c1, last: S().last };
      // the music re-points after a frozen rebuild: a tick later the bed is on the live context
      await wait(300); out.bed = M.Music.probe();
      // a resume that ends 'running' on a stopped clock is not believed: checked, and rebuilt
      await wait(200); const c2 = M.ac; freeze(c2); await c2.suspend(); await wait(900);
      out.resumeLie = { changed: M.ac !== c2, last: S().last };
      // THE TRAP: fifty taps on a healthy, unsuspected context start no timed check and rebuild nothing
      await wait(300); const c3 = M.ac; c3._suspect = 0; const k1 = S().checks, g1 = S().gen;
      for (let i = 0; i < 50; i++) tap();
      out.taps = { checks: S().checks - k1, gen: S().gen - g1, checking: !!c3._checking };
      // a hidden page marks the context suspect; a suspect, stopped clock is rebuilt by the next tap SYNCHRONOUSLY - inside the gesture
      freeze(c3);
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden;
      out.hidden = !!c3._suspect; c3._p = performance.now() - 500;
      const k2 = S().checks; tap();
      out.tapFrozen = { changed: M.ac !== c3, checks: S().checks - k2, last: S().last };
      // a suspect context whose clock IS moving is cleared by a tap, with no rebuild and no timer
      await wait(300); const c4 = M.ac; const g2 = S().gen, k3 = S().checks; tap();
      out.tapLive = { same: M.ac === c4, suspect: !!c4._suspect, gen: S().gen - g2, checks: S().checks - k3 };
      M.Music.stop(); return out; });
    (fz.healthy.same && fz.healthy.gen === 0 && fz.healthy.checks === 1 && !fz.healthy.suspect && /clock moving/.test(fz.healthy.why) && fz.healthy.clock && fz.healthy.clock.dt > 0)
      ? ok(`§J.1 a healthy context is checked once on foreground and kept - the clock moved ${fz.healthy.clock.dt}s in ${fz.healthy.clock.ms}ms`) : bad('§J.1 a healthy context is kept', JSON.stringify(fz.healthy));
    (fz.lie === 'running' && fz.fg.changed && fz.fg.gen === 1 && /clock stopped/.test(fz.fg.last) && fz.fg.clock && fz.fg.clock.dt === 0)
      ? ok(`§J.1 THE BUG: a context reading "running" with a stopped clock is rebuilt on foreground ("${fz.fg.last}")`) : bad('§J.1 the frozen clock on foreground', JSON.stringify({ lie: fz.lie, fg: fz.fg }));
    (fz.ps.changed && /pageshow · clock stopped/.test(fz.ps.last)) ? ok('§J.1 pageshow reaches the same check and rebuilds a stopped clock') : bad('§J.1 pageshow', JSON.stringify(fz.ps));
    (fz.bed.bed && fz.bed.playing) ? ok('§J.1 after a stopped-clock rebuild the music bed is back on the live context') : bad('§J.1 the music re-points', JSON.stringify(fz.bed));
    (fz.resumeLie.changed && /clock stopped/.test(fz.resumeLie.last)) ? ok(`§J.1 a resume that ends "running" on a stopped clock is checked and rebuilt ("${fz.resumeLie.last}")`) : bad('§J.1 the resume that says running', JSON.stringify(fz.resumeLie));
    (fz.taps.checks === 0 && fz.taps.gen === 0 && !fz.taps.checking)
      ? ok('§J.1 THE TRAP: fifty taps on a healthy context start no clock check and rebuild nothing - the tap path costs one flag read') : bad('§J.1 the tap path runs the check', JSON.stringify(fz.taps));
    (fz.hidden && fz.tapFrozen.changed && fz.tapFrozen.checks === 0 && /tap · clock stopped/.test(fz.tapFrozen.last))
      ? ok('§J.1 a hidden page marks the context suspect, and the next tap on a stopped clock rebuilds it synchronously, inside the gesture, with no timer') : bad('§J.1 the suspect tap', JSON.stringify({ hidden: fz.hidden, tapFrozen: fz.tapFrozen }));
    (fz.tapLive.same && !fz.tapLive.suspect && fz.tapLive.gen === 0 && fz.tapLive.checks === 0)
      ? ok('§J.1 a suspect context whose clock is moving is cleared by the next tap - no rebuild, no timer') : bad('§J.1 the suspect tap on a live clock', JSON.stringify(fz.tapLive));
    // the Testing line: the clock beside the state, and STOPPED when a running state has a still clock
    await click('[data-go="s-testing"]'); await sleep(2300);
    const ro1 = await page.evaluate(() => document.getElementById('dev-audio').textContent.trim());
    await page.evaluate(async () => { const M = await import('./audio.js'); const c = M.ac; const t = c.currentTime; Object.defineProperty(c, 'currentTime', { get: () => t, configurable: true }); });
    await sleep(2300);
    const ro2 = await page.evaluate(() => document.getElementById('dev-audio').textContent.trim());
    await page.evaluate(async () => { const M = await import('./audio.js'); delete M.ac.currentTime; });
    await click('#s-testing .back'); await sleep(300);
    (/^audio · running · clock \+\d\.\d{3}s in \d\.\ds · context \d+/.test(ro1) && !/STOPPED/.test(ro1) && /^audio · running · clock \+0\.000s in \d\.\ds · STOPPED · context/.test(ro2))
      ? ok(`§J.1 Testing reports the clock beside the state - "${ro1.slice(0, 48)}…", and with the clock held still: "${ro2.slice(0, 52)}…"`) : bad('§J.1 the Testing clock readout', JSON.stringify({ ro1, ro2 }));
  }

  /* ---- the Verdict Desk export (version 658): every line it carries, Reaction's thresholds, the per-round ceilings for Cut,
     Flash and Go / No-go (AMENDED at build 37: Timing's thresholds are built too, #414 closed) ---- */
  {
    const V = await imp36('config', 'verdicts.js'), T = V.VERDICTS;
    const W = {
      'quick-tap': { bad: ['Warming up, try again!', 'A few mistakes?', "Alright let's go again.", 'Could be quicker...', 'Do you need a coffee?'], ok: ['Good work!', 'Steady pace!', 'Keep pushing!', 'Decent speed.', 'Almost a Great!'], good: ['Great job!', 'Proper fast.', 'Solid run!', "You're switched on today.", 'Well done!'], ace: ['Look at you go!', "You're flying!", "You're a Quick Tap master!", 'Do those thumbs come with a warning?', 'Quick.  Damn quick.'] },
      dots: { bad: ['Maybe try fingers instead of thumbs?', 'The dots might be winning...', 'Have another crack.', 'Can we pick up the speed?', 'You need to be one with the dots'], ok: ['You own the dots.', 'Decent speed, can you go faster?', "In the 20's!", "That's worthy of the first key.", 'Solid, but could you improve?'], good: ['Quick work!', 'Great job!', 'That was some serious speed.', 'Very good run!', 'Be one with the dots.'], ace: ['Are you cheating?', 'Quickest hands in the West.', 'That will be hard to top.', 'You are the Dots master!', 'Wow, what a run!'] },
      hold: { bad: ['Ooft, maybe try another round.', 'Make sure you match the total area', 'A bit off but not the worst', 'Were you just guessing or...', 'Back to the drawing board.'], ok: ['Decent estimation skills!', 'In the ball park for sure.', 'Not a bad run at all.', 'Reasonable, but could you do better?', "You're getting there!"], good: ['Great eye!', 'Tight. Nearly there!', 'You were on the ball for that one!', 'Close to being an amazing run!', 'One step off perfect.'], ace: ['Machine-like!', 'That was not a normal run.', 'Dead on, round after round.', 'Nothing to correct, perfection.', 'Your estimation skills are unmatched!'] },
      'hold:cut': { bad: ["I wouldn't let you cut my birthday cake...", 'Hmmmm, maybe we work on this one.', 'Give me back that knife please.', 'Do you understand the game or...?', 'Measure twice, cut once'], ok: ['Getting there, solid run!', 'Close enough, good enough.', 'Good run, could we improve?', 'Taking your time, nice to see!', 'You know your percentages!'], good: ["You've got the eye!", 'Clean cutting.', 'Certified birthday cake cutter!', 'See the cut, be the cut.', 'Sliced and diced!'], ace: ['Surgical!', 'Wow, excellent cutting!', 'Are you a doctor?', "Surely there's cheating involved...", "You're a pro!"] },
      sequence: { bad: ['Was that a mistaken tap?', 'Lost it early!', 'I know you can do better than that.', 'Go on, have another crack!', 'Whoops!'], ok: ['Decent performance.', 'Not half bad!', 'Can you get to 8?', 'Taxing the memory.', 'You’ve got more in you!'], good: ['Great memory!', 'A long chain!', 'An ear for music!', 'Very good run!', 'Nicely done!'], ace: ['Photographic!', 'Far above average!', 'A modern day Mozart.', 'Sequence master!', 'Amazing!'] },
      'timing:stopwatch': { bad: ['I’ll keep my watch.', 'Maybe try this one again.', 'Maybe tap in time?', 'Have another crack.', 'Appreciate the attempt.'], ok: ['Getting the rhythm.', 'In the ballpark!', 'Learn to trust your gut.', 'Not bad at all.', 'Close, but I think you could do better!'], good: ['Great intuition.', 'Tight.  Tight tight tight tight!', 'On a roll!', 'Very close timing.', 'Very very good.'], ace: ['The human-stopwatch hybrid!', 'Who needs clocks when we have you?', 'The stopwatch master!', 'More accurate than my Casio!', 'Uncanny performance!'] },
      'timing:hidden': { bad: ['Was there an accidental tap in there?', 'The wall won that one.', 'It really was hidden…', 'Maybe another attempt?', 'Have another go!'], ok: ['Feel the ball, be the ball.', 'In the ball park.', 'A touch early or late, but solid!', 'Decent read.', 'Getting there!'], good: ['Great tracking!', 'Very close!', 'Nice run!', 'Well judged.', 'You’re a natural!'], ace: ['You can see through walls!', 'Right on the marker.', 'How did you track that?', 'Perfect judgement.', 'X-ray vision!'] },
      'reaction:flash': { bad: ['Did you nod off?', 'Slow off the mark.', 'You blinked!', 'Late every time.', 'Do you need a coffee?'], ok: ['Consistent but not that quick', 'Decent but could be better', 'Bang on average!', 'Not the worst.', 'Try again but focus this time!'], good: ['Quick hands!', 'Great reflexes.', 'Very sharp.', 'Nicely quick.', 'Great reactions!'], ace: ['Lightning quick!', 'Faster than a blink.', 'Like a cat!', 'That is elite.', 'Reaction master!'] },
      'reaction:nogo': { bad: ['Don’t let them trick you.', 'Make sure to focus.', 'You need to be one with the shapes.', 'Make a stronger coffee?', 'Have another go, try again.'], ok: ['Decent reactions.', 'You got it!', 'Good run.', 'Decent discipline.', 'Keep at it!'], good: ['Great control!', 'We couldn’t fool you.', 'Quick and careful.', 'Very good run!', 'You know your shapes.'], ace: ['Perfect discipline!', 'Very very very quick.', 'Nothing fooled you.', 'Sharp and patient.', 'You nailed it!'] },
      'spot:count': { bad: ['Blinked and you missed it.', 'Back to pre-school perhaps?', 'Counting the wrong shapes?', 'Don’t count them one by one.', 'Have another crack.'], ok: ['Decent guesses!', 'Good intuition.', 'Stop counting one by one.', 'Not bad, not bad at all', 'Good stuff.'], good: ['Great eye!', 'Nearly spot on.', 'Tight counting.', 'Very close!', 'You have the knack for counting.'], ace: ['Your subconscious mind is strong!', 'This game is too easy for you.', 'Brilliant performance!', 'The counting savant!', 'The shape detective!'] },
      'spot:find': { bad: ['It was there the whole time!', 'Too long on each one.', 'Lost in the crowd.', 'Scan, do not stare.', 'Look wider and go again.'], ok: ['Finding them.', 'Decent search.', 'Let the odd one come to you.', 'Mid pace.', 'Nearly quick!'], good: ['Quick eye!', 'Great scanning.', 'Straight to it, mostly.', 'Low times, nice.', 'Very good run!'], ace: ['You did not search, you saw!', 'Straight to it, every time.', 'Nothing wasted.', 'Very quick eye.', 'That will be hard to beat.'] } };
    const lineBad = []; for (const [k, tiers] of Object.entries(W)) for (const [t, want] of Object.entries(tiers)) if (((T[k] || {}).lines || {})[t]?.join('|') !== want.join('|')) lineBad.push(k + ':' + t);
    const ws = Object.entries(T).flatMap(([k, r]) => Object.values(r.lines).flat().filter(l => l !== l.trim()).map(l => k + ' "' + l + '"'));
    // v29 (items 11 / 18, build 56): TWELVE rows. The Gauntlet has a verdict set of its own, like any game (config/verdicts.js)
    (!lineBad.length && !ws.length && Object.keys(T).length === 12)
      ? ok('Verdict export (v658): every line it carries is in, across all eleven of Aiden\'s verdict rows plus the Gauntlet\'s own; the lines it left blank keep theirs; the two half-typed lines are Aiden\'s fixes; no line carries stray whitespace')
      : bad('Verdict export lines', JSON.stringify({ lineBad, ws, keys: Object.keys(T) }));
    /* RESTATED at build 60: four of these are Aiden's own new numbers of 2026-09-23 and the rest are untouched. 60.4 made Estimate ·
       Grow looser (.875/.75 → .825/.70, and its per-round ceilings 2/5/10 → 4/8/15); 60.9 rebuilt Hidden (.9259/.8796/.8241 →
       .8704/.8148/.7222, which IS the Author / Pro / Skill key bar in the Set's own unit, and 40/70/95 → 60/115/200 per round). */
    const AT = { 'quick-tap': [.4833, .3667, .25], dots: [.5556, .4444, .3111], hold: [.825, .7, .25], 'hold:cut': [.8875, .8, .625], sequence: [.6875, .5, .3125],
      'reaction:flash': [.7714, .6714, .5857], 'reaction:nogo': [.5, .44, .33], 'timing:stopwatch': [.9, .74, .56], 'timing:hidden': [.8704, .8148, .7222], 'spot:count': [.85, .6, .35], 'spot:find': [.85, .6, .35] };
    /* RESTATED at build 60: two of these per-round ceilings are Aiden's own new numbers of 2026-09-23. 60.9 rebuilt Hidden's (40/70/95
       became 60/115/200) and 60.4 loosened Grow's (2/5/10 became 4/8/15). The other six are untouched. */
    const RA = { 'timing:stopwatch': [0.1, 0.3, 0.55], 'timing:hidden': [60, 115, 200], 'reaction:flash': [225, 255, 285], 'reaction:nogo': [299, 330, 400], 'hold:grow': [4, 8, 15], 'hold:cut': [3.5, 5.5, 9], 'spot:count': [0, 1, 2], 'spot:find': [1, 2, 4] };
    const atBad = Object.entries(AT).filter(([k, v]) => !T[k] || T[k].at.join() !== v.join()).map(([k]) => k);
    const raBad = Object.entries(RA).filter(([k, v]) => !V.ROUND_AT[k] || V.ROUND_AT[k].join() !== v.join()).map(([k]) => k);
    (!atBad.length && !raBad.length && Object.keys(V.ROUND_AT).length === 8)
      ? ok('Verdict export: Reaction\'s two threshold triples and the per-round ceilings for Cut, Flash and Go / No-go are Aiden\'s; Timing\'s `at` AND its per-round ceilings are Aiden\'s numbers from build 37 (#414 closed); Spot keeps its own')
      : bad('Verdict export thresholds', JSON.stringify({ atBad, raBad }));
    /timing':r=>1-Math\.min\(1,r\.hits\/5\), 'timing:hidden':r=>1-Math\.min\(1,r\.hits\/5400\)/.test(read('progress', 'rules.js'))
      ? ok('Verdict export: Timing\'s QUALITY scales are still 5 and 5400 - build 37\'s Timing thresholds are written against those') : bad('Timing\'s scale moved');
    const q = await page.evaluate(async () => { const P = await import('./progress.js');
      const tier = r => (P.tierOf(Object.assign({ misses: 0, t: 1, v: 4 }, r)) || {}).tier;
      return { flash: [tier({ g: 'reaction', d: 'flash', s: 5, hits: 230 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 231 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 295 }), tier({ g: 'reaction', d: 'flash', s: 5, hits: 296 })],
        nogo: [tier({ g: 'reaction', d: 'nogo', s: 5, hits: 320 }), tier({ g: 'reaction', d: 'nogo', s: 5, hits: 321 })] }; });
    (q.flash.join() === 'ace,good,ok,bad' && q.nogo.join() === 'ace,good')
      ? ok('Verdict export played back through the tier: a Flash Set averaging 230ms is Amazing!, 231 Great!, 295 Good., 296 Meh.; Go / No-go 320 over the curve is Amazing!, 321 Great!') : bad('Verdict export, played back', JSON.stringify(q));
  }
}
