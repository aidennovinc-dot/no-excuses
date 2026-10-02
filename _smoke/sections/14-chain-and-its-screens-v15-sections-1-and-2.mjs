// ---- 6d. the chain (v15 section 1) and the screens that carry it (v15 section 2), build 23 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, GAMES, sleep, check, ok, bad, finished, root, read, at, page, until, click, setStorage, SEEN_INTRO, finish, driveToResult, openSheet, named, boot, tapTitle } from '../lib/gate.mjs';

export const SECTION = ["the chain and its screens (v15 sections 1 and 2)"];

export async function run() {
  const { LEN_RULES, UNLOCKS: U } = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const { GAMES: GT } = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  const { ACH } = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  // 1.0a: the table is keyed 'game:mode'. A bare game key would silently give both modes the same numbers again
  { const keys = Object.keys(LEN_RULES);
    const bad_ = keys.filter(k => { const [g, d] = k.split(':'); return !GT[g] || !d || !GT[g].modes.includes(d); });
    bad_.length ? bad("1.0a LEN_RULES is keyed 'game:mode'", bad_.join(', ')) : ok(`1.0a LEN_RULES is keyed 'game:mode' — ${keys.length} rows, every one a real game and mode`); }
  // 1.5: the new Estimate · Grow row. A secret row must carry a hint (v14 8.5) or it shows the fallback line instead
  { const a = ACH.find(x => x.id === 'hd_max');
    (a && a.tier === 'secret' && a.hint && a.g === 'hold') ? ok(`1.5 hd_max "${a.name}" is a secret Estimate row with a hint`) : bad('1.5 the new Estimate · Grow achievement', JSON.stringify(a)); }
  // 2.5 static: the earning moved OUT of the result screen's ad-break callback and INTO the run. If it ever moves back,
  // an achievement earned on a run the player leaves before the ad clears is lost again, silently
  { const rs = read('ui', 'screens', 'result.js');
    const rn = read('run', 'run.js');
    const clean = /checkUnlocks|checkAch\(/.test(rs) === false;
    const banks = /checkUnlocks\(run\)/.test(rn) && /checkAch\(run\)/.test(rn) && rn.indexOf('checkUnlocks(run)') < rn.indexOf("emit('run:finish'");
    /* DELETED at build 55 (v29 item 2): `/function abort\(\)[\s\S]{0,400}liveCheck\(/`. abort() takes a `quiet` argument now and
       the live pass sits behind a `landed` test, so the regex fails on the new spelling — and CLAUDE.md:204 says a source-text
       check that fails on a refactor is deleted and named, never re-spelled. What it stood for is DRIVEN instead, in `the runs`:
       a quit before round 1 banks nothing, and a quit AFTER a round has landed still banks it. */
    (clean && banks) ? ok('2.5 the run banks every earn before run:finish; the result screen only shows them (the abort half is driven in `the runs`)')
      : bad('2.5 earns are banked by the run, not the result screen', `result clean ${clean} · run banks ${banks}`); }

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({}); await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  // 1.1-1.4: the seventeen values, checked through the predicates rather than by reading the table back at itself.
  // Each pair is [a record that must pass, a record that must not] — the second is the number one step short
  const V = await page.evaluate(async () => {
    const P = await import('./progress.js'); const R = await import('./progress/rules.js');
    const t = k => P.UNLOCKS.find(u => u.key === k).test;
    const qt = (s, hits, misses) => ({ g: 'quick-tap', d: 'two', s, hits, misses });
    const out = {};
    /* v17 (B.6 / B.7): FIFTEEN IN A ROW, in any Quick Tap · Two run. The pass is a Sprint - `s` came off `where` - with a
       row of 15 and misses on the record, which is the whole point: a miss resets the count, it does not disqualify the run.
       The fails are 14 in a row, 15 hits that were never consecutive, and Four itself. */
    out.qtFour = [t('quick-tap:four')({ ...qt(5, 20, 3), row: 15 }), t('quick-tap:four')({ ...qt(15, 30, 0), row: 14 }),
      t('quick-tap:four')({ ...qt(15, 15, 4), row: 6 }), t('quick-tap:four')({ ...qt(15, 20, 0), d: 'four', row: 15 })];
    // a record from BEFORE build 28 carries no `row` at all and is judged the old way, rather than being quietly un-earned
    out.qtFourLegacy = [t('quick-tap:four')(qt(15, 15, 0)), t('quick-tap:four')(qt(15, 14, 0)), t('quick-tap:four')(qt(15, 15, 1))];
    out.dtBlind = [t('dots:blind')(qt(30, 35, 2)), t('dots:blind')(qt(30, 34, 0))];
    out.dtLead = [t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 0, misses: 5 }), t('dots:lead')({ g: 'dots', d: 'blind', s: 5, hits: 9, misses: 4 })];
    out.hdGrow = [t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 0 }), t('hold:grow')({ g: 'dots', d: 'blind', s: 15, hits: 0, misses: 1 })];
    /* v16 (§2): the row asks for the FIRST NOTE WRONG, and the fixture had to change with the predicate. It used to be
       `hits: 0` — a score a Sequence run cannot reach, because `hits` is the longest pattern completed and derives from
       `round - 1` on a run that opens at round 3. The engine flags the run itself now, so the test reads the flag: set
       at any key count, absent on a run that answered its first note, and a high score with the flag still counts —
       getting the first note wrong on the FIRST try is the requirement, not scoring badly. */
    out.tmStop = [t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 2, firstWrong: 1 }),
      t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 3, hits: 2 }),
      t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 0 }),
      t('timing:stopwatch')({ g: 'timing', d: 'stopwatch', s: 5, hits: 2, firstWrong: 1 })];
    out.tmStop2 = [t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 3, hits: 2, firstWrong: 1 }), t('timing:stopwatch')({ g: 'sequence', d: 'solo', s: 7, hits: 12, firstWrong: 1 })];
    out.rxNogo = [t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 350 }), t('reaction:nogo')({ g: 'reaction', d: 'flash', s: 5, hits: 351 })];
    out.spCount = [t('spot:count')({ g: 'reaction', d: 'nogo', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 349 }), t('spot:count')({ g: 'reaction', d: 'flash', s: 5, hits: 400 })];
    // lengths, per mode — the numbers that differ between Blind and Lead are the whole reason for 1.0a
    const L = (g, d, i) => R.LEN_TEST[g + ':' + d][i];
    out.lens = { qtMar: [L('quick-tap', 'two', 2)({ hits: 24 }), L('quick-tap', 'two', 2)({ hits: 23 })],
      blindDash: [L('dots', 'blind', 1)({ hits: 40, misses: 9, row: 6 }), L('dots', 'blind', 1)({ hits: 40, misses: 0, row: 5 })],
      leadDash: [L('dots', 'lead', 1)({ hits: 40, misses: 9, row: 9 }), L('dots', 'lead', 1)({ hits: 40, misses: 0, row: 8 })],
      qtDash: [L('quick-tap', 'two', 1)({ hits: 40, misses: 9, row: 7 }), L('quick-tap', 'two', 1)({ hits: 40, misses: 0, row: 6 })],
      blindMar: [L('dots', 'blind', 2)({ hits: 22 }), L('dots', 'blind', 2)({ hits: 21 })],   // AMENDED at build 35 (#415, L6): 24 -> 22
      leadMar: [L('dots', 'lead', 2)({ hits: 28 }), L('dots', 'lead', 2)({ hits: 27 })],
      /* v17 (B.8): 80% off was unreachable — the measured ceiling on a Cut round is 44.5%. Ten, one step either side.
         v31 (60.5, build 60, L6 quoted — Aiden 2026-09-23): FIFTEEN, one step either side. The smallest reachable maximum miss
         is 25 (target 25), so 15 is still reachable at every target and on every shape, which is the whole of B.8's derivation. */
      cutStreak: [L('hold', 'cut', 1)({ y: 16 }), L('hold', 'cut', 1)({ y: 15 })],
      flashStreak: [L('reaction', 'flash', 1)({ hits: 501 }), L('reaction', 'flash', 1)({ hits: 500 })],
      // v31 (60.7, build 60, L6): a slow run with a round nobody tapped is disqualified; a record from before build 60 carries no `noTap` and is judged the old way
      flashNoTap: [L('reaction', 'flash', 1)({ hits: 900, noTap: 0 }), L('reaction', 'flash', 1)({ hits: 900, noTap: 1 }), L('reaction', 'flash', 1)({ hits: 900 })] };
    // build 24: Greedy is the engine's `mx` flag — the hold ran to its ceiling — not a % threshold. A big overshoot
    // with no `mx` must NOT earn it, or the row is just "miss by a lot" under another name
    out.hdMax = [R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, mx: 1, y: 174 }), R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, y: 684 }), R.ACH_TEST.hd_max({ g: 'hold', d: 'grow', s: 7, y: 120 })];
    // 1.0d: ONE record of the chain. Every requirement the app can show for a length is the string lenNeed builds
    const G = await import('./games/registry.js');
    out.oneRecord = [];
    for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (!i) return;
      const lk = P.lenLock(g, d, s, true); if (lk && lk.need !== P.lenNeed(g, d, s)) out.oneRecord.push(g + ':' + d + ':' + s); });
    return out; });
  const pair = (label, [yes, ...no]) => (yes && no.every(x => !x)) ? ok(label) : bad(label, JSON.stringify([yes, ...no]));
  pair('B.6 / B.7 Quick Tap · Four opens at 15 IN A ROW in any Two run - a Sprint with misses counts, 14 in a row does not, and Four itself does not', V.qtFour);
  pair('B.6 a record from before build 28 carries no row and is judged the old way', V.qtFourLegacy);
  pair('1.2a Dots · Blind opens at 35 hits in any Quick Tap run', V.dtBlind);
  pair('1.2b Dots · Lead opens on 5 misses in a Blind run (deliberate failure, v15 0.5)', V.dtLead);
  pair('1.3a Estimate · Grow opens on a Dots run with nothing pressed at all', V.hdGrow);
  pair('1.4a / §2 Timing · Stopwatch opens on the first note wrong — not on a low score, and not from another game', V.tmStop);
  V.tmStop2.every(Boolean) ? ok('§2 the first note wrong opens it at 3 keys and at 7, and a long run that opened badly still counts')
    : bad('§2 the first-note flag is what the row reads', JSON.stringify(V.tmStop2));
  pair('1.4c Go / No-go opens at a 350ms Flash Set, not 351', V.rxNogo);
  // 1.4d is the one row with TWO ways in — a Flash Set or a Go / No-go Set, built as Aiden wrote it. Cowork's note is that
  // this collapses 1.4c into it; the shape of the test says plainly that both doors are open, so a later change is visible
  /* ---- v31 (60.8, build 60, L6 quoted — Aiden 2026-09-23): SPOT · FIND ASKS FOR ROUND 6 OF A COUNT STREAK ----
     "reach round 5 in Spot · Count" was free: every Count SET is ten rounds, so finishing one satisfied it and the row asked for
     nothing. A Streak ends when the miscount budget is spent, so round 6 is a real ask. The check drives the predicate with the
     shape of record each mode actually writes, and asserts the SET no longer opens it however far it got. */
  { const f60 = await page.evaluate(async () => { const R = await import('./progress/rules.js'), U = await import('./config/unlocks.js');
      const t = R.UNLOCK_TEST['spot:find'], row = U.UNLOCKS.find(r => r.key === 'spot:find');
      return { need: row.need, where: row.where,
        streak6: !!t({ g: 'spot', d: 'count', s: -1, rounds: 6 }), streak5: !!t({ g: 'spot', d: 'count', s: -1, rounds: 5 }),
        set10: !!t({ g: 'spot', d: 'count', s: 10, rounds: 10 }), otherGame: !!t({ g: 'spot', d: 'find', s: -1, rounds: 9 }) }; });
    (f60.streak6 && !f60.streak5 && !f60.set10 && !f60.otherGame && /round 6/.test(f60.need) && /Streak/.test(f60.need) && f60.where.s === -1)
      ? ok(`60.8 (L6) Spot · Find asks for "${f60.need}": round 6 of a Count STREAK opens it, round 5 does not, and a finished ten-round Count SET no longer opens it by itself — which is what it did until build 60`)
      : bad('60.8 the Spot · Find unlock', JSON.stringify(f60)); }
  { const [nogo, flash, slow] = V.spCount;
    (nogo && flash && !slow) ? ok('1.4d Spot · Count opens on a Flash OR a Go / No-go Set under 350ms — both doors, per Aiden') : bad('1.4d Spot · Count', JSON.stringify(V.spCount)); }
  pair('1.1b Quick Tap Marathon asks 24 in a Dash', V.lens.qtMar);
  pair('B.6 Dots · Blind Dash asks 6 IN A ROW - a run with nine misses still qualifies, five in a row does not', V.lens.blindDash);
  pair('B.6 Dots · Lead Dash asks 9 in a row - the per-mode split (1.0a) is doing real work', V.lens.leadDash);
  pair('B.6 Quick Tap Dash asks 7 in a row', V.lens.qtDash);
  pair('1.2d / #415 Dots · Blind Marathon asks 22 (AMENDED at build 35, was 24)', V.lens.blindMar);
  pair('1.2f Dots · Lead Marathon asks 28', V.lens.leadMar);
  pair('60.5 (L6) Estimate · Cut Streak asks for one round more than 15% off — 10 until build 60, 80 until build 28, and 80 could never fire', V.lens.cutStreak);
  /* v31 (60.5): the SENTENCE and the PREDICATE are the same fact said twice, so they are checked against each other rather than
     each against a number. A build that moves one and not the other is exactly the failure this catches. */
  { const c60 = await page.evaluate(async () => { const U = await import('./config/unlocks.js'), R = await import('./progress/rules.js');
      const text = U.LEN_RULES['hold:cut'][1], n = +((text.match(/more than (\d+)%/) || [])[1]);
      const t = R.LEN_TEST['hold:cut'][1];
      return { text, n, over: !!t({ y: n + 1 }), at: !!t({ y: n }), under: !!t({ y: n - 1 }) }; });
    (c60.n === 15 && c60.over && !c60.at && !c60.under)
      ? ok(`60.5 (L6) the Cut Streak row's words and its predicate agree — "${c60.text}", and a run whose worst round is ${c60.n + 1}% off opens it while ${c60.n}% does not`)
      : bad('60.5 the Cut Streak text and predicate disagree', JSON.stringify(c60)); }
  pair('1.4b Reaction · Flash Streak asks for a Set averaging over 500ms', V.lens.flashStreak);
  { const f = V.lens.flashNoTap;
    (f[0] === true && f[1] === false && f[2] === true)
      ? ok('60.7 (L6) — and a tap in every round: a 900ms Set with no timed-out round opens the Streak, the same 900ms Set with one timed-out round does not, and a record from before build 60 (no `noTap` field) is judged the old way rather than un-earned')
      : bad('60.7 the Flash slow-run unlock', JSON.stringify(f)); }
  pair('1.5 the shape at its limit earns Greedy; merely overshooting does not', V.hdMax);
  (!V.oneRecord.length) ? ok('1.0d one record of the chain — every lock box and goal line reads the string lenNeed builds') : bad('1.0d a second copy of a requirement', V.oneRecord.join(', '));

  // 2.2: no Next card on a fresh profile's first menu open
  { await tapTitle(); await sleep(900);
    await sleep(400);
    // AMENDED at build 53 (v28 item 8): #menu-tag went with "unlock them all", so there is no subtitle left to be hidden
    const card = await page.evaluate(() => ({ hidden: document.getElementById('nextup').hidden, tag: !document.getElementById('menu-tag') }));
    (card.hidden && card.tag) ? ok('2.2 no Next card on a fresh profile\'s first menu open') : bad('2.2 the Next card on a fresh profile', JSON.stringify(card)); }

  // 2.5 behavioural: an unlock that fires mid-run is in localStorage after the player quits
  { const kept = await page.evaluate(async (intro) => {
      const RUN = await import('./run/run.js'); const S = await import('./core/store.js'); const ST = await import('./core/state.js');
      S.store.unlock = {}; S.store.ach = {}; S.store.intro = intro; S.save();   // v17 (B.4): past the intro, or the ghost has the engine
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 15, vs: 0, practice: 0 });
      RUN.start(); RUN.liveCheck({ hits: 15, misses: 0, row: 15 }); RUN.abort();
      let raw = null; try { raw = JSON.parse(localStorage.getItem('ne')); } catch (e) {}
      return { unlock: raw && raw.unlock ? Object.keys(raw.unlock) : [] }; }, SEEN_INTRO);
    kept.unlock.includes('quick-tap:four') ? ok('2.5 an unlock earned mid-run is in storage after the run is quit — no silent loss')
      : bad('2.5 a mid-run earn survives a quit', JSON.stringify(kept)); }

  // 2.1: a locked length on the RESULT screen shows its requirement instead of walking out to game select
  await setStorage({ 'ne.prefs': { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  // NB: not openSheet — that helper reseeds the profile with allOpen, and a profile with nothing locked cannot show this
  { await click('[data-go="s-pick"]'); await sleep(300);
    await page.evaluate(() => document.querySelector('.tile[data-game="quick-tap"]').click()); await sleep(300);
    await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[0].click()); await sleep(420);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn');
    const at = await driveToResult('quick-tap', '2.1 run for the locked chip', 60000);
    if (at !== 's-over') bad('2.1 a run to the result screen', 'ended on ' + at);
    else { const had = await page.evaluate(() => { const b = document.querySelector('#over-chips2 .chip.locked'); if (!b) return null; b.click(); return true; });
      await sleep(350);
      const st = await page.evaluate(() => ({ box: document.getElementById('lockwrap').classList.contains('on'), screen: document.querySelector('.screen.on')?.id, text: document.getElementById('lock-text').textContent.trim() }));
      if (had === null) bad('2.1 a locked length chip on the result screen', 'no locked chip to tap');
      else (st.box && st.screen === 's-over') ? ok(`2.1 tapping a locked length shows its requirement and stays put — "${st.text}"`) : bad('2.1 a locked chip must not navigate', JSON.stringify(st));
      await click('#lock-no'); await sleep(250); } }

  /* 2.4: the Unlocks screen, and every line on it read from the one table. TURNED OVER at build 58 (58.3): the Game unlocks tab is the
     GAMES CHEST tab, its rows are in the shared `#chest-list` host, and it opens as the first tab — the rule it stands for, that every
     requirement on it comes from UNLOCKS or lenNeed and never from a second copy, is exactly what it was. */
  await click('#over-back'); await sleep(300); await click('#s-pick .back'); await sleep(400);
  { await click('[data-go="s-prog"]'); await sleep(450);
    const u = await page.evaluate(async () => { const P = await import('./progress.js');
      const rows = [...document.querySelectorAll('#chest-list .urow')];
      const needs = rows.filter(r => r.classList.contains('lock') && !r.dataset.key).map(r => r.querySelector('small').textContent.trim());
      const known = new Set(P.UNLOCKS.map(x => x.need));
      const G = await import('./games/registry.js');
      for (const g in G.GAMES) for (const d of G.GAMES[g].modes) G.GC(g, d).lens.forEach((s, i) => { if (i) known.add(P.lenNeed(g, d, s)); });
      return { screen: document.querySelector('.screen.on')?.id, rows: rows.length, heads: document.querySelectorAll('#chest-list h4').length,
        stray: needs.filter(n => n && !known.has(n)) }; });
    // RESTATED at build 62 (61.26): TWO headings, games-and-modes and lengths — the third, "Skill key", went with the grey paragraph under it; the key is its own art at the foot now
    (u.screen === 's-prog' && u.rows > 0 && u.heads === 2 && !u.stray.length) ? ok(`2.4 the Games chest tab lists ${u.rows} rows under ${u.heads} headings, then the Skill key`) : bad('2.4 the Games chest tab', JSON.stringify(u));
    (!u.stray.length) ? ok('2.4 / L6 every requirement on the Unlocks screen comes from UNLOCKS or lenNeed — no second copy') : bad('2.4 a requirement written twice', u.stray.join(' | ')); }

  /* build 64 (62.13): A LENGTH UNLOCKED AND NEVER PLAYED IS GREEN EVERYWHERE, the result screen's chips included — Aiden's Dash after his first
     Sprint was plain grey there. One Sprint on record, Dash banked: green on the sheet (twice, so it is not L8's once-only mark), green on the
     result screen's chip (and still after the chips redraw), and plain once a Dash is on record */
  {
    const t0 = Date.now() - 60000, m = 'two', sprint = { t: t0, g: 'quick-tap', d: m, s: 5, hits: 14, misses: 0, v: 4 };
    await boot({}, { runs: [sprint], unlock: { 'quick-tap:two:15': t0 } });
    const sheet = () => page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-pick'); await new Promise(r => setTimeout(r, 300));
      document.querySelector('.tile[data-game="quick-tap"]').click(); await new Promise(r => setTimeout(r, 400)); document.querySelector('#diff-row .choice[data-diff="two"]').click(); await new Promise(r => setTimeout(r, 400));
      const b = document.querySelector('#time-row .tbtn[data-time="15"]'); const out = { np: b.classList.contains('newplay'), col: getComputedStyle(b).borderTopColor }; R.show('s-menu'); return out; });
    const s1 = await sheet(), s2 = await sheet();
    const over = async runs => page.evaluate(async ({ sprint, runs }) => { const S = await import('./core/store.js'), ST = await import('./core/state.js'), E = await import('./core/events.js');
      if (runs) S.store.runs = runs; ST.sel.game = 'quick-tap'; ST.sel.diff = 'two'; ST.sel.secs = 5; ST.sel.vs = 0;
      E.emit('run:record', { run: sprint }); E.emit('run:finish', { run: sprint, isBest: false, two: false, fresh: [], ach: [], adv: null });
      for (let i = 0; i < 60 && !document.getElementById('s-over').classList.contains('on'); i++) await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 300));
      const dash = () => document.querySelector('#over-chips2 .chip[data-v="15"]'), first = { np: dash().classList.contains('newplay'), col: getComputedStyle(dash()).borderTopColor };
      document.querySelector('#over-chips2 .chip[data-v="5"]').click(); await new Promise(r => setTimeout(r, 200));
      return { first, again: dash().classList.contains('newplay') }; }, { sprint, runs });
    const ok62 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ok').trim());
    const o1 = await over(null), o2 = await over([sprint, { ...sprint, t: t0 + 1000, s: 15, hits: 30 }]);
    (s1.np && s2.np && o1.first.np && o1.again && !o2.first.np && !o2.again)
      ? ok(`62.13 a banked, never-played Dash is green on the sheet (twice) and on the result screen's chip (${o1.first.col}), still after the chips redraw, and plain once a Dash is on record`)
      : bad('62.13 the never-played length', JSON.stringify({ s1, s2, o1, o2, ok62 }));
  }
  /* build 65 (64.11): EVERY LENGTH'S REQUIREMENT NAMES ITS MODE — Four's Dash asks for a Four Sprint, not "a Quick Tap Sprint". Every length of every
     game with more than one mode, read through lenNeed, the one place the sentence is built */
  {
    const r = await page.evaluate(async () => { const P = await import('./progress.js'), R = await import('./games/registry.js'), G = await import('./config/games.js'); const miss = [];
      for (const g in R.GAMES) { if (R.GAMES[g].modes.length < 2) continue; for (const d of R.GAMES[g].modes) R.GC(g, d).lens.forEach((s, i) => { if (!i) return; const n = P.lenNeed(g, d, s); if (!n.includes(G.MODE_NAME[d])) miss.push(g + ':' + d + ':' + s + ' "' + n + '"'); }); }
      return { miss, four: P.lenNeed('quick-tap', 'four', R.GC('quick-tap', 'four').lens[1]), fourM: P.lenNeed('quick-tap', 'four', R.GC('quick-tap', 'four').lens[2]) }; });
    (!r.miss.length && /Quick Tap · Four/.test(r.four) && /Quick Tap · Four/.test(r.fourM))
      ? ok(`64.11 every length requirement names its mode: "${r.four}", "${r.fourM}"`)
      : bad('64.11 a requirement without its mode', JSON.stringify(r));
  }
  /* build 65 (64.10): AN OPEN ROW KEEPS ITS REQUIREMENT, ticked and green — with what the player did and when where that run was recorded (Dash here),
     the requirement and the tick alone where it was not (Four, earned "before this build") */
  {
    const t = Date.now() - 3600000, run = { t, g: 'quick-tap', d: 'two', s: 5, hits: 16, misses: 0, v: 4 };
    await setStorage({ ne: { v: 7, prefs: { tut: 2, story: 1, gridSeen: 1, played: 1, menuSeen: 1, snd: 'off', menuUnl: { prog: 1 }, unlBy: { 'quick-tap:two:15': { g: 'quick-tap', d: 'two', s: 5, h: 16, t } } },
      runs: [run], ach: {}, unlock: { 'quick-tap:two:15': t, 'quick-tap:four': t }, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    await page.evaluate(async () => (await import('./ui/router.js')).show('s-prog', { tab: 'c-games' })); await sleep(500);
    const r = await page.evaluate(async () => { const P = await import('./progress.js'), U = (await import('./config/unlocks.js')).UNLOCKS, C = (await import('./config/copy.js')).UNLOCKS_SCREEN;
      const rowOf = q => { const b = document.querySelector(q); if (!b) return null; const sm = b.querySelector('small'); return { t: sm.textContent, col: getComputedStyle(sm).color, done: b.classList.contains('done') }; };
      const ok = (() => { const p = document.createElement('i'); p.style.color = 'var(--ok)'; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; })();
      return { dash: rowOf('#chest-list .urow[data-g="quick-tap"][data-d="two"][data-s="15"]'), four: rowOf('#chest-list .urow[data-g="quick-tap"][data-d="four"]:not([data-s])'), lock: rowOf('#chest-list .urow.lock'),
        dashNeed: P.lenNeed('quick-tap', 'two', 15), fourNeed: U.find(u => u.key === 'quick-tap:four').need, when: new Date(Date.now() - 3600000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), ok, you: C.you }; });
    const wantDash = '✓ ' + r.dashNeed + r.you.replace('{score}', '16').replace('{when}', r.when);
    (r.dash && r.dash.done && r.dash.t === wantDash && r.dash.col === r.ok && r.four && r.four.t === '✓ ' + r.fourNeed && r.four.col === r.ok && r.lock && !/^✓/.test(r.lock.t))
      ? ok(`64.10 an open row keeps its requirement, ticked and green: "${r.dash.t}"; one earned before this build: "${r.four.t}"; a locked row is unchanged, no tick`)
      : bad('64.10 open rows keep their requirement', JSON.stringify({ r, wantDash }));
  }
  /* build 68 (67.40, L6 quoted — wording only): "NO MISSES" IS GONE WHEREVER "IN A ROW" SAYS IT, and the next-unlock card's bar lines are the numbers
     the sentences say — every UNLOCK_BEST / LEN_BEST line equals the first number in its row's own words, so the bar, the words and the test agree */
  {
    // read in the page: progress/rules.js reaches the store, which only a browser can load
    const RU = await page.evaluate(async () => { const R = await import('./progress/rules.js');
      return { UNLOCK_BEST: Object.fromEntries(Object.entries(R.UNLOCK_BEST).map(([k, B]) => [k, { at: B.at }])), LEN_BEST: Object.fromEntries(Object.entries(R.LEN_BEST).map(([k, a]) => [k, a.map(B => B ? { at: B.at } : null)])) }; });
    const texts = U.map(u => u.need).concat(Object.values(LEN_RULES).flat().filter(Boolean));
    const first = s => +((String(s).match(/\d+(?:\.\d+)?/) || [])[0]);
    const off = [];
    for (const [k, B] of Object.entries(RU.UNLOCK_BEST)) { const u = U.find(x => x.key === k); const n = u ? first(u.need) : NaN; if (!(Math.abs(n - B.at) < 1e-9)) off.push(`${k} ${B.at} vs "${u && u.need}"`); }
    for (const [k, rows] of Object.entries(RU.LEN_BEST)) rows.forEach((B, i) => { if (!B) return; const t = (LEN_RULES[k] || [])[i]; if (first(t) !== B.at) off.push(`${k}[${i}] ${B.at} vs "${t}"`); });
    (!texts.some(t => /no misses/i.test(t)) && !off.length)
      ? ok(`L6 / 67.40 "no misses" is gone from every chain and length sentence that already says "in a row" (wording only); the card's ${Object.keys(RU.UNLOCK_BEST).length} unlock and ${Object.values(RU.LEN_BEST).flat().filter(Boolean).length} length bar lines each match their sentence's own number`)
      : bad('L6 / 67.40 the card lines and the words', JSON.stringify({ misses: texts.filter(t => /no misses/i.test(t)), off }));
  }
  /* build 68 (67.40): THE NEXT-UNLOCK CARD walked through the game — after the walkthrough's Sprint, Dash first (Aiden's "Dash → Four → Dots"), then
     Four, then Dots; Go / No-go and Spot · Count as ONE card; every mode open: "Open the Games chest"; the Skill key: the bar nearest clearing with
     "x of 30"; gone once the Author chest is open. The card's tap lands on that run, and the run's goal is the card's own pick */
  {
    const C = await page.evaluate(async () => { const C = await import('./config/copy.js'), G = await import('./config/games.js'), R = await import('./games/registry.js'), U = await import('./config/unlocks.js');
      return { NC: C.NEXT_CARD, GRID: C.GRID, dash: R.lenName('quick-tap', 15, 'two'), four: 'Quick Tap · ' + G.MODE_NAME.four, modes: U.UNLOCKS.filter(u => u.key.split(':').length === 2 && u.key !== 'sequence:practice').map(u => u.key) }; });
    const sprint = { g: 'quick-tap', d: 'two', s: 5, t: Date.now() - 6e4, hits: 9, misses: 2, row: 6, v: 4 };
    const pickAt = async (prefs, store) => { await setStorage({ ne: Object.assign({ v: 7, prefs: Object.assign({ story: 1, gridSeen: 1, menuSeen: 1, snd: 'off', played: 1, tut: 2, welcomeSeen: 1, menuUnl: { about: 1, prog: 1, board: 1 }, tuts: { next: 'done' } }, prefs), runs: [sprint], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} }, store) });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
      return page.evaluate(async () => { const N = await import('./progress/next.js'), p = N.nextPick(); (await import('./ui/router.js')).show('s-menu'); await new Promise(r => setTimeout(r, 400));
        const nx = document.getElementById('nextup'); return { p: p && { kind: p.kind, key: p.key, name: p.name, need: p.need, best: p.best, frac: p.frac, count: p.count || '' }, shown: !nx.hidden, html: nx.innerHTML, b: (nx.querySelector('b') || {}).textContent }; }); };
    const step = [];
    const all = keys => Object.fromEntries(keys.map(k => [k, Date.now()]));
    step.push(await pickAt({}, {}));
    step.push(await pickAt({}, { unlock: all(['quick-tap:two:15']) }));
    step.push(await pickAt({}, { unlock: all(['quick-tap:two:15', 'quick-tap:four']) }));
    const upTo = k => C.modes.slice(0, C.modes.indexOf(k));
    step.push(await pickAt({}, { unlock: all(['quick-tap:two:15', ...upTo('reaction:nogo')]) }));
    step.push(await pickAt({}, { unlock: all(['quick-tap:two:15', ...C.modes]) }));
    step.push(await pickAt({ chests: { games: 1 } }, { unlock: all(['quick-tap:two:15', ...C.modes]) }));
    step.push(await pickAt({ chests: { games: 1, key: 1, pro: 1, thorns: 1 } }, { unlock: all(['quick-tap:two:15', ...C.modes]) }));
    const [s0, s1, s2, s3, s4, s5, s6] = step;
    const okWalk = s0.p && s0.p.kind === 'len' && s0.p.name.endsWith(C.dash) && s0.p.best === '6' && s0.shown && s0.b === s0.p.name
      && s1.p && s1.p.key === 'quick-tap:four' && s1.p.name === C.four && !/no misses/.test(s1.p.need)
      && s2.p && s2.p.key === 'dots:blind'
      && s3.p && s3.p.key === 'reaction:nogo' && / and /.test(s3.p.name)
      && s4.p && s4.p.kind === 'chest' && s4.p.name === C.NC.chest.replace('{chest}', C.GRID.chest.games)
      && s5.p && s5.p.kind === 'bar' && / of \d+$/.test(s5.p.count) && typeof s5.p.frac === 'number'
      && s6.p === null && !s6.shown;
    okWalk
      ? ok(`67.40 the next-unlock card walks the game: "${s0.p.name}" (best ${s0.p.best}) → "${s1.p.name}" → "${s2.p.name}" → "${s3.p.name}" as one card → "${s4.p.name}" → a Skill bar, "${s5.p.name}" (${s5.p.count}) → gone once the Author chest is open`)
      : bad('67.40 the next-unlock card', JSON.stringify(step.map(x => x.p)));
    // the tap: Four's card lands on Quick Tap · Two at its longest open length, and the run's goal line is Four's own
    await pickAt({}, { unlock: all(['quick-tap:two:15']) });
    await page.evaluate(() => document.getElementById('nextup').click()); await sleep(1200);
    const g40 = await page.evaluate(async () => { const S = await import('./core/state.js'), R = (await import('./run/run.js')).R; return { g: S.sel.game, d: S.sel.diff, s: S.sel.secs, goal: R.goal && R.goal.key, seen: JSON.parse(localStorage.getItem('ne')).prefs.nextSeen }; });
    await page.evaluate(async () => (await import('./run/run.js')).abort(true)); await sleep(300);
    (g40.g === 'quick-tap' && g40.d === 'two' && g40.s === 15 && g40.goal === 'quick-tap:four' && g40.seen === 1)
      ? ok(`67.40 a tap on the card is "try to unlock": Quick Tap · Two on its longest open length (${g40.s}s), and the run's goal is the card's own pick (${g40.goal}); the card stops being green`)
      : bad('67.40 the card\'s tap and the run\'s goal', JSON.stringify(g40));
    // first menu after the walkthrough: the card glows green and its one box rings it, in the agreed words; during the walkthrough it is not there
    const nb = await page.evaluate(async () => (await import('./config/copy.js')).TUTORIAL.nextBox.replace(/\[\/?(green|yellow|red)\]/g, ''));
    await pickAt({ tuts: { next: 0 } }, {}); await sleep(600);
    const first40 = await page.evaluate(() => { const t = document.getElementById('tut'), nx = document.getElementById('nextup'); return { box: t && !t.hidden ? t.querySelector('p').textContent : null, green: nx.classList.contains('newthing'), shown: !nx.hidden }; });
    await setStorage({ ne: { v: 7, prefs: { story: 1, gridSeen: 1, snd: 'off' }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
    const walk40 = await page.evaluate(async () => { (await import('./ui/router.js')).show('s-menu'); await new Promise(r => setTimeout(r, 300)); return !document.getElementById('nextup').hidden; });
    (first40.box === nb && first40.green && first40.shown && !walk40)
      ? ok(`67.40 the first main menu after the walkthrough: the card glows green and one box rings it — "${first40.box}"; before the walkthrough is done there is no card`)
      : bad('67.40 the card\'s first showing', JSON.stringify({ first40, walk40, nb }));
  }
}
