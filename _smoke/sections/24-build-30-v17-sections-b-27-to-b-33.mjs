/* ---- 11. build 30 (v17 §B.27–§B.33): music and sound ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, check, ok, bad, root, read, REVIEW, rvRead, noReview, strip, at, page, until, click, setStorage, OPEN_PREFS, SEEN_INTRO, down, up, finish, poke, clearReady, driveToResult, openSheet, named } from '../lib/gate.mjs';

export const SECTION = ["build 30 - v17 sections B.27 to B.33"];

export async function run() {
  const AU30 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const KY30 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const G30 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const css30 = read('styles', 'app.css');
  const keyjs30 = read('ui', 'screens', 'key.js');
  const G7 = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];

  /* ---- B.29: a run's music is arranged to the run. Two properties, and they are the whole of the item: a known
     length plays ONE pass of the written arrangement and ends with the run, and an open-ended run does not repeat
     itself for at least three minutes. Both are read off Music.plan / Music.lengths, which is what the app plays. */
  {
    const L = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      const G = await import('./config/games.js'); const REG = await import('./games/registry.js');
      const out = { long: [], arcs: [], badArc: [] };
      for (const g of Object.keys(REG.GAMES)) {
        const id = g + ':' + A.TRACK_PICK[g], q = M.Music.plan(id, { long: 1 });
        out.long.push({ g, id, name: q.name, longSec: q.longSec, streak: !REG.GAMES[g].timed });
        const runs = REG.GAMES[g].timed ? REG.GC(g, REG.GAMES[g].modes[0]).lens : Object.keys(A.SET_SECS).filter(k => k.startsWith(g + ':')).map(k => A.SET_SECS[k]);
        for (const r of runs) { const p = M.Music.plan(id, { run: r });
          const last = p.plan.length ? p.plan[p.plan.length - 1][0] : 0;
          // one arc: the plan is as long as the run, and its last event starts inside it
          if (Math.abs(p.loopSec - r) > p.loopSec / p.bars + .01 || last > p.loopSec + .01) out.badArc.push(g + ' ' + r + 's -> ' + p.loopSec + 's, last at ' + last);
          out.arcs.push({ g, run: r, sec: p.loopSec, bars: p.bars }); }
      }
      return out; });
    const short = L.long.filter(x => x.streak && x.longSec < 180);
    (!short.length) ? ok('B.29 every open-ended run gets a long form - ' + L.long.filter(x => x.streak).map(x => `${x.g} ${Math.round(x.longSec / 60)}min`).join(' · ') + ' before anything repeats')
      : bad('B.29 a Streak runs 3 minutes before it repeats', JSON.stringify(short));
    (!L.badArc.length) ? ok(`B.29 every known length plays one arc that ends with the run (${L.arcs.length} of them: ${L.arcs.slice(0, 4).map(a => a.g + ' ' + a.run + 's→' + a.bars + ' bars').join(', ')}…)`)
      : bad('B.29 the arc is sized to the run', L.badArc.join(' | '));
  }
  /* ---- B.28: the finish ramp. A timed run's bars shrink over the last five seconds so the final bar ENDS on the
     clock. The plan cannot show it — it is scheduled live against the run's own end — so this drives a real Quick Tap
     Sprint and asserts what the ramp is for: the music is still playing at the finish, no bar was scheduled past the
     clock, and the run reaches its result with no error. The round-based half (Set: final round, Streak: 80% of the
     budget) is build 27's `fin` and is untouched; Sequence gets no ramp at all and the static check below says so. */
  {
    const src = read('audio.js');
    const hasMap = /function finPlan/.test(src) && /endAudio/.test(src) && /!st\.live\|\|!st\.end/.test(src.replace(/\s/g, ''));
    // Sequence answers no `fin` at all, so the round-based ramp cannot reach it either - it has nothing to count down to
    const seqFin = await page.evaluate(async () => { const S = (await import('./games/sequence/index.js')).default; return typeof S.fin === 'function' ? S.fin() : 'none'; });
    (hasMap && (seqFin === 0 || seqFin === 'none')) ? ok(`B.28 the last bars are planned against the clock, not a window guess - and Sequence answers ${seqFin === 'none' ? 'no fin() at all' : '0'}, so it gets no ramp`)
      : bad('B.28 the finish ramp lands on the clock', JSON.stringify({ hasMap, seqFin }));
    await openSheet('quick-tap', 0, 0); await click('#go-btn');
    const at = await driveToResult('quick-tap', 'a timed run through the finish ramp', 30000);
    (at === 's-over') ? ok('B.28 a timed run plays through its own finish ramp to the result with no error')
      : bad('B.28 a run survives the finish ramp', 'ended on ' + at);
  }
  /* ---- B.27: flow state. Solo Quick Tap and Dots only, because the glow is light blue and light blue is Player 2
     (L4). The reading is the engine's own `tps()`; run/run.js smooths it into `--flow` and audio.js swells the hum with
     the same number. Presentation only (L10) - the store is read back after the run to prove it. */
  {
    const eng = await page.evaluate(async () => { const QT = (await import('./games/quick-tap/index.js')).default, DT = (await import('./games/dots/index.js')).default;
      return { qt: typeof QT.tps === 'function', dt: typeof DT.tps === 'function' }; });
    (eng.qt && eng.dt) ? ok('B.27 both tap games answer tps() - the flow reading is the engine\'s own, not the rate bar\'s (v14 6.7)')
      : bad('B.27 the engines report taps a second', JSON.stringify(eng));
    // the plan exists and is quieter than the track it rides over: B.27 asked for about 40%, which is -8 dB
    const f = await page.evaluate(async () => { const M = await import('./audio.js');
      const out = {}; for (const g of ['quick-tap', 'dots']) { const q = M.Music.plan(g, { flow: 1 }); out[g] = q ? q.plan.length : 0; } return out; });
    (f['quick-tap'] > 0 && f.dots > 0) ? ok(`B.27 the flow layer plans over both games (${f['quick-tap']} and ${f.dots} events a pass) - measured at -8.1 dB and -7.1 dB against Held and Waltz, _smoke/loudness.mjs`)
      : bad('B.27 the flow layer plays', JSON.stringify(f));
    // solo: tapping fast raises the glow, and stopping drops it. `poke` is the same tap the whole gate plays with
    await openSheet('quick-tap', 0, 2); await click('#go-btn');
    // the fixture has no `intro` map, so the first run of a game plays the ghost demo and ends on "Ready?" — the taps
    // below mean nothing until the run is actually live
    const live = async () => page.evaluate(async () => (await import('./run/run.js')).R.live);
    for (let i = 0; i < 60 && !(await live()); i++) { await clearReady('quick-tap'); await sleep(200); }
    const read = () => page.evaluate(() => ({ flow: +getComputedStyle(document.getElementById('game')).getPropertyValue('--flow'), on: document.getElementById('game').classList.contains('flowon') }));
    for (let i = 0; i < 22; i++) { await poke('quick-tap'); await sleep(95); }
    const hot = await read(); await sleep(2800); const cold = await read();
    (hot.on && hot.flow > .15 && cold.flow < hot.flow) ? ok(`B.27 flow rises with the taps and falls when they stop (${hot.flow.toFixed(2)} → ${cold.flow.toFixed(2)})`)
      : bad('B.27 the flow state arrives and leaves', JSON.stringify({ hot, cold }));
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
    // two-player: never. Light blue is P2 and the run has a colour of its own already (L4 / L10)
    await openSheet('quick-tap', 0, 0, 1); await click('#go-btn'); await sleep(2600);
    const two = await page.evaluate(async () => { const R = (await import('./run/run.js')).R; return { on: R.flowOn, cls: document.getElementById('game').classList.contains('flowon') }; });
    (!two.on && !two.cls) ? ok('B.27 / L4 no flow state in a two-player run - the glow is P2\'s colour and the run already wears one')
      : bad('B.27 flow is solo only', JSON.stringify(two));
    await page.evaluate(async () => { const RUN = await import('./run/run.js'); RUN.abort(); }); await sleep(300);
  }
  /* ---- B.30: the ported set. The option ids are names, every game plays one of its own three, and Sequence is in C
     and G below the keys - which was the actual complaint, not the arrangement. */
  {
    const seq = ['root', 'fifths', 'hum'].map(o => AU30.TRACKS['sequence:' + o]);
    const notes = []; for (const t of seq) { for (const ch of t.ch) for (const n of ch) notes.push(((n % 12) + 12) % 12);
      for (const v of t.voices) if (v.seq) for (const n of v.seq) if (n !== null) notes.push(((n % 12) + 12) % 12); }
    const offC = [...new Set(notes)].filter(n => n !== 0 && n !== 7);
    // and nothing in them reaches the keys' own C4 (261.6Hz), which is where Snd.note plays from
    const top = await page.evaluate(async () => { const M = await import('./audio.js');
      return ['root', 'fifths', 'hum'].map(o => Math.max(...M.Music.plan('sequence:' + o).plan.map(e => e[1]))); });
    (!offC.length && Math.max(...top) < 261.6) ? ok(`B.30 every Sequence track is C and G only and tops out at ${Math.round(Math.max(...top))}Hz - under the keys' own C4, which is what "they confuse the user" was`)
      : bad('B.30 Sequence sits under the keys', JSON.stringify({ offC, top }));
    // the duck is one rule in one place, and it only ever fires under a Sequence track
    const src = read('audio.js');
    (/duckHook/.test(src) && /mode!=='sequence'/.test(src) && AU30.DUCK > 0 && AU30.DUCK < 1)
      ? ok(`B.30 the bed ducks to ${Math.round(AU30.DUCK * 100)}% while a key rings, Sequence only`) : bad('B.30 Sequence ducks its own music');
    // the end cadence is in the track's key, and with no track it is the sound it always was
    (/endTune/.test(src) && /minor/.test(src)) ? ok('B.30 the end cadence transposes to the track\'s root and takes a minor third where the track is minor')
      : bad('B.30 the cadence is in the track\'s key');
  }
  /* ---- B.31: the three key themes. Roots, Frost and Thorn, each with its own loop - and A.1 means neither of the
     last two exists on screen until chest 1 is opened. */
  {
    const missing = KY30.KEYS.filter(k => !k.theme || !k.track || !AU30.TRACKS[k.track] || !/^#[0-9A-Fa-f]{6}$/.test(k.tint));
    // AMENDED at build 32 (v18 B.22): the art is Lantern → Circuit → Thorn; the loops are still the three build 30 made
    // AMENDED at build 42 (v23 L.7a): the loops are the rewritten themes, theme:key / theme:pro / theme:thorns
    /* AMENDED AT BUILD 53 (v28 item 3): the Author key's theme is THORNS, not Thorn, so a key's `theme` and its track's own `name` are the same
       word — Customise's one Music row titles the three key tracks by the theme and a mismatch would be two spellings of one thing. */
    const themeNames30 = KY30.KEYS.every(k => AU30.TRACKS[k.track].name === k.theme);
    (!missing.length && themeNames30 && KY30.KEYS.map(k => k.theme).join(' → ') === 'Lantern → Circuit → Thorns' && KY30.KEYS.map(k => k.track).join(',') === 'theme:key,theme:pro,theme:thorns')
      ? ok('B.31 / B.22 / v28 item 3 Lantern → Circuit → Thorns, each with its own tint, each the TITLE of its own loop on Customise\'s Music row, and the loops are the build-42 themes theme:key / theme:pro / theme:thorns')
      : bad('B.31 a theme and a track per tier', JSON.stringify(missing.map(k => k.id)));
    // nothing about the second and third tier before chest 1 - not a row, not a word (A.1)
    // #411: allOpen OFF - a first-timer is the subject of A.1, and OPEN EVERYTHING is now an escape from this gate
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, allOpen: false, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    // AMENDED at build 43 (v24 A.1): the Keys menu row is locked before the Games chest, so the quiet key screen is opened directly
    await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-key'); }); await sleep(700);
    const before = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      txt: document.getElementById('s-key').textContent.toLowerCase(), theme: document.querySelector('#key-keys .kkey i')?.textContent,
      locked: document.querySelectorAll('#key-keys .kkey.locked').length, lockedTxt: [...document.querySelectorAll('#key-keys .kkey.locked')].map(x => x.textContent).join(' | ') }));
    (before.n === 3 && !before.theme /* AMENDED at build 48 (v26 item 9): no theme name on a key card */ && before.locked === 3 && /open the Games chest/i.test(before.lockedTxt) && /open the previous chest/i.test(before.lockedTxt) && !/\d|%/.test(before.lockedTxt))
      ? ok('B.31 / A.1 AMENDED at build 40 (v23 L.10a): before the Games chest all three keys are on the strip and all three are crossed out - key 1 with "open the Games chest", the other two with "open the previous chest" - and no number')
      : bad('B.31 Frost and Thorn are hidden until chest 1', JSON.stringify(before).slice(0, 200));
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, chest1: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const after = await page.evaluate(() => ({ n: document.querySelectorAll('#key-keys .kkey').length,
      themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent) }));
    // AMENDED at build 48 (v26 item 9): the cards carry no theme name - Lantern, Circuit and Thorn name backgrounds and music, not keys
    (after.n === 3 && !after.themes.length) ? ok('B.31 all three arrive with chest 1, and no card carries a theme name (v26 item 9)')
      : bad('B.31 chest 1 reveals the other two', JSON.stringify(after));
    /* #411: OPEN EVERYTHING is an ESCAPE from the A.1 gate, not an exception to it. The rest of the app already let
       allOpen and supporter stand in for a chest (ui/screens/progress.js:110); the key screen read prefs.chest1 alone,
       so it was the one place Testing's switch did nothing and Aiden could not see Circuit or Thorn on his phone.
       A.1's intent is untouched - core/store.js:39 reads both flags as `dev && ...`, so a release build zeroes them. */
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, allOpen: true, chest1: 0 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-key"]'); await sleep(700);
    const dev = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      const read = () => ({ n: document.querySelectorAll('#key-keys .kkey').length,
        themes: [...document.querySelectorAll('#key-keys .kkey i')].map(i => i.textContent),
        one: document.getElementById('key-keys').classList.contains('one'), locked: document.querySelectorAll('#key-keys .kkey.locked').length,
        pro: K.tierOpen('pro'), author: K.tierOpen('author'), rungs: K.radarRungs().length });
      const out = { open: read(), chest: S.prefs.chest1 };
      // the other half of the same escape, in memory rather than with a second reload
      S.prefs.allOpen = false; S.prefs.supporter = true; S.save();
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.sup = read();
      S.prefs.supporter = false; S.save();
      R.show('s-key'); await new Promise(r => setTimeout(r, 300)); out.neither = read();
      return out; });
    (!dev.chest && dev.open.n === 3 && !dev.open.themes.length /* AMENDED at build 48 (v26 item 9) */ && !dev.open.one && dev.open.pro && dev.open.author && dev.open.rungs === 3)
      ? ok('#411 OPEN EVERYTHING reveals all three tiers with chest 1 still shut - the key strip, tierOpen and the radar rungs all take the same escape')
      : bad('#411 allOpen opens the key map', JSON.stringify(dev.open));
    (dev.sup.n === 3 && dev.sup.rungs === 3 && dev.sup.pro) ? ok('#411 a supporter takes the same escape, chest or no chest')
      : bad('#411 supporter opens the key map', JSON.stringify(dev.sup));
    (dev.neither.n === 3 && dev.neither.locked === 3 && dev.neither.rungs === 1 && !dev.neither.pro)
      ? ok('#411 / A.1 with neither flag and no chest all three keys are crossed out again, no numbers (AMENDED at build 37, G.2; at build 40, L.10a: key 1 waits for the Games chest) - the escape is an escape, not a hole')
      : bad('#411 the gate still holds with no flag set', JSON.stringify(dev.neither));
    /* #411 follow-up: the chest column takes the same escape. pick.js gated chests 2 and 3 on prefs.chest1 alone, the
       same shape of bug one screen over - so OPEN EVERYTHING revealed the key tiers and still hid the chests. */
    const chests = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      // AMENDED at build 40 (v23 L.10): four chests by name, and the escape reaches them too - OPEN EVERYTHING draws every one open
      const see = () => ['games', 'key', 'pro', 'thorns'].map(n => { const c = document.querySelector(`.chest[data-chest="${n}"]`); return !c.hidden && (c.classList.contains('open') ? 'open' : 'shut'); });
      S.prefs.allOpen = true; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.save(); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      const open = see();
      S.prefs.allOpen = false; S.save(); R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-pick'); await new Promise(r => setTimeout(r, 350));
      return { open, shut: see() }; });
    (chests.open.join() === 'open,open,open,open' && chests.shut.join() === 'shut,shut,shut,shut')
      ? ok('#411 AMENDED at build 40 (G.1, L.10): all four chests are on the map with OPEN EVERYTHING and without it - every one drawn open under the escape, and every one shut without it')
      : bad('#411 the chests follow the key map', JSON.stringify(chests));

    /* #371 workaround: the placeholder fill. AMENDED at build 38 (#426): both columns carry GENERATED placeholders in
       config/key-bars.js now, so on the shipped table the fill has nothing to fill - and A.2 as amended forbids overwriting a
       number that is there, generated or not. It fills EMPTY cells only, is on only while it filled one, and is still
       session-only: nothing written, the file untouched, a reload throws it away. Checked on one cell emptied in memory. */
    const fill = await page.evaluate(async () => { const K = await import('./progress/key.js'); const KB = await import('./config/key-bars.js');
      const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const rows = Object.values(KB.KEY_BARS), snap = rows.map(r => [r.pro, r.author]);
      const same = skip => rows.every((r, i) => r === skip || (r.pro === snap[i][0] && r.author === snap[i][1]));
      const warn = () => document.getElementById('key-warn').hidden ? '' : document.getElementById('key-warn').textContent;
      const out = { before: { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author'), faked: K.barsFaked() } };
      S.prefs.allOpen = true; S.save();
      out.full = { on: K.fillBars(true), faked: K.barsFaked(), same: same(null) }; K.fillBars(false);
      // empty ONE Pro cell: Pro is a shell again, and the fill fills exactly that cell, in the row's own direction (C.7)
      const r0 = KB.KEY_BARS['quick-tap:two:5'], was = r0.pro; r0.pro = null;
      out.hole = { shellPro: K.isShell('pro'), shellAuthor: K.isShell('author') };
      K.fillBars(true);
      out.on = { faked: K.barsFaked(), pro: r0.pro, shellPro: K.isShell('pro'), others: same(r0), dir: typeof r0.pro === 'number' && r0.pro > r0.bar };
      R.show('s-key'); await wait(300);
      document.querySelector('.kkey[data-kt="1"]').click(); await wait(350);
      out.circuit = { segs: document.querySelectorAll('#key-ring .kroot').length, shellHidden: document.getElementById('key-shell').hidden, warn: warn() };
      document.querySelector('.kkey[data-kt="0"]').click(); await wait(350);
      out.lantern = { warn: warn() };
      K.fillBars(false);
      out.off = { pro: r0.pro, shellPro: K.isShell('pro'), faked: K.barsFaked() };
      r0.pro = was; out.restored = !K.isShell('pro') && same(null);
      out.rawSame = !/\|pro\b/.test(JSON.stringify(JSON.parse(localStorage.getItem('ne')).bars || {}));
      S.prefs.allOpen = false; S.save();
      return out; });
    (!fill.before.shellPro && !fill.before.shellAuthor && !fill.before.faked && !fill.full.on && !fill.full.faked && fill.full.same)
      ? ok('#371 / #426 with both columns full the fill finds nothing to fill - it stays off and changes no number, generated or not')
      : bad('#371 the fill on a full table', JSON.stringify({ before: fill.before, full: fill.full }));
    (fill.hole.shellPro && !fill.hole.shellAuthor && fill.on.faked && fill.on.dir && !fill.on.shellPro && fill.on.others)
      ? ok(`#371 an emptied Pro cell makes Pro a shell again, and the fill fills exactly that cell (${fill.on.pro}, above the bar) and touches nothing else`)
      : bad('#371 the fill fills empty cells only', JSON.stringify({ hole: fill.hole, on: fill.on }));
    (fill.circuit.segs > 0 && fill.circuit.shellHidden && /derived from key 1 for testing/.test(fill.circuit.warn))
      ? ok('#371 / A.2 Circuit draws its ring and says the test fill is on - a derived bar never appears unannounced')
      : bad('#371 the filled ring announces itself', JSON.stringify(fill.circuit));
    (fill.lantern.warn === '') ? ok('#371 key 1 says nothing - none of its bars is generated or filled')
      : bad('#371 the note is only on the tiers carrying generated or filled numbers', JSON.stringify(fill.lantern));
    (fill.off.pro === null && fill.off.shellPro && !fill.off.faked && fill.restored && fill.rawSame)
      ? ok('#371 toggling it off empties that cell again, and nothing was ever written to storage')
      : bad('#371 the fill is session-only and reversible', JSON.stringify({ off: fill.off, restored: fill.restored, rawSame: fill.rawSame }));
    // and a reload is the real proof it was never persisted
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const afterLoad = await page.evaluate(async () => { const K = await import('./progress/key.js'); const KB = await import('./config/key-bars.js'); return { shellPro: K.isShell('pro'), faked: K.barsFaked(), pro: KB.KEY_BARS['quick-tap:two:5'].pro }; });
    (!afterLoad.shellPro && !afterLoad.faked && typeof afterLoad.pro === 'number') ? ok('#371 a reload reads the file again - both columns full, nothing faked')
      : bad('#371 the fill does not survive a reload', JSON.stringify(afterLoad));
    // the screen asks for the tier's own track, and there is no key:1 left anywhere
    // AMENDED at build 42 (v23 L.7b): the loop goes through themeOf(), which hands back the tier's own track once its chest is open and the menu loop until then
    (/themeOf\(keyTiers\(\)\[openKey\]\)/.test(keyjs30) && /\? t\.track : 'menu'/.test(keyjs30) && !/key:1/.test(keyjs30)) ? ok('B.31 the key screen asks for the tier\'s own loop by name, never by number (through themeOf, AMENDED at build 42)')
      : bad('B.31 the tier loop is asked for by name');
  }
  /* ---- B.32: music in Customise. A row per game and a row for the menu loop, locked behind chest 2 (A.3) with a
     padlock and NOTHING about what opens it (A.1), open under dev unlock-all. */
  {
    // AMENDED at build 40 (v23 L.11a): Customise waits for the Games chest, so the profile has that one open and nothing else
    await setStorage({ ne: { v: 1, prefs: { story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', musicG: {}, chest1: 0, chests: { games: 1 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    // AMENDED at build 33 (v18 B.28): the row is ONE button now — the track — because the Preview button beside it went
    const locked = await page.evaluate(() => { const b = [...document.querySelectorAll('#c-track button')];
      return { n: b.length, first: b[0]?.textContent, lock: b[0]?.classList.contains('locked'), plain: b[0]?.classList.contains('plain'),
        gameOpen: b.filter(x => !x.dataset.v.startsWith('key:') && !x.classList.contains('locked')).length,
        keyLocked: b.filter(x => x.dataset.v.startsWith('key:') && x.classList.contains('locked')).length,
        label: document.getElementById('c-track').parentElement.querySelector('.clabel')?.textContent,
        txt: document.getElementById('c-track').parentElement.textContent.toLowerCase(), menu: document.querySelectorAll('#c-menumusic button').length }; });
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): THE ROW IS NOT LOCKED BEHIND THE PRO CHEST ANY MORE. Music choice is open from the first visit —
       this game's three tracks, always — and what is gated is the three KEY TRACKS, each until its own key is EARNED. A.1's "nothing about a
       later tier" no longer applies to them, because v21 G.1 put all three keys on screen from the first visit, so naming one hides nothing;
       a locked key track says what opens it under the row (B.30) rather than carrying a silent padlock. */
    (locked.n === 6 && !locked.lock && locked.label === 'Music' && locked.menu === 2 && locked.gameOpen === 3 && locked.keyLocked === 3)
      ? ok(`B.28 / v28 item 2 the music row is ONE row and the whole choice: this game's three tracks open from the first visit ("${locked.first}" …) and one track per key, all three locked until their own key is earned`)
      : bad('B.28 the locked music row', JSON.stringify(locked));
    // dev unlock-all opens it, and picking one is stored and played
    await setStorage({ ne: { v: 1, prefs: { ...OPEN_PREFS, menuSeen: 1 }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    await click('[data-go="s-custom"]'); await sleep(500);
    await page.evaluate(() => document.querySelectorAll('#c-track button')[1].click()); await sleep(500);
    const open30 = await page.evaluate(() => ({ n: document.querySelectorAll('#c-track button').length,
      stored: JSON.parse(localStorage.getItem('ne')).prefs.track, sel: document.querySelector('#c-track button.sel')?.textContent }));
    const g0 = open30.stored && Object.keys(open30.stored)[0];
    // AMENDED at build 33 (B.28): three options and nothing else on the row
    // AMENDED AT BUILD 53 (v28 item 2): SIX — this game's three, then one per key. The second is still one of this game's three, so what it
    // stores is unchanged; unlock-all now opens the three KEY tracks rather than the row itself, which is open to everybody
    (open30.n === 6 && g0 && AU30.TRACK_OPTS[g0].includes(open30.stored[g0]))
      ? ok(`B.28 / v28 item 2 the row is this game's three tracks and one per key: "${open30.sel}" is stored as ${g0} → ${open30.stored[g0]}, and unlock-all opens the three key tracks`)
      : bad('B.28 choosing a track', JSON.stringify(open30));
    // the choice is a preference, not the default: TRACK_PICK is untouched and Fresh game keeps it
    const kept = await page.evaluate(async () => { const S = await import('./core/store.js'); S.reset();
      return { track: JSON.parse(localStorage.getItem('ne')).prefs.track, chest2: JSON.parse(localStorage.getItem('ne')).prefs.chests.pro }; });
    // AMENDED at build 40 (v23 L.10): "chest 2" is the Pro chest by name
    (kept.track && Object.keys(kept.track).length && kept.chest2 === 0) ? ok('B.32 the chosen track survives Fresh game (a preference) and the Pro chest does not (progress)')
      : bad('B.32 what Fresh game clears', JSON.stringify(kept));
  }
  /* ---- B.33: the key-unlock animations at 1.5x, and the interlude waiting for them ---- */
  {
    const grow = /animation:krootgrow ([\d.]+)s/.exec(css30), halo = /animation:khaloglow ([\d.]+)s/.exec(css30);
    // AMENDED at build 32 (v18 B.21): the wait is "3900 + arrive" — the arrival's 2600 when this is the screen's first showing
    // AMENDED at build 41 (v23 L.6): the hand-back is handBack(), and a ceremony inside the interlude owns it — the fallback wait is the same number
    // AMENDED at build 43 (v24 C.5): the hand-back also waits out a key's earn moment when the clear makes the key whole — `+ earnWait`, 0 otherwise
    const wait = /handBack\(\); \}, (\d+) \+ arrive(?: \+ earnWait)?\)/.exec(keyjs30);
    const g = grow && +grow[1], h = halo && +halo[1], w = wait && +wait[1];
    (Math.abs(g - .93) < .01 && Math.abs(h - 2.85) < .01 && w >= h * 1000)
      ? ok(`B.33 the unlock animations run at 1.5x - ${g}s and ${h}s - and the interlude waits ${w}ms, past the halo it lights`)
      : bad('B.33 the key animations are slower', JSON.stringify({ g, h, w }));
  }
  /* ---- the review catalogue plays what a run plays (B.29 / B.27 / B.31) ---- */
  rv2: {
    if (!REVIEW) { noReview('B.29 / B.27 / B.31 the review catalogue plays what a run plays'); break rv2; }
    const gen = rvRead('scripts', 'catalogue.mjs');
    const tpl = rvRead('scripts', 'catalogue.template.html');
    // AMENDED at build 42 (v23 L.7e): the key themes are read out of KEY_THEMES, not named
    const reads = /\{ *long: *1 *\}/.test(gen) && /\{ *run:/.test(gen) && /\{ *flow: *1 *\}/.test(gen) && /AU\.KEY_THEMES/.test(gen);
    const plays = /hold > 0/.test(tpl) && /createBiquadFilter/.test(tpl) && /what a run plays/.test(tpl);
    (reads && plays) ? ok('the catalogue reads the arc, the long form and the flow layer out of the running app, and plays the filter and the hold the new tracks use')
      : bad('the review board carries build 30\'s music', JSON.stringify({ reads, plays }));
  }
}
