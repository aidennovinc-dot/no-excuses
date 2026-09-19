/* No Excuses — the one shape dealer (build 50, FEEDBACK-v26 §B2)
   Every game that deals a shape asks this for its round, and this reads config/shapes.js and nothing else. The standard it keeps is
   ARCHITECTURE.md → "Shape difficulty — the standard":
   · a band deals its MIX exactly — the tiers are a deck, shuffled per run, so every run of a Set is dealt the same number of easy,
     medium and hard shapes band by band, and only the order and the particular shapes differ;
   · a shape is not dealt again in a run until every shape of its tier in the pool has been, and never twice running;
   · the SETTING's tier is the band's load minus the shape's tier, kept inside easy..hard — a harder shape, an easier setting.
   A deal is CACHED by its round number, so the two players of a pass & play run asking for their turn N get the same deal. */

import { DEALS, SHAPES, TIER } from "../../config/shapes.js";
import { emit } from "../../core/events.js";

const ORDER = ['easy', 'medium', 'hard'];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// the band round k falls in — past the last band, the last band
const bandAt = (deal, k) => deal.bands.find(b => k <= b.to) || deal.bands[deal.bands.length - 1];
// the band's first round
const bandFrom = (deal, band) => { const i = deal.bands.indexOf(band); return i ? deal.bands[i - 1].to + 1 : 1; };
// what round k may deal from: the game's pool and every band's `add` up to and including k's band
function poolAt(deal, k) { const out = deal.pool.slice();
  for (const b of deal.bands) { (b.add || []).forEach(s => { if (!out.includes(s)) out.push(s); }); if (k <= b.to) break; }
  return out; }
// the setting's tier for a shape of `tier` in `band`
const setTier = (band, tier) => ORDER[Math.max(1, Math.min(3, band.load - TIER[tier])) - 1];
// a number inside a tier's [from, to], `u` of the way along
const within = (range, u) => range[0] + u * (range[1] - range[0]);

function makeDealer(key) {
  const deal = DEALS[key]; const cache = new Map(); let deck = [], deckBand = null, prev = ''; const used = new Set();
  return { key, deal,
    at(k) { if (cache.has(k)) return cache.get(k);
      const band = bandAt(deal, k);
      if (band !== deckBand || !deck.length) { deckBand = band; deck = shuffle(Object.entries(band.mix).flatMap(([t, n]) => Array(n).fill(t))); }
      const pool = poolAt(deal, k), fresh = t => pool.some(s => SHAPES[s].tier === t && s !== prev);
      // a tier whose only shape is the one just dealt (Go / No-go's and Find's hard tier is the spiral alone) swaps places with a later card in the deck
      if (!fresh(deck[0])) { const i = deck.findIndex(fresh); if (i > 0) [deck[0], deck[i]] = [deck[i], deck[0]]; }
      const tier = deck.shift(), of = pool.filter(s => SHAPES[s].tier === tier);
      let can = of.filter(s => !used.has(s) && s !== prev);
      if (!can.length) { of.forEach(s => used.delete(s)); can = of.filter(s => s !== prev); }
      if (!can.length) can = of.length ? of : pool;
      const shape = can[Math.random() * can.length | 0]; used.add(shape); prev = shape;
      const spec = { k, band, from: bandFrom(deal, band), tier, set: setTier(band, tier), shape, pool, u: Math.random() };
      cache.set(k, spec); return spec; } };
}

/* ---------- v29 Section A (58.1, build 58): A GAUNTLET DEALS EVENLY ----------
   Two calls, and an engine makes both or neither. `gauntBand(ctx, q)` hands back the `[lo, hi]` for this step's quantity
   — config/gauntlets.js GAUNTLET_BANDS, put together per Gauntlet by run/gauntlet.js and carried on `ctx.gaunt.band` —
   or null when this is not a Gauntlet step, which is every ordinary Set and Streak and is the untouched path.
   `gauntDealt` then announces what was ACTUALLY dealt, after any snapping or rounding the engine does, so the gate can
   assert the number the player met rather than the number that was drawn before the engine finished with it. It is a
   plain event (A3 lets _shared reach core/), so nothing in games/ has to know a Gauntlet exists beyond its own quantity. */
const gauntBand = (ctx, q) => { const b = ctx && ctx.gaunt && ctx.gaunt.band && ctx.gaunt.band[q];
  return Array.isArray(b) && b.length === 2 ? b : null; };
// `u` of the way along the band, or a fresh draw when none is handed in — the one place a band is turned into a number
const bandPick = (band, u) => band[0] + (u === undefined ? Math.random() : u) * (band[1] - band[0]);
function gauntDealt(ctx, q, v) { const g = ctx && ctx.gaunt; if (!g || !g.band || !g.band[q]) return v;
  emit('gaunt:deal', { id: g.id, step: g.g + ':' + g.d, q, v, band: g.band[q] }); return v; }

export { ORDER, bandAt, bandFrom, bandPick, gauntBand, gauntDealt, makeDealer, poolAt, setTier, within };
