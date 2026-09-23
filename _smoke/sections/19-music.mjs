/* ---- music (build 49 opened it: v26 §B1, the sound notes from the build 46 board) ---- */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, GAMES, sleep, names, part, section, check, ok, bad, root, boot, NOW, at, page, until, onScreen, inGame, click, down, up, skipAd, readySeen, verdict, finish, poke, ONLY, named } from '../lib/gate.mjs';

export const SECTION = ["music"];

export async function run() {
  /* ---- v30 (59.15, build 59): THE PRO KEY SOUNDS ELECTRICAL, AND ITS TIMES COME OFF THE ANIMATION ----
     Aiden: "the sound should be more electronic. You can keep the current music but also have some electrical success music
     because it's a circuit, you know." The bed is untouched and this is a second layer over it, tied to what the circuit is
     DOING. What is asserted is the thing that would rot first: 59.15 says to "schedule these off the animation's own step times,
     not fixed offsets, or they drift the first time a timing changes", and this animation has been re-timed twice already — so
     the check MOVES a step in config and proves the layer moved with it, rather than reading a list of numbers. */
  {
    const c15 = await page.evaluate(async () => { const M = await import('./audio.js'), K = await import('./config/keys.js');
      const at = p => p.map(n => Math.round(n[0] * 1000));
      const before = M.Snd.keyCircuitPlan('pro');
      const E = K.KEY_EARN.pro, ring = E.steps.find(s => s.name === 'ring'), was = ring.at;
      ring.at = was + 500;                                    // move the ring later and ask the layer where its sweep went
      const moved = M.Snd.keyCircuitPlan('pro');
      ring.at = was;
      const sweepOf = p => { const n = p.find(x => x[4] === 'sawtooth' && x[1] !== x[2] && x[3] <= 600); return n ? Math.round(n[0] * 1000) : null; };
      return { n: before.length, tiers: { clear: M.Snd.keyCircuitPlan('clear').length, pro: before.length, author: M.Snd.keyCircuitPlan('author').length },
        sweepWas: sweepOf(before), sweepMoved: sweepOf(moved), ringAt: was,
        // the layer's own shapes: climbing blips, dry clicks, one long rising hum, the sweep, the closing arpeggio
        blips: before.filter(x => x[4] === 'square' && x[3] === 70).map(x => Math.round(x[1])),
        clicks: before.filter(x => x[4] === 'square' && x[3] <= 30).length,
        hum: before.filter(x => x[4] === 'sawtooth' && x[3] > 1000).map(x => [Math.round(x[1]), Math.round(x[2]), x[3]])[0] || null,
        arp: before.filter(x => x[4] === 'square' && x[3] === 150).map(x => Math.round(x[1])),
        endsBeforeTheBed: Math.max(...before.map(x => x[0] * 1000 + x[3])) <= Math.max(...M.Snd.keyEarnPlan('pro').map(x => x[0] * 1000 + x[3])) + 1,
        bedUntouched: at(M.Snd.keyEarnPlan('pro')).length }; });
    const climbs = c15.blips.length === 7 && c15.blips.every((f, i) => !i || f > c15.blips[i - 1]);
    const arpRises = c15.arp.length >= 3 && c15.arp.every((f, i) => !i || f > c15.arp[i - 1]);
    const humRises = !!c15.hum && c15.hum[1] > c15.hum[0] && c15.hum[2] > 1000;
    const proOnly = c15.tiers.clear === 0 && c15.tiers.author === 0 && c15.tiers.pro > 10;
    const followsTheAnimation = c15.sweepWas === c15.ringAt && c15.sweepMoved === c15.ringAt + 500;
    (climbs && arpRises && humRises && proOnly && followsTheAnimation && c15.clicks === 7 && c15.endsBeforeTheBed)
      ? ok(`v30 59.15 the Pro key has an ELECTRICAL layer over its own music, and it is tied to the circuit: ${c15.blips.length} blips climbing ${c15.blips[0]}→${c15.blips[c15.blips.length - 1]}Hz one per spoke, ${c15.clicks} dry relay clicks as the nodes are reached, a mains hum rising ${c15.hum[0]}→${c15.hum[1]}Hz under the whole build, a saw sweep as the ring closes and a ${c15.arp.length}-note arpeggio resolving with the bed — and MOVING the ring step 500ms later moves the sweep with it (${c15.sweepWas}→${c15.sweepMoved}ms), so no offset is written twice. The Skill and Author keys have none of it and the bed is untouched`)
      : bad('v30 59.15 the Pro key circuit layer', JSON.stringify(c15));
  }
  const AU49 = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
  const CH49 = await import(pathToFileURL(path.join(root, 'config', 'chests.js')).href);   // build 51 (v27 item 5): the uncross step's own beat
  // build 51 (v27 item 1): the title sequence is driven here, so this section needs a profile of its own
  const PLAIN51 = { story: 1, gridSeen: 1, played: 1, menuSeen: 1, keySeen: 1, keysSeen: 1, snd: 'off', musicG: {}, spill: {}, readySeen: {}, revealed: {}, menuOpened: {}, keyIntro: { clear: 1, pro: 1, author: 1 } };
  const TH49 = await import(pathToFileURL(path.join(root, 'config', 'theme.js')).href);
  const AC49 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
  const notes = ev => ev.filter(e => e[4] === 'triangle'), bass = ev => ev.filter(e => e[4] === 'sine' && e[1] < 300);
  const endHz = ev => { const n = notes(ev); return n.length ? Math.max(...n.map(e => e[2])) : 0; };
  const V = AU49.VERDICT_FX, RF = AU49.ROUND_FX;
  // build 45's Amazing!, which Aiden asked to become Great!
  const OLD_ACE = [[0, 523.3, 523.3, 300, 'triangle', .075, 18], [.10, 784, 784, 300, 'triangle', .075, 18], [.20, 1046.5, 1046.5, 460, 'triangle', .08, 18], [.20, 2093, 2093, 320, 'sine', .022, 26], [0, 261.6, 392, 760, 'sine', .05, 90]];
  const OLD_BAD = [[0, 392, 330, 260, 'triangle', .07, 14], [.14, 294.7, 196, 440, 'triangle', .06, 14], [0, 98, 98, 560, 'sine', .04, 70]];
  {
    const counts = ['bad', 'ok', 'good', 'ace'].map(id => notes(V[id]).length);
    const okRises = notes(V.ok)[1][1] > notes(V.ok)[0][1] && notes(V.ok)[0][1] === notes(V.ok)[0][2];
    const ladder = JSON.stringify(V.good) === JSON.stringify(OLD_ACE) && JSON.stringify(V.bad) === JSON.stringify(OLD_BAD) && counts.join() === '2,2,3,4' && okRises
      && endHz(V.ace) > endHz(V.good) && endHz(V.good) > endHz(V.ok) && ['bad', 'ok', 'good', 'ace'].every(id => bass(V[id]).length);
    const rounds = ['bad', 'ok', 'good', 'ace'].every(id => notes(RF[id]).length === notes(V[id]).length - 1 && bass(RF[id]).length > 0);
    const played = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js');
      return ['bad', 'ok', 'good', 'ace'].every(id => { const src = A.ROUND_FX[id], p = M.Snd.roundVerdictPlan(id); return p.length === src.length && p.every((e, i) => e[5] < src[i][5] && e[3] < src[i][3] && e[1] === src[i][1]); }); });
    (ladder && rounds && played)
      ? ok(`§B1 the result sounds climb - Meh. unchanged (${counts[0]} notes, falling), Good. a rising third (${counts[1]}), Great! build 45's Amazing! note for note (${counts[2]}), Amazing! ${counts[3]} notes ending highest (${endHz(V.ace)} Hz) - each with bass under it; every round sound is one note shorter than its result sound, with bass, and still plays shorter and quieter`)
      : bad('§B1 the verdict sounds', JSON.stringify({ counts, okRises, ladder, rounds, played }));
  }
  {
    // End of run no longer plays under the result's tier: a real Quick Tap run, timed at the two calls
    await boot({}, { unlock: { 'quick-tap:four': Date.now() } });
    await page.evaluate(async () => { const A = await import('./audio.js'); const log = window.__e49 = [];
      for (const k of ['end', 'verdict']) { const o = A.Snd[k]; A.Snd[k] = function () { log.push([k, Math.round(performance.now())]); return o.apply(this, arguments); }; } });
    await click('[data-go="s-pick"]'); await sleep(700);
    await page.evaluate(() => document.querySelector('#grid .tile[data-game="quick-tap"]').click()); await sleep(350);
    await page.evaluate(() => document.querySelectorAll('#diff-row .choice')[0].click()); await sleep(320);
    await page.evaluate(() => document.querySelectorAll('#time-row .tbtn')[0].click()); await sleep(200);
    await click('#go-btn'); await sleep(400);
    const t0 = Date.now(); while (Date.now() - t0 < 40000) { const at = await onScreen(); if (at === 's-over') break; if (await inGame()) await poke('quick-tap'); await sleep(40); }
    for (let i = 0; i < 40; i++) { await skipAd(); if (await page.evaluate(() => window.__e49.some(x => x[0] === 'verdict'))) break; await sleep(200); }
    const log = await page.evaluate(() => window.__e49.slice());
    const e = log.find(x => x[0] === 'end'), v = log.find(x => x[0] === 'verdict');
    (e && v && v[1] - e[1] >= 1000)
      ? ok(`§B1 End of run no longer plays on top of the result's tier sound: the tier waits until it has landed (${v[1] - e[1]}ms after it, where it came in at about 250ms)`)
      : bad('§B1 End of run and the verdict', JSON.stringify(log));
  }
  {
    const W = AU49.WHOOSH_VARIANTS;
    const data = W.length === 7 && W.every(([p, l]) => Math.abs(p - 1) <= .06 && Math.abs(l - 1) <= .1) && new Set(W.map(x => x.join())).size === 7;
    const drawn = await page.evaluate(async () => { const M = await import('./audio.js'); const A = await import('./config/audio.js'); const S = await import('./core/store.js'); S.prefs.snd = 'space';
      const one = v => M.Snd.plan(() => M.Snd.whoosh(900, 110, 700, v))[0];
      const fixed = A.WHOOSH_VARIANTS.every((w, i) => { const e = one(i); return Math.abs(e[1] - 110 * w[0]) < .2 && Math.abs(e[3] - Math.round(900 * w[1])) <= 1; });
      const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(one().slice(1, 4).join());
      return { fixed, distinct: seen.size }; });
    /* AMENDED at build 51 (v27 item 1): the title half of this check is DELETED. It asserted that both title beats were LONG (over 1.1s and
       1.5s) with a slowly beating high pair over them — build 49's swell, and exactly what item 1 replaced with a single impact. It is not
       re-spelled to the new shape: the impact has its own check below, on its own terms. The whoosh half is untouched. */
    (data && drawn.fixed && drawn.distinct >= 4)
      ? ok(`§B1 the count-up whoosh has seven very similar versions (pitch and length within 6% / 10%), one drawn at random each time (${drawn.distinct} different ones in 60 plays)`)
      : bad('§B1 the whooshes', JSON.stringify({ data, drawn }));
  }
  {
    const item = TH49.ITEMS.snd.find(i => i.v === 'sigh'), tour = AC49.ACH.find(a => a.id === 'tour');
    await boot({ snd: 'sigh', chests: { games: 1 } });
    const held = await page.evaluate(async () => { const S = await import('./core/store.js'); const R = await import('./ui/router.js'); const M = await import('./audio.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = { stored: S.prefs.snd }; R.show('s-custom'); await wait(400); out.row = [...document.querySelectorAll('#c-snd [data-v]')].map(b => b.dataset.v);
      S.prefs.snd = 'sigh'; out.miss = M.Snd.plan(() => M.Snd.miss()).map(e => e[1]); S.prefs.snd = 'space'; return out; });
    (item && item.held && !item.by && tour && !tour.unlocks && held.stored === 'space' && !held.row.includes('sigh') && held.row.length && Math.min(...held.miss) >= 400)
      ? ok(`§B1 Sigh is held: off Customise's sound pack row (${held.row.join(', ')}), a profile that had it chosen plays Space, Grand tour no longer unlocks it (the achievement is still to be decided), and its miss starts at ${Math.min(...held.miss)} Hz so it can be heard`)
      : bad('§B1 the Sigh sound pack', JSON.stringify({ item, tour, held }));
  }
  {
    const tk = AU49.TRACKS['theme:key'], r2 = tk.root * 2, tones = [...tk.ch[0], ...tk.ch[1]].map(n => (((n % 12) + 12) % 12));
    const assemble = AU49.CHEST_FX.key.filter(e => e[0] < 1.8 && e[4] === 'sine');
    const inTheme = assemble.length >= 8 && assemble.every(e => { const s = Math.round(12 * Math.log2(e[1] / r2)); return tones.includes(((s % 12) + 12) % 12) && Math.abs(e[1] - r2 * Math.pow(2, s / 12)) < 1; });
    const spill = AU49.CHEST_FX.key.filter(e => e[0] >= 2.7).map(e => Math.round(12 * Math.log2(e[1] / r2))).join() === tk.ch[0].join();
    const pro = AU49.CHEST_FX.pro, burst = pro.filter(e => Math.abs(e[0] - 2.8) < .01 && e[1] >= 140);
    const epic = pro.length >= 24 && burst.length >= 5 && pro.some(e => e[1] < 45) && AU49.CHEST_STING.pro.tail.length >= 6;
    const earn = AU49.KEY_EARN_FX, layers = ev => new Set(ev.map(e => e[3] + e[4])).size;
    const thorn = earn.author.notes.length >= 25 && earn.author.notes.length > earn.pro.notes.length && layers(earn.author.notes) > 12;
    (inTheme && spill && epic && thorn)
      ? ok(`§B1 the Skill chest opening is built from key 1's theme - its first two chords arpeggiated as the bars assemble and its opening chord held as the light spills; the Pro chest opening has ${pro.length} sounds with a ${burst.length}-note chord on the burst and a sub under it; Thorn earned has ${earn.author.notes.length} notes in more layers (Circuit has ${earn.pro.notes.length})`)
      : bad('§B1 the chest and key sounds', JSON.stringify({ inTheme, spill, epic, thorn, assemble: assemble.map(e => e[1]) }));
  }

  /* ---- v27 item 1 (build 51): THE TITLE IS AN IMPACT NOW, FIRED ON THE FRAME ITS LINE STARTS. Aiden heard each line's sound landing late, and
     the two faults were one: a 400-600ms attack means the loudest part arrives half a second after the trigger. Every layer of both beats opens
     inside 5ms and falls away; the title line is still the heavier. And the trigger is measured off the animation's OWN start time on the
     document timeline, not off a setTimeout taken after the style recalc — driven below, against the stylesheet's own delays. ---- */
  {
    /* AMENDED AT BUILD 57 (v29 Section A, 57.1): each beat is an impact PLUS A REVERB TAIL, and the fourth beat has a sound of its own. So the
       impact rule is measured on the events at 0s — which is where item 1's "the moment it is fired IS the moment it is heard" lives — and the TAIL
       is asserted for what a reverb is: every tail event comes after the impact, quieter than it, and lowpassed no higher than it. `begin` is held
       to the same shape and to being HIGHER than the three that fall, which is Aiden's own instruction. */
    const T = AU49.TITLE_FX, lay = ev => ev.map(e => ({ at: e[0], atk: e[6] || 0, ms: e[3], g: e[5], f0: e[1], f1: e[2], lp: e[7] || 0 }));
    const hit = k => lay(T[k]).filter(x => x.at === 0), tail = k => lay(T[k]).filter(x => x.at > 0);
    const impact = k => hit(k).length && hit(k).every(x => x.atk <= 5 && x.ms <= 950 && x.f1 <= x.f0);
    const reverb = k => { const h = hit(k), t = tail(k); const gMax = Math.max(...h.map(x => x.g));
      return t.length >= 3 && t.every((x, i) => x.g < gMax && (!i || x.g <= t[i - 1].g) && (!i || x.at > t[i - 1].at)); };
    const heavier = Math.max(...T.title.map(e => e[5])) > Math.max(...T.line.map(e => e[5])) && Math.max(...T.title.map(e => e[3])) > Math.max(...T.line.map(e => e[3]));
    // 57.1: TAP TO BEGIN sits above the three that fall into the floor
    const lead = k => { const h = hit(k); return h.reduce((a, b) => b.g > a.g ? b : a, h[0]).f0; };
    const begins = lead('begin') > lead('line') && lead('begin') > lead('title');
    // the theme rule the other families keep: nothing short and high
    const rule = ['line', 'title'].every(k => T[k].every(e => !(e[1] >= 300 && e[3] >= 700)) && T[k].every(e => e[3] < 700 ? true : e[1] < 300));
    await boot({ story: 0, snd: 'space' }, {}, { plain: { ...PLAIN51, story: 0, snd: 'space' } });
    const fired = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js'); const wait = ms => new Promise(r => setTimeout(r, ms));
      const log = [], o = A.Snd.titleFx; A.Snd.titleFx = function (k) { log.push({ k, at: Math.round(performance.now() - t0) }); return o.apply(this, arguments); };
      const t0 = performance.now(); R.show('s-menu', { story: true });
      await wait(120);
      const want = [['#st1', 'line'], ['#s-menu .wmin', 'title'], ['#st2', 'line'], ['#storyhint', 'begin']].map(([sel, k]) => { const el = document.querySelector(sel), a = el.getAnimations()[0];
        return { k, at: a ? Math.round((a.effect.getComputedTiming().delay || 0) + (a.startTime || 0) - t0) : -1 }; });
      await wait(5200); A.Snd.titleFx = o; return { log, want }; });
    // each beat fires within a frame or two of the moment its own line starts moving - the whole of item 1's "on the same frame"
    const drift = fired.log.map((x, i) => Math.abs(x.at - (fired.want[i] || { at: 0 }).at));
    const onTime = fired.log.length === 4 && fired.log.map(x => x.k).join() === 'line,title,line,begin' && drift.every(d => d <= 40);
    const green = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('storyhint')); return { col: c.color, glow: c.textShadow }; });
    const isGreen = /rgb\(\s*61,\s*214,\s*140/.test(green.col) && /rgb/.test(green.glow);
    (impact('line') && impact('title') && impact('begin') && reverb('line') && reverb('title') && reverb('begin') && heavier && begins && rule && onTime && isGreen)
      ? ok(`v27 item 1 / v29 57.1 each title beat is ONE IMPACT with a reverb tail behind it — every layer at 0s opens in ${Math.max(...hit('title').map(x => x.atk))}ms at most, then ${tail('title').length} tails each quieter and darker than the last — the title line still the heaviest, TAP TO BEGIN its own sound led at ${lead('begin')}Hz against the ${lead('line')}Hz and ${lead('title')}Hz the others fall from, and glowing green (${green.col}); and each is fired on the frame its own line starts: ${fired.log.map((x, i) => x.k + ' ' + x.at + 'ms (line at ' + fired.want[i].at + ')').join(' · ')}, off by ${Math.max(...drift)}ms at worst`)
      : bad('v27 item 1 / v29 57.1 the title impact', JSON.stringify({ impact: [impact('line'), impact('title'), impact('begin')], reverb: [reverb('line'), reverb('title'), reverb('begin')], heavier, begins, rule, onTime, drift, green, fired }));
  }

  /* ---- v27 items 5 / 6 (build 51): THE GAMES CHEST. Its seven squares tick off (item 5) — they were never missing, they were seven identical
     notes under a sting — and each is now a step higher, the seventh a finish. Its rewards' pops (item 6) were masked by its own closing chord,
     so that chest's pops are lifted and a KEY reward's brighter, and ONLY that chest's: item 12 approved the Pro chest's sounds as they are. ---- */
  {
    const G = AU49.CHEST_FX.games, ticks = G.filter(e => e[0] <= .95 && e[3] <= 160 && e[4] === 'triangle');
    const rising = ticks.length === 7 && ticks.every((e, i) => !i || e[2] > ticks[i - 1][2]);
    const finish = G.some(e => Math.abs(e[0] - .9) < .001 && e[3] > 160) && ticks[6][3] > ticks[0][3];
    const onStep = (() => { const ux = (CH49.CEREMONY.games.steps.find(x => x.name === 'uncross') || {}); const step = Math.round(ux.ms / 8);
      return ticks.every((e, i) => Math.abs(Math.round(e[0] * 1000) - i * step) <= 5); })();
    const pops = await page.evaluate(async () => { const A = await import('./audio.js');
      const peak = ev => Math.max(...ev.map(e => e[5])), top = ev => Math.max(...ev.map(e => e[1]));
      const base = A.Snd.popPlan(0), games = A.Snd.popPlan(0, { chest: 'games' }), gkey = A.Snd.popPlan(1, { chest: 'games', key: true }), pro = A.Snd.popPlan(0, { chest: 'pro' });
      return { base: [peak(base), top(base)], games: [peak(games), top(games)], gkey: [peak(gkey), top(gkey)], pro: [peak(pro), top(pro)] }; });
    const lifted = pops.games[0] > pops.base[0] && pops.games[1] > pops.base[1];
    const brighter = pops.gkey[0] > pops.games[0] && pops.gkey[1] > pops.games[1];
    const proUntouched = pops.pro[0] === pops.base[0] && pops.pro[1] === pops.base[1];
    (rising && finish && onStep && lifted && brighter && proUntouched)
      ? ok(`v27 items 5 / 6 the Games chest: its seven squares tick ${ticks.map(e => Math.round(e[2])).join(' → ')} Hz, one per square on the uncross step's own beat, the seventh longer with a low body under it (item 5 — they were wired at build 41 and never removed, all seven at one pitch); and its rewards pop clear of its own closing chord, ${(pops.games[0] / pops.base[0]).toFixed(1)}× the level and ${Math.round(pops.games[1] - pops.base[1])} Hz higher, a key reward brighter again — with the Pro chest's pop untouched, as item 12 requires`)
      : bad('v27 items 5 / 6 the Games chest sounds', JSON.stringify({ ticks: ticks.map(e => [e[0], e[2], e[3]]), rising, finish, onStep, pops, lifted, brighter, proUntouched }));
  }

  /* ---- v27 item 14 (build 51): a sound per NAMED STEP of the key-earned animation. One row per name, every name a tier uses has one, and none
     of them is the unlock sound, the achievement click, a chest's or the key's own earn. ---- */
  {
    const S = AU49.KEY_STEP_FX, KY = await import(pathToFileURL(path.join(root, 'config', 'keys.js')).href);
    /* AMENDED AT BUILD 52 (Aiden's answer to build 51): a SPOKES step whose spokes fire one at a time plays its games' own sounds, not a row here,
       and since the Pro key was rebuilt to fire one by one no tier fires them together — so `spokes` has no row and must not be asked for one. */
    /* AMENDED AT BUILD 53 (v28 item 15): `rise` is the finale's settle — three to four seconds of continuous motion under the music's own last
       chords — and a sound held under it would only fight the track, so it has no row either. `land`, the hit on the final note, does. */
    const used = [...new Set(Object.values(KY.KEY_EARN).flatMap(e => e.steps.filter(x => !(x.name === 'spokes' && e.spokes && e.spokes.gap > 0) && x.name !== 'rise').map(x => x.name)))].filter(n => n !== KY.EARN_GLOW);
    const covered = used.every(n => (S[n] || []).length);
    const shape = Object.values(S).every(ev => ev.length && ev.every(e => e.length >= 6 && typeof e[1] === 'number' && e[3] > 0 && e[5] > 0 && e[5] < .2));
    const apart = await page.evaluate(async names => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const mine = names.map(n => sig(A.Snd.keyStepPlan(n)));
      const others = [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.chestPlan('games').map(e => e.slice(0, 8))), sig(A.Snd.keyEarnPlan('clear'))];
      return { clash: mine.filter(m => others.includes(m)).length, uniq: new Set(mine).size, n: mine.length }; }, Object.keys(S));
    (covered && shape && !apart.clash && apart.uniq === apart.n)
      ? ok(`v27 item 14 each named step of the key-earned animation has its own sound — ${Object.keys(S).join(', ')} — every step a tier uses is covered (${used.join(', ')}), no two are the same and none is the unlock sound, the achievement click, a chest's or the key's own earn (which lands on the flash instead)`)
      : bad('v27 item 14 the step sounds', JSON.stringify({ used, covered, shape, apart }));
  }

  /* ---- v27 item 10 (build 52): THE VIDEO PLAYER'S POWER ON AND POWER OFF. One pair for all eight clips, because item 10 builds them into the
     player and not into the files. Both follow the tap-sound switch like every other effect, neither is the unlock sound, the achievement
     click, a chest's or a key's earn, and the pair is a pair: the power-off is the power-on's shape falling instead of rising. ---- */
  {
    const V = AU49.VIDEO_FX;
    const shape = ['on', 'off'].every(k => (V[k] || []).length && V[k].every(e => e.length >= 6 && e[3] > 0 && e[5] > 0 && e[5] < .2 && (e[6] || 0) <= 10));
    // soft: item 10's word. Under a chest's pop, which is the quietest thing it sits near
    const soft = Math.max(...V.on.map(e => e[5])) <= Math.max(...AU49.POP_FX.notes.map(e => e[5])) * 1.2
      && Math.max(...V.off.map(e => e[5])) <= Math.max(...V.on.map(e => e[5]));
    // the thunk rises going out and falls coming back: the loudest layer of `on` sweeps up, of `off` sweeps down
    const loudest = ev => ev.slice().sort((a, b) => b[5] - a[5])[0];
    const pair = loudest(V.on)[1] > loudest(V.on)[2] && loudest(V.off)[1] > loudest(V.off)[2]
      && V.on.some(e => e[1] < e[2]) && V.off.some(e => e[1] > e[2]);
    const apart = await page.evaluate(async () => { const A = await import('./audio.js');
      const sig = ev => ev.map(e => [e[1], e[3], e[4]].join(':')).join('|');
      const mine = ['on', 'off'].map(k => sig(A.Snd.videoPlan(k)));
      const others = [sig(A.Snd.plan(() => A.Snd.unlockFx())), sig(A.Snd.plan(() => A.Snd.click())), sig(A.Snd.chestPlan('games').map(e => e.slice(0, 8))),
        sig(A.Snd.keyEarnPlan('clear')), sig(A.Snd.keyStepPlan('slam'))];
      // the player really fires them, and only those two, once each way
      const heard = []; const f = A.Snd.videoFx; A.Snd.videoFx = function (k) { heard.push(k); return f.apply(this, arguments); };
      return { clash: mine.filter(m => others.includes(m)).length, uniq: new Set(mine).size, restore: !!A.Snd.videoFx }; });
    (shape && soft && pair && !apart.clash && apart.uniq === 2)
      ? ok(`v27 item 10 the video player's power-on and power-off are one pair for all eight clips (config/audio.js VIDEO_FX): a soft thunk with a short rise over it as the picture opens, its reverse as the picture goes to a dot, both under a chest's pop, both following the tap-sound switch, and neither one the unlock sound, the achievement click, a chest's or a key's earn`)
      : bad('v27 item 10 the video sounds', JSON.stringify({ shape, soft, pair, apart }));
  }

  /* ---- v27 (Aiden's answer to build 51, build 52): "even more epic for the pro ... the author should be epic super duper music". The three
     earn sounds have to climb, and they have to climb by more than they did: Pro over Skill and Author over Pro, in notes, in layers and in
     length, with every note still inside the key-theme rule (nothing under 700ms above 300 Hz, nothing above C5 under 1200ms). ---- */
  {
    const E52 = AU49.KEY_EARN_FX, T52 = ['clear', 'pro', 'author'];
    const plans = await page.evaluate(async ts => { const A = await import('./audio.js'); return Object.fromEntries(ts.map(t => [t, A.Snd.keyEarnPlan(t)])); }, T52);
    const lenOf = t => Math.max(...plans[t].map(e => e[0] + e[3] / 1000));
    const layersOf = t => new Set(E52[t].notes.map(e => e[3] + e[4])).size;
    const climbs = T52.every((t, i) => !i || (E52[t].notes.length > E52[T52[i - 1]].notes.length && lenOf(t) > lenOf(T52[i - 1]) && layersOf(t) >= layersOf(T52[i - 1])));
    const rule = T52.every(t => plans[t].length && plans[t].every(e => !((e[1] >= 300 && e[3] < 700) || (e[1] > 523.3 && e[3] < 1200))));
    // and Pro really grew at build 52 rather than being called grander: it is at least half again the notes build 51 gave it (14)
    const grew = E52.pro.notes.length >= 21 && E52.author.notes.length >= 40;
    (climbs && rule && grew)
      ? ok(`v27 Aiden's answer to build 51: the three earn sounds climb by more than they did - ${T52.map(t => `${t} ${E52[t].notes.length} notes in ${layersOf(t)} layers over ${lenOf(t).toFixed(1)}s`).join(', ')} - the Pro key "even more epic" and the Author key "epic super duper", the biggest of the three, with every note still inside the key-theme rule`)
      : bad('v27 the earn sound escalation', JSON.stringify({ climbs, rule, grew, n: T52.map(t => E52[t].notes.length), len: T52.map(lenOf), layers: T52.map(layersOf) }));
  }

  /* ---- v29 (items 8 / 12, build 55): a skip silences the earn music, and AC() no longer resumes by itself ---- */
  {
    /* item 8: every note of KEY_EARN_FX was scheduled straight to a.destination in one pass with nothing keeping a handle, and
       Music.hush() only touches the music BED — so no code path could silence it. A tap-to-skip at 1.5s left up to 2.5s of it
       ringing over the settled key, and over Snd.chest('thorns') 250ms later. The gate spies on Snd.keyEarn, drives the Author
       key's earn, taps the skip and asks the handle the screen was holding whether it went quiet. */
    const skip55 = await page.evaluate(async () => { const A = await import('./audio.js'); const R = await import('./ui/router.js');
      const S = await import('./core/store.js'); const K = await import('./progress/key.js');
      const wait = t => new Promise(r => setTimeout(r, t));
      S.prefs.allOpen = true; S.prefs.chests = { games: 1, key: 1, pro: 1, thorns: 0 }; S.prefs.revealed = {}; S.prefs.snd = 'space';
      S.store.bars = {}; for (const c of K.COMBOS) for (const t of K.TIERS) S.store.bars[K.skey(c.key, t)] = 1;
      S.save();
      const orig = A.Snd.keyEarn; let h = null;
      A.Snd.keyEarn = function () { h = orig.apply(this, arguments); return h; };
      R.show('s-menu'); await wait(150); R.show('s-key', { tier: 2 }); await wait(1800);
      const before = h ? { ringing: !h.stopped(), g: h.gain() } : null;
      const host = document.getElementById('key-cere'); if (host) host.click();
      await wait(700);
      const after = h ? { stopped: h.stopped(), g: h.gain() } : null;
      A.Snd.keyEarn = orig; R.show('s-menu'); await wait(200);
      return { had: !!h, before, after }; });
    (skip55.had && skip55.before.ringing && skip55.after.stopped && skip55.after.g < .05)
      ? ok('item 8 a tap-to-skip silences the earn music — Snd.keyEarn hands back a handle on its own gain node and the skip cuts it, so nothing from it is still sounding over the chest that follows')
      : bad('item 8 the earn music outlives the skip', JSON.stringify(skip55));

    /* item 12: AC() fired a bare unawaited resume() on every call while the context was not running — the music loop calls it
       every 80ms and every tone() calls it, so an iOS interruption meant ~12 rejected promises a second, all of them bypassing
       revive()'s single-flight guard. Every resume goes through revive() now, which is F.2's rule. */
    const ac55 = await page.evaluate(async () => { const A = await import('./audio.js'); const a = A.AC(); if (!a) return { none: 1 };
      let n = 0; const real = a.resume.bind(a); a.resume = function () { n++; return real(); };
      const st0 = a.state; for (let i = 0; i < 12; i++) A.Snd.click();
      await new Promise(r => setTimeout(r, 250)); a.resume = real; return { n, st0, st1: a.state }; });
    (!ac55.none && (ac55.st0 === 'running' ? ac55.n === 0 : ac55.n <= 1))
      ? ok(`item 12 AC() no longer resumes by itself — twelve sounds through a ${ac55.st0} context asked for ${ac55.n} resume${ac55.n === 1 ? '' : 's'}; every one goes through revive()'s single-flight ladder (F.2)`)
      : bad('item 12 AC() still resumes on every call', JSON.stringify(ac55));
  }
}
