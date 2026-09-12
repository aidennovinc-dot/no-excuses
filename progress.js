/* No Excuses — unlocks, achievements, scores — the rules of progress, as pure functions over the store
   Split out of index.html at build 12. Build 15 (refactor stage 1): no screen code in here. Build 16 (refactor stage 2): the
   tables are data in config/ (unlocks.js, achievements.js, copy.js) and the predicates are in progress/rules.js under the
   same key or id; this file joins the two — UNLOCKS and ACH leave here with their `test` / `progress` attached, so the
   screens and the run read them as they always did. Build 18 (refactor stage 4): reads and writes go to the one-key store's
   live record (core/store.js) — unlocked(), got(), Scores.runs() hand back the record's own maps and array. Nothing here touches the DOM. */

import { AUTHOR_RECORDS, ACH as ACH_ROWS } from "./config/achievements.js";
import { SCALES } from "./config/audio.js";
import { ITEMS } from "./config/theme.js";
import { BG_NAME, ITEM_WORD, PROGRESS, TOAST, UNLOCK_WORD, VERDICT } from "./config/copy.js";
import { VERDICTS, VERDICT_FAIL_TIER, VERDICT_TIERS } from "./config/verdicts.js";
import { MODE_NAME, STREAK } from "./config/games.js";
import { LEN_LIVE, LEN_RULES, UNLOCKS as UNLOCK_ROWS } from "./config/unlocks.js";
import { T } from "./core.js";
import { CHAL } from "./core/platform.js";
import { prefs, save, store, trimRuns } from "./core/store.js";
import { GAMES, GC, N_GAMES, lenName } from "./games/registry.js";
import { ACH_LEFT, ACH_PROGRESS, ACH_TEST, LEN_TEST, UNLOCK_TEST, quality } from "./progress/rules.js";
import { scoreTxt } from "./ui/format.js";
// the lengths on offer. v13 (0.3): pro lengths are gone — every player sees the same length row. Versus still has its own (Reaction best-of)
const lensOf=(g,d,vs)=>{ const c=GC(g,d); if(vs===2&&c.vsLens) return c.vsLens; return c.lens; };
/* ---------- progression (v6): modes open on easy milestones, each in the mode before it. Quick Tap Blind is open from the start ---------- */
// live (v10): a threshold unlock fires the moment the run reaches it — a green toast mid-run — not at the end. Averages and "finish a run" still wait for the end
// v13 section 4 (L6): config/unlocks.js (UNLOCKS + LEN_RULES) is the one record of the chain. Lock boxes, goal lines and the Next-achievement card all read from here
const UNLOCKS = UNLOCK_ROWS.map(u=>Object.assign({},u,{test:UNLOCK_TEST[u.key]}));

const unlocked=()=>store.unlock;
/* ---------- new things (v13, 2.1 / L8): anything newly unlocked swells and tints green the first time it is on screen, then is marked seen.
   The store survives a reload and is cleared by Fresh game. Everything open on a brand-new profile is seeded as already seen, so nothing flashes on day one ---------- */
const seenAll=()=>store.seen;   // null until seeded (build 18: the store shape-checks it — anything but a map is null)
function markSeen(keys){ const st=store.seen||{}; let ch=false; for(const k of keys) if(!st[k]){ st[k]=1; ch=true; } if(ch){ store.seen=st; save(); } }
const isNew=k=>{ const st=seenAll(); return !!st&&!st[k]; };
// the class to put on a freshly-unlocked element, and the key to mark once it has been rendered
function newMark(key,bag){ if(!isNew(key)) return ''; if(bag) bag.push(key); return ' newthing'; }
function openKeys(){ const k=[]; for(const g in GAMES){ if(gameOpen(g)) k.push('game:'+g); for(const d of GAMES[g].modes){ if(!isOpen(g,d)) continue; k.push('mode:'+g+':'+d); for(const sc of GC(g,d).lens) if(lenOpen(g,d,sc)) k.push('len:'+g+':'+d+':'+sc); } }
  if(practiceOpen()) k.push('len:sequence:solo:practice'); const a=got(); for(const id in a) k.push('ach:'+id);
  /* v17 (B.10): THE COSMETICS. This walk never included them, so on a brand-new profile the first open of Customise lit
     every item that was open from the start in L8's "just unlocked" green — six of them, for something nothing had earned.
     An item WITH a `by` is deliberately not seeded: that one really is new the day its achievement lands. Measured on a
     fresh profile 2026-09-11: sq 1, lead 1, bg 1, snd 2, cut 1 green, all of them items with no requirement at all. */
  for(const set in ITEMS) for(const it of ITEMS[set]) if(!it.by) k.push('cos:'+set+':'+it.v);
  for(const v in SCALES) k.push('cos:scale:'+v);
  return k; }
