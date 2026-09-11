/* No Excuses — the keys (build 22, v14 §9.2–9.7; rebuilt as three keys at build 26, v15 §5). Option A, the one Aiden
   picked on 2026-09-08: the key dead centre, the seven games on a ring around it, and a root per game growing inward
   from its node toward the key.

   A root is drawn in SEGMENTS, one per combination that game contributes (9.6) — six for Quick Tap, three for Sequence —
   and the lit share is the fraction of that game's own combinations cleared. Clearing a bar for the first time lights the
   next segment with the short advance animation (9.5); re-clearing an already-cleared bar plays nothing, which is why the
   result screen only ever hands `advance` over for a fresh clear.

   BUILD 26 — what changed, and what did not:
   · 5.3 the menu item is KEYS. Three tiers over the same thirty-one combinations (A.1): the clearance bars, a pro tier and
     the author's times. Each has its own symbol, gets more elaborate as the difficulty rises, shows locked / unlocked and a
     % while it is under 100. Keys 2 and 3 are a SHELL — register #372 is undecided and A.2 forbids a build deriving a bar,
     so they say so out loud instead of drawing a ring over numbers nobody has set.
   · 5.1 a fresh clear INTERRUPTS the result screen. It is not a toast to tap any more: the result fades, input is locked
     (`lock` in ui/actions.js), the segment fills with the whole root lit behind it, and the screen hands itself back.
     Same flow for every game, because it is one path — the result screen asks for it, this screen plays it and says done.
   · 5.2 a clearance-bar row is a way IN. Tapping it starts that combination with the bar pinned at the top of the run,
     through goWhere's pendingAim — the SAME mechanism build 23 gave the achievement-at-the-top (2.2), not a second one.
     A locked mode or length opens the lock box instead, which is the same route the pick sheet uses.
   · 5.4 the first open of the whole screen animates itself into existence, once per profile (`prefs.keySeen`).

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
import { barsMissing, gameKey, isCleared, keyPct, keyState, keyTiers } from "../../progress/key.js";
import { goWhere } from "../../run/run.js";
import { scoreTxt } from "../format.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";

const R_RING = 128, R_HUB = 34, CX = 150, CY = 150;
let openGame = null, cameFrom = null, pending = null, openKey = 0, auto = null;
const games = () => Object.keys(GAMES);
// the seven nodes, evenly spaced from straight up
const angleOf = i => (-90 + i * (360 / games().length)) * Math.PI / 180;
const at = (i, r) => [CX + Math.cos(angleOf(i)) * r, CY + Math.sin(angleOf(i)) * r];

/* ---------- 5.3: the three keys across the top ---------- */
// one glyph, drawn from the tier's own path list. The list gets longer as the tier gets harder, which IS the "more
// elaborate" — there is no second scale of intensity to keep in step with it
const glyph = (id, cls) => `<svg class="kgl ${cls}" viewBox="0 0 48 48" aria-hidden="true">${KEY_ART[id].map(d => `<path d="${d}"></path>`).join('')}</svg>`;
function keys() {
  $('#key-keys').innerHTML = keyTiers().map(k => {
    const pct = k.whole ? '' : T(KEY.pct, { n: Math.round(k.frac * 100) });
    return `<button class="kkey${k.i === openKey ? ' sel' : ''}${k.whole ? ' whole' : ''}${k.shell ? ' shell' : ''}" data-act="key-tier" data-kt="${k.i}">`
      + glyph(k.id, 't' + (k.i + 1)) + `<b>${esc(k.name)}</b>`
      + `<u>${k.whole ? KEY.unlocked : pct}</u></button>`; }).join('');
}

/* ---------- the ring ---------- */
// one root = `total` segments laid end to end from the node inward to the hub. A cleared segment is lit; the rest is the
// track. The halo behind them is what 5.1 lights: the game's WHOLE root, as a background glow, while a segment fills
function root(i, st) { const [x1, y1] = at(i, R_RING - 14), [x2, y2] = at(i, R_HUB + 4); const n = st.total || 1; const seg = [];
  for (let k = 0; k < n; k++) { const a = k / n, b = (k + 1) / n - (n > 1 ? 0.055 : 0);
    seg.push(`<line class="kroot${k < st.done ? ' on' : ''}" data-seg="${st.g}:${k}" x1="${(x1 + (x2 - x1) * a).toFixed(1)}" y1="${(y1 + (y2 - y1) * a).toFixed(1)}" x2="${(x1 + (x2 - x1) * b).toFixed(1)}" y2="${(y1 + (y2 - y1) * b).toFixed(1)}"></line>`); }
  return `<g class="kr" data-rg="${st.g}"><line class="khalo" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>${seg.join('')}</g>`; }
