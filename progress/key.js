/* No Excuses — the key (build 22, v14 §9.2–9.7). The SECOND progression system, and it shares nothing with the first
   but a screen. The unlock chain in config/unlocks.js is sequential and gates which GAMES are playable; the key is
   concurrent, gates nothing, and every game feeds it independently from the moment it is unlocked (9.2).

   A clearance bar is a ONE-OFF threshold, not a score to hold: beat it once in a solo run and that combination is
   cleared for good (9.3). Re-clearing does nothing and plays nothing. Pass & play and versus never contribute (9.4,
   consistent with L10), and neither does a practice run, a challenge-link run, or a run that ended with nothing on it.

   COMBINATIONS ARE BUILT FROM THE CONFIG, NEVER LISTED HERE (C.5). combos() walks GAMES × modes × GC(g,d).lens, which
   is the same walk keyAch() makes — a game with a SET_COPY row contributes Set and Streak per mode, a timed game
   contributes its lens, Sequence contributes its key counts. 6 + 6 + 4 + 2 + 4 + 4 + 4 today, and a new mode in
   config/games.js joins the key on its own with no edit here. The NUMBERS come from config/key-bars.js, keyed the same
   way; barsMissing() is what a combination with no row looks like, and the config wins — it is reported, never dropped.
   B.9 took Sequence from three key counts to two, which is the whole of how the total moved — nothing here counted it.

   A game's root length on the key screen is the fraction of ITS OWN combinations cleared, so it grows in segments
   (9.6). Nothing in here touches the DOM.

   v17 (§A.6, build 28): PERCENTAGE COMPLETE lives here too, because it is the same walk over the same combinations and
   a second copy of that walk is the one thing this file exists to prevent.

   v18 (B.27, build 32): THREE TIERS OVER THE SAME COMBINATIONS, and the tier is an argument. A row in config/key-bars.js
   carries `bar` (key 1), `pro` and `author`; every function here that used to read `c.bar.bar` reads barOf(c, tier)
   instead, and every store write is keyed by tier — 'g:d:s' for key 1, 'g:d:s|pro' and 'g:d:s|author' for the other two,
   so one map in store.bars holds all three and Fresh game clears them together. A TIER IS A SHELL WHILE ANY ROW OF ITS
   COLUMN IS NULL — derived here from the data, never a flag in config/keys.js — and a shell tier counts nothing, shows
   nothing and clears nothing: A.2 forbids deriving a bar, so until Aiden has filled the column there is no bar to beat.
   Tiers 2 and 3 also count nothing before chest 1 (A.1 / A.2): the chest is what hands the map over, and a pro bar
   quietly banked before it would make the reveal arrive part-done.
   B.17: the FRONT of the app shows one number, and entering Pro re-bases it — key 1 done is 30%, Pro fills the other 70;
   entering Author is the same step again. `prefs.pro` is which tier the player has stepped into (0, 1, 2).
   B.25: the three achievement sets tied to the keys are generated here (keyAch), one row per game per tier plus one per
   tier for the whole key — they read the same gameKey / keyState every screen reads, so a second walk never exists.
   B.24: radarOf(g) is the Scores radar's axis — how far a game's best sits against its three rungs. */
import { KEY_BARS } from "../config/key-bars.js";
import { KEYS } from "../config/keys.js";
import { KEY_ACH } from "../config/copy.js";
import { T } from "../core.js";
import { prefs, save, store } from "../core/store.js";
import { GAMES, GC } from "../games/registry.js";
import { Scores } from "../progress.js";

const keyOf = (g, d, s) => `${g}:${d}:${s}`;
// the three tier ids, in order, from the one list of keys
const TIERS = KEYS.map(k => k.id);
const tierIx = t => Math.max(0, TIERS.indexOf(t));
// every contributor combination, in screen order. From the mode config alone — see the header
function combos() { const out = [];
  for (const g in GAMES) for (const d of GAMES[g].modes) for (const s of GC(g, d).lens) out.push({ key: keyOf(g, d, s), g, d, s, bar: KEY_BARS[keyOf(g, d, s)] || null });
  return out; }
