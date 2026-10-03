/* No Excuses — the computer opponent (build 69, 68.28 Gauntlet · Versus, test-only).

   Aiden: "simulated like a set number of hits per second". The computer is ONE fixed number per game — what it plays at, derived from that
   game's Skill bar (config/key-bars.js, read here at run time) by the row in config/gauntlets.js VERSUS_AI — with a little human wobble on
   every action and the odd miss. That number never moves during a duel: nothing in this file, and nothing an engine hands it, is the
   player's score, so the computer cannot rubber-band. Its randomness comes from a seeded sequence of its own (run/gauntlet.js gives each duel
   a seed), so the same seed plays the same computer whatever the player does — which is how the gate proves it.

   It is only ever made inside a Gauntlet · Versus duel: `ctx.gaunt.bot` is set by run/gauntlet.js and by nothing else, so every engine's
   `makeBot(ctx)` is null in every other run. Engines import it (A3: games/_shared/), never the other way round. */
import { GAUNTLET, PLAYER } from "../../config/copy.js";
import { VERSUS_AI } from "../../config/gauntlets.js";
import { KEY_BARS } from "../../config/key-bars.js";
import { T } from "../../core.js";
import { emit } from "../../core/events.js";

/* WHAT THE COMPUTER PLAYS AT TODAY, off the Skill bar. `bars` defaults to the live KEY_BARS, so a bar that changes moves the computer with it;
   `over` is the test hook's level (run/gauntlet.js, dev only). Answers null for a duel with no row or a row whose bar is missing. */
function versusPlays(key, bars = KEY_BARS, over = {}) {
  const row = VERSUS_AI[key]; if (!row) return null;
  const b = bars[row.bar], bar = b && typeof b.bar === 'number' && Number.isFinite(b.bar) ? b.bar : null; if (bar === null) return null;
  const len = +String(row.bar).split(':')[2] || 1, level = over && over.level > 0 ? over.level : row.level;
  const per = row.kind === 'mean' ? bar : bar / len;
  const at = row.kind === 'rate' ? per * level : per / level;
  return { key, bar, len, per, level, at, shown: T(row.say, { v: at.toFixed(row.dp || 0) }) };
}

// a seeded sequence (mulberry32): the same seed, the same computer
function seeded(seed) { let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* the opponent for this run, or null. `draw()` is ONE action: the fixed number with its ± wobble, and whether this one is the odd miss.
   `sign()` is which side of the target a guess lands on. Both come off the seeded sequence and nothing else. Every draw is announced
   (`bot:act`) so the gate can read the computer's whole sequence. */
function makeBot(ctx) {
  const st = ctx && ctx.gaunt && ctx.gaunt.bot; if (!st) return null;
  const key = ctx.game + ':' + ctx.mode, row = VERSUS_AI[key], p = versusPlays(key, KEY_BARS, st); if (!row || !p) return null;
  const rng = seeded(st.seed), wobble = st.wobble >= 0 ? st.wobble : row.wobble, miss = st.miss >= 0 ? st.miss : row.miss;
  return { key, row, at: p.at, level: p.level, wobble, miss, n: 0, name: GAUNTLET.bot,
    draw() { const v = p.at * (1 + (rng() * 2 - 1) * wobble), m = rng() < miss; this.n++; emit('bot:act', { key, n: this.n, v, miss: m }); return { v, miss: m }; },
    sign() { return rng() < 0.5 ? -1 : 1; } };
}

// "Player 2" becomes the computer's name on any line a duel draws — the same words everywhere a two-player screen would name its player
const named = (bot, html) => bot ? String(html).split(T(PLAYER.who, { n: 2 })).join(bot.name) : html;

export { makeBot, named, versusPlays };
