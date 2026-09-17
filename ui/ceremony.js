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
import { CEREMONY, CEREMONY_FX, CHESTS } from "../config/chests.js";
import { GRID, KEY } from "../config/copy.js";
import { KEY_ART } from "../config/keys.js";
import { Snd } from "../audio.js";
import { T, esc } from "../core.js";
import { countUp } from "../core/count.js";
import { COMBOS } from "../progress/key.js";
import { chestCol, chestSvg, meterLook } from "./chest.js";

const f1 = v => (+v).toFixed(1);
// which named step lifts each chest's lid: its own `lid` step, or the moment the Pro chest bursts and the Thorns reveal widens
const LID_STEP = { games: 'lid', key: 'lid', pro: 'burst', thorns: 'widen' };
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
  const cr = stepOf(id, 'cracks'); if (cr) v.push(`--crack-step:${Math.round(cr.ms / 4)}ms`);
  return v.join(';'); }

/* ---------- the layers, by step name. Behind the chest, then the chest, then in front of it; stage units are a 300 × 520 box ---------- */
function behind(id) {
  if (id === 'games') return '<circle class="cglow" cx="150" cy="300" r="80"></circle>';
  if (id === 'key') return '<defs><linearGradient id="cbeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>'
    + '<polygon class="cbeam" points="122,300 178,300 270,0 30,0"></polygon>';
  if (id === 'pro') return '<circle class="cburst" cx="150" cy="300" r="20"></circle>';
  if (id === 'thorns') return '<rect class="cblack" x="-60" y="-60" width="420" height="640"></rect><rect class="cwide" x="40" y="0" width="220" height="520"></rect>';
  return ''; }
function inFront(id) { const out = [];
  // Games · uncross: the seven locked tiles, each struck through, the strikes wiping off one by one; path: the line down to the chest
  if (id === 'games') { for (let i = 0; i < 7; i++) { const x = 150 + (i - 3) * 34 - 11;
      out.push(`<rect class="ctile" x="${x}" y="110" width="22" height="22" style="--i:${i}"></rect><path class="cx" pathLength="1" d="M${x - 3} 107L${x + 25} 135" style="--i:${i}"></path>`); }
    out.push('<path class="cpath" pathLength="1" d="M150 140V254"></path>'); }
  // Key · assemble: one bar per combination flies in to ring the key's bow; turn: the key drops into the lock and turns
  if (id === 'key') { const n = COMBOS.length, bars = [];
    for (let i = 0; i < n; i++) { const a = i * (360 / n) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), far = 170 + (i % 4) * 22;
      bars.push(`<line class="cbar" x1="${f1(150 + c * 30)}" y1="${f1(170 + s * 30)}" x2="${f1(150 + c * 40)}" y2="${f1(170 + s * 40)}" style="--i:${i};--dx:${f1(c * far)}px;--dy:${f1(s * far)}px"></line>`); }
    // the animated group carries NO transform attribute — a CSS translate on an element that has one composes inside it, and the key missed the lock
    out.push(`<g class="cbarsg">${bars.join('')}</g>`, `<g class="ckeyg"><g transform="translate(116 136) scale(1.4)">${KEY_ART.clear.map(d => `<path d="${d}"></path>`).join('')}</g></g>`); }
  // Pro · cracks: four lines of light across the chest; scatter: the cosmetics fly out, settle in a row, slide off toward Customise
  if (id === 'pro') {
    ['M104 286l14 6-5 9 16 5', 'M196 276l-12 10 7 7-15 9', 'M122 318l12-8 9 6 12-7', 'M170 262l4 12-8 6 6 11'].forEach((d, i) => out.push(`<path class="ccrack" pathLength="1" d="${d}" style="--i:${i}"></path>`));
    CEREMONY_FX.swatch.forEach((c, i) => out.push(`<rect class="cswatch" x="143" y="293" width="14" height="14" fill="${c}" style="--i:${i};--tx:${(i - (CEREMONY_FX.swatch.length - 1) / 2) * 30}px;--ty:110px"></rect>`)); }
  // Thorns · spikes: grow in from both edges (and recede); split: one white line down the middle
  if (id === 'thorns') { for (let i = 0; i < 6; i++) { const y = 18 + i * 84;
      out.push(`<path class="cspk l" d="M0 ${y}L72 ${y + 26}L0 ${y + 52}z" style="--i:${i}"></path><path class="cspk r" d="M300 ${y}L228 ${y + 26}L300 ${y + 52}z" style="--i:${i}"></path>`); }
    out.push('<rect class="csplit" x="149" y="0" width="2" height="520"></rect>'); }
  return out.join(''); }
