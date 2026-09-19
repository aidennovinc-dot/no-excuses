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

   BUILD 40 (v23 §L.8, §L.10, §L.12):
   · L.10a KEY 1 IS QUIET UNTIL THE GAMES CHEST. All three keys are crossed out before it; the screen shows the modes count, the meter
     and the four chests, and nothing about key 1's numbers.
   · L.8a the count line carries THE METER — "19 of 30 · 142%" — the same meter() the menu and the map read; a key's strip % is its own
     band's share of it.
   · L.8b A READY CHEST OPENS HERE, BY ITSELF. (RETIRED at build 43 — C.1, below.)
   · L.12 a WHOLE key is a tap target — the hub glyph — that goes to its chest on the map. keyChest() on progress/key.js is the one read.

   BUILD 43 (v24 §B.2, §B.3, §C.1, §C.2, §C.3, §C.5, §C.6):
   · C.2 / C.3 THE PRO AND AUTHOR KEYS HAD LOST THEIR MUSIC, and it was one line, not the build-42 rewrite of the themes. Build 42 (L.7b,
     guess) played a key's theme on its screen only once the chest THAT KEY OPENS was open — the Pro chest for Pro, the Author chest for
     Author — so a player on the Pro tab heard the menu loop until Pro was finished. Key 1 kept its theme because its Skill chest was already
     open. A key's theme now plays on its screen the moment its TIER is open; SET THIS MUSIC still waits for the chest it opens (a reward).
   · C.1 THIS SCREEN NEVER OPENS A CHEST BY ITSELF. L.8b's open-on-arrival and the interlude's open are gone. A READY chest is opened by a
     deliberate tap: the key (the hub glyph of a whole key, or the quiet screen's key while the Games chest waits), or the chest itself in
     the row — it ASKS ("Open the Skill chest?"), then it opens. Batch 16's removal of the mid-flow "proceed to Pro" step stands; this is a
     trigger the player asks for.
   · B.2 / B.3 A READY CHEST TAPPED ON THE MAP never flashes this screen and never cuts a key animation short. With nothing unseen it opens on
     the frame the screen is shown — the ceremony covers the screen before it is ever painted. With the arrival (5.4) or the key's earn
     moment (C.5) not yet seen, that animation plays IN FULL, input held, and the chest opens after it. Never started and interrupted.
   · C.5 EARNING A KEY is its own animation per tier — keyStage(tier), drawn from config/keys.js KEY_EARN as named steps, its sound from that
     key's theme (Snd.keyEarn) on the last beat, and a step's own sound from KEY_STEP_FX. TWO SECONDS AT MOST since build 51 (v27 item 14), at
     least three quarters of it movement, a tap skips it, and it is the chest PROMPT that waits for it rather than the player. Inside a result
     interlude it follows the segment and the hand-back waits for it.
   · C.6 each key's screen draws its own background over the live one — ui/atmosphere.js setKeyLayer(), the tier's `style` — once its tier
     is open.

   The rules and the numbers are progress/key.js, config/key-bars.js and config/keys.js. Nothing about which combinations
   exist is written here — the panel under the ring renders whatever combos() returned, so a mode added to config/games.js
   shows up on this screen the same day. A combination with no bar renders as "no bar set" rather than vanishing (C.6). */
import { Music, Snd } from "../../audio.js";
import { HIDE_UNRECORDED } from "../../config/build.js";
import { CHESTS } from "../../config/chests.js";
import { CARD, GAUNTLET, GRID, KEY, SHEET } from "../../config/copy.js";
import { KEY_NOTE } from "../../config/key-bars.js";
import { EARN_SKIP_AT, KEY_ART, KEY_EARN, KEY_FINISH, KEY_INTRO } from "../../config/keys.js";
import { MESSAGES } from "../../config/messages.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { emit, on } from "../../core/events.js";
import { everywhere, prefs, save } from "../../core/store.js";
import { GAMES, lenFull, lenName } from "../../games/registry.js";
import { isOpen, lenOpen, modeCount } from "../../progress.js";
import { bandPct, barOf, barsFaked, barsMissing, chestOpen, chestState, gameKey, isCleared, keyChest, keyFinished, keyGaunt, keyState, keyTiers, meter, openChest, retroTier, skey, tierOpen } from "../../progress/key.js";
import { goWhere } from "../../run/run.js";
import { scoreTxt } from "../format.js";
import { capture, define, lock } from "../actions.js";
import { setKeyLayer } from "../atmosphere.js";
import { chestStage } from "../ceremony.js";
import { chestCol, chestSvg, giftsOf } from "../chest.js";
import { playReveal, revealGo, revealOn, revealTap, stopReveal } from "../reveal.js";
import { register, show } from "../router.js";
import { toast } from "../toast.js";

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
/* v21 (G.2 + v20 D.7, build 37 — quoting v17 §A.1, which this NARROWS): ALL THREE KEYS ARE ON THE STRIP FROM THE START. A key
   whose tier is not open yet is crossed out — crossed, not greyed, the locked-mode pattern — with what opens it underneath,
   and nothing about its numbers: no %, no whole mark, no ring (a tap says what opens it and goes nowhere). G.4: a key
   holding clears banked retroactively when a chest opened wears L8's green until those rows have been seen.
   v23 (L.10a, build 40): KEY 1 TOO — until the Games chest it is crossed out with "open the Games chest" under it. A key that is open
   wears its own band's share of the meter (bandPct), the same figure meter() adds for it.
   v26 (item 9, build 48): A KEY CARD SAYS ITS NAME AND NOTHING ELSE ABOUT WHAT IT IS — the italic LANTERN / CIRCUIT / THORN line is gone. Those are
   the names of each key's background and music (Customise and the music row), not of the key. The card keeps its own percentage. */
const shown = () => keyTiers();
const keyLocked = k => !tierOpen(k.id);
function keys() {
  const list = shown(), retro = Object.keys(prefs.retro || {});
  $('#key-keys').classList.remove('one');
  $('#key-keys').innerHTML = list.map(k => { const locked = keyLocked(k), fresh = !locked && retro.some(x => retroTier(x) === k.id);
    const pct = k.whole ? '' : T(KEY.pct, { n: k.shell ? 0 : bandPct(k.id) });
    const under = locked ? `<u class="need">${esc(T(SHEET.toUnlock, { need: k.i === 0 ? KEY.gamesChest : KEY.prevChest }))}</u>` : `<u>${k.whole ? KEY.unlocked : pct}</u>`;
    return `<button class="kkey${k.i === openKey ? ' sel' : ''}${k.whole && !locked ? ' whole' : ''}${k.shell ? ' shell' : ''}${locked ? ' locked' : ''}${fresh ? ' newthing' : ''}" data-act="key-tier" data-kt="${k.i}" style="--ktint:${k.tint};--kground:${k.ground}">`
      + glyph(k.id, 't' + (k.i + 1)) + `<b class="${locked ? 'x' : ''}">${esc(k.name)}</b>` + under + `</button>`; }).join('');
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
    + `<circle class="khit" r="21"></circle>${arc}${dot}</g>`; }
/* v25 (item 12, build 45): THE NAMES AND COUNTS SIT CLEAR OF EVERY LINE. Each game's name and its n/m hung at fixed offsets off the node — the count
   on the INWARD side, which is where the spoke runs (Quick Tap's 1/6, Timing's 0/4 and Sequence's 0/2 had a line through them), and the two side
   nodes' names straight across the ring (Reaction, Estimate). They are ONE text now, "Quick Tap 6/6", in a layer drawn after everything else, and
   each is PLACED: the first of a short list of spots round its node whose box no spoke, corner dot, thorn, hub outline, node or the ring itself
   reaches, measured off the geometry actually drawn — so Lantern, Circuit and Thorn each find their own. The ring counts whether or not its arcs are
   drawn yet, so a label does not jump the day its game comes home. A spot that leaves the drawing or lands on another label is never taken; if
   every spot is touched, the least-touched one is. */
const LABEL_PAD = 2.5, LABEL_STEP = 2.5;
function labelSpots(nx, ny) { const a = Math.atan2(ny - CY, nx - CX), ux = Math.cos(a), uy = Math.sin(a), s = Math.sign(ux) || 1;
  const out = s > 0 ? 'start' : 'end', inn = s > 0 ? 'end' : 'start', old = [nx, ny < CY ? ny - 17 : ny + 24, 'middle'];
  if (Math.abs(ux) < .35) return [[nx, uy < 0 ? ny - 15 : ny + 23, 'middle'], [nx, uy < 0 ? ny - 26 : ny + 34, 'middle'], old];
  if (uy < -.35) return [[nx - 10 * s, ny - 16, out], [nx + 12 * s, ny - 9, out], old];
  if (uy > .35) return [[nx + 12 * s, ny + 17, out], [nx - 10 * s, ny + 22, out], old];
  return [[nx - 14 * s, ny + 23, inn], [nx - 14 * s, ny - 14, inn], [nx + 12 * s, ny + 4, out], old]; }
// every point a label must stay off, in the ring's own units: the drawn lines, the full ring, and each node's marker
function labelObstacles(svg) { const pts = [];
  svg.querySelectorAll('.kroot,.kdot2,.kthorn,.khub').forEach(el => { let len = 0; try { len = el.getTotalLength(); } catch (e) { return; }
    for (let s = 0; s <= len; s += LABEL_STEP) { const p = el.getPointAtLength(s); pts.push([p.x, p.y]); } });
  const ringN = Math.ceil(2 * Math.PI * R_RING / LABEL_STEP);
  for (let k = 0; k < ringN; k++) { const t = k / ringN * 2 * Math.PI; pts.push([CX + Math.cos(t) * R_RING, CY + Math.sin(t) * R_RING]); }
  games().forEach((g, i) => { const [x, y] = at(i, R_RING); for (let k = 0; k < 16; k++) { const t = k / 16 * 2 * Math.PI; pts.push([x + Math.cos(t) * 8, y + Math.sin(t) * 8]); } });
  return pts; }
// how badly a box sits: points of line inside it, another label under it, or off the drawing
function labelCost(b, pts, taken) { let n = 0;
  for (const [x, y] of pts) if (x > b.x - LABEL_PAD && x < b.x + b.width + LABEL_PAD && y > b.y - LABEL_PAD && y < b.y + b.height + LABEL_PAD) n++;
  for (const t of taken) if (b.x < t.x + t.width && b.x + b.width > t.x && b.y < t.y + t.height && b.y + b.height > t.y) n += 500;
  if (b.x < -20 || b.x + b.width > 320 || b.y < -16 || b.y + b.height > 318) n += 1000;
  return n; }
function placeLabels() { const svg = $('#key-ring'), layer = svg && svg.querySelector('.klabels'); if (!layer) return;
  const pts = labelObstacles(svg), taken = [];
  layer.querySelectorAll('text').forEach(t => { const nx = +t.dataset.nx, ny = +t.dataset.ny; let best = null;
    for (const [x, y, anchor] of labelSpots(nx, ny)) { t.setAttribute('x', f1(x)); t.setAttribute('y', f1(y)); t.setAttribute('text-anchor', anchor);
      const b = t.getBBox(); if (!b.width) return;   // not laid out (a hidden screen): keep the first spot
      const cost = labelCost(b, pts, taken); if (!best || cost < best.cost) best = { x, y, anchor, cost, b: { x: b.x, y: b.y, width: b.width, height: b.height } };
      if (!cost) break; }
    if (!best) return; t.setAttribute('x', f1(best.x)); t.setAttribute('y', f1(best.y)); t.setAttribute('text-anchor', best.anchor); taken.push(best.b); }); }
const labelsHtml = st => `<g class="klabels">${st.games.map((g, i) => { const [nx, ny] = at(i, R_RING);
  return `<text class="klbl${g.done === g.total ? ' home' : ''}${openGame === g.g ? ' sel' : ''}" data-act="key-game" data-kg="${g.g}" data-nx="${f1(nx)}" data-ny="${f1(ny)}" x="${f1(nx)}" y="${f1(ny < CY ? ny - 17 : ny + 24)}" text-anchor="middle">${esc(GAMES[g.g].name)}<tspan class="knum" dx="5">${g.done}/${g.total}</tspan></text>`; }).join('')}</g>`;
function arcAt(i) { const a = angleOf(i), w = Math.PI / 7; const p = t => [CX + Math.cos(t) * R_RING, CY + Math.sin(t) * R_RING]; const [x0, y0] = p(a - w), [x1, y1] = p(a + w);
  return `M${f1(x0)} ${f1(y0)}A${R_RING} ${R_RING} 0 0 1 ${f1(x1)} ${f1(y1)}`; }
// the ground behind the ring, by style: a warm radial for Lantern, a dot grid for Circuit, nothing for Thorn (C.4: the live background is its ground)
function groundOf(style) {
  if (style === 'lantern') return `<defs><radialGradient id="kglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--ktint)" stop-opacity=".28"/><stop offset=".45" stop-color="var(--ktint)" stop-opacity=".08"/><stop offset="1" stop-color="var(--ktint)" stop-opacity="0"/></radialGradient></defs><circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="url(#kglow)"></circle>`;
  if (style === 'circuit') return `<defs><pattern id="kdots" width="12" height="12" patternUnits="userSpaceOnUse"><rect x="5.4" y="5.4" width="1.2" height="1.2" fill="var(--kdim)"/></pattern></defs><circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="url(#kdots)"></circle>`;
  return `<circle class="kground" data-act="key-ground" cx="${CX}" cy="${CY}" r="${R_RING + 18}" fill="transparent"></circle>`; }
/* v25 (item 13, build 46): AN UNFINISHED KEY AND A FINISHED ONE NO LONGER LOOK THE SAME. Both wore the tier's glow, so a key 3% of the way
   along read as a key that had been earned. `kdone` is the whole of the difference and it is on the screen, not on one element: without it
   there is no glowing ground, no drop shadow anywhere, the hub glyph is drawn in the tier's own `dim` and the outer ring is not drawn; with
   it the key takes KEY_FINISH's scale, the tier's full tint and glow, a slow breathing pulse, and the ring is drawn round the whole thing.
   The key's card at the top of the screen takes the same pulse. The first-open reveal (item 11) ENDS in this state. */
function ring() { const tier = keyTiers()[openKey]; const st = keyState(tier.id); const style = tier.style || 'lantern';
  const parts = st.games.map((g, i) => root(i, g, style) + node(i, g, style)).join('');
  const F = KEY_FINISH[tier.id] || KEY_FINISH.clear, done = st.whole;
  const el0 = $('#s-key'); el0.classList.toggle('kdone', done);
  el0.style.setProperty('--kscale', String(F.scale)); el0.style.setProperty('--kpulse', F.pulse + 'ms');
  el0.style.setProperty('--kglow', F.glow + 'px'); el0.style.setProperty('--kringw', F.ringW); el0.style.setProperty('--kringop', String(F.ringOp));
  // the outer ring is the finished key's own mark, so it is drawn only when the key is whole — and in the tier's tint, a step heavier each tier
  const outer = done ? `<circle class="kring" cx="${CX}" cy="${CY}" r="${R_RING}"></circle>` : '';
  /* the hub glyph is the tier's own art, scaled into the hub. v23 (L.12, build 40): a WHOLE key whose chest is ready or open is a tap
     target — a hit disc over the hub carries `key-chest` and the chest's name, and the hint under the ring says what the tap does.
     v24 (C.1, build 43): a READY chest's tap asks first; an open one still goes to the map */
  const kc = keyChest(tier.id);
  /* v24 (C.5, build 43): the animated group carries NO transform attribute — the translate sits on a group inside it. A CSS scale or rotate on
     an SVG element that has a transform attribute composes inside it (the build-41 lesson), and the earn moments threw the glyph off the hub */
  const hub = `<g class="kglyph${st.whole ? ' whole' : ''}${kc ? ' tochest' : ''}"><g transform="translate(${CX - 24} ${CY - 24})">${KEY_ART[tier.id].map(d => `<path d="${d}"></path>`).join('')}</g></g>`
    + (kc ? `<circle class="khubhit" data-act="key-chest" data-chest="${kc.id}"${kc.gaunt ? ` data-gaunt="${kc.gaunt}"` : ''} cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>` : '');
  $('#key-ring').innerHTML = groundOf(style) + outer + `<circle class="khub" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>` + hub + parts + labelsHtml(st);
  $('#key-ring').classList.toggle('whole', st.whole); placeLabels();
  /* v17 (§A.6.7) / v18 (B.15): "19 of 30 · 74%" stays HERE — the cleared count is what a player acts on and this is the
     screen they act on it from. v23 (L.8a, build 40): the percentage is THE METER now — "19 of 30 · 142%" — the one figure every
     surface reads; the count is still this key's own */
  /* v26 (item 9, build 48): "1 of 30" — no percentage. The card at the top carries this key's own share and the menu the total; two figures on
     one screen ("3%" on the card, "1 of 30 · 103%" under the key) read as two numbers that disagreed */
  $('#key-count').textContent = st.whole ? T(KEY.complete, { key: tier.name }) : T(KEY.count, { done: st.done, total: st.total });
  return st; }

/* ---------- the panel: one game's combinations ---------- */
// the bar in the game's own units. scoreTxt already carries the mode's suffix (%, s, px, ms); where a mode has none —
// a count of hits, rounds or miscounts — the word comes from the bar's own `unit`, so nothing is ever printed twice
function barTxt(c, bar) { const n = scoreTxt(c.g, bar, c.d, c.s); return /[^\d.]$/.test(n) || !c.bar.unit ? n : n + ' ' + c.bar.unit; }
const wantTxt = c => { const bar = barOf(c, tierId()); return bar === null ? KEY.none : T(c.bar.dir === 'lower' ? KEY.ceil : KEY.floor, { bar: barTxt(c, bar) }); };
// v29 Section A (57.5, build 57): no `kpanel` class and no step-down — the ring is locked to one size and the list scrolls under it
function panel() { const box = $('#key-list');
  if (!openGame) { box.innerHTML = ''; box.hidden = true; return; }
  const tier = tierId(); const st = gameKey(openGame, tier); box.hidden = false;
  // v21 (G.4, build 37): a row cleared RETROACTIVELY when a chest opened wears L8's green the first time it is on screen
  const retro = prefs.retro || {}, spent = [];
  const rows = st.list.map(c => { const done = isCleared(c.key, tier), rk = skey(c.key, tier), fresh = done && !!retro[rk]; if (fresh) spent.push(rk);
    const name = (MODE_NAME[c.d] ? MODE_NAME[c.d] + ' · ' : '') + lenFull(c.g, c.s, c.d);
    // 5.2: the row is a control now, so it carries an act like everything else does
    return `<div class="krow${done ? ' done' : ''}${fresh ? ' newthing' : ''}${barOf(c, tier) === null ? ' nobar' : ''}" data-act="key-row" data-kk="${c.key}" id="krow-${c.key.replace(/[:.]/g, '_')}"><b>${esc(name)}</b><i>${esc(wantTxt(c))}</i><u>${done ? KEY.cleared : KEY.open}</u></div>`; }).join('');
  box.innerHTML = `<div class="keyblk"><h4>${esc(GAMES[openGame].name)} <span>${T(KEY.root, { done: st.done, total: st.total })}</span></h4>`
    + `<p>${esc(KEY_NOTE[openGame] || '')}</p>${rows}</div>`;
  // …and then the mark is spent, once each (L8)
  if (spent.length) { for (const rk of spent) delete retro[rk]; prefs.retro = retro; save(); } }

/* ---------- v23 (L.7b, build 42): what plays on a key's screen, and SET THIS MUSIC at its foot ----------
   v24 (C.2 / C.3, build 43): A KEY'S THEME PLAYS ON ITS SCREEN ONCE ITS TIER IS OPEN. Build 42 waited for the chest the key OPENS, which put the
   menu loop on the Pro and Author tabs until those keys were finished — the two "lost" themes. The quiet screen (key 1 before the Games chest)
   still plays the menu loop: no tier is open there. SET THIS MUSIC is still a reward and still waits for that chest (`music` in config/keys.js).
   A tap stores that chest in prefs.everywhere — every run's music from then on — and the button reads PLAYING EVERYWHERE in green. There is one
   button and one field, so the other two keys read SET THIS MUSIC again the moment they are on screen. Customise's Everywhere row writes the
   same field through the same store, and neither screen imports the other (A4). */
const themeOf = t => tierOpen(t.id) ? t.track : 'menu';
// v28 (item 2, build 53): the button waits for the KEY, not for the chest that key opens — the same line Customise's Music row now takes
function musicBtn(t) { const b = $('#key-music'), open = !!t.music && keyFinished(t.id), on = open && everywhere() === t.music;
  b.hidden = !open; b.classList.toggle('on', on); b.textContent = on ? KEY.musicOn : KEY.setMusic; }

/* ---------- which key is on screen ---------- */
/* L.10a's row of four chests under the quiet screen's key is GONE (v26, Aiden's answer to build 48's open questions, built for build 49): once
   tapping the key asks again, the row's ready Games chest was a second button to the same ask, and the map already shows all four chests. */
function render() { const tiers = keyTiers();
  // a tier that is not open cannot be the one on screen: fall to the first open one, or to key 1 on the quiet screen (L.10a)
  if (!tierOpen(tiers[openKey].id)) { const i = tiers.findIndex(k => tierOpen(k.id)); openKey = i < 0 ? 0 : i; }
  const t = tiers[openKey]; keys(); musicBtn(t);
  // B.31 / B.22: the tier's own tint, dim and ground dress the whole screen, out of config/keys.js. No colour is named here
  const el = $('#s-key'); el.style.setProperty('--ktint', t.tint); el.style.setProperty('--kdim', t.dim || 'var(--line)'); el.style.setProperty('--kground', t.ground); el.dataset.theme = t.id; el.dataset.style = t.style || '';
  $('#key-title').textContent = t.name.toLowerCase();
  /* v23 (L.10a / §M.2, build 40): BEFORE THE GAMES CHEST NO TIER IS OPEN, and the screen says only what opens it — the modes count, the
     meter and the four chests. No ring, no bars, no key-1 numbers: they arrive when the chest opens, credited silently (G.4) */
  const quiet = !tierOpen(t.id);
  // v24 (C.6, build 43): this key's own background over the live one — once its tier is open; the quiet screen has no key to dress it
  setKeyLayer(quiet || t.shell ? null : t.style);
  $('#key-main').hidden = !!t.shell || quiet; $('#key-shell').hidden = !t.shell && !quiet;
  if (quiet) { const m = modeCount(), ready = chestState('games') === 'ready', big = glyph(t.id, 't1 big');
    // C.1: while the Games chest waits, the quiet screen's key is the way to its ask
    $('#key-shell').innerHTML = `${ready ? `<button class="kquiet" data-act="key-chest" data-chest="games">${big}</button>` : big}<p>${esc(ready ? KEY.quietReady : KEY.quiet)}</p><p class="soon" id="key-quiet-count"></p>`;
    $('#key-quiet-count').textContent = T(KEY.quietCount, { open: m.open, total: m.total }); return; }
  if (t.shell) { $('#key-shell').innerHTML = `${glyph(t.id, 't' + (openKey + 1) + ' big')}<p>${esc(t.lede)}</p><p class="soon">${esc(KEY.soon)}</p>`; return; }
  const st = ring(); panel();
  // L.12: a whole key says what a tap on it does — open its waiting chest (C.1: it asks first), or see what its chest gave
  const kc = keyChest(t.id);
  /* v29 Section A (58.2, build 58): the third state — the key is whole and its chest wants a finished Gauntlet as well.
     `keyChest` answers `gaunt` for it, and the hint names the Gauntlet rather than promising a chest that will not open. */
  const kcLine = !st.whole ? null : kc && kc.state === 'open' ? KEY.completeOpen
    : kc && kc.state === 'ready' ? T(KEY.completeReady, { chest: GRID.chest[kc.id] })
    : kc && kc.state === 'gaunt' ? T(KEY.completeGaunt, { name: GAUNTLET.name[kc.gaunt] || kc.gaunt }) : KEY.completeSub;
  $('#key-hint').textContent = st.whole ? kcLine : openGame ? KEY.rowGo : KEY.hint;
  /* v30 (59.6, build 59): AND THE KEY CARRIES ITS GAUNTLET. 59.6 takes the Gauntlet requirement off the chest's map tile, where
     it did not fit, and gives it to the key as a standing line — "Only Gauntlet Mega can wield it." — shown from the moment the
     tier is open rather than only once the key is whole, because a player holding the key with the Gauntlet unfinished is
     exactly the person who needs the reason. `keyGaunt` is that standing fact; `keyChest` answers the live state and still
     drives the hint above. It hides while a game's panel is open, which is the one time this screen is short of room. */
  { const gid = keyGaunt(t.id), wi = $('#key-wield');
    if (wi) { const on = !!gid && !openGame; wi.hidden = !on;
      wi.textContent = on ? T(KEY.wield, { name: GAUNTLET.name[gid] || gid }) : ''; } }
  /* a real config mismatch outranks Testing's in-memory fill — one is a fault, the other a dev switch (S5).
     v25 (item 14, build 45, superseding #428 on this screen): THE RED "N OF THE 30 NUMBERS ON THIS KEY ARE PLACEHOLDERS" LINE IS GONE. This screen
     is written for the player; it covered the requirements under it, and which numbers are placeholders is Aiden's to know, not the player's —
     isPlaceholder() still answers it for the catalogue and the generator (A.2 as amended at #426). */
  const miss = barsMissing(); const fake = barsFaked() && t.id !== 'clear';
  $('#key-warn').hidden = !miss.length && !fake;
  if (miss.length) $('#key-warn').textContent = T(KEY.mismatch, { n: miss.length, keys: miss.join(', ') });
  else if (fake) $('#key-warn').textContent = KEY.faked;
  /* B.20 → v24 (C.5, build 43): a key that has just become whole gets its EARN moment, once per tier per profile — never under a chest
     ceremony, which would hide it and spend it. `earnAt` is when it starts: 260ms after the screen draws, or after the segment inside an
     interlude (onShow sets it); `earnPlan` tells the interlude and the map's open path how long to wait for it */
  /* v25 (item 11, build 46): and the moment a key becomes whole is the REVEAL now, not the bare earn. It plays ONCE — `prefs.revealed`,
     which Testing's per-chest reset clears, so on Aiden's phone resetting a chest makes it a first time again. `prefs.keyWhole` is kept
     beside it: it is build 32's record of the earn having played, and a profile that has it does not get the reveal handed to it late. */
  if (st.whole && !demo && !revealOn()) { const seen = prefs.revealed || {}; if (!seen['key:' + t.id] && !(prefs.keyWhole || {})[t.id]) { earnPlan = t.id; clearTimeout(earnT); earnT = setTimeout(() => keyReveal(t.id), earnAt); } }
  // v26 (item 10, build 48): with a reveal due, the words under the key wait for it — the tap instruction is shown once the animation has finished
  el.classList.toggle('kdue', !!earnPlan || (demo && revealOn())); }

/* ---------- 9.5: the short advance. The segment that just lit walks in, and its row flashes ----------
   5.1 adds the background glow: the whole root of the game that earned it lights behind the segment for the length of
   the animation, so what is being said is "this game moved", not only "a line grew". */
function advance(a) { if (!a) return; const el = $(`[data-seg="${a.g}:${a.was}"]`); if (el) { el.classList.remove('grow'); void el.getBoundingClientRect(); el.classList.add('grow'); }
  const rt = $(`.kr[data-rg="${a.g}"]`); if (rt) { rt.classList.remove('glow'); void rt.getBoundingClientRect(); rt.classList.add('glow'); }
  const row = $('#krow-' + a.key.replace(/[:.]/g, '_')); if (row) row.classList.add('newthing'); }

/* ---------- v27 (item 14, build 51): EARNING A KEY — ONE ANIMATION, TWO SECONDS AT MOST ----------
   This replaces build 43's earn moment (C.5, `kwhole` over the ring) AND build 46's first-open reveal (item 11, the games introduced one at a time
   round the key). Nested, they ran 6.3s / 8.0s / 10.5s with nothing tappable, which is the "~5s of pulsing with the player unable to move on" Aiden
   played on build 50. What he asked for on 2026-09-15 was that the CHEST must not open midway through the key's animation; the fix for that is the
   prompt waiting, not a longer animation.

   config/keys.js KEY_EARN is `ms` and a list of NAMED STEPS. This file knows how to draw a step BY ITS NAME and nothing else — every time goes on
   the screen as a custom property the stylesheet reads (`--earn-ms`, `--st-<name>-at`, `--st-<name>-ms`) — so a re-tune is a number edit there and
   the gate holds the names to the ones item 14 wrote. The step names, across the three tiers:
     spokes  the seven game spokes fire INWARD, one at a time, `spokes.gap` apart (Skill and — since build 52, Aiden's answer — Pro)
     trace   a CURRENT runs the ring from each spoke to the next, arriving as that one fires (Pro; `spokes.trace` is one current's flight)
     spin    the key spins once and clicks upright as the last spoke lands (Skill)
     snap    the key snaps a quarter turn like a key in a lock — hard stop, slight overshoot (Pro)
     ring    the outer ring flashes (Pro)
     drop    the key falls in from above (Author)   ·   slam  it hits the centre, and the screen shakes `shake` px
     crack   `cracks` cracks run outward from the ring   ·   thorns  `thorns` spikes flick out round the rim
     flash   THE CLOSING GLOW, and the only step that is not movement — a flash, never a hold (EARN_GLOW in config/keys.js names it)
   Each step lands with its own sound (Snd.keyStep, config/audio.js KEY_STEP_FX), except a spoke firing alone, which lands with ITS OWN GAME'S
   sound — Snd.mapFx, the family the map's first open uses, and the one thing of build 46's reveal worth keeping. The key's own earn sound
   (Snd.keyEarn) is fired ON THE FLASH so it lands on the last beat (item 14); it rings on past the animation the way music does, and nothing
   waits for it.

   A TAP SKIPS TO THE END AND THE SCREEN NEVER LOCKS: the capture below finishes every animation the stage started and lets the reveal settle at
   once. ui/reveal.js swallows a tap before the stage is done, so the skip is registered here, on the same capture the title sequence uses. */
const ARRIVE_MS = 2600, EARN_AT = 260, OPEN_GAP = 250;   // the arrival's own length; when a due earn starts after the screen draws; the beat between an animation ending and a chest opening (guess)
let earnAt = EARN_AT, earnT = 0, earnPlan = null, introT = 0;
const earnOf = tier => KEY_EARN[tier] || KEY_EARN.clear;
/* the extra layers a tier draws, on top of the ring that is already there: the Author key's cracks running out of the rim and the thorns flicking
   out round it. The counts are config/keys.js (`cracks`, `thorns`); nothing else in the app knows these paths */
function earnLayers(tier) { const E = earnOf(tier), out = [];
  // the closing flash of the ASSEMBLY: a bloom out of the hub in the key's own tint on the `flash` step, 240-280ms and gone (item 14)
  out.push(`<circle class="keflash" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>`);
  /* v28 (item 15, build 53): THE FINALE. `rise` is the whole key settling up into its finished state while the music runs out — a halo of light
     spreading out of the hub for the whole of the step, with the ring itself growing and its glow strengthening (the stylesheet, off `finale`) —
     and `land` is one last hit on the final note. Two drawn elements, so neither has to share an animation with the assembly's own. */
  out.push(`<circle class="kerise" cx="${CX}" cy="${CY}" r="${R_RING}"></circle>`, `<circle class="keland" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>`);
  /* v27 (Aiden's answer to build 51, build 52): THE PRO KEY'S CIRCUITRY BETWEEN THE SPOKES. "One by one around like a clock, but have a
     circuitry type animation between each one." One link per PAIR of adjacent spokes — six for seven spokes — and each is drawn the way the
     Circuit style draws everything else: a radial stub out of the node it leaves, an arc round the outside of the ring, a radial stub back
     into the node it arrives at, so the corners are right angles and it reads as a trace and not as a swoosh. The current runs it as a dash
     (`kecur` below), timed to LAND as the next spoke fires. Only a tier with a spoke gap and a `trace` time draws these. */
  if (E.spokes && E.spokes.gap > 0 && E.spokes.trace) { const n = games().length, RO = R_RING + 12;
    for (let i = 0; i < n - 1; i++) { const a0 = angleOf(i), a1 = angleOf(i + 1);
      const p = (a, r) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
      const [x0, y0] = p(a0, R_RING), [x1, y1] = p(a0, RO), [x2, y2] = p(a1, RO), [x3, y3] = p(a1, R_RING);
      out.push(`<path class="kecur" pathLength="1" d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}A${RO} ${RO} 0 0 1 ${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}" style="--h:${i}"></path>`); } }
  for (let i = 0; i < (E.cracks || 0); i++) { const a = i * 360 / E.cracks;
    out.push(`<path class="kecrk" pathLength="1" d="M${CX} ${CY - R_RING}l-7 -26l5 -13l-3 -15" style="--i:${i};--a:${Math.round(a)}deg"></path>`); }
  for (let i = 0; i < (E.thorns || 0); i++) { const a = i * 360 / E.thorns;
    out.push(`<path class="kethn" d="M${CX - 4} ${CY - R_RING}L${CX} ${CY - R_RING - 22 - (i % 2) * 9}L${CX + 4} ${CY - R_RING}z" style="--i:${i};--a:${Math.round(a)}deg"></path>`); }
  return `<g class="kearn">${out.join('')}</g>`; }
const earnClear = () => { const r = $('#key-ring'); if (r) r.querySelectorAll('.kearn,.kearnbg').forEach(n => n.remove()); };

/* the stage the one shared reveal (ui/reveal.js) runs: it owns the clock and the taps, this owns the drawing. `hold()` is what keeps the settle
   from landing inside the animation — the finished promise of every animation the start beat put on the screen, read off the document so a
   re-tune in config/keys.js moves it without a second list of times (the build-46 rule). */
let earnSkip = null;
// v29 (item 8, build 55): the handle Snd.keyEarn() hands back, so a skip can silence the music it started. Cut in earnSkip and in clear().
let earnMusic = null;
function keyStage(tier) { const E = earnOf(tier), el = $('#s-key'), ids = [];
  const at = (t, fn) => { const h = setTimeout(() => { if (revealOn()) fn(); }, Math.max(0, t)); ids.push(h); return h; };
  // v29 (item 3, build 54): when this ceremony started, so a tap inside the first EARN_SKIP_AT ms can be turned away rather than taken
  /* v29 Section A (57.7, build 57): `carry` is whether this moment ENDED BY ITSELF. It did → the earn music is left ringing, and its tail
     plays across the cut into the chest, which is what 57.7 asks for. It was skipped or abandoned → the music is stopped, because a skip is
     the player asking to be somewhere else (v29 item 8, build 55, unchanged). */
  let anims = null, quick = false, done = null, began = 0, carry = false;
  return { ms: E.ms, settleAt: E.ms,
    steps: (E.steps || []).map(x => ({ name: x.name, at: x.at, ms: x.ms })),
    start(host, k = {}) { const ringEl = $('#key-ring'); if (!ringEl) return;
      began = performance.now();
      el.dataset.earn = tier; el.style.setProperty('--earn-ms', E.ms + 'ms');
      for (const x of (E.steps || [])) { el.style.setProperty(`--st-${x.name}-at`, x.at + 'ms'); el.style.setProperty(`--st-${x.name}-ms`, x.ms + 'ms'); }
      el.style.setProperty('--spoke-gap', ((E.spokes && E.spokes.gap) || 0) + 'ms');
      el.style.setProperty('--spoke-ms', ((E.spokes && E.spokes.each) || 300) + 'ms');
      el.style.setProperty('--trace-ms', ((E.spokes && E.spokes.trace) || 0) + 'ms');
      // build 52: the beat between one crack and the next, and one thorn and the next — config's, not the stylesheet's (Aiden: "one by one")
      el.style.setProperty('--crack-gap', (E.crackGap || 0) + 'ms'); el.style.setProperty('--thorn-gap', (E.thornGap || 0) + 'ms');
      el.style.setProperty('--earn-shake', (E.shake || 0) + 'px');
      // item 15: how grand this tier's settle is — how far the key grows, its halo in px, how far the ring of light spreads
      const F = E.finale || {}; el.style.setProperty('--earn-rise', String(F.scale || 1)); el.style.setProperty('--earn-glow', (F.glow || 0) + 'px'); el.style.setProperty('--earn-halo', String(F.halo || 1.4));
      // each spoke, node and label carries its own index, so the stylesheet walks the ring with no second list of times
      ringEl.querySelectorAll('.kr').forEach((g, i) => g.style.setProperty('--h', String(i)));
      ringEl.querySelectorAll('.knode').forEach((g, i) => g.style.setProperty('--h', String(i)));
      ringEl.querySelectorAll('.klabels text').forEach((t, i) => t.style.setProperty('--h', String(i)));
      const extra = earnLayers(tier); if (extra) ringEl.insertAdjacentHTML('beforeend', extra);
      el.classList.add('kearning'); if (k.quick) el.classList.add('kearnquick'); quick = !!k.quick;
      if (k.quick) return;   // Reduce Motion: the short fade is the whole of it, and settle() lands the finished state
      /* v28 (item 15, build 53): THE MUSIC STARTS THE CLOCK. It used to be fired on the `flash`, which is why it rang on for seconds after the
         animation had finished — the whole of what item 15 is about. It is the first thing that happens now, and `ms` is its own length. */
      if (!k.silent) { try { earnMusic && earnMusic.stop(); } catch (e) { } earnMusic = Snd.keyEarn(tier); }
      if (!k.silent) for (const x of (E.steps || [])) {
        if (x.name === 'flash') continue;
        // the Skill key's seven fire one at a time, each with its own game's sound; Pro's fire together, so the step has one sound of its own
        if (x.name === 'spokes' && E.spokes && E.spokes.gap > 0) { games().forEach((g, i) => at(x.at + i * E.spokes.gap, () => Snd.mapFx(g))); continue; }
        // build 52: the Pro key's current runs once per link, so `trace` sounds once per link and not once per step
        if (x.name === 'trace' && E.spokes && E.spokes.gap > 0) { for (let i = 0; i < games().length - 1; i++) at(x.at + i * E.spokes.gap, () => Snd.keyStep('trace')); continue; }
        at(x.at, () => Snd.keyStep(x.name)); }
      // every animation this beat started, read off the document (which brings styles up to date first) — the animation's own clock
      anims = document.getAnimations().filter(a => { const tg = a.effect && a.effect.target, tm = a.effect && a.effect.getComputedTiming();
        return tg && el.contains(tg) && !tg.closest('#key-cere') && tm && Number.isFinite(tm.endTime) && a.playState !== 'finished'; });
      /* item 14: A TAP SKIPS IT. Finishing every animation the beat started runs each to its last frame at once — so the key ends UPRIGHT and
         lit rather than frozen part-way — and resolves hold(), which is what lets the reveal settle immediately.
         v29 (item 3, build 54): NOT FOR THE FIRST EARN_SKIP_AT MS. Answering false hands the tap back to ui/reveal.js, which swallows it the way
         it swallows every tap before a stage is done — so an early tap does NOTHING, it is not queued and it does not end the moment. */
      earnSkip = () => { if (performance.now() - began < EARN_SKIP_AT) return false;
        earnSkip = null; ids.forEach(clearTimeout); ids.length = 0;
        // item 8: the step sounds were already cancelled with their timers; the MUSIC was the one thing a skip could not stop
        try { earnMusic && earnMusic.stop(); } catch (e) { } earnMusic = null;
        for (const a of (anims || [])) { try { a.finish(); } catch (e) { } }
        if (done) done(); return true; }; },
    /* the settle waits for this: the end of every animation the start beat put up. A cancelled one resolves it too (a hold that could never end
       would strand the screen), and so does a ceiling at twice the animation's length, for a phone that stops painting in the background. A tap
       resolves it through `done` — the skip's whole job. */
    hold() { if (quick) return null;
      const all = (anims || []).map(a => a.finished.then(() => 1, () => 0));
      return Promise.race([Promise.all(all), new Promise(r => { done = r; setTimeout(r, E.ms * 2 + 1000); })]); },
    step() { },
    // item 14: a tap skips to the end. ui/reveal.js asks this before the hold; answering true is what takes the tap
    skip() { return earnSkip ? earnSkip() : false; },
    /* SETTLES into the finished state (v25 item 13) — it does not SET `kdone`: ring() already put it on for a key that is whole, and Testing's
       replay on a key that is not whole must not leave the screen claiming it is finished. All settle does is stop holding it back. */
    settle() { carry = true; earnSkip = null; el.classList.remove('kearning', 'kearnquick'); delete el.dataset.earn; el.classList.add('ksettle');
      setTimeout(() => el.classList.remove('ksettle'), 600); },
    // 57.7: a moment that settled keeps its music; one that was cut short loses it. The next earn stops whatever is still ringing before it starts
    clear() { earnSkip = null; if (!carry) { try { earnMusic && earnMusic.stop(); } catch (e) { } earnMusic = null; }
      ids.forEach(clearTimeout); el.classList.remove('kearning', 'kearnquick', 'ksettle', 'kdue'); delete el.dataset.earn; earnClear(); } }; }
/* item 14: the belt. The reveal's own tap (ui/reveal.js, through `skip()` above) is the route that actually fires — its host covers the screen
   and carries a `data-act`, so ui/actions.js hands the tap to that action and never reaches a capture. This catches a tap that lands outside it. */
capture(() => { if (!earnSkip || !revealOn()) return false; return earnSkip(); });

/* ---------- v29 Section A (57.6, build 57): THE KEY BEING CREATED — the first time its screen is opened ----------
   Aiden: "only completion has an animation today". This is the other end of it — the key being MADE, once per key per profile
   (`prefs.keyIntro`, migrated at store v7 so nobody who has been playing gets three of them handed to them at once).
   It runs through the SAME shared reveal every other moment does (ui/reveal.js), as an `auto` stage with a skip, so the clock, the swallowed taps
   and the hand-over are not written a second time. Four named steps from config/keys.js KEY_INTRO — `gather`, `draw`, `forge`, `settle` — drawn
   by name and nothing else, each time a custom property, and each dressed by that key's own `style` so one set of rules is three animations:
     lantern  warm sparks drift in and pool                circuit  square nodes snap in on their grid        thorn  shards climb in from below
   The key itself is its own KEY_ART glyph — the drawing on the Keys screen and on the chest that opens it — drawn on one path at a time, struck
   on `forge`, and taking its finished tint and glow on `settle`. The bed is Snd.keyIntro (config/audio.js KEY_INTRO_FX, cut from that key's own
   theme) and each step lands with a hit that already exists: a path with `trace`, the strike with `snap`, the settle with `land`. */
const introOf = tier => KEY_INTRO[tier] || KEY_INTRO.clear;
/* where the material comes in FROM, per style — the one thing about `gather` that is not the same for all three, so it is decided here in px and
   the stylesheet reads `--dx` / `--dy` and knows nothing about it: Lantern's sparks drift in from all around, Circuit's nodes snap in off their own
   grid, Thorn's shards climb from below. */
function bitAt(style, i, n) {
  if (style === 'circuit') return [((i % 4) - 1.5) * 74, (Math.floor(i / 4) % 5 - 2) * 58];
  if (style === 'thorn') return [((i % 7) - 3) * 34, 150 + (i % 4) * 24];
  const a = (i * 360 / n + (i % 3) * 11) * Math.PI / 180, r = 96 + (i % 5) * 26;
  return [Math.cos(a) * r, Math.sin(a) * r]; }
function introArt(tier) { const I = introOf(tier), t = keyTiers().find(k => k.id === tier) || keyTiers()[0], style = t.style || 'lantern', out = [];
  for (let i = 0; i < I.bits; i++) { const [dx, dy] = bitAt(style, i, I.bits), s = 3 + (i % 4);
    out.push(`<rect class="kibit" x="${(150 - s / 2).toFixed(1)}" y="${(150 - s / 2).toFixed(1)}" width="${s}" height="${s}" style="--i:${i};--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px"></rect>`); }
  const paths = (KEY_ART[tier] || KEY_ART.clear).map((d, i) => `<path class="kipath" pathLength="1" d="${d}" style="--i:${i}"></path>`).join('');
  // .kikeyg carries the animation and NO transform attribute — a CSS scale on an element that has one composes inside it (the build-41 lesson)
  return `<svg class="kistage" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-style="${esc(style)}" style="--kt:${t.tint}">`
    + `<g class="kibits">${out.join('')}</g><circle class="kiflash" cx="150" cy="150" r="26"></circle><circle class="kiring" cx="150" cy="150" r="64"></circle>`
    + `<g class="kikeyg"><g transform="translate(78 78) scale(3)">${paths}</g></g></svg>`; }
let introSkip = null, introMusic = null;
function introStage(tier) { const I = introOf(tier), el = $('#s-key'), ids = [];
  const at = (t, fn) => { const h = setTimeout(() => { if (revealOn()) fn(); }, Math.max(0, t)); ids.push(h); return h; };
  let anims = null, quick = false, done = null, began = 0, carry = false;
  return { ms: I.ms, settleAt: I.ms,
    steps: (I.steps || []).map(x => ({ name: x.name, at: x.at, ms: x.ms })),
    start(host, k = {}) { began = performance.now();
      host.innerHTML = introArt(tier);
      const st = host.querySelector('.kistage'); if (!st) return;
      st.style.setProperty('--ki-ms', I.ms + 'ms'); st.style.setProperty('--ki-stroke', I.stroke + 'ms'); st.style.setProperty('--ki-flash', I.flash + 'px');
      for (const x of (I.steps || [])) { st.style.setProperty(`--st-${x.name}-at`, x.at + 'ms'); st.style.setProperty(`--st-${x.name}-ms`, x.ms + 'ms'); }
      quick = !!k.quick; if (quick) { st.classList.add('kiquick'); return; }
      if (!k.silent) { try { introMusic && introMusic.stop(); } catch (e) { } introMusic = Snd.keyIntro(tier); }
      if (!k.silent) { const dr = (I.steps || []).find(x => x.name === 'draw'), fo = (I.steps || []).find(x => x.name === 'forge'), se = (I.steps || []).find(x => x.name === 'settle');
        if (dr) (KEY_ART[tier] || KEY_ART.clear).forEach((_, i) => at(dr.at + i * I.stroke, () => Snd.keyStep('trace')));
        if (fo) at(fo.at, () => Snd.keyStep('snap'));
        if (se) at(se.at, () => Snd.keyStep('land')); }
      anims = document.getAnimations().filter(a => { const tg = a.effect && a.effect.target, tm = a.effect && a.effect.getComputedTiming();
        return tg && st.contains(tg) && tm && Number.isFinite(tm.endTime) && a.playState !== 'finished'; });
      // the same skip the earn moment has, on the same window: a tap does nothing for the first EARN_SKIP_AT ms and then runs it to its last frame
      introSkip = () => { if (performance.now() - began < EARN_SKIP_AT) return false;
        introSkip = null; ids.forEach(clearTimeout); ids.length = 0;
        try { introMusic && introMusic.stop(); } catch (e) { } introMusic = null;
        for (const a of (anims || [])) { try { a.finish(); } catch (e) { } }
        if (done) done(); return true; }; },
    hold() { if (quick) return null;
      const all = (anims || []).map(a => a.finished.then(() => 1, () => 0));
      return Promise.race([Promise.all(all), new Promise(r => { done = r; setTimeout(r, I.ms * 2 + 1000); })]); },
    step() { },
    skip() { return introSkip ? introSkip() : false; },
    // 57.7's rule, applied here too: a moment that ended by itself keeps its music and the tail carries across the cut
    settle() { carry = true; introSkip = null; },
    clear() { introSkip = null; if (!carry) { try { introMusic && introMusic.stop(); } catch (e) { } introMusic = null; } ids.forEach(clearTimeout); } }; }
/* it plays ONCE per key per profile and is the caller's business, not the reveal's (the build-46 rule). `demo` is Testing's replay: it plays the
   same moment and stores nothing, which is what every other animation on that screen does. */
function keyIntro(tier, o = {}) {
  if (!$('#s-key').classList.contains('on') || $('#key-main').hidden) return false;
  if (!o.demo) { prefs.keyIntro = Object.assign({}, prefs.keyIntro, { [tier]: 1 }); save(); }
  const t = keyTiers().find(k => k.id === tier) || keyTiers()[openKey];
  return playReveal($('#key-cere'), { kind: 'chest', id: 'intro:' + tier, col: t.tint, stage: introStage(tier), auto: true });
}
capture(() => { if (!introSkip || !revealOn()) return false; return introSkip(); });

/* ---------- v25 (item 22, build 46): WHAT THE CONGRATULATIONS CARD SAYS ----------
   Every line is read off the same functions the rest of the screen reads, so the card cannot claim something the key screen disagrees with; a
   line with nothing to say is simply left out, and the card never shows more than three (item 22).
   v26 (item 11, build 48): A CHEST'S CARD ONLY. Build 46's card after a key ("Lantern unlocked" — what you did, what you got, what's next) is
   removed for all three keys; the one congratulations card in the flow is the one after a chest opens. */
// item 23: the message this unlock opens, if that slot has a clip. No clip, no button — the slot is still there on About
/* v26 (item 5, build 49): the button stands while the slot is still a placeholder, so Aiden can review it; config/build.js HIDE_UNRECORDED is the
   before-release switch that takes it off a slot with no clip — the same switch the reward in the pop-out and on the map reads (ui/chest.js) */
const msgOf = by => MESSAGES.find(x => x.by && ((by.chest && x.by.chest === by.chest) || (by.key && x.by.key === by.key))) || null;
const msgFor = by => { const m = msgOf(by); return m && (m.file || !HIDE_UNRECORDED) ? m.id : ''; };
const nextChest = () => { const c = CHESTS.find(x => !chestOpen(x.id)); return c ? T(CARD.next, { chest: GRID.chest[c.id] }) : CARD.nDone; };
/* v26 (item 8, build 49): SHORTER AND CELEBRATORY — "Congratulations" in the chest's own colour, the chest's one "You …" line (config/copy.js CARD.you),
   "Next: can you open the … chest?", and the video it opened. No list of what you did or got, no headings, no percentage (item 7) */
// the chest's own colour — ui/chest.js chestCol: the card, the rings and sparks its rewards land with, and its rewards' symbols
// v27 (item 13): one chest colour, ui/chest.js chestCol — the colour of the key that opens it (R2), no longer the meter band's
/* v28 (items 12 / 17, build 53): the card carries its CHEST now — the staged reveal's confetti and its celebration sound are per chest — and the
   message's own SLOT, so the row can be drawn as the powered-off player with that clip's title under it rather than as one grey line for all eight. */
function chestCard(id) { const m = modeCount(), mid = msgFor({ chest: id });
  return { title: CARD.title, chest: id, col: chestCol(id), you: T((CARD.you || {})[id] || '', { total: m.total }), next: nextChest(), msg: mid, msgObj: mid ? msgOf({ chest: id }) : null }; }

/* the reveal itself. `demo` is Testing replaying it with nothing stored (S5); everything else plays it once per tier (`prefs.revealed`) and
   writes that the moment it starts, so a reload mid-reveal never replays it.
   v26 (item 11, build 48): IT ENDS BY ITSELF, ON THE KEY. No "tap to continue", no card: once the earn moment has played to its last frame the
   reveal takes itself off and the screen says only what to do next — "tap the key to open the Skill chest" — and a tap on the key opens it. Inside a
   result interlude the key waits for that tap (or Back) instead of handing itself back on a timer, and the chest's own card hands back to the
   result screen. A chest tapped on the map while this was unseen still opens after it: the player already asked. */
let keyWait = false;
function keyReveal(tier, o = {}) {
  clearTimeout(earnT); earnPlan = null; earnClear();
  if (!$('#s-key').classList.contains('on') || $('#key-main').hidden) { $('#s-key').classList.remove('kdue'); return false; }
  if (!o.demo) { const seen = prefs.revealed || {}; seen['key:' + tier] = 1; prefs.revealed = seen; save(); }
  if (autoBack) keyWait = true;
  /* BUILD 41'S LESSON, ONE MOMENT FURTHER ON: a moment that waits for a tap cannot live under an input lock, and cannot be followed on a TIMER.
     Two things hold a lock over this screen — the result interlude (which used to hand itself back after 3.9s) and a chest tapped on the map
     while a key animation is unseen (which used to open the chest after that animation's own length). Neither can know when the player will
     tap, so the reveal takes the lock off itself the moment it starts holding, and its Continue is what hands over: back to the result screen,
     or on to the chest that was waiting. Outside both, they are no-ops. */
  const t = keyTiers().find(k => k.id === tier) || keyTiers()[openKey];
  /* v27 (item 14, build 51): THE SCREEN NEVER LOCKS while a key is being earned. An interlude or a waiting chest holds the input lock over this
     screen, and `onClick` drops every tap while it is on — which would swallow the skip item 14 asks for. The lock comes off the moment the
     animation starts instead: what it was protecting is still protected, because the reveal's host covers the screen, Back is refused while a
     reveal is on (onBack), and a waiting chest opens from `onDone` whether the animation ended by itself or was tapped through. */
  const started = playReveal($('#key-cere'), { kind: 'key', id: tier, col: t.tint, stage: keyStage(tier), auto: true,
    onReady: () => lock(false),
    onDone: () => { $('#s-key').classList.remove('kdue');
      if (pendingOpen) { const id = pendingOpen; pendingOpen = null; setTimeout(() => { if ($('#s-key').classList.contains('on')) openNow(id); }, OPEN_GAP); } } });
  if (started) lock(false);
  return started; }

/* ---------- v24 (C.1 / B.2 / B.3, build 43): OPENING A CHEST ----------
   Nothing on this screen opens a chest by itself any more. A chest opens because the player asked: the map's tap on a READY chest (B.2 — it
   arrives with `open`), or the ask here (C.1 — the key, or the chest in the row, then Open). Either way it is the build-41 CEREMONY, presentation
   only (L10): the chest is stored and its tier credited silently (G.4) before a frame plays, the music hushed, not skippable, and "tap to
   continue" goes to the MAP with the chest in view, where its words spill out (L.11b). The ceremony is started BEFORE the ring behind it is
   redrawn, so its opaque stage is what the frame shows. The chest's sound is Snd.chest() — its effects and its sting — and never unlockFx. */
let openT = 0, pendingOpen = null;
function openNow(id) { if (chestState(id) !== 'ready') return false; askClose();
  const c = CHESTS.find(x => x.id === id), r = openChest(id); if (!r) return false;
  // D.4 / L.8e: the credit lands as the ceremony's count-up, and the figure it lands on is the meter as painted
  prefs.meterSeen = r.now; prefs.revealed = Object.assign({}, prefs.revealed, { ['chest:' + id]: 1 }); save();
  /* v25 (items 6 / 22, build 46): THE SAME OPENING, INSIDE THE ONE SHARED REVEAL. The ceremony is the stage; what the chest unlocks then rises
     out of it as symbols with their titles (item 6), each with its own small sound, "tap to continue" waits for the last one to land, and the
     congratulations card ends it (item 22). The tap still goes to the MAP with the chest in view, where its words spill out (L.11b). */
  playReveal($('#key-cere'), { kind: 'chest', id, col: chestCol(id), stage: chestStage(id, { was: r.was, now: r.now }), gifts: giftsOf(id), card: chestCard(id, r.now),
    // v26 (item 11, build 48): a chest opened from a key a run just finished goes back to that run's result; otherwise to the map, its words spilling
    onDone: () => { if (autoBack) { handBack(); return; } show('s-pick', { chest: id }); } });
  if (c && typeof c.screen === 'number') openKey = c.screen;
  render(); Music.menu(themeOf(keyTiers()[openKey]));
  return true; }
/* C.1: THE ASK. The lock box's own shape, in green: the chest, "Open the Skill chest?", Open / Not yet. Bare ground behind it is Back, which closes
   it; the panel itself swallows a stray tap */
function askOpen(id) { if (chestState(id) !== 'ready') return false; const box = $('#key-ask');
  box.innerHTML = `<div class="kask" data-act="key-ground">${chestSvg(id)}<h3>${esc(T(KEY.ask, { chest: GRID.chest[id] }))}</h3><div class="row"><button class="item" data-act="key-ask-yes" data-chest="${id}">${esc(KEY.askYes)}</button><button class="item sub" data-act="key-ask-no">${esc(KEY.askNo)}</button></div></div>`;
  box.hidden = false; return true; }
function askClose() { const box = $('#key-ask'); if (!box || box.hidden) return false; box.hidden = true; box.innerHTML = ''; return true; }

/* 5.1: the interlude. The result screen has already faded and locked input; this plays the clear and hands itself back.
   It is one path for every game — the result screen never decides what the animation is, and this screen never decides
   what happens after it, which is why neither had to learn about the other (A4).
   B.21: if this is the first time the screen has ever been seen, the ARRIVAL plays first and the segment waits for it.
   v24 (C.1, build 43): a clear that tops a band NO LONGER OPENS ITS CHEST HERE — the chest waits, ready, for its key to be tapped.
   C.5: a clear that makes the key WHOLE plays its earn moment after the segment has landed, and the hand-back waits for it to finish. */
// the interlude hands itself back — to the result screen, which releases the lock on key:done. Once, whichever path gets there first
function handBack() { const back = autoBack; autoBack = null; keyWait = false; $('#s-key').classList.remove('auto'); auto = null; if (back) show(back); emit('key:done'); }
let autoBack = null;
function interlude(a, back) { const el = $('#s-key'); el.classList.add('auto'); autoBack = back;
  const arrive = firstIn() ? ARRIVE_MS : 0;
  setTimeout(() => advance(a), arrive);
  // an earn moment render() scheduled runs from the screen's draw, 320ms before this; the hand-back waits past its end
  // v25 (item 11): the wait is the earned animation's own length — and if one is still playing when the timer comes round, it owns the hand-back
  // v27 (item 14, build 51): that length is KEY_EARN's now, 1.7–2.0s rather than 6.3–10.5s, so the interlude waits a fraction of what it did
  const earnWait = earnPlan ? Math.max(0, earnAt - 320 + earnOf(earnPlan).ms + OPEN_GAP - 3900 - arrive) : 0;
  // v17 (B.33): the animations run at 1.5x their old length, so the interlude has to wait 1.5x as long or it would hand
  // itself back over the top of the halo it just lit. One number, and it is the only place either length is written.
  // v26 (item 11, build 48): and once a key's reveal has played here, the key waits for its tap — Back, or its chest's card, hands back instead
  setTimeout(() => { if (revealOn() || autoBack !== back || keyWait) return; handBack(); }, 3900 + arrive + earnWait); }

// 5.4: once per profile, the whole screen arrives rather than simply being there. Answers whether it played
function firstIn() { if (prefs.keySeen) return false; prefs.keySeen = 1; save();
  const el = $('#s-key'); el.classList.add('first'); setTimeout(() => el.classList.remove('first'), ARRIVE_MS); return true; }

register('s-key', { onShow({ advance: a, from, auto: to, tier, whole, arrive, ceremony: cer, open, intro } = {}) { stopReveal(); askClose();
    if (openT) { clearTimeout(openT); openT = 0; lock(false); } pendingOpen = null;
    clearTimeout(introT);
    cameFrom = from || null; pending = a || null; auto = to || null; demo = !!(whole || arrive || cer || intro);
    if (a) { openKey = keyTierIx(a.tier); openGame = a.g; }
    if (tier !== undefined) openKey = tier;
    // B.26: Testing asks for the arrival again by clearing the flag first; it asks for the whole-key moment by name
    if (arrive) { prefs.keySeen = 0; }
    /* B.2 / B.3 (build 43): a READY chest tapped on the map. Its tab, and what of this screen has not been seen yet: the arrival (5.4, only on a
       tier that is open — the quiet screen has nothing to arrive) and the key's earn moment (C.5) */
    const oc = open && chestState(open) === 'ready' ? CHESTS.find(c => c.id === open) : null;
    if (oc) { openKey = oc.screen; openGame = null; }
    const t0 = keyTiers()[openKey], open0 = tierOpen(t0.id);
    const arrivalDue = !prefs.keySeen && open0, earnDue = open0 && !t0.shell && t0.whole && !(prefs.revealed || {})['key:' + t0.id] && !(prefs.keyWhole || {})[t0.id];
    earnAt = auto ? 320 + (prefs.keySeen ? 0 : ARRIVE_MS) + 1000 : EARN_AT; earnPlan = null;
    // B.2: nothing unseen — the chest opens on the frame this screen is shown, so the screen itself is never painted first
    if (oc && !arrivalDue && !earnDue) { openNow(oc.id); return; }
    render();
    // v24 (A.1, build 43): the Keys row on the menu is green until this screen is first seen after the Games chest (L8)
    if (tierOpen('clear') && !prefs.keysSeen) { prefs.keysSeen = 1; save(); }
    // v16 (1.3): each key tier has its own loop, rising in intensity the way the glyphs do. This and the tier button keep it in step with
    // whichever tier is open. Build 43 (C.2 / C.3): once the TIER is open — the menu loop only on the quiet screen — and audio.js does not
    // start one of its own when the screen changes
    Music.menu(themeOf(keyTiers()[openKey]));
    const arrived = !auto && firstIn();
    /* 57.6: the creation intro, the first time this key's screen is opened. It stands aside for everything that is already a moment — a chest
       waiting to open, an earn that is due, an interlude handing itself back, the arrival, and Testing's own replays — so two never run at once;
       when it stands aside it stores nothing and plays on the next plain visit. */
    const introDue = open0 && !t0.shell && !demo && !auto && !oc && !a && !arrivalDue && !earnDue && !(prefs.keyIntro || {})[t0.id];
    if (introDue) { clearTimeout(introT); introT = setTimeout(() => { if ($('#s-key').classList.contains('on') && !revealOn()) keyIntro(t0.id); }, EARN_AT); }
    /* B.3: a key animation not yet seen is never cut off — it plays IN FULL, nothing tappable meanwhile, and then the chest opens */
    /* B.3 → AMENDED at build 46 (v25 item 11): a key's first-open REVEAL ends on a tap, not on a length, so a chest waiting behind one cannot be
       opened by a timer. `pendingOpen` hands it to the reveal, which opens it at its Continue; the arrival (5.4) still has a length and still uses
       the timer. Either way the chest is never started and cut off, which is all B.3 ever asked. */
    if (oc) { if (earnPlan) { pendingOpen = oc.id; lock(true); return; }
      const wait = (arrived ? ARRIVE_MS : 0) + OPEN_GAP;
      lock(true); openT = setTimeout(() => { openT = 0; lock(false); if ($('#s-key').classList.contains('on')) openNow(oc.id); }, wait); return; }
    if (whole) { clearTimeout(earnT); earnT = setTimeout(() => keyReveal(tierId(), { demo: 1 }), 300); }
    // 57.6: Testing's replay of the creation intro — the same moment, nothing stored
    if (intro) { clearTimeout(introT); introT = setTimeout(() => { if ($('#s-key').classList.contains('on')) keyIntro(tierId(), { demo: 1 }); }, 300); }
    /* B.26 → v23 (L.6, build 41): Testing replays a chest's CEREMONY here with nothing stored — the meter holds where it is, and the tap
       goes to the map, where the spill replays the same way (ui/screens/pick.js spillDemo) */
    if (cer) setTimeout(() => { if (!$('#s-key').classList.contains('on')) return; const m = meter();
      playReveal($('#key-cere'), { kind: 'chest', id: cer, col: chestCol(cer), stage: chestStage(cer, { was: m, now: m }), gifts: giftsOf(cer), card: chestCard(cer, m),
        onDone: () => show('s-pick', { spillDemo: cer }) }); }, 300);
    if (pending) { const p = pending; pending = null; if (auto) setTimeout(() => interlude(p, auto), 320); else setTimeout(() => advance(p), 260); }
    // C.1 (build 43): a chest that is ready as this screen opens is NOT opened here — the key is tapped, it asks, then it opens
  },
  // a fresh clear arrived from a result screen: Back belongs to the run, not to the menu
  // L.6 (build 41): a ceremony is not skippable, so nothing goes Back while one is on. C.1: Back closes the ask first
  onBack() { if (revealOn() || openT) return true; if (askClose()) return true; if (auto) { if (keyWait) handBack(); return true; } if (!cameFrom) return false; const to = cameFrom; cameFrom = null; show(to); return true; } });
// a ceremony, the ask, a waiting open and this key's background belong to this screen: leaving it any other way ends them and gives the music back
on('screen:change', ({ id }) => { if (id === 's-key') return; stopReveal(); askClose(); setKeyLayer(null);
  clearTimeout(earnT); earnPlan = null; keyWait = false; const el = $('#s-key'); el.classList.remove('kearning', 'kearnquick', 'ksettle', 'kdue'); delete el.dataset.earn; delete el.dataset.rev; earnClear();
  if (openT) { clearTimeout(openT); openT = 0; } pendingOpen = null; lock(false); });
const keyTierIx = id => Math.max(0, keyTiers().findIndex(k => k.id === id));
define({
  // v21 (G.2): a locked key says what opens it and stays where it is — its ring and its numbers are what A.1 still hides
  // v23 (L.10a): key 1 included, until the Games chest
  'key-tier'(el) { const i = +el.dataset.kt; if (!tierOpen(keyTiers()[i].id)) { toast(i === 0 ? KEY.gamesToast : KEY.lockedToast); return 'pick'; }
    openKey = i; openGame = null; render(); Music.menu(themeOf(keyTiers()[openKey])); return 'pick'; },
  // v23 (L.7b, build 42): this key's theme becomes every run's music. Once it is, a second tap changes nothing (guess)
  // v29 (item 4, build 54): SET THIS MUSIC writes the menu's track beside `everywhere`, exactly as Customise's Music row does — one rule, two surfaces
  'key-music'() { const t = keyTiers()[openKey]; if (!t.music || !keyFinished(t.id)) return undefined;
    if (everywhere() !== t.music) { prefs.everywhere = t.music; prefs.menuTrack = t.track; save(); } musicBtn(t); return 'pick'; },
  'key-game'(el) { const g = el.dataset.kg; openGame = openGame === g ? null : g; render(); return 'pick'; },
  // B.23: a tap on the ring's own ground is nothing — not Back, not a sound
  'key-ground'() { return undefined; },
  // v23 (L.6, build 41): the ceremony's own tap — nothing at all until "tap to continue", then it ends and hands over
  /* v23 (L.6, build 41) → v25 (items 6 / 11 / 22, build 46): the reveal's own tap. NOTHING AT ALL until "tap to continue" — swallowed, never
     queued — and then it brings up the congratulations card. `reveal-go` is that card's Continue, dead for about a second after it appears;
     `reveal-msg` is item 23's button, and it takes the player to About with that message ready to play. */
  'cere-tap'() { return revealTap() ? 'click' : undefined; },
  'reveal-go'() { return revealGo() ? 'click' : undefined; },
  'reveal-msg'(el) { const id = el.dataset.msg; revealGo(); show('s-about', { msg: id }); return 'click'; },
  /* v23 (L.12, build 40): a whole key goes to its chest on the map when that chest is open, with its words beside it.
     v24 (C.1, build 43): when that chest is READY the tap ASKS — and so does a ready chest in the row, and the quiet screen's key */
  /* v26 (item 11, build 48) opened a ready chest straight from the key, with no ask. REVERSED (Aiden's answer to build 48's open questions, built for
     build 49): tapping a whole key — or the quiet screen's key — ASKS again, as C.1 had it. "tap the key to open the Skill chest" still leads to it */
  /* v29 Section A (58.2, build 58): a whole key whose chest wants a Gauntlet sends the tap to that GAUNTLET's tile, not to a
     chest that will not open. Everything else is unchanged — a ready chest asks, an open one shows what it gave. */
  'key-chest'(el) { const id = el.dataset.chest; if (chestState(id) === 'ready') { askOpen(id); return 'pick'; }
    if (keyWait) return undefined;
    show('s-pick', el.dataset.gaunt ? { gaunt: el.dataset.gaunt } : { chest: id }); return 'click'; },
  'key-ask-yes'(el) { return openNow(el.dataset.chest) ? 'click' : (askClose(), undefined); },
  'key-ask-no'() { askClose(); return 'click'; },
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
