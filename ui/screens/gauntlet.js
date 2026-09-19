/* No Excuses — the Gauntlet screen (v26 item 13, build 49 as a placeholder; a real run since build 56, v29 items 11 / 18).

   The two Gauntlets are game tiles on the map (ui/screens/pick.js), each to the LEFT of the chest that opens it — Gauntlet
   Mini with the Skill chest, Gauntlet Mega with the Pro chest — and NOTHING of either is on the map until that chest is
   opened (R1: a secret may be known to exist, never what it is). This screen is what the tile leads to: what the run is,
   what it plays, the board, and Go. It draws the result when the run comes back.

   v27 (item 8, build 52): OPENING THIS SCREEN IS "PLAYING THE GAUNTLET", and it is what opens that Gauntlet's message slot
   ("The Gauntlet Mini" / "The Gauntlet Mega" fire the first time each is opened). `prefs.gauntSeen` is written here and
   read by config/messages.js through progress/key.js, because a screen may not import a screen (A4).

   The run itself is run/gauntlet.js. This file knows the id, the roster it is shown, and what `gaunt:done` hands back. */

import { GAUNTLET } from "../../config/copy.js";
import { GAUNTLET_RUNS } from "../../config/gauntlets.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { on } from "../../core/events.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, lenName } from "../../games/registry.js";
import { gauntBoard, startGauntlet } from "../../run/gauntlet.js";
import { define } from "../actions.js";
import { register, show } from "../router.js";

// a roster row's name: the game, its mode where the game has more than one, and the length in that mode's own words
const stepName = st => GAMES[st.g].name + (GAMES[st.g].modes.length > 1 && MODE_NAME[st.d] ? ' · ' + MODE_NAME[st.d] : '');
/* a length in the words that mode uses. lenName answers "Set" for every non-timed mode — which is right on a pick sheet,
   where a Set is the only Set there is, and useless here, where the whole point is that Mini plays two rounds of it. */
const stepLen = st => GAMES[st.g].timed ? lenName(st.g, st.s, st.d) : T(st.s === 1 ? GAUNTLET.round : GAUNTLET.rounds, { n: st.s });

/* v29 Section A (57.9, build 57): ONE ROW PER STEP, not one per play. Estimate's Grow and Cut are one step of the run and one
   spoke on the web, so they are ONE row — `3 Estimate · Grow + Cut`, "2 rounds each" on Mini and "7 + 10 rounds" on Mega — which
   is what makes the list show EIGHT rows for eight games. Two rows numbered 3 read as a numbering bug (Cowork made that mistake
   on the phone), and the count in the line above the list is `stepsOf(id).length`, so the copy cannot drift from the run. */
function stepsOf(id) { const out = [];
  for (const st of (GAUNTLET_RUNS[id] || [])) { const key = st.web || (st.g + ':' + st.d);
    const row = out.find(r => r.key === key); if (row) row.steps.push(st); else out.push({ key, steps: [st] }); }
  return out; }
// a row's name: the game, then every mode this step plays, joined — one mode reads as it always did
function rowName(r) { const g = GAMES[r.steps[0].g], ms = r.steps.map(st => MODE_NAME[st.d]).filter(Boolean);
  if (g.modes.length < 2 || !ms.length) return g.name;
  return g.name + ' · ' + (ms.length > 1 ? T(GAUNTLET.modePair, { a: ms[0], b: ms[1] }) : ms[0]); }
// and its length: the same count twice is "N rounds each", two different counts are "A + B rounds"
function rowLen(r) { if (r.steps.length < 2) return stepLen(r.steps[0]);
  const a = r.steps[0].s, b = r.steps[1].s;
  return a === b ? T(GAUNTLET.roundsEach, { n: a }) : T(GAUNTLET.roundsPair, { a, b }); }
function rosterHtml(id) {
  const rows = stepsOf(id).map((r, i) =>
    `<li><b>${i + 1}</b><span>${esc(rowName(r))}</span><i>${esc(rowLen(r))}</i></li>`).join('');
  return `<ol class="gtlist">${rows}</ol>`;
}

/* THE WEB (item 11, Aiden: "similar to that web that was shown"). One spoke per game, a ring at 100 — the bar — and the
   player's shape drawn over it. The SCORE is uncapped, so a spoke past the ring is a game beaten; the DRAWING is held at
   twice the ring so one freak result cannot push a vertex off the picture while the number underneath still says 214. */
