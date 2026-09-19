/* No Excuses — menu atmosphere: four designs, all quiet. The canvas behind every screen; the run fades it out.
   Build 17 (refactor stage 3): out of app.js. Build 18 (stage 4): it listens for screen:change — under a run the canvas is
   at opacity 0, so the frame loop stops rather than drawing 70 stars a frame that nobody can see, and starts again on the
   next screen.

   v24 (C.6, build 43): THE THREE KEY LAYERS. Each key screen draws its own background OVER the live one (C.4 — Keys 1 and 2 always showed the
   background through; Thorn now does too), and once a key is finished its layer is a Customise background of its own: Lantern, Circuit,
   Thorn, each the stock stars with that layer over them. Drawn in code, no image assets, gently moving, and in the key's own tempo — a layer
   reads the bpm of its key's theme (config/keys.js `track`) so the motion and the music keep one beat. The numbers are config/keys.js
   KEY_LAYER. One canvas, one loop: the key screen asks for its layer with setKeyLayer(style) and gives it back on the way out. */
import { TRACKS } from "../config/audio.js";
import { KEYS, KEY_LAYER } from "../config/keys.js";
import { $ } from "../core.js";
import { on } from "../core/events.js";
import { look } from "../core/store.js";

const cv=$('#stars'), cx=cv.getContext('2d'); let W,H,pts=[],dpr=1, paused=false, running=false, over=null, geo=null;
// v29 (item 16, build 55): DPR IS CAPPED AT 2. It was uncapped, so a Pro / Pro Max drew this canvas at 3x - 1290x2796, 3.6 megapixels -
// and the Thorn layer fills the whole of it four times a frame, about 14 megapixels of gradient fill per frame at 60fps on the menu.
// Nothing here has a hard edge that 2x does not hold: stars, orbs and washes are all soft. Battery, not fidelity.
function size(){ dpr=Math.min(2,devicePixelRatio||1); W=cv.width=innerWidth*dpr; H=cv.height=innerHeight*dpr; geo=null;
  pts=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.4+.4)*dpr,s:(Math.random()*.15+.05)*dpr,a:Math.random()*.5+.15,ph:Math.random()*6.28,l:(30+Math.random()*60)*dpr,v:(.6+Math.random()*1.2)*dpr,R:(120+Math.random()*160)*dpr})); }
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const DRAW={
  stars(t){ for(const p of pts){ if(!reduce){ p.y-=p.s; if(p.y<-4) p.y=H+4; } cx.globalAlpha=p.a*(.6+.4*Math.sin(t/1400+p.ph)); cx.fillStyle='#E8E6E1'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.28); cx.fill(); } },
  /* grid (v8): the spacing breathes — lines drift apart and back together around the centre, and being evenly spaced they can never cross.
     v29 Section A (57.11c, build 57): IN BLUE. It was the app's off-white at 7%, on a blue-black ground, which read as grey on grey; the ground is a
     real navy now (config/theme.js DESIGNS.grid) and the lines are a blue you can see, with the nodes on them brighter again. */
  grid(t){ const g=56*dpr*(1+(reduce?0:.22*Math.sin(t/2800))); const ox=(W/2)%g, oy=(H/2)%g; cx.globalAlpha=.3; cx.strokeStyle='#5B8CFF'; cx.lineWidth=dpr; cx.beginPath(); for(let x=ox-g;x<W+g;x+=g){ cx.moveTo(x,0); cx.lineTo(x,H); } for(let y=oy-g;y<H+g;y+=g){ cx.moveTo(0,y); cx.lineTo(W,y); } cx.stroke();
    cx.globalAlpha=.7; for(let i=0;i<12;i++){ const p=pts[i]; const gx=Math.round((p.x-ox)/g)*g+ox, gy=Math.round((p.y-oy)/g)*g+oy; cx.fillStyle='#8FB4FF'; cx.fillRect(gx-1.5*dpr,gy-1.5*dpr,3*dpr,3*dpr); } },
  rain(t){ cx.strokeStyle='#E8E6E1'; cx.lineWidth=dpr; for(const p of pts.slice(0,40)){ if(!reduce){ p.y+=p.v; if(p.y>H+p.l) p.y=-p.l; } cx.globalAlpha=p.a*.28; cx.beginPath(); cx.moveTo(p.x,p.y-p.l); cx.lineTo(p.x,p.y); cx.stroke(); } },
  orbs(t){ for(const p of pts.slice(0,6)){ const x=p.x+(reduce?0:Math.sin(t/4000+p.ph)*40*dpr), y=p.y+(reduce?0:Math.cos(t/5200+p.ph)*30*dpr); const gr=cx.createRadialGradient(x,y,0,x,y,p.R); gr.addColorStop(0,'rgba(232,230,225,.09)'); gr.addColorStop(1,'rgba(232,230,225,0)'); cx.globalAlpha=1; cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,p.R,0,6.28); cx.fill(); } },
};

