/* No Excuses — the store (build 18, refactor stage 4). One key, `ne`, holding { v, prefs, runs, ach, unlock, intro, seen, bars }
   — not the seven build-13 keys (A5). load() runs the migration ladder forward, then shape-checks every field against its
   default and falls back per field, never for the whole record: tampered or corrupt storage can cost a player a colour or a
   run, it can never crash boot (S3). `runs` is capped at 600, oldest first out. save() writes the whole record; there is
   nothing else to save. Nothing here touches the DOM.

   The ladder: v0 is the build-13 layout (seven keys, no version) — fromLegacy() folds it into one record and applies the
   v8–v11 reshapes that used to run on every boot. v1 is this record; v2 (build 31) and v3 (build 32) are the two unit
   changes below. The next change adds `if(raw.v<4) raw=up4(raw)` and bumps VERSION; a step never edits an earlier one.

   `bars` (build 22) is the key's cleared combinations — a map of '<game>:<mode>:<length>' → when it first cleared. It needs
   no ladder step: a v1 record without one shape-checks to {} like every other map, which is exactly right for a profile
   that has never met the key. progress/key.js is the only writer.

   The storage adapter is the three one-liners read / write / drop. Stage 5's platform.js swaps them for Capacitor Preferences. */
import { SCALES, TRACK_OPTS } from "../config/audio.js";
import { BUILD_FLAGS, RUN_SCHEMA } from "../config/build.js";
import { DESIGNS, ITEMS } from "../config/theme.js";
import { GAMES, GC } from "../games/registry.js";
import { emit } from "./events.js";

const KEY='ne', VERSION=3, RUNS_CAP=600;
const LEGACY=['ne.prefs','ne.runs','ne.unlock','ne.ach','ne.seen','ne.intro','ne.tileSeen'];
const read=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const write=(k,v)=>{ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } };
const drop=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
const parse=s=>{ if(s==null) return undefined; try{ return JSON.parse(s); }catch(e){ return undefined; } };
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const HEX=/^#[0-9a-f]{6}$/i;
const hex=(v,d)=>typeof v==='string'&&HEX.test(v)?v:d;
const SND=ITEMS.snd.map(i=>i.v), RATES=ITEMS.rate.map(i=>i.v);
const SQ='#FFFFFF', LEAD='#C8322A';

/* ---------- the shape of each field. Anything that is not what its default is becomes the default; the rest is kept ---------- */
// S5: the two dev flags are read only while BUILD_FLAGS.dev is on — a `supporter: true` planted in storage is nothing in a release build
function cleanPrefs(raw){ const p=isObj(raw)?raw:{}; const dev=!!BUILD_FLAGS.dev;
  const o={ bg:DESIGNS[p.bg]?p.bg:'stars', tint:hex(p.tint,''), snd:SND.includes(p.snd)?p.snd:'space', musicG:{}, lastGame:GAMES[p.lastGame]?p.lastGame:'quick-tap',
    name:typeof p.name==='string'?p.name.trim().toUpperCase().slice(0,10):'', scale:SCALES[p.scale]?p.scale:'penta',
    allOpen:dev&&!!p.allOpen, supporter:dev&&!!p.supporter, adRuns:Number.isInteger(p.adRuns)&&p.adRuns>=0?p.adRuns:0,
    // v17 (build 28): `keySeen` was missing from this list since build 26 — reset() cleared a field load() never created,
    // so the keys screen's once-per-profile arrival was shape-checked by nothing. It is a flag like the three beside it
    col:{}, story:p.story?1:0, played:p.played?1:0, gridSeen:p.gridSeen?1:0, menuSeen:p.menuSeen?1:0, keySeen:p.keySeen?1:0,
    /* v17 (build 29): two new fields, both shape-checked here the day they are added — build 28 spent two builds with a
       `keySeen` that reset() cleared and load() never created, and that is the mistake this line exists to not repeat.
       `chest1` is PROGRESS (B.24: chest 1 opened, for good) so Fresh game clears it below; `progTab` is which tab of the
       Progress screen was last open (B.21), a preference like `lastGame`, so Fresh game leaves it alone. */
    // v18 (B.31, build 33): three tabs, so the field takes three values — Customise joined Game unlocks and Achievements
    chest1:p.chest1?1:0, progTab:['cus','ach'].includes(p.progTab)?p.progTab:'unl',
    /* v18 (B.16 / B.17, build 32): `pro` is which key the FRONT of the app counts — 0 until the player steps into Pro at
       chest 1, then 1, then 2 for Author. It is PROGRESS (the step is irreversible, B.16's warning says so) and Fresh game
       clears it. `chest3` is the Author chest (B.19), progress like the two before it. */
    pro:[0,1,2].includes(p.pro)?p.pro:0, chest3:p.chest3?1:0,
    // B.20: which tiers' whole-key moment has played on the keys screen, once each. Progress — Fresh game clears it
    keyWhole:isObj(p.keyWhole)?Object.fromEntries(Object.entries(p.keyWhole).filter(([k,v])=>['clear','pro','author'].includes(k)&&v).map(([k])=>[k,1])):{},
    /* v17 (build 30): two more, shape-checked the day they are added. `chest2` is PROGRESS (A.3: every pro bar, the
       cosmetic set — of which free music choice is one) so Fresh game clears it; `track` is which music option each
       game plays (B.32), a preference like `lastGame`, so Fresh game leaves it. A value that is not one of that game's
       own options is dropped, which means renaming an option costs a player their choice and never their boot. */
    chest2:p.chest2?1:0, track:{},
    rate:RATES.includes(p.rate)?p.rate:'live' };   // v14 (6.7): which taps-per-second reading the rate bar shows
  // 'menu' is a music switch like a game's (B.32 gives the menu loop its own off switch) and is the one non-game key here
  if(isObj(p.musicG)) for(const g of Object.keys(GAMES).concat('menu')) if(typeof p.musicG[g]==='boolean') o.musicG[g]=p.musicG[g];
  if(isObj(p.track)) for(const g in GAMES) if((TRACK_OPTS[g]||[]).includes(p.track[g])) o.track[g]=p.track[g];
  // colours are per game (v6): { sq, lead, cut }, each #RRGGBB; cut defaults to the square colour (v13 6.5)
  const col=isObj(p.col)?p.col:{};
  for(const g in GAMES){ const c=isObj(col[g])?col[g]:{}; const sq=hex(c.sq,SQ); o.col[g]={ sq, lead:hex(c.lead,LEAD), cut:hex(c.cut,sq) }; }
  if(Number.isInteger(p.mig11)&&p.mig11>0) o.mig11=p.mig11;
  // v18 (B.2 / B.4): how many Timing runs the unit change retired, so the app can say so once rather than silently
  if(Number.isInteger(p.mig31)&&p.mig31>0) o.mig31=p.mig31;
  if(Number.isInteger(p.mig32)&&p.mig32>0) o.mig32=p.mig32;
  return o; }
