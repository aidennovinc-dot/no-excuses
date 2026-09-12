/* No Excuses — the build (build 19, batch 10 · surface). DATA ONLY (A2).
   BUILD is the one place the number lives (A6): `npm run bump -- N` rewrites it here, then writes index.html
   (hint line, #build, the update-check constant) and version.json from it. Hand-editing four places is over. */
export const BUILD = 31;
export const LABEL = 'batch 14 · the runs';                // the hint line under the title: `build N · LABEL · date`
/* the run record's schema stamp (`v` on every run). 2 since build 18: the one-key store's legacy migration stamps every
   surviving build-13 run with this too, so the v10/v11 "retire runs with v < 11" rule can never fire again.
   3 since build 31 (v18 B.2 / B.4): TWO SCORING UNITS CHANGED. Timing · Stopwatch · Set is the SUM of its rounds' errors
   where it was their mean, and Timing · Hidden is milliseconds off the marker where it was pixels. A record from before
   this build carries a number in the old unit, and on a lower-is-better board an old mean sorts above every honest new
   total and never leaves the top ten — the same silent wrongness build 11 retired runs for. `up2` in core/store.js drops
   exactly those two families and nothing else. */
export const RUN_SCHEMA = 3;
// S5: the dev switches on the About screen (Everything open, Supporter, Fresh game, Replay the intro) exist only while
// `dev` is true, and the store ignores a stored allOpen / supporter flag when it is false. The release build sets it false
export const BUILD_FLAGS = { dev: true };
export const PUB_URL = 'https://aidennovinc-dot.github.io/no-excuses/';
