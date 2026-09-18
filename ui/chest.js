/* No Excuses — the chests, drawn (v23 §L.9a / §L.10d / §L.11b / §L.8d, build 41). ONE renderer for every surface that draws a chest —
   the map (ui/screens/pick.js), the key screen's row of chests, and the ceremony (ui/ceremony.js) — from CHEST_LOOK in config/chests.js
   (A2), so the four sprites cannot drift apart between screens. Nothing here knows a chest's STATE: the surface puts `locked` / `ready` /
   `open` on the element around the sprite and the stylesheet does the rest — crossed out, the idle, lid up and still.

   Also here, because two screens need each and they are the same kind of thing: the spill's words and particles (L.11b), and the meter's
   band look (L.8d / L.8e) — the class and custom properties a figure wears for the band it is in. This is a module under ui/, not a
   screen, so the key screen and the map may both import it (A4). Presentation only (L10). */
import { HIDE_UNRECORDED } from "../config/build.js";
import { CHEST_LOOK, GAUNTLETS, METER_BANDS, SPILL, SYMBOLS } from "../config/chests.js";
import { CHEST_WORDS, GRID, MSG } from "../config/copy.js";
import { KEYS, KEY_ART } from "../config/keys.js";
import { MESSAGES } from "../config/messages.js";
import { T, esc } from "../core.js";
import { meterBand } from "../progress/key.js";

/* v25 (items 6 / 7 / 22, build 46): ONE SYMBOL DRAWER. A symbol is paths in a 24 × 24 box (SYMBOLS in config/chests.js) — `p` stroked,
   `f` filled — and this is the only thing in the app that turns one into markup, so the drawing that pops out of a chest, the one beside
   that word on the map and the one in the congratulations card are the same drawing by construction. An id with no row draws nothing
   rather than throwing: a word may name a symbol before it is drawn. */
/* v26 (items 12 / 13, build 49): IN COLOUR, AND A KEY IS ITS REAL SHAPE. A key symbol (`key` on its SYMBOLS row) is that key's own KEY_ART glyph in
   that key's own tint — the drawing on the Keys screen, in its 48 × 48 box. Any other symbol takes its own `col`, or else the colour of the chest it
   came from, when the caller names one. The colour rides on the svg as `color`, which every stroke and fill reads (currentColor). */
/* v27 (item 13 / R2, build 51): ONE CHEST COLOUR, read from the chest's own look. `col` on a CHEST_LOOK row is the colour of the KEY that opens
   that chest (R2) — it is no longer the meter band's, which is what put the gold chest at the Pro tier. Everything that draws a chest asks this:
   the sprite, the ceremony's `--cc`, the spill's particles, a reward symbol with no colour of its own, and the congratulations card's rule. A row
   with no `col` falls back to its band, so nothing breaks if one is added without one. */
export const chestCol = id => { const L = CHEST_LOOK[id] || {}; return L.col || (METER_BANDS[L.band] || METER_BANDS[1]).col; };
const symCol = (id, chest) => { const S = SYMBOLS[id] || {}; if (S.key) return (KEYS.find(k => k.id === S.key) || {}).tint || '';
  if (S.col) return S.col; return CHEST_LOOK[chest] ? chestCol(chest) : ''; };
function symSvg(id, cls = '', chest = '') { const S = SYMBOLS[id]; if (!S) return ''; const col = symCol(id, chest), art = S.key ? KEY_ART[S.key] || [] : null;
  return `<svg class="sym${art ? ' symkey' : ''}${cls ? ' ' + cls : ''}" data-sym="${esc(id)}" viewBox="${art ? '0 0 48 48' : '0 0 24 24'}" aria-hidden="true"${col ? ` style="color:${col}"` : ''}>`
    + (art || S.p || []).map(d => `<path class="sp" d="${d}"></path>`).join('') + (art ? '' : (S.f || []).map(d => `<path class="sf" d="${d}"></path>`).join('')) + '</svg>'; }
/* v26 (item 5, build 49): EVERY CHEST ALSO GIVES THE ABOUT VIDEO IT OPENS. The slot is the one in config/messages.js opened by this chest, and its
   title is read from there, so a renamed slot renames the reward everywhere. It stands while the slot is a placeholder, so the wording can be
   reviewed; config/build.js HIDE_UNRECORDED is the before-release switch that drops it while the slot has no clip. `to` is `msg:<slot>`. */
const msgOfChest = id => MESSAGES.find(m => m.by && m.by.chest === id) || null;
/* v27 (item 9, build 52): WHAT COLOUR A MESSAGE'S FRAME GLOWS IN — "the colour of the chest that unlocked the video". Read off the slot's own `by`,
   so nothing is written twice: a chest slot takes that chest's colour, a GAUNTLET slot takes the colour of the chest the Gauntlet came out of (the
   chest is what put it on the map), and a slot with no chest behind it at all — Welcome, and the support thank-you — glows white, the frame's own
   colour, because there is no chest to borrow from. It lives here because chestCol() does, and ui/video.js is a module under ui/ like this one. */