const validRun=r=>isObj(r)&&!!GAMES[r.g]&&GAMES[r.g].modes.includes(r.d)&&typeof r.s==='number'&&typeof r.hits==='number'&&typeof r.t==='number';
/* v18 (B.14): THE CAP NEVER DROPS A ROW THAT IS IN A TOP TEN. It did — the cap was `slice(0, 600)` here and
   `runs.length=600` in Scores.submit, both of which cut the OLDEST rows, and the oldest rows are the only records a mode
   played once a year has. Measured before the fix on a 601-run store: 600 Quick Tap runs plus one Estimate run, submit
   one more Quick Tap run, and the Estimate run was gone with its best, its top ten and the evidence behind its
   clearance bar. Aiden: "we only track the top ten records of any mode, no stress" — so that is what is kept.

   One trim, one place, because it runs at load as well as on every submit. Every combination's own top ten survives
   (which contains its best), and the room left over goes to the newest of everything else. Nothing protected is ever
   cut, so a profile carrying more than RUNS_CAP top-10 rows is allowed to sit above the cap rather than lose one; the
   hard ceiling below is the S3 guard against a tampered array, not the cap.
   `store.runs` is REPLACED by this, never spliced — Scores.runs() hands out the live array and nothing sorts it. */
const RUNS_HARD=RUNS_CAP*8;
function trimRuns(runs){ if(runs.length<=RUNS_CAP) return runs;
  const by={}; for(const r of runs){ const k=r.g+':'+r.d+':'+r.s; (by[k]=by[k]||[]).push(r); }
  const keep=new Set();
  for(const k in by){ const [g,d,sc]=k.split(':'); let lo=false; try{ lo=!!GC(g,d,+sc).lower; }catch(e){}
    by[k].slice().sort((a,b)=>lo?(a.hits-b.hits||a.t-b.t):(b.hits-a.hits||(a.misses||0)-(b.misses||0)||a.t-b.t)).slice(0,10).forEach(r=>keep.add(r)); }
  const rest=runs.filter(r=>!keep.has(r));   // newest first already: every submit unshifts
  const room=Math.max(0,RUNS_CAP-keep.size);
  const cut=new Set(rest.slice(room));
  const out=runs.filter(r=>!cut.has(r));
  return out.length>RUNS_HARD?out.slice(0,RUNS_HARD):out; }
