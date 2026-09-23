/* ---- 23. build 43 (batch 17, chests and keys - FEEDBACK-v24 §A, §B.1-§B.3, §B.5, §C). Presentation, one menu lock and one build flag;
   nothing clears, opens by itself or banks anything new (L10) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, GAMES, CLOCK, sleep, cur, check, ok, bad, finished, root, read, REVIEW, rvRead, noReview, strip, boot, at, page, until, onScreen, click, down, revealDone, readySeen, serve } from '../lib/gate.mjs';

export const SECTION = ["build 43 - batch 17, chests and keys"];

export async function run() {
  const AU43 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CP43 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const KY43 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const TH43 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const U43 = await import(pathToFileURL(path.join(root, 'config', 'unlocks.js')).href);
  const KB43 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
  const ALL43 = Object.fromEntries(U43.UNLOCKS.map(x => [x.key, Date.now()]));
  const bars43 = (...tiers) => Object.fromEntries(tiers.flatMap(t => Object.keys(KB43.KEY_BARS).map(k => [t === 'clear' ? k : `${k}|${t}`, Date.now()])));
  const PLAIN43 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 }, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const show43 = (id, o) => page.evaluate(async (id, o) => { const R = await import('./ui/router.js'); R.show(id, o); }, id, o || {});
  const svg43 = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, sel);
  const keyjs43 = strip(read('ui', 'screens', 'key.js'));
  const at43 = () => page.evaluate(() => ({ screen: (document.querySelector('.screen.on') || {}).id, cere: !document.getElementById('key-cere').hidden, earn: document.getElementById('s-key').dataset.earn || '', chests: JSON.parse(localStorage.getItem('ne')).prefs.chests }));

  /* ---- 1. C.2 / C.3: the Pro and Author keys have their music back - a key's theme plays on its screen once its TIER is open ---- */
  {
    const stat = /const themeOf = t => tierOpen\(t\.id\) \? t\.track : 'menu';/.test(keyjs43);
    const trackAt = async (chests, tier, bars) => { await boot({ chests }, { unlock: ALL43, bars: bars || {} }, { plain: PLAIN43 }); await show43('s-menu'); await sleep(120); await show43('s-key', { tier }); await sleep(1300);
      return page.evaluate(async () => (await import('./audio.js')).Music.probe().track); };
    const t = { quiet: await trackAt({}, 0), key1: await trackAt({ games: 1 }, 0), pro: await trackAt({ games: 1, key: 1 }, 1, bars43('clear')), author: await trackAt({ games: 1, key: 1, pro: 1 }, 2, bars43('clear', 'pro')) };
    (stat && t.quiet === 'menu' && t.key1 === 'theme:key' && t.pro === 'theme:pro' && t.author === 'theme:thorns')
      ? ok(`C.2 / C.3 the Pro and Author keys have their music back: a key's theme plays on its screen once its TIER is open - key 1 ${t.key1}, Pro ${t.pro} with the Pro chest still shut, Author ${t.author} with the Author chest still shut - and only the quiet screen before the Games chest plays the menu loop. One regression, and not the rewritten themes: build 42 waited for the chest each key OPENS`)
      : bad('C.2 / C.3 the key themes on their screens', JSON.stringify({ stat, t }));
  }

  /* ---- 2. C.1: the key screen never opens a chest by itself - the key asks; Not yet and Back leave it; Open opens it ---- */
  {
    const stat = !/OPEN_AT|OPEN_AFTER_ARRIVAL|OPEN_IN_INTERLUDE|autoOpen/.test(keyjs43) && /function askOpen\(id\)/.test(keyjs43);
    await boot({ chests: { games: 1 }, keyWhole: { clear: 1 } }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 });
    await click('.item[data-go="s-key"]'); await sleep(1700);
    const arrive = Object.assign(await at43(), { hint: await page.evaluate(() => document.getElementById('key-hint').textContent) });
    /* AMENDED for build 49 (Aiden, after build 48 - reversing build 48's v26 item 11 amendment): "tap the key to open the Skill chest" leads to the ASK again.
       Not yet and Back leave the chest shut, Open plays it. The quiet screen's key asks the same for the Games chest, and its row of chests is gone */
    const askOf = () => page.evaluate(() => ({ ask: !document.getElementById('key-ask').hidden, txt: document.getElementById('key-ask').innerText.replace(/\s+/g, ' ').trim() }));
    await svg43('#key-ring .khubhit'); await sleep(250);
    const asked = Object.assign(await at43(), await askOf());
    await click('[data-act="key-ask-no"]'); await sleep(300);
    const no = Object.assign(await at43(), await askOf());
    await svg43('#key-ring .khubhit'); await sleep(250); await click('#s-key .back'); await sleep(550);
    const backClose = Object.assign(await at43(), await askOf());
    await svg43('#key-ring .khubhit'); await sleep(250); await click('[data-act="key-ask-yes"]'); await sleep(250);
    const yes = Object.assign(await at43(), await askOf());
    await revealDone(); await sleep(500); const after = await onScreen();
    await boot({}, { unlock: ALL43 }, { plain: PLAIN43 }); await show43('s-key'); await sleep(900);
    const quiet = await page.evaluate(() => { const k = document.querySelector('#key-shell button.kquiet[data-act="key-chest"][data-chest="games"]');
      return { key: !!k, ring: k ? getComputedStyle(k).animationName : '', row: document.querySelectorAll('#key-shell .kch, #key-shell .kchests').length, cere: !document.getElementById('key-cere').hidden, stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games }; });
    await click('#key-shell button.kquiet'); await sleep(300);
    Object.assign(quiet, await askOf(), { opened0: JSON.parse(await page.evaluate(() => localStorage.getItem('ne'))).prefs.chests.games });
    await click('[data-act="key-ask-yes"]'); await sleep(300); quiet.opened = JSON.parse(await page.evaluate(() => localStorage.getItem('ne'))).prefs.chests.games;
    await revealDone(); await sleep(400);
    (stat && arrive.screen === 's-key' && !arrive.cere && !arrive.chests.key && arrive.hint === CP43.KEY.completeReady.replace('{chest}', CP43.GRID.chest.key)
      && asked.ask && !asked.cere && !asked.chests.key && asked.txt.toUpperCase().includes(CP43.KEY.ask.replace('{chest}', CP43.GRID.chest.key).toUpperCase()) && !no.ask && !no.chests.key && no.screen === 's-key' && !backClose.ask && !backClose.chests.key && backClose.screen === 's-key'
      && !yes.ask && yes.cere && yes.chests.key === 1 && after === 's-pick'
      && quiet.key && quiet.ring === 'readyring' && !quiet.row && !quiet.cere && !quiet.stored && quiet.ask && /OPEN THE GAMES CHEST\?/i.test(quiet.txt) && !quiet.opened0 && quiet.opened === 1)
      ? ok(`C.1 AMENDED for build 49 (Aiden, after build 48): the key screen never opens a ready chest by itself - arriving says "${arrive.hint}" - and tapping the key asks "${asked.txt}"; Not yet and Back leave it shut, Open plays its ceremony and ends on the map. The quiet screen's key wears the ready outline and asks "${quiet.txt}", and there is no row of chests under it`)
      : bad('C.1 tap the key, it asks', JSON.stringify({ stat, arrive, asked, no, backClose, yes, after, quiet }));
  }

  /* ---- 3. B.1 / B.2: a chest that can be opened wears a pulsing green outline; tapped on the map it opens on the frame the key screen is shown ---- */
  {
    await boot({}, { unlock: ALL43 }, { plain: PLAIN43 }); await click('[data-go="s-pick"]'); await sleep(900);
    const ring = await page.evaluate(() => { const c = id => document.querySelector(`.chest[data-chest="${id}"] .pic`); return { ready: getComputedStyle(c('games')).animationName, before: getComputedStyle(c('key')).animationName }; });
    const tap = await page.evaluate(() => { document.querySelector('.chest[data-chest="games"]').click(); const h = document.getElementById('key-cere'), on = document.querySelector('.screen.on');
      return { screen: on && on.id, cere: !h.hidden, playing: h.classList.contains('play'), stored: JSON.parse(localStorage.getItem('ne')).prefs.chests.games }; });
    await revealDone(); await sleep(500); const after = await onScreen();
    /* DELETED for build 49 (site/CLAUDE.md -> The gate): this check's stylesheet-text half, which spelled `.kch.ready` - the quiet screen's row of chests,
       now gone. The quiet screen's key wearing the same outline is driven in C.1 above */
    (ring.ready === 'readyring' && ring.before === 'none' && tap.screen === 's-key' && tap.cere && tap.playing && tap.stored === 1 && after === 's-pick')
      ? ok('B.1 / B.2 a chest that can be opened wears a pulsing green outline (readyring in --ok) on the map, and a chest that cannot does not; tapped on the map the ready chest opens in the same task that shows the key screen - its ceremony already covers it, so the key screen never flashes - and "tap to continue" returns to the map')
      : bad('B.1 / B.2 the ready outline and the no-flash open', JSON.stringify({ ring, tap, after }));
  }

  /* ---- 4. B.3: a key animation not yet seen plays IN FULL, input held, and only then does the chest open - never started and cut off ---- */
  {
    await boot({ chests: { games: 1 }, keyWhole: {} }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 });
    await click('[data-go="s-pick"]'); await sleep(700);
    await click('.chest[data-chest="key"]'); await sleep(700);
    /* AMENDED at build 46 (v25 item 11): the unseen key animation is the first-open REVEAL now. It still plays IN FULL and Back still does nothing
       while it does — but it ends on a TAP, so the chest that was waiting cannot be opened on a timer. `pendingOpen` hands it to the reveal, which
       opens it at its Continue. What B.3 asked for is unchanged: never started and cut off. */
    const kindOf = () => page.evaluate(() => { const h = document.getElementById('key-cere'); return { kind: h.hidden ? '' : (h.dataset.kind || '') }; });
    const mid = Object.assign(await at43(), await kindOf());
    await page.evaluate(() => { const h = document.getElementById('key-cere'), o = window.__b3 = []; new MutationObserver(() => { const k = h.hidden ? 'off' : h.dataset.kind || 'off'; if (o[o.length - 1] !== k) o.push(k); }).observe(h, { attributes: true, attributeFilter: ['hidden', 'data-kind'] }); });
    /* AMENDED at build 51 (v27 item 14): the wait was 1300ms, which is longer than the whole animation now (1.7s from a start about 700ms back),
       so "Back did nothing while it played" was being read after it had already finished. It is taken well inside the animation instead. */
    await click('#s-key .back'); await sleep(300);
    const held = Object.assign(await at43(), await kindOf());
    /* AMENDED at build 48 (v26 items 10 / 11): the key's reveal ends BY ITSELF once its earn moment has played to the end - no tap, no card - and the
       chest the player tapped on the map opens straight after it */
    let seq = []; for (let i = 0; i < 100; i++) { await sleep(200); seq = await page.evaluate(() => window.__b3.slice()); if (seq.includes('chest')) break; }
    const ready = { kind: seq.join('>'), chests: held.chests };
    const opened = Object.assign(await at43(), await kindOf());
    await revealDone(); await sleep(500);
    (mid.screen === 's-key' && mid.kind === 'key' && !mid.chests.key && held.screen === 's-key' && held.kind === 'key' && !held.chests.key
      && ready.kind === 'off>chest' && opened.kind === 'chest' && opened.chests.key === 1)
      ? ok(`B.3 the Skill chest tapped on the map with key 1's first-open reveal unseen: the reveal plays in full on the key screen - Back does nothing while it does - and the chest opens only once it has ended by itself, never started and interrupted (AMENDED at build 48, v26 items 10 / 11: the reveal waits for its earn moment's own end, ${KY43.KEY_EARN.clear.ms}ms of it, and needs no tap)`)
      : bad('B.3 a key animation is never cut off', JSON.stringify({ mid, held, ready, opened }));
  }

  /* ---- 5. C.5 AMENDED AT BUILD 51 (v27 item 14): earning a key is its own ANIMATION per tier, two seconds at most, at least three quarters of
     it movement, drawn centred on the hub, with its own sound from that key's theme on the closing flash. Build 43's moment (a bloom, squares,
     a spiked burst) and build 46's reveal around it nested to 6.3s / 8.0s / 10.5s; the numbers are the whole of what changed here. ---- */
  {
    const E = KY43.KEY_EARN, F = AU43.KEY_EARN_FX, T3 = ['clear', 'pro', 'author'], GLOW = KY43.EARN_GLOW;
    // item 14's two rules, off the data: two seconds at most, and movement is at least three quarters of it (the flash is the only step that is not)
    const span = t => { const st = E[t].steps, move = st.filter(x => x.name !== GLOW);
      return { ms: E[t].ms, from: Math.min(...st.map(x => x.at)), to: Math.max(...move.map(x => x.at + x.ms)), end: Math.max(...st.map(x => x.at + x.ms)) }; };
    const sp = Object.fromEntries(T3.map(t => [t, span(t)]));
    /* AND REVERSED AT BUILD 57 (v29 Section A, 57.7): THE MOTION IS THE CLOCK. Build 51 capped the whole thing at 2.0s and build 52 at 2.5s;
       build 53's item 15 threw the cap away and made the MUSIC the clock, because Snd.keyEarn was fired on the closing FLASH and rang on for
       seconds after the animation. Aiden played that and found the fault at the other end — a second of settling on Skill and Pro and two on
       Author with nothing moving. 57.7 settles it: `ms` is the MOTION's own length and must be SHORTER than the music by at least 300ms, the
       music is not trimmed to fit, and its tail rings across the cut into the chest. Everything else here is untouched — movement is still
       three quarters at least, still measured against the flash; the assembly is still a quarter of the whole; the last step is still `land`. */
    const musicMs43 = t => Math.round(Math.max(0, ...F[t].notes.map(x => x[0] * 1000 + x[2])));
    const asm43 = t => { const r = E[t].steps.find(x => x.name === 'rise'); return r ? r.at : E[t].ms; };
    const cfg = T3.every(t => E[t].ms <= musicMs43(t) - 300 && sp[t].end <= sp[t].ms && (sp[t].to - sp[t].from) / sp[t].ms >= .75
        && asm43(t) >= E[t].ms * .25 && E[t].steps.some(x => x.name === GLOW)
        && E[t].steps[E[t].steps.length - 1].name === 'land' && E[t].steps.every((x, i, all) => !i || x.at >= all[i - 1].at))
      && T3.every((t, i) => !i || E[t].ms >= E[T3[i - 1]].ms)
      // build 52: BOTH keys with spokes now fire them one at a time, and the Pro key runs a current between each pair (`spokes.trace`)
      && E.clear.spokes.gap > 0 && !E.clear.spokes.trace && E.pro.spokes.gap > 0 && E.pro.spokes.trace > 0
      && !E.author.spokes && E.author.cracks && E.author.thorns && E.author.shake
      // build 52: the beat between one crack and the next, and one thorn and the next, is config's — the stylesheet held it until now
      && E.author.crackGap > 0 && E.author.thornGap > 0
      && F.clear.track === 'theme:key' && F.pro.track === 'theme:pro' && F.author.track === 'theme:thorns';
    await boot({ allOpen: true, keyWhole: {} }, { unlock: ALL43, bars: bars43('clear', 'pro', 'author') }, { plain: PLAIN43 });
    const got = await page.evaluate(async cfgE => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const calls = [], steps = [], o = A.Snd.keyEarn, u = A.Snd.unlockFx, c = A.Snd.chest, k = A.Snd.keyStep;
      A.Snd.keyEarn = function (t) { calls.push(t); return o.apply(this, arguments); }; A.Snd.unlockFx = function () { calls.push('unlockFx'); return u.apply(this, arguments); };
      A.Snd.chest = function () { calls.push('chest'); return c.apply(this, arguments); }; A.Snd.keyStep = function (nm) { steps.push(nm); return k.apply(this, arguments); };
      const out = {};
      for (const [i, t] of [[0, 'clear'], [1, 'pro'], [2, 'author']]) { R.show('s-menu'); await wait(80); R.show('s-key', { tier: i }); await wait(Math.round(cfgE[t].ms * .55) + 320);
        const el = document.getElementById('s-key'), g = document.querySelector('#key-ring .kglyph'), hub = document.querySelector('#key-ring .khub').getBoundingClientRect(), gr = g.getBoundingClientRect();
        out[t] = { earn: el.dataset.earn, on: el.classList.contains('kearning'), ms: el.style.getPropertyValue('--earn-ms'),
          flash: document.querySelectorAll('#key-ring .keflash').length, crk: document.querySelectorAll('#key-ring .kecrk').length, thn: document.querySelectorAll('#key-ring .kethn').length,
          cur: document.querySelectorAll('#key-ring .kecur').length, curAnim: (document.querySelector('#key-ring .kecur') || { getAnimations: () => [] }).getAnimations().map(a => a.animationName).filter(Boolean).join(),
          gaps: [el.style.getPropertyValue('--crack-gap'), el.style.getPropertyValue('--thorn-gap'), el.style.getPropertyValue('--trace-ms')].join('/'),
          vars: (cfgE[t].steps || []).every(x => el.style.getPropertyValue('--st-' + x.name + '-at') === x.at + 'ms' && el.style.getPropertyValue('--st-' + x.name + '-ms') === x.ms + 'ms'),
          glyph: g.getAnimations().map(a => a.animationName).filter(Boolean).join(), attr: g.hasAttribute('transform'),
          off: Math.round(Math.hypot((gr.left + gr.width / 2) - (hub.left + hub.width / 2), (gr.top + gr.height / 2) - (hub.top + hub.height / 2))) };
        // and it comes off by itself, well inside the ceiling item 14 sets
        await wait(cfgE[t].ms + 1400); out[t].after = document.getElementById('s-key').classList.contains('kearning');
        await wait(300); }
      const plans = Object.fromEntries(['clear', 'pro', 'author'].map(t => [t, A.Snd.keyEarnPlan(t)]));
      A.Snd.keyEarn = o; A.Snd.unlockFx = u; A.Snd.chest = c; A.Snd.keyStep = k; return { out, calls, steps, plans };
    }, Object.fromEntries(T3.map(t => [t, { ms: E[t].ms, steps: E[t].steps }])));
    const P = got.plans, len = t => Math.max(...P[t].map(e => e[0] + e[3] / 1000)), O = got.out;
    const rules = T3.every(t => P[t].length && P[t].every(e => !((e[1] >= 300 && e[3] < 700) || (e[1] > 523.3 && e[3] < 1200))));
    const rising = T3.every((t, i) => !i || (len(t) > len(T3[i - 1]) && P[t].length > P[T3[i - 1]].length));
    const notUnlock = T3.every(t => ![523.3, 784, 1046.5].every((f, i) => P[t].some(e => Math.abs(e[1] - f) < .5 && Math.abs(e[0] - i * .1) < .01)));
    // every step but the flash and a lone spoke plays its own KEY_STEP_FX; the Skill key's seven spokes play their games' sounds instead
    /* build 52: a `trace` step sounds once per LINK between two spokes — six times on a seven-spoke ring — because the current runs six times,
       and a spokes step whose spokes fire one at a time still sounds its seven games and not a step sound */
    const NG52 = GAMES.length;
    const wantSteps = T3.flatMap(t => E[t].steps.filter(x => x.name !== GLOW && !(x.name === 'spokes' && E[t].spokes && E[t].spokes.gap > 0))
      .flatMap(x => x.name === 'trace' ? Array(NG52 - 1).fill('trace') : [x.name]));
    const draw = O.clear.earn === 'clear' && O.clear.glyph === 'kespin' && O.pro.earn === 'pro' && O.pro.glyph === 'kesnap'
      && O.author.earn === 'author' && O.author.glyph === 'kedrop' && O.author.crk === E.author.cracks && O.author.thn === E.author.thorns
      // build 52: six currents on the Pro key, one between each pair of spokes, and none on the other two
      && O.pro.cur === NG52 - 1 && O.pro.curAnim === 'kecurrent' && !O.clear.cur && !O.author.cur
      && O.author.gaps === `${E.author.crackGap}ms/${E.author.thornGap}ms/0ms` && O.pro.gaps === `0ms/0ms/${E.pro.spokes.trace}ms`
      && T3.every(t => O[t].on && !O[t].after && !O[t].attr && O[t].off <= 8 && O[t].flash === 1 && O[t].vars && O[t].ms === E[t].ms + 'ms');
    (cfg && draw && got.calls.join() === 'clear,pro,author' && got.steps.join() === wantSteps.join() && rules && rising && notUnlock)
      ? ok(`C.5 / v27 item 14 earning a key is its own ANIMATION per tier: ${T3.map(t => E[t].ms + 'ms').join(' ≤ ')}, never over 2500, and ${T3.map(t => Math.round((sp[t].to - sp[t].from) / sp[t].ms * 100) + '%').join(' / ')} of each is movement (the flash is the rest) — the Skill key's seven spokes fire one at a time and it spins upright (kespin), the Pro key's fire ONE BY ONE ROUND THE RING with a current running the ${NG52 - 1} links between them (Aiden's answer to build 51) before it snaps a quarter turn (kesnap), the Author key drops and slams with ${E.author.cracks} cracks ${E.author.crackGap}ms apart and ${E.author.thorns} thorns ${E.author.thornGap}ms apart, one by one (kedrop) — each centred on the hub (no transform attribute on the animated group; off by ${T3.map(t => O[t].off).join(' / ')}px), each step landing its own sound (${got.steps.join(', ')}) and each key its own earn sound from its theme on the closing flash (${T3.map(t => P[t].length + ' notes over ' + len(t).toFixed(1) + 's').join(', ')}), none of it the unlock sound or a chest's, and each once`)
      : bad('C.5 / v27 item 14 the earned animations', JSON.stringify({ cfg, sp, draw, O, calls: got.calls, steps: got.steps, wantSteps, rules, rising, notUnlock }));
  }

  /* ---- 6. C.6 / C.4: three key backgrounds drawn in code over the live background, each a Customise background once its key is finished ---- */
  {
    const atm = strip(read('ui', 'atmosphere.js'));
    const code = /const LAYER=\{/.test(atm) && ['lantern(t)', 'circuit(t)', 'thorn(t)'].every(s => atm.includes(s)) && /TRACKS\[k\.track\]/.test(atm) && !/\.png|\.jpe?g|\.webp|new Image|url\(/i.test(atm)
      && /setKeyLayer\(quiet \|\| t\.shell \? null : t\.style\)/.test(keyjs43);
    const items = TH43.ITEMS.bg.filter(i => i.key).map(i => i.v + ':' + i.key).join() === 'lantern:clear,circuit:pro,thorn:author' && ['lantern', 'circuit', 'thorn'].every(v => TH43.DESIGNS[v]);
    const ground = !/rgba\(0,\s*0,\s*0/.test(KY43.KEYS[2].ground) && !/\[data-style="thorn"\] #key-main\{background/.test(read('styles', 'app.css'));
    await boot({ allOpen: true }, {}, { plain: PLAIN43 });
    const live = await page.evaluate(async () => { const R = await import('./ui/router.js'); const AT = await import('./ui/atmosphere.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const cv = document.getElementById('stars'), cx = cv.getContext('2d'), out = { layers: Object.keys(AT.LAYER).join() };
      // what is drawn, sampled off the canvas rather than trusted: pixels with anything in them, every ninth
      const lit = () => { const d = cx.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 36) if (d[i] > 0) n++; return n; };
      R.show('s-menu'); await wait(400); out.stars = lit();
      for (const [i, s] of [[0, 'lantern'], [1, 'circuit'], [2, 'thorn']]) { R.show('s-key', { tier: i }); await wait(500); out[s] = lit(); if (s === 'thorn') out.main = getComputedStyle(document.getElementById('key-main')).backgroundColor; }
      R.show('s-menu'); await wait(400); out.back = lit(); return out; });
    await boot({ chests: { games: 1 } }, {}, { plain: PLAIN43 }); await show43('s-custom'); await sleep(500);
    const lockd = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const b = v => document.querySelector(`#c-bg [data-v="${v}"]`);
      const out = { locked: ['lantern', 'circuit', 'thorn'].map(v => !!b(v) && b(v).classList.contains('locked')).join() }; b('circuit').click(); await wait(250); out.line = document.getElementById('lk-bg').textContent; out.bg = S.prefs.bg; return out; });
    await boot({ chests: { games: 1, key: 1 } }, { unlock: ALL43, bars: bars43('clear') }, { plain: PLAIN43 }); await show43('s-custom'); await sleep(500);
    const fin = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const b = v => document.querySelector(`#c-bg [data-v="${v}"]`);
      const out = { lantern: b('lantern').classList.contains('locked'), green: b('lantern').classList.contains('newthing'), circuit: b('circuit').classList.contains('locked') }; b('lantern').click(); await wait(250); out.bg = S.prefs.bg; out.look = S.look('bg'); return out; });
    (code && items && ground && live.layers === 'lantern,circuit,thorn' && ['lantern', 'circuit', 'thorn'].every(s => live[s] > live.stars * 2) && live.back < live.lantern && live.main === 'rgba(0, 0, 0, 0)'
      && lockd.locked === 'true,true,true' && /Pro · whole/.test(lockd.line) && lockd.bg === 'stars' && !fin.lantern && fin.green && fin.circuit && fin.bg === 'lantern' && fin.look === 'lantern')
      ? ok(`C.6 / C.4 three key backgrounds drawn in code - no image assets - each over the live background on its key screen and in its key's own tempo (the canvas holds ${live.lantern} / ${live.circuit} / ${live.thorn} sampled pixels against the stars' ${live.stars}); Thorn's solid black is gone (#key-main ${live.main}); in Customise each is locked until its key is FINISHED, its line naming that key ("${lockd.line.trim()}"), and key 1 finished opens Lantern, green once, and it applies`)
      : bad('C.6 / C.4 the key backgrounds', JSON.stringify({ code, items, ground, live, lockd, fin }));
  }

  /* ---- 7. C.7: every chest's sting is cut from its own key's theme, escalating Games -> Key -> Pro -> Thorns ---- */
  {
    const S7 = AU43.CHEST_STING, IDS = ['games', 'key', 'pro', 'thorns'];
    const shape = IDS.every(id => S7[id].track && typeof S7[id].cut === 'number' && Array.isArray(S7[id].tail) && !S7[id].notes) && IDS.map(id => S7[id].track).join() === 'theme:key,theme:key,theme:pro,theme:thorns' && /function stingOf\(s,tr\)/.test(strip(read('audio.js')));
    const st = await page.evaluate(async ids => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      /* AMENDED AT BUILD 57 (v29 Section A, 57.8): a chest a key opens is two beats, and the sting belongs to the SECOND — audio.js offsets it by
         COVER_AT so it still resolves on the lid. This check is about the sting itself (its notes, its shape, its length), so it is measured from
         its own first note, which is the same set of numbers it has always had. */
      return ids.map(id => { const s = A.CHEST_STING[id], raw = M.Snd.chestPlan(id).filter(e => e[8] === 'sting');
        const off = raw.length ? Math.min(...raw.map(e => e[0])) : 0;
        const p = raw.map(e => [+(e[0] - off).toFixed(3)].concat(e.slice(1))), body = p.filter(e => e[0] < s.cut), theme = M.Music.plan(s.track).plan;
        const fromTheme = body.every(e => theme.some(x => Math.abs(x[0] - e[0]) < 2e-3 && Math.abs(x[1] - e[1]) < .05 && x[4] === e[4]));
        const end = Math.max(...p.map(e => e[0] + e[3] / 1000));
        return { id, n: p.length, body: body.length, fromTheme, end: +end.toFixed(2), rate: +(p.length / end).toFixed(2), voices: s.voices ? s.voices.length : A.TRACKS[s.track].voices.length,
          bad: p.filter(e => (e[1] >= 300 && (e[3] < 700 || e[6] < 40)) || (e[1] > 523.3 && e[3] < 1200)).length }; }); }, IDS);
    const rising = st.every((x, i) => !i || (x.end > st[i - 1].end && x.rate > st[i - 1].rate && x.voices >= st[i - 1].voices));
    (shape && st.every(x => x.body > 0 && x.fromTheme && !x.bad && x.end >= 3 && x.end <= 6.05) && rising)
      ? ok(`C.7 every chest's sting is its own key's theme - its first bars played through the key screen's own arrangement engine, every note of the body a note of that theme, then the tonic landed - escalating Games -> Key -> Pro -> Thorns in length (${st.map(x => x.end + 's').join(' < ')}), notes a second (${st.map(x => x.rate).join(' < ')}) and voices (${st.map(x => x.voices).join(' / ')}), all to the theme rule; built on C.2 / C.3's fix`)
      : bad('C.7 the stings from the themes', JSON.stringify({ shape, st, rising }));
  }

  /* ---- 8. A.1: Keys is locked until the Games chest - crossed out with "open the Games chest", the meter line and Progress's key row refused too; green until first seen ---- */
  {
    await boot({}, { runs: [{ t: Date.now(), g: 'quick-tap', d: 'two', s: 5, n: '', v: 4, hits: 10, misses: 0 }] }, { plain: PLAIN43 });
    await show43('s-menu'); await sleep(350);
    const lk = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id;
      const k = document.querySelector('.item[data-go="s-key"]'), out = { cls: k.className, need: document.getElementById('keys-need').hidden ? '' : document.getElementById('keys-need').textContent, x: getComputedStyle(k, '::after').content };
      k.click(); await wait(250); out.tap = on(); out.toast = document.getElementById('toast').textContent.trim();
      document.getElementById('menu-key').click(); await wait(250); out.meter = on();
      R.show('s-prog', { tab: 'unl' }); await wait(450); const row = document.querySelector('[data-act="unl"][data-key]'); out.row = !!row; if (row) row.click(); await wait(250); out.prog = on();
      return out; });
    await boot({ chests: { games: 1 }, keySeen: 0 }, { unlock: ALL43 }, { plain: PLAIN43 }); await show43('s-menu'); await sleep(350);
    const op = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); const on = () => (document.querySelector('.screen.on') || {}).id; const k = () => document.querySelector('.item[data-go="s-key"]');
      const out = { cls: k().className, need: document.getElementById('keys-need').hidden }; k().click(); await wait(600); out.tap = on();
      R.show('s-menu'); await wait(300); out.after = k().className; out.seen = JSON.parse(localStorage.getItem('ne')).prefs.keysSeen; return out; });
    const st = strip(read('core', 'store.js'));
    const store = /keysSeen:p\.keysSeen!==undefined\?\(p\.keysSeen\?1:0\):\(p\.keySeen\?1:0\)/.test(st) && /keySeen:0,keysSeen:0/.test(st) && /prefs\.keysSeen = 0/.test(strip(read('progress', 'key.js')));
    (/keylock/.test(lk.cls) && lk.need === 'open the Games chest' && lk.x !== 'none' && lk.tap === 's-menu' && /Games chest/.test(lk.toast) && lk.meter === 's-menu' && lk.row && lk.prog === 's-prog'
      && !/keylock/.test(op.cls) && /newthing/.test(op.cls) && op.need && op.tap === 's-key' && !/newthing/.test(op.after) && op.seen === 1 && store)
      ? ok('A.1 before the Games chest the Keys row is on the menu, crossed out with "open the Games chest" under it - the Customise treatment - and a tap says so and stays put, as do the meter line and Progress\'s key row; once the chest is open the strike is gone, the row is green until the key screen is first seen, and that spends it (prefs.keysSeen; an older profile takes keySeen, Fresh game and the Games chest reset clear it)')
      : bad('A.1 Keys locked until the first chest', JSON.stringify({ lk, op, store }));
  }

  /* ---- 9. A.2 / B.5: a brand new game opens the map at the top, and the chests arrive with the loading sequence ---- */
  {
    await boot({}, {}, { plain: PLAIN43 }); await click('[data-go="s-pick"]'); await sleep(600);
    await page.evaluate(() => { document.getElementById('s-pick').scrollTop = 9999; }); const was = await page.evaluate(() => document.getElementById('s-pick').scrollTop);
    const fr = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const R = await import('./ui/router.js');
      S.reset(); R.show('s-menu'); await wait(200); R.show('s-pick'); await wait(150);
      return { top: document.getElementById('s-pick').scrollTop, chests: [...document.querySelectorAll('#grid .chest')].map(c => (c.classList.contains('reveal') ? 'reveal' : '-') + '@' + c.style.animationDelay), tile6: document.querySelectorAll('#grid .tile[data-game]')[6].style.animationDelay }; });
    const again = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const R = await import('./ui/router.js'); R.show('s-menu'); await wait(150); R.show('s-pick'); await wait(150); return document.querySelectorAll('#grid .chest.reveal').length; });
    /* AMENDED at build 49 (v26 items 2 / 13): the first open is drawn out (config/chests.js MAP_INTRO) - the seventh game, then the Gauntlets, then the
       four chests on their own beat - so the delays are read off that config rather than the 120ms beat.
       AMENDED at build 51 (v27 item 2): a new game has opened no chest, so NEITHER GAUNTLET IS THERE and neither takes a beat - the chests follow
       the seventh game by `chestAt` alone. Seven games, not nine tiles. */
    const I43 = (await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href)).MAP_INTRO;
    const want43 = [0, 1, 2, 3].map(i => 'reveal@' + (I43.at + 7 * I43.gap + I43.chestAt + i * I43.chestGap) + 'ms').join();
    (was > 100 && fr.top === 0 && fr.chests.join() === want43 && fr.tile6 === (I43.at + 6 * I43.gap) + 'ms' && again === 0)
      ? ok(`A.2 / B.5 a brand new game opens the map at the top (it was left at ${was}px: a scroller keeps its place while its screen is hidden, which put Fresh game down at the chests) and the four chests pop in last, straight after the seventh game (${fr.chests.join(', ')}) with no beat held for a Gauntlet that is not there; the next visit reveals nothing, as the tiles do not`)
      : bad('A.2 / B.5 the map on a new game', JSON.stringify({ was, fr, again }));
  }

  /* ---- 10. A.3: Testing is live from the first load; a build-time flag strips it from the native build ---- */
  {
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
    const first = await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 400));
      const t = document.querySelector('#s-menu [data-go="s-testing"]'), p = document.querySelector('#s-menu [data-go="s-board"]');
      return { dim: t.classList.contains('dim'), pe: getComputedStyle(t).pointerEvents, other: p.classList.contains('dim') }; });
    const cfg = read('config', 'build.js');
    const flag = /export const TARGET = 'web';/.test(cfg) && /export const BUILD_FLAGS = \{ dev: TARGET !== 'native' \};/.test(cfg) && /"native": "node scripts\/native\.mjs"/.test(read('package.json'));
    const os = await import('node:os'); const { execFileSync } = await import('node:child_process');
    const outDir = path.join(os.tmpdir(), 'ne-native-gate-43'); let nat = null, ran = '';
    try { ran = execFileSync(process.execPath, [path.join(root, 'scripts', 'native.mjs'), outDir], { encoding: 'utf8' }); } catch (e) { ran = 'FAILED ' + (e.stderr || e.message); }
    if (!/^FAILED/.test(ran)) {
      const nh = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), nb = fs.readFileSync(path.join(outDir, 'config', 'build.js'), 'utf8');
      /* v29 (item 10, build 55): scripts/native.mjs left `video` out of TREE while all eight config/messages.js rows point at
         video/test-card.mp4 + .vtt, so every message in a native build was a 404 — which, until this build, showed as a silent
         black rectangle and nothing else. The copy is also atomic now: it is built and checked in a temp tree and only moved
         into place once every check has passed, so a failure no longer leaves a half-written dist/native that looks like a build. */
      const vid43 = ['test-card.mp4', 'test-card.vtt'].filter(f => !fs.existsSync(path.join(outDir, 'video', f)));
      !vid43.length ? ok('v29 item 10 the native tree carries video/ — every message slot\'s clip is in the bundle') : bad('item 10 video/ missing from the native tree', vid43.join(', '));
      nat = { html: !/\sdata-dev[\s>=]/.test(nh) && !/id="s-testing"/.test(nh) && !/data-act="dev-/.test(nh), target: /export const TARGET = 'native';/.test(nb), web: /id="s-testing"/.test(read('index.html')) && /export const TARGET = 'web';/.test(read('config', 'build.js')) };
      const nsrv = await serve(outDir);
      await page.goto(nsrv.base + '/index.html', { waitUntil: 'networkidle0' });
      await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ne', JSON.stringify({ v: 6, prefs: { story: 1, played: 1, menuSeen: 1, allOpen: true, supporter: true }, runs: [], ach: {}, unlock: {}, intro: {}, seen: {}, bars: {} })); });
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
      nat.live = await page.evaluate(async () => { const S = await import('./core/store.js'); const B = await import('./config/build.js');
        return { dev: B.BUILD_FLAGS.dev, testing: !!document.querySelector('[data-go="s-testing"]'), screen: !!document.getElementById('s-testing'), allOpen: S.prefs.allOpen, supporter: S.prefs.supporter, games: S.opened('games') }; });
      await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); nsrv.close();
      fs.rmSync(outDir, { recursive: true, force: true }); }
    (!first.dim && first.pe !== 'none' && first.other && flag && nat && nat.html && nat.target && nat.web && nat.live && nat.live.dev === false && !nat.live.testing && !nat.live.screen && !nat.live.allOpen && !nat.live.supporter && !nat.live.games)
      ? ok('A.3 Testing is live on the menu from the first load - not dimmed while every other row but Play is - and the build-time flag strips it: `npm run native` writes a tree with TARGET native (BUILD_FLAGS.dev false) and no [data-dev] element in its markup, which loads with no Testing row or screen and refuses a planted OPEN EVERYTHING and Supporter; the web tree keeps both (S5)')
      : bad('A.3 Testing from the first load, and the native strip', JSON.stringify({ first, flag, ran: ran.slice(0, 160), nat }));
  }

  /* ---- 11. the review board: the new cards, and each key's earn sound on its card ---- */
  rv5: {
    if (!REVIEW) { noReview("the review board's new cards"); break rv5; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).map(a => a.shot) : [];
    const want43 = ['13h-s-key-ask', '13i-s-key-earn-clear', '13j-s-key-earn-pro', '13k-s-key-earn-author', '13l-s-custom-keybg', '13m-menu-keys-locked'];
    (want43.every(s => shots.includes(s) && gen.includes(`'${s}'`)) && /keyEarnPlan\(/.test(gen) && /REF\.earnFx/.test(tpl))
      ? ok(`build 43 the catalogue carries ${want43.length} new cards - the ask, the three earn moments (each with its sound on a button, off Snd.keyEarnPlan), Customise's key backgrounds and the Keys row locked`)
      : bad('build 43 the catalogue cards', JSON.stringify({ missing: want43.filter(s => !shots.includes(s) || !gen.includes(`'${s}'`)), plan: /keyEarnPlan\(/.test(gen), tpl: /REF\.earnFx/.test(tpl) }));
  }
}
