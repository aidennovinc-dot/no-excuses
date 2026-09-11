/* No Excuses — the predicates behind the progress tables (build 16, refactor stage 2).
   config/unlocks.js and config/achievements.js hold the data; this file holds the function for each row under the same
   key or id: UNLOCK_TEST[key], LEN_TEST[game][i], ACH_TEST[id], ACH_PROGRESS[id]. QUALITY[game] is the 0..1 that picks
   a verdict and draws the radar, keyed like ui/format.js ('g', 'g:d', 'g:streak', 'g:d:streak'). progress.js joins them. */
import { STREAK } from "../config/games.js";
import { prefs } from "../core/store.js";
import { GAMES, GC, GV, N_GAMES } from "../games/registry.js";

const rate=r=>r.hits/r.s;
const bestRate=(all,g,s,d)=>Math.max(0,...all.filter(r=>r.g===g&&(!s||r.s===s)&&(!d||r.d===d)).map(rate));
const bestRound=(all,keys)=>Math.max(0,...all.filter(r=>r.g==='sequence'&&(!keys||r.s===keys)).map(r=>r.hits));
const lowTotal=(all,d,s)=>{ const v=all.filter(r=>r.g==='hold'&&(!d||r.d===d)&&(!s||r.s===s)).map(r=>r.hits); return v.length?Math.min(...v):null; };
const lowProg=(v,target)=>v===null?0:Math.min(1,target/Math.max(v,target));
const tourProg=all=>{ const cells=Object.entries(GAMES).flatMap(([g,x])=>x.modes.map(d=>all.some(r=>r.g===g&&r.d===d))); return cells.filter(Boolean).length/cells.length; };
const fullsetProg=(all,g)=>{ const G_=GAMES[g]; const cells=G_.modes.flatMap(d=>GC(g,d).lens.map(s=>all.some(x=>x.g===g&&x.d===d&&x.s===s))); return cells.filter(Boolean).length/cells.length; };

/* ---------- the unlock chain (L6): one predicate per UNLOCKS key. v14 (9.1): Sequence opens at 3.5% of the Cut target, was 0.5%.
   The Set round counts these read (Cut 10, Flash 5, Go / No-go 5) come from SET_COPY in config/games.js since build 19.
   Build 23 (v15 §1.1-§1.4): seventeen values changed and five of these now ask the player to fail on purpose. Do not
   "correct" them back — deliberate failure is the point (v15 §0.5) and §2.1 is what makes them findable ---------- */
/* v17 (B.6 / B.7, L6): "N hits, no misses" means N IN A ROW, and a miss resets the count — Aiden's words, and the only
   reading that is honest MID-RUN. `misses===0 && hits>=N` is a claim about a WHOLE run, so on the live path it went true
   the moment the seventh clean hit landed and the toast said "Unlock: Dash" — then the player missed, the run ended with
   misses, and lenLock re-derived the length as still locked. Told it opened; it had not. `row` is the run's longest clean
   streak and is reported by games/_shared/timed.js; it can only ever grow, which is what a live test has to be.
   A record from BEFORE build 28 carries no `row` at all, so it is judged the old way rather than being quietly un-earned. */
const inRow=n=>r=>r.row===undefined?(r.misses===0&&r.hits>=n):r.row>=n;

