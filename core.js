/* No Excuses — helpers: the small pure functions everything else uses
   Split out of index.html at build 12. Build 16 (refactor stage 2): every constant that lived here is in config/ now —
   CFG, LEN_NAME, MODE_NAME, SHAPE_WORD, PASS_LEN, VS_LEAD, VS_CAP, STREAK, STREAK_CFG in config/games.js; P1C, P2C in
   config/theme.js; PUB_URL in config/build.js. This file imports only config. */
import { PLAYER } from "./config/copy.js";
import { SEQ_STEP } from "./config/games.js";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// build 14 (S1): anything that is not from config goes through this before it meets innerHTML
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// build 16: fill a config/copy.js template — T('Round {n} of {s}', {n, s}). A missing value is an empty string; values are not escaped here
const T=(s,v)=>String(s).replace(/\{(\w+)\}/g,(_,k)=>v&&v[k]!=null?v[k]:'');
const vmin=()=>Math.min(innerWidth,innerHeight)/100;
const f2=n=>(Math.round(n*100)/100).toFixed(2);
const pWho=p=>`<span class="${p?'p2':'p1'}">${T(PLAYER.who,{n:p+1})}</span>`;
// sequence speed is not a choice any more (v9): it starts at 0.5s a key and tightens 15ms a round, floor 0.28s (SEQ_STEP)
const seqStep=round=>Math.max(SEQ_STEP.floor,Math.round(SEQ_STEP.start-(round-1)*SEQ_STEP.step));
const shapeI=s=>`<i class="${s}"></i>`;
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sum=a=>a.reduce((x,y)=>x+y,0);
// build 17 (refactor stage 3): the two lines every engine had its own copy of. winner: 0 / 1 / -1 for a draw. minMax: [best, worst] of a list, [0, 0] when empty
const winner=(a,b)=>a>b?0:b>a?1:-1;
const minMax=a=>a.length?[Math.min(...a),Math.max(...a)]:[0,0];

export { $, $$, T, esc, f2, mean, minMax, pWho, seqStep, shapeI, sum, vmin, winner };
