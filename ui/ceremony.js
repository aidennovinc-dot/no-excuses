/* No Excuses — the four chest opening ceremonies (v23 §L.6 / §L.10d, build 41). PRESENTATION ONLY (L10): by the time a ceremony plays the
   chest is already opened and its tier credited (progress/key.js openChest), so nothing here can change what opened or what banked.

   DATA-DRIVEN (A2). Each ceremony is CEREMONY in config/chests.js — a length and a list of NAMED steps, each with its own start and length.
   This file knows how to DRAW a step by its name and nothing else: every layer is drawn at the start, and every time is a custom property
   (`--st-<step>-at`, `--st-<step>-ms`) the stylesheet's animations read, so a timing is a number edit and the gate holds the names to L.6.
   The effects and the sting are config/audio.js, scheduled in one call to Snd.chest() on the audio clock.

   v25 (items 6 / 22, build 46): THE CLOCK, THE TAP AND THE HAND-OVER MOVED TO ui/reveal.js — the one shared reveal chests and keys both run
   through. What is left here is the drawing and its times: chestStage(id, o) below. Still not skippable, still hushed, still holding on "tap
   to continue" and still ending on the meter's D.4 count-up — one routine does all four now, for a key as well as for a chest.

   frame() draws the same stage paused at a fraction of its length and plays nothing — the review catalogue's frames (L.10d / L.11e). It
   lives here so the catalogue cannot photograph a ceremony the app does not play. */
import { CEREMONY, CEREMONY_FX, CHESTS, COVER_LOOK, GAUNTLETS, SYMBOLS } from "../config/chests.js";
import { GRID, KEY } from "../config/copy.js";
import { KEY_ART } from "../config/keys.js";
import { Snd } from "../audio.js";
import { T, esc } from "../core.js";
import { countUp } from "../core/count.js";
import { COMBOS } from "../progress/key.js";
import { chestCol, chestSvg, meterLook } from "./chest.js";
import { meterPct } from "../progress/key.js";

const f1 = v => (+v).toFixed(1);
// which named step lifts each chest's lid: its own `lid` step, or the moment the Pro chest bursts and the Thorns reveal widens
// v28 (item 13, build 53): every chest lifts its lid on its own `lid` step now — the Pro chest's burst and the Thorns widen are retired
const LID_STEP = { games: 'lid', key: 'lid', pro: 'lid', thorns: 'lid' };
const stepOf = (id, name) => (CEREMONY[id].steps || []).find(s => s.name === name) || null;
// the times, as custom properties. Nothing below writes a literal duration
function stageVars(id) { const c = CEREMONY[id];
  // --cc is the chest's own colour — the cracks, the burst, the spikes and the split wear it, so the stylesheet names none.
  // v27 (item 13): that colour is the KEY'S, through ui/chest.js chestCol (R2), not the meter band's
  const v = [`--cms:${c.ms}ms`, `--reveal-at:${c.ms - CEREMONY_FX.meterMs}ms`, `--cc:${chestCol(id)}`];
  for (const s of c.steps) v.push(`--st-${s.name}-at:${s.at}ms`, `--st-${s.name}-ms:${s.ms}ms`);
  const lid = stepOf(id, LID_STEP[id]); v.push(`--lid-at:${lid ? lid.at : 0}ms`);
  const ux = stepOf(id, 'uncross'); if (ux) v.push(`--ux-step:${Math.round(ux.ms / 8)}ms`);
  const as = stepOf(id, 'assemble'); if (as) v.push(`--bar-step:${Math.round(as.ms * .55 / Math.max(1, COMBOS.length))}ms`);
  const cr = stepOf(id, 'crack'); if (cr) v.push(`--crack-step:${Math.round(cr.ms / 8)}ms`);
  return v.join(';'); }

/* ---------- the layers, by step name. Behind the chest, then the chest, then in front of it; stage units are a 300 × 520 box ---------- */
/* v28 (item 13, build 53): the Games chest is the one that BURSTS — the burst circle moved here from the Pro chest — and the three key
   chests share one beam, each in its own `--cc`, because all three now open the same way (assemble · turn · lid · spill). */
