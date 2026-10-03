/* No Excuses — THE NEXT-UNLOCK CARD (build 68, 67.40 — Cowork's design, agreed with Aiden in the v0.67 session).

   One pick, for the menu's card AND the goal a run shows, so the two can never disagree. It walks the game in the order a player meets it:
     1. until all thirteen modes are open, the next MODE on the chain (config/unlocks.js UNLOCKS, in its order), with Aiden's opening sequence in
        front of it — "Dash → Four → Dots" (NEXT_CARD_ORDER.lead). A length is shown only where it is needed to make that mode reachable: a row
        whose own run needs a length still shut offers that length first (the same honesty canEarn() keeps in progress.js);
     2. every mode open: "Open the Games chest";
     3. a key being chased: the bar the player is CLOSEST to clearing (best ÷ target, on lengths that are open), with "x of 30" — or, where no open
        length has a bar left, the length unlock that opens one; the key whole, its chest (or the Gauntlet that chest still wants);
     4. Pro and Author the same, each only once the chest before it is open.
   Gone for good once the Author chest is open. The five rows that ask the player to fail on purpose come up in their turn, like any other.
   Two unlocks one run opens (Flash → Go / No-go and Spot · Count, v15 1.4d's rule unchanged) are ONE card (NEXT_CARD_ORDER.pair).
   Presentation only (L10): nothing here banks, tests or opens anything. */
import { CHESTS } from "../config/chests.js";
import { GAUNTLET, GRID, NEXT_CARD } from "../config/copy.js";
import { MODE_NAME } from "../config/games.js";
import { KEYS } from "../config/keys.js";
// UNLOCKS from progress.js, not config: a goal this hands run.js needs the `test` progress.js joins on (build 68 fix)
import { NEXT_CARD_ORDER } from "../config/unlocks.js";
import { T } from "../core.js";
import { prefs } from "../core/store.js";
import { GAMES, GC, lenName } from "../games/registry.js";
import { Scores, UNLOCKS, isOpen, lenGoal, lenLock, lenOpen, unlockName, unlocked } from "../progress.js";
import { COMBOS, barOf, chestOpen, gauntDone, isCleared, isShell, keyGoal, keyState, modesOpen, tierOpen, wantOf } from "./key.js";
import { LEN_BEST, UNLOCK_BEST } from "./rules.js";
import { scoreTxt } from "../ui/format.js";

const modeKey = k => String(k).split(':').length === 2 && k !== 'sequence:practice';
const comboName = (g, d, s) => [GAMES[g].name, MODE_NAME[d], lenName(g, s, d)].filter(Boolean).join(' · ');
const num = (v, B) => { if (v === null || v === undefined || !Number.isFinite(v)) return null; const n = B.dp ? v.toFixed(B.dp) : String(Math.round(v)); return n + (B.unit || ''); };
// how far the best run is along a requirement, 0..1 — `lower` is a ceiling (the best is the smallest), `at` the line
const along = (best, B) => best === null ? 0 : B.lower ? Math.min(1, B.at / Math.max(best, 1e-9)) : Math.min(1, Math.max(0, best) / B.at);
function bestOf(B, runs) { const v = runs.filter(B.of || (() => true)).map(B.v).filter(x => x !== null && x !== undefined && Number.isFinite(x));
  return v.length ? (B.lower ? Math.min(...v) : Math.max(...v)) : null; }
const solo = () => Scores.runs().filter(r => !r.practice && !r.chal && !r.demo && !r.vs2);

// a mode on the chain: its row, the best toward it, and — for a pair — both names
function rowCard(x) { const u = unlocked(), pair = (NEXT_CARD_ORDER.pair || {})[x.key], both = pair && !u[pair];
  const B = UNLOCK_BEST[x.key], best = B ? bestOf(B, solo()) : null;
  return { kind: 'unlock', key: x.key, also: both ? pair : null, name: both ? T(NEXT_CARD.both, { a: unlockName(x.key), b: unlockName(pair) }) : unlockName(x.key),
    need: x.need, best: B ? num(best, B) : null, frac: B ? along(best, B) : null, where: x.where, aim: x.key }; }
// a length rung: the runs of the length before it are the ones that count
function lenCard(g, d, s, L, extra = {}) { const lens = GC(g, d).lens, i = lens.indexOf(s), B = (LEN_BEST[g + ':' + d] || [])[i] || null;
  const best = B ? bestOf(B, solo().filter(r => r.g === g && r.d === d && r.s === L.s)) : null;
  return Object.assign({ kind: 'len', key: `${g}:${d}:${s}`, name: comboName(g, d, s), need: L.need, best: B ? num(best, B) : null, frac: B ? along(best, B) : null,
    where: { g, d, s: L.s }, len: { g, d, s } }, extra); }
