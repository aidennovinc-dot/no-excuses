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
   UNTIL THEN), Pro with the Skill chest, Author with the Pro chest. The meter is ONE function, meter(), 0–400, never reset; the menu
   card, the map's chests and the key screen all read it. B.15–B.17's frontPct() and its 30/70 re-base are RETIRED with the step
   into Pro (L.8b removed the "proceed to pro" confirmation), and v21 G.3's gate is retired into the Games chest itself. */
import { KEY_ROSTER } from "../config/achievements.js";
import { CHESTS, GAUNTLETS, METER, METER_BANDS } from "../config/chests.js";
import { MESSAGES } from "../config/messages.js";
import { MODE_NAME } from "../config/games.js";
import { KEY_BARS } from "../config/key-bars.js";
import { KEYS } from "../config/keys.js";
import { GAUNTLET, KEY, KEY_ACH } from "../config/copy.js";
import { T } from "../core.js";
import { opened, prefs, save, setKeyDone, store } from "../core/store.js";
import { GAMES, GC } from "../games/registry.js";
import { Scores, gamesDone, modeCount } from "../progress.js";
import { scoreTxt } from "../ui/format.js";

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
   Games chest, Pro with the Skill chest, Author with the Pro chest (config/chests.js `opens`). Key 1 is QUIET until the Games chest
   (§L.10a, §M.2): no clear is banked, no number shown, no interlude, no outline fill, no key-1 achievement set — and the bars a saved
   best already beats bank silently when the chest opens (G.4, extended). Everything that asks whether a tier is open follows from this. */
const tierOpen = tier => { const c = CHESTS.find(x => x.opens === tier); return !c || chestOpen(c.id); };
/* v29 (item 13, build 55): WHAT MAY BE WRITTEN, AS OPPOSED TO WHAT MAY BE SEEN. chestOpen() honours OPEN EVERYTHING and SUPPORTER, which
   is right for every READ - Testing's escapes are how Aiden reviews locked content on his phone (#411) - but checkKey and retroArrived
   were banking real |pro and |author bars while a flag was on, and those bars STAY once the flag is off. CLAUDE.md's line is "OPEN
   EVERYTHING and SUPPORTER stay flags that store no progress", and Testing's per-chest switches exist so a reviewer never has to.
   tierEarned() reads the chest itself and nothing else, and only the two writers ask it. */
