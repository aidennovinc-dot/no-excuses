/* No Excuses — unlocks, achievements, scores — the rules of progress, as pure functions over the store
   Split out of index.html at build 12. Build 15 (refactor stage 1): no screen code in here. Build 16 (refactor stage 2): the
   tables are data in config/ (unlocks.js, achievements.js, copy.js) and the predicates are in progress/rules.js under the
   same key or id; this file joins the two — UNLOCKS and ACH leave here with their `test` / `progress` attached, so the
   screens and the run read them as they always did. Nothing here touches the DOM. */

import { AUTHOR_RECORDS, ACH as ACH_ROWS } from "./config/achievements.js";
import { BG_NAME, ITEM_WORD, PROGRESS, TOAST, UNLOCK_WORD, VERDICT, VERDICTS } from "./config/copy.js";
import { MODE_NAME, STREAK } from "./config/games.js";
import { LEN_RULES, UNLOCKS as UNLOCK_ROWS } from "./config/unlocks.js";
import { T } from "./core.js";
import { CHAL } from "./core/platform.js";
import { load, prefs, save } from "./core/store.js";
import { GAMES, GC, N_GAMES, lenName } from "./games/registry.js";
import { ACH_PROGRESS, ACH_TEST, LEN_TEST, UNLOCK_TEST, quality } from "./progress/rules.js";
import { scoreTxt } from "./ui/format.js";
// the lengths on offer. v13 (0.3): pro lengths are gone — every player sees the same length row. Versus still has its own (Reaction best-of)
const lensOf=(g,d,vs)=>{ const c=GC(g,d); if(vs===2&&c.vsLens) return c.vsLens; return c.lens; };
/* ---------- progression (v6): modes open on easy milestones, each in the mode before it. Quick Tap Blind is open from the start ---------- */
// live (v10): a threshold unlock fires the moment the run reaches it — a green toast mid-run — not at the end. Averages and "finish a run" still wait for the end
// v13 section 4 (L6): config/unlocks.js (UNLOCKS + LEN_RULES) is the one record of the chain. Lock boxes, goal lines and the Next-achievement card all read from here
const UNLOCKS = UNLOCK_ROWS.map(u=>Object.assign({},u,{test:UNLOCK_TEST[u.key]}));

const unlocked=()=>load('ne.unlock',{});
/* ---------- new things (v13, 2.1 / L8): anything newly unlocked swells and tints green the first time it is on screen, then is marked seen.
   The store survives a reload and is cleared by Fresh game. Everything open on a brand-new profile is seeded as already seen, so nothing flashes on day one ---------- */
const seenAll=()=>{ const s=load('ne.seen',null); return s&&typeof s==='object'&&!Array.isArray(s)?s:null; }; // build 14 (S3): anything but a map reseeds
function markSeen(keys){ const st=seenAll()||{}; let ch=false; for(const k of keys) if(!st[k]){ st[k]=1; ch=true; } if(ch) save('ne.seen',st); }
const isNew=k=>{ const st=seenAll(); return !!st&&!st[k]; };
// the class to put on a freshly-unlocked element, and the key to mark once it has been rendered
function newMark(key,bag){ if(!isNew(key)) return ''; if(bag) bag.push(key); return ' newthing'; }
function openKeys(){ const k=[]; for(const g in GAMES){ if(gameOpen(g)) k.push('game:'+g); for(const d of GAMES[g].modes){ if(!isOpen(g,d)) continue; k.push('mode:'+g+':'+d); for(const sc of GC(g,d).lens) if(lenOpen(g,d,sc)) k.push('len:'+g+':'+d+':'+sc); } }
  if(practiceOpen()) k.push('len:sequence:solo:practice'); const a=got(); for(const id in a) k.push('ach:'+id); return k; }
function seedSeen(){ const st={}; for(const k of openKeys()) st[k]=1; save('ne.seen',st); }
// progressive lengths (v13): LEN_RULES holds the requirement per game, mode and index; everything else opens on one finished run of the length before it. The first length is always open
function lenLock(g,d,s,noChal){ if(prefs.allOpen) return null; if(!noChal&&chalAt(g,d)&&CHAL.s===s) return null; const c=GC(g,d), lens=c.lens, i=lens.indexOf(s); if(i<=0) return null; const prev=lens[i-1], runs=Scores.runs().filter(r=>r.g===g&&r.d===d&&r.s===prev&&!r.practice);
  const rule=(LEN_RULES[g]||[])[i], test=(LEN_TEST[g]||[])[i];
  if(rule) return runs.some(test)?null:{g,d,s:prev,need:T(rule,{prev:lenName(g,prev,d)}),name:lenName(g,s,d)};
  if(s===STREAK) return runs.length?null:{g,d,s:prev,need:T(PROGRESS.finishOne,{prev:lenName(g,prev,d)}),name:PROGRESS.streak};
  return runs.length?null:{g,d,s:prev,need:T(PROGRESS.finishA,{prev:lenName(g,prev,d)}),name:lenName(g,s,d)}; }