const cleanRuns=raw=>trimRuns(Array.isArray(raw)?raw.filter(validRun):[]);
// ach / unlock / intro / seen are maps of key → timestamp (or 1). A value that is not a number is not a record
const cleanMap=raw=>{ const o={}; if(isObj(raw)) for(const k in raw){ const v=raw[k]; if((typeof v==='number'&&Number.isFinite(v))||v===true) o[k]=v; } return o; };

/* ---------- v0 → the one record: the seven build-13 keys, and the reshapes that used to run on every boot (v8–v11) ---------- */
function fromLegacy(){
  const L={}; let any=false; for(const k of LEGACY){ const v=parse(read(k)); if(v!==undefined){ any=true; L[k.slice(3)]=v; } }
  if(!any) return null;
  const prefs=isObj(L.prefs)?L.prefs:{};
  if(!isObj(prefs.musicG)) prefs.musicG={};
  if(prefs.music===false&&!Object.keys(prefs.musicG).length){ for(const g in GAMES) prefs.musicG[g]=false; }   // v13: the old global switch becomes every game off
  if(!isObj(prefs.col)){ prefs.col={}; for(const g in GAMES) prefs.col[g]={sq:prefs.sq||SQ,lead:prefs.lead||LEAD}; }   // v6: the old global sq/lead seed every game once
  if(!DESIGNS[prefs.bg]){ prefs.tint=String(prefs.bg).startsWith('#')?prefs.bg:''; prefs.bg='stars'; }   // v3 stored a hex in bg
  let runs=Array.isArray(L.runs)?L.runs.filter(isObj):[];
  runs.forEach(r=>{ if(r.g==='count'){ r.g='spot'; r.d='count'; } else if(r.g==='find'){ r.g='spot'; r.d='find'; } });   // v8: Count and Find became Spot · Count / Find
  runs=runs.filter(r=>{ if(r.g==='quick-tap'&&r.d==='lead') return false; if(r.g==='hold'&&(r.d==='match'||r.d==='estimate')){ if(r.s!==5) return false; r.d='grow'; } return true; });   // v9: Lead is gone; Match/Estimate became Grow, 5-round runs only
  runs=runs.filter(r=>!(r.g==='timing'&&r.d==='hidden'&&(r.v||0)<10));   // v10: Hidden is scored in pixels now
  // v11: Blind is Two. Estimate, Timing, Reaction and Count changed their scoring unit — runs from before build 11 retire, once, with a note (prefs.mig11)
  let c11=0; runs=runs.filter(r=>{ if(r.g==='quick-tap'&&r.d==='blind') r.d='two'; if((r.v||0)<11&&(r.g==='hold'||r.g==='timing'||r.g==='reaction'||(r.g==='spot'&&r.d==='count'))){ c11++; return false; } return true; });
  if(c11) prefs.mig11=c11;
  runs.forEach(r=>{ r.v=RUN_SCHEMA; });   // every survivor is valid under the current scoring: it carries the current stamp from here on
  const ren={ 'quick-tap:lead':'quick-tap:four', 'hold:match':'hold:grow', 'hold:estimate':'hold:cut' };
  const unlock=isObj(L.unlock)?L.unlock:{};
  for(const k of Object.keys(unlock)){ if(k.startsWith('count:')){ unlock['spot:count']=unlock[k]; delete unlock[k]; } else if(k.startsWith('find:')){ unlock['spot:find']=unlock[k]; delete unlock[k]; } }
  for(const k in ren) if(unlock[k]){ unlock[ren[k]]=unlock[k]; delete unlock[k]; }
  const ach=isObj(L.ach)?L.ach:{}; const am={ct_5:'sp_5',ct_10:'sp_15',fd_fast:'sp_fast',fd_clean:'sp_clean'}; for(const k in am) if(ach[k]){ ach[am[k]]=ach[k]; delete ach[k]; }
  const intro=isObj(L.intro)?L.intro:{}; for(const k in ren) delete intro[k]; if(intro['quick-tap:blind']){ intro['quick-tap:two']=intro['quick-tap:blind']; delete intro['quick-tap:blind']; }
  return { v:0, prefs, runs, unlock, ach, intro, seen:L.seen };
}

/* v1 → v2 (build 31, v18 §B.2 / §B.4): the two Timing families whose SCORING UNIT changed are retired, and nothing
   else is touched. Stopwatch · Set was the mean of its rounds' differences and is their sum; Hidden was pixels off the
   marker and is milliseconds. Both old numbers are smaller than the honest new one on a board where lower wins, so
   leaving them would have parked five stale records permanently in a top ten nobody could beat. A survivor is
   re-stamped with the current RUN_SCHEMA, exactly as the v11 retirement did — a step never runs twice. */