const tierEarned = tier => { const c = CHESTS.find(x => x.opens === tier); return !c || !!(prefs.chests && prefs.chests[c.id]); };
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
// build 55 (in passing): the `run.fail && !run.hits` clause promised a guard that does not exist — no engine has set `fail` since Go / No-go's run-ender was retired
const eligible = (run, two) => !!run && !run.practice && !run.chal && !run.demo && !two;
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
  for (const tier of TIERS) { if (!tierOpen(tier) || !tierEarned(tier) || isShell(tier)) continue;   // item 13: a dev-opened tier is shown, never banked
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
   before the Games chest or 200 before the Skill chest; the gate asserts both. It never resets: nothing it reads goes down but a Testing
   reset. Supersedes B.15–B.17's frontPct() and its 30/70 re-base, retired with the step into Pro (L.8b). Shown as a whole number
   with its sign — 142% (L.8a).
   v26 (items 7 / 9 / 12, build 48): 0–300 — METER.modes is false, so the bands are the three keys alone and the Pro key lands on 200. AND
   THERE IS NO OVERRIDE. Build 40's `prefs.devMeter` let Testing make the meter read a figure nothing had earned, which is how the Pro chest
   sat locked at 203% saying "opens at 300%" beside a Keys screen that disagreed. meter() is what the bars and the chests say, full stop, and
   Testing's "set meter to N%" now clears the bars and opens the chests that figure means (devMeterTo, below). */
/* ---------- v30 (59.11, build 59): THE FIRST 100 IS MODES UNLOCKED + KEY-1 BARS, IN EQUAL STEPS ----------
   Aiden, on a menu reading "0% complete": "The percent complete just stays at zero until I've opened the Games chest. It should go
   towards 100% as we play the game. I know that most of the contribution is coming from obtaining the first key, but the user should
   also feel like they're progressing based on the games they unlocked. So the first 100% should be a combination of unlocking games
   and then doing the key. So break it up however you want, but as long as it's consistent."
   CAUSE: build 48 set METER.modes false, so the meter was the three key bands alone, and bandOf() answers 0 for key 1 until the Games
   chest is open — nothing a new player did moved the number.
   COWORK'S SPLIT, which he delegated ("break it up however you want"): EQUAL STEPS. Every mode unlocked and every key-1 bar cleared is
   worth the same slice of the first hundred, so there is no magic 30/70 to defend and no re-base like the retired frontPct(). With 30
   key-1 bars and 12 unlockable modes that puts the Games chest at about 29% and leaves the key the rest, which matches his "most of the
   contribution is coming from obtaining the first key".
   WHAT DOES NOT MOVE. 100 still means key 1 WHOLE — with every mode open the modes part is already full, so the last bar is still what
   takes it to 100. Pro and Author are still 100 each, so the meter is still 0–300, one meter, never reset, no override, only ever up
   (METER.modes stays false: the modes share sits INSIDE the first band, it is NOT a fourth band, which is what build 40's 0–400 was).
   meterPct() is still the one thing any surface prints, which is the "consistent" he asked for.
   AND THE ONE JUDGEMENT CALL, named in the outcome: key-1 bars cleared BEFORE the Games chest opens still land WHEN IT OPENS, as they
   did, so the number never runs ahead of what the player has been shown. Only the modes part moves before that. */
const modesPair = () => { const m = modeCount(), free = METER.freeStart ? m.free : 0, den = Math.max(0, m.total - free);
  return { num: Math.max(0, Math.min(den, m.open - free)), den }; };
/* how full a tier's band is at a given number of cleared bars. The FIRST band carries the modes with it; the other two are the bars
   alone, unchanged. Testing's "set meter to N%" walks this too, so the walk and the reading can never disagree. */
function bandWith(tier, bars) { const st = keyState(tier);
  if (tier !== TIERS[0]) return st.total ? Math.max(0, Math.min(1, bars / st.total)) : 0;
  const m = modesPair(), den = m.den + st.total;
  return den > 0 ? Math.max(0, Math.min(1, (m.num + bars) / den)) : 0; }
const bandOf = tier => { const shell = isShell(tier), open = tierOpen(tier);
  if (tier === TIERS[0]) return shell ? 0 : bandWith(tier, open ? keyState(tier).done : 0);
  if (!open || shell) return 0;
  if (METER.partial) return keyPct(tier).pct / 100;
  const st = keyState(tier); return st.total ? st.done / st.total : 0; };
function meterBands() { const m = modeCount(), free = METER.freeStart ? m.free : 0, den = m.total - free;
  const modes = den > 0 ? Math.max(0, Math.min(1, (m.open - free) / den)) : 0;
  return (METER.modes ? [modes] : []).concat(TIERS.map(bandOf)); }
// the 1e-9 is floating point, not generosity: 100 × 0.29 is 28.999…, and a band that is 29% full must read 29
const meterReal = () => Math.floor(METER.band * meterBands().reduce((n, v) => n + v, 0) + 1e-9);
const meter = () => meterReal();
const meterMax = () => METER.band * (TIERS.length + (METER.modes ? 1 : 0));
/* ---------- v28 (item 9, build 53): WHAT A PLAYER IS SHOWN IS 0–100, AND IT CANNOT PASS 100 ----------
   The meter itself is unchanged: three bands of 100, one per key, and every chest threshold, every band colour and all of Testing's
   arithmetic still read it. What was wrong is what was PRINTED. Aiden saw "300% complete" on the front of the app and his line is
   "whatever it counts cannot exceed 100" — a percentage that runs to 300 is not a percentage. meterPct() is the shown figure: the meter
   over the top of the meter, rounded, clamped. It is the ONE thing any surface prints; meter() is what the app reasons with.
   WHERE THE 300 CAME FROM — not real play. devReach('thorns') (Testing's Author-chest switch) fills every bar of all three keys and opens
   the three chests before it, which is 300 by construction, and it leaves the Author chest READY rather than open — so the old figure could
   read its own maximum with a chest still shut. The 103% / 203% of build 46 are the same arithmetic three bars into the next band.
   100 shown therefore means every bar on every key is cleared; the last chest is a reward for that, not more of it. */
/* ---------- v29 (item 1, build 55): AND THE FIGURE IS 0-300 AGAIN ----------
   Build 53 (v28 item 9) put meterPct() over the top of meter() and clamped it to 100, so the front of the app read 100% while two of
   the three keys were still empty and every surface lost the difference between 100, 200 and 300. That is the 2026-09-14 decision
   reversed, and the decision stands: ONE METER, 0-300, never reset, no override. meterPct() keeps its job - it is still the ONE thing
   any surface prints, and the one place rounding happens - but what it prints is the meter itself, held between 0 and its own maximum.
   meter() is unchanged: three bands of 100, a band counting only once the chest that reveals its tier is open, so key 1 whole is 100,
   Pro whole is 200 and Author whole is 300. The gate asserts a store with key 1 and Pro cleared renders 200%. */
const meterPct = v => Math.max(0, Math.min(meterMax(), Math.round(typeof v === 'number' ? v : meter())));
/* v23 (§L.8d / §L.8e, build 41): WHICH BAND a meter figure is in, and how far through it — presentation only (L10). A band starts at its
   lower figure (100% is band 1, guess) and the top of the meter is the top of the last band, so 400% is band 3 at full strength. ui/chest.js
   turns this into the look; nothing here knows a colour. */
function meterBand(v) { const w = METER.band, n = METER_BANDS.length, x = Math.max(0, +v || 0);
  const i = Math.max(0, Math.min(n - 1, Math.floor(x / w))); return { i, k: Math.max(0, Math.min(1, (x - i * w) / w)) }; }
// one key's own band as a whole percentage — the key strip's figure, the same share the meter adds for it
const bandPct = tier => Math.floor(100 * bandOf(tier) + 1e-9);

/* ---------- v23 (§L.10, build 40): the four chests ----------
   A chest is OPEN once opened, for good; BEFORE while the chest ahead of it is shut ("open the previous chest", G.1); READY when the
   chest ahead is open and what it needs is met; LOCKED otherwise. Strictly sequential (L.10e) — nothing is ever ready behind a shut
   chest, and the gate asserts it. What each needs: 'modes' is modesOpen(); a tier id is that key whole (a shell never is, A.2).
   chestAt(id) is the meter figure at which it becomes ready — the top of the band before it. */
const chestIx = id => CHESTS.findIndex(c => c.id === id);
const chestOf = id => CHESTS.find(c => c.id === id) || null;
/* ---------- v29 Section A (58.2, build 58, quoting L6): A FINISHED GAUNTLET OPENS THE NEXT CHEST ----------
   This REVERSES build 56 SS3's "a Gauntlet advances nothing", which was L10's principle applied to a thing that is not a
   mode. Aiden authorised it on 2026-09-19. What that call got right is still true and is not touched here: a Gauntlet
   still banks no key, no clearance bar, no unlock, no achievement and no board row, and run/gauntlet.js still returns
   before a line of banking runs. The one thing it now does is FINISH, and a finish is a row in its own board.

   IT GATES THE CHEST, NOT THE KEY (Cowork's reading, built as written). The key is the game targets and nothing else, so
   `keyState`, the bars, the meter and every figure on a key screen are exactly what they were. The chest asks for the
   whole key AND a finished Gauntlet, and a chest that has both is READY as it always was.

   NO SCORE THRESHOLD — finishing is the requirement, which is what 58.2 says. Quitting does not finish: run/gauntlet.js
   writes a row only from finishGauntlet(), so `gaunt` holds completed runs alone and nothing here has to test for one.

   NOBODY IS LOCKED BACK OUT. chestState() answers 'open' from the store before it asks this, so a chest already opened
   stays open whatever the Gauntlet board says, and the tier it revealed stays revealed. A chest that was READY and is
   not yet opened becomes LOCKED with its Gauntlet named — which is the change, and is what a player who has not run one
   should see. Like every gate here it honours the two dev escapes (#411), so OPEN EVERYTHING still reviews past it. */
const gauntDone = gid => !gid || !!(prefs.allOpen || prefs.supporter)
  || (Array.isArray(store.gaunt) ? store.gaunt : []).some(r => r && r.id === gid);
// the best finished run of a Gauntlet, for its map tile — null when it has never been finished
const gauntBest = gid => { const rows = (Array.isArray(store.gaunt) ? store.gaunt : []).filter(r => r && r.id === gid && Number.isFinite(r.score));
  return rows.length ? Math.max.apply(null, rows.map(r => r.score)) : null; };
const chestKeyMet = c => c.needs === 'modes' ? modesOpen() : !isShell(c.needs) && keyState(c.needs).whole;
const chestMet = id => { const c = chestOf(id); if (!c) return false; return chestKeyMet(c) && gauntDone(c.gaunt); };
/* WHAT A LOCKED CHEST IS WAITING FOR, one row per requirement with its own tick — so the map tile lists both and marks
   each as it is met, and the Unlocks screen's chest tab (58.3) prints the same two rows off the same read. `k` is which
   kind, so a screen names it without knowing what a key or a Gauntlet is; `done` is that row alone, never the chest. */
function chestNeeds(id) { const c = chestOf(id); if (!c) return [];
  const out = [{ k: c.needs === 'modes' ? 'modes' : 'key', tier: c.needs === 'modes' ? null : c.needs, done: chestKeyMet(c) }];
  if (c.gaunt) out.push({ k: 'gaunt', gaunt: c.gaunt, done: gauntDone(c.gaunt) });
  return out; }
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
/* v29 Section A (58.2, build 58): A WHOLE KEY WHOSE CHEST IS WAITING FOR A GAUNTLET STILL ANSWERS. The key screen's
   "tap the key to open the chest" line is written off this, and before 58.2 a whole key whose chest was not ready
   answered null and the screen said nothing at all — which would now be the ordinary case for anyone who has filled the
   Pro key and not run Gauntlet Mini. The state `gaunt` is that case: the key is whole, the chest is not ready, and the
   only thing outstanding is the Gauntlet, which the screen names. */
/* v30 (59.6, build 59): WHICH GAUNTLET MUST WIELD THIS KEY, as a standing fact rather than a state. `keyChest` below answers
   only once the key is WHOLE, which is too late to be a reason: 59.6 takes the Gauntlet requirement off the chest's map tile
   (where it wrapped to four lines over the drawing) and puts it into the KEY'S OWN STORY, where it has to read from the moment
   the tier is open. Empty for a key whose chest wants no Gauntlet, which is the Skill key and always will be. */
const keyGaunt = tier => { const c = CHESTS.find(x => x.needs === tier); return c && c.gaunt ? c.gaunt : ''; };
function keyChest(tier) { const c = CHESTS.find(x => x.needs === tier); if (!c || isShell(tier) || !keyState(tier).whole) return null;
  const st = chestState(c.id);
  if (st === 'ready' || st === 'open') return { id: c.id, state: st };
  return c.gaunt && !gauntDone(c.gaunt) && st === 'locked' ? { id: c.id, state: 'gaunt', gaunt: c.gaunt } : null; }

/* the three keys (v15 §5.3 / A.1, build 26). They are difficulty TIERS over the same combinations, not three collections:
   key 1 is the clearance bars this file already keeps, key 2 a pro tier and key 3 the author's times. B.27: a tier whose
   column in config/key-bars.js is not yet full is a SHELL — it answers with no combinations at all rather than a
   fabricated total (A.2). `locked` means "not finished", which is what a key that has not turned yet is. */
// v17 (B.31): the tier's theme rides along — its name, its tint and its own loop. The screen never names a theme itself
// build 42 (L.7b): `music` is the chest that opens this key's theme (config/keys.js) — the key screen's SET THIS MUSIC reads it
const skin = k => ({ theme: k.theme, style: k.style, track: k.track, music: k.music, tint: k.tint, dim: k.dim, ground: k.ground });
function keyTier(i) { const k = KEYS[i]; if (!k) return null;
  if (isShell(k.id)) return Object.assign({ i, id: k.id, name: k.name, lede: k.lede, shell: true, done: 0, total: 0, frac: 0, pct: 0, whole: false, locked: true }, skin(k));
  const st = keyState(k.id), p = keyPct(k.id);
  return Object.assign({ i, id: k.id, name: k.name, lede: k.lede, shell: false, done: st.done, total: st.total, frac: st.frac, pct: p.pct, whole: st.whole, locked: !st.whole }, skin(k)); }
const keyTiers = () => KEYS.map((_, i) => keyTier(i));
/* v24 (C.6, build 43): A KEY IS FINISHED when its tier is open, has numbers, and every bar on it is cleared — what opens that key's background
   in Customise. Read here, not off the `key_<tier>_all` achievement, so a key filled by Testing's switch opens it the moment it is whole, as
   the key screen already shows it; and like every progression gate it honours the two dev escapes (#411). */
const keyFinished = tier => !!(prefs.allOpen || prefs.supporter) || (tierOpen(tier) && !isShell(tier) && keyState(tier).whole);
/* v28 (item 2, build 53): core/store.js everywhere() has to ask whether a key is EARNED — Customise's Music row gates the three key tracks
   on the key, not on the chest it opens — and core/ sits below progress/ in the graph. One binding, at import, so the store reads the same test. */
setKeyDone(keyFinished);
/* v25 (item 23, build 46): IS THIS MESSAGE OPEN? One test, here, because both the About screen and the congratulations card ask it and a
   screen may not import a screen (A4). `msgDot` is the small mark on the About menu row: an open slot that HAS A CLIP and has not been watched.
   v27 (item 8, build 52): FOUR KINDS OF LOCK, one shape each (config/messages.js has the table). `{ key:… }` is gone with the three rows that
   used it. Every one honours the two dev escapes, like every other gate here (#411) — Testing's OPEN EVERYTHING is how Aiden reviews locked
   content on his phone, so a test that reads its own flag alone is a lock he cannot see past.
     run       that combination finished SOLO — Scores.runs() holds only submitted runs, and run/run.js never submits a two-player, practice or
               demo one (L10), so the array is already the right set and the mode is not named: any Quick Tap · Sprint counts
     chest     that chest opened            — chestOpen(), the one read every surface uses
     gauntlet  that Gauntlet PLAYED for the first time — prefs.gauntSeen, written by ui/screens/gauntlet.js when the screen is opened. NOT the
               chest it came out of: the chest only makes the Gauntlet exist, and item 8 is explicit that the message is for playing it
     support   A SUPPORT PAYMENT HAS GONE THROUGH — prefs.paid, and NOTHING IN THE APP SETS IT. Item 8: "not a tap on the support button".
               This is the named hook and the whole of it; the day there is a payment route, that route writes prefs.paid and this row opens. */
// which chest a Gauntlet comes out of — config/chests.js GAUNTLETS is the one place that pairing lives (item 13, build 49)
const gauntChest = id => { const g = GAUNTLETS.find(x => x.id === id); return g ? g.chest : ''; };
const msgRun = r => !!r && Scores.runs().some(x => x.g === r.g && (r.d === undefined || x.d === r.d) && (r.s === undefined || x.s === r.s));
const msgOpen = m => { if (!m) return false; const b = m.by; if (!b) return true;
  if (prefs.allOpen || prefs.supporter) return true;
  return b.chest ? chestOpen(b.chest) : b.gauntlet ? !!(prefs.gauntSeen || {})[b.gauntlet] : b.support ? !!prefs.paid : b.run ? msgRun(b.run) : false; };
/* R1 (item 2 extended by item 8, build 52): IS THIS MESSAGE EVEN IN THE LIST? A secret may be known to exist, never what it is — so a Gauntlet's
   row is not drawn at all until that Gauntlet has come out of its chest: no row, no gap, no "???". Everything else is always listed, locked or
   open, including the support thank-you, which says what opens it. THE COUNTER IS NOT NARROWED BY THIS — ui/screens/about.js counts against
   MESSAGES.length, so it always reads "N of 8" and a player knows two secrets are there without knowing what they are (Aiden, item 8). */
const msgShown = m => !m ? false : m.by && m.by.gauntlet ? !!(prefs.allOpen || prefs.supporter) || chestOpen(gauntChest(m.by.gauntlet)) : true;
/* v28 (item 13, build 53): the cracks on the Games chest, as the sprite wants them. Nothing stores it: it is derived, so the map shows the same
   chest on the next visit and on a different device with the same profile.
   v29 SECTION A (57.2, build 57): AND IT IS NONE UNTIL THE CHEST IS OPENED, which REVERSES item 13's "one per finished game, accumulating on the
   map". Aiden: no cracks anywhere before it is opened — not on the opening screen, not on the map. The cracking is the OPENING now (each of the
   seven squares puts one in as it is ticked off, config/chests.js CEREMONY.games `crack`), and once the chest is open its tile may stay broken,
   so all seven stand from then on. `gamesDone()` no longer decides it; the chest's own state does. */
const crackCount = () => chestOpen('games') ? 7 : 0;
const msgDot = () => MESSAGES.some(m => m.file && msgShown(m) && msgOpen(m) && !(prefs.msgSeen || {})[m.id]);
/* v28 (item 10, build 53): A MESSAGE'S TITLE, AND A GAUNTLET'S IS ITS GAUNTLET'S NAME. The two Gauntlet slots carry `gaunt` instead of a title,
   so renaming a Gauntlet in config/copy.js renames its row on the Messages list, its video title in the player and its word on the chest — one
   spelling, which is what item 10 asks for. Every other slot keeps its own `title`. */
const msgTitle = m => !m ? '' : m.gaunt ? T(GAUNTLET.msgTitle, { name: GAUNTLET.name[m.gaunt] || m.gaunt }) : (m.title || '');

/* ---------- B.25: the three achievement sets tied to the keys ----------
   One row per game per tier — clear every one of that game's bars at that tier — and one per tier for the whole key:
   3 × (7 + 1) = 24 rows, generated from the same walk as everything else here, never listed. Each is a whole-set claim,
   so none carries live:1; run/run.js banks the key BEFORE it asks these, so a clear and the row it completes land on the
   same run. Each set waits for its own tier's chest — key 1's for the Games chest since build 40 — and the Achievements tab
   filters on tierOpen. */
/* v24 (D.2, build 44, narrowing #435): AND ONE ACHIEVEMENT ON EVERY KEY REQUIREMENT, AT EVERY TIER — 30 combinations × 3 = 90 rows,
   from the same walk, ahead of each tier's sets. A row is earned when its combination's bar is cleared at its tier, so the achievement
   and the requirement can never disagree, and its bar is credit(). Names are config/achievements.js KEY_ROSTER, keyed by the row id in
   config/key-bars.js — 39 carried over from the Achievement Desk, 51 proposed on the Key Unlocks Desk. The 23 that replace an older
   row keep that row's id, so what a profile earned stays earned and a cosmetic it opened stays open, and they keep its reward. A tier not
   yet revealed prints no number (A.1): its rows say which key they belong to instead. */
function rosterRow(c, tier) { const id = c.bar ? c.bar.id : c.key, r = (KEY_ROSTER[id] || {})[tier] || {};
  return { id: r.id || `key_${tier}_${id}`, name: r.name || id, unlocks: r.unlocks || null }; }
// the bar in the game's own units — the same sentence ui/screens/key.js prints beside it
function barText(c, bar) { const n = scoreTxt(c.g, bar, c.d, c.s); return /[^\d.]$/.test(n) || !c.bar.unit ? n : n + ' ' + c.bar.unit; }
const wantOf = (c, tier) => { const bar = barOf(c, tier); return bar === null ? KEY.none : T(c.bar.dir === 'lower' ? KEY.ceil : KEY.floor, { bar: barText(c, bar) }); };
function keyAch() { const out = [];
  KEYS.forEach((k, i) => { const tier = k.id;
    for (const c of COMBOS) { if (!c.bar) continue; const r = rosterRow(c, tier);
      out.push(Object.assign({ id: r.id, g: c.g, tier: `key${i + 1}`, kt: tier, combo: c.key, name: r.name,
        how: tierOpen(tier) ? wantOf(c, tier) : T(KEY_ACH.shut, { key: k.name }), at: MODE_NAME[c.d] ? { d: c.d, s: c.s } : { s: c.s },
        test: () => tierOpen(tier) && !isShell(tier) && isCleared(c.key, tier), progress: () => credit(c, tier) }, r.unlocks ? { unlocks: r.unlocks } : {})); }
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
   One value per game, 0..RADAR_PAST. Before the Skill chest the axis is key 1 alone: the best ratio of any of the game's
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
/* v24 (E, build 44): KEY 1 IS CREDITED THE SAME WAY NOW. Build 40 left it out because its column was "Aiden's own numbers, never a
   placeholder that arrives" — and build 44 is exactly the day his numbers arrive, replacing Cowork's proposals. So a profile whose key 1
   is open credits every bar its saved best already beats, silently, once — Aiden's #426 answer applied to the column it now covers (guess). */
// v29 (item 13, build 55): tierEarned, not tierOpen - boot must not bank a Pro column into a profile whose Skill chest is only dev-open
const retroArrived = () => { const due = TIERS.filter(t => tierEarned(t) && !isShell(t) && (prefs.retroCol || {})[t] !== colSig(t));
  return due.length ? retroBank(due) : []; };

/* v24 (D.1, build 44): THE GOAL AT THE TOP, WHEN THE CHAIN HAS NOTHING FOR THIS RUN — this combination's nearest unearned key requirement:
   the lowest tier that is open, has numbers and is not cleared, named by its roster row. A key the player cannot see yet offers nothing
   (A.1), so before the Games chest there is no key goal at all. `key` is prefixed so it can never be mistaken for a store.unlock key, and
   the tick-green test is only offered where the score can only grow — a floor; a ceiling is a whole-run claim (v18 B.8). */
function keyGoal(g, d, s) { const c = COMBOS.find(x => x.key === keyOf(g, d, s)); if (!c || !c.bar) return null;
  const tier = TIERS.find(t => tierOpen(t) && !isShell(t) && barOf(c, t) !== null && !isCleared(c.key, t)); if (!tier) return null;
  const bar = barOf(c, tier), floor = c.bar.dir !== 'lower', k = KEYS.find(x => x.id === tier);
  return { key: 'bar:' + skey(c.key, tier), kt: tier, need: wantOf(c, tier), name: rosterRow(c, tier).name, keyName: k ? k.name : '',
    test: r => floor && r.g === g && r.d === d && r.s === s && r.hits >= bar }; }

/* ---------- v21 (G.8, build 37) → v26 (items 7 / 12, build 48): TESTING PLAYS THE GAME FORWARD (S5, dev only) ----------
   Build 37's per-key switch filled a key's bars wherever it stood and REMEMBERED what it held, so switching it off put exactly that back; build
   40 made the switches per chest and added "set meter to N%" as an override the meter read. Every one of those could leave a profile where real
   play can never be: bars cleared on a key whose chest is shut, a Pro chest still open behind a Skill chest a reset had shut, a meter reading a
   figure nothing had earned. Aiden reviews the whole unlock flow through these buttons, so every one of those states was a misleading test
   (FEEDBACK-v26 items 7 and 12: the Games chest at 103%, the Pro chest locked at 203% "opens at 300%", the map and the Keys screen disagreeing).
   So Testing now does only what play does, through the functions play uses:
   · devReach(id)    plays forward until that chest is READY — every chest before it filled the way play fills it and OPENED the way a tap opens
                     it (openChest: stored, the tier it reveals credited silently), then its own need filled. It never opens the chest itself:
                     play leaves a chest ready until the player taps it, and that tap is what Aiden is there to review.
   · devBack(id)     backs that chest out AND EVERY CHEST AFTER IT, with the tiers they reveal and the key that opens it, so what is left is
                     always a state play passes through on the way — never a chest open behind a shut one (L.10e).
   · devMeterTo(n)   the meter at n, reached by clearing bars and opening chests in play's own order; what it lands on is what it reports.
   A bar is cleared with checkKey's own write, and the key achievements it completes are banked the way a run banks them (checkKeyAch).
   The Games chest's need is every game mode, which is progress.js's to write (nothing here may touch store.unlock, G.3), so the Testing
   screen hands those two functions its `modes` — fill every mode, or take them all back out. */
// a reset never leaves the last-painted meter above what the profile now holds, or the next rise would count up from a ghost
const seenDown = () => { if (typeof prefs.meterSeen === 'number' && prefs.meterSeen > meterReal()) prefs.meterSeen = meterReal(); };
// the bars of one tier cleared in screen order until `n` of them are, with checkKey's write — only on a tier play could clear (open, numbered)
function devClearTo(tier, n = Infinity) { if (!tierOpen(tier) || isShell(tier)) return keyState(tier).done; let wrote = false;
  for (const c of COMBOS) { if (keyState(tier).done >= n) break; if (!c.bar || barOf(c, tier) === null || isCleared(c.key, tier)) continue;
    store.bars[skey(c.key, tier)] = Date.now(); wrote = true; }
  if (wrote) { save(); checkKeyAch({}); }
  return keyState(tier).done; }
/* a READY chest opened the way the player opens it — openChest(), then what its reveal and the map's first paint of it leave behind: the reveal
   played (so did the reveal of the key that opened it, which always plays first), the ready sound heard and the words spilled. Used only for the
   chests a Testing button passes THROUGH on the way to the one it leaves ready. */
function devOpen(id) { const r = openChest(id); if (!r) return null; const c = chestOf(id);
  prefs.meterSeen = r.now;
  prefs.revealed = Object.assign({}, prefs.revealed, { ['chest:' + id]: 1 }, c && c.needs !== 'modes' ? { ['key:' + c.needs]: 1 } : {});
  prefs.readySeen = Object.assign({}, prefs.readySeen, { [id]: 1 }); prefs.spill = Object.assign({}, prefs.spill, { [id]: 1 });
  save(); return r; }
/* what a chest's need is filled with: every mode for the Games chest (the caller's), that key's every bar for the rest —
   and since 58.2 (build 58) a finished Gauntlet where the chest asks for one, or every Testing switch from the Pro chest
   on would leave its chest LOCKED and do nothing. The row it writes is the shape run/gauntlet.js writes, scored 0 and
   marked `dev` so it can never be mistaken for a played run on the Gauntlet's own board; a reset takes it out again. */
const devGauntDone = gid => { if (!gid || gauntDone(gid)) return;
  store.gaunt = [{ id: gid, t: Date.now(), score: 0, tier: 'clear', web: [], dev: 1 }].concat(Array.isArray(store.gaunt) ? store.gaunt : []); };
const devNeed = (c, modes) => { if (c.needs === 'modes') { if (!modesOpen() && modes) modes(true); } else devClearTo(c.needs);
  devGauntDone(c.gaunt); };
function devReach(id, modes) { const i = chestIx(id); if (i < 0) return null;
  for (let j = 0; j < i; j++) { const c = CHESTS[j]; if (chestOpen(c.id)) continue; devNeed(c, modes); if (chestState(c.id) !== 'ready' || !devOpen(c.id)) return chestState(id); }
  if (!chestOpen(id)) devNeed(CHESTS[i], modes);
  save(); return chestState(id); }
/* one tier backed out entirely: its bars, its whole-key moment and first-open reveal, its retroactive marks and its key achievements (the 23
   roster rows that kept an older id included, v24 D.2). `retroCol` is left alone on purpose — it records the column last credited, and clearing
   it would have the next boot credit the bars straight back from saved bests. */
function devTierOut(tier) { for (const cb of COMBOS) delete store.bars[skey(cb.key, tier)];
  if (prefs.keyWhole) delete prefs.keyWhole[tier];
  if (prefs.revealed) { const r = Object.assign({}, prefs.revealed); delete r['key:' + tier]; prefs.revealed = r; }
  if (prefs.retro) for (const k of Object.keys(prefs.retro)) if (retroTier(k) === tier) delete prefs.retro[k];
  if (prefs.devKeys) delete prefs.devKeys[tier];
  for (const id of Object.keys(store.ach)) if (id.startsWith(`key_${tier}_`)) delete store.ach[id];
  for (const a of keyAch()) if (a.kt === tier) delete store.ach[a.id]; }
/* build 41 (L.9c / L.11b): a reset chest gets its first ready sound and its spill back, so both can be reviewed again.
   v25 (items 6 / 11 / 22, build 46): AND ITS REVEAL. Aiden's line: "the one exception is resetting the chest from Testing, which on this
   phone counts as a first time again." So a reset clears both flags in `prefs.revealed` — the chest's own opening, and the reveal of the
   key that chest is the reward for finishing, which is the key whose `needs` names it. */
const unseen = id => { prefs.readySeen = Object.assign({}, prefs.readySeen, { [id]: 0 }); prefs.spill = Object.assign({}, prefs.spill, { [id]: 0 });
  const r = Object.assign({}, prefs.revealed); delete r['chest:' + id];
  const c = chestOf(id); if (c && c.needs !== 'modes') delete r['key:' + c.needs];
  prefs.revealed = r; };
function devBack(id, modes) { const i = chestIx(id); if (i < 0) return;
  for (let j = CHESTS.length - 1; j >= i; j--) { const c = CHESTS[j];
    if (c.opens) devTierOut(c.opens);
    // 58.2: the row a switch wrote goes with the chest it was written for; a run Aiden actually played is left alone
    if (c.gaunt && Array.isArray(store.gaunt)) store.gaunt = store.gaunt.filter(r => !(r && r.dev && r.id === c.gaunt));
    prefs.chests = Object.assign({}, prefs.chests, { [c.id]: 0 }); unseen(c.id); }
  const c = CHESTS[i];
  if (c.needs !== 'modes') devTierOut(c.needs);
  /* v24 (A.1, build 43): Keys and Customise wait for the Games chest, so backing it out gives both rows their green back (v26 item 3: the
     menu's own record of having opened them goes with it) — and every mode goes, which is the chain's to take out */
  else { prefs.cusSeen = 0; prefs.keysSeen = 0; if (prefs.menuOpened) { delete prefs.menuOpened['s-key']; delete prefs.menuOpened['s-custom']; } if (modes) modes(false); }
  seenDown(); save(); }
const devChestReset = (id, modes) => devBack(id, modes);
/* "set meter to N%": every key backed out, then play forward to N — the Games chest opened (every mode first), key 1's bars, the Skill chest
   opened once key 1 is whole and there is more of N to go, Pro's bars, and so on. A figure that lands exactly on a whole key leaves that key's
   chest READY, as play does. A bar is 3⅓% of a band, so the meter reads the highest figure at or under N that bars can make; a chest opening
   can also credit bars a saved best already beats (G.4), which can carry it past. What it answers is meter(), which is the truth either way. */
function devMeterTo(n, modes) { const want = Math.max(0, Math.min(meterMax(), Math.round(+n || 0)));
  devBack('key'); if (!want) return meter();
  devReach('games', modes); if (chestState('games') === 'ready') devOpen('games');
  let left = want;
  for (const tier of TIERS) { const total = keyState(tier).total; if (!total || !tierOpen(tier)) break;
    /* v30 (59.11): the walk asks bandWith() what a bar is worth instead of assuming bars/total, because the FIRST band now carries
       the modes as well — by this point devReach('games') has opened every mode, so that part is full and the bars fill the rest. */
    let bars = total; if (left < METER.band) { bars = 0; while (bars < total && Math.floor(METER.band * bandWith(tier, bars + 1) + 1e-9) <= left) bars++; }
    devClearTo(tier, bars);
    if (!keyState(tier).whole) break;
    left -= METER.band; if (left <= 0) break;
    // 58.2: the chest ahead may also want a finished Gauntlet, and the walk has to satisfy it the way play would
    const c = CHESTS.find(x => x.needs === tier); if (!c) break; devGauntDone(c.gaunt);
    if (chestState(c.id) !== 'ready' || !devOpen(c.id)) break; }
  seenDown(); save(); return meter(); }

export { COMBOS, RADAR_PAST, TIERS, tierEarned, chestNeeds, crackCount, gauntBest, gauntDone, msgDot, msgOpen, msgShown, msgTitle, bandPct, barFor, barOf, barsFaked, barsMissing, barsOrphan, checkKey, checkKeyAch, chestAt, chestOpen, chestState, cleared, combos, credit, devBack, devChestReset, devClearTo, devMeterTo, devOpen, devReach, fillBars, gameKey, isCleared, isPlaceholder, isShell, keyAch, keyChest, keyFinished, keyGaunt, keyGoal, keyOf, keyPct, keyState, keyTier, keyTiers, meter, meterBand, meterMax, meterPct, modesOpen, openChest, placeholderCount, radarOf, radarRungs, readyChest, retroArrived, retroBank, retroTier, skey, tierFull, tierOpen };
