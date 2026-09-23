/* ---- 22. build 42 (batch 16, the key themes - FEEDBACK-v23 §L.7 a-e). Music and one preference; nothing clears, opens or banks anything (L10) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, sleep, names, check, ok, bad, root, read, REVIEW, rvRead, noReview, strip, boot, NOW, at, page, until, click, up, readySeen } from '../lib/gate.mjs';

export const SECTION = ["build 42 - batch 16, the key themes"];

export async function run() {
  const AU42 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CP42 = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);   // build 51 (v27 item 4)
  const KY42 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
  const CH42 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);
  const THEMES = ['key', 'pro', 'thorns'], IDS42 = THEMES.map(k => (AU42.KEY_THEMES || {})[k]);
  const PLAIN42 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, snd: 'off', musicG: {}, spill: { games: 1, key: 1, pro: 1, thorns: 1 }, readySeen: { games: 1, key: 1, pro: 1, thorns: 1 } };
  const LV42 = c => c === 'x' ? 1 : (c >= '1' && c <= '9') ? +c / 10 : 0;

  /* ---- 1. L.7a: three rewritten themes in their motif from the first step, escalating, to batch 12's rules; the build-30 three kept one build, retired ---- */
  {
    const T = AU42.KEY_THEMES || {}, R = AU42.KEY_THEMES_RETIRED || {};
    const shape = Object.keys(T).join() === THEMES.join() && IDS42.every(id => AU42.TRACKS[id] && !AU42.TRACKS[id].retired)
      && KY42.KEYS.map(k => k.track).join() === IDS42.join() && KY42.KEYS.map(k => k.music).join() === THEMES.join()
      && KY42.KEYS.every(k => (CH42.CHESTS.find(c => c.id === k.music) || {}).needs === k.id)
      && Object.values(R).join() === 'key:roots,key:frost,key:thorn' && Object.values(R).every(id => AU42.TRACKS[id] && AU42.TRACKS[id].retired === 42)
      && THEMES.every(k => AU42.TRACKS[T[k]].root === AU42.TRACKS[R[k]].root);
    // no intro, no fade-up, no build, read off the data: every level and filter string opens at 70% or more and never rests or drops under
    // 60%, so no voice drops out at a loop point; a lead hits on the first step; the form is whole chord cycles, so the loop lands on chord 1
    const opens = [];
    for (const id of IDS42) { const t = AU42.TRACKS[id]; if (!t) continue;
      if (t.form % (t.ch.length * (t.per || 1))) opens.push(`${id} form ${t.form} is not whole chord cycles`);
      if (!t.voices.some(v => v.v === 'lead' && /[xo]/.test((v.pat || 'x')[0]) && v.seq[0] !== null)) opens.push(`${id} no motif on the first step`);
      t.voices.forEach((v, i) => { for (const s of [v.lv, v.lpv].filter(Boolean)) { if (LV42(s[0]) < .7) opens.push(`${id} voice ${i} opens at ${s[0]}`); if ([...s].some(c => LV42(c) < .6)) opens.push(`${id} voice ${i} drops: ${s}`); }
        if (!/[xo]/.test(v.pat || 'x')) opens.push(`${id} voice ${i} never sounds`); }); }
    await boot({}, {}, { plain: PLAIN42 });
    const pl = await page.evaluate(async ids => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      return ids.map(id => { const t = A.TRACKS[id], full = M.Music.plan(id), one = M.Music.plan(id, { bars: 1 }), beat = 60000 / t.bpm, barSec = 60 / t.bpm * (t.beats || 4);
        return { id, bad: full.plan.filter(e => (e[3] < 700 && e[1] >= 300) || (e[1] > 523.3 && e[3] < 1200)).slice(0, 3).map(e => `${Math.round(e[1])}Hz ${e[3]}ms`),
          first: one.plan.length ? Math.min(...one.plan.map(e => e[0])) : -1, slow: one.plan.filter(e => e[6] > beat).length,
          bars: new Set(full.plan.map(e => Math.floor(e[0] / barSec + 1e-6))).size, form: full.form, rate: +(full.plan.length / full.loopSec).toFixed(2),
          longSec: M.Music.lengths().find(r => r.id === id).longSec, leads: t.voices.filter(v => v.v === 'lead').length, root: t.root, sawBass: t.voices.some(v => v.v === 'bass' && v.w === 'sawtooth') }; }); }, IDS42);
    const [k, p, th] = pl;
    const rules = pl.every(x => !x.bad.length && x.first === 0 && !x.slow && x.bars === x.form && x.longSec >= 180);
    const escalate = k.rate < p.rate && p.rate < th.rate && k.leads === 1 && p.leads === 2 && th.leads >= 2 && th.root < k.root && th.sawBass;
    (shape && !opens.length && rules && escalate)
      ? ok(`L.7a three rewritten key themes (${IDS42.join(', ')}): each in its motif on the first step with every voice sounding in bar 1 at full gain inside a beat - no intro, no fade-up, no build - and no voice resting or dropping under 60% anywhere, so nothing drops out at a loop point; every bar sounds, the form is whole chord cycles, the long form ${pl.map(x => Math.round(x.longSec) + 's').join(' / ')}; nothing under 700ms above 300 Hz and nothing above C5 under 1200ms (batch 12); escalating ${pl.map(x => x.rate).join(' < ')} notes a second, Pro and Thorns with a second voice, Thorns the lowest root on a sawtooth bass; the build-30 three kept under their old ids, retired, same roots`)
      : bad('L.7a the rewritten themes', JSON.stringify({ shape, opens: opens.slice(0, 5), pl }));
  }

  /* ---- 2. L.7c: ONE store key, one ladder step - it round-trips, nonsense is dropped, and a theme whose chest is shut is kept and never applied ---- */
  {
    const src = strip(read('core', 'store.js'));
    const stat = /VERSION=7/.test(src) /* AMENDED at build 57 (57.6): up7 follows up6 */ && /if\(\(raw\.v\|\|0\)<6\) raw=up6\(raw\);/.test(src) && /p\.everywhere===undefined\) p\.everywhere='game'/.test(src) && /everywhere:Object\.keys\(KEY_THEMES\)\.includes\(p\.everywhere\)/.test(src);
    /* AMENDED AT BUILD 53 (v28 item 2): a key track waits for its KEY to be EARNED, not for the chest that key opens - Aiden's line is "each key
       track locked until that key is earned", which is strictly earlier. So the fixtures carry bars, not just chests, and `everywhere()` reads
       through progress/key.js keyFinished (bound into the store, because core/ sits below progress/ in the graph). */
    const KB42 = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42 = (...ts) => Object.fromEntries(Object.keys(KB42.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { bars: tier42('clear', 'pro') }, { v: 5, plain: PLAIN42 });
    const a = await page.evaluate(async () => { const S = await import('./core/store.js'); const out = { v: S.store.v, first: S.prefs.everywhere, eff: S.everywhere() }; S.prefs.everywhere = 'pro'; S.save(); return out; });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const b = await page.evaluate(async () => { const S = await import('./core/store.js'); const raw = JSON.parse(localStorage.getItem('ne')); return { v: raw.v, stored: raw.prefs.everywhere, eff: S.everywhere() }; });
    await boot({ chests: { games: 1, key: 1 }, everywhere: 'key' }, { bars: tier42('clear') }, { v: 5, plain: PLAIN42 });
    const kept = await page.evaluate(async () => (await import('./core/store.js')).prefs.everywhere);
    // the Author key is not earned here, so its theme is KEPT and never applied - the same shape as build 42's shut chest
    await boot({ chests: { games: 1, key: 1 }, everywhere: 'thorns' }, { bars: tier42('clear') }, { plain: PLAIN42 });
    const shut = await page.evaluate(async () => { const S = await import('./core/store.js'); const M = await import('./audio.js'); const st = await import('./core/state.js');
      st.sel.vs = 0; M.Music.start('dots', { on: true, live: false }, 20); const id = M.Music.probe().track; M.Music.stop(); return { stored: S.prefs.everywhere, eff: S.everywhere(), id }; });
    await boot({ chests: { games: 1 }, everywhere: 'constructor' }, {}, { plain: PLAIN42 });
    const junk = await page.evaluate(async () => (await import('./core/store.js')).prefs.everywhere);
    // AMENDED at build 57 (v29 Section A, 57.6): the ladder ends at v7
    (stat && a.v === 7 && a.first === 'game' && a.eff === 'game' && b.v === 7 && b.stored === 'pro' && b.eff === 'pro' && kept === 'key' && shut.stored === 'thorns' && shut.eff === 'game' && shut.id === 'dots:waltz' && junk === 'game')
      ? ok('L.7c / v28 item 2 one store key, prefs.everywhere, and one ladder step (v5 → v6): a v5 record arrives with it as Per game, and one that already carries a theme keeps it (up6 adds, never replaces); a theme round-trips a reload; "constructor" is dropped; and a theme whose KEY IS NOT EARNED is KEPT and never applied - everywhere() reads Per game and a Dots run plays Waltz')
      : bad('L.7c the store key', JSON.stringify({ stat, a, b, kept, shut, junk }));
  }

  /* ---- 3. L.7c AMENDED AT BUILD 53 (v28 items 2 / 3): THE EVERYWHERE ROW IS GONE AND THE MUSIC ROW IS THE WHOLE CHOICE. Build 42 put a second
     row above the tracks for the same decision said a second way, and Aiden's line was "I don't know why they're separate". One row now: this
     game's three tracks, then one track per key, each key track locked until its KEY is earned and saying so under the row - by the key's own
     name (item 3), because the labels that read Key / Pro / Thorns were the TRACK names and a key is Skill key / Pro / Author. ---- */
  {
    const KY42 = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    const KB42b = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42b = (...ts) => Object.fromEntries(Object.keys(KB42b.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1 } }, { bars: tier42b('clear') }, { plain: PLAIN42 });
    await click('[data-go="s-custom"]'); await sleep(500);
    const cu = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = await import('./core/store.js'); const M = await import('./audio.js');
      const row = () => [...document.querySelectorAll('#c-track button')].map(b => ({ v: b.dataset.v, txt: b.textContent.trim(), sel: b.classList.contains('sel'), locked: b.classList.contains('locked') }));
      const out = { gone: !document.getElementById('c-everywhere') && !document.getElementById('g-everywhere'),
        label: document.getElementById('c-track').closest('.cgroup').querySelector('.clabel').textContent, before: row(), line0: document.getElementById('lk-track').textContent };
      const shut = row().filter(b => b.locked)[0];
      document.querySelector(`#c-track [data-v="${shut.v}"]`).click(); await wait(250);
      out.shutTap = { stored: S.prefs.everywhere, line: document.getElementById('lk-track').textContent };
      document.querySelector('#c-track [data-v="key:key"]').click(); await wait(300);
      // v29 (item 4, build 54): and what the MENU plays, for both kinds of pick — the stored id and what audio.js resolves it to
      out.on = { stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere, sel: (row().find(b => b.sel) || {}).v, menu: S.prefs.menuTrack, plays: M.Music.menuTrack() };
      const t = row().filter(b => !b.v.startsWith('key:'))[1];
      document.querySelector(`#c-track [data-v="${t.v}"]`).click(); await wait(300);
      out.g = document.getElementById('pv').dataset.g;
      out.back = { v: t.v, stored: S.prefs.everywhere, track: S.prefs.track[out.g], sel: (row().find(b => b.sel) || {}).v, menu: S.prefs.menuTrack, plays: M.Music.menuTrack() };
      return out; });
    const names = cu.before.map(x => x.txt.toUpperCase());
    const keyRows = cu.before.filter(x => x.v.startsWith('key:'));
    const themes = KY42.KEYS.map(k => k.theme.toUpperCase());
    (cu.gone && cu.label === 'Music' && cu.before.length === 6 && keyRows.length === 3
      && themes.every(t => names.includes(t)) && !names.some(t => KY42.KEYS.some(k => k.name.toUpperCase() === t))
      && keyRows.filter(x => x.locked).length === 2 && cu.line0 === ''
      && cu.shutTap.stored === 'game' && KY42.KEYS.some(k => cu.shutTap.line.includes(k.name))
      && cu.on.stored === 'key' && cu.on.sel === 'key:key'
      && cu.back.stored === 'game' && cu.back.track === cu.back.v.replace('key:', '') && cu.back.sel === cu.back.v
      /* v29 (item 4, build 54): ONE RULE FOR BOTH \u2014 whatever is picked plays on the MENU, key theme or game track alike, where build 53 sent
         the menu back to its own loop for a game's track. `prefs.menuTrack` is the resolved id and menuTrack() in audio.js is what plays. */
      && cu.on.menu === 'theme:key' && cu.on.plays === 'theme:key'
      && cu.back.menu === cu.g + ':' + cu.back.v && cu.back.plays === cu.g + ':' + cu.back.v)
      ? ok(`v28 items 2 / 3 / v29 item 4 Customise has ONE Music row and no Everywhere row: ${cu.before.length} options - this game's three tracks and one per key (${keyRows.map(x => x.txt).join(' \u00b7 ')}) - each key track locked until its own KEY is earned and saying so under the row ("${cu.shutTap.line}"), never over it; a locked one chooses nothing; the Skill key's track is chosen and stored in the same field the key screen writes; a tap on one of this game's tracks goes back to Per game with that track chosen; and EITHER KIND becomes the menu's music - the key theme plays "${cu.on.plays}" on the front of the app and the game track "${cu.back.plays}", one rule for both`)
      : bad('v28 items 2 / 3 the one Music row', JSON.stringify(cu));
  }

  /* ---- 4. L.7b: SET THIS MUSIC at the foot of a key screen whose chest is open; a key whose chest is shut plays no theme and its button cannot be pressed;
     the tap writes the one key and reads PLAYING EVERYWHERE in green, the other keys revert, and Customise reads the same key (A4) ---- */
  {
    const keyAt = async i => { await page.evaluate(async i => { const R = await import('./ui/router.js'); R.show('s-menu'); await new Promise(r => setTimeout(r, 120)); R.show('s-key', { tier: i }); }, i); await sleep(1200);
      return page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music'), r = b.getBoundingClientRect(), s = document.getElementById('build').getBoundingClientRect();
        return { track: M.Music.probe().track, hidden: b.hidden, txt: b.textContent, on: b.classList.contains('on'), clear: b.hidden || document.getElementById('build').hidden /* AMENDED at build 48 (v26 item 12): no label on this screen */ || r.bottom <= s.top, stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere }; }); };
    /* AMENDED AT BUILD 53 (v28 item 2): the button waits for the KEY to be EARNED, not for the chest that key opens - the same line Customise's
       Music row now takes. So `locked` is a profile with the tier open and the key UNFINISHED, and the rest carry the bars. */
    const KB42c = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42c = (...ts) => Object.fromEntries(Object.keys(KB42c.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1 } }, {}, { plain: PLAIN42 });
    const locked = await keyAt(0);
    await boot({ chests: { games: 1, key: 1, pro: 1 } }, { bars: tier42c('clear', 'pro') }, { plain: PLAIN42 });
    const k0 = await keyAt(0), k1 = await keyAt(1), k2 = await keyAt(2);
    await page.evaluate(() => document.getElementById('key-music').click()); await sleep(200);
    const k2tap = await page.evaluate(() => JSON.parse(localStorage.getItem('ne')).prefs.everywhere);
    await keyAt(1); await page.evaluate(() => document.getElementById('key-music').click()); await sleep(250);
    const k1on = await page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music');
      return { txt: b.textContent, on: b.classList.contains('on'), col: getComputedStyle(b).color, stored: JSON.parse(localStorage.getItem('ne')).prefs.everywhere, track: M.Music.probe().track }; });
    await click('#key-keys [data-kt="0"]'); await sleep(400);
    const k0after = await page.evaluate(async () => { const M = await import('./audio.js'); const b = document.getElementById('key-music'); return { txt: b.textContent, on: b.classList.contains('on'), track: M.Music.probe().track }; });
    await click('#key-keys [data-kt="1"]'); await sleep(300);
    const k1back = await page.evaluate(() => document.getElementById('key-music').textContent);
    // v28 (item 2): Customise reads the same field from its one Music row - the key tracks carry `key:<chest>` as their value
    const cus = await page.evaluate(async () => { const R = await import('./ui/router.js'); R.show('s-custom'); await new Promise(r => setTimeout(r, 400));
      return ((document.querySelector('#c-track .opt.sel') || { dataset: {} }).dataset.v || '').replace('key:', ''); });
    const srcKey = strip(read('ui', 'screens', 'key.js')), srcCus = strip(read('ui', 'screens', 'customise.js')), srcAud = strip(read('audio.js'));
    const a4 = !/screens\/customise|"\.\/customise\.js"/.test(srcKey) && !/screens\/key|"\.\/key\.js"/.test(srcCus) && /everywhere\(\)/.test(srcKey) && /everywhere\(\)/.test(srcCus) && !/key:roots/.test(srcAud);
    /* AMENDED at build 43 (v24 C.2 / C.3): a key's theme plays on its screen once its TIER is open, not once the chest it opens is — build 42's
       guess was what silenced Pro and Author. So key 1 with only the Games chest plays theme:key, and Author with its Author chest shut plays
       theme:thorns; SET THIS MUSIC still waits for that chest (both buttons hidden) */
    (locked.hidden && locked.track === 'theme:key' && !k0.hidden && k0.txt === 'SET THIS MUSIC' && k0.track === 'theme:key' && k0.clear && !k1.hidden && k1.track === 'theme:pro' && k2.hidden && k2.track === 'theme:thorns' && k2tap === 'game'
      && k1on.txt === 'PLAYING EVERYWHERE' && k1on.on && k1on.col === 'rgb(61, 214, 140)' && k1on.stored === 'pro' && k0after.txt === 'SET THIS MUSIC' && !k0after.on && k0after.track === 'theme:key' && k1back === 'PLAYING EVERYWHERE' && cus === 'pro' && a4)
      ? ok('L.7b with only the Games chest open, key 1\'s screen has no button yet plays its theme (AMENDED at build 43, C.2); with its chest open SET THIS MUSIC sits at the foot of the screen clear of the build stamp and key 1 plays its theme - and Pro its own a second after arriving on the Pro tab, where build 30\'s screen timer used to swap in Roots; Author\'s, its Author chest shut, plays its theme but its button is hidden and does nothing; the tap stores Pro and reads PLAYING EVERYWHERE in green, key 1 reads SET THIS MUSIC again, and Customise\'s Everywhere row reads the same key - neither screen imports the other (A4)')
      : bad('L.7b SET THIS MUSIC', JSON.stringify({ locked, k0, k1, k2, k2tap, k1on, k0after, k1back, cus, a4 }));
  }

  /* ---- 5. L.7d: a key theme as run music takes the one path a game's track takes, so it obeys every run-music rule; the menu loop is not the setting (guess) ---- */
  {
    // v28 (item 2): a key track waits for its KEY, so the fixture carries the bars as well as the chests
    const KB42d = await import(pathToFileURL(path.join(root, 'config', 'key-bars.js')).href);
    const tier42d = (...ts) => Object.fromEntries(Object.keys(KB42d.KEY_BARS).flatMap(k => ts.map(t => [t === 'clear' ? k : k + '|' + t, NOW])));
    await boot({ chests: { games: 1, key: 1, pro: 1 }, everywhere: 'pro' }, { bars: tier42d('clear', 'pro') }, { plain: PLAIN42 });
    const rm = await page.evaluate(async () => { const M = await import('./audio.js'); const st = await import('./core/state.js'); const A = await import('./config/audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      const t = A.TRACKS['theme:pro'], barSec = 60 / t.bpm * (t.beats || 4);
      st.sel.vs = 0; M.Music.start('quick-tap', { on: true, live: true, end: performance.now() + 4500, flow: 1 }, 20); await wait(500); out.timed = M.Music.probe();
      M.Music.start('hold', { on: true, live: false }, 0, 'grow'); out.set = Object.assign(M.Music.probe(), { want: +((A.SET_SECS['hold:grow'] + 3) / barSec).toFixed(2) });
      M.Music.start('spot', { on: true, live: false }, 0); out.open = M.Music.probe();
      st.sel.vs = 2; M.Music.start('reaction', { on: true, live: true, vsP: [.4, .6] }, 0, 'flash'); out.vs = M.Music.probe(); st.sel.vs = 0;
      M.Music.stop(); M.Music.menu('menu'); out.menu = M.Music.probe(); M.Music.stop();
      return out; });
    const srcAud = strip(read('audio.js'));
    /* AMENDED AT BUILD 53 (v28 item 2): the menu loop reads the setting too - Aiden's line is "whatever is picked plays in the menu from then
       on", and build 42's "the menu loop ignores it" was marked a guess. Music.menu resolves through menuTrack(), which is that key's theme or
       the menu's own loop, so a key track chosen in Customise is the front of the app's music as well as every run's. */
    /* DELETED AT BUILD 54 (v29 item 4), NOT RE-SPELLED: the third clause here was `/const menuTrack=\(\)=>KEY_THEMES\[everywhere\(\)\]/` — a
       source-text check on how one line of audio.js is written. Item 4 gives menuTrack a second branch for a game's track, so the line is
       spelled differently and the check failed on the refactor; the repo rule is to delete such a check and name it, never to adjust it to the
       new spelling. Nothing is lost: `rm.menu.track` below DRIVES the page and proves the same fact harder (the menu really plays the theme),
       and the build-42 Customise check proves the other half — a game's track picked in the Music row is what menuTrack() then resolves to. */
    const one = /const t=pickRun\(g\); run\(t,g,shapeFor\(t,g,d,len\)\)/.test(srcAud) && (srcAud.match(/pickRun\(/g) || []).length === 1;
    (one && rm.timed.track === 'theme:pro' && rm.timed.arc && rm.timed.fin && rm.timed.flow && !rm.timed.stems
      && rm.set.track === 'theme:pro' && rm.set.arc && Math.abs(rm.set.arcBars - rm.set.want) < .02 && !rm.set.flow
      && rm.open.track === 'theme:pro' && !rm.open.arc && rm.vs.track === 'theme:pro' && rm.vs.stems && !rm.vs.flow && rm.menu.track === 'theme:pro')
      ? ok(`L.7d with Pro set everywhere, every run plays theme:pro through the one path a game's track takes (pickRun, then shapeFor): a 20s Quick Tap run gets the arc, lands its last five seconds on the clock and arms the flow hum; an Estimate Grow Set gets the arc sized to SET_SECS (${rm.set.arcBars} bars); an open-ended run gets the long form; a versus run gets both stems; Sequence's duck keys on the game, not the track; and the MENU LOOP PLAYS IT TOO (v28 item 2 - build 42's guess that it should not was Aiden's to settle, and he did)`)
      : bad('L.7d the theme as run music', JSON.stringify({ one, rm }));
  }

  /* ---- 6. L.7e: the catalogue - the new themes on the music cards and linked both ways with their key screen cards, the old three once more marked retired, the Everywhere row photographed ---- */
  rv4: {
    if (!REVIEW) { noReview('L.7e the catalogue and the key themes'); break rv4; }
    const gen = rvRead('scripts', 'catalogue.mjs'), tpl = rvRead('scripts', 'catalogue.template.html');
    const shots = REVIEW ? JSON.parse(rvRead('scripts', 'catalogue.annotations.json')).map(x => x.shot) : [];
    /* AMENDED AT BUILD 53 (v28 items 2 / 3): the Everywhere row is gone, so the capture no longer sets `prefs.everywhere = 'pro'` to photograph
       it and the shot is `13g-s-custom-music` — the one Music row, with a locked key track tapped so its line shows. Everything else stands. */
    const catOk = { gen: /AU\.KEY_THEMES\)/.test(gen) && /AU\.KEY_THEMES_RETIRED\)/.test(gen) && /'13d-s-key-lantern'/.test(gen),
      tpl: /(\\u266a|♪) its theme/.test(tpl) && /(\\u266a|♪) its key screen/.test(tpl) && /t\.retired/.test(tpl),
      shot: shots.includes('13g-s-custom-music'), gone: !shots.includes('13g-s-custom-everywhere') };
    (catOk.gen && catOk.tpl && catOk.shot && catOk.gone)
      ? ok('L.7e the catalogue carries the three rewritten themes on the music cards, each linked to its key screen card and back (the build-27 pattern), the build-30 three once more marked retired for the A/B, SET THIS MUSIC on the key shots, and the ONE Music row on its own card (v28 item 2 — the Everywhere card went with the row)')
      : bad('L.7e the catalogue', JSON.stringify(catOk));
  }
}
