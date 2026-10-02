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
/* build 66 (65.19): COLOUR MARKS in a line of copy — [green]…[/green], [yellow]…[/yellow], [red]…[/red] — drawn as the game's own green, yellow
   and red (.mk-* in styles/app.css). The line is escaped first, so a mark is the only markup it can carry; a stray closing mark is dropped and an
   unclosed one is closed at the end, so a mark never shows as text. `unmark` is the same line as plain words */
const MARK=/\[(\/?)(green|yellow|red)\]/g;
const marks=s=>{ let open=0; const out=esc(s).replace(MARK,(_,c,k)=>{ if(!c){ open++; return `<span class="mk-${k}">`; } if(!open) return ''; open--; return '</span>'; });
  return out+'</span>'.repeat(open); };
const unmark=s=>String(s??'').replace(MARK,'');
const vmin=()=>Math.min(innerWidth,innerHeight)/100;
const f2=n=>(Math.round(n*100)/100).toFixed(2);
const pWho=p=>`<span class="${p?'p2':'p1'}">${T(PLAYER.who,{n:p+1})}</span>`;
// sequence speed is not a choice any more (v9): it starts at 0.5s a key and tightens 15ms a round, floor 0.28s (SEQ_STEP)
const seqStep=round=>Math.max(SEQ_STEP.floor,Math.round(SEQ_STEP.start-(round-1)*SEQ_STEP.step));
// v26 §B2 (build 50): shapeI moved to games/_shared/shapes.js, where it draws the shared shape instead of naming a CSS class
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sum=a=>a.reduce((x,y)=>x+y,0);
// build 17 (refactor stage 3): the two lines every engine had its own copy of. winner: 0 / 1 / -1 for a draw. minMax: [best, worst] of a list, [0, 0] when empty
const winner=(a,b)=>a>b?0:b>a?1:-1;
const minMax=a=>a.length?[Math.min(...a),Math.max(...a)]:[0,0];
/* build 69 (68.3): AN SVG'S LABELS STAY INSIDE ITS OWN BOX. iPhone WebKit drew a second copy of the Scores and Skill Key labels hundreds of pixels
   below the first: text painted outside an SVG's box (`overflow:visible`) is outside the layer that owns the picture, and is never cleaned when the
   screen moves. The viewBox is the base box widened to every label in `sel`, so no label reaches outside; `ratio` sets the box's aspect to match, `pad` is room round each label in the SVG's units */
function fitLabels(svg,base,sel,ratio,pad=3){ if(!svg) return; let [x0,y0,w,h]=base, x1=x0+w, y1=y0+h;
  for(const t of svg.querySelectorAll(sel)){ let b; try{ b=t.getBBox(); }catch(e){ continue; } if(!b||!b.width) continue;
    x0=Math.min(x0,b.x-pad); y0=Math.min(y0,b.y-pad); x1=Math.max(x1,b.x+b.width+pad); y1=Math.max(y1,b.y+b.height+pad); }
  const vb=[x0,y0,x1-x0,y1-y0].map(v=>+v.toFixed(1)); svg.setAttribute('viewBox',vb.join(' ')); if(ratio) svg.style.aspectRatio=vb[2]+'/'+vb[3]; }

export { $, $$, T, esc, f2, fitLabels, marks, mean, minMax, pWho, seqStep, sum, unmark, vmin, winner };