/* ---------- v24 (C.6): the key layers ---------- */
// a fixed pseudo-random number per index, so a layer is the same picture after every resize instead of a reshuffle
const rnd=(i,k)=>{ const x=Math.sin(i*127.1+k*311.7)*43758.5453; return x-Math.floor(x); };
// one beat of the key's own theme, in ms — the tempo every layer moves to
const beatMs=style=>{ const k=KEYS.find(x=>x.style===style), t=k&&TRACKS[k.track]; return t?60000/t.bpm:700; };
// a polyline's length, and the point a distance along it
const lenOf=p=>{ let n=0; for(let i=1;i<p.length;i++) n+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); return n; };
function pointAt(p,d){ for(let i=1;i<p.length;i++){ const s=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); if(d<=s){ const f=s?d/s:0; return [p[i-1][0]+(p[i][0]-p[i-1][0])*f,p[i-1][1]+(p[i][1]-p[i-1][1])*f]; } d-=s; } return p[p.length-1]; }
// one bezier arc from `a`, `reach` long, bowed by `bow`, as a 24-point polyline
function arc(a,inward,reach,bow){ const b=[a[0]+inward[0]*reach-inward[1]*bow*.4,a[1]+inward[1]*reach+inward[0]*bow*.4];
  const c=[(a[0]+b[0])/2-inward[1]*bow,(a[1]+b[1])/2+inward[0]*bow]; const p=[];
  for(let k=0;k<=24;k++){ const t=k/24, v=1-t; p.push([v*v*a[0]+2*v*t*c[0]+t*t*b[0],v*v*a[1]+2*v*t*c[1]+t*t*b[1]]); }
  return p; }
// the geometry the two drawn layers need, measured once per canvas size
function build(){ const out={ circuit:{ traces:[] }, thorn:{ branches:[] } };
  /* v29 Section A (57.11e, build 57): THE TRACES COVER THE SCREEN AND RUN OFF ALL FOUR EDGES. Aiden likes this layer; what it did not do was fill
     the screen — every trace started and ended inside the canvas, clamped to it, so it read as a patch in the middle. A trace now starts `edge`
     cells OUTSIDE one edge and is free to run `edge` cells past the others, so both ends leave the screen and nothing is clamped. */
  const C=KEY_LAYER.circuit, cell=C.cell*dpr, out4=C.edge*cell; out.circuit.cell=cell;
  for(let i=0;i<C.traces;i++){ const cols=Math.max(2,Math.floor((W+out4*2)/cell)), rows=Math.max(2,Math.floor((H+out4*2)/cell));
    let x=Math.floor(rnd(i,1)*cols)*cell+cell/2-out4, y=Math.floor(rnd(i,2)*rows)*cell+cell/2-out4; const p=[[x,y]]; let horiz=rnd(i,3)<.5;
    for(let s=0;s<5;s++){ const n=(3+Math.floor(rnd(i,10+s)*6))*cell*(rnd(i,20+s)<.5?-1:1);
      if(horiz) x=Math.max(-out4,Math.min(W+out4,x+n)); else y=Math.max(-out4,Math.min(H+out4,y+n)); p.push([x,y]); horiz=!horiz; }
    out.circuit.traces.push({ p, len:lenOf(p), off:rnd(i,30) }); }
  /* v29 Section A (57.11f, build 57): THE THORNS GROW, AND EVERY ONE OF THEM IS DIFFERENT. It swayed — one cosine over every branch at once, which
     is the "it looks like it goes back and forth" Aiden named. Each branch now has its OWN growth length, reach, bow, stem thickness, thorn size and
     side-branch count, drawn from the spans in config/keys.js KEY_LAYER.thorn, and each grows from nothing to full and is then re-seeded further
     along, so the layer fills the screen and never plays in reverse. They come in from the two sides and the bottom, as they did — a branch from the
     top edge crossed the title (the build-43 probe). */
  const B=KEY_LAYER.thorn, m=Math.min(W,H), sp=(k,r)=>r[0]+(r[1]-r[0])*k;
  for(let i=0;i<B.branches;i++){ const side=[0,1,3][i%3], u=.06+.88*rnd(i,40);
    const a=side===0?[0,H*u]:side===1?[W,H*u]:[W*u,H], inward=side===0?[1,0]:side===1?[-1,0]:[0,-1];
    const reach=m*sp(rnd(i,41),B.reach), bow=(rnd(i,42)-.5)*reach*.9, p=arc(a,inward,reach,bow);
    // the side branches: each leaves the stem part-way along and runs off at an angle of its own
    const kids=[], n=Math.round(sp(rnd(i,44),B.branch));
    for(let j=0;j<n;j++){ const at=Math.floor((.3+.5*rnd(i,50+j))*24), q=p[at], nx=p[Math.min(23,at+1)];
      const dx=nx[0]-q[0], dy=nx[1]-q[1], l=Math.hypot(dx,dy)||1, side2=j%2?1:-1;
      const dir=[(dx/l)*.7-(dy/l)*side2*.7,(dy/l)*.7+(dx/l)*side2*.7];
      kids.push({ at, p:arc(q,dir,reach*(.3+.3*rnd(i,60+j)),(rnd(i,70+j)-.5)*reach*.4) }); }
    out.thorn.branches.push({ p, kids, grow:sp(rnd(i,43),B.grow), wide:sp(rnd(i,45),B.wide), spike:sp(rnd(i,46),B.spike), ph:rnd(i,47) }); }
  return out; }
