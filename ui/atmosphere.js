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
function size(){ dpr=devicePixelRatio||1; W=cv.width=innerWidth*dpr; H=cv.height=innerHeight*dpr; geo=null;
  pts=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.4+.4)*dpr,s:(Math.random()*.15+.05)*dpr,a:Math.random()*.5+.15,ph:Math.random()*6.28,l:(30+Math.random()*60)*dpr,v:(.6+Math.random()*1.2)*dpr,R:(120+Math.random()*160)*dpr})); }
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const DRAW={
  stars(t){ for(const p of pts){ if(!reduce){ p.y-=p.s; if(p.y<-4) p.y=H+4; } cx.globalAlpha=p.a*(.6+.4*Math.sin(t/1400+p.ph)); cx.fillStyle='#E8E6E1'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.28); cx.fill(); } },
  // grid (v8): the spacing breathes — lines drift apart and back together around the centre, and being evenly spaced they can never cross
  grid(t){ const g=56*dpr*(1+(reduce?0:.22*Math.sin(t/2800))); const ox=(W/2)%g, oy=(H/2)%g; cx.globalAlpha=.07; cx.strokeStyle='#E8E6E1'; cx.lineWidth=dpr; cx.beginPath(); for(let x=ox-g;x<W+g;x+=g){ cx.moveTo(x,0); cx.lineTo(x,H); } for(let y=oy-g;y<H+g;y+=g){ cx.moveTo(0,y); cx.lineTo(W,y); } cx.stroke();
    cx.globalAlpha=.16; for(let i=0;i<12;i++){ const p=pts[i]; const gx=Math.round((p.x-ox)/g)*g+ox, gy=Math.round((p.y-oy)/g)*g+oy; cx.fillStyle='#E8E6E1'; cx.fillRect(gx-1.5*dpr,gy-1.5*dpr,3*dpr,3*dpr); } },
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
// the geometry the two drawn layers need, measured once per canvas size
function build(){ const out={ circuit:{ traces:[] }, thorn:{ branches:[] } };
  const C=KEY_LAYER.circuit, cell=C.cell*dpr; out.circuit.cell=cell;
  for(let i=0;i<C.traces;i++){ const cols=Math.max(2,Math.floor(W/cell)), rows=Math.max(2,Math.floor(H/cell));
    let x=Math.floor(rnd(i,1)*cols)*cell+cell/2, y=Math.floor(rnd(i,2)*rows)*cell+cell/2; const p=[[x,y]]; let horiz=rnd(i,3)<.5;
    for(let s=0;s<4;s++){ const n=(2+Math.floor(rnd(i,10+s)*5))*cell*(rnd(i,20+s)<.5?-1:1);
      if(horiz) x=Math.max(cell/2,Math.min(W-cell/2,x+n)); else y=Math.max(cell/2,Math.min(H-cell/2,y+n)); p.push([x,y]); horiz=!horiz; }
    out.circuit.traces.push({ p, len:lenOf(p), off:rnd(i,30) }); }
  const B=KEY_LAYER.thorn, m=Math.min(W,H);
  // from the two sides and the bottom only — a branch from the top edge crossed BACK and the title (seen in the build-43 probe)
  for(let i=0;i<B.branches;i++){ const side=[0,1,3][i%3], u=.15+.7*rnd(i,40);
    const a=side===0?[0,H*u]:side===1?[W,H*u]:side===2?[W*u,0]:[W*u,H], inward=side===0?[1,0]:side===1?[-1,0]:side===2?[0,1]:[0,-1];
    const reach=m*(.22+.16*rnd(i,41)), bow=(rnd(i,42)-.5)*reach*.9;
    const b=[a[0]+inward[0]*reach-inward[1]*bow*.4,a[1]+inward[1]*reach+inward[0]*bow*.4], c=[(a[0]+b[0])/2-inward[1]*bow,(a[1]+b[1])/2+inward[0]*bow];
    const p=[]; for(let k=0;k<=24;k++){ const t=k/24, v=1-t; p.push([v*v*a[0]+2*v*t*c[0]+t*t*b[0],v*v*a[1]+2*v*t*c[1]+t*t*b[1]]); }
    out.thorn.branches.push({ p, ph:rnd(i,43)*6.28 }); }
  return out; }
