/* No Excuses — THE EXCUSE REWARDS, MOCKED (build 69, 68.44). Aiden: "get a whole bunch of 3D dancing sprites to pop up throughout the menus and stuff
   in appropriate places just to see how it would look." Testing only: nothing here exists unless Testing's "Excuse rewards (mock)" master switch is on
   (prefs.rewardMock, which core/store.js refuses outside BUILD_FLAGS.dev), and each reward has its own switch. One row per reward in config/excuses.js
   REWARDS; the figures are REWARD_FIG's sprite sheets, flat animations stepped by CSS (no 3D engine), the scorecard an SVG card.

   Where each one goes is its row's `where`; how it gets there is below. Three rules hold for all of them:
   - NEVER IN A RUN. Every figure goes the moment #game is on, and none is placed while it is.
   - NEVER OVER A BUTTON OR ANY TEXT. A figure's box (the visible part, for one that peeks from behind something) is tested against the rect of
     every button and every line of text on screen before it is placed — `blockers()` — and one that would touch any is not shown at all.
   - NEVER A TAP TARGET. pointer-events:none, aria-hidden, no data-act. A tutorial box never has to clear one.
   The real trigger (which excuse earns which reward, `unlock` on its row) is not built. */
import { REWARDS, REWARD_FIG, REWARD_PEEK_MS, REWARD_SETTLE, REWARD_WATCH } from "../config/excuses.js";
import { BUILD_FLAGS } from "../config/build.js";
import { CONFETTI, CONFETTI_VARY } from "../config/chests.js";
import { VERDICT_TIERS } from "../config/verdicts.js";
import { on } from "../core/events.js";
import { prefs } from "../core/store.js";
import { chestCol } from "./chest.js";

const RW = Object.fromEntries(REWARDS.map(r => [r.id, r]));
const mock = () => (BUILD_FLAGS.dev && prefs.rewardMock) || {};
// a reward shows while the master switch is on and its own switch is not off
const rwOn = id => !!mock().on && !!RW[id] && mock()[id] !== 0;
const inRun = () => !!document.getElementById('game')?.classList.contains('on');
const screenOn = () => document.querySelector('.screen.on');

/* ---------- what a figure must keep clear of ---------- */
const shown = el => !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
/* every button and every line of text on screen: the screen on show and anything laid over it (a toast, a tutorial box, the build stamp) — or, for a
   full-screen layer such as a chest's ceremony, that layer in place of the screen it covers */
function blockers(top) {
  const s = top || screenOn(), scopes = [s, ...[...document.body.children].filter(e => !e.classList.contains('screen') && e.tagName !== 'SCRIPT')].filter(e => e && shown(e));
  const out = [], rg = document.createRange();
  for (const sc of scopes) {
    for (const b of [sc, ...sc.querySelectorAll('button,a[href],input,select,textarea')]) { if (!b.matches('button,a[href],input,select,textarea') || b.closest('.rw') || !shown(b)) continue;
      const r = b.getBoundingClientRect(); if (r.width && r.height) out.push(r); }
    const w = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const p = n.parentElement; if (!p || p.closest('.rw,script,style') || !shown(p)) continue;
      rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width && r.height) out.push(r); } }
  return out; }
