/* No Excuses — the parallel runner (build 61). `npm test` with no flags is this: one static server, then every section in its own
   worker process (its own Chrome, its own page, a fresh profile), `--workers` of them at a time, longest first, and one verdict at
   the end in the gate's own section order. A worker is `smoke.mjs --worker --pick <indices>`; it prints its section lines and
   failures, and hands its checks back as JSON. Nothing here starts a browser.

   Two budgets fail the gate so it cannot regrow (A10, ARCHITECTURE.md): a full run over TIME_BUDGET_S, and site/CLAUDE.md over
   40KB (that one is a static check). The ten slowest sections print on every full run, so the next build knows where to look. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';
import { ARGV, optOf, baseArg, PARTIAL, LEADS, pickSections, unknownTerms } from './args.mjs';
import { SECTIONS } from '../sections/index.mjs';

export const DEFAULT_WORKERS = 4, DEFAULT_CLOCK = 5, TIME_BUDGET_S = 12 * 60, WORKER_LIMIT_S = 8 * 60;
const HERE = path.dirname(fileURLToPath(import.meta.url)), SMOKE = path.join(HERE, '..', 'smoke.mjs'), TIMINGS = path.join(HERE, '..', 'timings.json');
const WORKERS = Math.max(1, +optOf('--workers') || DEFAULT_WORKERS), CLOCK = Math.max(1, +optOf('--clock') || DEFAULT_CLOCK);
const BAIL = ARGV.includes('--bail'), LABELS = optOf('--labels');
const PASS = ['--verbose', '--bail'].filter(f => ARGV.includes(f));
const T0 = Date.now();

// the groups: one section each, except a section and the one it LEADS, which share a process because the second reads the first's page
const picked = pickSections(SECTIONS), taken = new Set(), groups = [];
for (const i of picked) { if (taken.has(i)) continue; const g = [i]; taken.add(i);
  for (const led of LEADS[SECTIONS[i].names[0]] || []) { const j = SECTIONS.findIndex(s => s.names[0] === led); if (j >= 0 && !taken.has(j)) { g.push(j); taken.add(j); } }
  groups.push(g); }
// longest first, off the last full run's seconds at the clock it ran at, so the long ones never start last
let last = {}; try { last = JSON.parse(fs.readFileSync(TIMINGS, 'utf8')); } catch (e) { }
const est = g => g.reduce((a, i) => a + (last[SECTIONS[i].file] ?? 60), 0);
groups.sort((a, b) => est(b) - est(a));
const clockOf = g => Math.min(CLOCK, ...g.map(i => SECTIONS[i].clock ?? CLOCK));

const srv = baseArg ? null : await serve(), BASE = baseArg || srv.base;
console.log(`serving ${BASE} · ${groups.length} group${groups.length === 1 ? '' : 's'} of ${taken.size} section${taken.size === 1 ? "" : "s"} on ${Math.min(WORKERS, groups.length)} worker${WORKERS === 1 ? '' : 's'} · clock ×${CLOCK}${PARTIAL ? ' · PARTIAL' : ''}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ne-gate-'));
const results = [], live = new Set();
let stopped = '', next = 0;

// a worker's Chrome is its child: on Windows only a tree kill takes both, anything else leaves Chrome running
const killTree = k => { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(k.pid), '/T', '/F'], { stdio: 'ignore' }); else k.kill('SIGKILL'); };
function runGroup(g, clkOver) {
  return new Promise(resolve => {
    const json = path.join(tmp, g.join('-') + (clkOver ? '-x1' : '') + '.json'), clk = clkOver || clockOf(g), t0 = Date.now();
    const kid = spawn(process.execPath, [SMOKE, BASE, '--worker', '--pick', g.join(','), '--json', json, '--clock', String(clk), ...PASS], { stdio: ['ignore', 'pipe', 'pipe'] });
    live.add(kid); let out = '';
    // a worker that has not finished in WORKER_LIMIT_S is killed and named: a hung Chrome must not hold the gate past its budget
    const limit = setTimeout(() => { out += `
  FAIL a worker ran past ${WORKER_LIMIT_S}s and was stopped
`; killTree(kid); }, WORKER_LIMIT_S * 1000);
    kid.stdout.on('data', d => out += d); kid.stderr.on('data', d => out += d);
    kid.on('close', code => { live.delete(kid); clearTimeout(limit);
      let r = null; try { r = JSON.parse(fs.readFileSync(json, 'utf8')); } catch (e) { }
      if (!r) r = { sections: [], errors: [], fail: [`THE GATE CRASHED — the worker for ${g.map(i => SECTIONS[i].names[0]).join(' + ')} exited ${code} without a verdict`], stopped: 'crashed' };
      r.group = g; r.clock = clk; r.wall = (Date.now() - t0) / 1000; results.push(r);
      if (process.env.GATE_DEBUG) console.log(`  [worker ${g.join('+')} ${r.wall.toFixed(1)}s wall, ${r.sections.reduce((a, s) => a + (s.s || 0), 0).toFixed(1)}s in sections, done at ${((Date.now() - T0) / 1000).toFixed(0)}s]`);
      if (!stopped) process.stdout.write(out.replace(/^\s*\n/gm, '') + (clk < CLOCK ? `  (clock ×${clk} for ${g.map(i => SECTIONS[i].names[0]).join(' + ')})\n` : ''));
      if (BAIL && (r.fail.length || r.errors.length) && !stopped) { stopped = 'STOPPED AT THE FIRST FAILURE (--bail)'; for (const k of live) killTree(k); }
      resolve(); });
  });
}
async function lane() { while (!stopped && next < groups.length) await runGroup(groups[next++]); }
await Promise.all(Array.from({ length: Math.min(WORKERS, groups.length) }, lane));

/* ---- a failure on the test clock is retried ONCE on the wall clock ----
   A section that fails at ×N is run again at ×1 — the gate exactly as it ran until build 60. A real regression fails there too and
   the gate fails with it; a check that only fails fast was leaning on a slow driver, and it is printed by name as a CLOCK FLAKE for
   the next build to fix its wait, never passed in silence. The retry's time counts against A10's budget like any other. Not under
   --bail, which is the fix loop and wants the first failure as it happened. */
