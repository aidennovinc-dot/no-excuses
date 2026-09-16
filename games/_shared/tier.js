/* No Excuses — the tier colour on one round's figure (build 31, v18 §B.10).
   The engines are the only callers. It reads `ROUND_AT` and `VERDICT_TIERS` out of config/verdicts.js and nothing else,
   which is what keeps it legal for an engine to import (A3) — the run's own verdict still comes from progress.js, and
   the colours are the SAME four, so a round and the result it feeds can never disagree about what blue means.

   Every round-based game scores downward, so `at` is read as a ceiling: at or under at[0] is ace, at[1] good, at[2]
   alright, above it bad. The caller decides whether the colour is allowed at all — it is solo only (L4), because light
   blue is Player 2 and red is Player 1. */
import { ROUND_AT, VERDICT_TIERS } from "../../config/verdicts.js";

// the tier id for one round's figure, or '' where that combination has no row
function roundId(key, v) { const at = ROUND_AT[key]; if (!at || !Number.isFinite(v)) return '';
  const t = VERDICT_TIERS.find(x => x.of === null || v <= at[x.of]); return t ? t.id : ''; }
// the colour for it, ready to drop into a style attribute; '' where there is nothing to say
function roundTier(key, v) { const id = roundId(key, v); if (!id) return '';
  return (VERDICT_TIERS.find(t => t.id === id) || {}).col || ''; }
/* v25 (items 17 / 18, build 45): A ROUND THAT SHOWS A TIER NAMES IT AND SOUNDS IT — ONE CALL, SO THE THREE CAN NEVER DISAGREE. Build 29 gave the
   result screen its tier's sound and build 31 put the tier's colour on each round's figure, but nothing played on a round, and Flash's card
   still said "good" from its own 200 / 300ms steps: 234ms read GOOD in grey beside a green Great! figure. Every engine now asks this for the
   colour, the name (VERDICT_TIERS — Aiden's Amazing! / Great! / Good. / Meh.) and the sound in one go: `audio.roundVerdict(id)`, the shorter,
   quieter ROUND_VERDICT variant of VERDICT_FX. `on` is the caller's solo test (L4): off, nothing is shown and nothing plays. */
function roundShow(audio, key, v, on = true) { if (!on) return null; const id = roundId(key, v); if (!id) return null;
  const t = VERDICT_TIERS.find(x => x.id === id); if (audio && audio.roundVerdict) audio.roundVerdict(id);
  return { id, name: t.name, col: t.col }; }
// the tier's name as it sits on a round's card — in its colour and in Aiden's own spelling, never upper-cased by the card around it
const tierWord = t => t ? `<span class="tiername" style="color:${t.col}">${t.name}</span>` : '';

export { roundId, roundShow, roundTier, tierWord };