const LAYER={
  /* LANTERN SKY — v29 Section A (57.11d, build 57): REBUILT AS A SCENE. It was six warm radial blobs swaying over the starfield, which is exactly
     what Aiden saw: "just some yellow blobs over the same background". It is a DUSK now — a gradient from indigo at the top to amber at the horizon,
     and small PAPER LANTERNS drifting upward through it, each at its own size, depth and speed, each with a soft flicker of its own: a warm halo, the
     paper body with a taper at the top, and the flame inside it. A lantern further back is smaller, slower and dimmer, which is the depth. No stars
     under any of it (57.11a). Every number is config/keys.js KEY_LAYER.lantern. */
  lantern(t){ const P=KEY_LAYER.lantern, bar=beatMs('lantern')*4, T=reduce?0:t;
    const sky=cx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,`rgba(${P.sky},1)`); sky.addColorStop(.55,`rgba(${P.sky},.55)`); sky.addColorStop(1,`rgba(${P.glow},.5)`);
    cx.globalAlpha=1; cx.fillStyle=sky; cx.fillRect(0,0,W,H);
    // the horizon's own glow, so the amber reads as light rather than as a band of colour
    const hz=cx.createRadialGradient(W/2,H*1.02,0,W/2,H*1.02,Math.max(W,H)*.75);
    hz.addColorStop(0,`rgba(${P.glow},.4)`); hz.addColorStop(1,`rgba(${P.glow},0)`); cx.fillStyle=hz; cx.fillRect(0,0,W,H);
    for(let i=0;i<P.lanterns;i++){
      const dep=rnd(i,2), sc=(P.far+(P.near-P.far)*dep)*dpr;                    // how near this one is, and its size with it
      const span=bar*P.rise*(1.4-dep*.5), u=((T/span)+rnd(i,3))%1;              // how far up it is, nearer ones climbing faster
      const x=W*(.04+.92*rnd(i,4))+Math.sin(T/bar*.5+rnd(i,5)*6.28)*W*.03*dep;
      const y=H*1.06-u*H*1.18, r=7*sc;
      const fl=1-P.flick*(.5+.5*Math.sin(T/(bar*.55)+rnd(i,6)*6.28))*(.4+.6*rnd(i,7));
      const a=P.alpha*(.35+.65*dep)*fl;
      const g=cx.createRadialGradient(x,y,0,x,y,r*5);
      g.addColorStop(0,`rgba(${P.glow},${(a*.5).toFixed(3)})`); g.addColorStop(1,`rgba(${P.glow},0)`);
      cx.globalAlpha=1; cx.fillStyle=g; cx.beginPath(); cx.arc(x,y,r*5,0,6.28); cx.fill();
      // the paper: a rounded body with the top drawn in to the ring it hangs from
      cx.globalAlpha=Math.min(1,a); cx.fillStyle=`rgb(${P.col})`;
      cx.beginPath(); cx.moveTo(x-r*.62,y-r*.5); cx.quadraticCurveTo(x-r,y+r*.35,x-r*.34,y+r); cx.lineTo(x+r*.34,y+r);
      cx.quadraticCurveTo(x+r,y+r*.35,x+r*.62,y-r*.5); cx.quadraticCurveTo(x,y-r*.86,x-r*.62,y-r*.5); cx.closePath(); cx.fill();
      cx.globalAlpha=Math.min(1,a*1.5); cx.fillStyle=`rgb(${P.glow})`;
      cx.beginPath(); cx.arc(x,y+r*.34,r*.3,0,6.28); cx.fill(); } },
  // Circuit: sharper, cooler, geometric — right-angled traces with a pulse moving along each at `pulse` cells a beat, the corners blinking as it passes
  // v29 Section A (57.11e, build 57): unchanged in look, drawn over no starfield and on geometry that now leaves the screen on all four sides
  circuit(t){ const P=KEY_LAYER.circuit, G=geo.circuit, beat=beatMs('circuit'), T=reduce?0:t, tail=G.cell*1.6;
    cx.strokeStyle=`rgb(${P.col})`; cx.fillStyle=`rgb(${P.col})`; cx.lineWidth=dpr; cx.lineCap='square';
    for(const tr of G.traces){ cx.globalAlpha=P.alpha*.45; cx.beginPath(); tr.p.forEach((q,j)=>j?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke();
      const loop=tr.len+tail*2, head=((T/beat)*P.pulse*G.cell+tr.off*loop)%loop;
      cx.globalAlpha=P.head; cx.lineWidth=1.6*dpr; cx.beginPath();
      for(let s=0;s<=6;s++){ const d=Math.max(0,Math.min(tr.len,head-tail*s/6)); const q=pointAt(tr.p,d); s?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]); }
      cx.stroke(); cx.lineWidth=dpr;
      let d=0; for(let j=1;j<tr.p.length;j++){ d+=Math.hypot(tr.p[j][0]-tr.p[j-1][0],tr.p[j][1]-tr.p[j-1][1]); const near=Math.abs(head-d)<G.cell*.5;
        cx.globalAlpha=near?P.head:P.alpha; const s=(near?4:2.6)*dpr; cx.fillRect(tr.p[j-1][0]-s/2,tr.p[j-1][1]-s/2,s,s); } } },
  /* THORN — v29 Section A (57.11f, build 57): IT GROWS NOW. Every branch shared one cosine, which is why Aiden saw it "go back and forth". Each
     branch has its own growth length, reach, bow, stem thickness, thorn size and side branches (geo, from the spans in KEY_LAYER.thorn), and each
     runs from nothing to fully grown, holds, fades and starts again out of phase — so the screen fills and nothing ever plays in reverse. The dark
     edges and the thorn shape are build 43's, unchanged. */
  thorn(t){ const P=KEY_LAYER.thorn, G=geo.thorn, bar=beatMs('thorn')*4, T=reduce?0:t;
    for(const [x0,y0,x1,y1] of [[0,0,W*.2,0],[W,0,W*.8,0],[0,0,0,H*.14],[0,H,0,H*.86]]){ const g=cx.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,`rgba(0,0,0,${P.edge})`); g.addColorStop(1,'rgba(0,0,0,0)'); cx.globalAlpha=1; cx.fillStyle=g; cx.fillRect(0,0,W,H); }
    cx.strokeStyle=`rgb(${P.col})`; cx.fillStyle=`rgb(${P.col})`; cx.lineCap='round';
    // one branch's own clock: 0 → 1 is it growing, then it holds and fades over the last fifth and begins again
    const stem=(br,n,pts2,w)=>{ cx.lineWidth=w; cx.beginPath(); for(let k=0;k<n;k++) k?cx.lineTo(pts2[k][0],pts2[k][1]):cx.moveTo(pts2[k][0],pts2[k][1]); cx.stroke(); };
    for(const br of G.branches){ const span=bar*br.grow, u=reduce?.8:((T/span)+br.ph)%1;
      const grow=Math.min(1,u/.8), fade=u>.86?(1-u)/.14:1, n=Math.max(2,Math.round(br.p.length*grow));
      cx.globalAlpha=P.alpha*.8*fade; stem(br,n,br.p,br.wide*dpr);
      // its side branches, each growing behind the stem that carries it
      for(const kid of (br.kids||[])){ if(n<=kid.at+2) continue;
        const kg=Math.min(1,(grow-kid.at/24)/.45); if(kg<=0) continue;
        cx.globalAlpha=P.alpha*.6*fade; stem(br,Math.max(2,Math.round(kid.p.length*kg)),kid.p,br.wide*.6*dpr); }
      cx.globalAlpha=P.alpha*fade;
      for(let j=1;j<=P.thorns;j++){ const k=Math.round(j/(P.thorns+1)*(br.p.length-2)); if(k>=n-1) break;
        const a=br.p[k], b=br.p[k+1], dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1, ux=dx/l, uy=dy/l, side=j%2?1:-1, len=br.spike*dpr*(j%3===1?1:.7);
        cx.beginPath(); cx.moveTo(a[0]-ux*2*dpr,a[1]-uy*2*dpr); cx.lineTo(a[0]+ux*2*dpr,a[1]+uy*2*dpr); cx.lineTo(a[0]+ux*4*dpr-uy*side*len,a[1]+uy*4*dpr+ux*side*len); cx.closePath(); cx.fill(); } } },
};