const COMBOS = combos();
const BY_GAME = Object.fromEntries(Object.keys(GAMES).map(g => [g, COMBOS.filter(c => c.g === g)]));
// the config is the source of which combinations exist. A row in key-bars.js that no mode claims, or a mode with no row,
// is a mismatch someone has to fix — the key screen says so out loud rather than quietly playing 30 of 31
const barsMissing = () => COMBOS.filter(c => !c.bar).map(c => c.key);
const barsOrphan = () => Object.keys(KEY_BARS).filter(k => !COMBOS.some(c => c.key === k));

/* ---------- B.27: the tier ---------- */
// the number a combination asks for at a tier. null where the column has not been filled (A.2: never derived)
function barOf(c, tier = 'clear') { if (!c || !c.bar) return null; const v = tier === 'clear' ? c.bar.bar : c.bar[tier]; return typeof v === 'number' && Number.isFinite(v) ? v : null; }
// a tier's column is FULL when every combination carries a number at it; a shell otherwise
const tierFull = tier => COMBOS.every(c => barOf(c, tier) !== null);
const isShell = tier => tier !== 'clear' && !tierFull(tier);
/* #411: tiers 2 and 3 exist for a profile only once chest 1 is opened (A.1 / A.2) — OR either of the two dev escapes
   every other gate in the app already honours, the pattern at ui/screens/progress.js:110. Testing's OPEN EVERYTHING is
   the one that matters: without it Aiden could not see Circuit or Thorn on his phone before a chest was reachable, which
   is the whole point of the switch. A.1's intent is untouched — core/store.js:39 reads both flags as `dev && ...`, so
   BUILD_FLAGS.dev strips them from release and a first-timer still meets exactly one target per game.
   EVERY gate on this map goes through mapOpen(); a new one that reads prefs.chest1 directly is the bug this fixed. */
const mapOpen = () => !!(prefs.chest1 || prefs.allOpen || prefs.supporter);
const tierOpen = tier => tier === 'clear' || mapOpen();
// the store key: key 1 is the bare combination, so nothing a build-31 profile banked moves
const skey = (key, tier = 'clear') => tier === 'clear' ? key : `${key}|${tier}`;

/* ---------- the placeholder fill (Testing only, session only) ----------
   A.2 says a bar is SET BY HAND and never derived, and that rule is not being relaxed: nothing here is ever written to
   storage, `config/key-bars.js` is not touched, and a reload throws the whole thing away. What it is for is that all
   sixty pro and author bars are still null (#371), so both those tiers are shells — Aiden could reveal them with
   OPEN EVERYTHING after #411 and still only ever see "not set yet". This fills them IN MEMORY so the Circuit and Thorn
   rings draw and play, which is the only way to review the key system before the real numbers exist. The key screen
   says so out loud while it is on (`barsFaked()`), because a derived number that is not announced is exactly what A.2
   is protecting against. The gate does the same mutation at _smoke/smoke.mjs to draw the two ring styles.
   Direction is read from the row, never assumed (C.7): a ceiling gets tighter, a floor gets higher. */
let faked = null;
const barsFaked = () => !!faked;
// a step past `bar` in the direction that combination scores, never equal to what it came from
function harder(from, bar, dir, f) { if (typeof bar !== 'number' || !Number.isFinite(bar)) return null;
  let v = Math.max(1, Math.round(bar * (dir === 'lower' ? f.lower : f.higher)));
  if (v === from) v = dir === 'lower' ? Math.max(1, from - 1) : from + 1;
  return v; }