function webSvg(web) {
  const n = web.length; if (!n) return '';
  const C = 100, R = 76, MAX = 2;
  const pt = (i, k) => { const a = -Math.PI / 2 + i / n * 2 * Math.PI; return [C + Math.cos(a) * R * k, C + Math.sin(a) * R * k]; };
  const poly = k => web.map((_, i) => pt(i, k).map(v => v.toFixed(1)).join(',')).join(' ');
  const mine = web.map((r, i) => pt(i, Math.max(0, Math.min(MAX, (r.pct || 0) / 100)) / MAX).map(v => v.toFixed(1)).join(',')).join(' ');
  const ring = web.map((_, i) => pt(i, 1 / MAX).map(v => v.toFixed(1)).join(',')).join(' ');
  const spokes = web.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const dots = web.map((r, i) => { const [x, y] = pt(i, Math.max(0, Math.min(MAX, (r.pct || 0) / 100)) / MAX);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; }).join('');
  return `<svg id="gt-web" viewBox="0 0 200 200" aria-hidden="true">`
    + `<g class="gwgrid">${spokes}<polygon points="${poly(1)}"/></g>`
    + `<polygon class="gwbar" points="${ring}"/>`
    + `<polygon class="gwme" points="${mine}"/><g class="gwdot">${dots}</g></svg>`;
}

function resultHtml(id, out) {
  const rows = out.web.map(r => `<li><span>${esc(GAMES[r.g].name + (r.d && MODE_NAME[r.d] ? ' · ' + MODE_NAME[r.d] : ''))}</span>`
    + `<i>${r.pct === null ? esc(GAUNTLET.noBar) : esc(T(GAUNTLET.pct, { n: r.pct }))}</i></li>`).join('');
  return `<div class="gtres">${webSvg(out.web)}`
    + `<div class="gtbig" style="color:${esc(out.verdict.col)}">${esc(T(GAUNTLET.pct, { n: out.score }))}</div>`
    + `<div class="gtline">${esc(out.verdict.name)} ${esc(out.verdict.line)}</div>`
    + `<div class="gthint">${esc(GAUNTLET.barLine)}</div>`
    + `<ul class="gtscores">${rows}</ul>`
    + `<button class="item big" data-act="gaunt-go" data-gid="${esc(id)}">${esc(GAUNTLET.again)}</button></div>`;
}

function boardHtml(id) {
  const rows = gauntBoard(id).slice(0, 10);
  if (!rows.length) return '';
  return `<div class="gtboard"><h4>${esc(GAUNTLET.board)}</h4><ol>` + rows.map(r =>
    `<li><span>${esc(T(GAUNTLET.pct, { n: r.score }))}</span><i>${new Date(r.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}</i></li>`).join('')
    + `</ol></div>`;
}

/* 57.9: NOTHING UNDER THE LIST. "ONE WAY THROUGH — QUIT AND THE NEXT ATTEMPT STARTS AT GAME ONE" is gone from both screens
   (GAUNTLET.oneWay is retired with it); what the run does on a quit is in the line above the list and in the run itself. */
function briefHtml(id) {
  return `<div class="gtbrief">${rosterHtml(id)}`
    + `<button class="item big gtgo" data-act="gaunt-go" data-gid="${esc(id)}">${esc(GAUNTLET.go)}</button>`
    + boardHtml(id) + `</div>`;
}

let cur = 'g1';
register('s-gauntlet', { onShow({ id, done } = {}) {
  if (id) cur = id; const g = cur;
  /* 57.9: `data-g` is how the stylesheet knows WHICH Gauntlet is on screen — the scary face and the deep red go on the title
     and the button, and Mega is dressed a step further than Mini. Nothing about the look is decided here. */
  $('#s-gauntlet').dataset.g = g;
  $('#gt-title').textContent = GAUNTLET.name[g] || '';
  $('#gt-soon').textContent = T((GAUNTLET.intro && GAUNTLET.intro[g]) || '', { n: stepsOf(g).length });
  $('#gt-body').innerHTML = done ? resultHtml(g, done) : briefHtml(g);
  // item 8 (build 52): arriving here is opening the Gauntlet, and that is what opens its message slot
  if (g && !(prefs.gauntSeen || {})[g]) { prefs.gauntSeen = Object.assign({}, prefs.gauntSeen, { [g]: 1 }); save(); }
} });

define({ 'gaunt-go'(b) { startGauntlet(b.dataset.gid || cur); return 'click'; } });

// the run hands itself back (A4: it emits, this screen navigates). A quit lands on the brief — one way through, start again
on('gaunt:done', out => show('s-gauntlet', { id: out.id, done: out }));
on('gaunt:quit', ({ id }) => show('s-gauntlet', { id }));