const hit = (a, b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
const clear = (r, B) => r.left >= 0 && r.right <= innerWidth && r.top >= insetTop() && !B.some(b => hit(r, b));
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
// the safe-area insets, read off the page (env() is CSS-only)
function inset(side) { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:0;width:1px;height:env(safe-area-inset-${side});visibility:hidden`;
  document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return h; }
const insetTop = () => inset('top'), insetBottom = () => inset('bottom');

/* ---------- drawing ---------- */
// one figure: a sprite sheet `h` tall, stepped at its kind's fps from a random frame so a row never moves in step; `i` picks its tint
function fig(kind, h, i = 0) { const F = REWARD_FIG[kind], w = Math.round(F.w * h / F.h), el = document.createElement('i');
  el.className = 'rwfig'; const hue = F.hues[i % F.hues.length];
  el.style.cssText = `width:${w}px;height:${h}px;background-image:url(${F.sheet});background-size:${w * F.frames}px ${h}px;--tw:${w * F.frames}px;--tf:${F.frames};`
    + `--tms:${Math.round(1000 * F.frames / F.fps)}ms;--tdl:-${Math.round(Math.random() * 1000 * F.frames / F.fps)}ms` + (hue ? `;filter:hue-rotate(${hue}deg)` : '');
  return { el, w, h }; }
// the judge's scorecard: a card on a stick, the number big and the verdict's own word under it in its colour
function card(h, tier) { const W = Math.round(REWARD_FIG.scorecard.w * h / REWARD_FIG.scorecard.h), t = VERDICT_TIERS.find(v => v.id === tier) || VERDICT_TIERS[VERDICT_TIERS.length - 1];
  const el = document.createElement('i'); el.className = 'rwfig rwcard';
  el.innerHTML = `<svg viewBox="0 0 44 66" width="${W}" height="${h}" aria-hidden="true"><rect x="20.5" y="34" width="3" height="30" rx="1.2" fill="#B07A3E" stroke="#3a2412" stroke-width=".8"/>`
    + `<ellipse cx="22" cy="55" rx="5" ry="4" fill="#F0B088" stroke="#86502C" stroke-width=".8"/><rect x="3" y="3" width="38" height="34" rx="4" fill="#FFFDF5" stroke="#1a1a1a" stroke-width="1.6"/>`
    + `<text x="22" y="25" text-anchor="middle" style="font-family:var(--title);font-weight:700;font-size:19px" fill="#111">${RW.scorecard.score[t.id] ?? ''}</text>`
    + `<text x="22" y="33.5" text-anchor="middle" style="font-family:var(--mono);font-size:6.5px" fill="${t.col}" stroke="#111" stroke-width=".25">${t.name}</text></svg>`;
  return { el, w: W, h }; }
/* a reward's box, in the screen's own coordinates so it scrolls with it; `r` is in viewport pixels, rounded to whole pixels BEFORE it is tested, so
   the box placed is the box that was cleared. Answers the box, or null if it was not clear */
function put(host, id, r, B, cls = '') { const q = box(Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height));
  if (!clear(q, B)) return null; const hr = host.getBoundingClientRect(), el = document.createElement('div');
  el.className = 'rw rw-' + id + (cls ? ' ' + cls : ''); el.dataset.rw = id; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `left:${q.left - hr.left + host.scrollLeft}px;top:${q.top - hr.top + host.scrollTop}px;width:${q.width}px;height:${q.height}px`;
  host.appendChild(el); return el; }

/* ---------- placing, per screen ---------- */
let token = 0;
const timers = [];
const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
function clearRw() { token++; timers.splice(0).forEach(clearTimeout); clearInterval(watchT); if (ro) ro.disconnect(); document.querySelectorAll('.rw').forEach(e => e.remove());
  const m = document.getElementById('s-menu'); if (m) m.classList.remove('rwtitle'); }
// a screen's finite entrance animations (a menu's fade-in, a map's arrivals) are done, and its fonts in, before anything is measured; at most 4s
const finite = x => { try { return x.effect.getComputedTiming().endTime !== Infinity; } catch (e) { return false; } };
function settled(scope) { const a = scope.getAnimations({ subtree: true }).filter(finite);
  return Promise.race([Promise.all([...a.map(x => x.finished.catch(() => {})), document.fonts ? document.fonts.ready : null]), new Promise(r => setTimeout(r, 4000))]); }

/* how far NO EXCUSES drifts up at most — the most negative y of its `float` keyframes — plus 2px for its tilt, so the row on top of it stands clear of
   the word at every point of the drift, not only where it was when measured */
function drift(el) { let up = 0;
  for (const a of el.getAnimations()) { try { for (const k of a.effect.getKeyframes()) { const y = parseFloat(String(k.translate || '').split(' ')[1]); if (y < up) up = y; } } catch (e) {} }
  return Math.ceil(-up) + 2; }
// the main menu: a row along the top of NO EXCUSES (room made for it above the wordmark), and figures peeking out from behind its buttons
function menu(s) { if (s.classList.contains('story')) return;
  if (rwOn('dancers-title') && !has(s, 'dancers-title')) { const R = RW['dancers-title'], wm = document.getElementById('wordmark'), up = drift(wm);
    s.style.setProperty('--rwt', (R.h + R.gap + up) + 'px'); s.classList.add('rwtitle');
    // where the word sits at rest (its drift's current offset taken back out), then the row's feet above the highest point it drifts to
    const rg = document.createRange(); rg.selectNodeContents(wm); const t = rg.getBoundingClientRect(), B = blockers();
    const now = parseFloat(String(getComputedStyle(wm).translate || '').split(' ')[1]) || 0, feet = Math.floor(t.top - now - up);
    const w = Math.round(REWARD_FIG.dancer.w * R.h / REWARD_FIG.dancer.h), slot = t.width / R.n;
    for (let i = 0; i < R.n; i++) { const el = put(s, R.id, box(t.left + slot * (i + .5) - w / 2, feet - R.h, w, R.h), B); if (el) el.appendChild(fig('dancer', R.h, i).el); } }
  if (rwOn('dancers-menu') && !has(s, 'dancers-menu')) { const R = RW['dancers-menu'], B = blockers();
    const items = [...s.querySelectorAll('.item')].filter(shown), pick = items.filter((_, i) => i % 2 === 0).slice(0, R.n);
    pick.forEach((b, i) => { const r = b.getBoundingClientRect(), h = Math.min(R.h, Math.round(r.height)), f = fig('dancer', h, i + 2), cw = Math.round(f.w * R.peek), top = r.top + (r.height - h) / 2;
      // right of the button first on even rows, left first on odd; whichever side is clear
      const sides = i % 2 ? ['l', 'r'] : ['r', 'l'];
      for (const side of sides) { const el = put(s, R.id, box(side === 'r' ? r.right : r.left - cw, top, cw, h), B, 'rwpeek rwpeek-' + side);
        if (!el) continue; f.el.style.left = side === 'r' ? (cw - f.w) + 'px' : '0px'; f.el.style.setProperty('--pk', (side === 'r' ? -cw : cw) + 'px');
        f.el.style.setProperty('--pms', REWARD_PEEK_MS + 'ms'); f.el.style.setProperty('--pdl', -Math.round(Math.random() * REWARD_PEEK_MS) + 'ms'); el.appendChild(f.el); break; } }); } }

// the game select map: a row across the bottom, below the last row and above the home bar
function map(s) { if (!rwOn('dancers-map') || has(s, 'dancers-map')) return; const R = RW['dancers-map'], g = document.getElementById('grid'); if (!g) return;
  const parts = [...g.children].filter(e => !e.classList.contains('gridlines') && shown(e)).map(e => e.getBoundingClientRect()).filter(r => r.height);
  if (!parts.length) return; const gr = g.getBoundingClientRect(), bottom = Math.max(...parts.map(r => r.bottom));
  const el = put(s, R.id, box(gr.left, bottom + R.gap, gr.width, R.h), blockers(), 'rwrow'); if (!el) return;
  for (let i = 0; i < R.n; i++) el.appendChild(fig('dancer', R.h, i).el); }

// a chest spilling on the map: once its words are out, dancers pop up from behind its top edge, and stand beside it where there is room
function chest(id) { if (!rwOn('dancers-chest') || inRun()) return; const R = RW['dancers-chest'], my = token;
  const go = () => { if (my !== token || inRun()) return; const s = document.getElementById('s-pick'), c = document.querySelector(`#grid .chest[data-chest="${id}"]`);
    if (!s || !s.classList.contains('on') || !c) return; const r = c.getBoundingClientRect(), B = blockers(), placed = [];
    // the room above the chest: up to the nearest button or text over it
    const above = Math.max(insetTop(), ...B.filter(b => b.bottom <= r.top + .5 && b.right > r.left && b.left < r.right).map(b => b.bottom));
    const room = Math.min(R.h, Math.floor(r.top - above - R.gap)), w = Math.round(REWARD_FIG.dancer.w * R.h / REWARD_FIG.dancer.h);
    if (room >= 12) for (let i = 0; i < R.n; i++) { const el = put(s, R.id, box(r.left + r.width * (i + .5) / R.n - w / 2, r.top - room, w, room), B, 'rwrise');
      // the figure shows its top part (up to 62% of it, as much as the room holds) and rises into it from behind the chest
      if (!el) continue; const f = fig('dancer', R.h, i + 1), top = Math.max(0, Math.round(room - R.h * .62));
      f.el.style.top = top + 'px'; f.el.style.setProperty('--rise', (room - top) + 'px'); f.el.style.setProperty('--rdl', (i * 140) + 'ms'); el.appendChild(f.el); placed.push(el); }
    for (const side of ['l', 'r']) { const x = side === 'l' ? r.left - R.gap * 6 - w : r.right + R.gap * 6, el = put(s, R.id, box(x, r.bottom - R.h, w, R.h), B, 'rwpop');
      if (el) { el.appendChild(fig('dancer', R.h, side === 'l' ? 3 : 4).el); placed.push(el); } }
    later(() => placed.forEach(e => e.remove()), R.ms); };
  // once its words are out: every finite animation in the words' column has finished — read off the page, so the dancers follow the words whatever their timing
  later(() => { const ws = document.querySelector(`#grid .chestwords[data-for="${id}"]`), a = ws ? ws.getAnimations({ subtree: true }).filter(finite) : [];
    Promise.all(a.map(x => x.finished.catch(() => {}))).then(() => later(go, 60)); }, 30); }

