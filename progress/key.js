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
   nothing and clears nothing. A.2 AS AMENDED AT BUILD 38 (#426): a build may generate a marked PLACEHOLDER bar, and both
   columns are full of them — isPlaceholder() tells a generated number from one Aiden set; everything else here treats both alike.
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
import { Scores, modeCount } from "../progress.js";

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
/* build 38 (Aiden, 2026-09-14 — "Author should wait for the Pro chest"): EACH TIER OPENS WITH ITS OWN CHEST. Pro with chest 1,
   exactly as mapOpen() says; Author with chest 2. Both still take the two dev escapes. Everything that asks whether a tier is
   open — the key strip, clears, retroactive credit, the key achievement sets, the radar's rungs — follows from this line. */
const tierOpen = tier => { const i = tierIx(tier); return i === 0 || !!(prefs['chest' + i] || prefs.allOpen || prefs.supporter); };
/* v21 (G.3, build 37 — amending v18 B.19 / B.20, where chest 1 needed key 1 whole and nothing else): CHEST 1 ALSO WAITS FOR
   EVERY GAME MODE TO BE UNLOCKED. THIS IS THE ONE PLACE THE TWO PROGRESSION SYSTEMS TOUCH — the unlock chain (L6) and the
   key — so it is one predicate, here beside mapOpen(), reading the chain through progress.js's modeCount() and never
   store.unlock. It honours the two dev escapes like every other progression gate. The gate cannot strand the chest: every
   key-1 bar belongs to a mode the chain reaches without it (checked 2026-09-14, asserted in the gate), so a Gauntlet or
   anything else put behind chest 1 can never be given a key-1 bar without the gate going red. */
const modesOpen = () => !!(prefs.allOpen || prefs.supporter) || (m => m.total > 0 && m.open === m.total)(modeCount());
// the store key: key 1 is the bare combination, so nothing a build-31 profile banked moves
const skey = (key, tier = 'clear') => tier === 'clear' ? key : `${key}|${tier}`;

/* ---------- build 38 (#426, A.2 amended): which numbers are GENERATED ----------
   A placeholder is a number site/scripts/placeholders.mjs wrote, marked on its row in config/key-bars.js as
   `placeholder:{ <tier>:{ v, conf, basis } }`. The marker counts only while the cell still holds `v`: a number Aiden has
   changed in place is his, whatever the marker says — the same test the generator writes by, so the two never disagree about
   which bars are his. Everything else in this file treats a placeholder as a bar like any other; this is how to tell. */
function isPlaceholder(c, tier) { if (!c || !c.bar || tier === 'clear') return false;
  const m = c.bar.placeholder && c.bar.placeholder[tier], v = barOf(c, tier); return !!m && v !== null && m.v === v; }
const placeholderCount = tier => COMBOS.filter(c => isPlaceholder(c, tier)).length;

/* ---------- the placeholder fill (Testing only, session only) ----------
   Build 34 added this because all sixty pro and author bars were null (#371) and both tiers were shells nobody could review:
   it filled them IN MEMORY — nothing written, config/key-bars.js untouched, gone on reload. BUILD 38 (#426) FILLED BOTH
   COLUMNS in the file with marked placeholders, so on the shipped table this has nothing left to do, and A.2 as amended
   forbids overwriting a number that is there, generated or not. So it fills EMPTY cells only, and `barsFaked()` is true only
   while it actually filled one — a tap that finds nothing to fill leaves it off. The key screen says so while it is on.
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
    for (const k of Object.keys(KEY_BARS)) { const r = KEY_BARS[k]; if (r.pro !== null && r.author !== null) continue;
      faked[k] = { pro: r.pro, author: r.author };
      if (r.pro === null) r.pro = harder(r.bar, r.bar, r.dir, { higher: 1.25, lower: 0.8 });
      if (r.author === null) r.author = harder(r.pro, r.bar, r.dir, { higher: 1.5, lower: 0.65 }); }
    if (!Object.keys(faked).length) faked = null; }
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
// build 38: one rung per OPEN tier, evenly spaced — key 1 alone before chest 1, two after it, three once the Pro chest is open
function radarRungs() { const open = TIERS.filter(tierOpen);
  return open.map((t, i) => ({ tier: t, at: (i + 1) / open.length, shell: isShell(t) })); }
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

/* ---------- v21 (G.4, build 37): retroactive credit when a chest opens ----------
   A chest reveals tiers whose bars the player may already have beaten. Every newly revealed, non-shell bar is judged
   against the SAVED BEST for its combination and banked on the spot, SILENTLY — no toast, no unlock sound, no interlude. The
   one sound and the one animation are the chest's own (ui/screens/pick.js openChest). `prefs.retro` marks what was banked
   this way so the keys screen can wear L8's green on those rows the first time they are on screen, and then drop the mark.
   The key achievements a retroactive clear completes are banked the same quiet way. A run that clears a bar LIVE still
   announces itself exactly as it always has: checkKey() hands the result screen its interlude. Idempotent — a second chest
   opening, or a second call, banks nothing it has already banked.
   BUILD 38 (#426 — Aiden: "yes, silently, once"): THE SAME CREDIT WHEN THE NUMBERS ARRIVE INSTEAD OF A CHEST. A profile whose
   Pro or Author tier was already open when its column filled (a chest opened against build 37's empty columns, or Testing's
   OPEN EVERYTHING) never saw a chest open for those bars. retroArrived() runs at boot and credits every open, non-shell tier
   whose column differs from the one last credited — `prefs.retroCol[tier]`, the column as a string, written by every credit
   including a chest's. So a reload never credits twice, the next boot does not undo Testing's per-key reset, and replacing a
   placeholder with Aiden's number changes the column and credits once more against the new bar. `only` limits a credit to
   the tiers it names. */
const colSig = tier => COMBOS.map(c => { const v = barOf(c, tier); return v === null ? '' : v; }).join(',');
function retroBank(only) { const fresh = [], sig = Object.assign({}, prefs.retroCol);
  for (const tier of TIERS) { if (tier === 'clear' || (only && !only.includes(tier)) || !tierOpen(tier) || isShell(tier)) continue;
    sig[tier] = colSig(tier);
    for (const c of COMBOS) { const bar = barOf(c, tier); if (bar === null || isCleared(c.key, tier)) continue;
      const best = bestOf(c); if (best === null || !beats({ hits: best }, bar, c.bar.dir)) continue;
      const k = skey(c.key, tier); store.bars[k] = Date.now(); fresh.push(k); } }
  prefs.retroCol = sig;
  if (fresh.length) prefs.retro = Object.assign({}, prefs.retro, Object.fromEntries(fresh.map(k => [k, 1])));
  save(); if (fresh.length) checkKeyAch({});
  return fresh; }
const retroArrived = () => { const due = TIERS.filter(t => t !== 'clear' && tierOpen(t) && !isShell(t) && (prefs.retroCol || {})[t] !== colSig(t));
  return due.length ? retroBank(due) : []; };

/* ---------- v21 (G.8, build 37): Testing's per-key switches (S5, dev only) ----------
   devKeyAll(tier, on) clears every bar of one key and REMEMBERS what that key held, so switching it off puts exactly that
   back — the state a test started from, not an empty key. devKeyReset(tier) backs the key out entirely: its bars, its
   whole-key moment, its chest, the step into the tier after it, its retroactive marks, its last-seen percentage and its
   three key achievements. The buttons are [data-dev] and the snapshot is shape-checked only while BUILD_FLAGS.dev is on, so
   none of this exists in a release build. */
const devKeyOn = tier => !!(prefs.devKeys && prefs.devKeys[tier]);
function devKeyAll(tier, on) { const dk = Object.assign({}, prefs.devKeys);
  if (on && !dk[tier]) { dk[tier] = COMBOS.map(c => skey(c.key, tier)).filter(k => store.bars[k]);
    for (const c of COMBOS) { const k = skey(c.key, tier); if (!store.bars[k]) store.bars[k] = Date.now(); } }
  else if (!on && dk[tier]) { const keep = new Set(dk[tier]);
    for (const c of COMBOS) { const k = skey(c.key, tier); if (!keep.has(k)) delete store.bars[k]; }
    delete dk[tier]; }
  prefs.devKeys = dk; save(); return devKeyOn(tier); }
function devKeyReset(tier) { const n = tierIx(tier) + 1;
  for (const c of COMBOS) delete store.bars[skey(c.key, tier)];
  if (prefs.keyWhole) delete prefs.keyWhole[tier];
  prefs['chest' + n] = 0; if ((prefs.pro | 0) >= n) prefs.pro = n - 1;
  if (prefs.retro) for (const k of Object.keys(prefs.retro)) if (k.endsWith('|' + tier)) delete prefs.retro[k];
  if (prefs.pctSeen) delete prefs.pctSeen[tier];
  if (prefs.devKeys) delete prefs.devKeys[tier];
  for (const id of Object.keys(store.ach)) if (id.startsWith(`key_${tier}_`)) delete store.ach[id];
  save(); }

export { COMBOS, RADAR_PAST, TIERS, barFor, barOf, barsFaked, barsMissing, barsOrphan, checkKey, fillBars, checkKeyAch, cleared, combos, credit, devKeyAll, devKeyOn, devKeyReset, frontPct, gameKey, isCleared, isPlaceholder, isShell, keyAch, keyOf, keyPct, keyState, keyTier, keyTiers, mapOpen, modesOpen, placeholderCount, radarOf, radarRungs, retroArrived, retroBank, skey, tierFull, tierOpen };
