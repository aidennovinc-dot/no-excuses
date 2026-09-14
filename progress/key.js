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
   B.25: the three achievement sets tied to the keys are generated here (keyAch), one row per game per tier plus one per
   tier for the whole key — they read the same gameKey / keyState every screen reads, so a second walk never exists.
   B.24: radarOf(g) is the Scores radar's axis — how far a game's best sits against its three rungs.

   v23 (§L.8 / §L.10 / §L.12, build 40): FOUR CHESTS AND ONE METER. The chests are config/chests.js — Games, Key, Pro, Thorns, named
   by what opens them — and every tier opens with the chest that reveals it: key 1 with the Games chest (§L.10a — KEY 1 IS QUIET
   UNTIL THEN), Pro with the Key chest, Author with the Pro chest. The meter is ONE function, meter(), 0–400, never reset; the menu
   card, the map's chests and the key screen all read it. B.15–B.17's frontPct() and its 30/70 re-base are RETIRED with the step
   into Pro (L.8b removed the "proceed to pro" confirmation), and v21 G.3's gate is retired into the Games chest itself. */
import { CHESTS, METER } from "../config/chests.js";
import { KEY_BARS } from "../config/key-bars.js";
import { KEYS } from "../config/keys.js";
import { KEY_ACH } from "../config/copy.js";
import { T } from "../core.js";
import { opened, prefs, save, store } from "../core/store.js";
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
/* #411: EVERY PROGRESSION GATE HONOURS THE TWO DEV ESCAPES — Testing's OPEN EVERYTHING and Supporter — never a chest flag alone.
   A.1's intent is untouched: core/store.js reads both flags as `dev && ...`, so BUILD_FLAGS.dev strips them from release.
   BUILD 40: the one read of a chest is chestOpen(id), which is core/store.js opened() — it lives there because ui/theme.js and
   audio.js (Customise's defaults, L.11a) sit below this file in the module graph — and every gate on the map goes through it. */
const chestOpen = id => opened(id);
/* build 40 (v23 §L.10, amending build 38's "chest n opens tier n+1"): EACH TIER OPENS WITH THE CHEST THAT REVEALS IT — key 1 with the
   Games chest, Pro with the Key chest, Author with the Pro chest (config/chests.js `opens`). Key 1 is QUIET until the Games chest
   (§L.10a, §M.2): no clear is banked, no number shown, no interlude, no outline fill, no key-1 achievement set — and the bars a saved
   best already beats bank silently when the chest opens (G.4, extended). Everything that asks whether a tier is open follows from this. */
const tierOpen = tier => { const c = CHESTS.find(x => x.opens === tier); return !c || chestOpen(c.id); };
/* v21 (G.3, build 37): THE ONE PLACE THE TWO PROGRESSION SYSTEMS TOUCH — every game mode unlocked — reading the chain through
   progress.js's modeCount() and never store.unlock. BUILD 40 (L.10): it is no longer a gate on the connector into chest 1; it is what
   opens the Games chest. The chest cannot be stranded: every key-1 bar belongs to a mode the chain reaches without it (asserted in the
   gate), so a Gauntlet or anything else put behind a chest can never be given a key-1 bar, or count toward the Games chest. */
const modesOpen = () => !!(prefs.allOpen || prefs.supporter) || (m => m.total > 0 && m.open === m.total)(modeCount());
// the store key: key 1 is the bare combination, so nothing a build-31 profile banked moves
const skey = (key, tier = 'clear') => tier === 'clear' ? key : `${key}|${tier}`;
// which tier a store key (or a retro mark) belongs to — the inverse of skey, so no screen parses a store key itself
const retroTier = k => { const i = String(k).indexOf('|'); return i < 0 ? 'clear' : k.slice(i + 1); };

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
   tier's clear, because that is the ring the interlude draws. A run that clears two tiers at once banks both.
   BUILD 40: key 1 is a tier like the others now — before the Games chest it is not open, so nothing banks and nothing interrupts. */
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
   computed from one run. Pass & play and versus never reach store.runs at all (L10 / 9.4), so "solo" needs no filter here.
   BUILD 40: no surface prints this any more — the meter counts cleared bars (METER.partial false, §M.1). It stays because it is
   what METER.partial true reads, and the gate keeps its arithmetic honest. */
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