const chestCard = id => ({ kind: 'chest', key: 'chest:' + id, name: T(NEXT_CARD.chest, { chest: GRID.chest[id] }), need: id === 'games' ? NEXT_CARD.allModes : NEXT_CARD.whole, go: 'map' });
/* the bar of tier `t` the player is CLOSEST to clearing — best ÷ target, on lengths that are open, the first of equals. The card's own test, and
   (build 69, 68.40) the one Progress's NEXT marker uses on a chest tab, so the two can never point at different bars */
function closest(t) { let top = null;
  for (const c of COMBOS) { const bar = barOf(c, t); if (bar === null || isCleared(c.key, t) || !isOpen(c.g, c.d) || !lenOpen(c.g, c.d, c.s)) continue;
    const b = Scores.best(c.g, c.d, c.s), f = b === null ? 0 : along(b, { at: bar, lower: c.bar.dir === 'lower' });
    if (!top || f > top.f) top = { c, b, f }; }
  return top; }

function nextPick() { if (prefs.allOpen || chestOpen('thorns')) return null;
  const u = unlocked();
  // 1. the modes, Aiden's opening first
  if (!modesOpen()) {
    for (const k of NEXT_CARD_ORDER.lead || []) { const [g, d, s] = k.split(':'); if (!isOpen(g, d)) continue; const L = lenLock(g, d, +s); if (L) return lenCard(g, d, +s, L); }
    const x = UNLOCKS.find(r => modeKey(r.key) && !u[r.key]);
    if (x) { const w = x.where, d = w.d || GAMES[w.g].modes[0];
      if (w.s !== undefined && isOpen(w.g, d)) { const L = lenLock(w.g, d, w.s); if (L) return lenCard(w.g, d, w.s, L); }
      return rowCard(x); } }
  // 2. the Games chest
  if (!chestOpen('games')) return chestCard('games');
  // 3 / 4. the key being chased: Skill until the Skill chest, then Pro, then Author
  const chase = CHESTS.filter(c => c.needs !== 'modes').find(c => tierOpen(c.needs) && !chestOpen(c.id)); if (!chase) return null;
  const t = chase.needs, st = keyState(t), k = KEYS.find(x => x.id === t) || {}, count = T(NEXT_CARD.count, { key: k.name || t, done: st.done, total: st.total });
  if (isShell(t)) return null;
  if (st.whole) { if (chase.gaunt && !gauntDone(chase.gaunt)) return { kind: 'gaunt', key: 'gaunt:' + chase.gaunt, name: T(NEXT_CARD.gaunt, { name: GAUNTLET.name[chase.gaunt] || chase.gaunt }), need: T(NEXT_CARD.gauntNeed, { chest: GRID.chest[chase.id] }), go: 'map', count };
    return Object.assign(chestCard(chase.id), { count }); }
  const top = closest(t);
  if (top) { const { c, b, f } = top;
    return { kind: 'bar', key: 'bar:' + c.key + ':' + t, kt: t, name: comboName(c.g, c.d, c.s), need: wantOf(c, t), best: b === null ? null : scoreTxt(c.g, b, c.d, c.s), frac: f, where: { g: c.g, d: c.d, s: c.s }, count }; }
  for (const c of COMBOS) { if (barOf(c, t) === null || isCleared(c.key, t) || !isOpen(c.g, c.d)) continue; const L = lenLock(c.g, c.d, c.s); if (L) return lenCard(c.g, c.d, c.s, L, { count }); }
  return null; }

/* THE SAME PICK IS THE RUN'S GOAL (67.40): a run of the game, mode and length the card points at chases what the card says — the chain row, the
   length rung or the key bar — whatever the chain's own order would have offered that run (run/run.js asks this before goalFor and keyGoal) */
function pickGoal(g, d, s) { const p = nextPick(); if (!p || !p.where || p.where.g !== g) return null;
  // a row that names no length is chased on the longest length open in its mode, where Try to unlock lands — goalFor's own rule (D.8)
  if (p.kind === 'unlock') { const w = p.where; if ((w.d && w.d !== d) || (w.s !== undefined && w.s !== s)) return null;
    if (w.s === undefined) { const lens = GC(g, d).lens; let top; for (let j = lens.length - 1; j >= 0; j--) if (lenOpen(g, d, lens[j])) { top = lens[j]; break; } if (s !== top) return null; }
    return UNLOCKS.find(x => x.key === p.key) || null; }
  if (p.kind === 'len') return p.where.d === d && p.where.s === s ? lenGoal(g, d, s) : null;
  if (p.kind === 'bar') return p.where.d === d && p.where.s === s ? keyGoal(g, d, s) : null;
  return null; }

export { closest, nextPick, pickGoal };
