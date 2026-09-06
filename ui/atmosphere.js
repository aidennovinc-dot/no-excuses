/* No Excuses — menu atmosphere: four designs, all quiet. The canvas behind every screen; the run fades it out.
   Build 17 (refactor stage 3): out of app.js. boot.js calls startAtmosphere() once. */
import { $ } from "../core.js";
import { prefs } from "../core/store.js";

const cv=$('#stars'), cx=cv.getContext('2d'); let W,H,pts=[],dpr=1;
function size(){ dpr=devicePixelRatio||1; W=cv.width=innerWidth*dpr; H=cv.height=innerHeight*dpr;
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
function startAtmosphere(){ addEventListener('resize',size); size(); (function draw(t){ cx.clearRect(0,0,W,H); (DRAW[prefs.bg]||DRAW.stars)(t); requestAnimationFrame(draw); })(0); }

export { DRAW, startAtmosphere };