const LAYER={
  // Lantern: slow-drifting light, soft and warm, low contrast — glows sway over `drift` bars and sparks rise
  lantern(t){ const P=KEY_LAYER.lantern, bar=beatMs('lantern')*4, T=reduce?0:t, m=Math.min(W,H);
    for(let i=0;i<P.blobs;i++){ const ph=rnd(i,1)*6.28, sw=T/(bar*P.drift)*6.28;
      const x=W*(.12+.76*rnd(i,2))+Math.sin(sw+ph)*W*.14, y=H*(.1+.8*rnd(i,3))+Math.cos(sw*.8+ph)*H*.08, r=m*(.26+.18*rnd(i,4))*(1+.08*Math.sin(sw*1.3+ph));
      const a=P.alpha*(.65+.35*Math.sin(sw*.5+ph*2)), g=cx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(${P.col},${a.toFixed(3)})`); g.addColorStop(1,`rgba(${P.col},0)`); cx.globalAlpha=1; cx.fillStyle=g; cx.beginPath(); cx.arc(x,y,r,0,6.28); cx.fill(); }
    cx.fillStyle=`rgb(${P.col})`;
    for(let i=0;i<P.motes;i++){ const rise=(T/bar)*(.3+.5*rnd(i,5))*H*.08, y=H-((rise+rnd(i,6)*H)%H), x=W*rnd(i,7)+Math.sin(T/bar*1.5+i)*8*dpr;
      cx.globalAlpha=Math.min(1,P.alpha*3.2*(.35+.65*rnd(i,8))); cx.beginPath(); cx.arc(x,y,(.9+rnd(i,9)*1.2)*dpr,0,6.28); cx.fill(); } },
  // Circuit: sharper, cooler, geometric — right-angled traces with a pulse moving along each at `pulse` cells a beat, the corners blinking as it passes
  circuit(t){ const P=KEY_LAYER.circuit, G=geo.circuit, beat=beatMs('circuit'), T=reduce?0:t, tail=G.cell*1.6;
    cx.strokeStyle=`rgb(${P.col})`; cx.fillStyle=`rgb(${P.col})`; cx.lineWidth=dpr; cx.lineCap='square';
    for(const tr of G.traces){ cx.globalAlpha=P.alpha*.45; cx.beginPath(); tr.p.forEach((q,j)=>j?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke();
      const loop=tr.len+tail*2, head=((T/beat)*P.pulse*G.cell+tr.off*loop)%loop;
      cx.globalAlpha=P.head; cx.lineWidth=1.6*dpr; cx.beginPath();
      for(let s=0;s<=6;s++){ const d=Math.max(0,Math.min(tr.len,head-tail*s/6)); const q=pointAt(tr.p,d); s?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]); }
      cx.stroke(); cx.lineWidth=dpr;
      let d=0; for(let j=1;j<tr.p.length;j++){ d+=Math.hypot(tr.p[j][0]-tr.p[j-1][0],tr.p[j][1]-tr.p[j-1][1]); const near=Math.abs(head-d)<G.cell*.5;
        cx.globalAlpha=near?P.head:P.alpha; const s=(near?4:2.6)*dpr; cx.fillRect(tr.p[j-1][0]-s/2,tr.p[j-1][1]-s/2,s,s); } } },
  // Thorn: black at the edges, white spiked branches creeping in and back over `breathe` bars — high contrast, slow, menacing
  thorn(t){ const P=KEY_LAYER.thorn, G=geo.thorn, bar=beatMs('thorn')*4, T=reduce?0:t;
    for(const [x0,y0,x1,y1] of [[0,0,W*.2,0],[W,0,W*.8,0],[0,0,0,H*.14],[0,H,0,H*.86]]){ const g=cx.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,`rgba(0,0,0,${P.edge})`); g.addColorStop(1,'rgba(0,0,0,0)'); cx.globalAlpha=1; cx.fillStyle=g; cx.fillRect(0,0,W,H); }
    cx.strokeStyle=`rgb(${P.col})`; cx.fillStyle=`rgb(${P.col})`; cx.lineWidth=1.3*dpr; cx.lineCap='round';
    for(const br of G.branches){ const grow=.55+.45*(.5-.5*Math.cos(T/(bar*P.breathe)*6.28+br.ph)), n=Math.max(2,Math.round(br.p.length*grow));
      cx.globalAlpha=P.alpha*.8; cx.beginPath(); for(let k=0;k<n;k++) k?cx.lineTo(br.p[k][0],br.p[k][1]):cx.moveTo(br.p[k][0],br.p[k][1]); cx.stroke();
      cx.globalAlpha=P.alpha;
      for(let j=1;j<=P.thorns;j++){ const k=Math.round(j/(P.thorns+1)*(br.p.length-2)); if(k>=n-1) break;
        const a=br.p[k], b=br.p[k+1], dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1, ux=dx/l, uy=dy/l, side=j%2?1:-1, len=(j%3===1?9:6)*dpr*(.6+.4*grow);
        cx.beginPath(); cx.moveTo(a[0]-ux*2*dpr,a[1]-uy*2*dpr); cx.lineTo(a[0]+ux*2*dpr,a[1]+uy*2*dpr); cx.lineTo(a[0]+ux*4*dpr-uy*side*len,a[1]+uy*4*dpr+ux*side*len); cx.closePath(); cx.fill(); } } },
};

/* v25 (item 15, build 46): ON A KEY'S SCREEN, ONLY THAT KEY'S BACKGROUND SHOWS. Build 43 drew the layer OVER the live background, so the
   Circuit's traces sat on top of the app's grid and two backgrounds moved against each other — "distracting", and the lines ran across the
   Thorn card. A key screen's own layer now REPLACES the base: the grid, the rain, the orbs, whichever was chosen, is simply not drawn while
   `over` is set. The stars stay under it — they are the ground every design sits on and are what keeps the screen from being black — which is
   also exactly what a key background chosen in Customise already is (stars + that layer), so the screen and the choice look the same. */
function draw(t){ if(paused){ running=false; return; } cx.clearRect(0,0,W,H);
  const bg=look('bg'), own=LAYER[bg]?bg:null;
  (DRAW[over||own?'stars':bg]||DRAW.stars)(t);
  const ly=over||own; if(ly){ if(!geo) geo=build(); LAYER[ly](t); }
  cx.globalAlpha=1; requestAnimationFrame(draw); }
function resume(){ if(running) return; running=true; requestAnimationFrame(draw); }
function startAtmosphere(){ addEventListener('resize',size); size(); running=true; draw(0); }
// C.6: the key screen's own layer, or null to give the chosen background back
function setKeyLayer(style){ over=LAYER[style]?style:null; }
on('screen:change',({id})=>{ const run=id==='game'; cv.style.opacity=run?0:1; paused=run; if(!run) resume(); });

export { DRAW, LAYER, setKeyLayer, startAtmosphere };