function seedSeen(){ const st={}; for(const k of openKeys()) st[k]=1; store.seen=st; save(); }
/* progressive lengths (v13): LEN_RULES holds the requirement per game, MODE and index; everything else opens on one finished
   run of the length before it. The first length is always open.
   v15 (1.0a / L6): the table is keyed 'game:mode' since build 23 — Dots · Blind Dash asks 6 and Dots · Lead Dash asks 9, which
   one array per game could not say. (1.0b): the STATE was already per mode — the filter below has always matched r.d — so
   nothing about a length unlock is persisted, it is derived from run history, and there is nothing to migrate. */
/* v18 (B.8): a length that has been ANNOUNCED is banked in the store under its own three-part key, and this is where the
   store is read back. Length state is otherwise derived from run history, which is why the second half of B.8 happened:
   the toast said "Unlock: Streak", the player quit, `abort()` never submits a record, and the derivation had nothing to
   read — so the announcement and the store disagreed for every length in the game, not only Flash's. An earn is written
   the moment it fires (site/CLAUDE.md), and from build 31 a length earn is written like every other one. */
function lenLock(g,d,s,noChal){ if(prefs.allOpen) return null; if(!noChal&&chalAt(g,d)&&CHAL.s===s) return null; if(unlocked()[g+':'+d+':'+s]) return null; const c=GC(g,d), lens=c.lens, i=lens.indexOf(s); if(i<=0) return null; const prev=lens[i-1], runs=Scores.runs().filter(r=>r.g===g&&r.d===d&&r.s===prev&&!r.practice);
  const test=(LEN_TEST[g+':'+d]||[])[i], rule=(LEN_RULES[g+':'+d]||[])[i];
  if(rule) return runs.some(test)?null:{g,d,s:prev,need:lenNeed(g,d,s),name:lenName(g,s,d)};
  if(s===STREAK) return runs.length?null:{g,d,s:prev,need:lenNeed(g,d,s),name:PROGRESS.streak};
  return runs.length?null:{g,d,s:prev,need:lenNeed(g,d,s),name:lenName(g,s,d)}; }
/* v15 (1.1c / 7.2 / L6): what a length ASKS FOR, whatever this profile has already earned. lenLock answers a different
   question — "is this locked for you" — and returns null the moment you have it, which is why the catalogue printed
   "no requirement" against Quick Tap's lengths and made it look as though Two had lost its rules. One table, one copy,
   one place that builds the sentence: lenLock calls this rather than formatting its own. `{game}` names the game (v14
   3.2), `{mode}` names the mode (v15 1.0a, now that the rule is per mode) and `{prev}` the length before it. */
function lenNeed(g,d,s){ const c=GC(g,d), lens=c.lens, i=lens.indexOf(s); if(i<=0) return ''; const gname=GAMES[g].name;
  const bag={game:gname,mode:MODE_NAME[d]||gname,prev:lenName(g,lens[i-1],d)};
  const rule=(LEN_RULES[g+':'+d]||[])[i];
  return T(rule||(s===STREAK?PROGRESS.finishOne:PROGRESS.finishA),bag); }