/* v29 (item 5, build 54): and the AUTHOR chest draws its own two layers UNDER that beam — the black wash that swallows the stage on `black`,
   and the white panel that splits and widens out of the middle on `widen`. Both are behind the chest, so the lid still lifts in front of them. */
/* v29 Section A (57.8, build 57): AND THE COVER, which is the first beat of every chest a key opens. `--cc` is the key's own colour, so each cover
   is drawn in its key's language and this file names none of them:
     key     the ground closing over the stage, seven paper lanterns rising and flickering through it, and a disc of light irising open
     pro     black, eight right-angled traces drawing in from all four edges with a square node lighting at each inner end, then powering down
     thorns  build 52's own two layers, unchanged — the black wash and the white panel that splits and widens
   The Author chest needs nothing new: its cover IS `black` / `spikes` / `split` / `widen` / `recede`, restored to the FRONT of the ceremony. */
function coverArt(id) {
  if (id === 'key') { const n = (COVER_LOOK.key || {}).lanterns || 7, out = [];
    for (let i = 0; i < n; i++) { const x = 26 + Math.round(i * 248 / Math.max(1, n - 1)), y = 372 - (i % 3) * 44, r = 8 + (i % 4) * 3;
      out.push(`<g class="clan" style="--i:${i};--rise:${300 + (i % 3) * 70}px"><circle class="clang" cx="${x}" cy="${y}" r="${(r * 2.6).toFixed(1)}"></circle><circle class="clanb" cx="${x}" cy="${y}" r="${r}"></circle></g>`); }
    return out.join('') + '<circle class="ciris" cx="150" cy="300" r="14"></circle>'; }
  if (id === 'pro') { const n = (COVER_LOOK.pro || {}).traces || 8;
    // right-angled runs in from each edge, two a side, each ending on a ring round the middle — the Pro chest's own traces, at stage scale
    const RUN = [['M0 120H90V250H126', 126, 250], ['M300 120H210V250H174', 174, 250], ['M70 0V70H150V232', 150, 232], ['M230 520V450H150V368', 150, 368],
      ['M0 430H60V340H120', 120, 340], ['M300 430H240V340H180', 180, 340], ['M230 0V60H196V244', 196, 244], ['M70 520V460H104V356', 104, 356]];
    return RUN.slice(0, n).map(([d, nx, ny], i) => `<path class="ctrace" pathLength="1" d="${d}" style="--i:${i}"></path>`
      + `<rect class="cnode" x="${nx - 3}" y="${ny - 3}" width="6" height="6" style="--i:${i}"></rect>`).join('')
      + '<circle class="ciris" cx="150" cy="300" r="14"></circle>'; }
  return ''; }
function behind(id) {
  if (id === 'games') return '<circle class="cglow" cx="150" cy="300" r="80"></circle><circle class="cburst" cx="150" cy="300" r="20"></circle>';
  const thorn = id === 'thorns' ? '<rect class="cblack" x="-60" y="-60" width="420" height="640"></rect><rect class="cwide" x="40" y="0" width="220" height="520"></rect>' : '';
  // the cover's own ground goes UNDER its shapes and over nothing else: the chest is hidden by the stylesheet, not by this rect
  const cov = id === 'thorns' ? '' : '<rect class="ccovbg" x="-60" y="-60" width="420" height="640"></rect>' + coverArt(id);
  return thorn + cov + '<defs><linearGradient id="cbeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>'
    + '<polygon class="cbeam" points="122,300 178,300 270,0 30,0"></polygon>'; }
// which key opens a chest — the tier whose glyph and colour its ceremony is drawn in (item 13). The Games chest has none
const tierOfChest = id => { const c = CHESTS.find(x => x.id === id); return c && c.needs !== 'modes' ? c.needs : null; };
/* 58.2: the glove that opens this chest, or nothing. It sits low and to the left of the key glyph so it reads as a hand holding it,
   and it is stroked in the chest's own `--cc` with the key, because the two are one object for the length of the turn. */
