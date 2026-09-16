/* No Excuses — the chests, drawn (v23 §L.9a / §L.10d / §L.11b / §L.8d, build 41). ONE renderer for every surface that draws a chest —
   the map (ui/screens/pick.js), the key screen's row of chests, and the ceremony (ui/ceremony.js) — from CHEST_LOOK in config/chests.js
   (A2), so the four sprites cannot drift apart between screens. Nothing here knows a chest's STATE: the surface puts `locked` / `ready` /
   `open` on the element around the sprite and the stylesheet does the rest — crossed out, the idle, lid up and still.

   Also here, because two screens need each and they are the same kind of thing: the spill's words and particles (L.11b), and the meter's
   band look (L.8d / L.8e) — the class and custom properties a figure wears for the band it is in. This is a module under ui/, not a
   screen, so the key screen and the map may both import it (A4). Presentation only (L10). */
import { CHEST_LOOK, METER_BANDS, SPILL, SYMBOLS } from "../config/chests.js";
import { CHEST_WORDS, GRID } from "../config/copy.js";
import { esc } from "../core.js";
import { meterBand } from "../progress/key.js";

/* v25 (items 6 / 7 / 22, build 46): ONE SYMBOL DRAWER. A symbol is paths in a 24 × 24 box (SYMBOLS in config/chests.js) — `p` stroked,
   `f` filled — and this is the only thing in the app that turns one into markup, so the drawing that pops out of a chest, the one beside
   that word on the map and the one in the congratulations card are the same drawing by construction. An id with no row draws nothing
   rather than throwing: a word may name a symbol before it is drawn. */
function symSvg(id, cls = '') { const S = SYMBOLS[id]; if (!S) return '';
  return `<svg class="sym${cls ? ' ' + cls : ''}" data-sym="${esc(id)}" viewBox="0 0 24 24" aria-hidden="true">`
    + (S.p || []).map(d => `<path class="sp" d="${d}"></path>`).join('') + (S.f || []).map(d => `<path class="sf" d="${d}"></path>`).join('') + '</svg>'; }
// what one chest gives, as the reveal and the card want it: the word, its symbol and whether it is a placeholder reward
const giftsOf = id => (CHEST_WORDS[id] || []).map(x => ({ w: x.w, sym: x.sym || '', tba: !!x.tba, to: x.to || 'soon' }));

const paths = (list, cls) => (list || []).map((d, i) => `<path class="${cls}" d="${d}" style="--i:${i}"></path>`).join('');
/* the sprite. The lid and its spikes are one group turning on the look's own hinge; the cross is always drawn and only a locked chest
   shows it. The colours, weights and idle timing ride on the svg as custom properties, so the stylesheet names no chest's colour */
function chestSvg(id, cls = '') { const L = CHEST_LOOK[id]; if (!L) return ''; const B = METER_BANDS[L.band] || {}; const [hx, hy] = L.hinge || [5, 14];
  return `<svg class="chestart${cls ? ' ' + cls : ''}" data-look="${id}" data-idle="${L.idle.kind}" viewBox="-2 -2 44 36" aria-hidden="true" style="--cs:${L.stroke};--cf:${L.fill};--cl:${L.lock};--csw:${L.sw};--clsw:${L.lidSw};--bc:${B.col};--idle-ms:${L.idle.ms}ms;--idle-px:${L.idle.px}px">`
    + `<g class="boxg">${paths(L.box, 'box')}${paths(L.fit, 'fit')}${paths(L.boxSpikes, 'spk')}${paths(L.accent, 'acc')}</g>`
    + `<g class="lidg" style="transform-origin:${hx}px ${hy}px">${paths(L.lid, 'lid')}${paths(L.spikes, 'spk')}</g>`
    + `<g class="lockg">${paths(L.lockp, 'lock')}</g><path class="xl" d="M1 1L39 31"></path></svg>`; }

/* L.11b: what an opened chest gave, one TAP TARGET per word — `to` in config/copy.js says where it goes. The column carries the spill's
   timings as custom properties; the `spill` class is what makes them move, and a column without it simply stands there */
const spillVars = () => `--sd:${SPILL.delay}ms;--sms:${SPILL.ms}ms;--sst:${SPILL.stagger}ms;--pms:${SPILL.burstMs}ms`;
/* v25 (item 7, build 46): AND ITS SYMBOL BESIDE IT. "Customise the key" was text alone, so nothing said what you got — the word now
   carries the same drawing that popped out of the chest, ahead of it on the line. The word itself keeps its own element so the fit
   check still measures the text and not the drawing. */
function wordsHtml(id) { return (CHEST_WORDS[id] || []).map((x, i) =>
  `<button class="cw${x.tba ? ' tba' : ''}" data-act="chestword" data-for="${id}" data-to="${esc(x.to || 'soon')}" data-w="${esc(x.w)}" style="--i:${i}">`
  + symSvg(x.sym, 'cwsym') + `<span class="cwt">${esc(x.w)}${x.tba ? `<small>${esc(GRID.tba)}</small>` : ''}</span></button>`).join(''); }
// the particles that burst from the lid, in the chest's band colour, fanned up and to the right of the lid
function burstHtml(id) { const L = CHEST_LOOK[id] || {}, B = METER_BANDS[L.band] || METER_BANDS[0], n = SPILL.particles;
  return `<span class="pburst" aria-hidden="true" style="--pc:${B.col};${spillVars()}">` + Array.from({ length: n }, (_, i) =>
    `<i style="--a:${Math.round(-160 + i * (140 / Math.max(1, n - 1)))}deg;--r:${16 + (i % 3) * 8}px;--i:${i}"></i>`).join('') + `</span>`; }

/* L.8d / L.8e: THE BAND A METER FIGURE IS IN, worn as `mb0`–`mb3` with its strength inside the band (`--mk`, 0..1), so 105% and 195% look
   different. Glow and spike heights scale across the band; the shake is a whole number of pixels, so it never blurs the figure. `vars`
   alone takes the colour and nothing else — the map's chest line, whose figure is a pseudo-element. Green is never a band colour (B.22). */
function meterLook(el, v, vars) { if (!el) return; const { i, k } = meterBand(v), B = METER_BANDS[i] || METER_BANDS[0];
  const at = r => r ? Math.round((r[0] + (r[1] - r[0]) * k) * 10) / 10 : 0;
  el.style.setProperty('--mcol', B.col); el.style.setProperty('--mk', k.toFixed(3));
  if (vars) return;
  for (let n = 0; n < METER_BANDS.length; n++) el.classList.toggle('mb' + n, n === i);
  el.style.setProperty('--mglow', at(B.glow) + 'px'); el.style.setProperty('--mspk', at(B.spike) + 'px');
  el.style.setProperty('--mground', B.ground || 'transparent'); el.style.setProperty('--mcold', B.cold || 'transparent');
  el.style.setProperty('--shp', String(B.shake && B.shake[1] ? (k < .5 ? B.shake[0] : B.shake[1]) : 0)); }

export { burstHtml, chestSvg, giftsOf, meterLook, spillVars, symSvg, wordsHtml };