function fillBars(on) {
  if (on && !faked) { faked = {};
    for (const k of Object.keys(KEY_BARS)) { const r = KEY_BARS[k]; faked[k] = { pro: r.pro, author: r.author };
      r.pro = harder(r.bar, r.bar, r.dir, { higher: 1.25, lower: 0.8 });
      r.author = harder(r.pro, r.bar, r.dir, { higher: 1.5, lower: 0.65 }); } }
  else if (!on && faked) { for (const k of Object.keys(faked)) { const r = KEY_BARS[k]; if (!r) continue;
      r.pro = faked[k].pro; r.author = faked[k].author; } faked = null; }
  return barsFaked(); }

const cleared = () => store.bars;
const isCleared = (key, tier = 'clear') => !!store.bars[skey(key, tier)];
// L10 / 9.4: solo only. A practice run, a challenge run, a two-player run and a run that failed with nothing on it never count
// v17 (B.4): a demo run is the fifth. The ghost plays the real engine, so without this a first-play demo could clear a bar
const eligible = (run, two) => !!run && !run.practice && !run.chal && !run.demo && !two && !(run.fail && !run.hits);
// direction is read from the data, never assumed (C.7): 'lower' is a ceiling, 'higher' is a floor
function beats(run, bar, dir) { return dir === 'lower' ? run.hits <= bar : run.hits >= bar; }
function barFor(run) { return KEY_BARS[keyOf(run.g, run.d, run.s)] || null; }
/* the one write. A solo run that beats a bar it had not beaten before clears that combination for good and hands the
   caller what to animate; anything else — including beating a bar already cleared — returns null and plays nothing (9.5).
   B.27: every OPEN, NON-SHELL tier is tried, lowest first, and every fresh clear is banked; what comes back is the lowest
   tier's clear, because that is the ring the interlude draws. A run that clears two tiers at once banks both. */
function checkKey(run, two) { if (!eligible(run, two)) return null;
  const key = keyOf(run.g, run.d, run.s), c = COMBOS.find(x => x.key === key); if (!c || !c.bar) return null;
  let first = null, wrote = false;
  for (const tier of TIERS) { if (!tierOpen(tier) || isShell(tier)) continue;
    const bar = barOf(c, tier); if (bar === null || isCleared(key, tier) || !beats(run, bar, c.bar.dir)) continue;
    store.bars[skey(key, tier)] = Date.now(); wrote = true;
    if (!first) { const p = gameKey(run.g, tier); first = { key, tier, g: run.g, d: run.d, s: run.s, bar: { bar, dir: c.bar.dir, unit: c.bar.unit }, was: p.done - 1, done: p.done, total: p.total }; } }
  if (wrote) save();
  return first; }

/* ---------- §A.6: percentage complete, per tier ----------
   progress = floor( 100 × Σ credit(c) / N ), c over every combination. A cleared combination is worth 1; one with no solo
   run at all is worth 0 (A.6.2 — a new profile starts at 0, not at whatever a ceiling game gives away for free); anything
   else is its ratio against its own bar, CAPPED AT 0.9 (A.6.1), so an uncleared combination can never read as done and the
   last stretch to 100% is always real clearing. A.6.3: a zero bar or a zero best is credit 0 rather than a divide — the
   ceilings are the ones at risk. A.6.4: it reads BEST scores, which only improve, so it only ever goes up; it is never
   computed from one run. Pass & play and versus never reach store.runs at all (L10 / 9.4), so "solo" needs no filter here. */
const bestOf = c => Scores.best(c.g, c.d, c.s);
function credit(c, tier = 'clear') { if (isCleared(c.key, tier)) return 1;
  const bar = barOf(c, tier); if (bar === null) return 0;
  const best = bestOf(c); if (best === null) return 0;
  if (!bar || !best) return 0;
  const ratio = c.bar.dir === 'lower' ? bar / best : best / bar;
  return Number.isFinite(ratio) ? Math.max(0, Math.min(0.9, ratio)) : 0; }
// the number for one tier. `done` and `total` come with it because the keys screen shows both (A.6.5, amended by B.15)
function keyPct(tier = 'clear') { const st = keyState(tier);
  if (isShell(tier)) return { done: 0, total: 0, pct: 0, tier };
  const sum = COMBOS.reduce((n, c) => n + credit(c, tier), 0);
  return { done: st.done, total: st.total, pct: st.total ? Math.floor(100 * sum / st.total) : 0, tier }; }
