// build 61: part 5 of 6 of this section — split so the parts run in parallel; every part carries the same
// setup lines and prints under the same name, so --only still takes the whole section
// ---- 6e. the runs (v15 section 3), build 24 ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, fail, sleep, names, check, ok, bad, root, at, page, until, up, clearHeld, clearReady } from '../lib/gate.mjs';

export const SECTION = ["the runs (v15 section 3)"];

export async function run() {
  {
    const CS50 = await import(pathToFileURL(path.join(root, 'config', 'shapes.js')).href), G50 = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
    const TIERS50 = ['easy', 'medium', 'hard'];
    const d50 = await page.evaluate(async () => {
      const CS = await import('./config/shapes.js'); const DL = await import('./games/_shared/deal.js'); const SH = await import('./games/_shared/shapes.js');
      const out = { drawn: {}, deals: {}, gone: ['line', 'rects', 'hex', 'tri'].filter(s => SH.Shapes.has(s) || CS.SHAPES[s]) };
      // every shape: a drawing with a real outline, measured in its own 100-unit box
      for (const s of Object.keys(CS.SHAPES)) { const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100px';
        host.innerHTML = SH.Shapes.svg(s); document.body.appendChild(host); const b = host.querySelector('path').getBBox(); host.remove();
        out.drawn[s] = { w: Math.round(b.width), h: Math.round(b.height) }; }
      // 300 runs of every deal: each band's tiers against its mix, the setting against load − shape, the pool, and repeats
      for (const key of Object.keys(CS.DEALS)) { const D = CS.DEALS[key], end = D.bands[D.bands.length - 1].to;
        const o = { mixOff: 0, pairOff: 0, outOfPool: 0, repeat: 0, cache: 0, streakOff: 0, seen: {} };
        for (let run = 0; run < 300; run++) { const dl = DL.makeDealer(key); const got = D.bands.map(() => ({})); let prev = '', tail = {};
          for (let k = 1; k <= end + 6; k++) { const S = dl.at(k), bi = D.bands.indexOf(S.band);
            if (k <= end) got[bi][S.tier] = (got[bi][S.tier] || 0) + 1; else tail[S.tier] = (tail[S.tier] || 0) + 1;
            if (S.set !== DL.setTier(S.band, S.tier)) o.pairOff++;
            if (!DL.poolAt(D, k).includes(S.shape) || CS.SHAPES[S.shape].tier !== S.tier) o.outOfPool++;
            if (S.shape === prev) o.repeat++; prev = S.shape; o.seen[S.shape] = (o.seen[S.shape] || 0) + 1;
            if (dl.at(k) !== S) o.cache++; }
          D.bands.forEach((b, i) => { for (const t of ['easy', 'medium', 'hard']) if ((got[i][t] || 0) !== (b.mix[t] || 0)) o.mixOff++; });
          // a Streak past the last band deals the last band again — six rounds of a band that is N long hold its mix in whole decks
          const lb = D.bands[D.bands.length - 1], len = end - (D.bands.length > 1 ? D.bands[D.bands.length - 2].to : 0);
          if (6 % len === 0) for (const t of ['easy', 'medium', 'hard']) if ((tail[t] || 0) !== (lb.mix[t] || 0) * 6 / len) o.streakOff++; }
        out.deals[key] = o; }
      return out; });
    // the list and the bands, as data
    const pools50 = Object.fromEntries(Object.entries(CS50.DEALS).map(([k, D]) => [k, D.bands.map((b, i) => { const p = D.pool.slice(); for (const x of D.bands.slice(0, i + 1)) (x.add || []).forEach(s => { if (!p.includes(s)) p.push(s); }); return p; })]));
    const untagged = Object.entries(CS50.SHAPES).filter(([, v]) => !TIERS50.includes(v.tier) || !v.word).map(([k]) => k);
    const unknown = Object.values(pools50).flat(2).filter(s => !CS50.SHAPES[s]);
    const undrawn = Object.entries(d50.drawn).filter(([, b]) => Math.max(b.w, b.h) < 95).map(([k]) => k);
    const badBands = Object.entries(CS50.DEALS).flatMap(([k, D]) => D.bands.map((b, i) => { const len = b.to - (i ? D.bands[i - 1].to : 0), sum = Object.values(b.mix).reduce((a, c) => a + c, 0);
      const noShape = Object.keys(b.mix).filter(t => !pools50[k][i].some(s => CS50.SHAPES[s].tier === t));
      return (sum !== len || noShape.length || !TIERS50.every(t => D.tiers[t] !== undefined)) ? `${k} band ${i + 1}: ${sum} of ${len}${noShape.length ? ', no ' + noShape.join('/') + ' shape' : ''}` : ''; })).filter(Boolean);
    (!untagged.length && !unknown.length && !undrawn.length && !badBands.length && !d50.gone.length)
      ? ok(`v26 §B2 / A9 one shape list: ${Object.keys(CS50.SHAPES).length} shapes each tagged once (${TIERS50.map(t => Object.values(CS50.SHAPES).filter(v => v.tier === t).length + ' ' + t).join(', ')}) and each drawn by the one geometry; every pool shape is on it; every band's mix fills its rounds from shapes of the tiers it names; line, rects, hexagon and "tri" are gone`)
      : bad('v26 §B2 / A9 the shape list', JSON.stringify({ untagged, unknown, undrawn, badBands, gone: d50.gone }));
    const dealBad = Object.entries(d50.deals).filter(([, o]) => o.mixOff || o.pairOff || o.outOfPool || o.repeat || o.cache || o.streakOff);
    (!dealBad.length)
      ? ok(`v26 §B2 / A9 300 runs of each of the ${Object.keys(d50.deals).length} deals: every band deals exactly its mix, every setting is the band's load minus the shape's tier, every shape is from its band's pool and tier, none twice running, a Streak deals the last band in whole decks, and asking for a turn again is the same deal (the pass & play rule)`)
      : bad('v26 §B2 / A9 the dealer', JSON.stringify(Object.fromEntries(dealBad.map(([k, o]) => [k, { ...o, seen: undefined }]))));
    // the per-game notes, as data
    const grow50 = pools50['hold:grow'].at(-1), nogo50 = pools50['reaction:nogo'].at(-1), count50 = pools50['spot:count'], find50 = pools50['spot:find'];
    const dia = d50.drawn.diamond, RXT = CS50.NOGO_TURNS;
    const notes50 = {
      grow: ['spiral', 'heart', 'cat'].every(s => grow50.includes(s)) && !grow50.includes('line') && !grow50.includes('rects'),
      cut: CS50.DEALS['hold:cut'].tiers.easy.includes(50) && Object.values(CS50.DEALS['hold:cut'].tiers).flat().every(v => v % 5 === 0),
      nogo: ['spiral', 'crescent', 'plus', 'bar', 'ring'].every(s => nogo50.includes(s)) && !nogo50.includes('hex') && !RXT.square && dia.h > dia.w * 1.4,
      count: count50[0].length === 3 && ['bar', 'plus', 'star'].every(s => count50[1].includes(s)),
      find: find50.every((p, i) => !i || p.length > find50[i - 1].length) };
    Object.values(notes50).every(Boolean)
      ? ok(`v26 §B2 the round formats as data: Grow adds spiral, heart and cat and drops line and rects; Cut can ask 50%; Go / No-go deals ${nogo50.length} shapes with no hexagon and no turned square, the diamond ${dia.w}×${dia.h}; Count adds bar, plus and star from round 3; Find's pool grows every band (${find50.map(p => p.length).join(' → ')})`)
      : bad('v26 §B2 the round formats', JSON.stringify(notes50));
    // each engine's own dealing code, called for real on the page: the setting it plays is the tier the dealer paired
    const e50 = await page.evaluate(async () => {
      const CS = await import('./config/shapes.js'); const DL = await import('./games/_shared/deal.js'); const G = await import('./config/games.js');
      const HD = (await import('./games/estimate/index.js')).default, RX = (await import('./games/reaction/index.js')).default, SP = (await import('./games/spot/index.js')).default;
      const out = { cut: { off: 0, fiftySym: 0, fifty: 0, n: 0 }, grow: { off: 0, sameOff: 0, n: 0, p2same: null, p1diff: null }, nogo: { off: 0, n: 0, sameTurn: null }, count: { off: 0, n: 0, spikes: 0, badSpike: 0 }, find: { off: 0 }, flash: null };
      const keep = { ctx: HD.ctx, two: HD.two, hud: HD.hud, hint: HD.hint, icon: HD.icon, later: HD.later, bg: HD.bg, shareUp: HD.shareUp };
      HD.hud = HD.hint = HD.icon = HD.later = HD.bg = HD.shareUp = () => {};
      // Cut: HD.cutRound() itself, 300 runs of ten rounds
      HD.ctx = { mode: 'cut', len: 10 }; HD.two = { on: false };
      for (let run = 0; run < 300; run++) { HD.dealer = DL.makeDealer('hold:cut');
        for (let k = 1; k <= 10; k++) { HD.round = k; HD.cutRound(); const S = HD.spec; out.cut.n++;
          if (!CS.DEALS['hold:cut'].tiers[S.set].includes(HD.share)) out.cut.off++;
          if (HD.share === 50) { out.cut.fifty++; if (CS.SHAPES[S.shape].sym) out.cut.fiftySym++; } } }
      // Grow: the target's size sits in its setting's third of that shape's range, and odd turns grow the same shape, even a different one
      HD.ctx = { mode: 'grow', len: 7 };
      for (let run = 0; run < 200; run++) { HD.dealer = DL.makeDealer('hold:grow');
        for (let k = 1; k <= 7; k++) { HD.round = k; HD.shape = HD.pickTarget(); const S = HD.spec, t = HD.growTarget(), E = G.ESTIMATE;
          const lo = Math.max(E.TMIN, Math.min(E.TMAX, Math.sqrt(E.MIN_AREA / HD.shape.coef))), f = (t - lo) / (E.TMAX - lo), r = CS.DEALS['hold:grow'].tiers[S.set];
          if (f < r[0] - 1e-9 || f > r[1] + 1e-9) out.grow.off++;
          const mine = HD.pickMine(); if ((k % 2 === 1) !== (mine.name === HD.shape.name)) out.grow.sameOff++; out.grow.n++; } }
      // pass & play: Player 2's first turn grows the same shape, Player 1's second a different one — each counts their own turns
      HD.dealer = DL.makeDealer('hold:grow'); HD.round = 2; HD.two = { on: true, p: 1, taken: [1, 0] }; out.grow.p2same = !HD.est();
      HD.round = 3; HD.two = { on: true, p: 0, taken: [1, 1] }; out.grow.p1diff = HD.est();
      Object.assign(HD, keep);
      // Go / No-go: the dwell is inside its setting's third, and both players' turn 1 is the same go shape
      RX.ctx = { mode: 'nogo', len: 5 }; RX.two = { on: false };
      for (let run = 0; run < 200; run++) { RX.dealer = null;
        for (let k = 1; k <= 5; k++) { RX.round = k; RX.rule = RX.nextTarget(); const S = RX.spec, W = RX.NOGO_DWELL, r = CS.DEALS['reaction:nogo'].tiers[S.set];
          const ms = RX.dwellMs(); out.nogo.n++; if (ms < Math.floor(W.set + r[0] * W.spread) || ms > Math.ceil(W.set + r[1] * W.spread)) out.nogo.off++; } }
      RX.dealer = null; RX.two = { on: true, p: 0, taken: [0, 0] }; const a = RX.nextTarget(); RX.two = { on: true, p: 1, taken: [1, 0] }; const b = RX.nextTarget();
      out.nogo.sameTurn = a === b; RX.ctx = null; RX.two = { on: false }; RX.dealer = null; RX.spec = null;
      // Count: the target count sits in its setting's third of the band (a dip deals the floor); the flash gains flashRound a round
      const DC = DL.makeDealer('spot:count');
      /* AMENDED at build 60 (v31 60.16): a round may now be a SPIKE — 12-13 targets, only from SPOT_RAMP.spikeFrom — which is
         outside its setting's third by design. The rule is not loosened: every ORDINARY round is still inside its third, and a
         spike is counted separately and has to be inside its own two numbers and never before its round. */
      const SR60 = G.SPOT_RAMP;
      for (let k = 1; k <= 14; k++) { const S = DC.at(k); for (let i = 0; i < 40; i++) { const R = SP.ramp(k, undefined, { ...S, u: Math.random() }), t = CS.DEALS['spot:count'].tiers[S.set];
        out.count.n++;
        if (R.spike) { out.count.spikes++;
          if (k < SR60.spikeFrom || R.n < SR60.spikeLo || R.n > SR60.spikeHi) out.count.badSpike++; continue; }
        const want = R.dip ? [R.lo, R.lo] : [R.lo + Math.round(t[0] * (R.hi - R.lo)), R.lo + Math.round(t[1] * (R.hi - R.lo))];
        if (R.n < want[0] || R.n > want[1]) out.count.off++; } }
      { const R = G.SPOT_RAMP, x = SP.ramp(10, 0), crowd = Math.min(R.flashCap, R.flashBase + R.flashShape * Math.max(0, x.n + x.decoys - R.flashFree));
        out.flash = { r1: SP.ramp(1, 0).flash, r10: x.flash, crowd, extra: x.flash - crowd, want: R.flashRound * (10 - R.flashRoundFrom + 1) }; }
      // Find: the crowd is the round's count times its setting's factor
      for (let k = 1; k <= 11; k++) for (const set of ['easy', 'medium', 'hard']) { const base = SP.findSpec(k).n, n = SP.findSpec(k, { set }).n;
        if (n !== Math.round(base * CS.DEALS['spot:find'].tiers[set])) out.find.off++; }
      return out; });
    (!e50.cut.off && !e50.cut.fiftySym && e50.cut.fifty > 0)
      ? ok(`v26 §B2 Estimate · Cut's own cutRound(), ${e50.cut.n} rounds: every share is from its setting's tier, 50% was asked ${e50.cut.fifty} times and never of a shape with an axis of symmetry`)
      : bad('v26 §B2 Cut deals its shares by the standard', JSON.stringify(e50.cut));
    (!e50.grow.off && !e50.grow.sameOff && e50.grow.p2same && e50.grow.p1diff)
      ? ok(`v26 §B2 Estimate · Grow's own pickTarget / growTarget / pickMine, ${e50.grow.n} rounds: every target's size is in its setting's third, rounds 1, 3, 5, 7 grow the same shape and 2, 4, 6 a different one — and in pass & play each player counts their own turns`)
      : bad('v26 §B2 Grow deals by the standard', JSON.stringify(e50.grow));
    (!e50.nogo.off && e50.nogo.sameTurn)
      ? ok(`v26 §B2 Go / No-go's own nextTarget / dwellMs, ${e50.nogo.n} rounds: every dwell is inside its setting's third of ± spread, and both players' turn 1 is the same go shape`)
      : bad('v26 §B2 Go / No-go deals by the standard', JSON.stringify(e50.nogo));
    (!e50.count.off && !e50.count.badSpike && e50.count.spikes > 0 && e50.flash.extra === e50.flash.want && e50.flash.r10 > e50.flash.r1 && !e50.find.off)
      ? ok(`v26 §B2 / v31 60.16 Spot: Count's own ramp() deals ${e50.count.n - e50.count.spikes} ordinary target counts inside their setting's third and ${e50.count.spikes} SPIKES, every one of them 12-13 and none before round 10; a round-10 flash is ${e50.flash.extra}ms longer than its crowd alone (${e50.flash.r10}ms), and Find's crowd is its round's count × the setting's factor`)
      : bad('v26 §B2 Spot deals by the standard', JSON.stringify({ count: e50.count, flash: e50.flash, find: e50.find }));
    // live: a Go / No-go beat and a Find crowd are the shared drawing on screen, and a Hidden Streak turns its wall 45° while a Set never does
    const live50 = await page.evaluate(async () => {
      const RUN = await import('./run/run.js'); const ST = await import('./core/state.js'); const G = await import('./config/games.js'); const SS = await import('./core/store.js');
      for (const k of ['reaction', 'spot', 'timing', 'reaction:nogo', 'spot:find', 'timing:hidden']) SS.store.intro[k] = Date.now(); SS.save();
      const RX = (await import('./games/reaction/index.js')).default, SP = (await import('./games/spot/index.js')).default, TM = (await import('./games/timing/index.js')).default;
      const wait = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = f(); if (v) return v; await new Promise(r => setTimeout(r, 60)); } return null; };
      const go = sel => { Object.assign(ST.sel, { vs: 0, practice: 0 }, sel); RUN.start(); };
      const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
      const out = {};
      go({ game: 'reaction', diff: 'nogo', secs: 5 });
      out.bar = box(await wait(() => document.querySelector('#rxbar i.shp svg path')));
      out.beat = box(await wait(() => document.querySelector('#rxpane .rxshape svg path')));
      out.beatShape = RX.shown; RUN.abort(); await new Promise(r => setTimeout(r, 400));
      go({ game: 'spot', diff: 'find', secs: 10 });
      await wait(() => SP.st === 'find'); const fs = [...document.querySelectorAll('#gen .fs')];
      out.find = { n: fs.length, drawn: fs.filter(e => { const p = e.querySelector('svg path'); return p && p.getBoundingClientRect().width > 4; }).length, odd: fs.filter(e => e.classList.contains(SP.odd)).length };
      RUN.abort(); await new Promise(r => setTimeout(r, 400));
      /* AMENDED at build 60 (v31 60.11, Aiden's call of 2026-09-23): the angled wall's share is a RAMP now — 0 until round 6,
         rising to HIDDEN.diag by round 14 — so forcing HIDDEN.diag to 1 no longer turns round 1. The assertion is not loosened:
         it still demands that EVERY Streak round it samples is turned, and it samples them at round 14 and up, which is where
         the ramp says every round should be. `at` is the round to deal, and a Set still refuses to turn at any round. */
      const was = G.HIDDEN.diag; G.HIDDEN.diag = 1;
      const hid = async (secs, at) => { TM.ball = null; document.getElementById('gen').innerHTML = ''; go({ game: 'timing', diff: 'hidden', secs });
        if (at) { await wait(() => TM.st === 'run' || TM.st === 'arm'); TM.clearT(); TM.round = at; TM.st = 'arm'; TM.hidden(); }
        if (!(await wait(() => TM.st === 'run' && TM.ball && document.getElementById('tmwall')))) { RUN.abort(); await new Promise(res => setTimeout(res, 400)); return { never: 1 }; }
        const b = TM.ball, s = b.size, f = document.getElementById('gen').getBoundingClientRect(), c = t => { const p = b.pos(t); return [p.x + s / 2, p.y + s / 2]; };
        const u = b.diag === undefined ? null : [Math.cos(b.diag * Math.PI / 180), Math.sin(b.diag * Math.PI / 180)];
        const w = c(b.wall), m = c(b.markT), end = c(b.markT + (b.markT - b.wall));
        const r = { diag: b.diag, tilt: b.tilt, markAhead: u ? (m[0] - w[0]) * u[0] + (m[1] - w[1]) * u[1] > 0 : null,
          inField: [c(b.wall), m].every(([x, y]) => x >= 0 && x <= f.width && y >= 0 && y <= f.height), wall: getComputedStyle(document.getElementById('tmwall')).transform };
        RUN.abort(); await new Promise(res => setTimeout(res, 400)); return r; };
      out.streak = []; for (let i = 0; i < 4; i++) out.streak.push(await hid(-1, 14 + i));
      out.set = await hid(10);
      G.HIDDEN.diag = was; return out; });
    const diagOk = live50.streak.every(r => [45, 135, 225, 315].includes(r.diag) && Math.abs(r.tilt) <= G50.HIDDEN.diagTilt && r.markAhead && r.inField && r.wall !== 'none') && live50.set.diag === undefined && live50.set.wall === 'none';
    /* v29 (build 55): `beat.w > 40` assumed the dealt beat shape is a WIDE one. `bar` is 29x132 — tall and thin — so this
       failed on the third full run of build 55 and passed on the first two, on nothing but which shape the dealer handed it.
       What it means is that the beat shape is drawn at a real size, so it measures the larger side and not the width. */
    (live50.bar && live50.bar.w > 8 && live50.beat && Math.max(live50.beat.w, live50.beat.h) > 40 && live50.find.n > 10 && live50.find.drawn === live50.find.n && live50.find.odd === 1 && diagOk)
      ? ok(`v26 §B2 on screen: the rule bar and a Go / No-go beat (${live50.beatShape}) are the shared svg, all ${live50.find.n} shapes of a Find crowd are drawn with one odd one, and a Hidden Streak turned its wall to ${live50.streak.map(r => r.diag + '°').join(', ')} with the ball within ${Math.max(...live50.streak.map(r => Math.abs(r.tilt)))}° of square and the marker behind it — a Set never did (#450)`)
      : bad('v26 §B2 the shapes and the 45° wall on screen', JSON.stringify(live50));

    /* ---- v31 (60.2, build 60): EVERY SHAPE IS PAINTED, IN EVERY STATE A GAME PUTS IT IN ----
       Aiden played Find, was asked for the RING and could not see one anywhere. Cowork's guess was that the crowd's recolouring
       sets `fill` only, so a stroke-only shape gets no colour. It is not that: NOTHING in config/shapes.js is stroke-only — every
       shape is one filled path with `fill-rule:evenodd`, which is how a ring's hole and a spiral's turns are drawn — so a shape
       was never left uncoloured. What was left behind was a STROKE: `.fs.bad` set the fill alone, so an odd shape tapped in error
       wore its green (or the other player's red or blue, L4) ring round a red fill.
       This is the check the item asks for and it is stronger than the item's wording: every shape in SHAPES, in every state a game
       puts a crowd shape in — plain, dim, bad, odd, odd.p1, odd.p2, odd.bad — with the fill and stroke each resolved to real paint,
       both against the ground, and a path with real area. It fails on a shape drawn in the ground colour, at zero alpha, or with a
       recolour that moved the fill and left the stroke. (What Aiden actually saw is 60.3: the target was buried under a decoy, and
       a ring whose hole is filled in by the shape behind it is a disc.) */
    const paint60 = await page.evaluate(async () => {
      const { Shapes } = await import('./games/_shared/shapes.js');
      const { SHAPES } = await import('./config/shapes.js');
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(host);
      const rgba = s => { const m = (String(s).match(/[\d.]+/g) || []).map(Number); return m.length >= 3 ? { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 } : null; };
      const near = (a, b) => a && b && Math.abs(a.r - b.r) < 12 && Math.abs(a.g - b.g) < 12 && Math.abs(a.b - b.b) < 12;
      const ground = rgba(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      const STATES = ['', 'dim', 'bad', 'odd', 'odd p1', 'odd p2', 'odd bad'];
      const out = [];
      for (const name of Object.keys(SHAPES)) for (const st of STATES) {
        const i = document.createElement('i'); i.className = ('fs ' + name + ' ' + st).trim();
        i.style.cssText = 'position:relative;--fsz:40px'; i.innerHTML = Shapes.svg(name); host.appendChild(i);
        const p = i.querySelector('path'), cs = getComputedStyle(p), box = p.getBBox();
        const fill = rgba(cs.fill), stroke = cs.stroke === 'none' ? null : rgba(cs.stroke);
        const bad = [];
        if (!fill || !fill.a || near(fill, ground)) bad.push('fill ' + cs.fill);
        // a stroke is optional; one that EXISTS has to be paint, and on `bad` it has to have followed the fill
        if (stroke && (!stroke.a || near(stroke, ground))) bad.push('stroke ' + cs.stroke);
        if (st.includes('bad') && stroke && !near(stroke, fill)) bad.push('bad left the stroke at ' + cs.stroke + ' over a ' + cs.fill + ' fill');
        if (!(box.width > 1 && box.height > 1)) bad.push('no area');
        if (getComputedStyle(i).opacity === '0') bad.push('opacity 0');
        if (bad.length) out.push({ shape: name, state: st || 'plain', why: bad.join(', ') });
        host.removeChild(i);
      }
      host.remove();
      return { n: Object.keys(SHAPES).length, states: STATES.length, bad: out }; });
    paint60.bad.length === 0
      ? ok(`60.2 every one of the ${paint60.n} shapes in config/shapes.js is painted in all ${paint60.states} states a crowd puts it in — plain, dim, bad, odd and odd in each player's colour — with a fill that is not the ground, a real drawn area, and a recolour that takes the STROKE with it (${paint60.n * paint60.states} combinations)`)
      : bad('60.2 a shape comes out invisible', JSON.stringify(paint60.bad.slice(0, 8)));

    /* ---- v31 (60.3, build 60): THE FIND TARGET IS NEVER OVERLAPPED — AT THE DEAL AND WHILE THE CROWD DRIFTS ----
       `pile()` (F.7, build 44) could move the target onto a decoy or drop a decoy on the target, and the target is dealt at index
       0 so every shape that touches it paints OVER it. Measured before the fix over 57 dealt rounds: 28 targets under 90% visible
       and several at 0%. The item's own test: deal many rounds, including during motion, and fail on a target less than about 90%
       visible. Decoy-on-decoy piles are NOT under test — they are build 44's ask and they stay. */
    const findVis = () => page.evaluate(() => { const S = window.__sp60; if (!S || !S.pts) return null;
      const box = q => { const s = q.sz || S.size; return { x0: q.x, y0: q.y, x1: q.x + s, y1: q.y + s, a: s * s }; };
      const B = S.pts.map(box);
      const over = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
      const vis = i => { let sum = 0; for (let j = i + 1; j < B.length; j++) sum += over(B[i], B[j]); return Math.max(0, 1 - Math.min(1, sum / B[i].a)); };
      const ti = S.pts.findIndex(q => q.shape === S.odd);
      return { odd: S.odd, n: B.length, target: Math.round(vis(ti) * 100),
        decoyBuried: S.pts.filter((_, i) => i !== ti && vis(i) < .9).length }; });
    const find60 = await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'); SS.store.intro['spot'] = SS.store.intro['spot:find'] = Date.now(); SS.save();
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'spot', diff: 'find', secs: 10 }); RUN.start();
      await new Promise(r => setTimeout(r, 200));
      window.__sp60 = (await import('./games/spot/index.js')).default; return !!window.__sp60; });
    const vis60 = [];
    if (find60) {
      // 20 deals across both Find runs' whole band range, measured the instant they are dealt
      for (let pass = 0; pass < 2; pass++) for (let r = 1; r <= 10; r++) {
        await page.evaluate(n => { const S = window.__sp60; S.clearT(); S.round = n; S.findRound(); }, r);
        const v = await findVis(); if (v) { v.round = r; vis60.push(v); }
      }
      // and three rounds driven all the way through 2.5s of real drift, which is where the keep-out has to hold
      for (const r of [4, 7, 10]) {
        await page.evaluate(n => { const S = window.__sp60; S.clearT(); S.round = n; S.findRound(); }, r);
        await sleep(1500 + 2500);
        const v = await findVis(); if (v) { v.round = r; v.moving = 1; vis60.push(v); }
      }
      await page.evaluate(async () => (await import('./run/run.js')).abort()); await sleep(300);
    }
    /* ---- v31 (60.7, build 60, L6): AND THE ENGINE ACTUALLY COUNTS THE TIMED-OUT ROUNDS ----
       The predicate above is only half of it: it is worth nothing unless a real Flash Set that nobody taps comes back with
       `noTap` set. This plays one — five rounds, no input at all — and reads the record the engine hands the run. */
    await page.evaluate(async () => { const RUN = await import('./run/run.js'), ST = await import('./core/state.js');
      const SS = await import('./core/store.js'); SS.store.intro['reaction'] = SS.store.intro['reaction:flash'] = Date.now(); SS.save();
      Object.assign(ST.sel, { vs: 0, practice: 0, game: 'reaction', diff: 'flash', secs: 5 }); RUN.start(); });
    // five rounds, never tapping the FLASH — only the held card between rounds, which is what clearHeld does everywhere else
    for (let i = 0; i < 90; i++) { const n = await page.evaluate(async () => (await import('./games/reaction/index.js')).default.times.length);
      if (n >= 5) break; await clearReady('reaction'); await clearHeld('reaction'); await sleep(250); }
    const nt60 = await page.evaluate(async () => { const RX = (await import('./games/reaction/index.js')).default;
      const out = { res: RX.result(), times: RX.times.slice() }; (await import('./run/run.js')).abort(); return out; });
    await sleep(300);
    (nt60.res && nt60.res.noTap >= 3 && nt60.res.hits > 500)
      ? ok(`60.7 a Flash Set nobody taps comes back with noTap=${nt60.res.noTap} of ${nt60.times.length} rounds and an average of ${nt60.res.hits}ms — over 500, and disqualified by the line above, which is the whole point: the run scores normally and only the unlock reads the count`)
      : bad('60.7 the engine does not count timed-out rounds', JSON.stringify(nt60));

    const vBad = vis60.filter(v => v.target < 90);
    (vis60.length >= 20 && vBad.length === 0 && vis60.some(v => v.moving) && vis60.some(v => v.decoyBuried > 0))
      ? ok(`60.3 the Find target is never overlapped — ${vis60.length} rounds dealt across every band (${vis60.filter(v => v.moving).length} of them measured after 2.5s of drift), worst target ${Math.min(...vis60.map(v => v.target))}% visible, none under 90%; decoy-on-decoy piles are untouched (build 44's F.7 — up to ${Math.max(...vis60.map(v => v.decoyBuried))} decoys under 90% in a round)`)
      : bad('60.3 the Find target is overlapped', JSON.stringify({ rounds: vis60.length, under90: vBad.slice(0, 6), moving: vis60.filter(v => v.moving) }));
  }
  /* ---- v29 (items 2 / 3 / 4 / 9 / 14, build 55): the quit path, the stale state, the sleeping phone ----
     Four of the build-54 review's findings meet on the same few lines of run/run.js, so they are driven together. */
}