const UNLOCK_TEST = {
  // v17 (B.7, L6): any Quick Tap · Two run, Sprint included — `s` came off `where`, so the chain no longer says Dash.
  // Four can now open before Dash does, and Aiden accepted that: Four is the harder mode, not the later one
  'quick-tap:four':    r=>r.g==='quick-tap'&&r.d==='two'&&inRow(15)(r),
  'dots:blind':        r=>r.g==='quick-tap'&&r.hits>=35,
  // v15 (1.2b): five misses in a Blind run, not six clean hits in a Sprint. Any length
  'dots:lead':         r=>r.g==='dots'&&r.d==='blind'&&r.misses>=5,
  // v15 (1.3a): a whole Dots run with nothing pressed at all — no hits AND no misses. Only true once the run has ended
  'hold:grow':         r=>r.g==='dots'&&r.hits===0&&r.misses===0,
  'hold:cut':          r=>r.g==='hold'&&r.d==='grow'&&r.x<=15,
  'sequence:solo':     r=>r.g==='hold'&&r.d==='cut'&&r.x<=3.5,
  'sequence:practice': r=>r.g==='sequence'&&r.s===7&&r.hits>=8,
  /* v16 (2): WAS `r.hits===0`, and it could never be true. Sequence scores `hits` as the longest pattern COMPLETED and
     derives it from `round-1`, and every solo run opens on round 3 — so a run that ends on the very first note scores 2,
     not 0, at 3, 5 and 7 keys alike. Aiden's diagnosis was exactly right: the test was reading the opening note count.
     The engine now says so itself (`firstWrong`), and the row is live:1, so failing the first note banks the unlock the
     moment it happens rather than waiting for a finish the player has no reason to sit through. */
  'timing:stopwatch':  r=>r.g==='sequence'&&r.firstWrong===1,
  'timing:hidden':     r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.3,
  'reaction:flash':    r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===STREAK&&r.hits>=6,
  'reaction:nogo':     r=>r.g==='reaction'&&r.d==='flash'&&r.s===5&&r.hits<=350,
  // v15 (1.4d): a Flash OR a Go / No-go Set averaging under 350ms — built as Aiden wrote it. Both modes run a 5-round Set
  'spot:count':        r=>r.g==='reaction'&&r.s===5&&r.hits<=350,
  'spot:find':         r=>r.g==='spot'&&r.d==='count'&&(r.rounds||0)>=5,
};
/* length locks: the test for LEN_RULES['game:mode'][i], run over the previous length's runs of THAT mode.
   v15 (1.0a): keyed 'game:mode' since build 23, so Dots · Blind and Dots · Lead can ask for different numbers.
   The state was already per mode — lenLock filters runs on r.d — so nothing is stored and nothing migrates (1.0b). */
const LEN_TEST = {
  // v17 (B.6, L6): the four "no misses" rungs are N IN A ROW now — see inRow above. The 24 / 28 rungs are untouched:
  // they never said "no misses" and a total is a fair thing to ask of a whole run
  'quick-tap:two':  [null, inRow(7), r=>r.hits>=24],
  'quick-tap:four': [null, inRow(7), r=>r.hits>=24],
  'dots:blind':     [null, inRow(6), r=>r.hits>=24],
  'dots:lead':      [null, inRow(9), r=>r.hits>=28],
  // v17 (B.9, L6): one rung, not two — 5 keys is gone and 7 opens on eight notes in 3 keys
  'sequence:solo':  [null, r=>r.s===3&&r.hits>=8],
  // v15 (1.3b / 1.4b): the two Streaks with a real requirement. `y` is a Set's worst single round, `hits` its average
  // v17 (B.8, L6): 80 → 10. The measured ceiling on a Cut round is 44.5% off and the floor across the share pool is 25%,
  // so 80 could never fire on any shape at any target. Numbers and the derivation are in config/unlocks.js and FEATURES.md
  'hold:cut':       [null, r=>r.y>10],
  'reaction:flash': [null, r=>r.hits>500],
};