// v25 (build 46): `tapLine` is the review catalogue's frames only — in the app the shared reveal (ui/reveal.js) owns "tap to continue"
/* v26 (item 7, build 48): THE GAMES CHEST'S SCREEN SHOWS NO PERCENTAGE. It opens on every game mode — a count, not a place on the key meter — and
   the figure it showed ("103%") was the meter reading through. The three key chests keep their count-up: each one is a key's worth of meter */
const metered = id => (CHESTS.find(c => c.id === id) || {}).needs !== 'modes';
function stageHtml(id, name, was, tapLine) {
  const chest = chestSvg(id, 'cbig').replace('<svg ', '<svg x="90" y="250" width="120" height="98" ');
  return `<svg class="cstage" viewBox="0 0 300 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${behind(id)}<g class="cchestg">${chest}</g>${inFront(id)}</svg>`
    + `<div class="ctxt"><b>${esc(name)}</b>${metered(id) ? `<u class="meterv">${esc(T(KEY.pct, { n: was }))}</u>` : ''}${tapLine ? `<i class="ctap">${esc(KEY.tapOn)}</i>` : ''}</div>`; }
const nameOf = id => T(KEY.opened, { chest: GRID.chest[id] });
const setMeter = (m, v) => { if (!m) return; m.textContent = T(KEY.pct, { n: v }); meterLook(m, v); };

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
let upT = 0;
function chestStage(id, o = {}) { const cfg = CEREMONY[id]; if (!cfg) return null;
  const was = typeof o.was === 'number' ? o.was : 0, now = typeof o.now === 'number' ? o.now : was;
  let host = null, live = false;
  return { ms: cfg.ms, steps: cfg.steps.map(s => ({ name: s.name, at: s.at, ms: s.ms })), textMs: metered(id) ? CEREMONY_FX.meterMs + 150 : 0,
    anchor() { const svg = host && host.querySelector('.rstage .cstage'); if (!svg) return null; const r = svg.getBoundingClientRect(), h = host.getBoundingClientRect(); if (!r.width || !r.height) return null;
      const k = Math.min(r.width / 300, r.height / 520), ox = r.left - h.left + (r.width - 300 * k) / 2, oy = r.top - h.top + (r.height - 520 * k) / 2;
      return { cx: ox + CHEST_BOX.x * k, lid: oy + CHEST_BOX.lid * k, top: oy + CHEST_BOX.top * k, bottom: oy + CHEST_BOX.foot * k }; },
    start(el, k = {}) { host = el.closest('.cere') || el; live = true;
      // the stage's own layers sit on the reveal's host, so the build-41 stylesheet (.cere.play [data-chest]) dresses them unchanged
      host.dataset.chest = id; host.setAttribute('style', (host.getAttribute('style') || '') + ';' + stageVars(id));
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
    clear() { live = false; clearTimeout(upT); if (host) delete host.dataset.chest; host = null; } }; }

/* the review catalogue's frames: the stage at `frac` of its length, every animation paused there, the meter where the count-up would be */
function frame(host, id, frac, o = {}) { const cfg = CEREMONY[id]; if (!host || !cfg) return;
  const f = Math.max(0, Math.min(1, frac)), t = f * cfg.ms, was = o.was || 0, now = typeof o.now === 'number' ? o.now : was;
  host.dataset.chest = id; host.setAttribute('style', stageVars(id)); host.innerHTML = stageHtml(id, o.name || nameOf(id), was, true);
  host.classList.add('cere', 'play'); host.classList.toggle('tap', f >= 1); host.hidden = false;
  const up = cfg.ms - CEREMONY_FX.meterMs, k = Math.max(0, Math.min(1, (t - up) / CEREMONY_FX.meterMs));
  setMeter(host.querySelector('.meterv'), Math.round(was + (now - was) * k));
  const last = cfg.steps.filter(s => s.at <= t).pop(); host.dataset.step = f >= 1 ? 'tap' : last ? last.name : '';
  for (const a of host.getAnimations({ subtree: true })) { a.pause(); a.currentTime = t; } }

export { frame as ceremonyFrame, chestStage };