// the verdict tier the result screen is wearing (`v-<tier>` on #verdict — solo only, L4), or nothing
const tierOn = () => (/\bv-(\w+)/.exec(document.getElementById('verdict')?.className || '') || [])[1];
// the result: a slow clapper beside the number on the lowest tier, and a judge's scorecard held up beside it on any solo result with a tier — each
// standing on the number's baseline less 2px, or higher if the line under the number (the verdict, set close beneath it) starts above that
function result(s) { const v = document.getElementById('verdict'), n = document.getElementById('over-score'); if (!v || !n) return;
  const tier = tierOn(); if (!tier) return;
  const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect(); if (!t.width) return;
  const B = blockers(), low = VERDICT_TIERS[VERDICT_TIERS.length - 1].id, taken = [];
  const beside = (id, make, sides) => { const R = RW[id], f = make(R.h);
    for (const side of sides) { if (taken.includes(side)) continue; const x = side === 'l' ? t.left - R.gap - f.w : t.right + R.gap;
      const under = B.filter(b => b.top > t.top + t.height / 2 && b.left < x + f.w && b.right > x).map(b => b.top), foot = Math.floor(Math.min(t.bottom - 2, ...under.map(y => y - 1)));
      const el = put(s, id, box(x, foot - R.h, f.w, R.h), B, 'rwpop'); if (el) { el.dataset.side = side; el.appendChild(f.el); taken.push(side); return; } } };
  if (tier === low && rwOn('clapper') && !has(s, 'clapper')) beside('clapper', h => fig('clapper', h), ['l', 'r']);
  if (rwOn('scorecard') && !has(s, 'scorecard')) { if (has(s, 'clapper')) taken.push(s.querySelector('.rw-clapper').dataset.side); beside('scorecard', h => card(h, tier), ['r', 'l']); } }

