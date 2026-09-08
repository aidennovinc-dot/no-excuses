/* No Excuses — the build (build 19, batch 10 · surface). DATA ONLY (A2).
   BUILD is the one place the number lives (A6): `npm run bump -- N` rewrites it here, then writes index.html
   (hint line, #build, the update-check constant) and version.json from it. Hand-editing four places is over. */
export const BUILD = 21;
export const LABEL = 'batch 10 · side screens';        // the hint line under the title: `build N · LABEL · date`
// the run record's schema stamp (`v` on every run). 2 since build 18: the one-key store's legacy migration stamps every
// surviving build-13 run with this too, so the v10/v11 "retire runs with v < 11" rule can never fire again
export const RUN_SCHEMA = 2;
// S5: the dev switches on the About screen (Everything open, Supporter, Fresh game, Replay the intro) exist only while
// `dev` is true, and the store ignores a stored allOpen / supporter flag when it is false. The release build sets it false
export const BUILD_FLAGS = { dev: true };
export const PUB_URL = 'https://aidennovinc-dot.github.io/no-excuses/';