// a game's root: how many of its own combinations are cleared at a tier, and the fraction that makes
function gameKey(g, tier = 'clear') { const list = BY_GAME[g] || []; const done = list.filter(c => isCleared(c.key, tier)).length;
  return { g, tier, done, total: list.length, frac: list.length ? done / list.length : 0, list }; }
// the whole key at a tier: every game's root home is the key finished
function keyState(tier = 'clear') { const games = Object.keys(GAMES).map(g => gameKey(g, tier));
  const done = games.reduce((n, x) => n + x.done, 0), total = games.reduce((n, x) => n + x.total, 0);
  return { tier, games, done, total, frac: total ? done / total : 0, whole: total > 0 && done === total }; }

/* ---------- v23 (§L.8a / §L.10b, build 40): THE METER — one number, 0–400, and every surface reads this function ----------
   Band 1 is the MODES band: modes unlocked ÷ modes total, not counting the ones a new profile starts with (METER.freeStart, §M.4).
   Bands 2–4 are key 1, Pro and Author: each key's CLEARED bars ÷ its bars (METER.partial false, L.8a; true reads keyPct()'s
   partial credit instead, §M.1) — and A BAND COUNTS ONLY ONCE THE CHEST THAT REVEALS ITS TIER IS OPEN, so the meter cannot pass 100
   before the Games chest or 200 before the Key chest; the gate asserts both. It never resets: nothing it reads goes down but a Testing
   reset. Supersedes B.15–B.17's frontPct() and its 30/70 re-base, retired with the step into Pro (L.8b). Shown as a whole number
   with its sign — 142% (L.8a). Testing's "set meter to N%" (L.8f, S5) is the one override: prefs.devMeter exists only in a dev build. */
const bandOf = tier => { if (!tierOpen(tier) || isShell(tier)) return 0;
  if (METER.partial) return keyPct(tier).pct / 100;
  const st = keyState(tier); return st.total ? st.done / st.total : 0; };
function meterBands() { const m = modeCount(), free = METER.freeStart ? m.free : 0, den = m.total - free;
  const modes = den > 0 ? Math.max(0, Math.min(1, (m.open - free) / den)) : 0;
  return (METER.modes ? [modes] : []).concat(TIERS.map(bandOf)); }
// the 1e-9 is floating point, not generosity: 100 × 0.29 is 28.999…, and a band that is 29% full must read 29
const meterReal = () => Math.floor(METER.band * meterBands().reduce((n, v) => n + v, 0) + 1e-9);
const meter = () => typeof prefs.devMeter === 'number' ? prefs.devMeter : meterReal();
const meterMax = () => METER.band * (TIERS.length + (METER.modes ? 1 : 0));
// one key's own band as a whole percentage — the key strip's figure, the same share the meter adds for it
const bandPct = tier => Math.floor(100 * bandOf(tier) + 1e-9);

/* ---------- v23 (§L.10, build 40): the four chests ----------
   A chest is OPEN once opened, for good; BEFORE while the chest ahead of it is shut ("open the previous chest", G.1); READY when the
   chest ahead is open and what it needs is met; LOCKED otherwise. Strictly sequential (L.10e) — nothing is ever ready behind a shut
   chest, and the gate asserts it. What each needs: 'modes' is modesOpen(); a tier id is that key whole (a shell never is, A.2).
   chestAt(id) is the meter figure at which it becomes ready — the top of the band before it. */
const chestIx = id => CHESTS.findIndex(c => c.id === id);
const chestOf = id => CHESTS.find(c => c.id === id) || null;
const chestMet = id => { const c = chestOf(id); if (!c) return false; if (c.needs === 'modes') return modesOpen(); return !isShell(c.needs) && keyState(c.needs).whole; };
function chestState(id) { const i = chestIx(id); if (i < 0) return null; if (chestOpen(id)) return 'open';
  if (i > 0 && !chestOpen(CHESTS[i - 1].id)) return 'before';
  return chestMet(id) ? 'ready' : 'locked'; }