/* what a screen should be showing: the ids on it that are switched on and apply (the clapper only on the lowest tier, the result's two only with a tier) */
function want(s) { const tier = tierOn();
  const ids = s.id === 's-menu' && !s.classList.contains('story') ? ['dancers-title', 'dancers-menu'] : s.id === 's-pick' ? ['dancers-map']
    : s.id === 's-over' && tier ? (tier === VERDICT_TIERS[VERDICT_TIERS.length - 1].id ? ['clapper', 'scorecard'] : ['scorecard']) : [];
  return ids.filter(rwOn); }
const has = (s, id) => !!s.querySelector('.rw-' + id);
// any of these boxes touching a button or text now — a line that faded in after they were placed, say
const touchy = els => { if (!els.length) return false; const B = blockers(); return els.some(e => { const r = e.getBoundingClientRect(); return B.some(b => hit(r, b)); }); };
// the rewards that stand on a screen for as long as it is up (the chest's dancers and the sweeper are one-offs and go by themselves)
const STANDING = ['dancers-title', 'dancers-menu', 'dancers-map', 'clapper', 'scorecard'];
// a screen's layout, from its children's laid-out boxes (offsets, so a drifting word or a toast passing over changes nothing)
const layout = s => [innerWidth, innerHeight, s.scrollHeight, ...[...s.children].filter(e => !e.classList.contains('rw')).map(e => [e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight].join())].join(';');
/* place what the screen should show, then watch it every REWARD_WATCH ms while it is up: if its layout has moved (a result filling in under the number
   pushes the whole column) or one of its boxes now touches a button or text (a line that faded in after it), everything standing on it comes off and is
   placed again against what is there now; if something could not be placed clear of
   every button and text (a toast was passing over it), it is tried again */