/* v30 (59.16, build 59): the glove is its OWN group inside the key's, so it can enter, grip and then travel with the key rather
   than arriving already attached to it. `chandg` is what moves on `enter` and `grip`; `chand` is the drawing, untouched. */
function handHtml(id) { const c = CHESTS.find(x => x.id === id);
  if (!c || !c.gaunt) return '';
  const g = GAUNTLETS.find(x => x.id === c.gaunt), sym = g && SYMBOLS[g.sym];
  if (!sym || !sym.p) return '';
  return `<g class="chandg"><g class="chand" transform="translate(101 166) scale(2)">${sym.p.map(d => `<path d="${d}"></path>`).join('')}</g></g>`; }
function inFront(id) { const out = [];
  // Games · uncross: the seven locked tiles, each struck through, the strikes wiping off one by one; path: the line down to the chest
  if (id === 'games') { for (let i = 0; i < 7; i++) { const x = 150 + (i - 3) * 34 - 11;
      out.push(`<rect class="ctile" x="${x}" y="110" width="22" height="22" style="--i:${i}"></rect><path class="cx" pathLength="1" d="M${x - 3} 107L${x + 25} 135" style="--i:${i}"></path>`); }
    out.push('<path class="cpath" pathLength="1" d="M150 140V254"></path>'); }
  /* v28 (item 13, build 53): EVERY KEY CHEST, not just the Skill one — assemble: one bar per combination flies in to ring that key's bow;
     turn: the key drops into the lock and turns. The glyph is the key that OPENS this chest (KEY_ART, the Keys screen's own paths) and it is
     stroked in `--cc`, which is that key's colour (R2), so Pro opens in Circuit blue and Author in white with nothing else added. */
  const tier = tierOfChest(id);
  if (tier) { const n = COMBOS.length, bars = [];
    for (let i = 0; i < n; i++) { const a = i * (360 / n) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), far = 170 + (i % 4) * 22;
      bars.push(`<line class="cbar" x1="${f1(150 + c * 30)}" y1="${f1(170 + s * 30)}" x2="${f1(150 + c * 40)}" y2="${f1(170 + s * 40)}" style="--i:${i};--dx:${f1(c * far)}px;--dy:${f1(s * far)}px"></line>`); }
    // the animated group carries NO transform attribute — a CSS translate on an element that has one composes inside it, and the key missed the lock
    /* v29 Section A (58.2, build 58): THE GAUNTLET HAND CARRIES THE KEY IN AND TURNS IT, on the two chests that now require a
       finished Gauntlet (`gaunt` on the chest, config/chests.js). It is the SAME glove the map tile and the chest word draw —
       SYMBOLS `gauntlet` / `gauntlet2` — inside the `ckeyg` group, so it travels and turns with the key on one animation rather
       than needing a clock of its own. The player sees what the Gauntlet was for at the moment the chest opens. A chest with no
       Gauntlet requirement (Games, Skill) draws nothing extra and opens exactly as it did. */
    out.push(`<g class="cbarsg">${bars.join('')}</g>`,
      `<g class="ckeyg">${handHtml(id)}<g transform="translate(116 136) scale(1.4)">${(KEY_ART[tier] || KEY_ART.clear).map(d => `<path d="${d}"></path>`).join('')}</g></g>`); }
  /* v29 (item 5, build 54): AUTHOR · the spikes grow in from both edges on `spikes` and pull back on `recede`; the split is one white line down
     the middle, opening on `split`. Build 52's own paths and counts, restored from git — they are in front of the chest because they frame it. */
  if (id === 'thorns') { for (let i = 0; i < 6; i++) { const y = 18 + i * 84;
      out.push(`<path class="cspk l" d="M0 ${y}L72 ${y + 26}L0 ${y + 52}z" style="--i:${i}"></path><path class="cspk r" d="M300 ${y}L228 ${y + 26}L300 ${y + 52}z" style="--i:${i}"></path>`); }
    out.push('<rect class="csplit" x="149" y="0" width="2" height="520"></rect>'); }
  return out.join(''); }
