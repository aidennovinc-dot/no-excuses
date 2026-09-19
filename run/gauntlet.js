/* No Excuses — a Gauntlet run (v29 items 11 / 18, build 56).

   The orchestrator, not an engine: it sets the selection, calls the run's own start() once per step, and listens for the
   step to land. run/run.js knows one thing about it — that this run is a Gauntlet step (`R.gaunt`) — and that one thing is
   what keeps L10: a Gauntlet step RETURNS from finish() before a single line of banking runs, so no key, bar, unlock,
   achievement or board row can be written by construction rather than by a list of guards that somebody has to maintain.

   ONE WAY THROUGH. Quit at any point and the whole Gauntlet is over: `run:abort` ends it and the next attempt starts at
   game one. There are no mid-run retries (item 11, Aiden's own line).

   THE SCORE is in config/gauntlets.js's own comment: each step as a percentage of its reference bar, the spokes averaged,
   uncapped. Everything a screen needs is on `gaunt:done`, so no screen has to know any of this (A4). */

import { GAUNTLET_BANDS, GAUNTLET_BAND_OVERRIDE, GAUNTLET_RUNS, GAUNTLET_SCORE, GAUNTLET_STEP } from "../config/gauntlets.js";
import { VERDICTS, VERDICT_TIERS } from "../config/verdicts.js";
import { emit, on } from "../core/events.js";
import { VS, sel } from "../core/state.js";
import { save, store } from "../core/store.js";
import { COMBOS, barOf } from "../progress/key.js";
import { setGauntStep, start } from "./run.js";

let G = null;   // the Gauntlet in flight: { id, steps, i, runs: [] }

const refOf = key => COMBOS.find(c => c.key === key) || null;
const refLen = key => +String(key).split(':')[2];

/* ONE STEP AS A PERCENTAGE OF ITS BAR. `dir` comes from the bar's own row, so nothing here decides which way a game counts.
   A lower-is-better total of 0 is a real result (a clean Find, a perfect Estimate) and a division by nothing, so it takes
   GAUNTLET_SCORE.perfect rather than Infinity — stated in the config, not hidden here. */
function stepPct(step, run) {
  const c = refOf(step.ref); if (!c || !c.bar) return null;
  let bar = barOf(c, GAUNTLET_SCORE.tier);
  if (bar === null || !Number.isFinite(bar) || bar <= 0) return null;
  // a TOTAL scales with the rounds played; a mean does not (config/gauntlets.js `tot`)
  if (step.tot) { const rl = refLen(step.ref); if (rl > 0) bar = bar * (step.s / rl); }
  const v = +run.hits; if (!Number.isFinite(v)) return null;
  let pct = c.bar.dir === 'lower' ? (v <= 0 ? GAUNTLET_SCORE.perfect : bar / v * 100) : v / bar * 100;
  pct = Math.max(0, pct);
  if (GAUNTLET_SCORE.cap > 0) pct = Math.min(GAUNTLET_SCORE.cap, pct);
  return Math.round(pct * 10) / 10;
}

// the web: one spoke per `web` key, two steps sharing one averaged into it (Estimate's Grow and Cut are one game, item 18)
function webOf(steps, runs) {
  const by = [];
  steps.forEach((st, i) => {
    const key = st.web || (st.g + ':' + st.d);
    let row = by.find(r => r.key === key);
    if (!row) { row = { key, g: st.g, d: st.d, pcts: [] }; by.push(row); }
    const p = runs[i] ? stepPct(st, runs[i]) : null; if (p !== null) row.pcts.push(p);
  });
  // `d` is null on a spoke that is a whole GAME rather than one mode of it (Estimate), so a screen names it "Estimate", not "Estimate · Grow"
  return by.map(r => ({ key: r.key, g: r.g, d: r.key.includes(':') ? r.d : null,
    pct: r.pcts.length ? Math.round(r.pcts.reduce((a, b) => a + b, 0) / r.pcts.length * 10) / 10 : null }));
}