const msgCol = m => { const b = (m && m.by) || {}; if (b.chest) return chestCol(b.chest);
  if (b.gauntlet) { const g = GAUNTLETS.find(x => x.id === b.gauntlet); return g ? chestCol(g.chest) : ''; }
  return ''; };
const videoWord = id => { const m = msgOfChest(id); return !m || (HIDE_UNRECORDED && !m.file) ? [] : [{ w: T(MSG.reward, { title: m.title }), sym: 'video', to: 'msg:' + m.id, msg: m.id }]; };
const wordsOf = id => (CHEST_WORDS[id] || []).concat(videoWord(id));
// what one chest gives, as the reveal and the map want it: the word, its symbol, where it goes and whether it is a placeholder reward
const giftsOf = id => wordsOf(id).map(x => ({ w: x.w, sym: x.sym || '', tba: !!x.tba, to: x.to || 'soon', msg: x.msg || '' }));

const paths = (list, cls) => (list || []).map((d, i) => `<path class="${cls}" d="${d}" style="--i:${i}"></path>`).join('');
/* the sprite. The lid and its spikes are one group turning on the look's own hinge; the cross is always drawn and only a locked chest
   shows it. The colours, weights and idle timing ride on the svg as custom properties, so the stylesheet names no chest's colour */
// v27 (item 13): `--bc` is the chest's own colour now (chestCol), and `--shim` the colour its shimmer or its current runs in
function chestSvg(id, cls = '') { const L = CHEST_LOOK[id]; if (!L) return ''; const col = chestCol(id); const [hx, hy] = L.hinge || [5, 14];
  return `<svg class="chestart${cls ? ' ' + cls : ''}" data-look="${id}" data-idle="${L.idle.kind}" viewBox="-2 -2 44 36" aria-hidden="true" style="--cs:${L.stroke};--cf:${L.fill};--cl:${L.lock};--csw:${L.sw};--clsw:${L.lidSw};--bc:${col};--shim:${L.shim || col};--idle-ms:${L.idle.ms}ms;--idle-px:${L.idle.px}px">`
    + `<g class="boxg">${paths(L.box, 'box')}${paths(L.fit, 'fit')}${paths(L.boxSpikes, 'spk')}${paths(L.accent, 'acc')}</g>`
    + `<g class="lidg" style="transform-origin:${hx}px ${hy}px">${paths(L.lid, 'lid')}${paths(L.spikes, 'spk')}</g>`
    + `<g class="lockg">${paths(L.lockp, 'lock')}</g><path class="xl" d="M1 1L39 31"></path></svg>`; }

/* L.11b: what an opened chest gave, one TAP TARGET per word — `to` in config/copy.js says where it goes. The column carries the spill's
   timings as custom properties; the `spill` class is what makes them move, and a column without it simply stands there */
const spillVars = () => `--sd:${SPILL.delay}ms;--sms:${SPILL.ms}ms;--sst:${SPILL.stagger}ms;--pms:${SPILL.burstMs}ms`;
/* v25 (item 7, build 46): AND ITS SYMBOL BESIDE IT. "Customise the key" was text alone, so nothing said what you got — the word now
   carries the same drawing that popped out of the chest, ahead of it on the line. The word itself keeps its own element so the fit
   check still measures the text and not the drawing. */
// v26 (item 12, build 49): the symbols take colour — a key's own, or the chest's — and the video (item 5) stands in the list with the rest
function wordsHtml(id) { return wordsOf(id).map((x, i) =>
  `<button class="cw${x.tba ? ' tba' : ''}${x.msg ? ' msg' : ''}" data-act="chestword" data-for="${id}" data-to="${esc(x.to || 'soon')}" data-w="${esc(x.w)}" style="--i:${i}">`
  + symSvg(x.sym, 'cwsym', id) + `<span class="cwt">${esc(x.w)}${x.tba ? `<small>${esc(GRID.tba)}</small>` : ''}</span></button>`).join(''); }
// the particles that burst from the lid, in the chest's band colour, fanned up and to the right of the lid
function burstHtml(id) { const n = SPILL.particles;
  return `<span class="pburst" aria-hidden="true" style="--pc:${chestCol(id)};${spillVars()}">` + Array.from({ length: n }, (_, i) =>
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

export { burstHtml, chestSvg, giftsOf, meterLook, msgCol, msgOfChest, spillVars, symSvg, wordsHtml };
