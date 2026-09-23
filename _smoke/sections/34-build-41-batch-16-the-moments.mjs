/* ---- 21. build 41 (batch 16, the moments - FEEDBACK-v23 §L.6, §L.8 d-e, §L.9 a-d, §L.10 d, §L.11 b d e). Presentation only, L10 quoted ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, names, check, ok, bad, finished, root, read, REVIEW, rvRead, noReview, strip, boot, GAUNT_ALL, at, browser, page, click, down, up, revealReady, revealDone, readySeen, verdict, FROM, named } from '../lib/gate.mjs';

export const SECTION = ["build 41 - batch 16, the moments"];

export async function run() {
  const NOW41 = Date.now();
  const PLAIN41 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {} };
  const MS41 = await import(pathToFileURL(path.join(root, 'config', 'messages.js')).href);
  const CP41 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 59 (v30 59.3): MSG.quote, for the video word
  const CH41 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const AU41 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const U41 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB41 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL41 = Object.fromEntries(U41.UNLOCKS.map(x => [x.key, NOW41]));
  const tierBars = t => Object.fromEntries(Object.keys(KB41.KEY_BARS).map(k => [t === 'clear' ? k : `${k}|${t}`, NOW41]));
  const IDS = ['games', 'key', 'pro', 'thorns'];
  const scr = () => page.evaluate(() => (document.querySelector('.screen.on') || {}).id);

  /* ---- 1. L.9a / L.10d: four sprites in one data config, one renderer for every surface, no art left in the markup; L10 - the two new modules write nothing ---- */
  {
    const L = CH41.CHEST_LOOK, B = CH41.METER_BANDS;
    const sig = id => JSON.stringify([L[id].box, L[id].lid, L[id].fit || [], L[id].spikes || [], L[id].boxSpikes || [], L[id].stroke, L[id].fill]);
    const distinct = new Set(IDS.map(sig)).size === 4;
    /* AMENDED at build 51 (v27 item 13 / R2): a chest matches the KEY that opens it, so the gold banded chest is the SKILL chest's and the Pro
       chest is drawn from the Pro key — its own `col`, the ring and antennae on the lid, traces across the box. `band` still says which meter
       band a chest's figure belongs to; it is no longer where its colour comes from (`col` is, through chestCol()). */
    const looks = L.games.stroke === 'var(--mute)' && L.games.fill === 'none' && L.games.sw <= 1
      && (L.key.fit || []).length >= 4 && L.key.lidSw > L.games.lidSw && L.key.lid.length > L.games.lid.length && L.key.col === L.key.stroke
      && (L.pro.fit || []).length >= 3 && (L.pro.lid || []).length > L.key.lid.length && L.pro.col === L.pro.stroke && !(L.pro.col || '').startsWith('var(')
      && L.thorns.fill === '#000000' && L.thorns.stroke === '#FFFFFF' && (L.thorns.spikes || []).length >= 3 && (L.thorns.boxSpikes || []).length > 0
      && IDS.every((id, i) => L[id].band === i) && IDS.every(id => L[id].col);
    const idle = IDS.map(id => L[id].idle.kind).join() === 'breath,shimmer,circuit,spikes' && L.games.idle.px < L.key.idle.px && L.key.idle.px < L.pro.idle.px && L.pro.idle.px <= L.thorns.idle.px;
    const drawers = ['ui/screens/pick.js', 'ui/screens/key.js', 'ui/ceremony.js'].every(f => /chestSvg\(/.test(strip(read(...f.split('/')))));
    const noArt = !/class="chestart"/.test(read('index.html')) && !/CHEST_ART/.test(strip(read('ui', 'screens', 'key.js')));
    const l10 = ['ui/ceremony.js', 'ui/chest.js'].every(f => !/\bsave\(|\bstore\b|\bprefs\b|localStorage/.test(strip(read(...f.split('/')))));
    (Object.keys(L).join() === IDS.join() && distinct && looks && idle && drawers && noArt && l10)
      ? ok('L.9a / L.10d four chest sprites in one data config (config/chests.js CHEST_LOOK): Games a thin --mute outline, Skill the gold fittings and heavier lid, Pro the Pro key\'s ring, antennae and circuit traces, Author black with spikes and white accents, each in the colour of the key that opens it (v27 item 13 / R2); four idles rising in strength; one renderer (ui/chest.js) draws the map, the key screen and the ceremony, no chest art is left in the markup, and neither new module writes anything (L10)')
      : bad('L.9a the four sprites', JSON.stringify({ keys: Object.keys(L), distinct, looks, idle, drawers, noArt, l10 }));
  }

  /* ---- 2. L.9b: READY animates, locked and opened do not; locked is crossed out, opened is lid up ---- */
  {
    // AMENDED at build 58 (58.2): the Pro chest is READY here only once Gauntlet Mini is finished as well
    await boot({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 }, readySeen: { pro: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro')), gaunt: GAUNT_ALL() }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(1400);
    const s9 = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), svg = c.querySelector('.chestart');
      return [id, { cls: ['locked', 'ready', 'open'].filter(k => c.classList.contains(k)).join(), look: svg && svg.dataset.look, run: svg ? svg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName) : null,
        x: svg ? getComputedStyle(svg.querySelector('.xl')).opacity : null, lid: svg ? getComputedStyle(svg.querySelector('.lidg')).rotate : null }]; })));
    (s9.games.cls === 'open' && s9.key.cls === 'open' && s9.pro.cls === 'ready' && s9.thorns.cls === 'locked' && IDS.every(id => s9[id].look === id)
      // AMENDED at build 51 (v27 item 13): the Pro chest's idle is a CURRENT running its traces now (`idlecur` + its nodes), not a metal shimmer
      && !s9.games.run.length && !s9.key.run.length && !s9.thorns.run.length && s9.pro.run.includes('idleglow') && s9.pro.run.includes('idlecur') && s9.pro.run.includes('idlenode')
      && s9.thorns.x === '1' && s9.games.x === '0' && /-118deg/.test(s9.games.lid) && s9.thorns.lid === 'none')
      ? ok(`L.9b on the map each chest wears its own sprite; the READY Pro chest runs its idle (${[...new Set(s9.pro.run)].join(' + ')}) and nothing else on a chest animates - not the opened Games and Skill chests, lid up and still, and not the locked Author chest, crossed out`)
      : bad('L.9b the chest states', JSON.stringify(s9));
  }

  /* ---- 3. L.9c: one quiet sound the first time the map paints a chest ready, not on the next visit ---- */
  {
    await boot({}, { unlock: ALL41 }, { v: 5, plain: PLAIN41 });
    const r9 = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const S = await import('./core/store.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      let n = 0; const o = A.Snd.chestReady; A.Snd.chestReady = function () { n++; return o.apply(this, arguments); };
      R.show('s-pick'); await wait(500); const first = n; R.show('s-menu'); await wait(100); R.show('s-pick'); await wait(500); const second = n;
      const seen = Object.assign({}, S.prefs.readySeen); A.Snd.chestReady = o; return { first, second, seen }; });
    const fx = AU41.CHEST_READY_FX;
    (r9.first === 1 && r9.second === 1 && r9.seen.games === 1 && !r9.seen.key && fx.length === 2 && fx[1][1] > fx[0][1] && fx.every(e => e[1] < 400 && e[5] < 0.085))
      ? ok('L.9c the first time the map paints the Games chest READY it plays one quiet sound - a low two-note rise under the unlock sound\'s level - and the next visit plays nothing') : bad('L.9c the ready sound', JSON.stringify({ r9, fx }));
  }

  /* ---- 4. L.6 / L.10d: the four ceremonies as named steps, their effects and stings, and none of it the unlock or achievement sound ---- */
  {
    /* AMENDED AT BUILD 53 (v28 items 13 / 16): a chest opened by a KEY unlocks and never breaks, so all three key chests run the one key-turn
       sequence; the breaking moved to the Games chest, which no key opens, as `crack` then `burst`.
       AMENDED AGAIN AT BUILD 54 (v29 item 5): the Author chest keeps that sequence and lays its own five theme steps over it. */
    /* AMENDED AGAIN AT BUILD 57 (v29 Section A, 57.2 / 57.8): every chest a key opens runs a COVER first and the Games chest cracks on its own
       squares' beat, so both step lists move. The Games chest is SHORTER for it (its cracking shares the uncross beat instead of following it) and the
       three key chests are longer (a cover in front of the turn), which is what makes the Author chest the longest thing in the app. */
    /* AMENDED AT BUILD 59 (v30 59.16): the two chests that want a GAUNTLET gain four named beats between `assemble` and `turn` —
       hold, enter, grip, drive — because the key and the glove used to arrive together and be gone inside half a second. The
       Games and Skill chests have no Gauntlet and are untouched, which is half of what this check is for. */
    const C = CH41.CEREMONY, want = { games: 'uncross,crack,path,burst,lid,chord', key: 'cover,uncover,assemble,turn,lid,spill',
      pro: 'cover,uncover,assemble,hold,enter,grip,drive,turn,lid,spill',
      thorns: 'cover,black,spikes,split,uncover,widen,recede,assemble,hold,enter,grip,drive,turn,lid,spill' };
    const names = IDS.every(id => C[id].steps.map(s => s.name).join() === want[id]);
    /* AMENDED AT BUILD 59 (v30 59.16): the CEILING moves from 9000 to 11500, because the item deliberately lengthens the two
       ceremonies that now have a gauntlet: "That is roughly 2.5s added, which is fine: he has said these moments can run long as
       long as something is happening." The bound is restated rather than dropped — the four ceremonies must still RISE, the Games
       one must still be about 3s, and there is still a ceiling. FLAGGED IN THE OUTCOME: build 57's question 1, whether the Author
       chest's 8.7s opening is too long, is STILL UNANSWERED, and this takes it to 11.0s. If he says it is too long, this ceiling
       and those four beats come back down together. */
    const lens = IDS.map(id => C[id].ms), rising = lens.every((v, i) => !i || v > lens[i - 1]) && Math.abs(lens[0] - 3000) <= 500 && lens[3] <= 11500;
    const inside = IDS.every(id => C[id].steps.every(s => s.at >= 0 && s.at + s.ms <= C[id].ms));
    /* AMENDED at build 43 (v24 C.7): a sting is CUT FROM ITS KEY'S THEME through the arrangement engine, so it is read off Snd.chestPlan() on the
       page and held to the theme's own rule — nothing under 700ms (or attacked under 40ms) at 300 Hz or above, nothing above C5 under 1200ms.
       Build 41 held every note to 700ms; a theme's bass pulse and low arp are short by design, and they are under 300 Hz */
    const stingBad = [], end = {};
    const plans41 = await page.evaluate(async ids => { const M = await import('./audio.js'); return Object.fromEntries(ids.map(id => [id, M.Snd.chestPlan(id).filter(e => e[8] === 'sting')])); }, IDS);
    /* AMENDED AT BUILD 57 (v29 Section A, 57.8): a chest's sting is the TURN's music and audio.js now offsets it by COVER_AT, so its absolute end is
       the cover's length plus its own. What the rule is about is the sting's LENGTH — 3 to 6 seconds of a theme resolving — so it is measured as its
       own span from its first note to its last, which is the same number it has always been. */
    for (const id of IDS) { const s = AU41.CHEST_STING[id], tr = s && AU41.TRACKS[s.track], p = plans41[id] || []; if (!tr || !p.length) { stingBad.push(id + ' no theme'); continue; }
      end[id] = +(Math.max(...p.map(e => e[0] + e[3] / 1000)) - Math.min(...p.map(e => e[0]))).toFixed(2); if (end[id] < 3 || end[id] > 6.05) stingBad.push(`${id} ${end[id]}s`);
      for (const e of p) { if (e[1] >= 300 && (e[3] < 700 || e[6] < 40)) stingBad.push(`${id} short or hard ${Math.round(e[1])}Hz ${e[3]}ms`); if (e[1] > 523.3 && e[3] < 1200) stingBad.push(`${id} short high ${Math.round(e[1])}Hz`); } }
    // AMENDED at build 42 (v23 L.7a): each sting points at the rewritten theme, same root and chords as the one it was cut from
    const themes = IDS.map(id => AU41.CHEST_STING[id].track).join() === 'theme:key,theme:key,theme:pro,theme:thorns';
    const fxBad = [];
    for (const id of IDS) for (const e of AU41.CHEST_FX[id]) if (e[3] < 250 && e[1] > 400) fxBad.push(`${id} ${e[1]}Hz ${e[3]}ms`);
    const sigFx = id => JSON.stringify((AU41.CHEST_FX[id] || []).map(e => [e[0], e[1], e[4]]));
    const distinct = new Set(IDS.map(sigFx)).size === 4;
    const isUnlock = id => [523.3, 784, 1046.5].every((f, i) => (AU41.CHEST_FX[id] || []).some(e => e[1] === f && Math.abs(e[0] - i * .1) < .01));
    const notVerdict = IDS.every(id => !Object.values(AU41.VERDICT_FX).some(v => JSON.stringify(v) === JSON.stringify(AU41.CHEST_FX[id])));
    const noise = Object.keys(AU41.CHEST_NOISE).join() === 'thorns' && AU41.CHEST_NOISE.thorns.length === 1;
    const keyScr = strip(read('ui', 'screens', 'key.js')), cer = strip(read('ui', 'ceremony.js')), aud = strip(read('audio.js'));
    const block = (aud.match(/chest\(id\)\{[\s\S]*?\n    chestReady/) || [''])[0];
    const code = !/unlockFx/.test(keyScr) && !/unlockFx/.test(cer) && /Snd\.chest\(id\)/.test(cer) && !!block && !/unlockFx|click\(/.test(block);
    (names && rising && inside && !stingBad.length && themes && !fxBad.length && distinct && !IDS.some(isUnlock) && notVerdict && noise && code)
      ? ok(`L.6 / L.10d four ceremonies as named steps in config/chests.js - ${lens.map(v => v / 1000 + 's').join(', ')}, every step inside its ceremony; each chest its own effects and a ${IDS.map(id => end[id].toFixed(1)).join(' / ')}s sting from its key's theme, no note under 700ms and none above C5 under 1200ms; the four effect sets differ from each other, from the unlock sound and from every verdict; one noise cut, Thorns only; the open plays Snd.chest, never unlockFx (the achievement click is untouched, 1.6)`)
      : bad('L.6 the ceremonies and their sounds', JSON.stringify({ names, rising, inside, stingBad: stingBad.slice(0, 4), themes, fxBad, distinct, notVerdict, noise, code }));
  }

  /* ---- 5. L.6 live: a real open - not skippable, music hushed, the steps in order, "tap to continue", then the map and the spill (L.11b) ---- */
  {
    await boot({}, { unlock: ALL41 }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(async () => { const A = await import('./audio.js'); window.__c41 = []; const o = A.Snd.chest; A.Snd.chest = function (id) { window.__c41.push(id); return o.apply(this, arguments); };
      window.__st41 = []; const h = document.getElementById('key-cere'); new MutationObserver(() => { const s = h.dataset.step; if (s && window.__st41[window.__st41.length - 1] !== s) window.__st41.push(s); }).observe(h, { attributes: true, attributeFilter: ['data-step'] }); });
    await click('.chest[data-chest="games"]'); await sleep(1600);
    const early = await page.evaluate(async () => { const A = await import('./audio.js'); const h = document.getElementById('key-cere'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, tap: h.classList.contains('tap'), hushed: A.Music.probe().hushed, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games };
      h.click(); document.querySelector('#s-key .back').click(); await wait(200);
      out.after = { screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden }; return out; });
    await revealReady();
    const ready = await page.evaluate(() => { const h = document.getElementById('key-cere'); return { tap: h.classList.contains('tap'), txt: h.innerText.replace(/\s+/g, ' ').trim(), steps: window.__st41.slice(), vars: h.getAttribute('style') || '',
      gifts: [...h.querySelectorAll('.rgift b')].map(g => g.textContent), syms: [...h.querySelectorAll('.rgift .sym')].map(x => x.dataset.sym) }; });
    await revealDone(); await sleep(900);
    const done = await page.evaluate(async () => { const A = await import('./audio.js'); const c = document.querySelector('.chest[data-chest="games"]'), w = document.querySelector('.chestwords[data-for="games"]');
      return { screen: (document.querySelector('.screen.on') || {}).id, hidden: document.getElementById('key-cere').hidden, hushed: A.Music.probe().hushed, chest: window.__c41.slice(), spill: w.classList.contains('spill') && c.classList.contains('spill'),
        spilled: JSON.parse(localStorage.getItem('ne')).prefs.spill.games, words: [...w.querySelectorAll('.cw')].map(x => x.dataset.act + ':' + x.dataset.to).join(), burst: c.querySelectorAll('.pburst i').length }; });
    (early.screen === 's-key' && early.shown && !early.tap && early.hushed && early.stored === 1 && early.after.screen === 's-key' && early.after.shown)
      ? ok('L.6 / L10 a ready Games chest opens on its key screen as its CEREMONY - the chest already stored before a frame plays, the music hushed fully, and neither a tap on it nor Back does anything before the end') : bad('L.6 the ceremony plays and is not skippable', JSON.stringify(early));
    /* AMENDED at build 46 (v25 items 6 / 22): the named steps are unchanged and still come off the config's own times, and `settle` then `tap`
       are the shared reveal's own two beats after them — the stage ends, the symbols rise out of the chest, and only then does it hold. */
    // AMENDED AT BUILD 53 (v28 item 13): `crack` and `burst` join them - the Games chest is the one that breaks open
    // AMENDED AT BUILD 57 (v29 Section A, 57.2): the cracking runs ON the uncross beat now, so `crack` comes before `path` in the step order
    (ready.tap && ready.steps.join() === 'uncross,crack,path,burst,lid,chord,settle,tap' && /GAMES CHEST OPENED/i.test(ready.txt) && /TAP TO CONTINUE/i.test(ready.txt) && /--st-uncross-at:\s?0ms/.test(ready.vars) /* AMENDED at build 49: the reveal sets --reveal-at on the host after the stage, and the browser re-serialises the attribute with a space */
      /* AMENDED at build 52 (v27 item 7): read from the slot, not spelled again. AMENDED at build 59 (v30 59.3): and the slot's
         title wears MSG.quote, so it reads as the name of a video rather than as a sentence — still read, never spelled. */
      && ready.gifts.join() === 'CUSTOMISE,SKILL KEY,' + CP41.MSG.quote[0] + MS41.MESSAGES.find(m => m.by && m.by.chest === "games").title + CP41.MSG.quote[1] && ready.syms.join() === 'palette,key,video')
      ? ok(`L.6 its named steps play in order off the config's own times (${ready.steps.join(' → ')}); item 6: ${ready.gifts.length} unlocks rise out of it as symbols with their titles (${ready.gifts.join(' · ')}) and only then does it hold on "tap to continue"`) : bad('L.6 the steps and the reveal', JSON.stringify(ready));
    // AMENDED at build 49 (v26 item 5): the chest's words carry its About video too, which goes to that slot
    // AMENDED at build 52 (v27 item 8): the Games chest's slot id moved with Aiden's new line-up, so the word's target is read from the config
    (done.screen === 's-pick' && done.hidden && !done.hushed && done.chest.join() === 'games' && done.spill && done.spilled === 1
      && done.words === 'chestword:s-custom,chestword:key:0,chestword:msg:' + MS41.MESSAGES.find(m => m.by && m.by.chest === 'games').id && done.burst === CH41.SPILL.particles)
      ? ok('L.6 / L.11b "tap to continue" goes to the map and the music comes back, one chest sound played; the words spill out beside the chest with a burst from the lid, once, and each word is a tap target to what it names') : bad('L.6 / L.11b after the tap', JSON.stringify(done));
  }

  /* ---- 6. L.11d one layout, nothing beside a shut chest, every word fits at 390px; L.11b the words go where they say ---- */
  {
    await boot({ chests: { games: 1, key: 1, pro: 1 }, spill: { games: 1, key: 1, pro: 1 }, readySeen: { thorns: 1 } }, { unlock: ALL41, bars: Object.assign({}, tierBars('clear'), tierBars('pro'), tierBars('author')) }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(900);
    const lay = await page.evaluate(() => Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`), w = document.querySelector(`.chestwords[data-for="${id}"]`), cell = w.hidden ? null : w.getBoundingClientRect();
      return [id, { r: c.style.gridRow, col: c.style.gridColumn, hidden: w.hidden, n: w.hidden ? 0 : w.querySelectorAll('.cw').length,
        // AMENDED at build 46 (v25 item 7): the word is `.cwt` now, with its symbol beside it — the text is what has to fit, and the row is taller
        /* AMENDED at build 52 (v27 items 7 / 8): a REWARD word is one line and still is; the VIDEO word is Aiden's own message title, which
           since build 49 may wrap (`.cw.msg`) and since item 8 is a sentence rather than a name — "The skill chest is open" against "PRO KEY".
           It gets two lines, which is 44px at the row's own line height; anything that needs three overflows the cell and still fails. */
        /* AMENDED AT BUILD 53 (v28 item 10): GAUNTLET became GAUNTLET MINI and GAUNTLET II became GAUNTLET MEGA, so two reward words are two
           words wide and wrap. The rule that matters is unchanged - the word fits its CELL and stays on the phone - so what is held is the
           cell's right edge, the screen's, and the row's two-line height; the one-line requirement went with the longer names. */
        fit: w.hidden ? null : [...w.querySelectorAll('.cw')].every(x => { const b = x.getBoundingClientRect();
          // a `tba` row carries its own second line ("not built yet"), so it is allowed the same two lines plus that one
          return b.right <= cell.right + 1 && b.right <= innerWidth && b.height <= (x.querySelector('small') ? 62 : 44); }) }]; })));
    const shut = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      S.prefs.chests = { games: 0, key: 0, pro: 0, thorns: 0 }; S.store.unlock = {}; S.save(); R.show('s-menu'); await wait(80); R.show('s-pick'); await wait(600);
      return Object.fromEntries(['games', 'key', 'pro', 'thorns'].map(id => { const c = document.querySelector(`.chest[data-chest="${id}"]`); return [id, { r: c.style.gridRow, col: c.style.gridColumn, words: !document.querySelector(`.chestwords[data-for="${id}"]`).hidden }]; })); });
    (IDS.every(id => lay[id].r === shut[id].r && lay[id].col === shut[id].col) && IDS.every(id => !shut[id].words) && lay.thorns.hidden && ['games', 'key', 'pro'].every(id => lay[id].fit && lay[id].n >= 1))
      ? ok('L.11d one layout for every state - each chest keeps its cell open or shut, nothing stands beside a chest that is not open, and at 390px every word fits its cell on one line (the sprite did not need shrinking)') : bad('L.11d the layout', JSON.stringify({ lay, shut }));
    await boot({ chests: { games: 1, key: 1 }, spill: { games: 1, key: 1 } }, { unlock: ALL41, bars: tierBars('clear') }, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-pick"]'); await sleep(800);
    const taps = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id; const out = {};
      const word = (id, w) => [...document.querySelectorAll(`.chestwords[data-for="${id}"] .cw`)].find(x => x.dataset.w === w);
      word('games', 'CUSTOMISE').click(); await wait(400); out.custom = on(); R.show('s-pick'); await wait(500);
      word('key', 'PRO KEY').click(); await wait(500); out.pro = { screen: on(), tier: (document.querySelector('#key-keys .kkey.sel') || { dataset: {} }).dataset.kt }; R.show('s-pick'); await wait(500);
      // AMENDED at build 49 (v26 item 13): GAUNTLET is a tile on the map now, so its word goes to that tile; the video word goes to its slot on About
      // AMENDED AT BUILD 53 (v28 item 10): the word is GAUNTLET MINI now, and it is composed off GAUNTLET.name rather than spelled here
      [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => x.dataset.to === 'tile:g1').click(); await wait(300);
      out.soon = { screen: on(), flash: document.querySelector('#grid .tile[data-gauntlet="g1"]').classList.contains('flash') };
      [...document.querySelectorAll('.chestwords[data-for="key"] .cw')].find(x => /^msg:/.test(x.dataset.to)).click(); await wait(400); out.video = on();
      return out; });
    (taps.custom === 's-custom' && taps.pro.screen === 's-key' && taps.pro.tier === '1' && taps.soon.screen === 's-pick' && taps.soon.flash && taps.video === 's-about')
      ? ok('L.11b every word is a tap target to the thing it names - CUSTOMISE opens Customise, PRO KEY the Pro key, the Gauntlet word its tile on the map (v26 item 13), and the video its slot on About (v26 item 5)') : bad('L.11b the words go where they say', JSON.stringify(taps));
  }

  /* ---- 7. L.8d / L.8e: the meter's four bands, driven by "set meter to N%"; effects scale in a band; the pulse in the band's colour; never green ---- */
  {
    const B = CH41.METER_BANDS;
    const cfgOk = B.length === 4 && B.map(b => b.col).join() === 'var(--mute),var(--ink),#E8B84A,#FFFFFF' && !B.some(b => /3DD68C|--ok/i.test(JSON.stringify(b)))
      && B[3].ground === '#000000' && B[3].shake.every(Number.isInteger) && B[3].shake[1] <= 2 && B[2].glow[1] > B[2].glow[0] && B[3].spike[1] > 0 && !B[0].glow[1] && !B[1].glow[1];
    const pct = (read('styles', 'app.css').match(/@keyframes pctup\{[^\n]*/) || [''])[0], pctOk = !!pct && !/--ok/.test(pct) && /--mcol/.test(pct);
    await boot({}, {}, { v: 5, plain: PLAIN41 });
    const mb = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const K = await import('./progress/key.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = [];
      /* AMENDED at build 48 (v26 items 7 / 12): there is no override, so each figure is REACHED - Testing's devMeterTo clears the bars and opens the
         chests it means - and the meter stops at 300, which is the Thorns band's look. 96 / 196 / 296 are the highest a bar count makes under 100 / 200 / 300 */
      const P = await import('./progress.js'); const modes = on => { if (on) P.devModesAll(true); else P.devModesReset(); };
      for (const v of [0, 50, 96, 100, 150, 196, 200, 250, 296, 300]) { const n = K.devMeterTo(v, modes); S.prefs.meterSeen = n; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(120);
        const m = document.querySelector('#menu-key .meterv'), cs = getComputedStyle(m), band = K.meterBand(v);
        out.push({ v, i: band.i, k: +band.k.toFixed(2), cls: m.className, col: cs.color, bg: cs.backgroundColor, ts: cs.textShadow, anim: cs.animationName, timing: cs.animationTimingFunction, shp: m.style.getPropertyValue('--shp'), glow: m.style.getPropertyValue('--mglow'), txt: document.getElementById('menu-key').textContent }); }
      K.devMeterTo(260, modes); S.prefs.meterSeen = 210; S.save(); R.show('s-pick'); await wait(40); R.show('s-menu'); await wait(60);
      const mk = document.getElementById('menu-key'); const pulse = { up: mk.classList.contains('up'), mcol: mk.style.getPropertyValue('--mcol'), anim: getComputedStyle(mk).animationName };
      return { out, pulse }; });
    const at = v => mb.out.find(x => x.v === v);
    const bandsOk = mb.out.every(x => x.cls === 'meterv mb' + x.i && x.col !== 'rgb(61, 214, 140)') && [0, 50, 96].every(v => at(v).i === 0) && at(100).i === 1 && at(196).i === 1 && at(200).i === 2 && at(296).i === 2 && at(300).i === 3
      && at(0).col === 'rgb(110, 108, 104)' && at(150).col === 'rgb(232, 230, 225)' && at(250).col === 'rgb(232, 184, 74)' && at(300).col === 'rgb(255, 255, 255)' && at(300).bg === 'rgb(0, 0, 0)'
      && at(0).ts === 'none' && at(150).ts === 'none' && at(250).ts !== 'none' && parseFloat(at(296).glow) > parseFloat(at(200).glow)
      && at(0).anim === 'none' && at(150).anim === 'none' && at(300).anim === 'mshake' && /^steps\(1(, end)?\)$/.test(at(300).timing) /* Chromium serialises steps(1, end) as steps(1) */ && at(300).shp === '1' && at(250).txt === '250% complete';   // v29 (item 1, build 55): the printed figure is the meter, not a share of it. Was '83% complete' at build 53 (v28 item 9): the BAND still reads the raw meter; the TEXT is meterPct()
    (cfgOk && pctOk && bandsOk && mb.pulse.up && mb.pulse.mcol === '#E8B84A' && mb.pulse.anim === 'pctup')
      ? ok('L.8d / L.8e the meter\'s bands at figures REACHED by Testing\'s "set meter to N%" (AMENDED at build 48, v26 items 7 / 12 - 0–300, no override): 0-99 --mute with no effects, 100-199 --ink, 200-299 gold with a glow that grows across the band, 300 - the full meter - white on black with a spiked edge, a cold glow and a stepped whole-pixel shake; a rise pulses in the band\'s colour; green is in no band and not in the pulse (B.22)')
      : bad('L.8d / L.8e the meter bands', JSON.stringify({ cfgOk, pctOk, bandsOk, out: mb.out.filter(x => [0, 100, 200, 250, 300].includes(x.v)), pulse: mb.pulse }));
  }

  /* ---- 8. L.6 / S5: Testing's "replay chest opening" x4 - the ceremony with nothing stored, then the map's spill, then the chest put back ---- */
  {
    await boot({}, {}, { v: 5, plain: PLAIN41 });
    await click('[data-go="s-testing"]'); await sleep(400);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#s-testing[data-dev] [data-act="dev-chest"]')].map(b => b.dataset.chest + ':' + b.textContent.trim()));
    const rp = [];
    for (const id of IDS) { await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-testing'); }); await sleep(200);
      await click(`[data-act="dev-chest"][data-chest="${id}"]`); await sleep(700);
      rp.push(await page.evaluate(id => { const h = document.getElementById('key-cere'); return { id, screen: (document.querySelector('.screen.on') || {}).id, shown: !h.hidden, chest: h.dataset.chest, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests[id] }; }, id)); }
    await revealDone(); await sleep(700);
    const end = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { screen: (document.querySelector('.screen.on') || {}).id, spill: c.classList.contains('spill'), open: c.classList.contains('open'), stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.thorns }; });
    await sleep(3800);
    const rest = await page.evaluate(() => { const c = document.querySelector('.chest[data-chest="thorns"]'); return { cls: ['locked', 'ready', 'open', 'spill'].filter(k => c.classList.contains(k)).join(), words: !document.querySelector('.chestwords[data-for="thorns"]').hidden }; });
    (btns.length === 4 && btns.every(b => /^(\w+):replay \1 chest opening$/.test(b)) && rp.every(x => x.screen === 's-key' && x.shown && x.chest === x.id && !x.stored) && end.screen === 's-pick' && end.spill && end.open && !end.stored && rest.cls === 'locked' && !rest.words)
      ? ok('L.6 / S5 Testing has "replay <chest> chest opening" x4: each plays that chest\'s ceremony on the key screen with nothing stored, and "tap to continue" lands on the map with its spill replayed, the chest then put back as its state leaves it') : bad('L.6 the four replay buttons', JSON.stringify({ btns, rp, end, rest }));
  }

  /* ---- 9. L.11e / L.10d / L.8f: the catalogue's chest cards, and the second driver answering a ceremony ---- */
  rv3: {
    if (!REVIEW) { noReview("L.11e / L.10d / L.8f the catalogue's chest cards"); break rv3; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).filter(a => a.group === 'chests').map(a => a.shot) : [];
    const want41 = IDS.flatMap(id => ['locked', 'ready', 'opened', 'spill'].map(s => `30-chest-${id}-${s}`)).concat(IDS.map(id => `31-cere-${id}`), [0, 50, 100, 150, 200, 250, 300 /* AMENDED at build 48 (v26 items 7 / 9 / 12): the meter is 0–300 */].map(v => `32-meter-${String(v).padStart(3, '0')}`), IDS.map(id => `33-spill-${id}`));
    (/const cereTap = async/.test(gen) && /await cereTap\(\)/.test(gen) && /ceremonyFrame\(/.test(gen) && /chestPlan\(/.test(gen) && want41.every(s => shots.includes(s)) && shots.length === want41.length
      && /'chests'\]\.forEach/.test(tpl) && /id="g-chests"/.test(tpl) && /REF\.chestFx/.test(tpl) && /w === 'noise'/.test(tpl))
      ? ok(`L.11e / L.10d / L.8f the catalogue carries ${want41.length} chest cards - 16 chest states, four ceremonies at five frames each with their sting and effects on a button, the meter at seven values (0–300 since build 48), a spill per chest - drawn by the app's own renderers; and the second driver answers a ceremony's "tap to continue" as the gate does`)
      : bad('L.11e the catalogue cards', JSON.stringify({ shots: shots.length, missing: want41.filter(s => !shots.includes(s)) }));
  }
}
