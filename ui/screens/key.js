/* No Excuses — the key (build 22, v14 §9.2–9.7). Option A, the one Aiden picked on 2026-09-08: the key dead centre, the
   seven games on a ring around it, and a root per game growing inward from its node toward the key.

   A root is drawn in SEGMENTS, one per combination that game contributes (9.6) — six for Quick Tap, three for Sequence —
   and the lit share is the fraction of that game's own combinations cleared. Clearing a bar for the first time lights the
   next segment with the short advance animation (9.5); re-clearing an already-cleared bar plays nothing, which is why the
   result screen only ever hands `advance` over for a fresh clear.

   The rules and the numbers are progress/key.js and config/key-bars.js. Nothing about which combinations exist is written
   here — the panel under the ring renders whatever combos() returned, so a mode added to config/games.js shows up on this
   screen the same day. A combination with no bar renders as "no bar set" rather than vanishing (C.6, config wins).

   Entered from the menu, or from a result screen with a fresh clear — in which case Back goes back to the result rather
   than to the menu, because the run is not finished with. */
import { KEY } from "../../config/copy.js";
import { KEY_NOTE } from "../../config/key-bars.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { GAMES, lenFull } from "../../games/registry.js";
import { barsMissing, gameKey, isCleared, keyState } from "../../progress/key.js";
import { scoreTxt } from "../format.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";

const R_RING = 128, R_HUB = 34, CX = 150, CY = 150;
let openGame = null, cameFrom = null, pending = null;
const games = () => Object.keys(GAMES);
// the seven nodes, evenly spaced from straight up
const angleOf = i => (-90 + i * (360 / games().length)) * Math.PI / 180;
const at = (i, r) => [CX + Math.cos(angleOf(i)) * r, CY + Math.sin(angleOf(i)) * r];

/* ---------- the ring ---------- */
// one root = `total` segments laid end to end from the node inward to the hub. A cleared segment is lit; the rest is the track
function root(i, st) { const [x1, y1] = at(i, R_RING - 14), [x2, y2] = at(i, R_HUB + 4); const n = st.total || 1; const seg = [];
  for (let k = 0; k < n; k++) { const a = k / n, b = (k + 1) / n - (n > 1 ? 0.055 : 0);
    seg.push(`<line class="kroot${k < st.done ? ' on' : ''}" data-seg="${st.g}:${k}" x1="${(x1 + (x2 - x1) * a).toFixed(1)}" y1="${(y1 + (y2 - y1) * a).toFixed(1)}" x2="${(x1 + (x2 - x1) * b).toFixed(1)}" y2="${(y1 + (y2 - y1) * b).toFixed(1)}"></line>`); }
  return seg.join(''); }
function ring() { const st = keyState();
  const parts = st.games.map((g, i) => { const [nx, ny] = at(i, R_RING);
    return root(i, g) + `<g class="knode${g.done ? ' lit' : ''}${g.done === g.total ? ' home' : ''}${openGame === g.g ? ' sel' : ''}" data-act="key-game" data-kg="${g.g}" transform="translate(${nx.toFixed(1)} ${ny.toFixed(1)})">`
      + `<circle class="khit" r="21"></circle><circle class="kdot" r="7"></circle>`
      + `<text class="klbl" y="${ny < CY ? -17 : 24}">${esc(GAMES[g.g].name)}</text>`
      + `<text class="knum" y="${ny < CY ? 26 : -14}">${g.done}/${g.total}</text></g>`; }).join('');
  $('#key-ring').innerHTML = `<circle class="khub" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>`
    + `<path class="kglyph${st.whole ? ' whole' : ''}" d="M150 128a13 13 0 1 0 0 26 13 13 0 1 0 0-26M150 154v24M150 166h8M150 172h6"></path>` + parts;
  $('#key-ring').classList.toggle('whole', st.whole);
  $('#key-count').textContent = st.whole ? KEY.whole : T(KEY.count, { done: st.done, total: st.total });
  return st; }

/* ---------- the panel: one game's combinations ---------- */
// the bar in the game's own units. scoreTxt already carries the mode's suffix (%, s, px, ms); where a mode has none —
// a count of hits, rounds or miscounts — the word comes from the bar's own `unit`, so nothing is ever printed twice
function barTxt(c) { const n = scoreTxt(c.g, c.bar.bar, c.d, c.s); return /[^\d.]$/.test(n) || !c.bar.unit ? n : n + ' ' + c.bar.unit; }
function panel() { const box = $('#key-list'); if (!openGame) { box.innerHTML = ''; box.hidden = true; return; }
  const st = gameKey(openGame); box.hidden = false;
  const rows = st.list.map(c => { const done = isCleared(c.key);
    const name = (MODE_NAME[c.d] ? MODE_NAME[c.d] + ' · ' : '') + lenFull(c.g, c.s, c.d);
    const want = !c.bar ? KEY.none : T(c.bar.dir === 'lower' ? KEY.ceil : KEY.floor, { bar: barTxt(c) });
    return `<div class="krow${done ? ' done' : ''}${c.bar ? '' : ' nobar'}" id="krow-${c.key.replace(/[:.]/g, '_')}"><b>${esc(name)}</b><i>${esc(want)}</i><u>${done ? KEY.cleared : KEY.open}</u></div>`; }).join('');
  box.innerHTML = `<div class="keyblk"><h4>${esc(GAMES[openGame].name)} <span>${T(KEY.root, { done: st.done, total: st.total })}</span></h4>`
    + `<p>${esc(KEY_NOTE[openGame] || '')}</p>${rows}</div>`; }

/* ---------- 9.5: the short advance. The segment that just lit walks in, and its row flashes ---------- */
function advance(a) { if (!a) return; const el = $(`[data-seg="${a.g}:${a.was}"]`); if (el) { el.classList.remove('grow'); void el.getBoundingClientRect(); el.classList.add('grow'); }
  const row = $('#krow-' + a.key.replace(/[:.]/g, '_')); if (row) row.classList.add('newthing'); }

register('s-key', { onShow({ advance: a, from } = {}) { cameFrom = from || null; pending = a || null;
    if (a) openGame = a.g; ring(); panel();
    const miss = barsMissing(); $('#key-warn').hidden = !miss.length;
    if (miss.length) $('#key-warn').textContent = T(KEY.mismatch, { n: miss.length, keys: miss.join(', ') });
    if (pending) { const p = pending; pending = null; setTimeout(() => advance(p), 260); } },
  // a fresh clear arrived from a result screen: Back belongs to the run, not to the menu
  onBack() { if (!cameFrom) return false; const to = cameFrom; cameFrom = null; show(to); return true; } });
define({ 'key-game'(el) { const g = el.dataset.kg; openGame = openGame === g ? null : g; ring(); panel(); return 'pick'; } });
