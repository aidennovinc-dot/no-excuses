/* No Excuses — the store (build 18, refactor stage 4). One key, `ne`, holding { v, prefs, runs, ach, unlock, intro, seen, bars }
   — not the seven build-13 keys (A5). load() runs the migration ladder forward, then shape-checks every field against its
   default and falls back per field, never for the whole record: tampered or corrupt storage can cost a player a colour or a
   run, it can never crash boot (S3). `runs` is capped at 600, oldest first out. save() writes the whole record; there is
   nothing else to save. Nothing here touches the DOM.

   The ladder: v0 is the build-13 layout (seven keys, no version) — fromLegacy() folds it into one record and applies the
   v8–v11 reshapes that used to run on every boot. v1 is this record. The next change adds `if(raw.v<2) raw=up2(raw)` below
   and bumps VERSION; a step never edits an earlier one.

   `bars` (build 22) is the key's cleared combinations — a map of '<game>:<mode>:<length>' → when it first cleared. It needs
   no ladder step: a v1 record without one shape-checks to {} like every other map, which is exactly right for a profile
   that has never met the key. progress/key.js is the only writer.

   The storage adapter is the three one-liners read / write / drop. Stage 5's platform.js swaps them for Capacitor Preferences. */
import { SCALES } from "../config/audio.js";
import { BUILD_FLAGS, RUN_SCHEMA } from "../config/build.js";
import { DESIGNS, ITEMS } from "../config/theme.js";
import { GAMES } from "../games/registry.js";
import { emit } from "./events.js";

const KEY='ne', VERSION=1, RUNS_CAP=600;
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
    chest1:p.chest1?1:0, progTab:p.progTab==='ach'?'ach':'unl',
    rate:RATES.includes(p.rate)?p.rate:'live' };   // v14 (6.7): which taps-per-second reading the rate bar shows
  if(isObj(p.musicG)) for(const g in GAMES) if(typeof p.musicG[g]==='boolean') o.musicG[g]=p.musicG[g];
  // colours are per game (v6): { sq, lead, cut }, each #RRGGBB; cut defaults to the square colour (v13 6.5)
  const col=isObj(p.col)?p.col:{};
  for(const g in GAMES){ const c=isObj(col[g])?col[g]:{}; const sq=hex(c.sq,SQ); o.col[g]={ sq, lead:hex(c.lead,LEAD), cut:hex(c.cut,sq) }; }
  if(Number.isInteger(p.mig11)&&p.mig11>0) o.mig11=p.mig11;
  return o; }
const validRun=r=>isObj(r)&&!!GAMES[r.g]&&GAMES[r.g].modes.includes(r.d)&&typeof r.s==='number'&&typeof r.hits==='number'&&typeof r.t==='number';
const cleanRuns=raw=>Array.isArray(raw)?raw.filter(validRun).slice(0,RUNS_CAP):[];
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

function load(){ let raw=parse(read(KEY)), legacy=false;
  if(!isObj(raw)){ raw=fromLegacy(); legacy=!!raw; if(!raw) raw={}; }
  // if(raw.v<2) raw=up2(raw);   ← the next step of the ladder goes here
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
function reset(){ store.runs=[]; store.ach={}; store.unlock={}; store.intro={}; store.seen=null; store.bars={}; Object.assign(prefs,{allOpen:false,supporter:false,story:0,adRuns:0,played:0,gridSeen:0,menuSeen:0,keySeen:0,chest1:0}); delete prefs.mig11; save(); emit('store:reset'); }

export { musicOn, prefs, reset, save, store };
