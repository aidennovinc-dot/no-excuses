/* No Excuses — the build (build 17, refactor stage 3). DATA ONLY (A2).
   BUILD is the one place the number lives (A6): `npm run bump -- N` rewrites it here, then writes index.html
   (hint line, #build, the update-check constant) and version.json from it. Hand-editing four places is over. */
export const BUILD = 17;
export const LABEL = 'refactor 0.3';           // the hint line under the title: `build N · LABEL · date`
// the run record's schema stamp (`v` on every run). ARCHITECTURE.md names this RUN_SCHEMA = 2, but the v10/v11
// migrations in core/store.js retire any hold / timing / reaction / spot:count run with v < 11 — stamping new runs 2
// would wipe them on the next boot. It stays 13 until Stage 4's migration ladder renumbers runs in the one-key store.
export const RUN_SCHEMA = 13;
export const PUB_URL = 'https://aidennovinc-dot.github.io/no-excuses/';