const lenOpen=(g,d,s)=>!lenLock(g,d,s);
// the next mode this run could open, if the game, mode and length line up — shown while you play (v8). v11: a length unlock counts too
function goalFor(g,d,s){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]&&x.where.g===g&&(!x.where.d||x.where.d===d)&&(!x.where.s||x.where.s===s)); if(x) return x;
  const c=GC(g,d), i=c.lens.indexOf(s); if(i>=0&&i<c.lens.length-1){ const nxt=c.lens[i+1], L=lenLock(g,d,nxt); if(L){ const test=(LEN_TEST[g]||[])[i+1]; return { key:g+':'+d+':'+nxt, need:L.need, where:{g,d,s}, live:1, len:L, test:r=>r.g===g&&r.d===d&&r.s===s&&(test?test(r):true) }; } } return null; }
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
function checkUnlocks(run){ const u=unlocked(); const fresh=[]; for(const x of UNLOCKS){ if(!u[x.key]&&x.test(run)){ u[x.key]=Date.now(); fresh.push(x); } } save('ne.unlock',u); return fresh; }
// everything is open (v11): no game, mode or length left to earn — the Next-up card hides
function nextGoal(){ if(prefs.allOpen) return null; const u=unlocked(); const x=UNLOCKS.find(x=>!u[x.key]); if(x) return { need:x.need, name:unlockName(x.key), gname:GAMES[x.where.g].name, where:x.where };
  for(const g in GAMES) for(const d of GAMES[g].modes){ if(!isOpen(g,d)) continue; for(const sc of GC(g,d).lens){ const L=lenLock(g,d,sc); if(L) return { need:L.need, name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${L.name}`, gname:GAMES[g].name, where:{g,d,s:L.s} }; } } return null; }
// what a 'Try to unlock' or achievement tap carries into the run it starts (set from menu.js/app.js through the setters below)
let pendingAim='', pendingGoal=null;

/* ---------- score store: the interface a Game Center adapter implements later ---------- */
const Scores = {
  runs(){ return load('ne.runs',[]); },
  of(g,d,s){ const lo=GC(g,d,s).lower; return this.runs().filter(r=>r.g===g&&r.d===d&&r.s===s).sort((a,b)=>lo?(a.hits-b.hits||a.t-b.t):(b.hits-a.hits||a.misses-b.misses||a.t-b.t)); },
  best(g,d,s){ const r=this.of(g,d,s)[0]; return r?r.hits:null; },
  submit(run){ if(run.chal) return false; const prev=this.best(run.g,run.d,run.s); const runs=this.runs(); runs.unshift(run); save('ne.runs',runs.slice(0,600)); const lo=GC(run.g,run.d,run.s).lower; return prev===null ? run.hits>0||lo : (lo ? run.hits<prev : run.hits>prev); },
  rank(run){ return this.of(run.g,run.d,run.s).findIndex(r=>r.t===run.t)+1; }
};

/* ---------- achievements: per game, three tiers. progress() gives 0..1 for the bar; at{} is where tapping the row takes you ---------- */
const ACH = ACH_ROWS.map(a=>{ const o=Object.assign({},a,{test:ACH_TEST[a.id]}); if(ACH_PROGRESS[a.id]) o.progress=ACH_PROGRESS[a.id]; return o; });
// one row per game, mode and length. `rec` is null until Aiden fills it in — a null record can never be beaten, so the row stays locked and shows —
function authorAch(){ const out=[]; for(const g in GAMES) for(const d of GAMES[g].modes) for(const sc of GC(g,d).lens){ const id=`au_${g}_${d}_${sc}`, rec=AUTHOR_RECORDS[id]; const lo=GC(g,d,sc).lower;
    out.push({ id, g, tier:'author', name:`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,sc,d)}`, how:T(PROGRESS.beat,{rec:rec===undefined||rec===null?PROGRESS.none:scoreTxt(g,rec,d,sc)}), at:{d,s:sc},
      test:r=>rec!==undefined&&rec!==null&&r.g===g&&r.d===d&&r.s===sc&&(lo?r.hits<=rec:r.hits>=rec) }); }
  return out; }
const achAll=()=>ACH.concat(authorAch());
const achById=id=>ACH.find(a=>a.id===id)||authorAch().find(a=>a.id===id);
const got=()=>load('ne.ach',{});
function checkAch(run){ if(run.chal) return []; const g=got(); const all=Scores.runs(); const fresh=[]; for(const a of ACH){ if(!g[a.id]&&a.test(run,all)){ g[a.id]=Date.now(); fresh.push(a); } } save('ne.ach',g); return fresh; }
function unlockWord(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; if(k==='wheel') return UNLOCK_WORD.wheel; if(k==='bg') return T(UNLOCK_WORD.bg,{bg:BG_NAME[v]}); if(k==='snd') return T(UNLOCK_WORD.snd,{v}); return T(UNLOCK_WORD.item,{word:ITEM_WORD[k]}); }
// the same, with the actual colour as a swatch (v8) — "unlocks lead colour" on its own said nothing
function unlockHtml(a){ if(!a.unlocks) return ''; const [k,v]=a.unlocks; return unlockWord(a)+((k==='sq'||k==='lead')&&v!=='wheel'?`<i class="sw" style="background:${v}"></i>`:''); }

/* ---------- verdicts: tiered by a per-game quality 0..1 (progress/rules.js) ---------- */
function verdict(r){
  if(r.fail) return r.g==='reaction'&&r.d==='nogo'?VERDICT.nogoFail:VERDICT.fail;
  if(GAMES[r.g].timed){ if(r.hits===0) return VERDICT.nothing; if(r.misses>r.hits) return VERDICT.moreMisses; }
  const q=quality(r.g,r.d,r.s,r); const i=q>=1?4:q>=.75?3:q>=.5?2:q>=.25?1:0; return (VERDICTS[r.g+':'+r.d]||VERDICTS[r.g])[i];
}

function setPendingAim(v){ pendingAim=v; }
function setPendingGoal(v){ pendingGoal=v; }


export { ACH, Scores, UNLOCKS, achAll, achById, authorAch, chalRun, checkAch, checkUnlocks, gameOpen, goalFor, got, isNew, isOpen, lenLock, lenOpen, lensOf, markSeen, needFor, newMark, nextGoal, pendingAim, pendingGoal, practiceOpen, seedSeen, seenAll, setPendingAim, setPendingGoal, unlockHtml, unlockName, unlockToast, unlockWord, unlocked, verdict };