// and at once, not a tick later, when anything on the screen changes size (the ResizeObserver) — a box is never left over a line that moved under it
let watchT = 0, ro = null;
function place() { const s = screenOn(); if (!s || inRun() || !mock().on) return; const my = token; let was = '';
  const draw = () => { if (s.id === 's-menu') menu(s); else if (s.id === 's-pick') map(s); else if (s.id === 's-over') result(s); was = layout(s); };
  const tick = () => { if (my !== token || screenOn() !== s || inRun()) { clearInterval(watchT); return; }
    const stand = [...s.querySelectorAll('.rw')].filter(e => STANDING.includes(e.dataset.rw));
    if (layout(s) !== was || touchy(stand)) { stand.forEach(e => e.remove()); draw(); }
    else if (want(s).some(id => !has(s, id))) draw(); };
  // settled, REWARD_SETTLE more, and still settled — an animation that started in the meantime (a verdict rising in) is waited for too, five rounds at most
  const calm = n => settled(s).then(() => later(() => { if (my !== token || screenOn() !== s || inRun()) return;
    if (n < 5 && s.getAnimations({ subtree: true }).some(a => finite(a) && a.playState === 'running')) return calm(n + 1);
    draw(); clearInterval(watchT); watchT = setInterval(tick, REWARD_WATCH);
    if (ro) ro.disconnect(); if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (was) tick(); }); [s, ...s.children].forEach(e => { if (!e.classList.contains('rw')) ro.observe(e); }); } }, REWARD_SETTLE));
  calm(0); }

// the sweeper: once the confetti has settled, across the bottom of whatever it fell on, pushing a few settled pieces off the edge
function sweep(host, chest) { if (!rwOn('sweeper') || inRun() || !host) return; const R = RW.sweeper, C = CONFETTI[chest] || {}, my = token;
  later(() => { if (my !== token || inRun() || !host.isConnected || !shown(host)) return;
    /* the strip just above the home bar first; if a button or a line sits in it (a card's Continue), the very bottom edge, and then as tall a strip as
       fits under the lowest thing on screen (never under 60% of the figure) */
    const bot = innerHeight - insetBottom(), B = blockers(host), low = Math.max(0, ...B.map(b => b.bottom).filter(y => y > innerHeight - R.h * 2)), fit = Math.floor(innerHeight - low - 1);
    let el = null, h = R.h;
    for (const [b, hh] of [[bot, R.h], [innerHeight, R.h], [innerHeight, Math.min(R.h, fit)]]) { if (hh < R.h * .6) continue; el = put(host, R.id, box(0, b - hh, innerWidth, hh), B, 'rwsweep'); if (el) { h = hh; break; } }
    if (!el) return;
    const f = fig('sweeper', h), dist = innerWidth + f.w, col = chestCol(chest) || '#fff';
    el.style.setProperty('--sms', R.ms + 'ms');
    // each settled piece goes when the broom (at the figure's front, a tenth of its width from its right edge) reaches it
    for (let i = 0; i < R.bits; i++) { const x = Math.round(16 + Math.random() * (innerWidth - 32)), b = document.createElement('b');
      b.style.cssText = `left:${x}px;background:${i % 3 ? col : '#fff'};transform:rotate(${Math.round(Math.random() * 180)}deg);--bdl:${Math.round(R.ms * (x + f.w * .1) / dist)}ms;--bx:${innerWidth - x + 12}px`;
      el.appendChild(b); }
    f.el.style.setProperty('--sx', innerWidth + 'px'); el.appendChild(f.el);
    host.querySelectorAll('.rconf').forEach(c => c.classList.add('rwswept'));
    later(() => el.remove(), R.ms + 300); }, (C.ms || 0) + CONFETTI_VARY.burst); }

on('screen:change', () => { clearRw(); place(); });
on('chest:spill', ({ id }) => chest(id));
on('confetti:thrown', ({ host, chest: c }) => sweep(host, c));
// a run starting takes every figure off with it, whatever screen it started from
{ const g = document.getElementById('game'); if (g) new MutationObserver(() => { if (inRun()) clearRw(); }).observe(g, { attributes: true, attributeFilter: ['class'] }); }
addEventListener('resize', () => { if (!document.querySelector('.rw')) return; clearRw(); place(); });
// Testing's switches: everything comes off and is placed again for the screen on show
function rwRefresh() { clearRw(); place(); }

export { rwOn, rwRefresh };