const readyChest = () => { const c = CHESTS.find(x => chestState(x.id) === 'ready'); return c ? c.id : null; };
const chestAt = id => { const i = chestIx(id); if (i < 0) return null; const n = i + (METER.modes ? 1 : 0); return n > 0 ? n * METER.band : null; };
/* L.8b: THE OPEN, and it happens on the key screen by itself — no "Open the chest?", no "progress to Pro?". Only a READY chest opens;
   it is stored for good, the tier it reveals is credited against saved bests SILENTLY (G.4, which now reaches key 1 as well), and what
   comes back is the meter before and after, so the screen can count it up (D.4). Opened is opened: a second call is null. */
function openChest(id) { if (chestState(id) !== 'ready') return null; const c = chestOf(id), was = meter();
  prefs.chests = Object.assign({}, prefs.chests, { [id]: 1 }); save();
  const fresh = c.opens ? retroBank([c.opens]) : [];
  return { id, was, now: meter(), fresh }; }
/* v23 (§L.12, build 40): WHERE A WHOLE KEY TAPS THROUGH TO. The chest a key opens — the one whose `needs` is this tier — once the key is
   whole and that chest is ready or already open; null for a key still in progress, which does nothing new on tap. The key screen asks
   this and nothing else about a chest (A4). */
function keyChest(tier) { const c = CHESTS.find(x => x.needs === tier); if (!c || isShell(tier) || !keyState(tier).whole) return null;
  const st = chestState(c.id); return st === 'ready' || st === 'open' ? { id: c.id, state: st } : null; }

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
   same run. Each set waits for its own tier's chest — key 1's for the Games chest since build 40 — and the Achievements tab
   filters on tierOpen. */
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
   One value per game, 0..RADAR_PAST. Before the Key chest the axis is key 1 alone: the best ratio of any of the game's
   combinations against its clearance bar, capped at 1 — one rung and nothing beyond it (A.1). After it the rungs sit at
   even steps: rung 1 is key 1's bar, rung 2 the Pro bar, rung 3 the Author time, and a score past the Author
   time pushes on to RADAR_PAST, which is where the flame lives. A shell tier is a rung with no value (A.2): a game cannot
   climb past the last rung that has a number, and the screen draws that rung dashed. `rungs` says which rungs exist. */
const RADAR_PAST = 1.15;
/* build 38: one rung per OPEN tier, evenly spaced. BUILD 40: key 1's rung is always there, Games chest or not — the radar is the Scores
   screen's picture of a player's best, not the key, and with no rung it would have nothing to draw (guess) */