/* ---------- achievements: test(run, allRuns) per id; progress(allRuns, game) 0..1 for the bar where one exists ---------- */
const ACH_TEST = {
  first:()=>true, named:()=>!!prefs.name, every:(r,all)=>Object.keys(GAMES).every(g=>all.some(x=>x.g===g)), fullset:(r,all)=>fullsetProg(all,r.g)===1, tour:(r,all)=>tourProg(all)===1, egg:()=>false,
  qt_clean5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&r.misses===0&&r.hits>=7,
  qt_bclean5:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&r.misses===0&&r.hits>=8,
  qt_r4:r=>r.g==='quick-tap'&&r.d==='four'&&rate(r)>=3,
  qt_clean15:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&r.misses===0&&r.hits>=24,
  qt_clean30:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&r.misses===0&&r.hits>=50,
  qt_r5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=4,
  qt_br4:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===15&&rate(r)>=4,
  qt_eyes:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===30&&r.misses===0&&r.hits>=60,
  qt_sab:r=>r.g==='quick-tap'&&r.d==='two'&&r.hits===0&&r.misses>=5,
  qt_s5:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===5&&rate(r)>=5,
  qt_s15:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===15&&rate(r)>=5,
  qt_s30:r=>r.g==='quick-tap'&&r.d==='four'&&r.s===30&&rate(r)>=5,
  qt_bs5:r=>r.g==='quick-tap'&&r.d==='two'&&r.s===5&&rate(r)>=5,
  dt_pin:r=>r.g==='dots'&&r.d==='lead'&&r.s===5&&r.misses===0&&r.hits>=8,
  dt_bpin:r=>r.g==='dots'&&r.d==='blind'&&r.s===5&&r.misses===0&&r.hits>=6,
  dt_sweep:r=>r.g==='dots'&&r.d==='lead'&&r.s===15&&rate(r)>=3,
  dt_land:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&r.misses===0&&r.hits>=45,
  dt_blind:r=>r.g==='dots'&&r.d==='blind'&&r.s===15&&rate(r)>=3,
  dt_s:r=>r.g==='dots'&&r.d==='lead'&&r.s===30&&rate(r)>=4.5,
  dt_bs:r=>r.g==='dots'&&r.d==='blind'&&r.s===30&&rate(r)>=3.5,
  hd_money:r=>r.g==='hold'&&r.x<=2,
  hd_steady:r=>r.g==='hold'&&r.d==='grow'&&r.s===7&&r.hits<=3,
  hd_est:r=>r.g==='hold'&&r.d==='cut'&&r.s===10&&r.hits<=4,
  hd_run:r=>r.g==='hold'&&r.s===STREAK&&r.hits>=15,
  hd_s:r=>r.g==='hold'&&r.s===7&&r.y<=4,
  /* v15 (1.5): let the shape run all the way to its limit. The engine caps a Grow hold at min(target × 2.8, 96vmin)
     (games/estimate/index.js `down`), so the biggest area a maxed hold can reach is 7.84× the target on a small target
     and about 2.74× on the largest one — 684% and 174% off. `y` is the run's WORST single round, so 600 sits above
     anything a player reaches by merely overshooting and below the ceiling of every round with a target under ~34vmin.
     No engine change: this reads a field the record already carries (build 24 owns the engines, not this build). */
  /* v15 (build 24, Aiden's answer 2): Greedy asks for a hold that ran ALL THE WAY to its limit, and `mx` is the engine
     saying exactly that. The build-23 test was `r.y >= 600` — a % threshold derived from the cap arithmetic, not from
     play — and it is only reachable while the target is under 36.3vmin, because the cap is min(target × 2.8, 96vmin)
     and above that the vmin clamp bites first. On the largest target the most a maxed hold can reach is 174% off, so
     600 was unreachable on roughly half of all rounds and on several shapes never. `mx` is true at every target size,
     on every screen, and is what the row's own words already promised. Numbers in FEATURES.md. */
  hd_max:r=>r.g==='hold'&&r.d==='grow'&&r.mx===1,
  // v17 (B.9): sq_5x10 is "Ten on three" now — five keys is gone and the row was otherwise unearnable
  sq_7:r=>r.g==='sequence'&&r.hits>=7, sq_12:r=>r.g==='sequence'&&r.hits>=12, sq_7x8:r=>r.g==='sequence'&&r.s===7&&r.hits>=8, sq_5x10:r=>r.g==='sequence'&&r.s===3&&r.hits>=10,
  sq_s20:r=>r.g==='sequence'&&r.hits>=20, sq_s15:r=>r.g==='sequence'&&r.s===7&&r.hits>=15,
  tm_close:r=>r.g==='timing'&&r.d==='stopwatch'&&r.x<=.1, tm_wall:r=>r.g==='timing'&&r.d==='hidden'&&r.s===10&&r.hits<=300,
  tm_run:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===STREAK&&r.hits>=10, tm_s:r=>r.g==='timing'&&r.d==='stopwatch'&&r.s===5&&r.hits<=.12,
  // v17 (B.12): `ov` is the engine saying an attempt ran the whole CFG.swOver seconds out. Any length, Set or Streak
  tm_s10:r=>r.g==='timing'&&r.d==='stopwatch'&&r.ov===1,
  rx_200:r=>r.g==='reaction'&&r.d==='flash'&&r.x<200, rx_clean:r=>r.g==='reaction'&&r.d==='nogo'&&r.s===5&&r.misses===0,
  rx_run:r=>r.g==='reaction'&&r.d==='flash'&&r.s===STREAK&&r.hits>=8, rx_s:r=>r.g==='reaction'&&r.d==='flash'&&r.s===5&&r.hits<180,
  sp_5:r=>r.g==='spot'&&r.d==='count'&&r.s===STREAK&&r.hits>=8, sp_15:r=>r.g==='spot'&&r.d==='count'&&r.s===10&&r.hits<=2,
  sp_fast:r=>r.g==='spot'&&r.d==='find'&&r.s===10&&r.hits<20, sp_clean:r=>r.g==='spot'&&r.d==='find'&&r.s===10&&r.misses===0,
};
/* v14 (8.1): what is still MISSING, for the rows whose requirement is a set of things rather than one number. The bar says
   how far; this says which. Keyed by id like everything else, so a row without an entry simply shows no list. */