function ring() { const st = keyState();
  const parts = st.games.map((g, i) => { const [nx, ny] = at(i, R_RING);
    return root(i, g) + `<g class="knode${g.done ? ' lit' : ''}${g.done === g.total ? ' home' : ''}${openGame === g.g ? ' sel' : ''}" data-act="key-game" data-kg="${g.g}" transform="translate(${nx.toFixed(1)} ${ny.toFixed(1)})">`
      + `<circle class="khit" r="21"></circle><circle class="kdot" r="7"></circle>`
      + `<text class="klbl" y="${ny < CY ? -17 : 24}">${esc(GAMES[g.g].name)}</text>`
      + `<text class="knum" y="${ny < CY ? 26 : -14}">${g.done}/${g.total}</text></g>`; }).join('');
  $('#key-ring').innerHTML = `<circle class="khub" cx="${CX}" cy="${CY}" r="${R_HUB}"></circle>`
    + `<path class="kglyph${st.whole ? ' whole' : ''}" d="M150 128a13 13 0 1 0 0 26 13 13 0 1 0 0-26M150 154v24M150 166h8M150 172h6"></path>` + parts;
  $('#key-ring').classList.toggle('whole', st.whole);
  // v17 (§A.6.7): "19 of 30 · 74%" — the cleared count is what a player acts on, the percentage is what moves on nearly
  // every run. Both come out of progress/key.js; nothing about the total is written here (C.5)
  const p = keyPct();
  $('#key-count').textContent = st.whole ? KEY.whole : T(KEY.count, { done: p.done, total: p.total, pct: p.pct });
  return st; }

/* ---------- the panel: one game's combinations ---------- */
// the bar in the game's own units. scoreTxt already carries the mode's suffix (%, s, px, ms); where a mode has none —
// a count of hits, rounds or miscounts — the word comes from the bar's own `unit`, so nothing is ever printed twice
function barTxt(c) { const n = scoreTxt(c.g, c.bar.bar, c.d, c.s); return /[^\d.]$/.test(n) || !c.bar.unit ? n : n + ' ' + c.bar.unit; }
const wantTxt = c => !c.bar ? KEY.none : T(c.bar.dir === 'lower' ? KEY.ceil : KEY.floor, { bar: barTxt(c) });
function panel() { const box = $('#key-list'); if (!openGame) { box.innerHTML = ''; box.hidden = true; return; }
  const st = gameKey(openGame); box.hidden = false;
  const rows = st.list.map(c => { const done = isCleared(c.key);
    const name = (MODE_NAME[c.d] ? MODE_NAME[c.d] + ' · ' : '') + lenFull(c.g, c.s, c.d);
    // 5.2: the row is a control now, so it carries an act like everything else does
    return `<div class="krow${done ? ' done' : ''}${c.bar ? '' : ' nobar'}" data-act="key-row" data-kk="${c.key}" id="krow-${c.key.replace(/[:.]/g, '_')}"><b>${esc(name)}</b><i>${esc(wantTxt(c))}</i><u>${done ? KEY.cleared : KEY.open}</u></div>`; }).join('');
  box.innerHTML = `<div class="keyblk"><h4>${esc(GAMES[openGame].name)} <span>${T(KEY.root, { done: st.done, total: st.total })}</span></h4>`
    + `<p>${esc(KEY_NOTE[openGame] || '')}</p>${rows}</div>`; }

