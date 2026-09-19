/* No Excuses — the build (build 19, batch 10 · surface). DATA ONLY (A2).
   BUILD is the one place the number lives (A6): `npm run bump -- N` rewrites it here, then writes index.html
   (hint line, #build, the update-check constant) and version.json from it. Hand-editing four places is over. */
export const BUILD = 58;
export const LABEL = 'feel and fixes';                           // the hint line under the title: `build N · LABEL · date`
/* the run record's schema stamp (`v` on every run). 2 since build 18: the one-key store's legacy migration stamps every
   surviving build-13 run with this too, so the v10/v11 "retire runs with v < 11" rule can never fire again.
   3 since build 31 (v18 B.2 / B.4): TWO SCORING UNITS CHANGED. Timing · Stopwatch · Set is the SUM of its rounds' errors
   where it was their mean, and Timing · Hidden is milliseconds off the marker where it was pixels. A record from before
   this build carries a number in the old unit, and on a lower-is-better board an old mean sorts above every honest new
   total and never leaves the top ten — the same silent wrongness build 11 retired runs for. `up2` in core/store.js drops
   exactly those two families and nothing else. */
/* 4 since build 32 (v19 C.5 / C.6): Go / No-go's Set is measured over the 180ms gate — the same play reads 180 lower — and
   its Streak counts targets where it counted shapes. A Set record in the old unit sorts UNDER every honest new one on a
   lower-is-better board and an old Streak count sorts ABOVE every new one on a higher-is-better one; both are numbers
   nothing scores in any more. `up3` in core/store.js drops the Go / No-go runs and nothing else. */
export const RUN_SCHEMA = 4;
// S5: the dev switches on the About screen (Everything open, Supporter, Fresh game, Replay the intro) exist only while
// `dev` is true, and the store ignores a stored allOpen / supporter flag when it is false. The release build sets it false
/* v24 (A.3, build 43): Testing is on the menu from the FIRST load of the web build, so it needs a flag nobody has to remember to flip.
   TARGET is which shell this tree is for. The web tree (GitHub Pages) is 'web'; `npm run native` (scripts/native.mjs) writes a copy
   with TARGET = 'native', which zeroes `dev` below AND strips every [data-dev] node out of that copy's index.html, so the unlock-all
   switches cannot reach the App Store build by a hand edit being forgotten. Nothing else here changes between the two. */
export const TARGET = 'web';
export const BUILD_FLAGS = { dev: TARGET !== 'native' };
/* v26 (item 5, build 49): BEFORE RELEASE, set this true. Every chest's rewards name the About video it opens (config/messages.js), and while Aiden is
   still recording, a slot with no clip is shown anyway so the wording can be reviewed. True hides a video reward — in the pop-out, beside the chest on
   the map and the card's "A message from Aiden" button — whenever its slot has no clip yet. */
export const HIDE_UNRECORDED = false;
export const PUB_URL = 'https://aidennovinc-dot.github.io/no-excuses/';