const lenOpen=(g,d,s)=>!lenLock(g,d,s);
/* ---------- v17 (B.5, L6): a length unlock ANNOUNCES ----------
   It never did. A length is not in UNLOCKS, so liveCheck's table walk could not see one, and the only way a Dash or a
   Marathon ever raised a toast was by happening to be that run's goal line — which goalFor only offers when no ordinary
   unlock is sitting on the same combination and nothing was pinned instead. So the commonest unlock in the game opened
   in silence, which is what Aiden reported against Quick Tap and Dots.

   `lenNextOf` is the rung above this combination, if it is locked right now. Length state is DERIVED from run history and
   never stored (1.0b), so "it opened" can only honestly mean "locked before this run was recorded, open after" — which is
   what run/run.js asks, either side of Scores.submit. That covers the default "finish one run of the length before" rule
   as well as every LEN_RULES row, which is what B.5 asks for.
   `lenNextLive` is the mid-run half: the same rung, but only where a LEN_TEST exists to judge a partial run by. A default
   rule has no mid-run answer and returns null rather than guessing one. */
function lenNextOf(g,d,s){ if(prefs.allOpen) return null; const c=GC(g,d), lens=c.lens, i=lens.indexOf(s);
  if(i<0||i>=lens.length-1) return null; const nxt=lens[i+1];
  return lenLock(g,d,nxt)?{ key:`${g}:${d}:${nxt}`, g, d, s:nxt }:null; }
/* v18 (B.8, L6): and only where LEN_LIVE says that rung may be judged mid-run. A LEN_TEST alone is not enough — the
   test also has to be one that can only become MORE true as the run goes on, which is the same rule `live:1` states for
   an achievement. Without it a Reaction · Flash Set announced its Streak off one slow attempt. */
function lenNextLive(g,d,s){ const n=lenNextOf(g,d,s); if(!n) return null;
  const i=GC(g,d).lens.indexOf(s); const test=(LEN_TEST[g+':'+d]||[])[i+1];
  if(!test||!((LEN_LIVE[g+':'+d]||[])[i+1])) return null;
  return Object.assign({},n,{test}); }
// the next mode this run could open, if the game, mode and length line up — shown while you play (v8). v11: a length unlock counts too
function goalFor(g,d,s){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]&&x.where.g===g&&(!x.where.d||x.where.d===d)&&(!x.where.s||x.where.s===s)); if(x) return x;
  const c=GC(g,d), i=c.lens.indexOf(s); if(i>=0&&i<c.lens.length-1){ const nxt=c.lens[i+1], L=lenLock(g,d,nxt); if(L){ const test=(LEN_TEST[g+':'+d]||[])[i+1]; return { key:g+':'+d+':'+nxt, need:L.need, where:{g,d,s}, live:1, len:L, test:r=>r.g===g&&r.d===d&&r.s===s&&(test?test(r):true) }; } } return null; }
const chalAt=(g,d)=>!!CHAL&&CHAL.g===g&&CHAL.d===d;
const modeOpen=(g,d,noChal)=>!!prefs.allOpen||(!noChal&&chalAt(g,d))||g==='quick-tap'&&d==='two'||!!unlocked()[g+':'+d]||!UNLOCKS.some(u=>u.key===g+':'+d);
const isOpen=(g,d)=>modeOpen(g,d,false);
// build 14 (S2): a run that only the challenge link let happen — a mode or length still locked on this profile — is tagged chal:1 at finish and never reaches a board or an achievement
const chalRun=(g,d,s)=>chalAt(g,d)&&(!modeOpen(g,d,true)||!!lenLock(g,d,s,true));
// Sequence's practice-from row is earned like a length (7.2 - a guess Aiden corrects next batch)
const practiceOpen=()=>!!prefs.allOpen||!!unlocked()['sequence:practice'];
const gameOpen=g=>GAMES[g].modes.some(d=>isOpen(g,d));
const needFor=(g,d)=>{ const u=UNLOCKS.find(u=>u.key===g+':'+d); return u?u.need:''; };
const unlockName=key=>{ if(key==='sequence:practice') return PROGRESS.practiceFrom; const [g,d,s]=key.split(':'); if(s!==undefined) return lenName(g,+s,d); return GAMES[g].name+(MODE_NAME[d]?' · '+MODE_NAME[d]:''); };
// toast wording (v11): "Unlock game: Dots" for a game, "Unlock: Dash" for a mode or length
function unlockToast(key){ if(key==='sequence:practice') return TOAST.unlockPractice; const [g,d,s]=key.split(':'); if(s!==undefined) return T(TOAST.unlock,{name:lenName(g,+s,d)}); const first=!GAMES[g].modes.some(m=>m!==d&&unlocked()[g+':'+m])&&!(g==='quick-tap'); return first?T(TOAST.unlockGame,{name:GAMES[g].name}):T(TOAST.unlock,{name:MODE_NAME[d]||GAMES[g].name}); }
// v15 (2.5): the guards that used to sit at the call site in ui/screens/result.js live here now, because the call moved
// into run/run.js and has to bank the moment the run record exists — a practice or challenge run still earns nothing
// v17 (B.4): and neither does a DEMO. The first-play ghost drives the real engine on the real ctx, so it reaches both of
// these exactly as a player would; `demo` is the flag that says the hands were not the player's
function checkUnlocks(run){ if(run.chal||run.practice||run.demo) return []; const u=unlocked(); const fresh=[]; for(const x of UNLOCKS){ if(!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); fresh.push(x); } } if(fresh.length) save(); return fresh; }
/* v18 (B.8): the one writer of a length earn. The key is the three-part 'game:mode:length' the toast already names, so
   it can never collide with a mode key ('game:mode') or a seen-marker ('len:game:mode:length'). Called from the mid-run
   announcement and again at the finish, so what was announced is what is stored whether the run ended or was quit. */