function up2(raw){ const runs=Array.isArray(raw.runs)?raw.runs:[];
  const stale=r=>isObj(r)&&r.g==='timing'&&((r.d==='stopwatch'&&r.s!==-1)||r.d==='hidden')&&(r.v||0)<3;
  const n=runs.filter(stale).length;
  raw.runs=runs.filter(r=>!stale(r)); raw.runs.forEach(r=>{ if(isObj(r)) r.v=RUN_SCHEMA; });
  /* CLEARED BARS AND EARNED ACHIEVEMENTS STAY. The bars and the two rows that read these units were CONVERTED at the
     ball's measured pace, not retuned — 180px is 1200ms and a 0.28s average over five rounds is a 1.40s total — so a
     player who cleared the old number would clear the new one. A record is different: its stored `hits` is a NUMBER in
     the old unit and there is nothing to compare it against, which is why the runs go and nothing else does. */
  raw.v=2; if(n&&isObj(raw.prefs)) raw.prefs.mig31=n; return raw; }

/* v2 → v3 (build 32, v19 §C.5 / §C.6): Go / No-go's SCORING UNIT changed in both lengths — the Set reads ms over the 180ms
   gate (the same play reads 180 lower, so an old record would sit under every honest new one on a lower-is-better board)
   and the Streak counts targets where it counted shapes seen (an old shape count would sit above every honest new one).
   Both families of record go; nothing else does. THE SET BAR STAYS CLEARED if it was — 380 raw and 200 over the gate are
   the same standard, converted (B.2's rule). THE STREAK BAR'S CLEARED FLAG GOES: five shapes on 1000ms and fifteen targets
   on 3000ms are not the same standard in a new unit, they are a different bar. Achievements are untouched: rx_clean is
   "no wrong taps", a claim that did not change unit. */
function up3(raw){ const runs=Array.isArray(raw.runs)?raw.runs:[];
  const stale=r=>isObj(r)&&r.g==='reaction'&&r.d==='nogo'&&(r.v||0)<4;
  const n=runs.filter(stale).length;
  raw.runs=runs.filter(r=>!stale(r)); raw.runs.forEach(r=>{ if(isObj(r)) r.v=RUN_SCHEMA; });
  if(isObj(raw.bars)) delete raw.bars['reaction:nogo:-1'];
  raw.v=3; if(n&&isObj(raw.prefs)) raw.prefs.mig32=n; return raw; }

function load(){ let raw=parse(read(KEY)), legacy=false;
  if(!isObj(raw)){ raw=fromLegacy(); legacy=!!raw; if(!raw) raw={}; }
  if((raw.v||0)<2) raw=up2(raw);
  if((raw.v||0)<3) raw=up3(raw);
  return { st:{ v:VERSION, prefs:cleanPrefs(raw.prefs), runs:cleanRuns(raw.runs), ach:cleanMap(raw.ach), unlock:cleanMap(raw.unlock), intro:cleanMap(raw.intro), seen:isObj(raw.seen)?cleanMap(raw.seen):null, bars:cleanMap(raw.bars) }, legacy }; }

const { st: store, legacy } = load();
const prefs = store.prefs;
function save(){ return write(KEY,JSON.stringify(store)); }
// the record is written back once at boot — repaired fields stick — and the old keys go only once the new record is safely down
if(save()&&legacy) LEGACY.forEach(drop);
const musicOn=g=>prefs.musicG[g]!==false;
/* Fresh game (the Testing screen's dev switch): progress goes, the look and the name stay.
   v17 (B.10): `supporter` goes too. It did not, and that is the answer to "is dev unlock-all leaking into a normal
   profile, or is the lock check wrong" — neither. The lock check is exact on a genuinely fresh profile (measured: 7 of 8
   target colours locked, 27 locked in total). But `lockedBy` also returns null for a SUPPORTER, and Fresh game cleared
   `allOpen` while leaving `supporter` standing — so switching Supporter on to compare cosmetics and then taking a fresh
   profile showed all 27 of them open. Supporter is a dev switch today (S5 gates it out of a release build entirely) and
   Fresh game is the switch for seeing the app as a new player does, so it belongs in this list. When it becomes a real
   purchase at the native build it will be restored from the store rather than from prefs, and this line stays correct. */
function reset(){ store.runs=[]; store.ach={}; store.unlock={}; store.intro={}; store.seen=null; store.bars={}; Object.assign(prefs,{allOpen:false,supporter:false,story:0,adRuns:0,played:0,gridSeen:0,menuSeen:0,keySeen:0,chest1:0,chest2:0,chest3:0,pro:0,keyWhole:{}}); delete prefs.mig11; delete prefs.mig31; delete prefs.mig32; save(); emit('store:reset'); }

export { RUNS_CAP, musicOn, prefs, reset, save, store, trimRuns };
