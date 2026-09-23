// ---- 3. one Set run and one Streak run per game ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, ok, bad, read, at, until, click, heldSeen, readySeen, askedLine, askedTot, driveToResult, resultLine, openSheet } from '../lib/gate.mjs';

export const SECTION = ["one Set run and one Streak run per game (first mode)"];

export async function run() {
  let askedSet = '', askedSetTot = null, askedStreakLine = '';
  const RUNS = [['quick-tap', 0, 0], ['dots', 0, 0], ['hold', 0, 0], ['hold', 0, 'streak'], ['sequence', 0, 0], ['timing', 0, 0], ['timing', 0, 'streak'], ['reaction', 0, 0], ['reaction', 0, 'streak'], ['spot', 0, 0], ['spot', 0, 'streak']];
  for (const [g, mi, li] of RUNS) {
    const face = await openSheet(g, mi, li);
    const label = `${g} · ${face || '?'}`;
    if (!face) { bad(label, 'no length button'); continue; }
    await click('#go-btn');
    /* AMENDED at build 60 (v31 60.15 / 60.17): Spot takes longer to play than it did, for two reasons that are both Aiden's
       and both deliberate — a Count Streak's budget is 20 miscounts rather than 8, so it survives two and a half times as many
       rounds, and every Count round opens on its target shape for about 1.75s before the crowd. The ASSERTION is unchanged (a Set
       and a Streak of every game driven to its result); this is the driver's patience, not a threshold. Measured at build 60: a
       Count Set is about 55s and its Streak longer again. */
    const at = await driveToResult(g, label, g === 'spot' ? 240000 : 90000, g === 'reaction' && li === 'streak');
    if (g === 'timing' && li === 0) { askedSet = askedLine; askedSetTot = askedTot; }   // the Set: 6.18 and §3 below
    if (g === 'timing' && li === 'streak') askedStreakLine = askedLine;                   // the Streak keeps its baseline (§3)
    if (at === 's-over') { const r = await resultLine(); r.score ? ok(`${label} → "${r.score}" · ${r.verdict} · ${r.stats}`) : bad(label, 'result screen has no score'); }
  }
  // v14 (6.3): every round-based game held at least one result until it was tapped. A game that never raised #game.tapon
  // auto-advanced, which is the thing this batch removed
  {
    // v15 (3.9) narrows the list: only a result with something to read waits. Timing and Spot lost the cue this build,
    // so they must NOT hold — the assertion runs both ways or "removed it" and "broke it" look identical
    const want = ['hold', 'reaction'], gone = ['timing', 'spot'];
    const missing = want.filter(g => !heldSeen.has(g));
    const stillHolding = gone.filter(g => heldSeen.has(g));
    missing.length ? bad('6.3 a complicated result waits for a tap', 'never held: ' + missing.join(', ')) : ok(`6.3 Estimate and Reaction hold their result until it is tapped (${want.join(', ')})`);
    stillHolding.length ? bad('3.9 Timing and Spot no longer wait for a tap', 'still holding: ' + stillHolding.join(', ')) : ok(`3.9 tap-to-continue is gone from ${gone.join(' and ')} — they advance on their own`);
  }
  // v14 (6.18): five Stopwatch rounds averaging 7s ask for exactly 35.00s — the targets are generated so the total lands on the
  // stated average, so no run is ever dealt a harder set of targets than another
  {
    if (!askedSetTot) bad('6.18 the Stopwatch Set deals to an exact total', 'the engine never reported one');
    else if (askedSetTot.all.toFixed(2) !== '35.00') bad('6.18 five rounds averaging 7s ask for 35.00s', 'the run asked for ' + askedSetTot.all + 's');
    else if (Math.abs(askedSetTot.asked - askedSetTot.all) > 0.005) bad('6.18 the last round lands on the stated total', askedSetTot.asked + ' of ' + askedSetTot.all);
    else ok(`6.18 Stopwatch · Set deals five targets totalling exactly ${askedSetTot.all.toFixed(2)}s — the exact-mean deal survives §3`);
    /* v18 (B.3d) REVERSES v16 §3, and B.2 is why. v16 took the baseline off the Set on the reasoning that a Set was scored
       on a MEAN and the total the game had asked for was decoration; B.2 makes the Set a TOTAL, so the total it was
       measured against is the thing it is measured against. The Streak loses it instead: its own HUD already carried two
       climbing second-figures and Aiden's note is that the third was noise. The assertion runs both ways, because
       "moved it" and "lost it" look identical from one side. */
    /^[\d.]+s of [\d.]+s asked$/.test(askedSet) ? ok(`B.3d Timing · Set carries the baseline it is now totalled against ("${askedSet}")`)
             : bad('B.3d the Stopwatch Set shows what it asked for', 'the line read "' + askedSet + '"');
    askedStreakLine ? bad('B.3d the Stopwatch Streak drops the targets line', 'it still showed "' + askedStreakLine + '"')
             : ok('B.3d Timing · Streak shows no targets line — the budget and the spend are the only two numbers left');
  }
  // v16 (A.3): the Ready gate appeared on the first run of a game — every game the driver played had to answer one
  {
    const want = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
    const miss = want.filter(g => !readySeen.has(g));
    miss.length ? bad('A.3 "Ready?" ends the first intro of each game', 'never seen on: ' + miss.join(', '))
                : ok('A.3 a player\'s first run of each game ends its intro on "Ready?" (all seven)');
  }
  // the timed games have no Streak (Sprint / Dash / Marathon are seconds) — noted, not a failure
  ok('quick-tap and dots: timed, no Streak length to run (L2)');
  ok('sequence: one length family (keys), the run is its own streak');
}
