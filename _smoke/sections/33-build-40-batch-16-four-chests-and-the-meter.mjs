/* ---- 20. build 40 (batch 16, four chests and the 0-400 meter - FEEDBACK-v23 §L.8 a-c f, §L.10 a-c e, §L.11 a c, §L.12, G.8 extended) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, part, section, check, ok, bad, finished, root, read, strip, boot, at, page, until, onScreen, click, setStorage, SEEN_INTRO, up, revealReady, revealDone, finish, FROM, named } from '../lib/gate.mjs';

export const SECTION = ["build 40 - batch 16, four chests and the meter"];

export async function run() {
  const NOW40 = Date.now();
  const PLAIN40 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const CH40 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const CP40 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const MS40 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);   // build 52 (v27 items 7 / 8): the video word is the slot's own title
  const fill40 = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  const U40 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB40 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL_UNLOCK = Object.fromEntries(U40.UNLOCKS.map(x => [x.key, NOW40]));
  const KEY1_BARS = Object.fromEntries(Object.keys(KB40.KEY_BARS).map(k => [k, NOW40]));
  // the build-32 block's svgClick is scoped to that block: an SVG element takes a dispatched click, not .click()
  const svgClick = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);

  /* ---- 1. L.10: FOUR chests, named by what opens them, in one config beside config/key-bars.js; G.3's gate, both asks and frontPct are gone ---- */
  {
    const cfg = read('config', 'chests.js');
    const ids = CH40.CHESTS.map(c => c.id).join(), needs = CH40.CHESTS.map(c => c.needs).join(), opens = CH40.CHESTS.map(c => c.opens).join();
    const a2 = !/^\s*import\b/m.test(cfg) && !/=>|\bfunction\b/.test(strip(cfg));
    const code = ['index.html', 'progress/key.js', 'ui/screens/pick.js', 'ui/screens/key.js', 'ui/screens/menu.js', 'ui/screens/testing.js', 'ui/screens/customise.js', 'ui/screens/progress.js', 'config/copy.js', 'styles/app.css']
      .map(f => [f, strip(read(...f.split('/')))]);
    const numbered = code.filter(([, s]) => /\bchest[123]\b|data-chest="\d|\bchestN\b/.test(s)).map(([f]) => f);
    const gate = code.filter(([, s]) => /glgate|gateState|gateOff|\.gated\b|unlock all games first|askPro|askBox|askwrap|proAsk|openAsk|frontPct|prefs\.pro\b|mapOpen/i.test(s)).map(([f]) => f);
    (ids === 'games,key,pro,thorns' && needs === 'modes,clear,pro,author' && opens === 'clear,pro,author,' && a2 && !numbered.length && !gate.length)
      ? ok(`L.10 four chests in config/chests.js - ${ids} - needing ${needs} and revealing clear, pro, author and nothing; data only (A2); no chest is numbered anywhere in the app, and G.3's gate, both asks and frontPct are gone`)
      : bad('L.10 the four chests', JSON.stringify({ ids, needs, opens, a2, numbered, gate }));
  }

  /* ---- 2. L.10e: strictly sequential - no chest ready while the one before it is shut - and opening Games reveals exactly key 1 ---- */
  {
    await boot({}, {}, { v: 5, plain: PLAIN40 });
    const sq = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const C = await import('./config/chests.js');
      const ids = C.CHESTS.map(c => c.id), bad = []; let n = 0;
      for (let mask = 0; mask < 16; mask++) for (let modes = 0; modes < 2; modes++) for (let whole = 0; whole < 8; whole++) { n++;
        S.prefs.chests = Object.fromEntries(ids.map((id, i) => [id, (mask >> i) & 1]));
        S.store.unlock = modes ? Object.assign({}, ALL) : {};
        S.store.bars = {}; K.TIERS.forEach((t, i) => { if ((whole >> i) & 1) for (const c of K.COMBOS) S.store.bars[K.skey(c.key, t)] = 1; });
        ids.forEach((id, i) => { const s = K.chestState(id), prevShut = i > 0 && !S.prefs.chests[ids[i - 1]];
          if (s === 'ready' && prevShut) bad.push({ mask, modes, whole, id, why: 'ready behind a shut chest' });
          if (!S.prefs.chests[id] && prevShut && s !== 'before') bad.push({ mask, modes, whole, id, why: s }); }); }
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.store.bars = {}; S.save(); return { n, bad: bad.slice(0, 3), count: bad.length }; }, ALL_UNLOCK);
    (!sq.count && sq.n === 256) ? ok(`L.10e strictly sequential: across ${sq.n} states of opened chests, modes and whole keys, no chest is ever ready while the chest before it is shut`) : bad('L.10e the chests are sequential', JSON.stringify(sq));
    const rv = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      // a best AT the Author number on every combination - the hardest of the three, so it beats all three tiers
      S.store.unlock = Object.assign({}, ALL); S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.retro = {};
      S.store.runs = K.COMBOS.map(c => ({ t: Date.now(), g: c.g, d: c.d, s: c.s, n: '', v: 4, hits: K.barOf(c, 'author'), misses: 0 }));
      const before = { state: K.chestState('games'), meter: K.meter(), clear: K.tierOpen('clear') };
      const r = K.openChest('games');
      const bars = Object.keys(S.store.bars);
      const out = { before, r: r && { was: r.was, now: r.now, fresh: r.fresh.length }, bare: bars.filter(k => !k.includes('|')).length, tiered: bars.filter(k => k.includes('|')).length,
        retroBare: Object.keys(S.prefs.retro || {}).every(k => !k.includes('|')), again: K.openChest('games'), total: K.COMBOS.length, key: K.chestState('key') };
      S.store.runs = []; S.store.bars = {}; S.store.ach = {}; S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.prefs.retro = {}; S.store.unlock = {}; S.save(); return out; }, ALL_UNLOCK);
    /* AMENDED AT BUILD 59 (v30 59.11): the meter BEFORE the chest opens is no longer 0 — it is the modes' own share of the first
       hundred, which is the whole of the item ("it should go towards 100% as we play the game"). What is asserted instead is the
       thing that has not changed: the chest opening is what lands the KEY-1 BARS, so the figure jumps from the modes share to 100. */
    (rv.before.state === 'ready' && !rv.before.clear && rv.before.meter > 0 && rv.before.meter < 100 && rv.r && rv.r.was === rv.before.meter && rv.r.now === 100 /* AMENDED at build 48 (v26 items 7 / 9): 0–300 */ && rv.bare === rv.total && !rv.tiered && rv.retroBare && rv.again === null && rv.key === 'ready')
      ? ok(`L.10e / v30 59.11 opening the Games chest reveals exactly key 1 — it already stood at ${rv.r.was} on the modes alone, and the chest is what lets the bars count: all ${rv.bare} key-1 bars a saved best beats bank silently and nothing on Pro or Author does; the meter goes ${rv.r.was} -> ${rv.r.now}, the Skill chest is ready, a second open does nothing`)
      : bad('L.10e what the Games chest reveals', JSON.stringify(rv));
  }

  /* ---- 3. L.8a / L.10b: ONE meter, 0-400 - modes, then each key's cleared bars - a band counting only once its chest is open ---- */
  {
    const keyjs = strip(read('progress', 'key.js')), surf = ['ui/screens/menu.js', 'ui/screens/pick.js', 'ui/screens/key.js'].map(f => strip(read(...f.split('/'))));
    /* DELETED at build 48: "L.8a one meter() … the menu card, the map chests and the key screen all read it" tested the source text, and v26 item 12
       took the percentage off the map, so pick.js no longer spells meter(). A source-text check a rule change fails is deleted, not re-spelled
       (site/CLAUDE.md → The gate). The chests section drives the same claim on the page: every surface agrees with the store. */
    void keyjs; void surf;
    const mt = await page.evaluate(async ALL => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const U = await import('./config/unlocks.js');
      const set = (chests, unlock, tiers) => { S.prefs.chests = Object.assign({ games: 0, key: 0, pro: 0, thorns: 0 }, chests); S.store.unlock = unlock;
        S.store.bars = {}; for (const t of tiers) for (const c of K.COMBOS) S.store.bars[K.skey(c.key, t)] = 1; return K.meter(); };
      const all = ['clear', 'pro', 'author'], mode = U.UNLOCKS.find(x => x.key !== 'sequence:practice' && x.key.split(':').length === 2).key;
      const out = { fresh: set({}, {}, []), oneMode: set({}, { [mode]: 1 }, []), everyMode: set({}, Object.assign({}, ALL), []),
        noGames: set({}, Object.assign({}, ALL), all), noKey: set({ games: 1 }, Object.assign({}, ALL), all), noPro: set({ games: 1, key: 1 }, Object.assign({}, ALL), all),
        noThorns: set({ games: 1, key: 1, pro: 1 }, Object.assign({}, ALL), all), full: set({ games: 1, key: 1, pro: 1, thorns: 1 }, Object.assign({}, ALL), all), max: K.meterMax() };
      set({ games: 1 }, Object.assign({}, ALL), []); K.COMBOS.slice(0, K.COMBOS.length / 2).forEach(c => { S.store.bars[c.key] = 1; }); out.half = K.meter();
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.store.bars = {}; S.save(); return out; }, ALL_UNLOCK);
    /* AMENDED at build 48 (v26 items 7 / 9 / 12): the meter is 0–300 - the modes band is off (METER.modes false), so modes read 0 and the keys are the whole of it.
       AMENDED AT BUILD 59 (v30 59.11): THE FIRST 100 IS MODES + KEY-1 BARS IN EQUAL STEPS, so modes are back in the number - but INSIDE the
       first band, not as a fourth one. Aiden: "the user should also feel like they're progressing based on the games they unlocked. So the
       first 100% should be a combination of unlocking games and then doing the key." The figures this asserts are therefore derived rather
       than typed: the modes' share of the first band is its own count over (modes + key-1 bars), so a mode added to the game moves all of
       them together and this check follows without an edit. What has NOT moved is asserted as hard numbers because it is the rule: 100 at
       key 1 whole, 200 at Pro, 300 at Author, a maximum of 300, and nothing counting past a shut chest. */
    const modeShare = await page.evaluate(async () => { const P = await import('./progress.js'), K = await import('./progress/key.js'), C = await import('./config/chests.js');
      const m = P.modeCount(), free = C.METER.freeStart ? m.free : 0, den = Math.max(0, m.total - free);
      return { den, bars: K.COMBOS.length, all: Math.floor(100 * den / (den + K.COMBOS.length) + 1e-9) }; });
    const half58 = Math.floor(100 * (modeShare.den + Math.floor(modeShare.bars / 2)) / (modeShare.den + modeShare.bars) + 1e-9);
    (mt.fresh === 0 && mt.oneMode > 0 && mt.oneMode < modeShare.all && mt.everyMode === modeShare.all && mt.noGames === modeShare.all
      && mt.noKey === 100 && mt.noPro === 200 && mt.noThorns === 300 && mt.full === 300 && mt.half === half58 && mt.max === 300)
      ? ok(`L.8a / L.10b / v30 59.11 the meter, 0–300, with the first hundred shared between modes and key-1 bars in EQUAL STEPS: a new profile ${mt.fresh}%, one mode ${mt.oneMode}, every mode ${mt.everyMode} (${modeShare.den} unlockable modes against ${modeShare.bars} bars, so the Games chest opens at about a quarter and the key carries the rest); with every bar on every key banked underneath it still reads ${mt.noGames} before the Games chest — the bars wait for it, only the modes move — then ${mt.noKey} before the Skill chest, ${mt.noPro} before the Pro chest and ${mt.noThorns} past it (never past a shut chest); half of key 1 is ${mt.half}`)
      : bad('L.8a / v30 59.11 the meter', JSON.stringify({ mt, modeShare, half58 }));
  }

  /* ---- 4. L.8b: a chest's tap opens its screen and the open happens THERE by itself - no ask - then no repeat; L.11c its words beside it ---- */
  {
    const runs = Object.keys(KB40.KEY_BARS).slice(0, 5).map(k => { const [g, d, s] = k.split(':'); return { t: NOW40, g, d, s: +s, n: '', v: 4, hits: KB40.KEY_BARS[k].author, misses: 0 }; });
    await boot({}, { unlock: ALL_UNLOCK, runs }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-pick"]'); await sleep(700);
    const map = await page.evaluate(() => { const c = id => document.querySelector(`.chest[data-chest="${id}"]`);
      return { games: c('games').className, need: c('games').querySelector('.pic').dataset.need, key: c('key').querySelector('.pic').dataset.need, ask: !!document.getElementById('askwrap'), words: document.querySelector('.chestwords[data-for="games"]').hidden }; });
    // AMENDED at build 41 (v23 L.6): the chest's sound is Snd.chest and never unlockFx; the open is its ceremony, ~3s after the 600ms open, held on "tap to continue"
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__fx40 = 0; window.__un40 = 0; const o = A.Snd.chest, u = A.Snd.unlockFx;
      A.Snd.chest = function () { window.__fx40++; return o.apply(this, arguments); }; A.Snd.unlockFx = function () { window.__un40++; return u.apply(this, arguments); }; });
    await click('.chest[data-chest="games"]'); await sleep(250);
    const onKey = await onScreen();
    await revealReady();
    const opened = await page.evaluate(async () => { const K = await import('./progress/key.js'); const ne = JSON.parse(localStorage.getItem('ne')); const box = document.getElementById('key-cere');
      // v30 (59.11): the first band is modes + key-1 bars, so the figure derived here needs the modes count as well
      const P59 = await import('./progress.js'), C59 = await import('./config/chests.js');
      const mc = P59.modeCount(), fr = C59.METER.freeStart ? mc.free : 0;
      return { modes: { num: Math.max(0, mc.open - fr), den: Math.max(0, mc.total - fr) }, games: ne.prefs.chests.games, shown: !box.hidden, tap: box.classList.contains('tap'), txt: box.innerText.replace(/\s+/g, ' ').trim(), meterTxt: (box.querySelector('.meterv') || {}).textContent, meter: K.meter(), seen: ne.prefs.meterSeen, total: K.COMBOS.length,
        bare: Object.keys(ne.bars).filter(k => !k.includes('|')).length, fx: window.__un40 ? -window.__un40 : window.__fx40, toast: document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent.trim() : '' }; });
    await revealDone(); await sleep(500); opened.map = await onScreen();
    await click('#s-pick .back'); await sleep(400); await click('[data-go="s-key"]'); await sleep(1400);
    const again = await page.evaluate(() => ({ shown: !document.getElementById('key-cere').hidden, fx: window.__fx40 }));
    await click('#s-key .back'); await sleep(300); await click('[data-go="s-pick"]'); await sleep(700);
    const after = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { cls: c.className, need: c.querySelector('.pic').dataset.need, words: w.hidden ? null : [...w.querySelectorAll('.cw')].map(x => x.dataset.w), syms: w.querySelectorAll('.cwsym').length, wr: +w.style.gridRow, wc: +w.style.gridColumn, cr: +c.style.gridRow, cc: +c.style.gridColumn, key: document.querySelector('.chest[data-chest="key"] .pic').dataset.need, keyWords: document.querySelector('.chestwords[data-for="key"]').hidden }; });
    (/ready/.test(map.games) && map.need === 'tap to open' && map.key === 'Earn the Skill key' /* AMENDED at build 48 (v26 item 12); for build 49, the Skill key */ && !map.ask && map.words)
      ? ok('L.8b with every mode unlocked the Games chest is ready on the map - "tap to open" - the Skill chest says "Earn the Skill key", nothing stands beside a shut chest, and there is no ask box in the page') : bad('L.8b the ready Games chest', JSON.stringify(map));
    (onKey === 's-key' && opened.games === 1 && opened.shown && opened.tap && /Games chest opened/i.test(opened.txt) && !opened.meterTxt && !/%/.test(opened.txt) /* AMENDED at build 48 (v26 item 7): no percentage on the Games chest */ && opened.seen === opened.meter && opened.meter === Math.floor(100 * (opened.modes.num + opened.bare) / (opened.modes.den + opened.total) + 1e-9) /* AMENDED at build 59 (v30 59.11): the first band is modes + key-1 bars */ && opened.bare === 5 && opened.fx === 1 && !opened.toast && opened.map === 's-pick')
      ? ok(`L.8b AMENDED at build 43 (v24 B.2): the map's tap on the READY chest opened it at once, its ceremony covering the key screen from the frame it is shown: "${opened.txt}" - its ${opened.bare} already-beaten key-1 bars credited silently (G.4 extended) and the meter at ${opened.meter}% with no figure on the chest's own screen (v26 item 7), one chest sound, no toast, no question; its tap goes to the map (AMENDED at build 41, L.6)`) : bad('L.8b the open on the key screen', JSON.stringify(opened));
    (!again.shown && again.fx === 1) ? ok('L.8b opened is opened: the next visit to the key screen opens nothing and plays nothing') : bad('L.8b no repeat', JSON.stringify(again));
    // v25 (item 7, build 46): and each word now carries the SAME symbol that rose out of the chest, so the two moments are connected
    /* AMENDED AT BUILD 52 (v27 items 7 / 8): the chest's video word is the slot's title and Aiden renamed every slot, so the title is READ FROM
       config/messages.js here rather than written out. It had already been rewritten twice by hand; a literal in a gate check is a second place
       the name lives, which is exactly what build 51 item 4 took out of the app. */
    /* AMENDED AT BUILD 59 (v30 59.3): and the slot's title wears MSG.quote on the map too, so it reads as the name of a video. The marks
       come off the config here exactly as ui/chest.js puts them on, so this check still spells neither the name nor the punctuation. */
    const vidWord41 = CP40.MSG.quote[0] + MS40.MESSAGES.find(m => m.by && m.by.chest === 'games').title + CP40.MSG.quote[1];
    (/open/.test(after.cls) && after.need === 'opened' && after.words && after.words.join() === 'CUSTOMISE,SKILL KEY,' + vidWord41 && after.syms === after.words.length && after.wr === after.cr && after.wc !== after.cc && after.keyWords && after.key === 'Earn the Skill key' /* AMENDED at build 48 (v26 item 12); for build 49, the Skill key */)
      ? ok(`L.11c back on the map the Games chest is open with its words beside it (${after.words.join(' · ')}, row ${after.wr}, col ${after.wc} against the chest's ${after.cc}), each with its own symbol (item 7), and the Skill chest says "${after.key}" (v26 item 12)`) : bad('L.11c the opened chest and its words', JSON.stringify(after));
  }

  /* ---- 5. L.8b, both drivers: a result-screen clear that tops key 1 opens the Skill chest inside the interlude and hands back on time ----
     REVERSED at build 43 (v24 C.1 / C.5): the interlude NO LONGER OPENS the chest — a chest opens because its key was tapped and the player said
     Open. The same clear makes key 1 WHOLE, so key 1's earn moment plays inside the interlude after the segment, the Skill chest stays READY, and
     the result comes back by itself once the moment has finished (nothing waits for a tap, so the second driver needs nothing new) */
  {
    const bars = Object.assign({}, KEY1_BARS); delete bars['quick-tap:two:5'];
    await boot({ chests: { games: 1 }, adRuns: 0 }, { unlock: ALL_UNLOCK, bars }, { v: 5, plain: PLAIN40 });
    const il = await page.evaluate(async () => { const E = await import('./core/events.js'); const ST = await import('./core/state.js'); const K = await import('./progress/key.js'); const S = await import('./core/store.js');
      const wait = ms => new Promise(r => setTimeout(r, ms)); const at = () => (document.querySelector('.screen.on') || {}).id;
      Object.assign(ST.sel, { game: 'quick-tap', diff: 'two', secs: 5, vs: 0, practice: 0 }); ST.VS.reset();
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5'); const run = { t: Date.now(), g: 'quick-tap', d: 'two', s: 5, hits: c.bar.bar + 3, misses: 0, n: '', v: 4 };
      const before = K.chestState('key'); const adv = K.checkKey(run, false); if (!adv) return { err: 'no clear' };
      const ready = K.chestState('key');
      E.emit('run:record', { run }); E.emit('run:finish', { run, isBest: true, two: false, fresh: [], ach: [], adv });
      /* AMENDED at build 51 (v27 item 14): the screen's own marker is `data-earn`, the tier being earned - `data-rev` went with KEY_REVEAL. And the
         read WAITS FOR THE ANIMATION rather than for a number: the old 2600ms sat inside a 6.3s reveal, and at 1.7s there is no fixed wait that is
         after the result hands over and before the animation ends. It polls for the reveal to come up, then for it to end by itself. */
      let up = false; for (let i = 0; i < 80; i++) { await wait(100); if (!document.getElementById('key-cere').hidden) { up = true; break; } }
      const mid = { screen: at(), key: S.prefs.chests.key, box: up, rev: document.getElementById('s-key').dataset.earn || '' };
      /* AMENDED at build 48 (v26 items 10 / 11): the reveal plays its earn moment to the end and ends BY ITSELF - no tap to continue, no card - and the
         key then waits for its tap; wait for it to end rather than for a fixed time */
      let sawTap = false, sawCard = false; for (let i = 0; i < 80 && !document.getElementById('key-cere').hidden; i++) { await wait(200); const h = document.getElementById('key-cere'); if (h.classList.contains('tap')) sawTap = true; if (h.querySelector('.rcard')) sawCard = true; }
      const held = { screen: at(), tap: sawTap, card: sawCard, ended: document.getElementById('key-cere').hidden, done: document.getElementById('s-key').classList.contains('kdone'), hint: document.getElementById('key-hint').textContent };
      return { err: null, before, ready, mid, held, key: S.prefs.chests.key, state: K.chestState('key') }; });
    if (il.err) bad('L.8b the interlude', il.err);
    /* REVERSED AGAIN at build 46 (v25 items 11 / 22): the clear that makes key 1 whole now plays its FIRST-OPEN REVEAL, which waits for a tap and
       ends on the congratulations card — so the result does NOT come back on a timer any more; the reveal hands it back at Continue. Same family
       as build 41's lesson: a moment that waits for a tap, inside a moment that hands itself back on a timer, owns the hand-back. The chest still
       does not open here (v24 C.1) and nothing is banked by any of it (L10). */
    else (il.before === 'locked' && il.ready === 'ready' && il.mid.screen === 's-key' && il.mid.key === 0 && il.mid.box && il.mid.rev === 'clear' && il.held.screen === 's-key' && !il.held.tap && !il.held.card && il.held.ended && il.held.done && il.held.hint === fill40(CP40.KEY.completeReady, { chest: CP40.GRID.chest.key }) && il.key === 0 && il.state === 'ready')
      ? ok('L.8b REVERSED at build 46 (v25 items 11 / 22), AMENDED at build 48 (v26 items 10 / 11): a live clear that makes key 1 whole interrupts the result and plays key 1\'s FIRST-OPEN REVEAL after the segment, to its end and by itself - no "tap to continue", no card - and the key then says "tap the key to open the Skill chest" instead of handing the result back on a timer. No chest opens by itself; the Skill chest stays READY for its key to be tapped')
      : bad('items 11 / 22 the interlude plays the reveal and holds', JSON.stringify(il));
    // AMENDED at build 48 (v26 item 11): with no card, what hands the result back is the player - Back from the waiting key (or the Skill chest's own card)
    await sleep(600); await page.evaluate(async () => { const R = await import('./ui/router.js'); R.back(); }); await sleep(900);
    const back46 = await onScreen();
    (back46 === 's-over')
      ? ok('items 11 / 22 and the player hands the result screen back - Back from the key waiting to be tapped (v26 item 11), never a timer (build 41\'s lesson, one moment further on)')
      : bad('items 11 / 22 the reveal hands the result back', back46);
  }

  /* ---- 6. L.11a: Customise locked until the Games chest - crossed out, "open the Games chest", defaults applied, choices kept; green until first opened ---- */
  {
    await boot({ col: { 'quick-tap': { sq: '#FFD1DC', lead: '#FFB020', cut: '#FFD1DC' } }, bg: 'grid', snd: 'wood', lastGame: 'quick-tap' }, { ach: { first: NOW40 } }, { v: 5, plain: PLAIN40 });
    const lk = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const T = await import('./ui/theme.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const root = () => getComputedStyle(document.documentElement).getPropertyValue('--sq-live').trim().toUpperCase(), on = () => (document.querySelector('.screen.on') || {}).id;
      const item = () => document.querySelector('[data-go="s-custom"]'), need = () => document.getElementById('cus-need');
      R.show('s-menu'); await wait(300);
      const out = { locked: { cls: item().className, need: need().hidden ? '' : need().textContent, x: getComputedStyle(item(), '::after').content, sq: root(), snd: S.look('snd'), bg: S.look('bg'), kept: S.prefs.col['quick-tap'].sq + ' ' + S.prefs.bg + ' ' + S.prefs.snd } };
      item().click(); await wait(250); out.locked.screen = on(); out.locked.toast = document.getElementById('toast').textContent.trim();
      R.show('s-prog', { tab: 'cul' }); await wait(500); out.cul = { hint: document.getElementById('cul-hint').textContent, earned: !!document.querySelector('#cul-first.done') };
      document.getElementById('cul-first').click(); await wait(300); out.cul.screen = on();
      S.prefs.chests = Object.assign({}, S.prefs.chests, { games: 1 }); S.save(); T.applyPrefs('quick-tap');
      R.show('s-menu'); await wait(300);
      out.open = { cls: item().className, need: need().hidden, sq: root(), snd: S.look('snd'), bg: S.look('bg'), unx: item().classList.contains('unx') };
      R.show('s-prog', { tab: 'cul' }); await wait(400); out.open.hint = document.getElementById('cul-hint').textContent;
      R.show('s-menu'); await wait(200); item().click(); await wait(700);
      out.opened = { screen: on(), seen: S.prefs.cusSeen, green: !!document.querySelector('#c-sq .newthing') };
      R.show('s-menu'); await wait(300); out.opened.after = item().classList.contains('newthing');
      return out; });
    const L = lk.locked, O = lk.open;
    (/cuslock/.test(L.cls) && L.need === 'open the Games chest' && L.x !== 'none' && L.screen === 's-menu' && /Games chest/.test(L.toast))
      ? ok(`L.11a before the Games chest Customise is crossed out with "${L.need}" under it, and a tap says so and stays on the menu`) : bad('L.11a the locked Customise row', JSON.stringify(L));
    (L.sq === '#FFFFFF' && L.snd === 'space' && L.bg === 'stars' && L.kept === '#FFD1DC grid wood')
      ? ok('L.11a meanwhile the defaults apply - white target, the stock background, the default tap sound - and every stored choice is kept, not applied') : bad('L.11a the defaults', JSON.stringify(L));
    /* AMENDED AT BUILD 53 (v28 item 4): the grey line on this tab is gone - it said "open the Games chest to use them" before the chest and "tap
       an earned one to use it" after, two lines saying what a tap does on a screen made of rows. Both are the tab's own count now, either way. */
    (/^\d+ of \d+ unlocked$/.test(lk.cul.hint.trim()) && lk.cul.earned && lk.cul.screen === 's-prog' && /^\d+ of \d+ unlocked$/.test(O.hint.trim()))
      ? ok(`L.11a / v28 item 4 the Customise unlocks tab is not gated: an achievement earned before the chest is there and green, the tab says how much of itself is done either side of the chest ("${lk.cul.hint}" then "${O.hint}"), and a tap on it does not open a locked screen`) : bad('L.11a the Customise unlocks tab', JSON.stringify({ cul: lk.cul, hint: O.hint }));
    (!/cuslock/.test(O.cls) && /newthing/.test(O.cls) && O.need && O.sq === '#FFD1DC' && O.snd === 'wood' && O.bg === 'grid' && O.unx)
      ? ok('L.11a with the Games chest open the strike wipes off, the row is green until first opened (L8 / D.5), and the choices made before apply the moment it opens') : bad('L.11a Customise once the chest is open', JSON.stringify(O));
    (lk.opened.screen === 's-custom' && lk.opened.seen === 1 && !lk.opened.after && lk.opened.green)
      ? ok('L.11a opening Customise spends the green on the menu row, and a colour earned while it was locked is first-seen green there') : bad('L.11a the first open of Customise', JSON.stringify(lk.opened));
  }

  /* ---- 7. L.12: a whole key taps through to its chest on the map - one exported predicate, no chest read on the key screen (A4) ---- */
  {
    const keyScr = strip(read('ui', 'screens', 'key.js'));
    (/export \{[^}]*\bkeyChest\b/.test(read('progress', 'key.js')) && /keyChest\(/.test(keyScr) && !/prefs\.chests|prefs\[['"]chest|store\.unlock/.test(keyScr))
      ? ok('L.12 keyChest() is the one exported predicate, and the key screen reads no chest flag of its own (A4)') : bad('L.12 one predicate');
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL_UNLOCK, bars: KEY1_BARS }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-key"]'); await sleep(900);
    const k12 = await page.evaluate(() => ({ hub: (document.querySelector('#key-ring [data-act="key-chest"]') || {}).dataset?.chest || null, hint: document.getElementById('key-hint').textContent }));
    await svgClick('#key-ring [data-act="key-chest"]'); await sleep(700);
    const map12 = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="key"]'); return { screen: (document.querySelector('.screen.on') || {}).id, flash: c.classList.contains('flash'), open: c.classList.contains('open') }; });
    const none = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS[0]; delete S.store.bars[c.key]; S.save(); R.show('s-menu'); await wait(100); R.show('s-key'); await wait(700);
      const out = { hub: !!document.querySelector('#key-ring [data-act="key-chest"]'), pred: K.keyChest('clear') }; S.store.bars[c.key] = 1; S.save(); return out; });
    (k12.hub === 'key' && /tap the key/.test(k12.hint) && map12.screen === 's-pick' && map12.flash && map12.open && !none.hub && none.pred === null)
      ? ok(`L.12 a whole key 1 whose chest is open is a tap target ("${k12.hint}") that lands on the map with the Skill chest in view, lid up; a key still in progress is not one`) : bad('L.12 the key taps through to its chest', JSON.stringify({ k12, map12, none }));
  }

  /* ---- 8. L.8f + G.8 extended: Testing's switch and reset PER CHEST, four of each, and "set meter to N%" (S5) ---- */
  {
    await boot({}, { bars: { 'quick-tap:two:5': NOW40 } }, { v: 5, plain: PLAIN40 });
    await click('[data-go="s-testing"]'); await sleep(400);
    const t8 = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const q = s => document.querySelector(s);
      const sw = id => q(`[data-act="dev-chestall"][data-chest="${id}"]`), rs = id => q(`[data-act="dev-chestreset"][data-chest="${id}"]`);
      const out = { m0: K.meter() };
      /* AMENDED at build 48 (v26 items 7 / 12): a switch plays forward until its chest is READY - the chests before it opened the way a tap opens
         them - and taking it off is its reset; nothing is remembered and put back. The meter is 0–300 and "set meter to N%" reaches N by play */
      sw('games').click(); await wait(200); out.games = { meter: K.meter(), state: K.chestState('games'), sel: sw('games').classList.contains('sel') };
      sw('games').click(); await wait(200); out.gamesOff = { meter: K.meter(), unlock: Object.keys(S.store.unlock).filter(k => k.split(':').length === 2).length, state: K.chestState('games') };
      sw('key').click(); await wait(200); out.key = { meter: K.meter(), state: K.chestState('key'), games: K.chestState('games') };
      sw('key').click(); await wait(200); out.keyOff = { bars: Object.keys(S.store.bars).join(), state: K.chestState('key') };
      S.prefs.chests = Object.assign({}, S.prefs.chests, { key: 1 }); S.store.ach.key_clear_all = Date.now(); S.save();
      rs('key').click(); await wait(200); out.keyReset = { chest: S.prefs.chests.key, bars: Object.keys(S.store.bars).length, ach: !!S.store.ach.key_clear_all };
      rs('games').click(); await wait(200); out.gamesReset = { chest: S.prefs.chests.games, unlock: Object.keys(S.store.unlock).filter(k => k !== 'sequence:practice' && k.split(':').length === 2).length, snap: !!(S.prefs.devKeys || {}).games };
      q('#dev-meter').value = '250'; q('[data-act="dev-meter"]').click(); await wait(300); out.set = { meter: K.meter(), line: q('#dev-meter-now').textContent, stored: JSON.parse(localStorage.getItem('ne')).prefs.devMeter, chests: ['games', 'key', 'pro', 'thorns'].map(K.chestState).join(), bars: K.TIERS.map(t => K.keyState(t).done).join() };
      out.off = { button: !!q('[data-act="dev-meteroff"]') };
      return out; });
    /* AMENDED AT BUILD 59 (v30 59.11): the Games chest's switch unlocks every mode, and every mode unlocked is now most of the way
       to the Games chest rather than 0% — so what is asserted is that it is ABOVE zero and still short of the key. */
    (t8.m0 === 0 && t8.games.meter > 0 && t8.games.meter < 100 && t8.gamesOff.meter === 0 && t8.games.state === 'ready' && t8.games.sel && t8.gamesOff.unlock === 0 && t8.gamesOff.state === 'locked' && t8.key.meter === 100 && t8.key.state === 'ready' && t8.key.games === 'open' && t8.keyOff.bars === '' && t8.keyOff.state === 'locked')
      ? ok(`L.8f AMENDED at build 48 (v26 items 7 / 12) and at build 59 (v30 59.11): the Games chest's switch unlocks every mode and leaves the chest ready at ${t8.games.meter}% — the modes' own share of the first hundred, where it used to read 0; the Skill chest's opens the Games chest the way a tap does and leaves the Skill chest ready at 100%; taking either off is its reset, and taking the Games one off puts the meter back to ${t8.gamesOff.meter}`) : bad('L.8f the per-chest switches', JSON.stringify(t8));
    (t8.keyReset.chest === 0 && !t8.keyReset.bars && !t8.keyReset.ach && t8.gamesReset.chest === 0 && !t8.gamesReset.unlock && !t8.gamesReset.snap)
      ? ok('G.8 extended: resetting the Skill chest backs out key 1, the chest and its achievements; resetting the Games chest locks every mode again and shuts it') : bad('G.8 the per-chest resets', JSON.stringify({ keyReset: t8.keyReset, gamesReset: t8.gamesReset }));
    /* Build 53 (v28 item 9) made Testing's line say both figures because the shown one was clamped — "250 of 300 raw · 83% shown".
       Build 55 (v29 item 1) puts the shown figure back on the meter's own scale, so the two now agree and the line reads 250 twice. */
    (t8.set.meter === 250 && /\b250\b/.test(t8.set.line) && /250% shown/.test(t8.set.line) && t8.set.stored === undefined && t8.set.chests === 'open,open,open,locked' && t8.set.bars === '30,30,15' && !t8.off.button)
      ? ok(`L.8f AMENDED at build 48 (v26 items 7 / 12): "set meter to N%" REACHES 250 - the Key and Pro chests opened, key 1 and Pro whole, 15 Author bars - and stores no override ("${t8.set.line}"); "meter · as earned" is gone with it`) : bad('L.8f set meter to N%', JSON.stringify({ set: t8.set, off: t8.off }));
  }

  /* ---- 9. the store is v5: the chests named, one ladder step; the retired fields gone ---- */
  {
    const st9 = read('core', 'store.js');
    (/VERSION=7/.test(st9) /* AMENDED at build 42: v6 (up6, L.7c) follows up5; AMENDED AT BUILD 57 (57.6): v7 (up7, prefs.keyIntro) follows both */ && /if\(\(raw\.v\|\|0\)<5\) raw=up5\(raw\);/.test(st9) && /chests:cleanChests\(p\.chests\)/.test(st9) && !/\bpro:\[0,1,2\]|chest1:p\.chest1|gateOff:p\.gateOff|pctSeen:isObj/.test(st9))
      ? ok('store v5: up5 on the ladder, `chests` shape-checked by name, and `pro`, `chest1`-`chest3`, `gateOff` and `pctSeen` no longer read') : bad('store v5 statics');
    await setStorage({ ne: { v: 4, prefs: { ...PLAIN40, chest1: 1, chest2: 1, chest3: 0, pro: 1, gateOff: 1, pctSeen: { clear: 40 } }, runs: [], ach: {}, unlock: {}, intro: SEEN_INTRO, seen: {}, bars: {} } });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const mg = await page.evaluate(() => { const ne = JSON.parse(localStorage.getItem('ne')); return { v: ne.v, chests: ne.prefs.chests, gone: ['chest1', 'chest2', 'chest3', 'pro', 'gateOff', 'pctSeen'].filter(k => k in ne.prefs) }; });
    (mg.v === 7 /* AMENDED at build 42: up6 runs after up5; AMENDED at build 57: up7 after both */ && JSON.stringify(mg.chests) === '{"games":1,"key":1,"pro":1,"thorns":0}' && !mg.gone.length)
      ? ok('store v5: a v4 record with chest 1 and chest 2 open loads with the Games, Key and Pro chests open - Games too, because chest 1 already waited for every mode (G.3) - and the retired fields dropped') : bad('store v5 migration', JSON.stringify(mg));
  }

  /* ---- 10. L.10a / §M.2: key 1 is quiet before the Games chest - no clear banked, no interlude, no outline fill, no key set, the modes count on the key screen ---- */
  {
    await boot({}, { runs: [{ t: NOW40, g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 60, misses: 0 }] }, { v: 5, plain: PLAIN40 });
    const qt = await page.evaluate(async () => { const K = await import('./progress/key.js'); const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = K.COMBOS.find(x => x.key === 'quick-tap:two:5');
      const out = { adv: K.checkKey({ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: c.bar.bar + 5, misses: 0 }, false), bars: Object.keys(S.store.bars).length, ach: K.checkKeyAch({ g: 'quick-tap' }).length };
      S.store.bars['quick-tap:two:5'] = 1; S.save();   // even a clear banked before build 40 shows nothing until the chest
      R.show('s-pick'); await wait(600); const t = document.querySelector('.tile[data-game="quick-tap"]'); out.fill = { part: t.classList.contains('kpart'), kf: t.querySelector('.kfill').style.getPropertyValue('--kf') };
      R.show('s-key'); await wait(600); out.key = { main: document.getElementById('key-main').hidden, shell: document.getElementById('key-shell').innerText.replace(/\s+/g, ' ').trim(), locked: document.querySelectorAll('#key-keys .kkey.locked').length, digits: [...document.querySelectorAll('#key-keys .kkey')].some(b => /\d/.test(b.textContent)) };
      R.show('s-prog', { tab: 'ach' }); await wait(500); out.sets = [...document.querySelectorAll('#achlist h4')].map(h => h.className).filter(x => /^key/.test(x)).join();
      S.store.bars = {}; S.save(); return out; });
    (qt.adv === null && !qt.bars && !qt.ach && !qt.fill.part && qt.fill.kf === '0.000' && qt.key.main && /1 of 13 modes/.test(qt.key.shell) && !/%/.test(qt.key.shell) /* AMENDED at build 48 (v26 item 9): no percentage on the Keys screen */ && qt.key.locked === 3 && !qt.key.digits && !qt.sets)
      ? ok(`L.10a / §M.2 before the Games chest key 1 is quiet: a run past a bar banks nothing and hands back no interlude, the tile outline stays empty, no key set is listed, and the key screen says only "${qt.key.shell.slice(0, 70)}…"`) : bad('L.10a key 1 quiet before the Games chest', JSON.stringify(qt));
  }
}