/* B.15 / B.17: THE ONE NUMBER ON THE FRONT OF THE APP. Before the player steps into Pro it is key 1's own percentage. Once
   they have (prefs.pro = 1), key 1 counts as 30 and Pro fills the remaining 70 — "it might stay at, like, thirty percent,
   and then the remaining seventy percent goes towards completion of pro" — and stepping into Author later is the same
   re-basing again: everything before it is 30, Author fills 70. It never goes back to zero and it never shows 100 again
   until the tier it is measuring is whole, which is the warning B.16 makes the player read first. */
const FRONT_BASE = 30;
function frontPct() { const into = Math.max(0, Math.min(TIERS.length - 1, prefs.pro | 0));
  if (!into) return keyPct('clear').pct;
  return FRONT_BASE + Math.floor((100 - FRONT_BASE) * keyPct(TIERS[into]).pct / 100); }

// a game's root: how many of its own combinations are cleared at a tier, and the fraction that makes
function gameKey(g, tier = 'clear') { const list = BY_GAME[g] || []; const done = list.filter(c => isCleared(c.key, tier)).length;
  return { g, tier, done, total: list.length, frac: list.length ? done / list.length : 0, list }; }
// the whole key at a tier: every game's root home is the key finished
function keyState(tier = 'clear') { const games = Object.keys(GAMES).map(g => gameKey(g, tier));
  const done = games.reduce((n, x) => n + x.done, 0), total = games.reduce((n, x) => n + x.total, 0);
  return { tier, games, done, total, frac: total ? done / total : 0, whole: total > 0 && done === total }; }

/* the three keys (v15 §5.3 / A.1, build 26). They are difficulty TIERS over the same combinations, not three collections:
   key 1 is the clearance bars this file already keeps, key 2 a pro tier and key 3 the author's times. B.27: a tier whose
   column in config/key-bars.js is not yet full is a SHELL — it answers with no combinations at all rather than a
   fabricated total (A.2). `locked` means "not finished", which is what a key that has not turned yet is. */
// v17 (B.31): the tier's theme rides along — its name, its tint and its own loop. The screen never names a theme itself
const skin = k => ({ theme: k.theme, style: k.style, track: k.track, tint: k.tint, dim: k.dim, ground: k.ground });
function keyTier(i) { const k = KEYS[i]; if (!k) return null;
  if (isShell(k.id)) return Object.assign({ i, id: k.id, name: k.name, lede: k.lede, shell: true, done: 0, total: 0, frac: 0, pct: 0, whole: false, locked: true }, skin(k));
  const st = keyState(k.id), p = keyPct(k.id);
  return Object.assign({ i, id: k.id, name: k.name, lede: k.lede, shell: false, done: st.done, total: st.total, frac: st.frac, pct: p.pct, whole: st.whole, locked: !st.whole }, skin(k)); }
const keyTiers = () => KEYS.map((_, i) => keyTier(i));

/* ---------- B.25: the three achievement sets tied to the keys ----------
   One row per game per tier — clear every one of that game's bars at that tier — and one per tier for the whole key:
   3 × (7 + 1) = 24 rows, generated from the same walk as everything else here, never listed. Each is a whole-set claim,
   so none carries live:1; run/run.js banks the key BEFORE it asks these, so a clear and the row it completes land on the
   same run. The Pro and Author sets are not shown before chest 1 (A.1) — the Achievements tab filters on tierOpen. */
