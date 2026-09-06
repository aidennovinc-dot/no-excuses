/* No Excuses — helpers, config constants and the small pure functions everything else uses
   Split out of index.html at build 12. Behaviour is identical to build 11. */
/* ---------- config: the feel. Nothing here is user-facing ---------- */
const CFG = { lockout: 750, countStep: 300, holdRate: 38 /* vmin per second */, seqSpeed:{normal:400,fast:250} /* ms per key, flat — no ramp (v5) */, dotPush: .25, dotPushMax: 14 /* vmin */, dotLeeway: 1.18 /* hidden: hit radius × this */ };
const LEN_NAME={5:'Sprint',7:'Duel',10:'Duel',15:'Dash',30:'Marathon',60:'Endurance'};
// v11: lengths are per-game constants, never the literal 5/15/30. Timed games: Sprint/Dash/Marathon seconds. Round games: Set (a fixed count) or Streak (-1, endless until the limit). Count: Normal/Hard. Find: Sprint/Dash/Marathon rounds
const STREAK=-1;
const PUB_URL='https://aidennovinc-dot.github.io/no-excuses/';
// two-player lengths (v10): pass & play is a fixed 7s of Quick Tap or 10s of Dots; versus runs until one player leads by VS_LEAD
const PASS_LEN={'quick-tap':7,'dots':10};
const VS_LEAD=10, VS_CAP=60;
// player colours (v11): Player 1 is red, Player 2 is light blue, everywhere two people share the phone
const P1C='#E0453B', P2C='#6EC6FF';
const pWho=p=>`<span class="${p?'p2':'p1'}">Player ${p+1} · ${p?'blue':'red'}</span>`;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// build 14 (S1): anything that is not from config goes through this before it meets innerHTML
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vmin=()=>Math.min(innerWidth,innerHeight)/100;
const f2=n=>(Math.round(n*100)/100).toFixed(2);

/* ---------- games registry: a new game is one entry here plus an engine ---------- */
const MODE_NAME={two:'Two',blind:'Blind',four:'Four',lead:'Lead',grow:'Grow',cut:'Cut',solo:'',stopwatch:'Stopwatch',hidden:'Hidden',flash:'Flash',nogo:'Go / No-go',count:'Count',find:'Find'};
// sequence speed is not a choice any more (v9): it starts at 0.5s a key and tightens 15ms a round, floor 0.28s
const seqStep=round=>Math.max(280,Math.round(500-(round-1)*15));
const shapeI=s=>`<i class="${s}"></i>`;
const SHAPE_WORD={circle:'circle',tri:'triangle',square:'square'};
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sum=a=>a.reduce((x,y)=>x+y,0);
// v11: a Streak length scores rounds survived — higher wins — whatever the mode's Set scores. `streak` is that override
const STREAK_CFG={ lower:false, fmt:v=>String(v), suffix:'', scoreWord:'rounds', cols:[['limit',r=>r.lim||''],['worst',r=>r.yTxt||'']], quality:r=>Math.min(1,r.hits/12) };

export { $, $$, CFG, LEN_NAME, MODE_NAME, P1C, P2C, PASS_LEN, PUB_URL, SHAPE_WORD, STREAK, STREAK_CFG, VS_CAP, VS_LEAD, esc, f2, mean, pWho, seqStep, shapeI, sum, vmin };
