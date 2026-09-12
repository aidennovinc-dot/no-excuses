/* No Excuses — the keys (build 22, v14 §9.2–9.7; rebuilt as three keys at build 26, v15 §5). Option A, the one Aiden
   picked on 2026-09-08: the key dead centre, the seven games on a ring around it, and a root per game growing inward
   from its node toward the key.

   A root is drawn in SEGMENTS, one per combination that game contributes (9.6) — six for Quick Tap, two for Sequence —
   and the lit share is the fraction of that game's own combinations cleared. Clearing a bar for the first time lights the
   next segment with the short advance animation (9.5); re-clearing an already-cleared bar plays nothing, which is why the
   result screen only ever hands `advance` over for a fresh clear.

   BUILD 26 — what changed, and what did not:
   · 5.3 the menu item is KEYS. Three tiers over the same combinations (A.1): the clearance bars, a pro tier and the
     author's times. Each has its own symbol, gets more elaborate as the difficulty rises, shows locked / unlocked and a
     % while it is under 100.
   · 5.1 a fresh clear INTERRUPTS the result screen. It is not a toast to tap any more: the result fades, input is locked
     (`lock` in ui/actions.js), the segment fills with the whole root lit behind it, and the screen hands itself back.
     Same flow for every game, because it is one path — the result screen asks for it, this screen plays it and says done.
   · 5.2 a clearance-bar row is a way IN. Tapping it starts that combination with the bar pinned at the top of the run,
     through goWhere's pendingAim — the SAME mechanism build 23 gave the achievement-at-the-top (2.2), not a second one.
     A locked mode or length opens the lock box instead, which is the same route the pick sheet uses.
   · 5.4 the first open of the whole screen animates itself into existence, once per profile (`prefs.keySeen`).

   BUILD 32 (v18 §B.21, §B.22, §B.23, §B.27, §B.20):
   · B.27 the ring is drawn for the OPEN TIER — every read goes through progress/key.js with the tier as the argument, and
     a tier whose column in config/key-bars.js is not full is a shell that says so (A.2) instead of drawing a ring over
     numbers nobody has set. Nothing here knows which tier has numbers; it asks.
   · B.22 the ring is drawn in the tier's own STYLE, from config/keys.js: Lantern (straight glowing spokes, a ring arc
     round a game that is home, a warm radial ground), Circuit (right-angled traces with a dot at each corner that lights
     when the trace reaches it, square nodes, a dotted ground) and Thorn (curved branches with thorns along them that turn
     white as the branch lights, on black). Every style still draws one SEGMENT PER COMBINATION so 9.5's advance and
     5.1's halo work unchanged; a segment is a <path> with pathLength=1 whatever its shape. A lit segment wears the tier's
     tint. Visual only — the tracks are the build-30 loops (B.31), asked for by name.
   · B.21 THE ARRIVAL PLAYS THE FIRST TIME THE SCREEN IS SEEN, WHICHEVER WAY IT IS SEEN. What skipped it: onShow ran
     `if (!auto) firstIn()`, and the interlude sets `auto`, so a profile whose first look at this screen was a clear
     during a run never played the arrival there — and the flag stayed unset, so the Keys menu item played it later, out
     of place. The interlude now plays the arrival first (2.6s), then the segment, and waits for both.
   · B.23 a tap INSIDE the ring never goes Back: the ring sits on a transparent disc with its own act (silence), each root
     carries a wide invisible hit line with the same act as its node, so a bar is as tappable as its circle on the edge.
     Bare ground outside the ring still goes Back, as everywhere.
   · B.20 a WHOLE key gets its own moment: the hub glyph turns and flares and the count line says the key is whole and the
     chest is waiting — played once per tier per profile (`prefs.keyWhole`), and on demand from Testing (B.26).

   The rules and the numbers are progress/key.js, config/key-bars.js and config/keys.js. Nothing about which combinations
   exist is written here — the panel under the ring renders whatever combos() returned, so a mode added to config/games.js
   shows up on this screen the same day. A combination with no bar renders as "no bar set" rather than vanishing (C.6). */