function keyAch() { const out = [];
  KEYS.forEach((k, i) => { const tier = k.id;
    for (const g in GAMES) out.push({ id: `key_${tier}_${g}`, g, tier: `key${i + 1}`, kt: tier, name: T(KEY_ACH.game, { game: GAMES[g].name, key: k.name }), how: T(KEY_ACH.gameHow, { game: GAMES[g].name, key: k.name }), at: {},
      test: () => { const k = gameKey(g, tier); return tierOpen(tier) && !isShell(tier) && k.total > 0 && k.done === k.total; } });
    out.push({ id: `key_${tier}_all`, g: 'all', tier: `key${i + 1}`, kt: tier, name: T(KEY_ACH.whole, { key: k.name }), how: T(KEY_ACH.wholeHow, { key: k.name }),
      test: () => tierOpen(tier) && !isShell(tier) && keyState(tier).whole }); });
  return out; }
// the earn, written the moment it fires (v15 2.5): run/run.js calls this after checkKey and hands the rows to the result screen
function checkKeyAch(run) { if (!run || run.chal || run.practice || run.demo) return []; const got = store.ach; const fresh = [];
  for (const a of keyAch()) { if (!got[a.id] && a.test()) { got[a.id] = Date.now(); fresh.push(a); } }
  if (fresh.length) save(); return fresh; }

/* ---------- B.24: the Scores radar, measured against the three rungs ----------
   One value per game, 0..RADAR_PAST. Before chest 1 the axis is key 1 alone: the best ratio of any of the game's
   combinations against its clearance bar, capped at 1 — one rung and nothing beyond it (A.1). After chest 1 the three
   rungs sit at thirds: rung 1 is key 1's bar, rung 2 the Pro bar, rung 3 the Author time, and a score past the Author
   time pushes on to RADAR_PAST, which is where the flame lives. A shell tier is a rung with no value (A.2): a game cannot
   climb past the last rung that has a number, and the screen draws that rung dashed. `rungs` says which rungs exist. */
const RADAR_PAST = 1.15;
function radarRungs() { if (!mapOpen()) return [{ tier: 'clear', at: 1, shell: false }];
  return TIERS.map((t, i) => ({ tier: t, at: (i + 1) / TIERS.length, shell: isShell(t) })); }
// how far a best score sits from `from` to `to` on the combination's own direction, 0..1 (past `to` is > 1)
function stretch(best, from, to, dir) { if (best === null || from === null || to === null || from === to) return 0;
  return (best - from) / (to - from); }
function radarOf(g) { const list = BY_GAME[g] || []; const rungs = radarRungs(); let best = 0;
  for (const c of list) { const b = bestOf(c); if (b === null || !c.bar) continue; const dir = c.bar.dir; let v = 0;
    const b1 = barOf(c, 'clear'); if (b1 === null || !b1 || !b) continue;
    const ratio = dir === 'lower' ? b1 / b : b / b1;
    if (rungs.length === 1) { v = Math.min(1, ratio); best = Math.max(best, v); continue; }
    const step = 1 / rungs.length;
    if (ratio < 1) { v = ratio * step; best = Math.max(best, v); continue; }
    // at or past rung 1: climb rung by rung while the next rung has a number and the score has reached it
    v = step; let prev = b1;
    for (let i = 1; i < rungs.length; i++) { const r = rungs[i]; const bar = barOf(c, r.tier); if (bar === null) break;
      const reached = dir === 'lower' ? b <= bar : b >= bar;
      if (reached) { v = step * (i + 1); prev = bar; if (i === rungs.length - 1) { const over = dir === 'lower' ? (prev - b) / Math.max(1, prev) : (b - prev) / Math.max(1, prev); v = Math.min(RADAR_PAST, v + Math.max(0, over)); } }
      else { const part = Math.max(0, Math.min(0.999, stretch(b, prev, bar, dir))); v = step * i + step * part; break; } }
    best = Math.max(best, v); }
  return { v: best, rungs, past: best > 1 }; }

export { COMBOS, RADAR_PAST, TIERS, barFor, barOf, barsFaked, barsMissing, barsOrphan, checkKey, fillBars, checkKeyAch, cleared, combos, credit, frontPct, gameKey, isCleared, isShell, keyAch, keyOf, keyPct, keyState, keyTier, keyTiers, mapOpen, radarOf, radarRungs, skey, tierFull, tierOpen };
