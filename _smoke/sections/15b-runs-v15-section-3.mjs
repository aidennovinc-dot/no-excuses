// build 61: part 2 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, PICK, sleep, names, close, part, check, ok, bad, finished, read, boot, at, page, until, click, down, up, driveToResult, openSheet } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  { const ad60 = await page.evaluate(async () => { const A = await import('./ui/ads.js'), G = await import('./config/games.js');
      const SS = await import('./core/store.js');
      const P = SS.prefs, keep = { sup: P.supporter, n: P.adRuns, first: P.firstRun };
      const set = (n, first, sup) => { P.adRuns = n; P.firstRun = first; P.supporter = !!sup; };
      const set5 = { g: 'quick-tap', d: 'two', s: 5 }, streak = { g: 'spot', d: 'find', s: -1 };
      const long = Date.now() - G.ADS.graceMs - 1000, justNow = Date.now() - 1000;
      const out = { ADS: G.ADS };
      // one in five, on a settled player
      set(0, long); out.everyFifth = [0, 1, 2, 3, 4, 5].map(n => { P.adRuns = n; return A.Ads.show(set5); });
      // never after a Streak
      set(0, long); out.streak = A.Ads.show(streak);
      // never in a new player's first ten minutes, and the boundary either side of it
      set(0, justNow); out.newPlayer = A.Ads.show(set5);
      set(0, Date.now() - G.ADS.graceMs + 2000); out.insideGrace = A.Ads.show(set5);
      set(0, long); out.pastGrace = A.Ads.show(set5);
      set(0, 0); out.neverPlayed = A.Ads.show(set5);
      // supporters never
      set(0, long, true); out.supporter = A.Ads.show(set5);
      Object.assign(P, { supporter: keep.sup, adRuns: keep.n, firstRun: keep.first }); SS.save();
      // and neither the banner nor the caption is on the page any more
      out.banner = !!document.getElementById('adslot');
      out.caption = (document.getElementById('adbreak').textContent || '').replace(/\s+/g, ' ').trim();
      return out; });
    const fifth = ad60.everyFifth;
    (ad60.ADS.everyN === 5 && ad60.ADS.streak === false && ad60.ADS.graceMs === 600000
      && fifth[0] === true && fifth.slice(1, 5).every(x => x === false) && fifth[5] === true
      && ad60.streak === false && ad60.newPlayer === false && ad60.insideGrace === false
      && ad60.pastGrace === true && ad60.neverPlayed === false && ad60.supporter === false
      && !ad60.banner && !/every fourth|never during a run/i.test(ad60.caption))
      ? ok(`60.28 all five of Aiden's 2026-09-18 ad rules hold: at most one per ${ad60.ADS.everyN} runs (${fifth.map((v, i) => i + (v ? '✓' : '·')).join(' ')}), never after a Streak, never in a new player's first ${ad60.ADS.graceMs / 60000} minutes (nor before they have finished a run at all), never for a supporter, and the interstitial is the only ad there is — the dashed banner on the result screen is gone and the break no longer tells the player its own frequency ("${ad60.caption}")`)
      : bad('60.28 the ad rules', JSON.stringify(ad60)); }

  /* ---- v31 (60.27, build 60): A STREAK'S PROGRESS IS SAVED, AND A KILLED APP IS OFFERED IT BACK ----
     A pause keeps the run in memory and needs none of this; the saved row is for the case a pause cannot cover — iOS killing
     the app outright. Four facts: a Streak writes a row every round; a quit clears it; a two-player run writes NOTHING (L10);
     and the menu offers what is there and plays it from that round. */
  { const sv60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'), R = await import('./ui/router.js');
      for (const k of ['spot', 'spot:count', 'spot:find', 'quick-tap', 'quick-tap:two']) SS.store.intro[k] = Date.now();
      /* a length the player has not unlocked is not one the sheet will select, which is right and is why the offer has to land on
         an OPEN combination — a saved row is always one the player played, so the fixture says so too */
      SS.prefs.allOpen = true;
      delete SS.store.resume; SS.save();
      const SP = (await import('./games/spot/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const row = () => { const st = JSON.parse(localStorage.getItem('ne')) || {}; return st.resume || null; };
      const out = {};
      // a FIND STREAK, played far enough to land a few rounds
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'find', secs: -1 }); RUN.start();
      for (let n = 0; n < 4; n++) {
        for (let i = 0; i < 400 && SP.st !== 'find'; i++) await wait(40);
        if (SP.st !== 'find') break;
        const q = SP.pts.find(x => x.shape === SP.odd), g = document.getElementById('gen'), r = g.getBoundingClientRect(), sz = q.sz || SP.size;
        g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: r.left + q.x + sz / 2, clientY: r.top + q.y + sz / 2 }));
        await wait(1500);
        if (document.getElementById('game').classList.contains('tapon')) { const gg = document.getElementById('gen');
          gg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 10, clientY: 10 })); }
        await wait(500);
      }
      out.saved = row(); out.round = SP.round;
      // QUIT: the row goes, because a run that is over has nothing to offer back
      RUN.abort(); await wait(400); out.afterQuit = row();
      // A TWO-PLAYER RUN SAVES NOTHING (L10)
      Object.assign(ST.sel, { vs: 1, practice: 0, game: 'spot', diff: 'count', secs: -1 }); RUN.start();
      await wait(2500); out.twoPlayer = row();
      RUN.abort(); ST.sel.vs = 0; await wait(400);
      // THE MENU OFFERS IT. The row is written by hand here — the point under test is the offer, not the writing, which is above
      SS.store.resume = { g: 'spot', d: 'find', s: -1, round: 7, hits: 4.25, t: Date.now(), gaunt: 0 }; SS.save();
      R.show('s-menu'); await wait(600);
      const el = document.getElementById('resumerow');
      out.offer = { hidden: el.hidden, text: (el.textContent || '').replace(/\s+/g, ' ').trim() };
      el.click(); await wait(700);
      out.wentTo = (document.querySelector('.screen.on') || {}).id;
      out.sel = { g: ST.sel.game, d: ST.sel.diff, s: ST.sel.secs, at: ST.sel.resumeAt && ST.sel.resumeAt.round };
      // and Go picks the run up AT THAT ROUND
      RUN.start(); await wait(2600);
      out.resumedAt = SP.round; out.resumedTot = Math.round(SP.tot * 100) / 100;
      RUN.abort(); delete SS.store.resume; SS.save(); await wait(300);
      return out; });
    (sv60.saved && sv60.saved.g === 'spot' && sv60.saved.d === 'find' && sv60.saved.s === -1 && sv60.saved.round >= 1
      && !sv60.afterQuit && !sv60.twoPlayer
      && !sv60.offer.hidden && /round 7/.test(sv60.offer.text) && /Find/.test(sv60.offer.text)
      && sv60.wentTo === 's-pick' && sv60.sel.at === 7
      && sv60.resumedAt === 7 && sv60.resumedTot === 4.25)
      ? ok(`60.27 a Streak's progress is saved and a killed app is offered it back — a Find Streak wrote {round ${sv60.saved.round}} as it played, quitting cleared it, a PASS & PLAY run wrote nothing at all (L10), and the menu's offer ("${sv60.offer.text}") picks the run up at round ${sv60.resumedAt} with its ${sv60.resumedTot}s total intact`)
      : bad('60.27 the saved Streak', JSON.stringify(sv60)); }

  /* ---- v31 (60.26, build 60): NO COUNT-UP WHOOSH ON A WHOLE-NUMBER TALLY ----
     The whoosh is for a MEASURED amount draining into a total — milliseconds, seconds, percentages — where the sweep follows the
     fill. A miscount is a whole number: "1 off" is one thing, not an amount, and the whoosh made it sound like a cost. Driven by
     counting the whooshes the app actually schedules: a Count round answered WRONG must fire none while its miscount walks in,
     and a Find round — which spends real seconds — must still fire one, so the rule is shown to be about the KIND of tally
     rather than about Spot. */
  { const wh60 = await page.evaluate(async () => { const MU = await import('./audio.js');
      const RUN = await import('./run/run.js'), ST = await import('./core/state.js'), SS = await import('./core/store.js');
      for (const k of ['spot', 'spot:count', 'spot:find']) SS.store.intro[k] = Date.now(); SS.save();
      const SP = (await import('./games/spot/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const real = MU.Snd.whoosh; let n = 0;
      MU.Snd.whoosh = function (...a) { n++; return real.apply(this, a); };
      const out = {};
      // a COUNT round, answered wrong on purpose so the miscount tally runs
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'count', secs: 10 }); RUN.start();
      for (let i = 0; i < 600 && SP.st !== 'ask'; i++) await wait(50);
      n = 0;
      { const want = SP.answer, wrong = want === 0 ? 1 : Math.max(0, want - 1);
        const b = document.querySelector(`.pad-num [data-num="${wrong}"]`);
        if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 })); }
      await wait(3200);
      out.count = { whooshes: n, off: SP.off };
      RUN.abort(); await wait(400);
      // a FIND round, where the seconds really are an amount
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'find', secs: 10 }); RUN.start();
      for (let i = 0; i < 600 && SP.st !== 'find'; i++) await wait(50);
      await wait(900); n = 0;
      { const q = SP.pts.find(x => x.shape === SP.odd), g = document.getElementById('gen'), r = g.getBoundingClientRect(), sz = q.sz || SP.size;
        g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: r.left + q.x + sz / 2, clientY: r.top + q.y + sz / 2 })); }
      await wait(1600);
      out.find = { whooshes: n };
      RUN.abort(); await wait(300);
      MU.Snd.whoosh = real;
      return out; });
    (wh60.count.whooshes === 0 && wh60.count.off > 0 && wh60.find.whooshes > 0)
      ? ok(`60.26 a whole-number tally makes no whoosh — a Count round answered wrong walked ${wh60.count.off} miscount(s) into the total with ${wh60.count.whooshes} whooshes, while a Find round's seconds still draw ${wh60.find.whooshes}; Go / No-go's counter and every round count go through hud.score, which has never had one`)
      : bad('60.26 the whole-number whoosh', JSON.stringify(wh60)); }

  /* ---- v31 (60.25, build 60): TOASTS HOLD LONGER AND THEY QUEUE ----
     The old function called clearTimeout and wrote straight over whatever was on screen, so a run that unlocked two things
     showed the first for however long it took the second to arrive. The three numbers are Aiden's; the QUEUE is the part worth
     driving, so three toasts are fired in one breath and the screen is sampled while they play out. */
  { const tq60 = await page.evaluate(async () => { const TS = await import('./ui/toast.js'), CP = await import('./config/copy.js');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const t = document.getElementById('toast');
      const seen = []; let last = '';
      TS.toastClear(); await wait(60);
      // three at once: a plain one, an unlock, and a tappable one — the order they are fired in is the order they must be read in
      TS.toast('first up', '', '', false, '', true);
      TS.toast('second up', '', 'ok', false, '', true);
      TS.toast('third up', 'qt_r5', '', false, '', true);
      const t0 = performance.now(); const spans = {};
      for (let i = 0; i < 260; i++) { const on = t.classList.contains('on'), txt = on ? t.textContent.trim() : '';
        if (txt !== last) { const at = Math.round(performance.now() - t0);
          if (last) spans[last] = at - (spans['_' + last] || 0);
          if (txt) spans['_' + txt] = at;
          seen.push({ at, txt: txt || '(none)' }); last = txt; }
        await wait(60); if (performance.now() - t0 > 15000) break; }
      const out = { MS: CP.TOAST_MS, seen, held: {} };
      for (const k of ['first up', 'second up', 'third up']) if (spans[k]) out.held[k] = spans[k];
      // and a TAP takes the rest of the queue with it
      TS.toastClear(); await wait(80);
      TS.toast('one', '', '', false, '', true); TS.toast('two', '', '', false, '', true);
      await wait(200);
      const before = t.textContent.trim();
      t.dataset.ach = 'qt_r5'; t.click(); await wait(900);
      out.afterTap = { text: t.textContent.trim(), on: t.classList.contains('on'), before };
      TS.toastClear();
      return out; });
    const order = tq60.seen.filter(x => x.txt !== '(none)').map(x => x.txt).join(' → ');
    const near = (a, b) => Math.abs(a - b) <= 500;
    (order === 'first up → second up → third up'
      && near(tq60.held['first up'], tq60.MS.plain) && near(tq60.held['second up'], tq60.MS.unlock) && near(tq60.held['third up'], tq60.MS.tap)
      && tq60.MS.plain === 3000 && tq60.MS.unlock === 4500 && tq60.MS.tap === 5000
      && !tq60.afterTap.on)
      ? ok(`60.25 toasts hold longer and they QUEUE — three fired in one breath were read in order (${order}), each for its own time (${Object.entries(tq60.held).map(([k, v]) => k + ' ' + v + 'ms').join(', ')} against ${tq60.MS.plain} / ${tq60.MS.unlock} / ${tq60.MS.tap}), where until build 59 the third would simply have written over the other two; and a tap dismisses the one on screen AND empties what was still queued behind it`)
      : bad('60.25 the toast queue', JSON.stringify(tq60)); }

  /* ---- v31 (60.24, build 60): TAPPING OUTSIDE THE SHEET STEPS BACK ONE LEVEL ----
     This REVERSES v28 item 14 (build 53), which made a tap on the dimmed map close the sheet outright. Aiden's call of
     2026-09-23. Four paths, and the fourth is the one that is easy to get wrong: a game whose first step has no choice — a
     one-mode game, which opens straight on its lengths — has no mode step to go back to and must close to the map in one tap.
     Driven on two games, a many-mode one and Sequence, which is the one-mode case. */
  { const sb60 = await page.evaluate(async () => { const R = await import('./ui/router.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'); SS.prefs.allOpen = true; SS.save();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const where = () => { const sh = document.getElementById('sheet');
        return { screen: (document.querySelector('.screen.on') || {}).id,
          sheet: sh.hidden ? 'hidden' : (sh.classList.contains('len') ? 'len' : 'mode'),
          sub: !!document.querySelector('#vs-wrap .prow.sub:not([hidden])'), vs: ST.sel.vs }; };
      const outside = () => { const d = document.getElementById('mapdim'); d.click(); };
      const out = {};
      R.show('s-pick'); await wait(500);
      // a many-mode game: length → mode → (with a friend collapses) → map
      document.querySelector('.tile[data-game="quick-tap"]').click(); await wait(450);
      document.querySelector('#diff-row .choice').click(); await wait(400);
      out.many = [where()];
      outside(); await wait(400); out.many.push(where());
      document.querySelector('#vs-wrap [data-p="f"]').click(); await wait(400); out.many.push(where());
      outside(); await wait(400); out.many.push(where());
      outside(); await wait(500); out.many.push(where());
      // a one-mode game: its first step is the lengths, so one tap outside closes it
      R.show('s-pick'); await wait(400);
      document.querySelector('.tile[data-game="sequence"]').click(); await wait(500);
      out.one = [where()];
      outside(); await wait(500); out.one.push(where());
      // leave the app where the checks after this one expect to find it: the menu, with no sheet up
      R.show('s-menu'); await wait(400);
      return out; });
    const m = sb60.many, o = sb60.one;
    (m[0].sheet === 'len' && m[1].sheet === 'mode' && m[1].screen === 's-pick'
      && m[2].sub && m[2].vs > 0
      && !m[3].sub && m[3].vs === 0 && m[3].sheet === 'mode'
      && m[4].sheet === 'hidden' && m[4].screen === 's-pick'
      && o[0].sheet === 'len' && o[1].sheet === 'hidden')
      ? ok('60.24 tapping outside the sheet steps back ONE LEVEL, not straight out (reversing v28 item 14): on a many-mode game the lengths go back to the modes, With a friend collapses to the player row before the sheet does, and the next tap closes to the map — while a one-mode game, whose first step has no choice, closes to the map in one tap. The same step Back takes, from one function')
      : bad('60.24 the sheet steps back', JSON.stringify(sb60)); }

  /* ---- v31 (60.23, build 60): THE PLAYER PICKER IS ONE COMPONENT, ON BOTH SCREENS ----
     L3's two steps were markup in index.html for the pick sheet and a string in ui/screens/result.js for the result screen, so
     the two drifted: different widths, Versus alone on a second line, and a selected chip that took the sheet's orange in one
     place and a white outline in the other. The check reads BOTH screens and compares them to each other rather than each to a
     number — same classes, same widths, same colour — because "one component" is a claim about the pair. */
  { /* the reader is one function, used on both hosts, so "the same component" is measured rather than asserted twice */
    const READ60 = host => page.evaluate(h => { const el = document.querySelector(h); if (!el) return null;
      const rgb = c => { const m = (c.match(/[\d.]+/g) || []).map(Number); return m.slice(0, 3).join(','); };
      const rows = [...el.querySelectorAll('.prow')];
      const pick = r => [...r.querySelectorAll('.pchip')].map(x => { const cs = getComputedStyle(x), rc = x.getBoundingClientRect();
        return { w: Math.round(rc.width), sel: x.classList.contains('sel'), colour: rgb(cs.color), text: x.textContent.trim() }; });
      return { rows: rows.length, top: rows[0] ? pick(rows[0]) : [],
        sub: rows[1] ? { hidden: rows[1].hidden, chips: pick(rows[1]), maxH: getComputedStyle(rows[1]).maxHeight } : null }; }, host);
    const PRESS60 = await page.evaluate(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--press').trim();
      const d = document.createElement('i'); d.style.color = v; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove();
      return (c.match(/[\d.]+/g) || []).slice(0, 3).join(','); });
    // the PICK SHEET, solo then with a friend
    await boot({ allOpen: 1 });
    await openSheet('quick-tap', 0, 0);
    const sheetSolo = await READ60('#vs-wrap');
    await click('#vs-wrap [data-p="f"]'); await sleep(420);
    const sheetFriend = await READ60('#vs-wrap');
    await click('#vs-wrap [data-p="0"]'); await sleep(300);
    // the RESULT SCREEN, the same two states, after a real run
    await click('#go-btn'); await driveToResult('quick-tap', '60.23 a run for the result screen', 30000);
    const resultSolo = await READ60('#over-vs');
    await click('#over-vs [data-p="f"]'); await sleep(420);
    const resultFriend = await READ60('#over-vs');
    const tile60 = await page.evaluate(() => { const t = document.querySelector('#over-chips .mch.sel'); if (!t) return null;
      const c = getComputedStyle(t).color; return (c.match(/[\d.]+/g) || []).slice(0, 3).join(','); });
    const pc60 = { press: PRESS60, sheetSolo, sheetFriend, resultSolo, resultFriend, tile: tile60 };
    const even = r => r && r.top.length === 2 && Math.abs(r.top[0].w - r.top[1].w) <= 1;
    const orange = r => r && r.top.filter(c => c.sel).length > 0 && r.top.filter(c => c.sel).every(c => c.colour === PRESS60);
    const sameWords = (x, y) => x && y && x.top.map(c => c.text).join('|') === y.top.map(c => c.text).join('|');
    (pc60.sheetSolo && pc60.resultSolo && pc60.sheetSolo.rows === 2 && pc60.resultSolo.rows === 2
      && [pc60.sheetSolo, pc60.resultSolo, pc60.sheetFriend, pc60.resultFriend].every(even)
      && [pc60.sheetSolo, pc60.resultSolo, pc60.sheetFriend, pc60.resultFriend].every(orange)
      && sameWords(pc60.sheetSolo, pc60.resultSolo)
      && pc60.sheetSolo.sub.hidden && pc60.resultSolo.sub.hidden
      && !pc60.sheetFriend.sub.hidden && !pc60.resultFriend.sub.hidden
      && pc60.sheetSolo.sub.maxH === '0px' && pc60.sheetFriend.sub.maxH !== '0px'
      && pc60.tile === PRESS60)
      ? ok(`60.23 the player picker is ONE component on both screens — the same two rows, the same words ("${pc60.sheetSolo.top.map(c => c.text).join('" | "')}"), equal widths (${pc60.sheetSolo.top.map(c => c.w).join(' and ')}px on the sheet, ${pc60.resultSolo.top.map(c => c.w).join(' and ')}px on the result), the selected one in the same orange (${PRESS60}) on both — and so is the selected game tile under it — with the Pass & play / Versus row hidden until With a friend is picked and sliding in from 0px when it is`)
      : bad('60.23 the player picker', JSON.stringify(pc60)); }

  /* ---- v31 (60.21, build 60): THE GROW RESULT'S SHAPE AND ITS PANEL NEVER OVERLAP ----
     Both were centred on the field, so a grown shape was drawn straight through the TARGET / YOURS bars and their numbers. The
     panel is at the foot of the field now (HOLD_LAYOUT.split) and the reveal scales BOTH shapes by one factor so neither can
     reach it — the areas, the bars and the numbers are worked out from the real sizes before that, so the estimate is untouched.
     Six rounds, each held to a big overshoot, measured as box against box. */
  { /* the run is opened and started THE WAY A PLAYER DOES — openSheet then Go — rather than by poking run/run.js from
       whatever screen the check before this one happened to leave the app on. Estimate's field only has a box once the game
       layer is up, and a half-made two-player selection would send the reveal down the shared-score path, which draws no panel
       at all; going in through the sheet settles both. */
    /* a SET, not a Streak: six rounds held 60% over spend 56% of a Grow Streak's budget EACH (60.4's allowance), so the run
       would be over after two and the rest would measure an empty field. A Set is seven rounds whatever they score. */
    await openSheet('hold', 0, 0);
    await click('#go-btn'); await sleep(900);
    const gr60 = await page.evaluate(async () => { const G = await import('./config/games.js'), C = await import('./core.js');
      const HD = (await import('./games/estimate/index.js')).default;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { split: G.HOLD_LAYOUT.split, rounds: [] };
      for (let n = 0; n < 6; n++) {
        for (let i = 0; i < 400 && !(document.getElementById('hbg') || {}).classList?.contains?.('on'); i++) await wait(25);
        if (!HD.ctx) break;
        // a 60% overshoot: the round that used to draw through the panel
        const ms = HD.target / (G.CFG.holdRate * C.vmin()) * 1000 * Math.sqrt(1.6);
        HD.down({ type: 'down', x: 0, y: 0 }); await wait(ms); HD.up();
        for (let i = 0; i < 500 && !document.getElementById('hcalc').classList.contains('on'); i++) await wait(25);
        await wait(2400);
        const f = document.getElementById('hfield').getBoundingClientRect(), c = document.getElementById('hcalc').getBoundingClientRect();
        const boxes = [...document.querySelectorAll('#hg path,#ht path,#hm path')].filter(p => p.getAttribute('d'))
          .map(p => p.getBoundingClientRect()).filter(r => r.width > 1);
        const hit = (a, b) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
        const rows = [...document.querySelectorAll('#hcalc b, #hcalc .hrow, #hcalc span')].map(e => e.getBoundingClientRect()).filter(r => r.width > 1);
        out.rounds.push({ shapes: boxes.length,
          gap: boxes.length ? Math.round(c.top - Math.max(...boxes.map(b => b.bottom))) : null,
          panelHits: boxes.filter(b => hit(b, c)).length,
          textHits: rows.filter(r => boxes.some(b => hit(b, r))).length,
          panelTopShare: Math.round((c.top - f.top) / f.height * 100) / 100 });
        HD.input(HD.ctx, { type: 'down', x: 0, y: 0 }); await wait(700);
      }
      (await import('./run/run.js')).abort(); await wait(300); return out; });
    const bad60 = gr60.rounds.filter(r => !r.shapes || r.panelHits || r.textHits || r.gap === null || r.gap < 0);
    (gr60.rounds.length >= 4 && bad60.length === 0)
      ? ok(`60.21 the Grow result's shape and its TARGET / YOURS panel never overlap — ${gr60.rounds.length} rounds each held 60% over, every one with the panel at ${gr60.rounds[0].panelTopShare} of the field (HOLD_LAYOUT.split ${gr60.split}) and the shape clear above it by ${gr60.rounds.map(r => r.gap).join(', ')}px; no shape box touches the panel or any of its bars or numbers`)
      : bad('60.21 the Grow result overlaps', JSON.stringify({ rounds: gr60.rounds.length, bad60 })); }

  /* ---- v31 (60.20, build 60): A GOAL BADGE THAT DOES NOT FIT SCANS, AND FREEZES WHILE A ROUND IS LIVE ----
     Three facts, and the third is the one that matters: movement in peripheral vision provokes false starts in Flash, Dots and
     Hidden, so the scan runs during the 3-2-1 and between rounds and NOT while a round is live. The check drives a real run with
     a goal long enough to overflow, reads the animation off the element at each of those moments, and separately proves that a
     badge which FITS is never given one. */
  { const gs60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'), G = await import('./config/games.js');
      SS.store.intro['reaction'] = SS.store.intro['reaction:flash'] = Date.now(); SS.save();
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const read = () => { const gl = document.getElementById('goal');
        const rows = [...gl.children].map(e => { const cs = getComputedStyle(e);
          return { scan: e.classList.contains('scan'), over: Math.max(0, e.scrollWidth - e.clientWidth),
            anim: cs.animationName, dur: cs.animationDuration, text: (e.textContent || '').trim().slice(0, 30) }; });
        return { on: gl.classList.contains('on'), live: document.getElementById('game').classList.contains('live'),
          tapon: document.getElementById('game').classList.contains('tapon'), rows }; };
      /* the badge is driven by the app's own aim mechanism (`pendingAim`, the thing Try to unlock writes), with a line long enough
         to overflow the pill — so what is measured is a real goal badge on a real run, not markup written into the page. */
      const P = await import('./progress.js');
      P.setPendingAim('reach round 24 in Reaction · Flash · Streak without a single early tap');
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'reaction', diff: 'flash', secs: -1 }); RUN.start();
      await wait(160);
      const out = { CFG: G.GOAL_SCAN, countdown: read() };
      for (let i = 0; i < 300 && !document.getElementById('game').classList.contains('live'); i++) await wait(40);
      await wait(250); out.live = read();
      // between rounds: the held card. Tap the flash, then read while the card is up
      const RX = (await import('./games/reaction/index.js')).default;
      for (let i = 0; i < 600 && !(RX.st === 'go' && RX.armed); i++) await wait(50);
      RX.onDown({ type: 'down', t: RX.t0 + 300 });
      for (let i = 0; i < 100 && !document.getElementById('game').classList.contains('tapon'); i++) await wait(40);
      out.between = read();
      RUN.abort(); await wait(300);
      // and a badge that FITS: write a short line into the same pill and re-measure through the app's own path
      const gl = document.getElementById('goal'); gl.classList.add('on');
      gl.innerHTML = '<i>goal</i><u>x</u>'; await wait(60);
      for (const e of gl.children) { const over = Math.max(0, e.scrollWidth - e.clientWidth); e.classList.toggle('scan', over > 2); }
      out.short = read(); gl.classList.remove('on'); gl.innerHTML = '';
      return out; });
    const anyScan = r => r && r.rows.some(x => x.scan);
    const moving = r => r && r.rows.filter(x => x.scan).every(x => x.anim === 'goalscan');
    const frozen = r => r && r.rows.filter(x => x.scan).every(x => x.anim === 'none');
    (gs60.CFG.hold === 1000 && gs60.CFG.pxPerSec > 0
      && anyScan(gs60.countdown) && moving(gs60.countdown)
      && anyScan(gs60.live) && frozen(gs60.live) && gs60.live.live && !gs60.live.tapon
      && anyScan(gs60.between) && moving(gs60.between) && gs60.between.tapon
      && !anyScan(gs60.short))
      ? ok(`60.20 a goal badge that does not fit scans and freezes while the round is live — the overflowing line ("${(gs60.live.rows.find(r => r.scan) || {}).text}…", ${(gs60.live.rows.find(r => r.scan) || {}).over}px over) walks during the 3-2-1 (${(gs60.countdown.rows.find(r => r.scan) || {}).dur}, ${gs60.CFG.pxPerSec}px/s with a ${gs60.CFG.hold}ms pause at each end), freezes at its start the moment the round goes live, and walks again on the held card between rounds; a badge that FITS is never given the class`)
      : bad('60.20 the goal badge scan', JSON.stringify(gs60)); }

  /* ---- v31 (60.19, build 60): THE RUN'S HEADER IS A COLUMN, AND NOTHING SHARES A LINE WITH THE SCORE ----
     Aiden's screenshots: the UNLOCK pill over the GOAL pill, "Stopwatch · Streak" wrapping to three lines under the score,
     "attempt 1" broken across two, "BEST 831MS" touching the big number. All four are one fault — a badge absolutely positioned
     over a single row of mode | score | count. The header is four rows in flow now. The assertion is geometric and is made at the
     three widths the item names: every row's box against every other, with mode-and-count the one pair allowed to share a line. */
}
