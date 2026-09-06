/* No Excuses — storage and the player's prefs (build 15, refactor stage 1).
   load/save came from core.js, prefs and its migrations from menu.js. Still the seven build-13 keys
   (ne.prefs, ne.runs, ne.unlock, ne.ach, ne.seen, ne.intro, ne.tileSeen) — Stage 4 folds them into one
   versioned `ne` record. Nothing here touches the DOM. */
import { GAMES } from "../games/registry.js";

// build 14 (S3): a stored value has to be the same shape as its default — an array where an array is expected, a plain object where an object is — or the default wins. Tampered storage costs progress, never a boot
function load(k,d){ try{ const v=localStorage.getItem(k); if(!v) return d; const p=JSON.parse(v);
  if(Array.isArray(d)) return Array.isArray(p)?p:d; if(d&&typeof d==='object') return p&&typeof p==='object'&&!Array.isArray(p)?p:d; return p; }catch(e){ return d; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

/* ---------- prefs ---------- */
const prefs = Object.assign({ sq:'#FFFFFF', lead:'#C8322A', bg:'stars', tint:'', snd:'space', music:true, musicG:{}, lastGame:'quick-tap', name:'', scale:'penta', allOpen:false, supporter:false, adRuns:0 }, load('ne.prefs',{}));
if(!prefs.musicG||typeof prefs.musicG!=='object') prefs.musicG={};
if(prefs.music===false&&!Object.keys(prefs.musicG).length){ for(const g in GAMES) prefs.musicG[g]=false; prefs.music=true; } // v13: the old global switch becomes every game off
const musicOn=g=>prefs.musicG[g]!==false;
(function migrate(){ // v8: Count and Find became Spot · Count / Find; speed became seconds per key
  const runs=load('ne.runs',[]); runs.forEach(r=>{ if(r.g==='count'){ r.g='spot'; r.d='count'; } else if(r.g==='find'){ r.g='spot'; r.d='find'; } });
  const keep=runs.filter(r=>GAMES[r.g]&&GAMES[r.g].modes.includes(r.d)); save('ne.runs',keep);
  const u=load('ne.unlock',{}); let ch=false; for(const k of Object.keys(u)){ if(k.startsWith('count:')){ u['spot:count']=u[k]; delete u[k]; ch=true; } if(k.startsWith('find:')){ u['spot:find']=u[k]; delete u[k]; ch=true; } } if(ch) save('ne.unlock',u);
  const a=load('ne.ach',{}); const map={ct_5:'sp_5',ct_10:'sp_15',fd_fast:'sp_fast',fd_clean:'sp_clean'}; let ca=false; for(const k in map) if(a[k]){ a[map[k]]=a[k]; delete a[k]; ca=true; } if(ca) save('ne.ach',a);
  if(prefs.speed==='normal') prefs.speed=.4; if(prefs.speed==='fast') prefs.speed=.3;
  // v9: Quick Tap Lead is gone (its runs with it); Hold Match/Estimate became Estimate · Grow, keeping only 5-round runs
  const r9=load('ne.runs',[]); let c9=false; const k9=r9.filter(r=>{ if(r.g==='quick-tap'&&r.d==='lead'){ c9=true; return false; } if(r.g==='hold'&&(r.d==='match'||r.d==='estimate')){ c9=true; if(r.s!==5) return false; r.d='grow'; } return true; }); if(c9) save('ne.runs',k9);
  const u9=load('ne.unlock',{}); const m9={'quick-tap:lead':'quick-tap:four','hold:match':'hold:grow','hold:estimate':'hold:cut'}; let cu=false; for(const k in m9) if(u9[k]){ u9[m9[k]]=u9[k]; delete u9[k]; cu=true; } if(cu) save('ne.unlock',u9);
  const i9=load('ne.intro',{}); let ci=false; for(const k in m9) if(i9[k]){ delete i9[k]; ci=true; } if(ci) save('ne.intro',i9);
  // v10: Hidden is scored in pixels now; runs scored in seconds cannot sit on the same board
  const r10=load('ne.runs',[]); const k10=r10.filter(r=>!(r.g==='timing'&&r.d==='hidden'&&(r.v||0)<10)); if(k10.length!==r10.length) save('ne.runs',k10);
  // v11: Quick Tap Blind is Two (runs, intros and colours keep). Estimate, Timing, Reaction and Count changed their scoring unit — runs from before build 11 cannot sit on the new boards, so they retire, once, with a note. Dots, Sequence and Find keep theirs
  const r11=load('ne.runs',[]); let c11=0; const k11=r11.filter(r=>{ if(r.g==='quick-tap'&&r.d==='blind') r.d='two'; if((r.v||0)<11&&(r.g==='hold'||r.g==='timing'||r.g==='reaction'||(r.g==='spot'&&r.d==='count'))){ c11++; return false; } return true; }); if(c11||r11.some(r=>r.g==='quick-tap'&&r.d==='two')) save('ne.runs',k11); if(c11) prefs.mig11=c11;
  const i11=load('ne.intro',{}); if(i11['quick-tap:blind']){ i11['quick-tap:two']=i11['quick-tap:blind']; delete i11['quick-tap:blind']; save('ne.intro',i11); }
  if(prefs.lastDiff==='blind'&&prefs.lastGame==='quick-tap') prefs.lastDiff='two'; })();
// colours are per game (v6): prefs.col[game] = {sq, lead}. The old global sq/lead seed every game once
// build 14 (S3): a col that is not an object of objects is rebuilt, not trusted
if(!prefs.col||typeof prefs.col!=='object'||Array.isArray(prefs.col)){ prefs.col={}; for(const g in GAMES) prefs.col[g]={sq:prefs.sq||'#FFFFFF',lead:prefs.lead||'#C8322A'}; }
for(const g in GAMES) if(!prefs.col[g]||typeof prefs.col[g]!=='object') prefs.col[g]={sq:'#FFFFFF',lead:'#C8322A'};
for(const g in GAMES) if(!prefs.col[g].cut) prefs.col[g].cut=prefs.col[g].sq||'#FFFFFF';
if(!GAMES[prefs.lastGame]) prefs.lastGame='quick-tap';

export { load, musicOn, prefs, save };