/* v25 (item 15, build 46): ON A KEY'S SCREEN, ONLY THAT KEY'S BACKGROUND SHOWS. Build 43 drew the layer OVER the live background, so the
   Circuit's traces sat on top of the app's grid and two backgrounds moved against each other — "distracting", and the lines ran across the
   Thorn card. A key screen's own layer now REPLACES the base: the grid, the rain, the orbs, whichever was chosen, is simply not drawn while
   `over` is set. The stars stay under it — they are the ground every design sits on and are what keeps the screen from being black — which is
   also exactly what a key background chosen in Customise already is (stars + that layer), so the screen and the choice look the same. */
/* v29 Section A (57.11 a / b, build 57): TWO CHANGES AT THE TOP OF THE FRAME.
   a. STARS BELONG TO THE DEFAULT BACKGROUND ONLY. The three key layers were drawn OVER the starfield — "every other background is a whole scene,
      not a layer over the starfield" — so a layer is now the whole picture and `stars` is drawn only when `stars` is what was chosen. On a KEY
      SCREEN the same holds: the key's own layer replaces the base, as build 46 already had it, and nothing is drawn under it.
   b. THE PICKED COLOUR IS PAINTED HERE, on the background layer, beneath every screen — which is the whole of what 57.11b asks for. It used to be
      `--ground`, and every panel, border and target colour is mixed from that, so it coloured the text and the buttons too. It survives a change of
      pattern because the pattern and the colour are two settings now (config/theme.js ITEMS.bg / ITEMS.bgcol). */
function draw(t){ if(paused){ running=false; return; } cx.clearRect(0,0,W,H);
  const col=look('tint'); if(col){ cx.globalAlpha=1; cx.fillStyle=col; cx.fillRect(0,0,W,H); }
  const bg=look('bg'), own=LAYER[bg]?bg:null, ly=over||own;
  if(!ly) (DRAW[bg]||DRAW.stars)(t);
  if(ly){ if(!geo) geo=build(); LAYER[ly](t); }
  cx.globalAlpha=1; requestAnimationFrame(draw); }
function resume(){ if(running) return; running=true; requestAnimationFrame(draw); }
function startAtmosphere(){ addEventListener('resize',size); size(); running=true; draw(0); }
// C.6: the key screen's own layer, or null to give the chosen background back
function setKeyLayer(style){ over=LAYER[style]?style:null; }
on('screen:change',({id})=>{ const run=id==='game'; cv.style.opacity=run?0:1; paused=run; if(!run) resume(); });

export { DRAW, LAYER, setKeyLayer, startAtmosphere };