function bankLen(key){ const u=unlocked(); if(u[key]) return false; u[key]=Date.now(); save(); return true; }
/* the next thing to chase (v11). v15 (2.2): GAME UNLOCKS OUTRANK ACHIEVEMENTS wherever the "next thing" is surfaced —
   the chain first (a mode, then a length), and only when there is nothing left to unlock does the card fall back to an
   achievement. `ach` on the answer is what tells the caller which of the two it got, so the card can label itself.
   Secret rows are never offered: what earns them is not written down (TIERS), so naming one would give it away. */
function nextGoal(){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]); if(x) return { need:x.need, name:unlockName(x.key), gname:GAMES[x.where.g].name, where:x.where };
  for(const g in GAMES) for(const d of GAMES[g].modes){ if(!isOpen(g,d)) continue; for(const sc of GC(g,d).lens){ const L=lenLock(g,d,sc); if(L) return { need:L.need, name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${L.name}`, gname:GAMES[g].name, where:{g,d,s:L.s} }; } }
  return nextAch(); }
// second in the order, and only ever reached once the chain is finished
function nextAch(){ const done=got(); const a=ACH.find(a=>a.tier!=='secret'&&a.id!=='egg'&&!done[a.id]); if(!a) return null;
  const g=a.g==='all'?prefs.lastGame:a.g; const d=a.at&&a.at.d, s=a.at&&a.at.s;
  if(!isOpen(g,d||GAMES[g].modes[0])) return null;
  return { need:a.how, name:a.name, gname:GAMES[g].name, where:{g,d,s}, ach:a.id }; }
// what a 'Try to unlock' or achievement tap carries into the run it starts (set from menu.js/app.js through the setters below)
let pendingAim='', pendingGoal=null;

/* ---------- score store: the interface a Game Center adapter implements later ---------- */
const Scores = {
  runs(){ return store.runs; },   // the live array — read it, never sort it in place
  of(g,d,s){ const lo=GC(g,d,s).lower; return this.runs().filter(r=>r.g===g&&r.d===d&&r.s===s).sort((a,b)=>lo?(a.hits-b.hits||a.t-b.t):(b.hits-a.hits||a.misses-b.misses||a.t-b.t)); },
  best(g,d,s){ const r=this.of(g,d,s)[0]; return r?r.hits:null; },
  // v18 (B.14): the cap is trimRuns in core/store.js — one trim, used here and at load, and it never cuts a top-10 row
  submit(run){ if(run.chal) return false; const prev=this.best(run.g,run.d,run.s); store.runs.unshift(run); store.runs=trimRuns(store.runs); save(); const lo=GC(run.g,run.d,run.s).lower; return prev===null ? run.hits>0||lo : (lo ? run.hits<prev : run.hits>prev); },
  rank(run){ return this.of(run.g,run.d,run.s).findIndex(r=>r.t===run.t)+1; }
};

/* ---------- achievements: per game, three tiers. progress() gives 0..1 for the bar; at{} is where tapping the row takes you ---------- */
const ACH = ACH_ROWS.map(a=>{ const o=Object.assign({},a,{test:ACH_TEST[a.id]}); if(ACH_PROGRESS[a.id]) o.progress=ACH_PROGRESS[a.id]; if(ACH_LEFT[a.id]) o.left=ACH_LEFT[a.id]; return o; });
// one row per game, mode and length. `rec` is null until Aiden fills it in — a null record can never be beaten, so the row stays locked and shows —
function authorAch(){ const out=[]; for(const g in GAMES) for(const d of GAMES[g].modes) for(const sc of GC(g,d).lens){ const id=`au_${g}_${d}_${sc}`, rec=AUTHOR_RECORDS[id]; const lo=GC(g,d,sc).lower;
    out.push({ id, g, tier:'author', name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,sc,d)}`, how:T(PROGRESS.beat,{rec:rec===undefined||rec===null?PROGRESS.none:scoreTxt(g,rec,d,sc)}), at:{d,s:sc},
      test:r=>rec!==undefined&&rec!==null&&r.g===g&&r.d===d&&r.s===sc&&(lo?r.hits<=rec:r.hits>=rec) }); }
  return out; }
