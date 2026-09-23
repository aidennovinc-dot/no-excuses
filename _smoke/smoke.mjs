/* No Excuses — the gate (A7). Run before every push:  npm test
 *
 * Spawns its own static server (no Python), launches the Chrome at CHROME_PATH (Windows default as the fallback) at 390x844, and
 * fails on any uncaught error or failed assertion. What each section stands for, and the name to hand --only: _smoke/GATE.md.
 *
 * THE LAYOUT (build 61, the gate-speed build). This file only decides how to run. The sections are one module each in
 * `_smoke/sections/` (`NN-name.mjs`, in the order `sections/index.mjs` lists them), and everything they share — the section
 * bookkeeping, the verdict, the page and its helpers (`boot`, `click`, `poke`, `driveToResult`, `revealDone` …) — is
 * `_smoke/lib/gate.mjs`. A build that touches one feature opens that feature's section and nothing else.
 *
 * HOW TO RUN IT. `npm test` with no flags IS the gate: run it once, before the push. It runs every section in its own worker (its
 * own Chrome), four at a time, longest first, on a test clock five times faster than the wall (lib/clock.mjs); prints each
 * section's line (`storage fixtures · 26 checks · ok · 4.1s`) as its worker finishes, each failure, the ten slowest sections and
 * the verdict. A full run over 12 minutes FAILS (A10). A section that fails on the test clock is rerun once at ×1 — the gate as it
 * ran until build 60 — and if it passes there it is printed as a CLOCK FLAKE, by name, for the next build to fix. The flags are
 * for the fix loop and never stand in for the gate:
 *   npm test -- --only "build 46"   only the sections whose printed name starts with that — a comma list, a bare number means that
 *                                   build, a leading "the " may be left off (--only static,runs); a section another one stands on
 *                                   runs with it (LEADS)
 *   npm test -- --from 44           that build section and every section after it
 *   npm test -- --bail              stop at the first failure
 *   npm test -- --verbose           every pass line as well
 *   npm test -- --labels <file>     every check, by section and in order, written to <file> — how a refactor proves it kept them all
 *   npm test -- --workers N         N sections at a time (default 4); --workers 1 is one at a time, still one process each
 *   npm test -- --clock N           the test clock (default 5); --clock 1 is the wall clock, the gate as it ran until build 60
 * Pass a base URL as the one bare argument to test a server you are already running instead.
 * `--worker --pick <i,j> --json <file>` is how the runner starts a worker; nobody types it.
 */
import { ARGV } from './lib/args.mjs';

if (!ARGV.includes('--worker')) await import('./lib/parallel.mjs');
else {
  const G = await import('./lib/gate.mjs');
  const { SECTIONS } = await import('./sections/index.mjs');
  for (const s of SECTIONS) if (G.section(...s.names)) await (await import('./sections/' + s.file)).run();
  await G.finish();
}