import { Music } from "../../audio.js";
import { KEY } from "../../config/copy.js";
import { KEY_NOTE } from "../../config/key-bars.js";
import { KEY_ART } from "../../config/keys.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { emit } from "../../core/events.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, lenFull, lenName } from "../../games/registry.js";
import { isOpen, lenOpen } from "../../progress.js";
import { barOf, barsFaked, barsMissing, gameKey, isCleared, keyPct, keyState, keyTiers, mapOpen } from "../../progress/key.js";
import { goWhere } from "../../run/run.js";
import { scoreTxt } from "../format.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";

const R_RING = 128, R_HUB = 34, CX = 150, CY = 150;
let openGame = null, cameFrom = null, pending = null, openKey = 0, auto = null, demo = false;
const games = () => Object.keys(GAMES);
// the seven nodes, evenly spaced from straight up
const angleOf = i => (-90 + i * (360 / games().length)) * Math.PI / 180;
const at = (i, r) => [CX + Math.cos(angleOf(i)) * r, CY + Math.sin(angleOf(i)) * r];
const f1 = v => (+v).toFixed(1);
const tierId = () => keyTiers()[openKey].id;

/* ---------- 5.3: the three keys across the top ---------- */
// one glyph, drawn from the tier's own path list. The list gets longer as the tier gets harder, which IS the "more
// elaborate" — there is no second scale of intensity to keep in step with it
const glyph = (id, cls) => `<svg class="kgl ${cls}" viewBox="0 0 48 48" aria-hidden="true">${KEY_ART[id].map(d => `<path d="${d}"></path>`).join('')}</svg>`;
/* v17 (§A.1 / B.31): NOTHING ABOUT PRO OR AUTHOR EXISTS ON THIS SCREEN UNTIL CHEST 1 IS OPENED. Not a greyed row, not a
   locked glyph, not the word. A first-timer seeing three targets per game is the load Aiden ruled out, and chest 1 is
   the gate that hands the map over (A.2). One line, here, because `keyTiers()` is the only list of them.
   #411: the gate is mapOpen(), not prefs.chest1 — Testing's OPEN EVERYTHING and Supporter open the map too, the same way
   they open every other gate. Reading the chest flag alone is what made this screen the one place the switch did nothing. */
const shown = () => keyTiers().filter(k => k.i === 0 || mapOpen());
function keys() {
  const list = shown();
  // one tier is not a row of choices — before chest 1 the strip is the theme's name and nothing to press
  $('#key-keys').classList.toggle('one', list.length < 2);
  $('#key-keys').innerHTML = list.map(k => {
    const pct = k.whole ? '' : T(KEY.pct, { n: k.shell ? 0 : k.pct });
    return `<button class="kkey${k.i === openKey ? ' sel' : ''}${k.whole ? ' whole' : ''}${k.shell ? ' shell' : ''}" data-act="key-tier" data-kt="${k.i}" style="--ktint:${k.tint};--kground:${k.ground}">`
      + glyph(k.id, 't' + (k.i + 1)) + `<b>${esc(k.name)}</b><i>${esc(k.theme)}</i>`
      + `<u>${k.whole ? KEY.unlocked : pct}</u></button>`; }).join('');
}

/* ---------- the ring, in the tier's style (B.22) ----------
   Every style produces the same three things per game: `pts`, a polyline from the node inward to the hub that the
   segments are cut from; a halo path along the whole of it (5.1); and the node. Segments are equal shares of the
   polyline's length, drawn as <path pathLength="1"> so the CSS animations work on every shape alike. */