const flakes = [];
if (!stopped && !BAIL) {
  const retry = results.filter(r => r.clock > 1 && (r.fail.length || r.errors.length));
  if (retry.length) console.log(`retrying ${retry.length} section group${retry.length === 1 ? '' : 's'} at ×1: ${retry.map(r => r.group.map(i => SECTIONS[i].names[0]).join(' + ')).join(' · ')}`);
  const before = new Map(retry.map(r => [r.group.join(), r]));
  const queue = retry.map(r => r.group);
  await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, async () => { while (queue.length) await runGroup(queue.shift(), 1); }));
  for (const [key, old] of before) {
    const again = results.findLast(r => r.group.join() === key && r.clock === 1);
    results.splice(results.indexOf(old), 1);
    if (again && !again.fail.length && !again.errors.length) flakes.push({ names: old.group.map(i => SECTIONS[i].names[0]).join(' + '), clock: old.clock, what: [...old.fail, ...old.errors] }); }
}
if (srv) srv.close();

// ---- the one verdict, in the gate's own order ----
const secs = results.flatMap(r => r.sections.map((s, k) => ({ ...s, k, clock: r.clock }))).sort((a, b) => a.idx - b.idx || a.k - b.k);
const errors = results.flatMap(r => r.errors), fail = results.flatMap(r => r.fail);
const ran = new Set(secs.map(s => s.idx));
if (!stopped) for (const i of picked) if (!ran.has(i)) fail.push(`${SECTIONS[i].names[0]} never reported — its worker died before it started`);
const unknown = stopped ? [] : unknownTerms(SECTIONS);
const wall = (Date.now() - T0) / 1000, busy = secs.reduce((a, s) => a + (s.s || 0), 0);
if (LABELS) fs.writeFileSync(LABELS, secs.map(s => '\n' + s.name + '\n' + s.lines.join('\n')).join('\n') + '\n');
console.log('\n' + '-'.repeat(60));
if (errors.length) { console.log('UNCAUGHT ERRORS (' + errors.length + '):'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
if (flakes.length) console.log('CLOCK FLAKES — failed on the test clock, PASSED when rerun at ×1; the gate passes them, the next build fixes the wait:\n  '
  + flakes.map(f => `${f.names} (at ×${f.clock}): ${f.what.map(w => w.slice(0, 160)).join(' | ')}`).join('\n  '));
if (fail.length) console.log('FAILED CHECKS:\n  ' + fail.join('\n  '));
if (unknown.length) console.log(`NO SECTION STARTS WITH ${unknown.map(t => '"' + t + '"').join(', ')} — the sections are:\n  ` + [...new Set(SECTIONS.flatMap(s => s.names))].join('\n  '));
// per SECTION (a section's parts added up), slowest first
const bySec = new Map(); for (const s of secs) { const f = SECTIONS[s.idx].file; bySec.set(f, (bySec.get(f) || 0) + (s.s || 0)); }
if (!PARTIAL || bySec.size > 3) { const top = [...bySec].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('SLOWEST SECTIONS: ' + top.map(([f, s]) => `${SECTIONS.find(x => x.file === f).names[0]} ${s.toFixed(0)}s`).join(' · ')); }
const n = secs.reduce((a, s) => a + s.n, 0);
console.log(`${n} check${n === 1 ? '' : 's'} in ${secs.length} section${secs.length === 1 ? '' : 's'}, ${Math.round(wall)}s (${(wall / 60).toFixed(1)} min) on ${Math.min(WORKERS, groups.length)} workers — ${Math.round(busy)}s of section time, clock ×${CLOCK}`);
let over = false;
if (!PARTIAL && !stopped && wall > TIME_BUDGET_S) { over = true;
  console.log(`A10 TIME BUDGET: the full gate took ${(wall / 60).toFixed(1)} min, over the ${TIME_BUDGET_S / 60}-minute budget — speed up the slowest sections above; never raise the budget without Aiden`); }
if (!PARTIAL && !stopped) fs.writeFileSync(TIMINGS, JSON.stringify(Object.fromEntries([...bySec].sort()), null, 1) + '\n');
if (stopped || PARTIAL) console.log((stopped || 'PARTIAL RUN (--only / --from)') + ' — not the gate: the full npm test runs once before the push');
fs.rmSync(tmp, { recursive: true, force: true });
const pass = !errors.length && !fail.length && !unknown.length && !over && !stopped;
console.log(pass ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
process.exit(pass ? 0 : 1);
