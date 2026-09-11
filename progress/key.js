/* No Excuses — the key (build 22, v14 §9.2–9.7). The SECOND progression system, and it shares nothing with the first
   but a screen. The unlock chain in config/unlocks.js is sequential and gates which GAMES are playable; the key is
   concurrent, gates nothing, and every game feeds it independently from the moment it is unlocked (9.2).

   A clearance bar is a ONE-OFF threshold, not a score to hold: beat it once in a solo run and that combination is
   cleared for good (9.3). Re-clearing does nothing and plays nothing. Pass & play and versus never contribute (9.4,
   consistent with L10), and neither does a practice run, a challenge-link run, or a run that ended with nothing on it.

   COMBINATIONS ARE BUILT FROM THE CONFIG, NEVER LISTED HERE (C.5). combos() walks GAMES × modes × GC(g,d).lens, which
   is the same walk authorAch() makes — a game with a SET_COPY row contributes Set and Streak per mode, a timed game
   contributes its lens, Sequence contributes its key counts. 6 + 6 + 4 + 2 + 4 + 4 + 4 today, and a new mode in
   config/games.js joins the key on its own with no edit here. The NUMBERS come from config/key-bars.js, keyed the same
   way; barsMissing() is what a combination with no row looks like, and the config wins — it is reported, never dropped.
   B.9 took Sequence from three key counts to two, which is the whole of how the total moved — nothing here counted it.

   A game's root length on the key screen is the fraction of ITS OWN combinations cleared, so it grows in segments
   (9.6). Nothing in here touches the DOM.

   v17 (§A.6, build 28): PERCENTAGE COMPLETE lives here too, because it is the same walk over the same combinations and
   a second copy of that walk is the one thing this file exists to prevent. It is key 1 only; keys 2 and 3 get their own
   from the same function against their own bars the day #372 is answered, and show nothing before chest 1 (A.1). */
import { KEY_BARS } from "../config/key-bars.js";
import { KEYS } from "../config/keys.js";
import { save, store } from "../core/store.js";
import { GAMES, GC } from "../games/registry.js";
import { Scores } from "../progress.js";

const keyOf = (g, d, s) => `${g}:${d}:${s}`;
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

const cleared = () => store.bars;
const isCleared = key => !!store.bars[key];
// L10 / 9.4: solo only. A practice run, a challenge run, a two-player run and a run that failed with nothing on it never count
// v17 (B.4): a demo run is the fifth. The ghost plays the real engine, so without this a first-play demo could clear a bar
const eligible = (run, two) => !!run && !run.practice && !run.chal && !run.demo && !two && !(run.fail && !run.hits);
// direction is read from the data, never assumed (C.7): 'lower' is a ceiling, 'higher' is a floor
function beats(run, bar) { return bar.dir === 'lower' ? run.hits <= bar.bar : run.hits >= bar.bar; }
function barFor(run) { return KEY_BARS[keyOf(run.g, run.d, run.s)] || null; }
/* the one write. A solo run that beats a bar it had not beaten before clears that combination for good and hands the
   caller what to animate; anything else — including beating a bar already cleared — returns null and plays nothing (9.5) */
function checkKey(run, two) { if (!eligible(run, two)) return null;
  const key = keyOf(run.g, run.d, run.s), bar = KEY_BARS[key];
  if (!bar || isCleared(key) || !beats(run, bar)) return null;
  store.bars[key] = Date.now(); save();
  const p = gameKey(run.g);
  return { key, g: run.g, d: run.d, s: run.s, bar, was: p.done - 1, done: p.done, total: p.total }; }

/* ---------- §A.6: percentage complete, key 1 only ----------
   progress = floor( 100 × Σ credit(c) / N ), c over every combination. A cleared combination is worth 1; one with no solo
   run at all is worth 0 (A.6.2 — a new profile starts at 0, not at whatever a ceiling game gives away for free); anything
   else is its ratio against its own bar, CAPPED AT 0.9 (A.6.1), so an uncleared combination can never read as done and the
   last stretch to 100% is always real clearing. A.6.3: a zero bar or a zero best is credit 0 rather than a divide — the
   ceilings are the ones at risk. A.6.4: it reads BEST scores, which only improve, so it only ever goes up; it is never
   computed from one run. Pass & play and versus never reach store.runs at all (L10 / 9.4), so "solo" needs no filter here. */
const bestOf = c => Scores.best(c.g, c.d, c.s);
function credit(c) { if (isCleared(c.key)) return 1;
  if (!c.bar) return 0;
  const best = bestOf(c); if (best === null) return 0;
  const bar = c.bar.bar; if (!bar || !best) return 0;
  const ratio = c.bar.dir === 'lower' ? bar / best : best / bar;
  return Number.isFinite(ratio) ? Math.max(0, Math.min(0.9, ratio)) : 0; }
// the one number on the front of the app (A.6.5 / A.6.7). `done` and `total` come with it because the display is both
function keyPct() { const st = keyState();
  const sum = COMBOS.reduce((n, c) => n + credit(c), 0);
  return { done: st.done, total: st.total, pct: st.total ? Math.floor(100 * sum / st.total) : 0 }; }

// a game's root: how many of its own combinations are cleared, and the fraction that makes
function gameKey(g) { const list = BY_GAME[g] || []; const done = list.filter(c => isCleared(c.key)).length;
  return { g, done, total: list.length, frac: list.length ? done / list.length : 0, list }; }
// the whole key: every game's root home is the key finished
function keyState() { const games = Object.keys(GAMES).map(gameKey);
  const done = games.reduce((n, x) => n + x.done, 0), total = games.reduce((n, x) => n + x.total, 0);
  return { games, done, total, frac: total ? done / total : 0, whole: total > 0 && done === total }; }

/* the three keys (v15 §5.3 / A.1, build 26). They are difficulty TIERS over the same combinations, not three collections:
   key 1 is the clearance bars this file already keeps, key 2 a pro tier and key 3 the author's times. Tiers 2 and 3 are a
   SHELL — register #372 is undecided and A.2 forbids a build deriving a bar — so they answer with no combinations at all
   rather than a fabricated total. `locked` means "not finished", which is what a key that has not turned yet is. */
function keyTier(i) { const k = KEYS[i]; if (!k) return null;
  if (k.shell) return { i, id: k.id, name: k.name, lede: k.lede, shell: true, done: 0, total: 0, frac: 0, whole: false, locked: true };
  const st = keyState();
  return { i, id: k.id, name: k.name, lede: k.lede, shell: false, done: st.done, total: st.total, frac: st.frac, whole: st.whole, locked: !st.whole }; }
const keyTiers = () => KEYS.map((_, i) => keyTier(i));

export { COMBOS, barFor, barsMissing, barsOrphan, checkKey, cleared, combos, credit, gameKey, isCleared, keyOf, keyPct, keyState, keyTier, keyTiers };