const scoreOf = web => { const had = web.filter(r => r.pct !== null);
  return had.length ? Math.round(had.reduce((a, r) => a + r.pct, 0) / had.length * 10) / 10 : 0; };

/* the verdict set is a row in config/verdicts.js like any game's (`VERDICTS.gauntlet`), read through the same
   VERDICT_TIERS; the resolver is here because progress.js's verdict() asks GAMES[r.g] and a Gauntlet is not a game. */
function gauntVerdict(pct) {
  const row = VERDICTS.gauntlet || {}, at = row.at || [100, 80, 55];
  const i = pct >= at[0] ? 0 : pct >= at[1] ? 1 : pct >= at[2] ? 2 : 3;
  const t = VERDICT_TIERS[i] || VERDICT_TIERS[VERDICT_TIERS.length - 1];
  const lines = (row.lines && row.lines[t.id]) || [];
  return { tier: t.id, name: t.name, col: t.col, line: lines.length ? lines[Math.floor(Math.random() * lines.length)] : '' };
}

/* v29 Section A (58.1, build 58): THE STEP THE ENGINE SEES CARRIES ITS BAND. The shared table plus this Gauntlet's own
   override (config/gauntlets.js), resolved here and handed down on `ctx.gaunt.band` — so an engine asks its quantity by
   name and never learns which Gauntlet it is in, and the two tables are put together in one place rather than in six.
   The step object the run sees is a COPY: GAUNTLET_RUNS is config and stays exactly as written (A2). */
const bandFor = (id, st) => Object.assign({}, GAUNTLET_BANDS[st.g + ':' + st.d] || null,
  ((GAUNTLET_BAND_OVERRIDE[id] || {})[st.g + ':' + st.d]) || null);
const stepOf = (id, st) => { const b = bandFor(id, st);
  return Object.assign({}, st, { id, band: Object.keys(b).length ? b : null }); };

function playStep() {
  const st = G.steps[G.i], run = stepOf(G.id, st);
  VS.reset(); sel.game = st.g; sel.diff = st.d; sel.secs = st.s; sel.vs = 0; sel.practice = 0; sel.opens = 3;
  setGauntStep(run);
  emit('gaunt:at', { id: G.id, i: G.i, n: G.steps.length, step: run });
  start();
}

function finishGauntlet() {
  const web = webOf(G.steps, G.runs), score = scoreOf(web);
  const rec = { id: G.id, t: Date.now(), score, tier: GAUNTLET_SCORE.tier, web: web.map(r => ({ key: r.key, pct: r.pct })) };
  // the Gauntlet's OWN board, and the only thing a Gauntlet run ever writes
  store.gaunt = [rec].concat(Array.isArray(store.gaunt) ? store.gaunt : []).slice(0, GAUNTLET_SCORE.keep);
  save();
  const out = { id: G.id, score, web, verdict: gauntVerdict(score), rec };
  G = null; setGauntStep(null);
  emit('gaunt:done', out);
}

function startGauntlet(id) {
  const steps = GAUNTLET_RUNS[id];
  if (!steps || !steps.length) return false;
  G = { id, steps, i: 0, runs: [] };
  emit('gaunt:start', { id, n: steps.length });
  playStep();
  return true;
}

on('gaunt:step', ({ run }) => {
  if (!G) return;
  G.runs.push(run);
  G.i++;
  if (G.i < G.steps.length) { setTimeout(() => { if (G) playStep(); }, GAUNTLET_STEP.gap); return; }
  finishGauntlet();
});
// one way through: a quit ends the whole thing, and the next attempt starts at game one
on('run:abort', () => { if (!G) return; const id = G.id; G = null; setGauntStep(null); emit('gaunt:quit', { id }); });

const gauntOn = () => !!G;
const gauntBoard = id => (Array.isArray(store.gaunt) ? store.gaunt : []).filter(r => r && r.id === id).slice().sort((a, b) => b.score - a.score);

export { bandFor, gauntBoard, gauntOn, gauntVerdict, scoreOf, startGauntlet, stepPct, webOf };