const achAll=()=>ACH.concat(authorAch());
/* v14 (8.6): the radar is drawn against the AUTHOR's record, not against an internal curve — 1.0 is Aiden's number and a
   better score pushes the shape outside the web. One ratio per game: the best any run of it managed against the Author row for
   that exact mode and length, lower-is-better inverted so both directions read the same way. `null` where there is no Author
   record to measure against — every row is null today (AUTHOR_RECORDS is empty until the final build, v13 11.3 / Open 5), and
   the screen falls back to quality() for those games, which is what it has always drawn. */
function authorRatio(g,runs){ let best=null;
  for(const r of runs){ if(r.g!==g||r.practice) continue; const rec=AUTHOR_RECORDS[`au_${g}_${r.d}_${r.s}`];
    if(rec===undefined||rec===null||!(rec>0)) continue;
    const v=GC(g,r.d,r.s).lower ? (r.hits>0?rec/r.hits:0) : r.hits/rec;
    if(Number.isFinite(v)&&(best===null||v>best)) best=v; }
  return best; }
const achById=id=>ACH.find(a=>a.id===id)||authorAch().find(a=>a.id===id);
const got=()=>store.ach;
/* v15 (2.5): `live` restricts the pass to the rows flagged live:1 in config/achievements.js — the ones whose test can only
   become more true as a run goes on — and is run from run/run.js on every live tick, so an achievement earned mid-run is in
   the store before the player can quit. Without the flag it is the whole table, at the finish, as it always was.
   Either way this WRITES: the toast is a consequence of the save, never a substitute for it. */
function checkAch(run,live){ if(run.chal||run.practice||run.demo) return []; const g=got(); const all=Scores.runs(); const fresh=[]; for(const a of ACH){ if(live&&!a.live) continue; if(!g[a.id]&&a.test(run,all)){ g[a.id]=Date.now(); fresh.push(a); } } if(fresh.length) save(); return fresh; }
function unlockWord(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; if(k==='wheel') return UNLOCK_WORD.wheel; if(k==='bg') return T(UNLOCK_WORD.bg,{bg:BG_NAME[v]}); if(k==='snd') return T(UNLOCK_WORD.snd,{v}); return T(UNLOCK_WORD.item,{word:ITEM_WORD[k]}); }
// the same, with the actual colour as a swatch (v8) — "unlocks lead colour" on its own said nothing
function unlockHtml(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; return unlockWord(a)+((k==='sq'||k==='lead')&&v!=='wheel'?`<i class="sw" style="background:${v}"></i>`:''); }