const ACH_LEFT = {
  every:all=>Object.entries(GAMES).filter(([g])=>!all.some(x=>x.g===g)).map(([,x])=>x.name),
};
const ACH_PROGRESS = {
  every:all=>Object.keys(GAMES).filter(g=>all.some(x=>x.g===g)).length/N_GAMES, fullset:(all,g)=>fullsetProg(all,g), tour:all=>tourProg(all),
  qt_r4:all=>bestRate(all,'quick-tap',0,'four')/3, qt_r5:all=>bestRate(all,'quick-tap',15,'four')/4, qt_br4:all=>bestRate(all,'quick-tap',15,'two')/4,
  qt_s5:all=>bestRate(all,'quick-tap',5,'four')/5, qt_s15:all=>bestRate(all,'quick-tap',15,'four')/5, qt_s30:all=>bestRate(all,'quick-tap',30,'four')/5, qt_bs5:all=>bestRate(all,'quick-tap',5,'two')/5,
  dt_sweep:all=>bestRate(all,'dots',15,'lead')/3, dt_blind:all=>bestRate(all,'dots',15,'blind')/3, dt_s:all=>bestRate(all,'dots',30,'lead')/4.5, dt_bs:all=>bestRate(all,'dots',30,'blind')/3.5,
  hd_steady:all=>lowProg(lowTotal(all,'grow',7),3), hd_est:all=>lowProg(lowTotal(all,'cut',10),4), hd_run:all=>Math.max(0,...all.filter(r=>r.g==='hold'&&r.s===STREAK).map(r=>r.hits))/15,
  sq_7:all=>bestRound(all)/7, sq_12:all=>bestRound(all)/12, sq_7x8:all=>bestRound(all,7)/8, sq_5x10:all=>bestRound(all,3)/10, sq_s20:all=>bestRound(all)/20, sq_s15:all=>bestRound(all,7)/15,
  sp_5:all=>Math.max(0,...all.filter(r=>r.g==='spot'&&r.d==='count'&&r.s===STREAK).map(r=>r.hits))/8,
};

/* ---------- quality 0..1 per game, mode and length: picks the verdict tier and draws the radar. Every lower-is-better one runs 1 − score/limit ---------- */
const QUALITY = {
  'quick-tap':r=>r.hits/r.s/(r.d==='four'?5:6), 'dots':r=>r.hits/r.s/4.5, 'hold':r=>1-Math.min(1,r.hits/12), 'sequence':r=>r.hits/16,
  'timing':r=>1-Math.min(1,r.hits/1), 'timing:hidden':r=>1-Math.min(1,r.hits/800),
  'reaction':r=>1-Math.min(1,Math.max(0,r.hits-150)/350), 'reaction:nogo':r=>1-Math.min(1,Math.max(0,r.hits-250)/500),
  'spot':r=>1-Math.min(1,r.hits/12), 'spot:find':r=>1-Math.min(1,Math.max(0,r.hits-8)/22),
  'streak':r=>Math.min(1,r.hits/12), 'reaction:nogo:streak':r=>Math.min(1,r.hits/40),
};
const quality=(g,d,s,r)=>GV(QUALITY,g,d,s,()=>0)(r);

export { ACH_LEFT, ACH_PROGRESS, ACH_TEST, LEN_TEST, QUALITY, UNLOCK_TEST, bestRate, bestRound, fullsetProg, lowProg, lowTotal, quality, rate, tourProg };
