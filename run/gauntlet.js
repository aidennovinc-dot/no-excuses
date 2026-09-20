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
/* v30 (59.12d, build 59): AND THE WORKING COMES OUT WITH IT. Aiden: "I don't know how I got 310%." A step now hands back its own
   arithmetic — the number he scored, the bar it was measured against (already scaled for the rounds played) and the unit — so the
   result screen can show "3.1s · bar 4.0s · 129%" and the figure can never again be unexplainable. The unit is the bar's own, cut to
   its first word, because a key-bar row spells it as prose ("s total", "ms avg", "% off"). */
const UNIT_TIGHT = { '%': 1, 's': 1, 'ms': 1 };
const unitOf = c => { const u = String((c.bar && c.bar.unit) || '').trim().split(' ')[0]; return u; };
const numOf = v => { const n = Math.abs(v); const d = n >= 100 ? 0 : n >= 10 ? 1 : 2; return String(Math.round(v * 10 ** d) / 10 ** d); };
const shownOf = (v, u) => numOf(v) + (u ? (UNIT_TIGHT[u] ? u : ' ' + u) : '');
function stepDetail(step, run) {
  const c = refOf(step.ref); if (!c || !c.bar) return null;
  let bar = barOf(c, GAUNTLET_SCORE.tier);
  if (bar === null || !Number.isFinite(bar) || bar <= 0) return null;
  // a TOTAL scales with the rounds played; a mean does not (config/gauntlets.js `tot`)
  const scaled = !!step.tot && refLen(step.ref) > 0;
  if (scaled) { const rl = refLen(step.ref); bar = bar * (step.s / rl); }
  const v = +run.hits; if (!Number.isFinite(v)) return null;
  let pct = c.bar.dir === 'lower' ? (v <= 0 ? GAUNTLET_SCORE.perfect : bar / v * 100) : v / bar * 100;
  pct = Math.max(0, pct);
  const raw = Math.round(pct * 10) / 10;
  if (GAUNTLET_SCORE.cap > 0) pct = Math.min(GAUNTLET_SCORE.cap, pct);
  const u = unitOf(c);
  return { pct: Math.round(pct * 10) / 10, raw, capped: raw > (GAUNTLET_SCORE.cap || Infinity),
    v, bar: Math.round(bar * 100) / 100, unit: u, dir: c.bar.dir, scaled,
    you: shownOf(v, u), barShown: shownOf(bar, u) };
}
function stepPct(step, run) { const d = stepDetail(step, run); return d ? d.pct : null; }

// the web: one spoke per `web` key, two steps sharing one averaged into it (Estimate's Grow and Cut are one game, item 18)
function webOf(steps, runs) {
  const by = [];
  steps.forEach((st, i) => {
    const key = st.web || (st.g + ':' + st.d);
    let row = by.find(r => r.key === key);
    if (!row) { row = { key, g: st.g, d: st.d, pcts: [], work: [] }; by.push(row); }
    const det = runs[i] ? stepDetail(st, runs[i]) : null; if (det) { row.pcts.push(det.pct); row.work.push(det); }
  });
  // `d` is null on a spoke that is a whole GAME rather than one mode of it (Estimate), so a screen names it "Estimate", not "Estimate · Grow"
  // 59.12d: `work` is the arithmetic behind the spoke — one entry per step, so a spoke that averages two carries both
  return by.map(r => ({ key: r.key, g: r.g, d: r.key.includes(':') ? r.d : null, work: r.work,
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
/* v30 (59.12b, build 59): A GAUNTLET DEALS THE MIDDLE OF THE SET, not its opening rounds. Aiden's Mini plays 2 of Spot · Find's 10
   rounds, and Find's crowd grows with the round number — so it played the two EASIEST rounds of the ten while `tot` scaled the bar
   as though they were average ones. That is most of why Find and Hidden were the two worst rows. `ramp.from` is the round the step
   starts at: the middle block of the reference set, so 2 of 10 plays rounds 5 and 6. An engine reads it through gauntRound() in
   games/_shared/deal.js and never learns which Gauntlet it is in; a step that plays the whole set starts at 1, unchanged. */
const rampFor = st => { const rl = +String(st.ref || '').split(':')[2], s = +st.s;
  if (!(rl > 0) || !(s > 0) || s >= rl) return null;
  return { from: Math.floor((rl - s) / 2) + 1, of: rl }; };
const stepOf = (id, st) => { const b = bandFor(id, st), r = rampFor(st);
  return Object.assign({}, st, { id, band: Object.keys(b).length ? b : null, ramp: r }); };

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

export { bandFor, gauntBoard, gauntOn, gauntVerdict, scoreOf, startGauntlet, stepDetail, stepPct, webOf };