// v25 (build 46): `tapLine` is the review catalogue's frames only — in the app the shared reveal (ui/reveal.js) owns "tap to continue"
/* v26 (item 7, build 48): THE GAMES CHEST'S SCREEN SHOWS NO PERCENTAGE. It opens on every game mode — a count, not a place on the key meter — and
   the figure it showed ("103%") was the meter reading through. The three key chests keep their count-up: each one is a key's worth of meter */
const metered = id => (CHESTS.find(c => c.id === id) || {}).needs !== 'modes';
function stageHtml(id, name, was, tapLine) {
  // item 13: the Games chest arrives at its ceremony with all seven cracks in the markup — the stylesheet draws the seventh in on `crack`
  const chest = chestSvg(id, 'cbig', { cracks: 7 }).replace('<svg ', '<svg x="90" y="250" width="120" height="98" ');
  return `<svg class="cstage" viewBox="0 0 300 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${behind(id)}<g class="cchestg">${chest}</g>${inFront(id)}</svg>`
    + `<div class="ctxt"><b>${esc(name)}</b>${metered(id) ? `<u class="meterv">${esc(T(KEY.pct, { n: meterPct(was) }))}</u>` : ''}${tapLine ? `<i class="ctap">${esc(KEY.tapOn)}</i>` : ''}</div>`; }
const nameOf = id => T(KEY.opened, { chest: GRID.chest[id] });
// v28 (item 9, build 53): the count-up walks the raw meter and PRINTS meterPct() — one scale on every surface, and it cannot pass 100
const setMeter = (m, v) => { if (!m) return; m.textContent = T(KEY.pct, { n: meterPct(v) }); meterLook(m, v); };

/* ---------- v25 (items 6 / 22, build 46): A CHEST OPENING IS NOW A STAGE INSIDE THE ONE SHARED REVEAL ----------
   Build 41's playCeremony() owned its own clock, its own "tap to continue" and its own hand-over. Items 6, 11 and 22 put chests and keys
   through ONE routine (ui/reveal.js), so what is left here is the DRAWING and the times it is drawn on: chestStage(id, o) hands the reveal
   a `{ ms, steps, start, settle, clear }` and the reveal runs the clock, swallows the taps, pops the gifts out, holds "tap to continue" and
   ends on the congratulations card. Nothing about how a chest looks changed, and every timing is still config/chests.js CEREMONY.
   The meter's D.4 count-up is still the reveal's last beat (L.8b) and is still this file's, because it is part of the stage. */
/* v26 (items 6 / 8, build 49): TWO MORE THINGS THE REVEAL ASKS A CHEST'S STAGE. `anchor()` is where the chest is on the host — its middle, its lid, its top
   and its foot, off the stage's own 300 × 520 box and the chest's place in it — so the rewards can be laid out close under it and fly out of its lid.
   `textMs` is how long the chest's own line needs once the rewards have landed: a key chest's count-up, nothing for the Games chest. The line and the
   count-up start at `textAt` when the reveal passes one (after the last reward lands), and at the end of the ceremony when it does not. */
const CHEST_BOX = { x: 150, lid: 293, top: 262, foot: 334 };
/* v29 Section A (57.4, build 57): THE TOPMOST SOLID THING EACH CEREMONY DRAWS, in the same 300 × 520 box. The Games chest's row of
   seven locked squares sits at 110 with its strikes from 107; the three key chests' bars assemble from about 125 and their key glyph
   drops in from 136. The reveal caps the lift the congratulations card asks for at this line rather than at the chest's own top, which
   is what put the squares over the clock and the battery on Aiden's phone. The beam and the Author chest's black wash are deliberately
   NOT counted: both are washes that reach the top of the box by design, and clipping either costs nothing. */
