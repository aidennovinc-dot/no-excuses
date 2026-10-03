/* No Excuses — the Excuses tally (build 68, 67.38). The rows are config/excuses.js, the tests progress/rules.js EXCUSE_TEST. A count per excuse in
   `prefs.excuses` (Fresh game clears it with everything else). Nothing here touches % complete, a key, a bar or an unlock. The engines write the raw
   facts a test needs into the run's `xs` (run/run.js makeCtx) — the lowest Grow %, the thinnest Cut, false starts in a row — so the thresholds stay
   in config and the run record stays the shape it was. */
import { EXCUSES, EXCUSE_GRACE, TINY_AIDEN } from "../config/excuses.js";
import { emit } from "../core/events.js";
import { prefs, save, store } from "../core/store.js";
import { EXCUSE_TEST } from "./rules.js";

// a profile's start: its first run on record
const born = () => { const ts = (store.runs || []).map(r => r.t).filter(Number.isFinite); return ts.length ? Math.min(...ts) : Date.now(); };
const excuseCount = () => Object.values(prefs.excuses || {}).reduce((n, v) => n + (+v || 0), 0);
// the walkthrough is behind the player — ui/tutorial.js tutDone's own test, kept here because progress/ never imports ui/
const walked = () => prefs.tut === 2 || (prefs.tut === 1 && !prefs.tutRun) || (!prefs.tut && (!!prefs.played || !!(store.runs || []).length));
// never during the walkthrough, never in a profile's first ten minutes
const excuseOk = () => walked() && Date.now() - born() >= EXCUSE_GRACE;
/* build 69 (68.45): the first time an excuse is made is written beside its count (`prefs.excuT`), so the Excuses tab can say when. Only a FIRST make
   stamps it: one made before this build has no first time on record, and a later make must not pretend to be it — that row shows no date */
function makeExcuse(id, o = {}) { const E = EXCUSES.find(e => e.id === id); if (!E || !excuseOk()) return null; const was = excuseCount(), n0 = (prefs.excuses || {})[id] || 0;
  prefs.excuses = Object.assign({}, prefs.excuses, { [id]: n0 + 1 });
  if (!n0) prefs.excuT = Object.assign({}, prefs.excuT, { [id]: Date.now() });
  save();
  const now = excuseCount(), out = { id, name: E.name, quiet: !!o.quiet, total: now, dance: was < TINY_AIDEN.at && now >= TINY_AIDEN.at };
  emit('excuse:made', out); return out; }
// the excuse a finished solo run made, if any — `quiet` when an unlock in the same run already has the toast (L6's five deliberate failures)
function checkExcuse(run, xs, quiet) { if (!run || run.demo || run.practice || run.chal || run.vs2 || !excuseOk()) return null;
  const E = EXCUSES.find(e => EXCUSE_TEST[e.id] && EXCUSE_TEST[e.id](run, xs || {}, e)); return E ? makeExcuse(E.id, { quiet }) : null; }

export { checkExcuse, excuseCount, excuseOk, makeExcuse };