function radarRungs() { const open = TIERS.filter((t, i) => !i || tierOpen(t));
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
   against the SAVED BEST for its combination and banked on the spot, SILENTLY — no toast, no unlock sound, no interlude.
   `prefs.retro` marks what was banked this way so the keys screen can wear L8's green on those rows the first time they are
   on screen, and then drop the mark. The key achievements a retroactive clear completes are banked the same quiet way. A run
   that clears a bar LIVE still announces itself exactly as it always has: checkKey() hands the result screen its interlude.
   Idempotent — a second chest opening, or a second call, banks nothing it has already banked.
   BUILD 38 (#426 — Aiden: "yes, silently, once"): THE SAME CREDIT WHEN THE NUMBERS ARRIVE INSTEAD OF A CHEST. A profile whose
   Pro or Author tier was already open when its column filled never saw a chest open for those bars. retroArrived() runs at boot
   and credits every open, non-shell tier whose column differs from the one last credited — `prefs.retroCol[tier]`, the column as
   a string, written by every credit including a chest's. So a reload never credits twice, the next boot does not undo Testing's
   per-key reset, and replacing a placeholder with Aiden's number changes the column and credits once more against the new bar.
   `only` limits a credit to the tiers it names.
   BUILD 40 (L.10a): the Games chest credits KEY 1 this way too — bars cleared before it opens bank at open, silently. retroArrived()
   still leaves key 1 alone: its column is Aiden's own numbers, never a placeholder that arrives. */
const colSig = tier => COMBOS.map(c => { const v = barOf(c, tier); return v === null ? '' : v; }).join(',');
function retroBank(only) { const fresh = [], sig = Object.assign({}, prefs.retroCol);
  for (const tier of TIERS) { if ((only && !only.includes(tier)) || !tierOpen(tier) || isShell(tier)) continue;
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
   whole-key moment, the chest it opens, its retroactive marks and its three key achievements. The buttons are [data-dev] and
   the snapshot is shape-checked only while BUILD_FLAGS.dev is on, so none of this exists in a release build.
   v23 (L.8f, build 40): the switches are PER CHEST on the screen — four of them — and a key's switch is its chest's: the Key chest's
   is key 1, the Pro chest's Pro, the Thorns chest's Author. The Games chest's is the chain's, in progress.js (devModesAll), because
   nothing here may touch store.unlock; devChestReset('games') shuts the chest itself. devSetMeter(n) is "set meter to N%". */
const devKeyOn = tier => !!(prefs.devKeys && prefs.devKeys[tier]);
function devKeyAll(tier, on) { const dk = Object.assign({}, prefs.devKeys);
  if (on && !dk[tier]) { dk[tier] = COMBOS.map(c => skey(c.key, tier)).filter(k => store.bars[k]);
    for (const c of COMBOS) { const k = skey(c.key, tier); if (!store.bars[k]) store.bars[k] = Date.now(); } }
  else if (!on && dk[tier]) { const keep = new Set(dk[tier]);
    for (const c of COMBOS) { const k = skey(c.key, tier); if (!keep.has(k)) delete store.bars[k]; }
    delete dk[tier]; }
  prefs.devKeys = dk; save(); return devKeyOn(tier); }
// a reset never leaves the last-painted meter above what the profile now holds, or the next rise would count up from a ghost
const seenDown = () => { if (typeof prefs.meterSeen === 'number' && prefs.meterSeen > meterReal()) prefs.meterSeen = meterReal(); };
function devKeyReset(tier) { const c = CHESTS.find(x => x.needs === tier);
  for (const cb of COMBOS) delete store.bars[skey(cb.key, tier)];
  if (prefs.keyWhole) delete prefs.keyWhole[tier];
  if (c) prefs.chests = Object.assign({}, prefs.chests, { [c.id]: 0 });
  if (prefs.retro) for (const k of Object.keys(prefs.retro)) if (retroTier(k) === tier) delete prefs.retro[k];
  if (prefs.devKeys) delete prefs.devKeys[tier];
  for (const id of Object.keys(store.ach)) if (id.startsWith(`key_${tier}_`)) delete store.ach[id];
  seenDown(); save(); }
function devChestReset(id) { const c = chestOf(id); if (!c) return;
  if (c.needs === 'modes') { prefs.chests = Object.assign({}, prefs.chests, { [id]: 0 }); prefs.cusSeen = 0; seenDown(); save(); return; }
  devKeyReset(c.needs); }
function devSetMeter(n) { if (n === null || n === '' || !Number.isFinite(+n)) delete prefs.devMeter;
  else prefs.devMeter = Math.max(0, Math.min(meterMax(), Math.round(+n)));
  save(); return meter(); }

export { COMBOS, RADAR_PAST, TIERS, bandPct, barFor, barOf, barsFaked, barsMissing, barsOrphan, checkKey, checkKeyAch, chestAt, chestOpen, chestState, cleared, combos, credit, devChestReset, devKeyAll, devKeyOn, devKeyReset, devSetMeter, fillBars, gameKey, isCleared, isPlaceholder, isShell, keyAch, keyChest, keyOf, keyPct, keyState, keyTier, keyTiers, meter, meterMax, modesOpen, openChest, placeholderCount, radarOf, radarRungs, readyChest, retroArrived, retroBank, retroTier, skey, tierFull, tierOpen };