const STAGE_HEAD = { games: 104, key: 122, pro: 122, thorns: 122 };
let upT = 0;
function chestStage(id, o = {}) { const cfg = CEREMONY[id]; if (!cfg) return null;
  const was = typeof o.was === 'number' ? o.was : 0, now = typeof o.now === 'number' ? o.now : was;
  let host = null, live = false;
  return { ms: cfg.ms, steps: cfg.steps.map(s => ({ name: s.name, at: s.at, ms: s.ms })), textMs: metered(id) ? CEREMONY_FX.meterMs + 150 : 0,
    anchor() { const svg = host && host.querySelector('.rstage .cstage'); if (!svg) return null; const r = svg.getBoundingClientRect(), h = host.getBoundingClientRect(); if (!r.width || !r.height) return null;
      const k = Math.min(r.width / 300, r.height / 520), ox = r.left - h.left + (r.width - 300 * k) / 2, oy = r.top - h.top + (r.height - 520 * k) / 2;
      return { cx: ox + CHEST_BOX.x * k, lid: oy + CHEST_BOX.lid * k, top: oy + CHEST_BOX.top * k, bottom: oy + CHEST_BOX.foot * k,
        head: oy + (typeof STAGE_HEAD[id] === 'number' ? STAGE_HEAD[id] : CHEST_BOX.top) * k }; },
    start(el, k = {}) { host = el.closest('.cere') || el; live = true;
      // the stage's own layers sit on the reveal's host, so the build-41 stylesheet (.cere.play [data-chest]) dresses them unchanged
      host.dataset.chest = id; host.setAttribute('style', (host.getAttribute('style') || '') + ';' + stageVars(id));
      // v30 (59.16): the four gauntlet beats are scoped by this, so a chest with no Gauntlet keeps its single combined turn
      { const c = CHESTS.find(x => x.id === id); if (c && c.gaunt) host.dataset.gaunt = c.gaunt; else delete host.dataset.gaunt; }
      el.innerHTML = stageHtml(id, o.name || nameOf(id), was, false);
      const m = el.querySelector('.meterv'); if (m) meterLook(m, was);
      if (!o.silent) Snd.chest(id);
      // D.4 / L.8e: the credit lands as the count-up in the last beat. Under Reduce Motion it lands at once, with the rest of it
      clearTimeout(upT);
      const run = () => { if (!live || !m) return; if (now > was) { m.classList.add('up');
          countUp({ audio: o.silent ? null : Snd, from: was, to: now, ms: CEREMONY_FX.meterMs, fmt: v => Math.round(v), set: v => setMeter(m, v), alive: () => live }); }
        else setMeter(m, now); };
      if (k.quick) run(); else upT = setTimeout(run, Math.max(0, typeof k.textAt === 'number' ? k.textAt : cfg.ms - CEREMONY_FX.meterMs)); },
    step() { },
    settle() { },
    clear() { live = false; clearTimeout(upT); if (host) { delete host.dataset.chest; delete host.dataset.gaunt; } host = null; } }; }

/* the review catalogue's frames: the stage at `frac` of its length, every animation paused there, the meter where the count-up would be */
function frame(host, id, frac, o = {}) { const cfg = CEREMONY[id]; if (!host || !cfg) return;
  const f = Math.max(0, Math.min(1, frac)), t = f * cfg.ms, was = o.was || 0, now = typeof o.now === 'number' ? o.now : was;
  host.dataset.chest = id; host.setAttribute('style', stageVars(id)); host.innerHTML = stageHtml(id, o.name || nameOf(id), was, true);
  { const c = CHESTS.find(x => x.id === id); if (c && c.gaunt) host.dataset.gaunt = c.gaunt; else delete host.dataset.gaunt; }
  host.classList.add('cere', 'play'); host.classList.toggle('tap', f >= 1); host.hidden = false;
  const up = cfg.ms - CEREMONY_FX.meterMs, k = Math.max(0, Math.min(1, (t - up) / CEREMONY_FX.meterMs));
  setMeter(host.querySelector('.meterv'), Math.round(was + (now - was) * k));
  const last = cfg.steps.filter(s => s.at <= t).pop(); host.dataset.step = f >= 1 ? 'tap' : last ? last.name : '';
  for (const a of host.getAnimations({ subtree: true })) { a.pause(); a.currentTime = t; } }

export { frame as ceremonyFrame, chestStage };