// a polyline's cumulative lengths, and the point a fraction of the way along it
function measure(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
function along(pts, L, f) { const want = f * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < want) i++;
  const a = pts[i - 1], b = pts[i], seg = L[i] - L[i - 1] || 1, t = (want - L[i - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
// the part of a polyline between two fractions, as a path
function slice(pts, L, f0, f1_) { const out = [along(pts, L, f0)]; const want0 = f0 * L[L.length - 1], want1 = f1_ * L[L.length - 1];
  for (let i = 1; i < pts.length - 1; i++) if (L[i] > want0 && L[i] < want1) out.push(pts[i]);
  out.push(along(pts, L, f1_)); return 'M' + out.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L'); }
// a quadratic curve sampled into a polyline, for Thorn's branches
function curve(a, c, b, n = 24) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return out; }
// the spoke for one game, by style: from the node's inner edge to the hub's edge
function spokeOf(style, i) { const [nx, ny] = at(i, R_RING), a = angleOf(i), ux = Math.cos(a), uy = Math.sin(a);
  const start = [nx - ux * 14, ny - uy * 14], end = [CX + ux * (R_HUB + 4), CY + uy * (R_HUB + 4)];
  if (style === 'circuit') {
    // right angles: out of the node along the axis it is nearer, across, then into the hub. A vertical node runs straight
    const vertical = Math.abs(nx - CX) < 8;
    if (vertical) return [start, end];
    const mx = CX + (nx - CX) * 0.52, ey = CY + uy * 16;
    return [start, [mx, start[1]], [mx, ey], [CX + Math.sign(nx - CX) * (R_HUB + 2), ey]]; }
  if (style === 'thorn') {
    // a branch bows a little, always the same way for the same node, so the ring does not shimmer between renders
    const wob = ((i % 2) ? 1 : -1) * 14; const ctl = [(start[0] + end[0]) / 2 - uy * wob, (start[1] + end[1]) / 2 + ux * wob];
    return curve(start, ctl, end); }
  return [start, end]; }
// one root = `total` segments laid end to end from the node inward to the hub. A cleared segment is lit; the rest is the
// track. The halo behind them is what 5.1 lights: the game's WHOLE root, as a background glow, while a segment fills
function root(i, st, style) { const pts = spokeOf(style, i), L = measure(pts); const n = st.total || 1; const seg = [], deco = [];
  const gap = n > 1 ? 0.045 : 0;
  for (let k = 0; k < n; k++) { const a = k / n, b = (k + 1) / n - gap;
    seg.push(`<path class="kroot${k < st.done ? ' on' : ''}" data-seg="${st.g}:${k}" pathLength="1" d="${slice(pts, L, a, b)}"></path>`); }
  const lit = st.total ? st.done / st.total : 0;
  if (style === 'circuit' && pts.length > 2) {
    // a dot at each corner, lit once the trace has reached it
    for (let j = 1; j < pts.length - 1; j++) { const f = L[j] / L[L.length - 1]; deco.push(`<rect class="kdot2${f <= lit + 1e-6 ? ' on' : ''}" x="${f1(pts[j][0] - 2.6)}" y="${f1(pts[j][1] - 2.6)}" width="5.2" height="5.2"></rect>`); } }
  if (style === 'thorn') {
    // thorns along the branch, alternating sides, white where the branch is lit
    let k = 0; for (let f = 0.1; f < 0.95; f += 0.085, k++) { const [x, y, ang] = along(pts, L, f); const side = k % 2 ? 1 : -1, len = k % 3 === 1 ? 9 : 6;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy * side, ny = dx * side;
      deco.push(`<path class="kthorn${f <= lit + 1e-6 ? ' on' : ''}" d="M${f1(x - dx * 1.6)} ${f1(y - dy * 1.6)}L${f1(x + dx * 1.6)} ${f1(y + dy * 1.6)}L${f1(x + dx * 4 + nx * len)} ${f1(y + dy * 4 + ny * len)}z"></path>`); } }
  const whole = 'M' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L');
  // B.23: the wide invisible line is the root's own hit area, and it carries the node's act
  return `<g class="kr" data-rg="${st.g}"><path class="khalo" d="${whole}"></path><path class="khit2" data-act="key-game" data-kg="${st.g}" d="${whole}"></path>${seg.join('')}${deco.join('')}</g>`; }
function node(i, g, style) { const [nx, ny] = at(i, R_RING); const cls = `knode${g.done ? ' lit' : ''}${g.done === g.total ? ' home' : ''}${openGame === g.g ? ' sel' : ''}`;
  const dot = style === 'circuit' ? `<rect class="kdot" x="-6.5" y="-6.5" width="13" height="13"></rect>` : `<circle class="kdot" r="7"></circle>`;
  // Lantern: a game that is home wears an arc of the ring around its node, the page's own flourish
  const arc = style === 'lantern' && g.done === g.total && g.total ? `<path class="karc" d="${arcAt(i)}" transform="translate(${f1(-nx)} ${f1(-ny)})"></path>` : '';
  return `<g class="${cls}" data-act="key-game" data-kg="${g.g}" transform="translate(${f1(nx)} ${f1(ny)})">`
    + `<circle class="khit" r="21"></circle>${arc}${dot}`
    + `<text class="klbl" y="${ny < CY ? -17 : 24}">${esc(GAMES[g.g].name)}</text>`
    + `<text class="knum" y="${ny < CY ? 26 : -14}">${g.done}/${g.total}</text></g>`; }
function arcAt(i) { const a = angleOf(i), w = Math.PI / 7; const p = t => [CX + Math.cos(t) * R_RING, CY + Math.sin(t) * R_RING]; const [x0, y0] = p(a - w), [x1, y1] = p(a + w);
  return `M${f1(x0)} ${f1(y0)}A${R_RING} ${R_RING} 0 0 1 ${f1(x1)} ${f1(y1)}`; }
// the ground behind the ring, by style: a warm radial for Lantern, a dot grid for Circuit, nothing for Thorn (black is the ground)
function groundOf(style) {
  if (style === 'lantern') return `<defs><radialGradient id="kglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--ktint)" stop-opacity=".28"/><stop offset=".45" stop-color="var(--ktint)" stop-opacity=".08"/><stop offset="1" stop-color="var(--ktint)" stop-opacity="0"/></radialGradient></defs><circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="url(#kglow)"></circle>`;
  if (style === 'circuit') return `<defs><pattern id="kdots" width="12" height="12" patternUnits="userSpaceOnUse"><rect x="5.4" y="5.4" width="1.2" height="1.2" fill="var(--kdim)"/></pattern></defs><circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="url(#kdots)"></circle>`;
  return `<circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="transparent"></circle>`; }
function ring() { const tier = keyTiers()[openKey]; const st = keyState(tier.id); const style = tier.style || 'lantern';
  const parts = st.games.map((g, i) => root(i, g, style) + node(i, g, style)).join('');
  // the hub glyph is the tier's own art, scaled into the hub
  const hub = `<g class="kglyph${st.whole ? ' whole' : ''}" transform="translate(${CX - 24} ${CY - 24})">${KEY_ART[tier.id].map(d => `<path d="${d}"></path>`).join('')}</g>`;
  $('#key-ring').innerHTML = groundOf(style) + `<circle class="khub" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>` + hub + parts;
  $('#key-ring').classList.toggle('whole', st.whole);
  // v17 (§A.6.7) / v18 (B.15): "19 of 30 · 74%" stays HERE — the cleared count is what a player acts on and this is the
  // screen they act on it from; the menu carries the percentage alone. Both come out of progress/key.js (C.5)
  const p = keyPct(tier.id);
  $('#key-count').textContent = st.whole ? T(KEY.complete, { key: tier.name }) : T(KEY.count, { done: p.done, total: p.total, pct: p.pct });
  return st; }

/* ---------- the panel: one game's combinations ---------- */
// the bar in the game's own units. scoreTxt already carries the mode's suffix (%, s, px, ms); where a mode has none —
// a count of hits, rounds or miscounts — the word comes from the bar's own `unit`, so nothing is ever printed twice
function barTxt(c, bar) { const n = scoreTxt(c.g, bar, c.d, c.s); return /[^\d.]$/.test(n) || !c.bar.unit ? n : n + ' ' + c.bar.unit; }
const wantTxt = c => { const bar = barOf(c, tierId()); return bar === null ? KEY.none : T(c.bar.dir === 'lower' ? KEY.ceil : KEY.floor, { bar: barTxt(c, bar) }); };
function panel() { const box = $('#key-list'); if (!openGame) { box.innerHTML = ''; box.hidden = true; return; }
  const tier = tierId(); const st = gameKey(openGame, tier); box.hidden = false;
  const rows = st.list.map(c => { const done = isCleared(c.key, tier);
    const name = (MODE_NAME[c.d] ? MODE_NAME[c.d] + ' · ' : '') + lenFull(c.g, c.s, c.d);
    // 5.2: the row is a control now, so it carries an act like everything else does
    return `<div class="krow${done ? ' done' : ''}${barOf(c, tier) === null ? ' nobar' : ''}" data-act="key-row" data-kk="${c.key}" id="krow-${c.key.replace(/[:.]/g, '_')}"><b>${esc(name)}</b><i>${esc(wantTxt(c))}</i><u>${done ? KEY.cleared : KEY.open}</u></div>`; }).join('');
  box.innerHTML = `<div class="keyblk"><h4>${esc(GAMES[openGame].name)} <span>${T(KEY.root, { done: st.done, total: st.total })}</span></h4>`
    + `<p>${esc(KEY_NOTE[openGame] || '')}</p>${rows}</div>`; }

/* ---------- which key is on screen ---------- */
function render() { if (!mapOpen()) openKey = 0; const t = keyTiers()[openKey]; keys();
  // B.31 / B.22: the tier's own tint, dim and ground dress the whole screen, out of config/keys.js. No colour is named here
  const el = $('#s-key'); el.style.setProperty('--ktint', t.tint); el.style.setProperty('--kdim', t.dim || 'var(--line)'); el.style.setProperty('--kground', t.ground); el.dataset.theme = t.id; el.dataset.style = t.style || '';
  $('#key-title').textContent = t.name.toLowerCase();
  $('#key-main').hidden = !!t.shell; $('#key-shell').hidden = !t.shell;
  if (t.shell) { $('#key-shell').innerHTML = `${glyph(t.id, 't' + (openKey + 1) + ' big')}<p>${esc(t.lede)}</p><p class="soon">${esc(KEY.soon)}</p>`; return; }
  const st = ring(); panel();
  $('#key-hint').textContent = st.whole ? KEY.completeSub : openGame ? KEY.rowGo : KEY.hint;
  /* a real config mismatch outranks the placeholder note — one of them is a fault, the other is a choice Aiden just
     made on the Testing screen. But the placeholder note is never silent while the fill is on (A.2): a derived number
     on screen has to say it is derived, or it is indistinguishable from one he set. */
  const miss = barsMissing(); const fake = barsFaked() && t.id !== 'clear';
  $('#key-warn').hidden = !miss.length && !fake;
  if (miss.length) $('#key-warn').textContent = T(KEY.mismatch, { n: miss.length, keys: miss.join(', ') });
  else if (fake) $('#key-warn').textContent = KEY.faked;
  // B.20: a key that has just become whole gets its moment, once per tier per profile
  if (st.whole && !demo) { const seen = prefs.keyWhole || {}; if (!seen[t.id]) { seen[t.id] = 1; prefs.keyWhole = seen; save(); setTimeout(() => wholeMoment(), 260); } } }

/* ---------- 9.5: the short advance. The segment that just lit walks in, and its row flashes ----------
   5.1 adds the background glow: the whole root of the game that earned it lights behind the segment for the length of
   the animation, so what is being said is "this game moved", not only "a line grew". */
function advance(a) { if (!a) return; const el = $(`[data-seg="${a.g}:${a.was}"]`); if (el) { el.classList.remove('grow'); void el.getBoundingClientRect(); el.classList.add('grow'); }
  const rt = $(`.kr[data-rg="${a.g}"]`); if (rt) { rt.classList.remove('glow'); void rt.getBoundingClientRect(); rt.classList.add('glow'); }
  const row = $('#krow-' + a.key.replace(/[:.]/g, '_')); if (row) row.classList.add('newthing'); }
/* B.20: the whole-key moment. The hub glyph turns and flares, every root glows once, the count line lands. It plays over
   the ring that is already drawn — nothing is redrawn — and comes off by itself. Also what Testing's "key complete" plays. */
function wholeMoment() { const el = $('#s-key'); el.classList.remove('kwhole'); void el.getBoundingClientRect(); el.classList.add('kwhole');
  setTimeout(() => el.classList.remove('kwhole'), 3400); }

/* 5.1: the interlude. The result screen has already faded and locked input; this plays the clear and hands itself back.
   It is one path for every game — the result screen never decides what the animation is, and this screen never decides
   what happens after it, which is why neither had to learn about the other (A4).
   B.21: if this is the first time the screen has ever been seen, the ARRIVAL plays first and the segment waits for it. */
function interlude(a, back) { const el = $('#s-key'); el.classList.add('auto');
  const arrive = firstIn() ? 2600 : 0;
  setTimeout(() => advance(a), arrive);
  // v17 (B.33): the animations run at 1.5x their old length, so the interlude has to wait 1.5x as long or it would hand
  // itself back over the top of the halo it just lit. One number, and it is the only place either length is written
  setTimeout(() => { el.classList.remove('auto'); auto = null; show(back); emit('key:done'); }, 3900 + arrive); }

// 5.4: once per profile, the whole screen arrives rather than simply being there. Answers whether it played
function firstIn() { if (prefs.keySeen) return false; prefs.keySeen = 1; save();
  const el = $('#s-key'); el.classList.add('first'); setTimeout(() => el.classList.remove('first'), 2600); return true; }

register('s-key', { onShow({ advance: a, from, auto: to, tier, whole, arrive } = {}) { cameFrom = from || null; pending = a || null; auto = to || null; demo = !!(whole || arrive);
    if (a) { openKey = keyTierIx(a.tier); openGame = a.g; }
    if (tier !== undefined) openKey = tier;
    // B.26: Testing asks for the arrival again by clearing the flag first; it asks for the whole-key moment by name
    if (arrive) { prefs.keySeen = 0; }
    render();
    // v16 (1.3): each key tier has its own loop, rising in intensity the way the glyphs do. The screen change starts key 1;
    // this and the tier button keep it in step with whichever tier is open
    Music.menu(keyTiers()[openKey].track);
    if (!auto) firstIn();
    if (whole) setTimeout(() => wholeMoment(), 300);
    if (pending) { const p = pending; pending = null; if (auto) setTimeout(() => interlude(p, auto), 320); else setTimeout(() => advance(p), 260); } },
  // a fresh clear arrived from a result screen: Back belongs to the run, not to the menu
  onBack() { if (auto) return true; if (!cameFrom) return false; const to = cameFrom; cameFrom = null; show(to); return true; } });
const keyTierIx = id => Math.max(0, keyTiers().findIndex(k => k.id === id));
define({
  'key-tier'(el) { openKey = +el.dataset.kt; openGame = null; render(); Music.menu(keyTiers()[openKey].track); return 'pick'; },
  'key-game'(el) { const g = el.dataset.kg; openGame = openGame === g ? null : g; render(); return 'pick'; },
  // B.23: a tap on the ring's own ground is nothing — not Back, not a sound
  'key-ground'() { return undefined; },
  /* 5.2: go and try this one. A locked mode or length hands over to the lock box — the same event the pick sheet and the
     Unlocks screen raise — and everything else starts the run with the bar as the goal line. `aim` names the game so the
     run's own here() can take it back out again while you are inside that game (v14 3.3). */
  'key-row'(el) { const [g, d, s] = el.dataset.kk.split(':'); const sc = +s;
    if (!isOpen(g, d)) { emit('lock:ask', { g, d }); return 'pick'; }
    if (!lenOpen(g, d, sc)) { emit('lock:ask', { g, d, s: sc }); return 'pick'; }
    const c = gameKey(g, tierId()).list.find(x => x.key === el.dataset.kk);
    const name = `${GAMES[g].name}${MODE_NAME[d] ? ' · ' + MODE_NAME[d] : ''} · ${lenName(g, sc, d)}`;
    goWhere({ g, d, s: sc, need: T(KEY.aim, { name, want: c ? wantTxt(c) : '' }) }); return 'click'; },
});