/* ---------- verdicts: four tiers over a per-game quality 0..1 (progress/rules.js QUALITY) ----------
   v17 (B.25, build 29). Three things changed and only one of them is the count. The THRESHOLDS were a ternary here
   (`q>=1?4:q>=.75?3:…`) against a five-line array in copy.js — a game could not be retuned without editing code, and
   the top tier needed a quality of exactly 1. Both halves are one table in config/verdicts.js now: a game's row carries
   its own three cut-offs and its own twenty lines. The verdict RETURNS AN OBJECT — the tier id, its colour and the
   line — because the result screen has to colour the line and play that tier's sound, and a bare string cannot say
   which tier it came from. Colour and sound are solo only (L4); the result screen enforces that, not this.
   A LINE IS NEVER THE ONE THAT SHOWED LAST TIME for the same game and tier: `lastLine` holds the index that showed and
   the next draw is uniform over the other four. It is per session, not stored — the point is not repeating inside a
   sitting, and a profile that comes back tomorrow has no memory to honour. */
const lastLine={};
function pickLine(key,tier,lines){ const n=lines.length; if(!n) return '';
  const k=key+':'+tier, prev=lastLine[k];
  let i=Math.floor(Math.random()*(n>1&&prev!==undefined?n-1:n)); if(n>1&&prev!==undefined&&i>=prev) i++;
  lastLine[k]=i; return lines[i]; }
const verdictKey=(g,d)=>VERDICTS[g+':'+d]?g+':'+d:g;
const tierCol=id=>(VERDICT_TIERS.find(t=>t.id===id)||{}).col||'';
// the threshold a tier starts at, for this game. The number lives in the game's row; the tier only says which of them
function tierMin(key,id){ const row=VERDICTS[key], t=VERDICT_TIERS.find(x=>x.id===id); return !row||!t||t.of===null?0:row.at[t.of]; }
/* v18 (B.10): THE TIER WITHOUT THE LINE. B.10 puts the tier's colour on the score itself and on that run's row on the
   board, and a board row must not draw a verdict line — pickLine() remembers what it showed, so asking it once per row
   would burn through the no-repeat memory for a sentence nobody sees. `tierOf` is the half both callers share; verdict()
   is that plus the line. Null where a run has no tier at all: a two-player run and a practice run never wear one (L4). */
function tierOf(r){ if(!r||r.practice||r.vs2) return null;
  const flat={ tier:VERDICT_FAIL_TIER, col:tierCol(VERDICT_FAIL_TIER) };
  if(r.fail) return flat;
  if(GAMES[r.g].timed&&(r.hits===0||r.misses>r.hits)) return flat;
  const row=VERDICTS[verdictKey(r.g,r.d)]; if(!row) return null;
  const q=quality(r.g,r.d,r.s,r);
  const t=VERDICT_TIERS.find(x=>x.of===null||q>=row.at[x.of]);
  return { tier:t.id, col:t.col }; }
function verdict(r){
  const key=verdictKey(r.g,r.d), row=VERDICTS[key];
  // the verdicts that are not a tier still carry one, so every solo result has a colour and a sound (VERDICT_FAIL_TIER)
  const flat=line=>({ tier:VERDICT_FAIL_TIER, col:tierCol(VERDICT_FAIL_TIER), line });
  // v18 (B.1c): Go / No-go's own fail line went with the three-wrong-taps ender; nothing ends that mode early now
  if(r.fail) return flat(VERDICT.fail);
  if(GAMES[r.g].timed){ if(r.hits===0) return flat(VERDICT.nothing); if(r.misses>r.hits) return flat(VERDICT.moreMisses); }
  if(!row) return flat('');
  const t=tierOf(r)||{ tier:VERDICT_FAIL_TIER, col:tierCol(VERDICT_FAIL_TIER) };
  return { tier:t.tier, col:t.col, line:pickLine(key,t.tier,row.lines[t.tier]||[]) };
}

function setPendingAim(v){ pendingAim=v; }
function setPendingGoal(v){ pendingGoal=v; }


export { ACH, Scores, UNLOCKS, achAll, achById, authorAch, authorRatio, bankLen, chalRun, checkAch, checkUnlocks, gameOpen, goalFor, got, isNew, isOpen, lenLock, lenNeed, lenNextLive, lenNextOf, lenOpen, lensOf, markSeen, needFor, newMark, nextAch, nextGoal, pendingAim, pendingGoal, practiceOpen, seedSeen, seenAll, setPendingAim, setPendingGoal, tierMin, tierOf, unlockHtml, unlockName, unlockToast, unlockWord, unlocked, verdict, verdictKey };