/* ---------- which key is on screen ---------- */
function render() { const t = keyTiers()[openKey]; keys();
  $('#key-title').textContent = t.name.toLowerCase();
  $('#key-main').hidden = !!t.shell; $('#key-shell').hidden = !t.shell;
  if (t.shell) { $('#key-shell').innerHTML = `${glyph(t.id, 't' + (openKey + 1) + ' big')}<p>${esc(t.lede)}</p><p class="soon">${esc(KEY.soon)}</p>`; return; }
  ring(); panel();
  $('#key-hint').textContent = openGame ? KEY.rowGo : KEY.hint;
  const miss = barsMissing(); $('#key-warn').hidden = !miss.length;
  if (miss.length) $('#key-warn').textContent = T(KEY.mismatch, { n: miss.length, keys: miss.join(', ') }); }

/* ---------- 9.5: the short advance. The segment that just lit walks in, and its row flashes ----------
   5.1 adds the background glow: the whole root of the game that earned it lights behind the segment for the length of
   the animation, so what is being said is "this game moved", not only "a line grew". */
function advance(a) { if (!a) return; const el = $(`[data-seg="${a.g}:${a.was}"]`); if (el) { el.classList.remove('grow'); void el.getBoundingClientRect(); el.classList.add('grow'); }
  const rt = $(`.kr[data-rg="${a.g}"]`); if (rt) { rt.classList.remove('glow'); void rt.getBoundingClientRect(); rt.classList.add('glow'); }
  const row = $('#krow-' + a.key.replace(/[:.]/g, '_')); if (row) row.classList.add('newthing'); }

/* 5.1: the interlude. The result screen has already faded and locked input; this plays the clear and hands itself back.
   It is one path for every game — the result screen never decides what the animation is, and this screen never decides
   what happens after it, which is why neither had to learn about the other (A4). */
function interlude(a, back) { const el = $('#s-key'); el.classList.add('auto');
  advance(a);
  setTimeout(() => { el.classList.remove('auto'); auto = null; show(back); emit('key:done'); }, 2600); }

// 5.4: once per profile, the whole screen arrives rather than simply being there
function firstIn() { if (prefs.keySeen) return; prefs.keySeen = 1; save();
  const el = $('#s-key'); el.classList.add('first'); setTimeout(() => el.classList.remove('first'), 2600); }

register('s-key', { onShow({ advance: a, from, auto: to } = {}) { cameFrom = from || null; pending = a || null; auto = to || null;
    if (a) { openKey = 0; openGame = a.g; }
    render();
    // v16 (1.3): each key tier has its own loop, rising in intensity the way the glyphs do. The screen change starts key 1;
    // this and the tier button keep it in step with whichever tier is open
    Music.menu('key:' + (openKey + 1));
    if (!auto) firstIn();
    if (pending) { const p = pending; pending = null; if (auto) setTimeout(() => interlude(p, auto), 320); else setTimeout(() => advance(p), 260); } },
  // a fresh clear arrived from a result screen: Back belongs to the run, not to the menu
  onBack() { if (auto) return true; if (!cameFrom) return false; const to = cameFrom; cameFrom = null; show(to); return true; } });
define({
  'key-tier'(el) { openKey = +el.dataset.kt; openGame = null; render(); Music.menu('key:' + (openKey + 1)); return 'pick'; },
  'key-game'(el) { const g = el.dataset.kg; openGame = openGame === g ? null : g; render(); return 'pick'; },
  /* 5.2: go and try this one. A locked mode or length hands over to the lock box — the same event the pick sheet and the
     Unlocks screen raise — and everything else starts the run with the bar as the goal line. `aim` names the game so the
     run's own here() can take it back out again while you are inside that game (v14 3.3). */
  'key-row'(el) { const [g, d, s] = el.dataset.kk.split(':'); const sc = +s;
    if (!isOpen(g, d)) { emit('lock:ask', { g, d }); return 'pick'; }
    if (!lenOpen(g, d, sc)) { emit('lock:ask', { g, d, s: sc }); return 'pick'; }
    const c = gameKey(g).list.find(x => x.key === el.dataset.kk);
    const name = `${GAMES[g].name}${MODE_NAME[d] ? ' · ' + MODE_NAME[d] : ''} · ${lenName(g, sc, d)}`;
    goWhere({ g, d, s: sc, need: T(KEY.aim, { name, want: c ? wantTxt(c) : '' }) }); return 'click'; },
});
